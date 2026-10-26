/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Io.ts" enhancement="_blank"/>

// Disk is the truth of a run: every unit writes its own status file (one owner per file), finalize80 reads them.
// Reads go through the Studio stor; writes persist on the collabmsg path (see writeText). No node, fs or typescript import.

import { createStorFile } from '/_102027_/l2/libStor.js';
import type { M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { fileRef, infoOfRef, unitDraftFile, unitStatusFile, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

export const M12_UNIT_STATUS_VERSION = '2026-10-05-m12-unit-v1' as const;

/**
 * - done: written and every check passed (the briefing's `generated`); code COMPILE_UNAVAILABLE_L1 = no compiler proved it.
 * - reused: same inputs, untouched output from an earlier done.
 * - blocked: a named gap or a dependency that is not ready; a file may be on disk (see diagnostic).
 * - gap: a declared platform gap (no runtime mechanism); nothing is written and the app still boots.
 * - failed: the unit could not be produced or did not compile.
 * - skipped: an output this agent did not write is protected (use "force": true).
 */
export type M12UnitState = 'done' | 'reused' | 'blocked' | 'gap' | 'failed' | 'skipped';

export interface M12UnitStatus {
  schemaVersion: typeof M12_UNIT_STATUS_VERSION;
  layer: M12Layer;
  unitId: string;
  /** The def the unit materializes; '' for a test unit (keyed by page). */
  defRef: string;
  status: M12UnitState;
  /** Machine code of the outcome, e.g. COMPILE_FAILED, RULE_NOT_EMITTED, NEEDS_LLM. '' on done/reused. */
  code: string;
  attempt: number;
  diagnostic: string;
  /** Hash of every input the unit was generated from; equal hash + equal output bytes = reusable. */
  inputHash: string;
  /** fileRef -> sha256 of the bytes this agent wrote. A mismatch on disk means a local edit. */
  outputs: Record<string, string>;
  updatedAt: string;
}

/** Units whose state lets a dependent unit go on. */
export function stateReady(status: M12UnitStatus | null): boolean {
  return !!status && (status.status === 'done' || status.status === 'reused');
}

/**
 * An l1 file generated and checked by every gate except the Studio compiler, which cannot compile l1 from an
 * agent: the unit is `done` with this code, and the report lists it apart as not proven by a compiler.
 */
export const COMPILE_UNAVAILABLE_L1 = 'COMPILE_UNAVAILABLE_L1' as const;

/** A generated unit no compiler proved (COMPILE_UNAVAILABLE_L1). */
export function unproven(status: M12UnitStatus | null): boolean {
  return stateReady(status) && status!.code === COMPILE_UNAVAILABLE_L1;
}

interface StorFile {
  status?: string;
  updatedAt?: string;
  getContent?: () => Promise<unknown>;
  getValueInfo?: () => Promise<{ content?: unknown }>;
}

function storFiles(): Record<string, StorFile> {
  return ((mls.stor as unknown as { files?: Record<string, StorFile> }).files) || {};
}

function lookup(info: M12FileInfo): StorFile | null {
  const file = storFiles()[mls.stor.getKeyToFile(info as mls.stor.IFileInfo)];
  return file && file.status !== 'deleted' ? file : null;
}

export function storExists(info: M12FileInfo): boolean {
  try { return lookup(info) !== null; } catch { return false; }
}

/**
 * The file text, or null when the file is absent or unreadable. Never throws.
 * `getContent()` first: after `localStor.setContent` on an existing file, `getValueInfo()` keeps returning the
 * previous bytes while `getContent()` returns the new ones (measured by agenteMaterializeL22, 01/10/2026).
 */
export async function readOptional(info: M12FileInfo): Promise<string | null> {
  try {
    // This session's bytes first, while the file is still in the stor index (writeText registers it there);
    // a file the Studio dropped since (discarded, deleted) is no longer ours to serve.
    const key = keyOf(info);
    const written = memory.get(key);
    if (written !== undefined) {
      if (lookup(info)) return written;
      memory.delete(key);
    }
  } catch { /* no stor key: fall through */ }
  let file: StorFile | null;
  try { file = lookup(info); } catch { return null; }
  if (!file) return null;
  try {
    const content = await file.getContent?.();
    if (typeof content === 'string') return content;
    if (content && typeof content === 'object') return `${JSON.stringify(content)}\n`;
  } catch { /* fall through */ }
  try {
    const value = await file.getValueInfo?.();
    if (typeof value?.content === 'string') return value.content;
  } catch { /* unreadable */ }
  return null;
}

export async function readJsonOptional<T>(info: M12FileInfo): Promise<T | null> {
  const text = await readOptional(info);
  if (!text || !text.trim()) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

/** Projects whose stor index this run already asked for (a platform project, e.g. 102034). */
const loadedProjects = new Map<number, Promise<string>>();

async function loadProject(project: number): Promise<string> {
  const server = (mls.stor as unknown as { server?: { loadProjectInfoIfNeeded?: (project: number) => Promise<unknown> } }).server;
  if (typeof server?.loadProjectInfoIfNeeded !== 'function') return `the stor cannot load project ${project}.`;
  try {
    await server.loadProjectInfoIfNeeded(project);
    return '';
  } catch (error) {
    return `loading project ${project} failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * The reader the emitters get: any ref form `infoOfRef` accepts. Another project's file loads that project's
 * stor index once; a failure is warned with its cause and read as absent (the emitter then names what is missing).
 */
export function createReader(project: number): (ref: string) => Promise<string | null> {
  return async (ref: string) => {
    const info = infoOfRef(ref, project);
    if (!info) return null;
    if (info.project !== project) {
      let loading = loadedProjects.get(info.project);
      if (!loading) {
        loading = loadProject(info.project);
        loadedProjects.set(info.project, loading);
      }
      const failure = await loading;
      if (failure) {
        console.warn(`agentMaterializeL1: cannot read ${ref}; ${failure}`);
        return null;
      }
    }
    return readOptional(info);
  };
}

export async function sha256Text(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function hashParts(parts: readonly string[]): Promise<string> {
  return sha256Text(parts.map(part => `${part.length}:${part}`).join('\n'));
}

/**
 * The bytes this agent wrote in this browser session, by stor key. The collabmsg persists the same bytes
 * (`createStorFile` / `localStor.setContent`); this map is what later phases and the compiler read.
 */
// One map for the whole page: every phase agent, whatever module instance the Studio loaded it from, reads the
// bytes the earlier phases wrote. A module-level map was not shared, so a later phase read every status as absent
// and blocked every unit (BLOCKED_BY ... not materialized), 05/10/2026.
const memory: Map<string, string> = (() => {
  const holder = globalThis as unknown as { __agentMaterializeL1Memory?: Map<string, string> };
  if (!holder.__agentMaterializeL1Memory) holder.__agentMaterializeL1Memory = new Map<string, string>();
  return holder.__agentMaterializeL1Memory;
})();

/**
 * Stor keys `writeText` created in this session. The collabmsg host sets `status` to `changed` on a
 * successful write, so `status === 'new'` is gone before `removeStorFile` runs (the l5 lock stayed on disk).
 * The set, not the status, says which file this session may drop.
 */
const created: Set<string> = (() => {
  const holder = globalThis as unknown as { __agentMaterializeL1Created?: Set<string> };
  if (!holder.__agentMaterializeL1Created) holder.__agentMaterializeL1Created = new Set<string>();
  return holder.__agentMaterializeL1Created;
})();

function keyOf(info: M12FileInfo): string {
  return mls.stor.getKeyToFile(info as mls.stor.IFileInfo);
}

/**
 * Persists like `agentDefsL1` `writeText`: a missing or `deleted` file is created with
 * `createStorFile(..., false, false, false)` (no editor model — an l1 model sent to the Studio
 * TypeScript worker never settles, 05/10/2026). Any other file is `localStor.setContent`.
 * The session map keeps the bytes a later phase reads. Returns the hash of those bytes.
 */
export async function writeText(info: M12FileInfo, text: string): Promise<string> {
  if (info.shortName.includes('.') && info.shortName !== 'runtime.project') throw new Error(`M12_SHORTNAME_DOT: ${fileRef(info)}`);
  const key = keyOf(info);
  const index = mls.stor.files as Record<string, mls.stor.IFileInfo>;
  const file = index[key];
  memory.set(key, text);
  if (!file || file.status === 'deleted') {
    created.add(key);
    await createStorFile({ ...info, source: text, status: 'new' }, false, false, false);
    // createStorFile writes the object addOrUpdateFile returned. When that is not the index entry, put the bytes there too.
    const stored = index[key];
    if (stored && await stored.getContent() !== text) {
      await mls.stor.localStor.setContent(stored, { contentType: 'string', content: text });
    }
  } else {
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: text });
  }
  return sha256Text(text);
}

/** Writes a generated source and returns the exact bytes it holds (what a compiler would see). */
export async function writeSource(info: M12FileInfo, text: string): Promise<{ hash: string; text: string }> {
  const hash = await writeText(info, text);
  return { hash, text };
}

/**
 * Drops a file this agent created in this session (a broken output, the l5 lock): content cleared, out of the
 * index. Membership is the session set `writeText` filled, not `status === 'new'` — the host marks a fresh
 * write `changed`. A file that already existed is never removed here: its previous bytes are written back instead.
 */
export async function removeStorFile(info: M12FileInfo): Promise<void> {
  const key = keyOf(info);
  const index = mls.stor.files as Record<string, mls.stor.IFileInfo>;
  const stored = index[key];
  memory.delete(key);
  if (!created.has(key)) return;
  created.delete(key);
  if (!stored) return;
  await mls.stor.localStor.setContent(stored, { contentType: 'string', content: null });
  delete index[key];
}

export async function writeJson(info: M12FileInfo, value: unknown): Promise<void> {
  await writeText(info, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readUnitStatus(project: number, moduleName: string, layer: M12Layer, unitId: string): Promise<M12UnitStatus | null> {
  const status = await readJsonOptional<M12UnitStatus>(unitStatusFile(project, moduleName, layer, unitId));
  return status && status.schemaVersion === M12_UNIT_STATUS_VERSION ? status : null;
}

export async function writeUnitStatus(project: number, moduleName: string, status: Omit<M12UnitStatus, 'schemaVersion' | 'updatedAt'>): Promise<M12UnitStatus> {
  const full: M12UnitStatus = { schemaVersion: M12_UNIT_STATUS_VERSION, ...status, updatedAt: new Date().toISOString() };
  await writeJson(unitStatusFile(project, moduleName, status.layer, status.unitId), full);
  return full;
}

export type M12ReuseDecision = { kind: 'reuse' } | { kind: 'generate' };

/**
 * Skip when every output file is in the stor and not `deleted`. Generate when `force` is set or any output is
 * missing. A receipt, its hash and its date do not decide. The check is the file identity, so `x.ts` and
 * `x.defs.ts` are different files.
 */
export async function reuseDecision(outputs: readonly M12FileInfo[], force: boolean): Promise<M12ReuseDecision> {
  if (force) return { kind: 'generate' };
  return outputs.every(storExists) ? { kind: 'reuse' } : { kind: 'generate' };
}

export async function writeDraft(project: number, moduleName: string, layer: M12Layer, unitId: string, part: string, text: string): Promise<void> {
  await writeText(unitDraftFile(project, moduleName, layer, unitId, part), text);
}

export async function readDraft(project: number, moduleName: string, layer: M12Layer, unitId: string, part: string): Promise<string | null> {
  return readOptional(unitDraftFile(project, moduleName, layer, unitId, part));
}

/** appEnv of l5/project.json, the field the server reads. Absent = presentation (not production). */
export async function readAppEnv(project: number): Promise<string> {
  const config = await readJsonOptional<{ appEnv?: unknown }>({ project, level: 5, folder: '', shortName: 'project', extension: '.json' });
  return typeof config?.appEnv === 'string' && config.appEnv ? config.appEnv : 'presentation';
}
