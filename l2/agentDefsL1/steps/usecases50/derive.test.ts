/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/derive.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { createD1AgentStep, createEntryPipeline, pipelineFile, reportFile, type D1PipelineState, type D1StepId } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { parseFinalizeReport } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { accountCalls, readCallLog } from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';
import { deriveUsecaseSteps } from '/_102021_/l2/agentDefsL1/steps/usecases50/derive.js';
import { parseWorkerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { attemptFile, readD1UsecaseWork, writeAttempt } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { closedFromRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = 102047;
/** Tips that reach usecases50. agendaClinica-cab144b stops at input20 (requestInventory.test.ts). */
const TIPS = [
  { id: 'controleEstoque-39a5166', moduleName: 'controleEstoque' },
  { id: 'synthetic-v2', moduleName: 'ledgerDesk' },
] as const;
const BEFORE_USECASES: D1StepId[] = ['input20', 'domain30', 'persistence40'];
const AFTER_USECASES: D1StepId[] = ['controllers60', 'support70', 'finalize80'];

void test('a port call with no rule, effect or transition is context then port; any of them returns the model', () => {
  const base = { portCalls: ['op'], portIds: ['P'], ruleIds: [], eventIds: [], transitionIds: [], mdmPairs: [], sources: ['ctx'] };
  for (const operation of ['list', 'get', 'create', 'update']) {
    assert.deepEqual(deriveUsecaseSteps(operation, base), [{ kind: 'context', source: 'ctx' }, { kind: 'port', call: 'op', port: 'P' }], operation);
  }
  assert.equal(deriveUsecaseSteps('create', { ...base, ruleIds: ['r'] }), null);
  assert.equal(deriveUsecaseSteps('create', { ...base, eventIds: ['e'] }), null);
  assert.equal(deriveUsecaseSteps('list', { ...base, transitionIds: ['t'] }), null);
  assert.equal(deriveUsecaseSteps('transition', base), null);
  assert.equal(deriveUsecaseSteps('delete', base), null);
  assert.equal(deriveUsecaseSteps('custom', base), null);
  assert.equal(deriveUsecaseSteps('unknown', base), null);
  assert.equal(deriveUsecaseSteps('list', { ...base, portCalls: [] }), null);
  assert.equal(deriveUsecaseSteps('list', { ...base, sources: [] }), null);
});

void test('one MDM pair on get or update is context then mdm; more pairs, or create and list, return the model', () => {
  const pair = { call: 'm', capability: 'c' };
  const base = { portCalls: [], portIds: [], ruleIds: [], eventIds: [], transitionIds: [], mdmPairs: [pair], namespaces: ['ns'], entityIds: ['E'], sources: ['ctx'] };
  const steps = [{ kind: 'context', source: 'ctx' }, { kind: 'mdm', namespace: 'ns', call: 'm', entity: 'E', capability: 'c' }];
  assert.deepEqual(deriveUsecaseSteps('get', base), steps);
  assert.deepEqual(deriveUsecaseSteps('update', base), steps);
  assert.equal(deriveUsecaseSteps('create', base), null);
  assert.equal(deriveUsecaseSteps('list', base), null);
  assert.equal(deriveUsecaseSteps('get', { ...base, mdmPairs: [pair, { call: 'n', capability: 'c' }] }), null);
  assert.equal(deriveUsecaseSteps('get', { ...base, ruleIds: ['r'] }), null);
});

for (const tip of TIPS) {
  void test(`derived usecases do not reach the model and the defs match the model path (${tip.id})`, async () => {
    const reference = await referenceDefs(tip.id, tip.moduleName);
    const live = await liveRun(tip.id, tip.moduleName);
    assert.ok(live.derived.length > 0, `${tip.id} has no derivable usecase`);
    assert.equal(live.prompted.length + live.derived.length, live.total);
    const account = accountCalls(await readCallLog(PROJECT, tip.moduleName));
    assert.equal(account.promptsAssembled, live.prompted.length);
    assert.equal(account.repliesDelivered, live.prompted.length);
    const log = await readCallLog(PROJECT, tip.moduleName);
    assert.deepEqual(log?.events.filter(event => event.kind === 'derived').map(event => event.usecaseId).sort(), [...live.derived].sort());
    assert.deepEqual(Object.keys(live.defs).sort(), Object.keys(reference).sort());
    for (const [key, source] of Object.entries(reference)) assert.equal(live.defs[key], source, key);
    // The derived call receipts and the traces without prompt evidence reach finalize80.
    const report = parseFinalizeReport(live.host.files[fileKey(reportFile(PROJECT, tip.moduleName))]?.content || '');
    assert.ok(report);
    assert.equal(report.outcome, 'complete', JSON.stringify(report.findings));
    assert.equal(report.findings.some(finding => finding.severity === 'error' || finding.code === 'EXTRA_FILE'), false);
  });
}

void test('a derived worker closed without a payload keeps its parsed attempt', async () => {
  const { host, agent, ctx, parent, intents } = await openUsecases(TIPS[0].id, TIPS[0].moduleName);
  const work = await readD1UsecaseWork(PROJECT, TIPS[0].moduleName);
  assert.ok(work);
  const usecase = work.request.usecases.find(item =>
    deriveUsecaseSteps(item.operation, closedFromRequest(work.request, item, work.request.contexts?.find(c => c.usecaseId === item.usecaseId))));
  assert.ok(usecase);
  const prompt = workerArgs(intents).find(arg => parseWorkerArg(arg)?.usecaseId === usecase.usecaseId) || '';
  const before = await agent.beforePromptStep!(meta(), ctx, parent, workerStep(prompt, 51), 5);
  assert.equal(before.some(intent => intent.type === 'prompt_ready'), false);
  await agent.afterPromptStep!(meta(), ctx, parent, workerStep(prompt, 51), 6);
  const saved = JSON.parse(host.files[fileKey(attemptFile(PROJECT, TIPS[0].moduleName, usecase.usecaseId))]?.content || '{}') as { status?: string; derived?: boolean };
  assert.equal(saved.status, 'parsed');
  assert.equal(saved.derived, true);
  const log = await readCallLog(PROJECT, TIPS[0].moduleName);
  assert.equal(log?.events.some(event => event.kind === 'reply_absent'), false);
});

/** Today's path: every usecase answered by the model with the fixture plan. */
async function referenceDefs(fixtureId: string, moduleName: string): Promise<Record<string, string>> {
  const { host, agent, ctx, parent, intents } = await openUsecases(fixtureId, moduleName);
  const work = await readD1UsecaseWork(PROJECT, moduleName);
  assert.ok(work);
  for (const usecase of work.request.usecases) {
    await writeAttempt(PROJECT, moduleName, {
      usecaseId: usecase.usecaseId,
      status: 'parsed',
      trace: 'model reply',
      unitAttempts: 0,
      reply: fixturePlan(work.request, usecase).steps,
    });
  }
  await runBarrier(host, agent, ctx, parent, intents, moduleName);
  return usecaseDefs(host, moduleName);
}

/** Every worker runs. Only the ones that assemble a prompt get a reply. */
async function liveRun(fixtureId: string, moduleName: string): Promise<{ host: TestHost; defs: Record<string, string>; prompted: string[]; derived: string[]; total: number }> {
  const { host, agent, ctx, parent, intents } = await openUsecases(fixtureId, moduleName);
  const work = await readD1UsecaseWork(PROJECT, moduleName);
  assert.ok(work);
  const prompted: string[] = [];
  const derived: string[] = [];
  let stepId = 100;
  let afterOrder = 200;
  for (const arg of workerArgs(intents)) {
    const parsed = parseWorkerArg(arg);
    assert.ok(parsed);
    const usecase = work.request.usecases.find(item => item.usecaseId === parsed.usecaseId);
    assert.ok(usecase);
    stepId += 1;
    const before = await agent.beforePromptStep!(meta(), ctx, parent, workerStep(arg, stepId), stepId);
    if (before.some(intent => intent.type === 'prompt_ready')) {
      prompted.push(usecase.usecaseId);
      await agent.afterPromptStep!(meta(), ctx, parent, replied(arg, { steps: fixturePlan(work.request, usecase).steps }, stepId), stepId);
    } else {
      derived.push(usecase.usecaseId);
      await agent.afterPromptStep!(meta(), ctx, parent, workerStep(arg, stepId), stepId);
    }
  }
  await runBarrier(host, agent, ctx, parent, intents, moduleName);
  const defs = usecaseDefs(host, moduleName);
  for (const stepId of AFTER_USECASES) {
    const step = createD1AgentStep(stepId, moduleName, PROJECT, 'run');
    afterOrder += 1;
    step.stepId = afterOrder;
    await agent.beforePromptStep!(meta(), ctx, parent, step, afterOrder);
  }
  return { host, defs, prompted, derived, total: work.request.usecases.length };
}

async function runBarrier(
  host: TestHost,
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  intents: mls.msg.AgentIntent[],
  moduleName: string,
): Promise<void> {
  const barrier = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-barrier');
  assert.ok(barrier);
  const done = await agent.beforePromptStep!(meta(), ctx, parent, barrier.step as mls.msg.AIAgentStep, 90);
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, moduleName))]?.content || '{}') as D1PipelineState;
  const trace = done.map(intent => intent.type === 'update-status' ? intent.traceMsg : '').join(' ');
  assert.equal(state.steps.usecases50?.status, 'approved', trace);
}

function usecaseDefs(host: TestHost, moduleName: string): Record<string, string> {
  const prefix = `${PROJECT}_1_${moduleName}/layer_2_application/usecases/`;
  const out: Record<string, string> = {};
  for (const [key, file] of Object.entries(host.files)) {
    if (key.startsWith(prefix) && key.endsWith('.defs.ts')) out[key] = file.content || '';
  }
  assert.ok(Object.keys(out).length > 0, `no usecase defs under ${prefix}`);
  return out;
}

async function openUsecases(fixtureId: string, moduleName: string): Promise<{
  host: TestHost;
  agent: ReturnType<typeof createAgent>;
  ctx: mls.msg.ExecutionContext;
  parent: mls.msg.AIAgentStep;
  intents: mls.msg.AgentIntent[];
}> {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, fixtureId, PROJECT);
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/steps/usecases50', shortName: 'prompt', extension: '.md' }, readFileSync(path.join(HERE, 'prompt.md'), 'utf8'), 'prompt');
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/skills', shortName: 'usecase', extension: '.md' }, readFileSync(path.join(HERE, '../../skills/usecase.md'), 'utf8'), 'skill');
  await writeJson(pipelineFile(PROJECT, moduleName), createEntryPipeline(PROJECT, moduleName, new Date('2026-10-02T12:00:00.000Z')));
  const agent = createAgent();
  const ctx = contextFor(moduleName);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const usecases = createD1AgentStep('usecases50', moduleName, PROJECT, 'run');
  usecases.stepId = 50;
  parent.nextSteps = [usecases];
  let order = 1;
  for (const stepId of BEFORE_USECASES) {
    const step = createD1AgentStep(stepId, moduleName, PROJECT, 'run');
    step.stepId = order * 10;
    await agent.beforePromptStep!(meta(), ctx, parent, step, order);
    order += 1;
  }
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, usecases, order);
  return { host, agent, ctx, parent, intents };
}

function workerArgs(intents: mls.msg.AgentIntent[]): string[] {
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.executionMode?.type === 'parallel');
  assert.ok(fanout);
  return [...(fanout.executionMode?.args || [])];
}

function workerStep(prompt: string, stepId: number): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId,
    interaction: null,
    stepTitle: 'worker',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt,
    rags: [],
    planning: { planId: '', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

function replied(prompt: string, body: unknown, stepId: number): mls.msg.AIAgentStep {
  return {
    ...workerStep(prompt, stepId),
    interaction: { input: [], cost: 0, trace: [], payload: [body] as unknown as mls.msg.AIPayload[] },
    status: 'waiting_after_prompt',
  };
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
