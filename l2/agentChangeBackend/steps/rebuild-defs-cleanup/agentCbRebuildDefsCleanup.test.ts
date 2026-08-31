/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/rebuild-defs-cleanup/agentCbRebuildDefsCleanup.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

import { isGeneratedBackendFolder, listBackendL1ArchiveKeys } from '/_102021_/l2/agentChangeBackend/helpers/cbArchive.js';

void test('rebuild-all archive lists leftover l1 of the target module only', () => {
  const files = {
    'home': { project: 1, level: 1, status: 'active', folder: 'petShop/layer_1_external/adapters/persistence', shortName: 'institutionalHome' },
    'pending': { project: 1, level: 1, status: 'active', folder: 'petShop/layer_2_application/ports', shortName: 'pendingItemRepository' },
    'other': { project: 1, level: 1, status: 'active', folder: 'cafeFlow/layer_1_external/adapters/persistence', shortName: 'order' },
    'l2': { project: 1, level: 2, status: 'active', folder: 'petShop', shortName: 'page' },
    'gone': { project: 1, level: 1, status: 'deleted', folder: 'petShop/layer_3_domain/entities', shortName: 'pet' },
  };
  assert.deepEqual(listBackendL1ArchiveKeys(files, 1, 'petShop').sort(), ['home', 'pending']);
  assert.equal(isGeneratedBackendFolder('petShop/layer_1_external/adapters/persistence', ['petShop']), true);
  assert.equal(isGeneratedBackendFolder('cafeFlow/layer_1_external/adapters/persistence', ['petShop']), false);
});

void test('/rebuild all archives l1 before regenerating', () => {
  const root = readFileSync(path.join(HERE, '..', '..', 'agentChangeBackend.ts'), 'utf8');
  assert.match(root, /cmd === 'rebuild-all' && targetModule/);
  assert.match(root, /archiveGeneratedBackendModule/);
  assert.match(root, /clearCbLayerTrace/);
});

void test('agentCbRebuildDefsCleanup declares the rebuild cleanup step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbRebuildDefsCleanup.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbRebuildDefsCleanup/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCbRebuildDefsCleanup"/);
});
