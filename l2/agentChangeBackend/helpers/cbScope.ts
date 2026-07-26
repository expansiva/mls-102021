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

/** Resolve the target module and filter every collection to it. The target is the explicit requested
 * module, else the first (sorted) module that has owners in the caller's requested statuses, else the
 * first module overall. A requested-but-absent module yields empty owners plus a warning (so the run
 * finishes cleanly with "no work" instead of silently spanning modules). Relationships are kept only
 * when BOTH endpoints are in-scope entities, so no seeded/generated artifact dangles across modules. */
export function scopeBackendScan(input: CbScopeInput): CbScopeResult {
  const pendingModules = [...new Set(input.owners.map(o => o.moduleName).filter(Boolean))].sort();
  const requested = input.requestedModule.trim();
  const moduleName = requested || pendingModules[0] || input.allModuleNames[0] || '';
  if (!moduleName) {
    return {
      moduleName: '',
      owners: input.owners, entities: input.entities, relationships: input.relationships,
      workspaces: input.workspaces, actors: input.actors, warning: null,
    };
  }
  const entities = input.entities.filter(e => e.moduleName === moduleName);
  const inScope = new Set(entities.map(e => e.entityId));
  const warning = (requested && !input.allModuleNames.includes(requested))
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
