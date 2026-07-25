/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeRepairMutation } from './cbRepairLock.js';
import { buildHealthReportContent, MAX_HEALTH_ROUNDS } from './cbHealthReport.js';
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

test('serializeRepairMutation preserves every concurrent read-modify-write', async () => {
  let repairTargets: string[] = [];
  await Promise.all(Array.from({ length: 12 }, (_, index) => serializeRepairMutation(async () => {
    const snapshot = repairTargets;
    await Promise.resolve(); // force the same interleaving as parallel worker persistence
    repairTargets = [...snapshot, `component-${index}`];
  })));

  assert.deepEqual(repairTargets.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), Array.from({ length: 12 }, (_, index) => `component-${index}`));
});
