/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1RunSummary.ts" enhancement="_blank"/>

// d1_247: what each step of a `/run` wrote and what it kept. A step that finds nothing to do is a success ("wrote 0, kept N"):
// the summary says so by name, and finalize80 prints one line per step at the end of the run. A refusal is not summarised here:
// the step fails with its own reason.

export interface D1StepRun {
  written: string[];
  kept: string[];
  removed: string[];
}

const NAMES_SHOWN = 8;

/** The def name of a path: `_102047_/l1/agents/…/createTool.defs.ts` → `createTool`. */
function defName(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.defs\.ts$/u, '').replace(/\.ts$/u, '');
}

/** `written`, `kept` and `removed` of one commit: what was planned and not written is kept. */
export function stepRunOf(committed: { written: readonly string[]; removed?: readonly string[]; reported?: readonly string[] }): D1StepRun {
  const written = [...committed.written];
  const removed = [...(committed.removed ?? [])];
  const touched = new Set([...written, ...removed].map(defName));
  const kept = (committed.reported ?? []).map(defName).filter(name => !touched.has(name));
  return { written: written.map(defName), kept: [...new Set(kept)], removed: removed.map(defName) };
}

function list(names: readonly string[]): string {
  if (!names.length) return '';
  const shown = names.slice(0, NAMES_SHOWN).join(', ');
  return ` (${shown}${names.length > NAMES_SHOWN ? `, +${names.length - NAMES_SHOWN} more` : ''})`;
}

/** `wrote 2 (a, b), kept 5 (c, …)`, plus `removed N (…)` when a def left. */
export function runText(run: D1StepRun): string {
  const removed = run.removed.length ? `, removed ${run.removed.length}${list(run.removed)}` : '';
  return `wrote ${run.written.length}${list(run.written)}, kept ${run.kept.length}${list(run.kept)}${removed}`;
}

/**
 * One line per step that reported a run, in flow order, for the end of the run. The runs travel in the `<step>-done` results of the task
 * (nothing is written to the stor: a rerun that changes nothing still writes nothing).
 */
export function runSummaryLines(results: readonly string[], order: readonly string[]): string[] {
  const runs = new Map<string, D1StepRun>();
  for (const text of results) {
    try {
      const row = JSON.parse(text) as { completedStep?: unknown; run?: unknown };
      const run = row.run as Partial<D1StepRun> | undefined;
      if (typeof row.completedStep === 'string' && run && Array.isArray(run.written) && Array.isArray(run.kept)) {
        runs.set(row.completedStep, { written: run.written, kept: run.kept, removed: Array.isArray(run.removed) ? run.removed : [] });
      }
    } catch {
      // A result that is not JSON is not a step run.
    }
  }
  return order.filter(step => runs.has(step)).map(step => `${step}: ${runText(runs.get(step)!)}`);
}

/** A commit refusal with the step that made it; empty when there is no issue (the caller falls back to its own reason). */
export function refusedText(step: string, issue: string | undefined): string {
  if (!issue) return '';
  return issue.startsWith(step) ? issue : `${step} refused: ${issue}`;
}

/** The trace of a step that committed its defs: what it wrote and kept, by name. */
export function commitTrace(step: string, run: D1StepRun | undefined): string {
  return `${step}: ${runText(run ?? { written: [], kept: [], removed: [] })}.`;
}
