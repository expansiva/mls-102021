/// <mls fileReference="_102021_/l2/agentMaterializeL1/contracts/definition.ts" enhancement="_blank"/>

/**
 * C0 contract for defs v2. Exclusive owner of this file: d1_30.
 *
 * d1_31 (writer/finalize), m1_01 (planner) and m1_04 (tests) import from here:
 *   /_102021_/l2/agentMaterializeL1/contracts/definition.js
 *
 * Does not import d1Artifact: d1_31 will import this module, and a reverse
 * runtime import would cycle. Business `data` keeps the D1 field names.
 */

export const M1_DEFINITION_SCHEMA = '2026-09-24-d1-definition-v2' as const;
export const M1_RECEIPT_SCHEMA = '2026-09-24-m1-receipt-v1' as const;
export const D1_DEFINITION_SCHEMA_V1 = '2026-09-21-d1-definition-v1' as const;

export const M1_STATUSES = ['pending', 'generated', 'blocked', 'failed'] as const;
export type M1Status = typeof M1_STATUSES[number];

export const M1_ARTIFACT_TYPES = [
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
export type M1ArtifactType = typeof M1_ARTIFACT_TYPES[number];

export const M1_STAGES = ['plan', 'generate', 'compile', 'verify', 'promote'] as const;
export type M1Stage = typeof M1_STAGES[number];

export const M1_VERIFICATION_KINDS = ['compile', 'test', 'schema', 'hash'] as const;
export type M1VerificationKind = typeof M1_VERIFICATION_KINDS[number];

/** Public names d1_31 must import. Do not duplicate these enums in agentDefsL1. */
export const D1_31_IMPORT = '/_102021_/l2/agentMaterializeL1/contracts/definition.js' as const;
export const D1_31_EXPORTS = [
  'M1_DEFINITION_SCHEMA',
  'M1_STATUSES',
  'M1_ARTIFACT_TYPES',
  'parseDefinitionSource',
  'renderDefinition',
  'definitionIssues',
  'canonicalProjection',
  'semanticHash',
  'referenceIssues',
  'traverseDefinitions',
  'statusEvidenceIssues',
  'generatedAllowsSkip',
  'receiptIssues',
  'diagnoseUnit',
] as const;

const ENVELOPE_KEYS = ['schemaVersion', 'artifactType', 'artifactId', 'moduleName', 'status', 'dependencies', 'data'] as const;
const HASH_KEYS = ['schemaVersion', 'artifactType', 'artifactId', 'moduleName', 'dependencies', 'data'] as const;
const TOKEN = /^[A-Za-z][A-Za-z0-9_]*$/;
const MODULE_TOKEN = /^[a-z][A-Za-z0-9]*$/;
const QUALIFIED_FILE = /^_\d+_\/l[1-7]\/[A-Za-z0-9][A-Za-z0-9_./-]*$/;
const DEFINITION_MARKER = 'export const definition = ';
const PIPELINE_MARKER = 'export const pipeline = ';
const AGENT_EXPORT = 'export const agent';

const DATA_KEYS: Record<M1ArtifactType, { required: readonly string[]; optional: readonly string[]; nonempty: readonly string[] }> = {
  domainEntity: { required: ['entityId', 'storageTarget', 'fields', 'lifecycle', 'invariants', 'imports'], optional: [], nonempty: [] },
  valueObject: { required: ['valueObjectId', 'fields', 'referencedBy'], optional: [], nonempty: ['referencedBy'] },
  repositoryPort: { required: ['entityId', 'interfaceName', 'methods'], optional: [], nonempty: ['methods'] },
  table: { required: ['tableId', 'entityId', 'physicalName', 'primaryKey', 'uniqueKeys', 'indexes'], optional: [], nonempty: ['primaryKey'] },
  repositoryAdapter: { required: ['entityId', 'portId', 'tableId', 'columns'], optional: [], nonempty: ['columns'] },
  usecase: {
    required: ['usecaseId', 'entityId', 'operation', 'ports', 'rulesApplied', 'functions', 'routeProjections', 'portCalls', 'transactional', 'effects', 'sequence', 'uses', 'rules', 'transaction'],
    optional: ['lifecycle', 'mdm'],
    nonempty: ['functions'],
  },
  httpController: { required: ['pageId', 'handlers'], optional: [], nonempty: ['handlers'] },
  accessScope: { required: ['scopeId', 'grants'], optional: [], nonempty: ['grants'] },
  authorityMap: { required: ['mapId', 'entries'], optional: [], nonempty: ['entries'] },
  repositoryRegistration: { required: ['registrationId', 'adapters'], optional: [], nonempty: ['adapters'] },
  persistenceSeeds: { required: ['seedId', 'scenarios'], optional: ['phase', 'dependencies', 'datasets'], nonempty: ['scenarios'] },
  integrationOutbound: { required: ['integrationId', 'events'], optional: ['processes', 'inbound', 'plugins', 'gaps'], nonempty: ['events'] },
};

export interface M1Definition {
  schemaVersion: typeof M1_DEFINITION_SCHEMA;
  artifactType: M1ArtifactType;
  artifactId: string;
  moduleName: string;
  status: M1Status;
  dependencies: string[];
  data: Record<string, unknown>;
}

export interface M1Verification {
  id: string;
  kind: M1VerificationKind;
  passed: boolean;
  detail: string;
}

export interface M1ReceiptFailure {
  code: string;
  detail: string;
}

export interface MaterializationReceipt {
  schemaVersion: typeof M1_RECEIPT_SCHEMA;
  runId: string;
  candidateId: string;
  defPath: string;
  artifactType: M1ArtifactType;
  artifactId: string;
  recipeVersion: string;
  semanticHash: string;
  dependencyHashes: Record<string, string>;
  sourceHashes: Record<string, string>;
  outputHashes: Record<string, string>;
  stage: M1Stage;
  verifications: M1Verification[];
  failures: M1ReceiptFailure[];
  attempts: number;
  reason: string;
}

export interface KnownArtifact {
  artifactType: M1ArtifactType;
  artifactId: string;
  defPath: string;
}

export interface ReferenceIndex {
  files: readonly string[];
  artifacts: readonly KnownArtifact[];
}

export interface IndexedDefinition {
  defPath: string;
  definition: M1Definition;
}

export interface UnitDiagnosis {
  unitId: string;
  defPath: string;
  artifactType: M1ArtifactType;
  artifactId: string;
  status: M1Status;
  stage: M1Stage;
  issues: string[];
  inputHash: string;
  outputHash: string;
}

export function isM1Status(value: string): value is M1Status {
  return (M1_STATUSES as readonly string[]).includes(value);
}

export function isM1ArtifactType(value: string): value is M1ArtifactType {
  return (M1_ARTIFACT_TYPES as readonly string[]).includes(value);
}

export function isM1Stage(value: string): value is M1Stage {
  return (M1_STAGES as readonly string[]).includes(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function receiptFolder(moduleName: string): string {
  return `l1/${moduleName}/materialization/agentMaterializeL1`;
}

export function outputPathFromDefPath(defPath: string): string {
  return defPath.endsWith('.defs.ts') ? defPath.replace(/\.defs\.ts$/, '.ts') : '';
}

export function qualifiedFileIssues(path: string, field: string): string[] {
  if (!path) return [`${field} is empty.`];
  if (path.includes('..')) return [`${field} must not contain '..'.`];
  if (path.startsWith('/_')) return [`${field} must be a qualified file _NNNNN_/lN/..., not a TypeScript import.`];
  if (!QUALIFIED_FILE.test(path) || path.endsWith('/')) return [`${field} must be a qualified file _NNNNN_/lN/....`];
  return [];
}

export function definitionIssues(value: unknown): string[] {
  if (!isRecord(value)) return ['Definition must be an object.'];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(ENVELOPE_KEYS as readonly string[]).includes(key)) issues.push(`Unknown field definition.${key}.`);
  }
  issues.push(...schemaVersionIssues(value.schemaVersion));
  const artifactType = typeof value.artifactType === 'string' ? value.artifactType : '';
  if (!isM1ArtifactType(artifactType)) issues.push('definition.artifactType is unknown.');
  const artifactId = typeof value.artifactId === 'string' ? value.artifactId : '';
  if (!TOKEN.test(artifactId)) issues.push('definition.artifactId must be a token.');
  if (typeof value.moduleName !== 'string' || !MODULE_TOKEN.test(value.moduleName)) {
    issues.push('definition.moduleName must be lowerCamel.');
  }
  const status = typeof value.status === 'string' ? value.status : '';
  if (!isM1Status(status)) issues.push('definition.status is invalid.');
  issues.push(...dependencyListIssues(value.dependencies));
  if (!isRecord(value.data)) {
    issues.push('Missing field definition.data.');
    return issues;
  }
  if (isM1ArtifactType(artifactType)) issues.push(...dataIssues(artifactType, value.data));
  return issues;
}

export function parseDefinitionSource(source: string): { definition: unknown } | { issues: string[] } {
  const issues: string[] = [];
  if (source.includes(PIPELINE_MARKER)) issues.push('v2 definition must not export pipeline.');
  if (source.includes(AGENT_EXPORT) || /\b"agent"\s*:/.test(source)) issues.push('v2 definition must not export agent.');
  const raw = sliceJson(source, DEFINITION_MARKER);
  if (raw === undefined) issues.push('definition export is missing or is not JSON.');
  if (issues.length > 0) return { issues };
  return { definition: raw };
}

export function renderDefinition(definition: M1Definition, defPath: string): { source: string } | { issues: string[] } {
  const issues = [
    ...definitionIssues(definition),
    ...qualifiedFileIssues(defPath, 'defPath'),
  ];
  if (issues.length > 0) return { issues };
  const body = [
    `/// <mls fileReference="${defPath}" enhancement="_blank"/>`,
    '',
    `export const definition = ${JSON.stringify(definition, null, 2)} as const;`,
    '',
    'export default definition;',
    '',
  ].join('\n');
  return { source: body };
}

export function readDefinition(value: unknown): M1Definition | { issues: string[] } {
  const issues = definitionIssues(value);
  if (issues.length > 0) return { issues };
  const record = value as Record<string, unknown>;
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: record.artifactType as M1ArtifactType,
    artifactId: record.artifactId as string,
    moduleName: record.moduleName as string,
    status: record.status as M1Status,
    dependencies: [...(record.dependencies as string[])],
    data: record.data as Record<string, unknown>,
  };
}

export function canonicalProjection(definition: M1Definition): Record<string, unknown> {
  const projection: Record<string, unknown> = {};
  for (const key of HASH_KEYS) {
    projection[key] = key === 'dependencies'
      ? [...definition.dependencies].sort()
      : key === 'data'
        ? cloneCanonical(definition.data)
        : definition[key];
  }
  return projection;
}

export async function semanticHash(definition: M1Definition): Promise<string> {
  return sha256Text(stableStringify(canonicalProjection(definition)));
}

export function referenceIssues(definition: M1Definition, index: ReferenceIndex): string[] {
  const issues: string[] = [];
  const files = new Set(index.files);
  const byKey = new Map<string, string[]>();
  for (const artifact of index.artifacts) {
    const key = `${artifact.artifactType}:${artifact.artifactId}`;
    const list = byKey.get(key) || [];
    list.push(artifact.defPath);
    byKey.set(key, list);
  }
  for (const path of definition.dependencies) {
    if (!files.has(path)) issues.push(`Missing dependency ${path}.`);
  }
  for (const ref of collectIdentityRefs(definition)) {
    const matches = byKey.get(`${ref.type}:${ref.id}`) || [];
    if (matches.length === 0) issues.push(`Missing reference ${ref.type}:${ref.id} at ${ref.path}.`);
    else if (matches.length > 1) issues.push(`Ambiguous reference ${ref.type}:${ref.id} at ${ref.path}.`);
  }
  for (const fileRef of collectFileRefs(definition)) {
    if (definition.dependencies.includes(fileRef.path)) continue;
    if (files.has(fileRef.path)) issues.push(`File reference ${fileRef.path} at ${fileRef.field} is not listed in dependencies.`);
    else issues.push(`Missing file reference ${fileRef.path} at ${fileRef.field}.`);
  }
  return issues;
}

export function traverseDefinitions(
  units: readonly IndexedDefinition[],
  knownFiles: readonly string[] = [],
): { order: string[]; issues: string[] } {
  const issues: string[] = [];
  const byPath = new Map<string, IndexedDefinition>();
  for (const unit of units) {
    if (byPath.has(unit.defPath)) issues.push(`Duplicate defPath ${unit.defPath}.`);
    byPath.set(unit.defPath, unit);
    issues.push(...definitionIssues(unit.definition).map(item => `${unit.defPath}: ${item}`));
  }
  const known = new Set(knownFiles);
  for (const unit of units) {
    for (const dep of unit.definition.dependencies) {
      if (!byPath.has(dep) && !known.has(dep)) issues.push(`Missing dependency ${dep} on ${unit.defPath}.`);
    }
  }
  const color = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    const state = color.get(id) ?? 0;
    if (state === 1) {
      const at = stack.indexOf(id);
      const cycle = [...stack.slice(at), id];
      const key = cycle.slice().sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        issues.push(`Cycle: ${cycle.join(' -> ')}.`);
      }
      return;
    }
    if (state === 2) return;
    color.set(id, 1);
    stack.push(id);
    const unit = byPath.get(id);
    if (unit) {
      for (const next of unit.definition.dependencies) {
        if (byPath.has(next)) visit(next);
      }
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const unit of units) visit(unit.defPath);
  const order: string[] = [];
  const placed = new Set<string>();
  const walking = new Set<string>();
  const walk = (id: string) => {
    if (placed.has(id) || walking.has(id) || !byPath.has(id)) return;
    const unit = byPath.get(id);
    if (!unit) return;
    walking.add(id);
    for (const dep of unit.definition.dependencies) walk(dep);
    walking.delete(id);
    placed.add(id);
    order.push(id);
  };
  for (const unit of units) walk(unit.defPath);
  return { order, issues };
}

export function receiptIssues(value: unknown): string[] {
  if (!isRecord(value)) return ['Receipt must be an object.'];
  const issues: string[] = [];
  const keys = [
    'schemaVersion', 'runId', 'candidateId', 'defPath', 'artifactType', 'artifactId', 'recipeVersion',
    'semanticHash', 'dependencyHashes', 'sourceHashes', 'outputHashes', 'stage', 'verifications',
    'failures', 'attempts', 'reason',
  ];
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) issues.push(`Unknown field receipt.${key}.`);
  }
  if (value.schemaVersion !== M1_RECEIPT_SCHEMA) issues.push('receipt.schemaVersion is unknown.');
  for (const key of ['runId', 'defPath', 'artifactId', 'recipeVersion', 'semanticHash'] as const) {
    if (typeof value[key] !== 'string' || !value[key]) issues.push(`receipt.${key} is required.`);
  }
  if (typeof value.candidateId !== 'string') issues.push('receipt.candidateId must be a string.');
  if (typeof value.defPath === 'string') issues.push(...qualifiedFileIssues(value.defPath, 'receipt.defPath'));
  const type = typeof value.artifactType === 'string' ? value.artifactType : '';
  if (!isM1ArtifactType(type)) issues.push('receipt.artifactType is unknown.');
  const stage = typeof value.stage === 'string' ? value.stage : '';
  if (!isM1Stage(stage)) issues.push('receipt.stage is invalid.');
  if (!isRecord(value.dependencyHashes)) issues.push('receipt.dependencyHashes must be an object.');
  if (!isRecord(value.sourceHashes)) issues.push('receipt.sourceHashes must be an object.');
  if (!isRecord(value.outputHashes)) issues.push('receipt.outputHashes must be an object.');
  if (!Array.isArray(value.verifications)) issues.push('receipt.verifications must be a list.');
  if (!Array.isArray(value.failures)) issues.push('receipt.failures must be a list.');
  if (typeof value.attempts !== 'number' || !Number.isInteger(value.attempts) || value.attempts < 0) {
    issues.push('receipt.attempts must be a non-negative integer.');
  }
  if (typeof value.reason !== 'string') issues.push('receipt.reason must be a string.');
  return issues;
}

export async function statusEvidenceIssues(
  definition: M1Definition,
  receipt: MaterializationReceipt | null,
  currentDependencyHashes: Readonly<Record<string, string>> = {},
): Promise<string[]> {
  if (definition.status === 'generated') {
    if (!receipt) return ['generated requires a receipt.'];
    return [
      ...receiptMatchIssues(definition, receipt),
      ...await hashDriftIssues(definition, receipt, currentDependencyHashes),
    ];
  }
  if (definition.status === 'blocked') {
    if (!receipt) return ['blocked requires a receipt.'];
    if (!receipt.reason) return ['blocked requires a reason on the receipt.'];
    return [];
  }
  if (definition.status === 'failed') {
    if (!receipt) return ['failed requires a receipt.'];
    if (receipt.failures.length === 0) return ['failed requires failures on the receipt.'];
    return [];
  }
  return [];
}

export async function generatedAllowsSkip(
  definition: M1Definition,
  receipt: MaterializationReceipt | null,
  currentDependencyHashes: Readonly<Record<string, string>> = {},
): Promise<boolean> {
  if (definition.status !== 'generated') return false;
  const issues = await statusEvidenceIssues(definition, receipt, currentDependencyHashes);
  return issues.length === 0;
}

export async function diagnoseUnit(input: {
  defPath: string;
  definition: M1Definition;
  receipt?: MaterializationReceipt | null;
  index?: ReferenceIndex;
  stage?: M1Stage;
  currentDependencyHashes?: Readonly<Record<string, string>>;
}): Promise<UnitDiagnosis> {
  const receipt = input.receipt ?? null;
  const issues = [
    ...qualifiedFileIssues(input.defPath, 'defPath'),
    ...definitionIssues(input.definition),
    ...(input.index ? referenceIssues(input.definition, input.index) : []),
    ...await statusEvidenceIssues(input.definition, receipt, input.currentDependencyHashes),
  ];
  const inputHash = await semanticHash(input.definition);
  const outputs = receipt?.outputHashes || {};
  const outputHash = Object.keys(outputs).length === 0 ? '' : await sha256Text(stableStringify(outputs));
  return {
    unitId: `${input.definition.artifactType}/${input.definition.artifactId}`,
    defPath: input.defPath,
    artifactType: input.definition.artifactType,
    artifactId: input.definition.artifactId,
    status: input.definition.status,
    stage: input.stage || receipt?.stage || 'plan',
    issues,
    inputHash,
    outputHash,
  };
}

async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function schemaVersionIssues(value: unknown): string[] {
  if (value === M1_DEFINITION_SCHEMA) return [];
  if (value === D1_DEFINITION_SCHEMA_V1) {
    return [`definition.schemaVersion is ${D1_DEFINITION_SCHEMA_V1}; v2 is ${M1_DEFINITION_SCHEMA}.`];
  }
  return ['definition.schemaVersion is unknown.'];
}

function dependencyListIssues(value: unknown): string[] {
  if (!Array.isArray(value)) return ['definition.dependencies must be a list of qualified files.'];
  const issues: string[] = [];
  const seen = new Set<string>();
  const paths: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== 'string') {
      issues.push(`definition.dependencies.${index} must be a string.`);
      return;
    }
    issues.push(...qualifiedFileIssues(item, `definition.dependencies.${index}`).map(text => text.replace(`definition.dependencies.${index}`, `dependencies ${item}`)));
    if (seen.has(item)) issues.push(`Duplicate dependency ${item}.`);
    seen.add(item);
    paths.push(item);
  });
  const ordered = [...paths].sort();
  if (ordered.some((path, index) => path !== paths[index])) issues.push('definition.dependencies must be sorted.');
  return issues;
}

function dataIssues(type: M1ArtifactType, data: Record<string, unknown>): string[] {
  const spec = DATA_KEYS[type];
  const issues: string[] = [];
  const allowed = [...spec.required, ...spec.optional];
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) issues.push(`Unknown field data.${key}.`);
  }
  for (const key of spec.required) {
    if (data[key] === undefined) issues.push(`Missing field data.${key}.`);
  }
  for (const key of spec.nonempty) {
    if (!Array.isArray(data[key]) || data[key].length === 0) issues.push(`Missing field data.${key}.`);
  }
  return issues;
}

function sliceJson(source: string, marker: string): unknown | undefined {
  const at = source.indexOf(marker);
  if (at < 0) return undefined;
  const start = at + marker.length;
  // A string in the JSON may contain ` as const`; the export terminator is the last one.
  const end = source.lastIndexOf(' as const;');
  if (end < start) return undefined;
  try {
    return JSON.parse(source.slice(start, end));
  } catch {
    return undefined;
  }
}

function cloneCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => cloneCanonical(item));
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = cloneCanonical(value[key]);
    return out;
  }
  return value;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function collectIdentityRefs(definition: M1Definition): Array<{ type: M1ArtifactType; id: string; path: string }> {
  const data = definition.data;
  const refs: Array<{ type: M1ArtifactType; id: string; path: string }> = [];
  const push = (type: M1ArtifactType, id: unknown, path: string) => {
    if (typeof id === 'string' && id) refs.push({ type, id, path });
  };
  if (Array.isArray(data.fields)) {
    data.fields.forEach((field, index) => {
      if (isRecord(field) && field.type === 'record') push('domainEntity', field.ref, `data.fields.${index}.ref`);
    });
  }
  if (typeof data.entityId === 'string' && definition.artifactType !== 'domainEntity') {
    push('domainEntity', data.entityId, 'data.entityId');
  }
  if (Array.isArray(data.ports)) {
    data.ports.forEach((port, index) => push('repositoryPort', port, `data.ports.${index}`));
  }
  if (typeof data.portId === 'string') push('repositoryPort', data.portId, 'data.portId');
  if (typeof data.tableId === 'string' && definition.artifactType !== 'table') {
    push('table', data.tableId, 'data.tableId');
  }
  if (Array.isArray(data.handlers)) {
    data.handlers.forEach((handler, index) => {
      if (isRecord(handler)) push('usecase', handler.usecaseId, `data.handlers.${index}.usecaseId`);
    });
  }
  if (Array.isArray(data.adapters)) {
    data.adapters.forEach((adapter, index) => {
      if (!isRecord(adapter)) return;
      push('repositoryPort', adapter.portId, `data.adapters.${index}.portId`);
      push('repositoryAdapter', adapter.adapterArtifactId, `data.adapters.${index}.adapterArtifactId`);
    });
  }
  if (Array.isArray(data.referencedBy)) {
    data.referencedBy.forEach((id, index) => push('domainEntity', id, `data.referencedBy.${index}`));
  }
  return refs;
}

function collectFileRefs(definition: M1Definition): Array<{ path: string; field: string }> {
  const data = definition.data;
  const refs: Array<{ path: string; field: string }> = [];
  const push = (path: unknown, field: string) => {
    if (typeof path !== 'string' || !path) return;
    refs.push({ path: normalizeFileRef(path, definition.dependencies), field });
  };
  if (Array.isArray(data.rules)) {
    data.rules.forEach((rule, index) => {
      if (isRecord(rule)) push(rule.path, `data.rules.${index}.path`);
    });
  }
  if (Array.isArray(data.routeProjections)) {
    data.routeProjections.forEach((item, index) => {
      if (isRecord(item)) push(item.contractPath, `data.routeProjections.${index}.contractPath`);
    });
  }
  if (Array.isArray(data.effects)) {
    data.effects.forEach((effect, index) => {
      if (isRecord(effect)) push(effect.path, `data.effects.${index}.path`);
    });
  }
  if (isRecord(data.lifecycle) && typeof data.lifecycle.sourcePath === 'string') {
    push(data.lifecycle.sourcePath, 'data.lifecycle.sourcePath');
  }
  return refs;
}

function projectOf(dependencies: readonly string[]): string {
  for (const path of dependencies) {
    const match = /^_(\d+)_/.exec(path);
    if (match) return match[1];
  }
  return '0';
}

function normalizeFileRef(path: string, dependencies: readonly string[]): string {
  if (QUALIFIED_FILE.test(path)) return path;
  if (path.startsWith('l')) {
    const project = projectOf(dependencies);
    return project === '0' ? path : `_${project}_/${path}`;
  }
  return path;
}

async function hashDriftIssues(
  definition: M1Definition,
  receipt: MaterializationReceipt,
  currentDependencyHashes: Readonly<Record<string, string>>,
): Promise<string[]> {
  const issues: string[] = [];
  if (receipt.semanticHash !== await semanticHash(definition)) issues.push('semantic hash changed');
  const recorded = isRecord(receipt.dependencyHashes) ? receipt.dependencyHashes : {};
  for (const path of definition.dependencies) {
    if (recorded[path] !== currentDependencyHashes[path]) issues.push(`dependency ${path} changed`);
  }
  return issues;
}

function receiptMatchIssues(definition: M1Definition, receipt: MaterializationReceipt): string[] {
  const issues = receiptIssues(receipt);
  if (receipt.artifactType !== definition.artifactType) issues.push('receipt.artifactType does not match the definition.');
  if (receipt.artifactId !== definition.artifactId) issues.push('receipt.artifactId does not match the definition.');
  if (!receipt.recipeVersion) issues.push('receipt.recipeVersion is required.');
  if (!receipt.semanticHash.startsWith('sha256:')) issues.push('receipt.semanticHash is not a sha256 digest.');
  const outputs = Object.keys(receipt.outputHashes);
  if (outputs.length === 0) issues.push('generated receipt must hash at least one output.');
  if (!Array.isArray(receipt.verifications) || receipt.verifications.length === 0) {
    issues.push('generated receipt must record verifications.');
  } else if (receipt.verifications.some(item => !item.passed)) {
    issues.push('generated receipt has a failed verification.');
  }
  for (const path of definition.dependencies) {
    if (!receipt.dependencyHashes[path]) issues.push(`generated receipt is missing dependency hash ${path}.`);
  }
  return issues;
}
