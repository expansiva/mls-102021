/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Artifact.ts" enhancement="_blank"/>

import { moduleTokenOk } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';

export const D1_DEFINITION_SCHEMA = '2026-09-21-d1-definition-v1' as const;

/**
 * Measured on RequestContext.data.pgQueue. RequestContext itself has no publishEvent or emitEvent.
 * Postgres publish inserts into the MDM outbox. It is not a module bus.
 * The constant is evidence of the real API. It is not an approved integrationOutbound binding.
 */
export const D1_MEASURED_PUBLISH = {
  symbol: 'IQueueRuntime.publish',
  path: 'mls-102034/l1/server/layer_1_external/data/runtime.ts',
  owner: 'RequestContext.data.pgQueue',
  payload: '{ topic: string; payload: unknown }',
  delivery: 'Postgres insert into mdm_outbox. Memory keeps an array. No module consumer is registered.',
  transaction: 'Postgres publish uses the transaction executor. Memory runInTransaction does not roll back.',
} as const;

/** Names that are not methods of RequestContext. Writing them would invent an API. */
export function fictionalMechanism(value: string): boolean {
  return value.split(/[^A-Za-z0-9_]+/).some(token => token === 'publishEvent' || token === 'emitEvent');
}
export const D1_CATALOG_SCHEMA = '2026-09-21-d1-catalog-v1' as const;

/** Closed set. Auxiliary names are not dispatched by agentChangeBackend. */
export const D1_ARTIFACT_TYPES = [
  'domainEntity',
  'valueObject',
  'repositoryPort',
  'table',
  'repositoryAdapter',
  'usecase',
  'httpController',
  'accessScope',
  'authorityMap',
  'repositoryRegistration',
  'persistenceSeeds',
  'integrationOutbound',
] as const;

export type D1ArtifactType = typeof D1_ARTIFACT_TYPES[number];

/** Types readL1Inventory already filters on. */
export const D1_INVENTORY_TYPES = ['usecase', 'repositoryPort', 'table', 'httpController'] as const;

/** Design forecast parts. Not a count of files this agent writes. */
export const D1_CORE_TYPES = [
  'domainEntity',
  'repositoryPort',
  'table',
  'repositoryAdapter',
  'usecase',
  'httpController',
] as const;

export const D1_AUXILIARY_TYPES = [
  'valueObject',
  'accessScope',
  'authorityMap',
  'repositoryRegistration',
  'persistenceSeeds',
  'integrationOutbound',
] as const;

export const D1_FORECAST_CORE = {
  count: 26,
  parts: {
    domainEntity: 5,
    repositoryPort: 1,
    table: 1,
    repositoryAdapter: 1,
    usecase: 13,
    httpController: 5,
  },
  note: 'Design forecast: 5 models, 1 port, 1 table, 1 adapter, 13 usecases and 5 controllers. It is not a count of files this agent generated.',
} as const;

export const D1_STORAGE_TARGETS = ['moduleDatabase', 'mdm', 'external', 'derived'] as const;
export type D1StorageTarget = typeof D1_STORAGE_TARGETS[number];

const ENVELOPE_KEYS = ['schemaVersion', 'artifactType', 'artifactId', 'moduleName', 'data'] as const;
const TOKEN = /^[A-Za-z][A-Za-z0-9_]*$/;
const CONSTRAINT = /^[A-Za-z][A-Za-z0-9:+._-]*$/;

export interface D1Field {
  name: string;
  type: string;
  derived?: boolean;
  ref?: string;
}

export interface D1LifecycleState {
  state: string;
  reachedBy: 'actor' | 'command' | 'time';
}

export interface D1Transition {
  transitionId: string;
  from: string[];
  to: string;
  by: string[];
  ruleRefs: string[];
}

export interface D1DomainEntityData {
  entityId: string;
  storageTarget: D1StorageTarget;
  fields: D1Field[];
  lifecycle: { states: D1LifecycleState[]; transitions: D1Transition[] };
  invariants: string[];
  imports: string[];
}

export interface D1ValueObjectData {
  valueObjectId: string;
  fields: D1Field[];
  referencedBy: string[];
}

export interface D1PortMethod {
  name: string;
  params: string[];
  returns: string;
}

export interface D1RepositoryPortData {
  entityId: string;
  interfaceName: string;
  methods: D1PortMethod[];
}

export interface D1TableData {
  tableId: string;
  entityId: string;
  physicalName: string;
  primaryKey: string[];
  uniqueKeys: string[][];
  indexes: Array<{ name: string; columns: string[]; unique: boolean }>;
}

export interface D1RepositoryAdapterData {
  entityId: string;
  portId: string;
  tableId: string;
  columns: Array<{ field: string; column: string }>;
}

export interface D1ProjectionField {
  name: string;
  type?: string;
  fieldRef?: string;
}

export interface D1UsecaseData {
  usecaseId: string;
  entityId: string;
  operation: string;
  ports: string[];
  rulesApplied: string[];
  /** Present on defs written after applicability is planned. Older examples omit it. */
  rulePlan?: Array<{
    ruleId: string;
    origin: string;
    consumer: string;
    enforcement: 'local' | 'delegated' | 'pending';
    gap: string;
  }>;
  functions: Array<{
    functionName: string;
    input: D1ProjectionField[];
    output: D1ProjectionField[];
    contractRefs: Array<{ route: string; symbol: string }>;
  }>;
  routeProjections: Array<{
    route: string;
    contractPath: string;
    projection: 'declared' | 'unresolved';
    outputFields: string[];
  }>;
  portCalls: string[];
  transactional: boolean;
  effects: Array<{ eventId: string; path: string; symbol: string }>;
  sequence: Array<Record<string, unknown>>;
  uses: Array<{ path: string; role: 'filter' | 'selector' | 'concurrency' | 'write'; source: 'input' | 'payload' }>;
  rules: Array<{ ruleId: string; path: string; symbol: string }>;
  transaction: { boundary: 'local' | 'none' };
  lifecycle?: { transitionId: string; payload: string[]; sourcePath: string; symbol: string };
  mdm?: {
    namespace: string;
    role: string;
    atomic: boolean;
    calls: Array<Record<string, unknown>>;
  };
}

export interface D1HttpControllerData {
  pageId: string;
  handlers: Array<{ route: string; kind: 'query' | 'command'; usecaseId: string; grantIds: string[] }>;
}

export interface D1AccessJoin {
  relationshipId: string;
  from: string;
  to: string;
  field: string;
}

export interface D1Grant {
  grantId: string;
  actorRef: string;
  anchorEntity?: string;
  entityRefs: string[];
  disclosure: 'fieldsOnly' | 'fullRecord';
  allowedFields?: string[];
  /** Declared mode. own and organization stay distinct. Never a permissive fallback. */
  scopeMode: string;
  /** Subject comes from the verified session, never from a form field. */
  session: 'verified';
  path: D1AccessJoin[];
  pending: string;
}

export interface D1AccessScopeData {
  scopeId: string;
  grants: D1Grant[];
}

/** A serialized def plus the files it declares. Reconstruction does not read drafts. */
export interface D1PolicyUnit {
  defPath: string;
  artifactType: string;
  data: unknown;
  dependencies: readonly string[];
}

export interface D1ReconstructedPolicy {
  route: string;
  grantId: string;
  actorRef: string;
  entityRefs: string[];
  disclosure: string;
  allowedFields: string[];
  anchorEntity: string;
  scopeMode: string;
  session: 'verified';
  path: D1AccessJoin[];
  pending: string;
  scopePath: string;
}

export interface D1AccessPolicyIssue {
  code: 'POLICY_UNBOUND';
  path: string;
  ownerRef: string;
  message: string;
}

export interface D1AuthorityMapData {
  mapId: string;
  entries: Array<{ grantId: string; actorRef: string }>;
}

export interface D1RegistrationData {
  registrationId: string;
  adapters: Array<{ portId: string; adapterArtifactId: string }>;
}

export interface D1SeedRefData {
  field: string;
  relationshipId: string;
  entityId: string;
}

export interface D1SeedDependencyData {
  entityId: string;
  kind: 'mdm' | 'module';
  seeded: false;
}

export interface D1SeedDatasetData {
  datasetId: string;
  tableId: string;
  owners: string[];
}

/** A plan for the later materializer. `phase` is `plan`. This artifact has no rows. */
export interface D1SeedsData {
  seedId: string;
  phase?: 'plan';
  scenarios: Array<{
    scenarioId: string;
    tableId: string;
    source?: string;
    constraints: string[];
    refs?: D1SeedRefData[];
    states?: string[];
    requires?: string[];
  }>;
  dependencies?: D1SeedDependencyData[];
  datasets?: D1SeedDatasetData[];
}

export interface D1IntegrationData {
  integrationId: string;
  events: Array<{ eventId: string; on: string; entityId: string; mechanism: string }>;
}

export interface D1Definition<T = Record<string, unknown>> {
  schemaVersion: typeof D1_DEFINITION_SCHEMA;
  artifactType: D1ArtifactType;
  artifactId: string;
  moduleName: string;
  data: T;
}

export function isArtifactType(value: string): value is D1ArtifactType {
  return (D1_ARTIFACT_TYPES as readonly string[]).includes(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, issues: string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) issues.push(`Unknown field ${path}.${key}.`);
  }
}

function stringList(value: unknown, path: string, issues: string[]): string[] {
  if (!Array.isArray(value)) {
    issues.push(`Missing field ${path}.`);
    return [];
  }
  const out: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !item.trim()) issues.push(`Missing field ${path}.${index}.`);
    else out.push(item);
  });
  return out;
}

function needString(value: Record<string, unknown>, key: string, path: string, issues: string[]): string {
  const found = value[key];
  if (typeof found !== 'string' || !found.trim()) {
    issues.push(`Missing field ${path}.${key}.`);
    return '';
  }
  return found;
}

function needBoolean(value: Record<string, unknown>, key: string, path: string, issues: string[]): void {
  if (typeof value[key] !== 'boolean') issues.push(`Missing field ${path}.${key}.`);
}

function oneOf(value: string, allowed: readonly string[], path: string, issues: string[]): void {
  if (value && !allowed.includes(value)) issues.push(`${path} is invalid.`);
}

/** Copies the shared $defs onto one artifact payload so a tool wrapper can hoist them. */
export function typeDataSchema(definitionSchema: Record<string, unknown>, typeName: string): Record<string, unknown> {
  const defs = isRecord(definitionSchema.$defs) ? definitionSchema.$defs : null;
  const body = defs && isRecord(defs[typeName]) ? defs[typeName] : null;
  if (!body || !defs) throw new Error(`Unknown artifact schema ${typeName}.`);
  return { ...body, $defs: defs };
}

export function definitionIssues(value: unknown): string[] {
  if (!isRecord(value)) return ['Definition must be an object.'];
  const issues: string[] = [];
  unknownKeys(value, ENVELOPE_KEYS, 'definition', issues);
  if (value.schemaVersion !== D1_DEFINITION_SCHEMA) issues.push('definition.schemaVersion is unknown.');
  const artifactType = typeof value.artifactType === 'string' ? value.artifactType : '';
  if (!isArtifactType(artifactType)) issues.push('definition.artifactType is unknown.');
  const artifactId = typeof value.artifactId === 'string' ? value.artifactId : '';
  if (!TOKEN.test(artifactId)) issues.push('definition.artifactId must be a token.');
  if (typeof value.moduleName !== 'string' || !moduleTokenOk(value.moduleName)) {
    issues.push('definition.moduleName must be lowerCamel.');
  }
  if (!isRecord(value.data)) {
    issues.push('Missing field definition.data.');
    return issues;
  }
  if (isArtifactType(artifactType)) {
    issues.push(...dataIssues(artifactType, value.data, artifactId));
    if (artifactType === 'domainEntity') issues.push(...definitionImportIssues(value));
  }
  return issues;
}

function dataIssues(artifactType: D1ArtifactType, data: Record<string, unknown>, artifactId: string): string[] {
  switch (artifactType) {
    case 'domainEntity': return domainEntityIssues(data);
    case 'valueObject': return valueObjectIssues(data);
    case 'repositoryPort': return repositoryPortIssues(data);
    case 'table': return [...tableIssues(data), ...tableIdentityIssues(data, artifactId)];
    case 'repositoryAdapter': return adapterBindingIssues(data);
    case 'usecase': return usecaseIssues(data);
    case 'httpController': return httpControllerIssues(data);
    case 'accessScope': return accessScopeIssues(data);
    case 'authorityMap': return authorityMapIssues(data);
    case 'repositoryRegistration': return registrationIssues(data);
    case 'persistenceSeeds': return seedScenarioIssues(data);
    case 'integrationOutbound': return integrationShapeIssues(data);
    default: return [`definition.artifactType is unknown.`];
  }
}

function fieldIssues(value: unknown, path: string, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push(`Missing field ${path}.`);
    return;
  }
  unknownKeys(value, ['name', 'type', 'derived', 'ref'], path, issues);
  needString(value, 'name', path, issues);
  const type = needString(value, 'type', path, issues);
  if (value.derived !== undefined && typeof value.derived !== 'boolean') issues.push(`Missing field ${path}.derived.`);
  if (type === 'record') {
    if (typeof value.ref !== 'string' || !value.ref.trim()) issues.push(`Missing field ${path}.ref.`);
  } else if (value.ref !== undefined) {
    issues.push(`${path}.ref is only valid when type is record.`);
  }
}

export function recordFieldIssues(data: unknown): string[] {
  const issues: string[] = [];
  if (!isRecord(data) || !Array.isArray(data.fields)) return issues;
  data.fields.forEach((field, index) => {
    if (!isRecord(field)) return;
    if (field.type === 'record' && (typeof field.ref !== 'string' || !field.ref.trim())) {
      issues.push(`Missing field data.fields.${index}.ref.`);
    }
    if (field.type !== 'record' && field.ref !== undefined) {
      issues.push(`data.fields.${index}.ref is only valid when type is record.`);
    }
  });
  return issues;
}

export function derivedFieldIssues(entity: unknown, usecases: readonly unknown[]): string[] {
  const issues: string[] = [];
  if (!isRecord(entity) || !Array.isArray(entity.fields)) return issues;
  const derived = new Set<string>();
  for (const field of entity.fields) {
    if (!isRecord(field) || field.derived !== true || typeof field.name !== 'string') continue;
    derived.add(field.name);
  }
  usecases.forEach((usecase, usecaseIndex) => {
    if (!isRecord(usecase) || !Array.isArray(usecase.functions)) return;
    usecase.functions.forEach((fn, fnIndex) => {
      if (!isRecord(fn) || !Array.isArray(fn.input)) return;
      fn.input.forEach((input, inputIndex) => {
        if (!isRecord(input) || typeof input.name !== 'string') return;
        if (derived.has(input.name)) {
          issues.push(`Derived field ${input.name} is an input of usecases.${usecaseIndex}.functions.${fnIndex}.input.${inputIndex}.`);
        }
      });
    });
  });
  return issues;
}

export function storageTargetIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.storageTarget.'];
  const issues: string[] = [];
  const target = typeof data.storageTarget === 'string' ? data.storageTarget : '';
  oneOf(target, D1_STORAGE_TARGETS, 'data.storageTarget', issues);
  if (!target) issues.push('Missing field data.storageTarget.');
  return issues;
}

export function lifecycleIssues(data: unknown): string[] {
  const issues: string[] = [];
  if (!isRecord(data) || !isRecord(data.lifecycle)) return ['Missing field data.lifecycle.'];
  const lifecycle = data.lifecycle;
  unknownKeys(lifecycle, ['states', 'transitions'], 'data.lifecycle', issues);
  const reachedByTime = new Set<string>();
  if (!Array.isArray(lifecycle.states)) issues.push('Missing field data.lifecycle.states.');
  else lifecycle.states.forEach((state, index) => {
    const path = `data.lifecycle.states.${index}`;
    if (!isRecord(state)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(state, ['state', 'reachedBy'], path, issues);
    const name = needString(state, 'state', path, issues);
    const reachedBy = needString(state, 'reachedBy', path, issues);
    oneOf(reachedBy, ['actor', 'command', 'time'], `${path}.reachedBy`, issues);
    if (reachedBy === 'time' && name) reachedByTime.add(name);
  });
  if (!Array.isArray(lifecycle.transitions)) issues.push('Missing field data.lifecycle.transitions.');
  else lifecycle.transitions.forEach((transition, index) => {
    const path = `data.lifecycle.transitions.${index}`;
    if (!isRecord(transition)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(transition, ['transitionId', 'from', 'to', 'by', 'ruleRefs'], path, issues);
    needString(transition, 'transitionId', path, issues);
    stringList(transition.from, `${path}.from`, issues);
    const to = needString(transition, 'to', path, issues);
    stringList(transition.by, `${path}.by`, issues);
    stringList(transition.ruleRefs, `${path}.ruleRefs`, issues);
    if (to && reachedByTime.has(to)) issues.push(`${path}.to is reached by time and is not a persisted write.`);
  });
  return issues;
}

export function domainImportIssues(moduleName: string, imports: readonly string[], source = ''): string[] {
  const issues: string[] = [];
  const prefix = `l1/${moduleName}/layer_3_domain/`;
  for (const spec of imports) {
    if (domainSpecIsExternal(prefix, spec)) issues.push(`Domain import is outside the domain: ${spec}.`);
  }
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('import ')) continue;
    const match = /from\s+['"]([^'"]+)['"]/.exec(trimmed);
    const spec = match?.[1] || trimmed;
    if (domainSpecIsExternal(prefix, spec)) issues.push(`Domain source imports ${spec}.`);
  }
  return issues;
}

function domainSpecIsExternal(prefix: string, spec: string): boolean {
  if (spec.includes('..')) return true;
  if (spec.startsWith(prefix) || spec.startsWith('./')) return false;
  return true;
}

export function domainEntityIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['entityId', 'storageTarget', 'fields', 'lifecycle', 'invariants', 'imports'], 'data', issues);
  needString(data, 'entityId', 'data', issues);
  issues.push(...storageTargetIssues(data));
  if (!Array.isArray(data.fields)) issues.push('Missing field data.fields.');
  else data.fields.forEach((field, index) => fieldIssues(field, `data.fields.${index}`, issues));
  issues.push(...lifecycleIssues(data));
  stringList(data.invariants, 'data.invariants', issues);
  stringList(data.imports, 'data.imports', issues);
  return issues;
}

export function valueObjectIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['valueObjectId', 'fields', 'referencedBy'], 'data', issues);
  needString(data, 'valueObjectId', 'data', issues);
  if (!Array.isArray(data.fields)) issues.push('Missing field data.fields.');
  else data.fields.forEach((field, index) => fieldIssues(field, `data.fields.${index}`, issues));
  const refs = stringList(data.referencedBy, 'data.referencedBy', issues);
  if (Array.isArray(data.referencedBy) && refs.length === 0) {
    issues.push('data.referencedBy is empty. A value object that nothing references is not emitted.');
  }
  return issues;
}

export function repositoryPortIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['entityId', 'interfaceName', 'methods'], 'data', issues);
  needString(data, 'entityId', 'data', issues);
  needString(data, 'interfaceName', 'data', issues);
  if (!Array.isArray(data.methods) || data.methods.length === 0) issues.push('Missing field data.methods.');
  else data.methods.forEach((method, index) => {
    const path = `data.methods.${index}`;
    if (!isRecord(method)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(method, ['name', 'params', 'returns'], path, issues);
    needString(method, 'name', path, issues);
    stringList(method.params, `${path}.params`, issues);
    needString(method, 'returns', path, issues);
  });
  return issues;
}

export function tableIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['tableId', 'entityId', 'physicalName', 'primaryKey', 'uniqueKeys', 'indexes'], 'data', issues);
  needString(data, 'tableId', 'data', issues);
  needString(data, 'entityId', 'data', issues);
  needString(data, 'physicalName', 'data', issues);
  const primaryKey = stringList(data.primaryKey, 'data.primaryKey', issues);
  if (Array.isArray(data.primaryKey) && primaryKey.length === 0) issues.push('Missing field data.primaryKey.');
  if (!Array.isArray(data.uniqueKeys)) issues.push('Missing field data.uniqueKeys.');
  else data.uniqueKeys.forEach((key, index) => {
    const columns = stringList(key, `data.uniqueKeys.${index}`, issues);
    if (Array.isArray(key) && columns.length === 0) issues.push(`Missing field data.uniqueKeys.${index}.`);
  });
  if (!Array.isArray(data.indexes)) issues.push('Missing field data.indexes.');
  else data.indexes.forEach((index, indexNo) => {
    const path = `data.indexes.${indexNo}`;
    if (!isRecord(index)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(index, ['name', 'columns', 'unique'], path, issues);
    needString(index, 'name', path, issues);
    stringList(index.columns, `${path}.columns`, issues);
    needBoolean(index, 'unique', path, issues);
  });
  return issues;
}

/**
 * readL1Inventory uses artifactId as the table entity and data.tableId as the logical id.
 * data.entityId must equal artifactId so the two do not diverge.
 */
export function tableIdentityIssues(data: unknown, artifactId: string): string[] {
  if (!isRecord(data)) return [];
  const entityId = typeof data.entityId === 'string' ? data.entityId : '';
  if (entityId && artifactId && entityId !== artifactId) {
    return [`data.entityId must equal artifactId because the inventory reads the entity from artifactId.`];
  }
  return [];
}

export function adapterBindingIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['entityId', 'portId', 'tableId', 'columns'], 'data', issues);
  needString(data, 'entityId', 'data', issues);
  needString(data, 'portId', 'data', issues);
  needString(data, 'tableId', 'data', issues);
  if (!Array.isArray(data.columns)) issues.push('Missing field data.columns.');
  else data.columns.forEach((column, index) => {
    const path = `data.columns.${index}`;
    if (!isRecord(column)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(column, ['field', 'column'], path, issues);
    needString(column, 'field', path, issues);
    needString(column, 'column', path, issues);
  });
  return issues;
}

function payloadOf(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return isRecord(value.data) ? value.data : value;
}

export function adapterLinkIssues(adapter: unknown, port: unknown, table: unknown): string[] {
  const issues: string[] = [];
  const adapterData = payloadOf(adapter);
  const portData = payloadOf(port);
  const tableData = payloadOf(table);
  if (!adapterData || !portData || !tableData || !isRecord(port)) return ['Adapter link is missing an artifact.'];
  const portId = typeof port.artifactId === 'string' ? port.artifactId : portData.interfaceName;
  if (adapterData.portId !== portId) issues.push('Adapter portId does not equal the port artifactId.');
  if (adapterData.tableId !== tableData.tableId) issues.push('Adapter tableId does not equal the table logical id.');
  if (adapterData.entityId !== portData.entityId) issues.push('Adapter entityId does not equal the port entityId.');
  if (adapterData.entityId !== tableData.entityId) issues.push('Adapter entityId does not equal the table entityId.');
  return issues;
}

function projectionFields(value: unknown, path: string, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push(`Missing field ${path}.`);
    return;
  }
  value.forEach((field, index) => {
    const fieldPath = `${path}.${index}`;
    if (!isRecord(field)) {
      issues.push(`Missing field ${fieldPath}.`);
      return;
    }
    unknownKeys(field, ['name', 'type', 'fieldRef'], fieldPath, issues);
    needString(field, 'name', fieldPath, issues);
    if (field.type !== undefined && (typeof field.type !== 'string' || !field.type.trim())) issues.push(`Missing field ${fieldPath}.type.`);
    if (field.fieldRef !== undefined && (typeof field.fieldRef !== 'string' || !field.fieldRef.trim())) {
      issues.push(`Missing field ${fieldPath}.fieldRef.`);
    }
  });
}

export function projectionIssues(data: unknown): string[] {
  const issues: string[] = [];
  if (!isRecord(data) || !Array.isArray(data.functions)) return issues;
  data.functions.forEach((fn, index) => {
    if (!isRecord(fn)) return;
    projectionFields(fn.input, `data.functions.${index}.input`, issues);
    projectionFields(fn.output, `data.functions.${index}.output`, issues);
  });
  return issues;
}

export function routeProjectionIssues(data: unknown): string[] {
  const issues: string[] = [];
  if (!isRecord(data)) return ['Missing field data.'];
  const outputNames = new Set<string>();
  if (Array.isArray(data.functions)) {
    for (const fn of data.functions) {
      if (!isRecord(fn) || !Array.isArray(fn.output)) continue;
      for (const field of fn.output) {
        if (isRecord(field) && typeof field.name === 'string') outputNames.add(field.name);
      }
      if (Array.isArray(fn.contractRefs)) {
        fn.contractRefs.forEach((ref, index) => {
          const path = `data.functions.contractRefs.${index}`;
          if (!isRecord(ref)) {
            issues.push(`Missing field ${path}.`);
            return;
          }
          unknownKeys(ref, ['route', 'symbol'], path, issues);
          needString(ref, 'route', path, issues);
          needString(ref, 'symbol', path, issues);
        });
      }
    }
  }
  if (!Array.isArray(data.routeProjections)) return [...issues, 'Missing field data.routeProjections.'];
  data.routeProjections.forEach((projection, index) => {
    const path = `data.routeProjections.${index}`;
    if (!isRecord(projection)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(projection, ['route', 'contractPath', 'projection', 'outputFields'], path, issues);
    needString(projection, 'route', path, issues);
    needString(projection, 'contractPath', path, issues);
    const kind = typeof projection.projection === 'string' ? projection.projection : '';
    oneOf(kind, ['declared', 'unresolved'], `${path}.projection`, issues);
    const fields = stringList(projection.outputFields, `${path}.outputFields`, issues);
    if (kind === 'unresolved' && fields.length > 0) {
      issues.push(`${path} is unresolved and must not copy another route's fields.`);
    }
    if (kind === 'declared') {
      if (fields.length === 0) issues.push(`Missing field ${path}.outputFields.`);
      for (const name of fields) {
        if (!outputNames.has(name)) issues.push(`${path}.outputFields names ${name}, which is not in the function projection.`);
      }
    }
  });
  return issues;
}

const SEQUENCE_FIELDS: Record<string, readonly string[]> = {
  port: ['kind', 'call', 'port'],
  rule: ['kind', 'ruleId'],
  mdm: ['kind', 'namespace', 'call', 'entity', 'capability'],
  transition: ['kind', 'transitionId', 'payload'],
  effect: ['kind', 'eventId'],
  transaction: ['kind', 'boundary'],
  context: ['kind', 'source'],
};

export function usecaseIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, [
    'usecaseId', 'entityId', 'operation', 'ports', 'rulesApplied', 'rulePlan', 'functions',
    'routeProjections', 'portCalls', 'transactional', 'effects',
    'sequence', 'uses', 'rules', 'transaction', 'lifecycle', 'mdm',
  ], 'data', issues);
  needString(data, 'usecaseId', 'data', issues);
  needString(data, 'entityId', 'data', issues);
  const operation = needString(data, 'operation', 'data', issues);
  stringList(data.ports, 'data.ports', issues);
  stringList(data.rulesApplied, 'data.rulesApplied', issues);
  rulePlanIssues(data.rulePlan, issues);
  stringList(data.portCalls, 'data.portCalls', issues);
  needBoolean(data, 'transactional', 'data', issues);
  if (!Array.isArray(data.functions) || data.functions.length === 0) issues.push('Missing field data.functions.');
  else data.functions.forEach((fn, index) => {
    const path = `data.functions.${index}`;
    if (!isRecord(fn)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(fn, ['functionName', 'input', 'output', 'contractRefs'], path, issues);
    needString(fn, 'functionName', path, issues);
    if (!Array.isArray(fn.contractRefs)) issues.push(`Missing field ${path}.contractRefs.`);
  });
  if (!Array.isArray(data.effects)) issues.push('Missing field data.effects.');
  else data.effects.forEach((effect, index) => {
    const path = `data.effects.${index}`;
    if (!isRecord(effect)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(effect, ['eventId', 'path', 'symbol'], path, issues);
    needString(effect, 'eventId', path, issues);
    needString(effect, 'path', path, issues);
    needString(effect, 'symbol', path, issues);
  });
  sequenceIssues(data.sequence, issues);
  useIssues(data.uses, issues);
  ruleRefIssues(data.rules, issues);
  transactionIssues(data, issues);
  if (operation === 'transition') {
    if (!isRecord(data.lifecycle)) issues.push('Missing field data.lifecycle.');
    else lifecycleRefIssues(data.lifecycle, issues);
  } else if (data.lifecycle !== undefined) {
    issues.push('data.lifecycle is only valid on a transition.');
  }
  if (data.mdm !== undefined) mdmBindingIssues(data.mdm, issues);
  issues.push(...projectionIssues(data));
  issues.push(...routeProjectionIssues(data));
  return issues;
}

function sequenceIssues(value: unknown, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push('Missing field data.sequence.');
    return;
  }
  value.forEach((step, index) => {
    const path = `data.sequence.${index}`;
    if (!isRecord(step)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    const kind = typeof step.kind === 'string' ? step.kind : '';
    const fields = SEQUENCE_FIELDS[kind];
    if (!fields) {
      issues.push(`${path}.kind is invalid.`);
      return;
    }
    unknownKeys(step, fields, path, issues);
    for (const key of fields) {
      if (key === 'kind' || key === 'payload') continue;
      needString(step, key, path, issues);
    }
    if (kind === 'transition') stringList(step.payload, `${path}.payload`, issues);
    if (kind === 'context' && step.source !== 'ctx') issues.push(`${path}.source is not ctx.`);
    if (kind === 'transaction' && step.boundary !== 'local' && step.boundary !== 'external') {
      issues.push(`${path}.boundary is invalid.`);
    }
  });
}

function useIssues(value: unknown, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push('Missing field data.uses.');
    return;
  }
  value.forEach((use, index) => {
    const path = `data.uses.${index}`;
    if (!isRecord(use)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(use, ['path', 'role', 'source'], path, issues);
    needString(use, 'path', path, issues);
    const role = typeof use.role === 'string' ? use.role : '';
    oneOf(role, ['filter', 'selector', 'concurrency', 'write'], `${path}.role`, issues);
    if (!role) issues.push(`Missing field ${path}.role.`);
    const source = typeof use.source === 'string' ? use.source : '';
    oneOf(source, ['input', 'payload'], `${path}.source`, issues);
    if (!source) issues.push(`Missing field ${path}.source.`);
  });
}

function rulePlanIssues(value: unknown, issues: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push('Missing field data.rulePlan.');
    return;
  }
  value.forEach((row, index) => {
    const path = `data.rulePlan.${index}`;
    if (!isRecord(row)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(row, ['ruleId', 'origin', 'consumer', 'enforcement', 'gap'], path, issues);
    const ruleId = typeof row.ruleId === 'string' ? row.ruleId : '';
    const origin = typeof row.origin === 'string' ? row.origin : '';
    const consumer = typeof row.consumer === 'string' ? row.consumer : '';
    const enforcement = typeof row.enforcement === 'string' ? row.enforcement : '';
    const gap = typeof row.gap === 'string' ? row.gap : '';
    const storage = isStorageConstraintRow({ ruleId, origin, consumer, enforcement, gap });
    if (typeof row.ruleId !== 'string' || (!ruleId.trim() && !storage)) issues.push(`Missing field ${path}.ruleId.`);
    needString(row, 'origin', path, issues);
    needString(row, 'consumer', path, issues);
    oneOf(enforcement, ['local', 'delegated', 'pending'], `${path}.enforcement`, issues);
    if (typeof row.gap !== 'string') issues.push(`Missing field ${path}.gap.`);
    else if (enforcement === 'pending' && !row.gap) issues.push(`${path}.gap is required when enforcement is pending.`);
    else if (enforcement && enforcement !== 'pending' && row.gap) issues.push(`${path}.gap must be empty when enforcement is ${enforcement}.`);
  });
}

/** The unique-key line. It is not a business rule, so `ruleId` stays empty. */
export function isStorageConstraintRow(row: {
  ruleId: string;
  origin: string;
  consumer: string;
  enforcement: string;
  gap: string;
}): boolean {
  return row.ruleId === ''
    && row.enforcement === 'local'
    && row.gap === ''
    && row.consumer.startsWith('operation:')
    && (row.origin.endsWith('#uniqueKeys') || row.origin.endsWith('#capabilities.uniqueKey'));
}

function ruleRefIssues(value: unknown, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push('Missing field data.rules.');
    return;
  }
  value.forEach((rule, index) => {
    const path = `data.rules.${index}`;
    if (!isRecord(rule)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(rule, ['ruleId', 'path', 'symbol'], path, issues);
    needString(rule, 'ruleId', path, issues);
    needString(rule, 'path', path, issues);
    needString(rule, 'symbol', path, issues);
  });
}

function transactionIssues(data: Record<string, unknown>, issues: string[]): void {
  if (!isRecord(data.transaction)) {
    issues.push('Missing field data.transaction.');
    return;
  }
  unknownKeys(data.transaction, ['boundary'], 'data.transaction', issues);
  const boundary = typeof data.transaction.boundary === 'string' ? data.transaction.boundary : '';
  oneOf(boundary, ['local', 'none'], 'data.transaction.boundary', issues);
  if (!boundary) issues.push('Missing field data.transaction.boundary.');
  if (typeof data.transactional === 'boolean' && boundary) {
    const local = boundary === 'local';
    if (data.transactional !== local) issues.push('data.transaction.boundary does not match data.transactional.');
  }
}

function lifecycleRefIssues(lifecycle: Record<string, unknown>, issues: string[]): void {
  unknownKeys(lifecycle, ['transitionId', 'payload', 'sourcePath', 'symbol'], 'data.lifecycle', issues);
  needString(lifecycle, 'transitionId', 'data.lifecycle', issues);
  stringList(lifecycle.payload, 'data.lifecycle.payload', issues);
  needString(lifecycle, 'sourcePath', 'data.lifecycle', issues);
  needString(lifecycle, 'symbol', 'data.lifecycle', issues);
}

function clauseList(value: unknown, path: string, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push(`Missing field ${path}.`);
    return;
  }
  value.forEach((clause, index) => {
    const clausePath = `${path}.${index}`;
    if (!isRecord(clause)) {
      issues.push(`Missing field ${clausePath}.`);
      return;
    }
    unknownKeys(clause, ['kind', 'path', 'call', 'present'], clausePath, issues);
    const kind = needString(clause, 'kind', clausePath, issues);
    oneOf(kind, ['contract', 'prior'], `${clausePath}.kind`, issues);
    needString(clause, 'path', clausePath, issues);
    if (clause.call !== undefined) needString(clause, 'call', clausePath, issues);
    needBoolean(clause, 'present', clausePath, issues);
  });
}

function originIssues(value: unknown, path: string, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push(`Missing field ${path}.`);
    return;
  }
  unknownKeys(value, ['kind', 'path', 'calls', 'evidence'], path, issues);
  const kind = needString(value, 'kind', path, issues);
  oneOf(kind, ['contract', 'context', 'literal', 'prior'], `${path}.kind`, issues);
  if (value.path !== undefined) needString(value, 'path', path, issues);
  if (value.calls !== undefined) stringList(value.calls, `${path}.calls`, issues);
  if (value.evidence !== undefined) needString(value, 'evidence', path, issues);
}

function mdmBindingIssues(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push('Missing field data.mdm.');
    return;
  }
  unknownKeys(value, ['namespace', 'role', 'atomic', 'calls'], 'data.mdm', issues);
  needString(value, 'namespace', 'data.mdm', issues);
  needString(value, 'role', 'data.mdm', issues);
  needBoolean(value, 'atomic', 'data.mdm', issues);
  if (!Array.isArray(value.calls)) {
    issues.push('Missing field data.mdm.calls.');
    return;
  }
  value.calls.forEach((call, index) => {
    const path = `data.mdm.calls.${index}`;
    if (!isRecord(call)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(call, ['id', 'method', 'target', 'shape', 'capabilities', 'alternative', 'when', 'arguments', 'result'], path, issues);
    needString(call, 'id', path, issues);
    needString(call, 'method', path, issues);
    needString(call, 'target', path, issues);
    needString(call, 'shape', path, issues);
    stringList(call.capabilities, `${path}.capabilities`, issues);
    needBoolean(call, 'alternative', path, issues);
    stringList(call.result, `${path}.result`, issues);
    clauseList(call.when, `${path}.when`, issues);
    if (!Array.isArray(call.arguments)) {
      issues.push(`Missing field ${path}.arguments.`);
      return;
    }
    call.arguments.forEach((arg, argIndex) => {
      const argPath = `${path}.arguments.${argIndex}`;
      if (!isRecord(arg)) {
        issues.push(`Missing field ${argPath}.`);
        return;
      }
      unknownKeys(arg, ['name', 'role', 'capability', 'path', 'value', 'origin'], argPath, issues);
      needString(arg, 'name', argPath, issues);
      const role = needString(arg, 'role', argPath, issues);
      oneOf(role, ['selector', 'parameter', 'patch'], `${argPath}.role`, issues);
      if (arg.capability !== undefined) needString(arg, 'capability', argPath, issues);
      if (arg.path !== undefined) needString(arg, 'path', argPath, issues);
      if (arg.value !== undefined) needString(arg, 'value', argPath, issues);
      originIssues(arg.origin, `${argPath}.origin`, issues);
    });
  });
}

export function httpControllerIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['pageId', 'handlers'], 'data', issues);
  needString(data, 'pageId', 'data', issues);
  if (!Array.isArray(data.handlers) || data.handlers.length === 0) issues.push('Missing field data.handlers.');
  else data.handlers.forEach((handler, index) => {
    const path = `data.handlers.${index}`;
    if (!isRecord(handler)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(handler, ['route', 'kind', 'usecaseId', 'grantIds'], path, issues);
    needString(handler, 'route', path, issues);
    const kind = needString(handler, 'kind', path, issues);
    oneOf(kind, ['query', 'command'], `${path}.kind`, issues);
    needString(handler, 'usecaseId', path, issues);
    const grants = stringList(handler.grantIds, `${path}.grantIds`, issues);
    if (Array.isArray(handler.grantIds) && grants.length === 0) issues.push(`Missing field ${path}.grantIds.`);
  });
  return issues;
}

export function accessAnchorIssues(data: unknown): string[] {
  const issues: string[] = [];
  if (!isRecord(data) || !Array.isArray(data.grants)) return issues;
  data.grants.forEach((grant, index) => {
    if (!isRecord(grant)) return;
    const anchor = typeof grant.anchorEntity === 'string' ? grant.anchorEntity : '';
    const refs = Array.isArray(grant.entityRefs) ? grant.entityRefs.filter((item): item is string => typeof item === 'string') : [];
    if (anchor && !refs.includes(anchor)) {
      issues.push(`Grant ${typeof grant.grantId === 'string' ? grant.grantId : index} anchors on ${anchor}, which is not in entityRefs.`);
    }
  });
  return issues;
}

const SCOPE_MODES = ['organization', 'assigned', 'own', 'related', 'public', 'custom'] as const;
const VERIFIED_SESSION = 'verified';
const FORM_IDENTITY = new Set(['actorId', 'userId', 'sessionId', 'scope']);

function clientFilter(field: string): boolean {
  if (FORM_IDENTITY.has(field)) return true;
  const tail = field.split('.').pop() || '';
  return FORM_IDENTITY.has(tail);
}

export function accessScopeIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['scopeId', 'grants'], 'data', issues);
  needString(data, 'scopeId', 'data', issues);
  if (!Array.isArray(data.grants) || data.grants.length === 0) issues.push('Missing field data.grants.');
  else data.grants.forEach((grant, index) => {
    const path = `data.grants.${index}`;
    if (!isRecord(grant)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(grant, ['grantId', 'actorRef', 'anchorEntity', 'entityRefs', 'disclosure', 'allowedFields', 'scopeMode', 'session', 'path', 'pending'], path, issues);
    needString(grant, 'grantId', path, issues);
    needString(grant, 'actorRef', path, issues);
    if (grant.anchorEntity !== undefined) needString(grant, 'anchorEntity', path, issues);
    const refs = stringList(grant.entityRefs, `${path}.entityRefs`, issues);
    if (Array.isArray(grant.entityRefs) && refs.length === 0) issues.push(`Missing field ${path}.entityRefs.`);
    const disclosure = needString(grant, 'disclosure', path, issues);
    oneOf(disclosure, ['fieldsOnly', 'fullRecord'], `${path}.disclosure`, issues);
    if (disclosure === 'fieldsOnly') {
      const allowed = stringList(grant.allowedFields, `${path}.allowedFields`, issues);
      if (!Array.isArray(grant.allowedFields) || allowed.length === 0) issues.push(`Missing field ${path}.allowedFields.`);
    } else if (grant.allowedFields !== undefined) {
      issues.push(`${path}.allowedFields is not valid for fullRecord.`);
    }
    const mode = needString(grant, 'scopeMode', path, issues);
    oneOf(mode, SCOPE_MODES, `${path}.scopeMode`, issues);
    const session = needString(grant, 'session', path, issues);
    oneOf(session, [VERIFIED_SESSION], `${path}.session`, issues);
    if (typeof grant.pending !== 'string') issues.push(`Missing field ${path}.pending.`);
    else if (clientFilter(grant.pending)) issues.push(`${path}.pending is a form field. The session stays verified.`);
    if (!Array.isArray(grant.path)) issues.push(`Missing field ${path}.path.`);
    else grant.path.forEach((step, stepIndex) => {
      const stepPath = `${path}.path.${stepIndex}`;
      if (!isRecord(step)) {
        issues.push(`Missing field ${stepPath}.`);
        return;
      }
      unknownKeys(step, ['relationshipId', 'from', 'to', 'field'], stepPath, issues);
      needString(step, 'relationshipId', stepPath, issues);
      needString(step, 'from', stepPath, issues);
      needString(step, 'to', stepPath, issues);
      const field = needString(step, 'field', stepPath, issues);
      if (field && clientFilter(field)) issues.push(`${stepPath}.field is a form field. The session stays verified.`);
    });
  });
  return issues;
}

function normalizePolicyPath(path: string): string {
  return path.replace(/^\/?_\d+_\/+/, '').replace(/^\/+/, '');
}

function reachableUnits(dependencies: readonly string[], byPath: ReadonlyMap<string, D1PolicyUnit>): D1PolicyUnit[] {
  const seen = new Set<string>();
  const out: D1PolicyUnit[] = [];
  const queue = dependencies.map(normalizePolicyPath);
  while (queue.length) {
    const path = queue.shift();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const unit = byPath.get(path);
    if (!unit) continue;
    out.push(unit);
    for (const next of unit.dependencies) queue.push(normalizePolicyPath(next));
  }
  return out;
}

function readJoins(value: unknown): D1AccessJoin[] | null {
  if (!Array.isArray(value)) return null;
  const steps: D1AccessJoin[] = [];
  for (const step of value) {
    if (!isRecord(step)) return null;
    const relationshipId = typeof step.relationshipId === 'string' ? step.relationshipId : '';
    const from = typeof step.from === 'string' ? step.from : '';
    const to = typeof step.to === 'string' ? step.to : '';
    const field = typeof step.field === 'string' ? step.field : '';
    if (!relationshipId || !from || !to || !field) return null;
    steps.push({ relationshipId, from, to, field });
  }
  return steps;
}

function readSerializedGrant(
  grant: Record<string, unknown>,
  scopePath: string,
): { policy: Omit<D1ReconstructedPolicy, 'route'> } | { issue: string } {
  const grantId = typeof grant.grantId === 'string' ? grant.grantId : '';
  const mode = typeof grant.scopeMode === 'string' ? grant.scopeMode : '';
  if (!mode || !(SCOPE_MODES as readonly string[]).includes(mode)) {
    return { issue: `Grant ${grantId} has no scope mode. own and organization would be indistinguishable.` };
  }
  if (grant.session !== VERIFIED_SESSION) {
    return { issue: `Grant ${grantId} does not keep a verified session. A form field is not the filter.` };
  }
  if (typeof grant.pending !== 'string' || clientFilter(grant.pending)) {
    return { issue: `Grant ${grantId} does not keep its pending. The anchor was not rewritten.` };
  }
  const path = readJoins(grant.path);
  if (!path) return { issue: `Grant ${grantId} does not keep its relationship path.` };
  if (path.some(step => clientFilter(step.field))) {
    return { issue: `Grant ${grantId} uses a form field as a relationship filter. The session stays verified.` };
  }
  const entityRefs = Array.isArray(grant.entityRefs) ? grant.entityRefs.filter((item): item is string => typeof item === 'string' && !!item) : [];
  const disclosure = grant.disclosure === 'fieldsOnly' || grant.disclosure === 'fullRecord' ? grant.disclosure : '';
  if (!grantId || typeof grant.actorRef !== 'string' || !grant.actorRef || !entityRefs.length || !disclosure) {
    return { issue: `Grant ${grantId || '(missing)'} is not a complete policy.` };
  }
  const allowedFields = disclosure === 'fieldsOnly' && Array.isArray(grant.allowedFields)
    ? grant.allowedFields.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    policy: {
      grantId,
      actorRef: grant.actorRef,
      entityRefs,
      disclosure,
      allowedFields,
      anchorEntity: typeof grant.anchorEntity === 'string' ? grant.anchorEntity : '',
      scopeMode: mode,
      session: 'verified',
      path,
      pending: grant.pending,
      scopePath,
    },
  };
}

/**
 * Rebuilds each handler grant from serialized defs and declared file dependencies.
 * A scope reached through an intermediate def counts. Drafts are not an input.
 */
export function reconstructAccessPolicy(units: readonly D1PolicyUnit[]): {
  policies: D1ReconstructedPolicy[];
  issues: D1AccessPolicyIssue[];
} {
  const issues: D1AccessPolicyIssue[] = [];
  const policies: D1ReconstructedPolicy[] = [];
  const byPath = new Map<string, D1PolicyUnit>();
  for (const unit of units) byPath.set(normalizePolicyPath(unit.defPath), unit);
  for (const controller of units) {
    if (controller.artifactType !== 'httpController') continue;
    const scopes = reachableUnits(controller.dependencies, byPath).filter(unit => unit.artifactType === 'accessScope');
    const data = isRecord(controller.data) ? controller.data : {};
    const pageId = typeof data.pageId === 'string' && data.pageId ? data.pageId : controller.defPath;
    const handlers = Array.isArray(data.handlers) ? data.handlers : [];
    handlers.forEach((handler, index) => {
      if (!isRecord(handler)) return;
      const route = typeof handler.route === 'string' && handler.route ? handler.route : `${pageId}#${index}`;
      const grantIds = Array.isArray(handler.grantIds)
        ? handler.grantIds.filter((id): id is string => typeof id === 'string' && !!id)
        : [];
      for (const grantId of grantIds) {
        const found: Array<{ grant: Record<string, unknown>; scopePath: string }> = [];
        for (const scope of scopes) {
          const scopeData = isRecord(scope.data) ? scope.data : {};
          const grants = Array.isArray(scopeData.grants) ? scopeData.grants : [];
          for (const grant of grants) {
            if (!isRecord(grant) || grant.grantId !== grantId) continue;
            found.push({ grant, scopePath: normalizePolicyPath(scope.defPath) });
          }
        }
        if (found.length !== 1) {
          issues.push({
            code: 'POLICY_UNBOUND',
            path: route,
            ownerRef: grantId,
            message: found.length > 1
              ? `Grant ${grantId} on ${route} matches more than one reachable access scope.`
              : scopes.length
                ? `Grant ${grantId} on ${route} is not on a reachable access scope.`
                : `Grant ${grantId} on ${route} has no declared dependency on an access scope.`,
          });
          continue;
        }
        const read = readSerializedGrant(found[0].grant, found[0].scopePath);
        if ('issue' in read) {
          issues.push({ code: 'POLICY_UNBOUND', path: route, ownerRef: grantId, message: read.issue });
          continue;
        }
        policies.push({ route, ...read.policy });
      }
    });
  }
  return { policies, issues };
}

export function authorityMapIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['mapId', 'entries'], 'data', issues);
  needString(data, 'mapId', 'data', issues);
  if (!Array.isArray(data.entries) || data.entries.length === 0) issues.push('Missing field data.entries.');
  else data.entries.forEach((entry, index) => {
    const path = `data.entries.${index}`;
    if (!isRecord(entry)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(entry, ['grantId', 'actorRef'], path, issues);
    needString(entry, 'grantId', path, issues);
    needString(entry, 'actorRef', path, issues);
  });
  return issues;
}

export function authorityGrantIssues(map: unknown, scope: unknown): string[] {
  const issues: string[] = [];
  if (!isRecord(map) || !Array.isArray(map.entries) || !isRecord(scope) || !Array.isArray(scope.grants)) {
    return ['Authority map requires the scope artifact.'];
  }
  const grants = new Set(scope.grants.filter(isRecord).map(grant => grant.grantId).filter((id): id is string => typeof id === 'string'));
  for (const entry of map.entries) {
    if (!isRecord(entry) || typeof entry.grantId !== 'string') continue;
    if (!grants.has(entry.grantId)) issues.push(`Authority entry ${entry.grantId} is not a grant on the scope.`);
  }
  return issues;
}

export function registrationIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['registrationId', 'adapters'], 'data', issues);
  needString(data, 'registrationId', 'data', issues);
  if (!Array.isArray(data.adapters)) issues.push('Missing field data.adapters.');
  else data.adapters.forEach((adapter, index) => {
    const path = `data.adapters.${index}`;
    if (!isRecord(adapter)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(adapter, ['portId', 'adapterArtifactId'], path, issues);
    needString(adapter, 'portId', path, issues);
    needString(adapter, 'adapterArtifactId', path, issues);
  });
  return issues;
}

const SEED_SOURCE = /^[A-Za-z][A-Za-z0-9:_-]*$/;
const SEED_FIELD = /^[A-Za-z][A-Za-z0-9._]*$/;

function seedText(value: string): boolean {
  return /password|credential|secret|quantity/i.test(value);
}

export function seedScenarioIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['seedId', 'phase', 'scenarios', 'dependencies', 'datasets'], 'data', issues);
  needString(data, 'seedId', 'data', issues);
  if (data.phase !== undefined && data.phase !== 'plan') {
    issues.push('data.phase must be plan. This artifact does not carry rows.');
  }
  if (!Array.isArray(data.scenarios)) issues.push('Missing field data.scenarios.');
  else data.scenarios.forEach((scenario, index) => seedScenarioItem(scenario, index, issues));
  if (data.dependencies !== undefined) seedDependencies(data.dependencies, issues);
  if (data.datasets !== undefined) seedDatasets(data.datasets, issues);
  return issues;
}

function seedScenarioItem(scenario: unknown, index: number, issues: string[]): void {
  const path = `data.scenarios.${index}`;
  if (!isRecord(scenario)) {
    issues.push(`Missing field ${path}.`);
    return;
  }
  unknownKeys(scenario, ['scenarioId', 'tableId', 'source', 'constraints', 'refs', 'states', 'requires', 'entityId', 'stateField'], path, issues);
  needString(scenario, 'scenarioId', path, issues);
  needString(scenario, 'tableId', path, issues);
  if (scenario.source !== undefined && (typeof scenario.source !== 'string' || !SEED_SOURCE.test(scenario.source))) {
    issues.push(`${path}.source must name a journey or a model.`);
  }
  const constraints = stringList(scenario.constraints, `${path}.constraints`, issues);
  for (const constraint of constraints) {
    if (!CONSTRAINT.test(constraint) || seedText(constraint)) {
      issues.push(`${path}.constraints must name a constraint, not a person, credential or quantity.`);
    }
  }
  if (scenario.refs !== undefined) seedRefs(scenario.refs, `${path}.refs`, issues);
  if (scenario.states !== undefined) seedTokens(scenario.states, `${path}.states`, issues);
  if (scenario.requires !== undefined) {
    const requires = stringList(scenario.requires, `${path}.requires`, issues);
    for (const field of requires) {
      if (!SEED_FIELD.test(field) || seedText(field)) issues.push(`${path}.requires must name a field.`);
    }
  }
  if (scenario.entityId !== undefined && (typeof scenario.entityId !== 'string' || !SEED_SOURCE.test(scenario.entityId))) {
    issues.push(`${path}.entityId must name the entity this scenario cites.`);
  }
  if (scenario.stateField !== undefined && (typeof scenario.stateField !== 'string' || !SEED_FIELD.test(scenario.stateField) || seedText(scenario.stateField))) {
    issues.push(`${path}.stateField must name the field this scenario cites.`);
  }
}

function seedRefs(value: unknown, path: string, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push(`Missing field ${path}.`);
    return;
  }
  value.forEach((ref, index) => {
    const refPath = `${path}.${index}`;
    if (!isRecord(ref)) {
      issues.push(`Missing field ${refPath}.`);
      return;
    }
    unknownKeys(ref, ['field', 'relationshipId', 'entityId'], refPath, issues);
    const field = needString(ref, 'field', refPath, issues);
    const relationshipId = needString(ref, 'relationshipId', refPath, issues);
    const entityId = needString(ref, 'entityId', refPath, issues);
    if (field && !SEED_FIELD.test(field)) issues.push(`${refPath}.field must name a column.`);
    if (relationshipId && !TOKEN.test(relationshipId)) issues.push(`${refPath}.relationshipId must be a token.`);
    if (entityId && !TOKEN.test(entityId)) issues.push(`${refPath}.entityId must be an entity id, not a role tag.`);
  });
}

function seedTokens(value: unknown, path: string, issues: string[]): void {
  const tokens = stringList(value, path, issues);
  for (const token of tokens) {
    if (!TOKEN.test(token)) issues.push(`${path} must name a state.`);
  }
}

function seedDependencies(value: unknown, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push('Missing field data.dependencies.');
    return;
  }
  value.forEach((item, index) => {
    const path = `data.dependencies.${index}`;
    if (!isRecord(item)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(item, ['entityId', 'kind', 'seeded'], path, issues);
    const entityId = needString(item, 'entityId', path, issues);
    if (entityId && !TOKEN.test(entityId)) issues.push(`${path}.entityId must be an entity id, not a role tag.`);
    if (item.kind !== 'mdm' && item.kind !== 'module') issues.push(`${path}.kind is invalid.`);
    if (item.seeded !== false) issues.push(`${path}.seeded must be false. This artifact is a plan, not loaded rows.`);
  });
}

function seedDatasets(value: unknown, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push('Missing field data.datasets.');
    return;
  }
  value.forEach((item, index) => {
    const path = `data.datasets.${index}`;
    if (!isRecord(item)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(item, ['datasetId', 'tableId', 'owners'], path, issues);
    needString(item, 'datasetId', path, issues);
    needString(item, 'tableId', path, issues);
    const owners = stringList(item.owners, `${path}.owners`, issues);
    for (const owner of owners) {
      if (!TOKEN.test(owner)) issues.push(`${path}.owners must name a scenario.`);
    }
  });
}

function integrationShapeIssues(data: unknown): string[] {
  if (!isRecord(data)) return ['Missing field data.'];
  const issues: string[] = [];
  unknownKeys(data, ['integrationId', 'events', 'processes', 'inbound', 'plugins', 'gaps'], 'data', issues);
  needString(data, 'integrationId', 'data', issues);
  if (!Array.isArray(data.events)) issues.push('Missing field data.events.');
  else data.events.forEach((event, index) => {
    const path = `data.events.${index}`;
    if (!isRecord(event)) {
      issues.push(`Missing field ${path}.`);
      return;
    }
    unknownKeys(event, ['eventId', 'on', 'entityId', 'mechanism', 'consumer', 'mechanismRef'], path, issues);
    needString(event, 'eventId', path, issues);
    needString(event, 'on', path, issues);
    needString(event, 'entityId', path, issues);
    needString(event, 'consumer', path, issues);
    if (typeof event.mechanism !== 'string') issues.push(`Missing field ${path}.mechanism.`);
    if (event.mechanismRef !== undefined && (typeof event.mechanismRef !== 'string' || !event.mechanismRef.trim())) {
      issues.push(`Missing field ${path}.mechanismRef.`);
    }
  });
  issues.push(...integrationCoverageIssues(data));
  return issues;
}

/** Processes, inbound and plugins stay operations. A gap is a declared item the pool did not select. */
export function integrationCoverageIssues(data: unknown): string[] {
  if (!isRecord(data)) return [];
  const issues: string[] = [];
  coverRows(data.processes, 'data.processes', 'processId', issues);
  coverRows(data.inbound, 'data.inbound', 'inboundId', issues);
  coverRows(data.plugins, 'data.plugins', 'pluginId', issues);
  if (data.gaps !== undefined && !Array.isArray(data.gaps)) issues.push('Missing field data.gaps.');
  else if (Array.isArray(data.gaps)) {
    data.gaps.forEach((gap, index) => {
      const path = `data.gaps.${index}`;
      if (!isRecord(gap)) {
        issues.push(`Missing field ${path}.`);
        return;
      }
      unknownKeys(gap, ['itemId', 'kind', 'code'], path, issues);
      needString(gap, 'itemId', path, issues);
      if (gap.kind !== 'process' && gap.kind !== 'inbound' && gap.kind !== 'plugin') issues.push(`${path}.kind is invalid.`);
      if (gap.code !== 'POOL_ABSENT') issues.push(`${path}.code is invalid.`);
    });
  }
  return issues;
}

function coverRows(value: unknown, path: string, idKey: string, issues: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`Missing field ${path}.`);
    return;
  }
  value.forEach((row, index) => {
    const rowPath = `${path}.${index}`;
    if (!isRecord(row)) {
      issues.push(`Missing field ${rowPath}.`);
      return;
    }
    unknownKeys(row, [idKey, 'operations', 'mechanism', 'consumer'], rowPath, issues);
    needString(row, idKey, rowPath, issues);
    needString(row, 'consumer', rowPath, issues);
    if (typeof row.mechanism !== 'string') issues.push(`Missing field ${rowPath}.mechanism.`);
    if (!Array.isArray(row.operations)) issues.push(`Missing field ${rowPath}.operations.`);
    else row.operations.forEach((operation, operationIndex) => {
      if (typeof operation !== 'string' || !operation.trim()) issues.push(`Missing field ${rowPath}.operations.${operationIndex}.`);
    });
  });
}

/** Empty mechanism is reported and the event is left in place. The MDM queue is not a binding. */
export function integrationMechanismIssues(data: unknown): string[] {
  const issues = integrationShapeIssues(data);
  if (!isRecord(data) || !Array.isArray(data.events)) return issues;
  data.events.forEach((event, index) => {
    if (!isRecord(event) || typeof event.mechanism !== 'string') return;
    const eventId = typeof event.eventId === 'string' && event.eventId ? event.eventId : `data.events.${index}`;
    const mechanism = event.mechanism;
    const ref = typeof event.mechanismRef === 'string' ? event.mechanismRef : '';
    if (!mechanism.trim()) {
      issues.push(`INTEGRATION_UNBOUND: ${eventId} has no runtime mechanism.`);
      if (ref) issues.push(`INTEGRATION_UNBOUND: ${eventId} names a ref and no mechanism.`);
      return;
    }
    if (fictionalMechanism(mechanism)) {
      issues.push(`FICTIONAL_API: ${eventId} names ${mechanism}. RequestContext does not declare it.`);
      return;
    }
    if (mechanism === D1_MEASURED_PUBLISH.symbol) {
      issues.push(`MECHANISM_INCOMPATIBLE: ${eventId} names ${mechanism}. Postgres publish inserts into mdm_outbox. It is not a module bus.`);
      if (ref !== D1_MEASURED_PUBLISH.path) issues.push(`MECHANISM_REF: ${eventId} must cite ${D1_MEASURED_PUBLISH.path}.`);
      return;
    }
    if (ref) issues.push(`MECHANISM_REF: ${eventId} cites a ref for an unmeasured mechanism.`);
  });
  return issues;
}

/** Domain imports are checked with the definition's module, not an empty string. */
export function definitionImportIssues(value: unknown, source = ''): string[] {
  if (!isRecord(value) || value.artifactType !== 'domainEntity' || !isRecord(value.data)) return [];
  const moduleName = typeof value.moduleName === 'string' ? value.moduleName : '';
  const imports = Array.isArray(value.data.imports) ? value.data.imports.filter((item): item is string => typeof item === 'string') : [];
  return domainImportIssues(moduleName, imports, source);
}
