"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/scan/agentCbScanCreateOwners.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
var cbRepair_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbRepair.js");
function createAgent() {
    return { agentName: 'agentCbScanCreateOwners', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/scan', agentDescription: 'Deterministic todoBackend=toCreate scan', visibility: 'private', beforePromptStep: beforePromptStep };
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, warningTrace, error_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _a.sent();
                    // FRESH BUDGETS (lesson run 102049-g): clearRepairState only ran on validate-all SUCCESS, so a
                    // failed run leaked its consumed attempts/globalAttempts into the NEXT run, which then started
                    // with the repair budget already burned. A new run regenerates the artifacts anyway — old
                    // findings reference code that is about to be replaced; reset everything at run start.
                    return [4 /*yield*/, (0, cbRepair_js_1.clearRepairState)()];
                case 2:
                    // FRESH BUDGETS (lesson run 102049-g): clearRepairState only ran on validate-all SUCCESS, so a
                    // failed run leaked its consumed attempts/globalAttempts into the NEXT run, which then started
                    // with the repair budget already burned. A new run regenerates the artifacts anyway — old
                    // findings reference code that is about to be replaced; reset everything at run start.
                    _a.sent();
                    warningTrace = scan.warnings.length ? " Warnings: ".concat(scan.warnings.slice(0, 8).join('; ')) : '';
                    if (scan.owners.length === 0) {
                        return [2 /*return*/, [
                                (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-final-summary', 'agentCbFinalSummary', 'Resumo (sem trabalho)', { noWork: true }),
                                (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "No owner with todoBackend status = toCreate.".concat(warningTrace)),
                            ]];
                    }
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-validate-readiness', 'agentCbValidateL4Readiness', 'Preflight l4', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', "Selected ".concat(scan.owners.length, " owner(s).").concat(warningTrace)),
                        ]];
                case 3:
                    error_1 = _a.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " failed: ").concat(message));
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', message)]];
                case 4: return [2 /*return*/];
            }
        });
    });
}
