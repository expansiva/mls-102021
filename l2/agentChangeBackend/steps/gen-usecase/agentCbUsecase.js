"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-usecase/agentCbUsecase.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var cbSchemas_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js");
var cbRepair_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbRepair.js");
var AGENT_NAME = 'agentCbUsecase';
var TOOL_NAME = 'submitUsecase';
var FANOUT_PLAN_ID = 'cb-usecase-fanout';
var toolSchema = (0, cbShared_js_1.createPlannerToolSchema)(TOOL_NAME, 'Submit the usecase.', cbSchemas_js_1.usecaseResultSchema);
function createAgent() {
    return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-usecase', agentDescription: 'Generate application usecases (parallel_dynamic worker per owner; controller joins)', visibility: 'private', beforePromptStep: beforePromptStep, afterPromptStep: afterPromptStep };
}
// The owner id of a WORKER invocation arrives in hook.args (a bare id); the DISPATCHER step carries a
// JSON prompt ({planId:...}) and no bare id. Resolve from args first, then step.prompt as a fallback.
function workerOwnerId(args, step) {
    var _a;
    var a = (args !== null && args !== void 0 ? args : '').trim();
    if (a && !a.startsWith('{'))
        return a;
    var p = String((_a = step === null || step === void 0 ? void 0 : step.prompt) !== null && _a !== void 0 ? _a : '').trim();
    return p && !p.startsWith('{') ? p : '';
}
// Shared maps derived from the scan (aggregate roots, mdm ids, embedded child -> parent root, events).
function deriveMaps(scan) {
    var roots = new Set(scan.aggregates.map(function (a) { return a.rootEntity; }));
    var mdmIds = new Set(scan.entities.filter(function (e) { return e.kind === 'mdm'; }).map(function (e) { return e.entityId; })); // master data: read by id, no port
    var childToRoot = new Map();
    for (var _i = 0, _a = scan.aggregates; _i < _a.length; _i++) {
        var a = _a[_i];
        for (var _b = 0, _c = a.embeddedMembers; _b < _c.length; _b++) {
            var m = _c[_b];
            childToRoot.set(m, a.rootEntity);
        }
    }
    var byId = new Map(scan.entities.map(function (e) { return [e.entityId, e]; }));
    // ownerEntity -> events the owner's usecases must emit when they mutate that aggregate.
    var eventsByOwner = new Map();
    for (var _d = 0, _e = scan.events; _d < _e.length; _d++) {
        var ev = _e[_d];
        var list = eventsByOwner.get(ev.ownerEntity) || [];
        list.push(ev);
        eventsByOwner.set(ev.ownerEntity, list);
    }
    return { roots: roots, mdmIds: mdmIds, childToRoot: childToRoot, byId: byId, eventsByOwner: eventsByOwner };
}
/** Reject defs that drift from the current entity/port contract before materialization can turn the
 * mismatch into broken TypeScript. */
function validateUsecasePlan(result, scan, ownerId) {
    var _a;
    var issues = [];
    var entities = new Map(scan.entities.map(function (entity) { return [entity.entityId, entity]; }));
    var knownPorts = new Set(__spreadArray(__spreadArray([], scan.aggregates.map(function (aggregate) { return aggregate.rootEntity; }), true), scan.events.filter(function (event) { return event.persisted; }).map(function (event) { return event.entityId; }), true));
    for (var _i = 0, _b = (0, cbShared_js_1.readStringArray)(result === null || result === void 0 ? void 0 : result.ports); _i < _b.length; _i++) {
        var port = _b[_i];
        if (!knownPorts.has(port))
            issues.push("usecase ".concat(ownerId, ": unknown port '").concat(port, "'"));
    }
    for (var _c = 0, _d = Array.isArray(result === null || result === void 0 ? void 0 : result.functions) ? result.functions : []; _c < _d.length; _c++) {
        var fn = _d[_c];
        for (var _e = 0, _f = (0, cbShared_js_1.readStringArray)(fn === null || fn === void 0 ? void 0 : fn.ports); _e < _f.length; _e++) {
            var port = _f[_e];
            if (!knownPorts.has(port))
                issues.push("usecase ".concat(ownerId, ".").concat((fn === null || fn === void 0 ? void 0 : fn.functionName) || '<function>', ": unknown port '").concat(port, "'"));
        }
        var _loop_1 = function (io) {
            var entityId = (0, cbShared_js_1.readString)(io === null || io === void 0 ? void 0 : io.ofEntity);
            if (!entityId)
                return "continue";
            var entity = entities.get(entityId);
            if (!entity) {
                issues.push("usecase ".concat(ownerId, ".").concat((fn === null || fn === void 0 ? void 0 : fn.functionName) || '<function>', ": unknown ofEntity '").concat(entityId, "'"));
                return "continue";
            }
            var fieldName = (0, cbShared_js_1.readString)(io === null || io === void 0 ? void 0 : io.name);
            if (fieldName && !((_a = entity.fields) !== null && _a !== void 0 ? _a : []).some(function (field) { return field.fieldId === fieldName; })) {
                issues.push("usecase ".concat(ownerId, ".").concat((fn === null || fn === void 0 ? void 0 : fn.functionName) || '<function>', ": ").concat(entityId, ".").concat(fieldName, " is not declared by the entity"));
            }
        };
        for (var _g = 0, _h = __spreadArray(__spreadArray([], (Array.isArray(fn === null || fn === void 0 ? void 0 : fn.input) ? fn.input : []), true), (Array.isArray(fn === null || fn === void 0 ? void 0 : fn.output) ? fn.output : []), true); _g < _h.length; _g++) {
            var io = _h[_g];
            _loop_1(io);
        }
        var allowedStatuses = new Set(scan.entities.flatMap(function (entity) { var _a; return ((_a = entity.fields) !== null && _a !== void 0 ? _a : []).flatMap(function (field) { return Array.isArray(field.enum) ? field.enum : []; }); }));
        for (var _j = 0, _k = (0, cbShared_js_1.readStringArray)(fn === null || fn === void 0 ? void 0 : fn.steps); _j < _k.length; _j++) {
            var step = _k[_j];
            // Steps are primarily natural-language explanations. Only validate an explicit QUOTED
            // assignment (`status = "delivered"`, `status: 'delivered'`, `status is "delivered"`), never
            // prose: unquoted forms like "status: must be 'active'" captured 'must' and burned repair
            // budget on a false positive (run 102049-c, updateReservationStatus).
            for (var _l = 0, _m = step.matchAll(/\bstatus\s*(?:=|:)\s*["']([A-Za-z][A-Za-z0-9_]*)["']|\bstatus\s+is\s+["']([A-Za-z][A-Za-z0-9_]*)["']/giu); _l < _m.length; _l++) {
                var match = _m[_l];
                var status_1 = match[1] || match[2];
                if (!allowedStatuses.has(status_1))
                    issues.push("usecase ".concat(ownerId, ".").concat((fn === null || fn === void 0 ? void 0 : fn.functionName) || '<function>', ": status '").concat(status_1, "' is not declared by any entity enum"));
            }
        }
    }
    return __spreadArray([], new Set(issues), true);
}
/** Deterministic ofEntity repair, BEFORE validation. ofEntity is metadata (never emitted as code),
 * but models echo the l4 fieldRef into it ('Product.name' instead of 'Product') or annotate
 * filter/projection aliases (searchTerm, minPrice) with an entity — and they repeat the mistake on
 * repair, burning the whole component budget on something a string fix resolves (run 102049-c lost
 * 6/16 usecases to exactly this). Fix what is fixable, DROP what is not:
 * - 'Entity.field' -> 'Entity' (when Entity exists in the scan);
 * - unknown entity, or a field name the entity does not declare -> remove ofEntity. */
function sanitizeOfEntity(result, scan) {
    var _a;
    var entities = new Map(scan.entities.map(function (entity) { return [entity.entityId, entity]; }));
    for (var _i = 0, _b = Array.isArray(result === null || result === void 0 ? void 0 : result.functions) ? result.functions : []; _i < _b.length; _i++) {
        var fn = _b[_i];
        var _loop_2 = function (io) {
            if (!io || typeof io !== 'object')
                return "continue";
            var raw = (0, cbShared_js_1.readString)(io.ofEntity);
            if (!raw)
                return "continue";
            var entityId = raw.includes('.') ? raw.split('.')[0] : raw;
            var entity = entities.get(entityId);
            var fieldName = (0, cbShared_js_1.readString)(io.name);
            if (!entity || (fieldName && !((_a = entity.fields) !== null && _a !== void 0 ? _a : []).some(function (field) { return field.fieldId === fieldName; }))) {
                delete io.ofEntity;
            }
            else {
                io.ofEntity = entityId;
            }
        };
        for (var _c = 0, _d = __spreadArray(__spreadArray([], (Array.isArray(fn === null || fn === void 0 ? void 0 : fn.input) ? fn.input : []), true), (Array.isArray(fn === null || fn === void 0 ? void 0 : fn.output) ? fn.output : []), true); _c < _d.length; _c++) {
            var io = _d[_c];
            _loop_2(io);
        }
    }
}
// The single-owner item sent to the LLM (explicit ports/mdmRefs + entity fields to shape input/output).
function buildOwnerItem(o, maps) {
    var _a, _b, _c;
    var roots = maps.roots, mdmIds = maps.mdmIds, childToRoot = maps.childToRoot, byId = maps.byId, eventsByOwner = maps.eventsByOwner;
    var fieldsOf = function (id) { var _a; return (((_a = byId.get(id)) === null || _a === void 0 ? void 0 : _a.fields) || []).map(function (f) { return (__assign({ fieldId: f.fieldId, type: f.type, required: f.required }, (f.enum ? { enum: f.enum } : {}))); }); };
    var rawRefs = __spreadArray([], new Set(__spreadArray(__spreadArray([o.entity], o.reads, true), o.writes, true).filter(Boolean)), true); // keep children + mdm for fields
    var portRefs = __spreadArray([], new Set(rawRefs.map(function (id) { var _a; return (_a = childToRoot.get(id)) !== null && _a !== void 0 ? _a : id; })), true); // children -> parent root
    // Events the owner must emit: those owned by an aggregate this usecase writes (entity + writes).
    var mutated = new Set(__spreadArray([o.entity], o.writes, true).filter(Boolean).map(function (id) { var _a; return (_a = childToRoot.get(id)) !== null && _a !== void 0 ? _a : id; }));
    var eventWrites = __spreadArray([], new Set(__spreadArray([o.entity], o.writes, true).filter(Boolean)), true).flatMap(function (id) { return eventsByOwner.get(id) || []; })
        .concat(__spreadArray([], mutated, true).flatMap(function (id) { return eventsByOwner.get(id) || []; }))
        .filter(function (ev, i, arr) { return arr.findIndex(function (x) { return x.entityId === ev.entityId; }) === i; })
        .map(function (ev) { return ({ entityId: ev.entityId, owner: ev.ownerEntity, purpose: ev.purpose, persisted: ev.persisted, port: ev.persisted ? ev.entityId : null }); });
    return {
        usecaseId: o.id,
        ownerKind: o.kind,
        opKind: o.opKind,
        entity: o.entity,
        parentAggregate: (_a = childToRoot.get(o.entity)) !== null && _a !== void 0 ? _a : o.entity,
        reads: o.reads,
        writes: o.writes,
        rulesApplied: o.rulesApplied,
        accessPattern: (_b = o.accessPattern) !== null && _b !== void 0 ? _b : null,
        // Option 3: the canonical wire shape from l4. The function output type is PINNED to this — it is
        // copied over the model's output below, so the usecase never re-drifts the contract.
        outputShape: (_c = o.outputShape) !== null && _c !== void 0 ? _c : null,
        inputs: o.inputs,
        contextResolution: o.contextResolution,
        acceptanceAssertions: o.acceptanceAssertions,
        ports: portRefs.filter(function (id) { return roots.has(id) && !mdmIds.has(id); }),
        mdmRefs: rawRefs.filter(function (id) { return mdmIds.has(id); }),
        eventWrites: eventWrites, // append-only events to emit (persisted -> via its port; reaction -> outbox)
        entityFields: Object.fromEntries(rawRefs.map(function (id) { return [id, fieldsOf(id)]; })),
    };
}
// Option 3: flatten the l4 canonical outputShape to the usecase-defs top-level `output` field list
// (downstream — gen-http responseShape, materialize — reads this shape). The full structured shape is
// also kept on `fn.outputShape` so the usecase materializer generates the exact output interface.
function cbOutputShapeToDefsFields(shape) {
    return shape.fields.map(function (field) {
        var entity = field.fieldRef && field.fieldRef.includes('.') ? field.fieldRef.split('.')[0] : undefined;
        return __assign({ name: field.name, type: field.type, required: field.required }, (entity ? { ofEntity: entity } : {}));
    });
}
// ── beforePromptStep: dispatch (fan-out) or worker (one usecase) ───────────────
function beforePromptStep(agent, context, parentStep, step, hookSequential, args) {
    return __awaiter(this, void 0, void 0, function () {
        var ownerId;
        return __generator(this, function (_a) {
            ownerId = workerOwnerId(args, step);
            return [2 /*return*/, ownerId
                    ? worker(agent, context, parentStep, step, hookSequential, ownerId)
                    : dispatch(agent, context, parentStep, step, hookSequential)];
        });
    });
}
// DISPATCHER (deterministic, no LLM): ONE parallel_dynamic step whose args queue is the owner ids
// (runtime pool of 5, payloads discarded as each finishes) + the controller JOIN on that parent.
function dispatch(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, ownerIds, intents, jstep, error_1, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _a.sent();
                    ownerIds = scan.owners.filter(function (o) { return o.kind === 'operation'; }).map(function (o) { return o.id; }).filter(Boolean);
                    if (!ownerIds.length) {
                        return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', 'no operation owners to generate')]];
                    }
                    intents = [
                        (0, cbShared_js_1.createParallelStepIntent)(context, parentStep, FANOUT_PLAN_ID, AGENT_NAME, 'Gerar usecases {{completed}}/{{total}}, falhas {{failed}}', ownerIds, [], 10),
                    ];
                    jstep = (0, cbShared_js_1.createAgentStepPayload)('cb-judge', 'agentCbJudge', 'Juiz LLM (usecases vs L4)', { planId: 'cb-judge', judgeRun: 1 }, [FANOUT_PLAN_ID], 'sequential', 'waiting_dependency');
                    // The judge must never kill a run (its afterPrompt fails soft to cb-gen-http). Without 'continue',
                    // an LLM-CALL failure (proxy 502) would mark the whole task failed before afterPrompt ever ran.
                    jstep.onFailure = 'continue';
                    intents.push((0, cbShared_js_1.createAddStepIntent)(context, parentStep, jstep));
                    intents.push((0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "fan-out ".concat(ownerIds.length, " usecase(s) (parallel_dynamic)")));
                    return [2 /*return*/, intents];
                case 2:
                    error_1 = _a.sent();
                    msg = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(msg));
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', msg)]];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// WORKER: build the prompt for ONE owner and ask the model for that single usecase.
function worker(agent, context, parentStep, step, hookSequential, ownerId) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, owner, item, human, repair, systemPrompt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _a.sent();
                    owner = scan.owners.find(function (o) { return o.id === ownerId; });
                    // NB: worker children never return 'failed' (a failed step does not satisfy dependsOn and would
                    // stall the fan-out join); the judge/validate-all report what is missing.
                    if (!owner)
                        return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "[worker-error] owner not found: ".concat(ownerId))]];
                    if (owner.kind !== 'operation')
                        return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "skip ".concat(ownerId, ": workflows generate no usecase"))]];
                    item = buildOwnerItem(owner, deriveMaps(scan));
                    human = "## Owner -> usecase (entity fields included so you can declare explicit input/output)\n".concat(JSON.stringify(item, null, 2), "\n\nReturn ONE usecase with functions[] \u2014 each function has explicit input[] and output[] FIELDS. accessPattern decides list/get/lookup/commandInput. inputs declares the public/request inputs. contextResolution declares values resolved from runtime context/defaults/previous navigation; do not turn systemDefault/currentWorkspace/actorSession/businessContext resolutions into required user input. A usecase MAY expose several functions with different IO.");
                    return [4 /*yield*/, (0, cbRepair_js_1.getComponentRepair)("usecase-defs:".concat(ownerId))];
                case 2:
                    repair = _a.sent();
                    if (repair && repair.findings.length)
                        human += "\n\n".concat((0, cbRepair_js_1.buildRepairPromptSection)(repair));
                    return [4 /*yield*/, (0, cbShared_js_1.readCbPrompt)('steps/gen-usecase')];
                case 3:
                    systemPrompt = _a.sent();
                    return [2 /*return*/, [(0, cbShared_js_1.createPromptReadyIntent)(context, parentStep, hookSequential, ownerId, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)]];
            }
        });
    });
}
// ── afterPromptStep (worker only): save the one usecase .defs.ts ───────────────
function afterPromptStep(agent, context, parentStep, step, hookSequential, args) {
    return __awaiter(this, void 0, void 0, function () {
        var status, trace, payload, infra, out, result, scan, module_1, _a, roots_1, mdmIds_1, childToRoot_1, usecaseId_1, queuedOwnerId, planIssues, owner, ownerRefs_1, detPorts, aggPorts, mutated_1, eventPortIds, ports_1, resultFns, _i, resultFns_1, fn, fi, dependsFiles, pipeline, error_2, failedOwnerId;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    status = 'completed';
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 7, , 8]);
                    payload = (_c = (_b = step.interaction) === null || _b === void 0 ? void 0 : _b.payload) === null || _c === void 0 ? void 0 : _c[0];
                    if (!payload) {
                        infra = ((_e = (_d = step.interaction) === null || _d === void 0 ? void 0 : _d.trace) !== null && _e !== void 0 ? _e : []).map(String)
                            .filter(function (t) { return t.includes('Error invoking Collab LLM proxy') || t.includes('Error executing AI task'); }).slice(-1)[0];
                        throw new Error(infra ? "LLM infra failure (no payload): ".concat(infra.slice(0, 300)) : 'missing payload');
                    }
                    out = (0, cbShared_js_1.extractPlannerOutput)(payload, (0, cbShared_js_1.plannerConfig)(TOOL_NAME));
                    result = out.result;
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 2:
                    scan = _f.sent();
                    module_1 = scan.moduleNames[0] || 'unknown';
                    _a = deriveMaps(scan), roots_1 = _a.roots, mdmIds_1 = _a.mdmIds, childToRoot_1 = _a.childToRoot;
                    usecaseId_1 = (0, cbShared_js_1.readString)(result === null || result === void 0 ? void 0 : result.usecaseId) || workerOwnerId(args, step);
                    if (!usecaseId_1)
                        throw new Error('missing usecaseId');
                    queuedOwnerId = workerOwnerId(args, step);
                    if (queuedOwnerId && usecaseId_1 !== queuedOwnerId)
                        throw new Error("usecaseId '".concat(usecaseId_1, "' does not match queued owner '").concat(queuedOwnerId, "'"));
                    // Validate raw model output before normalization. Filtering invented ports first would silently
                    // mask a bad defs response instead of routing it through the repair loop. ofEntity is the one
                    // exception: it is repaired/dropped deterministically first (see sanitizeOfEntity) because the
                    // repair loop demonstrably cannot fix it via LLM.
                    sanitizeOfEntity(result, scan);
                    planIssues = validateUsecasePlan(result, scan, usecaseId_1);
                    if (planIssues.length)
                        throw new Error("usecase defs validation failed: ".concat(planIssues.slice(0, 12).join('; ')));
                    owner = scan.owners.find(function (o) { return o.id === usecaseId_1; });
                    ownerRefs_1 = owner ? __spreadArray(__spreadArray([owner.entity], owner.reads, true), owner.writes, true).filter(Boolean) : [];
                    detPorts = __spreadArray([], new Set(ownerRefs_1.map(function (id) { var _a; return (_a = childToRoot_1.get(id)) !== null && _a !== void 0 ? _a : id; })), true).filter(function (id) { return roots_1.has(id) && !mdmIds_1.has(id); });
                    aggPorts = __spreadArray([], new Set(__spreadArray(__spreadArray([], (0, cbShared_js_1.readStringArray)(result === null || result === void 0 ? void 0 : result.ports), true), detPorts, true)), true).filter(function (id) { return roots_1.has(id) && !mdmIds_1.has(id); });
                    mutated_1 = new Set(ownerRefs_1.map(function (id) { var _a; return (_a = childToRoot_1.get(id)) !== null && _a !== void 0 ? _a : id; }));
                    eventPortIds = scan.events
                        .filter(function (ev) { return ev.persisted && (ownerRefs_1.includes(ev.ownerEntity) || mutated_1.has(ev.ownerEntity)); })
                        .map(function (ev) { return ev.entityId; });
                    ports_1 = __spreadArray([], new Set(__spreadArray(__spreadArray([], aggPorts, true), eventPortIds, true)), true);
                    result.ports = ports_1;
                    result.mdmRefs = __spreadArray([], new Set(ownerRefs_1.filter(function (id) { return mdmIds_1.has(id); })), true);
                    resultFns = Array.isArray(result === null || result === void 0 ? void 0 : result.functions) ? result.functions : [];
                    for (_i = 0, resultFns_1 = resultFns; _i < resultFns_1.length; _i++) {
                        fn = resultFns_1[_i];
                        fn.ports = (0, cbShared_js_1.readStringArray)(fn === null || fn === void 0 ? void 0 : fn.ports).filter(function (id) { return ports_1.includes(id); }); // drop invented ports
                    }
                    // Option 3: PIN the output type to the l4 canonical outputShape. The model implements the body and
                    // declares the input; the OUTPUT is NOT the model's to invent. For a single-function operation,
                    // copy the l4 shape onto the function (structured on `outputShape`, flattened on `output`) so the
                    // usecase output = DTO = l4 and never re-drifts. Multi-function/dispatcher owners keep the model
                    // output (best-effort — no single l4 shape maps to several functions).
                    if ((owner === null || owner === void 0 ? void 0 : owner.outputShape) && resultFns.length === 1) {
                        resultFns[0].outputShape = owner.outputShape;
                        resultFns[0].output = cbOutputShapeToDefsFields(owner.outputShape);
                    }
                    fi = (0, cbShared_js_1.usecaseFileInfo)(module_1, usecaseId_1);
                    dependsFiles = __spreadArray(__spreadArray([], ports_1.map(function (p) { return (0, cbShared_js_1.dtsRef)((0, cbShared_js_1.repositoryPortFileInfo)(module_1, p)); }), true), ports_1.map(function (p) { return (0, cbShared_js_1.dtsRef)((0, cbShared_js_1.domainEntityFileInfo)(module_1, p)); }), true);
                    pipeline = [(0, cbShared_js_1.buildPipelineItem)((0, cbShared_js_1.lowerFirst)(usecaseId_1), 'applicationUsecase', fi, dependsFiles, (0, cbShared_js_1.layerSkills)('applicationUsecase.md'), { rulesApplied: (0, cbShared_js_1.readStringArray)(result === null || result === void 0 ? void 0 : result.rulesApplied) })];
                    return [4 /*yield*/, (0, cbShared_js_1.saveDefs)(fi, "".concat((0, cbShared_js_1.lowerFirst)(usecaseId_1), "Usecase"), (0, cbShared_js_1.buildArtifact)('usecase', usecaseId_1, module_1, AGENT_NAME, result), pipeline)];
                case 3:
                    _f.sent();
                    if (!(out.status === 'failed')) return [3 /*break*/, 4];
                    status = 'failed';
                    trace = 'model returned failed';
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, (0, cbRepair_js_1.clearComponentRepair)("usecase-defs:".concat(usecaseId_1))];
                case 5:
                    _f.sent(); // converged: drop the repair record
                    _f.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_2 = _f.sent();
                    status = 'failed';
                    trace = error_2 instanceof Error ? error_2.message : String(error_2);
                    return [3 /*break*/, 8];
                case 8:
                    if (!(status === 'failed')) return [3 /*break*/, 11];
                    failedOwnerId = workerOwnerId(args, step);
                    if (!failedOwnerId) return [3 /*break*/, 10];
                    return [4 /*yield*/, (0, cbRepair_js_1.recordComponentFailure)("usecase-defs:".concat(failedOwnerId), [trace || 'usecase generation failed'])];
                case 9:
                    _f.sent();
                    _f.label = 10;
                case 10:
                    // ENGINE SEMANTICS (2026-07-04): a FAILED child does NOT satisfy dependsOn — the fan-out join
                    // (cb-judge) would wait forever. Complete with a "[repair]" trace instead; the judge routes the
                    // repair and the deterministic gates downstream keep blocking what does not converge.
                    status = 'completed';
                    trace = "[repair] ".concat(trace || 'usecase generation failed');
                    _f.label = 11;
                case 11: return [4 /*yield*/, (0, cbShared_js_1.saveAgentTrace)(context, AGENT_NAME, step)];
                case 12:
                    _f.sent();
                    // No enqueueNext here: the controller step was already queued by the dispatcher with a join dependsOn.
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, status, trace)]];
            }
        });
    });
}
