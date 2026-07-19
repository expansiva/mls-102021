"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seeds/agentCbSeeds.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var cbSchemas_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js");
var cbSeedsCore_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbSeedsCore.js");
var AGENT_NAME = 'agentCbSeeds';
var TOOL_NAME = 'submitSeedScenario';
var MAX_PLAN_ATTEMPTS = 2;
var toolSchema = (0, cbShared_js_1.createPlannerToolSchema)(TOOL_NAME, 'Submit the deterministic seed scenario plan.', cbSchemas_js_1.seedPlanResultSchema);
function createAgent() {
    return {
        agentName: AGENT_NAME,
        agentProject: 102021,
        agentFolder: 'agentChangeBackend/steps/gen-seeds',
        agentDescription: 'Plan seed scenarios with an LLM, then compile and validate deterministic TableSeedRows',
        visibility: 'private',
        beforePromptStep: beforePromptStep,
        afterPromptStep: afterPromptStep,
    };
}
function seedArgsOf(step) {
    try {
        var raw = JSON.parse(String(step.prompt || '{}'));
        return {
            seedAttempt: typeof raw.seedAttempt === 'number' && raw.seedAttempt > 0 ? raw.seedAttempt : 1,
            seedFindings: Array.isArray(raw.seedFindings) ? raw.seedFindings.filter(function (value) { return typeof value === 'string'; }).slice(0, 40) : [],
            forcedBatch: parseWave(raw.forcedBatch),
        };
    }
    catch (_a) {
        return { seedAttempt: 1, seedFindings: [] };
    }
}
function parseWave(value) {
    if (!(0, cbShared_js_1.isRecord)(value) || typeof value.index !== 'number')
        return undefined;
    var values = function (key) { return Array.isArray(value[key])
        ? value[key].filter(function (item) { return typeof item === 'string' && !!item; }).sort()
        : []; };
    return { index: value.index, tableIds: values('tableIds'), mdmEntityIds: values('mdmEntityIds') };
}
function emptyPlan() {
    return { summary: '', localTables: [], mdmEntities: [] };
}
function plannedTargetIds(plan) {
    return new Set(__spreadArray(__spreadArray([], plan.localTables.map(function (table) { return "table:".concat(table.tableId); }), true), plan.mdmEntities.map(function (entity) { return "mdm:".concat(entity.entityId); }), true));
}
function nextSeedBatch(input, plan, forcedBatch) {
    var _a;
    var planned = plannedTargetIds(plan);
    var usableForced = forcedBatch && __spreadArray(__spreadArray([], forcedBatch.tableIds.map(function (id) { return "table:".concat(id); }), true), forcedBatch.mdmEntityIds.map(function (id) { return "mdm:".concat(id); }), true).some(function (id) { return !planned.has(id); });
    if (usableForced)
        return forcedBatch;
    for (var _i = 0, _b = (0, cbSeedsCore_js_1.deriveSeedPlanningWaves)(input); _i < _b.length; _i++) {
        var wave = _b[_i];
        var missing = {
            index: wave.index,
            tableIds: wave.tableIds.filter(function (id) { return !planned.has("table:".concat(id)); }),
            mdmEntityIds: wave.mdmEntityIds.filter(function (id) { return !planned.has("mdm:".concat(id)); }),
        };
        if (!missing.tableIds.length && !missing.mdmEntityIds.length)
            continue;
        return (_a = (0, cbSeedsCore_js_1.splitSeedPlanningWave)(input, missing)[0]) !== null && _a !== void 0 ? _a : null;
    }
    return null;
}
function completedWaveIndexes(input, plan) {
    var planned = plannedTargetIds(plan);
    return (0, cbSeedsCore_js_1.deriveSeedPlanningWaves)(input).filter(function (wave) {
        return wave.tableIds.every(function (id) { return planned.has("table:".concat(id)); }) && wave.mdmEntityIds.every(function (id) { return planned.has("mdm:".concat(id)); });
    }).map(function (wave) { return wave.index; });
}
function splitBatchForRetry(input, batch) {
    var tighterBudget = Math.max(300, Math.floor((0, cbSeedsCore_js_1.estimateSeedPlanningWaveTokens)(input, batch) / 2));
    var batches = (0, cbSeedsCore_js_1.splitSeedPlanningWave)(input, batch, tighterBudget);
    return batches.length > 1 ? batches[0] : null;
}
function isOutputLimitFailure(value) {
    return /TOOL_ARGS_SCHEMA|truncat|output.{0,20}(limit|token)|recognized submitSeedScenario/iu.test(String(value));
}
function outputTokenTrace(payload) {
    try {
        var match = JSON.stringify(payload).match(/"(?:outputTokens|output_tokens|completion_tokens)"\s*:\s*(\d+)/u);
        return match ? "reported output tokens ".concat(match[1]) : 'reported output tokens unavailable';
    }
    catch (_a) {
        return 'reported output tokens unavailable';
    }
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, input, args, persisted, reused, saved, progress, batch, waveInput, estimatedTokens, human, systemPrompt, error_1, message;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _b.sent();
                    return [4 /*yield*/, readSeedBuildInput(scan)];
                case 2:
                    input = _b.sent();
                    args = seedArgsOf(step);
                    return [4 /*yield*/, readPersistedPlan(input.project, input.moduleName)];
                case 3:
                    persisted = _b.sent();
                    if (!(persisted && !persisted.partial)) return [3 /*break*/, 6];
                    reused = (0, cbSeedsCore_js_1.buildSeedSource)(__assign(__assign({}, input), { plan: persisted.plan }));
                    if (!(!reused.errors.length && reused.content)) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedTs)(input.project, 1, "".concat(input.moduleName, "/layer_1_external/adapters/persistence"), 'seeds', reused.content)];
                case 4:
                    saved = _b.sent();
                    if (!saved.ok || saved.compileErrors.length)
                        throw new Error("failed to compile reused seeds.ts: ".concat(saved.compileErrors.join('; ')));
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-seed-assets', 'agentCbSeedAssets', 'Gerar assets de seeds', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "Reused validated deterministic seed plan (".concat(reused.summary, ")."), 'input_output'),
                        ]];
                case 5:
                    (_a = args.seedFindings).push.apply(_a, reused.errors.slice(0, 40));
                    _b.label = 6;
                case 6:
                    progress = (persisted === null || persisted === void 0 ? void 0 : persisted.partial) ? persisted : { plan: emptyPlan(), partial: true, completedWaveIndexes: [] };
                    batch = nextSeedBatch(input, progress.plan, args.forcedBatch);
                    if (!batch)
                        return [2 /*return*/, finalizeSeedPlan(context, parentStep, step, hookSequential, input, progress.plan, 'Resumed all validated seed waves.')];
                    waveInput = (0, cbSeedsCore_js_1.seedPlanInputForWave)(input, batch);
                    estimatedTokens = (0, cbSeedsCore_js_1.estimateSeedPlanningWaveTokens)(input, batch);
                    human = (0, cbSeedsCore_js_1.seedPlanPromptContext)(waveInput, args.seedFindings, {
                        wave: batch,
                        catalog: (0, cbSeedsCore_js_1.seedReferenceCatalog)(progress.plan),
                        priorSummary: progress.plan.summary,
                        estimatedOutputTokens: estimatedTokens,
                    });
                    return [4 /*yield*/, (0, cbShared_js_1.readCbPrompt)('steps/gen-seeds')];
                case 7:
                    systemPrompt = _b.sent();
                    return [2 /*return*/, [(0, cbShared_js_1.createPromptReadyIntent)(context, parentStep, hookSequential, (step.prompt || ''), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)]];
                case 8:
                    error_1 = _b.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(message));
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', message)]];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function afterPromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, input, args, persisted, progress, batch, payload, out, split, plan, waveInput, errors, nextAttempt, tokenTrace, merged, next, partial, saved, error_2, message;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _c.sent();
                    return [4 /*yield*/, readSeedBuildInput(scan)];
                case 2:
                    input = _c.sent();
                    args = seedArgsOf(step);
                    return [4 /*yield*/, readPersistedPlan(input.project, input.moduleName)];
                case 3:
                    persisted = _c.sent();
                    progress = (persisted === null || persisted === void 0 ? void 0 : persisted.partial) ? persisted : { plan: emptyPlan(), partial: true, completedWaveIndexes: [] };
                    batch = nextSeedBatch(input, progress.plan, args.forcedBatch);
                    if (!batch)
                        return [2 /*return*/, finalizeSeedPlan(context, parentStep, step, hookSequential, input, progress.plan, 'All seed waves were already complete.')];
                    payload = (_b = (_a = step.interaction) === null || _a === void 0 ? void 0 : _a.payload) === null || _b === void 0 ? void 0 : _b[0];
                    if (!payload)
                        throw new Error('missing seed scenario payload');
                    out = void 0;
                    try {
                        out = (0, cbShared_js_1.extractPlannerOutput)(payload, (0, cbShared_js_1.plannerConfig)(TOOL_NAME));
                        if (out.status === 'failed')
                            throw new Error(out.trace.join('; ') || 'model returned failed for seed scenario');
                    }
                    catch (error) {
                        split = isOutputLimitFailure(error) ? splitBatchForRetry(input, batch) : null;
                        if (split)
                            return [2 /*return*/, scheduleSeedStep(context, parentStep, step, hookSequential, {
                                    seedAttempt: 1,
                                    seedFindings: ["Planner output exceeded its schema/token budget; split ".concat(batch.tableIds.length + batch.mdmEntityIds.length, " targets into a smaller batch.")],
                                    forcedBatch: split,
                                }, "Seed batch split after output limit (wave ".concat(batch.index, "; estimated ").concat((0, cbSeedsCore_js_1.estimateSeedPlanningWaveTokens)(input, batch), " tokens)."))];
                        throw error;
                    }
                    plan = (0, cbSeedsCore_js_1.parseSeedPlan)(out.result);
                    waveInput = (0, cbSeedsCore_js_1.seedPlanInputForWave)(input, batch);
                    errors = (0, cbSeedsCore_js_1.validateSeedPlan)(__assign(__assign({}, waveInput), { plan: plan }), (0, cbSeedsCore_js_1.seedReferenceCatalog)(progress.plan).map(function (item) { return item.ref; }));
                    return [4 /*yield*/, (0, cbShared_js_1.saveAgentTrace)(context, AGENT_NAME, step)];
                case 4:
                    _c.sent();
                    if (errors.length) {
                        if (args.seedAttempt < MAX_PLAN_ATTEMPTS) {
                            nextAttempt = args.seedAttempt + 1;
                            return [2 /*return*/, scheduleSeedStep(context, parentStep, step, hookSequential, {
                                    seedAttempt: nextAttempt,
                                    seedFindings: errors.slice(0, 40),
                                    forcedBatch: batch,
                                }, "Seed wave ".concat(batch.index, " rejected; repair ").concat(nextAttempt, "/").concat(MAX_PLAN_ATTEMPTS, " scheduled: ").concat(errors.slice(0, 12).join('; ')))];
                        }
                        return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', "Seed wave ".concat(batch.index, " validation failed after ").concat(args.seedAttempt, "/").concat(MAX_PLAN_ATTEMPTS, ": ").concat(errors.slice(0, 30).join('; ')))]];
                    }
                    tokenTrace = outputTokenTrace(payload);
                    merged = (0, cbSeedsCore_js_1.mergeSeedPlans)(progress.plan, plan);
                    next = nextSeedBatch(input, merged);
                    partial = (0, cbSeedsCore_js_1.buildPartialSeedSource)(input, { plan: merged, completedWaveIndexes: completedWaveIndexes(input, merged) });
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedTs)(input.project, 1, "".concat(input.moduleName, "/layer_1_external/adapters/persistence"), 'seeds', partial)];
                case 5:
                    saved = _c.sent();
                    if (!saved.ok || saved.compileErrors.length)
                        throw new Error("failed to persist partial seeds.ts: ".concat(saved.compileErrors.join('; ')));
                    if (!next)
                        return [2 /*return*/, finalizeSeedPlan(context, parentStep, step, hookSequential, input, merged, "Generated final seed wave ".concat(batch.index, " (estimated ").concat((0, cbSeedsCore_js_1.estimateSeedPlanningWaveTokens)(input, batch), " tokens; ").concat(tokenTrace, ")."))];
                    return [2 /*return*/, scheduleSeedStep(context, parentStep, step, hookSequential, { seedAttempt: 1, seedFindings: [], forcedBatch: next }, "Validated seed wave ".concat(batch.index, "; persisted partial plan and scheduled the next wave (estimated ").concat((0, cbSeedsCore_js_1.estimateSeedPlanningWaveTokens)(input, batch), " tokens; ").concat(tokenTrace, ")."))];
                case 6:
                    error_2 = _c.sent();
                    message = error_2 instanceof Error ? error_2.message : String(error_2);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(message));
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', message)]];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function scheduleSeedStep(context, parentStep, step, hookSequential, args, trace) {
    var _a, _b;
    var planId = "cb-gen-seeds-w".concat((_b = (_a = args.forcedBatch) === null || _a === void 0 ? void 0 : _a.index) !== null && _b !== void 0 ? _b : 'next', "-r").concat(args.seedAttempt, "-").concat(Date.now());
    return [
        (0, cbShared_js_1.createAddStepIntent)(context, parentStep, (0, cbShared_js_1.createAgentStepPayload)(planId, AGENT_NAME, args.seedAttempt > 1 ? "Reparar plano de seeds (".concat(args.seedAttempt, "/").concat(MAX_PLAN_ATTEMPTS, ")") : "Planejar pr\u00F3xima onda de seeds", __assign(__assign({ planId: planId }, args), { partialPlanRef: 'seeds.ts' }), [], 'sequential', 'waiting_human_input')),
        (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
    ];
}
function finalizeSeedPlan(context, parentStep, step, hookSequential, input, plan, trace) {
    return __awaiter(this, void 0, void 0, function () {
        var built, saved;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    built = (0, cbSeedsCore_js_1.buildSeedSource)(__assign(__assign({}, input), { plan: plan }));
                    if (built.errors.length || !built.content)
                        throw new Error("final seed plan validation failed: ".concat(built.errors.slice(0, 30).join('; ')));
                    return [4 /*yield*/, (0, cbMaterializeIo_js_1.saveGeneratedTs)(input.project, 1, "".concat(input.moduleName, "/layer_1_external/adapters/persistence"), 'seeds', built.content)];
                case 1:
                    saved = _a.sent();
                    if (!saved.ok || saved.compileErrors.length)
                        throw new Error("failed to compile seeds.ts: ".concat(saved.compileErrors.join('; ')));
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-seed-assets', 'agentCbSeedAssets', 'Gerar assets de seeds', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "".concat(trace, " Final validation succeeded (").concat(built.summary, ")."), 'input_output'),
                        ]];
            }
        });
    });
}
function readSeedBuildInput(scan) {
    return __awaiter(this, void 0, void 0, function () {
        var project, moduleName, language, entities, ruleIds, ruleDefs, ruleById, rules, relationships, actors;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    project = scan.project;
                    moduleName = scan.moduleNames[0] || 'unknown';
                    return [4 /*yield*/, readDefaultLanguage(project)];
                case 1:
                    language = _b.sent();
                    entities = scan.entities.map(function (entity) {
                        var _a;
                        return ({
                            entityId: entity.entityId,
                            title: entity.title,
                            kind: entity.kind,
                            fields: ((_a = entity.fields) !== null && _a !== void 0 ? _a : []).filter(cbShared_js_1.isRecord).map(function (field) { return ({
                                fieldId: (0, cbShared_js_1.readString)(field.fieldId),
                                type: (0, cbShared_js_1.readString)(field.type),
                                required: field.required === true,
                                enumValues: (0, cbShared_js_1.readStringArray)(field.enum),
                            }); }).filter(function (field) { return !!field.fieldId; }),
                        });
                    });
                    ruleIds = __spreadArray([], new Set(scan.owners.flatMap(function (owner) { return owner.rulesApplied; })), true).sort();
                    return [4 /*yield*/, readRuleDefinitions(project)];
                case 2:
                    ruleDefs = _b.sent();
                    ruleById = new Map(ruleDefs.map(function (rule) { return [rule.ruleId, rule]; }));
                    rules = ruleIds.map(function (ruleId) { var _a; return (_a = ruleById.get(ruleId)) !== null && _a !== void 0 ? _a : { ruleId: ruleId, title: '', description: '', appliesTo: [] }; });
                    relationships = scan.relationships.map(function (rel) { return ({ fromEntity: rel.fromEntity, toEntity: rel.toEntity, type: rel.type }); });
                    return [4 /*yield*/, readActorDefinitions(project)];
                case 3:
                    actors = _b.sent();
                    _a = {
                        project: project,
                        moduleName: moduleName,
                        language: language,
                        entities: entities
                    };
                    return [4 /*yield*/, readTablePlans(project, moduleName)];
                case 4: return [2 /*return*/, (_a.tablePlans = _b.sent(),
                        _a.ruleIds = ruleIds,
                        _a.rules = rules,
                        _a.relationships = relationships,
                        _a.actors = actors,
                        _a.timeWindow = { start: cbSeedsCore_js_1.SEED_WINDOW_START, end: cbSeedsCore_js_1.SEED_WINDOW_END },
                        _a)];
            }
        });
    });
}
/** L4 actors (id + title) from every actor set def in the project. The planner references these as
 * platform-user identities so FKs to people (assignees, actorSession-resolved workers) resolve
 * without fabricating a table — mirrors readRuleDefinitions. */
function readActorDefinitions(project) {
    return __awaiter(this, void 0, void 0, function () {
        var actors, seen, _i, _a, file, parsed, _b, _c, _d, _e, raw, actorId;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    actors = [];
                    seen = new Set();
                    _i = 0, _a = Object.values(mls.stor.files);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts')
                        return [3 /*break*/, 3];
                    _b = cbShared_js_1.parseDefsSource;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    parsed = _b.apply(void 0, [_c.apply(void 0, [_f.sent()])]);
                    if (!(0, cbShared_js_1.isRecord)(parsed) || !Array.isArray(parsed.actors))
                        return [3 /*break*/, 3];
                    for (_d = 0, _e = parsed.actors; _d < _e.length; _d++) {
                        raw = _e[_d];
                        if (!(0, cbShared_js_1.isRecord)(raw))
                            continue;
                        actorId = (0, cbShared_js_1.readString)(raw.actorId);
                        if (!actorId || seen.has(actorId))
                            continue;
                        seen.add(actorId);
                        actors.push({ actorId: actorId, title: (0, cbShared_js_1.readString)(raw.title) });
                    }
                    _f.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, actors];
            }
        });
    });
}
/** Full L4 rule text (id + title + description + appliesTo) from every rule set def in the project.
 * The planner receives the semantics of each applied rule instead of an opaque id, so it can satisfy
 * the rules without any domain-specific check hardcoded into the generator. */
function readRuleDefinitions(project) {
    return __awaiter(this, void 0, void 0, function () {
        var rules, _i, _a, file, parsed, _b, _c, _d, _e, raw, ruleId;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    rules = [];
                    _i = 0, _a = Object.values(mls.stor.files);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts')
                        return [3 /*break*/, 3];
                    _b = cbShared_js_1.parseDefsSource;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    parsed = _b.apply(void 0, [_c.apply(void 0, [_f.sent()])]);
                    if (!(0, cbShared_js_1.isRecord)(parsed) || !Array.isArray(parsed.rules))
                        return [3 /*break*/, 3];
                    for (_d = 0, _e = parsed.rules; _d < _e.length; _d++) {
                        raw = _e[_d];
                        if (!(0, cbShared_js_1.isRecord)(raw))
                            continue;
                        ruleId = (0, cbShared_js_1.readString)(raw.ruleId);
                        if (!ruleId)
                            continue;
                        rules.push({ ruleId: ruleId, title: (0, cbShared_js_1.readString)(raw.title), description: (0, cbShared_js_1.readString)(raw.description), appliesTo: (0, cbShared_js_1.readStringArray)(raw.appliesTo) });
                    }
                    _f.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, rules];
            }
        });
    });
}
function readDefaultLanguage(project) {
    return __awaiter(this, void 0, void 0, function () {
        var key, file, cfg, _a, _b, _c, first, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 2, , 3]);
                    key = mls.stor.getKeyToFile({ project: project, level: 5, folder: '', shortName: 'project', extension: '.json' });
                    file = mls.stor.files[key];
                    if (!file || file.status === 'deleted')
                        return [2 /*return*/, 'en'];
                    _b = (_a = JSON).parse;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 1:
                    cfg = _b.apply(_a, [_c.apply(void 0, [_e.sent()])]);
                    first = Array.isArray(cfg.languages) ? cfg.languages[0] : null;
                    return [2 /*return*/, (0, cbShared_js_1.isRecord)(first) && typeof first.language === 'string' && first.language.trim() ? first.language.trim() : 'en'];
                case 2:
                    _d = _e.sent();
                    return [2 /*return*/, 'en'];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function readTablePlans(project, moduleName) {
    return __awaiter(this, void 0, void 0, function () {
        var plans, _i, _a, file, artifact, _b, _c, data, tableId, columns;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    plans = [];
                    _i = 0, _a = Object.values(mls.stor.files);
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts' || String(file.folder || '') !== "".concat(moduleName, "/layer_1_external/adapters/persistence"))
                        return [3 /*break*/, 3];
                    _b = parseArtifact;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    artifact = _b.apply(void 0, [_c.apply(void 0, [_d.sent()])]);
                    if (!artifact || artifact.artifactType !== 'table' || !(0, cbShared_js_1.isRecord)(artifact.data))
                        return [3 /*break*/, 3];
                    data = artifact.data;
                    tableId = (0, cbShared_js_1.readString)(data.tableId) || (0, cbShared_js_1.readString)(artifact.artifactId) || String(file.shortName || '');
                    columns = Array.isArray(data.columns) ? data.columns.filter(cbShared_js_1.isRecord).map(function (column) { return ({
                        name: (0, cbShared_js_1.readString)(column.name),
                        type: (0, cbShared_js_1.readString)(column.type),
                        nullable: column.nullable === true,
                    }); }).filter(function (column) { return !!column.name; }) : [];
                    if (!tableId || !columns.length)
                        return [3 /*break*/, 3];
                    plans.push({
                        tableId: tableId,
                        tableName: (0, cbShared_js_1.readString)(data.tableName) || tableId,
                        seedFor: "".concat(moduleName).concat(tableId),
                        columns: columns,
                        primaryKey: Array.isArray(data.primaryKey) ? data.primaryKey.map(cbShared_js_1.readString).filter(Boolean) : [],
                    });
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, plans.sort(function (left, right) { return left.seedFor.localeCompare(right.seedFor); })];
            }
        });
    });
}
function parseArtifact(content) {
    var start = content.indexOf('= ');
    var end = content.indexOf(' as const;');
    if (start === -1 || end <= start)
        return undefined;
    try {
        var parsed = JSON.parse(content.slice(start + 2, end));
        return (0, cbShared_js_1.isRecord)(parsed) ? parsed : undefined;
    }
    catch (_a) {
        return undefined;
    }
}
function readPersistedPlan(project, moduleName) {
    return __awaiter(this, void 0, void 0, function () {
        var fileInfo, key, file, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    fileInfo = { project: project, level: 1, folder: "".concat(moduleName, "/layer_1_external/adapters/persistence"), shortName: 'seeds', extension: '.ts' };
                    key = mls.stor.getKeyToFile(fileInfo);
                    file = mls.stor.files[key];
                    if (!file || file.status === 'deleted')
                        return [2 /*return*/, null];
                    _a = cbSeedsCore_js_1.extractSeedPlanProgressFromSource;
                    _b = String;
                    return [4 /*yield*/, file.getContent()];
                case 1: return [2 /*return*/, _a.apply(void 0, [_b.apply(void 0, [_d.sent()])])];
                case 2:
                    _c = _d.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
