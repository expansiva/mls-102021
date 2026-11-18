/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/workflowLlmPrompt.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { workflowRecoverForm, workflowRecoverName, workflowWakeHandlerForm, workflowWakeHandlerName } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { citedOntology, engineUseRules, llmStepSection, reexportRef, typeAlias, loadWorkflowContext, workflowAnswerProblems, workflowFacts, workflowEngineShown, workflowGate, workflowLlmExportNames, workflowProcessSteps } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const prompt = readFileSync(fileURLToPath(new URL('./prompt.md', import.meta.url)), 'utf8');

const TASKS = [
  { taskId: 'preencher', kind: 'human', title: 'Fill and send.', actorRef: 'solicitante', journeyRef: 'pedidos', next: ['pesquisar'] },
  { taskId: 'pesquisar', kind: 'llm', title: 'Search the item on the web.', next: ['aprovar', 'preencher'] },
  { taskId: 'aprovar', kind: 'human', title: 'Approve or return.', actorRef: 'aprovador', journeyRef: 'pedidos', next: ['aguardar', 'preencher'] },
  { taskId: 'aguardar', kind: 'wait', title: 'Wait the period.', next: ['end'], wake: { mode: 'periodic' } },
];

function processJson(processId: string, tasks: unknown[]): string {
  return JSON.stringify({ processId, tasks });
}

function unit(processId: string, tasks: unknown[]): M12Unit {
  const source = `export const workflows = ${JSON.stringify({ processes: [JSON.parse(processJson(processId, tasks))] })} as const;`;
  const data = { processId, trigger: { kind: 'event', event: 'pedido' }, functions: ['enviar'], operations: [] };
  return {
    unitId: processId,
    definition: { artifactType: 'workflowProcess', artifactId: processId, data, dependencies: [] },
    declared: { data },
    outputRef: `_102047_/l1/pedido/layer_2_application/workflows/${processId}.ts`,
  } as unknown as M12Unit;
}

test('the prompt teaches the llm step only as a conditional, and keeps the wake command id', () => {
  assert.match(prompt, /<taskId>:<step>:<wake\.seq>/);
  assert.match(prompt, /workflowWakeCommandId\(event\.eventId\)/);
  assert.match(prompt, /only when this process has one/i);
  assert.match(prompt, /requestLlmStep/);
  assert.match(prompt, /<recordId>:<stepId>:<pass>/);
  assert.match(prompt, /maxPasses: 2/);
  assert.match(prompt, /webSearch/);
  assert.match(prompt, /AAAA-MM-DD/);
  assert.match(prompt, /No `pattern` and no `format`/);
  assert.match(prompt, /llm-step-finished/);
  assert.match(prompt, /<taskId>:<stepId>:llm:<commandId>/);
  assert.match(prompt, /60s/);
  assert.match(prompt, /\/_102034_\/l1\/workflow\/index\.js/);
  assert.match(prompt, /never from `\/_102036_\/`/);
  assert.equal(prompt.includes('entregarPesquisar'), false);
  assert.equal(prompt.includes('retryLostResearch'), false);
  assert.equal(prompt.includes('pesquisar'), false);
});

test('the context names the exports and the index signatures only for a process with an llm step', async () => {
  const steps = workflowProcessSteps(processJson('cicloItem', TASKS));
  assert.deepEqual(workflowLlmExportNames('cicloItem', steps), [
    workflowWakeHandlerName('pesquisar'),
    workflowWakeHandlerName('aguardar'),
    workflowRecoverName('cicloItem'),
  ]);
  assert.deepEqual(workflowLlmExportNames('aviso', [{ stepId: 'avisar', kind: 'alert', title: 'Avisar', next: ['end'] }]), []);

  const index = "export type { ModuleWakeEvent, TaskOccurrenceLlmResult } from '/_102034_/l1/workflow/contracts.js';\nexport { workflowWakeCommandId } from '/_102034_/l1/workflow/wakeContracts.js';\nexport { registerWorkflowWakeHandler } from '/_102034_/l1/workflow/wakeRegistry.js';\n";
  const engine = 'export interface TaskWorkflowLlmStep {\n  commandId: string;\n  maxPasses: number;\n}\nexport interface TaskWorkflowLlmEngine {\n  requestLlmStep(ctx: RequestContext, input: TaskWorkflowLlmStep): Promise<TaskOccurrenceLlmResult>;\n}\n';
  const contracts = 'export interface TaskOccurrenceLlmResult {\n  state: string;\n  result?: string;\n}\n';
  const section = llmStepSection('cicloItem', steps);
  assert.match(section, /entregarPesquisar/);
  assert.match(section, /entregarAguardar/);
  assert.match(section, /recuperarCicloItem/);
  assert.match(section, /\/_102034_\/l1\/workflow\/index\.js/);
  assert.match(section, /ModuleWakeEvent/);
  assert.match(section, /requestLlmStep/);
  // d1_198: no list of engine names is written by hand; the section tells to import what is used from the index.
  assert.match(section, /Import every engine name you use from `\/_102034_\/l1\/workflow\/index\.js`/);
  assert.equal(section.includes('registerWorkflowWakeHandler'), false);
  assert.equal(/from\s+'\/_102036_\//u.test(section), false);
  assert.equal(llmStepSection('aviso', [{ stepId: 'avisar', kind: 'alert', title: 'A', next: [] }]), '');

  const l4 = `export const workflows = ${JSON.stringify({ processes: [JSON.parse(processJson('cicloItem', TASKS)), JSON.parse(processJson('aviso', [{ taskId: 'avisar', kind: 'alert', title: 'Avisar', next: [] }]))] })} as const;`;
  const read = async (ref: string) => {
    if (ref.endsWith('/workflows.defs.ts')) return l4;
    if (ref.endsWith('/workflow/index.ts')) return index;
    if (ref.endsWith('/workflow/engine.ts')) return engine;
    if (ref.endsWith('/workflow/contracts.ts')) return contracts;
    return null;
  };
  const withLlm = await loadWorkflowContext({ run: { project: 102047, module: 'pedido' }, units: [], read } as never, unit('cicloItem', TASKS));
  assert.match(withLlm.human, /## An llm step/);
  assert.match(withLlm.human, /recuperarCicloItem/);
  // The engine signatures reach the model through the Platform sections, read from the files on every round.
  for (const name of ['TaskOccurrenceLlmResult', 'workflowWakeCommandId', 'registerWorkflowWakeHandler', 'requestLlmStep']) assert.ok(withLlm.human.includes(name), name);
  const plain = unit('aviso', [{ taskId: 'avisar', kind: 'alert', title: 'Avisar', next: [] }]);
  const noLlm = await loadWorkflowContext({ run: { project: 102047, module: 'pedido' }, units: [], read } as never, plain);
  assert.equal(noLlm.human.includes('## An llm step'), false);
  assert.equal(noLlm.human.includes('recuperarAviso'), false);
});

test('the gate requires the llm export names only when the process has an llm step', async () => {
  const header = '/// <mls fileReference="_102047_/l1/pedido/layer_2_application/workflows/cicloItem.ts" enhancement="_blank"/>';
  const facts = { processId: 'cicloItem', trigger: { kind: 'event', actorRef: '', event: 'pedido', schedule: '' }, occurrence: '', functions: ['enviar'], operations: [] };
  const names = workflowLlmExportNames('cicloItem', workflowProcessSteps(processJson('cicloItem', TASKS)));
  const body = [
    header,
    "import { workflowEngine } from '/_102047_/l1/pedido/layer_1_external/adapters/workflow/engine.js';",
    'export async function enviar(input: unknown, ctx: unknown) { void workflowEngine; }',
  ].join('\n');
  const missing = workflowGate(body, { header, facts, project: 102047, moduleName: 'pedido', ports: [], llmExports: names });
  assert.ok(names.every(name => missing.some(problem => problem.includes(name))), missing.join('\n'));
  const present = [
    body,
    ...names.map(name => `export async function ${name}() { return; }`),
  ].join('\n');
  assert.deepEqual(workflowGate(present, { header, facts, project: 102047, moduleName: 'pedido', ports: [], llmExports: names }), []);
  assert.deepEqual(workflowGate(body, { header, facts, project: 102047, moduleName: 'pedido', ports: [] }), []);

  const refused = "import { ModuleWakeEvent } from '/_102036_/l2/shared/interfaces.js';\n" + present;
  const outside = workflowGate(refused, { header, facts, project: 102047, moduleName: 'pedido', ports: [], llmExports: names });
  assert.ok(outside.some(problem => problem.includes('/_102036_/')), outside.join('\n'));

  const l4 = `export const workflows = ${JSON.stringify({ processes: [JSON.parse(processJson('cicloItem', TASKS))] })} as const;`;
  const read = async (ref: string) => ref.endsWith('/workflows.defs.ts') ? l4 : null;
  const problems = await workflowAnswerProblems({ run: { project: 102047, module: 'pedido' }, units: [], read } as never, unit('cicloItem', TASKS), body, []);
  assert.ok(problems.some(problem => problem.includes('entregarPesquisar')), problems.join('\n'));
});

test('the prompt and the engine rules name resolveStepPerson for a human step', () => {
  assert.match(prompt, /resolveStepPerson\(ctx, \{ actorRef, step, history \}\)/);
  assert.match(prompt, /Never return `null` or `''`/);
  assert.match(prompt, /never query the MDM/i);
  assert.match(prompt, /helper's error is thrown as it is/);
  const rules = engineUseRules('pedido', 'cicloItem');
  assert.match(rules, /resolveStepPerson\(ctx, \{ actorRef, step, history \}\)/);
  assert.match(rules, /Never return `null`/);
  assert.match(rules, /never query the MDM/i);
});

test('the shown engine lists resolveStepPerson only when the source exports it', () => {
  const withHuman = [
    'export interface StepPersonHistory { step: string; actorNow: string | null; executor: { kind: string; mdmId?: string } }',
    'export interface StepPersonInput { actorRef: string; step: string; history?: readonly StepPersonHistory[] }',
    'export async function resolveStepPerson(ctx: RequestContext, input: StepPersonInput): Promise<string> {',
    '  return input.step;',
    '}',
    'export function noticeState(): string {',
    '  return "pending";',
    '}',
  ].join('\n');
  const shown = workflowEngineShown(withHuman);
  assert.match(shown, /export interface StepPersonHistory \{ step: string; actorNow: string \| null; executor: \{ kind: string; mdmId\?: string \} \}/);
  assert.match(shown, /export interface StepPersonInput \{ actorRef: string; step: string; history\?: readonly StepPersonHistory\[\] \}/);
  assert.match(shown, /export async function resolveStepPerson\(ctx: RequestContext, input: StepPersonInput\): Promise<string> \{ … \}/);
  const withoutHuman = workflowEngineShown('export function noticeState(): string {\n  return "pending";\n}\n');
  assert.equal(withoutHuman.includes('resolveStepPerson'), false);
  assert.equal(withoutHuman.includes('StepPersonHistory'), false);
  assert.equal(withoutHuman.includes('StepPersonInput'), false);
});

test('the worker context shows the transitionTo keys', () => {
  const source = [
    'export const workflowPlans = {',
    '  ciclo: { processId: "ciclo" },',
    '};',
    'export const transitionTo = {',
    '  enviar: "enviada",',
    '  autorizar: "autorizada",',
    '} as const satisfies Readonly<Record<string, string>>;',
    'export type TransitionKey = keyof typeof transitionTo;',
    'export function destinationOf(operation: TransitionKey): string {',
    '  return transitionTo[operation];',
    '}',
    'export function noticeState(): string {',
    '  return "pending";',
    '}',
  ].join('\n');
  const shown = workflowEngineShown(source);
  assert.match(shown, /enviar: "enviada"/u);
  assert.match(shown, /autorizar: "autorizada"/u);
  assert.match(shown, /as const satisfies Readonly<Record<string, string>>/u);
  assert.equal(/^export const transitionTo = \{ … \}/mu.test(shown), false);
  assert.match(shown, /export const workflowPlans = \{ … \}/u);
  assert.match(shown, /export function noticeState\(\): string \{ … \}/u);
  assert.ok(shown.includes('export type TransitionKey = keyof typeof transitionTo;'));
  assert.ok(shown.includes('export function destinationOf(operation: TransitionKey): string { … }'));
});

test('an entity the process only names keeps its states and transitions, not its fields', () => {
  const ontology = `export const x = ${JSON.stringify({
    entityId: 'Fornecedor',
    title: 'Fornecedor',
    description: 'long',
    capabilities: { a: 'b' },
    record: { fields: { id: { type: 'uuid' } } },
    lifecycleStates: [{ state: 'ativo', reachedBy: 'actor' }],
    transitions: [{ transitionId: 'inativar', from: ['ativo'], to: 'inativo' }],
  }, null, 2)} as const;`;
  const slim = JSON.parse(citedOntology(ontology)) as Record<string, unknown>;
  assert.deepEqual(Object.keys(slim).sort(), ['entityId', 'lifecycleStates', 'title', 'transitions']);
  assert.equal(citedOntology('not an ontology'), 'not an ontology');
});

test('the worker context carries the wake handler type and the fixed forms, read from the 102034 index', async () => {
  const steps = workflowProcessSteps(processJson('cicloItem', TASKS));
  const index = "export type { ModuleWakeEvent, TaskOccurrenceLlmResult } from '/_102034_/l1/workflow/contracts.js';\nexport type { WorkflowWakeHandler } from '/_102034_/l1/workflow/wakeContracts.js';\nexport { workflowWakeCommandId } from '/_102034_/l1/workflow/wakeContracts.js';\nexport { registerWorkflowWakeHandler } from '/_102034_/l1/workflow/wakeRegistry.js';\n";
  const wake = "export type WorkflowWakeHandler = (\n  ctx: RequestContext,\n  event: ModuleWakeEvent,\n  occurrence: TaskOccurrenceSnapshot,\n) => Promise<void>;\n";
  assert.equal(reexportRef(index, 'WorkflowWakeHandler'), '_102034_/l1/workflow/wakeContracts.ts');
  assert.equal(reexportRef(index, 'Missing'), '');
  assert.match(typeAlias(wake, 'WorkflowWakeHandler'), /occurrence: TaskOccurrenceSnapshot,\n\) => Promise<void>;$/u);
  assert.equal(typeAlias('export const x = 1;', 'WorkflowWakeHandler'), '');

  const l4 = `export const workflows = ${JSON.stringify({ processes: [JSON.parse(processJson('cicloItem', TASKS))] })} as const;`;
  const read = async (ref: string) => {
    if (ref.endsWith('/workflows.defs.ts')) return l4;
    if (ref.endsWith('/workflow/index.ts')) return index;
    if (ref.endsWith('/workflow/wakeContracts.ts')) return wake;
    return null;
  };
  const built = await loadWorkflowContext({ run: { project: 102047, module: 'pedido' }, units: [], read } as never, unit('cicloItem', TASKS));
  assert.ok(built.human.includes('export type WorkflowWakeHandler'), 'the real alias is in the context');
  assert.ok(built.human.includes(workflowWakeHandlerForm('pesquisar')));
  assert.ok(built.human.includes(workflowWakeHandlerForm('aguardar')));
  assert.ok(built.human.includes(workflowRecoverForm('cicloItem')));
  assert.equal(workflowRecoverForm('cicloItem'), 'export async function recuperarCicloItem(ctx: RequestContext): Promise<void>');
  assert.equal(workflowWakeHandlerForm('pesquisar'), 'export async function entregarPesquisar(ctx: RequestContext, event: ModuleWakeEvent): Promise<void>');
  const withoutAlias = llmStepSection('cicloItem', steps);
  assert.equal(withoutAlias.includes('export type WorkflowWakeHandler'), false);
});

test('d1_205: a process started by an event or a schedule opens with owner null; a person process does not', () => {
  const rulesOf = (trigger: Record<string, unknown>): string => {
    const base = unit('refresh', TASKS);
    const data = { ...(base.definition.data as Record<string, unknown>), trigger };
    const facts = workflowFacts({ ...base, definition: { ...base.definition, data }, declared: { data } } as unknown as M12Unit);
    return engineUseRules('agents', facts.processId, facts.trigger.kind);
  };
  const event = rulesOf({ kind: 'event', event: 'platform.releaseCatalogChanged' });
  assert.match(event, /owner: null/);
  assert.match(event, /actorNow: null/);
  assert.match(event, /kind: 'routine'/);
  assert.match(event, /origin: \{ kind: 'event' \}/);
  assert.match(event, /Never require `person\.mdmId`/);
  assert.match(event, /WORKFLOW_ROUTINE_OWNER_INVALID/);
  const scheduled = rulesOf({ kind: 'scheduled', schedule: '0 8 * * *' });
  assert.match(scheduled, /owner: null/);
  assert.match(scheduled, /origin: \{ kind: 'schedule' \}/);
  const person = rulesOf({ kind: 'manual', actorRef: 'companyAdmin' });
  assert.equal(person.includes('owner: null'), false);
  assert.equal(person.includes('routineOwnerProblem'), false);
  assert.match(person, /engine\.open\(ctx/);
  for (const text of [event, scheduled]) assert.equal(text.includes('platform.releaseCatalogChanged'), false);
});
