/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/maintenanceRun.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { loadD1Fixture, seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import {
  createD1AgentStep,
  createEntryPipeline,
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

void test('a maintenance plan regenerates only what it marks (comandaRestaurante)', async () => {
  const host = await readyHost(FIXTURE, MODULE);
  const resolver = recordedResolver(FIXTURE, MODULE);
  const first = await runToFinalize(host, MODULE, resolver);
  assert.equal(first.report?.outcome, 'complete');
  const before = l1Bytes(host, MODULE);

  await applyMaintenancePlan(host);

  const second = await runToFinalize(host, MODULE, resolver, true);
  assert.equal(second.report?.outcome, 'complete');

  const snapshot = readSnapshot(host, MODULE);
  const mayChange = new Set(snapshot.files.filter(file => MAY_CHANGE.has(file.action)).map(file => file.defPath));
  for (const [path, bytes] of before) {
    if (mayChange.has(path)) continue;
    assert.equal(stored(host, path).content, bytes, path);
  }

  assert.equal(second.resolve.some(intent => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout'), false);
  assert.match(JSON.stringify(second.resolve), /kept the answers/);
  assert.deepEqual(second.dispatched, [USECASE]);
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

/** Every `toCreate` becomes `done`, except `fecharComanda` and the endpoints whose uses contain it. */
async function applyMaintenancePlan(host: TestHost): Promise<void> {
  for (const display of [BACKEND, EFFORT]) {
    const doc = JSON.parse(stored(host, display).content) as Record<string, unknown>;
    retargetStatuses(doc);
    if (display === EFFORT) recountTotals(doc);
    await writeJson(fileInfoFromDisplay(PROJECT, display)!, doc);
  }
  const rules = stored(host, RULES).content;
  assert.equal(rules.includes('descontoMaximoDezPorCento'), false);
  const next = rules.replace(
    '"totalComandaCalculado":',
    '"descontoMaximoDezPorCento": "O desconto no fechamento não pode exceder 10% do subtotal dos itens não cancelados, em Comanda.fecharComanda.",\n    "totalComandaCalculado":',
  );
  assert.notEqual(next, rules);
  await writeText(fileInfoFromDisplay(PROJECT, RULES)!, next);
}

function retargetStatuses(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) retargetStatuses(item);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const row = node as Record<string, unknown>;
  if (row.status === 'toCreate') {
    const usecase = row.usecaseId === USECASE;
    const endpoint = typeof row.route === 'string' && usesUsecase(row, USECASE);
    row.status = usecase || endpoint ? 'toUpdate' : 'done';
  }
  for (const [key, value] of Object.entries(row)) {
    if (key === 'testSupport') continue;
    if (value && typeof value === 'object') retargetStatuses(value);
  }
}

function usesUsecase(row: Record<string, unknown>, usecaseId: string): boolean {
  if (row.usecaseRef === usecaseId) return true;
  return Array.isArray(row.uses) && row.uses.includes(usecaseId);
}

function recountTotals(effort: Record<string, unknown>): void {
  const totals = effort.totals as Record<string, Record<string, number>>;
  for (const bucket of ['screens', 'endpoints', 'usecases', 'tables'] as const) {
    const counts = { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 };
    for (const row of effort[bucket] as Array<{ status?: string }>) {
      if (row.status === 'toCreate' || row.status === 'toUpdate' || row.status === 'toRemove' || row.status === 'done') counts[row.status] += 1;
    }
    totals[bucket] = counts;
  }
}

function l1Bytes(host: TestHost, moduleName: string): Map<string, string> {
  const saved = new Map<string, string>();
  for (const file of Object.values(host.files)) {
    if (file.level !== 1) continue;
    if (file.folder !== moduleName && !file.folder.startsWith(`${moduleName}/`)) continue;
    if (file.folder === `${moduleName}/pipeline` || file.folder.startsWith(`${moduleName}/pipeline/`)) continue;
    saved.set(`l1/${file.folder}/${file.shortName}${file.extension}`, file.content);
  }
  return saved;
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
  const barrier = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-barrier');
  const dispatched = dispatchedIds(intents);
  if (dispatched.length === 0) {
    assert.equal(barrier, undefined);
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
