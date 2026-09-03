/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbArchive.ts" enhancement="_blank"/>

/** Backend generated l1 lives under `<module>/layer_*`. Scope so one module never touches another. */
export function isGeneratedBackendFolder(folder: string, modules: string[]): boolean {
  return modules.some(module => !!module && (folder === module || folder.startsWith(`${module}/`)));
}

type StorFileLite = {
  project?: number | string;
  level?: number | string;
  status?: string;
  folder?: string;
  shortName?: string;
  extension?: string;
} | null | undefined;

function isModuleL1File(file: StorFileLite, project: number, moduleName: string): boolean {
  if (!file) return false;
  if (Number(file.project) !== project || Number(file.level) !== 1) return false;
  return isGeneratedBackendFolder(String(file.folder || ''), [moduleName]);
}

/** Keys of l1 files that `/rebuild all` must archive before regenerating.
 *  Everything under `l1/<mod>/`: `.ts` and `.defs.ts`, every layer, `seeds.ts`,
 *  `registerRepositories.ts`, including leftovers whose stor status is already `deleted`. */
export function listBackendL1ArchiveKeys(
  files: Record<string, StorFileLite>,
  project: number,
  moduleName: string,
): string[] {
  if (!moduleName) return [];
  const keys: string[] = [];
  for (const [key, file] of Object.entries(files)) {
    if (!isModuleL1File(file, project, moduleName)) continue;
    keys.push(key);
  }
  return keys;
}

/** Live (not `deleted`) l1 files still in the index after a wipe. */
export function countBackendL1LiveFiles(
  files: Record<string, StorFileLite>,
  project: number,
  moduleName: string,
): number {
  if (!moduleName) return 0;
  let n = 0;
  for (const file of Object.values(files)) {
    if (!isModuleL1File(file, project, moduleName)) continue;
    if (file?.status === 'deleted') continue;
    n++;
  }
  return n;
}

/** Count of l1 files of the module still in the index, including `status=deleted`. */
export function countBackendL1IndexedFiles(
  files: Record<string, StorFileLite>,
  project: number,
  moduleName: string,
): number {
  if (!moduleName) return 0;
  let n = 0;
  for (const file of Object.values(files)) {
    if (isModuleL1File(file, project, moduleName)) n++;
  }
  return n;
}

export function rebuildAllWipedMessage(moduleName: string, wiped: number): string {
  return `rebuild-all wiped ${wiped} file(s) of l1/${moduleName}`;
}

/** Parse the archived-key list stored on the run (`rebuildWipedKeys` in longMemory). */
export function parseWipedKeysJson(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key): key is string => typeof key === 'string' && key.length > 0);
  } catch {
    return [];
  }
}

/** Keys archived by THIS run. A previous run's set is ignored when `runId` does not match. */
export function wipedKeysForRun(
  state: { wipeRunId?: string; wipedKeys?: string[] },
  runId: string,
): string[] {
  if (!runId || !state.wipeRunId || state.wipeRunId !== runId) return [];
  return Array.isArray(state.wipedKeys)
    ? state.wipedKeys.filter((key): key is string => typeof key === 'string' && key.length > 0)
    : [];
}

/** Drop a key that this run already rematerialized. */
export function removeWipedKey(keys: readonly string[], regenerated: string): string[] {
  if (!regenerated) return keys.slice();
  return keys.filter(key => key !== regenerated);
}

/** `/rebuild all` that wiped files and then materialize generated none is a failed run, not `completed`. */
export function materializeNoneAfterWipeFinding(rebuildWiped: number, materializeCalls: number): string | null {
  if (rebuildWiped > 0 && materializeCalls === 0) {
    return `rebuild-all wiped ${rebuildWiped} file(s) and materialize generated none`;
  }
  return null;
}

/** A wipe that counted files and still left live ones is not a rebuild-all — abort the run. */
export function rebuildWipeShouldAbort(wiped: number, leftover: number): boolean {
  return wiped > 0 && leftover > 0;
}

/** Trace line plus optional finding when a populated module wipes 0, or live files remain. */
export function describeRebuildWipe(
  moduleName: string,
  wiped: number,
  indexed: number,
  leftover: number,
): { message: string; finding: string | null; abort: boolean } {
  const message = rebuildAllWipedMessage(moduleName, wiped);
  const abort = rebuildWipeShouldAbort(wiped, leftover);
  if (wiped === 0 && indexed > 0) {
    return { message, finding: `${message} but the index still has ${indexed} file(s)`, abort };
  }
  if (leftover > 0) {
    return { message, finding: `${message}; ${leftover} live file(s) remain`, abort };
  }
  return { message, finding: null, abort };
}
