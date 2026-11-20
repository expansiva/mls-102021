/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveServe.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { exampleCatalog } from '/_102034_/testing/connections/connectionFixtures.js';
import type { D1InputProblem, D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { deriveServeRequests, processTriggerServes, takeUsecase, type D1ServeLine } from '/_102021_/l2/agentDefsL1/steps/input20/deriveServe.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(here, '../../../../../mls-102034/l2/shared/contracts/connections/cm.ts');
const catalogText = readFileSync(catalogPath, 'utf8');

const MODULE = 'desk';
const ENTITY = 'AgentExecution';

function run(lines: D1ServeLine[], usecases: D1SelectedUsecase[] = [], processTriggers?: ReadonlySet<string>): { requests: ReturnType<typeof deriveServeRequests>; problems: D1InputProblem[]; usecases: D1SelectedUsecase[] } {
  const problems: D1InputProblem[] = [];
  const requests = deriveServeRequests({
    moduleName: MODULE,
    lines,
    catalogTexts: { cm: catalogText },
    usecases,
    problems,
    entities: { [ENTITY]: { entityId: ENTITY } },
    plannedIds: new Map(usecases.map(item => [item.usecaseId, `${item.entity}.${item.operation}`])),
    removedIds: new Set(),
    ...(processTriggers ? { processTriggers } : {}),
  });
  return { requests, problems, usecases };
}

void test('the example fixture catalog is a connection catalog and is not copied into this step', () => {
  assert.equal(exampleCatalog.connectionId, 'example');
  assert.equal(exampleCatalog.operations.some(item => item.direction === 'serve'), true);
});

void test('a serve that creates becomes a cmd request and creates the missing usecase', () => {
  const { requests, problems, usecases } = run([
    { connectionId: 'cm', operationId: 'record', entityRefs: [ENTITY], effect: 'create' },
  ]);
  assert.deepEqual(problems.map(item => item.code), ['USECASE_FROM_CONTRACT']);
  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request?.route, `${MODULE}.cm.record`);
  assert.equal(request?.pageId, 'cm');
  assert.equal(request?.kind, 'cmd');
  assert.equal(request?.serves, 'cm.record');
  assert.equal(request?.writes, `${ENTITY}.create`);
  assert.deepEqual(request?.outputs, []);
  assert.deepEqual(request?.uses, ['createAgentExecution']);
  assert.equal(usecases[0]?.operation, 'create');
  assert.equal(usecases[0]?.status, 'toCreate');
  assert.deepEqual(request?.params.map(item => item.name), [
    'executionId', 'agentId', 'mode', 'startedAt', 'durationMs', 'costUsd', 'actions', 'usedMainModel', 'handedOff', 'refs',
  ]);
  assert.equal(request?.params.every(item => item.target === ''), true);
  assert.equal(request?.params.some(item => item.optional), false);
});

void test('a serve that creates uses the planned create usecase', () => {
  const planned: D1SelectedUsecase = {
    usecaseId: 'recordExecution', entity: ENTITY, operation: 'create', status: 'done', existing: 'recordExecution', identity: 'recordExecution', routes: [],
  };
  const { requests, problems, usecases } = run([
    { connectionId: 'cm', operationId: 'record', entityRefs: [ENTITY], effect: 'create' },
  ], [planned]);
  assert.deepEqual(problems, []);
  assert.deepEqual(requests[0]?.uses, ['recordExecution']);
  assert.equal(usecases.length, 1);
});

void test('describe has no entity and is a query with no uses', () => {
  const { requests, problems, usecases } = run([{ connectionId: 'cm', operationId: 'describe' }]);
  assert.deepEqual(problems, []);
  assert.equal(usecases.length, 0);
  assert.equal(requests[0]?.kind, 'qry');
  assert.equal(requests[0]?.route, `${MODULE}.cm.describe`);
  assert.equal(requests[0]?.serves, 'cm.describe');
  assert.equal(requests[0]?.writes, '');
  assert.deepEqual(requests[0]?.uses, []);
  assert.deepEqual(requests[0]?.params.map(item => item.name), ['agentId', 'knownVersion', 'authorities', 'snapshotAt']);
  assert.equal(requests[0]?.params.find(item => item.name === 'knownVersion')?.optional, true);
});

void test('agentDraftReady is a command and its input members are the params', () => {
  const { requests, problems } = run([
    { connectionId: 'cm', operationId: 'agentDraftReady', entityRefs: [ENTITY], effect: 'update' },
  ]);
  assert.equal(problems.some(item => item.code === 'USECASE_FROM_CONTRACT'), true);
  assert.equal(requests[0]?.kind, 'cmd');
  assert.equal(requests[0]?.route, `${MODULE}.cm.agentDraftReady`);
  assert.equal(requests[0]?.serves, 'cm.agentDraftReady');
  assert.equal(requests[0]?.writes, `${ENTITY}.update`);
  assert.deepEqual(requests[0]?.uses, ['updateAgentExecution']);
  assert.deepEqual(requests[0]?.params.map(item => item.name), ['draftId', 'status', 'refusedReason', 'suggestedTools']);
  assert.equal(requests[0]?.params.find(item => item.name === 'refusedReason')?.optional, true);
});


function take(usecases: D1SelectedUsecase[], routeCalls?: readonly string[]): { problems: D1InputProblem[]; uses: string[] } {
  const problems: D1InputProblem[] = [];
  const uses: string[] = [];
  takeUsecase({
    problems,
    path: 'requests',
    routeName: 'behavior.update',
    entity: 'AgentBehavior',
    operation: 'update',
    transitionKey: '',
    usecases,
    uses,
    colliding: new Set(),
    refusalOf: () => '',
    ...(routeCalls ? { routeCalls } : {}),
  });
  return { problems, uses };
}

function behaviorUsecase(usecaseId: string, call?: string): D1SelectedUsecase {
  return {
    usecaseId, entity: 'AgentBehavior', operation: 'update', status: 'toCreate', existing: '', identity: usecaseId, routes: [], ...(call ? { call } : {}),
  };
}

void test('takeUsecase: with one usecase per call the route takes the one whose call its page steps cite', () => {
  const usecases = [behaviorUsecase('updateAgentBehavior', 'cm.updateAgent'), behaviorUsecase('undoAgentChange', 'cm.undoAgentChange')];
  const { problems, uses } = take(usecases, ['cm.updateAgent']);
  assert.deepEqual(problems, []);
  assert.deepEqual(uses, ['updateAgentBehavior']);
  assert.equal(usecases.length, 2);
  assert.deepEqual(take(usecases, ['cm.undoAgentChange', 'cm.other']).uses, ['undoAgentChange']);
});

void test('takeUsecase: when the page cites both calls the route lists both usecases in uses (the request body chooses by its input)', () => {
  const usecases = [behaviorUsecase('updateAgentBehavior', 'cm.updateAgent'), behaviorUsecase('undoAgentChange', 'cm.undoAgentChange')];
  const { problems, uses } = take(usecases, ['cm.updateAgent', 'cm.undoAgentChange']);
  assert.deepEqual(problems, []);
  assert.deepEqual(uses, ['updateAgentBehavior', 'undoAgentChange']);
  assert.equal(usecases.length, 2);
});

void test('takeUsecase: when the page cites none of the calls the route is EXTERNAL_ROUTE_CALL_UNRESOLVED and takes nothing', () => {
  const usecases = [behaviorUsecase('updateAgentBehavior', 'cm.updateAgent'), behaviorUsecase('undoAgentChange', 'cm.undoAgentChange')];
  for (const routeCalls of [[], undefined, ['cm.other']]) {
    const { problems, uses } = take(usecases, routeCalls);
    assert.deepEqual(uses, []);
    assert.deepEqual(problems.map(item => [item.severity, item.code]), [['error', 'EXTERNAL_ROUTE_CALL_UNRESOLVED']]);
    assert.match(problems[0].message, /updateAgentBehavior → cm\.updateAgent/u);
    assert.match(problems[0].message, /undoAgentChange → cm\.undoAgentChange/u);
  }
  assert.equal(usecases.length, 2);
});

void test('takeUsecase: a single usecase, with or without a call, still matches as before', () => {
  assert.deepEqual(take([behaviorUsecase('updateAgentBehavior')]).uses, ['updateAgentBehavior']);
  const named = take([behaviorUsecase('updateAgentBehavior', 'cm.updateAgent')], ['cm.undoAgentChange']);
  assert.deepEqual(named.problems, []);
  assert.deepEqual(named.uses, ['updateAgentBehavior']);
});

// The triggers of the L4 processes of a module (copy of the shape of `agents/workflows.defs.ts`): one by event, one by actor.
const WORKFLOWS = {
  processes: [
    { processId: 'creation', trigger: { kind: 'manual', actorRef: 'companyAdmin' } },
    { processId: 'catalogRefresh', trigger: { kind: 'event', event: 'cm.record' } },
    { processId: 'noEvent', trigger: { kind: 'event' } },
  ],
};

void test('d1_206: the serve a process starts on takes no usecase from its effect', () => {
  const triggers = processTriggerServes(WORKFLOWS);
  assert.deepEqual([...triggers], ['cm.record']);
  const { requests, problems, usecases } = run([
    { connectionId: 'cm', operationId: 'record', entityRefs: [ENTITY], effect: 'create' },
  ], [], triggers);
  assert.deepEqual(problems, []);
  assert.deepEqual(requests[0]?.uses, []);
  assert.equal(requests[0]?.serves, 'cm.record');
  assert.equal(usecases.length, 0);
});

void test('d1_206: a serve no process starts on keeps the usecase of its effect', () => {
  const { requests, usecases } = run([
    { connectionId: 'cm', operationId: 'agentDraftReady', entityRefs: [ENTITY], effect: 'update' },
  ], [], processTriggerServes(WORKFLOWS));
  assert.deepEqual(requests[0]?.uses, ['updateAgentExecution']);
  assert.equal(usecases.length, 1);
});

void test('d1_206: only an event trigger counts; a manual process or a workflows source without processes starts no serve', () => {
  assert.equal(processTriggerServes({ processes: [{ processId: 'x', trigger: { kind: 'manual', event: 'cm.record' } }] }).size, 0);
  assert.equal(processTriggerServes({}).size, 0);
});

void test('d1_208: a serve of a system this module declares takes no catalog: it is a command with no input fields yet', () => {
  const problems: D1InputProblem[] = [];
  const requests = deriveServeRequests({
    moduleName: MODULE,
    lines: [{ connectionId: 'repoHost', operationId: 'changePushed' }],
    catalogTexts: {},
    usecases: [],
    problems,
    entities: {},
    plannedIds: new Map(),
    removedIds: new Set(),
    declaredSystems: { repoHost: [{ operationId: 'listChanges', direction: 'call' }, { operationId: 'changePushed', direction: 'serve' }] },
  });
  assert.deepEqual(problems, []);
  assert.equal(requests.length, 1);
  assert.deepEqual([requests[0].route, requests[0].serves, requests[0].kind, requests[0].params, requests[0].uses], [`${MODULE}.repoHost.changePushed`, 'repoHost.changePushed', 'cmd', [], []]);
});

void test('d1_208: a serve line of a declared system names an operation the L4 declares, and as a serve', () => {
  const declaredSystems = { repoHost: [{ operationId: 'listChanges', direction: 'call' }, { operationId: 'changePushed', direction: 'serve' }] };
  const base = { moduleName: MODULE, catalogTexts: {}, usecases: [], entities: {}, plannedIds: new Map(), removedIds: new Set(), declaredSystems };
  const missing: D1InputProblem[] = [];
  deriveServeRequests({ ...base, lines: [{ connectionId: 'repoHost', operationId: 'nothing' }], problems: missing });
  assert.equal(missing.some(item => item.code === 'OPERATION_NOT_IN_CATALOG'), true);
  const wrong: D1InputProblem[] = [];
  deriveServeRequests({ ...base, lines: [{ connectionId: 'repoHost', operationId: 'listChanges' }], problems: wrong });
  assert.equal(wrong.some(item => item.code === 'OPERATION_NOT_SERVE'), true);
  // An id no catalog and no declared system owns keeps the refusal it always had.
  const unknown: D1InputProblem[] = [];
  deriveServeRequests({ ...base, lines: [{ connectionId: 'nowhere', operationId: 'x' }], problems: unknown });
  assert.equal(unknown.some(item => item.code === 'CONNECTION_CATALOG_MISSING'), true);
});

void test('d1_208: a platform catalog wins over a declared system of the same id', () => {
  const problems: D1InputProblem[] = [];
  const requests = deriveServeRequests({
    moduleName: MODULE,
    lines: [{ connectionId: 'cm', operationId: 'record', entityRefs: [ENTITY], effect: 'create' }],
    catalogTexts: { cm: catalogText },
    usecases: [],
    problems,
    entities: { [ENTITY]: { entityId: ENTITY } },
    plannedIds: new Map(),
    removedIds: new Set(),
    declaredSystems: { cm: [{ operationId: 'record', direction: 'serve' }] },
  });
  assert.deepEqual(problems.filter(item => item.severity === 'error'), []);
  assert.notDeepEqual(requests[0]?.params, [], 'the params still come from the catalog file');
});

function runMany(lines: D1ServeLine[], entities: string[], usecases: D1SelectedUsecase[] = []): { requests: ReturnType<typeof deriveServeRequests>; problems: D1InputProblem[]; usecases: D1SelectedUsecase[] } {
  const problems: D1InputProblem[] = [];
  const requests = deriveServeRequests({
    moduleName: MODULE,
    lines,
    catalogTexts: { cm: catalogText },
    usecases,
    problems,
    entities: Object.fromEntries(entities.map(name => [name, { entityId: name }])),
    plannedIds: new Map(usecases.map(item => [item.usecaseId, `${item.entity}.${item.operation}`])),
    removedIds: new Set(),
  });
  return { requests, problems, usecases };
}

void test('d1_230: a read serve that lists two entities gets one usecase for each, in the order of the L4', () => {
  const { requests, problems, usecases } = runMany([
    { connectionId: 'cm', operationId: 'record', entityRefs: ['AgentTool', 'PersonToolRestriction'], effect: 'list' },
  ], ['AgentTool', 'PersonToolRestriction']);
  assert.deepEqual(requests[0]?.uses, ['listAgentTool', 'listPersonToolRestriction']);
  assert.deepEqual(usecases.map(item => `${item.entity}.${item.operation}`), ['AgentTool.list', 'PersonToolRestriction.list']);
  assert.deepEqual(problems.map(item => item.code), ['USECASE_FROM_CONTRACT', 'USECASE_FROM_CONTRACT']);
  // A usecase already in the plan is used, not created again.
  const planned: D1SelectedUsecase[] = [{ usecaseId: 'listAgentTool', entity: 'AgentTool', operation: 'list', status: 'create', existing: '', identity: 'listAgentTool', routes: [] } as D1SelectedUsecase];
  const again = runMany([{ connectionId: 'cm', operationId: 'record', entityRefs: ['AgentTool', 'PersonToolRestriction'], effect: 'list' }], ['AgentTool', 'PersonToolRestriction'], planned);
  assert.deepEqual(again.requests[0]?.uses, ['listAgentTool', 'listPersonToolRestriction']);
  assert.equal(again.usecases.filter(item => item.usecaseId === 'listAgentTool').length, 1);
  const get = runMany([{ connectionId: 'cm', operationId: 'record', entityRefs: ['AgentTool', 'PersonToolRestriction'], effect: 'read' }], ['AgentTool', 'PersonToolRestriction']);
  assert.deepEqual(get.requests[0]?.uses, ['getAgentTool', 'getPersonToolRestriction']);
});

void test('d1_230: an entity of a read serve that has no possible usecase is an error that names it, never dropped', () => {
  const { requests, problems } = runMany([
    { connectionId: 'cm', operationId: 'record', entityRefs: ['AgentTool', 'Ghost'], effect: 'list' },
  ], ['AgentTool']);
  assert.deepEqual(requests[0]?.uses, ['listAgentTool']);
  const refused = problems.filter(item => item.code === 'REQUEST_USECASE_UNPLANNED');
  assert.equal(refused.length, 1);
  assert.match(refused[0].message, /Entity Ghost is not in the module ontology/);
});

void test('d1_232: an old write serve that lists several entities has the one effect for each: one usecase per entity, no review', () => {
  const { requests, problems } = runMany([
    { connectionId: 'cm', operationId: 'record', entityRefs: ['AgentTool', 'PersonToolRestriction'], effect: 'create' },
  ], ['AgentTool', 'PersonToolRestriction']);
  assert.deepEqual(requests[0]?.uses, ['createAgentTool', 'createPersonToolRestriction']);
  assert.equal(problems.some(item => item.code === 'SERVE_WRITE_EXTRA_ENTITYREFS'), false, 'the effect of each entity is known now');
  assert.equal(problems.some(item => item.severity === 'error'), false);
});

void test('d1_232: a serve says its effects per entity: [create, update] on one entity is an upsert with its key', () => {
  const entities = { Item: { uniqueKeys: [['itemKey']] }, Plain: { record: { fields: { id: {}, name: {} } } }, Bare: { record: { fields: { name: {} } } }, Other: {} };
  const line = (effects: Array<{ entityId: string; effects: string[] }>): D1ServeLine => ({ connectionId: 'cm', operationId: 'record', entityEffects: effects });
  const run1 = (effects: Array<{ entityId: string; effects: string[] }>) => {
    const problems: D1InputProblem[] = [];
    const requests = deriveServeRequests({ moduleName: MODULE, lines: [line(effects)], catalogTexts: { cm: catalogText }, usecases: [], problems, entities, plannedIds: new Map(), removedIds: new Set() });
    return { requests, problems };
  };
  const unique = run1([{ entityId: 'Item', effects: ['create', 'update'] }, { entityId: 'Other', effects: ['create'] }]);
  assert.deepEqual(unique.requests[0]?.uses, ['createItem', 'updateItem', 'createOther']);
  assert.deepEqual(unique.requests[0]?.upserts, [{ entityId: 'Item', key: ['itemKey'], keyKind: 'unique' }]);
  const byId = run1([{ entityId: 'Plain', effects: ['create', 'update'] }]);
  assert.deepEqual(byId.requests[0]?.upserts, [{ entityId: 'Plain', key: ['id'], keyKind: 'id' }]);
  assert.equal(unique.requests[0]?.writes, 'Item.create', 'the first pair, as before');
  const none = run1([{ entityId: 'Bare', effects: ['create', 'update'] }]);
  const refusal = none.problems.find(item => item.code === 'ARRIVAL_UPSERT_WITHOUT_KEY');
  assert.ok(refusal);
  assert.equal(refusal.severity, 'error');
  assert.match(refusal.message, /desk\.cm\.record creates or updates Bare/);
  assert.equal(none.requests[0]?.upserts, undefined);
  const single = run1([{ entityId: 'Item', effects: ['create'] }]);
  assert.equal(single.requests[0]?.upserts, undefined, 'one effect is not an upsert');
  const confirm = run1([]);
  assert.deepEqual([confirm.requests[0]?.uses, confirm.requests[0]?.writes], [[], '']);
});

void test('d1_232: a serve that starts a process keeps d1_206 for one effect, and plans the usecases of an upsert (its port needs both) with the route still calling the process', () => {
  const entities = { Item: { uniqueKeys: [['itemKey']] } };
  const problems: D1InputProblem[] = [];
  const usecases: D1SelectedUsecase[] = [];
  const base = { moduleName: MODULE, catalogTexts: { cm: catalogText }, usecases, problems, entities, plannedIds: new Map<string, string>(), removedIds: new Set<string>(), processTriggers: new Set(['cm.record']) };
  const single = deriveServeRequests({ ...base, lines: [{ connectionId: 'cm', operationId: 'record', entityRefs: ['Item'], effect: 'update' }] });
  assert.deepEqual([single[0]?.uses, usecases.length], [[], 0]);
  const upsert = deriveServeRequests({ ...base, lines: [{ connectionId: 'cm', operationId: 'record', entityEffects: [{ entityId: 'Item', effects: ['create', 'update'] }] }] });
  assert.deepEqual(upsert[0]?.uses, [], 'the route calls the process');
  assert.deepEqual(usecases.map(item => `${item.entity}.${item.operation}`), ['Item.create', 'Item.update']);
  assert.deepEqual(upsert[0]?.upserts, [{ entityId: 'Item', key: ['itemKey'], keyKind: 'unique' }]);
});
