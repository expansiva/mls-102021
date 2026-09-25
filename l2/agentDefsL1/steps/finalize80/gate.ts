/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/gate.ts" enhancement="_blank"/>

import {
  D1_FLOW_STEP_IDS,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  D1_DEFINITION_SCHEMA,
  definitionIssues,
  integrationMechanismIssues,
  isArtifactType,
  isRecord,
  reconstructAccessPolicy,
  type D1Definition,
  type D1PolicyUnit,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { logicalDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import {
  DEPENDS_ALLOWED,
  futureOutputPath,
  graphIssues,
  pipelineId,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { declaredDependencyPaths, readDefinitionExport } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { contractPath } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { accountCalls } from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';
import { readUsecaseFidelity, type FidelityFile } from '/_102021_/l2/agentDefsL1/steps/usecases50/fidelity.js';
import { projectEnumerations } from '/_102021_/l2/agentDefsL1/steps/support70/enumerations.js';
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
  const enumerations = chainApproved ? enumsOf(request) : { consumed: [], notConsumed: [] };
  const declaredNotConsumedBy = chainApproved ? declaredNotConsumed(request) : [];
  if (chainApproved) {
    noteEnumerations(enumerations, findings);
    checkHashes(request, parsed, findings);
    checkChildren(request, findings);
    checkExtra(request, parsed, findings);
    checkSchemaAndGraph(request, parsed, findings);
    checkAccessPolicy(parsed, findings);
    checkUsecaseFidelity(request, parsed, findings);
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
    calls: accountCalls(request.callLog),
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
    const read = readDefinitionExport(observed.text);
    const raw = read?.definition;
    if (!raw || !isRecord(raw) || !isRecord(raw.data) || typeof raw.artifactType !== 'string') {
      if (inventoried.has(logical)) {
        error(findings, 'SCHEMA_INVALID', logical, `Inventoried file ${logical} is not a definition.`, logical);
      }
      continue;
    }
    if (!Array.isArray(raw.dependencies)) raw.dependencies = declaredDependencyPaths(observed.text);
    if (read.pipelineExport && inventoried.has(logical)) {
      error(findings, 'SCHEMA_INVALID', logical, `Inventoried file ${logical} exports pipeline. v2 has no pipeline.`, logical);
    }
    if (!isArtifactType(raw.artifactType)) {
      if (inventoried.has(logical)) {
        error(findings, 'SCHEMA_INVALID', logical, `Inventoried file ${logical} is not a v2 definition.`, logical);
      }
      continue;
    }
    if (!isDefinition(raw) && inventoried.has(logical)) {
      error(findings, 'SCHEMA_INVALID', logical, `Inventoried file ${logical} is not a v2 definition.`, logical);
    }
    parsed.push({
      logical,
      definition: raw as unknown as D1Definition,
      pipeline: [],
      currentHash: observed.currentHash,
      receiptHash: observed.receiptHash,
      text: observed.text,
    });
  }
  const synthesized = itemsFromDefinitions(request.project, request.moduleName, parsed);
  for (const item of parsed) {
    item.pipeline = synthesized.filter(entry => logicalDefPath(entry.defPath) === item.logical);
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
  const present = new Set(parsed.map(item => qualify(request.project, item.logical)));
  for (const item of parsed) {
    for (const issue of definitionIssues(item.definition)) {
      error(findings, 'SCHEMA_INVALID', item.logical, issue, item.definition.artifactId);
    }
  }
  const items = parsed.flatMap(item => item.pipeline);
  const sources = new Set((request.snapshot?.sources || []).map(source => source.path));
  for (const pipelineItem of items) {
    for (const dep of pipelineItem.dependsFiles || []) {
      if (knownDependency(dep, items, present, sources, request.dependencyTexts, request.project)) continue;
      error(findings, 'REF_INVALID', dep, `Dependency ${dep} is not a current def, a named future output, or an opened read source.`, pipelineItem.id);
    }
  }
  for (const issue of graphIssues(items)) {
    // A record ref between domain defs is the edge domain30 writes. It is not an orphan.
    if (/^domainEntity .+ must not depend on (domainEntity|valueObject)\.$/.test(issue)) continue;
    error(findings, 'REF_INVALID', 'pipeline', issue, '');
  }
}

/**
 * A dependency is either an artifact this pipeline generates or a read source.
 * Generated: a current def, or a named future output (the `.ts` this run will write).
 * Read: a declared file this run does not generate. It counts only when its text
 * was opened. The project embedded in the path is part of the identity.
 */
function knownDependency(
  dep: string,
  items: D1PipelineItem[],
  present: Set<string>,
  sources: Set<string>,
  dependencyTexts: Record<string, string>,
  project: number,
): boolean {
  if (isGeneratedArtifact(dep, items, present)) return true;
  if (sources.has(dep) || [...sources].some(source => canonPath(source) === canonPath(dep))) return true;
  const named = embeddedProject(dep);
  const logical = unqualified(dep);
  // A path that names another project is not this module's snapshot source.
  if ((!named || named === String(project)) && sources.has(logical)) return true;
  return openedRead(dep, dependencyTexts, project);
}

function isGeneratedArtifact(dep: string, items: D1PipelineItem[], present: Set<string>): boolean {
  if (items.some(item => item.defPath === dep || item.outputPath === dep)) return true;
  if (present.has(dep) || present.has(logicalDefPath(dep))) return true;
  if (dep.endsWith('.d.ts')) {
    const ts = dep.replace(/\.d\.ts$/, '.ts');
    if (items.some(item => item.outputPath === ts)) return true;
  }
  const future = futureOutputPath(dep);
  return !!future && items.some(item => item.outputPath === future);
}

function canonPath(path: string): string {
  return path.replace(/^\/+/, '');
}

function openedRead(dep: string, texts: Record<string, string>, project: number): boolean {
  if (typeof texts[dep] === 'string' || typeof texts[canonPath(dep)] === 'string' || typeof texts[`/${canonPath(dep)}`] === 'string') return true;
  const named = embeddedProject(dep);
  const tail = unqualified(dep);
  if ((!named || named === String(project)) && typeof texts[tail] === 'string') return true;
  if (!named) return false;
  return Object.entries(texts).some(([path, text]) =>
    typeof text === 'string' && embeddedProject(path) === named && unqualified(path) === tail);
}

function embeddedProject(path: string): string {
  const match = /^\/?_(\d+)_\/+/.exec(path);
  return match ? match[1] : '';
}

function unqualified(path: string): string {
  return path.replace(/^\/?_\d+_\/+/, '');
}

function itemsFromDefinitions(project: number, moduleName: string, parsed: readonly ParsedDef[]): D1PipelineItem[] {
  const items: D1PipelineItem[] = parsed.map(item => {
    const defPath = qualify(project, item.logical);
    const routes = routesOf(item.definition);
    return {
      id: pipelineId(project, moduleName, item.definition.artifactType, item.definition.artifactId),
      type: item.definition.artifactType,
      defPath,
      outputPath: futureOutputPath(defPath),
      outputAvailability: 'future',
      dependsFiles: [...item.definition.dependencies],
      dependsOn: [],
      skills: skillPaths(item.definition.artifactType),
      ...(item.definition.artifactType === 'httpController' ? { routes } : {}),
    };
  });
  for (const item of items) {
    item.dependsOn = item.dependsFiles.flatMap(file => {
      const found = items.find(other => other.defPath === file || logicalDefPath(other.defPath) === logicalDefPath(file));
      if (!found || found.id === item.id) return [];
      const allowed = allowedDependency(item.type, found.type);
      if (!allowed) return [];
      return [found.id];
    });
  }
  return items;
}

function allowedDependency(from: string, to: string): boolean {
  if (to === 'repositoryAdapter' || to === 'repositoryRegistration') return true;
  if (!isArtifactType(from) || !isArtifactType(to)) return false;
  return DEPENDS_ALLOWED[from].includes(to);
}

function routesOf(definition: D1Definition): string[] {
  const handlers = definition.data.handlers;
  if (!Array.isArray(handlers)) return [];
  return handlers.flatMap(handler => isRecord(handler) && typeof handler.route === 'string' && handler.route ? [handler.route] : []);
}

function checkAccessPolicy(parsed: ParsedDef[], findings: D1FinalizeFinding[]): void {
  const units: D1PolicyUnit[] = parsed.map(item => ({
    defPath: item.logical,
    artifactType: item.definition.artifactType,
    data: item.definition.data,
    dependencies: [...item.definition.dependencies],
  }));
  for (const issue of reconstructAccessPolicy(units).issues) {
    error(findings, issue.code, issue.path, issue.message, issue.ownerRef);
  }
}

function checkUsecaseFidelity(request: D1FinalizeRequest, parsed: ParsedDef[], findings: D1FinalizeFinding[]): void {
  const files = fidelityFiles(request, parsed);
  for (const item of parsed) {
    if (item.definition.artifactType !== 'usecase' || !item.text) continue;
    const fidelity = readUsecaseFidelity(item.text, files);
    for (const problem of fidelity.problems) {
      const usecaseId = isRecord(item.definition.data) && typeof item.definition.data.usecaseId === 'string'
        ? item.definition.data.usecaseId
        : item.definition.artifactId;
      if (problem.code === 'MECHANISM_INCOMPATIBLE' || problem.code === 'INTEGRATION_UNBOUND') {
        review(findings, problem.code, item.logical, problem.message, usecaseId);
      } else {
        error(findings, problem.code, item.logical, problem.message, usecaseId);
      }
    }
  }
}

function fidelityFiles(request: D1FinalizeRequest, parsed: ParsedDef[]): FidelityFile[] {
  const files: FidelityFile[] = [];
  const add = (path: string, text: string | null | undefined) => {
    if (!path || !text || files.some(item => item.path === path)) return;
    files.push({ path, text });
  };
  for (const [path, text] of Object.entries(request.dependencyTexts)) add(path, text);
  for (const contract of Object.values(request.contracts)) add(contract.path, contract.text);
  for (const item of parsed) add(item.logical, item.text);
  return files;
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
  if (!integration) return;
  for (const issue of integrationMechanismIssues(integration.definition.data)) {
    const match = /^(INTEGRATION_UNBOUND|FICTIONAL_API|MECHANISM_REF|MECHANISM_INCOMPATIBLE): (\S+)/.exec(issue);
    if (!match) continue;
    const code = match[1];
    const eventId = match[2];
    const message = issue.slice(issue.indexOf(': ') + 2);
    if (code === 'INTEGRATION_UNBOUND' && findings.some(item => item.code === code && item.ownerRef === eventId)) continue;
    if (code === 'INTEGRATION_UNBOUND' || code === 'MECHANISM_INCOMPATIBLE') {
      review(findings, code, eventId, message, eventId);
    } else {
      error(findings, code, eventId, message, eventId);
    }
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

function enumsOf(request: D1FinalizeRequest): { consumed: D1FinalizeEnum[]; notConsumed: D1FinalizeEnum[] } {
  const consumed: D1FinalizeEnum[] = [];
  const notConsumed: D1FinalizeEnum[] = [];
  const rows = projectEnumerations({
    enumerations: draftEnums(request.drafts.support70),
    snapshot: {
      sources: request.dependencyTexts,
      definitions: request.observed.flatMap(item => item.text ? [item.text] : []),
      contracts: Object.values(request.contracts).map(item => ({ path: item.path, text: item.text || '' })),
      tables: (request.snapshot?.selection.tables || []).map(table => ({ tableId: table.tableId, entityId: table.entity })),
    },
  });
  for (const row of rows) {
    const reportRow: D1FinalizeEnum = {
      entityId: row.entityId,
      path: row.path,
      values: row.values,
      consumed: row.consumed,
      origin: row.origin,
      uses: row.uses,
      limits: row.limits,
    };
    if (reportRow.consumed) consumed.push(reportRow);
    else notConsumed.push(reportRow);
  }
  return { consumed, notConsumed };
}

function draftEnums(draft: unknown): Array<{ entityId: string; path: string; values: string[] }> {
  if (!isRecord(draft) || !Array.isArray(draft.enumerations)) return [];
  const out: Array<{ entityId: string; path: string; values: string[] }> = [];
  for (const item of draft.enumerations) {
    if (!isRecord(item) || typeof item.entityId !== 'string' || typeof item.path !== 'string') continue;
    out.push({ entityId: item.entityId, path: item.path, values: strings(item.values) });
  }
  return out;
}

function noteEnumerations(
  enumerations: { consumed: D1FinalizeEnum[]; notConsumed: D1FinalizeEnum[] },
  findings: D1FinalizeFinding[],
): void {
  for (const row of [...enumerations.consumed, ...enumerations.notConsumed]) {
    const name = `${row.entityId} ${row.path}`;
    if (row.origin.restriction === 'invalid') {
      review(findings, 'ENUMERATION_SUBSET_INVALID', row.path, `Enum ${name} has a value outside its catalog. It was not treated as an inherited platform set.`, name);
    } else if (row.origin.restriction === 'unresolved' && row.origin.catalogSource) {
      review(findings, 'ENUMERATION_SOURCE_ABSENT', row.origin.catalogSource, `Enum ${name} names catalog ${row.origin.catalogSource}, and that snapshot was not opened. It was not treated as platform.`, name);
    } else if (row.origin.restriction === 'subset') {
      review(findings, 'ENUMERATION_RESTRICTION', row.path, `Enum ${name} narrows its catalog to ${row.values.join('|')}. Owner ${row.origin.owner} does not remove this restriction.`, name);
    }
    if (row.origin.owner === 'platform' && !row.uses.some(use => use.purpose === 'seedScenario')) {
      review(findings, 'ENUMERATION_PLATFORM_UNSEEDED', row.path, `Platform catalog ${name} has no local seed. No row and no catalog copy were written.`, name);
    }
    if (row.origin.roleBinding) {
      review(findings, 'ENUMERATION_ROLE_BINDING', row.path, `Enum ${name} is the role subtype binding, not an editable input.`, name);
    } else if (row.origin.derived) {
      review(findings, 'ENUMERATION_DERIVED', row.path, `Enum ${name} is derived. It is not an editable input. A type union is not runtime enforcement.`, name);
    }
    if (!row.uses.length) {
      review(findings, 'ENUMERATIONS_NOT_CONSUMED', row.path, `No consumer: ${name}. ${row.limits}`, name);
      continue;
    }
    const seeded = new Set(row.uses.filter(use => use.purpose === 'seedScenario').flatMap(use => use.values));
    const fullySeeded = row.values.length > 0 && row.values.every(value => seeded.has(value));
    if (fullySeeded) {
      review(findings, 'ENUMERATIONS_CONSUMED', row.path, `Consumed by the seed plan: ${name}. Values were not copied into rows.`, name);
    } else {
      const consumers = row.uses.map(use => `${use.purpose} ${use.consumer}`).join(', ');
      review(findings, 'ENUMERATIONS_CONSUMED', row.path, `Covered use of ${name}: ${consumers}. A type union is not runtime enforcement.`, name);
    }
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
    && typeof value.status === 'string'
    && Array.isArray(value.dependencies)
    && isRecord(value.data);
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
