/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/fixtureRun.test.ts" enhancement="_blank"/>

/**
 * m1_41 a-P1: a v2 route reaches its usecases through the page request (`requests[route].uses`),
 * not a handler `usecaseId`. With every unit ready and no executor, the controller entry carries
 * the host gap, and no case is held as "usecase is not a unit".
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { planFixture } from '/_102021_/l2/helpers/l1Defs/fixture.js';
import { fixturePass } from '/_102021_/l2/agentMaterializeL1/run/fixtureRun.js';
import { deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { BASE, fixture, tablesOf } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';

const HOST_GAP = 'FIXTURE_HOST_UNAVAILABLE: test host has no executor.';

void test('fixturePass on v2 defs with no executor reports the host gap, not an unmatched usecase', async () => {
  const fx = fixture(BASE);
  const plan = planFixture(fx.testSupport, tablesOf(fx));
  assert.ok(plan);
  const seeds = {
    ...fx.defs[0]![2], artifactType: 'persistenceSeeds', artifactId: 'seeds', dependencies: [],
    data: { seedId: 'seeds', phase: 'plan', scenarios: [{ scenarioId: 'x', tableId: fx.n.entity }], fixture: plan },
  } as M1Definition;
  const units = [
    ...fx.defs.map(([, defPath, definition]) => ({ defPath, definition })),
    ...fx.controllers.map(([defPath, definition]) => ({ defPath, definition })),
    { defPath: `${fx.n.project}/l1/${fx.n.mod}/layer_1_external/adapters/persistence/seeds.defs.ts`, definition: seeds },
  ];
  // The handlers are v2: they name a service function and no usecase.
  for (const [, controller] of fx.controllers) {
    for (const handler of controller.data.handlers as Record<string, unknown>[]) assert.equal('usecaseId' in handler, false);
  }
  const { obligations } = deriveCatalog(fx.n.mod, units, fx.texts);
  assert.ok(obligations.length > 0);
  const entries = await fixturePass({
    moduleName: fx.n.mod,
    units,
    obligations,
    oracleSources: {},
    unready: async () => '',
    read: async () => null,
    previous: null,
    execute: null,
    hostGap: HOST_GAP,
    mode: 'development',
    runStamp: 'run',
  });
  assert.equal(entries.length, fx.controllers.length);
  for (const entry of entries) {
    assert.deepEqual(entry.unready.map(item => item.detail).filter(detail => detail.includes('is not a unit')), [], entry.controller);
    assert.equal(entry.status, 'inconclusive', entry.controller);
    assert.equal(entry.detail, HOST_GAP, entry.controller);
  }
});
