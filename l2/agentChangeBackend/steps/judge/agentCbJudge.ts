/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/judge/agentCbJudge.ts" enhancement="_102027_/l2/enhancementAgent"/>

// JUDGE (adversarial critic, cheap and EARLY): runs right after the usecase fan-out — the first
// durable LLM artifact that downstream steps actually consume — and BEFORE controllers/materialization
// (where most of the run cost is). It uses the LLM to VALIDATE, not to generate: each usecase .defs.ts
// is compared against its L4 owner contract (inputs, accessPattern, contextResolution, rulesApplied,
// acceptanceAssertions). Error findings are routed back to the origin worker (agentCbUsecase) with the
// findings in context — the repair loop — bounded by budgets in cbRepair.ts; on the final pass any
// remaining findings are downgraded to warnings (the judge SIGNALS; the deterministic gates in
// agentCbMaterialize/agentCbValidateAll remain the hard, blocking barrier).
//
// This is the backend half of the shared "repair loop + juiz LLM" block
// (todo/ajustesFinaisChangeBackend.md §2 / improveAddNewSolution2_1.md §4.3-§4.4). Flow position:
// cb-usecase-fanout -> cb-judge -> (repair fan-out -> cb-judge-r2)? -> cb-gen-http.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readBackendScan, createPromptReadyIntent, createUpdateStatusIntent, createAgentStepPayload, readCbPrompt,
  createAddStepIntent, createParallelStepIntent, enqueueNext,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, saveAgentTrace,
  isRecord, readString, readStringArray, lowerFirst, logPrefix, type CbScan, type CbOwner,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { missingPrincipalPortIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';
import { parseDefs } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import { judgeResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import {
  readRepairState, saveRepairState, usecaseDefsTarget, recordLlmCost,
  COMPONENT_REPAIR_BUDGET, JUDGE_MAX_RUNS, type CbJudgeFinding,
} from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { byteLength, planJudgeBatch } from '/_102021_/l2/agentChangeBackend/helpers/cbPromptBudget.js';

const AGENT_NAME = 'agentCbJudge';
const TOOL_NAME = 'submitJudgeFindings';
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the judge findings.', judgeResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/judge', agentDescription: 'Adversarial critic: usecase defs vs L4 contract; routes error findings to the repair loop', visibility: 'private', beforePromptStep, afterPromptStep };
}

/** Step args: { judgeRun: n, owners?: [...], queue?: [...], batchIndex?: n }. On re-verification runs
 * (n > 1) `owners` scopes the judge MECHANICALLY to the usecases that were just repaired — cheaper and
 * faster than re-judging everything, and a clean pass on the repaired subset is what the re-run must
 * prove. `queue` is what is LEFT to judge in this run: the module is read in batches (see
 * cbPromptBudget), and the queue is what the next batch step inherits. */
function judgeArgsOf(step: mls.msg.AIAgentStep): { judgeRun: number; owners: string[]; queue: string[] | null; batchIndex: number } {
  try {
    const p = JSON.parse(String(step.prompt || '{}'));
    const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((o: unknown): o is string => typeof o === 'string' && !!o) : [];
    return {
      judgeRun: p && typeof p.judgeRun === 'number' && p.judgeRun > 0 ? p.judgeRun : 1,
      owners: p ? ids(p.owners) : [],
      queue: p && Array.isArray(p.queue) ? ids(p.queue) : null,
      batchIndex: p && typeof p.batchIndex === 'number' && p.batchIndex > 0 ? p.batchIndex : 1,
    };
  } catch {
    return { judgeRun: 1, owners: [], queue: null, batchIndex: 1 };
  }
}

/** Read the saved usecase defs data for the given operation owners (null when missing). */
async function readUsecaseDefsByOwner(scan: CbScan, operations: CbOwner[]): Promise<Map<string, Record<string, unknown> | null>> {
  const project = scan.project;
  const byShortName = new Map<string, Record<string, unknown>>();
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/layer_2_application/usecases')) continue;
    const parsed = parseDefs(String(await file.getContent()));
    if (isRecord(parsed.data)) byShortName.set(String(file.shortName || '').toLowerCase(), parsed.data as Record<string, unknown>);
  }
  const out = new Map<string, Record<string, unknown> | null>();
  for (const owner of operations) {
    out.set(owner.id, byShortName.get(lowerFirst(owner.id).toLowerCase()) ?? null);
  }
  return out;
}

/** The operation owners in scope for this judge run (all on run 1; only the repaired subset after). */
function scopedOperations(scan: CbScan, step: mls.msg.AIAgentStep): { judgeRun: number; operations: CbOwner[] } {
  const { judgeRun, owners } = judgeArgsOf(step);
  let operations = scan.owners.filter(o => o.kind === 'operation');
  if (judgeRun > 1 && owners.length) operations = operations.filter(o => owners.includes(o.id));
  return { judgeRun, operations };
}

/**
 * The slice of the module THIS step judges, and what is left for the next one.
 *
 * 119 pairs of (L4 contract + generated usecase defs) pretty-printed is megabytes: the intents POST
 * answered 413 and the step hung forever. The batch is planned from the real byte size of each pair,
 * and both hooks plan it the same way from the same step args — nothing extra has to be threaded
 * through, and the after-hook always knows exactly which owners the model just saw.
 */
function planJudgeSlice(
  step: mls.msg.AIAgentStep,
  operations: CbOwner[],
  defsByOwner: Map<string, Record<string, unknown> | null>,
): { pairsByOwner: Map<string, unknown>; batch: CbOwner[]; pending: string[]; batchIndex: number; totalQueued: number } {
  const { queue, batchIndex } = judgeArgsOf(step);
  const byId = new Map(operations.map(owner => [owner.id, owner]));
  // A continuation step carries its own queue; the first step of a run judges everything in scope.
  const queued = (queue ?? operations.map(owner => owner.id)).filter(id => byId.has(id));
  const pairsByOwner = new Map<string, unknown>();
  const entries = queued.map(id => {
    const pair = { l4Contract: ownerContract(byId.get(id)!), generatedUsecaseDefs: defsByOwner.get(id) ?? null };
    pairsByOwner.set(id, pair);
    return { ownerId: id, bytes: byteLength(JSON.stringify(pair, null, 2)) };
  });
  const plan = planJudgeBatch(entries);
  return {
    pairsByOwner,
    batch: plan.batch.map(id => byId.get(id)!),
    pending: plan.pending,
    batchIndex,
    totalQueued: queued.length,
  };
}

/** Deterministic pre-findings: an operation owner whose usecase .defs.ts is missing entirely, plus
 *  (T12) one whose defs omit the principal aggregate's local port — a DERIVATION gap that would
 *  otherwise only surface as broken TypeScript after 2-3 expensive materialization repairs. */
function missingDefsFindings(
  defsByOwner: Map<string, Record<string, unknown> | null>,
  scan: CbScan,
  operations: CbOwner[],
): CbJudgeFinding[] {
  const findings: CbJudgeFinding[] = [];
  const localPortIds = new Set<string>([
    ...scan.aggregates.map(a => a.rootEntity),
    ...scan.events.filter(ev => ev.persisted).map(ev => ev.entityId),
  ]);
  const mdmIds = new Set(scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId));
  const byId = new Map(operations.map(o => [o.id, o]));
  for (const [ownerId, defs] of defsByOwner) {
    if (defs === null) {
      findings.push({ ownerId, type: 'estrutural', severity: 'error', message: `usecase .defs.ts missing for operation ${ownerId} (worker failed or never saved)` });
      continue;
    }
    const owner = byId.get(ownerId);
    if (!owner) continue;
    for (const message of missingPrincipalPortIssues(owner, readStringArray(defs.ports), localPortIds, mdmIds)) {
      findings.push({ ownerId, type: 'estrutural', severity: 'error', message });
    }
  }
  return findings;
}

/** The reduced L4 contract the judge compares against (authoritative side). */
function ownerContract(o: CbOwner) {
  return {
    ownerId: o.id,
    opKind: o.opKind,
    entity: o.entity,
    actors: o.actors,          // l4 v2 plural (fallback single `actor`); the usecase is authorized for these
    reads: o.reads,
    writes: o.writes,
    rulesApplied: o.rulesApplied,
    accessPattern: o.accessPattern ?? null,
    inputs: o.inputs,          // inputs carry explicit `type` OR `fieldRef` (N1b) — no re-inference
    contextResolution: o.contextResolution,
    acceptanceAssertions: o.acceptanceAssertions,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const { judgeRun, operations } = scopedOperations(scan, step);
    if (!operations.length) {
      return [
        enqueueNext(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no operation owners to judge'),
      ];
    }
    const defsByOwner = await readUsecaseDefsByOwner(scan, operations);
    const slice = planJudgeSlice(step, operations, defsByOwner);
    if (!slice.batch.length) {
      return [
        enqueueNext(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no operation owners left to judge'),
      ];
    }
    const pairs = slice.batch.map(o => slice.pairsByOwner.get(o.id));
    // Valid ports = aggregate roots + PERSISTED event stores (agentCbUsecase adds event ports
    // deterministically for eventWrites — they are legitimate; run3 showed the judge flagging them
    // as false positives when only roots were listed).
    const validPorts = [
      ...scan.aggregates.map(a => a.rootEntity),
      ...scan.events.filter(ev => ev.persisted).map(ev => ev.entityId),
    ];
    const mdmIds = scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId);
    const human = [
      `## Valid repository ports (aggregate roots + persisted event stores): ${JSON.stringify(validPorts)}`,
      `## MDM entities (read by id via 102034; NEVER a port, NEVER a local entity): ${JSON.stringify(mdmIds)}`,
      '',
      '## Pairs to judge (L4 contract = source of truth vs generated usecase defs)',
      JSON.stringify(pairs, null, 2),
      '',
      judgeRun > 1 ? `NOTE: re-verification run — only the ${operations.length} repaired usecase(s) are being judged.` : '',
      // The module is judged in slices; each call sees ONLY its own pairs and must not reason about
      // what it cannot see (a finding about an absent owner is discarded downstream anyway).
      slice.pending.length ? `NOTE: batch ${slice.batchIndex} of this run — ${slice.batch.length} of ${slice.totalQueued} pending usecase(s); the rest is judged in the next batch.` : '',
      `Judge every pair. Call ${TOOL_NAME} with the findings (empty array when everything is coherent).`,
    ].filter(Boolean).join('\n');
    const systemPrompt = await readCbPrompt('steps/judge');
    return [createPromptReadyIntent(context, parentStep, hookSequential, (step.prompt || ''), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${msg}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', msg)];
  }
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  await recordLlmCost('judge', step.interaction); // T7: per-phase cost telemetry (best-effort)
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    const out = extractPlannerOutput(payload, plannerConfig(TOOL_NAME));
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const { judgeRun, operations } = scopedOperations(scan, step);
    // The model saw ONE slice; the findings belong to it, and the routing decision waits for the last.
    const slice = planJudgeSlice(step, operations, await readUsecaseDefsByOwner(scan, operations));
    const batchOwners = slice.batch;
    const operationIds = new Set(batchOwners.map(o => o.id));

    // LLM findings + deterministic missing-defs findings; out-of-scope is discarded by design (§2).
    const raw = Array.isArray((out.result as any).findings) ? (out.result as any).findings.filter(isRecord) : [];
    const llmFindings: CbJudgeFinding[] = raw
      .map((f: any): CbJudgeFinding => ({
        ownerId: readString(f.ownerId),
        type: (readString(f.type) as CbJudgeFinding['type']) || 'estrutural',
        severity: (readString(f.severity) as CbJudgeFinding['severity']) || 'warning',
        message: readString(f.message),
        ...(readString(f.suggestion) ? { suggestion: readString(f.suggestion) } : {}),
      }))
      .filter((f: CbJudgeFinding) => !!f.message && f.type !== 'fora_de_escopo');
    const detFindings = missingDefsFindings(await readUsecaseDefsByOwner(scan, batchOwners), scan, batchOwners);
    const findings = [...detFindings, ...llmFindings];

    const warnings = findings.filter(f => f.severity !== 'error');
    // Route only errors that name a real operation owner with repair budget left.
    const state = await readRepairState();
    const errorsByOwner = new Map<string, CbJudgeFinding[]>();
    for (const f of findings) {
      if (f.severity !== 'error' || !operationIds.has(f.ownerId)) continue;
      const target = usecaseDefsTarget(f.ownerId);
      const attempts = state.componentRepairs[target]?.attempts ?? 0;
      if (attempts > COMPONENT_REPAIR_BUDGET) continue; // budget gone: leave to the deterministic gates
      const list = errorsByOwner.get(f.ownerId) || [];
      list.push(f);
      errorsByOwner.set(f.ownerId, list);
    }

    await saveAgentTrace(context, AGENT_NAME, step);
    const intents: mls.msg.AgentIntent[] = [];

    // What this run has routed so far, across every batch: the decision is taken once, at the end,
    // and an error found in batch 1 must not be lost because batch 2 came back clean. The FIRST batch
    // starts from nothing: the judge fails soft (an LLM error ends the chain and proceeds), so a
    // previous run may have left its accumulator behind and it must not route owners twice.
    const routedOwners = new Set<string>([
      ...(slice.batchIndex > 1 ? state.judgePendingOwners || [] : []),
      ...errorsByOwner.keys(),
    ]);
    if (errorsByOwner.size > 0) {
      for (const [ownerId, list] of errorsByOwner) {
        const target = usecaseDefsTarget(ownerId);
        state.componentRepairs[target] = {
          target,
          attempts: state.componentRepairs[target]?.attempts ?? 0,
          findings: list.map(f => `[${f.type}] ${f.message}${f.suggestion ? ` — suggestion: ${f.suggestion}` : ''}`).slice(0, 20),
          source: 'judge',
          updatedAt: new Date().toISOString(),
        };
      }
    }

    if (slice.pending.length) {
      // More of the module to read: hand the rest of the queue to the next batch and decide later.
      state.judgePendingOwners = [...routedOwners];
      await saveRepairState(state);
      const nextIndex = slice.batchIndex + 1;
      const nextPlanId = `cb-judge-b${judgeRun}-${nextIndex}`;
      const nextStep = createAgentStepPayload(
        nextPlanId, AGENT_NAME, `Juiz LLM (lote ${nextIndex}, ${slice.pending.length} restantes)`,
        { planId: nextPlanId, judgeRun, owners: judgeRun > 1 ? operations.map(o => o.id) : [], queue: slice.pending, batchIndex: nextIndex },
        [], 'sequential', 'waiting_human_input',
      );
      nextStep.onFailure = 'continue';   // same soft-fail as the first batch: an LLM 502 must not kill the task
      intents.push(createAddStepIntent(context, parentStep, nextStep));
      intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
        `judge run ${judgeRun}/${JUDGE_MAX_RUNS} batch ${slice.batchIndex}: ${batchOwners.length} usecase(s) judged, ${slice.pending.length} pending; ${errorsByOwner.size} routed so far, ${warnings.length} warning(s)`, 'input_output'));
      return intents;
    }

    // Last batch of this run: decide over everything the run accumulated.
    const routedByOwner = new Map<string, CbJudgeFinding[]>(errorsByOwner);
    for (const ownerId of routedOwners) if (!routedByOwner.has(ownerId)) routedByOwner.set(ownerId, []);
    state.judgePendingOwners = [];

    if (routedByOwner.size > 0 && judgeRun < JUDGE_MAX_RUNS) {
      // REPAIR ROUTE: re-spawn the origin workers with the findings in context, then re-judge.
      // Routing does NOT burn component budget (only real worker failures do); the judge itself is
      // bounded by JUDGE_MAX_RUNS, so this cannot loop.
      state.judgeRuns = judgeRun;
      await saveRepairState(state);
      const repairPlanId = `cb-usecase-repair-r${judgeRun}`;
      const repairedOwners = [...routedByOwner.keys()];
      intents.push(createParallelStepIntent(context, parentStep, repairPlanId, 'agentCbUsecase', 'Reparar usecases {{completed}}/{{total}}, falhas {{failed}}', repairedOwners, [], 10));
      // Re-verification is SCOPED to the repaired owners (mechanical) — cheaper/faster than re-judging
      // everything; run 1 already cleared the rest.
      const rstep = createAgentStepPayload(`cb-judge-r${judgeRun + 1}`, AGENT_NAME, `Juiz LLM (re-verificação de ${repairedOwners.length})`, { planId: `cb-judge-r${judgeRun + 1}`, judgeRun: judgeRun + 1, owners: repairedOwners }, [repairPlanId], 'sequential', 'waiting_dependency');
      rstep.onFailure = 'continue'; // same soft-fail as the run-1 judge step: an LLM 502 must not kill the task
      intents.push(createAddStepIntent(context, parentStep, rstep));
      // 'input_output': the pairs prompt is the largest interaction of the run (~120KB) and the
      // findings are already durable (saveAgentTrace file + cb-repair-state); keep only the cost.
      intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
        `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: ${routedByOwner.size} usecase(s) routed to repair; ${warnings.length} warning(s)`, 'input_output'));
      return intents;
    }

    // PASS or final run: proceed. Remaining errors on the final run are DOWNGRADED to warnings here —
    // the judge signals; the deterministic validators stay the blocking gate (never soften those).
    const leftoverErrors = findings.filter(f => f.severity === 'error');
    const traceMsg = leftoverErrors.length
      ? `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: budget exhausted; ${leftoverErrors.length} finding(s) downgraded to warning: ${leftoverErrors.slice(0, 8).map(f => `${f.ownerId}: ${f.message}`).join('; ')}`
      : `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: clean (${warnings.length} warning(s))`;
    intents.push(enqueueNext(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}));
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', traceMsg, 'input_output'));
    return intents;
  } catch (error) {
    // The judge must never kill a run by itself: fail soft to the chain, keep the trace objective.
    const msg = error instanceof Error ? error.message : String(error);
    return [
      enqueueNext(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
      // 'input' only: saveAgentTrace did not run on this path, so the payload is the sole record
      // of what the model returned — keep it for diagnosis, drop the ~120KB pairs prompt.
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `judge skipped (error): ${msg}`, 'input'),
    ];
  }
}
