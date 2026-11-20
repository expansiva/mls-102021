/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/rederive.test.ts" enhancement="_blank"/>

// d1_228: `/rederive <step>` redoes the defs from a step when the generator changed and the L4 and the L2 did not. The module is the complete flow of
// `comandaRestaurante` (the harness of the maintenance run: recorded answers, no model); the "older generator" is a port def written with a method fewer,
// with its writer receipt matching the bytes, which is what a def written before a change of the generator looks like.

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
import { sourceIdentityHash } from '/_102021_/l2/helpers/l1Defs/identity.js';
import { readRederive, rederiveFile } from '/_102021_/l2/agentDefsL1/helpers/d1Rederive.js';
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

const BACKEND = `l4/${MODULE}/pool/l2/web/backend.json`;
const EFFORT = `l4/${MODULE}/pool/l2/web/effort.json`;
const RULES = `l4/${MODULE}/rules.defs.ts`;

const COMMAND = (step: string): string => `@@agentDefsL1 ${MODULE} /rederive ${step}`;

/** The first full run, and then the port written as an older generator would have: one method fewer, the receipt matching. Returns what to compare. */
async function withOlderPort(): Promise<{ host: TestHost; resolver: D1TestResolver; portPath: string; original: string; older: string; before: Map<string, string> }> {
  const host = await readyHost(FIXTURE, MODULE);
  const resolver = recordedResolver(FIXTURE, MODULE);
  const first = await runToFinalize(host, MODULE, resolver);
  assert.equal(first.report?.outcome, 'complete');
  const before = l1Bytes(host, MODULE);
  const portPath = [...before.keys()].find(path => path.includes('/ports/') && path.endsWith('.defs.ts'))!;
  const original = before.get(portPath)!;
  const found = /(definition = )(\{[\s\S]*\})( as const;)/u.exec(original)!;
  const edited = JSON.parse(found[2]) as { data: { methods: unknown[] } };
  edited.data.methods = edited.data.methods.slice(0, -1);
  const older = `${original.slice(0, found.index)}${found[1]}${JSON.stringify(edited, null, 2)}${found[3]}${original.slice(found.index + found[0].length)}`;
  assert.notEqual(older, original);
  const info = fileInfoFromDisplay(PROJECT, portPath)!;
  await writeText(info, older);
  const traceKey = Object.keys(host.files).find(key => key.includes('traces/persistence40persistence40'))!;
  const traceFile = host.files[traceKey];
  const trace = JSON.parse(traceFile.content) as { files: Array<{ defPath: string; desiredHash: string }> };
  const hash = await sourceIdentityHash(older);
  let patched = 0;
  for (const file of trace.files) {
    if (!portPath.endsWith(file.defPath.replace(/^_\d+_\//u, '').replace(/^l1\//u, ''))) continue;
    file.desiredHash = hash;
    patched += 1;
  }
  assert.equal(patched, 1);
  await writeText({ project: traceFile.project, level: traceFile.level, folder: traceFile.folder, shortName: traceFile.shortName, extension: traceFile.extension }, JSON.stringify(trace, null, 2));
  return { host, resolver, portPath, original, older, before };
}

async function command(step: string): Promise<mls.msg.AgentIntent[]> {
  const ctx = contextFor(MODULE);
  return createAgent().beforePromptImplicit!(meta(), ctx, COMMAND(step));
}

const messageOf = (intents: mls.msg.AgentIntent[]): string => String((intents[0] as mls.msg.AgentIntentAddMessageAI).request.inputAI.map(item => item.content).join('\n'));

void test('d1_228: without the command, running the steps again over a def an older generator wrote refuses it and leaves it old (what the manager met)', async () => {
  const { host, resolver, portPath, older } = await withOlderPort();
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content) as D1PipelineState;
  for (const step of ['persistence40', 'usecases50', 'controllers60', 'support70', 'finalize80'] as D1StepId[]) delete state.steps[step];
  await writeJson(pipelineFile(PROJECT, MODULE), state);
  await assert.rejects(() => runToFinalize(host, MODULE, resolver, true), /exists without a receipt\. The file was not overwritten\./u);
  assert.equal(stored(host, portPath).content, older);
});

void test('d1_228: /rederive persistence40 redoes the port and only the port: the other defs are the same bytes, the changed target is printed, the marker is gone', async () => {
  const { host, resolver, portPath, original, before } = await withOlderPort();
  const planned = await command('persistence40');
  assert.equal(planned.filter(intent => intent.type === 'add-step').length >= 9, true, 'the steps are planned');
  assert.match(messageOf(planned), /rederive comandaRestaurante from persistence40: the defs of persistence40 and of the later steps are redone\. Steps that may call a model: resolve25 \(only for a route with an open part that has no recorded answer, among closed candidates\); usecases50 \(only for operation steps\)/u);
  const marker = await readRederive(PROJECT, MODULE);
  assert.equal(marker?.from, 'persistence40');
  assert.equal(marker?.before[portPath] !== undefined, true);
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content) as D1PipelineState;
  assert.deepEqual(Object.keys(state.steps).sort(), ['domain30', 'entry10', 'input20', 'resolve25']);
  const done = await runToFinalize(host, MODULE, resolver, true);
  assert.equal(done.report?.outcome, 'complete');
  assert.equal(stored(host, portPath).content, original, 'the port is what the generator writes now');
  const after = l1Bytes(host, MODULE);
  for (const [path, bytes] of before) assert.equal(after.get(path), bytes, path);
  assert.equal(host.files[fileKey(rederiveFile(PROJECT, MODULE))]?.status === 'deleted' || !host.files[fileKey(rederiveFile(PROJECT, MODULE))], true, 'the marker is removed');
  assert.equal(await readRederive(PROJECT, MODULE), null);
  const traces = done.finalTrace.split('\n').filter(line => line.startsWith('@@agentMaterializeL1'));
  assert.deepEqual(traces, [`@@agentMaterializeL1 {"target":"_${PROJECT}_/${portPath}"}`]);
  assert.match(done.finalTrace, /rederive: 1 def\(s\) changed\./u);
});

void test('d1_228: a rederive from a later step does not redo what an earlier step wrote: the earlier step refuses the old def by name', async () => {
  const { host, resolver } = await withOlderPort();
  await command('usecases50');
  await assert.rejects(() => runToFinalize(host, MODULE, resolver, true), /persistence40 .* exists without a receipt\. The file was not overwritten\./u);
});

void test('d1_228: a module with nothing to redo prints no target, and a normal run after it behaves as before', async () => {
  const host = await readyHost(FIXTURE, MODULE);
  const resolver = recordedResolver(FIXTURE, MODULE);
  await runToFinalize(host, MODULE, resolver);
  const before = l1Bytes(host, MODULE);
  await command('domain30');
  const done = await runToFinalize(host, MODULE, resolver, true);
  assert.equal(done.report?.outcome, 'complete');
  assert.match(done.finalTrace, /rederive: 0 def\(s\) changed\./u);
  assert.equal(done.finalTrace.includes('@@agentMaterializeL1'), false);
  assert.deepEqual([...l1Bytes(host, MODULE)], [...before]);
  assert.equal(await readRederive(PROJECT, MODULE), null);
  const again = await runToFinalize(host, MODULE, resolver, true);
  assert.equal(again.finalTrace.includes('rederive:'), false);
});

void test('d1_228: the command refuses a step it does not know, a missing step, and a module that was never run, and changes nothing', async () => {
  const host = await readyHost(FIXTURE, MODULE);
  const resolver = recordedResolver(FIXTURE, MODULE);
  const neverRun = await command('persistence40');
  assert.match(messageOf(neverRun), /needs a module that was run/u);
  await runToFinalize(host, MODULE, resolver);
  const bytes = host.files[fileKey(pipelineFile(PROJECT, MODULE))].content;
  for (const step of ['input20', 'nonsense']) assert.match(messageOf(await command(step)), /\/rederive needs a step: domain30, persistence40, usecases50, controllers60, support70, finalize80\. Nothing was changed\./u);
  const noStep = await createAgent().beforePromptImplicit!(meta(), contextFor(MODULE), `@@agentDefsL1 ${MODULE} /rederive`);
  assert.match(messageOf(noStep), /\/rederive needs a step/u);
  assert.equal(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content, bytes);
  assert.equal(await readRederive(PROJECT, MODULE), null);
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
): Promise<{ report: D1FinalizeReport | null; resolve: mls.msg.AgentIntent[]; dispatched: string[]; finalTrace: string }> {
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
  const finalTrace = finalized.trace;
  assertApproved(host, moduleName, 'finalize80', '', watchIntents ? { order, intents: finalized.intents } : undefined);
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, moduleName))]?.content || '');
  assert.ok(report);
  return { report, resolve, dispatched: usecases.dispatched, finalTrace };
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
