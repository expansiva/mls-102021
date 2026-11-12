/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/workflowLlmPrompt.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { workflowRecoverName, workflowWakeHandlerName } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { llmStepSection, loadWorkflowContext, workflowAnswerProblems, workflowGate, workflowLlmExportNames, workflowProcessSteps } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

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
  const section = llmStepSection('cicloItem', steps, [index, engine, contracts]);
  assert.match(section, /entregarPesquisar/);
  assert.match(section, /entregarAguardar/);
  assert.match(section, /recuperarCicloItem/);
  assert.match(section, /\/_102034_\/l1\/workflow\/index\.js/);
  assert.match(section, /ModuleWakeEvent/);
  assert.match(section, /requestLlmStep/);
  assert.match(section, /TaskOccurrenceLlmResult/);
  assert.match(section, /workflowWakeCommandId/);
  assert.match(section, /registerWorkflowWakeHandler/);
  assert.equal(/from\s+'\/_102036_\//u.test(section), false);
  assert.equal(llmStepSection('aviso', [{ stepId: 'avisar', kind: 'wait', title: 'A', next: [], wakeMode: 'periodic' }], [index]), '');

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
