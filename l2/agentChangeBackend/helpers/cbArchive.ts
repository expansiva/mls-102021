/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbArchive.ts" enhancement="_blank"/>

/** Backend generated l1 lives under `<module>/layer_*`. Scope so one module never touches another. */
export function isGeneratedBackendFolder(folder: string, modules: string[]): boolean {
  return modules.some(module => !!module && (folder === module || folder.startsWith(`${module}/`)));
}

/** Keys of l1 files that `/rebuild all` must archive before regenerating. */
export function listBackendL1ArchiveKeys(
  files: Record<string, { project?: number; level?: number; status?: string; folder?: string } | null | undefined>,
  project: number,
  moduleName: string,
): string[] {
  if (!moduleName) return [];
  const keys: string[] = [];
  for (const [key, file] of Object.entries(files)) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (!isGeneratedBackendFolder(String(file.folder || ''), [moduleName])) continue;
    keys.push(key);
  }
  return keys;
}
