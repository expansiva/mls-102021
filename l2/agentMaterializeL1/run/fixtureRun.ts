/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/fixtureRun.ts" enhancement="_blank"/>

/**
 * Certification fixture in the implement run (m1_30). After the units of the run are done, the
 * authenticated obligations of each controller (testing/obligations.ts) run in memory against
 * the emitted bytes through testing/fixture.ts `runFixture`, once per controller whose inputs
 * changed. Browser-safe: execution is a port the node host supplies (the same `workspace`
 * capability as the implement cases); a host without it is inconclusive with an owner.
 * - An obligation runs only when every unit its route imports has an accepted, intact output
 *   (the caller reads the receipts); otherwise it stays pending with owner L1. A sibling route's
 *   usecase does not hold it back.
 * - The key hashes the harness recipe, the fixture plan, the oracle sources, the emitted bytes the
 *   obligations import, the obligations and their readiness. Same key: the stored proof is reused.
 * - Memory is the only proof here. Runtime (identity, MDM) stays pending with its owner.
 */

import { isRecord, outputPathFromDefPath, readDefinition, receiptFolder, type M1Definition, type M1Verification } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { emittedValueExports } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { canonicalJson } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { fixtureModelOf } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { M1_RUNTIME_OWNER, runtimeGap, type M1FixtureCaseResult, type M1FixtureModel, type M1FixtureReceipt } from '/_102021_/l2/agentMaterializeL1/testing/fixture.js';
import type { M1Obligation } from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';
import { M1_CHECKPOINT_BUDGET_MS, M1_CHECKPOINT_SCHEMA, type M1Checkpoint, type M1Evidence } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';

export const M1_FIXTURE_REPORT_SCHEMA = '2026-09-28-m1-fixture-report-v1' as const;
/** Harness recipe; a new one invalidates every stored proof. */
export const M1_FIXTURE_RECIPE = '2026-09-28-m1-fixture-run-v1' as const;
/** Id of the verification row the controller receipt carries. */
export const M1_FIXTURE_CHECK = 'fixture.memory' as const;
export const M1_FIXTURE_HOST_OWNER = 'L1 host' as const;

export type M1RunFixtureStatus = 'passed' | 'failed' | 'inconclusive' | 'pending';

export interface M1RunFixture {
  /** Controller def whose routes the obligations call. */
  controller: string;
  key: string;
  status: M1RunFixtureStatus;
  /** Owner of a failure, a pending gap or an inconclusive run. */
  owner: string;
  detail: string;
  /** The proof of an earlier run with the same key. */
  reused: boolean;
  /** Execution that produced `receipt`; '' when nothing ran. */
  executionId: string;
  proof: 'memory';
  runtime: 'pending';
  runtimeOwner: typeof M1_RUNTIME_OWNER;
  hashes: { recipe: string; fixture: string; oracle: Record<string, string>; outputs: Record<string, string> };
  counts: { cases: number; passed: number; failed: number; pending: number; residue: number };
  /** Cases not executed because a unit they import is not materialized; also inside `receipt.cases` when it ran. */
  unready: M1FixtureCaseResult[];
  receipt: M1FixtureReceipt | null;
}

export interface M1FixtureReport {
  schemaVersion: typeof M1_FIXTURE_REPORT_SCHEMA;
  moduleName: string;
  entries: Record<string, M1RunFixture>;
}

/** Emitted bytes handed to the executor: output ref -> source, and which outputs are controllers and memory ports. */
export interface M1FixtureExecution {
  module: {
    project: string;
    files: Record<string, string>;
    controllers: string[];
    ports: Array<{ ref: string; entityId: string; exportName: string }>;
  };
  model: M1FixtureModel;
  obligations: M1Obligation[];
  runId: string;
  mode: unknown;
}

/** Node host port (l1 testing/memoryLoad.ts `runEmittedFixture`). */
export type M1FixtureExecutor = (input: M1FixtureExecution) => Promise<{ receipt: M1FixtureReceipt | null; error: string }>;

export interface FixturePassInput {
  moduleName: string;
  units: readonly PlanUnitInput[];
  obligations: readonly M1Obligation[];
  oracleSources: Readonly<Record<string, string>>;
  /** '' when the unit's output is accepted and intact; otherwise why not. */
  unready: (defPath: string) => Promise<string>;
  read: (ref: string) => Promise<string | null>;
  previous: M1FixtureReport | null;
  /** null: the host offers no execution; `hostGap` says why. */
  execute: M1FixtureExecutor | null;
  hostGap: string;
  mode: unknown;
  /** Unique per run; ids of the fixture are made from it. */
  runStamp: string;
}

export function fixtureReportRef(moduleName: string): string {
  return `${receiptFolder(moduleName)}/fixtureReport.json`;
}

export function parseFixtureReport(text: string | null, moduleName: string): M1FixtureReport | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as unknown;
    if (!isRecord(value) || value.schemaVersion !== M1_FIXTURE_REPORT_SCHEMA || value.moduleName !== moduleName || !isRecord(value.entries)) return null;
    return value as unknown as M1FixtureReport;
  } catch {
    return null;
  }
}

export function renderFixtureReport(report: M1FixtureReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** One entry per controller with obligations. Writes nothing; the caller persists the report. */
export async function fixturePass(input: FixturePassInput): Promise<M1RunFixture[]> {
  const defs = new Map<string, M1Definition>();
  for (const unit of input.units) {
    const parsed = readDefinition(unit.definition);
    if (!('issues' in parsed)) defs.set(unit.defPath, parsed);
  }
  const model = fixtureModelOf(defs);
  // No plan: every obligation already carries FIXTURE_PLAN_ABSENT as a catalog gap.
  if (!model) return [];
  const seeds = [...defs.values()].find(item => item.artifactType === 'persistenceSeeds' && item.data.fixture !== undefined);
  const fixtureHash = await contentHash(canonicalJson(seeds?.data.fixture ?? null));
  const byId = new Map([...defs.entries()].map(([path, definition]) => [`${definition.artifactType}:${definition.artifactId}`, path]));
  const ports = [...defs.entries()].filter(([, definition]) => definition.artifactType === 'repositoryPort');
  const dataEntities = new Set(model.plan.datasets.map(item => item.entityId));
  const closure = (roots: readonly string[]): string[] => {
    const seen = new Set<string>();
    const stack = [...roots];
    while (stack.length > 0) {
      const path = stack.pop() ?? '';
      if (!defs.has(path) || seen.has(path)) continue;
      seen.add(path);
      stack.push(...(defs.get(path)?.dependencies ?? []));
    }
    return [...seen].sort();
  };
  const entries: M1RunFixture[] = [];
  for (const [controllerPath, controller] of defs) {
    if (controller.artifactType !== 'httpController') continue;
    const obligations = input.obligations.filter(item => item.sources.some(source => source.startsWith(`${controllerPath}#`)));
    if (obligations.length === 0) continue;
    const handlers = Array.isArray(controller.data.handlers) ? controller.data.handlers.filter(isRecord) : [];
    // The controller and what it imports besides its route usecases (scope, authority map, contracts).
    const own = [controllerPath, ...closure(controller.dependencies.filter(path => defs.get(path)?.artifactType !== 'usecase'))];
    const ready: M1Obligation[] = [];
    const unready: M1FixtureCaseResult[] = [];
    const imported = new Set<string>([controllerPath]);
    for (const obligation of obligations) {
      const handler = handlers.find(item => item.route === obligation.routine);
      const usecase = byId.get(`usecase:${String(handler?.usecaseId ?? '')}`) ?? '';
      const entities = new Set([...dataEntities, model.routeEntity.get(obligation.routine) ?? '']);
      const needed = [...new Set([...own, ...closure([usecase, ...ports.filter(([, port]) => entities.has(String(port.data.entityId))).map(([path]) => path)])])].sort();
      const missing: string[] = usecase ? [] : [`usecase of ${obligation.routine} is not a unit`];
      for (const path of needed) {
        const why = await input.unready(path);
        if (why) missing.push(`${path} ${why}`);
      }
      if (missing.length > 0) {
        unready.push({
          caseId: obligation.caseId, memory: 'pending', owner: 'L1',
          detail: `FIXTURE_DEPENDENCY_UNMATERIALIZED: ${missing.join(', ')}`,
          runtime: 'pending', runtimeGap: runtimeGap(model.plan, obligation), runtimeOwner: M1_RUNTIME_OWNER,
        });
        continue;
      }
      ready.push(obligation);
      for (const path of needed) imported.add(path);
    }
    const outputs: Record<string, string> = {};
    for (const path of [...imported].sort()) {
      const output = outputPathFromDefPath(path);
      if (!output) continue;
      const text = await input.read(output);
      outputs[output] = text === null ? 'absent' : await contentHash(text);
    }
    const oracle: Record<string, string> = {};
    for (const ref of [...new Set(obligations.flatMap(item => item.sources.map(source => source.split('#')[0] ?? source)))].sort()) {
      oracle[ref] = input.oracleSources[ref] ?? 'absent';
    }
    const hashes = { recipe: M1_FIXTURE_RECIPE, fixture: fixtureHash, oracle, outputs };
    const key = await contentHash(canonicalJson({ hashes, obligations, ready: ready.map(item => item.caseId), mode: String(input.mode ?? '') }));
    const base = {
      controller: controllerPath, key, reused: false, executionId: '', proof: 'memory' as const, runtime: 'pending' as const,
      runtimeOwner: M1_RUNTIME_OWNER, hashes, unready,
    };
    const previous = input.previous?.entries[controllerPath];
    if (previous && previous.key === key && previous.status !== 'inconclusive') {
      entries.push({ ...previous, reused: true });
      continue;
    }
    if (ready.length === 0) {
      entries.push({ ...base, status: 'pending', owner: 'L1', detail: 'No obligation is ready: a unit it imports is not materialized.', counts: counts(unready, null), receipt: null });
      continue;
    }
    if (!input.execute) {
      entries.push({ ...base, status: 'inconclusive', owner: M1_FIXTURE_HOST_OWNER, detail: input.hostGap, counts: counts(unready, null), receipt: null });
      continue;
    }
    const executionId = `${input.runStamp}.${controller.artifactId}`;
    const files: Record<string, string> = {};
    for (const unit of input.units) {
      const output = outputPathFromDefPath(unit.defPath);
      const text = output ? await input.read(output) : null;
      if (output && text !== null) files[output] = text;
    }
    const loadPorts = ports
      .filter(([path, port]) => imported.has(path) || dataEntities.has(String(port.data.entityId)))
      .map(([path, port]) => ({ ref: outputPathFromDefPath(path), entityId: String(port.data.entityId), exportName: emittedValueExports(port)[0] ?? '' }));
    const project = /^(_\d+_)\//.exec(controllerPath)?.[1] ?? '';
    let ran: { receipt: M1FixtureReceipt | null; error: string };
    try {
      ran = await input.execute({
        module: { project, files, controllers: [outputPathFromDefPath(controllerPath)], ports: loadPorts },
        model, obligations: ready, runId: executionId, mode: input.mode,
      });
    } catch (error) {
      ran = { receipt: null, error: `FIXTURE_EXECUTOR_FAILED: ${error instanceof Error ? error.message : String(error)}` };
    }
    if (!ran.receipt) {
      entries.push({ ...base, executionId, status: 'inconclusive', owner: 'L1', detail: ran.error || 'the executor returned no receipt', counts: counts(unready, null), receipt: null });
      continue;
    }
    const receipt: M1FixtureReceipt = { ...ran.receipt, cases: [...ran.receipt.cases, ...unready] };
    const failed = receipt.cases.filter(item => item.memory === 'failed');
    const passed = receipt.cases.filter(item => item.memory === 'passed');
    let status: M1RunFixtureStatus = 'pending';
    let owner = 'L1';
    let detail = '';
    if (receipt.phase === 'refused') {
      status = 'inconclusive';
      detail = receipt.refused;
    } else if (failed.length > 0 || receipt.ledger.residue.length > 0) {
      status = 'failed';
      detail = [...failed.map(item => `${item.caseId}: ${item.detail}`), ...receipt.ledger.residue.map(item => `residue ${item}`)].join('; ');
    } else if (passed.length > 0) {
      status = 'passed';
      owner = '';
      detail = `${passed.length} case(s) passed in memory; runtime proof pending (${M1_RUNTIME_OWNER}).`;
    } else {
      detail = 'No case ran in memory; every one keeps its gap.';
    }
    entries.push({ ...base, executionId, status, owner, detail, counts: counts(receipt.cases, receipt), receipt });
  }
  return entries;
}

function counts(cases: readonly M1FixtureCaseResult[], receipt: M1FixtureReceipt | null): M1RunFixture['counts'] {
  return {
    cases: cases.length,
    passed: cases.filter(item => item.memory === 'passed').length,
    failed: cases.filter(item => item.memory === 'failed').length,
    pending: cases.filter(item => item.memory === 'pending').length,
    residue: receipt?.ledger.residue.length ?? 0,
  };
}

/** The run checkpoint of one entry: executed cases and residue; pending cases keep their gap in the report. */
export function fixtureCheckpoint(entry: M1RunFixture, runId: string, commit: string, at: string): M1Checkpoint | null {
  const rows: M1Evidence[] = [];
  const row = (caseId: string, verdict: M1Evidence['verdict'], detail: string): M1Evidence => ({ caseId, verdict, errorCode: null, status: null, durationMs: 0, detail });
  if (entry.status === 'inconclusive') rows.push(row(`${entry.controller}#${M1_FIXTURE_CHECK}`, 'inconclusive', `${entry.owner}: ${entry.detail}`));
  for (const item of entry.receipt?.cases ?? []) {
    if (item.memory === 'passed') rows.push(row(item.caseId, 'passed', 'passed in memory'));
    if (item.memory === 'failed') rows.push(row(item.caseId, 'failed', item.detail));
  }
  for (const item of entry.receipt?.ledger.residue ?? []) rows.push(row(`${entry.controller}#cleanup`, 'failed', `residue ${item}`));
  if (rows.length === 0) return null;
  const tally = { passed: 0, expectedRed: 0, failed: 0, blocked: 0, skipped: 0, inconclusive: 0 };
  for (const item of rows) tally[item.verdict] += 1;
  const accepted = rows.every(item => item.verdict === 'passed');
  const bad = rows.find(item => item.verdict !== 'passed');
  return {
    schemaVersion: M1_CHECKPOINT_SCHEMA,
    runId,
    inputHash: entry.key,
    commit,
    stage: 'implement',
    handlerId: M1_FIXTURE_CHECK,
    startedAt: at,
    finishedAt: at,
    budgetMs: M1_CHECKPOINT_BUDGET_MS,
    counts: tally,
    durationsMs: { total: 0 },
    ready: false,
    accepted,
    evidence: rows,
    nextAction: accepted
      ? `Memory fixture accepted for ${entry.controller}; runtime proof pending (${M1_RUNTIME_OWNER}).`
      : `Fix ${bad?.caseId}: ${bad?.detail}. Do not weaken the assertion.`,
    monitor: { delivered: false, error: 'memory fixture is not a monitor result' },
  };
}

/** Verification row for the controller receipt, only when the cases ran. */
export function fixtureVerification(entry: M1RunFixture): M1Verification | null {
  if (entry.status !== 'passed' && entry.status !== 'failed') return null;
  const tally = `${entry.counts.passed} passed, ${entry.counts.failed} failed, ${entry.counts.pending} pending, residue ${entry.counts.residue}`;
  return {
    id: M1_FIXTURE_CHECK,
    kind: 'test',
    passed: entry.status === 'passed',
    detail: `memory ${entry.status} (${tally}; execution ${entry.executionId}); runtime pending (${M1_RUNTIME_OWNER}). ${entry.status === 'failed' ? entry.detail : ''}`.trim(),
  };
}

/** Report lines for a run log; CLI and Studio print the same text. */
export function fixtureLines(entries: readonly M1RunFixture[]): string[] {
  return entries.flatMap(entry => {
    const tally = `passed=${entry.counts.passed} failed=${entry.counts.failed} pending=${entry.counts.pending} residue=${entry.counts.residue}`;
    const head = `fixture: ${entry.status} ${entry.controller} ${tally} proof=${entry.proof} runtime=${entry.runtime} (${entry.runtimeOwner})${entry.reused ? ' reused' : ''}${entry.executionId ? ` execution=${entry.executionId}` : ''} key=${entry.key}`;
    return entry.detail && entry.status !== 'passed' ? [head, `fixtureDetail: ${entry.owner ? `(${entry.owner}) ` : ''}${entry.detail}`] : [head];
  });
}
