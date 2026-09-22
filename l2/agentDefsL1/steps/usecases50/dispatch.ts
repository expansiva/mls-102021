/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/dispatch.ts" enhancement="_blank"/>

import {
  D1_AGENT_NAME,
  D1_MAX_PARALLEL,
  D1_REPAIR_GLOBAL_MAX,
  D1_REPAIR_PER_UNIT,
  dynamicPlanId,
  repairAllowed,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';

export const FANOUT_TITLE = 'Generating {{completed}}/{{total}} items, failed {{failed}}';

const ARG_KEYS = ['attempt', 'feedback', 'globalAttempts', 'moduleName', 'planId', 'project', 'unitAttempts', 'usecaseId'];

export interface D1WorkerArg {
  planId: string;
  moduleName: string;
  project: number;
  usecaseId: string;
  attempt: number;
  unitAttempts: number;
  globalAttempts: number;
  feedback: string;
}

export interface D1AttemptTrace {
  usecaseId: string;
  status: 'parsed' | 'repairable' | 'operational';
  trace: string;
  unitAttempts: number;
  reply: unknown;
}

export interface D1RepairOrder {
  usecaseId: string;
  unitAttempts: number;
  globalAttempts: number;
  planId: string;
  feedback: string;
}

export interface D1BarrierDecision {
  repairs: D1RepairOrder[];
  identified: Array<{ usecaseId: string; trace: string; code: string }>;
  pause: boolean;
}

/** Compact, stable JSON. One arg is one usecase. */
export function workerArg(arg: D1WorkerArg): string {
  const body: Record<string, string | number> = {
    attempt: arg.attempt,
    globalAttempts: arg.globalAttempts,
    moduleName: arg.moduleName,
    planId: arg.planId,
    project: arg.project,
    unitAttempts: arg.unitAttempts,
    usecaseId: arg.usecaseId,
  };
  if (arg.feedback) body.feedback = arg.feedback;
  return JSON.stringify(body);
}

export function parseWorkerArg(value: string): D1WorkerArg | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  for (const key of Object.keys(parsed)) {
    if (!ARG_KEYS.includes(key)) return null;
  }
  const planId = typeof parsed.planId === 'string' ? parsed.planId : '';
  const moduleName = typeof parsed.moduleName === 'string' ? parsed.moduleName : '';
  const usecaseId = typeof parsed.usecaseId === 'string' ? parsed.usecaseId : '';
  const project = parsed.project;
  if (!planId || !moduleName || !usecaseId) return null;
  if (typeof project !== 'number' || !Number.isInteger(project) || project <= 0) return null;
  const workerId = planId === `usecases50-worker-${usecaseId}`;
  const repairId = /^usecases50-repair-\d+$/.test(planId);
  if (!workerId && !repairId) return null;
  return {
    planId,
    moduleName,
    project,
    usecaseId,
    attempt: numberOr(parsed.attempt),
    unitAttempts: numberOr(parsed.unitAttempts),
    globalAttempts: numberOr(parsed.globalAttempts),
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
  };
}

export function firstWorkerArg(project: number, moduleName: string, usecaseId: string): string {
  return workerArg({
    planId: dynamicPlanId('usecases50', 'worker', usecaseId),
    moduleName,
    project,
    usecaseId,
    attempt: 0,
    unitAttempts: 0,
    globalAttempts: 0,
    feedback: '',
  });
}

export function fanoutStep(project: number, moduleName: string, args: readonly string[]): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: FANOUT_TITLE,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: D1_AGENT_NAME,
    prompt: JSON.stringify({ planId: dynamicPlanId('usecases50', 'fanout', ''), moduleName, project, command: 'run' }),
    rags: [],
    onFailure: 'continue',
    progress: { total: args.length, completed: 0, failed: 0, templateTitle: FANOUT_TITLE },
    planning: {
      planId: dynamicPlanId('usecases50', 'fanout', ''),
      dependsOn: ['persistence40-done'],
      executionMode: 'parallel_dynamic',
      executionHost: 'client',
    },
  };
}

export function fanoutExecution(args: readonly string[]): mls.msg.ExecutionMode {
  return { type: 'parallel', args: [...args], maxParallel: D1_MAX_PARALLEL };
}

/**
 * One repair per usecase, and no more than the global ceiling.
 * An operational failure is identified and does not take a repair.
 * A missing trace is still identified.
 */
export function decideRepairs(input: {
  expected: readonly string[];
  attempts: readonly D1AttemptTrace[];
  globalAttempts: number;
  feedbackFor: (usecaseId: string) => string;
}): D1BarrierDecision {
  const repairs: D1RepairOrder[] = [];
  const identified: D1BarrierDecision['identified'] = [];
  let pause = false;
  let global = input.globalAttempts;
  for (const usecaseId of input.expected) {
    const attempt = input.attempts.find(item => item.usecaseId === usecaseId);
    const trace = attempt?.trace?.trim() ? attempt.trace : 'missing trace';
    if (!attempt || attempt.status === 'operational') {
      identified.push({ usecaseId, trace, code: 'OPERATIONAL' });
      pause = true;
      continue;
    }
    if (attempt.status === 'parsed') continue;
    const unitAttempts = attempt.unitAttempts;
    if (!repairAllowed(unitAttempts, global) || unitAttempts >= D1_REPAIR_PER_UNIT || global >= D1_REPAIR_GLOBAL_MAX) {
      identified.push({ usecaseId, trace, code: 'REPAIR_EXHAUSTED' });
      continue;
    }
    global += 1;
    repairs.push({
      usecaseId,
      unitAttempts: unitAttempts + 1,
      globalAttempts: global,
      planId: dynamicPlanId('usecases50', 'repair', String(global)),
      feedback: input.feedbackFor(usecaseId),
    });
  }
  return { repairs, identified, pause };
}

export function repairStep(project: number, moduleName: string, order: D1RepairOrder): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: `Repair ${order.usecaseId}`,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: D1_AGENT_NAME,
    prompt: workerArg({
      planId: order.planId,
      moduleName,
      project,
      usecaseId: order.usecaseId,
      attempt: order.unitAttempts,
      unitAttempts: order.unitAttempts,
      globalAttempts: order.globalAttempts,
      feedback: order.feedback,
    }),
    rags: [],
    onFailure: 'continue',
    planning: {
      planId: order.planId,
      dependsOn: [dynamicPlanId('usecases50', 'fanout', '')],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

function numberOr(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}
