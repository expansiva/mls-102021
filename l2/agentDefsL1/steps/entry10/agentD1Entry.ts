/// <mls fileReference="_102021_/l2/agentDefsL1/steps/entry10/agentD1Entry.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  displayPath,
  parseD1StepPrompt,
  pipelineFile,
  taskModule,
  taskProject,
  MSG_PROJECT_MISMATCH,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  D1_STEP_HOOKS,
  drainWaitingSiblings,
  planIdOf,
  updateStatus,
} from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import { writeJson, readText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { decideEntry } from '/_102021_/l2/agentDefsL1/steps/entry10/gate.js';

export async function beforeD1EntryPromptStep(
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
  if (prompt.planId !== 'entry10') {
    return refuse(context, parentStep, step, hookSequential, `Step prompt planId must be entry10.`);
  }
  const memoryProject = taskProject(context);
  const memoryModule = taskModule(context);
  if (memoryProject === null || memoryProject !== prompt.project || memoryModule !== prompt.moduleName) {
    return refuse(context, parentStep, step, hookSequential, MSG_PROJECT_MISMATCH);
  }

  const file = pipelineFile(prompt.project, prompt.moduleName);
  const raw = await readText(file);
  const decision = decideEntry(prompt.command, prompt.project, prompt.moduleName, raw, new Date());
  if (decision.kind === 'refusal') return refuse(context, parentStep, step, hookSequential, decision.refusal);

  if (decision.kind === 'record') await writeJson(file, decision.state);

  const trace = decision.kind === 'record'
    ? `entry10 recorded ${prompt.moduleName} in project ${prompt.project}.`
    : `entry10 already recorded for ${prompt.moduleName} in project ${prompt.project}.`;
  const mutationParent = findOpenParent(context, parentStep);
  const anchor = anchorPresent(context) ? [] : [doneAnchor(context, mutationParent, prompt.project, prompt.moduleName)];
  return [
    ...anchor,
    updateStatus(context, mutationParent, step, hookSequential, 'completed', trace),
  ];
}

export async function afterD1EntryPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'entry10 already recorded.')];
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
): mls.msg.AgentIntentAddStep {
  const artifact = displayPath(pipelineFile(project, moduleName));
  const result = {
    project,
    moduleName,
    completedStep: 'entry10' as const,
    nextStep: 'input20' as const,
    artifact,
  };
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Entry done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify(result),
    planning: { planId: 'entry10-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function addStep(
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

function findOpenParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const current = allSteps(context).find(item => item.stepId === parentStep.stepId);
  if (isOpenAgent(current)) return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function isOpenAgent(step: mls.msg.AIPayload | undefined): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function anchorPresent(context: mls.msg.ExecutionContext): boolean {
  return allSteps(context).some(item => planIdOf(item as mls.msg.AIAgentStep) === 'entry10-done');
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

D1_STEP_HOOKS.entry10 = {
  beforePromptStep: beforeD1EntryPromptStep,
  afterPromptStep: afterD1EntryPromptStep,
};
