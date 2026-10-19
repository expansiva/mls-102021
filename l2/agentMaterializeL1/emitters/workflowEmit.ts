/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/workflowEmit.ts" enhancement="_blank"/>

// The mechanical files of the workflow service of a module (materializadorL1.md §13): the module engine and the
// step tables every process function uses, and the module tick that runs the scheduled processes. The functions
// themselves are written by the model from the l4 prose (steps/workflows45).

import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

const PLATFORM_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';
const WORKFLOW_ENGINE = '/_102034_/l1/workflow/index.js';
const CBE_RELEASE = '/_102034_/l1/server/layer_1_external/cbe/cbeRelease.js';
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
}

export interface WorkflowTableEmit {
  processId: string;
  title: string;
  moduleTitle: string;
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
      steps.push(step);
    }
    tables.push({ processId, title, moduleTitle: moduleTitle || processId, steps });
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
  return `    { ${fields.join(', ')} },`;
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
  return [
    `/// <mls fileReference="_${project}_/l1/${info.folder}/${info.shortName}.ts" enhancement="_blank"/>`,
    `import { AppError, type RequestContext } from '${PLATFORM_CONTRACTS}';`,
    `import { getRunningRelease } from '${CBE_RELEASE}';`,
    `import { createRuntimeMessagesTaskPort, createWorkflowEngine, ownerOf, type OccurrenceKey, type TaskOccurrencePort, type TaskWorkflowAdvance, type TaskWorkflowEngine, type TaskWorkflowOpen, type WorkflowPlanInput, type WorkflowWakeRequest } from '${WORKFLOW_ENGINE}';`,
    '',
    '// Generated by agentMaterializeL1 (materializadorL1.md §13). workflowEngine runs on the cm Task port; createModuleWorkflowEngine takes any Task port (tests).',
    '',
    'export const workflowPlans = {',
    ...tables.flatMap(planLiteral),
    '};',
    '',
    '/** Destination status of each process-operation transition (ontology `to`), for a retry after a partial failure. */',
    'export const transitionTo: Readonly<Record<string, string>> = {',
    ...targetLines,
    '};',
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
    "  } else if (owner === 'module') {",
    '    delete next.message;',
    '    delete next.wake;',
    '  } else {',
    "    throw new AppError('STEP_OWNER_NOT_SUPPORTED', 'This release has no owner action for the step.', 501, { task: key.recordId, step: stepId, owner });",
    '  }',
    '  return next;',
    '}',
    '',
    '/** The module engine over the Task port its creator supplies. Every open carries the plan of this release; advance takes no table. */',
    'export function createModuleWorkflowEngine(port: TaskOccurrencePort): TaskWorkflowEngine {',
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
    '  };',
    '}',
    '',
    '/** Production engine. projectId and moduleId are this module at bootstrap; the factory owns identity and the caller id. */',
    'export const workflowEngine = createModuleWorkflowEngine(createRuntimeMessagesTaskPort({',
    `  projectId: ${JSON.stringify(String(project))},`,
    `  moduleId: ${JSON.stringify(moduleName)},`,
    '}));',
    '',
  ].join('\n');
}

/**
 * The module tick: the minute the platform lends (`moduleTick.ts` of 102034) runs every scheduled process of the
 * module, each through the `onTick` its workflow file exports. A failing process is logged and the others still run.
 */
export function moduleTickSource(project: number, moduleName: string, processIds: readonly string[]): string {
  const info = moduleTickFile(project, moduleName);
  return [
    `/// <mls fileReference="_${project}_/l1/${info.folder}/${info.shortName}.ts" enhancement="_blank"/>`,
    `import type { RequestContext } from '${PLATFORM_CONTRACTS}';`,
    ...processIds.map(processId => `import { onTick as ${processId}Tick } from '${moduleSpecifier(workflowFile(project, moduleName, processId))}';`),
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
    '}',
    '',
  ].join('\n');
}
