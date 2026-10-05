/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Fanout.ts" enhancement="_blank"/>

import {
  D1_AGENT_NAME,
  D1_MAX_PARALLEL,
  D1_REPAIR_GLOBAL_MAX,
  D1_REPAIR_PER_UNIT,
  dynamicPlanId,
  repairAllowed,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { planIdOf } from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';

/**
 * Fan-out, barrier and repair of a D1 step that sends one worker per unit to the model (usecases50, resolve25).
 * The step names its unit key; the plan ids, the worker arg and the repair rule are the same for every step.
 */

export const FANOUT_TITLE = 'Generating {{completed}}/{{total}} items, failed {{failed}}';

export interface D1FanoutConfig {
  stepId: D1StepId;
  /** Arg key that carries the unit id (`usecaseId`, `unitId`). */
  unitKey: string;
  /** Done-anchor the fan-out waits on. */
  after: string;
  /** Plural noun of the trace `queued N <step> <noun>`. */
  noun: string;
  /** Title of the barrier step. */
  barrierTitle: string;
}

export interface D1FanoutArg {
  planId: string;
  moduleName: string;
  project: number;
  unitId: string;
  attempt: number;
  unitAttempts: number;
  globalAttempts: number;
  feedback: string;
}

export interface D1FanoutAttempt {
  unitId: string;
  status: 'parsed' | 'repairable' | 'operational';
  trace: string;
  unitAttempts: number;
}

export interface D1FanoutRepair {
  unitId: string;
  unitAttempts: number;
  globalAttempts: number;
  planId: string;
  feedback: string;
}

export interface D1FanoutDecision {
  repairs: D1FanoutRepair[];
  identified: Array<{ unitId: string; trace: string; code: string }>;
  pause: boolean;
}

const BASE_KEYS = ['attempt', 'feedback', 'globalAttempts', 'moduleName', 'planId', 'project', 'unitAttempts'];

/** Compact, stable JSON. One arg is one unit. */
export function fanoutWorkerArg(config: D1FanoutConfig, arg: D1FanoutArg): string {
  const body: Record<string, string | number> = {
    attempt: arg.attempt,
    globalAttempts: arg.globalAttempts,
    moduleName: arg.moduleName,
    planId: arg.planId,
    project: arg.project,
    unitAttempts: arg.unitAttempts,
    [config.unitKey]: arg.unitId,
  };
  if (arg.feedback) body.feedback = arg.feedback;
  return JSON.stringify(body);
}

export function parseFanoutWorkerArg(config: D1FanoutConfig, value: string): D1FanoutArg | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  for (const key of Object.keys(parsed)) {
    if (!BASE_KEYS.includes(key) && key !== config.unitKey) return null;
  }
  const planId = typeof parsed.planId === 'string' ? parsed.planId : '';
  const moduleName = typeof parsed.moduleName === 'string' ? parsed.moduleName : '';
  const rawUnit = parsed[config.unitKey];
  const unitId = typeof rawUnit === 'string' ? rawUnit : '';
  const project = parsed.project;
  if (!planId || !moduleName || !unitId) return null;
  if (typeof project !== 'number' || !Number.isInteger(project) || project <= 0) return null;
  const workerId = planId === `${config.stepId}-worker-${unitId}`;
  const repairId = new RegExp(`^${config.stepId}-repair-\\d+$`).test(planId);
  if (!workerId && !repairId) return null;
  return {
    planId,
    moduleName,
    project,
    unitId,
    attempt: numberOr(parsed.attempt),
    unitAttempts: numberOr(parsed.unitAttempts),
    globalAttempts: numberOr(parsed.globalAttempts),
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
  };
}

export function firstFanoutWorkerArg(config: D1FanoutConfig, project: number, moduleName: string, unitId: string): string {
  return fanoutWorkerArg(config, {
    planId: dynamicPlanId(config.stepId, 'worker', unitId),
    moduleName,
    project,
    unitId,
    attempt: 0,
    unitAttempts: 0,
    globalAttempts: 0,
    feedback: '',
  });
}

export function fanoutStepFor(config: D1FanoutConfig, project: number, moduleName: string, args: readonly string[]): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    // Same parent interaction as agentNewSolution5 parallelEntityStep. The host
    // refuses a parallel child update-status, and will not start the child LLM,
    // when this step has progress and no interaction.
    interaction: {
      input: [{ type: 'system', content: '<!-- modelType: reasoning -->' }],
      cost: 0,
      trace: [`queued ${args.length} ${config.stepId} ${config.noun} with maxParallel=${D1_MAX_PARALLEL}`],
      payload: null,
    },
    stepTitle: FANOUT_TITLE,
    status: 'in_progress',
    nextSteps: [],
    agentName: D1_AGENT_NAME,
    prompt: JSON.stringify({ planId: dynamicPlanId(config.stepId, 'fanout', ''), moduleName, project, command: 'run' }),
    rags: [],
    onFailure: 'continue',
    progress: { total: args.length, completed: 0, failed: 0, templateTitle: FANOUT_TITLE },
    planning: {
      planId: dynamicPlanId(config.stepId, 'fanout', ''),
      dependsOn: [config.after],
      executionMode: 'parallel_dynamic',
      executionHost: 'client',
    },
  };
}

export function fanoutExecution(args: readonly string[]): mls.msg.ExecutionMode {
  return { type: 'parallel', args: [...args], maxParallel: D1_MAX_PARALLEL };
}

/**
 * The host marks a parallel parent completed and does not call its afterPrompt.
 * This step depends on the fan-out, so the host unlocks it and runs beforePrompt.
 * A later round depends on the repair plan ids from the round it follows.
 */
export function barrierStepFor(config: D1FanoutConfig, project: number, moduleName: string, dependsOn: readonly string[], round: string): mls.msg.AIAgentStep {
  const planId = dynamicPlanId(config.stepId, 'barrier', round);
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: round ? `${config.barrierTitle} ${round}` : config.barrierTitle,
    status: 'waiting_dependency',
    nextSteps: [],
    agentName: D1_AGENT_NAME,
    prompt: JSON.stringify({ planId, moduleName, project, command: 'run' }),
    rags: [],
    onFailure: 'continue',
    planning: {
      planId,
      dependsOn: [...dependsOn],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

/**
 * One repair per unit, and no more than the global ceiling.
 * An operational failure is identified and does not take a repair.
 * A missing trace is still identified.
 */
export function decideFanoutRepairs(config: D1FanoutConfig, input: {
  expected: readonly string[];
  attempts: readonly D1FanoutAttempt[];
  globalAttempts: number;
  feedbackFor: (unitId: string) => string;
}): D1FanoutDecision {
  const repairs: D1FanoutRepair[] = [];
  const identified: D1FanoutDecision['identified'] = [];
  let pause = false;
  let global = input.globalAttempts;
  for (const unitId of input.expected) {
    const attempt = input.attempts.find(item => item.unitId === unitId);
    const trace = attempt?.trace?.trim() ? attempt.trace : 'missing trace';
    if (!attempt || attempt.status === 'operational') {
      identified.push({ unitId, trace, code: 'OPERATIONAL' });
      pause = true;
      continue;
    }
    if (attempt.status === 'parsed') continue;
    const unitAttempts = attempt.unitAttempts;
    if (!repairAllowed(unitAttempts, global) || unitAttempts >= D1_REPAIR_PER_UNIT || global >= D1_REPAIR_GLOBAL_MAX) {
      identified.push({ unitId, trace, code: 'REPAIR_EXHAUSTED' });
      continue;
    }
    global += 1;
    repairs.push({
      unitId,
      unitAttempts: unitAttempts + 1,
      globalAttempts: global,
      planId: dynamicPlanId(config.stepId, 'repair', String(global)),
      feedback: input.feedbackFor(unitId),
    });
  }
  return { repairs, identified, pause };
}

export function repairStepFor(config: D1FanoutConfig, project: number, moduleName: string, order: D1FanoutRepair): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: `Repair ${order.unitId}`,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: D1_AGENT_NAME,
    prompt: fanoutWorkerArg(config, {
      planId: order.planId,
      moduleName,
      project,
      unitId: order.unitId,
      attempt: order.unitAttempts,
      unitAttempts: order.unitAttempts,
      globalAttempts: order.globalAttempts,
      feedback: order.feedback,
    }),
    rags: [],
    onFailure: 'continue',
    planning: {
      planId: order.planId,
      dependsOn: [dynamicPlanId(config.stepId, 'fanout', '')],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

/** A repair for this unit is still open in the task. */
export function fanoutRepairOpen(config: D1FanoutConfig, context: mls.msg.ExecutionContext, unitId: string): boolean {
  return allTaskSteps(context).some(item => {
    if (item.type !== 'agent') return false;
    if (item.status === 'completed' || item.status === 'failed') return false;
    const arg = parseFanoutWorkerArg(config, item.prompt || '');
    return arg?.unitId === unitId && arg.planId.startsWith(`${config.stepId}-repair-`);
  });
}

export function isFanoutBarrier(config: D1FanoutConfig, planId: string): boolean {
  return planId === `${config.stepId}-barrier` || new RegExp(`^${config.stepId}-barrier-\\d+$`).test(planId);
}

export function parseFanoutBarrier(config: D1FanoutConfig, prompt: string): { project: number; moduleName: string } | null {
  try {
    const parsed = JSON.parse(prompt) as unknown;
    if (!isRecord(parsed) || typeof parsed.planId !== 'string' || !isFanoutBarrier(config, parsed.planId)) return null;
    if (typeof parsed.project !== 'number' || typeof parsed.moduleName !== 'string') return null;
    return { project: parsed.project, moduleName: parsed.moduleName };
  } catch {
    return null;
  }
}

/** The tool reply of a worker step. `key` is the property the reply must carry. */
export function unwrapToolPayload(step: mls.msg.AIAgentStep, key: string): { present: boolean; value: unknown } {
  const first = step.interaction?.payload?.[0];
  if (first === undefined || first === null) return { present: false, value: undefined };
  return { present: true, value: unwrapToolValue(first, key) };
}

function unwrapToolValue(value: unknown, key: string): unknown {
  if (typeof value === 'string') {
    try {
      return unwrapToolValue(JSON.parse(value) as unknown, key);
    } catch {
      return undefined;
    }
  }
  if (!isRecord(value)) return undefined;
  if (key in value) return value;
  if (typeof value.args === 'string') return unwrapToolValue(value.args, key);
  if (value.arguments !== undefined) return unwrapToolValue(value.arguments, key);
  if (isRecord(value.function) && value.function.arguments !== undefined) return unwrapToolValue(value.function.arguments, key);
  if (value.result !== undefined) return unwrapToolValue(value.result, key);
  return undefined;
}

export function planIdFromText(prompt: string): string {
  try {
    const parsed = JSON.parse(prompt) as unknown;
    if (!isRecord(parsed) || typeof parsed.planId !== 'string') return '';
    return parsed.planId;
  } catch {
    return '';
  }
}

export function addStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

export function findOpenParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const current = allTaskSteps(context).find(item => item.stepId === parentStep.stepId);
  if (current?.type === 'agent' && current.status !== 'completed' && current.status !== 'failed') return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

export function planPresent(context: mls.msg.ExecutionContext, planId: string): boolean {
  return allTaskSteps(context).some(item => planIdOf(item as mls.msg.AIAgentStep) === planId);
}

export function findPlanStep(context: mls.msg.ExecutionContext, planId: string): mls.msg.AIAgentStep | null {
  const found = allTaskSteps(context).find(item => item.type === 'agent' && item.planning?.planId === planId);
  return found?.type === 'agent' ? found : null;
}

export function allTaskSteps(context: mls.msg.ExecutionContext): mls.msg.AIPayload[] {
  const root = context.task?.iaCompressed?.nextSteps || [];
  const out: mls.msg.AIPayload[] = [];
  const walk = (steps: mls.msg.AIPayload[]) => {
    for (const step of steps) {
      out.push(step);
      if (step.nextSteps?.length) walk(step.nextSteps);
    }
  };
  walk(root);
  return out;
}

function numberOr(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}
