"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-port/agentCbRepositoryPort.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var cbShared_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbShared.js");
var cbSchemas_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js");
var AGENT_NAME = 'agentCbRepositoryPort';
var TOOL_NAME = 'submitRepositoryPorts';
var toolSchema = (0, cbShared_js_1.createPlannerToolSchema)(TOOL_NAME, 'Submit the repository port interfaces.', (0, cbShared_js_1.batchSchema)(cbSchemas_js_1.repositoryPortResultSchema));
function createAgent() {
    return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-port', agentDescription: 'Generate repository port interfaces', visibility: 'private', beforePromptStep: beforePromptStep, afterPromptStep: afterPromptStep };
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, items, eventItems, human, systemPrompt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _a.sent();
                    items = scan.aggregates.map(function (a) { return ({ entityId: a.rootEntity, embeddedMembers: a.embeddedMembers }); });
                    eventItems = scan.events.filter(function (ev) { return ev.persisted; }).map(function (ev) { return ({ entityId: ev.entityId, appendOnlyEvent: true, owner: ev.ownerEntity }); });
                    human = "## Aggregates\n".concat(JSON.stringify(items, null, 2), "\n\n## Append-only event ports\n").concat(JSON.stringify(eventItems, null, 2), "\n\nReturn one repository port (I{Entity}Repository) per aggregate AND per event. Aggregate ports use getById/list/save/domain finders. Event ports are append-only: an append(record) method plus read finders (e.g. listByOwnerId, listByPeriod) \u2014 never update or delete. Typed in domain terms.");
                    return [4 /*yield*/, (0, cbShared_js_1.readCbPrompt)('steps/gen-port')];
                case 2:
                    systemPrompt = _a.sent();
                    return [2 /*return*/, [(0, cbShared_js_1.createPromptReadyIntent)(context, parentStep, hookSequential, (step.prompt || ""), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)]];
            }
        });
    });
}
function afterPromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var status, trace, payload, out, scan, module_1, saved, _i, _a, item, entityId, fi, dependsFiles, pipeline, error_1, intents;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    status = 'completed';
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 7, , 8]);
                    payload = (_c = (_b = step.interaction) === null || _b === void 0 ? void 0 : _b.payload) === null || _c === void 0 ? void 0 : _c[0];
                    if (!payload)
                        throw new Error('missing payload');
                    out = (0, cbShared_js_1.extractPlannerOutput)(payload, (0, cbShared_js_1.plannerConfig)(TOOL_NAME));
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 2:
                    scan = _d.sent();
                    module_1 = scan.moduleNames[0] || 'unknown';
                    saved = 0;
                    _i = 0, _a = (0, cbShared_js_1.asArray)(out.result.items);
                    _d.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    item = _a[_i];
                    entityId = (0, cbShared_js_1.readString)(item.entityId);
                    if (!entityId)
                        return [3 /*break*/, 5];
                    fi = (0, cbShared_js_1.repositoryPortFileInfo)(module_1, entityId);
                    dependsFiles = [(0, cbShared_js_1.dtsRef)((0, cbShared_js_1.domainEntityFileInfo)(module_1, entityId))];
                    pipeline = [(0, cbShared_js_1.buildPipelineItem)("".concat((0, cbShared_js_1.lowerFirst)(entityId), "Repository"), 'repositoryPort', fi, dependsFiles, (0, cbShared_js_1.layerSkills)('repositoryPort.md'))];
                    return [4 /*yield*/, (0, cbShared_js_1.saveDefs)(fi, "".concat((0, cbShared_js_1.lowerFirst)(entityId), "RepositoryPort"), (0, cbShared_js_1.buildArtifact)('repositoryPort', "".concat(entityId, "Repository"), module_1, AGENT_NAME, item), pipeline)];
                case 4:
                    _d.sent();
                    saved++;
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    if (out.status === 'failed') {
                        status = 'failed';
                        trace = 'model returned failed';
                    }
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _d.sent();
                    status = 'failed';
                    trace = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(trace));
                    return [3 /*break*/, 8];
                case 8: return [4 /*yield*/, (0, cbShared_js_1.saveAgentTrace)(context, AGENT_NAME, step)];
                case 9:
                    _d.sent();
                    intents = [];
                    if (status === 'completed')
                        intents.push((0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-gen-table', 'agentCbPersistenceTable', 'Gerar tabelas (persistência)', {}));
                    intents.push((0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, status, trace, status === 'completed' ? 'input_output' : undefined));
                    return [2 /*return*/, intents];
            }
        });
    });
}
