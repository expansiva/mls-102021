/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/engineImports.ts" enhancement="_blank"/>

// d1_198: the import of a name of the workflow engine is derivable. The file uses the name, the index of the engine
// exports it: the import is completed in code, from the index read on every round. No list of engine names is written
// by hand, so the next type the model uses is covered the same way.

import { mergeImports } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/sequence.js';

/** The import specifier of the workflow engine (`/_102034_/l1/workflow/index.ts`). */
export const ENGINE_INDEX_SPECIFIER = '/_102034_/l1/workflow/index.js';

export interface EngineExports {
  /** Names only a type (`export type { … }`, or `type X` inside `export { … }`). */
  types: ReadonlySet<string>;
  /** Names that exist at run time. */
  values: ReadonlySet<string>;
}

function names(list: string): Array<{ name: string; type: boolean }> {
  const out: Array<{ name: string; type: boolean }> = [];
  for (const raw of list.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/[^\n]*/gu, '').split(',')) {
    const item = raw.trim();
    if (!item) continue;
    const typed = /^type\s+/u.test(item);
    const bare = item.replace(/^type\s+/u, '');
    const exported = bare.split(/\s+as\s+/u).pop()?.trim() ?? '';
    if (/^[A-Za-z_$][\w$]*$/u.test(exported)) out.push({ name: exported, type: typed });
  }
  return out;
}

/** What the index of the engine exports: re-export lists and its own `export` declarations. */
export function engineExportsOf(indexSource: string): EngineExports {
  const types = new Set<string>();
  const values = new Set<string>();
  for (const match of indexSource.matchAll(/export\s+type\s*\{([^}]*)\}/gu)) for (const item of names(match[1])) types.add(item.name);
  for (const match of indexSource.matchAll(/export\s*\{([^}]*)\}/gu)) for (const item of names(match[1])) (item.type ? types : values).add(item.name);
  for (const match of indexSource.matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(function|const|let|var|class|enum)\s+([A-Za-z_$][\w$]*)/gmu)) values.add(match[2]);
  for (const match of indexSource.matchAll(/^export\s+(?:declare\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/gmu)) types.add(match[1]);
  for (const name of values) types.delete(name);
  return { types, values };
}

/** Code without comments and without string literals (a name in a message is not a use). Template text stays. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, ' ')
    .replace(/(^|[^:\\])\/\/[^\n]*/gu, '$1 ')
    .replace(/'(?:\\.|[^'\\\n])*'/gu, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/gu, '""');
}

/** Names the file imports (every import declaration, default and namespace included). */
function importedNames(code: string): Set<string> {
  const out = new Set<string>();
  for (const match of code.matchAll(/^import\s+([\s\S]*?)\s+from\s+''\s*;?/gmu)) {
    const clause = match[1].replace(/^type\s+/u, '');
    for (const part of clause.split(/[{},]/u)) {
      const bare = part.trim().replace(/^type\s+/u, '');
      if (!bare) continue;
      const alias = bare.split(/\s+as\s+/u).pop()?.trim().replace(/^\*\s+as\s+/u, '') ?? '';
      if (/^[A-Za-z_$][\w$]*$/u.test(alias)) out.add(alias);
    }
  }
  return out;
}

function declares(code: string, name: string): boolean {
  return new RegExp(`(?:^|[^\\w$.])(?:function\\*?|const|let|var|class|interface|type|enum)\\s+${name}(?![\\w$])`, 'u').test(code);
}

/** `name` as a use: not a property (`.name`), not an object key (`name:`), not part of a longer identifier. */
function uses(code: string, name: string): boolean {
  return new RegExp(`(?<![\\w$.])${name}(?![\\w$])(?!\\s*:(?!:))`, 'u').test(code);
}

/**
 * Adds, after the imports, the import of every name the file uses and neither declares nor imports and the engine index
 * exports. `import type` for a name that is only a type. The source is returned as it came when nothing is missing.
 */
export function completeEngineImports(source: string, engine: EngineExports): string {
  const code = codeOnly(source);
  const have = importedNames(code);
  // The import lines are not a use: `import { open as o }` does not use `open`.
  const body = code.replace(/^import\s+[\s\S]*?\s+from\s+''\s*;?/gmu, '');
  const missing = (set: ReadonlySet<string>): string[] => [...set].filter(name => !have.has(name) && !declares(code, name) && uses(body, name)).sort();
  const types = missing(engine.types);
  const values = missing(engine.values);
  const lines: string[] = [];
  if (values.length) lines.push(`import { ${values.join(', ')} } from '${ENGINE_INDEX_SPECIFIER}';`);
  if (types.length) lines.push(`import type { ${types.join(', ')} } from '${ENGINE_INDEX_SPECIFIER}';`);
  return lines.length ? mergeImports(source, lines) : source;
}
