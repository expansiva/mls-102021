/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/d1_315.test.ts" enhancement="_blank"/>

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
import { createD1AgentStep, D1_FLOW_STEP_IDS, pipelineFile, derivationFile, type D1PipelineState, type D1StepId } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { executeP1Plan } from '/_102021_/l2/agentPlannerL1/steps/plan20/agentP1Plan.js';
import { type D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';

const PROJECT = 102047;
const MODULE = 'telegram';
const COMMIT = '297f3e8f';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
// Only the git history of the commit is read (`git archive`), never the files of the bench.
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_315_real';
const UNTIL: D1StepId = 'resolve25';

function extract(): void {
  if (existsSync(path.join(ROOT, 'l4/telegram/pool/l1/web/needs.json'))) return;
  mkdirSync(ROOT, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/telegram', 'l2/telegram', 'l4/telegram', 'l4/organization'], { maxBuffer: 128 * 1024 * 1024 });
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

function stateHost(): TestHost {
  extract();
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) {
    const rel = fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/'));
    // The fresh `l1/agents` of a prepared run has no def and no checkpoint of the commit: only the files of the state (below).
    if (/pipeline\/agentDefsL1\/(input20|pipeline|resolve25)\.json$/.test(rel)) continue;
    put(host, rel, readFileSync(abs, 'utf8'), 'commit');
  }
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/') && !rel.endsWith('connections/cm.ts')) put(host, rel, text, 'platform');
  put(host, '_102034_/l2/shared/contracts/connections/cm.ts', readFileSync(path.join(HERE, 'fixtures/d1_298/cmConnection.recorded.txt'), 'utf8'), 'platform');
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
    const out = await agent.beforePromptStep!(meta(), ctx, parent, step, order);
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
    input: JSON.parse(content(host, derivationFile(PROJECT, MODULE)) || '{}') as D1InputSnapshot,
  };
}

const errorsOf = (input: D1InputSnapshot): string[] => (input.problems || []).filter(item => item.severity === 'error').map(item => `${item.code} ${item.ownerRef}`);

import { canonicalPlannerPath } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';

const REVISION = 'l4/telegram/pipeline/changes/change-1/revisions/review-1/l4/pool/l2/web/backend.json';

void test('d1_315: a revision path is read as the canonical one; any other path stays', () => {
  assert.equal(canonicalPlannerPath('telegram', REVISION), 'l4/telegram/pool/l2/web/backend.json');
  assert.equal(canonicalPlannerPath('telegram', 'l4/telegram/pool/l2/web/backend.json'), 'l4/telegram/pool/l2/web/backend.json');
  assert.equal(canonicalPlannerPath('telegram', 'l4/other/pipeline/changes/c/revisions/r/l4/pool/l2/web/backend.json'), 'l4/other/pipeline/changes/c/revisions/r/l4/pool/l2/web/backend.json');
});

void test('d1_315: the planner state of mls-102047@297f3e8f (revision paths, untouched) does not diverge', async () => {
  const host = stateHost();
  const state = JSON.parse(readFileSync(path.join(ROOT, 'l4/telegram/pool/l1/pipeline.json'), 'utf8')) as { steps: { plan20: { artifactPaths: string[] } } };
  assert.ok(state.steps.plan20.artifactPaths.some(item => item.includes('/revisions/')), 'the state keeps the revision paths');
  const round = await command(host, '/run');
  assert.equal((round.input.problems || []).some(item => item.code === 'PLANNER_RUN_DIVERGENT'), false, JSON.stringify(round.input.problems?.filter(item => item.severity === 'error')));
});
