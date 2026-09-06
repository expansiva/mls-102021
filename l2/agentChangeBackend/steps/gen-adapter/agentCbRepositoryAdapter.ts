/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-adapter/agentCbRepositoryAdapter.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the repository ADAPTER (layer_1_external/adapters/persistence) implementing the port:
// maps domain <-> row (columns + details JSONB with child collections), resolves MDM via the 102034
// facade. The ONLY place with ctx.data.moduleData.
//
// FANS OUT like agentCbDomainEntity: a DISPATCHER step (deterministic, no LLM) emits ONE
// parallel_dynamic step whose args queue = the aggregate roots + persisted events
// (createParallelStepIntent, CB_MAX_PARALLEL slots). Each WORKER (same agent, reached with its
// entityId in hook.args) does ONE LLM call for a SINGLE adapter and saves one .defs.ts.
// cb-gen-usecase JOINS on the fan-out (dependsOn cb-adapter-fanout). This replaced the WHOLE-LAYER
// single call, whose large strict-schema output truncated on big modules (22 aggregates in one
// batch). The system prompt and submitRepositoryAdapters schema are UNCHANGED — a worker just
// receives ONE item instead of the whole layer.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { recordComponentFailure, recordLlmCost } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import {
  readBackendScan, planTableColumns, createPromptReadyIntent, createUpdateStatusIntent, enqueueNext, readCbPrompt,
  createParallelStepIntent, CB_MAX_PARALLEL, createAddStepIntent, createAgentStepPayload,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, batchSchema, asArray, saveAgentTrace,
  saveDefs, writeDefsSource, buildArtifact, buildPipelineItem, repositoryAdapterFileInfo, repositoryPortFileInfo,
  persistenceTableFileInfo, domainEntityFileInfo, dtsRef, layerSkills, readString, lowerFirst, logPrefix,
  newestL4DefsMs, defsCurrent, isRebuildCommand,
  type CbScan,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { recordFailedCbRun } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';
import { repositoryAdapterResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import { rewriteAdapterDefsNotes, sanitizeAdapterNotes } from '/_102021_/l2/agentChangeBackend/helpers/cbAdapterNotes.js';
import {
  methodNamesFromPortDefsSource, requiredMethodsForEntity, unionMethodNames,
} from '/_102021_/l2/agentChangeBackend/helpers/cbPortMethods.js';

const AGENT_NAME = 'agentCbRepositoryAdapter';
const TOOL_NAME = 'submitRepositoryAdapters';
const FANOUT_PLAN_ID = 'cb-adapter-fanout';
const NEXT_PLAN_ID = 'cb-gen-usecase';
// Same tool/schema as the former whole-layer call: worker returns { items: [ one adapter ] }.
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the repository adapters.', batchSchema(repositoryAdapterResultSchema));

// Rules text shared by every worker. Distribution changed (one item); this contract did not.
const ADAPTER_RULES = 'map domain <-> row - only "columns" are real columns (snake_case at the table). "detailsFields" + "embeddedMembers" go inside the details JSONB under the fieldId verbatim (camelCase — never snake_case a JSONB key; seeds write fieldId). Implement EVERY name in portMethods (the port interface) — if delete is listed, the factory return object MUST include async delete(id). list() honours optional filter.search via findMany ilike on the title/name column, and filter.sortBy/sortOrder via orderBy (enum fields: sort in memory by the declared enum order, never SQL text). When the list is paginated, list() uses resolveListPage (default 20, cap 200) as findMany limit/offset and count() uses the same where/ilike without limit/offset. Every adapter reads and writes its local module table through ctx.data.moduleData.getTable<Row>(\'<table>\') — this is REQUIRED and it is the only persistence API. Never keep state in a module-level Map/WeakMap/array: the runtime already provides an in-memory store for tests and Postgres in production behind the same call. resolve mdmRefs via ctx.mdm. For permanent MDM, list by canonical module type with ctx.mdm.collection.listByType, bulk load with ctx.mdm.collection.getMany/hydrateMany, and read relationships with ctx.mdm.collection.relatedOfMany. For prospect/pre-qualified lead flows use ctx.mdm.prospect.create/get/listByType/update/promoteToEntity. Module-specific fields live in entity.details.<module>. Never call ctx.mdm.entity.get inside a loop. Never use ctx.data.mdmDocument, ctx.data.mdmEntityIndex, ctx.data.mdmRelationship, tx.mdmDocument, tx.mdmEntityIndex or tx.mdmRelationship. Event adapters implement append (insert one row, no update/delete) + the read finders. ctx.data.moduleData is scoped to local module tables (never MDM).';

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-adapter', agentDescription: 'Generate repository adapters (parallel_dynamic worker per aggregate/event; cb-gen-usecase joins)', visibility: 'private', beforePromptStep, afterPromptStep };
}

// The entity id of a WORKER invocation arrives in hook.args (a bare id); the DISPATCHER step carries a
// JSON prompt ({planId:...}) and no bare id. Resolve from args first, then step.prompt as a fallback.
function workerEntityId(args: string | undefined, step: mls.msg.AIAgentStep): string {
  const a = (args ?? '').trim();
  if (a && !a.startsWith('{')) return a;
  const p = String((step as { prompt?: string })?.prompt ?? '').trim();
  return p && !p.startsWith('{') ? p : '';
}

function listAdapterTargets(scan: CbScan): string[] {
  return [
    ...scan.aggregates.map(a => a.rootEntity),
    ...scan.events.filter(ev => ev.persisted).map(ev => ev.entityId),
  ].filter(Boolean);
}

// The SAME object the former whole-layer call put in items[] / eventItems[], just one entry.
async function buildAdapterItem(entityId: string, scan: CbScan, module: string): Promise<Record<string, unknown> | null> {
  const entityIds = new Set(scan.entities.map(e => e.entityId));
  const byId = new Map(scan.entities.map(e => [e.entityId, e]));
  const deleteTargets = new Set(scan.deleteTargetEntityIds);
  const aggregate = scan.aggregates.find(a => a.rootEntity === entityId);
  if (aggregate) {
    const plan = planTableColumns(byId.get(aggregate.rootEntity)?.fields || [], entityIds);
    const portMethods = await portMethodsForEntity(module, aggregate.rootEntity, requiredMethodsForEntity(aggregate.rootEntity, deleteTargets), false);
    return {
      entityId: aggregate.rootEntity,
      embeddedMembers: aggregate.embeddedMembers,
      mdmRefs: aggregate.mdmRefs,
      columns: plan.indexed.map(c => c.fieldId),
      detailsFields: plan.details,
      portMethods,
    };
  }
  const event = scan.events.find(ev => ev.persisted && ev.entityId === entityId);
  if (event) {
    const plan = planTableColumns(event.fields || [], entityIds);
    const portMethods = await portMethodsForEntity(module, event.entityId, [], true);
    return { entityId: event.entityId, embeddedMembers: [] as string[], mdmRefs: [] as string[], columns: plan.indexed.map(c => c.fieldId), detailsFields: plan.details, appendOnlyEvent: true, portMethods };
  }
  return null;
}

async function saveAdapterItem(module: string, entityId: string, item: Record<string, unknown>, isEvent: boolean, deleteTargets: Set<string>): Promise<void> {
  const required = isEvent ? [] : requiredMethodsForEntity(entityId, deleteTargets);
  const portMethods = await portMethodsForEntity(module, entityId, required, isEvent);
  item.portMethods = portMethods;
  const fi = repositoryAdapterFileInfo(module, entityId);
  const dependsFiles = [
    dtsRef(repositoryPortFileInfo(module, entityId)),
    dtsRef(persistenceTableFileInfo(module, entityId)),
    dtsRef(domainEntityFileInfo(module, entityId)),
  ];
  const pipeline = [buildPipelineItem(`${lowerFirst(entityId)}RepositoryAdapter`, 'repositoryAdapter', fi, dependsFiles, layerSkills('repositoryAdapter.md'))];
  const notes = Array.isArray(item.notes) ? item.notes.filter((n): n is string => typeof n === 'string') : [];
  if (portMethods.length) notes.push(`Implement every port method: ${portMethods.join(', ')}.`);
  item.notes = sanitizeAdapterNotes(notes);
  await saveDefs(fi, `${lowerFirst(entityId)}RepositoryAdapter`, buildArtifact('repositoryAdapter', `${entityId}RepositoryAdapter`, module, AGENT_NAME, item), pipeline);
}

function enqueueUsecase(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep): mls.msg.AgentIntentAddStep {
  return enqueueNext(context, parentStep, step, NEXT_PLAN_ID, 'agentCbUsecase', 'Gerar usecases', {});
}

// ── beforePromptStep: dispatch (fan-out) or worker (one adapter) ───────────────

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const entityId = workerEntityId(args, step);
  return entityId
    ? worker(agent, context, parentStep, step, hookSequential, entityId)
    : dispatch(agent, context, parentStep, step, hookSequential);
}

// DISPATCHER (deterministic, no LLM): reuse fast-path, else ONE parallel_dynamic step whose args
// queue is the entity ids (CB_MAX_PARALLEL slots) + the cb-gen-usecase JOIN on that fan-out.
async function dispatch(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const targets = listAdapterTargets(scan);
    // REUSE fast-path: if every target .defs.ts already exists and is newer than the L4 input, skip
    // the whole fan-out. /rebuild forces regeneration. Notes still go through the sanitizer.
    if (!isRebuildCommand(context)) {
      const module = scan.moduleNames[0] || 'unknown';
      const watermark = newestL4DefsMs(scan.project);
      if (targets.length && targets.every(id => defsCurrent(repositoryAdapterFileInfo(module, id), watermark))) {
        await sanitizeReusedAdapterDefs(module, targets);
        return [
          enqueueUsecase(context, parentStep, step),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `reused ${targets.length} repository adapter .defs.ts (L4 unchanged; skipped generation)`, 'input_output'),
        ];
      }
    }
    if (!targets.length) {
      return [
        enqueueUsecase(context, parentStep, step),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no repository adapters to generate'),
      ];
    }
    // The barrier is the FAN-OUT, never this dispatcher: `dispatch` completes the moment it returns
    // these intents, so a cb-gen-usecase that depends on it starts while the workers are still
    // writing their defs. Same class of defect as cb-gen-usecase joining on its dispatcher
    // (2026-08-28, 5 bffCalls and the taskHub controller silently dropped).
    const intents: mls.msg.AgentIntent[] = [
      createParallelStepIntent(context, parentStep, FANOUT_PLAN_ID, AGENT_NAME, 'Gerar adapters de persistência {{completed}}/{{total}}, falhas {{failed}}', targets, [], CB_MAX_PARALLEL),
    ];
    const nextStep = createAgentStepPayload(NEXT_PLAN_ID, 'agentCbUsecase', 'Gerar usecases', { planId: NEXT_PLAN_ID }, [FANOUT_PLAN_ID], 'sequential', 'waiting_dependency');
    intents.push(createAddStepIntent(context, parentStep, nextStep));
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `fan-out ${targets.length} repository adapter worker(s) (parallel_dynamic, CB_MAX_PARALLEL slots)`));
    return intents;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${msg}`);
    await recordFailedCbRun({ longMemory: context.task?.iaCompressed?.longMemory, reason: msg });
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', msg)];
  }
}

// WORKER: build the prompt for ONE adapter and ask the model for that single item.
async function worker(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, entityId: string): Promise<mls.msg.AgentIntent[]> {
  const scan = await readBackendScan(['toCreate', 'inProgress'], context);
  const module = scan.moduleNames[0] || 'unknown';
  const item = await buildAdapterItem(entityId, scan, module);
  // NB: worker children never return 'failed' (a failed step does not satisfy dependsOn and would
  // stall the cb-gen-usecase join); report the problem as a completed [worker-error] trace instead.
  if (!item) return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `[worker-error] adapter target not found: ${entityId}`)];
  if (!isRebuildCommand(context) && defsCurrent(repositoryAdapterFileInfo(module, entityId), newestL4DefsMs(scan.project))) {
    await sanitizeReusedAdapterDefs(module, [entityId]);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `reused repository adapter ${entityId} .defs.ts (L4 unchanged)`)];
  }
  const isEvent = item.appendOnlyEvent === true;
  const heading = isEvent
    ? '## Append-only event adapter'
    : '## Aggregate (column vs details split + embedded + mdm refs)';
  const human = `${heading}\n${JSON.stringify(item, null, 2)}\n\nReturn ONE item { entityId: "${entityId}" } implementing I{Entity}Repository: ${ADAPTER_RULES}`;
  // prompt_ready args MUST equal the parallel child's queued hook args (the entityId) so the runtime
  // (continueBeforePrompt -> findBeforePromptStep by parentStepId+args) matches it.
  const systemPrompt = await readCbPrompt('steps/gen-adapter');
  return [createPromptReadyIntent(context, parentStep, hookSequential, entityId, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

// ── afterPromptStep (worker only): save the one adapter .defs.ts ───────────────

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  await recordLlmCost('gen-adapter', step.interaction); // T7: per-phase cost telemetry (best-effort)
  let status: mls.msg.AIStepStatus = 'completed';
  let trace: string | undefined;
  const entityId = workerEntityId(args, step);
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) {
      const infra = (step.interaction?.trace ?? []).map(String)
        .filter(t => t.includes('Error invoking Collab LLM proxy') || t.includes('Error executing AI task')).slice(-1)[0];
      throw new Error(infra ? `LLM infra failure (no payload): ${infra.slice(0, 300)}` : 'missing payload');
    }
    const out = extractPlannerOutput(payload, plannerConfig(TOOL_NAME));
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const module = scan.moduleNames[0] || 'unknown';
    const deleteTargets = new Set(scan.deleteTargetEntityIds);
    const eventIds = new Set(scan.events.filter(ev => ev.persisted).map(ev => ev.entityId));
    const items = asArray((out.result as any).items);
    const modelItem = items.find(it => readString(it.entityId) === entityId) ?? items[0];
    if (!modelItem || !entityId) throw new Error(`adapter item not found: ${entityId}`);
    const isEvent = eventIds.has(entityId);
    await saveAdapterItem(module, entityId, { ...modelItem, entityId }, isEvent, deleteTargets);
    if (out.status === 'failed') throw new Error('model returned failed');
  } catch (error) {
    trace = error instanceof Error ? error.message : String(error);
  }
  if (trace) {
    // Burn a repair record for auditability; NEVER return 'failed' — a failed child does not satisfy
    // dependsOn and would stall the cb-gen-usecase join. A re-run (not /rebuild) regenerates only this
    // missing adapter (worker reuse), and cb-validate-all blocks downstream if it never converges.
    if (entityId) await recordComponentFailure(`adapter-defs:${entityId}`, [trace]);
    status = 'completed';
    trace = `[repair] ${trace}`;
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  // No successor enqueue here: cb-gen-usecase was already queued by the dispatcher with a join dependsOn.
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, trace)];
}

async function portMethodsForEntity(module: string, entityId: string, required: readonly string[], isEvent: boolean): Promise<string[]> {
  const fi = repositoryPortFileInfo(module, entityId);
  const file = (mls.stor.files as Record<string, { status?: string; getContent(): Promise<unknown> } | undefined>)[
    mls.stor.getKeyToFile(fi as unknown as mls.stor.IFileInfo)
  ];
  let declared: string[] = [];
  if (file && file.status !== 'deleted') {
    const raw = await file.getContent();
    if (typeof raw === 'string') declared = methodNamesFromPortDefsSource(raw);
  }
  if (isEvent) return declared.filter(name => name !== 'delete');
  return unionMethodNames(required, declared);
}

async function sanitizeReusedAdapterDefs(module: string, entityIds: string[]): Promise<void> {
  for (const entityId of entityIds) {
    const fi = repositoryAdapterFileInfo(module, entityId);
    const file = (mls.stor.files as Record<string, { status?: string; getContent(): Promise<unknown> } | undefined>)[
      mls.stor.getKeyToFile(fi as unknown as mls.stor.IFileInfo)
    ];
    if (!file || file.status === 'deleted') continue;
    const raw = await file.getContent();
    if (typeof raw !== 'string') continue;
    const next = rewriteAdapterDefsNotes(raw);
    if (next == null || next === raw) continue;
    await writeDefsSource(fi, next);
  }
}
