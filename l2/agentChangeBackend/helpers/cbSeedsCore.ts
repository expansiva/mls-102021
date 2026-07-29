/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure seed-plan compiler. The LLM may choose a useful business scenario, but it never writes
// TypeScript: this module validates its JSON plan, resolves symbolic references to stable UUIDs
// and emits the runtime-discoverable TableSeedRows source.

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

export interface SeedFieldDefinition {
  fieldId: string;
  type: string;
  required: boolean;
  enumValues: string[];
}

export interface SeedEntityDefinition {
  entityId: string;
  title: string;
  kind: string;
  fields: SeedFieldDefinition[];
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

export interface SeedRuleDefinition {
  ruleId: string;
  title: string;
  description: string;
  appliesTo: string[];
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
 * filtered too, so unrelated definitions never inflate the planner context. */
export function seedPlanInputForWave(input: Omit<SeedBuildInput, 'plan'>, wave: SeedPlanningWave): Omit<SeedBuildInput, 'plan'> {
  const targetIds = new Set([...wave.tableIds, ...wave.mdmEntityIds]);
  const tableIds = new Set(wave.tableIds);
  const entities = input.entities.filter(entity => targetIds.has(entity.entityId));
  const rules = input.rules?.filter(rule => !rule.appliesTo.length || rule.appliesTo.some(id => targetIds.has(id)));
  return {
    ...input,
    entities,
    tablePlans: input.tablePlans.filter(table => tableIds.has(table.tableId)),
    relationships: (input.relationships ?? []).filter(rel => targetIds.has(rel.fromEntity) || targetIds.has(rel.toEntity)),
    rules,
    ruleIds: (rules ?? []).map(rule => rule.ruleId),
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

/** Reads either a completed or interrupted seed run from the persisted envelope. */
export function extractSeedPlanProgressFromSource(source: string): SeedPlanProgress | null {
  const start = source.indexOf(SEED_PLAN_START);
  const end = source.indexOf(SEED_PLAN_END);
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const raw = source.slice(start + SEED_PLAN_START.length, end).trim();
    const envelope = JSON.parse(raw) as UnknownRecord;
    if (!isRecord(envelope.plan)) return null;
    return {
      plan: parseSeedPlan(envelope.plan),
      partial: envelope.partial === true,
      completedWaveIndexes: arrayValue(envelope.completedWaveIndexes)
        .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
        .sort((left, right) => left - right),
    };
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
    return { tables, mdmEntities, reason: stringValue(skipped.reason) };
  } catch {
    return null;
  }
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

function mdmSubtypeFor(entityId: string): string {
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
    if (!definition || definition.kind !== 'mdm') {
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
        if (!field) errors.push(`${rowPath}.fields.${name}: unknown MDM entity field`);
        validateReference(value, `${rowPath}.fields.${name}`, references, errors);
        validateTimestamp(window, name, value, `${rowPath}.fields.${name}`, errors);
        validateEnum(field, value, `${rowPath}.fields.${name}`, errors);
        validateAssetReference(value, field, `${rowPath}.fields.${name}`, errors);
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
      const name = fields.get('name');
      if (typeof name !== 'string' || !name.trim()) errors.push(`${rowPath}: MDM rows require a readable name`);
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
  return [...new Set(errors)];
}

interface SeedAssetValueMarker { __agentCbSeedAsset: string; }

function resolveValue(value: SeedValue, ids: Map<string, string>): unknown {
  if (isSeedAssetRef(value)) return { __agentCbSeedAsset: value.asset } satisfies SeedAssetValueMarker;
  if (!isSeedReference(value)) return value;
  return ids.get(value.ref) ?? value.ref;
}

function seedSourceLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(
    /\{\s*"__agentCbSeedAsset"\s*:\s*"([A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*)"\s*\}/gu,
    (_match, assetId: string) => `seedAssetUrl(${JSON.stringify(assetId)})`,
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
    for (const row of entity.rows) ids.set(`mdm:${entity.entityId}.${row.key}`, stableUuid(`${input.moduleName}:mdm:${entity.entityId}:${row.key}`));
  }
  for (const identity of actorIdentities(input)) ids.set(identity.ref, identity.mdmId);
  return ids;
}

function buildLocalRows(input: SeedBuildInput, ids: Map<string, string>): Array<{ exportName: string; seedFor: string; rows: Record<string, unknown>[] }> {
  const plannedTables = planMap(input.plan.localTables, 'tableId');
  return input.tablePlans.map((table) => {
    const planned = plannedTables.get(table.tableId)!;
    const detailsColumn = detailsColumnOf(table);
    return {
      exportName: `${table.tableId.charAt(0).toLowerCase()}${table.tableId.slice(1)}Seeds`,
      seedFor: table.seedFor,
      rows: planned.rows.map((row) => {
        const columns = resolveFields(row.columns, ids);
        const details = resolveFields(row.details, ids);
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
  for (const entity of input.entities.filter(entity => entity.kind === 'mdm')) {
    const planned = plannedEntities.get(entity.entityId)!;
    const idField = entityIdField(entity);
    for (const row of planned.rows) {
      const mdmId = ids.get(`mdm:${entity.entityId}.${row.key}`)!;
      const fields = resolveFields(row.fields, ids);
      fields[idField] = mdmId;
      const name = String(fields.name);
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
  const planEnvelope = {
    version: 1, moduleName: input.moduleName, language: input.language,
    // Published so "no rows" is a documented decision, readable without re-running the generator.
    ...(input.skipped && (input.skipped.tables.length || input.skipped.mdmEntities.length) ? { skipped: input.skipped } : {}),
    plan: input.plan,
  };
  const lines = [
    `/// <mls fileReference="_${input.project}_/l1/${input.moduleName}/layer_1_external/adapters/persistence/seeds.ts" enhancement="_blank"/>`,
    '',
    `// Deterministic initial data for ${input.moduleName}. Scenario planned by agentCbSeeds; rows and ids compiled locally.`,
    '// TableSeedRows exports are discovered by shape and merged by the persistence registry.',
    '',
    SEED_PLAN_START,
    JSON.stringify(planEnvelope, null, 2),
    SEED_PLAN_END,
    '',
    seedAssetUrlsBlock({}, []),
    '',
    'function seedAssetUrl(assetId: string): string | null { return seedAssetUrls[assetId] ?? null; }',
    '',
    // The contracts import and the seed exports only exist when there ARE rows. An all-skipped module
    // (every wave gave up) must still emit a VALID module: no unused import, and `export {}` so the file
    // is unambiguously a module rather than a script whose top-level consts leak into the global scope.
    ...(blocks.length
      ? [`import type { TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';`, '']
      : ['export {};', '']),
    ...blocks.flatMap(block => [
      `export const ${block.exportName}: TableSeedRows = ${seedSourceLiteral({ seedFor: block.seedFor, rows: block.rows })};`,
      '',
    ]),
  ];
  return { errors: [], content: lines.join('\n'), summary };
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
    `## L4 rules the scenario must satisfy (full text)\n${JSON.stringify(rules, null, 2)}`,
    '## Symbolic references\nUse only { "ref": "local:TableId.rowKey" }, { "ref": "mdm:EntityId.rowKey" } or { "ref": "actor:ActorId.key" } for foreign keys. Never emit UUIDs.',
    [
      '## Required result',
      'Plan ONLY the local tables and MDM entities listed in "Planning wave". Do not create rows for any other table/entity; reference earlier waves only through the supplied catalog.',
      'Keep this wave COMPACT but representative and below its output budget. Use these approximate caps (never just one row where several make the feature usable, never a huge dataset):',
      '- MDM/catalog entities: ~3-5 rows each.',
      '- Core/operational entities: ~2-4 rows each, covering the MAIN lifecycle states and including at least one open/in-progress instance. You do NOT need every state × every filter combination.',
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
