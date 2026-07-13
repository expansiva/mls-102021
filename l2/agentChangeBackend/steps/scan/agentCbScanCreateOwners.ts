/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/scan/agentCbScanCreateOwners.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic scan: select owners (operations/workflows) with todoBackend status = toCreate.
// No work -> finish (no file/status writes). Work -> continue to validate.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readBackendScan, enqueueNext, createUpdateStatusIntent, logPrefix } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbScanCreateOwners', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/scan', agentDescription: 'Deterministic todoBackend=toCreate scan', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    // toCreate is the trigger; inProgress is treated as resumable (a previous run locked but did not
    // finish) so the reconciler is idempotent and never gets stuck after a partial run.
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const warningTrace = scan.warnings.length ? ` Warnings: ${scan.warnings.slice(0, 8).join('; ')}` : '';
    if (scan.owners.length === 0) {
      return [
        enqueueNext(context, parentStep, step, 'cb-final-summary', 'agentCbFinalSummary', 'Resumo (sem trabalho)', { noWork: true }),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `No owner with todoBackend status = toCreate.${warningTrace}`),
      ];
    }
    return [
      enqueueNext(context, parentStep, step, 'cb-validate-readiness', 'agentCbValidateL4Readiness', 'Preflight l4', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Selected ${scan.owners.length} owner(s).${warningTrace}`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} failed: ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
