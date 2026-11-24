/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/callGroups.test.ts" enhancement="_blank"/>

// d1_285 s2: steps of one entity and effect that cite different calls are different groups. On an entity the module keeps, the steps with no call keep the planned usecase
// local (no `call`, never the consumer of the calls of the other steps); the calls belong to the usecases of the entity each call is about. On an external entity there is one
// usecase per call, as before; steps with the same set of calls are one group, as before.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { externalCallsOf, externalUsecaseForCall, splitExternalUsecases } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';

function usecase(usecaseId: string, entity: string, operation: string): D1SelectedUsecase {
  return { usecaseId, entity, operation, status: 'toCreate', existing: '', identity: usecaseId, routes: [] };
}

const journeys = {
  tools: {
    journeyId: 'tools',
    business: {
      steps: [
        { stepId: 'pick', kind: 'act', entity: 'Choice', effect: 'create' },
        { stepId: 'suggest', kind: 'act', entity: 'Choice', effect: 'create' },
        { stepId: 'findOwner', kind: 'inspect', entity: 'Owner' },
        { stepId: 'saveOwner', kind: 'act', entity: 'Owner', effect: 'update' },
      ],
    },
  },
};
const connections = [
  { connectionId: 'cm', operationId: 'readOwner', direction: 'call', effect: 'read', entityRefs: ['Owner'], usedBy: ['tools.suggest', 'tools.findOwner'] },
  { connectionId: 'cm', operationId: 'askModel', direction: 'call', effect: 'update', entityRefs: ['Choice'], usedBy: ['tools.suggest', 'tools.saveOwner'] },
];
const kinds = new Map([['Choice', 'entity'], ['Owner', 'external']]);
const planned = [usecase('createChoice', 'Choice', 'create'), usecase('getOwner', 'Owner', 'get'), usecase('updateOwner', 'Owner', 'update')];

void test('(i) an entity the module keeps: the step with no call keeps the usecase local, the step with two calls does not take it', () => {
  const split = splitExternalUsecases({ journeys, connections, usecases: planned, entityKind: kinds, taken: new Set(), splitStored: true });
  const rows = split.usecases.map(item => `${item.usecaseId}|${item.entity}|${item.operation}|${item.call ?? ''}`);
  assert.deepEqual(rows, [
    'createChoice|Choice|create|',
    'getOwner|Owner|get|cm.readOwner',
    'updateOwner|Owner|update|cm.askModel',
  ], 'no usecase of Choice has a call; no usecase is born for the calls of the suggest step on Choice');
  const matches = externalCallsOf({ journeys, connections, usecases: split.usecases, entityKind: kinds, allEntities: true });
  const byId = Object.fromEntries(matches.map(match => [match.usecaseId, match]));
  assert.deepEqual(byId.createChoice, { usecaseId: 'createChoice', steps: ['tools.pick'], calls: [] }, 'local: serves the step with no call and consumes no call');
  assert.deepEqual(byId.getOwner.calls, [{ connectionId: 'cm', operationId: 'readOwner' }]);
  assert.deepEqual(byId.updateOwner.calls, [{ connectionId: 'cm', operationId: 'askModel' }]);
  // The route of the suggest step runs these calls through the usecase of the entity each call is about.
  const call = (key: string) => externalUsecaseForCall({ call: key, usecases: split.usecases, entityKind: kinds, connections })?.usecaseId;
  assert.equal(call('cm.readOwner'), 'getOwner');
  assert.equal(call('cm.askModel'), 'updateOwner');
});

void test('(ii) an external entity: two steps with different calls get one usecase per call, as before', () => {
  const external = new Map([['Choice', 'external'], ['Owner', 'external']]);
  const split = splitExternalUsecases({ journeys, connections, usecases: [usecase('createChoice', 'Choice', 'create')], entityKind: external, taken: new Set() });
  assert.deepEqual(split.usecases.map(item => [item.usecaseId, item.operation, item.call]), [
    ['getChoice', 'get', 'cm.readOwner'],
    ['createChoice', 'create', 'cm.askModel'],
  ]);
});

void test('(iii) steps of the same set of calls are one group: nothing changes, on a module entity and on an external one', () => {
  const same = { tools: { journeyId: 'tools', business: { steps: [
    { stepId: 'pick', kind: 'act', entity: 'Choice', effect: 'create' },
    { stepId: 'suggest', kind: 'act', entity: 'Choice', effect: 'create' },
  ] } } };
  const both = [{ connectionId: 'cm', operationId: 'askModel', direction: 'call', effect: 'update', usedBy: ['tools.pick', 'tools.suggest'] }];
  const local = externalCallsOf({ journeys: same, connections: both, usecases: [usecase('createChoice', 'Choice', 'create')], entityKind: kinds, allEntities: true });
  assert.deepEqual(local, [{ usecaseId: 'createChoice', steps: ['tools.pick', 'tools.suggest'], calls: [{ connectionId: 'cm', operationId: 'askModel' }] }]);
  const kept = splitExternalUsecases({ journeys: same, connections: both, usecases: [usecase('createChoice', 'Choice', 'create')], entityKind: kinds, taken: new Set(), splitStored: true });
  assert.deepEqual(kept.usecases.map(item => [item.usecaseId, item.call ?? '']), [['createChoice', '']], 'one call on a module entity: no `call` is put on it (d1_269)');
  const external = splitExternalUsecases({ journeys: same, connections: both, usecases: [usecase('createChoice', 'Choice', 'create')], entityKind: new Map([['Choice', 'external']]), taken: new Set() });
  assert.deepEqual(external.usecases.map(item => [item.usecaseId, item.call]), [['createChoice', 'cm.askModel']]);
  // No step cites a call: the usecase has none either way.
  const none = externalCallsOf({ journeys: same, connections: [], usecases: [usecase('createChoice', 'Choice', 'create')], entityKind: kinds, allEntities: true });
  assert.deepEqual(none, [{ usecaseId: 'createChoice', steps: ['tools.pick', 'tools.suggest'], calls: [] }]);
});
