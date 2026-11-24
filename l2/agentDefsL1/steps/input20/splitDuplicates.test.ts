/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/splitDuplicates.test.ts" enhancement="_blank"/>

// d1_286: the division by call must not give a call a second usecase of an (entity, operation, transition, call) the entity already has. A planned usecase stays; a usecase the division
// itself created is dropped when the pair is taken, and when every one of the pair was born here the first by `usecaseId` stays.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { splitExternalUsecases } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';

function usecase(usecaseId: string, entity: string, operation: string, transitionRef = ''): D1SelectedUsecase {
  return { usecaseId, entity, operation, ...(transitionRef ? { transitionRef } : {}), status: 'toCreate', existing: '', identity: usecaseId, routes: [] };
}

const journeys = {
  owners: {
    journeyId: 'owners',
    business: {
      steps: [
        { stepId: 'open', kind: 'inspect', entity: 'Owner' },
        { stepId: 'save', kind: 'act', entity: 'Owner', effect: 'update' },
        { stepId: 'touch', kind: 'act', entity: 'Owner', effect: 'update' },
      ],
    },
  },
};
const connections = [
  { connectionId: 'hub', operationId: 'readOwner', direction: 'call', effect: 'read', usedBy: ['owners.open', 'owners.save', 'owners.touch'] },
  { connectionId: 'hub', operationId: 'writeOwner', direction: 'call', effect: 'update', usedBy: ['owners.save', 'owners.touch'] },
];
const kinds = new Map([['Owner', 'external']]);
const rows = (list: readonly D1SelectedUsecase[]) => list.map(item => `${item.usecaseId}|${item.entity}|${item.operation}|${item.call ?? ''}`);

void test('a read part born from a write usecase is not a second usecase for the call the planned get already has', () => {
  const split = splitExternalUsecases({ journeys, connections, usecases: [usecase('getOwner', 'Owner', 'get'), usecase('saveOwner', 'Owner', 'update')], entityKind: kinds, taken: new Set() });
  assert.deepEqual(rows(split.usecases), ['getOwner|Owner|get|hub.readOwner', 'saveOwner|Owner|update|hub.writeOwner'], 'one usecase reads the owner by that call: the planned one');
  const saved = split.splits.find(item => item.from === 'saveOwner');
  assert.deepEqual(saved?.into.map(part => [part.usecaseId, part.operation, part.call]), [['getOwner', 'get', 'hub.readOwner'], ['saveOwner', 'update', 'hub.writeOwner']], '`into` names the one that stayed');
});

void test('when every usecase of the pair was born by the division, the first by usecaseId stays', () => {
  const split = splitExternalUsecases({ journeys, connections, usecases: [usecase('saveOwner', 'Owner', 'update'), usecase('touchOwner', 'Owner', 'update')], entityKind: kinds, taken: new Set() });
  assert.deepEqual(rows(split.usecases).sort(), ['getOwner|Owner|get|hub.readOwner', 'saveOwner|Owner|update|hub.writeOwner', 'touchOwner|Owner|update|hub.writeOwner']);
  assert.equal(split.usecases.filter(item => item.call === 'hub.readOwner').length, 1, 'one read usecase');
  assert.equal(split.usecases.find(item => item.call === 'hub.readOwner')?.usecaseId, 'getOwner', 'the first name by usecaseId');
  for (const split2 of split.splits) assert.ok(split2.into.some(part => part.usecaseId === 'getOwner' && part.operation === 'get'), `${split2.from} reads through getOwner`);
});

void test('two planned usecases of one pair are not merged: only what the division created is dropped', () => {
  const plain = [{ connectionId: 'hub', operationId: 'readOwner', direction: 'call', effect: 'read', usedBy: ['owners.open'] }];
  const split = splitExternalUsecases({ journeys: { owners: { journeyId: 'owners', business: { steps: [{ stepId: 'open', kind: 'inspect', entity: 'Owner' }] } } }, connections: plain, usecases: [usecase('getOwner', 'Owner', 'get'), usecase('getOwnerAgain', 'Owner', 'get')], entityKind: kinds, taken: new Set() });
  assert.deepEqual(rows(split.usecases), ['getOwner|Owner|get|hub.readOwner', 'getOwnerAgain|Owner|get|hub.readOwner']);
});
