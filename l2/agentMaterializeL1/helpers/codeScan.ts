/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/codeScan.ts" enhancement="_blank"/>

// d1_202: a gate that reads generated code by structure, not by the first match of a text. The agent graph does not import
// the TypeScript compiler, so this is a small scanner: it masks comments and string contents (offsets kept) and walks the
// braces. Used to find the value of `export const requests = { … }` and the property of each route.

/** `code` with comments blanked and string/template contents replaced by `_`: same length, quotes and structure kept. */
export function maskCode(code: string): string {
  const out = code.split('');
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    if (code.startsWith('//', index)) {
      while (index < code.length && code[index] !== '\n') { out[index] = ' '; index += 1; }
      continue;
    }
    if (code.startsWith('/*', index)) {
      const end = code.indexOf('*/', index + 2);
      const stop = end < 0 ? code.length : end + 2;
      for (; index < stop; index += 1) if (code[index] !== '\n') out[index] = ' ';
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') {
      index += 1;
      while (index < code.length && code[index] !== char) {
        if (code[index] === '\\') { out[index] = '_'; index += 1; }
        if (index < code.length && code[index] !== '\n') out[index] = '_';
        index += 1;
      }
      index += 1;
      continue;
    }
    index += 1;
  }
  return out.join('');
}

/**
 * The property of each key of the object `export const requests … = { … }` (the value, not the type annotation, which may
 * repeat the keys): key → masked text of the property, from the key to the comma that ends it. Empty when the file has no
 * such object literal.
 */
export function requestsObjectBodies(code: string): Map<string, string> {
  const masked = maskCode(code);
  const out = new Map<string, string>();
  const head = /export\s+const\s+requests\b/u.exec(masked);
  if (!head) return out;
  // The `=` of the declaration: the first one outside brackets that is not `=>`, `==`, `<=`, `>=` or `!=`.
  let depth = 0;
  let at = -1;
  for (let index = head.index + head[0].length; index < masked.length; index += 1) {
    const char = masked[index];
    if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) depth -= 1;
    else if (char === '=' && depth === 0 && masked[index + 1] !== '>' && masked[index + 1] !== '=' && !'<>!='.includes(masked[index - 1] ?? '')) { at = index; break; }
  }
  if (at < 0) return out;
  let start = at + 1;
  while (start < masked.length && /\s/u.test(masked[start])) start += 1;
  if (masked[start] !== '{') return out;
  let index = start + 1;
  for (;;) {
    while (index < masked.length && /[\s,]/u.test(masked[index])) index += 1;
    if (index >= masked.length || masked[index] === '}') break;
    const from = index;
    let key = '';
    const quote = masked[index];
    if (quote === '\'' || quote === '"') {
      const close = masked.indexOf(quote, index + 1);
      if (close < 0) break;
      key = code.slice(index + 1, close);
    } else {
      const word = /^[A-Za-z_$][\w$]*/u.exec(masked.slice(index));
      key = word?.[0] ?? '';
    }
    let nested = 0;
    for (; index < masked.length; index += 1) {
      const char = masked[index];
      if ('([{'.includes(char)) nested += 1;
      else if (')]}'.includes(char)) { if (nested === 0) break; nested -= 1; }
      else if (char === ',' && nested === 0) break;
    }
    if (key) out.set(key, masked.slice(from, index));
  }
  return out;
}
