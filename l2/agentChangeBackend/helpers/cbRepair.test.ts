/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serializeRepairMutation } from './cbRepairLock.js';
import {
  buildHealthReportContent, foldRepairAudit, foldModelsPeak, foldSeedsDegraded, foldOperationsCoverage, foldPipelineNotices,
  compareOperationsCoverage, expectedRoutesByOperation, operationsCoverageLogLine, MAX_HEALTH_ROUNDS,
} from './cbHealthReport.js';
import {
  mergeComponentRepair, buildRepairPromptSection, COMPONENT_REPAIR_BUDGET,
  resetRespawnCounts, noteStaleSpawn, noteRepairAttempt, staleSpawnCeiling, CB_DISPATCH_HARD_CEILING, dispatchHardCeiling, type CbComponentRepair,
} from './cbRepairCore.js';
import { recordComponentFailure, forceRegenerate } from './cbRepair.js';
import { setCbTraceModule } from './cbTraceScope.js';

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

test('foldPipelineNotices keeps the rebuild-all wipe count across mute snapshots', () => {
  const first = buildHealthReportContent(null, {
    outcome: 'scan',
    rebuildWiped: 12,
    rebuildWipedMessage: 'rebuild-all wiped 12 file(s) of l1/petShop',
  }, '2026-09-02T10:00:00.000Z');
  const folded = foldPipelineNotices(first, { outcome: 'passed', findings: [] });
  assert.equal(folded.rebuildWiped, 12);
  assert.equal(folded.rebuildWipedMessage, 'rebuild-all wiped 12 file(s) of l1/petShop');
});

test('foldPipelineNotices keeps scan warnings and read-back across mute snapshots', () => {
  const first = buildHealthReportContent(null, {
    outcome: 'scan',
    scanWarnings: ['duplicate todoBackend owner operation:createSignature; first entry kept'],
  }, '2026-08-31T13:44:00.000Z');
  const muted = JSON.parse(buildHealthReportContent(first, { outcome: 'passed', findings: [] }, '2026-08-31T13:50:00.000Z'));
  const folded = foldPipelineNotices(JSON.stringify(muted), { outcome: 'passed' });
  assert.deepEqual(folded.scanWarnings, ['duplicate todoBackend owner operation:createSignature; first entry kept']);
  const withReadBack = foldPipelineNotices(first, {
    todoReadBack: { retried: 7, lostUpdate: true, summary: 'stor 7 divergent' },
  });
  assert.equal((withReadBack.todoReadBack as { retried: number }).retried, 7);
  const emptyScan = foldPipelineNotices(first, { scanWarnings: [] });
  assert.deepEqual(emptyScan.scanWarnings, []);
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

test('noteStaleSpawn: first pass of 102 components never hits the hard ceiling', () => {
  resetRespawnCounts();
  assert.equal(dispatchHardCeiling(), CB_DISPATCH_HARD_CEILING);
  const blocked: string[] = [];
  for (let i = 0; i < 102; i++) {
    const spawn = noteStaleSpawn(`_102099_/l1/mod/layer_3_domain/entities/c${i}.defs.ts`);
    if (!spawn.scheduled) blocked.push(String(i));
    else {
      assert.equal(spawn.repairSpawns, 0);
      assert.equal(spawn.dispatches, 1);
    }
  }
  assert.deepEqual(blocked, []);
});

test('noteRepairAttempt: 3 succeed then the 4th is the re-spawn ceiling', () => {
  resetRespawnCounts();
  const defRef = '_102099_/l1/mod/layer_3_domain/entities/pet.defs.ts';
  const ceiling = staleSpawnCeiling();
  assert.equal(ceiling, COMPONENT_REPAIR_BUDGET + 1);
  const scheduled: number[] = [];
  let blocked: ReturnType<typeof noteRepairAttempt> | undefined;
  for (let i = 0; i < 10; i++) {
    const spawn = noteRepairAttempt(defRef);
    if (!spawn.scheduled) {
      blocked = spawn;
      break;
    }
    scheduled.push(spawn.repairSpawns);
  }
  assert.deepEqual(scheduled, [1, 2, 3]);
  assert.equal(scheduled.length, ceiling);
  assert.equal(blocked?.blockedBy, 'repair');
  assert.equal(blocked?.repairSpawns, ceiling);
  assert.equal(blocked?.repairCeiling, ceiling);
});

test('noteStaleSpawn: 10 dispatches of the same defRef hit the hard dispatch ceiling, not the repair ceiling', () => {
  resetRespawnCounts();
  const defRef = '_102099_/l1/mod/layer_3_domain/entities/hostLoop.defs.ts';
  const scheduled: number[] = [];
  let blocked: ReturnType<typeof noteStaleSpawn> | undefined;
  for (let i = 0; i < 20; i++) {
    const spawn = noteStaleSpawn(defRef);
    if (!spawn.scheduled) {
      blocked = spawn;
      break;
    }
    scheduled.push(spawn.dispatches);
    assert.equal(spawn.repairSpawns, 0);
  }
  assert.equal(scheduled.length, CB_DISPATCH_HARD_CEILING);
  assert.equal(scheduled[scheduled.length - 1], CB_DISPATCH_HARD_CEILING);
  assert.equal(blocked?.blockedBy, 'hard');
  assert.equal(blocked?.dispatches, CB_DISPATCH_HARD_CEILING);
  assert.equal(blocked?.dispatchCeiling, CB_DISPATCH_HARD_CEILING);
  assert.notEqual(blocked?.blockedBy, 'repair');
});

test('resetRespawnCounts starts a new run at dispatch 1 / repair 0', () => {
  const defRef = '_102099_/l1/mod/layer_3_domain/entities/reset.defs.ts';
  resetRespawnCounts();
  const first = noteStaleSpawn(defRef);
  assert.equal(first.dispatches, 1);
  assert.equal(first.repairSpawns, 0);
  const repaired = noteRepairAttempt(defRef);
  assert.equal(repaired.repairSpawns, 1);
  resetRespawnCounts();
  const after = noteStaleSpawn(defRef);
  assert.equal(after.dispatches, 1);
  assert.equal(after.repairSpawns, 0);
});

test('root bootstrap clears the in-memory spawn ceiling at the start of a run', () => {
  const src = readFileSync(new URL('../agentChangeBackend.ts', import.meta.url), 'utf8');
  assert.match(src, /resetRespawnCounts\(\)/);
});

test('forceRegenerate deletes the output .ts so the next dispatch generates', async () => {
  resetRespawnCounts();
  const project = 102099;
  const folder = 'mod/layer_3_domain/entities';
  const tsKey = storKey({ project, level: 1, folder, shortName: 'pet', extension: '.ts' });
  const repairKey = storKey({ project, level: 4, folder: 'mod/pipeline/trace/l1', shortName: 'cb-repair-state', extension: '.json' });
  const tsFile = { status: 'active' };
  const repairFile = { status: 'active', getContent: async () => '' };
  setCbTraceModule('mod');
  try {
    const ok = await withMlsAsync({
      actualProject: project,
      stor: {
        files: { [tsKey]: tsFile, [repairKey]: repairFile },
        getKeyToFile: storKey,
        localStor: { setContent: async () => undefined },
      },
    }, () => forceRegenerate('_102099_/l1/mod/layer_3_domain/entities/pet.defs.ts'));
    assert.equal(ok, true);
    assert.equal(tsFile.status, 'deleted');
  } finally {
    setCbTraceModule('');
  }
});

test('forceRegenerate: 3 deletes then the 4th returns false without deleting', async () => {
  resetRespawnCounts();
  const project = 102099;
  const folder = 'mod/layer_3_domain/entities';
  const tsKey = storKey({ project, level: 1, folder, shortName: 'order', extension: '.ts' });
  const repairKey = storKey({ project, level: 4, folder: 'mod/pipeline/trace/l1', shortName: 'cb-repair-state', extension: '.json' });
  let persisted = '';
  const tsFile = { status: 'active' };
  const repairFile = {
    status: 'active',
    getContent: async () => persisted,
  };
  const mlsPatch = {
    actualProject: project,
    stor: {
      files: { [tsKey]: tsFile, [repairKey]: repairFile },
      getKeyToFile: storKey,
      localStor: {
        setContent: async (_f: unknown, payload: { content: string }) => { persisted = payload.content; },
      },
    },
  };
  setCbTraceModule('mod');
  try {
    const results: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      tsFile.status = 'active';
      const ok = await withMlsAsync(mlsPatch, () => forceRegenerate('_102099_/l1/mod/layer_3_domain/entities/order.defs.ts'));
      results.push(ok);
      assert.equal(tsFile.status, 'deleted');
    }
    tsFile.status = 'active';
    const fourth = await withMlsAsync(mlsPatch, () => captureInfoAsync(() => forceRegenerate('_102099_/l1/mod/layer_3_domain/entities/order.defs.ts')));
    assert.deepEqual(results, [true, true, true]);
    assert.equal(fourth.result, false);
    assert.equal(tsFile.status, 'active');
    assert.match(fourth.lines[0] ?? '', /re-spawn ceiling reached \(3\/3\) — not regenerating/);
  } finally {
    setCbTraceModule('');
  }
});

async function captureInfoAsync<T>(fn: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = [];
  const orig = console.info;
  console.info = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
  try {
    return { result: await fn(), lines };
  } finally {
    console.info = orig;
  }
}

async function withMlsAsync<T>(patch: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  const g = globalThis as { mls?: Record<string, unknown> };
  const prev = g.mls;
  g.mls = { ...(prev ?? {}), ...patch };
  try { return await fn(); } finally { g.mls = prev; }
}

function storKey(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string {
  return `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`;
}

test('recordComponentFailure emits read/write/saved with prev.attempts from what was actually read', async () => {
  const project = 102099;
  const folder = 'mod/pipeline/trace/l1';
  const key = storKey({ project, level: 4, folder, shortName: 'cb-repair-state', extension: '.json' });
  let persisted = '';
  const file = {
    status: 'active',
    getContent: async () => persisted,
  };
  const mlsPatch = {
    actualProject: project,
    stor: {
      files: { [key]: file },
      getKeyToFile: storKey,
      localStor: {
        setContent: async (_f: unknown, payload: { content: string }) => { persisted = payload.content; },
      },
    },
  };
  setCbTraceModule('mod');
  try {
    const first = await withMlsAsync(mlsPatch, () => captureInfoAsync(() => recordComponentFailure(
      '_102099_/l1/mod/layer_3_domain/entities/pet.defs.ts',
      ['output .ts absent or stale after its layer already advanced'],
    )));
    assert.match(first.lines[0] ?? '', /\[cb-repair\] _102099_\/l1\/mod\/layer_3_domain\/entities\/pet\.defs\.ts read\(prev\.attempts=absent\) write\(attempts=1\) saved=true/);
    assert.equal(first.result.attempts, 1);
    const second = await withMlsAsync(mlsPatch, () => captureInfoAsync(() => recordComponentFailure(
      '_102099_/l1/mod/layer_3_domain/entities/pet.defs.ts',
      ['output .ts absent or stale after its layer already advanced'],
    )));
    assert.match(second.lines[0] ?? '', /read\(prev\.attempts=1\) write\(attempts=2\) saved=true/);
    assert.equal(second.result.attempts, 2);
  } finally {
    setCbTraceModule('');
  }
});

test('recordComponentFailure: a stor that never round-trips always reads prev.attempts=absent', async () => {
  const project = 102099;
  const folder = 'mod/pipeline/trace/l1';
  const key = storKey({ project, level: 4, folder, shortName: 'cb-repair-state', extension: '.json' });
  const file = {
    status: 'active',
    getContent: async () => '',
  };
  const mlsPatch = {
    actualProject: project,
    stor: {
      files: { [key]: file },
      getKeyToFile: storKey,
      localStor: {
        setContent: async () => undefined,
      },
    },
  };
  setCbTraceModule('mod');
  try {
    const first = await withMlsAsync(mlsPatch, () => captureInfoAsync(() => recordComponentFailure('entity.defs.ts', ['stale'])));
    const second = await withMlsAsync(mlsPatch, () => captureInfoAsync(() => recordComponentFailure('entity.defs.ts', ['stale'])));
    assert.match(first.lines[0] ?? '', /read\(prev\.attempts=absent\) write\(attempts=1\) saved=true/);
    assert.match(second.lines[0] ?? '', /read\(prev\.attempts=absent\) write\(attempts=1\) saved=true/);
  } finally {
    setCbTraceModule('');
  }
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
