/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/gate.ts" enhancement="_blank"/>

import {
  D1_DEFINITION_SCHEMA,
  definitionIssues,
  isRecord,
  type D1Definition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  futureOutputPath,
  pipelineId,
  qualifyDefPath,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { readContractAst, symbolFields, type D1ContractField } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import {
  D1_MDM_CALLS,
  D1_USECASE_VERSION,
  D1_WRITE_CALLS,
  ENUMERATION_REASON,
  ENUMERATION_SOURCE,
  type D1UsecaseBuild,
  type D1UsecaseEntity,
  type D1UsecaseEnumeration,
  type D1UsecaseItem,
  type D1UsecaseMdm,
  type D1UsecaseNormalization,
  type D1UsecasePlanInput,
  type D1UsecasePort,
  type D1UsecaseProblem,
  type D1UsecaseRequest,
  type D1UsecaseSelection,
  type D1WorkerStep,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

const MDM_CALL: Record<string, string> = { list: 'read', create: 'create', update: 'attach' };

interface ProjectionField {
  name: string;
  type: string;
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
  const enumerations = unconsumedEnumerations(request);
  const seen = new Set<string>();
  const items: D1UsecaseItem[] = [];

  for (const usecase of request.usecases) {
    if (seen.has(usecase.usecaseId)) {
      error(problems, 'DUPLICATE_USECASE', usecase.usecaseId, `Usecase ${usecase.usecaseId} is selected more than once.`);
      continue;
    }
    seen.add(usecase.usecaseId);
    items.push(planUsecase(request, usecase, problems));
  }

  const ok = !problems.some(problem => problem.severity === 'error');
  const emit = ok ? emitItems(request, items, problems) : [];
  const stillOk = ok && !problems.some(problem => problem.severity === 'error');
  return finish(request, stillOk, enumerations, items, problems, normalizations, stillOk ? emit : []);
}

function planUsecase(request: D1UsecaseRequest, usecase: D1UsecaseSelection, problems: D1UsecaseProblem[]): D1UsecaseItem {
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
  const input = sharedInput(request, usecase, entity, routes, problems);
  noteDerived(entity, input, steps, path, problems);
  noteRequiredNotes(entity, usecase, input, path, problems);
  const transitionOk = noteTransition(entity, usecase, steps, input, path, problems);
  const rules = resolveRules(request, entity, usecase, steps, path, problems);
  const effects = resolveEffects(request, entity, usecase, steps, path, problems);
  const port = request.ports.find(item => item.entityId === entity.entityId) || null;
  const portCalls = resolvePorts(entity, usecase, port, steps, path, problems);
  const mdm = resolveMdm(entity, usecase, steps, path, problems);
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
    effects: effects.map(eventId => ({ eventId })),
  };
  const definition: D1Definition = {
    schemaVersion: D1_DEFINITION_SCHEMA,
    artifactType: 'usecase',
    artifactId: usecase.usecaseId,
    moduleName: request.moduleName,
    data,
  };
  const issues = definitionIssues(definition);
  if (issues.length) {
    error(problems, 'DEFINITION', path, issues[0]);
    return { ...blank, mdm, transactionBoundary: boundary, steps };
  }
  return { ...blank, mdm, transactionBoundary: boundary, steps, definition };
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
      return { route: route.route, contractPath, projection: 'unresolved' as const, outputFields: [], fields: [] };
    }
    return {
      route: route.route,
      contractPath,
      projection: 'declared' as const,
      outputFields: fields.map(field => field.name),
      fields,
    };
  }).map((item, _index, all) => {
    if (item.projection !== 'declared') return item;
    const conflict = item.fields.find(field => {
      const other = all.find(candidate => candidate.projection === 'declared' && candidate.fields.some(peer => peer.name === field.name && peer.type !== field.type));
      return !!other;
    });
    if (conflict) {
      error(problems, 'TYPE_CONFLICT', usecase.usecaseId, `Field ${conflict.name} has two contract types. No cast was applied.`);
    }
    return item;
  });
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
  if (!declared.length) return [];
  const [first, ...rest] = declared;
  const shared: ProjectionField[] = [];
  for (const field of first) {
    const peers = rest.map(list => list.find(item => item.name === field.name));
    if (rest.length && peers.some(item => !item)) {
      review(problems, 'INPUT_NOT_SHARED', usecase.usecaseId, `Input ${field.name} is not on every resolved contract. It was not copied.`);
      continue;
    }
    if (peers.some(item => item && item.type !== field.type)) {
      error(problems, 'TYPE_CONFLICT', usecase.usecaseId, `Input ${field.name} has two contract types. No cast was applied.`);
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
  const fields = symbolFields(ast, symbol);
  if (!fields) return null;
  return fields.map(field => toProjection(field, entity));
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
  const domain = entity.fields.find(item => item.name === field.name || item.name.endsWith(`.${field.name}`));
  const projected: ProjectionField = { name: field.name, type: field.type };
  if (domain) projected.fieldRef = `${entity.entityId}.${domain.name}`;
  return projected;
}

function unionOutputs(outputs: RouteOutput[]): ProjectionField[] {
  const union: ProjectionField[] = [];
  for (const route of outputs) {
    for (const field of route.fields) {
      if (!union.some(item => item.name === field.name)) union.push(field);
    }
  }
  return union;
}

function noteDerived(
  entity: D1UsecaseEntity,
  input: ProjectionField[],
  steps: readonly D1WorkerStep[],
  path: string,
  problems: D1UsecaseProblem[],
): void {
  const derived = entity.fields.filter(field => field.derived);
  const names = new Set<string>();
  for (const field of input) names.add(field.name);
  for (const step of steps) {
    if (step.kind === 'transition') step.payload.forEach(name => names.add(name));
  }
  for (const name of names) {
    const match = derived.find(field => field.name === name || field.name.endsWith(`.${name}`));
    if (match) error(problems, 'DERIVED_EDITABLE', path, `Derived field ${match.name} is an input of ${path}.`);
  }
  for (let index = input.length - 1; index >= 0; index -= 1) {
    const name = input[index].name;
    if (derived.some(field => field.name === name || field.name.endsWith(`.${name}`))) input.splice(index, 1);
  }
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
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  steps: readonly D1WorkerStep[],
  input: ProjectionField[],
  path: string,
  problems: D1UsecaseProblem[],
): boolean {
  const allowed = new Set(input.map(field => field.name));
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

function resolveRules(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  steps: readonly D1WorkerStep[],
  path: string,
  problems: D1UsecaseProblem[],
): string[] {
  const known = new Set([
    ...request.moduleRules,
    ...entity.rules.map(rule => rule.ruleId),
  ]);
  const ids: string[] = [];
  const transition = entity.transitions.find(item => item.transitionId === usecase.usecaseId);
  if (usecase.operation === 'transition' && transition) ids.push(...transition.ruleRefs);
  for (const step of steps) {
    if (step.kind === 'rule') ids.push(step.ruleId);
  }
  const out: string[] = [];
  for (const ruleId of ids) {
    if (!ruleId || out.includes(ruleId)) continue;
    if (!known.has(ruleId)) {
      error(problems, 'RULE_UNRESOLVED', path, `Rule ${ruleId} is not in the module or the platform catalog.`);
      continue;
    }
    out.push(ruleId);
  }
  return out;
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
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
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
  const call = MDM_CALL[usecase.operation] || '';
  if (!call || !(D1_MDM_CALLS as readonly string[]).includes(call)) {
    error(problems, 'INVENTED_OPERATION', path, `Operation ${usecase.operation} has no MDM call.`);
    return null;
  }
  if (!entity.namespace) {
    error(problems, 'MDM_NAMESPACE', path, `MDM role ${entity.entityId} names no namespace.`);
    return null;
  }
  for (const step of steps) {
    if (step.kind !== 'mdm') continue;
    if (step.namespace !== entity.namespace) {
      error(problems, 'MDM_NAMESPACE', path, `Namespace ${step.namespace || '(empty)'} is not ${entity.namespace}.`);
    }
    if (step.entity !== entity.entityId) {
      error(problems, 'INVENTED_OPERATION', path, `MDM entity ${step.entity} is not ${entity.entityId}.`);
    }
    if (step.call !== call) {
      error(problems, 'INVENTED_OPERATION', path, `MDM call ${step.call} is not ${call}.`);
    }
  }
  return { namespace: entity.namespace, call };
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
  const writes = portCalls.filter(call => (D1_WRITE_CALLS as readonly string[]).includes(call)).length
    + (mdm && mdm.call !== 'read' ? 1 : 0);
  const local = steps.filter(step => step.kind === 'transaction' && step.boundary === 'local').length;
  const external = steps.filter(step => step.kind === 'transaction' && step.boundary === 'external').length;
  const other = steps.filter(step => step.kind === 'transaction' && step.boundary !== 'local' && step.boundary !== 'external').length;
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
    const rendered = renderDefinition(item.definition, [pipeline]);
    if ('issues' in rendered) {
      error(problems, 'DEFINITION', item.defPath, rendered.issues[0] || 'Definition did not render.');
      continue;
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
