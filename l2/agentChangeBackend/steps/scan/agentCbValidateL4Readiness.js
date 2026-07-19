"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/scan/agentCbValidateL4Readiness.ts" enhancement="_102027_/l2/enhancementAgent"/>
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
function createAgent() {
    return { agentName: 'agentCbValidateL4Readiness', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/scan', agentDescription: 'Deterministic l4 create-readiness preflight', visibility: 'private', beforePromptStep: beforePromptStep };
}
function beforePromptStep(agent, context, parentStep, step, hookSequential) {
    return __awaiter(this, void 0, void 0, function () {
        var scan, entityIds, warnings, errors, _i, _a, owner, refs, _b, refs_1, ref, id, _c, _d, input, keyField, trace, preflightTrace, error_1, message;
        var _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, cbShared_js_1.readBackendScan)(['toCreate', 'inProgress'])];
                case 1:
                    scan = _g.sent();
                    entityIds = new Set(scan.entities.map(function (e) { return e.entityId; }));
                    warnings = [];
                    errors = [];
                    warnings.push.apply(warnings, scan.warnings);
                    for (_i = 0, _a = scan.owners; _i < _a.length; _i++) {
                        owner = _a[_i];
                        refs = __spreadArray(__spreadArray([owner.entity], owner.reads, true), owner.writes, true).filter(Boolean);
                        for (_b = 0, refs_1 = refs; _b < refs_1.length; _b++) {
                            ref = refs_1[_b];
                            id = ref.split('.')[0].split(':').pop() || ref;
                            if (!entityIds.has(id))
                                warnings.push("".concat(owner.id, ": unresolved entity ref \"").concat(ref, "\""));
                        }
                        if (owner.kind === 'operation') {
                            if (!owner.bffName)
                                errors.push("".concat(owner.id, ": missing bffName"));
                            if (!((_e = owner.accessPattern) === null || _e === void 0 ? void 0 : _e.kind))
                                errors.push("".concat(owner.id, ": missing accessPattern.kind"));
                            for (_c = 0, _d = owner.inputs; _c < _d.length; _c++) {
                                input = _d[_c];
                                if (input.required && (!input.inputId || !input.fieldRef || !input.source)) {
                                    errors.push("".concat(owner.id, ": invalid required input ").concat(input.inputId || input.fieldRef || '(unknown)'));
                                }
                                if (input.fieldRef && !input.fieldRef.includes('.') && input.fieldRef !== owner.entity) {
                                    warnings.push("".concat(owner.id, ": input ").concat(input.inputId || input.fieldRef, " fieldRef \"").concat(input.fieldRef, "\" is not Entity.field"));
                                }
                            }
                            keyField = (_f = owner.accessPattern) === null || _f === void 0 ? void 0 : _f.keyField;
                            if (keyField && !keyField.includes('.'))
                                errors.push("".concat(owner.id, ": accessPattern.keyField must be Entity.field, got \"").concat(keyField, "\""));
                        }
                    }
                    if (errors.length) {
                        trace = "Preflight failed: ".concat(errors.slice(0, 20).join('; '));
                        console.error("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(trace));
                        return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', trace)]];
                    }
                    if (warnings.length)
                        console.warn("".concat((0, cbShared_js_1.logPrefix)(agent), " ").concat(warnings.length, " warning(s): ").concat(warnings.slice(0, 8).join('; ')));
                    preflightTrace = warnings.length
                        ? "Preflight: ".concat(warnings.length, " warning(s): ").concat(warnings.slice(0, 12).join('; '))
                        : 'Preflight ok (0 warnings).';
                    return [2 /*return*/, [
                            (0, cbShared_js_1.enqueueNext)(context, parentStep, step, 'cb-lock', 'agentCbLockOwners', 'Lock owners (inProgress)', {}),
                            (0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'completed', preflightTrace),
                        ]];
                case 2:
                    error_1 = _g.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    return [2 /*return*/, [(0, cbShared_js_1.createUpdateStatusIntent)(context, parentStep, step, hookSequential, 'failed', message)]];
                case 3: return [2 /*return*/];
            }
        });
    });
}
