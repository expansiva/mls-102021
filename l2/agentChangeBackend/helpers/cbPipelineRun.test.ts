/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { bestEffortRecord, buildCbRunSummary, describeCbCommand, formatDegradationReason, nextPipelineRunNn } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';

void test('nextPipelineRunNn is deterministic', () => {
  assert.equal(nextPipelineRunNn(['run01_changebackend', 'cb-cost'], 'changebackend'), '02');
});

void test('describeCbCommand records /fast /nochain from longMemory', () => {
  assert.equal(describeCbCommand({ fastMode: 'true', cliCommand: 'rebuild-all' }), '/fast /rebuild all');
  assert.equal(describeCbCommand({ fastMode: 'true', nochainMode: 'true', cliCommand: 'rebuild-all' }), '/fast /nochain /rebuild all');
  assert.equal(describeCbCommand({ nochainMode: 'true', cliCommand: 'run' }), '/nochain run');
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
  const seeds = summary.degradations.find(item => item.kind === 'seeds-degraded');
  assert.equal(seeds?.reason, 'skipped tables [X] MDM [none]');
  assert.notEqual(seeds?.reason, '[object Object]');
  assert.equal(summary.counts.ownersDone, 8);
  assert.deepEqual(summary.scanWarnings, []);
  assert.equal(summary.todoReadBack, null);
});

void test('CB run summary carries rebuild-all wiped N in counts', () => {
  const summary = buildCbRunSummary({
    moduleName: 'petShop',
    command: '/rebuild all',
    noWork: false,
    ownersDone: 8,
    ownersFlipped: 0,
    compilerLeft: false,
    health: {
      findings: [],
      degraded: [],
      rebuildWiped: 12,
      rebuildWipedMessage: 'rebuild-all wiped 12 file(s) of l1/petShop',
    },
    summary: 'run complete',
  });
  assert.equal(summary.counts.rebuildWiped, 12);
  assert.equal(summary.counts.rebuildWipedMessage, 'rebuild-all wiped 12 file(s) of l1/petShop');
});

void test('CB run summary copies scan warnings and todo read-back off the step-status path', () => {
  const summary = buildCbRunSummary({
    moduleName: 'listaAssinatura2',
    command: '/rebuild all',
    noWork: false,
    ownersDone: 3,
    ownersFlipped: 0,
    compilerLeft: false,
    health: {
      findings: [],
      degraded: [],
      scanWarnings: ['duplicate todoBackend owner useCase:createSignature; first entry kept'],
      todoReadBack: { retried: 7, lostUpdate: true, message: 'HIGH lost update: 7 owner(s) rewritten' },
    },
    summary: 'run complete',
  });
  assert.deepEqual(summary.scanWarnings, ['duplicate todoBackend owner useCase:createSignature; first entry kept']);
  assert.equal((summary.todoReadBack as { retried: number }).retried, 7);
});

void test('tscGate unavailable is recorded on the summary and does not change the verdict', () => {
  const summary = buildCbRunSummary({
    moduleName: 'controleChamados',
    command: '/rebuild all',
    noWork: false,
    ownersDone: 13,
    ownersFlipped: 0,
    compilerLeft: false,
    health: { findings: [], degraded: [], tscGate: 'unavailable', compileTrace: { path: 'unavailable', reason: 'spawn-null', rawDiagnostics: 0, afterFilter: 0, files: 13 } },
    summary: 'run complete',
  });
  assert.equal(summary.verdict, 'completed');
  assert.equal(summary.tscGate, 'unavailable');
  assert.equal(summary.counts.tscGate, 'unavailable');
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

void test('formatDegradationReason never stringifies an object as [object Object]', () => {
  assert.equal(formatDegradationReason({
    tables: ['ServiceExecutionImage'],
    mdmEntities: [],
    reason: 'seed wave 6 did not converge',
  }), 'skipped tables [ServiceExecutionImage] MDM [none]');
  assert.equal(formatDegradationReason('already a string'), 'already a string');
  assert.equal(formatDegradationReason({ reason: 'wave skipped' }), 'wave skipped');
});

void test('a throwing saveCbRunSummary does not change the failed outcome', async () => {
  const outcome: { status: 'failed' | 'completed' } = { status: 'failed' };
  await bestEffortRecord(async () => {
    throw new Error('saveCbRunSummary disk');
  });
  assert.equal(outcome.status, 'failed');
});
