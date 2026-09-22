/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  D1_FLOW_STEP_IDS,
  D1_REPAIR_GLOBAL_MAX,
  D1_REPAIR_PER_UNIT,
  D1_STEP_DEPENDS_ON,
  MSG_CANDIDATE,
  MSG_CANDIDATE_DOTDOT,
  MSG_MODULE,
  MSG_ONE_COMMAND,
  MSG_PATH,
  MSG_REBUILD,
  MSG_USAGE,
  createEntryPipeline,
  dynamicPlanId,
  isDoneAnchor,
  isIntactCheckpoint,
  ownerStepId,
  parseD1Invocation,
  parseD1StepPrompt,
  repairAllowed,
  successorUnlocked,
  withAwaiting,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';

const AT = new Date('2026-09-21T12:00:00.000Z');

void test('invocation refuses a missing module, unknown flags, candidate, rebuild and an insecure path', () => {
  assert.equal(parseD1Invocation('@@agentDefsL1 /run').refused, MSG_USAGE);
  assert.equal(parseD1Invocation('@@agentDefsL1 AgendaClinica /run').refused, MSG_MODULE);
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica').refused, MSG_ONE_COMMAND);
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /run /help').refused, MSG_ONE_COMMAND);
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /fast').refused, 'Unknown flag: /fast.');
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /rebuild').refused, 'Unknown flag: /rebuild.');
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /candidates').refused, 'Unknown flag: /candidates.');
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /run extra').refused, 'Unexpected argument: extra.');
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /candidate').refused, MSG_CANDIDATE);
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /candidate tobe/plan').refused, MSG_CANDIDATE);
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /Candidate pipeline/changes/x/revisions/1/l4').refused, MSG_CANDIDATE);
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /candidate ../secret').refused, MSG_CANDIDATE_DOTDOT);
  assert.equal(parseD1Invocation('@@agentDefsL1 agendaClinica /rebuild all').refused, MSG_REBUILD);
  assert.equal(parseD1Invocation('@@agentDefsL1 ../agendaClinica /run').refused, MSG_PATH);
  assert.equal(parseD1Invocation('@@_102021_/l2/agentDefsL1 agendaClinica /help').refused, '');
  const ok = parseD1Invocation('@@agentDefsL1 agendaClinica /RUN');
  assert.equal(ok.refused, '');
  assert.equal(ok.module, 'agendaClinica');
  assert.equal(ok.command, 'run');
});

void test('a step prompt drops nothing: unknown fields and a bad project are refused', () => {
  const candidate = parseD1StepPrompt(JSON.stringify({
    planId: 'entry10', moduleName: 'agendaClinica', project: 102047, command: 'run', candidate: 'tobe/plan',
  }));
  assert.equal(candidate.kind, 'refusal');
  if (candidate.kind === 'refusal') assert.equal(candidate.refusal, 'Unknown step prompt field: candidate.');

  const ok = parseD1StepPrompt(JSON.stringify({
    planId: 'entry10', moduleName: 'agendaClinica', project: 102047, command: 'resume',
  }));
  assert.equal(ok.kind, 'step');
});

void test('done-anchors are not dispatched and dynamic ids map to their step', () => {
  assert.equal(ownerStepId('entry10'), 'entry10');
  assert.equal(ownerStepId('entry10-done'), '');
  assert.equal(isDoneAnchor('entry10-done'), true);
  assert.equal(ownerStepId(dynamicPlanId('usecases50', 'fanout', '')), 'usecases50');
  assert.equal(ownerStepId(dynamicPlanId('usecases50', 'worker', 'createConsulta')), 'usecases50');
  assert.equal(ownerStepId(dynamicPlanId('usecases50', 'repair', '1')), 'usecases50');
  assert.equal(ownerStepId('usecases50-repair-2'), 'usecases50');
  assert.equal(ownerStepId('usecases50-worker-create.consulta'), '');
  assert.equal(ownerStepId('notAStep'), '');
});

void test('repair stops after one attempt per unit and at the global ceiling', () => {
  assert.equal(D1_REPAIR_PER_UNIT, 1);
  assert.equal(repairAllowed(0, 0), true);
  assert.equal(repairAllowed(1, 0), false);
  assert.equal(repairAllowed(0, D1_REPAIR_GLOBAL_MAX), false);
  assert.equal(repairAllowed(0, D1_REPAIR_GLOBAL_MAX - 1), true);
});

void test('a draft path does not unlock the next phase', () => {
  const anchors = new Set(['entry10-done']);
  assert.equal(successorUnlocked(D1_STEP_DEPENDS_ON.input20, anchors), true);
  assert.equal(successorUnlocked(D1_STEP_DEPENDS_ON.domain30, anchors), false);
  assert.equal(successorUnlocked(['input20-draft'], anchors), false);
  for (const id of D1_FLOW_STEP_IDS) {
    assert.equal(D1_STEP_DEPENDS_ON[id].some(dep => dep.includes('draft')), false);
  }
});

void test('awaiting does not downgrade an approved entry or move the marker forward', () => {
  const created = createEntryPipeline(102047, 'agendaClinica', AT);
  assert.deepEqual(pipelineIssues(created), []);
  assert.equal(isIntactCheckpoint(created, 102047, 'agendaClinica'), true);
  assert.equal(isIntactCheckpoint(created, 102046, 'agendaClinica'), false);

  const first = withAwaiting(created, 'input20', '2026-09-21T12:01:00.000Z');
  assert.equal(first.changed, true);
  assert.equal(first.pipeline.awaitingStep, 'input20');
  assert.equal(first.pipeline.steps.entry10?.status, 'approved');
  assert.equal(first.pipeline.steps.input20, undefined);

  const again = withAwaiting(first.pipeline, 'input20', '2026-09-21T12:02:00.000Z');
  assert.equal(again.changed, false);
  assert.equal(again.pipeline, first.pipeline);

  const later = withAwaiting(first.pipeline, 'domain30', '2026-09-21T12:03:00.000Z');
  assert.equal(later.changed, false);
});
