/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/externalCalls.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { externalCallsOf } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';

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
