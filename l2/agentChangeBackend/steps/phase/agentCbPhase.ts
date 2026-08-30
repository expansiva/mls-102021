/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/phase/agentCbPhase.ts" enhancement="_102027_/l2/enhancementAgent"/>

// PHASE STEP (no LLM) — the branch a group of steps lives in.
//
// A run of this agent produces dozens of technical steps (fan-outs, repair rounds, judges, verifies).
// Appended flat at the root they read as 44 unrelated lines; created under a phase step the engine
// groups them for free: a parent with open children is held `in_progress` and auto-completes with the
// last one, and the task UI collapses a finished branch into a single row.
//
// The phase is created together with its FIRST child (never empty and completed, which would make
// every later child throw), and everything that step enqueues afterwards is a sibling inside the same
// phase — no other step has to know about phases at all.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, isRecord, readString, logPrefix,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { recordFailedCbRun } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';

const AGENT_NAME = 'agentCbPhase';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/phase',
    agentDescription: 'Groups the steps of one phase of the run; opens the phase with its first step inside',
    visibility: 'private', beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const first = firstStepOf(step);
    if (!first) throw new Error('phase step without a first step to open');
    const child = createAgentStepPayload(first.planId, first.agentName, first.stepTitle, first.args, [], 'sequential', 'waiting_human_input');
    if (first.onFailure) child.onFailure = first.onFailure;
    return [
      // The child hangs from THIS step: that is what makes the phase a branch, and what keeps the
      // phase open (deferred completion) until the whole branch finishes.
      createAddStepIntent(context, step, child),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `fase iniciada em ${first.planId}`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    await recordFailedCbRun({ longMemory: context.task?.iaCompressed?.longMemory, reason: message });
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

interface CbPhaseFirstStep {
  planId: string;
  agentName: string;
  stepTitle: string;
  args: Record<string, unknown>;
  onFailure?: mls.msg.AIAgentStep['onFailure'];
}

function firstStepOf(step: mls.msg.AIAgentStep): CbPhaseFirstStep | null {
  try {
    const parsed = JSON.parse(String(step.prompt || '{}')) as unknown;
    const first = isRecord(parsed) && isRecord(parsed.first) ? parsed.first : null;
    if (!first) return null;
    const planId = readString(first.planId);
    const agentName = readString(first.agentName);
    if (!planId || !agentName) return null;
    return {
      planId,
      agentName,
      stepTitle: readString(first.stepTitle) || planId,
      args: isRecord(first.args) ? first.args : { planId },
      ...(readString(first.onFailure) ? { onFailure: readString(first.onFailure) as mls.msg.AIAgentStep['onFailure'] } : {}),
    };
  } catch {
    return null;
  }
}
