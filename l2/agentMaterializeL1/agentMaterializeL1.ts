/// <mls fileReference="_102021_/l2/agentMaterializeL1/agentMaterializeL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { helpText, parseStudioPrompt, M1_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/run/command.js';
import { runMaterialize } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { receiptFolder } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { createStudioHost, loadStudioUnits, readStudioProfile } from '/_102021_/l2/agentMaterializeL1/studioHost.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: M1_AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentMaterializeL1',
    agentDescription: 'Materialize L1 defs. simulate plans and does not call a model. structure and implement call only their registered handlers.',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const project = typeof mls.actualProject === 'number' ? mls.actualProject : 0;
  const command = parseStudioPrompt(userPrompt || context.message.content || '', project);
  if (command.help) return statusTask(agent, context, helpText(project), { command: 'help' });
  if (command.refusal) return statusTask(agent, context, command.refusal, { command: 'refused' });
  try {
    const [units, profile] = await Promise.all([
      loadStudioUnits(command.project, command.moduleName),
      readStudioProfile(command.project),
    ]);
    const host = createStudioHost(command.project);
    host.catalogRef = `_${command.project}_/${receiptFolder(command.moduleName)}/scenarioCatalog.ts`;
    const result = await runMaterialize({
      project: command.project,
      moduleName: command.moduleName,
      stage: command.stage,
      flow: command.flow,
      resume: command.resume,
      units,
      profileMode: profile.mode,
      profileDeclared: profile.declared,
    }, host);
    return statusTask(agent, context, summarize(result), {
      command: result.stage,
      ended: result.ended,
      moduleName: command.moduleName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return statusTask(agent, context, `agentMaterializeL1 stopped: ${message}`, { command: 'stopped' });
  }
}

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'agentMaterializeL1 does not call a model for this step.')];
}

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'agentMaterializeL1 finished this step without a model call.')];
}

function summarize(result: { moduleName: string; project: number; stage: string; ended: string; llmCalls: number; wrote: boolean; units: Array<{ defPath: string; code: string }>; catalog?: { action: string; ref: string; inputHash: string; detail: string; gaps: Array<{ artifactId: string; origin: string; reason: string }> }; registration?: { action: string; detail: string; pendings: Array<{ origin: string; reason: string }> } }): string {
  const lines = [
    `agentMaterializeL1 ${result.moduleName} in project ${result.project}.`,
    `Stage ${result.stage}. ${result.ended}.`,
    `Model calls: ${result.llmCalls}. Writes: ${result.wrote ? 'yes' : 'no'}.`,
    ...result.units.map(unit => `${unit.code} ${unit.defPath}`),
  ];
  if (result.catalog) {
    lines.push(`catalog: ${result.catalog.action} ${result.catalog.ref}`);
    lines.push(`catalogHash: ${result.catalog.inputHash}`);
    lines.push(result.catalog.detail);
    for (const gap of result.catalog.gaps) lines.push(`gap: ${gap.artifactId} ${gap.origin} ${gap.reason}`);
  }
  if (result.registration) {
    lines.push(`registration: ${result.registration.action}`);
    if (result.registration.detail) lines.push(result.registration.detail);
    for (const item of result.registration.pendings) lines.push(`registrationPending: ${item.reason} ${item.origin}`);
  }
  return lines.join('\n');
}

function statusTask(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
  memory: Record<string, string>,
): mls.msg.AgentIntent[] {
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `agentMaterializeL1 deterministic bootstrap. The root LLM is skipped.\n${message}` },
        { type: 'human', content: message },
      ],
      taskTitle: 'agentMaterializeL1',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'agentMaterializeL1', flowName: M1_AGENT_NAME, statusOnly: 'true', ...memory },
    },
  };
  const result = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: 'Status',
    result: message,
    planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  return [addMessage, {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step: result,
  }];
}

function updateStatus(
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
    cleaner: 'input_output',
    traceMsg,
  };
}
