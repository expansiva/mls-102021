/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/seedRegistro.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { draftScenarioRow, placeSeedValue, readSeedValue, type SeedColumn, type SeedTableUnit } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';
import { completeInitialRows } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.js';

const column = (name: string, type: SeedColumn['type'], required = true, enumValues: string[] = []): SeedColumn => ({ name, title: '', type, required, indexed: false, enumValues, pattern: '', maxLength: null, fields: [] });

function unit(overrides: Partial<SeedTableUnit> = {}): SeedTableUnit {
  return {
    scenarioId: 's1', scenarioIndex: 1, tableId: 'mark', moduleName: 'demo', entityId: 'Mark', description: '', createText: '', fieldsText: '',
    columns: [column('id', 'uuid', false), column('name', 'string'), column('through', 'enum', true, ['a', 'b'])],
    tableColumns: ['id', 'name', 'details'],
    tableBindings: [
      { field: 'id', column: 'id', placement: 'column' },
      { field: 'name', column: 'name', placement: 'column' },
      { field: 'through', column: 'json:through', placement: 'json' },
      { field: 'details.decidedAt', column: 'json:decidedAt', placement: 'json' },
    ],
    uniqueKeys: [['name']], states: [], stateField: '', initialData: '', loadedBySeed: false, constraints: [],
    serverAssigned: [{ path: 'details.decidedAt', type: 'timestamp' }, { path: 'name', type: 'string' }],
    ...overrides,
  };
}

void test('d1_326: a value is written where the table def stores it (root column, or the json column), and read from there', () => {
  const row: Record<string, unknown> = {};
  placeSeedValue(unit(), row, 'name', 'N');
  placeSeedValue(unit(), row, 'through', 'a');
  placeSeedValue(unit(), row, 'details.decidedAt', 'T');
  assert.deepEqual(row, { name: 'N', details: { through: 'a', decidedAt: 'T' } });
  assert.equal(readSeedValue(unit(), row, 'through'), 'a');
  assert.equal(readSeedValue(unit(), row, 'details.decidedAt'), 'T');
  assert.equal(readSeedValue(unit(), row, 'name'), 'N');
});

void test('d1_326: a required field the table keeps in the json column is no longer lost by the draft of a scenario row', async () => {
  const drafted = await draftScenarioRow(unit());
  assert.ok('row' in drafted, 'problems' in drafted ? drafted.problems.join('; ') : '');
  assert.equal((drafted.row.details as Record<string, unknown>).through, 'a');
  assert.equal('through' in drafted.row, false, 'not at the root');
});

void test('d1_326: the row gets what the server writes on create (a stamp, once, where the table keeps it); a value already there stays', async () => {
  const completed = await completeInitialRows(unit(), [{ name: 'N', details: { through: 'a' } }]);
  assert.ok('rows' in completed);
  const row = completed.rows[0];
  assert.equal(readSeedValue(unit(), row, 'details.decidedAt'), '2026-01-01T00:00:00.000Z');
  assert.equal(row.name, 'N');
  const kept = await completeInitialRows(unit(), [{ name: 'N', details: { through: 'a', decidedAt: '2026-05-05T10:00:00.000Z' } }]);
  assert.ok('rows' in kept);
  assert.equal(readSeedValue(unit(), kept.rows[0], 'details.decidedAt'), '2026-05-05T10:00:00.000Z');
});
