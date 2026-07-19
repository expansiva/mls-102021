"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteContractHeaderToL1 = rewriteContractHeaderToL1;
exports.resolveItemsArrayField = resolveItemsArrayField;
exports.parseFromPath = parseFromPath;
exports.resolveBffProjection = resolveBffProjection;
exports.envelopeKindOf = envelopeKindOf;
// PURE l4-v2 contract/controller helpers (no file I/O, no side-effecting imports — stays unit-testable;
// cbShared's libStor->libModel import crashes the l2 test stub). Two concerns:
//  1. B5 — rewrite an l4 contract header so its byte-copy can live at l1 (the platform can't resolve the
//     l4 import, so controllers import the l1 mirror).
//  2. B4 — resolve a bffCall projection deterministically: `$items` -> the operation's array field name,
//     input mapping (wire name -> usecase field), and the per-kind wire envelope. Everything the
//     controller emitter needs is derived here so the generator and its test share ONE source of truth.
var cbPlanner_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js");
// ── B5: l1 mirror header rewrite ────────────────────────────────────────────────
/** Rewrite an l4 contract's `.ts`/`.d.ts` content so the byte-copy is valid at l1: point the
 * `fileReference` at the l1 path and stamp a "copied from l4" note. The TYPE body is untouched.
 * Idempotent because callers always re-derive from the clean l4 source. */
function rewriteContractHeaderToL1(content, project, moduleName, shortName, extension) {
    var l1Ref = "_".concat(project, "_/l1/").concat(moduleName, "/contracts/").concat(shortName).concat(extension);
    var l4Ref = "_".concat(project, "_/l4/").concat(moduleName, "/contracts/").concat(shortName).concat(extension);
    var note = "// COPIED FROM l4 \u2014 do not edit. Source of truth: ".concat(l4Ref, ".");
    var out = content.replace(/(<mls\s+fileReference=")[^"]*(")/u, "$1".concat(l1Ref, "$2"));
    var nl = out.indexOf('\n');
    return nl >= 0 ? "".concat(out.slice(0, nl + 1)).concat(note, "\n").concat(out.slice(nl + 1)) : "".concat(out, "\n").concat(note, "\n");
}
/** The array-carrying field of a paginated/list operation outputShape (the `$items` target). The first
 * field of type 'array' (or one with a nested `item`) — real outputShapes have exactly one. */
function resolveItemsArrayField(shape) {
    if (!shape || !Array.isArray(shape.fields))
        return null;
    var arr = shape.fields.find(function (f) { return f && (f.type === 'array' || (0, cbPlanner_js_1.isRecord)(f.item)); });
    return arr ? arr.name : null;
}
/** Parse a bffCall `from` path (`<op>.<field>` | `<op>.$items.<col>`) into its parts. Returns null for
 * a malformed/empty `from`. */
function parseFromPath(from) {
    var raw = String(from || '').trim();
    if (!raw)
        return null;
    var segs = raw.split('.');
    if (segs.length < 2)
        return null;
    var operationId = segs[0];
    if (segs[1] === '$items') {
        var path = segs.slice(2);
        return path.length ? { operationId: operationId, fromItems: true, path: path } : null;
    }
    return { operationId: operationId, fromItems: false, path: segs.slice(1) };
}
function resolveBffProjection(bff) {
    var _a, _b;
    var itemFields = [];
    var topFields = [];
    for (var _i = 0, _c = (_b = (_a = bff.output) === null || _a === void 0 ? void 0 : _a.fields) !== null && _b !== void 0 ? _b : []; _i < _c.length; _i++) {
        var field = _c[_i];
        var resolved = resolveField(field);
        if (!resolved)
            continue;
        (resolved.fromItems ? itemFields : topFields).push(resolved);
    }
    return { itemFields: itemFields, topFields: topFields };
}
function resolveField(field) {
    var parsed = parseFromPath(field.from);
    if (!parsed)
        return null;
    return { name: field.name, operationId: parsed.operationId, path: parsed.path, fromItems: parsed.fromItems };
}
// The wire envelope key for each output kind. `object` returns the projected object as-is; `paginated`/
// `list` wrap the projected items under `items` (+ pagination meta passed through for paginated). This
// matches the v1 usecase envelope ({ items, total, page, pageSize }) and the generated contract (Output
// is the ITEM shape for paginated/list, the whole object for object). See B4 Notas.
function envelopeKindOf(bff) {
    var _a;
    var kind = (_a = bff.output) === null || _a === void 0 ? void 0 : _a.kind;
    return kind === 'paginated' || kind === 'list' ? kind : 'object';
}
