/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/agentD1Input.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  displayPath,
  inputFile,
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
import { parsePipelineDocument, pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { assembleD1Input, persistD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

export async function beforeD1InputPromptStep(
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
  if (prompt.planId !== 'input20') {
    return refuse(context, parentStep, step, hookSequential, 'Step prompt planId must be input20.');
  }
  const memoryProject = taskProject(context);
  const memoryModule = taskModule(context);
  if (memoryProject === null || memoryProject !== prompt.project || memoryModule !== prompt.moduleName) {
    return refuse(context, parentStep, step, hookSequential, MSG_PROJECT_MISMATCH);
  }

  const checkpointFile = pipelineFile(prompt.project, prompt.moduleName);
  const raw = await readText(checkpointFile);
  const pipeline = raw ? parsePipelineDocument(raw) : null;
  if (!pipeline || pipeline.project !== prompt.project || pipeline.moduleName !== prompt.moduleName || pipeline.steps.entry10?.status !== 'approved') {
    return refuse(context, parentStep, step, hookSequential, 'Checkpoint is not intact. input20 wrote nothing.');
  }

  const snapshot = await assembleD1Input(prompt.project, prompt.moduleName);
  await persistD1Input(prompt.project, prompt.moduleName, snapshot);
  const artifact = displayPath(inputFile(prompt.project, prompt.moduleName));
  const reason = snapshot.consumersReleased ? '' : blockingReason(snapshot);
  const held = snapshot.consumersReleased
    ? ''
    : ` Consumer phases are not released.${reason ? ` ${reason}` : ''}`;
  const trace = `input20 recorded the inventory for ${prompt.moduleName} in project ${prompt.project}.${held}`;

  if (!snapshot.consumersReleased) {
    const heldPipeline = withConsumersHeld(pipeline, artifact, reason, new Date().toISOString());
    if (JSON.stringify(heldPipeline) !== JSON.stringify(pipeline)) {
      const issues = pipelineIssues(heldPipeline);
      if (issues.length > 0) throw new Error(`Checkpoint schema refused: ${issues[0]}`);
      await writeJson(checkpointFile, heldPipeline);
    }
    // Completed, not failed: a failed task step pauses the run, and paused is not an end.
    // awaitingStep plus steps.input20 say the chain stopped.
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: consumer phases are not released.${reason ? ` ${reason}` : ''}`),
      updateStatus(context, parentStep, step, hookSequential, 'completed', trace),
    ];
  }

  const approved = withInputApproved(pipeline, artifact, new Date().toISOString());
  if (JSON.stringify(approved) !== JSON.stringify(pipeline)) await writeJson(checkpointFile, approved);
  const mutationParent = findOpenParent(context, parentStep);
  const anchor = anchorPresent(context) ? [] : [doneAnchor(context, mutationParent, prompt.project, prompt.moduleName, artifact)];
  return [
    ...anchor,
    updateStatus(context, mutationParent, step, hookSequential, 'completed', trace),
  ];
}

export async function afterD1InputPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'input20 already recorded.')];
}

/** Error-severity codes and counts. The paths stay in input.json. */
function blockingReason(snapshot: D1InputSnapshot): string {
  const counts = new Map<string, number>();
  for (const problem of snapshot.problems) {
    if (problem.severity !== 'error' || problem.code.length === 0) continue;
    counts.set(problem.code, (counts.get(problem.code) || 0) + 1);
  }
  return [...counts.keys()].sort().map(code => `${code}:${counts.get(code)}`).join(',');
}

function withConsumersHeld(pipeline: D1PipelineState, artifact: string, reason: string, now: string): D1PipelineState {
  const current = pipeline.steps.input20;
  const paths = current?.artifactPaths || [];
  if (current?.status === 'approved') return pipeline;
  if (
    pipeline.status === 'awaitingStep'
    && pipeline.awaitingStep === 'input20'
    && current?.status === 'failed'
    && (current.error || '') === reason
    && paths.length === 1
    && paths[0] === artifact
  ) {
    return pipeline;
  }
  return {
    ...pipeline,
    status: 'awaitingStep',
    awaitingStep: 'input20',
    steps: {
      ...pipeline.steps,
      input20: {
        status: 'failed',
        updatedAt: now,
        artifactPaths: [artifact],
        ...(reason ? { error: reason } : {}),
      },
    },
    updatedAt: now,
  };
}

function withInputApproved(pipeline: D1PipelineState, artifact: string, now: string): D1PipelineState {
  if (pipeline.steps.input20?.status === 'approved' && (pipeline.steps.input20.artifactPaths || []).includes(artifact)) {
    return pipeline;
  }
  const next: D1PipelineState = {
    ...pipeline,
    status: 'inProgress',
    steps: {
      ...pipeline.steps,
      input20: { status: 'approved', updatedAt: now, artifactPaths: [artifact] },
    },
    updatedAt: now,
  };
  if (pipeline.awaitingStep && pipeline.awaitingStep !== 'input20') next.awaitingStep = pipeline.awaitingStep;
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
    completedStep: 'input20' as const,
    nextStep: 'domain30' as const,
    artifact,
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
      stepTitle: 'Input done',
      status: 'completed',
      nextSteps: [],
      result: JSON.stringify(result),
      planning: { planId: 'input20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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
  return allSteps(context).some(item => planIdOf(item as mls.msg.AIAgentStep) === 'input20-done');
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

D1_STEP_HOOKS.input20 = {
  beforePromptStep: beforeD1InputPromptStep,
  afterPromptStep: afterD1InputPromptStep,
};
