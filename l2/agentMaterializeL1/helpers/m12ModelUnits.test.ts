/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_USECASES_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelDispatcherAgent, modelWorkerAgent, type M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { readOptional, sha256Text, writeText, writeUnitStatus, type M12UnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { fileRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { parseM12WorkerArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Worker.js';
import { M12_REQUESTS_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { REQUEST_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/requests50/agentM12RequestService.js';
import { USECASE_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';

const PROJECT = 7;
const MODULE = 'modx';

interface FakeFile extends M12FileInfo {
  status: string;
  content: string;
  getContent(): Promise<string>;
  getValueInfo(): Promise<{ content: string }>;
  getOrCreateModel?: () => Promise<void>;
}

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function install(present: Array<{ info: M12FileInfo; content: string }>): void {
  const files: Record<string, FakeFile> = {};
  const put = (info: M12FileInfo, content: string, status = 'changed'): FakeFile => {
    const file: FakeFile = {
      ...info, status, content,
      getContent: async () => file.content,
      getValueInfo: async () => ({ content: file.content }),
    };
    files[keyOf(info)] = file;
    return file;
  };
  for (const item of present) put(item.info, item.content);
  const editor = {
    models: {} as Record<string, Record<string, unknown>>,
    getKeyModel: (project: number, shortName: string, folder: string, level: number) => `${project}_${level}_${folder}/${shortName}`,
    deleteModels: () => undefined,
  };
  const bindModel = (file: FakeFile): void => {
    const key = editor.getKeyModel(file.project, file.shortName, file.folder, file.level);
    if (!editor.models[key]) editor.models[key] = {};
    file.getOrCreateModel = async () => {
      editor.models[key].ts = {
        model: {
          getValue: () => file.content,
          setValue: (value: string) => { file.content = value; },
          uri: { toString: () => `mem://${key}` },
        },
        storFile: { project: file.project, level: file.level, folder: file.folder, shortName: file.shortName, extension: file.extension },
        compilerResults: { errors: [] as Array<{ messageText: string }>, prodDTS: true },
      };
    };
  };
  const putAndBind = (info: M12FileInfo, content: string, status = 'changed'): FakeFile => {
    const file = put(info, content, status);
    bindModel(file);
    return file;
  };
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    editor,
    l2: {
      typescript: {
        compile: async (model: { model: { getValue(): string }; compilerResults: { errors: Array<{ messageText: string }> } }) => {
          const text = model.model.getValue();
          model.compilerResults.errors = text.includes('FORCE_COMPILE_ERROR') ? [{ messageText: 'forced compile error' }] : [];
        },
      },
    },
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => {
        const key = keyOf(info);
        if (!files[key]) putAndBind(info, '', 'new');
        return files[key];
      },
      localStor: {
        setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; },
      },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
  for (const file of Object.values(files)) bindModel(file);
}

function defSource(body: unknown): string {
  return `export const definition = ${JSON.stringify(body)} as const;\n`;
}

const usecaseDef: M12FileInfo = {
  project: PROJECT, level: 1, folder: `${MODULE}/layer_2_application/usecases`, shortName: 'openItem', extension: '.defs.ts',
};
const usecaseTs: M12FileInfo = { ...usecaseDef, extension: '.ts' };

const promptMd: M12FileInfo = { project: 102021, level: 2, folder: 'agentMaterializeL1/steps/usecases40', shortName: 'prompt', extension: '.md' };
const addendumMd: M12FileInfo = { ...promptMd, shortName: 'addendum' };

function seedDefs(previous?: string): void {
  install([
    {
      info: usecaseDef,
      content: defSource({
        schemaVersion: '2026-09-24-d1-definition-v2',
        artifactType: 'usecase',
        artifactId: 'openItem',
        moduleName: MODULE,
        status: 'generated',
        dependencies: [],
        data: { usecaseId: 'openItem', entityId: 'Item', operation: 'get', rulesApplied: [], effects: [] },
      }),
    },
    { info: promptMd, content: 'system rules\n' },
    { info: addendumMd, content: 'phase addendum\n' },
    ...(previous === undefined ? [] : [{ info: usecaseTs, content: previous }]),
  ]);
}

async function dispatch(): Promise<Array<Record<string, unknown>>> {
  const agent = modelDispatcherAgent(M12_USECASES_AGENT_NAME, 'test', USECASE_SPEC);
  const hook = agent.beforePromptStep!;
  const step = { stepId: 2, prompt: '' } as mls.msg.AIAgentStep;
  return hook(
    { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta,
    { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext,
    { stepId: 1 } as mls.msg.AIAgentStep,
    step,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }),
  ) as Promise<Array<Record<string, unknown>>>;
}

void test('a model unit whose .ts exists is not sent to the model', async () => {
  seedDefs();
  const files = (mls.stor.files as Record<string, FakeFile>);
  files[keyOf(usecaseTs)] = {
    ...usecaseTs, status: 'changed', content: 'export const openItem = 1;\n',
    getContent: async () => 'export const openItem = 1;\n',
    getValueInfo: async () => ({ content: 'export const openItem = 1;\n' }),
  };
  const intents = await dispatch();
  assert.equal(intents.some(item => item.type === 'add-step'), false);
  const receipt = Object.values(mls.stor.files as Record<string, FakeFile>).find(item => item.extension === '.json' && item.shortName === 'openItem');
  assert.equal(JSON.parse(receipt?.content ?? '{}').status, 'reused');
});

void test('a model unit whose .ts is absent is dispatched to a worker', async () => {
  seedDefs();
  const intents = await dispatch();
  const workers = intents.filter(item => item.type === 'add-step');
  assert.equal(workers.length, 1);
  assert.equal((workers[0].step as { agentName?: string }).agentName, 'agentM12UsecaseUnit');
  const step = workers[0].step as { prompt?: string; planning?: { planId?: string } };
  assert.equal(step.planning?.planId, 'usecases40-modx-openItem-1');
  assert.equal(JSON.parse(step.prompt ?? '{}').phase, undefined);
});

void test('parseM12WorkerArgs keeps phase only when it names a sequence phase', () => {
  const base = { project: PROJECT, module: MODULE, unitId: 'openItem', attempt: 1, force: false };
  assert.deepEqual(parseM12WorkerArgs(JSON.stringify(base), PROJECT), base);
  assert.equal(parseM12WorkerArgs(JSON.stringify({ ...base, phase: 'fn:resolverA' }), PROJECT).phase, 'fn:resolverA');
  assert.throws(() => parseM12WorkerArgs(JSON.stringify({ ...base, phase: 'middle' }), PROJECT), /M12_WORKER_ARGS_PHASE/);
});

const seen: string[] = [];

const SEQ: M12ModelLayerSpec = {
  ...USECASE_SPEC,
  workerAgentName: 'agentSeq',
  sequence: {
    phases: async () => ['skeleton', 'fn:a', 'fn:b'],
    promptAddendum: async ctx => (await ctx.read(fileRef(addendumMd))) ?? '',
    parameters: phase => ({ type: 'object', properties: { phase: { const: phase } } }),
    context: async (_ctx, _unit, phase, assembled, repair) => {
      seen.push(`${phase}|${assembled}|${repair ? 'repair' : 'fresh'}`);
      return `human ${phase}`;
    },
    apply: async (_ctx, _unit, phase, assembled, payload) => {
      const code = typeof payload.code === 'string' ? payload.code : '';
      if (code.includes('PROBLEM')) return { source: assembled, problems: [`problem in ${phase}`] };
      if (code.includes('FORCE_COMPILE_ERROR')) return { source: 'FORCE_COMPILE_ERROR\n', problems: [] };
      if (code.includes('GATE')) return { source: 'GATE\n', problems: [] };
      if (phase === 'final') return { source: code.endsWith('\n') ? code : `${code}\n`, problems: [] };
      const body = phase === 'skeleton' ? 'export const skeleton = 1;\n' : phase === 'fn:a' ? 'export const a = 1;\n' : 'export const b = 1;\n';
      return { source: `${assembled}${body}`, problems: [] };
    },
    finalProblems: async (_ctx, _unit, source) => (source.includes('GATE') ? ['empty body left'] : []),
  },
};

const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
const exec = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext;

function phaseArgs(phase: string, attempt: number): { project: number; module: string; unitId: string; attempt: number; force: boolean; phase: string } {
  return { project: PROJECT, module: MODULE, unitId: 'openItem', attempt, force: false, phase };
}

function outputFile(): FakeFile | undefined {
  return (mls.stor.files as Record<string, FakeFile>)[keyOf(usecaseTs)];
}

async function answer(code: string, phase: string, attempt: number): Promise<Array<Record<string, unknown>>> {
  const agent = modelWorkerAgent('seq', SEQ);
  const step = {
    stepId: 2,
    prompt: JSON.stringify(phaseArgs(phase, attempt)),
    interaction: { payload: [{ type: 'flexible', result: { toolName: USECASE_SPEC.toolName, arguments: { code, notApplicable: [] } } }] },
  } as mls.msg.AIAgentStep;
  await agent.beforePromptStep!(meta, exec, { stepId: 1 } as mls.msg.AIAgentStep, step, 0);
  return agent.afterPromptStep!(meta, exec, { stepId: 1 } as mls.msg.AIAgentStep, step, 0) as Promise<Array<Record<string, unknown>>>;
}

function nextWorker(intents: Array<Record<string, unknown>>): { phase?: string; attempt?: number; planId?: string } {
  const added = intents.find(item => item.type === 'add-step');
  const step = added?.step as { prompt?: string; planning?: { planId?: string } } | undefined;
  const args = JSON.parse(step?.prompt ?? '{}') as { phase?: string; attempt?: number };
  return { phase: args.phase, attempt: args.attempt, planId: step?.planning?.planId };
}

void test('a sequenced worker calls skeleton, then each function, and restores the real file between phases', async () => {
  seen.length = 0;
  seedDefs('export const previous = 1;\n');
  const dispatcher = modelDispatcherAgent('agentSeqPhase', 'test', SEQ);
  const opened = await dispatcher.beforePromptStep!(
    meta, exec, { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: true }),
  ) as Array<Record<string, unknown>>;
  const first = nextWorker(opened);
  assert.equal(first.phase, 'skeleton');
  assert.equal(first.attempt, 1);
  assert.equal(first.planId, 'usecases40-modx-openItem-skeleton-1');

  const afterSkeleton = await answer('ok', 'skeleton', 1);
  const toA = nextWorker(afterSkeleton);
  assert.equal(toA.phase, 'fn:a');
  assert.equal(toA.attempt, 1);
  assert.equal(toA.planId, 'usecases40-modx-openItem-fn:a-1');
  assert.notEqual(toA.planId, first.planId);
  assert.equal(outputFile()?.content, 'export const previous = 1;\n');

  const repaired = await answer('FORCE_COMPILE_ERROR', 'fn:a', 1);
  const again = nextWorker(repaired);
  assert.equal(again.phase, 'fn:a');
  assert.equal(again.attempt, 2);
  assert.equal(outputFile()?.content, 'export const previous = 1;\n');

  const afterA = await answer('ok', 'fn:a', 2);
  assert.equal(nextWorker(afterA).phase, 'fn:b');
  assert.equal(outputFile()?.content, 'export const previous = 1;\n');

  const afterB = await answer('ok', 'fn:b', 1);
  assert.equal(afterB.some(item => item.type === 'add-step'), false);
  assert.equal(outputFile()?.content, 'export const skeleton = 1;\nexport const a = 1;\nexport const b = 1;\n');
  assert.deepEqual(seen.map(item => item.split('|')[0]), ['skeleton', 'fn:a', 'fn:a', 'fn:b']);
  assert.equal(seen[2].endsWith('|repair'), true);
});

void test('a final gate problem schedules final and the approved file is the real output', async () => {
  seen.length = 0;
  seedDefs();
  await answer('ok', 'skeleton', 1);
  await answer('ok', 'fn:a', 1);
  const gated = await answer('GATE', 'fn:b', 1);
  const finalStep = nextWorker(gated);
  assert.equal(finalStep.phase, 'final');
  assert.equal(finalStep.attempt, 1);
  assert.equal(finalStep.planId, 'usecases40-modx-openItem-final-1');
  assert.equal(outputFile(), undefined);
  const agent = modelWorkerAgent('seq', SEQ);
  const step = { stepId: 2, prompt: JSON.stringify(phaseArgs('final', 1)), interaction: null } as mls.msg.AIAgentStep;
  const ready = await agent.beforePromptStep!(meta, exec, { stepId: 1 } as mls.msg.AIAgentStep, step, 0) as Array<{ systemPrompt?: string }>;
  assert.equal(seen.at(-1)?.startsWith('final|'), true);
  assert.equal(seen.at(-1)?.endsWith('|repair'), true);
  assert.equal(ready[0].systemPrompt?.includes('phase addendum'), true);
  const written = await answer('export const done = 1;', 'final', 1);
  assert.equal(written.some(item => item.type === 'add-step'), false);
  assert.equal(outputFile()?.content, 'export const done = 1;\n');
});

void test('d1_225: a request service whose routes only confirm an event is written by code: no worker, the file is on disk and the unit is done', async () => {
  const folder = `${MODULE}/layer_2_application/requests`;
  const defInfo: M12FileInfo = { project: PROJECT, level: 1, folder, shortName: 'repoHost', extension: '.defs.ts' };
  const l4 = (shortName: string, folder4: string): M12FileInfo => ({ project: PROJECT, level: 4, folder: folder4, shortName, extension: '.defs.ts' });
  install([
    {
      info: defInfo,
      content: defSource({
        schemaVersion: '2026-09-24-d1-definition-v2', artifactType: 'requestService', artifactId: 'repoHost', moduleName: MODULE, status: 'generated', dependencies: [],
        data: { pageId: 'repoHost', requests: [{ route: `${MODULE}.repoHost.changed`, kind: 'cmd', uses: [], transaction: 'single', output: [], params: [], rules: [], consumes: 'repoHost.changed' }] },
      }),
    },
    { info: { ...promptMd, folder: 'agentMaterializeL1/steps/requests50' }, content: 'system rules\n' },
    { info: { project: 102034, level: 1, folder: 'server/layer_2_controllers', shortName: 'contracts', extension: '.ts' }, content: 'export class AppError extends Error { constructor(public code: string, message: string, public statusCode: number) { super(message); } }\nexport interface RequestContext { data: unknown }\n' },
    { info: l4('integration', MODULE), content: `export const x = ${JSON.stringify({ inbound: [{ id: 'changed', kind: 'event', from: 'repoHost', event: 'changed', writes: [], effect: 'update', description: 'The repository changed.' }] })} as const;\n` },
    { info: l4('integration', 'repoHost'), content: `export const y = ${JSON.stringify({ outbound: [{ id: 'changed', kind: 'event', on: 'Change.create', to: 'any', description: 'A change arrived.' }] })} as const;\n` },
    { info: l4('Change', 'repoHost/ontology'), content: `export const c = ${JSON.stringify({ entityId: 'Change', fields: [{ id: 'details', type: 'object' }] })} as const;\n` },
  ]);
  const agent = modelDispatcherAgent(M12_REQUESTS_AGENT_NAME, 'test', REQUEST_SPEC);
  const intents = await agent.beforePromptStep!(
    { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta,
    { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext,
    { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }),
  ) as Array<Record<string, unknown>>;
  assert.equal(intents.some(item => item.type === 'add-step'), false, 'no worker is dispatched');
  const files = mls.stor.files as Record<string, FakeFile>;
  const output = files[keyOf({ project: PROJECT, level: 1, folder, shortName: 'repoHost', extension: '.ts' })];
  assert.ok(output, 'the request service is written');
  assert.match(output.content, /export const requests: \{ 'modx\.repoHost\.changed': \(input: RepoHostChangedMessage, ctx: RequestContext\) => Promise<\{ received: true \}> \} = \{/u);
  assert.equal(/usecases\//u.test(output.content), false);
  const receipt = Object.values(files).find(item => item.extension === '.json' && item.shortName === 'repoHost');
  assert.equal(JSON.parse(receipt?.content ?? '{}').status, 'done');
});

// d1_329: a target without "force" keeps a model unit whose only change is a dependency, or sends the file on disk to the repair.
const OPEN_SPEC: M12ModelLayerSpec = { ...USECASE_SPEC, gate: async () => [] };
const BY_TARGET = { target: fileRef(usecaseDef), force: true, scratch: false };
const KEPT_TEXT = 'export const openItem = 1;\n';

async function dispatchRun(run: Record<string, unknown>): Promise<Array<Record<string, unknown>>> {
  const agent = modelDispatcherAgent(M12_USECASES_AGENT_NAME, 'test', OPEN_SPEC);
  return agent.beforePromptStep!(meta, exec, { stepId: 1 } as mls.msg.AIAgentStep, { stepId: 2, prompt: '' } as mls.msg.AIAgentStep, 0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: '', target: '', force: false, ...run })) as Promise<Array<Record<string, unknown>>>;
}

function receiptFile(): FakeFile {
  return Object.values(mls.stor.files as Record<string, FakeFile>).find(item => item.extension === '.json' && item.shortName === 'openItem') as FakeFile;
}

/** A unit generated earlier: its output, and a receipt that says what it was made from. `change` moves one half of the receipt. */
async function seedReceipt(text: string, change: 'deps' | 'own' | 'none' | 'noParts'): Promise<void> {
  seedDefs(text);
  await writeText(usecaseTs, text);
  // The first reuse records the hash of now (a receipt of another test may hold an older one); the second finds it equal and stamps the halves.
  await dispatchRun({ scope: MODULE });
  await dispatchRun({ scope: MODULE });
  const receipt = JSON.parse(receiptFile().content) as Record<string, unknown> & { inputParts?: { own: string; deps: string } };
  assert.ok(receipt.inputParts, 'a reuse records the halves');
  const sha = await sha256Text(text);
  const next = { ...receipt, status: 'done', outputs: { [fileRef(usecaseTs)]: sha } };
  if (change === 'noParts') delete next.inputParts;
  else if (change === 'deps') next.inputParts = { own: receipt.inputParts.own, deps: 'old-deps' };
  else if (change === 'own') next.inputParts = { own: 'old-own', deps: receipt.inputParts.deps };
  const { schemaVersion: _version, updatedAt: _at, ...status } = next as unknown as M12UnitStatus;
  await writeUnitStatus(PROJECT, MODULE, status);
}

function workersOf(intents: Array<Record<string, unknown>>): Array<{ attempt?: number; phase?: string }> {
  return intents.filter(item => item.type === 'add-step').map(item => JSON.parse((item.step as { prompt?: string }).prompt ?? '{}') as { attempt?: number; phase?: string });
}

void test('d1_329: a target, only a dependency moved, the file compiles: it is kept and the receipt follows', async () => {
  await seedReceipt(KEPT_TEXT, 'deps');
  const intents = await dispatchRun(BY_TARGET);
  assert.deepEqual(workersOf(intents), []);
  const receipt = JSON.parse(receiptFile().content) as { status: string; inputParts: { deps: string } };
  assert.equal(receipt.status, 'reused');
  assert.notEqual(receipt.inputParts.deps, 'old-deps');
  assert.equal(await readOptional(usecaseTs), KEPT_TEXT);
});

void test('d1_329: a target, only a dependency moved, the file does not compile: the file goes to the repair', async () => {
  const broken = 'export const openItem = 1; // FORCE_COMPILE_ERROR\n';
  await seedReceipt(broken, 'deps');
  const intents = await dispatchRun(BY_TARGET);
  assert.deepEqual(workersOf(intents), [{ project: PROJECT, module: MODULE, unitId: 'openItem', attempt: 2, force: true }]);
  const receipt = JSON.parse(receiptFile().content) as { status: string; code: string; diagnostic: string };
  assert.equal(receipt.code, 'MODEL_REPAIR');
  assert.match(receipt.diagnostic, /forced compile error/u);
  const draft = Object.values(mls.stor.files as Record<string, FakeFile>).find(item => item.shortName === 'openItem_code');
  assert.equal(draft?.content, broken);
  assert.equal(await readOptional(usecaseTs), broken);
});

void test('d1_329: a target, the def side moved, no halves, or "force": true: generated as before', async () => {
  for (const change of ['own', 'noParts'] as const) {
    await seedReceipt(KEPT_TEXT, change);
    const workers = workersOf(await dispatchRun(BY_TARGET));
    assert.equal(workers.length, 1, change);
    assert.equal(workers[0].attempt, 1, change);
  }
  await seedReceipt(KEPT_TEXT, 'deps');
  const scratch = workersOf(await dispatchRun({ ...BY_TARGET, scratch: true }));
  assert.equal(scratch.length, 1, 'force');
  assert.equal(scratch[0].attempt, 1, 'force');
});

void test('d1_329: a run by scope reuses a unit with its file, as before', async () => {
  await seedReceipt(KEPT_TEXT, 'deps');
  assert.deepEqual(workersOf(await dispatchRun({ scope: MODULE })), []);
});

void test('d1_329: a reuse stamps the halves only when the hash did not move', async () => {
  seedDefs(KEPT_TEXT);
  await writeText(usecaseTs, KEPT_TEXT);
  await dispatchRun({ scope: MODULE });
  await dispatchRun({ scope: MODULE });
  const first = JSON.parse(receiptFile().content) as { inputHash: string; inputParts?: unknown };
  assert.ok(first.inputParts, 'no receipt yet: stamped');
  // A receipt of an older run (no halves) whose hash moved stays without halves: they would describe inputs it was not made from.
  const { schemaVersion: _v, updatedAt: _u, ...old } = { ...first, inputHash: 'sha256:old', layer: 'usecases', unitId: 'openItem', defRef: '', status: 'done', code: '', attempt: 1, diagnostic: '', outputs: {} } as unknown as M12UnitStatus;
  delete old.inputParts;
  await writeUnitStatus(PROJECT, MODULE, old);
  await dispatchRun({ scope: MODULE });
  assert.equal((JSON.parse(receiptFile().content) as { inputParts?: unknown }).inputParts, undefined);
  // The same receipt with the hash of now is stamped.
  await writeUnitStatus(PROJECT, MODULE, { ...old, inputHash: first.inputHash });
  await dispatchRun({ scope: MODULE });
  assert.ok((JSON.parse(receiptFile().content) as { inputParts?: unknown }).inputParts);
});

void test('d1_329: the stamp counts in dry, writes only the halves, only when the hash matches, and lists the rest', async () => {
  const { stampModule } = await import('/_102021_/l2/agentMaterializeL1/helpers/m12Stamp.js');
  const { parseM12MessageInvocation } = await import('/_102021_/l2/agentMaterializeL1/helpers/m12Core.js');
  assert.deepEqual(parseM12MessageInvocation('@@agentMaterializeL1 {"stamp":true,"scope":"telegram","dry":true}', PROJECT), { kind: 'stamp', project: PROJECT, scope: 'telegram', dry: true });
  assert.equal(parseM12MessageInvocation('@@agentMaterializeL1 {"stamp":true,"target":"x"}', PROJECT).kind, 'refusal');
  assert.equal(parseM12MessageInvocation('@@agentMaterializeL1 {"dry":true}', PROJECT).kind, 'refusal');
  await seedReceipt(KEPT_TEXT, 'noParts');
  const before = receiptFile().content;
  const matching = JSON.parse(before) as { inputHash: string };
  // The receipt now has the hash of the inputs of now and no halves: stampable. Dry changes nothing.
  assert.deepEqual(await stampModule(PROJECT, MODULE, MODULE, true), { stamped: 1, already: 0, noReceipt: 0, mismatch: [] });
  assert.equal(receiptFile().content, before);
  assert.deepEqual(await stampModule(PROJECT, MODULE, MODULE, false), { stamped: 1, already: 0, noReceipt: 0, mismatch: [] });
  const stamped = JSON.parse(receiptFile().content) as { inputHash: string; inputParts?: unknown; outputs: unknown; status: string };
  assert.ok(stamped.inputParts);
  assert.equal(stamped.inputHash, matching.inputHash);
  assert.deepEqual(stamped.outputs, (JSON.parse(before) as { outputs: unknown }).outputs);
  assert.deepEqual(await stampModule(PROJECT, MODULE, MODULE, false), { stamped: 0, already: 1, noReceipt: 0, mismatch: [] });
  // A receipt whose hash is not the hash of the inputs stays without halves and is listed.
  const { schemaVersion: _v, updatedAt: _u, ...old } = JSON.parse(receiptFile().content) as M12UnitStatus;
  delete old.inputParts;
  await writeUnitStatus(PROJECT, MODULE, { ...old, inputHash: 'sha256:old' });
  assert.deepEqual(await stampModule(PROJECT, MODULE, MODULE, false), { stamped: 0, already: 0, noReceipt: 0, mismatch: ['usecases/openItem'] });
  assert.equal((JSON.parse(receiptFile().content) as { inputParts?: unknown }).inputParts, undefined);
});
