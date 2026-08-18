/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/judge/judgeShared.ts" enhancement="_blank"/>

// What the judge dispatcher, its batch workers and the collector all need: the scope of a run, the
// slice each worker judges, the reduced L4 contract it compares against, and the deterministic
// pre-findings. Shared inside the step folder (the fan-out's dispatcher and worker are separate
// files by design — skills/agentsBestPractices.md §2/§4) so no role is inferred from a prompt field.

import {
  isRecord, readString, readStringArray, lowerFirst, type CbScan, type CbOwner,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { missingPrincipalPortIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';
import { parseDefs } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import { type CbJudgeFinding } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { byteLength, planJudgeBatch } from '/_102021_/l2/agentChangeBackend/helpers/cbPromptBudget.js';
import { cbTraceFolder } from '/_102021_/l2/agentChangeBackend/helpers/cbTraceScope.js';

/** Step args of every judge step of a run: which pass it is, its scope and (for a worker) its slice. */
export interface CbJudgeArgs {
  judgeRun: number;
  owners: string[];
  queue: string[] | null;
  batchIndex: number;
  /** Which RUN of the task these findings belong to (see judgeFindingsFileInfo). */
  runId: string;
}

export function judgeArgsOf(step: mls.msg.AIAgentStep): CbJudgeArgs {
  try {
    const p = JSON.parse(String(step.prompt || '{}'));
    const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((o: unknown): o is string => typeof o === 'string' && !!o) : [];
    return {
      judgeRun: p && typeof p.judgeRun === 'number' && p.judgeRun > 0 ? p.judgeRun : 1,
      owners: p ? ids(p.owners) : [],
      queue: p && Array.isArray(p.queue) ? ids(p.queue) : null,
      batchIndex: p && typeof p.batchIndex === 'number' && p.batchIndex > 0 ? p.batchIndex : 1,
      runId: p && typeof p.runId === 'string' ? p.runId : '',
    };
  } catch {
    return { judgeRun: 1, owners: [], queue: null, batchIndex: 1, runId: '' };
  }
}

/** Read the saved usecase defs data for the given operation owners (null when missing). */
export async function readUsecaseDefsByOwner(scan: CbScan, operations: CbOwner[]): Promise<Map<string, Record<string, unknown> | null>> {
  const project = scan.project;
  const byShortName = new Map<string, Record<string, unknown>>();
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/layer_2_application/usecases')) continue;
    const parsed = parseDefs(String(await file.getContent()));
    if (isRecord(parsed.data)) byShortName.set(String(file.shortName || '').toLowerCase(), parsed.data as Record<string, unknown>);
  }
  const out = new Map<string, Record<string, unknown> | null>();
  for (const owner of operations) {
    out.set(owner.id, byShortName.get(lowerFirst(owner.id).toLowerCase()) ?? null);
  }
  return out;
}

/** The operation owners in scope for this judge run (all on run 1; only the repaired subset after). */
export function scopedOperations(scan: CbScan, step: mls.msg.AIAgentStep): { judgeRun: number; operations: CbOwner[] } {
  const { judgeRun, owners } = judgeArgsOf(step);
  let operations = scan.owners.filter(o => o.kind === 'operation');
  if (judgeRun > 1 && owners.length) operations = operations.filter(o => owners.includes(o.id));
  return { judgeRun, operations };
}

/**
 * The slice of the module THIS step judges, and what is left for the next one.
 *
 * 119 pairs of (L4 contract + generated usecase defs) pretty-printed is megabytes: the intents POST
 * answered 413 and the step hung forever. The batch is planned from the real byte size of each pair,
 * and both hooks plan it the same way from the same step args — nothing extra has to be threaded
 * through, and the after-hook always knows exactly which owners the model just saw.
 */
export function planJudgeSlice(
  step: mls.msg.AIAgentStep,
  operations: CbOwner[],
  defsByOwner: Map<string, Record<string, unknown> | null>,
): { pairsByOwner: Map<string, unknown>; batch: CbOwner[]; pending: string[]; batchIndex: number; totalQueued: number } {
  const { queue, batchIndex } = judgeArgsOf(step);
  const byId = new Map(operations.map(owner => [owner.id, owner]));
  // A continuation step carries its own queue; the first step of a run judges everything in scope.
  const queued = (queue ?? operations.map(owner => owner.id)).filter(id => byId.has(id));
  const pairsByOwner = new Map<string, unknown>();
  const entries = queued.map(id => {
    const pair = { l4Contract: ownerContract(byId.get(id)!), generatedUsecaseDefs: defsByOwner.get(id) ?? null };
    pairsByOwner.set(id, pair);
    return { ownerId: id, bytes: byteLength(JSON.stringify(pair, null, 2)) };
  });
  const plan = planJudgeBatch(entries);
  return {
    pairsByOwner,
    batch: plan.batch.map(id => byId.get(id)!),
    pending: plan.pending,
    batchIndex,
    totalQueued: queued.length,
  };
}

/** Deterministic pre-findings: an operation owner whose usecase .defs.ts is missing entirely, plus
 *  (T12) one whose defs omit the principal aggregate's local port — a DERIVATION gap that would
 *  otherwise only surface as broken TypeScript after 2-3 expensive materialization repairs. */
export function missingDefsFindings(
  defsByOwner: Map<string, Record<string, unknown> | null>,
  scan: CbScan,
  operations: CbOwner[],
): CbJudgeFinding[] {
  const findings: CbJudgeFinding[] = [];
  const localPortIds = new Set<string>([
    ...scan.aggregates.map(a => a.rootEntity),
    ...scan.events.filter(ev => ev.persisted).map(ev => ev.entityId),
  ]);
  const mdmIds = new Set(scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId));
  const byId = new Map(operations.map(o => [o.id, o]));
  for (const [ownerId, defs] of defsByOwner) {
    if (defs === null) {
      findings.push({ ownerId, type: 'estrutural', severity: 'error', message: `usecase .defs.ts missing for operation ${ownerId} (worker failed or never saved)` });
      continue;
    }
    const owner = byId.get(ownerId);
    if (!owner) continue;
    for (const message of missingPrincipalPortIssues(owner, readStringArray(defs.ports), localPortIds, mdmIds)) {
      findings.push({ ownerId, type: 'estrutural', severity: 'error', message });
    }
  }
  return findings;
}

/** The reduced L4 contract the judge compares against (authoritative side). */
export function ownerContract(o: CbOwner) {
  return {
    ownerId: o.id,
    opKind: o.opKind,
    entity: o.entity,
    actors: o.actors,          // l4 v2 plural (fallback single `actor`); the usecase is authorized for these
    reads: o.reads,
    writes: o.writes,
    rulesApplied: o.rulesApplied,
    accessPattern: o.accessPattern ?? null,
    inputs: o.inputs,          // inputs carry explicit `type` OR `fieldRef` (N1b) — no re-inference
    contextResolution: o.contextResolution,
    acceptanceAssertions: o.acceptanceAssertions,
  };
}


/**
 * Where a worker leaves what it found, so the collector can union the batches. The disk is truth: the
 * runtime discards a fan-out child's return value.
 *
 * The RUN is part of the name. The findings of a previous execution stay in `l4/trace` (they are the
 * audit of that run), and a new judge run 1 would otherwise read them as its own and route usecases to
 * repair over findings nobody made this time.
 */
export function judgeFindingsFileInfo(runId: string, judgeRun: number, batchIndex: number): Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'> {
  return { project: mls.actualProject || 0, level: 4, folder: cbTraceFolder(), shortName: `${judgeFindingsPrefix(runId, judgeRun)}b${batchIndex}`, extension: '.json' };
}

/** The shortName prefix every batch file of one (run, judge pass) shares. */
export function judgeFindingsPrefix(runId: string, judgeRun: number): string {
  const run = runId ? `-${runId.replace(/[^A-Za-z0-9]/gu, '')}` : '';
  return `cb-judge-findings${run}-r${judgeRun}-`;
}

export interface CbJudgeBatchFindings {
  runId: string;
  judgeRun: number;
  batchIndex: number;
  owners: string[];
  findings: CbJudgeFinding[];
  savedAt: string;
}
