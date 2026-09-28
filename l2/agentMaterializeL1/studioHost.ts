/// <mls fileReference="_102021_/l2/agentMaterializeL1/studioHost.ts" enhancement="_blank"/>

/**
 * Studio IO. Reads and writes go through the host stor. No node, fs or typescript import.
 * The project mode is the appEnv field of l5/project.json, the same field the server reads.
 * Ref policy (core/refs.ts, shared with the CLI): reads reach the target or a platform project,
 * writes and removals only the target project.
 */

import { createStorFile } from '/_102027_/l2/libStor.js';
import { parseDefinitionSource, receiptPathFor, type MaterializationReceipt } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { parseRef, readable, writable } from '/_102021_/l2/agentMaterializeL1/core/refs.js';
import type { MaterializeOwnedRemoval, MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { behaviorRunners } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { persistenceRunners } from '/_102021_/l2/agentMaterializeL1/handlers/persistence/runners.js';
import { structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import { projectLockRef } from '/_102021_/l2/agentMaterializeL1/register/reconcileL5.js';
import type { MaterializeRunHost, MaterializeWriter } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import {
  M1_WRITER_SCHEMA,
  selectRemoval,
  writerRef,
} from '/_102021_/l2/agentMaterializeL1/state/maintain.js';

interface StorFile {
  project?: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
  getContent?: () => Promise<unknown>;
  getValueInfo?: () => Promise<{ content?: unknown }>;
}

interface FileRef {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

export async function loadStudioUnits(project: number, moduleName: string): Promise<PlanUnitInput[]> {
  const units: PlanUnitInput[] = [];
  for (const stored of Object.values(files())) {
    if (stored.project !== project || stored.extension !== '.defs.ts' || !stored.shortName) continue;
    const folder = stored.folder || '';
    if (!folder.split('/').includes(moduleName)) continue;
    const text = await readStored(stored);
    if (!text) continue;
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const level = stored.level ?? 1;
    units.push({
      defPath: `_${project}_/l${level}/${folder}/${stored.shortName}.defs.ts`,
      definition: parsed.definition,
    });
  }
  units.sort((left, right) => left.defPath < right.defPath ? -1 : left.defPath > right.defPath ? 1 : 0);
  return units;
}

/** Stor key of l5 files: `level: 5, folder: ''`. */
export async function readStudioProfile(project: number): Promise<{ mode: unknown; declared: boolean }> {
  const text = await readStored(lookup({ project, level: 5, folder: '', shortName: 'project', extension: '.json' }));
  if (!text) return { mode: undefined, declared: false };
  try {
    const parsed = JSON.parse(text) as { appEnv?: unknown };
    if (typeof parsed.appEnv === 'string' && parsed.appEnv) return { mode: parsed.appEnv, declared: true };
  } catch {
    return { mode: undefined, declared: false };
  }
  return { mode: undefined, declared: false };
}

export function createStudioHost(project: number): MaterializeRunHost {
  const loads = new Map<number, Promise<string>>();
  const io: MaterializeReadIo = {
    async read(ref: string): Promise<string | null> {
      const file = readTarget(project, ref);
      if (!file) return null;
      if (file.project === project) return readStored(lookup(file));
      let loaded = loads.get(file.project);
      if (!loaded) {
        loaded = loadProject(file.project);
        loads.set(file.project, loaded);
      }
      const failure = await loaded;
      if (failure) {
        console.warn(`agentMaterializeL1: cannot read ${ref}; ${failure}`);
        return null;
      }
      const text = await readStored(lookup(file));
      if (text === null) console.warn(`agentMaterializeL1: ${ref} is absent in project ${file.project} after loading its context.`);
      return text;
    },
  };
  const state: MaterializeStateStore = {
    async readReceipt(defPath: string): Promise<MaterializationReceipt | null> {
      const path = receiptPathFor(defPath);
      if (!path) return null;
      const text = await io.read(path);
      if (!text) return null;
      try {
        return JSON.parse(text) as MaterializationReceipt;
      } catch {
        return null;
      }
    },
    async writeReceipt(receipt: MaterializationReceipt): Promise<void> {
      const path = receiptPathFor(receipt.defPath);
      if (!path) throw new Error('Receipt path is empty.');
      await writeRef(project, path, `${JSON.stringify(receipt)}\n`);
    },
    async readOwned(outputPath: string): Promise<Uint8Array | null> {
      const text = await io.read(outputPath);
      return text === null ? null : new TextEncoder().encode(text);
    },
    async writeOwned(outputPath: string, body: Uint8Array): Promise<void> {
      await writeRef(project, outputPath, new TextDecoder().decode(body));
    },
    async removeOwned(owned: readonly string[], requested: readonly string[]): Promise<MaterializeOwnedRemoval> {
      const plan = selectRemoval(owned, requested);
      const removed: string[] = [];
      const kept = [...plan.keep];
      for (const path of plan.remove) {
        const file = writeTarget(project, path);
        const stored = file ? lookup(file) : null;
        if (!file || !stored || stored.status === 'deleted') {
          kept.push(path);
          continue;
        }
        stored.status = 'deleted';
        removed.push(path);
      }
      return { removed, kept };
    },
    async readRevision(defPath: string): Promise<string | null> {
      const receipt = await this.readReceipt(defPath);
      return receipt?.semanticHash ?? null;
    },
  };
  return {
    io,
    state,
    runners: { ...structureRunners, ...behaviorRunners, ...persistenceRunners },
    writer: studioWriter(project),
    l5: studioL5(project, io),
  };
}

/**
 * One writer per module inside this page. Stor has no compare-and-swap, so two
 * browser processes are not serialized. The limit is the same one documented
 * on the local adapter.
 */
const studioHolders = new Map<string, string>();
const studioProjectLocks = new Map<number, string>();

function studioL5(project: number, io: MaterializeReadIo): NonNullable<MaterializeRunHost['l5']> {
  return {
    async claim(projectId: number, holder: string): Promise<boolean> {
      if (projectId !== project) return false;
      const current = studioProjectLocks.get(projectId);
      if (current && current !== holder) return false;
      await writeRef(project, projectLockRef(projectId), `${JSON.stringify({ holder })}\n`);
      studioProjectLocks.set(projectId, holder);
      return true;
    },
    async release(projectId: number, holder: string): Promise<void> {
      if (studioProjectLocks.get(projectId) !== holder) return;
      studioProjectLocks.delete(projectId);
    },
    read: ref => io.read(ref),
    async compareAndSwap(ref: string, expected: string | null, next: string): Promise<'ok' | 'conflict'> {
      const current = await io.read(ref);
      if (current !== expected) return 'conflict';
      await writeRef(project, ref, next);
      return 'ok';
    },
  };
}

function studioWriter(project: number): MaterializeWriter {
  return {
    async claim(moduleName: string, holder: string): Promise<boolean> {
      const key = `${project}:${moduleName}`;
      const current = studioHolders.get(key);
      if (current && current !== holder) return false;
      await writeRef(project, writerRef(moduleName), `${JSON.stringify({ schemaVersion: M1_WRITER_SCHEMA, moduleName, holder })}\n`);
      studioHolders.set(key, holder);
      return true;
    },
    async release(moduleName: string, holder: string): Promise<void> {
      const key = `${project}:${moduleName}`;
      if (studioHolders.get(key) !== holder) return;
      studioHolders.delete(key);
    },
  };
}

/** Loads the stor index of another project (once per host). Returns '' or the failure the reader warns. */
async function loadProject(projectId: number): Promise<string> {
  const server = (mls.stor as { server?: { loadProjectInfoIfNeeded?: (project: number) => Promise<unknown> } }).server;
  if (typeof server?.loadProjectInfoIfNeeded !== 'function') return `the stor cannot load project ${projectId}.`;
  try {
    await server.loadProjectInfoIfNeeded(projectId);
    return '';
  } catch (error) {
    return `loading project ${projectId} failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function files(): Record<string, StorFile> {
  const stor = mls.stor as { files?: Record<string, StorFile> };
  return stor.files || {};
}

function lookup(file: FileRef): StorFile | null {
  const key = mls.stor.getKeyToFile(file);
  return (mls.stor.files as Record<string, StorFile>)[key] || null;
}

async function readStored(stored: StorFile | null): Promise<string | null> {
  if (!stored || stored.status === 'deleted') return null;
  if (stored.getValueInfo) {
    try {
      const local = await stored.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch { /* fall through to getContent */ }
  }
  if (!stored.getContent) return null;
  const content = await stored.getContent();
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') return `${JSON.stringify(content)}\n`;
  return null;
}

async function writeRef(project: number, ref: string, body: string): Promise<void> {
  const file = writeTarget(project, ref);
  if (!file) throw new Error(`Refused a write outside the module tree: ${ref}`);
  if (file.shortName.includes('.') && file.shortName !== 'runtime.project') throw new Error(`Refused a file name with an extra dot: ${file.shortName}`);
  const stored = lookup(file);
  if (!stored || stored.status === 'deleted') {
    await createStorFile({ ...file, source: body, status: 'new' }, false, false, false);
    return;
  }
  await mls.stor.localStor.setContent(stored as mls.stor.IFileInfo, { contentType: 'string', content: body });
}

function readTarget(project: number, ref: string): FileRef | null {
  return readable(ref, project) ? fileFromRef(project, ref) : null;
}

function writeTarget(project: number, ref: string): FileRef | null {
  return writable(ref, project) ? fileFromRef(project, ref) : null;
}

/** Stor key of a ref. A file at the root of a level is `folder: ''`. The policy is applied by the callers. */
function fileFromRef(project: number, ref: string): FileRef | null {
  const parsed = parseRef(ref, project);
  if (!parsed) return null;
  const slash = parsed.rest.lastIndexOf('/');
  const folder = slash >= 0 ? parsed.rest.slice(0, slash) : '';
  const filename = slash >= 0 ? parsed.rest.slice(slash + 1) : parsed.rest;
  const doubled = ['.defs.ts', '.test.ts', '.d.ts'].find(item => filename.endsWith(item));
  const dot = doubled ? filename.length - doubled.length : filename.lastIndexOf('.');
  if (dot <= 0) return null;
  const shortName = filename.slice(0, dot);
  const extension = doubled || filename.slice(dot);
  const runtimeProject = parsed.level === 5 && folder === '' && shortName === 'runtime.project';
  if (!shortName || (shortName.includes('.') && !runtimeProject)) return null;
  return { project: Number(parsed.projectId), level: parsed.level, folder, shortName, extension };
}
