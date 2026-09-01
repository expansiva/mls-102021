/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbTableNames.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyModuleTableNamespace,
  assertPhysicalTableNameFitsPostgres,
  logicalTableNameFromEmitted,
  moduleTableNamespacePrefix,
  physicalPostgresTableName,
  POSTGRES_IDENTIFIER_MAX_LENGTH,
  sanitizePlannerTableName,
} from '/_102021_/l2/agentChangeBackend/helpers/cbTableNames.js';

void test('two modules with the same entity produce different tableNames; repositoryName is untouched', () => {
  const a = sanitizePlannerTableName(
    { tableName: 'petition_signature', repositoryName: 'listaAssinatura3PetitionSignature', tableId: 'PetitionSignature' },
    { moduleId: 'listaAssinatura3', projectId: '102047' },
  );
  const b = sanitizePlannerTableName(
    { tableName: 'petition_signature', repositoryName: 'listaAssinatura2PetitionSignature', tableId: 'PetitionSignature' },
    { moduleId: 'listaAssinatura2', projectId: '102047' },
  );
  assert.equal(a.tableName, 'listaassinatura3_petition_signature');
  assert.equal(b.tableName, 'listaassinatura2_petition_signature');
  assert.notEqual(a.tableName, b.tableName);
  assert.equal(a.repositoryName, 'listaAssinatura3PetitionSignature');
  assert.equal(b.repositoryName, 'listaAssinatura2PetitionSignature');
  assert.equal(physicalPostgresTableName('102047', a.tableName), 'mls102047_listaassinatura3_petition_signature');
  assert.equal(physicalPostgresTableName('102047', b.tableName), 'mls102047_listaassinatura2_petition_signature');
});

void test('logicalTableName stays the unprefixed entity table name', () => {
  const emitted = applyModuleTableNamespace('petition_signature', 'listaAssinatura3');
  assert.equal(emitted, 'listaassinatura3_petition_signature');
  assert.equal(logicalTableNameFromEmitted(emitted, 'listaAssinatura3'), 'petition_signature');
  assert.equal(logicalTableNameFromEmitted('petition_signature', 'listaAssinatura3'), 'petition_signature');
  assert.equal(moduleTableNamespacePrefix('listaAssinatura3'), 'listaassinatura3_');
});

void test('applyModuleTableNamespace is idempotent and lowercases a mixed-case module prefix', () => {
  const once = applyModuleTableNamespace('petition_signature', 'listaAssinatura3');
  assert.equal(applyModuleTableNamespace(once, 'listaAssinatura3'), once);
  assert.equal(
    applyModuleTableNamespace('listaAssinatura3_petition_signature', 'listaAssinatura3'),
    'listaassinatura3_petition_signature',
  );
  const sanitized = sanitizePlannerTableName(
    { tableName: once, repositoryName: 'listaAssinatura3PetitionSignature' },
    { moduleId: 'listaAssinatura3', projectId: '102047' },
  );
  assert.equal(sanitized.tableName, once);
});

void test('a final name above 63 characters fails generation with an actionable message', () => {
  const tableName = 'appointment_availability_window_schedule';
  const moduleId = 'institutionalPresentation';
  const prefixed = applyModuleTableNamespace(tableName, moduleId);
  const physical = physicalPostgresTableName('102047', prefixed);
  assert.ok(physical.length > POSTGRES_IDENTIFIER_MAX_LENGTH, physical);
  assert.throws(
    () => sanitizePlannerTableName(
      { tableName, tableId: 'AppointmentAvailabilityWindow' },
      { moduleId, projectId: '102047', tableId: 'AppointmentAvailabilityWindow' },
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /63 characters/);
      assert.match(error.message, /Shorten the entity or module name/);
      assert.match(error.message, /institutionalPresentation/);
      assert.match(error.message, /AppointmentAvailabilityWindow/);
      return true;
    },
  );
  assert.throws(
    () => assertPhysicalTableNameFitsPostgres({
      projectId: '102047',
      moduleId,
      tableName: prefixed,
      tableId: 'AppointmentAvailabilityWindow',
    }),
    /63 characters/,
  );
});

void test('a name that already fits is returned unchanged as the physical identifier', () => {
  const physical = assertPhysicalTableNameFitsPostgres({
    projectId: '102047',
    moduleId: 'listaAssinatura3',
    tableName: 'listaassinatura3_petition_signature',
    tableId: 'PetitionSignature',
  });
  assert.equal(physical, 'mls102047_listaassinatura3_petition_signature');
  assert.ok(physical.length <= POSTGRES_IDENTIFIER_MAX_LENGTH);
});
