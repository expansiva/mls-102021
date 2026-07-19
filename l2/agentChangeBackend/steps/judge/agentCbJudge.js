"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/judge/agentCbJudge.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var cbMaterializeCore_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js");
var cbSchemas_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js");
var cbRepair_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbRepair.js");
var AGENT_NAME = 'agentCbJudge';
var TOOL_NAME = 'submitJudgeFindings';
var toolSchema = (0, cbShared_js_1.createPlannerToolSchema)(TOOL_NAME, 'Submit the judge findings.', cbSchemas_js_1.judgeResultSchema);
function createAgent() {
    return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/judge', agentDescription: 'Adversarial critic: usecase defs vs L4 contract; routes error findings to the repair loop', visibility: 'private', beforePromptStep: beforePromptStep, afterPromptStep: afterPromptStep };
}
/** Step args: { judgeRun: n, owners?: [...] }. On re-verification runs (n > 1) `owners` scopes the
 * judge MECHANICALLY to the usecases that were just repaired — cheaper and faster than re-judging
 * everything, and a clean pass on the repaired subset is what the re-run must prove. */
function judgeArgsOf(step) {
    try {
        var p = JSON.parse(String(step.prompt || '{}'));
        return {
            judgeRun: p && typeof p.judgeRun === 'number' && p.judgeRun > 0 ? p.judgeRun : 1,
            owners: p && Array.isArray(p.owners) ? p.owners.filter(function (o) { return typeof o === 'string' && !!o; }) : [],
        };
    }
    catch (_a) {
        return { judgeRun: 1, owners: [] };
    }
}
/** Read the saved usecase defs data for the given operation owners (null when missing). */
function readUsecaseDefsByOwner(scan, operations) {
    return __awaiter(this, void 0, void 0, function () {
        var project, byShortName, _i, _a, file, parsed, _b, _c, out, _d, operations_1, owner;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    project = scan.project;
                    byShortName = new Map();
                    _i = 0, _a = Object.values(mls.stor.files);
                    _f.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/layer_2_application/usecases'))
                        return [3 /*break*/, 3];
                    _b = cbMaterializeCore_js_1.parseDefs;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    parsed = _b.apply(void 0, [_c.apply(void 0, [_f.sent()])]);
                    if ((0, cbShared_js_1.isRecord)(parsed.data))
                        byShortName.set(String(file.shortName || '').toLowerCase(), parsed.data);
                    _f.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    out = new Map();
                    for (_d = 0, operations_1 = operations; _d < operations_1.length; _d++) {
                        owner = operations_1[_d];
                        out.set(owner.id, (_e = byShortName.get((0, cbShared_js_1.lowerFirst)(owner.id).toLowerCase())) !== null && _e !== void 0 ? _e : null);
                    }
                    return [2 /*return*/, out];
            }
        });
    });
}
/** The operation owners in scope for this judge run (all on run 1; only the repaired subset after). */
function scopedOperations(scan, step) {
    var _a = judgeArgsOf(step), judgeRun = _a.judgeRun, owners = _a.owners;
    var operations = scan.owners.filter(function (o) { return o.kind === 'operation'; });
    if (judgeRun > 1 && owners.length)
        operations = operations.filter(function (o) { return owners.includes(o.id); });
    return { judgeRun: judgeRun, operations: operations };
}
/** Deterministic pre-findings: an operation owner whose usecase .defs.ts is missing entirely. */
function missingDefsFindings(defsByOwner) {
    var findings = [];
    for (var _i = 0, defsByOwner_1 = defsByOwner; _i < defsByOwner_1.length; _i++) {
        var _a = defsByOwner_1[_i], ownerId = _a[0], defs = _a[1];
        if (defs === null) {
            findings.push({ ownerId: ownerId, type: 'estrutural', severity: 'error', message: "usecase .defs.ts missing for operation ".concat(ownerId, " (worker failed or never saved)") });
        }
    }
    return findings;
}
/** The reduced L4 contract the judge compares against (authoritative side). */
function ownerContract(o) {
    var _a;
    return {
        ownerId: o.id,
        opKind: o.opKind,
        entity: o.entity,
        actors: o.actors, // l4 v2 plural (fallback single `actor`); the usecase is authorized for these
        reads: o.reads,
        writes: o.writes,
        rulesApplied: o.rulesApplied,
        accessPattern: (_a = o.accessPattern) !== null && _a !== void 0 ? _a : null,
        inputs: o.inputs, // inputs carry explicit `type` OR `fieldRef` (N1b) — no re-inference
        contextResolution: o.contextResolution,
        acceptanceAssertions: o.acceptanceAssertions,
    };
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, _a, judgeRun, operations, defsByOwner_2, pairs, validPorts, mdmIds, human, systemPrompt, error_1, msg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _b.sent();
                    _a = scopedOperations(scan, step), judgeRun = _a.judgeRun, operations = _a.operations;
                    if (!operations.length) {
                        return [2 /*return*/, [
                                (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
                                (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', 'no operation owners to judge'),
                            ]];
                    }
                    return [4 /*yield*/, readUsecaseDefsByOwner(scan, operations)];
                case 2:
                    defsByOwner_2 = _b.sent();
                    pairs = operations.map(function (o) {
                        var _a;
                        return ({
                            l4Contract: ownerContract(o),
                            generatedUsecaseDefs: (_a = defsByOwner_2.get(o.id)) !== null && _a !== void 0 ? _a : null,
                        });
                    });
                    validPorts = __spreadArray(__spreadArray([], scan.aggregates.map(function (a) { return a.rootEntity; }), true), scan.events.filter(function (ev) { return ev.persisted; }).map(function (ev) { return ev.entityId; }), true);
                    mdmIds = scan.entities.filter(function (e) { return e.kind === 'mdm'; }).map(function (e) { return e.entityId; });
                    human = [
                        "## Valid repository ports (aggregate roots + persisted event stores): ".concat(JSON.stringify(validPorts)),
                        "## MDM entities (read by id via 102034; NEVER a port, NEVER a local entity): ".concat(JSON.stringify(mdmIds)),
                        '',
                        '## Pairs to judge (L4 contract = source of truth vs generated usecase defs)',
                        JSON.stringify(pairs, null, 2),
                        '',
                        judgeRun > 1 ? "NOTE: re-verification run \u2014 only the ".concat(operations.length, " repaired usecase(s) are being judged.") : '',
                        "Judge every pair. Call ".concat(TOOL_NAME, " with the findings (empty array when everything is coherent)."),
                    ].filter(Boolean).join('\n');
                    return [4 /*yield*/, (0, cbShared_js_1.readCbPrompt)('steps/judge')];
                case 3:
                    systemPrompt = _b.sent();
                    return [2 /*return*/, [(0, cbShared_js_1.createPromptReadyIntent)(context, parentStep, hookSequential, (step.prompt || ''), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)]];
                case 4:
                    error_1 = _b.sent();
                    msg = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(msg));
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', msg)]];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function afterPromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var payload, out, scan, _a, judgeRun, operations, operationIds, raw, llmFindings, detFindings, _b, findings, warnings, state, errorsByOwner, _i, findings_1, f, target, attempts, list, intents, _c, errorsByOwner_1, _d, ownerId, list, target, repairPlanId, repairedOwners, rstep, leftoverErrors, traceMsg, error_2, msg;
        var _e, _f, _g, _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    _l.trys.push([0, 7, , 8]);
                    payload = (_f = (_e = step.interaction) === null || _e === void 0 ? void 0 : _e.payload) === null || _f === void 0 ? void 0 : _f[0];
                    if (!payload)
                        throw new Error('missing payload');
                    out = (0, cbShared_js_1.extractPlannerOutput)(payload, (0, cbShared_js_1.plannerConfig)(TOOL_NAME));
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _l.sent();
                    _a = scopedOperations(scan, step), judgeRun = _a.judgeRun, operations = _a.operations;
                    operationIds = new Set(operations.map(function (o) { return o.id; }));
                    raw = Array.isArray(out.result.findings) ? out.result.findings.filter(cbShared_js_1.isRecord) : [];
                    llmFindings = raw
                        .map(function (f) { return (__assign({ ownerId: (0, cbShared_js_1.readString)(f.ownerId), type: (0, cbShared_js_1.readString)(f.type) || 'estrutural', severity: (0, cbShared_js_1.readString)(f.severity) || 'warning', message: (0, cbShared_js_1.readString)(f.message) }, ((0, cbShared_js_1.readString)(f.suggestion) ? { suggestion: (0, cbShared_js_1.readString)(f.suggestion) } : {}))); })
                        .filter(function (f) { return !!f.message && f.type !== 'fora_de_escopo'; });
                    _b = missingDefsFindings;
                    return [4 /*yield*/, readUsecaseDefsByOwner(scan, operations)];
                case 2:
                    detFindings = _b.apply(void 0, [_l.sent()]);
                    findings = __spreadArray(__spreadArray([], detFindings, true), llmFindings, true);
                    warnings = findings.filter(function (f) { return f.severity !== 'error'; });
                    return [4 /*yield*/, (0, cbRepair_js_1.readRepairState)()];
                case 3:
                    state = _l.sent();
                    errorsByOwner = new Map();
                    for (_i = 0, findings_1 = findings; _i < findings_1.length; _i++) {
                        f = findings_1[_i];
                        if (f.severity !== 'error' || !operationIds.has(f.ownerId))
                            continue;
                        target = (0, cbRepair_js_1.usecaseDefsTarget)(f.ownerId);
                        attempts = (_h = (_g = state.componentRepairs[target]) === null || _g === void 0 ? void 0 : _g.attempts) !== null && _h !== void 0 ? _h : 0;
                        if (attempts > cbRepair_js_1.COMPONENT_REPAIR_BUDGET)
                            continue; // budget gone: leave to the deterministic gates
                        list = errorsByOwner.get(f.ownerId) || [];
                        list.push(f);
                        errorsByOwner.set(f.ownerId, list);
                    }
                    return [4 /*yield*/, (0, cbShared_js_1.saveAgentTrace)(context, AGENT_NAME, step)];
                case 4:
                    _l.sent();
                    intents = [];
                    if (!(errorsByOwner.size > 0 && judgeRun < cbRepair_js_1.JUDGE_MAX_RUNS)) return [3 /*break*/, 6];
                    // REPAIR ROUTE: re-spawn the origin workers with the findings in context, then re-judge.
                    // Routing does NOT burn component budget (only real worker failures do); the judge itself is
                    // bounded by JUDGE_MAX_RUNS, so this cannot loop.
                    for (_c = 0, errorsByOwner_1 = errorsByOwner; _c < errorsByOwner_1.length; _c++) {
                        _d = errorsByOwner_1[_c], ownerId = _d[0], list = _d[1];
                        target = (0, cbRepair_js_1.usecaseDefsTarget)(ownerId);
                        state.componentRepairs[target] = {
                            target: target,
                            attempts: (_k = (_j = state.componentRepairs[target]) === null || _j === void 0 ? void 0 : _j.attempts) !== null && _k !== void 0 ? _k : 0,
                            findings: list.map(function (f) { return "[".concat(f.type, "] ").concat(f.message).concat(f.suggestion ? " \u2014 suggestion: ".concat(f.suggestion) : ''); }).slice(0, 20),
                            source: 'judge',
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    state.judgeRuns = judgeRun;
                    return [4 /*yield*/, (0, cbRepair_js_1.saveRepairState)(state)];
                case 5:
                    _l.sent();
                    repairPlanId = "cb-usecase-repair-r".concat(judgeRun);
                    repairedOwners = __spreadArray([], errorsByOwner.keys(), true);
                    intents.push((0, cbShared_js_1.createParallelStepIntent)(context, parentStep, repairPlanId, 'agentCbUsecase', 'Reparar usecases {{completed}}/{{total}}, falhas {{failed}}', repairedOwners, [], 10));
                    rstep = (0, cbShared_js_1.createAgentStepPayload)("cb-judge-r".concat(judgeRun + 1), AGENT_NAME, "Juiz LLM (re-verifica\u00E7\u00E3o de ".concat(repairedOwners.length, ")"), { planId: "cb-judge-r".concat(judgeRun + 1), judgeRun: judgeRun + 1, owners: repairedOwners }, [repairPlanId], 'sequential', 'waiting_dependency');
                    rstep.onFailure = 'continue'; // same soft-fail as the run-1 judge step: an LLM 502 must not kill the task
                    intents.push((0, cbShared_js_1.createAddStepIntent)(context, parentStep, rstep));
                    // 'input_output': the pairs prompt is the largest interaction of the run (~120KB) and the
                    // findings are already durable (saveAgentTrace file + cb-repair-state); keep only the cost.
                    intents.push((0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "judge run ".concat(judgeRun, "/").concat(cbRepair_js_1.JUDGE_MAX_RUNS, ": ").concat(errorsByOwner.size, " usecase(s) routed to repair; ").concat(warnings.length, " warning(s)"), 'input_output'));
                    return [2 /*return*/, intents];
                case 6:
                    leftoverErrors = findings.filter(function (f) { return f.severity === 'error'; });
                    traceMsg = leftoverErrors.length
                        ? "judge run ".concat(judgeRun, "/").concat(cbRepair_js_1.JUDGE_MAX_RUNS, ": budget exhausted; ").concat(leftoverErrors.length, " finding(s) downgraded to warning: ").concat(leftoverErrors.slice(0, 8).map(function (f) { return "".concat(f.ownerId, ": ").concat(f.message); }).join('; '))
                        : "judge run ".concat(judgeRun, "/").concat(cbRepair_js_1.JUDGE_MAX_RUNS, ": clean (").concat(warnings.length, " warning(s))");
                    intents.push((0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}));
                    intents.push((0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', traceMsg, 'input_output'));
                    return [2 /*return*/, intents];
                case 7:
                    error_2 = _l.sent();
                    msg = error_2 instanceof Error ? error_2.message : String(error_2);
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-gen-http', 'agentCbHttpController', 'Gerar controllers HTTP (BFF)', {}),
                            // 'input' only: saveAgentTrace did not run on this path, so the payload is the sole record
                            // of what the model returned — keep it for diagnosis, drop the ~120KB pairs prompt.
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "judge skipped (error): ".concat(msg), 'input'),
                        ]];
                case 8: return [2 /*return*/];
            }
        });
    });
}
