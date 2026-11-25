/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitPersistenceTimeSeries.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLocalTable } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

function entity(fields: Array<Record<string, unknown>>): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'domainEntity',
    artifactId: 'Message',
    moduleName: 'telegram',
    status: 'pending',
    dependencies: [],
    data: {
      entityId: 'Message',
      storageTarget: 'moduleDatabase',
      fields,
      lifecycle: [],
      invariants: [],
      imports: [],
    },
  };
}

function table(data: Record<string, unknown>): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'table',
    artifactId: 'message',
    moduleName: 'telegram',
    status: 'pending',
    dependencies: [],
    data: {
      tableId: 'message',
      entityId: 'Message',
      physicalName: 'telegram_message',
      primaryKey: ['id'],
      uniqueKeys: [],
      indexes: [],
      ...data,
    },
  };
}

const fields = [
  { name: 'id', type: 'uuid', indexed: true },
  { name: 'text', type: 'string' },
];

test('d1_294: a series table def emits a hypertable on occurredAt and does not bind that column', () => {
  const built = buildLocalTable(table({ timeSeries: true, primaryKey: ['id', 'occurredAt'] }), entity(fields));
  assert.equal('code' in built, false);
  if ('code' in built) return;
  const column = built.definition.columns.find(item => item.name === 'occurredAt');
  assert.deepEqual(column, { name: 'occurredAt', postgresType: 'TIMESTAMPTZ', defaultSql: 'now()' });
  assert.equal(column?.nullable, undefined);
  assert.deepEqual(built.definition.primaryKey, ['id', 'occurredAt']);
  assert.deepEqual(built.definition.timescale, { hypertable: { timeColumn: 'occurredAt' } });
  assert.equal(built.definition.storageProfile, 'postgres');
  assert.equal(built.definition.timescale?.hypertable.chunkTimeInterval, undefined);
  assert.equal(built.bindings.some(binding => binding.field === 'occurredAt'), false);
});

test('d1_294: a table without the series mark is unchanged', () => {
  const built = buildLocalTable(table({}), entity(fields));
  assert.equal('code' in built, false);
  if ('code' in built) return;
  assert.equal(built.definition.timescale, undefined);
  assert.equal(built.definition.columns.some(column => column.name === 'occurredAt'), false);
});

test('d1_294: an entity field named occurredAt collides with the time column', () => {
  const built = buildLocalTable(
    table({ timeSeries: true, primaryKey: ['id', 'occurredAt'] }),
    entity([...fields, { name: 'occurredAt', type: 'timestamp' }]),
  );
  assert.deepEqual(built, {
    code: 'COLUMN_COLLISION',
    detail: 'Field occurredAt is the time column of a series. It is not a field of the entity.',
  });
});
