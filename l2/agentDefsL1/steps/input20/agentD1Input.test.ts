/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/agentD1Input.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  inputFile,
  pipelineFile,
  plannerPipelineFile,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'head');
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

async function readyHost(withContracts: boolean) {
  const host = installStudio(PROJECT);
  for (const rel of walk(FIXTURE, '')) {
    const file = rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
    const info = fileInfoFromDisplay(PROJECT, file);
    assert.ok(info, rel);
    seed(host, info, readFileSync(path.join(FIXTURE, rel), 'utf8'), 'frozen');
  }
  if (withContracts) {
    for (const pageId of PAGES) {
      const body = `export const ${pageId}Contract = { "moduleName": "${MODULE}", "pageId": "${pageId}" } as const;\n`;
      seed(host, fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${pageId}.defs.ts`)!, body, 'contract');
    }
  }
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-21T12:00:00.000Z')));
  host.writes.length = 0;
  return host;
}

void test('input20 without contracts records the inventory and does not unlock the next phase', async () => {
  const host = await readyHost(false);
  const planner = host.files[fileKey(plannerPipelineFile(PROJECT, MODULE))]!;
  const agent = createAgent();
  const ctx = context();
  const step = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  step.stepId = 20;
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 1);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /Consumer phases are not released/);
  assert.equal(intents.some(intent => intent.type === 'add-step'), false);
  assert.equal(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content.includes('"input20"'), false);
  assert.ok(host.files[fileKey(inputFile(PROJECT, MODULE))]);
  assert.equal(planner.updatedAt, 'frozen');
  assert.equal(host.writes.every(key => key === fileKey(inputFile(PROJECT, MODULE))), true);
  assert.equal(Object.keys(host.files).some(key => key.includes('layer_')), false);
});

void test('input20 releases the next phase only when contracts parse, and still writes no defs', async () => {
  const host = await readyHost(true);
  const contractKey = fileKey(fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/pacientes.defs.ts`)!);
  const contractMtime = host.files[contractKey]?.updatedAt;
  const agent = createAgent();
  const ctx = context();
  const step = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  step.stepId = 20;
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 1);
  const anchor = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(anchor?.step.planning?.planId, 'input20-done');
  const handoff = JSON.parse(String((anchor?.step as mls.msg.AIResultStep).result)) as { nextStep: string; artifact: string };
  assert.equal(handoff.nextStep, 'domain30');
  assert.equal(handoff.artifact.includes('/input.json'), true);
  const pipeline = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as {
    steps: { input20?: { status: string } };
  };
  assert.equal(pipeline.steps.input20?.status, 'approved');
  assert.equal(host.files[contractKey]?.updatedAt, contractMtime);
  assert.equal(Object.keys(host.files).some(key => key.includes('layer_')), false);
  assert.equal(host.writes.some(key => key.includes('_4_') || key.includes('_5_') || key.includes('_2_')), false);
});
