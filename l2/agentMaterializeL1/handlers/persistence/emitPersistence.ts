/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/persistence/emitPersistence.ts" enhancement="_blank"/>

/**
 * Persistence recipes. Column placement follows the table def and the entity
 * leaves. A derived or platform storage target does not become a local table.
 * The migration plan is an additive diff of the schema snapshot shape. A
 * destructive step is a block, never a DROP. The plan is not an applied migration.
 */

import {
  isRecord,
  outputPathFromDefPath,
  parseDefinitionSource,
  readDefinition,
  type M1Definition,
  type M1Verification,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';
import { auditImports, importSpecifier, type EmitFailure, type StructureRead } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const CONTRACTS = '/_102034_/l1/server/layer_1_external/persistence/contracts.js';
const DATA_RUNTIME = '/_102034_/l1/server/layer_1_external/data/moduleDataRuntime.js';
const APP_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';
const REPOSITORY_REGISTRY = '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
const JSON_COLUMN = 'details';
const JSON_PREFIX = 'json:';
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

export async function emitPersistence(
  id: string,
  definition: M1Definition,
  output: string,
  read: StructureRead,
): Promise<PersistenceEmit | EmitFailure> {
  if (id === 'persistence.table') return emitTable(definition, output, read);
  if (id === 'persistence.repositoryAdapter') return emitAdapter(definition, output, read);
  if (id === 'persistence.repositoryRegistration') return emitRegistration(definition, output, read);
  if (id === 'persistence.persistenceSeeds') return emitSeeds(definition, output);
  if (id === 'persistence.integrationOutbound') return emitOutbound(definition);
  return { code: 'NO_NAMED_HANDLER', detail: `${id} is not a persistence body.` };
}

async function emitTable(definition: M1Definition, output: string, read: StructureRead): Promise<PersistenceEmit | EmitFailure> {
  const pending = pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No table was written.` };
  const entity = await loadEntity(definition, read);
  if ('code' in entity) return entity;
  const built = buildLocalTable(definition, entity);
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

async function emitAdapter(definition: M1Definition, output: string, read: StructureRead): Promise<PersistenceEmit | EmitFailure> {
  const pending = pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No adapter was written.` };
  const table = await dependencyDefinition(definition, read, 'table');
  if ('code' in table) return table;
  const port = await dependencyDefinition(definition, read, 'repositoryPort');
  if ('code' in port) return port;
  const entity = await loadEntity(table.definition, read);
  if ('code' in entity) return entity;
  const built = buildLocalTable(table.definition, entity);
  if ('code' in built) return built;
  const declared = declaredBindings(definition);
  if ('code' in declared) return declared;
  const drift = bindingDrift(built.bindings, declared);
  if (drift) return { code: 'DIVERGENT_BINDING', detail: drift };
  const uniqueKeys = normalizeKeys(table.definition.data.uniqueKeys) ?? [];
  const source = renderAdapter(output, port.path, port.definition, built, uniqueKeys);
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

function emitSeeds(definition: M1Definition, output: string): PersistenceEmit | EmitFailure {
  const pending = pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No seed file was written.` };
  const scenarios = Array.isArray(definition.data.scenarios) ? definition.data.scenarios.filter(isRecord) : [];
  const targets = [...new Set(scenarios.map(item => text(item.tableId)).filter(Boolean))];
  const datasets = Array.isArray(definition.data.datasets) ? definition.data.datasets.filter(isRecord) : [];
  const rows = datasets.filter(item => targets.includes(text(item.seedFor)) && Array.isArray(item.rows));
  const source = renderSeeds(output, text(definition.data.phase) || 'plan', scenarios, rows);
  const bad = auditImports(source, [CONTRACTS]);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  return { source, imports: [CONTRACTS], runsStub: false, seeds: rows.length > 0, evidences: [] };
}

function emitOutbound(definition: M1Definition): EmitFailure {
  const events = Array.isArray(definition.data.events) ? definition.data.events.filter(isRecord) : [];
  const pending = events.map(event => text(event.pending)).find(Boolean) || pendingOf(definition.data);
  if (pending) return { code: pending, detail: `${definition.artifactId} is pending ${pending}. No publisher was written.` };
  const unbound = events.filter(event => !text(event.mechanism)).map(event => text(event.eventId) || '(unnamed)');
  if (unbound.length > 0) {
    return { code: 'MECHANISM_UNBOUND', detail: `${unbound.join(', ')} have no mechanism. No publisher was written.` };
  }
  const named = events.map(event => `${text(event.eventId) || '(unnamed)'}:${text(event.mechanism)}`);
  return { code: 'MECHANISM_INCOMPATIBLE', detail: `${named.join(', ')} is not a binding. No publisher was written.` };
}

export function buildLocalTable(definition: M1Definition, entity: M1Definition): BuiltTable | EmitFailure {
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
  const leaves = leavesOf(entity);
  const columnPaths = new Set<string>(primaryKey);
  for (const key of uniqueKeys) for (const field of key) columnPaths.add(field);
  for (const index of indexes) for (const field of index.columns) columnPaths.add(field);
  for (const leaf of leaves) {
    if (leaf.indexed && !leaf.name.includes('.')) columnPaths.add(leaf.name);
  }
  for (const field of columnPaths) {
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
      nullable: placement === 'column' ? !primaryKey.includes(leaf.name) && !uniqueKeys.some(key => key.includes(leaf.name)) : leaf.name !== 'version',
      placement,
    });
  }
  const columns: TableDefinition['columns'] = [];
  for (const binding of bindings) {
    if (binding.placement !== 'column') continue;
    const leaf = leaves.find(item => item.name === binding.field);
    columns.push({
      name: binding.column,
      postgresType: postgresType(leaf?.type || 'string'),
      ...(binding.nullable ? { nullable: true } : {}),
    });
  }
  if (bindings.some(binding => binding.placement === 'json')) {
    columns.push({ name: JSON_COLUMN, postgresType: 'JSONB', defaultSql: `'{}'::jsonb` });
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

function renderAdapter(
  output: string,
  portPath: string,
  port: M1Definition,
  built: BuiltTable,
  uniqueKeys: readonly (readonly string[])[],
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
    `const UNIQUE_KEYS = ${JSON.stringify(uniqueKeys)} as const;`,
    `const BINDINGS = ${JSON.stringify(built.bindings.map(binding => ({ field: binding.field, column: binding.column, placement: binding.placement })))} as const;`,
    `const JSON_COLUMN = ${JSON.stringify(JSON_COLUMN)};`,
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
    '    const value = readPath(record, binding.field);',
    '    if (binding.placement === \'json\') {',
    '      json = true;',
    '      if (value !== undefined) writePath(details, jsonKey(binding.field), value);',
    '    } else if (value !== undefined) row[binding.column] = value;',
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

function renderRegistration(output: string, rows: readonly { portId: string; factory: string; specifier: string }[]): string {
  const imports = rows.map(row => `import { ${row.factory} } from '${row.specifier}';`);
  const calls = rows.map(row => `  registerRepository(${JSON.stringify(row.portId)}, ctx => ${row.factory}(ctx));`);
  return [
    header(output),
    `import { registerRepository } from '${REPOSITORY_REGISTRY}';`,
    ...imports,
    '',
    'export function registerRepositories(): void {',
    ...calls,
    '}',
    '',
    'registerRepositories();',
    '',
  ].join('\n');
}

function renderSeeds(
  output: string,
  phase: string,
  scenarios: readonly Record<string, unknown>[],
  datasets: readonly Record<string, unknown>[],
): string {
  const exports = datasets.map((item, index) => `export const seedRows${index} = ${JSON.stringify({ seedFor: text(item.seedFor), rows: item.rows })} satisfies TableSeedRows;`);
  return [
    header(output),
    `import type { TableSeedRows } from '${CONTRACTS}';`,
    '',
    `export const seedPlan = ${JSON.stringify({ phase, scenarios }, null, 2)} as const;`,
    '',
    ...exports,
    exports.length ? '' : '',
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
