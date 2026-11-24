/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/d1_287.test.ts" enhancement="_blank"/>

// d1_287 s2: the two states the real `l1/agents` of mls-102047 was left in by a round held at resolve25, with the hooks of production in the order of the command
// (entry10 -> input20 -> resolve25 -> domain30 -> persistence40; usecases50 asks a model and is not run). The L2, the L4 and l4/organization come from
// `git archive 30b4af69`; the three pool files that the working tree had changed from `fixtures/d1_286-refused`; the checkpoint files of each state from
// `fixtures/d1_287-states/{A,B}` (byte for byte). `@@agentNewReleaseL1` leaves `l1/agents` with no def, so no def is on the disk in either state.
//   A: after the first round, held at resolve25 (`EXTERNAL_ROUTE_CALL_UNRESOLVED`).
//   B: after the `/run` and the `/rederive domain30` that followed it: `REMOVE_WITHOUT_RECEIPT:2`, the marker of `before: {}`.
// The next round used to stop at input20 on both (the usecases the held round only planned read as defs to remove), so resolve25 never ran again.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { createD1AgentStep, D1_FLOW_STEP_IDS, pipelineFile, inputFile, type D1PipelineState, type D1StepId } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { runResolve25, type D1TestResolver } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { rederiveFile } from '/_102021_/l2/agentDefsL1/helpers/d1Rederive.js';
import { D1_GAP_NONE, type D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';

const PROJECT = 102047;
const MODULE = 'agents';
const COMMIT = '30b4af69';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
// Only the git history of the commit is read (`git archive`), never the files of the bench.
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_286_real';
const UNTIL: D1StepId = 'usecases50';

function extract(): void {
  if (existsSync(path.join(ROOT, 'l4/agents/pool/l1/web/needs.json'))) return;
  mkdirSync(ROOT, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/agents', 'l2/agents', 'l4/agents', 'l4/organization'], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT}`);
  const extracted = spawnSync('tar', ['-x', '-C', ROOT], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const abs = path.join(dir, name);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
}

function put(host: TestHost, rel: string, text: string, tag: string): void {
  const platform = /^_(\d+)_\/(.+)$/.exec(rel);
  const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, rel);
  if (info) seed(host, info, text, tag);
}

function stateHost(state: 'A' | 'B'): TestHost {
  extract();
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) {
    const rel = fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/'));
    // The fresh `l1/agents` of a prepared run has no def and no checkpoint of the commit: only the files of the state (below).
    if (!rel.startsWith('l1/')) put(host, rel, readFileSync(abs, 'utf8'), 'commit');
  }
  const refused = loadD1Fixture('d1_286-refused');
  for (const [rel, text] of Object.entries(refused)) if (rel.startsWith('l4/')) put(host, rel, text, 'refused');
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const states = loadD1Fixture('d1_287-states');
  // B keeps what is not in B from A: `input.json` and `resolve25.json` are the same bytes.
  for (const owner of state === 'B' ? ['A', 'B'] : ['A']) {
    for (const [rel, text] of Object.entries(states)) if (rel.startsWith(`${owner}/`)) put(host, rel.slice(2), text, `state-${owner}`);
  }
  return host;
}

function contextFor(): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent', stepId: 1, interaction: null, nextSteps: [], stepTitle: 'defs', status: 'waiting_human_input', agentName: 'agentDefsL1', prompt: '', rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return { message: { orderAt: 'msg-1', threadId: 'thread-1', content: '', senderId: 'u' }, task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: { project: String(PROJECT), moduleName: MODULE } } } } as unknown as mls.msg.ExecutionContext;
}
const meta = (): IAgentMeta => ({ agentName: 'agentDefsL1', agentProject: 102021, agentFolder: 'agentDefsL1', agentDescription: 'test', visibility: 'public' });

function content(host: TestHost, file: { project: number; level: number; folder: string; shortName: string; extension: string }): string | null {
  const stored = host.files[fileKey(file)];
  return stored && stored.status !== 'deleted' ? stored.content : null;
}

/** The answers the held round recorded: resolve25 asks the model for nothing when they all stand. */
function recordedResolver(): D1TestResolver {
  const text = loadD1Fixture('d1_287-states')['A/l1/agents/pipeline/agentDefsL1/resolve25.json'];
  const receipt = JSON.parse(text) as { routes: Array<{ route: string; answers: Array<{ path: string; choice: string }> }> };
  const byRoute = new Map(receipt.routes.map(item => [item.route, new Map(item.answers.map(answer => [answer.path, answer.choice]))]));
  return (route, gap) => byRoute.get(route.route)?.get(gap.path) ?? D1_GAP_NONE;
}

interface Round {
  steps: Array<{ stepId: string; status: string; trace: string }>;
  stoppedAt: string;
  pipeline: D1PipelineState;
  input: D1InputSnapshot;
  planned: number;
  message: string;
}

/** One command, then the steps it plans in order, as the orchestrator does: a step that does not approve, or that holds the consumers, ends the round. */
async function command(host: TestHost, text: string): Promise<Round> {
  const agent = createAgent();
  const ctx = contextFor();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const intents = await agent.beforePromptImplicit!(meta(), ctx, `@@agentDefsL1 ${MODULE} ${text}`);
  const planned = intents.filter(intent => intent.type === 'add-step').length;
  const first = intents[0] as mls.msg.AgentIntentAddMessageAI;
  const message = first?.request?.inputAI?.map(item => String(item.content)).join('\n') ?? '';
  const steps: Round['steps'] = [];
  let stoppedAt = '';
  let order = 1;
  for (const stepId of D1_FLOW_STEP_IDS as readonly D1StepId[]) {
    if (planned === 0 || stepId === UNTIL) break;
    const step = createD1AgentStep(stepId, MODULE, PROJECT, 'run');
    step.stepId = order;
    const out = stepId === 'resolve25'
      ? await runResolve25(agent, meta(), ctx, parent, PROJECT, MODULE, order, 'run', recordedResolver())
      : await agent.beforePromptStep!(meta(), ctx, parent, step, order);
    const trace = out.filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status').map(intent => intent.traceMsg || '').join(' | ');
    const pipeline = JSON.parse(content(host, pipelineFile(PROJECT, MODULE)) || '{}') as D1PipelineState;
    const status = pipeline.steps[stepId]?.status ?? '';
    steps.push({ stepId, status, trace });
    order += 1;
    if (status !== 'approved' || /Consumer phases are not released/u.test(trace)) {
      stoppedAt = stepId;
      break;
    }
  }
  return {
    steps, stoppedAt, planned, message,
    pipeline: JSON.parse(content(host, pipelineFile(PROJECT, MODULE)) || '{}') as D1PipelineState,
    input: JSON.parse(content(host, inputFile(PROJECT, MODULE)) || '{}') as D1InputSnapshot,
  };
}

const errorsOf = (input: D1InputSnapshot): string[] => (input.problems || []).filter(item => item.severity === 'error').map(item => `${item.code} ${item.ownerRef}`);
const row = (round: Round): string => round.steps.map(item => `${item.stepId}:${item.status}`).join(' ');
const WHOLE = 'entry10:approved input20:approved resolve25:approved domain30:approved persistence40:approved';

void test('d1_287 A: after the first round held at resolve25, /run derives again, resolve25 runs again and approves, with no model and no REMOVE_WITHOUT_RECEIPT', async () => {
  const host = stateHost('A');
  const round = await command(host, '/run');
  assert.equal(round.planned > 0, true);
  assert.equal(row(round), WHOLE, round.steps.map(item => `${item.stepId} ${item.trace}`).join('\n'));
  assert.deepEqual(errorsOf(round.input), [], 'the final input.json has no error');
  assert.match(round.steps.find(item => item.stepId === 'resolve25')!.trace, /No model was called/u);
  assert.equal(round.pipeline.steps.resolve25?.error, undefined, 'the old failure text is gone');
  assert.equal(round.input.removed.some(item => item.id === 'listConductChange' || item.id === 'listOrganizationUser'), false);
});

void test('d1_287 B: after the /run and the /rederive that followed the held round, /run reaches the same place and the stale marker asks for nothing by hand', async () => {
  const host = stateHost('B');
  const marker = JSON.parse(content(host, { project: PROJECT, level: 1, folder: 'agents/pipeline/agentDefsL1', shortName: 'rederive', extension: '.json' }) || '{}') as { from: string; before: Record<string, string> };
  assert.deepEqual([marker.from, Object.keys(marker.before).length], ['domain30', 0]);
  const round = await command(host, '/run');
  assert.equal(row(round), WHOLE, round.steps.map(item => `${item.stepId} ${item.trace}`).join('\n'));
  assert.deepEqual(errorsOf(round.input), []);
  assert.equal(round.pipeline.steps.resolve25?.error, undefined);
  assert.ok(content(host, rederiveFile(PROJECT, MODULE)), 'the marker is still the round\'s own: finalize80 removes it when the round ends');
});

void test('d1_287 B: a /rederive on that round works as the /run does: the same steps, no error', async () => {
  const host = stateHost('B');
  const round = await command(host, '/rederive domain30');
  assert.equal(round.planned > 0, true, round.message);
  assert.equal(row(round), WHOLE, round.steps.map(item => `${item.stepId} ${item.trace}`).join('\n'));
  assert.deepEqual(errorsOf(round.input), []);
});
