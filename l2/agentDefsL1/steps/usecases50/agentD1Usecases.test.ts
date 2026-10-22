/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/agentD1Usecases.test.ts" enhancement="_blank"/>

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
import {
  createD1AgentStep,
  createEntryPipeline,
  draftFile,
  inputFile,
  pipelineFile,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { runResolve25 } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { artifactFile } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { loadD1UsecaseWork } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';

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

async function readyToDispatch() {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE_ID, PROJECT);
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-21T12:00:00.000Z')));
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const usecases = createD1AgentStep('usecases50', MODULE, PROJECT, 'run');
  usecases.stepId = 50;
  parent.nextSteps = [usecases];
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  await runResolve25(agent, meta(), ctx, parent, PROJECT, MODULE, 25);
  const domain = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  domain.stepId = 30;
  await agent.beforePromptStep!(meta(), ctx, parent, domain, 2);
  const persistence = createD1AgentStep('persistence40', MODULE, PROJECT, 'run');
  persistence.stepId = 40;
  await agent.beforePromptStep!(meta(), ctx, parent, persistence, 3);
  return { host, agent, ctx, parent, usecases };
}

void test('usecases50 writes the defs in one pass and does not call a model', async () => {
  const { host, agent, ctx, parent, usecases } = await readyToDispatch();
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, usecases, 4);
  assert.equal(intents.some(intent => intent.type === 'prompt_' + 'ready'), false);
  assert.equal(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'usecases50-fanout'), false);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.status === 'completed');
  assert.match(trace?.traceMsg || '', /No model was called/);
  const pipeline = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as { steps?: { usecases50?: { status?: string } } };
  assert.equal(pipeline.steps?.usecases50?.status, 'approved', trace?.traceMsg);
  const draft = JSON.parse(host.files[fileKey(draftFile(PROJECT, MODULE, 'usecases50'))]?.content || '{}') as { llmCalls?: number; usecases?: { definition?: { data?: Record<string, unknown> } }[] };
  assert.equal(draft.llmCalls, 0);
  assert.ok((draft.usecases || []).length > 0);
  const data = draft.usecases?.[0]?.definition?.data || {};
  assert.equal(data.sequence, undefined);
  assert.equal(data.ports, undefined);
  assert.ok(Array.isArray(data.rulesApplied));
});

void test('a preserve usecase keeps its def bytes', async () => {
  const preserveId = 'listMovimentacaoEstoque';
  const { host, agent, ctx, parent, usecases } = await readyToDispatch();
  const loaded = await loadD1UsecaseWork(PROJECT, MODULE);
  assert.equal('work' in loaded, true);
  if (!('work' in loaded)) return;
  const key = fileKey(inputFile(PROJECT, MODULE));
  const snapshot = JSON.parse(host.files[key]?.content || '{}') as { files: { artifactType: string; identity: string; action: string }[] };
  for (const file of snapshot.files) {
    if (file.artifactType === 'usecase') file.action = file.identity === preserveId ? 'preserve' : 'update';
  }
  host.files[key]!.content = `${JSON.stringify(snapshot, null, 2)}\n`;
  const usecase = loaded.work.request.usecases.find(item => item.usecaseId === preserveId);
  assert.ok(usecase);
  const bytes = `export const definition = { "artifactId": "${preserveId}" } as const;\n`;
  const info = artifactFile(PROJECT, usecase.defPath);
  assert.ok(info);
  seed(host, info, bytes, 'defs');
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, usecases, 4);
  const failed = intents.filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.status === 'failed');
  assert.equal(failed.length, 0, failed.map(intent => intent.traceMsg).join(' | '));
  assert.equal(host.files[fileKey(info)]?.content, bytes);
});
