/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/gate.ts" enhancement="_blank"/>

import {
  D1_FLOW_STEP_IDS,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  D1_DEFINITION_SCHEMA,
  definitionIssues,
  isArtifactType,
  isRecord,
  type D1Definition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { logicalDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import {
  futureOutputPath,
  graphIssues,
  pipelineItemIssues,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { parseRendered } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { contractPath } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import {
  CHAIN_STEP_IDS,
  D1_REPORT_VERSION,
  INVENTORY_NOTE,
  PHASE_OF_TYPE,
  type D1FinalizeEnum,
  type D1FinalizeFile,
  type D1FinalizeFinding,
  type D1FinalizeInventory,
  type D1FinalizePending,
  type D1FinalizePhase,
  type D1FinalizeReport,
  type D1FinalizeRequest,
} from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';

interface ParsedDef {
  logical: string;
  definition: D1Definition;
  pipeline: D1PipelineItem[];
  currentHash: string;
  receiptHash: string;
  text: string;
}

/**
 * Reads the request. Does not call a model, does not open a repair, and does
 * not treat a missing future `.ts` as a missing def.
 */
export function buildD1Finalize(request: D1FinalizeRequest): D1FinalizeReport {
  const findings: D1FinalizeFinding[] = [];
  const chainApproved = CHAIN_STEP_IDS.every(id => request.pipeline.steps[id]?.status === 'approved');
  const heldEarlier = earlierHold(request.pipeline);
  copyKnownProblems(request, findings, chainApproved);

  const parsed = parseObserved(request, findings);
  const files = classifyFiles(request, chainApproved);
  const enumerations = chainApproved ? enumsOf(request.drafts.support70) : { consumed: [], notConsumed: [] };
  const declaredNotConsumedBy = chainApproved ? declaredNotConsumed(request) : [];
  if (chainApproved) {
    noteEnumerations(enumerations, findings);
    checkHashes(request, parsed, findings);
    checkChildren(request, findings);
    checkExtra(request, parsed, findings);
    checkSchemaAndGraph(request, parsed, findings);
    checkRules(request, parsed, findings);
    checkEvents(request, parsed, findings);
    checkMdmTables(parsed, findings);
  }

  const coverageGaps: string[] = [];
  if (chainApproved) checkCoverage(request, parsed, findings, coverageGaps);
  const materializationPending = chainApproved ? pendingOutputs(parsed, request) : [];
  const inventory = inventoryOf(parsed);
  const errors = findings.filter(item => item.severity === 'error');
  const defsStatus = !chainApproved ? 'notRun' as const : errors.length ? 'incomplete' as const : 'complete' as const;
  const outcome = heldEarlier || defsStatus !== 'complete' ? 'held' as const : 'complete' as const;
  const blocking = heldEarlier
    ? (request.pipeline.steps[request.pipeline.awaitingStep || 'input20']?.error || '')
    : blockingOf(findings);

  return {
    schemaVersion: D1_REPORT_VERSION,
    project: request.project,
    moduleName: request.moduleName,
    llmCalls: 0,
    repairOpened: false,
    executableBackend: false,
    inventoryNote: INVENTORY_NOTE,
    defsStatus,
    materialization: materializationPending.length ? 'pending' : 'none',
    outcome,
    blocking,
    phases: phasesOf(request, outcome, blocking, heldEarlier),
    findings: sorted(findings, item => `${item.code}\u0000${item.ownerRef}\u0000${item.path}\u0000${item.message}`),
    declaredNotConsumedBy,
    enumerations: {
      consumed: sorted(enumerations.consumed, enumKey),
      notConsumed: sorted(enumerations.notConsumed, enumKey),
    },
    files: sorted(files, item => `${item.action}\u0000${item.defPath}`),
    sources: sourceRows(request),
    materializationPending: sorted(materializationPending, item => item.outputPath),
    coverage: { checked: chainApproved, gaps: [...coverageGaps].sort() },
    inventory,
    snapshotHash: request.snapshot?.snapshotHash || '',
  };
}

export function earlierHold(pipeline: D1FinalizeRequest['pipeline']): boolean {
  const stepId = pipeline.awaitingStep;
  if (!stepId || stepId === 'finalize80') return false;
  return pipeline.steps[stepId]?.status === 'failed';
}

function phasesOf(
  request: D1FinalizeRequest,
  outcome: 'complete' | 'held',
  blocking: string,
  heldEarlier: boolean,
): D1FinalizePhase[] {
  return D1_FLOW_STEP_IDS.map(stepId => {
    if (stepId === 'finalize80') {
      if (heldEarlier) return { stepId, executed: false, status: 'absent' as const, error: '' };
      if (outcome === 'complete') return { stepId, executed: true, status: 'approved' as const, error: '' };
      return { stepId, executed: true, status: 'failed' as const, error: blocking };
    }
    const state = request.pipeline.steps[stepId];
    if (!state || (state.status !== 'approved' && state.status !== 'failed')) {
      return { stepId, executed: false, status: 'absent' as const, error: '' };
    }
    return {
      stepId,
      executed: true,
      status: state.status,
      error: state.error || '',
    };
  });
}

function copyKnownProblems(request: D1FinalizeRequest, findings: D1FinalizeFinding[], chainApproved: boolean): void {
  const snapshot = request.snapshot;
  if (snapshot && Array.isArray(snapshot.problems)) {
    for (const problem of snapshot.problems) {
      pushFinding(findings, problem.severity, problem.code, problem.path, problem.message, problem.ownerRef || '');
    }
  } else if (chainApproved) {
    error(findings, 'INPUT_ABSENT', 'input.json', 'input.json is missing. finalize80 did not invent an inventory.', '');
  }
  if (!chainApproved) return;
  const support = request.drafts.support70;
  if (!isRecord(support) || !Array.isArray(support.problems)) return;
  for (const problem of support.problems) {
    if (!isRecord(problem) || typeof problem.code !== 'string' || typeof problem.message !== 'string') continue;
    const severity = problem.severity === 'error' ? 'error' : 'review';
    const path = typeof problem.path === 'string' ? problem.path : '';
    const owner = path;
    if (findings.some(item => item.code === problem.code && item.ownerRef === owner)) continue;
    pushFinding(findings, severity, problem.code, path, problem.message, owner);
  }
}

function parseObserved(request: D1FinalizeRequest, findings: D1FinalizeFinding[]): ParsedDef[] {
  const inventoried = inventoriedPaths(request);
  const parsed: ParsedDef[] = [];
  for (const observed of request.observed) {
    const logical = logicalDefPath(observed.defPath);
    if (!observed.text) {
      if (observed.unitDone) {
        error(findings, 'ARTIFACT_ABSENT', logical, `Artifact ${logical} was recorded and the file is absent.`, logical);
      }
      continue;
    }
    const rendered = parseRendered(observed.text);
    const definition = rendered?.definition;
    const pipeline = rendered?.pipeline;
    if (!definition || !Array.isArray(pipeline) || !isDefinition(definition)) {
      if (inventoried.has(logical)) {
        error(findings, 'SCHEMA_INVALID', logical, `Inventoried file ${logical} is not a definition.`, logical);
      }
      continue;
    }
    const items = pipeline.filter(isPipelineItem);
    if (items.length !== pipeline.length) {
      error(findings, 'SCHEMA_INVALID', logical, `Inventoried file ${logical} has a pipeline item that is not an object.`, logical);
    }
    parsed.push({
      logical,
      definition,
      pipeline: items,
      currentHash: observed.currentHash,
      receiptHash: observed.receiptHash,
      text: observed.text,
    });
  }
  return parsed;
}

function classifyFiles(request: D1FinalizeRequest, chainApproved: boolean): D1FinalizeFile[] {
  const snapshot = request.snapshot;
  if (!snapshot) return [];
  const files: D1FinalizeFile[] = [];
  for (const planned of snapshot.files || []) {
    const phase = PHASE_OF_TYPE[planned.artifactType] || '';
    const ran = chainApproved && !!phase && request.pipeline.steps[phase as D1StepId]?.status === 'approved';
    const action = fileAction(planned.action, ran);
    files.push({
      defPath: planned.defPath,
      action,
      ownerRefs: [...(planned.ownerRefs || [])],
      sourceHash: planned.contentHash || '',
      phase,
    });
  }
  for (const removed of snapshot.removed || []) {
    const phase = PHASE_OF_TYPE[removed.kind] || '';
    const ran = chainApproved && !!phase && request.pipeline.steps[phase as D1StepId]?.status === 'approved';
    files.push({
      defPath: removed.defPath || removed.id,
      action: ran ? 'removed' : 'notGenerated',
      ownerRefs: [removed.id],
      sourceHash: removed.contentHash || '',
      phase,
    });
  }
  return files;
}

function fileAction(action: string, ran: boolean): D1FinalizeFile['action'] {
  if (action === 'preserve') return 'preserved';
  if (action === 'remove') return ran ? 'removed' : 'notGenerated';
  if (action === 'create' || action === 'update' || action === 'recompose') return ran ? 'generated' : 'notGenerated';
  return 'notGenerated';
}

function checkHashes(request: D1FinalizeRequest, parsed: ParsedDef[], findings: D1FinalizeFinding[]): void {
  for (const item of parsed) {
    if (!item.receiptHash || !item.currentHash || item.receiptHash === item.currentHash) continue;
    error(findings, 'STALE', item.logical, `Artifact ${item.logical} does not match its receipt.`, item.logical);
  }
  const snapshot = request.snapshot;
  if (!snapshot) return;
  for (const source of snapshot.sources || []) {
    if (source.state !== 'present') continue;
    const current = request.sourceHashes[source.path];
    if (current === undefined || current === source.sha256) continue;
    error(findings, 'STALE', source.path, `Source ${source.path} changed after the snapshot.`, source.path);
  }
}

function checkChildren(request: D1FinalizeRequest, findings: D1FinalizeFinding[]): void {
  for (const child of request.children) {
    if (child.status !== 'completed' || child.present) continue;
    const path = logicalDefPath(child.artifactPath || child.planId);
    error(findings, 'ARTIFACT_ABSENT', path, `Child ${child.planId} completed and the artifact is absent.`, child.planId);
  }
}

function checkExtra(request: D1FinalizeRequest, parsed: ParsedDef[], findings: D1FinalizeFinding[]): void {
  const known = inventoriedPaths(request);
  for (const item of parsed) {
    if (known.has(item.logical)) continue;
    error(findings, 'EXTRA_FILE', item.logical, `Definition ${item.definition.artifactId} is not in the inventory.`, item.definition.artifactId);
  }
}

function checkSchemaAndGraph(request: D1FinalizeRequest, parsed: ParsedDef[], findings: D1FinalizeFinding[]): void {
  const items: D1PipelineItem[] = [];
  const present = new Set(parsed.map(item => qualify(request.project, item.logical)));
  for (const item of parsed) {
    for (const issue of definitionIssues(item.definition)) {
      error(findings, 'SCHEMA_INVALID', item.logical, issue, item.definition.artifactId);
    }
    for (const pipelineItem of item.pipeline) {
      items.push(pipelineItem);
      for (const issue of pipelineItemIssues(pipelineItem, request.project, request.moduleName)) {
        error(findings, 'SCHEMA_INVALID', pipelineItem.defPath || item.logical, issue, pipelineItem.id);
      }
    }
  }
  for (const pipelineItem of items) {
    for (const dep of pipelineItem.dependsFiles || []) {
      if (knownDependency(dep, items, present)) continue;
      error(findings, 'REF_INVALID', dep, `Dependency ${dep} is not a current def or a named future output.`, pipelineItem.id);
    }
  }
  for (const issue of graphIssues(items)) {
    // A record ref between domain defs is the edge domain30 writes. It is not an orphan.
    if (/^domainEntity .+ must not depend on (domainEntity|valueObject)\.$/.test(issue)) continue;
    error(findings, 'REF_INVALID', 'pipeline', issue, '');
  }
}

function knownDependency(dep: string, items: D1PipelineItem[], present: Set<string>): boolean {
  if (items.some(item => item.defPath === dep || item.outputPath === dep)) return true;
  if (present.has(dep) || present.has(logicalDefPath(dep))) return true;
  if (dep.endsWith('.d.ts')) {
    const ts = dep.replace(/\.d\.ts$/, '.ts');
    return items.some(item => item.outputPath === ts);
  }
  const future = futureOutputPath(dep);
  return !!future && items.some(item => item.outputPath === future);
}

function checkRules(request: D1FinalizeRequest, parsed: ParsedDef[], findings: D1FinalizeFinding[]): void {
  const draft = request.drafts.domain30;
  if (!isRecord(draft) || !Array.isArray(draft.entities)) return;
  for (const entity of draft.entities) {
    if (!isRecord(entity) || typeof entity.entityId !== 'string') continue;
    const expected = rulesOf(isRecord(entity.definition) ? entity.definition.data : null);
    if (expected.size === 0) continue;
    const disk = parsed.find(item => item.definition.artifactType === 'domainEntity' && item.definition.artifactId === entity.entityId);
    const actual = disk ? rulesOf(disk.definition.data) : new Set<string>();
    for (const ruleId of expected) {
      if (actual.has(ruleId)) continue;
      error(findings, 'RULE_LOST', entity.entityId, `Rule ${ruleId} was on the domain draft and is not on the persisted def.`, ruleId);
    }
  }
}

function checkEvents(request: D1FinalizeRequest, parsed: ParsedDef[], findings: D1FinalizeFinding[]): void {
  const selected = new Set(request.snapshot?.selection.outbound || []);
  if (selected.size === 0) return;
  const integration = parsed.find(item => item.definition.artifactType === 'integrationOutbound');
  const events = new Set(eventIds(integration?.definition.data));
  for (const eventId of [...selected].sort()) {
    if (events.has(eventId)) continue;
    error(findings, 'EVENT_LOST', eventId, `Outbound ${eventId} was selected and is not on the persisted integration def.`, eventId);
  }
}

function checkMdmTables(parsed: ParsedDef[], findings: D1FinalizeFinding[]): void {
  const storage = new Map<string, string>();
  for (const item of parsed) {
    if (item.definition.artifactType !== 'domainEntity' || !isRecord(item.definition.data)) continue;
    const target = item.definition.data.storageTarget;
    if (typeof target === 'string') storage.set(item.definition.artifactId, target);
  }
  for (const item of parsed) {
    if (item.definition.artifactType !== 'table' || !isRecord(item.definition.data)) continue;
    const entityId = typeof item.definition.data.entityId === 'string' ? item.definition.data.entityId : item.definition.artifactId;
    const tableId = typeof item.definition.data.tableId === 'string' ? item.definition.data.tableId : item.definition.artifactId;
    if (storage.get(entityId) !== 'mdm') continue;
    error(findings, 'TABLE_MDM', tableId, `Table ${tableId} belongs to ${entityId}, which is mdm.`, entityId);
  }
}

function checkCoverage(
  request: D1FinalizeRequest,
  parsed: ParsedDef[],
  findings: D1FinalizeFinding[],
  gaps: string[],
): void {
  const snapshot = request.snapshot;
  if (!snapshot) return;
  const handlers = handlerRows(parsed);
  const usecases = parsed.filter(item => item.definition.artifactType === 'usecase');
  const usecaseIds = new Set(usecases.flatMap(item => idsOfUsecase(item.definition)));
  const selectedIds = new Set(snapshot.selection.usecases.flatMap(item => [item.usecaseId, item.identity].filter(Boolean)));
  const ports = new Set(parsed.filter(item => item.definition.artifactType === 'repositoryPort').map(item => item.definition.artifactId));
  const portByEntity = new Map(snapshot.selection.ports.map(item => [item.entity, item.portId]));
  const storage = storageOf(parsed);
  const domainRules = new Map<string, Set<string>>();
  for (const item of parsed) {
    if (item.definition.artifactType !== 'domainEntity') continue;
    domainRules.set(item.definition.artifactId, rulesOf(item.definition.data));
  }
  const draftedRules = draftRules(request);
  const outbound = new Set(snapshot.selection.outbound);

  for (const route of snapshot.selection.routes) {
    if (handlers.some(handler => handler.route === route.route)) continue;
    gap(findings, gaps, route.route, `Route ${route.route} has no handler.`);
  }
  for (const handler of handlers) {
    if (!selectedIds.has(handler.usecaseId) && !usecaseIds.has(handler.usecaseId)) {
      gap(findings, gaps, handler.route, `Handler ${handler.route} names usecase ${handler.usecaseId}, which is not selected.`);
    }
    const page = snapshot.selection.routes.find(route => route.route === handler.route)?.page || '';
    checkContract(request, page, handler.route, findings);
  }
  for (const item of usecases) {
    const data = isRecord(item.definition.data) ? item.definition.data : {};
    const usecaseId = typeof data.usecaseId === 'string' ? data.usecaseId : item.definition.artifactId;
    const entityId = typeof data.entityId === 'string' ? data.entityId : '';
    if (entityId && !domainRules.has(entityId)) gap(findings, gaps, usecaseId, `Usecase ${usecaseId} names model ${entityId}, which has no domain def.`);
    const namedPorts = strings(data.ports);
    for (const portId of namedPorts) {
      if (!ports.has(portId)) gap(findings, gaps, usecaseId, `Usecase ${usecaseId} names port ${portId}, which has no port def.`);
    }
    const requiredPort = storage.get(entityId) === 'moduleDatabase' ? portByEntity.get(entityId) || '' : '';
    if (requiredPort && !namedPorts.includes(requiredPort)) {
      gap(findings, gaps, usecaseId, `Usecase ${usecaseId} does not name port ${requiredPort}.`);
    }
    const onDisk = domainRules.get(entityId) || new Set<string>();
    const onDraft = draftedRules.get(entityId) || new Set<string>();
    for (const ruleId of strings(data.rulesApplied)) {
      if (onDisk.has(ruleId) || onDraft.has(ruleId)) continue;
      gap(findings, gaps, usecaseId, `Usecase ${usecaseId} cites rule ${ruleId}, which is not on ${entityId}.`);
    }
    const effects = Array.isArray(data.effects) ? data.effects : [];
    for (const effect of effects) {
      if (!isRecord(effect) || typeof effect.eventId !== 'string') continue;
      if (outbound.has(effect.eventId)) continue;
      gap(findings, gaps, usecaseId, `Usecase ${usecaseId} cites event ${effect.eventId}, which is not selected.`);
    }
  }
  const adapters = parsed.filter(item => item.definition.artifactType === 'repositoryAdapter');
  const registered = new Set(registryIds(parsed));
  for (const table of parsed.filter(item => item.definition.artifactType === 'table')) {
    const tableId = isRecord(table.definition.data) && typeof table.definition.data.tableId === 'string'
      ? table.definition.data.tableId
      : table.definition.artifactId;
    if (adapters.some(adapter => isRecord(adapter.definition.data) && adapter.definition.data.tableId === tableId)) continue;
    gap(findings, gaps, tableId, `Table ${tableId} has no adapter.`);
  }
  for (const adapter of adapters) {
    if (registered.has(adapter.definition.artifactId)) continue;
    gap(findings, gaps, adapter.definition.artifactId, `Adapter ${adapter.definition.artifactId} is not in the registry.`);
  }
}

function checkContract(request: D1FinalizeRequest, pageId: string, route: string, findings: D1FinalizeFinding[]): void {
  if (!pageId) return;
  const path = contractPath(request.moduleName, pageId);
  const contract = request.contracts[pageId];
  const digest = request.snapshot?.sources.find(source => source.path === path);
  if (!contract || contract.text == null) {
    error(findings, 'CONTRACT_ABSENT', path, `L2 contract for ${pageId} is absent.`, pageId);
    return;
  }
  if (digest && digest.sha256 && contract.hash && digest.sha256 !== contract.hash) {
    error(findings, 'CONTRACT_DIVERGENT', path, `L2 contract for ${pageId} does not match the snapshot.`, pageId);
  }
  if (!contract.text.includes(route)) {
    error(findings, 'CONTRACT_DIVERGENT', path, `L2 contract for ${pageId} does not declare route ${route}.`, route);
  }
}

function enumsOf(draft: unknown): { consumed: D1FinalizeEnum[]; notConsumed: D1FinalizeEnum[] } {
  const consumed: D1FinalizeEnum[] = [];
  const notConsumed: D1FinalizeEnum[] = [];
  if (!isRecord(draft) || !Array.isArray(draft.enumerations)) return { consumed, notConsumed };
  for (const item of draft.enumerations) {
    if (!isRecord(item) || typeof item.entityId !== 'string' || typeof item.path !== 'string') continue;
    const row: D1FinalizeEnum = {
      entityId: item.entityId,
      path: item.path,
      values: strings(item.values),
      consumed: item.consumed === true,
    };
    if (row.consumed) consumed.push(row);
    else notConsumed.push(row);
  }
  return { consumed, notConsumed };
}

function noteEnumerations(
  enumerations: { consumed: D1FinalizeEnum[]; notConsumed: D1FinalizeEnum[] },
  findings: D1FinalizeFinding[],
): void {
  if (enumerations.consumed.length) {
    const names = enumerations.consumed.map(item => `${item.entityId} ${item.path}`).join(', ');
    review(findings, 'ENUMERATIONS_CONSUMED', 'domain30.enumerations', `Consumed by the seed plan: ${names}. Values were not copied into rows.`, names);
  }
  if (enumerations.notConsumed.length) {
    const names = enumerations.notConsumed.map(item => `${item.entityId} ${item.path}`).join(', ');
    review(findings, 'ENUMERATIONS_NOT_CONSUMED', 'domain30.enumerations', `No consumer: ${names}.`, names);
  }
}

function declaredNotConsumed(request: D1FinalizeRequest): string[] {
  const steps: Array<[D1StepId, unknown]> = [
    ['persistence40', request.drafts.persistence40],
    ['usecases50', request.drafts.usecases50],
    ['controllers60', request.drafts.controllers60],
    ['support70', request.drafts.support70],
  ];
  return steps
    .filter(([stepId, draft]) => request.pipeline.steps[stepId]?.status === 'approved' && hasNormalization(draft, 'ENUMERATIONS_NOT_CONSUMED'))
    .map(([stepId]) => stepId);
}

function pendingOutputs(parsed: ParsedDef[], request: D1FinalizeRequest): D1FinalizePending[] {
  const rows: D1FinalizePending[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    for (const pipelineItem of item.pipeline) {
      if (!pipelineItem.outputPath || seen.has(pipelineItem.outputPath)) continue;
      seen.add(pipelineItem.outputPath);
      const present = request.futurePresent[pipelineItem.outputPath] === true;
      if (pipelineItem.outputAvailability === 'present' && !present) {
        continue;
      }
      rows.push({ defPath: logicalDefPath(pipelineItem.defPath), outputPath: pipelineItem.outputPath, present });
    }
  }
  return rows;
}

function inventoryOf(parsed: ParsedDef[]): D1FinalizeInventory {
  const usecaseIds: string[] = [];
  const routes: string[] = [];
  const portIds: string[] = [];
  const tableIds: string[] = [];
  for (const item of parsed) {
    const data = isRecord(item.definition.data) ? item.definition.data : {};
    if (item.definition.artifactType === 'usecase') {
      usecaseIds.push(typeof data.usecaseId === 'string' && data.usecaseId ? data.usecaseId : item.definition.artifactId);
    } else if (item.definition.artifactType === 'repositoryPort') {
      portIds.push(item.definition.artifactId);
    } else if (item.definition.artifactType === 'table') {
      tableIds.push(typeof data.tableId === 'string' && data.tableId ? data.tableId : item.definition.artifactId);
    } else if (item.definition.artifactType === 'httpController' && Array.isArray(data.handlers)) {
      for (const handler of data.handlers) {
        if (isRecord(handler) && typeof handler.route === 'string' && handler.route) routes.push(handler.route);
      }
    }
  }
  return {
    usecaseIds: unique(usecaseIds),
    routes: unique(routes),
    portIds: unique(portIds),
    tableIds: unique(tableIds),
  };
}

function sourceRows(request: D1FinalizeRequest): D1FinalizeReport['sources'] {
  const sources = request.snapshot?.sources || [];
  return [...sources]
    .map(source => ({ path: source.path, sha256: source.sha256, state: source.state }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function inventoriedPaths(request: D1FinalizeRequest): Set<string> {
  const known = new Set<string>();
  for (const file of request.snapshot?.files || []) known.add(logicalDefPath(file.defPath));
  for (const removed of request.snapshot?.removed || []) {
    if (removed.defPath) known.add(logicalDefPath(removed.defPath));
  }
  return known;
}

function handlerRows(parsed: ParsedDef[]): Array<{ route: string; usecaseId: string }> {
  const rows: Array<{ route: string; usecaseId: string }> = [];
  for (const item of parsed) {
    if (item.definition.artifactType !== 'httpController' || !isRecord(item.definition.data)) continue;
    const handlers = Array.isArray(item.definition.data.handlers) ? item.definition.data.handlers : [];
    for (const handler of handlers) {
      if (!isRecord(handler) || typeof handler.route !== 'string' || typeof handler.usecaseId !== 'string') continue;
      rows.push({ route: handler.route, usecaseId: handler.usecaseId });
    }
  }
  return rows;
}

function idsOfUsecase(definition: D1Definition): string[] {
  const data = isRecord(definition.data) ? definition.data : {};
  const usecaseId = typeof data.usecaseId === 'string' ? data.usecaseId : '';
  return [definition.artifactId, usecaseId].filter(Boolean);
}

function storageOf(parsed: ParsedDef[]): Map<string, string> {
  const storage = new Map<string, string>();
  for (const item of parsed) {
    if (item.definition.artifactType !== 'domainEntity' || !isRecord(item.definition.data)) continue;
    const target = item.definition.data.storageTarget;
    if (typeof target === 'string') storage.set(item.definition.artifactId, target);
  }
  return storage;
}

function registryIds(parsed: ParsedDef[]): string[] {
  const ids: string[] = [];
  for (const item of parsed) {
    if (item.definition.artifactType !== 'repositoryRegistration' || !isRecord(item.definition.data)) continue;
    const adapters = Array.isArray(item.definition.data.adapters) ? item.definition.data.adapters : [];
    for (const adapter of adapters) {
      if (isRecord(adapter) && typeof adapter.adapterArtifactId === 'string') ids.push(adapter.adapterArtifactId);
    }
  }
  return ids;
}

function draftRules(request: D1FinalizeRequest): Map<string, Set<string>> {
  const rules = new Map<string, Set<string>>();
  const draft = request.drafts.domain30;
  if (!isRecord(draft) || !Array.isArray(draft.entities)) return rules;
  for (const entity of draft.entities) {
    if (!isRecord(entity) || typeof entity.entityId !== 'string') continue;
    const ids = rulesOf(isRecord(entity.definition) ? (entity.definition as { data?: unknown }).data : null);
    if (Array.isArray(entity.rules)) {
      for (const rule of entity.rules) {
        if (isRecord(rule) && typeof rule.ruleId === 'string') ids.add(rule.ruleId);
      }
    }
    rules.set(entity.entityId, ids);
  }
  return rules;
}

function rulesOf(data: unknown): Set<string> {
  const rules = new Set<string>();
  if (!isRecord(data)) return rules;
  for (const rule of strings(data.invariants)) rules.add(rule);
  const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : null;
  const transitions = lifecycle && Array.isArray(lifecycle.transitions) ? lifecycle.transitions : [];
  for (const transition of transitions) {
    if (!isRecord(transition)) continue;
    for (const rule of strings(transition.ruleRefs)) rules.add(rule);
  }
  return rules;
}

function eventIds(data: unknown): string[] {
  if (!isRecord(data) || !Array.isArray(data.events)) return [];
  return data.events.flatMap(event => (isRecord(event) && typeof event.eventId === 'string' ? [event.eventId] : []));
}

function hasNormalization(draft: unknown, code: string): boolean {
  if (!isRecord(draft) || !Array.isArray(draft.normalizations)) return false;
  return draft.normalizations.some(item => isRecord(item) && item.code === code);
}

function gap(findings: D1FinalizeFinding[], gaps: string[], path: string, message: string): void {
  gaps.push(message);
  error(findings, 'COVERAGE_GAP', path, message, path);
}

function blockingOf(findings: readonly D1FinalizeFinding[]): string {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    if (finding.severity !== 'error' || !finding.code) continue;
    counts.set(finding.code, (counts.get(finding.code) || 0) + 1);
  }
  return [...counts.keys()].sort().map(code => `${code}:${counts.get(code)}`).join(',');
}

function pushFinding(
  findings: D1FinalizeFinding[],
  severity: 'error' | 'review',
  code: string,
  path: string,
  message: string,
  ownerRef: string,
): void {
  const owner = ownerRef || path;
  if (findings.some(item => item.code === code && item.ownerRef === owner && item.path === path)) return;
  findings.push({ severity, code, path, message, ownerRef: owner });
}

function error(findings: D1FinalizeFinding[], code: string, path: string, message: string, ownerRef: string): void {
  pushFinding(findings, 'error', code, path, message, ownerRef);
}

function review(findings: D1FinalizeFinding[], code: string, path: string, message: string, ownerRef: string): void {
  pushFinding(findings, 'review', code, path, message, ownerRef);
}

function isDefinition(value: unknown): value is D1Definition {
  return isRecord(value)
    && value.schemaVersion === D1_DEFINITION_SCHEMA
    && typeof value.artifactType === 'string'
    && isArtifactType(value.artifactType)
    && typeof value.artifactId === 'string'
    && typeof value.moduleName === 'string'
    && isRecord(value.data);
}

function isPipelineItem(value: unknown): value is D1PipelineItem {
  return isRecord(value) && typeof value.id === 'string' && typeof value.type === 'string' && isArtifactType(value.type);
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && !!item);
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function qualify(project: number, logical: string): string {
  return logical.startsWith('_') ? logical : `_${project}_/${logical}`;
}

function enumKey(item: D1FinalizeEnum): string {
  return `${item.entityId}\u0000${item.path}`;
}

function sorted<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((left, right) => key(left).localeCompare(key(right)));
}
