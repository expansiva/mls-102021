/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-http/agentCbHttpController.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCbHttpController declares the deterministic http controller step contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbHttpController.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbHttpController/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.doesNotMatch(src, /createPromptReadyIntent/);
  assert.match(flow, /"agentName": "agentCbHttpController"/);
  assert.match(src, /bffCallsWithMaterializedUsecase/);
  assert.match(src, /if \(!fns\.length\) continue/);
});

// 2026-08-28 (102047/todo): this step ran while the usecase fan-out was still writing, saw 4 of 9 defs,
// and dropped 5 bffCalls + the whole taskHub controller WITHOUT SAYING SO. The visibility barrier and
// the named drop are both part of the fix; validate-all re-checks the result against the l4 contract.
void test('agentCbHttpController refreshes the file index and names every dropped contract route', () => {
  const src = readFileSync(path.join(HERE, 'agentCbHttpController.ts'), 'utf8');
  assert.match(src, /await refreshProjectIndex\(\);/);
  assert.match(src, /loadProjectInfoIfNeeded\(mls\.actualProject \|\| 0, true\)/);
  assert.match(src, /droppedRoutes\.push\(/);
  assert.match(src, /contract route\(s\) with NO controller/);
});
