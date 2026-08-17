/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/judge/agentCbJudgeCollect.ts" enhancement="_102027_/l2/enhancementAgent"/>

// JUDGE COLLECTOR (no LLM) — the barrier where the slices become one decision.
//
// The batch workers judge in parallel and each writes what it found; this step unions those files and
// takes the routing decision ONCE: re-spawn the origin usecase workers with the findings in context
// and re-judge the repaired subset, or move on to the controllers. An error found in the first batch
// must not be lost because the last one came back clean, which is why the decision waits for all of
// them and reads the disk instead of a return value (the runtime discards a fan-out child's).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readBackendScan, createUpdateStatusIntent, createAgentStepPayload, createAddStepIntent,
  createParallelStepIntent, enqueueNext, enqueueNextInPhase, logPrefix,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import {
  readRepairState, saveRepairState, usecaseDefsTarget,
  COMPONENT_REPAIR_BUDGET, JUDGE_MAX_RUNS, type CbJudgeFinding,
} from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import {
  judgeArgsOf, judgeFindingsFileInfo, scopedOperations, type CbJudgeBatchFindings,
} from '/_102021_/l2/agentChangeBackend/steps/judge/judgeShared.js';

const AGENT_NAME = 'agentCbJudgeCollect';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/judge',
    agentDescription: 'Unions the judge batch findings and routes them to the repair loop or to the controllers',
    visibility: 'private', beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const { judgeRun } = judgeArgsOf(step);
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const { operations } = scopedOperations(scan, step);
    const operationIds = new Set(operations.map(owner => owner.id));
    const findings = (await readBatchFindings(judgeRun)).filter(finding => operationIds.has(finding.ownerId));
    const warnings = findings.filter(finding => finding.severity !== 'error');

    // Route only errors that name a real owner with repair budget left.
    const state = await readRepairState();
    const errorsByOwner = new Map<string, CbJudgeFinding[]>();
    for (const finding of findings) {
      if (finding.severity !== 'error') continue;
      const target = usecaseDefsTarget(finding.ownerId);
      if ((state.componentRepairs[target]?.attempts ?? 0) > COMPONENT_REPAIR_BUDGET) continue;
      errorsByOwner.set(finding.ownerId, [...(errorsByOwner.get(finding.ownerId) || []), finding]);
    }

    if (errorsByOwner.size > 0 && judgeRun < JUDGE_MAX_RUNS) {
      for (const [ownerId, list] of errorsByOwner) {
        const target = usecaseDefsTarget(ownerId);
        state.componentRepairs[target] = {
          target,
          attempts: state.componentRepairs[target]?.attempts ?? 0,
          findings: list.map(finding => `[${finding.type}] ${finding.message}${finding.suggestion ? ` — suggestion: ${finding.suggestion}` : ''}`).slice(0, 20),
          source: 'judge',
          updatedAt: new Date().toISOString(),
        };
      }
      state.judgeRuns = judgeRun;
      await saveRepairState(state);
      const repairPlanId = `cb-usecase-repair-r${judgeRun}`;
      const repaired = [...errorsByOwner.keys()];
      const nextRun = judgeRun + 1;
      const nextJudgePlanId = `cb-judge-r${nextRun}`;
      // Re-verification is SCOPED to the repaired owners (mechanical): run 1 already cleared the rest.
      const nextJudge = createAgentStepPayload(
        nextJudgePlanId, 'agentCbJudge', `Juiz LLM (re-verificação de ${repaired.length})`,
        { planId: nextJudgePlanId, judgeRun: nextRun, owners: repaired }, [repairPlanId], 'sequential', 'waiting_dependency',
      );
      nextJudge.onFailure = 'continue';   // an LLM 502 must never kill the task
      return [
        createParallelStepIntent(context, parentStep, repairPlanId, 'agentCbUsecase', 'Reparar usecases {{completed}}/{{total}}, falhas {{failed}}', repaired, [], 10),
        createAddStepIntent(context, parentStep, nextJudge),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
          `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: ${errorsByOwner.size} usecase(s) routed to repair; ${warnings.length} warning(s)`, 'input_output'),
      ];
    }

    // PASS or final run: remaining errors are DOWNGRADED to warnings here — the judge signals, the
    // deterministic validators stay the blocking gate.
    const leftover = findings.filter(finding => finding.severity === 'error');
    const trace = leftover.length
      ? `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: budget exhausted; ${leftover.length} finding(s) downgraded to warning: ${leftover.slice(0, 8).map(finding => `${finding.ownerId}: ${finding.message}`).join('; ')}`
      : `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: clean (${warnings.length} warning(s))`;
    return [
      enqueueNextInPhase(context, step, 'materialization', 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
    ];
  } catch (error) {
    // The judge must never kill a run by itself: fail soft to the chain, keep the trace objective.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    return [
      enqueueNextInPhase(context, step, 'materialization', 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `judge skipped (error): ${message}`),
    ];
  }
}

/** Every batch file of this run. A batch that wrote nothing simply said nothing. */
async function readBatchFindings(judgeRun: number): Promise<CbJudgeFinding[]> {
  const project = mls.actualProject || 0;
  const prefix = judgeFindingsFileInfo(judgeRun, 1).shortName.replace(/-b1$/, '-b');
  const findings: CbJudgeFinding[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.json' || String(file.folder || '') !== 'trace') continue;
    if (!String(file.shortName || '').startsWith(prefix)) continue;
    try {
      const parsed = JSON.parse(String(await file.getContent())) as CbJudgeBatchFindings;
      if (Array.isArray(parsed?.findings)) findings.push(...parsed.findings);
    } catch { /* an unreadable batch file says nothing */ }
  }
  return findings;
}
