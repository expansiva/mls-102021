/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/mdmPlatformLimits.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { listUsersPageSizeProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { MDM_LIST_USERS_PAGE_SIZE_MAX } from '/_102021_/l2/agentMaterializeL1/helpers/mdmPlatformLimits.js';
import { mdmContextSection } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.resolve(HERE, '../../../../mls-102034/l1/mdm/layer_3_usecases/identityUsersContracts.ts');
const RECORDED = path.join(HERE, '../steps/usecases40/fixtures/listOrganizationUserPageSize200.recorded.txt');

test('d1_245: the page cap is the one the MDM contract enforces', () => {
  const found = /const PAGE_SIZE_MAX = (\d+);/u.exec(readFileSync(CONTRACT, 'utf8'));
  assert.ok(found, 'identityUsersContracts.ts must still declare PAGE_SIZE_MAX');
  assert.equal(MDM_LIST_USERS_PAGE_SIZE_MAX, Number(found[1]));
});

test('d1_245: the context of a usecase bound to identity.listUsers states the cap', () => {
  const text = mdmContextSection('agents', null, null, [], null, '', [{ target: 'identity', method: 'listUsers', alternative: false }]);
  assert.ok(text.includes(`from 1 to ${MDM_LIST_USERS_PAGE_SIZE_MAX}`), text);
  assert.ok(text.includes('nextCursor'), text);
});

test('d1_245: the recorded listOrganizationUser of 9e8b640a (pageSize 200) is refused, and the capped one passes', () => {
  const code = readFileSync(RECORDED, 'utf8');
  const problems = listUsersPageSizeProblems(code);
  assert.equal(problems.length, 2, 'the cursor ternary has two literals');
  assert.ok(problems[0].includes(`1 to ${MDM_LIST_USERS_PAGE_SIZE_MAX}`) && problems[0].includes('identityUsersContracts.ts'), problems[0]);
  assert.deepEqual(listUsersPageSizeProblems(code.replace(/pageSize: 200/gu, `pageSize: ${MDM_LIST_USERS_PAGE_SIZE_MAX}`)), []);
});

test('d1_245: the gate reads only a literal inside the listUsers call', () => {
  assert.deepEqual(listUsersPageSizeProblems('// await ctx.mdm.identity.listUsers({ pageSize: 500 });\n'), []);
  assert.deepEqual(listUsersPageSizeProblems('await ctx.mdm.identity.listUsers({ pageSize });\nconst size = Math.min(input.pageSize, 200);'), []);
  assert.deepEqual(listUsersPageSizeProblems('await ctx.mdm.collection.listByType({ type, pageSize: 200 });'), []);
  assert.equal(listUsersPageSizeProblems('await ctx.mdm.identity.listUsers({ pageSize: 101, name });').length, 1);
});
