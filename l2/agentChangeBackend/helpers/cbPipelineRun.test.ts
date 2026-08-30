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

void test('a failed changeFrontend handoff degrades without failing the run', () => {
  const summary = buildCbRunSummary({
    moduleName: 'listaAssinatura',
    command: '/fast /rebuild all',
    noWork: false,
    ownersDone: 3,
    ownersFlipped: 0,
    compilerLeft: false,
    health: { findings: [], degraded: [] },
    summary: 'run complete',
    extraDegradations: [{
      at: '2026-08-29T01:00:01.000Z',
      kind: 'fast-handoff-dispatch',
      reason: 'Parent step cannot be modified — re-send manually: @@agentChangeFrontend /fast /rebuild all listaAssinatura',
    }],
  });
  assert.equal(summary.verdict, 'degraded');
  assert.equal(summary.degradations.some(item => item.kind === 'fast-handoff-dispatch'), true);
});
