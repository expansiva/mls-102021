/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbDefsSource.ts" enhancement="_blank"/>

/**
 * Pure readers of the l4/l5 defs dialects, with no platform imports, so they can be tested directly.
 * Two generators write the artifacts this agent reads: ns/ns3 emitted `} as const;`, and ns4 emits
 * `} as const satisfies <Artifact>;` over a typed import.
 */

export type CbEntityKind = 'core' | 'supporting' | 'event' | 'metric' | 'mdm';
const ENTITY_KINDS: readonly CbEntityKind[] = ['core', 'supporting', 'event', 'metric', 'mdm'];

/** The cut points of the exported value, in the order they should be tried. */
function valueBounds(content: string): Array<[number, number]> {
  const start = content.indexOf('= ');
  if (start === -1) return [];
  const first = content.indexOf(' as const', start);
  const last = content.lastIndexOf(' as const');
  // The first cut wins for a file that appends a second export (saveDefs writes `pipeline` after the
  // value); the last is the fallback for a value that happens to contain the words.
  const ends = first === last ? [first] : [first, last];
  return ends.filter(end => end > start).map(end => [start + 2, end] as [number, number]);
}

export function parseDefsSource(content: string): unknown {
  for (const [from, to] of valueBounds(content)) {
    try {
      return JSON.parse(content.slice(from, to));
    } catch { /* try the other cut */ }
  }
  return null;
}

/**
 * Replace only the value of a defs file, keeping everything the generator wrote around it — the
 * header, the `import type`, the `satisfies` and the trailing exports. The todo files belong to the
 * generator that emitted them; this agent only flips a status inside them.
 */
export function replaceDefsValue(content: string, value: unknown): string | null {
  for (const [from, to] of valueBounds(content)) {
    try {
      JSON.parse(content.slice(from, to));
    } catch { continue; }
    return `${content.slice(0, from)}${JSON.stringify(value, null, 2)}${content.slice(to)}`;
  }
  return null;
}

/**
 * The handler vocabulary is `query | command`, but `operation.kind` speaks the generator's dialect:
 * ns/ns3 said create|update|query|view, ns4 says list|getById|create|update|delete|transition|
 * commandInput. Only reads are queries; everything else writes.
 */
export function handlerKindOf(opKind: string): 'query' | 'command' {
  return ['query', 'view', 'list', 'getById'].includes(opKind) ? 'query' : 'command';
}

/**
 * ns4 classifies a read-model as `projection`, which is what `metric` already meant here: not an
 * aggregate root by itself, but still backed by a table and seeds WHEN an operation reads it (that
 * is how a dashboard answers at runtime). Casting it silently would land on `core` and give a
 * projection nobody queries a table of its own.
 */
export function entityKindOf(kind: string): CbEntityKind {
  if (kind === 'projection') return 'metric';
  return ENTITY_KINDS.includes(kind as CbEntityKind) ? kind as CbEntityKind : 'core';
}

/** A ns4 workflow: the lifecycle of one entity, with states and transitions and no operations. */
export function isEntityLifecycle(parsed: Record<string, unknown>): boolean {
  return typeof parsed.entityRef === 'string' && !!parsed.entityRef.trim()
    && Array.isArray(parsed.states) && Array.isArray(parsed.transitions);
}

/**
 * The module a `TS2792 Cannot find module '<path>'` names, or '' for any other diagnostic.
 *
 * A generated file that imports a platform contract of another project (`/_102034_/l1/...`) compiles
 * against a Monaco model this agent borrows for the compile. When the borrow silently fails the
 * diagnostic is indistinguishable from a real broken import — and the seed run of 2026-08-16 died on
 * one, after two earlier waves had compiled the very same file. Recognizing the shape is what lets
 * the caller ask "does this file actually exist?" instead of blaming the plan.
 */
export function phantomModulePathOf(diagnostic: string): string {
  if (!/TS2792/.test(diagnostic)) return '';
  const match = /Cannot find module ['"]([^'"]+)['"]/.exec(diagnostic);
  const path = match?.[1] || '';
  return /^\/_\d+_\/l\d+\//.test(path) ? path : '';
}

/** `/_102034_/l1/server/.../contracts.js` -> the file coordinates of its source. */
export function mlsImportPathParts(path: string): { project: number; level: number; folder: string; shortName: string } | null {
  const match = /^\/_(\d+)_\/l(\d+)\/(.+)$/.exec(path);
  if (!match) return null;
  const rest = match[3].replace(/\.js$/, '');
  const cut = rest.lastIndexOf('/');
  if (cut <= 0) return null;
  return { project: Number(match[1]), level: Number(match[2]), folder: rest.slice(0, cut), shortName: rest.slice(cut + 1) };
}

/**
 * The cross-project module a resolution diagnostic names, whatever the compiler called it
 * (TS2792 "cannot find module … did you mean to set moduleResolution", TS2307 "cannot find module").
 *
 * Used where the file under compile is written by THIS agent from a fixed template — the seeds. There
 * the import is not a claim the LLM made (it only plans data rows), so a module that does not resolve
 * is an environment fact, and asking `mls.stor.files` whether the target exists measures the wrong
 * thing: it measures whether the session indexed the other project, not whether the plan is wrong.
 */
export function aliasModuleResolutionPathOf(diagnostic: string): string {
  if (!/TS(?:2792|2307)/.test(diagnostic)) return '';
  const match = /Cannot find module ['"]([^'"]+)['"]/.exec(diagnostic);
  const path = match?.[1] || '';
  return /^\/_\d+_\/l\d+\//.test(path) ? path : '';
}

/**
 * Monaco's "model already exists" — raised by `addModels` for a file whose model IS loaded, under a
 * registry key this agent's guard does not compute. The goal of the call (a usable model) is already
 * met, so the caller treats it as success; reading it as a failure logged the same warning forever
 * and left the import unborrowed.
 */
export function isModelAlreadyExistsError(message: string): boolean {
  return /model already exists/iu.test(message);
}
