/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-domain/agentCbDomainEntity.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the PURE domain entities (layer_3_domain/entities) + embedded value-objects, one per
// aggregate root (embedded members become valueObjects) plus one immutable record per persisted event,
// from the ontology fields. Writes pipeline-complete .defs.ts (self-sufficient for agentMaterializeGen).
//
// v2 (2026-07-24) FANS OUT like agentCbUsecase: a DISPATCHER step (deterministic, no LLM) emits ONE
// parallel_dynamic step whose args queue = the domain ids (createParallelStepIntent, 10 slots); the
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
  createParallelStepIntent, createAddStepIntent, createAgentStepPayload,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, batchSchema, asArray, saveAgentTrace,
  saveDefs, buildArtifact, buildPipelineItem, domainEntityFileInfo, layerSkills, readString, lowerFirst, logPrefix,
  newestL4DefsMs, defsCurrent, isRebuildCommand,
  type CbScan,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { domainEntityResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import { recordComponentFailure } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';

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

// ── beforePromptStep: dispatch (fan-out) or worker (one domain) ───────────────

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const domainId = workerDomainId(args, step);
  return domainId
    ? worker(agent, context, parentStep, step, hookSequential, domainId)
    : dispatch(agent, context, parentStep, step, hookSequential);
}

// DISPATCHER (deterministic, no LLM): reuse fast-path, else ONE parallel_dynamic step whose args queue
// is the domain ids (10 slots) + the cb-gen-port JOIN on that fan-out.
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
    // Fan out one worker per domain (10 slots), then JOIN cb-gen-port on the fan-out parent.
    const intents: mls.msg.AgentIntent[] = [
      createParallelStepIntent(context, parentStep, FANOUT_PLAN_ID, AGENT_NAME, 'Gerar entidades de domínio {{completed}}/{{total}}, falhas {{failed}}', targets, [], 10),
    ];
    const nextStep = createAgentStepPayload(NEXT_PLAN_ID, 'agentCbRepositoryPort', 'Gerar ports de repositório', { planId: NEXT_PLAN_ID }, [FANOUT_PLAN_ID], 'sequential', 'waiting_dependency');
    intents.push(createAddStepIntent(context, parentStep, nextStep));
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `fan-out ${targets.length} domain entity worker(s) (parallel_dynamic, 10 slots)`));
    return intents;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${msg}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', msg)];
  }
}

// WORKER: build the prompt for ONE domain and ask the model for that single entity.
async function worker(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, domainId: string): Promise<mls.msg.AgentIntent[]> {
  const scan = await readBackendScan(['toCreate', 'inProgress'], context);
  const module = scan.moduleNames[0] || 'unknown';
  const item = buildDomainItem(domainId, scan);
  // NB: worker children never return 'failed' (a failed step does not satisfy dependsOn and would stall
  // the cb-gen-port join); report the problem as a completed [worker-error] trace instead.
  if (!item) return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `[worker-error] domain target not found: ${domainId}`)];
  // REUSE: if this domain's .defs.ts already exists and is newer than the L4 input, skip the LLM and
  // reuse it. /rebuild forces regen. A re-run after a partial failure regenerates ONLY the missing ones.
  if (!isRebuildCommand(context) && defsCurrent(domainEntityFileInfo(module, domainId), newestL4DefsMs(scan.project))) {
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `reused domain entity ${domainId} .defs.ts (L4 unchanged)`)];
  }
  // Same human template as v1 (two labelled sections + trailing instruction), scoped to ONE domain.
  const human = `## Aggregates (root + embedded members, with ontology fields)\n${JSON.stringify(item.aggregates, null, 2)}\n\n## Append-only event records (one pure domain entity each, immutable, no valueObjects)\n${JSON.stringify(item.events, null, 2)}\n\nReturn one pure domain entity per aggregate root AND per event record; embedded members become valueObjects (collection=true for oneToMany). Event records carry no invariants beyond their fields.`;
  // prompt_ready args MUST equal the parallel child's queued hook args (the domainId) so the runtime
  // (continueBeforePrompt -> findBeforePromptStep by parentStepId+args) matches it.
  const systemPrompt = await readCbPrompt('steps/gen-domain');
  return [createPromptReadyIntent(context, parentStep, hookSequential, domainId, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

// ── afterPromptStep (worker only): save the one domain .defs.ts ───────────────

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
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
    let saved = 0;
    for (const item of asArray((out.result as any).items)) {
      const entityId = readString(item.entityId);
      if (!entityId) continue;
      const fi = domainEntityFileInfo(module, entityId);
      const pipeline = [buildPipelineItem(lowerFirst(entityId), 'domainEntity', fi, [], layerSkills('domainEntity.md'))];
      await saveDefs(fi, `${lowerFirst(entityId)}DomainEntity`, buildArtifact('domainEntity', entityId, module, AGENT_NAME, item), pipeline);
      saved++;
    }
    if (out.status === 'failed') throw new Error('model returned failed');
    if (!saved) throw new Error('no domain entity saved (empty items)');
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
