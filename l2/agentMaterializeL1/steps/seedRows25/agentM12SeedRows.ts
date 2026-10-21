/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_BUILD, M12_SEED_ROWS_AGENT_NAME, M12_SEED_ROW_UNIT_AGENT_NAME, clip, errorText, parseM12StepInvocation, tokenOk, unitIdOk } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12WorkerStep, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { ontologyRef } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import type { ReferenceSeedDataset } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { readDraft, writeDraft } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { materializeUnit, type M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import {
  referenceSeedFromScenario,
  seedOntologyRef,
  seedScenariosOf,
  type SeedTableUnit,
} from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';

export interface SeedWorkerArgs {
  project: number;
  module: string;
  unitId: string;
  attempt: number;
  force: boolean;
  problems?: string[];
  previous?: string;
}

/** Tables of this module whose l4 says the module seed loads them. Others are absent: no model call. */
export async function referenceSeedTables(ctx: M12Context): Promise<SeedTableUnit[]> {
  const tables: SeedTableUnit[] = [];
  const seen = new Set<string>();
  for (const unit of ctx.units) {
    if (unit.definition.artifactType !== 'persistenceSeeds') continue;
    for (const scenario of seedScenariosOf(unit.definition.data)) {
      if (seen.has(scenario.tableId) || !unitIdOk(scenario.tableId)) continue;
      const entity = ctx.units.find(item => item.definition.artifactType === 'domainEntity' && item.definition.data.entityId === scenario.entityId);
      const ref = entity
        ? ontologyRef(entity.definition, entity.outputRef)
        : seedOntologyRef(ctx.run.project, ctx.run.module, scenario.entityId);
      const table = referenceSeedFromScenario({ ...scenario, ontologySource: await ctx.read(ref) });
      if (!table) continue;
      seen.add(scenario.tableId);
      tables.push(table);
    }
  }
  return tables;
}

const SEED_DRAFT_PART = 'rows';

/** One draft per table: accepted rows, or an empty table and the reason after the repair. */
export async function writeSeedTableDraft(project: number, moduleName: string, tableId: string, rows: readonly Record<string, unknown>[], reason: string | null): Promise<void> {
  await writeDraft(project, moduleName, 'seedRows', tableId, SEED_DRAFT_PART, JSON.stringify({ rows, reason }));
}

/**
 * Writes `seeds.ts` when every reference-seed table of the step has `rows`
 * (accepted, or empty with a reason). A `{ pending: true }` draft is not ready.
 * The last worker to finish is the one that sees them all. The file goes through
 * `materializeUnit`, so the unit receipt, the production refusal and the compile gate apply.
 * No reference-seed table: emit at once, with the rows the def already carries.
 * Returns whether a file was written.
 */
export async function emitSeedsWhenReady(ctx: M12Context): Promise<boolean> {
  const seeds = ctx.units.filter(unit => unit.definition.artifactType === 'persistenceSeeds');
  if (!seeds.length) return false;
  const tables = await referenceSeedTables(ctx);
  const reference: ReferenceSeedDataset[] = [];
  for (const table of tables) {
    const raw = await readDraft(ctx.run.project, ctx.run.module, 'seedRows', table.tableId, SEED_DRAFT_PART);
    if (raw === null) return false;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return false; }
    const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as { rows?: unknown; pending?: unknown } : {};
    if (record.pending === true || !Array.isArray(record.rows)) return false;
    reference.push({ seedFor: table.tableId, rows: record.rows as Record<string, unknown>[] });
  }
  ctx.referenceSeeds = reference;
  let wrote = false;
  for (const unit of seeds) {
    const outcome = await materializeUnit(ctx, unit);
    if (outcome.code === 'PROFILE_REFUSED') return false;
    if (outcome.status === 'done' || outcome.status === 'reused') wrote = true;
    else throw new Error(`${outcome.code}: ${outcome.line}`);
  }
  return wrote;
}

export function seedWorkerStep(args: SeedWorkerArgs): mls.msg.AIAgentStep {
  const title = args.attempt > 1 ? `Reference seed ${args.unitId} (repair)` : `Reference seed ${args.unitId}`;
  return m12WorkerStep(M12_SEED_ROW_UNIT_AGENT_NAME, title, `seedRows25-${args.module}-${args.unitId}-${args.attempt}`, args);
}

export function parseSeedWorkerArgs(raw: string, currentProject: number): SeedWorkerArgs {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('M12_WORKER_ARGS_JSON'); }
  const args = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Partial<SeedWorkerArgs>;
  if (args.project !== currentProject || !tokenOk(String(args.module ?? '')) || !unitIdOk(String(args.unitId ?? ''))) throw new Error('M12_WORKER_ARGS_IDENTITY');
  if (args.attempt !== 1 && args.attempt !== 2) throw new Error('M12_WORKER_ARGS_ATTEMPT');
  return {
    project: args.project as number,
    module: String(args.module),
    unitId: String(args.unitId),
    attempt: args.attempt,
    force: args.force === true,
    ...(Array.isArray(args.problems) ? { problems: args.problems.filter((item): item is string => typeof item === 'string') } : {}),
    ...(typeof args.previous === 'string' ? { previous: args.previous } : {}),
  };
}

/** One model worker per reference-seed table. A module with none completes without a model call. */
export function createAgent(): IAgentAsync {
  async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
    const run = parseM12StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
    if (run.kind === 'refusal') return [updateM12Status(context, parentStep, step, hookSequential, 'failed', run.diagnostic)];
    try {
      const { ctx } = await loadRun(run);
      const tables = await referenceSeedTables(ctx);
      for (const table of tables) {
        await writeDraft(run.project, run.module, 'seedRows', table.tableId, SEED_DRAFT_PART, JSON.stringify({ pending: true }));
      }
      if (!tables.length) {
        const emitted = await emitSeedsWhenReady(ctx);
        const trace = clip([`build ${M12_BUILD}`, '0 unit(s) dispatched to the model', emitted ? 'seeds.ts emitted' : 'no persistenceSeeds def'].join('\n'), 3000);
        return [updateM12Status(context, parentStep, step, hookSequential, 'completed', trace)];
      }
      const workers = tables.map(table => addM12Step(context, step.stepId, seedWorkerStep({
        project: run.project, module: run.module, unitId: table.tableId, attempt: 1, force: run.force,
      })));
      const trace = clip([`build ${M12_BUILD}`, `${workers.length} unit(s) dispatched to the model`, ...tables.map(table => `${table.tableId}: dispatched to the model`)].join('\n'), 3000);
      return [...workers, updateM12Status(context, parentStep, step, hookSequential, 'in_progress', trace)];
    } catch (error) {
      return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
    }
  }
  return {
    agentName: M12_SEED_ROWS_AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentMaterializeL1/steps/seedRows25',
    agentDescription: 'Dispatch one model worker per reference-seed table',
    visibility: 'private',
    beforePromptStep,
  };
}
