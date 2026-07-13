/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seeds/agentCbSeeds.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Seed scenarios are planned by an LLM but compiled locally. The model never writes TypeScript or
// UUIDs: it returns a strict JSON plan, cbSeedsCore validates it against L4/table defs, then emits
// deterministic TableSeedRows plus MDM entity/document/relationship rows.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { saveGeneratedTs } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import {
  readBackendScan, enqueueNext, createUpdateStatusIntent, createPromptReadyIntent, readCbPrompt,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, saveAgentTrace,
  createAddStepIntent, createAgentStepPayload, isRecord, readString, readStringArray, logPrefix,
  parseDefsSource, type CbScan,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { seedPlanResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
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
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const input = await readSeedBuildInput(scan);
    const args = seedArgsOf(step);
    const persisted = await readPersistedPlan(input.project, input.moduleName);
    if (persisted && !persisted.partial) {
      const reused = buildSeedSource({ ...input, plan: persisted.plan });
      if (!reused.errors.length && reused.content) {
        const saved = await saveGeneratedTs(input.project, 1, `${input.moduleName}/layer_1_external/adapters/persistence`, 'seeds', reused.content);
        if (!saved.ok || saved.compileErrors.length) throw new Error(`failed to compile reused seeds.ts: ${saved.compileErrors.join('; ')}`);
        return [
          enqueueNext(context, parentStep, step, 'cb-register', 'agentCbRegister', 'Registrar backend', {}),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Reused validated deterministic seed plan (${reused.summary}).`, 'input_output'),
        ];
      }
      args.seedFindings.push(...reused.errors.slice(0, 40));
    }
    const progress = persisted?.partial ? persisted : { plan: emptyPlan(), partial: true, completedWaveIndexes: [] };
    const batch = nextSeedBatch(input, progress.plan, args.forcedBatch);
    if (!batch) return finalizeSeedPlan(context, parentStep, step, hookSequential, input, progress.plan, 'Resumed all validated seed waves.');
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
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress']);
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
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `Seed wave ${batch.index} validation failed after ${args.seedAttempt}/${MAX_PLAN_ATTEMPTS}: ${errors.slice(0, 30).join('; ')}`)];
    }
    const tokenTrace = outputTokenTrace(payload);
    const merged = mergeSeedPlans(progress.plan, plan);
    const next = nextSeedBatch(input, merged);
    const partial = buildPartialSeedSource(input, { plan: merged, completedWaveIndexes: completedWaveIndexes(input, merged) });
    const saved = await saveGeneratedTs(input.project, 1, `${input.moduleName}/layer_1_external/adapters/persistence`, 'seeds', partial);
    if (!saved.ok || saved.compileErrors.length) throw new Error(`failed to persist partial seeds.ts: ${saved.compileErrors.join('; ')}`);
    if (!next) return finalizeSeedPlan(context, parentStep, step, hookSequential, input, merged, `Generated final seed wave ${batch.index} (estimated ${estimateSeedPlanningWaveTokens(input, batch)} tokens; ${tokenTrace}).`);
    return scheduleSeedStep(context, parentStep, step, hookSequential, { seedAttempt: 1, seedFindings: [], forcedBatch: next }, `Validated seed wave ${batch.index}; persisted partial plan and scheduled the next wave (estimated ${estimateSeedPlanningWaveTokens(input, batch)} tokens; ${tokenTrace}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function scheduleSeedStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: SeedStepArgs,
  trace: string,
): mls.msg.AgentIntent[] {
  const planId = `cb-gen-seeds-w${args.forcedBatch?.index ?? 'next'}-r${args.seedAttempt}-${Date.now()}`;
  return [
    createAddStepIntent(context, parentStep, createAgentStepPayload(
      planId, AGENT_NAME,
      args.seedAttempt > 1 ? `Reparar plano de seeds (${args.seedAttempt}/${MAX_PLAN_ATTEMPTS})` : `Planejar próxima onda de seeds`,
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
): Promise<mls.msg.AgentIntent[]> {
  const built = buildSeedSource({ ...input, plan });
  if (built.errors.length || !built.content) throw new Error(`final seed plan validation failed: ${built.errors.slice(0, 30).join('; ')}`);
  const saved = await saveGeneratedTs(input.project, 1, `${input.moduleName}/layer_1_external/adapters/persistence`, 'seeds', built.content);
  if (!saved.ok || saved.compileErrors.length) throw new Error(`failed to compile seeds.ts: ${saved.compileErrors.join('; ')}`);
  return [
    enqueueNext(context, parentStep, step, 'cb-register', 'agentCbRegister', 'Registrar backend', {}),
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${trace} Final validation succeeded (${built.summary}).`, 'input_output'),
  ];
}

async function readSeedBuildInput(scan: CbScan): Promise<Omit<SeedBuildInput, 'plan'>> {
  const project = scan.project;
  const moduleName = scan.moduleNames[0] || 'unknown';
  const language = await readDefaultLanguage(project);
  const entities: SeedEntityDefinition[] = scan.entities.map((entity) => ({
    entityId: entity.entityId,
    title: entity.title,
    kind: entity.kind,
    fields: (entity.fields ?? []).filter(isRecord).map((field) => ({
      fieldId: readString(field.fieldId),
      type: readString(field.type),
      required: field.required === true,
      enumValues: readStringArray(field.enum),
    })).filter(field => !!field.fieldId),
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
    if (!isRecord(parsed) || !Array.isArray(parsed.actors)) continue;
    for (const raw of parsed.actors) {
      if (!isRecord(raw)) continue;
      const actorId = readString(raw.actorId);
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
async function readRuleDefinitions(project: number): Promise<SeedRuleDefinition[]> {
  const rules: SeedRuleDefinition[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed) || !Array.isArray(parsed.rules)) continue;
    for (const raw of parsed.rules) {
      if (!isRecord(raw)) continue;
      const ruleId = readString(raw.ruleId);
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
    plans.push({
      tableId,
      tableName: readString(data.tableName) || tableId,
      seedFor: `${moduleName}${tableId}`,
      columns,
      primaryKey: Array.isArray(data.primaryKey) ? data.primaryKey.map(readString).filter(Boolean) : [],
    });
  }
  return plans.sort((left, right) => left.seedFor.localeCompare(right.seedFor));
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
