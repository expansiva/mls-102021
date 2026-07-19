"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seed-assets/agentCbSeedAssets.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var libStor_js_1 = require("/_102027_/l2/libStor.js");
var cbMaterializeIo_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js");
var cbShared_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbShared.js");
var cbSeedsCore_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbSeedsCore.js");
var seedAssetsCore_js_1 = require("/_102021_/l2/agentChangeBackend/steps/gen-seed-assets/seedAssetsCore.js");
var AGENT_NAME = 'agentCbSeedAssets';
var MAX_IMAGE_BYTES = 1500000;
var MAX_SOURCE_BYTES = 12000000;
function createAgent() {
    return {
        agentName: AGENT_NAME,
        agentProject: 102021,
        agentFolder: 'agentChangeBackend/steps/gen-seed-assets',
        agentDescription: 'Generate optional seed images, persist them in L3, and update the seed asset manifest',
        visibility: 'private',
        beforePromptStep: beforePromptStep,
        afterPromptStep: afterPromptStep,
    };
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var state, args, request, systemPrompt, error_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, loadState()];
                case 1:
                    state = _a.sent();
                    args = stepArgs(step);
                    return [4 /*yield*/, nextRequest(state, args.skippedAssetIds)];
                case 2:
                    request = _a.sent();
                    if (!request)
                        return [2 /*return*/, completeAssets(context, parentStep, step, hookSequential, state, 'Seed assets reused or not requested.')];
                    return [4 /*yield*/, (0, cbShared_js_1.readCbPrompt)('steps/gen-seed-assets')];
                case 3:
                    systemPrompt = _a.sent();
                    if (!context.task)
                        throw new Error('task invalid');
                    return [2 /*return*/, [{
                                type: 'prompt_ready',
                                messageId: context.message.orderAt,
                                threadId: context.message.threadId,
                                taskId: context.task.PK,
                                hookSequential: hookSequential,
                                parentStepId: parentStep.stepId,
                                args: step.prompt || '',
                                systemPrompt: systemPrompt,
                                humanPrompt: "".concat(request.prompt, "\n\nAlt text: ").concat(request.alt, "\nTarget: ").concat(request.targetPath),
                            }]];
                case 4:
                    error_1 = _a.sent();
                    message = "Seed asset setup warning: ".concat(errorMessage(error_1));
                    console.warn("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(message));
                    return [2 /*return*/, registerWithoutAssets(context, parentStep, step, hookSequential, message)];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function afterPromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var state, args, request_1, manifest, dataUrl, image, error_2, nextState, next, error_3, message;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 10, , 11]);
                    return [4 /*yield*/, loadState()];
                case 1:
                    state = _d.sent();
                    args = stepArgs(step);
                    return [4 /*yield*/, nextRequest(state, args.skippedAssetIds)];
                case 2:
                    request_1 = _d.sent();
                    if (!request_1)
                        return [2 /*return*/, completeAssets(context, parentStep, step, hookSequential, state, 'Seed assets already completed.')];
                    manifest = state.manifest;
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 6, , 7]);
                    dataUrl = imageUrlFromPayload((_b = (_a = step.interaction) === null || _a === void 0 ? void 0 : _a.payload) === null || _b === void 0 ? void 0 : _b[0]);
                    return [4 /*yield*/, fetchWebp(dataUrl, request_1.maxWidth)];
                case 4:
                    image = _d.sent();
                    return [4 /*yield*/, saveImage(state.project, state.moduleName, request_1, image)];
                case 5:
                    _d.sent();
                    manifest = (0, seedAssetsCore_js_1.putSeedAssetManifestEntry)(manifest, readyEntry(request_1));
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _d.sent();
                    manifest = (0, seedAssetsCore_js_1.putSeedAssetManifestEntry)(manifest, failedEntry(request_1, errorMessage(error_2)));
                    return [3 /*break*/, 7];
                case 7: return [4 /*yield*/, saveManifest(state.project, state.moduleName, manifest)];
                case 8:
                    _d.sent();
                    nextState = __assign(__assign({}, state), { manifest: manifest });
                    return [4 /*yield*/, nextRequest(nextState, __spreadArray(__spreadArray([], args.skippedAssetIds, true), [request_1.assetId], false))];
                case 9:
                    next = _d.sent();
                    if (next)
                        return [2 /*return*/, scheduleNext(context, parentStep, step, hookSequential, __spreadArray(__spreadArray([], args.skippedAssetIds, true), [request_1.assetId], false), "".concat(request_1.assetId, ": ").concat(((_c = manifest.assets.find(function (asset) { return asset.id === request_1.assetId; })) === null || _c === void 0 ? void 0 : _c.status) || 'processed'))];
                    return [2 /*return*/, completeAssets(context, parentStep, step, hookSequential, nextState, "Processed ".concat(request_1.assetId, "."))];
                case 10:
                    error_3 = _d.sent();
                    message = "Seed asset processing warning: ".concat(errorMessage(error_3));
                    console.warn("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(message));
                    return [2 /*return*/, registerWithoutAssets(context, parentStep, step, hookSequential, message)];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function stepArgs(step) {
    try {
        var value = JSON.parse(String(step.prompt || '{}'));
        return { skippedAssetIds: Array.isArray(value.skippedAssetIds) ? value.skippedAssetIds.filter(function (id) { return typeof id === 'string'; }).slice(0, 100) : [] };
    }
    catch (_a) {
        return { skippedAssetIds: [] };
    }
}
function loadState() {
    return __awaiter(this, void 0, void 0, function () {
        var scan, moduleName, source, plan;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _b.sent();
                    moduleName = scan.moduleNames[0] || 'unknown';
                    return [4 /*yield*/, readSeedSource(scan.project, moduleName)];
                case 2:
                    source = _b.sent();
                    plan = (0, cbSeedsCore_js_1.extractSeedPlanFromSource)(source);
                    if (!plan)
                        throw new Error('final seed plan was not found');
                    _a = {
                        project: scan.project,
                        moduleName: moduleName,
                        entities: scan.entities.map(function (entity) { return ({ entityId: entity.entityId, title: entity.title, kind: entity.kind, fields: [] }); }),
                        source: source
                    };
                    return [4 /*yield*/, readManifest(scan.project, moduleName)];
                case 3: return [2 /*return*/, (_a.manifest = _b.sent(),
                        _a)];
            }
        });
    });
}
function nextRequest(state, skipped) {
    return __awaiter(this, void 0, void 0, function () {
        var plan, requests, _loop_1, _i, requests_1, request, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    plan = (0, cbSeedsCore_js_1.extractSeedPlanFromSource)(state.source);
                    if (!plan)
                        return [2 /*return*/, null];
                    requests = (0, seedAssetsCore_js_1.collectSeedAssetRequests)(state.moduleName, plan, state.entities);
                    _loop_1 = function (request) {
                        var entry, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    if (skipped.includes(request.assetId))
                                        return [2 /*return*/, "continue"];
                                    entry = state.manifest.assets.find(function (asset) { return asset.id === request.assetId; });
                                    _b = (entry === null || entry === void 0 ? void 0 : entry.status) === 'ready' && entry.promptHash === request.promptHash;
                                    if (!_b) return [3 /*break*/, 2];
                                    return [4 /*yield*/, hasReadyImage(state.project, state.moduleName, request)];
                                case 1:
                                    _b = (_c.sent());
                                    _c.label = 2;
                                case 2:
                                    if (_b)
                                        return [2 /*return*/, "continue"];
                                    return [2 /*return*/, { value: request }];
                            }
                        });
                    };
                    _i = 0, requests_1 = requests;
                    _a.label = 1;
                case 1:
                    if (!(_i < requests_1.length)) return [3 /*break*/, 4];
                    request = requests_1[_i];
                    return [5 /*yield**/, _loop_1(request)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, null];
            }
        });
    });
}
function scheduleNext(context, parentStep, step, hookSequential, skippedAssetIds, trace) {
    var _a;
    var planId = "cb-seed-assets-".concat(Date.now());
    return [
        {
            type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: ((_a = context.task) === null || _a === void 0 ? void 0 : _a.PK) || '', parentStepId: parentStep.stepId,
            step: (0, cbShared_js_1.createAgentStepPayload)(planId, AGENT_NAME, 'Gerar próximo asset de seed', { planId: planId, skippedAssetIds: skippedAssetIds }, [], 'sequential', 'waiting_human_input'),
        },
        (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
    ];
}
function completeAssets(context, parentStep, step, hookSequential, state, trace) {
    return __awaiter(this, void 0, void 0, function () {
        var updated, saved, warnings;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    updated = (0, cbSeedsCore_js_1.updateSeedAssetUrlsInSource)(state.source, (0, seedAssetsCore_js_1.readySeedAssetUrls)(state.manifest), (0, seedAssetsCore_js_1.seedAssetWarnings)(state.manifest));
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedTs)(state.project, 1, "".concat(state.moduleName, "/layer_1_external/adapters/persistence"), 'seeds', updated)];
                case 1:
                    saved = _a.sent();
                    if (!saved.ok || saved.compileErrors.length)
                        throw new Error("failed to update seeds.ts with asset URLs: ".concat(saved.compileErrors.join('; ')));
                    warnings = (0, seedAssetsCore_js_1.seedAssetWarnings)(state.manifest);
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-register', 'agentCbRegister', 'Registrar backend', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "".concat(trace).concat(warnings.length ? " ".concat(warnings.length, " optional asset warning(s): ").concat(warnings.join('; ')) : ''), 'input_output'),
                        ]];
            }
        });
    });
}
function registerWithoutAssets(context, parentStep, step, hookSequential, trace) {
    return [
        (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-register', 'agentCbRegister', 'Registrar backend', {}),
        (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
    ];
}
function readSeedSource(project, moduleName) {
    return __awaiter(this, void 0, void 0, function () {
        var info, file, content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    info = { project: project, level: 1, folder: "".concat(moduleName, "/layer_1_external/adapters/persistence"), shortName: 'seeds', extension: '.ts' };
                    file = mls.stor.files[mls.stor.getKeyToFile(info)];
                    if (!file || file.status === 'deleted')
                        throw new Error('seeds.ts not found');
                    return [4 /*yield*/, file.getContent()];
                case 1:
                    content = _a.sent();
                    if (typeof content !== 'string')
                        throw new Error('seeds.ts is not text');
                    return [2 /*return*/, content];
            }
        });
    });
}
function readManifest(project, moduleName) {
    return __awaiter(this, void 0, void 0, function () {
        var info, file, _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    info = manifestInfo(project, moduleName);
                    file = mls.stor.files[mls.stor.getKeyToFile(info)];
                    if (!file || file.status === 'deleted')
                        return [2 /*return*/, (0, seedAssetsCore_js_1.emptySeedAssetManifest)(moduleName)];
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, , 4]);
                    _a = seedAssetsCore_js_1.parseSeedAssetManifest;
                    _c = (_b = JSON).parse;
                    _d = String;
                    return [4 /*yield*/, file.getContent()];
                case 2: return [2 /*return*/, _a.apply(void 0, [_c.apply(_b, [_d.apply(void 0, [_f.sent()])]), moduleName])];
                case 3:
                    _e = _f.sent();
                    return [2 /*return*/, (0, seedAssetsCore_js_1.emptySeedAssetManifest)(moduleName)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function saveManifest(project, moduleName, manifest) {
    return __awaiter(this, void 0, void 0, function () {
        var info, source, key, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    info = manifestInfo(project, moduleName);
                    source = "".concat(JSON.stringify(manifest, null, 2), "\n");
                    key = mls.stor.getKeyToFile(info);
                    file = mls.stor.files[key];
                    if (!!file) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, libStor_js_1.createStorFile)(__assign(__assign({}, info), { source: source }), false, false, false)];
                case 1:
                    file = _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    file.status = file.status === 'new' ? 'new' : 'changed';
                    return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: source })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    file.updatedAt = new Date().toISOString();
                    return [2 /*return*/];
            }
        });
    });
}
function manifestInfo(project, moduleName) {
    return { project: project, level: 3, folder: "".concat(moduleName, "/assets"), shortName: 'seed-assets', extension: '.json' };
}
function hasReadyImage(project, moduleName, request) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, entityId, seedKey, info, file, content;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = request.assetId.split('/'), entityId = _a[0], seedKey = _a[1];
                    info = { project: project, level: 3, folder: "".concat(moduleName, "/assets/seed/").concat(entityId), shortName: seedKey, extension: '.webp' };
                    file = mls.stor.files[mls.stor.getKeyToFile(info)];
                    if (!file || file.status === 'deleted')
                        return [2 /*return*/, false];
                    return [4 /*yield*/, file.getContent()];
                case 1:
                    content = _b.sent();
                    return [2 /*return*/, content instanceof Blob && content.type === 'image/webp' && content.size > 0 && content.size <= MAX_IMAGE_BYTES];
            }
        });
    });
}
function saveImage(project, moduleName, request, image) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, entityId, seedKey, info, file;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = request.assetId.split('/'), entityId = _a[0], seedKey = _a[1];
                    info = { project: project, level: 3, folder: "".concat(moduleName, "/assets/seed/").concat(entityId), shortName: seedKey, extension: '.webp', versionRef: '0', updatedAt: new Date().toISOString() };
                    return [4 /*yield*/, mls.stor.addOrUpdateFile(info)];
                case 1:
                    file = _b.sent();
                    if (!file)
                        throw new Error("cannot create ".concat(request.targetPath));
                    file.status = file.status === 'new' ? 'new' : 'changed';
                    file.updatedAt = info.updatedAt;
                    return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'blob', content: image })];
                case 2:
                    if (!(_b.sent()))
                        throw new Error("cannot save ".concat(request.targetPath));
                    return [2 /*return*/];
            }
        });
    });
}
function readyEntry(request) {
    return { id: request.assetId, path: request.path, publicUrl: request.publicUrl, source: 'imagem', promptHash: request.promptHash, status: 'ready' };
}
function failedEntry(request, warning) {
    return { id: request.assetId, path: request.path, publicUrl: request.publicUrl, source: 'imagem', promptHash: request.promptHash, status: 'failed', warning: warning.slice(0, 300) };
}
function imageUrlFromPayload(payload) {
    var value = parsePayload(payload);
    var candidate = (0, cbShared_js_1.isRecord)(value) && (0, cbShared_js_1.isRecord)(value.result) ? value.result.dataUrl : undefined;
    if (typeof candidate !== 'string' || !candidate)
        throw new Error('image response has no dataUrl');
    var url = new URL(candidate);
    if (url.protocol !== 'https:')
        throw new Error('image dataUrl must be HTTPS');
    return url.toString();
}
function parsePayload(value) {
    if (typeof value !== 'string')
        return value;
    try {
        return JSON.parse(value);
    }
    catch (_a) {
        return null;
    }
}
function fetchWebp(dataUrl, maxWidth) {
    return __awaiter(this, void 0, void 0, function () {
        var response, source, bitmap, width, height, canvas, ctx, _i, _a, quality, webp;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fetch(dataUrl, { credentials: 'omit', signal: AbortSignal.timeout(30000) })];
                case 1:
                    response = _b.sent();
                    if (!response.ok)
                        throw new Error("image download failed: HTTP ".concat(response.status));
                    return [4 /*yield*/, response.blob()];
                case 2:
                    source = _b.sent();
                    if (!source.type.startsWith('image/') || source.size === 0 || source.size > MAX_SOURCE_BYTES)
                        throw new Error('image response is not a bounded image');
                    return [4 /*yield*/, createImageBitmap(source)];
                case 3:
                    bitmap = _b.sent();
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, , 9, 10]);
                    width = Math.min(maxWidth, bitmap.width);
                    height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
                    if (typeof OffscreenCanvas === 'undefined')
                        throw new Error('WebP conversion is unavailable');
                    canvas = new OffscreenCanvas(width, height);
                    ctx = canvas.getContext('2d');
                    if (!ctx)
                        throw new Error('cannot create image canvas');
                    ctx.drawImage(bitmap, 0, 0, width, height);
                    _i = 0, _a = [0.9, 0.8, 0.7];
                    _b.label = 5;
                case 5:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    quality = _a[_i];
                    return [4 /*yield*/, canvas.convertToBlob({ type: 'image/webp', quality: quality })];
                case 6:
                    webp = _b.sent();
                    if (webp.type === 'image/webp' && webp.size > 0 && webp.size <= MAX_IMAGE_BYTES)
                        return [2 /*return*/, webp];
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8: throw new Error("WebP exceeds ".concat(MAX_IMAGE_BYTES, " bytes"));
                case 9:
                    bitmap.close();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
