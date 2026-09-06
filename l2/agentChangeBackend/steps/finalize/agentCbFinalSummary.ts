/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/finalize/agentCbFinalSummary.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal step: concise run summary and task completion. Deterministic (no LLM) — handles both the
// no-work path (scan found nothing) and the normal path (owners marked done).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, isRecord, parseMaybeJson, saveBackendWorkspaceConfig } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import {
  cbNochainSuppressedNote,
  decideCbFastHandoff,
  hasCbFastHandoff,
  isCbFastMode,
  isCbNochainMode,
  sendCbFastHandoff,
  type CbFastHandoffDegradation,
} from '/_102021_/l2/agentChangeBackend/helpers/cbFastHandoff.js';
import { readHealthReport, readCostReport, saveRunReport } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { collectRunStepRecords } from '/_102021_/l2/agentChangeBackend/helpers/cbRunDossier.js';
import { modelCounts } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { readAgentProvenance, describeProvenance } from '/_102021_/l2/agentChangeBackend/helpers/cbBuildStamp.js';
import { formatCostSummary } from '/_102021_/l2/agentChangeBackend/helpers/cbCostReport.js';
import { isCompilerFinding } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import { buildCbRunSummary, describeCbCommand, readCbFastHandoffMark, saveCbRunSummary, writeCbFastHandoffMark } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';

/** T6 visibility: surface any residual COMPILER errors from the health report in the final summary, so a
 *  run never ends looking green while the l1 artifact still carries real type errors (erro4). */
async function residualCompilerWarning(): Promise<string> {
  const report = await readHealthReport();
  const findings = Array.isArray(report?.findings)
    ? (report!.findings as unknown[]).filter((f): f is string => typeof f === 'string').filter(isCompilerFinding)
    : [];
  const compiler = findings.length
    ? ` ⚠ ${findings.length} compiler error(s) remaining (see l4/<module>/pipeline/trace/l1/cb-health-report.json): ${findings.slice(0, 5).join('; ')}`
    : '';
  const degraded = Array.isArray(report?.degraded) ? report!.degraded.filter((f): f is string => typeof f === 'string') : [];
  const skipped = report?.seedSkipped && typeof report.seedSkipped === 'object' && !Array.isArray(report.seedSkipped)
    ? report.seedSkipped as { tables?: unknown; mdmEntities?: unknown; reason?: unknown }
    : null;
  const skippedTables = Array.isArray(skipped?.tables) ? skipped.tables.filter((id): id is string => typeof id === 'string') : [];
  const skippedMdm = Array.isArray(skipped?.mdmEntities) ? skipped.mdmEntities.filter((id): id is string => typeof id === 'string') : [];
  const skippedNote = skippedTables.length || skippedMdm.length
    ? ` skipped tables [${skippedTables.join(', ') || 'none'}] MDM [${skippedMdm.join(', ') || 'none'}]`
    : '';
  const seeds = report?.seeds === 'degraded' ? ` ⚠ seeds: degraded${skippedNote} (empty tables are valid; @@changeBackend /rebuild seeds to refine).` : '';
  const degradedNote = degraded.length
    ? ` ⚠ ${degraded.length} degradable finding(s) (health passed-degraded): ${degraded.slice(0, 5).join('; ')}`
    : seeds;
  return `${compiler}${degradedNote}`;
}

/** A2 (T10): never report a bare "owners done = 0". gen-http flips the owners to `done` as soon as the
 *  defs exist, so the finalize step normally has nothing left to flip — the honest summary is the
 *  module's real state (how many owners are done, and that this run validated their materialization). */
function ownersSentence(args: Record<string, unknown>): string {
  const total = typeof args.ownersDone === 'number' ? args.ownersDone : 0;
  const flipped = typeof args.ownersFlipped === 'number' ? args.ownersFlipped : total;
  const alreadyDone = typeof args.ownersAlreadyDone === 'number' ? args.ownersAlreadyDone : 0;
  const where = typeof args.moduleName === 'string' && args.moduleName ? ` in ${args.moduleName}` : '';
  if (!total) return `no owner reached done${where} — check the findings below.`;
  return flipped
    ? `owners done = ${total}${where} (${flipped} finalized now${alreadyDone ? `, ${alreadyDone} already done after defs` : ''}).`
    : `owners done = ${total}${where} (all marked done after defs generation; materialization validated by cb-validate-all).`;
}

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbFinalSummary', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/finalize', agentDescription: 'Terminal run summary + task completion', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const args = isRecord(parseMaybeJson(step.prompt)) ? (parseMaybeJson(step.prompt) as Record<string, unknown>) : {};
  const noWork = args.noWork === true;
  // A4 (T10): the no-work path terminates WITHOUT cb-register, and flow.json's documented
  // noWorkBehavior is "finish without changing any file or status" — so don't merge l5/config.json
  // here. It would be an idempotent re-merge of a PREVIOUS run's l5/project.json (the backend blocks
  // it reads are written by cb-register), which on a nothing-to-do run only adds a confusing
  // "merged (0 module(s))" to the terminal message.
  let configMsg = '';
  if (!noWork) {
    try {
      configMsg = await saveBackendWorkspaceConfig();
    } catch (error) {
      configMsg = `l5/config.json backend update failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  const residual = await residualCompilerWarning();
  // WHICH VERSION of this agent produced this run. The 2026-08-22 incident was diagnosed backwards for
  // want of exactly this line: the build was consistent and correct, and the fix simply had never been
  // committed — something only a comparison against git can tell, which is what buildRef enables.
  const agentBuild = await readAgentProvenance();
  const stamp = describeProvenance(agentBuild);
  // T7: per-phase LLM cost, accumulated by recordLlmCost across the run (l4/trace/cb-cost.json). Surfaced
  // here so the run cost + priciest phase are visible without hand-summing the task dump.
  const cost = formatCostSummary(await readCostReport());
  // A4: the no-work path carries an explicit `reason` when it can tell the user what to do next
  // (e.g. every module already `done` -> name the module to resume it). Falls back to the generic text.
  const noWorkReason = typeof args.reason === 'string' && args.reason
    ? `agentChangeBackend: ${args.reason}`
    : 'agentChangeBackend: nothing to create (no todoBackend status = toCreate).';
  const ownersDone = typeof args.ownersDone === 'number' ? args.ownersDone : 0;
  const moduleName = typeof args.moduleName === 'string' && args.moduleName
    ? args.moduleName
    : String(context.task?.iaCompressed?.longMemory?.targetModule || '');
  const health = await readHealthReport();
  const compilerLeft = (Array.isArray(health?.findings) ? health!.findings : [])
    .filter((f): f is string => typeof f === 'string')
    .some(isCompilerFinding);
  const handoff = await dispatchChangeFrontendHandoff(context, {
    fast: isCbFastMode(context.task?.iaCompressed?.longMemory),
    nochain: isCbNochainMode(context.task?.iaCompressed?.longMemory),
    success: !noWork && ownersDone > 0 && !compilerLeft,
    moduleName,
  });
  const wipeNote = typeof health?.rebuildWipedMessage === 'string' && health.rebuildWipedMessage
    ? ` ${health.rebuildWipedMessage}.`
    : '';
  const wipeFindingNote = typeof health?.rebuildWipedFinding === 'string' && health.rebuildWipedFinding
    ? ` ⚠ ${health.rebuildWipedFinding}`
    : '';
  const tscGateNote = health?.tscGate === 'unavailable' || health?.tscGate === 'ran'
    ? ` tscGate=${health.tscGate}`
    : '';
  const summary = (noWork
    ? noWorkReason
    : `agentChangeBackend: run complete. ${ownersSentence(args)} ${configMsg}`) + wipeNote + wipeFindingNote + tscGateNote + cost + residual + stamp + handoff.note;
  // The dossier of the run, next to the module's trace: phases with cost/calls, the repair history, the
  // residual findings and the model counts — what used to be assembled by hand after every run.
  const reportRef = await saveRunReport({
    moduleName,
    noWork,
    owners: {
      done: typeof args.ownersDone === 'number' ? args.ownersDone : 0,
      flippedAtFinalize: typeof args.ownersFlipped === 'number' ? args.ownersFlipped : 0,
      alreadyDoneAtGenHttp: typeof args.ownersAlreadyDone === 'number' ? args.ownersAlreadyDone : 0,
    },
    // What cb-finalize actually found in the persisted file, per surface (stor and Monaco model), after
    // writing the statuses. `owners.done` is what the run BELIEVES; this is what it VERIFIED — the run 5
    // report claimed 65 done next to a file on disk that said 64 toCreate, and nothing recorded the gap.
    todoReadBack: isRecord(args.todoReadBack) ? args.todoReadBack : null,
    llmByPhase: await readCostReport(),
    models: modelCounts(), // includes peak — be5 closed with registry 104, the leak is the peak
    // The identity of the code that RAN. Without it, a post-mortem cannot tell "the generator is wrong"
    // from "the fix was never in this build" — the two look identical in every other field.
    agentBuild,
    steps: collectRunStepRecords(context.task?.iaCompressed?.nextSteps),
    health: health ? {
      outcome: health.outcome ?? null,
      findings: Array.isArray(health.findings) ? health.findings.length : 0,
      warnings: Array.isArray(health.warnings) ? health.warnings.length : 0,
      degraded: Array.isArray(health.degraded) ? health.degraded.length : 0,
      seeds: health.seeds ?? null,
      seedSkipped: health.seedSkipped ?? null,
      globalAttempts: health.globalAttempts ?? null,
      judgeRuns: health.judgeRuns ?? null,
      repairHistory: Array.isArray(health.repairHistory) ? health.repairHistory : [],
    } : null,
    summary,
  });
  try {
    await saveCbRunSummary(buildCbRunSummary({
      moduleName,
      command: describeCbCommand(context.task?.iaCompressed?.longMemory),
      noWork,
      ownersDone,
      ownersFlipped: typeof args.ownersFlipped === 'number' ? args.ownersFlipped : 0,
      compilerLeft,
      health,
      summary,
      extraDegradations: handoff.degradation ? [handoff.degradation] : [],
    }));
  } catch { /* run summary must never fail finalize */ }
  return [
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
      reportRef ? `${summary} Run report: ${reportRef}.` : summary),
  ];
}

async function dispatchChangeFrontendHandoff(
  context: mls.msg.ExecutionContext,
  input: { fast: boolean; nochain: boolean; success: boolean; moduleName: string },
): Promise<{ note: string; degradation: CbFastHandoffDegradation | null }> {
  try {
    const marked = Boolean(await readCbFastHandoffMark(input.moduleName));
    const already = marked || hasCbFastHandoff(context.task?.iaCompressed?.nextSteps);
    const decision = decideCbFastHandoff({ ...input, alreadyDispatched: already });
    if (!decision.dispatch) {
      if (decision.suppressed) {
        return { note: `; ${cbNochainSuppressedNote(input.moduleName)}`, degradation: null };
      }
      return { note: already && input.fast ? '; changeFrontend: already dispatched' : '', degradation: null };
    }
    return sendCbFastHandoff({
      threadId: context.message?.threadId,
      message: decision.message,
      send: async (threadId, message) => {
        const { addMessage } = await import('/_102025_/l2/collabMessagesHelper.js');
        await addMessage(threadId, message);
      },
      persist: () => writeCbFastHandoffMark(input.moduleName, decision.message),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      note: `; changeFrontend: DISPATCH FAILED (${reason})`,
      degradation: { at: new Date().toISOString(), kind: 'fast-handoff-dispatch', reason },
    };
  }
}
