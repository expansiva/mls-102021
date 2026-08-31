/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbTraceScope.ts" enhancement="_blank"/>

// WHERE the run's trace and state artifacts live.
//
// `saveAgentTrace` always wrote under `l4/<module>/trace/`, but the repair state, the cost report, the
// health report, the judge findings and the validate progress wrote to a bare `l4/trace/` — no module
// prefix. In a project with two modules (which is the normal state of a generated project: ns4 leaves
// previous generations behind) two runs would collide on those files. Same family as the T9 bug.
//
// They are NOT in l1 on purpose: l1 is the generated code the VM build compiles and publishes, so
// execution metadata there would be dead weight in the deploy and noise in the whole-project compile.
// The place for it is the module's l4, next to the ns4 pipeline.

let currentModule = '';

/** Called by the scan once the target module is resolved; every later write is scoped by it. */
export function setCbTraceModule(moduleName: string): void {
  currentModule = moduleName && moduleName !== 'unknown' ? moduleName : '';
}

/** Empty when the scan has not resolved a module — callers must not invent a pipeline folder. */
export function cbCurrentTraceModule(): string {
  return currentModule;
}

export const CB_TRACE_LAYER = 'l1';

/** `l4/<module>/pipeline/trace/l1`. Empty when the module is unknown — never the bare `trace`. */
export function cbLayerTraceFolder(moduleName: string): string {
  return moduleName ? `${moduleName}/pipeline/trace/${CB_TRACE_LAYER}` : '';
}

export function cbTraceFolder(): string {
  return cbLayerTraceFolder(currentModule);
}

/** Readers look only at the current layer folder. Leftover layout is invisible on purpose. */
export function cbTraceReadFolders(): string[] {
  const folder = cbTraceFolder();
  return folder ? [folder] : [];
}

export function isCbLayerTraceFolder(folder: string, moduleName: string): boolean {
  if (!moduleName) return false;
  const prefix = cbLayerTraceFolder(moduleName);
  return folder === prefix || folder.startsWith(`${prefix}/`);
}

export function listCbLayerTraceKeys(
  files: Record<string, { project?: number; level?: number; status?: string; folder?: string } | null | undefined>,
  project: number,
  moduleName: string,
): string[] {
  if (!project || !moduleName) return [];
  const keys: string[] = [];
  for (const [key, file] of Object.entries(files)) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (!isCbLayerTraceFolder(String(file.folder || ''), moduleName)) continue;
    keys.push(key);
  }
  return keys;
}

function traceShortName(agentName: string, stepId: unknown): string {
  const safe = agentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${String(stepId ?? 0).padStart(3, '0')}-${safe || 'agent'}`;
}

/** Stor identity of a CB step dump. JSON on purpose — not a defs artifact.
 *  (`defsRef` would force `.defs.ts` and the buildCI tsc would compile the JSON.) */
export function agentTraceFileInfo(moduleName: string, agentName: string, stepId: unknown, project = 0): {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
} {
  return {
    project,
    level: 4,
    folder: cbLayerTraceFolder(moduleName),
    shortName: traceShortName(agentName, stepId),
    extension: '.json',
  };
}
