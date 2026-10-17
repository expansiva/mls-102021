/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/io.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D1SupportRequest } from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';
import { buildD1Support } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import { accessGrantsOf } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';

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
