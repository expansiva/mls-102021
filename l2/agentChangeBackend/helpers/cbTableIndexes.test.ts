/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbTableIndexes.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectRedundantPkIndexFindings,
  sanitizePlannerTableItem,
} from '/_102021_/l2/agentChangeBackend/helpers/cbTableIndexes.js';
import { appointmentAvailabilityTableDef } from '/_102021_/l2/agentChangeBackend/steps/gen-table/fixtures/appointmentAvailability.js';
import { serviceExecutionTableDef } from '/_102021_/l2/agentChangeBackend/steps/gen-table/fixtures/serviceExecution.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function plannerFromTableDef(def: { tableName: string; primaryKey: string[]; indexes?: { name: string; columns: (string | { name: string })[]; unique?: boolean }[] }): Record<string, unknown> {
  return {
    tableName: def.tableName,
    primaryKey: def.primaryKey,
    indexes: (def.indexes ?? []).map((index) => ({
      indexName: index.name,
      columns: index.columns,
      unique: index.unique ?? false,
    })),
  };
}

void test('sanitizePlannerTableItem strips the real appointmentAvailability _pkey index and keeps _idx', () => {
  const result = sanitizePlannerTableItem(plannerFromTableDef(appointmentAvailabilityTableDef));
  const names = (result.indexes as { indexName: string }[]).map((index) => index.indexName);
  assert.deepEqual(names, [
    'appointment_availability_service_id_idx',
    'appointment_availability_business_hours_id_idx',
  ]);
});

void test('sanitizePlannerTableItem leaves the real serviceExecution secondary indexes intact', () => {
  const item = plannerFromTableDef(serviceExecutionTableDef);
  const result = sanitizePlannerTableItem(item);
  assert.equal(result, item);
  const names = (result.indexes as { indexName: string }[]).map((index) => index.indexName);
  assert.deepEqual(names, [
    'service_execution_service_appointment_id_idx',
    'service_execution_status_idx',
  ]);
});

void test('sanitizePlannerTableItem strips an index whose columns are exactly the primaryKey', () => {
  const result = sanitizePlannerTableItem({
    tableName: 'appointment_availability',
    primaryKey: ['availability_id'],
    indexes: [
      { indexName: 'appointment_availability_availability_id_uidx', columns: ['availability_id'], unique: true },
      { indexName: 'appointment_availability_service_id_idx', columns: ['service_id'] },
    ],
  });
  const names = (result.indexes as { indexName: string }[]).map((index) => index.indexName);
  assert.deepEqual(names, ['appointment_availability_service_id_idx']);
});

void test('collectRedundantPkIndexFindings flags the real appointmentAvailability.defs shape', () => {
  const source = `export const appointmentAvailabilityTableDefinition = ${JSON.stringify({
    data: {
      tableName: appointmentAvailabilityTableDef.tableName,
      primaryKey: appointmentAvailabilityTableDef.primaryKey,
      indexes: plannerFromTableDef(appointmentAvailabilityTableDef).indexes,
    },
  })} as const;`;
  const findings = collectRedundantPkIndexFindings(source, 'petShop/layer_1_external/adapters/persistence/appointmentAvailability.defs.ts');
  assert.equal(findings.length, 1);
  assert.match(findings[0], /appointment_availability_pkey/);
  assert.match(findings[0], /redundant PK index/);
});

void test('collectRedundantPkIndexFindings is silent on the real serviceExecution secondary indexes', () => {
  const source = `export const serviceExecutionTableDefinition = ${JSON.stringify({
    data: {
      tableName: serviceExecutionTableDef.tableName,
      primaryKey: serviceExecutionTableDef.primaryKey,
      indexes: plannerFromTableDef(serviceExecutionTableDef).indexes,
    },
  })} as const;`;
  assert.deepEqual(
    collectRedundantPkIndexFindings(source, 'petShop/layer_1_external/adapters/persistence/serviceExecution.defs.ts'),
    [],
  );
});

void test('fixtures are copies of the petShop incident artifacts', () => {
  const defect = readFileSync(path.join(HERE, '../steps/gen-table/fixtures/appointmentAvailability.ts'), 'utf8');
  const ok = readFileSync(path.join(HERE, '../steps/gen-table/fixtures/serviceExecution.ts'), 'utf8');
  assert.match(defect, /appointment_availability_pkey/);
  assert.match(ok, /service_execution_service_appointment_id_idx/);
  assert.doesNotMatch(ok, /service_execution_pkey/);
});
