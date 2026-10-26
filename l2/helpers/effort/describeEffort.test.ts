/// <mls fileReference="_102021_/l2/helpers/effort/describeEffort.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test, { mock } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource } from '/_102021_/l2/helpers/l1Defs/definition.js';
import {
  describeEffort,
  describeEffortFrom,
  effortPromptFrom,
  finishEffortFrom,
} from '/_102021_/l2/helpers/effort/describeEffort.js';
import type { EffortInput, EffortPromptRequest, L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, 'fixtures/agendaClinica');

function loadAgenda(): Record<string, string> {
  const defs: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (!name.endsWith('.defs.txt')) continue;
      const rel = relative(FIXTURE, abs).replace(/\.txt$/, '.ts');
      defs[`l1/agendaClinica/${rel}`] = readFileSync(abs, 'utf8');
    }
  };
  walk(FIXTURE);
  return defs;
}

const AGENDA = loadAgenda();

function loadModule(moduleName: string): Record<string, string> {
  const root = join(HERE, 'fixtures', moduleName);
  const defs: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (!name.endsWith('.defs.txt')) continue;
      const rel = relative(root, abs).replace(/\.txt$/, '.ts');
      defs[`l1/${moduleName}/${rel}`] = readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return defs;
}

const TAREFAS = loadModule('tarefas');

function input(item: L4DiffItem, module = 'agendaClinica'): EffortInput {
  return { module, base: { baseId: 'mls-102047', revisionId: '79f94cc' }, item };
}

function rule(id: string, op: L4DiffItem['op'] = 'changed'): L4DiffItem {
  return { changeId: `rule:${id}`, kind: 'rule', op, entity: '', source: 'l4/agendaClinica/rules.defs.ts' };
}

void test('rule changed aplica usecase, entidade e request, e ignora rulePlan herdado', () => {
  const answer = describeEffortFrom(input(rule('anotacaoObrigatoriaNoAtendimento')), AGENDA);
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.create, []);
  assert.deepEqual(answer.remove, []);
  assert.deepEqual(answer.regenerateDefs, []);
  assert.deepEqual(answer.runAgents, []);
  assert.deepEqual(answer.master, { project: '102021', kind: 'l1', device: 'web' });
  assert.deepEqual(
    answer.materialize.map(unit => `${unit.kind}:${unit.id}`),
    ['entity:consulta', 'request:agenda_diaria', 'usecase:registrarAtendimento'],
  );
  assert.deepEqual(
    answer.materialize.map(unit => unit.path),
    [
      'l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts',
      'l1/agendaClinica/layer_2_application/requests/agenda_diaria.defs.ts',
      'l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts',
    ],
  );
  const ids = new Set(answer.materialize.map(unit => unit.id));
  assert.equal(ids.has('listConsulta'), false);
  assert.equal(ids.has('getConsulta'), false);
});

void test('consultaSemConflito aplica a entidade e o request que citam a regra', () => {
  const answer = describeEffortFrom(input(rule('consultaSemConflito')), AGENDA);
  assert.equal(answer.status, 'computed');
  assert.deepEqual(
    answer.materialize.map(unit => `${unit.kind}:${unit.id}`),
    ['entity:consulta', 'request:consultas', 'usecase:createConsulta'],
  );
});

void test('regra inexistente abend', () => {
  const answer = describeEffortFrom(input(rule('naoExiste')), AGENDA);
  assert.equal(answer.status, 'abend');
  assert.equal(answer.abend?.reason, 'nenhum def aplica o id');
});

function fieldChange(before: Record<string, unknown>, after: Record<string, unknown>): L4DiffItem {
  return {
    changeId: 'field:details.attendanceNote',
    kind: 'field',
    op: 'changed',
    entity: 'Consulta',
    source: 'l4',
    before,
    after,
  };
}

void test('field só com title diferente é computed vazio, mesmo sem defs', () => {
  const item = fieldChange({ title: 'Nota', type: 'string' }, { title: 'Anotação', type: 'string' });
  for (const defs of [AGENDA, {}]) {
    const answer = describeEffortFrom(input(item), defs);
    assert.equal(answer.status, 'computed');
    assert.deepEqual(answer.regenerateDefs, []);
    assert.deepEqual(answer.materialize, []);
    assert.deepEqual(answer.runAgents, []);
  }
});

void test('field changed sem before e after continua abend', () => {
  const item = fieldChange({ title: 'Nota', type: 'string' }, { title: 'Nota', type: 'text' });
  delete item.before;
  delete item.after;
  const answer = describeEffortFrom(input(item), AGENDA);
  assert.equal(answer.status, 'abend');
  assert.equal(answer.abend?.reason, 'kind/op fora da v1: field changed');
});

void test('field changed sem forma abend; task added sem processo fica vazio; grant changed entra na v1', () => {
  const field = describeEffortFrom(input({
    changeId: 'field:attendanceNote', kind: 'field', op: 'changed', entity: 'Consulta', source: 'l4',
  }), AGENDA);
  assert.equal(field.status, 'abend');
  assert.deepEqual(field.materialize, []);
  const task = describeEffortFrom(input({
    changeId: 'task:abrirAgenda', kind: 'task', op: 'added', entity: '', source: 'l4',
  }), AGENDA);
  assert.equal(task.status, 'computed');
  assert.deepEqual(task.regenerateDefs, []);
  assert.deepEqual(task.materialize, []);
  const grant = describeEffortFrom(input({
    changeId: 'grant:recepcionista', kind: 'grant', op: 'changed', entity: '', source: 'l4',
  }), AGENDA);
  assert.equal(grant.status, 'computed');
  assert.equal(grant.contract, 'keep');
});

void test('módulo sem defs abend', () => {
  const answer = describeEffortFrom(input(rule('anotacaoObrigatoriaNoAtendimento')), {});
  assert.equal(answer.status, 'abend');
  assert.equal(answer.abend?.reason, 'módulo sem defs gerados');
});

void test('describeEffort lê o .defs.ts do actualProject e ignora o do master', async () => {
  const defPath = 'l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts';
  const source = AGENDA[defPath];
  assert.equal(typeof source, 'string');
  const item = input(rule('anotacaoObrigatoriaNoAtendimento'));
  const file = {
    project: 102047,
    level: 1,
    folder: 'agendaClinica/layer_2_application/usecases',
    shortName: 'registrarAtendimento',
    extension: '.defs.ts',
    getContent: async () => source,
  };
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls?: unknown }).mls = { actualProject: 102047, stor: { files: { registrar: file } } };
  try {
    const answer = await describeEffort(item);
    assert.deepEqual(answer, describeEffortFrom(item, { [defPath]: source }));
    assert.equal(answer.status, 'computed');
    file.project = 102021;
    const masterCopy = await describeEffort(item);
    assert.equal(masterCopy.status, 'abend');
    assert.equal(masterCopy.abend?.reason, 'módulo sem defs gerados');
  } finally {
    (globalThis as { mls?: unknown }).mls = previous;
  }
});

void test('describeEffort lê defs de persistência sob l1 e ignora pipeline', async () => {
  const source = TAREFAS['l1/tarefas/layer_1_external/adapters/persistence/tarefa.defs.ts'];
  assert.equal(typeof source, 'string');
  const kept = {
    project: 102047,
    level: 1,
    folder: 'tarefas/layer_1_external/adapters/persistence',
    shortName: 'tarefa',
    extension: '.defs.ts',
    getContent: async () => source,
  };
  const dropped = { ...kept, folder: 'tarefas/pipeline/adapters', shortName: 'tarefa' };
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls?: unknown }).mls = { actualProject: 102047, stor: { files: { kept, dropped } } };
  try {
    const answer = await describeEffort(input({
      changeId: 'field:prioridade',
      kind: 'field',
      op: 'changed',
      entity: 'Tarefa',
      source: 'l4',
      before: { required: true, title: 'Prioridade', description: '', type: 'enum', derived: false, fieldId: 'prioridade' },
      after: { required: false, title: 'Prioridade', description: '', type: 'enum', derived: false, fieldId: 'prioridade' },
    }, 'tarefas'));
    assert.equal(answer.status, 'computed');
    assert.deepEqual(keysOf(answer.materialize), ['table:tarefa']);
  } finally {
    (globalThis as { mls?: unknown }).mls = previous;
  }
});

void test('describeEffort sem arquivos de produto abend', async () => {
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls?: unknown }).mls = { stor: { files: {} } };
  try {
    const answer = await describeEffort(input(rule('anotacaoObrigatoriaNoAtendimento')));
    assert.equal(answer.status, 'abend');
    assert.equal(answer.abend?.reason, 'módulo sem defs gerados');
  } finally {
    (globalThis as { mls?: unknown }).mls = previous;
  }
});

function itemOf(
  kind: L4DiffItem['kind'],
  op: L4DiffItem['op'],
  changeId: string,
  moduleName: string,
): EffortInput {
  return input({ changeId, kind, op, entity: '', source: 'l4' }, moduleName);
}

function keysOf(units: { kind: string; id: string }[]): string[] {
  return units.map(unit => `${unit.kind}:${unit.id}`);
}

void test('regra removida regenera e materializa quem cita; sem citação fica vazio', () => {
  const removed = describeEffortFrom(itemOf('rule', 'removed', 'rule:devolucaoExigeMotivo', 'tarefas'), TAREFAS);
  assert.equal(removed.status, 'computed');
  assert.equal(removed.contract, 'keep');
  assert.deepEqual(removed.create, []);
  assert.deepEqual(removed.remove, []);
  const cited = [
    'entity:tarefa',
    'request:inicio',
    'request:minhas_tarefas',
    'usecase:devolver',
  ];
  assert.deepEqual(keysOf(removed.regenerateDefs), cited);
  assert.deepEqual(keysOf(removed.materialize), cited);
  assert.deepEqual(removed.regenerateDefs.map(unit => unit.path), removed.materialize.map(unit => unit.path));

  const none = describeEffortFrom(itemOf('rule', 'removed', 'rule:naoExiste', 'tarefas'), TAREFAS);
  assert.equal(none.status, 'computed');
  assert.deepEqual(none.regenerateDefs, []);
  assert.deepEqual(none.materialize, []);
  assert.deepEqual(none.remove, []);
});

void test('regra alterada no módulo de tarefas continua só em materialize', () => {
  const answer = describeEffortFrom(itemOf('rule', 'changed', 'rule:resumoDiarioOitoHoras', 'tarefas'), TAREFAS);
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.create, []);
  assert.deepEqual(answer.remove, []);
  assert.deepEqual(answer.regenerateDefs, []);
  assert.deepEqual(keysOf(answer.materialize), [
    'entity:tarefa',
    'request:inicio',
    'usecase:createTarefa',
    'usecase:updateTarefa',
  ]);
});

void test('processo e tarefa removidos no workflow; ausentes ficam vazios', () => {
  const process = describeEffortFrom(
    itemOf('process', 'removed', 'process:resumoDiarioTarefas', 'tarefas'),
    TAREFAS,
  );
  assert.equal(process.status, 'computed');
  assert.equal(process.contract, 'keep');
  assert.deepEqual(process.create, []);
  assert.deepEqual(process.regenerateDefs, []);
  assert.deepEqual(process.materialize, []);
  assert.deepEqual(keysOf(process.remove), ['workflow:resumoDiarioTarefas']);
  assert.deepEqual(process.remove.map(unit => unit.path), [
    'l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.defs.ts',
  ]);

  const task = describeEffortFrom(
    itemOf('task', 'removed', 'task:resumoDiarioTarefas.avisarVencendo', 'tarefas'),
    TAREFAS,
  );
  assert.equal(task.status, 'computed');
  assert.deepEqual(keysOf(task.regenerateDefs), ['workflow:resumoDiarioTarefas']);
  assert.deepEqual(keysOf(task.materialize), ['workflow:resumoDiarioTarefas']);
  assert.deepEqual(task.remove, []);
  assert.deepEqual(task.regenerateDefs.map(unit => unit.path), process.remove.map(unit => unit.path));

  const missingProcess = describeEffortFrom(itemOf('process', 'removed', 'process:naoExiste', 'tarefas'), TAREFAS);
  assert.equal(missingProcess.status, 'computed');
  assert.deepEqual(missingProcess.remove, []);
  const missingTask = describeEffortFrom(itemOf('task', 'removed', 'task:naoExiste.passo', 'tarefas'), TAREFAS);
  assert.equal(missingTask.status, 'computed');
  assert.deepEqual(missingTask.regenerateDefs, []);
  assert.deepEqual(missingTask.materialize, []);
});

function addedRule(id: string, description: string): EffortInput {
  return input({
    changeId: `rule:${id}`,
    kind: 'rule',
    op: 'added',
    entity: '',
    source: 'l4',
    after: { ruleId: id, description },
  }, 'tarefas');
}

function existingUsecaseEnum(request: EffortPromptRequest): string[] {
  const schema = request.schema as {
    properties: { existing: { items: { properties: { usecase: { enum: string[] } } } } };
  };
  return [...schema.properties.existing.items.properties.usecase.enum].sort();
}

function usecaseIds(defs: Record<string, string>): string[] {
  const ids: string[] = [];
  for (const source of Object.values(defs)) {
    const parsed = parseDefinitionSource(source);
    if (!('definition' in parsed) || !parsed.definition || typeof parsed.definition !== 'object') continue;
    const definition = parsed.definition as { artifactType?: string; data?: { usecaseId?: unknown } };
    if (definition.artifactType === 'usecase' && typeof definition.data?.usecaseId === 'string') {
      ids.push(definition.data.usecaseId);
    }
  }
  return [...new Set(ids)].sort();
}

void test('effortPrompt só para regra adicionada, com o enum dos ids das fixtures', () => {
  const phrase = 'Uma tarefa nova começa com prioridade média.';
  const request = effortPromptFrom(addedRule('novaTarefaPrioridadeMedia', phrase), TAREFAS);
  assert.ok(request);
  assert.equal(request.prompt.includes('novaTarefaPrioridadeMedia'), true);
  assert.equal(request.prompt.includes(phrase), true);
  assert.deepEqual(existingUsecaseEnum(request), usecaseIds(TAREFAS));
  assert.equal('create' in (request.schema as { properties: object }).properties, false);
  assert.equal(request.prompt.includes("A rule about data that an operation writes is guaranteed in that operation's usecase: pick it (existing). The requests that call it follow."), true);
  assert.equal(request.prompt.includes('New routes or usecases are not chosen here: they come from the page contract.'), true);
  assert.equal(request.prompt.includes('Nothing on the backend only for a rule about display alone; then say why in reason.'), true);
  assert.equal(effortPromptFrom(itemOf('rule', 'changed', 'rule:devolucaoExigeMotivo', 'tarefas'), TAREFAS), null);
  assert.equal(effortPromptFrom(itemOf('rule', 'removed', 'rule:devolucaoExigeMotivo', 'tarefas'), TAREFAS), null);
  assert.equal(effortPromptFrom(fieldItem('changed', 'prioridade', 'Tarefa', { required: true }, { required: false }), TAREFAS), null);
});

function fieldItem(
  op: L4DiffItem['op'],
  path: string,
  entity: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): EffortInput {
  const item: L4DiffItem = { changeId: `field:${path}`, kind: 'field', op, entity, source: 'l4' };
  if (before) item.before = before;
  if (after) item.after = after;
  return input(item, 'tarefas');
}

const FIELD_BASE = { fieldId: 'prioridade', type: 'enum', derived: false, title: 'Prioridade', description: '' };

void test('F1 required muda só materialize da entidade, tabela, adaptador, escritores e requests que citam', () => {
  const answer = describeEffortFrom(fieldItem('changed', 'prioridade', 'Tarefa', { ...FIELD_BASE, required: true }, { ...FIELD_BASE, required: false }), TAREFAS);
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.regenerateDefs, []);
  assert.deepEqual(keysOf(answer.materialize), [
    'entity:tarefa',
    'repository:tarefaRepository',
    'request:inicio',
    'request:minhas_tarefas',
    'request:tarefas_equipe',
    'table:tarefa',
    'usecase:createTarefa',
    'usecase:updateTarefa',
  ]);
});

void test('F2 prazo só texto fica vazio', () => {
  const before = { fieldId: 'prazo', type: 'date', derived: false, title: 'Prazo', description: 'Data' };
  const after = { ...before, title: 'Vencimento', description: 'Dia' };
  const answer = describeEffortFrom(fieldItem('changed', 'prazo', 'Tarefa', before, after), TAREFAS);
  assert.equal(answer.status, 'computed');
  assert.deepEqual(answer.materialize, []);
  assert.deepEqual(answer.regenerateDefs, []);
});

void test('F3 campo novo em details regenera e materializa sem tabela', () => {
  const answer = describeEffortFrom(fieldItem('added', 'details.estimativaHoras', 'Tarefa', undefined, {
    fieldId: 'details.estimativaHoras', type: 'number', derived: false, title: 'Horas', description: '',
  }), TAREFAS);
  const keys = [
    'entity:tarefa',
    'repository:tarefaRepository',
    'request:minhas_tarefas',
    'request:tarefas_equipe',
    'usecase:createTarefa',
    'usecase:updateTarefa',
  ];
  assert.equal(answer.status, 'computed');
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
  assert.equal(keysOf(answer.materialize).includes('table:tarefa'), false);
});

void test('F4 valor novo regenera entidade e tabela e materializa quem cita prioridade', () => {
  const before = { ...FIELD_BASE, values: ['baixa', 'media', 'alta'] };
  const after = { ...FIELD_BASE, values: ['baixa', 'media', 'alta', 'urgente'] };
  const answer = describeEffortFrom(fieldItem('changed', 'prioridade', 'Tarefa', before, after), TAREFAS);
  assert.deepEqual(keysOf(answer.regenerateDefs), ['entity:tarefa', 'table:tarefa']);
  assert.deepEqual(keysOf(answer.materialize), [
    'entity:tarefa',
    'repository:tarefaRepository',
    'request:inicio',
    'request:minhas_tarefas',
    'request:tarefas_equipe',
    'table:tarefa',
    'usecase:createTarefa',
    'usecase:updateTarefa',
  ]);
});

void test('F5 campo removido regenera e materializa quem cita, sem tabela', () => {
  const answer = describeEffortFrom(fieldItem('removed', 'details.etiquetas', 'Tarefa', {
    fieldId: 'details.etiquetas', type: 'string', derived: false, title: 'Etiquetas', description: '',
  }), TAREFAS);
  const keys = [
    'entity:tarefa',
    'repository:tarefaRepository',
    'request:minhas_tarefas',
    'usecase:createTarefa',
    'usecase:updateTarefa',
  ];
  assert.equal(answer.status, 'computed');
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
});

function defOf(artifactType: string, data: Record<string, unknown>): string {
  return `export const definition = ${JSON.stringify({ artifactType, data })} as const;\n`;
}

void test('campo removido materializa o .ts irmão que cita o segmento', () => {
  const entityPath = 'l1/mod/layer_1_domain/entities/nota.defs.ts';
  const usecasePath = 'l1/mod/layer_2_application/usecases/iniciar.defs.ts';
  const otherPath = 'l1/mod/layer_2_application/usecases/outro.defs.ts';
  const workflowPath = 'l1/mod/layer_2_application/workflows/fluxo.defs.ts';
  const defs: Record<string, string> = {
    [entityPath]: defOf('domainEntity', { entityId: 'Nota', fields: [{ name: 'rotulo.marca' }] }),
    [usecasePath]: defOf('usecase', { usecaseId: 'iniciar', entityId: 'Nota' }),
    [otherPath]: defOf('usecase', { usecaseId: 'outro', entityId: 'Nota' }),
    [workflowPath]: defOf('workflowProcess', { processId: 'fluxo' }),
  };
  const sources: Record<string, string> = {
    [entityPath]: 'const marca = 1;',
    [usecasePath]: 'return marca;',
    [otherPath]: 'const marcaX = 1; const xmarca = 2;',
    [workflowPath]: 'step(marca);',
  };
  const removed = fieldItem('removed', 'rotulo.marca', 'Nota', { fieldId: 'rotulo.marca' });
  const answer = describeEffortFrom(removed, defs, sources);
  assert.deepEqual(keysOf(answer.regenerateDefs), ['entity:nota']);
  assert.deepEqual(keysOf(answer.materialize), ['entity:nota', 'usecase:iniciar', 'workflow:fluxo']);
  assert.equal(answer.regenerateDefs.filter(unit => unit.kind === 'entity').length, 1);
  assert.deepEqual(describeEffortFrom(removed, defs), describeEffortFrom(removed, defs, undefined));
  const added = describeEffortFrom(
    fieldItem('added', 'rotulo.marca', 'Nota', undefined, { fieldId: 'rotulo.marca' }),
    defs,
    sources,
  );
  assert.deepEqual(keysOf(added.materialize), ['entity:nota']);
  assert.deepEqual(keysOf(added.regenerateDefs), ['entity:nota']);
});

void test('describeEffort lê o .ts irmão e materializa quem cita o segmento', async () => {
  const folder = 'tarefas/layer_2_application/usecases';
  const defPath = 'l1/tarefas/layer_2_application/usecases/iniciar.defs.ts';
  const defs = { [defPath]: defOf('usecase', { usecaseId: 'iniciar', entityId: 'Nota' }) };
  const sources = { [defPath]: 'return marca;' };
  const removed = fieldItem('removed', 'rotulo.marca', 'Nota', { fieldId: 'rotulo.marca' });
  const file = {
    project: 102047,
    level: 1,
    folder,
    shortName: 'iniciar',
    status: 'active',
    getContent: async () => '',
  };
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls?: unknown }).mls = {
    actualProject: 102047,
    stor: {
      files: {
        def: { ...file, extension: '.defs.ts', getContent: async () => defs[defPath] },
        source: { ...file, extension: '.ts', getContent: async () => sources[defPath] },
      },
    },
  };
  try {
    const answer = await describeEffort(removed);
    assert.deepEqual(answer, describeEffortFrom(removed, defs, sources));
    assert.deepEqual(keysOf(answer.materialize), ['usecase:iniciar']);
    assert.deepEqual(answer.regenerateDefs, []);
  } finally {
    (globalThis as { mls?: unknown }).mls = previous;
  }
});

const GRANT_BASE = {
  grantId: 'membroTarefasProprias',
  title: 'Tarefas próprias',
  description: 'Vê as próprias tarefas',
  actorRef: 'membroEquipe',
  entityRefs: ['Tarefa'],
  disclosure: 'fullRecord',
  dataScope: { mode: 'own' },
};

function grantItem(
  op: L4DiffItem['op'],
  grantId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): EffortInput {
  const item: L4DiffItem = { changeId: `grant:${grantId}`, kind: 'grant', op, entity: '', source: 'l4' };
  if (before) item.before = before;
  if (after) item.after = after;
  return input(item, 'tarefas');
}

void test('A1 grant só com description fica vazio e avisa o item', () => {
  const before = { ...GRANT_BASE };
  const after = { ...GRANT_BASE, description: 'Outra frase' };
  const info = mock.method(console, 'info', () => {});
  try {
    const answer = describeEffortFrom(grantItem('changed', 'membroTarefasProprias', before, after), TAREFAS);
    assert.equal(answer.status, 'computed');
    assert.equal(answer.contract, 'keep');
    assert.deepEqual(answer.create, []);
    assert.deepEqual(answer.remove, []);
    assert.deepEqual(answer.regenerateDefs, []);
    assert.deepEqual(answer.materialize, []);
    assert.deepEqual(info.mock.calls[0]?.arguments, ['grant:membroTarefasProprias']);
    assert.equal(effortPromptFrom(grantItem('changed', 'membroTarefasProprias', before, after), TAREFAS), null);
  } finally {
    info.mock.restore();
  }
});

void test('A2 dataScope muda regenera quem cita e materializa o request da página', () => {
  const before = { ...GRANT_BASE, dataScope: { mode: 'own' } };
  const after = { ...GRANT_BASE, dataScope: { mode: 'all' } };
  const answer = describeEffortFrom(grantItem('changed', 'membroTarefasProprias', before, after), TAREFAS);
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.create, []);
  assert.deepEqual(answer.remove, []);
  assert.deepEqual(keysOf(answer.regenerateDefs), [
    'authority:authorityMap',
    'controller:inicio',
    'controller:minhas_tarefas',
    'scope:accessScope',
    'seeds:seeds',
  ]);
  assert.deepEqual(keysOf(answer.materialize), [
    'authority:authorityMap',
    'controller:inicio',
    'controller:minhas_tarefas',
    'request:inicio',
    'request:minhas_tarefas',
    'scope:accessScope',
    'seeds:seeds',
  ]);
  for (const key of [...keysOf(answer.regenerateDefs), ...keysOf(answer.materialize)]) {
    assert.equal(key.startsWith('shared:') || key.startsWith('route:'), false, key);
  }
});

void test('A3 grant novo regenera e materializa mapa, escopo e sementes', () => {
  const after = {
    grantId: 'membroVeParticipantes',
    actorRef: 'membroEquipe',
    entityRefs: ['Participante'],
    disclosure: 'fullRecord',
    dataScope: { mode: 'organization' },
  };
  const answer = describeEffortFrom(grantItem('added', 'membroVeParticipantes', undefined, after), TAREFAS);
  const keys = ['authority:authorityMap', 'scope:accessScope', 'seeds:seeds'];
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
  assert.equal(keysOf(answer.materialize).some(key => key.startsWith('controller:')), false);
});

void test('A4 grant removido regenera e materializa quem cita, sem request', () => {
  const before = { ...GRANT_BASE, grantId: 'membroChecklistPropria' };
  const answer = describeEffortFrom(grantItem('removed', 'membroChecklistPropria', before), TAREFAS);
  const keys = [
    'authority:authorityMap',
    'controller:minhas_tarefas',
    'scope:accessScope',
    'seeds:seeds',
  ];
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.create, []);
  assert.deepEqual(answer.remove, []);
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
  assert.equal(effortPromptFrom(grantItem('removed', 'membroChecklistPropria', before), TAREFAS), null);
});

void test('F6 maxLength materializa escritores e requests de escrita', () => {
  const before = { fieldId: 'titulo', type: 'string', derived: false, title: 'Título', description: '', maxLength: 200 };
  const after = { ...before, maxLength: 100 };
  const answer = describeEffortFrom(fieldItem('changed', 'titulo', 'Tarefa', before, after), TAREFAS);
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.regenerateDefs, []);
  assert.deepEqual(keysOf(answer.materialize), [
    'request:minhas_tarefas',
    'request:tarefas_equipe',
    'usecase:createTarefa',
    'usecase:updateTarefa',
  ]);
});

void test('finishEffort aplica a resposta gravada do R1 e do R4', () => {
  const r1 = addedRule('novaTarefaPrioridadeMedia', 'Uma tarefa nova começa com prioridade média.');
  const recordedR1 = JSON.parse(readFileSync(join(HERE, 'fixtures/tarefas/model/r1.json'), 'utf8'));
  const answer = finishEffortFrom(r1, TAREFAS, recordedR1);
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.create, []);
  assert.deepEqual(answer.remove, []);
  const cited = ['request:minhas_tarefas', 'usecase:createTarefa'];
  assert.deepEqual(keysOf(answer.regenerateDefs), cited);
  assert.deepEqual(keysOf(answer.materialize), cited);

  const emptyReason = 'The rule is about display alone.';
  const info = mock.method(console, 'info', () => {});
  const empty = finishEffortFrom(r1, TAREFAS, { existing: [], reason: emptyReason });
  info.mock.restore();
  assert.equal(info.mock.calls.length, 1);
  assert.deepEqual(info.mock.calls[0]?.arguments, [r1.item.changeId, emptyReason]);
  assert.equal(empty.status, 'computed');
  assert.equal(empty.contract, 'keep');
  assert.deepEqual(empty.create, []);
  assert.deepEqual(empty.remove, []);
  assert.deepEqual(empty.regenerateDefs, []);
  assert.deepEqual(empty.materialize, []);

  const entityOnly = finishEffortFrom(r1, TAREFAS, {
    existing: [{ unit: 'tarefa', kind: 'entity' }],
    reason: 'entity only',
  });
  assert.equal(entityOnly.status, 'abend');
  assert.equal(entityOnly.abend?.reason.includes('schema'), true);
});

void test('finishEffort abenda unidade inexistente, nome existente e forma fora do schema', () => {
  const r1 = addedRule('novaTarefaPrioridadeMedia', 'Uma tarefa nova começa com prioridade média.');
  const missing = finishEffortFrom(r1, TAREFAS, {
    existing: [{ usecase: 'naoExiste' }],
    reason: 'no',
  });
  assert.equal(missing.status, 'abend');
  assert.equal(missing.abend?.reason.includes('naoExiste'), true);

  const withCreate = finishEffortFrom(r1, TAREFAS, {
    existing: [],
    create: [{ route: 'rotaNova', page: 'minhas_tarefas', usecase: 'usecaseNovo' }],
    reason: 'no',
  });
  assert.equal(withCreate.status, 'abend');
  assert.equal(withCreate.abend?.reason.includes('schema'), true);

  const emptyReason = finishEffortFrom(r1, TAREFAS, { existing: [], reason: '   ' });
  assert.equal(emptyReason.status, 'abend');
  assert.equal(emptyReason.abend?.reason, 'empty answer for a new rule needs a reason');

  const malformed = finishEffortFrom(r1, TAREFAS, { existing: [] });
  assert.equal(malformed.status, 'abend');
  assert.equal(malformed.abend?.reason.includes('schema'), true);
  assert.equal(malformed.abend?.reason.includes('nada a fazer'), false);
});

void test('describeEffort só importa helpers e solution, e não escreve nem busca rede', () => {
  const source = readFileSync(join(HERE, 'describeEffort.ts'), 'utf8');
  const specs = [...source.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
  assert.ok(specs.length > 0);
  const allowed = (spec: string) =>
    spec.startsWith('/_102021_/l2/helpers/') || spec.startsWith('/_102035_/l2/solution/');
  for (const spec of specs) assert.equal(allowed(spec), true, spec);
  for (const banned of ['writeFile', 'writeJson', 'writeText', 'saveFile', 'fetch']) {
    assert.equal(source.includes(banned), false, banned);
  }
});

const JOURNEY_BASE = {
  journeyId: 'criarTarefa',
  index: { journeyId: 'criarTarefa', actorRef: 'membro', title: 'Criar' },
  actorRef: 'membro',
  title: 'Criar',
  description: '',
  goal: 'Abrir',
  outcome: 'Aberta',
  entry: 'inicio',
};

function journeyItem(
  op: L4DiffItem['op'],
  changeId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): EffortInput {
  const kind: L4DiffItem['kind'] = changeId.startsWith('step:') ? 'step' : 'journey';
  const item: L4DiffItem = { changeId, kind, op, entity: '', source: 'l4' };
  if (before) item.before = before;
  if (after) item.after = after;
  return input(item, 'tarefas');
}

void test('J1 journey prose only is an empty computed answer', () => {
  const after = {
    ...JOURNEY_BASE,
    title: 'Criar tarefa',
    goal: 'Abrir a tarefa',
    index: { ...JOURNEY_BASE.index, title: 'Criar tarefa' },
  };
  const info = mock.method(console, 'info', () => {});
  try {
    const answer = describeEffortFrom(journeyItem('changed', 'journey:criarTarefa', JOURNEY_BASE, after), TAREFAS);
    assert.equal(answer.status, 'computed');
    assert.equal(answer.contract, 'keep');
    assert.deepEqual(answer.regenerateDefs, []);
    assert.deepEqual(answer.materialize, []);
    assert.deepEqual(info.mock.calls[0]?.arguments, ['journey:criarTarefa']);
    assert.equal(effortPromptFrom(journeyItem('changed', 'journey:criarTarefa', JOURNEY_BASE, after), TAREFAS), null);
  } finally {
    info.mock.restore();
  }
});

void test('J2 removed journey regenerates seeds and the workflow that cites it', () => {
  const answer = describeEffortFrom(journeyItem('removed', 'journey:criarTarefa', JOURNEY_BASE), TAREFAS);
  const keys = ['seeds:seeds', 'workflow:processoTarefa'];
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.create, []);
  assert.deepEqual(answer.remove, []);
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
});

void test('J3 added journey regenerates seeds only', () => {
  const after = { ...JOURNEY_BASE, journeyId: 'arquivarTarefa', index: { ...JOURNEY_BASE.index, journeyId: 'arquivarTarefa' } };
  const answer = describeEffortFrom(journeyItem('added', 'journey:arquivarTarefa', undefined, after), TAREFAS);
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(keysOf(answer.regenerateDefs), ['seeds:seeds']);
  assert.deepEqual(keysOf(answer.materialize), ['seeds:seeds']);
  const step = journeyItem('added', 'step:arquivarTarefa/guardar', undefined, { journeyId: 'arquivarTarefa', stepId: 'guardar', kind: 'command' });
  const info = mock.method(console, 'info', () => {});
  try {
    const extra = describeEffortFrom(step, TAREFAS);
    assert.equal(extra.status, 'computed');
    assert.deepEqual(extra.regenerateDefs, []);
    assert.deepEqual(extra.materialize, []);
    assert.deepEqual(info.mock.calls[0]?.arguments, ['step:arquivarTarefa/guardar', 'no backend unit cites this journey']);
    assert.equal(effortPromptFrom(step, TAREFAS), null);
  } finally {
    info.mock.restore();
  }
});

void test('J4 removed step regenerates seeds and the workflow that cites it', () => {
  const before = { journeyId: 'criarTarefa', stepId: 'preencherTarefa', kind: 'form', entity: 'Tarefa', effect: 'create' };
  const answer = describeEffortFrom(journeyItem('removed', 'step:criarTarefa/preencherTarefa', before), TAREFAS);
  const keys = ['seeds:seeds', 'workflow:processoTarefa'];
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
  const prose = describeEffortFrom(journeyItem('changed', 'step:criarTarefa/preencherTarefa', before, { ...before, title: 'Preencher', goal: 'Dados' }), TAREFAS);
  assert.deepEqual(prose.materialize, []);
  const effect = describeEffortFrom(journeyItem('changed', 'step:criarTarefa/preencherTarefa', before, { ...before, effect: 'update' }), TAREFAS);
  assert.deepEqual(keysOf(effect.materialize), keys);
});

void test('R5 removed resumoDiario regenerates the seeds that cite it', () => {
  const answer = describeEffortFrom(journeyItem('removed', 'journey:resumoDiario', { ...JOURNEY_BASE, journeyId: 'resumoDiario' }), TAREFAS);
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(keysOf(answer.regenerateDefs), ['seeds:seeds']);
  assert.deepEqual(keysOf(answer.materialize), ['seeds:seeds']);
});

function workflowChange(
  kind: L4DiffItem['kind'],
  op: L4DiffItem['op'],
  changeId: string,
  entity = '',
  before?: unknown,
  after?: unknown,
): EffortInput {
  return input({ changeId, kind, op, entity, source: 'l4', before, after }, 'tarefas');
}

void test('W1 process task and transition text only stay empty', () => {
  const cases = [
    workflowChange('process', 'changed', 'process:resumoDiarioTarefas', '', { title: 'Daily', schedule: '0 8 * * *' }, { title: 'Morning', schedule: '0 8 * * *' }),
    workflowChange('task', 'changed', 'task:processoTarefa.revisar', '', { title: 'Review', description: 'Look' }, { title: 'Check', description: 'Look again' }),
    workflowChange('transition', 'changed', 'transition:retomar', 'Tarefa', { title: 'Resume', description: 'Back' }, { title: 'Continue', description: 'Back to work' }),
  ];
  for (const item of cases) {
    const info = mock.method(console, 'info', () => undefined);
    try {
      const answer = describeEffortFrom(item, TAREFAS);
      assert.equal(answer.status, 'computed');
      assert.equal(answer.contract, 'keep');
      assert.deepEqual(answer.regenerateDefs, []);
      assert.deepEqual(answer.materialize, []);
      assert.deepEqual(answer.remove, []);
      assert.deepEqual(info.mock.calls.map(call => call.arguments), [[item.item.changeId]]);
    } finally {
      info.mock.restore();
    }
  }
});

void test('W2 process attribute change regenerates that workflow', () => {
  const answer = describeEffortFrom(
    workflowChange('process', 'changed', 'process:resumoDiarioTarefas', '', { schedule: '0 8 * * *' }, { schedule: '0 9 * * *' }),
    TAREFAS,
  );
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.remove, []);
  assert.deepEqual(keysOf(answer.regenerateDefs), ['workflow:resumoDiarioTarefas']);
  assert.deepEqual(keysOf(answer.materialize), ['workflow:resumoDiarioTarefas']);
  assert.deepEqual(answer.regenerateDefs.map(unit => unit.path), [
    'l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.defs.ts',
  ]);
});

void test('W3 task added changed and removed regenerate the process workflow', () => {
  for (const op of ['added', 'changed', 'removed'] as const) {
    const answer = describeEffortFrom(
      workflowChange('task', op, 'task:processoTarefa.revisar', '', { next: 'aceitar' }, { next: 'devolver' }),
      TAREFAS,
    );
    assert.equal(answer.status, 'computed');
    assert.deepEqual(keysOf(answer.regenerateDefs), ['workflow:processoTarefa']);
    assert.deepEqual(keysOf(answer.materialize), ['workflow:processoTarefa']);
    assert.deepEqual(answer.remove, []);
  }
});

void test('W4 transition retomar cites entity usecase workflow and the requests that use it', () => {
  const expected = [
    'entity:tarefa',
    'request:inicio',
    'request:minhas_tarefas',
    'usecase:retomar',
    'workflow:processoTarefa',
  ];
  for (const op of ['removed', 'changed'] as const) {
    const answer = describeEffortFrom(
      workflowChange('transition', op, 'transition:retomar', 'Tarefa', { guard: 'open' }, { guard: 'closed' }),
      TAREFAS,
    );
    assert.equal(answer.status, 'computed');
    assert.equal(answer.contract, 'keep');
    assert.deepEqual(answer.remove, []);
    assert.deepEqual(keysOf(answer.regenerateDefs), expected);
    assert.deepEqual(keysOf(answer.materialize), expected);
  }
  const added = describeEffortFrom(workflowChange('transition', 'added', 'transition:retomar', 'Tarefa'), TAREFAS);
  assert.deepEqual(keysOf(added.regenerateDefs), ['entity:tarefa']);
  assert.deepEqual(keysOf(added.materialize), ['entity:tarefa']);
  assert.deepEqual(added.remove, []);

  const devolver = describeEffortFrom(workflowChange('transition', 'removed', 'transition:devolver', 'Tarefa'), TAREFAS);
  assert.deepEqual(keysOf(devolver.materialize), [
    'entity:tarefa',
    'request:inicio',
    'request:minhas_tarefas',
    'usecase:devolver',
    'workflow:processoTarefa',
  ]);
  const cancelar = describeEffortFrom(workflowChange('transition', 'removed', 'transition:cancelar', 'Tarefa'), TAREFAS);
  assert.deepEqual(keysOf(cancelar.materialize), [
    'entity:tarefa',
    'request:minhas_tarefas',
    'request:tarefas_equipe',
    'usecase:cancelar',
  ]);
});

void test('process added stays outside v1', () => {
  const answer = describeEffortFrom(workflowChange('process', 'added', 'process:resumoDiarioTarefas'), TAREFAS);
  assert.equal(answer.status, 'abend');
  assert.match(answer.abend?.reason ?? '', /process added/);
});

const OUTBOUND_BASE = {
  id: 'tarefaConcluida',
  kind: 'outbound',
  from: '',
  to: '',
  event: '',
  writes: [],
  effect: '',
  transitionRef: '',
  on: 'Tarefa.aceitar',
  description: 'A tarefa foi aceita',
  entityRefs: ['Tarefa'],
  title: 'Tarefa concluída',
};

function outboundItem(
  op: L4DiffItem['op'],
  eventId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): EffortInput {
  const item: L4DiffItem = { changeId: `outbound:${eventId}`, kind: 'outbound', op, entity: '', source: 'l4' };
  if (before) item.before = before;
  if (after) item.after = after;
  return input(item, 'tarefas');
}

void test('I1 outbound só com title e description fica vazio e avisa o item', () => {
  const before = { ...OUTBOUND_BASE };
  const after = { ...OUTBOUND_BASE, title: 'Concluída', description: 'Outra frase' };
  const info = mock.method(console, 'info', () => {});
  try {
    const answer = describeEffortFrom(outboundItem('changed', 'tarefaConcluida', before, after), TAREFAS);
    assert.equal(answer.status, 'computed');
    assert.equal(answer.contract, 'keep');
    assert.deepEqual(answer.create, []);
    assert.deepEqual(answer.remove, []);
    assert.deepEqual(answer.regenerateDefs, []);
    assert.deepEqual(answer.materialize, []);
    assert.deepEqual(info.mock.calls[0]?.arguments, ['outbound:tarefaConcluida']);
  } finally {
    info.mock.restore();
  }
});

void test('I2 outbound com outro atributo e o mesmo on materializa o def e quem cita', () => {
  const before = { ...OUTBOUND_BASE };
  const after = { ...OUTBOUND_BASE, consumer: 'outro' };
  const answer = describeEffortFrom(outboundItem('changed', 'tarefaConcluida', before, after), TAREFAS);
  const keys = ['events:outbound', 'usecase:aceitar'];
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(answer.create, []);
  assert.deepEqual(answer.remove, []);
  assert.deepEqual(answer.regenerateDefs, []);
  assert.deepEqual(keysOf(answer.materialize), keys);
  for (const key of [...keysOf(answer.regenerateDefs), ...keysOf(answer.materialize)]) {
    assert.equal(key.startsWith('shared:'), false, key);
  }
});

void test('I3 outbound added na operação update materializa o def e o usecase da operação', () => {
  const after = { ...OUTBOUND_BASE, id: 'tarefaAtualizada', on: 'Tarefa.update' };
  const answer = describeEffortFrom(outboundItem('added', 'tarefaAtualizada', undefined, after), TAREFAS);
  const keys = ['events:outbound', 'usecase:updateTarefa'];
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
});

void test('I4 outbound removed regenera e materializa o def e quem cita', () => {
  const before = { ...OUTBOUND_BASE, id: 'tarefaCancelada', on: 'Tarefa.cancelar' };
  const answer = describeEffortFrom(outboundItem('removed', 'tarefaCancelada', before), TAREFAS);
  const keys = ['events:outbound', 'usecase:cancelar'];
  assert.equal(answer.status, 'computed');
  assert.equal(answer.contract, 'keep');
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
});

void test('outbound changed with a new on regenerates the event def, citers and the new operation', () => {
  const before = { ...OUTBOUND_BASE, on: 'Tarefa.aceitar' };
  const after = { ...OUTBOUND_BASE, on: 'Tarefa.cancelar' };
  const answer = describeEffortFrom(outboundItem('changed', 'tarefaConcluida', before, after), TAREFAS);
  const keys = ['events:outbound', 'usecase:aceitar', 'usecase:cancelar'];
  assert.equal(answer.status, 'computed');
  assert.deepEqual(keysOf(answer.regenerateDefs), keys);
  assert.deepEqual(keysOf(answer.materialize), keys);
});

void test('inbound abends because it is not handled yet', () => {
  const item: L4DiffItem = { changeId: 'inbound:receber', kind: 'inbound', op: 'added', entity: '', source: 'l4' };
  const answer = describeEffortFrom(input(item, 'tarefas'), TAREFAS);
  assert.equal(answer.status, 'abend');
  assert.equal(answer.abend?.reason, 'inbound integration change is not handled yet');
  assert.equal(answer.contract, 'keep');
});

function entityItem(before: Record<string, unknown>, after: Record<string, unknown>): EffortInput {
  return input({
    changeId: 'entity:Tarefa',
    kind: 'entity',
    op: 'changed',
    entity: 'Tarefa',
    source: 'l4',
    before,
    after,
  }, 'tarefas');
}

const ENTITY_BASE = {
  entityId: 'Tarefa',
  title: 'Tarefa',
  description: 'Com etiquetas',
  capabilities: { 'tarefas.resumoDiario': { enabled: true } },
  rules: ['resumoDiarioOitoHoras', 'devolucaoExigeMotivo'],
  storage: { table: 'tarefa' },
};

void test('a capability that stays with a new sentence is prose; a non-text value that changes still abends', () => {
  const cited = ['entity:tarefa', 'request:inicio', 'usecase:createTarefa', 'usecase:updateTarefa'];
  const before = {
    ...ENTITY_BASE,
    capabilities: { create: 'Registra a tarefa.', 'tarefas.resumoDiario': 'Todo dia as 8h.' },
  };
  const m3 = describeEffortFrom(entityItem(before, {
    ...before,
    description: 'Sem etiquetas',
    capabilities: { create: 'Registra a tarefa sem etiquetas.' },
    rules: ['devolucaoExigeMotivo'],
  }), TAREFAS);
  assert.equal(m3.status, 'computed');
  assert.deepEqual(keysOf(m3.regenerateDefs), cited);
  assert.deepEqual(keysOf(m3.materialize), cited);

  const phraseOnly = describeEffortFrom(entityItem(before, {
    ...before,
    capabilities: { ...before.capabilities, create: 'Outra frase.' },
  }), TAREFAS);
  assert.equal(phraseOnly.status, 'computed');
  assert.deepEqual(phraseOnly.materialize, []);
  assert.deepEqual(phraseOnly.regenerateDefs, []);

  const object = describeEffortFrom(entityItem(ENTITY_BASE, {
    ...ENTITY_BASE,
    capabilities: { 'tarefas.resumoDiario': { enabled: false } },
  }), TAREFAS);
  assert.equal(object.status, 'abend');
  assert.equal(object.abend?.reason, 'entity Tarefa changed in capabilities; not handled yet');
});

void test('entity changed answers by attribute', () => {
  const cited = [
    'entity:tarefa',
    'request:inicio',
    'usecase:createTarefa',
    'usecase:updateTarefa',
  ];
  const mixed = describeEffortFrom(entityItem(ENTITY_BASE, {
    ...ENTITY_BASE,
    description: 'Sem etiquetas',
    capabilities: {},
    rules: ['devolucaoExigeMotivo'],
  }), TAREFAS);
  assert.equal(mixed.status, 'computed');
  assert.equal(mixed.contract, 'keep');
  assert.deepEqual(keysOf(mixed.regenerateDefs), cited);
  assert.deepEqual(keysOf(mixed.materialize), cited);

  const prose = describeEffortFrom(entityItem(ENTITY_BASE, { ...ENTITY_BASE, description: 'Outra frase' }), TAREFAS);
  assert.equal(prose.status, 'computed');
  assert.deepEqual(prose.materialize, []);
  assert.deepEqual(prose.regenerateDefs, []);

  const storage = describeEffortFrom(entityItem(ENTITY_BASE, { ...ENTITY_BASE, storage: { table: 'outra' } }), TAREFAS);
  assert.equal(storage.status, 'abend');
  assert.equal(storage.abend?.reason, 'entity Tarefa changed in storage; not handled yet');
  assert.equal(storage.contract, 'keep');

  const process = describeEffortFrom(
    workflowChange('process', 'changed', 'process:resumoDiarioTarefas', '', { title: 'Daily', schedule: '0 8 * * *' }, { title: 'Morning', schedule: '0 8 * * *' }),
    TAREFAS,
  );
  assert.equal(process.status, 'computed');
  assert.deepEqual(process.materialize, []);

  const rule = describeEffortFrom(itemOf('rule', 'changed', 'rule:resumoDiarioOitoHoras', 'tarefas'), TAREFAS);
  assert.equal(rule.status, 'computed');
  assert.deepEqual(keysOf(rule.materialize), cited);
  const field = describeEffortFrom(fieldItem('changed', 'prioridade', 'Tarefa', { ...FIELD_BASE, required: true }, { ...FIELD_BASE, required: false }), TAREFAS);
  assert.equal(field.status, 'computed');
  assert.ok(field.materialize.length > 0);
  const grant = describeEffortFrom(grantItem('removed', 'membroChecklistPropria', { ...GRANT_BASE, grantId: 'membroChecklistPropria' }), TAREFAS);
  assert.equal(grant.status, 'computed');
  assert.ok(grant.materialize.length > 0);
  const journey = describeEffortFrom(journeyItem('removed', 'journey:criarTarefa', JOURNEY_BASE), TAREFAS);
  assert.equal(journey.status, 'computed');
  assert.ok(journey.materialize.length > 0);
  const workflow = describeEffortFrom(workflowChange('task', 'added', 'task:processoTarefa.revisar'), TAREFAS);
  assert.equal(workflow.status, 'computed');
  assert.deepEqual(keysOf(workflow.materialize), ['workflow:processoTarefa']);
  const outbound = describeEffortFrom(outboundItem('removed', 'tarefaCancelada', { ...OUTBOUND_BASE, id: 'tarefaCancelada', on: 'Tarefa.cancelar' }), TAREFAS);
  assert.equal(outbound.status, 'computed');
  assert.ok(outbound.materialize.length > 0);
});

void test('journey actorRef change cites the journey; rule field grant and text stay as they are', () => {
  const after = { ...JOURNEY_BASE, actorRef: 'gestor', index: { ...JOURNEY_BASE.index, actorRef: 'gestor' } };
  const journey = describeEffortFrom(journeyItem('changed', 'journey:criarTarefa', JOURNEY_BASE, after), TAREFAS);
  assert.deepEqual(keysOf(journey.materialize), ['seeds:seeds', 'workflow:processoTarefa']);
  const rule = describeEffortFrom(itemOf('rule', 'changed', 'rule:resumoDiarioOitoHoras', 'tarefas'), TAREFAS);
  assert.equal(rule.status, 'computed');
  assert.deepEqual(rule.regenerateDefs, []);
  assert.ok(rule.materialize.length > 0);
  const field = describeEffortFrom(fieldItem('changed', 'prioridade', 'Tarefa', { ...FIELD_BASE, title: 'Prioridade' }, { ...FIELD_BASE, title: 'Ordem' }), TAREFAS);
  assert.deepEqual(field.materialize, []);
  const grant = describeEffortFrom(grantItem('removed', 'membroChecklistPropria', { ...GRANT_BASE, grantId: 'membroChecklistPropria' }), TAREFAS);
  assert.deepEqual(keysOf(grant.materialize), [
    'authority:authorityMap',
    'controller:minhas_tarefas',
    'scope:accessScope',
    'seeds:seeds',
  ]);
});
