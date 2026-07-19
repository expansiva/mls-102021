"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/agentChangeBackend.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var ALL_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'inProgress', 'done'];
function createAgent() {
    return {
        agentName: 'agentChangeBackend',
        agentProject: 102021,
        agentFolder: 'agentChangeBackend',
        agentDescription: 'Stage 3 backend reconciler (v1, hexagonal). CLI: /rebuild all | /run | /help.',
        visibility: 'public',
        beforePromptImplicit: beforePromptImplicit,
        afterPromptStep: afterPromptStep,
    };
}
/** Parse the user prompt into a CLI command. Lenient: mention stripped, keyword matched anywhere.
 * Empty (bare @@changeBackend) is the autonomous default -> 'run' (scan toCreate + materialize stale). */
function parseCommand(raw) {
    var t = normalizePrompt(raw);
    if (!t)
        return 'run';
    if (/\brebuild\b/.test(t))
        return /\bdefs\b/.test(t) ? 'rebuild-defs' : 'rebuild-all';
    if (/\brun\b/.test(t))
        return 'run';
    return 'help';
}
function normalizePrompt(raw) {
    return String(raw || '')
        .trim()
        .replace(/@@?[a-z0-9_]*changebackend\s*/i, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}
function beforePromptImplicit(agent, context, userPrompt) {
    return __awaiter(this, void 0, void 0, function () {
        var raw, cmd, addMessageAI, reset, scan, _i, _a, owner, e_1, scanStep;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    raw = userPrompt || context.message.content || '';
                    cmd = parseCommand(raw);
                    addMessageAI = {
                        type: 'add-message-ai',
                        skipRootLLM: true,
                        request: {
                            action: 'addMessageAI',
                            agentName: agent.agentName,
                            inputAI: [
                                { type: 'system', content: 'agentChangeBackend deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
                                { type: 'human', content: normalizePrompt(raw) || 'agentChangeBackend' },
                            ],
                            taskTitle: 'agentChangeBackend',
                            threadId: context.message.threadId,
                            userMessage: context.message.content,
                            longTermMemory: { taskName: 'agentChangeBackend', flowName: 'agentChangeBackend', version: '1', cliCommand: cmd },
                        },
                    };
                    if (cmd === 'help') {
                        return [2 /*return*/, [addMessageAI, createBootstrapAddStepIntent(context, createHelpStep())]];
                    }
                    if (!(cmd === 'rebuild-all' || cmd === 'rebuild-defs')) return [3 /*break*/, 8];
                    reset = 0;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(ALL_STATUSES)];
                case 2:
                    scan = _b.sent();
                    _i = 0, _a = scan.owners;
                    _b.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    owner = _a[_i];
                    return [4 /*yield*/, (0, cbShared_js_1.setTodoBackendStatus)(owner, 'toCreate')];
                case 4:
                    if (_b.sent())
                        reset++;
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 8];
                case 7:
                    e_1 = _b.sent();
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(cmd, " reset failed: ").concat(e_1 instanceof Error ? e_1.message : String(e_1)));
                    return [3 /*break*/, 8];
                case 8:
                    scanStep = (0, cbShared_js_1.createAgentStepPayload)('cb-scan', 'agentCbScanCreateOwners', 'Scan todoBackend (status = toCreate)', { planId: 'cb-scan' }, [], 'sequential', 'waiting_human_input');
                    return [2 /*return*/, [addMessageAI, createBootstrapAddStepIntent(context, scanStep)]];
            }
        });
    });
}
function afterPromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!context.task)
                throw new Error("[".concat(agent.agentName, "] task invalid"));
            return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')]];
        });
    });
}
/** Add a step under the root (stepId 1), created by the skipRootLLM bootstrap above. */
function createBootstrapAddStepIntent(context, step) {
    return {
        type: 'add-step',
        messageId: '',
        threadId: context.message.threadId,
        taskId: '',
        parentStepId: 1,
        step: step,
    };
}
function createHelpStep() {
    return {
        type: 'result',
        stepId: 0,
        status: 'completed',
        interaction: null,
        nextSteps: [],
        stepTitle: 'Help',
        result: HELP,
        planning: { planId: 'help', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
    };
}
var HELP = "agentChangeBackend \u2014 CLI\n\nUso: @@changeBackend <comando>\n\nComandos:\n- /rebuild all  : reseta todoBackend de TODOS os owners para toCreate e regenera o backend \u2014 defs E materializa\u00E7\u00E3o dos .ts (arquivos sobrescritos in place; sem deletar).\n- /rebuild defs : reseta TODOS os owners para toCreate e regenera SOMENTE os .defs.ts (N\u00C3O materializa os .ts).\n- /run          : gera os owners pendentes (todoBackend = toCreate | inProgress) sem resetar; materializa os .ts faltando/desatualizados.\n- (sem comando) : igual ao /run \u2014 varre o todoBackend por owners toCreate e materializa os .ts antigos/ausentes.\n- /help         : mostra esta ajuda.\n\nQualquer outro comando (texto n\u00E3o reconhecido) mostra esta ajuda.";
