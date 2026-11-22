/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/externalCalls.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { externalCallsOf, processConsumersOf, routeCallsOf, splitExternalUsecases } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';

function usecase(usecaseId: string, entity: string, operation: string, transitionRef = ''): D1SelectedUsecase {
  return {
    usecaseId,
    entity,
    operation,
    ...(transitionRef ? { transitionRef } : {}),
    status: 'toCreate',
    existing: '',
    identity: usecaseId,
    routes: [],
  };
}

const journeys = {
  reviewDraft: {
    journeyId: 'reviewDraft',
    business: {
      steps: [
        { stepId: 'activateDraft', kind: 'act', entity: 'Draft', effect: 'transition', transitionRef: 'activate' },
        { stepId: 'discardDraft', kind: 'act', entity: 'Draft', effect: 'transition', transitionRef: 'discard' },
      ],
    },
  },
  simulate: {
    journeyId: 'simulate',
    business: {
      steps: ['seeOne', 'seeTwo', 'seeThree', 'seeFour', 'seeFive'].map(stepId => ({
        stepId,
        kind: 'inspect',
        entity: 'Simulation',
      })),
    },
  },
  changeNote: {
    journeyId: 'changeNote',
    business: {
      steps: [
        { stepId: 'changeConduct', kind: 'act', entity: 'Note', effect: 'update' },
      ],
    },
  },
  orphan: {
    journeyId: 'orphan',
    business: {
      steps: [
        { stepId: 'doThing', kind: 'act', entity: 'Widget', effect: 'create' },
      ],
    },
  },
};

const connections = [
  { connectionId: 'hub', operationId: 'activateDraft', direction: 'call', usedBy: ['reviewDraft.activateDraft'] },
  { connectionId: 'hub', operationId: 'discardDraft', direction: 'call', usedBy: ['reviewDraft.discardDraft'] },
  { connectionId: 'hub', operationId: 'simulate', direction: 'call', usedBy: ['simulate.seeOne', 'simulate.seeTwo', 'simulate.seeThree', 'simulate.seeFour', 'simulate.seeFive'] },
  { connectionId: 'hub', operationId: 'saveOther', direction: 'call', entityRefs: ['Other'], effect: 'update', usedBy: ['changeNote.changeConduct'] },
];

const kind = new Map([['Draft', 'external'], ['Simulation', 'external'], ['Note', 'external'], ['Widget', 'external'], ['Shelf', 'mdm']]);

void test('a transition step is the call whose usedBy cites it', () => {
  const matches = externalCallsOf({
    journeys,
    connections,
    usecases: [usecase('activate', 'Draft', 'transition', 'activate'), usecase('discard', 'Draft', 'transition', 'discard')],
    entityKind: kind,
  });
  assert.deepEqual(matches, [
    { usecaseId: 'activate', steps: ['reviewDraft.activateDraft'], calls: [{ connectionId: 'hub', operationId: 'activateDraft' }] },
    { usecaseId: 'discard', steps: ['reviewDraft.discardDraft'], calls: [{ connectionId: 'hub', operationId: 'discardDraft' }] },
  ]);
});

void test('five inspect steps share one call that has no entityRefs', () => {
  const [match] = externalCallsOf({
    journeys,
    connections,
    usecases: [usecase('listSimulation', 'Simulation', 'list')],
    entityKind: kind,
  });
  assert.deepEqual(match.steps, ['simulate.seeFive', 'simulate.seeFour', 'simulate.seeOne', 'simulate.seeThree', 'simulate.seeTwo']);
  assert.deepEqual(match.calls, [{ connectionId: 'hub', operationId: 'simulate' }]);
});

void test('an update step is served by the call that cites it even when entityRefs names another entity', () => {
  const [match] = externalCallsOf({
    journeys,
    connections,
    usecases: [usecase('updateNote', 'Note', 'update')],
    entityKind: kind,
  });
  assert.deepEqual(match, {
    usecaseId: 'updateNote',
    steps: ['changeNote.changeConduct'],
    calls: [{ connectionId: 'hub', operationId: 'saveOther' }],
  });
});

void test('a usecase no step serves and a step no call cites are both empty of calls', () => {
  const matches = externalCallsOf({
    journeys,
    connections,
    usecases: [usecase('listWidget', 'Widget', 'list'), usecase('createWidget', 'Widget', 'create')],
    entityKind: kind,
  });
  assert.deepEqual(matches, [
    { usecaseId: 'listWidget', steps: [], calls: [] },
    { usecaseId: 'createWidget', steps: ['orphan.doThing'], calls: [] },
  ]);
});

void test('an entity that is not external is left out', () => {
  const matches = externalCallsOf({
    journeys,
    connections,
    usecases: [usecase('listShelf', 'Shelf', 'list'), usecase('activate', 'Draft', 'transition', 'activate')],
    entityKind: kind,
  });
  assert.deepEqual(matches.map(match => match.usecaseId), ['activate']);
});

void test('a call cited by a mechanical or llm task of a process is consumed by that process; a human task, a journey step and an unknown ref are not', () => {
  const processes = [{
    processId: 'proc',
    tasks: [
      { taskId: 'taskMech', kind: 'mechanical' },
      { taskId: 'taskLlm', kind: 'llm' },
      { taskId: 'taskHuman', kind: 'human' },
    ],
  }];
  assert.deepEqual(processConsumersOf(['proc.taskMech', 'proc.taskLlm', 'proc.taskHuman', 'journey.step', 'other.x'], processes), ['proc']);
  assert.deepEqual(processConsumersOf(['proc.taskHuman', 'journey.step', 'other.x', 'proc', 'proc.unknownTask'], processes), []);
  assert.deepEqual(processConsumersOf(['proc.taskMech'], []), []);
  assert.deepEqual(processConsumersOf(['b.t', 'a.t'], [
    { processId: 'a', tasks: [{ taskId: 't', kind: 'llm' }] },
    { processId: 'b', tasks: [{ taskId: 't', kind: 'mechanical' }] },
  ]), ['a', 'b']);
});


const splitJourneys = {
  browse: {
    journeyId: 'browse',
    business: {
      steps: [
        { stepId: 'find', kind: 'locate', entity: 'Agent' },
        { stepId: 'open', kind: 'inspect', entity: 'Agent' },
      ],
    },
  },
  tune: {
    journeyId: 'tune',
    business: {
      steps: [
        { stepId: 'save', kind: 'act', entity: 'Note', effect: 'update' },
        { stepId: 'change', kind: 'act', entity: 'AgentBehavior', effect: 'update' },
        { stepId: 'undo', kind: 'act', entity: 'AgentBehavior', effect: 'update' },
        { stepId: 'other', kind: 'act', entity: 'AgentBehavior', effect: 'update' },
      ],
    },
  },
};

const splitConnections = [
  { connectionId: 'cm', operationId: 'listAgents', direction: 'call', effect: 'list', usedBy: ['browse.find'] },
  { connectionId: 'cm', operationId: 'readAgent', direction: 'call', effect: 'read', usedBy: ['browse.open'] },
  { connectionId: 'cm', operationId: 'saveNote', direction: 'call', effect: 'update', usedBy: ['tune.save'] },
  { connectionId: 'cm', operationId: 'updateAgent', direction: 'call', effect: 'update', usedBy: ['tune.change'] },
  { connectionId: 'cm', operationId: 'undoAgentChange', direction: 'call', effect: 'update', usedBy: ['tune.undo'] },
];

const splitKind = new Map([['Agent', 'external'], ['Note', 'external'], ['AgentBehavior', 'external'], ['Widget', 'external']]);

void test('splitExternalUsecases: a read usecase served by a list call and a read call becomes listAgent and getAgent', () => {
  const planned = usecase('listAgent', 'Agent', 'list');
  const { usecases, splits } = splitExternalUsecases({
    journeys: splitJourneys,
    connections: splitConnections,
    usecases: [planned],
    entityKind: splitKind,
    taken: new Set(),
  });
  assert.deepEqual(usecases.map(item => [item.usecaseId, item.operation, item.call]), [
    ['listAgent', 'list', 'cm.listAgents'],
    ['getAgent', 'get', 'cm.readAgent'],
  ]);
  assert.equal(usecases[0].identity, 'listAgent');
  assert.equal(usecases[1].identity, 'getAgent');
  assert.equal(usecases[1].entity, 'Agent');
  assert.equal(usecases[1].status, 'toCreate');
  assert.deepEqual(splits, [{
    from: 'listAgent',
    into: [
      { usecaseId: 'listAgent', operation: 'list', call: 'cm.listAgents' },
      { usecaseId: 'getAgent', operation: 'get', call: 'cm.readAgent' },
    ],
  }]);
});

void test('splitExternalUsecases: a usecase with one call keeps its id and names the call; one no call serves is unchanged', () => {
  const note = usecase('updateNote', 'Note', 'update');
  const widget = usecase('listWidget', 'Widget', 'list');
  const { usecases, splits } = splitExternalUsecases({
    journeys: splitJourneys,
    connections: splitConnections,
    usecases: [note, widget],
    entityKind: splitKind,
    taken: new Set(),
  });
  assert.deepEqual(splits, []);
  assert.deepEqual(usecases[0], { ...note, call: 'cm.saveNote' });
  assert.deepEqual(usecases[1], widget);
  assert.equal('call' in usecases[1], false);
});

void test('splitExternalUsecases: two calls of the same operation are named by operationId, and by the entity when that id is taken', () => {
  const behavior = usecase('changeBehavior', 'AgentBehavior', 'update');
  const { usecases, splits } = splitExternalUsecases({
    journeys: {
      tune: {
        journeyId: 'tune',
        business: { steps: splitJourneys.tune.business.steps.filter(step => step.stepId === 'change' || step.stepId === 'undo') },
      },
    },
    connections: splitConnections,
    usecases: [behavior],
    entityKind: splitKind,
    taken: new Set(['updateAgent']),
  });
  assert.deepEqual(usecases.map(item => [item.usecaseId, item.operation, item.call]), [
    ['updateAgentAgentBehavior', 'update', 'cm.updateAgent'],
    ['undoAgentChange', 'update', 'cm.undoAgentChange'],
  ]);
  assert.equal(usecases.every(item => item.entity === 'AgentBehavior' && item.status === 'toCreate'), true);
  assert.deepEqual(splits.map(item => [item.from, item.into.map(part => part.usecaseId)]), [
    ['changeBehavior', ['updateAgentAgentBehavior', 'undoAgentChange']],
  ]);
});

void test('externalCallsOf: a usecase that names its call is served only by that call', () => {
  const both = externalCallsOf({
    journeys: splitJourneys,
    connections: splitConnections,
    usecases: [usecase('listAgent', 'Agent', 'list')],
    entityKind: splitKind,
  });
  assert.deepEqual(both[0].calls, [
    { connectionId: 'cm', operationId: 'listAgents' },
    { connectionId: 'cm', operationId: 'readAgent' },
  ]);
  const named: D1SelectedUsecase = { ...usecase('getAgent', 'Agent', 'get'), call: 'cm.readAgent' };
  const [one] = externalCallsOf({
    journeys: splitJourneys,
    connections: splitConnections,
    usecases: [named],
    entityKind: splitKind,
  });
  assert.deepEqual(one, { usecaseId: 'getAgent', steps: ['browse.find', 'browse.open'], calls: [{ connectionId: 'cm', operationId: 'readAgent' }] });
});

const routeNeeds = {
  pages: [{
    pageId: 'behavior',
    reads: [{ entity: 'Agent', from: ['journey:browse/find', 'journey:browse/open', 'journey:tune/change'] }],
    writes: [
      { entity: 'AgentBehavior', operation: 'update', from: ['journey:tune/change', 'journey:tune/undo', 'grant:g'] },
      { entity: 'AgentBehavior', operation: 'create', from: ['journey:tune/other'] },
    ],
  }],
};

void test('routeCallsOf: a write entry gives the calls of the steps it cites, sorted, and ignores other operations and refs that are not journey steps', () => {
  const calls = routeCallsOf({
    needs: routeNeeds,
    journeys: splitJourneys,
    connections: splitConnections,
    pageId: 'behavior',
    entity: 'AgentBehavior',
    operation: 'update',
    transitionRef: '',
  });
  assert.deepEqual(calls, ['cm.undoAgentChange', 'cm.updateAgent']);
});

void test('routeCallsOf: a read entry counts only the locate and inspect steps of that entity', () => {
  const calls = routeCallsOf({
    needs: routeNeeds,
    journeys: splitJourneys,
    connections: splitConnections,
    pageId: 'behavior',
    entity: 'Agent',
    operation: 'list',
    transitionRef: '',
  });
  assert.deepEqual(calls, ['cm.listAgents', 'cm.readAgent']);
});

void test('routeCallsOf: an unknown page has no calls', () => {
  assert.deepEqual(routeCallsOf({
    needs: routeNeeds,
    journeys: splitJourneys,
    connections: splitConnections,
    pageId: 'missing',
    entity: 'AgentBehavior',
    operation: 'update',
    transitionRef: '',
  }), []);
});

// d1_264: the read of an entity the module stores stays on its repository when the call names other entities.
void test('a call that names other entities does not serve the read of an entity the module stores; a write and an unknown entity keep the step', () => {
  const stored = {
    open: { journeyId: 'open', business: { steps: [
      { stepId: 'follow', kind: 'locate', entity: 'Draft' },
      { stepId: 'send', kind: 'act', entity: 'Draft', effect: 'create' },
    ] } },
  };
  const calls = [
    { connectionId: 'cm', operationId: 'listAgents', direction: 'call', usedBy: ['open.follow'], entityRefs: ['Agent'] },
    { connectionId: 'cm', operationId: 'createAgent', direction: 'call', usedBy: ['open.send'], entityRefs: ['Agent'] },
  ];
  const usecases = [usecase('listDraft', 'Draft', 'list'), usecase('createDraft', 'Draft', 'create')];
  const calls0 = (kinds: Map<string, string>) => externalCallsOf({ journeys: stored, connections: calls, usecases, entityKind: kinds, allEntities: true })
    .map(match => `${match.usecaseId}:${match.calls.map(call => call.operationId).join()}`);
  assert.deepEqual(calls0(new Map([['Draft', 'entity']])), ['listDraft:', 'createDraft:createAgent'], 'a stored entity: the list is not served, the write is');
  assert.deepEqual(calls0(new Map([['Draft', 'external']])), ['listDraft:listAgents', 'createDraft:createAgent'], 'an external entity: the call serves it');
  assert.deepEqual(calls0(new Map()), ['listDraft:listAgents', 'createDraft:createAgent'], 'an entity the L4 does not give: as before');
  const route = (kinds: Map<string, string>) => routeCallsOf({ needs: { pages: [{ pageId: 'p', reads: [{ entity: 'Draft', from: ['journey:open/follow'] }] }] }, journeys: stored, connections: calls, entityKind: kinds, pageId: 'p', entity: 'Draft', operation: 'list', transitionRef: '' });
  assert.deepEqual(route(new Map([['Draft', 'entity']])), []);
  assert.deepEqual(route(new Map()), ['cm.listAgents']);
});

// d1_280: `102047@bc0fbedf`. `changeMyConduct.changeConduct` writes PersonalConduct and the L4 also lists `cm.readAgent` on it (the version read), so the one usecase
// `updatePersonalConduct` is served by two calls. The read call used to inherit the planned `update` (usecase `readAgent`, operation `update`).
const conductJourneys = {
  changeMyConduct: {
    journeyId: 'changeMyConduct',
    business: {
      steps: [
        { stepId: 'findMyAgent', kind: 'locate', entity: 'Agent' },
        { stepId: 'readMyConduct', kind: 'inspect', entity: 'PersonalConduct' },
        { stepId: 'changeConduct', kind: 'act', entity: 'PersonalConduct', effect: 'update', affects: ['ConductChange'] },
      ],
    },
  },
};
const conductConnections = [
  { connectionId: 'cm', operationId: 'readAgent', direction: 'call', effect: 'read', entityRefs: ['Agent', 'AgentBehavior', 'PersonalConduct'], usedBy: ['changeMyConduct.readMyConduct', 'changeMyConduct.changeConduct'] },
  { connectionId: 'cm', operationId: 'updateAgent', direction: 'call', effect: 'update', entityRefs: ['Agent', 'PersonalConduct'], usedBy: ['changeMyConduct.changeConduct'] },
];

void test('d1_280 (on bc0fbedf): a read call of a write usecase is a get; the write call keeps the planned update and its id', () => {
  const planned = usecase('updatePersonalConduct', 'PersonalConduct', 'update');
  const { usecases, splits } = splitExternalUsecases({
    journeys: conductJourneys,
    connections: conductConnections,
    usecases: [planned],
    entityKind: new Map([['PersonalConduct', 'external'], ['Agent', 'external']]),
    taken: new Set(),
  });
  assert.deepEqual(usecases.map(item => [item.usecaseId, item.operation, item.call]), [
    ['getPersonalConduct', 'get', 'cm.readAgent'],
    ['updatePersonalConduct', 'update', 'cm.updateAgent'],
  ]);
  assert.equal(usecases[1].status, planned.status, 'the planned usecase stays itself');
  assert.equal(usecases[0].status, 'toCreate');
  assert.deepEqual(splits[0].into.map(part => part.operation), ['get', 'update']);
});

void test('d1_280: two write calls of an update usecase, and a list served by read + list, come out as before', () => {
  const behavior = usecase('changeBehavior', 'AgentBehavior', 'update');
  const writes = splitExternalUsecases({
    journeys: {
      tune: { journeyId: 'tune', business: { steps: splitJourneys.tune.business.steps.filter(step => step.stepId === 'change' || step.stepId === 'undo') } },
    },
    connections: splitConnections,
    usecases: [behavior],
    entityKind: splitKind,
    taken: new Set(['updateAgent']),
  });
  assert.deepEqual(writes.usecases.map(item => [item.usecaseId, item.operation]), [['updateAgentAgentBehavior', 'update'], ['undoAgentChange', 'update']]);
  const listed = splitExternalUsecases({ journeys: splitJourneys, connections: splitConnections, usecases: [usecase('listAgent', 'Agent', 'list')], entityKind: splitKind, taken: new Set() });
  assert.deepEqual(listed.usecases.map(item => [item.usecaseId, item.operation]), [['listAgent', 'list'], ['getAgent', 'get']]);
});

void test('d1_280: a write usecase served by one call whose effect is a read keeps its operation (one call serves it as planned)', () => {
  const only = splitExternalUsecases({
    journeys: conductJourneys,
    connections: [conductConnections[0]],
    usecases: [usecase('updatePersonalConduct', 'PersonalConduct', 'update')],
    entityKind: new Map([['PersonalConduct', 'external']]),
    taken: new Set(),
  });
  assert.deepEqual(only.usecases.map(item => [item.usecaseId, item.operation, item.call]), [['updatePersonalConduct', 'update', 'cm.readAgent']]);
});
