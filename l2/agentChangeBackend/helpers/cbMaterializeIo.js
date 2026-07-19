"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>
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
exports.parsePipelineFromContent = parsePipelineFromContent;
exports.scanL1DefsWithPipeline = scanL1DefsWithPipeline;
exports.getFileModified = getFileModified;
exports.getContentByMlsPath = getContentByMlsPath;
exports.parseMlsPath = parseMlsPath;
exports.saveGeneratedFile = saveGeneratedFile;
exports.saveGeneratedTs = saveGeneratedTs;
exports.compileSavedTsAndGetErrors = compileSavedTsAndGetErrors;
exports.extractToolCallArgs = extractToolCallArgs;
// Platform I/O glue for the in-studio materializer (agentCbMaterialize), vendored into agentChangeBackend
// so it does not depend on agentMaterializeSolution (being removed). Pure mls.stor / libStor access; the
// pure prompt/parse/order logic lives in cbMaterializeCore.ts (shared with the Node CLI).
var libStor_js_1 = require("/_102027_/l2/libStor.js");
var cbSyntaxValidation_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbSyntaxValidation.js");
// L1 layer folders that may hold a .defs.ts with a pipeline (hexagonal: only layer_1_external in v1,
// but keep the full set so the scan is robust if defs land in other layers).
var L1_LAYERS = ['layer_1_external', 'layer_2_application', 'layer_3_domain', 'layer_4_entities', 'layer_3_usecases', 'layer_2_controllers'];
/** Extract the `pipeline` array from a .defs.ts content string. */
function parsePipelineFromContent(content) {
    try {
        var match = content.match(/export\s+const\s+pipeline\s*=\s*([\s\S]*?)\s+as\s+const\s*;/u);
        if (!match)
            return null;
        return JSON.parse(match[1]);
    }
    catch (_a) {
        return null;
    }
}
/** Scan every l1 .defs.ts (with a pipeline) of a module. */
function scanL1DefsWithPipeline(project, moduleName) {
    return __awaiter(this, void 0, void 0, function () {
        var result, prefix, _loop_1, _i, _a, f, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    result = [];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    prefix = "".concat(moduleName, "/");
                    _loop_1 = function (f) {
                        var folder, content, _c, pipeline;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    if (f.project !== project)
                                        return [2 /*return*/, "continue"];
                                    if (f.level !== 1)
                                        return [2 /*return*/, "continue"];
                                    folder = String(f.folder || '');
                                    if (!folder.startsWith(prefix))
                                        return [2 /*return*/, "continue"];
                                    if (!L1_LAYERS.some(function (layer) { return folder === "".concat(moduleName, "/").concat(layer) || folder.startsWith("".concat(moduleName, "/").concat(layer, "/")); }))
                                        return [2 /*return*/, "continue"];
                                    if (f.extension !== '.defs.ts')
                                        return [2 /*return*/, "continue"];
                                    if (f.status === 'deleted')
                                        return [2 /*return*/, "continue"];
                                    if (f.shortName === 'module' || f.shortName === 'index')
                                        return [2 /*return*/, "continue"];
                                    _c = String;
                                    return [4 /*yield*/, f.getContent()];
                                case 1:
                                    content = _c.apply(void 0, [_d.sent()]);
                                    pipeline = parsePipelineFromContent(content);
                                    if (!pipeline || pipeline.length === 0)
                                        return [2 /*return*/, "continue"];
                                    result.push({ folder: folder, shortName: f.shortName, pipeline: pipeline });
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _a = Object.values(mls.stor.files);
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    f = _a[_i];
                    return [5 /*yield**/, _loop_1(f)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 7];
                case 6:
                    err_1 = _b.sent();
                    console.warn('[cbMaterializeIo] scanL1DefsWithPipeline failed', err_1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/, result];
            }
        });
    });
}
/** updatedAt (ms) of a file, MAX_SAFE_INTEGER when new/changed without a timestamp, else null. */
function getFileModified(project, level, folder, shortName, extension) {
    try {
        var key = mls.stor.getKeyToFile({ project: project, level: level, folder: folder, shortName: shortName, extension: extension });
        var file = mls.stor.files[key];
        if (!file || file.status === 'deleted')
            return null;
        if (file.updatedAt)
            return Date.parse(file.updatedAt);
        var status_1 = file.status;
        return (status_1 === 'new' || status_1 === 'changed') ? Number.MAX_SAFE_INTEGER : null;
    }
    catch (_a) {
        return null;
    }
}
/** Read any file by its full MLS path string. */
function getContentByMlsPath(mlsPath) {
    return __awaiter(this, void 0, void 0, function () {
        var info, key, file, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    info = mls.stor.convertFileReferenceToFile(mlsPath);
                    key = mls.stor.getKeyToFile(info);
                    file = mls.stor.files[key];
                    if (!file || file.status === 'deleted')
                        return [2 /*return*/, null];
                    _a = String;
                    return [4 /*yield*/, file.getContent()];
                case 1: return [2 /*return*/, _a.apply(void 0, [_c.sent()])];
                case 2:
                    _b = _c.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** Parse a MLS path like `_102050_/l1/cafeFlow/layer_1_external/adapters/persistence/order.ts`. */
function parseMlsPath(mlsPath) {
    var match = mlsPath.match(/^_(\d+)_\/l(\d+)\/(.+)$/u);
    if (!match)
        return null;
    var project = parseInt(match[1], 10);
    var level = parseInt(match[2], 10);
    var rest = match[3];
    var lastSlash = rest.lastIndexOf('/');
    var folder = lastSlash >= 0 ? rest.slice(0, lastSlash) : '';
    var filename = lastSlash >= 0 ? rest.slice(lastSlash + 1) : rest;
    var shortName, extension;
    if (filename.endsWith('.defs.ts')) {
        shortName = filename.slice(0, -'.defs.ts'.length);
        extension = '.defs.ts';
    }
    else if (filename.endsWith('.d.ts')) {
        shortName = filename.slice(0, -'.d.ts'.length);
        extension = '.d.ts';
    }
    else {
        var dot = filename.lastIndexOf('.');
        shortName = dot >= 0 ? filename.slice(0, dot) : filename;
        extension = dot >= 0 ? filename.slice(dot) : '';
    }
    return { project: project, level: level, folder: folder, shortName: shortName, extension: extension };
}
/** Flatten a monaco diagnostic (messageText may be a chain) into a single line. */
function flattenDiagnostic(d) {
    var _a;
    var flat = function (m) {
        if (typeof m === 'string')
            return m;
        if (m && typeof m.messageText === 'string') {
            var next = Array.isArray(m.next) && m.next.length ? " -> ".concat(flat(m.next[0])) : '';
            return "".concat(m.messageText).concat(next);
        }
        return '';
    };
    var msg = flat((_a = d === null || d === void 0 ? void 0 : d.messageText) !== null && _a !== void 0 ? _a : d);
    var code = typeof (d === null || d === void 0 ? void 0 : d.code) === 'number' ? "TS".concat(d.code, ": ") : '';
    return msg ? "".concat(code).concat(sanitizeModuleHint(msg)) : '';
}
// The stock TS2792/TS2307 hint ("Did you mean to set the 'moduleResolution' option ... 'paths'?")
// teaches the repair model to abandon the '/_<project>_/...' alias for a relative path (observed in
// run task2/102049: six controllers rewritten to '../../../../...'). Replace it with the actual fix.
function sanitizeModuleHint(message) {
    return message.replace(/Did you mean to set the 'moduleResolution' option to '[^']+', or to add aliases to the 'paths' option\?/g, "Keep the '/_<project>_/l1/...' alias import exactly as in the context files — NEVER rewrite it as a relative path; the alias resolves once the target module is materialized.");
}
/** The Monaco TS worker resolves '/_<proj>_/l1/...' alias imports against LOADED MODELS (plus the
 * publish cache, which only covers files that already existed before the run). A .ts materialized
 * earlier in the SAME run has no publish cache yet — if its model is not loaded in the client doing
 * this compile, the importer fails with TS2792 even though the file exists in stor (run 102049-d:
 * the 6 controllers whose usecases were first created in that run, while the 10 pre-existing ones
 * resolved fine). Lazily load the models of same-project l1 imports before compiling. */
function ensureSameProjectImportModels(project, content) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, match, path, idx, folder, shortName, fileKey, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _i = 0, _a = content.matchAll(/from\s+['"]\/_(\d+)_\/l1\/([^'"]+?)\.js['"]/gu);
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    match = _a[_i];
                    if (Number(match[1]) !== project)
                        return [3 /*break*/, 5];
                    path = match[2];
                    idx = path.lastIndexOf('/');
                    if (idx <= 0)
                        return [3 /*break*/, 5];
                    folder = path.slice(0, idx);
                    shortName = path.slice(idx + 1);
                    if (mls.editor.models[mls.editor.getKeyModel(project, shortName, folder, 1)])
                        return [3 /*break*/, 5];
                    fileKey = mls.stor.getKeyToFile({ project: project, level: 1, folder: folder, shortName: shortName, extension: '.ts' });
                    if (!mls.stor.files[fileKey])
                        return [3 /*break*/, 5];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, mls.editor.addModels(project, shortName, folder, 1)];
                case 3:
                    _c.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _b = _c.sent();
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/** Compile the saved .ts and distinguish a clean compile from unavailable Monaco infrastructure. */
function compileGeneratedTs(project, level, folder, shortName, content) {
    return __awaiter(this, void 0, void 0, function () {
        var editorKey, modelBase, modelTs, diags, err_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, ensureSameProjectImportModels(project, content)];
                case 1:
                    _c.sent();
                    editorKey = mls.editor.getKeyModel(project, shortName, folder, level);
                    modelBase = mls.editor.models[editorKey];
                    if (!!modelBase) return [3 /*break*/, 3];
                    return [4 /*yield*/, mls.editor.addModels(project, shortName, folder, level)];
                case 2:
                    modelBase = (_c.sent());
                    _c.label = 3;
                case 3:
                    modelTs = modelBase === null || modelBase === void 0 ? void 0 : modelBase.ts;
                    if (!modelTs)
                        return [2 /*return*/, { errors: [], available: false }];
                    if (modelTs.compilerResults)
                        modelTs.compilerResults.modelNeedCompile = true;
                    return [4 /*yield*/, mls.l2.typescript.compileAndPostProcess(modelTs, true, true)];
                case 4:
                    _c.sent();
                    mls.editor.forceModelUpdate(modelTs.model);
                    diags = ((_b = (_a = modelTs.compilerResults) === null || _a === void 0 ? void 0 : _a.errors) !== null && _b !== void 0 ? _b : []);
                    return [2 /*return*/, { errors: diags
                                .filter(function (d) { return (d === null || d === void 0 ? void 0 : d.category) === undefined || d.category === 1; })
                                .map(flattenDiagnostic)
                                .filter(Boolean)
                                .slice(0, 12), available: true }];
                case 5:
                    err_2 = _c.sent();
                    console.warn('[cbMaterializeIo] compileGeneratedTs failed', err_2);
                    return [2 /*return*/, { errors: [], available: false }];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/** Save (create or overwrite) a generated file with an ARBITRARY extension, WITHOUT compiling. Used for
 * byte-mirror artifacts (l1 contract copies `.ts`/`.d.ts` — B5) where the whole-project compile in
 * validate-all owns correctness; a per-file compile of a `.d.ts` twin would be meaningless. Mirrors the
 * write path of saveGeneratedTs (createStorFile with the Monaco model registered so later files import it). */
function saveGeneratedFile(project, level, folder, shortName, extension, content) {
    return __awaiter(this, void 0, void 0, function () {
        var fileInfo, key, file, model, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    fileInfo = { project: project, level: level, folder: folder, shortName: shortName, extension: extension };
                    key = mls.stor.getKeyToFile(fileInfo);
                    file = mls.stor.files[key];
                    if (!!file) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, libStor_js_1.createStorFile)(__assign(__assign({}, fileInfo), { source: content }), true, false, false)];
                case 1:
                    file = _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, file.getOrCreateModel()];
                case 3:
                    model = _a.sent();
                    if (model)
                        model.model.setValue(content);
                    _a.label = 4;
                case 4:
                    file.updatedAt = new Date().toISOString();
                    return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: content })];
                case 5:
                    _a.sent();
                    return [2 /*return*/, true];
                case 6:
                    err_3 = _a.sent();
                    console.warn('[cbMaterializeIo] saveGeneratedFile failed', err_3);
                    return [2 /*return*/, false];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/** Save (create or overwrite) a generated .ts file, force a recompile and report its errors. */
function saveGeneratedTs(project, level, folder, shortName, content) {
    return __awaiter(this, void 0, void 0, function () {
        var fileInfo, key, file, model, compiled, _a, syntaxErrors, compileErrors, err_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 9, , 10]);
                    fileInfo = { project: project, level: level, folder: folder, shortName: shortName, extension: '.ts' };
                    key = mls.stor.getKeyToFile(fileInfo);
                    file = mls.stor.files[key];
                    if (!!file) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, libStor_js_1.createStorFile)(__assign(__assign({}, fileInfo), { source: content }), true, false, false)];
                case 1:
                    // needCreateModel=true (parity with cfeMaterializeStudio): register the Monaco model at
                    // creation so files materialized later in the run can import this one (see
                    // ensureSameProjectImportModels). needCompile=false — the explicit compile below owns that.
                    file = _b.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, file.getOrCreateModel()];
                case 3:
                    model = _b.sent();
                    if (model)
                        model.model.setValue(content);
                    _b.label = 4;
                case 4:
                    // Bump updatedAt so the freshly materialized .ts is newer than its .defs.ts (keeps isStale correct
                    // across runs); libStor.createStorFile / setContent do not set it.
                    file.updatedAt = new Date().toISOString();
                    return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: content })];
                case 5:
                    _b.sent();
                    if (!shortName.endsWith('.defs')) return [3 /*break*/, 6];
                    _a = { errors: [], available: true };
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, compileGeneratedTs(project, level, folder, shortName, content)];
                case 7:
                    _a = _b.sent();
                    _b.label = 8;
                case 8:
                    compiled = _a;
                    syntaxErrors = (0, cbSyntaxValidation_js_1.syntaxDiagnostics)(content).slice(0, 12);
                    compileErrors = __spreadArray(__spreadArray([], syntaxErrors, true), compiled.errors, true).slice(0, 12);
                    return [2 /*return*/, { ok: true, compileErrors: compileErrors, syntaxErrors: syntaxErrors, compilerAvailable: compiled.available }];
                case 9:
                    err_4 = _b.sent();
                    console.warn('[cbMaterializeIo] saveGeneratedTs failed', err_4);
                    return [2 /*return*/, { ok: false, compileErrors: [], syntaxErrors: [], compilerAvailable: false }];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/** Whole-project compile check (used by cb-validate-all): compile an already-saved generated .ts and
 * return its errors. At that point every generated file exists, so findings are REAL — unlike the
 * per-file compile during the layer sweep, which is deferred (see agentCbMaterialize). Returns []
 * when Monaco is unavailable — the deterministic checks remain the floor. */
function compileSavedTsAndGetErrors(project, folder, shortName) {
    return __awaiter(this, void 0, void 0, function () {
        var key, file, content, _a, compiled, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 3, , 4]);
                    key = mls.stor.getKeyToFile({ project: project, level: 1, folder: folder, shortName: shortName, extension: '.ts' });
                    file = mls.stor.files[key];
                    if (!file || file.status === 'deleted')
                        return [2 /*return*/, []];
                    _a = String;
                    return [4 /*yield*/, file.getContent()];
                case 1:
                    content = _a.apply(void 0, [(_c = _d.sent()) !== null && _c !== void 0 ? _c : '']);
                    return [4 /*yield*/, compileGeneratedTs(project, 1, folder, shortName, content)];
                case 2:
                    compiled = _d.sent();
                    return [2 /*return*/, compiled.available ? compiled.errors : []];
                case 3:
                    _b = _d.sent();
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function parseMaybeJson(raw) {
    if (typeof raw !== 'string')
        return raw;
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        return null;
    }
}
function isRecord(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}
/** Pull the arguments of a named tool call out of the model payload (several shapes supported). */
function extractToolCallArgs(raw, toolName) {
    var v = parseMaybeJson(raw);
    if (!isRecord(v))
        return null;
    if (v.toolName === toolName) {
        var args = parseMaybeJson(v.arguments);
        return isRecord(args) ? args : null;
    }
    if (v.type === 'flexible' && v.result !== undefined) {
        var result = parseMaybeJson(v.result);
        if (isRecord(result) && result.toolName === toolName) {
            var args = parseMaybeJson(result.arguments);
            return isRecord(args) ? args : null;
        }
    }
    if (Array.isArray(v.tool_calls)) {
        var call = v.tool_calls.find(function (item) { return isRecord(item) && isRecord(item.function) && item.function.name === toolName; });
        if (isRecord(call)) {
            var args = parseMaybeJson(call.function.arguments);
            return isRecord(args) ? args : null;
        }
    }
    return null;
}
