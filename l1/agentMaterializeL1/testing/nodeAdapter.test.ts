/// <mls fileReference="_102021_/l1/agentMaterializeL1/testing/nodeAdapter.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { parseCatalog } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { nodeReadIo, verifyCatalogFile } from '/_102021_/l1/agentMaterializeL1/testing/nodeAdapter.js';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '../../../l2/agentMaterializeL1/testing/catalogFixture.json');

void test('node adapter reads the fixture and refuses a database url', async () => {
  const io = nodeReadIo();
  assert.equal('write' in io, false);
  const text = await io.read(FIXTURE);
  assert.ok(text);
  assert.equal(text.includes('node:test'), false);
  const parsed = parseCatalog(text);
  assert.deepEqual(parsed.issues, []);
  assert.equal(await io.read('postgres://localhost/app'), null);
  assert.equal(await io.read('postgresql://localhost/app'), null);
  assert.equal(await io.read('../catalogFixture.json'), null);
  assert.equal(await nodeReadIo().read(join(FIXTURE, 'missing-dir')), null);

  const handler = handlerFor('usecase', 'structure');
  assert.ok(handler);
  const report = await verifyCatalogFile({
    handler,
    catalogPath: FIXTURE,
    observations: [],
    runId: 'm1-04-node',
    commit: '69adf1f',
    startedAt: '2026-09-25T12:00:00.000Z',
    finishedAt: '2026-09-25T12:00:01.000Z',
    monitorError: null,
  });
  assert.equal(report.counts.inconclusive, 11);
  assert.equal(report.counts.expectedRed, 0);
  assert.equal(report.accepted, false);
  assert.equal(report.ready, false);
});
