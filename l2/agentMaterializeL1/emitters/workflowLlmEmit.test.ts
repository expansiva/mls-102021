/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/workflowLlmEmit.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isAlphaAllAuthorities, resetAlphaAuthoritiesCache } from '/_102034_/l1/server/layer_1_external/config/alphaAuthorities.js';
import { AppError, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { OccurrenceKey, WorkflowTable } from '/_102034_/l1/workflow/contracts.js';
import { createWorkflowEngine, type WorkflowEngineContext } from '/_102034_/l1/workflow/engine.js';
import { createMemoryOccurrencePort } from '/_102034_/l1/workflow/memoryOccurrence.js';
import { parseRegistrationRows, registrationModule, renderRegistration } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { bindHumanPages, moduleTickSource, workflowEngineSource, workflowTablesFromL4 } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';
import { workflowRecoverName, workflowWakeHandlerName } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { MDM_LIST_USERS_PAGE_SIZE_MAX } from '/_102021_/l2/agentMaterializeL1/helpers/mdmPlatformLimits.js';

function l4(processId: string, tasks: unknown[]): string {
  return `export const workflows = ${JSON.stringify({ moduleName: 'pedido', processes: [{ processId, title: 'Processo do pedido', tasks }] })} as const;`;
}

const TASKS = [
  { taskId: 'preencher', kind: 'human', title: 'Preencha o pedido e envie para pesquisa.', actorRef: 'solicitante', journeyRef: 'pedidos', entityRef: 'Pedido', next: ['pesquisar'] },
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

test('d1_341: every registration of a module carries its module, and a file in the old form still parses', () => {
  const out = '_102047_/l1/telegram/layer_1_external/adapters/persistence/registerRepositories.ts';
  const rows = [
    { portId: 'CmGateway', factory: 'createCmGateway', specifier: '/_102047_/l1/telegram/layer_1_external/adapters/integration/outbound.js' },
    { portId: 'TelegramBotRepository', factory: 'createTelegramBotRepository', specifier: '/_102047_/l1/telegram/layer_1_external/adapters/persistence/telegramBotRepositoryAdapter.js' },
  ];
  const source = renderRegistration(out, rows);
  assert.match(source, /registerRepository\("CmGateway", ctx => createCmGateway\(ctx\), \{ module: "telegram" \}\);/u);
  assert.match(source, /registerRepository\("TelegramBotRepository", ctx => createTelegramBotRepository\(ctx\), \{ module: "telegram" \}\);/u);
  assert.equal((source.match(/registerRepository\(/gu) ?? []).length, 2, 'no registration without the module');
  assert.deepEqual(parseRegistrationRows(source)?.map(row => row.portId), ['CmGateway', 'TelegramBotRepository']);
  const old = source.replaceAll(', { module: "telegram" }', '');
  assert.deepEqual(parseRegistrationRows(old)?.map(row => row.portId), ['CmGateway', 'TelegramBotRepository']);
  assert.equal(registrationModule(out), 'telegram');
  assert.throws(() => registrationModule('registerRepositories.ts'));
});

const COMPRAS = [
  { taskId: 'abrirSolicitacao', kind: 'human', title: 'Abra a solicitação.', actorRef: 'solicitante', journeyRef: 'compras', next: ['conferirCompletude'] },
  { taskId: 'conferirCompletude', kind: 'mechanical', title: 'Confira se a solicitação está completa.', next: ['pesquisarOpcoes'] },
  { taskId: 'pesquisarOpcoes', kind: 'llm', title: 'Pesquise opções de compra.', next: ['autorizarSolicitacao'] },
  { taskId: 'autorizarSolicitacao', kind: 'human', title: 'Autorize a solicitação.', actorRef: 'aprovador', journeyRef: 'compras', next: ['gerarPedido'] },
  { taskId: 'gerarPedido', kind: 'mechanical', title: 'Gere o pedido.', next: ['aguardarEntrega'] },
  { taskId: 'aguardarEntrega', kind: 'wait', title: 'Aguarde a entrega.', next: [], wake: { mode: 'calendar' } },
];

test('an llm process adds the previous human step to each mechanical and llm step', async () => {
  const table = workflowTablesFromL4(l4('solicitacaoCompra', COMPRAS))[0];
  assert.ok(table);
  const nextOf = (stepId: string) => table.steps.find(step => step.stepId === stepId)?.next;
  assert.deepEqual(nextOf('conferirCompletude'), ['pesquisarOpcoes', 'abrirSolicitacao']);
  assert.deepEqual(nextOf('pesquisarOpcoes'), ['autorizarSolicitacao', 'abrirSolicitacao']);
  assert.deepEqual(nextOf('gerarPedido'), ['aguardarEntrega', 'autorizarSolicitacao']);
  assert.deepEqual(nextOf('abrirSolicitacao'), ['conferirCompletude']);
  assert.deepEqual(nextOf('autorizarSolicitacao'), ['gerarPedido']);
  assert.deepEqual(nextOf('aguardarEntrega'), []);

  const plan: WorkflowTable = {
    processId: table.processId,
    steps: table.steps.map(step => ({ stepId: step.stepId, kind: step.kind as WorkflowTable['steps'][number]['kind'], next: step.next })),
  };
  const caller: WorkflowEngineContext = { clock: { nowIso: () => '2026-11-12T12:00:00.000Z' }, log: { info() {}, error() {} } };
  const key: OccurrenceKey = { project: '10', module: 'compras', processId: 'solicitacaoCompra', entity: 'Solicitacao', recordId: 's1' };
  const engine = createWorkflowEngine(createMemoryOccurrencePort());
  await engine.open(caller, plan, key, 'pesquisarOpcoes', null);
  const moved = await engine.advance(caller, plan, key, { from: 'pesquisarOpcoes', to: 'abrirSolicitacao', actorNow: null });
  assert.equal(moved.outcome, 'advanced');
  assert.equal(moved.occurrence.step, 'abrirSolicitacao');

  const llm = plan.steps.find(step => step.stepId === 'pesquisarOpcoes');
  assert.ok(llm);
  const saved = [...llm.next];
  llm.next = llm.next.filter(stepId => stepId !== 'abrirSolicitacao');
  await assert.rejects(
    () => engine.advance(caller, plan, key, { from: 'pesquisarOpcoes', to: 'abrirSolicitacao', actorNow: null }),
    (error: unknown) => error instanceof AppError && error.code === 'UNREACHABLE_STEP',
  );
  llm.next = saved;
});

test('a human step with no page is named PAGE_UNRESOLVED and leaves params off', () => {
  const tables = workflowTablesFromL4(l4('processoPedido', [
    { taskId: 'preencher', kind: 'human', title: 'Preencha', actorRef: 'solicitante', journeyRef: 'ausente', entityRef: 'Pedido', next: ['pesquisar'] },
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

function pageDef(entryParams: Record<string, unknown>, steps: string[]): string {
  return `export const definition = ${JSON.stringify({
    entry: { params: entryParams },
    journeys: steps.map(step => ({ step })),
  })} as const;`;
}

const URL = (extra: Record<string, unknown> = {}) => ({ type: 'string', sources: ['url'], ...extra });

test('wfteste human steps open /wfteste/pedidos by pedidoId from projects[].modules[]', () => {
  const tables = workflowTablesFromL4(l4('processoPedido', TASKS));
  const config = JSON.stringify({
    projects: { '102047': { modules: [{ moduleId: 'pedido', frontend: { pages: [{ pageId: 'pedidos', route: '/wfteste/pedidos' }] } }] } },
  });
  const bound = bindHumanPages(tables, [{ pageId: 'pedidos', source: SHARED }], config, 'pedido');
  assert.deepEqual(bound.unresolved, []);
  const params = bound.tables[0]?.steps.filter(step => step.kind === 'human').map(step => step.params);
  assert.deepEqual(params, [
    { page: '/wfteste/pedidos', recordParam: 'pedidoId' },
    { page: '/wfteste/pedidos', recordParam: 'pedidoId' },
  ]);
});

test('compras binds the occurrence record, not the first URL param', () => {
  const tasks = [
    { taskId: 'abrirSolicitacao', kind: 'human', actorRef: 'comprador', journeyRef: 'abrirSolicitacao', next: ['conferirCompletude'], description: 'Abra' },
    { taskId: 'conferirCompletude', kind: 'mechanical', entityRef: 'SolicitacaoCompra', next: ['pesquisarOpcoes'], description: 'Confira' },
    { taskId: 'pesquisarOpcoes', kind: 'llm', entityRef: 'OpcaoCotacao', next: ['autorizarSolicitacao'], description: 'Pesquise' },
    { taskId: 'autorizarSolicitacao', kind: 'human', actorRef: 'gerenteCompras', journeyRef: 'autorizarSolicitacao', next: ['registrarRecebimento'], description: 'Autorize' },
    { taskId: 'registrarRecebimento', kind: 'human', actorRef: 'almoxarife', journeyRef: 'registrarRecebimento', next: [], description: 'Receba' },
  ];
  const tables = workflowTablesFromL4(`export const workflows = ${JSON.stringify({ moduleName: 'compras', processes: [{ processId: 'cicloSolicitacaoCompra', title: 'Ciclo', tasks }] })} as const;`);
  const pages = [
    { pageId: 'painel_compras', source: pageDef({ opcaoEscolhidaId: URL() }, ['autorizarSolicitacao/localizarPendentes']) },
    { pageId: 'solicitacoes', source: pageDef({
      produtoId: URL({ sources: ['url', 'localStorage'] }),
      solicitacaoCompraId: URL(),
    }, ['abrirSolicitacao/criarSolicitacao', 'autorizarSolicitacao/analisarSolicitacao']) },
    { pageId: 'entregas_a_receber', source: pageDef({ pedidoCompraId: URL() }, ['registrarRecebimento/abrirLembrete']) },
    { pageId: 'pedidos', source: pageDef({ pedidoCompraId: URL() }, ['registrarRecebimento/conferirPedido']) },
  ];
  const config = JSON.stringify({
    projects: {
      '102047': {
        modules: [{
          moduleId: 'compras',
          frontend: { pages: [
            { pageId: 'solicitacoes', route: '/compras/solicitacoes' },
            { pageId: 'painel_compras', route: '/compras/painel_compras' },
            { pageId: 'entregas_a_receber', route: '/compras/entregas_a_receber' },
            { pageId: 'pedidos', route: '/compras/pedidos' },
          ] },
        }],
      },
    },
  });
  const bound = bindHumanPages(tables, pages, config, 'compras');
  const paramsOf = (stepId: string) => bound.tables[0]?.steps.find(step => step.stepId === stepId)?.params;
  assert.deepEqual(paramsOf('abrirSolicitacao'), { page: '/compras/solicitacoes', recordParam: 'solicitacaoCompraId' });
  assert.deepEqual(paramsOf('autorizarSolicitacao'), { page: '/compras/solicitacoes', recordParam: 'solicitacaoCompraId' });
  assert.equal(paramsOf('registrarRecebimento'), undefined);
  assert.deepEqual(bound.unresolved, ['cicloSolicitacaoCompra/registrarRecebimento']);
});

test('resolveStepPerson follows the caller, then who already acted as that actor, then alpha', async () => {
  const tables = workflowTablesFromL4(l4('processoPedido', TASKS));
  const source = workflowEngineSource(102047, 'pedido', tables, {});
  assert.match(source, /import \{ isAlphaAllAuthorities \} from '\/_102034_\/l1\/server\/layer_1_external\/config\/alphaAuthorities\.js';/u);
  assert.match(source, /export async function resolveStepPerson\(ctx: RequestContext, input: StepPersonInput\): Promise<string>/u);
  const file = join(mkdtempSync(join(tmpdir(), 'd1-178-')), 'engine.ts');
  writeFileSync(file, source);
  const generated = await import(file) as {
    resolveStepPerson: (ctx: RequestContext, input: {
      actorRef: string;
      step: string;
      history?: ReadonlyArray<{ step: string; actorNow: string | null; executor: { kind: string; mdmId?: string } }>;
    }) => Promise<string>;
  };
  const listed: Array<{ pageSize?: number }> = [];
  let people: { items: Array<{ mdmId: string; kind?: string }> } = { items: [{ mdmId: 'mdm-agent', kind: 'agent' }, { mdmId: 'mdm-b' }, { mdmId: 'mdm-a' }] };
  const ctx = (scope: string[], mdmId?: string): RequestContext => ({
    sessionContext: { actorScope: scope, ...(mdmId ? { person: { mdmId, email: 'a@b.c', name: 'A' } } : {}) },
    mdm: { identity: { async listUsers(input: { pageSize?: number }) { listed.push(input); return people; } } },
  }) as RequestContext;
  const otherActor = { step: 'aprovar', actorNow: 'pessoa-outro-ator', executor: { kind: 'person', mdmId: 'pessoa-outro-ator' } };

  const caller = await generated.resolveStepPerson(ctx(['pedido:solicitante', 'pedido:aprovador'], 'quem-chama'), {
    actorRef: 'solicitante',
    step: 'preencher',
    history: [otherActor, { step: 'preencher', actorNow: 'quem-agiu', executor: { kind: 'person', mdmId: 'quem-agiu' } }],
  });
  assert.equal(caller, 'quem-chama');
  assert.deepEqual(listed, []);

  const acted = await generated.resolveStepPerson(ctx(['pedido:aprovador'], 'quem-chama'), {
    actorRef: 'solicitante',
    step: 'preencher',
    history: [
      otherActor,
      { step: 'preencher', actorNow: 'antigo', executor: { kind: 'person', mdmId: 'quem-agiu' } },
      { step: 'preencher', actorNow: null, executor: { kind: 'routine', name: 'tick' } },
    ],
  });
  assert.equal(acted, 'quem-agiu');

  const fromActorNow = await generated.resolveStepPerson(ctx([]), {
    actorRef: 'solicitante',
    step: 'preencher',
    history: [otherActor, { step: 'preencher', actorNow: 'pelo-actor-now', executor: { kind: 'routine', name: 'tick' } }],
  });
  assert.equal(fromActorNow, 'pelo-actor-now');

  resetAlphaAuthoritiesCache();
  isAlphaAllAuthorities(undefined, () => ({ alphaAllAuthorities: true }));
  try {
    const first = await generated.resolveStepPerson(ctx([]), { actorRef: 'solicitante', step: 'preencher', history: [otherActor] });
    assert.equal(first, 'mdm-b', 'the alpha shortcut skips an agent member');
    assert.deepEqual(listed, [{ pageSize: MDM_LIST_USERS_PAGE_SIZE_MAX }]);
    people = { items: [{ mdmId: 'mdm-agent', kind: 'agent' }] };
    await assert.rejects(
      () => generated.resolveStepPerson(ctx([]), { actorRef: 'solicitante', step: 'preencher', history: [otherActor] }),
      (error: unknown) => error instanceof AppError && error.code === 'WORKFLOW_ACTOR_PERSON_UNKNOWN' && error.statusCode === 409,
    );
  } finally {
    resetAlphaAuthoritiesCache();
  }

  resetAlphaAuthoritiesCache();
  isAlphaAllAuthorities(undefined, () => ({ alphaAllAuthorities: false }));
  try {
    await assert.rejects(
      () => generated.resolveStepPerson(ctx(['outro:solicitante']), { actorRef: 'solicitante', step: 'preencher' }),
      (error: unknown) => error instanceof AppError
        && error.code === 'WORKFLOW_ACTOR_PERSON_UNKNOWN'
        && error.statusCode === 409
        && error.message.includes('solicitante')
        && error.message.includes('preencher'),
    );
  } finally {
    resetAlphaAuthoritiesCache();
  }

  const mechanical = workflowEngineSource(102047, 'pedido', workflowTablesFromL4(l4('aviso', [
    { taskId: 'gerar', kind: 'mechanical', title: 'Gera', next: [] },
  ])), {});
  assert.equal(mechanical.includes('resolveStepPerson'), false);
  assert.equal(mechanical.includes('isAlphaAllAuthorities'), false);
  assert.equal(mechanical.includes('StepPersonHistory'), false);
});

test('a process with no entityRef leaves every human step without params', () => {
  const tables = workflowTablesFromL4(l4('processoPedido', TASKS.map(task => ({ ...task, entityRef: undefined }))));
  const bound = bindHumanPages(tables, [{ pageId: 'pedidos', source: SHARED }], CONFIG, 'pedido');
  assert.deepEqual(bound.unresolved, ['RECORD_ENTITY_MISSING: processoPedido']);
  assert.equal(bound.tables[0]?.steps.some(step => step.params), false);
});

test('the engine types the plans it iterates, so a plan without a human step still compiles in engine.ts', () => {
  const human = [
    { taskId: 'preencher', kind: 'human', title: 'Preencha o pedido.', actorRef: 'solicitante', journeyRef: 'pedidos', entityRef: 'Pedido', next: ['end'] },
    { taskId: 'end', kind: 'mechanical', title: 'Fim', next: [] },
  ];
  const mechanical = [
    { taskId: 'conferir', kind: 'mechanical', title: 'Confira o pedido.', next: ['end'] },
    { taskId: 'end', kind: 'mechanical', title: 'Fim', next: [] },
  ];
  const source = [
    { processId: 'processoHumano', title: 'Com pessoa', tasks: human },
    { processId: 'processoMecanico', title: 'Sem pessoa', tasks: mechanical },
  ];
  const tables = workflowTablesFromL4(`export const workflows = ${JSON.stringify({ moduleName: 'pedido', processes: source })} as const;`);
  assert.equal(tables.length, 2);
  const engine = workflowEngineSource(102047, 'pedido', tables, {});
  assert.ok(engine.includes('for (const plan of Object.values(workflowPlans) as readonly WorkflowPlanInput[]) {'), 'the iteration is typed as the plan input');
  assert.match(engine, /actorRef: "solicitante"/u);

  // The same source goes through tsc, in the shape of the platform paths: only errors in the engine file count.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
  const dir = mkdtempSync(path.join(root, '.workflow-engine-proof-'));
  try {
    writeFileSync(path.join(dir, 'engine.ts'), engine);
    writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
      extends: '../tsconfig.base.json',
      compilerOptions: { noEmit: true, skipLibCheck: true },
      files: ['engine.ts'],
    }));
    let output = '';
    try {
      execFileSync(path.join(root, 'node_modules', '.bin', 'tsc'), ['--pretty', 'false', '-p', path.join(dir, 'tsconfig.json')], { cwd: root, encoding: 'utf8' });
    } catch (error) {
      const failed = error as { stdout?: string; stderr?: string };
      output = `${failed.stdout ?? ''}${failed.stderr ?? ''}`;
    }
    const prefix = `${path.relative(root, dir)}/engine.ts(`;
    const own = output.split('\n').filter(line => line.startsWith(prefix));
    assert.deepEqual(own, [], own.join('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
