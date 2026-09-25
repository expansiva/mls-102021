/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/gate.ts" enhancement="_blank"/>

import {
  definitionIssues,
  isRecord,
  pendingDefinition,
  type D1Definition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  futureOutputPath,
  pipelineId,
  qualifyDefPath,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { renderDefinition, stampDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { readContractAst, type D1ContractAst, type D1ContractField } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import { authorizedPayloadNames, mdmInputFields, preconditionsFor } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { enforcedRuleIds, originFile, rulePlanForUsecase } from '/_102021_/l2/agentDefsL1/steps/usecases50/rulePlan.js';
import { fieldUses, readUsecaseFidelity } from '/_102021_/l2/agentDefsL1/steps/usecases50/fidelity.js';
import { capabilityApplies, mdmForOperation, isForeignMdmPatchKey, isMdmFacadeCall } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';
import {
  D1_USECASE_VERSION,
  D1_WRITE_CALLS,
  ENUMERATION_REASON,
  ENUMERATION_SOURCE,
  type D1UsecaseBuild,
  type D1UsecaseEntity,
  type D1UsecaseEnumeration,
  type D1UsecaseField,
  type D1UsecaseItem,
  type D1MdmArgument,
  type D1MdmPlannedCall,
  type D1UsecaseMdm,
  type D1UsecaseNormalization,
  type D1UsecasePlanInput,
  type D1UsecasePort,
  type D1UsecaseProblem,
  type D1RulePlanRow,
  type D1UsecaseRequest,
  type D1UsecaseSelection,
  type D1WorkerStep,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

const READ_OPERATIONS = new Set(['list', 'get', 'read']);
const UPDATE_OPERATIONS = new Set(['update', 'patch']);
const CREATE_OPERATIONS = new Set(['create']);

interface ProjectionField {
  name: string;
  /** Absent when the routes that declare this name do not agree on one type. */
  type?: string;
  fieldRef?: string;
}

interface RouteOutput {
  route: string;
  contractPath: string;
  projection: 'declared' | 'unresolved';
  outputFields: string[];
  fields: ProjectionField[];
}

/**
 * One deterministic pass from the selection, the domain draft, the ports and
 * the contract AST. The model may order steps. It does not choose ids.
 */
export function buildD1Usecases(request: D1UsecaseRequest): D1UsecaseBuild {
  const problems: D1UsecaseProblem[] = [];
  const normalizations: D1UsecaseNormalization[] = [];
  noteUnparsedContracts(request, problems);
  const enumerations = unconsumedEnumerations(request);
  const seen = new Set<string>();
  const items: D1UsecaseItem[] = [];

  for (const usecase of request.usecases) {
    if (seen.has(usecase.usecaseId)) {
      error(problems, 'DUPLICATE_USECASE', usecase.usecaseId, `Usecase ${usecase.usecaseId} is selected more than once.`);
      continue;
    }
    seen.add(usecase.usecaseId);
    items.push(planUsecase(request, usecase, problems, normalizations));
  }

  const ok = !problems.some(problem => problem.severity === 'error');
  const emit = ok ? emitItems(request, items, problems) : [];
  const stillOk = ok && !problems.some(problem => problem.severity === 'error');
  return finish(request, stillOk, enumerations, items, problems, normalizations, stillOk ? emit : []);
}

function planUsecase(
  request: D1UsecaseRequest,
  usecase: D1UsecaseSelection,
  problems: D1UsecaseProblem[],
  normalizations: D1UsecaseNormalization[],
): D1UsecaseItem {
  const path = usecase.usecaseId;
  const entity = request.entities.find(item => item.entityId === usecase.entity);
  const plan = request.plans.find(item => item.usecaseId === usecase.usecaseId);
  const steps = plan?.steps || [];
  const blank: D1UsecaseItem = {
    usecaseId: usecase.usecaseId,
    entityId: usecase.entity,
    operation: usecase.operation,
    defPath: usecase.defPath,
    routes: [...usecase.routes],
    trustedContext: 'ctx',
    mdm: null,
    transactionBoundary: null,
    steps,
    definition: null,
  };
  if (plan?.operational) {
    error(problems, 'OPERATIONAL', path, plan.trace || `Usecase ${path} has no model reply.`);
  }
  if (!entity) {
    error(problems, 'ENTITY_MISSING', path, `Usecase ${path} names ${usecase.entity}, which is not in the domain draft.`);
    return blank;
  }
  if (!usecase.routes.length) {
    error(problems, 'ROUTE_MISSING', path, `Usecase ${path} has no route.`);
    return blank;
  }

  const routes = resolveRoutes(request, usecase, problems);
  const outputs = routeOutputs(request, usecase, entity, routes, problems);
  noteSameRouteConflicts(outputs, path, problems);
  const input = sharedInput(request, usecase, entity, routes, problems);
  noteDerived(request, entity, usecase, input, steps, path, problems, normalizations);
  noteRequiredNotes(entity, usecase, input, path, problems);
  const transitionOk = noteTransition(request, entity, usecase, steps, input, path, problems);
  const decided = decideRules(request, entity, usecase, steps, path, problems, normalizations);
  const rules = decided.rules;
  const sequenceSteps = decided.steps;
  const effects = resolveEffects(request, entity, usecase, steps, path, problems);
  const port = request.ports.find(item => item.entityId === entity.entityId) || null;
  const portCalls = resolvePorts(entity, usecase, port, steps, path, problems);
  const mdm = resolveMdm(request, entity, usecase, routes, steps, path, problems);
  noteAdapter(steps, path, problems);
  noteContext(steps, path, problems);
  const boundary = resolveBoundary(portCalls, mdm, steps, path, problems);
  if (!transitionOk || problems.some(problem => problem.severity === 'error' && problem.path === path)) {
    return { ...blank, mdm, transactionBoundary: boundary, steps };
  }

  const contractRefs = outputs
    .filter(item => item.projection === 'declared')
    .map(item => {
      const binding = bindingFor(request, routes.find(route => route.route === item.route));
      return { route: item.route, symbol: binding?.output || '' };
    })
    .filter(item => item.symbol);

  const outputUnion = unionOutputs(outputs);
  const sourcePayload = usecase.operation === 'transition'
    ? [...(entity.transitions.find(item => item.transitionId === usecase.usecaseId)?.payload || [])]
    : [];
  const ontologyPath = `l4/${request.moduleName}/ontology/${entity.entityId}.defs.ts`;
  const integrationPath = `l4/${request.moduleName}/integration.defs.ts`;
  const lifecycle = usecase.operation === 'transition'
    ? {
      transitionId: usecase.usecaseId,
      payload: sourcePayload,
      sourcePath: ontologyPath,
      symbol: usecase.usecaseId,
    }
    : undefined;
  const data = {
    usecaseId: usecase.usecaseId,
    entityId: entity.entityId,
    operation: usecase.operation,
    ports: port && entity.storageTarget === 'moduleDatabase' ? [port.portId] : [],
    rulesApplied: rules,
    functions: [{
      functionName: usecase.usecaseId,
      input,
      output: outputUnion,
      contractRefs,
    }],
    routeProjections: outputs.map(item => ({
      route: item.route,
      contractPath: item.contractPath,
      projection: item.projection,
      outputFields: item.projection === 'declared' ? item.outputFields : [],
    })),
    portCalls,
    transactional: boundary === 'local',
    effects: effects.map(eventId => ({ eventId, path: integrationPath, symbol: eventId })),
    sequence: sequenceSteps.map(step => step.kind === 'transition'
      ? { kind: 'transition' as const, transitionId: step.transitionId, payload: [...sourcePayload] }
      : step),
    uses: fieldUses({
      operation: usecase.operation,
      fields: entity.fields,
      inputPaths: [...contractInputPaths(request, usecase, input)],
      payloadPaths: sourcePayload,
    }),
    rules: rules.map(ruleId => ({
      ruleId,
      path: ruleSourcePath(request, entity, usecase.usecaseId, ruleId),
      symbol: ruleId,
    })),
    rulePlan: decided.plan,
    transaction: { boundary: boundary === 'local' ? 'local' as const : 'none' as const },
    ...(lifecycle ? { lifecycle } : {}),
    ...(mdm ? { mdm: storedMdm(mdm) } : {}),
  };
  const definition = pendingDefinition('usecase', usecase.usecaseId, request.moduleName, data);
  const issues = definitionIssues(definition);
  if (issues.length) {
    error(problems, 'DEFINITION', path, issues[0]);
    return { ...blank, mdm, transactionBoundary: boundary, steps };
  }
  return { ...blank, mdm, transactionBoundary: boundary, steps, definition };
}

function noteUnparsedContracts(request: D1UsecaseRequest, problems: D1UsecaseProblem[]): void {
  const seen = new Set<string>();
  for (const contract of request.contracts) {
    const key = contract.path || contract.pageId;
    if (!contract.source || seen.has(key)) continue;
    seen.add(key);
    const fileName = contract.path || `${contract.pageId}.defs.ts`;
    const ast = readContractAst(contract.source, fileName);
    for (const detail of ast.unparsed) error(problems, 'CONTRACT_UNPARSED', fileName, detail);
  }
}

function resolveRoutes(
  request: D1UsecaseRequest,
  usecase: D1UsecaseSelection,
  problems: D1UsecaseProblem[],
): D1UsecaseRequest['routes'] {
  const out: D1UsecaseRequest['routes'] = [];
  for (const routeId of usecase.routes) {
    const found = request.routes.filter(item => item.route === routeId);
    if (found.length !== 1) {
      error(problems, 'ROUTE_MISSING', usecase.usecaseId, `Route ${routeId} is not an exact selected route.`);
      continue;
    }
    if (found[0].usecaseRef !== usecase.usecaseId) {
      error(problems, 'ROUTE_MISMATCH', usecase.usecaseId, `Route ${routeId} belongs to ${found[0].usecaseRef}, not ${usecase.usecaseId}.`);
      continue;
    }
    out.push(found[0]);
  }
  return out;
}

function routeOutputs(
  request: D1UsecaseRequest,
  usecase: D1UsecaseSelection,
  entity: D1UsecaseEntity,
  routes: D1UsecaseRequest['routes'],
  problems: D1UsecaseProblem[],
): RouteOutput[] {
  return routes.map(route => {
    const contractPath = contractPathFor(request.moduleName, route.page);
    const binding = bindingFor(request, route);
    const fields = binding ? projectFields(request, route.page, binding.output, entity) : null;
    if (!fields) {
      const symbol = binding?.output || route.route;
      review(
        problems,
        'PROJECTION_UNRESOLVED',
        route.route,
        binding
          ? `Route ${route.route} output symbol ${symbol} has no declared form.`
          : `Route ${route.route} has no contract binding for ${symbol}.`,
      );
      return { route: route.route, contractPath, projection: 'unresolved' as const, outputFields: [], fields: [] };
    }
    return {
      route: route.route,
      contractPath,
      projection: 'declared' as const,
      outputFields: fields.map(field => field.name),
      fields,
    };
  });
}

/** Two types for one name inside a single route. A difference across routes is not a conflict. */
function conflictingFields(fields: ProjectionField[]): string[] {
  const types = new Map<string, string | undefined>();
  const conflicts: string[] = [];
  for (const field of fields) {
    const prior = types.get(field.name);
    if (prior === undefined) {
      types.set(field.name, field.type);
      continue;
    }
    if (prior !== field.type && !conflicts.includes(field.name)) conflicts.push(field.name);
  }
  return conflicts;
}

function noteSameRouteConflicts(
  outputs: RouteOutput[],
  usecaseId: string,
  problems: D1UsecaseProblem[],
): void {
  for (const item of outputs) {
    if (item.projection !== 'declared') continue;
    for (const name of conflictingFields(item.fields)) {
      error(problems, 'TYPE_CONFLICT', usecaseId, `Field ${name} has two contract types. No cast was applied.`);
    }
  }
}

function sharedInput(
  request: D1UsecaseRequest,
  usecase: D1UsecaseSelection,
  entity: D1UsecaseEntity,
  routes: D1UsecaseRequest['routes'],
  problems: D1UsecaseProblem[],
): ProjectionField[] {
  const declared: ProjectionField[][] = [];
  for (const route of routes) {
    const binding = bindingFor(request, route);
    if (!binding?.input) continue;
    const fields = projectFields(request, route.page, binding.input, entity);
    if (fields) declared.push(fields);
  }
  let conflicted = false;
  for (const list of declared) {
    for (const name of conflictingFields(list)) {
      error(problems, 'TYPE_CONFLICT', usecase.usecaseId, `Input ${name} has two contract types. No cast was applied.`);
      conflicted = true;
    }
  }
  if (conflicted || !declared.length) return [];
  const [first, ...rest] = declared;
  const shared: ProjectionField[] = [];
  for (const field of first) {
    const peers = rest.map(list => list.find(item => item.name === field.name));
    if (rest.length && peers.some(item => !item)) {
      review(problems, 'INPUT_NOT_SHARED', usecase.usecaseId, `Input ${field.name} is not on every resolved contract. It was not copied.`);
      continue;
    }
    if (peers.some(item => item && item.type !== field.type)) {
      const bare: ProjectionField = { name: field.name };
      if (field.fieldRef && peers.every(item => item?.fieldRef === field.fieldRef)) bare.fieldRef = field.fieldRef;
      shared.push(bare);
      continue;
    }
    shared.push(field);
  }
  return shared;
}

function projectFields(
  request: D1UsecaseRequest,
  pageId: string,
  symbol: string,
  entity: D1UsecaseEntity,
): ProjectionField[] | null {
  const contract = request.contracts.find(item => item.pageId === pageId);
  if (!contract?.source) return null;
  const ast = readContractAst(contract.source, contract.path || `${pageId}.defs.ts`);
  const binding = ast.bindings.find(item => item.input === symbol || item.output === symbol);
  if (!binding) return null;
  const fields = declaredFields(ast, symbol);
  if (!fields) return null;
  return fields.map(field => toProjection(field, entity));
}

function declaredFields(ast: D1ContractAst, symbol: string): D1ContractField[] | null {
  const found = ast.symbols.filter(item => item.name === symbol);
  if (found.length !== 1) return null;
  const item = found[0];
  if (item.shape === 'array' && item.fields.length === 0 && item.element) {
    const inner = ast.symbols.filter(entry => entry.name === item.element);
    if (inner.length !== 1) return null;
    return inner[0].fields;
  }
  if (item.shape === 'array' && item.fields.length === 0) return null;
  return item.fields;
}

function bindingFor(request: D1UsecaseRequest, route: D1UsecaseRequest['routes'][number] | undefined) {
  if (!route) return null;
  const contract = request.contracts.find(item => item.pageId === route.page);
  if (!contract?.source) return null;
  const ast = readContractAst(contract.source, contract.path || `${route.page}.defs.ts`);
  const found = ast.bindings.filter(item => item.route === route.route);
  if (found.length !== 1) return null;
  return found[0];
}

function toProjection(field: D1ContractField, entity: D1UsecaseEntity): ProjectionField {
  const domain = bindDomainField(entity, field.name);
  const projected: ProjectionField = { name: field.name, type: field.type };
  if (domain && domain !== 'ambiguous') projected.fieldRef = `${entity.entityId}.${domain.name}`;
  return projected;
}

function unionOutputs(outputs: RouteOutput[]): ProjectionField[] {
  const union: ProjectionField[] = [];
  for (const route of outputs) {
    for (const field of route.fields) {
      const existing = union.find(item => item.name === field.name);
      if (!existing) {
        const copy: ProjectionField = { name: field.name, type: field.type };
        if (field.fieldRef) copy.fieldRef = field.fieldRef;
        union.push(copy);
        continue;
      }
      if (existing.type !== field.type) delete existing.type;
      if (existing.fieldRef && existing.fieldRef !== field.fieldRef) delete existing.fieldRef;
    }
  }
  return union;
}

/**
 * Identity may filter a read or select an update/transition. It is not assigned.
 * A nested derived field on a read is a filter, matched by its full path.
 * `details.id` is not identity, and a nested `version` is not concurrency.
 * Other derived fields stay writes, except declared concurrency (`version`).
 * The d1_13g rule that treated every derived input as DERIVED_EDITABLE is replaced.
 */
function noteDerived(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  input: ProjectionField[],
  steps: readonly D1WorkerStep[],
  path: string,
  problems: D1UsecaseProblem[],
  normalizations: D1UsecaseNormalization[],
): void {
  const inputPaths = contractInputPaths(request, usecase, input);
  const payloadPaths = new Set<string>();
  for (const step of steps) {
    if (step.kind === 'transition') step.payload.forEach(name => payloadPaths.add(name));
  }
  const seen = new Set<string>();
  for (const contractPath of inputPaths) {
    classifyDerivedUse(entity, usecase, input, contractPath, 'input', path, problems, normalizations, seen);
  }
  for (const contractPath of payloadPaths) {
    classifyDerivedUse(entity, usecase, input, contractPath, 'payload', path, problems, normalizations, seen);
  }
}

function contractInputPaths(
  request: D1UsecaseRequest,
  usecase: D1UsecaseSelection,
  input: readonly ProjectionField[],
): Set<string> {
  const paths = new Set<string>();
  for (const field of input) paths.add(field.name);
  const context = request.contexts?.find(item => item.usecaseId === usecase.usecaseId);
  for (const route of context?.routes || []) {
    for (const field of route.inputFields) paths.add(field.path);
  }
  return paths;
}

function classifyDerivedUse(
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  input: readonly ProjectionField[],
  contractPath: string,
  source: 'input' | 'payload',
  path: string,
  problems: D1UsecaseProblem[],
  normalizations: D1UsecaseNormalization[],
  seen: Set<string>,
): void {
  const bound = bindDomainField(entity, contractPath, input.find(item => item.name === contractPath));
  if (bound === 'ambiguous') {
    const key = `${contractPath}\u0000ambiguous\u0000${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    error(
      problems,
      'DERIVED_AMBIGUOUS',
      path,
      `Derived field ${contractPath} is ambiguous on ${path}: it does not bind to one field of ${entity.entityId}.`,
    );
    return;
  }
  if (!bound?.derived) return;
  const role = derivedRole(usecase.operation, bound, source);
  const key = `${bound.name}\u0000${role}\u0000${source}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (role === 'ambiguous') {
    error(
      problems,
      'DERIVED_AMBIGUOUS',
      path,
      `Derived field ${entity.entityId}.${bound.name} is ambiguous on ${path}: operation ${usecase.operation} does not classify it.`,
    );
    return;
  }
  if (role === 'write') {
    error(problems, 'DERIVED_EDITABLE', path, `Derived field ${bound.name} is assigned by ${path}.`);
    return;
  }
  const code = role === 'filter' ? 'DERIVED_FILTER' : role === 'selector' ? 'DERIVED_SELECTOR' : 'DERIVED_CONCURRENCY';
  normalizations.push({
    code,
    path: `${path}.${bound.name}`,
    detail: `${entity.entityId}.${bound.name} is a ${role} of ${path}.`,
  });
}

function bindDomainField(
  entity: D1UsecaseEntity,
  contractPath: string,
  projected?: ProjectionField,
): D1UsecaseField | 'ambiguous' | undefined {
  const exact = entity.fields.filter(item => item.name === contractPath);
  if (exact.length > 1) return 'ambiguous';
  if (exact.length === 1) return exact[0];
  const fieldRef = projected?.fieldRef;
  const prefix = `${entity.entityId}.`;
  if (fieldRef && fieldRef.startsWith(prefix)) {
    const name = fieldRef.slice(prefix.length);
    const found = entity.fields.filter(item => item.name === name);
    if (found.length > 1) return 'ambiguous';
    if (found.length === 1) return found[0];
  }
  return undefined;
}

function derivedRole(
  operation: string,
  field: D1UsecaseField,
  source: 'input' | 'payload',
): 'filter' | 'selector' | 'concurrency' | 'write' | 'ambiguous' {
  if (source === 'payload') return 'write';
  const identity = field.name === 'id';
  const concurrency = field.name === 'version';
  if (identity) {
    if (READ_OPERATIONS.has(operation)) return 'filter';
    if (UPDATE_OPERATIONS.has(operation) || operation === 'transition') return 'selector';
    if (CREATE_OPERATIONS.has(operation)) return 'write';
    return 'ambiguous';
  }
  if (concurrency) {
    if (UPDATE_OPERATIONS.has(operation) || operation === 'transition') return 'concurrency';
    return 'write';
  }
  if (READ_OPERATIONS.has(operation) && nestedReadFilter(field.name)) return 'filter';
  return 'write';
}

/** A dotted path on a read. The leaf `id` is a homonym, not the identity field. */
function nestedReadFilter(name: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return false;
  const leaf = name.slice(dot + 1);
  return leaf !== 'id' && leaf !== 'version';
}

function noteRequiredNotes(
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  input: ProjectionField[],
  path: string,
  problems: D1UsecaseProblem[],
): void {
  if (usecase.operation !== 'transition') return;
  const transition = entity.transitions.find(item => item.transitionId === usecase.usecaseId);
  for (const ruleId of transition?.ruleRefs || []) {
    const leaf = requiredLeaf(ruleId);
    if (!leaf) continue;
    const field = entity.fields.find(item => item.name === leaf || item.name.endsWith(`.${leaf}`));
    if (!field) continue;
    const supplied = input.some(item => item.name === leaf || item.fieldRef === `${entity.entityId}.${field.name}`);
    if (!supplied) {
      review(problems, 'NOTE_WITHOUT_INPUT', path, `Rule ${ruleId} requires ${field.name}, and no contract input supplies it.`);
    }
  }
}

function noteTransition(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  steps: readonly D1WorkerStep[],
  input: ProjectionField[],
  path: string,
  problems: D1UsecaseProblem[],
): boolean {
  const allowed = authorizedPayloadNames(request, usecase.usecaseId, input.map(field => field.name));
  let ok = true;
  for (const step of steps) {
    if (step.kind !== 'transition') continue;
    if (usecase.operation !== 'transition' || step.transitionId !== usecase.usecaseId) {
      error(problems, 'INVALID_TRANSITION', path, `Transition ${step.transitionId} is not the operation ${usecase.usecaseId}.`);
      ok = false;
    }
    for (const name of step.payload) {
      if (!allowed.has(name)) {
        error(problems, 'PAYLOAD_UNAUTHORIZED', path, `Payload ${name} is not an input of the contract.`);
        ok = false;
      }
    }
  }
  if (usecase.operation === 'transition' && !entity.transitions.some(item => item.transitionId === usecase.usecaseId)) {
    error(problems, 'INVALID_TRANSITION', path, `Transition ${usecase.usecaseId} is not on ${entity.entityId}.`);
    ok = false;
  }
  return ok;
}

function decideRules(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  steps: readonly D1WorkerStep[],
  path: string,
  problems: D1UsecaseProblem[],
  normalizations: D1UsecaseNormalization[],
): { rules: string[]; plan: D1RulePlanRow[]; steps: D1WorkerStep[] } {
  const known = new Set([
    ...request.moduleRules,
    ...entity.rules.map(rule => rule.ruleId),
    ...entity.transitions.flatMap(item => item.ruleRefs),
  ]);
  const context = request.contexts?.find(item => item.usecaseId === usecase.usecaseId);
  const plan = rulePlanForUsecase({
    moduleName: request.moduleName,
    entityId: entity.entityId,
    usecaseId: usecase.usecaseId,
    operation: usecase.operation,
    files: request.files,
    entity: {
      rules: entity.rules,
      transitions: entity.transitions.map(item => ({
        transitionId: item.transitionId,
        by: item.by,
        ruleRefs: item.ruleRefs,
        payload: item.payload || [],
      })),
      uniqueKeys: entity.uniqueKeys,
      capabilities: entity.capabilities,
      namespace: entity.namespace,
      storageTarget: entity.storageTarget,
      platformFields: entity.platformFields,
    },
    routes: usecase.routes.map(routeId => {
      const route = context?.routes.find(item => item.route === routeId);
      const selected = request.routes.find(item => item.route === routeId);
      const page = route?.page || selected?.page || '';
      return {
        route: routeId,
        contractPath: route?.contractPath || contractPathFor(request.moduleName, page),
        grants: (route?.access || []).map(grant => ({
          grantId: grant.grantId,
          actorRef: grant.actorRef,
          scope: grant.scope,
        })),
      };
    }),
  });
  for (const row of plan) known.add(row.ruleId);
  const prescribed = enforcedRuleIds(plan);
  const cited = new Set<string>();
  for (const step of steps) {
    if (step.kind !== 'rule' || !step.ruleId || cited.has(step.ruleId)) continue;
    cited.add(step.ruleId);
    if (!known.has(step.ruleId)) {
      error(problems, 'RULE_UNRESOLVED', path, `Rule ${step.ruleId} is not in the module or the platform catalog.`);
      continue;
    }
    if (!prescribed.includes(step.ruleId)) {
      const pending = plan.find(row => row.ruleId === step.ruleId && row.enforcement === 'pending');
      const why = pending
        ? `Rule ${step.ruleId} is ${pending.gap} on ${pending.consumer}. Naming it does not enforce it.`
        : `Rule ${step.ruleId} is not enforced on ${usecase.usecaseId}.`;
      error(problems, 'RULE_NOT_APPLICABLE', path, why);
    }
  }
  for (const ruleId of prescribed) {
    if (cited.has(ruleId)) continue;
    normalizations.push({ code: 'RULE_RESTORED', path, detail: ruleId });
  }
  return { rules: prescribed, plan, steps: alignRuleSteps(steps, prescribed) };
}

function alignRuleSteps(steps: readonly D1WorkerStep[], prescribed: readonly string[]): D1WorkerStep[] {
  const kept = steps.filter(step => step.kind !== 'rule');
  const ruleSteps: D1WorkerStep[] = prescribed.map(ruleId => ({ kind: 'rule', ruleId }));
  const transitionAt = kept.findIndex(step => step.kind === 'transition');
  if (transitionAt >= 0) return [...kept.slice(0, transitionAt), ...ruleSteps, ...kept.slice(transitionAt)];
  const portAt = kept.findIndex(step => step.kind === 'port' || step.kind === 'mdm');
  if (portAt >= 0) return [...kept.slice(0, portAt + 1), ...ruleSteps, ...kept.slice(portAt + 1)];
  return [...kept, ...ruleSteps];
}

function resolveEffects(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  steps: readonly D1WorkerStep[],
  path: string,
  problems: D1UsecaseProblem[],
): string[] {
  const on = `${entity.entityId}.${usecase.usecaseId}`;
  const mechanical = request.outbound.filter(event => event.on === on).map(event => event.eventId);
  const planned = new Set(steps.filter(step => step.kind === 'effect').map(step => step.eventId));
  for (const eventId of mechanical) {
    if (!planned.has(eventId)) {
      review(problems, 'EFFECT_OMITTED', path, `Declared effect ${eventId} was omitted. It stays on the usecase.`);
    }
  }
  for (const eventId of planned) {
    if (!mechanical.includes(eventId)) {
      error(problems, 'INVENTED_OPERATION', path, `Effect ${eventId} is not a declared outbound event.`);
    }
  }
  return mechanical;
}

function resolvePorts(
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  port: D1UsecasePort | null,
  steps: readonly D1WorkerStep[],
  path: string,
  problems: D1UsecaseProblem[],
): string[] {
  if (entity.storageTarget === 'mdm') {
    if (steps.some(step => step.kind === 'port')) {
      error(problems, 'MDM_LOCAL_PORT', path, `Usecase ${path} calls a repository for MDM role ${entity.entityId}.`);
    }
    return [];
  }
  if (entity.storageTarget !== 'moduleDatabase') {
    error(problems, 'UNSUPPORTED_STORAGE', path, `Usecase ${path} has storage ${entity.storageTarget}. No local port was invented.`);
    return [];
  }
  const calls: string[] = [];
  if (port && port.methods.includes(usecase.operation)) calls.push(usecase.operation);
  else error(problems, 'PORT_CALL_MISSING', path, `Port for ${entity.entityId} has no ${usecase.operation} method.`);
  for (const step of steps) {
    if (step.kind !== 'port') continue;
    if (!port || step.port !== port.portId) {
      error(problems, 'ADAPTER_IMPORT', path, `Port call ${step.port} is not the repository port of ${entity.entityId}.`);
      continue;
    }
    if (!port.methods.includes(step.call)) {
      error(problems, 'INVENTED_OPERATION', path, `Port method ${step.call} is not on ${port.portId}.`);
      continue;
    }
    if (!calls.includes(step.call)) calls.push(step.call);
  }
  return calls;
}

function resolveMdm(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  routes: D1UsecaseRequest['routes'],
  steps: readonly D1WorkerStep[],
  path: string,
  problems: D1UsecaseProblem[],
): D1UsecaseMdm | null {
  if (entity.storageTarget !== 'mdm') {
    if (steps.some(step => step.kind === 'mdm')) {
      error(problems, 'MDM_NAMESPACE', path, `Usecase ${path} names MDM for ${entity.entityId}, which is not an MDM role.`);
    }
    return null;
  }
  if (!entity.namespace) {
    error(problems, 'MDM_NAMESPACE', path, `MDM role ${entity.entityId} names no namespace.`);
    return null;
  }
  const selected = (entity.capabilities || []).filter(name => capabilityApplies(name, usecase.operation));
  const read = mdmInputFields(
    request.contracts,
    routes,
    preconditionsFor(request.files, request.moduleName, entity.entityId, entity.fields),
  );
  const bound = mdmForOperation({
    entityId: entity.entityId,
    namespace: entity.namespace,
    capabilities: entity.capabilities || [],
    selected,
    platformFields: entity.platformFields || [],
    inputFields: read.fields,
    contractUnread: read.unread.join('; '),
    operation: usecase.operation,
  });
  if (!selected.length) {
    error(problems, 'MDM_CAPABILITY_MISSING', path, `MDM role ${entity.entityId} has no capability for operation ${usecase.operation}. No call was invented.`);
  }
  for (const gap of bound.gaps) {
    error(problems, gap.code, path, gap.evidence);
  }
  for (const call of bound.calls) {
    for (const arg of call.arguments) {
      if (arg.role !== 'patch' || arg.value) continue;
      if (isForeignMdmPatchKey(entity.namespace, arg.name)) {
        error(problems, 'MDM_NAMESPACE', path, `Patch key ${arg.name} is not the namespace ${entity.namespace}.`);
      }
    }
  }
  const required = new Set<string>();
  for (const call of bound.calls) {
    if (call.alternative) continue;
    for (const capability of call.capabilities) required.add(`${capability}\u0000${call.method}`);
  }
  const present = new Set<string>();
  for (const step of steps) {
    if (step.kind !== 'mdm') continue;
    if (step.namespace !== entity.namespace) {
      error(problems, 'MDM_NAMESPACE', path, `Namespace ${step.namespace || '(empty)'} is not ${entity.namespace}.`);
    }
    if (step.entity !== entity.entityId) {
      error(problems, 'INVENTED_OPERATION', path, `MDM entity ${step.entity} is not ${entity.entityId}.`);
    }
    if (!isMdmFacadeCall(step.call)) {
      error(problems, 'MDM_CALL_ABSENT', path, `MDM call ${step.call || '(empty)'} is not a method of the MDM facade.`);
      continue;
    }
    const key = `${step.capability}\u0000${step.call}`;
    if (!required.has(key) && !bound.calls.some(call => call.alternative && call.method === step.call && call.capabilities.includes(step.capability))) {
      error(problems, 'MDM_CALL_INCOMPATIBLE', path, `MDM call ${step.call} for ${step.capability || '(none)'} does not execute ${usecase.operation} of ${entity.entityId}.`);
      continue;
    }
    present.add(key);
  }
  for (const key of required) {
    if (present.has(key)) continue;
    const split = key.indexOf('\u0000');
    const capability = key.slice(0, split);
    const method = key.slice(split + 1);
    const call = bound.calls.find(item => item.method === method && item.capabilities.includes(capability));
    const code = call?.shape === 'write' ? 'MDM_WRITE_MISSING' : 'MDM_CALL_MISSING';
    const kind = call?.shape === 'write' ? 'write' : 'read';
    error(problems, code, path, `Capability ${capability} requires ${method}. The plan does not name that ${kind}.`);
  }
  const choices = new Map<string, D1MdmPlannedCall[]>();
  for (const call of bound.calls) {
    if (!call.alternative) continue;
    for (const capability of call.capabilities) {
      const group = choices.get(capability) || [];
      group.push(call);
      choices.set(capability, group);
    }
  }
  for (const [capability, group] of choices) {
    const named = group.some(call => present.has(`${capability}\u0000${call.method}`));
    if (!named) {
      error(problems, 'MDM_WRITE_MISSING', path, `Capability ${capability} requires one of ${group.map(call => call.method).join(' or ')}. The plan names neither.`);
    }
  }
  return bound;
}

function noteAdapter(steps: readonly D1WorkerStep[], path: string, problems: D1UsecaseProblem[]): void {
  for (const step of steps) {
    const values = Object.values(step).filter((value): value is string => typeof value === 'string');
    if (values.some(value => value.includes('/adapters/') || value.includes('RepositoryAdapter'))) {
      error(problems, 'ADAPTER_IMPORT', path, `Usecase ${path} names an adapter. Application does not import one.`);
    }
  }
}

function noteContext(steps: readonly D1WorkerStep[], path: string, problems: D1UsecaseProblem[]): void {
  for (const step of steps) {
    if (step.kind === 'context' && step.source !== 'ctx') {
      error(problems, 'ACTOR_FROM_INPUT', path, `Usecase ${path} takes authority from ${step.source || 'input'}. Authority is ctx.`);
    }
  }
}

function resolveBoundary(
  portCalls: readonly string[],
  mdm: D1UsecaseMdm | null,
  steps: readonly D1WorkerStep[],
  path: string,
  problems: D1UsecaseProblem[],
): 'local' | null {
  const writes = portCalls.filter(call => (D1_WRITE_CALLS as readonly string[]).includes(call)).length;
  const local = steps.filter(step => step.kind === 'transaction' && step.boundary === 'local').length;
  const external = steps.filter(step => step.kind === 'transaction' && step.boundary === 'external').length;
  const other = steps.filter(step => step.kind === 'transaction' && step.boundary !== 'local' && step.boundary !== 'external').length;
  if (mdm && (local || external || other)) {
    const message = mdm.atomic
      ? `Usecase ${path} claims a transaction around ${mdm.calls[0]?.method || 'an MDM call'}. That facade method is the boundary.`
      : `Usecase ${path} claims one transaction over ${mdm.calls.length} MDM calls. The facade does not wrap them.`;
    error(problems, 'MDM_NOT_ATOMIC', path, message);
    if (external || other) {
      error(problems, 'EXTERNAL_ATOMICITY', path, `Usecase ${path} promises atomicity the runtime does not grant an external effect.`);
    }
    return null;
  }
  if (external || other) {
    error(problems, 'EXTERNAL_ATOMICITY', path, `Usecase ${path} promises atomicity the runtime does not grant an external effect.`);
  }
  if (writes >= 2 && local !== 1) {
    error(problems, 'TRANSACTION_BOUNDARY', path, `Usecase ${path} has ${writes} writes and ${local} local transaction boundaries.`);
    return null;
  }
  if (local > 1) {
    error(problems, 'TRANSACTION_BOUNDARY', path, `Usecase ${path} has ${local} local transaction boundaries.`);
    return null;
  }
  return local === 1 ? 'local' : null;
}

function requiredLeaf(ruleId: string): string {
  if (!ruleId.endsWith('Required')) return '';
  return ruleId.slice(0, -'Required'.length);
}

function contractPathFor(moduleName: string, pageId: string): string {
  return `l2/${moduleName}/web/contracts/${pageId}.defs.ts`;
}

function ruleSourcePath(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecaseId: string,
  ruleId: string,
): string {
  const placed = entity.rules.find(rule => rule.ruleId === ruleId);
  if (placed?.source) return placed.source;
  const cited = request.contexts?.find(item => item.usecaseId === usecaseId)?.rules.find(rule => rule.ruleId === ruleId);
  if (cited?.source) return cited.source;
  return `l4/${request.moduleName}/rules.defs.ts`;
}

function storedMdm(mdm: D1UsecaseMdm): {
  namespace: string;
  role: string;
  atomic: boolean;
  calls: D1MdmPlannedCall[];
} {
  return {
    namespace: mdm.namespace,
    role: mdm.role,
    atomic: mdm.atomic,
    calls: mdm.calls.map(call => {
      const stored: D1MdmPlannedCall = {
        id: call.id,
        method: call.method,
        target: call.target,
        shape: call.shape,
        capabilities: [...call.capabilities],
        alternative: call.alternative,
        when: call.when.map(clause => ({
          kind: clause.kind,
          path: clause.path,
          ...(clause.call ? { call: clause.call } : {}),
          present: clause.present,
        })),
        arguments: call.arguments.map(arg => storedArgument(arg)),
        result: [...call.result],
      };
      return stored;
    }),
  };
}

function storedArgument(arg: D1MdmArgument): D1MdmArgument {
  const origin: D1MdmArgument['origin'] = { kind: arg.origin.kind };
  if (arg.origin.path) origin.path = arg.origin.path;
  if (arg.origin.calls?.length) origin.calls = [...arg.origin.calls];
  if (arg.origin.evidence) origin.evidence = arg.origin.evidence;
  const stored: D1MdmArgument = { name: arg.name, role: arg.role, origin };
  if (arg.capability) stored.capability = arg.capability;
  if (arg.path) stored.path = arg.path;
  if (arg.value) stored.value = arg.value;
  return stored;
}

function dependencyPaths(moduleName: string, item: D1UsecaseItem): string[] {
  const data = item.definition && isRecord(item.definition.data) ? item.definition.data : {};
  const paths = new Set<string>();
  paths.add(`l4/${moduleName}/ontology/${item.entityId}.defs.ts`);
  if (Array.isArray(data.routeProjections)) {
    for (const projection of data.routeProjections) {
      if (isRecord(projection) && typeof projection.contractPath === 'string' && projection.contractPath) {
        paths.add(projection.contractPath);
      }
    }
  }
  if (Array.isArray(data.rules)) {
    for (const rule of data.rules) {
      if (isRecord(rule) && typeof rule.path === 'string' && rule.path) paths.add(rule.path);
    }
  }
  if (Array.isArray(data.rulePlan)) {
    for (const row of data.rulePlan) {
      if (!isRecord(row) || typeof row.origin !== 'string') continue;
      const file = originFile(row.origin);
      if (file) paths.add(file);
    }
  }
  if (Array.isArray(data.effects)) {
    for (const effect of data.effects) {
      if (isRecord(effect) && typeof effect.path === 'string' && effect.path) paths.add(effect.path);
    }
  }
  if (isRecord(data.lifecycle) && typeof data.lifecycle.sourcePath === 'string' && data.lifecycle.sourcePath) {
    paths.add(data.lifecycle.sourcePath);
  }
  return [...paths].sort();
}

function unconsumedEnumerations(request: D1UsecaseRequest): D1UsecaseEnumeration[] {
  const out: D1UsecaseEnumeration[] = [];
  for (const entity of request.entities) {
    for (const item of entity.enumerations) {
      out.push({
        entityId: entity.entityId,
        path: item.path,
        values: [...item.values],
        consumed: false,
        source: ENUMERATION_SOURCE,
        reason: ENUMERATION_REASON,
      });
    }
  }
  return out;
}

function emitItems(request: D1UsecaseRequest, items: readonly D1UsecaseItem[], problems: D1UsecaseProblem[]): D1UsecaseBuild['emit'] {
  const out: D1UsecaseBuild['emit'] = [];
  for (const item of items) {
    if (!item.definition) continue;
    const pipeline = pipelineFor(request, item);
    const adapter = applicationAdapterIssues(pipeline);
    if (adapter.length) {
      error(problems, 'ADAPTER_IMPORT', item.usecaseId, adapter[0]);
      continue;
    }
    item.definition = stampDefinition(item.definition, pipeline.defPath, pipeline.dependsFiles);
    const rendered = renderDefinition(item.definition, pipeline.defPath);
    if ('issues' in rendered) {
      error(problems, 'DEFINITION', item.defPath, rendered.issues[0] || 'Definition did not render.');
      continue;
    }
    if (request.files && request.files.length) {
      const fidelity = readUsecaseFidelity(rendered.source, request.files);
      if (fidelity.problems.length) {
        for (const problem of fidelity.problems) error(problems, problem.code, item.usecaseId, problem.message);
        continue;
      }
    }
    out.push({ definition: item.definition, pipeline: [pipeline] });
  }
  return out;
}

function pipelineFor(request: D1UsecaseRequest, item: D1UsecaseItem): D1PipelineItem {
  const qualified = qualifyDefPath(request.project, item.defPath);
  const entity = request.entities.find(entry => entry.entityId === item.entityId);
  const port = request.ports.find(entry => entry.entityId === item.entityId);
  const dependsOn = [pipelineId(request.project, request.moduleName, 'domainEntity', item.entityId)];
  const dependsFiles = entity?.defPath ? [qualifyDefPath(request.project, entity.defPath)] : [];
  if (port && item.definition && isRecord(item.definition.data) && Array.isArray(item.definition.data.ports) && item.definition.data.ports.length) {
    dependsOn.push(pipelineId(request.project, request.moduleName, 'repositoryPort', port.portId));
    if (port.defPath) dependsFiles.push(qualifyDefPath(request.project, port.defPath));
  }
  for (const path of dependencyPaths(request.moduleName, item)) {
    if (!dependsFiles.includes(path)) dependsFiles.push(path);
  }
  return {
    id: pipelineId(request.project, request.moduleName, 'usecase', item.usecaseId),
    type: 'usecase',
    defPath: qualified,
    outputPath: futureOutputPath(qualified),
    outputAvailability: 'future',
    dependsFiles,
    dependsOn,
    skills: skillPaths('usecase'),
  };
}

/** A usecase file must not depend on an adapter. */
export function applicationAdapterIssues(item: D1PipelineItem): string[] {
  if (item.type !== 'usecase') return [];
  const issues: string[] = [];
  for (const dep of item.dependsOn) {
    if (dep.includes('/repositoryAdapter/')) issues.push(`Application depends on adapter ${dep}.`);
  }
  for (const file of item.dependsFiles) {
    if (file.includes('/adapters/') || file.includes('RepositoryAdapter')) {
      issues.push(`Application file depends on adapter ${file}.`);
    }
  }
  return issues;
}

function finish(
  request: D1UsecaseRequest,
  ok: boolean,
  enumerations: D1UsecaseEnumeration[],
  usecases: D1UsecaseItem[],
  problems: D1UsecaseProblem[],
  normalizations: D1UsecaseNormalization[],
  emit: D1UsecaseBuild['emit'],
): D1UsecaseBuild {
  if (!normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED')) {
    normalizations.push({
      code: 'ENUMERATIONS_NOT_CONSUMED',
      path: ENUMERATION_SOURCE,
      detail: enumerations.length
        ? `${enumerations.length} enum values stay on the domain draft. usecases50 does not copy them.`
        : 'The domain draft has no enumerations. usecases50 did not invent any.',
    });
  }
  sortInPlace(enumerations, item => `${item.entityId}\u0000${item.path}`);
  sortInPlace(problems, item => `${item.path}\u0000${item.code}\u0000${item.message}`);
  sortInPlace(normalizations, item => `${item.path}\u0000${item.code}`);
  usecases.sort((left, right) => left.usecaseId.localeCompare(right.usecaseId));
  emit.sort((left, right) => (left.pipeline[0]?.defPath || '').localeCompare(right.pipeline[0]?.defPath || ''));
  return {
    schemaVersion: D1_USECASE_VERSION,
    project: request.project,
    moduleName: request.moduleName,
    llmCalls: request.llmCalls,
    ok,
    enumerations,
    usecases,
    problems,
    normalizations,
    emit: ok ? emit : [],
  };
}

function error(problems: D1UsecaseProblem[], code: string, path: string, message: string): void {
  problems.push({ severity: 'error', code, path, message });
}

function review(problems: D1UsecaseProblem[], code: string, path: string, message: string): void {
  problems.push({ severity: 'review', code, path, message });
}

function sortInPlace<T>(items: T[], key: (item: T) => string): void {
  items.sort((left, right) => key(left).localeCompare(key(right)));
}
