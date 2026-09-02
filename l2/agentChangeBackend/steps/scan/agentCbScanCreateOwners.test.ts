/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/scan/agentCbScanCreateOwners.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCbScanCreateOwners declares the scan step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbScanCreateOwners.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbScanCreateOwners/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCbScanCreateOwners"/);
});

void test('the provenance stamp is not printed to the console (dossiê/summary already carry it)', () => {
  const src = readFileSync(path.join(HERE, 'agentCbScanCreateOwners.ts'), 'utf8');
  assert.match(src, /describeProvenance\(provenance\)/);
  assert.doesNotMatch(src, /console\.info\(`\$\{logPrefix\(agent\)\}\$\{described\}`\)/);
  assert.doesNotMatch(src, /console\.info\(/);
});

void test('scan warnings are persisted on the health report, not only the truncated step status', () => {
  const src = readFileSync(path.join(HERE, 'agentCbScanCreateOwners.ts'), 'utf8');
  assert.match(src, /saveHealthReport\(\{/);
  assert.match(src, /scanWarnings: scan\.warnings/);
});

void test('rebuild-all archive count lands on the scan step status, not the console', () => {
  const src = readFileSync(path.join(HERE, 'agentCbScanCreateOwners.ts'), 'utf8');
  const root = readFileSync(path.join(HERE, '..', '..', 'agentChangeBackend.ts'), 'utf8');
  assert.match(root, /rebuildArchived/);
  assert.match(root, /rebuildWipeMsg/);
  assert.match(root, /describeRebuildWipe/);
  assert.doesNotMatch(root, /console\.info/);
  assert.match(src, /readRebuildWipeMsg/);
  assert.match(src, /rebuildWipedMessage/);
});

void test('rebuild-all wipe that left live files fails the scan with the finding, no next generation step', () => {
  const src = readFileSync(path.join(HERE, 'agentCbScanCreateOwners.ts'), 'utf8');
  const abortBlock = src.slice(src.indexOf('readRebuildWipeAbort'), src.indexOf("readCliCommand(context) === 'rebuild-seeds'"));
  assert.match(abortBlock, /createUpdateStatusIntent\([\s\S]*'failed', reason\)/);
  assert.match(abortBlock, /recordFailedCbRun/);
  assert.doesNotMatch(abortBlock, /enqueueNext/);
});
