/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/agentD1Support.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  displayPath,
  draftFile,
  parseD1StepPrompt,
  pipelineFile,
  taskModule,
  taskProject,
  MSG_PROJECT_MISMATCH,
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  D1_STEP_HOOKS,
  drainWaitingSiblings,
  planIdOf,
  updateStatus,
} from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import { parsePipelineDocument } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { assembleD1Support, commitD1Support } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';

export async function beforeD1SupportPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD1StepPrompt(args || step.prompt || '');
  if (parsed.kind === 'refusal') return refuse(context, parentStep, step, hookSequential, parsed.refusal);
  const prompt = parsed.prompt;
  if (prompt.planId !== 'support70') {
    return refuse(context, parentStep, step, hookSequential, 'Step prompt planId must be support70.');
  }
  const memoryProject = taskProject(context);
  const memoryModule = taskModule(context);
  if (memoryProject === null || memoryProject !== prompt.project || memoryModule !== prompt.moduleName) {
    return refuse(context, parentStep, step, hookSequential, MSG_PROJECT_MISMATCH);
  }

  const checkpointFile = pipelineFile(prompt.project, prompt.moduleName);
  const raw = await readText(checkpointFile);
  const pipeline = raw ? parsePipelineDocument(raw) : null;
  if (!pipeline || pipeline.project !== prompt.project || pipeline.moduleName !== prompt.moduleName || pipeline.steps.controllers60?.status !== 'approved') {
    return refuse(context, parentStep, step, hookSequential, 'Checkpoint is not intact. support70 wrote nothing.');
  }

  const assembled = await assembleD1Support(prompt.project, prompt.moduleName);
  if ('refusal' in assembled) return refuse(context, parentStep, step, hookSequential, assembled.refusal);
  const committed = await commitD1Support(prompt.project, assembled.build, assembled.files);
  if (!assembled.build.ok || committed.issues.length > 0) {
    const message = committed.issues[0]
      || assembled.build.problems.find(problem => problem.severity === 'error')?.message
      || 'support70 refused the support plan.';
    return refuse(context, parentStep, step, hookSequential, message);
  }

  const artifact = displayPath(draftFile(prompt.project, prompt.moduleName, 'support70'));
  const trace = `support70 wrote ${committed.written.length} support defs for ${prompt.moduleName} in project ${prompt.project}. No model was called.`;
  const approved = withSupportApproved(pipeline, artifact, new Date().toISOString());
  if (JSON.stringify(approved) !== JSON.stringify(pipeline)) await writeJson(checkpointFile, approved);
  const mutationParent = findOpenParent(context, parentStep);
  const anchor = anchorPresent(context) ? [] : [doneAnchor(context, mutationParent, prompt.project, prompt.moduleName, artifact)];
  return [
    ...anchor,
    updateStatus(context, mutationParent, step, hookSequential, 'completed', trace),
  ];
}

export async function afterD1SupportPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'support70 already recorded.')];
}

function withSupportApproved(pipeline: D1PipelineState, artifact: string, now: string): D1PipelineState {
  if (pipeline.steps.support70?.status === 'approved' && (pipeline.steps.support70.artifactPaths || []).includes(artifact)) {
    return pipeline;
  }
  const next: D1PipelineState = {
    ...pipeline,
    status: 'inProgress',
    steps: {
      ...pipeline.steps,
      support70: { status: 'approved', updatedAt: now, artifactPaths: [artifact] },
    },
    updatedAt: now,
  };
  if (pipeline.awaitingStep && pipeline.awaitingStep !== 'support70') next.awaitingStep = pipeline.awaitingStep;
  else delete next.awaitingStep;
  return next;
}

function refuse(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  message: string,
): mls.msg.AgentIntent[] {
  return [
    ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
    updateStatus(context, parentStep, step, hookSequential, 'completed', message),
  ];
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  project: number,
  moduleName: string,
  artifact: string,
): mls.msg.AgentIntentAddStep {
  const result = {
    project,
    moduleName,
    completedStep: 'support70' as const,
    nextStep: 'finalize80' as const,
    artifact,
    llmCalls: 0,
  };
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'result',
      stepId: 0,
      interaction: null,
      nextSteps: [],
      stepTitle: 'Support done',
      status: 'completed',
      result: JSON.stringify(result),
      planning: { planId: 'support70-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  };
}

function findOpenParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const current = allSteps(context).find(item => item.stepId === parentStep.stepId);
  if (current?.type === 'agent' && current.status !== 'completed' && current.status !== 'failed') return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function anchorPresent(context: mls.msg.ExecutionContext): boolean {
  return allSteps(context).some(item => planIdOf(item as mls.msg.AIAgentStep) === 'support70-done');
}

function allSteps(context: mls.msg.ExecutionContext): mls.msg.AIPayload[] {
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

D1_STEP_HOOKS.support70 = {
  beforePromptStep: beforeD1SupportPromptStep,
  afterPromptStep: afterD1SupportPromptStep,
};
