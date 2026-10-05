/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/requestInventory.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { loadD1Fixture, seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  derivationFile,
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
import { runResolve25 } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { assembleD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { answersByRoute } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import { readResolveReceipt } from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';

const PROJECT = 102047;
const TIPS = [
  { id: 'controleEstoque-39a5166', moduleName: 'controleEstoque', reachesFinalize: true },
  { id: 'agendaClinica-53f1f35', moduleName: 'agendaClinica', reachesFinalize: true },
  { id: 'reembolsoDespesas-71cca1d', moduleName: 'reembolsoDespesas', reachesFinalize: true },
  { id: 'synthetic-v2', moduleName: 'ledgerDesk', reachesFinalize: true },
] as const;
const BEFORE_USECASES: D1StepId[] = ['input20', 'resolve25', 'domain30', 'persistence40'];
const AFTER_USECASES: D1StepId[] = ['controllers60', 'support70'];

for (const tip of TIPS) {
  const expected = requestServicePaths(tip.id, tip.moduleName);

  const title = tip.reachesFinalize
    ? `finalize80 accepts the request service inventoried by input20 (${tip.id})`
    : `input20 stays closed before finalize80 (${tip.id})`;
  void test(title, async () => {
    const host = await readyHost(tip.id, tip.moduleName);
    const report = await runToFinalize(host, tip.moduleName, false);
    if (!report) {
      assertInputClosed(host, tip.moduleName, tip.id);
      return;
    }
    assert.equal(report.outcome, 'complete', JSON.stringify(report.findings));
    assert.equal(report.findings.some(finding => finding.severity === 'error'), false);
    assert.equal(report.findings.some(finding => finding.code === 'EXTRA_FILE'), false);
    const snapshot = readSnapshot(host, tip.moduleName);
    if (tip.id === 'synthetic-v2') {
      const colliding = snapshot.selection.usecases.filter(item => item.transitionRef === 'aprovar');
      assert.deepEqual(colliding.map(item => `${item.entity}:${item.usecaseId}`).sort(), ['DeskNote:aprovarDeskNote', 'Slip:aprovarSlip']);
    }
    const services = snapshot.files.filter(file => file.artifactType === 'requestService');
    assert.deepEqual(services.map(file => file.defPath).sort(), expected);
    for (const service of services) {
      assert.equal(report.files.some(file => file.defPath === service.defPath), true, service.defPath);
    }
  });

  const negative = tip.reachesFinalize
    ? `a request service missing from the inventory is EXTRA_FILE (${tip.id})`
    : `the same closed input20 is stable when the inventory would be dropped (${tip.id})`;
  void test(negative, async () => {
    const host = await readyHost(tip.id, tip.moduleName);
    const report = await runToFinalize(host, tip.moduleName, true);
    if (!report) {
      assertInputClosed(host, tip.moduleName, tip.id);
      return;
    }
    assert.equal(report.outcome, 'held');
    const extras = report.findings.filter(finding => finding.code === 'EXTRA_FILE');
    assert.deepEqual(extras.map(finding => finding.path).sort(), expected);
  });
}

/**
 * d1_62 R2b-1. After a whole run, a second /run with the same sources: resolve25 keeps its answers (no model call)
 * and the defs of the usecases an answer brought, now on disk, are planned again without a conflict. Control: the final
 * snapshot built on the input20 derivation as previous (the hole the source key closes) refuses those defs.
 */
void test('a second /run with the same sources calls no model and a def an answer brought is not a conflict (agendaClinica)', async () => {
  const moduleName = 'agendaClinica';
  const host = await readyHost('agendaClinica-53f1f35', moduleName);
  const report = await runToFinalize(host, moduleName, false);
  assert.equal(report?.outcome, 'complete');
  const derivation = JSON.parse(host.files[fileKey(derivationFile(PROJECT, moduleName))]?.content || '{}') as D1InputSnapshot;
  const first = readSnapshot(host, moduleName);
  const fromInput = new Set(derivation.selection.usecases.map(item => item.usecaseId));
  const answered = first.selection.usecases.filter(item => !fromInput.has(item.usecaseId)).map(item => item.usecaseId);
  assert.ok(answered.length > 0, 'some usecase enters only through a resolve25 answer');
  const answeredFiles = first.files.filter(file => file.artifactType === 'usecase' && answered.includes(file.identity));
  assert.equal(answeredFiles.length, answered.length);
  for (const file of answeredFiles) assert.ok(Object.values(host.files).some(item => `l1/${item.folder}/${item.shortName}${item.extension}` === file.defPath), file.defPath);

  const agent = createAgent();
  const ctx = contextFor(moduleName);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  await runStep(agent, ctx, parent, moduleName, 'input20', 1);
  assertApproved(host, moduleName, 'input20', '');
  const resolve = await runResolve25(agent, meta(), ctx, parent, PROJECT, moduleName, 2);
  assert.equal(resolve.some(intent => intent.type === 'prompt_ready' || (intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout')), false);
  assert.match(JSON.stringify(resolve), /kept the answers/);
  assertApproved(host, moduleName, 'resolve25', '');
  const second = readSnapshot(host, moduleName);
  assert.equal(second.consumersReleased, true, JSON.stringify(second.problems.filter(item => item.severity === 'error')));
  const again = second.files.filter(item => answered.includes(item.identity) && item.artifactType === 'usecase');
  assert.equal(again.length, answered.length);
  for (const file of again) assert.notEqual(file.action, 'conflict', file.defPath);

  // Control: with the derivation as previous, the same answers make those defs a conflict.
  await writeJson(inputFile(PROJECT, moduleName), derivation);
  const onDerivation = await assembleD1Input(PROJECT, moduleName, answersByRoute(await readResolveReceipt(PROJECT, moduleName)));
  assert.ok(onDerivation.problems.some(item => item.code === 'EXISTS_WITHOUT_RECEIPT' && answeredFiles.some(file => file.defPath === item.path)));
  assert.equal(onDerivation.consumersReleased, false);
});

/** Frozen plans that input20 refuses never reach finalize80. The refusal is the closed result. */
function assertInputClosed(host: TestHost, moduleName: string, fixtureId: string): void {
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, moduleName))]?.content || '{}') as D1PipelineState;
  assert.equal(state.steps.input20?.status, 'failed', fixtureId);
  const error = state.steps.input20?.error || '';
  assert.fail(`${fixtureId} stopped before finalize80: ${error}`);
}

/** One request service per contract page that declares a route; a page without routes has none. */
function requestServicePaths(id: string, moduleName: string): string[] {
  return Object.entries(loadD1Fixture(id))
    .filter(([file, text]) => file.startsWith(`l2/${moduleName}/web/contracts/`) && file.endsWith('.defs.ts')
      && parseD2ContractV2(text).routes.length > 0)
    .map(([file]) => file)
    .map(file => file.slice(file.lastIndexOf('/') + 1, -'.defs.ts'.length))
    .sort()
    .map(pageId => `l1/${moduleName}/layer_2_application/requests/${pageId}.defs.ts`);
}

async function readyHost(fixtureId: string, moduleName: string): Promise<TestHost> {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, fixtureId, PROJECT);
  await writeJson(pipelineFile(PROJECT, moduleName), createEntryPipeline(PROJECT, moduleName, new Date('2026-10-02T12:00:00.000Z')));
  return host;
}

async function runToFinalize(host: TestHost, moduleName: string, dropRequestServices: boolean): Promise<D1FinalizeReport | null> {
  const agent = createAgent();
  const ctx = contextFor(moduleName);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  let order = 1;
  for (const stepId of BEFORE_USECASES) {
    const trace = await runStep(agent, ctx, parent, moduleName, stepId, order);
    order += 1;
    if (!isApproved(host, moduleName, stepId)) return null;
    assertApproved(host, moduleName, stepId, trace);
  }
  const usecaseTrace = await approveUsecases(agent, ctx, parent, moduleName, order);
  order += 1;
  assertApproved(host, moduleName, 'usecases50', usecaseTrace);
  for (const stepId of AFTER_USECASES) {
    const trace = await runStep(agent, ctx, parent, moduleName, stepId, order);
    order += 1;
    assertApproved(host, moduleName, stepId, trace);
  }
  if (dropRequestServices) {
    const snapshot = readSnapshot(host, moduleName);
    const kept = snapshot.files.filter(file => file.artifactType !== 'requestService');
    assert.equal(kept.length < snapshot.files.length, true);
    await writeJson(inputFile(PROJECT, moduleName), { ...snapshot, files: kept });
  }
  await runStep(agent, ctx, parent, moduleName, 'finalize80', order);
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, moduleName))]?.content || '');
  assert.ok(report);
  return report;
}

async function approveUsecases(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  moduleName: string,
  order: number,
): Promise<string> {
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, createD1AgentStep('usecases50', moduleName, PROJECT, 'run'), order);
  const barrier = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-barrier');
  assert.ok(barrier, 'usecases50 did not open a barrier');
  const work = await readD1UsecaseWork(PROJECT, moduleName);
  assert.ok(work);
  for (const usecase of work.request.usecases) {
    const plan = fixturePlan(work.request, usecase);
    await writeAttempt(PROJECT, moduleName, {
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

function isApproved(host: TestHost, moduleName: string, stepId: D1StepId): boolean {
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, moduleName))]?.content || '{}') as D1PipelineState;
  return state.steps[stepId]?.status === 'approved';
}

function assertApproved(host: TestHost, moduleName: string, stepId: D1StepId, trace: string): void {
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, moduleName))]?.content || '{}') as D1PipelineState;
  assert.equal(state.steps[stepId]?.status, 'approved', `${stepId} ${state.steps[stepId]?.error || ''} ${trace}`);
}

function readSnapshot(host: TestHost, moduleName: string): D1InputSnapshot {
  return JSON.parse(host.files[fileKey(inputFile(PROJECT, moduleName))]?.content || '{}') as D1InputSnapshot;
}

function contextFor(moduleName: string): mls.msg.ExecutionContext {
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
        longMemory: { project: String(PROJECT), moduleName },
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
  moduleName: string,
  stepId: D1StepId,
  order: number,
): Promise<string> {
  const step = createD1AgentStep(stepId, moduleName, PROJECT, 'run');
  step.stepId = order;
  const intents = stepId === 'resolve25'
    ? await runResolve25(agent, meta(), ctx, parent, PROJECT, moduleName, order)
    : await agent.beforePromptStep!(meta(), ctx, parent, step, order);
  return intents
    .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
    .map(intent => intent.traceMsg || '')
    .join('\n');
}
