/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seeds/agentCbSeeds.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Seed scenarios are planned by an LLM but compiled locally. The model never writes TypeScript or
// UUIDs: it returns a strict JSON plan, cbSeedsCore validates it against L4/table defs, then emits
// deterministic TableSeedRows plus MDM entity/document/relationship rows.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { recordLlmCost } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { saveGeneratedTs } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { aliasModuleResolutionPathOf } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
import {
  readBackendScan, enqueueNext, createUpdateStatusIntent, createPromptReadyIntent, readCbPrompt,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, saveAgentTrace,
  createAddStepIntent, createAgentStepPayload, isRecord, readString, readStringArray, logPrefix,
  parseDefsSource, readCliCommand, type CbScan,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { seedPlanResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import { extractCollectionFieldNames } from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';
import {
  buildPartialSeedSource, buildSeedSource, deriveSeedPlanningWaves, estimateSeedPlanningWaveTokens,
  extractSeedPlanProgressFromSource, mergeSeedPlans, parseSeedPlan, seedPlanInputForWave,
  seedPlanPromptContext, seedReferenceCatalog, splitSeedPlanningWave, validateSeedPlan,
  SEED_WINDOW_START, SEED_WINDOW_END,
  type SeedBuildInput, type SeedEntityDefinition, type SeedPlan, type SeedTableDefinition,
  type SeedRuleDefinition, type SeedActorDefinition, type SeedPlanProgress, type SeedPlanningWave,
} from '/_102021_/l2/agentChangeBackend/helpers/cbSeedsCore.js';

const AGENT_NAME = 'agentCbSeeds';
const TOOL_NAME = 'submitSeedScenario';
const MAX_PLAN_ATTEMPTS = 2;
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the deterministic seed scenario plan.', seedPlanResultSchema);

interface SeedStepArgs {
  seedAttempt: number;
  seedFindings: string[];
  forcedBatch?: SeedPlanningWave;
  partialPlanRef?: 'seeds.ts';
  /** This step is the ONE retry of an environment failure — not a replan (see seedEnvironmentErrors). */
  infraRetry?: boolean;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentChangeBackend/steps/gen-seeds',
    agentDescription: 'Plan seed scenarios with an LLM, then compile and validate deterministic TableSeedRows',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

function seedArgsOf(step: mls.msg.AIAgentStep): SeedStepArgs {
  try {
    const raw = JSON.parse(String(step.prompt || '{}')) as Record<string, unknown>;
    return {
      seedAttempt: typeof raw.seedAttempt === 'number' && raw.seedAttempt > 0 ? raw.seedAttempt : 1,
      seedFindings: Array.isArray(raw.seedFindings) ? raw.seedFindings.filter((value): value is string => typeof value === 'string').slice(0, 40) : [],
      forcedBatch: parseWave(raw.forcedBatch),
      ...(raw.infraRetry === true ? { infraRetry: true as const } : {}),
    };
  } catch {
    return { seedAttempt: 1, seedFindings: [] };
  }
}

function parseWave(value: unknown): SeedPlanningWave | undefined {
  if (!isRecord(value) || typeof value.index !== 'number') return undefined;
  const values = (key: 'tableIds' | 'mdmEntityIds') => Array.isArray(value[key])
    ? value[key].filter((item): item is string => typeof item === 'string' && !!item).sort()
    : [];
  return { index: value.index, tableIds: values('tableIds'), mdmEntityIds: values('mdmEntityIds') };
}

function emptyPlan(): SeedPlan {
  return { summary: '', localTables: [], mdmEntities: [] };
}

// `/rebuild seeds` regenerates seeds for an ALREADY-BUILT module whose owners are typically `done`.
// Include `done` so entities/tables/relationships AND the owners' rulesApplied are still in scope
// (a normal run only sees toCreate|inProgress). Also force a fresh plan (no persisted-plan reuse).
function isRebuildSeeds(context: mls.msg.ExecutionContext): boolean {
  return readCliCommand(context) === 'rebuild-seeds';
}
// Regenerate an EXISTING seeds.ts only on an explicit /rebuild all or /rebuild seeds. A bare @@changeBackend
// (or /run) keeps the existing seeds file and only GENERATES it when it is missing (see beforePromptStep).
function forceSeeds(context: mls.msg.ExecutionContext): boolean {
  const cmd = readCliCommand(context);
  return cmd === 'rebuild-all' || cmd === 'rebuild-seeds';
}
function seedScanStatuses(context: mls.msg.ExecutionContext): string[] {
  return isRebuildSeeds(context) ? ['toCreate', 'inProgress', 'done'] : ['toCreate', 'inProgress'];
}

// The seed-asset (image) step is OPTIONAL. Mark it onFailure:'continue' so an image LLM/proxy failure
// (e.g. INVALID_JSON_CONTENT from an image model, or a 502 — which leaves no payload) still routes to
// agentCbSeedAssets.afterPromptStep, which degrades it to a warning (seed value stays null) and proceeds
// to cb-register. Without this, a failed optional image marks the whole backend run failed at the last step.
function enqueueSeedAssets(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep): mls.msg.AgentIntentAddStep {
  return enqueueNext(context, parentStep, step, 'cb-seed-assets', 'agentCbSeedAssets', 'Gerar assets de seeds', {}, 'continue');
}

function plannedTargetIds(plan: SeedPlan): Set<string> {
  return new Set([...plan.localTables.map(table => `table:${table.tableId}`), ...plan.mdmEntities.map(entity => `mdm:${entity.entityId}`)]);
}

function nextSeedBatch(input: Omit<SeedBuildInput, 'plan'>, plan: SeedPlan, forcedBatch?: SeedPlanningWave): SeedPlanningWave | null {
  const planned = plannedTargetIds(plan);
  const usableForced = forcedBatch && [...forcedBatch.tableIds.map(id => `table:${id}`), ...forcedBatch.mdmEntityIds.map(id => `mdm:${id}`)]
    .some(id => !planned.has(id));
  if (usableForced) return forcedBatch!;
  for (const wave of deriveSeedPlanningWaves(input)) {
    const missing = {
      index: wave.index,
      tableIds: wave.tableIds.filter(id => !planned.has(`table:${id}`)),
      mdmEntityIds: wave.mdmEntityIds.filter(id => !planned.has(`mdm:${id}`)),
    };
    if (!missing.tableIds.length && !missing.mdmEntityIds.length) continue;
    return splitSeedPlanningWave(input, missing)[0] ?? null;
  }
  return null;
}

function completedWaveIndexes(input: Omit<SeedBuildInput, 'plan'>, plan: SeedPlan): number[] {
  const planned = plannedTargetIds(plan);
  return deriveSeedPlanningWaves(input).filter(wave =>
    wave.tableIds.every(id => planned.has(`table:${id}`)) && wave.mdmEntityIds.every(id => planned.has(`mdm:${id}`)),
  ).map(wave => wave.index);
}

function splitBatchForRetry(input: Omit<SeedBuildInput, 'plan'>, batch: SeedPlanningWave): SeedPlanningWave | null {
  const tighterBudget = Math.max(300, Math.floor(estimateSeedPlanningWaveTokens(input, batch) / 2));
  const batches = splitSeedPlanningWave(input, batch, tighterBudget);
  return batches.length > 1 ? batches[0] : null;
}

function isOutputLimitFailure(value: unknown): boolean {
  return /TOOL_ARGS_SCHEMA|truncat|output.{0,20}(limit|token)|recognized submitSeedScenario/iu.test(String(value));
}

function outputTokenTrace(payload: unknown): string {
  try {
    const match = JSON.stringify(payload).match(/"(?:outputTokens|output_tokens|completion_tokens)"\s*:\s*(\d+)/u);
    return match ? `reported output tokens ${match[1]}` : 'reported output tokens unavailable';
  } catch {
    return 'reported output tokens unavailable';
  }
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(seedScanStatuses(context), context);
    const input = await readSeedBuildInput(scan);
    const args = seedArgsOf(step);
    const persisted = await readPersistedPlan(input.project, input.moduleName);
    // A COMPLETE seeds.ts already exists and this is not /rebuild all|seeds -> KEEP it as-is (no re-plan,
    // no recompile) and move on. This is the reuse the bare @@changeBackend wants: seeds are (re)generated
    // only when the file is missing or an explicit rebuild is requested. To refresh after data/rule
    // changes, use /rebuild seeds (or /rebuild all).
    if (persisted && !persisted.partial && !forceSeeds(context)) {
      return [
        enqueueSeedAssets(context, parentStep, step),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Kept existing seeds.ts (use /rebuild seeds to regenerate).', 'input_output'),
      ];
    }
    const progress = persisted?.partial ? persisted : { plan: emptyPlan(), partial: true, completedWaveIndexes: [] };
    const batch = nextSeedBatch(input, progress.plan, args.forcedBatch);
    if (!batch) return finalizeSeedPlan(context, parentStep, step, hookSequential, input, progress.plan, 'Resumed all validated seed waves.', args);
    const waveInput = seedPlanInputForWave(input, batch);
    const estimatedTokens = estimateSeedPlanningWaveTokens(input, batch);
    const human = seedPlanPromptContext(waveInput, args.seedFindings, {
      wave: batch,
      catalog: seedReferenceCatalog(progress.plan),
      priorSummary: progress.plan.summary,
      estimatedOutputTokens: estimatedTokens,
    });
    const systemPrompt = await readCbPrompt('steps/gen-seeds');
    return [createPromptReadyIntent(context, parentStep, hookSequential, (step.prompt || ''), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  await recordLlmCost('seeds', step.interaction); // T7: per-phase cost telemetry (best-effort)
  try {
    const scan = await readBackendScan(seedScanStatuses(context), context);
    const input = await readSeedBuildInput(scan);
    const args = seedArgsOf(step);
    const persisted = await readPersistedPlan(input.project, input.moduleName);
    const progress = persisted?.partial ? persisted : { plan: emptyPlan(), partial: true, completedWaveIndexes: [] };
    const batch = nextSeedBatch(input, progress.plan, args.forcedBatch);
    if (!batch) return finalizeSeedPlan(context, parentStep, step, hookSequential, input, progress.plan, 'All seed waves were already complete.');
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing seed scenario payload');
    let out;
    try {
      out = extractPlannerOutput(payload, plannerConfig(TOOL_NAME));
      if (out.status === 'failed') throw new Error(out.trace.join('; ') || 'model returned failed for seed scenario');
    } catch (error) {
      const split = isOutputLimitFailure(error) ? splitBatchForRetry(input, batch) : null;
      if (split) return scheduleSeedStep(context, parentStep, step, hookSequential, {
        seedAttempt: 1,
        seedFindings: [`Planner output exceeded its schema/token budget; split ${batch.tableIds.length + batch.mdmEntityIds.length} targets into a smaller batch.`],
        forcedBatch: split,
      }, `Seed batch split after output limit (wave ${batch.index}; estimated ${estimateSeedPlanningWaveTokens(input, batch)} tokens).`);
      throw error;
    }
    const plan = parseSeedPlan(out.result);
    const waveInput = seedPlanInputForWave(input, batch);
    const errors = validateSeedPlan({ ...waveInput, plan }, seedReferenceCatalog(progress.plan).map(item => item.ref));
    await saveAgentTrace(context, AGENT_NAME, step);

    if (errors.length) {
      if (args.seedAttempt < MAX_PLAN_ATTEMPTS) {
        const nextAttempt = args.seedAttempt + 1;
        return scheduleSeedStep(context, parentStep, step, hookSequential, {
          seedAttempt: nextAttempt,
          seedFindings: errors.slice(0, 40),
          forcedBatch: batch,
        }, `Seed wave ${batch.index} rejected; repair ${nextAttempt}/${MAX_PLAN_ATTEMPTS} scheduled: ${errors.slice(0, 12).join('; ')}`);
      }
      // Repair budget exhausted for this wave. Seeds are TEST DATA — a wave that will not converge must
      // NOT fail the whole backend: the composition root (registerRepositories) + l5 config + finalize
      // are downstream of seeds and far more important than seed rows. FINALIZE with the PARTIAL plan
      // (the waves that DID validate; this wave and any later ones are omitted, keeping the seed
      // self-consistent — no dangling refs). validateSeedPlan requires a plan for EVERY input.tablePlans
      // entry AND every MDM entity in input.entities, so we narrow BOTH to what actually validated: a
      // skipped wave can carry MDM entities (e.g. a catalog entity with no local table) as well as
      // tables, and leaving those MDM entities in input.entities would make the FINAL validation demand
      // a plan we deliberately skipped and fail the whole backend. The skipped target(s) are simply
      // seeded empty at runtime. Continue to cb-seed-assets -> cb-register. Surface as a WARNING, not a fail.
      const seededTableIds = new Set(progress.plan.localTables.map(t => t.tableId));
      const seededMdmIds = new Set(progress.plan.mdmEntities.map(e => e.entityId));
      // PUBLISH the coverage gap. Narrowing alone made "zero rows" indistinguishable from a generation
      // loss, so a test generator asserted "at least one row" against tables that are empty BY DESIGN
      // (102051: AiSalesSummary, AiPromotionSuggestion). The skipped ids are recorded in the artifact
      // (and propagated to l5 by cb-register) instead of living only in this trace string.
      const skipped = {
        tables: input.tablePlans.filter(t => !seededTableIds.has(t.tableId)).map(t => t.tableId).sort(),
        mdmEntities: input.entities.filter(e => e.kind === 'mdm' && !seededMdmIds.has(e.entityId)).map(e => e.entityId).sort(),
        reason: `seed wave ${batch.index} did not converge after ${args.seedAttempt}/${MAX_PLAN_ATTEMPTS} attempts: ${errors.slice(0, 6).join('; ')}`,
      };
      const partialInput = {
        ...input,
        tablePlans: input.tablePlans.filter(t => seededTableIds.has(t.tableId)),
        entities: input.entities.filter(e => e.kind !== 'mdm' || seededMdmIds.has(e.entityId)),
        skipped,
      };
      // NOTHING ACCUMULATED: when the FIRST attempted wave gives up, `progress.plan` is still the empty
      // plan, whose blank `summary` makes the final validation throw `plan.summary is required` — the
      // whole backend failing at the exact point that exists to keep it alive (102045/buildFlowFsm run05).
      // Two guards:
      //  (a) synthesize a summary so an all-skipped plan is a VALID artifact;
      //  (b) never overwrite a COMPLETE seeds.ts with an empty one — on a /rebuild that gave up, keeping
      //      the previously working seed data beats replacing it with nothing.
      const nothingSeeded = !progress.plan.localTables.length && !progress.plan.mdmEntities.length;
      if (nothingSeeded && persisted && !persisted.partial) {
        return [
          enqueueSeedAssets(context, parentStep, step),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
            `SEED WAVE ${batch.index} SKIPPED and nothing new validated — KEPT the existing seeds.ts instead of replacing it with an empty one: ${errors.slice(0, 8).join('; ')}`, 'input_output'),
        ];
      }
      const givenUpPlan = progress.plan.summary.trim() ? progress.plan : {
        ...progress.plan,
        summary: `No seed data: wave ${batch.index} did not converge after ${args.seedAttempt}/${MAX_PLAN_ATTEMPTS} attempts; every target of this module is seeded empty by design.`,
      };
      return finalizeSeedPlan(context, parentStep, step, hookSequential, partialInput, givenUpPlan,
        `SEED WAVE ${batch.index} SKIPPED (validation failed after ${args.seedAttempt}/${MAX_PLAN_ATTEMPTS}; seeded EMPTY by design: tables [${skipped.tables.join(', ') || 'none'}], MDM [${skipped.mdmEntities.join(', ') || 'none'}]): ${errors.slice(0, 12).join('; ')}`);
    }
    const tokenTrace = outputTokenTrace(payload);
    const merged = mergeSeedPlans(progress.plan, plan);
    const next = nextSeedBatch(input, merged);
    const partial = buildPartialSeedSource(input, { plan: merged, completedWaveIndexes: completedWaveIndexes(input, merged) });
    const saved = await saveGeneratedTs(input.project, 1, `${input.moduleName}/layer_1_external/adapters/persistence`, 'seeds', partial);
    const partialEnvironment = seedEnvironmentErrors(saved);
    if (partialEnvironment.length) throw new Error(seedInfraFailure(partialEnvironment));
    if (!saved.ok || saved.compileErrors.length) throw new Error(`failed to persist partial seeds.ts: ${saved.compileErrors.join('; ')}`);
    if (!next) return finalizeSeedPlan(context, parentStep, step, hookSequential, input, merged, `Generated final seed wave ${batch.index} (estimated ${estimateSeedPlanningWaveTokens(input, batch)} tokens; ${tokenTrace}).`);
    return scheduleSeedStep(context, parentStep, step, hookSequential, { seedAttempt: 1, seedFindings: [], forcedBatch: next }, `Validated seed wave ${batch.index}; persisted partial plan and scheduled the next wave (estimated ${estimateSeedPlanningWaveTokens(input, batch)} tokens; ${tokenTrace}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

/**
 * Module-resolution failures of seeds.ts are ALWAYS environment, never plan.
 *
 * `buildSeedSource` writes this file whole — imports included; the model only plans data rows. So an
 * import that does not resolve is something no replan can fix, and the first version of this fix got
 * it wrong by asking `mls.stor.files` whether the target existed: that measures whether the session
 * indexed the other project, and when it had not, the diagnostic was routed to the plan repair budget
 * and killed the run (run 5, module buildFlowFsm).
 */
function seedEnvironmentErrors(saved: { compileErrors: string[]; infraErrors: string[] }): string[] {
  const byConstruction = saved.compileErrors.filter(error => !!aliasModuleResolutionPathOf(error));
  return [...new Set([...saved.infraErrors, ...byConstruction])];
}

/** An environment failure, in the words of the person who has to act on it. */
function seedInfraFailure(infraErrors: string[]): string {
  return `SEEDS-ENVIRONMENT-FAILURE: seeds.ts is written whole by this agent (the model only plans data rows), so the module(s) below failing to resolve is an environment fault — no seed replan can fix it, and the partial seeds.ts on disk is preserved. It already failed a compile retry; check that project's files are available to this Studio session.\n${infraErrors.slice(0, 4).join('\n')}`;
}

function scheduleSeedStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: SeedStepArgs,
  trace: string,
): mls.msg.AgentIntent[] {
  const planId = `cb-gen-seeds-w${args.forcedBatch?.index ?? 'next'}-r${args.seedAttempt}${args.infraRetry ? '-infra' : ''}-${Date.now()}`;
  return [
    createAddStepIntent(context, parentStep, createAgentStepPayload(
      planId, AGENT_NAME,
      args.infraRetry
        ? 'Recompilar seeds (falha de ambiente)'
        : args.seedAttempt > 1 ? `Reparar plano de seeds (${args.seedAttempt}/${MAX_PLAN_ATTEMPTS})` : `Planejar próxima onda de seeds`,
      { planId, ...args, partialPlanRef: 'seeds.ts' }, [], 'sequential', 'waiting_human_input',
    )),
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
  ];
}

async function finalizeSeedPlan(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  input: Omit<SeedBuildInput, 'plan'>,
  plan: SeedPlan,
  trace: string,
  args?: SeedStepArgs,
): Promise<mls.msg.AgentIntent[]> {
  const built = buildSeedSource({ ...input, plan });
  if (built.errors.length || !built.content) throw new Error(`final seed plan validation failed: ${built.errors.slice(0, 30).join('; ')}`);
  const saved = await saveGeneratedTs(input.project, 1, `${input.moduleName}/layer_1_external/adapters/persistence`, 'seeds', built.content);
  const environment = seedEnvironmentErrors(saved);
  if (environment.length) {
    // The plan is not on trial. Give the environment ONE more chance — the retry re-enters this same
    // step, finds every wave already planned and only recompiles (no LLM call, no plan budget spent:
    // `seedAttempt` counts REPLANS and must not be consumed by an environment fault).
    if (!args?.infraRetry) {
      return scheduleSeedStep(context, parentStep, step, hookSequential,
        { seedAttempt: args?.seedAttempt ?? 1, seedFindings: [], infraRetry: true },
        `Seeds compiled against an unresolved module (environment, not plan): ${environment[0]}. Recompiling once.`);
    }
    throw new Error(seedInfraFailure(environment));
  }
  if (!saved.ok || saved.compileErrors.length) throw new Error(`failed to compile seeds.ts: ${saved.compileErrors.join('; ')}`);
  return [
    enqueueSeedAssets(context, parentStep, step),
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${trace} Final validation succeeded (${built.summary}).`, 'input_output'),
  ];
}

async function readSeedBuildInput(scan: CbScan): Promise<Omit<SeedBuildInput, 'plan'>> {
  const project = scan.project;
  const moduleName = scan.moduleNames[0] || 'unknown';
  const language = await readDefaultLanguage(project);
  // An `external` entity has no store of this module's to seed: it IS the platform directory (a
  // platform user). Leaving it here would make its `<entity>Id` FKs look resolvable to the validator
  // and then demand a symbolic { ref } to rows that can never exist.
  const operatedStates = await readOperatedStates(project, moduleName);
  const entities: SeedEntityDefinition[] = scan.entities.filter(entity => entity.kind !== 'external' && entity.kind !== 'derived').map((entity) => ({
    entityId: entity.entityId,
    title: entity.title,
    kind: entity.kind,
    fields: (entity.fields ?? []).filter(isRecord).map((field) => ({
      fieldId: readString(field.fieldId),
      type: readString(field.type),
      required: field.required === true,
      enumValues: readStringArray(field.enum),
    })).filter(field => !!field.fieldId),
    ...(operatedStates.get(entity.entityId)?.length ? { operatedStates: operatedStates.get(entity.entityId) } : {}),
  }));
  const ruleIds = [...new Set(scan.owners.flatMap(owner => owner.rulesApplied))].sort();
  const ruleDefs = await readRuleDefinitions(project);
  const ruleById = new Map(ruleDefs.map(rule => [rule.ruleId, rule]));
  const rules: SeedRuleDefinition[] = ruleIds.map(ruleId => ruleById.get(ruleId) ?? { ruleId, title: '', description: '', appliesTo: [] });
  const relationships = scan.relationships.map(rel => ({ fromEntity: rel.fromEntity, toEntity: rel.toEntity, type: rel.type }));
  const actors = await readActorDefinitions(project);
  return {
    project, moduleName, language, entities,
    tablePlans: await readTablePlans(project, moduleName),
    ruleIds, rules, relationships, actors,
    timeWindow: { start: SEED_WINDOW_START, end: SEED_WINDOW_END },
  };
}

/** L4 actors (id + title) from every actor set def in the project. The planner references these as
 * platform-user identities so FKs to people (assignees, actorSession-resolved workers) resolve
 * without fabricating a table — mirrors readRuleDefinitions. */
async function readActorDefinitions(project: number): Promise<SeedActorDefinition[]> {
  const actors: SeedActorDefinition[] = [];
  const seen = new Set<string>();
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed)) continue;
    // ns4 has no actors file: the same identities are the profiles of the access matrix.
    const declared = Array.isArray(parsed.actors) ? parsed.actors : Array.isArray(parsed.profiles) ? parsed.profiles : null;
    if (!declared) continue;
    for (const raw of declared) {
      if (!isRecord(raw)) continue;
      const actorId = readString(raw.actorId) || readString(raw.profileId);
      if (!actorId || seen.has(actorId)) continue;
      seen.add(actorId);
      actors.push({ actorId, title: readString(raw.title) });
    }
  }
  return actors;
}

/** Full L4 rule text (id + title + description + appliesTo) from every rule set def in the project.
 * The planner receives the semantics of each applied rule instead of an opaque id, so it can satisfy
 * the rules without any domain-specific check hardcoded into the generator. */
/**
 * entityRef -> the states some transition READS (`fromStates`), from `l4/<module>/workflows/*.defs.ts`.
 *
 * This is the only place the seed planner learns which states the module actually operates on; the scan
 * drops entity lifecycles on purpose (they own no generated artifact). Without it, a screen that acts on
 * `submitted` opens empty because nothing was seeded in that state — 5 of the 22 failures of the
 * buildFlowFsm production suite were exactly that.
 */
async function readOperatedStates(project: number, moduleName: string): Promise<Map<string, string[]>> {
  const byEntity = new Map<string, Set<string>>();
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    if (folder !== `${moduleName}/workflows` && folder !== 'workflows') continue;
    if (String(file.shortName || '') === 'index') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed) || !Array.isArray(parsed.transitions)) continue;
    const entityRef = readString(parsed.entityRef);
    for (const raw of parsed.transitions) {
      if (!isRecord(raw)) continue;
      const target = readString(raw.entityRef) || entityRef;
      if (!target) continue;
      const states = byEntity.get(target) ?? new Set<string>();
      for (const state of readStringArray(raw.fromStates)) states.add(state);
      byEntity.set(target, states);
    }
  }
  return new Map([...byEntity].map(([entityId, states]) => [entityId, [...states].sort()]));
}

async function readRuleDefinitions(project: number): Promise<SeedRuleDefinition[]> {
  const rules: SeedRuleDefinition[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed) || !Array.isArray(parsed.rules)) continue;
    for (const raw of parsed.rules) {
      if (!isRecord(raw)) continue;
      // ns4 names the rule `id`; the text behind the id is what the planner needs (run13's lesson).
      const ruleId = readString(raw.ruleId) || readString(raw.id);
      if (!ruleId) continue;
      rules.push({ ruleId, title: readString(raw.title), description: readString(raw.description), appliesTo: readStringArray(raw.appliesTo) });
    }
  }
  return rules;
}

async function readDefaultLanguage(project: number): Promise<string> {
  try {
    const key = mls.stor.getKeyToFile({ project, level: 5, folder: '', shortName: 'project', extension: '.json' } as unknown as mls.stor.IFileInfo);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return 'en';
    const cfg = JSON.parse(String(await file.getContent())) as Record<string, unknown>;
    const first = Array.isArray(cfg.languages) ? cfg.languages[0] : null;
    return isRecord(first) && typeof first.language === 'string' && first.language.trim() ? first.language.trim() : 'en';
  } catch {
    return 'en';
  }
}

async function readTablePlans(project: number, moduleName: string): Promise<SeedTableDefinition[]> {
  const plans: SeedTableDefinition[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.folder || '') !== `${moduleName}/layer_1_external/adapters/persistence`) continue;
    const artifact = parseArtifact(String(await file.getContent()));
    if (!artifact || artifact.artifactType !== 'table' || !isRecord(artifact.data)) continue;
    const data = artifact.data;
    const tableId = readString(data.tableId) || readString(artifact.artifactId) || String(file.shortName || '');
    const columns = Array.isArray(data.columns) ? data.columns.filter(isRecord).map((column) => ({
      name: readString(column.name),
      type: readString(column.type),
      nullable: column.nullable === true,
    })).filter(column => !!column.name) : [];
    if (!tableId || !columns.length) continue;
    // The TableDefinition declares the JSONB envelope SEPARATELY (`detailsColumn`), not inside
    // `columns` — so reading only `columns` left the seed compiler unaware that the table has a details
    // column, and buildLocalRows (which writes a property only for a DECLARED column) silently dropped
    // the whole planned `details` payload. That is why every seeded row in 102051 carried just its
    // indexed ids while the persisted plan held 10-12 details fields per row. Carry the declaration.
    const detailsDecl = isRecord(data.detailsColumn) ? data.detailsColumn : undefined;
    const detailsColumnName = detailsDecl?.enabled === true ? (readString(detailsDecl.columnName) || 'details') : '';
    if (detailsColumnName && !columns.some(column => column.name === detailsColumnName)) {
      columns.push({ name: detailsColumnName, type: 'JSONB', nullable: true });
    }
    plans.push({
      tableId,
      tableName: readString(data.tableName) || tableId,
      seedFor: `${moduleName}${tableId}`,
      columns,
      primaryKey: Array.isArray(data.primaryKey) ? data.primaryKey.map(readString).filter(Boolean) : [],
      ...(detailsColumnName ? { detailsColumnName } : {}),
      // Resolved to the FIELD names the adapter reads (see resolveChildCollectionFields): the declaration
      // carries entity ids, the generated entity names the field, and the seed must use the field name.
      childCollections: await resolveChildCollectionFields(project, moduleName, readStringArray(detailsDecl?.childCollections)),
    });
  }
  return plans.sort((left, right) => left.seedFor.localeCompare(right.seedFor));
}

/** Map the TableDefinition's `childCollections` (ENTITY IDS) onto the collection FIELD NAMES the
 * generated domain entity actually declares — which is what the adapter reads out of the details
 * envelope. Seeds run after materialization, so the entity source is on disk; when it cannot be read (or
 * declares no matching collection) the entity id is kept as a best-effort so nothing silently vanishes. */
async function resolveChildCollectionFields(project: number, moduleName: string, childEntityIds: string[]): Promise<string[]> {
  if (!childEntityIds.length) return [];
  const resolved: string[] = [];
  for (const childEntityId of childEntityIds) {
    let fieldName = '';
    try {
      // The owner entity of the collection is unknown here, so scan the module's generated entities for
      // the one that declares `<field>: <childEntityId>[]`.
      for (const file of Object.values(mls.stor.files) as any[]) {
        if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
        if (file.extension !== '.ts' || String(file.folder || '') !== `${moduleName}/layer_3_domain/entities`) continue;
        const found = extractCollectionFieldNames(String(await file.getContent())).get(childEntityId);
        if (found) { fieldName = found; break; }
      }
    } catch { /* unresolved -> dropped below */ }
    // UNRESOLVED is dropped, not defaulted to the entity id: if no generated entity declares a collection
    // of this child, nothing reads it back, and seeding under the entity id would write to a dead key —
    // the same silent-shape defect this resolution exists to prevent. The table simply gets no children.
    if (fieldName) resolved.push(fieldName);
  }
  return [...new Set(resolved)];
}

function parseArtifact(content: string): Record<string, unknown> | undefined {
  const start = content.indexOf('= ');
  const end = content.indexOf(' as const;');
  if (start === -1 || end <= start) return undefined;
  try {
    const parsed = JSON.parse(content.slice(start + 2, end));
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function readPersistedPlan(project: number, moduleName: string): Promise<SeedPlanProgress | null> {
  try {
    const fileInfo = { project, level: 1, folder: `${moduleName}/layer_1_external/adapters/persistence`, shortName: 'seeds', extension: '.ts' };
    const key = mls.stor.getKeyToFile(fileInfo);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return null;
    return extractSeedPlanProgressFromSource(String(await file.getContent()));
  } catch {
    return null;
  }
}
