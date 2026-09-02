/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Repair-loop + juiz state for the agentChangeBackend flow (Stage 3). Implements the shared
// "repair loop / juiz LLM" block+ improveAddNewSolution2_1.md
// §4.3/§4.4): findings are routed back to the component that produced them, the worker retries WITH
// the findings in context, and exhausted budgets produce a CLEAN failure with an objective trace.
//
// The flow engine needs NO change: "reopening" a step = enqueueing a fresh step with unique
// args/planId (add-step), which every hook already supports. This file only keeps the durable state
// that (a) carries findings to the retry prompt and (b) enforces the attempt budgets (anti-loop).
//
// Storage: l4/trace/cb-repair-state.json (cleared on validate-all success and with the run traces).
// The taxonomy (estrutural | decisao | fora_de_escopo) mirrors improveAddNewSolution2_1.md §2 so the
// same routing vocabulary can be reused by the ns2 repair loop later.

import { createStorFile, deleteFile } from '/_102027_/l2/libStor.js';
import { parseMlsPath } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { isRecord, parseMaybeJson } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { serializeRepairMutation } from '/_102021_/l2/agentChangeBackend/helpers/cbRepairLock.js';
import { cbTraceFolder, cbTraceReadFolders } from '/_102021_/l2/agentChangeBackend/helpers/cbTraceScope.js';
import { buildHealthReportContent, foldRepairAudit, foldModelsPeak, foldSeedsDegraded, foldOperationsCoverage, foldPipelineNotices } from '/_102021_/l2/agentChangeBackend/helpers/cbHealthReport.js';
import { parseStepCost, accumulatePhaseCost, summarizeCost, type CbCostReport } from '/_102021_/l2/agentChangeBackend/helpers/cbCostReport.js';
import {
  COMPONENT_REPAIR_BUDGET, MAX_LAST_CODE, mergeComponentRepair, buildRepairPromptSection, noteRepairAttempt,
  type CbComponentRepair, type CbRepairSource,
} from '/_102021_/l2/agentChangeBackend/helpers/cbRepairCore.js';

// Re-exported so existing importers keep importing the repair contract from cbRepair.js.
export { COMPONENT_REPAIR_BUDGET, mergeComponentRepair, buildRepairPromptSection, resetRespawnCounts, noteStaleSpawn, noteRepairAttempt, staleSpawnCeiling, CB_DISPATCH_HARD_CEILING, dispatchHardCeiling } from '/_102021_/l2/agentChangeBackend/helpers/cbRepairCore.js';
export type { CbComponentRepair, CbRepairSource, CbRespawnCount, CbCeilingKind, CbSpawnDecision } from '/_102021_/l2/agentChangeBackend/helpers/cbRepairCore.js';

// ── budgets (anti-loop) ─────────────────────────────────────────────────────────

/** Max full validate-all -> re-materialize repair rounds. */
// 2 rounds (user decision 2026-07-17, run e): the whole-project compile check now surfaces REAL
// compiler findings only at validate-all, so the global round is the primary fix path — one round
// for the bulk, one for stragglers introduced by the first round's own repairs.
export const GLOBAL_REPAIR_BUDGET = 2;
/** Max judge passes (initial critique + 1 post-repair verification). */
export const JUDGE_MAX_RUNS = 2;

// ── types ───────────────────────────────────────────────────────────────────────

/** Routing taxonomy (improveAddNewSolution2_1.md §2). fora_de_escopo findings are discarded. */
export type CbFindingType = 'estrutural' | 'decisao' | 'fora_de_escopo';

export interface CbJudgeFinding {
  ownerId: string;
  type: CbFindingType;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

export interface CbRepairState {
  schemaVersion: string;
  componentRepairs: Record<string, CbComponentRepair>;
  globalAttempts: number;  // validate-all repair rounds consumed
  judgeRuns: number;       // judge passes consumed
  /** Durable audit of every repair occurrence in the run ("target :: attempt n :: finding"). The
   * fan-out children are DELETED by the runtime after completion, so this history is what survives;
   * cb-validate-all embeds it in the task trace before clearing the state. */
  history: string[];
  updatedAt: string;
}

const SCHEMA_VERSION = '2026-07-03-cb-repair';

/** The stor entry of a trace artifact, or undefined when this session does not have it. */
function traceFile(info: Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>) {
  return mls.stor.files[mls.stor.getKeyToFile(info)];
}

function stateFileInfo(folder = cbTraceFolder()): Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'> {
  return { project: mls.actualProject || 0, level: 4, folder, shortName: 'cb-repair-state', extension: '.json' };
}

function emptyState(): CbRepairState {
  return { schemaVersion: SCHEMA_VERSION, componentRepairs: {}, globalAttempts: 0, judgeRuns: 0, history: [], updatedAt: new Date().toISOString() };
}

const MAX_HISTORY = 100;

/** Append a timestamped line to the durable repair history (bounded). Exported so the validate-all
 *  global repair round can record which defRefs it forced stale (it mutates the state object directly
 *  in one read/save transaction). */
export function pushHistory(state: CbRepairState, entry: string): void {
  state.history.push(`${new Date().toISOString()} :: ${entry}`);
  if (state.history.length > MAX_HISTORY) state.history.splice(0, state.history.length - MAX_HISTORY);
}

// ── state I/O ───────────────────────────────────────────────────────────────────

export async function readRepairState(): Promise<CbRepairState> {
  try {
    const file = cbTraceReadFolders().map(folder => traceFile(stateFileInfo(folder))).find(item => item && item.status !== 'deleted');
    if (!file || file.status === 'deleted') return emptyState();
    const parsed = parseMaybeJson(String(await file.getContent()));
    if (!isRecord(parsed)) return emptyState();
    return {
      schemaVersion: SCHEMA_VERSION,
      componentRepairs: isRecord(parsed.componentRepairs) ? (parsed.componentRepairs as Record<string, CbComponentRepair>) : {},
      globalAttempts: typeof parsed.globalAttempts === 'number' ? parsed.globalAttempts : 0,
      judgeRuns: typeof parsed.judgeRuns === 'number' ? parsed.judgeRuns : 0,
      history: Array.isArray(parsed.history) ? (parsed.history as unknown[]).filter((h): h is string => typeof h === 'string') : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyState();
  }
}

export async function saveRepairState(state: CbRepairState): Promise<boolean> {
  try {
    state.updatedAt = new Date().toISOString();
    const info = stateFileInfo();
    const source = `${JSON.stringify(state, null, 2)}\n`;
    const key = mls.stor.getKeyToFile(info);
    let file = mls.stor.files[key];
    if (!file) file = await createStorFile({ ...info, source }, false, false, false);
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
    return true;
  } catch (error) {
    console.warn('[cbRepair] saveRepairState failed', error);
    return false;
  }
}

/** Wipe the whole repair state (validate-all passed: the run converged). */
export async function clearRepairState(): Promise<void> {
  if (!await saveRepairState(emptyState())) throw new Error('repair state persistence failed while clearing a converged run');
}

// ── component records ───────────────────────────────────────────────────────────

/** Repair target key for the usecase DEFS phase (shared by agentCbUsecase and agentCbJudge). */
export function usecaseDefsTarget(ownerId: string): string {
  return `usecase-defs:${ownerId}`;
}

export async function getComponentRepair(target: string): Promise<CbComponentRepair | null> {
  const state = await readRepairState();
  return state.componentRepairs[target] ?? null;
}

/** Record a failed attempt (increments the budget) and keep the findings + rejected code for the retry prompt. */
export async function recordComponentFailure(target: string, findings: string[], lastCode?: string, source: CbRepairSource = 'component-validate'): Promise<CbComponentRepair> {
  return serializeRepairMutation(async () => {
    const state = await readRepairState();
    const prev = state.componentRepairs[target];
    // Merge (priorFindings + lastCode carried) so a retry fixes instead of re-rolling; attempts++.
    const entry = mergeComponentRepair(prev, target, findings, { attempts: (prev?.attempts ?? 0) + 1, source, lastCode });
    state.componentRepairs[target] = entry;
    pushHistory(state, `${target} :: attempt ${entry.attempts} :: ${entry.findings[0] ?? 'failure'}`);
    const saved = await saveRepairState(state);
    const prevAttempts = prev ? String(prev.attempts) : 'absent';
    console.info(`[cb-repair] ${target} read(prev.attempts=${prevAttempts}) write(attempts=${entry.attempts}) saved=${saved}`);
    if (!saved) throw new Error(`repair state persistence failed while recording ${target}`);
    return entry;
  });
}

/** Set findings WITHOUT burning component budget (used by the validate-all global round, which grants
 * the component a fresh worker budget — the global round has its own budget). */
export async function setComponentFindings(target: string, findings: string[], source: CbRepairSource): Promise<void> {
  await serializeRepairMutation(async () => {
    const state = await readRepairState();
    state.componentRepairs[target] = { target, attempts: 0, findings: findings.slice(0, 20), source, updatedAt: new Date().toISOString() };
    pushHistory(state, `${target} :: ${source} :: ${findings[0] ?? 'finding'}`);
    if (!await saveRepairState(state)) throw new Error(`repair state persistence failed while recording findings for ${target}`);
  });
}

export async function clearComponentRepair(target: string): Promise<void> {
  await serializeRepairMutation(async () => {
    const state = await readRepairState();
    if (!state.componentRepairs[target]) return;
    delete state.componentRepairs[target];
    if (!await saveRepairState(state)) throw new Error(`repair state persistence failed while clearing ${target}`);
  });
}

/** True while the component may still be retried (attempts consumed <= budget). */
export function hasRepairBudget(entry: CbComponentRepair | null | undefined): boolean {
  return !!entry && entry.attempts > 0 && entry.attempts <= COMPONENT_REPAIR_BUDGET;
}

// buildRepairPromptSection moved to cbRepairCore.ts (pure, unit-testable) and re-exported above.

// ── durable run report ──────────────────────────────────────────────────────────

/** Persist the validate-all outcome + repair audit to l4/trace/cb-health-report.json. The task dump
 * keeps interaction null on deterministic steps and the repair state is cleared on success, so this
 * file is the DURABLE record of what was repaired in the run (survives task cleanup). */
export async function saveHealthReport(report: Record<string, unknown>): Promise<void> {
  try {
    const info: Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'> =
      { project: mls.actualProject || 0, level: 4, folder: cbTraceFolder(), shortName: 'cb-health-report', extension: '.json' };
    const key = mls.stor.getKeyToFile(info);
    let file = mls.stor.files[key];
    // Read the existing report so the new snapshot ACCUMULATES into `rounds` instead of overwriting it
    // (the per-round repair audit must survive across the run's many saveHealthReport calls).
    let existingRaw: string | null = null;
    if (file && file.status !== 'deleted') {
      try { existingRaw = String((await file.getContent()) ?? ''); } catch { existingRaw = null; }
    }
    // T7: embed the accumulated per-phase cost so the health report itself carries custoPorFase
    // (no manual post-processing of the task dump). The last snapshot = the run's final cost.
    const costByPhase = await readCostReport();
    const withCost = Object.keys(costByPhase).length ? { ...report, costByPhase, costSummary: summarizeCost(costByPhase) } : report;
    const folded = foldRepairAudit(existingRaw, withCost);
    const models = foldModelsPeak(existingRaw, withCost);
    const seedsFold = foldSeedsDegraded(existingRaw, withCost);
    const operationsFold = foldOperationsCoverage(existingRaw, withCost);
    const notices = foldPipelineNotices(existingRaw, withCost);
    const enriched = {
      ...withCost,
      repairHistory: folded.repairHistory,
      globalAttempts: folded.globalAttempts,
      ...(models ? { models } : {}),
      ...seedsFold,
      ...operationsFold,
      ...notices,
    };
    const source = buildHealthReportContent(existingRaw, enriched, new Date().toISOString());
    if (!file) file = await createStorFile({ ...info, source }, false, false, false);
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
  } catch (error) {
    console.warn('[cbRepair] saveHealthReport failed', error);
  }
}

// ── per-phase cost telemetry (T7) ────────────────────────────────────────────────

function costFileInfo(): Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'> {
  return { project: mls.actualProject || 0, level: 4, folder: cbTraceFolder(), shortName: 'cb-cost', extension: '.json' };
}

/** Accumulate ONE LLM step's cost into l4/trace/cb-cost.json under `phase`. Cost comes from the
 *  authoritative `interaction.cost` (this step's LLM charge, retries included, no child cost); token
 *  counts are parsed from the trace (not carried on the interaction). Best-effort + serialized (fan-out
 *  workers write concurrently); never throws into the flow. */
export async function recordLlmCost(phase: string, interaction: mls.msg.AIInteraction | null | undefined): Promise<void> {
  if (!interaction) return;
  const parsed = parseStepCost(interaction.trace ?? []);
  const cost = typeof interaction.cost === 'number' && interaction.cost > 0 ? interaction.cost : parsed.cost;
  const delta = { cost, inputTokens: parsed.inputTokens, outputTokens: parsed.outputTokens };
  if (!delta.cost && !delta.inputTokens && !delta.outputTokens) return;
  try {
    await serializeRepairMutation(async () => {
      const report = await readCostReport();
      const next = accumulatePhaseCost(report, phase, delta);
      const info = costFileInfo();
      const source = `${JSON.stringify(next, null, 2)}\n`;
      const key = mls.stor.getKeyToFile(info);
      let file = mls.stor.files[key];
      if (!file) file = await createStorFile({ ...info, source }, false, false, false);
      await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
    });
  } catch (error) {
    console.warn('[cbRepair] recordLlmCost failed', error);
  }
}

export async function readCostReport(): Promise<CbCostReport> {
  try {
    const file = cbTraceReadFolders().map(folder => traceFile({ ...costFileInfo(), folder })).find(item => item && item.status !== 'deleted');
    if (!file || file.status === 'deleted') return {};
    const parsed = JSON.parse(String((await file.getContent()) ?? '')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as CbCostReport : {};
  } catch {
    return {};
  }
}

/** Read the last-state cb-health-report.json (top level = the last snapshot). Used by the final summary
 *  (T6) to surface residual compiler findings that would otherwise live only in this file. */
export async function readHealthReport(): Promise<Record<string, unknown> | null> {
  try {
    const file = cbTraceReadFolders()
      .map(folder => mls.stor.files[mls.stor.getKeyToFile({ project: mls.actualProject || 0, level: 4, folder, shortName: 'cb-health-report', extension: '.json' })])
      .find(item => item && item.status !== 'deleted');
    if (!file || file.status === 'deleted') return null;
    const parsed = JSON.parse(String((await file.getContent()) ?? '')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

// ── regenerate by deleting the output .ts (validate-all / worker repair routing) ─

/** Delete the output `.ts` so the next dispatch generates it. The repair ceiling lives here:
 *  the 4th call on the same defRef returns false, records a finding, and leaves the `.ts`. */
export async function forceRegenerate(defRef: string): Promise<boolean> {
  const spawn = noteRepairAttempt(defRef);
  if (!spawn.scheduled) {
    const msg = `re-spawn ceiling reached (${spawn.repairSpawns}/${spawn.repairCeiling}) — not regenerating`;
    console.info(`[cb-stale] ${defRef} ${msg}`);
    try {
      await setComponentFindings(defRef, [msg], 'component-validate');
    } catch { /* refuse even if the finding persist fails */ }
    return false;
  }
  try {
    const p = parseMlsPath(defRef);
    if (!p) return false;
    const key = mls.stor.getKeyToFile({ project: p.project, level: p.level, folder: p.folder, shortName: p.shortName, extension: '.ts' });
    const file = mls.stor.files[key];
    if (!file || file.status === 'deleted') return true;
    try {
      await deleteFile(file);
    } catch {
      file.status = 'deleted';
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * The dossier of one run, written where the module's trace lives.
 *
 * Everything here was reconstructed BY HAND after each run, from the task record plus the console: the
 * cost and calls per phase, the repair history, the residual findings and the model counts. Writing it
 * once, at the end, makes the next post-mortem a file read.
 */
export async function saveRunReport(report: Record<string, unknown>): Promise<string | null> {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const info = {
      project: mls.actualProject || 0, level: 4, folder: cbTraceFolder(),
      shortName: `cb-run-${stamp}`, extension: '.json',
    };
    const source = `${JSON.stringify({ savedAt: new Date().toISOString(), ...report }, null, 2)}\n`;
    const key = mls.stor.getKeyToFile(info);
    let file = mls.stor.files[key];
    if (!file) file = await createStorFile({ ...info, source }, false, false, false);
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
    return `l4/${info.folder}/${info.shortName}.json`;
  } catch (error) {
    console.warn('[cbRepair] saveRunReport failed', error);
    return null;
  }
}
