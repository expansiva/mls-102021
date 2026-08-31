/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-domain/agentCbDomainEntity.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the PURE domain entities (layer_3_domain/entities) + embedded value-objects, one per
// aggregate root (embedded members become valueObjects) plus one immutable record per persisted event,
// from the ontology fields. Writes pipeline-complete .defs.ts (self-sufficient for agentMaterializeGen).
//
// v2 (2026-07-24) FANS OUT like agentCbUsecase: a DISPATCHER step (deterministic, no LLM) emits ONE
// parallel_dynamic step whose args queue = the domain ids (createParallelStepIntent, CB_MAX_PARALLEL slots); the
// runtime runs the workers in a pool and DISCARDS each child payload as it finishes. Each WORKER (same
// agent, reached with its domain id in hook.args) does ONE LLM call for a SINGLE domain and saves one
// .defs.ts. cb-gen-port JOINS on the fan-out (dependsOn cb-domain-fanout). This replaced the v1
// WHOLE-LAYER single call, whose large strict-schema output truncated on big modules (grok-4.5 emitted
// item[0] without `fields` -> TOOL_ARGS_SCHEMA). The system prompt and submitDomainEntities schema are
// UNCHANGED — a worker just receives ONE aggregate/event instead of the whole layer, so per-domain
// quality is preserved (each domain gets the full token budget) and nothing truncates.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readBackendScan, createPromptReadyIntent, createUpdateStatusIntent, enqueueNext, readCbPrompt,
  createParallelStepIntent, CB_MAX_PARALLEL, createAddStepIntent, createAgentStepPayload,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, batchSchema, asArray, saveAgentTrace,
  saveDefs, buildArtifact, buildPipelineItem, domainEntityFileInfo, layerSkills, readString, lowerFirst, logPrefix,
  newestL4DefsMs, defsCurrent, isRebuildCommand,
  type CbScan,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { recordFailedCbRun } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';
import { collectLifecycleContradictionFindings, lifecycleForEntity } from '/_102021_/l2/agentChangeBackend/helpers/cbLifecycle.js';
import { domainEntityResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import { recordComponentFailure, recordLlmCost } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { appliedRulesPromptSection, readRuleDefinitions, ruleIdsOfEntities } from '/_102021_/l2/agentChangeBackend/helpers/cbRules.js';

const AGENT_NAME = 'agentCbDomainEntity';
const TOOL_NAME = 'submitDomainEntities';
const FANOUT_PLAN_ID = 'cb-domain-fanout';
const NEXT_PLAN_ID = 'cb-gen-port';
// Same tool/schema as v1: worker returns { items: [ one entity ] }. Kept batched (not the single-item
// schema) so the system prompt and the afterPromptStep save loop stay byte-for-byte the same.
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the pure domain entities (one per aggregate root).', batchSchema(domainEntityResultSchema));

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-domain', agentDescription: 'Generate pure domain entities + value-objects (parallel_dynamic worker per domain; cb-gen-port joins)', visibility: 'private', beforePromptStep, afterPromptStep };
}

// The domain id of a WORKER invocation arrives in hook.args (a bare id); the DISPATCHER step carries a
// JSON prompt ({planId:...}) and no bare id. Resolve from args first, then step.prompt as a fallback.
function workerDomainId(args: string | undefined, step: mls.msg.AIAgentStep): string {
  const a = (args ?? '').trim();
  if (a && !a.startsWith('{')) return a;
  const p = String((step as { prompt?: string })?.prompt ?? '').trim();
  return p && !p.startsWith('{') ? p : '';
}

// The domain targets to generate: one per aggregate ROOT + one per PERSISTED event. Identical set to
// the v1 items+eventItems and to the reuse watermark check below.
function listDomainTargets(scan: CbScan): string[] {
  return [
    ...scan.aggregates.map(a => a.rootEntity),
    ...scan.events.filter(ev => ev.persisted).map(ev => ev.entityId),
  ].filter(Boolean);
}

// Build the single-domain payload for the worker prompt — the SAME shape v1 put in its array, just
// one entry. An aggregate carries root + embedded members; a persisted event carries only its fields.
function buildDomainItem(domainId: string, scan: CbScan): { aggregates: unknown[]; events: unknown[] } | null {
  const byId = new Map(scan.entities.map(e => [e.entityId, e]));
  const aggregate = scan.aggregates.find(a => a.rootEntity === domainId);
  if (aggregate) {
    return {
      aggregates: [{
        aggregateId: aggregate.aggregateId,
        root: { entityId: aggregate.rootEntity, fields: byId.get(aggregate.rootEntity)?.fields || [] },
        embeddedMembers: aggregate.embeddedMembers.map(id => ({ entityId: id, fields: byId.get(id)?.fields || [] })),
      }],
      events: [],
    };
  }
  const event = scan.events.find(ev => ev.persisted && ev.entityId === domainId);
  if (event) {
    return {
      aggregates: [],
      events: [{
        aggregateId: event.entityId,
        root: { entityId: event.entityId, fields: event.fields || [] },
        embeddedMembers: [] as unknown[],
        appendOnlyEvent: true,
        eventOwner: event.ownerEntity,
      }],
    };
  }
  return null;
}

type FieldDef = Record<string, unknown>;

function entityFieldsOf(scan: CbScan, id: string): FieldDef[] {
  const fields = scan.entities.find(e => e.entityId === id)?.fields;
  return Array.isArray(fields) ? (fields as FieldDef[]) : [];
}

function entityTitleOf(scan: CbScan, id: string): string {
  return scan.entities.find(e => e.entityId === id)?.title || id;
}

/** The lifecycle status enum is the `status` field's enum — deterministic, so the model never needs
 *  to restate it. */
function statusEnumOf(fields: FieldDef[]): string[] {
  const status = fields.find(f => readString(f.fieldId) === 'status');
  return Array.isArray(status?.enum) ? (status!.enum as unknown[]).filter((v): v is string => typeof v === 'string') : [];
}

/** An embedded member is a collection when the root -> member relationship is oneToMany. */
function isCollectionMember(scan: CbScan, root: string, member: string): boolean {
  return scan.relationships.some(r => r.fromEntity === root && r.toEntity === member && r.type === 'oneToMany');
}

/**
 * The DETERMINISTIC part of a domain entity — everything the ontology already fixes: root fields,
 * embedded members as value-objects (their ontology fields + the collection flag), and the status enum.
 * The LLM adds only `invariants` on top of this (see afterPromptStep). Returns null if the id is neither
 * an aggregate root nor a persisted event.
 */
function buildDeterministicEntity(domainId: string, scan: CbScan): Record<string, unknown> | null {
  const aggregate = scan.aggregates.find(a => a.rootEntity === domainId);
  if (aggregate) {
    const fields = entityFieldsOf(scan, aggregate.rootEntity);
    return {
      entityId: aggregate.rootEntity,
      title: entityTitleOf(scan, aggregate.rootEntity),
      fields,
      valueObjects: aggregate.embeddedMembers.map(member => ({
        name: member,
        collection: isCollectionMember(scan, aggregate.rootEntity, member),
        fields: entityFieldsOf(scan, member),
      })),
      statusEnum: statusEnumOf(fields),
    };
  }
  const event = scan.events.find(ev => ev.persisted && ev.entityId === domainId);
  if (event) {
    const fields = Array.isArray(event.fields) ? (event.fields as FieldDef[]) : [];
    return { entityId: event.entityId, title: entityTitleOf(scan, event.entityId), fields, valueObjects: [], statusEnum: statusEnumOf(fields) };
  }
  return null;
}

async function saveDomainEntity(module: string, entityId: string, data: Record<string, unknown>): Promise<void> {
  const fi = domainEntityFileInfo(module, entityId);
  const pipeline = [buildPipelineItem(lowerFirst(entityId), 'domainEntity', fi, [], layerSkills('domainEntity.md'))];
  await saveDefs(fi, `${lowerFirst(entityId)}DomainEntity`, buildArtifact('domainEntity', entityId, module, AGENT_NAME, data), pipeline);
}

// ── beforePromptStep: dispatch (fan-out) or worker (one domain) ───────────────

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const domainId = workerDomainId(args, step);
  return domainId
    ? worker(agent, context, parentStep, step, hookSequential, domainId)
    : dispatch(agent, context, parentStep, step, hookSequential);
}

// DISPATCHER (deterministic, no LLM): reuse fast-path, else ONE parallel_dynamic step whose args queue
// is the domain ids (CB_MAX_PARALLEL slots) + the cb-gen-port JOIN on that fan-out.
async function dispatch(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const targets = listDomainTargets(scan);
    // REUSE fast-path: if every target .defs.ts already exists and is newer than the L4 input, skip the
    // whole fan-out (the materializer's staleness, at the defs level). /rebuild forces regeneration.
    if (!isRebuildCommand(context)) {
      const module = scan.moduleNames[0] || 'unknown';
      const watermark = newestL4DefsMs(scan.project);
      if (targets.length && targets.every(id => defsCurrent(domainEntityFileInfo(module, id), watermark))) {
        return [
          enqueueNext(context, parentStep, step, NEXT_PLAN_ID, 'agentCbRepositoryPort', 'Gerar ports de repositório', {}),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `reused ${targets.length} domain entity .defs.ts (L4 unchanged; skipped generation)`, 'input_output'),
        ];
      }
    }
    // Nothing to generate -> go straight to the next layer.
    if (!targets.length) {
      return [
        enqueueNext(context, parentStep, step, NEXT_PLAN_ID, 'agentCbRepositoryPort', 'Gerar ports de repositório', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no domain entities to generate'),
      ];
    }
    // Fan out one worker per domain (CB_MAX_PARALLEL slots), then JOIN cb-gen-port on the fan-out parent.
    const intents: mls.msg.AgentIntent[] = [
      createParallelStepIntent(context, parentStep, FANOUT_PLAN_ID, AGENT_NAME, 'Gerar entidades de domínio {{completed}}/{{total}}, falhas {{failed}}', targets, [], CB_MAX_PARALLEL),
    ];
    const nextStep = createAgentStepPayload(NEXT_PLAN_ID, 'agentCbRepositoryPort', 'Gerar ports de repositório', { planId: NEXT_PLAN_ID }, [FANOUT_PLAN_ID], 'sequential', 'waiting_dependency');
    intents.push(createAddStepIntent(context, parentStep, nextStep));
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `fan-out ${targets.length} domain entity worker(s) (parallel_dynamic, CB_MAX_PARALLEL slots)`));
    return intents;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${msg}`);
    await recordFailedCbRun({ longMemory: context.task?.iaCompressed?.longMemory, reason: msg });
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', msg)];
  }
}

// WORKER: build the prompt for ONE domain and ask the model for that single entity.
async function worker(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, domainId: string): Promise<mls.msg.AgentIntent[]> {
  const scan = await readBackendScan(['toCreate', 'inProgress'], context);
  const module = scan.moduleNames[0] || 'unknown';
  const deterministic = buildDeterministicEntity(domainId, scan);
  // NB: worker children never return 'failed' (a failed step does not satisfy dependsOn and would stall
  // the cb-gen-port join); report the problem as a completed [worker-error] trace instead.
  if (!deterministic) return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `[worker-error] domain target not found: ${domainId}`)];
  // REUSE: if this domain's .defs.ts already exists and is newer than the L4 input, skip the LLM and
  // reuse it. /rebuild forces regen. A re-run after a partial failure regenerates ONLY the missing ones.
  if (!isRebuildCommand(context) && defsCurrent(domainEntityFileInfo(module, domainId), newestL4DefsMs(scan.project))) {
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `reused domain entity ${domainId} .defs.ts (L4 unchanged)`)];
  }
  // EVENTS are append-only records with NO invariants beyond their fields (spec) — the entity is fully
  // deterministic, so save it WITHOUT an LLM call (fewer tokens, zero failure surface).
  const isEvent = scan.events.some(ev => ev.persisted && ev.entityId === domainId);
  if (isEvent) {
    await saveDomainEntity(module, domainId, { ...deterministic, invariants: [] });
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `event ${domainId}: deterministic domain entity (no LLM)`)];
  }
  // AGGREGATE: the model returns ONLY the invariants. It still SEES the full ontology fields (root +
  // embedded members) so it can reason about them, but it does NOT restate them — fields/valueObjects/
  // statusEnum (and the declared lifecycle matrix, when the module has one) are attached
  // deterministically in afterPromptStep.
  const item = buildDomainItem(domainId, scan)!;
  const lifecycle = lifecycleForEntity(scan.lifecycles, domainId);
  let human = `## Aggregate (root + embedded members, with ontology fields) — CONTEXT to reason about; DO NOT restate these fields\n${JSON.stringify(item.aggregates, null, 2)}\n`;
  if (lifecycle) {
    human += `\n## Declared lifecycle (authoritative). The cycle is this matrix; do NOT invent a transition restriction the workflow does not declare. terminalStates are states with no outgoing edge in allowed — if empty, no state is terminal. Integrity invariants (uniqueness, dates, required-when, cross-field) are still wanted; status transitions are NOT yours to invent.\n${JSON.stringify(lifecycle, null, 2)}\n`;
  }
  const aggregate = scan.aggregates.find(a => a.rootEntity === domainId);
  const referencedRuleIds = ruleIdsOfEntities(scan.entities, aggregate ? [aggregate.rootEntity, ...aggregate.embeddedMembers] : [domainId]);
  human += appliedRulesPromptSection(await readRuleDefinitions(scan.project), referencedRuleIds);
  human += `\nReturn ONE item { entityId: "${domainId}", invariants: [...] } — the business rules the entity must always hold (${lifecycle ? 'required-when conditions, cross-field and monetary/quantity constraints — NOT a stricter state machine than the declared lifecycle' : 'status transitions, required-when conditions, cross-field and monetary/quantity constraints'}). Do NOT output fields, valueObjects or statusEnum; they are attached automatically from the ontology.`;
  // prompt_ready args MUST equal the parallel child's queued hook args (the domainId) so the runtime
  // (continueBeforePrompt -> findBeforePromptStep by parentStepId+args) matches it.
  const systemPrompt = await readCbPrompt('steps/gen-domain');
  return [createPromptReadyIntent(context, parentStep, hookSequential, domainId, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

// ── afterPromptStep (worker only): save the one domain .defs.ts ───────────────

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  await recordLlmCost('gen-domain', step.interaction); // T7: per-phase cost telemetry (best-effort)
  let status: mls.msg.AIStepStatus = 'completed';
  let trace: string | undefined;
  const domainId = workerDomainId(args, step);
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) {
      // Truthful finding for LLM INFRA failures (proxy/credit errors leave no payload).
      const infra = (step.interaction?.trace ?? []).map(String)
        .filter(t => t.includes('Error invoking Collab LLM proxy') || t.includes('Error executing AI task')).slice(-1)[0];
      throw new Error(infra ? `LLM infra failure (no payload): ${infra.slice(0, 300)}` : 'missing payload');
    }
    const out = extractPlannerOutput(payload, plannerConfig(TOOL_NAME));
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const module = scan.moduleNames[0] || 'unknown';
    // The deterministic shape (fields/valueObjects/statusEnum) is the authority; the model supplies only
    // the invariants. Match the model item by entityId, falling back to this worker's domainId.
    const deterministic = buildDeterministicEntity(domainId, scan);
    if (!deterministic) throw new Error(`domain target not found: ${domainId}`);
    const items = asArray((out.result as any).items);
    const modelItem = items.find(it => readString(it.entityId) === domainId) ?? items[0];
    const invariants = Array.isArray(modelItem?.invariants)
      ? (modelItem!.invariants as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const lifecycle = lifecycleForEntity(scan.lifecycles, domainId);
    // Choice: the generated `*_STATUS_TRANSITIONS` map is what the usecase guard consults, but the
    // model writes the restriction first as invariant prose. Catch the prose here (before save) so
    // repair regenerates defs instead of rematerializing the same lie. validate-all still checks
    // the map against the matrix.
    const lifecycleIssues = collectLifecycleContradictionFindings({ lifecycle, invariants, label: domainId });
    if (lifecycleIssues.length) throw new Error(lifecycleIssues.slice(0, 8).join('; '));
    await saveDomainEntity(module, domainId, { ...deterministic, ...(lifecycle ? { lifecycle } : {}), invariants });
    if (out.status === 'failed') throw new Error('model returned failed');
  } catch (error) {
    trace = error instanceof Error ? error.message : String(error);
  }
  if (trace) {
    // Burn a repair record for auditability; NEVER return 'failed' — a failed child does not satisfy
    // dependsOn and would stall the cb-gen-port join. A re-run (not /rebuild) regenerates only this
    // missing domain (worker reuse), and cb-validate-all blocks downstream if it never converges.
    if (domainId) await recordComponentFailure(`domain-defs:${domainId}`, [trace]);
    status = 'completed';
    trace = `[repair] ${trace}`;
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  // No enqueueNext here: cb-gen-port was already queued by the dispatcher with a join dependsOn.
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, trace)];
}
