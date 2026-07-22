/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/rebuild-defs-cleanup/agentCbRebuildDefsCleanup.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCbRebuildDefsCleanup declares the rebuild cleanup step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbRebuildDefsCleanup.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbRebuildDefsCleanup/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCbRebuildDefsCleanup"/);
});
