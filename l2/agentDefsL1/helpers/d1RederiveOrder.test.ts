/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1RederiveOrder.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { orderByDependency } from '/_102021_/l2/agentDefsL1/helpers/d1Rederive.js';

const REQUESTS = 'l1/m/layer_2_application/requests/bots.defs.ts';
const USECASE = 'l1/m/layer_2_application/usecases/checkBot.defs.ts';
const OTHER = 'l1/m/layer_2_application/usecases/zeta.defs.ts';
const PORT = 'l1/m/layer_2_application/ports/botRepository.defs.ts';

void test('d1_316: the usecase a route uses comes before the route; the rest keeps the path order', () => {
  const reads = new Map([[REQUESTS, [USECASE, 'l4/m/rules.defs.ts']], [USECASE, [PORT]], [OTHER, []]]);
  const sorted = [OTHER, PORT, REQUESTS, USECASE].sort();
  assert.equal(sorted.indexOf(REQUESTS) < sorted.indexOf(USECASE), true, 'by path the route comes first');
  assert.deepEqual(orderByDependency(sorted, reads), [PORT, USECASE, REQUESTS, OTHER]);
});

void test('d1_316: a def that reads one outside the list is not held; a cycle is left in path order', () => {
  assert.deepEqual(orderByDependency([REQUESTS], new Map([[REQUESTS, [USECASE]]])), [REQUESTS]);
  const cycle = new Map([[REQUESTS, [USECASE]], [USECASE, [REQUESTS]]]);
  assert.deepEqual(orderByDependency([REQUESTS, USECASE], cycle), [REQUESTS, USECASE]);
});
