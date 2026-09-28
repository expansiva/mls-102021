/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/oracle.test.ts" enhancement="_blank"/>

/**
 * m1_27: the authenticated route cases are derived from the L2 contract, the grants and
 * the authority map, and they run against the code the M1 handlers emit. The actors, rows
 * and bodies below stand in for the m1_28 fixture and live only in this test; the derived
 * obligations stay pending in the catalog output. Expectations come from the derivation.
 * Each injected fault changes the emitted copy and must turn its case red.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { M1_DEFINITION_SCHEMA, outputPathFromDefPath, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { emitBehavior, OWN_MARK } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { emitController, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { deriveCatalog, type DerivedCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import {
  obligationMiss,
  obligationSourceHashes,
  staleObligations,
  type M1Obligation,
  type M1ObligationObservation,
} from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Ids of the fixture. `names()` renames all of them for the rename check. */
interface Names { project: string; mod: string; Entity: string; entity: string; owner: string; org: string; Anchor: string; ownerField: string; note: string; related: string }
const BASE: Names = {
  project: '_102097_', mod: 'tideBoard', Entity: 'Berth', entity: 'berth', owner: 'pilot', org: 'harbor',
  Anchor: 'Pilot', ownerField: 'pilotId', note: 'pilotNote', related: 'berthShip',
};
const RENAMED: Names = {
  project: '_102096_', mod: 'quayLine', Entity: 'Slip', entity: 'slip', owner: 'skipper', org: 'warden',
  Anchor: 'Skipper', ownerField: 'skipperId', note: 'skipperMemo', related: 'slipVessel',
};

interface Fixture {
  n: Names;
  refs: { entity: string; port: string; scope: string; authority: string; uc: (id: string) => string; ctrl: (page: string) => string; office: string; deck: string; ontology: string };
  routes: { create: string; update: string; officeList: string; deckList: string; sail: string };
  defs: Array<[string, string, M1Definition]>;
  controllers: Array<[string, M1Definition]>;
  texts: Record<string, string>;
}

function fixture(n: Names): Fixture {
  const L1 = `${n.project}/l1/${n.mod}`;
  const refs = {
    entity: `${L1}/layer_3_domain/entities/${n.entity}.defs.ts`,
    port: `${L1}/layer_2_application/ports/${n.entity}Repository.defs.ts`,
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
      { name: 'shipId', type: 'record', ref: 'Ship' },
      { name: n.ownerField, type: 'record', ref: n.Anchor },
      { name: 'dockAt', type: 'timestamp' },
      { name: 'stage', type: 'enum' },
      { name: 'details', type: 'object' },
      { name: 'details.tideCheck', type: 'object' },
      { name: 'details.tideCheck.doneAt', type: 'timestamp' },
      { name: `details.${n.note}`, type: 'text' },
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
  const out = ['id', 'version', 'shipId', n.ownerField, 'dockAt', 'stage', 'details', n.related];
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
  const keep = ['id', 'version', 'shipId', n.ownerField, 'dockAt', 'stage'].map(field => `${E}.${field}`);
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
  const recordOut = (details: string) => `{\n  "id": string;\n  "version": number;\n  "shipId": string;\n  "${n.ownerField}": string;\n  "dockAt": string;\n  "stage": "moored" | "cancelled" | "sailed";\n  "details": {\n${details}\n  };\n${related}\n}`;
  const listInput = `export interface List${E}Input {\n  "id"?: string;\n  "shipId"?: string;\n  "${n.ownerField}"?: string;\n  "stage"?: "moored" | "cancelled" | "sailed";\n  "page"?: number;\n}`;
  const tide = '    "tideCheck"?: {\n      "doneAt": string;\n    };';
  const officeText = [
    `export interface Create${E}Input {\n  "shipId": string;\n  "${n.ownerField}": string;\n  "dockAt": string;\n  "details": {\n    "tideCheck"?: {\n      "doneAt": string;\n    };\n  };\n}`,
    `export interface Create${E}Output ${recordOut(tide)}`,
    `export interface Update${E}Input {\n  "id": string;\n  "shipId"?: string;\n  "dockAt"?: string;\n  "details"?: {\n    "tideCheck"?: {\n      "doneAt"?: string;\n    };\n  };\n}`,
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
  return { n, refs, routes, defs, controllers, texts };
}

function derive(fx: Fixture, texts: Record<string, string> = fx.texts): DerivedCatalog {
  const units: PlanUnitInput[] = [...fx.defs.map(([, defPath, definition]) => ({ defPath, definition })), ...fx.controllers.map(([defPath, definition]) => ({ defPath, definition }))];
  return deriveCatalog(fx.n.mod, units, texts);
}

function ok(result: EmitResult | EmitFailure): EmitResult {
  assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : '');
  return result as EmitResult;
}

type Handler = (input: unknown) => Promise<{ data: unknown }>;
interface Loaded { routes: Map<string, Handler>; reset: (rows: Record<string, unknown>[]) => void; sources: Map<string, string>; dispose: () => void }

/** Emits the fixture through the M1 handlers into a scratch copy; `edit` changes that copy. */
async function load(fx: Fixture, edit: (ref: string, source: string) => string = (_ref, source) => source): Promise<Loaded> {
  const read = async (ref: string) => fx.texts[ref] ?? null;
  const sources = new Map<string, string>();
  for (const [id, ref, definition] of fx.defs) sources.set(ref, ok(await emitBehavior(id, definition, outputPathFromDefPath(ref), read)).source);
  for (const [ref, definition] of fx.controllers) sources.set(ref, ok(await emitController(definition, outputPathFromDefPath(ref), read)).source);
  const dir = mkdtempSync(join(tmpdir(), 'm1-27-'));
  const fileOf = (qualified: string) => join(dir, qualified.replace(`${fx.n.project}/`, ''));
  const P = fx.n.project;
  for (const [ref, source] of sources) {
    const target = fileOf(outputPathFromDefPath(ref));
    mkdirSync(dirname(target), { recursive: true });
    const edited = edit(ref, source);
    sources.set(ref, edited);
    writeFileSync(target, edited.replace(new RegExp(`from '/${P}/([^']+)\\.js'`, 'g'), (_all, rest: string) => `from '${pathToFileURL(fileOf(`${P}/${rest}.ts`)).href}'`));
  }
  const routes = new Map<string, Handler>();
  for (const [ref] of fx.controllers) {
    const module = await import(pathToFileURL(fileOf(outputPathFromDefPath(ref))).href) as { routes: Array<{ key: string; handler: Handler }> };
    for (const item of module.routes) routes.set(item.key, item.handler);
  }
  const memory = await import(pathToFileURL(fileOf(outputPathFromDefPath(fx.refs.port))).href) as { resetMemory: (seed: Record<string, unknown>[]) => void };
  return { routes, reset: memory.resetMemory, sources, dispose: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Stand-in for the m1_28 fixture: concrete actors, rows and a valid body per route. */
function binding(fx: Fixture) {
  const n = fx.n;
  const actors = { member: 'h-1', owner: 'p-1', other: 'p-2', none: '' } as const;
  const seed = (): Record<string, unknown>[] => [
    {
      id: 'b-1', version: 1, shipId: 's-1', [n.ownerField]: actors.owner, dockAt: '2026-10-01T10:00', stage: 'moored',
      details: { tideCheck: { doneAt: '2026-09-30' }, [n.note]: 'private-1' }, [n.related]: { id: 's-1', details: { secret: 'x-1' } },
    },
    { id: 'b-2', version: 1, shipId: 's-2', [n.ownerField]: actors.other, dockAt: '2026-10-01T11:00', stage: 'moored', details: { [n.note]: 'private-2' } },
  ];
  const bodies: Record<string, Record<string, unknown>> = {
    [fx.routes.create]: { shipId: 's-3', [n.ownerField]: actors.owner, dockAt: '2026-10-02T09:00', details: {} },
    [fx.routes.update]: { id: 'b-1' },
    [fx.routes.officeList]: {},
    [fx.routes.deckList]: {},
    // The row of the owner; the `other` case sends the same body under another identity.
    [fx.routes.sail]: { id: 'b-1', details: { [n.note]: 'done' } },
  };
  return { actors, seed, bodies };
}

async function observe(loaded: Loaded, fx: Fixture, item: M1Obligation): Promise<M1ObligationObservation> {
  const bound = binding(fx);
  loaded.reset(bound.seed());
  const handler = loaded.routes.get(item.routine);
  assert.ok(handler, `route ${item.routine} is not exported`);
  const body = structuredClone(bound.bodies[item.routine]);
  assert.ok(body, `no body bound for ${item.routine}`);
  for (const field of item.input.omitted) delete body[field];
  const actorId = bound.actors[item.identity];
  const ctx = createRequestContext();
  ctx.sessionContext.actorId = actorId;
  try {
    const response = await handler({ request: { routine: item.routine, params: body, meta: { source: item.caller.source, verifiedAuthorities: item.caller.authorities } }, ctx });
    return { ok: true, status: 200, errorCode: null, data: response.data, actorId };
  } catch (error) {
    const failure = error as { code?: string; statusCode?: number };
    return { ok: false, status: failure.statusCode ?? 500, errorCode: failure.code ?? String(error), data: undefined, actorId };
  }
}

async function misses(loaded: Loaded, fx: Fixture, obligations: readonly M1Obligation[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const item of obligations) {
    const miss = obligationMiss(item, await observe(loaded, fx, item));
    if (miss) found.set(item.caseId, miss);
  }
  return found;
}

const FX = fixture(BASE);
const DERIVED = derive(FX);
const byId = (caseId: string): M1Obligation => {
  const found = DERIVED.obligations.find(item => item.caseId === caseId);
  assert.ok(found, `missing obligation ${caseId}; have ${DERIVED.obligations.map(item => item.caseId).join(', ')}`);
  return found;
};

void test('the oracle comes from the contract, the grants and the authority map, and every authenticated case stays pending', () => {
  const cases = DERIVED.catalog.scenarios.flatMap(item => item.cases);
  assert.equal(cases.every(item => item.actorId === '' && (item.runner === 'module' || item.caller?.authorities.length === 0)), true);
  assert.equal(DERIVED.obligations.every(item => item.blocker === 'ACTOR_FIXTURE_PENDING' && item.owner === 'm1_28' && item.expect.ruleId === null), true);
  assert.equal(DERIVED.obligations.every(item => item.caller.authorities.length > 0), true);
  assert.equal(DERIVED.obligations.every(item => DERIVED.gaps.some(gap => gap.reason.includes(`${item.caseId} is declared, not executed`))), true);
  const kinds = new Map<string, number>();
  for (const item of DERIVED.obligations) kinds.set(item.kind, (kinds.get(item.kind) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries(kinds), { contract: 3, disclosure: 5, minimalInput: 4, noIdentity: 2, other: 1, own: 1 });

  const n = FX.n;
  const deckDisclosure = byId(`deck.disclosure.qryList${n.Entity}`);
  // The deck contract declares tideCheck, the owner grant does not disclose it; the related record is not granted.
  assert.deepEqual(deckDisclosure.expect.forbiddenPaths, ['details.tideCheck.doneAt', `${n.related}.details.secret`, `${n.related}.id`].sort());
  assert.equal(deckDisclosure.expect.allowedPaths.includes(`details.${n.note}`), true);
  assert.equal(deckDisclosure.identity, 'owner');
  assert.deepEqual(deckDisclosure.caller.authorities, [`${n.mod}:${n.owner}`]);
  assert.equal(deckDisclosure.sources.includes(FX.refs.deck), true);
  assert.equal(deckDisclosure.sources.includes(FX.refs.scope), true);
  assert.equal(byId(`deck.own.qryList${n.Entity}`).expect.isolatedActorField, n.ownerField);
  assert.equal(byId('deck.other.cmdMarkSailed').identity, 'other');
  assert.equal(byId(`office.minimal.qryList${n.Entity}`).identity, 'member');
  assert.equal(DERIVED.obligations.some(item => item.caseId.startsWith('office.') && item.kind === 'own'), false);

  // A pending grant refuses; it never becomes a passing case.
  const pendingScope = structuredClone(FX.defs.find(([, ref]) => ref === FX.refs.scope)?.[2]);
  assert.ok(pendingScope);
  (pendingScope.data.grants as Array<Record<string, unknown>>)[1].pending = 'ANCHOR_PENDING';
  const units: PlanUnitInput[] = [
    ...FX.defs.map(([, defPath, definition]) => ({ defPath, definition: defPath === FX.refs.scope ? pendingScope : definition })),
    ...FX.controllers.map(([defPath, definition]) => ({ defPath, definition })),
  ];
  const pending = deriveCatalog(n.mod, units, FX.texts);
  assert.equal(pending.obligations.some(item => item.caseId.startsWith('deck.')), false);
  assert.equal(pending.gaps.some(gap => gap.origin.endsWith(`#${FX.routes.sail}`) && gap.reason.startsWith('grant is not resolved')), true);

  // An unmapped grant refuses as well (d1_36).
  const map = structuredClone(FX.defs.find(([, ref]) => ref === FX.refs.authority)?.[2]);
  assert.ok(map);
  map.data.entries = (map.data.entries as Array<{ grantId: string }>).filter(entry => entry.grantId !== `${n.owner}Deck`);
  const unmapped = deriveCatalog(n.mod, units.map(unit => unit.defPath === FX.refs.authority ? { ...unit, definition: map } : unit.defPath === FX.refs.scope ? { ...unit, definition: FX.defs.find(([, ref]) => ref === FX.refs.scope)![2] } : unit), FX.texts);
  assert.equal(unmapped.obligations.some(item => item.caseId.startsWith('deck.')), false);
  assert.equal(unmapped.gaps.some(gap => gap.reason.startsWith('AUTHORITY_UNMAPPED')), true);
});

void test('renamed fixture derives the same cases and no id reaches the derivation code', () => {
  const renamed = derive(fixture(RENAMED));
  const shape = (derived: DerivedCatalog) => derived.obligations.map(item => `${item.kind}:${item.identity}:${item.expect.status}:${item.expect.forbiddenPaths.length}:${item.expect.allowedPaths.length}`).sort();
  assert.deepEqual(shape(renamed), shape(DERIVED));
  const body = JSON.stringify(renamed.obligations) + JSON.stringify(renamed.catalog);
  for (const id of Object.values(BASE)) assert.equal(body.includes(id), false, id);
  for (const file of ['obligations.ts', 'derive.ts']) {
    const source = readFileSync(join(HERE, file), 'utf8');
    for (const id of [...Object.values(BASE), ...Object.values(RENAMED).slice(1), 'agendaClinica', 'Consulta', 'profissional', 'paciente']) {
      assert.equal(source.includes(id), false, `${file} names ${id}`);
    }
  }
});

void test('the emitted code meets every derived case, and the catalog denials run in memory', async () => {
  const loaded = await load(FX);
  try {
    assert.deepEqual([...(await misses(loaded, FX, DERIVED.obligations)).entries()], []);
    const denials = DERIVED.catalog.scenarios.flatMap(item => item.cases).filter(item => item.runner === 'route');
    assert.equal(denials.length, 5);
    for (const item of denials) {
      const handler = loaded.routes.get(item.routine);
      assert.ok(handler);
      const ctx = createRequestContext();
      const error = await handler({ request: { routine: item.routine, params: {}, meta: { source: 'http', verifiedAuthorities: item.caller?.authorities ?? [] } }, ctx })
        .then(() => null, (failure: { code?: string; statusCode?: number }) => failure);
      assert.equal(item.expect.ok, false);
      assert.equal(error?.code, item.expect.errorCode, item.caseId);
      assert.equal(error?.statusCode, item.expect.status, item.caseId);
    }
    // What a v1.1 contract case with actorId = actorRef became: the body carried `actorId`, and the
    // refusal came from that undeclared member, not from the omitted required field.
    const contract = DERIVED.obligations.find(item => item.kind === 'contract' && item.identity === 'member');
    assert.ok(contract);
    const handler = loaded.routes.get(contract.routine);
    assert.ok(handler);
    const ctx = createRequestContext();
    ctx.sessionContext.actorId = binding(FX).actors.member;
    const refused = await handler({ request: { routine: contract.routine, params: { actorId: contract.actorRef }, meta: { source: 'http', verifiedAuthorities: contract.caller.authorities } }, ctx })
      .then(() => null, (failure: { code?: string; statusCode?: number; message?: string }) => failure);
    assert.equal(refused?.code, 'VALIDATION_ERROR');
    assert.equal(refused?.statusCode, 400);
    assert.equal(refused?.message, 'actorId is not permitted.');
  } finally {
    loaded.dispose();
  }
});

void test('a fault injected in the emitted copy turns its case red', async () => {
  const n = FX.n;
  const E = n.Entity;
  const fn = (route: string) => `handle${(route.split('.').pop() ?? '').charAt(0).toUpperCase()}${(route.split('.').pop() ?? '').slice(1)}`;
  const inHandler = (source: string, route: string, from: string, to: string): string => {
    const at = source.indexOf(`async function ${fn(route)}(`);
    assert.ok(at >= 0, fn(route));
    const hit = source.indexOf(from, at);
    assert.ok(hit > at, `${from} in ${fn(route)}`);
    return source.slice(0, hit) + to + source.slice(hit + from.length);
  };
  const minimal = byId(`office.minimal.qryList${E}`);
  const faults: Array<{ name: string; ref: string; edit: (source: string) => string; caseId: string; reason: RegExp }> = [
    {
      name: 'optional filter made mandatory',
      ref: FX.refs.ctrl('office'),
      edit: source => inHandler(source, FX.routes.officeList, 'validateInput(input.request.params, [', `validateInput(input.request.params, ['${minimal.input.optional[0]}', `),
      caseId: minimal.caseId,
      reason: /^different outcome: expected ok 200, got VALIDATION_ERROR 400$/,
    },
    {
      name: 'own scope removed from the controller',
      ref: FX.refs.ctrl('deck'),
      edit: source => source.replace(/\n[ \t]*\/\/ enforce:scope\n[^\n]*/, ''),
      caseId: `deck.own.qryList${E}`,
      reason: /^actor filter missed$/,
    },
    {
      name: 'own check removed from the transition',
      ref: FX.refs.uc('markSailed'),
      edit: source => source.replace(new RegExp(`\\n[ \\t]*${OWN_MARK}\\n[^\\n]*`), ''),
      caseId: 'deck.other.cmdMarkSailed',
      reason: /^different outcome: expected NOT_FOUND 404, got ok 200$/,
    },
    {
      name: 'nested leak of an undisclosed member',
      ref: FX.refs.ctrl('office'),
      edit: source => inHandler(source, FX.routes.officeList, 'projectOutput(data, [', "projectOutput(data, ['details', "),
      caseId: `office.disclosure.qryList${E}`,
      reason: new RegExp(`^undisclosed path returned: details\\.${n.note}$`),
    },
    {
      name: 'leak of a related record the grant does not disclose',
      ref: FX.refs.ctrl('deck'),
      edit: source => inHandler(source, FX.routes.deckList, 'projectOutput(data, [', `projectOutput(data, ['${n.related}', `),
      caseId: `deck.disclosure.qryList${E}`,
      reason: new RegExp(`^forbidden path returned: ${n.related}\\.`),
    },
  ];
  const clean = await load(FX);
  const cleanSources = new Map(clean.sources);
  clean.dispose();
  for (const fault of faults) {
    const loaded = await load(FX, (ref, source) => ref === fault.ref ? fault.edit(source) : source);
    try {
      assert.notEqual(loaded.sources.get(fault.ref), cleanSources.get(fault.ref), `${fault.name}: the copy did not change`);
      const found = await misses(loaded, FX, DERIVED.obligations);
      assert.match(found.get(fault.caseId) ?? '(passed)', fault.reason, `${fault.name}: ${JSON.stringify([...found])}`);
    } finally {
      loaded.dispose();
    }
  }
});

void test('a changed contract invalidates only the cases that read it', async () => {
  const before = await obligationSourceHashes(DERIVED.obligations, FX.texts);
  assert.equal(Object.values(before).includes('absent'), false);
  const texts = { ...FX.texts, [FX.refs.office]: `${FX.texts[FX.refs.office]}\n// edited\n` };
  const after = await obligationSourceHashes(DERIVED.obligations, texts);
  const stale = staleObligations(DERIVED.obligations, before, after);
  const expected = DERIVED.obligations.filter(item => item.sources.includes(FX.refs.office)).map(item => item.caseId);
  assert.deepEqual(stale, expected);
  assert.equal(stale.length > 0 && stale.length < DERIVED.obligations.length, true);
  assert.equal(stale.some(item => item.startsWith('deck.')), false);
  const missing = { ...FX.texts };
  delete missing[FX.refs.scope];
  assert.equal(staleObligations(DERIVED.obligations, before, await obligationSourceHashes(DERIVED.obligations, missing)).length, DERIVED.obligations.length);
});
