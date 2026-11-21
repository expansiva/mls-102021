/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/codeTokens.ts" enhancement="_blank"/>

// d1_258: the one reader of generated code for the gates of this agent. A scanner that walks characters and jumps at `//` takes a regex
// like `/\//g` for a comment, loses the closing `)` and refuses a right file (the adapter of the repoHost, l4_p4_139). This one knows what
// the TypeScript scanner knows: strings, template literals with `${}` (nested), comments and regex literals, the last decided by the token
// before the `/`. The TypeScript parser is not at hand where the agent runs (the Studio compile answers diagnostics, not a tree; on the
// collabmsg host it is absent), so the reader is this file. It is proved against the TypeScript parser in `codeTokens.test.ts`.

export type CodeSpanKind = 'comment' | 'string' | 'template' | 'regex';

export interface CodeSpan {
  kind: CodeSpanKind;
  start: number;
  end: number;
}

/** Words after which a `/` starts a regex literal (the value they work on comes after them). */
const BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

function isWordStart(char: string): boolean {
  return /[A-Za-z_$]/u.test(char);
}

function isWordPart(char: string): boolean {
  return /[\w$]/u.test(char);
}

/** The end (exclusive) of the regex literal that starts at `from` (a `/`), or -1 when the line does not hold one. */
function regexEnd(code: string, from: number): number {
  let inClass = false;
  for (let at = from + 1; at < code.length; at += 1) {
    const char = code[at];
    if (char === '\n' || char === '\r') return -1;
    if (char === '\\') { at += 1; continue; }
    if (inClass) { if (char === ']') inClass = false; continue; }
    if (char === '[') inClass = true;
    else if (char === '/') {
      let end = at + 1;
      while (end < code.length && isWordPart(code[end])) end += 1;
      return end;
    }
  }
  return -1;
}

/** The end (exclusive) of the quoted string that starts at `from`; an unterminated one stops at the end of the line. */
function stringEnd(code: string, from: number): number {
  const quote = code[from];
  for (let at = from + 1; at < code.length; at += 1) {
    const char = code[at];
    if (char === '\\') { at += 1; continue; }
    if (char === quote) return at + 1;
    if (char === '\n') return at;
  }
  return code.length;
}

/**
 * The parts of `code` that are not code: comments, strings, template text, regex literals. Sorted, never overlapping. The `${ ... }` of
 * a template is code and is not in a span; the text around it is.
 */
export function scanCode(code: string): CodeSpan[] {
  const spans: CodeSpan[] = [];
  /** Brace depth at which each open `${` of a template will close. */
  const templates: number[] = [];
  let depth = 0;
  /** Whether a `/` here starts a regex literal: true at the start and after an operator or a word that takes a value. */
  let regexOk = true;

  /** Reads template text from `from` (just after the backtick or the closing `}` of a `${`); returns where code resumes. */
  const template = (from: number, spanStart: number): number => {
    for (let at = from; at < code.length; at += 1) {
      const char = code[at];
      if (char === '\\') { at += 1; continue; }
      if (char === '`') { spans.push({ kind: 'template', start: spanStart, end: at + 1 }); regexOk = false; return at + 1; }
      if (char === '$' && code[at + 1] === '{') {
        spans.push({ kind: 'template', start: spanStart, end: at + 2 });
        templates.push(depth);
        depth += 1;
        regexOk = true;
        return at + 2;
      }
    }
    spans.push({ kind: 'template', start: spanStart, end: code.length });
    return code.length;
  };

  let at = 0;
  while (at < code.length) {
    const char = code[at];
    const next = code[at + 1];
    if (char === '/' && next === '/') {
      const end = code.indexOf('\n', at);
      const stop = end < 0 ? code.length : end;
      spans.push({ kind: 'comment', start: at, end: stop });
      at = stop;
      continue;
    }
    if (char === '/' && next === '*') {
      const close = code.indexOf('*/', at + 2);
      const stop = close < 0 ? code.length : close + 2;
      spans.push({ kind: 'comment', start: at, end: stop });
      at = stop;
      continue;
    }
    if (char === '"' || char === "'") {
      const end = stringEnd(code, at);
      spans.push({ kind: 'string', start: at, end });
      regexOk = false;
      at = end;
      continue;
    }
    if (char === '`') { at = template(at + 1, at); continue; }
    if (char === '/') {
      const end = regexOk ? regexEnd(code, at) : -1;
      if (end > 0) { spans.push({ kind: 'regex', start: at, end }); regexOk = false; at = end; continue; }
      regexOk = true;
      at += 1;
      continue;
    }
    if (isWordStart(char)) {
      let end = at + 1;
      while (end < code.length && isWordPart(code[end])) end += 1;
      regexOk = BEFORE_REGEX.has(code.slice(at, end));
      at = end;
      continue;
    }
    if (/[0-9]/u.test(char)) {
      let end = at + 1;
      while (end < code.length && /[\w.]/u.test(code[end])) end += 1;
      regexOk = false;
      at = end;
      continue;
    }
    if (char === '{') { depth += 1; regexOk = true; at += 1; continue; }
    if (char === '}') {
      depth -= 1;
      if (templates.length && templates[templates.length - 1] === depth) { templates.pop(); at = template(at + 1, at); continue; }
      regexOk = false;
      at += 1;
      continue;
    }
    if (char === ')' || char === ']') { regexOk = false; at += 1; continue; }
    if (!/\s/u.test(char)) regexOk = true;
    at += 1;
  }
  return spans;
}

/** `code` with the given kinds of span blanked: same length, line breaks kept, so an index in the result is an index in `code`. */
export function maskCode(code: string, kinds: ReadonlyArray<CodeSpanKind>): string {
  let out = '';
  let last = 0;
  for (const span of scanCode(code)) {
    if (!kinds.includes(span.kind)) continue;
    out += code.slice(last, span.start) + code.slice(span.start, span.end).replace(/[^\n\r]/gu, ' ');
    last = span.end;
  }
  return out + code.slice(last);
}

/** Code with its comments blanked (strings, templates and regex literals stay): a word in a comment is not a call. */
export function withoutComments(code: string): string {
  return maskCode(code, ['comment']);
}

/** Code with everything but the code itself blanked: what is left is the structure (braces, parentheses, commas, words). */
export function codeOnly(code: string): string {
  return maskCode(code, ['comment', 'string', 'template', 'regex']);
}
