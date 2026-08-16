/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPromptBudget.ts" enhancement="_blank"/>

/**
 * How much of the module fits in ONE model call.
 *
 * Every whole-project step of this agent eventually meets the same wall: the prompt is the module,
 * and the module keeps growing. cb-gen-domain and cb-gen-usecase already fan out; the judge was the
 * last whole-project step of the usecase phase, and with 119 operations (ns4) its pairs prompt grew
 * to megabytes — the intents POST answered 413 and the step hung forever in waiting_human_input,
 * with nothing recorded on the task.
 *
 * Pure: no platform imports, so the packing rules are unit-testable.
 */

/** Hard ceiling for a single prompt. Beyond this the transport rejects the POST. */
export const MAX_PROMPT_BYTES = 200_000;

/** One judge batch: bounded by SIZE first (usecase defs vary a lot) and by count as a sanity cap. */
export const JUDGE_BATCH_MAX_BYTES = 120_000;
export const JUDGE_BATCH_MAX_PAIRS = 15;

export interface CbJudgeQueueEntry { ownerId: string; bytes: number; }
export interface CbJudgeBatchPlan { batch: string[]; pending: string[]; }

/**
 * Greedy packing in queue order: take pairs while they fit. The first entry is ALWAYS taken even
 * when it alone exceeds the budget — a queue that cannot drain is worse than one oversized call, and
 * the prompt guard below still reports it if it is truly out of bounds.
 */
export function planJudgeBatch(
  queue: readonly CbJudgeQueueEntry[],
  maxBytes = JUDGE_BATCH_MAX_BYTES,
  maxPairs = JUDGE_BATCH_MAX_PAIRS,
): CbJudgeBatchPlan {
  const batch: string[] = [];
  let bytes = 0;
  for (const entry of queue) {
    if (batch.length && (batch.length >= maxPairs || bytes + entry.bytes > maxBytes)) break;
    batch.push(entry.ownerId);
    bytes += entry.bytes;
  }
  return { batch, pending: queue.slice(batch.length).map(entry => entry.ownerId) };
}

/**
 * The message for a prompt that cannot be posted, or null when it fits. Reported as a step failure
 * instead of letting the transport answer 413 as an uncaught client error — a size wall must always
 * arrive as a readable error on the task, naming the step that has to batch.
 */
export function promptSizeError(label: string, humanPrompt: string, systemPrompt = ''): string | null {
  const bytes = byteLength(humanPrompt) + byteLength(systemPrompt);
  if (bytes <= MAX_PROMPT_BYTES) return null;
  return `${label}: prompt of ${Math.round(bytes / 1024)}KB exceeds the ${Math.round(MAX_PROMPT_BYTES / 1024)}KB transport limit; this step must batch or fan out its work`;
}

export function byteLength(value: string): number {
  // TextEncoder is available in both runtimes; fall back to the length for an exotic host.
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length;
  }
}
