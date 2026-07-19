"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/rebuild-defs-cleanup/agentCbRebuildDefsCleanup.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgent = createAgent;
exports.isGeneratedBackendFolder = isGeneratedBackendFolder;
var libStor_js_1 = require("/_102027_/l2/libStor.js");
var cbShared_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbShared.js");
var AGENT_NAME = 'agentCbRebuildDefsCleanup';
var MAX_TRACE_PATHS = 60;
// Everything under l1/<module>/ that is NOT the .defs.ts source of truth is a derived materialization.
var DERIVED_EXTENSIONS = new Set(['.ts', '.test.ts', '.d.ts']);
function createAgent() {
    return {
        agentName: AGENT_NAME,
        agentProject: 102021,
        agentFolder: 'agentChangeBackend/steps/rebuild-defs-cleanup',
        agentDescription: 'Soft-delete derived l1 .ts after a /rebuild defs, keeping only .defs.ts',
        visibility: 'private',
        beforePromptStep: beforePromptStep,
    };
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var modules, project, deleted, _i, _a, file, extension, folder, trace, error_1, message;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, , 6]);
                    modules = parseArgs(step.prompt).modules;
                    project = mls.actualProject || 0;
                    deleted = [];
                    _i = 0, _a = Object.values(mls.stor.files);
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    extension = String(file.extension || '');
                    if (!DERIVED_EXTENSIONS.has(extension))
                        return [3 /*break*/, 3]; // keep .defs.ts (the source of truth)
                    folder = String(file.folder || '');
                    if (!isGeneratedBackendFolder(folder, modules))
                        return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, libStor_js_1.deleteFile)(file)];
                case 2:
                    _b.sent();
                    deleted.push("_".concat(project, "_/l1/").concat(folder, "/").concat(file.shortName).concat(extension));
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    trace = "rebuild-defs: 0 materializados, ".concat(deleted.length, " .ts soft-deletados") +
                        (deleted.length === 0 ? ' (nada derivado a remover)' : ":\n".concat(summarize(deleted)));
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-finalize', 'agentCbFinalizeStatus', 'Finalizar status (defs-only)', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', trace),
                        ]];
                case 5:
                    error_1 = _b.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(message));
                    // Best-effort: a cleanup failure must not fail the whole rebuild-defs tree — the defs are already
                    // regenerated and the stale .ts are recoverable and re-materializable. Still advance to finalize.
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-finalize', 'agentCbFinalizeStatus', 'Finalizar status (defs-only)', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "REBUILD-DEFS-CLEANUP-SKIPPED: ".concat(message)),
                        ]];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Backend generated l1 code lives under `<module>/layer_1_external|layer_2_application|layer_3_domain/…`.
// Scope the sweep to the run's modules so a rebuild-defs of one module never touches another.
function isGeneratedBackendFolder(folder, modules) {
    return modules.some(function (module) { return !!module && (folder === module || folder.startsWith("".concat(module, "/"))); });
}
function summarize(paths) {
    if (paths.length <= MAX_TRACE_PATHS)
        return paths.join('\n');
    return "".concat(paths.slice(0, MAX_TRACE_PATHS).join('\n'), "\n\u2026(+").concat(paths.length - MAX_TRACE_PATHS, " more)");
}
function parseArgs(prompt) {
    var parsed = prompt ? JSON.parse(prompt) : {};
    var modules = Array.isArray(parsed.modules)
        ? parsed.modules.filter(function (value) { return typeof value === 'string' && value.length > 0; })
        : [];
    return { modules: modules };
}
