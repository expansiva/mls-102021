/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/io.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import type { D1SupportRequest } from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';
import { buildD1Support } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import { accessGrantsOf, catalogOperationsOf, connectionOperations } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';

void test('a summaryOnly grant is fieldsOnly with its allowed fields on the accessScope', () => {
  const read = accessGrantsOf({
    grants: [{
      grantId: 'pessoaVeEmpresa',
      actorRef: 'pessoa',
      entityRefs: ['Empresa'],
      disclosure: { mode: 'summaryOnly', allowedFields: ['Empresa.nome', 'Empresa.documento'] },
      dataScope: { anchorEntity: 'Empresa', mode: 'own' },
    }],
  }, {});
  assert.deepEqual(read.problems, []);
  const request: D1SupportRequest = {
    project: 102021,
    moduleName: 'inicio',
    grants: read.grants,
    relationships: [],
    scopePlans: [],
    citedGrantIds: [],
    adapters: [],
    files: [],
    existingHelpers: [],
    applicationEdges: [],
    formFields: [],
    enumerations: [],
    tables: [],
    models: [],
    journeys: [],
    missingJourneys: [],
    roleTags: [],
    seedRefs: [],
    existingDatasets: [],
    maintenance: null,
    outbound: [],
    selectedEventIds: [],
    usecaseIds: [],
    transitionUsecases: [],
    operations: [],
    processes: [],
  };
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const scope = build.emit.find(item => item.definition.artifactType === 'accessScope');
  const grant = (scope?.definition.data as { grants: Array<{ grantId: string; disclosure: string; allowedFields?: string[] }> }).grants
    .find(item => item.grantId === 'pessoaVeEmpresa');
  assert.equal(grant?.disclosure, 'fieldsOnly');
  assert.deepEqual(grant?.allowedFields, ['Empresa.nome', 'Empresa.documento']);
});

void test('a disclosure mode outside fullRecord, fieldsOnly and summaryOnly is an error on the grant', () => {
  const read = accessGrantsOf({
    grants: [{
      grantId: 'pessoaVeEmpresa',
      actorRef: 'pessoa',
      entityRefs: ['Empresa'],
      disclosure: { mode: 'hidden', allowedFields: ['Empresa.nome'] },
    }],
  }, {});
  assert.deepEqual(read.grants, []);
  assert.equal(read.problems.length, 1);
  assert.equal(read.problems[0].severity, 'error');
  assert.equal(read.problems[0].path, 'pessoaVeEmpresa');
  assert.match(read.problems[0].message, /pessoaVeEmpresa/);
});

const CM_CATALOG = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../mls-102034/l4/ontology/connections/cm.defs.ts',
);

function selectedUsecase(usecaseId: string, entity = 'Nota', operation = 'read'): D1SelectedUsecase {
  return { usecaseId, entity, operation, status: 'toCreate', existing: '', identity: usecaseId, routes: [] };
}

void test('a call line becomes a connection operation and a serve line is ignored', async () => {
  const catalog = await catalogOperationsOf(readFileSync(CM_CATALOG, 'utf8'));
  assert.ok(catalog);
  const call = catalog.find(item => item.operationId === 'listAgents');
  const serve = catalog.find(item => item.operationId === 'describe');
  assert.equal(call?.direction, 'call');
  assert.equal(serve?.direction, 'serve');
  const selected = [selectedUsecase('listarNotas')];
  const rows = connectionOperations([
    { connectionId: 'cm', operationId: 'listAgents', direction: 'call', usedBy: ['listarNotas'] },
    { connectionId: 'cm', operationId: 'describe', direction: 'serve', usedBy: ['listarNotas'] },
    { connectionId: 'cm', operationId: 'notInCatalog', direction: 'call', usedBy: ['listarNotas'] },
    { connectionId: 'absent', operationId: 'listAgents', direction: 'call', usedBy: ['listarNotas'] },
    { connectionId: 'cm', operationId: 'readAgent', direction: 'call', usedBy: ['nenhumPasso'] },
    { connectionId: 'cm', operationId: 'simulateAgent', direction: 'call', usedBy: ['simular.rodar'] },
  ], selected, { cm: catalog, absent: null }, new Map([
    ['simular.rodar', { entity: 'Nota', effect: 'read', transitionRef: '' }],
  ]));
  assert.deepEqual(rows.map(item => item.operationId), ['listAgents', 'notInCatalog', 'listAgents', 'readAgent', 'simulateAgent']);
  assert.equal(rows[0]?.consumer, 'listarNotas');
  assert.equal(rows[0]?.catalogOps?.some(item => item.operationId === 'listAgents' && item.direction === 'call'), true);
  assert.equal(rows[2]?.catalogOps, null);
  assert.equal(rows[3]?.consumer, '');
  assert.equal(rows[4]?.consumer, 'listarNotas');
});
