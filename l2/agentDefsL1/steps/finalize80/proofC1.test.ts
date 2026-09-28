/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/proofC1.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
  type D1PipelineState,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { fixtureLogicalName } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';
import { AGENDA_CLINICA_F35E28A } from '/_102021_/l2/agentDefsL1/fixtures/agendaClinica-f35e28a/root.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO = path.resolve(HERE, '../../../../..');
const CLINIC = AGENDA_CLINICA_F35E28A;
const PROJECT = 102047;
const MODULE = 'agendaClinica';

/**
 * The frozen agendaClinica run (f35e28a) carries effort v1.1. D1 reads only the v1.2 the L2 producer
 * writes (d1_37), so the replay is refused at input20: nothing past it runs and the bench is untouched.
 * The full C1 replay comes back when the 102047 bench is regenerated with the current producers.
 */
void test('controlled agendaClinica replay is refused at input20 on a v1.1 effort and touches nothing', async () => {
  const clinicBefore = clinicFingerprint();
  const host = installStudio(PROJECT);
  seedClinic(host);
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-25T12:00:00.000Z')));

  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const inputTrace = await runStep(agent, ctx, parent, 'input20', 20);
  assert.match(inputTrace, /Consumer phases are not released/);
  const snapshot = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '{}') as {
    consumersReleased?: boolean;
    problems?: Array<{ severity: string; code: string; path: string; message: string }>;
  };
  const inputErrors = (snapshot.problems || []).filter(problem => problem.severity === 'error');
  assert.deepEqual(inputErrors.map(problem => `${problem.code} ${problem.path}`), [`SCHEMA_DIVERGENT l4/${MODULE}/pool/l2/web/effort.json`]);
  assert.match(inputErrors[0].message, /'2026-09-21-p2-effort-v1\.1', expected 2026-09-21-p2-effort-v1\.2/);
  assert.equal(snapshot.consumersReleased, false);
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  assert.equal(state.steps.input20?.status, 'failed');
  assert.equal(state.steps.input20?.error, 'SCHEMA_DIVERGENT:1');
  assert.equal(state.steps.domain30, undefined);

  const domainTrace = await runStep(agent, ctx, parent, 'domain30', 30);
  assert.match(domainTrace, /domain30 wrote nothing/, domainTrace);
  assert.equal(writtenDefs(host).length, 0);
  assert.deepEqual(clinicFingerprint(), clinicBefore);
});

function writtenDefs(host: TestHost): string[] {
  return Object.entries(host.files)
    .filter(([, file]) => file.project === PROJECT && file.level === 1 && file.extension === '.defs.ts'
      && file.folder.startsWith(`${MODULE}/`) && !file.folder.includes('/pipeline/'))
    .map(([key]) => key);
}

function seedClinic(host: TestHost): string[] {
  const seeded: string[] = [];
  const add = (abs: string, logical: string, project = PROJECT) => {
    if (!existsSync(abs) || !statSync(abs).isFile()) return;
    const info = fileInfoFromDisplay(project, logical);
    if (!info || host.files[fileKey(info)]) return;
    seed(host, info, readFileSync(abs, 'utf8'), 'source');
    seeded.push(`_${project}_/${logical}`);
  };
  const walk = (dir: string, logicalRoot: string) => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      const logical = `${logicalRoot}/${fixtureLogicalName(name)}`;
      if (statSync(abs).isDirectory()) walk(abs, logical);
      else add(abs, logical);
    }
  };
  walk(path.join(CLINIC, 'l4/agendaClinica'), 'l4/agendaClinica');
  walk(path.join(CLINIC, 'l2/agendaClinica/web/contracts'), 'l2/agendaClinica/web/contracts');
  add(path.join(CLINIC, 'l1/agendaClinica/pipeline/pipeline.json'), 'l4/agendaClinica/pool/l1/pipeline.json');
  for (let pass = 0; pass < 3; pass += 1) {
    const text = Object.values(host.files).map(file => file.content).join('\n');
    for (const match of text.matchAll(/_(\d+)_\/(l\d+\/[A-Za-z0-9_./-]+\.defs\.ts)/g)) {
      const project = Number(match[1]);
      if (project === PROJECT) continue;
      add(path.join(MONOREPO, `mls-${project}`, match[2]), match[2], project);
    }
  }
  return seeded.sort();
}

function clinicFingerprint(): string[] {
  const roots = [
    path.join(CLINIC, 'l1/agendaClinica'),
    path.join(CLINIC, 'l2/agendaClinica'),
    path.join(CLINIC, 'l4/agendaClinica'),
  ];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      const stat = statSync(abs);
      if (stat.isDirectory()) walk(abs);
      else out.push(`${abs.slice(CLINIC.length + 1)}:${stat.size}:${Math.trunc(stat.mtimeMs)}`);
    }
  };
  for (const root of roots) walk(root);
  return out.sort();
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
