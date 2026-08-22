/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbTableIndexes.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic strip/detect of indexes that collide with the implicit Postgres PK index
// (`<table>_pkey`) or repeat the primaryKey columns. The LLM that emits table defs has
// produced both; sanitizing at save time is mechanical (no extra model call).

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string') return entry.trim();
    if (isRecord(entry)) return readString(entry.name);
    return '';
  }).filter(Boolean);
}

export function isRedundantPrimaryKeyIndex(input: {
  tableName: string;
  primaryKey: readonly string[];
  indexName: string;
  indexColumns: readonly string[];
}): boolean {
  if (!input.tableName || !input.indexName) return false;
  if (input.indexName === `${input.tableName}_pkey`) return true;
  return input.primaryKey.length > 0
    && input.indexColumns.length === input.primaryKey.length
    && input.indexColumns.every((column, i) => column === input.primaryKey[i]);
}

function indexNameOf(index: Record<string, unknown>): string {
  return readString(index.indexName) || readString(index.name);
}

/** Strip colliding PK indexes from a planner table item (or a TableDefinition-shaped object) before save. */
export function sanitizePlannerTableItem<T extends Record<string, unknown>>(item: T): T {
  if (!Array.isArray(item.indexes)) return item;
  const tableName = readString(item.tableName);
  const primaryKey = readStringArray(item.primaryKey);
  const kept = item.indexes.filter((index) => {
    if (!isRecord(index)) return false;
    return !isRedundantPrimaryKeyIndex({
      tableName,
      primaryKey,
      indexName: indexNameOf(index),
      indexColumns: readStringArray(index.columns),
    });
  });
  if (kept.length === item.indexes.length) return item;
  return { ...item, indexes: kept };
}

function parseArtifactData(source: string): Record<string, unknown> | undefined {
  const s = source.indexOf('= ');
  const e = source.indexOf(' as const;');
  if (s !== -1 && e > s) {
    try {
      const parsed = JSON.parse(source.slice(s + 2, e));
      if (!isRecord(parsed)) return undefined;
      return isRecord(parsed.data) ? parsed.data : parsed;
    } catch { /* fall through to TableDefinition-shaped source */ }
  }
  return undefined;
}

/** Findings for validate-all: a table defs/ts that still declares a redundant PK index. */
export function collectRedundantPkIndexFindings(source: string, label: string): string[] {
  const data = parseArtifactData(source);
  if (!data) return [];
  const tableName = readString(data.tableName);
  const primaryKey = readStringArray(data.primaryKey);
  if (!tableName || !Array.isArray(data.indexes)) return [];
  const findings: string[] = [];
  for (const index of data.indexes) {
    if (!isRecord(index)) continue;
    const indexName = indexNameOf(index);
    if (!isRedundantPrimaryKeyIndex({
      tableName,
      primaryKey,
      indexName,
      indexColumns: readStringArray(index.columns),
    })) continue;
    findings.push(
      `redundant PK index -> ${label} declares index '${indexName}' that duplicates the implicit Postgres primary-key index; drop it (secondary indexes end in _idx)`,
    );
  }
  return findings;
}
