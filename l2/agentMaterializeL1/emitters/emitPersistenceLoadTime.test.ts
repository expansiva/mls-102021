/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitPersistenceLoadTime.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';

const OUTPUT = '_102047_/l1/demo/layer_1_external/adapters/persistence/seeds.ts';

function table(tableId: string, data: Record<string, unknown>): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'table', artifactId: tableId, moduleName: 'demo', status: 'pending', dependencies: [], data: { tableId, ...data } } as M1Definition;
}

function seeds(datasets: unknown[]): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'persistenceSeeds', artifactId: 'seeds', moduleName: 'demo', status: 'pending', dependencies: [], data: { seedId: 'seeds', phase: 'plan', scenarios: [{ scenarioId: 's', tableId: 'audit' }, { scenarioId: 't', tableId: 'plain' }], datasets } } as M1Definition;
}

const rows = (field: string) => [1, 2, 3].map(n => ({ id: `id-${n}`, note: `n${n}`, [field]: '2026-01-01T00:00:00.000Z' }));

void test('d1_314: a test row of a series with a retention carries its time field as now minus N days, under the retention; the id stays', async () => {
  const emitted = await emitPersistence('persistence.persistenceSeeds', seeds([{ seedFor: 'audit', rows: rows('writtenAt') }]), OUTPUT, async () => null,
    [table('audit', { timeSeries: true, timeField: 'writtenAt', retentionDays: 2 })]);
  assert.ok(!('code' in emitted), 'code' in emitted ? emitted.detail : '');
  if ('code' in emitted) return;
  assert.match(emitted.source, /"seedFor":"audit","purpose":"test"/u);
  assert.equal(emitted.source.includes('2026-01-01T00:00:00.000Z'), false);
  const days = [...emitted.source.matchAll(/"writtenAt":new Date\(Date\.now\(\) - (\d+) \* 86400000\)\.toISOString\(\)/gu)].map(match => Number(match[1]));
  assert.deepEqual(days, [0, 1, 0]);
  assert.ok(days.every(day => day < 2));
  for (const id of ['id-1', 'id-2', 'id-3']) assert.ok(emitted.source.includes(`"id":"${id}"`));
});

void test('d1_314: no retention, no series or no table def: the literal stays', async () => {
  for (const defs of [
    [table('plain', { timeSeries: true, timeField: 'writtenAt' })],
    [table('plain', { retentionDays: 5, timeField: 'writtenAt' })],
    [] as M1Definition[],
  ]) {
    const emitted = await emitPersistence('persistence.persistenceSeeds', seeds([{ seedFor: 'plain', rows: rows('writtenAt') }]), OUTPUT, async () => null, defs);
    assert.ok(!('code' in emitted));
    if ('code' in emitted) return;
    assert.equal(emitted.source.includes('Date.now'), false);
    assert.equal(emitted.source.includes('2026-01-01T00:00:00.000Z'), true);
  }
});
