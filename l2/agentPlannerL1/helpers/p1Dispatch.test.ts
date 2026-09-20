/// <mls fileReference="_102021_/l2/agentPlannerL1/helpers/p1Dispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgent } from '/_102021_/l2/agentPlannerL1/agentPlannerL1.js';
import { createP1AgentStep, type P1StepId } from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';
import {
  P1_STEP_HOOKS,
  drainWaitingSiblings,
  hooksFor,
  planIdOf,
} from '/_102021_/l2/agentPlannerL1/helpers/p1Dispatch.js';

const ENTRY = { thread: 'mensalidadesAcademia-20260920103000', file: 'l4/mensalidadesAcademia/pool/l1/a.json' };

function numberedStep(stepId: number, planId: P1StepId, status: mls.msg.AIStepStatus): mls.msg.AIAgentStep {
  const step = createP1AgentStep(planId, 'mensalidadesAcademia', ENTRY);
  step.stepId = stepId;
  step.status = status;
  return step;
}

void test('entry10 and plan20 are hooked', () => {
  createAgent();
  assert.ok(P1_STEP_HOOKS.entry10?.beforePromptStep, 'entry10 hook must be registered');
  assert.ok(P1_STEP_HOOKS.plan20?.beforePromptStep, 'plan20 hook must be registered');
});

void test('hooksFor routes a pool prompt with no planId to entry10', () => {
  createAgent();
  const prompt = JSON.stringify({
    moduleName: 'mensalidadesAcademia',
    thread: ENTRY.thread,
    file: ENTRY.file,
  });
  assert.equal(hooksFor('', prompt)?.beforePromptStep, P1_STEP_HOOKS.entry10?.beforePromptStep);
  assert.equal(hooksFor('entry10-done', prompt), undefined);
});

void test('notImplemented drain leaves hooked siblings running', () => {
  const steps = [
    numberedStep(10, 'entry10', 'completed'),
    numberedStep(20, 'plan20', 'waiting_dependency'),
  ];
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'plan mensalidadesAcademia',
    status: 'waiting_human_input',
    nextSteps: steps,
    agentName: 'agentPlannerL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: {} } },
  } as mls.msg.ExecutionContext;

  createAgent();
  const intents = drainWaitingSiblings(context, steps[1], 1, 'stopped: awaiting step plan20', { onlyUnimplemented: true });
  assert.deepEqual(intents.map(intent => intent.stepId), []);
  assert.equal(planIdOf(steps[1]), 'plan20');
});
