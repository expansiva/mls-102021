/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/mdmBoundCall.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { mdmBoundCallProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

const LIST_USERS = [{ target: 'identity', method: 'listUsers' }];

test('the recorded listOrganizationUser is refused because it does not call identity.listUsers (d1_242 s2)', () => {
  const code = readFileSync(path.join(FIXTURES, 'listOrganizationUser399835c1.recorded.txt'), 'utf8');
  const problems = mdmBoundCallProblems(code, LIST_USERS);
  assert.equal(problems.length, 1);
  assert.ok(problems[0].includes('identity.listUsers'), problems[0]);
});

test('a file that calls the bound method passes, and a comment does not count (d1_242 s2)', () => {
  const calls = [{ target: 'collection', method: 'listByType' }, { target: 'entity', method: 'get' }];
  const good = 'const page = await ctx.mdm.collection.listByType({ type });\nconst row = await ctx.mdm.entity.get({ mdmId });\n';
  assert.deepEqual(mdmBoundCallProblems(good, calls), []);
  const comment = '// ctx.mdm.identity.listUsers(\nconst page = await ctx.mdm.collection.listByType({});\n';
  assert.ok(mdmBoundCallProblems(comment, LIST_USERS)[0].includes('identity.listUsers'));
  assert.deepEqual(mdmBoundCallProblems(good, [{ target: 'prospect', method: 'search' }]), []);
});

test('d1_242: a bound call marked alternative is not required in the code', () => {
  const code = 'await ctx.mdm.entity.get({ mdmId });';
  assert.deepEqual(mdmBoundCallProblems(code, [{ target: 'entity', method: 'get', alternative: false }, { target: 'entity', method: 'findByDocument', alternative: true }]), []);
  assert.equal(mdmBoundCallProblems(code, [{ target: 'entity', method: 'findByDocument', alternative: false }]).length, 1);
});
