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
  usecaseFileInfo, httpControllerFileInfo, readBackTodoBackend, todoReadBackDivergences, todoReadBackIsClean, todoReadBackIsFatal,
  type CbOwner, type CbTodoReadBack, type OwnerStatus,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { recordFailedCbRun } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';
import { retryMayWriteTodoStatus } from '/_102021_/l2/agentChangeBackend/helpers/cbScope.js';
import { saveHealthReport } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { todoOwnerKey, type CbTodoDivergence } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
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

/** One line per divergent owner, capped: a run report has to stay readable. */
function describeDivergences(divergences: CbTodoDivergence[]): string {
  return divergences.slice(0, 8).map(d => `${d.key} expected ${d.expected}, found ${d.found}`).join('; ')
    + (divergences.length > 8 ? ` (+${divergences.length - 8} more)` : '');
}

/** One surface of a read-back as the run report words it. */
function surfaceState(readBack: CbTodoReadBack | null, surface: 'stor' | 'model'): string {
  if (!readBack) return 'skipped';
  const state = readBack[surface];
  if (surface === 'model' && !readBack.model.present) return 'absent';
  if (state.unreadable) return 'unreadable';
  return state.divergent.length ? `${state.divergent.length} divergent` : 'ok';
}

/** Human-readable state of one read-back, for the trace and the run report. */
function readBackSummary(readBack: CbTodoReadBack | null): string {
  if (!readBack) return 'read-back skipped: no todoBackend file in this project.';
  if (readBack.missingModule) return `read-back FAILED: no todoBackend file for module ${readBack.missingModule} (looked for ${readBack.ref}).`;
  const surfaces = [
    readBack.stor.unreadable ? 'stor UNREADABLE' : `stor ${readBack.stor.divergent.length ? `${readBack.stor.divergent.length} divergent` : 'ok'}`,
    !readBack.model.present ? 'no model' : readBack.model.unreadable ? 'model UNREADABLE' : `model ${readBack.model.divergent.length ? `${readBack.model.divergent.length} divergent` : 'ok'}`,
  ];
  return `read-back ${readBack.checked} owner(s) of ${readBack.ref}: ${surfaces.join(', ')}`;
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    // ONE scan over every status: the owners to flip are the inProgress ones, and the rest of the
    // module's owners are the context that makes the count honest (see A2 above).
    const scan = await readBackendScan(ALL_STATUSES, context);
    const moduleName = scan.moduleNames[0] || '';
    // What this step believes each owner's status is when it leaves. Filled as the writes happen (a
    // write that returns false wrote NOTHING, so the expectation stays the owner's current status) and
    // then checked against the persisted file — see the read-back below.
    const expected = new Map<string, string>();
    const ownerByKey = new Map<string, CbOwner>();
    for (const owner of scan.owners) {
      const key = todoOwnerKey(owner.kind, owner.id);
      expected.set(key, owner.todoStatus);
      ownerByKey.set(key, owner);
    }
    let flipped = 0;
    for (const owner of scan.owners.filter(o => o.todoStatus === 'inProgress')) {
      if (await setTodoBackendStatus(owner, 'done')) { flipped++; expected.set(todoOwnerKey(owner.kind, owner.id), 'done'); }
    }
    // An owner still `toCreate` at the END of a green run is the gen-http flip that did not land (run 9:
    // approveChangeOrderDecision, whose defs AND .ts were both on disk and validated). Only the
    // ARTIFACTS decide it here — both files present is evidence the run produced it — so this recovers
    // the bookkeeping without ever marking work that was not done.
    let recovered = 0;
    const notFlipped: string[] = [];
    for (const owner of scan.owners.filter(o => o.todoStatus === 'toCreate')) {
      if (await ownerArtifactsExist(owner, moduleName)) {
        if (await setTodoBackendStatus(owner, 'done')) { recovered++; expected.set(todoOwnerKey(owner.kind, owner.id), 'done'); continue; }
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
    // NEVER trust this step's own writes. A green run that persisted the PRE-run state is worse than a
    // red one: petShop 2026-08-21 reported 65 owners done and left 64 `toCreate` on disk, so the next
    // run would have regenerated an intact module from scratch. Both surfaces are checked because both
    // can become the file on disk (flow.json conventions.defsWritePersistence).
    // The FIRST read-back is the evidence and is never overwritten: on the self-healing path the retry
    // makes the second one clean, and reporting only that would erase the very divergence the defense
    // caught (`stor ok, model ok, retried: 65` says nothing about WHICH surface was wrong).
    const firstReadBack = await readBackTodoBackend(expected, moduleName);
    let readBack = firstReadBack;
    let retried = 0;
    if (!todoReadBackIsClean(readBack)) {
      for (const divergence of todoReadBackDivergences(readBack)) {
        const owner = ownerByKey.get(divergence.key);
        const want = expected.get(divergence.key);
        if (!owner || !want) continue;
        if (!retryMayWriteTodoStatus(want, await ownerArtifactsExist(owner, moduleName))) continue;
        if (await setTodoBackendStatus(owner, want as OwnerStatus)) retried++;
      }
      readBack = await readBackTodoBackend(expected, moduleName);
    }
    if (todoReadBackIsFatal(readBack)) {
      // The retry used the same write path that just failed, so a second one would fail the same way —
      // and a divergence nothing could even rewrite (retried = 0) is worse, not better. Fail LOUDLY:
      // the statuses on record no longer describe the module.
      throw new Error(`todoBackend read-back FAILED after 1 retry — was [${readBackSummary(firstReadBack)}], now [${readBackSummary(readBack)}]. ${describeDivergences(todoReadBackDivergences(readBack))}`);
    }
    const readBackMsg = retried
      ? ` ⚠ HIGH lost update: ${readBackSummary(firstReadBack)} — ${describeDivergences(todoReadBackDivergences(firstReadBack))}; ${retried} owner(s) rewritten, now [${readBackSummary(readBack)}].`
      : !readBack ? ' ⚠ read-back skipped: no todoBackend file found.'
      : readBack.model.unreadable ? ` ⚠ HIGH: ${readBackSummary(readBack)} — the model is what an export writes; check for an open tab with broken syntax.`
      : '';
    const todoReadBackNotice = {
      summary: readBackSummary(firstReadBack),
      retried,
      lostUpdate: retried > 0,
      stor: surfaceState(firstReadBack, 'stor'),
      model: surfaceState(firstReadBack, 'model'),
      divergences: todoReadBackDivergences(firstReadBack).slice(0, 8),
      afterRetry: retried ? { stor: surfaceState(readBack, 'stor'), model: surfaceState(readBack, 'model') } : null,
      message: readBackMsg.trim(),
    };
    await saveHealthReport({ todoReadBack: todoReadBackNotice });
    // The models this agent loaded are released here: the run is over, and what is left resident is
    // either the platform's or an open Studio tab. Counts before/after are the permanent leak detector.
    const before = modelCounts();
    const sweep = sweepModuleModels(scan.project, moduleName, new Set());
    const after = modelCounts();
    const models = ` models: registry ${before.registry}->${after.registry} (swept ${sweep.swept}, kept ${sweep.kept}).`;
    const trace = (flipped || recovered
      ? `Marked ${flipped + recovered} owner(s) done${recovered ? ` (${recovered} recovered: artifacts on disk but status still toCreate)` : ''}${alreadyDone ? ` (+${alreadyDone} already done at gen-http)` : ''}.`
      : `${alreadyDone} owner(s) already done at gen-http (defs generated); materialization validated by cb-validate-all.`) + pending + readBackMsg + models;
    return [
      enqueueNext(context, parentStep, step, 'cb-final-summary', 'agentCbFinalSummary', 'Resumo do run', {
        ownersDone, ownersFlipped: flipped, ownersAlreadyDone: alreadyDone, moduleName,
        // Expected × persisted, per surface, AS FOUND (before any retry) — that pair is the whole point
        // of item 2 of the fix, and the retry is what would erase it.
        todoReadBack: {
          ref: firstReadBack?.ref || '',
          checked: firstReadBack?.checked ?? 0,
          stor: surfaceState(firstReadBack, 'stor'),
          model: surfaceState(firstReadBack, 'model'),
          divergences: todoReadBackDivergences(firstReadBack).slice(0, 8),
          retried,
          afterRetry: retried ? { stor: surfaceState(readBack, 'stor'), model: surfaceState(readBack, 'model') } : null,
        },
      }),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordFailedCbRun({ longMemory: context.task?.iaCompressed?.longMemory, reason: message });
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
