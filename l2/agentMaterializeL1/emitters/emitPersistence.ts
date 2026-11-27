/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitPersistence.ts" enhancement="_blank"/>

/**
 * Persistence recipes. Column placement follows the table def and the entity
 * leaves. A derived or platform storage target does not become a local table.
 * The migration plan is an additive diff of the schema snapshot shape. A
 * destructive step is a block, never a DROP. The plan is not an applied migration.
 */

import { connectionCatalogSource, l1OwnerOfRef } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';
import { platformClientConnections } from '/_102021_/l2/agentMaterializeL1/helpers/m12Stage2.js';
import { catalogOperations, type CatalogOperation } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { withProcessMethods } from '/_102021_/l2/agentMaterializeL1/emitters/processPorts.js';
import {
  isRecord,
  outputPathFromDefPath,
  parseDefinitionSource,
  readDefinition,
  type M1Definition,
  type M1Verification,
} from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';
import { readFixturePlan, type M1FixturePlan } from '/_102021_/l2/helpers/l1Defs/fixture.js';
import { domainOptionalPaths } from '/_102021_/l2/agentMaterializeL1/emitters/domainOptional.js';
import { auditImports, importSpecifier, ontologyCollections, ontologyRef, type EmitFailure, type StructureRead } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { actorMdmSeedRows, l4ActorsOf, seedOntologyRef } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';
import { catalogFilePath, catalogImportPath } from '/_102020_/l2/helpers/connections/catalogPath.js';
import { MODULE_EVENT_PUBLISH, publisherNameOf } from '/_102021_/l2/helpers/l1Defs/moduleEvent.js';

const CONTRACTS = '/_102034_/l1/server/layer_1_external/persistence/contracts.js';
const DATA_RUNTIME = '/_102034_/l1/server/layer_1_external/data/moduleDataRuntime.js';
const APP_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';
const REPOSITORY_REGISTRY = '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
const WORKFLOW_ENGINE = '/_102034_/l1/workflow/index.js';
const JSON_COLUMN = 'details';
const JSON_PREFIX = 'json:';
const TIME_COLUMN = 'occurredAt';
const LOCAL_STORAGE = 'moduleDatabase';
const PLAN_FORMAT = '102034-schema-snapshot';

const STORAGE_BLOCK: Record<string, string> = {
  mdm: 'MDM_LOCAL_TABLE',
  derived: 'DERIVED_LOCAL_TABLE',
  platform: 'PLATFORM_LOCAL_TABLE',
  external: 'EXTERNAL_LOCAL_TABLE',
};

export interface ColumnBinding {
  field: string;
  column: string;
  nullable: boolean;
  placement: 'column' | 'json';
}

export interface PlannedColumn {
  name: string;
  postgresType: string;
  nullable: boolean;
  defaultSql: string | null;
}

export interface PlannedIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface PlannedTable {
  tableName: string;
  primaryKey: string[];
  columns: PlannedColumn[];
  indexes: PlannedIndex[];
}

export interface AdditiveStep {
  op: 'createTable' | 'addColumn' | 'createIndex';
  tableName: string;
  name: string;
}

export interface BlockedStep {
  op: 'removeTable' | 'removeColumn' | 'removeIndex' | 'alterColumn';
  tableName: string;
  name: string;
  reason: 'DESTRUCTIVE_OUT_OF_SCOPE';
}

export interface AdditivePlan {
  format: typeof PLAN_FORMAT;
  applied: false;
  steps: AdditiveStep[];
  blocked: BlockedStep[];
}

export interface PhysicalAssert {
  ok: boolean;
  isolated: boolean;
  code: string;
  detail: string;
}

export interface PersistenceEmit {
  source: string;
  imports: string[];
  runsStub: boolean;
  seeds: boolean;
  evidences: M1Verification[];
}

interface Leaf {
  name: string;
  type: string;
  derived: boolean;
  platform: boolean;
  indexed: boolean;
}

interface BuiltTable {
  definition: TableDefinition;
  bindings: ColumnBinding[];
  planned: PlannedTable;
}

export function additivePlan(desired: readonly PlannedTable[], previous: readonly PlannedTable[] | null): AdditivePlan {
  const steps: AdditiveStep[] = [];
  const blocked: BlockedStep[] = [];
  const prior = new Map((previous ?? []).map(table => [table.tableName, table]));
  const wanted = new Set(desired.map(table => table.tableName));
  for (const table of previous ?? []) {
    if (!wanted.has(table.tableName)) blocked.push(block('removeTable', table.tableName, table.tableName));
  }
  for (const table of desired) {
    const before = prior.get(table.tableName);
    if (!before) {
      steps.push({ op: 'createTable', tableName: table.tableName, name: table.tableName });
      for (const index of keptIndexes(table)) steps.push({ op: 'createIndex', tableName: table.tableName, name: index.name });
      continue;
    }
    diffColumns(table, before, steps, blocked);
    diffIndexes(table, before, steps, blocked);
  }
  return { format: PLAN_FORMAT, applied: false, steps, blocked };
}

export function applyPlan(
  previous: readonly PlannedTable[] | null,
  plan: AdditivePlan,
  desired: readonly PlannedTable[],
): { ok: boolean; tables: PlannedTable[] } {
  if (plan.blocked.length > 0 || plan.applied !== false) return { ok: false, tables: (previous ?? []).map(cloneTable) };
  if (plan.steps.some(step => step.op !== 'createTable' && step.op !== 'addColumn' && step.op !== 'createIndex')) {
    return { ok: false, tables: (previous ?? []).map(cloneTable) };
  }
  return { ok: true, tables: desired.map(cloneTable) };
}

export function assertPhysicalSchema(expected: PlannedTable | null, actual: PlannedTable | null): PhysicalAssert {
  if (!expected) return { ok: false, isolated: true, code: 'PHYSICAL_SCHEMA_ABSENT', detail: 'No expected table was built.' };
  if (!actual) {
    return {
      ok: false,
      isolated: true,
      code: 'PHYSICAL_SCHEMA_ABSENT',
      detail: `Physical schema for ${expected.tableName} is absent. This case is not a pass.`,
    };
  }
  const same = JSON.stringify(normalizePlanned(expected)) === JSON.stringify(normalizePlanned(actual));
  return same
    ? { ok: true, isolated: false, code: '', detail: `${expected.tableName} matches the plan.` }
    : { ok: false, isolated: false, code: 'SCHEMA_DIVERGENT', detail: `${expected.tableName} does not match the plan.` };
}

export function withoutUniqueChecks(source: string): string {
  const start = source.indexOf('// enforce:unique');
  const end = source.indexOf('// end:unique');
  if (start < 0 || end < start) return source;
  return `${source.slice(0, start)}// enforce:unique disabled\n  ${source.slice(end)}`;
}

/** Rows the reference-seed unit accepted. They are not a key of the def. */
export interface ReferenceSeedDataset {
  seedFor: string;
  rows: readonly Record<string, unknown>[];
}

export async function emitPersistence(
  id: string,
  definition: M1Definition,
  output: string,
  read: StructureRead,
  moduleDefinitions: readonly M1Definition[] = [],
  referenceSeeds: readonly ReferenceSeedDataset[] = [],
): Promise<PersistenceEmit | EmitFailure> {
  if (id === 'persistence.table') return emitTable(definition, output, read);
  if (id === 'persistence.repositoryAdapter') return emitAdapter(definition, output, read, moduleDefinitions);
  if (id === 'persistence.repositoryRegistration') return emitRegistration(definition, output, read);
  if (id === 'persistence.persistenceSeeds') return emitSeeds(definition, output, referenceSeeds, read, moduleDefinitions);
  if (id === 'persistence.integrationOutbound') return emitOutbound(definition, output, read);
  return { code: 'NO_NAMED_HANDLER', detail: `${id} is not a persistence body.` };
}

export function columnNullable(name: string, primaryKey: readonly string[], uniqueKeys: ReadonlyArray<readonly string[]>, timeField: string, optional: ReadonlySet<string> | null | undefined): boolean {
  if (primaryKey.includes(name)) return false;
  const inUniqueKey = uniqueKeys.some(key => key.includes(name));
  if (!inUniqueKey) return true;
  if (name === timeField || !optional) return false;
  return optional.has(name);
}

async function emitTable(definition: M1Definition, output: string, read: StructureRead): Promise<PersistenceEmit | EmitFailure> {
  const pending = pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No table was written.` };
  const entity = await loadEntity(definition, read);
  if ('code' in entity) return entity;
  const built = buildLocalTable(definition, entity, domainOptionalPaths(entity, await read(ontologyRef(entity, output))));
  if ('code' in built) return built;
  const plan = additivePlan([built.planned], null);
  const source = renderTable(output, built.definition, plan);
  const bad = auditImports(source, [CONTRACTS]);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  return {
    source,
    imports: [CONTRACTS],
    runsStub: false,
    seeds: false,
    evidences: [
      { id: 'tableFile', kind: 'compile', passed: true, detail: 'Table file compiled. This row is not a migration.' },
      { id: 'migration', kind: 'schema', passed: false, detail: 'Additive plan only. applied=false. Physical schema was not changed.' },
    ],
  };
}

async function emitAdapter(definition: M1Definition, output: string, read: StructureRead, moduleDefinitions: readonly M1Definition[]): Promise<PersistenceEmit | EmitFailure> {
  const pending = pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No adapter was written.` };
  const table = await dependencyDefinition(definition, read, 'table');
  if ('code' in table) return table;
  const port = await dependencyDefinition(definition, read, 'repositoryPort');
  if ('code' in port) return port;
  const entity = await loadEntity(table.definition, read);
  if ('code' in entity) return entity;
  const ontologySource = await read(ontologyRef(entity, output));
  const optional = domainOptionalPaths(entity, ontologySource);
  const built = buildLocalTable(table.definition, entity, optional);
  if ('code' in built) return built;
  const declaredRows = declaredBindings(definition);
  if ('code' in declaredRows) return declaredRows;
  // A collection of objects (l4 `collection: true` with fields) is stored whole at its path: one value, a list. Bound
  // field by field it kept one item and lost the rest (the daily notice of two tasks kept one, tarefas 16/10).
  const collections = ontologyCollections(await read(ontologyRef(entity, output)));
  built.bindings = collapseCollections(built.bindings, collections);
  const declared = collapseCollections(declaredRows, collections);
  const drift = bindingDrift(built.bindings, declared);
  if (drift) return { code: 'DIVERGENT_BINDING', detail: drift };
  const uniqueKeys = normalizeKeys(table.definition.data.uniqueKeys) ?? [];
  // The methods a workflow process or a route applies through the port (§11, children written with their parent) are
  // the adapter's too: the module's port def carries them when the run loaded it.
  const inModule = moduleDefinitions.find(item => item.artifactType === 'repositoryPort' && text(item.data.interfaceName) === text(port.definition.data.interfaceName));
  // d1_325: the one source of "is this path there?" is `domainOptionalPaths`, the same the type of the entity reads: an object comes back only when the entity requires it
  // (and the `details` container, always); a collection is never absent, its empty is `[]`. An object that is optional and holds no value stays absent.
  const shape = adapterShape(built.bindings.map(binding => binding.field), optional, collections);
  const source = renderAdapter(output, port.path, inModule ?? withProcessMethods(port.definition, moduleDefinitions), built, uniqueKeys, shape);
  if ('code' in source) return source;
  return { ...source, seeds: false, evidences: [] };
}

async function emitRegistration(definition: M1Definition, output: string, read: StructureRead): Promise<PersistenceEmit | EmitFailure> {
  const pending = pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No registration was written.` };
  const adapters = Array.isArray(definition.data.adapters) ? definition.data.adapters.filter(isRecord) : [];
  if (adapters.length === 0) return { code: 'REGISTRATION_EMPTY', detail: `${definition.artifactId} lists no adapter.` };
  const rows: Array<{ portId: string; factory: string; specifier: string; stub: boolean }> = [];
  for (const adapter of adapters) {
    const portId = text(adapter.portId);
    const artifactId = text(adapter.adapterArtifactId);
    if (!ident(portId) || !artifactId) return { code: 'REGISTRATION_UNBOUND', detail: 'An adapter row has no port.' };
    // d1_347 s3: the port of a platform client (CmGateway) is not registered: the module reaches the cm through `cm(ctx)`.
    if (platformGatewayPorts().has(portId)) continue;
    const defPath = definition.dependencies.find(path => path.endsWith(`/${artifactId}.defs.ts`) || path.endsWith(`/${artifactId.charAt(0).toLowerCase()}${artifactId.slice(1)}.defs.ts`));
    const matched = definition.dependencies.find(path => {
      const base = path.split('/').pop() ?? '';
      return base.toLowerCase() === `${artifactId.toLowerCase()}.defs.ts` || base.toLowerCase().startsWith(artifactId.toLowerCase());
    }) ?? defPath ?? '';
    if (!matched) return { code: 'ADAPTER_UNBOUND', detail: `${portId} has no adapter dependency.` };
    const spec = importSpecifier(matched, 'output');
    const body = await read(outputPathFromDefPath(matched));
    rows.push({
      portId,
      factory: `create${portId}`,
      specifier: spec,
      stub: typeof body === 'string' && body.includes('REPOSITORY_NOT_IMPLEMENTED'),
    });
  }
  const source = renderRegistration(output, rows);
  const imports = [REPOSITORY_REGISTRY, ...rows.map(row => row.specifier)];
  const bad = auditImports(source, imports);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  return { source, imports, runsStub: rows.some(row => row.stub), seeds: false, evidences: [] };
}

/**
 * Product seeds and the certification fixture are two exports. D1 plans datasets as
 * `{ datasetId, tableId, owners }` with no rows, so `applicableSeeds` stays empty and the
 * receipt says planned, not materialized. Rows a def carries (`seedFor`/`rows`) are test seeds
 * and keep the scenario filter. Rows the reference-seed unit accepted are initial seeds: they
 * ship for every table that unit produced, with or without a scenario, and they are not written
 * back onto the def. The fixture (l2/helpers/l1Defs/fixture.ts) is never a seed row.
 */
async function emitSeeds(
  definition: M1Definition,
  output: string,
  referenceSeeds: readonly ReferenceSeedDataset[] = [],
  read: StructureRead = async () => null,
  moduleDefinitions: readonly M1Definition[] = [],
): Promise<PersistenceEmit | EmitFailure> {
  const pending = pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No seed file was written.` };
  const scenarios = Array.isArray(definition.data.scenarios) ? definition.data.scenarios.filter(isRecord) : [];
  const targets = [...new Set(scenarios.map(item => text(item.tableId)).filter(Boolean))];
  const datasets = Array.isArray(definition.data.datasets) ? definition.data.datasets.filter(isRecord) : [];
  const fromDef = datasets
    .filter(item => targets.includes(text(item.seedFor)) && Array.isArray(item.rows))
    .map(item => ({ seedFor: text(item.seedFor), purpose: 'test' as const, rows: item.rows }));
  const fromUnit = referenceSeeds
    // A table may carry both: its initial rows and the test rows of the def (rt118 contract, item 1).
    .filter(item => item.rows.length > 0)
    .map(item => ({ seedFor: item.seedFor, purpose: 'initial' as const, rows: item.rows }));
  const taken = new Set([...fromDef, ...fromUnit].map(item => item.seedFor));
  const fromActors = (await actorDatasets(definition.moduleName, output, read))
    .filter(item => item.rows.length > 0 && !taken.has(item.seedFor))
    .map(item => ({ seedFor: item.seedFor, purpose: 'test' as const, rows: item.rows }));
  const rows = [...fromDef, ...fromUnit, ...fromActors].map(item => withLoadRelativeTime(item, moduleDefinitions));
  const planned = datasets
    .filter(item => targets.includes(text(item.tableId)) && !Array.isArray(item.rows) && !rows.some(row => text(row.seedFor) === text(item.tableId)))
    .map(item => text(item.tableId));
  let fixture: M1FixturePlan | null = null;
  if (definition.data.fixture !== undefined) {
    const read = readFixturePlan(definition.data.fixture);
    if ('issues' in read) return { code: 'FIXTURE_INVALID', detail: `${definition.artifactId}: ${read.issues.join('; ')}. No seed file was written.` };
    fixture = read;
  }
  const source = renderSeeds(output, text(definition.data.phase) || 'plan', scenarios, rows, fixture);
  const bad = auditImports(source, [CONTRACTS]);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  // What the file holds, true as written. Phase is in the id and the detail: applied and tested are never claimed here.
  const evidences: M1Verification[] = [{
    id: rows.length > 0 ? 'seedRowsMaterialized' : 'seedPlanned',
    kind: 'schema',
    passed: true,
    detail: rows.length > 0
      ? `${rows.length} product seed dataset(s) materialized in the file; not applied by this receipt.`
      : `Planned only (${planned.length ? planned.sort().join(', ') : 'no dataset'}). No row was materialized or applied.`,
  }];
  if (fixture) {
    evidences.push({
      id: 'certificationFixturePlanned',
      kind: 'schema',
      passed: true,
      detail: `Fixture plan written: ${fixture.datasets.length} dataset(s), ${fixture.runtime.length} runtime need(s). Not applied or tested by this receipt.`,
    });
  }
  return { source, imports: [CONTRACTS], runsStub: false, seeds: rows.length > 0, evidences };
}

const MDM_TABLE_REF = '_102034_/l1/mdm/persistence.ts';
const MDM_ONTOLOGY_REF = '_102034_/l1/mdm/defs/ontology.ts';

/** Person rows for each l4 actor. The MDM tables are not scenarios of the module. No actor, no row. */
async function actorDatasets(moduleName: string, output: string, read: StructureRead): Promise<ReferenceSeedDataset[]> {
  const project = /^_(\d+)_\//.exec(output);
  if (!project || !moduleName) return [];
  const access = await read(`_${project[1]}_/l4/${moduleName}/access.defs.ts`);
  if (l4ActorsOf(access).length === 0) return [];
  const tableSource = await read(MDM_TABLE_REF);
  if (!tableSource) throw new Error(`${MDM_TABLE_REF} was not read`);
  const ontologySource = await read(MDM_ONTOLOGY_REF);
  if (!ontologySource) throw new Error(`${MDM_ONTOLOGY_REF} was not read`);
  return actorMdmSeedRows({
    moduleName,
    accessSource: access,
    roleSource: entityId => read(seedOntologyRef(Number(project[1]), moduleName, entityId)),
    tableSource,
    ontologySource,
  });
}

const CALL_CONNECTION = '/_102034_/l1/server/layer_1_external/connections/callConnection.js';
export const CONNECTION_STATUS: Record<string, number> = {
  not_found: 404,
  disabled: 409,
  unavailable: 503,
  conflict: 409,
  refused: 422,
  forbidden: 403,
  invalid: 400,
};

interface ConnectionRow {
  connectionId: string;
  operationId: string;
}

/**
 * An event bound to the platform module-event publisher (d1_216) gets one publisher function in this file. Events with no other
 * mechanism stay a gap. A def that also lists `connections` writes the gateways in the same file:
 * the receipt carries the same gap beside the file (one return cannot be both a failure and a source).
 */
/**
 * d1_347 s3: the connections whose client the platform gives (`cm(ctx)`, P:l1/server/layer_1_external/connections/cm): the module writes no bridge for them and registers no port for them. Only in stage 2
 * (`stage2.on`, helpers/m12Stage2.ts, off in the committed generator): before it, nothing changes. A bridge a module already has stays as it is until that module is regenerated.
 */
const platformGatewayPorts = (): Set<string> => new Set(platformClientConnections().map(id => `${id.charAt(0).toUpperCase()}${id.slice(1)}Gateway`));

async function emitOutbound(definition: M1Definition, output: string, read: StructureRead): Promise<PersistenceEmit | EmitFailure> {
  const events = Array.isArray(definition.data.events) ? definition.data.events.filter(isRecord) : [];
  const pending = events.map(event => text(event.pending)).find(Boolean) || pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No publisher was written.` };
  const declared = connectionRows(definition.data.connections);
  const connections = declared.filter(row => !platformClientConnections().includes(row.connectionId));
  const publishing = events.filter(isModuleEventBinding);
  const others = events.filter(event => !publishing.includes(event));
  const unbound = others.filter(event => !text(event.mechanism)).map(event => text(event.eventId) || '(unnamed)');
  const named = others.map(event => `${text(event.eventId) || '(unnamed)'}:${text(event.mechanism)}`);
  if (connections.length === 0 && publishing.length === 0) {
    // Only the connection of the platform client: there is nothing this file would hold (the module calls `cm(ctx)`).
    if (declared.length > 0 && others.length === 0) return { code: 'CM_FROM_PLATFORM', detail: `CM_FROM_PLATFORM: ${declared.map(row => `${row.connectionId}.${row.operationId}`).join(', ')} is called through the platform client (cm(ctx)); the module has no bridge to write.` };
    if (unbound.length > 0) return { code: 'MECHANISM_UNBOUND', detail: `${unbound.join(', ')} have no mechanism. No publisher was written.` };
    return { code: 'MECHANISM_INCOMPATIBLE', detail: `${named.join(', ')} is not a binding. No publisher was written.` };
  }
  const rendered = await renderConnectionGateways(output, connections, read, definition.moduleName, publishing);
  if ('code' in rendered) return rendered;
  const what = connections.length > 0 && publishing.length > 0 ? 'Connection gateways and event publishers were' : publishing.length > 0 ? 'Event publishers were' : 'Connection gateways were';
  const evidences: M1Verification[] = [];
  if (unbound.length > 0) {
    evidences.push({
      id: 'outboundEvents',
      kind: 'schema',
      passed: false,
      detail: `MECHANISM_UNBOUND: ${unbound.join(', ')} have no mechanism. ${what} written.`,
    });
  } else if (others.length > 0) {
    evidences.push({
      id: 'outboundEvents',
      kind: 'schema',
      passed: false,
      detail: `MECHANISM_INCOMPATIBLE: ${named.join(', ')} is not a binding. ${what} written.`,
    });
  }
  return { ...rendered, evidences };
}

/** The def binds the event to the platform publisher: symbol and ref are the ones of the platform, and the id is a name. */
function isModuleEventBinding(event: Record<string, unknown>): boolean {
  return text(event.mechanism) === MODULE_EVENT_PUBLISH.symbol && text(event.mechanismRef) === MODULE_EVENT_PUBLISH.path && ident(text(event.eventId));
}

function connectionRows(value: unknown): ConnectionRow[] {
  const rows = Array.isArray(value) ? value.filter(isRecord) : [];
  const seen = new Set<string>();
  const out: ConnectionRow[] = [];
  for (const row of rows) {
    const connectionId = text(row.connectionId);
    const operationId = text(row.operationId);
    if (!ident(connectionId) || !ident(operationId)) continue;
    const key = `${connectionId}\0${operationId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ connectionId, operationId });
  }
  out.sort((a, b) => a.connectionId.localeCompare(b.connectionId) || a.operationId.localeCompare(b.operationId));
  return out;
}

async function renderConnectionGateways(
  output: string,
  rows: readonly ConnectionRow[],
  read: StructureRead,
  moduleName: string,
  publishing: readonly Record<string, unknown>[],
): Promise<PersistenceEmit | EmitFailure> {
  const byConnection = new Map<string, ConnectionRow[]>();
  for (const row of rows) {
    const list = byConnection.get(row.connectionId) ?? [];
    list.push(row);
    byConnection.set(row.connectionId, list);
  }
  const blocks: string[] = [];
  const imports = [APP_CONTRACTS];
  if (rows.length > 0) imports.push(CALL_CONNECTION);
  if (publishing.length > 0) imports.push(MODULE_EVENT_PUBLISH.importPath);
  for (const connectionId of [...byConnection.keys()].sort()) {
    // The platform file, or the declaration of a system this module or a sibling declares (d1_208).
    const owner = l1OwnerOfRef(output);
    const found = owner ? await connectionCatalogSource(read, owner.project, owner.moduleName, connectionId) : null;
    const catalogRef = found?.ref ?? catalogFilePath(connectionId);
    const source = found ? found.source : await read(catalogRef);
    const operations = source ? catalogOperations(source) : null;
    if (!operations) return { code: found?.problem?.code ?? 'CONNECTION_CATALOG_MISSING', detail: `${found?.problem?.detail ?? `${catalogRef} was not read.`} No gateway was written.` };
    const used: CatalogOperation[] = [];
    for (const row of byConnection.get(connectionId) ?? []) {
      const operation = operations.find(item => item.operationId === row.operationId);
      if (!operation) return { code: 'OPERATION_NOT_IN_CATALOG', detail: `${connectionId}.${row.operationId} is not in the catalog. No gateway was written.` };
      used.push(operation);
    }
    const specifier = found?.importPath ?? catalogImportPath(connectionId);
    imports.push(specifier);
    const typeNames = [...new Set(used.flatMap(item => [item.inputType, item.outputType]))].sort();
    const gateway = `${connectionId.charAt(0).toUpperCase()}${connectionId.slice(1)}Gateway`;
    const methods = used.map(item => `  ${item.operationId}(input: ${item.inputType}, ctx: RequestContext, opts?: CallConnectionOptions, context?: GatewayCallContext): Promise<${item.outputType}>;`).join('\n');
    const bodies = used.map(item => gatewayMethod(connectionId, item)).join('\n');
    blocks.push([
      `import type { ${typeNames.join(', ')} } from '${specifier}';`,
      '',
      `export interface ${gateway} {`,
      methods,
      '}',
      '',
      `export function create${gateway}(ctx: RequestContext): ${gateway} {`,
      '  return {',
      bodies,
      '  };',
      '}',
    ].join('\n'));
  }
  for (const event of [...publishing].sort((a, b) => text(a.eventId).localeCompare(text(b.eventId)))) blocks.push(eventPublisher(moduleName, event));
  const source = [
    header(output),
    `import { AppError, type RequestContext } from '${APP_CONTRACTS}';`,
    ...(rows.length > 0 ? [
      `import { callConnection, type CallConnectionContext, type CallConnectionOptions } from '${CALL_CONNECTION}';`,
      '',
      "export type GatewayCallContext = Omit<CallConnectionContext, 'actorMdmId' | 'organizationId' | 'callerModuleId' | 'hookParams' | 'requestedByMdmId'>;",
    ] : []),
    ...(publishing.length > 0 ? [`import { ${MODULE_EVENT_PUBLISH.symbol} } from '${MODULE_EVENT_PUBLISH.importPath}';`] : []),
    '',
    `const STATUS: Record<string, number> = ${JSON.stringify(CONNECTION_STATUS)};`,
    '',
    blocks.join('\n\n'),
    '',
  ].join('\n');
  const bad = auditImports(source, imports);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  return { source, imports, runsStub: false, seeds: false, evidences: [] };
}

/**
 * One function per event the module publishes. The use case that does the `on` calls it with the `bound` context of its
 * transaction: the platform checks the event is declared by the module and queues it in that transaction. A refusal is thrown,
 * so the transaction rolls back.
 */
function eventPublisher(moduleName: string, event: Record<string, unknown>): string {
  const eventId = text(event.eventId);
  const name = publisherNameOf(eventId);
  const on = text(event.on);
  return [
    `/** ${eventId}${on ? `: published by ${moduleName} when ${on} happens` : ''}. */`,
    `export async function ${name}(payload: unknown, ctx: RequestContext, opts?: { requestId?: string }): Promise<{ eventId: string }> {`,
    `  const result = await ${MODULE_EVENT_PUBLISH.symbol}({ module: ${JSON.stringify(moduleName)}, eventId: ${JSON.stringify(eventId)} }, payload, ctx, opts);`,
    '  if (!result.ok) throw new AppError(result.code, result.message, STATUS[result.code]);',
    '  return result.output;',
    '}',
  ].join('\n');
}

function gatewayMethod(connectionId: string, item: CatalogOperation): string {
  const lines = [
    `    async ${item.operationId}(input: ${item.inputType}, ctx: RequestContext, opts?: CallConnectionOptions, context?: GatewayCallContext): Promise<${item.outputType}> {`,
  ];
  if (item.expectsVersion) {
    lines.push(`      if (opts?.expectVersion === undefined) throw new AppError('invalid', ${JSON.stringify(`${item.operationId} requires expectVersion.`)}, 400);`);
  }
  lines.push(
    // d1_214: the id of the request the app is serving ties the call record to it. An id the caller passed wins; the other keys stay.
    '      const requestId = opts?.requestId ?? ctx.requestMeta?.requestId;',
    '      const callOptions = requestId === undefined ? opts : { ...opts, requestId };',
    `      const result = await callConnection(${JSON.stringify(connectionId)}, ${JSON.stringify(item.operationId)}, input, { ...context, actorMdmId: ctx.sessionContext.person?.mdmId }, callOptions);`,
    "      if (!result.ok) throw new AppError(result.code, result.message, STATUS[result.code], result.code === 'disabled' && result.missing ? { missing: result.missing } : undefined);",
    `      return result.output as ${item.outputType};`,
    '    },',
  );
  return lines.join('\n');
}

/**
 * `optional`: the paths the l4 leaves optional (`domainOptionalPaths`, the one source). d1_339: a column is NOT NULL when it is in the primary key, is the time column of a series,
 * or is in a unique key AND the l4 requires it. Being in a unique key does not make a field required: the database lets many rows have no value in a unique column, which is what
 * an l4 that says "optional" asks for (the audit of an incoming message has no telegramMessageId; one that was refused has none either). Without `optional` (the l4 not read) the old rule stays.
 */
export function buildLocalTable(definition: M1Definition, entity: M1Definition, optional?: ReadonlySet<string> | null): BuiltTable | EmitFailure {
  const storage = text(entity.data.storageTarget);
  if (storage !== LOCAL_STORAGE) {
    const code = STORAGE_BLOCK[storage] ?? 'STORAGE_UNDECLARED';
    return { code, detail: `${definition.artifactId} storage ${storage || '(missing)'} is not a local table.` };
  }
  const tableId = text(definition.data.tableId);
  const physical = text(definition.data.physicalName);
  const primaryKey = stringList(definition.data.primaryKey);
  if (!ident(tableId) || !ident(physical) || primaryKey.length === 0 || primaryKey.some(field => !ident(field))) {
    return { code: 'TABLE_SHAPE', detail: `${definition.artifactId} has no local table shape.` };
  }
  const uniqueKeys = normalizeKeys(definition.data.uniqueKeys);
  if (!uniqueKeys) return { code: 'UNIQUE_KEY_SHAPE', detail: `${definition.artifactId} unique keys are not a list of fields.` };
  for (const key of uniqueKeys) {
    if (key.some(field => field.includes('.'))) {
      return { code: 'UNIQUE_KEY_NESTED', detail: `Unique key ${key.join('+')} is nested. It was not promoted to a column.` };
    }
  }
  const indexes = normalizeIndexes(definition.data.indexes, physical);
  if (isFailure(indexes)) return indexes;
  const series = definition.data.timeSeries === true;
  const declaredTime = definition.data.timeField;
  const timeField = series && typeof declaredTime === 'string' && declaredTime ? declaredTime : '';
  const syntheticTime = series && !timeField;
  const retentionRaw = definition.data.retentionDays;
  const retentionDays = typeof retentionRaw === 'number' && Number.isInteger(retentionRaw) && retentionRaw > 0 ? retentionRaw : undefined;
  const leaves = leavesOf(entity);
  if (syntheticTime && leaves.some(leaf => leaf.name === TIME_COLUMN)) {
    return { code: 'COLUMN_COLLISION', detail: `Field ${TIME_COLUMN} is the time column of a series. It is not a field of the entity.` };
  }
  const columnPaths = new Set<string>(primaryKey);
  for (const key of uniqueKeys) for (const field of key) columnPaths.add(field);
  for (const index of indexes) for (const field of index.columns) columnPaths.add(field);
  for (const leaf of leaves) {
    if (leaf.indexed && !leaf.name.includes('.')) columnPaths.add(leaf.name);
  }
  for (const field of columnPaths) {
    if (syntheticTime && field === TIME_COLUMN) continue;
    if (!leaves.some(leaf => leaf.name === field)) {
      return { code: 'KEY_FIELD', detail: `Key field ${field} is not a field of ${text(entity.data.entityId) || entity.artifactId}.` };
    }
    if (field === JSON_COLUMN) return { code: 'COLUMN_COLLISION', detail: `Field ${field} would use the details column name.` };
  }
  const bindings: ColumnBinding[] = [];
  for (const leaf of leaves) {
    if (leaf.platform) {
      if (columnPaths.has(leaf.name)) return { code: 'PLATFORM_FIELD', detail: `Field ${leaf.name} is platform data and is part of a key.` };
      continue;
    }
    const placement = columnPaths.has(leaf.name) ? 'column' as const : 'json' as const;
    bindings.push({
      field: leaf.name,
      column: placement === 'json' ? `${JSON_PREFIX}${leaf.name}` : leaf.name,
      nullable: placement === 'column' ? columnNullable(leaf.name, primaryKey, uniqueKeys, timeField, optional) : leaf.name !== 'version',
      placement,
    });
  }
  const columns: TableDefinition['columns'] = [];
  for (const binding of bindings) {
    if (binding.placement !== 'column') continue;
    const leaf = leaves.find(item => item.name === binding.field);
    columns.push({
      name: binding.column,
      postgresType: timeField && binding.field === timeField ? 'TIMESTAMPTZ' : postgresType(leaf?.type || 'string'),
      ...(binding.nullable ? { nullable: true } : {}),
    });
  }
  if (bindings.some(binding => binding.placement === 'json')) {
    columns.push({ name: JSON_COLUMN, postgresType: 'JSONB', defaultSql: `'{}'::jsonb` });
  }
  if (syntheticTime) {
    columns.push({ name: TIME_COLUMN, postgresType: 'TIMESTAMPTZ', defaultSql: 'now()' });
  }
  const definitionBody: TableDefinition = {
    moduleId: definition.moduleName,
    repositoryName: tableId,
    tableName: physical,
    purpose: 'transacao',
    description: physical,
    backupHot: false,
    storageProfile: 'postgres',
    writeMode: 'sync',
    columns,
    primaryKey: [...primaryKey],
    indexes,
    ...(series ? { timescale: { hypertable: { timeColumn: timeField || TIME_COLUMN } } } : {}),
    ...(retentionDays !== undefined ? { retentionDays } : {}),
    version: 1,
  };
  return { definition: definitionBody, bindings, planned: plannedOf(definitionBody) };
}

function plannedOf(definition: TableDefinition): PlannedTable {
  return {
    tableName: definition.tableName,
    primaryKey: [...definition.primaryKey],
    columns: definition.columns.map(column => ({
      name: column.name,
      postgresType: column.postgresType,
      nullable: column.nullable === true,
      defaultSql: column.defaultSql ?? null,
    })),
    indexes: (definition.indexes ?? []).map(index => ({
      name: index.name,
      columns: index.columns.map(column => typeof column === 'string' ? column : column.name),
      unique: index.unique === true,
    })),
  };
}

function diffColumns(table: PlannedTable, before: PlannedTable, steps: AdditiveStep[], blocked: BlockedStep[]): void {
  const prior = new Map(before.columns.map(column => [column.name, column]));
  const wanted = new Set(table.columns.map(column => column.name));
  for (const column of before.columns) {
    if (!wanted.has(column.name)) blocked.push(block('removeColumn', table.tableName, column.name));
  }
  for (const column of table.columns) {
    const old = prior.get(column.name);
    if (!old) {
      steps.push({ op: 'addColumn', tableName: table.tableName, name: column.name });
      continue;
    }
    if (old.postgresType !== column.postgresType || old.nullable !== column.nullable || old.defaultSql !== column.defaultSql) {
      blocked.push(block('alterColumn', table.tableName, column.name));
    }
  }
}

function diffIndexes(table: PlannedTable, before: PlannedTable, steps: AdditiveStep[], blocked: BlockedStep[]): void {
  const kept = keptIndexes(table);
  const prior = new Map(keptIndexes(before).map(index => [index.name, index]));
  const wanted = new Set(kept.map(index => index.name));
  for (const index of keptIndexes(before)) {
    if (!wanted.has(index.name)) blocked.push(block('removeIndex', table.tableName, index.name));
  }
  for (const index of kept) {
    const old = prior.get(index.name);
    if (!old) {
      steps.push({ op: 'createIndex', tableName: table.tableName, name: index.name });
      continue;
    }
    if (old.unique !== index.unique || old.columns.join('\0') !== index.columns.join('\0')) {
      blocked.push(block('alterColumn', table.tableName, index.name));
    }
  }
}

function keptIndexes(table: PlannedTable): PlannedIndex[] {
  return table.indexes.filter(index => {
    if (index.name === `${table.tableName}_pkey`) return false;
    return !(table.primaryKey.length > 0
      && index.columns.length === table.primaryKey.length
      && index.columns.every((column, indexNo) => column === table.primaryKey[indexNo]));
  });
}

function block(op: BlockedStep['op'], tableName: string, name: string): BlockedStep {
  return { op, tableName, name, reason: 'DESTRUCTIVE_OUT_OF_SCOPE' };
}

function cloneTable(table: PlannedTable): PlannedTable {
  return {
    tableName: table.tableName,
    primaryKey: [...table.primaryKey],
    columns: table.columns.map(column => ({ ...column })),
    indexes: table.indexes.map(index => ({ ...index, columns: [...index.columns] })),
  };
}

function normalizePlanned(table: PlannedTable): PlannedTable {
  return {
    tableName: table.tableName,
    primaryKey: [...table.primaryKey],
    columns: [...table.columns].sort((left, right) => left.name.localeCompare(right.name)),
    indexes: [...table.indexes].sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function renderTable(output: string, definition: TableDefinition, plan: AdditivePlan): string {
  return [
    header(output),
    `import type { TableDefinition } from '${CONTRACTS}';`,
    '',
    `export const tableDefinition = ${JSON.stringify(definition, null, 2)} satisfies TableDefinition;`,
    '',
    `export const migrationPlan = ${JSON.stringify(plan, null, 2)} as const;`,
    '',
  ].join('\n');
}

/** The object paths a read record always carries and the collection paths whose empty is `[]` (d1_325). `optional` null (the l4 is unreadable): every parent object, as before. */
export function adapterShape(fields: readonly string[], optional: ReadonlySet<string> | null, collections: ReadonlySet<string>): { objects: string[]; collections: string[] } {
  const objects = new Set<string>();
  for (const field of fields) {
    const parts = field.split('.').filter(Boolean);
    for (let at = 1; at < parts.length; at += 1) {
      const path = parts.slice(0, at).join('.');
      if (collections.has(path)) break;
      if (path === JSON_COLUMN || optional === null || !optional.has(path)) objects.add(path);
    }
  }
  return { objects: [...objects].sort(), collections: [...collections].filter(path => fields.includes(path)).sort() };
}

function renderAdapter(
  output: string,
  portPath: string,
  port: M1Definition,
  built: BuiltTable,
  uniqueKeys: readonly (readonly string[])[],
  shape: { objects: readonly string[]; collections: readonly string[] },
): PersistenceEmit | EmitFailure {
  const entityName = text(port.data.entityId);
  const portName = text(port.data.interfaceName);
  const methods = Array.isArray(port.data.methods) ? port.data.methods.filter(isRecord) : [];
  if (!ident(entityName) || !ident(portName) || methods.length === 0) {
    return { code: 'PORT_SHAPE', detail: `${port.artifactId} has no port methods.` };
  }
  const entityDep = port.dependencies.find(path => path.includes('/entities/')) ?? '';
  if (!entityDep || !portPath) return { code: 'PORT_UNBOUND', detail: `${portName} has no entity or port file.` };
  const locals = new Set<string>();
  const bodies: string[] = [];
  for (const method of methods) {
    const name = text(method.name);
    const params = stringList(method.params);
    if (!ident(name)) return { code: 'METHOD_UNDECLARED', detail: `${portName} has a method that is not an identifier.` };
    const rendered = renderMethod(name, params, entityName, locals);
    if (!rendered) return { code: 'METHOD_UNDECLARED', detail: `${portName}.${name} has no repository mapping. It was not invented.` };
    bodies.push(rendered);
  }
  const aliases = [...locals].filter(name => name !== entityName && name !== portName);
  const entityImport = importSpecifier(entityDep, 'output');
  const portImport = importSpecifier(portPath, 'output');
  const versionField = built.bindings.find(binding => binding.field === 'version')?.field ?? '';
  const source = [
    header(output),
    `import { AppError, type RequestContext } from '${APP_CONTRACTS}';`,
    `import type { IModuleDataRuntime } from '${DATA_RUNTIME}';`,
    `import type { ${entityName} } from '${entityImport}';`,
    `import type { ${portName}${aliases.length ? `, ${aliases.join(', ')}` : ''} } from '${portImport}';`,
    '',
    `const REPOSITORY = ${JSON.stringify(built.definition.repositoryName)};`,
    `const PRIMARY_KEY = ${JSON.stringify(built.definition.primaryKey)} as const;`,
    `const UNIQUE_KEYS: readonly (readonly string[])[] = ${JSON.stringify(uniqueKeys)};`,
    `const BINDINGS = ${JSON.stringify(built.bindings.map(binding => ({ field: binding.field, column: binding.column, placement: binding.placement })))} as const;`,
    `const JSON_COLUMN = ${JSON.stringify(JSON_COLUMN)};`,
    // d1_340: a value the code leaves empty ('') in a column that is not text (a time, a number, a boolean) is written as NULL: the database refuses '' there (invalid input syntax). A text column keeps its ''; a column that does not accept NULL keeps the error.
    `const NON_TEXT_COLUMNS: readonly string[] = ${JSON.stringify(built.definition.columns.filter(column => column.postgresType !== 'TEXT' && column.postgresType !== 'JSONB').map(column => column.name))};`,
    `const OBJECTS: readonly string[] = ${JSON.stringify(shape.objects)};`,
    `const COLLECTIONS: readonly string[] = ${JSON.stringify(shape.collections)};`,
    `const VERSION_FIELD = ${JSON.stringify(versionField)};`,
    '',
    'type Row = Record<string, unknown>;',
    '',
    helperSource(),
    '',
    `export function bind(runtime: IModuleDataRuntime): ${portName} {`,
    '  return {',
    bodies.join('\n'),
    '  };',
    '}',
    '',
    `export function create${portName}(ctx: RequestContext): ${portName} {`,
    '  return bind(ctx.data.moduleData);',
    '}',
    '',
  ].join('\n');
  const imports = [APP_CONTRACTS, DATA_RUNTIME, entityImport, portImport];
  const bad = auditImports(source, imports);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  return { source, imports, runsStub: false, seeds: false, evidences: [] };
}

function renderMethod(name: string, params: readonly string[], entityName: string, locals: Set<string>): string | null {
  const entityParam = params.find(param => param === entityName);
  const filter = params.find(param => param.endsWith('Filter'));
  if (name === 'create' && entityParam) {
    return [
      `    async create(record: ${entityName}): Promise<${entityName}> {`,
      '      const body = withVersion(record as unknown as Row, undefined);',
      '      const table = await runtime.getTable<Row>(REPOSITORY);',
      '      rejectDuplicate(await table.findMany(), body);',
      '      const row = toRow(body);',
      '      await table.insert({ record: row });',
      '      return fromRow(row) as unknown as ' + entityName + ';',
      '    },',
    ].join('\n');
  }
  if (name === 'list' && filter && ident(filter)) {
    locals.add(filter);
    return [
      `    async list(filter: ${filter}): Promise<${entityName}[]> {`,
      '      const where: Row = {};',
      '      for (const binding of BINDINGS) {',
      "        if (binding.placement !== 'column') continue;",
      '        const value = readPath(filter as Row, binding.field);',
      '        if (value !== undefined) where[binding.column] = value;',
      '      }',
      '      const table = await runtime.getTable<Row>(REPOSITORY);',
      '      const rows = await table.findMany({ where });',
      `      return rows.map(row => fromRow(row) as unknown as ${entityName});`,
      '    },',
    ].join('\n');
  }
  if (name === 'get' && params.length === 1 && params[0] === 'id') {
    return [
      `    async get(id: string): Promise<${entityName}> {`,
      '      const table = await runtime.getTable<Row>(REPOSITORY);',
      '      const column = columnOf(PRIMARY_KEY[0]);',
      '      const stored = await table.findOne({ where: { [column]: id } });',
      "      if (!stored) throw new AppError('NOT_FOUND', 'Record not found.', 404);",
      '      return fromRow(stored) as unknown as ' + entityName + ';',
      '    },',
    ].join('\n');
  }
  if (name === 'delete' && params.length === 1 && params[0] === 'id') {
    return [
      '    async delete(id: string): Promise<void> {',
      '      const table = await runtime.getTable<Row>(REPOSITORY);',
      '      const column = columnOf(PRIMARY_KEY[0]);',
      '      await table.delete({ where: { [column]: id } });',
      '    },',
    ].join('\n');
  }
  if (entityParam) {
    const extra = params.filter(param => param !== entityName);
    const args = [`record: ${entityName}`, ...extra.map((param, index) => ident(param) ? `${camel(param)}: string` : `arg${index}: string`)];
    const voids = extra.map((param, index) => `void ${ident(param) ? camel(param) : `arg${index}`};`).join(' ');
    return [
      `    async ${name}(${args.join(', ')}): Promise<${entityName}> {`,
      `      ${voids}`,
      '      const table = await runtime.getTable<Row>(REPOSITORY);',
      '      const where: Row = {};',
      '      for (const field of PRIMARY_KEY) where[columnOf(field)] = readPath(record as unknown as Row, field);',
      '      const stored = await table.findOne({ where });',
      "      if (!stored) throw new AppError('NOT_FOUND', 'Record not found.', 404);",
      '      const current = VERSION_FIELD ? readPath(fromRow(stored), VERSION_FIELD) : undefined;',
      '      const body = withVersion(record as unknown as Row, current);',
      '      rejectDuplicate(await table.findMany(), body);',
      '      const row = toRow(body);',
      '      await table.update({ where, patch: row });',
      '      return fromRow(row) as unknown as ' + entityName + ';',
      '    },',
    ].join('\n');
  }
  return null;
}

function helperSource(): string {
  return [
    'function readPath(record: Row, path: string): unknown {',
    '  let node: unknown = record;',
    '  for (const part of path.split(\'.\').filter(Boolean)) {',
    '    if (!node || typeof node !== \'object\') return undefined;',
    '    node = (node as Row)[part];',
    '  }',
    '  return node;',
    '}',
    '',
    'function writePath(record: Row, path: string, value: unknown): void {',
    '  if (value === undefined) return;',
    '  const parts = path.split(\'.\').filter(Boolean);',
    '  let node = record;',
    '  parts.forEach((part, index) => {',
    '    if (index === parts.length - 1) {',
    '      node[part] = value;',
    '      return;',
    '    }',
    '    const next = node[part];',
    '    if (!next || typeof next !== \'object\' || Array.isArray(next)) node[part] = {};',
    '    node = node[part] as Row;',
    '  });',
    '}',
    '',
    'function jsonKey(field: string): string {',
    '  const prefix = `${JSON_COLUMN}.`;',
    '  return field.startsWith(prefix) ? field.slice(prefix.length) : field;',
    '}',
    '',
    'function columnOf(field: string): string {',
    '  const binding = BINDINGS.find(item => item.field === field);',
    '  return binding && binding.placement === \'column\' ? binding.column : field;',
    '}',
    '',
    'function toRow(record: Row): Row {',
    '  const row: Row = {};',
    '  const details: Row = {};',
    '  let json = false;',
    '  for (const binding of BINDINGS) {',
    '    const value = readPath(record, binding.field) === undefined && COLLECTIONS.includes(binding.field) ? [] : readPath(record, binding.field);',
    '    if (binding.placement === \'json\') {',
    '      json = true;',
    '      if (value !== undefined) writePath(details, jsonKey(binding.field), value);',
    "    } else if (value !== undefined) row[binding.column] = value === '' && NON_TEXT_COLUMNS.includes(binding.column) ? null : value;",
    '  }',
    '  if (json) row[JSON_COLUMN] = details;',
    '  return row;',
    '}',
    '',
    'function fromRow(row: Row): Row {',
    '  const record: Row = {};',
    '  const details = row[JSON_COLUMN];',
    '  const bag = details && typeof details === \'object\' && !Array.isArray(details) ? details as Row : {};',
    '  for (const binding of BINDINGS) {',
    '    const value = binding.placement === \'json\' ? readPath(bag, jsonKey(binding.field)) : row[binding.column];',
    '    if (value !== undefined) writePath(record, binding.field, value);',
    '  }',
    '  // The shape of the empty is the entity (d1_325): an object it requires comes back even when none of its fields holds a value, an optional object that holds',
    '  // nothing stays absent, and a collection is never absent: its empty is [].',
    '  for (const path of OBJECTS) {',
    '    const parts = path.split(\'.\');',
    '    let node: Row | undefined = record;',
    '    for (const part of parts.slice(0, -1)) {',
    '      const next: unknown = node?.[part];',
    '      node = next && typeof next === \'object\' && !Array.isArray(next) ? next as Row : undefined;',
    '    }',
    '    const last = parts[parts.length - 1];',
    '    if (node && (!node[last] || typeof node[last] !== \'object\' || Array.isArray(node[last]))) node[last] = {};',
    '  }',
    '  for (const path of COLLECTIONS) {',
    '    if (readPath(record, path) === undefined) writePath(record, path, []);',
    '  }',
    '  return record;',
    '}',
    '',
    'function sameIdentity(row: Row, record: Row): boolean {',
    '  return PRIMARY_KEY.every(field => row[columnOf(field)] === readPath(record, field));',
    '}',
    '',
    'function rejectDuplicate(rows: readonly Row[], record: Row): void {',
    '  // enforce:unique',
    '  for (const key of UNIQUE_KEYS) {',
    '    const matches = rows.filter(row => key.every(field => row[columnOf(field)] === readPath(record, field)));',
    '    if (matches.some(row => !sameIdentity(row, record))) throw new AppError(\'CONFLICT\', \'Unique key already stored.\', 409);',
    '  }',
    '  // end:unique',
    '}',
    '',
    'function withVersion(record: Row, current: unknown): Row {',
    '  // enforce:version',
    '  if (!VERSION_FIELD) return record;',
    '  const next: Row = { ...record };',
    '  if (current === undefined) {',
    '    if (readPath(next, VERSION_FIELD) === undefined) writePath(next, VERSION_FIELD, 1);',
    '    return next;',
    '  }',
    '  const incoming = readPath(next, VERSION_FIELD);',
    '  if (incoming === undefined) throw new AppError(\'PRECONDITION_UNDECLARED\', \'Stored version has no incoming version.\', 409);',
    '  if (incoming !== current) throw new AppError(\'CONCURRENCY_CONFLICT\', \'Version does not match the stored row.\', 409);',
    '  writePath(next, VERSION_FIELD, Number(current) + 1);',
    '  return next;',
    '}',
  ].join('\n');
}

export interface WakeRegistration {
  projectId: string;
  moduleId: string;
  processId: string;
  routine: string;
  handler: string;
  specifier: string;
}

/** Adapter rows of a registration this agent already wrote. Null when the file is not that shape. */
export function parseRegistrationRows(source: string): Array<{ portId: string; factory: string; specifier: string }> | null {
  const imports = [...source.matchAll(/import \{ (create[A-Za-z0-9_]+) \} from '([^']+)';/g)];
  const calls = [...source.matchAll(/registerRepository\("([^"]+)", ctx => (create[A-Za-z0-9_]+)\(ctx\)(?:, \{ module: "[^"]+" \})?\);/g)];
  if (!imports.length || imports.length !== calls.length) return null;
  const rows: Array<{ portId: string; factory: string; specifier: string }> = [];
  for (const call of calls) {
    const found = imports.find(item => item[1] === call[2]);
    if (!found) return null;
    rows.push({ portId: call[1], factory: call[2], specifier: found[2] });
  }
  return rows;
}

/** d1_341: the registry of the platform is global by name; the module of the registration (the folder under l1 of the file) makes the name the module's own. */
export function registrationModule(output: string): string {
  const found = /(?:^|\/)l1\/([^/]+)\//u.exec(output);
  if (!found) throw new Error(`registration file without a module under l1: ${output}`);
  return found[1];
}

export function renderRegistration(output: string, rows: readonly { portId: string; factory: string; specifier: string }[], wakes: readonly WakeRegistration[] = []): string {
  const imports = rows.map(row => `import { ${row.factory} } from '${row.specifier}';`);
  const module = JSON.stringify(registrationModule(output));
  const calls = rows.map(row => `  registerRepository(${JSON.stringify(row.portId)}, ctx => ${row.factory}(ctx), { module: ${module} });`);
  const bySpec = new Map<string, string[]>();
  for (const wake of wakes) {
    const names = bySpec.get(wake.specifier) ?? [];
    if (!names.includes(wake.handler)) names.push(wake.handler);
    bySpec.set(wake.specifier, names);
  }
  const wakeImports = [...bySpec].map(([specifier, names]) => `import { ${names.join(', ')} } from '${specifier}';`);
  const wakeCalls = wakes.map(wake => [
    '  registerWorkflowWakeHandler(',
    `    { projectId: ${JSON.stringify(wake.projectId)}, moduleId: ${JSON.stringify(wake.moduleId)}, processId: ${JSON.stringify(wake.processId)}, routine: ${JSON.stringify(wake.routine)} },`,
    `    ${wake.handler},`,
    '  );',
  ].join('\n'));
  return [
    header(output),
    `import { registerRepository } from '${REPOSITORY_REGISTRY}';`,
    ...(wakes.length ? [`import { registerWorkflowWakeHandler } from '${WORKFLOW_ENGINE}';`] : []),
    ...imports,
    ...wakeImports,
    '',
    'export function registerRepositories(): void {',
    ...calls,
    ...wakeCalls,
    '}',
    '',
    'registerRepositories();',
    '',
  ].join('\n');
}

/** Marker of a time value that is relative to the load; `renderSeeds` turns it into the expression the file evaluates when it is imported (d1_314). */
const LOAD_RELATIVE = /"__LOAD_RELATIVE_DAYS_(\d+)__"/gu;

/**
 * d1_314: a `test` row of a table that keeps its rows for `retentionDays` (a series with a time field) carries that time field as `now - N days`, N from the
 * position of the row and under the retention, so the retention does not delete the seed on load. Initial rows, tables without a retention and every other
 * field are left as they are. Table, field and retention come from the table def.
 */
function withLoadRelativeTime<T extends { seedFor: string; purpose: 'initial' | 'test'; rows: unknown }>(dataset: T, moduleDefinitions: readonly M1Definition[]): T {
  if (dataset.purpose !== 'test' || !Array.isArray(dataset.rows)) return dataset;
  const table = moduleDefinitions.find(item => item.artifactType === 'table' && text(item.data.tableId) === dataset.seedFor);
  const field = table ? text(table.data.timeField) : '';
  const retention = table?.data.retentionDays;
  if (!table || table.data.timeSeries !== true || !field || field.includes('.') || typeof retention !== 'number' || !Number.isInteger(retention) || retention < 1) return dataset;
  const rows = dataset.rows.map((row, index) => (isRecord(row) && field in row ? { ...row, [field]: `__LOAD_RELATIVE_DAYS_${index % retention}__` } : row));
  return { ...dataset, rows };
}

function renderSeeds(
  output: string,
  phase: string,
  scenarios: readonly Record<string, unknown>[],
  datasets: readonly Record<string, unknown>[],
  fixture: M1FixturePlan | null,
): string {
  const exports = datasets.map((item, index) => {
    const purpose = text(item.purpose) === 'initial' ? 'initial' : 'test';
    return `export const seedRows${index} = ${JSON.stringify({ seedFor: text(item.seedFor), purpose, rows: item.rows }).replace(LOAD_RELATIVE, (_, days: string) => `new Date(Date.now() - ${days} * 86400000).toISOString()`)} satisfies TableSeedRows;`;
  });
  return [
    header(output),
    `import type { TableSeedRows } from '${CONTRACTS}';`,
    '',
    `export const seedPlan = ${JSON.stringify({ phase, scenarios }, null, 2)} as const;`,
    '',
    ...exports,
    exports.length ? '' : '',
    // Certification fixture plan: read by the memory harness, never by the seed bootstrap.
    ...(fixture ? [`export const certificationFixture = ${JSON.stringify(fixture, null, 2)} as const;`, ''] : []),
    'export function applicableSeeds(mode: string): TableSeedRows[] {',
    "  if (mode !== 'development' && mode !== 'presentation') return [];",
    `  return [${datasets.map((_, index) => `seedRows${index}`).join(', ')}];`,
    '}',
    '',
  ].filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n');
}

function declaredBindings(definition: M1Definition): ColumnBinding[] | EmitFailure {
  const columns = Array.isArray(definition.data.columns) ? definition.data.columns.filter(isRecord) : [];
  if (columns.length === 0) return { code: 'BINDING_EMPTY', detail: `${definition.artifactId} has no column bindings.` };
  const bindings: ColumnBinding[] = [];
  for (const column of columns) {
    const field = text(column.field);
    const name = text(column.column);
    if (!field || !name) return { code: 'BINDING_SHAPE', detail: `${definition.artifactId} has an empty binding.` };
    const placement = name.startsWith(JSON_PREFIX) ? 'json' as const : 'column' as const;
    bindings.push({ field, column: name, nullable: placement === 'json' && field !== 'version', placement });
  }
  return bindings;
}

/** The bindings with each collection of objects bound once, whole, at its path (json), instead of field by field. */
export function collapseCollections(bindings: readonly ColumnBinding[], collections: ReadonlySet<string>): ColumnBinding[] {
  let out = [...bindings];
  for (const path of [...collections].sort((left, right) => left.length - right.length)) {
    const inner = out.filter(binding => binding.field.startsWith(`${path}.`));
    if (inner.length === 0 || inner.some(binding => binding.placement === 'column')) continue;
    const at = out.indexOf(inner[0]);
    out = out.filter(binding => !binding.field.startsWith(`${path}.`) && binding.field !== path);
    out.splice(Math.min(at, out.length), 0, { field: path, column: `${JSON_PREFIX}${path}`, nullable: true, placement: 'json' });
  }
  return out;
}

function bindingDrift(built: readonly ColumnBinding[], declared: readonly ColumnBinding[]): string {
  const wanted = new Map(built.map(binding => [binding.field, binding.column]));
  for (const binding of declared) {
    if (wanted.get(binding.field) !== binding.column) {
      return `Field ${binding.field} is ${binding.column}, not ${wanted.get(binding.field) ?? '(absent)'}.`;
    }
  }
  for (const binding of built) {
    if (!declared.some(item => item.field === binding.field)) return `Field ${binding.field} is missing from the adapter.`;
  }
  return '';
}

async function loadEntity(definition: M1Definition, read: StructureRead): Promise<M1Definition | EmitFailure> {
  const path = definition.dependencies.find(item => item.includes('/entities/'));
  if (!path) return { code: 'ENTITY_UNBOUND', detail: `${definition.artifactId} has no entity dependency.` };
  return readOne(read, path);
}

async function dependencyDefinition(
  definition: M1Definition,
  read: StructureRead,
  artifactType: string,
): Promise<{ path: string; definition: M1Definition } | EmitFailure> {
  for (const path of definition.dependencies) {
    const loaded = await readOne(read, path);
    if ('code' in loaded) return loaded;
    if (loaded.artifactType === artifactType) return { path, definition: loaded };
  }
  return { code: 'DEPENDENCY_UNBOUND', detail: `${definition.artifactId} has no ${artifactType} dependency.` };
}

async function readOne(read: StructureRead, path: string): Promise<M1Definition | EmitFailure> {
  const textBody = await read(path);
  if (textBody === null) return { code: 'DEPENDENCY_UNREAD', detail: `${path} could not be read.` };
  const parsed = parseDefinitionSource(textBody);
  if (!('definition' in parsed)) return { code: 'DEFINITION', detail: parsed.issues.join(' ') };
  const definition = readDefinition(parsed.definition);
  if ('issues' in definition) return { code: 'DEFINITION', detail: definition.issues.join(' ') };
  const pending = pendingOf(definition.data);
  if (pending && definition.artifactType !== 'domainEntity') {
    return { code: pending, detail: `${definition.artifactId} is pending ${pending}.` };
  }
  return definition;
}

function leavesOf(entity: M1Definition): Leaf[] {
  const fields = Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  const names = fields.map(field => text(field.name)).filter(Boolean);
  return fields.flatMap(field => {
    const name = text(field.name);
    if (!name || !ident(name.split('.').pop() ?? '')) return [];
    if (names.some(other => other.startsWith(`${name}.`))) return [];
    return [{
      name,
      type: text(field.type) || 'string',
      derived: field.derived === true,
      platform: field.platform === true || field.storage === 'platform',
      indexed: field.indexed === true,
    }];
  });
}

function isFailure(value: unknown): value is EmitFailure {
  return !!value && typeof value === 'object' && !Array.isArray(value) && 'code' in value;
}

function normalizeIndexes(value: unknown, physical: string): Array<{ name: string; columns: string[]; unique?: boolean }> | EmitFailure {
  if (!Array.isArray(value)) return [];
  const indexes: Array<{ name: string; columns: string[]; unique?: boolean }> = [];
  for (const item of value) {
    if (!isRecord(item)) return { code: 'INDEX_SHAPE', detail: `${physical} has an index that is not an object.` };
    const name = text(item.name);
    const columns = stringList(item.columns);
    if (!ident(name) || columns.length === 0 || columns.some(column => !ident(column) || column.includes('.'))) {
      return { code: 'INDEX_SHAPE', detail: `${physical} index ${name || '(missing)'} is not a column list.` };
    }
    indexes.push({ name, columns, ...(item.unique === true ? { unique: true } : {}) });
  }
  return indexes;
}

function normalizeKeys(value: unknown): string[][] | null {
  if (!Array.isArray(value)) return null;
  const keys: string[][] = [];
  for (const item of value) {
    const fields = Array.isArray(item) ? item.filter((field): field is string => typeof field === 'string' && ident(field)) : [];
    if (!Array.isArray(item) || fields.length !== item.length || fields.length === 0) return null;
    keys.push(fields);
  }
  return keys;
}

function postgresType(type: string): string {
  if (type === 'integer' || type === 'number') return 'INTEGER';
  if (type === 'boolean') return 'BOOLEAN';
  if (type === 'timestamp') return 'TIMESTAMPTZ';
  if (type === 'object') return 'JSONB';
  return 'TEXT';
}

function pendingOf(data: Record<string, unknown>): string {
  if (typeof data.pending === 'string' && data.pending) return data.pending;
  for (const value of Object.values(data)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (isRecord(item) && typeof item.pending === 'string' && item.pending) return item.pending;
    }
  }
  return '';
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function ident(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function camel(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function header(output: string): string {
  return `/// <mls fileReference="${output}" enhancement="_blank"/>`;
}
