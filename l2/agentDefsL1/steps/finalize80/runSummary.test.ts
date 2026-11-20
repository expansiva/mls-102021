/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/runSummary.test.ts" enhancement="_blank"/>

// d1_248: a def the D1 wrote and nobody edited is rebuilt when the L2 contract it reads changes; a hand edit is still refused.
// d1_247: a `/run` with nothing to do ends in success and says by step what it wrote and kept; a real refusal keeps `failed` with step and reason.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { loadD1Fixture, seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  draftFile,
  inputFile,
  pipelineFile,
  reportFile,
  type D1PipelineState,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, type StoredFile, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson, writeText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { D1_GAP_NONE } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { parseFinalizeReport, type D1FinalizeReport } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { runResolve25, type D1TestResolver } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { parseWorkerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { readD1UsecaseWork, writeAttempt } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';

const PROJECT = 102047;
const MODULE = 'comandaRestaurante';
const FIXTURE = 'comandaRestaurante-c0f25ee';
const USECASE = 'fecharComanda';
const BEFORE_USECASES: D1StepId[] = ['input20', 'resolve25', 'domain30', 'persistence40'];
const AFTER_USECASES: D1StepId[] = ['controllers60', 'support70'];
const MAY_CHANGE = new Set(['update', 'create', 'recompose']);

const BACKEND = `l4/${MODULE}/pool/l2/web/backend.json`;
const EFFORT = `l4/${MODULE}/pool/l2/web/effort.json`;
const RULES = `l4/${MODULE}/rules.defs.ts`;

async function plainRun(host: TestHost, resolver: D1TestResolver): Promise<Array<{ stepId: D1StepId; status: string; trace: string }>> {
  const agent = createAgent();
  const ctx = contextFor(MODULE);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const out: Array<{ stepId: D1StepId; status: string; trace: string }> = [];
  let order = 1;
  for (const stepId of ['input20', 'resolve25', 'domain30', 'persistence40', 'usecases50', 'controllers60', 'support70', 'finalize80'] as D1StepId[]) {
    const intents = stepId === 'usecases50'
      ? (await approveUsecases(agent, ctx, parent, MODULE, order)).intents
      : (await runStep(agent, ctx, parent, MODULE, stepId, order, resolver)).intents;
    for (const intent of intents) {
      if (intent.type === 'update-status') out.push({ stepId, status: intent.status, trace: intent.traceMsg || '' });
      // The anchors a step adds are part of the task the next steps (finalize80) read.
      if (intent.type === 'add-step') (parent.nextSteps ??= []).push(intent.step as mls.msg.AIPayload);
    }
    order += 1;
  }
  return out;
}

void test('a run with nothing to do ends in success and says by step what it wrote and kept (comandaRestaurante)', async () => {
  const host = await readyHost(FIXTURE, MODULE);
  const resolver = recordedResolver(FIXTURE, MODULE);
  const first = await plainRun(host, resolver);
  assert.equal(first.some(item => item.status === 'failed'), false, JSON.stringify(first.filter(item => item.status === 'failed')));
  const written = first.find(item => item.stepId === 'controllers60')!.trace;
  assert.match(written, /^controllers60: wrote [1-9]\d* \(/u, written);

  const second = await plainRun(host, resolver);
  assert.equal(second.some(item => item.status === 'failed'), false, JSON.stringify(second.filter(item => item.status === 'failed')));
  assert.equal(JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}').status, 'complete');
  for (const stepId of ['domain30', 'persistence40', 'controllers60', 'support70'] as const) {
    const trace = second.find(item => item.stepId === stepId)!.trace;
    assert.match(trace, new RegExp(`^${stepId}: wrote 0, kept [1-9]\\d* \\(`, 'u'), trace);
  }
  const end = second.find(item => item.stepId === 'finalize80' && item.status === 'completed')!.trace;
  assert.match(end, /run summary:\n/u, end);
  for (const stepId of ['domain30', 'persistence40', 'usecases50', 'controllers60', 'support70']) {
    assert.match(end, new RegExp(`\\n${stepId}: wrote 0`, 'u'), `${stepId} is in the summary: ${end}`);
  }
});

void test('a real refusal keeps `failed`, with the step and the reason', async () => {
  const host = await readyHost(FIXTURE, MODULE);
  const resolver = recordedResolver(FIXTURE, MODULE);
  await plainRun(host, resolver);
  const draft = host.files[fileKey(draftFile(PROJECT, MODULE, 'usecases50'))];
  assert.ok(draft);
  draft.content = 'not json';
  const agent = createAgent();
  const ctx = contextFor(MODULE);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const ran = await runStep(agent, ctx, parent, MODULE, 'controllers60', 1);
  const failed = ran.intents.filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.status === 'failed');
  assert.equal(failed.length, 1, ran.trace);
  assert.match(failed[0].traceMsg || '', /usecases50 draft did not parse.*controllers60/u);
  assert.equal(JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}').status, 'complete', 'a refusal writes nothing to the pipeline: it still shows the earlier run');
});

async function changeContractText(host: TestHost): Promise<{ request: StoredFile }> {
  const contract = host.files[Object.keys(host.files).find(key => key.includes('web/contracts/inicio.defs'))!];
  assert.ok(contract);
  contract.content = contract.content.replace('Retorna somente os indicadores', 'Retorna MUDOU-O-TEXTO os indicadores');
  const request = host.files[Object.keys(host.files).find(key => key.includes('requests/inicio.defs'))!];
  assert.ok(request);
  assert.equal(request.content.includes('MUDOU-O-TEXTO'), false);
  return { request };
}

void test('d1_248: the L2 contract changes after a complete run: the request def it feeds is rebuilt and the run succeeds', async () => {
  const host = await readyHost(FIXTURE, MODULE);
  const resolver = recordedResolver(FIXTURE, MODULE);
  await plainRun(host, resolver);
  const { request } = await changeContractText(host);
  const second = await plainRun(host, resolver);
  assert.equal(second.some(item => item.status === 'failed'), false, JSON.stringify(second.filter(item => item.status === 'failed')));
  assert.equal(request.content.includes('MUDOU-O-TEXTO'), true, 'the def carries the new contract text');
  assert.match(second.find(item => item.stepId === 'controllers60')!.trace, /^controllers60: wrote 1 \(inicio\)/u);
  assert.equal(JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}').status, 'complete');
});

void test('d1_248: the same change over a def edited by hand is still refused', async () => {
  const host = await readyHost(FIXTURE, MODULE);
  const resolver = recordedResolver(FIXTURE, MODULE);
  await plainRun(host, resolver);
  const { request } = await changeContractText(host);
  request.content = request.content.replace('Retorna somente os indicadores', 'EDITADO-A-MAO');
  assert.notEqual(request.content.indexOf('EDITADO-A-MAO'), -1);
  const second = await plainRun(host, resolver);
  const failed = second.find(item => item.status === 'failed');
  assert.ok(failed, 'a hand edit is not overwritten');
  // The inventory of input20 sees the edit first; the commit of controllers60 would refuse it too.
  assert.ok(['input20', 'controllers60'].includes(failed.stepId), `${failed.stepId}: ${failed.trace}`);
  assert.ok(failed.trace.includes('inicio'), failed.trace);
  assert.equal(request.content.includes('EDITADO-A-MAO'), true);
});

async function readyHost(fixtureId: string, moduleName: string): Promise<TestHost> {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, fixtureId, PROJECT);
  await writeJson(pipelineFile(PROJECT, moduleName), createEntryPipeline(PROJECT, moduleName, new Date('2026-10-02T12:00:00.000Z')));
  return host;
}

/** Choices recorded in the fixture `resolve25.json` (route, path, choice). No model call. */
function recordedResolver(fixtureId: string, moduleName: string): D1TestResolver {
  const key = `l1/${moduleName}/pipeline/agentDefsL1/resolve25.json`;
  const text = loadD1Fixture(fixtureId)[key];
  assert.ok(text, key);
  const receipt = JSON.parse(text) as { routes: Array<{ route: string; answers: Array<{ path: string; choice: string }> }> };
  const byRoute = new Map(receipt.routes.map(item => [item.route, new Map(item.answers.map(answer => [answer.path, answer.choice]))]));
  return (route, gap) => byRoute.get(route.route)?.get(gap.path) ?? D1_GAP_NONE;
}

function stored(host: TestHost, display: string): StoredFile {
  const info = fileInfoFromDisplay(PROJECT, display);
  assert.ok(info, display);
  const file = host.files[fileKey(info)];
  assert.ok(file, display);
  return file;
}

async function runToFinalize(
  host: TestHost,
  moduleName: string,
  resolver: D1TestResolver,
  watchIntents = false,
): Promise<{ report: D1FinalizeReport | null; resolve: mls.msg.AgentIntent[]; dispatched: string[] }> {
  const agent = createAgent();
  const ctx = contextFor(moduleName);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  let order = 1;
  let resolve: mls.msg.AgentIntent[] = [];
  for (const stepId of BEFORE_USECASES) {
    const ran = await runStep(agent, ctx, parent, moduleName, stepId, order, resolver);
    if (stepId === 'resolve25') resolve = ran.intents;
    assertApproved(host, moduleName, stepId, ran.trace, watchIntents ? { order, intents: ran.intents } : undefined);
    order += 1;
  }
  const usecases = await approveUsecases(agent, ctx, parent, moduleName, order);
  assertApproved(host, moduleName, 'usecases50', usecases.trace, watchIntents ? { order, intents: usecases.intents } : undefined);
  order += 1;
  for (const stepId of AFTER_USECASES) {
    const ran = await runStep(agent, ctx, parent, moduleName, stepId, order);
    assertApproved(host, moduleName, stepId, ran.trace, watchIntents ? { order, intents: ran.intents } : undefined);
    order += 1;
  }
  const finalized = await runStep(agent, ctx, parent, moduleName, 'finalize80', order);
  assertApproved(host, moduleName, 'finalize80', '', watchIntents ? { order, intents: finalized.intents } : undefined);
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, moduleName))]?.content || '');
  assert.ok(report);
  return { report, resolve, dispatched: usecases.dispatched };
}

async function approveUsecases(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  moduleName: string,
  order: number,
): Promise<{ trace: string; dispatched: string[]; intents: mls.msg.AgentIntent[] }> {
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, createD1AgentStep('usecases50', moduleName, PROJECT, 'run'), order);
  const dispatched = dispatchedIds(intents);
  if (dispatched.length === 0) {
    return {
      dispatched,
      intents,
      trace: intents
        .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
        .map(intent => intent.traceMsg || '')
        .join('\n'),
    };
  }
  assert.ok(barrier, 'usecases50 did not open a barrier');
  const work = await readD1UsecaseWork(PROJECT, moduleName);
  assert.ok(work);
  for (const usecaseId of dispatched) {
    const usecase = work.request.usecases.find(item => item.usecaseId === usecaseId);
    assert.ok(usecase, usecaseId);
    const plan = fixturePlan(work.request, usecase);
    await writeAttempt(PROJECT, moduleName, {
      usecaseId,
      status: 'parsed',
      trace: 'deterministic plan',
      unitAttempts: 1,
      reply: plan.steps,
    });
  }
  const done = await agent.beforePromptStep!(meta(), ctx, parent, barrier.step as mls.msg.AIAgentStep, order);
  return {
    dispatched,
    intents: done,
    trace: done
      .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
      .map(intent => intent.traceMsg || '')
      .join('\n'),
  };
}

function dispatchedIds(intents: mls.msg.AgentIntent[]): string[] {
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-fanout');
  if (!fanout) return [];
  return (fanout.executionMode?.args || []).flatMap(arg => {
    const parsed = parseWorkerArg(arg);
    return parsed ? [parsed.usecaseId] : [];
  });
}

function assertApproved(
  host: TestHost,
  moduleName: string,
  stepId: D1StepId,
  trace: string,
  watched?: { order: number; intents: mls.msg.AgentIntent[] },
): void {
  if (watched) {
    const failed = watched.intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus =>
      intent.type === 'update-status' && intent.stepId === watched.order && intent.status === 'failed');
    assert.equal(failed, undefined, `${stepId} ${failed?.traceMsg || ''}`);
  }
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
  resolver?: D1TestResolver,
): Promise<{ trace: string; intents: mls.msg.AgentIntent[] }> {
  const step = createD1AgentStep(stepId, moduleName, PROJECT, 'run');
  step.stepId = order;
  const intents = stepId === 'resolve25'
    ? await runResolve25(agent, meta(), ctx, parent, PROJECT, moduleName, order, 'run', resolver)
    : await agent.beforePromptStep!(meta(), ctx, parent, step, order);
  return {
    intents,
    trace: intents
      .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
      .map(intent => intent.traceMsg || '')
      .join('\n'),
  };
}
