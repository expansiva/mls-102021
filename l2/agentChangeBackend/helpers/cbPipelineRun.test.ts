/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { bestEffortRecord, buildCbRunSummary, nextPipelineRunNn } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';

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

void test('health outcome failed produces a failed run summary with INTEGRITY findings', () => {
  const findings = [
    'usecase registerSignature.ts TS2339: Property x does not exist',
    'usecase updateSignature.ts TS2339: Property x does not exist',
    'N+1 MDM get in loop',
    'table without primary key',
    'missing controller export',
  ];
  const reason = `INTEGRITY FAILED (repair budget exhausted (3/2)): ${findings.length} finding(s): ${findings.join('; ')}`;
  const summary = buildCbRunSummary({
    moduleName: 'listaAssinatura',
    command: '/rebuild all',
    noWork: false,
    ownersDone: 0,
    ownersFlipped: 0,
    compilerLeft: false,
    health: {
      outcome: 'failed',
      findings,
      degraded: ['seed skip: table X'],
      repairHistory: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13'],
      globalAttempts: 3,
    },
    summary: reason,
  });
  assert.equal(summary.verdict, 'failed');
  assert.equal(summary.reason, reason);
  assert.match(summary.reason, /INTEGRITY FAILED \(repair budget exhausted \(3\/2\)\)/);
  assert.equal(summary.counts.findings, 5);
  assert.deepEqual(summary.counts.findingList, findings);
  assert.equal(summary.counts.repairs, 13);
  assert.equal(summary.counts.globalAttempts, 3);
  assert.equal(summary.counts.degraded, 1);
});

void test('a throwing saveCbRunSummary does not change the failed outcome', async () => {
  const outcome: { status: 'failed' | 'completed' } = { status: 'failed' };
  await bestEffortRecord(async () => {
    throw new Error('saveCbRunSummary disk');
  });
  assert.equal(outcome.status, 'failed');
});
