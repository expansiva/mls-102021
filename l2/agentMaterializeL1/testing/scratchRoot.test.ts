/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/scratchRoot.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

void test('materialize tests leave no .m1-* directory at the repo root', () => {
  const left = readdirSync(ROOT).filter(name => name.startsWith('.m1-'));
  assert.deepEqual(left, []);
});
