/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/register/agentCbRegister.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCbRegister declares the register step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbRegister.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbRegister/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCbRegister"/);
});
