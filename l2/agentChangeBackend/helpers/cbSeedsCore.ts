/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure seed-plan compiler. The LLM may choose a useful business scenario, but it never writes
// TypeScript: this module validates its JSON plan, resolves symbolic references to stable UUIDs
// and emits the runtime-discoverable TableSeedRows source.

import type { L4RuleDefinition } from '/_102021_/l2/agentChangeBackend/helpers/cbRules.js';
export type SeedRuleDefinition = L4RuleDefinition;

export const SEED_T0 = '2026-07-01T08:00:00.000Z';
export const SEED_T1 = '2026-07-01T09:00:00.000Z';
// Default deterministic window for seed timestamps. The planner may place ANY ISO 8601 instant
// inside it, so a scenario can lay out a realistic multi-step timeline instead of collapsing every
// row onto two fixed points (which is what forced conflicts like readyAt === deliveredAt).
export const SEED_WINDOW_START = '2026-07-01T00:00:00.000Z';
export const SEED_WINDOW_END = '2026-07-08T00:00:00.000Z';
export const SEED_PLAN_START = '/* <agentCbSeedsPlan>';
export const SEED_PLAN_END = '</agentCbSeedsPlan> */';
export const SEED_ASSET_URLS_START = '// <agentCbSeedAssetUrls>';
export const SEED_ASSET_URLS_END = '// </agentCbSeedAssetUrls>';
export const SEED_VALIDATOR_ATTEMPTS = 100;
/** Leftover valid values per seeded field, for create-command tests that must not reuse a row. */
export const SEED_SPARES_PER_FIELD = 3;

export interface SeedFieldDefinition {
  fieldId: string;
  type: string;
  required: boolean;
  enumValues: string[];
  /** Domain export that judges this field. The generator never interprets the rule; it only calls this. */
  validatorExport?: string;
}

export interface SeedEntityDefinition {
  entityId: string;
  title: string;
  kind: string;
  fields: SeedFieldDefinition[];
  /**
   * The lifecycle states this module actually OPERATES on — the union of `fromStates` of the entity's
   * workflow transitions. Not every declared state: a screen that decides on a state filters by it, and
   * that is the set a seed has to cover. Absent for an entity with no workflow (nothing to cover).
   */
  operatedStates?: string[];
}

export interface SeedTableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SeedTableDefinition {
  tableId: string;
  tableName: string;
  seedFor: string;
  /** Real table columns. MUST include the details column when the TableDefinition enables it — the
   * emitter only writes a row property for a declared column, so omitting it DROPS the whole details
   * payload (102051: every seeded row lost its planned `details`, see detailsColumnName). */
  columns: SeedTableColumn[];
  primaryKey: string[];
  /** The JSONB envelope column declared by `detailsColumn` in the TableDefinition (`enabled` + a
   * `columnName` that is conventionally, but not necessarily, `details`). Empty when the table has none. */
  detailsColumnName?: string;
  /** Embedded child collections stored INSIDE the details envelope (declared by the TableDefinition).
   * Surfaced to the planner so an aggregate that owns children (e.g. order items) actually gets them. */
  childCollections?: string[];
}

/** The details envelope column of a table plan: the explicit declaration when present, else the
 * conventional `details` if such a column exists. Keeps the compiler honest about WHERE the JSONB goes
 * without hardcoding the name at every use site. */
export function detailsColumnOf(table: Pick<SeedTableDefinition, 'columns' | 'detailsColumnName'>): string {
  const declared = (table.detailsColumnName ?? '').trim();
  if (declared) return declared;
  return table.columns.some(column => column.name === 'details') ? 'details' : '';
}

export interface SeedReference {
  ref: string;
}

export interface SeedAssetRef {
  asset: string;
  kind: 'image';
}

export type SeedValue = string | number | boolean | null | SeedReference | SeedAssetRef;

export interface SeedFieldValue {
  name: string;
  value: SeedValue;
}

export interface SeedChildRow {
  key: string;
  fields: SeedFieldValue[];
}

export interface SeedChildCollection {
  name: string;
  rows: SeedChildRow[];
}

export interface SeedLocalRow {
  key: string;
  columns: SeedFieldValue[];
  details: SeedFieldValue[];
  children: SeedChildCollection[];
}

export interface SeedLocalTable {
  tableId: string;
  rows: SeedLocalRow[];
}

export interface SeedMdmRelationship {
  targetRef: string;
  type: string;
  metadata: SeedFieldValue[];
  isBidirectional: boolean;
}

export interface SeedMdmRow {
  key: string;
  fields: SeedFieldValue[];
  relationships: SeedMdmRelationship[];
}

export interface SeedMdmEntity {
  entityId: string;
  rows: SeedMdmRow[];
}

export interface SeedPlan {
  summary: string;
  localTables: SeedLocalTable[];
  mdmEntities: SeedMdmEntity[];
}

export interface SeedRelationshipDefinition {
  fromEntity: string;
  toEntity: string;
  type: string;
}

/** A deterministic batch of seed-plan targets. All references emitted by a target in a wave resolve
 * to a target in an earlier wave, or to another target in that same wave (a dependency cycle). */
export interface SeedPlanningWave {
  index: number;
  tableIds: string[];
  mdmEntityIds: string[];
}

export interface SeedPlanProgress {
  plan: SeedPlan;
  partial: boolean;
  completedWaveIndexes: number[];
}

export interface SeedReferenceCatalogItem {
  ref: string;
  label: string;
  context: string;
}

export interface SeedPlanPromptOptions {
  catalog?: SeedReferenceCatalogItem[];
  priorSummary?: string;
  wave?: SeedPlanningWave;
  estimatedOutputTokens?: number;
}

export const MAX_SEED_WAVE_OUTPUT_TOKENS = 12000;

/** An L4 actor (platform user role). Some FK fields (e.g. an assignee or the actorSession-resolved
 * worker on an event) reference a platform-user identity, NOT a module-owned entity — there is no
 * table/MDM entity to seed. The generator synthesizes a small, deterministic pool of platform-user
 * identities per actor so those FKs resolve to real MDM Person records instead of a fabricated table. */
export interface SeedActorDefinition {
  actorId: string;
  title: string;
}

export interface SeedTimeWindow {
  start: string;
  end: string;
}

export interface SeedBuildInput {
  project: number;
  moduleName: string;
  language: string;
  entities: SeedEntityDefinition[];
  tablePlans: SeedTableDefinition[];
  ruleIds: string[];
  /** Full L4 rule text for the applied ruleIds. Passed to the planner so rule conformance is guided
   * by L4 semantics instead of hardcoded, domain-specific checks. */
  rules?: SeedRuleDefinition[];
  /** L4 relationship graph, so the planner models MDM relationships generically (no invented,
   * per-domain type names baked into this generator). */
  relationships?: SeedRelationshipDefinition[];
  /** L4 actors. The generator exposes a resolvable platform-user identity pool per actor so FKs that
   * reference a platform user (assignees, actorSession-resolved fields) never fabricate a table. */
  actors?: SeedActorDefinition[];
  /** Allowed timestamp window; every timestamp must be ISO 8601 within it. */
  timeWindow?: SeedTimeWindow;
  /** Targets deliberately left with NO seed rows (a wave that never converged). Recorded in the
   * emitted artifact so downstream consumers can tell "empty by design" from "generation lost it". */
  skipped?: SeedSkippedTargets;
  /**
   * Canonical tags (`<module>.<Entity>`) that generated usecases actually read through `ctx.mdm`
   * (`listByType` or lifecycle). Derived from the pinned `mdm` block + generated sources — never
   * guessed from an entity name. While `MDM_WRITE_PATH_ENABLED` is false those entities still have
   * LOCAL tables; the index must be seeded too or lists/inactivate return empty/NOT_FOUND (be5).
   */
  mdmRequiredTags?: string[];
  plan: SeedPlan;
}

/** Machine-readable seed coverage: which targets have NO rows on purpose. The seed give-up narrows
 * tablePlans/entities so a non-converging wave cannot fail the whole backend — which silently left
 * tables with zero rows (102051: AiSalesSummary, AiPromotionSuggestion). A test generator asserting
 * "at least one row" against those produces impossible cases, so the fact is published, not implied. */
export interface SeedSkippedTargets {
  tables: string[];
  mdmEntities: string[];
  reason: string;
  /** Violations of EACH planner attempt, in order. The give-up reason used to keep only the last. */
  attempts?: { attempt: number; errors: string[] }[];
}

/** One planner try for a seed wave. Kept across repair steps so a later try cannot silently regress
 * a field that already validated, and so give-up can name every attempt's violations. */
export interface SeedAttemptRecord {
  attempt: number;
  plan: SeedPlan;
  errors: string[];
}

export interface SeedBuildResult {
  errors: string[];
  content?: string;
  summary: string;
}

interface SeedPlanningNode {
  id: string;
  subjectId: string;
  type: 'table' | 'mdm';
  baseLevel: number;
}

function normalizedIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

function foreignKeyTargetName(columnName: string): string {
  return columnName.replace(/_id$/iu, '');
}

/**
 * Partitions seed targets by their real dependency graph. MDM starts in the first wave, ordinary
 * persistence tables in the second, and supporting/event tables in the third; a dependency moves
 * only its dependant forward. Strongly connected targets stay together so mutual references remain
 * valid within one LLM call.
 */
export function deriveSeedPlanningWaves(input: Pick<SeedBuildInput, 'entities' | 'tablePlans' | 'relationships'>): SeedPlanningWave[] {
  const entityById = new Map(input.entities.map(entity => [entity.entityId, entity]));
  const nodes = new Map<string, SeedPlanningNode>();

  for (const entity of input.entities) {
    if (entity.kind !== 'mdm') continue;
    nodes.set(`mdm:${entity.entityId}`, { id: `mdm:${entity.entityId}`, subjectId: entity.entityId, type: 'mdm', baseLevel: 0 });
  }
  for (const table of input.tablePlans) {
    const kind = entityById.get(table.tableId)?.kind;
    nodes.set(`table:${table.tableId}`, {
      id: `table:${table.tableId}`,
      subjectId: table.tableId,
      type: 'table',
      baseLevel: kind === 'supporting' || kind === 'event' ? 2 : 1,
    });
  }

  const targetForEntity = (entityId: string): string | undefined => {
    const entity = entityById.get(entityId);
    if (entity?.kind === 'mdm' && nodes.has(`mdm:${entityId}`)) return `mdm:${entityId}`;
    return nodes.has(`table:${entityId}`) ? `table:${entityId}` : undefined;
  };
  const targetByForeignKey = new Map<string, string>();
  for (const node of nodes.values()) {
    const key = normalizedIdentifier(node.subjectId);
    if (!targetByForeignKey.has(key)) targetByForeignKey.set(key, node.id);
  }

  const dependencies = new Map([...nodes.keys()].map(id => [id, new Set<string>()]));
  const addDependency = (source: string | undefined, target: string | undefined) => {
    if (source && target && source !== target) dependencies.get(source)!.add(target);
  };

  for (const relationship of input.relationships ?? []) {
    addDependency(targetForEntity(relationship.fromEntity), targetForEntity(relationship.toEntity));
  }
  for (const table of input.tablePlans) {
    const source = `table:${table.tableId}`;
    for (const column of table.columns) {
      if (!/_id$/iu.test(column.name) || table.primaryKey.includes(column.name)) continue;
      addDependency(source, targetByForeignKey.get(normalizedIdentifier(foreignKeyTargetName(column.name))));
    }
  }

  let sequence = 0;
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  const visit = (nodeId: string) => {
    index.set(nodeId, sequence);
    lowlink.set(nodeId, sequence++);
    stack.push(nodeId);
    onStack.add(nodeId);
    for (const dependency of [...dependencies.get(nodeId)!].sort()) {
      if (!index.has(dependency)) {
        visit(dependency);
        lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, lowlink.get(dependency)!));
      } else if (onStack.has(dependency)) {
        lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, index.get(dependency)!));
      }
    }
    if (lowlink.get(nodeId) !== index.get(nodeId)) return;
    const component: string[] = [];
    for (;;) {
      const member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
      if (member === nodeId) break;
    }
    components.push(component.sort());
  };
  for (const nodeId of [...nodes.keys()].sort()) if (!index.has(nodeId)) visit(nodeId);

  const componentOf = new Map<string, number>();
  components.forEach((component, componentIndex) => component.forEach(nodeId => componentOf.set(nodeId, componentIndex)));
  const componentDependencies = components.map(() => new Set<number>());
  components.forEach((component, componentIndex) => {
    for (const nodeId of component) {
      for (const dependency of dependencies.get(nodeId)!) {
        const dependencyComponent = componentOf.get(dependency)!;
        if (dependencyComponent !== componentIndex) componentDependencies[componentIndex].add(dependencyComponent);
      }
    }
  });
  const levels = new Map<number, number>();
  const levelOf = (componentIndex: number): number => {
    const cached = levels.get(componentIndex);
    if (cached !== undefined) return cached;
    const ownLevel = Math.max(...components[componentIndex].map(nodeId => nodes.get(nodeId)!.baseLevel));
    const dependencyLevel = Math.max(-1, ...[...componentDependencies[componentIndex]].map(dependency => levelOf(dependency) + 1));
    const level = Math.max(ownLevel, dependencyLevel);
    levels.set(componentIndex, level);
    return level;
  };

  const byLevel = new Map<number, SeedPlanningNode[]>();
  components.forEach((component, componentIndex) => {
    const level = levelOf(componentIndex);
    const wave = byLevel.get(level) ?? [];
    wave.push(...component.map(nodeId => nodes.get(nodeId)!));
    byLevel.set(level, wave);
  });
  return [...byLevel.entries()].sort(([left], [right]) => left - right).map(([level, wave]) => ({
    index: level + 1,
    tableIds: wave.filter(node => node.type === 'table').map(node => node.subjectId).sort(),
    mdmEntityIds: wave.filter(node => node.type === 'mdm').map(node => node.subjectId).sort(),
  }));
}

/** Keeps a wave under the output budget by assigning whole dependency components to sequential
 * batches. An SCC is never split, so references inside a planning wave remain valid. */
export function splitSeedPlanningWave(
  input: Pick<SeedBuildInput, 'entities' | 'tablePlans' | 'relationships'>,
  wave: SeedPlanningWave,
  maxTokens = MAX_SEED_WAVE_OUTPUT_TOKENS,
): SeedPlanningWave[] {
  const entities = new Map(input.entities.map(entity => [entity.entityId, entity]));
  const tables = new Map(input.tablePlans.map(table => [table.tableId, table]));
  const targets = [
    ...wave.mdmEntityIds.map(id => ({ type: 'mdm' as const, id })),
    ...wave.tableIds.map(id => ({ type: 'table' as const, id })),
  ].sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
  const estimate = (target: { type: 'mdm' | 'table'; id: string }) => {
    const fields = entities.get(target.id)?.fields.length ?? 0;
    const columns = tables.get(target.id)?.columns.length ?? 0;
    const rows = target.type === 'mdm' ? 4 : 3;
    return Math.max(300, rows * (120 + (fields + columns) * 36));
  };
  const targetKeys = new Set(targets.map(target => `${target.type}:${target.id}`));
  const targetForEntity = (entityId: string) => {
    const type = entities.get(entityId)?.kind === 'mdm' ? 'mdm' : 'table';
    const key = `${type}:${entityId}`;
    return targetKeys.has(key) ? key : undefined;
  };
  const parent = new Map([...targetKeys].map(key => [key, key]));
  const find = (key: string): string => {
    const root = parent.get(key)!;
    if (root === key) return root;
    const resolved = find(root);
    parent.set(key, resolved);
    return resolved;
  };
  const join = (left: string | undefined, right: string | undefined) => {
    if (!left || !right) return;
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };
  for (const relationship of input.relationships ?? []) join(targetForEntity(relationship.fromEntity), targetForEntity(relationship.toEntity));
  const foreignKeyTargets = new Map(targets.map(target => [normalizedIdentifier(target.id), `${target.type}:${target.id}`]));
  for (const table of input.tablePlans) {
    const source = `table:${table.tableId}`;
    if (!targetKeys.has(source)) continue;
    for (const column of table.columns) {
      if (/_id$/iu.test(column.name) && !table.primaryKey.includes(column.name)) {
        join(source, foreignKeyTargets.get(normalizedIdentifier(foreignKeyTargetName(column.name))));
      }
    }
  }
  const components = new Map<string, Array<{ type: 'mdm' | 'table'; id: string }>>();
  for (const target of targets) {
    const root = find(`${target.type}:${target.id}`);
    const component = components.get(root) ?? [];
    component.push(target);
    components.set(root, component);
  }
  const units = [...components.values()].sort((left, right) =>
    `${left[0].type}:${left[0].id}`.localeCompare(`${right[0].type}:${right[0].id}`),
  );
  const batches: Array<Array<{ type: 'mdm' | 'table'; id: string }>> = [];
  let batch: Array<{ type: 'mdm' | 'table'; id: string }> = [];
  let used = 0;
  for (const unit of units) {
    const cost = unit.reduce((total, target) => total + estimate(target), 0);
    if (batch.length && used + cost > maxTokens) {
      batches.push(batch);
      batch = [];
      used = 0;
    }
    batch.push(...unit);
    used += cost;
  }
  if (batch.length) batches.push(batch);
  return batches.map(items => ({
    index: wave.index,
    tableIds: items.filter(item => item.type === 'table').map(item => item.id),
    mdmEntityIds: items.filter(item => item.type === 'mdm').map(item => item.id),
  }));
}

export function estimateSeedPlanningWaveTokens(
  input: Pick<SeedBuildInput, 'entities' | 'tablePlans' | 'relationships'>,
  wave: SeedPlanningWave,
): number {
  return splitSeedPlanningWave(input, wave, Number.MAX_SAFE_INTEGER)
    .flatMap(batch => [...batch.tableIds, ...batch.mdmEntityIds])
    .reduce((total, id) => {
      const entity = input.entities.find(item => item.entityId === id);
      const table = input.tablePlans.find(item => item.tableId === id);
      const rows = entity?.kind === 'mdm' ? 4 : 3;
      return total + Math.max(300, rows * (120 + ((entity?.fields.length ?? 0) + (table?.columns.length ?? 0)) * 36));
    }, 0);
}

/** Selects exactly the L4/table definitions that a wave may create. Rules and relationships are
 * filtered too, so unrelated definitions never inflate the planner context. Coverage of ctx.mdm
 * tags is scoped the same way: a wave cannot seed (or be failed for) a tag whose entity is not
 * in the wave. Full-tag coverage is the merge-final validator's job. */
export function seedPlanInputForWave(input: Omit<SeedBuildInput, 'plan'>, wave: SeedPlanningWave): Omit<SeedBuildInput, 'plan'> {
  const targetIds = new Set([...wave.tableIds, ...wave.mdmEntityIds]);
  const tableIds = new Set(wave.tableIds);
  const entities = input.entities.filter(entity => targetIds.has(entity.entityId));
  const rules = input.rules?.filter(rule => !rule.appliesTo.length || rule.appliesTo.some(id => targetIds.has(id)));
  const mdmRequiredTags = (input.mdmRequiredTags ?? []).filter(tag => {
    const entityId = entityIdFromMdmTag(tag, input.moduleName);
    return !!entityId && targetIds.has(entityId);
  });
  return {
    ...input,
    entities,
    tablePlans: input.tablePlans.filter(table => tableIds.has(table.tableId)),
    relationships: (input.relationships ?? []).filter(rel => targetIds.has(rel.fromEntity) || targetIds.has(rel.toEntity)),
    rules,
    ruleIds: (rules ?? []).map(rule => rule.ruleId),
    mdmRequiredTags,
  };
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isSeedReference(value: unknown): value is SeedReference {
  return isRecord(value) && typeof value.ref === 'string' && Object.keys(value).length === 1;
}

export function isSeedAssetRef(value: unknown): value is SeedAssetRef {
  return isRecord(value) && value.kind === 'image' && typeof value.asset === 'string'
    && Object.keys(value).length === 2;
}

function isSeedValue(value: unknown): value is SeedValue {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    || isSeedReference(value) || isSeedAssetRef(value);
}

function parseFields(value: unknown): SeedFieldValue[] {
  return arrayValue(value).map((item): SeedFieldValue => {
    const record = isRecord(item) ? item : {};
    return { name: stringValue(record.name), value: isSeedValue(record.value) ? record.value : '' };
  });
}

function parseChildren(value: unknown): SeedChildCollection[] {
  return arrayValue(value).map((item): SeedChildCollection => {
    const record = isRecord(item) ? item : {};
    return {
      name: stringValue(record.name),
      rows: arrayValue(record.rows).map((row): SeedChildRow => {
        const parsed = isRecord(row) ? row : {};
        return { key: stringValue(parsed.key), fields: parseFields(parsed.fields) };
      }),
    };
  });
}

function parsePlanRows(value: unknown): SeedLocalRow[] {
  return arrayValue(value).map((item): SeedLocalRow => {
    const record = isRecord(item) ? item : {};
    return {
      key: stringValue(record.key),
      columns: parseFields(record.columns),
      details: parseFields(record.details),
      children: parseChildren(record.children),
    };
  });
}

/** Turns a tool-call result into a defensive internal representation. Validation below remains the
 * authority: malformed values become empty and produce objective findings instead of being trusted. */
/**
 * Drop columns the compiler already owns, so a planner that echoes them does not fail the wave.
 *
 * The prompt says PKs are compiled from tableId+row key and the JSONB envelope is `row.details`,
 * never a `columns` entry. Repair waves still put `"name":"pet_id","value":null` and
 * `"name":"details","value":null` in `columns` — which `validateSeedPlan` reports as
 * `unknown persistence column` and then skips the rest of the module (petShop wave 3: Pet /
 * ScheduleBlock / InstitutionalPresentation generated, then discarded). Stripping those names is
 * the legitimate path; unknown *other* columns stay fatal.
 */
/** `petShop.BusinessHours` (the ctx.mdm tag) → `BusinessHours` (the entity id). */
export function stripModuleEntityPrefix(id: string, moduleName: string): string {
  const prefix = moduleName ? `${moduleName}.` : '';
  return prefix && id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

export function normalizeSeedPlan(plan: SeedPlan, tablePlans: Iterable<SeedTableDefinition> = [], moduleName = ''): SeedPlan {
  const tableById = new Map([...tablePlans].map(table => [table.tableId, table]));
  return {
    summary: plan.summary,
    mdmEntities: plan.mdmEntities.map(entity => ({ ...entity, entityId: stripModuleEntityPrefix(entity.entityId, moduleName) })),
    localTables: plan.localTables.map((table) => {
      const definition = tableById.get(table.tableId);
      const envelope = definition ? detailsColumnOf(definition) : 'details';
      const generated = new Set(definition?.primaryKey ?? []);
      if (envelope) generated.add(envelope);
      else generated.add('details');
      return {
        ...table,
        rows: table.rows.map(row => ({
          ...row,
          columns: row.columns.filter(field => !generated.has(field.name)),
        })),
      };
    }),
  };
}

export function parseSeedPlan(value: unknown): SeedPlan {
  const record = isRecord(value) ? value : {};
  return {
    summary: stringValue(record.summary),
    localTables: arrayValue(record.localTables).map((item): SeedLocalTable => {
      const parsed = isRecord(item) ? item : {};
      return { tableId: stringValue(parsed.tableId), rows: parsePlanRows(parsed.rows) };
    }),
    mdmEntities: arrayValue(record.mdmEntities).map((item): SeedMdmEntity => {
      const parsed = isRecord(item) ? item : {};
      return {
        entityId: stringValue(parsed.entityId),
        rows: arrayValue(parsed.rows).map((row): SeedMdmRow => {
          const rowRecord = isRecord(row) ? row : {};
          return {
            key: stringValue(rowRecord.key),
            fields: parseFields(rowRecord.fields),
            relationships: arrayValue(rowRecord.relationships).map((relationship): SeedMdmRelationship => {
              const relationshipRecord = isRecord(relationship) ? relationship : {};
              return {
                targetRef: stringValue(relationshipRecord.targetRef),
                type: stringValue(relationshipRecord.type),
                metadata: parseFields(relationshipRecord.metadata),
                isBidirectional: relationshipRecord.isBidirectional === true,
              };
            }),
          };
        }),
      };
    }),
  };
}

/** Reads the persisted plan embedded in seeds.ts. A valid plan is reused so materializing the same
 * L4/table input never asks the model for a different fixture mass. */
export function extractSeedPlanFromSource(source: string): SeedPlan | null {
  const progress = extractSeedPlanProgressFromSource(source);
  return progress && !progress.partial ? progress.plan : null;
}

function progressFromEnvelope(envelope: UnknownRecord): SeedPlanProgress | null {
  const planSource = isRecord(envelope.plan) ? envelope.plan : isRecord(envelope.data) && isRecord(envelope.data.plan) ? envelope.data.plan : null;
  if (!planSource) return null;
  const flags = isRecord(envelope.data) ? envelope.data : envelope;
  return {
    plan: parseSeedPlan(planSource),
    partial: flags.partial === true,
    completedWaveIndexes: arrayValue(flags.completedWaveIndexes)
      .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
      .sort((left, right) => left - right),
  };
}

/** Reads either a completed or interrupted seed run from the persisted envelope (seeds.ts comment or seeds.defs.ts). */
export function extractSeedPlanProgressFromSource(source: string): SeedPlanProgress | null {
  const start = source.indexOf(SEED_PLAN_START);
  const end = source.indexOf(SEED_PLAN_END);
  if (start !== -1 && end > start) {
    try {
      const raw = source.slice(start + SEED_PLAN_START.length, end).trim();
      const envelope = JSON.parse(raw) as UnknownRecord;
      if (isRecord(envelope)) return progressFromEnvelope(envelope);
    } catch { /* fall through to defs artifact */ }
  }
  const parsed = extractFirstConstObject(source);
  return parsed ? progressFromEnvelope(parsed) : null;
}

function extractFirstConstObject(source: string): UnknownRecord | null {
  const marker = source.match(/export\s+const\s+\w+\s*=/u);
  if (!marker || marker.index === undefined) return null;
  const eq = source.indexOf('=', marker.index);
  if (eq < 0) return null;
  let open = eq + 1;
  while (open < source.length && /\s/.test(source[open])) open += 1;
  if (source[open] !== '{') return null;
  let depth = 0;
  let i = open;
  let inStr = false;
  let strCh = '';
  for (; i < source.length; i += 1) {
    const char = source[i];
    if (inStr) {
      if (char === '\\') { i += 1; continue; }
      if (char === strCh) inStr = false;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { inStr = true; strCh = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) { i += 1; break; }
    }
  }
  try {
    const value = JSON.parse(source.slice(open, i)) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/** Reads the published seed coverage (targets intentionally left with no rows) back from a generated
 * seeds.ts. Returns null when the artifact declares nothing skipped — i.e. full coverage. Consumers
 * (register -> l5 config, and any test generator) use this instead of inferring from missing exports. */
export function extractSeedSkippedFromSource(source: string): SeedSkippedTargets | null {
  const start = source.indexOf(SEED_PLAN_START);
  const end = source.indexOf(SEED_PLAN_END);
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const envelope = JSON.parse(source.slice(start + SEED_PLAN_START.length, end).trim()) as UnknownRecord;
    const skipped = envelope.skipped;
    if (!isRecord(skipped)) return null;
    const ids = (value: unknown) => arrayValue(value).filter((item): item is string => typeof item === 'string' && !!item).sort();
    const tables = ids(skipped.tables);
    const mdmEntities = ids(skipped.mdmEntities);
    if (!tables.length && !mdmEntities.length) return null;
    const attempts = parseSeedAttemptRecords(skipped.attempts).map(({ attempt, errors }) => ({ attempt, errors }));
    return { tables, mdmEntities, reason: stringValue(skipped.reason), ...(attempts.length ? { attempts } : {}) };
  } catch {
    return null;
  }
}

export function parseSeedAttemptRecords(value: unknown): SeedAttemptRecord[] {
  if (!Array.isArray(value)) return [];
  const out: SeedAttemptRecord[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const attempt = typeof item.attempt === 'number' && Number.isInteger(item.attempt) && item.attempt > 0 ? item.attempt : 0;
    if (!attempt) continue;
    const errors = Array.isArray(item.errors) ? item.errors.filter((entry): entry is string => typeof entry === 'string') : [];
    out.push({ attempt, plan: parseSeedPlan(item.plan), errors });
  }
  return out;
}

function seedErrorPath(error: string): string {
  const cut = error.indexOf(': ');
  return cut === -1 ? error : error.slice(0, cut);
}

function seedErrorMissingField(error: string): { rowPath: string; field: string } | null {
  const field = /required field '([^']+)' missing/u.exec(error)?.[1];
  return field ? { rowPath: seedErrorPath(error), field } : null;
}

function seedRowIsFatal(errors: string[], rowPath: string): boolean {
  return errors.some(error => seedErrorPath(error) === rowPath
    && /key must be a stable identifier|duplicate key|unknown tableId|unknown or non-MDM entity/u.test(error));
}

function seedErrorsTouchField(errors: string[], rowPath: string, fieldName: string): boolean {
  const snake = toSnake(fieldName);
  const paths = new Set([
    `${rowPath}.${fieldName}`,
    `${rowPath}.columns.${fieldName}`,
    `${rowPath}.columns.${snake}`,
    `${rowPath}.details.${fieldName}`,
    `${rowPath}.fields.${fieldName}`,
  ]);
  return errors.some((error) => {
    if (paths.has(seedErrorPath(error))) return true;
    const missing = seedErrorMissingField(error);
    return !!missing && missing.rowPath === rowPath && missing.field === fieldName;
  });
}

function normalizeSeedRowKey(key: string): string {
  return key.replace(/[^A-Za-z0-9_-]+/gu, '_').replace(/^_+|_+$/gu, '');
}

function indexSeedRows<T extends { key: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(row.key, row);
    const normalized = normalizeSeedRowKey(row.key);
    if (normalized && !map.has(normalized)) map.set(normalized, row);
  }
  return map;
}

function recoverSeedFields(
  prior: SeedFieldValue[],
  next: SeedFieldValue[],
  priorRowPath: string,
  nextRowPath: string,
  priorErrors: string[],
  nextErrors: string[],
): SeedFieldValue[] {
  const priorBy = new Map(prior.map(field => [field.name, field]));
  const nextBy = new Map(next.map(field => [field.name, field]));
  const names = [...new Set([...priorBy.keys(), ...nextBy.keys()])];
  const out: SeedFieldValue[] = [];
  for (const name of names) {
    const fromPrior = priorBy.get(name);
    const fromNext = nextBy.get(name);
    const priorOk = !!fromPrior && !seedErrorsTouchField(priorErrors, priorRowPath, name);
    const nextBad = !fromNext || seedErrorsTouchField(nextErrors, nextRowPath, name);
    if (priorOk && nextBad) out.push(fromPrior!);
    else if (fromNext) out.push(fromNext);
    else if (priorOk) out.push(fromPrior!);
  }
  return out;
}

function recoverLocalRows(
  priorRows: SeedLocalRow[],
  nextRows: SeedLocalRow[],
  tablePath: string,
  priorErrors: string[],
  nextErrors: string[],
): SeedLocalRow[] {
  const priorBy = indexSeedRows(priorRows);
  const seen = new Set<string>();
  const out: SeedLocalRow[] = [];
  for (const next of nextRows) {
    const prior = priorBy.get(next.key) ?? priorBy.get(normalizeSeedRowKey(next.key));
    seen.add(next.key);
    if (prior) seen.add(prior.key);
    if (!prior) { out.push(next); continue; }
    const priorPath = `${tablePath}.${prior.key}`;
    const nextPath = `${tablePath}.${next.key}`;
    out.push({
      key: seedRowIsFatal(nextErrors, nextPath) && !seedRowIsFatal(priorErrors, priorPath) ? prior.key : next.key,
      columns: recoverSeedFields(prior.columns, next.columns, priorPath, nextPath, priorErrors, nextErrors),
      details: recoverSeedFields(prior.details, next.details, priorPath, nextPath, priorErrors, nextErrors),
      children: next.children.length || seedRowIsFatal(priorErrors, priorPath) ? next.children : prior.children,
    });
  }
  for (const prior of priorRows) {
    if (seen.has(prior.key) || seen.has(normalizeSeedRowKey(prior.key))) continue;
    if (seedRowIsFatal(priorErrors, `${tablePath}.${prior.key}`)) continue;
    out.push(prior);
  }
  return out;
}

function recoverMdmRows(
  priorRows: SeedMdmRow[],
  nextRows: SeedMdmRow[],
  entityPath: string,
  priorErrors: string[],
  nextErrors: string[],
): SeedMdmRow[] {
  const priorBy = indexSeedRows(priorRows);
  const seen = new Set<string>();
  const out: SeedMdmRow[] = [];
  for (const next of nextRows) {
    const prior = priorBy.get(next.key) ?? priorBy.get(normalizeSeedRowKey(next.key));
    seen.add(next.key);
    if (prior) seen.add(prior.key);
    if (!prior) { out.push(next); continue; }
    const priorPath = `${entityPath}.${prior.key}`;
    const nextPath = `${entityPath}.${next.key}`;
    out.push({
      key: next.key,
      fields: recoverSeedFields(prior.fields, next.fields, priorPath, nextPath, priorErrors, nextErrors),
      relationships: next.relationships.length || seedRowIsFatal(priorErrors, priorPath)
        ? next.relationships
        : prior.relationships,
    });
  }
  for (const prior of priorRows) {
    if (seen.has(prior.key) || seen.has(normalizeSeedRowKey(prior.key))) continue;
    if (seedRowIsFatal(priorErrors, `${entityPath}.${prior.key}`)) continue;
    out.push(prior);
  }
  return out;
}

/**
 * A repair must not regress a field that already validated. Take the newer plan as the skeleton
 * (keys, extra rows) and restore any prior value that was valid when the newer one is missing or
 * invalid. Row keys that only differ by whitespace (`pet thor` vs `pet_thor`) match so a repair
 * that fixed the key does not drop the fields that were already good.
 */
export function recoverSeedPlanFromPrior(
  prior: SeedPlan,
  next: SeedPlan,
  priorErrors: string[],
  nextErrors: string[],
): SeedPlan {
  const priorTables = new Map(prior.localTables.map(table => [table.tableId, table]));
  const nextTables = new Map(next.localTables.map(table => [table.tableId, table]));
  const localTables: SeedLocalTable[] = [];
  for (const id of new Set([...nextTables.keys(), ...priorTables.keys()])) {
    const fromPrior = priorTables.get(id);
    const fromNext = nextTables.get(id);
    if (!fromNext) { if (fromPrior) localTables.push(fromPrior); continue; }
    if (!fromPrior) { localTables.push(fromNext); continue; }
    localTables.push({
      tableId: id,
      rows: recoverLocalRows(fromPrior.rows, fromNext.rows, `localTables.${id}`, priorErrors, nextErrors),
    });
  }
  const priorMdm = new Map(prior.mdmEntities.map(entity => [entity.entityId, entity]));
  const nextMdm = new Map(next.mdmEntities.map(entity => [entity.entityId, entity]));
  const mdmEntities: SeedMdmEntity[] = [];
  for (const id of new Set([...nextMdm.keys(), ...priorMdm.keys()])) {
    const fromPrior = priorMdm.get(id);
    const fromNext = nextMdm.get(id);
    if (!fromNext) { if (fromPrior) mdmEntities.push(fromPrior); continue; }
    if (!fromPrior) { mdmEntities.push(fromNext); continue; }
    mdmEntities.push({
      entityId: id,
      rows: recoverMdmRows(fromPrior.rows, fromNext.rows, `mdmEntities.${id}`, priorErrors, nextErrors),
    });
  }
  return { summary: next.summary.trim() || prior.summary, localTables, mdmEntities };
}

export function formatSeedGiveUpReason(waveIndex: number, attempts: SeedAttemptRecord[], maxAttempts: number): string {
  const parts = attempts.map(entry =>
    `attempt ${entry.attempt}: ${entry.errors.slice(0, 8).join('; ') || '(no violations recorded)'}`);
  return `seed wave ${waveIndex} did not converge after ${attempts.length}/${maxAttempts} attempts. ${parts.join('. ')}`;
}

/** Prefer a fully valid attempt; otherwise recover valid fields forward from earlier tries. The
 * recovered plan is used only when it validates — a still-invalid plan must not be planted. */
export function selectSeedPlanAfterAttempts(
  attempts: SeedAttemptRecord[],
  validate: (plan: SeedPlan) => string[],
): { plan: SeedPlan; errors: string[] } {
  if (!attempts.length) return { plan: { summary: '', localTables: [], mdmEntities: [] }, errors: ['no seed attempts'] };
  const clean = [...attempts].reverse().find(entry => entry.errors.length === 0);
  if (clean) return { plan: clean.plan, errors: [] };
  let recovered = attempts[0].plan;
  let recoveredErrors = attempts[0].errors;
  for (let i = 1; i < attempts.length; i++) {
    recovered = recoverSeedPlanFromPrior(recovered, attempts[i].plan, recoveredErrors, attempts[i].errors);
    recoveredErrors = validate(recovered);
  }
  return { plan: recovered, errors: recoveredErrors };
}

/** A partial seeds.ts remains valid TypeScript so an interrupted flow can be resumed without
 * re-planning completed waves. It intentionally exports no runtime rows until final compilation. */
export function buildPartialSeedSource(
  input: Pick<SeedBuildInput, 'project' | 'moduleName' | 'language'>,
  progress: Pick<SeedPlanProgress, 'plan' | 'completedWaveIndexes'>,
): string {
  const envelope = {
    version: 1,
    moduleName: input.moduleName,
    language: input.language,
    partial: true,
    completedWaveIndexes: [...new Set(progress.completedWaveIndexes)].sort((left, right) => left - right),
    plan: progress.plan,
  };
  return [
    `/// <mls fileReference="_${input.project}_/l1/${input.moduleName}/layer_1_external/adapters/persistence/seeds.ts" enhancement="_blank"/>`,
    '',
    '// Partial deterministic seed plan. agentCbSeeds resumes it before this module is registered.',
    SEED_PLAN_START,
    JSON.stringify(envelope, null, 2),
    SEED_PLAN_END,
    '',
    'export {};',
    '',
  ].join('\n');
}

export function mergeSeedPlans(current: SeedPlan, next: SeedPlan): SeedPlan {
  const merge = <T extends { tableId?: string; entityId?: string }>(items: T[], additions: T[], key: 'tableId' | 'entityId') => {
    const byId = new Map(items.map(item => [String(item[key] || ''), item]));
    for (const item of additions) byId.set(String(item[key] || ''), item);
    return [...byId.values()].sort((left, right) => String(left[key] || '').localeCompare(String(right[key] || '')));
  };
  return {
    summary: next.summary.trim() || current.summary,
    localTables: merge(current.localTables, next.localTables, 'tableId'),
    mdmEntities: merge(current.mdmEntities, next.mdmEntities, 'entityId'),
  };
}

export function seedReferenceCatalog(plan: SeedPlan): SeedReferenceCatalogItem[] {
  const labelOf = (fields: SeedFieldValue[], fallback: string) => {
    const readable = fields.find(field => field.name === 'name' || field.name === 'label');
    return typeof readable?.value === 'string' && readable.value.trim() ? readable.value : fallback;
  };
  return [
    ...plan.localTables.flatMap(table => table.rows.map(row => ({
      ref: `local:${table.tableId}.${row.key}`,
      label: labelOf(row.details, row.key),
      context: `local row in ${table.tableId}`,
    }))),
    ...plan.mdmEntities.flatMap(entity => entity.rows.map(row => ({
      ref: `mdm:${entity.entityId}.${row.key}`,
      label: labelOf(row.fields, row.key),
      context: `MDM ${entity.entityId}`,
    }))),
  ].sort((left, right) => left.ref.localeCompare(right.ref));
}

function toSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function toCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_all, char: string) => char.toUpperCase());
}

function hashHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableUuid(input: string): string {
  const parts = Array.from({ length: 5 }, (_, index) => hashHex(`${input}:${index}`)).join('');
  return `${parts.slice(0, 8)}-${parts.slice(8, 12)}-4${parts.slice(13, 16)}-8${parts.slice(17, 20)}-${parts.slice(20, 32)}`;
}

function entityIdField(entity: SeedEntityDefinition): string {
  return entity.fields.find(field => field.fieldId.toLowerCase() === `${entity.entityId.toLowerCase()}id`)?.fieldId || `${entity.entityId.charAt(0).toLowerCase()}${entity.entityId.slice(1)}Id`;
}

/** Named anchor for a seeded row (`petitionPublished`). Stable across runs for a given entity+key. */
export function seedAnchorName(entityId: string, rowKey: string): string {
  const entity = entityId.charAt(0).toLowerCase() + entityId.slice(1);
  const parts = rowKey.split(/[^A-Za-z0-9]+/g).filter(Boolean);
  const camel = parts.map((part, index) => {
    const body = part.charAt(0).toUpperCase() + part.slice(1);
    return index === 0 ? part.charAt(0).toLowerCase() + part.slice(1) : body;
  }).join('');
  if (!camel) return entity;
  if (camel.toLowerCase().startsWith(entity.toLowerCase())) return camel.charAt(0).toLowerCase() + camel.slice(1);
  return entity + camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** Bare `string` (not a literal union). Wrapping anything else with seedStringPassing is a type error. */
export function seedFieldIsBareString(field: Pick<SeedFieldDefinition, 'type' | 'enumValues'>): boolean {
  return field.type === 'string' && !(field.enumValues?.length);
}

function seedTsIdent(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value);
}

/** Declared TypeScript type of a field on the generated entity, when it can be read. */
function seedDeclaredFieldType(entitySource: string, fieldId: string): string | undefined {
  if (!seedTsIdent(fieldId)) return undefined;
  const match = new RegExp(`(?:^|\\n)\\s*${fieldId}\\??\\s*:\\s*([^;\\n]+)`, 'u').exec(entitySource);
  return match ? match[1].trim().replace(/\s+/g, ' ') : undefined;
}

/** First-parameter type of `export function name(...)`, when it can be read. */
function seedValidatorParamType(entitySource: string, exportName: string): string | undefined {
  if (!seedTsIdent(exportName)) return undefined;
  const match = new RegExp(
    `export\\s+function\\s+${exportName}\\s*\\(\\s*[A-Za-z_][A-Za-z0-9_]*\\s*:\\s*([^,\\)]+)`,
    'u',
  ).exec(entitySource);
  return match ? match[1].trim().replace(/\s+/g, ' ') : undefined;
}

/**
 * Domain export that judges a field, only when wrapping it is type-safe: the field is a bare `string`
 * and the function accepts `string`. A literal union is already checked by tsc — wrapping it yields
 * TS2322 (returns `string`) and TS2345 (type-guard param is the union, not `string`). In doubt, skip.
 */
export function findSeedFieldValidatorExport(
  entitySource: string,
  fieldId: string,
  ruleIds: string[] = [],
  field?: Pick<SeedFieldDefinition, 'type' | 'enumValues'>,
): string | undefined {
  if (field && !seedFieldIsBareString(field)) return undefined;
  const declared = seedDeclaredFieldType(entitySource, fieldId);
  if (declared !== undefined && declared !== 'string') return undefined;
  const exported: string[] = [];
  const re = /export\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(entitySource))) exported.push(match[1]);
  const needle = (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  const fieldNeedle = needle(fieldId);
  const byField = exported.filter(name => fieldNeedle && needle(name).includes(fieldNeedle));
  const ruleNeedles = ruleIds.map(needle).filter(Boolean);
  const byRule = exported.filter(name => ruleNeedles.some(rule => needle(name).includes(rule)));
  const name = byField.length
    ? [...byField].sort((left, right) => left.length - right.length)[0]
    : byRule.length ? [...byRule].sort((left, right) => left.length - right.length)[0] : undefined;
  if (!name) return undefined;
  // Unparsed signature = in doubt = do not wrap.
  if (seedValidatorParamType(entitySource, name) !== 'string') return undefined;
  return name;
}

/** Bounded deterministic search: vary trailing digits until `check` accepts, else keep the planned value. */
export function seedStringPassing(check: (value: string) => boolean, planned: string, attempts = SEED_VALIDATOR_ATTEMPTS): string {
  if (check(planned)) return planned;
  const match = planned.match(/^(.*?)(\d+)$/u);
  const prefix = match ? match[1] : planned;
  const width = match ? match[2].length : 0;
  const start = match ? Number.parseInt(match[2], 10) : 0;
  if (match && !Number.isFinite(start)) return planned;
  for (let i = 1; i <= attempts; i += 1) {
    const candidate = match ? prefix + String(start + i).padStart(width, '0') : planned + String(i);
    if (check(candidate)) return candidate;
  }
  return planned;
}

/**
 * Leftover values that pass the same search as `seedStringPassing` and are not in `used` (the seeded
 * rows). Create-command tests consume these so they do not collide with a unique seeded value.
 * `check` is the domain validator when there is one; otherwise every unused candidate is accepted.
 */
export function seedSparesPassing(
  check: (value: string) => boolean,
  planned: string,
  used: readonly string[],
  count = SEED_SPARES_PER_FIELD,
  attempts = SEED_VALIDATOR_ATTEMPTS,
): string[] {
  const spares: string[] = [];
  const taken = new Set(used);
  const match = planned.match(/^(.*?)(\d+)$/u);
  const prefix = match ? match[1] : planned;
  const width = match ? match[2].length : 0;
  const start = match ? Number.parseInt(match[2], 10) : 0;
  if (match && !Number.isFinite(start)) return spares;
  const budget = Math.max(attempts, count * SEED_VALIDATOR_ATTEMPTS);
  for (let i = 1; i <= budget && spares.length < count; i += 1) {
    const candidate = match ? prefix + String(start + i).padStart(width, '0') : planned + String(i);
    if (taken.has(candidate) || !check(candidate)) continue;
    taken.add(candidate);
    spares.push(candidate);
  }
  return spares;
}

const SEED_STRING_PASSING_HELPER = `function seedStringPassing(check: (value: string) => boolean, planned: string, attempts = ${SEED_VALIDATOR_ATTEMPTS}): string {
  if (check(planned)) return planned;
  const match = planned.match(/^(.*?)(\\d+)$/u);
  const prefix = match ? match[1] : planned;
  const width = match ? match[2].length : 0;
  const start = match ? Number.parseInt(match[2], 10) : 0;
  if (match && !Number.isFinite(start)) return planned;
  for (let i = 1; i <= attempts; i += 1) {
    const candidate = match ? prefix + String(start + i).padStart(width, '0') : planned + String(i);
    if (check(candidate)) return candidate;
  }
  seedValidatorWarnings.push('kept planned value after ' + String(attempts) + ' attempts');
  return planned;
}`;

const SEED_SPARES_PASSING_HELPER = `function seedSparesPassing(check: (value: string) => boolean, planned: string, used: readonly string[], count = ${SEED_SPARES_PER_FIELD}, attempts = ${SEED_VALIDATOR_ATTEMPTS}): string[] {
  const spares: string[] = [];
  const taken = new Set(used);
  const match = planned.match(/^(.*?)(\\d+)$/u);
  const prefix = match ? match[1] : planned;
  const width = match ? match[2].length : 0;
  const start = match ? Number.parseInt(match[2], 10) : 0;
  if (match && !Number.isFinite(start)) return spares;
  const budget = Math.max(attempts, count * ${SEED_VALIDATOR_ATTEMPTS});
  for (let i = 1; i <= budget && spares.length < count; i += 1) {
    const candidate = match ? prefix + String(start + i).padStart(width, '0') : planned + String(i);
    if (taken.has(candidate) || !check(candidate)) continue;
    taken.add(candidate);
    spares.push(candidate);
  }
  return spares;
}`;

export function seedSourcePurityErrors(source: string): string[] {
  const errors: string[] = [];
  if (/\bDate\.now\s*\(/u.test(source)) errors.push('seed source must be deterministic: Date.now is forbidden');
  if (/\bMath\.random\s*\(/u.test(source)) errors.push('seed source must be deterministic: Math.random is forbidden');
  return errors;
}

export function buildSeedDefsData(
  input: SeedBuildInput,
  extra?: { partial?: boolean; completedWaveIndexes?: number[] },
): Record<string, unknown> {
  return {
    version: 1,
    language: input.language,
    ...(input.skipped && (input.skipped.tables.length || input.skipped.mdmEntities.length) ? { skipped: input.skipped } : {}),
    ...(extra?.partial === true ? {
      partial: true,
      completedWaveIndexes: [...new Set(extra.completedWaveIndexes ?? [])].sort((left, right) => left - right),
    } : {}),
    plan: input.plan,
  };
}

/**
 * The 102034 `MdmSubtype` union is CLOSED (Person | Company | Product | Service | Location | Asset* |
 * Animal | BankAccount | Document | ContactChannel), so every module entity that lands in MDM has to be
 * mapped onto one of them. The heuristic is shared with the usecase generator (the write path passes the
 * same subtype `ctx.mdm.entity.create` expects) so a seeded row and a runtime-created row of the same
 * entity never disagree. Its limit is real and recorded in ajustes_ns4.md: an entity with no natural
 * subtype (a construction project) falls back to 'Product'.
 */
export function mdmSubtypeFor(entityId: string): string {
  const lower = entityId.toLowerCase();
  if (lower.includes('table') || lower.includes('location') || lower.includes('room')) return 'Location';
  if (lower.includes('customer') || lower.includes('person') || lower.includes('user')) return 'Person';
  if (lower.includes('company') || lower.includes('supplier') || lower.includes('vendor')) return 'Company';
  if (lower.includes('service')) return 'Service';
  if (lower.includes('asset') || lower.includes('equipment')) return 'AssetEquipment';
  return 'Product';
}

function countryCodeForLanguage(language: string): string {
  return language.toLowerCase().startsWith('pt') ? 'BR' : 'US';
}

function mapFields(fields: SeedFieldValue[], path: string, errors: string[]): Map<string, SeedValue> {
  const mapped = new Map<string, SeedValue>();
  for (const field of fields) {
    if (!field.name) {
      errors.push(`${path}: field name is required`);
      continue;
    }
    if (mapped.has(field.name)) {
      errors.push(`${path}: duplicated field '${field.name}'`);
      continue;
    }
    if (!isSeedValue(field.value)) {
      errors.push(`${path}.${field.name}: value must be a scalar, null, { ref }, or { asset, kind: 'image' }`);
      continue;
    }
    mapped.set(field.name, field.value);
  }
  return mapped;
}

// How many platform-user identities to synthesize per actor. A small pool lets a scenario assign a
// few distinct people (e.g. several field workers) without the planner declaring or the compiler
// hardcoding any of them.
const ACTOR_IDENTITY_COUNT = 3;

interface ActorIdentity {
  actorId: string;
  key: string;
  ref: string;
  name: string;
  mdmId: string;
}

/** Deterministic platform-user identity pool derived from the L4 actors. Single source of truth for
 * the reference set, the id map and the emitted MDM Person records, so `actor:<actorId>.<key>`
 * references always resolve to a real MDM identity. */
function actorIdentities(input: Pick<SeedBuildInput, 'moduleName' | 'actors'>): ActorIdentity[] {
  const identities: ActorIdentity[] = [];
  for (const actor of input.actors ?? []) {
    if (!actor.actorId.trim()) continue;
    for (let index = 1; index <= ACTOR_IDENTITY_COUNT; index++) {
      const key = `u${index}`;
      identities.push({
        actorId: actor.actorId,
        key,
        ref: `actor:${actor.actorId}.${key}`,
        name: `${actor.title || actor.actorId} ${index}`,
        mdmId: stableUuid(`${input.moduleName}:actor:${actor.actorId}:${key}`),
      });
    }
  }
  return identities;
}

function collectReferences(plan: SeedPlan): Set<string> {
  const refs = new Set<string>();
  for (const table of plan.localTables) {
    for (const row of table.rows) refs.add(`local:${table.tableId}.${row.key}`);
  }
  for (const entity of plan.mdmEntities) {
    for (const row of entity.rows) refs.add(`mdm:${entity.entityId}.${row.key}`);
  }
  return refs;
}

function validateReference(value: SeedValue, path: string, references: Set<string>, errors: string[]) {
  if (!isSeedReference(value)) return;
  if (!/^(local|mdm|actor):[A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_-]*$/u.test(value.ref)) {
    errors.push(`${path}: reference '${value.ref}' must use local:Entity.key, mdm:Entity.key or actor:ActorId.key`);
  } else if (!references.has(value.ref)) {
    errors.push(`${path}: unresolved reference '${value.ref}'`);
  }
}

/**
 * A `{ ref }` is only legitimate on a foreign key. `weeklySchedule: { ref: "local:BusinessHours.x" }`
 * was compiled to the row's own uuid (be5 qryListBusinessHours). Auto-reference is always an error.
 */
export function fieldAllowsSeedRef(fieldName: string, knownEntityIds: Iterable<string>): boolean {
  const camel = toCamel(fieldName);
  // Suffix *Id / *_id names a key. Whether it MUST be a ref is idFieldHasResolvableTarget;
  // whether it MAY be a ref is the suffix (weeklySchedule is neither).
  if (fieldName.endsWith('_id') || /Id$/u.test(camel)) return true;
  return idFieldHasResolvableTarget(fieldName, knownEntityIds);
}

function validateSeedRefPlacement(
  value: SeedValue,
  path: string,
  fieldName: string,
  rowRef: string,
  knownEntityIds: Iterable<string>,
  errors: string[],
): void {
  if (!isSeedReference(value)) return;
  if (value.ref === rowRef) {
    errors.push(`${path}: self-reference '${value.ref}' is forbidden — a field cannot point at its own row`);
  }
  if (!fieldAllowsSeedRef(fieldName, knownEntityIds)) {
    errors.push(`${path}: { ref } is only valid on a foreign-key field (*Id / *_id); '${fieldName}' is not a key`);
  }
}

function validateEnum(field: SeedFieldDefinition | undefined, value: SeedValue | undefined, path: string, errors: string[]) {
  // null is a cleared/absent optional value (e.g. a not-yet-set enum on an in-progress row); the
  // required check below enforces presence separately, so an optional enum may be null.
  // `enumValues` is optional-chained: a field object built anywhere but agentCbSeeds' mapper may omit
  // it, and a THROW inside the validator would abort the whole seed gate instead of reporting findings.
  if (!field?.enumValues?.length || value === undefined || value === null) return;
  if (isSeedAssetRef(value)) return;
  if (isSeedReference(value) || typeof value !== 'string' || !field.enumValues.includes(value)) {
    errors.push(`${path}: expected one of ${field.enumValues.join(', ')}`);
  }
}

function isImageOrUrlField(field: SeedFieldDefinition | undefined): boolean {
  if (!field || /Id$/u.test(field.fieldId)) return false;
  return /(?:image|photo|avatar|thumbnail|cover).*(?:url|uri)?$/iu.test(field.fieldId)
    || /(?:image|url|uri)/iu.test(field.type);
}

function validateAssetReference(value: SeedValue | undefined, field: SeedFieldDefinition | undefined, path: string, errors: string[]) {
  if (!isSeedAssetRef(value)) return;
  if (!/^[A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*$/u.test(value.asset)) {
    errors.push(`${path}: asset must use EntityId/seedKey`);
  }
  if (!isImageOrUrlField(field)) {
    errors.push(`${path}: seed asset references are allowed only in declared image or URL fields`);
  }
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;

/** A `…Date` field is a CALENDAR DATE; a `…At` field is an INSTANT.
 *
 * The validator used to demand a full ISO datetime for both (`/(At|Date)$/`), so a planner that wrote
 * `"2026-07-03"` for `workDate`/`dueDate`/`issueDate`/`plannedStartDate`/`shiftDate` was rejected — 16 of
 * the 19 findings that burned both repair attempts in 102045/buildFlowFsm, and the same failure that
 * killed wave 2 of cafeFlow run14. The planner was RIGHT: generated usecases compare these fields as
 * plain `YYYY-MM-DD` strings (e.g. `shift.shiftDate >= periodStart` built from `iso.slice(0, 10)`), so a
 * datetime stored there silently breaks same-day comparisons. Date-only is therefore ACCEPTED for a
 * `…Date` field; `…At` stays strict, because an instant with no time is a different kind of wrong. */
export function isDateOnlyField(fieldName: string): boolean {
  return /Date$/u.test(fieldName) && !/At$/u.test(fieldName);
}

function windowOf(input: SeedBuildInput): SeedTimeWindow {
  return input.timeWindow ?? { start: SEED_WINDOW_START, end: SEED_WINDOW_END };
}

// Timestamps stay deterministic (a fixed, bounded window) without collapsing the scenario onto two
// instants: any ISO 8601 UTC value inside the window is accepted, so a plan can model a coherent
// multi-step timeline. Domain rule conformance (status flows, etc.) is NOT enforced here — it is
// guided by the L4 rule text in the planner prompt, keeping this compiler domain-agnostic.
function validateTimestamp(window: SeedTimeWindow, fieldName: string, value: SeedValue | undefined, path: string, errors: string[]) {
  if (value === undefined || value === null || !/(At|Date)$/u.test(fieldName)) return;
  const dateOnlyAllowed = isDateOnlyField(fieldName);
  if (typeof value !== 'string' || !(ISO_TIMESTAMP.test(value) || (dateOnlyAllowed && ISO_DATE_ONLY.test(value)))) {
    errors.push(dateOnlyAllowed
      ? `${path}: date must be an ISO 8601 calendar date (yyyy-mm-dd) or a UTC instant (yyyy-mm-ddThh:mm:ss(.sss)Z)`
      : `${path}: timestamp must be an ISO 8601 UTC string (yyyy-mm-ddThh:mm:ss(.sss)Z)`);
    return;
  }
  // A calendar date is compared BY DATE against the window, never as an instant: an end-of-window date
  // must stay valid by rule, not by the accident of parsing to midnight.
  if (ISO_DATE_ONLY.test(value)) {
    const day = value;
    const startDay = window.start.slice(0, 10);
    const endDay = window.end.slice(0, 10);
    if (day < startDay || day > endDay) errors.push(`${path}: date must fall within ${startDay}..${endDay}`);
    return;
  }
  const instant = Date.parse(value);
  const start = Date.parse(window.start);
  const end = Date.parse(window.end);
  if (Number.isNaN(instant) || instant < start || instant > end) {
    errors.push(`${path}: timestamp must fall within ${window.start}..${window.end}`);
  }
}

function hasKey(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_-]*$/u.test(value);
}

/** Ids that name a PLATFORM USER (assignee, actor-session owner). They resolve to an `actor:` identity,
 * never to a module entity, so they must stay symbolic even though no entity carries their name. */
const PLATFORM_USER_ID = /(?:user|worker|assignee|owner|employee|operator|technician)Id$/iu;

/**
 * Does an `…Id` field actually REFERENCE something seedable — a module entity or a platform-user
 * identity? Only then must its value be a symbolic `{ ref }`.
 *
 * The old rule was "every field ending in Id must be a { ref }", which is false for identifiers that are
 * plain data: `taxId` on an MDM Client is a tax number, not a pointer, and there is no `Tax` entity to
 * point at — yet the planner was told three times to make it symbolic (102045/buildFlowFsm), an
 * impossible instruction that burned the repair budget and forced the give-up.
 *
 * Matching is by SUFFIX against the known entity names, so a decorated id still resolves:
 * `topMenuItemId` ends with `MenuItemId` -> `MenuItem` exists -> a ref IS required (keeping it strict
 * avoids reintroducing dangling references). `closedByUserId` is platform-user-shaped -> strict too.
 * Only when nothing can be pointed at is a literal accepted.
 */
export function idFieldHasResolvableTarget(fieldId: string, knownEntityIds: Iterable<string>): boolean {
  const name = fieldId.replace(/_id$/iu, 'Id');
  if (!/Id$/u.test(name)) return false;
  if (PLATFORM_USER_ID.test(name)) return true;               // -> actor: identity
  const lower = name.toLowerCase();
  for (const entityId of knownEntityIds) {
    if (!entityId) continue;
    // `<entity>Id` as an exact name or as the SUFFIX of a decorated one (top<Entity>Id, primary<Entity>Id).
    if (lower.endsWith(`${entityId.toLowerCase()}id`)) return true;
  }
  return false;
}

// NOTE: domain-specific scenario invariants used to live here — hardcoded to the cafeFlow example
// (Shift/Order/MenuItem/StockConsumption names, the registered→…→delivered status flow, and the
// invented "requires-ingredient" relationship type). They were removed because this generator is
// generic across client modules (a petshop has none of those names). Rule conformance is now guided
// by the L4 rule text in the planner prompt; structural correctness (enums, references, required
// fields, timestamp window) is validated generically above. The one cross-cutting convention that
// still lacks a single source of truth — the MDM relationship TYPE the runtime usecases read — should
// be declared in L4 and shared with the usecase generator, not reintroduced here.

const MDM_INDEX_NAME_SOURCES = ['name', 'fullName', 'title'] as const;

function lookupSeedField(fields: Map<string, unknown> | Record<string, unknown> | SeedFieldValue[], key: string): unknown {
  if (fields instanceof Map) return fields.get(key);
  if (Array.isArray(fields)) return fields.find(field => field.name === key)?.value;
  return fields[key];
}

/** MDM index label: `name` on the envelope, else `fullName`/`title`, else the row key. Shared by
 * the validator (allows synthetic `name`), the local→MDM mirror, and the index emitter. */
export function mdmIndexName(
  fields: Map<string, unknown> | Record<string, unknown> | SeedFieldValue[],
  fallbackKey: string,
): string {
  for (const source of MDM_INDEX_NAME_SOURCES) {
    const value = lookupSeedField(fields, source);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallbackKey.trim();
}

/** Deterministic validation of the plan before any seed source is saved. */
export function validateSeedPlan(input: SeedBuildInput, knownReferences: Iterable<string> = []): string[] {
  const errors: string[] = [];
  const tableById = new Map(input.tablePlans.map(table => [table.tableId, table]));
  const entityById = new Map(input.entities.map(entity => [entity.entityId, entity]));
  const references = collectReferences(input.plan);
  // Entity names an `…Id` field could point at. Used to tell a REFERENCE apart from a plain identifier
  // (taxId, licenseId, …) so the planner is never told to make a non-pointer symbolic.
  const knownEntityIds = input.entities.map(entity => entity.entityId);
  for (const ref of knownReferences) references.add(ref);
  for (const identity of actorIdentities(input)) references.add(identity.ref);
  const window = windowOf(input);
  const seenLocalTables = new Set<string>();
  const seenMdmEntities = new Set<string>();

  if (!input.plan.summary.trim()) errors.push('plan.summary is required');

  for (const table of input.plan.localTables) {
    const path = `localTables.${table.tableId || '<missing>'}`;
    const definition = tableById.get(table.tableId);
    if (!definition) {
      errors.push(`${path}: unknown tableId`);
      continue;
    }
    if (seenLocalTables.has(table.tableId)) errors.push(`${path}: duplicated table plan`);
    seenLocalTables.add(table.tableId);
    if (!table.rows.length) errors.push(`${path}: at least one row is required`);
    const keys = new Set<string>();
    const entity = entityById.get(table.tableId);
    const entityFields = new Map((entity?.fields ?? []).map(field => [field.fieldId, field]));
    const columnNames = new Set(definition.columns.map(column => column.name));
    // The JSONB envelope is addressed by its DECLARED name; row.details is the bag that fills it.
    const detailsColumn = detailsColumnOf(definition);
    // Collection field names the entity declares (resolved from the generated entity by readTablePlans).
    // Empty = unknown, and then child names are not constrained (never invent a false rejection).
    const declaredChildCollections = definition.childCollections ?? [];

    for (const row of table.rows) {
      const rowPath = `${path}.${row.key || '<missing>'}`;
      if (!hasKey(row.key)) errors.push(`${rowPath}: key must be a stable identifier`);
      if (keys.has(row.key)) errors.push(`${rowPath}: duplicate key`);
      keys.add(row.key);
      const columns = mapFields(row.columns, `${rowPath}.columns`, errors);
      const details = mapFields(row.details, `${rowPath}.details`, errors);
      for (const name of columns.keys()) {
        if ((detailsColumn && name === detailsColumn) || !columnNames.has(name)) errors.push(`${rowPath}.columns.${name}: unknown persistence column`);
      }
      for (const name of details.keys()) {
        if (name !== 'label' && !entityFields.has(name)) errors.push(`${rowPath}.details.${name}: unknown entity field`);
      }
      // NOWHERE TO STORE IT: planning details/children for a table that declares no JSONB envelope used
      // to validate cleanly and then be dropped by the emitter (only declared columns are written). Fail
      // loudly instead — either the TableDefinition must enable its details column, or the fields belong
      // in real columns.
      if (!detailsColumn && (details.size > 0 || row.children.length > 0)) {
        // Phrased as something the PLANNER can act on (it cannot edit a TableDefinition): drop these from
        // the plan. The prompt already reports `detailsColumn: null` for such a table. If a REQUIRED field
        // has no column either, the row is genuinely unplannable and the give-up publishes the gap.
        errors.push(`${rowPath}: table '${table.tableId}' has no details envelope (detailsColumn is null), so it accepts ONLY real columns — remove every details/children entry for this table from the plan`);
      }
      for (const column of definition.columns) {
        if (definition.primaryKey.includes(column.name)) continue; // generated from tableId + row key
        if (detailsColumn && column.name === detailsColumn) {
          if (!column.nullable && details.size === 0 && row.children.length === 0) errors.push(`${rowPath}: details are required`);
          continue;
        }
        const value = columns.get(column.name);
        // A NOT NULL column must have a concrete value: neither missing (undefined) nor null.
        if (!column.nullable && (value === undefined || value === null)) errors.push(`${rowPath}.columns.${column.name}: required column missing`);
        validateReference(value as SeedValue, `${rowPath}.columns.${column.name}`, references, errors);
        validateSeedRefPlacement(value as SeedValue, `${rowPath}.columns.${column.name}`, column.name, `local:${table.tableId}.${row.key}`, knownEntityIds, errors);
        validateTimestamp(window, toCamel(column.name), value, `${rowPath}.columns.${column.name}`, errors);
        const field = entityFields.get(toCamel(column.name));
        validateEnum(field, value, `${rowPath}.columns.${column.name}`, errors);
        validateAssetReference(value, field, `${rowPath}.columns.${column.name}`, errors);
        // A nullable FK is legitimately null for an in-progress row (an open shift has no closer yet);
        // only a NON-null FK value must be a symbolic { ref }. null on a NOT NULL column is already
        // caught by the required check above.
        if (column.name.endsWith('_id') && !definition.primaryKey.includes(column.name) && value !== undefined && value !== null
            && !isSeedReference(value) && idFieldHasResolvableTarget(column.name, knownEntityIds)) {
          errors.push(`${rowPath}.columns.${column.name}: foreign keys must use a symbolic { ref }`);
        }
      }
      for (const field of entity?.fields ?? []) {
        const mappedColumn = toSnake(field.fieldId);
        const storedAsColumn = columnNames.has(mappedColumn);
        const generatedPrimaryKey = definition.primaryKey.includes(mappedColumn);
        const value = storedAsColumn ? columns.get(mappedColumn) : details.get(field.fieldId);
        if (field.required && !generatedPrimaryKey && (value === undefined || value === null)) errors.push(`${rowPath}: required field '${field.fieldId}' missing`);
        validateReference(value as SeedValue, `${rowPath}.${field.fieldId}`, references, errors);
        validateSeedRefPlacement(value as SeedValue, `${rowPath}.${field.fieldId}`, field.fieldId, `local:${table.tableId}.${row.key}`, knownEntityIds, errors);
        validateTimestamp(window, field.fieldId, value, `${rowPath}.${field.fieldId}`, errors);
        validateEnum(field, value, `${rowPath}.${field.fieldId}`, errors);
        validateAssetReference(value, field, `${rowPath}.${field.fieldId}`, errors);
        // Optional entity references may be null (a not-yet-linked relation on an in-progress row);
        // only a NON-null reference must be symbolic. A required field that is null is already caught above.
        if (field.fieldId.endsWith('Id') && !generatedPrimaryKey && value !== undefined && value !== null
            && !isSeedReference(value) && idFieldHasResolvableTarget(field.fieldId, knownEntityIds)) {
          errors.push(`${rowPath}.${field.fieldId}: entity references must use a symbolic { ref }`);
        }
      }
      for (const child of row.children) {
        if (!hasKey(child.name)) errors.push(`${rowPath}.children: child collection name must be a stable identifier`);
        // The child collection is stored under this name INSIDE the details envelope, and the adapter
        // reads it by the entity's collection FIELD name. A name that is not a declared collection would
        // be persisted where nothing reads it (an order whose items never load), so reject it here.
        if (declaredChildCollections.length && !declaredChildCollections.includes(child.name)) {
          errors.push(`${rowPath}.children.${child.name}: unknown child collection; use one of: ${declaredChildCollections.join(', ')}`);
        }
        const childKeys = new Set<string>();
        for (const childRow of child.rows) {
          if (!hasKey(childRow.key)) errors.push(`${rowPath}.children.${child.name}: child row key must be a stable identifier`);
          if (childKeys.has(childRow.key)) errors.push(`${rowPath}.children.${child.name}.${childRow.key}: duplicate child key`);
          childKeys.add(childRow.key);
          const fields = mapFields(childRow.fields, `${rowPath}.children.${child.name}.${childRow.key}`, errors);
          for (const [name, value] of fields) {
            validateReference(value, `${rowPath}.children.${child.name}.${childRow.key}.${name}`, references, errors);
            validateTimestamp(window, name, value, `${rowPath}.children.${child.name}.${childRow.key}.${name}`, errors);
            if (isSeedAssetRef(value)) errors.push(`${rowPath}.children.${child.name}.${childRow.key}.${name}: seed asset references require a declared image or URL field`);
          }
        }
      }
    }
  }

  for (const table of input.tablePlans) {
    if (!seenLocalTables.has(table.tableId)) errors.push(`localTables: missing plan for persistence table '${table.tableId}'`);
  }

  for (const mdmEntity of input.plan.mdmEntities) {
    const path = `mdmEntities.${mdmEntity.entityId || '<missing>'}`;
    const definition = entityById.get(mdmEntity.entityId);
    if (!definition || !isMdmSeedTarget(definition, input)) {
      errors.push(`${path}: unknown or non-MDM entity`);
      continue;
    }
    if (seenMdmEntities.has(mdmEntity.entityId)) errors.push(`${path}: duplicated MDM entity plan`);
    seenMdmEntities.add(mdmEntity.entityId);
    if (!mdmEntity.rows.length) errors.push(`${path}: at least one row is required`);
    const fieldsById = new Map(definition.fields.map(field => [field.fieldId, field]));
    const keys = new Set<string>();
    for (const row of mdmEntity.rows) {
      const rowPath = `${path}.${row.key || '<missing>'}`;
      if (!hasKey(row.key)) errors.push(`${rowPath}: key must be a stable identifier`);
      if (keys.has(row.key)) errors.push(`${rowPath}: duplicate key`);
      keys.add(row.key);
      const fields = mapFields(row.fields, `${rowPath}.fields`, errors);
      for (const [name, value] of fields) {
        const field = fieldsById.get(name);
        // `name` is the MDM index label, not necessarily an entity field (Customer has fullName).
        if (!field && name !== 'name') errors.push(`${rowPath}.fields.${name}: unknown MDM entity field`);
        validateReference(value, `${rowPath}.fields.${name}`, references, errors);
        validateSeedRefPlacement(value, `${rowPath}.fields.${name}`, name, `mdm:${mdmEntity.entityId}.${row.key}`, knownEntityIds, errors);
        validateTimestamp(window, name, value, `${rowPath}.fields.${name}`, errors);
        if (field) {
          validateEnum(field, value, `${rowPath}.fields.${name}`, errors);
          validateAssetReference(value, field, `${rowPath}.fields.${name}`, errors);
        }
      }
      for (const field of definition.fields) {
        const automaticId = field.fieldId === entityIdField(definition);
        const value = fields.get(field.fieldId);
        if (field.required && !automaticId && (value === undefined || value === null)) errors.push(`${rowPath}: required field '${field.fieldId}' missing`);
        // Optional MDM references may be null; only a NON-null reference must be symbolic.
        if (field.fieldId.endsWith('Id') && !automaticId && value !== undefined && value !== null
            && !isSeedReference(value) && idFieldHasResolvableTarget(field.fieldId, knownEntityIds)) {
          errors.push(`${rowPath}.${field.fieldId}: MDM references must use a symbolic { ref }`);
        }
      }
      if (!mdmIndexName(fields, row.key)) errors.push(`${rowPath}: MDM rows require a readable name (name, fullName, title, or the row key)`);
      for (const relationship of row.relationships) {
        const relationshipPath = `${rowPath}.relationships.${relationship.type || '<missing>'}`;
        if (!relationship.type.trim()) errors.push(`${relationshipPath}: type is required`);
        if (!/^mdm:[A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_-]*$/u.test(relationship.targetRef) || !references.has(relationship.targetRef)) {
          errors.push(`${relationshipPath}: targetRef '${relationship.targetRef}' must resolve to an MDM row`);
        }
        const metadata = mapFields(relationship.metadata, `${relationshipPath}.metadata`, errors);
        for (const [name, value] of metadata) {
          validateReference(value, `${relationshipPath}.metadata.${name}`, references, errors);
          if (isSeedAssetRef(value)) errors.push(`${relationshipPath}.metadata.${name}: seed asset references require a declared image or URL field`);
        }
      }
    }
  }

  for (const entity of input.entities.filter(entity => entity.kind === 'mdm')) {
    if (!seenMdmEntities.has(entity.entityId)) errors.push(`mdmEntities: missing plan for '${entity.entityId}'`);
  }
  errors.push(...collectLifecycleStateCoverage(input));
  errors.push(...collectRequiredMdmTagCoverage(input));
  return [...new Set(errors)];
}

/**
 * Canonical tags generated usecases actually hit via `ctx.mdm`. The pinned `mdm` block does not
 * carry the entity name — that comes from the operation's `entity`. `listByType({ type })` in the
 * generated .ts is the other surface. Never infer a tag from a name that has no mdm block / call.
 */
export function collectRequiredMdmTags(input: {
  moduleName: string;
  mdmOwners: Array<{ entity: string; mdm?: unknown }>;
  usecaseSources?: Iterable<string>;
}): string[] {
  const tags = new Set<string>();
  const moduleName = input.moduleName.trim();
  if (!moduleName) return [];
  for (const owner of input.mdmOwners) {
    if (!owner.mdm || typeof owner.mdm !== 'object' || !owner.entity.trim()) continue;
    tags.add(`${moduleName}.${owner.entity.trim()}`);
  }
  for (const source of input.usecaseSources ?? []) {
    for (const match of source.matchAll(/listByType\(\s*\{[^}]*\btype\s*:\s*['"]([^'"]+)['"]/gu)) {
      if (match[1]) tags.add(match[1]);
    }
  }
  return [...tags].sort();
}

function entityIdFromMdmTag(tag: string, moduleName: string): string {
  const prefix = `${moduleName}.`;
  return tag.startsWith(prefix) ? tag.slice(prefix.length) : '';
}

/** MDM ids that a give-up must publish: kind `mdm` OR a required ctx.mdm tag that has no plan row. */
export function skippedMdmEntityIds(input: Pick<SeedBuildInput, 'entities' | 'mdmRequiredTags' | 'moduleName'>, seededMdmIds: Set<string>): string[] {
  const fromKind = input.entities.filter(entity => entity.kind === 'mdm' && !seededMdmIds.has(entity.entityId)).map(entity => entity.entityId);
  const fromTags = (input.mdmRequiredTags ?? [])
    .map(tag => entityIdFromMdmTag(tag, input.moduleName))
    .filter(id => !!id && !seededMdmIds.has(id));
  return [...new Set([...fromKind, ...fromTags])].sort();
}

function isMdmSeedTarget(entity: SeedEntityDefinition, input: SeedBuildInput): boolean {
  if (entity.kind === 'mdm') return true;
  const tag = `${input.moduleName}.${entity.entityId}`;
  return (input.mdmRequiredTags ?? []).includes(tag);
}

function mdmTagSeededInPlan(input: SeedBuildInput, tag: string): boolean {
  const entityId = entityIdFromMdmTag(tag, input.moduleName);
  if (!entityId) {
    return input.plan.mdmEntities.some(entity => `${input.moduleName}.${entity.entityId}` === tag && entity.rows.length > 0);
  }
  const planned = input.plan.mdmEntities.find(entity => entity.entityId === entityId);
  return !!planned && planned.rows.length > 0;
}

/** Every tag a generated usecase reads through ctx.mdm needs at least one MDM plan row with that tag. */
export function collectRequiredMdmTagCoverage(input: SeedBuildInput): string[] {
  const errors: string[] = [];
  const skipped = new Set(input.skipped?.mdmEntities ?? []);
  for (const tag of input.mdmRequiredTags ?? []) {
    const entityId = entityIdFromMdmTag(tag, input.moduleName);
    if (entityId && skipped.has(entityId)) continue;
    if (mdmTagSeededInPlan(input, tag)) continue;
    errors.push(`mdmEntities: usecases call ctx.mdm listByType/lifecycle for '${tag}' but the plan has no MDM row with that tag`);
  }
  return errors;
}

/**
 * Copy local rows of a ctx.mdm-read entity into `mdmEntities`, same keys (so emitted ids match).
 * MDM cadastral `status` is Active — the local lifecycle status stays on the local table.
 */
export function mirrorLocalRowsAsMdmPlan(
  plan: SeedPlan,
  tags: readonly string[],
  moduleName: string,
  timeWindow: SeedTimeWindow = { start: SEED_WINDOW_START, end: SEED_WINDOW_END },
): SeedPlan {
  const prefix = `${moduleName}.`;
  const existing = new Set(plan.mdmEntities.map(entity => entity.entityId));
  const extra: SeedMdmEntity[] = [];
  for (const tag of tags) {
    if (!tag.startsWith(prefix)) continue;
    const entityId = tag.slice(prefix.length);
    if (!entityId || existing.has(entityId)) continue;
    const local = plan.localTables.find(table => table.tableId === entityId);
    if (!local?.rows.length) continue;
    extra.push({
      entityId,
      rows: local.rows.map((row) => {
        const fields: SeedFieldValue[] = [
          ...row.details.map(field => ({ ...field })),
          ...row.columns.map(column => ({ name: toCamel(column.name), value: column.value })),
        ];
        if (!fields.some(field => field.name === 'name')) {
          fields.push({ name: 'name', value: mdmIndexName(fields, row.key) });
        }
        if (!fields.some(field => field.name === 'createdAt')) fields.push({ name: 'createdAt', value: timeWindow.start });
        if (!fields.some(field => field.name === 'updatedAt')) fields.push({ name: 'updatedAt', value: timeWindow.start });
        return { key: row.key, fields, relationships: [] };
      }),
    });
    existing.add(entityId);
  }
  return extra.length ? { ...plan, mdmEntities: [...plan.mdmEntities, ...extra] } : plan;
}

/**
 * Clone a planned row for each OPERATED lifecycle state the plan missed. The validator already
 * demands one row per operated state; the planner historically covered only "main" states and
 * the wave gave up (be5 wave 6: ServiceExecution arrived).
 */
export function coverMissingOperatedStates(plan: SeedPlan, input: Pick<SeedBuildInput, 'entities'>): SeedPlan {
  const localTables = plan.localTables.map(table => ({
    ...table,
    rows: table.rows.map(row => ({
      ...row,
      columns: row.columns.map(column => ({ ...column })),
      details: row.details.map(detail => ({ ...detail })),
      children: row.children,
    })),
  }));
  for (const entity of input.entities) {
    const operated = entity.operatedStates ?? [];
    if (!operated.length) continue;
    const table = localTables.find(item => item.tableId === entity.entityId);
    if (!table?.rows.length) continue;
    const statusField = entity.fields.find(field => (field.enumValues?.length ?? 0) > 0 && /status$/iu.test(field.fieldId));
    if (!statusField) continue;
    const statusOf = (row: SeedLocalRow): unknown => {
      const column = row.columns.find(item => toCamel(item.name) === statusField.fieldId);
      const detail = row.details.find(item => item.name === statusField.fieldId);
      return column?.value ?? detail?.value;
    };
    const seeded = new Set(table.rows.map(statusOf).filter((value): value is string => typeof value === 'string'));
    const template = table.rows[0];
    for (const state of operated) {
      if (seeded.has(state)) continue;
      const keyBase = `${template.key}-${state}`.replace(/[^A-Za-z0-9_-]/gu, '');
      const key = hasKey(keyBase) ? keyBase : `state-${state}`;
      const setStatus = (fields: SeedFieldValue[], name: string): SeedFieldValue[] =>
        fields.some(field => field.name === name)
          ? fields.map(field => (field.name === name ? { name, value: state } : { ...field }))
          : fields;
      table.rows.push({
        key,
        columns: setStatus(template.columns.map(column => ({ ...column })), toSnake(statusField.fieldId)),
        details: setStatus(template.details.map(detail => ({ ...detail })), statusField.fieldId),
        children: template.children,
      });
      seeded.add(state);
    }
  }
  return { ...plan, localTables, mdmEntities: plan.mdmEntities };
}

/** Deterministic repairs the LLM is taught to do but often misses in two attempts: operated-state
 * coverage and MDM index rows for tags the generated usecases already call. */
export function repairSeedPlanDeterministically(plan: SeedPlan, input: Omit<SeedBuildInput, 'plan'> & { plan?: SeedPlan }): SeedPlan {
  const covered = coverMissingOperatedStates(plan, input);
  return mirrorLocalRowsAsMdmPlan(
    covered,
    input.mdmRequiredTags ?? [],
    input.moduleName,
    input.timeWindow ?? { start: SEED_WINDOW_START, end: SEED_WINDOW_END },
  );
}

/**
 * Every OPERATED lifecycle state of an entity needs at least one seeded row in it.
 *
 * A screen that decides on a state filters by it, so a state nobody seeded makes that screen open empty
 * and its test fail for a reason that has nothing to do with the screen: the buildFlowFsm production run
 * had all three change-order journeys reporting `expected >= 1 item(s), got 0` because no ChangeOrder
 * was seeded as `submitted` or `pendingClientApproval`. One incomplete generator, five failures.
 *
 * "Operated" is the union of the `fromStates` of the entity's workflow transitions — the states some
 * transition READS. Requiring every DECLARED state instead would demand a row for terminal states nobody
 * queries and inflate every plan (the cafeFlow fixture alone would need 6 more rows), so the rule follows
 * the workflow, not the enum. Entities with no workflow, and entities the plan gave up on, are silent.
 */
export function collectLifecycleStateCoverage(input: SeedBuildInput): string[] {
  const errors: string[] = [];
  const rowsByEntity = new Map<string, Array<{ key: string; values: Map<string, SeedValue> }>>();
  for (const table of input.plan.localTables) {
    const definition = input.tablePlans.find(plan => plan.tableId === table.tableId);
    if (!definition) continue;
    rowsByEntity.set(table.tableId, table.rows.map(row => ({
      key: row.key,
      values: new Map([
        ...row.columns.map(column => [toCamel(column.name), column.value] as const),
        ...row.details.map(detail => [detail.name, detail.value] as const),
      ]),
    })));
  }
  for (const entity of input.plan.mdmEntities) {
    rowsByEntity.set(entity.entityId, entity.rows.map(row => ({
      key: row.key,
      values: new Map(row.fields.map(field => [field.name, field.value] as const)),
    })));
  }
  for (const entity of input.entities) {
    const operated = entity.operatedStates ?? [];
    if (operated.length === 0) continue;        // no workflow -> no state anyone operates on
    const rows = rowsByEntity.get(entity.entityId);
    if (!rows || rows.length === 0) continue;   // not planned (or given up on) -> not this rule's business
    const statusField = entity.fields.find(field => (field.enumValues?.length ?? 0) > 0 && /status$/iu.test(field.fieldId));
    if (!statusField) continue;
    const seeded = new Set(rows.map(row => row.values.get(statusField.fieldId)).filter(value => typeof value === 'string'));
    const missing = operated.filter(state => !seeded.has(state));
    if (missing.length) {
      errors.push(`${entity.entityId}: no seeded row in lifecycle state(s) ${missing.join(', ')} — a screen that acts on them opens empty; give '${statusField.fieldId}' one row per operated state`);
    }
  }
  return errors;
}

interface SeedAssetValueMarker { __agentCbSeedAsset: string; }

function resolveValue(value: SeedValue, ids: Map<string, string>): unknown {
  if (isSeedAssetRef(value)) return { __agentCbSeedAsset: value.asset } satisfies SeedAssetValueMarker;
  if (!isSeedReference(value)) return value;
  return ids.get(value.ref) ?? value.ref;
}

interface SeedValidatorMarker { __agentCbSeedValidator: { fn: string; planned: string } }

function seedStringPassingApplies(field: SeedFieldDefinition): field is SeedFieldDefinition & { validatorExport: string } {
  return !!field.validatorExport && seedFieldIsBareString(field);
}

function wrapValidated(field: SeedFieldDefinition | undefined, value: unknown): unknown {
  if (!field || typeof value !== 'string' || !seedStringPassingApplies(field)) return value;
  return { __agentCbSeedValidator: { fn: field.validatorExport, planned: value } } satisfies SeedValidatorMarker;
}

function fieldByStorageName(entity: SeedEntityDefinition | undefined, name: string): SeedFieldDefinition | undefined {
  if (!entity) return undefined;
  return entity.fields.find(field => field.fieldId === name || toSnake(field.fieldId) === name);
}

function resolveFieldsForEntity(fields: SeedFieldValue[], ids: Map<string, string>, entity?: SeedEntityDefinition): Record<string, unknown> {
  return Object.fromEntries(fields.map(field => [
    field.name,
    wrapValidated(fieldByStorageName(entity, field.name), resolveValue(field.value, ids)),
  ]));
}

function seedSourceLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(
      /\{\s*"__agentCbSeedAsset"\s*:\s*"([A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*)"\s*\}/gu,
      (_match, assetId: string) => `seedAssetUrl(${JSON.stringify(assetId)})`,
    )
    .replace(
      /\{\s*"__agentCbSeedValidator"\s*:\s*\{\s*"fn"\s*:\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*,\s*"planned"\s*:\s*("(?:\\.|[^"\\])*")\s*\}\s*\}/gu,
      (_match, fn: string, planned: string) => `seedStringPassing(${fn}, ${planned})`,
    );
}

export function seedAssetUrlsBlock(urls: Record<string, string>, warnings: string[] = []): string {
  const safeUrls = Object.fromEntries(Object.entries(urls)
    .filter(([asset, url]) => /^[A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*$/u.test(asset) && typeof url === 'string' && url.startsWith('/'))
    .sort(([left], [right]) => left.localeCompare(right)));
  return [
    SEED_ASSET_URLS_START,
    `const seedAssetUrls: Record<string, string> = ${JSON.stringify(safeUrls, null, 2)};`,
    `const seedAssetWarnings: string[] = ${JSON.stringify([...new Set(warnings)].sort(), null, 2)};`,
    SEED_ASSET_URLS_END,
  ].join('\n');
}

export function updateSeedAssetUrlsInSource(source: string, urls: Record<string, string>, warnings: string[] = []): string {
  const start = source.indexOf(SEED_ASSET_URLS_START);
  const end = source.indexOf(SEED_ASSET_URLS_END);
  if (start < 0 || end < start) throw new Error('seed source has no asset URL block');
  const replacement = seedAssetUrlsBlock(urls, warnings);
  return `${source.slice(0, start)}${replacement}${source.slice(end + SEED_ASSET_URLS_END.length)}`;
}

function resolveFields(fields: SeedFieldValue[], ids: Map<string, string>): Record<string, unknown> {
  return Object.fromEntries(fields.map(field => [field.name, resolveValue(field.value, ids)]));
}

function planMap<T extends { tableId?: string; entityId?: string }>(items: T[], key: 'tableId' | 'entityId'): Map<string, T> {
  return new Map(items.map(item => [String(item[key] || ''), item]));
}

function idMap(input: SeedBuildInput): Map<string, string> {
  const ids = new Map<string, string>();
  for (const table of input.plan.localTables) {
    for (const row of table.rows) ids.set(`local:${table.tableId}.${row.key}`, stableUuid(`${input.moduleName}:local:${table.tableId}:${row.key}`));
  }
  for (const entity of input.plan.mdmEntities) {
    for (const row of entity.rows) {
      const localId = ids.get(`local:${entity.entityId}.${row.key}`);
      // Same key as a local row → same uuid so ctx.mdm and the local adapter see one record (be5).
      ids.set(`mdm:${entity.entityId}.${row.key}`, localId ?? stableUuid(`${input.moduleName}:mdm:${entity.entityId}:${row.key}`));
    }
  }
  for (const identity of actorIdentities(input)) ids.set(identity.ref, identity.mdmId);
  return ids;
}

function buildLocalRows(input: SeedBuildInput, ids: Map<string, string>): Array<{ exportName: string; seedFor: string; rows: Record<string, unknown>[] }> {
  const plannedTables = planMap(input.plan.localTables, 'tableId');
  const entityById = new Map(input.entities.map(entity => [entity.entityId, entity]));
  return input.tablePlans.map((table) => {
    const planned = plannedTables.get(table.tableId)!;
    const entity = entityById.get(table.tableId);
    const detailsColumn = detailsColumnOf(table);
    return {
      exportName: `${table.tableId.charAt(0).toLowerCase()}${table.tableId.slice(1)}Seeds`,
      seedFor: table.seedFor,
      rows: planned.rows.map((row) => {
        const columns = resolveFieldsForEntity(row.columns, ids, entity);
        const details = resolveFieldsForEntity(row.details, ids, entity);
        for (const child of row.children) {
          details[child.name] = child.rows.map(childRow => resolveFields(childRow.fields, ids));
        }
        const out: Record<string, unknown> = {};
        for (const column of table.columns) {
          if (table.primaryKey.includes(column.name)) {
            out[column.name] = table.primaryKey.length === 1
              ? ids.get(`local:${table.tableId}.${row.key}`)
              : stableUuid(`${input.moduleName}:local:${table.tableId}:${row.key}:${column.name}`);
          } else if (detailsColumn && column.name === detailsColumn) {
            if (Object.keys(details).length) out[detailsColumn] = details;
          } else {
            out[column.name] = columns[column.name];
          }
        }
        return out;
      }),
    };
  });
}

function buildMdmRows(input: SeedBuildInput, ids: Map<string, string>): Array<{ exportName: string; seedFor: string; rows: Record<string, unknown>[] }> {
  const plannedEntities = planMap(input.plan.mdmEntities, 'entityId');
  const indexRows: Record<string, unknown>[] = [];
  const documentRows: Record<string, unknown>[] = [];
  const relationshipRows: Record<string, unknown>[] = [];
  for (const entity of input.entities.filter(entity => isMdmSeedTarget(entity, input))) {
    const planned = plannedEntities.get(entity.entityId);
    if (!planned) continue;
    const idField = entityIdField(entity);
    for (const row of planned.rows) {
      const mdmId = ids.get(`mdm:${entity.entityId}.${row.key}`)!;
      const fields = resolveFieldsForEntity(row.fields, ids, entity);
      fields[idField] = mdmId;
      const name = mdmIndexName(fields, row.key);
      fields.name = name;
      const subtype = mdmSubtypeFor(entity.entityId);
      // mdmFacade.listByType matches record.tags.includes('<moduleId>.<Type>') — the canonical tag
      // MUST be present as a single string or every seeded entity is invisible to the module reads.
      const tags = [`${input.moduleName}.${entity.entityId}`, input.moduleName, entity.entityId];
      indexRows.push({
        mdmId, subtype, name, status: 'Active', docType: null, docId: null,
        countryCode: countryCodeForLanguage(input.language), tags,
        searchVector: `${name} ${entity.entityId} ${input.moduleName}`.toLowerCase(), mergedInto: null,
        dynamoPk: mdmId, createdAt: fields.createdAt, updatedAt: fields.updatedAt,
      });
      const details: Record<string, unknown> = {
        mdmId, subtype, name, status: 'Active', docType: null, docId: null,
        countryCode: countryCodeForLanguage(input.language), tags,
        aliases: [], contacts: [], relationshipRefs: {}, addresses: [], mergedInto: null,
        createdAt: fields.createdAt, updatedAt: fields.updatedAt, [input.moduleName]: fields,
      };
      if (subtype === 'Location') details.locationType = 'DiningArea';
      if (subtype === 'Company') {
        details.companyKind = 'LegalEntity';
        details.legalName = name;
      }
      documentRows.push({ mdmId, version: 1, details });
      for (const relationship of row.relationships) {
        relationshipRows.push({
          id: stableUuid(`${input.moduleName}:relationship:${entity.entityId}:${row.key}:${relationship.type}:${relationship.targetRef}`),
          fromId: mdmId,
          toId: ids.get(relationship.targetRef),
          type: relationship.type,
          role: null,
          metadata: resolveFields(relationship.metadata, ids),
          isBidirectional: relationship.isBidirectional,
          validFrom: windowOf(input).start,
          validTo: null,
          status: 'Active',
          createdAt: fields.createdAt,
          updatedAt: fields.updatedAt,
        });
      }
    }
  }
  // Platform-user identities: emitted as MDM Person records so actor references (assignees,
  // actorSession-resolved worker fields) resolve to a real MDM identity at runtime. The module never
  // owns a user/rate table (see rule workerRateFromProfile) — these are the referenceable people.
  const window = windowOf(input);
  for (const identity of actorIdentities(input)) {
    // Same canonical-tag contract as above: person identities must be listable by '<module>.Person'.
    const actorTags = [`${input.moduleName}.Person`, input.moduleName, 'actor', identity.actorId];
    indexRows.push({
      mdmId: identity.mdmId, subtype: 'Person', name: identity.name, status: 'Active', docType: null, docId: null,
      countryCode: countryCodeForLanguage(input.language), tags: actorTags,
      searchVector: `${identity.name} ${identity.actorId} ${input.moduleName}`.toLowerCase(), mergedInto: null,
      dynamoPk: identity.mdmId, createdAt: window.start, updatedAt: window.start,
    });
    documentRows.push({
      mdmId: identity.mdmId, version: 1,
      details: {
        mdmId: identity.mdmId, subtype: 'Person', name: identity.name, status: 'Active', docType: null, docId: null,
        countryCode: countryCodeForLanguage(input.language), tags: actorTags,
        aliases: [], contacts: [], relationshipRefs: {}, addresses: [], mergedInto: null,
        createdAt: window.start, updatedAt: window.start, actorId: identity.actorId,
      },
    });
  }
  return [
    { exportName: 'mdmEntityIndexSeeds', seedFor: 'mdmEntityIndex', rows: indexRows },
    { exportName: 'mdmDocumentSeeds', seedFor: 'mdmDocumentCache', rows: documentRows },
    { exportName: 'mdmRelationshipSeeds', seedFor: 'mdmRelationship', rows: relationshipRows },
  ].filter(block => block.rows.length > 0);
}

function entityModuleRef(project: number, moduleName: string, entityId: string): string {
  const short = entityId.charAt(0).toLowerCase() + entityId.slice(1);
  return `/_${project}_/l1/${moduleName}/layer_3_domain/entities/${short}.js`;
}

interface SeedSpareSpec {
  entityId: string;
  fieldId: string;
  validator?: string;
  planned: string;
  usedExprs: string[];
}

function plannedStringForSpare(value: unknown): string | undefined {
  if (typeof value === 'string' && value) return value;
  if (isRecord(value) && isRecord(value.__agentCbSeedValidator) && typeof value.__agentCbSeedValidator.planned === 'string') {
    const planned = value.__agentCbSeedValidator.planned;
    return planned || undefined;
  }
  return undefined;
}

function isSpareSeedField(field: SeedFieldDefinition, idField: string): boolean {
  if (field.fieldId === idField || field.fieldId === 'id') return false;
  if (/Id$/u.test(field.fieldId)) return false;
  return seedFieldIsBareString(field);
}

function buildLocalEntityConsts(
  input: SeedBuildInput,
  ids: Map<string, string>,
): { lines: string[]; imports: Map<string, { typeName: string; validators: Set<string>; typeUsed: boolean }>; anchors: Array<{ name: string; idField: string }>; spares: SeedSpareSpec[] } {
  const entityById = new Map(input.entities.map(entity => [entity.entityId, entity]));
  const imports = new Map<string, { typeName: string; validators: Set<string>; typeUsed: boolean }>();
  const lines: string[] = [];
  const anchors: Array<{ name: string; idField: string }> = [];
  const spareMap = new Map<string, SeedSpareSpec>();
  const used = new Set<string>();
  for (const table of input.plan.localTables) {
    const entity = entityById.get(table.tableId);
    if (!entity) continue;
    const typeName = entity.entityId;
    const moduleRef = entityModuleRef(input.project, input.moduleName, entity.entityId);
    const entry = imports.get(moduleRef) ?? { typeName, validators: new Set<string>(), typeUsed: false };
    entry.typeName = typeName;
    entry.typeUsed = true;
    const idField = entityIdField(entity);
    const rowConsts: string[] = [];
    for (const row of table.rows) {
      let name = seedAnchorName(entity.entityId, row.key);
      if (used.has(name)) name = `${name}_${used.size}`;
      used.add(name);
      const obj: Record<string, unknown> = { [idField]: ids.get(`local:${table.tableId}.${row.key}`) };
      const columns = resolveFieldsForEntity(row.columns, ids, entity);
      const details = resolveFieldsForEntity(row.details, ids, entity);
      for (const field of entity.fields) {
        if (field.fieldId === idField) continue;
        const snake = toSnake(field.fieldId);
        if (Object.prototype.hasOwnProperty.call(columns, snake)) obj[field.fieldId] = columns[snake];
        else if (Object.prototype.hasOwnProperty.call(details, field.fieldId)) obj[field.fieldId] = details[field.fieldId];
        else {
          const child = row.children.find(item => item.name === field.fieldId);
          if (child) obj[field.fieldId] = child.rows.map(childRow => resolveFields(childRow.fields, ids));
          else if (!field.required) obj[field.fieldId] = null;
        }
        if (seedStringPassingApplies(field)) entry.validators.add(field.validatorExport);
        if (!isSpareSeedField(field, idField)) continue;
        const planned = plannedStringForSpare(obj[field.fieldId]);
        if (!planned) continue;
        const spareKey = `${entity.entityId}.${field.fieldId}`;
        const spec = spareMap.get(spareKey) ?? {
          entityId: entity.entityId,
          fieldId: field.fieldId,
          ...(seedStringPassingApplies(field) ? { validator: field.validatorExport } : {}),
          planned,
          usedExprs: [],
        };
        spec.usedExprs.push(`${name}.${field.fieldId}`);
        spareMap.set(spareKey, spec);
      }
      for (const child of row.children) {
        if (!Object.prototype.hasOwnProperty.call(obj, child.name)) {
          obj[child.name] = child.rows.map(childRow => resolveFields(childRow.fields, ids));
        }
      }
      lines.push(`const ${name}: ${typeName} = ${seedSourceLiteral(obj)};`, '');
      rowConsts.push(name);
      anchors.push({ name, idField });
    }
    const rowsName = `${table.tableId.charAt(0).toLowerCase()}${table.tableId.slice(1)}Rows`;
    lines.push(`const ${rowsName}: ${typeName}[] = [${rowConsts.join(', ')}];`, '');
    imports.set(moduleRef, entry);
  }
  const spares = [...spareMap.values()].sort((left, right) => {
    const byEntity = left.entityId.localeCompare(right.entityId);
    return byEntity !== 0 ? byEntity : left.fieldId.localeCompare(right.fieldId);
  });
  return { lines, imports, anchors, spares };
}

function tsIdentOrQuote(value: string): string {
  return seedTsIdent(value) ? value : JSON.stringify(value);
}

function renderSeedSpares(spares: SeedSpareSpec[]): string[] {
  if (!spares.length) return [];
  const byEntity = new Map<string, SeedSpareSpec[]>();
  for (const spec of spares) {
    const list = byEntity.get(spec.entityId) ?? [];
    list.push(spec);
    byEntity.set(spec.entityId, list);
  }
  const lines = ['export const seedSpares = {'];
  for (const entityId of [...byEntity.keys()].sort()) {
    lines.push(`  ${tsIdentOrQuote(entityId)}: {`);
    for (const spec of byEntity.get(entityId)!) {
      const check = spec.validator ?? '(_value: string) => true';
      lines.push(`    ${tsIdentOrQuote(spec.fieldId)}: seedSparesPassing(${check}, ${JSON.stringify(spec.planned)}, [${spec.usedExprs.join(', ')}], ${SEED_SPARES_PER_FIELD}),`);
    }
    lines.push('  },');
  }
  lines.push('} as const;', '');
  return lines;
}

function seedImportLines(imports: Map<string, { typeName: string; validators: Set<string>; typeUsed: boolean }>): string[] {
  return [...imports.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([ref, entry]) => {
    const validators = [...entry.validators].sort();
    if (entry.typeUsed && validators.length) return `import { ${validators.join(', ')}, type ${entry.typeName} } from '${ref}';`;
    if (entry.typeUsed) return `import type { ${entry.typeName} } from '${ref}';`;
    if (validators.length) return `import { ${validators.join(', ')} } from '${ref}';`;
    return '';
  }).filter(Boolean);
}

/** Compile a validated plan. IDs, relationship IDs and structural MDM records are always generated
 * locally; only the business scenario itself comes from the LLM plan. */
export function buildSeedSource(input: SeedBuildInput): SeedBuildResult {
  const errors = validateSeedPlan(input);
  const localSummary = input.plan.localTables.map(table => `${table.tableId}=${table.rows.length}`).join(', ');
  const mdmSummary = input.plan.mdmEntities.map(entity => `${entity.entityId}=${entity.rows.length}`).join(', ');
  const summary = `local [${localSummary || 'none'}]; MDM [${mdmSummary || 'none'}]`;
  if (errors.length) return { errors, summary };
  const ids = idMap(input);
  const blocks = [...buildLocalRows(input, ids), ...buildMdmRows(input, ids)];
  const typed = buildLocalEntityConsts(input, ids);
  for (const entity of input.entities) {
    const used = input.plan.localTables.some(table => table.tableId === entity.entityId)
      || input.plan.mdmEntities.some(item => item.entityId === entity.entityId);
    if (!used) continue;
    const validators = entity.fields.filter(seedStringPassingApplies).map(field => field.validatorExport);
    if (!validators.length) continue;
    const moduleRef = entityModuleRef(input.project, input.moduleName, entity.entityId);
    const entry = typed.imports.get(moduleRef) ?? { typeName: entity.entityId, validators: new Set<string>(), typeUsed: false };
    for (const name of validators) entry.validators.add(name);
    typed.imports.set(moduleRef, entry);
  }
  const usesValidator = [...typed.imports.values()].some(entry => entry.validators.size > 0);
  const usesSpares = typed.spares.length > 0;
  const seedIdsEntries = [
    ...typed.anchors.map(anchor => `  ${anchor.name}: ${anchor.name}.${anchor.idField},`),
    ...input.plan.mdmEntities.flatMap(entity => entity.rows.map(row => {
      const name = seedAnchorName(entity.entityId, row.key);
      const id = ids.get(`mdm:${entity.entityId}.${row.key}`) ?? '';
      if (typed.anchors.some(anchor => anchor.name === name)) return '';
      return `  ${name}: ${JSON.stringify(id)},`;
    })).filter(Boolean),
  ];
  const planEnvelope = {
    version: 1, moduleName: input.moduleName, language: input.language,
    // Published so "no rows" is a documented decision, readable without re-running the generator.
    ...(input.skipped && (input.skipped.tables.length || input.skipped.mdmEntities.length) ? { skipped: input.skipped } : {}),
    plan: input.plan,
  };
  const lines = [
    `/// <mls fileReference="_${input.project}_/l1/${input.moduleName}/layer_1_external/adapters/persistence/seeds.ts" enhancement="_blank"/>`,
    '',
    `// Deterministic initial data for ${input.moduleName}. Scenario planned by agentCbSeeds; rows and ids compiled locally from seeds.defs.ts.`,
    '// TableSeedRows exports are discovered by shape and merged by the persistence registry.',
    '',
    SEED_PLAN_START,
    JSON.stringify(planEnvelope, null, 2),
    SEED_PLAN_END,
    '',
    seedAssetUrlsBlock({}, []),
    usesValidator ? 'const seedValidatorWarnings: string[] = [];' : '',
    '',
    'function seedAssetUrl(assetId: string): string | null { return seedAssetUrls[assetId] ?? null; }',
    '',
    ...(usesValidator ? [SEED_STRING_PASSING_HELPER, ''] : []),
    ...(usesSpares ? [SEED_SPARES_PASSING_HELPER, ''] : []),
    // The contracts import and the seed exports only exist when there ARE rows. An all-skipped module
    // (every wave gave up) must still emit a VALID module: no unused import, and `export {}` so the file
    // is unambiguously a module rather than a script whose top-level consts leak into the global scope.
    ...(blocks.length
      ? [
        `import type { TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';`,
        ...seedImportLines(typed.imports),
        '',
      ]
      : ['export {};', '']),
    ...typed.lines,
    ...(seedIdsEntries.length ? [`export const seedIds = {`, ...seedIdsEntries, `} as const;`, ''] : []),
    ...renderSeedSpares(typed.spares),
    ...blocks.flatMap(block => [
      `export const ${block.exportName}: TableSeedRows = ${seedSourceLiteral({ seedFor: block.seedFor, rows: block.rows })};`,
      '',
    ]),
  ].filter((line, index, all) => line !== '' || all[index - 1] !== '');
  const content = lines.join('\n');
  const purity = seedSourcePurityErrors(content);
  if (purity.length) return { errors: purity, summary };
  return { errors: [], content, summary };
}

export function seedPlanPromptContext(
  input: Omit<SeedBuildInput, 'plan'>,
  repairFindings: string[] = [],
  options: SeedPlanPromptOptions = {},
): string {
  const entities = input.entities.map(entity => ({
    entityId: entity.entityId,
    title: entity.title,
    kind: entity.kind,
    fields: entity.fields.map(field => ({ fieldId: field.fieldId, type: field.type, required: field.required, enum: field.enumValues })),
    ...(entity.operatedStates?.length ? { operatedStates: entity.operatedStates } : {}),
  }));
  const tables = input.tablePlans.map(table => ({
    tableId: table.tableId,
    seedFor: table.seedFor,
    primaryKey: table.primaryKey,
    columns: table.columns,
    // Where the non-indexed fields actually land, and which embedded collections the aggregate owns.
    // Without childCollections the planner had no way to know an aggregate carries children, so it
    // planned none and every seeded parent came out with an empty collection (102051: orders with
    // `items: []`). Declared by the TableDefinition — never inferred from a name.
    detailsColumn: detailsColumnOf(table) || null,
    childCollections: table.childCollections ?? [],
  }));
  // Carry each endpoint's kind so the planner can tell MDM<->MDM links (which become MDM row
  // relationships) apart from links that touch a non-MDM entity (which are seeded as a symbolic FK
  // on the non-MDM side). Display-only enrichment; the compiler/validator are unaffected.
  const kindOf = new Map(input.entities.map(entity => [entity.entityId, entity.kind]));
  const relationships = (input.relationships ?? []).map(rel => ({
    fromEntity: rel.fromEntity, fromKind: kindOf.get(rel.fromEntity) ?? 'unknown',
    toEntity: rel.toEntity, toKind: kindOf.get(rel.toEntity) ?? 'unknown',
    type: rel.type,
  }));
  const rules = (input.rules && input.rules.length)
    ? input.rules.map(rule => ({ ruleId: rule.ruleId, title: rule.title, description: rule.description, appliesTo: rule.appliesTo }))
    : input.ruleIds.map(ruleId => ({ ruleId }));
  const timeWindow = input.timeWindow ?? { start: SEED_WINDOW_START, end: SEED_WINDOW_END };
  // Pre-synthesized platform-user identities the planner can reference. These stand in for the
  // authenticated people (assignees, the actorSession worker on an event) — there is NO entity or
  // table to seed for them, so a worker/assignee FK must point at one of these refs.
  const actorIdentityRefs = actorIdentities(input).map(identity => ({ ref: identity.ref, name: identity.name, actorId: identity.actorId }));
  const catalog = options.catalog ?? [];
  const wave = options.wave ?? { index: 1, tableIds: input.tablePlans.map(table => table.tableId), mdmEntityIds: input.entities.filter(entity => entity.kind === 'mdm').map(entity => entity.entityId) };
  return [
    `## Module and language\n${JSON.stringify({ moduleName: input.moduleName, language: input.language, timeWindow })}`,
    `## Planning wave\n${JSON.stringify({ index: wave.index, tableIds: wave.tableIds, mdmEntityIds: wave.mdmEntityIds, estimatedOutputTokens: options.estimatedOutputTokens ?? undefined }, null, 2)}`,
    `## Entities from L4\n${JSON.stringify(entities, null, 2)}`,
    `## Local persistence tables\n${JSON.stringify(tables, null, 2)}`,
    `## Relationships from L4\n${JSON.stringify(relationships, null, 2)}`,
    ...(options.priorSummary ? [`## Scenario summary from earlier waves\n${options.priorSummary}`] : []),
    ...(catalog.length ? [`## Valid references from earlier waves\nUse these refs when needed; do not recreate their rows.\n${JSON.stringify(catalog, null, 2)}`] : []),
    `## Platform users (actor identities)\nThese identities already exist; reference them for any field that points to a platform user (an assignee, or a field resolved from the actor session such as a worker/owner id). Do NOT create a table or MDM entity for them.\n${JSON.stringify(actorIdentityRefs, null, 2)}`,
    ...(input.mdmRequiredTags?.length
      ? [`## ctx.mdm tags this module already calls\nGenerated usecases read these canonical tags through ctx.mdm.collection.listByType / entity.inactivate/reactivate. Plan mdmEntities rows for each. entityId is the BARE entity name (BusinessHours), never the tag (petShop.BusinessHours). Status Active, same keys as the local rows of that entity. Keep the local table rows.\n${JSON.stringify(input.mdmRequiredTags)}`]
      : []),
    `## L4 rules the scenario must satisfy (full text)\n${JSON.stringify(rules, null, 2)}`,
    '## Symbolic references\nUse only { "ref": "local:TableId.rowKey" }, { "ref": "mdm:EntityId.rowKey" } or { "ref": "actor:ActorId.key" } for foreign keys. Never emit UUIDs.',
    [
      '## Required result',
      'Plan ONLY the local tables and MDM entities listed in "Planning wave". Do not create rows for any other table/entity; reference earlier waves only through the supplied catalog.',
      'Keep this wave COMPACT but representative and below its output budget. Use these approximate caps (never just one row where several make the feature usable, never a huge dataset):',
      '- MDM/catalog entities: ~3-5 rows each.',
      '- Core/operational entities: ~2-4 rows each. When an entity lists `operatedStates`, seed ONE row per listed state of its status field (the validator rejects a wave that misses any). Also include at least one open/in-progress instance. You do NOT need every state × every filter combination — only the operated states.',
      ...(input.mdmRequiredTags?.length
        ? [`- MDM index for ctx.mdm: generated usecases already call listByType/lifecycle for ${JSON.stringify(input.mdmRequiredTags)}. For each of those tags, emit mdmEntities rows with entityId = the BARE entity name (BusinessHours), NEVER the tag (petShop.BusinessHours). The tag is the ctx.mdm type string only. Status Active, same keys as the local rows of that entity. Keep the local table rows too — both surfaces coexist. On each MDM row, \`name\` is the INDEX LABEL (not necessarily an entity field — Customer has fullName, not name). Other fields are the entity's. If name is absent, it is derived from fullName, title, or the row key.`]
        : []),
      '- Supporting/child entities: 1-2 children per parent.',
      '- Event entities: one row per operational row that would have produced it.',
      'A row is only usable if it is COMPLETE against its entity contract, not just its indexed columns: every non-indexed field goes in `details` (with a coherent value — a real number, not a placeholder) when the table reports a `detailsColumn`; when `detailsColumn` is null that table accepts ONLY real columns, so leave its `details` and `children` empty. For each name in that table\'s `childCollections` add a `children` entry whose `name` is EXACTLY that string (it is the entity\'s collection field, which is what reads the data back — do not substitute the child entity id or a plural of your own) with 1-2 rows. A parent whose child collection is empty makes the feature look broken (an order with no items), and a metric row whose numbers are absent breaks any consumer that formats them.',
      'Every timestamp must be an ISO 8601 UTC value strictly within the supplied timeWindow and chronologically coherent (a row is created before it is updated or transitions state).',
      'Relationships: model a relationship as an MDM row relationship ONLY when BOTH fromKind and toKind are "mdm", attaching any quantitative fields (quantities, ratios, per-unit amounts) as relationship metadata.',
      'Any relationship whose fromKind or toKind is NOT "mdm" (core/event/supporting) is seeded as a symbolic { "ref": "..." } foreign key on the NON-MDM side (the local table column or entity field that holds the id), following the relationship direction — never as an MDM row relationship. Example: Project(core) -manyToOne-> Client(mdm) becomes each Project row carrying its clientId as { "ref": "mdm:Client.<key>" }, not a relationship on the Client row.',
      'A foreign key that identifies a PLATFORM USER (an assignee such as an assigned worker, or an id resolved from the actor session like a worker/owner id) references a platform-user identity, NOT a module entity. Point it at one of the "Platform users (actor identities)" refs above ({ "ref": "actor:ActorId.key" }). Never invent a local table or MDM entity for people/workers/assignees.',
      'Satisfy every rule listed above, following its description.',
    ].join('\n'),
    ...(repairFindings.length ? [`## Repair findings from the prior plan\n${repairFindings.join('\n')}`] : []),
  ].join('\n\n');
}
