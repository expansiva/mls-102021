/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/declaration.ts" enhancement="_blank"/>

// d1_208 s2: the declaration of a system outside the app (`l1/<module>/layer_1_external/connections/<systemId>.ts`).
// The code writes what the L4 says (id, title, description, settings with their secret flag, the operations with direction and
// description) and the gate checks the model copied it; the model analyses the rest (hosts, kinds, types, methods, what each call
// uses, how a serve is verified). The gate is the validator of the runtime, the coverage of the L4 and the compile.

import { validateExternalSystemDeclaration } from '/_102034_/l2/shared/contracts/connections/externalSystem.js';

/** What the def `externalConnection` carries: a copy of the L4 system. */
export interface ExternalFacts {
  systemId: string;
  title: string;
  description: string;
  settings: Array<{ id: string; title: string; description: string; secret: boolean }>;
  operations: Array<{ operationId: string; direction: string; description: string }>;
}

export const DECLARATION_SCHEMA = 'external-system-v1' as const;
export { DECLARATION_TYPES_IMPORT, DECLARATION_TYPES_REF } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import { DECLARATION_TYPES_IMPORT } from '/_102021_/l2/helpers/connections/catalogResolve.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function list(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function externalFacts(data: Record<string, unknown>): ExternalFacts {
  return {
    systemId: text(data.systemId),
    title: text(data.title),
    description: text(data.description),
    settings: list(data.settings).map(item => ({ id: text(item.id), title: text(item.title), description: text(item.description), secret: item.secret === true })),
    operations: list(data.operations).map(item => ({ operationId: text(item.operationId), direction: text(item.direction), description: text(item.description) })),
  };
}

/**
 * A system with a `serve` and no secret setting in the L4 (d1_213): every notice that comes in is checked with a secret, so no answer of
 * the model can make this declaration valid. Code says it before the model is called; the L4 must declare the secret. Null when fine.
 */
export function serveWithoutSecret(facts: ExternalFacts): string | null {
  const serves = facts.operations.filter(item => item.direction === 'serve').map(item => item.operationId);
  if (serves.length === 0 || facts.settings.some(item => item.secret)) return null;
  return `System ${facts.systemId}: operation ${serves.join(', ')} is a serve, and the L4 of the system declares no setting with secret: true. Every notice that comes in is checked with a secret (hmac or token), so the L4 must declare the secret of the check.`;
}

/** The part code writes: the whole declaration the model must keep, with the parts it analyses left out. */
export function fixedPart(facts: ExternalFacts): Record<string, unknown> {
  return {
    schemaVersion: DECLARATION_SCHEMA,
    systemId: facts.systemId,
    title: facts.title,
    description: facts.description,
    settings: settingsOf(facts),
    operations: facts.operations.map(item => ({ operationId: item.operationId, direction: item.direction, description: item.description })),
  };
}

/** The settings of the declaration, as code writes them: id, secret flag and the texts of the L4 (d1_211; a text the L4 does not have is left out). */
export function settingsOf(facts: ExternalFacts): Array<Record<string, unknown>> {
  return facts.settings.map(item => ({
    id: item.id,
    ...(item.title ? { title: item.title } : {}),
    ...(item.description ? { description: item.description } : {}),
    secret: item.secret,
  }));
}

/** The lines of `connections[]` of the L4 that name the system: what each operation is used for. Empty when the file is not readable. */
export function connectionLinesOf(integrationSource: string | null, systemId: string): Array<{ operationId: string; direction: string; usedBy: string[]; description: string }> {
  const match = integrationSource ? /=\s*(\{[\s\S]*\})\s*(?:as const)?\s*(?:satisfies[^;]*)?;/u.exec(integrationSource) : null;
  if (!match) return [];
  let root: unknown;
  try { root = JSON.parse(match[1]); } catch { return []; }
  const rows = isRecord(root) ? list(root.connections) : [];
  return rows.filter(row => row.connectionId === systemId).map(row => ({
    operationId: text(row.operationId),
    direction: text(row.direction),
    usedBy: (Array.isArray(row.usedBy) ? row.usedBy : []).filter((item): item is string => typeof item === 'string'),
    description: text(row.description),
  }));
}

/** The type and the validator of the runtime, as the model reads them: the file up to the validator of the adapter. */
export function declarationTypeShown(source: string): string {
  const end = source.indexOf('/**\n * The adapter must have one function');
  return (end < 0 ? source : source.slice(0, end)).trim();
}

/**
 * The object the file default-exports, read as JSON: either `export default { ... }` or `export default name;` with
 * `const name[: Type] = { ... }`. The object is data and is written with JSON syntax so the gate and the platform read the same value.
 */
export function defaultObjectStart(code: string): number {
  const named = /export\s+default\s+([A-Za-z_$][\w$]*)\s*;/u.exec(code);
  if (named) {
    const declaration = new RegExp(`(?:const|let|var)\\s+${named[1]}\\s*(?::\\s*[A-Za-z_$][\\w$.<>]*)?\\s*=\\s*\\{`, 'u').exec(code);
    return declaration ? declaration.index + declaration[0].length - 1 : -1;
  }
  const direct = /export\s+default\s*\{/u.exec(code);
  return direct ? direct.index + direct[0].length - 1 : -1;
}

/** Where the declaration object starts and ends (the closing brace included) in the file; null when it is not a closed object. */
export function declarationRange(code: string): { start: number; end: number } | null {
  const start = defaultObjectStart(code);
  if (start < 0) return null;
  let depth = 0;
  let quote = '';
  for (let at = start; at < code.length; at += 1) {
    const char = code[at];
    if (quote) {
      if (char === '\\') at += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { start, end: at + 1 };
    }
  }
  return null;
}

/**
 * Copies the settings of the L4 into the answer by code: the model analyses the rest of the declaration, and what the L4 already says
 * (id, secret flag, title, description) is never its to retype (d1_211). An answer whose object cannot be read is returned as it came:
 * the gate refuses it with its own message.
 */
export function withFixedSettings(code: string, facts: ExternalFacts): string {
  const range = declarationRange(code);
  const literal = declarationLiteral(code);
  if (!range || 'problem' in literal || !isRecord(literal.value)) return code;
  const value = { ...literal.value, settings: settingsOf(facts) };
  return `${code.slice(0, range.start)}${JSON.stringify(value, null, 2)}${code.slice(range.end)}`;
}

export function declarationLiteral(code: string): { value: unknown } | { problem: string } {
  const start = defaultObjectStart(code);
  if (start < 0) return { problem: 'The file must default-export the declaration object: `export default { ... }` or `const declaration: ExternalSystemDeclaration = { ... }; export default declaration;`.' };
  let depth = 0;
  let quote = '';
  for (let at = start; at < code.length; at += 1) {
    const char = code[at];
    if (quote) {
      if (char === '\\') at += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return { value: JSON.parse(code.slice(start, at + 1)) }; }
        catch { return { problem: 'The declaration object must use JSON syntax: double quotes on every key and string, no trailing comma, no comment inside it.' }; }
      }
    }
  }
  return { problem: 'The declaration object is not closed.' };
}

function exportedNames(code: string): Set<string> {
  const names = new Set<string>();
  for (const match of code.matchAll(/export\s+(?:declare\s+)?(?:interface|type|class|enum)\s+([A-Za-z_$][\w$]*)/gu)) names.add(match[1]);
  return names;
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && [...left].sort().every((item, index) => item === [...right].sort()[index]);
}

/**
 * Problems of an answer, before anything is written. No frame names a service: the checks are the validator of the runtime, the
 * coverage of the L4 (every operation and no more, the same settings, the same texts) and the types the operations name.
 */
export function declarationProblems(code: string, facts: ExternalFacts, header: string): string[] {
  const problems: string[] = [];
  if (code.split('\n')[0].trim() !== header) problems.push(`The file must start with the line ${header}`);
  for (const match of code.matchAll(/^\s*import\b[^;]*?from\s+['"]([^'"]+)['"]/gmu)) {
    if (match[1] !== DECLARATION_TYPES_IMPORT || !/^\s*import\s+type\b/u.test(match[0])) problems.push(`Import "${match[1]}" is not allowed: the file is data, with its own exported types. Only \`import type { ExternalSystemDeclaration } from '${DECLARATION_TYPES_IMPORT}'\` may be imported.`);
  }
  if (/\b(?:fetch|require|import)\s*\(/u.test(code)) problems.push('The file is data and types: it reaches out to nothing (no fetch, require or dynamic import).');
  const literal = declarationLiteral(code);
  if ('problem' in literal) return [...problems, literal.problem];
  const value = literal.value;
  for (const found of validateExternalSystemDeclaration(value)) problems.push(`Declaration: ${found.message}.`);
  if (!isRecord(value)) return problems;
  if (value.systemId !== facts.systemId) problems.push(`systemId must be ${facts.systemId} (the system of the L4).`);
  if (value.title !== facts.title) problems.push('title must be the title of the L4 system, as written.');
  if (value.description !== facts.description) problems.push('description must be the description of the L4 system, as written.');
  const settings = list(value.settings);
  const key = (item: Record<string, unknown>) => `${text(item.id)}:${item.secret === true}:${text(item.title)}:${text(item.description)}`;
  const wanted = settingsOf(facts).map(key);
  const given = settings.map(key);
  if (!sameSet(given, wanted)) problems.push(`settings must be exactly those of the L4, with the same secret flag and the same title and description: ${wanted.join(', ') || '(none)'}. Found: ${given.join(', ') || '(none)'}.`);
  const operations = list(value.operations);
  const operationIds = operations.map(item => text(item.operationId));
  const missing = facts.operations.filter(item => !operationIds.includes(item.operationId));
  const extra = operationIds.filter(id => !facts.operations.some(item => item.operationId === id));
  if (missing.length) problems.push(`Operation ${missing.map(item => item.operationId).join(', ')} of the L4 is not in the declaration.`);
  if (extra.length) problems.push(`Operation ${extra.join(', ')} is not an operation of the L4 system: the declaration has no operation the L4 does not name.`);
  for (const operation of facts.operations) {
    const found = operations.find(item => item.operationId === operation.operationId);
    if (!found) continue;
    if (found.direction !== operation.direction) problems.push(`Operation ${operation.operationId} is a ${operation.direction} in the L4.`);
    if (found.description !== operation.description) problems.push(`Operation ${operation.operationId}: description must be the one of the L4, as written.`);
  }
  for (const operation of operations) {
    if (operation.direction === 'serve' && operation.verify === undefined) problems.push(`Operation ${text(operation.operationId)} of system ${facts.systemId} is a serve and has no verify: every notice is checked (hmac or token) with a secret setting of the L4.`);
  }
  const exported = exportedNames(code);
  for (const operation of operations) {
    for (const key of ['inputType', 'outputType'] as const) {
      const name = text(operation[key]);
      if (name && !exported.has(name)) problems.push(`Operation ${text(operation.operationId)}: ${key} ${name} is not exported in this file.`);
    }
  }
  return problems;
}
