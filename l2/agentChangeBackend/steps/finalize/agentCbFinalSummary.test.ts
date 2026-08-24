/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/finalize/agentCbFinalSummary.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCbFinalSummary declares the final-summary step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbFinalSummary.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbFinalSummary/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCbFinalSummary"/);
});

void test('the run dossier records per-step traces and the provenance stamp', () => {
  const src = readFileSync(path.join(HERE, 'agentCbFinalSummary.ts'), 'utf8');
  assert.match(src, /collectRunStepRecords\(context\.task\?\.iaCompressed\?\.nextSteps\)/);
  assert.match(src, /agentBuild/);
  assert.match(src, /saveRunReport/);
  assert.match(src, /degraded: Array\.isArray\(health\.degraded\)/);
  assert.match(src, /seeds: health\.seeds/);
  assert.match(src, /health passed-degraded/);
  assert.match(src, /\/rebuild seeds/);
});
