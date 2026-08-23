/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/scan/agentCbScanCreateOwners.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic scan: select owners (operations/workflows) with todoBackend status = toCreate.
// No work -> finish (no file/status writes). Work -> continue to validate.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readBackendScan, enqueueNext, enqueueNextInPhase, createUpdateStatusIntent, logPrefix, readCliCommand, readTargetModule } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { clearRepairState } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { readAgentProvenance, describeProvenance } from '/_102021_/l2/agentChangeBackend/helpers/cbBuildStamp.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbScanCreateOwners', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/scan', agentDescription: 'Deterministic todoBackend=toCreate scan', visibility: 'private', beforePromptStep };
}

/**
 * First thing the run says: WHICH version of this agent is executing, as an identity a human matches
 * with git. Informational by design — there is no "stale" verdict to give (see cbBuildStamp): a source
 * edited locally is the normal state of whoever is editing, and work that was never pushed is invisible
 * to the platform, so any alarm here would be noise.
 *
 * The dossiê (`agentBuild`) and the finalize summary already carry the stamp — do not print it to
 * the console (be5: it was the first line of console_be5.txt). The trace of this step still gets it.
 */
async function buildStampTrace(agent: IAgentMeta): Promise<string> {
  const provenance = await readAgentProvenance();
  const described = describeProvenance(provenance);
  return described;
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const buildTrace = await buildStampTrace(agent);
    // toCreate is the trigger; inProgress is treated as resumable (a previous run locked but did not
    // finish) so the reconciler is idempotent and never gets stuck after a partial run.
    // /rebuild seeds: the backend is already built — skip the whole generation chain (validate/lock/
    // gen-*/materialize) and go straight to cb-gen-seeds, which regenerates seeds.ts (+ assets) and
    // flows through register/finalize. Owners are NOT reset and their status is irrelevant here.
    if (readCliCommand(context) === 'rebuild-seeds') {
      await clearRepairState();
      return [
        enqueueNextInPhase(context, step, 'seeds', 'cb-gen-seeds', 'agentCbSeeds', 'Regenerar seeds (rebuild-seeds)', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `rebuild seeds: regenerando somente seeds.ts (+ assets).${buildTrace}`),
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
      // A4 (T10): with NO pending owner AND no explicit module there is nothing to scope to — the
      // gen-http `done` flip means an already-built module no longer appears as pending, so
      // readTargetModule is empty and cb-materialize would scan the module literal 'unknown', find
      // nothing, and end in a silent no-op that reads like a successful run. Stop here with the
      // instruction the user actually needs instead.
      const targetModule = readTargetModule(context);
      if (!targetModule) {
        return [
          enqueueNextInPhase(context, step, 'finalization', 'cb-final-summary', 'agentCbFinalSummary', 'Resumo do run', {
            noWork: true,
            reason: 'nenhum módulo com owners pendentes (todoBackend toCreate|inProgress). Um módulo já construído fica com os owners `done`, então não aparece como pendente: para retomar/revalidar um módulo específico use `/run <módulo>` (ex: /run cafeFlow), ou `/rebuild all <módulo>` para regerar do zero.',
          }),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `No pending owner and no explicit module; nothing to scope.${warningTrace}${buildTrace}`),
        ];
      }
      // Explicit module: don't stop: still MATERIALIZE any stale
      // .ts (a .ts older than its .defs.ts — e.g. a previous run that failed after defs) and generate
      // seeds if the seeds file is missing. cb-materialize skips up-to-date .ts, and cb-gen-seeds keeps
      // an existing seeds.ts (regenerates only on /rebuild all|seeds), so this is a fast no-op when the
      // module is fully current. This is the cheap recovery path the `done` flip exists for.
      return [
        enqueueNext(context, parentStep, step, 'cb-materialize', 'agentCbMaterialize', 'Materializar .ts desatualizados', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `No pending owner in ${targetModule}; materializing stale .ts + seeds if missing.${warningTrace}${buildTrace}`),
      ];
    }
    return [
      enqueueNext(context, parentStep, step, 'cb-validate-readiness', 'agentCbValidateL4Readiness', 'Preflight l4', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Selected ${scan.owners.length} owner(s).${warningTrace}${buildTrace}`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} failed: ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
