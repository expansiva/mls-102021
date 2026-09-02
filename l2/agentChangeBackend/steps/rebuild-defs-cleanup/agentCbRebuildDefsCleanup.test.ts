/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/rebuild-defs-cleanup/agentCbRebuildDefsCleanup.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

import { isGeneratedBackendFolder, listBackendL1ArchiveKeys, countBackendL1IndexedFiles, countBackendL1LiveFiles, describeRebuildWipe, rebuildAllWipedMessage, rebuildWipeShouldAbort } from '/_102021_/l2/agentChangeBackend/helpers/cbArchive.js';

void test('rebuild-all archive lists leftover l1 of the target module only', () => {
  const files = {
    'home': { project: 1, level: 1, status: 'active', folder: 'petShop/layer_1_external/adapters/persistence', shortName: 'institutionalHome', extension: '.ts' },
    'pending': { project: 1, level: 1, status: 'active', folder: 'petShop/layer_2_application/ports', shortName: 'pendingItemRepository', extension: '.defs.ts' },
    'entity': { project: 1, level: 1, status: 'changed', folder: 'petShop/layer_3_domain/entities', shortName: 'pet', extension: '.ts' },
    'seeds': { project: 1, level: 1, status: 'active', folder: 'petShop/layer_1_external/adapters/persistence', shortName: 'seeds', extension: '.ts' },
    'register': { project: 1, level: 1, status: 'active', folder: 'petShop', shortName: 'registerRepositories', extension: '.ts' },
    'other': { project: 1, level: 1, status: 'active', folder: 'cafeFlow/layer_1_external/adapters/persistence', shortName: 'order' },
    'l2': { project: 1, level: 2, status: 'active', folder: 'petShop', shortName: 'page' },
    'gone': { project: 1, level: 1, status: 'deleted', folder: 'petShop/layer_3_domain/entities', shortName: 'pet' },
  };
  assert.deepEqual(listBackendL1ArchiveKeys(files, 1, 'petShop').sort(), ['entity', 'gone', 'home', 'pending', 'register', 'seeds']);
  assert.equal(countBackendL1IndexedFiles(files, 1, 'petShop'), 6);
  assert.equal(countBackendL1LiveFiles(files, 1, 'petShop'), 5);
  assert.equal(isGeneratedBackendFolder('petShop/layer_1_external/adapters/persistence', ['petShop']), true);
  assert.equal(isGeneratedBackendFolder('cafeFlow/layer_1_external/adapters/persistence', ['petShop']), false);
});

void test('rebuild-all wipe of 0 on a populated module is a finding; empty module is silent', () => {
  assert.equal(rebuildAllWipedMessage('petShop', 12), 'rebuild-all wiped 12 file(s) of l1/petShop');
  const populated = describeRebuildWipe('petShop', 0, 7, 0);
  assert.equal(populated.message, 'rebuild-all wiped 0 file(s) of l1/petShop');
  assert.equal(populated.finding, 'rebuild-all wiped 0 file(s) of l1/petShop but the index still has 7 file(s)');
  const empty = describeRebuildWipe('petShop', 0, 0, 0);
  assert.equal(empty.finding, null);
  const leftover = describeRebuildWipe('petShop', 4, 4, 1);
  assert.match(leftover.finding ?? '', /1 live file\(s\) remain/);
  assert.equal(leftover.abort, true);
});

void test('wipe that archived files and left live ones aborts with the finding', () => {
  assert.equal(rebuildWipeShouldAbort(53, 53), true);
  assert.equal(rebuildWipeShouldAbort(53, 0), false);
  assert.equal(rebuildWipeShouldAbort(0, 7), false);
  const wipe = describeRebuildWipe('controleChamados', 53, 53, 53);
  assert.equal(wipe.abort, true);
  assert.equal(wipe.finding, 'rebuild-all wiped 53 file(s) of l1/controleChamados; 53 live file(s) remain');
  const clean = describeRebuildWipe('petShop', 12, 12, 0);
  assert.equal(clean.abort, false);
  const zeroPopulated = describeRebuildWipe('petShop', 0, 7, 0);
  assert.equal(zeroPopulated.abort, false);
  const root = readFileSync(path.join(HERE, '..', '..', 'agentChangeBackend.ts'), 'utf8');
  assert.match(root, /wipe\.abort/);
  assert.match(root, /rebuildWipeAbort/);
  const scan = readFileSync(path.join(HERE, '..', 'scan', 'agentCbScanCreateOwners.ts'), 'utf8');
  assert.match(scan, /readRebuildWipeAbort/);
  assert.match(scan, /'failed', reason/);
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
