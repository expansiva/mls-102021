/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Shared plumbing for the agentChangeBackend flow (Stage 3 backend reconciler, v1 autonomous
// create-only). Backend-specific logic (l4 scan + l5 todoBackend status, aggregate derivation,
// JSONB persistence plan, l1 file-info builders) lives here. The generic planner/LLM-envelope helpers
// live in helpers/cbPlanner.ts so this agent no longer depends on removed agentNewSolution2 files.

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  createPlannerToolSchema,
  extractPlannerOutput,
  isRecord,
  parseMaybeJson,
  assertRecord,
  assertArray,
  assertString,
  optionalString,
  optionalStringArray,
  type PlannerExtractConfig,
  type PlannerOutput,
} from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import {
  parseDefsSource, replaceDefsValue, handlerKindOf, entityKindOf, isEntityLifecycle, type CbEntityKind,
} from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
import {
  parseWorkspaceDefs, readAccessMatrixActors, readModuleActors, readActorsField,
  type CbWorkspace, type CbActor,
} from '/_102021_/l2/agentChangeBackend/helpers/cbWorkspace.js';

export {
  parseDefsSource, replaceDefsValue, handlerKindOf, entityKindOf, isEntityLifecycle,
};
export type { CbEntityKind };

export {
  createPlannerToolSchema,
  extractPlannerOutput,
  isRecord,
  parseMaybeJson,
  assertRecord,
  assertArray,
  assertString,
  optionalString,
  optionalStringArray,
};
export type { PlannerExtractConfig, PlannerOutput };

/** Loose planner config: validates the envelope and returns the `result` object as a record. Each
 * agent reads the array property it expects (items/aggregates/tables/...). */
export function plannerConfig(toolName: string): PlannerExtractConfig<Record<string, unknown>> {
  return { toolName, normalizeResult: (value: unknown) => assertRecord(value, 'result') };
}

/** Wrap a single-artifact result schema into a batch `{ items: [...] }` schema for one-call-per-layer
 * generation (v1 processes a whole layer in one LLM call instead of a parallel_dynamic fan-out). */
export function batchSchema(itemSchema: Record<string, unknown>): Record<string, unknown> {
  return { type: 'object', additionalProperties: false, required: ['items'], properties: { items: { type: 'array', items: itemSchema } } };
}

export function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export type ExecutionMode = 'sequential' | 'parallel_static' | 'parallel_dynamic' | 'manual_later';
export type OwnerStatus = 'toCreate' | 'toUpdate' | 'toRemove' | 'inProgress' | 'done';
// The SINGLE source of truth for "every owner status" (T10/A1). Use it whenever the question is about
// OWNERSHIP or STRUCTURE — "does this artifact belong to a current owner?", "which module is this?" —
// because the gen-http `done` flip empties a ['toCreate','inProgress'] scan and such a check would then
// conclude that everything the run just generated is an orphan (erro5). Keep the pending-filtered scan
// only where the question really is "what is still PENDING?".
// Do NOT re-declare this list locally: three copies used to exist (root, gen-http, here) and a drift
// between them would make the ownership checks diverge silently.
// `readonly`: now that a SINGLE array instance is shared by every caller, an in-place mutation
// (push/sort/splice) would silently change what every ownership check sees.
export const ALL_STATUSES: readonly OwnerStatus[] = ['toCreate', 'toUpdate', 'toRemove', 'inProgress', 'done'];
export type EntityKind = CbEntityKind;
export type L4ContextSource =
  | 'userInput'
  | 'actorSession'
  | 'businessContext'
  | 'currentWorkspace'
  | 'selectedEntity'
  | 'activeLifecycleInstance'
  | 'workflowState'
  | 'routeParam'
  | 'previousStepOutput'
  | 'systemDefault';

// Persistence intent for kind:"event" entities (set by the stage-1 solution agent). Drives whether Stage 3
// gives the event a durable table (telemetry/audit) or routes it to the outbox (reaction).
export type EventPurpose = 'telemetry' | 'audit' | 'reaction';
export interface EventPolicy { purpose: EventPurpose; retentionDays?: number; }
export const DEFAULT_EVENT_RETENTION_DAYS = 90; // telemetry default when the ontology omits it

export type CbFileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

// ── domain model of a scan ─────────────────────────────────────────────────────

export interface CbAccessPattern {
  kind: string;
  description: string;
  entity?: string;
  keyField?: string;
  filters?: string[];
  sort?: string[];
  pagination?: string;
  selection?: string;
  output?: string[];
}

// Canonical output structure declared by l4 (agentNewSolution3 e5 outputShape). The usecase output
// TYPE is pinned to this (Option 3) so it never re-drifts, and the frontend contract copies the same
// l4 shape — neither master re-infers. Mirrors Ns3E5OutputShape/OutputField.
export interface CbOutputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  fieldRef?: string;
  item?: { fields: CbOutputField[] };
}

export interface CbOutputShape {
  kind: 'object' | 'list' | 'paginated';
  fields: CbOutputField[];
}

export interface CbOperationInput {
  inputId: string;
  fieldRef: string;
  /** l4 v2 (N1b): every input declares an explicit `type` OR a `fieldRef` — so the usecase/contract
   * input is 100% derivable without re-inferring free inputs (page/pageSize/minPrice) from prose. */
  type?: string;
  required: boolean;
  source: string;
  description: string;
}

export interface CbContextResolution {
  inputId?: string;
  targetRef: string;
  source: string;
  originRef: string;
  description: string;
}

export interface CbOwner {
  kind: 'operation' | 'workflow';
  id: string;
  pageId: string;
  commandName: string;
  bffName: string;
  title: string;
  entity: string;
  opKind: string;            // operation CRUD/intent kind: create|update|query|view|... (l4 operation.kind)
  /** Actors allowed on this operation. l4 v2 declares `actors: string[]`; v1 `actor: string` (folded to a 1-array). */
  actors: string[];
  reads: string[];
  writes: string[];
  rulesApplied: string[];
  accessPattern?: CbAccessPattern;
  /** Canonical output structure from l4 (Option 3): the usecase output type is pinned to this. */
  outputShape?: CbOutputShape;
  inputs: CbOperationInput[];
  contextResolution: CbContextResolution[];
  acceptanceAssertions: string[];
  /** Status from l5/{module}/todoBackend.defs.ts. This is the only source of generation state. */
  todoStatus: string;
  /** Deprecated compatibility alias for prompts that still print owners as statusBackend. */
  statusBackend: string;
  /** Legacy inline status read from l4 only to warn about divergence; never used for decisions. */
  inlineStatusBackend: string;
  moduleName: string;
}

export interface CbEntity {
  entityId: string;
  title: string;
  kind: EntityKind;
  ownership: string;
  moduleName: string;
  fields?: Record<string, unknown>[];
  eventPolicy?: EventPolicy; // only for kind === 'event'
}

export interface CbRelationship {
  fromEntity: string;
  toEntity: string;
  type: string; // oneToMany | manyToOne | oneToOne
}

export interface CbAggregate {
  aggregateId: string;       // = rootEntity
  rootEntity: string;
  embeddedMembers: string[]; // supporting entities folded into the root details JSONB
  events: string[];          // event entities written alongside (own append-only tables)
  mdmRefs: string[];         // mdm entities read via 102034 (no local table)
}

// A kind:"event" entity that needs end-to-end wiring (domain entity + append-only port + table +
// adapter + a write from the owner's usecase). `persisted` is false only for reaction events, which
// are delivered through the platform outbox instead of a local table.
export interface CbEventTarget {
  entityId: string;
  ownerEntity: string;       // the core entity this event belongs to (from relationships)
  purpose: EventPurpose;
  retentionDays?: number;    // undefined = permanent (audit) or n/a (reaction)
  persisted: boolean;        // telemetry/audit -> true (own table); reaction -> false (outbox)
  fields?: Record<string, unknown>[];
}

// l4 v2 workspace/bffCall model + pure parsers live in cbWorkspace.ts (side-effect-free so they stay
// unit-testable — cbShared's libStor->libModel import crashes the l2 test stub). Re-exported here so
// downstream steps keep importing the v2 model from cbShared.
export type {
  CbBffCallInput, CbBffCallOutputField, CbBffCallOutput, CbBffCallUse, CbBffCall, CbWorkspace, CbActor,
} from '/_102021_/l2/agentChangeBackend/helpers/cbWorkspace.js';

import { CB_PHASES, reconcileBackendTodo, resolveModuleName, scopeBackendScan, upsertEntity, backfillEntityFieldsFromOwners, type CbPhaseKey } from '/_102021_/l2/agentChangeBackend/helpers/cbScope.js';
export { CB_PHASES } from '/_102021_/l2/agentChangeBackend/helpers/cbScope.js';
export type { CbPhaseKey } from '/_102021_/l2/agentChangeBackend/helpers/cbScope.js';
import { promptSizeError } from '/_102021_/l2/agentChangeBackend/helpers/cbPromptBudget.js';

export interface CbScan {
  project: number;
  moduleNames: string[];
  owners: CbOwner[];          // todoBackend status in requested statuses
  entities: CbEntity[];
  relationships: CbRelationship[];
  aggregates: CbAggregate[];  // derived baseline (the LLM index may refine)
  events: CbEventTarget[];    // kind:"event" entities, classified by eventPolicy
  workspaces: CbWorkspace[];  // l4 v2 only (empty for v1 modules) — the l1 contracts are GENERATED from these
  actors: CbActor[];          // module actors.defs.ts (l4 v2); empty for v1 folder-based actors
  siteMaps: Record<string, Record<string, unknown>>; // moduleName -> siteMap/navigation raw (best-effort view)
  warnings: string[];
}

// ── deterministic l4 scan ──────────────────────────────────────────────────────

export async function readBackendScan(statuses: readonly string[] = ['toCreate'], context?: mls.msg.ExecutionContext, targetModuleOverride?: string): Promise<CbScan> {
  const wanted = new Set(statuses);
  const project = mls.actualProject || 0;
  const moduleNames = new Set<string>();
  const entityToModule = new Map<string, string>();
  const entities: CbEntity[] = [];
  const relationships: CbRelationship[] = [];
  const rawOwners: { kind: 'operation' | 'workflow'; obj: Record<string, unknown>; moduleName?: string }[] = [];
  const workspaces: CbWorkspace[] = [];
  const actorsList: CbActor[] = [];
  const siteMaps: Record<string, Record<string, unknown>> = {};
  const siteMapSource: Record<string, 'siteMap' | 'navigation'> = {};
  const warnings: string[] = [];

  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    const shortName = String(file.shortName || '');
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed)) continue;
    // l4 layout: v1 keeps operations/workflows flat at the l4 root; v2 nests everything under `<module>/`.
    const nestedModule = folder.includes('/') ? folder.split('/')[0] : '';

    if (folder === 'operations' || folder.endsWith('/operations')) {
      rawOwners.push({ kind: 'operation', obj: parsed, moduleName: nestedModule || undefined });
    } else if (folder === 'workflows' || folder.endsWith('/workflows')) {
      // ns4 workflows are entity lifecycles (states/transitions), not units of generation: nothing
      // in the todo owns them, so treating them as owners would fail the scan on missing owners.
      if (!isEntityLifecycle(parsed)) rawOwners.push({ kind: 'workflow', obj: parsed, moduleName: nestedModule || undefined });
    } else if (folder.endsWith('/workspaces')) {
      // l4 v2 only: the workspace declares the page's bffCalls (controller source — see B4).
      const ws = parseWorkspaceDefs(parsed, nestedModule);
      if (ws) { workspaces.push(ws); if (ws.moduleName) moduleNames.add(ws.moduleName); }
    } else if (shortName === 'access-matrix' || folder.endsWith('/access')) {
      // ns4: the module audience lives in the access matrix instead of a dedicated actors file.
      const moduleName = readString(parsed.moduleName) || folder.split('/')[0];
      for (const a of readAccessMatrixActors(parsed, moduleName)) actorsList.push(a);
    } else if (shortName === 'actors' && folder && !folder.includes('/')) {
      // l4 v2 module actors file: `l4/<module>/actors.defs.ts` (folder === moduleName; actors are objects).
      const moduleName = readString(parsed.moduleName) || folder;
      for (const a of readModuleActors(parsed, moduleName)) actorsList.push(a);
    } else if ((shortName === 'siteMap' || shortName === 'navigation') && folder && !folder.includes('/')) {
      // Prefer siteMap (post-P7); navigation is the pre-P7 fallback. Kept as a raw view for menu/register.
      const moduleName = readString(parsed.moduleName) || folder;
      if (siteMapSource[moduleName] !== 'siteMap') {
        siteMaps[moduleName] = parsed;
        siteMapSource[moduleName] = shortName === 'siteMap' ? 'siteMap' : 'navigation';
      }
    } else if (shortName === 'module' && folder && !folder.includes('/')) {
      const moduleName = readString((isRecord(parsed.module) ? parsed.module : parsed).moduleName) || folder;
      moduleNames.add(moduleName);
      collectModuleOntology(parsed, moduleName, entities, entityToModule, relationships);
    } else if (folder.endsWith('/ontology')) {
      const moduleName = folder.split('/')[0];
      // ns4 keeps the relationship graph in the ontology index; it is an index, never an entity.
      if (shortName === 'index') {
        if (moduleName) { moduleNames.add(moduleName); collectOntologyRelationships(parsed, relationships); }
        continue;
      }
      // Older generators name the entity only by the file; ns4 always declares `entityId`.
      const entityId = readString(parsed.entityId) || shortName;
      if (moduleName && entityId) {
        moduleNames.add(moduleName);
        entityToModule.set(entityId, moduleName);
        const declaredKind = readString(parsed.kind);
        const ownership = readString(parsed.ownership) || 'moduleOwned';
        const kind = entityKindOf(declaredKind, ownership);
        // The mapping is a DECISION about a foreign vocabulary, so it is visible in the scan trace
        // instead of only in the code (same treatment as the projection mapping).
        if (declaredKind && declaredKind !== kind) {
          warnings.push(`entity ${entityId}: l4 kind '${declaredKind}' (${ownership}) read as '${kind}'`);
        }
        upsertEntity(entities, {
          entityId,
          title: readString(parsed.title) || entityId,
          kind,
          ownership,
          moduleName,
          fields: Array.isArray(parsed.fields) ? parsed.fields.filter(isRecord) : undefined,
          eventPolicy: readEventPolicy(parsed.eventPolicy),
        });
      }
    }
  }

  const moduleFallback = moduleNames.size === 1 ? Array.from(moduleNames)[0] : 'unknown';
  const allOwners = rawOwners
    // v2 knows the module from the folder (`<module>/operations`); v1 (flat) derives it from the entity.
    .map(({ kind, obj, moduleName }) => ownerFrom(kind, obj, entityToModule, moduleFallback, moduleName))
    .filter((o): o is CbOwner => !!o);
  const todoState = await readBackendTodoState(project);
  for (const moduleName of todoState.moduleNames) moduleNames.add(moduleName);

  // The target module is resolved BEFORE reconciliation. A project keeps the modules the generator
  // left behind (ns4 writes buildFlowFsm39…47 side by side and only the last has a todo), and
  // reconciling project-wide killed a run whose own module was intact.
  const requestedModule = (targetModuleOverride && targetModuleOverride.trim())
    || (context ? readTargetModule(context) : '');
  const targetModule = resolveModuleName(requestedModule, Array.from(moduleNames).sort());
  const ownersOfTarget = (moduleName: string): boolean => targetModule
    ? moduleName === targetModule
    : todoState.filesByModule.has(moduleName) || todoState.moduleNames.includes(moduleName);
  if (rawOwners.length > 0 && !todoState.files && (!targetModule || allOwners.some(owner => owner.moduleName === targetModule))) {
    throw new Error('l5/{module}/todoBackend.defs.ts not found; backend generation status must come from todoBackend, not inline l4 statusBackend.');
  }
  for (const owner of allOwners) {
    const todoOwner = todoState.ownersByKey.get(ownerKey(owner));
    if (!todoOwner) continue;
    owner.todoStatus = todoOwner.status;
    owner.statusBackend = todoOwner.status;
    // The todo only NAMES the module for the flat v1 layout, where the owner has none of its own.
    // Overwriting a folder-derived module made a previous generation's operation (ids repeat across
    // ns4 generations) claim the target module and join the run as if it belonged to it.
    if (!owner.moduleName || owner.moduleName === 'unknown') owner.moduleName = todoOwner.moduleName || owner.moduleName;
    if (owner.inlineStatusBackend && owner.inlineStatusBackend !== todoOwner.status) {
      warnings.push(`${owner.kind}:${owner.id} inline statusBackend=${owner.inlineStatusBackend} ignored; todoBackend=${todoOwner.status}`);
    }
  }
  const reconciliation = reconcileBackendTodo({
    l4Owners: allOwners.map(owner => ({ key: ownerKey(owner), moduleName: owner.moduleName })),
    todoOwners: [...todoState.ownersByKey.entries()].map(([key, owner]) => ({ key, moduleName: owner.moduleName })),
    todoErrors: todoState.errors,
    targetModule,
  });
  if (reconciliation.errors.length) throw new Error(reconciliation.errors.join('; '));
  warnings.push(...reconciliation.warnings, ...todoState.warnings);
  // An owner of a module with no todo never carries a status, so it can never be pending work.
  const owners = allOwners.filter(o => wanted.has(o.todoStatus) && ownersOfTarget(o.moduleName));

  // Roots that operations own (entity + writes) across ALL operations regardless of status — the
  // aggregate boundaries must be stable even when only some owners are pending (toCreate).
  const operatedRootIds = new Set<string>();
  for (const { obj, moduleName } of rawOwners) {
    // Owners of another module never shape THIS module's aggregates: an entity only some previous
    // generation operates would otherwise get an entity, a port, a table and seeds it has no use for.
    if (moduleName && !ownersOfTarget(moduleName)) continue;
    const e = readString(obj.entity);
    if (e) operatedRootIds.add(e);
    for (const w of readStringArray(obj.writes)) operatedRootIds.add(w);
  }

  // ── single-module scope ────────────────────────────────────────────────────────
  // A run targets exactly ONE module so each task stays small (a project may hold several modules).
  // The target is the explicit CLI module (an override arg, or the value the root persisted in the
  // task longMemory), else the first (sorted) module that has owners in the requested statuses.
  // Every downstream step reads the SAME target — moduleNames[0] and only that module's owners,
  // entities, relationships, workspaces and actors — so the pipeline never spans modules. Pure
  // filtering lives in cbScope (unit-tested there).
  const allModuleNames = Array.from(moduleNames).sort();
  const scoped = scopeBackendScan({ owners, entities, relationships, workspaces, actors: actorsList, allModuleNames, requestedModule: targetModule });
  if (scoped.warning) warnings.push(scoped.warning);

  // An ontology entity with NO fields (every `kind: "metric"` one in cafeFlow) still becomes a real
  // aggregate with a domain entity, table and seeds — all built from an empty field list, which is what
  // left getShiftClosingReport answering with two ids and getAiSalesSummary crashing on .toFixed(). The
  // L4 owner shapes already declare those fields via `fieldRef`, so recover them deterministically
  // BEFORE aggregates/events/seed planning read `entities`. Ontology-declared fields always win.
  const backfilled = backfillEntityFieldsFromOwners(scoped.entities, scoped.owners);
  for (const entity of backfilled) {
    const original = scoped.entities.find(e => e.entityId === entity.entityId);
    if (original && original !== entity) {
      warnings.push(`entity '${entity.entityId}' declares no fields in the ontology; ${entity.fields?.length ?? 0} field(s) recovered from l4 owner shapes`);
    }
  }
  const aggregates = deriveAggregates(backfilled, scoped.relationships, operatedRootIds);
  const events = deriveEventTargets(backfilled, scoped.relationships);
  // NB: the l4 contracts (`.ts`) are NEVER read here — l4 holds only `.defs.ts` (a `.ts` in l4 is not
  // compilable and getContent on it 422s). The l1 contracts are GENERATED from `workspaces` (gen-http).
  return {
    project, moduleNames: scoped.moduleName ? [scoped.moduleName] : allModuleNames,
    owners: scoped.owners, entities: backfilled, relationships: scoped.relationships,
    aggregates, events, workspaces: scoped.workspaces, actors: scoped.actors, siteMaps, warnings,
  };
}

interface CbTodoOwner {
  ownerType: 'operation' | 'workflow';
  ownerId: string;
  status: string;
  moduleName: string;
}

/**
 * The generator names the unit of backend work in its own vocabulary. ns4 calls it `useCase` and
 * stores the status in `statusBackend`; ns/ns3 called it `operation` with `status`. The ids are the
 * same operation ids either way, so the alias is a translation, never a second owner model.
 */
const TODO_OWNER_TYPE_ALIASES: Record<string, 'operation' | 'workflow'> = { operation: 'operation', workflow: 'workflow', useCase: 'operation' };
const TODO_STATUS_FIELDS = ['status', 'statusBackend'] as const;

function todoOwnerType(raw: string): 'operation' | 'workflow' | '' {
  return TODO_OWNER_TYPE_ALIASES[raw] || '';
}
/** The field the file actually uses, so the write-back lands where the read came from. */
function todoStatusField(raw: Record<string, unknown>): typeof TODO_STATUS_FIELDS[number] | '' {
  return TODO_STATUS_FIELDS.find(field => typeof raw[field] === 'string') || '';
}

interface CbTodoState {
  files: number;
  /** The l5 folder of each todo file, so an unreadable one can be attributed to its module. */
  filesByModule: Set<string>;
  moduleNames: string[];
  ownersByKey: Map<string, CbTodoOwner>;
  warnings: string[];
  errors: Array<{ moduleName: string; message: string }>;
}

function ownerKey(owner: Pick<CbOwner, 'kind' | 'id'>): string {
  return `${owner.kind}:${owner.id}`;
}

function todoOwnerKey(ownerType: string, ownerId: string): string {
  return `${ownerType}:${ownerId}`;
}

async function readBackendTodoState(project: number): Promise<CbTodoState> {
  const ownersByKey = new Map<string, CbTodoOwner>();
  const moduleNames = new Set<string>();
  const warnings: string[] = [];
  const errors: Array<{ moduleName: string; message: string }> = [];
  const filesByModule = new Set<string>();
  let files = 0;
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoBackend') continue;
    files++;
    filesByModule.add(String(file.folder || ''));
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed)) {
      errors.push({ moduleName: String(file.folder || ''), message: `invalid todoBackend defs at l5/${String(file.folder || '')}/todoBackend.defs.ts` });
      continue;
    }
    const layer = readString(parsed.layer);
    if (layer && layer !== 'backend') warnings.push(`todoBackend ${String(file.folder || '')} has layer=${layer}; treating as backend by filename`);
    const moduleName = readString(parsed.moduleName) || String(file.folder || '');
    if (moduleName) moduleNames.add(moduleName);
    const owners = Array.isArray(parsed.owners) ? parsed.owners.filter(isRecord) : [];
    for (const raw of owners) {
      const ownerType = todoOwnerType(readString(raw.ownerType));
      const ownerId = readString(raw.ownerId);
      const status = readString(raw[todoStatusField(raw) || 'status']);
      if (!ownerType || !ownerId) {
        errors.push({ moduleName, message: `todoBackend ${moduleName || String(file.folder || '')} has invalid owner entry` });
        continue;
      }
      if (!isOwnerStatus(status)) {
        errors.push({ moduleName, message: `todoBackend ${moduleName || String(file.folder || '')}/${ownerType}:${ownerId} has invalid status "${status}"` });
        continue;
      }
      const key = todoOwnerKey(ownerType, ownerId);
      if (ownersByKey.has(key)) warnings.push(`duplicate todoBackend owner ${key}; first entry kept`);
      else ownersByKey.set(key, { ownerType, ownerId, status, moduleName });
    }
  }
  return { files, filesByModule, moduleNames: Array.from(moduleNames).sort(), ownersByKey, warnings, errors };
}

// Derived from ALL_STATUSES so the list lives in exactly ONE place (it used to be spelled out here too).
function isOwnerStatus(status: string): status is OwnerStatus {
  return (ALL_STATUSES as readonly string[]).includes(status);
}

// Read the optional event classification from an ontology def (shape-safe; ignores malformed input).
function readEventPolicy(value: unknown): EventPolicy | undefined {
  if (!isRecord(value)) return undefined;
  const purpose = readString(value.purpose) as EventPurpose;
  if (purpose !== 'telemetry' && purpose !== 'audit' && purpose !== 'reaction') return undefined;
  const retentionDays = typeof value.retentionDays === 'number' ? value.retentionDays : undefined;
  return retentionDays === undefined ? { purpose } : { purpose, retentionDays };
}

// Turn every kind:"event" entity into a first-class generation target. The owner is the related core
// entity (relationship in either direction). Missing eventPolicy defaults to telemetry/90d so legacy
// ontologies still get persisted instead of producing a dead in-memory object. reaction events are
// NOT persisted locally (persisted:false) — the usecase routes them to the platform outbox.
export function deriveEventTargets(entities: CbEntity[], relationships: CbRelationship[]): CbEventTarget[] {
  const byId = new Map(entities.map(e => [e.entityId, e]));
  const out: CbEventTarget[] = [];
  for (const e of entities) {
    if (e.kind !== 'event') continue;
    const policy: EventPolicy = e.eventPolicy ?? { purpose: 'telemetry', retentionDays: DEFAULT_EVENT_RETENTION_DAYS };
    let ownerEntity = '';
    for (const rel of relationships) {
      const other = rel.fromEntity === e.entityId ? rel.toEntity : rel.toEntity === e.entityId ? rel.fromEntity : '';
      if (other && byId.get(other)?.kind === 'core') { ownerEntity = other; break; }
    }
    const persisted = policy.purpose !== 'reaction';
    const retentionDays = policy.purpose === 'telemetry' ? (policy.retentionDays ?? DEFAULT_EVENT_RETENTION_DAYS) : policy.retentionDays;
    out.push({ entityId: e.entityId, ownerEntity, purpose: policy.purpose, retentionDays, persisted, fields: e.fields });
  }
  return out;
}

/** ns4 relationships live in `<module>/ontology/index.defs.ts` instead of in module.defs.ts. */
function collectOntologyRelationships(index: Record<string, unknown>, relationships: CbRelationship[]): void {
  const rels = Array.isArray(index.relationships) ? index.relationships : [];
  for (const rel of rels) {
    if (!isRecord(rel)) continue;
    const fromEntity = readString(rel.fromEntity);
    const toEntity = readString(rel.toEntity);
    if (fromEntity && toEntity) relationships.push({ fromEntity, toEntity, type: readString(rel.type) || 'manyToOne' });
  }
}

function collectModuleOntology(
  moduleDefs: Record<string, unknown>,
  moduleName: string,
  entities: CbEntity[],
  entityToModule: Map<string, string>,
  relationships: CbRelationship[],
): void {
  const ontology = isRecord(moduleDefs.ontology) ? moduleDefs.ontology : undefined;
  const ents = ontology && isRecord(ontology.entities) ? ontology.entities : undefined;
  if (ents) {
    for (const [entityId, raw] of Object.entries(ents)) {
      if (!isRecord(raw)) continue;
      entityToModule.set(entityId, moduleName);
    }
  }
  const rels = Array.isArray(moduleDefs.relationships) ? moduleDefs.relationships : [];
  for (const rel of rels) {
    if (!isRecord(rel)) continue;
    const fromEntity = readString(rel.fromEntity);
    const toEntity = readString(rel.toEntity);
    if (fromEntity && toEntity) relationships.push({ fromEntity, toEntity, type: readString(rel.type) || 'manyToOne' });
  }
}

function ownerFrom(
  kind: 'operation' | 'workflow',
  obj: Record<string, unknown>,
  entityToModule: Map<string, string>,
  fallbackModule: string,
  explicitModule?: string,
): CbOwner | null {
  const id = readString(obj.operationId) || readString(obj.workflowId);
  if (!id) return null;
  const entity = readString(obj.entity);
  // Workflows declare the entities they touch in `entities` (no reads/writes). Fold those in so the
  // deterministic port derivation works for workflows too (otherwise the model invents port names).
  // Strip field-level refs ("CashMovement.amount") — keep only bare entity ids.
  const bare = (arr: string[]) => arr.filter(s => s && !s.includes('.'));
  const entitiesArr = bare(readStringArray(obj.entities));
  const reads = [...new Set([...bare(readStringArray(obj.reads)), ...entitiesArr])];
  const writes = [...new Set([...bare(readStringArray(obj.writes)), ...entitiesArr])];
  const moduleName = explicitModule || entityToModule.get(entity) || entityToModule.get(reads[0]) || entityToModule.get(writes[0]) || fallbackModule;
  return {
    kind,
    id,
    pageId: readString(obj.pageId),
    commandName: readString(obj.commandName),
    bffName: readString(obj.bffName),
    title: readString(obj.title) || id,
    entity,
    opKind: readString(obj.kind),
    actors: readActorsField(obj),
    reads,
    writes,
    rulesApplied: readStringArray(obj.rulesApplied),
    accessPattern: readAccessPattern(obj.accessPattern),
    outputShape: readOutputShape(obj.outputShape),
    inputs: readOperationInputs(obj.inputs),
    contextResolution: readContextResolution(obj.contextResolution),
    acceptanceAssertions: readStringArray(obj.acceptanceAssertions),
    todoStatus: '',
    statusBackend: '',
    inlineStatusBackend: readString(obj.statusBackend),
    moduleName,
  };
}

function readAccessPattern(value: unknown): CbAccessPattern | undefined {
  if (!isRecord(value)) return undefined;
  const kind = readString(value.kind);
  const description = readString(value.description);
  if (!kind && !description) return undefined;
  return {
    kind,
    description,
    ...(readString(value.entity) ? { entity: readString(value.entity) } : {}),
    ...(readString(value.keyField) ? { keyField: readString(value.keyField) } : {}),
    ...(readStringArray(value.filters).length ? { filters: readStringArray(value.filters) } : {}),
    ...(readStringArray(value.sort).length ? { sort: readStringArray(value.sort) } : {}),
    ...(readString(value.pagination) ? { pagination: readString(value.pagination) } : {}),
    ...(readString(value.selection) ? { selection: readString(value.selection) } : {}),
    ...(readStringArray(value.output).length ? { output: readStringArray(value.output) } : {}),
  };
}

function readCbOutputField(value: unknown): CbOutputField | null {
  if (!isRecord(value)) return null;
  const name = readString(value.name);
  const type = readString(value.type) as CbOutputField['type'];
  if (!name || !type) return null;
  const field: CbOutputField = { name, type, required: value.required === true };
  const fieldRef = readString(value.fieldRef);
  if (fieldRef) field.fieldRef = fieldRef;
  if (isRecord(value.item) && Array.isArray(value.item.fields)) {
    const fields = value.item.fields.map(readCbOutputField).filter((f): f is CbOutputField => f !== null);
    if (fields.length) field.item = { fields };
  }
  return field;
}

function readOutputShape(value: unknown): CbOutputShape | undefined {
  if (!isRecord(value)) return undefined;
  const kind = readString(value.kind) as CbOutputShape['kind'];
  const fields = Array.isArray(value.fields)
    ? value.fields.map(readCbOutputField).filter((f): f is CbOutputField => f !== null)
    : [];
  if (!kind || fields.length === 0) return undefined;
  return { kind, fields };
}

function readOperationInputs(value: unknown): CbOperationInput[] {
  return Array.isArray(value) ? value.filter(isRecord).map(raw => ({
    inputId: readString(raw.inputId),
    fieldRef: readString(raw.fieldRef),
    ...(readString(raw.type) ? { type: readString(raw.type) } : {}),
    required: raw.required === true,
    source: readString(raw.source),
    description: readString(raw.description),
  })).filter(input => !!input.inputId || !!input.fieldRef) : [];
}

function readContextResolution(value: unknown): CbContextResolution[] {
  return Array.isArray(value) ? value.filter(isRecord).map(raw => ({
    ...(readString(raw.inputId) ? { inputId: readString(raw.inputId) } : {}),
    targetRef: readString(raw.targetRef),
    source: readString(raw.source),
    originRef: readString(raw.originRef),
    description: readString(raw.description),
  })).filter(item => !!item.targetRef || !!item.originRef) : [];
}

// ── aggregate derivation (baseline; the LLM index agent may refine) ────────────

export function deriveAggregates(
  entities: CbEntity[],
  relationships: CbRelationship[],
  operatedRootIds: Set<string> = new Set(),
): CbAggregate[] {
  const byId = new Map(entities.map(e => [e.entityId, e]));

  const buildAggregate = (root: CbEntity): CbAggregate => {
    const embeddedMembers: string[] = [];
    const events: string[] = [];
    const mdmRefs: string[] = [];
    for (const rel of relationships) {
      // a supporting child related to this root (root -> child) folds into the root details JSONB
      const childId = rel.fromEntity === root.entityId ? rel.toEntity : rel.toEntity === root.entityId ? rel.fromEntity : '';
      if (!childId) continue;
      const child = byId.get(childId);
      if (!child) continue;
      if (child.kind === 'supporting' && (rel.type === 'oneToMany' || rel.type === 'oneToOne')) push(embeddedMembers, childId);
      else if (child.kind === 'event') push(events, childId);
      else if (child.kind === 'mdm') push(mdmRefs, childId);
    }
    return { aggregateId: root.entityId, rootEntity: root.entityId, embeddedMembers, events, mdmRefs };
  };

  const aggregates: CbAggregate[] = entities.filter(e => e.kind === 'core').map(buildAggregate);

  // Invariant: any entity an operation acts on as a root (operatedRootIds = operation.entity + writes)
  // must own an entity+port+table — UNLESS it is embedded in another aggregate (a child folded into
  // details JSONB) or is an mdm/event entity. This keeps generation robust when the ontology
  // under-classifies kinds (e.g. a standalone "table"/"category" marked supporting): without it the
  // usecases that reference its port would import a module that was never generated.
  const embedded = new Set(aggregates.flatMap(a => a.embeddedMembers));
  const roots = new Set(aggregates.map(a => a.rootEntity));
  for (const id of operatedRootIds) {
    const e = byId.get(id);
    if (!e || roots.has(id) || embedded.has(id) || e.kind === 'mdm' || e.kind === 'event') continue;
    aggregates.push(buildAggregate(e));
    roots.add(id);
  }
  return aggregates;
}

// ── persistence (JSONB) plan ───────────────────────────────────────────────────

export interface CbColumnPlan { fieldId: string; reason: string; }
export interface CbTablePlan {
  tableId: string;
  rootEntity: string;
  ownership: string;
  indexedColumns: CbColumnPlan[]; // real columns (need an index)
  detailsFields: string[];        // non-indexed fields -> details JSONB
  childCollections: string[];     // embedded supporting entities -> details JSONB
}

/** Heuristic: a field needs a real column when it is the id (PK), a reference/FK (type is an entity
 * id or ends with "Id"), a status/lifecycle field, or an ordering timestamp (createdAt). Everything
 * else goes into details JSONB. Deterministic column plan consumed by the table/adapter generators. */
export function planTableColumns(fields: Record<string, unknown>[], knownEntityIds: Set<string>): { indexed: CbColumnPlan[]; details: string[] } {
  const indexed: CbColumnPlan[] = [];
  const details: string[] = [];
  for (const f of fields) {
    const fieldId = readString(f.fieldId);
    if (!fieldId) continue;
    const type = readString(f.type);
    const isId = fieldId === 'id' || /Id$/.test(fieldId);
    const isRef = knownEntityIds.has(type);
    const isStatus = fieldId === 'status' || Array.isArray((f as any).enum);
    const isOrderTs = fieldId === 'createdAt';
    if (isId || isRef || isStatus || isOrderTs) {
      indexed.push({ fieldId, reason: isId ? 'pk/fk' : isRef ? 'fk' : isStatus ? 'status' : 'ordering' });
    } else {
      details.push(fieldId);
    }
  }
  return { indexed, details };
}

// ── l1 hexagonal file-info builders ────────────────────────────────────────────

const L1 = 1;
function defs(folder: string, shortName: string): CbFileInfo {
  return { project: mls.actualProject || 0, level: L1, folder, shortName: toSafeShortName(shortName), extension: '.defs.ts' };
}
export function domainEntityFileInfo(m: string, entityId: string): CbFileInfo { return defs(`${m}/layer_3_domain/entities`, lowerFirst(entityId)); }
export function valueObjectFileInfo(m: string, memberId: string): CbFileInfo { return defs(`${m}/layer_3_domain/value-objects`, lowerFirst(memberId)); }
export function repositoryPortFileInfo(m: string, entityId: string): CbFileInfo { return defs(`${m}/layer_2_application/ports`, `${lowerFirst(entityId)}Repository`); }
export function usecaseFileInfo(m: string, usecaseId: string): CbFileInfo { return defs(`${m}/layer_2_application/usecases`, lowerFirst(usecaseId)); }
export function persistenceTableFileInfo(m: string, tableId: string): CbFileInfo { return defs(`${m}/layer_1_external/adapters/persistence`, lowerFirst(tableId)); }
export function repositoryAdapterFileInfo(m: string, entityId: string): CbFileInfo { return defs(`${m}/layer_1_external/adapters/persistence`, `${lowerFirst(entityId)}RepositoryAdapter`); }
export function httpControllerFileInfo(m: string, pageId: string): CbFileInfo { return defs(`${m}/layer_1_external/adapters/http/controllers`, lowerFirst(pageId)); }

// ── defs reuse (staleness) ──────────────────────────────────────────────────────
// Regenerating .defs.ts via the LLM is the dominant cost of a re-run (~1h for a module). Mirror the
// materializer's staleness model at the DEFS level: a generated l1 .defs.ts is reusable when it
// already exists AND was written at/after the newest L4 input (nothing upstream changed). A step then
// skips the LLM for current components and regenerates only what is missing/stale. Callers gate this:
// /rebuild forces regeneration (isRebuildCommand), and a pending repair finding also forces it.

function fileModifiedMs(info: CbFileInfo): number | null {
  try {
    const file = (mls.stor.files as Record<string, any>)[mls.stor.getKeyToFile(info as unknown as mls.stor.IFileInfo)];
    if (!file || file.status === 'deleted') return null;
    if (file.updatedAt) return Date.parse(String(file.updatedAt));
    return (file.status === 'new' || file.status === 'changed') ? Number.MAX_SAFE_INTEGER : null;
  } catch { return null; }
}

/** Newest mtime (ms) among all L4 `.defs.ts` of the project — the "input changed" watermark. Any l1
 * defs written at/after this is current; anything older (or a changed L4) forces regeneration. */
export function newestL4DefsMs(project: number): number {
  let newest = 0;
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (String(file.extension) !== '.defs.ts') continue;
    const ms = file.updatedAt ? Date.parse(String(file.updatedAt)) : ((file.status === 'new' || file.status === 'changed') ? Number.MAX_SAFE_INTEGER : 0);
    if (ms > newest) newest = ms;
  }
  return newest;
}

/** Pure staleness decision (extracted for unit testing): a generated defs is current when it exists
 * (non-null mtime) and was written at/after the L4 watermark. */
export function defsIsCurrent(defsMs: number | null, l4WatermarkMs: number): boolean {
  return defsMs != null && defsMs >= l4WatermarkMs;
}

/** Whether the generated `.defs.ts` for `fileInfo` can be reused (exists + at/after the L4 watermark). */
export function defsCurrent(fileInfo: CbFileInfo, l4WatermarkMs: number): boolean {
  return defsIsCurrent(fileModifiedMs(fileInfo), l4WatermarkMs);
}

/** A /rebuild forces fresh output — reuse is bypassed. (run/bare reuses current defs.) */
export function isRebuildCommand(context: mls.msg.ExecutionContext): boolean {
  const cmd = readCliCommand(context);
  return cmd === 'rebuild-all' || cmd === 'rebuild-defs';
}

// ── co-located agent prompt assets ─────────────────────────────────────────────

export const CB_AGENT_PROJECT = 102021;
export const CB_AGENT_FOLDER = 'agentChangeBackend';

/** Read a co-located LLM prompt at runtime. Prompts live next to their step agent as
 * `agentChangeBackend/steps/<slug>/prompt.md` (moved into the step folders on 2026-07-11,
 * todo/modernizeChangeBackend.md step 4; inline template strings were extracted in step 2). Each file
 * keeps its `<!-- modelType: ... -->` marker; the caller still replaces the {{toolName}} placeholder.
 * `folderRel` is relative to this agent folder (e.g. 'steps/gen-domain'); fixed to project 102021 (the
 * agent's own files), NOT the client mls.actualProject. */
export async function readCbPrompt(folderRel: string, shortName = 'prompt'): Promise<string> {
  const fileInfo = { project: CB_AGENT_PROJECT, level: 2, folder: `${CB_AGENT_FOLDER}/${folderRel}`, shortName, extension: '.md' } as unknown as mls.stor.IFileInfo;
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)] as { status?: string; getContent(): Promise<unknown> } | undefined;
  if (!file || file.status === 'deleted') throw new Error(`[readCbPrompt] prompt not found: ${folderRel}/${shortName}.md`);
  const raw = await file.getContent();
  if (typeof raw !== 'string') throw new Error(`[readCbPrompt] prompt is not text: ${folderRel}/${shortName}.md`);
  return raw;
}

// ── defs writer (main export + pipeline export, self-sufficient) ───────────────

export function defsRef(fileInfo: CbFileInfo): string {
  return `_${fileInfo.project}_/l${fileInfo.level}/${fileInfo.folder}/${fileInfo.shortName}.defs.ts`;
}

/** The .d.ts ref of an artifact (used in dependsFiles — the callee's signatures). */
export function dtsRef(fileInfo: CbFileInfo): string {
  return defsRef(fileInfo).replace(/\.defs\.ts$/, '.d.ts');
}

/** Standard planning envelope shared by every .defs.ts data block. */
export function buildArtifact(artifactType: string, artifactId: string, moduleName: string, agentName: string, data: unknown): Record<string, unknown> {
  return { schemaVersion: '2026-06-26', artifactType, artifactId, moduleName, status: 'draft', source: { agentName, stepId: 0, planId: '' }, data };
}

/** Materialization context for a layer: the hexagonal base architecture skill + the per-type skill
 * (both co-located with this agent) + the platform defs. */
export function layerSkills(skillFile: string): string[] {
  return [
    '_102021_/l2/agentChangeBackend/skills/architecture.md',
    `_102021_/l2/agentChangeBackend/skills/${skillFile}`,
    '_102034_.d.ts',
  ];
}

export interface CbPipelineItem {
  id: string;
  type: string;
  outputPath: string;
  defPath: string;
  dependsFiles: string[];
  dependsOn: string[];
  skills: string[];
  rulesPath?: string;
  rulesApplied?: string[];
  agent: string;
}

/** Build the pipeline item that makes a .defs.ts self-sufficient for materialization (agentCbMaterialize
 * in-flow, or the cbMaterializeCli Node runner): it carries the outputPath (.ts), the dependsFiles
 * (.d.ts of the inner callee layer) and skills (the LLM context = layer skill + platform defs).
 * See spec.md (auto-suficiência). */
export function buildPipelineItem(
  shortName: string,
  type: string,
  fileInfo: CbFileInfo,
  dependsFiles: string[],
  skills: string[],
  opts: { rulesPath?: string; rulesApplied?: string[] } = {},
): CbPipelineItem {
  const defPath = defsRef(fileInfo);
  return {
    id: `${shortName}__${type}`,
    type,
    outputPath: defPath.replace(/\.defs\.ts$/, '.ts'),
    defPath,
    dependsFiles,
    dependsOn: [],
    skills,
    ...(opts.rulesPath ? { rulesPath: opts.rulesPath } : {}),
    ...(opts.rulesApplied && opts.rulesApplied.length ? { rulesApplied: opts.rulesApplied } : {}),
    agent: 'agentCbMaterialize',
  };
}

/** Write a .defs.ts with the platform header, the main `export const {name}` + default export, and
 * (optionally) the `export const pipeline`. Force-overwrites. */
export async function saveDefs(fileInfo: CbFileInfo, exportName: string, data: unknown, pipeline?: CbPipelineItem[]): Promise<string> {
  const ref = defsRef(fileInfo);
  let src = `/// <mls fileReference="${ref}" enhancement="_blank"/>\n\n`;
  src += `export const ${exportName} = ${JSON.stringify(data, null, 2)} as const;\n\nexport default ${exportName};\n`;
  if (pipeline && pipeline.length) src += `\nexport const pipeline = ${JSON.stringify(pipeline, null, 2)} as const;\n`;
  return writeDefsSource(fileInfo, src);
}

/** Write a .defs.ts verbatim. Used to update a file this agent does not own the shape of. */
export async function writeDefsSource(fileInfo: CbFileInfo, src: string): Promise<string> {
  const ref = defsRef(fileInfo);
  const info = mls.stor.convertFileReferenceToFile(ref);
  const param: IReqCreateStorFile = { ...info, source: src } as IReqCreateStorFile;
  const file = await createStorFile(param, true, true, true);
  // Bump updatedAt so staleness (isStale: defs newer than .ts) re-materializes after a regen — the
  // shared libStor.createStorFile does not set it (unlike core agentDefs.createStorFile).
  file.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(file, { contentType: 'string', content: src });
  return ref;
}

export async function saveBackendWorkspaceConfig(): Promise<string> {
  const project = mls.actualProject || 0;
  if (!project) return 'l5/config.json backend skipped: project unavailable';
  const l5 = await readJsonStor({ project, level: 5, folder: '', shortName: 'project', extension: '.json' });
  if (!isRecord(l5)) return 'l5/config.json backend skipped: l5/project.json not found';
  const masters = isRecord(l5.masters) ? l5.masters : {};
  const backendSignature = isRecord(masters.backend) ? masters.backend : {};
  const runtimeId = readId(backendSignature.runtimeProject) || '102034';
  const config = await readJsonStor({ project, level: 5, folder: '', shortName: 'config', extension: '.json' });
  const workspace = isRecord(config) ? config : {};

  workspace.defaultProjectId = readId(workspace.defaultProjectId) || String(project);
  const projects = ensureRecordProperty(workspace, 'projects');
  const client = ensureProjectConfig(projects, String(project), { root: '.', type: 'client', runtime: projectRuntimeMetadata(l5, String(project)) });
  const backendRuntime = isRecord(projects[runtimeId]) ? projects[runtimeId] as Record<string, unknown> : {};
  projects[runtimeId] = { ...backendRuntime, root: `../mls-${runtimeId}`, type: 'master backend' };
  projects['102029'] = isRecord(projects['102029']) ? projects['102029'] : { root: '../mls-102029', type: 'lib' };

  const clientModules = Array.isArray(client.modules) ? client.modules.filter(isRecord) : [];
  const persistenceModules = Array.isArray(client.persistenceModules) ? client.persistenceModules.filter(isRecord) : [];
  client.modules = clientModules;
  client.persistenceModules = persistenceModules;

  let backendModules = 0;
  const l5Modules = Array.isArray(l5.modules) ? l5.modules.filter(isRecord) : [];
  for (const l5mod of l5Modules) {
    const moduleName = readString(l5mod.moduleName);
    const backend = isRecord(l5mod.backend) ? l5mod.backend : null;
    if (!moduleName || !backend) continue;
    const persistence = isRecord(backend.persistence) ? backend.persistence : {};
    const backendControllers = readString(backend.backendControllers);
    const tableDefsDir = readString(persistence.tableDefsDir);
    if (!backendControllers || !tableDefsDir) continue;
    let mod = clientModules.find(item => readString(item.moduleId) === moduleName);
    if (!mod) { mod = { moduleId: moduleName, basePath: `/${moduleName}`, shellMode: 'spa' }; clientModules.push(mod); }
    mod.basePath = readString(mod.basePath) || `/${moduleName}`;
    mod.shellMode = readString(mod.shellMode) || 'spa';
    mod.backendControllers = backendControllers;
    delete mod.backendRouter;

    let pm = persistenceModules.find(item => readString(item.moduleId) === moduleName);
    if (!pm) { pm = { moduleId: moduleName }; persistenceModules.push(pm); }
    pm.tableDefsDir = tableDefsDir;
    delete pm.persistenceEntrypoint;
    backendModules += 1;
  }

  await saveJsonStor({ project, level: 5, folder: '', shortName: 'config', extension: '.json' }, workspace);
  return `l5/config.json backend merged (${backendModules} module(s))`;
}

async function readJsonStor(fileInfo: CbFileInfo): Promise<unknown> {
  try {
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    return file && file.status !== 'deleted' ? JSON.parse(String(await file.getContent())) : null;
  } catch {
    return null;
  }
}

async function saveJsonStor(fileInfo: CbFileInfo, data: unknown): Promise<void> {
  const source = `${JSON.stringify(data, null, 2)}\n`;
  const key = mls.stor.getKeyToFile(fileInfo);
  let file = mls.stor.files[key];
  if (!file) file = await createStorFile({ ...fileInfo, source } as IReqCreateStorFile, false, false, false);
  if (file.status !== 'renamed' && file.status !== 'new') file.status = 'changed';
  file.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
}

function ensureRecordProperty(target: Record<string, unknown>, key: string): Record<string, unknown> {
  if (!isRecord(target[key])) target[key] = {};
  return target[key] as Record<string, unknown>;
}

function ensureProjectConfig(projects: Record<string, unknown>, id: string, patch: Record<string, unknown>): Record<string, unknown> {
  const existing = isRecord(projects[id]) ? projects[id] as Record<string, unknown> : {};
  projects[id] = { ...existing, ...patch };
  return projects[id] as Record<string, unknown>;
}

function projectRuntimeMetadata(l5: Record<string, unknown>, clientId: string): Record<string, unknown> {
  return {
    projectId: readId(l5.projectId) || clientId,
    domain: l5.domain,
    port: l5.port,
    databaseName: l5.databaseName,
    environment: l5.environment,
    studioEnabled: l5.studioEnabled,
  };
}

function readId(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return readString(value);
}

export async function saveAgentTrace(context: mls.msg.ExecutionContext, agentName: string, step: mls.msg.AIAgentStep): Promise<void> {
  if (!shouldSaveTrace(context)) return;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) return;
    const scan = await readBackendScan(ALL_STATUSES, context).catch(() => null);
    const moduleName = scan?.moduleNames?.[0] || 'backend';
    const source = `${JSON.stringify({
      savedAt: new Date().toISOString(),
      agentName,
      stepId: step.stepId,
      planning: (step as { planning?: unknown }).planning || null,
      status: step.status,
      payload,
    }, null, 2)}\n`;
    const fileInfo: CbFileInfo = {
      project: mls.actualProject || 0,
      level: 4,
      folder: `${moduleName}/trace`,
      shortName: traceShortName(agentName, step.stepId),
      extension: '.json',
    };
    const ref = defsRef(fileInfo);
    const info = mls.stor.convertFileReferenceToFile(ref);
    const file = await createStorFile({ ...info, source } as IReqCreateStorFile, true, true, false);
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
  } catch (error) {
    console.warn(`[cb saveAgentTrace] failed for ${agentName}`, error);
  }
}

function shouldSaveTrace(context: mls.msg.ExecutionContext): boolean {
  try {
    const longMemory = (context.task?.iaCompressed as { longMemory?: Record<string, string> } | undefined)?.longMemory;
    const flag = longMemory?._saveTrace;
    if (flag === 'true') return true;
    if (flag === 'false') return false;
  } catch {
    // use default
  }
  return true;
}

function traceShortName(agentName: string, stepId: unknown): string {
  const safe = agentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${String(stepId ?? 0).padStart(3, '0')}-${safe || 'agent'}`;
}

// ── todoBackend mutation (deterministic) ───────────────────────────────────────

/** Update only l5/{module}/todoBackend.defs.ts. l4 owner defs are read-only for this agent. */
export async function setTodoBackendStatus(owner: CbOwner, status: OwnerStatus): Promise<boolean> {
  const project = mls.actualProject || 0;
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoBackend') continue;
    const content = String(await file.getContent());
    const parsed = parseDefsSource(content);
    if (!isRecord(parsed)) continue;
    const owners = Array.isArray(parsed.owners) ? parsed.owners.filter(isRecord) : [];
    const todoOwner = owners.find(raw => todoOwnerType(readString(raw.ownerType)) === owner.kind && readString(raw.ownerId) === owner.id);
    if (!todoOwner) continue;
    const fileInfo = { project, level: 5, folder: String(file.folder || owner.moduleName), shortName: 'todoBackend', extension: '.defs.ts' };
    // Write the status back into the field it was read from, and keep the rest of the file as the
    // generator wrote it: re-serializing would drop its `import type` and its `satisfies`.
    todoOwner[todoStatusField(todoOwner) || 'status'] = status;
    const preserved = replaceDefsValue(content, parsed);
    // `updatedAt` is this agent's own bookkeeping: an artifact typed with `satisfies` rejects the
    // extra property, so it is only added on the path that rewrites the file wholesale.
    if (preserved) { await writeDefsSource(fileInfo, preserved); return true; }
    const exportName = readExportName(content);
    if (!exportName) return false;
    parsed.updatedAt = new Date().toISOString();
    await saveDefs(fileInfo, exportName, parsed);
    return true;
  }
  return false;
}

// ── intent / step helpers (mirrored, self-contained) ───────────────────────────

export function createUpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
  newTaskTitle?: string,
): mls.msg.AgentIntentUpdateStatus {
  const intent: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep?.stepId ?? step.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
  };
  if (cleaner) intent.cleaner = cleaner;
  // Rename the running task once the module name is known (the scan step resolves it). Mirrors the
  // e1-draft "plan <module>" rename on agentNewSolution.
  if (newTaskTitle) intent.newTaskTitle = newTaskTitle;
  return intent;
}

export function createAgentStepPayload(
  planId: string,
  agentName: string,
  stepTitle: string,
  args: unknown,
  dependsOn: string[],
  executionMode: ExecutionMode,
  status: mls.msg.AIStepStatus = 'waiting_dependency',
  dynamicSource?: unknown,
): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle,
    status,
    nextSteps: [],
    agentName,
    prompt: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
    rags: [],
    planning: { planId, dependsOn, executionMode, executionHost: 'client', ...(dynamicSource ? { dynamicSource } : {}) },
  } as any;
}


/**
 * Start the next step INSIDE its phase. Steps that stay in the same phase keep using `enqueueNext`:
 * their parent already IS the phase, so a sibling lands in it for free. Only a phase TRANSITION goes
 * through here.
 *
 * A phase can only receive children while it is open, so it is created lazily with its first child
 * inside it (agentCbPhase adds that child from within the phase's own hook) — never pre-created empty
 * and then completed, which would make every later child throw.
 */
export function enqueueNextInPhase(
  context: mls.msg.ExecutionContext,
  currentStep: mls.msg.AIAgentStep,
  phase: CbPhaseKey,
  planId: string,
  agentName: string,
  stepTitle: string,
  args: unknown = {},
  onFailure?: mls.msg.AIAgentStep['onFailure'],
): mls.msg.AgentIntentAddStep {
  const dep = planIdOf(currentStep);
  const { planId: phasePlanId, title } = CB_PHASES[phase];
  const child = { planId, agentName, stepTitle, args: { planId, ...(args && typeof args === 'object' ? args as Record<string, unknown> : {}) }, onFailure };
  const open = findOpenStepByPlanId(context, phasePlanId);
  if (open) {
    const next = createAgentStepPayload(planId, agentName, stepTitle, child.args, dep ? [dep] : [], 'sequential', 'waiting_dependency');
    if (onFailure) next.onFailure = onFailure;
    return createAddStepIntent(context, open, next);
  }
  const phaseStep = createAgentStepPayload(phasePlanId, 'agentCbPhase', title, { planId: phasePlanId, first: child }, dep ? [dep] : [], 'sequential', 'waiting_dependency');
  // The phase belongs to the run, not to the step that opened it: it hangs from the task root.
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: 1, step: phaseStep };
}

/** An agent step with this planId that can still receive children. */
export function findOpenStepByPlanId(context: mls.msg.ExecutionContext, planId: string): mls.msg.AIAgentStep | null {
  const steps = flattenSteps(context.task?.iaCompressed?.nextSteps as unknown[] | undefined);
  return steps.find(step => step.type === 'agent'
    && (step.planning as { planId?: string } | undefined)?.planId === planId
    && step.status !== 'completed' && step.status !== 'failed') || null;
}

function flattenSteps(steps: unknown[] | undefined): mls.msg.AIAgentStep[] {
  const out: mls.msg.AIAgentStep[] = [];
  for (const item of steps || []) {
    if (!item || typeof item !== 'object') continue;
    const step = item as mls.msg.AIAgentStep & { nextSteps?: unknown[] };
    out.push(step);
    out.push(...flattenSteps(step.nextSteps));
  }
  return out;
}

export function createAddStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

export function createPromptReadyIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  toolSchema: mls.msg.LLMTool,
  toolName: string,
): mls.msg.AgentIntentPromptReady {
  if (!context.task) throw new Error('[createPromptReadyIntent] task invalid');
  // A prompt bigger than the transport accepts used to surface as an uncaught 413 in the client and
  // left the step hanging in waiting_human_input with nothing on the task. Fail it here instead, with
  // a message that names the step and the size.
  const oversize = promptSizeError(`[createPromptReadyIntent] ${parentStep.agentName || 'step'}`, humanPrompt, systemPrompt);
  if (oversize) throw new Error(oversize);
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [toolSchema],
    toolChoice: { type: 'function', function: { name: toolName } },
  };
}

/** Spawn a parallel_dynamic fan-out: one child per selector arg, bounded by maxParallel. */
export function createParallelStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  planId: string,
  agentName: string,
  stepTitle: string,
  args: string[],
  dependsOn: string[] = [],
  maxParallel = 10,
): mls.msg.AgentIntentAddStep {
  const step = createAgentStepPayload(planId, agentName, stepTitle, {}, dependsOn, 'parallel_dynamic', 'in_progress');
  // Children inherit onFailure from the fan-out parent. Without 'continue', an LLM-CALL failure
  // (e.g. proxy 502 after a TOOL_ARGS_SCHEMA reject on primary+fallback) marks the child failed AND
  // the whole task failed (runLLMStepParallel default branch) — bypassing the repair loop entirely.
  // With 'continue' the child proceeds to afterPromptStep, which finds no payload, records the repair
  // finding and COMPLETES the step, exactly like every other worker failure class.
  step.onFailure = 'continue';
  step.interaction = {
    input: [{ type: 'system', content: '<!-- modelType: code -->' }],
    cost: 0,
    trace: [`queued ${args.length} parallel args for ${agentName}`],
    payload: null,
  };
  return { ...createAddStepIntent(context, parentStep, step), executionMode: { type: 'parallel', args, maxParallel } };
}

export function logPrefix(agent: IAgentMeta | { agentName: string }): string {
  return `[${agent.agentName} v1]`;
}

export function planIdOf(step: mls.msg.AIPayload | undefined): string {
  return (step as any)?.planning?.planId || '';
}

/** The CLI command the root stored in the task longMemory (rebuild-all | rebuild-defs | run | help). */
export function readCliCommand(context: mls.msg.ExecutionContext): string {
  const lm = (context.task?.iaCompressed as { longMemory?: Record<string, unknown> } | undefined)?.longMemory;
  return typeof lm?.cliCommand === 'string' ? lm.cliCommand : '';
}

/** T11: true when the run was started with `--no-assets` — the optional seed-image step is skipped
 *  entirely (it completes with a warning and the seeds stay intact). Mirrors readCliCommand. */
export function readNoAssets(context: mls.msg.ExecutionContext): boolean {
  const lm = (context.task?.iaCompressed as { longMemory?: Record<string, unknown> } | undefined)?.longMemory;
  return lm?.noAssets === 'true' || lm?.noAssets === true;
}

/** The target module the root stored in the task longMemory. Empty means "auto": readBackendScan
 * scopes to the first (sorted) module with owners in the requested statuses. Mirrors readCliCommand. */
export function readTargetModule(context: mls.msg.ExecutionContext): string {
  const lm = (context.task?.iaCompressed as { longMemory?: Record<string, unknown> } | undefined)?.longMemory;
  return typeof lm?.targetModule === 'string' ? lm.targetModule.trim() : '';
}

/** Enqueue the next sequential step under the same parent, depending on the current step. v1 uses a
 * simple linear chain (not the parallel_dynamic fan-out in flow.json) — easier to reason about and
 * compile; parallelization is a later optimization. */
export function enqueueNext(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  currentStep: mls.msg.AIAgentStep,
  planId: string,
  agentName: string,
  stepTitle: string,
  args: unknown = {},
  onFailure?: mls.msg.AIAgentStep['onFailure'],
): mls.msg.AgentIntentAddStep {
  const dep = planIdOf(currentStep);
  // Steps are SIBLINGS under the same parent (NEVER nested under the current step — that would
  // deadlock: parent waits for child, child depends on parent). Uniqueness for the runtime's hook
  // dispatch key comes from UNIQUE ARGS (the planId embedded in the prompt), not from the parent.
  const mergedArgs = { planId, ...(args && typeof args === 'object' ? (args as Record<string, unknown>) : {}) };
  const next = createAgentStepPayload(planId, agentName, stepTitle, mergedArgs, dep ? [dep] : [], 'sequential', 'waiting_dependency');
  // 'continue' lets afterPromptStep run even when the LLM call itself fails (proxy error / no payload),
  // so a step that soft-handles failures is not force-failed by the runtime before it can react.
  if (onFailure) next.onFailure = onFailure;
  return createAddStepIntent(context, parentStep, next);
}

// ── small parsers ──────────────────────────────────────────────────────────────

function readExportName(content: string): string {
  const m = content.match(/export const\s+([A-Za-z0-9_$]+)\s*=/);
  return m ? m[1] : '';
}

export function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}
export function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}
export function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
export function toSafeShortName(value: string): string {
  return (value || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';
}

function push(list: string[], value: string): void {
  if (value && !list.includes(value)) list.push(value);
}
