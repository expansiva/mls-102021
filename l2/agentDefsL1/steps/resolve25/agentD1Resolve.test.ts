/// <mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/agentD1Resolve.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import type { D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { createD1AgentStep, createEntryPipeline, pipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { D1_GAP_NONE } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { applyResolutions } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';
import { readContractV2 } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { readD1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { RESOLVE_FANOUT } from '/_102021_/l2/agentDefsL1/steps/resolve25/agentD1Resolve.js';
import type { D1ResolveGap } from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';
import { checkResolveReply, resolveAnswers, resolveUnits } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import { readResolveReceipt, readResolveWork, writeResolveAttempt, writeResolveReceipt } from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';
import { parseFanoutWorkerArg } from '/_102021_/l2/agentDefsL1/helpers/d1Fanout.js';
import { metaResolver } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

/**
 * resolve25 end to end on the hooks, with a test resolver in place of the model. The resolver answers from the
 * contract `meta`, which only this test reads. controleEstoque-39a5166 leaves four open parts on two routes: three
 * on the movements load and, since the filter inputs are derived (d1_62 r2b), the `search` filter of the products load.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ID = 'controleEstoque-39a5166';
const MODULE = 'controleEstoque';
const PROJECT = 102047;

function context(): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'defs',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '', senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: { project: String(PROJECT), moduleName: MODULE } } },
  } as unknown as mls.msg.ExecutionContext;
}

function meta(): IAgentMeta {
  return { agentName: 'agentDefsL1', agentProject: 102021, agentFolder: 'agentDefsL1', agentDescription: 'test', visibility: 'public' };
}

async function readyHost(edit?: (host: TestHost) => void): Promise<TestHost> {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE_ID, PROJECT);
  edit?.(host);
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/steps/resolve25', shortName: 'prompt', extension: '.md' }, readFileSync(path.join(HERE, 'prompt.md'), 'utf8'), 'prompt');
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-21T12:00:00.000Z')));
  return host;
}

function contractFile(host: TestHost, pageId: string): { content: string } {
  const found = Object.values(host.files).find(file => file.project === PROJECT && file.folder === `${MODULE}/web/contracts` && file.shortName === pageId);
  assert.ok(found, pageId);
  return found;
}

interface Run {
  ctx: mls.msg.ExecutionContext;
  parent: mls.msg.AIAgentStep;
  agent: ReturnType<typeof createAgent>;
  seq: number;
}

async function throughInput(): Promise<Run> {
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  const released = await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  assert.equal(released.some(intent => intent.type === 'update-status' && intent.status === 'failed'), false);
  return { ctx, parent, agent, seq: 2 };
}

async function resolveMain(run: Run): Promise<mls.msg.AgentIntent[]> {
  const step = createD1AgentStep('resolve25', MODULE, PROJECT, 'run');
  step.stepId = 25;
  return run.agent.beforePromptStep!(meta(), run.ctx, run.parent, step, run.seq++);
}

function agentStep(stepId: number, prompt: string, planId = ''): mls.msg.AIAgentStep {
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
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

/** Runs one worker or repair: the hook assembles the prompt, the resolver answers through the tool, the hook records it. */
async function answer(run: Run, worker: mls.msg.AIAgentStep, pick: (gap: D1ResolveGap) => string): Promise<mls.msg.AgentIntentPromptReady> {
  const prepared = await run.agent.beforePromptStep!(meta(), run.ctx, run.parent, worker, run.seq++);
  const ready = prepared.find((intent): intent is mls.msg.AgentIntentPromptReady => intent.type === 'prompt_ready');
  assert.ok(ready, 'the worker reaches the model');
  const arg = parseFanoutWorkerArg(RESOLVE_FANOUT, worker.prompt);
  const work = await readResolveWork(PROJECT, MODULE);
  const unit = work?.units.find(item => item.unitId === arg?.unitId);
  assert.ok(unit);
  const reply = { answers: Object.fromEntries(unit.gaps.map(gap => [gap.gapId, pick(gap)])) };
  worker.interaction = { input: [], cost: 0, trace: [], payload: [{ type: 'function', function: { name: 'resolveRouteGaps', arguments: JSON.stringify(reply) } }] } as unknown as mls.msg.AIAgentStep['interaction'];
  await run.agent.afterPromptStep!(meta(), run.ctx, run.parent, worker, run.seq++);
  return ready;
}

async function routeOf(unitRoute: string): Promise<D2ContractV2Route> {
  const artifacts = await readD1InputArtifacts(PROJECT, MODULE);
  for (const definition of readContractV2(artifacts.contractTexts).values()) {
    const found = definition.routes.find(item => item.route === unitRoute);
    if (found) return found;
  }
  throw new Error(unitRoute);
}

void test('resolve25 sends one worker per route with an open part; the tool has closed enums; the meta resolver gives today\'s selection', async () => {
  await readyHost();
  const run = await throughInput();
  const intents = await resolveMain(run);
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout');
  assert.ok(fanout, 'a fan-out');
  assert.equal(fanout.executionMode?.type, 'parallel');
  const args = fanout.executionMode?.type === 'parallel' ? fanout.executionMode.args : [];
  const work = await readResolveWork(PROJECT, MODULE);
  assert.ok(work);
  assert.equal(args.length, work.units.length);
  assert.equal(work.units.length, 2);
  assert.equal(work.units.reduce((sum, item) => sum + item.gaps.length, 0), 4);
  assert.equal(intents.some(intent => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-barrier'), true);

  for (const [index, unit] of work.units.entries()) {
    const route = await routeOf(unit.route);
    const ready = await answer(run, agentStep(251 + index * 10, args[index]), gap => metaResolver(route, gap));
    // Closed values: one enum per gap, candidates plus none, nothing free.
    const tool = ready.tools?.[0] as unknown as { function: { parameters: { properties: { answers: { properties: Record<string, { enum: string[] }>; required: string[] } } } } };
    const props = tool.function.parameters.properties.answers.properties;
    assert.deepEqual(Object.keys(props).sort(), unit.gaps.map(gap => gap.gapId).sort());
    for (const gap of unit.gaps) {
      assert.deepEqual(props[gap.gapId].enum, gap.candidates);
      assert.equal(gap.candidates[gap.candidates.length - 1], D1_GAP_NONE);
      assert.match(ready.humanPrompt, new RegExp(`${gap.gapId}: `));
    }
    assert.match(ready.systemPrompt || '', /<!-- modelType: reasoning -->/);
    assert.equal(ready.humanPrompt.includes(unit.route), true);
  }

  const barrier = agentStep(252, JSON.stringify({ planId: 'resolve25-barrier', moduleName: MODULE, project: PROJECT, command: 'run' }), 'resolve25-barrier');
  const closed = await run.agent.beforePromptStep!(meta(), run.ctx, run.parent, barrier, run.seq++);
  assert.equal(closed.some(intent => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-done'), true);
  const receipt = await readResolveReceipt(PROJECT, MODULE);
  assert.ok(receipt);
  assert.equal(receipt.llmCalls, 2);
  assert.equal(receipt.routes.length, 2);
  for (const row of receipt.routes) {
    const unitId = work.units.find(item => item.route === row.route)?.unitId;
    for (const item of row.answers) {
      assert.notEqual(item.choice, D1_GAP_NONE, item.path);
      assert.equal(item.call, `resolve25-worker-${unitId}`);
    }
  }
  const pipeline = JSON.parse(await readText(pipelineFile(PROJECT, MODULE)) || '{}') as { steps: Record<string, { status: string }> };
  assert.equal(pipeline.steps.resolve25?.status, 'approved');
  // resolve25 writes the final input.json with the answers: the routes are closed and the consumers released.
  const final = await readD1Input(PROJECT, MODULE);
  assert.equal(final?.consumersReleased, true);
  for (const unit of work.units) assert.equal(final?.selection.requests.find(item => item.route === unit.route)?.unresolved, undefined, unit.route);

  // The receipt, read through the one selection, gives each route as meta selects it today.
  const artifacts = await readD1InputArtifacts(PROJECT, MODULE);
  for (const unit of work.units) {
    const route = await routeOf(unit.route);
    const definition = [...readContractV2(artifacts.contractTexts).values()].find(item => item.routes.some(r => r.route === unit.route))!;
    const resolved = applyResolutions({ route, definition, entities: artifacts.entities }, resolveAnswers(receipt, unit.route));
    assert.deepEqual(resolved.unresolved, []);
    const list = Object.values(route.meta.lists)[0];
    assert.deepEqual(
      resolved.outputs.map(output => [output.key, output.entity, output.many, output.page, output.pageSize, output.hasMore]).sort(),
      Object.entries(route.meta.output).map(([key, row]) => [key, row.entity, row.many, list.key === key ? list.page : undefined, list.key === key ? list.pageSize : undefined, list.key === key ? list.hasMore : undefined]).sort(),
    );
    assert.deepEqual(
      resolved.params.filter(param => param.field).map(param => [param.name, param.target, param.field]),
      Object.entries(route.meta.params).flatMap(([name, row]) => 'filters' in row ? [[name, row.filters, row.field]] : []),
    );
    // Control: the same selection without the receipt leaves the route open.
    assert.notDeepEqual(applyResolutions({ route, definition, entities: artifacts.entities }, resolveAnswers(null, unit.route)).unresolved, []);
  }

  // /resume: the same snapshot keeps the receipt and calls no model.
  const again = await resolveMain(run);
  assert.equal(again.some(intent => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout'), false);
  assert.match(JSON.stringify(again), /kept the answers/);

  // d1_63: a receipt of the same sources that does not answer a gap the derivation opens now is not kept.
  await writeResolveReceipt({ ...receipt, routes: receipt.routes.map((row, index) => index === 0 ? { ...row, answers: row.answers.slice(1) } : row) });
  const stale = await resolveMain(run);
  assert.equal(stale.some(intent => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout'), true);
  assert.doesNotMatch(JSON.stringify(stale), /kept the answers/);
});

void test('resolve25: an answer outside the candidates gets one repair, then the gap stays none', async () => {
  await readyHost();
  const run = await throughInput();
  const intents = await resolveMain(run);
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout');
  const args = fanout?.executionMode?.type === 'parallel' ? fanout.executionMode.args : [];
  for (const [index, arg] of args.entries()) await answer(run, agentStep(251 + index * 10, arg), gap => `${gap.candidates[0]}Outside`);
  const barrier = agentStep(252, JSON.stringify({ planId: 'resolve25-barrier', moduleName: MODULE, project: PROJECT, command: 'run' }), 'resolve25-barrier');
  const first = await run.agent.beforePromptStep!(meta(), run.ctx, run.parent, barrier, run.seq++);
  const repairs = first.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step' && /^resolve25-repair-\d+$/.test(intent.step.planning?.planId || ''));
  assert.equal(repairs.length, args.length, 'one repair per route');
  assert.equal(await readResolveReceipt(PROJECT, MODULE), null, 'no receipt before the repair');
  for (const [index, repair] of repairs.entries()) {
    const repairStep = repair.step as mls.msg.AIAgentStep;
    const ready = await answer(run, agentStep(253 + index * 10, repairStep.prompt, repairStep.planning?.planId), gap => `${gap.candidates[0]}Outside`);
    assert.match(ready.humanPrompt, /was refused: .*not a candidate/);
  }
  const follow = first.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step' && /^resolve25-barrier-\d+$/.test(intent.step.planning?.planId || ''));
  assert.ok(follow);
  const second = await run.agent.beforePromptStep!(meta(), run.ctx, run.parent, agentStep(254, (follow.step as mls.msg.AIAgentStep).prompt, follow.step.planning?.planId), run.seq++);
  assert.equal(second.some(intent => intent.type === 'add-step' && /repair/.test(intent.step.planning?.planId || '')), false, 'no second repair');
  const receipt = await readResolveReceipt(PROJECT, MODULE);
  assert.ok(receipt);
  assert.equal(receipt.llmCalls, 2 * args.length);
  for (const row of receipt.routes) for (const item of row.answers) assert.deepEqual([item.choice, item.call], [D1_GAP_NONE, ''], item.path);
});

void test('resolve25 with no open part calls no model', async () => {
  // Host copy only: the load route keeps one list, so the flat paging and the page inputs are not open; the products
  // load has no free-text filter.
  await readyHost(host => {
    const file = contractFile(host, 'movimentacoes');
    file.content = file.content.replace(' produtos: ProdutoLoad[];', '').replace("; produtos: { entity: 'Produto'; many: true }", '');
    const products = contractFile(host, 'produtos');
    products.content = products.content.replace('input: { search?: string; page?: number;', 'input: { page?: number;');
  });
  const run = await throughInput();
  assert.deepEqual(resolveUnits(await readD1InputArtifacts(PROJECT, MODULE)), []);
  const intents = await resolveMain(run);
  assert.equal(intents.some(intent => intent.type === 'prompt_ready' || (intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout')), false);
  assert.equal(intents.some(intent => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-done'), true);
  const receipt = await readResolveReceipt(PROJECT, MODULE);
  assert.deepEqual([receipt?.llmCalls, receipt?.routes.length], [0, 0]);
});

void test('resolve25 refuses sources that changed after input20 sealed them', async () => {
  const host = await readyHost();
  const run = await throughInput();
  const file = contractFile(host, 'movimentacoes');
  file.content = `${file.content}\n`;
  const intents = await resolveMain(run);
  const failed = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.status === 'failed');
  assert.match(failed?.traceMsg || '', /Sources changed after input20/);
  assert.equal(await readResolveReceipt(PROJECT, MODULE), null);
  // The same with /resume: the key of the derivation no longer matches the sources.
  const resume = createD1AgentStep('resolve25', MODULE, PROJECT, 'resume');
  resume.stepId = 26;
  const resumed = await run.agent.beforePromptStep!(meta(), run.ctx, run.parent, resume, run.seq++);
  const refused = resumed.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.status === 'failed');
  assert.match(refused?.traceMsg || '', /Sources changed after input20/);
  assert.equal(await readResolveReceipt(PROJECT, MODULE), null);
});

void test('the gate accepts only candidates, every gap, and no extra key', () => {
  const unit = {
    unitId: 'r0',
    route: 'm.p.load',
    pageId: 'p',
    gaps: [{ gapId: 'g0', path: 'output.x', kind: 'entity' as const, reason: '', candidates: ['A', 'B', D1_GAP_NONE] }],
  };
  assert.deepEqual(checkResolveReply(unit, { answers: { g0: 'B' } }), { answers: { g0: 'B' }, problems: [] });
  assert.deepEqual(checkResolveReply(unit, { answers: { g0: D1_GAP_NONE } }).problems, []);
  assert.equal(checkResolveReply(unit, { answers: { g0: 'C' } }).problems.length, 1);
  assert.equal(checkResolveReply(unit, { answers: {} }).problems.length, 1);
  assert.equal(checkResolveReply(unit, { answers: { g0: 'A', g9: 'A' } }).problems.length, 1);
  assert.equal(checkResolveReply(unit, { steps: [] }).problems.length, 1);
});

void test('resolve25: an attempt left by an earlier run is neither an answer nor a call of this one', async () => {
  await readyHost();
  const stale = { unitId: 'r0', status: 'parsed' as const, trace: 'old', unitAttempts: 0, planId: 'resolve25-worker-r0', calls: 1, answers: { g0: 'movimentacoes', g1: 'movimentacoes', g2: 'movimentacoes' } };
  await writeResolveAttempt(PROJECT, MODULE, stale);
  const run = await throughInput();
  const intents = await resolveMain(run);
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout');
  const args = fanout?.executionMode?.type === 'parallel' ? fanout.executionMode.args : [];
  const barrierPrompt = JSON.stringify({ planId: 'resolve25-barrier', moduleName: MODULE, project: PROJECT, command: 'run' });

  // The worker never ran: the barrier pauses and writes no receipt.
  const skipped = await run.agent.beforePromptStep!(meta(), run.ctx, run.parent, agentStep(252, barrierPrompt, 'resolve25-barrier'), run.seq++);
  assert.equal(skipped.some(intent => intent.type === 'pause-or-continue'), true);
  assert.equal(await readResolveReceipt(PROJECT, MODULE), null);

  // Each worker runs once: one call each, the stale attempt adds none.
  const work = await readResolveWork(PROJECT, MODULE);
  const route = await routeOf(work!.units[0].route);
  await answer(run, agentStep(251, args[0]), gap => metaResolver(route, gap));
  const other = await routeOf(work!.units[1].route);
  await answer(run, agentStep(261, args[1]), gap => metaResolver(other, gap));
  await run.agent.beforePromptStep!(meta(), run.ctx, run.parent, agentStep(253, barrierPrompt, 'resolve25-barrier'), run.seq++);
  assert.equal((await readResolveReceipt(PROJECT, MODULE))?.llmCalls, 2);
});
