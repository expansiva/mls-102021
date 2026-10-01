/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/oracleModule.ts" enhancement="_blank"/>

/**
 * Neutral module for the memory tests of m1_27/m1_28: defs, contracts and the p1_12 testSupport.
 * Every id comes from `Names`, so a renamed copy must derive the same. Test support only.
 */

import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { deriveCatalog, type DerivedCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';

/**
 * `Parent` is a local entity the main one references (related data, created first); `Mdm` is an
 * MDM entity the runtime owns (the fixture never creates it).
 */
export interface Names {
  project: string; mod: string; Entity: string; entity: string; owner: string; org: string; Anchor: string; ownerField: string; note: string; related: string;
  Parent: string; parent: string; parentField: string; Mdm: string; mdmField: string;
}
export const BASE: Names = {
  project: '_102097_', mod: 'tideBoard', Entity: 'Berth', entity: 'berth', owner: 'pilot', org: 'harbor',
  Anchor: 'Pilot', ownerField: 'pilotId', note: 'pilotNote', related: 'berthShip',
  Parent: 'Ship', parent: 'ship', parentField: 'shipId', Mdm: 'Agency', mdmField: 'agencyId',
};
export const RENAMED: Names = {
  project: '_102096_', mod: 'quayLine', Entity: 'Slip', entity: 'slip', owner: 'skipper', org: 'warden',
  Anchor: 'Skipper', ownerField: 'skipperId', note: 'skipperMemo', related: 'slipVessel',
  Parent: 'Hull', parent: 'hull', parentField: 'hullRef', Mdm: 'Broker', mdmField: 'brokerRef',
};

export interface Fixture {
  n: Names;
  refs: {
    entity: string; port: string; parentEntity: string; parentPort: string; scope: string; authority: string;
    uc: (id: string) => string; ctrl: (page: string) => string; office: string; deck: string; ontology: string;
  };
  /** `backend.json.testSupport[]` in the p1_12 shape, as the planner derives it for this module. */
  testSupport: unknown[];
  routes: { create: string; update: string; officeList: string; deckList: string; sail: string };
  defs: Array<[string, string, M1Definition]>;
  controllers: Array<[string, M1Definition]>;
  texts: Record<string, string>;
}

export function fixture(n: Names): Fixture {
  const L1 = `${n.project}/l1/${n.mod}`;
  const refs = {
    entity: `${L1}/layer_3_domain/entities/${n.entity}.defs.ts`,
    port: `${L1}/layer_2_application/ports/${n.entity}Repository.defs.ts`,
    parentEntity: `${L1}/layer_3_domain/entities/${n.parent}.defs.ts`,
    parentPort: `${L1}/layer_2_application/ports/${n.parent}Repository.defs.ts`,
    scope: `${L1}/layer_2_application/scope/accessScope.defs.ts`,
    authority: `${L1}/layer_1_external/auth/authorityMap.defs.ts`,
    uc: (id: string) => `${L1}/layer_2_application/usecases/${id}.defs.ts`,
    ctrl: (page: string) => `${L1}/layer_1_external/adapters/http/controllers/${page}.defs.ts`,
    office: `${n.project}/l2/${n.mod}/web/contracts/office.defs.ts`,
    deck: `${n.project}/l2/${n.mod}/web/contracts/deck.defs.ts`,
    ontology: `${n.project}/l4/${n.mod}/ontology/${n.Entity}.defs.ts`,
  };
  const E = n.Entity;
  const routes = {
    create: `${n.mod}.office.cmdCreate${E}`,
    update: `${n.mod}.office.cmdUpdate${E}`,
    officeList: `${n.mod}.office.qryList${E}`,
    deckList: `${n.mod}.deck.qryList${E}`,
    sail: `${n.mod}.deck.cmdMarkSailed`,
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
  const out = ['id', 'version', n.parentField, n.ownerField, 'dockAt', 'stage', 'details', n.related];
  const usecase = (id: string, operation: string, rs: Array<[string, string, string]>, extra: Record<string, unknown> = {}): M1Definition =>
    def('usecase', id, [refs.port, refs.entity, ...new Set(rs.map(item => item[2])), refs.ontology], {
      usecaseId: id,
      entityId: E,
      operation,
      ports: [`${E}Repository`],
      functions: [{ functionName: id, input: [], output: [], contractRefs: rs.map(([route, symbol]) => ({ route, symbol })) }],
      routeProjections: rs.map(([route, , contract]) => ({ route, contractPath: contract.replace(`${n.project}/`, ''), projection: 'declared', outputFields: out })),
      portCalls: [operation],
      effects: [],
      uses: [{ path: 'id', role: operation === 'list' ? 'filter' : 'selector', source: 'input' }],
      rulesApplied: [],
      rules: [],
      rulePlan: [],
      sequence: [{ kind: 'port', call: operation, port: `${E}Repository` }],
      transactional: false,
      transaction: { boundary: 'none' },
      ...extra,
    });
  const create = usecase(`create${E}`, 'create', [[routes.create, `Create${E}Output`, refs.office]]);
  const update = usecase(`update${E}`, 'update', [[routes.update, `Update${E}Output`, refs.office]]);
  const list = usecase(`list${E}`, 'list', [[routes.officeList, `List${E}Output`, refs.office], [routes.deckList, `List${E}Output`, refs.deck]]);
  const sail = usecase('markSailed', 'transition', [[routes.sail, 'MarkSailedOutput', refs.deck]], {
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
  const office = def('httpController', 'office', [refs.authority, refs.scope, refs.uc(create.artifactId), refs.uc(update.artifactId), refs.uc(list.artifactId)], {
    pageId: 'office',
    handlers: [
      { route: routes.create, kind: 'command', usecaseId: create.artifactId, grantIds: [`${n.org}Office`] },
      { route: routes.update, kind: 'command', usecaseId: update.artifactId, grantIds: [`${n.org}Office`] },
      { route: routes.officeList, kind: 'query', usecaseId: list.artifactId, grantIds: [`${n.org}Office`] },
    ],
  });
  const deck = def('httpController', 'deck', [refs.authority, refs.scope, refs.uc('markSailed'), refs.uc(list.artifactId)], {
    pageId: 'deck',
    handlers: [
      { route: routes.sail, kind: 'command', usecaseId: 'markSailed', grantIds: [`${n.owner}Deck`] },
      { route: routes.deckList, kind: 'query', usecaseId: list.artifactId, grantIds: [`${n.owner}Deck`] },
    ],
  });
  const related = `  "${n.related}"?: {\n    "id": string;\n    "details"?: {\n      "secret"?: string;\n    };\n  };`;
  const recordOut = (details: string) => `{\n  "id": string;\n  "version": number;\n  "${n.parentField}": string;\n  "${n.ownerField}": string;\n  "dockAt": string;\n  "stage": "moored" | "cancelled" | "sailed";\n  "details": {\n${details}\n  };\n${related}\n}`;
  const listInput = `export interface List${E}Input {\n  "id"?: string;\n  "${n.parentField}"?: string;\n  "${n.ownerField}"?: string;\n  "stage"?: "moored" | "cancelled" | "sailed";\n  "page"?: number;\n}`;
  const tide = '    "tideCheck"?: {\n      "doneAt": string;\n    };';
  const officeText = [
    `export interface Create${E}Input {\n  "${n.parentField}": string;\n  "${n.mdmField}": string;\n  "${n.ownerField}": string;\n  "dockAt": string;\n  "details": {\n    "tideCheck"?: {\n      "doneAt": string;\n    };\n  };\n}`,
    `export interface Create${E}Output ${recordOut(tide)}`,
    `export interface Update${E}Input {\n  "id": string;\n  "${n.parentField}"?: string;\n  "dockAt"?: string;\n  "details"?: {\n    "tideCheck"?: {\n      "doneAt"?: string;\n    };\n  };\n}`,
    `export interface Update${E}Output ${recordOut(tide)}`,
    listInput,
    `export interface List${E}Item ${recordOut(tide)}`,
    `export type List${E}Output = List${E}Item[];`,
  ].join('\n\n');
  const deckDetails = `${tide}\n    "${n.note}"?: string;`;
  const deckText = [
    `export interface MarkSailedInput {\n  "id": string;\n  "details": {\n    "${n.note}": string;\n  };\n}`,
    `export interface MarkSailedOutput ${recordOut(deckDetails)}`,
    listInput,
    `export interface List${E}Item ${recordOut(deckDetails)}`,
    `export type List${E}Output = List${E}Item[];`,
  ].join('\n\n');
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
    ['implement.usecase', refs.uc(update.artifactId), update],
    ['implement.usecase', refs.uc(list.artifactId), list],
    ['implement.usecase', refs.uc('markSailed'), sail],
  ];
  const controllers: Array<[string, M1Definition]> = [[refs.ctrl('office'), office], [refs.ctrl('deck'), deck]];
  const texts: Record<string, string> = {
    [refs.office]: officeText,
    [refs.deck]: deckText,
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
