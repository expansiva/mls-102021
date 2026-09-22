/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Receipt.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { pipelineFile, plannerPipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  commitD1Unit,
  fingerprintProject,
  outsideOwnedWrites,
  progressFile,
  unitIsIntact,
  type D1UnitPart,
} from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readText, removeDefFile } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { inputFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';

const PROJECT = 102047;
const MODULE = 'agendaClinica';
const SNAPSHOT = 'sha256:snapshot';

function defPath(name: string): string {
  return `l1/${MODULE}/layer_3_domain/entities/${name}.defs.ts`;
}

function info(path: string) {
  const file = fileInfoFromDisplay(PROJECT, path);
  assert.ok(file, path);
  return file;
}

function inputBody(hash: string): string {
  return `${JSON.stringify({
    schemaVersion: '2026-09-21-d1-input-v1',
    project: PROJECT,
    moduleName: MODULE,
    snapshotHash: hash,
  }, null, 2)}\n`;
}

function part(name: string, source: string, receiptHash = ''): D1UnitPart {
  return { defPath: defPath(name), source, receiptHash };
}

async function hostWith(snapshot = SNAPSHOT): Promise<TestHost> {
  const host = installStudio(PROJECT);
  seed(host, inputFile(PROJECT, MODULE), inputBody(snapshot), 'input-mtime');
  seed(host, plannerPipelineFile(PROJECT, MODULE), '{"planner":true}\n', 'planner-mtime');
  seed(host, { project: PROJECT, level: 4, folder: '.hidden', shortName: 'note', extension: '.txt' }, 'hidden', 'hidden-mtime');
  seed(host, { project: PROJECT, level: 1, folder: 'otherModule/layer_3_domain/entities', shortName: 'neighbor', extension: '.defs.ts' }, 'NEIGHBOR', 'neighbor-mtime');
  return host;
}

void test('a stop after the first file resumes without rewriting the intact file', async () => {
  const host = await hostWith();
  const first = info(defPath('alpha'));
  const second = info(defPath('beta'));
  const earlier = info(defPath('gamma'));
  seed(host, earlier, 'GAMMA', 'gamma-mtime');
  const unit = {
    project: PROJECT,
    moduleName: MODULE,
    step: 'domain30',
    unitId: 'bundle',
    draftText: '{"draft":1}',
    snapshotHash: SNAPSHOT,
    runId: 'run-a',
    parts: [part('alpha', 'ALPHA'), part('beta', 'BETA')],
  };
  await assert.rejects(() => commitD1Unit({ ...unit, failAfterMutations: 1 }), /INJECTED_STOP/);
  assert.equal(host.files[fileKey(first)]?.content, 'ALPHA');
  assert.equal(host.files[fileKey(second)], undefined);
  assert.equal(host.files[fileKey(earlier)]?.content, 'GAMMA');
  assert.equal(host.files[fileKey(earlier)]?.updatedAt, 'gamma-mtime');
  host.files[fileKey(first)]!.updatedAt = 'kept';
  const progress = JSON.parse(host.files[fileKey(progressFile(PROJECT, MODULE, 'domain30', 'bundle'))]?.content || '{}') as { transaction: boolean; finalized: boolean };
  assert.equal(progress.transaction, false);
  assert.equal(progress.finalized, false);

  const resumed = await commitD1Unit(unit);
  assert.deepEqual(resumed.issues, []);
  assert.equal(resumed.finalized, true);
  assert.equal(host.files[fileKey(first)]?.content, 'ALPHA');
  assert.equal(host.files[fileKey(first)]?.updatedAt, 'kept');
  assert.equal(host.files[fileKey(second)]?.content, 'BETA');
  assert.equal(host.files[fileKey(earlier)]?.content, 'GAMMA');
  assert.equal(host.files[fileKey(earlier)]?.updatedAt, 'gamma-mtime');
  assert.equal(await readText(plannerPipelineFile(PROJECT, MODULE)), '{"planner":true}\n');
});

void test('a local hash and a hash that changes before the write both block overwrite', async () => {
  const host = await hostWith();
  const file = info(defPath('alpha'));
  const original = 'ORIGINAL';
  seed(host, file, original, 'same-mtime');
  const receipt = await sha256Text(original);
  const blocked = await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'domain30',
    unitId: 'one',
    draftText: 'draft',
    snapshotHash: SNAPSHOT,
    runId: 'run-a',
    parts: [part('alpha', 'NEXT', 'sha256:not-the-file')],
  });
  assert.match(blocked.issues[0] || '', /was not overwritten/);
  assert.equal(host.files[fileKey(file)]?.content, original);
  assert.equal(host.files[fileKey(file)]?.updatedAt, 'same-mtime');

  const raced = await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'domain30',
    unitId: 'two',
    draftText: 'draft',
    snapshotHash: SNAPSHOT,
    runId: 'run-a',
    parts: [part('alpha', 'NEXT', receipt)],
    beforeMutate: async () => {
      host.files[fileKey(file)]!.content = 'LOCAL';
      host.files[fileKey(file)]!.updatedAt = 'same-mtime';
    },
  });
  assert.match(raced.issues[0] || '', /changed before the write/);
  assert.match(raced.issues[0] || '', /Origin is run run-a/);
  assert.equal(host.files[fileKey(file)]?.content, 'LOCAL');
  assert.equal(host.files[fileKey(file)]?.updatedAt, 'same-mtime');
});

void test('an older run does not overwrite a newer one, and a drifted snapshot is not final', async () => {
  const host = await hostWith();
  const file = info(defPath('alpha'));
  const first = await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'domain30',
    unitId: 'race',
    draftText: 'draft-b',
    snapshotHash: SNAPSHOT,
    runId: 'run-b',
    parts: [part('alpha', 'FROM-B')],
  });
  assert.equal(first.finalized, true);
  const late = await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'domain30',
    unitId: 'race',
    draftText: 'draft-a',
    snapshotHash: SNAPSHOT,
    runId: 'run-a',
    parts: [part('alpha', 'FROM-A')],
  });
  assert.match(late.issues[0] || '', /Concurrent run run-b owns domain30\/race/);
  assert.equal(host.files[fileKey(file)]?.content, 'FROM-B');

  const alpha = info(defPath('alpha'));
  const beta = info(defPath('beta'));
  seed(host, beta, 'BETA-OLD', 'beta-mtime');
  host.files[fileKey(inputFile(PROJECT, MODULE))]!.content = inputBody('sha256:next');
  const drifted = await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'persistence40',
    unitId: 'drift',
    draftText: 'draft',
    snapshotHash: SNAPSHOT,
    runId: 'run-b',
    parts: [part('alpha', 'FROM-B'), part('beta', 'BETA-NEW')],
  });
  assert.equal(drifted.invalidated, true);
  assert.match(drifted.issues[0] || '', /sha256:snapshot/);
  assert.match(drifted.issues[0] || '', /sha256:next/);
  assert.equal(host.files[fileKey(alpha)]?.content, 'FROM-B');
  assert.equal(host.files[fileKey(beta)]?.content, 'BETA-OLD');
  assert.equal(host.files[fileKey(beta)]?.updatedAt, 'beta-mtime');
  assert.equal(await unitIsIntact(PROJECT, MODULE, 'domain30', 'race', SNAPSHOT), false);
});

void test('removal stops halfway, keeps the other file, and does not delete the ts output', async () => {
  const host = await hostWith();
  const first = info(defPath('alpha'));
  const second = info(defPath('beta'));
  const output = info(`l1/${MODULE}/layer_3_domain/entities/alpha.ts`);
  const sibling = info(`l1/${MODULE}/layer_3_domain/entities/kept.defs.ts`);
  seed(host, first, 'ALPHA', 'alpha-mtime');
  seed(host, second, 'BETA', 'beta-mtime');
  seed(host, output, 'export const alpha = 1;\n', 'ts-mtime');
  seed(host, sibling, 'KEEP', 'keep-mtime');
  const alphaHash = await sha256Text('ALPHA');
  const betaHash = await sha256Text('BETA');
  const unit = {
    project: PROJECT,
    moduleName: MODULE,
    step: 'controllers60',
    unitId: 'drop',
    draftText: 'draft',
    snapshotHash: SNAPSHOT,
    runId: 'run-a',
    parts: [
      { defPath: defPath('alpha'), source: '', action: 'remove' as const, receiptHash: alphaHash },
      { defPath: defPath('beta'), source: '', action: 'remove' as const, receiptHash: betaHash },
    ],
  };
  await assert.rejects(() => commitD1Unit({ ...unit, failAfterMutations: 1 }), /INJECTED_STOP/);
  assert.equal(await readText(first), null);
  assert.equal(host.files[fileKey(second)]?.content, 'BETA');
  assert.equal(host.files[fileKey(second)]?.updatedAt, 'beta-mtime');
  assert.equal(host.files[fileKey(output)]?.content, 'export const alpha = 1;\n');
  assert.equal(host.files[fileKey(output)]?.updatedAt, 'ts-mtime');
  assert.equal(host.files[fileKey(sibling)]?.updatedAt, 'keep-mtime');

  const resumed = await commitD1Unit(unit);
  assert.deepEqual(resumed.issues, []);
  assert.equal(await readText(second), null);
  assert.equal(await readText(first), null);
  assert.equal(host.files[fileKey(output)]?.updatedAt, 'ts-mtime');
  assert.ok(resumed.reported.some(path => path.endsWith('/alpha.ts')));
  assert.equal(host.files[fileKey(sibling)]?.content, 'KEEP');
  await assert.rejects(() => removeDefFile(plannerPipelineFile(PROJECT, MODULE)), /refuses to remove/);
  await assert.rejects(() => removeDefFile(output), /refuses to remove/);
  assert.equal(host.files[fileKey(plannerPipelineFile(PROJECT, MODULE))]?.updatedAt, 'planner-mtime');
});

void test('the same input twice does not write and does not call a model', async () => {
  const host = await hostWith();
  const calls = { llm: 0 };
  const unit = {
    project: PROJECT,
    moduleName: MODULE,
    step: 'usecases50',
    unitId: 'usecases50',
    draftText: '{"llmCalls":0}',
    snapshotHash: SNAPSHOT,
    runId: 'run-a',
    parts: [part('alpha', 'ALPHA'), part('beta', 'BETA')],
  };
  const first = await commitD1Unit(unit);
  assert.equal(first.finalized, true);
  assert.equal(calls.llm, 0);
  const alpha = host.files[fileKey(info(defPath('alpha')))]!;
  const beta = host.files[fileKey(info(defPath('beta')))]!;
  const alphaHash = await sha256Text(alpha.content);
  const betaHash = await sha256Text(beta.content);
  const alphaMtime = alpha.updatedAt;
  const betaMtime = beta.updatedAt;
  host.writes.length = 0;
  const second = await commitD1Unit(unit);
  assert.equal(second.finalized, true);
  assert.deepEqual(second.written, []);
  assert.equal(calls.llm, 0);
  assert.equal(host.writes.length, 0);
  assert.equal(alpha.updatedAt, alphaMtime);
  assert.equal(beta.updatedAt, betaMtime);
  assert.equal(await sha256Text(alpha.content), alphaHash);
  assert.equal(await sha256Text(beta.content), betaHash);
  assert.equal(await unitIsIntact(PROJECT, MODULE, 'usecases50', 'usecases50', SNAPSHOT), true);
  alpha.content = 'TOUCHED';
  assert.equal(await unitIsIntact(PROJECT, MODULE, 'usecases50', 'usecases50', SNAPSHOT), false);
  const checkpoint = host.files[fileKey(pipelineFile(PROJECT, MODULE))];
  assert.equal(checkpoint, undefined);
});

void test('the project fingerprint includes hidden files and names a neighbor that changed', async () => {
  const host = await hostWith();
  const before = await fingerprintProject(PROJECT);
  assert.equal(before.some(entry => entry.hidden), true);
  const committed = await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'domain30',
    unitId: 'print',
    draftText: 'draft',
    snapshotHash: SNAPSHOT,
    runId: 'run-a',
    parts: [part('alpha', 'ALPHA')],
  });
  assert.equal(committed.finalized, true);
  const after = await fingerprintProject(PROJECT);
  assert.deepEqual(outsideOwnedWrites(before, after, MODULE), []);
  const hidden = after.find(entry => entry.hidden);
  assert.ok(hidden);
  host.files[hidden.key]!.content = 'tampered';
  host.files[fileKey(plannerPipelineFile(PROJECT, MODULE))]!.content = '{"planner":false}\n';
  const caught = outsideOwnedWrites(after, await fingerprintProject(PROJECT), MODULE);
  assert.equal(caught.some(key => key.includes('.hidden')), true);
  assert.equal(caught.some(key => key.includes('/pipeline/pipeline.json') || key.endsWith('pipeline.json')), true);
  const refused = await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'domain30',
    unitId: 'print',
    draftText: 'draft',
    snapshotHash: SNAPSHOT,
    runId: 'run-a',
    parts: [{ defPath: 'l1/otherModule/layer_3_domain/entities/neighbor.defs.ts', source: 'NO' }],
  });
  assert.match(refused.issues[0] || '', /not a def this agent can write/);
  assert.equal(host.files[fileKey(info('l1/otherModule/layer_3_domain/entities/neighbor.defs.ts'))]?.content, 'NEIGHBOR');
});
