/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Dispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import {
  D1_INTERACTION_CLEANER,
  createD1AgentStep,
  createEntryPipeline,
  dynamicPlanId,
  pipelineFile,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  D1_STEP_HOOKS,
  drainWaitingSiblings,
  hooksFor,
  markAwaitingStep,
  planIdOf,
  updateStatus,
} from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import { readText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';

function numbered(stepId: number, planId: D1StepId, status: mls.msg.AIStepStatus): mls.msg.AIAgentStep {
  const step = createD1AgentStep(planId, 'agendaClinica', 102047, 'run');
  step.stepId = stepId;
  step.status = status;
  return step;
}

void test('implemented steps are hooked; anchors and later ids are not', () => {
  createAgent();
  assert.equal(typeof D1_STEP_HOOKS.entry10?.beforePromptStep, 'function');
  assert.equal(typeof D1_STEP_HOOKS.input20?.beforePromptStep, 'function');
  assert.equal(hooksFor('entry10')?.beforePromptStep, D1_STEP_HOOKS.entry10?.beforePromptStep);
  assert.equal(hooksFor('input20')?.beforePromptStep, D1_STEP_HOOKS.input20?.beforePromptStep);
  assert.equal(hooksFor('entry10-done'), undefined);
  assert.equal(hooksFor('input20-done'), undefined);
  assert.equal(typeof hooksFor('domain30')?.beforePromptStep, 'function');
  assert.equal(typeof hooksFor('persistence40')?.beforePromptStep, 'function');
  assert.equal(typeof hooksFor('usecases50')?.beforePromptStep, 'function');
  assert.equal(typeof hooksFor(dynamicPlanId('usecases50', 'repair', '1'))?.beforePromptStep, 'function');
  assert.equal(typeof hooksFor(dynamicPlanId('usecases50', 'worker', 'createConsulta'))?.beforePromptStep, 'function');
  assert.equal(hooksFor('controllers60'), undefined);
});

void test('drain leaves a hooked sibling running and names the stop', () => {
  const entry = numbered(10, 'entry10', 'completed');
  const input = numbered(20, 'input20', 'waiting_dependency');
  const domain = numbered(30, 'domain30', 'waiting_dependency');
  const persistence = numbered(40, 'persistence40', 'waiting_dependency');
  const usecases = numbered(50, 'usecases50', 'waiting_dependency');
  const controllers = numbered(60, 'controllers60', 'waiting_dependency');
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'defs agendaClinica',
    status: 'waiting_human_input',
    nextSteps: [entry, input, domain, persistence, usecases, controllers],
    agentName: 'agentDefsL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: {} } },
  } as mls.msg.ExecutionContext;
  createAgent();
  const intents = drainWaitingSiblings(context, input, 4, 'stopped: step input20 is not implemented', { onlyUnimplemented: true });
  assert.deepEqual(intents.map(intent => intent.stepId), [60]);
  assert.equal(intents[0]?.traceMsg, 'stopped: step input20 is not implemented');
  assert.equal(intents[0]?.cleaner, D1_INTERACTION_CLEANER);
  assert.equal(planIdOf(input), 'input20');
  const sample = updateStatus(context, root, input, 4, 'completed', 'step input20 not implemented yet');
  assert.equal(sample.cleaner, 'input_output');
});

void test('a second awaiting mark does not write again', async () => {
  installStudio(102047);
  const pipeline = createEntryPipeline(102047, 'agendaClinica', new Date('2026-09-21T12:00:00.000Z'));
  const { writeJson } = await import('/_102021_/l2/agentDefsL1/helpers/d1Stor.js');
  await writeJson(pipelineFile(102047, 'agendaClinica'), pipeline);
  assert.equal(await markAwaitingStep(pipeline, 'input20', '2026-09-21T12:01:00.000Z'), true);
  const once = await readText(pipelineFile(102047, 'agendaClinica'));
  const parsed = JSON.parse(once || '{}') as { awaitingStep?: string; steps: { entry10: { status: string } } };
  assert.equal(parsed.awaitingStep, 'input20');
  assert.equal(parsed.steps.entry10.status, 'approved');
  assert.equal(await markAwaitingStep(parsed as typeof pipeline, 'input20', '2026-09-21T12:02:00.000Z'), false);
  assert.equal(await readText(pipelineFile(102047, 'agendaClinica')), once);
});
