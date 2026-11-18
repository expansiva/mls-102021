/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/source.ts" enhancement="_blank"/>

/** Reads the object of `export const name = { ... }` without evaluating the file. */
export function parseD1Source(text: string, kind: 'json' | 'defs'): unknown | null {
  const body = kind === 'json' ? text : extractDefsObject(text);
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function extractDefsObject(source: string): string {
  // An optional type annotation (`export const cm: ConnectionCatalog = {`) is skipped; the object is the same.
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*(?::\s*[A-Za-z_$][\w$.<>, ]*)?=/);
  const start = source.indexOf('{', Math.max(0, assignment));
  if (assignment < 0 || start < 0) return '';
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
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}
