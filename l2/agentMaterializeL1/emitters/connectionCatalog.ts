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
  let start = assignment < 0 ? -1 : source.indexOf('{', source.indexOf('=', assignment));
  if (start < 0) start = declarationObjectStart(source);
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

/**
 * The declaration of a system a module generated (d1_208) is not a catalog file: it default-exports the object, directly or by
 * the name of a `const`. Same keys for what the readers need (`operations` with `kind`, `inputType`, `outputType`, `direction`).
 */
function declarationObjectStart(source: string): number {
  const named = /export\s+default\s+([A-Za-z_$][\w$]*)\s*;/u.exec(source);
  if (named) {
    const declaration = new RegExp(`(?:const|let|var)\\s+${named[1]}\\s*(?::\\s*[A-Za-z_$][\\w$.]*)?\\s*=\\s*\\{`, 'u').exec(source);
    return declaration ? declaration.index + declaration[0].length - 1 : -1;
  }
  const direct = /export\s+default\s*\{/u.exec(source);
  return direct ? direct.index + direct[0].length - 1 : -1;
}

/**
 * Where the object body of a type declared in a catalog or a declaration file opens: `export interface <name> { … }` or the alias of an
 * object literal, `export type <name> = { … }` (d1_215: the model writes either). The index of the `{`, or -1.
 */
export function typeObjectOpen(source: string, name: string): number {
  if (!ident(name)) return -1;
  const declared = source.indexOf(`export interface ${name} `);
  if (declared >= 0) return source.indexOf('{', declared);
  const alias = new RegExp(`export\\s+type\\s+${name}\\s*=\\s*\\{`, 'u').exec(source);
  if (!alias) return -1;
  const open = alias.index + alias[0].length - 1;
  // `{ … } | { … }` and `{ … } & Other` start with an object literal and are not one.
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return /^\s*[|&]/u.test(source.slice(index + 1)) ? -1 : open;
    }
  }
  return open;
}

/** True when `<name>` is declared as a type alias whose right side is not an object literal (a union, an intersection, another name). */
export function isNonObjectAlias(source: string, name: string): boolean {
  return ident(name) && typeObjectOpen(source, name) < 0 && new RegExp(`export\\s+type\\s+${name}\\s*=`, 'u').test(source);
}

/**
 * The name of the type of the message a route receives from a module event (d1_217): `<Publisher><Event>Message`. The request service
 * declares and exports it; the controller imports it from there. One rule for the prompt, the gate and the controller.
 */
export function consumeMessageTypeName(mark: string): string {
  const [from = '', eventId = ''] = mark.split('.');
  const pascal = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  return `${pascal(from)}${pascal(eventId)}Message`;
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
      // A declaration has no `reply`: a call answers now (the runtime validator fixes it), a serve has none.
      reply: text(row.reply) || (text(row.direction) === 'call' && !('reply' in row) ? 'now' : ''),
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
  const open = typeObjectOpen(source, typeName);
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

/**
 * d1_276: the type text of the member `field` of the type `typeName` of a catalog file (`version: string;` → `string`), or '' when the type or the member is
 * not there. The version a write answers with is what the catalog types it as; the usecase takes `expectVersion` in that same type.
 */
export function catalogMemberType(source: string, typeName: string, field: string): string {
  if (!ident(typeName) || !ident(field)) return '';
  const open = typeObjectOpen(source, typeName);
  if (open < 0) return '';
  let depth = 0;
  let body = '';
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') { depth -= 1; if (depth === 0) break; }
    body += char;
  }
  return new RegExp(`(?:^|\\n)\\s*"?${field}"?\\??\\s*:\\s*([^;\\n]+);`, 'u').exec(body)?.[1].trim() ?? '';
}

/**
 * The types the catalog gives a member called `version`, in any interface of the file (`version: string;`). d1_277: the version of a connection is one, so an
 * operation whose answer carries none (`activateAgent`) takes the one the rest of the catalog states.
 */
function catalogVersionTypes(source: string): Set<string> {
  const types = new Set<string>();
  for (const match of source.matchAll(/export\s+interface\s+([A-Za-z_$][\w$]*)\b/gu)) {
    const type = catalogMemberType(source, match[1], 'version');
    if (type === 'string' || type === 'number') types.add(type);
  }
  return types;
}

/**
 * The type of `expectVersion` of a usecase that calls `operation` (d1_276, d1_277): the type of the `version` of its answer; else, when the whole catalog
 * types its versions the same way, that type (the version of a connection is one); else `number`.
 */
export function expectVersionType(source: string, outputType: string): 'string' | 'number' {
  const own = catalogMemberType(source, outputType, 'version');
  if (own === 'string' || own === 'number') return own;
  const all = catalogVersionTypes(source);
  return all.size === 1 ? [...all][0] as 'string' | 'number' : 'number';
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
  const open = typeObjectOpen(source, typeName);
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
