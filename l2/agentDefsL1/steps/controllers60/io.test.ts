/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/io.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { accessGrantsOf } from '/_102021_/l2/agentDefsL1/steps/controllers60/io.js';

const summary = {
  grants: [{
    grantId: 'pessoaVeEmpresa',
    actorRef: 'pessoa',
    entityRefs: ['Empresa'],
    disclosure: { mode: 'summaryOnly', allowedFields: ['Empresa.nome', 'Empresa.documento'] },
    dataScope: { anchorEntity: 'Empresa', mode: 'own' },
  }],
};

void test('summaryOnly is read as fieldsOnly with the same allowed fields', () => {
  const read = accessGrantsOf(summary, {});
  assert.deepEqual(read.problems, []);
  assert.equal(read.grants.length, 1);
  assert.equal(read.grants[0].disclosure, 'fieldsOnly');
  assert.deepEqual(read.grants[0].allowedFields, ['Empresa.nome', 'Empresa.documento']);
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
