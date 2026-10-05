/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/dispatch.ts" enhancement="_blank"/>

import type { D1PromptEvidence } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import {
  barrierStepFor,
  decideFanoutRepairs,
  fanoutExecution as sharedFanoutExecution,
  fanoutStepFor,
  fanoutWorkerArg,
  firstFanoutWorkerArg,
  parseFanoutWorkerArg,
  repairStepFor,
  FANOUT_TITLE as SHARED_FANOUT_TITLE,
  type D1FanoutConfig,
} from '/_102021_/l2/agentDefsL1/helpers/d1Fanout.js';

/** usecases50 on the shared fan-out (`helpers/d1Fanout.ts`): one worker per selected usecase. */
export const USECASES_FANOUT: D1FanoutConfig = {
  stepId: 'usecases50',
  unitKey: 'usecaseId',
  after: 'persistence40-done',
  noun: 'workers',
  barrierTitle: 'Usecases barrier',
};

export const FANOUT_TITLE = SHARED_FANOUT_TITLE;

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
  /** The prompt the hook assembled. Present after prepareWorker. */
  request?: D1PromptEvidence;
  /** True when the code derived the steps and the model was not called (d1_55). */
  derived?: boolean;
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
  const { usecaseId, ...rest } = arg;
  return fanoutWorkerArg(USECASES_FANOUT, { ...rest, unitId: usecaseId });
}

export function parseWorkerArg(value: string): D1WorkerArg | null {
  const parsed = parseFanoutWorkerArg(USECASES_FANOUT, value);
  if (!parsed) return null;
  const { unitId, ...rest } = parsed;
  return { ...rest, usecaseId: unitId };
}

export function firstWorkerArg(project: number, moduleName: string, usecaseId: string): string {
  return firstFanoutWorkerArg(USECASES_FANOUT, project, moduleName, usecaseId);
}

export function fanoutStep(project: number, moduleName: string, args: readonly string[]): mls.msg.AIAgentStep {
  return fanoutStepFor(USECASES_FANOUT, project, moduleName, args);
}

export function fanoutExecution(args: readonly string[]): mls.msg.ExecutionMode {
  return sharedFanoutExecution(args);
}

export function barrierStep(project: number, moduleName: string, dependsOn: readonly string[], round: string): mls.msg.AIAgentStep {
  return barrierStepFor(USECASES_FANOUT, project, moduleName, dependsOn, round);
}

/** One repair per usecase, and no more than the global ceiling. Same rule as every fan-out step. */
export function decideRepairs(input: {
  expected: readonly string[];
  attempts: readonly D1AttemptTrace[];
  globalAttempts: number;
  feedbackFor: (usecaseId: string) => string;
}): D1BarrierDecision {
  const decision = decideFanoutRepairs(USECASES_FANOUT, {
    expected: input.expected,
    attempts: input.attempts.map(item => ({ unitId: item.usecaseId, status: item.status, trace: item.trace, unitAttempts: item.unitAttempts })),
    globalAttempts: input.globalAttempts,
    feedbackFor: input.feedbackFor,
  });
  return {
    repairs: decision.repairs.map(({ unitId, ...rest }) => ({ usecaseId: unitId, ...rest })),
    identified: decision.identified.map(({ unitId, ...rest }) => ({ usecaseId: unitId, ...rest })),
    pause: decision.pause,
  };
}

export function repairStep(project: number, moduleName: string, order: D1RepairOrder): mls.msg.AIAgentStep {
  const { usecaseId, ...rest } = order;
  return repairStepFor(USECASES_FANOUT, project, moduleName, { ...rest, unitId: usecaseId });
}
