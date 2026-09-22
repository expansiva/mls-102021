/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Dispatch.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  D1_AGENT_NAME,
  D1_INTERACTION_CLEANER,
  ownerStepId,
  pipelineFile,
  withAwaiting,
  type D1PipelineState,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';

export type D1StepBeforePrompt = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
) => Promise<mls.msg.AgentIntent[]>;

export type D1StepAfterPrompt = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
) => Promise<mls.msg.AgentIntent[]>;

export interface D1StepHooks {
  beforePromptStep?: D1StepBeforePrompt;
  afterPromptStep?: D1StepAfterPrompt;
}

/** Filled by the step module as a side effect. A missing entry is not implemented. */
export const D1_STEP_HOOKS: Partial<Record<D1StepId, D1StepHooks>> = {};

export function planIdOf(step: mls.msg.AIAgentStep): string {
  return step.planning?.planId || '';
}

export function hooksFor(planId: string): D1StepHooks | undefined {
  const stepId = ownerStepId(planId);
  if (!stepId) return undefined;
  return D1_STEP_HOOKS[stepId];
}

/**
 * Persists awaitingStep when the marker actually moves. An approved entry10
 * is left untouched. A repeated call does not write.
 */
export async function markAwaitingStep(pipeline: D1PipelineState, stepId: D1StepId, now = new Date().toISOString()): Promise<boolean> {
  const next = withAwaiting(pipeline, stepId, now);
  if (!next.changed) return false;
  const issues = pipelineIssues(next.pipeline);
  if (issues.length > 0) {
    throw new Error(`Checkpoint schema refused: ${issues[0]}`);
  }
  await writeJson(pipelineFile(pipeline.project, pipeline.moduleName), next.pipeline);
  return true;
}

export function d1StatusMessage(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
  memory: Record<string, string>,
): mls.msg.AgentIntentAddMessageAI {
  return {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `agentDefsL1 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.\n${message}` },
        { type: 'human', content: message },
      ],
      taskTitle: 'agentDefsL1',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'agentDefsL1', flowName: D1_AGENT_NAME, statusOnly: 'true', ...memory },
    },
  };
}

export function updateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    cleaner: D1_INTERACTION_CLEANER,
    traceMsg,
  };
}

export function drainWaitingSiblings(
  context: mls.msg.ExecutionContext,
  current: mls.msg.AIAgentStep,
  hookSequential: number,
  traceMsg: string,
  opts?: { onlyUnimplemented?: boolean },
): mls.msg.AgentIntentUpdateStatus[] {
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  if (!root) return [];
  const intents: mls.msg.AgentIntentUpdateStatus[] = [];
  for (const sibling of walk(root.nextSteps || [])) {
    if (sibling.stepId === current.stepId) continue;
    if (sibling.status === 'completed' || sibling.status === 'failed') continue;
    if (opts?.onlyUnimplemented && hooksFor(planIdOf(sibling as mls.msg.AIAgentStep))) continue;
    intents.push(updateStatus(context, root, sibling, hookSequential, 'completed', traceMsg));
  }
  return intents;
}

function walk(steps: mls.msg.AIPayload[]): mls.msg.AIPayload[] {
  const out: mls.msg.AIPayload[] = [];
  for (const step of steps) {
    out.push(step);
    if (step.nextSteps?.length) out.push(...walk(step.nextSteps));
  }
  return out;
}
