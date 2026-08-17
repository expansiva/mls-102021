/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCostReport.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure per-phase cost aggregation (no mls.stor / libStor) so it stays unit-testable — same reason
// cbCli/cbScope/cbHealthReport/cbRepairCore were extracted. cbRepair owns the durable I/O (cb-cost.json)
// and each LLM step records into it via recordLlmCost. T7: the run cost per phase (defs/materialize/
// repair/seeds) used to be reconstructed by hand from the task dump; now it accumulates automatically.

export interface CbPhaseCost {
  cost: number;         // USD charged
  calls: number;        // LLM calls in this phase
  inputTokens: number;
  outputTokens: number;
}
export type CbCostReport = Record<string, CbPhaseCost>;

/** Parse the charged cost + token counts from an LLM step's interaction trace. The provider lines carry
 *  `... cost:$0.0199 ...` and `... inputTokens:7954 outputTokens:85 ...`; a step may have several provider
 *  attempts (primary + fallback) — SUM them, since the run is charged for each attempt. */
export function parseStepCost(traceLines: readonly string[]): { cost: number; inputTokens: number; outputTokens: number } {
  let cost = 0, inputTokens = 0, outputTokens = 0;
  for (const line of traceLines) {
    for (const m of String(line).matchAll(/cost:\$(\d+(?:\.\d+)?)/gu)) cost += Number(m[1]);
    for (const m of String(line).matchAll(/inputTokens:(\d+)/gu)) inputTokens += Number(m[1]);
    for (const m of String(line).matchAll(/outputTokens:(\d+)/gu)) outputTokens += Number(m[1]);
  }
  return { cost, inputTokens, outputTokens };
}

/** Add one LLM call's cost to a phase bucket (returns a NEW report; pure). */
export function accumulatePhaseCost(report: CbCostReport, phase: string, delta: { cost: number; inputTokens: number; outputTokens: number }): CbCostReport {
  const prev = report[phase] ?? { cost: 0, calls: 0, inputTokens: 0, outputTokens: 0 };
  return {
    ...report,
    [phase]: {
      cost: prev.cost + (delta.cost || 0),
      calls: prev.calls + 1,
      inputTokens: prev.inputTokens + (delta.inputTokens || 0),
      outputTokens: prev.outputTokens + (delta.outputTokens || 0),
    },
  };
}

/** Roll up the report: total cost/calls and the single most expensive phase. */
export function summarizeCost(report: CbCostReport): { totalCost: number; totalCalls: number; topPhase: string | null; topPhaseCost: number } {
  let totalCost = 0, totalCalls = 0, topPhase: string | null = null, topPhaseCost = 0;
  for (const [phase, c] of Object.entries(report)) {
    totalCost += c.cost;
    totalCalls += c.calls;
    if (c.cost > topPhaseCost) { topPhaseCost = c.cost; topPhase = phase; }
  }
  return { totalCost, totalCalls, topPhase, topPhaseCost };
}

/** One-line human summary for the final task trace (T7 visibility). */
export function formatCostSummary(report: CbCostReport): string {
  const { totalCost, totalCalls, topPhase, topPhaseCost } = summarizeCost(report);
  if (!totalCalls) return '';
  // "$1.20/11" read as a rate to more than one person; the calls are the question being answered
  // (where did the 411 calls of a run go?), so they are spelled out.
  const per = Object.entries(report)
    .sort(([, a], [, b]) => b.calls - a.calls)
    .map(([phase, c]) => `${phase} ${c.calls} call(s) $${c.cost.toFixed(2)}`)
    .join(', ');
  return ` cost $${totalCost.toFixed(2)} in ${totalCalls} call(s) — by phase: ${per}${topPhase ? `; priciest: ${topPhase} $${topPhaseCost.toFixed(2)}` : ''}`;
}
