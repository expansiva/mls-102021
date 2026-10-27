/// <mls fileReference="_102021_/l2/helpers/planPostprocess/correctPlan.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { correctPlan } from '/_102021_/l2/helpers/planPostprocess/correctPlan.js';
import type { UsedRemovedUsecase } from '/_102021_/l2/helpers/planPostprocess/usedRemoved.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE = 'tarefas';
const ROUTES = [
  'tarefas.minhas_tarefas.cmdAceitar',
  'tarefas.minhas_tarefas.cmdCreateItemChecklist',
  'tarefas.minhas_tarefas.cmdCreateTarefa',
  'tarefas.minhas_tarefas.cmdDevolver',
  'tarefas.minhas_tarefas.cmdEnviarParaRevisao',
  'tarefas.minhas_tarefas.cmdIniciar',
  'tarefas.minhas_tarefas.cmdRetomar',
  'tarefas.minhas_tarefas.cmdUpdateItemChecklist',
  'tarefas.minhas_tarefas.cmdUpdateTarefa',
  'tarefas.minhas_tarefas.qryListItemChecklist',
  'tarefas.minhas_tarefas.qryListListaTarefas',
  'tarefas.minhas_tarefas.qryListParticipante',
  'tarefas.minhas_tarefas.qryListTarefa',
];

const USED: UsedRemovedUsecase = {
  id: 'getParticipante',
  routes: ROUTES,
  entity: 'Participante',
  operation: 'get',
};

test('M1B puts getParticipante back as done and records the 13 routes', () => {
  const backend = load('m1b.backend.json');
  const effort = load('m1b.effort.json');
  const corrected = correctPlan({ moduleName: MODULE, backend, effort, used: [USED] });
  assert.equal(stillRemoved(corrected.backend, 'getParticipante'), false);
  assert.equal(stillRemoved(corrected.effort, 'getParticipante'), false);
  const line = rows(corrected.backend.usecases).find(row => row.usecaseId === 'getParticipante');
  assert.equal(line?.status, 'done');
  assert.equal(line?.existing, 'l1/tarefas/layer_2_application/usecases/getParticipante.defs.ts');
  assert.equal(line?.entity, 'Participante');
  assert.equal(line?.operation, 'get');
  assert.equal(line?.reason, 'exists in l1; used by 13 contract routes');
  assert.equal(line?.noTable, 'mdm');
  assert.deepEqual(rows(corrected.effort.usecases).find(row => row.usecaseId === 'getParticipante'), {
    usecaseId: 'getParticipante',
    entity: 'Participante',
    operation: 'get',
    status: 'done',
    existing: 'l1/tarefas/layer_2_application/usecases/getParticipante.defs.ts',
  });
  assert.equal(bucketDone(corrected.effort), 19);
  assert.deepEqual(corrected.corrections, [{
    usecase: 'getParticipante',
    from: 'toRemove',
    to: 'done',
    reason: 'exists in l1',
    routes: ROUTES,
  }]);
  assert.deepEqual(withoutCorrection(corrected.backend, 'getParticipante'), withoutCorrection(backend, 'getParticipante'));
  assert.deepEqual(withoutCorrection(corrected.effort, 'getParticipante'), withoutCorrection(effort, 'getParticipante'));
});

test('a toRemove whose route left the contract stays toRemove', () => {
  const backend = load('m1b.backend.json');
  const effort = load('m1b.effort.json');
  const corrected = correctPlan({ moduleName: MODULE, backend, effort, used: [] });
  assert.deepEqual(corrected.backend, backend);
  assert.deepEqual(corrected.effort, effort);
  assert.deepEqual(corrected.corrections, []);
});

test('R4 effort usecase done bucket grows by one', () => {
  const effort = load('r4.effort.json');
  const backend = { usecases: [], removed: [] };
  const corrected = correctPlan({
    moduleName: MODULE,
    backend,
    effort,
    used: [USED],
  });
  assert.equal(bucketDone(corrected.effort), 19);
  assert.equal(stillRemoved(corrected.effort, 'getParticipante'), false);
  assert.equal(bucketDone(effort), 18);
});

test('a removed entity, workflow or endpoint is left in place', () => {
  const backend = load('m1b.backend.json');
  const effort = load('m1b.effort.json');
  const extra = [
    { kind: 'entity', id: 'Participante', status: 'toRemove' },
    { kind: 'workflow', id: 'processoTarefa', status: 'toRemove' },
    { kind: 'endpoint', id: 'tarefas.minhas_tarefas.qryListTarefa', status: 'toRemove' },
  ];
  backend.removed = [...rows(backend.removed), ...extra];
  effort.removed = [...rows(effort.removed), ...extra];
  const corrected = correctPlan({ moduleName: MODULE, backend, effort, used: [USED] });
  for (const row of extra) {
    assert.ok(rows(corrected.backend.removed).some(item => item.kind === row.kind && item.id === row.id));
    assert.ok(rows(corrected.effort.removed).some(item => item.kind === row.kind && item.id === row.id));
  }
});

test('a second pass changes nothing', () => {
  const first = correctPlan({
    moduleName: MODULE,
    backend: load('m1b.backend.json'),
    effort: load('m1b.effort.json'),
    used: [USED],
  });
  const second = correctPlan({
    moduleName: MODULE,
    backend: first.backend,
    effort: first.effort,
    used: [USED],
  });
  assert.deepEqual(second.backend, first.backend);
  assert.deepEqual(second.effort, first.effort);
  assert.deepEqual(second.corrections, []);
});

function load(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', name), 'utf8')) as Record<string, unknown>;
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row)) : [];
}

function stillRemoved(doc: Record<string, unknown>, id: string): boolean {
  return rows(doc.removed).some(row => row.kind === 'usecase' && row.id === id);
}

function bucketDone(doc: Record<string, unknown>): number {
  const totals = doc.totals as { usecases?: { done?: number } };
  return totals.usecases?.done ?? -1;
}

/** Drop the restored usecase line and the done counter so the rest of the plan can be compared. */
function withoutCorrection(doc: Record<string, unknown>, id: string): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  copy.removed = rows(copy.removed).filter(row => !(row.kind === 'usecase' && row.id === id));
  copy.usecases = rows(copy.usecases).filter(row => row.usecaseId !== id);
  const totals = copy.totals as { usecases?: { done?: number } } | undefined;
  if (totals?.usecases && typeof totals.usecases.done === 'number') delete totals.usecases.done;
  return copy;
}

