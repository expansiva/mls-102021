/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/callLog.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fingerprintProject } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';

/**
 * Receipts of what usecases50 already observes. One file per observation so
 * parallel workers do not share a counter. A missing folder is not zero.
 */
export const D1_CALL_LOG_VERSION = '2026-09-24-d1-calls-v1' as const;

export const CALL_ABSENT = 'usecases50 call log is absent';
export const CALL_HISTORY_ABSENT = 'generation call history is absent';
export const CALL_UNREADABLE = 'usecases50 call log has an unreadable event';
export const CALL_NO_INVOCATION = 'usecases50 call log has no invocation';

export type D1CallEventKind =
  | 'prompt_assembled'
  | 'reply_delivered'
  | 'reply_absent'
  | 'not_dispatched'
  | 'repair_scheduled';

const EVENT_SLUG: Record<D1CallEventKind, string> = {
  prompt_assembled: 'prompt',
  reply_delivered: 'reply',
  reply_absent: 'absent',
  not_dispatched: 'blocked',
  repair_scheduled: 'repair',
};

export interface D1CallEvent {
  schemaVersion: typeof D1_CALL_LOG_VERSION;
  kind: D1CallEventKind;
  usecaseId: string;
  planId: string;
  /** Index on the worker arg. Not a call count. */
  unitAttempts: number;
  invocation: number;
}

export interface D1CallInvocation {
  schemaVersion: typeof D1_CALL_LOG_VERSION;
  kind: 'dispatch' | 'resume';
  index: number;
  /** True only when this resume found no generation observations. */
  historyAbsent: boolean;
}

export interface D1CallLog {
  invocations: D1CallInvocation[];
  events: D1CallEvent[];
  unreadable: boolean;
}

/** Counts proved by the log. Null is unmeasured. Zero is a measured receipt count. */
export interface D1CallAccount {
  /** Host delivered a reply payload. Not units, attempts, prompts, or cost. */
  repliesDelivered: number | null;
  repliesUnknown: string;
  /** Prompts handed to the host. Not completed calls. */
  promptsAssembled: number | null;
  /** Repair steps the barrier opened. Not calls. */
  repairsScheduled: number | null;
  /** Reply payloads of the latest invocation. A resume without a call is 0. */
  invocationReplies: number | null;
  invocationUnknown: string;
  /** finalize80 does not call a model. Local step, not the generation. */
  finalizeCalledModel: false;
  /** finalize80 does not open a repair. Local step, not the generation. */
  finalizeOpenedRepair: false;
}

export function callsFolder(moduleName: string): string {
  return `${moduleName}/pipeline/agentDefsL1/calls`;
}

export function accountCalls(log: D1CallLog | null): D1CallAccount {
  const local = { finalizeCalledModel: false as const, finalizeOpenedRepair: false as const };
  if (!log) return unknown(local, CALL_ABSENT);
  if (log.unreadable) return unknown(local, CALL_UNREADABLE);
  const latest = latestInvocation(log.invocations);
  if (!latest) return unknown(local, CALL_NO_INVOCATION);
  if (latest.kind === 'resume' && latest.historyAbsent && log.events.length === 0) {
    return {
      ...local,
      repliesDelivered: null,
      repliesUnknown: CALL_HISTORY_ABSENT,
      promptsAssembled: null,
      repairsScheduled: null,
      invocationReplies: 0,
      invocationUnknown: '',
    };
  }
  const replies = log.events.filter(event => event.kind === 'reply_delivered');
  return {
    ...local,
    repliesDelivered: replies.length,
    repliesUnknown: '',
    promptsAssembled: log.events.filter(event => event.kind === 'prompt_assembled').length,
    repairsScheduled: log.events.filter(event => event.kind === 'repair_scheduled').length,
    invocationReplies: replies.filter(event => event.invocation === latest.index).length,
    invocationUnknown: '',
  };
}

export async function readCallLog(project: number, moduleName: string): Promise<D1CallLog | null> {
  const folder = callsFolder(moduleName);
  const fingerprint = await fingerprintProject(project);
  const names = fingerprint
    .filter(entry => entry.level === 1 && entry.folder === folder && entry.extension === '.json')
    .map(entry => entry.shortName)
    .sort();
  if (!names.length) return null;
  const invocations: D1CallInvocation[] = [];
  const events: D1CallEvent[] = [];
  let unreadable = false;
  for (const shortName of names) {
    const parsed = await readJson(project, moduleName, shortName);
    const invocation = parseInvocation(parsed);
    if (invocation) {
      if (shortName !== `i${invocation.index}-${invocation.kind}`) unreadable = true;
      invocations.push(invocation);
      continue;
    }
    const event = parseEvent(parsed);
    if (!event) {
      unreadable = true;
      continue;
    }
    const slug = EVENT_SLUG[event.kind];
    if (shortName !== `i${event.invocation}-${slug}-${event.planId}`) unreadable = true;
    events.push(event);
  }
  if (new Set(invocations.map(item => item.index)).size !== invocations.length) unreadable = true;
  const known = new Set(invocations.map(item => item.index));
  if (events.some(event => !known.has(event.invocation))) unreadable = true;
  return { invocations, events: dedupeEvents(events), unreadable };
}

/** A new dispatch. Workers record against this index afterwards. */
export async function openCallDispatch(project: number, moduleName: string): Promise<number> {
  const log = await readCallLog(project, moduleName);
  const index = nextIndex(log);
  await writeJson(callFile(project, moduleName, `i${index}-dispatch`), invocationBody('dispatch', index, false));
  return index;
}

/**
 * This invocation added no call. Observations already on disk stay.
 * No observations means the generation total stays unknown.
 */
export async function openCallResume(project: number, moduleName: string): Promise<void> {
  const log = await readCallLog(project, moduleName);
  if (log?.unreadable) return;
  const index = nextIndex(log);
  const historyAbsent = !log || log.events.length === 0;
  await writeJson(callFile(project, moduleName, `i${index}-resume`), invocationBody('resume', index, historyAbsent));
}

/** First file for this plan and kind wins. A second delivery does not add a row. */
export async function recordCallEvent(
  project: number,
  moduleName: string,
  event: { kind: D1CallEventKind; usecaseId: string; planId: string; unitAttempts: number },
): Promise<void> {
  const log = await readCallLog(project, moduleName);
  if (!log || log.unreadable) return;
  const latest = latestInvocation(log.invocations);
  if (!latest || latest.kind !== 'dispatch') return;
  if (!event.planId || !event.usecaseId) return;
  const shortName = `i${latest.index}-${EVENT_SLUG[event.kind]}-${event.planId}`;
  const info = callFile(project, moduleName, shortName);
  if (await readText(info)) return;
  const body: D1CallEvent = {
    schemaVersion: D1_CALL_LOG_VERSION,
    kind: event.kind,
    usecaseId: event.usecaseId,
    planId: event.planId,
    unitAttempts: event.unitAttempts,
    invocation: latest.index,
  };
  await writeJson(info, body);
}

function unknown(
  local: { finalizeCalledModel: false; finalizeOpenedRepair: false },
  reason: string,
): D1CallAccount {
  return {
    ...local,
    repliesDelivered: null,
    repliesUnknown: reason,
    promptsAssembled: null,
    repairsScheduled: null,
    invocationReplies: null,
    invocationUnknown: reason,
  };
}

function latestInvocation(invocations: readonly D1CallInvocation[]): D1CallInvocation | null {
  return [...invocations].sort((left, right) => left.index - right.index).at(-1) || null;
}

function nextIndex(log: D1CallLog | null): number {
  const latest = log ? latestInvocation(log.invocations) : null;
  return latest ? latest.index + 1 : 1;
}

function invocationBody(kind: 'dispatch' | 'resume', index: number, historyAbsent: boolean): D1CallInvocation {
  return { schemaVersion: D1_CALL_LOG_VERSION, kind, index, historyAbsent };
}

function dedupeEvents(events: readonly D1CallEvent[]): D1CallEvent[] {
  const seen = new Set<string>();
  const out: D1CallEvent[] = [];
  for (const event of events) {
    const id = `${event.invocation}\u0000${event.kind}\u0000${event.planId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(event);
  }
  return out;
}

function callFile(project: number, moduleName: string, shortName: string): D1FileInfo {
  return { project, level: 1, folder: callsFolder(moduleName), shortName, extension: '.json' };
}

async function readJson(project: number, moduleName: string, shortName: string): Promise<unknown> {
  const text = await readText(callFile(project, moduleName, shortName));
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function parseInvocation(value: unknown): D1CallInvocation | null {
  if (!isRecord(value) || value.schemaVersion !== D1_CALL_LOG_VERSION) return null;
  if (value.kind !== 'dispatch' && value.kind !== 'resume') return null;
  if (!positive(value.index) || typeof value.historyAbsent !== 'boolean') return null;
  return {
    schemaVersion: D1_CALL_LOG_VERSION,
    kind: value.kind,
    index: value.index,
    historyAbsent: value.historyAbsent,
  };
}

function parseEvent(value: unknown): D1CallEvent | null {
  if (!isRecord(value) || value.schemaVersion !== D1_CALL_LOG_VERSION) return null;
  if (!isEventKind(value.kind)) return null;
  if (typeof value.usecaseId !== 'string' || !value.usecaseId) return null;
  if (typeof value.planId !== 'string' || !value.planId) return null;
  if (!nonNegative(value.unitAttempts) || !positive(value.invocation)) return null;
  return {
    schemaVersion: D1_CALL_LOG_VERSION,
    kind: value.kind,
    usecaseId: value.usecaseId,
    planId: value.planId,
    unitAttempts: value.unitAttempts,
    invocation: value.invocation,
  };
}

function isEventKind(value: unknown): value is D1CallEventKind {
  return value === 'prompt_assembled'
    || value === 'reply_delivered'
    || value === 'reply_absent'
    || value === 'not_dispatched'
    || value === 'repair_scheduled';
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function nonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
