/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/context.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { derivedReadSection, derivedReadValue, entityNames, loadUsecaseContext, usecaseAnswerProblems } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

const PROJECT = 102099;
const MODULE = 'fila';

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function ontology(value: unknown): string {
  return `export const definition = ${JSON.stringify(value)} as const;\n`;
}

const TAREFA_ONTOLOGY = ontology({
  title: 'Tarefa',
  record: { fields: { details: { fields: { atrasada: { type: 'boolean', derived: true } } } } },
});
const PARTICIPANTE_ONTOLOGY = ontology({
  title: 'Participante',
  subtype: 'Person',
  record: { fields: { details: { fields: { identification: { fields: { status: { type: 'string', derived: true } } } } } } },
});
const MDM_ONTOLOGY = ontology({
  groups: { identification: { fields: { name: { type: 'string' }, status: { type: 'string' } } } },
  subtypes: { Person: { fields: { privacyConsent: { type: 'boolean' } } } },
});
const RULES = `export const rules = ${JSON.stringify({ rules: { criadorPodeCriar: 'O participante que cria pode criar.' } })} as const;\n`;

function unit(artifactType: string, artifactId: string, data: Record<string, unknown>, outputRef: string, dependencies: string[] = []): M12Unit {
  const definition = { artifactType, artifactId, moduleName: MODULE, data, dependencies };
  return { definition, declared: definition, outputRef, defRef: outputRef.replace(/\.ts$/u, '.defs.ts'), output: { project: PROJECT, level: 1, folder: '', shortName: artifactId, extension: '.ts' } } as unknown as M12Unit;
}

test('an MDM entity a rule cites is read from the platform, and its derived fields are not gated', async () => {
  const previous = globalThis.mls;
  const rulesInfo: M12FileInfo = { project: PROJECT, level: 4, folder: MODULE, shortName: 'rules', extension: '.defs.ts' };
  const rulesFile = { ...rulesInfo, status: 'changed', getContent: async () => RULES, getValueInfo: async () => ({ content: RULES }) };
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: { files: { [keyOf(rulesInfo)]: rulesFile }, getKeyToFile: keyOf },
  };
  const files = new Map<string, string>([
    [`_${PROJECT}_/l4/${MODULE}/ontology/Tarefa.defs.ts`, TAREFA_ONTOLOGY],
    [`_${PROJECT}_/l4/${MODULE}/ontology/Participante.defs.ts`, PARTICIPANTE_ONTOLOGY],
    ['_102034_/l4/ontology/mdm.defs.ts', MDM_ONTOLOGY],
  ]);
  const read = async (ref: string) => files.get(ref) ?? null;
  const tarefaOntology = `_${PROJECT}_/l4/${MODULE}/ontology/Tarefa.defs.ts`;
  const participanteOntology = `_${PROJECT}_/l4/${MODULE}/ontology/Participante.defs.ts`;
  const usecase = unit('usecase', 'createTarefa', {
    usecaseId: 'createTarefa',
    entityId: 'Tarefa',
    operation: 'create',
    functions: [{ functionName: 'createTarefa', input: [{ name: 'titulo', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
    rulePlan: [{ ruleId: 'criadorPodeCriar', enforcement: 'local', origin: 'l4/fila/rules.defs.ts#criadorPodeCriar' }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/createTarefa.ts`, [tarefaOntology]);
  const tarefa = unit('domainEntity', 'tarefa', { entityId: 'Tarefa', storageTarget: 'moduleDatabase' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/tarefa.ts`, [tarefaOntology]);
  const participante = unit('domainEntity', 'participante', { entityId: 'Participante', storageTarget: 'mdm' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/participante.ts`, [participanteOntology]);
  const port = unit('repositoryPort', 'tarefaRepository', { entityId: 'Tarefa', interfaceName: 'TarefaRepository' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/tarefaRepository.ts`);
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [usecase, tarefa, participante, port], read };
  try {
    const loaded = await loadUsecaseContext(ctx as never, usecase);
    const cited = loaded.human.split('## Entity cited by a rule: domainEntity participante')[1] ?? '';
    assert.ok(cited.length > 0, 'the cited MDM entity is in the context');
    assert.equal(cited.includes('through this port'), false);
    assert.match(cited, /Read it from the platform MDM; it has no repository port in this module\./u);
    assert.match(cited, /ctx\.mdm\.entity\.get\(\{ mdmId \}\)/u);
    assert.match(cited, /`details\.privacyConsent`/u);

    const header = loaded.header;
    const mdmRead = [
      header,
      "import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
      'export async function createTarefa(input: { titulo: string }, ctx: { mdm: { entity: { get(query: { mdmId: string }): Promise<{ details: { identification: { status: string } } }> } } }) {',
      '  const person = await ctx.mdm.entity.get({ mdmId: input.titulo });',
      '  const status = person.details.identification.status;',
      '  void status;',
      "  throw new AppError('X', 'y', 400, { ruleId: 'criadorPodeCriar' });",
      '}',
    ].join('\n');
    assert.deepEqual(await usecaseAnswerProblems(ctx as never, usecase, mdmRead, []), []);

    const storedRead = [
      header,
      "import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
      'export async function createTarefa(input: { titulo: string }, ctx: unknown) {',
      '  const row = await tarefaRepository.get(input.titulo);',
      '  const late = row.details.atrasada;',
      '  void late;',
      "  throw new AppError('X', 'y', 400, { ruleId: 'criadorPodeCriar' });",
      '}',
    ].join('\n');
    const refused = await usecaseAnswerProblems(ctx as never, usecase, storedRead, []);
    assert.ok(refused.some(problem => problem.includes('details.atrasada')), refused.join('\n'));
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

const PAINEL_MEASURES = [
  'details.solicitacoesAguardandoAutorizacao',
  'details.pedidosEmAberto',
  'details.pedidosAtrasados',
  'details.totalComprado',
  'details.quantidadePedidos',
];

const DERIVED_READ = {
  mode: 'onRead',
  sources: ['SolicitacaoCompra', 'PedidoCompra'],
  windowField: 'periodo',
  groupBy: ['fornecedorId'],
  measures: PAINEL_MEASURES,
};

test('Derived read names the sources, the window, the groups and the measures, and forbids the summary table', () => {
  const text = derivedReadSection(derivedReadValue({ derivedRead: DERIVED_READ })!, [
    { entityId: 'SolicitacaoCompra', importPath: '/_102099_/l1/compras/layer_2_application/usecases/listSolicitacaoCompra.js', signatures: 'export async function listSolicitacaoCompra' },
    { entityId: 'PedidoCompra', importPath: '/_102099_/l1/compras/layer_2_application/usecases/listPedidoCompra.js', signatures: 'export async function listPedidoCompra' },
  ]);
  assert.match(text, /^## Derived read\n/u);
  assert.match(text, /SolicitacaoCompra/u);
  assert.match(text, /PedidoCompra/u);
  assert.match(text, /listSolicitacaoCompra\.js/u);
  assert.match(text, /listPedidoCompra\.js/u);
  assert.match(text, /export async function listSolicitacaoCompra/u);
  assert.match(text, /`periodo`/u);
  assert.match(text, /`fornecedorId`/u);
  for (const measure of PAINEL_MEASURES) assert.match(text, new RegExp(measure.replace(/\./gu, '\\.'), 'u'));
  assert.match(text, /calculated on read/u);
  assert.match(text, /Do not read or write the table/u);
  assert.match(text, /resolveRepository/u);
  assert.equal(derivedReadValue({ usecaseId: 'listPedidoCompra' }), null);
});

test('a usecase without derivedRead keeps the context it had, and listPainelCompras gains only that section', async () => {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  const base = {
    usecaseId: 'listPainelCompras',
    entityId: 'PainelCompras',
    operation: 'list',
    rulesApplied: [],
    effects: [],
    functions: [{ functionName: 'listPainelCompras', input: [{ name: 'page', type: 'number' }], output: [{ name: 'items', type: 'unknown[]' }] }],
  };
  const list = (entityId: string, artifactId: string) => unit('usecase', artifactId, {
    usecaseId: artifactId,
    entityId,
    operation: 'list',
    functions: [{ functionName: artifactId, input: [], output: [{ name: 'items', type: 'unknown[]' }] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/${artifactId}.ts`);
  const solicitacao = list('SolicitacaoCompra', 'listSolicitacaoCompra');
  const pedido = list('PedidoCompra', 'listPedidoCompra');
  const without = unit('usecase', 'listPainelCompras', base, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/listPainelCompras.ts`, [solicitacao.defRef, pedido.defRef]);
  const withField = unit('usecase', 'listPainelCompras', { ...base, derivedRead: DERIVED_READ }, without.outputRef, [solicitacao.defRef, pedido.defRef]);
  const read = async () => null;
  const ctxOf = (usecase: M12Unit) => ({ run: { project: PROJECT, module: MODULE }, units: [usecase, solicitacao, pedido], read });
  try {
    const plain = await loadUsecaseContext(ctxOf(without) as never, without);
    const derived = await loadUsecaseContext(ctxOf(withField) as never, withField);
    assert.equal(plain.human.includes('## Derived read'), false);
    const start = derived.human.indexOf('## Derived read');
    assert.ok(start > 0);
    const section = derived.human.slice(start);
    assert.match(section, /SolicitacaoCompra/u);
    assert.match(section, /PedidoCompra/u);
    assert.match(section, /listSolicitacaoCompra\.js/u);
    assert.match(section, /listPedidoCompra\.js/u);
    assert.match(section, /`periodo`/u);
    assert.match(section, /`fornecedorId`/u);
    for (const measure of PAINEL_MEASURES) assert.match(section, new RegExp(measure.replace(/\./gu, '\\.'), 'u'));
    assert.match(section, /Do not read or write the table/u);
    assert.match(section, /resolveRepository/u);
    const withoutSection = derived.human.replace(/\n## Derived read\n[\s\S]*$/u, '');
    const withoutField = withoutSection.replace(/,?\n    "derivedRead": \{[\s\S]*?\n    \}/u, '');
    assert.equal(withoutField, plain.human);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

test('Connection gateways lists the consumer gateway and only its operations', async () => {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
  const catalog = readFileSync(path.join(root, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
  const usecase = unit('usecase', 'readAgentRow', {
    usecaseId: 'readAgentRow',
    entityId: 'Tarefa',
    operation: 'read',
    functions: [{ functionName: 'readAgentRow', input: [{ name: 'id', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/readAgentRow.ts`);
  const outbound = unit('integrationOutbound', 'outbound', {
    connections: [
      { connectionId: 'cm', operationId: 'readAgent', consumer: 'readAgentRow' },
      { connectionId: 'cm', operationId: 'simulateAgent', consumer: 'otherUsecase' },
    ],
  }, `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.defs.ts`);
  const read = async (ref: string) => ref === '/_102034_/l2/shared/contracts/connections/cm.ts' ? catalog : null;
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [usecase, outbound], read };
  try {
    const loaded = await loadUsecaseContext(ctx as never, usecase);
    const section = loaded.human.split('## Connection gateways')[1] ?? '';
    assert.ok(section.length > 0);
    assert.match(section, /CmGateway/u);
    assert.match(section, /layer_1_external\/adapters\/integration\/outbound\.js/u);
    assert.match(section, /readAgent\(input: CmReadAgentInput/u);
    assert.equal(section.includes('simulateAgent'), false);
    assert.match(section, /resolveRepository<CmGateway>\(ctx, 'CmGateway'\)/u);
    assert.match(section, /Do not import `callConnection`/u);

    const header = loaded.header;
    const ok = [
      header,
      `import type { CmGateway } from '/_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.js';`,
      'export async function readAgentRow(input: { id: string }, ctx: RequestContext) {',
      "  const gateway = resolveRepository<CmGateway>(ctx, 'CmGateway');",
      '  return gateway.readAgent({ agentId: input.id }, ctx);',
      '}',
    ].join('\n');
    assert.deepEqual(await usecaseAnswerProblems(ctx as never, usecase, ok, []), []);

    const direct = [
      header,
      "import { callConnection } from '/_102034_/l1/server/layer_1_external/connections/callConnection.js';",
      'export async function readAgentRow(input: { id: string }, ctx: RequestContext) {',
      "  return callConnection('cm', 'readAgent', input, {});",
      '}',
    ].join('\n');
    const refused = await usecaseAnswerProblems(ctx as never, usecase, direct, []);
    assert.ok(refused.some(problem => problem.startsWith('GATEWAY_BYPASS')), refused.join('\n'));

    const plain = { run: { project: PROJECT, module: MODULE }, units: [usecase], read };
    const without = await loadUsecaseContext(plain as never, usecase);
    assert.equal(without.human.includes('## Connection gateways'), false);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

test('Connection gateways names expectVersion only for the marked operation', async () => {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
  const catalog = readFileSync(path.join(root, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
  const usecase = unit('usecase', 'changeAgent', {
    usecaseId: 'changeAgent',
    entityId: 'Tarefa',
    operation: 'update',
    functions: [{ functionName: 'changeAgent', input: [{ name: 'id', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/changeAgent.ts`);
  const outbound = unit('integrationOutbound', 'outbound', {
    connections: [
      { connectionId: 'cm', operationId: 'updateAgent', consumer: 'changeAgent' },
      { connectionId: 'cm', operationId: 'readAgent', consumer: 'changeAgent' },
    ],
  }, `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.defs.ts`);
  const read = async (ref: string) => ref === '/_102034_/l2/shared/contracts/connections/cm.ts' ? catalog : null;
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [usecase, outbound], read };
  try {
    const loaded = await loadUsecaseContext(ctx as never, usecase);
    const section = loaded.human.split('## Connection gateways')[1] ?? '';
    const update = section.split('updateAgent')[1]?.split('\n')[0] ?? '';
    const readLine = section.split('readAgent')[1]?.split('\n')[0] ?? '';
    assert.match(update, /expectVersion/);
    assert.match(update, /invalid/);
    assert.equal(readLine.includes('expectVersion'), false);
    assert.equal(section.split('expectVersion').length, 3);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

test('Connection gateways returns the later id and names the result operation', async () => {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
  const catalog = readFileSync(path.join(root, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
  const laterUsecase = unit('usecase', 'createAgent', {
    usecaseId: 'createAgent',
    entityId: 'Tarefa',
    operation: 'create',
    functions: [{ functionName: 'createAgent', input: [{ name: 'prompt', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/createAgent.ts`);
  const nowUsecase = unit('usecase', 'readAgent', {
    usecaseId: 'readAgent',
    entityId: 'Tarefa',
    operation: 'read',
    functions: [{ functionName: 'readAgent', input: [{ name: 'id', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/readAgent.ts`);
  const outbound = unit('integrationOutbound', 'outbound', {
    connections: [
      { connectionId: 'cm', operationId: 'createAgent', consumer: 'createAgent' },
      { connectionId: 'cm', operationId: 'readAgent', consumer: 'readAgent' },
    ],
  }, `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.defs.ts`);
  const read = async (ref: string) => ref === '/_102034_/l2/shared/contracts/connections/cm.ts' ? catalog : null;
  try {
    const later = await loadUsecaseContext({ run: { project: PROJECT, module: MODULE }, units: [laterUsecase, outbound], read } as never, laterUsecase);
    const laterSection = later.human.split('## Connection gateways')[1] ?? '';
    const createLine = laterSection.split('createAgent')[1] ?? '';
    assert.match(createLine, /returns the id of the work/u);
    assert.match(createLine, /returns that id as its output/u);
    assert.match(createLine, /correlation table/u);
    assert.match(createLine, /agentDraftReady/u);
    const now = await loadUsecaseContext({ run: { project: PROJECT, module: MODULE }, units: [nowUsecase, outbound], read } as never, nowUsecase);
    const nowSection = now.human.split('## Connection gateways')[1] ?? '';
    assert.equal(nowSection.includes('id of the work'), false);
    assert.equal(nowSection.includes('correlation'), false);
    assert.equal(nowSection.includes('agentDraftReady'), false);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

test('an external entity usecase lists the gateway effect and no entity port', async () => {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
  const catalog = readFileSync(path.join(root, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
  const usecase = unit('usecase', 'readAgent', {
    usecaseId: 'readAgent',
    entityId: 'Agent',
    operation: 'get',
    functions: [{ functionName: 'readAgent', input: [{ name: 'id', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/readAgent.ts`, [`_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/agentRepository.defs.ts`]);
  const entity = unit('domainEntity', 'agent', { entityId: 'Agent', storageTarget: 'external' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/agent.ts`);
  const port = unit('repositoryPort', 'agentRepository', { entityId: 'Agent', interfaceName: 'AgentRepository' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/agentRepository.ts`);
  const table = unit('domainEntity', 'tarefa', { entityId: 'Tarefa', storageTarget: 'moduleDatabase' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/tarefa.ts`);
  const tablePort = unit('repositoryPort', 'tarefaRepository', { entityId: 'Tarefa', interfaceName: 'TarefaRepository' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/tarefaRepository.ts`);
  const outbound = unit('integrationOutbound', 'outbound', {
    connections: [
      { connectionId: 'cm', operationId: 'readAgent', consumer: 'readAgent', effect: 'read', entityRefs: ['Agent'] },
    ],
  }, `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.defs.ts`);
  const read = async (ref: string) => ref === '/_102034_/l2/shared/contracts/connections/cm.ts' ? catalog : null;
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [usecase, entity, port, table, tablePort, outbound], read };
  try {
    const loaded = await loadUsecaseContext(ctx as never, usecase);
    const section = loaded.human.split('## Connection gateways')[1] ?? '';
    assert.match(section, /CmGateway/u);
    assert.match(section, /Covers effect `read`/u);
    assert.match(section, /kept outside this module/u);
    assert.match(section, /Do not call `resolveRepository` for the entity repository/u);
    assert.equal(loaded.human.includes('Dependency repositoryPort agentRepository'), false);
    assert.equal(loaded.human.includes('AgentRepository'), false);

    const header = loaded.header;
    const refused = await usecaseAnswerProblems(ctx as never, usecase, [
      header,
      "import type { AgentRepository } from '/_" + PROJECT + "_/l1/" + MODULE + "/layer_2_application/ports/agentRepository.js';",
      'export async function readAgent(input: { id: string }, ctx: RequestContext) {',
      "  return resolveRepository<AgentRepository>(ctx, 'AgentRepository');",
      '}',
    ].join('\n'), []);
    assert.ok(refused.some(problem => problem.includes('connection gateway') && problem.includes('AgentRepository')), refused.join('\n'));

    const moduleUsecase = unit('usecase', 'getTarefa', {
      usecaseId: 'getTarefa',
      entityId: 'Tarefa',
      operation: 'get',
      functions: [{ functionName: 'getTarefa', input: [{ name: 'id', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
    }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/getTarefa.ts`);
    const moduleCtx = { run: { project: PROJECT, module: MODULE }, units: [moduleUsecase, table, tablePort], read };
    const moduleLoaded = await loadUsecaseContext(moduleCtx as never, moduleUsecase);
    const kept = await usecaseAnswerProblems(moduleCtx as never, moduleUsecase, [
      moduleLoaded.header,
      "import type { TarefaRepository } from '/_" + PROJECT + "_/l1/" + MODULE + "/layer_2_application/ports/tarefaRepository.js';",
      'export async function getTarefa(input: { id: string }, ctx: RequestContext) {',
      "  return resolveRepository<TarefaRepository>(ctx, 'tarefaRepository');",
      '}',
    ].join('\n'), []);
    assert.deepEqual(kept, []);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

test('an external entity contributes no derived paths to the usecase gate, as an MDM entity; a module entity keeps them', async () => {
  const derivedOntology = (title: string): string => ontology({ title, record: { fields: { total: { type: 'number', derived: true } } } });
  const refOf = (name: string): string => `_${PROJECT}_/l4/${MODULE}/ontology/${name}.defs.ts`;
  const files = new Map<string, string>([
    [refOf('Tarefa'), derivedOntology('Tarefa')],
    [refOf('Catalogo'), derivedOntology('Catalogo')],
    [refOf('Participante'), derivedOntology('Participante')],
  ]);
  const entity = (id: string, storageTarget: string): M12Unit => unit('domainEntity', id.toLowerCase(), { entityId: id, storageTarget }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/${id.toLowerCase()}.ts`, [refOf(id)]);
  const ctx = {
    run: { project: PROJECT, module: MODULE },
    units: [entity('Tarefa', 'moduleDatabase'), entity('Catalogo', 'external'), entity('Participante', 'mdm')],
    read: async (ref: string) => files.get(ref) ?? null,
  };
  const names = await entityNames(ctx as never);
  const derivedOf = (id: string): string[] | undefined => names.find(item => item.entityId === id)?.derived;
  assert.deepEqual(derivedOf('Tarefa'), ['total']);
  assert.deepEqual(derivedOf('Catalogo'), []);
  assert.deepEqual(derivedOf('Participante'), []);
});

test('the Task section of a write on an external entity says the external system meets the rules; a module entity still enforces them', async () => {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  const read = async (): Promise<string | null> => null;
  const build = (entityId: string, storageTarget: string): { ctx: unknown; usecase: M12Unit } => {
    const usecase = unit('usecase', 'createThing', {
      usecaseId: 'createThing',
      entityId,
      operation: 'create',
      functions: [{ functionName: 'createThing', input: [{ name: 'name', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
      rulePlan: [{ ruleId: 'nameRequired', enforcement: 'local', origin: 'l4/fila/rules.defs.ts#nameRequired' }],
    }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/createThing.ts`);
    const entity = unit('domainEntity', entityId.toLowerCase(), { entityId, storageTarget }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/${entityId.toLowerCase()}.ts`);
    const port = unit('repositoryPort', `${entityId.toLowerCase()}Repository`, { entityId, interfaceName: `${entityId}Repository` }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/${entityId.toLowerCase()}Repository.ts`);
    return { ctx: { run: { project: PROJECT, module: MODULE }, units: [usecase, entity, port], read }, usecase };
  };
  const taskOf = (human: string): string => human.split('## Task')[1]?.split('\n## ')[0] ?? '';
  try {
    const external = build('Agent', 'external');
    const externalTask = taskOf((await loadUsecaseContext(external.ctx as never, external.usecase)).human);
    assert.match(externalTask, /The entity is external/u);
    assert.match(externalTask, /ruleIds: \["nameRequired"\]/u);
    assert.equal(externalTask.includes('Enforce every rule'), false);
    const local = build('Tarefa', 'moduleDatabase');
    const localTask = taskOf((await loadUsecaseContext(local.ctx as never, local.usecase)).human);
    assert.match(localTask, /Enforce every rule/u);
    assert.equal(localTask.includes('The entity is external'), false);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});
