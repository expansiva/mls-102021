/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/finalize/agentCbFinalSummary.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal step: concise run summary and task completion. Deterministic (no LLM) — handles both the
// no-work path (scan found nothing) and the normal path (owners marked done).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, isRecord, parseMaybeJson, saveBackendWorkspaceConfig } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { readHealthReport, readCostReport } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
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

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbFinalSummary', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/finalize', agentDescription: 'Terminal run summary + task completion', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const args = isRecord(parseMaybeJson(step.prompt)) ? (parseMaybeJson(step.prompt) as Record<string, unknown>) : {};
  let configMsg = '';
  try {
    configMsg = await saveBackendWorkspaceConfig();
  } catch (error) {
    configMsg = `l5/config.json backend update failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  const residual = await residualCompilerWarning();
  // T7: per-phase LLM cost, accumulated by recordLlmCost across the run (l4/trace/cb-cost.json). Surfaced
  // here so the run cost + priciest phase are visible without hand-summing the task dump.
  const cost = formatCostSummary(await readCostReport());
  const summary = (args.noWork
    ? `agentChangeBackend: nothing to create (no todoBackend status = toCreate). ${configMsg}`
    : `agentChangeBackend: run complete. owners done = ${args.ownersDone ?? 0}. ${configMsg}`) + cost + residual;
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary)];
}
