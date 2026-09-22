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
  displayPath,
  draftFile,
  inputFile,
  pipelineFile,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
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
  assertFanoutParent(fanout?.step, 13);
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
  assert.match(ready.systemPrompt || '', /<!-- modelType: reasoning -->/);
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

void test('resume after persistence40 dispatches the same fan-out and does not rewrite the checkpoint', async () => {
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
  const kept = keptFiles(host);

  const step = createD1AgentStep('usecases50', MODULE, PROJECT, 'resume');
  step.stepId = 50;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 4);
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(fanout?.executionMode?.type, 'parallel');
  assert.equal(fanout?.executionMode?.args.length, 13);
  assertFanoutParent(fanout?.step, 13);
  assert.equal(intents.some(intent => intent.type === 'update-status' && /dispatched 13 workers/.test((intent as mls.msg.AgentIntentUpdateStatus).traceMsg || '')), true);
  const pipeline = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as { steps?: { persistence40?: { status?: string } } };
  assert.equal(pipeline.steps?.persistence40?.status, 'approved');
  assert.deepEqual(keptFiles(host), kept);
});

void test('the same snapshot does not call the model again', async () => {
  const host = installStudio(PROJECT);
  const snapshot = 'sha256:same';
  await writeJson(inputFile(PROJECT, MODULE), {
    schemaVersion: '2026-09-21-d1-input-v1',
    project: PROJECT,
    moduleName: MODULE,
    snapshotHash: snapshot,
  });
  const pipeline = createEntryPipeline(PROJECT, MODULE, new Date('2026-09-22T00:00:00.000Z'));
  const artifact = displayPath(draftFile(PROJECT, MODULE, 'usecases50'));
  pipeline.steps.input20 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(inputFile(PROJECT, MODULE))] };
  pipeline.steps.domain30 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(draftFile(PROJECT, MODULE, 'domain30'))] };
  pipeline.steps.persistence40 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(draftFile(PROJECT, MODULE, 'persistence40'))] };
  pipeline.steps.usecases50 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [artifact] };
  await writeJson(pipelineFile(PROJECT, MODULE), pipeline);
  const defPath = `l1/${MODULE}/layer_2_application/usecases/listConsulta.defs.ts`;
  await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'usecases50',
    unitId: 'usecases50',
    draftText: '{"llmCalls":0}',
    snapshotHash: snapshot,
    runId: snapshot,
    parts: [{ defPath, source: 'export const definition = { "artifactId": "listConsulta" } as const;\n' }],
  });
  const stored = host.files[fileKey(fileInfo(defPath))]!;
  const mtime = stored.updatedAt;
  const bytes = stored.content;
  host.writes.length = 0;
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const step = createD1AgentStep('usecases50', MODULE, PROJECT, 'run');
  step.stepId = 50;
  const first = await agent.beforePromptStep!(meta(), ctx, parent, step, 1);
  assert.equal(first.some(intent => intent.type === 'prompt_ready'), false);
  assert.equal(first.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'usecases50-fanout'), false);
  const trace = first.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /No model was called/);
  const anchor = first.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(anchor?.step.planning?.planId, 'usecases50-done');
  assert.equal(JSON.parse(String((anchor?.step as mls.msg.AIResultStep).result)).llmCalls, 0);
  assert.equal(stored.content, bytes);
  assert.equal(stored.updatedAt, mtime);
  host.writes.length = 0;
  if (anchor) {
    anchor.step.stepId = 80;
    parent.nextSteps = [...(parent.nextSteps || []), anchor.step];
  }
  await agent.beforePromptStep!(meta(), ctx, parent, step, 2);
  assert.deepEqual(host.writes, []);
  assert.equal(stored.updatedAt, mtime);
});

function keptFiles(host: { files: Record<string, { content?: string }> }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, file] of Object.entries(host.files)) {
    if (key.includes('usecases50-work')) continue;
    out[key] = file.content || '';
  }
  return out;
}

function assertFanoutParent(step: mls.msg.AIPayload | undefined, workers: number): void {
  assert.equal(step?.type, 'agent');
  if (step?.type !== 'agent') return;
  assert.equal(step.status, 'in_progress');
  assert.equal(step.interaction?.cost, 0);
  assert.equal(step.interaction?.payload, null);
  assert.deepEqual(step.interaction?.input, [{ type: 'system', content: '<!-- modelType: reasoning -->' }]);
  assert.deepEqual(step.interaction?.trace, [`queued ${workers} usecases50 workers with maxParallel=5`]);
}

function fileInfo(path: string) {
  const file = {
    project: PROJECT,
    level: 1,
    folder: `${MODULE}/layer_2_application/usecases`,
    shortName: 'listConsulta',
    extension: '.defs.ts',
  };
  assert.equal(`l1/${file.folder}/${file.shortName}${file.extension}`, path);
  return file;
}
