/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbArchive.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseWipedKeysJson,
  wipedKeysForRun,
  removeWipedKey,
  materializeNoneAfterWipeFinding,
} from '/_102021_/l2/agentChangeBackend/helpers/cbArchive.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('parseWipedKeysJson reads the archived-key list; junk becomes empty', () => {
  assert.deepEqual(parseWipedKeysJson(''), []);
  assert.deepEqual(parseWipedKeysJson('not-json'), []);
  assert.deepEqual(parseWipedKeysJson('{"a":1}'), []);
  assert.deepEqual(parseWipedKeysJson('["a","","b",1]'), ['a', 'b']);
});

void test('wipedKeysForRun ignores a previous run\'s set when runId does not match', () => {
  const prior = { wipeRunId: 'run-old', wipedKeys: ['k1', 'k2', 'k3'] };
  assert.deepEqual(wipedKeysForRun(prior, 'run-new'), []);
  assert.deepEqual(wipedKeysForRun(prior, ''), []);
  assert.deepEqual(wipedKeysForRun({ wipeRunId: '', wipedKeys: ['k1'] }, 'run-new'), []);
  assert.deepEqual(wipedKeysForRun({ wipeRunId: 'run-1', wipedKeys: ['k1', '', 'k2'] }, 'run-1'), ['k1', 'k2']);
});

void test('removeWipedKey drops a rematerialized key and leaves the others', () => {
  const keys = ['k1', 'k2', 'k3'];
  assert.deepEqual(removeWipedKey(keys, 'k2'), ['k1', 'k3']);
  assert.deepEqual(keys, ['k1', 'k2', 'k3'], 'input not mutated');
  assert.deepEqual(removeWipedKey(keys, ''), ['k1', 'k2', 'k3']);
  assert.deepEqual(removeWipedKey(keys, 'absent'), ['k1', 'k2', 'k3']);
});

void test('materializeNoneAfterWipeFinding fails only when a wipe generated none', () => {
  assert.equal(
    materializeNoneAfterWipeFinding(53, 0),
    'rebuild-all wiped 53 file(s) and materialize generated none',
  );
  assert.equal(materializeNoneAfterWipeFinding(0, 0), null);
  assert.equal(materializeNoneAfterWipeFinding(53, 25), null);
  assert.equal(materializeNoneAfterWipeFinding(0, 3), null);
});

void test('bootstrap persists wipe keys+runId; scan records them after clearing leftover repair state', () => {
  const root = readFileSync(path.join(HERE, '..', 'agentChangeBackend.ts'), 'utf8');
  assert.match(root, /rebuildWipedKeys = JSON\.stringify\(archived\)/);
  assert.match(root, /wipeRunId \? \{ wipeRunId \}/);
  assert.match(root, /rebuildWipedKeys \? \{ rebuildWipedKeys \}/);
  const scan = readFileSync(path.join(HERE, '..', 'steps', 'scan', 'agentCbScanCreateOwners.ts'), 'utf8');
  const clears = [...scan.matchAll(/await clearRepairState\(\);/g)].map(m => m.index ?? -1);
  const records = [...scan.matchAll(/await recordWipeMemory\(readWipeRunId\(context\), readRebuildWipedKeys\(context\)\);/g)].map(m => m.index ?? -1);
  assert.equal(clears.length, 2);
  assert.equal(records.length, 2);
  assert.ok(records[0] > clears[0] && records[0] < clears[1]);
  assert.ok(records[1] > clears[1]);
});
