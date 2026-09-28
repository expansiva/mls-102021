/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/fixture.test.ts" enhancement="_blank"/>

/**
 * m1_28: the certification fixture runs the m1_27 obligations against the emitted code, in
 * memory, with ids of its own and a cleanup that removes only them. The plan comes from the
 * p1_12 testSupport shape; the module is neutral and renamed without changing the result.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { planFixture, readFixturePlan, type M1FixturePlan } from '/_102021_/l2/agentMaterializeL1/contracts/fixture.js';
import { deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import {
  cleanupFixture,
  fixtureActors,
  fixtureModel,
  M1_RUNTIME_OWNER,
  runFixture,
  type M1FixtureHost,
  type M1FixtureLedger,
  type M1FixtureReceipt,
  type M1FixtureStore,
} from '/_102021_/l2/agentMaterializeL1/testing/fixture.js';
import { load, type Loaded } from '/_102021_/l1/agentMaterializeL1/testing/memoryLoad.js';
import { BASE, definitionsOf, derive, fixture, RENAMED, tablesOf, type Fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';

interface Spy { calls: Array<{ op: 'create' | 'remove'; entityId: string; value: unknown }>; stores: Record<string, M1FixtureStore> }

/** Wraps the emitted stores; `failOn` throws on that create call (1-based) to simulate a partial setup. */
function spy(loaded: Loaded, failOn: { entityId: string; call: number } | null = null): Spy {
  const calls: Spy['calls'] = [];
  const stores: Record<string, M1FixtureStore> = {};
  for (const [entityId, store] of Object.entries(loaded.stores)) {
    let creates = 0;
    stores[entityId] = {
      create: async record => {
        creates += 1;
        calls.push({ op: 'create', entityId, value: structuredClone(record) });
        if (failOn && failOn.entityId === entityId && failOn.call === creates) throw new Error('injected create failure');
        return store.create(record);
      },
      remove: async id => {
        calls.push({ op: 'remove', entityId, value: id });
        return store.remove(id);
      },
      list: () => store.list(),
    };
  }
  return { calls, stores };
}

function planOf(fx: Fixture): M1FixturePlan {
  const plan = planFixture(fx.testSupport, tablesOf(fx));
  assert.ok(plan);
  return plan;
}

function hostOf(loaded: Loaded, stores: Record<string, M1FixtureStore>, patch: Partial<M1FixtureHost> = {}): M1FixtureHost {
  return { runId: 'run', mode: 'development', target: 'memory', stores, routes: loaded.routes, context: () => createRequestContext(), ...patch };
}

async function run(fx: Fixture, loaded: Loaded, stores: Record<string, M1FixtureStore>, patch: Partial<M1FixtureHost> = {}): Promise<M1FixtureReceipt> {
  return runFixture(fixtureModel(planOf(fx), definitionsOf(fx)), derive(fx).obligations, hostOf(loaded, stores, patch));
}

/** Rows of another execution, present before the fixture and expected untouched after it. */
function foreign(fx: Fixture): { main: Record<string, unknown>[]; parent: Record<string, unknown>[] } {
  const n = fx.n;
  return {
    parent: [{ id: 'other-run.parent', version: 1, label: 'kept' }],
    main: [{ id: 'other-run.main', version: 1, [n.parentField]: 'other-run.parent', [n.ownerField]: 'other-run.person', dockAt: '2030-01-01T00:00:00.000Z', stage: 'moored', details: {} }],
  };
}

async function contents(loaded: Loaded, fx: Fixture): Promise<{ main: unknown[]; parent: unknown[] }> {
  return { main: await loaded.stores[fx.n.Entity]!.list(), parent: await loaded.stores[fx.n.Parent]!.list() };
}

async function preload(loaded: Loaded, fx: Fixture): Promise<void> {
  const rows = foreign(fx);
  loaded.stores[fx.n.Entity]!.reset(rows.main);
  loaded.stores[fx.n.Parent]!.reset(rows.parent);
}

function statusOf(receipt: M1FixtureReceipt): string[] {
  return receipt.cases.map(item => `${item.caseId.split('.').slice(0, 2).join('.')}:${item.memory}`).sort();
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

void test('setup -> cases -> cleanup: two owners of the same category, a user with no link, related data, no residue', async () => {
  const fx = fixture(BASE);
  const n = fx.n;
  const loaded = await load(fx);
  try {
    await preload(loaded, fx);
    const before = await contents(loaded, fx);
    const watched = spy(loaded);
    const receipt = await run(fx, loaded, watched.stores);
    assert.equal(receipt.phase, 'tested', JSON.stringify(receipt.cases.filter(item => item.memory === 'failed')));
    assert.deepEqual(receipt.ledger.residue, []);
    assert.equal(receipt.ledger.created.length, receipt.ledger.removed.length);
    assert.deepEqual(await contents(loaded, fx), before, 'rows of another execution changed');
    // Removed only what it created, children before parents.
    const created = new Set(watched.calls.filter(call => call.op === 'create').map(call => (call.value as { id: string }).id));
    assert.equal(watched.calls.filter(call => call.op === 'remove').every(call => created.has(String(call.value)) || receipt.ledger.created.some(item => item.id === call.value && item.by === 'case')), true);
    assert.equal(watched.calls.some(call => call.op === 'remove' && String(call.value).startsWith('other-run')), false);

    // The own case: rows of two actors of the same category; the parent id is the one the store returned.
    const own = receipt.cases.find(item => item.caseId === `deck.own.qryList${n.Entity}`);
    assert.equal(own?.memory, 'passed');
    const creates = watched.calls.filter(call => call.op === 'create').map(call => call as { entityId: string; value: Record<string, unknown> });
    const run1 = creates.filter(call => String(call.value.id).startsWith('run.1.'));
    assert.deepEqual(run1.map(call => call.entityId), [n.Parent, n.Entity, n.Entity]);
    const actors = fixtureActors('run.1', n.owner);
    assert.deepEqual(run1.slice(1).map(call => call.value[n.ownerField]), [actors.owner, actors.other]);
    assert.equal(run1.slice(1).every(call => call.value[n.parentField] === run1[0]!.value.id), true);
    // Nothing identifies the caller in the body.
    assert.equal(creates.some(call => 'actorId' in call.value), false);
    for (const kind of ['other', 'noIdentity']) {
      assert.equal(receipt.cases.filter(item => item.caseId.includes(`.${kind}.`)).every(item => item.memory === 'passed'), true, kind);
    }

    // Executed in memory x pending, from the plan: the required MDM member keeps its runtime owner.
    const pending = receipt.cases.filter(item => item.memory === 'pending');
    assert.deepEqual(pending.map(item => item.caseId).sort(), [`office.contract.cmdCreate${n.Entity}.${n.parentField}`, `office.disclosure.cmdCreate${n.Entity}`, `office.minimal.cmdCreate${n.Entity}`].sort());
    assert.equal(pending.every(item => item.owner === M1_RUNTIME_OWNER && item.detail.startsWith(`mdm:${n.Mdm}: RUNTIME_MDM_FIXTURE_UNREFERENCED`)), true);
    assert.equal(receipt.cases.filter(item => item.memory === 'passed').length, 13);
    // No authenticated case is proven in the runtime yet.
    assert.equal(receipt.cases.every(item => item.runtime === 'pending' && item.runtimeOwner === M1_RUNTIME_OWNER && item.runtimeGap.startsWith('identity:')), true);
  } finally {
    loaded.dispose();
  }
});

void test('renamed ids give the same result and none of the original ids', async () => {
  const base = fixture(BASE);
  const renamed = fixture(RENAMED);
  const loadedBase = await load(base);
  const loadedRenamed = await load(renamed);
  try {
    const left = await run(base, loadedBase, loadedBase.stores);
    const right = await run(renamed, loadedRenamed, loadedRenamed.stores);
    assert.equal(right.phase, 'tested');
    const shape = (receipt: M1FixtureReceipt) => receipt.cases.map(item => `${item.memory}:${item.caseId.split('.')[1]}`).sort();
    assert.deepEqual(shape(right), shape(left));
    assert.equal(right.ledger.created.length, left.ledger.created.length);
    const body = JSON.stringify(right) + JSON.stringify(planOf(renamed));
    for (const [key, id] of Object.entries(BASE)) {
      if (key === 'project') continue;
      assert.equal(new RegExp(`(?<![A-Za-z])${id}(?![a-z])`).test(body), false, id);
    }
  } finally {
    loadedBase.dispose();
    loadedRenamed.dispose();
  }
});

void test('a failure in the middle of setup removes only what this execution created; a repeat is clean', async () => {
  const fx = fixture(BASE);
  const loaded = await load(fx);
  try {
    await preload(loaded, fx);
    const before = await contents(loaded, fx);
    // The second main row of the first case fails after its parent and one sibling exist.
    const broken = spy(loaded, { entityId: fx.n.Entity, call: 2 });
    const failed = await run(fx, loaded, broken.stores);
    const first = failed.cases.find(item => item.memory !== 'pending');
    assert.equal(first?.memory, 'failed');
    assert.match(first?.detail ?? '', /^FIXTURE_SETUP_FAILED: injected create failure$/);
    assert.notEqual(failed.phase, 'tested');
    assert.deepEqual(failed.ledger.residue, []);
    assert.deepEqual(await contents(loaded, fx), before);
    // Same run id again, then another run id: nothing collides and nothing foreign goes.
    for (const runId of ['run', 'run', 'second']) {
      const again = await run(fx, loaded, loaded.stores, { runId });
      assert.equal(again.phase, 'tested', runId);
      assert.deepEqual(await contents(loaded, fx), before, runId);
    }
    // Cleanup is idempotent: a second call removes nothing more and leaves no residue.
    const ledger: M1FixtureLedger = { created: [], removed: [], residue: [] };
    const created = await loaded.stores[fx.n.Parent]!.create({ id: 'manual.1', version: 1, label: 'x' }) as { id: string };
    ledger.created.push({ entityId: fx.n.Parent, id: created.id, by: 'setup' });
    await cleanupFixture(ledger, loaded.stores);
    await cleanupFixture(ledger, loaded.stores);
    assert.equal(ledger.removed.length, 1);
    assert.deepEqual(ledger.residue, []);
    assert.deepEqual(await contents(loaded, fx), before);
  } finally {
    loaded.dispose();
  }
});

void test('production, homologation and a database target are refused before any write', async () => {
  const fx = fixture(BASE);
  const loaded = await load(fx);
  try {
    for (const patch of [{ mode: 'production' }, { mode: 'homologation' }, { target: 'development' as const }]) {
      const watched = spy(loaded);
      const receipt = await run(fx, loaded, watched.stores, patch);
      assert.equal(receipt.phase, 'refused', JSON.stringify(patch));
      assert.notEqual(receipt.refused, '');
      assert.deepEqual(watched.calls, []);
      assert.deepEqual(receipt.cases, []);
    }
  } finally {
    loaded.dispose();
  }
});

void test('a record the case creates is registered by its returned id and removed', async () => {
  const fx = fixture(BASE);
  // Same module without the required MDM member: the create cases become executable.
  fx.texts[fx.refs.office] = fx.texts[fx.refs.office]!.replace(`  "${fx.n.mdmField}": string;\n`, '');
  const loaded = await load(fx);
  try {
    await preload(loaded, fx);
    const before = await contents(loaded, fx);
    const receipt = await run(fx, loaded, loaded.stores);
    assert.equal(receipt.phase, 'tested', JSON.stringify(receipt.cases.filter(item => item.memory !== 'passed')));
    assert.equal(receipt.cases.every(item => item.memory === 'passed'), true);
    assert.equal(receipt.ledger.created.some(item => item.by === 'case' && item.entityId === fx.n.Entity), true);
    assert.deepEqual(await contents(loaded, fx), before);
  } finally {
    loaded.dispose();
  }
});

void test('code that wrongly accepts a refused create still leaves nothing behind', async () => {
  const fx = fixture(BASE);
  fx.texts[fx.refs.office] = fx.texts[fx.refs.office]!.replace(`  "${fx.n.mdmField}": string;\n`, '');
  const derived = derive(fx);
  const contract = derived.obligations.find(item => item.kind === 'contract' && item.routine === fx.routes.create);
  assert.ok(contract);
  assert.equal(contract.mutating, false);
  const omitted = contract.input.omitted[0] ?? '';
  // The copy validates a body with the omitted member filled in, so the refused create goes through.
  const fn = `handle${(fx.routes.create.split('.').pop() ?? '').replace(/^./, char => char.toUpperCase())}`;
  const loaded = await load(fx, (_ref, source) => {
    const at = source.indexOf(`async function ${fn}(`);
    if (at < 0) return source;
    const hit = source.indexOf('validateInput(input.request.params, [', at);
    assert.ok(hit > at);
    return `${source.slice(0, hit)}validateInput({ ...input.request.params, '${omitted}': 'x' }, [${source.slice(hit + 'validateInput(input.request.params, ['.length)}`;
  });
  try {
    await preload(loaded, fx);
    const before = await contents(loaded, fx);
    const receipt = await runFixture(fixtureModel(planOf(fx), definitionsOf(fx)), [contract], hostOf(loaded, loaded.stores));
    assert.equal(receipt.cases[0]?.memory, 'failed');
    assert.match(receipt.cases[0]?.detail ?? '', /^different outcome: expected VALIDATION_ERROR 400, got ok 200$/);
    assert.equal(receipt.ledger.created.some(item => item.by === 'case'), true);
    assert.deepEqual(receipt.ledger.residue, []);
    assert.deepEqual(await contents(loaded, fx), before);
    assert.notEqual(receipt.phase, 'tested');
  } finally {
    loaded.dispose();
  }
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
  assert.equal(reasons.filter(reason => reason.startsWith('FIXTURE_HARNESS_UNWIRED (L1): ')).length, 13);
  assert.equal(reasons.filter(reason => reason.startsWith(`mdm:${fx.n.Mdm}: `) && reason.includes(`(${M1_RUNTIME_OWNER})`)).length, 3);
  assert.equal(reasons.every(reason => reason.includes(`runtime proof RUNTIME_IDENTITY_PENDING (${M1_RUNTIME_OWNER}): identity:`)), true);
  // The gaps are not catalog bytes: the catalog stays the same.
  assert.equal(JSON.stringify(withPlan.catalog.scenarios.filter(item => item.artifactType !== 'persistenceSeeds')), JSON.stringify(without.catalog.scenarios));
});

void test('no dataset for the route entity keeps its cases pending; nothing is created for them', async () => {
  const fx = fixture(BASE);
  const loaded = await load(fx);
  try {
    const plan = planOf(fx);
    const trimmed = { ...plan, datasets: plan.datasets.filter(item => item.entityId !== fx.n.Entity) };
    const watched = spy(loaded);
    const receipt = await runFixture(fixtureModel(trimmed, definitionsOf(fx)), derive(fx).obligations, hostOf(loaded, watched.stores));
    assert.equal(receipt.cases.every(item => item.memory === 'pending' && item.detail.startsWith('FIXTURE_DATASET_UNPLANNED') && item.owner === 'L1'), true);
    assert.equal(receipt.phase, 'planned');
    assert.deepEqual(statusOf(receipt).filter(item => !item.endsWith(':pending')), []);
    assert.deepEqual(watched.calls, []);
    // The same entity owned by the runtime: pending with that item and the runtime as owner.
    const owned = { ...trimmed, runtime: [...trimmed.runtime, { supportId: `mdm:${fx.n.Entity}`, kind: 'mdm' as const, entityId: fx.n.Entity, actorRefs: [], gap: 'RUNTIME_MDM_FIXTURE_UNREFERENCED: x', owner: 'runtime' as const }] };
    const runtime = await runFixture(fixtureModel(owned, definitionsOf(fx)), derive(fx).obligations, hostOf(loaded, watched.stores));
    assert.equal(runtime.cases.every(item => item.memory === 'pending' && item.owner === M1_RUNTIME_OWNER && item.detail.startsWith(`mdm:${fx.n.Entity}: `)), true);
    assert.deepEqual(watched.calls, []);
  } finally {
    loaded.dispose();
  }
});
