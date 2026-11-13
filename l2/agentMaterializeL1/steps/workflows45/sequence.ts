/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/sequence.ts" enhancement="_blank"/>

// Pure text of a workflow process file written one function at a time.
// Braces are matched by reading strings, template literals (nested ${}), comments and simple regexes.

export const WORKFLOW_NOT_IMPLEMENTED = 'NOT_IMPLEMENTED';

const IDENT = '[A-Za-z_$][\\w$]*';
const REGEX_AFTER = new Set(['return', 'throw', 'case', 'typeof', 'void', 'delete', 'await', 'yield', 'else', 'do', 'in', 'of', 'instanceof', 'new']);

export function notImplementedStub(name: string): string {
  return `throw new AppError('${WORKFLOW_NOT_IMPLEMENTED}', '${name}');`;
}

/** Exported functions whose body is only {@link notImplementedStub}. */
export function notImplementedFunctions(source: string): string[] {
  const names: string[] = [];
  for (const found of exportedFunctions(source)) {
    const body = source.slice(found.bodyOpen + 1, found.end - 1).trim();
    if (body === notImplementedStub(found.name)) names.push(found.name);
  }
  return names;
}

/**
 * Function order of one process: functions no step names, in `facts.functions` order;
 * then the ones steps name, in step order, once each; then `fixedExports` not already listed.
 * `onTick` arrives in `fixedExports` from the caller. A step names its function with `functionRef`
 * (the L4 link). `WorkflowStepEmit` has no such field; this argument does not invent one there.
 */
export function workflowPhaseOrder(
  facts: { functions: string[]; trigger: { kind: string } },
  steps: readonly { stepId: string; functionRef?: string }[],
  fixedExports: readonly string[],
): string[] {
  const namedByStep: string[] = [];
  const referenced = new Set<string>();
  for (const step of steps) {
    const ref = step.functionRef;
    if (!ref || referenced.has(ref)) continue;
    referenced.add(ref);
    namedByStep.push(ref);
  }
  const declared = new Set(facts.functions);
  const order = [
    ...facts.functions.filter(name => !referenced.has(name)),
    ...namedByStep.filter(name => declared.has(name)),
  ];
  const have = new Set(order);
  for (const name of fixedExports) {
    if (have.has(name)) continue;
    have.add(name);
    order.push(name);
  }
  return order;
}

export function findFunction(source: string, name: string): { start: number; end: number } | null {
  const found = exportedFunctions(source).filter(item => item.name === name);
  if (found.length !== 1) return found.length === 0 ? null : { start: found[0].start, end: found[0].end };
  return { start: found[0].start, end: found[0].end };
}

export function replaceFunction(source: string, name: string, functionText: string): string {
  const found = exportedFunctions(source).filter(item => item.name === name);
  if (found.length === 0) throw new Error(`Function ${name} is not in the file.`);
  if (found.length > 1) throw new Error(`Function ${name} appears ${found.length} times.`);
  const span = found[0];
  return source.slice(0, span.start) + functionText + source.slice(span.end);
}

/** Comment immediately above plus the header, closed as ` { … }` with no body. */
export function functionSignature(source: string, name: string): string {
  const found = oneFunction(source, name);
  const header = source.slice(found.start, found.bodyOpen).replace(/\s+$/u, '');
  return `${header} { … }`;
}

export function signaturesOnly(source: string, names: readonly string[]): string {
  return names.map(name => functionSignature(source, name)).join('\n\n');
}

/** Appends `import ` lines that are not already present, next to the existing imports. */
export function mergeImports(source: string, lines: readonly string[]): string {
  const have = new Set(source.split('\n'));
  const adding: string[] = [];
  for (const line of lines) {
    if (!line.startsWith('import ')) continue;
    if (have.has(line) || adding.includes(line)) continue;
    adding.push(line);
  }
  if (adding.length === 0) return source;
  const srcLines = source.split('\n');
  let lastImport = -1;
  for (let index = 0; index < srcLines.length; index += 1) {
    if (srcLines[index].startsWith('import ')) lastImport = index;
  }
  const at = lastImport === -1 ? (srcLines[0]?.startsWith('///') ? 1 : 0) : lastImport + 1;
  srcLines.splice(at, 0, ...adding);
  return srcLines.join('\n');
}

/** Inserts helpers before the first exported function (after the imports). `''` returns `source`. */
export function addHelpers(source: string, helpers: string): string {
  if (helpers === '') return source;
  const first = exportedFunctions(source)[0];
  const block = helpers.endsWith('\n\n') ? helpers : `${helpers.replace(/\n$/u, '')}\n\n`;
  if (!first) {
    const sep = source.endsWith('\n') ? '\n' : '\n\n';
    return source + sep + block;
  }
  const prefix = source.slice(0, first.start);
  const gap = prefix.endsWith('\n\n') || prefix === '' ? '' : prefix.endsWith('\n') ? '\n' : '\n\n';
  return prefix + gap + block + source.slice(first.start);
}

/** Names in `written` that appear as identifiers in `prose`, in `names` order. */
export function calledFunctions(prose: string, names: readonly string[], written: ReadonlySet<string>): string[] {
  return names.filter(name => written.has(name) && new RegExp(`(?<![\\w$])${name}(?![\\w$])`, 'u').test(prose));
}

interface ExportedFn {
  name: string;
  start: number;
  bodyOpen: number;
  end: number;
}

function oneFunction(source: string, name: string): ExportedFn {
  const found = exportedFunctions(source).filter(item => item.name === name);
  if (found.length === 0) throw new Error(`Function ${name} is not in the file.`);
  if (found.length > 1) throw new Error(`Function ${name} appears ${found.length} times.`);
  return found[0];
}

function exportedFunctions(source: string): ExportedFn[] {
  const out: ExportedFn[] = [];
  const pattern = new RegExp(`export\\s+async\\s+function\\s+(${IDENT})\\s*\\(`, 'gu');
  for (const match of source.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (!isCode(source, at)) continue;
    const name = match[1];
    const parenAt = at + match[0].length - 1;
    const scanned = scanFunction(source, parenAt);
    out.push({ name, start: commentStart(source, at), bodyOpen: scanned.bodyOpen, end: scanned.end });
  }
  return out;
}

/** A `//` comment line. A `///` line is the file header, not the function comment. */
function isSlashComment(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') && !trimmed.startsWith('///');
}

function commentStart(source: string, exportAt: number): number {
  if (exportAt === 0 || source[exportAt - 1] !== '\n') return exportAt;
  const lines = source.slice(0, exportAt - 1).split('\n');
  let index = lines.length - 1;
  if (index < 0 || lines[index].trim() === '') return exportAt;
  if (lines[index].trimEnd().endsWith('*/')) {
    while (index >= 0 && !lines[index].includes('/*')) index -= 1;
    if (index < 0) return exportAt;
  } else if (!isSlashComment(lines[index])) {
    return exportAt;
  }
  while (index > 0 && isSlashComment(lines[index - 1])) index -= 1;
  if (index === 0) return 0;
  return lines.slice(0, index).join('\n').length + 1;
}

function isCode(source: string, index: number): boolean {
  let at = 0;
  let canRegex = true;
  while (at < index) {
    const step = skipCodeToken(source, at, canRegex);
    if (step.next > index) return step.kind === 'code';
    canRegex = step.canRegex;
    at = step.next;
  }
  return true;
}

interface TokenStep { next: number; canRegex: boolean; kind: 'code' | 'skip' }

function skipCodeToken(source: string, at: number, canRegex: boolean): TokenStep {
  const char = source[at];
  if (char === '/' && source[at + 1] === '/') return { next: lineEnd(source, at), canRegex, kind: 'skip' };
  if (char === '/' && source[at + 1] === '*') return { next: blockEnd(source, at), canRegex, kind: 'skip' };
  if (char === '\'' || char === '"') return { next: stringEnd(source, at), canRegex: false, kind: 'skip' };
  if (char === '`') return { next: templateEnd(source, at), canRegex: false, kind: 'skip' };
  if (char === '/' && canRegex && source[at + 1] !== '=') return { next: regexEnd(source, at), canRegex: false, kind: 'skip' };
  const word = readIdent(source, at);
  if (word) return { next: at + word.length, canRegex: REGEX_AFTER.has(word), kind: 'code' };
  return { next: at + 1, canRegex: canRegexAfterChar(char, canRegex), kind: 'code' };
}

function scanFunction(source: string, parenAt: number): { bodyOpen: number; end: number } {
  let at = parenAt;
  let phase: 'params' | 'ret' | 'body' = 'params';
  let paren = 0;
  let brace = 0;
  let angle = 0;
  let canRegex = true;
  let bodyOpen = -1;
  while (at < source.length) {
    const char = source[at];
    if (char === '/' && source[at + 1] === '/') { at = lineEnd(source, at); continue; }
    if (char === '/' && source[at + 1] === '*') { at = blockEnd(source, at); continue; }
    if (char === '\'' || char === '"') { at = stringEnd(source, at); canRegex = false; continue; }
    if (char === '`') { at = templateEnd(source, at); canRegex = false; continue; }
    if (char === '/' && canRegex && source[at + 1] !== '=') { at = regexEnd(source, at); canRegex = false; continue; }
    const word = readIdent(source, at);
    if (word) { canRegex = REGEX_AFTER.has(word); at += word.length; continue; }
    if (phase === 'params') {
      if (char === '(') paren += 1;
      else if (char === ')') {
        paren -= 1;
        if (paren === 0) { phase = 'ret'; canRegex = false; at += 1; continue; }
      }
      canRegex = canRegexAfterChar(char, canRegex);
      at += 1;
      continue;
    }
    if (phase === 'ret') {
      if (char === '<' && source[at + 1] !== '=') { angle += 1; canRegex = true; at += 1; continue; }
      if (char === '>' && source[at + 1] !== '=' && angle > 0) { angle -= 1; canRegex = false; at += 1; continue; }
      if (char === '(') { paren += 1; canRegex = true; at += 1; continue; }
      if (char === ')') { paren -= 1; canRegex = false; at += 1; continue; }
      if (char === '{') {
        if (paren === 0 && angle === 0 && brace === 0) { bodyOpen = at; phase = 'body'; brace = 1; canRegex = true; at += 1; continue; }
        brace += 1;
        canRegex = true;
        at += 1;
        continue;
      }
      if (char === '}') { brace -= 1; canRegex = false; at += 1; continue; }
      canRegex = canRegexAfterChar(char, canRegex);
      at += 1;
      continue;
    }
    if (char === '{') { brace += 1; canRegex = true; at += 1; continue; }
    if (char === '}') {
      brace -= 1;
      at += 1;
      if (brace === 0) return { bodyOpen, end: at };
      canRegex = false;
      continue;
    }
    canRegex = canRegexAfterChar(char, canRegex);
    at += 1;
  }
  throw new Error('Unclosed function body.');
}

function readIdent(source: string, at: number): string | null {
  if (!/[A-Za-z_$]/u.test(source[at] ?? '')) return null;
  let end = at + 1;
  while (end < source.length && /[\w$]/u.test(source[end])) end += 1;
  return source.slice(at, end);
}

function canRegexAfterChar(char: string, canRegex: boolean): boolean {
  if (char === ' ' || char === '\t' || char === '\n' || char === '\r') return canRegex;
  if (/[0-9]/u.test(char)) return false;
  if ('([{,;!=?:~^|&+-*%'.includes(char)) return true;
  return false;
}

function lineEnd(source: string, at: number): number {
  const nl = source.indexOf('\n', at);
  return nl === -1 ? source.length : nl + 1;
}

function blockEnd(source: string, at: number): number {
  const close = source.indexOf('*/', at + 2);
  if (close === -1) throw new Error('Unclosed block comment.');
  return close + 2;
}

function stringEnd(source: string, at: number): number {
  const quote = source[at];
  for (let index = at + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\\') { index += 1; continue; }
    if (char === quote) return index + 1;
  }
  throw new Error('Unclosed string.');
}

function templateEnd(source: string, at: number): number {
  for (let index = at + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\\') { index += 1; continue; }
    if (char === '`') return index + 1;
    if (char === '$' && source[index + 1] === '{') {
      index = interpolationEnd(source, index + 1) - 1;
    }
  }
  throw new Error('Unclosed template literal.');
}

function interpolationEnd(source: string, openBrace: number): number {
  let brace = 0;
  let canRegex = true;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '/' && source[index + 1] === '/') { index = lineEnd(source, index) - 1; continue; }
    if (char === '/' && source[index + 1] === '*') { index = blockEnd(source, index) - 1; continue; }
    if (char === '\'' || char === '"') { index = stringEnd(source, index) - 1; canRegex = false; continue; }
    if (char === '`') { index = templateEnd(source, index) - 1; canRegex = false; continue; }
    if (char === '/' && canRegex && source[index + 1] !== '=') { index = regexEnd(source, index) - 1; canRegex = false; continue; }
    const word = readIdent(source, index);
    if (word) { canRegex = REGEX_AFTER.has(word); index += word.length - 1; continue; }
    if (char === '{') { brace += 1; canRegex = true; continue; }
    if (char === '}') {
      brace -= 1;
      if (brace === 0) return index + 1;
      canRegex = false;
      continue;
    }
    canRegex = canRegexAfterChar(char, canRegex);
  }
  throw new Error('Unclosed template interpolation.');
}

function regexEnd(source: string, at: number): number {
  let inClass = false;
  for (let index = at + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\\') { index += 1; continue; }
    if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (char === '/' && !inClass) {
      let end = index + 1;
      while (end < source.length && /[a-z]/iu.test(source[end])) end += 1;
      return end;
    }
    if (char === '\n') throw new Error('Unclosed regex.');
  }
  throw new Error('Unclosed regex.');
}
