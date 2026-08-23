/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbHealthReport.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure accumulation of l4/trace/cb-health-report.json. Side-effect-free (no mls.stor / libStor import)
// so it stays unit-testable in the l2 test stub — same reason cbCli/cbScope/cbWorkspace were extracted.
// cbRepair.saveHealthReport owns the I/O and delegates the merge here.

// The task dump nulls the interaction of deterministic steps and the repair state is cleared on success,
// so the health report is the durable record of the run. It used to be OVERWRITTEN on every call, so
// only the last snapshot survived — the per-round repair decisions (which defRefs each g{n} forced
// stale, with which findings) were lost. Now the file keeps the LAST state at the top AND appends every
// snapshot to a bounded `rounds` array.
export const MAX_HEALTH_ROUNDS = 20;

/**
 * Merge a new report snapshot into the existing cb-health-report.json content.
 * - top level = the LAST state (the flattened report), backward-compatible with readers of the old shape;
 * - `rounds` = the accumulated snapshots (oldest first), capped at MAX_HEALTH_ROUNDS.
 * A snapshot never carries its own `rounds` key, so the array does not grow quadratically.
 */
export function buildHealthReportContent(existingRaw: string | null, report: Record<string, unknown>, now: string): string {
  const { rounds: _ignoredRounds, ...reportWithoutRounds } = report;
  const snapshot: Record<string, unknown> = { savedAt: now, ...reportWithoutRounds };
  let priorRounds: unknown[] = [];
  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
      if (Array.isArray(parsed.rounds)) priorRounds = parsed.rounds;
    } catch {
      priorRounds = [];
    }
  }
  const rounds = [...priorRounds, snapshot].slice(-MAX_HEALTH_ROUNDS);
  return `${JSON.stringify({ ...snapshot, rounds }, null, 2)}\n`;
}

/**
 * The last validate-all of a run is often a CLEAN pass (post-seeds, findings 0). It used to write
 * `repairHistory: []` and `globalAttempts: 0` over the top of the file because repair state was
 * cleared after the previous success. The rounds array still held the repair-round snapshots.
 * Fold the longest history and the max attempts so the top-level health a post-mortem reads first
 * matches the steps that actually ran.
 */
export function foldRepairAudit(
  existingRaw: string | null,
  current: { repairHistory?: unknown; globalAttempts?: unknown },
): { repairHistory: string[]; globalAttempts: number } {
  const asHistory = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const asAttempts = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

  let repairHistory = asHistory(current.repairHistory);
  let globalAttempts = asAttempts(current.globalAttempts);
  if (!existingRaw) return { repairHistory, globalAttempts };
  try {
    const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
    const consider = (history: unknown, attempts: unknown): void => {
      const priorHistory = asHistory(history);
      if (priorHistory.length > repairHistory.length) repairHistory = priorHistory;
      globalAttempts = Math.max(globalAttempts, asAttempts(attempts));
    };
    consider(parsed.repairHistory, parsed.globalAttempts);
    if (Array.isArray(parsed.rounds)) {
      for (const round of parsed.rounds) {
        if (!round || typeof round !== 'object' || Array.isArray(round)) continue;
        const rec = round as Record<string, unknown>;
        consider(rec.repairHistory, rec.globalAttempts);
      }
    }
  } catch {
    /* corrupt prior content: keep current */
  }
  return { repairHistory, globalAttempts };
}

/** Keep the highest models.peak seen in any snapshot — be5 closed with registry 104 but the leak is the peak. */
export function foldModelsPeak(
  existingRaw: string | null,
  current: { models?: unknown },
): { registry: number; pendingRelease: number; peak: number } | undefined {
  const asModels = (value: unknown): { registry: number; pendingRelease: number; peak: number } | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const rec = value as Record<string, unknown>;
    const num = (key: string): number => (typeof rec[key] === 'number' && Number.isFinite(rec[key]) ? rec[key] as number : 0);
    if (!('registry' in rec) && !('peak' in rec)) return undefined;
    return { registry: num('registry'), pendingRelease: num('pendingRelease'), peak: num('peak') };
  };
  let models = asModels(current.models);
  if (!existingRaw) return models;
  try {
    const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
    const consider = (value: unknown): void => {
      const prior = asModels(value);
      if (!prior) return;
      if (!models) models = { ...prior };
      else models = {
        registry: models.registry,
        pendingRelease: models.pendingRelease,
        peak: Math.max(models.peak, prior.peak, prior.registry),
      };
    };
    consider(parsed.models);
    if (Array.isArray(parsed.rounds)) {
      for (const round of parsed.rounds) {
        if (!round || typeof round !== 'object' || Array.isArray(round)) continue;
        consider((round as Record<string, unknown>).models);
      }
    }
  } catch {
    /* keep current */
  }
  return models;
}
