/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/workflowSequence.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_USECASES_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { writeDraft } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { modelDispatcherAgent, modelWorkerAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { fileRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { USECASE_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { workflowRecoverName, workflowWakeHandlerName } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { WORKFLOW_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12WorkflowUnit.js';
import { loadWorkflowContext, workflowSequence } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';
import { notImplementedStub } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/sequence.js';

const savedMls = (globalThis as { mls?: unknown }).mls;
test.after(() => { (globalThis as { mls?: unknown }).mls = savedMls; });

const PROJECT = 7;
const MODULE = 'pedido';
const PROCESS = 'compra';

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

function install(present: Array<{ info: M12FileInfo; content: string }>): Record<string, FakeFile> {
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
        if (!files[key]) {
          const file = put(info, '', 'new');
          bindModel(file);
        }
        return files[key];
      },
      localStor: {
        setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; },
      },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
  for (const file of Object.values(files)) bindModel(file);
  return files;
}

function defSource(body: unknown): string {
  return `export const definition = ${JSON.stringify(body)} as const;\n`;
}

function md(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./${name}.md`, import.meta.url)), 'utf8');
}

const promptInfo = (shortName: string): M12FileInfo => ({
  project: 102021, level: 2, folder: 'agentMaterializeL1/steps/workflows45', shortName, extension: '.md',
});

const workflowDef: M12FileInfo = {
  project: PROJECT, level: 1, folder: `${MODULE}/layer_2_application/workflows`, shortName: PROCESS, extension: '.defs.ts',
};
const workflowTs: M12FileInfo = { ...workflowDef, extension: '.ts' };
const l4Info: M12FileInfo = { project: PROJECT, level: 4, folder: MODULE, shortName: 'workflows', extension: '.defs.ts' };

const TASKS = [
  { taskId: 'pedir', kind: 'human', title: 'Pedir', next: ['aprovar'], functionRef: 'registrarPedido' },
  { taskId: 'aprovar', kind: 'human', title: 'Aprovar', next: ['end'], functionRef: 'aprovarPedido' },
];

const L4_FUNCTIONS = [
  { functionId: 'resolverGerente', description: 'Decide o gerente sem gravar.' },
  { functionId: 'registrarPedido', description: 'Grava o pedido e chama resolverGerente.' },
  { functionId: 'aprovarPedido', description: 'Aprova o pedido já gravado.' },
];

function l4Source(): string {
  const process = { processId: PROCESS, tasks: TASKS, functions: L4_FUNCTIONS };
  return `export const workflows = ${JSON.stringify({ processes: [process] })} as const;\n`;
}

function processData(trigger: { kind: string; event?: string; schedule?: string }): Record<string, unknown> {
  return { processId: PROCESS, trigger, functions: ['resolverGerente', 'registrarPedido', 'aprovarPedido'], operations: [] };
}

function seed(trigger: { kind: string; event?: string; schedule?: string }, previous?: string): Record<string, FakeFile> {
  return install([
    {
      info: workflowDef,
      content: defSource({
        schemaVersion: '2026-09-24-d1-definition-v2',
        artifactType: 'workflowProcess',
        artifactId: PROCESS,
        moduleName: MODULE,
        status: 'generated',
        dependencies: [],
        data: processData(trigger),
      }),
    },
    { info: l4Info, content: l4Source() },
    { info: promptInfo('prompt'), content: md('prompt') },
    { info: promptInfo('promptSkeleton'), content: md('promptSkeleton') },
    { info: promptInfo('promptFunction'), content: md('promptFunction') },
    ...(previous === undefined ? [] : [{ info: workflowTs, content: previous }]),
  ]);
}

const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
const exec = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext;
const HEADER = `/// <mls fileReference="${fileRef(workflowTs)}" enhancement="_blank"/>`;

function phaseArgs(phase: string, attempt: number): { project: number; module: string; unitId: string; attempt: number; force: boolean; phase: string } {
  return { project: PROJECT, module: MODULE, unitId: PROCESS, attempt, force: true, phase };
}

function decl(name: string, pascal: string, body: string): string {
  return `export async function ${name}(input: ${pascal}Input, ctx: RequestContext): Promise<${pascal}Output> {\n  ${body}\n}\n`;
}

function skeleton(extra = ''): string {
  return [
    HEADER,
    decl('resolverGerente', 'ResolverGerente', notImplementedStub('resolverGerente')),
    decl('registrarPedido', 'RegistrarPedido', notImplementedStub('registrarPedido')),
    decl('aprovarPedido', 'AprovarPedido', notImplementedStub('aprovarPedido')),
    extra,
  ].filter(Boolean).join('\n');
}

function outputFile(): FakeFile | undefined {
  return (mls.stor.files as Record<string, FakeFile>)[keyOf(workflowTs)];
}

async function ready(phase: string, attempt: number): Promise<{ human: string; system: string }> {
  const agent = modelWorkerAgent('wf', WORKFLOW_SPEC);
  const step = { stepId: 2, prompt: JSON.stringify(phaseArgs(phase, attempt)), interaction: null } as mls.msg.AIAgentStep;
  const intents = await agent.beforePromptStep!(meta, exec, { stepId: 1 } as mls.msg.AIAgentStep, step, 0) as Array<{ humanPrompt?: string; systemPrompt?: string }>;
  return { human: intents[0]?.humanPrompt ?? '', system: intents[0]?.systemPrompt ?? '' };
}

async function answer(code: string, phase: string, attempt: number, extra?: Record<string, unknown>): Promise<Array<Record<string, unknown>>> {
  const agent = modelWorkerAgent('wf', WORKFLOW_SPEC);
  const step = {
    stepId: 2,
    prompt: JSON.stringify(phaseArgs(phase, attempt)),
    interaction: { payload: [{ type: 'flexible', result: { toolName: WORKFLOW_SPEC.toolName, arguments: { code, notApplicable: [], ...extra } } }] },
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

test('a process is written skeleton, then the resolver, then the steps', async () => {
  const previous = 'export const previous = 1;\n';
  seed({ kind: 'event', event: 'pedido' }, previous);
  const dispatcher = modelDispatcherAgent('agentM12Workflows', 'test', WORKFLOW_SPEC);
  const opened = await dispatcher.beforePromptStep!(
    meta, exec, { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: true }),
  ) as Array<Record<string, unknown>>;
  assert.equal(nextWorker(opened).phase, 'skeleton');
  assert.equal(nextWorker(opened).planId, 'workflows45-pedido-compra-skeleton-1');

  const skeletonPrompt = await ready('skeleton', 1);
  assert.match(skeletonPrompt.system, /This call writes the skeleton/);
  assert.match(skeletonPrompt.human, /resolverGerente/);
  assert.match(skeletonPrompt.human, /registrarPedido/);
  assert.match(skeletonPrompt.human, /aprovarPedido/);

  const afterSkeleton = await answer(skeleton(), 'skeleton', 1);
  assert.equal(nextWorker(afterSkeleton).phase, 'fn:resolverGerente');
  assert.equal(nextWorker(afterSkeleton).planId, 'workflows45-pedido-compra-fn:resolverGerente-1');
  assert.equal(outputFile()?.content, previous);

  const resolverBody = decl('resolverGerente', 'ResolverGerente', "return { gerenteId: 'g1' };");
  const afterResolver = await answer(resolverBody, 'fn:resolverGerente', 1);
  assert.equal(nextWorker(afterResolver).phase, 'fn:registrarPedido');
  assert.equal(outputFile()?.content, previous);

  const registrarPrompt = await ready('fn:registrarPedido', 1);
  assert.match(registrarPrompt.system, /This call writes one function/);
  assert.match(registrarPrompt.human, /Grava o pedido e chama resolverGerente/);
  assert.equal(registrarPrompt.human.includes('Aprova o pedido já gravado'), false);
  assert.equal(registrarPrompt.human.includes('Decide o gerente sem gravar'), false);
  assert.match(registrarPrompt.human, /return \{ gerenteId: 'g1' \}/);
  assert.equal(registrarPrompt.human.includes(notImplementedStub('aprovarPedido')), false);
  assert.match(registrarPrompt.human, /export async function aprovarPedido\(input: AprovarPedidoInput, ctx: RequestContext\): Promise<AprovarPedidoOutput> \{ … \}/);

  const repaired = await answer(`${decl('registrarPedido', 'RegistrarPedido', 'FORCE_COMPILE_ERROR;')}`, 'fn:registrarPedido', 1);
  const again = nextWorker(repaired);
  assert.equal(again.phase, 'fn:registrarPedido');
  assert.equal(again.attempt, 2);
  assert.equal(again.planId, 'workflows45-pedido-compra-fn:registrarPedido-2');
  assert.equal(outputFile()?.content, previous);

  const registrarBody = decl('registrarPedido', 'RegistrarPedido', "return { id: 'p1' };");
  const afterRegistrar = await answer(registrarBody, 'fn:registrarPedido', 2);
  assert.equal(nextWorker(afterRegistrar).phase, 'fn:aprovarPedido');

  const aprovarPrompt = await ready('fn:aprovarPedido', 1);
  assert.match(aprovarPrompt.human, /Aprova o pedido já gravado/);
  assert.equal(aprovarPrompt.human.includes('Grava o pedido e chama resolverGerente'), false);
  assert.equal(aprovarPrompt.human.includes("gerenteId: 'g1'"), false);
  assert.equal(aprovarPrompt.human.includes("id: 'p1'"), false);
  assert.match(aprovarPrompt.human, /export async function resolverGerente\(input: ResolverGerenteInput, ctx: RequestContext\): Promise<ResolverGerenteOutput> \{ … \}/);
  assert.match(aprovarPrompt.human, /export async function registrarPedido\(input: RegistrarPedidoInput, ctx: RequestContext\): Promise<RegistrarPedidoOutput> \{ … \}/);

  const done = await answer(decl('aprovarPedido', 'AprovarPedido', "return { ok: true };"), 'fn:aprovarPedido', 1);
  assert.equal(done.some(item => item.type === 'add-step'), false);
  assert.match(outputFile()?.content ?? '', /return \{ ok: true \}/);
  assert.equal((outputFile()?.content ?? '').includes(notImplementedStub('resolverGerente')), false);
});

test('a skeleton missing a function, or with a fixed export of the wrong form, is refused before the first function', async () => {
  seed({ kind: 'event', event: 'pedido' });
  const missing = await answer(skeleton().replace(decl('aprovarPedido', 'AprovarPedido', notImplementedStub('aprovarPedido')), ''), 'skeleton', 1);
  assert.equal(nextWorker(missing).phase, 'skeleton');
  assert.equal(nextWorker(missing).attempt, 2);
  assert.equal(outputFile(), undefined);

  seed({ kind: 'scheduled', schedule: 'Todo dia às 8h' });
  const wrongTick = [
    skeleton("evaluateSchedule(schedule, now, lastRun);\nexport async function onTick(): Promise<void> {\n  throw new AppError('NOT_IMPLEMENTED', 'onTick');\n}\n"),
  ].join('\n');
  const refused = await answer(wrongTick, 'skeleton', 1);
  assert.equal(nextWorker(refused).phase, 'skeleton');
  assert.equal(nextWorker(refused).attempt, 2);
  assert.equal(outputFile(), undefined);
});

test('a finished file that still has an empty body is refused', async () => {
  seed({ kind: 'event', event: 'pedido' });
  const assembled = [
    HEADER,
    decl('resolverGerente', 'ResolverGerente', notImplementedStub('resolverGerente')),
    decl('registrarPedido', 'RegistrarPedido', "return { id: 'p1' };"),
    decl('aprovarPedido', 'AprovarPedido', notImplementedStub('aprovarPedido')),
  ].join('\n');
  await writeDraft(PROJECT, MODULE, 'workflows', PROCESS, 'assembled', assembled);
  const gated = await answer(decl('aprovarPedido', 'AprovarPedido', "return { ok: true };"), 'fn:aprovarPedido', 1);
  const finalStep = nextWorker(gated);
  assert.equal(finalStep.phase, 'final');
  assert.equal(finalStep.attempt, 1);
  assert.equal(outputFile(), undefined);
  const still = await answer(assembled, 'final', 1);
  assert.equal(nextWorker(still).phase, 'final');
  assert.equal(nextWorker(still).attempt, 2);
  assert.equal(outputFile(), undefined);
});

test('a usecase layer still makes one call', async () => {
  assert.equal(USECASE_SPEC.sequence, undefined);
  const usecaseDef: M12FileInfo = {
    project: PROJECT, level: 1, folder: 'modx/layer_2_application/usecases', shortName: 'openItem', extension: '.defs.ts',
  };
  const promptMd: M12FileInfo = { project: 102021, level: 2, folder: 'agentMaterializeL1/steps/usecases40', shortName: 'prompt', extension: '.md' };
  install([
    {
      info: usecaseDef,
      content: defSource({
        schemaVersion: '2026-09-24-d1-definition-v2',
        artifactType: 'usecase',
        artifactId: 'openItem',
        moduleName: 'modx',
        status: 'generated',
        dependencies: [],
        data: { usecaseId: 'openItem', entityId: 'Item', operation: 'get', rulesApplied: [], effects: [] },
      }),
    },
    { info: promptMd, content: 'system rules\n' },
  ]);
  const dispatcher = modelDispatcherAgent(M12_USECASES_AGENT_NAME, 'test', USECASE_SPEC);
  const intents = await dispatcher.beforePromptStep!(
    meta, exec, { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    JSON.stringify({ project: PROJECT, module: 'modx', scope: 'modx', target: '', force: false }),
  ) as Array<Record<string, unknown>>;
  const workers = intents.filter(item => item.type === 'add-step');
  assert.equal(workers.length, 1);
  const step = workers[0].step as { prompt?: string; planning?: { planId?: string } };
  assert.equal(JSON.parse(step.prompt ?? '{}').phase, undefined);
  assert.equal(step.planning?.planId, 'usecases40-modx-openItem-1');
});

const OCCURRENCE = 'Nota';
const CITED = 'Item';
const BY_STEP = 'Parcela';

function ontologySource(entityId: string, title: string, marker: string): string {
  return `export const ontology = ${JSON.stringify({ entityId, title, lifecycleStates: ['open'], transitions: [], marker })} as const;\n`;
}

function entityUnit(entityId: string): M12Unit {
  const data = { entityId };
  return {
    unitId: entityId,
    defRef: '',
    outputRef: `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/${entityId}.ts`,
    output: '',
    definition: { artifactType: 'domainEntity', artifactId: entityId, moduleName: MODULE, dependencies: [], data },
    declared: { data },
  } as unknown as M12Unit;
}

function focusedUnit(tasks: unknown[], functions: unknown[], operations: Array<{ operation: string; steps: string[] }>, mdm = false): { unit: M12Unit; units: M12Unit[] } {
  const data = {
    processId: PROCESS,
    trigger: { kind: 'event', event: 'pedido' },
    occurrence: { entityId: OCCURRENCE },
    functions: ['resolverGerente', 'registrarPedido', 'aprovarPedido', workflowWakeHandlerName('cotar'), workflowRecoverName(PROCESS)],
    operations,
  };
  const unit = {
    unitId: PROCESS,
    definition: { artifactType: 'workflowProcess', artifactId: PROCESS, moduleName: MODULE, dependencies: [], data },
    declared: { data },
    outputRef: fileRef(workflowTs),
  } as unknown as M12Unit;
  const usecaseData = { entityId: OCCURRENCE, operation: 'criar', ...(mdm ? { mdm: { kept: true } } : {}) };
  const usecase = {
    unitId: 'criarNota',
    definition: { artifactType: 'usecase', artifactId: 'criarNota', moduleName: MODULE, dependencies: [], data: usecaseData },
    declared: { data: usecaseData },
    outputRef: '',
  } as unknown as M12Unit;
  const process = { processId: PROCESS, tasks, functions };
  const l4 = `export const workflows = ${JSON.stringify({ processes: [process] })} as const;\n`;
  const files: Record<string, string> = {
    [`_${PROJECT}_/l4/${MODULE}/workflows.defs.ts`]: l4,
    [`_${PROJECT}_/l4/${MODULE}/ontology/${OCCURRENCE}.defs.ts`]: ontologySource(OCCURRENCE, 'nota', 'OCC_FULL'),
    [`_${PROJECT}_/l4/${MODULE}/ontology/${CITED}.defs.ts`]: ontologySource(CITED, 'item', 'ITEM_FULL'),
    [`_${PROJECT}_/l4/${MODULE}/ontology/${BY_STEP}.defs.ts`]: ontologySource(BY_STEP, 'parcela', 'PARCELA_FULL'),
  };
  const units = [entityUnit(OCCURRENCE), entityUnit(CITED), entityUnit(BY_STEP), usecase];
  const ctx = {
    run: { project: PROJECT, module: MODULE },
    units,
    appEnv: 'test',
    read: async (ref: string) => files[ref] ?? null,
  };
  return { unit, ctx };
}

test('a focused function keeps the llm section and the ontologies it touches', async () => {
  const tasks = [
    { taskId: 'cotar', kind: 'llm', title: 'Cotar', next: ['aprovar'], functionRef: 'registrarPedido' },
    { taskId: 'aprovar', kind: 'human', title: 'Aprovar', next: ['end'], functionRef: 'aprovarPedido' },
  ];
  const functions = [
    { functionId: 'resolverGerente', description: 'Decide o gerente sem gravar.' },
    { functionId: 'registrarPedido', description: 'Grava o item e segue.' },
    { functionId: 'aprovarPedido', description: 'Aprova o que já foi gravado.' },
  ];
  const operations = [{ operation: `${BY_STEP}.abrir`, steps: ['aprovar'] }];
  const { unit, ctx } = focusedUnit(tasks, functions, operations);
  const linked = await loadWorkflowContext(ctx, unit, undefined, 'registrarPedido');
  const other = await loadWorkflowContext(ctx, unit, undefined, 'resolverGerente');
  const stepOwner = await loadWorkflowContext(ctx, unit, undefined, 'aprovarPedido');
  const wake = await loadWorkflowContext(ctx, unit, undefined, workflowWakeHandlerName('cotar'));
  const recover = await loadWorkflowContext(ctx, unit, undefined, workflowRecoverName(PROCESS));
  assert.match(linked.human, /## An llm step/);
  assert.equal(other.human.includes('## An llm step'), false);
  assert.match(wake.human, /## An llm step/);
  assert.match(recover.human, /## An llm step/);
  assert.match(linked.human, new RegExp(`## l4 ontology of ${CITED}`));
  assert.equal(other.human.includes(`## l4 ontology of ${CITED}`), false);
  assert.match(other.human, new RegExp(`## domainEntity ${CITED}`));
  assert.match(linked.human, /OCC_FULL/);
  assert.match(other.human, /OCC_FULL/);
  assert.match(stepOwner.human, new RegExp(`## l4 ontology of ${BY_STEP}`));
  assert.equal(other.human.includes(`## l4 ontology of ${BY_STEP}`), false);
  assert.equal(linked.human.includes('ITEM_FULL'), false);
  assert.equal(linked.human.includes('PARCELA_FULL'), false);

  const looseTasks = [{ taskId: 'cotar', kind: 'llm', title: 'Cotar', next: ['end'] }];
  const looseFunctions = [
    { functionId: 'resolverGerente', description: 'Decide o gerente sem gravar.' },
    { functionId: 'registrarPedido', description: 'Grava e segue.' },
  ];
  const loose = focusedUnit(looseTasks, looseFunctions, []);
  const one = await loadWorkflowContext(loose.ctx, loose.unit, undefined, 'resolverGerente');
  const two = await loadWorkflowContext(loose.ctx, loose.unit, undefined, 'registrarPedido');
  assert.match(one.human, /## An llm step/);
  assert.match(two.human, /## An llm step/);

  const byProse = focusedUnit(
    [{ taskId: 'cotar', kind: 'llm', title: 'Cotar', next: ['end'] }],
    [
      { functionId: 'resolverGerente', description: 'Decide o gerente sem gravar.' },
      { functionId: 'registrarPedido', description: 'O passo cotar devolve o texto.' },
    ],
    [],
  );
  const proseHit = await loadWorkflowContext(byProse.ctx, byProse.unit, undefined, 'registrarPedido');
  const proseMiss = await loadWorkflowContext(byProse.ctx, byProse.unit, undefined, 'resolverGerente');
  assert.match(proseHit.human, /## An llm step/);
  assert.equal(proseMiss.human.includes('## An llm step'), false);

  const repaired = await loadWorkflowContext(ctx, unit, { problems: ['missing entity'], previous: null }, 'resolverGerente');
  assert.match(repaired.human, new RegExp(`## l4 ontology of ${CITED}`));
  assert.match(repaired.human, /## An llm step/);

  const whole = await loadWorkflowContext(ctx, unit);
  const finalText = await workflowSequence.context(ctx, unit, 'final', '', undefined);
  const single = await WORKFLOW_SPEC.context(ctx, unit);
  const skeletonText = await workflowSequence.context(ctx, unit, 'skeleton', '', undefined);
  assert.equal(finalText, whole.human);
  assert.equal(single, whole.human);
  assert.ok(skeletonText.startsWith(whole.human));
  assert.match(whole.human, new RegExp(`## l4 ontology of ${CITED}`));
  assert.match(skeletonText, new RegExp(`## l4 ontology of ${CITED}`));

  const withMdm = focusedUnit(tasks, functions, [...operations, { operation: `${OCCURRENCE}.criar`, steps: ['cotar'] }], true);
  const mdmCall = await loadWorkflowContext(withMdm.ctx, withMdm.unit, undefined, 'resolverGerente');
  assert.match(mdmCall.human, /## The platform MDM/);
  assert.equal(other.human.includes('## The platform MDM'), false);
});
