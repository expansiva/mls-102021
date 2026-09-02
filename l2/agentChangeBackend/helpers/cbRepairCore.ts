/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbRepairCore.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure repair helpers — no mls.stor / libStor import, so the merge + prompt logic is unit-testable in
// the l2 test stub (same reason cbCli/cbScope/cbHealthReport were extracted). cbRepair.ts owns the
// persisted state and re-exports these so existing importers keep importing from cbRepair.

/** Max REPAIR attempts per component after the first failure (first try + 2 repairs = 3 LLM calls). */
export const COMPONENT_REPAIR_BUDGET = 2;

/** Previous rejected code is truncated before it goes into the state/prompt. */
export const MAX_LAST_CODE = 6000;

export type CbRepairSource = 'component-validate' | 'validate-all' | 'judge';

export interface CbComponentRepair {
  target: string;          // defRef of the component OR 'usecase-defs:{ownerId}' for the defs phase
  attempts: number;        // failed attempts consumed so far
  findings: string[];      // last findings (fed back into the retry prompt)
  /** Findings from EARLIER attempts that the last output resolved. Fed back so the model does not
   * regress them while fixing the current findings (run 102049-e: attempt 3 fixed the compiler
   * finding but reintroduced the rulesApplied finding of attempt 1 — whack-a-mole until budget). */
  priorFindings?: string[];
  lastCode?: string;       // previous rejected code (truncated) so the model fixes, not regenerates blindly
  source: CbRepairSource;
  updatedAt: string;
}

function truncateLastCode(code: string): string {
  return code.length > MAX_LAST_CODE ? `${code.slice(0, MAX_LAST_CODE)}\n// ... (truncated)` : code;
}

/**
 * Merge a component's repair entry across attempts/rounds. Carries forward:
 * - `priorFindings` = findings an earlier attempt already RESOLVED (present before, absent now) — fed
 *   back so the model does not regress them (anti whack-a-mole);
 * - `lastCode` = the last rejected code (or a freshly supplied one) — so the model FIXES it instead of
 *   re-rolling from scratch.
 * The `attempts` value is the caller's policy: recordComponentFailure increments it; the validate-all
 * GLOBAL round resets it to 0 (the round grants a fresh worker budget — the global budget is the
 * anti-loop). This is what lets a g2 round remember what g1 already fixed instead of repeating it.
 */
export function mergeComponentRepair(
  prev: CbComponentRepair | undefined,
  target: string,
  findings: string[],
  opts: { attempts: number; source: CbRepairSource; lastCode?: string },
): CbComponentRepair {
  const current = findings.slice(0, 20);
  const priorFindings = [...new Set([...(prev?.priorFindings ?? []), ...(prev?.findings ?? [])])]
    .filter(f => !current.includes(f))
    .slice(0, 10);
  const lastCode = opts.lastCode ?? prev?.lastCode;
  return {
    target,
    attempts: opts.attempts,
    findings: current,
    ...(priorFindings.length ? { priorFindings } : {}),
    ...(lastCode ? { lastCode: truncateLastCode(lastCode) } : {}),
    source: opts.source,
    updatedAt: new Date().toISOString(),
  };
}

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
  if (entry.priorFindings?.length) {
    lines.push(
      '',
      '### Fixed in earlier attempts — MUST STAY fixed (do NOT reintroduce)',
      ...entry.priorFindings.map(f => `- ${f}`),
    );
  }
  if (entry.lastCode) {
    lines.push('', '### Previous rejected output (fix it — do not repeat these mistakes)', '```ts', entry.lastCode, '```');
  }
  return lines.join('\n');
}

// ── in-memory re-spawn ceilings (RUN state, not domain data) ───────────────────
//
// A module-level Map is banned in generated adapters because it would store business rows.
// These counters are the opposite case: they MUST survive when mls.stor does not round-trip
// (CLI host: readRepairState returns empty after saveRepairState). Without them the stale
// dispatcher re-spawns forever because componentRepairs.attempts resets to 1 every cycle.
//
// Two counters, one Map, reset per run:
//   repairSpawns — incremented inside forceRegenerate (the explicit "delete .ts to regenerate"
//                  decision). Ceiling = COMPONENT_REPAIR_BUDGET + 1.
//   dispatches   — every schedule attempt in the materialize dispatcher. Backstop
//                  (CB_DISPATCH_HARD_CEILING) so a host pathology that reports .ts as absent
//                  forever still terminates.

export type CbCeilingKind = 'repair' | 'hard';

export interface CbRespawnCount {
  defRef: string;
  repairSpawns: number;
  dispatches: number;
}

export interface CbSpawnDecision {
  scheduled: boolean;
  repairSpawns: number;
  repairCeiling: number;
  dispatches: number;
  dispatchCeiling: number;
  blockedBy?: CbCeilingKind;
}

/** Hard backstop on total dispatches per component this run. Folgado vs ~4 layers of
 *  legitimate transitive staleness; tight enough to contain a host-absent loop. */
export const CB_DISPATCH_HARD_CEILING = 10;

const respawnByDefRef = new Map<string, CbRespawnCount>();

export function resetRespawnCounts(): void {
  respawnByDefRef.clear();
}

export function staleSpawnCeiling(): number {
  return COMPONENT_REPAIR_BUDGET + 1;
}

export function dispatchHardCeiling(): number {
  return CB_DISPATCH_HARD_CEILING;
}

function emptyCount(defRef: string): CbRespawnCount {
  return { defRef, repairSpawns: 0, dispatches: 0 };
}

/** Count a dispatcher schedule attempt. Only the hard dispatch ceiling applies here;
 *  the repair ceiling lives in `noteRepairAttempt` / `forceRegenerate`. Refusing leaves
 *  the counts unchanged and sets `blockedBy`. */
export function noteStaleSpawn(defRef: string): CbSpawnDecision {
  const repairCeiling = staleSpawnCeiling();
  const dispatchCeiling = CB_DISPATCH_HARD_CEILING;
  const current = respawnByDefRef.get(defRef) ?? emptyCount(defRef);
  if (current.dispatches >= dispatchCeiling) {
    return {
      scheduled: false,
      repairSpawns: current.repairSpawns,
      repairCeiling,
      dispatches: current.dispatches,
      dispatchCeiling,
      blockedBy: 'hard',
    };
  }
  const dispatches = current.dispatches + 1;
  respawnByDefRef.set(defRef, { defRef, repairSpawns: current.repairSpawns, dispatches });
  return { scheduled: true, repairSpawns: current.repairSpawns, repairCeiling, dispatches, dispatchCeiling };
}

/** Count an explicit regenerate (delete the output .ts). Ceiling is COMPONENT_REPAIR_BUDGET + 1;
 *  refusing leaves the counts unchanged and sets `blockedBy: 'repair'`. */
export function noteRepairAttempt(defRef: string): CbSpawnDecision {
  const repairCeiling = staleSpawnCeiling();
  const dispatchCeiling = CB_DISPATCH_HARD_CEILING;
  const current = respawnByDefRef.get(defRef) ?? emptyCount(defRef);
  if (current.repairSpawns >= repairCeiling) {
    return {
      scheduled: false,
      repairSpawns: current.repairSpawns,
      repairCeiling,
      dispatches: current.dispatches,
      dispatchCeiling,
      blockedBy: 'repair',
    };
  }
  const repairSpawns = current.repairSpawns + 1;
  respawnByDefRef.set(defRef, { defRef, repairSpawns, dispatches: current.dispatches });
  return { scheduled: true, repairSpawns, repairCeiling, dispatches: current.dispatches, dispatchCeiling };
}
