/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/agentD1Controllers.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  draftFile,
  inputFile,
  pipelineFile,
  plannerPipelineFile,
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { D1_USECASE_VERSION } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { runResolve25 } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';

const FIXTURE_ID = 'controleEstoque-39a5166';
const MODULE = 'controleEstoque';
const PROJECT = 102047;

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

async function readyHost() {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE_ID, PROJECT);
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-21T12:00:00.000Z')));
  host.writes.length = 0;
  return host;
}

void test('controllers60 writes one controller per page and does not rewrite the same bytes', async () => {
  const host = await readyHost();
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  await runResolve25(agent, meta(), ctx, parent, PROJECT, MODULE, 25);
  const snapshot = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '{}') as D1InputSnapshot;
  assert.equal(snapshot.consumersReleased, true, JSON.stringify(snapshot.problems));
  const pages = [...new Set(snapshot.selection.requests.map(item => item.pageId))];
  // controllers60 reads only identity, function names and enumerations from the usecases50 draft.
  await writeJson(draftFile(PROJECT, MODULE, 'usecases50'), { schemaVersion: D1_USECASE_VERSION, project: PROJECT, moduleName: MODULE, usecases: [], enumerations: [] });
  const checkpoint = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  checkpoint.steps.usecases50 = {
    status: 'approved',
    updatedAt: '2026-09-21T12:00:00.000Z',
    artifactPaths: [],
  };
  host.files[fileKey(pipelineFile(PROJECT, MODULE))]!.content = JSON.stringify(checkpoint);

  const usecase = snapshot.files.find(file => file.artifactType === 'usecase');
  assert.ok(usecase);
  const neighbor = fileInfoFromDisplay(PROJECT, usecase.defPath)!;
  seed(host, neighbor, 'NEIGHBOR', 'frozen');
  const entity = snapshot.selection.entities[0];
  const ontology = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/ontology/${entity}.defs.ts`)!;
  const planner = plannerPipelineFile(PROJECT, MODULE);
  const ontologyBefore = host.files[fileKey(ontology)]?.content;
  const plannerBefore = host.files[fileKey(planner)]?.updatedAt;
  host.writes.length = 0;

  const step = createD1AgentStep('controllers60', MODULE, PROJECT, 'run');
  step.stepId = 60;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 2);
  assert.equal(intents.some(intent => intent.type === 'add-message-ai'), false);
  const anchor = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(anchor?.step.planning?.planId, 'controllers60-done');
  const handoff = JSON.parse(String((anchor?.step as mls.msg.AIResultStep).result)) as { nextStep: string; llmCalls: number };
  assert.equal(handoff.nextStep, 'support70');
  assert.equal(handoff.llmCalls, 0);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /No model was called/);

  const controllers = Object.values(host.files).filter(file => file.folder.includes('adapters/http/controllers') && file.extension === '.defs.ts');
  assert.equal(controllers.length, pages.length);
  assert.equal(controllers.every(file => file.content.includes('export const definition = ') && !file.content.includes('import ')), true);
  assert.equal(controllers.some(file => file.content.includes(`/l2/${MODULE}/`)), false);
  assert.equal(host.files[fileKey(neighbor)]?.content, 'NEIGHBOR');
  assert.equal(host.files[fileKey(neighbor)]?.updatedAt, 'frozen');
  assert.equal(host.files[fileKey(ontology)]?.content, ontologyBefore);
  assert.equal(host.files[fileKey(planner)]?.updatedAt, plannerBefore);
  assert.equal(host.writes.some(key => key.includes('/seeds') || key.includes('registerRepositories') || key.includes('accessScope')), false);

  const draft = host.files[fileKey(draftFile(PROJECT, MODULE, 'controllers60'))]?.content || '';
  assert.equal(draft.includes('"llmCalls": 0'), true);
  assert.equal(draft.includes(`"measuredRoutes": ${snapshot.selection.requests.length}`), true);
  assert.equal(draft.includes('ENUMERATIONS_NOT_CONSUMED'), true);
  host.writes.length = 0;
  await agent.beforePromptStep!(meta(), ctx, parent, step, 3);
  assert.deepEqual(host.writes, []);
});
