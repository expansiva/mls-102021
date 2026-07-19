/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// PURE l4-v2 contract/controller helpers (no file I/O, no side-effecting imports — stays unit-testable;
// cbShared's libStor->libModel import crashes the l2 test stub). Two concerns:
//  1. B5 — rewrite an l4 contract header so its byte-copy can live at l1 (the platform can't resolve the
//     l4 import, so controllers import the l1 mirror).
//  2. B4 — resolve a bffCall projection deterministically: `$items` -> the operation's array field name,
//     input mapping (wire name -> usecase field), and the per-kind wire envelope. Everything the
//     controller emitter needs is derived here so the generator and its test share ONE source of truth.

import { isRecord } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import type { CbBffCall, CbBffCallOutputField } from '/_102021_/l2/agentChangeBackend/helpers/cbWorkspace.js';

// ── B5: l1 mirror header rewrite ────────────────────────────────────────────────

/** Rewrite an l4 contract's `.ts`/`.d.ts` content so the byte-copy is valid at l1: point the
 * `fileReference` at the l1 path and stamp a "copied from l4" note. The TYPE body is untouched.
 * Idempotent because callers always re-derive from the clean l4 source. */
export function rewriteContractHeaderToL1(
  content: string, project: number, moduleName: string, shortName: string, extension: string,
): string {
  const l1Ref = `_${project}_/l1/${moduleName}/contracts/${shortName}${extension}`;
  const l4Ref = `_${project}_/l4/${moduleName}/contracts/${shortName}${extension}`;
  const note = `// COPIED FROM l4 — do not edit. Source of truth: ${l4Ref}.`;
  const out = content.replace(/(<mls\s+fileReference=")[^"]*(")/u, `$1${l1Ref}$2`);
  const nl = out.indexOf('\n');
  return nl >= 0 ? `${out.slice(0, nl + 1)}${note}\n${out.slice(nl + 1)}` : `${out}\n${note}\n`;
}

// ── B4: deterministic projection resolution (used by the controller emitter + its test) ─────────────

// A minimal view of the operation outputShape the resolver needs (the array field name for `$items`).
export interface CbOpOutputShapeView { kind: string; fields: Array<{ name: string; type?: string; item?: unknown }>; }

/** The array-carrying field of a paginated/list operation outputShape (the `$items` target). The first
 * field of type 'array' (or one with a nested `item`) — real outputShapes have exactly one. */
export function resolveItemsArrayField(shape: CbOpOutputShapeView | null | undefined): string | null {
  if (!shape || !Array.isArray(shape.fields)) return null;
  const arr = shape.fields.find(f => f && (f.type === 'array' || isRecord((f as { item?: unknown }).item)));
  return arr ? arr.name : null;
}

// A resolved projection field: where the value comes from on the usecase result.
export interface CbResolvedProjectionField {
  name: string;                 // the wire field name
  operationId: string;          // which `uses` result it reads from
  path: string[];               // property path AFTER the operation (e.g. ['total'] or ['name'] for an item col)
  fromItems: boolean;           // true when the source is `<op>.$items.<col>` (an array item column)
}

/** Parse a bffCall `from` path (`<op>.<field>` | `<op>.$items.<col>`) into its parts. Returns null for
 * a malformed/empty `from`. */
export function parseFromPath(from: string | undefined): { operationId: string; fromItems: boolean; path: string[] } | null {
  const raw = String(from || '').trim();
  if (!raw) return null;
  const segs = raw.split('.');
  if (segs.length < 2) return null;
  const operationId = segs[0];
  if (segs[1] === '$items') {
    const path = segs.slice(2);
    return path.length ? { operationId, fromItems: true, path } : null;
  }
  return { operationId, fromItems: false, path: segs.slice(1) };
}

/** Resolve a bffCall's output into a flat list of item-column projections + top-level projections,
 * classified by their source. Deterministic — the controller emitter renders straight from this. */
export interface CbResolvedProjection {
  itemFields: CbResolvedProjectionField[];  // columns of the wire item array (paginated/list)
  topFields: CbResolvedProjectionField[];   // top-level object fields (object kind, or paginated meta)
}
export function resolveBffProjection(bff: CbBffCall): CbResolvedProjection {
  const itemFields: CbResolvedProjectionField[] = [];
  const topFields: CbResolvedProjectionField[] = [];
  for (const field of bff.output?.fields ?? []) {
    const resolved = resolveField(field);
    if (!resolved) continue;
    (resolved.fromItems ? itemFields : topFields).push(resolved);
  }
  return { itemFields, topFields };
}
function resolveField(field: CbBffCallOutputField): CbResolvedProjectionField | null {
  const parsed = parseFromPath(field.from);
  if (!parsed) return null;
  return { name: field.name, operationId: parsed.operationId, path: parsed.path, fromItems: parsed.fromItems };
}

// The wire envelope key for each output kind. `object` returns the projected object as-is; `paginated`/
// `list` wrap the projected items under `items` (+ pagination meta passed through for paginated). This
// matches the v1 usecase envelope ({ items, total, page, pageSize }) and the generated contract (Output
// is the ITEM shape for paginated/list, the whole object for object). See B4 Notas.
export function envelopeKindOf(bff: CbBffCall): 'object' | 'list' | 'paginated' {
  const kind = bff.output?.kind;
  return kind === 'paginated' || kind === 'list' ? kind : 'object';
}
