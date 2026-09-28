/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/oracle.test.ts" enhancement="_blank"/>

/**
 * m1_27: the authenticated route cases are derived from the L2 contract, the grants and
 * the authority map, and they run against the code the M1 handlers emit. Actors, rows and
 * bodies come from the m1_28 fixture harness (testing/fixture.ts); the derived obligations stay
 * declared in the catalog output. Expectations come from the derivation.
 * Each injected fault changes the emitted copy and must turn its case red.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { planFixture } from '/_102021_/l2/agentMaterializeL1/contracts/fixture.js';
import { OWN_MARK } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { deriveCatalog, type DerivedCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { fixtureActors, fixtureModel, runFixture, type M1FixtureHost, type M1FixtureModel } from '/_102021_/l2/agentMaterializeL1/testing/fixture.js';
import {
  obligationSourceHashes,
  staleObligations,
  type M1Obligation,
} from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';
import { load, type Loaded } from '/_102021_/l1/agentMaterializeL1/testing/memoryLoad.js';
import { BASE, definitionsOf, derive, fixture, RENAMED, tablesOf, type Fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Runs the obligations through the m1_28 harness: per case setup -> case -> cleanup. */
async function misses(loaded: Loaded, fx: Fixture, obligations: readonly M1Obligation[]): Promise<Map<string, string>> {
  const receipt = await runFixture(modelOf(fx), obligations, hostOf(loaded));
  assert.deepEqual(receipt.ledger.residue, []);
  return new Map(receipt.cases.filter(item => item.memory === 'failed').map(item => [item.caseId, item.detail]));
}

function modelOf(fx: Fixture): M1FixtureModel {
  const plan = planFixture(fx.testSupport, tablesOf(fx));
  assert.ok(plan);
  return fixtureModel(plan, definitionsOf(fx));
}

function hostOf(loaded: Loaded): M1FixtureHost {
  return { runId: 'run', mode: 'development', target: 'memory', stores: loaded.stores, routes: loaded.routes, context: () => createRequestContext() };
}

const FX = fixture(BASE);
const DERIVED = derive(FX);
const byId = (caseId: string): M1Obligation => {
  const found = DERIVED.obligations.find(item => item.caseId === caseId);
  assert.ok(found, `missing obligation ${caseId}; have ${DERIVED.obligations.map(item => item.caseId).join(', ')}`);
  return found;
};

void test('the oracle comes from the contract, the grants and the authority map, and every authenticated case stays pending', () => {
  const cases = DERIVED.catalog.scenarios.flatMap(item => item.cases);
  assert.equal(cases.every(item => item.actorId === '' && (item.runner === 'module' || item.caller?.authorities.length === 0)), true);
  assert.equal(DERIVED.obligations.every(item => item.blocker === 'RUNTIME_IDENTITY_PENDING' && item.owner === 'runtime 102034' && item.expect.ruleId === null), true);
  assert.equal(DERIVED.obligations.every(item => item.caller.authorities.length > 0), true);
  assert.equal(DERIVED.obligations.every(item => DERIVED.gaps.some(gap => gap.reason.includes(`${item.caseId} is declared, not executed`))), true);
  const kinds = new Map<string, number>();
  for (const item of DERIVED.obligations) kinds.set(item.kind, (kinds.get(item.kind) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries(kinds), { contract: 3, disclosure: 5, minimalInput: 4, noIdentity: 2, other: 1, own: 1 });

  const n = FX.n;
  const deckDisclosure = byId(`deck.disclosure.qryList${n.Entity}`);
  // The deck contract declares tideCheck, the owner grant does not disclose it; the related record is not granted.
  assert.deepEqual(deckDisclosure.expect.forbiddenPaths, ['details.tideCheck.doneAt', `${n.related}.details.secret`, `${n.related}.id`].sort());
  assert.equal(deckDisclosure.expect.allowedPaths.includes(`details.${n.note}`), true);
  assert.equal(deckDisclosure.identity, 'owner');
  assert.deepEqual(deckDisclosure.caller.authorities, [`${n.mod}:${n.owner}`]);
  assert.equal(deckDisclosure.sources.includes(FX.refs.deck), true);
  assert.equal(deckDisclosure.sources.includes(FX.refs.scope), true);
  assert.equal(byId(`deck.own.qryList${n.Entity}`).expect.isolatedActorField, n.ownerField);
  assert.equal(byId('deck.other.cmdMarkSailed').identity, 'other');
  assert.equal(byId(`office.minimal.qryList${n.Entity}`).identity, 'member');
  assert.equal(DERIVED.obligations.some(item => item.caseId.startsWith('office.') && item.kind === 'own'), false);

  // A pending grant refuses; it never becomes a passing case.
  const pendingScope = structuredClone(FX.defs.find(([, ref]) => ref === FX.refs.scope)?.[2]);
  assert.ok(pendingScope);
  (pendingScope.data.grants as Array<Record<string, unknown>>)[1].pending = 'ANCHOR_PENDING';
  const units: PlanUnitInput[] = [
    ...FX.defs.map(([, defPath, definition]) => ({ defPath, definition: defPath === FX.refs.scope ? pendingScope : definition })),
    ...FX.controllers.map(([defPath, definition]) => ({ defPath, definition })),
  ];
  const pending = deriveCatalog(n.mod, units, FX.texts);
  assert.equal(pending.obligations.some(item => item.caseId.startsWith('deck.')), false);
  assert.equal(pending.gaps.some(gap => gap.origin.endsWith(`#${FX.routes.sail}`) && gap.reason.startsWith('grant is not resolved')), true);

  // An unmapped grant refuses as well (d1_36).
  const map = structuredClone(FX.defs.find(([, ref]) => ref === FX.refs.authority)?.[2]);
  assert.ok(map);
  map.data.entries = (map.data.entries as Array<{ grantId: string }>).filter(entry => entry.grantId !== `${n.owner}Deck`);
  const unmapped = deriveCatalog(n.mod, units.map(unit => unit.defPath === FX.refs.authority ? { ...unit, definition: map } : unit.defPath === FX.refs.scope ? { ...unit, definition: FX.defs.find(([, ref]) => ref === FX.refs.scope)![2] } : unit), FX.texts);
  assert.equal(unmapped.obligations.some(item => item.caseId.startsWith('deck.')), false);
  assert.equal(unmapped.gaps.some(gap => gap.reason.startsWith('AUTHORITY_UNMAPPED')), true);
});

void test('renamed fixture derives the same cases and no id reaches the derivation code', () => {
  const renamed = derive(fixture(RENAMED));
  const shape = (derived: DerivedCatalog) => derived.obligations.map(item => `${item.kind}:${item.identity}:${item.expect.status}:${item.expect.forbiddenPaths.length}:${item.expect.allowedPaths.length}`).sort();
  assert.deepEqual(shape(renamed), shape(DERIVED));
  const body = JSON.stringify(renamed.obligations) + JSON.stringify(renamed.catalog);
  for (const id of Object.values(BASE)) assert.equal(body.includes(id), false, id);
  for (const file of ['obligations.ts', 'derive.ts', 'fixture.ts', '../contracts/fixture.ts']) {
    const source = readFileSync(join(HERE, file), 'utf8');
    for (const id of [...Object.values(BASE), ...Object.values(RENAMED).slice(1), 'agendaClinica', 'Consulta', 'profissional', 'paciente']) {
      assert.equal(source.includes(id), false, `${file} names ${id}`);
    }
  }
});

void test('the emitted code meets every derived case, and the catalog denials run in memory', async () => {
  const loaded = await load(FX);
  try {
    assert.deepEqual([...(await misses(loaded, FX, DERIVED.obligations)).entries()], []);
    const denials = DERIVED.catalog.scenarios.flatMap(item => item.cases).filter(item => item.runner === 'route');
    assert.equal(denials.length, 5);
    for (const item of denials) {
      const handler = loaded.routes.get(item.routine);
      assert.ok(handler);
      const ctx = createRequestContext();
      const error = await handler({ request: { routine: item.routine, params: {}, meta: { source: 'http', verifiedAuthorities: item.caller?.authorities ?? [] } }, ctx })
        .then(() => null, (failure: { code?: string; statusCode?: number }) => failure);
      assert.equal(item.expect.ok, false);
      assert.equal(error?.code, item.expect.errorCode, item.caseId);
      assert.equal(error?.statusCode, item.expect.status, item.caseId);
    }
    // What a v1.1 contract case with actorId = actorRef became: the body carried `actorId`, and the
    // refusal came from that undeclared member, not from the omitted required field.
    const contract = DERIVED.obligations.find(item => item.kind === 'contract' && item.identity === 'member');
    assert.ok(contract);
    const handler = loaded.routes.get(contract.routine);
    assert.ok(handler);
    const ctx = createRequestContext();
    ctx.sessionContext.actorId = fixtureActors('run', contract.actorRef).member;
    const refused = await handler({ request: { routine: contract.routine, params: { actorId: contract.actorRef }, meta: { source: 'http', verifiedAuthorities: contract.caller.authorities } }, ctx })
      .then(() => null, (failure: { code?: string; statusCode?: number; message?: string }) => failure);
    assert.equal(refused?.code, 'VALIDATION_ERROR');
    assert.equal(refused?.statusCode, 400);
    assert.equal(refused?.message, 'actorId is not permitted.');
  } finally {
    loaded.dispose();
  }
});

void test('a fault injected in the emitted copy turns its case red', async () => {
  const n = FX.n;
  const E = n.Entity;
  const fn = (route: string) => `handle${(route.split('.').pop() ?? '').charAt(0).toUpperCase()}${(route.split('.').pop() ?? '').slice(1)}`;
  const inHandler = (source: string, route: string, from: string, to: string): string => {
    const at = source.indexOf(`async function ${fn(route)}(`);
    assert.ok(at >= 0, fn(route));
    const hit = source.indexOf(from, at);
    assert.ok(hit > at, `${from} in ${fn(route)}`);
    return source.slice(0, hit) + to + source.slice(hit + from.length);
  };
  const minimal = byId(`office.minimal.qryList${E}`);
  const faults: Array<{ name: string; ref: string; edit: (source: string) => string; caseId: string; reason: RegExp }> = [
    {
      name: 'optional filter made mandatory',
      ref: FX.refs.ctrl('office'),
      edit: source => inHandler(source, FX.routes.officeList, 'validateInput(input.request.params, [', `validateInput(input.request.params, ['${minimal.input.optional[0]}', `),
      caseId: minimal.caseId,
      reason: /^different outcome: expected ok 200, got VALIDATION_ERROR 400$/,
    },
    {
      name: 'own scope removed from the controller',
      ref: FX.refs.ctrl('deck'),
      edit: source => source.replace(/\n[ \t]*\/\/ enforce:scope\n[^\n]*/, ''),
      caseId: `deck.own.qryList${E}`,
      reason: /^actor filter missed$/,
    },
    {
      name: 'own check removed from the transition',
      ref: FX.refs.uc('markSailed'),
      edit: source => source.replace(new RegExp(`\\n[ \\t]*${OWN_MARK}\\n[^\\n]*`), ''),
      caseId: 'deck.other.cmdMarkSailed',
      reason: /^different outcome: expected NOT_FOUND 404, got ok 200$/,
    },
    {
      name: 'nested leak of an undisclosed member',
      ref: FX.refs.ctrl('office'),
      edit: source => inHandler(source, FX.routes.officeList, 'projectOutput(data, [', "projectOutput(data, ['details', "),
      caseId: `office.disclosure.qryList${E}`,
      reason: new RegExp(`^undisclosed path returned: details\\.${n.note}$`),
    },
    {
      name: 'leak of a related record the grant does not disclose',
      ref: FX.refs.ctrl('deck'),
      edit: source => inHandler(source, FX.routes.deckList, 'projectOutput(data, [', `projectOutput(data, ['${n.related}', `),
      caseId: `deck.disclosure.qryList${E}`,
      reason: new RegExp(`^forbidden path returned: ${n.related}\\.`),
    },
  ];
  const clean = await load(FX);
  const cleanSources = new Map(clean.sources);
  clean.dispose();
  for (const fault of faults) {
    const loaded = await load(FX, (ref, source) => ref === fault.ref ? fault.edit(source) : source);
    try {
      assert.notEqual(loaded.sources.get(fault.ref), cleanSources.get(fault.ref), `${fault.name}: the copy did not change`);
      const found = await misses(loaded, FX, DERIVED.obligations);
      assert.match(found.get(fault.caseId) ?? '(passed)', fault.reason, `${fault.name}: ${JSON.stringify([...found])}`);
    } finally {
      loaded.dispose();
    }
  }
});

void test('a changed contract invalidates only the cases that read it', async () => {
  const before = await obligationSourceHashes(DERIVED.obligations, FX.texts);
  assert.equal(Object.values(before).includes('absent'), false);
  const texts = { ...FX.texts, [FX.refs.office]: `${FX.texts[FX.refs.office]}\n// edited\n` };
  const after = await obligationSourceHashes(DERIVED.obligations, texts);
  const stale = staleObligations(DERIVED.obligations, before, after);
  const expected = DERIVED.obligations.filter(item => item.sources.includes(FX.refs.office)).map(item => item.caseId);
  assert.deepEqual(stale, expected);
  assert.equal(stale.length > 0 && stale.length < DERIVED.obligations.length, true);
  assert.equal(stale.some(item => item.startsWith('deck.')), false);
  const missing = { ...FX.texts };
  delete missing[FX.refs.scope];
  assert.equal(staleObligations(DERIVED.obligations, before, await obligationSourceHashes(DERIVED.obligations, missing)).length, DERIVED.obligations.length);
});
