/// <mls fileReference="_102021_/l2/agentDefsL1/steps/entry10/dispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { deleteTraced, dispatchConsumption, listDispatchMessages } from '/_102021_/l2/agentDefsL1/steps/entry10/dispatch.js';

/** Renamed fixture: no id of a bench module. */
const MODULE = 'salaEnsaio';
const PROJECT = 102047;
const THREAD = `${MODULE}-20260928100000`;

function message(host: TestHost, shortName: string, body: Record<string, unknown> | string) {
  return seed(host, { project: PROJECT, level: 4, folder: `${MODULE}/pool/l1`, shortName, extension: '.json' },
    typeof body === 'string' ? body : `${JSON.stringify(body)}\n`);
}

function implement(round = 1) {
  return { from: 'l4', to: 'l1', thread: THREAD, round, mode: 'implement', subject: 'run', artifacts: [], body: '' };
}

void test('only an implement to l1 is a dispatch; estimate, malformed and other projects are not', async () => {
  const host = installStudio(PROJECT);
  message(host, `20260928100001_${THREAD}_1`, implement());
  message(host, `20260928100002_${THREAD}_1`, { ...implement(), mode: 'estimate' });
  message(host, `20260928100003_${THREAD}_1`, '{not json');
  message(host, 'pipeline', { planner: true });
  seed(host, { project: 102046, level: 4, folder: `${MODULE}/pool/l1`, shortName: `20260928100004_${THREAD}_1`, extension: '.json' }, `${JSON.stringify(implement())}\n`);
  assert.deepEqual(await listDispatchMessages(PROJECT, MODULE), [`l4/${MODULE}/pool/l1/20260928100001_${THREAD}_1.json`]);
  assert.equal(host.writes.length, 0);
});

void test('consumption covers only the listed dispatches still present, and deletes only after the trace', async () => {
  const host = installStudio(PROJECT);
  const listed = message(host, `20260928100001_${THREAD}_1`, implement());
  const later = message(host, `20260928100009_${THREAD}_2`, implement(2));
  const estimate = message(host, `20260928100002_${THREAD}_1`, { ...implement(), mode: 'estimate' });
  const listedPath = `l4/${MODULE}/pool/l1/${listed.shortName}.json`;

  const now = new Date('2026-09-28T12:00:00.000Z');
  const consumption = await dispatchConsumption(PROJECT, MODULE, [listedPath, `l4/${MODULE}/pool/l1/${estimate.shortName}.json`], [], now);
  assert.deepEqual(consumption.lines, [{
    at: now.toISOString(), file: listedPath, from: 'l4', to: 'l1', thread: THREAD, round: 1, mode: 'implement', outcome: 'processed',
  }]);
  assert.deepEqual(consumption.files.map(fileKey), [fileKey(listed)]);

  await assert.rejects(deleteTraced(consumption.files, []), /no processed trace/);
  assert.notEqual(listed.status, 'deleted');
  await deleteTraced(consumption.files, consumption.lines);
  assert.equal(listed.status, 'deleted');
  assert.notEqual(later.status, 'deleted');
  assert.notEqual(estimate.status, 'deleted');

  // A second pass after a crash between trace and delete does not repeat the line.
  listed.status = 'changed';
  const again = await dispatchConsumption(PROJECT, MODULE, [listedPath], consumption.lines, now);
  assert.deepEqual(again.lines, []);
  assert.deepEqual(again.files.map(fileKey), [fileKey(listed)]);
});

void test('no listed dispatch consumes nothing and fabricates no line', async () => {
  const host = installStudio(PROJECT);
  const present = message(host, `20260928100001_${THREAD}_1`, implement());
  const consumption = await dispatchConsumption(PROJECT, MODULE, [], [], new Date());
  assert.deepEqual(consumption, { lines: [], files: [] });
  assert.notEqual(present.status, 'deleted');
});
