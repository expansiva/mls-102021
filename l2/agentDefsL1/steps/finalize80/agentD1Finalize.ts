/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/agentD1Finalize.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  displayPath,
  parseD1StepPrompt,
  pipelineFile,
  reportFile,
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
import { earlierHold, buildD1Finalize } from '/_102021_/l2/agentDefsL1/steps/finalize80/gate.js';
import { assembleD1Finalize, writeD1Report } from '/_102021_/l2/agentDefsL1/steps/finalize80/io.js';

export async function beforeD1FinalizePromptStep(
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
  if (prompt.planId !== 'finalize80') {
    return refuse(context, parentStep, step, hookSequential, 'Step prompt planId must be finalize80.');
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
    return refuse(context, parentStep, step, hookSequential, 'Checkpoint is not intact. finalize80 wrote nothing.');
  }

  const assembled = await assembleD1Finalize(prompt.project, prompt.moduleName);
  if ('refusal' in assembled) return refuse(context, parentStep, step, hookSequential, assembled.refusal);
  const report = buildD1Finalize({ ...assembled.request, pipeline });
  await writeD1Report(prompt.project, prompt.moduleName, report);
  const artifact = displayPath(reportFile(prompt.project, prompt.moduleName));

  if (earlierHold(pipeline) || report.defsStatus === 'notRun') {
    return [
      updateStatus(context, parentStep, step, hookSequential, 'completed', stoppedTrace(prompt.moduleName, report.blocking)),
    ];
  }

  if (report.outcome !== 'complete') {
    const held = withFinalizeHeld(pipeline, artifact, report.blocking, new Date().toISOString());
    if (JSON.stringify(held) !== JSON.stringify(pipeline)) {
      const issues = pipelineIssues(held);
      if (issues.length > 0) throw new Error(`Checkpoint schema refused: ${issues[0]}`);
      await writeJson(checkpointFile, held);
    }
    return [
      updateStatus(context, parentStep, step, hookSequential, 'completed', `finalize80 recorded the report for ${prompt.moduleName}. ${report.blocking}. The step is not approved.`),
    ];
  }

  const approved = withFinalizeApproved(pipeline, artifact, new Date().toISOString());
  if (JSON.stringify(approved) !== JSON.stringify(pipeline)) await writeJson(checkpointFile, approved);
  const mutationParent = findOpenParent(context, parentStep);
  const anchor = anchorPresent(context) ? [] : [doneAnchor(context, mutationParent, prompt.project, prompt.moduleName, artifact)];
  return [
    ...anchor,
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `finalize80 recorded the report for ${prompt.moduleName} in project ${prompt.project}. Defs are complete. Future outputs stay pending. No model was called.`),
  ];
}

export async function afterD1FinalizePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'finalize80 already recorded.')];
}

function stoppedTrace(moduleName: string, blocking: string): string {
  const reason = blocking ? ` ${blocking}.` : '';
  return `finalize80 recorded the report for ${moduleName}. Later phases were not executed.${reason} No model was called.`;
}

function withFinalizeHeld(pipeline: D1PipelineState, artifact: string, reason: string, now: string): D1PipelineState {
  const current = pipeline.steps.finalize80;
  const paths = current?.artifactPaths || [];
  if (
    pipeline.status === 'awaitingStep'
    && pipeline.awaitingStep === 'finalize80'
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
    awaitingStep: 'finalize80',
    steps: {
      ...pipeline.steps,
      finalize80: {
        status: 'failed',
        updatedAt: now,
        artifactPaths: [artifact],
        ...(reason ? { error: reason } : {}),
      },
    },
    updatedAt: now,
  };
}

function withFinalizeApproved(pipeline: D1PipelineState, artifact: string, now: string): D1PipelineState {
  if (
    pipeline.status === 'complete'
    && pipeline.steps.finalize80?.status === 'approved'
    && (pipeline.steps.finalize80.artifactPaths || []).includes(artifact)
    && !pipeline.awaitingStep
  ) {
    return pipeline;
  }
  const next: D1PipelineState = {
    ...pipeline,
    status: 'complete',
    steps: {
      ...pipeline.steps,
      finalize80: { status: 'approved', updatedAt: now, artifactPaths: [artifact] },
    },
    updatedAt: now,
  };
  delete next.awaitingStep;
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
    completedStep: 'finalize80' as const,
    nextStep: '' as const,
    artifact,
    llmCalls: 0,
    repairOpened: false,
    executableBackend: false,
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
      stepTitle: 'Finalize done',
      status: 'completed',
      result: JSON.stringify(result),
      planning: { planId: 'finalize80-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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
  return allSteps(context).some(item => planIdOf(item as mls.msg.AIAgentStep) === 'finalize80-done');
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

D1_STEP_HOOKS.finalize80 = {
  beforePromptStep: beforeD1FinalizePromptStep,
  afterPromptStep: afterD1FinalizePromptStep,
};
