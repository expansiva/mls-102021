/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/derivationDisclosure.test.ts" enhancement="_blank"/>

/**
 * m1_26: list, create, update and transition bodies are derived from the entity
 * fields, the lifecycle and the L2 contract; own scope applies on read and on the
 * transition. m1_41 b1-P3 (v2): the page request projects its declared fields at every
 * depth, and a request field the route grant does not disclose is refused at structure
 * (`DISCLOSURE_EXCEEDS_GRANT`). The fixture names nothing of the bench. The emitted files run from a
 * scratch folder; the only rewrite is where the fixture project's modules live.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { M1_DEFINITION_SCHEMA, outputPathFromDefPath, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { M1_STUB_ERROR } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { emitBehavior, OWN_MARK, withoutLifecycleChecks } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { emitController, emitRequestService, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { clearRepositories, registerRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const P = '_102098_';
const MOD = 'fieldDesk';
const L1 = `${P}/l1/${MOD}`;
const ENTITY = `${L1}/layer_3_domain/entities/visit.defs.ts`;
const PORT = `${L1}/layer_2_application/ports/visitRepository.defs.ts`;
const SCOPE = `${L1}/layer_2_application/scope/accessScope.defs.ts`;
const AUTHORITY = `${L1}/layer_1_external/auth/authorityMap.defs.ts`;
const UC = (id: string) => `${L1}/layer_2_application/usecases/${id}.defs.ts`;
const CTRL = (page: string) => `${L1}/layer_1_external/adapters/http/controllers/${page}.defs.ts`;
const REQ = (page: string) => `${L1}/layer_2_application/requests/${page}.defs.ts`;
const DESK = `${P}/l2/${MOD}/web/contracts/desk.defs.ts`;
const ROUND = `${P}/l2/${MOD}/web/contracts/round.defs.ts`;
const ONTOLOGY = `${P}/l4/${MOD}/ontology/Visit.defs.ts`;
// v2 routes: `<mod>.<page>.<requestId>`; nothing in the name says command or query.
const R = {
  create: `${MOD}.desk.bookIt`,
  update: `${MOD}.desk.amendIt`,
  deskList: `${MOD}.desk.visitRows`,
  roundList: `${MOD}.round.visitRows`,
  serve: `${MOD}.round.serveIt`,
};

function def(artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MOD, status: 'pending', dependencies: [...dependencies].sort(), data } as M1Definition;
}

// Declared state order does not name the initial one: no transition reaches `booked`.
const lifecycle = {
  states: [{ state: 'served', reachedBy: 'actor' }, { state: 'missed', reachedBy: 'actor' }, { state: 'booked', reachedBy: 'actor' }],
  transitions: [
    { transitionId: 'markMissed', from: ['booked'], to: 'missed', by: ['dispatcher'], ruleRefs: [] },
    { transitionId: 'markServed', from: ['booked'], to: 'served', by: ['agent'], ruleRefs: [] },
  ],
};
const entity = def('domainEntity', 'Visit', [], {
  entityId: 'Visit',
  storageTarget: 'moduleDatabase',
  fields: [
    { name: 'id', type: 'uuid', derived: true },
    { name: 'version', type: 'integer', derived: true },
    { name: 'clientId', type: 'record', ref: 'Client' },
    { name: 'agentId', type: 'record', ref: 'Agent' },
    { name: 'slotAt', type: 'timestamp' },
    { name: 'phase', type: 'enum' },
    { name: 'details', type: 'object' },
    { name: 'details.callCheck', type: 'object' },
    { name: 'details.callCheck.doneAt', type: 'timestamp' },
    { name: 'details.visitNote', type: 'text' },
  ],
  lifecycle,
  invariants: [],
  imports: [],
});
const port = def('repositoryPort', 'VisitRepository', [ENTITY], {
  entityId: 'Visit',
  interfaceName: 'VisitRepository',
  methods: [
    { name: 'create', params: ['Visit'], returns: 'Visit' },
    { name: 'list', params: ['VisitFilter'], returns: 'Visit[]' },
    { name: 'update', params: ['Visit'], returns: 'Visit' },
    { name: 'transition', params: ['Visit', 'transitionId'], returns: 'Visit' },
  ],
});
// v2 usecases: the signature is the def's fields, as the D1 writes them; no contract ref, no route projection.
const row = (name: string, type: string) => ({ name, type, fieldRef: `Visit.${name}` });
const ROW = [row('id', 'uuid'), row('version', 'integer'), row('clientId', 'record'), row('agentId', 'record'), row('slotAt', 'timestamp'), row('phase', 'enum'),
  row('details', 'object'), row('details.callCheck', 'object'), row('details.callCheck.doneAt', 'timestamp'), row('details.visitNote', 'text')];
const pick = (...names: string[]) => ROW.filter(item => names.includes(item.name));
function usecase(id: string, operation: string, input: Array<Record<string, unknown>>, output: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}): M1Definition {
  return def('usecase', id, [PORT, ENTITY, ONTOLOGY], {
    usecaseId: id,
    entityId: 'Visit',
    operation,
    ports: ['VisitRepository'],
    functions: [{ functionName: id, input, output }],
    portCalls: [operation === 'transition' ? 'transition' : operation],
    effects: [],
    uses: [{ path: 'id', role: operation === 'list' ? 'filter' : 'selector', source: 'input' }],
    rulesApplied: [],
    rules: [],
    rulePlan: [],
    sequence: [{ kind: 'port', call: operation, port: 'VisitRepository' }],
    transactional: false,
    transaction: { boundary: 'none' },
    ...extra,
  });
}
const createVisit = usecase('createVisit', 'create', pick('clientId', 'agentId', 'slotAt', 'details', 'details.callCheck', 'details.callCheck.doneAt'), ROW);
const updateVisit = usecase('updateVisit', 'update', pick('id', 'clientId', 'slotAt', 'phase', 'details', 'details.callCheck', 'details.callCheck.doneAt'), ROW);
const listVisit = usecase('listVisit', 'list', [...pick('id', 'clientId', 'agentId', 'phase'), { name: 'page', type: 'number' }, { name: 'pageSize', type: 'number' }],
  [{ name: 'items', type: 'Visit' }, { name: 'hasMore', type: 'boolean' }]);
const markServed = usecase('markServed', 'transition', pick('id', 'details', 'details.visitNote'), ROW, {
  transitionRef: 'markServed',
  lifecycle: { transitionId: 'markServed', payload: ['details.visitNote'] },
});

const KEEP = ['Visit.id', 'Visit.version', 'Visit.clientId', 'Visit.agentId', 'Visit.slotAt', 'Visit.phase'];
const scope = def('accessScope', 'accessScope', [], {
  scopeId: 'accessScope',
  grants: [
    {
      grantId: 'dispatcherDesk', actorRef: 'dispatcher', entityRefs: ['Visit'], disclosure: 'fieldsOnly',
      allowedFields: [...KEEP, 'Visit.details.callCheck'], scopeMode: 'organization', session: 'verified',
      path: [{ entityId: 'Visit', steps: [], pending: '' }], pending: '',
    },
    {
      grantId: 'agentRound', actorRef: 'agent', anchorEntity: 'Agent', entityRefs: ['Visit', 'Agent'], disclosure: 'fieldsOnly',
      allowedFields: [...KEEP, 'Visit.details.visitNote'], scopeMode: 'own', session: 'verified',
      path: [
        { entityId: 'Visit', steps: [{ relationshipId: 'visitAgent', from: 'Visit', to: 'Agent', field: 'Visit.agentId' }], pending: '' },
        { entityId: 'Agent', steps: [], pending: '' },
      ],
      pending: '',
    },
  ],
});
const authority = def('authorityMap', 'authorityMap', [SCOPE], {
  mapId: 'authorityMap',
  entries: [{ grantId: 'dispatcherDesk', actorRef: 'dispatcher' }, { grantId: 'agentRound', actorRef: 'agent' }],
});
// What each page request projects: inside what its route grant discloses.
const DESK_FIELDS = ['id', 'version', 'clientId', 'agentId', 'slotAt', 'phase', 'details.callCheck.doneAt'];
const ROUND_FIELDS = ['id', 'version', 'clientId', 'agentId', 'slotAt', 'phase', 'details.visitNote'];
const request = (route: string, kind: 'cmd' | 'qry', use: string, key: string, fields: readonly string[]) => ({
  route, kind, uses: [use], transaction: kind === 'cmd' ? 'single' : 'none', outputs: [{ key, entity: 'Visit', fields: [...fields] }], params: [],
});
const deskRequests = (listFields: readonly string[] = DESK_FIELDS) => def('requestService', 'desk', [UC('createVisit'), UC('updateVisit'), UC('listVisit')], {
  pageId: 'desk',
  requests: [
    request(R.create, 'cmd', 'createVisit', 'visit', DESK_FIELDS),
    request(R.update, 'cmd', 'updateVisit', 'visit', DESK_FIELDS),
    request(R.deskList, 'qry', 'listVisit', 'visits', listFields),
  ],
});
const roundRequests = def('requestService', 'round', [UC('markServed'), UC('listVisit')], {
  pageId: 'round',
  requests: [
    request(R.serve, 'cmd', 'markServed', 'visit', ROUND_FIELDS),
    request(R.roundList, 'qry', 'listVisit', 'visits', ROUND_FIELDS),
  ],
});
const handler = (route: string, kind: string, page: string, grantId: string) => ({
  route, kind, grantIds: [grantId], serviceFunction: route, contractPath: (page === 'desk' ? DESK : ROUND).replace(`${P}/`, ''),
  contractInterface: page === 'desk' ? 'DeskContracts' : 'RoundContracts',
});
const desk = def('httpController', 'desk', [AUTHORITY, SCOPE, REQ('desk')], {
  pageId: 'desk',
  handlers: [
    handler(R.create, 'command', 'desk', 'dispatcherDesk'),
    handler(R.update, 'command', 'desk', 'dispatcherDesk'),
    handler(R.deskList, 'query', 'desk', 'dispatcherDesk'),
  ],
});
const round = def('httpController', 'round', [AUTHORITY, SCOPE, REQ('round')], {
  pageId: 'round',
  handlers: [
    handler(R.serve, 'command', 'round', 'agentRound'),
    handler(R.roundList, 'query', 'round', 'agentRound'),
  ],
});
const registration = def('repositoryRegistration', 'registerRepositories', [], {
  registrationId: 'registerRepositories',
  adapters: [{ portId: 'VisitRepository', adapterArtifactId: 'VisitRepository' }],
});
const moduleDefs = (deskService = deskRequests()) => [entity, port, scope, authority, createVisit, updateVisit, listVisit, markServed, deskService, roundRequests, desk, round, registration];

// L2 contracts v2: the route input is written inline, as `renderD2ContractV2` does.
const VISIT = '{ id: string; version: number; clientId?: string; agentId?: string; slotAt?: string; phase: \'booked\' | \'missed\' | \'served\'; details?: { callCheck?: { doneAt?: string; }; visitNote?: string; }; }';
const LIST_INPUT = '{ id?: string; clientId?: string; agentId?: string; phase?: \'booked\' | \'missed\' | \'served\'; page?: number; pageSize?: number; }';
const route = (name: string, kind: 'cmd' | 'qry', input: string, output: string) => `  '${name}': {\n    kind: '${kind}';\n    input: ${input};\n    output: ${output};\n  };`;
const DESK_SOURCE = [
  'export interface DeskContracts {',
  route(R.create, 'cmd', '{ clientId: string; agentId: string; slotAt: string; details: { callCheck?: { doneAt: string; }; }; }', `{ visit: ${VISIT} }`),
  // `phase` is listed here on purpose: a contract that names the lifecycle field still cannot move it.
  route(R.update, 'cmd', '{ id: string; clientId?: string; slotAt?: string; phase?: \'booked\' | \'missed\' | \'served\'; details?: { callCheck?: { doneAt?: string; }; }; }', `{ visit: ${VISIT} }`),
  route(R.deskList, 'qry', LIST_INPUT, `{ visits: ${VISIT}[] }`),
  '}',
].join('\n');
const ROUND_SOURCE = [
  'export interface RoundContracts {',
  route(R.serve, 'cmd', '{ id: string; details: { visitNote: string; }; }', `{ visit: ${VISIT} }`),
  route(R.roundList, 'qry', LIST_INPUT, `{ visits: ${VISIT}[] }`),
  '}',
].join('\n');

// The canonical l4 entity without the fields the l4 retired (operations, readProjection, preconditions).
const ontology = {
  schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: MOD, entityId: 'Visit', kind: 'entity',
  record: { fields: { id: { type: 'uuid', required: true, derived: true }, phase: { type: 'enum', required: true } } },
  lifecycleStates: lifecycle.states,
  transitions: lifecycle.transitions,
};
const ONTOLOGY_SOURCE = `export const fieldDeskEntityVisit = ${JSON.stringify(ontology, null, 2)} as const;\n`;

const asSource = (definition: M1Definition) => `export const definition = ${JSON.stringify(definition)} as const;\n`;

function reader(overrides: Map<string, string> = new Map()): (ref: string) => Promise<string | null> {
  const files = new Map<string, string>([
    [ENTITY, asSource(entity)], [PORT, asSource(port)], [SCOPE, asSource(scope)], [AUTHORITY, asSource(authority)],
    [UC('createVisit'), asSource(createVisit)], [UC('updateVisit'), asSource(updateVisit)],
    [UC('listVisit'), asSource(listVisit)], [UC('markServed'), asSource(markServed)],
    [REQ('desk'), asSource(deskRequests())], [REQ('round'), asSource(roundRequests)],
    [CTRL('desk'), asSource(desk)], [CTRL('round'), asSource(round)],
    [DESK, DESK_SOURCE], [ROUND, ROUND_SOURCE], [ONTOLOGY, ONTOLOGY_SOURCE],
  ]);
  for (const [ref, source] of overrides) files.set(ref, source);
  return async ref => files.get(ref) ?? null;
}

function ok(result: EmitResult | EmitFailure): EmitResult {
  assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : '');
  return result as EmitResult;
}

type Handler = (input: unknown) => Promise<{ data: unknown }>;
interface Loaded {
  desk: Map<string, Handler>;
  round: Map<string, Handler>;
  reset: (rows: Record<string, unknown>[]) => void;
  rows: () => Promise<Record<string, unknown>[]>;
  sources: Map<string, string>;
  dispose: () => void;
}

/** Emits the fixture through the M1 handlers, writes the outputs and loads both controllers. `edit` changes an emitted copy. */
async function load(edit: (defPath: string, source: string) => string = (_ref, source) => source): Promise<Loaded> {
  const read = reader();
  const units: Array<[string, string, M1Definition]> = [
    ['implement.domainEntity', ENTITY, entity],
    ['implement.repositoryPort', PORT, port],
    ['implement.accessScope', SCOPE, scope],
    ['implement.authorityMap', AUTHORITY, authority],
    ['implement.usecase', UC('createVisit'), createVisit],
    ['implement.usecase', UC('updateVisit'), updateVisit],
    ['implement.usecase', UC('listVisit'), listVisit],
    ['implement.usecase', UC('markServed'), markServed],
    ['implement.requestService', REQ('desk'), deskRequests()],
    ['implement.requestService', REQ('round'), roundRequests],
  ];
  const modules = moduleDefs();
  const sources = new Map<string, string>();
  for (const [id, ref, definition] of units) sources.set(ref, ok(await emitBehavior(id, definition, outputPathFromDefPath(ref), read, modules)).source);
  sources.set(CTRL('desk'), ok(await emitController(desk, outputPathFromDefPath(CTRL('desk')), read)).source);
  sources.set(CTRL('round'), ok(await emitController(round, outputPathFromDefPath(CTRL('round')), read)).source);
  const dir = mkdtempSync(join(tmpdir(), 'm1-26-'));
  const fileOf = (qualified: string) => join(dir, qualified.replace(`${P}/`, ''));
  for (const [ref, source] of sources) {
    const target = fileOf(outputPathFromDefPath(ref));
    mkdirSync(dirname(target), { recursive: true });
    const relocated = edit(ref, source).replace(new RegExp(`from '/${P}/([^']+)\\.js'`, 'g'), (_all, rest: string) => `from '${pathToFileURL(fileOf(`${P}/${rest}.ts`)).href}'`);
    writeFileSync(target, relocated);
  }
  const routesOf = async (page: string) => {
    const module = await import(pathToFileURL(fileOf(outputPathFromDefPath(CTRL(page)))).href) as { routes: Array<{ key: string; handler: Handler }> };
    return new Map(module.routes.map(item => [item.key, item.handler]));
  };
  const memory = await import(pathToFileURL(fileOf(outputPathFromDefPath(PORT))).href) as {
    resetMemory: (seed: Record<string, unknown>[]) => void;
    pendingVisitRepository: { list: (filter: Record<string, unknown>) => Promise<Record<string, unknown>[]> };
  };
  // The page request resolves the port through the registry; the memory port stands in for the adapter.
  clearRepositories();
  registerRepository('VisitRepository', () => memory.pendingVisitRepository);
  return {
    desk: await routesOf('desk'),
    round: await routesOf('round'),
    reset: memory.resetMemory,
    rows: () => memory.pendingVisitRepository.list({}),
    sources,
    dispose: () => {
      clearRepositories();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

async function call(routes: Map<string, Handler>, route: string, actor: string, actorId: string, params: Record<string, unknown>): Promise<{ data?: unknown; code?: string }> {
  const handler = routes.get(route);
  assert.ok(handler, route);
  const ctx = createRequestContext();
  ctx.sessionContext.actorId = actorId;
  try {
    const response = await handler({ request: { routine: route, params, meta: { source: 'http', verifiedAuthorities: [`${MOD}:${actor}`] } }, ctx });
    // The page request keys its output: `visits` on a list, `visit` on a command.
    const data = response.data as Record<string, unknown>;
    return { data: 'visits' in data ? data.visits : data.visit };
  } catch (error) {
    return { code: String((error as { code?: string }).code ?? error) };
  }
}

const seed = (): Record<string, unknown>[] => [
  {
    id: 'v-1', version: 1, clientId: 'c-1', agentId: 'a-1', slotAt: '2026-10-01T10:00', phase: 'booked',
    details: { callCheck: { doneAt: '2026-09-30' }, visitNote: 'private-1' }, visitClient: { id: 'c-1', details: { secret: 's-1' } },
  },
  { id: 'v-2', version: 1, clientId: 'c-2', agentId: 'a-2', slotAt: '2026-10-01T11:00', phase: 'booked', details: { visitNote: 'private-2' } },
];
const DISPATCHER = 'dispatcher';
const AGENT = 'agent';

void test('list takes no filter or a partial one, and create derives the initial state', async () => {
  const loaded = await load();
  try {
    loaded.reset(seed());
    const all = await call(loaded.desk, R.deskList, DISPATCHER, 'd-1', {});
    assert.equal(all.code, undefined, all.code);
    assert.equal((all.data as unknown[]).length, 2);
    const partial = await call(loaded.desk, R.deskList, DISPATCHER, 'd-1', { agentId: 'a-2' });
    assert.deepEqual((partial.data as Array<{ id: string }>).map(row => row.id), ['v-2']);

    const created = await call(loaded.desk, R.create, DISPATCHER, 'd-1', { clientId: 'c-3', agentId: 'a-1', slotAt: '2026-10-02T09:00', details: {} });
    assert.equal(created.code, undefined, created.code);
    assert.notEqual(created.code, M1_STUB_ERROR);
    assert.equal((created.data as { phase: string }).phase, 'booked');
    assert.equal((await loaded.rows()).length, 3);
  } finally {
    loaded.dispose();
  }
});

void test('update writes only the declared leaves present and never the lifecycle state', async () => {
  const loaded = await load();
  try {
    loaded.reset(seed());
    const updated = await call(loaded.desk, R.update, DISPATCHER, 'd-1', { id: 'v-1', slotAt: '2026-10-01T12:00', phase: 'served', details: { callCheck: { doneAt: '2026-10-01' } } });
    assert.equal(updated.code, undefined, updated.code);
    const stored = (await loaded.rows()).find(row => row.id === 'v-1') as { phase: string; slotAt: string; clientId: string; details: { callCheck: { doneAt: string }; visitNote: string } };
    assert.equal(stored.slotAt, '2026-10-01T12:00');
    assert.equal(stored.details.callCheck.doneAt, '2026-10-01');
    assert.equal(stored.details.visitNote, 'private-1', 'a sibling of the written leaf is kept');
    assert.equal(stored.clientId, 'c-1', 'an absent optional input is not written');
    assert.equal(stored.phase, 'booked', 'state changes only through a transition');
  } finally {
    loaded.dispose();
  }
});

void test('the own-scope transition serves the owner and not another agent; no identity is refused', async () => {
  const loaded = await load();
  try {
    loaded.reset(seed());
    assert.equal((await call(loaded.round, R.serve, AGENT, 'a-1', { id: 'v-2', details: { visitNote: 'n' } })).code, 'NOT_FOUND');
    assert.equal((await loaded.rows()).find(row => row.id === 'v-2')?.phase, 'booked');
    const served = await call(loaded.round, R.serve, AGENT, 'a-1', { id: 'v-1', details: { visitNote: 'done' } });
    assert.equal(served.code, undefined, served.code);
    assert.equal((served.data as { phase: string }).phase, 'served');
    // A body cannot name the owner: the contract does not declare the field.
    assert.equal((await call(loaded.round, R.serve, AGENT, 'a-1', { id: 'v-2', agentId: 'a-2', details: { visitNote: 'n' } })).code, 'VALIDATION_ERROR');

    const mine = await call(loaded.round, R.roundList, AGENT, 'a-2', {});
    assert.deepEqual((mine.data as Array<{ id: string }>).map(row => row.id), ['v-2']);
    assert.equal((await call(loaded.round, R.roundList, AGENT, '', {})).code, 'FORBIDDEN_ACTOR');
    assert.equal((await call(loaded.round, R.serve, AGENT, '', { id: 'v-2', details: { visitNote: 'n' } })).code, 'FORBIDDEN_ACTOR');
  } finally {
    loaded.dispose();
  }
});

void test('a request field the route grant does not disclose is refused at structure, not cut', async () => {
  const read = reader();
  // Inside the grant: the declared projection passes.
  ok(await emitRequestService(deskRequests(), outputPathFromDefPath(REQ('desk')), read, moduleDefs(), 'structure'));
  // The dispatcher grant does not disclose the agent note, nor the related record.
  for (const field of ['details.visitNote', 'visitClient.id', 'details']) {
    const wider = deskRequests([...DESK_FIELDS, field]);
    for (const stage of ['structure', 'implement'] as const) {
      const refused = await emitRequestService(wider, outputPathFromDefPath(REQ('desk')), read, moduleDefs(wider), stage);
      assert.equal('code' in refused && refused.code, 'DISCLOSURE_EXCEEDS_GRANT', field);
      assert.equal('code' in refused && refused.detail, `DISCLOSURE_EXCEEDS_GRANT: ${R.deskList} ${field}`);
    }
  }
  // A grant id the scope does not declare discloses nothing (as in v1).
  const unknownGrant = def('httpController', 'desk', [AUTHORITY, SCOPE, REQ('desk')], {
    pageId: 'desk',
    handlers: [handler(R.deskList, 'query', 'desk', 'nobodyDesk')],
  });
  const undeclared = await emitRequestService(deskRequests(), outputPathFromDefPath(REQ('desk')), read,
    moduleDefs().map(item => item === desk ? unknownGrant : item), 'structure');
  assert.equal('code' in undeclared && undeclared.code, 'DISCLOSURE_EXCEEDS_GRANT');
});

void test('the output carries only what the page request projects inside the grant, at every depth', async () => {
  const loaded = await load();
  try {
    loaded.reset(seed());
    const deskRows = (await call(loaded.desk, R.deskList, DISPATCHER, 'd-1', {})).data as Array<Record<string, unknown>>;
    assert.deepEqual(deskRows[0].details, { callCheck: { doneAt: '2026-09-30' } });
    assert.equal('visitClient' in deskRows[0], false, 'a related record the grant does not disclose is dropped');
    const roundRows = (await call(loaded.round, R.roundList, AGENT, 'a-1', {})).data as Array<Record<string, unknown>>;
    assert.deepEqual(roundRows[0].details, { visitNote: 'private-1' }, 'the stored row has callCheck; the round request does not project it');
    const served = (await call(loaded.round, R.serve, AGENT, 'a-1', { id: 'v-1', details: { visitNote: 'done' } })).data as Record<string, unknown>;
    assert.deepEqual(served.details, { visitNote: 'done' });
    assert.deepEqual(Object.keys(served).sort(), ['agentId', 'clientId', 'details', 'id', 'phase', 'slotAt', 'version']);
  } finally {
    loaded.dispose();
  }
});

void test('removing a check from the emitted copy reopens what it closed', async () => {
  const owned = await load((ref, source) => ref === UC('markServed')
    ? source.replace(new RegExp(`\\n[ \\t]*${OWN_MARK}\\n[^\\n]*\\n`), '\n')
    : source);
  try {
    assert.equal(owned.sources.get(UC('markServed'))?.includes(OWN_MARK), true);
    // The own check does not hide the lifecycle check from its own injection.
    assert.equal(withoutLifecycleChecks(owned.sources.get(UC('markServed')) ?? '').removed, 1);
    owned.reset(seed());
    assert.equal((await call(owned.round, R.serve, AGENT, 'a-1', { id: 'v-2', details: { visitNote: 'n' } })).data !== undefined, true);
  } finally {
    owned.dispose();
  }
  const anonymous = await load((ref, source) => ref === CTRL('round') ? source.replace(/\n[^\n]*if \(!actorId\) throw[^\n]*/, '') : source);
  try {
    anonymous.reset(seed());
    assert.equal(((await call(anonymous.round, R.roundList, AGENT, '', {})).data as unknown[]).length, 2);
  } finally {
    anonymous.dispose();
  }
  const disclosed = await load((ref, source) => {
    if (ref !== REQ('desk')) return source;
    const changed = source.replace(/projectOutput\((.*?), \[/g, "projectOutput($1, ['details', ");
    assert.notEqual(changed, source, 'the mutation widens the emitted request projection');
    return changed;
  });
  try {
    disclosed.reset(seed());
    const rows = (await call(disclosed.desk, R.deskList, DISPATCHER, 'd-1', {})).data as Array<{ details: Record<string, unknown> }>;
    assert.equal(rows[0].details.visitNote, 'private-1');
  } finally {
    disclosed.dispose();
  }
});

void test('a lifecycle without a single unreached state does not emit a create', async () => {
  const ambiguous = def('domainEntity', 'Visit', [], {
    ...entity.data,
    lifecycle: { ...lifecycle, states: [...lifecycle.states, { state: 'parked', reachedBy: 'actor' }] },
  });
  const read = reader(new Map([[ENTITY, asSource(ambiguous)]]));
  const result = await emitBehavior('implement.usecase', createVisit, outputPathFromDefPath(UC('createVisit')), read);
  assert.equal('code' in result && result.code, 'LIFECYCLE_INITIAL');
});

void test('the fixture l4 has none of the retired fields and the handlers do not read them', () => {
  for (const field of ['operations', 'readProjection', 'preconditions']) assert.equal(field in ontology, false, field);
  const behavior = readFileSync(join(HERE, 'emitBehavior.ts'), 'utf8');
  const structure = readFileSync(join(HERE, '../structure/emit.ts'), 'utf8');
  for (const source of [behavior, structure]) {
    assert.equal(/data\.(operations|readProjection|preconditions)\b/.test(source), false);
  }
});
