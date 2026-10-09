/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Io.ts" enhancement="_blank"/>

// Disk is the truth of a run: every unit writes its own status file (one owner per file), finalize80 reads them.
// Reads go through the Studio stor; writes stay in memory (see writeText). No node, fs or typescript import.

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

/** A unit whose file can be registered and used by the next step. */
export function usable(status: M12UnitStatus | null): boolean {
  return stateReady(status);
}

/** Units that left a file a dependent unit can import (a held unit keeps its file). */
export function fileReady(status: M12UnitStatus | null): boolean {
  return stateReady(status) || (!!status && status.status === 'blocked' && Object.keys(status.outputs).length > 0 && status.code !== 'COMPILE_FAILED');
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
 * The bytes this agent wrote in this browser session, by stor key. Nothing is saved: a written file lives in
 * `mls.stor.files` (registered with `addOrUpdateFile`) with its content here, until the Studio saves it.
 */
// One map for the whole page: every phase agent, whatever module instance the Studio loaded it from, reads the
// bytes the earlier phases wrote. A module-level map was not shared, so a later phase read every status as absent
// and blocked every unit (BLOCKED_BY ... not materialized), 05/10/2026.
const memory: Map<string, string> = (() => {
  const holder = globalThis as unknown as { __agentMaterializeL1Memory?: Map<string, string> };
  if (!holder.__agentMaterializeL1Memory) holder.__agentMaterializeL1Memory = new Map<string, string>();
  return holder.__agentMaterializeL1Memory;
})();

function keyOf(info: M12FileInfo): string {
  return mls.stor.getKeyToFile(info as mls.stor.IFileInfo);
}

/**
 * In memory only: no libStor, no `localStor.setContent`, no editor model (an l1 model sent to the Studio
 * TypeScript worker never settles, 05/10/2026). The file is registered in `mls.stor.files` with
 * `mls.stor.addOrUpdateFile`, marked `new` or `changed`, and serves these bytes through `getContent` and
 * `getValueInfo`. Returns the hash of the bytes, which is the hash a later read of this session returns.
 */
export async function writeText(info: M12FileInfo, text: string): Promise<string> {
  if (info.shortName.includes('.') && info.shortName !== 'runtime.project') throw new Error(`M12_SHORTNAME_DOT: ${fileRef(info)}`);
  const key = keyOf(info);
  const now = new Date().toISOString();
  const index = mls.stor.files as Record<string, any>;
  let file = index[key];
  memory.set(key, text);
  if (!file || file.status === 'deleted') {
    const returned = await mls.stor.addOrUpdateFile({ project: info.project, level: info.level, shortName: info.shortName, extension: info.extension, versionRef: '0', folder: info.folder, updatedAt: now } as never);
    // The object the index holds is the one the Studio reads: keep that one, register the returned one if missing.
    file = index[key] ?? returned;
    if (!file) throw new Error(`M12_STOR_REFUSED: ${fileRef(info)} could not be registered in mls.stor.files.`);
    if (!index[key]) index[key] = file;
    file.status = 'new';
  } else if (file.status !== 'new' && file.status !== 'renamed') {
    file.status = 'changed';
  }
  file.updatedAt = now;
  file.getContent = async () => memory.get(key) ?? text;
  file.getValueInfo = async () => ({ content: memory.get(key) ?? text, contentType: 'string' });
  return sha256Text(text);
}

/** Writes a generated source and returns the exact bytes it holds (what a compiler would see). */
export async function writeSource(info: M12FileInfo, text: string): Promise<{ hash: string; text: string }> {
  const hash = await writeText(info, text);
  return { hash, text };
}

/**
 * Drops a file this agent created in this session (a broken output, the l5 lock). A file that existed before is
 * never removed here: its previous bytes are written back instead.
 */
export async function removeStorFile(info: M12FileInfo): Promise<void> {
  const key = keyOf(info);
  const file = (mls.stor.files as Record<string, any>)[key];
  memory.delete(key);
  if (file && file.status === 'new') delete (mls.stor.files as Record<string, any>)[key];
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

export type M12OutputCheck = 'absent' | 'generated' | 'editedLocally';

/** Whether the bytes on disk are still the ones this agent generated last time. */
export async function outputCheck(status: M12UnitStatus | null, info: M12FileInfo): Promise<M12OutputCheck> {
  const text = await readOptional(info);
  if (text === null) return 'absent';
  const recorded = status?.outputs?.[fileRef(info)];
  if (!recorded) return 'editedLocally';
  return await sha256Text(text) === recorded ? 'generated' : 'editedLocally';
}

/**
 * Reuse decision of one unit: reusable when the inputs did not change and every output is the one this agent
 * wrote. An output edited locally, or written by someone else, is never overwritten without "force".
 */
export async function reuseDecision(
  status: M12UnitStatus | null,
  inputHash: string,
  outputs: readonly M12FileInfo[],
  force: boolean,
): Promise<{ kind: 'reuse' } | { kind: 'generate' } | { kind: 'protect'; path: string }> {
  if (force) return { kind: 'generate' };
  const checks = await Promise.all(outputs.map(async info => ({ info, check: await outputCheck(status, info) })));
  if (status === null || Object.keys(status.outputs).length === 0) {
    const foreign = checks.find(item => item.check !== 'absent');
    if (foreign) return { kind: 'protect', path: fileRef(foreign.info) };
    return { kind: 'generate' };
  }
  const edited = checks.find(item => item.check === 'editedLocally');
  if (edited) return { kind: 'protect', path: fileRef(edited.info) };
  const ok = stateReady(status) && status.inputHash === inputHash && checks.every(item => item.check === 'generated');
  return ok ? { kind: 'reuse' } : { kind: 'generate' };
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
