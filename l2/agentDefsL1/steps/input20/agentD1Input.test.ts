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
const CONTRACTS = path.join(HERE, 'fixtures', 'contracts');
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
    const names = readdirSync(CONTRACTS).filter(name => name.endsWith('.defs.txt')).sort();
    for (const [index, pageId] of PAGES.entries()) {
      const body = readFileSync(path.join(CONTRACTS, names[index]), 'utf8');
      seed(host, fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${pageId}.defs.ts`)!, body, 'contract');
    }
  }
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-21T12:00:00.000Z')));
  host.writes.length = 0;
  return host;
}

function blockingCodes(problems: Array<{ severity?: string; code?: string }>): string {
  const counts = new Map<string, number>();
  for (const problem of problems) {
    if (problem.severity !== 'error' || !problem.code) continue;
    counts.set(problem.code, (counts.get(problem.code) || 0) + 1);
  }
  return [...counts.keys()].sort().map(code => `${code}:${counts.get(code)}`).join(',');
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
  assert.doesNotMatch(trace?.traceMsg || '', /success|approved/i);
  assert.equal(trace?.status, 'completed');
  assert.equal(intents.some(intent => intent.type === 'add-step'), false);
  const inventory = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '{}') as {
    problems?: Array<{ severity?: string; code?: string; path?: string }>;
  };
  const reason = blockingCodes(inventory.problems || []);
  assert.match(reason, /^CONTRACT_ABSENT:\d+$/);
  const pipeline = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as {
    status?: string;
    awaitingStep?: string;
    steps?: { input20?: { status?: string; error?: string; artifactPaths?: string[] }; domain30?: unknown };
  };
  assert.equal(pipeline.status, 'awaitingStep');
  assert.equal(pipeline.awaitingStep, 'input20');
  assert.equal(pipeline.steps?.input20?.status, 'failed');
  assert.notEqual(pipeline.steps?.input20?.status, 'approved');
  assert.equal(pipeline.steps?.input20?.error, reason);
  assert.equal(pipeline.steps?.input20?.error?.includes('/'), false);
  assert.equal(pipeline.steps?.input20?.artifactPaths?.[0]?.endsWith('/input.json'), true);
  assert.equal(pipeline.steps?.domain30, undefined);
  assert.equal(planner.updatedAt, 'frozen');
  const pipelineKey = fileKey(pipelineFile(PROJECT, MODULE));
  assert.equal(host.writes.filter(key => key === pipelineKey).length, 1);
  assert.equal(host.writes.every(key => key === fileKey(inputFile(PROJECT, MODULE)) || key === pipelineKey), true);
  assert.equal(Object.keys(host.files).some(key => key.includes('layer_')), false);

  const bytes = host.files[pipelineKey]?.content;
  const mtime = host.files[pipelineKey]?.updatedAt;
  const again = await agent.beforePromptStep!(meta(), ctx, parent, step, 2);
  assert.equal(again.some(intent => intent.type === 'add-step'), false);
  assert.equal(host.files[pipelineKey]?.content, bytes);
  assert.equal(host.files[pipelineKey]?.updatedAt, mtime);
  assert.equal(host.writes.filter(key => key === pipelineKey).length, 1);
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
    status?: string;
    awaitingStep?: string;
    steps: { input20?: { status: string; error?: string } };
  };
  assert.equal(pipeline.steps.input20?.status, 'approved');
  assert.equal(pipeline.steps.input20?.error, undefined);
  assert.equal(pipeline.status, 'inProgress');
  assert.equal(pipeline.awaitingStep, undefined);
  assert.equal(host.files[contractKey]?.updatedAt, contractMtime);
  assert.equal(Object.keys(host.files).some(key => key.includes('layer_')), false);
  assert.equal(host.writes.some(key => key.includes('_4_') || key.includes('_5_') || key.includes('_2_')), false);
});
