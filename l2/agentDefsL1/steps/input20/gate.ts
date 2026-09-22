/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/gate.ts" enhancement="_blank"/>

import {
  D1_ACTIVE_STATUSES,
  D1_EFFORT_BACKEND_REF,
  D1_INPUT_VERSION,
  D1_PLANNER_FLOW,
  D1_SOURCE_SCHEMAS,
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
  type D1SelectedPort,
  type D1SelectedRoute,
  type D1SelectedTable,
  type D1SelectedUsecase,
  type D1SourceDigest,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

const BACKEND_PATH_TAIL = 'pool/l2/web/backend.json';

export function buildD1InputSnapshot(
  identity: { project: number; moduleName: string },
  artifacts: D1InputArtifacts,
  previous: D1InputSnapshot | null,
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
  const needs = rec(artifacts.needs);
  const backend = rec(artifacts.backend);
  const effort = rec(artifacts.effort);
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

  const plannerRun = readPlannerRun(problems, planner, paths, moduleName);
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
  const needPages = indexBy(rows(needs.pages), 'pageId');
  const effortScreens = indexBy(rows(effort.screens), 'pageId');
  const backendEndpoints = rows(backend.endpoints);
  const effortEndpoints = rows(effort.endpoints);
  const backendUsecases = indexBy(rows(backend.usecases), 'usecaseId');
  const effortUsecases = indexBy(rows(effort.usecases), 'usecaseId');
  const backendTables = indexBy(rows(backend.tables), 'tableId');
  const effortTables = indexBy(rows(effort.tables), 'tableId');
  const backendPorts = rows(backend.ports);

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

  const backendByRoute = indexBy(backendEndpoints.filter(row => text(row.status) !== 'toRemove'), 'route');
  const effortByRoute = indexBy(effortEndpoints.filter(row => text(row.status) !== 'toRemove'), 'route');
  const selectedRoutes: D1SelectedRoute[] = [];
  const routeIds = new Set([...backendByRoute.keys(), ...effortByRoute.keys()]);
  for (const route of [...routeIds].sort()) {
    const left = backendByRoute.get(route);
    const right = effortByRoute.get(route);
    if (!left || !right) {
      error(problems, 'DIVERGENT_SOURCE', !left ? paths.backend : paths.effort, `Route ${route} is not in both plans.`, route);
      continue;
    }
    const fields: Array<[string, string, string]> = [
      ['status', text(left.status), text(right.status)],
      ['page', text(left.page), text(right.page)],
      ['kind', text(left.kind), text(right.kind)],
      ['usecaseRef', text(left.usecaseRef), text(right.usecaseRef)],
    ];
    const mismatch = fields.find(([, a, b]) => a !== b);
    if (mismatch) {
      error(problems, 'DIVERGENT_SOURCE', paths.backend, `Route ${route} ${mismatch[0]} is '${mismatch[1]}' in backend and '${mismatch[2]}' in effort.`, route);
      continue;
    }
    if (!isActive(text(left.status))) continue;
    const page = text(left.page);
    if (!menuPages.has(page) || !needPages.has(page)) {
      error(problems, 'ORPHAN_ROUTE', paths.backend, `Route ${route} page ${page} is not in the menu and needs.`, route);
      continue;
    }
    selectedRoutes.push({
      route,
      page,
      kind: text(left.kind),
      usecaseRef: text(left.usecaseRef),
      status: text(left.status) as D1ActiveStatus,
    });
  }

  for (const screen of effortScreens.values()) {
    const pageId = text(screen.pageId);
    if (!pageId || text(screen.status) === 'toRemove') continue;
    const listed = strings(screen.endpoints).slice().sort();
    const planned = selectedRoutes.filter(route => route.page === pageId).map(route => route.route).sort();
    const orphans = strings(screen.endpoints).filter(route => {
      const row = backendByRoute.get(route);
      return !!row && (!menuPages.has(text(row.page)) || !needPages.has(text(row.page)));
    });
    if (orphans.length) continue;
    if (listed.join('\0') !== planned.join('\0')) {
      error(problems, 'DIVERGENT_SOURCE', paths.effort, `Screen ${pageId} endpoints do not match the selected routes.`, pageId);
    }
    if (listed.length === 0) {
      review(problems, 'SCREEN_WITHOUT_ROUTES', paths.effort, `Screen ${pageId} has no routes. No controller is planned.`, pageId);
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
    if (!isActive(text(left.status))) continue;
    const routes = selectedRoutes.filter(route => route.usecaseRef === usecaseId).map(route => route.route);
    if (!routes.length) {
      review(problems, 'USECASE_WITHOUT_ROUTE', paths.backend, `Usecase ${usecaseId} has no selected route.`, usecaseId);
    }
    const existing = text(left.existing);
    const identityId = resolveIdentity(problems, paths.backend, usecaseId, existing);
    selectedUsecases.push({
      usecaseId,
      entity: text(left.entity),
      operation: text(left.operation),
      status: text(left.status) as D1ActiveStatus,
      existing,
      identity: identityId,
      routes,
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
    selectedPorts.push({ portId, entity, status: status as D1ActiveStatus });
  }

  const removed = collectRemoved(problems, paths, backend, effort, selectedRoutes, selectedUsecases);
  const entityClosure = closeEntities(selectedUsecases, relationships, new Set(entityIds));
  const outbound = outboundEvents(integration);
  noteStale(problems, moduleName, sources, previous);
  noteChanges(problems, paths, backend, effort);
  notePayload(problems, moduleName, selectedUsecases, artifacts.entities);
  noteAccess(problems, paths.access, access, relationships);
  noteIntegration(problems, paths.integration, outbound);
  noteContracts(problems, moduleName, selectedRoutes, artifacts.contracts);

  const present = new Map(artifacts.presentDefs.map(item => [item.path, item.sha256]));
  const files = stampHashes(planFiles({
    moduleName,
    routes: selectedRoutes,
    usecases: selectedUsecases,
    ports: selectedPorts,
    tables: selectedTables,
    entities: entityClosure,
    outbound,
    grants: qualifyingGrants(access, entityClosure.ids),
    present,
    previous,
    problems,
  }), present);
  noteRemovals(problems, removed, previous, present);
  if (hasCycle(files)) error(problems, 'DAG_CYCLE', 'input.json', 'Planned files have a dependency cycle.');

  const pages = pageGroups(selectedRoutes);
  const snapshot: D1InputSnapshot = {
    schemaVersion: D1_INPUT_VERSION,
    project: identity.project,
    moduleName,
    device: 'web',
    plannerRun,
    sources,
    selection: {
      pages,
      routes: selectedRoutes,
      usecases: selectedUsecases,
      ports: selectedPorts,
      tables: selectedTables,
      entities: [...entityClosure.ids],
      outbound: outbound.map(item => item.id),
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
  for (const row of rows(rec(artifacts.backend).endpoints)) ids.add(text(row.page));
  for (const key of Object.keys(rec(rec(rec(artifacts.backend).meta).pages))) ids.add(key);
  return [...ids].filter(id => isSafeToken(id)).sort();
}

function planFiles(input: {
  moduleName: string;
  routes: D1SelectedRoute[];
  usecases: D1SelectedUsecase[];
  ports: D1SelectedPort[];
  tables: D1SelectedTable[];
  entities: { ids: string[]; owners: Map<string, string[]> };
  outbound: Array<{ id: string; on: string }>;
  grants: string[];
  present: Map<string, string>;
  previous: D1InputSnapshot | null;
  problems: D1InputProblem[];
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
      action: actionFor(worstStatus(owners, input.usecases), defPath, input.present, input.previous, input.problems, `entity:${entityId}`),
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
      action: actionFor(port.status, defPath, input.present, input.previous, input.problems, `port:${port.portId}`),
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
      action: actionFor(table.status, defPath, input.present, input.previous, input.problems, `table:${table.tableId}`),
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
      action: actionFor(worstOf(port.status, table.status), adapterPath, input.present, input.previous, input.problems, `adapter:${port.portId}`),
      identity: port.portId,
      ownerRefs: [`port:${port.portId}`, `table:${table.tableId}`],
      dependsOn: [`port:${port.portId}`, `table:${table.tableId}`],
    });
  }

  const scopeId = 'scope:access';
  if (input.grants.length) {
    const scopePath = `l1/${moduleName}/layer_2_application/scope/accessScope.defs.ts`;
    const authPath = `l1/${moduleName}/layer_1_external/auth/authorityMap.defs.ts`;
    const scopeStatus = input.usecases.length ? worstOfList(input.usecases.map(item => item.status)) : 'toCreate';
    add({
      id: scopeId,
      artifactType: 'accessScope',
      defPath: scopePath,
      action: actionFor(scopeStatus, scopePath, input.present, input.previous, input.problems, scopeId),
      identity: 'accessScope',
      ownerRefs: input.grants.map(grant => `grant:${grant}`),
      dependsOn: [],
    });
    add({
      id: 'auth:authorityMap',
      artifactType: 'authorityMap',
      defPath: authPath,
      action: actionFor(scopeStatus, authPath, input.present, input.previous, input.problems, 'auth:authorityMap'),
      identity: 'authorityMap',
      ownerRefs: input.grants.map(grant => `grant:${grant}`),
      dependsOn: [scopeId],
    });
  }

  for (const usecase of input.usecases) {
    if (!isSafeToken(usecase.identity)) continue;
    const defPath = `l1/${moduleName}/layer_2_application/usecases/${usecase.identity}.defs.ts`;
    const dependsOn = [
      input.entities.ids.includes(usecase.entity) ? `entity:${usecase.entity}` : '',
      ...usecasePorts(usecase, input.ports),
      input.grants.length ? scopeId : '',
    ].filter(Boolean);
    add({
      id: `usecase:${usecase.identity}`,
      artifactType: 'usecase',
      defPath,
      action: actionFor(usecase.status, defPath, input.present, input.previous, input.problems, `usecase:${usecase.usecaseId}`),
      identity: usecase.identity,
      ownerRefs: unique([`usecase:${usecase.usecaseId}`, ...usecase.routes.map(route => `endpoint:${route}`)]),
      dependsOn,
    });
  }

  for (const page of pageGroups(input.routes)) {
    if (!isSafeToken(page.pageId)) continue;
    const defPath = `l1/${moduleName}/layer_1_external/adapters/http/controllers/${page.pageId}.defs.ts`;
    const pageRoutes = input.routes.filter(route => route.page === page.pageId);
    const status = worstOfList(pageRoutes.map(route => route.status));
    const mixed = new Set(pageRoutes.map(route => route.status)).size > 1;
    const usecaseIds = unique(pageRoutes.map(route => {
      const usecase = input.usecases.find(item => item.usecaseId === route.usecaseRef);
      return usecase ? `usecase:${usecase.identity}` : '';
    }).filter(Boolean));
    add({
      id: `controller:${page.pageId}`,
      artifactType: 'httpController',
      defPath,
      action: mixed
        ? recomposeOrConflict(defPath, input.present, input.previous, input.problems, `controller:${page.pageId}`)
        : actionFor(status, defPath, input.present, input.previous, input.problems, `controller:${page.pageId}`),
      identity: page.pageId,
      ownerRefs: page.routes.map(route => `endpoint:${route}`),
      dependsOn: [...usecaseIds, ...(input.grants.length ? [scopeId] : [])],
    });
  }

  const adapters = files.filter(file => file.artifactType === 'repositoryAdapter');
  if (adapters.length) {
    const defPath = `l1/${moduleName}/layer_1_external/adapters/persistence/registerRepositories.defs.ts`;
    add({
      id: 'registration:repositories',
      artifactType: 'repositoryRegistration',
      defPath,
      action: actionFor(worstOfList(adapters.map(file => statusOfAction(file.action))), defPath, input.present, input.previous, input.problems, 'registration:repositories'),
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
      action: actionFor(table.status, defPath, input.present, input.previous, input.problems, `table:${table.tableId}`),
      identity: 'seeds',
      ownerRefs: input.tables.map(item => `table:${item.tableId}`),
      dependsOn: input.tables.map(item => `table:${item.tableId}`),
    });
    break;
  }
  if (input.outbound.length) {
    const defPath = `l1/${moduleName}/layer_1_external/adapters/integration/outbound.defs.ts`;
    const dependsOn = unique(input.outbound.map(event => {
      const transitionId = event.on.split('.')[1] || '';
      const usecase = input.usecases.find(item => item.usecaseId === transitionId || item.identity === transitionId);
      return usecase ? `usecase:${usecase.identity}` : '';
    }).filter(Boolean));
    add({
      id: 'integration:outbound',
      artifactType: 'integrationOutbound',
      defPath,
      action: actionFor('toCreate', defPath, input.present, input.previous, input.problems, 'integration:outbound'),
      identity: 'outbound',
      ownerRefs: input.outbound.map(event => `event:${event.id}`),
      dependsOn,
    });
  }

  return files.sort((left, right) => left.defPath.localeCompare(right.defPath));
}

function actionFor(
  status: D1ActiveStatus,
  defPath: string,
  present: Map<string, string>,
  previous: D1InputSnapshot | null,
  problems: D1InputProblem[],
  ownerRef: string,
): D1FileAction {
  const hash = present.get(defPath) || '';
  const receipt = previous?.files.find(file => file.defPath === defPath);
  const receiptHash = receipt ? presentHash(previous, defPath) : '';
  if (status === 'done') {
    if (!hash) {
      error(problems, 'DONE_ABSENT', defPath, `Done item ${ownerRef} has no file. It was not turned into toCreate.`, ownerRef);
      return 'preserve';
    }
    if (!receipt || !receiptHash || receiptHash !== hash) {
      error(problems, 'DONE_ABSENT', defPath, `Done item ${ownerRef} is not an inventoried path and hash.`, ownerRef);
      return 'preserve';
    }
    return 'preserve';
  }
  if (status === 'toUpdate') {
    if (!receipt || !receiptHash || !hash || receiptHash !== hash) {
      error(problems, 'EXISTING_UNRESOLVED', defPath, `Update of ${ownerRef} needs an inventoried path and hash. Ownership is not assumed by prefix.`, ownerRef);
      return 'conflict';
    }
    return 'update';
  }
  if (hash && (!receipt || !receiptHash || receiptHash !== hash)) {
    error(problems, 'EXISTS_WITHOUT_RECEIPT', defPath, `toCreate file ${defPath} exists without an inventoried path and hash.`, ownerRef);
    return 'conflict';
  }
  if (hash && receipt && receiptHash === hash) return 'recompose';
  const mixed = status === 'toCreate' ? 'create' : 'create';
  return mixed;
}

function recomposeOrConflict(
  defPath: string,
  present: Map<string, string>,
  previous: D1InputSnapshot | null,
  problems: D1InputProblem[],
  ownerRef: string,
): D1FileAction {
  const hash = present.get(defPath) || '';
  const receiptHash = presentHash(previous, defPath);
  if (hash && receiptHash && hash === receiptHash) return 'recompose';
  if (!hash && !receiptHash) return 'create';
  error(problems, 'EXISTING_UNRESOLVED', defPath, `Recompose of ${ownerRef} needs an inventoried path and hash.`, ownerRef);
  return 'conflict';
}

function stampHashes(files: D1PlannedFile[], present: Map<string, string>): D1PlannedFile[] {
  for (const file of files) {
    const hash = present.get(file.defPath) || '';
    if (hash && file.action !== 'create' && file.action !== 'conflict') file.contentHash = hash;
  }
  return files;
}

function presentHash(previous: D1InputSnapshot | null, defPath: string): string {
  return previous?.files.find(item => item.defPath === defPath)?.contentHash || '';
}

function resolveIdentity(problems: D1InputProblem[], path: string, usecaseId: string, existing: string): string {
  if (!existing) return usecaseId;
  if (isSafeToken(existing)) return existing;
  error(problems, 'EXISTING_UNRESOLVED', path, `existing '${existing}' is not an id. A path prefix is not ownership.`, usecaseId);
  return usecaseId;
}

function collectRemoved(
  problems: D1InputProblem[],
  paths: ReturnType<typeof inputPaths>,
  backend: Record<string, unknown>,
  effort: Record<string, unknown>,
  routes: D1SelectedRoute[],
  usecases: D1SelectedUsecase[],
): D1RemovedItem[] {
  const backendRemoved = rows(backend.removed).map(row => ({ kind: text(row.kind), id: text(row.id), status: text(row.status) }));
  const effortRemoved = rows(effort.removed).map(row => ({ kind: text(row.kind), id: text(row.id), status: text(row.status) }));
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
    if (item.kind === 'usecase' && routes.some(route => route.usecaseRef === item.id)) {
      error(problems, 'REMOVE_STILL_REFERENCED', paths.effort, `Usecase ${item.id} is toRemove but a selected route still uses it.`, item.id);
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

function noteRemovals(
  problems: D1InputProblem[],
  removed: D1RemovedItem[],
  previous: D1InputSnapshot | null,
  present: Map<string, string>,
): void {
  for (const item of removed) {
    const receipt = previous?.files.find(file => file.identity === item.id || file.ownerRefs.includes(`${item.kind}:${item.id}`) || file.ownerRefs.includes(`endpoint:${item.id}`));
    const hash = receipt ? present.get(receipt.defPath) : '';
    if (receipt && hash && presentHash(previous, receipt.defPath) === hash) {
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
): void {
  const transitions = usecases.filter(usecase => usecase.operation === 'transition');
  const cited = new Map<string, number>();
  const perUsecase: Array<{ usecase: D1SelectedUsecase; rules: string[]; path: string }> = [];
  for (const usecase of transitions) {
    const entity = rec(entities[usecase.entity]);
    const transition = rows(entity.transitions).find(row => text(row.transitionId) === usecase.usecaseId);
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
    const transition = rows(entity.transitions).find(row => text(row.transitionId) === item.usecase.usecaseId);
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

function noteIntegration(problems: D1InputProblem[], path: string, outbound: Array<{ id: string }>): void {
  for (const event of outbound) {
    review(problems, 'INTEGRATION_UNBOUND', path, `Outbound ${event.id} is preserved. No runtime mechanism is named on the integration artifact.`, event.id);
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

function noteContracts(
  problems: D1InputProblem[],
  moduleName: string,
  routes: D1SelectedRoute[],
  contracts: Record<string, unknown | null>,
): void {
  const pages = unique(routes.map(route => route.page));
  for (const pageId of pages) {
    const path = contractPath(moduleName, pageId);
    const value = contracts[pageId];
    if (value == null) {
      error(problems, 'CONTRACT_ABSENT', path, `L2 contract for ${pageId} is absent. The inventory stays readable and consumer phases are not released.`, pageId);
      continue;
    }
    const doc = rec(value);
    if (!Object.keys(doc).length || (text(doc.moduleName) && text(doc.moduleName) !== moduleName) || (text(doc.pageId) && text(doc.pageId) !== pageId)) {
      error(problems, 'CONTRACT_INVALID', path, `L2 contract for ${pageId} does not match the module and page.`, pageId);
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

function readPlannerRun(
  problems: D1InputProblem[],
  planner: Record<string, unknown>,
  paths: ReturnType<typeof inputPaths>,
  moduleName: string,
): D1InputSnapshot['plannerRun'] {
  if (!Object.keys(planner).length) return null;
  const plan20 = rec(rec(planner.steps).plan20);
  const artifacts = strings(plan20.artifactPaths);
  const backendArtifact = `l4/${moduleName}/${BACKEND_PATH_TAIL}`;
  if (text(planner.flowId) !== D1_PLANNER_FLOW || text(plan20.status) !== 'approved' || !artifacts.includes(backendArtifact) || !text(planner.thread)) {
    error(problems, 'PLANNER_RUN_DIVERGENT', paths.planner, 'Planner run does not approve this backend.json for this module.');
  }
  if (!text(planner.thread)) return null;
  return {
    flowId: text(planner.flowId),
    thread: text(planner.thread),
    round: typeof planner.round === 'number' ? planner.round : 0,
    schemaVersion: text(planner.schemaVersion),
  };
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
  schema: string,
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
  if (text(doc.schemaVersion) !== schema) {
    error(problems, 'SCHEMA_DIVERGENT', path, `Schema is '${text(doc.schemaVersion) || '(missing)'}', expected ${schema}.`);
  }
  const name = text(doc.moduleName) || text(doc.module);
  if (name && name !== moduleName) {
    error(problems, 'MODULE_DIVERGENT', path, `Module is '${name}', expected ${moduleName}.`);
  }
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

function pageGroups(routes: D1SelectedRoute[]): Array<{ pageId: string; routes: string[] }> {
  const pages = new Map<string, string[]>();
  for (const route of routes) {
    const list = pages.get(route.page) || [];
    list.push(route.route);
    pages.set(route.page, list);
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

function worstOfList(statuses: D1ActiveStatus[]): D1ActiveStatus {
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

function indexBy(rowsOf: Array<Record<string, unknown>>, key: string): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
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
