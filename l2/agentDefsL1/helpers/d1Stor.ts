/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Stor.ts" enhancement="_blank"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import {
  assertShortName,
  displayPath,
  ownedFolder,
  type D1FileInfo,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';

type ReadableFile = {
  status?: string;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent?: () => Promise<unknown>;
};

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

/**
 * Removes the accepted implement from `l4/<module>/pool/l1` once it is traced. Any other
 * folder, level or name is refused.
 */
export async function removePoolMessage(file: D1FileInfo): Promise<void> {
  const moduleName = file.folder.split('/')[0] || '';
  const ok = file.level === 4
    && !!moduleName
    && file.folder === `${moduleName}/pool/l1`
    && file.extension === '.json'
    && /^\d{14}_.+_\d+$/u.test(file.shortName);
  if (!ok) throw new Error(`agentDefsL1 refuses to remove ${displayPath(file)}`);
  await deleteOne(file);
}

/**
 * Same browser path the Studio uses to remove a file (libStor): a new file leaves the
 * stor; any other file keeps its trash content and is marked deleted.
 */
async function deleteOne(file: D1FileInfo): Promise<void> {
  const key = mls.stor.getKeyToFile(file);
  const stored = mls.stor.files[key];
  if (!stored || stored.status === 'deleted') return;
  if (stored.status === 'new') {
    await mls.stor.localStor.setContent(stored, { contentType: 'string', content: null });
    delete mls.stor.files[key];
    return;
  }
  const content = await stored.getContent() as string;
  await mls.stor.localStor.setContent(stored, {
    content,
    contentType: 'string',
    originalShortName: stored.shortName,
    originalProject: stored.project,
  });
  stored.status = 'deleted';
}
