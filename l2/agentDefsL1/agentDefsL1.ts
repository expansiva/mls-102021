/// <mls fileReference="_102021_/l2/agentDefsL1/agentDefsL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  D1_AGENT_NAME,
  D1_FLOW_ID,
  buildD1PlannedSteps,
  helpText,
  isD1StepId,
  isDoneAnchor,
  notImplementedTrace,
  parseD1Invocation,
  parseD1StepPrompt,
  pipelineFile,
  requireProject,
  stoppedTrace,
  taskModule,
  taskProject,
  unknownPlanId,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  d1StatusMessage,
  drainWaitingSiblings,
  hooksFor,
  markAwaitingStep,
  planIdOf,
  updateStatus,
} from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import { parsePipelineDocument } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { readText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { decideEntry } from '/_102021_/l2/agentDefsL1/steps/entry10/gate.js';
import '/_102021_/l2/agentDefsL1/steps/entry10/agentD1Entry.js';


export function createAgent(): IAgentAsync {
  return {
    agentName: D1_AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentDefsL1',
    agentDescription: 'L1 defs agent — checkpoint, identity and resume. Does not generate .defs.ts.',
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
  const invocation = parseD1Invocation(userPrompt || context.message.content || '');
  if (invocation.refused) return statusTask(agent, context, invocation.refused, {});

  const project = requireProject(mls.actualProject);
  if (typeof project !== 'number') return statusTask(agent, context, project.refusal, { moduleName: invocation.module });

  if (invocation.command === 'help') {
    return statusTask(agent, context, helpText(invocation.module, project), {
      moduleName: invocation.module,
      project: String(project),
      command: 'help',
    });
  }

  const command = invocation.command === 'resume' ? 'resume' : 'run';
  const raw = await readText(pipelineFile(project, invocation.module));
  const decision = decideEntry(command, project, invocation.module, raw, new Date());
  if (decision.kind === 'refusal') {
    return statusTask(agent, context, decision.refusal, {
      moduleName: invocation.module,
      project: String(project),
      command,
    });
  }

  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentDefsL1 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
        { type: 'human', content: invocation.module },
      ],
      taskTitle: `defs ${invocation.module}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'agentDefsL1',
        flowName: D1_FLOW_ID,
        moduleName: invocation.module,
        project: String(project),
        command,
      },
    },
  };
  const steps = buildD1PlannedSteps(invocation.module, project, command).map(step => addStepIntent(context, step));
  return [addMessage, ...steps];
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step);
  const hooks = hooksFor(planId);
  if (hooks?.beforePromptStep) return hooks.beforePromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isD1StepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  if (isDoneAnchor(planId)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Done anchor ${planId} is not a step.`)];
  }
  if (planId && planId !== 'root' && planId !== 'status') {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', unknownPlanId(planId))];
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step);
  const hooks = hooksFor(planId);
  if (hooks?.afterPromptStep) return hooks.afterPromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isD1StepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  if (isDoneAnchor(planId)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Done anchor ${planId} is not a step.`)];
  }
  if (planId && planId !== 'root' && planId !== 'status') {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', unknownPlanId(planId))];
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function notImplemented(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  stepId: D1StepId,
): Promise<mls.msg.AgentIntent[]> {
  const fromPrompt = parseD1StepPrompt(step.prompt || '');
  const moduleName = fromPrompt.kind === 'step' ? fromPrompt.prompt.moduleName : taskModule(context);
  const project = fromPrompt.kind === 'step' ? fromPrompt.prompt.project : taskProject(context);
  if (moduleName && project && taskProject(context) === project && taskModule(context) === moduleName) {
    const raw = await readText(pipelineFile(project, moduleName));
    const pipeline = raw ? parsePipelineDocument(raw) : null;
    if (pipeline && pipeline.project === project && pipeline.moduleName === moduleName) {
      await markAwaitingStep(pipeline, stepId);
    }
  }
  return [
    ...drainWaitingSiblings(context, step, hookSequential, stoppedTrace(stepId), { onlyUnimplemented: true }),
    updateStatus(context, parentStep, step, hookSequential, 'completed', notImplementedTrace(stepId)),
  ];
}

function addStepIntent(context: mls.msg.ExecutionContext, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step,
  };
}

function statusTask(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
  memory: Record<string, string>,
): mls.msg.AgentIntent[] {
  const addMessage = d1StatusMessage(agent, context, message, memory);
  const result: mls.msg.AIPayload = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: 'Status',
    result: message,
    planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  return [addMessage, addStepIntent(context, result)];
}
