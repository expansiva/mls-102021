/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbTableColumnTypes.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  columnSqlTypeForL4,
  collectColumnTypeMismatchFindings,
  l4TypeFamily,
  sanitizePlannerTableColumnTypes,
  sqlTypeFamily,
} from './cbTableColumnTypes.js';

// Incident-shaped ontology (string + enum on both status and priority). Copied as a fixture;
// not a generated-app path.
const TASK_FIELDS = [
  { fieldId: 'taskId', type: 'uuid' },
  { fieldId: 'title', type: 'string' },
  { fieldId: 'status', type: 'string', enum: ['pending', 'inProgress', 'completed', 'cancelled'] },
  { fieldId: 'priority', type: 'string', enum: ['low', 'medium', 'high'] },
  { fieldId: 'dueDate', type: 'date' },
  { fieldId: 'createdAt', type: 'datetime' },
  { fieldId: 'rank', type: 'integer' },
  { fieldId: 'amount', type: 'number' },
];

const INCIDENT_COLUMNS = [
  { name: 'task_id', type: 'uuid', nullable: false },
  { name: 'title', type: 'text', nullable: false },
  { name: 'status', type: 'text', nullable: false },
  { name: 'priority', type: 'integer', nullable: false },
  { name: 'due_date', type: 'timestamptz', nullable: true },
  { name: 'created_at', type: 'timestamptz', nullable: false },
  { name: 'details', type: 'jsonb', nullable: true },
];

void test('string/enum l4 fields map to text; numeric l4 fields map to numeric families', () => {
  assert.equal(columnSqlTypeForL4('string'), 'text');
  assert.equal(columnSqlTypeForL4('text'), 'text');
  assert.equal(l4TypeFamily('string'), 'text');
  assert.equal(columnSqlTypeForL4('integer'), 'integer');
  assert.equal(columnSqlTypeForL4('number'), 'numeric');
  assert.equal(columnSqlTypeForL4('uuid'), 'uuid');
  assert.equal(columnSqlTypeForL4('date'), 'timestamptz');
  assert.equal(columnSqlTypeForL4('Task'), '');
});

void test('sanitizePlannerTableColumnTypes coerces a string+enum priority integer to text and leaves numeric fields', () => {
  const result = sanitizePlannerTableColumnTypes({
    tableId: 'Task',
    tableName: 'task',
    columns: [
      ...INCIDENT_COLUMNS,
      { name: 'rank', type: 'integer', nullable: false },
      { name: 'amount', type: 'numeric', nullable: false },
    ],
  }, TASK_FIELDS);
  const byName = Object.fromEntries((result.columns as { name: string; type: string }[]).map((c) => [c.name, c.type]));
  assert.equal(byName.priority, 'text');
  assert.equal(byName.status, 'text');
  assert.equal(byName.title, 'text');
  assert.equal(byName.task_id, 'uuid');
  assert.equal(byName.due_date, 'timestamptz');
  assert.equal(byName.rank, 'integer');
  assert.equal(byName.amount, 'numeric');
  assert.equal(byName.details, 'jsonb');
});

void test('sanitizePlannerTableColumnTypes is a no-op when families already match (varchar ≡ text)', () => {
  const item = {
    tableName: 'task',
    columns: [
      { name: 'priority', type: 'varchar', nullable: false },
      { name: 'status', type: 'text', nullable: false },
    ],
  };
  assert.equal(sanitizePlannerTableColumnTypes(item, TASK_FIELDS), item);
});

void test('collectColumnTypeMismatchFindings flags the incident defs shape and is silent when coherent', () => {
  const defect = `export const taskTableDefinition = ${JSON.stringify({
    data: { tableName: 'task', columns: INCIDENT_COLUMNS },
  })} as const;`;
  const findings = collectColumnTypeMismatchFindings(
    defect,
    TASK_FIELDS,
    'mod/layer_1_external/adapters/persistence/task.defs.ts',
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0], /column type mismatch/);
  assert.match(findings[0], /priority/);
  assert.match(findings[0], /integer/);
  assert.match(findings[0], /string/);

  const coherent = `export const taskTableDefinition = ${JSON.stringify({
    data: {
      tableName: 'task',
      columns: INCIDENT_COLUMNS.map((c) => c.name === 'priority' ? { ...c, type: 'text' } : c),
    },
  })} as const;`;
  assert.deepEqual(
    collectColumnTypeMismatchFindings(coherent, TASK_FIELDS, 'mod/layer_1_external/adapters/persistence/task.defs.ts'),
    [],
  );
});

void test('collectColumnTypeMismatchFindings reads a materialized postgresType INTEGER the same way', () => {
  const source = `
export const taskTableDef = {
  tableName: 'task',
  columns: [
    { name: 'priority', postgresType: 'INTEGER' },
    { name: 'status', postgresType: 'TEXT' },
  ],
};
`;
  const findings = collectColumnTypeMismatchFindings(source, TASK_FIELDS, 'mod/.../task.ts');
  assert.equal(findings.length, 1);
  assert.match(findings[0], /INTEGER/);
  assert.equal(sqlTypeFamily('INTEGER'), 'integer');
  assert.equal(sqlTypeFamily('VARCHAR(64)'), 'text');
});
