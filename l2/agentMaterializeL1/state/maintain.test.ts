/// <mls fileReference="_102021_/l2/agentMaterializeL1/state/maintain.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  M1_DEFINITION_SCHEMA,
  M1_RECEIPT_SCHEMA,
  outputPathFromDefPath,
  renderDefinition,
  semanticHash,
  type M1Definition,
  type M1Status,
  type MaterializationReceipt,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { hashesAgree, sourceIdentityHash } from '/_102021_/l2/agentDefsL1/helpers/d1Identity.js';
import { M1_RECIPE_VERSION, recipeForStage } from '/_102021_/l2/agentMaterializeL1/state/maintain.js';
import {
  decideMaintenance,
  hashEvidence,
  replaceStatus,
  reverseClosure,
  selectRemoval,
  type MaintenanceInput,
} from '/_102021_/l2/agentMaterializeL1/state/maintain.js';

const DEF = '_102047_/l1/maintainProbe/layer_3_domain/entities/note.defs.ts';

void test('status is outside the semantic hash and D1 does not treat it as a new snapshot', async () => {
  const pending = note('pending');
  const generated = note('generated');
  assert.equal(await semanticHash(pending), await semanticHash(generated));
  const rendered = renderDefinition(pending, DEF);
  assert.ok('source' in rendered);
  const edited = replaceStatus(rendered.source, 'generated');
  assert.ok(edited);
  assert.match(edited, /"status": "generated"/);
  assert.equal(edited.replace('"status": "generated"', '"status": "pending"'), rendered.source);
  assert.equal(await sourceIdentityHash(edited), await sourceIdentityHash(rendered.source));
  assert.equal(await hashesAgree(edited, await sourceIdentityHash(rendered.source)), true);
  assert.match(edited, /"status": "generated"/);
});

void test('pending works, generated needs evidence, and a hand edit does not cascade', async () => {
  const pending = await decideMaintenance(await input(note('pending'), null));
  assert.equal(pending.action, 'generate');

  const bare = await decideMaintenance(await input(note('generated'), null));
  assert.equal(bare.action, 'generate');

  const ready = await receiptFor(note('generated'));
  const reuse = await decideMaintenance(await input(note('generated'), ready, { present: true, hash: ready.outputHashes[outputPathFromDefPath(DEF)] }));
  assert.equal(reuse.action, 'reuse');

  const drifted = await decideMaintenance(await input(note('generated'), ready, { present: true, hash: 'sha256:edited' }));
  assert.equal(drifted.action, 'conflict');
  assert.match(drifted.reason, /^OUTPUT_DRIFT:/);

  const changed = note('generated');
  changed.data = { ...changed.data, imports: ['extra'] };
  const local = await decideMaintenance(await input(changed, ready, { present: true, hash: 'sha256:edited' }));
  assert.equal(local.action, 'conflict');
  assert.match(local.reason, /^LOCAL_EDIT:/);
});

void test('a pending scaffold compile receipt is reuse and implement still generates', async () => {
  const ready = await receiptFor(note('pending'));
  ready.stage = 'compile';
  ready.reason = 'scaffold';
  const outputHash = ready.outputHashes[outputPathFromDefPath(DEF)];
  const pending = await input(note('pending'), ready, { present: true, hash: outputHash });
  pending.dependencyHashes = { 'other.defs.ts': 'sha256:unrelated' };
  const reuse = await decideMaintenance(pending);
  assert.equal(reuse.action, 'reuse');
  assert.match(reuse.reason, /^REUSE:/);

  const implement = await input(note('pending'), ready, { present: true, hash: outputHash });
  implement.stage = 'implement';
  const again = await decideMaintenance(implement);
  assert.equal(again.action, 'generate');

  const kept = await input(note('pending'), ready, { present: true, hash: outputHash });
  kept.stage = 'implement';
  kept.hasImplementHandler = false;
  const reused = await decideMaintenance(kept);
  assert.equal(reused.action, 'reuse');
  assert.match(reused.reason, /^REUSE:/);

  const missing = await input(note('pending'), null);
  missing.stage = 'implement';
  missing.hasImplementHandler = false;
  const absent = await decideMaintenance(missing);
  assert.equal(absent.action, 'blocked');
  assert.match(absent.reason, /^PENDING:/);
});

void test('a resolved block is released and a failed resume is not', async () => {
  const blocked = await receiptFor(note('blocked'));
  blocked.reason = 'MISSING_REF: source.ts';
  blocked.outputHashes = {};
  blocked.verifications = [];
  const held = await decideMaintenance(await input(note('blocked'), blocked, { unresolved: ['source.ts'] }));
  assert.equal(held.action, 'blocked');
  assert.match(held.reason, /^STATUS_BLOCKED:/);

  const released = await decideMaintenance(await input(note('blocked'), blocked, { unresolved: [] }));
  assert.equal(released.action, 'generate');

  const failed = await receiptFor(note('failed'));
  failed.failures = [{ code: 'COMPILE', detail: 'still broken' }];
  failed.outputHashes = {};
  failed.verifications = [{ id: 'compile', kind: 'compile', passed: false, detail: 'still broken' }];
  const again = await decideMaintenance(await input(note('failed'), failed));
  assert.equal(again.action, 'blocked');
  assert.match(again.reason, /^STATUS_FAILED:/);
  assert.match(again.reason, /COMPILE/);

  const moved = note('failed');
  moved.data = { ...moved.data, imports: ['extra'] };
  const eligible = await decideMaintenance(await input(moved, failed));
  assert.equal(eligible.action, 'generate');

  const current = recipeForStage('implement');
  const stale = await decideMaintenance(await input(note('failed'), failed, { recipe: current }));
  assert.equal(stale.action, 'generate');
  assert.match(stale.reason, /^RECIPE_CHANGED:/);

  failed.failures = [{ code: 'LLM_UNAVAILABLE', detail: 'no model' }];
  failed.recipeVersion = current;
  const same = await decideMaintenance(await input(note('failed'), failed, { recipe: current }));
  assert.equal(same.action, 'blocked');
  assert.match(same.reason, /^STATUS_FAILED:/);
  failed.recipeVersion = M1_RECIPE_VERSION;
  const retry = await decideMaintenance(await input(note('failed'), failed, { recipe: current }));
  assert.equal(retry.action, 'generate');
});

void test('recipe and test changes do not rewrite an unrelated output', async () => {
  const ready = await receiptFor(note('generated'));
  const outputHash = ready.outputHashes[outputPathFromDefPath(DEF)];
  const recipe = await decideMaintenance(await input(note('generated'), ready, { present: true, hash: outputHash, recipe: 'other-recipe' }));
  assert.equal(recipe.action, 'generate');
  assert.match(recipe.reason, /^RECIPE_CHANGED:/);

  const testPath = outputPathFromDefPath(DEF).replace(/\.ts$/, '.test.ts');
  ready.sourceHashes[testPath] = 'sha256:old';
  const verify = await decideMaintenance(await input(note('generated'), ready, {
    present: true,
    hash: outputHash,
    testPath,
    testHash: 'sha256:new',
  }));
  assert.equal(verify.action, 'verify');
});

void test('removal keeps manual files and reverse closure skips unrelated units', () => {
  const plan = selectRemoval(['owned.ts'], ['owned.ts', 'manual.ts', 'dir/']);
  assert.deepEqual(plan.remove, ['owned.ts']);
  assert.deepEqual(plan.keep, ['manual.ts', 'dir/']);
  const dependents = new Map<string, string[]>([
    ['a', ['b']],
    ['b', ['c']],
    ['d', []],
  ]);
  assert.deepEqual(reverseClosure(['a'], dependents), ['b', 'c']);
});

void test('a def hashes without its status and a contract hashes its bytes', async () => {
  const rendered = renderDefinition(note('pending'), DEF);
  assert.ok('source' in rendered);
  const generated = replaceStatus(rendered.source, 'generated');
  assert.ok(generated);
  assert.equal(await hashEvidence(rendered.source), await hashEvidence(generated));
  assert.notEqual(await hashEvidence('export const contract = 1;\n'), await hashEvidence('export const contract = 2;\n'));
});

async function input(
  definition: M1Definition,
  receipt: MaterializationReceipt | null,
  patch: {
    present?: boolean;
    hash?: string | null;
    unresolved?: string[];
    recipe?: string | null;
    testPath?: string;
    testHash?: string | null;
  } = {},
): Promise<MaintenanceInput> {
  return {
    definition,
    semantic: await semanticHash(definition),
    receipt,
    dependencyHashes: {},
    outputPath: outputPathFromDefPath(DEF),
    outputPresent: patch.present ?? false,
    outputHash: patch.hash ?? null,
    recipeVersion: patch.recipe === undefined ? M1_RECIPE_VERSION : patch.recipe,
    stage: 'structure',
    hasImplementHandler: true,
    unresolved: patch.unresolved ?? [],
    testPath: patch.testPath ?? '',
    testHash: patch.testHash ?? null,
    verifyOnly: false,
  };
}

async function receiptFor(definition: M1Definition): Promise<MaterializationReceipt> {
  const output = outputPathFromDefPath(DEF);
  return {
    schemaVersion: M1_RECEIPT_SCHEMA,
    runId: 'run',
    candidateId: '',
    defPath: DEF,
    artifactType: definition.artifactType,
    artifactId: definition.artifactId,
    recipeVersion: M1_RECIPE_VERSION,
    semanticHash: await semanticHash(definition),
    dependencyHashes: {},
    sourceHashes: { [DEF]: await semanticHash(definition) },
    outputHashes: { [output]: 'sha256:output' },
    stage: 'generate',
    verifications: [{ id: 'compile', kind: 'compile', passed: true, detail: 'ok' }],
    failures: [],
    attempts: 1,
    reason: '',
  };
}

function note(status: M1Status): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'domainEntity',
    artifactId: 'Note',
    moduleName: 'maintainProbe',
    status,
    dependencies: [],
    data: {
      entityId: 'Note',
      storageTarget: 'moduleDatabase',
      fields: [{ name: 'id', type: 'uuid', derived: true }],
      lifecycle: { states: [{ state: 'ready', reachedBy: 'actor' }], transitions: [] },
      invariants: [],
      imports: [],
    },
  };
}
