"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-http/agentCbHttpController.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.createAgent = createAgent;
var cbShared_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbShared.js");
var cbMaterializeIo_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js");
var cbControllerEmit_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbControllerEmit.js");
var cbContracts_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbContracts.js");
var ALL_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'inProgress', 'done'];
// Item 5 — boundary DTO (adapter HTTP owns the wire shape). The DTO .ts is a thin alias of the
// usecase output type + identity toDto: it is the projection SEAM (the ownership boundary), so the day
// a usecase goes domain-shaped only toDto changes and the public contract + frontend stay put. Kept as
// an alias (not a hand-mirrored interface) so it is deterministic and always compiles. The top-level
// `responseShape` copied into the controller defs is the single source the frontend contract derives
// from (killing the l4 re-inference drift). Nested item schemas are NOT carried yet (they live only in
// usecase-defs prose) — deferred; top-level fixes every reported bug and every task2 acceptance case.
var HTTP_DTO_FOLDER_SUFFIX = 'layer_1_external/adapters/http/dto';
function dtoFileInfo(module, ownerId) {
    return { project: mls.actualProject || 0, level: 1, folder: "".concat(module, "/").concat(HTTP_DTO_FOLDER_SUFFIX), shortName: (0, cbShared_js_1.lowerFirst)(ownerId), extension: '.defs.ts' };
}
/** Top-level wire shape from the usecase output field list (object with named fields; each field kept
 *  as array | object | scalar). The frontend copies this instead of re-inferring the shape from l4. */
function buildResponseShape(output) {
    if (!Array.isArray(output) || output.length === 0)
        return undefined;
    return { kind: 'object', fields: output.map(function (f) { return ({ name: f.name, type: f.type, required: f.required }); }) };
}
function renderDtoTs(module, ownerId, outputTypeName) {
    var project = mls.actualProject || 0;
    var dtoName = "".concat((0, cbShared_js_1.capitalize)(ownerId), "ResponseDto");
    var usecaseImport = "/_".concat(project, "_/l1/").concat(module, "/layer_2_application/usecases/").concat((0, cbShared_js_1.lowerFirst)(ownerId), ".js");
    return [
        "/// <mls fileReference=\"_".concat(project, "_/l1/").concat(module, "/").concat(HTTP_DTO_FOLDER_SUFFIX, "/").concat((0, cbShared_js_1.lowerFirst)(ownerId), ".ts\" enhancement=\"_blank\"/>"),
        "",
        "// Boundary DTO for the ".concat(ownerId, " routine \u2014 the wire shape owned by the HTTP adapter. Alias of the"),
        "// usecase output today (toDto is identity); the seam lets the public contract diverge from the",
        "// usecase later without touching the frontend. Frontend copies the shape from the controller defs.",
        "import type { ".concat(outputTypeName, " } from '").concat(usecaseImport, "';"),
        "",
        "export type ".concat(dtoName, " = ").concat(outputTypeName, ";"),
        "",
        "export function toDto(result: ".concat(outputTypeName, "): ").concat(dtoName, " {"),
        "  return result;",
        "}",
        "",
    ].join('\n');
}
var AGENT_NAME = 'agentCbHttpController';
function createAgent() {
    return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-http', agentDescription: 'Generate BFF http controllers from l4 (usecase-driven; contract optional)', visibility: 'private', beforePromptStep: beforePromptStep };
}
/** Page ids that already have a frontend contract (optional Output refinement). */
function contractPageIds() {
    return __awaiter(this, void 0, void 0, function () {
        var project, ids, _i, _a, file, sn;
        return __generator(this, function (_b) {
            project = mls.actualProject || 0;
            ids = new Set();
            for (_i = 0, _a = Object.values(mls.stor.files); _i < _a.length; _i++) {
                file = _a[_i];
                if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted')
                    continue;
                if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/web/contracts'))
                    continue;
                sn = String(file.shortName || '');
                if (sn)
                    ids.add(sn);
            }
            return [2 /*return*/, ids];
        });
    });
}
/** First `export const … = {…} as const;` — the artifact block (parseDefsSource spans both exports). */
function parseArtifactData(content) {
    var s = content.indexOf('= ');
    var e = content.indexOf(' as const;');
    if (s === -1 || e <= s)
        return undefined;
    try {
        var o = JSON.parse(content.slice(s + 2, e));
        if (!(0, cbShared_js_1.isRecord)(o))
            return undefined;
        return (0, cbShared_js_1.isRecord)(o.data) ? o.data : o;
    }
    catch (_a) {
        return undefined;
    }
}
/** Read each generated usecase's EXPORTED functions from its saved defs, keyed by usecaseId. The
 * controller binds to these real names so it never imports a function the usecase did not produce. */
function readUsecaseFunctions() {
    return __awaiter(this, void 0, void 0, function () {
        var project, map, _i, _a, file, data, _b, _c, usecaseId, fns, parsed;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    project = mls.actualProject || 0;
                    map = new Map();
                    _i = 0, _a = Object.values(mls.stor.files);
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/layer_2_application/usecases'))
                        return [3 /*break*/, 3];
                    _b = parseArtifactData;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    data = _b.apply(void 0, [_c.apply(void 0, [_d.sent()])]);
                    if (!data)
                        return [3 /*break*/, 3];
                    usecaseId = String(data.usecaseId || file.shortName || '');
                    fns = Array.isArray(data.functions) ? data.functions : [];
                    parsed = fns
                        .map(function (f) { return ({
                        functionName: String((f === null || f === void 0 ? void 0 : f.functionName) || ''),
                        inputTypeName: (f === null || f === void 0 ? void 0 : f.inputTypeName) ? String(f.inputTypeName) : undefined,
                        outputTypeName: (f === null || f === void 0 ? void 0 : f.outputTypeName) ? String(f.outputTypeName) : undefined,
                        kind: (f === null || f === void 0 ? void 0 : f.kind) ? String(f.kind) : undefined,
                        output: Array.isArray(f === null || f === void 0 ? void 0 : f.output)
                            ? f.output.filter(cbShared_js_1.isRecord).map(function (o) { return ({ name: String((o === null || o === void 0 ? void 0 : o.name) || ''), type: String((o === null || o === void 0 ? void 0 : o.type) || 'unknown'), required: (o === null || o === void 0 ? void 0 : o.required) === true }); }).filter(function (o) { return !!o.name; })
                            : undefined,
                    }); })
                        .filter(function (f) { return !!f.functionName; });
                    if (usecaseId && parsed.length)
                        map.set(usecaseId, parsed);
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, map];
            }
        });
    });
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, contracts, usecaseFns, defsOnly, v2Modules, mirrored, savedV2, _i, _a, module_1, _b, _c, pendingOwners, saved, _loop_1, _d, pendingOwners_1, owner, next, v2Note, error_1, message;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 13, , 14]);
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(ALL_STATUSES)];
                case 1:
                    scan = _e.sent();
                    return [4 /*yield*/, contractPageIds()];
                case 2:
                    contracts = _e.sent();
                    return [4 /*yield*/, readUsecaseFunctions()];
                case 3:
                    usecaseFns = _e.sent();
                    defsOnly = (0, cbShared_js_1.readCliCommand)(context) === 'rebuild-defs';
                    v2Modules = new Set(scan.workspaces.map(function (w) { return w.moduleName; }).filter(Boolean));
                    mirrored = 0, savedV2 = 0;
                    if (!!defsOnly) return [3 /*break*/, 8];
                    _i = 0, _a = scan.moduleNames;
                    _e.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    module_1 = _a[_i];
                    if (!v2Modules.has(module_1))
                        return [3 /*break*/, 7];
                    _b = mirrored;
                    return [4 /*yield*/, mirrorL4ContractsToL1(scan, module_1)];
                case 5:
                    mirrored = _b + _e.sent();
                    _c = savedV2;
                    return [4 /*yield*/, emitWorkspaceControllers(scan, module_1, usecaseFns)];
                case 6:
                    savedV2 = _c + _e.sent();
                    _e.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 4];
                case 8:
                    pendingOwners = scan.owners.filter(function (o) { return o.todoStatus === 'toCreate' || o.todoStatus === 'inProgress'; });
                    saved = 0;
                    _loop_1 = function (owner) {
                        var ownerId, module_2, routePageId, outputSource, fns, handlers, routes, _f, fns_1, fn, handlerName, canonicalKey_1, dispatcherName, fn, handlerName, routeKey, soleFn, responseShape, dtoRefs, dtoMeta, data, fi, dependsFiles, pipeline;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    ownerId = owner.id;
                                    if (!ownerId)
                                        return [2 /*return*/, "continue"];
                                    // Only OPERATIONS are BFF command owners. Workflows are pure orchestration — no controller/command.
                                    if (owner.kind !== 'operation')
                                        return [2 /*return*/, "continue"];
                                    // v2 modules are handled deterministically above (per workspace) — never emit per-operation defs for them.
                                    if (v2Modules.has(owner.moduleName))
                                        return [2 /*return*/, "continue"];
                                    module_2 = owner.moduleName || scan.moduleNames[0] || 'unknown';
                                    routePageId = owner.pageId || ownerId;
                                    outputSource = contracts.has(routePageId) ? 'contract' : 'usecase';
                                    fns = usecaseFns.get(ownerId) || [];
                                    handlers = [];
                                    routes = [];
                                    if (fns.length > 1) {
                                        // A usecase exposing several functions -> one command/route per function (1:1 function<->command).
                                        for (_f = 0, fns_1 = fns; _f < fns_1.length; _f++) {
                                            fn = fns_1[_f];
                                            handlerName = "".concat(module_2).concat((0, cbShared_js_1.capitalize)(fn.functionName), "Handler");
                                            handlers.push({
                                                handlerName: handlerName,
                                                command: fn.functionName,
                                                usecaseRef: fn.functionName,
                                                inputTypeName: fn.inputTypeName,
                                                kind: fn.kind || owner.opKind || 'command',
                                                inputContract: owner.inputs,
                                                contextResolution: owner.contextResolution,
                                                accessPattern: owner.accessPattern,
                                            });
                                            routes.push({ key: "".concat(module_2, ".").concat(routePageId, ".").concat(fn.functionName), handlerName: handlerName });
                                        }
                                        canonicalKey_1 = owner.bffName || "".concat(module_2, ".").concat(routePageId, ".").concat(owner.commandName || ownerId);
                                        if (!routes.some(function (r) { return r.key === canonicalKey_1; })) {
                                            dispatcherName = "".concat(module_2).concat((0, cbShared_js_1.capitalize)(owner.commandName || ownerId), "Handler");
                                            handlers.push({
                                                handlerName: dispatcherName,
                                                command: owner.commandName || ownerId,
                                                usecaseRef: fns.map(function (f) { return f.functionName; }).join(' | '),
                                                kind: 'dispatcher',
                                                inputContract: owner.inputs,
                                                contextResolution: owner.contextResolution,
                                                accessPattern: owner.accessPattern,
                                            });
                                            routes.push({ key: canonicalKey_1, handlerName: dispatcherName });
                                        }
                                    }
                                    else {
                                        fn = fns[0];
                                        handlerName = "".concat(module_2).concat((0, cbShared_js_1.capitalize)(ownerId), "Handler");
                                        routeKey = owner.bffName || "".concat(module_2, ".").concat(routePageId, ".").concat(owner.commandName || ownerId);
                                        handlers.push({
                                            handlerName: handlerName,
                                            command: owner.commandName || ownerId,
                                            usecaseRef: (fn === null || fn === void 0 ? void 0 : fn.functionName) || ownerId,
                                            inputTypeName: fn === null || fn === void 0 ? void 0 : fn.inputTypeName,
                                            kind: (fn === null || fn === void 0 ? void 0 : fn.kind) || owner.opKind || 'command',
                                            inputContract: owner.inputs,
                                            contextResolution: owner.contextResolution,
                                            accessPattern: owner.accessPattern,
                                        });
                                        routes.push({ key: routeKey, handlerName: handlerName });
                                    }
                                    soleFn = fns.length <= 1 ? fns[0] : undefined;
                                    responseShape = soleFn ? buildResponseShape(soleFn.output) : undefined;
                                    dtoRefs = [];
                                    dtoMeta = {};
                                    if (!((soleFn === null || soleFn === void 0 ? void 0 : soleFn.outputTypeName) && !defsOnly)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedTs)(mls.actualProject || 0, 1, "".concat(module_2, "/").concat(HTTP_DTO_FOLDER_SUFFIX), (0, cbShared_js_1.lowerFirst)(ownerId), renderDtoTs(module_2, ownerId, soleFn.outputTypeName))];
                                case 1:
                                    _g.sent();
                                    outputSource = 'dto';
                                    dtoRefs.push((0, cbShared_js_1.dtsRef)(dtoFileInfo(module_2, ownerId)));
                                    dtoMeta = { dtoTypeName: "".concat((0, cbShared_js_1.capitalize)(ownerId), "ResponseDto"), dtoModulePath: "_".concat(mls.actualProject || 0, "_/l1/").concat(module_2, "/").concat(HTTP_DTO_FOLDER_SUFFIX, "/").concat((0, cbShared_js_1.lowerFirst)(ownerId), ".js"), usecaseOutputTypeName: soleFn.outputTypeName };
                                    _g.label = 2;
                                case 2:
                                    data = __assign(__assign(__assign({ pageId: routePageId, controllerName: "".concat((0, cbShared_js_1.capitalize)(ownerId), "Controller"), ownerKind: owner.kind, // operation (workflows are skipped)
                                        outputSource: outputSource }, dtoMeta), (responseShape ? { responseShape: responseShape } : {})), { handlers: handlers, routes: routes });
                                    fi = (0, cbShared_js_1.httpControllerFileInfo)(module_2, ownerId);
                                    dependsFiles = __spreadArray([(0, cbShared_js_1.dtsRef)((0, cbShared_js_1.usecaseFileInfo)(module_2, ownerId))], dtoRefs, true);
                                    // Legacy contract-mapping path only when no DTO was emitted (DTO now owns the wire shape).
                                    if (outputSource === 'contract' && contracts.has(routePageId))
                                        dependsFiles.push("_".concat(mls.actualProject || 0, "_/l2/").concat(module_2, "/web/contracts/").concat(routePageId, ".ts"));
                                    pipeline = [(0, cbShared_js_1.buildPipelineItem)((0, cbShared_js_1.lowerFirst)(ownerId), 'httpController', fi, dependsFiles, (0, cbShared_js_1.layerSkills)('httpController.md'))];
                                    return [4 /*yield*/, (0, cbShared_js_1.saveDefs)(fi, "".concat((0, cbShared_js_1.lowerFirst)(ownerId), "Controller"), (0, cbShared_js_1.buildArtifact)('httpController', ownerId, module_2, AGENT_NAME, data), pipeline)];
                                case 3:
                                    _g.sent();
                                    saved++;
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _d = 0, pendingOwners_1 = pendingOwners;
                    _e.label = 9;
                case 9:
                    if (!(_d < pendingOwners_1.length)) return [3 /*break*/, 12];
                    owner = pendingOwners_1[_d];
                    return [5 /*yield**/, _loop_1(owner)];
                case 10:
                    _e.sent();
                    _e.label = 11;
                case 11:
                    _d++;
                    return [3 /*break*/, 9];
                case 12:
                    next = defsOnly
                        ? (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-rebuild-defs-cleanup', 'agentCbRebuildDefsCleanup', 'Limpar .ts derivados (defs-only)', { modules: scan.moduleNames })
                        : (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-materialize', 'agentCbMaterialize', 'Materializar .defs.ts -> .ts', {});
                    v2Note = v2Modules.size ? " + ".concat(savedV2, " v2 workspace controller(s), ").concat(mirrored, " l1 contract mirror(s)") : '';
                    return [2 /*return*/, [
                            next,
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "Generated ".concat(saved, " v1 controller(s)").concat(v2Note, " from l4").concat(defsOnly ? ' (defs-only: .ts skipped)' : '', ".")),
                        ]];
                case 13:
                    error_1 = _e.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(message));
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', message)]];
                case 14: return [2 /*return*/];
            }
        });
    });
}
// ── B5: mirror l4 contracts into l1 (byte-copy, header repointed) so the controller import resolves ──
function mirrorL4ContractsToL1(scan, module) {
    return __awaiter(this, void 0, void 0, function () {
        var project, n, _i, _a, c, src, out;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    project = mls.actualProject || 0;
                    n = 0;
                    _i = 0, _a = scan.contracts;
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    c = _a[_i];
                    if (c.moduleName !== module)
                        return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.getContentByMlsPath)("_".concat(project, "_/l4/").concat(module, "/contracts/").concat(c.shortName).concat(c.extension))];
                case 2:
                    src = _b.sent();
                    if (src == null)
                        return [3 /*break*/, 4];
                    out = (0, cbContracts_js_1.rewriteContractHeaderToL1)(src, project, module, c.shortName, c.extension);
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedFile)(project, 1, "".concat(module, "/contracts"), c.shortName, c.extension, out)];
                case 3:
                    if (_b.sent())
                        n++;
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, n];
            }
        });
    });
}
// ── B4: emit one deterministic controller .ts per workspace of the module (no LLM). ──
function emitWorkspaceControllers(scan, module, usecaseFns) {
    return __awaiter(this, void 0, void 0, function () {
        var project, opShapes, _i, _a, o, primaryFns, _b, usecaseFns_1, _c, op, fns, fn, actorRoleScopes, _d, _e, a, n, _f, _g, workspace, source, r;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    project = mls.actualProject || 0;
                    opShapes = new Map();
                    for (_i = 0, _a = scan.owners; _i < _a.length; _i++) {
                        o = _a[_i];
                        if (o.kind !== 'operation' || o.moduleName !== module)
                            continue;
                        opShapes.set(o.id, o.outputShape ? { kind: o.outputShape.kind, fields: o.outputShape.fields } : null);
                    }
                    primaryFns = new Map();
                    for (_b = 0, usecaseFns_1 = usecaseFns; _b < usecaseFns_1.length; _b++) {
                        _c = usecaseFns_1[_b], op = _c[0], fns = _c[1];
                        fn = fns[0];
                        if (fn)
                            primaryFns.set(op, { functionName: fn.functionName, inputTypeName: fn.inputTypeName });
                    }
                    actorRoleScopes = new Map();
                    for (_d = 0, _e = scan.actors; _d < _e.length; _d++) {
                        a = _e[_d];
                        if (a.moduleName === module)
                            actorRoleScopes.set(a.actorId, a.roleScope);
                    }
                    n = 0;
                    _f = 0, _g = scan.workspaces;
                    _h.label = 1;
                case 1:
                    if (!(_f < _g.length)) return [3 /*break*/, 4];
                    workspace = _g[_f];
                    if (workspace.moduleName !== module || !workspace.bffCalls.length)
                        return [3 /*break*/, 3];
                    source = (0, cbControllerEmit_js_1.renderWorkspaceController)({ project: project, moduleName: module, workspace: workspace, opShapes: opShapes, usecaseFns: primaryFns, actorRoleScopes: actorRoleScopes }).source;
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedTs)(project, 1, "".concat(module, "/layer_1_external/adapters/http/controllers"), workspace.workspaceId, source)];
                case 2:
                    r = _h.sent();
                    if (r.ok)
                        n++;
                    _h.label = 3;
                case 3:
                    _f++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, n];
            }
        });
    });
}
