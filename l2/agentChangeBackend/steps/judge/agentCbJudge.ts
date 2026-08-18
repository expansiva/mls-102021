/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/judge/agentCbJudge.ts" enhancement="_102027_/l2/enhancementAgent"/>

// JUDGE DISPATCHER (no LLM) — plans the slices and fans them out.
//
// The judge is an adversarial critic that runs right after the usecase fan-out — the first durable
// LLM artifact downstream steps consume — and BEFORE controllers/materialization, where most of the
// run cost is. It VALIDATES, never generates: each usecase .defs.ts is compared against its L4 owner
// contract (inputs, accessPattern, contextResolution, rulesApplied, acceptanceAssertions).
//
// The module does not fit in one call (119 pairs ≈ 950KB → HTTP 413), and the slices are independent,
// so this step only plans them: one worker per batch (agentCbJudgeBatch, parallel fan-out with live
// progress) and one collector (agentCbJudgeCollect) that unions the findings and routes them to the
// bounded repair loop or to cb-gen-http. Flow position:
// cb-usecase-fanout -> cb-judge -> cb-judge-b{run} (fan-out) -> cb-judge-collect-r{run} ->
// (cb-usecase-repair-r{n} -> cb-judge-r{n+1})? -> cb-gen-http.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readBackendScan, createUpdateStatusIntent, createAgentStepPayload, createAddStepIntent,
  createParallelStepIntent, enqueueNext, enqueueNextInPhase, logPrefix,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { byteLength, planJudgeBatch } from '/_102021_/l2/agentChangeBackend/helpers/cbPromptBudget.js';
import {
  judgeArgsOf, ownerContract, readUsecaseDefsByOwner, scopedOperations,
} from '/_102021_/l2/agentChangeBackend/steps/judge/judgeShared.js';

const AGENT_NAME = 'agentCbJudge';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/judge',
    agentDescription: 'Plans the judge batches and fans them out; the collector routes their findings',
    visibility: 'private', beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    // The judge runs right after the usecase fan-out, and the dependency only proves the children
    // COMPLETED — not that this client's file index already observed what they wrote. In run 5 it did
    // not: all 85 usecase defs read as missing, every owner was routed to repair and a full round of 85
    // LLM calls was spent regenerating files that were already on disk. Refreshing the index first is
    // read-only and costs one request (skills/collab_messages.md: visibility barrier).
    await refreshProjectIndex();
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const { judgeRun, operations } = scopedOperations(scan, step);
    if (!operations.length) {
      return [
        enqueueNextInPhase(context, step, 'materialization', 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no operation owners to judge'),
      ];
    }
    // The batches are planned ONCE, here, from the real byte size of each pair — a worker never
    // re-plans and never re-scans the module (skills §4: the per-item arg is the queue, not a payload).
    const batches = planBatches(await pairSizes(scan, operations));
    const fanoutPlanId = `cb-judge-b${judgeRun}`;
    const collectPlanId = `cb-judge-collect-r${judgeRun}`;
    // The findings files of a previous execution stay in l4/trace as its audit; naming this run's
    // files after the task keeps a fresh judge run 1 from reading them as its own.
    const runId = judgeArgsOf(step).runId || String(context.task?.PK || context.message.orderAt || '');
    const batchArgs = batches.map((owners, index) => JSON.stringify({
      planId: `${fanoutPlanId}-${index + 1}`, judgeRun, batchIndex: index + 1, queue: owners, runId,
    }));
    const collect = createAgentStepPayload(
      collectPlanId, 'agentCbJudgeCollect', 'Consolidar achados do juiz',
      { planId: collectPlanId, judgeRun, runId, owners: judgeRun > 1 ? operations.map(owner => owner.id) : [] },
      [fanoutPlanId], 'sequential', 'waiting_dependency',
    );
    collect.onFailure = 'continue';
    return [
      createParallelStepIntent(context, parentStep, fanoutPlanId, 'agentCbJudgeBatch',
        'Juiz LLM {{completed}}/{{total}} lotes, falhas {{failed}}', batchArgs, [], 5),
      createAddStepIntent(context, parentStep, collect),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
        `judge run ${judgeRun}: ${operations.length} usecase(s) in ${batches.length} batch(es)`, 'input_output'),
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

/** Ask the server for this project's current file index; never fails the step. */
async function refreshProjectIndex(): Promise<void> {
  try {
    await mls.stor.server.loadProjectInfoIfNeeded(mls.actualProject || 0, true);
  } catch (error) {
    console.warn('[agentCbJudge] could not refresh the project file index before judging', error);
  }
}

/** The size of the pair each owner contributes — what the packer bounds a batch by. */
async function pairSizes(scan: Awaited<ReturnType<typeof readBackendScan>>, operations: Awaited<ReturnType<typeof scopedOperations>>['operations']) {
  const defsByOwner = await readUsecaseDefsByOwner(scan, operations);
  return operations.map(owner => ({
    ownerId: owner.id,
    bytes: byteLength(JSON.stringify({ l4Contract: ownerContract(owner), generatedUsecaseDefs: defsByOwner.get(owner.id) ?? null }, null, 2)),
  }));
}

function planBatches(queue: Array<{ ownerId: string; bytes: number }>): string[][] {
  const batches: string[][] = [];
  let pending = queue;
  while (pending.length) {
    const plan = planJudgeBatch(pending);
    batches.push(plan.batch);
    pending = pending.filter(entry => plan.pending.includes(entry.ownerId));
  }
  return batches;
}

export { judgeArgsOf };
