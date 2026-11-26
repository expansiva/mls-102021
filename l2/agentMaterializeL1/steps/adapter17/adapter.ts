/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/adapter.ts" enhancement="_blank"/>

// d1_209: the adapter of a system outside the app (`l1/<module>/layer_1_external/connections/<systemId>Adapter.ts`): one function per
// `call` operation of the declaration, which builds the request and sends it only through `ctx.send`. The gate is the validator of the
// runtime, the exits the file never uses, and the compile. It names no service.

import { validateExternalSystemAdapter, type ExternalSystemDeclaration } from '/_102034_/l2/shared/contracts/connections/externalSystem.js';
import { DECLARATION_TYPES_IMPORT } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import { codeOnly, withoutComments } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';
import { failureMemberProblems, failureMembersOf } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/failureMember.js';
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

export { withoutComments };

/**
 * The names of the top-level members of the default-exported object: what the adapter implements. Read on the structure of the file
 * (comments, strings, templates and regex literals blanked, d1_258), so a `)` or a `}` inside a regex or a string moves no depth.
 */
export function adapterKeys(code: string): string[] | null {
  return adapterMembers(code)?.map(member => member.name) ?? null;
}

/** The members of the default-exported object with their text (d1_319: the gate reads the body of one operation). */
export function adapterMembers(code: string): Array<{ name: string; text: string }> | null {
  const text = withoutComments(code);
  const start = defaultObjectStart(text);
  if (start < 0) return null;
  const structure = codeOnly(code);
  const keys: Array<{ name: string; text: string }> = [];
  let depth = 0;
  let from = start + 1;
  const take = (to: number) => {
    const match = /^\s*(?:async\s+)?(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*(?::|\()/u.exec(text.slice(from, to));
    const name = match ? match[1] ?? match[2] ?? match[3] : '';
    if (name) keys.push({ name, text: text.slice(from, to) });
  };
  for (let at = start + 1; at < structure.length; at += 1) {
    const char = structure[at];
    if (char === '{' || char === '(' || char === '[') depth += 1;
    else if (char === '}' || char === ')' || char === ']') {
      if (depth === 0 && char === '}') { take(at); return keys; }
      depth -= 1;
    } else if (depth === 0 && char === ',') { take(at); from = at + 1; }
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
  problems.push(...emptySettingInvalid(clean));
  const members = adapterMembers(code);
  const keys = members?.map(member => member.name) ?? null;
  if (keys === null || members === null) return [...problems, 'The file must default-export the adapter object: `const adapter: ExternalSystemAdapter = { ... }; export default adapter;`.'];
  for (const found of validateExternalSystemAdapter(declaration, Object.fromEntries(keys.map(key => [key, () => undefined])))) problems.push(`Adapter: ${found.message}.`);
  problems.push(...failureMemberProblems(members, failureMembersOf(declarationSource)));
  return problems;
}

/** `code: 'invalid'` that answers an empty `ctx.setting`, including one hop through a helper that returns nothing. */
function emptySettingInvalid(clean: string): string[] {
  const helpers = new Set(functionBodies(clean).filter(fn => /code\s*:\s*['"]invalid['"]/u.test(fn.body)).map(fn => fn.name));
  const problems: string[] = [];
  const seen = new Set<string>();
  const report = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    problems.push(`Setting ${id} is empty: return { ok: false, code: 'disabled', message: '${id} is not configured', missing: ['${id}'] }. Do not answer with code 'invalid'.`);
  };
  const sentinels = new Map<string, string>();
  const regions = [...functionBodies(clean), { name: '', body: clean }];
  for (const region of regions) {
    for (const read of settingReads(region.body)) {
      if (settingBranch(region.body, read.name, helpers, 'invalid')) report(read.id);
      if (region.name && settingBranch(region.body, read.name, helpers, 'empty')) sentinels.set(region.name, read.id);
    }
  }
  for (const region of regions) {
    for (const [helper, id] of sentinels) {
      if (helper === region.name) continue;
      const names = assignedFrom(region.body, helper);
      if (names.some(name => settingBranch(region.body, name, helpers, 'invalid'))) report(id);
    }
  }
  return problems;
}

function functionBodies(code: string): Array<{ name: string; body: string }> {
  const found: Array<{ name: string; body: string }> = [];
  const start = /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)[^{]*\{/gu;
  for (const match of code.matchAll(start)) {
    const open = (match.index ?? 0) + match[0].length - 1;
    const close = closeAt(code, open, '{', '}');
    if (close < 0) continue;
    found.push({ name: match[1], body: code.slice(open + 1, close) });
  }
  return found;
}

function settingReads(body: string): Array<{ name: string; id: string }> {
  const found: Array<{ name: string; id: string }> = [];
  for (const match of body.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*ctx\.setting\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/gu)) found.push({ name: match[1], id: match[2] });
  for (const match of body.matchAll(/ctx\.setting\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/gu)) found.push({ name: match[0], id: match[1] });
  return found;
}

function assignedFrom(body: string, helper: string): string[] {
  const names = [helper];
  for (const match of body.matchAll(new RegExp(`(?:const|let)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${helper}\\s*\\(`, 'gu'))) names.push(match[1]);
  return names;
}

function settingBranch(body: string, binding: string, helpers: ReadonlySet<string>, kind: 'invalid' | 'empty'): boolean {
  const escaped = binding.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const testsEmpty = new RegExp(`!\\s*${escaped}(?![\\w$])|${escaped}\\s*===\\s*['"]['"]|${escaped}(?:\\?\\.|\.)trim\\(\\)\\s*===\\s*['"]['"]|!\\s*${escaped}(?:\\?\\.|\.)\\s*trim\\(`, 'u');
  for (let at = 0; at < body.length; at += 1) {
    if (body.slice(at, at + 2) !== 'if' || (at > 0 && /[\w$]/u.test(body[at - 1]))) continue;
    let open = at + 2;
    while (body[open] === ' ' || body[open] === '\n') open += 1;
    if (body[open] !== '(') continue;
    const condEnd = closeAt(body, open, '(', ')');
    if (condEnd < 0) continue;
    if (!testsEmpty.test(body.slice(open + 1, condEnd))) { at = condEnd; continue; }
    let next = condEnd + 1;
    while (body[next] === ' ' || body[next] === '\n') next += 1;
    const end = body[next] === '{' ? closeAt(body, next, '{', '}') : body.indexOf(';', next);
    const consequent = end < 0 ? '' : body.slice(next, end + 1);
    const callsHelper = [...helpers].some(name => new RegExp(`\\b${name}\\s*\\(`, 'u').test(consequent));
    const isInvalid = /code\s*:\s*['"]invalid['"]/u.test(consequent) || callsHelper;
    const isEmpty = /^\s*\{\s*return(?:\s+undefined|\s+['"]['"])?\s*;\s*\}\s*$/u.test(consequent) || /^\s*return(?:\s+undefined|\s+['"]['"])?\s*;\s*$/u.test(consequent);
    if (kind === 'invalid' ? isInvalid : isEmpty) return true;
    at = end < 0 ? condEnd : end;
  }
  return false;
}

function closeAt(code: string, open: number, left: string, right: string): number {
  let depth = 0;
  let quote = '';
  for (let at = open; at < code.length; at += 1) {
    const char = code[at];
    if (quote) {
      if (char === '\\') { at += 1; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === left) depth += 1;
    else if (char === right) { depth -= 1; if (depth === 0) return at; }
  }
  return -1;
}
