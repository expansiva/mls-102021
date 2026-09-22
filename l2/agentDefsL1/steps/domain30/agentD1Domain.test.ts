/// <mls fileReference="_102021_/l2/agentDefsL1/steps/domain30/agentD1Domain.test.ts" enhancement="_blank"/>

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
  draftFile,
  pipelineFile,
  plannerPipelineFile,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { catalogInfo, commitD1Domain } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import { buildD1Domain } from '/_102021_/l2/agentDefsL1/steps/domain30/gate.js';
import { nestedEnumEntity } from '/_102021_/l2/agentDefsL1/steps/domain30/fixtures/cases.js';
import { lowerFirst } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

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
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-21T12:00:00.000Z')));
  host.writes.length = 0;
  return host;
}

void test('domain30 writes the five domain defs once and leaves done bytes and neighbors alone', async () => {
  const host = await readyHost();
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);

  const neighbor = fileInfoFromDisplay(PROJECT, `l1/${MODULE}/layer_2_application/usecases/listConsulta.defs.ts`)!;
  seed(host, neighbor, 'NEIGHBOR', 'frozen');
  const ontology = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/ontology/Consulta.defs.ts`)!;
  const planner = plannerPipelineFile(PROJECT, MODULE);
  const ontologyBefore = host.files[fileKey(ontology)]?.content;
  const plannerBefore = host.files[fileKey(planner)]?.updatedAt;
  host.writes.length = 0;

  const step = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  step.stepId = 30;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 2);
  assert.equal(intents.some(intent => intent.type === 'add-message-ai'), false);
  const anchor = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(anchor?.step.planning?.planId, 'domain30-done');
  const handoff = JSON.parse(String((anchor?.step as mls.msg.AIResultStep).result)) as { nextStep: string; llmCalls: number };
  assert.equal(handoff.nextStep, 'persistence40');
  assert.equal(handoff.llmCalls, 0);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /No model was called/);

  const defs = Object.values(host.files).filter(file => file.folder.includes('layer_3_domain') && file.extension === '.defs.ts');
  assert.equal(defs.length, 5);
  assert.equal(defs.every(file => file.content.includes('export const definition = ')), true);
  assert.equal(host.files[fileKey(neighbor)]?.content, 'NEIGHBOR');
  assert.equal(host.files[fileKey(neighbor)]?.updatedAt, 'frozen');
  assert.equal(host.files[fileKey(ontology)]?.content, ontologyBefore);
  assert.equal(host.files[fileKey(ontology)]?.updatedAt, 'frozen');
  assert.equal(host.files[fileKey(planner)]?.updatedAt, plannerBefore);
  assert.equal(host.writes.some(key => key.includes('_4_') || key.includes('_2_') || key.includes('usecases/listConsulta')), false);

  const draft = host.files[fileKey(draftFile(PROJECT, MODULE, 'domain30'))]?.content || '';
  assert.equal(draft.includes('"llmCalls": 0'), true);
  host.writes.length = 0;
  await agent.beforePromptStep!(meta(), ctx, parent, step, 3);
  assert.deepEqual(host.writes, []);
});

void test('commit does not rewrite a preserved file or a neighbor', async () => {
  const host = installStudio(PROJECT);
  const id = 'Holder';
  const defPath = `l1/sampleModule/layer_3_domain/entities/${lowerFirst(id)}.defs.ts`;
  const info = fileInfoFromDisplay(PROJECT, defPath)!;
  seed(host, info, 'KEEP', 'frozen');
  const neighbor = fileInfoFromDisplay(PROJECT, 'l1/sampleModule/layer_2_application/usecases/other.defs.ts')!;
  seed(host, neighbor, 'NEIGHBOR', 'frozen');
  const build = buildD1Domain({
    project: PROJECT,
    moduleName: 'sampleModule',
    selection: {
      entities: [id],
      tables: [],
      files: [{ artifactType: 'domainEntity', identity: id, defPath, action: 'preserve' }],
    },
    entities: nestedEnumEntity,
    ontologyIndex: { entities: [{ entityId: id, kind: 'entity' }] },
    rules: { rules: {} },
    catalogs: {},
  });
  assert.equal(build.ok, true, JSON.stringify(build.problems));
  host.writes.length = 0;
  const committed = await commitD1Domain(PROJECT, build);
  assert.deepEqual(committed.issues, []);
  assert.equal(host.files[fileKey(info)]?.content, 'KEEP');
  assert.equal(host.files[fileKey(info)]?.updatedAt, 'frozen');
  assert.equal(host.files[fileKey(neighbor)]?.content, 'NEIGHBOR');
  assert.equal(host.files[fileKey(neighbor)]?.updatedAt, 'frozen');
  assert.equal(committed.written.length, 0);
});

void test('a catalog source in another project is a file identity, not a path trick', () => {
  const info = catalogInfo('/_102034_/l4/ontology/mdm.defs.ts');
  assert.equal(info?.project, 102034);
  assert.equal(info?.shortName, 'mdm');
  assert.equal(catalogInfo('/_102034_/l4/ontology/../mdm.defs.ts'), null);
  assert.equal(catalogInfo('todo/gerarApp/mdm.defs.ts'), null);
});
