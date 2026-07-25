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
