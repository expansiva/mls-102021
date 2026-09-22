/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/agentD1Support.test.ts" enhancement="_blank"/>

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
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { contractSources, coreControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { coreUsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';

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
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-22T12:00:00.000Z')));
  host.writes.length = 0;
  return host;
}

void test('support70 writes scope, authority and the registry once', async () => {
  const host = await readyHost();
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  const domain = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  domain.stepId = 30;
  await agent.beforePromptStep!(meta(), ctx, parent, domain, 2);
  const persistence = createD1AgentStep('persistence40', MODULE, PROJECT, 'run');
  persistence.stepId = 40;
  await agent.beforePromptStep!(meta(), ctx, parent, persistence, 3);

  const contracts = contractSources(MODULE, coreControllerRequest().routes);
  for (const contract of contracts) {
    seed(host, fileInfoFromDisplay(PROJECT, contract.path)!, contract.source, 'contract');
  }
  await writeJson(draftFile(PROJECT, MODULE, 'usecases50'), buildD1Usecases(coreUsecaseRequest()));
  const checkpoint = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  checkpoint.steps.usecases50 = { status: 'approved', updatedAt: '2026-09-22T12:00:00.000Z', artifactPaths: [] };
  host.files[fileKey(pipelineFile(PROJECT, MODULE))]!.content = JSON.stringify(checkpoint);
  const controllers = createD1AgentStep('controllers60', MODULE, PROJECT, 'run');
  controllers.stepId = 60;
  await agent.beforePromptStep!(meta(), ctx, parent, controllers, 4);

  const neighbor = fileInfoFromDisplay(PROJECT, `l1/${MODULE}/layer_2_application/usecases/listConsulta.defs.ts`)!;
  seed(host, neighbor, 'NEIGHBOR', 'frozen');
  const ontology = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/ontology/Consulta.defs.ts`)!;
  const planner = plannerPipelineFile(PROJECT, MODULE);
  const ontologyBefore = host.files[fileKey(ontology)]?.content;
  const plannerBefore = host.files[fileKey(planner)]?.updatedAt;
  host.writes.length = 0;

  const step = createD1AgentStep('support70', MODULE, PROJECT, 'run');
  step.stepId = 70;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 5);
  assert.equal(intents.some(intent => intent.type === 'add-message-ai'), false);
  const anchor = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(anchor?.step.planning?.planId, 'support70-done');
  const handoff = JSON.parse(String((anchor?.step as mls.msg.AIResultStep).result)) as { nextStep: string; llmCalls: number };
  assert.equal(handoff.nextStep, 'finalize80');
  assert.equal(handoff.llmCalls, 0);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /No model was called/);

  const scope = Object.values(host.files).find(file => file.shortName === 'accessScope' && file.extension === '.defs.ts');
  const authority = Object.values(host.files).find(file => file.shortName === 'authorityMap' && file.extension === '.defs.ts');
  const registry = Object.values(host.files).find(file => file.shortName === 'registerRepositories' && file.extension === '.defs.ts');
  assert.ok(scope?.content.includes('export const definition = ') && !scope.content.includes('import '));
  assert.ok(authority?.content.includes('"mapId": "authorityMap"'));
  assert.ok(registry?.content.includes('"portId": "ConsultaRepository"'));
  assert.equal(registry?.content.includes('GhostRepository'), false);
  assert.equal(Object.values(host.files).some(file => file.shortName === 'seeds' || file.shortName === 'sessionScope' || file.shortName === 'outbound'), false);
  assert.equal(host.writes.some(key => key.includes('/l5/') || key.includes('sessionScope')), false);
  assert.equal(host.files[fileKey(neighbor)]?.content, 'NEIGHBOR');
  assert.equal(host.files[fileKey(neighbor)]?.updatedAt, 'frozen');
  assert.equal(host.files[fileKey(ontology)]?.content, ontologyBefore);
  assert.equal(host.files[fileKey(planner)]?.updatedAt, plannerBefore);

  const draft = host.files[fileKey(draftFile(PROJECT, MODULE, 'support70'))]?.content || '';
  assert.equal(draft.includes('"llmCalls": 0'), true);
  assert.equal(draft.includes('ENUMERATIONS_NOT_CONSUMED'), true);
  assert.equal(draft.includes('"consumed": false'), true);
  assert.equal(draft.includes('ACCESS_ANCHOR'), true);
  assert.equal(draft.includes('l5/'), false);
  const saved = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  assert.equal(saved.steps.support70?.status, 'approved');
  assert.equal(saved.awaitingStep, undefined);

  host.writes.length = 0;
  await agent.beforePromptStep!(meta(), ctx, parent, step, 6);
  assert.deepEqual(host.writes, []);
});
