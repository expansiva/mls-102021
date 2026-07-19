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
exports.JUDGE_MAX_RUNS = exports.GLOBAL_REPAIR_BUDGET = exports.COMPONENT_REPAIR_BUDGET = void 0;
exports.readRepairState = readRepairState;
exports.saveRepairState = saveRepairState;
exports.clearRepairState = clearRepairState;
exports.usecaseDefsTarget = usecaseDefsTarget;
exports.getComponentRepair = getComponentRepair;
exports.recordComponentFailure = recordComponentFailure;
exports.setComponentFindings = setComponentFindings;
exports.clearComponentRepair = clearComponentRepair;
exports.hasRepairBudget = hasRepairBudget;
exports.buildRepairPromptSection = buildRepairPromptSection;
exports.saveHealthReport = saveHealthReport;
exports.forceDefsStale = forceDefsStale;
// Repair-loop + juiz state for the agentChangeBackend flow (Stage 3). Implements the shared
// "repair loop / juiz LLM" block (todo/ajustesFinaisChangeBackend.md §2 + improveAddNewSolution2_1.md
// §4.3/§4.4): findings are routed back to the component that produced them, the worker retries WITH
// the findings in context, and exhausted budgets produce a CLEAN failure with an objective trace.
//
// The flow engine needs NO change: "reopening" a step = enqueueing a fresh step with unique
// args/planId (add-step), which every hook already supports. This file only keeps the durable state
// that (a) carries findings to the retry prompt and (b) enforces the attempt budgets (anti-loop).
//
// Storage: l4/trace/cb-repair-state.json (cleared on validate-all success and with the run traces).
// The taxonomy (estrutural | decisao | fora_de_escopo) mirrors improveAddNewSolution2_1.md §2 so the
// same routing vocabulary can be reused by the ns2 repair loop later.
var libStor_js_1 = require("/_102027_/l2/libStor.js");
var cbMaterializeIo_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js");
var cbPlanner_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js");
var cbRepairLock_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbRepairLock.js");
// ── budgets (anti-loop) ─────────────────────────────────────────────────────────
/** Max REPAIR attempts per component after the first failure (first try + 2 repairs = 3 LLM calls). */
exports.COMPONENT_REPAIR_BUDGET = 2;
/** Max full validate-all -> re-materialize repair rounds. */
// 2 rounds (user decision 2026-07-17, run e): the whole-project compile check now surfaces REAL
// compiler findings only at validate-all, so the global round is the primary fix path — one round
// for the bulk, one for stragglers introduced by the first round's own repairs.
exports.GLOBAL_REPAIR_BUDGET = 2;
/** Max judge passes (initial critique + 1 post-repair verification). */
exports.JUDGE_MAX_RUNS = 2;
var SCHEMA_VERSION = '2026-07-03-cb-repair';
var MAX_LAST_CODE = 6000;
function stateFileInfo() {
    return { project: mls.actualProject || 0, level: 4, folder: 'trace', shortName: 'cb-repair-state', extension: '.json' };
}
function emptyState() {
    return { schemaVersion: SCHEMA_VERSION, componentRepairs: {}, globalAttempts: 0, judgeRuns: 0, history: [], updatedAt: new Date().toISOString() };
}
var MAX_HISTORY = 100;
function pushHistory(state, entry) {
    state.history.push("".concat(new Date().toISOString(), " :: ").concat(entry));
    if (state.history.length > MAX_HISTORY)
        state.history.splice(0, state.history.length - MAX_HISTORY);
}
// ── state I/O ───────────────────────────────────────────────────────────────────
function readRepairState() {
    return __awaiter(this, void 0, void 0, function () {
        var info, file, parsed, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    info = stateFileInfo();
                    file = mls.stor.files[mls.stor.getKeyToFile(info)];
                    if (!file || file.status === 'deleted')
                        return [2 /*return*/, emptyState()];
                    _a = cbPlanner_js_1.parseMaybeJson;
                    _b = String;
                    return [4 /*yield*/, file.getContent()];
                case 1:
                    parsed = _a.apply(void 0, [_b.apply(void 0, [_d.sent()])]);
                    if (!(0, cbPlanner_js_1.isRecord)(parsed))
                        return [2 /*return*/, emptyState()];
                    return [2 /*return*/, {
                            schemaVersion: SCHEMA_VERSION,
                            componentRepairs: (0, cbPlanner_js_1.isRecord)(parsed.componentRepairs) ? parsed.componentRepairs : {},
                            globalAttempts: typeof parsed.globalAttempts === 'number' ? parsed.globalAttempts : 0,
                            judgeRuns: typeof parsed.judgeRuns === 'number' ? parsed.judgeRuns : 0,
                            history: Array.isArray(parsed.history) ? parsed.history.filter(function (h) { return typeof h === 'string'; }) : [],
                            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
                        }];
                case 2:
                    _c = _d.sent();
                    return [2 /*return*/, emptyState()];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function saveRepairState(state) {
    return __awaiter(this, void 0, void 0, function () {
        var info, source, key, file, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    state.updatedAt = new Date().toISOString();
                    info = stateFileInfo();
                    source = "".concat(JSON.stringify(state, null, 2), "\n");
                    key = mls.stor.getKeyToFile(info);
                    file = mls.stor.files[key];
                    if (!!file) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, libStor_js_1.createStorFile)(__assign(__assign({}, info), { source: source }), false, false, false)];
                case 1:
                    file = _a.sent();
                    _a.label = 2;
                case 2: return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: source })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, true];
                case 4:
                    error_1 = _a.sent();
                    console.warn('[cbRepair] saveRepairState failed', error_1);
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/** Wipe the whole repair state (validate-all passed: the run converged). */
function clearRepairState() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, saveRepairState(emptyState())];
                case 1:
                    if (!(_a.sent()))
                        throw new Error('repair state persistence failed while clearing a converged run');
                    return [2 /*return*/];
            }
        });
    });
}
// ── component records ───────────────────────────────────────────────────────────
/** Repair target key for the usecase DEFS phase (shared by agentCbUsecase and agentCbJudge). */
function usecaseDefsTarget(ownerId) {
    return "usecase-defs:".concat(ownerId);
}
function getComponentRepair(target) {
    return __awaiter(this, void 0, void 0, function () {
        var state;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, readRepairState()];
                case 1:
                    state = _b.sent();
                    return [2 /*return*/, (_a = state.componentRepairs[target]) !== null && _a !== void 0 ? _a : null];
            }
        });
    });
}
/** Record a failed attempt (increments the budget) and keep the findings + rejected code for the retry prompt. */
function recordComponentFailure(target_1, findings_1, lastCode_1) {
    return __awaiter(this, arguments, void 0, function (target, findings, lastCode, source) {
        var _this = this;
        if (source === void 0) { source = 'component-validate'; }
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, cbRepairLock_js_1.serializeRepairMutation)(function () { return __awaiter(_this, void 0, void 0, function () {
                    var state, prev, current, priorFindings, entry;
                    var _a, _b, _c, _d;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0: return [4 /*yield*/, readRepairState()];
                            case 1:
                                state = _e.sent();
                                prev = state.componentRepairs[target];
                                current = findings.slice(0, 20);
                                priorFindings = __spreadArray([], new Set(__spreadArray(__spreadArray([], ((_a = prev === null || prev === void 0 ? void 0 : prev.priorFindings) !== null && _a !== void 0 ? _a : []), true), ((_b = prev === null || prev === void 0 ? void 0 : prev.findings) !== null && _b !== void 0 ? _b : []), true)), true).filter(function (f) { return !current.includes(f); })
                                    .slice(0, 10);
                                entry = __assign(__assign(__assign({ target: target, attempts: ((_c = prev === null || prev === void 0 ? void 0 : prev.attempts) !== null && _c !== void 0 ? _c : 0) + 1, findings: current }, (priorFindings.length ? { priorFindings: priorFindings } : {})), (lastCode ? { lastCode: lastCode.length > MAX_LAST_CODE ? "".concat(lastCode.slice(0, MAX_LAST_CODE), "\n// ... (truncated)") : lastCode } : {})), { source: source, updatedAt: new Date().toISOString() });
                                state.componentRepairs[target] = entry;
                                pushHistory(state, "".concat(target, " :: attempt ").concat(entry.attempts, " :: ").concat((_d = entry.findings[0]) !== null && _d !== void 0 ? _d : 'failure'));
                                return [4 /*yield*/, saveRepairState(state)];
                            case 2:
                                if (!(_e.sent()))
                                    throw new Error("repair state persistence failed while recording ".concat(target));
                                return [2 /*return*/, entry];
                        }
                    });
                }); })];
        });
    });
}
/** Set findings WITHOUT burning component budget (used by the validate-all global round, which grants
 * the component a fresh worker budget — the global round has its own budget). */
function setComponentFindings(target, findings, source) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, cbRepairLock_js_1.serializeRepairMutation)(function () { return __awaiter(_this, void 0, void 0, function () {
                        var state;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, readRepairState()];
                                case 1:
                                    state = _b.sent();
                                    state.componentRepairs[target] = { target: target, attempts: 0, findings: findings.slice(0, 20), source: source, updatedAt: new Date().toISOString() };
                                    pushHistory(state, "".concat(target, " :: ").concat(source, " :: ").concat((_a = findings[0]) !== null && _a !== void 0 ? _a : 'finding'));
                                    return [4 /*yield*/, saveRepairState(state)];
                                case 2:
                                    if (!(_b.sent()))
                                        throw new Error("repair state persistence failed while recording findings for ".concat(target));
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function clearComponentRepair(target) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, cbRepairLock_js_1.serializeRepairMutation)(function () { return __awaiter(_this, void 0, void 0, function () {
                        var state;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, readRepairState()];
                                case 1:
                                    state = _a.sent();
                                    if (!state.componentRepairs[target])
                                        return [2 /*return*/];
                                    delete state.componentRepairs[target];
                                    return [4 /*yield*/, saveRepairState(state)];
                                case 2:
                                    if (!(_a.sent()))
                                        throw new Error("repair state persistence failed while clearing ".concat(target));
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/** True while the component may still be retried (attempts consumed <= budget). */
function hasRepairBudget(entry) {
    return !!entry && entry.attempts > 0 && entry.attempts <= exports.COMPONENT_REPAIR_BUDGET;
}
// ── prompt injection ────────────────────────────────────────────────────────────
/** Repair section appended to the worker's human prompt on a retry. */
function buildRepairPromptSection(entry) {
    var _a;
    var lines = __spreadArray([
        '## REPAIR — previous attempt was REJECTED by the deterministic validator',
        '',
        "This is repair attempt ".concat(entry.attempts, " of ").concat(exports.COMPONENT_REPAIR_BUDGET + 1, " for this component (source: ").concat(entry.source, ")."),
        'Fix EXACTLY the findings below. Do not introduce unrelated changes.',
        '',
        '### Findings (each one MUST be resolved)'
    ], entry.findings.map(function (f) { return "- ".concat(f); }), true);
    if ((_a = entry.priorFindings) === null || _a === void 0 ? void 0 : _a.length) {
        lines.push.apply(lines, __spreadArray(['',
            '### Fixed in earlier attempts — MUST STAY fixed (do NOT reintroduce)'], entry.priorFindings.map(function (f) { return "- ".concat(f); }), false));
    }
    if (entry.lastCode) {
        lines.push('', '### Previous rejected output (fix it — do not repeat these mistakes)', '```ts', entry.lastCode, '```');
    }
    return lines.join('\n');
}
// ── durable run report ──────────────────────────────────────────────────────────
/** Persist the validate-all outcome + repair audit to l4/trace/cb-health-report.json. The task dump
 * keeps interaction null on deterministic steps and the repair state is cleared on success, so this
 * file is the DURABLE record of what was repaired in the run (survives task cleanup). */
function saveHealthReport(report) {
    return __awaiter(this, void 0, void 0, function () {
        var info, source, key, file, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    info = { project: mls.actualProject || 0, level: 4, folder: 'trace', shortName: 'cb-health-report', extension: '.json' };
                    source = "".concat(JSON.stringify(__assign({ savedAt: new Date().toISOString() }, report), null, 2), "\n");
                    key = mls.stor.getKeyToFile(info);
                    file = mls.stor.files[key];
                    if (!!file) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, libStor_js_1.createStorFile)(__assign(__assign({}, info), { source: source }), false, false, false)];
                case 1:
                    file = _a.sent();
                    _a.label = 2;
                case 2: return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: source })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.warn('[cbRepair] saveHealthReport failed', error_2);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// ── staleness forcing (validate-all -> re-materialize routing) ─────────────────
/** Bump the .defs.ts updatedAt so the materialize dispatcher sees the component as stale again. */
function forceDefsStale(defRef) {
    try {
        var p = (0, cbMaterializeIo_js_1.parseMlsPath)(defRef);
        if (!p)
            return false;
        var key = mls.stor.getKeyToFile({ project: p.project, level: p.level, folder: p.folder, shortName: p.shortName, extension: '.defs.ts' });
        var file = mls.stor.files[key];
        if (!file || file.status === 'deleted')
            return false;
        file.updatedAt = new Date().toISOString();
        return true;
    }
    catch (_a) {
        return false;
    }
}
