/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCbRunSummary, nextPipelineRunNn } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';

void test('nextPipelineRunNn is deterministic', () => {
  assert.equal(nextPipelineRunNn(['run01_changebackend', 'cb-cost'], 'changebackend'), '02');
});

void test('CB run summary copies health degradations off the console path', () => {
  const summary = buildCbRunSummary({
    moduleName: 'petShop',
    command: '/fast /rebuild all',
    noWork: false,
    ownersDone: 8,
    ownersFlipped: 0,
    compilerLeft: false,
    health: { degraded: ['seed skip: table X'], findings: [], repairHistory: ['r1'], seeds: 'degraded', seedSkipped: { tables: ['X'] } },
    summary: 'run complete',
  });
  assert.equal(summary.verdict, 'degraded');
  assert.equal(summary.degradations.some(item => item.kind === 'health-degraded'), true);
  assert.equal(summary.degradations.some(item => item.kind === 'seeds-degraded'), true);
  assert.equal(summary.counts.ownersDone, 8);
});
