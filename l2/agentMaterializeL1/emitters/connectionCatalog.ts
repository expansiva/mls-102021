/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.ts" enhancement="_blank"/>

/**
 * The operations of a connection catalog file (`export const <id>: ConnectionCatalog = { ... }`, JSON keys), read without
 * evaluating it. One reader for the gateway emitter, the serve controller and the usecase context.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

function ident(value: string): boolean {
  return IDENTIFIER.test(value);
}

export interface CatalogOperation {
  operationId: string;
  inputType: string;
  outputType: string;
  direction: string;
  kind: string;
  description: string;
  reply: string;
  resultOperation: string;
  noRowLimit: boolean;
  hiddenFromAgents: boolean;
  expectsVersion: boolean;
}

/**
 * The object of `export const <id>: ConnectionCatalog = { ... }` (JSON keys), read without evaluating the file.
 * A copy of the defs reader of agentDefsL1 on purpose: the recipes of this agent are copies, not imports of another agent.
 */
function parseCatalogObject(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*(?:\s*:\s*[A-Za-z_$][\w$.<>, ]*)?\s*=/);
  const start = assignment < 0 ? -1 : source.indexOf('{', source.indexOf('=', assignment));
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function catalogOperations(source: string): CatalogOperation[] | null {
  const parsed = parseCatalogObject(source);
  if (!isRecord(parsed) || !Array.isArray(parsed.operations)) return null;
  const operations: CatalogOperation[] = [];
  for (const row of parsed.operations) {
    if (!isRecord(row) || !ident(text(row.operationId)) || !ident(text(row.inputType)) || !ident(text(row.outputType))) continue;
    operations.push({
      operationId: text(row.operationId),
      inputType: text(row.inputType),
      outputType: text(row.outputType),
      direction: text(row.direction),
      kind: text(row.kind),
      description: text(row.description),
      reply: text(row.reply),
      resultOperation: text(row.resultOperation),
      noRowLimit: row.noRowLimit === true,
      hiddenFromAgents: row.hiddenFromAgents === true,
      expectsVersion: row.expectsVersion === true,
    });
  }
  return operations;
}

export interface CatalogField {
  name: string;
  optional: boolean;
}

/**
 * Top-level members of a type declared in a catalog file: `export interface <name> { … }` (nested objects are one member),
 * or `export type <name> = Record<string, never>` (none). `null` when the file does not declare it that way.
 */
export function catalogTypeFields(source: string, typeName: string): CatalogField[] | null {
  if (!ident(typeName)) return null;
  if (new RegExp(`export\\s+type\\s+${typeName}\\s*=\\s*Record<string,\\s*never>\\s*;`, 'u').test(source)) return [];
  const at = source.indexOf(`export interface ${typeName} `);
  const open = at < 0 ? -1 : source.indexOf('{', at);
  if (open < 0) return null;
  const fields: CatalogField[] = [];
  let depth = 0;
  let line = '';
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
      if (depth === 1) continue;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        pushField(fields, line);
        return fields;
      }
    }
    if (depth === 1 && char === '\n') {
      pushField(fields, line);
      line = '';
      continue;
    }
    if (depth === 1) line += char;
    else if (depth > 1 && line && !line.endsWith('{}')) line += char === '\n' ? ' ' : char;
  }
  return null;
}

function pushField(fields: CatalogField[], line: string): void {
  const match = /^\s*"?([A-Za-z_$][\w$]*)"?(\??)\s*:/u.exec(line);
  if (match) fields.push({ name: match[1], optional: match[2] === '?' });
}
