/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/finalize/agentCbFinalizeStatus.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic: set todoBackend = done for the owners processed in this run. Then continue to the
// final summary.
//
// A2 (T10): gen-http already flips the owners to `done` right after the defs are generated (that flip
// is what makes a re-run cheap), so by the time this step runs there is usually NOTHING left in
// `inProgress` and the old trace read a bare "Marked 0 owner(s) done." — technically true, actively
// misleading: it looked like the run accomplished nothing. Report the REAL module state instead: how
// many owners this step flipped AND how many were already done (whose .ts this run validated).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readBackendScan, setTodoBackendStatus, enqueueNext, createUpdateStatusIntent, logPrefix, ALL_STATUSES,
  usecaseFileInfo, httpControllerFileInfo, type CbOwner,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { fileIsPresent, modelCounts, sweepModuleModels } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbFinalizeStatus', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/finalize', agentDescription: 'Deterministic todoBackend inProgress -> done', visibility: 'private', beforePromptStep };
}

/**
 * Did this run actually produce this owner? Both the defs and the materialized .ts must be there —
 * the defs alone would mean "planned but never materialized", which is not done.
 */
async function ownerArtifactsExist(owner: CbOwner, moduleName: string): Promise<boolean> {
  const module = owner.moduleName || moduleName;
  if (!module) return false;
  const info = owner.kind === 'operation' ? usecaseFileInfo(module, owner.id) : httpControllerFileInfo(module, owner.id);
  return fileIsPresent(info.project, info.level, info.folder, info.shortName, '.defs.ts')
    && fileIsPresent(info.project, info.level, info.folder, info.shortName, '.ts');
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    // ONE scan over every status: the owners to flip are the inProgress ones, and the rest of the
    // module's owners are the context that makes the count honest (see A2 above).
    const scan = await readBackendScan(ALL_STATUSES, context);
    const moduleName = scan.moduleNames[0] || '';
    let flipped = 0;
    for (const owner of scan.owners.filter(o => o.todoStatus === 'inProgress')) {
      if (await setTodoBackendStatus(owner, 'done')) flipped++;
    }
    // An owner still `toCreate` at the END of a green run is the gen-http flip that did not land (run 9:
    // approveChangeOrderDecision, whose defs AND .ts were both on disk and validated). Only the
    // ARTIFACTS decide it here — both files present is evidence the run produced it — so this recovers
    // the bookkeeping without ever marking work that was not done.
    let recovered = 0;
    const notFlipped: string[] = [];
    for (const owner of scan.owners.filter(o => o.todoStatus === 'toCreate')) {
      if (await ownerArtifactsExist(owner, moduleName)) {
        if (await setTodoBackendStatus(owner, 'done')) { recovered++; continue; }
      }
      notFlipped.push(`${owner.kind}:${owner.id}`);
    }
    // Already `done` BEFORE this step — in a normal run these are the owners gen-http flipped, i.e. the
    // ones whose .ts this run materialized and cb-validate-all just approved.
    const alreadyDone = scan.owners.filter(o => o.todoStatus === 'done').length;
    const ownersDone = flipped + recovered + alreadyDone;
    // A pending owner is never silent: one today is thirty in a bigger module tomorrow.
    const pending = notFlipped.length
      ? ` ⚠ ${notFlipped.length} owner(s) still pending (no artifacts on disk): ${notFlipped.slice(0, 12).join(', ')}`
      : '';
    // The models this agent loaded are released here: the run is over, and what is left resident is
    // either the platform's or an open Studio tab. Counts before/after are the permanent leak detector.
    const before = modelCounts();
    const sweep = sweepModuleModels(scan.project, moduleName, new Set());
    const after = modelCounts();
    const models = ` models: registry ${before.registry}->${after.registry} (swept ${sweep.swept}, kept ${sweep.kept}).`;
    const trace = (flipped || recovered
      ? `Marked ${flipped + recovered} owner(s) done${recovered ? ` (${recovered} recovered: artifacts on disk but status still toCreate)` : ''}${alreadyDone ? ` (+${alreadyDone} already done at gen-http)` : ''}.`
      : `${alreadyDone} owner(s) already done at gen-http (defs generated); materialization validated by cb-validate-all.`) + pending + models;
    return [
      enqueueNext(context, parentStep, step, 'cb-final-summary', 'agentCbFinalSummary', 'Resumo do run', { ownersDone, ownersFlipped: flipped, ownersAlreadyDone: alreadyDone, moduleName }),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
