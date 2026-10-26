/// <mls fileReference="_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  parseNewReleaseInvocation,
  releaseStatusText,
  releaseStepTitle,
  type ReleaseStatusKind,
} from '/_102021_/l2/agentNewReleaseL1/helpers/report.js';

const AGENT_NAME = 'agentNewReleaseL1';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentNewReleaseL1',
    agentDescription: 'Refuses every call with not implemented while the compare path is rewritten.',
    visibility: 'public',
    beforePromptImplicit,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseNewReleaseInvocation(userPrompt || context.message.content || '');
  if (!invocation.ok) return finish(agent, context, 'refused', invocation.help);
  return finish(agent, context, 'refused', 'not implemented');
}

function finish(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  kind: ReleaseStatusKind,
  message: string,
): mls.msg.AgentIntent[] {
  const text = releaseStatusText(message, kind);
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `agentNewReleaseL1 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.\n${text}` },
        { type: 'human', content: text },
      ],
      taskTitle: 'new release L1',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'newReleaseL1', flowName: AGENT_NAME, statusOnly: 'true' },
    },
  };
  const result: mls.msg.AIPayload = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: releaseStepTitle(text),
    result: text,
    planning: { planId: 'status', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  const step: mls.msg.AgentIntentAddStep = {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step: result,
  };
  return [addMessage, step];
}
