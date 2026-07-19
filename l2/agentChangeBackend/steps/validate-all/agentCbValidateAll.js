"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/validate-all/agentCbValidateAll.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var cbRepair_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbRepair.js");
var cbMaterializeIo_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js");
var cbMaterializeCore_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js");
var cbSyntaxValidation_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbSyntaxValidation.js");
var cbMdmGuards_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMdmGuards.js");
var cbComponentValidators_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js");
// Parse the FIRST `export const ... = {...} as const;` (the artifact). NB: parseDefsSource in cbShared
// uses the LAST ` as const;`, which on an l1 defs (artifact + pipeline) would span both exports and
// fail; here we need only the artifact's data block.
function parseArtifact(content) {
    var s = content.indexOf('= ');
    var e = content.indexOf(' as const;');
    if (s === -1 || e <= s)
        return undefined;
    try {
        var o = JSON.parse(content.slice(s + 2, e));
        return (0, cbShared_js_1.isRecord)(o) ? o : undefined;
    }
    catch (_a) {
        return undefined;
    }
}
function createAgent() {
    return { agentName: 'agentCbValidateAll', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/validate-all', agentDescription: 'Deterministic non-blocking l1 coverage/integrity report', visibility: 'private', beforePromptStep: beforePromptStep };
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var preSeeds, scan, project_1, moduleName_1, moduleFolderPrefix, moduleWorkspaces, isV2, l1Defs, mdmTableViolations, mdmIds, portDefs, domainDefs, mdmDomainArtifacts, usecases, usecaseFnNames, controllers, tsSet, tsFiles, defsFiles, syntaxIssues, repairTargets_2, mappedMsgs_1, addRepair_1, defRefByLc, defRefOf, importReqs, usecaseSources, controllerSources, persistenceSources, _i, _a, file, folder0, shortName0, content, _b, _c, _d, issue, _e, _f, req, _g, _h, issue, compact, _j, _k, issue, folder, shortName, artifact, _l, _m, data, fns, artifact, _o, _p, data, handlers, routes, missing_1, _q, mdmDomainArtifacts_1, artifact, _r, usecases_1, uc, _s, _t, p, portSn, domSn, _u, controllers_1, c, fns, _v, _w, ref, _loop_1, _x, controllers_2, c, _loop_2, _y, _z, owner, _0, _1, issue, _2, defsFiles_1, d, msg, defsMs, tsMs, msg, _loop_3, _3, syntaxIssues_1, issue, _4, importReqs_1, req, msg, msg, msg, _5, defsFiles_2, d, compileErrors, _6, _7, err, msg, controllersFolder, _8, moduleWorkspaces_1, ws, errs, _9, _10, err, _11, usecases_2, uc, source, _12, _13, rule, msg, ucDefRef, declaredTableNames, _14, persistenceSources_1, _15, source, _16, _17, m, _loop_4, _18, persistenceSources_2, _19, sn, source, warnings, normalizedDefs, _20, defsFiles_3, d, key, names, _21, normalizedDefs_1, _22, key, names, defsKeys, expectedTsWithoutDefs, expectedTsFolderWithoutDefs, _23, tsFiles_1, ts, tsKey, expectedOperationIds, _24, defsFiles_4, d, unique, unmapped, allMapped, state, _25, repairTargets_1, _26, defRef, findings, trace_1, reason, historyNote, trace_2, trace, finalState, repairNote, okTrace, error_1, message;
        var _27, _28, _29;
        return __generator(this, function (_30) {
            switch (_30.label) {
                case 0:
                    _30.trys.push([0, 31, , 32]);
                    preSeeds = false;
                    try {
                        preSeeds = ((_27 = JSON.parse(String(step.prompt || '{}'))) === null || _27 === void 0 ? void 0 : _27.preSeeds) === true;
                    }
                    catch ( /* post-register validation */_31) { /* post-register validation */ }
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _30.sent();
                    project_1 = mls.actualProject || 0;
                    moduleName_1 = scan.moduleNames[0] || 'unknown';
                    moduleFolderPrefix = "".concat(moduleName_1, "/");
                    moduleWorkspaces = scan.workspaces.filter(function (w) { return w.moduleName === moduleName_1; });
                    isV2 = moduleWorkspaces.length > 0;
                    l1Defs = 0;
                    mdmTableViolations = 0;
                    mdmIds = new Set(scan.entities.filter(function (e) { return e.kind === 'mdm'; }).map(function (e) { return e.entityId.toLowerCase(); }));
                    portDefs = new Set();
                    domainDefs = new Set();
                    mdmDomainArtifacts = [];
                    usecases = [];
                    usecaseFnNames = new Map();
                    controllers = [];
                    tsSet = new Set();
                    tsFiles = [];
                    defsFiles = [];
                    syntaxIssues = [];
                    repairTargets_2 = new Map();
                    mappedMsgs_1 = new Set();
                    addRepair_1 = function (defRef, msg) {
                        var list = repairTargets_2.get(defRef) || [];
                        list.push(msg);
                        repairTargets_2.set(defRef, list);
                        mappedMsgs_1.add(msg);
                    };
                    defRefByLc = new Map();
                    defRefOf = function (folder, real) { return "_".concat(project_1, "_/l1/").concat(folder, "/").concat(real, ".defs.ts"); };
                    importReqs = [];
                    usecaseSources = new Map();
                    controllerSources = new Map();
                    persistenceSources = new Map();
                    _i = 0, _a = Object.values(mls.stor.files);
                    _30.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 11];
                    file = _a[_i];
                    if (!file || file.project !== project_1 || file.level !== 1 || file.status === 'deleted')
                        return [3 /*break*/, 10];
                    folder0 = String(file.folder || '');
                    // A Studio project can retain artifacts from a previous module. Validation must only compare
                    // the module described by the current scan; otherwise same-named cafeFlow/petShop files are
                    // cross-paired and turn a clean current module into false blocking findings.
                    if (!folder0.startsWith(moduleFolderPrefix))
                        return [3 /*break*/, 10];
                    shortName0 = String(file.shortName || '');
                    if (!(file.extension === '.ts' && !shortName0.endsWith('.defs') && !shortName0.endsWith('.d'))) return [3 /*break*/, 4];
                    _b = String;
                    return [4 /*yield*/, file.getContent()];
                case 3:
                    content = _b.apply(void 0, [_30.sent()]);
                    tsSet.add("".concat(folder0, "::").concat(shortName0.toLowerCase()));
                    tsFiles.push({ folder: folder0, shortName: shortName0.toLowerCase(), real: shortName0 });
                    for (_c = 0, _d = (0, cbSyntaxValidation_js_1.syntaxDiagnostics)(content); _c < _d.length; _c++) {
                        issue = _d[_c];
                        syntaxIssues.push({ folder: folder0, shortName: shortName0.toLowerCase(), message: "TS5076 -> ".concat(folder0, "/").concat(shortName0, ".ts ").concat(issue) });
                    }
                    if (folder0.endsWith('/layer_2_application/usecases')) {
                        usecaseSources.set(shortName0.toLowerCase(), content);
                        if (/\/_\d+_\/l1\/[^'"]*\/layer_3_domain\/rules\//.test(content)) {
                            importReqs.push({
                                from: "".concat(folder0, "/").concat(shortName0),
                                key: '__invalid_rule_import__',
                                target: 'rulesApplied must be applied inline; layer_3_domain/rules/* is not generated by agentChangeBackend',
                            });
                        }
                    }
                    if (folder0.endsWith('/adapters/http/controllers'))
                        controllerSources.set(shortName0.toLowerCase(), content);
                    if (folder0.endsWith('/adapters/persistence'))
                        persistenceSources.set(shortName0.toLowerCase(), content);
                    for (_e = 0, _f = (0, cbComponentValidators_js_1.collectL1Imports)(content, project_1); _e < _f.length; _e++) {
                        req = _f[_e];
                        importReqs.push({ from: "".concat(folder0, "/").concat(shortName0), key: req.key, target: req.target });
                    }
                    // Alias-only imports (same rule as the materialize worker): a relative import escapes
                    // collectL1Imports entirely, so without this check it would pass the gate unseen.
                    for (_g = 0, _h = (0, cbComponentValidators_js_1.collectRelativeImportIssues)(content); _g < _h.length; _g++) {
                        issue = _h[_g];
                        importReqs.push({ from: "".concat(folder0, "/").concat(shortName0), key: '__relative_import__', target: issue });
                    }
                    compact = content.replace(/\s+/g, ' ');
                    if (/mdmEntityIndex\.findMany\(\s*\{[^}]*where\s*:\s*\{[^}]*\b(entityType|entityId|productId|warehouseId)\s*:/.test(compact)) {
                        importReqs.push({
                            from: "".concat(folder0, "/").concat(shortName0),
                            key: '__invalid_mdm_index_filter__',
                            target: 'mdmEntityIndex uses invented fields; use MdmEntityIndexRecord fields and load module data from mdmDocument.details',
                        });
                    }
                    if (/mdmRelationship/.test(content) && /\b(source_entity_|target_entity_)/.test(content)) {
                        importReqs.push({
                            from: "".concat(folder0, "/").concat(shortName0),
                            key: '__invalid_mdm_relationship_shape__',
                            target: 'mdmRelationship uses invented source_entity/target_entity fields; use MdmRelationshipRecord fromId/toId/type',
                        });
                    }
                    for (_j = 0, _k = (0, cbMdmGuards_js_1.collectRawMdmAccessIssues)(content); _j < _k.length; _j++) {
                        issue = _k[_j];
                        importReqs.push({
                            from: "".concat(folder0, "/").concat(shortName0),
                            key: '__invalid_raw_mdm_access__',
                            target: issue,
                        });
                    }
                    return [3 /*break*/, 10];
                case 4:
                    if (file.extension !== '.defs.ts')
                        return [3 /*break*/, 10];
                    l1Defs++;
                    folder = folder0;
                    shortName = shortName0.toLowerCase();
                    defsFiles.push({ folder: folder, shortName: shortName, real: shortName0 });
                    if (folder.endsWith('/layer_2_application/usecases'))
                        defRefByLc.set("usecases::".concat(shortName), defRefOf(folder, shortName0));
                    if (folder.endsWith('/adapters/http/controllers'))
                        defRefByLc.set("controllers::".concat(shortName), defRefOf(folder, shortName0));
                    if (folder.includes('/adapters/persistence') && mdmIds.has(shortName))
                        mdmTableViolations++;
                    if (!folder.endsWith('/layer_2_application/ports')) return [3 /*break*/, 5];
                    portDefs.add(shortName);
                    return [3 /*break*/, 10];
                case 5:
                    if (!folder.endsWith('/layer_3_domain/entities')) return [3 /*break*/, 6];
                    if (mdmIds.has(shortName))
                        mdmDomainArtifacts.push("".concat(folder, "/").concat(shortName, ".defs.ts"));
                    else
                        domainDefs.add(shortName);
                    return [3 /*break*/, 10];
                case 6:
                    if (!folder.endsWith('/layer_2_application/usecases')) return [3 /*break*/, 8];
                    _l = parseArtifact;
                    _m = String;
                    return [4 /*yield*/, file.getContent()];
                case 7:
                    artifact = _l.apply(void 0, [_m.apply(void 0, [_30.sent()])]);
                    data = artifact && (0, cbShared_js_1.isRecord)(artifact.data) ? artifact.data : undefined;
                    usecases.push({ id: shortName, ports: data ? (0, cbShared_js_1.readStringArray)(data.ports) : [], rulesApplied: (0, cbComponentValidators_js_1.collectUsecaseRules)(data) });
                    fns = data && Array.isArray(data.functions) ? data.functions : [];
                    usecaseFnNames.set(shortName, new Set(fns.map(function (f) { return String((f === null || f === void 0 ? void 0 : f.functionName) || ''); }).filter(Boolean)));
                    return [3 /*break*/, 10];
                case 8:
                    if (!folder.endsWith('/adapters/http/controllers')) return [3 /*break*/, 10];
                    _o = parseArtifact;
                    _p = String;
                    return [4 /*yield*/, file.getContent()];
                case 9:
                    artifact = _o.apply(void 0, [_p.apply(void 0, [_30.sent()])]);
                    data = artifact && (0, cbShared_js_1.isRecord)(artifact.data) ? artifact.data : undefined;
                    handlers = data && Array.isArray(data.handlers) ? data.handlers : [];
                    routes = data && Array.isArray(data.routes) ? data.routes : [];
                    controllers.push({
                        id: shortName,
                        refs: handlers.map(function (h) { return String((h === null || h === void 0 ? void 0 : h.usecaseRef) || ''); }).filter(Boolean),
                        handlers: handlers.filter(cbShared_js_1.isRecord).map(function (h) { return ({
                            handlerName: String((h === null || h === void 0 ? void 0 : h.handlerName) || ''),
                            inputContract: h === null || h === void 0 ? void 0 : h.inputContract,
                            usecaseRef: String((h === null || h === void 0 ? void 0 : h.usecaseRef) || ''),
                        }); }).filter(function (h) { return !!h.handlerName; }),
                        routes: routes.filter(cbShared_js_1.isRecord).map(function (r) { return ({
                            key: String((r === null || r === void 0 ? void 0 : r.key) || ''),
                            handlerName: String((r === null || r === void 0 ? void 0 : r.handlerName) || ''),
                        }); }).filter(function (r) { return !!r.key && !!r.handlerName; }),
                    });
                    _30.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 2];
                case 11:
                    missing_1 = [];
                    for (_q = 0, mdmDomainArtifacts_1 = mdmDomainArtifacts; _q < mdmDomainArtifacts_1.length; _q++) {
                        artifact = mdmDomainArtifacts_1[_q];
                        missing_1.push("mdm local domain artifact forbidden -> ".concat(artifact));
                    }
                    for (_r = 0, usecases_1 = usecases; _r < usecases_1.length; _r++) {
                        uc = usecases_1[_r];
                        for (_s = 0, _t = uc.ports; _s < _t.length; _s++) {
                            p = _t[_s];
                            if (mdmIds.has(p.toLowerCase()))
                                continue; // mdm = master data read by id via 102034; no local port/entity
                            portSn = "".concat((0, cbShared_js_1.lowerFirst)(p), "Repository").toLowerCase();
                            domSn = (0, cbShared_js_1.lowerFirst)(p).toLowerCase();
                            if (!portDefs.has(portSn))
                                missing_1.push("usecase ".concat(uc.id, " -> missing port ").concat((0, cbShared_js_1.lowerFirst)(p), "Repository"));
                            if (!domainDefs.has(domSn))
                                missing_1.push("usecase ".concat(uc.id, " -> missing entity ").concat((0, cbShared_js_1.lowerFirst)(p)));
                        }
                    }
                    // COHERENCE (item 3): every controller handler must reference a function the usecase actually
                    // exports. Catches the "controller imports an export the usecase never produced" break (orderFlow).
                    for (_u = 0, controllers_1 = controllers; _u < controllers_1.length; _u++) {
                        c = controllers_1[_u];
                        fns = usecaseFnNames.get(c.id);
                        for (_v = 0, _w = c.refs; _v < _w.length; _v++) {
                            ref = _w[_v];
                            if (ref.includes(' | '))
                                continue; // dispatcher handler delegates to the concrete per-function handlers
                            if (!fns) {
                                missing_1.push("controller ".concat(c.id, " -> usecase defs not found"));
                                break;
                            }
                            if (!fns.has(ref))
                                missing_1.push("controller ".concat(c.id, " -> usecase export '").concat(ref, "' not found (has: ").concat(__spreadArray([], fns, true).join(', ') || 'none', ")"));
                        }
                    }
                    _loop_1 = function (c) {
                        var handlerNames = new Set(c.handlers.map(function (h) { return h.handlerName; }));
                        for (var _32 = 0, _33 = c.routes; _32 < _33.length; _32++) {
                            var route = _33[_32];
                            if (!handlerNames.has(route.handlerName))
                                missing_1.push("controller ".concat(c.id, " -> route ").concat(route.key, " points to missing handler ").concat(route.handlerName));
                        }
                        var source = controllerSources.get(c.id);
                        if (!source)
                            return "continue";
                        var controllerDefRef = defRefByLc.get("controllers::".concat(c.id));
                        var pushControllerTsIssue = function (msg) {
                            missing_1.push(msg);
                            if (controllerDefRef)
                                addRepair_1(controllerDefRef, msg); // bad .ts -> re-materializable
                        };
                        var exportedHandlers = (0, cbComponentValidators_js_1.collectExportedHandlers)(source);
                        var emittedRoutes = (0, cbComponentValidators_js_1.collectRouteHandlers)(source);
                        var requiredChecks = (0, cbComponentValidators_js_1.collectRequiredChecksByHandler)(source);
                        for (var _34 = 0, _35 = c.handlers; _34 < _35.length; _34++) {
                            var handler = _35[_34];
                            if (!exportedHandlers.has(handler.handlerName))
                                pushControllerTsIssue("controller ".concat(c.id, " -> handler ").concat(handler.handlerName, " not exported in .ts"));
                            var allowedRequired = (0, cbComponentValidators_js_1.requiredBoundaryFields)(handler.inputContract);
                            for (var _36 = 0, _37 = (_28 = requiredChecks.get(handler.handlerName)) !== null && _28 !== void 0 ? _28 : []; _36 < _37.length; _36++) {
                                var checked = _37[_36];
                                if (!allowedRequired.has(checked)) {
                                    pushControllerTsIssue("controller ".concat(c.id, " -> handler ").concat(handler.handlerName, " requires '").concat(checked, "' outside l4 inputContract"));
                                }
                            }
                        }
                        for (var _38 = 0, _39 = c.routes; _38 < _39.length; _38++) {
                            var route = _39[_38];
                            var emittedHandler = emittedRoutes.get(route.key);
                            if (emittedHandler !== route.handlerName) {
                                pushControllerTsIssue("controller ".concat(c.id, " -> route ").concat(route.key, " not exported with handler ").concat(route.handlerName));
                            }
                        }
                    };
                    // ROUTES + HANDLER BOUNDARY: every route from the controller defs must be present in the generated
                    // .ts and point to an exported handler. Required field validation must stay within the public L4
                    // inputContract; contextResolution-only fields are resolved context, not mandatory request params.
                    for (_x = 0, controllers_2 = controllers; _x < controllers_2.length; _x++) {
                        c = controllers_2[_x];
                        _loop_1(c);
                    }
                    // V1 canonical bffName route (no-op for v2 — its controllers have no defs, so `controllers` is empty).
                    if (!isV2) {
                        _loop_2 = function (owner) {
                            if (owner.kind !== 'operation' || !owner.id)
                                return "continue";
                            var controllerId = (0, cbShared_js_1.lowerFirst)(owner.id).toLowerCase();
                            var controller = controllers.find(function (c) { return c.id === controllerId; });
                            if (!controller)
                                return "continue";
                            var expectedRoute = owner.bffName || "".concat(moduleName_1, ".").concat(owner.pageId || owner.id, ".").concat(owner.commandName || owner.id);
                            if (!controller.routes.some(function (route) { return route.key === expectedRoute; })) {
                                missing_1.push("controller ".concat(controller.id, " -> missing canonical bffName route ").concat(expectedRoute));
                            }
                        };
                        for (_y = 0, _z = scan.owners; _y < _z.length; _y++) {
                            owner = _z[_y];
                            _loop_2(owner);
                        }
                    }
                    // V2 COHERENCE (controller x workspace): the workspace controller .ts is emitted DETERMINISTICALLY by
                    // gen-http (no .defs.ts, no repair round). Rotas esperadas = bffCalls do workspace. Blocking + clean
                    // (a finding means an emitter/upstream bug — the next full run regenerates it; materialize repair
                    // cannot). The check is a pure function in cbComponentValidators (unit-tested with violation fixtures).
                    if (isV2) {
                        for (_0 = 0, _1 = (0, cbComponentValidators_js_1.collectV2ControllerCoherenceIssues)(moduleWorkspaces, controllerSources); _0 < _1.length; _0++) {
                            issue = _1[_0];
                            missing_1.push(issue);
                        }
                    }
                    // COMPLETENESS (items 4 & 6): every .defs.ts must have its materialized .ts sibling. This is the
                    // project-level barrier the per-file Monaco compile cannot see — it stops finalize from marking the
                    // owners done while any .ts is still missing (the "finalize before materialization finished" gap).
                    for (_2 = 0, defsFiles_1 = defsFiles; _2 < defsFiles_1.length; _2++) {
                        d = defsFiles_1[_2];
                        if (!tsSet.has("".concat(d.folder, "::").concat(d.shortName))) {
                            msg = "materialization incomplete -> ".concat(d.folder, "/").concat(d.shortName, ".ts not generated from its .defs.ts");
                            missing_1.push(msg);
                            addRepair_1(defRefOf(d.folder, d.real), msg); // missing .ts -> re-materializable
                            continue;
                        }
                        defsMs = (0, cbMaterializeIo_js_1.getFileModified)(project_1, 1, d.folder, d.real, '.defs.ts');
                        tsMs = (0, cbMaterializeIo_js_1.getFileModified)(project_1, 1, d.folder, d.real, '.ts');
                        if ((0, cbMaterializeCore_js_1.isStale)(defsMs, tsMs)) {
                            msg = "materialization stale -> ".concat(d.folder, "/").concat(d.shortName, ".ts is older than its .defs.ts (failed worker masked by a previous run's output)");
                            missing_1.push(msg);
                            addRepair_1(defRefOf(d.folder, d.real), msg);
                        }
                    }
                    _loop_3 = function (issue) {
                        missing_1.push(issue.message);
                        var defs = defsFiles.find(function (d) { return d.folder === issue.folder && d.shortName === issue.shortName; });
                        if (defs)
                            addRepair_1(defRefOf(defs.folder, defs.real), issue.message);
                    };
                    // Syntax fallback is repeated at the gate: a compiler unavailable in a worker cannot turn a
                    // syntactically invalid cached output into a clean materialization result.
                    for (_3 = 0, syntaxIssues_1 = syntaxIssues; _3 < syntaxIssues_1.length; _3++) {
                        issue = syntaxIssues_1[_3];
                        _loop_3(issue);
                    }
                    // CROSS-FILE IMPORTS: every module-local l1 import in a generated .ts must resolve to a generated
                    // .ts. Root guard for hallucinated modules (e.g. importing layer_3_domain/rules/* — rules live
                    // inside the entity, that folder is never generated). Catches it deterministically before the VM build.
                    for (_4 = 0, importReqs_1 = importReqs; _4 < importReqs_1.length; _4++) {
                        req = importReqs_1[_4];
                        if (req.key === '__relative_import__') {
                            msg = "relative import -> ".concat(req.from, ".ts: ").concat(req.target);
                            missing_1.push(msg);
                            addRepair_1("_".concat(project_1, "_/l1/").concat(req.from, ".defs.ts"), msg); // bad .ts -> re-materializable
                            continue;
                        }
                        if (req.key === '__invalid_mdm_index_filter__' || req.key === '__invalid_mdm_relationship_shape__' || req.key === '__invalid_rule_import__' || req.key === '__invalid_raw_mdm_access__') {
                            msg = "platform contract violation -> ".concat(req.from, ".ts: ").concat(req.target);
                            missing_1.push(msg);
                            addRepair_1("_".concat(project_1, "_/l1/").concat(req.from, ".defs.ts"), msg); // bad .ts -> re-materializable
                            continue;
                        }
                        if (!tsSet.has(req.key)) {
                            msg = "import unresolved -> ".concat(req.from, ".ts imports '").concat(req.target, "' which was not generated");
                            missing_1.push(msg);
                            addRepair_1("_".concat(project_1, "_/l1/").concat(req.from, ".defs.ts"), msg); // hallucinated import -> re-materializable
                        }
                    }
                    _5 = 0, defsFiles_2 = defsFiles;
                    _30.label = 12;
                case 12:
                    if (!(_5 < defsFiles_2.length)) return [3 /*break*/, 15];
                    d = defsFiles_2[_5];
                    if (!tsSet.has("".concat(d.folder, "::").concat(d.shortName)))
                        return [3 /*break*/, 14]; // completeness finding already covers it
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.compileSavedTsAndGetErrors)(project_1, d.folder, d.real)];
                case 13:
                    compileErrors = _30.sent();
                    for (_6 = 0, _7 = compileErrors.slice(0, 6); _6 < _7.length; _6++) {
                        err = _7[_6];
                        msg = "compiler -> ".concat(d.folder, "/").concat(d.real, ".ts: ").concat(err);
                        missing_1.push(msg);
                        addRepair_1(defRefOf(d.folder, d.real), msg);
                    }
                    _30.label = 14;
                case 14:
                    _5++;
                    return [3 /*break*/, 12];
                case 15:
                    if (!isV2) return [3 /*break*/, 19];
                    controllersFolder = "".concat(moduleName_1, "/layer_1_external/adapters/http/controllers");
                    _8 = 0, moduleWorkspaces_1 = moduleWorkspaces;
                    _30.label = 16;
                case 16:
                    if (!(_8 < moduleWorkspaces_1.length)) return [3 /*break*/, 19];
                    ws = moduleWorkspaces_1[_8];
                    if (!controllerSources.has(ws.workspaceId.toLowerCase()))
                        return [3 /*break*/, 18];
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.compileSavedTsAndGetErrors)(project_1, controllersFolder, ws.workspaceId)];
                case 17:
                    errs = _30.sent();
                    for (_9 = 0, _10 = errs.slice(0, 6); _9 < _10.length; _9++) {
                        err = _10[_9];
                        missing_1.push("compiler -> ".concat(controllersFolder, "/").concat(ws.workspaceId, ".ts: ").concat(err));
                    }
                    _30.label = 18;
                case 18:
                    _8++;
                    return [3 /*break*/, 16];
                case 19:
                    // RULES APPLIED: if a usecase defs says a rule is applied, the materialized .ts must mention that
                    // rule id. This blocks the concrete "referenced in defs and then disappeared" class, while the
                    // explicit rule-import ban above keeps the current strategy inline.
                    for (_11 = 0, usecases_2 = usecases; _11 < usecases_2.length; _11++) {
                        uc = usecases_2[_11];
                        if (!uc.rulesApplied.length)
                            continue;
                        source = usecaseSources.get(uc.id);
                        if (!source)
                            continue;
                        for (_12 = 0, _13 = uc.rulesApplied; _12 < _13.length; _12++) {
                            rule = _13[_12];
                            if (!new RegExp("\\b".concat((0, cbComponentValidators_js_1.escapeRegExp)(rule), "\\b")).test(source)) {
                                msg = "usecase ".concat(uc.id, " -> rulesApplied '").concat(rule, "' not present in generated .ts");
                                missing_1.push(msg);
                                ucDefRef = defRefByLc.get("usecases::".concat(uc.id));
                                if (ucDefRef)
                                    addRepair_1(ucDefRef, msg); // rule dropped in .ts -> re-materializable
                            }
                        }
                    }
                    declaredTableNames = new Set();
                    for (_14 = 0, persistenceSources_1 = persistenceSources; _14 < persistenceSources_1.length; _14++) {
                        _15 = persistenceSources_1[_14], source = _15[1];
                        for (_16 = 0, _17 = source.matchAll(/tableName:\s*'([^']+)'/g); _16 < _17.length; _16++) {
                            m = _17[_16];
                            declaredTableNames.add(m[1]);
                        }
                    }
                    if (declaredTableNames.size > 0) {
                        _loop_4 = function (sn, source) {
                            if (!sn.endsWith('repositoryadapter'))
                                return "continue";
                            for (var _40 = 0, _41 = source.matchAll(/getTable(?:<[^>]*>)?\(\s*'([^']+)'\s*\)/g); _40 < _41.length; _40++) {
                                var m = _41[_40];
                                if (declaredTableNames.has(m[1]))
                                    continue;
                                var msg = "adapter ".concat(sn, " -> getTable('").concat(m[1], "') does not match any declared tableName (").concat(__spreadArray([], declaredTableNames, true).sort().join(', '), ")");
                                missing_1.push(msg);
                                var defs = defsFiles.find(function (d) { return d.folder.endsWith('/adapters/persistence') && d.shortName === sn; });
                                if (defs)
                                    addRepair_1(defRefOf(defs.folder, defs.real), msg); // bad .ts -> re-materializable
                            }
                        };
                        for (_18 = 0, persistenceSources_2 = persistenceSources; _18 < persistenceSources_2.length; _18++) {
                            _19 = persistenceSources_2[_18], sn = _19[0], source = _19[1];
                            _loop_4(sn, source);
                        }
                    }
                    warnings = mdmTableViolations > 0 ? ["".concat(mdmTableViolations, " MDM table artifact(s) found in persistence (should be 0)")] : [];
                    normalizedDefs = new Map();
                    for (_20 = 0, defsFiles_3 = defsFiles; _20 < defsFiles_3.length; _20++) {
                        d = defsFiles_3[_20];
                        key = "".concat(d.folder, "::").concat(d.shortName.replace(/[_-]/g, ''));
                        names = (_29 = normalizedDefs.get(key)) !== null && _29 !== void 0 ? _29 : [];
                        names.push(d.real);
                        normalizedDefs.set(key, names);
                    }
                    for (_21 = 0, normalizedDefs_1 = normalizedDefs; _21 < normalizedDefs_1.length; _21++) {
                        _22 = normalizedDefs_1[_21], key = _22[0], names = _22[1];
                        if (new Set(names).size > 1)
                            missing_1.push("orphan/duplicate generated defs -> ".concat(key, " has ").concat(__spreadArray([], new Set(names), true).join(', ')));
                    }
                    defsKeys = new Set(defsFiles.map(function (d) { return "".concat(d.folder, "::").concat(d.shortName); }));
                    expectedTsWithoutDefs = new Set([
                        "".concat(moduleName_1, "/layer_1_external/adapters/persistence::seeds"),
                        // registerRepositories.ts: composition root compiled deterministically by agentCbRegister
                        // (lesson run 2026-07-16 cafeFlow: the orphan check must not flag it for manual deletion).
                        "".concat(moduleName_1, "/layer_1_external/adapters/persistence::registerrepositories"),
                    ]);
                    expectedTsFolderWithoutDefs = new Set([
                        "".concat(moduleName_1, "/layer_1_external/adapters/http/dto"),
                    ]);
                    if (isV2) {
                        // v2: the workspace controllers and the l1 contract mirror (`.ts`/`.d.ts`) are emitted
                        // deterministically by gen-http (no `.defs.ts`, like seeds/registerRepositories). Mirrored in
                        // flow.json expectedGeneratedTsWithoutDefs. The `.d.ts` twins are not collected as `.ts` outputs.
                        expectedTsFolderWithoutDefs.add("".concat(moduleName_1, "/layer_1_external/adapters/http/controllers"));
                        expectedTsFolderWithoutDefs.add("".concat(moduleName_1, "/contracts"));
                    }
                    for (_23 = 0, tsFiles_1 = tsFiles; _23 < tsFiles_1.length; _23++) {
                        ts = tsFiles_1[_23];
                        tsKey = "".concat(ts.folder, "::").concat(ts.shortName);
                        if (!defsKeys.has(tsKey) && !expectedTsWithoutDefs.has(tsKey) && !expectedTsFolderWithoutDefs.has(ts.folder)) {
                            missing_1.push("orphan generated ts -> ".concat(ts.folder, "/").concat(ts.real, ".ts has no matching .defs.ts (manual deletion required)"));
                        }
                    }
                    expectedOperationIds = new Set(scan.owners.filter(function (owner) { return owner.kind === 'operation'; }).map(function (owner) { return (0, cbShared_js_1.lowerFirst)(owner.id).toLowerCase(); }));
                    for (_24 = 0, defsFiles_4 = defsFiles; _24 < defsFiles_4.length; _24++) {
                        d = defsFiles_4[_24];
                        if ((d.folder.endsWith('/layer_2_application/usecases') || d.folder.endsWith('/adapters/http/controllers')) && !expectedOperationIds.has(d.shortName)) {
                            missing_1.push("orphan generated defs -> ".concat(d.folder, "/").concat(d.real, ".defs.ts is not owned by a current operation (manual reconciliation required)"));
                        }
                    }
                    if (!missing_1.length) return [3 /*break*/, 27];
                    unique = __spreadArray([], new Set(missing_1), true);
                    unmapped = unique.filter(function (m) { return !mappedMsgs_1.has(m); });
                    allMapped = unmapped.length === 0 && repairTargets_2.size > 0;
                    return [4 /*yield*/, (0, cbRepair_js_1.readRepairState)()];
                case 20:
                    state = _30.sent();
                    if (!(allMapped && state.globalAttempts < cbRepair_js_1.GLOBAL_REPAIR_BUDGET)) return [3 /*break*/, 23];
                    state.globalAttempts += 1;
                    for (_25 = 0, repairTargets_1 = repairTargets_2; _25 < repairTargets_1.length; _25++) {
                        _26 = repairTargets_1[_25], defRef = _26[0], findings = _26[1];
                        state.componentRepairs[defRef] = {
                            target: defRef,
                            attempts: 0, // global round grants a fresh worker budget; the GLOBAL budget is the anti-loop
                            findings: findings.slice(0, 20),
                            source: 'validate-all',
                            updatedAt: new Date().toISOString(),
                        };
                        if (!(0, cbRepair_js_1.forceDefsStale)(defRef))
                            console.warn("".concat((0, cbShared_js_1.logPrefix)(agent), " forceDefsStale failed for ").concat(defRef));
                    }
                    return [4 /*yield*/, (0, cbRepair_js_1.saveRepairState)(state)];
                case 21:
                    _30.sent();
                    trace_1 = "INTEGRITY repair round ".concat(state.globalAttempts, "/").concat(cbRepair_js_1.GLOBAL_REPAIR_BUDGET, ": re-materializing ").concat(repairTargets_2.size, " component(s): ").concat(unique.slice(0, 12).join('; '));
                    return [4 /*yield*/, (0, cbRepair_js_1.saveHealthReport)({ outcome: 'repair-round', round: state.globalAttempts, l1Defs: l1Defs, findings: unique, warnings: warnings, repairHistory: state.history })];
                case 22:
                    _30.sent();
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, "cb-materialize-g".concat(state.globalAttempts), 'agentCbMaterialize', 'Re-materializar (repair)', __assign({ repair: true }, (preSeeds ? { preSeeds: true } : {}))),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', trace_1),
                        ]];
                case 23:
                    reason = !allMapped
                        ? "".concat(unmapped.length, " finding(s) are defs-level (not repairable by re-materialization)")
                        : "repair budget exhausted (".concat(state.globalAttempts, "/").concat(cbRepair_js_1.GLOBAL_REPAIR_BUDGET, ")");
                    historyNote = state.history.length ? " | repair history (".concat(state.history.length, "): ").concat(state.history.slice(-8).join(' | ')) : '';
                    if (!preSeeds) return [3 /*break*/, 25];
                    trace_2 = "INTEGRITY WARNING (non-blocking before seeds; ".concat(reason, "): ").concat(unique.length, " finding(s): ").concat(unique.slice(0, 30).join('; ')).concat(historyNote);
                    return [4 /*yield*/, (0, cbRepair_js_1.saveHealthReport)({ outcome: 'pre-seeds-warning', reason: reason, l1Defs: l1Defs, findings: unique, unmapped: unmapped, warnings: warnings, repairHistory: state.history, globalAttempts: state.globalAttempts })];
                case 24:
                    _30.sent();
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-gen-seeds', 'agentCbSeeds', 'Gerar seeds', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', trace_2),
                        ]];
                case 25:
                    trace = "INTEGRITY FAILED (".concat(reason, "): ").concat(unique.length, " finding(s): ").concat(unique.slice(0, 30).join('; ')).concat(historyNote);
                    return [4 /*yield*/, (0, cbRepair_js_1.saveHealthReport)({ outcome: 'failed', reason: reason, l1Defs: l1Defs, findings: unique, unmapped: unmapped, warnings: warnings, repairHistory: state.history, globalAttempts: state.globalAttempts })];
                case 26:
                    _30.sent();
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', trace)]];
                case 27: return [4 /*yield*/, (0, cbRepair_js_1.readRepairState)()];
                case 28:
                    finalState = _30.sent();
                    repairNote = finalState.history.length
                        ? "; repaired during this run: ".concat(finalState.history.length, " occurrence(s) [").concat(finalState.history.slice(-8).join(' | '), "]")
                        : '';
                    return [4 /*yield*/, (0, cbRepair_js_1.saveHealthReport)({ outcome: 'passed', l1Defs: l1Defs, findings: [], warnings: warnings, repairHistory: finalState.history, globalAttempts: finalState.globalAttempts, judgeRuns: finalState.judgeRuns })];
                case 29:
                    _30.sent();
                    return [4 /*yield*/, (0, cbRepair_js_1.clearRepairState)()];
                case 30:
                    _30.sent();
                    okTrace = (warnings.length
                        ? "l1 defs=".concat(l1Defs, "; ").concat(warnings.length, " warning(s): ").concat(warnings.slice(0, 12).join('; '))
                        : "l1 defs=".concat(l1Defs, "; 0 warnings.")) + repairNote;
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, preSeeds ? 'cb-gen-seeds' : 'cb-finalize', preSeeds ? 'agentCbSeeds' : 'agentCbFinalizeStatus', preSeeds ? 'Gerar seeds' : 'Finalizar todoBackend', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', okTrace),
                        ]];
                case 31:
                    error_1 = _30.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', message)]];
                case 32: return [2 /*return*/];
            }
        });
    });
}
