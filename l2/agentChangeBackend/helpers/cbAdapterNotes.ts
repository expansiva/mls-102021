/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbAdapterNotes.ts" enhancement="_blank"/>

// Planner notes for a repository adapter can forbid the only persistence API
// (`ctx.data.moduleData.getTable`). The runtime already stores rows (memory in
// tests, Postgres in production); a module-level Map is never a substitute.
// Mechanical sanitize at save/reuse; validate-all is the net.

import { parseDefsSource, replaceDefsValue } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';

export const ADAPTER_MODULE_DATA_NOTE =
  "Persist through ctx.data.moduleData.getTable<Row>('<table>'); never keep rows in a module-level Map/WeakMap/array.";

const NEGATION = /\b(?:do not|don't|dont|never|avoid|must not|mustn't|n[aã]o|nunca|proib\w*|evite|evitar)\b|\bno\s+/i;
const MODULE_DATA = /moduleData/i;
const GET_TABLE_OBLIGATION = /moduleData\.getTable/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isModuleDataProhibition(note: string): boolean {
  return MODULE_DATA.test(note) && NEGATION.test(note);
}

function isObligationEquivalent(note: string): boolean {
  return GET_TABLE_OBLIGATION.test(note);
}

export function sanitizeAdapterNotes(notes: string[]): string[] {
  const cleaned: string[] = [];
  for (const raw of notes) {
    if (typeof raw !== 'string') continue;
    const note = raw.trim();
    if (!note) continue;
    if (isModuleDataProhibition(note)) continue;
    cleaned.push(note);
  }
  if (!cleaned.some(isObligationEquivalent)) cleaned.push(ADAPTER_MODULE_DATA_NOTE);
  return cleaned;
}

/** Rewrite `data.notes` in an adapter .defs.ts source. `null` = no change (or unreadable). */
export function rewriteAdapterDefsNotes(source: string): string | null {
  const parsed = parseDefsSource(source);
  if (!isRecord(parsed)) return null;
  const data = isRecord(parsed.data) ? parsed.data : parsed;
  const raw = Array.isArray(data.notes) ? data.notes : [];
  const notes = raw.filter((n): n is string => typeof n === 'string');
  const next = sanitizeAdapterNotes(notes);
  if (JSON.stringify(notes) === JSON.stringify(next)) return null;
  if (isRecord(parsed.data)) {
    return replaceDefsValue(source, { ...parsed, data: { ...parsed.data, notes: next } });
  }
  return replaceDefsValue(source, { ...data, notes: next });
}

function sliceBraceBlock(source: string, openIdx: number): { start: number; end: number } | null {
  if (openIdx < 0 || source[openIdx] !== '{') return null;
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return { start: openIdx, end: i + 1 };
    }
  }
  return null;
}

/** Source with the `create<Entity>RepositoryAdapter` factory body removed. */
export function sourceOutsideAdapterFactory(source: string): string {
  const m = /export\s+function\s+create\w*RepositoryAdapter\s*\(/.exec(source);
  if (!m || m.index === undefined) return source;
  const open = source.indexOf('{', m.index);
  const block = sliceBraceBlock(source, open);
  if (!block) return source;
  return source.slice(0, m.index) + source.slice(block.end);
}

const MODULE_LEVEL_MAP = /new\s+(?:WeakMap|Map|Array)\s*(?:<[^;()]*?>)?\s*\(/;
const MODULE_LEVEL_ARRAY = /(?:const|let|var)\s+\w+\s*(?::\s*[^=]+)?=\s*\[\s*\]/;

export function hasModuleLevelStore(source: string): boolean {
  const outer = sourceOutsideAdapterFactory(source);
  return MODULE_LEVEL_MAP.test(outer) || MODULE_LEVEL_ARRAY.test(outer);
}

/**
 * Persistence adapter that does not talk to the runtime store, or keeps its own.
 * Signal A (absence of `ctx.data.moduleData`) only when the module declared a local table.
 * Signal B (module-level Map/WeakMap/array) is never legitimate in adapters/persistence.
 */
export function collectModuleDataAdapterFindings(
  source: string,
  sn: string,
  declaredTableNames: ReadonlySet<string>,
): string[] {
  const findings: string[] = [];
  if (declaredTableNames.size > 0 && !source.includes('ctx.data.moduleData')) {
    findings.push(
      `adapter ${sn} -> missing ctx.data.moduleData; persist through ctx.data.moduleData.getTable on the local module table (the only persistence API)`,
    );
  }
  if (hasModuleLevelStore(source)) {
    findings.push(
      `adapter ${sn} -> module-level Map/WeakMap/array store; persist through ctx.data.moduleData.getTable, never keep rows in a module-level store`,
    );
  }
  return findings;
}
