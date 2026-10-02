/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/requestInventory.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  inputFile,
  pipelineFile,
  reportFile,
  type D1PipelineState,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseFinalizeReport, type D1FinalizeReport } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { readD1UsecaseWork, writeAttempt } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';

const FIXTURE_ID = 'controleEstoque-39a5166';
const PROJECT = 102047;
const MODULE = 'controleEstoque';
const BEFORE_USECASES: D1StepId[] = ['input20', 'domain30', 'persistence40'];
const AFTER_USECASES: D1StepId[] = ['controllers60', 'support70'];

void test('finalize80 accepts the request service inventoried by input20', async () => {
  const host = await readyHost();
  const report = await runToFinalize(host, false);
  assert.equal(report.outcome, 'complete', JSON.stringify(report.findings));
  assert.equal(report.findings.some(finding => finding.code === 'EXTRA_FILE'), false);
  const snapshot = readSnapshot(host);
  const services = snapshot.files.filter(file => file.artifactType === 'requestService');
  assert.deepEqual(services.map(file => file.defPath).sort(), [
    `l1/${MODULE}/layer_2_application/requests/movimentacoes.defs.ts`,
    `l1/${MODULE}/layer_2_application/requests/produtos.defs.ts`,
  ]);
  for (const service of services) {
    assert.equal(report.files.some(file => file.defPath === service.defPath), true, service.defPath);
  }
});

void test('a request service missing from the inventory is EXTRA_FILE', async () => {
  const host = await readyHost();
  const report = await runToFinalize(host, true);
  assert.equal(report.outcome, 'held');
  const extras = report.findings.filter(finding => finding.code === 'EXTRA_FILE');
  assert.deepEqual(extras.map(finding => finding.path).sort(), [
    `l1/${MODULE}/layer_2_application/requests/movimentacoes.defs.ts`,
    `l1/${MODULE}/layer_2_application/requests/produtos.defs.ts`,
  ]);
});

async function readyHost(): Promise<TestHost> {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE_ID, PROJECT);
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-10-02T12:00:00.000Z')));
  return host;
}

async function runToFinalize(host: TestHost, dropRequestServices: boolean): Promise<D1FinalizeReport> {
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  let order = 1;
  for (const stepId of BEFORE_USECASES) {
    const trace = await runStep(agent, ctx, parent, stepId, order);
    order += 1;
    assertApproved(host, stepId, trace);
  }
  const usecaseTrace = await approveUsecases(agent, ctx, parent, order);
  order += 1;
  assertApproved(host, 'usecases50', usecaseTrace);
  for (const stepId of AFTER_USECASES) {
    const trace = await runStep(agent, ctx, parent, stepId, order);
    order += 1;
    assertApproved(host, stepId, trace);
  }
  if (dropRequestServices) {
    const snapshot = readSnapshot(host);
    const kept = snapshot.files.filter(file => file.artifactType !== 'requestService');
    assert.equal(kept.length < snapshot.files.length, true);
    await writeJson(inputFile(PROJECT, MODULE), { ...snapshot, files: kept });
  }
  await runStep(agent, ctx, parent, 'finalize80', order);
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '');
  assert.ok(report);
  return report;
}

async function approveUsecases(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  order: number,
): Promise<string> {
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, createD1AgentStep('usecases50', MODULE, PROJECT, 'run'), order);
  const barrier = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-barrier');
  assert.ok(barrier, 'usecases50 did not open a barrier');
  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  for (const usecase of work.request.usecases) {
    const plan = fixturePlan(work.request, usecase);
    await writeAttempt(PROJECT, MODULE, {
      usecaseId: usecase.usecaseId,
      status: 'parsed',
      trace: 'deterministic plan',
      unitAttempts: 1,
      reply: plan.steps,
    });
  }
  const done = await agent.beforePromptStep!(meta(), ctx, parent, barrier.step as mls.msg.AIAgentStep, order);
  return done
    .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
    .map(intent => intent.traceMsg || '')
    .join('\n');
}

function assertApproved(host: TestHost, stepId: D1StepId, trace: string): void {
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  assert.equal(state.steps[stepId]?.status, 'approved', `${stepId} ${state.steps[stepId]?.error || ''} ${trace}`);
}

function readSnapshot(host: TestHost): D1InputSnapshot {
  return JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '{}') as D1InputSnapshot;
}

function context(): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    nextSteps: [],
    stepTitle: 'defs',
    status: 'waiting_human_input',
    agentName: 'agentDefsL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '', senderId: 'u' },
    task: {
      PK: 'task-1',
      iaCompressed: {
        nextSteps: [root],
        longMemory: { project: String(PROJECT), moduleName: MODULE },
      },
    },
  } as unknown as mls.msg.ExecutionContext;
}

function meta(): IAgentMeta {
  return { agentName: 'agentDefsL1', agentProject: 102021, agentFolder: 'agentDefsL1', agentDescription: 'test', visibility: 'public' };
}

async function runStep(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  stepId: D1StepId,
  order: number,
): Promise<string> {
  const step = createD1AgentStep(stepId, MODULE, PROJECT, 'run');
  step.stepId = order;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, order);
  return intents
    .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
    .map(intent => intent.traceMsg || '')
    .join('\n');
}
