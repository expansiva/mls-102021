/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/d1_313.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { gatewayOutputFieldProblems, typeMemberNames } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { READ_NEVER_FAILS } from '/_102021_/l2/agentMaterializeL1/helpers/readNeverFails.js';
import { catalogTypeBody } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { notImplementedProblems } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const CATALOG = `
export interface CheckBotIdentityInput { botId: string }
export type CheckBotIdentityOutput =
  | { success: true; name: string }
  | { success: false; reason: string };
export type Plain = { value: string };
`;

void test('d1_313: a union output type reaches the model with every member', () => {
  assert.equal(catalogTypeBody(CATALOG, 'CheckBotIdentityOutput'), '{ success: true; name: string } | { success: false; reason: string }');
  assert.equal(catalogTypeBody(CATALOG, 'Plain'), '{ value: string }');
  assert.equal(catalogTypeBody(CATALOG, 'CheckBotIdentityInput'), '{ botId: string }');
  assert.deepEqual(typeMemberNames(catalogTypeBody(CATALOG, 'CheckBotIdentityOutput')), ['success', 'name', 'reason']);
});

void test('d1_313: a field of the answer that no member has is refused, by `in` too', () => {
  const outputs = [{ operationId: 'checkBotIdentity', fields: ['success', 'name', 'reason'] }];
  const bad = [
    "const identity = await gateway.checkBotIdentity({ botId }, ctx);",
    "if (!('result' in identity)) throw new AppError('INVALID_GATEWAY_RESPONSE', 'x', 502);",
    'const shown = identity.reportedName;',
  ].join('\n');
  const problems = gatewayOutputFieldProblems(bad, outputs);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /reads `reportedName`/u);
  assert.match(problems[1], /reads `result`/u);
  const good = [
    "const identity = await gateway.checkBotIdentity({ botId }, ctx);",
    "if ('success' in identity && identity.success) lastCheck = { name: identity.name };",
    'else if (!identity.success) lastCheck = { reason: identity.reason };',
  ].join('\n');
  assert.deepEqual(gatewayOutputFieldProblems(good, outputs), []);
});

void test('d1_313: a route that throws NOT_IMPLEMENTED or answers 501 does not close', () => {
  assert.equal(notImplementedProblems("throw new AppError('NOT_IMPLEMENTED', 'No usecase checks it.', 501);").length, 1);
  assert.equal(notImplementedProblems("throw new AppError('SOMETHING', 'x', 501);").length, 1);
  assert.deepEqual(notImplementedProblems("throw new AppError('BOT_NOT_FOUND', 'x', 404);\n// NOT_IMPLEMENTED in a comment"), []);
});

void test('d1_313: a read does not fail for a missing item; the refusal stays on the write that chooses it', () => {
  assert.match(READ_NEVER_FAILS, /derived field comes out empty/u);
  assert.match(READ_NEVER_FAILS, /NOT_FOUND for a missing item belongs to the write that chooses the item/u);
});
