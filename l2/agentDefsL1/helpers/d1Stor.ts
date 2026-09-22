/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Stor.ts" enhancement="_blank"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import {
  assertShortName,
  displayPath,
  ownedFolder,
  type D1FileInfo,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';

export interface D1HostView {
  /** Null when this host has no diskPath (Studio). Absence is a state, not an error. */
  diskPath: string | null;
  /** Short names from host listFolder. Null when the host has no listFolder. */
  listed: readonly string[] | null;
}

type DiskPathHost = { diskPath?: (info: D1FileInfo) => string };
type ListHost = {
  listFolder?: (project: number, level: number, folder: string) => Array<Pick<D1FileInfo, 'shortName' | 'extension'>>;
  deleteFile?: (file: mls.stor.IFileInfo) => unknown;
};

type ReadableFile = {
  status?: string;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent?: () => Promise<unknown>;
};

/**
 * Host disk path. Called as a method on `mls.stor` so a private field on the
 * host object stays bound. A missing method is Studio, not a failure.
 */
export function hostDiskPath(file: D1FileInfo): string | null {
  const stor = mls.stor as unknown as DiskPathHost;
  if (typeof stor.diskPath !== 'function') return null;
  try {
    return stor.diskPath(file);
  } catch {
    return null;
  }
}

export function hostView(file: D1FileInfo): D1HostView {
  const diskPath = hostDiskPath(file);
  const local = mls.stor.localStor as unknown as ListHost | undefined;
  if (!local || typeof local.listFolder !== 'function') return { diskPath, listed: null };
  try {
    const listed = local.listFolder(file.project, file.level, file.folder)
      .filter(item => item.extension === file.extension && !!item.shortName)
      .map(item => item.shortName);
    return { diskPath, listed };
  } catch {
    return { diskPath, listed: null };
  }
}

export async function readText(file: D1FileInfo): Promise<string | null> {
  assertShortName(file.shortName);
  const stored = mls.stor.files[mls.stor.getKeyToFile(file)] as ReadableFile | undefined;
  if (!stored || stored.status === 'deleted') return null;
  if (stored.getValueInfo) {
    try {
      const local = await stored.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch { /* index content is the fallback */ }
  }
  if (!stored.getContent) return null;
  const content = await stored.getContent();
  if (typeof content === 'string') return content;
  if (file.extension === '.json' && content && typeof content === 'object') {
    return `${JSON.stringify(content, null, 2)}\n`;
  }
  return null;
}

export async function writeText(file: D1FileInfo, content: string): Promise<void> {
  assertShortName(file.shortName);
  const key = mls.stor.getKeyToFile(file);
  const stored = mls.stor.files[key];
  if (!stored || stored.status === 'deleted') {
    if (stored && stored.status === 'deleted') {
      stored.status = 'changed';
      await mls.stor.localStor.setContent(stored, { contentType: 'string', content });
      return;
    }
    await createStorFile({ ...file, source: content, status: 'new' }, false, false, false);
    return;
  }
  await mls.stor.localStor.setContent(stored, { contentType: 'string', content });
}

export async function readJson<T>(file: D1FileInfo): Promise<T | null> {
  const raw = await readText(file);
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Writes JSON and returns the exact bytes stored. */
export async function writeJson(file: D1FileInfo, value: unknown): Promise<string> {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await writeText(file, text);
  return text;
}

/**
 * Removes one file this agent owns. The file identity is the same object a
 * write would use. The planner pipeline and every other folder are refused.
 */
export async function removeOwned(file: D1FileInfo): Promise<void> {
  const moduleName = file.folder.split('/')[0] || '';
  if (!moduleName || file.folder !== ownedFolder(moduleName)) {
    throw new Error(`agentDefsL1 refuses to remove ${displayPath(file)}`);
  }
  await deleteOne(file);
}

/**
 * Removes one own product def. A directory is not a file, a `.ts` output is
 * not a def, and this is not `/rebuild all`.
 */
export async function removeDefFile(file: D1FileInfo): Promise<void> {
  const moduleName = file.folder.split('/')[0] || '';
  const pipeline = `${moduleName}/pipeline`;
  const ownProduct = !!moduleName
    && file.extension === '.defs.ts'
    && !!file.shortName
    && !file.shortName.includes('.')
    && !file.shortName.includes('/')
    && (file.folder === moduleName || file.folder.startsWith(`${moduleName}/`))
    && file.folder !== pipeline
    && !file.folder.startsWith(`${pipeline}/`);
  if (!ownProduct) throw new Error(`agentDefsL1 refuses to remove ${displayPath(file)}`);
  await deleteOne(file);
}

async function deleteOne(file: D1FileInfo): Promise<void> {
  const stored = mls.stor.files[mls.stor.getKeyToFile(file)];
  if (!stored || stored.status === 'deleted') return;
  const local = mls.stor.localStor as unknown as ListHost;
  if (typeof local.deleteFile === 'function') {
    await local.deleteFile(stored);
    return;
  }
  stored.status = 'deleted';
}
