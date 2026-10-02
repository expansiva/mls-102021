/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/oracleModule.ts" enhancement="_blank"/>

/**
 * Neutral module for the memory tests of m1_27/m1_28: defs, contracts and the p1_12 testSupport.
 * v2 since m1_40 r2: page requests (requestService), v2 controllers and the L2 contract v2.
 * Every id comes from `Names`, so a renamed copy must derive the same. Test support only.
 */

import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { deriveCatalog, type DerivedCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';

/**
 * `Parent` is a local entity the main one references (related data, created first); `Mdm` is an
 * MDM entity the runtime owns (the fixture never creates it).
 */
export interface Names {
  project: string; mod: string; Entity: string; entity: string; owner: string; org: string; Anchor: string; ownerField: string; note: string; related: string;
  Parent: string; parent: string; parentField: string; Mdm: string; mdmField: string;
  /** Pages and request ids: routes are `<mod>.<page>.<requestId>`, nothing in the name says qry/cmd. */
  pageA: string; pageB: string; reqList: string; reqDock: string; reqAmend: string; reqRoster: string; reqSail: string;
}
export const BASE: Names = {
  project: '_102097_', mod: 'tideBoard', Entity: 'Berth', entity: 'berth', owner: 'pilot', org: 'harbor',
  Anchor: 'Pilot', ownerField: 'pilotId', note: 'pilotNote', related: 'berthShip',
  Parent: 'Ship', parent: 'ship', parentField: 'shipId', Mdm: 'Agency', mdmField: 'agencyId',
  pageA: 'office', pageB: 'deck', reqList: 'tideList', reqDock: 'moorIt', reqAmend: 'amendIt', reqRoster: 'deckRoster', reqSail: 'sailIt',
};
export const RENAMED: Names = {
  project: '_102096_', mod: 'quayLine', Entity: 'Slip', entity: 'slip', owner: 'skipper', org: 'warden',
  Anchor: 'Skipper', ownerField: 'skipperId', note: 'skipperMemo', related: 'slipVessel',
  Parent: 'Hull', parent: 'hull', parentField: 'hullRef', Mdm: 'Broker', mdmField: 'brokerRef',
  pageA: 'yard', pageB: 'helm', reqList: 'slipList', reqDock: 'tieUp', reqAmend: 'reviseIt', reqRoster: 'helmRoster', reqSail: 'castOff',
};

export interface Fixture {
  n: Names;
  refs: {
    entity: string; port: string; parentEntity: string; parentPort: string; scope: string; authority: string;
    uc: (id: string) => string; ctrl: (page: string) => string; request: (page: string) => string;
    /** L2 contract v2 of page A and page B (project-qualified). */
    contractA: string; contractB: string; ontology: string;
  };
  /** `backend.json.testSupport[]` in the p1_12 shape, as the planner derives it for this module. */
  testSupport: unknown[];
  /** `dock` is the command with two usecases (rollback case); `amend` and `sail` have one. */
  routes: { list: string; dock: string; amend: string; roster: string; sail: string };
  defs: Array<[string, string, M1Definition]>;
  controllers: Array<[string, M1Definition]>;
  texts: Record<string, string>;
}

export function fixture(n: Names): Fixture {
  const L1 = `${n.project}/l1/${n.mod}`;
  const contractPath = (page: string) => `l2/${n.mod}/web/contracts/${page}.defs.ts`;
  const refs = {
    entity: `${L1}/layer_3_domain/entities/${n.entity}.defs.ts`,
    port: `${L1}/layer_2_application/ports/${n.entity}Repository.defs.ts`,
    parentEntity: `${L1}/layer_3_domain/entities/${n.parent}.defs.ts`,
    parentPort: `${L1}/layer_2_application/ports/${n.parent}Repository.defs.ts`,
    scope: `${L1}/layer_2_application/scope/accessScope.defs.ts`,
    authority: `${L1}/layer_1_external/auth/authorityMap.defs.ts`,
    uc: (id: string) => `${L1}/layer_2_application/usecases/${id}.defs.ts`,
    ctrl: (page: string) => `${L1}/layer_1_external/adapters/http/controllers/${page}.defs.ts`,
    request: (page: string) => `${L1}/layer_2_application/requests/${page}.defs.ts`,
    contractA: `${n.project}/${contractPath(n.pageA)}`,
    contractB: `${n.project}/${contractPath(n.pageB)}`,
    ontology: `${n.project}/l4/${n.mod}/ontology/${n.Entity}.defs.ts`,
  };
  const E = n.Entity;
  const routes = {
    list: `${n.mod}.${n.pageA}.${n.reqList}`,
    dock: `${n.mod}.${n.pageA}.${n.reqDock}`,
    amend: `${n.mod}.${n.pageA}.${n.reqAmend}`,
    roster: `${n.mod}.${n.pageB}.${n.reqRoster}`,
    sail: `${n.mod}.${n.pageB}.${n.reqSail}`,
  };
  const def = (artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition =>
    ({ schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: n.mod, status: 'pending', dependencies: [...dependencies].sort(), data } as M1Definition);
  const lifecycle = {
    states: [{ state: 'sailed', reachedBy: 'actor' }, { state: 'cancelled', reachedBy: 'actor' }, { state: 'moored', reachedBy: 'actor' }],
    transitions: [
      { transitionId: 'markCancelled', from: ['moored'], to: 'cancelled', by: [n.org], ruleRefs: [] },
      { transitionId: 'markSailed', from: ['moored'], to: 'sailed', by: [n.owner], ruleRefs: [] },
    ],
  };
  const entity = def('domainEntity', E, [], {
    entityId: E,
    storageTarget: 'moduleDatabase',
    fields: [
      { name: 'id', type: 'uuid', derived: true },
      { name: 'version', type: 'integer', derived: true },
      { name: n.parentField, type: 'record', ref: n.Parent },
      { name: n.mdmField, type: 'record', ref: n.Mdm },
      { name: n.ownerField, type: 'record', ref: n.Anchor },
      { name: 'dockAt', type: 'timestamp' },
      { name: 'stage', type: 'enum' },
      { name: 'details', type: 'object' },
      { name: 'details.tideCheck', type: 'object' },
      { name: 'details.tideCheck.doneAt', type: 'timestamp' },
      { name: `details.${n.note}`, type: 'text' },
      // Related record carried on the row; no grant discloses it.
      { name: n.related, type: 'object' },
      { name: `${n.related}.id`, type: 'text' },
      { name: `${n.related}.details`, type: 'object' },
      { name: `${n.related}.details.secret`, type: 'text' },
    ],
    lifecycle,
    invariants: [],
    imports: [],
  });
  const port = def('repositoryPort', `${E}Repository`, [refs.entity], {
    entityId: E,
    interfaceName: `${E}Repository`,
    methods: [
      { name: 'create', params: [E], returns: E },
      { name: 'list', params: [`${E}Filter`], returns: `${E}[]` },
      { name: 'update', params: [E], returns: E },
      { name: 'transition', params: [E, 'transitionId'], returns: E },
    ],
  });
  const parentEntity = def('domainEntity', n.Parent, [], {
    entityId: n.Parent,
    storageTarget: 'moduleDatabase',
    fields: [{ name: 'id', type: 'uuid', derived: true }, { name: 'version', type: 'integer', derived: true }, { name: 'label', type: 'text' }],
    lifecycle: { states: [], transitions: [] },
    invariants: [],
    imports: [],
  });
  const parentPort = def('repositoryPort', `${n.Parent}Repository`, [refs.parentEntity], {
    entityId: n.Parent,
    interfaceName: `${n.Parent}Repository`,
    methods: [{ name: 'create', params: [n.Parent], returns: n.Parent }, { name: 'list', params: [`${n.Parent}Filter`], returns: `${n.Parent}[]` }],
  });
  // v2 usecases: no contractRefs and no routeProjections; the page request names them in `uses`.
  const usecase = (id: string, entityId: string, portRef: string, entityRef: string, operation: string, extra: Record<string, unknown> = {}): M1Definition =>
    def('usecase', id, [portRef, entityRef, refs.ontology], {
      usecaseId: id,
      entityId,
      operation,
      ports: [`${entityId}Repository`],
      functions: [{ functionName: id, input: [], output: [] }],
      portCalls: [operation],
      effects: [],
      uses: [{ path: 'id', role: operation === 'list' ? 'filter' : 'selector', source: 'input' }],
      rulesApplied: [],
      rules: [],
      rulePlan: [],
      sequence: [{ kind: 'port', call: operation, port: `${entityId}Repository` }],
      transactional: false,
      transaction: { boundary: 'none' },
      ...extra,
    });
  const create = usecase(`create${E}`, E, refs.port, refs.entity, 'create');
  const createParent = usecase(`create${n.Parent}`, n.Parent, refs.parentPort, refs.parentEntity, 'create');
  const update = usecase(`update${E}`, E, refs.port, refs.entity, 'update');
  const list = usecase(`list${E}`, E, refs.port, refs.entity, 'list');
  const sail = usecase('markSailed', E, refs.port, refs.entity, 'transition', {
    lifecycle: { transitionId: 'markSailed', payload: [`details.${n.note}`] },
  });
  const keep = ['id', 'version', n.parentField, n.ownerField, 'dockAt', 'stage'].map(field => `${E}.${field}`);
  const scope = def('accessScope', 'accessScope', [], {
    scopeId: 'accessScope',
    grants: [
      {
        grantId: `${n.org}Office`, actorRef: n.org, entityRefs: [E], disclosure: 'fieldsOnly',
        allowedFields: [...keep, `${E}.details.tideCheck`], scopeMode: 'organization', session: 'verified',
        path: [{ entityId: E, steps: [], pending: '' }], pending: '',
      },
      {
        grantId: `${n.owner}Deck`, actorRef: n.owner, anchorEntity: n.Anchor, entityRefs: [E, n.Anchor], disclosure: 'fieldsOnly',
        allowedFields: [...keep, `${E}.details.${n.note}`], scopeMode: 'own', session: 'verified',
        path: [
          { entityId: E, steps: [{ relationshipId: `${n.entity}${n.Anchor}`, from: E, to: n.Anchor, field: `${E}.${n.ownerField}` }], pending: '' },
          { entityId: n.Anchor, steps: [], pending: '' },
        ],
        pending: '',
      },
    ],
  });
  const authority = def('authorityMap', 'authorityMap', [refs.scope], {
    mapId: 'authorityMap',
    entries: [{ grantId: `${n.org}Office`, actorRef: n.org }, { grantId: `${n.owner}Deck`, actorRef: n.owner }],
  });
  // Page requests (requestService), in the shape of the bench.
  const rowFields = ['id', 'version', n.parentField, n.ownerField, 'dockAt', 'stage', 'details.tideCheck.doneAt', `${n.related}.id`, `${n.related}.details.secret`];
  const deckFields = [...rowFields, `details.${n.note}`];
  const rowsKey = `${n.entity}Rows`;
  const one = (fields: string[]) => [{ key: n.entity, entity: E, fields }];
  const pageParams = (list: string) => [{ name: 'page', target: rowsKey, pages: list }, { name: 'pageSize', target: rowsKey, pages: list }];
  const requestA = def('requestService', n.pageA, [refs.uc(create.artifactId), refs.uc(createParent.artifactId), refs.uc(update.artifactId), refs.uc(list.artifactId)], {
    pageId: n.pageA,
    requests: [
      { route: routes.list, kind: 'qry', uses: [list.artifactId], transaction: 'none', outputs: [{ key: rowsKey, entity: E, fields: rowFields }], params: pageParams(`${n.pageA}Rows`) },
      // Two usecases: the parent row, then the entity row. The second failing must leave nothing written.
      { route: routes.dock, kind: 'cmd', uses: [createParent.artifactId, create.artifactId], transaction: 'single', outputs: one(rowFields), params: [] },
      { route: routes.amend, kind: 'cmd', uses: [update.artifactId], transaction: 'single', outputs: one(rowFields), params: [] },
    ],
  });
  const requestB = def('requestService', n.pageB, [refs.uc(sail.artifactId), refs.uc(list.artifactId)], {
    pageId: n.pageB,
    requests: [
      { route: routes.roster, kind: 'qry', uses: [list.artifactId], transaction: 'none', outputs: [{ key: rowsKey, entity: E, fields: deckFields }], params: pageParams(`${n.pageB}Rows`) },
      { route: routes.sail, kind: 'cmd', uses: [sail.artifactId], transaction: 'single', outputs: one(deckFields), params: [] },
    ],
  });
  const pascal = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const handler = (route: string, kind: string, page: string, grant: string) => ({
    route, kind, grantIds: [grant], serviceFunction: route, contractPath: contractPath(page), contractInterface: `${pascal(page)}Contracts`,
  });
  const office = def('httpController', n.pageA, [refs.authority, refs.scope, refs.request(n.pageA)], {
    pageId: n.pageA,
    handlers: [
      handler(routes.dock, 'command', n.pageA, `${n.org}Office`),
      handler(routes.amend, 'command', n.pageA, `${n.org}Office`),
      handler(routes.list, 'query', n.pageA, `${n.org}Office`),
    ],
  });
  const deck = def('httpController', n.pageB, [refs.authority, refs.scope, refs.request(n.pageB)], {
    pageId: n.pageB,
    handlers: [
      handler(routes.sail, 'command', n.pageB, `${n.owner}Deck`),
      handler(routes.roster, 'query', n.pageB, `${n.owner}Deck`),
    ],
  });
  // L2 contracts v2, rendered by the promoted helper.
  const related = `  ${n.related}?: {\n    id: string;\n    details?: {\n      secret?: string;\n    };\n  };`;
  const rowBody = (details: string) => `  id: string;\n  version: number;\n  ${n.parentField}: string;\n  ${n.ownerField}: string;\n  dockAt: string;\n  stage: 'moored' | 'cancelled' | 'sailed';\n  details: {\n${details}\n  };\n${related}`;
  const tide = '    tideCheck?: {\n      doneAt: string;\n    };';
  const listInput = `{ id?: string; ${n.parentField}?: string; ${n.ownerField}?: string; stage?: 'moored' | 'cancelled' | 'sailed'; page?: number; pageSize?: number }`;
  const paging = { page: 'pageRows', pageSize: 'pageSizeRows', hasMore: 'hasMoreRows' };
  const listOutput = (row: string) => `{ ${rowsKey}: ${row}[]; pageRows: number; pageSizeRows: number; hasMoreRows: boolean }`;
  const listMeta = (page: string) => ({ output: { [rowsKey]: { entity: E, many: true } }, lists: { [`${page}Rows`]: { key: rowsKey, ...paging } }, params: {} });
  const oneMeta = { output: { [n.entity]: { entity: E, many: false } }, lists: {}, params: {} };
  const access = (actor: string, grant: string) => ({ actors: [actor], grants: [grant], scope: 'organization' });
  const project = Number(n.project.replace(/_/g, ''));
  const rowA = `${E}${pascal(n.pageA)}Row`;
  const rowB = `${E}${pascal(n.pageB)}Row`;
  const contractA = renderD2ContractV2({ project, module: n.mod, pageId: n.pageA }, {
    module: n.mod, pageId: n.pageA,
    projections: [{ name: rowA, entityId: E, requestIds: [], body: rowBody(tide) }],
    routes: [
      { route: routes.list, kind: 'qry', input: listInput, output: listOutput(rowA), meta: listMeta(n.pageA), rules: [], access: access(n.org, `${n.org}Office`) },
      {
        route: routes.dock, kind: 'cmd', writes: `${E}.create`,
        input: `{ ${n.parentField}: string; ${n.mdmField}: string; ${n.ownerField}: string; dockAt: string; details: { tideCheck?: { doneAt: string } } }`,
        output: `{ ${n.entity}: ${rowA} }`, meta: oneMeta, rules: [], access: access(n.org, `${n.org}Office`),
      },
      {
        route: routes.amend, kind: 'cmd', writes: `${E}.update`,
        input: `{ id: string; ${n.parentField}?: string; dockAt?: string; details?: { tideCheck?: { doneAt?: string } } }`,
        output: `{ ${n.entity}: ${rowA} }`, meta: oneMeta, rules: [], access: access(n.org, `${n.org}Office`),
      },
    ],
  });
  const contractB = renderD2ContractV2({ project, module: n.mod, pageId: n.pageB }, {
    module: n.mod, pageId: n.pageB,
    projections: [{ name: rowB, entityId: E, requestIds: [], body: rowBody(`${tide}\n    ${n.note}?: string;`) }],
    routes: [
      { route: routes.roster, kind: 'qry', input: listInput, output: listOutput(rowB), meta: listMeta(n.pageB), rules: [], access: access(n.owner, `${n.owner}Deck`) },
      {
        route: routes.sail, kind: 'cmd', writes: `${E}.markSailed`, input: `{ id: string; details: { ${n.note}: string } }`,
        output: `{ ${n.entity}: ${rowB} }`, meta: oneMeta, rules: [], access: access(n.owner, `${n.owner}Deck`),
      },
    ],
  });
  const ontology = {
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: n.mod, entityId: E, kind: 'entity',
    record: { fields: { id: { type: 'uuid', required: true, derived: true }, stage: { type: 'enum', required: true } } },
    lifecycleStates: lifecycle.states,
    transitions: lifecycle.transitions,
  };
  const asSource = (definition: M1Definition) => `export const definition = ${JSON.stringify(definition)} as const;\n`;
  const defs: Array<[string, string, M1Definition]> = [
    ['implement.domainEntity', refs.entity, entity],
    ['implement.repositoryPort', refs.port, port],
    ['implement.domainEntity', refs.parentEntity, parentEntity],
    ['implement.repositoryPort', refs.parentPort, parentPort],
    ['implement.accessScope', refs.scope, scope],
    ['implement.authorityMap', refs.authority, authority],
    ['implement.usecase', refs.uc(create.artifactId), create],
    ['implement.usecase', refs.uc(createParent.artifactId), createParent],
    ['implement.usecase', refs.uc(update.artifactId), update],
    ['implement.usecase', refs.uc(list.artifactId), list],
    ['implement.usecase', refs.uc(sail.artifactId), sail],
    ['implement.requestService', refs.request(n.pageA), requestA],
    ['implement.requestService', refs.request(n.pageB), requestB],
  ];
  const controllers: Array<[string, M1Definition]> = [[refs.ctrl(n.pageA), office], [refs.ctrl(n.pageB), deck]];
  const texts: Record<string, string> = {
    [refs.contractA]: contractA,
    [refs.contractB]: contractB,
    [refs.ontology]: `export const ${n.mod}Entity${E} = ${JSON.stringify(ontology, null, 2)} as const;\n`,
  };
  for (const [, ref, definition] of defs) texts[ref] = asSource(definition);
  for (const [ref, definition] of controllers) texts[ref] = asSource(definition);
  const testSupport = [
    {
      id: `data:${E}`, actorRefs: [n.org, n.owner].sort(), entityRefs: [E, n.Anchor, n.Mdm, n.Parent].sort(),
      sourceRefs: [`ontology:${E}/lifecycleStates/moored`], status: 'toCreate', owner: 'L1', executorRef: '', cleanupRef: '',
      gap: `FIXTURE_EXECUTOR_UNREFERENCED: no executor for ${n.entity} rows`,
    },
    {
      id: `data:${n.Parent}`, actorRefs: [n.org], entityRefs: [n.Parent], sourceRefs: [], status: 'toCreate', owner: 'L1',
      executorRef: '', cleanupRef: '', gap: `FIXTURE_EXECUTOR_UNREFERENCED: no executor for ${n.parent} rows`,
    },
    {
      id: `identity:${n.org}`, actorRefs: [n.org], entityRefs: [], sourceRefs: [`access:actors/${n.org}`], status: 'toCreate', owner: 'runtime',
      executorRef: '', cleanupRef: '', gap: 'PERSON_ENTITY_UNDECLARED: the actor names no personEntity',
    },
    {
      id: `identity:${n.owner}`, actorRefs: [n.owner], entityRefs: [n.Anchor], sourceRefs: [`access:actors/${n.owner}`], status: 'toCreate', owner: 'runtime',
      executorRef: '', cleanupRef: '', gap: 'RUNTIME_TEST_IDENTITY_UNREFERENCED: no runtime API provisions this test identity',
    },
    {
      id: `mdm:${n.Mdm}`, actorRefs: [n.org], entityRefs: [n.Mdm], sourceRefs: [`ontology:${E}/relationships`], status: 'toCreate', owner: 'runtime',
      executorRef: '', cleanupRef: '', gap: 'RUNTIME_MDM_FIXTURE_UNREFERENCED: no runtime API creates this MDM record',
    },
  ];
  return { n, refs, testSupport, routes, defs, controllers, texts };
}

export function derive(fx: Fixture, texts: Record<string, string> = fx.texts): DerivedCatalog {
  const units: PlanUnitInput[] = [...fx.defs.map(([, defPath, definition]) => ({ defPath, definition })), ...fx.controllers.map(([defPath, definition]) => ({ defPath, definition }))];
  return deriveCatalog(fx.n.mod, units, texts);
}

/** Local tables persistence40 would plan for this module. */
export function tablesOf(fx: Fixture): Array<{ tableId: string; entityId: string }> {
  return [{ tableId: fx.n.entity, entityId: fx.n.Entity }, { tableId: fx.n.parent, entityId: fx.n.Parent }];
}

export function definitionsOf(fx: Fixture): Map<string, M1Definition> {
  return new Map([...fx.defs.map(([, ref, definition]) => [ref, definition] as const), ...fx.controllers]);
}
