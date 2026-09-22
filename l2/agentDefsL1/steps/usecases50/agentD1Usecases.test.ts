/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/agentD1Usecases.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  draftFile,
  pipelineFile,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { parseWorkerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { attemptFile } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, '../input20/fixtures/head');
const MODULE = 'agendaClinica';
const PROJECT = 102047;
const PAGES = ['agenda', 'cadastro_profissional', 'cadastro_recepcionista', 'consultas', 'pacientes'];

function walk(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

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

async function readyHost() {
  const host = installStudio(PROJECT);
  for (const rel of walk(FIXTURE, '')) {
    const file = rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
    const info = fileInfoFromDisplay(PROJECT, file);
    assert.ok(info, rel);
    seed(host, info, readFileSync(path.join(FIXTURE, rel), 'utf8'), 'frozen');
  }
  for (const pageId of PAGES) {
    const body = `export const ${pageId}Contract = { "moduleName": "${MODULE}", "pageId": "${pageId}" } as const;\n`;
    seed(host, fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${pageId}.defs.ts`)!, body, 'contract');
  }
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/steps/usecases50', shortName: 'prompt', extension: '.md' }, readFileSync(path.join(HERE, 'prompt.md'), 'utf8'), 'prompt');
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/skills', shortName: 'usecase', extension: '.md' }, readFileSync(path.join(HERE, '../../skills/usecase.md'), 'utf8'), 'skill');
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-21T12:00:00.000Z')));
  return host;
}

void test('usecases50 dispatches one worker per selected usecase and a worker does not add a step', async () => {
  const host = await readyHost();
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  parent.nextSteps = [];
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  const domain = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  domain.stepId = 30;
  await agent.beforePromptStep!(meta(), ctx, parent, domain, 2);
  const persistence = createD1AgentStep('persistence40', MODULE, PROJECT, 'run');
  persistence.stepId = 40;
  await agent.beforePromptStep!(meta(), ctx, parent, persistence, 3);

  const step = createD1AgentStep('usecases50', MODULE, PROJECT, 'run');
  step.stepId = 50;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 4);
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(fanout?.executionMode?.type, 'parallel');
  assert.equal(fanout?.executionMode?.maxParallel, 5);
  assert.equal(fanout?.executionMode?.args.length, 13);
  assert.equal(fanout?.step.planning?.executionMode, 'parallel_dynamic');
  assert.equal(fanout?.step.planning?.planId, 'usecases50-fanout');
  assert.equal(intents.some(intent => intent.type === 'prompt_ready'), false);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /dispatched 13 workers/);

  const workerPrompt = fanout?.executionMode?.args[0] || '';
  const arg = parseWorkerArg(workerPrompt);
  assert.ok(arg);
  const worker: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 51,
    interaction: null,
    stepTitle: arg.usecaseId,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt: workerPrompt,
    rags: [],
    planning: { planId: '', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const prepared = await agent.beforePromptStep!(meta(), ctx, parent, worker, 5);
  const ready = prepared.find((intent): intent is mls.msg.AgentIntentPromptReady => intent.type === 'prompt_ready');
  assert.ok(ready);
  assert.equal(ready.humanPrompt.includes('Do not write TypeScript') || ready.systemPrompt?.includes('Do not write TypeScript'), true);
  assert.equal(ready.humanPrompt.includes(arg.usecaseId), true);
  const finished = await agent.afterPromptStep!(meta(), ctx, parent, worker, 6);
  assert.equal(finished.some(intent => intent.type === 'add-step'), false);
  const workerTrace = finished.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.equal(workerTrace?.status, 'completed');
  assert.match(workerTrace?.traceMsg || '', /did not arrive/);
  const attempt = host.files[fileKey(attemptFile(PROJECT, MODULE, arg.usecaseId))];
  assert.match(attempt?.content || '', /operational/);
  assert.match(attempt?.content || '', /did not arrive/);

  const barrier = await agent.afterPromptStep!(meta(), ctx, parent, fanout!.step as mls.msg.AIAgentStep, 7);
  assert.equal(barrier.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'usecases50-done'), false);
  const barrierTrace = barrier.filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status').map(intent => intent.traceMsg).join(' ');
  assert.match(barrierTrace, new RegExp(arg.usecaseId));
  assert.match(barrierTrace, /missing trace|OPERATIONAL|operational/);
  assert.equal(host.files[fileKey(draftFile(PROJECT, MODULE, 'usecases50'))], undefined);
});
