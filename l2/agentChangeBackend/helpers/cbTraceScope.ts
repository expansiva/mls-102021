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

/** `<module>/trace` when the module is known, else the legacy bare `trace`. */
export function cbTraceFolder(): string {
  return currentModule ? `${currentModule}/trace` : CB_TRACE_LEGACY_FOLDER;
}

/** Where the previous versions of this agent wrote: readers fall back to it so a run in flight that
 *  started before this change still finds its own state. */
export const CB_TRACE_LEGACY_FOLDER = 'trace';
