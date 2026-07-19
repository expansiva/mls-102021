"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.readActorsField = readActorsField;
exports.readModuleActors = readModuleActors;
exports.parseWorkspaceDefs = parseWorkspaceDefs;
// l4 v2 workspace/bffCall model + PURE parsers (no file I/O, no side-effecting imports). Kept in its own
// module so it stays unit-testable: cbShared pulls in libStor -> libModel whose top-level
// `mls.events.addEventListener` crashes the l2 test stub. Everything here depends only on isRecord.
// The controller (gen-http v2, B4) is derived deterministically from these — see newSolution_10 §A2/A5.
var cbPlanner_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js");
function readString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function readStringArray(value) {
    return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}
// Actors: l4 v2 declares `actors: string[]`; v1 `actor: string` (folded to a single-element array).
function readActorsField(obj) {
    var plural = readStringArray(obj.actors);
    if (plural.length)
        return plural;
    var singular = readString(obj.actor);
    return singular ? [singular] : [];
}
// Module actors file (l4 v2): `actors` is an array of objects, not strings — read separately.
function readModuleActors(obj, moduleName) {
    var arr = Array.isArray(obj.actors) ? obj.actors.filter(cbPlanner_js_1.isRecord) : [];
    return arr
        .map(function (a) {
        var actorId = readString(a.actorId);
        if (!actorId)
            return null;
        return { actorId: actorId, title: readString(a.title) || actorId, roleScope: readString(a.roleScope), moduleName: moduleName };
    })
        .filter(function (a) { return a !== null; });
}
// Parse a l4 v2 workspace defs into a CbWorkspace (bffCalls + projection). Pure/testable: no file I/O.
function parseWorkspaceDefs(obj, moduleName) {
    if (!(0, cbPlanner_js_1.isRecord)(obj))
        return null;
    var workspaceId = readString(obj.workspaceId);
    if (!workspaceId)
        return null;
    var bffCalls = (Array.isArray(obj.bffCalls) ? obj.bffCalls.filter(cbPlanner_js_1.isRecord) : [])
        .map(function (c) { return parseBffCall(c, moduleName, workspaceId); })
        .filter(function (c) { return c !== null; });
    var usedOps = __spreadArray([], new Set(bffCalls.flatMap(function (c) { return c.uses.map(function (u) { return u.operationId; }); }).filter(Boolean)), true);
    return {
        workspaceId: workspaceId,
        moduleName: moduleName,
        title: readString(obj.title) || workspaceId,
        actors: readActorsField(obj),
        kind: readString(obj.kind),
        purpose: readString(obj.purpose),
        bffCalls: bffCalls,
        operationIds: usedOps.length ? usedOps : readStringArray(obj.operationIds),
    };
}
function parseBffCall(obj, moduleName, workspaceId) {
    var bffId = readString(obj.bffId);
    if (!bffId)
        return null;
    var kind = readString(obj.kind) === 'command' ? 'command' : 'query';
    var uses = (Array.isArray(obj.uses) ? obj.uses.filter(cbPlanner_js_1.isRecord) : [])
        .map(function (u) {
        var operationId = readString(u.operationId);
        return operationId ? __assign({ operationId: operationId }, (u.optional === true ? { optional: true } : {})) : null;
    })
        .filter(function (u) { return u !== null; });
    var input = (Array.isArray(obj.input) ? obj.input.filter(cbPlanner_js_1.isRecord) : [])
        .map(function (i) {
        var name = readString(i.name);
        if (!name)
            return null;
        var field = { name: name, from: readString(i.from) };
        if (readString(i.type))
            field.type = readString(i.type);
        return field;
    })
        .filter(function (i) { return i !== null; });
    var output = parseBffCallOutput(obj.output);
    var route = readString(obj.route) || "".concat(moduleName, ".").concat(workspaceId, ".").concat(bffId);
    return __assign(__assign({ bffId: bffId, kind: kind, uses: uses, input: input }, (output ? { output: output } : {})), { route: route });
}
function parseBffCallOutput(value) {
    if (!(0, cbPlanner_js_1.isRecord)(value))
        return undefined;
    var kind = readString(value.kind);
    var fields = (Array.isArray(value.fields) ? value.fields : [])
        .map(parseBffCallOutputField)
        .filter(function (f) { return f !== null; });
    if (!kind || fields.length === 0)
        return undefined;
    return { kind: kind, fields: fields };
}
function parseBffCallOutputField(value) {
    if (!(0, cbPlanner_js_1.isRecord)(value))
        return null;
    var name = readString(value.name);
    if (!name)
        return null;
    var field = { name: name };
    if (readString(value.from))
        field.from = readString(value.from);
    if (readString(value.type))
        field.type = readString(value.type);
    if (value.required === true)
        field.required = true;
    if ((0, cbPlanner_js_1.isRecord)(value.item) && Array.isArray(value.item.fields)) {
        var fields = value.item.fields.map(parseBffCallOutputField).filter(function (f) { return f !== null; });
        if (fields.length)
            field.item = { fields: fields };
    }
    return field;
}
