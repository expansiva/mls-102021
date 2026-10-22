/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/context.ts" enhancement="_blank"/>

// Rows for a seed table whose l4 entity says the module seed loads it. The def stays without a rows key.

export const SEED_ROWS_TOOL = 'writeSeedRows' as const;

export const SEED_ROWS_TOOL_DESCRIPTION = 'Return the seed rows of one reference table as JSON in code, and an empty notApplicable list';

/** The sentence the unit prompt gives the model until the module prompt carries the real privacy text. */
export const PROVISIONAL_PRIVACY_SENTENCE = 'a provisional privacy text, clearly marked as provisional, until the module prompt gives the text';

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
  uniqueKeys: string[][];
  states: string[];
  stateField: string;
  /** The l4 sentence of what this table brings in every database. Empty when the entity has no `initialData`. */
  initialData: string;
  /** True when the l4 entity declares `initialData`. A role never does. */
  loadedBySeed: boolean;
  provisionalPrivacy: boolean;
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
}): SeedTableUnit | null {
  const ontology = ontologyOf(input.ontologySource);
  if (!ontology || ontology.kind === 'role' || !ontology.initialData) return null;
  const provisionalPrivacy = /privacy text/i.test(`${ontology.description}\n${ontology.createText}`);
  return {
    scenarioId: input.scenarioId,
    tableId: input.tableId,
    moduleName: ontology.moduleName,
    entityId: ontology.entityId,
    description: ontology.description,
    createText: ontology.createText,
    fieldsText: ontology.fieldsText,
    columns: ontology.fields,
    uniqueKeys: ontology.uniqueKeys,
    states: [...input.states],
    stateField: input.stateField,
    initialData: ontology.initialData,
    loadedBySeed: true,
    provisionalPrivacy,
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
    out.push({ scenarioId, tableId, entityId, states });
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
  });
  if (!draft) return null;
  const stateField = stateFieldFor(draft.columns, input.states);
  return stateField ? { ...draft, stateField } : draft;
}

export function seedRowsHuman(unit: SeedTableUnit, repair?: SeedRepair): string {
  const columns = unit.columns.map(column => `${column.name}:${column.type}${column.required ? ' required' : ''}`).join(', ');
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
  if (unit.provisionalPrivacy) lines.push(PROVISIONAL_PRIVACY_SENTENCE);
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

function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsOf);
  if (isRecord(value)) return Object.values(value).flatMap(stringsOf);
  return [];
}

/** Problems of one answer. Empty means the rows can be emitted. */
export function seedRowProblems(unit: SeedTableUnit, rows: readonly Record<string, unknown>[]): string[] {
  const problems: string[] = [];
  rows.forEach((row, index) => {
    problems.push(...recordProblems(unit.columns, row, `row ${index}`));
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
  if (unit.provisionalPrivacy && rows.length > 0 && !rows.some(row => stringsOf(row).some(text => /provisional/i.test(text)))) {
    problems.push('The privacy text is not marked as provisional.');
  }
  return problems;
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

/**
 * One Person in `mdmEntityIndex` and the same person in `mdmDocumentCache`, per l4 actor.
 * No `purpose`: the runtime counts the row as `test`. A module with no actor returns nothing.
 */
export async function actorMdmSeedRows(input: {
  moduleName: string;
  accessSource: string | null;
  roleSource: (personEntity: string) => Promise<string | null>;
}): Promise<{ seedFor: string; rows: Record<string, unknown>[] }[]> {
  const actors = l4ActorsOf(input.accessSource);
  if (!input.moduleName || actors.length === 0) return [];
  const index: Record<string, unknown>[] = [];
  const documents: Record<string, unknown>[] = [];
  for (const actor of actors) {
    const roleTag = actor.personEntity ? roleTagOf(await input.roleSource(actor.personEntity)) : '';
    const tags = [`${input.moduleName}.Person`, input.moduleName, 'actor', actor.actorId];
    if (roleTag && !tags.includes(roleTag)) tags.push(roleTag);
    const mdmId = await stableActorMdmId(input.moduleName, actor.actorId);
    const searchVector = `${actor.name} ${actor.actorId} ${input.moduleName}`.toLowerCase();
    index.push({
      mdmId,
      subtype: 'Person',
      name: actor.name,
      status: 'Active',
      docType: null,
      docId: null,
      countryCode: 'US',
      tags,
      searchVector,
      mergedInto: null,
      dynamoPk: mdmId,
      createdAt: ACTOR_SEED_AT,
      updatedAt: ACTOR_SEED_AT,
    });
    documents.push({
      mdmId,
      version: 1,
      details: {
        mdmId,
        subtype: 'Person',
        name: actor.name,
        status: 'Active',
        docType: null,
        docId: null,
        countryCode: 'US',
        tags,
        aliases: [],
        contacts: [],
        relationshipRefs: {},
        addresses: [],
        mergedInto: null,
        createdAt: ACTOR_SEED_AT,
        updatedAt: ACTOR_SEED_AT,
        actorId: actor.actorId,
      },
    });
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
