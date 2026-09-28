/// <mls fileReference="_102021_/l2/agentMaterializeL1/contracts/fixture.ts" enhancement="_blank"/>

/**
 * Certification fixture plan (m1_28). One shape, one producer, two readers:
 * - producer: D1 support70 `emitSeeds`, from `backend.json.testSupport[]` (p1_12, v1.2) and the
 *   local tables persistence40 planned; written as `data.fixture` of the persistenceSeeds def;
 * - readers: M1 `emitPersistence` (renders it as `certificationFixture`, apart from the product
 *   seeds) and the memory harness `testing/fixture.ts` (setup, cases, cleanup).
 * The plan holds no rows, no ids and no grants. Values are derived by the harness from the
 * entity defs and the contracts at execution time. A runtime-owned item keeps its gap here.
 */

export const M1_FIXTURE_SCHEMA = '2026-09-27-m1-certification-fixture-v1' as const;
/** Declared destinations. `development` needs the runtime profile of execBFF; it is not run here. */
export const M1_FIXTURE_TARGETS = ['memory', 'development'] as const;
export type M1FixtureTarget = typeof M1_FIXTURE_TARGETS[number];

/** Module data the fixture creates, one per local table. */
export interface M1FixtureDataset {
  supportId: string;
  entityId: string;
  tableId: string;
  /** Local datasets whose ids this one references. Created first, removed last. */
  dependsOn: string[];
  sourceRefs: string[];
}

/** Test identity or MDM data the runtime owns. L1 does not create it and does not invent it. */
export interface M1FixtureRuntimeNeed {
  supportId: string;
  kind: 'identity' | 'mdm';
  entityId: string;
  actorRefs: string[];
  gap: string;
  owner: 'runtime';
}

export interface M1FixturePlan {
  schemaVersion: typeof M1_FIXTURE_SCHEMA;
  phase: 'plan';
  targets: M1FixtureTarget[];
  datasets: M1FixtureDataset[];
  runtime: M1FixtureRuntimeNeed[];
  /** testSupport items this plan could not place, with their reason. */
  gaps: string[];
}

interface SupportItem {
  id: string;
  owner: string;
  entityRefs: string[];
  actorRefs: string[];
  sourceRefs: string[];
  gap: string;
}

/**
 * Plan from testSupport and the live local tables. Deterministic; `null` when there is no
 * testSupport (a v1.1 backend plan), so the def stays as before.
 */
export function planFixture(testSupport: readonly unknown[] | undefined, tables: ReadonlyArray<{ tableId: string; entityId: string }>): M1FixturePlan | null {
  if (!testSupport || testSupport.length === 0) return null;
  const items = testSupport.map(supportItem).filter((item): item is SupportItem => item !== null);
  const gaps: string[] = [];
  if (items.length !== testSupport.length) gaps.push('TEST_SUPPORT_SHAPE: an item without id or owner was not placed');
  const local = new Map<string, string>();
  for (const item of items) {
    if (!item.id.startsWith('data:') || item.owner !== 'L1') continue;
    const entityId = item.id.slice('data:'.length);
    const table = tables.find(row => row.entityId === entityId);
    if (!table) {
      gaps.push(`FIXTURE_TABLE_UNPLANNED: ${item.id} has no local table`);
      continue;
    }
    local.set(entityId, table.tableId);
  }
  const datasets: M1FixtureDataset[] = [];
  const runtime: M1FixtureRuntimeNeed[] = [];
  for (const item of items) {
    const [kind, entity] = splitId(item.id);
    if (kind === 'data' && local.has(entity)) {
      datasets.push({
        supportId: item.id,
        entityId: entity,
        tableId: local.get(entity) ?? '',
        dependsOn: sorted(item.entityRefs.filter(ref => ref !== entity && local.has(ref))),
        sourceRefs: sorted(item.sourceRefs),
      });
      continue;
    }
    if ((kind === 'identity' || kind === 'mdm') && item.owner === 'runtime') {
      runtime.push({
        supportId: item.id,
        kind,
        entityId: kind === 'identity' ? item.entityRefs[0] ?? '' : entity,
        actorRefs: sorted(kind === 'identity' ? [entity] : item.actorRefs),
        gap: item.gap || `RUNTIME_UNREFERENCED: ${item.id} has no executor`,
        owner: 'runtime',
      });
      continue;
    }
    if (kind !== 'data') gaps.push(`TEST_SUPPORT_KIND: ${item.id} owner ${item.owner} is not placed`);
  }
  const cycle = dependencyOrder(datasets) === null;
  if (cycle) gaps.push('FIXTURE_CYCLE: local datasets reference each other in a cycle');
  return {
    schemaVersion: M1_FIXTURE_SCHEMA,
    phase: 'plan',
    targets: [...M1_FIXTURE_TARGETS],
    datasets: datasets.sort((left, right) => compare(left.entityId, right.entityId)),
    runtime: runtime.sort((left, right) => compare(left.supportId, right.supportId)),
    gaps: sorted(gaps),
  };
}

/** Reads `data.fixture` of a persistenceSeeds def. Anything else is refused with its issue. */
export function readFixturePlan(value: unknown): M1FixturePlan | { issues: string[] } {
  if (!isObject(value)) return { issues: ['fixture is not an object'] };
  if (value.schemaVersion !== M1_FIXTURE_SCHEMA) return { issues: [`fixture schema is '${String(value.schemaVersion ?? '')}', expected ${M1_FIXTURE_SCHEMA}`] };
  if (value.phase !== 'plan') return { issues: ['fixture phase must be plan'] };
  const issues: string[] = [];
  const targets = strings(value.targets).filter((item): item is M1FixtureTarget => (M1_FIXTURE_TARGETS as readonly string[]).includes(item));
  const datasets = Array.isArray(value.datasets) ? value.datasets.filter(isObject).map(item => ({
    supportId: String(item.supportId ?? ''),
    entityId: String(item.entityId ?? ''),
    tableId: String(item.tableId ?? ''),
    dependsOn: strings(item.dependsOn),
    sourceRefs: strings(item.sourceRefs),
  })) : [];
  if (datasets.some(item => !item.supportId || !item.entityId || !item.tableId)) issues.push('fixture dataset without supportId, entityId or tableId');
  const runtime = Array.isArray(value.runtime) ? value.runtime.filter(isObject).map(item => ({
    supportId: String(item.supportId ?? ''),
    kind: item.kind === 'identity' ? 'identity' as const : 'mdm' as const,
    entityId: String(item.entityId ?? ''),
    actorRefs: strings(item.actorRefs),
    gap: String(item.gap ?? ''),
    owner: 'runtime' as const,
  })) : [];
  if (runtime.some(item => !item.supportId || !item.gap)) issues.push('fixture runtime need without supportId or gap');
  if (issues.length) return { issues };
  return { schemaVersion: M1_FIXTURE_SCHEMA, phase: 'plan', targets, datasets, runtime, gaps: strings(value.gaps) };
}

/** Parents before children; `null` on a cycle. */
export function dependencyOrder(datasets: readonly M1FixtureDataset[]): M1FixtureDataset[] | null {
  const byEntity = new Map(datasets.map(item => [item.entityId, item]));
  const done = new Set<string>();
  const visiting = new Set<string>();
  const out: M1FixtureDataset[] = [];
  const visit = (item: M1FixtureDataset): boolean => {
    if (done.has(item.entityId)) return true;
    if (visiting.has(item.entityId)) return false;
    visiting.add(item.entityId);
    for (const parent of item.dependsOn) {
      const found = byEntity.get(parent);
      if (found && !visit(found)) return false;
    }
    visiting.delete(item.entityId);
    done.add(item.entityId);
    out.push(item);
    return true;
  };
  for (const item of [...datasets].sort((left, right) => compare(left.entityId, right.entityId))) {
    if (!visit(item)) return null;
  }
  return out;
}

function supportItem(value: unknown): SupportItem | null {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id || typeof value.owner !== 'string') return null;
  return {
    id: value.id,
    owner: value.owner,
    entityRefs: strings(value.entityRefs),
    actorRefs: strings(value.actorRefs),
    sourceRefs: strings(value.sourceRefs),
    gap: typeof value.gap === 'string' ? value.gap : '',
  };
}

function splitId(id: string): [string, string] {
  const at = id.indexOf(':');
  return at < 0 ? ['', id] : [id.slice(0, at), id.slice(at + 1)];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function sorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compare);
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
