/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/fixture.test.ts" enhancement="_blank"/>

/**
 * m1_28: the certification fixture plan comes from the p1_12 testSupport shape, and the run
 * report names the memory status and the runtime owner of every obligation. m1_33: running the
 * obligations against the emitted code is not done here (no generated code is executed).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { planFixture, readFixturePlan, type M1FixturePlan } from '/_102021_/l2/helpers/l1Defs/fixture.js';
import { deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { M1_RUNTIME_OWNER } from '/_102021_/l2/agentMaterializeL1/testing/fixture.js';
import { BASE, fixture, tablesOf, type Fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';

function planOf(fx: Fixture): M1FixturePlan {
  const plan = planFixture(fx.testSupport, tablesOf(fx));
  assert.ok(plan);
  return plan;
}

void test('the D1 plan and the M1 reader share one shape; a v1.1 plan has no fixture', () => {
  const fx = fixture(BASE);
  const plan = planOf(fx);
  assert.deepEqual(readFixturePlan(JSON.parse(JSON.stringify(plan))), plan);
  assert.equal(planFixture(undefined, tablesOf(fx)), null);
  assert.equal(planFixture([], tablesOf(fx)), null);
  assert.deepEqual(plan.datasets.map(item => [item.entityId, item.dependsOn]), [[fx.n.Entity, [fx.n.Parent]], [fx.n.Parent, []]]);
  assert.deepEqual(plan.runtime.map(item => [item.supportId, item.owner]), [[`identity:${fx.n.org}`, 'runtime'], [`identity:${fx.n.owner}`, 'runtime'], [`mdm:${fx.n.Mdm}`, 'runtime']]);
  // No rows, ids or grants in the plan.
  assert.equal(/"rows"|"grant|"id":/.test(JSON.stringify(plan)), false);
  const missing = planFixture(fx.testSupport, tablesOf(fx).filter(table => table.entityId !== fx.n.Parent));
  assert.ok(missing);
  assert.deepEqual(missing.gaps, [`FIXTURE_TABLE_UNPLANNED: data:${fx.n.Parent} has no local table`]);
  assert.equal('issues' in readFixturePlan({ ...plan, schemaVersion: 'x' }), true);
});

void test('the run report names the memory status and the runtime owner of every obligation', () => {
  const fx = fixture(BASE);
  const units = [...fx.defs.map(([, defPath, definition]) => ({ defPath, definition })), ...fx.controllers.map(([defPath, definition]) => ({ defPath, definition }))];
  const without = deriveCatalog(fx.n.mod, units, fx.texts);
  assert.equal(without.gaps.filter(gap => gap.reason.startsWith('FIXTURE_PLAN_ABSENT (L1): ')).length, without.obligations.length);
  const seedsPath = `${fx.n.project}/l1/${fx.n.mod}/layer_1_external/adapters/persistence/seeds.defs.ts`;
  const seeds = {
    ...fx.defs[0]![2], artifactType: 'persistenceSeeds', artifactId: 'seeds', dependencies: [],
    data: { seedId: 'seeds', phase: 'plan', scenarios: [{ scenarioId: 'x', tableId: fx.n.entity }], fixture: planOf(fx) },
  } as M1Definition;
  const withPlan = deriveCatalog(fx.n.mod, [...units, { defPath: seedsPath, definition: seeds }], fx.texts);
  const reasons = withPlan.gaps.filter(gap => gap.reason.includes(' is declared, not executed')).map(gap => gap.reason);
  assert.equal(reasons.length, withPlan.obligations.length);
  // v2 (m1_40 r2b): the route entity comes from the page request. 13 -> 16: `other` is gone (no selector in v2),
  // shape (2 qry) and success (2 single-entity cmd) are new. `dock` uses the parent and the entity usecases, so its
  // 5 cases are ambiguous, never one entity picked by position. r2c: `berth` adds 4 cases, all `mdm:` below, so 16 stays.
  assert.equal(reasons.filter(reason => reason.startsWith('FIXTURE_MEMORY_AT_IMPLEMENT (L1): ')).length, 16);
  const ambiguous = reasons.filter(reason => reason.startsWith(`FIXTURE_ROUTE_ENTITY_AMBIGUOUS: ${fx.routes.dock} uses ${fx.n.Parent},${fx.n.Entity} (L1): `));
  assert.equal(ambiguous.length, 5);
  assert.equal(ambiguous.length, withPlan.obligations.filter(item => item.routine === fx.routes.dock).length);
  // r2c: `berth` creates the entity alone and its input requires the MDM ref, so its 4 cases (contract, minimal,
  // disclosure, success) need the runtime MDM record. v1 had 3 (no success case then).
  const mdm = reasons.filter(reason => reason.startsWith(`mdm:${fx.n.Mdm}: `) && reason.includes(`(${M1_RUNTIME_OWNER})`));
  assert.equal(mdm.length, 4);
  assert.deepEqual(mdm.map(reason => /: (\S+) is declared, not executed/.exec(reason)?.[1]).sort(), withPlan.obligations.filter(item => item.routine === fx.routes.berth).map(item => item.caseId).sort());
  // The rollback case waits for Postgres (m1_40 r1); every other one for the runtime identity.
  const rollbackIds = withPlan.obligations.filter(item => item.kind === 'rollback').map(item => item.caseId);
  assert.equal(rollbackIds.length, 1);
  assert.equal(reasons.every(reason => rollbackIds.some(id => reason.includes(`${id} is declared`))
    ? reason.includes(`runtime proof POSTGRES_ONLY (${M1_RUNTIME_OWNER} (DATABASE_URL_TEST)): identity:`)
    : reason.includes(`runtime proof RUNTIME_IDENTITY_PENDING (${M1_RUNTIME_OWNER}): identity:`)), true);
  // The gaps are not catalog bytes: the catalog stays the same.
  assert.equal(JSON.stringify(withPlan.catalog.scenarios.filter(item => item.artifactType !== 'persistenceSeeds')), JSON.stringify(without.catalog.scenarios));
});
