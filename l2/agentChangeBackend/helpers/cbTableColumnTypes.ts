/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbTableColumnTypes.ts" enhancement="_blank"/>

// l4 field type → SQL column type. The gen-table LLM used to pick INTEGER for a field named
// `priority` while the ontology declared string + enum `low|medium|high` (status, the same shape,
// came out TEXT). Seeds and the UI send the enum string; Postgres then rejects the row. Mapping
// and the mismatch finding are mechanical (no extra model call). The writer coerces before save;
// validate-all is the net if another path still stores the defect.

export type ColumnTypeFamily = 'text' | 'uuid' | 'integer' | 'numeric' | 'boolean' | 'timestamptz' | 'jsonb';

export interface L4FieldTypeHint {
  fieldId: string;
  type: string;
}

const TEXT_SQL = new Set(['text', 'varchar', 'char', 'character', 'citext', 'string']);
const UUID_SQL = new Set(['uuid']);
const INTEGER_SQL = new Set(['integer', 'int', 'int2', 'int4', 'int8', 'smallint', 'bigint', 'serial', 'bigserial']);
const NUMERIC_SQL = new Set(['numeric', 'decimal', 'number', 'float', 'float4', 'float8', 'double', 'real', 'money']);
const BOOLEAN_SQL = new Set(['boolean', 'bool']);
const TIME_SQL = new Set(['timestamptz', 'timestamp', 'date', 'time', 'datetime', 'timetz']);
const JSON_SQL = new Set(['jsonb', 'json']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function normalizeSqlType(raw: string): string {
  return raw.trim().toLowerCase().replace(/\[\]$/u, '').split('(')[0].trim();
}

/** Family of an l4 ontology field type. Unknown (entity ids, free strings) → undefined. */
export function l4TypeFamily(l4Type: string): ColumnTypeFamily | undefined {
  const type = normalizeSqlType(l4Type);
  if (type === 'string' || type === 'text') return 'text';
  if (type === 'uuid') return 'uuid';
  if (type === 'integer' || type === 'int') return 'integer';
  if (type === 'number') return 'numeric';
  if (type === 'boolean' || type === 'bool') return 'boolean';
  if (type === 'date' || type === 'datetime') return 'timestamptz';
  if (type === 'json' || type === 'jsonb' || type === 'object' || type === 'array') return 'jsonb';
  return undefined;
}

/** Family of a planner `type` or a materialized `postgresType`. */
export function sqlTypeFamily(sqlType: string): ColumnTypeFamily | undefined {
  const type = normalizeSqlType(sqlType);
  if (TEXT_SQL.has(type)) return 'text';
  if (UUID_SQL.has(type)) return 'uuid';
  if (INTEGER_SQL.has(type)) return 'integer';
  if (NUMERIC_SQL.has(type)) return 'numeric';
  if (BOOLEAN_SQL.has(type)) return 'boolean';
  if (TIME_SQL.has(type)) return 'timestamptz';
  if (JSON_SQL.has(type)) return 'jsonb';
  return undefined;
}

/** Canonical planner/SQL type for a known l4 field type. Empty when the l4 type is not a scalar we own. */
export function columnSqlTypeForL4(l4Type: string): ColumnTypeFamily | '' {
  return l4TypeFamily(l4Type) || '';
}

export function l4FieldTypesFromFields(fields: unknown): L4FieldTypeHint[] {
  if (!Array.isArray(fields)) return [];
  const out: L4FieldTypeHint[] = [];
  for (const item of fields) {
    if (!isRecord(item)) continue;
    const fieldId = readString(item.fieldId);
    const type = readString(item.type);
    if (!fieldId || !type) continue;
    out.push({ fieldId, type });
  }
  return out;
}

function fieldIndex(fields: L4FieldTypeHint[]): Map<string, L4FieldTypeHint> {
  const map = new Map<string, L4FieldTypeHint>();
  for (const field of fields) {
    map.set(field.fieldId, field);
    map.set(toSnake(field.fieldId), field);
    map.set(field.fieldId.toLowerCase(), field);
  }
  return map;
}

function parseArtifactData(source: string): Record<string, unknown> | undefined {
  const s = source.indexOf('= ');
  const e = source.indexOf(' as const;');
  if (s !== -1 && e > s) {
    try {
      const parsed = JSON.parse(source.slice(s + 2, e));
      if (!isRecord(parsed)) return undefined;
      return isRecord(parsed.data) ? parsed.data : parsed;
    } catch { /* fall through */ }
  }
  return undefined;
}

function columnsFromSource(source: string): { name: string; type: string }[] {
  const data = parseArtifactData(source);
  if (data && Array.isArray(data.columns)) {
    return data.columns
      .filter(isRecord)
      .map((column) => ({
        name: readString(column.name),
        type: readString(column.type) || readString(column.postgresType),
      }))
      .filter((column) => column.name && column.type);
  }
  const out: { name: string; type: string }[] = [];
  const re = /name:\s*'([^']+)'[\s\S]{0,180}?postgresType:\s*'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    out.push({ name: match[1], type: match[2] });
  }
  return out;
}

function skipColumn(name: string, sqlType: string): boolean {
  if (!name || name === 'details') return true;
  return sqlTypeFamily(sqlType) === 'jsonb';
}

/** Strip numeric (and other incompatible) column types when the l4 field is not that family. */
export function sanitizePlannerTableColumnTypes<T extends Record<string, unknown>>(
  item: T,
  fields: unknown,
): T {
  if (!Array.isArray(item.columns)) return item;
  const hints = l4FieldTypesFromFields(fields);
  if (!hints.length) return item;
  const byName = fieldIndex(hints);
  let changed = false;
  const columns = item.columns.map((raw) => {
    if (!isRecord(raw)) return raw;
    const name = readString(raw.name);
    const current = readString(raw.type);
    if (skipColumn(name, current)) return raw;
    const field = byName.get(name);
    if (!field) return raw;
    const want = columnSqlTypeForL4(field.type);
    if (!want) return raw;
    const have = sqlTypeFamily(current);
    if (have === want) return raw;
    changed = true;
    return { ...raw, type: want };
  });
  return changed ? { ...item, columns } : item;
}

/** Findings for validate-all: a table defs/ts whose column family contradicts the l4 field. */
export function collectColumnTypeMismatchFindings(
  source: string,
  fields: unknown,
  label: string,
): string[] {
  const hints = l4FieldTypesFromFields(fields);
  if (!hints.length) return [];
  const byName = fieldIndex(hints);
  const findings: string[] = [];
  for (const column of columnsFromSource(source)) {
    if (skipColumn(column.name, column.type)) continue;
    const field = byName.get(column.name);
    if (!field) continue;
    const want = l4TypeFamily(field.type);
    const have = sqlTypeFamily(column.type);
    if (!want || !have || want === have) continue;
    findings.push(
      `column type mismatch -> ${label} column '${column.name}' is ${column.type} but l4 field '${field.fieldId}' is ${field.type}; a ${field.type} value cannot be stored in a ${have} column`,
    );
  }
  return findings;
}
