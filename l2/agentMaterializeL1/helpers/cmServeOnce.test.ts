/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/cmServeOnce.test.ts" enhancement="_blank"/>

// d1_347 s7: the route served to the cm whose function does not call `once` is refused by the gate; a comment that says "Incomplete" is not a gate.

import assert from 'node:assert/strict';
import test from 'node:test';

import { serveWithoutOnceProblems } from '/_102021_/l2/agentMaterializeL1/helpers/cmServeOnce.js';

const WITH = `export const requests = {
  'telegram.cm.a': async function (input, ctx) {
    return once(ctx, { scope: 'telegram.cm.a', key: input.ref }, async () => ({ ok: true, output: {} }));
  },
  'telegram.cm.b': async (input, ctx) => {
    return once(ctx, { scope: 'telegram.cm.b', key: input.ref }, async () => ({ ok: true, output: {} }));
  },
};`;
const WITHOUT = `export const requests = {
  'telegram.cm.a': async function (input, ctx) {
    return once(ctx, { scope: 'telegram.cm.a', key: input.ref }, async () => ({ ok: true, output: {} }));
  },
  // once(ctx, ...) is named here and only here
  'telegram.cm.b': async function (input, ctx) {
    return { ok: true, output: {} };
  },
};`;

void test('d1_347 s7: every route served to the cm calls once; one that does not is a problem, a comment does not count', () => {
  assert.deepEqual(serveWithoutOnceProblems(WITH, ['telegram.cm.a', 'telegram.cm.b']), []);
  const problems = serveWithoutOnceProblems(WITHOUT, ['telegram.cm.a', 'telegram.cm.b']);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^CM_SERVE_WITHOUT_ONCE: the function of `telegram\.cm\.b` does not call `once\(/u);
  assert.deepEqual(serveWithoutOnceProblems(WITHOUT, []), [], 'off or no cm route: nothing asked');
  assert.deepEqual(serveWithoutOnceProblems(WITHOUT, ['telegram.cm.c']), [], 'a route with no function is the business of the typing check');
  assert.equal(serveWithoutOnceProblems("// Incomplete: must not be deployed\nexport const requests = { 'x.cm.a': async function () { return 1; } };", ['x.cm.a']).length, 1);
});
