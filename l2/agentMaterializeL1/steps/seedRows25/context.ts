/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/context.ts" enhancement="_blank"/>

import { mdm } from '/_102034_/l4/ontology/mdm.defs.js';

// Rows for a seed table whose l4 entity says the module seed loads it. The def stays without a rows key.

export const SEED_ROWS_TOOL = 'writeSeedRows' as const;

export const SEED_ROWS_TOOL_DESCRIPTION = 'Return the seed rows of one reference table as JSON in code, and an empty notApplicable list';

export interface SeedColumn {
  name: string;
  type: 'string' | 'integer' | 'boolean' | 'timestamp' | 'uuid' | 'enum' | 'object' | 'unknown';
  required: boolean;
  /** True when the l4 marks the field indexed, so persistence promotes it to a column. */
  indexed: boolean;
  enumValues: string[];
  pattern: string;
  maxLength: number | null;
  fields: SeedColumn[];
}

export interface SeedTableUnit {
  scenarioId: string;
  tableId: string;
  /** L4 `moduleName`. The stable primary key is `<moduleName>.<tableId>:<unique key>`. */
  moduleName: string;
  entityId: string;
  description: string;
  createText: string;
  fieldsText: string;
  columns: SeedColumn[];
  /**
   * Column names of the table the persistence step emits (`buildLocalTable`). The runtime refuses a seed key that is
   * not one of them, so the gate does too; `details` is the only nested key. Null until the caller resolves the table.
   */
  tableColumns: string[] | null;
  uniqueKeys: string[][];
  states: string[];
  stateField: string;
  /** The l4 sentence of what this table brings in every database. Empty when the entity has no `initialData`. */
  initialData: string;
  /** True when the l4 entity declares `initialData`. A role never does. */
  loadedBySeed: boolean;
  /** Seed-plan constraints (`ref:`, `state:`, `uniqueKeys:`). Empty for an initial table. */
  constraints: string[];
}

export interface SeedRepair {
  problems: string[];
  previous: string | null;
}

interface OntologyRead {
  entityId: string;
  kind: string;
  description: string;
  createText: string;
  fieldsText: string;
  fields: SeedColumn[];
  uniqueKeys: string[][];
  initialData: string;
  moduleName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** The object literal of an l4 ontology file (`= { … } as const`). */
export function readOntologyLiteral(source: string): Record<string, unknown> | null {
  const match = /=\s*(\{[\s\S]*\})\s*as const/u.exec(source);
  if (!match) return null;
  try {
    const value: unknown = JSON.parse(match[1]);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function columnType(meta: Record<string, unknown>): SeedColumn['type'] {
  const type = typeof meta.type === 'string' ? meta.type : '';
  if (type === 'string' || type === 'text') return 'string';
  if (type === 'integer') return 'integer';
  if (type === 'boolean') return 'boolean';
  if (type === 'timestamp') return 'timestamp';
  if (type === 'uuid') return 'uuid';
  if (type === 'date') return 'string';
  if (type === 'record') return 'uuid';
  if (type === 'enum') return 'enum';
  if (type === 'object') return 'object';
  return 'unknown';
}

function columnsOf(fields: unknown): SeedColumn[] {
  if (!isRecord(fields)) return [];
  const out: SeedColumn[] = [];
  for (const [name, meta] of Object.entries(fields)) {
    if (!isRecord(meta)) continue;
    const derived = meta.derived === true;
    const enumValues = Array.isArray(meta.values)
      ? meta.values.filter(isRecord).map(item => (typeof item.value === 'string' ? item.value : '')).filter(Boolean)
      : [];
    out.push({
      name,
      type: columnType(meta),
      required: meta.required === true && !derived,
      indexed: meta.indexed === true,
      enumValues,
      pattern: typeof meta.pattern === 'string' ? meta.pattern : '',
      maxLength: typeof meta.maxLength === 'number' ? meta.maxLength : null,
      fields: columnsOf(meta.fields),
    });
  }
  return out;
}

function uniqueKeysOf(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  const keys: string[][] = [];
  for (const key of value) {
    if (!Array.isArray(key) || key.some(field => typeof field !== 'string' || !field)) return [];
    keys.push(key as string[]);
  }
  return keys;
}

function ontologyOf(source: string): OntologyRead | null {
  const literal = readOntologyLiteral(source);
  if (!literal) return null;
  const capabilities = isRecord(literal.capabilities) ? literal.capabilities : {};
  const fields = columnsOf(isRecord(literal.record) ? literal.record.fields : null);
  return {
    entityId: typeof literal.entityId === 'string' ? literal.entityId : '',
    kind: typeof literal.kind === 'string' ? literal.kind : '',
    description: typeof literal.description === 'string' ? literal.description : '',
    createText: typeof capabilities.create === 'string' ? capabilities.create : '',
    fieldsText: JSON.stringify(isRecord(literal.record) ? literal.record.fields ?? {} : {}),
    fields,
    uniqueKeys: uniqueKeysOf(literal.uniqueKeys),
    initialData: typeof literal.initialData === 'string' ? literal.initialData.trim() : '',
    moduleName: typeof literal.moduleName === 'string' ? literal.moduleName : '',
  };
}

/**
 * One table whose l4 entity declares `initialData`. Null for a role, or when the sentence is absent:
 * the caller does not call the model. The description text is not read.
 */
export function referenceSeedUnit(input: {
  scenarioId: string;
  tableId: string;
  ontologySource: string;
  states: readonly string[];
  stateField: string;
  /** Journey and model scenarios have no `initialData`. Initial tables still require it. */
  requireInitial?: boolean;
  constraints?: readonly string[];
}): SeedTableUnit | null {
  const ontology = ontologyOf(input.ontologySource);
  if (!ontology || ontology.kind === 'role') return null;
  if (input.requireInitial !== false && !ontology.initialData) return null;
  return {
    scenarioId: input.scenarioId,
    tableId: input.tableId,
    moduleName: ontology.moduleName,
    entityId: ontology.entityId,
    description: ontology.description,
    createText: ontology.createText,
    fieldsText: ontology.fieldsText,
    columns: ontology.fields,
    tableColumns: null,
    uniqueKeys: ontology.uniqueKeys,
    states: [...input.states],
    stateField: input.stateField,
    initialData: ontology.initialData,
    loadedBySeed: input.requireInitial !== false,
    constraints: [...(input.constraints ?? [])],
  };
}

/** The enum column that holds every state of the scenario, when there is exactly one. */
export function stateFieldFor(columns: readonly SeedColumn[], states: readonly string[]): string {
  if (states.length === 0) return '';
  const matched = columns.filter(column => column.type === 'enum' && states.every(state => column.enumValues.includes(state)));
  return matched.length === 1 ? matched[0].name : '';
}

/** Default l4 ontology path of an entity of this module. */
export function seedOntologyRef(project: number, moduleName: string, entityId: string): string {
  return `_${project}_/l4/${moduleName}/ontology/${entityId}.defs.ts`;
}

export interface SeedScenarioRef {
  scenarioId: string;
  tableId: string;
  entityId: string;
  states: string[];
  stateField: string;
  constraints: string[];
  source: string;
}

/** Scenarios of one persistenceSeeds def. A scenario without a table or an entity is dropped. */
export function seedScenariosOf(data: unknown): SeedScenarioRef[] {
  if (!isRecord(data) || !Array.isArray(data.scenarios)) return [];
  const out: SeedScenarioRef[] = [];
  for (const item of data.scenarios) {
    if (!isRecord(item)) continue;
    const scenarioId = typeof item.scenarioId === 'string' ? item.scenarioId : '';
    const tableId = typeof item.tableId === 'string' ? item.tableId : '';
    const entityId = typeof item.entityId === 'string' ? item.entityId : '';
    if (!scenarioId || !tableId || !entityId) continue;
    const states = Array.isArray(item.states) ? item.states.filter((state): state is string => typeof state === 'string' && state.length > 0) : [];
    const constraints = Array.isArray(item.constraints) ? item.constraints.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0) : [];
    for (const constraint of constraints) {
      if (constraint.startsWith('state:')) {
        const state = constraint.slice('state:'.length);
        if (state && !states.includes(state)) states.push(state);
      }
    }
    out.push({
      scenarioId,
      tableId,
      entityId,
      states,
      stateField: typeof item.stateField === 'string' ? item.stateField : '',
      constraints,
      source: typeof item.source === 'string' ? item.source : '',
    });
  }
  return out;
}

/**
 * One reference-seed table. Null when the l4 entity has no `initialData`:
 * the caller does not call the model.
 */
export function referenceSeedFromScenario(input: SeedScenarioRef & { ontologySource: string | null }): SeedTableUnit | null {
  if (!input.ontologySource) return null;
  const draft = referenceSeedUnit({
    scenarioId: input.scenarioId,
    tableId: input.tableId,
    ontologySource: input.ontologySource,
    states: input.states,
    stateField: '',
    constraints: input.constraints,
  });
  if (!draft) return null;
  const stateField = stateFieldFor(draft.columns, input.states);
  return stateField ? { ...draft, stateField } : draft;
}

export function seedRowsHuman(unit: SeedTableUnit, repair?: SeedRepair): string {
  const shown = (column: SeedColumn) => `${column.name}:${column.type}${column.required ? ' required' : ''}`;
  const columns = unit.tableColumns
    ? unit.tableColumns.map(name => {
      const column = unit.columns.find(item => item.name === name);
      return column ? shown(column) : name;
    }).join(', ')
    : unit.columns.map(shown).join(', ');
  const lines = [
    `Scenario ${unit.scenarioId}, table ${unit.tableId}, entity ${unit.entityId}.`,
    `Description: ${unit.description}`,
    `What the table brings in every database: ${unit.initialData}`,
    `Create: ${unit.createText || '(none)'}`,
    `Fields: ${unit.fieldsText}`,
    `Columns: ${columns || '(none)'}`,
    `Unique keys: ${JSON.stringify(unit.uniqueKeys)}`,
    `States: ${unit.states.length ? unit.states.join(', ') : '(none listed)'}`,
    unit.stateField ? `State field: ${unit.stateField}` : 'State field: (none)',
  ];
  if (repair) {
    lines.push('The previous rows were refused. Fix only these problems:');
    lines.push(...repair.problems.map(problem => `- ${problem}`));
    if (repair.previous) lines.push(`Previous answer:\n${repair.previous}`);
  }
  return lines.join('\n');
}

function valueProblems(column: SeedColumn, value: unknown, path: string): string[] {
  if (value === undefined || value === null || value === '') {
    return column.required ? [`${path} is required.`] : [];
  }
  if (column.type === 'string' || column.type === 'timestamp' || column.type === 'uuid') {
    if (typeof value !== 'string') return [`${path} is not a ${column.type}.`];
    if (column.maxLength !== null && value.length > column.maxLength) return [`${path} is longer than ${column.maxLength}.`];
    if (column.pattern && !new RegExp(column.pattern, 'u').test(value)) return [`${path} does not match ${column.pattern}.`];
    return [];
  }
  if (column.type === 'integer') return Number.isInteger(value) ? [] : [`${path} is not an integer.`];
  if (column.type === 'boolean') return typeof value === 'boolean' ? [] : [`${path} is not a boolean.`];
  if (column.type === 'enum') {
    if (typeof value !== 'string' || !column.enumValues.includes(value)) return [`${path} is not a listed value.`];
    return [];
  }
  if (column.type === 'object') {
    if (!isRecord(value)) return [`${path} is not an object.`];
    return recordProblems(column.fields, value, path);
  }
  return [`${path} has no known type.`];
}

function recordProblems(columns: readonly SeedColumn[], row: Record<string, unknown>, prefix: string): string[] {
  const known = new Map(columns.map(column => [column.name, column]));
  const problems: string[] = [];
  for (const key of Object.keys(row)) {
    const column = known.get(key);
    const path = prefix ? `${prefix}.${key}` : key;
    if (!column) {
      problems.push(`${path} is not a column.`);
      continue;
    }
    problems.push(...valueProblems(column, row[key], path));
  }
  for (const column of columns) {
    if (column.required && !(column.name in row)) problems.push(`${prefix ? `${prefix}.` : ''}${column.name} is required.`);
  }
  return problems;
}

/**
 * Root keys of one row. With the table columns, a key that is not a column is refused with the column list (the
 * runtime refuses it too), and only the l4 fields that are columns are typed and required at the root.
 */
function rootProblems(unit: SeedTableUnit, row: Record<string, unknown>, prefix: string): string[] {
  if (!unit.tableColumns) return recordProblems(unit.columns, row, prefix);
  const table = new Set(unit.tableColumns);
  const problems: string[] = [];
  for (const key of Object.keys(row)) {
    if (!table.has(key)) problems.push(`${prefix}.${key} is not a column of table ${unit.tableId}. Columns: ${unit.tableColumns.join(', ')}.`);
  }
  const columns = unit.columns.filter(column => table.has(column.name));
  const typed = Object.fromEntries(Object.entries(row).filter(([key]) => columns.some(column => column.name === key)));
  return [...problems, ...recordProblems(columns, typed, prefix)];
}

/** Problems of one answer. Empty means the rows can be emitted. */
export function seedRowProblems(unit: SeedTableUnit, rows: readonly Record<string, unknown>[]): string[] {
  const problems: string[] = [];
  rows.forEach((row, index) => {
    problems.push(...rootProblems(unit, row, `row ${index}`));
  });
  if (unit.stateField && unit.states.length > 0) {
    rows.forEach((row, index) => {
      const state = row[unit.stateField];
      if (!unit.states.includes(String(state))) problems.push(`row ${index} state is not in this scenario.`);
    });
  }
  for (const key of unit.uniqueKeys) {
    const seen = new Set<string>();
    rows.forEach((row, index) => {
      const token = JSON.stringify(key.map(field => row[field]));
      if (seen.has(token)) problems.push(`row ${index} repeats unique key ${key.join('+')}.`);
      seen.add(token);
    });
  }
  for (const constraint of unit.constraints) {
    const ref = /^ref:([^:]+):/u.exec(constraint);
    if (!ref) continue;
    rows.forEach((row, index) => {
      const value = row[ref[1]];
      if (value === undefined || value === null || value === '') problems.push(`row ${index} misses constraint ${constraint}.`);
    });
  }
  return problems;
}

function placeholder(column: SeedColumn, token: string, uuidFor: (name: string) => Promise<string>): Promise<unknown> {
  if (column.type === 'string') {
    const text = token || 'seed';
    return Promise.resolve(column.maxLength !== null ? text.slice(0, column.maxLength) : text);
  }
  if (column.type === 'integer') return Promise.resolve(1);
  if (column.type === 'boolean') return Promise.resolve(true);
  if (column.type === 'timestamp') return Promise.resolve('2026-01-01T00:00:00.000Z');
  if (column.type === 'uuid') return uuidFor(token);
  if (column.type === 'enum') return Promise.resolve(column.enumValues[0] ?? '');
  if (column.type === 'object') return objectPlaceholder(column.fields, token, uuidFor);
  return Promise.resolve(undefined);
}

async function objectPlaceholder(fields: readonly SeedColumn[], token: string, uuidFor: (name: string) => Promise<string>): Promise<Record<string, unknown>> {
  const nested: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.required) continue;
    nested[field.name] = await placeholder(field, `${token}.${field.name}`, uuidFor);
  }
  return nested;
}

/**
 * One row for a seed-plan scenario. No `purpose` (the emitter marks it `test`).
 * The primary key is filled later, from the unique key, the same way as an initial row.
 * Returns the gate problems instead of a row that breaks columns, types, the unique key, states, or a ref constraint.
 */
export async function draftScenarioRow(unit: SeedTableUnit): Promise<{ row: Record<string, unknown> } | { problems: string[] }> {
  const row: Record<string, unknown> = {};
  const needed = new Set<string>();
  for (const column of unit.columns) {
    if (column.name === 'id') continue;
    if (column.required) needed.add(column.name);
  }
  for (const key of unit.uniqueKeys) for (const field of key) needed.add(field);
  for (const constraint of unit.constraints) {
    const ref = /^ref:([^:]+):/u.exec(constraint);
    if (ref) needed.add(ref[1]);
  }
  for (const name of needed) {
    const column = unit.columns.find(item => item.name === name);
    if (!column || column.name === 'id') continue;
    // A field that is not a column of the table is not written at the root: the runtime refuses it.
    if (unit.tableColumns && !unit.tableColumns.includes(name)) continue;
    const token = `${unit.moduleName}.${unit.tableId}.${unit.scenarioId}.${name}`;
    row[name] = await placeholder(column, token, name => stableActorMdmId(unit.moduleName, `${unit.scenarioId}:${name}`));
  }
  if (unit.stateField && unit.states.length > 0) {
    const column = unit.columns.find(item => item.name === unit.stateField);
    const state = unit.states.find(item => !column || column.enumValues.length === 0 || column.enumValues.includes(item));
    if (state) row[unit.stateField] = state;
  }
  const problems = seedRowProblems(unit, [row]);
  return problems.length > 0 ? { problems } : { row };
}

/** Fixed clock for actor identity rows. The same actor always gets the same timestamps. */
export const ACTOR_SEED_AT = '2026-07-01T00:00:00.000Z';

export interface L4Actor {
  actorId: string;
  name: string;
  personEntity: string;
}

/** Actors of an l4 access file. An empty list is a module with no actor. */
export function l4ActorsOf(accessSource: string | null): L4Actor[] {
  if (!accessSource) return [];
  const literal = readOntologyLiteral(accessSource);
  if (!literal || !Array.isArray(literal.actors)) return [];
  const actors: L4Actor[] = [];
  for (const item of literal.actors) {
    if (!isRecord(item) || typeof item.actorId !== 'string' || !item.actorId) continue;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    actors.push({
      actorId: item.actorId,
      name: title || item.actorId,
      personEntity: typeof item.personEntity === 'string' ? item.personEntity : '',
    });
  }
  return actors;
}

/** `roleTag` of an l4 role ontology. Empty when the file has none. */
export function roleTagOf(ontologySource: string | null): string {
  if (!ontologySource) return '';
  const literal = readOntologyLiteral(ontologySource);
  return literal && typeof literal.roleTag === 'string' ? literal.roleTag : '';
}

/** UUID derived from `<module>:actor:<actorId>`. Same input, same id. No random. */
export async function stableActorMdmId(moduleName: string, actorId: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${moduleName}:actor:${actorId}`)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface MdmColumn {
  name: string;
  nullable: boolean;
  postgresType: string;
}

/** Columns of one `repositoryName` in a MDM table-definition source. Empty recognition throws. */
export function columnsOfRepository(source: string, repositoryName: string): MdmColumn[] {
  const marker = new RegExp(`repositoryName:\\s*['"]${repositoryName}['"]`).exec(source);
  if (!marker) throw new Error(`mdm table ${repositoryName} was not recognized`);
  const columnsAt = /columns:\s*\[/.exec(source.slice(marker.index));
  if (!columnsAt) throw new Error(`mdm table ${repositoryName} has no columns`);
  const start = marker.index + columnsAt.index + columnsAt[0].length;
  let depth = 1;
  let end = start;
  for (; end < source.length && depth > 0; end++) {
    if (source[end] === '[') depth += 1;
    else if (source[end] === ']') depth -= 1;
  }
  const body = source.slice(start, end - 1);
  const columns: MdmColumn[] = [];
  for (const match of body.matchAll(/\{\s*name:\s*['"]([A-Za-z0-9_]+)['"]([^}]*)\}/g)) {
    const postgresType = /postgresType:\s*['"]([^'"]+)['"]/.exec(match[2]);
    columns.push({
      name: match[1],
      nullable: /nullable:\s*true/.test(match[2]),
      postgresType: postgresType?.[1] ?? '',
    });
  }
  if (columns.length === 0) throw new Error(`mdm table ${repositoryName} has no columns`);
  return columns;
}

function definedColumns(repositoryName: string, source: string | null | undefined): MdmColumn[] {
  if (!source) throw new Error(`mdm table source for ${repositoryName} was not read`);
  return columnsOfRepository(source, repositoryName);
}

/** `Default: …` and `"default"` on MDM field objects. The generator keeps no country literal. */
function fieldDefaults(source: unknown): Map<string, string> {
  const out = new Map<string, string>();
  const seen = new Set<unknown>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const record = value as Record<string, unknown>;
      if (typeof record.constraints === 'string') {
        const found = /Default:\s*(\S+)/.exec(record.constraints);
        if (found) out.set(key, found[1]);
      }
      if (typeof record.default === 'string') out.set(key, record.default);
      visit(value);
    }
  };
  visit(source);
  return out;
}

function defaultsFromOntologyText(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of source.matchAll(/(\w+)\s*:\s*\{([^{}]*)\}/g)) {
    const fromConstraint = /Default:\s*([^'"}\s]+)/.exec(match[2]);
    const fromJson = /["']default["']\s*:\s*["']([^"']+)["']/.exec(match[2]);
    const value = fromConstraint?.[1] ?? fromJson?.[1];
    if (value) out.set(match[1], value);
  }
  return out;
}

interface OntologyField {
  name: string;
  collection: boolean;
  type: string;
  required: boolean;
  values: string[];
  defaultValue: string | null;
}

function fieldsOf(group: unknown): OntologyField[] {
  if (!isRecord(group) || !isRecord(group.fields)) return [];
  const fields: OntologyField[] = [];
  for (const [name, meta] of Object.entries(group.fields)) {
    if (!isRecord(meta)) continue;
    const values = Array.isArray(meta.values) ? meta.values.filter((item): item is string => typeof item === 'string') : [];
    fields.push({
      name,
      collection: meta.collection === true,
      type: typeof meta.type === 'string' ? meta.type : '',
      required: meta.required === true,
      values,
      defaultValue: typeof meta.default === 'string' ? meta.default : null,
    });
  }
  return fields;
}

/**
 * One Person in `mdmEntityIndex` and the same person in `mdmDocumentCache`, per l4 actor.
 * Columns come from the MDM table definition. A field default comes from the MDM ontology.
 * No `purpose`: the runtime counts the row as `test`. A module with no actor returns nothing.
 */
export async function actorMdmSeedRows(input: {
  moduleName: string;
  accessSource: string | null;
  roleSource: (personEntity: string) => Promise<string | null>;
  /** Full table-definition source. Required once the module has actors. */
  tableSource?: string | null;
  /** Ontology source. Required once the module has actors. */
  ontologySource?: string | null;
}): Promise<{ seedFor: string; rows: Record<string, unknown>[] }[]> {
  const actors = l4ActorsOf(input.accessSource);
  if (!input.moduleName || actors.length === 0) return [];
  if (!input.ontologySource) throw new Error('mdm ontology source was not read');
  const indexColumns = definedColumns('mdmEntityIndex', input.tableSource);
  const documentColumns = definedColumns('mdmDocumentCache', input.tableSource);
  const defaults = defaultsFromOntologyText(input.ontologySource);
  for (const [key, value] of fieldDefaults(mdm)) {
    if (!defaults.has(key)) defaults.set(key, value);
  }
  const identification = fieldsOf(mdm.groups.identification);
  const base = fieldsOf(mdm.groups.base);
  const statusValues = identification.find(field => field.name === 'status')?.values ?? [];
  const index: Record<string, unknown>[] = [];
  const documents: Record<string, unknown>[] = [];
  for (const actor of actors) {
    const roleTag = actor.personEntity ? roleTagOf(await input.roleSource(actor.personEntity)) : '';
    const tags = [`${input.moduleName}.Person`, input.moduleName, 'actor', actor.actorId];
    if (roleTag && !tags.includes(roleTag)) tags.push(roleTag);
    const mdmId = await stableActorMdmId(input.moduleName, actor.actorId);
    const searchVector = `${actor.name} ${actor.actorId} ${input.moduleName}`.toLowerCase();
    const known = new Map<string, unknown>([
      ['mdmId', mdmId],
      ['dynamoPk', mdmId],
      ['subtype', 'Person'],
      ['name', actor.name],
      ['tags', tags],
      ['searchVector', searchVector],
      ['status', statusValues[0] ?? null],
      ['createdAt', ACTOR_SEED_AT],
      ['updatedAt', ACTOR_SEED_AT],
      ['version', 1],
      ['actorId', actor.actorId],
    ]);
    const cell = (name: string, nullable: boolean, postgresType: string, field?: OntologyField): unknown => {
      if (known.has(name)) return known.get(name);
      const fallback = field?.defaultValue ?? defaults.get(name);
      if (fallback !== undefined) return fallback;
      if (field?.collection || postgresType.includes('[]')) return [];
      if (field?.type === 'object' || postgresType === 'JSONB') return {};
      if (field?.values.length) return field.values[0];
      if (nullable || field?.required === false || !field) return null;
      return null;
    };
    const details: Record<string, unknown> = {};
    for (const field of [...identification, ...base]) {
      details[field.name] = cell(field.name, !field.required, '', field);
    }
    details.mdmId = mdmId;
    details.actorId = actor.actorId;
    known.set('details', details);
    const rowFor = (columns: MdmColumn[]) => {
      const row: Record<string, unknown> = {};
      for (const column of columns) row[column.name] = cell(column.name, column.nullable, column.postgresType);
      return row;
    };
    index.push(rowFor(indexColumns));
    documents.push(rowFor(documentColumns));
  }
  return [
    { seedFor: 'mdmEntityIndex', rows: index },
    { seedFor: 'mdmDocumentCache', rows: documents },
  ];
}

/** Parse the tool `code` value. Problems are a refusal, not rows. */
export function parseSeedRowsCode(code: string): { rows: Record<string, unknown>[] } | { problems: string[] } {
  let value: unknown;
  try { value = JSON.parse(code); } catch { return { problems: ['The answer is not JSON.'] }; }
  const rows = Array.isArray(value) ? value : isRecord(value) ? value.rows : null;
  if (!Array.isArray(rows)) return { problems: ['The answer has no rows array.'] };
  if (rows.some(row => !isRecord(row))) return { problems: ['A row is not an object.'] };
  return { rows: rows as Record<string, unknown>[] };
}
