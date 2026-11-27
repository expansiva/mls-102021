/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Smoke.ts" enhancement="_blank"/>

// d1_333: what the `complete` of a module asks of the smoke, in pure code that both sides use: `smokeCli` (Node, writes `smoke.json`) and finalize80 (the agent, reads it).
// The smoke itself cannot run in the agent (child process, `tsx`, `git`): the command writes its result next to the report of the module, and the report reads it.
// Nothing here imports Node or the compiler.

import { hashParts } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';

export const M12_SMOKE_VERSION = '2026-11-26-smoke-v1' as const;
export const SMOKE_REASON_MIN = 20;

/** The part of a case result the verdict needs. */
export interface SmokeCaseLike {
  pass: string;
  route: string;
  variant?: string | null;
  kind: string;
  verdict: 'ok' | 'refused' | 'error' | 'failed' | 'skipped';
  status?: number | null;
  code?: string | null;
  conforms: string[];
}

export interface SmokeDiffLike {
  kind: 'verdict' | 'code' | 'typed' | 'appeared' | 'disappeared';
  key: string;
  before: string;
  after: string;
  arrival: boolean;
}

export interface SmokeAcceptedEntry {
  case: string;
  before: string;
  after: string;
  /** The commit the module was compared against when the difference was accepted. */
  against: string;
  reason: string;
  by: string;
  at: string;
}

export interface SmokeAcceptedFile {
  schemaVersion: typeof M12_SMOKE_VERSION;
  module: string;
  entries: SmokeAcceptedEntry[];
}

export interface SmokeBlock {
  kind: 'failed' | 'error' | 'typed' | 'difference';
  key: string;
  detail: string;
}

export interface SmokeFile {
  schemaVersion: typeof M12_SMOKE_VERSION;
  module: string;
  createdAt: string;
  /** The commit compared against, or null: no earlier smoke without a block, so only the criteria 1 to 3 applied. */
  against: string | null;
  /** Hash of what the smoke ran on (receipts and contracts of the module): a different one means the module changed after it. */
  inputsHash: string;
  counts: { routes: number; executed: number; ok: number; refused: number; failed: number; error: number; skipped: number; outsideType: number };
  blocks: SmokeBlock[];
  /** Cases not built (an unresolved gateway answer type), listed, never run on `{}`. */
  skipped: string[];
  /** The arrivals (`serve`): report only. */
  arrivals: { cases: number; refused: number; error: number; differences: number };
  /** Differences found, accepted or not. */
  differences: SmokeDiffLike[];
  /** The accepted entries this run used. */
  accepted: SmokeAcceptedEntry[];
  /** Accepted entries that no difference matches any more. */
  stale: SmokeAcceptedEntry[];
}

const caseKey = (item: SmokeCaseLike): string => `${item.pass} ${item.route}${item.variant ? ` [${item.variant}]` : ''}`;

/** The hash of what the smoke of a module ran on: every receipt (`layer/unit` and its outputs) and every contract of the module, in a fixed order. */
export async function smokeInputsHash(receipts: ReadonlyArray<{ key: string; outputs: Record<string, string> }>, contracts: ReadonlyArray<{ name: string; text: string }>): Promise<string> {
  const rows = [...receipts].sort((a, b) => a.key.localeCompare(b.key)).map(item => `${item.key}:${JSON.stringify(Object.entries(item.outputs).sort(([x], [y]) => x.localeCompare(y)))}`);
  const files = [...contracts].sort((a, b) => a.name.localeCompare(b.name)).flatMap(item => [item.name, item.text]);
  return hashParts(['smoke-inputs-v1', ...rows, '--', ...files]);
}

/**
 * The criteria of the manager (26/11): a 5xx or 501, an exception, an output outside the type of the contract and a difference against the compared commit block;
 * a refusal alone does not, and the arrivals only report. A difference is accepted only by an entry that names the same case, the same before and after and the same compared commit.
 */
export function evaluateSmoke(input: {
  results: readonly SmokeCaseLike[];
  differences: readonly SmokeDiffLike[];
  accepted: readonly SmokeAcceptedEntry[];
  against: string | null;
}): { blocks: SmokeBlock[]; used: SmokeAcceptedEntry[]; stale: SmokeAcceptedEntry[]; counts: SmokeFile['counts']; skipped: string[]; arrivals: SmokeFile['arrivals'] } {
  const routes = input.results.filter(item => item.kind !== 'arrival');
  const arrivals = input.results.filter(item => item.kind === 'arrival');
  const blocks: SmokeBlock[] = [];
  for (const item of routes) {
    if (item.verdict === 'failed') blocks.push({ kind: 'failed', key: caseKey(item), detail: `${item.status ?? ''} ${item.code ?? ''}`.trim() || 'a 5xx or 501' });
    else if (item.verdict === 'error') blocks.push({ kind: 'error', key: caseKey(item), detail: item.code ?? 'exception' });
    else if (item.verdict === 'ok' && item.conforms.length > 0) blocks.push({ kind: 'typed', key: caseKey(item), detail: item.conforms.slice(0, 2).join('; ') });
  }
  const used: SmokeAcceptedEntry[] = [];
  for (const difference of input.differences) {
    if (difference.arrival) continue;
    const entry = input.accepted.find(item => item.case === difference.key && item.before === difference.before && item.after === difference.after && item.against === input.against);
    if (entry) used.push(entry);
    else blocks.push({ kind: 'difference', key: difference.key, detail: `${difference.kind}: ${difference.before || '(absent)'} → ${difference.after || '(absent)'}` });
  }
  const stale = input.accepted.filter(entry => !used.includes(entry));
  const count = (verdict: SmokeCaseLike['verdict']): number => routes.filter(item => item.verdict === verdict).length;
  return {
    blocks,
    used,
    stale,
    counts: { routes: new Set(routes.map(item => item.route)).size, executed: routes.length, ok: count('ok'), refused: count('refused'), failed: count('failed'), error: count('error'), skipped: count('skipped'), outsideType: routes.filter(item => item.verdict === 'ok' && item.conforms.length > 0).length },
    skipped: input.results.filter(item => item.verdict === 'skipped').map(caseKey),
    arrivals: { cases: arrivals.length, refused: arrivals.filter(item => item.verdict === 'refused').length, error: arrivals.filter(item => item.verdict === 'error' || item.verdict === 'failed').length, differences: input.differences.filter(item => item.arrival).length },
  };
}

export type M12SmokeCode = 'SMOKE_PENDING' | 'SMOKE_STALE' | 'SMOKE_BLOCKED';
export interface M12SmokeState {
  ok: boolean;
  code: '' | M12SmokeCode;
  detail: string;
  blocks: SmokeBlock[];
}

/** What finalize80 makes of `smoke.json` and the hash of the module now. */
export function smokeState(file: SmokeFile | null, inputsHash: string): M12SmokeState {
  if (!file || file.schemaVersion !== M12_SMOKE_VERSION) return { ok: false, code: 'SMOKE_PENDING', detail: 'There is no smoke result for this module: run `smokeCli <module> <repository> --write`.', blocks: [] };
  if (file.inputsHash !== inputsHash) return { ok: false, code: 'SMOKE_STALE', detail: `The module changed after its smoke (${file.createdAt}): run the smoke again.`, blocks: [] };
  if (file.blocks.length > 0) return { ok: false, code: 'SMOKE_BLOCKED', detail: `${file.blocks.length} case(s) block: ${file.blocks.slice(0, 5).map(item => `${item.key} (${item.kind}: ${item.detail})`).join('; ')}`, blocks: file.blocks };
  return { ok: true, code: '', detail: file.against ? `compared against ${file.against}` : 'no earlier smoke: criteria 1 to 3 only', blocks: [] };
}

/** An accepted difference needs a reason of at least SMOKE_REASON_MIN characters and a name. */
export function acceptedEntryProblems(entry: Pick<SmokeAcceptedEntry, 'reason' | 'by'>): string[] {
  const problems: string[] = [];
  if (entry.reason.trim().length < SMOKE_REASON_MIN) problems.push(`The reason needs at least ${SMOKE_REASON_MIN} characters.`);
  if (!entry.by.trim()) problems.push('Say who accepts it.');
  return problems;
}
