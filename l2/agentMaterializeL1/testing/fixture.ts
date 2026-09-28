/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/fixture.ts" enhancement="_blank"/>

/**
 * Memory harness of the certification fixture (m1_28). It runs the obligations of m1_27 against
 * the emitted code: per case, setup -> case -> cleanup in `finally`.
 * - Values come from the entity defs, the grants and the contract members; the plan
 *   (contracts/fixture.ts) says which data is local and which the runtime owns.
 * - Every id is made for this execution and registered; cleanup removes only registered ids,
 *   one by one, children first. No reset, no truncate, no delete by name.
 * - Identity in memory is the fixture actor id set on `sessionContext.actorId`, never a body
 *   member. The credential -> actor -> personEntity bridge is the runtime's; the runtime proof
 *   of every authenticated case stays pending with that owner.
 * - production/homologation are refused before any write (`decideProfile`).
 */

import { isRecord, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { dependencyOrder, type M1FixturePlan, type M1FixtureTarget } from '/_102021_/l2/agentMaterializeL1/contracts/fixture.js';
import { lifecycleStart } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { grantsOf } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { decideProfile } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import { obligationMiss, type M1Obligation, type M1ObligationObservation } from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';

export const M1_FIXTURE_RUN_SCHEMA = '2026-09-27-m1-fixture-run-v1' as const;
export const M1_RUNTIME_OWNER = 'runtime 102034' as const;

/** planned: plan read; materialized: values built; applied: records created and registered; tested: cases ran and cleanup left nothing. */
export type M1FixturePhase = 'refused' | 'planned' | 'materialized' | 'applied' | 'tested';

/** One emitted memory store. `remove` deletes one record by its exact key. */
export interface M1FixtureStore {
  create(record: Record<string, unknown>): Promise<unknown>;
  remove(id: string): Promise<boolean>;
  list(): Promise<unknown[]>;
}

export type M1RouteHandler = (input: {
  request: { routine: string; params: Record<string, unknown>; meta: { source: string; verifiedAuthorities: string[] } };
  ctx: unknown;
}) => Promise<{ data: unknown }>;

export interface M1FixtureHost {
  runId: string;
  mode: unknown;
  target: M1FixtureTarget;
  stores: Readonly<Record<string, M1FixtureStore>>;
  routes: ReadonlyMap<string, M1RouteHandler>;
  /** A fresh request context; the harness sets `sessionContext.actorId`. */
  context: () => { sessionContext: { actorId: string } };
}

export interface M1FixtureRecordRef {
  entityId: string;
  id: string;
  by: 'setup' | 'case';
}

export interface M1FixtureLedger {
  created: M1FixtureRecordRef[];
  removed: M1FixtureRecordRef[];
  /** Registered and still present after cleanup, or created by a case with no returned key. */
  residue: string[];
}

export interface M1FixtureCaseResult {
  caseId: string;
  memory: 'passed' | 'failed' | 'pending';
  /** Miss, failure or gap. Empty when passed. */
  detail: string;
  /** Owner of the gap when pending. */
  owner: string;
  runtime: 'pending';
  runtimeGap: string;
  runtimeOwner: typeof M1_RUNTIME_OWNER;
}

export interface M1FixtureReceipt {
  schemaVersion: typeof M1_FIXTURE_RUN_SCHEMA;
  runId: string;
  mode: string;
  target: M1FixtureTarget;
  phase: M1FixturePhase;
  refused: string;
  ledger: M1FixtureLedger;
  cases: M1FixtureCaseResult[];
}

interface EntityInfo {
  entityId: string;
  key: string;
  fields: Array<{ name: string; type: string; ref: string; derived: boolean }>;
  lifecycleField: string;
  initial: string;
  /** Record fields an own grant filters on, with the actor that owns the row through them. */
  ownFields: Array<{ field: string; actorRef: string }>;
}

export interface M1FixtureModel {
  plan: M1FixturePlan;
  entities: Map<string, EntityInfo>;
  /** Route -> entity of its usecase. */
  routeEntity: Map<string, string>;
  selectors: Set<string>;
}

type Value = { value: unknown } | { gap: string; owner: string };

/** Reads what the harness needs from the defs. Unknown shapes simply give no entity. */
export function fixtureModel(plan: M1FixturePlan, defs: ReadonlyMap<string, M1Definition>): M1FixtureModel {
  const entities = new Map<string, EntityInfo>();
  const scopes = [...defs.values()].filter(item => item.artifactType === 'accessScope');
  const own = scopes.flatMap(scope => grantsOf(scope.data)).flatMap(grant => grant.scopeMode === 'own' && grant.recordField ? [{ recordField: grant.recordField, actorRef: grant.actorRef }] : []);
  for (const definition of defs.values()) {
    if (definition.artifactType !== 'domainEntity') continue;
    const entityId = text(definition.data.entityId) || definition.artifactId;
    const fields = (Array.isArray(definition.data.fields) ? definition.data.fields.filter(isRecord) : []).map(field => ({
      name: text(field.name), type: text(field.type), ref: text(field.ref), derived: field.derived === true,
    })).filter(field => field.name);
    const key = fields.find(field => field.derived && field.type === 'uuid' && !field.name.includes('.'))?.name ?? '';
    const start = lifecycleStart(definition);
    const ownFields = own
      .filter(grant => fields.some(field => field.name === grant.recordField))
      .map(grant => ({ field: grant.recordField, actorRef: grant.actorRef }));
    entities.set(entityId, { entityId, key, fields, lifecycleField: start.field, initial: start.initial, ownFields: uniqueBy(ownFields, item => `${item.field}:${item.actorRef}`) });
  }
  const routeEntity = new Map<string, string>();
  const selectors = new Set<string>();
  const usecases = new Map([...defs.values()].filter(item => item.artifactType === 'usecase').map(item => [item.artifactId, item]));
  for (const controller of defs.values()) {
    if (controller.artifactType !== 'httpController') continue;
    for (const handler of Array.isArray(controller.data.handlers) ? controller.data.handlers.filter(isRecord) : []) {
      const usecase = usecases.get(text(handler.usecaseId));
      if (!usecase || !text(handler.route)) continue;
      routeEntity.set(text(handler.route), text(usecase.data.entityId));
      const uses = Array.isArray(usecase.data.uses) ? usecase.data.uses.filter(isRecord) : [];
      if (uses.some(use => use.role === 'selector' && use.source === 'input')) selectors.add(text(handler.route));
    }
  }
  return { plan, entities, routeEntity, selectors };
}

/** Actors of one execution: two of the same category with different rows, and one with no link. */
export function fixtureActors(runId: string, actorRef: string): { owner: string; other: string; member: string; none: string } {
  return { owner: `${runId}.${actorRef}.a`, other: `${runId}.${actorRef}.b`, member: `${runId}.${actorRef}.m`, none: '' };
}

/** Why a case cannot run in memory, or null. Derived from the plan and the defs, never from the case kind. */
export function memoryGap(model: M1FixtureModel, obligation: M1Obligation): { gap: string; owner: string } | null {
  const entityId = model.routeEntity.get(obligation.routine) ?? '';
  if (!model.plan.datasets.some(item => item.entityId === entityId)) {
    // The route reads or writes data the runtime owns (MDM record or the person of an actor).
    const need = model.plan.runtime.find(item => item.entityId === entityId);
    if (need) return { gap: `${need.supportId}: ${need.gap} (${obligation.routine} reads or writes ${entityId})`, owner: M1_RUNTIME_OWNER };
    return { gap: `FIXTURE_DATASET_UNPLANNED: ${obligation.routine} writes or reads ${entityId || '(unknown)'} and the plan has no dataset for it`, owner: 'L1' };
  }
  return null;
}

/**
 * Why a case cannot run in memory, including the values its body needs; null when the harness
 * can run it. Pure: reads the plan and the defs, writes nothing.
 */
export function classifyObligation(model: M1FixtureModel, obligation: M1Obligation): { gap: string; owner: string } | null {
  const blocked = memoryGap(model, obligation);
  if (blocked) return blocked;
  const order = dependencyOrder(model.plan.datasets);
  if (!order) return { gap: 'FIXTURE_CYCLE: local datasets reference each other in a cycle', owner: 'L1' };
  const built = materialize(model, order, 'plan', obligation);
  return 'gap' in built ? built : null;
}

/** Runtime proof: credential -> actor -> personEntity is not referenced; the item's gap says why. */
export function runtimeGap(plan: M1FixturePlan, obligation: M1Obligation): string {
  const identity = plan.runtime.find(item => item.kind === 'identity' && item.actorRefs.includes(obligation.actorRef));
  return identity ? `${identity.supportId}: ${identity.gap}` : `RUNTIME_TEST_IDENTITY_UNREFERENCED: no test identity is planned for ${obligation.actorRef}`;
}

/**
 * Setup -> case -> cleanup for every obligation, one execution each. Refused in production and
 * homologation, and for a target other than memory, before any write.
 */
export async function runFixture(model: M1FixtureModel, obligations: readonly M1Obligation[], host: M1FixtureHost): Promise<M1FixtureReceipt> {
  const profile = decideProfile(host.mode, true);
  const receipt: M1FixtureReceipt = {
    schemaVersion: M1_FIXTURE_RUN_SCHEMA,
    runId: host.runId,
    mode: profile.mode,
    target: host.target,
    phase: 'planned',
    refused: '',
    ledger: { created: [], removed: [], residue: [] },
    cases: [],
  };
  if (!profile.allowsSeeds) return { ...receipt, phase: 'refused', refused: `appEnv='${profile.mode}' refuses a certification fixture.` };
  if (host.target !== 'memory') {
    return { ...receipt, phase: 'refused', refused: `FIXTURE_TARGET_UNSUPPORTED: ${host.target} runs through the runtime profile of execBFF, not this harness.` };
  }
  if (!model.plan.targets.includes('memory')) return { ...receipt, phase: 'refused', refused: 'FIXTURE_TARGET_UNDECLARED: the plan does not declare memory.' };
  const order = dependencyOrder(model.plan.datasets);
  if (!order) return { ...receipt, phase: 'refused', refused: 'FIXTURE_CYCLE: local datasets reference each other in a cycle.' };
  let applied = false;
  let index = 0;
  for (const obligation of obligations) {
    const runtime = { runtime: 'pending' as const, runtimeGap: runtimeGap(model.plan, obligation), runtimeOwner: M1_RUNTIME_OWNER };
    const blocked = memoryGap(model, obligation);
    if (blocked) {
      receipt.cases.push({ caseId: obligation.caseId, memory: 'pending', detail: blocked.gap, owner: blocked.owner, ...runtime });
      continue;
    }
    index += 1;
    const runId = `${host.runId}.${index}`;
    const materialized = materialize(model, order, runId, obligation);
    if ('gap' in materialized) {
      receipt.cases.push({ caseId: obligation.caseId, memory: 'pending', detail: materialized.gap, owner: materialized.owner, ...runtime });
      continue;
    }
    if (receipt.phase === 'planned') receipt.phase = 'materialized';
    const ledger: M1FixtureLedger = { created: [], removed: [], residue: [] };
    let detail = '';
    try {
      await applyFixture(materialized.records, host.stores, ledger);
      applied = true;
      detail = obligationMiss(obligation, await observe(model, host, obligation, materialized, ledger));
    } catch (error) {
      detail = `FIXTURE_SETUP_FAILED: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      await cleanupFixture(ledger, host.stores);
    }
    receipt.ledger.created.push(...ledger.created);
    receipt.ledger.removed.push(...ledger.removed);
    receipt.ledger.residue.push(...ledger.residue);
    receipt.cases.push({ caseId: obligation.caseId, memory: detail ? 'failed' : 'passed', detail, owner: detail ? 'L1' : '', ...runtime });
  }
  if (applied) receipt.phase = 'applied';
  const ran = receipt.cases.filter(item => item.memory !== 'pending');
  if (applied && ran.length > 0 && ran.every(item => item.memory === 'passed') && receipt.ledger.residue.length === 0) receipt.phase = 'tested';
  return receipt;
}

export interface M1FixtureRecord {
  entityId: string;
  /** Key field; its value in the returned record is the registered id. */
  key: string;
  /** Local parents: field -> index of the parent record in this list, resolved to its returned id. */
  parents: Record<string, number>;
  values: Record<string, unknown>;
}

export interface M1FixtureInstance {
  runId: string;
  actors: { owner: string; other: string; member: string; none: string };
  records: M1FixtureRecord[];
  /** Index of the record the case addresses. */
  target: number;
  body: Record<string, unknown>;
}

/**
 * Creates the records in order and registers each returned id before the next one. A parent
 * field takes the id returned for its parent. A failure leaves the ledger with what was created.
 */
export async function applyFixture(records: readonly M1FixtureRecord[], stores: Readonly<Record<string, M1FixtureStore>>, ledger: M1FixtureLedger): Promise<string[]> {
  const ids: string[] = [];
  for (const record of records) {
    const store = stores[record.entityId];
    if (!store) throw new Error(`no memory store for ${record.entityId}`);
    const values = structuredClone(record.values);
    for (const [field, parent] of Object.entries(record.parents)) {
      const id = ids[parent];
      if (!id) throw new Error(`parent of ${record.entityId}.${field} was not created`);
      values[field] = id;
    }
    const returned = await store.create(values);
    const id = isRecord(returned) ? returned[record.key] : undefined;
    if (typeof id !== 'string' || !id) throw new Error(`${record.entityId} create returned no key`);
    ledger.created.push({ entityId: record.entityId, id, by: 'setup' });
    ids.push(id);
  }
  return ids;
}

/** Children first; each registered id once; a record already gone counts as removed. Safe to call twice. */
export async function cleanupFixture(ledger: M1FixtureLedger, stores: Readonly<Record<string, M1FixtureStore>>): Promise<void> {
  const done = new Set(ledger.removed.map(item => `${item.entityId}\u0000${item.id}`));
  for (const item of [...ledger.created].reverse()) {
    const mark = `${item.entityId}\u0000${item.id}`;
    if (done.has(mark)) continue;
    const store = stores[item.entityId];
    try {
      if (!store) throw new Error('no store');
      await store.remove(item.id);
      ledger.removed.push(item);
      done.add(mark);
    } catch (error) {
      ledger.residue.push(`${item.entityId}:${item.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function materialize(model: M1FixtureModel, order: ReturnType<typeof dependencyOrder> & object, runId: string, obligation: M1Obligation): M1FixtureInstance | { gap: string; owner: string } {
  const actors = fixtureActors(runId, obligation.actorRef);
  const records: M1FixtureRecord[] = [];
  const first = new Map<string, number>();
  for (const dataset of order) {
    const entity = model.entities.get(dataset.entityId);
    if (!entity || !entity.key) return { gap: `FIXTURE_ENTITY_UNREAD: ${dataset.entityId} has no entity def with a derived key`, owner: 'L1' };
    // Two rows with different owners when an own grant filters this entity; one row otherwise.
    const owners = entity.ownFields.length ? ['a', 'b'] : [''];
    for (const [slot, owner] of owners.entries()) {
      const values: Record<string, unknown> = {};
      const parents: Record<string, number> = {};
      for (const field of entity.fields) {
        if (field.name === entity.key) {
          values[field.name] = `${runId}.${dataset.entityId}.${slot + 1}`;
          continue;
        }
        const own = entity.ownFields.find(item => item.field === field.name);
        if (own) {
          const ids = fixtureActors(runId, own.actorRef);
          setPath(values, field.name, owner === 'a' ? ids.owner : ids.other);
          continue;
        }
        if (field.type === 'record' && field.ref && first.has(field.ref)) {
          parents[field.name] = first.get(field.ref) ?? -1;
          continue;
        }
        if (field.type === 'record' || field.type === 'object') continue;
        const value = typed(entity, field, false);
        if ('value' in value) setPath(values, field.name, value.value);
      }
      if (!first.has(dataset.entityId)) first.set(dataset.entityId, records.length);
      records.push({ entityId: dataset.entityId, key: entity.key, parents, values });
    }
  }
  const entityId = model.routeEntity.get(obligation.routine) ?? '';
  const target = first.get(entityId) ?? -1;
  const entity = model.entities.get(entityId);
  if (target < 0 || !entity) return { gap: `FIXTURE_DATASET_UNPLANNED: no record of ${entityId || '(unknown)'}`, owner: 'L1' };
  const body: Record<string, unknown> = {};
  const required = obligation.input.required.filter(path => !underOptional(path, obligation.input));
  for (const path of required) {
    if (obligation.input.omitted.includes(path) || obligation.input.omitted.some(item => path.startsWith(`${item}.`))) continue;
    if (required.some(other => other.startsWith(`${path}.`))) {
      if (getPath(body, path) === undefined) setPath(body, path, {});
      continue;
    }
    const value = bodyValue(model, entity, path, runId, target, first, obligation);
    if ('gap' in value) return value;
    setPath(body, path, value.value);
  }
  return { runId, actors, records, target, body };
}

function bodyValue(
  model: M1FixtureModel,
  entity: EntityInfo,
  path: string,
  runId: string,
  target: number,
  first: ReadonlyMap<string, number>,
  obligation: M1Obligation,
): Value {
  if (path === entity.key) return { value: `@${target}` };
  const field = entity.fields.find(item => item.name === path);
  if (!field) return { gap: `FIXTURE_VALUE_UNTYPED: ${obligation.routine} member ${path} is not a field of ${entity.entityId}`, owner: 'L1' };
  const own = entity.ownFields.find(item => item.field === path);
  // The row owner of that grant, whoever sends the body; identity itself never goes in the body.
  if (own) return { value: fixtureActors(runId, own.actorRef).owner };
  if (field.type === 'record') {
    if (field.ref && first.has(field.ref)) return { value: `@${first.get(field.ref)}` };
    const need = model.plan.runtime.find(item => item.entityId === field.ref);
    if (need) return { gap: `${need.supportId}: ${need.gap} (${obligation.routine} requires ${path})`, owner: M1_RUNTIME_OWNER };
    return { gap: `FIXTURE_REF_UNPLANNED: ${obligation.routine} requires ${path} -> ${field.ref || '(no ref)'} and no fixture item provides it`, owner: 'L1' };
  }
  // A required object whose members are all optional in the contract.
  if (field.type === 'object') return { value: {} };
  return typed(entity, field, true);
}

function typed(entity: EntityInfo, field: EntityInfo['fields'][number], required: boolean): Value {
  if (field.name === entity.lifecycleField) {
    return entity.initial ? { value: entity.initial } : { gap: `FIXTURE_VALUE_UNTYPED: ${entity.entityId}.${field.name} has no single initial state`, owner: 'L1' };
  }
  switch (field.type) {
    case 'integer':
    case 'number':
      return { value: 1 };
    case 'boolean':
      return { value: true };
    case 'text':
    case 'string':
      return { value: `fixture ${field.name.split('.').pop() ?? ''}`.trim() };
    case 'date':
      return { value: '2030-01-02' };
    case 'timestamp':
    case 'datetime':
      return { value: '2030-01-02T10:00:00.000Z' };
    case 'uuid':
      return { value: `fixture.${field.name}` };
    default:
      return required
        ? { gap: `FIXTURE_VALUE_UNTYPED: ${entity.entityId}.${field.name} is ${field.type || '(untyped)'}; no synthetic value is derived for it`, owner: 'L1' }
        : { gap: 'optional', owner: '' };
  }
}

async function observe(
  model: M1FixtureModel,
  host: M1FixtureHost,
  obligation: M1Obligation,
  instance: M1FixtureInstance,
  ledger: M1FixtureLedger,
): Promise<M1ObligationObservation> {
  const handler = host.routes.get(obligation.routine);
  if (!handler) throw new Error(`route ${obligation.routine} is not exported`);
  const byIndex = ledger.created.filter(item => item.by === 'setup').map(item => item.id);
  const params = resolveRefs(instance.body, byIndex) as Record<string, unknown>;
  const actorId = instance.actors[obligation.identity];
  const ctx = host.context();
  ctx.sessionContext.actorId = actorId;
  const entityId = model.routeEntity.get(obligation.routine) ?? '';
  const store = host.stores[entityId];
  // Every case, not only the mutating ones: code that wrongly accepts a refused write must not leave data unseen.
  const before = store ? new Set(keysOf(await store.list(), model.entities.get(entityId)?.key ?? '')) : null;
  let observation: M1ObligationObservation;
  try {
    const response = await handler({ request: { routine: obligation.routine, params, meta: { source: obligation.caller.source, verifiedAuthorities: [...obligation.caller.authorities] } }, ctx });
    observation = { ok: true, status: 200, errorCode: null, data: response.data, actorId };
  } catch (error) {
    const failure = error as { code?: string; statusCode?: number };
    observation = { ok: false, status: failure.statusCode ?? 500, errorCode: failure.code ?? String(error), data: undefined, actorId };
  }
  if (before && store) {
    // A record the case created is registered by its returned key; another new key is residue, never removed.
    const key = model.entities.get(entityId)?.key ?? '';
    const returned = isRecord(observation.data) && typeof observation.data[key] === 'string' ? observation.data[key] as string : '';
    const registered = new Set(ledger.created.map(item => item.id));
    if (returned && !before.has(returned) && !registered.has(returned)) ledger.created.push({ entityId, id: returned, by: 'case' });
    for (const id of keysOf(await store.list(), key)) {
      if (!before.has(id) && id !== returned && !registered.has(id)) ledger.residue.push(`${entityId}:${id}: created by the case with no returned key`);
    }
  }
  return observation;
}

function resolveRefs(value: unknown, ids: readonly string[]): unknown {
  if (typeof value === 'string' && /^@\d+$/.test(value)) return ids[Number(value.slice(1))] ?? value;
  if (Array.isArray(value)) return value.map(item => resolveRefs(item, ids));
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveRefs(item, ids)]));
  return value;
}

function underOptional(path: string, input: M1Obligation['input']): boolean {
  const parts = path.split('.');
  for (let size = 1; size < parts.length; size += 1) {
    const prefix = parts.slice(0, size).join('.');
    if (input.optional.includes(prefix)) return true;
  }
  return false;
}

function keysOf(rows: readonly unknown[], key: string): string[] {
  return rows.flatMap(row => isRecord(row) && typeof row[key] === 'string' ? [row[key] as string] : []);
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    if (!isRecord(node[part])) node[part] = {};
    node = node[part] as Record<string, unknown>;
  }
  node[parts[parts.length - 1] ?? path] = value;
}

function getPath(target: Record<string, unknown>, path: string): unknown {
  let node: unknown = target;
  for (const part of path.split('.')) {
    if (!isRecord(node)) return undefined;
    node = node[part];
  }
  return node;
}

function uniqueBy<T>(values: readonly T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter(value => {
    const mark = key(value);
    if (seen.has(mark)) return false;
    seen.add(mark);
    return true;
  });
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
