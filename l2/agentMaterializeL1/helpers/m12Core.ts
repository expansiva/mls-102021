/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Core.ts" enhancement="_blank"/>

// Identity of a run, invocation parsing and the planned step tree. flow.json is the spec of all of it.

export const M12_AGENT_NAME = 'agentMaterializeL1' as const;
/**
 * Build of this agent, printed in the plan and in every phase trace: the Studio loads an agent by file name from
 * its own stor and compiled cache, so the trace is how a run shows which code it is running.
 */
export const M12_BUILD = 'm12-2026-10-09.35 (entities are type aliases, so they fit Record-based usecase outputs; tests60 back on, with the code model; a usecase reads only the input it declares, a sequence number is calculated; a transition writes the state it leads to; null from the MDM is absent, never an error; a request takes its contract input type and the controller passes it uncast; the request def goes compact, under the prompt limit; list filters are optional in the scaffold; platform MDM rules belong to the engine; an absent optional output field is left out; compile errors carry line, column and code; l4 collections are lists and MDM entities follow l4 optionality; no input casts in requests; an MDM usecase gets the flat engine shape and the ctx.mdm types; node: means an import, not a local named node; a text or day search is not an exact filter; a rule about a parent record obliges reading it; a rule handed to a usecase in a comment must be in that usecase; a list applies every filter its input declares; the usecase prompt says what each context section decides; a usecase never reads a derived field from a record the repository returned; a stored record comes back with every declared object, even empty; a write keeps the version it read: the repository increments it; usecase context sends the entities its rules name, by title and relationship; repository types only from ports; controller input opens named contract interfaces; requests typed by the contract outputs; no as-unknown/as-any; usecases (input, ctx) only; whole-module registration; controllers after request services; l1 proven by worker diagnostics only, breaker on a silent worker; briefing §2.1: def fields are hints; recipes first; usecases and request services always to the model; prompts declare modelType)' as const;
export const M12_DOMAIN_AGENT_NAME = 'agentM12Domain' as const;
export const M12_PERSISTENCE_AGENT_NAME = 'agentM12Persistence' as const;
export const M12_USECASES_AGENT_NAME = 'agentM12Usecases' as const;
export const M12_USECASE_UNIT_AGENT_NAME = 'agentM12UsecaseUnit' as const;
export const M12_REQUESTS_AGENT_NAME = 'agentM12Requests' as const;
export const M12_REQUEST_SERVICE_AGENT_NAME = 'agentM12RequestService' as const;
export const M12_CONTROLLERS_AGENT_NAME = 'agentM12Controllers' as const;
export const M12_TESTS_AGENT_NAME = 'agentM12Tests' as const;
export const M12_TESTS_PAGE_AGENT_NAME = 'agentM12TestsPage' as const;
export const M12_REGISTER_AGENT_NAME = 'agentM12Register' as const;
export const M12_FINALIZE_AGENT_NAME = 'agentM12Finalize' as const;

/** The layers a def belongs to, in the order they are materialized. `tests` has no def of its own. */
/**
 * Dependency order. A controller imports its request service, so with the Studio compiler proving l1 it can only
 * compile after the service exists (05/10/2026: written first, every controller failed "imports unavailable").
 * The folder and step names keep their numbers (controllers30 runs after requests50): renaming them again would
 * leave a stale copy with the same agent name in the Studio stor, which loads the last file it finds.
 */
export const M12_LAYERS = ['domain', 'persistence', 'usecases', 'requests', 'controllers', 'tests'] as const;
export type M12Layer = typeof M12_LAYERS[number];

export const M12_STEP_IDS = ['domain10', 'persistence20', 'usecases40', 'requests50', 'controllers30', 'tests60', 'register70', 'finalize80'] as const;
export type M12StepId = typeof M12_STEP_IDS[number];

const LAYER_STEP: Record<M12Layer, M12StepId> = {
  domain: 'domain10',
  persistence: 'persistence20',
  usecases: 'usecases40',
  requests: 'requests50',
  controllers: 'controllers30',
  tests: 'tests60',
};

const STEP_AGENT: Record<M12StepId, string> = {
  domain10: M12_DOMAIN_AGENT_NAME,
  persistence20: M12_PERSISTENCE_AGENT_NAME,
  usecases40: M12_USECASES_AGENT_NAME,
  requests50: M12_REQUESTS_AGENT_NAME,
  controllers30: M12_CONTROLLERS_AGENT_NAME,
  tests60: M12_TESTS_AGENT_NAME,
  register70: M12_REGISTER_AGENT_NAME,
  finalize80: M12_FINALIZE_AGENT_NAME,
};

const STEP_TITLE: Record<M12StepId, string> = {
  domain10: 'Materialize domain',
  persistence20: 'Materialize persistence',
  usecases40: 'Materialize usecases',
  requests50: 'Materialize request services',
  controllers30: 'Materialize controllers',
  tests60: 'Materialize monitor tests',
  register70: 'Register the module in l5',
  finalize80: 'Materialization report',
};

/** Which layer materializes a def, by its artifactType. Unknown types are not planned (the report names them). */
export const LAYER_OF_TYPE: Readonly<Record<string, M12Layer>> = {
  domainEntity: 'domain',
  valueObject: 'domain',
  repositoryPort: 'domain',
  accessScope: 'domain',
  authorityMap: 'domain',
  table: 'persistence',
  repositoryAdapter: 'persistence',
  repositoryRegistration: 'persistence',
  persistenceSeeds: 'persistence',
  integrationOutbound: 'persistence',
  usecase: 'usecases',
  requestService: 'requests',
  httpController: 'controllers',
};

/** Repair rounds per LLM unit after the first attempt. */
export const M12_REPAIR_BUDGET = 2;
/** System + human prompt ceiling per LLM call, in characters. */
export const M12_PROMPT_LIMIT = 160_000;

/** What the user asked for. */
export interface M12Request {
  /** Folder prefix under l1, by whole segments; '' = every module of the project. */
  scope: string;
  /** Full path of one `.defs.ts` (or of the `.ts` generated from it); exclusive with scope. */
  target: string;
  /** Regenerate reusable units and overwrite outputs this agent did not write. A target implies it. */
  force: boolean;
}

/** The args of every phase step: one module, the request that selects its units. */
export interface M12RunArgs extends M12Request {
  project: number;
  module: string;
}

export type M12MessageInvocation =
  | { kind: 'help' }
  | ({ kind: 'run'; project: number } & M12Request)
  | { kind: 'refusal'; diagnostic: string };

export type M12StepInvocation =
  | ({ kind: 'run' } & M12RunArgs)
  | { kind: 'refusal'; diagnostic: string };

const AGENT_PREFIXES = [/^\s*@@\s*_102021_\/l2\/agentMaterializeL1(?:\s+|$)/iu, /^\s*@@\s*agentMaterializeL1(?:\s+|$)/iu];

export const M12_HELP = [
  'Usage: @@agentMaterializeL1 [{"scope":"<folder>"} | {"target":"<path of a .defs.ts>"}]',
  'No JSON: every l1 module of the current project. scope: an l1 folder prefix, e.g. "comandaRestaurante" (the whole backend of the module) or "comandaRestaurante/layer_2_application/usecases".',
  'target: one unit by its .defs.ts or the .ts generated from it, e.g. "_102047_/l1/comandaRestaurante/layer_2_application/usecases/createMesa.defs.ts" (regenerated regardless of reuse).',
  'Optional "force": true regenerates reusable units and overwrites outputs this agent did not write.',
  'Order per module: domain10 -> persistence20 (recipes) -> usecases40 -> requests50 (model) -> controllers30 (recipe, imports the request service) -> tests60 (model) -> register70 -> finalize80. A unit whose dependency is not ready is blocked.',
].join('\n');

/** A module name: lowerCamel, no path, no separator. */
export function tokenOk(value: string): boolean {
  return /^[a-z][A-Za-z0-9]{0,59}$/u.test(value);
}

/** A page id or unit id: lowerCamel or snake, no dot, no slash. */
export function unitIdOk(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{0,79}$/u.test(value);
}

function scopeOk(value: string): boolean {
  return value === '' || value.split('/').every(part => /^[A-Za-z0-9_-]+$/u.test(part));
}

/** `{"scope":"..."}` / `{"target":"..."}` after the @@ prefix; no JSON means every module. */
export function parseM12MessageInvocation(value: string, project: number): M12MessageInvocation {
  let raw = String(value || '');
  for (const prefix of AGENT_PREFIXES) raw = raw.replace(prefix, '');
  raw = raw.trim();
  if (raw.toLowerCase() === '/help') return { kind: 'help' };
  if (!Number.isSafeInteger(project) || project <= 0) return { kind: 'refusal', diagnostic: 'The current project is unavailable. Nothing was executed.' };
  if (!raw) return { kind: 'run', project, scope: '', target: '', force: false };
  if (!raw.startsWith('{')) return { kind: 'refusal', diagnostic: `Expected a JSON object or /help. Nothing was executed.\n${M12_HELP}` };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { kind: 'refusal', diagnostic: `Invalid JSON. Nothing was executed.\n${M12_HELP}` }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { kind: 'refusal', diagnostic: `The JSON must be an object. Nothing was executed.\n${M12_HELP}` };
  const record = parsed as Record<string, unknown>;
  const unknown = Object.keys(record).find(key => !['scope', 'target', 'force'].includes(key));
  if (unknown) return { kind: 'refusal', diagnostic: `Unknown key "${unknown}". Nothing was executed.\n${M12_HELP}` };
  const scope = typeof record.scope === 'string' ? record.scope.trim().replace(/^\/+|\/+$/gu, '') : '';
  const target = typeof record.target === 'string' ? record.target.trim() : '';
  if (scope && target) return { kind: 'refusal', diagnostic: '"scope" and "target" cannot come together. Nothing was executed.' };
  if (!scopeOk(scope)) return { kind: 'refusal', diagnostic: `Invalid scope: ${scope}. Nothing was executed.` };
  return { kind: 'run', project, scope, target, force: record.force === true || Boolean(target) };
}

export function parseM12StepInvocation(value: string, currentProject: number): M12StepInvocation {
  let parsed: unknown;
  try { parsed = JSON.parse(String(value || '{}')); } catch { return { kind: 'refusal', diagnostic: 'M12_ARGS_JSON' }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { kind: 'refusal', diagnostic: 'M12_ARGS_OBJECT' };
  const raw = parsed as Record<string, unknown>;
  const allowed = new Set(['project', 'module', 'scope', 'target', 'force']);
  const unknown = Object.keys(raw).find(key => !allowed.has(key));
  if (unknown) return { kind: 'refusal', diagnostic: `M12_ARGS_UNKNOWN: ${unknown}` };
  const project = typeof raw.project === 'number' ? raw.project : Number.NaN;
  if (!Number.isSafeInteger(project) || project <= 0) return { kind: 'refusal', diagnostic: 'M12_ARGS_PROJECT' };
  if (project !== currentProject) return { kind: 'refusal', diagnostic: `M12_ARGS_PROJECT_MISMATCH: ${project} != ${currentProject}` };
  const moduleName = typeof raw.module === 'string' ? raw.module : '';
  if (!tokenOk(moduleName)) return { kind: 'refusal', diagnostic: 'M12_ARGS_MODULE' };
  const scope = typeof raw.scope === 'string' ? raw.scope : '';
  const target = typeof raw.target === 'string' ? raw.target : '';
  if (!scopeOk(scope) || (scope && target)) return { kind: 'refusal', diagnostic: 'M12_ARGS_SELECTOR' };
  return { kind: 'run', project, module: moduleName, scope, target, force: raw.force === true };
}

export function runArgsJson(args: M12RunArgs): string {
  return JSON.stringify({ project: args.project, module: args.module, scope: args.scope, target: args.target, force: args.force });
}

export function phasePlanId(stepId: M12StepId, moduleName: string): string {
  return `${stepId}-${moduleName}`;
}

export function isM12PhasePlanId(value: string): boolean {
  return M12_STEP_IDS.some(stepId => value.startsWith(`${stepId}-`));
}

/**
 * Sequential phase steps: for each module, the selected layers, then the l5 registration when the whole
 * module is in scope, then its report. Every step waits for the previous one; a phase that hosts LLM
 * workers stays open until they finish, so `dependsOn` really waits for the generated files.
 */
export function buildM12PlannedSteps(
  project: number,
  request: M12Request,
  modules: ReadonlyArray<{ module: string; layers: readonly M12Layer[]; register: boolean }>,
): mls.msg.AIAgentStep[] {
  const steps: mls.msg.AIAgentStep[] = [];
  let previous = '';
  for (const item of modules) {
    const args: M12RunArgs = { project, module: item.module, scope: request.scope, target: request.target, force: request.force };
    const stepIds: M12StepId[] = [
      ...M12_LAYERS.filter(layer => item.layers.includes(layer)).map(layer => LAYER_STEP[layer]),
      ...(item.register ? ['register70' as const] : []),
      'finalize80',
    ];
    for (const stepId of stepIds) {
      const planId = phasePlanId(stepId, item.module);
      const dependsOn = previous ? [previous] : [];
      steps.push({
        type: 'agent',
        stepId: 0,
        interaction: null,
        stepTitle: `${STEP_TITLE[stepId]} (${item.module})`,
        status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
        nextSteps: [],
        agentName: STEP_AGENT[stepId],
        prompt: runArgsJson(args),
        rags: [],
        planning: { planId, dependsOn, executionMode: 'sequential', executionHost: 'client' },
      } as mls.msg.AIAgentStep);
      previous = planId;
    }
  }
  return steps;
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Trace strings live in the task record: keep them bounded. */
export function clip(text: string, max = 1500): string {
  return text.length > max ? `${text.slice(0, max)}…(+${text.length - max})` : text;
}
