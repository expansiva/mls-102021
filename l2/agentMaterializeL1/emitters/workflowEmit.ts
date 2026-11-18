/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/workflowEmit.ts" enhancement="_blank"/>

// The mechanical files of the workflow service of a module (materializadorL1.md §13): the module engine and the
// step tables every process function uses, and the module tick that runs the scheduled processes. The functions
// themselves are written by the model from the l4 prose (steps/workflows45).

import { workflowRecoverName, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

const PLATFORM_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';
const WORKFLOW_ENGINE = '/_102034_/l1/workflow/index.js';
const CBE_RELEASE = '/_102034_/l1/server/layer_1_external/cbe/cbeRelease.js';
const ALPHA_AUTHORITIES = '/_102034_/l1/server/layer_1_external/config/alphaAuthorities.js';
const STEP_KINDS = new Set(['human', 'mechanical', 'llm', 'wait', 'alert']);

/** The module engine over a supplied Task port, the plan of each process, and the destination status of each operation. */
export function workflowEngineFile(project: number, moduleName: string): M12FileInfo {
  return { project, level: 1, folder: `${moduleName}/layer_1_external/adapters/workflow`, shortName: 'engine', extension: '.ts' };
}

export interface WorkflowStepEmit {
  stepId: string;
  kind: string;
  title: string;
  actorRef?: string;
  journeyRef?: string;
  next: string[];
  /** Page address and the URL param that opens the record, for a human step whose page resolved. */
  params?: { page: string; recordParam: string };
  /** `wake.mode` of a wait step. Not copied into the plan. */
  wakeMode?: string;
}

export interface WorkflowTableEmit {
  processId: string;
  title: string;
  moduleTitle: string;
  /** Entity of the occurrence record: the first `entityRef` reached from the start step. */
  recordEntity?: string;
  steps: WorkflowStepEmit[];
}

/** The module tick, next to the module's composition root (the persistence folder the runtime already loads). */
export function moduleTickFile(project: number, moduleName: string): M12FileInfo {
  return { project, level: 1, folder: `${moduleName}/layer_1_external/adapters/persistence`, shortName: 'moduleTick', extension: '.ts' };
}

export function workflowFile(project: number, moduleName: string, processId: string): M12FileInfo {
  return { project, level: 1, folder: `${moduleName}/layer_2_application/workflows`, shortName: processId, extension: '.ts' };
}

export function moduleSpecifier(info: M12FileInfo): string {
  return `/_${info.project}_/l${info.level}/${info.folder}/${info.shortName}.js`;
}

function jsonObject(source: string | null): Record<string, unknown> | undefined {
  const match = source ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(source) : null;
  if (!match) return undefined;
  try {
    const value: unknown = JSON.parse(match[1]);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

/**
 * The engine refuses a target that `next` cannot reach. A failing or invalid `llm` step returns to the
 * previous human step, which L4 cannot declare (a cycle needs `wait`). Only a process that has an `llm`
 * step gains that edge, on each `mechanical` and `llm` step. The nearest humans win; ties all enter.
 * The L4 order stays first and a step is never repeated. A process without `llm` is left untouched.
 */
function addReturnToPreviousHuman(steps: WorkflowStepEmit[]): void {
  if (!steps.some(step => step.kind === 'llm')) return;
  const byId = new Map(steps.map(step => [step.stepId, step]));
  const incoming = new Map<string, string[]>();
  for (const step of steps) {
    for (const next of step.next) {
      const list = incoming.get(next) ?? [];
      list.push(step.stepId);
      incoming.set(next, list);
    }
  }
  for (const step of steps) {
    if (step.kind !== 'mechanical' && step.kind !== 'llm') continue;
    const have = new Set(step.next);
    for (const human of nearestHumans(step.stepId, incoming, byId)) {
      if (have.has(human)) continue;
      step.next.push(human);
      have.add(human);
    }
  }
}

function nearestHumans(
  start: string,
  incoming: ReadonlyMap<string, readonly string[]>,
  byId: ReadonlyMap<string, WorkflowStepEmit>,
): string[] {
  let frontier = [...(incoming.get(start) ?? [])];
  const seen = new Set<string>([start]);
  while (frontier.length > 0) {
    const humans: string[] = [];
    const nextFrontier: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (byId.get(id)?.kind === 'human') humans.push(id);
      else nextFrontier.push(...(incoming.get(id) ?? []));
    }
    if (humans.length > 0) return humans;
    frontier = nextFrontier;
  }
  return [];
}

/** Step tables copied from `processes[].tasks[]` of an l4 workflows source. `taskId` becomes `stepId`. */
export function workflowTablesFromL4(source: string | null): WorkflowTableEmit[] {
  const root = jsonObject(source);
  const processes = root?.processes;
  const moduleTitle = typeof root?.moduleName === 'string' && root.moduleName ? root.moduleName : '';
  if (!Array.isArray(processes)) return [];
  const tables: WorkflowTableEmit[] = [];
  for (const process of processes) {
    if (!process || typeof process !== 'object') continue;
    const row = process as Record<string, unknown>;
    const processId = typeof row.processId === 'string' ? row.processId : '';
    if (!processId || !Array.isArray(row.tasks)) continue;
    const title = typeof row.title === 'string' && row.title ? row.title : processId;
    const steps: WorkflowStepEmit[] = [];
    const entityOf = new Map<string, string>();
    for (const task of row.tasks) {
      if (!task || typeof task !== 'object') continue;
      const item = task as Record<string, unknown>;
      const stepId = typeof item.taskId === 'string' ? item.taskId : '';
      const kind = typeof item.kind === 'string' ? item.kind : '';
      if (!stepId || !STEP_KINDS.has(kind)) continue;
      const stepTitle = typeof item.title === 'string' && item.title
        ? item.title
        : typeof item.description === 'string' && item.description ? item.description : stepId;
      const step: WorkflowStepEmit = { stepId, kind, title: stepTitle, next: textList(item.next) };
      if (typeof item.actorRef === 'string' && item.actorRef) step.actorRef = item.actorRef;
      if (typeof item.journeyRef === 'string' && item.journeyRef) step.journeyRef = item.journeyRef;
      const wake = item.wake;
      if (wake && typeof wake === 'object' && typeof (wake as { mode?: unknown }).mode === 'string') step.wakeMode = (wake as { mode: string }).mode;
      steps.push(step);
      if (typeof item.entityRef === 'string' && item.entityRef) entityOf.set(stepId, item.entityRef);
    }
    const recordEntity = firstRecordEntity(steps, entityOf);
    addReturnToPreviousHuman(steps);
    tables.push({ processId, title, moduleTitle: moduleTitle || processId, ...(recordEntity ? { recordEntity } : {}), steps });
  }
  return tables;
}

/**
 * Destination status (`to`) of each transition in the ontology sources.
 * `only` limits the copy to the transition ids of the process operations.
 */
export function transitionDestinations(sources: readonly (string | null)[], only?: ReadonlySet<string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const source of sources) {
    const transitions = jsonObject(source)?.transitions;
    if (!Array.isArray(transitions)) continue;
    for (const transition of transitions) {
      if (!transition || typeof transition !== 'object') continue;
      const row = transition as Record<string, unknown>;
      const id = typeof row.transitionId === 'string' ? row.transitionId : '';
      const to = typeof row.to === 'string' ? row.to : '';
      if (!id || !to || (only && !only.has(id))) continue;
      out[id] = to;
    }
  }
  return out;
}

function ident(id: string): string {
  return /^[A-Za-z_$][\w$]*$/u.test(id) ? id : JSON.stringify(id);
}

function stepLiteral(step: WorkflowStepEmit): string {
  const fields = [
    `stepId: ${JSON.stringify(step.stepId)}`,
    `kind: ${JSON.stringify(step.kind)}`,
    `title: ${JSON.stringify(step.title)}`,
  ];
  if (step.actorRef) fields.push(`actorRef: ${JSON.stringify(step.actorRef)}`);
  if (step.journeyRef) fields.push(`journeyRef: ${JSON.stringify(step.journeyRef)}`);
  fields.push(`next: ${JSON.stringify(step.next)}`);
  if (step.params) fields.push(`params: { page: ${JSON.stringify(step.params.page)}, recordParam: ${JSON.stringify(step.params.recordParam)} }`);
  return `    { ${fields.join(', ')} },`;
}

/** Person of a human step. Emitted only when some process has a `human` step; one `.defs` still yields one `engine.ts`. */
function resolveStepPersonSource(moduleName: string): string[] {
  const moduleId = JSON.stringify(moduleName);
  return [
    'export interface StepPersonHistory { step: string; actorNow: string | null; executor: { kind: string; mdmId?: string } }',
    'export interface StepPersonInput { actorRef: string; step: string; history?: readonly StepPersonHistory[] }',
    '',
    '/** The person who must act on a human step. Always a non-empty MDM id. */',
    'export async function resolveStepPerson(ctx: RequestContext, input: StepPersonInput): Promise<string> {',
    `  const caller = ctx.sessionContext?.actorScope?.includes(${moduleId} + ':' + input.actorRef) ? ctx.sessionContext.person?.mdmId : undefined;`,
    '  if (caller) return caller;',
    '  const steps = new Set<string>();',
    // Typed as the plan input: a plan whose steps carry no `actorRef` would otherwise make the union of literals lack it (TS2339).
    '  for (const plan of Object.values(workflowPlans) as readonly WorkflowPlanInput[]) {',
    '    for (const item of plan.steps) {',
    '      if (item.actorRef === input.actorRef) steps.add(item.stepId);',
    '    }',
    '  }',
    '  let acted: string | undefined;',
    '  let lastActorNow: string | null = null;',
    '  for (const entry of input.history ?? []) {',
    '    if (!steps.has(entry.step)) continue;',
    '    lastActorNow = entry.actorNow;',
    "    if (entry.executor.kind === 'person' && entry.executor.mdmId) acted = entry.executor.mdmId;",
    '  }',
    '  if (acted) return acted;',
    '  if (lastActorNow) return lastActorNow;',
    '  if (isAlphaAllAuthorities()) {',
    '    // The first member that is not an agent: an agent member is never the person of a human step.',
    '    const page = await ctx.mdm.identity.listUsers({ pageSize: 200 });',
    "    const first = page.items.find(item => (item as { kind?: string }).kind !== 'agent')?.mdmId;",
    '    if (first) return first;',
    '  }',
    "  throw new AppError('WORKFLOW_ACTOR_PERSON_UNKNOWN', `No person is known for actor ${input.actorRef} at step ${input.step}.`, 409, { actorRef: input.actorRef, step: input.step });",
    '}',
    '',
  ];
}

function planLiteral(table: WorkflowTableEmit): string[] {
  return [
    `  ${ident(table.processId)}: {`,
    `    processId: ${JSON.stringify(table.processId)},`,
    `    title: ${JSON.stringify(table.title)},`,
    `    moduleTitle: ${JSON.stringify(table.moduleTitle)},`,
    '    steps: [',
    ...table.steps.map(stepLiteral),
    '    ],',
    '  } satisfies WorkflowPlanInput,',
  ];
}

/**
 * The module engine receives the Task port from whoever constructs it (`createModuleWorkflowEngine(port)`).
 * Plans of every process go on `open`. Advance does not take a table.
 */
export function workflowEngineSource(project: number, moduleName: string, tables: readonly WorkflowTableEmit[], targets: Readonly<Record<string, string>>): string {
  const info = workflowEngineFile(project, moduleName);
  const targetLines = Object.keys(targets).sort().map(id => `  ${ident(id)}: ${JSON.stringify(targets[id])},`);
  const llm = tables.some(table => table.steps.some(step => step.kind === 'llm'));
  const human = tables.some(table => table.steps.some(step => step.kind === 'human'));
  const portType = llm ? 'TaskOccurrenceLlmPort' : 'TaskOccurrencePort';
  const engineType = llm ? 'TaskWorkflowLlmEngine' : 'TaskWorkflowEngine';
  const llmTypes = llm ? ', type TaskWorkflowLlmStep' : '';
  const ownerBranch = llm
    ? "  } else if (owner === 'module' || owner === 'agent') {"
    : "  } else if (owner === 'module') {";
  return [
    `/// <mls fileReference="_${project}_/l1/${info.folder}/${info.shortName}.ts" enhancement="_blank"/>`,
    `import { AppError, type RequestContext } from '${PLATFORM_CONTRACTS}';`,
    `import { getRunningRelease } from '${CBE_RELEASE}';`,
    ...(human ? [`import { isAlphaAllAuthorities } from '${ALPHA_AUTHORITIES}';`] : []),
    `import { createRuntimeMessagesTaskPort, createWorkflowEngine, ownerOf, type OccurrenceKey, type ${portType}, type TaskWorkflowAdvance, type ${engineType}${llmTypes}, type TaskWorkflowOpen, type WorkflowPlanInput, type WorkflowWakeRequest } from '${WORKFLOW_ENGINE}';`,
    '',
    '// Generated by agentMaterializeL1 (materializadorL1.md §13). workflowEngine runs on the cm Task port; createModuleWorkflowEngine takes any Task port (tests).',
    '',
    'export const workflowPlans = {',
    ...tables.flatMap(planLiteral),
    '};',
    '',
    '/** Destination status of each process-operation transition (ontology `to`), for a retry after a partial failure. */',
    'export const transitionTo = {',
    ...targetLines,
    '} as const satisfies Readonly<Record<string, string>>;',
    '',
    '/** The operations that have a destination status. A name outside this union does not compile. */',
    'export type TransitionKey = keyof typeof transitionTo;',
    '',
    'export function destinationOf(operation: TransitionKey): string {',
    '  return transitionTo[operation];',
    '}',
    '',
    "/** The notice result as returned: only `sent` is sent; `pending` or absent stays pending (uncertain is not sent). */",
    "export function noticeState(moduleMessage?: { state: 'sent' | 'pending' }): 'sent' | 'pending' {",
    "  return moduleMessage?.state === 'sent' ? 'sent' : 'pending';",
    '}',
    '',
    '/** The owner of the step entered decides what goes with the command: a person gets the notice; the clock keeps the wake the process asks for (absent stays absent). */',
    'function withOwnerAction<T extends { message?: { content: string }; wake?: WorkflowWakeRequest }>(plan: WorkflowPlanInput, stepId: string, key: OccurrenceKey, command: T): T {',
    '  const next = { ...command };',
    "  if (stepId === 'end') {",
    '    delete next.message;',
    '    delete next.wake;',
    '    return next;',
    '  }',
    '  const step = plan.steps.find(item => item.stepId === stepId);',
    "  if (!step) throw new AppError('WORKFLOW_INCOMPATIBLE', 'This release does not know the step.', 409, { task: key.recordId, step: stepId, release: getRunningRelease()?.id ?? null });",
    '  const owner = ownerOf(step.kind);',
    "  if (owner === 'person') {",
    '    next.message = command.message ?? { content: step.title };',
    '    delete next.wake;',
    "  } else if (owner === 'clock') {",
    '    delete next.message;',
    ownerBranch,
    '    delete next.message;',
    '    delete next.wake;',
    '  } else {',
    "    throw new AppError('STEP_OWNER_NOT_SUPPORTED', 'This release has no owner action for the step.', 501, { task: key.recordId, step: stepId, owner });",
    '  }',
    '  return next;',
    '}',
    '',
    '/** The module engine over the Task port its creator supplies. Every open carries the plan of this release; advance takes no table. */',
    `export function createModuleWorkflowEngine(port: ${portType}): ${engineType} {`,
    '  const engine = createWorkflowEngine(port);',
    '  const planOf = (key: OccurrenceKey): WorkflowPlanInput => {',
    '    const plan = (workflowPlans as Record<string, WorkflowPlanInput>)[key.processId];',
    "    if (!plan) throw new AppError('WORKFLOW_INCOMPATIBLE', 'This release does not know the process.', 409, { task: key.recordId, release: getRunningRelease()?.id ?? null });",
    '    return plan;',
    '  };',
    '  return {',
    '    async open(ctx: RequestContext, input: TaskWorkflowOpen) {',
    '      const plan = planOf(input.key);',
    '      return engine.open(ctx, withOwnerAction(plan, input.firstStep, input.key, { ...input, plan }));',
    '    },',
    '    async advance(ctx: RequestContext, key: OccurrenceKey, command: TaskWorkflowAdvance) {',
    '      return engine.advance(ctx, key, withOwnerAction(planOf(key), command.to, key, command));',
    '    },',
    '    find(ctx: RequestContext, key: OccurrenceKey) {',
    '      return engine.find(ctx, key);',
    '    },',
    ...(llm ? [
      '    requestLlmStep(ctx: RequestContext, input: TaskWorkflowLlmStep) {',
      '      return engine.requestLlmStep(ctx, input);',
      '    },',
    ] : []),
    '  };',
    '}',
    '',
    '/** Production engine. projectId and moduleId are this module at bootstrap; the factory owns identity and the caller id. */',
    'export const workflowEngine = createModuleWorkflowEngine(createRuntimeMessagesTaskPort({',
    `  projectId: ${JSON.stringify(String(project))},`,
    `  moduleId: ${JSON.stringify(moduleName)},`,
    '}));',
    '',
    ...(human ? resolveStepPersonSource(moduleName) : []),
  ].join('\n');
}

/**
 * The module tick: the minute the platform lends (`moduleTick.ts` of 102034) runs every scheduled process of the
 * module, each through the `onTick` its workflow file exports. A failing process is logged and the others still run.
 */
export interface TickRecovery {
  processId: string;
  fn: string;
}

export function moduleTickSource(project: number, moduleName: string, processIds: readonly string[], recoveries: readonly TickRecovery[] = []): string {
  const info = moduleTickFile(project, moduleName);
  const recoveryOf = new Map(recoveries.map(item => [item.processId, item.fn]));
  const imports = [
    ...processIds.map(processId => {
      const recover = recoveryOf.get(processId);
      const names = recover ? `onTick as ${processId}Tick, ${recover}` : `onTick as ${processId}Tick`;
      return `import { ${names} } from '${moduleSpecifier(workflowFile(project, moduleName, processId))}';`;
    }),
    ...recoveries.filter(item => !processIds.includes(item.processId)).map(item => `import { ${item.fn} } from '${moduleSpecifier(workflowFile(project, moduleName, item.processId))}';`),
  ];
  return [
    `/// <mls fileReference="_${project}_/l1/${info.folder}/${info.shortName}.ts" enhancement="_blank"/>`,
    `import type { RequestContext } from '${PLATFORM_CONTRACTS}';`,
    ...imports,
    '',
    '// Generated by agentMaterializeL1 (materializadorL1.md §11): the scheduled processes of the module.',
    'export async function onTick(ctx: RequestContext, now: Date): Promise<void> {',
    ...processIds.flatMap(processId => [
      '  try {',
      `    await ${processId}Tick(ctx, now);`,
      '  } catch (error) {',
      `    ctx.log.error('TICK_FAILED: ${moduleName}.${processId}', { error: error instanceof Error ? error.message : String(error) });`,
      '  }',
    ]),
    ...recoveries.flatMap(item => [
      '  try {',
      `    await ${item.fn}(ctx);`,
      '  } catch (error) {',
      `    ctx.log.error('TICK_FAILED: ${moduleName}.${item.fn}', { error: error instanceof Error ? error.message : String(error) });`,
      '  }',
    ]),
    '}',
    '',
  ].join('\n');
}

export function tickRecoveries(tables: readonly WorkflowTableEmit[]): TickRecovery[] {
  return tables
    .filter(table => table.steps.some(step => step.kind === 'llm'))
    .map(table => ({ processId: table.processId, fn: workflowRecoverName(table.processId) }));
}

export interface HumanPageSource {
  pageId: string;
  source: string;
}

/**
 * Page address of each human step. The record is the first `entityRef` reached from the start step.
 * The page is the first, by `pageId`, whose journey starts with `<journeyRef>/` and whose URL param
 * is `<lowerCamel(entity)>Id`. No entity, no page, or no route: the step stays without `params`.
 */
export function bindHumanPages(tables: readonly WorkflowTableEmit[], pages: readonly HumanPageSource[], configText: string | null, moduleName: string): { tables: WorkflowTableEmit[]; unresolved: string[] } {
  const catalog = pages.map(page => ({ pageId: page.pageId, root: jsonObject(page.source) }));
  const unresolved: string[] = [];
  const next = tables.map(table => {
    if (!table.recordEntity) {
      if (table.steps.some(step => step.kind === 'human')) unresolved.push(`RECORD_ENTITY_MISSING: ${table.processId}`);
      return table;
    }
    const recordParam = `${lowerFirst(table.recordEntity)}Id`;
    return {
      ...table,
      steps: table.steps.map(step => {
        if (step.kind !== 'human') return step;
        const bound = step.journeyRef ? resolveHumanPage(catalog, step.journeyRef, recordParam, configText, moduleName) : undefined;
        if (!bound) {
          unresolved.push(`${table.processId}/${step.stepId}`);
          return step;
        }
        return { ...step, params: bound };
      }),
    };
  });
  return { tables: next, unresolved };
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

/** First `entityRef` on the walk that starts at the step nobody points to and follows `next`. */
function firstRecordEntity(steps: readonly WorkflowStepEmit[], entityOf: ReadonlyMap<string, string>): string | undefined {
  const pointed = new Set(steps.flatMap(step => step.next));
  const start = steps.find(step => !pointed.has(step.stepId)) ?? steps[0];
  if (!start) return undefined;
  const byId = new Map(steps.map(step => [step.stepId, step]));
  const queue = [start.stepId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const named = entityOf.get(id);
    if (named) return named;
    const step = byId.get(id);
    if (step) queue.push(...step.next);
  }
  return undefined;
}

function urlRecordParam(root: Record<string, unknown> | undefined, recordParam: string): boolean {
  const entry = root?.entry;
  if (!entry || typeof entry !== 'object') return false;
  const params = (entry as { params?: unknown }).params;
  if (!params || typeof params !== 'object' || Array.isArray(params)) return false;
  const spec = (params as Record<string, unknown>)[recordParam];
  if (!spec || typeof spec !== 'object') return false;
  const sources = (spec as { sources?: unknown }).sources;
  return Array.isArray(sources) && sources.includes('url');
}

function resolveHumanPage(catalog: readonly { pageId: string; root: Record<string, unknown> | undefined }[], journeyRef: string, recordParam: string, configText: string | null, moduleName: string): { page: string; recordParam: string } | undefined {
  const ordered = [...catalog].sort((a, b) => a.pageId < b.pageId ? -1 : a.pageId > b.pageId ? 1 : 0);
  for (const page of ordered) {
    if (!urlRecordParam(page.root, recordParam) || !journeyStarts(page.root, journeyRef)) continue;
    const address = pageAddress(configText, moduleName, page.pageId);
    if (address) return { page: address, recordParam };
  }
  return undefined;
}

function journeyStarts(root: Record<string, unknown> | undefined, journeyRef: string): boolean {
  const journeys = root?.journeys;
  if (!Array.isArray(journeys)) return false;
  return journeys.some(item => {
    if (!item || typeof item !== 'object') return false;
    const step = (item as { step?: unknown }).step;
    return typeof step === 'string' && step.startsWith(`${journeyRef}/`);
  });
}

function pageAddress(configText: string | null, moduleName: string, pageId: string): string | undefined {
  if (!configText) return undefined;
  let config: unknown;
  try {
    config = JSON.parse(configText);
  } catch {
    return undefined;
  }
  if (!config || typeof config !== 'object') return undefined;
  const modules = configModules(config as Record<string, unknown>);
  if (!modules) return undefined;
  const mod = modules.find(item => {
    if (!item || typeof item !== 'object') return false;
    const row = item as { moduleId?: unknown; moduleName?: unknown };
    return row.moduleId === moduleName || row.moduleName === moduleName;
  });
  if (!mod || typeof mod !== 'object') return undefined;
  const frontend = (mod as { frontend?: { pages?: unknown } }).frontend;
  const pages = frontend && Array.isArray(frontend.pages) ? frontend.pages : [];
  for (const page of pages) {
    if (!page || typeof page !== 'object') continue;
    const row = page as { pageId?: unknown; route?: unknown };
    if (row.pageId === pageId && typeof row.route === 'string' && row.route) return row.route;
  }
  const navigation = (mod as { navigation?: unknown }).navigation;
  if (!Array.isArray(navigation)) return undefined;
  for (const item of navigation) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { id?: unknown; href?: unknown };
    if (row.id === pageId && typeof row.href === 'string' && row.href) return row.href;
  }
  return undefined;
}

/** Top-level `modules[]` when that array exists; otherwise every `projects[*].modules[]`. */
function configModules(config: Record<string, unknown>): unknown[] | undefined {
  if (Array.isArray(config.modules)) return config.modules;
  const projects = config.projects;
  if (!projects || typeof projects !== 'object') return undefined;
  const modules: unknown[] = [];
  for (const project of Object.values(projects)) {
    if (!project || typeof project !== 'object') continue;
    const rows = (project as { modules?: unknown }).modules;
    if (Array.isArray(rows)) modules.push(...rows);
  }
  return modules.length > 0 ? modules : undefined;
}
