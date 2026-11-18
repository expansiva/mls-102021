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

/** Values of a string-literal union: `'a' | 'b'`. Empty when the text is anything else. */
function literalUnion(typeText: string): string[] {
  const parts = typeText.split('|').map(part => part.trim()).filter(Boolean);
  const values: string[] = [];
  for (const part of parts) {
    const match = /^'([^']*)'$|^"([^"]*)"$/u.exec(part);
    if (!match) return [];
    values.push(match[1] ?? match[2]);
  }
  return values;
}

/**
 * The values of the member `field` of the type `typeName` of a catalog file when that member is a union of string literals,
 * written inline or as an alias declared in the same file (`export type <Alias> = 'a' | 'b';`). Empty for any other member.
 */
export function catalogFieldUnion(source: string, typeName: string, field: string): string[] {
  if (!ident(typeName) || !ident(field)) return [];
  const at = source.indexOf(`export interface ${typeName} `);
  const open = at < 0 ? -1 : source.indexOf('{', at);
  if (open < 0) return [];
  let depth = 0;
  let body = '';
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') { depth -= 1; if (depth === 0) break; }
    body += char;
  }
  const member = new RegExp(`(?:^|\\n)\\s*"?${field}"?\\??\\s*:\\s*([^;\\n]+);`, 'u').exec(body);
  if (!member) return [];
  const typeText = member[1].trim();
  const inline = literalUnion(typeText);
  if (inline.length) return inline;
  if (!ident(typeText)) return [];
  const alias = new RegExp(`export\\s+type\\s+${typeText}\\s*=\\s*([^;]+);`, 'u').exec(source);
  return alias ? literalUnion(alias[1]) : [];
}

/** `export interface <name> { … }` of a catalog file, whole (members and their comments). '' when the file does not declare it. */
export function catalogTypeBlock(source: string, typeName: string): string {
  if (!ident(typeName)) return '';
  const at = source.indexOf(`export interface ${typeName} `);
  const open = at < 0 ? -1 : source.indexOf('{', at);
  if (open < 0) return '';
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(at, index + 1);
    }
  }
  return '';
}

/** Top-level comma split: a comma inside `<…>` stays (`Record<string, unknown>`). */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '<') depth += 1;
    if (text[index] === '>') depth -= 1;
    if (text[index] === ',' && depth === 0) { parts.push(text.slice(start, index)); start = index + 1; }
  }
  parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
}

/**
 * Catalog types the input of the exported function of a generated usecase extends: the first parameter type is an
 * interface whose `extends` names a type imported from a module for which `isCatalogSpecifier` holds. Each name once.
 */
export function inputCatalogBases(generated: string, isCatalogSpecifier: (specifier: string) => boolean): Array<{ name: string; specifier: string }> {
  const input = /export\s+(?:async\s+)?function\s+\w+\s*\(\s*\w+\s*:\s*([A-Za-z_$][\w$]*)/u.exec(generated)?.[1];
  if (!input) return [];
  const header = new RegExp(`export\\s+interface\\s+${input}(?:<[^>]*>)?\\s+extends\\s+([^{]+)\\{`, 'u').exec(generated);
  if (!header) return [];
  const imported = new Map<string, string>();
  for (const match of generated.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/gu)) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/u, '').split(/\s+as\s+/u).pop()?.trim() ?? '';
      if (name) imported.set(name, match[2]);
    }
  }
  const out: Array<{ name: string; specifier: string }> = [];
  for (const base of splitTopLevel(header[1])) {
    const specifier = imported.get(base);
    if (specifier && isCatalogSpecifier(specifier) && !out.some(item => item.name === base)) out.push({ name: base, specifier });
  }
  return out;
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
