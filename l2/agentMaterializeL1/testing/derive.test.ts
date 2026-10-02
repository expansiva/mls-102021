/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/derive.test.ts" enhancement="_blank"/>

/**
 * m1_41 b2: the derivation is read on the v2 neutral module (`oracleModule`, BASE and RENAMED). No clinic
 * fixture, no v1 def tree and no client project on disk. Expected counts come from the fixture defs.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { M1_CATALOG_SCHEMA, M1_CATALOG_SCHEMA_V11, M1_EXISTING_RECORD, parseCatalog } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { catalogBytes, deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { BASE, fixture, RENAMED, type Fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';

function unitsOf(fx: Fixture): PlanUnitInput[] {
  return [...fx.defs.map(([, defPath, definition]) => ({ defPath, definition })), ...fx.controllers.map(([defPath, definition]) => ({ defPath, definition }))];
}

interface Handler { route: string; grantIds: string[] }
function handlersOf(definition: M1Definition): Handler[] {
  return Array.isArray(definition.data.handlers) ? definition.data.handlers as unknown as Handler[] : [];
}

void test('derived catalog follows the defs and ignores array order', () => {
  const fx = fixture(BASE);
  const units = unitsOf(fx);
  const first = deriveCatalog(fx.n.mod, units, fx.texts);
  const reversed = deriveCatalog(fx.n.mod, [...units].reverse(), fx.texts);
  assert.equal(catalogBytes(first.catalog), catalogBytes(reversed.catalog));
  const createId = `create${fx.n.Entity}`;
  const created = first.catalog.scenarios.find(item => item.artifactId === createId);
  assert.ok(created);
  assert.equal(created.cases.some(item => item.caseId === `${createId}.reachesStub`), true);
  assert.equal(created.cases.some(item => item.synthetic.length > 0), false);

  // A local rulePlan row is a declared obligation, never an oracle.
  assert.equal(first.gaps.some(gap => gap.reason.includes('not an oracle')), false);
  const createRef = fx.refs.uc(createId);
  const withLocal = units.map(unit => unit.defPath !== createRef ? unit : {
    ...unit,
    definition: { ...unit.definition, data: { ...unit.definition.data, rulePlan: [{ ruleId: 'anyRule', enforcement: 'local', origin: `${createRef}#rulePlan` }] } },
  });
  const local = deriveCatalog(fx.n.mod, withLocal, fx.texts);
  assert.deepEqual(local.gaps.filter(gap => gap.reason.includes('not an oracle')).map(gap => gap.artifactId), [createId]);

  const other = fixture(RENAMED);
  const body = catalogBytes(deriveCatalog(other.n.mod, unitsOf(other), other.texts).catalog);
  for (const id of Object.values(BASE)) assert.equal(body.includes(id), false, id);

  const [ctrlPath, controller] = fx.controllers.find(([, definition]) => definition.artifactId === fx.n.pageA)!;
  const dropped = fx.routes.amend;
  assert.equal(handlersOf(controller).some(item => item.route === dropped), true);
  const trimmed = { ...controller, data: { ...controller.data, handlers: handlersOf(controller).filter(item => item.route !== dropped) as unknown as M1Definition['data'][string] } } as M1Definition;
  const without = deriveCatalog(fx.n.mod, units.map(unit => unit.defPath === ctrlPath ? { ...unit, definition: trimmed } : unit), fx.texts);
  const before = first.catalog.scenarios.find(item => item.artifactId === fx.n.pageA);
  const after = without.catalog.scenarios.find(item => item.artifactId === fx.n.pageA);
  assert.ok(before && after);
  const removed = before.cases.filter(item => !after.cases.some(next => next.caseId === item.caseId));
  assert.equal(removed.length > 0, true);
  assert.equal(removed.every(item => item.routine === dropped), true);
  assert.equal(after.cases.some(item => item.routine === dropped), false);
});

void test('v1.1 names module cases and the route caller from the grant', () => {
  const fx = fixture(BASE);
  const units = unitsOf(fx);
  const derived = deriveCatalog(fx.n.mod, units, fx.texts);
  assert.equal(derived.catalog.schemaVersion, M1_CATALOG_SCHEMA_V11);
  const cases = derived.catalog.scenarios.flatMap(item => item.cases);
  const moduleCases = cases.filter(item => item.runner === 'module');
  const routeCases = cases.filter(item => item.runner === 'route');
  assert.equal(moduleCases.length + routeCases.length, cases.length);
  // Module cases: one compile per scenario that is not a controller, plus the usecase business cases.
  const controllers = new Set(fx.controllers.map(([, definition]) => definition.artifactId));
  assert.equal(moduleCases.length > 0, true);
  assert.equal(moduleCases.every(item => item.caller === undefined), true);
  // m1_27: only the denials without authority stay executable, one per controller handler.
  const handlerCount = fx.controllers.reduce((sum, [, definition]) => sum + handlersOf(definition).length, 0);
  assert.equal(routeCases.length, handlerCount);
  const denied = routeCases.filter(item => item.gate === 'auth');
  assert.equal(denied.length, routeCases.length);
  assert.equal(denied.every(item => item.caller?.source === 'http' && item.caller.authorities.length === 0), true);
  assert.equal(derived.catalog.scenarios.filter(item => controllers.has(item.artifactId)).every(item => item.cases.filter(entry => entry.runner === 'route').length === handlersOf(fx.controllers.find(([, definition]) => definition.artifactId === item.artifactId)![1]).length), true);
  assert.equal(derived.gaps.some(gap => gap.reason === 'contract required field was not read'), false);

  const scope = units.find(unit => unit.definition.artifactType === 'accessScope');
  assert.ok(scope);
  const actorByGrant = new Map<string, string>();
  const grants = Array.isArray(scope.definition.data.grants) ? scope.definition.data.grants : [];
  for (const grant of grants) {
    if (grant && typeof grant === 'object' && typeof (grant as { grantId?: string }).grantId === 'string') {
      actorByGrant.set((grant as { grantId: string }).grantId, String((grant as { actorRef?: string }).actorRef ?? ''));
    }
  }
  assert.equal(cases.every(item => item.actorId === '' && (item.runner === 'module' || item.caller?.authorities.length === 0)), true);
  assert.equal(cases.some(item => item.gate === 'contract'), false);
  const positive = derived.obligations.filter(entry => entry.kind === 'contract');
  assert.equal(positive.length > 0, true);
  assert.equal(derived.obligations.every(entry => entry.expect.ruleId === null), true);
  assert.equal(derived.obligations.every(entry => derived.gaps.some(gap => gap.reason.includes(`${entry.caseId} is declared, not executed`))), true);
  for (const item of positive) {
    assert.equal(item.caller?.source, 'http');
    assert.equal(item.blocker, 'RUNTIME_IDENTITY_PENDING');
    assert.equal(item.identity === 'member' || item.identity === 'owner', true);
    const controller = derived.catalog.scenarios.find(scenario => item.caseId.startsWith(`${scenario.artifactId}.`));
    const unit = units.find(entry => entry.definition.artifactType === 'httpController' && entry.definition.artifactId === controller?.artifactId);
    assert.ok(unit);
    const handler = handlersOf(unit.definition).find(entry => entry.route === item.routine);
    const expected = [...new Set((handler?.grantIds ?? []).map(id => `${fx.n.mod}:${actorByGrant.get(id) ?? ''}`))].sort();
    assert.deepEqual(item.caller?.authorities, expected);
    assert.equal(expected.length > 0 && expected.every(authority => authority !== `${fx.n.mod}:`), true);
  }
  // A catalog of the first schema (no runner, no caller) still parses.
  const legacyCatalog = {
    ...derived.catalog,
    schemaVersion: M1_CATALOG_SCHEMA,
    scenarios: derived.catalog.scenarios.map(scenario => ({ ...scenario, cases: scenario.cases.map(({ runner: _runner, caller: _caller, ...rest }) => rest) })),
  };
  const legacy = parseCatalog(JSON.stringify(legacyCatalog));
  assert.deepEqual(legacy.issues, []);
  assert.equal(legacy.catalog?.schemaVersion, M1_CATALOG_SCHEMA);
  assert.equal(legacy.catalog?.scenarios[0]?.cases[0]?.runner, undefined);
  const again = parseCatalog(JSON.stringify(derived.catalog));
  assert.deepEqual(again.issues, []);
  assert.equal(again.catalog?.scenarios.flatMap(item => item.cases).filter(item => item.runner === 'module').length, moduleCases.length);
});

void test('m1_35: route cases do not repeat what the L2 page test of the same routine covers', () => {
  // The L2 page test emits `.ok`, `.<field>.required` (VALIDATION_ERROR), `.gone` (NOT_FOUND) and
  // `.notDeletable` (CONFLICT) per routine (mls-102020 cfeCreateShared). The catalog only carries the
  // unauthenticated refusal, which no page test declares.
  const fx = fixture(BASE);
  const derived = deriveCatalog(fx.n.mod, unitsOf(fx), fx.texts);
  const routes = derived.catalog.scenarios.flatMap(item => item.cases).filter(item => item.runner === 'route');
  assert.ok(routes.length > 0);
  for (const item of routes) {
    assert.equal(item.gate, 'auth', item.caseId);
    assert.equal(item.expect.errorCode, 'FORBIDDEN_ACTOR', item.caseId);
    assert.deepEqual(item.caller?.authorities, [], item.caseId);
  }
});

void test('update positive requires a stored record and the missing id expects 404', () => {
  for (const n of [BASE, RENAMED]) {
    const fx = fixture(n);
    const derived = deriveCatalog(n.mod, unitsOf(fx), fx.texts);
    const updateId = `update${n.Entity}`;
    const update = derived.catalog.scenarios.find(item => item.artifactId === updateId);
    assert.ok(update, n.mod);
    const positive = update.cases.find(item => item.caseId === `${updateId}.reachesStub`);
    const negative = update.cases.find(item => item.caseId === `${updateId}.missingRecord`);
    assert.ok(positive && negative);
    assert.equal(positive.preconditions.includes(M1_EXISTING_RECORD), true);
    assert.equal(positive.expect.ok, true);
    assert.equal(positive.expect.status, 200);
    assert.equal(negative.preconditions.includes(M1_EXISTING_RECORD), false);
    assert.equal(negative.expect.ok, false);
    assert.equal(negative.expect.status, 404);
    assert.equal(negative.expect.errorCode, 'NOT_FOUND');
    if (n === RENAMED) for (const id of Object.values(BASE)) assert.equal(catalogBytes(derived.catalog).includes(id), false, id);
  }
});
