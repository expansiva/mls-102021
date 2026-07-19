"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderWorkspaceController = renderWorkspaceController;
var cbContracts_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbContracts.js");
var cap = function (s) { return (s ? s.charAt(0).toUpperCase() + s.slice(1) : s); };
var lowerFirst = function (s) { return (s ? s.charAt(0).toLowerCase() + s.slice(1) : s); };
var RUNTIME_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';
/** Allowed login scopes for a route. The actor->login-role mapping (spec 1 D6.5) is PENDING, so we emit
 * the l4 roleScope (or the `<module>:<actorId>` convention) as ONE const per route — the single place to
 * adjust when D6.5 lands. Enforcement (emitted `enforceActors`) is permissive: absent scope -> allow +
 * telemetry; a NON-EMPTY scope with zero intersection -> deny. */
function allowedScopesOf(ws, actorRoleScopes, moduleName) {
    return ws.actors.map(function (a) { return actorRoleScopes.get(a) || "".concat(moduleName, ":").concat(a); });
}
function renderWorkspaceController(inp) {
    var project = inp.project, moduleName = inp.moduleName, ws = inp.workspace, opShapes = inp.opShapes, usecaseFns = inp.usecaseFns, actorRoleScopes = inp.actorRoleScopes;
    var usecaseOps = new Set();
    var routeKeys = [];
    var handlers = [];
    var contractImports = [];
    var allowed = allowedScopesOf(ws, actorRoleScopes, moduleName);
    var allowedConstName = "".concat(ws.workspaceId, "AllowedScopes");
    for (var _i = 0, _a = ws.bffCalls; _i < _a.length; _i++) {
        var bff = _a[_i];
        var handlerName = "".concat(ws.workspaceId).concat(cap(bff.bffId), "Handler");
        var inputType = "".concat(cap(bff.bffId), "Input");
        var outputType = "".concat(cap(bff.bffId), "Output");
        var routeConst = "".concat(bff.bffId, "Route");
        var hasOutput = !!bff.output;
        contractImports.push("import { type ".concat(inputType).concat(hasOutput ? ", type ".concat(outputType) : '', ", ").concat(routeConst, " } ") +
            "from '/_".concat(project, "_/l1/").concat(moduleName, "/contracts/").concat(ws.workspaceId, ".").concat(bff.bffId, ".js';"));
        for (var _b = 0, _c = bff.uses; _b < _c.length; _b++) {
            var use = _c[_b];
            usecaseOps.add(use.operationId);
        }
        routeKeys.push(routeConst);
        handlers.push(renderHandler(bff, { handlerName: handlerName, inputType: inputType, outputType: outputType, routeConst: routeConst, allowedConstName: allowedConstName, usecaseFns: usecaseFns, opShapes: opShapes }));
    }
    var usecaseImports = __spreadArray([], usecaseOps, true).map(function (op) {
        var fn = usecaseFns.get(op);
        var fnName = (fn === null || fn === void 0 ? void 0 : fn.functionName) || op;
        var typePart = (fn === null || fn === void 0 ? void 0 : fn.inputTypeName) ? ", type ".concat(fn.inputTypeName) : '';
        return "import { ".concat(fnName).concat(typePart, " } from '/_").concat(project, "_/l1/").concat(moduleName, "/layer_2_application/usecases/").concat(lowerFirst(op), ".js';");
    });
    var source = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "/// <mls fileReference=\"_".concat(project, "_/l1/").concat(moduleName, "/layer_1_external/adapters/http/controllers/").concat(ws.workspaceId, ".ts\" enhancement=\"_blank\"/>"),
        "",
        "// GENERATED MECHANICALLY from _".concat(project, "_/l4/").concat(moduleName, "/workspaces/").concat(ws.workspaceId, ".defs.ts \u2014 DO NOT EDIT."),
        "// Deterministic BFF controller (no LLM): one handler per bffCall; routes = contract consts; projection",
        "// derived from the workspace. Actor enforcement is permissive pending the D6.5 actor->login-role map.",
        "import { ok, fail, AppError, type BffHandler, type BffResponse, type ControllerRoute, type RequestContext } from '".concat(RUNTIME_CONTRACTS, "';")
    ], usecaseImports, true), contractImports, true), [
        "",
        "// Login scopes permitted on every route of the \"".concat(ws.workspaceId, "\" workspace (actors: ").concat(JSON.stringify(ws.actors), ")."),
        "const ".concat(allowedConstName, ": readonly string[] = ").concat(JSON.stringify(allowed), ";"),
        ""
    ], false), handlers, true), [
        renderEnforceActors(),
        "",
        "export const routes: ControllerRoute[] = ["
    ], false), ws.bffCalls.map(function (bff) { return "  { key: ".concat(bff.bffId, "Route, handler: ").concat(ws.workspaceId).concat(cap(bff.bffId), "Handler },"); }), true), [
        "];",
        "",
    ], false).join('\n');
    return { source: source, usecaseOperationIds: __spreadArray([], usecaseOps, true), routeKeys: routeKeys };
}
function renderHandler(bff, h) {
    var body = bff.uses.length > 1 ? renderComposedBody(bff, h) : renderSingleUseBody(bff, h);
    return __spreadArray(__spreadArray([
        "export const ".concat(h.handlerName, ": BffHandler = async ({ request, ctx }) => {"),
        "  const denial = enforceActors(ctx, ".concat(h.allowedConstName, ", ").concat(h.routeConst, ");"),
        "  if (denial) return denial;",
        "  const input = (request.params ?? {}) as ".concat(h.inputType, ";")
    ], body.map(function (l) { return "  ".concat(l); }), true), [
        "};",
        "",
    ], false).join('\n');
}
/** Build the usecase input object literal from the bffCall inputs whose `from` targets this operation. */
function renderUsecaseInput(bff, operationId, fn) {
    var assigns = [];
    for (var _i = 0, _a = bff.input; _i < _a.length; _i++) {
        var field = _a[_i];
        var parsed = (0, cbContracts_js_1.parseFromPath)(field.from);
        if (!parsed || parsed.operationId !== operationId || parsed.fromItems || parsed.path.length !== 1)
            continue;
        assigns.push("    ".concat(parsed.path[0], ": input.").concat(field.name, ","));
    }
    var ann = (fn === null || fn === void 0 ? void 0 : fn.inputTypeName) ? ": ".concat(fn.inputTypeName) : '';
    return __spreadArray(__spreadArray(["const ".concat(operationId, "Input").concat(ann, " = {")], assigns, true), ["  };"], false);
}
function renderSingleUseBody(bff, h) {
    var op = bff.uses[0].operationId;
    var fn = h.usecaseFns.get(op);
    var fnName = (fn === null || fn === void 0 ? void 0 : fn.functionName) || op;
    var lines = __spreadArray(__spreadArray(__spreadArray([], renderUsecaseInput(bff, op, fn), true), [
        "const ".concat(op, "Result = await ").concat(fnName, "(ctx, ").concat(op, "Input);")
    ], false), renderEnvelope(bff, h, resultVarProjector(op)), true);
    return lines;
}
function resultVarProjector(_singleOp) {
    return function (operationId, path, base) { return "".concat(base ? base : "".concat(operationId, "Result")).concat(path.map(function (p) { return ".".concat(p); }).join('')); };
}
function renderEnvelope(bff, h, project) {
    var _a, _b, _c;
    if (!bff.output)
        return ["return ok(".concat(bff.uses[0].operationId, "Result);")]; // command passthrough
    var kind = (0, cbContracts_js_1.envelopeKindOf)(bff);
    var proj = (0, cbContracts_js_1.resolveBffProjection)(bff);
    if (kind === 'object') {
        var fields = proj.topFields.map(function (f) { return "    ".concat(f.name, ": ").concat(project(f.operationId, f.path, ''), ","); });
        return __spreadArray(__spreadArray(["return ok({"], fields, true), ["  });"], false);
    }
    // paginated | list: map the source array (the op's $items field) to the projected item columns, then
    // wrap as `{ items, ... }`. The wire array key is ALWAYS `items` (the bffCall contract Output is the
    // item shape — there is no declared array name in a bffCall; the frontend v2 path reads `.items`).
    var op = ((_a = proj.itemFields[0]) === null || _a === void 0 ? void 0 : _a.operationId) || bff.uses[0].operationId;
    var arrayField = (0, cbContracts_js_1.resolveItemsArrayField)(h.opShapes.get(op)) || 'items';
    var cols = proj.itemFields.map(function (f) { return "    ".concat(f.name, ": row").concat(f.path.map(function (p) { return ".".concat(p); }).join(''), ","); });
    // `row` is left UN-annotated so its item columns infer from the usecase's typed result array (the
    // outputShape is pinned = CP2, and the materializer types the array element as a named projection —
    // e.g. BrowseMenuItemProjection[]). Annotating `Record<string, unknown>` would make every column
    // `unknown` and fail the whole-project compile against the typed Output.
    var lines = __spreadArray(__spreadArray([
        "const items: ".concat(h.outputType, "[] = (").concat(op, "Result.").concat(arrayField, " ?? []).map((row) => ({")
    ], cols, true), [
        "  }));",
    ], false);
    // Any DECLARED top-level projection (rare — usually none for paginated) is kept; pagination meta
    // (total/page/pageSize) is passed through from the op ONLY when the op's outputShape actually declares
    // it and it was not already projected as a top-level field (A5: pagination is never implicit).
    var declared = new Set(proj.topFields.map(function (f) { return f.name; }));
    var topProps = proj.topFields.map(function (f) { return "".concat(f.name, ": ").concat(project(f.operationId, f.path, '')); });
    var opFieldNames = new Set(((_c = (_b = h.opShapes.get(op)) === null || _b === void 0 ? void 0 : _b.fields) !== null && _c !== void 0 ? _c : []).map(function (f) { return f.name; }));
    var meta = kind === 'paginated'
        ? ['total', 'page', 'pageSize'].filter(function (k) { return !declared.has(k) && opFieldNames.has(k); }).map(function (k) { return "".concat(k, ": ").concat(op, "Result.").concat(k); })
        : [];
    var parts = __spreadArray(__spreadArray(['items'], topProps, true), meta, true);
    lines.push("return ok({ ".concat(parts.join(', '), " });"));
    return lines;
}
// Composed call (uses > 1): Promise.all of the usecases, optional slices degrade to null + a warning in
// the envelope. UNVERIFIED against a real composed workspace (none exist in the 102049 target) — see Notas.
function renderComposedBody(bff, h) {
    var lines = ["const warnings: string[] = [];"];
    for (var _i = 0, _a = bff.uses; _i < _a.length; _i++) {
        var use = _a[_i];
        var fn = h.usecaseFns.get(use.operationId);
        var fnName = (fn === null || fn === void 0 ? void 0 : fn.functionName) || use.operationId;
        lines.push.apply(lines, renderUsecaseInput(bff, use.operationId, fn));
        if (use.optional) {
            lines.push("const ".concat(use.operationId, "Result = await ").concat(fnName, "(ctx, ").concat(use.operationId, "Input).catch((e: unknown) => {"), "  warnings.push('".concat(use.operationId, ": ' + (e instanceof Error ? e.message : String(e)));"), "  return null;", "});");
        }
        else {
            lines.push("const ".concat(use.operationId, "Result = await ").concat(fnName, "(ctx, ").concat(use.operationId, "Input);"));
        }
    }
    // Composed output is always an object grouping the slices; each field reads from its op's result
    // (null-safe for optional uses).
    var proj = (0, cbContracts_js_1.resolveBffProjection)(bff);
    var optional = new Set(bff.uses.filter(function (u) { return u.optional; }).map(function (u) { return u.operationId; }));
    var fields = proj.topFields.map(function (f) {
        var opt = optional.has(f.operationId) ? '?' : '';
        return "    ".concat(f.name, ": ").concat(f.operationId, "Result").concat(opt).concat(f.path.map(function (p) { return ".".concat(p); }).join(''), " ?? null,");
    });
    return __spreadArray(__spreadArray(["return ok({"], fields, true), ["    warnings,", "  });"], false);
}
function renderEnforceActors() {
    return [
        "// Actor authorization (permissive; D6.5 actor->login-role mapping pending). Absent session scope ->",
        "// allow + telemetry; a declared scope with zero intersection against the route's allowed scopes -> deny.",
        "function enforceActors(ctx: RequestContext, allowed: readonly string[], route: string): BffResponse | null {",
        "  if (allowed.length === 0) return null;",
        "  const scope = ctx.sessionContext?.actorScope ?? [];",
        "  if (scope.length === 0) { ctx.log.info('bff.actor.no-scope', { route, allowed }); return null; }",
        "  if (scope.some((s) => allowed.includes(s))) return null;",
        "  return fail(new AppError('FORBIDDEN_ACTOR', 'actor scope not permitted for ' + route, 403, { route, scope }));",
        "}",
    ].join('\n');
}
