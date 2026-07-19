/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// PURE l4-v2 contract/controller helpers (no file I/O, no side-effecting imports — stays unit-testable;
// cbShared's libStor->libModel import crashes the l2 test stub). Two concerns:
//  1. B4 — resolve a bffCall projection deterministically: `$items` -> the operation's array field name,
//     input mapping (wire name -> usecase field), and the per-kind wire envelope.
//  2. B5 — GENERATE the l1 contract (Input/Output/route) from the bffCall (the agent must NEVER read a
//     `.ts` from l4 — l4 holds only `.defs.ts`). The controller emitter and the contract generator both
//     render from resolveBffProjection, so they share ONE source of truth for the shapes.

import { isRecord } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import type { CbBffCall, CbBffCallOutputField } from '/_102021_/l2/agentChangeBackend/helpers/cbWorkspace.js';

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

/** Resolve a bffCall's output into item-column projections + top-level projections, per the CANONICAL
 * v2 output shapes (confirmed against the real generated contracts, newSolution_10 §A2):
 *   object    -> topFields = the projected object fields; no array.
 *   list      -> itemFields = flat `<op>.$items.<col>` columns; the WIRE is a BARE array (arrayFieldName null).
 *   paginated -> one array field with nested `item.fields` (declared name, e.g. `reservations`) + meta
 *                (total/page/pageSize) as topFields; the WIRE wraps `{ <arrayFieldName>: item[], ...meta }`.
 * Deterministic — the controller emitter + the l1 contract generator both render straight from this. */
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
    // The array field carries nested item.fields (canonical) OR a bare `<op>.$items` from.
    const arrayField = fields.find(f => (f.item?.fields?.length) || isBareItems(f.from));
    const itemFields = (arrayField?.item?.fields ?? []).map(resolveField).filter((f): f is CbResolvedProjectionField => f !== null);
    const arrOp = arrayField ? (parseFromPath(arrayField.from)?.operationId ?? itemFields[0]?.operationId ?? null) : null;
    const topFields = fields.filter(f => f !== arrayField).map(resolveField).filter((f): f is CbResolvedProjectionField => f !== null);
    return { kind, itemFields, topFields, arrayFieldName: arrayField?.name ?? null, arrayOperationId: arrOp };
  }
  if (kind === 'list') {
    // Flat item columns at top level (each `<op>.$items.<col>`). Bare array wire.
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

// ── l1 contract GENERATION (replaces the l4 `.ts` byte-mirror — l4 holds only `.defs.ts`) ───────────
// The changeBackend agent must NEVER read a `.ts`/`.d.ts` from l4 (l4 is not compilable; getContent on
// it 422s). So the l1 contract is DERIVED from the workspace bffCall defs here, deterministically.

const capC = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Resolves TS types for a bffCall's fields from the operation defs. Pre-built by the caller (from the
// scan) so this module stays pure.
export interface CbContractTypes {
  inputType(operationId: string, opField: string): string;              // -> l4 type token
  outputType(operationId: string, col: string, fromItems: boolean): string; // -> l4 type token
}

// l4 type token -> TS type. string/text/uuid -> string; number/money -> number; boolean; array/object structural.
export function tsTypeToken(t: string): string {
  const x = String(t || '').toLowerCase();
  if (x === 'number' || x === 'money' || x === 'integer' || x === 'float' || x === 'decimal') return 'number';
  if (x === 'boolean' || x === 'bool') return 'boolean';
  if (x === 'array') return 'unknown[]';
  if (x === 'object') return 'Record<string, unknown>';
  return 'string';
}

/** Generate the l1 contract `.ts` for a bffCall from the workspace defs. Emits Input/Output + route const,
 * matching the canonical shapes: object -> interface; list -> `type Output = Item[]` (bare array);
 * paginated -> `{ <arrayName>: Item[], ...meta }` (declared array name). */
export function renderBffContract(
  project: number, moduleName: string, workspaceId: string, bff: CbBffCall, types: CbContractTypes,
): string {
  const Cap = capC(bff.bffId);
  const inputName = `${Cap}Input`, outputName = `${Cap}Output`, routeConst = `${bff.bffId}Route`;
  const route = bff.route || `${moduleName}.${workspaceId}.${bff.bffId}`;
  const last = (f: CbResolvedProjectionField): string => f.path[f.path.length - 1] || f.name;
  const L: string[] = [
    `/// <mls fileReference="_${project}_/l1/${moduleName}/contracts/${workspaceId}.${bff.bffId}.ts" enhancement="_blank"/>`,
    ``,
    `// GENERATED MECHANICALLY from _${project}_/l4/${moduleName}/workspaces/${workspaceId}.defs.ts`,
    `// (bffCall ${bff.bffId}, ${bff.kind}, Output kind=${bff.output?.kind ?? 'object'}) — DO NOT EDIT.`,
    ``,
    `export interface ${inputName} {`,
  ];
  for (const i of bff.input) {
    const p = parseFromPath(i.from);
    const t = i.type || (p ? types.inputType(p.operationId, p.path[0] || i.name) : 'string');
    L.push(`  ${i.name}?: ${tsTypeToken(t)};`);
  }
  L.push(`}`, ``);
  const proj = resolveBffProjection(bff);
  if (!bff.output) {
    // command passthrough with no declared output: no Output interface (the controller returns the usecase result).
  } else if (proj.kind === 'object') {
    L.push(`export interface ${outputName} {`);
    for (const f of proj.topFields) L.push(`  ${f.name}: ${tsTypeToken(types.outputType(f.operationId, last(f), false))};`);
    L.push(`}`, ``);
  } else if (proj.kind === 'list') {
    const itemName = `${Cap}Item`;
    L.push(`export interface ${itemName} {`);
    for (const f of proj.itemFields) L.push(`  ${f.name}: ${tsTypeToken(types.outputType(f.operationId, last(f), true))};`);
    L.push(`}`, ``, `export type ${outputName} = ${itemName}[];`, ``);
  } else { // paginated
    const arrName = proj.arrayFieldName || 'items';
    const itemName = `${Cap}${capC(arrName)}Item`;
    L.push(`export interface ${itemName} {`);
    for (const f of proj.itemFields) L.push(`  ${f.name}: ${tsTypeToken(types.outputType(f.operationId, last(f), true))};`);
    L.push(`}`, ``, `export interface ${outputName} {`, `  ${arrName}: ${itemName}[];`);
    for (const f of proj.topFields) L.push(`  ${f.name}: ${tsTypeToken(types.outputType(f.operationId, last(f), false))};`);
    L.push(`}`, ``);
  }
  L.push(`export const ${routeConst} = '${route}' as const;`, ``);
  return L.join('\n');
}
