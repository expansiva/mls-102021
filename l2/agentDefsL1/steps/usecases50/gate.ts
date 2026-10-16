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
import { declaredFieldsFor, domainSignature, mdmInputFields, preconditionsFor } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { enforcedRuleIds, rulePlanForUsecase } from '/_102021_/l2/agentDefsL1/steps/usecases50/rulePlan.js';
import { readUsecaseFidelity } from '/_102021_/l2/agentDefsL1/steps/usecases50/fidelity.js';
import { capabilityApplies, mdmForOperation, isForeignMdmPatchKey } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';
import {
  D1_USECASE_VERSION,
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
  type D1UsecaseProblem,
  type D1RulePlanRow,
  type D1UsecaseRequest,
  transitionRefOf,
  type D1UsecaseSelection,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
interface ProjectionField {
  name: string;
  /** Absent when the routes that declare this name do not agree on one type. */
  type?: string;
  fieldRef?: string;
}

/**
 * One deterministic pass from the selection, the domain draft and the ports.
 * The model does not order steps.
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
  const blank: D1UsecaseItem = {
    usecaseId: usecase.usecaseId,
    entityId: usecase.entity,
    operation: usecase.operation,
    defPath: usecase.defPath,
    routes: [...usecase.routes],
    trustedContext: 'ctx',
    mdm: null,
    transactionBoundary: null,
    steps: [],
    definition: null,
  };
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
  const decided = decideRules(request, entity, usecase);
  const rulesApplied = appliedRuleIds(decided.plan);
  const effects = resolveEffects(request, entity, usecase);
  const mdm = resolveMdm(request, entity, usecase, input, signed.output, path, problems);
  if (problems.some(problem => problem.severity === 'error' && problem.path === path)) {
    return { ...blank, mdm };
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
    return { ...blank, mdm };
  }
  return { ...blank, mdm, definition };
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

function decideRules(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
): { rules: string[]; plan: D1RulePlanRow[] } {
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
  return { rules: enforcedRuleIds(plan), plan };
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

function resolveEffects(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
): string[] {
  const on = `${entity.entityId}.${usecase.usecaseId}`;
  return request.outbound.filter(event => event.on === on).map(event => event.eventId);
}

function resolveMdm(
  request: D1UsecaseRequest,
  entity: D1UsecaseEntity,
  usecase: D1UsecaseSelection,
  input: readonly { name: string }[],
  output: readonly { name: string }[],
  path: string,
  problems: D1UsecaseProblem[],
): D1UsecaseMdm | null {
  if (entity.storageTarget !== 'mdm') return null;
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
  return bound;
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
