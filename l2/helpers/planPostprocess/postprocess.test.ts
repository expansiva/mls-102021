/// <mls fileReference="_102021_/l2/helpers/planPostprocess/postprocess.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { installStudio, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { seedD1Fixture, loadD1Artifacts } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import type { D1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { postprocessPlan } from '/_102021_/l2/helpers/planPostprocess/postprocess.js';
import { usedRemovedUsecases } from '/_102021_/l2/helpers/planPostprocess/usedRemoved.js';

const PROJECT = 102047;
const MODULE = 'comandaRestaurante';
const FIXTURE = 'comandaRestaurante-c0f25ee';

test('postprocess writes the three files when a route still uses a removed usecase', async () => {
  const previous = saveMls();
  try {
    const host = installStudio(PROJECT);
    seedD1Fixture(host, FIXTURE, PROJECT);
    const parked = parkOne(loadD1Artifacts(FIXTURE, MODULE));
    writePlan(host, parked.artifacts);
    const outcome = await postprocessPlan(MODULE);
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.corrections.length, 1);
    assert.equal(outcome.corrections[0].usecase, parked.id);
    assert.match(outcome.text, new RegExp(`^postprocess: usecase ${parked.id} from toRemove to done`));
    const backend = readHost(host, `l4/${MODULE}/pool/l2/web/backend.json`);
    const effort = readHost(host, `l4/${MODULE}/pool/l2/web/effort.json`);
    const record = JSON.parse(readHost(host, `l4/${MODULE}/pool/l1/web/postprocess.json`)) as { corrections: Array<{ usecase: string }> };
    assert.equal(JSON.parse(backend).usecases.some((row: { usecaseId: string }) => row.usecaseId === parked.id), true);
    assert.equal(JSON.parse(effort).removed.some((row: { id?: string }) => row.id === parked.id), false);
    assert.equal(record.corrections[0].usecase, parked.id);
  } finally {
    restoreMls(previous);
  }
});

test('no correction still writes postprocess.json with an empty list', async () => {
  const previous = saveMls();
  try {
    const host = installStudio(PROJECT);
    seedD1Fixture(host, FIXTURE, PROJECT);
    const outcome = await postprocessPlan(MODULE);
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.deepEqual(outcome.corrections, []);
    assert.equal(outcome.text, 'postprocess: no correction');
    const record = JSON.parse(readHost(host, `l4/${MODULE}/pool/l1/web/postprocess.json`)) as { corrections: unknown[] };
    assert.deepEqual(record.corrections, []);
    assert.equal(host.writes.some(key => key.endsWith('/backend.json')), false);
    assert.equal(host.writes.some(key => key.endsWith('/effort.json')), false);
  } finally {
    restoreMls(previous);
  }
});

test('an unreadable plan writes nothing', async () => {
  const previous = saveMls();
  try {
    const host = installStudio(PROJECT);
    const backend = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/pool/l2/web/backend.json`);
    const effort = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/pool/l2/web/effort.json`);
    assert.ok(backend && effort);
    seed(host, backend, '{', 'bad');
    seed(host, effort, '{}', 'bad');
    const outcome = await postprocessPlan(MODULE);
    assert.deepEqual(outcome.ok, false);
    if (outcome.ok) return;
    assert.match(outcome.reason, /plan unreadable/);
    assert.equal(host.writes.length, 0);
  } finally {
    restoreMls(previous);
  }
});

test('the oracle reports a removed usecase a contract route still calls', () => {
  const parked = parkOne(loadD1Artifacts(FIXTURE, MODULE));
  const used = usedRemovedUsecases({ project: PROJECT, moduleName: MODULE }, parked.artifacts);
  assert.deepEqual(used.map(item => item.id), [parked.id]);
  assert.ok(used[0].routes.length > 0);
  assert.equal(typeof used[0].entity, 'string');
  assert.ok(used[0].entity);
  assert.equal(typeof used[0].operation, 'string');
  assert.ok(used[0].operation);
});

function parkOne(source: D1InputArtifacts): { artifacts: D1InputArtifacts; id: string } {
  const backend = clone(source.backend);
  const effort = clone(source.effort);
  for (const row of rows(backend.usecases)) {
    const id = String(row.usecaseId || '');
    if (!id) continue;
    const artifacts = withRemoved(source, backend, effort, id);
    const used = usedRemovedUsecases({ project: PROJECT, moduleName: MODULE }, artifacts);
    if (used.some(item => item.id === id)) return { artifacts, id };
  }
  throw new Error('fixture has no usecase a contract route calls');
}

function withRemoved(
  source: D1InputArtifacts,
  backend: Record<string, unknown>,
  effort: Record<string, unknown>,
  id: string,
): D1InputArtifacts {
  const nextBackend = clone(backend);
  const nextEffort = clone(effort);
  nextBackend.usecases = rows(nextBackend.usecases).filter(row => row.usecaseId !== id);
  nextEffort.usecases = rows(nextEffort.usecases).filter(row => row.usecaseId !== id);
  nextBackend.removed = [...rows(nextBackend.removed), { kind: 'usecase', id, status: 'toRemove' }];
  nextEffort.removed = [...rows(nextEffort.removed), { kind: 'usecase', id, status: 'toRemove' }];
  return { ...source, backend: nextBackend, effort: nextEffort };
}

function writePlan(host: TestHost, artifacts: D1InputArtifacts): void {
  const backend = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/pool/l2/web/backend.json`);
  const effort = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/pool/l2/web/effort.json`);
  if (!backend || !effort) throw new Error('plan path is not a Studio file');
  seed(host, backend, `${JSON.stringify(artifacts.backend, null, 2)}\n`);
  seed(host, effort, `${JSON.stringify(artifacts.effort, null, 2)}\n`);
}

function readHost(host: TestHost, display: string): string {
  const info = fileInfoFromDisplay(PROJECT, display);
  if (!info) throw new Error(`bad path ${display}`);
  const key = `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
  const file = host.files[key];
  if (!file) throw new Error(`missing ${display}`);
  return file.content;
}

function saveMls(): unknown {
  return (globalThis as { mls?: unknown }).mls;
}

function restoreMls(previous: unknown): void {
  if (previous === undefined) delete (globalThis as { mls?: unknown }).mls;
  else (globalThis as { mls?: unknown }).mls = previous;
}

function clone(doc: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row)) : [];
}
