/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Approval.ts" enhancement="_blank"/>

/**
 * Provenance of the accepted plan (contract 27/09: the newRelease writes one `implement` per box
 * when the user accepts the effort). agentDefsL1 runs only with that message, records it here,
 * traces it and then deletes it. agentMaterializeL1 and a later resume read this record instead
 * of asking for a second acceptance. Pure: no store access.
 */

import {
  D1_PLANNER_FLOW,
  inputPaths,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import type { PoolMessage, PoolTraceLine } from '/_102035_/l2/solution/pool.js';

export const D1_APPROVAL_SCHEMA = '2026-09-27-d1-approval-v1' as const;

export interface D1ApprovalInput {
  /** `l4/<module>/<artifact>`. */
  path: string;
  sha256: string;
}

export interface D1ApprovalRecord {
  schemaVersion: typeof D1_APPROVAL_SCHEMA;
  project: number;
  moduleName: string;
  message: {
    /** Pool display path (`l4/<module>/pool/l1/<name>.json`), the trace id `deletePoolMessageAt` demands. */
    file: string;
    from: PoolMessage['from'];
    to: PoolMessage['to'];
    thread: string;
    round: number;
    mode: 'implement';
    artifacts: string[];
  };
  /** Hash of every accepted artifact the message names, taken when the approval was recorded. */
  inputs: D1ApprovalInput[];
  /** Pool trace of this owner. `processed` for `message.file` means the implement was consumed. */
  pool: PoolTraceLine[];
}

export interface D1BoxEntry {
  /** Pool display path. */
  file: string;
  message: PoolMessage | null;
  /** Why the file could not be read as a pool message. */
  error: string;
}

export interface D1ApprovalView {
  project: number;
  moduleName: string;
  command: 'run' | 'resume';
  l1Box: D1BoxEntry[];
  l2Box: D1BoxEntry[];
  /** Parsed `l4/<module>/pool/l1/pipeline.json`, null when absent or unreadable. */
  planner: unknown;
  /** Parsed approval record, null when absent. */
  record: D1ApprovalRecord | null;
  /** `l4/<module>/<artifact>` → sha256 of the current bytes, null when the file is absent. */
  hashes: Record<string, string | null>;
}

export type D1ApprovalDecision =
  | { kind: 'record'; record: D1ApprovalRecord }
  | { kind: 'keep'; record: D1ApprovalRecord }
  | { kind: 'refusal'; refusal: string };

const TAIL = ' Nothing was written.';

/** Plan files agentDefsL1 reads from the pool, module-relative. The accepted message must name all of them. */
export function requiredPlanArtifacts(moduleName: string): string[] {
  const paths = inputPaths(moduleName);
  const prefix = `l4/${moduleName}/`;
  return [paths.menu, paths.needs, paths.backend, paths.effort].map(path => path.slice(prefix.length));
}

export function artifactPath(moduleName: string, artifact: string): string {
  return `l4/${moduleName}/${artifact}`;
}

/** Paths whose hash the decision needs: the artifacts of each implement in pool/l1 and the recorded inputs. */
export function hashPaths(moduleName: string, l1Box: readonly D1BoxEntry[], record: D1ApprovalRecord | null): string[] {
  const out = new Set<string>();
  for (const entry of l1Box) {
    if (entry.message?.mode !== 'implement') continue;
    for (const artifact of entry.message.artifacts) out.add(artifactPath(moduleName, artifact));
  }
  for (const input of record?.inputs || []) out.add(input.path);
  return [...out].sort();
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Structural read of approval.json. Anything else is not a record (null), never a partial one. */
export function parseApprovalRecord(value: unknown, project: number, moduleName: string): D1ApprovalRecord | null {
  const raw = rec(value);
  if (raw.schemaVersion !== D1_APPROVAL_SCHEMA || raw.project !== project || raw.moduleName !== moduleName) return null;
  const message = rec(raw.message);
  if (!text(message.file) || !text(message.thread) || message.mode !== 'implement') return null;
  if (typeof message.round !== 'number' || !Array.isArray(message.artifacts)) return null;
  if (!Array.isArray(raw.inputs) || !Array.isArray(raw.pool)) return null;
  const inputs = raw.inputs.map(rec);
  if (inputs.some(input => !text(input.path) || !text(input.sha256))) return null;
  return value as D1ApprovalRecord;
}

/** The implement named by the record was traced `processed` by this owner. */
export function approvalConsumed(record: D1ApprovalRecord): boolean {
  return record.pool.some(line => line.file === record.message.file && line.outcome === 'processed' && line.mode === 'implement');
}

/** Recorded inputs whose current hash differs (absent counts as different). */
export function changedInputs(record: D1ApprovalRecord, hashes: Record<string, string | null>): string[] {
  return record.inputs.filter(input => hashes[input.path] !== input.sha256).map(input => input.path);
}

function plannerThread(planner: unknown): { thread: string } | { refusal: string } {
  const doc = rec(planner);
  const plan20 = rec(rec(doc.steps).plan20);
  if (text(doc.flowId) !== D1_PLANNER_FLOW || text(plan20.status) !== 'approved' || !text(doc.thread)) {
    return { refusal: 'The L1 planner trace in pool/l1/pipeline.json does not hold an approved plan.' };
  }
  return { thread: text(doc.thread) };
}

/**
 * Lines the planner traced for this thread. The loop plans in `estimate` since 27/09, so an
 * implement whose thread was traced only in `implement` (or not at all) came from the old loop
 * and does not show an accepted estimate.
 */
function plannedByEstimate(planner: unknown, thread: string): boolean {
  const lines = Array.isArray(rec(planner).pool) ? (rec(planner).pool as unknown[]).map(rec) : [];
  const forThread = lines.filter(line => text(line.thread) === thread);
  return forThread.length > 0 && forThread.every(line => line.mode === 'estimate');
}

/**
 * Decides whether agentDefsL1 may run. `record` means write the new approval, `keep` means the
 * approval on disk is still the one in force. Every refusal writes nothing.
 */
export function decideApproval(view: D1ApprovalView): D1ApprovalDecision {
  const unreadable = [...view.l1Box, ...view.l2Box].find(entry => !entry.message);
  if (unreadable) return refusal(`Pool message ${unreadable.file} is not readable: ${unreadable.error}.`);

  const implementsL1 = view.l1Box.filter(entry => entry.message!.mode === 'implement');
  const estimatesL1 = view.l1Box.filter(entry => entry.message!.mode !== 'implement');
  if (estimatesL1.length) return refusal(`pool/l1 holds an estimate message (${estimatesL1[0].file}). The plan is not settled.`);
  if (implementsL1.length > 1) {
    return refusal(`pool/l1 holds ${implementsL1.length} implement messages. One accepted plan is expected.`);
  }

  const plan = plannerThread(view.planner);
  if ('refusal' in plan) return refusal(plan.refusal);

  const pendingL2 = view.l2Box[0];
  if (pendingL2) {
    const message = pendingL2.message!;
    if (message.mode === 'implement' && message.thread === plan.thread) {
      return refusal(`agentDefsL2 has not consumed its implement for thread ${plan.thread} (${pendingL2.file}). agentDefsL1 runs after it.`);
    }
    return refusal(`pool/l2 holds a pending message (${pendingL2.file}). The plan is not settled.`);
  }

  const incoming = implementsL1[0];
  if (incoming) return decideIncoming(view, incoming, plan.thread);

  if (view.command === 'run') {
    return refusal('pool/l1 has no implement message. agentDefsL1 runs only after the effort is accepted.');
  }
  const record = view.record;
  if (!record) return refusal('No implement message and no recorded approval to resume.');
  if (record.message.thread !== plan.thread) {
    return refusal(`The recorded approval is for thread ${record.message.thread}; the current plan is ${plan.thread}. A new plan needs a new acceptance.`);
  }
  if (!approvalConsumed(record)) {
    return refusal(`The implement ${record.message.file} left pool/l1 without being consumed. The approval is withdrawn.`);
  }
  const changed = changedInputs(record, view.hashes);
  if (changed.length) return refusal(`Accepted input ${changed[0]} changed since the approval.`);
  return { kind: 'keep', record };
}

function decideIncoming(view: D1ApprovalView, entry: D1BoxEntry, thread: string): D1ApprovalDecision {
  const { moduleName } = view;
  const message = entry.message!;
  if (message.to !== 'l1') return refusal(`Implement ${entry.file} is addressed to ${message.to}, not l1.`);
  if (message.thread !== thread) {
    return refusal(`Implement ${entry.file} is for thread ${message.thread}; the current plan is ${thread}. The plan was replaced.`);
  }
  if (!plannedByEstimate(view.planner, thread)) {
    return refusal(`Thread ${thread} has no estimate planning trace. An implement from before the estimate loop is not an acceptance.`);
  }
  const missing = requiredPlanArtifacts(moduleName).filter(artifact => !message.artifacts.includes(artifact));
  if (missing.length) return refusal(`Implement ${entry.file} does not name the accepted ${missing[0]}.`);

  const inputs: D1ApprovalInput[] = [];
  for (const artifact of [...message.artifacts].sort()) {
    const path = artifactPath(moduleName, artifact);
    const sha256 = view.hashes[path];
    if (!sha256) return refusal(`Accepted artifact ${path} is missing.`);
    inputs.push({ path, sha256 });
  }

  const current = view.record;
  if (current && current.message.file === entry.file) {
    const changed = changedInputs(current, view.hashes);
    if (changed.length) return refusal(`Accepted input ${changed[0]} changed since the approval.`);
    return { kind: 'keep', record: current };
  }
  return {
    kind: 'record',
    record: {
      schemaVersion: D1_APPROVAL_SCHEMA,
      project: view.project,
      moduleName,
      message: {
        file: entry.file,
        from: message.from,
        to: message.to,
        thread: message.thread,
        round: message.round,
        mode: 'implement',
        artifacts: [...message.artifacts],
      },
      inputs,
      /** Lines of an earlier approval stay: the trace is history, not state. */
      pool: current ? [...current.pool] : [],
    },
  };
}

function refusal(message: string): D1ApprovalDecision {
  return { kind: 'refusal', refusal: `${message}${TAIL}` };
}
