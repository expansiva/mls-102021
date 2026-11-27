/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_BUILD, M12_SEED_ROWS_AGENT_NAME, M12_SEED_ROW_UNIT_AGENT_NAME, clip, errorText, parseM12StepInvocation, tokenOk, unitIdOk } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12WorkerStep, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { buildLocalTable, type ReferenceSeedDataset } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { readDraft, writeDraft } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { materializeUnit, type M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { storEntries, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import {
  draftScenarioRow,
  referenceSeedUnit,
  seedOntologyRef,
  seedScenariosOf,
  stateFieldFor,
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

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : '';
}

/** `tableId` of the persistence def for this entity, or the entity id with a lower first letter. */
function tableIdOf(ctx: M12Context, entityId: string): string {
  for (const unit of ctx.units) {
    if (unit.definition.artifactType !== 'table') continue;
    if (unit.definition.data.entityId !== entityId) continue;
    const tableId = unit.definition.data.tableId;
    if (typeof tableId === 'string' && tableId) return tableId;
  }
  return lowerFirst(entityId);
}

/**
 * Column names of the table def of `tableId`, as the persistence step emits it (`buildLocalTable`).
 * A table def, entity def or table shape that is missing throws: the rows are not checked against a guess.
 */
export function seedTableColumns(units: readonly M12Unit[], tableId: string): string[] {
  return seedTableBuilt(units, tableId).definition.columns.map(column => column.name);
}

/** Where the table def of `tableId` stores each field: the same bindings the adapter emitter reads (d1_326). */
export function seedTableBindings(units: readonly M12Unit[], tableId: string): Array<{ field: string; column: string; placement: 'column' | 'json' }> {
  return seedTableBuilt(units, tableId).bindings.map(binding => ({ field: binding.field, column: binding.column, placement: binding.placement as 'column' | 'json' }));
}

function seedTableBuilt(units: readonly M12Unit[], tableId: string): Extract<ReturnType<typeof buildLocalTable>, { bindings: unknown }> {
  const table = units.find(unit => unit.definition.artifactType === 'table' && unit.definition.data.tableId === tableId);
  if (!table) throw new Error(`M12_TABLE_UNKNOWN: seedRows ${tableId} has no table def.`);
  const entityRef = table.definition.dependencies.find(path => path.includes('/entities/'));
  const entity = entityRef ? units.find(unit => unit.defRef === entityRef) : undefined;
  if (!entity) throw new Error(`M12_TABLE_UNKNOWN: table ${tableId} has no entity def in the module.`);
  const built = buildLocalTable(table.definition, entity.definition);
  if ('code' in built) throw new Error(`M12_TABLE_UNKNOWN: table ${tableId}: ${built.code}: ${built.detail}`);
  return built;
}

/** Tables of this module whose l4 entity declares `initialData`. A seed scenario is not required. Others are absent: no model call. */
export async function referenceSeedTables(ctx: M12Context): Promise<SeedTableUnit[]> {
  const tables: SeedTableUnit[] = [];
  const seen = new Set<string>();
  const entries = storEntries()
    .filter(file => file.project === ctx.run.project && file.level === 4 && file.extension === '.defs.ts'
      && file.folder === `${ctx.run.module}/ontology` && file.status !== 'deleted' && !!file.shortName)
    .sort((left, right) => left.shortName.localeCompare(right.shortName));
  for (const entry of entries) {
    const source = await ctx.read(seedOntologyRef(ctx.run.project, ctx.run.module, entry.shortName));
    if (!source) continue;
    const draft = referenceSeedUnit({
      scenarioId: 'initial',
      tableId: '',
      ontologySource: source,
      states: [],
      stateField: '',
    });
    if (!draft) continue;
    const tableId = tableIdOf(ctx, draft.entityId || entry.shortName);
    if (!tableId || seen.has(tableId) || !unitIdOk(tableId)) continue;
    const stateField = stateFieldFor(draft.columns, draft.states);
    seen.add(tableId);
    tables.push({ ...draft, tableId, tableColumns: seedTableColumns(ctx.units, tableId), tableBindings: seedTableBindings(ctx.units, tableId), ...(stateField ? { stateField } : {}) });
  }
  return tables.sort((left, right) => left.tableId.localeCompare(right.tableId));
}

const SEED_DRAFT_PART = 'rows';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Tables that already have rows: the def's datasets, and the initial rows the
 * reference-seed unit accepted. A scenario for one of these tables reuses that
 * row (same primary key); it does not add a `test` dataset.
 */
export function takenSeedTables(prior: readonly unknown[], reference: readonly ReferenceSeedDataset[]): Set<string> {
  const fromDef = prior.filter(isRecord).filter(item => Array.isArray(item.rows) && item.rows.length > 0).map(item => String(item.seedFor ?? ''));
  const fromReference = reference.filter(item => item.rows.length > 0).map(item => item.seedFor);
  return new Set([...fromDef, ...fromReference]);
}

interface ScenarioRow {
  id: string;
  /** `entity → id` this row cites through its own `ref:` fields, so a child that cites this row and that entity agrees with it. */
  links: Record<string, string>;
}

function refPairsOf(constraints: readonly string[]): { field: string; entity: string }[] {
  const out: { field: string; entity: string }[] = [];
  for (const constraint of constraints) {
    const ref = /^ref:([^:]+):([^:]+)/u.exec(constraint);
    if (ref) out.push({ field: ref[1], entity: ref[2] });
  }
  return out;
}

/**
 * The value of each `ref:` field of a scenario row: the id of a row of the parent entity in this seed (d1_312).
 * The parent is picked by the scenario index, modulo the number of parent rows. A parent that already cites another
 * parent of this row decides that one too (audit → conversation → bot). No parent row: the field gets no value.
 */
export function pickRefValues(
  pairs: readonly { field: string; entity: string }[],
  scenarioIndex: number,
  rowsOf: (entity: string) => readonly ScenarioRow[],
): Record<string, string> {
  const values: Record<string, string> = {};
  const entities = new Set(pairs.map(pair => pair.entity));
  const cites = (entity: string): number => rowsOf(entity).some(row => Object.keys(row.links).some(target => entities.has(target) && target !== entity)) ? 0 : 1;
  const ordered = [...pairs].sort((left, right) => cites(left.entity) - cites(right.entity));
  for (const pair of ordered) {
    if (pair.field in values) continue;
    const rows = rowsOf(pair.entity);
    if (rows.length === 0) continue;
    const chosen = rows[(Math.max(scenarioIndex, 1) - 1) % rows.length];
    values[pair.field] = chosen.id;
    for (const other of ordered) {
      if (!(other.field in values) && other.entity !== pair.entity && chosen.links[other.entity]) values[other.field] = chosen.links[other.entity];
    }
  }
  return values;
}

/**
 * One accepted row per seed-plan scenario (journey or model). No `purpose`:
 * the emitter marks a dataset that is not the initial unit as `test`.
 * A row the gate refuses is left out. Initial drafts are not touched.
 * A `ref:` field holds the id of a row of the parent entity in this seed, so the scenarios are drafted parents first
 * (topological order by their `ref:` constraints); a cycle is drafted in plan order and its refs stay without value.
 */
export async function scenarioSeedDatasets(ctx: M12Context): Promise<ReferenceSeedDataset[]> {
  return (await scenarioSeedOutcome(ctx)).datasets;
}

/** d1_342: a scenario that gives no row is never silent: the table, the scenario and the reason. */
export interface SeedScenarioDrop { tableId: string; scenarioId: string; reason: string }

export async function scenarioSeedOutcome(ctx: M12Context): Promise<{ datasets: ReferenceSeedDataset[]; dropped: SeedScenarioDrop[] }> {
  const dropped: SeedScenarioDrop[] = [];
  const grouped = new Map<string, Record<string, unknown>[]>();
  const { completeInitialRows } = await import('/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.js');
  const seeds = ctx.units.filter(seed => seed.definition.artifactType === 'persistenceSeeds');
  const prior = seeds.flatMap(seed => (Array.isArray(seed.definition.data.datasets) ? seed.definition.data.datasets : []));
  const taken = takenSeedTables(prior, ctx.referenceSeeds ?? []);

  interface Planned { scenario: ReturnType<typeof seedScenariosOf>[number]; unit: SeedTableUnit; pairs: { field: string; entity: string }[] }
  const planned: Planned[] = [];
  for (const seed of seeds) {
    const scenarios = seedScenariosOf(seed.definition.data);
    for (const scenario of scenarios) {
      const source = await ctx.read(seedOntologyRef(ctx.run.project, ctx.run.module, scenario.entityId));
      if (!source) { dropped.push({ tableId: scenario.tableId, scenarioId: scenario.scenarioId, reason: `the ontology of ${scenario.entityId} is not readable` }); continue; }
      const draft = referenceSeedUnit({
        scenarioId: scenario.scenarioId,
        tableId: scenario.tableId,
        ontologySource: source,
        states: scenario.states,
        stateField: scenario.stateField,
        requireInitial: false,
        constraints: scenario.constraints,
      });
      if (!draft) { dropped.push({ tableId: scenario.tableId, scenarioId: scenario.scenarioId, reason: `${scenario.entityId} is not a seedable table` }); continue; }
      const stateField = scenario.stateField || stateFieldFor(draft.columns, scenario.states);
      const scenarioIndex = scenarios.filter(item => item.tableId === scenario.tableId).indexOf(scenario) + 1;
      planned.push({
        scenario,
        unit: { ...draft, scenarioIndex, tableColumns: seedTableColumns(ctx.units, scenario.tableId), tableBindings: seedTableBindings(ctx.units, scenario.tableId), ...(stateField ? { stateField } : {}) },
        pairs: refPairsOf(scenario.constraints),
      });
    }
  }

  // Entities of this module that a `ref:` can point at: the ones a ref names and whose ontology is a seedable table.
  const moduleEntity = new Map<string, boolean>();
  for (const item of planned) {
    for (const pair of item.pairs) {
      if (moduleEntity.has(pair.entity)) continue;
      const source = await ctx.read(seedOntologyRef(ctx.run.project, ctx.run.module, pair.entity));
      moduleEntity.set(pair.entity, !!source && !!referenceSeedUnit({ scenarioId: '', tableId: '', ontologySource: source, states: [], stateField: '', requireInitial: false }));
    }
  }
  const tableOfEntity = new Map<string, string>(planned.map(item => [item.unit.entityId, item.scenario.tableId]));
  for (const table of await referenceSeedTables(ctx)) tableOfEntity.set(table.entityId, table.tableId);

  const referenceRows = (tableId: string): ScenarioRow[] => (ctx.referenceSeeds ?? [])
    .filter(item => item.seedFor === tableId)
    .flatMap(item => item.rows)
    .filter(row => typeof row.id === 'string' && row.id !== '')
    .map(row => ({ id: String(row.id), links: {} }));
  const generated = new Map<string, ScenarioRow[]>();
  const rowsOf = (entity: string): ScenarioRow[] => {
    const tableId = tableOfEntity.get(entity);
    if (!tableId) return [];
    return taken.has(tableId) ? referenceRows(tableId) : (generated.get(tableId) ?? []);
  };

  const pending = [...planned];
  const ordered: Planned[] = [];
  while (pending.length > 0) {
    const ready = pending.findIndex(item => item.pairs.every(pair => !moduleEntity.get(pair.entity) || pair.entity === item.unit.entityId
      || !pending.some(other => other !== item && other.unit.entityId === pair.entity)));
    const [next] = pending.splice(ready >= 0 ? ready : 0, 1);
    ordered.push(next);
  }

  for (const item of ordered) {
    const { scenario, pairs } = item;
    const parentIds: Record<string, string[]> = {};
    for (const pair of pairs) if (moduleEntity.get(pair.entity)) parentIds[pair.entity] = rowsOf(pair.entity).map(row => row.id);
    const unit = { ...item.unit, parentIds };
    const seedPairs = pairs.filter(pair => moduleEntity.get(pair.entity));
    const refValues = pickRefValues(seedPairs, unit.scenarioIndex, rowsOf);
    const drafted = await draftScenarioRow(unit, refValues);
    if ('problems' in drafted) { dropped.push({ tableId: scenario.tableId, scenarioId: scenario.scenarioId, reason: drafted.problems.join(' | ') }); continue; }
    const completed = await completeInitialRows(unit, [drafted.row]);
    if ('problems' in completed || completed.rows.length === 0) {
      dropped.push({ tableId: scenario.tableId, scenarioId: scenario.scenarioId, reason: 'problems' in completed ? completed.problems.join(' | ') : 'no row after the primary key and the server values' });
      continue;
    }
    const row = completed.rows[0];
    const rows = grouped.get(scenario.tableId) ?? [];
    rows.push(row);
    grouped.set(scenario.tableId, rows);
    const links: Record<string, string> = {};
    for (const pair of seedPairs) if (typeof row[pair.field] === 'string' && !(pair.entity in links)) links[pair.entity] = String(row[pair.field]);
    if (typeof row.id === 'string') generated.set(scenario.tableId, [...(generated.get(scenario.tableId) ?? []), { id: row.id, links }]);
  }
  return { datasets: [...grouped.entries()].map(([seedFor, rows]) => ({ seedFor, rows })), dropped };
}

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
  const outcome = await scenarioSeedOutcome(ctx);
  const scenarioDatasets = outcome.datasets;
  ctx.seedDrops = outcome.dropped.map(item => `${item.tableId}/${item.scenarioId}: ${item.reason}`);
  let wrote = false;
  for (const unit of seeds) {
    const data = unit.definition.data;
    const prior = Array.isArray(data.datasets) ? data.datasets : [];
    const taken = takenSeedTables(prior, reference);
    data.datasets = [
      ...prior,
      ...scenarioDatasets.filter(item => !taken.has(item.seedFor)).map(item => ({ seedFor: item.seedFor, rows: item.rows })),
    ];
    const result = await materializeUnit(ctx, unit);
    if (result.code === 'PROFILE_REFUSED') return false;
    if (result.status === 'done' || result.status === 'reused') wrote = true;
    else throw new Error(`${result.code}: ${result.line}`);
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
