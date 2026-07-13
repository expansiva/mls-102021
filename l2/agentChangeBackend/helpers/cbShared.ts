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
const ALL_STATUSES: OwnerStatus[] = ['toCreate', 'toUpdate', 'toRemove', 'inProgress', 'done'];
export type EntityKind = 'core' | 'supporting' | 'event' | 'metric' | 'mdm';
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

export interface CbOperationInput {
  inputId: string;
  fieldRef: string;
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
  reads: string[];
  writes: string[];
  rulesApplied: string[];
  accessPattern?: CbAccessPattern;
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

export interface CbScan {
  project: number;
  moduleNames: string[];
  owners: CbOwner[];          // todoBackend status in requested statuses
  entities: CbEntity[];
  relationships: CbRelationship[];
  aggregates: CbAggregate[];  // derived baseline (the LLM index may refine)
  events: CbEventTarget[];    // kind:"event" entities, classified by eventPolicy
  warnings: string[];
}

// ── deterministic l4 scan ──────────────────────────────────────────────────────

export async function readBackendScan(statuses: string[] = ['toCreate']): Promise<CbScan> {
  const wanted = new Set(statuses);
  const project = mls.actualProject || 0;
  const moduleNames = new Set<string>();
  const entityToModule = new Map<string, string>();
  const entities: CbEntity[] = [];
  const relationships: CbRelationship[] = [];
  const rawOwners: { kind: 'operation' | 'workflow'; obj: Record<string, unknown> }[] = [];
  const warnings: string[] = [];

  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    const shortName = String(file.shortName || '');
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed)) continue;

    if (folder === 'operations') rawOwners.push({ kind: 'operation', obj: parsed });
    else if (folder === 'workflows') rawOwners.push({ kind: 'workflow', obj: parsed });
    else if (shortName === 'module' && folder && !folder.includes('/')) {
      const moduleName = readString((isRecord(parsed.module) ? parsed.module : parsed).moduleName) || folder;
      moduleNames.add(moduleName);
      collectModuleOntology(parsed, moduleName, entities, entityToModule, relationships);
    } else if (folder.endsWith('/ontology')) {
      const moduleName = folder.split('/')[0];
      const entityId = readString(parsed.entityId) || shortName;
      if (moduleName && entityId) {
        moduleNames.add(moduleName);
        entityToModule.set(entityId, moduleName);
        upsertEntity(entities, {
          entityId,
          title: readString(parsed.title) || entityId,
          kind: (readString(parsed.kind) as EntityKind) || 'core',
          ownership: readString(parsed.ownership) || 'moduleOwned',
          moduleName,
          fields: Array.isArray(parsed.fields) ? parsed.fields.filter(isRecord) : undefined,
          eventPolicy: readEventPolicy(parsed.eventPolicy),
        });
      }
    }
  }

  const moduleFallback = moduleNames.size === 1 ? Array.from(moduleNames)[0] : 'unknown';
  const allOwners = rawOwners
    .map(({ kind, obj }) => ownerFrom(kind, obj, entityToModule, moduleFallback))
    .filter((o): o is CbOwner => !!o);
  const todoState = await readBackendTodoState(project);
  if (rawOwners.length > 0 && todoState.files === 0) {
    throw new Error('l5/{module}/todoBackend.defs.ts not found; backend generation status must come from todoBackend, not inline l4 statusBackend.');
  }
  const l4OwnerKeys = new Set(allOwners.map(ownerKey));
  const missingTodo: string[] = [];
  for (const owner of allOwners) {
    const todoOwner = todoState.ownersByKey.get(ownerKey(owner));
    if (!todoOwner) {
      missingTodo.push(`${owner.kind}:${owner.id}`);
      continue;
    }
    owner.todoStatus = todoOwner.status;
    owner.statusBackend = todoOwner.status;
    owner.moduleName = todoOwner.moduleName || owner.moduleName;
    if (owner.inlineStatusBackend && owner.inlineStatusBackend !== todoOwner.status) {
      warnings.push(`${owner.kind}:${owner.id} inline statusBackend=${owner.inlineStatusBackend} ignored; todoBackend=${todoOwner.status}`);
    }
  }
  const extraTodo = [...todoState.ownersByKey.keys()].filter(key => !l4OwnerKeys.has(key));
  if (missingTodo.length || extraTodo.length || todoState.errors.length) {
    const parts = [
      ...todoState.errors,
      ...(missingTodo.length ? [`todoBackend missing l4 owner(s): ${missingTodo.slice(0, 12).join(', ')}`] : []),
      ...(extraTodo.length ? [`todoBackend has owner(s) absent from l4: ${extraTodo.slice(0, 12).join(', ')}`] : []),
    ];
    throw new Error(parts.join('; '));
  }
  for (const moduleName of todoState.moduleNames) moduleNames.add(moduleName);
  warnings.push(...todoState.warnings);
  const owners = allOwners.filter(o => wanted.has(o.todoStatus));

  // Roots that operations own (entity + writes) across ALL operations regardless of status — the
  // aggregate boundaries must be stable even when only some owners are pending (toCreate).
  const operatedRootIds = new Set<string>();
  for (const { obj } of rawOwners) {
    const e = readString(obj.entity);
    if (e) operatedRootIds.add(e);
    for (const w of readStringArray(obj.writes)) operatedRootIds.add(w);
  }

  const aggregates = deriveAggregates(entities, relationships, operatedRootIds);
  const events = deriveEventTargets(entities, relationships);
  return { project, moduleNames: Array.from(moduleNames).sort(), owners, entities, relationships, aggregates, events, warnings };
}

interface CbTodoOwner {
  ownerType: 'operation' | 'workflow';
  ownerId: string;
  status: string;
  moduleName: string;
}

interface CbTodoState {
  files: number;
  moduleNames: string[];
  ownersByKey: Map<string, CbTodoOwner>;
  warnings: string[];
  errors: string[];
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
  const errors: string[] = [];
  let files = 0;
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoBackend') continue;
    files++;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed)) {
      errors.push(`invalid todoBackend defs at l5/${String(file.folder || '')}/todoBackend.defs.ts`);
      continue;
    }
    const layer = readString(parsed.layer);
    if (layer && layer !== 'backend') warnings.push(`todoBackend ${String(file.folder || '')} has layer=${layer}; treating as backend by filename`);
    const moduleName = readString(parsed.moduleName) || String(file.folder || '');
    if (moduleName) moduleNames.add(moduleName);
    const owners = Array.isArray(parsed.owners) ? parsed.owners.filter(isRecord) : [];
    for (const raw of owners) {
      const ownerType = readString(raw.ownerType);
      const ownerId = readString(raw.ownerId);
      const status = readString(raw.status);
      if ((ownerType !== 'operation' && ownerType !== 'workflow') || !ownerId) {
        errors.push(`todoBackend ${moduleName || String(file.folder || '')} has invalid owner entry`);
        continue;
      }
      if (!isOwnerStatus(status)) {
        errors.push(`todoBackend ${moduleName || String(file.folder || '')}/${ownerType}:${ownerId} has invalid status "${status}"`);
        continue;
      }
      const key = todoOwnerKey(ownerType, ownerId);
      if (ownersByKey.has(key)) warnings.push(`duplicate todoBackend owner ${key}; first entry kept`);
      else ownersByKey.set(key, { ownerType, ownerId, status, moduleName });
    }
  }
  return { files, moduleNames: Array.from(moduleNames).sort(), ownersByKey, warnings, errors };
}

function isOwnerStatus(status: string): status is OwnerStatus {
  return status === 'toCreate' || status === 'toUpdate' || status === 'toRemove' || status === 'inProgress' || status === 'done';
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
  const moduleName = entityToModule.get(entity) || entityToModule.get(reads[0]) || entityToModule.get(writes[0]) || fallbackModule;
  return {
    kind,
    id,
    pageId: readString(obj.pageId),
    commandName: readString(obj.commandName),
    bffName: readString(obj.bffName),
    title: readString(obj.title) || id,
    entity,
    opKind: readString(obj.kind),
    reads,
    writes,
    rulesApplied: readStringArray(obj.rulesApplied),
    accessPattern: readAccessPattern(obj.accessPattern),
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

function readOperationInputs(value: unknown): CbOperationInput[] {
  return Array.isArray(value) ? value.filter(isRecord).map(raw => ({
    inputId: readString(raw.inputId),
    fieldRef: readString(raw.fieldRef),
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
  const info = mls.stor.convertFileReferenceToFile(ref);
  const param: IReqCreateStorFile = { ...info, source: src } as IReqCreateStorFile;
  const file = await createStorFile(param, true, true, true);
  // Bump updatedAt so staleness (isStale: defs newer than .ts) re-materializes after a regen — the
  // shared libStor.createStorFile does not set it (unlike core agentDefs.createStorFile).
  file.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(file, { contentType: 'string', content: src });
  return ref;
}

export async function saveAgentTrace(context: mls.msg.ExecutionContext, agentName: string, step: mls.msg.AIAgentStep): Promise<void> {
  if (!shouldSaveTrace(context)) return;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) return;
    const scan = await readBackendScan(ALL_STATUSES).catch(() => null);
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
    const todoOwner = owners.find(raw => readString(raw.ownerType) === owner.kind && readString(raw.ownerId) === owner.id);
    if (!todoOwner) continue;
    const exportName = readExportName(content);
    if (!exportName) return false;
    todoOwner.status = status;
    parsed.updatedAt = new Date().toISOString();
    await saveDefs(
      { project, level: 5, folder: String(file.folder || owner.moduleName), shortName: 'todoBackend', extension: '.defs.ts' },
      exportName,
      parsed,
    );
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
  step.interaction = {
    input: [{ type: 'system', content: '<!-- modelType: codepro -->' }],
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
): mls.msg.AgentIntentAddStep {
  const dep = planIdOf(currentStep);
  // Steps are SIBLINGS under the same parent (NEVER nested under the current step — that would
  // deadlock: parent waits for child, child depends on parent). Uniqueness for the runtime's hook
  // dispatch key comes from UNIQUE ARGS (the planId embedded in the prompt), not from the parent.
  const mergedArgs = { planId, ...(args && typeof args === 'object' ? (args as Record<string, unknown>) : {}) };
  const next = createAgentStepPayload(planId, agentName, stepTitle, mergedArgs, dep ? [dep] : [], 'sequential', 'waiting_dependency');
  return createAddStepIntent(context, parentStep, next);
}

// ── small parsers ──────────────────────────────────────────────────────────────

export function parseDefsSource(content: string): unknown {
  const start = content.indexOf('= ');
  const end = content.lastIndexOf(' as const;');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start + 2, end));
  } catch {
    return null;
  }
}

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
function upsertEntity(entities: CbEntity[], entity: CbEntity): void {
  const existing = entities.find(e => e.entityId === entity.entityId);
  if (existing) Object.assign(existing, entity);
  else entities.push(entity);
}
