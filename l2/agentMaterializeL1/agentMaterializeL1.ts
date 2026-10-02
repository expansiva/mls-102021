/// <mls fileReference="_102021_/l2/agentMaterializeL1/agentMaterializeL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { helpText, parseStudioPrompt, M1_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/run/command.js';
import { runMaterialize, type MaterializeRunResult } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { receiptFolder } from '/_102021_/l2/helpers/l1Defs/definition.js';
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
  if (command.help) return statusTask(agent, context, helpText(project), true, { command: 'help' });
  if (command.refusal) return statusTask(agent, context, command.refusal, false, { command: 'refused' });
  try {
    const host = createStudioHost(command.project);
    const [units, profile] = await Promise.all([
      loadStudioUnits(command.project, command.moduleName),
      readStudioProfile(command.project),
    ]);
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
    return statusTask(agent, context, summarize(result), runEndedWell(result), {
      command: result.stage,
      ended: result.ended,
      moduleName: command.moduleName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return statusTask(agent, context, `agentMaterializeL1 stopped: ${message}`, false, { command: 'stopped' });
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

function summarize(result: { moduleName: string; project: number; stage: string; ended: string; detail?: string; llmCalls: number; wrote: boolean; units: Array<{ defPath: string; code: string }>; catalog?: { action: string; ref: string; inputHash: string; detail: string; gaps: Array<{ artifactId: string; origin: string; reason: string }> }; registration?: { action: string; detail: string; pendings: Array<{ origin: string; reason: string }> } }): string {
  const lines = [
    `agentMaterializeL1 ${result.moduleName} in project ${result.project}.`,
    `Stage ${result.stage}. ${result.ended}.`,
    ...(result.detail ? [result.detail] : []),
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

/** Unit codes of a unit whose code is in place (the same list as `dependencyOk` in run/execute.ts). */
const UNIT_OK: ReadonlySet<string> = new Set(['PROMOTED', 'REUSE', 'VERIFIED']);
/** Catalog actions that refuse: the derived catalog was not stored. */
const CATALOG_REFUSED: ReadonlySet<string> = new Set(['conflict', 'invalid']);
/** Registration actions that refuse: l5 was not registered. */
const REGISTRATION_REFUSED: ReadonlySet<string> = new Set(['pending', 'invalid']);

/**
 * m1_45: the run ended well, so the root step may close `completed`.
 * simulate writes nothing and plans only: it ends well when it ended `SIMULATED`.
 * Any other stage needs `COMPLETED`, every unit in place, and catalog and registration without refusal.
 * A registration with pendings is a refusal even when it patched: part of the backend is not registered.
 */
export function runEndedWell(result: Pick<MaterializeRunResult, 'stage' | 'ended' | 'units' | 'catalog' | 'registration'>): boolean {
  if (result.stage === 'simulate') return result.ended === 'SIMULATED';
  if (result.ended !== 'COMPLETED') return false;
  if (!result.units.every(unit => UNIT_OK.has(unit.code))) return false;
  if (result.catalog && CATALOG_REFUSED.has(result.catalog.action)) return false;
  if (result.registration && (REGISTRATION_REFUSED.has(result.registration.action) || result.registration.pendings.length > 0)) return false;
  return true;
}

function statusTask(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
  endedWell: boolean,
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
  // The root step (stepId 1) is closed so the task leaves `in progress`: `failed` with the reason unless the run ended well.
  const root = { stepId: 1 } as mls.msg.AIPayload;
  return [addMessage, {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step: result,
  }, updateStatus(context, root, root, 0, endedWell ? 'completed' : 'failed', message)];
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
