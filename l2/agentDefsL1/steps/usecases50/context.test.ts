/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/context.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { createD1AgentStep, createEntryPipeline, pipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';
import { AGENDA_CLINICA_F35E28A } from '/_102021_/l2/agentDefsL1/fixtures/agendaClinica-f35e28a/root.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = AGENDA_CLINICA_F35E28A;
const MDM = path.resolve(HERE, '../../../../../mls-102034/l4/ontology/mdm.defs.ts');
const MODULE = 'agendaClinica';
const PROJECT = 102047;

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

function seedTree(host: ReturnType<typeof installStudio>, dir: string, prefix: string, edit?: (logical: string, text: string) => string): void {
  for (const rel of walk(dir, '')) {
    const logical = `${prefix}/${fixtureLogicalRel(rel)}`;
    const text = readFileSync(path.join(dir, rel), 'utf8');
    const info = fileInfoFromDisplay(PROJECT, logical);
    if (!info) continue;
    seed(host, info, edit ? edit(logical, text) : text, 'frozen');
  }
}

/**
 * The frozen agendaClinica run (f35e28a) carries effort v1.1. D1 reads only the v1.2 the L2 producer
 * writes (d1_37), so the live hook never reaches the usecases50 fan-out on it. The per-usecase worker
 * prompt tests come back when the 102047 bench is regenerated with the current producers.
 */
void test('the real hook on a v1.1 effort stops at input20 and usecases50 writes nothing', async () => {
  const host = installStudio(PROJECT);
  seedTree(host, path.join(APP, 'l4', MODULE), `l4/${MODULE}`);
  seedTree(host, path.join(APP, 'l2', MODULE, 'web', 'contracts'), `l2/${MODULE}/web/contracts`);
  const catalog = fileInfoFromDisplay(102034, 'l4/ontology/mdm.defs.ts');
  assert.ok(catalog);
  seed(host, catalog, readFileSync(MDM, 'utf8'), 'catalog');
  seed(host, fileInfoFromDisplay(PROJECT, `l4/${MODULE}/pool/l1/pipeline.json`)!, `${JSON.stringify({
    schemaVersion: '2026-09-20-p1-pipeline-v1',
    flowId: 'agentPlannerL1',
    moduleName: MODULE,
    status: 'complete',
    steps: { plan20: { status: 'approved', artifactPaths: [`l4/${MODULE}/pool/l2/web/backend.json`] } },
    thread: 'agendaClinica-d114',
    round: 1,
  })}\n`, 'planner');
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/steps/usecases50', shortName: 'prompt', extension: '.md' }, readFileSync(path.join(HERE, 'prompt.md'), 'utf8'), 'prompt');
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/skills', shortName: 'usecase', extension: '.md' }, readFileSync(path.join(HERE, '../../skills/usecase.md'), 'utf8'), 'skill');
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-23T12:00:00.000Z')));
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  parent.nextSteps = [];
  const trace = async (stepId: 'input20' | 'domain30' | 'persistence40' | 'usecases50', order: number) => {
    const step = createD1AgentStep(stepId, MODULE, PROJECT, 'run');
    step.stepId = order * 10;
    const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, order);
    assert.equal(intents.some(item => item.type === 'add-step'), false, stepId);
    return intents
      .filter((item): item is mls.msg.AgentIntentUpdateStatus => item.type === 'update-status')
      .map(item => item.traceMsg)
      .join(' ');
  };
  assert.match(await trace('input20', 2), /Consumer phases are not released\. SCHEMA_DIVERGENT:2/);
  await trace('domain30', 3);
  await trace('persistence40', 4);
  const writesBefore = host.writes.length;
  assert.match(await trace('usecases50', 5), /usecases50 wrote nothing/);
  assert.equal(host.writes.length, writesBefore);
});
