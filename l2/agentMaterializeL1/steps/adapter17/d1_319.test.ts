/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/d1_319.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { adapterProblems } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/adapter.js';
import { failureMemberSection, failureMembersOf } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/failureMember.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const DECLARATION = readFileSync(path.join(HERE, 'fixtures/telegramDeclaration.recorded.txt'), 'utf8');
const ADAPTER = readFileSync(path.join(HERE, 'fixtures/telegramAdapter.recorded.txt'), 'utf8');
const HEADER = ADAPTER.split('\n')[0];
const DECLARATION_IMPORT = '/_102047_/l1/telegram/layer_1_external/connections/telegram.js';

const REFUSAL = `if (!response.ok) {
      if (response.response && ['refused', 'invalid', 'not_found', 'conflict'].includes(response.code)) {
        return { ok: true, output: { success: false, reason: response.message } };
      }
      return response;
    }`;

void test('d1_319: the operations whose output has a failure member with a reason are the ones the declaration says, by the type', () => {
  assert.deepEqual(failureMembersOf(DECLARATION).map(item => [item.operationId, item.marker, item.reasonField]), [
    ['checkBotIdentity', 'success', 'reason'],
    ['setMessageDelivery', 'success', 'reason'],
    ['sendText', 'success', 'reason'],
  ]);
  const text = failureMemberSection(failureMembersOf(DECLARATION));
  assert.match(text, /`response`/u);
  assert.match(text, /`unavailable`/u);
  assert.deepEqual(failureMembersOf('export type X = { a: string };\nexport default { operations: [{ operationId: "o", outputType: "X", direction: "call" }] };'), []);
  assert.equal(failureMemberSection([]), '');
});

void test('d1_319: an adapter that returns the failed result before it reads the response is refused for each such operation', () => {
  const problems = adapterProblems(ADAPTER, DECLARATION, HEADER, DECLARATION_IMPORT).filter(problem => problem.startsWith('Operation '));
  assert.equal(problems.length, 3, problems.join(' | '));
  assert.match(problems[0], /Operation checkBotIdentity: .*response/u);
});

void test('d1_319: an adapter that reads the response of a refusal passes; an operation without a failure member is not asked for it', () => {
  const fixed = ADAPTER.split('if (!response.ok) return response;').join(REFUSAL);
  assert.deepEqual(adapterProblems(fixed, DECLARATION, HEADER, DECLARATION_IMPORT).filter(problem => problem.startsWith('Operation ')), []);
  const plain = DECLARATION.replace(/export type SendTextOutput =[\s\S]*?;\n/u, 'export type SendTextOutput = { messageIds: number[] };\n');
  const problems = adapterProblems(ADAPTER.replace('if (!response.ok) return response;', REFUSAL), plain, HEADER, DECLARATION_IMPORT).filter(problem => problem.startsWith('Operation '));
  assert.equal(problems.some(problem => problem.startsWith('Operation sendText')), false);
});
