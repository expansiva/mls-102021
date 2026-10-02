/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/agentP1Plan.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolveFixtureFile } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentPlannerL1/agentPlannerL1.js';
import { executeP1Entry, p1BackendFile, p1PipelineFile } from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';
import { moduleFolder } from '/_102035_/l2/solution/fs.js';
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

function seedOntology(host: Host, moduleRoot = MODULE): void {
  const root = path.join(HERE, 'fixtures/ontology');
  seed(host, { folder: `${moduleRoot}/ontology`, shortName: 'index', extension: '.defs.ts', content: readFileSync(path.join(root, 'index.defs.ts'), 'utf8') });
  seed(host, { folder: `${moduleRoot}/ontology`, shortName: 'Mensalidade', extension: '.defs.ts', content: readFileSync(resolveFixtureFile(path.join(root, 'Mensalidade.defs.ts')), 'utf8') });
  seed(host, { folder: `${moduleRoot}/ontology`, shortName: 'Pagamento', extension: '.defs.ts', content: readFileSync(resolveFixtureFile(path.join(root, 'Pagamento.defs.ts')), 'utf8') });
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
  seed(host, { level: 1, folder: `${MODULE}/pipeline/agentDefsL1`, shortName: 'input20', content: '"d1-checkpoint"\n' });
  seed(host, { level: 2, folder: `${MODULE}/web`, shortName: 'page', extension: '.defs.ts', content: '"l2-page"\n' });
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

function l1l2Snapshot(host: Host): string {
  return Object.values(host.files)
    .filter(file => file.level === 1 || file.level === 2)
    .filter(file => file.project === PROJECT)
    .map(file => `l${file.level}/${file.folder}/${file.shortName}${file.extension}\0${file.status}\0${file.content}`)
    .sort()
    .join('\n');
}

function poolFile(host: Host, box: string, shortName: string): Stored | undefined {
  return host.files[keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/${box}`, shortName, extension: '.json' })];
}

function l2Messages(host: Host): string[] {
  return Object.values(host.files)
    .filter(file => file.level === 4 && file.folder === `${MODULE}/pool/l2` && file.status !== 'deleted' && /^\d{14}_/.test(file.shortName))
    .map(file => file.shortName);
}

void test('estimate writes backend.json and one l1→l2 message, traces, then deletes the consumed message; l1 and l2 byte-identical', async () => {
  const host = installHost();
  seedReady(host);
  const before = l1l2Snapshot(host);
  const entry = await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in entry, false);
  const result = await executeP1Plan(MODULE, AT);
  const written = JSON.parse(host.files[keyOf(p1BackendFile(MODULE))].content) as P1BackendFile;
  assert.equal(written.schemaVersion, '2026-09-21-p1-backend-v1.2');
  assert.equal(written.meta.llmCalled, false);
  assert.ok(written.usecases.every(item => item.status === 'toCreate'));
  assert.deepEqual(written.changes, []);
  assert.deepEqual(written.meta.unmappedChanges, []);
  assert.ok(written.usecases.every(item => item.noTable === 'ok' || item.noTable === 'mdm' || item.noTable === 'none'));
  assert.ok(written.tables.every(item => item.noTable === 'ok' && item.tableRefs[0] === item.tableId));
  assert.equal(result.backendPath, `l4/${MODULE}/pool/l2/web/backend.json`);

  const message = JSON.parse(poolFile(host, 'l2', `${poolStamp(AT)}_mensalidadesAcademia-20260920103000_1`)!.content) as PoolMessage;
  assert.equal(message.from, 'l1');
  assert.equal(message.to, 'l2');
  assert.equal(message.mode, 'estimate');
  assert.equal(message.subject, 'backend plan of mensalidadesAcademia (web)');
  assert.deepEqual(message.artifacts, ['pool/l2/web/backend.json']);
  assert.equal(message.round, 1);

  assert.equal(p1PipelineFile(MODULE).folder, `${MODULE}/pool/l1`);
  assert.equal(p1PipelineFile(MODULE).level, 4);
  const trace = await readPoolTraceAt(p1PipelineFile(MODULE));
  assert.deepEqual(trace.map(line => line.outcome), ['delivered', 'processed']);
  assert.equal(trace[0].to, 'l2');
  assert.equal(trace[1].file, DISPLAY);
  assert.ok(trace.every(line => line.mode === 'estimate'));
  assert.equal(poolFile(host, 'l1', SHORT)?.status, 'deleted');
  assert.deepEqual(host.deleted, [`${MODULE}/pool/l1/${SHORT}`]);
  const pipeline = JSON.parse(host.files[keyOf(p1PipelineFile(MODULE))].content) as { status: string };
  assert.equal(pipeline.status, 'complete');
  assert.notEqual(poolFile(host, 'l1', 'pipeline')?.status, 'deleted');
  assert.equal(l1l2Snapshot(host), before);
});

void test('estimate reads access.defs.ts actors into testSupport and still writes nothing under l1 or l2', async () => {
  const host = installHost();
  seedReady(host);
  seed(host, {
    folder: MODULE, shortName: 'access', extension: '.defs.ts',
    content: `export const access = ${JSON.stringify({ schemaVersion: '2026-09-12-ns5-access-v3', moduleName: MODULE, actors: [{ actorId: 'recepcao', personEntity: '' }], grants: [] }, null, 2)} as const;\n`,
  });
  const before = l1l2Snapshot(host);
  const entry = await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in entry, false);
  await executeP1Plan(MODULE, AT);
  const written = JSON.parse(host.files[keyOf(p1BackendFile(MODULE))].content) as P1BackendFile;
  const identity = written.testSupport.find(item => item.id === 'identity:recepcao');
  assert.ok(identity);
  assert.ok(identity.sourceRefs.includes('access:actors/recepcao'));
  assert.match(identity.gap, /^PERSON_ENTITY_UNDECLARED: /);
  assert.ok(written.testSupport.every(item => item.executorRef === '' && item.gap));
  assert.deepEqual(written.testSupport.filter(item => item.owner === 'L1').map(item => item.id), written.tables.map(table => `data:${table.entity}`));
  assert.equal(l1l2Snapshot(host), before);
});

void test('a duplicate is consumed with the request: processed trace, listed in supersededMessages, then deleted', async () => {
  const host = installHost();
  seedReady(host);
  const dup = '20260920120000_mensalidadesAcademia-20260920103000_1';
  seed(host, { folder: `${MODULE}/pool/l1`, shortName: dup, content: `${JSON.stringify(FIXTURE, null, 2)}\n` });
  await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  await executeP1Plan(MODULE, AT);
  const pipeline = JSON.parse(host.files[keyOf(p1PipelineFile(MODULE))].content) as { supersededMessages?: string[]; messageFile: string };
  assert.equal(pipeline.messageFile, DISPLAY);
  assert.deepEqual(pipeline.supersededMessages, [`l4/${MODULE}/pool/l1/${dup}.json`]);
  const trace = await readPoolTraceAt(p1PipelineFile(MODULE));
  assert.deepEqual(trace.filter(line => line.outcome === 'processed').map(line => line.file), [DISPLAY, `l4/${MODULE}/pool/l1/${dup}.json`]);
  assert.equal(poolFile(host, 'l1', SHORT)?.status, 'deleted');
  assert.equal(poolFile(host, 'l1', dup)?.status, 'deleted');
  assert.equal(l2Messages(host).length, 1);
});

void test('two threads in the box at entry are one request: the oldest is processed, the newer is superseded and deleted', async () => {
  const host = installHost();
  seedReady(host);
  const newer = '20260920120000_mensalidadesAcademia-20260920120000_1';
  seed(host, { folder: `${MODULE}/pool/l1`, shortName: newer, content: `${JSON.stringify({ ...FIXTURE, thread: 'mensalidadesAcademia-20260920120000' }, null, 2)}\n` });
  await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  const result = await executeP1Plan(MODULE, AT);
  assert.equal(result.message.thread, 'mensalidadesAcademia-20260920103000');
  const pipeline = JSON.parse(host.files[keyOf(p1PipelineFile(MODULE))].content) as { supersededMessages?: string[] };
  assert.deepEqual(pipeline.supersededMessages, [`l4/${MODULE}/pool/l1/${newer}.json`]);
  assert.equal(poolFile(host, 'l1', SHORT)?.status, 'deleted');
  assert.equal(poolFile(host, 'l1', newer)?.status, 'deleted');
});

void test('only messages read at entry are consumed: another thread arriving mid-run and an implement stay in the box', async () => {
  const host = installHost();
  seedReady(host);
  const implementShort = '20260920110000_mensalidadesAcademia-20260920110000_1';
  seed(host, { folder: `${MODULE}/pool/l1`, shortName: implementShort, content: `${JSON.stringify({ ...FIXTURE, mode: 'implement', thread: 'mensalidadesAcademia-20260920110000' }, null, 2)}\n` });
  await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  const lateShort = '20260920130000_mensalidadesAcademia-20260920130000_1';
  seed(host, { folder: `${MODULE}/pool/l1`, shortName: lateShort, content: `${JSON.stringify({ ...FIXTURE, thread: 'mensalidadesAcademia-20260920130000' }, null, 2)}\n` });
  await executeP1Plan(MODULE, AT);
  assert.equal(poolFile(host, 'l1', SHORT)?.status, 'deleted');
  assert.equal(poolFile(host, 'l1', lateShort)?.status, 'changed');
  assert.equal(poolFile(host, 'l1', implementShort)?.status, 'changed');
  assert.deepEqual(host.deleted, [`${MODULE}/pool/l1/${SHORT}`]);
});

void test('failure between trace and delete keeps the message; re-entry finishes the delete without a second l1→l2 message', async () => {
  const host = installHost();
  seedReady(host);
  await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  const stor = (globalThis as unknown as { mls: { stor: { localStor: { deleteFile: (file: Stored) => void } } } }).mls.stor.localStor;
  const realDelete = stor.deleteFile;
  stor.deleteFile = () => { throw new Error('disk gone'); };
  await assert.rejects(() => executeP1Plan(MODULE, AT), /disk gone/);
  stor.deleteFile = realDelete;
  assert.equal(poolFile(host, 'l1', SHORT)?.status, 'changed');
  const traced = await readPoolTraceAt(p1PipelineFile(MODULE));
  assert.deepEqual(traced.map(line => line.outcome), ['delivered', 'processed']);
  assert.equal(l2Messages(host).length, 1);

  const again = await executeP1Entry({ kind: 'hand', moduleName: MODULE }, new Date(Date.UTC(2026, 8, 20, 11, 0, 0)));
  assert.equal('refusal' in again && again.refusal, `nothing pending for ${MODULE} in pool/l1`);
  assert.equal(poolFile(host, 'l1', SHORT)?.status, 'deleted');
  assert.equal(l2Messages(host).length, 1);
  const trace = await readPoolTraceAt(p1PipelineFile(MODULE));
  assert.deepEqual(trace.map(line => line.outcome), ['delivered', 'processed']);
});

void test('a gate failure before the trace keeps the message in pool/l1', async () => {
  const host = installHost();
  seedReady(host);
  await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  host.files[keyOf(p1NeedsFileFor())].content = '{"schemaVersion":"unknown"}\n';
  await assert.rejects(() => executeP1Plan(MODULE, AT));
  assert.equal(poolFile(host, 'l1', SHORT)?.status, 'changed');
  assert.deepEqual(host.deleted, []);
});

void test('a round-3 estimate gets a round-3 reply: the planner never increments the round', async () => {
  const host = installHost();
  seedReady(host);
  const short3 = '20260920103000_mensalidadesAcademia-20260920103000_3';
  host.files[keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l1`, shortName: SHORT, extension: '.json' })].status = 'deleted';
  seed(host, { folder: `${MODULE}/pool/l1`, shortName: short3, content: `${JSON.stringify({ ...FIXTURE, round: 3 }, null, 2)}\n` });
  seed(host, { folder: `${MODULE}/pool/l2`, shortName: `${poolStamp(AT)}_mensalidadesAcademia-20260920103000_3`, content: '' });
  await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  const result = await executeP1Plan(MODULE, AT);
  assert.equal(result.message.round, 3);
  assert.equal(result.message.mode, 'estimate');
  assert.equal(poolFile(host, 'l1', short3)?.status, 'deleted');
});

function p1NeedsFileFor() {
  return { project: PROJECT, level: 4, folder: `${MODULE}/pool/l1/web`, shortName: 'needs', extension: '.json' };
}

void test('execute under /candidate writes pool/l2 in the override, reads candidate l4diff, leaves canonical l4 untouched', async () => {
  const host = installHost();
  const candidate = `${MODULE}/tobe/plan`;
  const marker = 'CANONICAL-l4-must-not-move';
  seed(host, { folder: `${MODULE}/pipeline`, shortName: 'pipeline', content: L4_COMPLETE });
  seed(host, { folder: MODULE, shortName: 'module', extension: '.defs.ts', content: marker });
  seed(host, { folder: `${MODULE}/pool/l1/web`, shortName: 'needs', content: '"canonical-needs"\n' });
  seed(host, { folder: `${candidate}/pipeline`, shortName: 'pipeline', content: L4_COMPLETE });
  seed(host, { folder: `${candidate}/pool/l1`, shortName: SHORT, content: `${JSON.stringify(FIXTURE, null, 2)}\n` });
  seed(host, { folder: `${candidate}/pool/l1/web`, shortName: 'needs', content: NEEDS });
  seed(host, { folder: `${candidate}/pool/l1/web`, shortName: 'l4diff', content: readFileSync(path.join(HERE, 'fixtures/l4diff-mensalidadesAcademia.json'), 'utf8') });
  seed(host, { level: 1, folder: `${candidate}/pipeline`, shortName: 'pipeline', content: '{}\n' });
  seed(host, { folder: `${candidate}/pool/l2/web`, shortName: 'backend', content: '' });
  seedOntology(host, candidate);
  seedAgentFiles(host);

  const before = Object.values(host.files)
    .filter(file => file.level === 4 && (file.folder === MODULE || (file.folder.startsWith(`${MODULE}/`) && !file.folder.startsWith(`${MODULE}/tobe/`))))
    .map(file => `${file.folder}/${file.shortName}${file.extension}\0${file.status}\0${file.content}`)
    .sort()
    .join('\n');

  const entry = await executeP1Entry({ kind: 'hand', moduleName: MODULE, candidate }, AT);
  assert.equal('refusal' in entry, false);
  const result = await executeP1Plan(MODULE, AT);
  assert.equal(moduleFolder(MODULE), candidate);
  assert.equal(p1BackendFile(MODULE).folder, `${candidate}/pool/l2/web`);
  assert.equal(result.backendPath, `l4/${candidate}/pool/l2/web/backend.json`);
  const written = JSON.parse(host.files[keyOf(p1BackendFile(MODULE))].content) as P1BackendFile;
  assert.equal(written.changes.length, 3);
  assert.deepEqual(written.meta.unmappedChanges, []);
  assert.equal(
    host.files[keyOf({ project: PROJECT, level: 4, folder: MODULE, shortName: 'module', extension: '.defs.ts' })].content,
    marker,
  );
  const canonicalBackend = host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l2/web`, shortName: 'backend', extension: '.json',
  })];
  assert.equal(canonicalBackend, undefined);
  const after = Object.values(host.files)
    .filter(file => file.level === 4 && (file.folder === MODULE || (file.folder.startsWith(`${MODULE}/`) && !file.folder.startsWith(`${MODULE}/tobe/`))))
    .map(file => `${file.folder}/${file.shortName}${file.extension}\0${file.status}\0${file.content}`)
    .sort()
    .join('\n');
  assert.equal(after, before);
});

void test('execute with pool/l1/web/l4diff.json fills changes[]', async () => {
  const host = installHost();
  await seedPipeline(host);
  seed(host, {
    folder: `${MODULE}/pool/l1/web`,
    shortName: 'l4diff',
    content: readFileSync(path.join(HERE, 'fixtures/l4diff-mensalidadesAcademia.json'), 'utf8'),
  });
  await executeP1Plan(MODULE, AT);
  const written = JSON.parse(host.files[keyOf(p1BackendFile(MODULE))].content) as P1BackendFile;
  assert.equal(written.changes.length, 3);
  assert.ok(written.changes.some(item => item.changeId === 'field:Mensalidade.desconto' && item.tableRefs.includes('mensalidade')));
  assert.ok(written.changes.some(item => item.changeId === 'rule:globalLateFee' && item.noTable === 'none'));
  const grant = written.changes.find(item => item.changeId === 'grant:recepcao-financeiro');
  assert.deepEqual(grant?.tableRefs, ['mensalidade', 'pagamento']);
  assert.deepEqual(written.meta.unmappedChanges, []);
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
