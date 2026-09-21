/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/contracts.ts" enhancement="_blank"/>

import type { L1Inventory, L1InventoryUsecase } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import { P1_DEVICE, P1_NEEDS_SCHEMA, type P1Device } from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';
import type { PoolMessage } from '/_102035_/l2/solution/pool.js';

export const P1_BACKEND_SCHEMA_VERSION = '2026-09-21-p1-backend-v1.1' as const;
export const P1_BACKEND_ARTIFACT = 'pool/l2/web/backend.json' as const;
export const P1_L4DIFF_SCHEMA = '2026-09-21-p4-l4diff-v1' as const;
export const P1_KINDS = ['qry', 'cmd'] as const;
export type P1Kind = typeof P1_KINDS[number];
export const P1_OPERATIONS = ['list', 'get', 'create', 'update', 'transition', 'delete', 'custom'] as const;
export type P1Operation = typeof P1_OPERATIONS[number];
export const P1_PLAN_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'done'] as const;
export type P1PlanStatus = typeof P1_PLAN_STATUSES[number];
export const P1_NEEDS_FAMILIES = ['mdm', 'ddm', 'tdm'] as const;
export type P1NeedsFamily = typeof P1_NEEDS_FAMILIES[number];
export const P1_WRITE_OPERATIONS = ['create', 'update', 'transition', 'delete'] as const;
export type P1WriteOperation = typeof P1_WRITE_OPERATIONS[number];
export const P1_REMOVED_KINDS = ['usecase', 'port', 'table'] as const;
export type P1RemovedKind = typeof P1_REMOVED_KINDS[number];
export const P1_NO_TABLE = ['ok', 'mdm', 'none'] as const;
export type P1NoTable = typeof P1_NO_TABLE[number];
export const P1_CHANGE_KINDS = ['field', 'rule', 'grant', 'transition', 'process', 'integration', 'entity'] as const;
export type P1ChangeKind = typeof P1_CHANGE_KINDS[number];
export const P1_CHANGE_OPS = ['added', 'changed', 'removed'] as const;
export type P1ChangeOp = typeof P1_CHANGE_OPS[number];

const NAMED_OPS = ['list', 'get', 'create', 'update', 'delete'] as const;
const LIST_FROM = /\b(list|summary|highlights|locate)\b/;
const GET_FROM = /\b(detail|inspect)\b/;
const RELATIONAL_KIND = /^(relational|timeSeries)$/;

export interface P1NeedsRead {
  entity: string;
  family: P1NeedsFamily;
  scope: string;
  derived: string[];
  from: string[];
}

export interface P1NeedsWrite {
  entity: string;
  operation: P1WriteOperation;
  transitionRef: string;
  from: string[];
}

export interface P1NeedsPage {
  pageId: string;
  actors: string[];
  reads: P1NeedsRead[];
  writes: P1NeedsWrite[];
}

export interface P1NeedsFile {
  schemaVersion: typeof P1_NEEDS_SCHEMA;
  moduleName: string;
  device: P1Device;
  pages: P1NeedsPage[];
}

export interface P1EntityView {
  entityId: string;
  family: P1NeedsFamily;
  storageKind: string;
  storageTarget: string;
  transitions: string[];
  rules: string[];
}

export interface P1Endpoint {
  route: string;
  page: string;
  kind: P1Kind;
  usecaseRef: string;
  status: P1PlanStatus;
  tableRefs: string[];
  noTable: P1NoTable;
}

export interface P1Usecase {
  usecaseId: string;
  entity: string;
  operation: P1Operation;
  ports: string[];
  status: P1PlanStatus;
  existing: string;
  reason: string;
  tableRefs: string[];
  noTable: P1NoTable;
}

export interface P1Port {
  portId: string;
  entity: string;
  status: P1PlanStatus;
  tableRefs: string[];
  noTable: P1NoTable;
}

export interface P1Table {
  tableId: string;
  entity: string;
  status: P1PlanStatus;
  tableRefs: string[];
  noTable: P1NoTable;
}

export interface P1Removed {
  kind: P1RemovedKind;
  id: string;
  status: 'toRemove';
  reason: string;
  tableRefs: string[];
  noTable: P1NoTable;
}

export interface P1Change {
  changeId: string;
  kind: P1ChangeKind;
  op: P1ChangeOp;
  entity: string;
  tableRefs: string[];
  noTable: P1NoTable;
  usecaseRefs: string[];
  reason: string;
  source: string;
}

export interface P1UnmappedChange {
  changeId: string;
  kind: string;
  source: string;
}

export interface P1L4DiffItem {
  changeId: string;
  kind: P1ChangeKind;
  op: P1ChangeOp;
  entity: string;
  source: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface P1L4DiffFile {
  schemaVersion: typeof P1_L4DIFF_SCHEMA;
  moduleName: string;
  base: string;
  candidate: string;
  items: P1L4DiffItem[];
  unmapped: P1UnmappedChange[];
}

export interface P1BackendFile {
  schemaVersion: typeof P1_BACKEND_SCHEMA_VERSION;
  moduleName: string;
  device: P1Device;
  sourceNeeds: string;
  inventoryPresent: boolean;
  endpoints: P1Endpoint[];
  usecases: P1Usecase[];
  ports: P1Port[];
  tables: P1Table[];
  removed: P1Removed[];
  changes: P1Change[];
  meta: {
    pages: Record<string, string[]>;
    generatedAt: string;
    llmCalled: boolean;
    unmappedChanges: P1UnmappedChange[];
  };
}

export interface P1UnresolvedItem {
  kind: 'alias' | 'merge';
  candidateUsecaseId: string;
  entity: string;
  operation: string;
  reason: string;
}

export interface P1BackendAlias {
  candidateUsecaseId: string;
  existingUsecaseId: string;
  reason: string;
}

export interface P1BackendMerge {
  usecaseId: string;
  entity: string;
  operation: 'custom';
  ports: string[];
  replaces: string[];
  reason: string;
}

export interface P1BackendResolution {
  aliases: P1BackendAlias[];
  merges: P1BackendMerge[];
}

export interface P1PlanBackendInput {
  needs: P1NeedsFile;
  inventory: L1Inventory;
  ontology: P1EntityView[];
  now: Date;
  resolution?: P1BackendResolution | null;
  l4diff?: P1L4DiffFile | null;
}

export interface P1PlanBackendResult {
  file: P1BackendFile;
  unresolved: P1UnresolvedItem[];
}

export function isP1Kind(value: string): value is P1Kind {
  return (P1_KINDS as readonly string[]).includes(value);
}

export function isP1Operation(value: string): value is P1Operation {
  return (P1_OPERATIONS as readonly string[]).includes(value);
}

export function isP1PlanStatus(value: string): value is P1PlanStatus {
  return (P1_PLAN_STATUSES as readonly string[]).includes(value);
}

export function isP1NeedsFamily(value: string): value is P1NeedsFamily {
  return (P1_NEEDS_FAMILIES as readonly string[]).includes(value);
}

export function isP1WriteOperation(value: string): value is P1WriteOperation {
  return (P1_WRITE_OPERATIONS as readonly string[]).includes(value);
}

export function isP1NoTable(value: string): value is P1NoTable {
  return (P1_NO_TABLE as readonly string[]).includes(value);
}

export function isP1ChangeKind(value: string): value is P1ChangeKind {
  return (P1_CHANGE_KINDS as readonly string[]).includes(value);
}

export function isP1ChangeOp(value: string): value is P1ChangeOp {
  return (P1_CHANGE_OPS as readonly string[]).includes(value);
}

export function p1BackendSubject(moduleName: string, device: P1Device = P1_DEVICE): string {
  return `backend plan of ${moduleName} (${device})`;
}

export function p1BackendBody(file: P1BackendFile): string {
  return [
    `${file.endpoints.length} endpoints`,
    `${file.usecases.length} usecases`,
    `${file.ports.length} ports`,
    `${file.tables.length} tables`,
    `${file.removed.length} removed`,
    `${file.changes.length} changes`,
    `llmCalled=${file.meta.llmCalled}`,
  ].join('\n');
}

export function buildP1BackendMessage(input: {
  file: P1BackendFile;
  received: Pick<PoolMessage, 'thread' | 'round' | 'mode'>;
}): PoolMessage {
  return {
    from: 'l1',
    to: 'l2',
    thread: input.received.thread,
    round: input.received.round,
    mode: input.received.mode,
    subject: p1BackendSubject(input.file.moduleName, input.file.device),
    artifacts: [P1_BACKEND_ARTIFACT],
    body: p1BackendBody(input.file),
  };
}

export function p1UsecaseId(operation: P1Operation, entity: string, transitionRef = ''): string {
  if (operation === 'transition') return lowerFirst(transitionRef || 'transition');
  if (operation === 'custom') return lowerFirst(transitionRef || `custom${entity}`);
  return `${operation}${entity}`;
}

export function p1Route(moduleName: string, page: string, kind: P1Kind, usecaseId: string): string {
  return `${moduleName}.${page}.${kind}${pascal(usecaseId)}`;
}

export function p1PortId(entity: string): string {
  return `${entity}Repository`;
}

export function p1TableId(entity: string): string {
  return lowerFirst(entity);
}

export function parseP1Needs(value: unknown): P1NeedsFile {
  const raw = record(value);
  const schemaVersion = text(raw.schemaVersion);
  if (schemaVersion !== P1_NEEDS_SCHEMA) throw new Error('needs.json schema is unknown');
  const moduleName = text(raw.moduleName);
  if (!moduleName) throw new Error('needs.json needs moduleName.');
  const device = text(raw.device) || P1_DEVICE;
  const pages = list(raw.pages).map((item, index) => parseNeedsPage(item, index));
  return {
    schemaVersion: P1_NEEDS_SCHEMA,
    moduleName,
    device: device === P1_DEVICE ? P1_DEVICE : P1_DEVICE,
    pages,
  };
}

export function parseP1Entity(value: unknown, indexRow?: unknown): P1EntityView | null {
  const file = record(value);
  const row = record(indexRow);
  const entityId = text(file.entityId) || text(row.entityId);
  if (!entityId) return null;
  const storage = record(file.storage);
  const capabilities = record(file.capabilities);
  const kind = text(file.kind) || text(row.kind);
  const storageTarget = text(storage.target);
  const storageKind = text(storage.kind);
  const familyField = text(file.family);
  return {
    entityId,
    family: familyOf({ kind, storageTarget, storageKind, familyField, capabilities: Object.keys(capabilities) }),
    storageKind,
    storageTarget,
    transitions: list(file.transitions).map(item => text(record(item).transitionId)).filter(Boolean),
    rules: list(file.rules).filter((item): item is string => typeof item === 'string' && item.length > 0),
  };
}

export function parseP1OntologyIndex(value: unknown): string[] {
  const raw = record(value);
  return list(raw.entities).map(item => text(record(item).entityId)).filter(Boolean);
}

export function parseP1L4Diff(value: unknown): P1L4DiffFile | null {
  const raw = record(value);
  if (text(raw.schemaVersion) !== P1_L4DIFF_SCHEMA) return null;
  const items: P1L4DiffItem[] = [];
  const unmapped: P1UnmappedChange[] = [];
  for (const item of list(raw.items)) {
    const row = record(item);
    const changeId = text(row.changeId);
    const kind = text(row.kind);
    if (!changeId || !kind) continue;
    if (!isP1ChangeKind(kind)) {
      console.warn(`Unknown l4diff kind skipped: changeId=${changeId} kind=${kind}`);
      unmapped.push({ changeId, kind, source: text(row.source) });
      continue;
    }
    const parsed = parseL4DiffItem(item);
    if (parsed) items.push(parsed);
  }
  return {
    schemaVersion: P1_L4DIFF_SCHEMA,
    moduleName: text(raw.moduleName),
    base: text(raw.base),
    candidate: text(raw.candidate),
    items,
    unmapped: sortBy(unmapped, item => item.changeId),
  };
}

export function parseP1Resolution(value: unknown): P1BackendResolution {
  const raw = record(value);
  return {
    aliases: list(raw.aliases).map(item => {
      const row = record(item);
      return {
        candidateUsecaseId: text(row.candidateUsecaseId),
        existingUsecaseId: text(row.existingUsecaseId),
        reason: text(row.reason) || 'existing usecase covers this operation under another name',
      };
    }).filter(row => row.candidateUsecaseId && row.existingUsecaseId),
    merges: list(raw.merges).map(item => {
      const row = record(item);
      return {
        usecaseId: text(row.usecaseId),
        entity: text(row.entity),
        operation: 'custom' as const,
        ports: unique(list(row.ports).map(value => text(value)).filter(Boolean)),
        replaces: unique(list(row.replaces).map(value => text(value)).filter(Boolean)),
        reason: text(row.reason) || 'write spans several entities; one transactional usecase',
      };
    }).filter(row => row.usecaseId && row.entity && row.replaces.length),
  };
}

export function planP1Backend(input: P1PlanBackendInput): P1PlanBackendResult {
  const ontology = new Map(input.ontology.map(entity => [entity.entityId, entity]));
  const matched = matchCandidates(collectCandidates(input.needs, ontology), input.inventory, ontology);
  let unresolved = collectUnresolved(matched, input.inventory, input.needs);
  let usecases = matched.usecases;
  let endpoints = matched.endpoints;
  if (input.resolution) {
    const applied = applyResolution(usecases, endpoints, input.resolution, input.inventory, ontology);
    usecases = applied.usecases;
    endpoints = applied.endpoints;
    unresolved = [];
  }
  const file = assembleFile({
    needs: input.needs,
    inventory: input.inventory,
    ontology,
    usecases,
    endpoints,
    now: input.now,
    llmCalled: !!input.resolution,
    l4diff: input.l4diff ?? null,
  });
  return { file, unresolved };
}

export function normalizeP1Backend(value: unknown, fallback: P1PlanBackendInput): P1BackendFile {
  const raw = record(value);
  const resolution = parseP1Resolution(raw);
  const hasResolution = resolution.aliases.length > 0 || resolution.merges.length > 0;
  if (hasResolution || Array.isArray(raw.aliases) || Array.isArray(raw.merges)) {
    return planP1Backend({ ...fallback, resolution }).file;
  }
  const needs = fallback.needs;
  const inventory = fallback.inventory;
  const ontology = new Map(fallback.ontology.map(entity => [entity.entityId, entity]));
  const endpoints = list(raw.endpoints).map(item => normalizeEndpoint(item, needs.moduleName));
  const usecases = list(raw.usecases).map(item => normalizeUsecase(item, ontology));
  const ports = list(raw.ports).map(item => normalizePort(item));
  const tables = list(raw.tables).map(item => normalizeTable(item));
  const removed = list(raw.removed).map(item => normalizeRemoved(item)).filter(Boolean) as P1Removed[];
  const meta = record(raw.meta);
  const pages = pagesFromMeta(meta.pages, endpoints, needs);
  const built = {
    schemaVersion: P1_BACKEND_SCHEMA_VERSION,
    moduleName: text(raw.moduleName) || needs.moduleName,
    device: P1_DEVICE,
    sourceNeeds: text(raw.sourceNeeds) || `pool/l1/${P1_DEVICE}/needs.json`,
    inventoryPresent: inventory.present,
    endpoints: sortBy(endpoints, item => item.route),
    usecases: sortBy(usecases, item => item.usecaseId),
    ports: sortBy(ports.filter(port => !isMdmEntity(ontology.get(port.entity))), item => item.portId),
    tables: sortBy(tables.filter(table => !isMdmEntity(ontology.get(table.entity))), item => item.tableId),
    removed: sortBy(removed, item => `${item.kind}:${item.id}`),
    changes: [],
    meta: {
      pages,
      generatedAt: text(meta.generatedAt) || fallback.now.toISOString(),
      llmCalled: meta.llmCalled === false ? false : true,
      unmappedChanges: [],
    },
  };
  return stampP1Backend(built, {
    ontology,
    inventory,
    needs,
    l4diff: fallback.l4diff ?? null,
  });
}

export function buildP1BackendTool(schema: Record<string, unknown>): mls.msg.LLMTool {
  return createP1ArtifactTool(
    'submitP1BackendResolution',
    'Resolve unmatched backend candidates: alias an existing l1 usecase of another name, or merge writes that span several entities into one custom usecase.',
    schema,
  );
}

export function buildP1ResolutionSchema(): Record<string, unknown> {
  return {
    $id: 'https://collab.codes/schemas/agentPlannerL1/backend-resolution/2026-09-21-p1-backend-v1',
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    required: ['aliases', 'merges'],
    properties: {
      aliases: {
        type: 'array',
        items: { $ref: '#/$defs/alias' },
      },
      merges: {
        type: 'array',
        items: { $ref: '#/$defs/merge' },
      },
    },
    $defs: {
      alias: {
        type: 'object',
        additionalProperties: false,
        required: ['candidateUsecaseId', 'existingUsecaseId', 'reason'],
        properties: {
          candidateUsecaseId: { type: 'string', minLength: 1 },
          existingUsecaseId: { type: 'string', minLength: 1 },
          reason: { type: 'string', minLength: 1 },
        },
      },
      merge: {
        type: 'object',
        additionalProperties: false,
        required: ['usecaseId', 'entity', 'operation', 'ports', 'replaces', 'reason'],
        properties: {
          usecaseId: { type: 'string', minLength: 1 },
          entity: { type: 'string', minLength: 1 },
          operation: { type: 'string', const: 'custom' },
          ports: { type: 'array', items: { type: 'string', minLength: 1 } },
          replaces: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
          reason: { type: 'string', minLength: 1 },
        },
      },
    },
  };
}

export function unwrapP1ArtifactPayload(value: unknown): unknown {
  const root = parseMaybeJson(value);
  const payload = isRecord(root) && root.type === 'flexible' ? parseMaybeJson(root.result) : root;
  const argumentsValue = toolArguments(payload);
  if (argumentsValue === undefined) return payload;
  const argumentsPayload = parseMaybeJson(argumentsValue);
  return isRecord(argumentsPayload) && argumentsPayload.type === 'flexible'
    ? parseMaybeJson(argumentsPayload.result)
    : argumentsPayload;
}

interface UsecaseDraft extends Omit<P1Usecase, 'tableRefs' | 'noTable'> {
  nameMatched: boolean;
  family: P1NeedsFamily;
  derived: string[];
}

interface EndpointDraft {
  page: string;
  kind: P1Kind;
  usecaseId: string;
}

interface Matched {
  usecases: UsecaseDraft[];
  endpoints: EndpointDraft[];
}

function collectCandidates(needs: P1NeedsFile, ontology: Map<string, P1EntityView>): Matched {
  const usecases = new Map<string, UsecaseDraft>();
  const endpoints: EndpointDraft[] = [];
  const addUsecase = (draft: UsecaseDraft) => {
    const current = usecases.get(draft.usecaseId);
    if (!current) {
      usecases.set(draft.usecaseId, draft);
      return;
    }
    current.derived = unique([...current.derived, ...draft.derived]);
  };
  const addEndpoint = (page: string, kind: P1Kind, usecaseId: string) => {
    if (endpoints.some(item => item.page === page && item.kind === kind && item.usecaseId === usecaseId)) return;
    endpoints.push({ page, kind, usecaseId });
  };

  const collidingTransitions = collidingTransitionIds(needs);
  for (const page of needs.pages) {
    for (const read of page.reads) {
      const family = familyFor(read.entity, ontology, read.family);
      for (const operation of readOperations(read.from)) {
        const usecaseId = p1UsecaseId(operation, read.entity);
        addUsecase({
          usecaseId,
          entity: read.entity,
          operation,
          ports: portEntities(read.entity, family, ontology),
          status: 'toCreate',
          existing: '',
          reason: `no l1 usecase for ${read.entity}.${operation}`,
          nameMatched: false,
          family,
          derived: [...read.derived],
        });
        addEndpoint(page.pageId, 'qry', usecaseId);
      }
    }
    for (const write of page.writes) {
      const family = familyFor(write.entity, ontology);
      const operation: P1Operation = write.operation;
      let usecaseId = p1UsecaseId(operation, write.entity, write.transitionRef);
      if (operation === 'transition' && collidingTransitions.has(usecaseId)) usecaseId = `${usecaseId}${write.entity}`;
      addUsecase({
        usecaseId,
        entity: write.entity,
        operation,
        ports: portEntities(write.entity, family, ontology),
        status: 'toCreate',
        existing: '',
        reason: `no l1 usecase for ${write.entity}.${operation}`,
        nameMatched: false,
        family,
        derived: [],
      });
      addEndpoint(page.pageId, 'cmd', usecaseId);
    }
  }
  return { usecases: [...usecases.values()], endpoints };
}

function collidingTransitionIds(needs: P1NeedsFile): Set<string> {
  const entitiesById = new Map<string, Set<string>>();
  for (const page of needs.pages) {
    for (const write of page.writes) {
      if (write.operation !== 'transition') continue;
      const id = p1UsecaseId('transition', write.entity, write.transitionRef);
      const entities = entitiesById.get(id) ?? new Set<string>();
      entities.add(write.entity);
      entitiesById.set(id, entities);
    }
  }
  const colliding = new Set<string>();
  for (const [id, entities] of entitiesById) {
    if (entities.size > 1) colliding.add(id);
  }
  return colliding;
}

function matchCandidates(candidates: Matched, inventory: L1Inventory, ontology: Map<string, P1EntityView>): Matched {
  if (!inventory.present) return candidates;
  const usecases = candidates.usecases.map(candidate => {
    const found = findExisting(inventory, candidate);
    if (!found) return candidate;
    const covers = coversNeed(found, candidate.derived);
    return {
      ...candidate,
      nameMatched: true,
      existing: found.file,
      status: (covers ? 'done' : 'toUpdate') as P1PlanStatus,
      reason: covers
        ? `l1 usecase covers ${candidate.entity}.${candidate.operation}`
        : `l1 usecase missing derived fields: ${missingDerived(found, candidate.derived).join(', ') || 'output'}`,
      ports: portEntities(candidate.entity, candidate.family, ontology),
    };
  });
  return { usecases, endpoints: candidates.endpoints };
}

function collectUnresolved(matched: Matched, inventory: L1Inventory, needs: P1NeedsFile): P1UnresolvedItem[] {
  if (!inventory.present) return [];
  const out: P1UnresolvedItem[] = [];
  for (const usecase of matched.usecases) {
    if (usecase.nameMatched) continue;
    out.push({
      kind: 'alias',
      candidateUsecaseId: usecase.usecaseId,
      entity: usecase.entity,
      operation: usecase.operation,
      reason: `no l1 usecase named ${usecase.usecaseId}; inventory may cover it under another name`,
    });
  }
  for (const page of needs.pages) {
    const entities = unique(page.writes.map(item => item.entity));
    if (entities.length < 2) continue;
    const first = matched.usecases.find(item => item.entity === entities[0] && item.operation !== 'list' && item.operation !== 'get');
    out.push({
      kind: 'merge',
      candidateUsecaseId: first?.usecaseId || p1UsecaseId('create', entities[0]),
      entity: entities[0],
      operation: 'custom',
      reason: `page ${page.pageId} writes ${entities.join(', ')}; may be one transactional usecase`,
    });
  }
  return out;
}

function applyResolution(
  usecases: UsecaseDraft[],
  endpoints: EndpointDraft[],
  resolution: P1BackendResolution,
  inventory: L1Inventory,
  ontology: Map<string, P1EntityView>,
): { usecases: UsecaseDraft[]; endpoints: EndpointDraft[] } {
  const byId = new Map(usecases.map(item => [item.usecaseId, item]));
  for (const alias of resolution.aliases) {
    const candidate = byId.get(alias.candidateUsecaseId);
    const existing = inventory.usecases.find(item => item.usecaseId === alias.existingUsecaseId
      || item.functions.some(fn => fn.name === alias.existingUsecaseId));
    if (!candidate || !existing) continue;
    byId.delete(alias.candidateUsecaseId);
    const covers = coversNeed(existing, candidate.derived);
    const next: UsecaseDraft = {
      ...candidate,
      usecaseId: existing.usecaseId,
      nameMatched: true,
      existing: existing.file,
      status: covers ? 'done' : 'toUpdate',
      reason: alias.reason,
    };
    byId.set(next.usecaseId, next);
    for (const endpoint of endpoints) {
      if (endpoint.usecaseId === alias.candidateUsecaseId) endpoint.usecaseId = next.usecaseId;
    }
  }
  for (const merge of resolution.merges) {
    const replaced = merge.replaces.map(id => byId.get(id)).filter((item): item is UsecaseDraft => !!item);
    if (!replaced.length) continue;
    const family = familyFor(merge.entity, ontology);
    const ports = unique(merge.ports.length
      ? merge.ports.filter(entity => !isMdmEntity(ontology.get(entity)))
      : replaced.flatMap(item => item.ports));
    const next: UsecaseDraft = {
      usecaseId: merge.usecaseId,
      entity: merge.entity,
      operation: 'custom',
      ports,
      status: 'toCreate',
      existing: '',
      reason: merge.reason,
      nameMatched: false,
      family,
      derived: unique(replaced.flatMap(item => item.derived)),
    };
    for (const id of merge.replaces) byId.delete(id);
    byId.set(next.usecaseId, next);
    for (const endpoint of endpoints) {
      if (merge.replaces.includes(endpoint.usecaseId)) endpoint.usecaseId = next.usecaseId;
    }
  }
  return { usecases: [...byId.values()], endpoints };
}

function assembleFile(input: {
  needs: P1NeedsFile;
  inventory: L1Inventory;
  ontology: Map<string, P1EntityView>;
  usecases: UsecaseDraft[];
  endpoints: EndpointDraft[];
  now: Date;
  llmCalled: boolean;
  l4diff: P1L4DiffFile | null;
}): P1BackendFile {
  const { needs, inventory, ontology, now, llmCalled } = input;
  const usecases = sortBy(input.usecases.map(item => stripDraft(item)), item => item.usecaseId);
  const usecaseById = new Map(usecases.map(item => [item.usecaseId, item]));
  const endpoints = sortBy(input.endpoints.map(item => {
    const usecase = usecaseById.get(item.usecaseId);
    const route = p1Route(needs.moduleName, item.page, item.kind, item.usecaseId);
    const routeDone = inventory.routes.includes(route);
    const status: P1PlanStatus = routeDone
      ? (usecase?.status === 'toUpdate' ? 'toUpdate' : 'done')
      : 'toCreate';
    return { route, page: item.page, kind: item.kind, usecaseRef: item.usecaseId, status, tableRefs: [] as string[], noTable: 'none' as const };
  }), item => item.route);

  const neededEntities = unique(usecases.flatMap(item => item.ports.length ? item.ports : (isMdmEntity(ontology.get(item.entity)) ? [] : [item.entity])));
  const ports = sortBy(
    neededEntities.filter(entity => wantsPort(ontology.get(entity))).map(entity => {
      const existing = inventory.ports.find(item => item.entity === entity || item.portId === p1PortId(entity));
      return {
        portId: existing?.portId || p1PortId(entity),
        entity,
        status: (existing ? 'done' : 'toCreate') as P1PlanStatus,
        tableRefs: [],
        noTable: 'none' as const,
      };
    }),
    item => item.portId,
  );
  const tables = sortBy(
    neededEntities.filter(entity => wantsTable(ontology.get(entity))).map(entity => {
      const existing = inventory.tables.find(item => item.entity === entity || item.tableId.toLowerCase() === p1TableId(entity));
      return {
        tableId: existing?.tableId || p1TableId(entity),
        entity,
        status: (existing ? 'done' : 'toCreate') as P1PlanStatus,
        tableRefs: [],
        noTable: 'none' as const,
      };
    }),
    item => item.tableId,
  );

  const usedUsecaseIds = new Set(usecases.map(item => item.usecaseId));
  const usedPortEntities = new Set(ports.map(item => item.entity));
  const usedTableEntities = new Set(tables.map(item => item.entity));
  const removed: P1Removed[] = [];
  if (inventory.present) {
    for (const usecase of inventory.usecases) {
      if (usedUsecaseIds.has(usecase.usecaseId)) continue;
      removed.push({
        kind: 'usecase',
        id: usecase.usecaseId,
        status: 'toRemove',
        reason: 'exists in l1, no page needs it',
        tableRefs: [] as string[],
        noTable: 'none' as const,
      });
    }
    for (const port of inventory.ports) {
      if (usedPortEntities.has(port.entity) || usedPortEntities.has(port.portId.replace(/Repository$/, ''))) continue;
      removed.push({
        kind: 'port',
        id: port.portId,
        status: 'toRemove',
        reason: 'exists in l1, no page needs it',
        tableRefs: [] as string[],
        noTable: 'none' as const,
      });
    }
    for (const table of inventory.tables) {
      if (usedTableEntities.has(table.entity)) continue;
      removed.push({
        kind: 'table',
        id: table.tableId,
        status: 'toRemove',
        reason: 'exists in l1, no page needs it',
        tableRefs: [] as string[],
        noTable: 'none' as const,
      });
    }
  }

  const pages: Record<string, string[]> = {};
  for (const page of needs.pages) {
    pages[page.pageId] = endpoints.filter(item => item.page === page.pageId).map(item => item.route);
  }

  return stampP1Backend({
    schemaVersion: P1_BACKEND_SCHEMA_VERSION,
    moduleName: needs.moduleName,
    device: needs.device || P1_DEVICE,
    sourceNeeds: `pool/l1/${needs.device || P1_DEVICE}/needs.json`,
    inventoryPresent: inventory.present,
    endpoints,
    usecases,
    ports,
    tables,
    removed: sortBy(removed, item => `${item.kind}:${item.id}`),
    changes: [],
    meta: {
      pages,
      generatedAt: now.toISOString(),
      llmCalled,
      unmappedChanges: [],
    },
  }, {
    ontology,
    inventory,
    needs,
    l4diff: input.l4diff,
  });
}

function stripDraft(draft: UsecaseDraft): P1Usecase {
  return {
    usecaseId: draft.usecaseId,
    entity: draft.entity,
    operation: draft.operation,
    ports: draft.ports,
    status: draft.status,
    existing: draft.status === 'toCreate' ? '' : draft.existing,
    reason: draft.reason,
    tableRefs: [],
    noTable: 'none',
  };
}

function findExisting(inventory: L1Inventory, candidate: UsecaseDraft): L1InventoryUsecase | undefined {
  const exact = inventory.usecases.find(item =>
    item.usecaseId === candidate.usecaseId
    || item.functions.some(fn => fn.name === candidate.usecaseId),
  );
  if (exact) return exact;
  return inventory.usecases.find(item => {
    const parsed = parseUsecaseName(item.usecaseId) || item.functions.map(fn => parseUsecaseName(fn.name)).find(Boolean);
    return parsed?.entity === candidate.entity && parsed.operation === candidate.operation;
  });
}

function parseUsecaseName(id: string): { operation: P1Operation; entity: string } | null {
  for (const operation of NAMED_OPS) {
    if (id.startsWith(operation) && id.length > operation.length && id[operation.length] === id[operation.length].toUpperCase()) {
      return { operation, entity: id.slice(operation.length) };
    }
  }
  return null;
}

function coversNeed(usecase: L1InventoryUsecase, derived: string[]): boolean {
  if (!usecase.functions.length) return false;
  if (!derived.length) return true;
  return missingDerived(usecase, derived).length === 0;
}

function missingDerived(usecase: L1InventoryUsecase, derived: string[]): string[] {
  const names = new Set<string>();
  for (const fn of usecase.functions) {
    for (const field of [...fn.input, ...fn.output]) {
      if (field.name) names.add(field.name);
      const ref = field.fieldRef?.split('.').pop();
      if (ref) names.add(ref);
    }
  }
  const lower = new Set([...names].map(item => item.toLowerCase()));
  return derived.filter(item => !names.has(item) && !lower.has(item.toLowerCase()));
}

function readOperations(from: readonly string[]): Array<'list' | 'get'> {
  const ops = new Set<'list' | 'get'>();
  for (const item of from) {
    const value = item.toLowerCase();
    if (GET_FROM.test(value)) ops.add('get');
    if (LIST_FROM.test(value) || value.includes('/locate')) ops.add('list');
  }
  if (!ops.size) ops.add('list');
  return [...ops];
}

function familyFor(entityId: string, ontology: Map<string, P1EntityView>, needFamily?: string): P1NeedsFamily {
  if (needFamily && isP1NeedsFamily(needFamily)) return needFamily;
  return ontology.get(entityId)?.family || 'tdm';
}

function familyOf(input: {
  kind: string;
  storageTarget: string;
  storageKind: string;
  familyField: string;
  capabilities: string[];
}): P1NeedsFamily {
  if (input.familyField && isP1NeedsFamily(input.familyField)) return input.familyField;
  if (input.kind === 'role' || input.storageTarget === 'mdm') return 'mdm';
  if (input.storageKind === 'timeSeries' || input.capabilities.includes('aggregate.byWindow')) return 'ddm';
  return 'tdm';
}

function isMdmEntity(entity: P1EntityView | undefined): boolean {
  if (!entity) return false;
  return entity.family === 'mdm' || entity.storageTarget === 'mdm';
}

function wantsTable(entity: P1EntityView | undefined): boolean {
  if (!entity || isMdmEntity(entity) || entity.storageTarget === 'derived') return false;
  if (entity.family === 'ddm') return RELATIONAL_KIND.test(entity.storageKind);
  return true;
}

function wantsPort(entity: P1EntityView | undefined): boolean {
  return wantsTable(entity);
}

function portEntities(entity: string, family: P1NeedsFamily, ontology: Map<string, P1EntityView>): string[] {
  const view = ontology.get(entity);
  if (family === 'mdm' || isMdmEntity(view)) return [];
  if (!wantsPort(view) && view) return [];
  if (view && !wantsPort(view)) return [];
  return [entity];
}

function parseNeedsPage(value: unknown, index: number): P1NeedsPage {
  const raw = record(value);
  const pageId = text(raw.pageId);
  if (!pageId) throw new Error(`needs.json pages[${index}] needs pageId.`);
  return {
    pageId,
    actors: unique(list(raw.actors).map(item => text(item)).filter(Boolean)),
    reads: list(raw.reads).map(item => parseNeedsRead(item)),
    writes: list(raw.writes).map(item => parseNeedsWrite(item)),
  };
}

function parseNeedsRead(value: unknown): P1NeedsRead {
  const raw = record(value);
  const family = text(raw.family);
  return {
    entity: text(raw.entity),
    family: isP1NeedsFamily(family) ? family : 'tdm',
    scope: text(raw.scope),
    derived: unique(list(raw.derived).map(item => text(item)).filter(Boolean)),
    from: unique(list(raw.from).map(item => text(item)).filter(Boolean)),
  };
}

function parseNeedsWrite(value: unknown): P1NeedsWrite {
  const raw = record(value);
  const operation = text(raw.operation);
  return {
    entity: text(raw.entity),
    operation: isP1WriteOperation(operation) ? operation : 'create',
    transitionRef: text(raw.transitionRef),
    from: unique(list(raw.from).map(item => text(item)).filter(Boolean)),
  };
}

function normalizeEndpoint(value: unknown, moduleName: string): P1Endpoint {
  const raw = record(value);
  const kindRaw = text(raw.kind);
  const kind: P1Kind = isP1Kind(kindRaw) ? kindRaw : 'qry';
  const usecaseRef = text(raw.usecaseRef);
  const page = text(raw.page);
  const statusRaw = text(raw.status);
  return {
    route: text(raw.route) || p1Route(moduleName, page, kind, usecaseRef),
    page,
    kind,
    usecaseRef,
    status: planStatus(statusRaw, 'toCreate'),
    tableRefs: [],
    noTable: 'none',
  };
}

function normalizeUsecase(value: unknown, ontology: Map<string, P1EntityView>): P1Usecase {
  const raw = record(value);
  const operationRaw = text(raw.operation);
  const status = planStatus(text(raw.status), 'toCreate');
  const entity = text(raw.entity);
  const ports = unique(list(raw.ports).map(item => text(item)).filter(entityName => !isMdmEntity(ontology.get(entityName))));
  return {
    usecaseId: text(raw.usecaseId),
    entity,
    operation: isP1Operation(operationRaw) ? operationRaw : 'custom',
    ports: isMdmEntity(ontology.get(entity)) ? [] : ports,
    status,
    existing: status === 'toCreate' ? '' : text(raw.existing),
    reason: text(raw.reason) || `no l1 usecase for ${entity}.${operationRaw || 'custom'}`,
    tableRefs: [],
    noTable: 'none',
  };
}

function normalizePort(value: unknown): P1Port {
  const raw = record(value);
  const entity = text(raw.entity);
  return {
    portId: text(raw.portId) || p1PortId(entity),
    entity,
    status: planStatus(text(raw.status), 'toCreate'),
    tableRefs: [],
    noTable: 'none',
  };
}

function normalizeTable(value: unknown): P1Table {
  const raw = record(value);
  const entity = text(raw.entity);
  return {
    tableId: text(raw.tableId) || p1TableId(entity),
    entity,
    status: planStatus(text(raw.status), 'toCreate'),
    tableRefs: [],
    noTable: 'none',
  };
}

function normalizeRemoved(value: unknown): P1Removed | null {
  const raw = record(value);
  const kind = text(raw.kind);
  const id = text(raw.id);
  if (!(P1_REMOVED_KINDS as readonly string[]).includes(kind) || !id) return null;
  return {
    kind: kind as P1RemovedKind,
    id,
    status: 'toRemove',
    reason: text(raw.reason) || 'exists in l1, no page needs it',
    tableRefs: [],
    noTable: 'none',
  };
}

function pagesFromMeta(value: unknown, endpoints: P1Endpoint[], needs: P1NeedsFile): Record<string, string[]> {
  const pages: Record<string, string[]> = {};
  if (isRecord(value)) {
    for (const [pageId, routes] of Object.entries(value)) {
      pages[pageId] = unique(list(routes).map(item => text(item)).filter(Boolean));
    }
  }
  for (const page of needs.pages) {
    if (!pages[page.pageId]) {
      pages[page.pageId] = endpoints.filter(item => item.page === page.pageId).map(item => item.route);
    }
  }
  return pages;
}

function planStatus(value: string, fallback: P1PlanStatus): P1PlanStatus {
  if (value === 'inProgress') return 'toUpdate';
  return isP1PlanStatus(value) ? value : fallback;
}

function createP1ArtifactTool(
  toolName: string,
  description: string,
  artifactSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  const result: Record<string, unknown> = { ...artifactSchema };
  const defs = result.$defs;
  delete result.$defs;
  delete result.$id;
  delete result.$schema;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'result'],
    properties: {
      type: { type: 'string', const: 'flexible' },
      result,
    },
  };
  if (isRecord(defs)) parameters.$defs = defs;
  return { type: 'function', function: { name: toolName, description, parameters } } as mls.msg.LLMTool;
}

function toolArguments(value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  if (value.arguments !== undefined) return value.arguments;
  const fn = record(value.function);
  if (fn.arguments !== undefined) return fn.arguments;
  return undefined;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function parseL4DiffItem(value: unknown): P1L4DiffItem | null {
  const raw = record(value);
  const changeId = text(raw.changeId);
  const kind = text(raw.kind);
  const op = text(raw.op);
  if (!changeId || !isP1ChangeKind(kind) || !isP1ChangeOp(op)) return null;
  return {
    changeId,
    kind,
    op,
    entity: text(raw.entity),
    source: text(raw.source),
    before: record(raw.before),
    after: record(raw.after),
  };
}

export function stampP1Backend(file: P1BackendFile, ctx: {
  ontology: Map<string, P1EntityView>;
  inventory: L1Inventory;
  needs: P1NeedsFile;
  l4diff: P1L4DiffFile | null;
}): P1BackendFile {
  const tables = file.tables.map(table => ({
    ...table,
    tableRefs: [table.tableId],
    noTable: 'ok' as const,
  }));
  const byEntity = new Map(tables.map(table => [table.entity, table.tableId]));
  const ports = file.ports.map(port => withTableRefs(port, [port.entity], byEntity, ctx.ontology));
  const usecases = file.usecases.map(usecase => {
    const entities = usecase.ports.length ? usecase.ports : [usecase.entity];
    return withTableRefs(usecase, entities, byEntity, ctx.ontology);
  });
  const usecaseById = new Map(usecases.map(item => [item.usecaseId, item]));
  const endpoints = file.endpoints.map(endpoint => {
    const usecase = usecaseById.get(endpoint.usecaseRef);
    return {
      ...endpoint,
      tableRefs: usecase ? [...usecase.tableRefs] : [],
      noTable: usecase?.noTable ?? 'none',
    };
  });
  const removed = file.removed.map(item => {
    const found = tableRefsForRemoved(item, tables, ctx.inventory);
    return { ...item, tableRefs: found.tableRefs, noTable: classifyNoTable(found.tableRefs, found.entities, ctx.ontology) };
  });
  return {
    ...file,
    schemaVersion: P1_BACKEND_SCHEMA_VERSION,
    endpoints,
    usecases,
    ports,
    tables,
    removed,
    changes: mapP1Changes(ctx.l4diff, {
      usecases,
      endpoints,
      tables,
      needs: ctx.needs,
      inventory: ctx.inventory,
      ontology: ctx.ontology,
      byEntity,
    }),
    meta: {
      ...file.meta,
      unmappedChanges: ctx.l4diff ? [...ctx.l4diff.unmapped] : [],
    },
  };
}

function withTableRefs<T extends { entity: string }>(
  item: T,
  entities: readonly string[],
  byEntity: Map<string, string>,
  ontology: Map<string, P1EntityView>,
): T & { tableRefs: string[]; noTable: P1NoTable } {
  const tableRefs = unique(entities.map(entity => byEntity.get(entity) || ''));
  return { ...item, tableRefs, noTable: classifyNoTable(tableRefs, entities, ontology) };
}

function classifyNoTable(
  tableRefs: readonly string[],
  entities: readonly string[],
  ontology: Map<string, P1EntityView>,
): P1NoTable {
  if (tableRefs.length) return 'ok';
  if (entities.some(entity => isMdmEntity(ontology.get(entity)))) return 'mdm';
  return 'none';
}

function tableRefsForRemoved(
  item: P1Removed,
  tables: readonly P1Table[],
  inventory: L1Inventory,
): { tableRefs: string[]; entities: string[] } {
  if (item.kind === 'table') {
    const leftover = tables.find(table => table.tableId === item.id);
    return leftover
      ? { tableRefs: [leftover.tableId], entities: [leftover.entity] }
      : { tableRefs: [], entities: [] };
  }
  if (item.kind === 'port') {
    const port = inventory.ports.find(candidate => candidate.portId === item.id);
    const entity = port?.entity || item.id.replace(/Repository$/, '');
    const table = tables.find(candidate => candidate.entity === entity || candidate.tableId === p1TableId(entity));
    return { tableRefs: table ? [table.tableId] : [], entities: entity ? [entity] : [] };
  }
  const usecase = inventory.usecases.find(candidate => candidate.usecaseId === item.id);
  const parsed = parseUsecaseName(item.id);
  const entities = unique([
    ...(usecase?.ports ?? []),
    parsed?.entity || '',
  ]);
  const tableRefs = unique(entities.map(entity => tables.find(table => table.entity === entity)?.tableId || ''));
  const known = entities.length ? entities : (parsed?.entity ? [parsed.entity] : []);
  return { tableRefs, entities: known };
}

function mapP1Changes(l4diff: P1L4DiffFile | null, ctx: {
  usecases: readonly P1Usecase[];
  endpoints: readonly P1Endpoint[];
  tables: readonly P1Table[];
  needs: P1NeedsFile;
  inventory: L1Inventory;
  ontology: Map<string, P1EntityView>;
  byEntity: Map<string, string>;
}): P1Change[] {
  if (!l4diff) return [];
  return sortBy(l4diff.items.map(item => {
    const entities = changeEntitiesFor(item, ctx);
    const tableRefs = unique(entities.map(entity => ctx.byEntity.get(entity) || ''));
    const noTable = classifyNoTable(tableRefs, entities, ctx.ontology);
    return {
      changeId: item.changeId,
      kind: item.kind,
      op: item.op,
      entity: item.entity || (entities.length === 1 ? entities[0] : ''),
      tableRefs,
      noTable,
      usecaseRefs: changeUsecaseRefs(item, entities, ctx),
      reason: changeReason(item),
      source: item.source,
    };
  }), item => item.changeId);
}

function changeEntities(item: P1L4DiffItem): string[] {
  const fromFrag = (frag: Record<string, unknown>): string[] => {
    const refs = list(frag.entityRefs).map(value => {
      if (typeof value === 'string') return text(value);
      const row = record(value);
      return text(row.entityId) || text(row.entity);
    });
    const named = list(frag.entities).map(value => {
      if (typeof value === 'string') return text(value);
      const row = record(value);
      return text(row.entityId) || text(row.entity);
    });
    return [...refs, ...named, text(frag.entity)];
  };
  return unique([item.entity, ...fromFrag(item.before), ...fromFrag(item.after)]);
}

function changeEntitiesFor(
  item: P1L4DiffItem,
  ctx: {
    usecases: readonly P1Usecase[];
    inventory: L1Inventory;
    ontology: Map<string, P1EntityView>;
  },
): string[] {
  const named = changeEntities(item);
  if (item.kind !== 'rule') return named;
  const ruleId = ruleIdOf(item);
  if (citedUsecaseIds(ruleId, ctx).length) return named;
  return unique([...named, ...entitiesGoverningRule(ruleId, ctx.ontology)]);
}

function ruleIdOf(item: P1L4DiffItem): string {
  return item.changeId.startsWith('rule:') ? item.changeId.slice('rule:'.length) : item.changeId;
}

function citedUsecaseIds(
  ruleId: string,
  ctx: { inventory: L1Inventory; usecases: readonly P1Usecase[] },
): string[] {
  return unique(
    ctx.inventory.usecases
      .filter(usecase => (usecase.rulesApplied ?? []).includes(ruleId))
      .map(usecase => usecase.usecaseId)
      .filter(id => ctx.usecases.some(usecase => usecase.usecaseId === id)),
  );
}

function entitiesGoverningRule(ruleId: string, ontology: Map<string, P1EntityView>): string[] {
  // Exact match only — l4 spelling splits (Competencia vs competencia) must stay visible.
  const out: string[] = [];
  for (const entity of ontology.values()) {
    if ((entity.rules ?? []).includes(ruleId)) out.push(entity.entityId);
  }
  return out;
}

function changeUsecaseRefs(
  item: P1L4DiffItem,
  entities: readonly string[],
  ctx: {
    usecases: readonly P1Usecase[];
    endpoints: readonly P1Endpoint[];
    needs: P1NeedsFile;
    inventory: L1Inventory;
  },
): string[] {
  if (item.kind === 'rule') {
    const cited = citedUsecaseIds(ruleIdOf(item), ctx);
    if (cited.length) return cited;
  }
  const byEntity = ctx.usecases.filter(usecase =>
    entities.includes(usecase.entity) || usecase.ports.some(port => entities.includes(port)),
  ).map(usecase => usecase.usecaseId);
  if (item.kind === 'grant') {
    const actor = text(item.after.actor) || text(item.after.actorId) || text(item.after.authority)
      || text(item.before.actor) || text(item.before.actorId) || text(item.before.authority);
    if (!actor) return unique(byEntity);
    const pages = new Set(ctx.needs.pages.filter(page => page.actors.includes(actor)).map(page => page.pageId));
    const fromActor = ctx.endpoints
      .filter(endpoint => pages.has(endpoint.page))
      .map(endpoint => endpoint.usecaseRef);
    const matched = ctx.usecases.filter(usecase => {
      if (!fromActor.includes(usecase.usecaseId)) return false;
      if (!entities.length) return true;
      return entities.includes(usecase.entity) || usecase.ports.some(port => entities.includes(port));
    }).map(usecase => usecase.usecaseId);
    return unique(matched.length ? matched : byEntity);
  }
  return unique(byEntity);
}

function changeReason(item: P1L4DiffItem): string {
  const fromId = item.changeId.includes(':') ? item.changeId.slice(item.changeId.indexOf(':') + 1) : item.changeId;
  const field = text(item.after.fieldId) || text(item.before.fieldId) || text(item.after.name);
  const label = item.kind === 'field' && field ? field : fromId;
  if (item.entity) return `${item.op} ${item.kind} ${label} on ${item.entity}`;
  return `${item.op} ${item.kind} ${label}`;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function sortBy<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((left, right) => key(left).localeCompare(key(right)));
}

function pascal(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
