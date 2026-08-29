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

/** `<module>/pipeline/trace` when the module is known, else the legacy bare `trace`. */
export function cbTraceFolder(): string {
  return currentModule ? `${currentModule}/pipeline/trace` : CB_TRACE_LEGACY_FOLDER;
}

/** Where the previous versions of this agent wrote: readers fall back to it so a run in flight that
 *  started before this change still finds its own state. */
export const CB_TRACE_LEGACY_FOLDER = 'trace';

/** Pre-pipeline module folder (`l4/<module>/trace`). */
export function cbTraceModuleLegacyFolder(): string {
  return currentModule ? `${currentModule}/trace` : CB_TRACE_LEGACY_FOLDER;
}

/** Folders a reader must look at: current write target, then the two previous homes. */
export function cbTraceReadFolders(): string[] {
  const folders = [cbTraceFolder()];
  if (currentModule) folders.push(`${currentModule}/trace`);
  folders.push(CB_TRACE_LEGACY_FOLDER);
  return [...new Set(folders)];
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
    folder: `${moduleName}/pipeline/trace`,
    shortName: traceShortName(agentName, stepId),
    extension: '.json',
  };
}
