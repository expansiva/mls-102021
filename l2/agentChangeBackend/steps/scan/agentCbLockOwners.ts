/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/scan/agentCbLockOwners.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic: set todoBackend = inProgress for the validated toCreate owners (the only status
// mutation before successful completion). Then continue straight to domain generation.
// NOTE (2026-07-11): the LLM index steps (aggregate/persistence/usecase/bff) were removed — their
// output was discarded and the generators re-derive aggregates/columns/usecases deterministically
// from the l4/l5 scan. See flow.json (index-steps cut) and todo/modernizeChangeBackend.md.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readBackendScan, setTodoBackendStatus, enqueueNext, enqueueNextInPhase, createUpdateStatusIntent, logPrefix } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbLockOwners', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/scan', agentDescription: 'Deterministic todoBackend toCreate -> inProgress lock', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate'], context);
    let locked = 0;
    for (const owner of scan.owners) {
      if (await setTodoBackendStatus(owner, 'inProgress')) locked++;
    }
    return [
      enqueueNextInPhase(context, step, 'generation', 'cb-gen-domain', 'agentCbDomainEntity', 'Gerar entidades de domínio', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Locked ${locked} owner(s).`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
