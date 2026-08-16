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
