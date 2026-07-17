/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-usecase/agentCbUsecase.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the usecases (layer_2_application/usecases), ONE per pending operation/workflow. To keep
// each LLM response small (the per-usecase defs carry explicit functions[] input/output), this agent
// fans out via the runtime's parallel_dynamic/progress: a DISPATCHER step (deterministic, no LLM)
// emits ONE parallel step whose args queue = the owner ids (createParallelStepIntent, maxParallel 10).
// The runtime runs the workers in a pool of 5 slots and DISCARDS each child's payload as it finishes
// (the task stays small), instead of keeping N persistent steps. Each WORKER (same agent, reached with
// its ownerId in hook.args) does one LLM call and saves one usecase .defs.ts. The controller step JOINS
// on the single parallel parent (dependsOn its planId).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readBackendScan, createPromptReadyIntent, createUpdateStatusIntent, createAgentStepPayload, readCbPrompt,
  createAddStepIntent, createParallelStepIntent,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, saveAgentTrace,
  saveDefs, buildArtifact, buildPipelineItem, usecaseFileInfo, repositoryPortFileInfo, domainEntityFileInfo,
  dtsRef, layerSkills, readString, readStringArray, lowerFirst, logPrefix,
  type CbScan, type CbOwner, type CbOutputShape,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { usecaseResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import { getComponentRepair, clearComponentRepair, recordComponentFailure, buildRepairPromptSection } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';

const AGENT_NAME = 'agentCbUsecase';
const TOOL_NAME = 'submitUsecase';
const FANOUT_PLAN_ID = 'cb-usecase-fanout';
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the usecase.', usecaseResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-usecase', agentDescription: 'Generate application usecases (parallel_dynamic worker per owner; controller joins)', visibility: 'private', beforePromptStep, afterPromptStep };
}

// The owner id of a WORKER invocation arrives in hook.args (a bare id); the DISPATCHER step carries a
// JSON prompt ({planId:...}) and no bare id. Resolve from args first, then step.prompt as a fallback.
function workerOwnerId(args: string | undefined, step: mls.msg.AIAgentStep): string {
  const a = (args ?? '').trim();
  if (a && !a.startsWith('{')) return a;
  const p = String((step as { prompt?: string })?.prompt ?? '').trim();
  return p && !p.startsWith('{') ? p : '';
}

// Shared maps derived from the scan (aggregate roots, mdm ids, embedded child -> parent root, events).
function deriveMaps(scan: CbScan) {
  const roots = new Set(scan.aggregates.map(a => a.rootEntity));
  const mdmIds = new Set(scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId)); // master data: read by id, no port
  const childToRoot = new Map<string, string>();
  for (const a of scan.aggregates) for (const m of a.embeddedMembers) childToRoot.set(m, a.rootEntity);
  const byId = new Map(scan.entities.map(e => [e.entityId, e]));
  // ownerEntity -> events the owner's usecases must emit when they mutate that aggregate.
  const eventsByOwner = new Map<string, typeof scan.events>();
  for (const ev of scan.events) {
    const list = eventsByOwner.get(ev.ownerEntity) || [];
    list.push(ev);
    eventsByOwner.set(ev.ownerEntity, list);
  }
  return { roots, mdmIds, childToRoot, byId, eventsByOwner };
}

/** Reject defs that drift from the current entity/port contract before materialization can turn the
 * mismatch into broken TypeScript. */
function validateUsecasePlan(result: any, scan: CbScan, ownerId: string): string[] {
  const issues: string[] = [];
  const entities = new Map(scan.entities.map(entity => [entity.entityId, entity]));
  const knownPorts = new Set([
    ...scan.aggregates.map(aggregate => aggregate.rootEntity),
    ...scan.events.filter(event => event.persisted).map(event => event.entityId),
  ]);
  for (const port of readStringArray(result?.ports)) if (!knownPorts.has(port)) issues.push(`usecase ${ownerId}: unknown port '${port}'`);
  for (const fn of Array.isArray(result?.functions) ? result.functions : []) {
    for (const port of readStringArray(fn?.ports)) if (!knownPorts.has(port)) issues.push(`usecase ${ownerId}.${fn?.functionName || '<function>'}: unknown port '${port}'`);
    for (const io of [...(Array.isArray(fn?.input) ? fn.input : []), ...(Array.isArray(fn?.output) ? fn.output : [])]) {
      const entityId = readString(io?.ofEntity);
      if (!entityId) continue;
      const entity = entities.get(entityId);
      if (!entity) { issues.push(`usecase ${ownerId}.${fn?.functionName || '<function>'}: unknown ofEntity '${entityId}'`); continue; }
      const fieldName = readString(io?.name);
      if (fieldName && !(entity.fields ?? []).some((field: any) => field.fieldId === fieldName)) {
        issues.push(`usecase ${ownerId}.${fn?.functionName || '<function>'}: ${entityId}.${fieldName} is not declared by the entity`);
      }
    }
    const allowedStatuses = new Set(scan.entities.flatMap(entity => (entity.fields ?? []).flatMap((field: any) => Array.isArray(field.enum) ? field.enum : [])));
    for (const step of readStringArray(fn?.steps)) {
      // Steps are primarily natural-language explanations. Only validate an explicit QUOTED
      // assignment (`status = "delivered"`, `status: 'delivered'`, `status is "delivered"`), never
      // prose: unquoted forms like "status: must be 'active'" captured 'must' and burned repair
      // budget on a false positive (run 102049-c, updateReservationStatus).
      for (const match of step.matchAll(/\bstatus\s*(?:=|:)\s*["']([A-Za-z][A-Za-z0-9_]*)["']|\bstatus\s+is\s+["']([A-Za-z][A-Za-z0-9_]*)["']/giu)) {
        const status = match[1] || match[2];
        if (!allowedStatuses.has(status)) issues.push(`usecase ${ownerId}.${fn?.functionName || '<function>'}: status '${status}' is not declared by any entity enum`);
      }
    }
  }
  return [...new Set(issues)];
}

/** Deterministic ofEntity repair, BEFORE validation. ofEntity is metadata (never emitted as code),
 * but models echo the l4 fieldRef into it ('Product.name' instead of 'Product') or annotate
 * filter/projection aliases (searchTerm, minPrice) with an entity — and they repeat the mistake on
 * repair, burning the whole component budget on something a string fix resolves (run 102049-c lost
 * 6/16 usecases to exactly this). Fix what is fixable, DROP what is not:
 * - 'Entity.field' -> 'Entity' (when Entity exists in the scan);
 * - unknown entity, or a field name the entity does not declare -> remove ofEntity. */
function sanitizeOfEntity(result: any, scan: CbScan): void {
  const entities = new Map(scan.entities.map(entity => [entity.entityId, entity]));
  for (const fn of Array.isArray(result?.functions) ? result.functions : []) {
    for (const io of [...(Array.isArray(fn?.input) ? fn.input : []), ...(Array.isArray(fn?.output) ? fn.output : [])]) {
      if (!io || typeof io !== 'object') continue;
      const raw = readString(io.ofEntity);
      if (!raw) continue;
      const entityId = raw.includes('.') ? raw.split('.')[0] : raw;
      const entity = entities.get(entityId);
      const fieldName = readString(io.name);
      if (!entity || (fieldName && !(entity.fields ?? []).some((field: any) => field.fieldId === fieldName))) {
        delete io.ofEntity;
      } else {
        io.ofEntity = entityId;
      }
    }
  }
}

// The single-owner item sent to the LLM (explicit ports/mdmRefs + entity fields to shape input/output).
function buildOwnerItem(o: CbOwner, maps: ReturnType<typeof deriveMaps>) {
  const { roots, mdmIds, childToRoot, byId, eventsByOwner } = maps;
  const fieldsOf = (id: string) => (byId.get(id)?.fields || []).map((f: any) => ({ fieldId: f.fieldId, type: f.type, required: f.required, ...(f.enum ? { enum: f.enum } : {}) }));
  const rawRefs = [...new Set([o.entity, ...o.reads, ...o.writes].filter(Boolean))];           // keep children + mdm for fields
  const portRefs = [...new Set(rawRefs.map(id => childToRoot.get(id) ?? id))];                  // children -> parent root
  // Events the owner must emit: those owned by an aggregate this usecase writes (entity + writes).
  const mutated = new Set([o.entity, ...o.writes].filter(Boolean).map(id => childToRoot.get(id) ?? id));
  const eventWrites = [...new Set([o.entity, ...o.writes].filter(Boolean))]
    .flatMap(id => eventsByOwner.get(id) || [])
    .concat([...mutated].flatMap(id => eventsByOwner.get(id) || []))
    .filter((ev, i, arr) => arr.findIndex(x => x.entityId === ev.entityId) === i)
    .map(ev => ({ entityId: ev.entityId, owner: ev.ownerEntity, purpose: ev.purpose, persisted: ev.persisted, port: ev.persisted ? ev.entityId : null }));
  return {
    usecaseId: o.id,
    ownerKind: o.kind,
    opKind: o.opKind,
    entity: o.entity,
    parentAggregate: childToRoot.get(o.entity) ?? o.entity,
    reads: o.reads,
    writes: o.writes,
    rulesApplied: o.rulesApplied,
    accessPattern: o.accessPattern ?? null,
    // Option 3: the canonical wire shape from l4. The function output type is PINNED to this — it is
    // copied over the model's output below, so the usecase never re-drifts the contract.
    outputShape: o.outputShape ?? null,
    inputs: o.inputs,
    contextResolution: o.contextResolution,
    acceptanceAssertions: o.acceptanceAssertions,
    ports: portRefs.filter(id => roots.has(id) && !mdmIds.has(id)),
    mdmRefs: rawRefs.filter(id => mdmIds.has(id)),
    eventWrites, // append-only events to emit (persisted -> via its port; reaction -> outbox)
    entityFields: Object.fromEntries(rawRefs.map(id => [id, fieldsOf(id)])),
  };
}

// Option 3: flatten the l4 canonical outputShape to the usecase-defs top-level `output` field list
// (downstream — gen-http responseShape, materialize — reads this shape). The full structured shape is
// also kept on `fn.outputShape` so the usecase materializer generates the exact output interface.
function cbOutputShapeToDefsFields(shape: CbOutputShape): Array<Record<string, unknown>> {
  return shape.fields.map(field => {
    const entity = field.fieldRef && field.fieldRef.includes('.') ? field.fieldRef.split('.')[0] : undefined;
    return {
      name: field.name,
      type: field.type,
      required: field.required,
      ...(entity ? { ofEntity: entity } : {}),
    };
  });
}

// ── beforePromptStep: dispatch (fan-out) or worker (one usecase) ───────────────

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const ownerId = workerOwnerId(args, step);
  return ownerId
    ? worker(agent, context, parentStep, step, hookSequential, ownerId)
    : dispatch(agent, context, parentStep, step, hookSequential);
}

// DISPATCHER (deterministic, no LLM): ONE parallel_dynamic step whose args queue is the owner ids
// (runtime pool of 5, payloads discarded as each finishes) + the controller JOIN on that parent.
async function dispatch(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    // Only OPERATIONS are BFF command owners with their own usecase. Workflows are pure L4
    // orchestration/composition realized by their member operations — they generate no usecase,
    // controller or command (their status is still finalized to done downstream).
    const ownerIds = scan.owners.filter(o => o.kind === 'operation').map(o => o.id).filter(Boolean);
    if (!ownerIds.length) {
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no operation owners to generate')];
    }
    // stepTitle is used by the runtime as the progress templateTitle ({{completed}}/{{total}}/{{failed}}
    // are substituted live as workers finish), e.g. "Gerar usecases 27/27, falhas 0".
    const intents: mls.msg.AgentIntent[] = [
      createParallelStepIntent(context, parentStep, FANOUT_PLAN_ID, AGENT_NAME, 'Gerar usecases {{completed}}/{{total}}, falhas {{failed}}', ownerIds, [], 10),
    ];
    // JUDGE joins on the single parallel parent (runs after every worker finished): adversarial
    // critique of the saved usecase defs vs the L4 contract, routing error findings back to these
    // workers (repair loop) before controllers/materialization. The judge enqueues cb-gen-http.
    const jstep = createAgentStepPayload('cb-judge', 'agentCbJudge', 'Juiz LLM (usecases vs L4)', { planId: 'cb-judge', judgeRun: 1 }, [FANOUT_PLAN_ID], 'sequential', 'waiting_dependency');
    // The judge must never kill a run (its afterPrompt fails soft to cb-gen-http). Without 'continue',
    // an LLM-CALL failure (proxy 502) would mark the whole task failed before afterPrompt ever ran.
    jstep.onFailure = 'continue';
    intents.push(createAddStepIntent(context, parentStep, jstep));
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `fan-out ${ownerIds.length} usecase(s) (parallel_dynamic)`));
    return intents;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${msg}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', msg)];
  }
}

// WORKER: build the prompt for ONE owner and ask the model for that single usecase.
async function worker(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, ownerId: string): Promise<mls.msg.AgentIntent[]> {
  const scan = await readBackendScan(['toCreate', 'inProgress']);
  const owner = scan.owners.find(o => o.id === ownerId);
  // NB: worker children never return 'failed' (a failed step does not satisfy dependsOn and would
  // stall the fan-out join); the judge/validate-all report what is missing.
  if (!owner) return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `[worker-error] owner not found: ${ownerId}`)];
  if (owner.kind !== 'operation') return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `skip ${ownerId}: workflows generate no usecase`)];
  const item = buildOwnerItem(owner, deriveMaps(scan));
  let human = `## Owner -> usecase (entity fields included so you can declare explicit input/output)\n${JSON.stringify(item, null, 2)}\n\nReturn ONE usecase with functions[] — each function has explicit input[] and output[] FIELDS. accessPattern decides list/get/lookup/commandInput. inputs declares the public/request inputs. contextResolution declares values resolved from runtime context/defaults/previous navigation; do not turn systemDefault/currentWorkspace/actorSession/businessContext resolutions into required user input. A usecase MAY expose several functions with different IO.`;
  // REPAIR: when the judge (or a previous failure) left findings for this owner, feed them back so the
  // model FIXES the exact defects instead of regenerating blindly (repair loop, cbRepair.ts).
  const repair = await getComponentRepair(`usecase-defs:${ownerId}`);
  if (repair && repair.findings.length) human += `\n\n${buildRepairPromptSection(repair)}`;
  // prompt_ready args MUST equal the parallel child's queued hook args (the ownerId) so the runtime
  // (continueBeforePrompt → findBeforePromptStep by parentStepId+args) matches it. step.prompt is not
  // yet set to the arg on the first beforePromptStep of a parallel child.
  const systemPrompt = await readCbPrompt('steps/gen-usecase');
  return [createPromptReadyIntent(context, parentStep, hookSequential, ownerId, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

// ── afterPromptStep (worker only): save the one usecase .defs.ts ───────────────

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let trace: string | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) {
      // Truthful finding for LLM INFRA failures (proxy/credit errors leave no payload — see run f).
      const infra = (step.interaction?.trace ?? []).map(String)
        .filter(t => t.includes('Error invoking Collab LLM proxy') || t.includes('Error executing AI task')).slice(-1)[0];
      throw new Error(infra ? `LLM infra failure (no payload): ${infra.slice(0, 300)}` : 'missing payload');
    }
    const out = extractPlannerOutput(payload, plannerConfig(TOOL_NAME));
    const result = out.result as any;
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const module = scan.moduleNames[0] || 'unknown';
    const { roots, mdmIds, childToRoot } = deriveMaps(scan);
    const usecaseId = readString(result?.usecaseId) || workerOwnerId(args, step);
    if (!usecaseId) throw new Error('missing usecaseId');
    const queuedOwnerId = workerOwnerId(args, step);
    if (queuedOwnerId && usecaseId !== queuedOwnerId) throw new Error(`usecaseId '${usecaseId}' does not match queued owner '${queuedOwnerId}'`);

    // Validate raw model output before normalization. Filtering invented ports first would silently
    // mask a bad defs response instead of routing it through the repair loop. ofEntity is the one
    // exception: it is repaired/dropped deterministically first (see sanitizeOfEntity) because the
    // repair loop demonstrably cannot fix it via LLM.
    sanitizeOfEntity(result, scan);
    const planIssues = validateUsecasePlan(result, scan, usecaseId);
    if (planIssues.length) throw new Error(`usecase defs validation failed: ${planIssues.slice(0, 12).join('; ')}`);

    // Final ports = model's ports ∪ deterministic ports (owner entity+writes, children -> parent root),
    // with mdm removed (master data is read by id via 102034, not through a port).
    const owner = scan.owners.find(o => o.id === usecaseId);
    const ownerRefs = owner ? [owner.entity, ...owner.reads, ...owner.writes].filter(Boolean) : [];
    const detPorts = [...new Set(ownerRefs.map(id => childToRoot.get(id) ?? id))].filter(id => roots.has(id) && !mdmIds.has(id));
    // Trust only REAL aggregate roots: the model sometimes invents port names ("dailyShiftPort",
    // "recipePort", "productionTicket"). Keep model ports only if they are real roots, union with the
    // deterministic ones (derived from the owner's entities, children resolved to their parent).
    const aggPorts = [...new Set([...readStringArray(result?.ports), ...detPorts])].filter(id => roots.has(id) && !mdmIds.has(id));
    // Persisted event ports the owner emits (own real ports too) — append-only writes within the txn.
    const mutated = new Set(ownerRefs.map(id => childToRoot.get(id) ?? id));
    const eventPortIds = scan.events
      .filter(ev => ev.persisted && (ownerRefs.includes(ev.ownerEntity) || mutated.has(ev.ownerEntity)))
      .map(ev => ev.entityId);
    const ports = [...new Set([...aggPorts, ...eventPortIds])];
    result.ports = ports;
    result.mdmRefs = [...new Set(ownerRefs.filter(id => mdmIds.has(id)))];
    const resultFns = Array.isArray(result?.functions) ? result.functions : [];
    for (const fn of resultFns) {
      fn.ports = readStringArray(fn?.ports).filter((id: string) => ports.includes(id)); // drop invented ports
    }
    // Option 3: PIN the output type to the l4 canonical outputShape. The model implements the body and
    // declares the input; the OUTPUT is NOT the model's to invent. For a single-function operation,
    // copy the l4 shape onto the function (structured on `outputShape`, flattened on `output`) so the
    // usecase output = DTO = l4 and never re-drifts. Multi-function/dispatcher owners keep the model
    // output (best-effort — no single l4 shape maps to several functions).
    if (owner?.outputShape && resultFns.length === 1) {
      resultFns[0].outputShape = owner.outputShape;
      resultFns[0].output = cbOutputShapeToDefsFields(owner.outputShape);
    }
    const fi = usecaseFileInfo(module, usecaseId);
    const dependsFiles = [
      ...ports.map(p => dtsRef(repositoryPortFileInfo(module, p))),
      ...ports.map(p => dtsRef(domainEntityFileInfo(module, p))),
    ];
    const pipeline = [buildPipelineItem(lowerFirst(usecaseId), 'applicationUsecase', fi, dependsFiles, layerSkills('applicationUsecase.md'), { rulesApplied: readStringArray(result?.rulesApplied) })];
    await saveDefs(fi, `${lowerFirst(usecaseId)}Usecase`, buildArtifact('usecase', usecaseId, module, AGENT_NAME, result), pipeline);
    if (out.status === 'failed') { status = 'failed'; trace = 'model returned failed'; }
    else await clearComponentRepair(`usecase-defs:${usecaseId}`); // converged: drop the repair record
  } catch (error) {
    status = 'failed';
    trace = error instanceof Error ? error.message : String(error);
    // No console output: the trace lands on the step and the finding on cb-repair-state (below).
  }
  if (status === 'failed') {
    // Burn a repair attempt and keep the error as a finding: the judge (cb-judge) detects the missing
    // defs deterministically and re-spawns this worker while the budget lasts (repair loop).
    const failedOwnerId = workerOwnerId(args, step);
    if (failedOwnerId) await recordComponentFailure(`usecase-defs:${failedOwnerId}`, [trace || 'usecase generation failed']);
    // ENGINE SEMANTICS (2026-07-04): a FAILED child does NOT satisfy dependsOn — the fan-out join
    // (cb-judge) would wait forever. Complete with a "[repair]" trace instead; the judge routes the
    // repair and the deterministic gates downstream keep blocking what does not converge.
    status = 'completed';
    trace = `[repair] ${trace || 'usecase generation failed'}`;
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  // No enqueueNext here: the controller step was already queued by the dispatcher with a join dependsOn.
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, trace)];
}
