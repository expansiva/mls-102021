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

void test('rebuild-all archive count lands on the scan step status, not the console', () => {
  const src = readFileSync(path.join(HERE, 'agentCbScanCreateOwners.ts'), 'utf8');
  const root = readFileSync(path.join(HERE, '..', '..', 'agentChangeBackend.ts'), 'utf8');
  assert.match(root, /rebuildArchived/);
  assert.doesNotMatch(root, /console\.info/);
  assert.match(src, /readRebuildArchived/);
  assert.match(src, /rebuild-all archived/);
});
