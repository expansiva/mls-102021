/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/adapter.ts" enhancement="_blank"/>

// d1_209: the adapter of a system outside the app (`l1/<module>/layer_1_external/connections/<systemId>Adapter.ts`): one function per
// `call` operation of the declaration, which builds the request and sends it only through `ctx.send`. The gate is the validator of the
// runtime, the exits the file never uses, and the compile. It names no service.

import { validateExternalSystemAdapter, type ExternalSystemDeclaration } from '/_102034_/l2/shared/contracts/connections/externalSystem.js';
import { DECLARATION_TYPES_IMPORT } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import { declarationLiteral, defaultObjectStart } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';

/** The part of the runtime type file the adapter is written against: the request, the response, the context and the adapter. */
export function adapterContractShown(typesSource: string): string {
  const start = typesSource.indexOf('/** What a generated adapter asks the platform to send.');
  const marker = 'export type ExternalSystemAdapter =';
  const at = typesSource.indexOf(marker);
  if (start < 0 || at < 0) return typesSource.trim();
  return typesSource.slice(start, typesSource.indexOf('\n', at)).trim();
}

/** The result type of the runtime, as the adapter returns it. */
export function resultTypeShown(source: string): string {
  const start = source.indexOf('export type ConnectionErrorCode');
  const end = source.indexOf('/** Who the call is about');
  return start < 0 ? '' : source.slice(start, end < 0 ? undefined : end).trim();
}

/** Code with its comments blanked (strings stay): a word in a comment is not a call. */
export function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:\\])\/\/[^\n]*/gu, '$1 ');
}

/** The names of the top-level members of the default-exported object: what the adapter implements. */
export function adapterKeys(code: string): string[] | null {
  const start = defaultObjectStart(code);
  if (start < 0) return null;
  const keys: string[] = [];
  let depth = 0;
  let quote = '';
  let segment = '';
  const take = () => {
    const match = /^\s*(?:async\s+)?(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*(?::|\()/u.exec(segment);
    const name = match ? match[1] ?? match[2] ?? match[3] : '';
    if (name) keys.push(name);
    segment = '';
  };
  for (let at = start + 1; at < code.length; at += 1) {
    const char = code[at];
    if (quote) {
      if (depth === 0) segment += char;
      if (char === '\\') { at += 1; if (depth === 0) segment += code[at] ?? ''; }
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && code[at + 1] === '/') { at = code.indexOf('\n', at); if (at < 0) break; continue; }
    if (char === '/' && code[at + 1] === '*') { const end = code.indexOf('*/', at + 2); if (end < 0) break; at = end + 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; if (depth === 0) segment += char; continue; }
    if (char === '{' || char === '(' || char === '[') { depth += 1; if (depth === 1 && char === '{') { segment += char; continue; } }
    if (char === '}' || char === ')' || char === ']') {
      if (depth === 0 && char === '}') { take(); return keys; }
      depth -= 1;
    }
    if (depth === 0 && char === ',') { take(); continue; }
    if (depth <= 1) segment += char;
  }
  return null;
}

const OUTPUTS: ReadonlyArray<[RegExp, string]> = [
  [/\bfetch\s*\(/u, 'fetch'],
  [/\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bsendBeacon\b/u, 'an HTTP or socket client'],
  [/\bchild_process\b|\bnode:/u, 'child_process or a node: module'],
  [/\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(/u, 'eval or Function'],
  [/\bimport\s*\(/u, 'a dynamic import()'],
  [/\brequire\s*\(/u, 'require()'],
  [/\bprocess\.env\b/u, 'process.env'],
];

/**
 * Problems of an answer, before anything is written: the header, the imports (types only: the runtime type and the declaration of this
 * module), the exits a generated file never has, a secret read, and the validator of the runtime on the adapter.
 */
export function adapterProblems(code: string, declarationSource: string, header: string, declarationImport: string): string[] {
  const problems: string[] = [];
  if (code.split('\n')[0].trim() !== header) problems.push(`The file must start with the line ${header}`);
  const clean = withoutComments(code);
  for (const match of clean.matchAll(/^\s*import\b[^;]*?from\s+['"]([^'"]+)['"]/gmu)) {
    const allowed = match[1] === DECLARATION_TYPES_IMPORT || match[1] === declarationImport;
    if (!allowed || !/^\s*import\s+type\b/u.test(match[0])) problems.push(`Import "${match[1]}" is not allowed: only \`import type\` of the runtime types (${DECLARATION_TYPES_IMPORT}) and of the declaration of this system (${declarationImport}).`);
  }
  for (const [pattern, label] of OUTPUTS) if (pattern.test(clean)) problems.push(`The adapter never uses ${label}: its only way out is \`ctx.send(operationId, request)\`.`);
  const literal = declarationLiteral(declarationSource);
  if ('problem' in literal) return [...problems, `The declaration of this system is not readable: ${literal.problem}`];
  const declaration = literal.value as ExternalSystemDeclaration;
  for (const setting of Array.isArray(declaration.settings) ? declaration.settings : []) {
    if (setting.secret && new RegExp(`\\.setting\\s*\\(\\s*['"\`]${setting.id}['"\`]`, 'u').test(clean)) problems.push(`Setting ${setting.id} is a secret: it is never read, it is cited in the request as {{secret:${setting.id}}}.`);
  }
  const keys = adapterKeys(code);
  if (keys === null) return [...problems, 'The file must default-export the adapter object: `const adapter: ExternalSystemAdapter = { ... }; export default adapter;`.'];
  for (const found of validateExternalSystemAdapter(declaration, Object.fromEntries(keys.map(key => [key, () => undefined])))) problems.push(`Adapter: ${found.message}.`);
  return problems;
}
