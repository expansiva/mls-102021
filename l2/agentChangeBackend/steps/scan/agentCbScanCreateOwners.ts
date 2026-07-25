/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/scan/agentCbScanCreateOwners.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic scan: select owners (operations/workflows) with todoBackend status = toCreate.
// No work -> finish (no file/status writes). Work -> continue to validate.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readBackendScan, enqueueNext, createUpdateStatusIntent, logPrefix, readCliCommand } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { clearRepairState } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbScanCreateOwners', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/scan', agentDescription: 'Deterministic todoBackend=toCreate scan', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    // toCreate is the trigger; inProgress is treated as resumable (a previous run locked but did not
    // finish) so the reconciler is idempotent and never gets stuck after a partial run.
    // /rebuild seeds: the backend is already built — skip the whole generation chain (validate/lock/
    // gen-*/materialize) and go straight to cb-gen-seeds, which regenerates seeds.ts (+ assets) and
    // flows through register/finalize. Owners are NOT reset and their status is irrelevant here.
    if (readCliCommand(context) === 'rebuild-seeds') {
      await clearRepairState();
      return [
        enqueueNext(context, parentStep, step, 'cb-gen-seeds', 'agentCbSeeds', 'Regenerar seeds (rebuild-seeds)', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'rebuild seeds: regenerando somente seeds.ts (+ assets).'),
      ];
    }
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    // FRESH BUDGETS (lesson run 102049-g): clearRepairState only ran on validate-all SUCCESS, so a
    // failed run leaked its consumed attempts/globalAttempts into the NEXT run, which then started
    // with the repair budget already burned. A new run regenerates the artifacts anyway — old
    // findings reference code that is about to be replaced; reset everything at run start.
    await clearRepairState();
    const warningTrace = scan.warnings.length ? ` Warnings: ${scan.warnings.slice(0, 8).join('; ')}` : '';
    if (scan.owners.length === 0) {
      // No PENDING owners (module already built / owners done). Don't stop: still MATERIALIZE any stale
      // .ts (a .ts older than its .defs.ts — e.g. a previous run that failed after defs) and generate
      // seeds if the seeds file is missing. cb-materialize skips up-to-date .ts, and cb-gen-seeds keeps
      // an existing seeds.ts (regenerates only on /rebuild all|seeds), so this is a fast no-op when the
      // module is fully current. This is what a bare @@changeBackend expects on an already-built module.
      return [
        enqueueNext(context, parentStep, step, 'cb-materialize', 'agentCbMaterialize', 'Materializar .ts desatualizados', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `No pending owner; materializing stale .ts + seeds if missing.${warningTrace}`),
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
