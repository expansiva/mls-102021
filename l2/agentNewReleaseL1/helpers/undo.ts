/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/undo.ts" enhancement="_blank"/>

import {
  displayPath,
  fileExists,
  moduleFile,
  readSourceText,
  writeSourceText,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';

export interface PreparedRecord {
  at: string;
  moved: string[];
  saved: string[];
  plannerAbsent: boolean;
  /** Usecases left out of `removed` because a contract route still calls them. */
  kept?: Array<{ id: string; routes: string[] }>;
}

export type UndoOutcome = { ok: true } | { ok: false; text: string };

/** Drop what `/run` wrote, put `_old` back, restore the three `l4` files, then remove `_old`. */
export async function undoPrepared(moduleName: string): Promise<UndoOutcome> {
  const project = mls.actualProject || 0;
  const oldRoot = `${moduleName}_old`;
  const prepared = preparedFile(moduleName);
  try {
    if (!fileExists(prepared)) throw new Error(`missing ${displayPath(prepared)}`);
    const record = JSON.parse(await readSourceText(prepared)) as PreparedRecord;
    const restore = listExceptRelease(project, oldRoot);
    const texts: Array<{ info: Ns5FileInfo; text: string }> = [];
    for (const file of restore) {
      const info = asFileInfo(file, moduleName, oldRoot);
      texts.push({ info, text: await readSourceText(asFileInfo(file)) });
    }
    for (const file of listUnder(project, moduleName)) await removeIndexed(asFileInfo(file));
    for (const file of texts) await writeSourceText(file.info, file.text);
    await restoreSaved(moduleName, record);
    for (const file of listUnder(project, oldRoot)) await removeIndexed(asFileInfo(file));
    return { ok: true };
  } catch (error) {
    return { ok: false, text: error instanceof Error ? error.message : String(error) };
  }
}

async function restoreSaved(moduleName: string, record: PreparedRecord): Promise<void> {
  const backend = l4File(moduleName, 'pool/l2/web', 'backend');
  const effort = l4File(moduleName, 'pool/l2/web', 'effort');
  const planner = l4File(moduleName, 'pool/l1', 'pipeline');
  await writeSourceText(backend, await readSourceText(savedFile(moduleName, 'pool/l2/web', 'backend')));
  await writeSourceText(effort, await readSourceText(savedFile(moduleName, 'pool/l2/web', 'effort')));
  if (record.plannerAbsent) {
    await removeIndexed(planner);
    return;
  }
  await writeSourceText(planner, await readSourceText(savedFile(moduleName, 'pool/l1', 'pipeline')));
}

function listExceptRelease(project: number, oldRoot: string): mls.stor.IFileInfo[] {
  const skip = `${oldRoot}/pipeline/agentNewReleaseL1`;
  return listUnder(project, oldRoot).filter(file => {
    const folder = String(file.folder || '');
    return folder !== skip && !folder.startsWith(`${skip}/`);
  });
}

function listUnder(project: number, rootFolder: string): mls.stor.IFileInfo[] {
  const files: mls.stor.IFileInfo[] = [];
  for (const file of Object.values(mls.stor.files || {})) {
    if (!file || file.status === 'deleted') continue;
    if (Number(file.project) !== project || Number(file.level) !== 1) continue;
    const folder = String(file.folder || '');
    if (folder !== rootFolder && !folder.startsWith(`${rootFolder}/`)) continue;
    if (!file.shortName || !file.extension) continue;
    files.push(file);
  }
  return files;
}

export async function removeIndexed(info: Ns5FileInfo): Promise<void> {
  const indexed = mls.stor.files[mls.stor.getKeyToFile(info)] as mls.stor.IFileInfo | undefined;
  if (!indexed || indexed.status === 'deleted') return;
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  await deleteFile(indexed);
}

function asFileInfo(file: mls.stor.IFileInfo, moduleName?: string, oldRoot?: string): Ns5FileInfo {
  let folder = String(file.folder || '');
  if (moduleName && oldRoot && (folder === oldRoot || folder.startsWith(`${oldRoot}/`))) {
    folder = folder === oldRoot ? moduleName : `${moduleName}${folder.slice(oldRoot.length)}`;
  }
  return {
    project: Number(file.project),
    level: Number(file.level) as 1,
    folder,
    shortName: String(file.shortName),
    extension: String(file.extension),
  };
}

function preparedFile(moduleName: string): Ns5FileInfo {
  return {
    project: moduleFile(moduleName).project,
    level: 1,
    folder: `${moduleName}_old/pipeline/agentNewReleaseL1`,
    shortName: 'prepared',
    extension: '.json',
  };
}

function l4File(moduleName: string, tail: string, shortName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return { project: base.project, level: 4, folder: `${base.folder}/${tail}`, shortName, extension: '.json' };
}

function savedFile(moduleName: string, tail: string, shortName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 1,
    folder: `${moduleName}_old/pipeline/agentNewReleaseL1/saved/l4/${base.folder}/${tail}`,
    shortName,
    extension: '.json',
  };
}
