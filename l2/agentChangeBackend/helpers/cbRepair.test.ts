/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeRepairMutation } from './cbRepairLock.js';
import {
  buildHealthReportContent, foldRepairAudit, foldModelsPeak, foldSeedsDegraded, foldOperationsCoverage,
  compareOperationsCoverage, expectedRoutesByOperation, operationsCoverageLogLine, MAX_HEALTH_ROUNDS,
} from './cbHealthReport.js';
import { mergeComponentRepair, buildRepairPromptSection, type CbComponentRepair } from './cbRepairCore.js';

test('mergeComponentRepair (T3): a global round preserves priorFindings + lastCode and resets attempts to 0', () => {
  // g1 left the component with a resolved finding carried as priorFindings and its rejected code.
  const afterG1: CbComponentRepair = {
    target: '_102051_/l1/cafeFlow/.../createStockAdjustment.defs.ts',
    attempts: 2,
    findings: ['compiler: TS2322 updatedAt'],
    priorFindings: ['save() is not declared on IStockAdjustmentRepository'],
    lastCode: 'export function createStockAdjustment() { /* rejected */ }',
    source: 'validate-all',
    updatedAt: '2026-07-24T23:41:00.000Z',
  };
  // g2 finds a (possibly new) finding. The MERGE must keep the g1 save()-misuse in priorFindings so the
  // worker does not reintroduce it, keep the code to fix, and reset attempts to 0 (fresh round budget).
  const g2 = mergeComponentRepair(afterG1, afterG1.target, ['compiler: TS2322 updatedAt'], { attempts: 0, source: 'validate-all' });
  assert.equal(g2.attempts, 0);
  assert.ok(g2.priorFindings?.includes('save() is not declared on IStockAdjustmentRepository'), 'earlier-fixed finding must be carried');
  assert.equal(g2.lastCode, afterG1.lastCode, 'last code preserved when no new code supplied');
  // A current finding is never duplicated into priorFindings.
  assert.ok(!g2.priorFindings?.includes('compiler: TS2322 updatedAt'));
});

test('mergeComponentRepair (T3): supplied lastCode (current .ts) seeds the entry when the state had none', () => {
  const fresh = mergeComponentRepair(undefined, 'x.defs.ts', ['compiler: TS2367'], { attempts: 0, source: 'validate-all', lastCode: 'const a: 1 = 2;' });
  assert.equal(fresh.attempts, 0);
  assert.equal(fresh.lastCode, 'const a: 1 = 2;');
  assert.equal(fresh.priorFindings, undefined);
});

test('buildRepairPromptSection (T3): shows the MUST-STAY-fixed section and the code to fix', () => {
  const entry: CbComponentRepair = {
    target: 't.defs.ts', attempts: 0, findings: ['compiler: TS2322 updatedAt'],
    priorFindings: ['save() is not declared on IStockAdjustmentRepository'],
    lastCode: 'export const x = 1;', source: 'validate-all', updatedAt: 'now',
  };
  const section = buildRepairPromptSection(entry);
  assert.match(section, /MUST STAY fixed/);
  assert.match(section, /save\(\) is not declared/);
  assert.match(section, /Previous rejected output/);
  assert.match(section, /export const x = 1;/);
});

test('buildHealthReportContent: a repair-round snapshot does NOT lose the previous round (T1 audit)', () => {
  const t1 = '2026-07-24T23:35:00.000Z';
  const t2 = '2026-07-24T23:41:00.000Z';
  const c1 = buildHealthReportContent(null, { outcome: 'repair-round', round: 1, targetCount: 43 }, t1);
  const p1 = JSON.parse(c1);
  assert.equal(p1.outcome, 'repair-round');        // top level = last state
  assert.equal(p1.round, 1);
  assert.equal(p1.rounds.length, 1);
  assert.equal(p1.savedAt, t1);

  // Second round: feeding c1 back as the existing content must PRESERVE round 1 in `rounds`.
  const c2 = buildHealthReportContent(c1, { outcome: 'repair-round', round: 2, targetCount: 5 }, t2);
  const p2 = JSON.parse(c2);
  assert.equal(p2.round, 2);                        // last state = round 2
  assert.equal(p2.rounds.length, 2, 'both rounds kept');
  assert.equal(p2.rounds[0].round, 1);
  assert.equal(p2.rounds[1].round, 2);
  assert.ok(!('rounds' in p2.rounds[0]), 'snapshots must not nest their own rounds array');
});

test('buildHealthReportContent: rounds array is bounded and tolerates corrupt existing content', () => {
  let content = buildHealthReportContent('not json at all', { outcome: 'materialize-dispatch', n: 0 }, '2026-07-24T00:00:00.000Z');
  assert.equal(JSON.parse(content).rounds.length, 1); // corrupt prior content -> start fresh, no throw
  for (let i = 1; i <= MAX_HEALTH_ROUNDS + 5; i++) {
    content = buildHealthReportContent(content, { outcome: 'materialize-dispatch', n: i }, '2026-07-24T00:00:00.000Z');
  }
  const parsed = JSON.parse(content);
  assert.equal(parsed.rounds.length, MAX_HEALTH_ROUNDS, 'rounds capped');
  assert.equal(parsed.rounds[parsed.rounds.length - 1].n, MAX_HEALTH_ROUNDS + 5, 'newest kept');
});

test('foldRepairAudit keeps the repair rounds when the last snapshot is a clean pass', () => {
  const t1 = '2026-08-22T21:40:00.000Z';
  const t2 = '2026-08-22T21:50:00.000Z';
  const history = ['2026-08-22T21:40:00.000Z :: usecase.defs.ts :: validate-all g1 :: TS2339'];
  const afterRound = buildHealthReportContent(null, {
    outcome: 'repair-round', round: 1, globalAttempts: 1, repairHistory: history,
  }, t1);
  const afterPass = buildHealthReportContent(afterRound, {
    outcome: 'passed', findings: [], globalAttempts: 0, repairHistory: [],
  }, t2);
  const folded = foldRepairAudit(afterRound, { repairHistory: [], globalAttempts: 0 });
  assert.deepEqual(folded.repairHistory, history);
  assert.equal(folded.globalAttempts, 1);
  const top = JSON.parse(buildHealthReportContent(afterRound, {
    outcome: 'passed', findings: [], ...folded,
  }, t2));
  assert.equal(top.globalAttempts, 1);
  assert.deepEqual(top.repairHistory, history);
  assert.equal(JSON.parse(afterPass).repairHistory.length, 0, 'without the fold the last pass wipes history — that is the be4 bug');
});

test('foldModelsPeak keeps the highest peak across rounds (be5 closed at 104, leak was the peak)', () => {
  const first = JSON.stringify({ models: { registry: 200, pendingRelease: 12, peak: 298 } });
  const folded = foldModelsPeak(first, { models: { registry: 104, pendingRelease: 0, peak: 104 } });
  assert.equal(folded?.peak, 298);
  assert.equal(folded?.registry, 104);
});

test('foldSeedsDegraded keeps seeds: degraded when a later snapshot omits it', () => {
  const first = JSON.stringify({ seeds: 'degraded', seedError: 'SEED WAVE 6 SKIPPED', seedSkipped: { tables: ['Pet'], mdmEntities: [], reason: 'wave 3' }, outcome: 'pre-seeds-warning' });
  const folded = foldSeedsDegraded(first, { outcome: 'passed-degraded' } as { seeds?: unknown; seedError?: unknown });
  assert.equal(folded.seeds, 'degraded');
  assert.equal(folded.seedError, 'SEED WAVE 6 SKIPPED');
  assert.deepEqual(folded.seedSkipped, { tables: ['Pet'], mdmEntities: [], reason: 'wave 3' });
  const currentWins = foldSeedsDegraded(first, { seeds: 'degraded', seedError: 'new reason' });
  assert.equal(currentWins.seedError, 'new reason');
});

test('foldSeedsDegraded: current seeds: ok beats an older degraded in rounds', () => {
  const existing = JSON.stringify({
    seeds: 'degraded',
    seedError: 'seed wave 2 did not converge',
    seedSkipped: { tables: ['Appointment'], mdmEntities: ['X'] },
    rounds: [
      { seeds: 'degraded', seedError: 'seed wave 2 did not converge', seedSkipped: { tables: ['Appointment'], mdmEntities: ['X'] } },
    ],
  });
  const folded = foldSeedsDegraded(existing, { seeds: 'ok' });
  assert.equal(folded.seeds, undefined);
  assert.equal(folded.seedError, undefined);
  assert.equal(folded.seedSkipped, undefined);
});

test('foldSeedsDegraded: later ok then a mute snapshot stays clear of seeds', () => {
  const afterOk = JSON.stringify({
    seeds: 'ok',
    rounds: [
      { seeds: 'degraded', seedError: 'old', seedSkipped: { tables: ['Pet'], mdmEntities: [] } },
      { seeds: 'ok' },
    ],
  });
  const folded = foldSeedsDegraded(afterOk, { outcome: 'passed' } as { seeds?: unknown });
  assert.equal(folded.seeds, undefined);
  assert.equal(folded.seedError, undefined);
  assert.equal(folded.seedSkipped, undefined);
});

test('compareOperationsCoverage: 102047-shaped gap is noUsecase only, extra usecase is ignored', () => {
  const missingOps = ['createServiceExecution', 'startServiceExecution', 'updateServiceExecution'];
  const coveredOps = Array.from({ length: 44 }, (_, i) => `coveredOp${i}`);
  const declared = [...coveredOps, ...missingOps];
  const usecases = [...coveredOps, 'researchByIdTableX'];
  const routes = coveredOps.map(op => `petShop.ws.cmd${op}`);
  const expected = Object.fromEntries([
    ...coveredOps.map(op => [op, [`petShop.ws.cmd${op}`]]),
    ...missingOps.map(op => [op, [`petShop.ws.cmd${op}`]]),
  ]);
  const verdict = compareOperationsCoverage({
    declared, usecaseNames: usecases, routeKeys: routes, expectedRoutesByOperation: expected,
  });
  assert.equal(verdict.operations, 'degraded');
  if (verdict.operations !== 'degraded') return;
  assert.deepEqual(verdict.operationsMissing.noUsecase, missingOps);
  assert.deepEqual(verdict.operationsMissing.noEndpoint, []);
  assert.equal(verdict.operationsMissing.declared, 47);
  assert.equal(verdict.operationsMissing.covered, 44);
  assert.ok(!JSON.stringify(verdict).includes('researchByIdTableX'));
  assert.match(operationsCoverageLogLine(verdict), /47 declared, 44 covered, 3 without usecase/);
});

test('compareOperationsCoverage: usecase without its command route is noEndpoint, not a finding of extra usecases', () => {
  const expected = expectedRoutesByOperation([
    {
      bffCalls: [
        { route: 'petShop.startServiceExecution.cmdStartServiceExecution', uses: [{ operationId: 'startServiceExecution' }] },
        { route: 'petShop.startServiceExecution.qryLocateAppointment', uses: [{ operationId: 'locateAppointment' }] },
        { route: 'petShop.startServiceExecution.qryCustomerPicker', uses: [{ operationId: 'listCustomer' }] },
      ],
    },
  ]);
  const verdict = compareOperationsCoverage({
    declared: ['startServiceExecution', 'listCustomer'],
    usecaseNames: ['startServiceExecution', 'listCustomer', 'orphanResearch'],
    routeKeys: [
      'petShop.startServiceExecution.qryLocateAppointment',
      'petShop.startServiceExecution.qryCustomerPicker',
    ],
    expectedRoutesByOperation: expected,
  });
  assert.equal(verdict.operations, 'degraded');
  if (verdict.operations !== 'degraded') return;
  assert.deepEqual(verdict.operationsMissing.noUsecase, []);
  assert.deepEqual(verdict.operationsMissing.noEndpoint, ['startServiceExecution']);
  assert.equal(verdict.operationsMissing.covered, 1);
  assert.ok(!JSON.stringify(verdict).includes('orphanResearch'));
});

test('compareOperationsCoverage: full coverage is operations: ok and does not list extras', () => {
  const verdict = compareOperationsCoverage({
    declared: ['listCustomer'],
    usecaseNames: ['listCustomer', 'researchByIdTableX'],
    routeKeys: ['petShop.startServiceExecution.qryCustomerPicker'],
    expectedRoutesByOperation: { listCustomer: ['petShop.startServiceExecution.qryCustomerPicker'] },
  });
  assert.deepEqual(verdict, { operations: 'ok' });
  assert.equal(operationsCoverageLogLine(verdict), 'operations: ok');
});

test('foldOperationsCoverage: mute snapshot keeps degraded; current ok beats an older degraded', () => {
  const first = JSON.stringify({
    operations: 'degraded',
    operationsMissing: { noUsecase: ['startServiceExecution'], noEndpoint: [], declared: 47, covered: 44 },
  });
  const muted = foldOperationsCoverage(first, { outcome: 'passed' } as { operations?: unknown });
  assert.equal(muted.operations, 'degraded');
  assert.deepEqual(muted.operationsMissing, { noUsecase: ['startServiceExecution'], noEndpoint: [], declared: 47, covered: 44 });
  const existing = JSON.stringify({
    operations: 'degraded',
    operationsMissing: { noUsecase: ['startServiceExecution'], noEndpoint: [], declared: 47, covered: 44 },
    rounds: [{ operations: 'degraded', operationsMissing: { noUsecase: ['startServiceExecution'], noEndpoint: [], declared: 47, covered: 44 } }],
  });
  const folded = foldOperationsCoverage(existing, { operations: 'ok' });
  assert.equal(folded.operations, undefined);
  assert.equal(folded.operationsMissing, undefined);
});

test('buildHealthReportContent: operations ok stays in rounds and is omitted from the top level', () => {
  const content = buildHealthReportContent(null, { outcome: 'passed', operations: 'ok' }, '2026-08-24T00:00:00.000Z');
  const parsed = JSON.parse(content);
  assert.equal(parsed.operations, undefined);
  assert.equal(parsed.operationsMissing, undefined);
  assert.equal(parsed.rounds[0].operations, 'ok');
  const muted = foldOperationsCoverage(content, { outcome: 'passed' } as { operations?: unknown });
  assert.equal(muted.operations, undefined);
});

test('serializeRepairMutation preserves every concurrent read-modify-write', async () => {
  let repairTargets: string[] = [];
  await Promise.all(Array.from({ length: 12 }, (_, index) => serializeRepairMutation(async () => {
    const snapshot = repairTargets;
    await Promise.resolve(); // force the same interleaving as parallel worker persistence
    repairTargets = [...snapshot, `component-${index}`];
  })));

  assert.deepEqual(repairTargets.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), Array.from({ length: 12 }, (_, index) => `component-${index}`));
});
