/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/finalize/agentCbFinalSummary.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal step: concise run summary and task completion. Deterministic (no LLM) — handles both the
// no-work path (scan found nothing) and the normal path (owners marked done).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, isRecord, parseMaybeJson, saveBackendWorkspaceConfig } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { readHealthReport, readCostReport, saveRunReport } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { modelCounts } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { formatCostSummary } from '/_102021_/l2/agentChangeBackend/helpers/cbCostReport.js';
import { isCompilerFinding } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';

/** T6 visibility: surface any residual COMPILER errors from the health report in the final summary, so a
 *  run never ends looking green while the l1 artifact still carries real type errors (erro4). */
async function residualCompilerWarning(): Promise<string> {
  const report = await readHealthReport();
  const findings = Array.isArray(report?.findings)
    ? (report!.findings as unknown[]).filter((f): f is string => typeof f === 'string').filter(isCompilerFinding)
    : [];
  return findings.length
    ? ` ⚠ ${findings.length} compiler error(s) remaining (see l4/trace/cb-health-report.json): ${findings.slice(0, 5).join('; ')}`
    : '';
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
  // T7: per-phase LLM cost, accumulated by recordLlmCost across the run (l4/trace/cb-cost.json). Surfaced
  // here so the run cost + priciest phase are visible without hand-summing the task dump.
  const cost = formatCostSummary(await readCostReport());
  // A4: the no-work path carries an explicit `reason` when it can tell the user what to do next
  // (e.g. every module already `done` -> name the module to resume it). Falls back to the generic text.
  const noWorkReason = typeof args.reason === 'string' && args.reason
    ? `agentChangeBackend: ${args.reason}`
    : 'agentChangeBackend: nothing to create (no todoBackend status = toCreate).';
  const summary = (noWork
    ? noWorkReason
    : `agentChangeBackend: run complete. ${ownersSentence(args)} ${configMsg}`) + cost + residual;
  // The dossier of the run, next to the module's trace: phases with cost/calls, the repair history, the
  // residual findings and the model counts — what used to be assembled by hand after every run.
  const health = await readHealthReport();
  const reportRef = await saveRunReport({
    moduleName: typeof args.moduleName === 'string' ? args.moduleName : '',
    noWork,
    owners: {
      done: typeof args.ownersDone === 'number' ? args.ownersDone : 0,
      flippedAtFinalize: typeof args.ownersFlipped === 'number' ? args.ownersFlipped : 0,
      alreadyDoneAtGenHttp: typeof args.ownersAlreadyDone === 'number' ? args.ownersAlreadyDone : 0,
    },
    llmByPhase: await readCostReport(),
    models: modelCounts(),
    health: health ? {
      outcome: health.outcome ?? null,
      findings: Array.isArray(health.findings) ? health.findings.length : 0,
      warnings: Array.isArray(health.warnings) ? health.warnings.length : 0,
      globalAttempts: health.globalAttempts ?? null,
      judgeRuns: health.judgeRuns ?? null,
      repairHistory: Array.isArray(health.repairHistory) ? health.repairHistory : [],
    } : null,
    summary,
  });
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
    reportRef ? `${summary} Run report: ${reportRef}.` : summary)];
}
