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
import { readContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import { authorizedPayloadNames, declaredFieldsFor, domainSignature, mdmInputFields, preconditionsFor } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { enforcedRuleIds, rulePlanForUsecase } from '/_102021_/l2/agentDefsL1/steps/usecases50/rulePlan.js';
import { readUsecaseFidelity } from '/_102021_/l2/agentDefsL1/steps/usecases50/fidelity.js';
import { capabilityApplies, mdmForOperation, isForeignMdmPatchKey, isMdmFacadeCall } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';
import {
  D1_USECASE_VERSION,
  D1_WRITE_CALLS,
  ENUMERATION_REASON,
  ENUMERATION_SOURCE,
  type D1UsecaseBuild,
  type D1UsecaseEntity,
  type D1UsecaseEnumeration,
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
  transitionRefOf,
  type D1UsecaseSelection,
  type D1WorkerStep,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
interface ProjectionField {
  name: string;
  /** Absent when the routes that declare this name do not agree on one type. */
  type?: string;
  fieldRef?: string;
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
  const sourcePayload = usecase.operation === 'transition'
    ? [...(entity.transitions.find(item => item.transitionId === transitionRefOf(usecase))?.payload || [])]
    : [];
  const signed = domainSignature(entity, usecase.operation, sourcePayload);
  const input = signed.input;
  noteRequiredNotes(entity, usecase, input, path, problems);
  const transitionOk = noteTransition(request, entity, usecase, steps, input, path, problems);
  const decided = decideRules(request, entity, usecase, steps, path, problems, normalizations);
  const rulesApplied = appliedRuleIds(decided.plan);
  const effects = resolveEffects(request, entity, usecase, steps, path, problems);
  const port = request.ports.find(item => item.entityId === entity.entityId) || null;
  const portCalls = resolvePorts(entity, usecase, port, steps, path, problems);
  const mdm = resolveMdm(request, entity, usecase, input, signed.output, steps, path, problems);
  noteAdapter(steps, path, problems);
  noteContext(steps, path, problems);
  const boundary = resolveBoundary(portCalls, mdm, steps, path, problems);
  if (!transitionOk || problems.some(problem => problem.severity === 'error' && problem.path === path)) {
    return { ...blank, mdm, transactionBoundary: boundary, steps };
  }

  const integrationPath = `l4/${request.moduleName}/integration.defs.ts`;
  const transitionRef = transitionRefOf(usecase);
  const data = {
    usecaseId: usecase.usecaseId,
    entityId: entity.entityId,
    operation: usecase.operation,
    rulesApplied,
    effects: effects.map(eventId => ({ eventId, path: integrationPath, symbol: eventId })),
    ...(transitionRef ? { transitionRef } : {}),
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

function noteRequiredNotes(
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  input: ProjectionField[],
  path: string,
  problems: D1UsecaseProblem[],
): void {
  if (usecase.operation !== 'transition') return;
  const transition = entity.transitions.find(item => item.transitionId === transitionRefOf(usecase));
  for (const ruleId of transition?.ruleRefs || []) {
    const leaf = requiredLeaf(ruleId);
    if (!leaf) continue;
    const field = entity.fields.find(item => item.name === leaf || item.name.endsWith(`.${leaf}`));
    if (!field) continue;
    const supplied = input.some(item => item.name === leaf || item.fieldRef === `${entity.entityId}.${field.name}`);
    if (!supplied) {
      review(problems, 'NOTE_WITHOUT_INPUT', path, `Rule ${ruleId} requires ${field.name}, and the operation input does not supply it.`);
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
    if (usecase.operation !== 'transition' || step.transitionId !== transitionRefOf(usecase)) {
      error(problems, 'INVALID_TRANSITION', path, `Transition ${step.transitionId} is not the operation ${usecase.usecaseId}.`);
      ok = false;
    }
    for (const name of step.payload) {
      if (!allowed.has(name)) {
        error(problems, 'PAYLOAD_UNAUTHORIZED', path, `Payload ${name} is not an input of ${path}.`);
        ok = false;
      }
    }
  }
  if (usecase.operation === 'transition' && !entity.transitions.some(item => item.transitionId === transitionRefOf(usecase))) {
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
  const plan = rulePlanForUsecase({
    moduleName: request.moduleName,
    entityId: entity.entityId,
    usecaseId: usecase.usecaseId,
    operation: usecase.operation,
    transitionRef: transitionRefOf(usecase),
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
    routes: [],
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

/** Local enforced ids, then pending RULE_UNBOUND ids. The plan itself is not stored. */
function appliedRuleIds(plan: readonly D1RulePlanRow[]): string[] {
  const applied = enforcedRuleIds(plan);
  for (const row of plan) {
    if (row.enforcement !== 'pending' || row.gap !== 'RULE_UNBOUND' || !row.ruleId) continue;
    if (!applied.includes(row.ruleId)) applied.push(row.ruleId);
  }
  return applied;
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
  input: readonly { name: string }[],
  output: readonly { name: string }[],
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
    input,
    preconditionsFor(request.files, request.moduleName, entity.entityId, entity.fields),
    declaredFieldsFor(request.files, request.moduleName, entity.entityId, entity.fields),
  );
  const bound = mdmForOperation({
    entityId: entity.entityId,
    namespace: entity.namespace,
    capabilities: entity.capabilities || [],
    selected,
    platformFields: entity.platformFields || [],
    inputFields: read.fields,
    outputFields: output.map(field => ({ path: field.name })),
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

function dependencyPaths(request: D1UsecaseRequest, item: D1UsecaseItem): string[] {
  const data = item.definition && isRecord(item.definition.data) ? item.definition.data : {};
  const paths = new Set<string>();
  if (typeof data.transitionRef === 'string' && data.transitionRef) {
    paths.add(`l4/${request.moduleName}/ontology/${item.entityId}.defs.ts`);
  }
  const entity = request.entities.find(entry => entry.entityId === item.entityId);
  if (entity && Array.isArray(data.rulesApplied)) {
    for (const ruleId of data.rulesApplied) {
      if (typeof ruleId !== 'string' || !ruleId) continue;
      paths.add(ruleSourcePath(request, entity, item.usecaseId, ruleId));
    }
  }
  if (Array.isArray(data.effects)) {
    for (const effect of data.effects) {
      if (isRecord(effect) && typeof effect.path === 'string' && effect.path) paths.add(effect.path);
    }
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
    const l2 = pipeline.dependsFiles.find(file => /(^|\/)l2\//.test(file));
    if (l2) {
      error(problems, 'L2_DEPENDENCY', item.usecaseId, `Usecase dependency ${l2} is an L2 path.`);
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
  if (port && entity?.storageTarget === 'moduleDatabase') {
    dependsOn.push(pipelineId(request.project, request.moduleName, 'repositoryPort', port.portId));
    if (port.defPath) dependsFiles.push(qualifyDefPath(request.project, port.defPath));
  }
  for (const path of dependencyPaths(request, item)) {
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
