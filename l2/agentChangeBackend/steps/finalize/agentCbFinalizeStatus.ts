/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/finalize/agentCbFinalizeStatus.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic: set todoBackend = done for the owners processed in this run. Then continue to the
// final summary.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readBackendScan, setTodoBackendStatus, enqueueNext, createUpdateStatusIntent, logPrefix } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbFinalizeStatus', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/finalize', agentDescription: 'Deterministic todoBackend inProgress -> done', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['inProgress']);
    let done = 0;
    for (const owner of scan.owners) {
      if (await setTodoBackendStatus(owner, 'done')) done++;
    }
    return [
      enqueueNext(context, parentStep, step, 'cb-final-summary', 'agentCbFinalSummary', 'Resumo do run', { ownersDone: done }),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Marked ${done} owner(s) done.`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
