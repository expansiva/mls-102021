/// <mls fileReference="_102021_/l2/agentPlannerL1/helpers/p1Core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { normalizePoolMessage } from '/_102035_/l2/solution/pool.js';
import {
  P1_FLOW_STEP_IDS,
  P1_NEEDS_SCHEMA,
  P1_STEP_DEPENDS_ON,
  buildP1PlannedSteps,
  executeP1Entry,
  isP1PoolMessageFile,
  loadP1Entry,
  markP1Complete,
  moduleTokenOk,
  ownerStepId,
  parseP1Invocation,
  parseP1StepPrompt,
  p1DifferentRequestsRefusal,
  p1InvocationRefusal,
  p1NeedsFile,
  p1PipelineFile,
  type P1PipelineState,
} from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(
  path.join(HERE, '../steps/entry10/fixtures/pool-l1-mensalidadesAcademia.json'),
  'utf8',
)) as Record<string, unknown>;
const NEEDS = JSON.parse(readFileSync(
  path.join(HERE, '../steps/entry10/fixtures/needs-mensalidadesAcademia.json'),
  'utf8',
)) as Record<string, unknown>;

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

function seed(host: Host, folder: string, shortName: string, content = '', level = 4, extension = '.json'): Stored {
  const file: Stored = {
    project: PROJECT, level, folder, shortName, extension,
    status: 'changed', versionRef: '1', content,
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

function seedReady(host: Host, message: unknown = FIXTURE, extraShort?: string): void {
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${MODULE}/pool/l1`, SHORT, `${JSON.stringify(message, null, 2)}\n`);
  if (extraShort) seed(host, `${MODULE}/pool/l1`, extraShort, `${JSON.stringify(message, null, 2)}\n`);
  seed(host, `${MODULE}/pool/l1/web`, 'needs', `${JSON.stringify(NEEDS, null, 2)}\n`);
  seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 1);
}

void test('parseP1Invocation reads the module token and strips the agent prefix', () => {
  assert.equal(parseP1Invocation('@@agentPlannerL1 mensalidadesAcademia').module, MODULE);
  assert.equal(parseP1Invocation('mensalidadesAcademia').module, MODULE);
  assert.equal(parseP1Invocation('@@_102021_/l2/agentPlannerL1 mensalidadesAcademia').module, MODULE);
  assert.equal(parseP1Invocation('').module, '');
});

void test('p1InvocationRefusal refuses a missing or non-lowerCamel module', () => {
  assert.equal(p1InvocationRefusal({ module: MODULE }), '');
  assert.match(p1InvocationRefusal({ module: '' }), /Pass @@agentPlannerL1/);
  assert.match(p1InvocationRefusal({ module: 'MensalidadesAcademia' }), /lowerCamel/);
  assert.match(p1InvocationRefusal({ module: 'mensalidades-academia' }), /lowerCamel/);
});

void test('moduleTokenOk accepts lowerCamel only', () => {
  assert.equal(moduleTokenOk(MODULE), true);
  assert.equal(moduleTokenOk('stockControl'), true);
  assert.equal(moduleTokenOk('MensalidadesAcademia'), false);
  assert.equal(moduleTokenOk(''), false);
});

void test('planned tree is two sequential steps with entry10 first', () => {
  const steps = buildP1PlannedSteps(MODULE, { thread: 'mensalidadesAcademia-20260920103000', file: DISPLAY });
  assert.equal(steps.length, 2);
  assert.deepEqual(steps.map(step => step.planning?.planId), [...P1_FLOW_STEP_IDS]);
  assert.equal(steps[0].status, 'waiting_human_input');
  assert.deepEqual(steps[0].planning?.dependsOn, []);
  for (const step of steps.slice(1)) {
    assert.equal(step.status, 'waiting_dependency');
    assert.equal(step.agentName, 'agentPlannerL1');
  }
  assert.deepEqual(steps.find(step => step.planning?.planId === 'plan20')?.planning?.dependsOn, [...P1_STEP_DEPENDS_ON.plan20]);
});

void test('ownerStepId maps pool dispatch prompt to entry10 and ignores done-anchors', () => {
  const l4Prompt = JSON.stringify({ moduleName: MODULE, thread: 't-20260920103000', file: DISPLAY });
  assert.equal(ownerStepId('entry10'), 'entry10');
  assert.equal(ownerStepId('entry10-done'), '');
  assert.equal(ownerStepId('entry10-done', l4Prompt), '');
  assert.equal(ownerStepId('plan20-repair-1'), 'plan20');
  assert.equal(ownerStepId('', l4Prompt), 'entry10');
  assert.equal(ownerStepId('', JSON.stringify({ moduleName: MODULE })), '');
});

void test('parseP1StepPrompt distinguishes pool dispatch from a planned entry10', () => {
  assert.deepEqual(
    parseP1StepPrompt(JSON.stringify({ moduleName: MODULE, thread: 'mensalidadesAcademia-20260920103000', file: DISPLAY })),
    { kind: 'step', moduleName: MODULE, thread: 'mensalidadesAcademia-20260920103000', file: DISPLAY },
  );
  assert.deepEqual(parseP1StepPrompt(JSON.stringify({ planId: 'entry10', moduleName: MODULE })), { kind: 'entry', moduleName: MODULE });
  assert.equal(parseP1StepPrompt('not-json').kind, 'refusal');
});

void test('fixture of the pool/l1 message is a valid PoolMessage from l2 with needs.json', () => {
  const message = normalizePoolMessage(FIXTURE);
  assert.equal(message.from, 'l2');
  assert.equal(message.to, 'l1');
  assert.equal(message.thread, 'mensalidadesAcademia-20260920103000');
  assert.equal(message.round, 1);
  assert.equal(message.mode, 'implement');
  assert.deepEqual(message.artifacts, ['pool/l1/web/needs.json']);
  assert.equal(NEEDS.schemaVersion, P1_NEEDS_SCHEMA);
});

void test('loadP1Entry refuses when l4 is missing, not complete, or pool/l1 is empty', async () => {
  installHost();
  const missing = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in missing && missing.refusal, `Module "${MODULE}" has no complete l4.`);

  const host = installHost();
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE.replace('"complete"', '"inProgress"'));
  const incomplete = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in incomplete && incomplete.refusal, `Module "${MODULE}" has no complete l4.`);

  const empty = installHost();
  seed(empty, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  const pending = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in pending && pending.refusal, `nothing pending for ${MODULE} in pool/l1`);
});

void test('loadP1Entry refuses when needs.json is missing or the schema is unknown', async () => {
  const missingFile = installHost();
  seed(missingFile, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(missingFile, `${MODULE}/pool/l1`, SHORT, `${JSON.stringify(FIXTURE, null, 2)}\n`);
  const noFile = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in noFile && noFile.refusal, 'needs.json is missing');

  const unknown = installHost();
  seedReady(unknown);
  unknown.files[keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l1/web`, shortName: 'needs', extension: '.json' })].content
    = `${JSON.stringify({ ...NEEDS, schemaVersion: 'nope' }, null, 2)}\n`;
  const badSchema = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in badSchema && badSchema.refusal, 'needs.json schema is unknown');
});

void test('hand entry picks the oldest pool/l1 message by name', async () => {
  const host = installHost();
  seedReady(host, FIXTURE, '20260920120000_mensalidadesAcademia-20260920103000_1');
  const loaded = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in loaded, false);
  if ('refusal' in loaded) return;
  assert.equal(loaded.file.shortName, SHORT);
  assert.equal(loaded.message.thread, 'mensalidadesAcademia-20260920103000');
});

void test('hand entry and step entry converge on the same pipeline.json', async () => {
  const host = installHost();
  seedReady(host);
  const hand = await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in hand, false);
  if ('refusal' in hand) return;

  const l1Key = keyOf(p1PipelineFile(MODULE));
  delete host.files[l1Key];
  seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 1);

  const step = await executeP1Entry({
    kind: 'step',
    moduleName: MODULE,
    thread: 'mensalidadesAcademia-20260920103000',
    file: DISPLAY,
  }, AT);
  assert.equal('refusal' in step, false);
  if ('refusal' in step) return;

  assert.deepEqual(step.pipeline, hand.pipeline);
  assert.equal(step.pipeline.thread, 'mensalidadesAcademia-20260920103000');
  assert.equal(step.pipeline.round, 1);
  assert.equal(step.pipeline.messageFile, DISPLAY);
  assert.equal(step.pipeline.steps.entry10?.status, 'approved');
  assert.equal(step.pipeline.flowId, 'agentPlannerL1');
  assert.equal(step.pipeline.inventory.present, false);
  assert.equal(step.pipeline.needsFile, `l4/${MODULE}/pool/l1/web/needs.json`);
  assert.equal(JSON.parse(host.files[l1Key].content).thread, 'mensalidadesAcademia-20260920103000');
});

void test('identical pool/l1 messages are one request and sourceMessages lists both', async () => {
  const host = installHost();
  seedReady(host, FIXTURE, '20260920120000_mensalidadesAcademia-20260920103000_1');
  const loaded = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in loaded, false);
  if ('refusal' in loaded) return;
  assert.deepEqual(loaded.sourceMessages, [
    `${SHORT}.json`,
    '20260920120000_mensalidadesAcademia-20260920103000_1.json',
  ]);
});

void test('two different pool/l1 requests refuse with a clear message', async () => {
  const host = installHost();
  seedReady(host);
  const other = { ...FIXTURE, mode: 'estimate' };
  seed(host, `${MODULE}/pool/l1`, '20260920120000_mensalidadesAcademia-20260920103000_1', `${JSON.stringify(other, null, 2)}\n`);
  const loaded = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in loaded && loaded.refusal, p1DifferentRequestsRefusal(2));
  assert.match(String('refusal' in loaded ? loaded.refusal : ''), /pool\/l1 has 2 different requests; resolve with the l2 planner/);
});

void test('needs.json is not a pool message and an l4 message is not a needs request', async () => {
  assert.equal(isP1PoolMessageFile('needs'), false);
  assert.equal(isP1PoolMessageFile(SHORT), true);
  const host = installHost();
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${MODULE}/pool/l1/web`, 'needs', `${JSON.stringify(NEEDS, null, 2)}\n`);
  const pending = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in pending && pending.refusal, `nothing pending for ${MODULE} in pool/l1`);

  const fromL4 = installHost();
  seed(fromL4, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(fromL4, `${MODULE}/pool/l1`, SHORT, `${JSON.stringify({ ...FIXTURE, from: 'l4', artifacts: ['module.defs.ts'] }, null, 2)}\n`);
  const ignored = await loadP1Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in ignored && ignored.refusal, 'needs.json is missing');
});

void test('p1NeedsFile is pool/l1/web/needs.json', () => {
  installHost();
  assert.deepEqual(p1NeedsFile(MODULE), {
    project: PROJECT,
    level: 4,
    folder: `${MODULE}/pool/l1/web`,
    shortName: 'needs',
    extension: '.json',
  });
});

void test('re-execution wipes l1 pipeline drafts, keeps pool messages and l1 defs, rewrites pipeline.json', async () => {
  const host = installHost();
  seedReady(host);
  seed(host, `${MODULE}/pipeline`, 'plan20-draft', '{}\n', 1);
  seed(host, `${MODULE}/layer_2_application/usecases`, 'createMatricula', 'export const x = {};\n', 1, '.defs.ts');
  const poolKey = keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l1`, shortName: SHORT, extension: '.json' });
  const beforePool = host.files[poolKey].content;
  const first = await executeP1Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in first, false);
  if ('refusal' in first) return;
  const draftKey = keyOf({ project: PROJECT, level: 1, folder: `${MODULE}/pipeline`, shortName: 'plan20-draft', extension: '.json' });
  assert.equal(host.files[draftKey].status, 'deleted');
  const defsKey = keyOf({ project: PROJECT, level: 1, folder: `${MODULE}/layer_2_application/usecases`, shortName: 'createMatricula', extension: '.defs.ts' });
  assert.equal(host.files[defsKey].status, 'changed');
  assert.equal(host.files[poolKey].content, beforePool);
  assert.equal(host.files[poolKey].status, 'changed');
  assert.equal(first.pipeline.inventory.present, false);

  const later = new Date(Date.UTC(2026, 8, 21, 10, 0, 0));
  const second = await executeP1Entry({ kind: 'hand', moduleName: MODULE }, later);
  assert.equal('refusal' in second, false);
  if ('refusal' in second) return;
  const pipeline = JSON.parse(host.files[keyOf(p1PipelineFile(MODULE))].content) as {
    updatedAt: string; sourceMessages: string[]; steps: { entry10: { status: string } }; status: string; inventory: { present: boolean };
  };
  assert.equal(pipeline.updatedAt, later.toISOString());
  assert.deepEqual(pipeline.sourceMessages, [`${SHORT}.json`]);
  assert.equal(pipeline.steps.entry10.status, 'approved');
  assert.equal(pipeline.status, 'inProgress');
  assert.equal(pipeline.inventory.present, false);
  assert.equal(host.files[poolKey].content, beforePool);
});

void test('step entry refuses a thread that does not match the file', async () => {
  const host = installHost();
  seedReady(host);
  const result = await loadP1Entry({
    kind: 'step',
    moduleName: MODULE,
    thread: 'mensalidadesAcademia-19990101000000',
    file: DISPLAY,
  });
  assert.equal('refusal' in result && /thread does not match/.test(result.refusal), true);
});

function samplePipeline(extra: Partial<P1PipelineState> = {}): P1PipelineState {
  return {
    schemaVersion: '2026-09-20-p1-pipeline-v1',
    flowId: 'agentPlannerL1',
    moduleName: MODULE,
    status: 'inProgress',
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
    },
    thread: 'mensalidadesAcademia-20260920103000',
    round: 1,
    messageFile: DISPLAY,
    sourceMessages: [`${SHORT}.json`],
    needsFile: `l4/${MODULE}/pool/l1/web/needs.json`,
    inventory: { routes: [], usecases: [], ports: [], tables: [], present: false },
    updatedAt: AT.toISOString(),
    ...extra,
  };
}

void test('markP1Complete sets complete only when every flow.json step is approved', () => {
  const now = '2026-09-20T12:00:00.000Z';
  const onlyEntry = markP1Complete(samplePipeline(), now);
  assert.equal(onlyEntry.status, 'inProgress');
  assert.equal(onlyEntry.updatedAt, AT.toISOString());

  const both = markP1Complete(samplePipeline({
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
      plan20: { status: 'approved', updatedAt: now },
    },
  }), now);
  assert.equal(both.status, 'complete');
  assert.equal(both.awaitingStep, undefined);
  assert.equal(both.updatedAt, now);

  const failed = markP1Complete(samplePipeline({
    status: 'failed',
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
      plan20: { status: 'approved', updatedAt: now },
    },
  }), now);
  assert.equal(failed.status, 'failed');
});
