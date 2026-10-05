/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/proofC1.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  derivationFile,
  pipelineFile,
  type D1PipelineState,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { loadD1Fixture, seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';

const FIXTURE_ID = 'controleEstoque-39a5166';
const PROJECT = 102047;
const MODULE = 'controleEstoque';

/**
 * A run held at input20 stops there: the v2 seed with an older backend plan is refused by path,
 * domain30 writes nothing, and the stored seed is not touched.
 */
void test('a v2 seed with an older backend plan is refused at input20 and later phases write nothing', async () => {
  const before = JSON.stringify(loadD1Fixture(FIXTURE_ID));
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE_ID, PROJECT);
  const backend = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/pool/l2/web/backend.json`);
  assert.ok(backend);
  const stored = host.files[fileKey(backend)];
  assert.ok(stored);
  const plan = JSON.parse(stored.content) as { schemaVersion: string };
  const current = plan.schemaVersion;
  plan.schemaVersion = '2026-09-21-p1-backend-v1.1';
  stored.content = JSON.stringify(plan);
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-25T12:00:00.000Z')));

  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const inputTrace = await runStep(agent, ctx, parent, 'input20', 20);
  assert.match(inputTrace, /Consumer phases are not released/);
  // d1_62: a held input20 keeps its problems in its own receipt, input20.json.
  const snapshot = JSON.parse(host.files[fileKey(derivationFile(PROJECT, MODULE))]?.content || '{}') as {
    consumersReleased?: boolean;
    problems?: Array<{ severity: string; code: string; path: string; message: string }>;
  };
  const inputErrors = (snapshot.problems || []).filter(problem => problem.severity === 'error');
  assert.deepEqual(inputErrors.map(problem => `${problem.code} ${problem.path}`), [`SCHEMA_DIVERGENT l4/${MODULE}/pool/l2/web/backend.json`]);
  assert.equal(inputErrors[0].message.includes(current), true, inputErrors[0].message);
  assert.equal(snapshot.consumersReleased, false);
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  assert.equal(state.steps.input20?.status, 'failed');
  assert.equal(state.steps.input20?.error, 'SCHEMA_DIVERGENT:1');
  assert.equal(state.steps.domain30, undefined);

  const domainTrace = await runStep(agent, ctx, parent, 'domain30', 30);
  assert.match(domainTrace, /domain30 wrote nothing/, domainTrace);
  assert.equal(writtenDefs(host).length, 0);
  assert.equal(JSON.stringify(loadD1Fixture(FIXTURE_ID)), before);
});

function writtenDefs(host: TestHost): string[] {
  return Object.entries(host.files)
    .filter(([, file]) => file.project === PROJECT && file.level === 1 && file.extension === '.defs.ts'
      && file.folder.startsWith(`${MODULE}/`) && !file.folder.includes('/pipeline/'))
    .map(([key]) => key);
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
  command: 'run' | 'resume' = 'run',
): Promise<string> {
  const step = createD1AgentStep(stepId, MODULE, PROJECT, command);
  step.stepId = order;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, order);
  const traces = intents
    .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
    .map(intent => intent.traceMsg || '');
  return traces.join('\n') || JSON.stringify(intents.map(intent => intent.type));
}
