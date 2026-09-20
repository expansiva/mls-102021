/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/agentP1Plan.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentPlannerL1/agentPlannerL1.js';
import { executeP1Entry, p1BackendFile, p1PipelineFile } from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';
import { P1_STEP_HOOKS } from '/_102021_/l2/agentPlannerL1/helpers/p1Dispatch.js';
import {
  afterP1PlanPromptStep,
  beforeP1PlanPromptStep,
  executeP1Plan,
} from '/_102021_/l2/agentPlannerL1/steps/plan20/agentP1Plan.js';
import type { P1BackendFile } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import { poolStamp, readPoolTraceAt, type PoolMessage } from '/_102035_/l2/solution/pool.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const P1_ROOT = path.resolve(HERE, '../..');
const FIXTURE = JSON.parse(readFileSync(path.join(HERE, '../entry10/fixtures/pool-l1-mensalidadesAcademia.json'), 'utf8')) as Record<string, unknown>;
const NEEDS = readFileSync(path.join(HERE, '../entry10/fixtures/needs-mensalidadesAcademia.json'), 'utf8');
const PROJECT = 102047;
const MODULE = 'mensalidadesAcademia';
const AT = new Date(Date.UTC(2026, 8, 20, 10, 30, 0));
const SHORT = '20260920103000_mensalidadesAcademia-20260920103000_1';
const DISPLAY = `l4/${MODULE}/pool/l1/${SHORT}.json`;

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};
type Host = { files: Record<string, Stored>; deleted: string[] };

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function seed(host: Host, opts: {
  project?: number; level?: number; folder: string; shortName: string; extension?: string; content?: string;
}): Stored {
  const file: Stored = {
    project: opts.project ?? PROJECT,
    level: opts.level ?? 4,
    folder: opts.folder,
    shortName: opts.shortName,
    extension: opts.extension ?? '.json',
    status: 'changed',
    versionRef: '1',
    content: opts.content ?? '',
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

function installHost(): Host {
  const host: Host = { files: {}, deleted: [] };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      addOrUpdateFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string; source?: string }) => {
        return seed(host, {
          project: info.project,
          level: info.level,
          folder: info.folder,
          shortName: info.shortName,
          extension: info.extension,
          content: info.source || '',
        });
      },
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
        deleteFile: (file: Stored) => {
          host.deleted.push(`${file.folder}/${file.shortName}`);
          const stored = host.files[keyOf(file)];
          if (stored) stored.status = 'deleted';
        },
      },
    },
  };
  return host;
}

const L4_COMPLETE = JSON.stringify({
  schemaVersion: '2026-09-10-ns5-pipeline-v1',
  flowId: 'agentNewSolution5',
  moduleName: MODULE,
  status: 'complete',
  steps: {},
  sourcePrompt: '',
  invocation: { fast: false, module: MODULE, rebuildAll: false },
  updatedAt: AT.toISOString(),
});

function seedOntology(host: Host): void {
  const root = path.join(HERE, 'fixtures/ontology');
  seed(host, { folder: `${MODULE}/ontology`, shortName: 'index', extension: '.defs.ts', content: readFileSync(path.join(root, 'index.defs.ts'), 'utf8') });
  seed(host, { folder: `${MODULE}/ontology`, shortName: 'Mensalidade', extension: '.defs.ts', content: readFileSync(path.join(root, 'Mensalidade.defs.ts'), 'utf8') });
  seed(host, { folder: `${MODULE}/ontology`, shortName: 'Pagamento', extension: '.defs.ts', content: readFileSync(path.join(root, 'Pagamento.defs.ts'), 'utf8') });
}

function seedAgentFiles(host: Host): void {
  seed(host, {
    project: 102021, level: 2, folder: 'agentPlannerL1/skills', shortName: 'architecture', extension: '.md',
    content: readFileSync(path.join(P1_ROOT, 'skills/architecture.md'), 'utf8'),
  });
  seed(host, {
    project: 102021, level: 2, folder: 'agentPlannerL1/steps/plan20', shortName: 'prompt', extension: '.md',
    content: readFileSync(path.join(HERE, 'prompt.md'), 'utf8'),
  });
}

function seedReady(host: Host): void {
  seed(host, { folder: `${MODULE}/pipeline`, shortName: 'pipeline', content: L4_COMPLETE });
  seed(host, { folder: `${MODULE}/pool/l1`, shortName: SHORT, content: `${JSON.stringify(FIXTURE, null, 2)}\n` });
  seed(host, { folder: `${MODULE}/pool/l1/web`, shortName: 'needs', content: NEEDS });
  seed(host, { level: 1, folder: `${MODULE}/pipeline`, shortName: 'pipeline', content: '{}\n' });
  seed(host, { folder: `${MODULE}/pool/l2/web`, shortName: 'backend', content: '' });
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: `${poolStamp(AT)}_mensalidadesAcademia-20260920103000_1`,
    content: '',
  });
  seedOntology(host);
  seedAgentFiles(host);
}

function agentMeta(): IAgentMeta {
  return {
    agentName: 'agentPlannerL1',
    agentProject: 102021,
    agentFolder: 'agentPlannerL1',
    agentDescription: 'test',
    visibility: 'public',
  };
}

function contextWith(steps: mls.msg.AIPayload[] = []): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: `plan l1 ${MODULE}`,
    status: 'waiting_human_input',
    nextSteps: steps,
    agentName: 'agentPlannerL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '', senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: { moduleName: MODULE } } },
  } as unknown as mls.msg.ExecutionContext;
}

function planStep(): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 20,
    interaction: null,
    stepTitle: 'Plan',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL1',
    prompt: JSON.stringify({ planId: 'plan20', moduleName: MODULE, thread: 'mensalidadesAcademia-20260920103000', file: DISPLAY }),
    rags: [],
    planning: { planId: 'plan20', dependsOn: ['entry10-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

async function seedPipeline(host: Host): Promise<void> {
  seedReady(host);
  const entry = await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in entry, false);
}

void test('plan20 has prompt.md', () => {
  assert.equal(existsSync(path.join(HERE, 'prompt.md')), true);
});

void test('createAgent registers plan20 on the dispatch table', () => {
  createAgent();
  assert.equal(P1_STEP_HOOKS.plan20?.beforePromptStep, beforeP1PlanPromptStep);
});

void test('execute writes backend.json, one l1→l2 message, delivered trace, and does not delete the pool', async () => {
  const host = installHost();
  await seedPipeline(host);
  const result = await executeP1Plan(MODULE, AT);
  const written = JSON.parse(host.files[keyOf(p1BackendFile(MODULE))].content) as P1BackendFile;
  assert.equal(written.schemaVersion, '2026-09-21-p1-backend-v1');
  assert.equal(written.meta.llmCalled, false);
  assert.ok(written.usecases.every(item => item.status === 'toCreate'));
  assert.equal(result.backendPath, `l4/${MODULE}/pool/l2/web/backend.json`);

  const message = JSON.parse(host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`,
    shortName: `${poolStamp(AT)}_mensalidadesAcademia-20260920103000_1`, extension: '.json',
  })].content) as PoolMessage;
  assert.equal(message.from, 'l1');
  assert.equal(message.to, 'l2');
  assert.equal(message.subject, 'backend plan of mensalidadesAcademia (web)');
  assert.deepEqual(message.artifacts, ['pool/l2/web/backend.json']);
  assert.equal(message.round, 1);

  const trace = await readPoolTraceAt(p1PipelineFile(MODULE));
  assert.equal(trace.length, 1);
  assert.equal(trace[0].outcome, 'delivered');
  assert.equal(trace[0].to, 'l2');
  assert.equal(host.deleted.some(item => item.includes('pool/')), false);
  const incoming = host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l1`, shortName: SHORT, extension: '.json',
  })];
  assert.ok(incoming);
  assert.notEqual(incoming.status, 'deleted');
  assert.ok(incoming.content.includes('"to": "l1"'));
});

void test('beforePromptStep approves plan20 without LLM when nothing is unresolved and closes the pipeline', async () => {
  const host = installHost();
  await seedPipeline(host);
  const step = planStep();
  const intents = await beforeP1PlanPromptStep(agentMeta(), contextWith([step]), step, step, 1);
  assert.equal(intents.some(intent => intent.type === 'prompt_ready'), false);
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus | undefined;
  assert.equal(status?.status, 'completed', status?.traceMsg);
  assert.ok(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'plan20-done'));
  const pipeline = JSON.parse(host.files[keyOf(p1PipelineFile(MODULE))].content) as {
    status: string;
    steps: { plan20: { status: string } };
  };
  assert.equal(pipeline.steps.plan20.status, 'approved');
  assert.equal(pipeline.status, 'complete');
});

void test('afterPromptStep schedules repair when the resolution fails the gate', async () => {
  const host = installHost();
  await seedPipeline(host);
  const step = planStep();
  step.interaction = {
    payload: [{
      type: 'flexible',
      result: {
        schemaVersion: '2026-09-21-p1-backend-v1',
        moduleName: MODULE,
        device: 'web',
        sourceNeeds: 'pool/l1/web/needs.json',
        inventoryPresent: false,
        endpoints: [{ route: 'not-a-route', page: 'mensalidades_pagamentos', kind: 'qry', usecaseRef: 'listMensalidade', status: 'toCreate' }],
        usecases: [{ usecaseId: 'listMensalidade', entity: 'Mensalidade', operation: 'list', ports: ['Mensalidade'], status: 'toCreate', existing: '', reason: 'no l1 usecase for Mensalidade.list' }],
        ports: [],
        tables: [],
        removed: [],
        meta: { pages: { mensalidades_pagamentos: ['not-a-route'] }, generatedAt: AT.toISOString(), llmCalled: true },
      },
    }],
  } as unknown as mls.msg.AIInteraction;
  const intents = await afterP1PlanPromptStep(agentMeta(), contextWith([step]), step, step, 1);
  const repair = intents.find(intent => intent.type === 'add-step') as mls.msg.AgentIntentAddStep | undefined;
  assert.ok(repair, JSON.stringify(intents.map(item => item.type)));
  assert.equal(repair?.step.planning?.planId, 'plan20-repair-1');
});
