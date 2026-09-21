/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { L1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import {
  parseP1Needs,
  planP1Backend,
  type P1BackendFile,
  type P1EntityView,
} from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import { repairP1Backend, validateP1Backend } from '/_102021_/l2/agentPlannerL1/steps/plan20/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NEEDS = parseP1Needs(JSON.parse(readFileSync(
  path.join(HERE, '../entry10/fixtures/needs-mensalidadesAcademia.json'),
  'utf8',
)) as unknown);
const AT = new Date(Date.UTC(2026, 8, 20, 10, 30, 0));
const EMPTY: L1Inventory = { routes: [], usecases: [], ports: [], tables: [], present: false };
const ONTOLOGY: P1EntityView[] = [
  { entityId: 'Mensalidade', family: 'tdm', storageKind: 'relational', storageTarget: 'moduleDatabase', transitions: [] },
  { entityId: 'Pagamento', family: 'tdm', storageKind: 'relational', storageTarget: 'moduleDatabase', transitions: [] },
  { entityId: 'Aluno', family: 'mdm', storageKind: '', storageTarget: 'mdm', transitions: [] },
];

function planned(): P1BackendFile {
  return planP1Backend({ needs: NEEDS, inventory: EMPTY, ontology: ONTOLOGY, now: AT }).file;
}

void test('valid mensalidadesAcademia plan passes the structural gate', () => {
  const file = planned();
  const gate = validateP1Backend(file, NEEDS, ONTOLOGY);
  assert.equal(gate.ok, true, gate.issues.map(item => item.message).join('\n'));
});

void test('duplicate route, unknown entity, MDM table and missing page fail the gate', () => {
  const dup = planned();
  dup.endpoints.push({ ...dup.endpoints[0] });
  assert.ok(validateP1Backend(dup, NEEDS, ONTOLOGY).issues.some(item => item.code === 'P1_BACKEND_ROUTE_DUP'));

  const unknown = planned();
  unknown.usecases[0].entity = 'Fantasma';
  assert.ok(validateP1Backend(unknown, NEEDS, ONTOLOGY).issues.some(item => item.code === 'P1_BACKEND_ENTITY_UNKNOWN'));

  const mdm = planned();
  mdm.tables.push({ tableId: 'aluno', entity: 'Aluno', status: 'toCreate', tableRefs: ['aluno'], noTable: 'ok' });
  assert.ok(validateP1Backend(mdm, NEEDS, ONTOLOGY).issues.some(item => item.code === 'P1_BACKEND_MDM_TABLE'));

  const missing = planned();
  missing.endpoints = [];
  assert.ok(validateP1Backend(missing, NEEDS, ONTOLOGY).issues.some(item => item.code === 'P1_BACKEND_PAGE'));
});

void test('repair strips MDM tables/ports and duplicate routes', () => {
  const file = planned();
  file.tables.push({ tableId: 'aluno', entity: 'Aluno', status: 'toCreate', tableRefs: ['aluno'], noTable: 'ok' });
  file.ports.push({ portId: 'AlunoRepository', entity: 'Aluno', status: 'toCreate', tableRefs: [], noTable: 'mdm' });
  file.endpoints.push({ ...file.endpoints[0] });
  const repaired = repairP1Backend(file, NEEDS, ONTOLOGY);
  assert.equal(repaired.tables.some(item => item.entity === 'Aluno'), false);
  assert.equal(repaired.ports.some(item => item.entity === 'Aluno'), false);
  const routes = repaired.endpoints.map(item => item.route);
  assert.equal(routes.length, new Set(routes).size);
  const gate = validateP1Backend(repaired, NEEDS, ONTOLOGY);
  assert.equal(gate.ok, true, gate.issues.map(item => item.message).join('\n'));
});

void test('v1.1 grouping: unknown tableRef and noTable mismatch fail; repair restamps', () => {
  const bad = planned();
  bad.usecases[0].tableRefs = ['fantasma'];
  bad.usecases[0].noTable = 'ok';
  assert.ok(validateP1Backend(bad, NEEDS, ONTOLOGY).issues.some(item => item.code === 'P1_BACKEND_TABLE_REF'));

  const mismatch = planned();
  mismatch.usecases[0].tableRefs = [];
  mismatch.usecases[0].noTable = 'ok';
  assert.ok(validateP1Backend(mismatch, NEEDS, ONTOLOGY).issues.some(item => item.code === 'P1_BACKEND_NO_TABLE'));

  const repaired = repairP1Backend(mismatch, NEEDS, ONTOLOGY);
  assert.equal(repaired.schemaVersion, '2026-09-21-p1-backend-v1.1');
  assert.ok(repaired.usecases.every(item => (item.tableRefs.length === 0) === (item.noTable !== 'ok')));
  const gate = validateP1Backend(repaired, NEEDS, ONTOLOGY);
  assert.equal(gate.ok, true, gate.issues.map(item => item.message).join('\n'));
});
