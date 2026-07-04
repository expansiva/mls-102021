/// <mls fileReference="_102021_/l2/agentChangeBackend/agentCbJudge.ts" enhancement="_102027_/l2/enhancementAgent"/>

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
  readBackendScan, createPromptReadyIntent, createUpdateStatusIntent, createAgentStepPayload,
  createAddStepIntent, createParallelStepIntent, enqueueNext,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, saveAgentTrace,
  isRecord, readString, lowerFirst, logPrefix, type CbScan, type CbOwner,
} from '/_102021_/l2/agentChangeBackend/cbShared.js';
import { parseDefs } from '/_102021_/l2/agentChangeBackend/cbMaterializeCore.js';
import { judgeResultSchema } from '/_102021_/l2/agentChangeBackend/cbSchemas.js';
import {
  readRepairState, saveRepairState, usecaseDefsTarget,
  COMPONENT_REPAIR_BUDGET, JUDGE_MAX_RUNS, type CbJudgeFinding,
} from '/_102021_/l2/agentChangeBackend/cbRepair.js';

const AGENT_NAME = 'agentCbJudge';
const TOOL_NAME = 'submitJudgeFindings';
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the judge findings.', judgeResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend', agentDescription: 'Adversarial critic: usecase defs vs L4 contract; routes error findings to the repair loop', visibility: 'private', beforePromptStep, afterPromptStep };
}

/** The judge run number carried in the step args ({ judgeRun: n }); defaults to 1. */
function judgeRunOf(step: mls.msg.AIAgentStep): number {
  try {
    const p = JSON.parse(String(step.prompt || '{}'));
    if (p && typeof p.judgeRun === 'number' && p.judgeRun > 0) return p.judgeRun;
  } catch { /* default */ }
  return 1;
}

/** Read the saved usecase defs data for each operation owner ({} when missing). */
async function readUsecaseDefsByOwner(scan: CbScan): Promise<Map<string, Record<string, unknown> | null>> {
  const project = scan.project;
  const byShortName = new Map<string, Record<string, unknown>>();
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/layer_2_application/usecases')) continue;
    const parsed = parseDefs(String(await file.getContent()));
    if (isRecord(parsed.data)) byShortName.set(String(file.shortName || '').toLowerCase(), parsed.data as Record<string, unknown>);
  }
  const out = new Map<string, Record<string, unknown> | null>();
  for (const owner of scan.owners) {
    if (owner.kind !== 'operation') continue;
    out.set(owner.id, byShortName.get(lowerFirst(owner.id).toLowerCase()) ?? null);
  }
  return out;
}

/** Deterministic pre-findings: an operation owner whose usecase .defs.ts is missing entirely. */
function missingDefsFindings(defsByOwner: Map<string, Record<string, unknown> | null>): CbJudgeFinding[] {
  const findings: CbJudgeFinding[] = [];
  for (const [ownerId, defs] of defsByOwner) {
    if (defs === null) {
      findings.push({ ownerId, type: 'estrutural', severity: 'error', message: `usecase .defs.ts missing for operation ${ownerId} (worker failed or never saved)` });
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
    reads: o.reads,
    writes: o.writes,
    rulesApplied: o.rulesApplied,
    accessPattern: o.accessPattern ?? null,
    inputs: o.inputs,
    contextResolution: o.contextResolution,
    acceptanceAssertions: o.acceptanceAssertions,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const operations = scan.owners.filter(o => o.kind === 'operation');
    if (!operations.length) {
      return [
        enqueueNext(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no operation owners to judge'),
      ];
    }
    const defsByOwner = await readUsecaseDefsByOwner(scan);
    const pairs = operations.map(o => ({
      l4Contract: ownerContract(o),
      generatedUsecaseDefs: defsByOwner.get(o.id) ?? null,
    }));
    const validPorts = scan.aggregates.map(a => a.rootEntity);
    const mdmIds = scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId);
    const human = [
      `## Valid repository ports (aggregate roots): ${JSON.stringify(validPorts)}`,
      `## MDM entities (read by id via 102034; NEVER a port, NEVER a local entity): ${JSON.stringify(mdmIds)}`,
      '',
      '## Pairs to judge (L4 contract = source of truth vs generated usecase defs)',
      JSON.stringify(pairs, null, 2),
      '',
      `Judge every pair. Call ${TOOL_NAME} with the findings (empty array when everything is coherent).`,
    ].join('\n');
    return [createPromptReadyIntent(context, parentStep, hookSequential, (step.prompt || ''), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${msg}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', msg)];
  }
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const judgeRun = judgeRunOf(step);
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    const out = extractPlannerOutput(payload, plannerConfig(TOOL_NAME));
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const operationIds = new Set(scan.owners.filter(o => o.kind === 'operation').map(o => o.id));

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
    const detFindings = missingDefsFindings(await readUsecaseDefsByOwner(scan));
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

    if (errorsByOwner.size > 0 && judgeRun < JUDGE_MAX_RUNS) {
      // REPAIR ROUTE: re-spawn the origin workers with the findings in context, then re-judge.
      // Routing does NOT burn component budget (only real worker failures do); the judge itself is
      // bounded by JUDGE_MAX_RUNS, so this cannot loop.
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
      state.judgeRuns = judgeRun;
      await saveRepairState(state);
      const repairPlanId = `cb-usecase-repair-r${judgeRun}`;
      intents.push(createParallelStepIntent(context, parentStep, repairPlanId, 'agentCbUsecase', 'Reparar usecases {{completed}}/{{total}}, falhas {{failed}}', [...errorsByOwner.keys()], [], 10));
      intents.push(createAddStepIntent(context, parentStep, createAgentStepPayload(`cb-judge-r${judgeRun + 1}`, AGENT_NAME, 'Juiz LLM (re-verificação)', { planId: `cb-judge-r${judgeRun + 1}`, judgeRun: judgeRun + 1 }, [repairPlanId], 'sequential', 'waiting_dependency')));
      intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
        `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: ${errorsByOwner.size} usecase(s) routed to repair; ${warnings.length} warning(s)`));
      return intents;
    }

    // PASS or final run: proceed. Remaining errors on the final run are DOWNGRADED to warnings here —
    // the judge signals; the deterministic validators stay the blocking gate (never soften those).
    const leftoverErrors = findings.filter(f => f.severity === 'error');
    const traceMsg = leftoverErrors.length
      ? `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: budget exhausted; ${leftoverErrors.length} finding(s) downgraded to warning: ${leftoverErrors.slice(0, 8).map(f => `${f.ownerId}: ${f.message}`).join('; ')}`
      : `judge run ${judgeRun}/${JUDGE_MAX_RUNS}: clean (${warnings.length} warning(s))`;
    intents.push(enqueueNext(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}));
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', traceMsg));
    return intents;
  } catch (error) {
    // The judge must never kill a run by itself: fail soft to the chain, keep the trace objective.
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${msg}`);
    return [
      enqueueNext(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `judge skipped (error): ${msg}`),
    ];
  }
}

const systemPrompt = `
<!-- modelType: codehigh -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME}, an ADVERSARIAL CRITIC (a judge). You NEVER generate or rewrite artifacts —
you only compare each generated usecase defs against its L4 contract (the source of truth) and emit
FINDINGS. Judge every pair on:

1. Ports: usecase ports must be aggregate roots from the valid list. An invented port, a port for an
   MDM entity, or a missing port for an entity the operation reads/writes -> estrutural error.
2. rulesApplied: every L4 rule id must appear in the usecase rulesApplied (top-level or function) and
   be applicable with the declared inputs/entities. A rule that cannot run with the modeled data ->
   estrutural error.
3. Inputs vs accessPattern: function input fields must match the L4 inputs[] and accessPattern.kind
   (list -> filters, getById -> the declared keyField, commandInput -> the payload). A required user
   input the L4 resolves by context (systemDefault/currentWorkspace/actorSession/contextResolution) ->
   decisao error ("automatic operation asking manual input"). A missing required input -> estrutural.
4. acceptanceAssertions: each assertion must be satisfiable by the declared functions' input/output.
   Unsatisfiable -> estrutural error.
5. Anything about backend orchestration, sync/async, HTTP details or persistence internals is NOT
   judged here -> type fora_de_escopo (it will be discarded).

severity "error" ONLY when the defect is clear and actionable by regenerating that one usecase;
otherwise "warning". Be precise: message must name the exact field/port/rule. Call "{{toolName}}"
with { findings: [...] } (empty array when all pairs are coherent). No prose.
`;
