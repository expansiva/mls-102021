/// <mls fileReference="_102021_/l1/agentMaterializeL1/testing/fixtureRun.test.ts" enhancement="_blank"/>

/**
 * m1_30: the certification fixture runs inside the canonical run (CLI host, implement stage)
 * against the bytes the run emitted, on a renamed neutral module written to a temp root.
 * Faults are injected in the emitted copy by wrapping a runner, never by a seam in the run.
 *
 * The neutral module is adapted here, not in testing/oracleModule.ts (the m1_27/m1_28 tests pin
 * it): the lifecycle field is `status` because the entity emitter types the states only for a
 * field with that name (handlers/structure/emit.ts), and the l4 record lists required fields
 * because the implement entity emitter makes every other field optional (handlers/behavior).
 */

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { M1_DEFINITION_SCHEMA, parseDefinitionSource, receiptPathFor, renderDefinition, type M1Definition, type MaterializationReceipt } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { planFixture } from '/_102021_/l2/agentMaterializeL1/contracts/fixture.js';
import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { HandlerCall, HandlerOutcome, MaterializeHandlerRunner } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { fixtureReportRef, M1_FIXTURE_CHECK, M1_FIXTURE_HOST_OWNER, parseFixtureReport, type M1RunFixture } from '/_102021_/l2/agentMaterializeL1/run/fixtureRun.js';
import { M1_RUNTIME_OWNER } from '/_102021_/l2/agentMaterializeL1/testing/fixture.js';
import { RENAMED, fixture, tablesOf, type Fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';
import { SCRATCH_PREFIX } from '/_102021_/l1/agentMaterializeL1/testing/memoryLoad.js';
import { createDiskHost, executeCli, loadDefUnits, readProjectProfile, scenarioCatalogRef } from '/_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM = join(HERE, '../../../..');

interface Bench {
  root: string;
  fx: Fixture;
  project: number;
  disk: (ref: string) => string;
  run: (stage: string, patch?: { runners?: Record<string, MaterializeHandlerRunner>; noWorkspace?: boolean }) => ReturnType<typeof executeCli>;
  report: () => Promise<Record<string, M1RunFixture>>;
  entry: (result: Awaited<ReturnType<typeof executeCli>>, page: string) => M1RunFixture;
}

/** Neutral module, renamed, written as defs + contracts + l4 record + a seeds def carrying the fixture plan. */
async function bench(): Promise<Bench> {
  const base = fixture(RENAMED);
  const fx = JSON.parse(JSON.stringify({ ...base, refs: undefined }).replace(/\bstage\b/g, 'status')) as Fixture;
  fx.refs = base.refs;
  const n = fx.n;
  const required = { required: true };
  const record = {
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: n.mod, entityId: n.Entity, kind: 'entity',
    record: {
      fields: {
        id: { type: 'uuid', required: true, derived: true }, version: required, [n.parentField]: required, [n.mdmField]: required, [n.ownerField]: required,
        dockAt: required, status: { type: 'enum', required: true }, details: { required: true, fields: { tideCheck: { fields: { doneAt: required } } } },
        [n.related]: { fields: { id: required } },
      },
    },
  };
  fx.texts[fx.refs.ontology] = `export const ${n.mod}Entity${n.Entity} = ${JSON.stringify(record, null, 2)} as const;\n`;
  const project = Number(n.project.replace(/_/g, ''));
  const root = await mkdtemp(join(tmpdir(), 'm1-30-'));
  const disk = (ref: string) => {
    const match = /^_(\d+)_\/(.*)$/.exec(ref);
    assert.ok(match, ref);
    return join(root, `mls-${match[1]}`, match[2]);
  };
  const put = async (ref: string, text: string) => {
    await mkdir(dirname(disk(ref)), { recursive: true });
    await writeFile(disk(ref), text);
  };
  const defs: Array<[string, M1Definition]> = [...fx.defs.map(([, ref, definition]) => [ref, definition] as [string, M1Definition]), ...fx.controllers];
  for (const entityId of [n.Anchor, n.Mdm]) {
    defs.push([`${n.project}/l1/${n.mod}/layer_3_domain/entities/${entityId.charAt(0).toLowerCase()}${entityId.slice(1)}.defs.ts`, {
      schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'domainEntity', artifactId: entityId, moduleName: n.mod, status: 'pending', dependencies: [],
      data: { entityId, storageTarget: 'mdm', fields: [{ name: 'id', type: 'uuid', derived: true }], lifecycle: { states: [], transitions: [] }, invariants: [], imports: [] },
    } as M1Definition]);
  }
  defs.push([seedsRef(fx), {
    schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'persistenceSeeds', artifactId: 'seeds', moduleName: n.mod, status: 'pending', dependencies: [],
    data: { seedId: 'seeds', phase: 'plan', scenarios: [{ scenarioId: 'certification', tableId: n.entity }], fixture: planFixture(fx.testSupport, tablesOf(fx)) },
  } as M1Definition]);
  for (const [ref, definition] of defs) {
    const rendered = renderDefinition(definition, ref);
    assert.equal('source' in rendered, true, JSON.stringify(rendered));
    if ('source' in rendered) await put(ref, rendered.source);
  }
  for (const [ref, text] of Object.entries(fx.texts)) if (!ref.includes('/l1/')) await put(ref, text);
  await put(`${n.project}/l5/project.json`, JSON.stringify({ appEnv: 'development' }));
  const run: Bench['run'] = (stage, patch = {}) => {
    const host = createDiskHost(root, root, project, PLATFORM);
    host.catalogRef = scenarioCatalogRef(project, n.mod);
    host.runners = { ...host.runners, ...(patch.runners ?? {}) };
    if (patch.noWorkspace) delete host.workspace;
    return executeCli(['--project', String(project), '--module', n.mod, '--stage', stage, '--source-root', root, '--output', root], {
      host,
      readProfile: () => readProjectProfile(root, project),
      loadUnits: (id, moduleName) => loadDefUnits(root, id, moduleName),
    });
  };
  const report = async () => {
    const parsed = parseFixtureReport(await readFile(join(root, `mls-${project}`, fixtureReportRef(n.mod)), 'utf8'), n.mod);
    assert.ok(parsed, 'fixture report unreadable');
    return parsed.entries;
  };
  const entry: Bench['entry'] = (result, page) => {
    const found = result.result?.fixtures?.find(item => item.controller === fx.refs.ctrl(page));
    assert.ok(found, `${page}: no fixture entry\n${result.stdout}`);
    return found;
  };
  return { root, fx, project, disk, run, report, entry };
}

/** Changes the fixture plan the seeds def carries (a source ref of the first dataset). */
async function replan(b: Bench): Promise<void> {
  const parsed = parseDefinitionSource(await readFile(b.disk(seedsRef(b.fx)), 'utf8'));
  assert.ok('definition' in parsed);
  const seeds = parsed.definition as M1Definition;
  const plan = seeds.data.fixture as { datasets: Array<{ sourceRefs: string[] }> };
  plan.datasets[0]!.sourceRefs = [...plan.datasets[0]!.sourceRefs, 'ontology:changed'];
  const rendered = renderDefinition(seeds, seedsRef(b.fx));
  assert.ok('source' in rendered);
  await writeFile(b.disk(seedsRef(b.fx)), rendered.source);
}

function seedsRef(fx: Fixture): string {
  return `${fx.n.project}/l1/${fx.n.mod}/layer_1_external/adapters/persistence/seeds.defs.ts`;
}

/** Wraps a registered runner and edits the emitted source of one def. The run promotes what it returns. */
function mutate(id: string, defPath: string, edit: (source: string) => string, runners: Record<string, MaterializeHandlerRunner>): Record<string, MaterializeHandlerRunner> {
  const inner = runners[id];
  assert.ok(inner, id);
  return {
    [id]: async (call: HandlerCall): Promise<HandlerOutcome> => {
      const produced = await inner(call);
      if (call.unit.defPath !== defPath) return produced;
      const files = Object.fromEntries(Object.entries(produced.files).map(([ref, source]) => {
        const next = edit(source);
        assert.notEqual(next, source, `${defPath}: the injected edit did not apply`);
        return [ref, next];
      }));
      return { ...produced, files };
    },
  };
}

function registered(b: Bench): Record<string, MaterializeHandlerRunner> {
  return createDiskHost(b.root, b.root, b.project, PLATFORM).runners as Record<string, MaterializeHandlerRunner>;
}

function caseOf(item: M1RunFixture, caseId: string) {
  const found = item.receipt?.cases.find(entry => entry.caseId === caseId);
  assert.ok(found, `${caseId} not in the receipt: ${JSON.stringify(item.receipt?.cases.map(entry => entry.caseId))}`);
  return found;
}

async function receiptOf(b: Bench, defPath: string): Promise<MaterializationReceipt> {
  return JSON.parse(await readFile(join(b.root, `mls-${b.project}`, receiptPathFor(defPath)), 'utf8')) as MaterializationReceipt;
}

async function scratchNames(): Promise<Set<string>> {
  return new Set((await readdir(tmpdir())).filter(name => name.startsWith(SCRATCH_PREFIX)));
}

void test('implement runs the fixture on the emitted code; replay reuses; contract, code and fixture changes run it again', { timeout: 300_000 }, async () => {
  const b = await bench();
  const n = b.fx.n;
  try {
    const scratchBefore = await scratchNames();
    const structure = await b.run('structure');
    assert.match(structure.stdout, /ended: COMPLETED/);
    assert.equal(structure.result?.fixtures, undefined, 'structure runs no fixture');
    const first = await b.run('implement');
    const office = b.entry(first, 'office');
    const deck = b.entry(first, 'deck');
    assert.equal(office.status, 'passed', `${office.detail}\n${first.stdout}`);
    assert.equal(deck.status, 'passed', `${deck.detail}\n${first.stdout}`);
    // Positive and negative cases executed against the emitted routes and stores.
    assert.equal(caseOf(deck, `deck.own.qryList${n.Entity}`).memory, 'passed');
    assert.equal(caseOf(deck, `deck.noIdentity.qryList${n.Entity}`).memory, 'passed');
    assert.equal(caseOf(office, `office.contract.cmdUpdate${n.Entity}.id`).memory, 'passed');
    assert.equal(caseOf(office, `office.disclosure.qryList${n.Entity}`).memory, 'passed');
    for (const item of [office, deck]) {
      assert.equal(item.reused, false);
      assert.equal(item.proof, 'memory');
      assert.ok(item.receipt);
      assert.equal(item.receipt.phase, 'tested');
      assert.equal(item.receipt.ledger.created.length > 0, true);
      assert.equal(item.receipt.ledger.created.length, item.receipt.ledger.removed.length);
      assert.deepEqual(item.receipt.ledger.residue, []);
      // Runtime is never proven here; every pending case names its owner.
      assert.equal(item.receipt.cases.every(entry => entry.runtime === 'pending' && entry.runtimeOwner === M1_RUNTIME_OWNER), true);
      assert.equal(item.receipt.cases.filter(entry => entry.memory === 'pending').every(entry => entry.owner && entry.detail), true);
      assert.equal(item.counts.pending, item.receipt.cases.filter(entry => entry.memory === 'pending').length);
      assert.equal(Object.keys(item.hashes.oracle).length > 0 && Object.values(item.hashes.oracle).every(hash => hash.startsWith('sha256:')), true);
      assert.match(item.hashes.fixture, /^sha256:/);
      assert.equal(item.hashes.outputs[item.controller.replace(/\.defs\.ts$/, '.ts')]?.startsWith('sha256:'), true);
      const receipt = await receiptOf(b, item.controller);
      assert.equal(receipt.verifications.find(row => row.id === M1_FIXTURE_CHECK)?.passed, true);
    }
    // The MDM member the create route requires is not invented: those cases stay pending with an owner.
    const create = office.receipt?.cases.filter(entry => entry.caseId.includes(`cmdCreate${n.Entity}`) && !entry.caseId.includes('.contract.')) ?? [];
    assert.equal(create.length > 0 && create.every(entry => entry.memory === 'pending'), true);
    const checks = first.result?.checkpoints.filter(item => item.handlerId === M1_FIXTURE_CHECK) ?? [];
    assert.equal(checks.length, 2);
    assert.equal(checks.every(item => item.accepted), true);
    assert.match(first.stdout, /^fixture: passed .*office\.defs\.ts .*proof=memory runtime=pending/m);
    assert.deepEqual(Object.keys(await b.report()).sort(), [b.fx.refs.ctrl('deck'), b.fx.refs.ctrl('office')].sort());
    assert.deepEqual([...await scratchNames()].filter(name => !scratchBefore.has(name)), [], 'scratch copy left behind');

    // Same hashes: the stored proof is reused, nothing runs again.
    const replay = await b.run('implement');
    for (const page of ['office', 'deck']) {
      const again = b.entry(replay, page);
      assert.equal(again.reused, true, page);
      assert.equal(again.executionId, b.entry(first, page).executionId);
      assert.equal(again.status, 'passed');
    }

    // A contract the deck oracle reads: only deck runs again.
    await writeFile(b.disk(b.fx.refs.deck), `${await readFile(b.disk(b.fx.refs.deck), 'utf8')}\n// edited\n`);
    const contract = await b.run('implement');
    assert.equal(b.entry(contract, 'deck').reused, false);
    assert.notEqual(b.entry(contract, 'deck').executionId, deck.executionId);
    assert.notEqual(b.entry(contract, 'deck').hashes.oracle[b.fx.refs.deck], deck.hashes.oracle[b.fx.refs.deck]);
    assert.equal(b.entry(contract, 'deck').status, 'passed');
    assert.equal(b.entry(contract, 'office').reused, true, contract.stdout);
    assert.equal(b.entry(contract, 'office').executionId, office.executionId);

    // Emitted code both controllers import (the list usecase): both run again.
    const listRef = b.fx.refs.uc(`list${n.Entity}`);
    const listOut = listRef.replace(/\.defs\.ts$/, '.ts');
    const touched = `${await readFile(b.disk(listOut), 'utf8')}// touched\n`;
    await writeFile(b.disk(listOut), touched);
    const listReceipt = await receiptOf(b, listRef);
    listReceipt.outputHashes[listOut] = await contentHash(touched);
    await writeFile(join(b.root, `mls-${b.project}`, receiptPathFor(listRef)), JSON.stringify(listReceipt));
    const code = await b.run('implement');
    for (const page of ['office', 'deck']) {
      assert.equal(b.entry(code, page).reused, false, `${page}\n${code.stdout}`);
      assert.equal(b.entry(code, page).hashes.outputs[listOut], listReceipt.outputHashes[listOut]);
      assert.equal(b.entry(code, page).status, 'passed');
    }

    // The fixture plan changes: both run again.
    await replan(b);
    const replanned = await b.run('implement');
    for (const page of ['office', 'deck']) {
      assert.equal(b.entry(replanned, page).reused, false, page);
      assert.notEqual(b.entry(replanned, page).hashes.fixture, b.entry(code, page).hashes.fixture);
    }
  } finally {
    await rm(b.root, { recursive: true, force: true });
  }
});

void test('an own or disclosure mutation in the emitted controller fails the run verification; the receipt keeps the error', { timeout: 300_000 }, async () => {
  const b = await bench();
  const n = b.fx.n;
  try {
    const runners = registered(b);
    const structure = await b.run('structure', {
      runners: {
        // Own: the actor filter is no longer written into the body.
        ...mutate('structure.httpController', b.fx.refs.ctrl('deck'), source => source.replace('    body[resolved.recordField] = actorId;\n', ''), runners),
      },
    });
    assert.match(structure.stdout, /ended: COMPLETED/);
    // Disclosure: the related record no grant discloses is projected. Edited in the promoted office output, with its receipt hash, as a changed emitter would leave it.
    const officeOut = b.fx.refs.ctrl('office').replace(/\.defs\.ts$/, '.ts');
    const leaked = (await readFile(b.disk(officeOut), 'utf8')).replace(/projectOutput\(data, \[/g, `projectOutput(data, ['${n.related}', `);
    await writeFile(b.disk(officeOut), leaked);
    const officeReceipt = await receiptOf(b, b.fx.refs.ctrl('office'));
    officeReceipt.outputHashes[officeOut] = await contentHash(leaked);
    await writeFile(join(b.root, `mls-${b.project}`, receiptPathFor(b.fx.refs.ctrl('office'))), JSON.stringify(officeReceipt));

    const ran = await b.run('implement');
    const deck = b.entry(ran, 'deck');
    const office = b.entry(ran, 'office');
    assert.equal(deck.status, 'failed', ran.stdout);
    assert.equal(caseOf(deck, `deck.own.qryList${n.Entity}`).memory, 'failed');
    assert.match(deck.detail, new RegExp(`deck\\.own\\.qryList${n.Entity}: `));
    assert.equal(office.status, 'failed', ran.stdout);
    assert.match(caseOf(office, `office.disclosure.qryList${n.Entity}`).detail, new RegExp(n.related));
    for (const item of [deck, office]) {
      assert.deepEqual(item.receipt?.ledger.residue, []);
      const checkpoint = ran.result?.checkpoints.find(entry => entry.handlerId === M1_FIXTURE_CHECK && entry.inputHash === item.key);
      assert.equal(checkpoint?.accepted, false);
      assert.equal((checkpoint?.counts.failed ?? 0) > 0, true);
      const row = (await receiptOf(b, item.controller)).verifications.find(entry => entry.id === M1_FIXTURE_CHECK);
      assert.equal(row?.passed, false);
      assert.match(row?.detail ?? '', /memory failed/);
      // The emitted artifact stays; the fixture does not rewrite def status.
      assert.doesNotMatch(await readFile(b.disk(item.controller), 'utf8'), /"status": "failed"/);
    }
    assert.match(ran.stdout, /^fixture: failed .*deck\.defs\.ts/m);
    // The failed verdict survives a replay with the same hashes.
    const replay = await b.run('implement');
    assert.equal(b.entry(replay, 'deck').reused, true);
    assert.equal(b.entry(replay, 'deck').status, 'failed');
    assert.equal(replay.result?.checkpoints.some(entry => entry.handlerId === M1_FIXTURE_CHECK && !entry.accepted), true);
    // No new planning gate: structure treats the failed row by the existing receipt rule and does not block the controller.
    const again = await b.run('structure');
    const deckUnit = again.result?.units.find(unit => unit.defPath === b.fx.refs.ctrl('deck'));
    assert.ok(deckUnit, again.stdout);
    assert.doesNotMatch(deckUnit.code, /BLOCKED|LOCAL_EDIT|OUTPUT_DRIFT|STATUS_/, `${deckUnit.code} ${deckUnit.detail}`);
  } finally {
    await rm(b.root, { recursive: true, force: true });
  }
});

void test('a partial setup and a failed cleanup keep the cause and the residue in the receipt', { timeout: 300_000 }, async () => {
  const b = await bench();
  const n = b.fx.n;
  try {
    await b.run('structure');
    const runners = registered(b);
    const parentPort = b.fx.refs.parentPort;
    const mainPort = b.fx.refs.port;
    const ran = await b.run('implement', {
      runners: {
        'implement.repositoryPort': async call => {
          const byPath: Record<string, (source: string) => string> = {
            // Cleanup of the parent fails.
            [parentPort]: source => source.replace(/export async function removeMemory\(id: string\): Promise<boolean> \{\n/, match => `${match}  throw new Error('injected remove failure');\n`),
            // The second main row of a setup fails after the parent and the first row were created.
            [mainPort]: source => source.replace(/async create\(record: (\w+)\): Promise<\w+> \{ /, match => `${match}if (String((record as { id?: unknown }).id).endsWith('.2')) throw new Error('injected create failure'); `),
          };
          const edit = byPath[call.unit.defPath];
          const inner = runners['implement.repositoryPort']!;
          return edit ? (await mutate('implement.repositoryPort', call.unit.defPath, edit, { 'implement.repositoryPort': inner }))['implement.repositoryPort']!(call) : inner(call);
        },
      },
    });
    const office = b.entry(ran, 'office');
    assert.equal(office.status, 'failed', ran.stdout);
    const executed = office.receipt?.cases.filter(item => item.memory !== 'pending') ?? [];
    assert.equal(executed.length > 0, true);
    assert.equal(executed.every(item => item.memory === 'failed' && item.detail === 'FIXTURE_SETUP_FAILED: injected create failure'), true, JSON.stringify(executed));
    const ledger = office.receipt!.ledger;
    // Created: parent and first main row per case; the main rows were removed, the parent stayed as residue with its cause.
    assert.equal(ledger.created.filter(item => item.entityId === n.Entity).length, executed.length);
    assert.equal(ledger.removed.filter(item => item.entityId === n.Entity).length, executed.length);
    assert.equal(ledger.removed.some(item => item.entityId === n.Parent), false);
    assert.equal(ledger.residue.length, executed.length);
    assert.equal(ledger.residue.every(item => item.startsWith(`${n.Parent}:`) && item.endsWith('injected remove failure')), true, JSON.stringify(ledger.residue));
    assert.equal(office.counts.residue, executed.length);
    assert.match(office.detail, /residue /);
  } finally {
    await rm(b.root, { recursive: true, force: true });
  }
});

void test('a host with no execution reports the fixture inconclusive with an owner, never passed', { timeout: 300_000 }, async () => {
  const b = await bench();
  try {
    await b.run('structure');
    // Accepted by the node host, then the plan changes and a host with no execution runs implement.
    const accepted = await b.run('implement');
    assert.equal(b.entry(accepted, 'office').status, 'passed');
    await replan(b);
    const ran = await b.run('implement', { noWorkspace: true });
    for (const page of ['office', 'deck']) {
      const item = b.entry(ran, page);
      assert.equal(item.status, 'inconclusive', `${page}: ${item.detail}`);
      assert.equal(item.owner, M1_FIXTURE_HOST_OWNER);
      assert.match(item.detail, /^FIXTURE_HOST_UNAVAILABLE/);
      assert.equal(item.receipt, null);
      assert.equal(item.counts.passed, 0);
      const checkpoint = ran.result?.checkpoints.find(entry => entry.handlerId === M1_FIXTURE_CHECK && entry.inputHash === item.key);
      assert.equal(checkpoint?.accepted, false);
      assert.equal(checkpoint?.counts.inconclusive, 1);
      // The earlier passed row is withdrawn: the receipt shows the latest verdict only.
      assert.equal((await receiptOf(b, item.controller)).verifications.some(entry => entry.id === M1_FIXTURE_CHECK), false);
    }
    assert.match(ran.stdout, /^fixtureDetail: \(L1 host\) FIXTURE_HOST_UNAVAILABLE/m);
    // Inconclusive is never stored as a reusable proof: the node host runs it again.
    const again = await b.run('implement');
    assert.equal(b.entry(again, 'office').reused, false);
    assert.equal(b.entry(again, 'office').status, 'passed');

    // The emitted controller does not import: inconclusive with owner L1, never the emitter's word.
    const officeOut = b.fx.refs.ctrl('office').replace(/\.defs\.ts$/, '.ts');
    const broken = `${await readFile(b.disk(officeOut), 'utf8')}throw new Error('injected import failure');\n`;
    await writeFile(b.disk(officeOut), broken);
    const officeReceipt = await receiptOf(b, b.fx.refs.ctrl('office'));
    officeReceipt.outputHashes[officeOut] = await contentHash(broken);
    await writeFile(join(b.root, `mls-${b.project}`, receiptPathFor(b.fx.refs.ctrl('office'))), JSON.stringify(officeReceipt));
    const unloaded = b.entry(await b.run('implement'), 'office');
    assert.equal(unloaded.status, 'inconclusive');
    assert.equal(unloaded.owner, 'L1');
    assert.match(unloaded.detail, /^FIXTURE_LOAD_FAILED: .*injected import failure/);
    assert.equal(unloaded.receipt, null);
  } finally {
    await rm(b.root, { recursive: true, force: true });
  }
});
