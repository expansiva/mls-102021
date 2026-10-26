/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Io.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { reuseDecision } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

const tsFile: M12FileInfo = { project: 1, level: 1, folder: 'mod/layer', shortName: 'item', extension: '.ts' };
const defsFile: M12FileInfo = { ...tsFile, extension: '.defs.ts' };

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function install(present: Array<{ info: M12FileInfo; status?: string }>): void {
  const files: Record<string, { status: string }> = {};
  for (const item of present) files[keyOf(item.info)] = { status: item.status ?? 'changed' };
  (globalThis as { mls: unknown }).mls = { stor: { files, getKeyToFile: keyOf } };
}

void test('a .ts on disk is skipped with no receipt and with a receipt whose hash would not match', async () => {
  install([{ info: tsFile }]);
  assert.deepEqual(await reuseDecision([tsFile], false), { kind: 'reuse' });
});

void test('a missing .ts is generated even when a done receipt would have said to keep it', async () => {
  install([]);
  assert.deepEqual(await reuseDecision([tsFile], false), { kind: 'generate' });
});

void test('force generates even when the .ts exists', async () => {
  install([{ info: tsFile }]);
  assert.deepEqual(await reuseDecision([tsFile], true), { kind: 'generate' });
});

void test('a .defs.ts with the same name does not count as the .ts', async () => {
  install([{ info: defsFile }]);
  assert.deepEqual(await reuseDecision([tsFile], false), { kind: 'generate' });
});

void test('a deleted .ts counts as missing', async () => {
  install([{ info: tsFile, status: 'deleted' }]);
  assert.deepEqual(await reuseDecision([tsFile], false), { kind: 'generate' });
});
