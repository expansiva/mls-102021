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
import { readBackendScan, setTodoBackendStatus, enqueueNext, createUpdateStatusIntent, logPrefix, ALL_STATUSES } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbFinalizeStatus', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/finalize', agentDescription: 'Deterministic todoBackend inProgress -> done', visibility: 'private', beforePromptStep };
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
    // Already `done` BEFORE this step — in a normal run these are the owners gen-http flipped, i.e. the
    // ones whose .ts this run materialized and cb-validate-all just approved.
    const alreadyDone = scan.owners.filter(o => o.todoStatus === 'done').length;
    const ownersDone = flipped + alreadyDone;
    const trace = flipped
      ? `Marked ${flipped} owner(s) done${alreadyDone ? ` (+${alreadyDone} already done at gen-http)` : ''}.`
      : `${alreadyDone} owner(s) already done at gen-http (defs generated); materialization validated by cb-validate-all.`;
    return [
      enqueueNext(context, parentStep, step, 'cb-final-summary', 'agentCbFinalSummary', 'Resumo do run', { ownersDone, ownersFlipped: flipped, ownersAlreadyDone: alreadyDone, moduleName }),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
