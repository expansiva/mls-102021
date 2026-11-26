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

test('d1_293: retentionDays is copied onto the table and the series still emits occurredAt', () => {
  const built = buildLocalTable(table({ timeSeries: true, retentionDays: 90, primaryKey: ['id', 'occurredAt'] }), entity(fields));
  assert.equal('code' in built, false);
  if ('code' in built) return;
  assert.equal(built.definition.retentionDays, 90);
  const column = built.definition.columns.find(item => item.name === 'occurredAt');
  assert.deepEqual(column, { name: 'occurredAt', postgresType: 'TIMESTAMPTZ', defaultSql: 'now()' });
  const source = JSON.stringify(built.definition, null, 2);
  assert.equal(source.includes('"retentionDays": 90'), true);
  assert.equal(source.includes('"name": "occurredAt"'), true);
  assert.equal(built.planned.columns.some(item => item.name === 'retentionDays'), false);
});

test('d1_294: a table without the series mark is unchanged', () => {
  const built = buildLocalTable(table({}), entity(fields));
  assert.equal('code' in built, false);
  if ('code' in built) return;
  assert.equal(built.definition.timescale, undefined);
  assert.equal(built.definition.columns.some(column => column.name === 'occurredAt'), false);
});

test('d1_295: a series timeField is the hypertable column and is TIMESTAMPTZ, as every timestamp field', () => {
  const built = buildLocalTable(
    table({
      timeSeries: true,
      timeField: 'sentAt',
      primaryKey: ['id', 'sentAt'],
      uniqueKeys: [['robotId', 'telegramId', 'sentAt']],
      indexes: [{ name: 'telegram_message_robotId_telegramId_sentAt', columns: ['robotId', 'telegramId', 'sentAt'], unique: true }],
    }),
    entity([
      ...fields,
      { name: 'robotId', type: 'text' },
      { name: 'telegramId', type: 'text' },
      { name: 'sentAt', type: 'timestamp' },
      { name: 'editedAt', type: 'timestamp', indexed: true },
    ]),
  );
  assert.equal('code' in built, false);
  if ('code' in built) return;
  assert.equal(built.definition.columns.some(column => column.name === 'occurredAt'), false);
  assert.deepEqual(built.definition.columns.find(column => column.name === 'sentAt'), {
    name: 'sentAt',
    postgresType: 'TIMESTAMPTZ',
  });
  assert.deepEqual(built.definition.columns.find(column => column.name === 'editedAt'), {
    name: 'editedAt',
    postgresType: 'TIMESTAMPTZ',
    nullable: true,
  });
  const source = JSON.stringify(built.definition, null, 2);
  assert.equal(source.includes('"timeColumn": "sentAt"'), true);
  assert.equal(source.includes('"name": "occurredAt"'), false);
  assert.deepEqual(built.definition.indexes.filter(index => index.unique), [{
    name: 'telegram_message_robotId_telegramId_sentAt',
    columns: ['robotId', 'telegramId', 'sentAt'],
    unique: true,
  }]);
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
