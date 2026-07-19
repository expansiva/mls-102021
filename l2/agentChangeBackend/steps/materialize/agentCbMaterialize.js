"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/materialize/agentCbMaterialize.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var cbMaterializeIo_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js");
var cbShared_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbShared.js");
var cbMaterializeCore_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js");
var cbRepair_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbRepair.js");
var cbMdmGuards_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMdmGuards.js");
var cbComponentValidators_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js");
var AGENT_NAME = 'agentCbMaterialize';
function createAgent() {
    return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/materialize', agentDescription: 'Materialize .defs.ts -> .ts (parallel per layer; shares the CLI core)', visibility: 'private', beforePromptStep: beforePromptStep, afterPromptStep: afterPromptStep };
}
// A WORKER invocation carries its defRef in hook.args (or step.prompt on later hooks) — a bare mls path,
// never starting with '{'. The DISPATCHER step carries a JSON prompt ({planId:...}). Resolve args first.
function workerDefRef(args, step) {
    var _a;
    var a = (args !== null && args !== void 0 ? args : '').trim();
    if (a && !a.startsWith('{'))
        return a;
    var p = String((_a = step === null || step === void 0 ? void 0 : step.prompt) !== null && _a !== void 0 ? _a : '').trim();
    return p && !p.startsWith('{') ? p : '';
}
// Scan every l1 .defs.ts of the (single) module and pair it with its pipeline item + defs mls path.
function scanEntries() {
    return __awaiter(this, void 0, void 0, function () {
        var project, scan, moduleName, files, entries, _i, files_1, f, item;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    project = mls.actualProject || 0;
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _a.sent();
                    moduleName = scan.moduleNames[0] || 'unknown';
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.scanL1DefsWithPipeline)(project, moduleName)];
                case 2:
                    files = _a.sent();
                    entries = [];
                    for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                        f = files_1[_i];
                        item = f.pipeline[0];
                        if (item && item.outputPath)
                            entries.push({ defRef: "_".concat(project, "_/l1/").concat(f.folder, "/").concat(f.shortName, ".defs.ts"), item: item });
                    }
                    return [2 /*return*/, entries];
            }
        });
    });
}
// Output is stale when missing, older than its defs, OR older than any generated internal dependency.
// This makes staleness transitive: a regenerated entity invalidates importing usecases/controllers.
function entryIsStale(project, defRef, item) {
    var _a;
    var d = (0, cbMaterializeIo_js_1.parseMlsPath)(defRef);
    var o = (0, cbMaterializeIo_js_1.parseMlsPath)(item.outputPath);
    var defsMs = d ? (0, cbMaterializeIo_js_1.getFileModified)(d.project, d.level, d.folder, d.shortName, '.defs.ts') : null;
    var tsMs = o ? (0, cbMaterializeIo_js_1.getFileModified)(o.project, o.level, o.folder, o.shortName, '.ts') : null;
    var dependencyTimes = ((_a = item.dependsFiles) !== null && _a !== void 0 ? _a : []).map(function (ref) { return (0, cbMaterializeIo_js_1.parseMlsPath)(ref.replace(/\.d\.ts$/u, '.ts')); })
        .map(function (path) { return path ? (0, cbMaterializeIo_js_1.getFileModified)(path.project, path.level, path.folder, path.shortName, '.ts') : null; })
        .filter(function (value) { return value !== null; });
    var inputMs = Math.max.apply(Math, __spreadArray([defsMs !== null && defsMs !== void 0 ? defsMs : -1], dependencyTimes, false));
    return (0, cbMaterializeCore_js_1.isStale)(inputMs < 0 ? null : inputMs, tsMs);
}
function beforePromptStep(agent, context, parentStep, step, hookSequential, args) {
    return __awaiter(this, void 0, void 0, function () {
        var defRef;
        return __generator(this, function (_a) {
            defRef = workerDefRef(args, step);
            return [2 /*return*/, defRef
                    ? worker(agent, context, parentStep, step, hookSequential, defRef)
                    : dispatch(agent, context, parentStep, step, hookSequential)];
        });
    });
}
// DISPATCHER (deterministic, no LLM): one parallel_dynamic step per layer, chained by dependsOn so the
// runtime materializes inner layers before outer ones; cb-gen-seeds joins the last layer.
function dispatch(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var project_1, entries, allStale, minRank, repairMode_1, preSeeds_1, p, repairState_1, repairable, byRank, _i, allStale_1, e, r, entry, bucket_1, gSuffix_1, roundArgs, endStep, ranksSorted, remainingLayers, rank, bucket, maxAttempt, rSuffix, planId, refs, pendingRepairCount, label, intents, nextRank, nextLabel, error_1, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    project_1 = mls.actualProject || 0;
                    return [4 /*yield*/, scanEntries()];
                case 1:
                    entries = _a.sent();
                    allStale = entries.filter(function (e) { return entryIsStale(project_1, e.defRef, e.item); });
                    minRank = 0;
                    repairMode_1 = false;
                    preSeeds_1 = false;
                    try {
                        p = JSON.parse(String(step.prompt || '{}'));
                        if (p && typeof p.minRank === 'number')
                            minRank = p.minRank;
                        if (p && p.repair === true)
                            repairMode_1 = true;
                        if (p && p.preSeeds === true)
                            preSeeds_1 = true;
                    }
                    catch ( /* defaults */_b) { /* defaults */ }
                    return [4 /*yield*/, (0, cbRepair_js_1.readRepairState)()];
                case 2:
                    repairState_1 = _a.sent();
                    return [4 /*yield*/, (0, cbRepair_js_1.saveHealthReport)({
                            outcome: 'materialize-dispatch',
                            stale: allStale.map(function (entry) { return entry.defRef; }),
                            pendingRepairs: Object.values(repairState_1.componentRepairs).map(function (entry) { return ({ target: entry.target, attempts: entry.attempts, findings: entry.findings.slice(0, 3) }); }),
                            minRank: minRank,
                            repairMode: repairMode_1,
                        })];
                case 3:
                    _a.sent();
                    repairable = function (defRef) {
                        var entry = repairState_1.componentRepairs[defRef];
                        return !!entry && entry.attempts > 0 && entry.attempts <= cbRepair_js_1.COMPONENT_REPAIR_BUDGET;
                    };
                    byRank = new Map();
                    _i = 0, allStale_1 = allStale;
                    _a.label = 4;
                case 4:
                    if (!(_i < allStale_1.length)) return [3 /*break*/, 8];
                    e = allStale_1[_i];
                    r = (0, cbMaterializeCore_js_1.layerRank)(e.item.type);
                    if (!(r < minRank && !repairable(e.defRef))) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, cbRepair_js_1.recordComponentFailure)(e.defRef, ['output .ts absent or stale after its layer already advanced'], undefined, 'component-validate')];
                case 5:
                    entry = _a.sent();
                    repairState_1.componentRepairs[e.defRef] = entry;
                    _a.label = 6;
                case 6:
                    if (r < minRank && !repairable(e.defRef))
                        return [3 /*break*/, 7];
                    bucket_1 = byRank.get(r);
                    if (!bucket_1) {
                        bucket_1 = [];
                        byRank.set(r, bucket_1);
                    }
                    bucket_1.push(e);
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 4];
                case 8:
                    gSuffix_1 = repairState_1.globalAttempts > 0 ? "-g".concat(repairState_1.globalAttempts) : '';
                    roundArgs = repairMode_1 ? __assign({ repair: true }, (preSeeds_1 ? { preSeeds: true } : {})) : {};
                    endStep = function (dependsOn) { return repairMode_1
                        // Repair round: defs did not change, so seeds/register are still valid — go straight back to the
                        // integrity barrier (unique planId per round).
                        ? (0, cbShared_js_1.createAddStepIntent)(context, parentStep, (0, cbShared_js_1.createAgentStepPayload)("cb-validate-all".concat(gSuffix_1), 'agentCbValidateAll', 'Validar artefatos l1 (repair)', __assign({ planId: "cb-validate-all".concat(gSuffix_1) }, (preSeeds_1 ? { preSeeds: true } : {})), dependsOn, 'sequential', 'waiting_dependency'))
                        : (0, cbShared_js_1.createAddStepIntent)(context, parentStep, (0, cbShared_js_1.createAgentStepPayload)('cb-validate-before-seeds', 'agentCbValidateAll', 'Validar integridade l1 antes dos seeds', { planId: 'cb-validate-before-seeds', preSeeds: true }, dependsOn, 'sequential', 'waiting_dependency')); };
                    if (byRank.size === 0) {
                        // No more layers to materialize from minRank up -> seeds (or the repair-round barrier).
                        return [2 /*return*/, [
                                endStep([]),
                                (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "nothing stale to materialize (from L".concat(minRank, ")")),
                            ]];
                    }
                    ranksSorted = __spreadArray([], byRank.keys(), true).sort(function (a, b) { return a - b; });
                    remainingLayers = ranksSorted.length;
                    rank = ranksSorted[0];
                    bucket = byRank.get(rank);
                    maxAttempt = Math.max.apply(Math, __spreadArray([0], bucket.map(function (e) { var _a, _b; return (_b = (_a = repairState_1.componentRepairs[e.defRef]) === null || _a === void 0 ? void 0 : _a.attempts) !== null && _b !== void 0 ? _b : 0; }), false));
                    rSuffix = maxAttempt > 0 ? "-r".concat(maxAttempt) : '';
                    planId = "cb-mat-L".concat(rank).concat(gSuffix_1).concat(rSuffix);
                    refs = bucket.map(function (e) { return e.defRef; });
                    pendingRepairCount = Object.values(repairState_1.componentRepairs).filter(function (entry) { return entry.attempts > 0; }).length;
                    label = layerLabel(__spreadArray([], new Set(bucket.map(function (e) { return e.item.type; })), true));
                    intents = [
                        // Current layer starts now (its inner layers are already materialized -> no dependsOn needed).
                        (0, cbShared_js_1.createParallelStepIntent)(context, parentStep, planId, AGENT_NAME, "Materializar ".concat(label, " {{completed}}/{{total}} (repairs no trace)"), refs, [], 10),
                    ];
                    if (remainingLayers > 1) {
                        nextRank = ranksSorted[1];
                        nextLabel = layerLabel(__spreadArray([], new Set(byRank.get(nextRank).map(function (e) { return e.item.type; })), true));
                        // args carry the attempt/round so the runtime's hook dispatch key (unique args) never repeats
                        // across repair re-dispatches of the same rank.
                        intents.push((0, cbShared_js_1.createAddStepIntent)(context, parentStep, (0, cbShared_js_1.createAgentStepPayload)("cb-mat-after-L".concat(rank).concat(gSuffix_1).concat(rSuffix), AGENT_NAME, "Materializar ".concat(nextLabel), __assign({ planId: 'cb-materialize', minRank: rank + 1, att: maxAttempt, g: repairState_1.globalAttempts }, roundArgs), [planId], 'sequential', 'waiting_dependency')));
                    }
                    else {
                        // Last stale layer: seeds (or the repair-round barrier) runs after it materializes. A same-layer
                        // repair of THIS layer, if needed, reaches a later dispatch through the validate-all repair round.
                        intents.push(endStep([planId]));
                    }
                    intents.push((0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "materializing ".concat(label, " (").concat(refs.length, " file(s)); ").concat(pendingRepairCount, " repair(s) pending before this layer; ").concat(remainingLayers - 1, " layer(s) after")));
                    return [2 /*return*/, intents];
                case 9:
                    error_1 = _a.sent();
                    msg = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(msg));
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', msg)]];
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Human, content-based name for a materialization layer's progress title (replaces "L0/L1/…").
var ARTIFACT_LABEL = {
    domainEntity: 'entidades de domínio',
    repositoryPort: 'ports',
    persistenceTable: 'tabelas',
    repositoryAdapter: 'adapters',
    applicationUsecase: 'usecases',
    httpController: 'controllers',
};
function layerLabel(types) {
    var names = types.map(function (t) { return ARTIFACT_LABEL[t] || t; });
    return names.length ? names.join(' + ') : 'artefatos';
}
// Read a context/skill ref, falling back from .d.ts to its generated .ts sibling (mirrors the CLI).
function readContextRef(ref) {
    return __awaiter(this, void 0, void 0, function () {
        var direct;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, cbMaterializeIo_js_1.getContentByMlsPath)(ref)];
                case 1:
                    direct = _a.sent();
                    if (direct != null)
                        return [2 /*return*/, direct];
                    if (ref.endsWith('.d.ts'))
                        return [2 /*return*/, (0, cbMaterializeIo_js_1.getContentByMlsPath)(ref.replace(/\.d\.ts$/u, '.ts'))];
                    return [2 /*return*/, null];
            }
        });
    });
}
/** A parallel child must complete for the layer barrier, but every pre-prompt failure still needs a
 * repair record. A storage failure is made explicit in the child trace instead of being silent. */
function completeWorkerFailure(context, parentStep, step, hookSequential, defRef, message) {
    return __awaiter(this, void 0, void 0, function () {
        var trace, entry, error_2, persistence;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trace = "[repair] ".concat(message);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 5]);
                    return [4 /*yield*/, (0, cbRepair_js_1.recordComponentFailure)(defRef, [message])];
                case 2:
                    entry = _a.sent();
                    trace += " (attempt ".concat(entry.attempts, "/").concat(cbRepair_js_1.COMPONENT_REPAIR_BUDGET + 1, ")");
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _a.sent();
                    persistence = error_2 instanceof Error ? error_2.message : String(error_2);
                    trace += "; REPAIR STATE ERROR: ".concat(persistence);
                    return [4 /*yield*/, (0, cbRepair_js_1.saveHealthReport)({ outcome: 'repair-state-error', defRef: defRef, message: message, persistence: persistence })];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', trace)]];
            }
        });
    });
}
// WORKER: assemble the prompt for ONE defs file with the shared core and ask the model for the .ts.
function worker(agent, context, parentStep, step, hookSequential, defRef) {
    return __awaiter(this, void 0, void 0, function () {
        var content, error_3, message, parsed, skillSections, _i, _a, s, _b, _c, real, c, contextSections, _d, _e, d, _f, _g, real, c, system, human, repair, error_4, message;
        var _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    _k.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.getContentByMlsPath)(defRef)];
                case 1:
                    content = _k.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _k.sent();
                    message = error_3 instanceof Error ? error_3.message : String(error_3);
                    return [2 /*return*/, completeWorkerFailure(context, parentStep, step, hookSequential, defRef, "could not read defs: ".concat(message))];
                case 3:
                    if (!content)
                        return [2 /*return*/, completeWorkerFailure(context, parentStep, step, hookSequential, defRef, 'defs not found')];
                    _k.label = 4;
                case 4:
                    _k.trys.push([4, 18, , 19]);
                    parsed = (0, cbMaterializeCore_js_1.parseDefs)(content);
                    if (!parsed.item || !parsed.item.outputPath)
                        return [2 /*return*/, completeWorkerFailure(context, parentStep, step, hookSequential, defRef, 'no pipeline item in defs')];
                    skillSections = [];
                    _i = 0, _a = (_h = parsed.item.skills) !== null && _h !== void 0 ? _h : [];
                    _k.label = 5;
                case 5:
                    if (!(_i < _a.length)) return [3 /*break*/, 10];
                    s = _a[_i];
                    _b = 0, _c = (0, cbMaterializeCore_js_1.expandContextRef)(s);
                    _k.label = 6;
                case 6:
                    if (!(_b < _c.length)) return [3 /*break*/, 9];
                    real = _c[_b];
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.getContentByMlsPath)(real)];
                case 7:
                    c = _k.sent();
                    if (c != null)
                        skillSections.push("<!-- skill: ".concat(real, " -->\n").concat(c));
                    _k.label = 8;
                case 8:
                    _b++;
                    return [3 /*break*/, 6];
                case 9:
                    _i++;
                    return [3 /*break*/, 5];
                case 10:
                    contextSections = [];
                    _d = 0, _e = (_j = parsed.item.dependsFiles) !== null && _j !== void 0 ? _j : [];
                    _k.label = 11;
                case 11:
                    if (!(_d < _e.length)) return [3 /*break*/, 16];
                    d = _e[_d];
                    _f = 0, _g = (0, cbMaterializeCore_js_1.expandContextRef)(d);
                    _k.label = 12;
                case 12:
                    if (!(_f < _g.length)) return [3 /*break*/, 15];
                    real = _g[_f];
                    return [4 /*yield*/, readContextRef(real)];
                case 13:
                    c = _k.sent();
                    if (c != null)
                        contextSections.push("### ".concat(real, "\n```ts\n").concat(c, "\n```"));
                    _k.label = 14;
                case 14:
                    _f++;
                    return [3 /*break*/, 12];
                case 15:
                    _d++;
                    return [3 /*break*/, 11];
                case 16:
                    system = (0, cbMaterializeCore_js_1.buildSystemPrompt)(skillSections, parsed.item.outputPath, cbMaterializeCore_js_1.DEFAULT_MODEL_TYPE);
                    human = (0, cbMaterializeCore_js_1.buildHumanPrompt)(parsed.data, contextSections, parsed.item.outputPath);
                    return [4 /*yield*/, (0, cbRepair_js_1.getComponentRepair)(defRef)];
                case 17:
                    repair = _k.sent();
                    if (repair && repair.findings.length)
                        human += "\n\n".concat((0, cbRepair_js_1.buildRepairPromptSection)(repair));
                    // prompt_ready args MUST equal the parallel child's queued hook args (the defRef) so the runtime
                    // (continueBeforePrompt -> findBeforePromptStep by parentStepId+args) matches it.
                    return [2 /*return*/, [(0, cbShared_js_1.createPromptReadyIntent)(context, parentStep, hookSequential, defRef, system, human, cbMaterializeCore_js_1.GEN_TOOL, cbMaterializeCore_js_1.GEN_TOOL_NAME)]];
                case 18:
                    error_4 = _k.sent();
                    message = error_4 instanceof Error ? error_4.message : String(error_4);
                    return [2 /*return*/, completeWorkerFailure(context, parentStep, step, hookSequential, defRef, "could not prepare materialization prompt: ".concat(message))];
                case 19: return [2 /*return*/];
            }
        });
    });
}
function existingTsKeys(project, currentKey) {
    var keys = new Set([currentKey]);
    for (var _i = 0, _a = Object.values(mls.stor.files); _i < _a.length; _i++) {
        var file = _a[_i];
        if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted')
            continue;
        var shortName = String(file.shortName || '');
        if (file.extension === '.ts' && !shortName.endsWith('.defs') && !shortName.endsWith('.d')) {
            keys.add("".concat(String(file.folder || ''), "::").concat(shortName.toLowerCase()));
        }
    }
    return keys;
}
function lowerFirstLocal(value) {
    return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}
function validateUsecaseComponent(project, data, code, tsKeys) {
    var issues = [];
    var mdmRefs = new Set((0, cbShared_js_1.isRecord)(data) ? (0, cbShared_js_1.readStringArray)(data.mdmRefs).map(function (ref) { return ref.toLowerCase(); }) : []);
    for (var _i = 0, _a = (0, cbComponentValidators_js_1.collectL1Imports)(code, project); _i < _a.length; _i++) {
        var req = _a[_i];
        if (!tsKeys.has(req.key))
            issues.push("import unresolved -> imports '".concat(req.target, "' which was not generated"));
        for (var _b = 0, mdmRefs_1 = mdmRefs; _b < mdmRefs_1.length; _b++) {
            var mdmRef = mdmRefs_1[_b];
            var entityPath = "/entities/".concat(lowerFirstLocal(mdmRef));
            var portPath = "/ports/".concat(lowerFirstLocal(mdmRef), "Repository");
            var lowerTarget = req.target.toLowerCase();
            if (lowerTarget.includes(entityPath.toLowerCase()) || lowerTarget.includes(portPath.toLowerCase())) {
                issues.push("mdm local import forbidden -> ".concat(req.target));
            }
        }
    }
    if (/\/_\d+_\/l1\/[^'"]*\/layer_3_domain\/rules\//.test(code)) {
        issues.push('rulesApplied must be applied inline; layer_3_domain/rules/* is not generated');
    }
    var compact = code.replace(/\s+/g, ' ');
    if (/mdmEntityIndex\.findMany\(\s*\{[^}]*where\s*:\s*\{[^}]*\b(entityType|entityId|productId|warehouseId)\s*:/.test(compact)) {
        issues.push('mdmEntityIndex uses invented fields; use MdmEntityIndexRecord fields and load module data from mdmDocument.details');
    }
    if (/mdmRelationship/.test(code) && /\b(source_entity_|target_entity_)/.test(code)) {
        issues.push('mdmRelationship uses invented source_entity/target_entity fields; use MdmRelationshipRecord fromId/toId/type');
    }
    for (var _c = 0, _d = (0, cbComponentValidators_js_1.collectUsecaseRules)(data); _c < _d.length; _c++) {
        var rule = _d[_c];
        if (!new RegExp("\\b".concat((0, cbComponentValidators_js_1.escapeRegExp)(rule), "\\b")).test(code)) {
            issues.push("rulesApplied '".concat(rule, "' not present in generated .ts"));
        }
    }
    return issues;
}
function validateControllerComponent(data, code) {
    var _a;
    var issues = [];
    if (!(0, cbShared_js_1.isRecord)(data))
        return issues;
    var handlers = Array.isArray(data.handlers) ? data.handlers.filter(cbShared_js_1.isRecord) : [];
    var routes = Array.isArray(data.routes) ? data.routes.filter(cbShared_js_1.isRecord) : [];
    var handlerNames = new Set(handlers.map(function (h) { return String(h.handlerName || ''); }).filter(Boolean));
    var exportedHandlers = (0, cbComponentValidators_js_1.collectExportedHandlers)(code);
    var emittedRoutes = (0, cbComponentValidators_js_1.collectRouteHandlers)(code);
    var requiredChecks = (0, cbComponentValidators_js_1.collectRequiredChecksByHandler)(code);
    for (var _i = 0, handlers_1 = handlers; _i < handlers_1.length; _i++) {
        var handler = handlers_1[_i];
        var handlerName = String(handler.handlerName || '');
        if (!handlerName)
            continue;
        if (!exportedHandlers.has(handlerName))
            issues.push("handler ".concat(handlerName, " not exported in .ts"));
        var allowedRequired = (0, cbComponentValidators_js_1.requiredBoundaryFields)(handler.inputContract);
        for (var _b = 0, _c = (_a = requiredChecks.get(handlerName)) !== null && _a !== void 0 ? _a : []; _b < _c.length; _b++) {
            var checked = _c[_b];
            if (!allowedRequired.has(checked))
                issues.push("handler ".concat(handlerName, " requires '").concat(checked, "' outside l4 inputContract"));
        }
    }
    for (var _d = 0, routes_1 = routes; _d < routes_1.length; _d++) {
        var route = routes_1[_d];
        var key = String(route.key || '');
        var handlerName = String(route.handlerName || '');
        if (!key || !handlerName)
            continue;
        if (!handlerNames.has(handlerName))
            issues.push("route ".concat(key, " points to missing handler ").concat(handlerName));
        if (emittedRoutes.get(key) !== handlerName)
            issues.push("route ".concat(key, " not exported with handler ").concat(handlerName));
    }
    return issues;
}
function validateGeneratedComponent(project, item, data, code, currentKey) {
    var tsKeys = existingTsKeys(project, currentKey);
    var issues = (0, cbMdmGuards_js_1.collectRawMdmAccessIssues)(code);
    // Every component type: alias imports only. Rejecting here (repair finding) stops the model from
    // "fixing" an unresolved alias import by switching to a relative path (run task2/102049).
    issues.push.apply(issues, (0, cbComponentValidators_js_1.collectRelativeImportIssues)(code));
    if (item.type === 'applicationUsecase')
        issues.push.apply(issues, validateUsecaseComponent(project, data, code, tsKeys));
    if (item.type === 'httpController')
        issues.push.apply(issues, validateControllerComponent(data, code));
    return issues;
}
// afterPromptStep (worker only): take the generated code from the tool call and save the .ts.
// ENGINE SEMANTICS (observed 2026-07-04, run task1): a FAILED step does NOT satisfy dependsOn — when
// cb-mat-L4 failed (3 workers), cb-mat-after-L4 stayed waiting_dependency forever and the task died
// without repair or report. So a worker failure NEVER fails the child step: it is recorded in
// cb-repair-state (LLM-fixable classes) + surfaced as a "[repair]" trace, the step COMPLETES so the
// layer barrier advances, the dispatcher re-spawns the repairable components, and cb-validate-all
// remains the blocking gate for whatever did not converge.
function afterPromptStep(agent, context, parentStep, step, hookSequential, args) {
    return __awaiter(this, void 0, void 0, function () {
        var trace, defRef, content, parsed, item, payload, out, infra, message, entry, code, p, componentIssues, entry, saved, entry, repairEntry, entry, error_5;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 16, , 17]);
                    defRef = workerDefRef(args, step);
                    if (!defRef)
                        throw new Error('worker afterPrompt without defRef');
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.getContentByMlsPath)(defRef)];
                case 1:
                    content = _f.sent();
                    parsed = content ? (0, cbMaterializeCore_js_1.parseDefs)(content) : null;
                    item = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.item) !== null && _a !== void 0 ? _a : null;
                    if (!item || !item.outputPath)
                        throw new Error("no pipeline item in ".concat(defRef));
                    payload = (_c = (_b = step.interaction) === null || _b === void 0 ? void 0 : _b.payload) === null || _c === void 0 ? void 0 : _c[0];
                    out = (0, cbMaterializeIo_js_1.extractToolCallArgs)(payload, cbMaterializeCore_js_1.GEN_TOOL_NAME);
                    if (!!(out === null || out === void 0 ? void 0 : out.code)) return [3 /*break*/, 3];
                    infra = ((_e = (_d = step.interaction) === null || _d === void 0 ? void 0 : _d.trace) !== null && _e !== void 0 ? _e : []).map(String)
                        .filter(function (t) { return t.includes('Error invoking Collab LLM proxy') || t.includes('Error executing AI task'); }).slice(-1)[0];
                    message = infra
                        ? "LLM infra failure (no payload): ".concat(infra.slice(0, 300))
                        : 'model returned no code (missing/invalid tool call)';
                    return [4 /*yield*/, (0, cbRepair_js_1.recordComponentFailure)(defRef, [message])];
                case 2:
                    entry = _f.sent();
                    throw new Error("".concat(infra ? 'LLM infra failure' : 'missing generated code', " (attempt ").concat(entry.attempts, "/").concat(cbRepair_js_1.COMPONENT_REPAIR_BUDGET + 1, ")"));
                case 3:
                    code = (0, cbMaterializeCore_js_1.applyHeader)(item.outputPath, out.code);
                    p = (0, cbMaterializeIo_js_1.parseMlsPath)(item.outputPath);
                    if (!p)
                        throw new Error("invalid outputPath: ".concat(item.outputPath));
                    componentIssues = validateGeneratedComponent(p.project, item, parsed === null || parsed === void 0 ? void 0 : parsed.data, code, "".concat(p.folder, "::").concat(p.shortName.toLowerCase()));
                    if (!componentIssues.length) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, cbRepair_js_1.recordComponentFailure)(defRef, componentIssues, code)];
                case 4:
                    entry = _f.sent();
                    throw new Error("component integrity failed (attempt ".concat(entry.attempts, "/").concat(cbRepair_js_1.COMPONENT_REPAIR_BUDGET + 1, "): ").concat(componentIssues.slice(0, 8).join('; ')));
                case 5: return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedTs)(p.project, p.level, p.folder, p.shortName, code)];
                case 6:
                    saved = _f.sent();
                    if (!!saved.ok) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, cbRepair_js_1.recordComponentFailure)(defRef, ['saveGeneratedTs failed before output could be persisted'], code)];
                case 7:
                    entry = _f.sent();
                    throw new Error("saveGeneratedTs failed (attempt ".concat(entry.attempts, "/").concat(cbRepair_js_1.COMPONENT_REPAIR_BUDGET + 1, ")"));
                case 8:
                    if (!saved.compileErrors.length) return [3 /*break*/, 12];
                    return [4 /*yield*/, (0, cbRepair_js_1.getComponentRepair)(defRef)];
                case 9:
                    repairEntry = _f.sent();
                    if (!(repairEntry || saved.syntaxErrors.length)) return [3 /*break*/, 11];
                    return [4 /*yield*/, (0, cbRepair_js_1.recordComponentFailure)(defRef, saved.compileErrors.map(function (e) { return "compiler: ".concat(e); }), code)];
                case 10:
                    entry = _f.sent();
                    (0, cbRepair_js_1.forceDefsStale)(defRef);
                    throw new Error("compile failed (attempt ".concat(entry.attempts, "/").concat(cbRepair_js_1.COMPONENT_REPAIR_BUDGET + 1, "): ").concat(saved.compileErrors.slice(0, 4).join('; ')));
                case 11:
                    // FIRST PASS (layer sweep) — user decision 2026-07-17 (run 102049-e): compile findings here can
                    // be FALSE (siblings/other layers still materializing), so the compile gate is DEFERRED: the .ts
                    // stays saved and cb-validate-all's whole-project compile re-checks with every file present,
                    // routing REAL errors to the global repair rounds. Content checks above remain immediate gates.
                    trace = "[compile-deferred] ".concat(saved.compileErrors.length, " error(s) \u2014 re-checked by validate-all: ").concat(saved.compileErrors.slice(0, 3).join('; '));
                    _f.label = 12;
                case 12:
                    if (!!saved.compilerAvailable) return [3 /*break*/, 14];
                    trace = "[infra] Monaco compiler unavailable for ".concat(defRef, "; deterministic syntax checks passed, project gate remains required");
                    return [4 /*yield*/, (0, cbRepair_js_1.saveHealthReport)({ outcome: 'materialize-infra-warning', defRef: defRef, compilerAvailable: false, message: trace })];
                case 13:
                    _f.sent();
                    _f.label = 14;
                case 14: return [4 /*yield*/, (0, cbRepair_js_1.clearComponentRepair)(defRef)];
                case 15:
                    _f.sent(); // converged: drop the repair record
                    return [3 /*break*/, 17];
                case 16:
                    error_5 = _f.sent();
                    // No console output: repair is an expected, handled path. The trace below lands on the step, the
                    // findings live in cb-repair-state, and cb-validate-all is where a real failure surfaces.
                    trace = "[repair] ".concat(error_5 instanceof Error ? error_5.message : String(error_5));
                    return [3 /*break*/, 17];
                case 17: 
                // No enqueueNext: cb-gen-seeds was queued by the dispatcher with a join dependsOn on the last layer.
                // Always 'completed' (see engine-semantics note above): the trace carries the failure, the repair
                // state carries the routing, and cb-validate-all carries the enforcement.
                return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', trace)]];
            }
        });
    });
}
