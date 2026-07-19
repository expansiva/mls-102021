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
exports.CB_AGENT_FOLDER = exports.CB_AGENT_PROJECT = exports.DEFAULT_EVENT_RETENTION_DAYS = exports.optionalStringArray = exports.optionalString = exports.assertString = exports.assertArray = exports.assertRecord = exports.parseMaybeJson = exports.isRecord = exports.extractPlannerOutput = exports.createPlannerToolSchema = void 0;
exports.plannerConfig = plannerConfig;
exports.batchSchema = batchSchema;
exports.asArray = asArray;
exports.readBackendScan = readBackendScan;
exports.deriveEventTargets = deriveEventTargets;
exports.deriveAggregates = deriveAggregates;
exports.planTableColumns = planTableColumns;
exports.domainEntityFileInfo = domainEntityFileInfo;
exports.valueObjectFileInfo = valueObjectFileInfo;
exports.repositoryPortFileInfo = repositoryPortFileInfo;
exports.usecaseFileInfo = usecaseFileInfo;
exports.persistenceTableFileInfo = persistenceTableFileInfo;
exports.repositoryAdapterFileInfo = repositoryAdapterFileInfo;
exports.httpControllerFileInfo = httpControllerFileInfo;
exports.readCbPrompt = readCbPrompt;
exports.defsRef = defsRef;
exports.dtsRef = dtsRef;
exports.buildArtifact = buildArtifact;
exports.layerSkills = layerSkills;
exports.buildPipelineItem = buildPipelineItem;
exports.saveDefs = saveDefs;
exports.saveBackendWorkspaceConfig = saveBackendWorkspaceConfig;
exports.saveAgentTrace = saveAgentTrace;
exports.setTodoBackendStatus = setTodoBackendStatus;
exports.createUpdateStatusIntent = createUpdateStatusIntent;
exports.createAgentStepPayload = createAgentStepPayload;
exports.createAddStepIntent = createAddStepIntent;
exports.createPromptReadyIntent = createPromptReadyIntent;
exports.createParallelStepIntent = createParallelStepIntent;
exports.logPrefix = logPrefix;
exports.planIdOf = planIdOf;
exports.readCliCommand = readCliCommand;
exports.enqueueNext = enqueueNext;
exports.parseDefsSource = parseDefsSource;
exports.readString = readString;
exports.readStringArray = readStringArray;
exports.lowerFirst = lowerFirst;
exports.capitalize = capitalize;
exports.toSafeShortName = toSafeShortName;
var cbPlanner_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js");
Object.defineProperty(exports, "createPlannerToolSchema", { enumerable: true, get: function () { return cbPlanner_js_1.createPlannerToolSchema; } });
Object.defineProperty(exports, "extractPlannerOutput", { enumerable: true, get: function () { return cbPlanner_js_1.extractPlannerOutput; } });
Object.defineProperty(exports, "isRecord", { enumerable: true, get: function () { return cbPlanner_js_1.isRecord; } });
Object.defineProperty(exports, "parseMaybeJson", { enumerable: true, get: function () { return cbPlanner_js_1.parseMaybeJson; } });
Object.defineProperty(exports, "assertRecord", { enumerable: true, get: function () { return cbPlanner_js_1.assertRecord; } });
Object.defineProperty(exports, "assertArray", { enumerable: true, get: function () { return cbPlanner_js_1.assertArray; } });
Object.defineProperty(exports, "assertString", { enumerable: true, get: function () { return cbPlanner_js_1.assertString; } });
Object.defineProperty(exports, "optionalString", { enumerable: true, get: function () { return cbPlanner_js_1.optionalString; } });
Object.defineProperty(exports, "optionalStringArray", { enumerable: true, get: function () { return cbPlanner_js_1.optionalStringArray; } });
var libStor_js_1 = require("/_102027_/l2/libStor.js");
var cbWorkspace_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbWorkspace.js");
/** Loose planner config: validates the envelope and returns the `result` object as a record. Each
 * agent reads the array property it expects (items/aggregates/tables/...). */
function plannerConfig(toolName) {
    return { toolName: toolName, normalizeResult: function (value) { return (0, cbPlanner_js_1.assertRecord)(value, 'result'); } };
}
/** Wrap a single-artifact result schema into a batch `{ items: [...] }` schema for one-call-per-layer
 * generation (v1 processes a whole layer in one LLM call instead of a parallel_dynamic fan-out). */
function batchSchema(itemSchema) {
    return { type: 'object', additionalProperties: false, required: ['items'], properties: { items: { type: 'array', items: itemSchema } } };
}
function asArray(value) {
    return Array.isArray(value) ? value.filter(cbPlanner_js_1.isRecord) : [];
}
var ALL_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'inProgress', 'done'];
exports.DEFAULT_EVENT_RETENTION_DAYS = 90; // telemetry default when the ontology omits it
// ── deterministic l4 scan ──────────────────────────────────────────────────────
function readBackendScan() {
    return __awaiter(this, arguments, void 0, function (statuses) {
        var wanted, project, moduleNames, entityToModule, entities, relationships, rawOwners, workspaces, actorsList, siteMaps, siteMapSource, warnings, _i, _a, file, folder, shortName, parsed, _b, _c, nestedModule, ws, moduleName, _d, _e, a, moduleName, moduleName, moduleName, entityId, moduleFallback, allOwners, todoState, l4OwnerKeys, missingTodo, _f, allOwners_1, owner, todoOwner, extraTodo, parts, _g, _h, moduleName, owners, operatedRootIds, _j, rawOwners_1, obj, e, _k, _l, w, aggregates, events, contracts;
        if (statuses === void 0) { statuses = ['toCreate']; }
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    wanted = new Set(statuses);
                    project = mls.actualProject || 0;
                    moduleNames = new Set();
                    entityToModule = new Map();
                    entities = [];
                    relationships = [];
                    rawOwners = [];
                    workspaces = [];
                    actorsList = [];
                    siteMaps = {};
                    siteMapSource = {};
                    warnings = [];
                    _i = 0, _a = Object.values(mls.stor.files);
                    _m.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts')
                        return [3 /*break*/, 3];
                    folder = String(file.folder || '');
                    shortName = String(file.shortName || '');
                    _b = parseDefsSource;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    parsed = _b.apply(void 0, [_c.apply(void 0, [_m.sent()])]);
                    if (!(0, cbPlanner_js_1.isRecord)(parsed))
                        return [3 /*break*/, 3];
                    nestedModule = folder.includes('/') ? folder.split('/')[0] : '';
                    if (folder === 'operations' || folder.endsWith('/operations')) {
                        rawOwners.push({ kind: 'operation', obj: parsed, moduleName: nestedModule || undefined });
                    }
                    else if (folder === 'workflows' || folder.endsWith('/workflows')) {
                        rawOwners.push({ kind: 'workflow', obj: parsed, moduleName: nestedModule || undefined });
                    }
                    else if (folder.endsWith('/workspaces')) {
                        ws = (0, cbWorkspace_js_1.parseWorkspaceDefs)(parsed, nestedModule);
                        if (ws) {
                            workspaces.push(ws);
                            if (ws.moduleName)
                                moduleNames.add(ws.moduleName);
                        }
                    }
                    else if (shortName === 'actors' && folder && !folder.includes('/')) {
                        moduleName = readString(parsed.moduleName) || folder;
                        for (_d = 0, _e = (0, cbWorkspace_js_1.readModuleActors)(parsed, moduleName); _d < _e.length; _d++) {
                            a = _e[_d];
                            actorsList.push(a);
                        }
                    }
                    else if ((shortName === 'siteMap' || shortName === 'navigation') && folder && !folder.includes('/')) {
                        moduleName = readString(parsed.moduleName) || folder;
                        if (siteMapSource[moduleName] !== 'siteMap') {
                            siteMaps[moduleName] = parsed;
                            siteMapSource[moduleName] = shortName === 'siteMap' ? 'siteMap' : 'navigation';
                        }
                    }
                    else if (shortName === 'module' && folder && !folder.includes('/')) {
                        moduleName = readString(((0, cbPlanner_js_1.isRecord)(parsed.module) ? parsed.module : parsed).moduleName) || folder;
                        moduleNames.add(moduleName);
                        collectModuleOntology(parsed, moduleName, entities, entityToModule, relationships);
                    }
                    else if (folder.endsWith('/ontology')) {
                        moduleName = folder.split('/')[0];
                        entityId = readString(parsed.entityId) || shortName;
                        if (moduleName && entityId) {
                            moduleNames.add(moduleName);
                            entityToModule.set(entityId, moduleName);
                            upsertEntity(entities, {
                                entityId: entityId,
                                title: readString(parsed.title) || entityId,
                                kind: readString(parsed.kind) || 'core',
                                ownership: readString(parsed.ownership) || 'moduleOwned',
                                moduleName: moduleName,
                                fields: Array.isArray(parsed.fields) ? parsed.fields.filter(cbPlanner_js_1.isRecord) : undefined,
                                eventPolicy: readEventPolicy(parsed.eventPolicy),
                            });
                        }
                    }
                    _m.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    moduleFallback = moduleNames.size === 1 ? Array.from(moduleNames)[0] : 'unknown';
                    allOwners = rawOwners
                        // v2 knows the module from the folder (`<module>/operations`); v1 (flat) derives it from the entity.
                        .map(function (_a) {
                        var kind = _a.kind, obj = _a.obj, moduleName = _a.moduleName;
                        return ownerFrom(kind, obj, entityToModule, moduleFallback, moduleName);
                    })
                        .filter(function (o) { return !!o; });
                    return [4 /*yield*/, readBackendTodoState(project)];
                case 5:
                    todoState = _m.sent();
                    if (rawOwners.length > 0 && todoState.files === 0) {
                        throw new Error('l5/{module}/todoBackend.defs.ts not found; backend generation status must come from todoBackend, not inline l4 statusBackend.');
                    }
                    l4OwnerKeys = new Set(allOwners.map(ownerKey));
                    missingTodo = [];
                    for (_f = 0, allOwners_1 = allOwners; _f < allOwners_1.length; _f++) {
                        owner = allOwners_1[_f];
                        todoOwner = todoState.ownersByKey.get(ownerKey(owner));
                        if (!todoOwner) {
                            missingTodo.push("".concat(owner.kind, ":").concat(owner.id));
                            continue;
                        }
                        owner.todoStatus = todoOwner.status;
                        owner.statusBackend = todoOwner.status;
                        owner.moduleName = todoOwner.moduleName || owner.moduleName;
                        if (owner.inlineStatusBackend && owner.inlineStatusBackend !== todoOwner.status) {
                            warnings.push("".concat(owner.kind, ":").concat(owner.id, " inline statusBackend=").concat(owner.inlineStatusBackend, " ignored; todoBackend=").concat(todoOwner.status));
                        }
                    }
                    extraTodo = __spreadArray([], todoState.ownersByKey.keys(), true).filter(function (key) { return !l4OwnerKeys.has(key); });
                    if (missingTodo.length || extraTodo.length || todoState.errors.length) {
                        parts = __spreadArray(__spreadArray(__spreadArray([], todoState.errors, true), (missingTodo.length ? ["todoBackend missing l4 owner(s): ".concat(missingTodo.slice(0, 12).join(', '))] : []), true), (extraTodo.length ? ["todoBackend has owner(s) absent from l4: ".concat(extraTodo.slice(0, 12).join(', '))] : []), true);
                        throw new Error(parts.join('; '));
                    }
                    for (_g = 0, _h = todoState.moduleNames; _g < _h.length; _g++) {
                        moduleName = _h[_g];
                        moduleNames.add(moduleName);
                    }
                    warnings.push.apply(warnings, todoState.warnings);
                    owners = allOwners.filter(function (o) { return wanted.has(o.todoStatus); });
                    operatedRootIds = new Set();
                    for (_j = 0, rawOwners_1 = rawOwners; _j < rawOwners_1.length; _j++) {
                        obj = rawOwners_1[_j].obj;
                        e = readString(obj.entity);
                        if (e)
                            operatedRootIds.add(e);
                        for (_k = 0, _l = readStringArray(obj.writes); _k < _l.length; _k++) {
                            w = _l[_k];
                            operatedRootIds.add(w);
                        }
                    }
                    aggregates = deriveAggregates(entities, relationships, operatedRootIds);
                    events = deriveEventTargets(entities, relationships);
                    contracts = readL4Contracts(project);
                    return [2 /*return*/, {
                            project: project,
                            moduleNames: Array.from(moduleNames).sort(),
                            owners: owners,
                            entities: entities,
                            relationships: relationships,
                            aggregates: aggregates,
                            events: events,
                            workspaces: workspaces,
                            contracts: contracts,
                            actors: actorsList,
                            siteMaps: siteMaps,
                            warnings: warnings,
                        }];
            }
        });
    });
}
// Enumerate the l4 v2 contract files (`.ts`/`.d.ts` under `<module>/contracts`). B1 lists them so B5
// can byte-copy each into l1; the shortName is `<workspaceId>.<bffId>` (compound; split on the last dot).
function readL4Contracts(project) {
    var contracts = [];
    for (var _i = 0, _a = Object.values(mls.stor.files); _i < _a.length; _i++) {
        var file = _a[_i];
        if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted')
            continue;
        var extension = String(file.extension || '');
        if (extension !== '.ts' && extension !== '.d.ts')
            continue;
        var folder = String(file.folder || '');
        if (!folder.endsWith('/contracts'))
            continue;
        var shortName = String(file.shortName || '');
        var dot = shortName.lastIndexOf('.');
        if (dot <= 0 || dot >= shortName.length - 1)
            continue; // expect `<workspaceId>.<bffId>`
        contracts.push({
            moduleName: folder.split('/')[0],
            workspaceId: shortName.slice(0, dot),
            bffId: shortName.slice(dot + 1),
            shortName: shortName,
            folder: folder,
            extension: extension,
        });
    }
    return contracts;
}
function ownerKey(owner) {
    return "".concat(owner.kind, ":").concat(owner.id);
}
function todoOwnerKey(ownerType, ownerId) {
    return "".concat(ownerType, ":").concat(ownerId);
}
function readBackendTodoState(project) {
    return __awaiter(this, void 0, void 0, function () {
        var ownersByKey, moduleNames, warnings, errors, files, _i, _a, file, parsed, _b, _c, layer, moduleName, owners, _d, owners_1, raw, ownerType, ownerId, status_1, key;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    ownersByKey = new Map();
                    moduleNames = new Set();
                    warnings = [];
                    errors = [];
                    files = 0;
                    _i = 0, _a = Object.values(mls.stor.files);
                    _e.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted')
                        return [3 /*break*/, 3];
                    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoBackend')
                        return [3 /*break*/, 3];
                    files++;
                    _b = parseDefsSource;
                    _c = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    parsed = _b.apply(void 0, [_c.apply(void 0, [_e.sent()])]);
                    if (!(0, cbPlanner_js_1.isRecord)(parsed)) {
                        errors.push("invalid todoBackend defs at l5/".concat(String(file.folder || ''), "/todoBackend.defs.ts"));
                        return [3 /*break*/, 3];
                    }
                    layer = readString(parsed.layer);
                    if (layer && layer !== 'backend')
                        warnings.push("todoBackend ".concat(String(file.folder || ''), " has layer=").concat(layer, "; treating as backend by filename"));
                    moduleName = readString(parsed.moduleName) || String(file.folder || '');
                    if (moduleName)
                        moduleNames.add(moduleName);
                    owners = Array.isArray(parsed.owners) ? parsed.owners.filter(cbPlanner_js_1.isRecord) : [];
                    for (_d = 0, owners_1 = owners; _d < owners_1.length; _d++) {
                        raw = owners_1[_d];
                        ownerType = readString(raw.ownerType);
                        ownerId = readString(raw.ownerId);
                        status_1 = readString(raw.status);
                        if ((ownerType !== 'operation' && ownerType !== 'workflow') || !ownerId) {
                            errors.push("todoBackend ".concat(moduleName || String(file.folder || ''), " has invalid owner entry"));
                            continue;
                        }
                        if (!isOwnerStatus(status_1)) {
                            errors.push("todoBackend ".concat(moduleName || String(file.folder || ''), "/").concat(ownerType, ":").concat(ownerId, " has invalid status \"").concat(status_1, "\""));
                            continue;
                        }
                        key = todoOwnerKey(ownerType, ownerId);
                        if (ownersByKey.has(key))
                            warnings.push("duplicate todoBackend owner ".concat(key, "; first entry kept"));
                        else
                            ownersByKey.set(key, { ownerType: ownerType, ownerId: ownerId, status: status_1, moduleName: moduleName });
                    }
                    _e.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, { files: files, moduleNames: Array.from(moduleNames).sort(), ownersByKey: ownersByKey, warnings: warnings, errors: errors }];
            }
        });
    });
}
function isOwnerStatus(status) {
    return status === 'toCreate' || status === 'toUpdate' || status === 'toRemove' || status === 'inProgress' || status === 'done';
}
// Read the optional event classification from an ontology def (shape-safe; ignores malformed input).
function readEventPolicy(value) {
    if (!(0, cbPlanner_js_1.isRecord)(value))
        return undefined;
    var purpose = readString(value.purpose);
    if (purpose !== 'telemetry' && purpose !== 'audit' && purpose !== 'reaction')
        return undefined;
    var retentionDays = typeof value.retentionDays === 'number' ? value.retentionDays : undefined;
    return retentionDays === undefined ? { purpose: purpose } : { purpose: purpose, retentionDays: retentionDays };
}
// Turn every kind:"event" entity into a first-class generation target. The owner is the related core
// entity (relationship in either direction). Missing eventPolicy defaults to telemetry/90d so legacy
// ontologies still get persisted instead of producing a dead in-memory object. reaction events are
// NOT persisted locally (persisted:false) — the usecase routes them to the platform outbox.
function deriveEventTargets(entities, relationships) {
    var _a, _b, _c;
    var byId = new Map(entities.map(function (e) { return [e.entityId, e]; }));
    var out = [];
    for (var _i = 0, entities_1 = entities; _i < entities_1.length; _i++) {
        var e = entities_1[_i];
        if (e.kind !== 'event')
            continue;
        var policy = (_a = e.eventPolicy) !== null && _a !== void 0 ? _a : { purpose: 'telemetry', retentionDays: exports.DEFAULT_EVENT_RETENTION_DAYS };
        var ownerEntity = '';
        for (var _d = 0, relationships_1 = relationships; _d < relationships_1.length; _d++) {
            var rel = relationships_1[_d];
            var other = rel.fromEntity === e.entityId ? rel.toEntity : rel.toEntity === e.entityId ? rel.fromEntity : '';
            if (other && ((_b = byId.get(other)) === null || _b === void 0 ? void 0 : _b.kind) === 'core') {
                ownerEntity = other;
                break;
            }
        }
        var persisted = policy.purpose !== 'reaction';
        var retentionDays = policy.purpose === 'telemetry' ? ((_c = policy.retentionDays) !== null && _c !== void 0 ? _c : exports.DEFAULT_EVENT_RETENTION_DAYS) : policy.retentionDays;
        out.push({ entityId: e.entityId, ownerEntity: ownerEntity, purpose: policy.purpose, retentionDays: retentionDays, persisted: persisted, fields: e.fields });
    }
    return out;
}
function collectModuleOntology(moduleDefs, moduleName, entities, entityToModule, relationships) {
    var ontology = (0, cbPlanner_js_1.isRecord)(moduleDefs.ontology) ? moduleDefs.ontology : undefined;
    var ents = ontology && (0, cbPlanner_js_1.isRecord)(ontology.entities) ? ontology.entities : undefined;
    if (ents) {
        for (var _i = 0, _a = Object.entries(ents); _i < _a.length; _i++) {
            var _b = _a[_i], entityId = _b[0], raw = _b[1];
            if (!(0, cbPlanner_js_1.isRecord)(raw))
                continue;
            entityToModule.set(entityId, moduleName);
        }
    }
    var rels = Array.isArray(moduleDefs.relationships) ? moduleDefs.relationships : [];
    for (var _c = 0, rels_1 = rels; _c < rels_1.length; _c++) {
        var rel = rels_1[_c];
        if (!(0, cbPlanner_js_1.isRecord)(rel))
            continue;
        var fromEntity = readString(rel.fromEntity);
        var toEntity = readString(rel.toEntity);
        if (fromEntity && toEntity)
            relationships.push({ fromEntity: fromEntity, toEntity: toEntity, type: readString(rel.type) || 'manyToOne' });
    }
}
function ownerFrom(kind, obj, entityToModule, fallbackModule, explicitModule) {
    var id = readString(obj.operationId) || readString(obj.workflowId);
    if (!id)
        return null;
    var entity = readString(obj.entity);
    // Workflows declare the entities they touch in `entities` (no reads/writes). Fold those in so the
    // deterministic port derivation works for workflows too (otherwise the model invents port names).
    // Strip field-level refs ("CashMovement.amount") — keep only bare entity ids.
    var bare = function (arr) { return arr.filter(function (s) { return s && !s.includes('.'); }); };
    var entitiesArr = bare(readStringArray(obj.entities));
    var reads = __spreadArray([], new Set(__spreadArray(__spreadArray([], bare(readStringArray(obj.reads)), true), entitiesArr, true)), true);
    var writes = __spreadArray([], new Set(__spreadArray(__spreadArray([], bare(readStringArray(obj.writes)), true), entitiesArr, true)), true);
    var moduleName = explicitModule || entityToModule.get(entity) || entityToModule.get(reads[0]) || entityToModule.get(writes[0]) || fallbackModule;
    return {
        kind: kind,
        id: id,
        pageId: readString(obj.pageId),
        commandName: readString(obj.commandName),
        bffName: readString(obj.bffName),
        title: readString(obj.title) || id,
        entity: entity,
        opKind: readString(obj.kind),
        actors: (0, cbWorkspace_js_1.readActorsField)(obj),
        reads: reads,
        writes: writes,
        rulesApplied: readStringArray(obj.rulesApplied),
        accessPattern: readAccessPattern(obj.accessPattern),
        outputShape: readOutputShape(obj.outputShape),
        inputs: readOperationInputs(obj.inputs),
        contextResolution: readContextResolution(obj.contextResolution),
        acceptanceAssertions: readStringArray(obj.acceptanceAssertions),
        todoStatus: '',
        statusBackend: '',
        inlineStatusBackend: readString(obj.statusBackend),
        moduleName: moduleName,
    };
}
function readAccessPattern(value) {
    if (!(0, cbPlanner_js_1.isRecord)(value))
        return undefined;
    var kind = readString(value.kind);
    var description = readString(value.description);
    if (!kind && !description)
        return undefined;
    return __assign(__assign(__assign(__assign(__assign(__assign(__assign({ kind: kind, description: description }, (readString(value.entity) ? { entity: readString(value.entity) } : {})), (readString(value.keyField) ? { keyField: readString(value.keyField) } : {})), (readStringArray(value.filters).length ? { filters: readStringArray(value.filters) } : {})), (readStringArray(value.sort).length ? { sort: readStringArray(value.sort) } : {})), (readString(value.pagination) ? { pagination: readString(value.pagination) } : {})), (readString(value.selection) ? { selection: readString(value.selection) } : {})), (readStringArray(value.output).length ? { output: readStringArray(value.output) } : {}));
}
function readCbOutputField(value) {
    if (!(0, cbPlanner_js_1.isRecord)(value))
        return null;
    var name = readString(value.name);
    var type = readString(value.type);
    if (!name || !type)
        return null;
    var field = { name: name, type: type, required: value.required === true };
    var fieldRef = readString(value.fieldRef);
    if (fieldRef)
        field.fieldRef = fieldRef;
    if ((0, cbPlanner_js_1.isRecord)(value.item) && Array.isArray(value.item.fields)) {
        var fields = value.item.fields.map(readCbOutputField).filter(function (f) { return f !== null; });
        if (fields.length)
            field.item = { fields: fields };
    }
    return field;
}
function readOutputShape(value) {
    if (!(0, cbPlanner_js_1.isRecord)(value))
        return undefined;
    var kind = readString(value.kind);
    var fields = Array.isArray(value.fields)
        ? value.fields.map(readCbOutputField).filter(function (f) { return f !== null; })
        : [];
    if (!kind || fields.length === 0)
        return undefined;
    return { kind: kind, fields: fields };
}
function readOperationInputs(value) {
    return Array.isArray(value) ? value.filter(cbPlanner_js_1.isRecord).map(function (raw) { return (__assign(__assign({ inputId: readString(raw.inputId), fieldRef: readString(raw.fieldRef) }, (readString(raw.type) ? { type: readString(raw.type) } : {})), { required: raw.required === true, source: readString(raw.source), description: readString(raw.description) })); }).filter(function (input) { return !!input.inputId || !!input.fieldRef; }) : [];
}
function readContextResolution(value) {
    return Array.isArray(value) ? value.filter(cbPlanner_js_1.isRecord).map(function (raw) { return (__assign(__assign({}, (readString(raw.inputId) ? { inputId: readString(raw.inputId) } : {})), { targetRef: readString(raw.targetRef), source: readString(raw.source), originRef: readString(raw.originRef), description: readString(raw.description) })); }).filter(function (item) { return !!item.targetRef || !!item.originRef; }) : [];
}
// ── aggregate derivation (baseline; the LLM index agent may refine) ────────────
function deriveAggregates(entities, relationships, operatedRootIds) {
    if (operatedRootIds === void 0) { operatedRootIds = new Set(); }
    var byId = new Map(entities.map(function (e) { return [e.entityId, e]; }));
    var buildAggregate = function (root) {
        var embeddedMembers = [];
        var events = [];
        var mdmRefs = [];
        for (var _i = 0, relationships_2 = relationships; _i < relationships_2.length; _i++) {
            var rel = relationships_2[_i];
            // a supporting child related to this root (root -> child) folds into the root details JSONB
            var childId = rel.fromEntity === root.entityId ? rel.toEntity : rel.toEntity === root.entityId ? rel.fromEntity : '';
            if (!childId)
                continue;
            var child = byId.get(childId);
            if (!child)
                continue;
            if (child.kind === 'supporting' && (rel.type === 'oneToMany' || rel.type === 'oneToOne'))
                push(embeddedMembers, childId);
            else if (child.kind === 'event')
                push(events, childId);
            else if (child.kind === 'mdm')
                push(mdmRefs, childId);
        }
        return { aggregateId: root.entityId, rootEntity: root.entityId, embeddedMembers: embeddedMembers, events: events, mdmRefs: mdmRefs };
    };
    var aggregates = entities.filter(function (e) { return e.kind === 'core'; }).map(buildAggregate);
    // Invariant: any entity an operation acts on as a root (operatedRootIds = operation.entity + writes)
    // must own an entity+port+table — UNLESS it is embedded in another aggregate (a child folded into
    // details JSONB) or is an mdm/event entity. This keeps generation robust when the ontology
    // under-classifies kinds (e.g. a standalone "table"/"category" marked supporting): without it the
    // usecases that reference its port would import a module that was never generated.
    var embedded = new Set(aggregates.flatMap(function (a) { return a.embeddedMembers; }));
    var roots = new Set(aggregates.map(function (a) { return a.rootEntity; }));
    for (var _i = 0, operatedRootIds_1 = operatedRootIds; _i < operatedRootIds_1.length; _i++) {
        var id = operatedRootIds_1[_i];
        var e = byId.get(id);
        if (!e || roots.has(id) || embedded.has(id) || e.kind === 'mdm' || e.kind === 'event')
            continue;
        aggregates.push(buildAggregate(e));
        roots.add(id);
    }
    return aggregates;
}
/** Heuristic: a field needs a real column when it is the id (PK), a reference/FK (type is an entity
 * id or ends with "Id"), a status/lifecycle field, or an ordering timestamp (createdAt). Everything
 * else goes into details JSONB. Deterministic column plan consumed by the table/adapter generators. */
function planTableColumns(fields, knownEntityIds) {
    var indexed = [];
    var details = [];
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var f = fields_1[_i];
        var fieldId = readString(f.fieldId);
        if (!fieldId)
            continue;
        var type = readString(f.type);
        var isId = fieldId === 'id' || /Id$/.test(fieldId);
        var isRef = knownEntityIds.has(type);
        var isStatus = fieldId === 'status' || Array.isArray(f.enum);
        var isOrderTs = fieldId === 'createdAt';
        if (isId || isRef || isStatus || isOrderTs) {
            indexed.push({ fieldId: fieldId, reason: isId ? 'pk/fk' : isRef ? 'fk' : isStatus ? 'status' : 'ordering' });
        }
        else {
            details.push(fieldId);
        }
    }
    return { indexed: indexed, details: details };
}
// ── l1 hexagonal file-info builders ────────────────────────────────────────────
var L1 = 1;
function defs(folder, shortName) {
    return { project: mls.actualProject || 0, level: L1, folder: folder, shortName: toSafeShortName(shortName), extension: '.defs.ts' };
}
function domainEntityFileInfo(m, entityId) { return defs("".concat(m, "/layer_3_domain/entities"), lowerFirst(entityId)); }
function valueObjectFileInfo(m, memberId) { return defs("".concat(m, "/layer_3_domain/value-objects"), lowerFirst(memberId)); }
function repositoryPortFileInfo(m, entityId) { return defs("".concat(m, "/layer_2_application/ports"), "".concat(lowerFirst(entityId), "Repository")); }
function usecaseFileInfo(m, usecaseId) { return defs("".concat(m, "/layer_2_application/usecases"), lowerFirst(usecaseId)); }
function persistenceTableFileInfo(m, tableId) { return defs("".concat(m, "/layer_1_external/adapters/persistence"), lowerFirst(tableId)); }
function repositoryAdapterFileInfo(m, entityId) { return defs("".concat(m, "/layer_1_external/adapters/persistence"), "".concat(lowerFirst(entityId), "RepositoryAdapter")); }
function httpControllerFileInfo(m, pageId) { return defs("".concat(m, "/layer_1_external/adapters/http/controllers"), lowerFirst(pageId)); }
// ── co-located agent prompt assets ─────────────────────────────────────────────
exports.CB_AGENT_PROJECT = 102021;
exports.CB_AGENT_FOLDER = 'agentChangeBackend';
/** Read a co-located LLM prompt at runtime. Prompts live next to their step agent as
 * `agentChangeBackend/steps/<slug>/prompt.md` (moved into the step folders on 2026-07-11,
 * todo/modernizeChangeBackend.md step 4; inline template strings were extracted in step 2). Each file
 * keeps its `<!-- modelType: ... -->` marker; the caller still replaces the {{toolName}} placeholder.
 * `folderRel` is relative to this agent folder (e.g. 'steps/gen-domain'); fixed to project 102021 (the
 * agent's own files), NOT the client mls.actualProject. */
function readCbPrompt(folderRel_1) {
    return __awaiter(this, arguments, void 0, function (folderRel, shortName) {
        var fileInfo, file, raw;
        if (shortName === void 0) { shortName = 'prompt'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileInfo = { project: exports.CB_AGENT_PROJECT, level: 2, folder: "".concat(exports.CB_AGENT_FOLDER, "/").concat(folderRel), shortName: shortName, extension: '.md' };
                    file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
                    if (!file || file.status === 'deleted')
                        throw new Error("[readCbPrompt] prompt not found: ".concat(folderRel, "/").concat(shortName, ".md"));
                    return [4 /*yield*/, file.getContent()];
                case 1:
                    raw = _a.sent();
                    if (typeof raw !== 'string')
                        throw new Error("[readCbPrompt] prompt is not text: ".concat(folderRel, "/").concat(shortName, ".md"));
                    return [2 /*return*/, raw];
            }
        });
    });
}
// ── defs writer (main export + pipeline export, self-sufficient) ───────────────
function defsRef(fileInfo) {
    return "_".concat(fileInfo.project, "_/l").concat(fileInfo.level, "/").concat(fileInfo.folder, "/").concat(fileInfo.shortName, ".defs.ts");
}
/** The .d.ts ref of an artifact (used in dependsFiles — the callee's signatures). */
function dtsRef(fileInfo) {
    return defsRef(fileInfo).replace(/\.defs\.ts$/, '.d.ts');
}
/** Standard planning envelope shared by every .defs.ts data block. */
function buildArtifact(artifactType, artifactId, moduleName, agentName, data) {
    return { schemaVersion: '2026-06-26', artifactType: artifactType, artifactId: artifactId, moduleName: moduleName, status: 'draft', source: { agentName: agentName, stepId: 0, planId: '' }, data: data };
}
/** Materialization context for a layer: the hexagonal base architecture skill + the per-type skill
 * (both co-located with this agent) + the platform defs. */
function layerSkills(skillFile) {
    return [
        '_102021_/l2/agentChangeBackend/skills/architecture.md',
        "_102021_/l2/agentChangeBackend/skills/".concat(skillFile),
        '_102034_.d.ts',
    ];
}
/** Build the pipeline item that makes a .defs.ts self-sufficient for materialization (agentCbMaterialize
 * in-flow, or the cbMaterializeCli Node runner): it carries the outputPath (.ts), the dependsFiles
 * (.d.ts of the inner callee layer) and skills (the LLM context = layer skill + platform defs).
 * See spec.md (auto-suficiência). */
function buildPipelineItem(shortName, type, fileInfo, dependsFiles, skills, opts) {
    if (opts === void 0) { opts = {}; }
    var defPath = defsRef(fileInfo);
    return __assign(__assign(__assign({ id: "".concat(shortName, "__").concat(type), type: type, outputPath: defPath.replace(/\.defs\.ts$/, '.ts'), defPath: defPath, dependsFiles: dependsFiles, dependsOn: [], skills: skills }, (opts.rulesPath ? { rulesPath: opts.rulesPath } : {})), (opts.rulesApplied && opts.rulesApplied.length ? { rulesApplied: opts.rulesApplied } : {})), { agent: 'agentCbMaterialize' });
}
/** Write a .defs.ts with the platform header, the main `export const {name}` + default export, and
 * (optionally) the `export const pipeline`. Force-overwrites. */
function saveDefs(fileInfo, exportName, data, pipeline) {
    return __awaiter(this, void 0, void 0, function () {
        var ref, src, info, param, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ref = defsRef(fileInfo);
                    src = "/// <mls fileReference=\"".concat(ref, "\" enhancement=\"_blank\"/>\n\n");
                    src += "export const ".concat(exportName, " = ").concat(JSON.stringify(data, null, 2), " as const;\n\nexport default ").concat(exportName, ";\n");
                    if (pipeline && pipeline.length)
                        src += "\nexport const pipeline = ".concat(JSON.stringify(pipeline, null, 2), " as const;\n");
                    info = mls.stor.convertFileReferenceToFile(ref);
                    param = __assign(__assign({}, info), { source: src });
                    return [4 /*yield*/, (0, libStor_js_1.createStorFile)(param, true, true, true)];
                case 1:
                    file = _a.sent();
                    // Bump updatedAt so staleness (isStale: defs newer than .ts) re-materializes after a regen — the
                    // shared libStor.createStorFile does not set it (unlike core agentDefs.createStorFile).
                    file.updatedAt = new Date().toISOString();
                    return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: src })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, ref];
            }
        });
    });
}
function saveBackendWorkspaceConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var project, l5, masters, backendSignature, runtimeId, config, workspace, projects, client, backendRuntime, clientModules, persistenceModules, backendModules, l5Modules, _loop_1, _i, l5Modules_1, l5mod;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    project = mls.actualProject || 0;
                    if (!project)
                        return [2 /*return*/, 'l5/config.json backend skipped: project unavailable'];
                    return [4 /*yield*/, readJsonStor({ project: project, level: 5, folder: '', shortName: 'project', extension: '.json' })];
                case 1:
                    l5 = _a.sent();
                    if (!(0, cbPlanner_js_1.isRecord)(l5))
                        return [2 /*return*/, 'l5/config.json backend skipped: l5/project.json not found'];
                    masters = (0, cbPlanner_js_1.isRecord)(l5.masters) ? l5.masters : {};
                    backendSignature = (0, cbPlanner_js_1.isRecord)(masters.backend) ? masters.backend : {};
                    runtimeId = readId(backendSignature.runtimeProject) || '102034';
                    return [4 /*yield*/, readJsonStor({ project: project, level: 5, folder: '', shortName: 'config', extension: '.json' })];
                case 2:
                    config = _a.sent();
                    workspace = (0, cbPlanner_js_1.isRecord)(config) ? config : {};
                    workspace.defaultProjectId = readId(workspace.defaultProjectId) || String(project);
                    projects = ensureRecordProperty(workspace, 'projects');
                    client = ensureProjectConfig(projects, String(project), { root: '.', type: 'client', runtime: projectRuntimeMetadata(l5, String(project)) });
                    backendRuntime = (0, cbPlanner_js_1.isRecord)(projects[runtimeId]) ? projects[runtimeId] : {};
                    projects[runtimeId] = __assign(__assign({}, backendRuntime), { root: "../mls-".concat(runtimeId), type: 'master backend' });
                    projects['102029'] = (0, cbPlanner_js_1.isRecord)(projects['102029']) ? projects['102029'] : { root: '../mls-102029', type: 'lib' };
                    clientModules = Array.isArray(client.modules) ? client.modules.filter(cbPlanner_js_1.isRecord) : [];
                    persistenceModules = Array.isArray(client.persistenceModules) ? client.persistenceModules.filter(cbPlanner_js_1.isRecord) : [];
                    client.modules = clientModules;
                    client.persistenceModules = persistenceModules;
                    backendModules = 0;
                    l5Modules = Array.isArray(l5.modules) ? l5.modules.filter(cbPlanner_js_1.isRecord) : [];
                    _loop_1 = function (l5mod) {
                        var moduleName = readString(l5mod.moduleName);
                        var backend = (0, cbPlanner_js_1.isRecord)(l5mod.backend) ? l5mod.backend : null;
                        if (!moduleName || !backend)
                            return "continue";
                        var persistence = (0, cbPlanner_js_1.isRecord)(backend.persistence) ? backend.persistence : {};
                        var backendControllers = readString(backend.backendControllers);
                        var tableDefsDir = readString(persistence.tableDefsDir);
                        if (!backendControllers || !tableDefsDir)
                            return "continue";
                        var mod = clientModules.find(function (item) { return readString(item.moduleId) === moduleName; });
                        if (!mod) {
                            mod = { moduleId: moduleName, basePath: "/".concat(moduleName), shellMode: 'spa' };
                            clientModules.push(mod);
                        }
                        mod.basePath = readString(mod.basePath) || "/".concat(moduleName);
                        mod.shellMode = readString(mod.shellMode) || 'spa';
                        mod.backendControllers = backendControllers;
                        delete mod.backendRouter;
                        var pm = persistenceModules.find(function (item) { return readString(item.moduleId) === moduleName; });
                        if (!pm) {
                            pm = { moduleId: moduleName };
                            persistenceModules.push(pm);
                        }
                        pm.tableDefsDir = tableDefsDir;
                        delete pm.persistenceEntrypoint;
                        backendModules += 1;
                    };
                    for (_i = 0, l5Modules_1 = l5Modules; _i < l5Modules_1.length; _i++) {
                        l5mod = l5Modules_1[_i];
                        _loop_1(l5mod);
                    }
                    return [4 /*yield*/, saveJsonStor({ project: project, level: 5, folder: '', shortName: 'config', extension: '.json' }, workspace)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, "l5/config.json backend merged (".concat(backendModules, " module(s))")];
            }
        });
    });
}
function readJsonStor(fileInfo) {
    return __awaiter(this, void 0, void 0, function () {
        var file, _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 4, , 5]);
                    file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
                    if (!(file && file.status !== 'deleted')) return [3 /*break*/, 2];
                    _c = (_b = JSON).parse;
                    _d = String;
                    return [4 /*yield*/, file.getContent()];
                case 1:
                    _a = _c.apply(_b, [_d.apply(void 0, [_f.sent()])]);
                    return [3 /*break*/, 3];
                case 2:
                    _a = null;
                    _f.label = 3;
                case 3: return [2 /*return*/, _a];
                case 4:
                    _e = _f.sent();
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function saveJsonStor(fileInfo, data) {
    return __awaiter(this, void 0, void 0, function () {
        var source, key, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    source = "".concat(JSON.stringify(data, null, 2), "\n");
                    key = mls.stor.getKeyToFile(fileInfo);
                    file = mls.stor.files[key];
                    if (!!file) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, libStor_js_1.createStorFile)(__assign(__assign({}, fileInfo), { source: source }), false, false, false)];
                case 1:
                    file = _a.sent();
                    _a.label = 2;
                case 2:
                    if (file.status !== 'renamed' && file.status !== 'new')
                        file.status = 'changed';
                    file.updatedAt = new Date().toISOString();
                    return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: source })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function ensureRecordProperty(target, key) {
    if (!(0, cbPlanner_js_1.isRecord)(target[key]))
        target[key] = {};
    return target[key];
}
function ensureProjectConfig(projects, id, patch) {
    var existing = (0, cbPlanner_js_1.isRecord)(projects[id]) ? projects[id] : {};
    projects[id] = __assign(__assign({}, existing), patch);
    return projects[id];
}
function projectRuntimeMetadata(l5, clientId) {
    return {
        projectId: readId(l5.projectId) || clientId,
        domain: l5.domain,
        port: l5.port,
        databaseName: l5.databaseName,
        environment: l5.environment,
        studioEnabled: l5.studioEnabled,
    };
}
function readId(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return String(value);
    return readString(value);
}
function saveAgentTrace(context, agentName, step) {
    return __awaiter(this, void 0, void 0, function () {
        var payload, scan, moduleName, source, fileInfo, ref, info, file, error_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!shouldSaveTrace(context))
                        return [2 /*return*/];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 5, , 6]);
                    payload = (_b = (_a = step.interaction) === null || _a === void 0 ? void 0 : _a.payload) === null || _b === void 0 ? void 0 : _b[0];
                    if (!payload)
                        return [2 /*return*/];
                    return [4 /*yield*/, readBackendScan(ALL_STATUSES).catch(function () { return null; })];
                case 2:
                    scan = _d.sent();
                    moduleName = ((_c = scan === null || scan === void 0 ? void 0 : scan.moduleNames) === null || _c === void 0 ? void 0 : _c[0]) || 'backend';
                    source = "".concat(JSON.stringify({
                        savedAt: new Date().toISOString(),
                        agentName: agentName,
                        stepId: step.stepId,
                        planning: step.planning || null,
                        status: step.status,
                        payload: payload,
                    }, null, 2), "\n");
                    fileInfo = {
                        project: mls.actualProject || 0,
                        level: 4,
                        folder: "".concat(moduleName, "/trace"),
                        shortName: traceShortName(agentName, step.stepId),
                        extension: '.json',
                    };
                    ref = defsRef(fileInfo);
                    info = mls.stor.convertFileReferenceToFile(ref);
                    return [4 /*yield*/, (0, libStor_js_1.createStorFile)(__assign(__assign({}, info), { source: source }), true, true, false)];
                case 3:
                    file = _d.sent();
                    return [4 /*yield*/, mls.stor.localStor.setContent(file, { contentType: 'string', content: source })];
                case 4:
                    _d.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _d.sent();
                    console.warn("[cb saveAgentTrace] failed for ".concat(agentName), error_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function shouldSaveTrace(context) {
    var _a, _b;
    try {
        var longMemory = (_b = (_a = context.task) === null || _a === void 0 ? void 0 : _a.iaCompressed) === null || _b === void 0 ? void 0 : _b.longMemory;
        var flag = longMemory === null || longMemory === void 0 ? void 0 : longMemory._saveTrace;
        if (flag === 'true')
            return true;
        if (flag === 'false')
            return false;
    }
    catch (_c) {
        // use default
    }
    return true;
}
function traceShortName(agentName, stepId) {
    var safe = agentName
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    return "".concat(String(stepId !== null && stepId !== void 0 ? stepId : 0).padStart(3, '0'), "-").concat(safe || 'agent');
}
// ── todoBackend mutation (deterministic) ───────────────────────────────────────
/** Update only l5/{module}/todoBackend.defs.ts. l4 owner defs are read-only for this agent. */
function setTodoBackendStatus(owner, status) {
    return __awaiter(this, void 0, void 0, function () {
        var project, _i, _a, file, content, _b, parsed, owners, todoOwner, exportName;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    project = mls.actualProject || 0;
                    _i = 0, _a = Object.values(mls.stor.files);
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    file = _a[_i];
                    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted')
                        return [3 /*break*/, 4];
                    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoBackend')
                        return [3 /*break*/, 4];
                    _b = String;
                    return [4 /*yield*/, file.getContent()];
                case 2:
                    content = _b.apply(void 0, [_c.sent()]);
                    parsed = parseDefsSource(content);
                    if (!(0, cbPlanner_js_1.isRecord)(parsed))
                        return [3 /*break*/, 4];
                    owners = Array.isArray(parsed.owners) ? parsed.owners.filter(cbPlanner_js_1.isRecord) : [];
                    todoOwner = owners.find(function (raw) { return readString(raw.ownerType) === owner.kind && readString(raw.ownerId) === owner.id; });
                    if (!todoOwner)
                        return [3 /*break*/, 4];
                    exportName = readExportName(content);
                    if (!exportName)
                        return [2 /*return*/, false];
                    todoOwner.status = status;
                    parsed.updatedAt = new Date().toISOString();
                    return [4 /*yield*/, saveDefs({ project: project, level: 5, folder: String(file.folder || owner.moduleName), shortName: 'todoBackend', extension: '.defs.ts' }, exportName, parsed)];
                case 3:
                    _c.sent();
                    return [2 /*return*/, true];
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, false];
            }
        });
    });
}
// ── intent / step helpers (mirrored, self-contained) ───────────────────────────
function createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg, cleaner) {
    var _a, _b;
    var intent = {
        type: 'update-status',
        hookSequential: hookSequential,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: ((_a = context.task) === null || _a === void 0 ? void 0 : _a.PK) || '',
        parentStepId: (_b = parentStep === null || parentStep === void 0 ? void 0 : parentStep.stepId) !== null && _b !== void 0 ? _b : step.stepId,
        stepId: step.stepId,
        status: status,
        traceMsg: traceMsg,
    };
    if (cleaner)
        intent.cleaner = cleaner;
    return intent;
}
function createAgentStepPayload(planId, agentName, stepTitle, args, dependsOn, executionMode, status, dynamicSource) {
    if (status === void 0) { status = 'waiting_dependency'; }
    return {
        type: 'agent',
        stepId: 0,
        interaction: null,
        stepTitle: stepTitle,
        status: status,
        nextSteps: [],
        agentName: agentName,
        prompt: typeof args === 'string' ? args : JSON.stringify(args !== null && args !== void 0 ? args : {}),
        rags: [],
        planning: __assign({ planId: planId, dependsOn: dependsOn, executionMode: executionMode, executionHost: 'client' }, (dynamicSource ? { dynamicSource: dynamicSource } : {})),
    };
}
function createAddStepIntent(context, parentStep, step) {
    var _a;
    return {
        type: 'add-step',
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: ((_a = context.task) === null || _a === void 0 ? void 0 : _a.PK) || '',
        parentStepId: parentStep.stepId,
        step: step,
    };
}
function createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt, humanPrompt, toolSchema, toolName) {
    if (!context.task)
        throw new Error('[createPromptReadyIntent] task invalid');
    return {
        type: 'prompt_ready',
        args: args,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task.PK,
        hookSequential: hookSequential,
        parentStepId: parentStep.stepId,
        systemPrompt: systemPrompt,
        humanPrompt: humanPrompt,
        tools: [toolSchema],
        toolChoice: { type: 'function', function: { name: toolName } },
    };
}
/** Spawn a parallel_dynamic fan-out: one child per selector arg, bounded by maxParallel. */
function createParallelStepIntent(context, parentStep, planId, agentName, stepTitle, args, dependsOn, maxParallel) {
    if (dependsOn === void 0) { dependsOn = []; }
    if (maxParallel === void 0) { maxParallel = 10; }
    var step = createAgentStepPayload(planId, agentName, stepTitle, {}, dependsOn, 'parallel_dynamic', 'in_progress');
    // Children inherit onFailure from the fan-out parent. Without 'continue', an LLM-CALL failure
    // (e.g. proxy 502 after a TOOL_ARGS_SCHEMA reject on primary+fallback) marks the child failed AND
    // the whole task failed (runLLMStepParallel default branch) — bypassing the repair loop entirely.
    // With 'continue' the child proceeds to afterPromptStep, which finds no payload, records the repair
    // finding and COMPLETES the step, exactly like every other worker failure class.
    step.onFailure = 'continue';
    step.interaction = {
        input: [{ type: 'system', content: '<!-- modelType: codepro -->' }],
        cost: 0,
        trace: ["queued ".concat(args.length, " parallel args for ").concat(agentName)],
        payload: null,
    };
    return __assign(__assign({}, createAddStepIntent(context, parentStep, step)), { executionMode: { type: 'parallel', args: args, maxParallel: maxParallel } });
}
function logPrefix(agent) {
    return "[".concat(agent.agentName, " v1]");
}
function planIdOf(step) {
    var _a;
    return ((_a = step === null || step === void 0 ? void 0 : step.planning) === null || _a === void 0 ? void 0 : _a.planId) || '';
}
/** The CLI command the root stored in the task longMemory (rebuild-all | rebuild-defs | run | help). */
function readCliCommand(context) {
    var _a, _b;
    var lm = (_b = (_a = context.task) === null || _a === void 0 ? void 0 : _a.iaCompressed) === null || _b === void 0 ? void 0 : _b.longMemory;
    return typeof (lm === null || lm === void 0 ? void 0 : lm.cliCommand) === 'string' ? lm.cliCommand : '';
}
/** Enqueue the next sequential step under the same parent, depending on the current step. v1 uses a
 * simple linear chain (not the parallel_dynamic fan-out in flow.json) — easier to reason about and
 * compile; parallelization is a later optimization. */
function enqueueNext(context, parentStep, currentStep, planId, agentName, stepTitle, args) {
    if (args === void 0) { args = {}; }
    var dep = planIdOf(currentStep);
    // Steps are SIBLINGS under the same parent (NEVER nested under the current step — that would
    // deadlock: parent waits for child, child depends on parent). Uniqueness for the runtime's hook
    // dispatch key comes from UNIQUE ARGS (the planId embedded in the prompt), not from the parent.
    var mergedArgs = __assign({ planId: planId }, (args && typeof args === 'object' ? args : {}));
    var next = createAgentStepPayload(planId, agentName, stepTitle, mergedArgs, dep ? [dep] : [], 'sequential', 'waiting_dependency');
    return createAddStepIntent(context, parentStep, next);
}
// ── small parsers ──────────────────────────────────────────────────────────────
function parseDefsSource(content) {
    var start = content.indexOf('= ');
    var end = content.lastIndexOf(' as const;');
    if (start === -1 || end === -1 || end <= start)
        return null;
    try {
        return JSON.parse(content.slice(start + 2, end));
    }
    catch (_a) {
        return null;
    }
}
function readExportName(content) {
    var m = content.match(/export const\s+([A-Za-z0-9_$]+)\s*=/);
    return m ? m[1] : '';
}
function readString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function readStringArray(value) {
    return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}
function lowerFirst(value) {
    return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}
function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
function toSafeShortName(value) {
    return (value || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';
}
function push(list, value) {
    if (value && !list.includes(value))
        list.push(value);
}
function upsertEntity(entities, entity) {
    var existing = entities.find(function (e) { return e.entityId === entity.entityId; });
    if (existing)
        Object.assign(existing, entity);
    else
        entities.push(entity);
}
