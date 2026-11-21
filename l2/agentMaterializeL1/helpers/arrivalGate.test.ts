/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/arrivalGate.test.ts" enhancement="_blank"/>

// d1_259 s1c: the arrival of a message from outside moves a record only through the process transitions the def lists.

import assert from 'node:assert/strict';
import test from 'node:test';

import { arrivalTransitionProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';

const ARRIVAL = {
  transitions: [
    { transitionId: 'markReady', from: ['preparing'], to: 'ready' },
    { transitionId: 'markRefused', from: ['preparing'], to: 'refused' },
  ],
  stateField: 'status',
};

const BY_TRANSITION = `
export async function updateAgentDraft(input: UpdateAgentDraftInput, ctx: RequestContext) {
  const draft = await repository.get(input.id);
  // from preparing only
  if (draft.status !== 'preparing') throw new AppError('conflict', 'not preparing', 409, { ruleId: 'x' });
  const move = input.reason ? 'refused' : 'ready';
  const next = { ...draft, status: input.reason ? 'refused' : 'ready', refusalReason: input.reason ?? '' };
  return repository.update(next);
}`;

void test('d1_259 s1c: a file that sets the state to the states the transitions lead to, by literal, passes', () => {
  assert.deepEqual(arrivalTransitionProblems(BY_TRANSITION, ARRIVAL), []);
  assert.deepEqual(arrivalTransitionProblems("const a = { status: 'ready' }; const b = { status: 'refused' };", ARRIVAL), []);
});

void test('d1_259 s1c: a state taken from the input is refused', () => {
  const direct = BY_TRANSITION.replace("status: input.reason ? 'refused' : 'ready'", 'status: input.status');
  const problems = arrivalTransitionProblems(direct, ARRIVAL);
  assert.equal(problems.some(item => item.startsWith('ARRIVAL_STATE_SET_DIRECTLY')), true, problems.join('\n'));
  // `input['status']` and a bare variable are the same.
  assert.equal(arrivalTransitionProblems("const a = { status: input['status'] }; const b = 'ready'; const c = 'refused';", ARRIVAL).some(item => item.startsWith('ARRIVAL_STATE_SET_DIRECTLY')), true);
  assert.equal(arrivalTransitionProblems("const outcome = input.outcome; const a = { status: outcome }; const b = 'ready'; const c = 'refused';", ARRIVAL).some(item => item.startsWith('ARRIVAL_STATE_SET_DIRECTLY')), true);
});

void test('d1_259 s1c: a state no transition leads to, or one the transitions start from, is refused', () => {
  assert.equal(arrivalTransitionProblems("const a = { status: 'activated' }; const b = 'ready'; const c = 'refused';", ARRIVAL).some(item => item.startsWith('ARRIVAL_STATE_SET_DIRECTLY')), true);
  assert.equal(arrivalTransitionProblems("const a = { status: input.ok ? 'ready' : 'preparing' }; const c = 'refused';", ARRIVAL).some(item => item.startsWith('ARRIVAL_STATE_SET_DIRECTLY')), true);
});

void test('d1_259 s1c: an arrival that does not move the state passes; no listed transition, no check', () => {
  // The state is not assigned: nothing to refuse (a catalog refresh that only updates fields).
  assert.deepEqual(arrivalTransitionProblems("const a = { name: input.name };", ARRIVAL), []);
  assert.deepEqual(arrivalTransitionProblems("const a = { status: input.status };", undefined), []);
  assert.deepEqual(arrivalTransitionProblems("const a = { status: input.status };", { transitions: [], stateField: 'status' }), []);
  // A comment or a string with the words is not an assignment.
  assert.equal(arrivalTransitionProblems("// status: input.status\nconst a = 'ready'; const b = 'refused'; const s = 'status: input.x';", ARRIVAL).length, 0);
  assert.equal(arrivalTransitionProblems("/* status: input.status */ const a = 1;", ARRIVAL).length, 0);
  // Only one of the two states written is fine: the arrival names one.
  assert.deepEqual(arrivalTransitionProblems("const a = { status: 'refused' };", ARRIVAL), []);
});

void test('d1_259 s1c: the usecase unit reads the transitions of its def and the state field of the domain def', async () => {
  const { arrivalOf } = await import('/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js');
  const unit = (data: Record<string, unknown>) => ({ definition: { artifactType: 'usecase', artifactId: 'updateAgentDraft', data } }) as never;
  const domain = { definition: { artifactType: 'domainEntity', artifactId: 'agentDraft', data: { entityId: 'AgentDraft', fields: [{ name: 'prompt', type: 'text' }, { name: 'status', type: 'enum' }] } } };
  const ctx = { units: [domain] } as never;
  const listed = [{ transitionId: 'markReady', from: ['preparing'], to: 'ready', ruleRefs: ['r1'] }, { transitionId: 'markRefused', from: ['preparing'], to: 'refused', ruleRefs: [] }];
  const found = arrivalOf(ctx, unit({ operation: 'update', entityId: 'AgentDraft', arrivalTransitions: listed }));
  assert.deepEqual(found, { transitions: [{ transitionId: 'markReady', to: 'ready', from: ['preparing'] }, { transitionId: 'markRefused', to: 'refused', from: ['preparing'] }], stateField: 'status' });
  // Nothing listed, or not an update: no arrival.
  assert.equal(arrivalOf(ctx, unit({ operation: 'update', entityId: 'AgentDraft' })), undefined);
  assert.equal(arrivalOf(ctx, unit({ operation: 'transition', entityId: 'AgentDraft', arrivalTransitions: listed })), undefined);
  // The only enum field is the state field when none is called `status`.
  const other = { definition: { artifactType: 'domainEntity', artifactId: 'agentDraft', data: { entityId: 'AgentDraft', fields: [{ name: 'situation', type: 'enum' }] } } };
  assert.equal(arrivalOf({ units: [other] } as never, unit({ operation: 'update', entityId: 'AgentDraft', arrivalTransitions: listed }))?.stateField, 'situation');
});
