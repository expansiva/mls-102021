/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Repair-loop + juiz state for the agentChangeBackend flow (Stage 3). Implements the shared
// "repair loop / juiz LLM" block (todo/ajustesFinaisChangeBackend.md §2 + improveAddNewSolution2_1.md
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

import { createStorFile } from '/_102027_/l2/libStor.js';
import { parseMlsPath } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { isRecord, parseMaybeJson } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';

// ── budgets (anti-loop) ─────────────────────────────────────────────────────────

/** Max REPAIR attempts per component after the first failure (first try + 2 repairs = 3 LLM calls). */
export const COMPONENT_REPAIR_BUDGET = 2;
/** Max full validate-all -> re-materialize repair rounds. */
export const GLOBAL_REPAIR_BUDGET = 1;
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

export type CbRepairSource = 'component-validate' | 'validate-all' | 'judge';

export interface CbComponentRepair {
  target: string;          // defRef of the component OR 'usecase-defs:{ownerId}' for the defs phase
  attempts: number;        // failed attempts consumed so far
  findings: string[];      // last findings (fed back into the retry prompt)
  lastCode?: string;       // previous rejected code (truncated) so the model fixes, not regenerates blindly
  source: CbRepairSource;
  updatedAt: string;
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
const MAX_LAST_CODE = 6000;

function stateFileInfo(): Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'> {
  return { project: mls.actualProject || 0, level: 4, folder: 'trace', shortName: 'cb-repair-state', extension: '.json' };
}

function emptyState(): CbRepairState {
  return { schemaVersion: SCHEMA_VERSION, componentRepairs: {}, globalAttempts: 0, judgeRuns: 0, history: [], updatedAt: new Date().toISOString() };
}

const MAX_HISTORY = 100;

function pushHistory(state: CbRepairState, entry: string): void {
  state.history.push(`${new Date().toISOString()} :: ${entry}`);
  if (state.history.length > MAX_HISTORY) state.history.splice(0, state.history.length - MAX_HISTORY);
}

// ── state I/O ───────────────────────────────────────────────────────────────────

export async function readRepairState(): Promise<CbRepairState> {
  try {
    const info = stateFileInfo();
    const file = mls.stor.files[mls.stor.getKeyToFile(info)];
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

export async function saveRepairState(state: CbRepairState): Promise<void> {
  try {
    state.updatedAt = new Date().toISOString();
    const info = stateFileInfo();
    const source = `${JSON.stringify(state, null, 2)}\n`;
    const key = mls.stor.getKeyToFile(info);
    let file = mls.stor.files[key];
    if (!file) file = await createStorFile({ ...info, source }, false, false, false);
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
  } catch (error) {
    console.warn('[cbRepair] saveRepairState failed', error);
  }
}

/** Wipe the whole repair state (validate-all passed: the run converged). */
export async function clearRepairState(): Promise<void> {
  await saveRepairState(emptyState());
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
  const state = await readRepairState();
  const prev = state.componentRepairs[target];
  const entry: CbComponentRepair = {
    target,
    attempts: (prev?.attempts ?? 0) + 1,
    findings: findings.slice(0, 20),
    ...(lastCode ? { lastCode: lastCode.length > MAX_LAST_CODE ? `${lastCode.slice(0, MAX_LAST_CODE)}\n// ... (truncated)` : lastCode } : {}),
    source,
    updatedAt: new Date().toISOString(),
  };
  state.componentRepairs[target] = entry;
  pushHistory(state, `${target} :: attempt ${entry.attempts} :: ${entry.findings[0] ?? 'failure'}`);
  await saveRepairState(state);
  return entry;
}

/** Set findings WITHOUT burning component budget (used by the validate-all global round, which grants
 * the component a fresh worker budget — the global round has its own budget). */
export async function setComponentFindings(target: string, findings: string[], source: CbRepairSource): Promise<void> {
  const state = await readRepairState();
  state.componentRepairs[target] = { target, attempts: 0, findings: findings.slice(0, 20), source, updatedAt: new Date().toISOString() };
  pushHistory(state, `${target} :: ${source} :: ${findings[0] ?? 'finding'}`);
  await saveRepairState(state);
}

export async function clearComponentRepair(target: string): Promise<void> {
  const state = await readRepairState();
  if (!state.componentRepairs[target]) return;
  delete state.componentRepairs[target];
  await saveRepairState(state);
}

/** True while the component may still be retried (attempts consumed <= budget). */
export function hasRepairBudget(entry: CbComponentRepair | null | undefined): boolean {
  return !!entry && entry.attempts > 0 && entry.attempts <= COMPONENT_REPAIR_BUDGET;
}

// ── prompt injection ────────────────────────────────────────────────────────────

/** Repair section appended to the worker's human prompt on a retry. */
export function buildRepairPromptSection(entry: CbComponentRepair): string {
  const lines = [
    '## REPAIR — previous attempt was REJECTED by the deterministic validator',
    '',
    `This is repair attempt ${entry.attempts} of ${COMPONENT_REPAIR_BUDGET + 1} for this component (source: ${entry.source}).`,
    'Fix EXACTLY the findings below. Do not introduce unrelated changes.',
    '',
    '### Findings (each one MUST be resolved)',
    ...entry.findings.map(f => `- ${f}`),
  ];
  if (entry.lastCode) {
    lines.push('', '### Previous rejected output (fix it — do not repeat these mistakes)', '```ts', entry.lastCode, '```');
  }
  return lines.join('\n');
}

// ── durable run report ──────────────────────────────────────────────────────────

/** Persist the validate-all outcome + repair audit to l4/trace/cb-health-report.json. The task dump
 * keeps interaction null on deterministic steps and the repair state is cleared on success, so this
 * file is the DURABLE record of what was repaired in the run (survives task cleanup). */
export async function saveHealthReport(report: Record<string, unknown>): Promise<void> {
  try {
    const info: Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'> =
      { project: mls.actualProject || 0, level: 4, folder: 'trace', shortName: 'cb-health-report', extension: '.json' };
    const source = `${JSON.stringify({ savedAt: new Date().toISOString(), ...report }, null, 2)}\n`;
    const key = mls.stor.getKeyToFile(info);
    let file = mls.stor.files[key];
    if (!file) file = await createStorFile({ ...info, source }, false, false, false);
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
  } catch (error) {
    console.warn('[cbRepair] saveHealthReport failed', error);
  }
}

// ── staleness forcing (validate-all -> re-materialize routing) ─────────────────

/** Bump the .defs.ts updatedAt so the materialize dispatcher sees the component as stale again. */
export function forceDefsStale(defRef: string): boolean {
  try {
    const p = parseMlsPath(defRef);
    if (!p) return false;
    const key = mls.stor.getKeyToFile({ project: p.project, level: p.level, folder: p.folder, shortName: p.shortName, extension: '.defs.ts' });
    const file = mls.stor.files[key];
    if (!file || file.status === 'deleted') return false;
    file.updatedAt = new Date().toISOString();
    return true;
  } catch {
    return false;
  }
}
