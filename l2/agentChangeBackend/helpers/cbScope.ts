/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbScope.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure single-module scoping for a backend scan. A run targets exactly ONE module so each task stays
// small (a project may hold several modules). Type-only imports from cbShared (erased at build) keep
// this side-effect-free and unit-testable — the l2 test stub crashes on cbShared's libModel import.

import type { CbOwner, CbEntity, CbRelationship, CbWorkspace, CbActor } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';

export interface CbScopeInput {
  owners: CbOwner[];
  entities: CbEntity[];
  relationships: CbRelationship[];
  workspaces: CbWorkspace[];
  actors: CbActor[];
  allModuleNames: string[];
  /** Explicit target module (CLI arg or longMemory). Empty = auto: first sorted module with owners. */
  requestedModule: string;
}

/** One l4 owner or one todo entry, reduced to what reconciliation needs. */
export interface CbReconcileEntry { key: string; moduleName: string; }

export interface CbReconcileInput {
  l4Owners: CbReconcileEntry[];
  todoOwners: CbReconcileEntry[];
  /** Unreadable/invalid todo files, with the module the file belongs to. */
  todoErrors: Array<{ moduleName: string; message: string }>;
  /** Canonical target module; empty means auto-discovery (every module that HAS a todo). */
  targetModule: string;
}

export interface CbReconcileResult { errors: string[]; warnings: string[]; }

export interface CbScopeResult {
  moduleName: string;
  owners: CbOwner[];
  entities: CbEntity[];
  relationships: CbRelationship[];
  workspaces: CbWorkspace[];
  actors: CbActor[];
  warning: string | null;
}

/**
 * BACKFILL entity fields the ontology never declared, from the L4 owners' declared shapes.
 *
 * The e3 ontology writes `fields` for core/event/mdm entities but leaves a `kind: "metric"` entity with
 * NO fields at all (cafeFlow: ShiftClosingReport, OperationalDashboard, AiSalesSummary). Those entities
 * still become real aggregates — deriveAggregates promotes any entity an operation acts on as a root —
 * so they get a domain entity, a port, a table and seeds, all built from an EMPTY field list. The damage
 * observed in 102051:
 *   - seeds wrote only the FK/PK columns, leaving `details` (JSONB) empty, so getShiftClosingReport
 *     answered ok=true with just two ids (bug-shift-closing-report-payload.md) and getAiSalesSummary
 *     crashed on `dashboard.todaySalesTotal.toFixed(2)` (bug-ai-sales-summary.md);
 *   - validateSeedPlan could not object: it iterates `entity.fields`, which was empty;
 *   - and the domain entity only HAD its 14 fields because the pre-T5 generator let the LLM invent them
 *     from the L4 context. With T5 making that step deterministic (fields come from the scan), the next
 *     run would emit an EMPTY interface and break every usecase reading it.
 *
 * The authoritative source is already in L4 and machine-readable: every owner `outputShape` field (and
 * every operation input) carries `fieldRef: "<Entity>.<field>"` plus `type`/`required`. Reading those
 * back is deterministic — no LLM, no guessing. Only entities with NO ontology fields are touched, so a
 * properly-declared ontology is never overridden.
 */
export function backfillEntityFieldsFromOwners(entities: CbEntity[], owners: CbOwner[]): CbEntity[] {
  const declared = new Map<string, Map<string, Record<string, unknown>>>();
  const note = (fieldRef: unknown, type: unknown, required: unknown): void => {
    if (typeof fieldRef !== 'string') return;
    const [entityId, fieldId] = fieldRef.split('.');
    if (!entityId || !fieldId || fieldRef.split('.').length !== 2) return;
    const byField = declared.get(entityId) ?? new Map<string, Record<string, unknown>>();
    // First declaration wins, but a `required: true` sighting upgrades an earlier optional one: a field
    // that ANY contract declares mandatory must be seeded (validateSeedPlan then enforces it).
    const prev = byField.get(fieldId);
    if (prev) { if (required === true) prev.required = true; }
    else byField.set(fieldId, { fieldId, type: typeof type === 'string' ? type : 'string', required: required === true });
    declared.set(entityId, byField);
  };
  const walkOutputFields = (fields: unknown): void => {
    if (!Array.isArray(fields)) return;
    for (const field of fields) {
      if (!field || typeof field !== 'object') continue;
      const f = field as { fieldRef?: unknown; type?: unknown; required?: unknown; item?: unknown };
      note(f.fieldRef, f.type, f.required);
      const item = f.item as { fields?: unknown } | undefined;   // list/paginated item shape
      if (item) walkOutputFields(item.fields);
    }
  };
  for (const owner of owners) {
    const shape = owner.outputShape as { fields?: unknown } | undefined;
    if (shape) walkOutputFields(shape.fields);
    for (const input of owner.inputs ?? []) note(input.fieldRef, input.type, input.required);
  }

  return entities.map(entity => {
    if (Array.isArray(entity.fields) && entity.fields.length) return entity;   // ontology wins
    const byField = declared.get(entity.entityId);
    if (!byField || !byField.size) return entity;
    return { ...entity, fields: [...byField.values()] };
  });
}

/**
 * Entities are identified by MODULE + id. A project keeps the generations the generator left behind
 * and they share entity ids (34 of them between buildFlowFsm46 and 47), so deduping by id alone let
 * whichever file the store yielded last decide the module of a shared id — and the module scope then
 * dropped an entity its own module legitimately declares, quietly shortening the ontology.
 */
export function upsertEntity(entities: CbEntity[], entity: CbEntity): void {
  const existing = entities.find(e => e.entityId === entity.entityId && e.moduleName === entity.moduleName);
  if (existing) Object.assign(existing, entity);
  else entities.push(entity);
}

/**
 * Resolve a requested module name against the ones that exist. Module names are canonical camelCase
 * but are typed by hand ('buildFlowFSM47'), and an unmatched case used to filter everything to empty.
 */
export function resolveModuleName(requested: string, names: string[]): string {
  const wanted = requested.trim();
  if (!wanted) return '';
  return names.find(name => name.toLowerCase() === wanted.toLowerCase()) || wanted;
}

/**
 * Reconcile the l4 owners against the todo — FOR THE TARGET MODULE ONLY.
 *
 * A project accumulates modules the generator left behind (the ns4 iteration writes buildFlowFsm39…47
 * side by side, and only the last one has a todo). Reconciling project-wide killed a run whose target
 * module was intact, because a previous generation's 108 operations had no todo of their own. Those
 * are not this run's business: they become ONE warning per module and their owners simply never carry
 * a status, so nothing downstream can treat them as pending work.
 */
export function reconcileBackendTodo(input: CbReconcileInput): CbReconcileResult {
  const todoModules = new Set([...input.todoOwners, ...input.todoErrors].map(entry => entry.moduleName).filter(Boolean));
  // Without an explicit target, every module that has a todo is a target: that is exactly the set
  // auto-discovery can pick from.
  const isTarget = (moduleName: string): boolean =>
    input.targetModule ? moduleName === input.targetModule : todoModules.has(moduleName);

  const todoKeys = new Set(input.todoOwners.map(entry => entry.key));
  const l4Keys = new Set(input.l4Owners.map(entry => entry.key));
  const missing = input.l4Owners.filter(entry => !todoKeys.has(entry.key));
  const extra = input.todoOwners.filter(entry => !l4Keys.has(entry.key));

  const errors: string[] = [];
  const warnings: string[] = [];
  const onTarget = (entries: CbReconcileEntry[]) => entries.filter(entry => isTarget(entry.moduleName));
  const offTarget = (entries: CbReconcileEntry[], label: string) => {
    const byModule = new Map<string, number>();
    for (const entry of entries.filter(entry => !isTarget(entry.moduleName))) {
      byModule.set(entry.moduleName || 'unknown', (byModule.get(entry.moduleName || 'unknown') || 0) + 1);
    }
    for (const [moduleName, count] of [...byModule].sort()) warnings.push(`module ${moduleName}: ${count} ${label} — module outside this run, ignored`);
  };

  const missingOnTarget = onTarget(missing);
  const extraOnTarget = onTarget(extra);
  errors.push(...input.todoErrors.filter(entry => isTarget(entry.moduleName)).map(entry => entry.message));
  if (missingOnTarget.length) errors.push(`todoBackend missing l4 owner(s): ${missingOnTarget.map(entry => entry.key).slice(0, 12).join(', ')}`);
  if (extraOnTarget.length) errors.push(`todoBackend has owner(s) absent from l4: ${extraOnTarget.map(entry => entry.key).slice(0, 12).join(', ')}`);
  offTarget(missing, 'l4 owner(s) with no todoBackend');
  offTarget(extra, 'todoBackend owner(s) with no l4');
  for (const entry of input.todoErrors.filter(entry => !isTarget(entry.moduleName))) warnings.push(`${entry.message} (module outside this run, ignored)`);
  return { errors, warnings };
}

/** Resolve the target module and filter every collection to it. The target is the explicit requested
 * module, else the first (sorted) module that has owners in the caller's requested statuses, else the
 * first module overall. A requested-but-absent module yields empty owners plus a warning (so the run
 * finishes cleanly with "no work" instead of silently spanning modules). Relationships are kept only
 * when BOTH endpoints are in-scope entities, so no seeded/generated artifact dangles across modules. */
export function scopeBackendScan(input: CbScopeInput): CbScopeResult {
  const pendingModules = [...new Set(input.owners.map(o => o.moduleName).filter(Boolean))].sort();
  const requested = input.requestedModule.trim();
  // A module typed by hand ('buildFlowFSM47') must resolve to the canonical name the artifacts use,
  // or every collection filters to empty and the run reports "no work" for a module that has work.
  const canonical = resolveModuleName(requested, [...input.allModuleNames, ...pendingModules]);
  const moduleName = canonical || pendingModules[0] || input.allModuleNames[0] || '';
  if (!moduleName) {
    return {
      moduleName: '',
      owners: input.owners, entities: input.entities, relationships: input.relationships,
      workspaces: input.workspaces, actors: input.actors, warning: null,
    };
  }
  const entities = input.entities.filter(e => e.moduleName === moduleName);
  const inScope = new Set(entities.map(e => e.entityId));
  const warning = (requested && !input.allModuleNames.includes(canonical))
    ? `requested module '${requested}' not found in project modules [${input.allModuleNames.join(', ') || 'none'}]`
    : null;
  return {
    moduleName,
    owners: input.owners.filter(o => o.moduleName === moduleName),
    entities,
    relationships: input.relationships.filter(r => inScope.has(r.fromEntity) && inScope.has(r.toEntity)),
    workspaces: input.workspaces.filter(w => w.moduleName === moduleName),
    actors: input.actors.filter(a => a.moduleName === moduleName),
    warning,
  };
}
