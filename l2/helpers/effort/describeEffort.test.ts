/// <mls fileReference="_102021_/l2/helpers/effort/describeEffort.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { describeEffort, describeEffortFrom } from '/_102021_/l2/helpers/effort/describeEffort.js';
import type { EffortInput, L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

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

function input(item: L4DiffItem, module = 'agendaClinica'): EffortInput {
  return { module, base: { baseId: 'mls-102047', revisionId: '79f94cc' }, item };
}

function rule(id: string, op: L4DiffItem['op'] = 'changed'): L4DiffItem {
  return { changeId: `rule:${id}`, kind: 'rule', op, entity: '', source: 'l4/agendaClinica/rules.defs.ts' };
}

void test('rule changed aplica usecase, entidade e request, e ignora rulePlan herdado', () => {
  const answer = describeEffortFrom(input(rule('anotacaoObrigatoriaNoAtendimento')), AGENDA);
  assert.equal(answer.status, 'computed');
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
    ['entity:consulta', 'request:consultas'],
  );
});

void test('regra inexistente abend', () => {
  const answer = describeEffortFrom(input(rule('naoExiste')), AGENDA);
  assert.equal(answer.status, 'abend');
  assert.equal(answer.abend?.reason, 'nenhum def aplica o id');
});

void test('field, grant e task added abend', () => {
  const cases: L4DiffItem[] = [
    { changeId: 'field:attendanceNote', kind: 'field', op: 'changed', entity: 'Consulta', source: 'l4' },
    { changeId: 'grant:recepcionista', kind: 'grant', op: 'changed', entity: '', source: 'l4' },
    { changeId: 'task:abrirAgenda', kind: 'task', op: 'added', entity: '', source: 'l4' },
  ];
  for (const item of cases) {
    const answer = describeEffortFrom(input(item), AGENDA);
    assert.equal(answer.status, 'abend', item.changeId);
    assert.deepEqual(answer.materialize, []);
  }
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
