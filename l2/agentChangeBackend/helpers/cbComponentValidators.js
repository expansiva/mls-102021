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
exports.collectL1Imports = collectL1Imports;
exports.collectRelativeImportIssues = collectRelativeImportIssues;
exports.escapeRegExp = escapeRegExp;
exports.fieldNameFromRef = fieldNameFromRef;
exports.requiredBoundaryFields = requiredBoundaryFields;
exports.collectRequiredChecksByHandler = collectRequiredChecksByHandler;
exports.collectExportedHandlers = collectExportedHandlers;
exports.collectRouteHandlers = collectRouteHandlers;
exports.normalizeRuleId = normalizeRuleId;
exports.collectUsecaseRules = collectUsecaseRules;
exports.collectV2ControllerCoherenceIssues = collectV2ControllerCoherenceIssues;
var clientBoundarySources_js_1 = require("/_102029_/l2/clientBoundarySources.js");
// Shared component-inspection helpers for the generated l1 .ts / .defs.ts artifacts. These pure
// functions were duplicated (near-identically) in agentCbMaterialize.ts and agentCbValidateAll.ts;
// a fix on one side kept drifting from the other. Extracted here on 2026-07-11 as the SINGLE source
// (todo/modernizeChangeBackend.md step 3). Behavior is preserved exactly — they parse generated code
// and defs to check BFF boundary/route coherence and rule coverage. No step-specific knowledge.
// Self-contained (like cbMdmGuards/cbSeedsCore): inlines the three trivial primitives instead of
// importing cbShared, so this module + its unit test stay free of the heavy runtime graph. The
// implementations mirror cbShared.isRecord/readString/readStringArray exactly.
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function readStringArray(value) {
    return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}
/** Module-local l1 imports of a generated .ts: `from '/_<project>_/l1/<folder>/<name>.js'`. Returns
 * the tsSet key (`${folder}::${shortName}`) so the caller can check the target was actually generated.
 * Cross-project imports (e.g. /_102034_/ platform) and non-l1 imports are ignored on purpose. */
function collectL1Imports(content, project) {
    var out = [];
    var re = /from\s+['"]\/_(\d+)_\/l1\/([^'"]+)['"]/g;
    var match;
    while ((match = re.exec(content)) !== null) {
        if (Number(match[1]) !== project)
            continue;
        var path = match[2].replace(/\.(?:d\.ts|ts|js)$/u, '');
        var lastSlash = path.lastIndexOf('/');
        var folder = lastSlash >= 0 ? path.slice(0, lastSlash) : '';
        var shortName = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
        out.push({ key: "".concat(folder, "::").concat(shortName.toLowerCase()), target: "_".concat(project, "_/l1/").concat(path) });
    }
    return out;
}
/** Generated l1 code must import ONLY via the '/_<project>_/...' alias. A relative import sometimes
 * even resolves under tsc, but it breaks the studio path convention — and it is the typical way the
 * model tries to silence a not-yet-materialized alias import (TS2792 hint, run task2/102049: six
 * controllers rewritten to '../../../../...' during repair). Rejected deterministically here. */
function collectRelativeImportIssues(code) {
    var issues = [];
    var re = /\b(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]*)['"]/g;
    var match;
    while ((match = re.exec(code)) !== null) {
        issues.push("relative import forbidden -> '".concat(match[1], "'; import via the '/_<project>_/l1/...' alias exactly as in the context files (keep the alias even if the target module is not materialized yet)"));
    }
    return issues;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function fieldNameFromRef(value) {
    var raw = String(value !== null && value !== void 0 ? value : '').trim();
    if (!raw)
        return '';
    var parts = raw.split('.');
    return parts[parts.length - 1] || raw;
}
function requiredBoundaryFields(inputContract) {
    var _a;
    var fields = new Set();
    if (!Array.isArray(inputContract))
        return fields;
    for (var _i = 0, inputContract_1 = inputContract; _i < inputContract_1.length; _i++) {
        var input = inputContract_1[_i];
        if (!isRecord(input) || input.required !== true)
            continue;
        var source = String((_a = input.source) !== null && _a !== void 0 ? _a : '');
        if (!(0, clientBoundarySources_js_1.isClientBoundarySource)(source))
            continue;
        var inputId = fieldNameFromRef(input.inputId);
        var fieldRef = fieldNameFromRef(input.fieldRef);
        if (inputId)
            fields.add(inputId);
        if (fieldRef)
            fields.add(fieldRef);
    }
    return fields;
}
function collectRequiredChecksByHandler(content) {
    var checks = new Map();
    var handlerRe = /export\s+const\s+([A-Za-z0-9_$]+)\s*:\s*BffHandler\s*=\s*async[\s\S]*?=>\s*\{([\s\S]*?)\n\};/g;
    var handlerMatch;
    while ((handlerMatch = handlerRe.exec(content)) !== null) {
        var fields = new Set();
        var body = handlerMatch[2];
        var errorRe = /new\s+AppError\(([\s\S]*?)\);/g;
        var errorMatch = void 0;
        while ((errorMatch = errorRe.exec(body)) !== null) {
            var call = errorMatch[1];
            if (!/\b(required|obrigat[oó]ri[oa]|required field|campo obrigat[oó]ri[oa])\b/i.test(call))
                continue;
            // Accept dotted paths ('movement.movementType') and compare by the LAST segment — a dotted
            // field must not evade the boundary check (lesson task2/102049: adjustStockLevel).
            var fieldMatch = call.match(/field\s*:\s*['"]([A-Za-z0-9_$.]+)['"]/);
            if (fieldMatch)
                fields.add(fieldMatch[1].split('.').pop());
        }
        checks.set(handlerMatch[1], fields);
    }
    return checks;
}
function collectExportedHandlers(content) {
    var handlers = new Set();
    var re = /export\s+const\s+([A-Za-z0-9_$]+)\s*:\s*BffHandler\b/g;
    var match;
    while ((match = re.exec(content)) !== null)
        handlers.add(match[1]);
    return handlers;
}
function collectRouteHandlers(content) {
    var routes = new Map();
    var re = /\{\s*key\s*:\s*['"]([^'"]+)['"]\s*,\s*handler\s*:\s*([A-Za-z0-9_$]+)/g;
    var match;
    while ((match = re.exec(content)) !== null)
        routes.set(match[1], match[2]);
    return routes;
}
function normalizeRuleId(rule) {
    return rule.split(':')[0].trim();
}
function collectUsecaseRules(data) {
    if (!isRecord(data))
        return [];
    var rules = new Set(readStringArray(data.rulesApplied).map(normalizeRuleId).filter(Boolean));
    var functions = Array.isArray(data.functions) ? data.functions : [];
    for (var _i = 0, functions_1 = functions; _i < functions_1.length; _i++) {
        var fn = functions_1[_i];
        if (!isRecord(fn))
            continue;
        for (var _a = 0, _b = readStringArray(fn.rulesApplied).map(normalizeRuleId).filter(Boolean); _a < _b.length; _a++) {
            var rule = _b[_a];
            rules.add(rule);
        }
    }
    return __spreadArray([], rules, true).filter(Boolean);
}
// ── l4 v2: workspace-controller coherence (B7) ──────────────────────────────────
// The v2 controller is emitted DETERMINISTICALLY (no .defs.ts). "Rotas esperadas = bffCalls do
// workspace": every bffCall must have an exported handler `<ws><Bff>Handler`, registered in `routes`
// by its `<bffId>Route` const. Pure so validate-all's check is unit-tested (bffCall sem handler / rota
// órfã fixtures) without importing the heavy runtime graph.
function capitalizeFirst(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
function collectV2ControllerCoherenceIssues(workspaces, controllerSources) {
    var issues = [];
    for (var _i = 0, workspaces_1 = workspaces; _i < workspaces_1.length; _i++) {
        var ws = workspaces_1[_i];
        if (!ws.bffCalls.length)
            continue;
        var src = controllerSources.get(ws.workspaceId.toLowerCase());
        if (!src) {
            issues.push("v2 controller ".concat(ws.workspaceId, " -> .ts not generated for the workspace"));
            continue;
        }
        var exported = collectExportedHandlers(src);
        for (var _a = 0, _b = ws.bffCalls; _a < _b.length; _a++) {
            var bff = _b[_a];
            var handlerName = "".concat(ws.workspaceId).concat(capitalizeFirst(bff.bffId), "Handler");
            if (!exported.has(handlerName))
                issues.push("v2 controller ".concat(ws.workspaceId, " -> bffCall ").concat(bff.bffId, " has no handler ").concat(handlerName));
            else if (!new RegExp("handler:\\s*".concat(escapeRegExp(handlerName), "\\b")).test(src))
                issues.push("v2 controller ".concat(ws.workspaceId, " -> bffCall ").concat(bff.bffId, " handler not registered in routes"));
            if (!new RegExp("\\b".concat(escapeRegExp(bff.bffId), "Route\\b")).test(src))
                issues.push("v2 controller ".concat(ws.workspaceId, " -> bffCall ").concat(bff.bffId, " route const ").concat(bff.bffId, "Route missing (rota \u00F3rf\u00E3)"));
        }
    }
    return issues;
}
