/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// PURE l4-v2 projection helpers (no file I/O, no side-effecting imports — stays unit-testable; cbShared's
// libStor->libModel import crashes the l2 test stub). Resolves a bffCall projection deterministically so
// the controller-def builder (gen-http) can carry the pick/rename/$items spec into the .defs.ts, which
// cb-materialize (LLM + httpController.md) then turns into the controller .ts.

import { isRecord } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import type { CbBffCall, CbBffCallOutputField } from '/_102021_/l2/agentChangeBackend/helpers/cbWorkspace.js';

// A minimal view of the operation outputShape the resolver needs (the array field name for `$items`).
export interface CbOpOutputShapeView { kind: string; fields: Array<{ name: string; type?: string; item?: unknown }>; }

/** The array-carrying field of a paginated operation outputShape (the `$items` target). The first field
 * of type 'array' (or one with a nested `item`) — real outputShapes have exactly one. `list` shapes are
 * flat (no array field) and return null. */
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

/** Parse a bffCall `from` path (`<op>.<field>` | `<op>.$items.<col>`) into its parts. Returns null for a
 * malformed/empty `from`, or for a bare `<op>.$items` (the whole array — handled by the array field). */
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

/** Resolve a bffCall's output per the CANONICAL v2 shapes (confirmed against the real contracts,
 * newSolution_10 §A2):
 *   object    -> topFields = the projected object fields; no array.
 *   list      -> itemFields = flat `<op>.$items.<col>` columns; the WIRE is a BARE array (arrayFieldName null).
 *   paginated -> one array field with nested `item.fields` (declared name, e.g. `reservations`) + meta
 *                (total/page/pageSize) as topFields; the WIRE wraps `{ <arrayFieldName>: item[], ...meta }`. */
export interface CbResolvedProjection {
  kind: 'object' | 'list' | 'paginated';
  itemFields: CbResolvedProjectionField[];  // item columns (list: flat; paginated: the array field's item.fields)
  topFields: CbResolvedProjectionField[];   // object fields, or paginated meta (total/page/pageSize)
  arrayFieldName: string | null;            // paginated: the DECLARED wire array field name; null for list/object
  arrayOperationId: string | null;          // paginated/list: the operation whose array feeds the items
}
export function resolveBffProjection(bff: CbBffCall): CbResolvedProjection {
  const kind = envelopeKindOf(bff);
  const fields = bff.output?.fields ?? [];
  if (kind === 'paginated') {
    const arrayField = fields.find(f => (f.item?.fields?.length) || isBareItems(f.from));
    const itemFields = (arrayField?.item?.fields ?? []).map(resolveField).filter((f): f is CbResolvedProjectionField => f !== null);
    const arrOp = arrayField ? (parseFromPath(arrayField.from)?.operationId ?? itemFields[0]?.operationId ?? null) : null;
    const topFields = fields.filter(f => f !== arrayField).map(resolveField).filter((f): f is CbResolvedProjectionField => f !== null);
    return { kind, itemFields, topFields, arrayFieldName: arrayField?.name ?? null, arrayOperationId: arrOp };
  }
  if (kind === 'list') {
    const itemFields = fields.map(resolveField).filter((f): f is CbResolvedProjectionField => f !== null);
    return { kind, itemFields, topFields: [], arrayFieldName: null, arrayOperationId: itemFields[0]?.operationId ?? null };
  }
  const topFields = fields.map(resolveField).filter((f): f is CbResolvedProjectionField => f !== null);
  return { kind, itemFields: [], topFields, arrayFieldName: null, arrayOperationId: null };
}
function isBareItems(from?: string): boolean {
  return /\.\$items$/.test(String(from || '').trim()); // `<op>.$items` with no column
}
function resolveField(field: CbBffCallOutputField): CbResolvedProjectionField | null {
  const parsed = parseFromPath(field.from);
  if (!parsed) return null;
  return { name: field.name, operationId: parsed.operationId, path: parsed.path, fromItems: parsed.fromItems };
}

export function envelopeKindOf(bff: CbBffCall): 'object' | 'list' | 'paginated' {
  const kind = bff.output?.kind;
  return kind === 'paginated' || kind === 'list' ? kind : 'object';
}
