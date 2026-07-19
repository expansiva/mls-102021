"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/register/agentCbRegister.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
function createAgent() {
    return { agentName: 'agentCbRegister', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/register', agentDescription: 'Deterministic backend registration (l5 config + composition root; routes/tables discovered at runtime)', visibility: 'private', beforePromptStep: beforePromptStep };
}
/** First `export const … = {…} as const;` block — the artifact data of an l1 defs file. */
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
/** Composition root: bind every repositoryAdapter defs of the module to its port name (entityId). */
function writeRegisterRepositories(project, moduleName) {
    return __awaiter(this, void 0, void 0, function () {
        var persistenceFolder, adapters, _i, _a, file, data, _b, _c, className, entityId, content, saved;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    persistenceFolder = "".concat(moduleName, "/layer_1_external/adapters/persistence");
                    adapters = [];
                    _i = 0, _a = Object.values(mls.stor.files);
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts' || String(file.folder || '') !== persistenceFolder)
                        return [3 /*break*/, 3];
                    _b = parseArtifactData;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    data = _b.apply(void 0, [_c.apply(void 0, [_d.sent()])]);
                    className = data && typeof data.className === 'string' ? String(data.className) : '';
                    entityId = data && typeof data.entityId === 'string' ? String(data.entityId) : '';
                    if (!className.endsWith('RepositoryAdapter') || !entityId)
                        return [3 /*break*/, 3];
                    adapters.push({
                        portName: entityId,
                        factoryName: "create".concat(className),
                        importPath: "/_".concat(project, "_/l1/").concat(persistenceFolder, "/").concat(file.shortName, ".js"),
                    });
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    if (adapters.length === 0)
                        return [2 /*return*/, 'composition root skipped (no repository adapters)'];
                    adapters.sort(function (a, b) { return a.portName.localeCompare(b.portName); });
                    content = __spreadArray(__spreadArray(__spreadArray(__spreadArray([
                        "/// <mls fileReference=\"_".concat(project, "_/l1/").concat(persistenceFolder, "/registerRepositories.ts\" enhancement=\"_blank\"/>"),
                        '',
                        '// Composition root — generated deterministically by agentCbRegister; do not edit by hand.',
                        '// The 102034 moduleRegistry imports this file through the persistenceModules[].tableDefsDir',
                        '// config link before loading the module controllers, so usecases can resolveRepository().',
                        "import { registerRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';"
                    ], adapters.map(function (a) { return "import { ".concat(a.factoryName, " } from '").concat(a.importPath, "';"); }), true), [
                        ''
                    ], false), adapters.map(function (a) { return "registerRepository('".concat(a.portName, "', ").concat(a.factoryName, ");"); }), true), [
                        '',
                    ], false).join('\n');
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedTs)(project, 1, persistenceFolder, 'registerRepositories', content)];
                case 5:
                    saved = _d.sent();
                    if (!saved.ok)
                        return [2 /*return*/, 'composition root write failed'];
                    if (saved.compileErrors.length > 0)
                        return [2 /*return*/, "composition root written with compile errors: ".concat(saved.compileErrors[0])];
                    return [2 /*return*/, "composition root written (".concat(adapters.length, " repository port(s))")];
            }
        });
    });
}
/** Collect the route keys the generated controllers expose (their exported `routes[].key`). */
function collectRouteKeys(project) {
    return __awaiter(this, void 0, void 0, function () {
        var keys, _i, _a, file, data, _b, _c, routes, _d, routes_1, r, k;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    keys = new Set();
                    _i = 0, _a = Object.values(mls.stor.files);
                    _e.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/adapters/http/controllers'))
                        return [3 /*break*/, 3];
                    _b = parseArtifactData;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    data = _b.apply(void 0, [_c.apply(void 0, [_e.sent()])]);
                    routes = data && Array.isArray(data.routes) ? data.routes : [];
                    for (_d = 0, routes_1 = routes; _d < routes_1.length; _d++) {
                        r = routes_1[_d];
                        k = String((r === null || r === void 0 ? void 0 : r.key) || '');
                        if (k)
                            keys.add(k);
                    }
                    _e.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, __spreadArray([], keys, true).sort()];
            }
        });
    });
}
/** Write the module's backend block into the client-owned l5/project.json (guarded; never blocks). */
function updateL5BackendConfig(project, moduleName, routeKeys) {
    return __awaiter(this, void 0, void 0, function () {
        var fileInfo, key, file, cfg, _a, _b, _c, controllersDir, tableDefsDir, modules, mod, content;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    fileInfo = { project: project, level: 5, folder: '', shortName: 'project', extension: '.json' };
                    key = mls.stor.getKeyToFile(fileInfo);
                    file = mls.stor.files[key];
                    if (!file || file.status === 'deleted')
                        return [2 /*return*/, 'l5/project.json not found; backend config skipped'];
                    _b = (_a = JSON).parse;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 1:
                    cfg = _b.apply(_a, [_c.apply(void 0, [_d.sent()])]);
                    // Master signature: records who generated the backend and which production master runtime uses.
                    if (!(0, cbShared_js_1.isRecord)(cfg.masters))
                        cfg.masters = {};
                    cfg.masters.backend = { masterProject: 102021, agentFolder: 'agentChangeBackend', runtimeProject: 102034 };
                    controllersDir = "./_".concat(project, "_/l1/").concat(moduleName, "/layer_1_external/adapters/http/controllers");
                    tableDefsDir = "./_".concat(project, "_/l1/").concat(moduleName, "/layer_1_external/adapters/persistence");
                    modules = Array.isArray(cfg.modules) ? cfg.modules : (cfg.modules = []);
                    mod = modules.find(function (m) { return m && m.moduleName === moduleName; });
                    if (!mod) {
                        mod = { moduleName: moduleName };
                        modules.push(mod);
                    }
                    mod.backend = { backendControllers: controllersDir, persistence: { tableDefsDir: tableDefsDir }, routeKeys: routeKeys };
                    content = JSON.stringify(cfg, null, 2);
                    file.updatedAt = new Date().toISOString();
                    return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: content })];
                case 2:
                    _d.sent();
                    return [2 /*return*/, "l5/project.json backend block updated for '".concat(moduleName, "' (").concat(routeKeys.length, " route(s))")];
            }
        });
    });
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var project, scan, moduleName_1, moduleTables, compositionMsg, rootError_1, configMsg, v1RouteKeys, v2RouteKeys, routeKeys, cfgError_1, error_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 11, , 12]);
                    project = mls.actualProject || 0;
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _a.sent();
                    moduleName_1 = scan.moduleNames[0] || 'unknown';
                    moduleTables = scan.aggregates.map(function (a) { return a.rootEntity; });
                    compositionMsg = 'composition root skipped';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, writeRegisterRepositories(project, moduleName_1)];
                case 3:
                    compositionMsg = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    rootError_1 = _a.sent();
                    // Non-blocking: validateAll still runs and surfaces the missing registrations.
                    compositionMsg = "composition root failed: ".concat(rootError_1 instanceof Error ? rootError_1.message : String(rootError_1));
                    console.warn("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(compositionMsg));
                    return [3 /*break*/, 5];
                case 5:
                    configMsg = 'l5 config skipped';
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 9, , 10]);
                    return [4 /*yield*/, collectRouteKeys(project)];
                case 7:
                    v1RouteKeys = _a.sent();
                    v2RouteKeys = scan.workspaces
                        .filter(function (w) { return w.moduleName === moduleName_1; })
                        .flatMap(function (w) { return w.bffCalls.map(function (b) { return b.route; }); })
                        .filter(Boolean);
                    routeKeys = __spreadArray([], new Set(__spreadArray(__spreadArray([], v1RouteKeys, true), v2RouteKeys, true)), true).sort();
                    return [4 /*yield*/, updateL5BackendConfig(project, moduleName_1, routeKeys)];
                case 8:
                    configMsg = _a.sent();
                    return [3 /*break*/, 10];
                case 9:
                    cfgError_1 = _a.sent();
                    // Non-blocking: a config write failure must not abort the run.
                    configMsg = "l5 config update failed: ".concat(cfgError_1 instanceof Error ? cfgError_1.message : String(cfgError_1));
                    console.warn("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(configMsg));
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/, [
                        (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-validate-all', 'agentCbValidateAll', 'Validar artefatos l1', {}),
                        (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "Registered ".concat(moduleTables.length, " module table(s). ").concat(compositionMsg, ". ").concat(configMsg)),
                    ]];
                case 11:
                    error_1 = _a.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', message)]];
                case 12: return [2 /*return*/];
            }
        });
    });
}
