/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/workflowLlmEmit.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRegistrationRows, renderRegistration } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { bindHumanPages, moduleTickSource, workflowEngineSource, workflowTablesFromL4 } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';
import { workflowRecoverName, workflowWakeHandlerName } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

function l4(processId: string, tasks: unknown[]): string {
  return `export const workflows = ${JSON.stringify({ moduleName: 'pedido', processes: [{ processId, title: 'Processo do pedido', tasks }] })} as const;`;
}

const TASKS = [
  { taskId: 'preencher', kind: 'human', title: 'Preencha o pedido e envie para pesquisa.', actorRef: 'solicitante', journeyRef: 'pedidos', next: ['pesquisar'] },
  { taskId: 'pesquisar', kind: 'llm', title: 'Pesquisar o item pedido.', next: ['aprovar', 'preencher'] },
  { taskId: 'aprovar', kind: 'human', title: 'Aprove o pedido ou devolva com o motivo.', actorRef: 'aprovador', journeyRef: 'pedidos', next: ['aguardar', 'preencher'] },
  { taskId: 'aguardar', kind: 'wait', title: 'Aguardar o prazo depois da aprovação.', next: ['end'], wake: { mode: 'periodic' } },
  { taskId: 'end', kind: 'mechanical', title: 'Fim', next: [] },
];

const SHARED = `export const definition = ${JSON.stringify({
  entry: { params: { pedidoId: { type: 'string', sources: ['url'] }, outro: { type: 'string', sources: ['state'] } } },
  journeys: [{ step: 'pedidos/criar' }, { step: 'pedidos/aprovar' }],
})} as const;`;

const CONFIG = JSON.stringify({
  modules: [{ moduleId: 'pedido', navigation: [{ id: 'pedidos', href: '/pedido/nav' }], frontend: { pages: [{ pageId: 'pedidos', route: '/pedido/pedidos' }] } }],
});

test('an llm process emits the engine, the wake registration and the tick recovery in the wfteste shape', () => {
  const tables = workflowTablesFromL4(l4('processoPedido', TASKS));
  const bound = bindHumanPages(tables, [{ pageId: 'pedidos', source: SHARED }], CONFIG, 'pedido');
  assert.deepEqual(bound.unresolved, []);
  const engine = workflowEngineSource(102047, 'pedido', bound.tables, { enviarParaPesquisa: 'pesquisando' });
  assert.ok(engine.includes("owner === 'module' || owner === 'agent'"));
  assert.match(engine, /createModuleWorkflowEngine\(port: TaskOccurrenceLlmPort\): TaskWorkflowLlmEngine/u);
  assert.match(engine, /requestLlmStep\(ctx: RequestContext, input: TaskWorkflowLlmStep\)/u);
  assert.match(engine, /return engine\.requestLlmStep\(ctx, input\);/u);
  assert.ok(engine.includes('params: { page: "/pedido/pedidos", recordParam: "pedidoId" }'));
  assert.equal(engine.includes('journeyRef: "pedidos", next: ["pesquisar"], params:'), true);
  assert.equal((engine.match(/params: \{ page:/gu) ?? []).length, 2);

  const rows = [{ portId: 'PedidoRepository', factory: 'createPedidoRepository', specifier: '/_102047_/l1/pedido/layer_1_external/adapters/persistence/pedidoRepositoryAdapter.js' }];
  const wakes = [
    { projectId: '102047', moduleId: 'pedido', processId: 'processoPedido', routine: 'pesquisar', handler: workflowWakeHandlerName('pesquisar'), specifier: '/_102047_/l1/pedido/layer_2_application/workflows/processoPedido.js' },
    { projectId: '102047', moduleId: 'pedido', processId: 'processoPedido', routine: 'aguardar', handler: workflowWakeHandlerName('aguardar'), specifier: '/_102047_/l1/pedido/layer_2_application/workflows/processoPedido.js' },
  ];
  const registration = renderRegistration('_102047_/l1/pedido/layer_1_external/adapters/persistence/registerRepositories.ts', rows, wakes);
  assert.match(registration, /import \{ registerWorkflowWakeHandler \} from '\/_102034_\/l1\/workflow\/index\.js';/u);
  assert.match(registration, /import \{ entregarPesquisar, entregarAguardar \} from '\/_102047_\/l1\/pedido\/layer_2_application\/workflows\/processoPedido\.js';/u);
  assert.match(registration, /routine: "pesquisar" \},\n    entregarPesquisar,/u);
  assert.match(registration, /routine: "aguardar" \},\n    entregarAguardar,/u);
  assert.deepEqual(parseRegistrationRows(registration)?.map(row => row.portId), ['PedidoRepository']);

  const tick = moduleTickSource(102047, 'pedido', [], [{ processId: 'processoPedido', fn: workflowRecoverName('processoPedido') }]);
  assert.match(tick, /import \{ recuperarProcessoPedido \} from '\/_102047_\/l1\/pedido\/layer_2_application\/workflows\/processoPedido\.js';/u);
  assert.match(tick, /await recuperarProcessoPedido\(ctx\);/u);
  assert.match(tick, /TICK_FAILED: pedido\.recuperarProcessoPedido/u);
  assert.equal(workflowWakeHandlerName('buscar'), 'entregarBuscar');
  assert.equal(workflowRecoverName('cicloItem'), 'recuperarCicloItem');
});

test('a process without an llm step keeps today\'s engine and tick', () => {
  const tasks = TASKS.filter(task => task.kind !== 'llm').map(task => task.taskId === 'preencher' ? { ...task, next: ['aprovar'] } : task);
  const tables = workflowTablesFromL4(l4('processoPedido', tasks));
  const engine = workflowEngineSource(102047, 'pedido', tables, {});
  assert.match(engine, /type TaskOccurrencePort, type TaskWorkflowAdvance, type TaskWorkflowEngine, type TaskWorkflowOpen/u);
  assert.equal(engine.includes('TaskWorkflowLlmEngine'), false);
  assert.equal(engine.includes('requestLlmStep'), false);
  assert.equal(engine.includes("owner === 'agent'"), false);
  assert.equal(engine.includes('params:'), false);
  assert.match(engine, /export function createModuleWorkflowEngine\(port: TaskOccurrencePort\): TaskWorkflowEngine/u);
  const tick = moduleTickSource(102047, 'pedido', ['lembrete']);
  assert.equal(tick.includes('recuperar'), false);
  assert.match(tick, /import \{ onTick as lembreteTick \} from '\/_102047_\/l1\/pedido\/layer_2_application\/workflows\/lembrete\.js';/u);
  const plain = renderRegistration('_102047_/l1/pedido/layer_1_external/adapters/persistence/registerRepositories.ts', [
    { portId: 'PedidoRepository', factory: 'createPedidoRepository', specifier: '/_102047_/l1/pedido/layer_1_external/adapters/persistence/pedidoRepositoryAdapter.js' },
  ]);
  assert.equal(plain.includes('registerWorkflowWakeHandler'), false);
});

test('a human step with no page is named PAGE_UNRESOLVED and leaves params off', () => {
  const tables = workflowTablesFromL4(l4('processoPedido', [
    { taskId: 'preencher', kind: 'human', title: 'Preencha', actorRef: 'solicitante', journeyRef: 'ausente', next: ['pesquisar'] },
    { taskId: 'pesquisar', kind: 'llm', title: 'Pesquisa', next: [] },
  ]));
  const bound = bindHumanPages(tables, [{ pageId: 'pedidos', source: SHARED }], CONFIG, 'pedido');
  assert.deepEqual(bound.unresolved, ['processoPedido/preencher']);
  assert.equal(bound.tables[0]?.steps[0]?.params, undefined);
  const viaHref = bindHumanPages(tables, [{ pageId: 'pedidos', source: SHARED.replace('pedidos/', 'ausente/') }], JSON.stringify({
    modules: [{ moduleId: 'pedido', navigation: [{ id: 'pedidos', href: '/pedido/nav' }] }],
  }), 'pedido');
  assert.deepEqual(viaHref.unresolved, []);
  assert.deepEqual(viaHref.tables[0]?.steps[0]?.params, { page: '/pedido/nav', recordParam: 'pedidoId' });
});
