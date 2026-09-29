/// <mls fileReference="_102021_/l2/agentMaterializeL1/studioHost.ts" enhancement="_blank"/>

/**
 * Studio IO. Reads and writes go through the host stor. No node, fs or typescript import.
 * The project mode is the appEnv field of l5/project.json, the same field the server reads.
 * Ref policy (core/refs.ts): reads reach the target or a platform project,
 * writes and removals only the target project.
 */

import { createStorFile } from '/_102027_/l2/libStor.js';
import { parseDefinitionSource } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { parseRef, readable, writable } from '/_102021_/l2/agentMaterializeL1/core/refs.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { behaviorRunners } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { persistenceRunners } from '/_102021_/l2/agentMaterializeL1/handlers/persistence/runners.js';
import { structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import type { MaterializeRunHost } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { createLocalBindings, type LocalFiles } from '/_102021_/l2/agentMaterializeL1/state/localBindings.js';

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
  // Writer, lock and state protocol of state/localBindings.ts; the file port is the stor.
  const local = createLocalBindings(io, studioFiles(project, io));
  return {
    io,
    state: local.state,
    runners: { ...structureRunners, ...behaviorRunners, ...persistenceRunners },
    writer: local.writer,
    l5: {
      claim: local.projectLock.claim,
      release: local.projectLock.release,
      read: ref => io.read(ref),
      async compareAndSwap(ref: string, expected: string | null, next: string): Promise<'ok' | 'conflict'> {
        const current = await io.read(ref);
        if (current !== expected) return 'conflict';
        await writeRef(project, ref, next);
        return 'ok';
      },
    },
  };
}

/** The `LocalFiles` port over the stor. Writes and removals stay in the target project. */
function studioFiles(project: number, io: MaterializeReadIo): LocalFiles {
  return {
    read: ref => io.read(ref),
    write: (ref, body) => writeRef(project, ref, body),
    async remove(ref: string): Promise<boolean> {
      const file = writeTarget(project, ref);
      const stored = file ? lookup(file) : null;
      if (!stored || stored.status === 'deleted') return false;
      // Host capability: collab-msg unlinks the file. Without it the stor keeps the entry as deleted.
      const localStor = mls.stor.localStor as unknown as { deleteFile?: (file: StorFile) => unknown };
      if (typeof localStor.deleteFile === 'function') await localStor.deleteFile(stored);
      else stored.status = 'deleted';
      return true;
    },
    async createExclusive(ref: string, body: string): Promise<boolean> {
      const file = writeTarget(project, ref);
      if (!file) return false;
      if (await readStored(lookup(file)) !== null) return false;
      await writeRef(project, ref, body);
      return true;
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
