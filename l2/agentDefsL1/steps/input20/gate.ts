/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/gate.ts" enhancement="_blank"/>

import { taskEffects } from '/_102021_/l2/helpers/l1Defs/taskEffects.js';
import { declarationDefPath } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import {
  D1_ACTIVE_STATUSES,
  D1_EFFORT_BACKEND_REF,
  D1_INPUT_VERSION,
  D1_P1_OPERATIONS,
  D1_PLANNER_FLOW,
  D1_SOURCE_SCHEMAS,
  D1_TEST_SUPPORT_OWNERS,
  D1_TEST_SUPPORT_STATUSES,
  contractPath,
  entityPath,
  inputPaths,
  isSafeToken,
  journeyPath,
  lowerFirst,
  type D1ActiveStatus,
  type D1FileAction,
  type D1InputArtifacts,
  type D1InputProblem,
  type D1InputSnapshot,
  type D1PlannedFile,
  type D1RemovedItem,
  type D1RequestGapAnswer,
  type D1SelectedPort,
  type D1SelectedRequest,
  type D1SelectedTable,
  type D1SelectedUsecase,
  type D1SourceDigest,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { requestServiceDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { applyResolutions } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';
import { consumeLinesOf, deriveConsumeRequests } from '/_102021_/l2/agentDefsL1/steps/input20/deriveConsume.js';
import { deriveProcessUsecases } from '/_102021_/l2/agentDefsL1/steps/input20/deriveProcess.js';
import { deriveServeRequests, processTriggerServes, takeUsecase, type D1ServeLine } from '/_102021_/l2/agentDefsL1/steps/input20/deriveServe.js';
import { callInputGaps, callInputsOf } from '/_102021_/l2/agentDefsL1/steps/input20/callInputs.js';
import { callNamesEntity, externalCallsOf, externalUsecaseForCall, routeCallsOf, routeWriteCalls, splitExternalUsecases } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';
import { parseD2WriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';
import type {
  PoolBackendEndpoint,
  PoolBackendFile,
  PoolBackendPort,
  PoolBackendTable,
  PoolBackendUsecase,
  PoolEffortEndpoint,
  PoolEffortFile,
  PoolEffortScreen,
  PoolEffortTable,
  PoolEffortUsecase,
  PoolNeedsFile,
  PoolNeedsPage,
  PoolRaw,
} from '/_102035_/l2/solution/poolPlan.js';
import { L1_OPERATIONS, collidingTransitionIds, type L1Operation, type L1TransitionWrite } from '/_102021_/l2/helpers/l1Defs/operations.js';

const BACKEND_PATH_TAIL = 'pool/l2/web/backend.json';

/**
 * The inventory. `answers` are the resolve25 answers per route (d1_62): without them the requests keep the gaps of
 * the derivation (the input20 view); with them the same derivation gives the final selection (the resolve25 view).
 */
export function buildD1InputSnapshot(
  identity: { project: number; moduleName: string },
  artifacts: D1InputArtifacts,
  previous: D1InputSnapshot | null,
  answers: ReadonlyMap<string, readonly D1RequestGapAnswer[]> = new Map(),
): D1InputSnapshot {
  const moduleName = identity.moduleName;
  const paths = inputPaths(moduleName);
  const problems: D1InputProblem[] = [];
  const sources = [...artifacts.sources].sort((left, right) => left.path.localeCompare(right.path));

  const moduleDoc = rec(artifacts.module);
  const journeyIndex = rec(artifacts.journeyIndex);
  const ontologyIndex = rec(artifacts.ontologyIndex);
  const rules = rec(artifacts.rules);
  const workflows = rec(artifacts.workflows);
  const access = rec(artifacts.access);
  const integration = rec(artifacts.integration);
  const menu = rec(artifacts.menu);
  const needs = rec(artifacts.needs) as PoolRaw<PoolNeedsFile>;
  const backend = rec(artifacts.backend) as PoolRaw<PoolBackendFile>;
  const effort = rec(artifacts.effort) as PoolRaw<PoolEffortFile>;
  const planner = rec(artifacts.planner);

  checkSource(problems, sources, paths.module, moduleDoc, D1_SOURCE_SCHEMAS.module, moduleName);
  checkSource(problems, sources, paths.journeyIndex, journeyIndex, D1_SOURCE_SCHEMAS.journey, moduleName);
  checkSource(problems, sources, paths.ontologyIndex, ontologyIndex, D1_SOURCE_SCHEMAS.ontology, moduleName);
  checkSource(problems, sources, paths.rules, rules, D1_SOURCE_SCHEMAS.rules, moduleName);
  checkSource(problems, sources, paths.workflows, workflows, D1_SOURCE_SCHEMAS.workflows, moduleName);
  checkSource(problems, sources, paths.access, access, D1_SOURCE_SCHEMAS.access, moduleName);
  checkSource(problems, sources, paths.integration, integration, D1_SOURCE_SCHEMAS.integration, moduleName);
  checkSource(problems, sources, paths.menu, menu, D1_SOURCE_SCHEMAS.menu, moduleName);
  checkSource(problems, sources, paths.needs, needs, D1_SOURCE_SCHEMAS.needs, moduleName);
  checkSource(problems, sources, paths.backend, backend, D1_SOURCE_SCHEMAS.backend, moduleName);
  checkSource(problems, sources, paths.effort, effort, D1_SOURCE_SCHEMAS.effort, moduleName);
  checkSource(problems, sources, paths.planner, planner, D1_SOURCE_SCHEMAS.planner, moduleName);

  for (const [file, value] of [
    [paths.menu, menu],
    [paths.needs, needs],
    [paths.backend, backend],
    [paths.effort, effort],
  ] as const) {
    if (text(value.device) && text(value.device) !== 'web') {
      error(problems, 'DEVICE_DIVERGENT', file, `device must be web, got '${text(value.device)}'.`);
    }
  }
  if (text(needs.menuSchema) && text(needs.menuSchema) !== D1_SOURCE_SCHEMAS.menu) {
    error(problems, 'SCHEMA_DIVERGENT', paths.needs, `menuSchema must be ${D1_SOURCE_SCHEMAS.menu}.`);
  }
  if (text(effort.meta && rec(effort.meta).sourceBackend) && text(rec(effort.meta).sourceBackend) !== D1_EFFORT_BACKEND_REF) {
    error(problems, 'DIVERGENT_SOURCE', paths.effort, `meta.sourceBackend must be ${D1_EFFORT_BACKEND_REF}.`);
  }

  const plannerRun = readPlannerRun(problems, planner, paths, moduleName, sources.some(source => source.path === paths.backend && !!source.sha256));
  const journeyIds = idList(journeyIndex.journeys, 'journeyId');
  const entityRows = rows(ontologyIndex.entities);
  const entityIds = idList(entityRows, 'entityId');
  const entityKind = new Map(entityRows.map(row => [text(row.entityId), text(row.kind)]));
  const relationships = rows(ontologyIndex.relationships);

  for (const journeyId of journeyIds) {
    if (!isSafeToken(journeyId)) {
      error(problems, 'UNSAFE_ID', paths.journeyIndex, `Unsafe journey id '${journeyId}'.`, journeyId);
      continue;
    }
    const file = journeyPath(moduleName, journeyId);
    checkSource(problems, sources, file, artifacts.journeys[journeyId], D1_SOURCE_SCHEMAS.journey, moduleName);
  }
  for (const entityId of entityIds) {
    if (!isSafeToken(entityId)) {
      error(problems, 'UNSAFE_ID', paths.ontologyIndex, `Unsafe entity id '${entityId}'.`, entityId);
      continue;
    }
    const file = entityPath(moduleName, entityId);
    checkSource(problems, sources, file, artifacts.entities[entityId], D1_SOURCE_SCHEMAS.ontology, moduleName);
  }

  const menuPages = menuPageIds(menu);
  const needPages = indexBy(rows(needs.pages) as PoolRaw<PoolNeedsPage>[], 'pageId');
  const effortScreens = indexBy(rows(effort.screens) as PoolRaw<PoolEffortScreen>[], 'pageId');
  const backendEndpoints = rows(backend.endpoints) as PoolRaw<PoolBackendEndpoint>[];
  const effortEndpoints = rows(effort.endpoints) as PoolRaw<PoolEffortEndpoint>[];
  const backendUsecases = indexBy(rows(backend.usecases) as PoolRaw<PoolBackendUsecase>[], 'usecaseId');
  const effortUsecases = indexBy(rows(effort.usecases) as PoolRaw<PoolEffortUsecase>[], 'usecaseId');
  const backendTables = indexBy(rows(backend.tables) as PoolRaw<PoolBackendTable>[], 'tableId');
  const effortTables = indexBy(rows(effort.tables) as PoolRaw<PoolEffortTable>[], 'tableId');
  const backendPorts = rows(backend.ports) as PoolRaw<PoolBackendPort>[];

  checkTestSupport(problems, paths, backend, effort, new Set(rows(needs.pages).flatMap(page => strings(page.actors))), new Set(entityIds));
  comparePageSets(problems, paths, menuPages, new Set(needPages.keys()), new Set(effortScreens.keys()));
  checkTotals(problems, paths.effort, effort);
  rejectLiveRemoval(problems, paths.backend, backendEndpoints, 'route');
  rejectLiveRemoval(problems, paths.effort, effortEndpoints, 'route');
  rejectLiveRemoval(problems, paths.backend, [...backendUsecases.values()], 'usecaseId');
  rejectLiveRemoval(problems, paths.effort, [...effortUsecases.values()], 'usecaseId');
  rejectLiveRemoval(problems, paths.backend, [...backendTables.values()], 'tableId');
  rejectLiveRemoval(problems, paths.effort, [...effortTables.values()], 'tableId');
  rejectLiveRemoval(problems, paths.backend, backendPorts, 'portId');
  for (const screen of effortScreens.values()) {
    if (text(screen.status) === 'toRemove') {
      error(problems, 'STATUS_NOT_IN_REMOVED', paths.effort, `Screen ${text(screen.pageId)} is toRemove outside removed.`, text(screen.pageId));
    }
  }

  const selectedUsecases: D1SelectedUsecase[] = [];
  const usecaseIds = new Set([...backendUsecases.keys(), ...effortUsecases.keys()]);
  for (const usecaseId of [...usecaseIds].sort()) {
    const left = backendUsecases.get(usecaseId);
    const right = effortUsecases.get(usecaseId);
    if (!left || !right) {
      error(problems, 'DIVERGENT_SOURCE', !left ? paths.backend : paths.effort, `Usecase ${usecaseId} is not in both plans.`, usecaseId);
      continue;
    }
    const fields: Array<[string, string, string]> = [
      ['status', text(left.status), text(right.status)],
      ['entity', text(left.entity), text(right.entity)],
      ['operation', text(left.operation), text(right.operation)],
      ['existing', text(left.existing), text(right.existing)],
    ];
    const mismatch = fields.find(([, a, b]) => a !== b);
    if (mismatch) {
      error(problems, 'DIVERGENT_SOURCE', paths.backend, `Usecase ${usecaseId} ${mismatch[0]} is '${mismatch[1]}' in backend and '${mismatch[2]}' in effort.`, usecaseId);
      continue;
    }
    const operation = text(left.operation);
    const transitionRef = text(left.transitionRef);
    if (operation === 'transition' && !transitionRef) {
      error(problems, 'TRANSITION_REF_MISSING', paths.backend, `Transition usecase ${usecaseId} has no transitionRef. The L4 transitionId is required; the usecaseId is not the transition.`, usecaseId);
      continue;
    }
    if (operation !== 'transition' && transitionRef) {
      error(problems, 'DIVERGENT_SOURCE', paths.backend, `Usecase ${usecaseId} is ${operation} and must not carry transitionRef.`, usecaseId);
      continue;
    }
    if (!isActive(text(left.status))) continue;
    const existing = text(left.existing);
    const identityId = resolveIdentity(problems, paths.backend, usecaseId, existing, moduleName);
    selectedUsecases.push({
      usecaseId,
      entity: text(left.entity),
      operation,
      ...(operation === 'transition' ? { transitionRef } : {}),
      status: text(left.status) as D1ActiveStatus,
      existing,
      identity: identityId,
      routes: [],
    });
  }

  const selectedTables: D1SelectedTable[] = [];
  for (const tableId of [...new Set([...backendTables.keys(), ...effortTables.keys()])].sort()) {
    const left = backendTables.get(tableId);
    const right = effortTables.get(tableId);
    if (!left || !right) {
      error(problems, 'DIVERGENT_SOURCE', !left ? paths.backend : paths.effort, `Table ${tableId} is not in both plans.`, tableId);
      continue;
    }
    if (text(left.status) !== text(right.status) || text(left.entity) !== text(right.entity)) {
      error(problems, 'DIVERGENT_SOURCE', paths.backend, `Table ${tableId} does not match effort.`, tableId);
      continue;
    }
    if (!isActive(text(left.status))) continue;
    const entity = text(left.entity);
    if (entityKind.get(entity) === 'role') {
      error(problems, 'MDM_TABLE', paths.backend, `Table ${tableId} is declared for role ${entity}. No local table is planned.`, tableId);
      continue;
    }
    if (entityKind.get(entity) === 'external') {
      error(problems, 'EXTERNAL_TABLE', paths.backend, `Table ${tableId} is declared for external entity ${entity}. No local table is planned.`, tableId);
      continue;
    }
    selectedTables.push({ tableId, entity, status: text(left.status) as D1ActiveStatus });
  }

  const selectedPorts: D1SelectedPort[] = [];
  for (const port of backendPorts) {
    const portId = text(port.portId);
    const entity = text(port.entity);
    const status = text(port.status);
    if (!isActive(status)) continue;
    if (entityKind.get(entity) === 'role') {
      error(problems, 'MDM_PORT', paths.backend, `Port ${portId} is declared for role ${entity}. No local port is planned.`, portId);
      continue;
    }
    if (entityKind.get(entity) === 'external') {
      error(problems, 'EXTERNAL_PORT', paths.backend, `Port ${portId} is declared for external entity ${entity}. No local port is planned.`, portId);
      continue;
    }
    selectedPorts.push({ portId, entity, status: status as D1ActiveStatus });
  }

  const outbound = outboundEvents(integration);
  const hasEffects = outbound.length > 0 || hasEffectOperations(integration);
  noteStale(problems, moduleName, sources, previous);
  noteChanges(problems, paths, backend, effort);
  notePayload(problems, moduleName, selectedUsecases, artifacts.entities, entityKind);
  noteAccess(problems, paths.access, access, relationships);
  // One usecase per call for an external entity (d1_195): the plan names the entity and the operation, the call is the L4's.
  const split = splitExternalUsecases({
    journeys: artifacts.journeys,
    connections: rows(integration.connections),
    usecases: selectedUsecases,
    entityKind,
    taken: new Set([...backendUsecases.keys(), ...effortUsecases.keys()]),
    splitStored: true,
  });
  selectedUsecases.splice(0, selectedUsecases.length, ...split.usecases);
  for (const item of split.splits) {
    review(problems, 'USECASE_SPLIT_BY_CALL', paths.integration, `Usecase ${item.from} is on an external entity served by more than one call: ${item.into.map(part => `${part.usecaseId} (${part.operation}) → ${part.call}`).join(', ')}.`, item.from);
  }
  const contractV2 = readContractV2(artifacts.contractTexts);
  // Every usecase id the plan names, active or not, and every removed one. A usecase created from the contract may not reuse them.
  // d1_260: `removed` is the plan's "no page needs it", decided before the model resolves the routes. A route that needs a removed usecase is its
  // reader: the usecase is taken for it and leaves `removed` (below), instead of the route being refused. `removed` keeps what nobody reads.
  const removedByPlan = new Set([...rows(backend.removed), ...rows(effort.removed)].filter(row => text(row.kind) === 'usecase').map(row => text(row.id)));
  const planned: PlannedIds = {
    ids: new Map([...backendUsecases.values(), ...effortUsecases.values()].map(row => [text(row.usecaseId), `${text(row.entity)}.${text(row.operation)}`])),
    removed: new Set<string>(),
  };
  // The contract is the source: a request may create the usecase it needs (selectedUsecases grows here).
  const requests = contractRequests(
    problems,
    moduleName,
    contractV2,
    selectedUsecases,
    artifacts.entities,
    access,
    planned,
    answers,
    new Set([...entityKind].filter(([, kind]) => kind === 'role').map(([entity]) => entity)),
    entityKind,
    (pageId, entity, operation, transitionKey) => routeCallsOf({
      needs: artifacts.needs,
      journeys: artifacts.journeys,
      connections: rows(integration.connections),
      entityKind,
      pageId,
      entity,
      operation,
      transitionRef: transitionKey,
    }),
    rows(integration.connections),
  );
  const pageIds = new Set(contractPageIds(artifacts));
  const serveLines: D1ServeLine[] = [];
  for (const line of serveLinesOf(integration)) {
    if (pageIds.has(line.connectionId)) {
      error(problems, 'SERVE_CONNECTION_PAGE_COLLISION', paths.integration, `Connection ${line.connectionId} uses the same id as a page.`, line.connectionId);
      continue;
    }
    serveLines.push(line);
  }
  requests.push(...deriveServeRequests({
    moduleName,
    lines: serveLines,
    catalogTexts: artifacts.catalogTexts ?? {},
    usecases: selectedUsecases,
    problems,
    entities: artifacts.entities,
    plannedIds: planned.ids,
    removedIds: planned.removed,
    processTriggers: processTriggerServes(workflows),
    declaredSystems: Object.fromEntries((artifacts.connectionScope?.own ?? []).map(system => [system.id, system.operations])),
  }));
  // d1_217: an inbound event line is a route the platform delivers the event to, on a pseudo-page named by the publisher module.
  requests.push(...deriveConsumeRequests({
    moduleName,
    lines: consumeLinesOf(integration),
    usecases: selectedUsecases,
    problems,
    entities: artifacts.entities,
    plannedIds: planned.ids,
    removedIds: planned.removed,
    takenPages: new Set([...pageIds, ...serveLines.map(line => line.connectionId)]),
  }));
  // d1_235: the usecases of the process an arrival starts; the route of the arrival is their route, though it calls the process.
  const processKept = deriveProcessUsecases({
    moduleName,
    workflows,
    requests,
    usecases: selectedUsecases,
    problems,
    entities: artifacts.entities,
    plannedIds: planned.ids,
    removedIds: planned.removed,
  });
  for (const usecase of selectedUsecases) {
    usecase.routes = requests
      .filter(request => request.uses.includes(usecase.usecaseId) || processKept.get(request.route)?.has(usecase.usecaseId))
      .map(request => request.route);
  }
  selectedUsecases.sort((left, right) => left.usecaseId.localeCompare(right.usecaseId));
  const present = new Map(artifacts.presentDefs.map(item => [item.path, item.sha256]));
  noteExternalEffects(problems, paths.integration, integration, entityKind, selectedUsecases, artifacts.journeys);
  noteUnrequested(problems, paths.backend, selectedUsecases, requests, contractV2.size > 0, previous, present);
  noteContracts(problems, moduleName, artifacts.contracts, artifacts.contractTexts, contractV2);
  // The usecases the plan removed that a route (a page, a serve, an arrival, a process) now needs: created from the contract above, no longer removed.
  const revived = new Set([...removedByPlan].filter(id => !planned.ids.has(id) && selectedUsecases.some(usecase => usecase.usecaseId === id)));
  for (const id of [...revived].sort()) {
    const readers = requests.filter(request => request.uses.includes(id)).map(request => request.route);
    review(problems, 'REMOVED_USECASE_READ_BY_ROUTE', paths.backend, `Usecase ${id} was removed by the plan (no page needs it) and ${readers.length ? readers.join(', ') : 'a route'} reads it: it stays.`, id);
  }
  const removed = collectRemoved(problems, paths, backend, effort, requests, selectedUsecases, revived);
  // With a v2 contract, a planned usecase no request calls is not generated. The plan stays an estimate.
  const generatedUsecases = contractV2.size > 0
    ? selectedUsecases.filter(usecase => usecase.routes.length > 0)
    : selectedUsecases;
  notePrunedRemovals(removed, previous, present, selectedUsecases, generatedUsecases, contractV2.size > 0);
  const entityClosure = closeEntities(generatedUsecases, relationships, new Set(entityIds));
  const closedIds = new Set(entityClosure.ids);
  // An active port or table whose entity has no generated usecase and no relationship into the closure is not planned.
  const plannedPorts = selectedPorts.filter(port => {
    if (closedIds.has(port.entity)) return true;
    review(problems, 'PORT_WITHOUT_USECASE', paths.backend, `Port ${port.portId} (${port.entity}) is outside the entity closure.`, port.portId);
    return false;
  });
  const plannedTables = selectedTables.filter(table => {
    if (closedIds.has(table.entity)) return true;
    review(problems, 'TABLE_WITHOUT_USECASE', paths.backend, `Table ${table.tableId} (${table.entity}) is outside the entity closure.`, table.tableId);
    return false;
  });

  const receipts = indexWriterReceipts(artifacts.writerReceipts);
  const files = stampHashes(rederiveActions(planFiles({
    moduleName,
    requests,
    usecases: generatedUsecases,
    ports: plannedPorts,
    tables: plannedTables,
    entities: entityClosure,
    outbound,
    hasEffects,
    workflows,
    externalSystems: artifacts.connectionScope?.own ?? [],
    journeys: artifacts.journeys,
    grants: qualifyingGrants(access, entityClosure.ids),
    present,
    previous,
    problems,
    receipts,
  }), present, receipts, artifacts.rederiveTypes), present);
  noteRemovals(problems, removed, previous, present, receipts);
  implicitRemovals(removed, files, present, receipts, previous);
  if (hasCycle(files)) error(problems, 'DAG_CYCLE', 'input.json', 'Planned files have a dependency cycle.');

  const pages = pageGroups(requests);
  // d1_269: the required fields of a call that no field of the usecase names are asked of the model (resolve25); the answer is applied here.
  const callGaps = callInputGaps({
    usecases: generatedUsecases,
    requests,
    catalogTexts: { ...(artifacts.catalogTexts ?? {}), ...(artifacts.declarationTexts ?? {}) },
    entities: artifacts.entities,
    entityKind,
  });
  for (const usecase of generatedUsecases) {
    const chosen = callInputsOf(usecase.usecaseId, callGaps, answers);
    if (chosen.length) usecase.callInputs = chosen;
  }
  const snapshot: D1InputSnapshot = {
    schemaVersion: D1_INPUT_VERSION,
    project: identity.project,
    moduleName,
    device: 'web',
    plannerRun,
    sources,
    selection: {
      pages,
      requests,
      usecases: generatedUsecases,
      ports: plannedPorts,
      tables: plannedTables,
      entities: [...entityClosure.ids],
      outbound: outbound.map(item => item.id),
      ...(callGaps.length ? { callInputGaps: callGaps } : {}),
    },
    files,
    removed,
    problems: sortProblems(problems),
    consumersReleased: false,
    snapshotHash: '',
  };
  snapshot.consumersReleased = !snapshot.problems.some(problem => problem.severity === 'error');
  return snapshot;
}

export function contractPageIds(artifacts: Pick<D1InputArtifacts, 'menu' | 'needs' | 'effort' | 'backend'>): string[] {
  const ids = new Set<string>();
  for (const pageId of menuPageIds(rec(artifacts.menu))) ids.add(pageId);
  for (const row of rows(rec(artifacts.needs).pages)) ids.add(text(row.pageId));
  for (const row of rows(rec(artifacts.effort).screens)) ids.add(text(row.pageId));
  return [...ids].filter(id => isSafeToken(id)).sort();
}

function planFiles(input: {
  moduleName: string;
  requests: D1SelectedRequest[];
  usecases: D1SelectedUsecase[];
  ports: D1SelectedPort[];
  tables: D1SelectedTable[];
  entities: { ids: string[]; owners: Map<string, string[]> };
  outbound: Array<{ id: string; on: string }>;
  hasEffects: boolean;
  workflows: Record<string, unknown>;
  /** The systems this module declares in its L4 (d1_208): one `externalConnection` def each. */
  externalSystems: ReadonlyArray<{ id: string }>;
  journeys: Record<string, unknown>;
  grants: string[];
  present: Map<string, string>;
  previous: D1InputSnapshot | null;
  problems: D1InputProblem[];
  receipts: WriterIndex;
}): D1PlannedFile[] {
  const moduleName = input.moduleName;
  const files: D1PlannedFile[] = [];
  const byId = new Map<string, D1PlannedFile>();
  const add = (file: D1PlannedFile) => {
    const prior = byId.get(file.id);
    if (prior) {
      if (prior.defPath !== file.defPath) {
        error(input.problems, 'IDENTITY_COLLISION', file.defPath, `Id ${file.id} maps to two paths.`, file.id);
        return;
      }
      prior.ownerRefs = unique([...prior.ownerRefs, ...file.ownerRefs]);
      return;
    }
    byId.set(file.id, file);
    files.push(file);
  };

  for (const entityId of input.entities.ids) {
    const token = lowerFirst(entityId);
    if (!isSafeToken(token)) continue;
    const owners = input.entities.owners.get(entityId) || [];
    const defPath = `l1/${moduleName}/layer_3_domain/entities/${token}.defs.ts`;
    add({
      id: `entity:${entityId}`,
      artifactType: 'domainEntity',
      defPath,
      action: actionFor(worstStatus(owners, input.usecases), defPath, input.present, input.previous, input.receipts, input.problems, `entity:${entityId}`),
      identity: entityId,
      ownerRefs: owners,
      dependsOn: [],
    });
  }

  for (const port of input.ports) {
    const token = `${lowerFirst(port.entity)}Repository`;
    if (!isSafeToken(token)) continue;
    const defPath = `l1/${moduleName}/layer_2_application/ports/${token}.defs.ts`;
    add({
      id: `port:${port.portId}`,
      artifactType: 'repositoryPort',
      defPath,
      action: actionFor(port.status, defPath, input.present, input.previous, input.receipts, input.problems, `port:${port.portId}`),
      identity: port.portId,
      ownerRefs: [`port:${port.portId}`],
      dependsOn: input.entities.ids.includes(port.entity) ? [`entity:${port.entity}`] : [],
    });
  }

  for (const table of input.tables) {
    if (!isSafeToken(table.tableId)) continue;
    const defPath = `l1/${moduleName}/layer_1_external/adapters/persistence/${table.tableId}.defs.ts`;
    add({
      id: `table:${table.tableId}`,
      artifactType: 'table',
      defPath,
      action: actionFor(table.status, defPath, input.present, input.previous, input.receipts, input.problems, `table:${table.tableId}`),
      identity: table.tableId,
      ownerRefs: [`table:${table.tableId}`],
      dependsOn: input.entities.ids.includes(table.entity) ? [`entity:${table.entity}`] : [],
    });
    const port = input.ports.find(item => item.entity === table.entity);
    if (!port) continue;
    const adapterToken = `${lowerFirst(table.entity)}RepositoryAdapter`;
    if (!isSafeToken(adapterToken)) continue;
    const adapterPath = `l1/${moduleName}/layer_1_external/adapters/persistence/${adapterToken}.defs.ts`;
    add({
      id: `adapter:${port.portId}`,
      artifactType: 'repositoryAdapter',
      defPath: adapterPath,
      action: actionFor(worstOf(port.status, table.status), adapterPath, input.present, input.previous, input.receipts, input.problems, `adapter:${port.portId}`),
      identity: port.portId,
      ownerRefs: [`port:${port.portId}`, `table:${table.tableId}`],
      dependsOn: [`port:${port.portId}`, `table:${table.tableId}`],
    });
  }

  const scopeId = 'scope:access';
  const serveRoutes = input.requests.filter(request => request.serves || request.consumes).map(request => request.route);
  const planScope = input.grants.length > 0 || serveRoutes.length > 0;
  const scopeOwners = input.grants.length
    ? input.grants.map(grant => `grant:${grant}`)
    : serveRoutes.map(route => `endpoint:${route}`);
  if (planScope) {
    const scopePath = `l1/${moduleName}/layer_2_application/scope/accessScope.defs.ts`;
    const authPath = `l1/${moduleName}/layer_1_external/auth/authorityMap.defs.ts`;
    const scopeStatus = input.usecases.length ? worstOfList(input.usecases.map(item => item.status)) : 'toCreate';
    add({
      id: scopeId,
      artifactType: 'accessScope',
      defPath: scopePath,
      action: actionFor(scopeStatus, scopePath, input.present, input.previous, input.receipts, input.problems, scopeId),
      identity: 'accessScope',
      ownerRefs: scopeOwners,
      dependsOn: [],
    });
    add({
      id: 'auth:authorityMap',
      artifactType: 'authorityMap',
      defPath: authPath,
      action: actionFor(scopeStatus, authPath, input.present, input.previous, input.receipts, input.problems, 'auth:authorityMap'),
      identity: 'authorityMap',
      ownerRefs: scopeOwners,
      dependsOn: [scopeId],
    });
  }

  for (const usecase of input.usecases) {
    if (!isSafeToken(usecase.identity)) continue;
    const defPath = `l1/${moduleName}/layer_2_application/usecases/${usecase.identity}.defs.ts`;
    const dependsOn = [
      input.entities.ids.includes(usecase.entity) ? `entity:${usecase.entity}` : '',
      ...usecasePorts(usecase, input.ports),
      planScope ? scopeId : '',
    ].filter(Boolean);
    add({
      id: `usecase:${usecase.identity}`,
      artifactType: 'usecase',
      defPath,
      action: actionFor(usecase.status, defPath, input.present, input.previous, input.receipts, input.problems, `usecase:${usecase.usecaseId}`),
      identity: usecase.identity,
      ownerRefs: unique([`usecase:${usecase.usecaseId}`, ...usecase.routes.map(route => `endpoint:${route}`)]),
      dependsOn,
    });
  }

  for (const page of pageGroups(input.requests)) {
    if (!isSafeToken(page.pageId)) continue;
    const defPath = `l1/${moduleName}/layer_1_external/adapters/http/controllers/${page.pageId}.defs.ts`;
    const pageRequests = input.requests.filter(request => request.pageId === page.pageId);
    const statuses = unique(pageRequests.flatMap(request => request.uses.map(usecaseId => {
      const usecase = input.usecases.find(item => item.usecaseId === usecaseId);
      return usecase?.status || '';
    }).filter(Boolean))) as D1ActiveStatus[];
    const status = worstOfList(statuses.length ? statuses : ['toCreate']);
    const mixed = new Set(statuses).size > 1;
    const usecaseIds = unique(pageRequests.flatMap(request => request.uses.map(usecaseId => {
      const usecase = input.usecases.find(item => item.usecaseId === usecaseId);
      return usecase ? `usecase:${usecase.identity}` : '';
    }).filter(Boolean)));
    const serviceId = `requestService:${page.pageId}`;
    const servicePath = requestServiceDefPath(moduleName, page.pageId);
    const pageAction = mixed
      ? recomposeOrConflict(defPath, input.present, input.previous, input.receipts, input.problems, `controller:${page.pageId}`)
      : actionFor(status, defPath, input.present, input.previous, input.receipts, input.problems, `controller:${page.pageId}`);
    const serviceAction = mixed
      ? recomposeOrConflict(servicePath, input.present, input.previous, input.receipts, input.problems, serviceId)
      : actionFor(status, servicePath, input.present, input.previous, input.receipts, input.problems, serviceId);
    add({
      id: serviceId,
      artifactType: 'requestService',
      defPath: servicePath,
      action: serviceAction,
      identity: page.pageId,
      ownerRefs: page.routes.map(route => `endpoint:${route}`),
      dependsOn: usecaseIds,
    });
    add({
      id: `controller:${page.pageId}`,
      artifactType: 'httpController',
      defPath,
      action: pageAction,
      identity: page.pageId,
      ownerRefs: page.routes.map(route => `endpoint:${route}`),
      dependsOn: [serviceId, ...usecaseIds, ...(planScope ? [scopeId] : [])],
    });
  }

  const adapters = files.filter(file => file.artifactType === 'repositoryAdapter');
  if (adapters.length) {
    const defPath = `l1/${moduleName}/layer_1_external/adapters/persistence/registerRepositories.defs.ts`;
    add({
      id: 'registration:repositories',
      artifactType: 'repositoryRegistration',
      defPath,
      action: actionFor(worstOfList(adapters.map(file => statusOfAction(file.action))), defPath, input.present, input.previous, input.receipts, input.problems, 'registration:repositories'),
      identity: 'registerRepositories',
      ownerRefs: adapters.map(file => file.id),
      dependsOn: adapters.map(file => file.id),
    });
  }
  for (const table of input.tables) {
    const defPath = `l1/${moduleName}/layer_1_external/adapters/persistence/seeds.defs.ts`;
    add({
      id: 'seeds:persistence',
      artifactType: 'persistenceSeeds',
      defPath,
      action: actionFor(table.status, defPath, input.present, input.previous, input.receipts, input.problems, `table:${table.tableId}`),
      identity: 'seeds',
      ownerRefs: input.tables.map(item => `table:${item.tableId}`),
      dependsOn: input.tables.map(item => `table:${item.tableId}`),
    });
    break;
  }
  if (input.hasEffects) {
    const defPath = `l1/${moduleName}/layer_1_external/adapters/integration/outbound.defs.ts`;
    const dependsOn = unique(input.outbound.map(event => {
      const entityId = event.on.split('.')[0] || '';
      const transitionId = event.on.split('.')[1] || '';
      const usecase = input.usecases.find(item => item.operation === 'transition' && item.transitionRef === transitionId && item.entity === entityId);
      return usecase ? `usecase:${usecase.identity}` : '';
    }).filter(Boolean));
    add({
      id: 'integration:outbound',
      artifactType: 'integrationOutbound',
      defPath,
      action: actionFor('toCreate', defPath, input.present, input.previous, input.receipts, input.problems, 'integration:outbound'),
      identity: 'outbound',
      ownerRefs: input.outbound.map(event => `event:${event.id}`),
      dependsOn,
    });
  }
  for (const process of workflowFiles(input.workflows, input.journeys, input.usecases)) {
    const defPath = `l1/${moduleName}/layer_2_application/workflows/${process.processId}.defs.ts`;
    add({
      id: `workflow:${process.processId}`,
      artifactType: 'workflowProcess',
      defPath,
      action: actionFor('toCreate', defPath, input.present, input.previous, input.receipts, input.problems, `process:${process.processId}`),
      identity: process.processId,
      ownerRefs: [`process:${process.processId}`],
      dependsOn: process.dependsOn,
    });
  }
  for (const system of input.externalSystems) {
    if (!isSafeToken(system.id)) continue;
    const defPath = declarationDefPath(moduleName, system.id);
    add({
      id: `external:${system.id}`,
      artifactType: 'externalConnection',
      defPath,
      action: actionFor('toCreate', defPath, input.present, input.previous, input.receipts, input.problems, `external:${system.id}`),
      identity: system.id,
      ownerRefs: [`external:${system.id}`],
      dependsOn: [],
    });
  }

  return files.sort((left, right) => left.defPath.localeCompare(right.defPath));
}

function actionFor(
  status: D1ActiveStatus,
  defPath: string,
  present: Map<string, string>,
  previous: D1InputSnapshot | null,
  receipts: WriterIndex,
  problems: D1InputProblem[],
  ownerRef: string,
): D1FileAction {
  const hash = present.get(defPath) || '';
  const view = receiptView(previous, defPath, receipts, hash);
  if (status === 'done') {
    if (!hash) {
      error(problems, 'DONE_ABSENT', defPath, `Done item ${ownerRef} has no file. It was not turned into toCreate.`, ownerRef);
      return 'preserve';
    }
    if (!view.plan || !view.agrees || view.hash !== hash) {
      error(problems, 'DONE_ABSENT', defPath, `Done item ${ownerRef} is not an inventoried path and hash.`, ownerRef);
      return 'preserve';
    }
    return 'preserve';
  }
  if (status === 'toUpdate') {
    if (!view.plan || !view.agrees || !view.hash || !hash || view.hash !== hash) {
      error(problems, 'EXISTING_UNRESOLVED', defPath, `Update of ${ownerRef} needs an inventoried path and hash. Ownership is not assumed by prefix.`, ownerRef);
      return 'conflict';
    }
    return 'update';
  }
  if (!hash) return 'create';
  // d1_222: the def of a system the module declares is written before any plan exists (`/declarations`). Bytes the writer receipt vouches for
  // are the writer's own: they are recomposed (the receipt hash is the one to replace), not a file nobody owns.
  if (!view.plan && ownerRef.startsWith('external:') && view.agrees && view.written === hash) return 'recompose';
  if (!view.plan || !view.agrees || view.hash !== hash) {
    error(problems, 'EXISTS_WITHOUT_RECEIPT', defPath, existsMessage(defPath, hash, view), ownerRef);
    return 'conflict';
  }
  // The inventoried hash turns a present file into recompose. A writer receipt
  // only proves the bytes, so a create plan keeps its action and its snapshot hash.
  if (view.inventoried === hash) return 'recompose';
  return 'create';
}

export function recomposeOrConflict(
  defPath: string,
  present: Map<string, string>,
  previous: D1InputSnapshot | null,
  receipts: WriterIndex,
  problems: D1InputProblem[],
  ownerRef: string,
): D1FileAction {
  const hash = present.get(defPath) || '';
  const view = receiptView(previous, defPath, receipts, hash);
  if (hash && view.inventoried === hash && view.agrees) return 'recompose';
  // d1_260: the inventory is older than the receipt (a def rewritten after the snapshot, d1_253) and the disk is the bytes the receipt names: the D1 wrote
  // them and the stale inventory does not count against them; the def is recomposed, as when the inventory is current.
  if (hash && view.inventoried && view.written === hash && view.agrees) return 'recompose';
  if (!hash && !view.inventoried) return 'create';
  if (hash && !view.inventoried && view.written === hash && view.agrees) return 'create';
  error(problems, 'EXISTING_UNRESOLVED', defPath, `Recompose of ${ownerRef} needs an inventoried path and hash.`, ownerRef);
  return 'conflict';
}

/**
 * d1_228: while a `/rederive` runs, a def of the chosen kinds that the D1 wrote and nobody edited (the writer receipt is the hash on disk) is a
 * `recompose` and not a `create`: only a `recompose` carries the hash of the file, and only a file with its hash is overwritten.
 */
function rederiveActions(files: D1PlannedFile[], present: Map<string, string>, receipts: WriterIndex, types: readonly string[] | undefined): D1PlannedFile[] {
  if (!types?.length) return files;
  for (const file of files) {
    if (file.action !== 'create' || !types.includes(file.artifactType)) continue;
    const hash = present.get(file.defPath) || '';
    if (hash && !receipts.conflict.has(file.defPath) && receipts.hash.get(file.defPath) === hash) file.action = 'recompose';
  }
  return files;
}

function stampHashes(files: D1PlannedFile[], present: Map<string, string>): D1PlannedFile[] {
  for (const file of files) {
    const hash = present.get(file.defPath) || '';
    if (hash && file.action !== 'create' && file.action !== 'conflict') file.contentHash = hash;
  }
  return files;
}

interface WriterIndex {
  hash: Map<string, string>;
  conflict: Map<string, string[]>;
}

interface ReceiptView {
  plan: D1PlannedFile | undefined;
  inventoried: string;
  written: string;
  agrees: boolean;
  hash: string;
  refusal: string;
}

function indexWriterReceipts(rows: ReadonlyArray<{ defPath: string; desiredHash: string }> | undefined): WriterIndex {
  const grouped = new Map<string, Set<string>>();
  for (const row of rows || []) {
    if (!row.defPath || !row.desiredHash) continue;
    const set = grouped.get(row.defPath) || new Set<string>();
    set.add(row.desiredHash);
    grouped.set(row.defPath, set);
  }
  const hash = new Map<string, string>();
  const conflict = new Map<string, string[]>();
  for (const [defPath, set] of grouped) {
    const values = [...set].sort();
    if (values.length === 1) hash.set(defPath, values[0]);
    else conflict.set(defPath, values);
  }
  return { hash, conflict };
}

/**
 * d1_253: `disk` is the hash of the def now. The hash the previous snapshot inventoried is the one the def had when that snapshot was taken; a step that
 * rewrote the def after it (the controllers60 of a `/rederive`) left the receipt with the new bytes and the inventory with the old ones. When the disk is
 * the bytes the receipt names, the D1 wrote them and the stale inventory does not count against them. A def edited since has a disk that is not the receipt.
 */
function receiptView(previous: D1InputSnapshot | null, defPath: string, receipts: WriterIndex, disk = ''): ReceiptView {
  // d1_263: a def the previous inventory carried as removed or unplanned and that the plan carries again (a route now derives its usecase) is
  // vouched for by that inventory: same path, same hash.
  const wasRemoved = previous?.removed.find(item => item.defPath === defPath && !!item.contentHash);
  const plan = previous?.files.find(file => file.defPath === defPath) ?? (wasRemoved ? ({ defPath, contentHash: wasRemoved.contentHash } as D1PlannedFile) : undefined);
  const inventoried = plan?.contentHash || '';
  const conflict = receipts.conflict.get(defPath);
  const written = conflict ? '' : (receipts.hash.get(defPath) || '');
  const stale = !!written && !!disk && written === disk && inventoried !== written;
  const agrees = !conflict && (stale || !(written && inventoried && written !== inventoried));
  let refusal = '';
  if (conflict) {
    refusal = `toCreate file ${defPath} has disagreeing receipts ${conflict.join(' and ')}. The file was not accepted.`;
  } else if (written && inventoried && written !== inventoried) {
    refusal = `toCreate file ${defPath} receipt ${written} does not match inventoried hash ${inventoried}. The file was not accepted.`;
  }
  return { plan, inventoried, written, agrees, hash: agrees ? (written || inventoried) : '', refusal };
}

function existsMessage(defPath: string, disk: string, view: ReceiptView): string {
  if (view.refusal) return view.refusal;
  if (view.hash && view.hash !== disk) return `toCreate file ${defPath} does not match receipt ${view.hash}. Disk is ${disk}.`;
  return `toCreate file ${defPath} exists without an inventoried path and hash.`;
}

/**
 * The id of the usecase a plan row says already exists. An id (or nothing) is taken as it is. The path of the usecase def of this very module,
 * `l1/<module>/layer_2_application/usecases/<id>.defs.ts`, is how the planner names a def that is `done` (d1_254): the id is the file name.
 * Any other path (another module, another folder, a prefix) is not ownership and stays `EXISTING_UNRESOLVED`.
 */
function resolveIdentity(problems: D1InputProblem[], path: string, usecaseId: string, existing: string, moduleName: string): string {
  if (!existing) return usecaseId;
  if (isSafeToken(existing)) return existing;
  const own = new RegExp(`^l1/${moduleName.replace(/[^A-Za-z0-9_]/gu, '\\$&')}/layer_2_application/usecases/([A-Za-z][A-Za-z0-9_]*)\\.defs\\.ts$`, 'u').exec(existing);
  if (own) return own[1];
  error(problems, 'EXISTING_UNRESOLVED', path, `existing '${existing}' is not an id. A path prefix is not ownership.`, usecaseId);
  return usecaseId;
}

function collectRemoved(
  problems: D1InputProblem[],
  paths: ReturnType<typeof inputPaths>,
  backend: Record<string, unknown>,
  effort: Record<string, unknown>,
  requests: D1SelectedRequest[],
  usecases: D1SelectedUsecase[],
  revived: ReadonlySet<string> = new Set(),
): D1RemovedItem[] {
  const keep = (row: Record<string, unknown>) => !(text(row.kind) === 'usecase' && revived.has(text(row.id)));
  const backendRemoved = rows(backend.removed).filter(keep).map(row => ({ kind: text(row.kind), id: text(row.id), status: text(row.status) }));
  const effortRemoved = rows(effort.removed).filter(keep).map(row => ({ kind: text(row.kind), id: text(row.id), status: text(row.status) }));
  for (const item of [...backendRemoved, ...effortRemoved]) {
    if (item.status && item.status !== 'toRemove') {
      error(problems, 'STATUS_NOT_IN_REMOVED', paths.backend, `Removed ${item.kind} ${item.id} must be toRemove.`, item.id);
    }
  }
  const out: D1RemovedItem[] = [];
  const seen = new Set<string>();
  for (const item of effortRemoved) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (item.kind === 'usecase' && requests.some(request => request.uses.includes(item.id))) {
      error(problems, 'REMOVE_STILL_REFERENCED', paths.effort, `Usecase ${item.id} is toRemove but a contract request still calls it.`, item.id);
      continue;
    }
    if (item.kind !== 'endpoint') {
      const match = backendRemoved.find(row => row.kind === item.kind && row.id === item.id);
      if (!match) error(problems, 'DIVERGENT_SOURCE', paths.backend, `Removed ${item.kind} ${item.id} is not in backend.removed.`, item.id);
    }
    out.push({ kind: item.kind, id: item.id, defPath: null, inventoried: false });
  }
  for (const item of backendRemoved) {
    const key = `${item.kind}:${item.id}`;
    if (item.kind === 'usecase' && usecases.some(usecase => usecase.usecaseId === item.id)) {
      error(problems, 'REMOVE_STILL_REFERENCED', paths.backend, `Usecase ${item.id} is removed but still selected.`, item.id);
    }
    if (!seen.has(key)) {
      error(problems, 'DIVERGENT_SOURCE', paths.effort, `Removed ${item.kind} ${item.id} is not in effort.removed.`, item.id);
      out.push({ kind: item.kind, id: item.id, defPath: null, inventoried: false });
    }
  }
  return out;
}

/** The file of the previous snapshot a removed item was written to. */
export function previousFileOfRemoved(previous: D1InputSnapshot | null, item: Pick<D1RemovedItem, 'kind' | 'id'>): D1InputSnapshot['files'][number] | undefined {
  const file = previous?.files.find(entry => entry.identity === item.id || entry.ownerRefs.includes(`${item.kind}:${item.id}`) || entry.ownerRefs.includes(`endpoint:${item.id}`));
  if (file) return file;
  // d1_263: the previous inventory carried it as removed (a run after the one that removed it): its path and hash are the receipt, as for a def it carried as unplanned.
  const was = previous?.removed.find(entry => entry.kind === item.kind && entry.id === item.id && !!entry.defPath && !!entry.contentHash);
  return was ? ({ defPath: was.defPath, contentHash: was.contentHash } as D1InputSnapshot['files'][number]) : undefined;
}

/**
 * d1_250: a usecase def the D1 wrote (the writer receipt is the hash on disk) that no plan carries, and the L4 did not list as removed. It is inventoried (in
 * `removed`, marked `unplanned`) so the finalize does not call it an extra file, and it is KEPT: the L4 plan may be behind the contract (a live route the
 * plan does not know can read through it: agents, my_conduct), so nothing deletes it. A def with no receipt, or edited by hand, is not touched: it stays an
 * extra file.
 */
function implicitRemovals(removed: D1RemovedItem[], files: readonly D1PlannedFile[], present: Map<string, string>, receipts: WriterIndex, previous: D1InputSnapshot | null): void {
  const planned = new Set(files.map(file => file.defPath));
  const listed = new Set(removed.flatMap(item => (item.defPath ? [item.defPath] : [])));
  for (const [defPath, hash] of receipts.hash) {
    const match = /^l1\/[^/]+\/layer_2_application\/usecases\/([A-Za-z][A-Za-z0-9]*)\.defs\.ts$/u.exec(defPath);
    if (!match || planned.has(defPath) || listed.has(defPath) || removed.some(item => item.kind === 'usecase' && item.id === match[1])) continue;
    if (present.get(defPath) !== hash) continue;
    removed.push({ kind: 'usecase', id: match[1], defPath, inventoried: true, contentHash: hash, unplanned: true });
  }
  // The previous inventory vouches too: a def it carried as removed, still the bytes it inventoried (the progress of its step no longer lists it).
  for (const item of previous?.removed ?? []) {
    const defPath = item.defPath || '';
    if (item.kind !== 'usecase' || !defPath || !item.contentHash || planned.has(defPath) || removed.some(entry => entry.defPath === defPath || (entry.kind === item.kind && entry.id === item.id))) continue;
    if (present.get(defPath) !== item.contentHash) continue;
    removed.push({ kind: 'usecase', id: item.id, defPath, inventoried: true, contentHash: item.contentHash, unplanned: true });
  }
}

function noteRemovals(
  problems: D1InputProblem[],
  removed: D1RemovedItem[],
  previous: D1InputSnapshot | null,
  present: Map<string, string>,
  receipts: WriterIndex,
): void {
  for (const item of removed) {
    const receipt = previousFileOfRemoved(previous, item);
    const hash = receipt ? present.get(receipt.defPath) : '';
    const view = receipt ? receiptView(previous, receipt.defPath, receipts, hash || '') : null;
    if (receipt && hash && view && view.agrees && view.hash === hash) {
      item.defPath = receipt.defPath;
      item.inventoried = true;
      item.contentHash = hash;
      continue;
    }
    if (item.kind === 'endpoint') continue;
    error(problems, 'REMOVE_WITHOUT_RECEIPT', 'input.json', `Remove of ${item.kind} ${item.id} has no inventoried path and hash.`, item.id);
  }
}

function closeEntities(
  usecases: D1SelectedUsecase[],
  relationships: Array<Record<string, unknown>>,
  known: Set<string>,
): { ids: string[]; owners: Map<string, string[]> } {
  const owners = new Map<string, string[]>();
  const addOwner = (entityId: string, owner: string) => {
    const list = owners.get(entityId) || [];
    if (!list.includes(owner)) list.push(owner);
    owners.set(entityId, list);
  };
  for (const usecase of usecases) {
    if (!known.has(usecase.entity)) continue;
    addOwner(usecase.entity, `usecase:${usecase.usecaseId}`);
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const rel of relationships) {
      const from = text(rel.from);
      const to = text(rel.to);
      const relId = text(rel.relationshipId);
      if (!owners.has(from) || !known.has(to) || owners.has(to)) continue;
      addOwner(to, `relationship:${relId}`);
      for (const owner of owners.get(from) || []) addOwner(to, owner);
      grew = true;
    }
  }
  return { ids: [...owners.keys()].sort(), owners };
}

function notePayload(
  problems: D1InputProblem[],
  moduleName: string,
  usecases: D1SelectedUsecase[],
  entities: Record<string, unknown>,
  entityKind: ReadonlyMap<string, string>,
): void {
  const transitions = usecases.filter(usecase => usecase.operation === 'transition' && entityKind.get(usecase.entity) !== 'external');
  const cited = new Map<string, number>();
  const perUsecase: Array<{ usecase: D1SelectedUsecase; rules: string[]; path: string }> = [];
  for (const usecase of transitions) {
    const entity = rec(entities[usecase.entity]);
    const transition = rows(entity.transitions).find(row => text(row.transitionId) === usecase.transitionRef);
    const path = entityPath(moduleName, usecase.entity);
    if (!transition) {
      error(problems, 'DIVERGENT_SOURCE', path, `Transition usecase ${usecase.usecaseId} has no matching transitionId.`, usecase.usecaseId);
      continue;
    }
    const ruleRefs = strings(transition.ruleRefs);
    for (const rule of ruleRefs) cited.set(rule, (cited.get(rule) || 0) + 1);
    perUsecase.push({ usecase, rules: ruleRefs, path });
    if (transition.payload !== undefined) continue;
  }
  for (const item of perUsecase) {
    const uniqueRules = item.rules.filter(rule => cited.get(rule) === 1);
    if (!uniqueRules.length) continue;
    const entity = rec(entities[item.usecase.entity]);
    const transition = rows(entity.transitions).find(row => text(row.transitionId) === item.usecase.transitionRef);
    if (transition && transition.payload !== undefined) continue;
    review(
      problems,
      'PAYLOAD_UNDECLARED',
      item.path,
      `Transition ${item.usecase.usecaseId} cites ${uniqueRules.join(', ')} and declares no payload.`,
      item.usecase.usecaseId,
    );
  }
}

function noteAccess(
  problems: D1InputProblem[],
  path: string,
  access: Record<string, unknown>,
  relationships: Array<Record<string, unknown>>,
): void {
  for (const grant of rows(access.grants)) {
    const grantId = text(grant.grantId);
    const scope = rec(grant.dataScope);
    if (text(scope.mode) !== 'own') continue;
    const anchor = text(scope.anchorEntity);
    const entityRefs = strings(grant.entityRefs);
    if (!anchor || entityRefs.includes(anchor)) continue;
    const others = relationships.filter(rel => rel.required === true && entityRefs.includes(text(rel.from)) && text(rel.to) && text(rel.to) !== anchor);
    if (!others.length) continue;
    const names = others.map(rel => text(rel.relationshipId)).join(', ');
    review(problems, 'ACCESS_ANCHOR', path, `Grant ${grantId} anchors on ${anchor}. Relationship ${names} binds another required target.`, grantId);
  }
}

function noteChanges(
  problems: D1InputProblem[],
  paths: ReturnType<typeof inputPaths>,
  backend: Record<string, unknown>,
  effort: Record<string, unknown>,
): void {
  for (const change of rows(rec(backend.meta).unmappedChanges)) {
    review(problems, 'UNATTRIBUTED_CHANGE', paths.backend, `Unmapped change ${text(change.changeId) || '(missing id)'}.`, text(change.changeId));
  }
  for (const change of rows(effort.unattributed)) {
    review(problems, 'UNATTRIBUTED_CHANGE', paths.effort, `Unattributed change ${text(change.changeId) || '(missing id)'}.`, text(change.changeId));
  }
  for (const change of rows(backend.changes)) {
    if (strings(change.usecaseRefs).length) continue;
    review(problems, 'UNATTRIBUTED_CHANGE', paths.backend, `Change ${text(change.changeId) || '(missing id)'} has no usecaseRefs.`, text(change.changeId));
  }
}

const P1_OPERATION_SET = new Set<string>(D1_P1_OPERATIONS);
/** Operations a contract request may create. A custom operation comes only from the plan. A transition is created only when the L4 lifecycle names it, with the id of transitionUsecaseId. */
const CONTRACT_CREATED: Record<L1Operation, boolean> = {
  list: true, get: true, create: true, update: true, transition: true, delete: true, custom: false,
};
const CONTRACT_CREATED_OPERATIONS = new Set<string>(L1_OPERATIONS.filter(operation => CONTRACT_CREATED[operation]));

interface PlannedIds {
  /** usecaseId -> `entity.operation`, every status of both plans. */
  ids: Map<string, string>;
  removed: Set<string>;
}

export function readContractV2(texts: Record<string, string> | undefined): Map<string, D2ContractV2Definition> {
  const parsed = new Map<string, D2ContractV2Definition>();
  if (!texts) return parsed;
  for (const [pageId, source] of Object.entries(texts)) {
    if (!source) continue;
    try {
      const definition = parseD2ContractV2(source);
      if (definition.pageId === pageId) parsed.set(pageId, definition);
    } catch {
      // v1 contracts are not this shape. noteContracts still reports those.
    }
  }
  return parsed;
}

function contractRequests(
  problems: D1InputProblem[],
  moduleName: string,
  pages: Map<string, D2ContractV2Definition>,
  usecases: D1SelectedUsecase[],
  entities: Record<string, unknown>,
  access: Record<string, unknown>,
  planned: PlannedIds,
  answers: ReadonlyMap<string, readonly D1RequestGapAnswer[]>,
  roleEntities: ReadonlySet<string>,
  entityKind: ReadonlyMap<string, string>,
  routeCalls: (pageId: string, entity: string, operation: string, transitionKey: string) => readonly string[] = () => [],
  connections: readonly unknown[] = [],
): D1SelectedRequest[] {
  const requests: D1SelectedRequest[] = [];
  // Planner pool only. A get/list created later in this pass is not a planned read. An MDM role keeps its get (read through the facade).
  const poolReads = new Set(usecases.filter(item => !roleEntities.has(item.entity)).map(item => `${item.entity}\0${item.operation}`));
  const pageIds = [...pages.keys()].sort();
  const colliding = collidingTransitionIds(transitionWrites(pages, usecases));
  for (const pageId of pageIds) {
    const definition = pages.get(pageId);
    if (!definition) continue;
    const path = contractPath(moduleName, pageId);
    for (const route of definition.routes) {
      noteContractAccess(problems, path, route, access);
      requests.push(oneRequest(problems, path, pageId, route, definition, usecases, entities, planned, colliding, answers.get(route.route) || [], poolReads, entityKind, routeCalls, connections));
    }
  }
  requests.sort((left, right) => left.route.localeCompare(right.route));
  return requests;
}

/** Every transition the plan and the contracts write. The same rule as P1 names the usecase from them. */
function transitionWrites(pages: Map<string, D2ContractV2Definition>, usecases: readonly D1SelectedUsecase[]): L1TransitionWrite[] {
  const writes: L1TransitionWrite[] = usecases
    .filter(item => item.operation === 'transition' && item.transitionRef)
    .map(item => ({ entity: item.entity, transitionRef: item.transitionRef || '' }));
  for (const definition of pages.values()) {
    for (const route of definition.routes) {
      if (route.kind !== 'cmd' || !route.writes) continue;
      // The suffix of the calls (`+operationId`) is not part of the transition: the one reader of the L2 key splits it off.
      const write = readRouteWrite(route.writes);
      if (write && !P1_OPERATION_SET.has(write.written)) writes.push({ entity: write.entity, transitionRef: write.written });
    }
  }
  return writes;
}

/** `writes` of a contract route read by the one reader of the L2 key; `written` is the operation, or the transitionRef of a transition. Null when it is not `Entity.operation`. */
function readRouteWrite(writes: string): { entity: string; written: string; calls: string[] } | null {
  try {
    const parsed = parseD2WriteKey(writes);
    return { entity: parsed.entity, written: parsed.operation, calls: [...(parsed.calls ?? [])] };
  } catch {
    return null;
  }
}

function oneRequest(
  problems: D1InputProblem[],
  path: string,
  pageId: string,
  route: D2ContractV2Route,
  definition: D2ContractV2Definition,
  usecases: D1SelectedUsecase[],
  entities: Record<string, unknown>,
  planned: PlannedIds,
  colliding: ReadonlySet<string>,
  answers: readonly D1RequestGapAnswer[],
  poolReads: ReadonlySet<string>,
  entityKind: ReadonlyMap<string, string>,
  routeCalls: (pageId: string, entity: string, operation: string, transitionKey: string) => readonly string[] = () => [],
  connections: readonly unknown[] = [],
): D1SelectedRequest {
  // d1_60/d1_62: the route is derived from its types, the ontology and the resolve25 answers. `meta` is not read.
  const derived = applyResolutions({ route, definition, entities }, answers);
  const { outputs, params } = derived;
  for (const gap of derived.unresolved) {
    review(problems, 'OUTPUT_UNRESOLVED', path, `Route ${route.route} ${gap.path} is not derived: ${gap.reason}`, route.route);
  }
  const uses: string[] = [];
  const take = (entity: string, operation: string, transitionKey = '', calls?: readonly string[]): void => {
    takeUsecase({
      problems,
      path,
      routeName: route.route,
      entity,
      operation,
      transitionKey,
      usecases,
      uses,
      colliding,
      refusalOf: usecaseId => contractUsecaseRefusal(entity, operation, usecaseId, entities, planned, entityKind, transitionKey),
      routeCalls: calls ?? routeCalls(pageId, entity, operation, transitionKey),
    });
  };
  // Unique output: planned get, else planned list (locate picks the row). Neither: get, as before. many stays list.
  const readOf = (entity: string, many: boolean): string => {
    if (many) return 'list';
    if (poolReads.has(`${entity}\0get`)) return 'get';
    if (poolReads.has(`${entity}\0list`)) return 'list';
    return 'get';
  };
  const write = route.kind === 'cmd' && route.writes ? readRouteWrite(route.writes) : null;
  if (route.kind === 'cmd' && route.writes && !write) {
    error(problems, 'REQUEST_USECASE_UNPLANNED', path, `Route ${route.route} writes '${route.writes}', which is not \`Entity.operation\` (with an optional \`+operationId\` for each call).`, route.route);
  } else if (route.kind === 'cmd' && route.writes && write) {
    const { entity, written, calls: suffix } = write;
    const namedTransition = !P1_OPERATION_SET.has(written);
    const operation = namedTransition ? 'transition' : written;
    if (namedTransition && entityKind.get(entity) !== 'external' && !lifecycleHas(entities, entity, written)) {
      error(problems, 'REQUEST_USECASE_UNPLANNED', path, `Route ${route.route} needs ${entity}.${operation}, which is not in the planned pool. Transition '${written}' is not in the L4 lifecycle of ${entity}.`, route.route);
    } else {
      // d1_285: the calls of the route are the ones its write names; a route without a suffix beside a sibling that has one runs none (the key says which).
      const baseKey = `${entity}.${written}`;
      const siblingSuffixed = suffix.length === 0 && definition.routes.some(other => {
        const otherWrite = other !== route && other.kind === 'cmd' && other.writes ? readRouteWrite(other.writes) : null;
        return !!otherWrite && `${otherWrite.entity}.${otherWrite.written}` === baseKey && otherWrite.calls.length > 0;
      });
      const resolved = routeWriteCalls({ suffix, siblingSuffixed, connections, pageCalls: routeCalls(pageId, entity, operation, namedTransition ? written : '') });
      for (const item of resolved.unresolved) {
        error(problems, 'EXTERNAL_ROUTE_CALL_UNRESOLVED', path, `Route ${route.route} writes '${route.writes}', and '${item.operationId}' is not one call of the L4 (${item.candidates.length ? item.candidates.join(', ') : 'no call line'}).`, route.route);
      }
      take(entity, operation, namedTransition ? written : '', resolved.calls);
      // An entity the module keeps has no usecase per call: its route also uses the usecase of the entity each call belongs to.
      // A call whose `entityRefs` names this entity is already in the usecase the route took: with no external usecase for it, that is not an error (an external usecase that has it is still used).
      if (suffix.length > 0 && entityKind.get(entity) !== 'external') {
        for (const call of resolved.calls) {
          const found = externalUsecaseForCall({ call, usecases, entityKind, connections });
          if (!found && callNamesEntity(call, entity, connections)) continue;
          if (!found) {
            error(problems, 'EXTERNAL_ROUTE_CALL_UNRESOLVED', path, `Route ${route.route} runs ${call}, and no usecase of an external entity has that call: only steps of entities the module keeps cite it.`, route.route);
          } else if (!uses.includes(found.usecaseId)) {
            uses.push(found.usecaseId);
          }
        }
      }
    }
    for (const output of outputs) {
      if (output.entity === entity) continue;
      take(output.entity, readOf(output.entity, output.many));
    }
    // A cmd writes one entity. Reading another table (output or validation) is a get/list, not a second write.
  } else {
    for (const output of outputs) take(output.entity, readOf(output.entity, output.many));
  }
  const request: D1SelectedRequest = { route: route.route, pageId, kind: route.kind, writes: route.writes ?? '', outputs, params, uses };
  if (derived.computedBy.length) request.computedBy = derived.computedBy;
  if (derived.unresolved.length) request.unresolved = derived.unresolved;
  return request;
}

/** Why a contract request may not create the usecase it needs, or '' when it may. */
function contractUsecaseRefusal(
  entity: string,
  operation: string,
  usecaseId: string,
  entities: Record<string, unknown>,
  planned: PlannedIds,
  entityKind: ReadonlyMap<string, string>,
  transitionRef = '',
): string {
  if (!CONTRACT_CREATED_OPERATIONS.has(operation)) return `Operation ${operation} is not created from the contract. It comes from the plan.`;
  // The bare operation `transition` still comes from the plan. A named lifecycle ref is created here.
  // An external transition lives on the call, so the entity has no lifecycle row to require.
  if (operation === 'transition' && entityKind.get(entity) !== 'external' && !lifecycleHasId(entities, entity, transitionRef)) return `Operation ${operation} is not created from the contract. It comes from the plan.`;
  if (!Object.prototype.hasOwnProperty.call(entities, entity)) return `Entity ${entity} is not in the module ontology.`;
  if (!isSafeToken(usecaseId)) return `Usecase id '${usecaseId}' is not an id.`;
  const prior = planned.ids.get(usecaseId);
  if (prior !== undefined) return `Usecase ${usecaseId} is already in the plan as ${prior}.`;
  if (planned.removed.has(usecaseId)) return `Usecase ${usecaseId} is in removed.`;
  return '';
}

function lifecycleHas(entities: Record<string, unknown>, entity: string, transitionId: string): boolean {
  return rows(rec(entities[entity]).transitions).some(row => text(row.transitionId) === transitionId);
}

function lifecycleHasId(entities: Record<string, unknown>, entity: string, transitionRef: string): boolean {
  // A bare `entity.transition` write has no lifecycle id. An empty ref must not match a row whose transitionId is absent.
  if (!transitionRef) return false;
  return rows(rec(entities[entity]).transitions).some(row => text(row.transitionId) === transitionRef);
}

function noteContractAccess(
  problems: D1InputProblem[],
  path: string,
  route: D2ContractV2Route,
  access: Record<string, unknown>,
): void {
  const actors = new Set(rows(access.actors).map(row => text(row.actorId)).filter(Boolean));
  const grants = new Map(rows(access.grants).map(row => [text(row.grantId), row]));
  // The promoted parser keeps one access line greedy, so a token that is not an id was not split.
  const actorsSplit = route.access.actors.every(actor => isSafeToken(actor));
  let divergent = actorsSplit && route.access.actors.some(actor => !actors.has(actor));
  for (const grantId of route.access.grants) {
    if (!isSafeToken(grantId)) continue;
    const grant = grants.get(grantId);
    if (!grant) {
      divergent = true;
      continue;
    }
    const actorRef = text(grant.actorRef);
    if (actorsSplit && actorRef && !route.access.actors.includes(actorRef)) divergent = true;
    const mode = text(rec(grant.dataScope).mode);
    if (mode && mode !== route.access.scope) divergent = true;
  }
  if (!divergent) return;
  review(problems, 'CONTRACT_ACCESS_DIVERGENT', path, `Route ${route.route} access does not match the L4 access artifact. L4 stays the source.`, route.route);
}

/**
 * The file of the previous inventory a usecase was written to. d1_287: an entry of a round that was held (input20 or resolve25) is a plan, not a file: its def never
 * reached the disk, so there is nothing to remove or to inventory. Such an entry counts only when it carries the hash of the bytes it inventoried, or the def is on the
 * disk now (a complete round's `input.json` has no hash for what a later step wrote).
 */
function previousUsecaseFile(previous: D1InputSnapshot | null, usecaseId: string, present: ReadonlyMap<string, string>) {
  return previous?.files.find(file => (file.identity === usecaseId || file.ownerRefs.includes(`usecase:${usecaseId}`)) && (!!file.contentHash || present.has(file.defPath)));
}

function notePrunedRemovals(
  removed: D1RemovedItem[],
  previous: D1InputSnapshot | null,
  present: ReadonlyMap<string, string>,
  selected: D1SelectedUsecase[],
  generated: D1SelectedUsecase[],
  sawContract: boolean,
): void {
  if (!sawContract) return;
  const kept = new Set(generated.map(usecase => usecase.usecaseId));
  const seen = new Set(removed.map(item => `${item.kind}:${item.id}`));
  for (const usecase of selected) {
    if (kept.has(usecase.usecaseId)) continue;
    if (!previousUsecaseFile(previous, usecase.usecaseId, present)) continue;
    const key = `usecase:${usecase.usecaseId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    removed.push({ kind: 'usecase', id: usecase.usecaseId, defPath: null, inventoried: false });
  }
}

function noteUnrequested(
  problems: D1InputProblem[],
  path: string,
  usecases: D1SelectedUsecase[],
  requests: D1SelectedRequest[],
  sawContract: boolean,
  previous: D1InputSnapshot | null,
  present: ReadonlyMap<string, string>,
): void {
  if (!sawContract) return;
  const used = new Set(requests.flatMap(request => request.uses));
  for (const usecase of usecases) {
    if (used.has(usecase.usecaseId) || usecase.routes.length > 0) continue;
    const fate = previousUsecaseFile(previous, usecase.usecaseId, present) ? 'removed' : 'not generated';
    review(problems, 'USECASE_WITHOUT_REQUEST', path, `Usecase ${usecase.usecaseId} is in the pool and no contract request calls it. It is ${fate}.`, usecase.usecaseId);
  }
}

function noteContracts(
  problems: D1InputProblem[],
  moduleName: string,
  contracts: D1InputArtifacts['contracts'],
  texts: Record<string, string> | undefined,
  contractV2: Map<string, D2ContractV2Definition>,
): void {
  const pageIds = new Set([...Object.keys(contracts), ...Object.keys(texts || {})]);
  for (const pageId of [...pageIds].sort()) {
    const path = contractPath(moduleName, pageId);
    const text = texts?.[pageId];
    if (text == null) {
      error(problems, 'CONTRACT_ABSENT', path, `L2 contract for ${pageId} is absent. The inventory stays readable and consumer phases are not released.`, pageId);
      continue;
    }
    if (contractV2.has(pageId)) continue;
    const value = contracts[pageId];
    const details = value && Array.isArray(value.unparsed) ? value.unparsed : [];
    if (!details.length) {
      error(problems, 'CONTRACT_UNPARSED', path, `L2 contract for ${pageId} is not a v2 contract.`, pageId);
      continue;
    }
    for (const detail of details) {
      error(problems, 'CONTRACT_UNPARSED', path, detail, pageId);
    }
  }
}

function noteStale(
  problems: D1InputProblem[],
  moduleName: string,
  sources: D1SourceDigest[],
  previous: D1InputSnapshot | null,
): void {
  if (!previous) return;
  const backendPath = inputPaths(moduleName).backend;
  const previousBackend = previous.sources.find(source => source.path === backendPath);
  const currentBackend = sources.find(source => source.path === backendPath);
  if (!previousBackend?.sha256 || !currentBackend?.sha256 || previousBackend.sha256 !== currentBackend.sha256) return;
  for (const prior of previous.sources) {
    if (!isL4Content(moduleName, prior.path) || !prior.sha256) continue;
    const current = sources.find(source => source.path === prior.path);
    if (!current?.sha256 || current.sha256 === prior.sha256) continue;
    error(problems, 'STALE_L4', prior.path, `Content hash ${current.sha256} does not validate the plan. ${BACKEND_PATH_TAIL} is unchanged.`, prior.path);
  }
}

/**
 * d1_315: the planner runs inside the revision of a New Release and writes that root's paths (`l4/<mod>/pipeline/changes/<id>/revisions/<id>/l4/<rest>`); the promotion
 * copies the state without rewriting them. The state is read as the canonical path `l4/<mod>/<rest>`: the revision may have been compacted, so nothing is read from it.
 */
export function canonicalPlannerPath(moduleName: string, artifact: string): string {
  const match = new RegExp(`^l4/${moduleName}/pipeline/changes/[^/]+/revisions/[^/]+/l4/(.+)$`, 'u').exec(artifact);
  return match ? `l4/${moduleName}/${match[1]}` : artifact;
}

function readPlannerRun(
  problems: D1InputProblem[],
  planner: Record<string, unknown>,
  paths: ReturnType<typeof inputPaths>,
  moduleName: string,
  backendOnDisk: boolean,
): D1InputSnapshot['plannerRun'] {
  if (!Object.keys(planner).length) return null;
  const plan20 = rec(rec(planner.steps).plan20);
  const recorded = strings(plan20.artifactPaths);
  const artifacts = recorded.map(artifact => canonicalPlannerPath(moduleName, artifact));
  const backendArtifact = `l4/${moduleName}/${BACKEND_PATH_TAIL}`;
  const fromRevision = recorded.find(artifact => canonicalPlannerPath(moduleName, artifact) === backendArtifact && artifact !== backendArtifact);
  if (text(planner.flowId) !== D1_PLANNER_FLOW || text(plan20.status) !== 'approved' || !artifacts.includes(backendArtifact) || !text(planner.thread)) {
    error(problems, 'PLANNER_RUN_DIVERGENT', paths.planner, 'Planner run does not approve this backend.json for this module.');
  } else if (fromRevision && !backendOnDisk) {
    error(problems, 'PLANNER_RUN_DIVERGENT', paths.planner, `Planner run approves ${fromRevision}, read as ${backendArtifact}, and that file is not in the module.`);
  }
  if (!text(planner.thread)) return null;
  return {
    flowId: text(planner.flowId),
    thread: text(planner.thread),
    round: typeof planner.round === 'number' ? planner.round : 0,
    schemaVersion: text(planner.schemaVersion),
  };
}

function serveLinesOf(integration: Record<string, unknown>): D1ServeLine[] {
  const lines: D1ServeLine[] = [];
  for (const row of rows(integration.connections)) {
    if (text(row.direction) !== 'serve') continue;
    const connectionId = text(row.connectionId);
    const operationId = text(row.operationId);
    if (!isSafeToken(connectionId) || !isSafeToken(operationId)) continue;
    // d1_232: the line goes to the derivation as the L4 wrote it; the one reader of the NS5 says what it does to each entity.
    lines.push({
      connectionId,
      operationId,
      entityEffects: Array.isArray(row.entityEffects) ? row.entityEffects : undefined,
      entityRefs: strings(row.entityRefs),
      effect: text(row.effect),
    });
  }
  return lines;
}

function qualifyingGrants(access: Record<string, unknown>, entities: string[]): string[] {
  const selected = new Set(entities);
  return rows(access.grants)
    .filter(grant => strings(grant.entityRefs).some(entity => selected.has(entity)))
    .map(grant => text(grant.grantId))
    .filter(Boolean)
    .sort();
}

function outboundEvents(integration: Record<string, unknown>): Array<{ id: string; on: string }> {
  return rows(integration.outbound)
    .map(row => ({ id: text(row.id), on: text(row.on) }))
    .filter(row => row.id);
}

// Inbound, plugin or a call connection still writes integration outbound. A workflow process is its own def.
function hasEffectOperations(integration: Record<string, unknown>): boolean {
  const calls = rows(integration.connections).some(row => text(row.direction) === 'call');
  return rows(integration.inbound).length > 0 || rows(integration.plugins).length > 0 || calls;
}

function noteExternalEffects(
  problems: D1InputProblem[],
  path: string,
  integration: Record<string, unknown>,
  entityKind: ReadonlyMap<string, string>,
  usecases: readonly D1SelectedUsecase[],
  journeys: Record<string, unknown>,
): void {
  const matches = externalCallsOf({
    journeys,
    connections: rows(integration.connections),
    usecases,
    entityKind,
  });
  for (const match of matches) {
    if (!match.steps.length) {
      error(problems, 'EXTERNAL_STEP_WITHOUT_CALL', path, `External usecase ${match.usecaseId}: no step serves it.`, match.usecaseId);
      continue;
    }
    if (match.calls.length) continue;
    error(problems, 'EXTERNAL_STEP_WITHOUT_CALL', path, `External usecase ${match.usecaseId} has no call for ${match.steps.join(', ')}.`, match.usecaseId);
  }
}

export function workflowFiles(
  workflows: Record<string, unknown>,
  journeys: Record<string, unknown>,
  usecases: readonly D1SelectedUsecase[],
): Array<{ processId: string; dependsOn: string[] }> {
  const decisions = rows(workflows.journeyDecisions).filter(row => row.inProcess === true && text(row.journeyId) && text(row.processId));
  const plans: Array<{ processId: string; dependsOn: string[] }> = [];
  for (const process of rows(workflows.processes)) {
    const processId = text(process.processId);
    if (!isSafeToken(processId)) continue;
    const dependsOn = new Set<string>();
    const consider = (entity: string, effect: string, transitionRef: string) => {
      const name = effect === 'transition' ? transitionRef : effect;
      if (!entity || !name || (effect !== 'create' && effect !== 'update' && effect !== 'transition')) return;
      const usecase = usecases.find(item => effect === 'transition'
        ? item.operation === 'transition' && item.entity === entity && item.transitionRef === transitionRef
        : item.entity === entity && item.operation === effect);
      if (usecase && isSafeToken(usecase.identity)) dependsOn.add(`usecase:${usecase.identity}`);
    };
    for (const journeyId of decisions.filter(row => text(row.processId) === processId).map(row => text(row.journeyId))) {
      const journey = rec(journeys[journeyId]);
      const business = rec(journey.business);
      const steps = rows(business.steps).length ? rows(business.steps) : rows(journey.steps);
      for (const step of steps) {
        if (text(step.kind) !== 'act') continue;
        consider(text(step.entity), text(step.effect), text(step.transitionRef));
      }
    }
    for (const task of rows(process.tasks)) {
      const kind = text(task.kind);
      if (kind !== 'mechanical' && kind !== 'llm') continue;
      for (const entry of taskEffects(task)) {
        for (const effect of entry.effects) consider(entry.entityId, effect, text(task.transitionRef));
      }
    }
    plans.push({ processId, dependsOn: [...dependsOn].sort() });
  }
  return plans;
}

function comparePageSets(problems: D1InputProblem[], paths: ReturnType<typeof inputPaths>, menu: Set<string>, needs: Set<string>, effort: Set<string>): void {
  for (const pageId of menu) {
    if (!needs.has(pageId)) error(problems, 'DIVERGENT_SOURCE', paths.needs, `Menu page ${pageId} is missing from needs.`, pageId);
    if (!effort.has(pageId)) error(problems, 'DIVERGENT_SOURCE', paths.effort, `Menu page ${pageId} is missing from effort.`, pageId);
  }
  for (const pageId of needs) {
    if (!menu.has(pageId)) error(problems, 'DIVERGENT_SOURCE', paths.menu, `Needs page ${pageId} is missing from the menu.`, pageId);
  }
  for (const pageId of effort) {
    if (!menu.has(pageId)) error(problems, 'DIVERGENT_SOURCE', paths.menu, `Effort screen ${pageId} is missing from the menu.`, pageId);
  }
}

function checkTotals(problems: D1InputProblem[], path: string, effort: Record<string, unknown>): void {
  const totals = rec(effort.totals);
  for (const [bucket, rowsOf, key] of [
    ['screens', rows(effort.screens), 'pageId'],
    ['endpoints', rows(effort.endpoints), 'route'],
    ['usecases', rows(effort.usecases), 'usecaseId'],
    ['tables', rows(effort.tables), 'tableId'],
  ] as const) {
    const declared = rec(totals[bucket]);
    const counts = { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 };
    for (const row of rowsOf) {
      const status = text(row.status);
      if (status === 'toCreate' || status === 'toUpdate' || status === 'toRemove' || status === 'done') counts[status] += 1;
    }
    for (const status of Object.keys(counts) as Array<keyof typeof counts>) {
      if (Number(declared[status] || 0) !== counts[status]) {
        error(problems, 'TOTALS_DIVERGENT', path, `effort.totals.${bucket}.${status} is ${declared[status]}, counted ${counts[status]}.`, key);
      }
    }
  }
}

function checkSource(
  problems: D1InputProblem[],
  sources: D1SourceDigest[],
  path: string,
  value: unknown,
  schema: string | readonly string[],
  moduleName: string,
): void {
  const digest = sources.find(source => source.path === path);
  if (!digest || digest.state === 'missing' || value == null) {
    error(problems, 'SOURCE_MISSING', path, `Missing source ${path}.`);
    return;
  }
  if (digest.state === 'invalid' || !rec(value) || (typeof value === 'object' && !Object.keys(rec(value)).length && digest.state !== 'present')) {
    error(problems, 'SOURCE_INVALID', path, `Source ${path} did not parse.`);
    return;
  }
  const doc = rec(value);
  const accepted = typeof schema === 'string' ? [schema] : schema;
  if (!accepted.includes(text(doc.schemaVersion))) {
    error(problems, 'SCHEMA_DIVERGENT', path, `Schema is '${text(doc.schemaVersion) || '(missing)'}', expected ${accepted.join(' or ')}. Regenerate ${path} with its producer; other versions are not converted.`);
  }
  const name = text(doc.moduleName) || text(doc.module);
  if (name && name !== moduleName) {
    error(problems, 'MODULE_DIVERGENT', path, `Module is '${name}', expected ${moduleName}.`);
  }
}

/**
 * `backend.json.testSupport[]` as agentPlannerL1 plan20 writes it, and the copy effort40 mirrors.
 * Checked only when both plans are the current schema (an old document already has its refusal).
 * Shape and refs only: D1 does not fill an executor nor read a declaration as a test that ran.
 */
function checkTestSupport(
  problems: D1InputProblem[],
  paths: ReturnType<typeof inputPaths>,
  backend: Record<string, unknown>,
  effort: Record<string, unknown>,
  actors: Set<string>,
  entities: Set<string>,
): void {
  if (text(backend.schemaVersion) !== D1_SOURCE_SCHEMAS.backend || text(effort.schemaVersion) !== D1_SOURCE_SCHEMAS.effort) return;
  const path = paths.backend;
  if (!Array.isArray(backend.testSupport)) {
    error(problems, 'TEST_SUPPORT_INVALID', path, 'testSupport[] is required (an empty array is valid). Regenerate the backend plan.');
    return;
  }
  const ids = new Set<string>();
  backend.testSupport.forEach((value: unknown, index: number) => {
    const at = `testSupport[${index}]`;
    const item = rec(value);
    const id = text(item.id);
    const bad = (message: string) => error(problems, 'TEST_SUPPORT_INVALID', path, `${at}${id ? ` (${id})` : ''}: ${message}`, id);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return bad('must be an object.');
    if (!id) bad('id is required.');
    else if (ids.has(id)) bad('duplicate id.');
    ids.add(id);
    for (const key of ['actorRefs', 'entityRefs', 'sourceRefs'] as const) {
      if (!Array.isArray(item[key]) || !(item[key] as unknown[]).every(ref => typeof ref === 'string' && ref.trim())) bad(`${key} must be an array of refs.`);
    }
    for (const key of ['executorRef', 'cleanupRef', 'gap'] as const) {
      if (typeof item[key] !== 'string') bad(`${key} must be a string (empty when not referenced).`);
    }
    const status = text(item.status);
    if (!(D1_TEST_SUPPORT_STATUSES as readonly string[]).includes(status)) bad(`status must be ${D1_TEST_SUPPORT_STATUSES.join('|')}.`);
    if (!(D1_TEST_SUPPORT_OWNERS as readonly string[]).includes(text(item.owner))) bad(`owner must be ${D1_TEST_SUPPORT_OWNERS.join('|')}.`);
    for (const ref of strings(item.actorRefs)) if (!actors.has(ref)) bad(`actorRef ${ref} is not a needs actor.`);
    for (const ref of strings(item.entityRefs)) if (!entities.has(ref)) bad(`entityRef ${ref} is not an ontology entity.`);
    const executor = text(item.executorRef);
    const cleanup = text(item.cleanupRef);
    if ((!executor || !cleanup) && !text(item.gap)) bad('no executorRef or cleanupRef and no gap.');
    if (status === 'done' && (!executor || !cleanup)) bad('done without executorRef and cleanupRef.');
  });
  if (!Array.isArray(effort.testSupport) || stableJson(effort.testSupport) !== stableJson(backend.testSupport)) {
    error(problems, 'DIVERGENT_SOURCE', paths.effort, 'testSupport[] is not the copy of the backend plan. Regenerate effort from this backend.');
  }
  const sourceVersion = text(rec(effort.meta).sourceVersion);
  if (sourceVersion !== D1_SOURCE_SCHEMAS.backend) {
    error(problems, 'DIVERGENT_SOURCE', paths.effort, `meta.sourceVersion is '${sourceVersion || '(missing)'}', expected ${D1_SOURCE_SCHEMAS.backend}.`);
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map(key => `${JSON.stringify(key)}:${stableJson(obj[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function rejectLiveRemoval(problems: D1InputProblem[], path: string, rowsOf: Array<Record<string, unknown>>, key: string): void {
  for (const row of rowsOf) {
    if (text(row.status) !== 'toRemove') continue;
    error(problems, 'STATUS_NOT_IN_REMOVED', path, `${key} ${text(row[key])} is toRemove outside removed.`, text(row[key]));
  }
}

function menuPageIds(menu: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: unknown) => {
    for (const node of rows(nodes)) {
      if (text(node.kind) === 'page' && text(node.id)) ids.add(text(node.id));
      if (node.children) walk(node.children);
    }
  };
  walk(menu.tree);
  return ids;
}

function pageGroups(requests: D1SelectedRequest[]): Array<{ pageId: string; routes: string[] }> {
  const pages = new Map<string, string[]>();
  for (const request of requests) {
    const list = pages.get(request.pageId) || [];
    list.push(request.route);
    pages.set(request.pageId, list);
  }
  return [...pages.entries()]
    .map(([pageId, pageRoutes]) => ({ pageId, routes: pageRoutes.slice().sort() }))
    .sort((left, right) => left.pageId.localeCompare(right.pageId));
}

function usecasePorts(usecase: D1SelectedUsecase, ports: D1SelectedPort[]): string[] {
  return ports.filter(port => port.entity === usecase.entity).map(port => `port:${port.portId}`);
}

function worstStatus(owners: string[], usecases: D1SelectedUsecase[]): D1ActiveStatus {
  const statuses = owners
    .map(owner => usecases.find(usecase => owner === `usecase:${usecase.usecaseId}`)?.status)
    .filter((status): status is D1ActiveStatus => !!status);
  return statuses.length ? worstOfList(statuses) : 'toCreate';
}

function worstOf(left: D1ActiveStatus, right: D1ActiveStatus): D1ActiveStatus {
  return worstOfList([left, right]);
}

/** `toCreate` over `toUpdate` over `done`. controllers60 applies it per handler. */
export function worstOfList(statuses: readonly D1ActiveStatus[]): D1ActiveStatus {
  if (statuses.includes('toCreate')) return 'toCreate';
  if (statuses.includes('toUpdate')) return 'toUpdate';
  return 'done';
}

function statusOfAction(action: D1FileAction): D1ActiveStatus {
  if (action === 'update' || action === 'recompose') return 'toUpdate';
  if (action === 'preserve') return 'done';
  return 'toCreate';
}

function isL4Content(moduleName: string, path: string): boolean {
  const root = `l4/${moduleName}/`;
  return path.startsWith(root) && !path.slice(root.length).startsWith('pool/');
}

function isActive(status: string): status is D1ActiveStatus {
  return (D1_ACTIVE_STATUSES as readonly string[]).includes(status);
}

function hasCycle(files: D1PlannedFile[]): boolean {
  const ids = new Set(files.map(file => file.id));
  const pending = new Map(files.map(file => [file.id, file.dependsOn.filter(id => ids.has(id))]));
  const ready = [...pending.entries()].filter(([, deps]) => deps.length === 0).map(([id]) => id);
  let seen = 0;
  while (ready.length) {
    const id = ready.pop() as string;
    seen += 1;
    for (const [other, deps] of pending) {
      const index = deps.indexOf(id);
      if (index === -1) continue;
      deps.splice(index, 1);
      if (!deps.length) ready.push(other);
    }
  }
  return seen !== files.length;
}

function error(problems: D1InputProblem[], code: string, path: string, message: string, ownerRef = ''): void {
  push(problems, 'error', code, path, message, ownerRef);
}

function review(problems: D1InputProblem[], code: string, path: string, message: string, ownerRef = ''): void {
  push(problems, 'review', code, path, message, ownerRef);
}

function push(
  problems: D1InputProblem[],
  severity: D1InputProblem['severity'],
  code: string,
  path: string,
  message: string,
  ownerRef: string,
): void {
  if (problems.some(problem => problem.code === code && problem.path === path && problem.ownerRef === (ownerRef || undefined) && problem.message === message)) return;
  const problem: D1InputProblem = { severity, code, path, message };
  if (ownerRef) problem.ownerRef = ownerRef;
  problems.push(problem);
}

function sortProblems(problems: D1InputProblem[]): D1InputProblem[] {
  return problems.slice().sort((left, right) => `${left.code}\0${left.path}\0${left.ownerRef || ''}`.localeCompare(`${right.code}\0${right.path}\0${right.ownerRef || ''}`));
}

function indexBy<T extends Record<string, unknown>>(rowsOf: T[], key: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rowsOf) {
    const id = text(row[key]);
    if (id) map.set(id, row);
  }
  return map;
}

function idList(value: unknown, key: string): string[] {
  return rows(value).map(row => text(row[key])).filter(Boolean);
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(rec) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
