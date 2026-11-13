/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_USECASES_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelDispatcherAgent, modelWorkerAgent, type M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { fileRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { parseM12WorkerArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Worker.js';
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
