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
exports.MAX_SEED_WAVE_OUTPUT_TOKENS = exports.SEED_ASSET_URLS_END = exports.SEED_ASSET_URLS_START = exports.SEED_PLAN_END = exports.SEED_PLAN_START = exports.SEED_WINDOW_END = exports.SEED_WINDOW_START = exports.SEED_T1 = exports.SEED_T0 = void 0;
exports.deriveSeedPlanningWaves = deriveSeedPlanningWaves;
exports.splitSeedPlanningWave = splitSeedPlanningWave;
exports.estimateSeedPlanningWaveTokens = estimateSeedPlanningWaveTokens;
exports.seedPlanInputForWave = seedPlanInputForWave;
exports.isSeedAssetRef = isSeedAssetRef;
exports.parseSeedPlan = parseSeedPlan;
exports.extractSeedPlanFromSource = extractSeedPlanFromSource;
exports.extractSeedPlanProgressFromSource = extractSeedPlanProgressFromSource;
exports.buildPartialSeedSource = buildPartialSeedSource;
exports.mergeSeedPlans = mergeSeedPlans;
exports.seedReferenceCatalog = seedReferenceCatalog;
exports.validateSeedPlan = validateSeedPlan;
exports.seedAssetUrlsBlock = seedAssetUrlsBlock;
exports.updateSeedAssetUrlsInSource = updateSeedAssetUrlsInSource;
exports.buildSeedSource = buildSeedSource;
exports.seedPlanPromptContext = seedPlanPromptContext;
// Pure seed-plan compiler. The LLM may choose a useful business scenario, but it never writes
// TypeScript: this module validates its JSON plan, resolves symbolic references to stable UUIDs
// and emits the runtime-discoverable TableSeedRows source.
exports.SEED_T0 = '2026-07-01T08:00:00.000Z';
exports.SEED_T1 = '2026-07-01T09:00:00.000Z';
// Default deterministic window for seed timestamps. The planner may place ANY ISO 8601 instant
// inside it, so a scenario can lay out a realistic multi-step timeline instead of collapsing every
// row onto two fixed points (which is what forced conflicts like readyAt === deliveredAt).
exports.SEED_WINDOW_START = '2026-07-01T00:00:00.000Z';
exports.SEED_WINDOW_END = '2026-07-08T00:00:00.000Z';
exports.SEED_PLAN_START = '/* <agentCbSeedsPlan>';
exports.SEED_PLAN_END = '</agentCbSeedsPlan> */';
exports.SEED_ASSET_URLS_START = '// <agentCbSeedAssetUrls>';
exports.SEED_ASSET_URLS_END = '// </agentCbSeedAssetUrls>';
exports.MAX_SEED_WAVE_OUTPUT_TOKENS = 12000;
function normalizedIdentifier(value) {
    return value.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}
function foreignKeyTargetName(columnName) {
    return columnName.replace(/_id$/iu, '');
}
/**
 * Partitions seed targets by their real dependency graph. MDM starts in the first wave, ordinary
 * persistence tables in the second, and supporting/event tables in the third; a dependency moves
 * only its dependant forward. Strongly connected targets stay together so mutual references remain
 * valid within one LLM call.
 */
function deriveSeedPlanningWaves(input) {
    var _a, _b;
    var entityById = new Map(input.entities.map(function (entity) { return [entity.entityId, entity]; }));
    var nodes = new Map();
    for (var _i = 0, _c = input.entities; _i < _c.length; _i++) {
        var entity = _c[_i];
        if (entity.kind !== 'mdm')
            continue;
        nodes.set("mdm:".concat(entity.entityId), { id: "mdm:".concat(entity.entityId), subjectId: entity.entityId, type: 'mdm', baseLevel: 0 });
    }
    for (var _d = 0, _e = input.tablePlans; _d < _e.length; _d++) {
        var table = _e[_d];
        var kind = (_a = entityById.get(table.tableId)) === null || _a === void 0 ? void 0 : _a.kind;
        nodes.set("table:".concat(table.tableId), {
            id: "table:".concat(table.tableId),
            subjectId: table.tableId,
            type: 'table',
            baseLevel: kind === 'supporting' || kind === 'event' ? 2 : 1,
        });
    }
    var targetForEntity = function (entityId) {
        var entity = entityById.get(entityId);
        if ((entity === null || entity === void 0 ? void 0 : entity.kind) === 'mdm' && nodes.has("mdm:".concat(entityId)))
            return "mdm:".concat(entityId);
        return nodes.has("table:".concat(entityId)) ? "table:".concat(entityId) : undefined;
    };
    var targetByForeignKey = new Map();
    for (var _f = 0, _g = nodes.values(); _f < _g.length; _f++) {
        var node = _g[_f];
        var key = normalizedIdentifier(node.subjectId);
        if (!targetByForeignKey.has(key))
            targetByForeignKey.set(key, node.id);
    }
    var dependencies = new Map(__spreadArray([], nodes.keys(), true).map(function (id) { return [id, new Set()]; }));
    var addDependency = function (source, target) {
        if (source && target && source !== target)
            dependencies.get(source).add(target);
    };
    for (var _h = 0, _j = (_b = input.relationships) !== null && _b !== void 0 ? _b : []; _h < _j.length; _h++) {
        var relationship = _j[_h];
        addDependency(targetForEntity(relationship.fromEntity), targetForEntity(relationship.toEntity));
    }
    for (var _k = 0, _l = input.tablePlans; _k < _l.length; _k++) {
        var table = _l[_k];
        var source = "table:".concat(table.tableId);
        for (var _m = 0, _o = table.columns; _m < _o.length; _m++) {
            var column = _o[_m];
            if (!/_id$/iu.test(column.name) || table.primaryKey.includes(column.name))
                continue;
            addDependency(source, targetByForeignKey.get(normalizedIdentifier(foreignKeyTargetName(column.name))));
        }
    }
    var sequence = 0;
    var index = new Map();
    var lowlink = new Map();
    var stack = [];
    var onStack = new Set();
    var components = [];
    var visit = function (nodeId) {
        index.set(nodeId, sequence);
        lowlink.set(nodeId, sequence++);
        stack.push(nodeId);
        onStack.add(nodeId);
        for (var _i = 0, _a = __spreadArray([], dependencies.get(nodeId), true).sort(); _i < _a.length; _i++) {
            var dependency = _a[_i];
            if (!index.has(dependency)) {
                visit(dependency);
                lowlink.set(nodeId, Math.min(lowlink.get(nodeId), lowlink.get(dependency)));
            }
            else if (onStack.has(dependency)) {
                lowlink.set(nodeId, Math.min(lowlink.get(nodeId), index.get(dependency)));
            }
        }
        if (lowlink.get(nodeId) !== index.get(nodeId))
            return;
        var component = [];
        for (;;) {
            var member = stack.pop();
            onStack.delete(member);
            component.push(member);
            if (member === nodeId)
                break;
        }
        components.push(component.sort());
    };
    for (var _p = 0, _q = __spreadArray([], nodes.keys(), true).sort(); _p < _q.length; _p++) {
        var nodeId = _q[_p];
        if (!index.has(nodeId))
            visit(nodeId);
    }
    var componentOf = new Map();
    components.forEach(function (component, componentIndex) { return component.forEach(function (nodeId) { return componentOf.set(nodeId, componentIndex); }); });
    var componentDependencies = components.map(function () { return new Set(); });
    components.forEach(function (component, componentIndex) {
        for (var _i = 0, component_1 = component; _i < component_1.length; _i++) {
            var nodeId = component_1[_i];
            for (var _a = 0, _b = dependencies.get(nodeId); _a < _b.length; _a++) {
                var dependency = _b[_a];
                var dependencyComponent = componentOf.get(dependency);
                if (dependencyComponent !== componentIndex)
                    componentDependencies[componentIndex].add(dependencyComponent);
            }
        }
    });
    var levels = new Map();
    var levelOf = function (componentIndex) {
        var cached = levels.get(componentIndex);
        if (cached !== undefined)
            return cached;
        var ownLevel = Math.max.apply(Math, components[componentIndex].map(function (nodeId) { return nodes.get(nodeId).baseLevel; }));
        var dependencyLevel = Math.max.apply(Math, __spreadArray([-1], __spreadArray([], componentDependencies[componentIndex], true).map(function (dependency) { return levelOf(dependency) + 1; }), false));
        var level = Math.max(ownLevel, dependencyLevel);
        levels.set(componentIndex, level);
        return level;
    };
    var byLevel = new Map();
    components.forEach(function (component, componentIndex) {
        var _a;
        var level = levelOf(componentIndex);
        var wave = (_a = byLevel.get(level)) !== null && _a !== void 0 ? _a : [];
        wave.push.apply(wave, component.map(function (nodeId) { return nodes.get(nodeId); }));
        byLevel.set(level, wave);
    });
    return __spreadArray([], byLevel.entries(), true).sort(function (_a, _b) {
        var left = _a[0];
        var right = _b[0];
        return left - right;
    }).map(function (_a) {
        var level = _a[0], wave = _a[1];
        return ({
            index: level + 1,
            tableIds: wave.filter(function (node) { return node.type === 'table'; }).map(function (node) { return node.subjectId; }).sort(),
            mdmEntityIds: wave.filter(function (node) { return node.type === 'mdm'; }).map(function (node) { return node.subjectId; }).sort(),
        });
    });
}
/** Keeps a wave under the output budget by assigning whole dependency components to sequential
 * batches. An SCC is never split, so references inside a planning wave remain valid. */
function splitSeedPlanningWave(input, wave, maxTokens) {
    var _a, _b;
    if (maxTokens === void 0) { maxTokens = exports.MAX_SEED_WAVE_OUTPUT_TOKENS; }
    var entities = new Map(input.entities.map(function (entity) { return [entity.entityId, entity]; }));
    var tables = new Map(input.tablePlans.map(function (table) { return [table.tableId, table]; }));
    var targets = __spreadArray(__spreadArray([], wave.mdmEntityIds.map(function (id) { return ({ type: 'mdm', id: id }); }), true), wave.tableIds.map(function (id) { return ({ type: 'table', id: id }); }), true).sort(function (left, right) { return "".concat(left.type, ":").concat(left.id).localeCompare("".concat(right.type, ":").concat(right.id)); });
    var estimate = function (target) {
        var _a, _b, _c, _d;
        var fields = (_b = (_a = entities.get(target.id)) === null || _a === void 0 ? void 0 : _a.fields.length) !== null && _b !== void 0 ? _b : 0;
        var columns = (_d = (_c = tables.get(target.id)) === null || _c === void 0 ? void 0 : _c.columns.length) !== null && _d !== void 0 ? _d : 0;
        var rows = target.type === 'mdm' ? 4 : 3;
        return Math.max(300, rows * (120 + (fields + columns) * 36));
    };
    var targetKeys = new Set(targets.map(function (target) { return "".concat(target.type, ":").concat(target.id); }));
    var targetForEntity = function (entityId) {
        var _a;
        var type = ((_a = entities.get(entityId)) === null || _a === void 0 ? void 0 : _a.kind) === 'mdm' ? 'mdm' : 'table';
        var key = "".concat(type, ":").concat(entityId);
        return targetKeys.has(key) ? key : undefined;
    };
    var parent = new Map(__spreadArray([], targetKeys, true).map(function (key) { return [key, key]; }));
    var find = function (key) {
        var root = parent.get(key);
        if (root === key)
            return root;
        var resolved = find(root);
        parent.set(key, resolved);
        return resolved;
    };
    var join = function (left, right) {
        if (!left || !right)
            return;
        var leftRoot = find(left);
        var rightRoot = find(right);
        if (leftRoot !== rightRoot)
            parent.set(rightRoot, leftRoot);
    };
    for (var _i = 0, _c = (_a = input.relationships) !== null && _a !== void 0 ? _a : []; _i < _c.length; _i++) {
        var relationship = _c[_i];
        join(targetForEntity(relationship.fromEntity), targetForEntity(relationship.toEntity));
    }
    var foreignKeyTargets = new Map(targets.map(function (target) { return [normalizedIdentifier(target.id), "".concat(target.type, ":").concat(target.id)]; }));
    for (var _d = 0, _e = input.tablePlans; _d < _e.length; _d++) {
        var table = _e[_d];
        var source = "table:".concat(table.tableId);
        if (!targetKeys.has(source))
            continue;
        for (var _f = 0, _g = table.columns; _f < _g.length; _f++) {
            var column = _g[_f];
            if (/_id$/iu.test(column.name) && !table.primaryKey.includes(column.name)) {
                join(source, foreignKeyTargets.get(normalizedIdentifier(foreignKeyTargetName(column.name))));
            }
        }
    }
    var components = new Map();
    for (var _h = 0, targets_1 = targets; _h < targets_1.length; _h++) {
        var target = targets_1[_h];
        var root = find("".concat(target.type, ":").concat(target.id));
        var component = (_b = components.get(root)) !== null && _b !== void 0 ? _b : [];
        component.push(target);
        components.set(root, component);
    }
    var units = __spreadArray([], components.values(), true).sort(function (left, right) {
        return "".concat(left[0].type, ":").concat(left[0].id).localeCompare("".concat(right[0].type, ":").concat(right[0].id));
    });
    var batches = [];
    var batch = [];
    var used = 0;
    for (var _j = 0, units_1 = units; _j < units_1.length; _j++) {
        var unit = units_1[_j];
        var cost = unit.reduce(function (total, target) { return total + estimate(target); }, 0);
        if (batch.length && used + cost > maxTokens) {
            batches.push(batch);
            batch = [];
            used = 0;
        }
        batch.push.apply(batch, unit);
        used += cost;
    }
    if (batch.length)
        batches.push(batch);
    return batches.map(function (items) { return ({
        index: wave.index,
        tableIds: items.filter(function (item) { return item.type === 'table'; }).map(function (item) { return item.id; }),
        mdmEntityIds: items.filter(function (item) { return item.type === 'mdm'; }).map(function (item) { return item.id; }),
    }); });
}
function estimateSeedPlanningWaveTokens(input, wave) {
    return splitSeedPlanningWave(input, wave, Number.MAX_SAFE_INTEGER)
        .flatMap(function (batch) { return __spreadArray(__spreadArray([], batch.tableIds, true), batch.mdmEntityIds, true); })
        .reduce(function (total, id) {
        var _a, _b;
        var entity = input.entities.find(function (item) { return item.entityId === id; });
        var table = input.tablePlans.find(function (item) { return item.tableId === id; });
        var rows = (entity === null || entity === void 0 ? void 0 : entity.kind) === 'mdm' ? 4 : 3;
        return total + Math.max(300, rows * (120 + (((_a = entity === null || entity === void 0 ? void 0 : entity.fields.length) !== null && _a !== void 0 ? _a : 0) + ((_b = table === null || table === void 0 ? void 0 : table.columns.length) !== null && _b !== void 0 ? _b : 0)) * 36));
    }, 0);
}
/** Selects exactly the L4/table definitions that a wave may create. Rules and relationships are
 * filtered too, so unrelated definitions never inflate the planner context. */
function seedPlanInputForWave(input, wave) {
    var _a, _b;
    var targetIds = new Set(__spreadArray(__spreadArray([], wave.tableIds, true), wave.mdmEntityIds, true));
    var tableIds = new Set(wave.tableIds);
    var entities = input.entities.filter(function (entity) { return targetIds.has(entity.entityId); });
    var rules = (_a = input.rules) === null || _a === void 0 ? void 0 : _a.filter(function (rule) { return !rule.appliesTo.length || rule.appliesTo.some(function (id) { return targetIds.has(id); }); });
    return __assign(__assign({}, input), { entities: entities, tablePlans: input.tablePlans.filter(function (table) { return tableIds.has(table.tableId); }), relationships: ((_b = input.relationships) !== null && _b !== void 0 ? _b : []).filter(function (rel) { return targetIds.has(rel.fromEntity) || targetIds.has(rel.toEntity); }), rules: rules, ruleIds: (rules !== null && rules !== void 0 ? rules : []).map(function (rule) { return rule.ruleId; }) });
}
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function stringValue(value) {
    return typeof value === 'string' ? value : '';
}
function arrayValue(value) {
    return Array.isArray(value) ? value : [];
}
function isSeedReference(value) {
    return isRecord(value) && typeof value.ref === 'string' && Object.keys(value).length === 1;
}
function isSeedAssetRef(value) {
    return isRecord(value) && value.kind === 'image' && typeof value.asset === 'string'
        && Object.keys(value).length === 2;
}
function isSeedValue(value) {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        || isSeedReference(value) || isSeedAssetRef(value);
}
function parseFields(value) {
    return arrayValue(value).map(function (item) {
        var record = isRecord(item) ? item : {};
        return { name: stringValue(record.name), value: isSeedValue(record.value) ? record.value : '' };
    });
}
function parseChildren(value) {
    return arrayValue(value).map(function (item) {
        var record = isRecord(item) ? item : {};
        return {
            name: stringValue(record.name),
            rows: arrayValue(record.rows).map(function (row) {
                var parsed = isRecord(row) ? row : {};
                return { key: stringValue(parsed.key), fields: parseFields(parsed.fields) };
            }),
        };
    });
}
function parsePlanRows(value) {
    return arrayValue(value).map(function (item) {
        var record = isRecord(item) ? item : {};
        return {
            key: stringValue(record.key),
            columns: parseFields(record.columns),
            details: parseFields(record.details),
            children: parseChildren(record.children),
        };
    });
}
/** Turns a tool-call result into a defensive internal representation. Validation below remains the
 * authority: malformed values become empty and produce objective findings instead of being trusted. */
function parseSeedPlan(value) {
    var record = isRecord(value) ? value : {};
    return {
        summary: stringValue(record.summary),
        localTables: arrayValue(record.localTables).map(function (item) {
            var parsed = isRecord(item) ? item : {};
            return { tableId: stringValue(parsed.tableId), rows: parsePlanRows(parsed.rows) };
        }),
        mdmEntities: arrayValue(record.mdmEntities).map(function (item) {
            var parsed = isRecord(item) ? item : {};
            return {
                entityId: stringValue(parsed.entityId),
                rows: arrayValue(parsed.rows).map(function (row) {
                    var rowRecord = isRecord(row) ? row : {};
                    return {
                        key: stringValue(rowRecord.key),
                        fields: parseFields(rowRecord.fields),
                        relationships: arrayValue(rowRecord.relationships).map(function (relationship) {
                            var relationshipRecord = isRecord(relationship) ? relationship : {};
                            return {
                                targetRef: stringValue(relationshipRecord.targetRef),
                                type: stringValue(relationshipRecord.type),
                                metadata: parseFields(relationshipRecord.metadata),
                                isBidirectional: relationshipRecord.isBidirectional === true,
                            };
                        }),
                    };
                }),
            };
        }),
    };
}
/** Reads the persisted plan embedded in seeds.ts. A valid plan is reused so materializing the same
 * L4/table input never asks the model for a different fixture mass. */
function extractSeedPlanFromSource(source) {
    var progress = extractSeedPlanProgressFromSource(source);
    return progress && !progress.partial ? progress.plan : null;
}
/** Reads either a completed or interrupted seed run from the persisted envelope. */
function extractSeedPlanProgressFromSource(source) {
    var start = source.indexOf(exports.SEED_PLAN_START);
    var end = source.indexOf(exports.SEED_PLAN_END);
    if (start === -1 || end === -1 || end <= start)
        return null;
    try {
        var raw = source.slice(start + exports.SEED_PLAN_START.length, end).trim();
        var envelope = JSON.parse(raw);
        if (!isRecord(envelope.plan))
            return null;
        return {
            plan: parseSeedPlan(envelope.plan),
            partial: envelope.partial === true,
            completedWaveIndexes: arrayValue(envelope.completedWaveIndexes)
                .filter(function (value) { return typeof value === 'number' && Number.isInteger(value) && value > 0; })
                .sort(function (left, right) { return left - right; }),
        };
    }
    catch (_a) {
        return null;
    }
}
/** A partial seeds.ts remains valid TypeScript so an interrupted flow can be resumed without
 * re-planning completed waves. It intentionally exports no runtime rows until final compilation. */
function buildPartialSeedSource(input, progress) {
    var envelope = {
        version: 1,
        moduleName: input.moduleName,
        language: input.language,
        partial: true,
        completedWaveIndexes: __spreadArray([], new Set(progress.completedWaveIndexes), true).sort(function (left, right) { return left - right; }),
        plan: progress.plan,
    };
    return [
        "/// <mls fileReference=\"_".concat(input.project, "_/l1/").concat(input.moduleName, "/layer_1_external/adapters/persistence/seeds.ts\" enhancement=\"_blank\"/>"),
        '',
        '// Partial deterministic seed plan. agentCbSeeds resumes it before this module is registered.',
        exports.SEED_PLAN_START,
        JSON.stringify(envelope, null, 2),
        exports.SEED_PLAN_END,
        '',
        'export {};',
        '',
    ].join('\n');
}
function mergeSeedPlans(current, next) {
    var merge = function (items, additions, key) {
        var byId = new Map(items.map(function (item) { return [String(item[key] || ''), item]; }));
        for (var _i = 0, additions_1 = additions; _i < additions_1.length; _i++) {
            var item = additions_1[_i];
            byId.set(String(item[key] || ''), item);
        }
        return __spreadArray([], byId.values(), true).sort(function (left, right) { return String(left[key] || '').localeCompare(String(right[key] || '')); });
    };
    return {
        summary: next.summary.trim() || current.summary,
        localTables: merge(current.localTables, next.localTables, 'tableId'),
        mdmEntities: merge(current.mdmEntities, next.mdmEntities, 'entityId'),
    };
}
function seedReferenceCatalog(plan) {
    var labelOf = function (fields, fallback) {
        var readable = fields.find(function (field) { return field.name === 'name' || field.name === 'label'; });
        return typeof (readable === null || readable === void 0 ? void 0 : readable.value) === 'string' && readable.value.trim() ? readable.value : fallback;
    };
    return __spreadArray(__spreadArray([], plan.localTables.flatMap(function (table) { return table.rows.map(function (row) { return ({
        ref: "local:".concat(table.tableId, ".").concat(row.key),
        label: labelOf(row.details, row.key),
        context: "local row in ".concat(table.tableId),
    }); }); }), true), plan.mdmEntities.flatMap(function (entity) { return entity.rows.map(function (row) { return ({
        ref: "mdm:".concat(entity.entityId, ".").concat(row.key),
        label: labelOf(row.fields, row.key),
        context: "MDM ".concat(entity.entityId),
    }); }); }), true).sort(function (left, right) { return left.ref.localeCompare(right.ref); });
}
function toSnake(value) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
}
function toCamel(value) {
    return value.replace(/_([a-z0-9])/g, function (_all, char) { return char.toUpperCase(); });
}
function hashHex(input) {
    var hash = 0x811c9dc5;
    for (var index = 0; index < input.length; index++) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
function stableUuid(input) {
    var parts = Array.from({ length: 5 }, function (_, index) { return hashHex("".concat(input, ":").concat(index)); }).join('');
    return "".concat(parts.slice(0, 8), "-").concat(parts.slice(8, 12), "-4").concat(parts.slice(13, 16), "-8").concat(parts.slice(17, 20), "-").concat(parts.slice(20, 32));
}
function entityIdField(entity) {
    var _a;
    return ((_a = entity.fields.find(function (field) { return field.fieldId.toLowerCase() === "".concat(entity.entityId.toLowerCase(), "id"); })) === null || _a === void 0 ? void 0 : _a.fieldId) || "".concat(entity.entityId.charAt(0).toLowerCase()).concat(entity.entityId.slice(1), "Id");
}
function mdmSubtypeFor(entityId) {
    var lower = entityId.toLowerCase();
    if (lower.includes('table') || lower.includes('location') || lower.includes('room'))
        return 'Location';
    if (lower.includes('customer') || lower.includes('person') || lower.includes('user'))
        return 'Person';
    if (lower.includes('company') || lower.includes('supplier') || lower.includes('vendor'))
        return 'Company';
    if (lower.includes('service'))
        return 'Service';
    if (lower.includes('asset') || lower.includes('equipment'))
        return 'AssetEquipment';
    return 'Product';
}
function countryCodeForLanguage(language) {
    return language.toLowerCase().startsWith('pt') ? 'BR' : 'US';
}
function mapFields(fields, path, errors) {
    var mapped = new Map();
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var field = fields_1[_i];
        if (!field.name) {
            errors.push("".concat(path, ": field name is required"));
            continue;
        }
        if (mapped.has(field.name)) {
            errors.push("".concat(path, ": duplicated field '").concat(field.name, "'"));
            continue;
        }
        if (!isSeedValue(field.value)) {
            errors.push("".concat(path, ".").concat(field.name, ": value must be a scalar, null, { ref }, or { asset, kind: 'image' }"));
            continue;
        }
        mapped.set(field.name, field.value);
    }
    return mapped;
}
// How many platform-user identities to synthesize per actor. A small pool lets a scenario assign a
// few distinct people (e.g. several field workers) without the planner declaring or the compiler
// hardcoding any of them.
var ACTOR_IDENTITY_COUNT = 3;
/** Deterministic platform-user identity pool derived from the L4 actors. Single source of truth for
 * the reference set, the id map and the emitted MDM Person records, so `actor:<actorId>.<key>`
 * references always resolve to a real MDM identity. */
function actorIdentities(input) {
    var _a;
    var identities = [];
    for (var _i = 0, _b = (_a = input.actors) !== null && _a !== void 0 ? _a : []; _i < _b.length; _i++) {
        var actor = _b[_i];
        if (!actor.actorId.trim())
            continue;
        for (var index = 1; index <= ACTOR_IDENTITY_COUNT; index++) {
            var key = "u".concat(index);
            identities.push({
                actorId: actor.actorId,
                key: key,
                ref: "actor:".concat(actor.actorId, ".").concat(key),
                name: "".concat(actor.title || actor.actorId, " ").concat(index),
                mdmId: stableUuid("".concat(input.moduleName, ":actor:").concat(actor.actorId, ":").concat(key)),
            });
        }
    }
    return identities;
}
function collectReferences(plan) {
    var refs = new Set();
    for (var _i = 0, _a = plan.localTables; _i < _a.length; _i++) {
        var table = _a[_i];
        for (var _b = 0, _c = table.rows; _b < _c.length; _b++) {
            var row = _c[_b];
            refs.add("local:".concat(table.tableId, ".").concat(row.key));
        }
    }
    for (var _d = 0, _e = plan.mdmEntities; _d < _e.length; _d++) {
        var entity = _e[_d];
        for (var _f = 0, _g = entity.rows; _f < _g.length; _f++) {
            var row = _g[_f];
            refs.add("mdm:".concat(entity.entityId, ".").concat(row.key));
        }
    }
    return refs;
}
function validateReference(value, path, references, errors) {
    if (!isSeedReference(value))
        return;
    if (!/^(local|mdm|actor):[A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_-]*$/u.test(value.ref)) {
        errors.push("".concat(path, ": reference '").concat(value.ref, "' must use local:Entity.key, mdm:Entity.key or actor:ActorId.key"));
    }
    else if (!references.has(value.ref)) {
        errors.push("".concat(path, ": unresolved reference '").concat(value.ref, "'"));
    }
}
function validateEnum(field, value, path, errors) {
    if (!(field === null || field === void 0 ? void 0 : field.enumValues.length) || value === undefined)
        return;
    if (isSeedAssetRef(value))
        return;
    if (isSeedReference(value) || typeof value !== 'string' || !field.enumValues.includes(value)) {
        errors.push("".concat(path, ": expected one of ").concat(field.enumValues.join(', ')));
    }
}
function isImageOrUrlField(field) {
    if (!field || /Id$/u.test(field.fieldId))
        return false;
    return /(?:image|photo|avatar|thumbnail|cover).*(?:url|uri)?$/iu.test(field.fieldId)
        || /(?:image|url|uri)/iu.test(field.type);
}
function validateAssetReference(value, field, path, errors) {
    if (!isSeedAssetRef(value))
        return;
    if (!/^[A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*$/u.test(value.asset)) {
        errors.push("".concat(path, ": asset must use EntityId/seedKey"));
    }
    if (!isImageOrUrlField(field)) {
        errors.push("".concat(path, ": seed asset references are allowed only in declared image or URL fields"));
    }
}
var ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
function windowOf(input) {
    var _a;
    return (_a = input.timeWindow) !== null && _a !== void 0 ? _a : { start: exports.SEED_WINDOW_START, end: exports.SEED_WINDOW_END };
}
// Timestamps stay deterministic (a fixed, bounded window) without collapsing the scenario onto two
// instants: any ISO 8601 UTC value inside the window is accepted, so a plan can model a coherent
// multi-step timeline. Domain rule conformance (status flows, etc.) is NOT enforced here — it is
// guided by the L4 rule text in the planner prompt, keeping this compiler domain-agnostic.
function validateTimestamp(window, fieldName, value, path, errors) {
    if (value === undefined || value === null || !/(At|Date)$/u.test(fieldName))
        return;
    if (typeof value !== 'string' || !ISO_TIMESTAMP.test(value)) {
        errors.push("".concat(path, ": timestamp must be an ISO 8601 UTC string (yyyy-mm-ddThh:mm:ss(.sss)Z)"));
        return;
    }
    var instant = Date.parse(value);
    var start = Date.parse(window.start);
    var end = Date.parse(window.end);
    if (Number.isNaN(instant) || instant < start || instant > end) {
        errors.push("".concat(path, ": timestamp must fall within ").concat(window.start, "..").concat(window.end));
    }
}
function hasKey(value) {
    return /^[A-Za-z][A-Za-z0-9_-]*$/u.test(value);
}
// NOTE: domain-specific scenario invariants used to live here — hardcoded to the cafeFlow example
// (Shift/Order/MenuItem/StockConsumption names, the registered→…→delivered status flow, and the
// invented "requires-ingredient" relationship type). They were removed because this generator is
// generic across client modules (a petshop has none of those names). Rule conformance is now guided
// by the L4 rule text in the planner prompt; structural correctness (enums, references, required
// fields, timestamp window) is validated generically above. The one cross-cutting convention that
// still lacks a single source of truth — the MDM relationship TYPE the runtime usecases read — should
// be declared in L4 and shared with the usecase generator, not reintroduced here.
/** Deterministic validation of the plan before any seed source is saved. */
function validateSeedPlan(input, knownReferences) {
    var _a, _b;
    if (knownReferences === void 0) { knownReferences = []; }
    var errors = [];
    var tableById = new Map(input.tablePlans.map(function (table) { return [table.tableId, table]; }));
    var entityById = new Map(input.entities.map(function (entity) { return [entity.entityId, entity]; }));
    var references = collectReferences(input.plan);
    for (var _i = 0, knownReferences_1 = knownReferences; _i < knownReferences_1.length; _i++) {
        var ref = knownReferences_1[_i];
        references.add(ref);
    }
    for (var _c = 0, _d = actorIdentities(input); _c < _d.length; _c++) {
        var identity = _d[_c];
        references.add(identity.ref);
    }
    var window = windowOf(input);
    var seenLocalTables = new Set();
    var seenMdmEntities = new Set();
    if (!input.plan.summary.trim())
        errors.push('plan.summary is required');
    for (var _e = 0, _f = input.plan.localTables; _e < _f.length; _e++) {
        var table = _f[_e];
        var path = "localTables.".concat(table.tableId || '<missing>');
        var definition = tableById.get(table.tableId);
        if (!definition) {
            errors.push("".concat(path, ": unknown tableId"));
            continue;
        }
        if (seenLocalTables.has(table.tableId))
            errors.push("".concat(path, ": duplicated table plan"));
        seenLocalTables.add(table.tableId);
        if (!table.rows.length)
            errors.push("".concat(path, ": at least one row is required"));
        var keys = new Set();
        var entity = entityById.get(table.tableId);
        var entityFields = new Map(((_a = entity === null || entity === void 0 ? void 0 : entity.fields) !== null && _a !== void 0 ? _a : []).map(function (field) { return [field.fieldId, field]; }));
        var columnNames = new Set(definition.columns.map(function (column) { return column.name; }));
        for (var _g = 0, _h = table.rows; _g < _h.length; _g++) {
            var row = _h[_g];
            var rowPath = "".concat(path, ".").concat(row.key || '<missing>');
            if (!hasKey(row.key))
                errors.push("".concat(rowPath, ": key must be a stable identifier"));
            if (keys.has(row.key))
                errors.push("".concat(rowPath, ": duplicate key"));
            keys.add(row.key);
            var columns = mapFields(row.columns, "".concat(rowPath, ".columns"), errors);
            var details = mapFields(row.details, "".concat(rowPath, ".details"), errors);
            for (var _j = 0, _k = columns.keys(); _j < _k.length; _j++) {
                var name_1 = _k[_j];
                if (name_1 === 'details' || !columnNames.has(name_1))
                    errors.push("".concat(rowPath, ".columns.").concat(name_1, ": unknown persistence column"));
            }
            for (var _l = 0, _m = details.keys(); _l < _m.length; _l++) {
                var name_2 = _m[_l];
                if (name_2 !== 'label' && !entityFields.has(name_2))
                    errors.push("".concat(rowPath, ".details.").concat(name_2, ": unknown entity field"));
            }
            for (var _o = 0, _p = definition.columns; _o < _p.length; _o++) {
                var column = _p[_o];
                if (definition.primaryKey.includes(column.name))
                    continue; // generated from tableId + row key
                if (column.name === 'details') {
                    if (!column.nullable && details.size === 0 && row.children.length === 0)
                        errors.push("".concat(rowPath, ": details are required"));
                    continue;
                }
                var value = columns.get(column.name);
                if (!column.nullable && value === undefined)
                    errors.push("".concat(rowPath, ".columns.").concat(column.name, ": required column missing"));
                validateReference(value, "".concat(rowPath, ".columns.").concat(column.name), references, errors);
                validateTimestamp(window, toCamel(column.name), value, "".concat(rowPath, ".columns.").concat(column.name), errors);
                var field = entityFields.get(toCamel(column.name));
                validateEnum(field, value, "".concat(rowPath, ".columns.").concat(column.name), errors);
                validateAssetReference(value, field, "".concat(rowPath, ".columns.").concat(column.name), errors);
                if (column.name.endsWith('_id') && !definition.primaryKey.includes(column.name) && value !== undefined && !isSeedReference(value)) {
                    errors.push("".concat(rowPath, ".columns.").concat(column.name, ": foreign keys must use a symbolic { ref }"));
                }
            }
            for (var _q = 0, _r = (_b = entity === null || entity === void 0 ? void 0 : entity.fields) !== null && _b !== void 0 ? _b : []; _q < _r.length; _q++) {
                var field = _r[_q];
                var mappedColumn = toSnake(field.fieldId);
                var storedAsColumn = columnNames.has(mappedColumn);
                var generatedPrimaryKey = definition.primaryKey.includes(mappedColumn);
                var value = storedAsColumn ? columns.get(mappedColumn) : details.get(field.fieldId);
                if (field.required && !generatedPrimaryKey && value === undefined)
                    errors.push("".concat(rowPath, ": required field '").concat(field.fieldId, "' missing"));
                validateReference(value, "".concat(rowPath, ".").concat(field.fieldId), references, errors);
                validateTimestamp(window, field.fieldId, value, "".concat(rowPath, ".").concat(field.fieldId), errors);
                validateEnum(field, value, "".concat(rowPath, ".").concat(field.fieldId), errors);
                validateAssetReference(value, field, "".concat(rowPath, ".").concat(field.fieldId), errors);
                if (field.fieldId.endsWith('Id') && !generatedPrimaryKey && value !== undefined && !isSeedReference(value)) {
                    errors.push("".concat(rowPath, ".").concat(field.fieldId, ": entity references must use a symbolic { ref }"));
                }
            }
            for (var _s = 0, _t = row.children; _s < _t.length; _s++) {
                var child = _t[_s];
                if (!hasKey(child.name))
                    errors.push("".concat(rowPath, ".children: child collection name must be a stable identifier"));
                var childKeys = new Set();
                for (var _u = 0, _v = child.rows; _u < _v.length; _u++) {
                    var childRow = _v[_u];
                    if (!hasKey(childRow.key))
                        errors.push("".concat(rowPath, ".children.").concat(child.name, ": child row key must be a stable identifier"));
                    if (childKeys.has(childRow.key))
                        errors.push("".concat(rowPath, ".children.").concat(child.name, ".").concat(childRow.key, ": duplicate child key"));
                    childKeys.add(childRow.key);
                    var fields = mapFields(childRow.fields, "".concat(rowPath, ".children.").concat(child.name, ".").concat(childRow.key), errors);
                    for (var _w = 0, fields_2 = fields; _w < fields_2.length; _w++) {
                        var _x = fields_2[_w], name_3 = _x[0], value = _x[1];
                        validateReference(value, "".concat(rowPath, ".children.").concat(child.name, ".").concat(childRow.key, ".").concat(name_3), references, errors);
                        validateTimestamp(window, name_3, value, "".concat(rowPath, ".children.").concat(child.name, ".").concat(childRow.key, ".").concat(name_3), errors);
                        if (isSeedAssetRef(value))
                            errors.push("".concat(rowPath, ".children.").concat(child.name, ".").concat(childRow.key, ".").concat(name_3, ": seed asset references require a declared image or URL field"));
                    }
                }
            }
        }
    }
    for (var _y = 0, _z = input.tablePlans; _y < _z.length; _y++) {
        var table = _z[_y];
        if (!seenLocalTables.has(table.tableId))
            errors.push("localTables: missing plan for persistence table '".concat(table.tableId, "'"));
    }
    for (var _0 = 0, _1 = input.plan.mdmEntities; _0 < _1.length; _0++) {
        var mdmEntity = _1[_0];
        var path = "mdmEntities.".concat(mdmEntity.entityId || '<missing>');
        var definition = entityById.get(mdmEntity.entityId);
        if (!definition || definition.kind !== 'mdm') {
            errors.push("".concat(path, ": unknown or non-MDM entity"));
            continue;
        }
        if (seenMdmEntities.has(mdmEntity.entityId))
            errors.push("".concat(path, ": duplicated MDM entity plan"));
        seenMdmEntities.add(mdmEntity.entityId);
        if (!mdmEntity.rows.length)
            errors.push("".concat(path, ": at least one row is required"));
        var fieldsById = new Map(definition.fields.map(function (field) { return [field.fieldId, field]; }));
        var keys = new Set();
        for (var _2 = 0, _3 = mdmEntity.rows; _2 < _3.length; _2++) {
            var row = _3[_2];
            var rowPath = "".concat(path, ".").concat(row.key || '<missing>');
            if (!hasKey(row.key))
                errors.push("".concat(rowPath, ": key must be a stable identifier"));
            if (keys.has(row.key))
                errors.push("".concat(rowPath, ": duplicate key"));
            keys.add(row.key);
            var fields = mapFields(row.fields, "".concat(rowPath, ".fields"), errors);
            for (var _4 = 0, fields_3 = fields; _4 < fields_3.length; _4++) {
                var _5 = fields_3[_4], name_4 = _5[0], value = _5[1];
                var field = fieldsById.get(name_4);
                if (!field)
                    errors.push("".concat(rowPath, ".fields.").concat(name_4, ": unknown MDM entity field"));
                validateReference(value, "".concat(rowPath, ".fields.").concat(name_4), references, errors);
                validateTimestamp(window, name_4, value, "".concat(rowPath, ".fields.").concat(name_4), errors);
                validateEnum(field, value, "".concat(rowPath, ".fields.").concat(name_4), errors);
                validateAssetReference(value, field, "".concat(rowPath, ".fields.").concat(name_4), errors);
            }
            for (var _6 = 0, _7 = definition.fields; _6 < _7.length; _6++) {
                var field = _7[_6];
                var automaticId = field.fieldId === entityIdField(definition);
                if (field.required && !automaticId && fields.get(field.fieldId) === undefined)
                    errors.push("".concat(rowPath, ": required field '").concat(field.fieldId, "' missing"));
                var value = fields.get(field.fieldId);
                if (field.fieldId.endsWith('Id') && !automaticId && value !== undefined && !isSeedReference(value)) {
                    errors.push("".concat(rowPath, ".").concat(field.fieldId, ": MDM references must use a symbolic { ref }"));
                }
            }
            var name_5 = fields.get('name');
            if (typeof name_5 !== 'string' || !name_5.trim())
                errors.push("".concat(rowPath, ": MDM rows require a readable name"));
            for (var _8 = 0, _9 = row.relationships; _8 < _9.length; _8++) {
                var relationship = _9[_8];
                var relationshipPath = "".concat(rowPath, ".relationships.").concat(relationship.type || '<missing>');
                if (!relationship.type.trim())
                    errors.push("".concat(relationshipPath, ": type is required"));
                if (!/^mdm:[A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_-]*$/u.test(relationship.targetRef) || !references.has(relationship.targetRef)) {
                    errors.push("".concat(relationshipPath, ": targetRef '").concat(relationship.targetRef, "' must resolve to an MDM row"));
                }
                var metadata = mapFields(relationship.metadata, "".concat(relationshipPath, ".metadata"), errors);
                for (var _10 = 0, metadata_1 = metadata; _10 < metadata_1.length; _10++) {
                    var _11 = metadata_1[_10], name_6 = _11[0], value = _11[1];
                    validateReference(value, "".concat(relationshipPath, ".metadata.").concat(name_6), references, errors);
                    if (isSeedAssetRef(value))
                        errors.push("".concat(relationshipPath, ".metadata.").concat(name_6, ": seed asset references require a declared image or URL field"));
                }
            }
        }
    }
    for (var _12 = 0, _13 = input.entities.filter(function (entity) { return entity.kind === 'mdm'; }); _12 < _13.length; _12++) {
        var entity = _13[_12];
        if (!seenMdmEntities.has(entity.entityId))
            errors.push("mdmEntities: missing plan for '".concat(entity.entityId, "'"));
    }
    return __spreadArray([], new Set(errors), true);
}
function resolveValue(value, ids) {
    var _a;
    if (isSeedAssetRef(value))
        return { __agentCbSeedAsset: value.asset };
    if (!isSeedReference(value))
        return value;
    return (_a = ids.get(value.ref)) !== null && _a !== void 0 ? _a : value.ref;
}
function seedSourceLiteral(value) {
    return JSON.stringify(value, null, 2).replace(/\{\s*"__agentCbSeedAsset"\s*:\s*"([A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*)"\s*\}/gu, function (_match, assetId) { return "seedAssetUrl(".concat(JSON.stringify(assetId), ")"); });
}
function seedAssetUrlsBlock(urls, warnings) {
    if (warnings === void 0) { warnings = []; }
    var safeUrls = Object.fromEntries(Object.entries(urls)
        .filter(function (_a) {
        var asset = _a[0], url = _a[1];
        return /^[A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*$/u.test(asset) && typeof url === 'string' && url.startsWith('/');
    })
        .sort(function (_a, _b) {
        var left = _a[0];
        var right = _b[0];
        return left.localeCompare(right);
    }));
    return [
        exports.SEED_ASSET_URLS_START,
        "const seedAssetUrls: Record<string, string> = ".concat(JSON.stringify(safeUrls, null, 2), ";"),
        "const seedAssetWarnings: string[] = ".concat(JSON.stringify(__spreadArray([], new Set(warnings), true).sort(), null, 2), ";"),
        exports.SEED_ASSET_URLS_END,
    ].join('\n');
}
function updateSeedAssetUrlsInSource(source, urls, warnings) {
    if (warnings === void 0) { warnings = []; }
    var start = source.indexOf(exports.SEED_ASSET_URLS_START);
    var end = source.indexOf(exports.SEED_ASSET_URLS_END);
    if (start < 0 || end < start)
        throw new Error('seed source has no asset URL block');
    var replacement = seedAssetUrlsBlock(urls, warnings);
    return "".concat(source.slice(0, start)).concat(replacement).concat(source.slice(end + exports.SEED_ASSET_URLS_END.length));
}
function resolveFields(fields, ids) {
    return Object.fromEntries(fields.map(function (field) { return [field.name, resolveValue(field.value, ids)]; }));
}
function planMap(items, key) {
    return new Map(items.map(function (item) { return [String(item[key] || ''), item]; }));
}
function idMap(input) {
    var ids = new Map();
    for (var _i = 0, _a = input.plan.localTables; _i < _a.length; _i++) {
        var table = _a[_i];
        for (var _b = 0, _c = table.rows; _b < _c.length; _b++) {
            var row = _c[_b];
            ids.set("local:".concat(table.tableId, ".").concat(row.key), stableUuid("".concat(input.moduleName, ":local:").concat(table.tableId, ":").concat(row.key)));
        }
    }
    for (var _d = 0, _e = input.plan.mdmEntities; _d < _e.length; _d++) {
        var entity = _e[_d];
        for (var _f = 0, _g = entity.rows; _f < _g.length; _f++) {
            var row = _g[_f];
            ids.set("mdm:".concat(entity.entityId, ".").concat(row.key), stableUuid("".concat(input.moduleName, ":mdm:").concat(entity.entityId, ":").concat(row.key)));
        }
    }
    for (var _h = 0, _j = actorIdentities(input); _h < _j.length; _h++) {
        var identity = _j[_h];
        ids.set(identity.ref, identity.mdmId);
    }
    return ids;
}
function buildLocalRows(input, ids) {
    var plannedTables = planMap(input.plan.localTables, 'tableId');
    return input.tablePlans.map(function (table) {
        var planned = plannedTables.get(table.tableId);
        return {
            exportName: "".concat(table.tableId.charAt(0).toLowerCase()).concat(table.tableId.slice(1), "Seeds"),
            seedFor: table.seedFor,
            rows: planned.rows.map(function (row) {
                var columns = resolveFields(row.columns, ids);
                var details = resolveFields(row.details, ids);
                for (var _i = 0, _a = row.children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    details[child.name] = child.rows.map(function (childRow) { return resolveFields(childRow.fields, ids); });
                }
                var out = {};
                for (var _b = 0, _c = table.columns; _b < _c.length; _b++) {
                    var column = _c[_b];
                    if (table.primaryKey.includes(column.name)) {
                        out[column.name] = table.primaryKey.length === 1
                            ? ids.get("local:".concat(table.tableId, ".").concat(row.key))
                            : stableUuid("".concat(input.moduleName, ":local:").concat(table.tableId, ":").concat(row.key, ":").concat(column.name));
                    }
                    else if (column.name === 'details') {
                        if (Object.keys(details).length)
                            out.details = details;
                    }
                    else {
                        out[column.name] = columns[column.name];
                    }
                }
                return out;
            }),
        };
    });
}
function buildMdmRows(input, ids) {
    var _a;
    var plannedEntities = planMap(input.plan.mdmEntities, 'entityId');
    var indexRows = [];
    var documentRows = [];
    var relationshipRows = [];
    for (var _i = 0, _b = input.entities.filter(function (entity) { return entity.kind === 'mdm'; }); _i < _b.length; _i++) {
        var entity = _b[_i];
        var planned = plannedEntities.get(entity.entityId);
        var idField = entityIdField(entity);
        for (var _c = 0, _d = planned.rows; _c < _d.length; _c++) {
            var row = _d[_c];
            var mdmId = ids.get("mdm:".concat(entity.entityId, ".").concat(row.key));
            var fields = resolveFields(row.fields, ids);
            fields[idField] = mdmId;
            var name_7 = String(fields.name);
            var subtype = mdmSubtypeFor(entity.entityId);
            // mdmFacade.listByType matches record.tags.includes('<moduleId>.<Type>') — the canonical tag
            // MUST be present as a single string or every seeded entity is invisible to the module reads.
            var tags = ["".concat(input.moduleName, ".").concat(entity.entityId), input.moduleName, entity.entityId];
            indexRows.push({
                mdmId: mdmId,
                subtype: subtype,
                name: name_7,
                status: 'Active', docType: null, docId: null,
                countryCode: countryCodeForLanguage(input.language),
                tags: tags,
                searchVector: "".concat(name_7, " ").concat(entity.entityId, " ").concat(input.moduleName).toLowerCase(), mergedInto: null,
                dynamoPk: mdmId, createdAt: fields.createdAt, updatedAt: fields.updatedAt,
            });
            var details = (_a = {
                    mdmId: mdmId,
                    subtype: subtype,
                    name: name_7,
                    status: 'Active', docType: null, docId: null,
                    countryCode: countryCodeForLanguage(input.language),
                    tags: tags,
                    aliases: [], contacts: [], relationshipRefs: {}, addresses: [], mergedInto: null,
                    createdAt: fields.createdAt, updatedAt: fields.updatedAt
                },
                _a[input.moduleName] = fields,
                _a);
            if (subtype === 'Location')
                details.locationType = 'DiningArea';
            if (subtype === 'Company') {
                details.companyKind = 'LegalEntity';
                details.legalName = name_7;
            }
            documentRows.push({ mdmId: mdmId, version: 1, details: details });
            for (var _e = 0, _f = row.relationships; _e < _f.length; _e++) {
                var relationship = _f[_e];
                relationshipRows.push({
                    id: stableUuid("".concat(input.moduleName, ":relationship:").concat(entity.entityId, ":").concat(row.key, ":").concat(relationship.type, ":").concat(relationship.targetRef)),
                    fromId: mdmId,
                    toId: ids.get(relationship.targetRef),
                    type: relationship.type,
                    role: null,
                    metadata: resolveFields(relationship.metadata, ids),
                    isBidirectional: relationship.isBidirectional,
                    validFrom: windowOf(input).start,
                    validTo: null,
                    status: 'Active',
                    createdAt: fields.createdAt,
                    updatedAt: fields.updatedAt,
                });
            }
        }
    }
    // Platform-user identities: emitted as MDM Person records so actor references (assignees,
    // actorSession-resolved worker fields) resolve to a real MDM identity at runtime. The module never
    // owns a user/rate table (see rule workerRateFromProfile) — these are the referenceable people.
    var window = windowOf(input);
    for (var _g = 0, _h = actorIdentities(input); _g < _h.length; _g++) {
        var identity = _h[_g];
        // Same canonical-tag contract as above: person identities must be listable by '<module>.Person'.
        var actorTags = ["".concat(input.moduleName, ".Person"), input.moduleName, 'actor', identity.actorId];
        indexRows.push({
            mdmId: identity.mdmId, subtype: 'Person', name: identity.name, status: 'Active', docType: null, docId: null,
            countryCode: countryCodeForLanguage(input.language), tags: actorTags,
            searchVector: "".concat(identity.name, " ").concat(identity.actorId, " ").concat(input.moduleName).toLowerCase(), mergedInto: null,
            dynamoPk: identity.mdmId, createdAt: window.start, updatedAt: window.start,
        });
        documentRows.push({
            mdmId: identity.mdmId, version: 1,
            details: {
                mdmId: identity.mdmId, subtype: 'Person', name: identity.name, status: 'Active', docType: null, docId: null,
                countryCode: countryCodeForLanguage(input.language), tags: actorTags,
                aliases: [], contacts: [], relationshipRefs: {}, addresses: [], mergedInto: null,
                createdAt: window.start, updatedAt: window.start, actorId: identity.actorId,
            },
        });
    }
    return [
        { exportName: 'mdmEntityIndexSeeds', seedFor: 'mdmEntityIndex', rows: indexRows },
        { exportName: 'mdmDocumentSeeds', seedFor: 'mdmDocumentCache', rows: documentRows },
        { exportName: 'mdmRelationshipSeeds', seedFor: 'mdmRelationship', rows: relationshipRows },
    ].filter(function (block) { return block.rows.length > 0; });
}
/** Compile a validated plan. IDs, relationship IDs and structural MDM records are always generated
 * locally; only the business scenario itself comes from the LLM plan. */
function buildSeedSource(input) {
    var errors = validateSeedPlan(input);
    var localSummary = input.plan.localTables.map(function (table) { return "".concat(table.tableId, "=").concat(table.rows.length); }).join(', ');
    var mdmSummary = input.plan.mdmEntities.map(function (entity) { return "".concat(entity.entityId, "=").concat(entity.rows.length); }).join(', ');
    var summary = "local [".concat(localSummary || 'none', "]; MDM [").concat(mdmSummary || 'none', "]");
    if (errors.length)
        return { errors: errors, summary: summary };
    var ids = idMap(input);
    var blocks = __spreadArray(__spreadArray([], buildLocalRows(input, ids), true), buildMdmRows(input, ids), true);
    var planEnvelope = { version: 1, moduleName: input.moduleName, language: input.language, plan: input.plan };
    var lines = __spreadArray([
        "/// <mls fileReference=\"_".concat(input.project, "_/l1/").concat(input.moduleName, "/layer_1_external/adapters/persistence/seeds.ts\" enhancement=\"_blank\"/>"),
        '',
        "// Deterministic initial data for ".concat(input.moduleName, ". Scenario planned by agentCbSeeds; rows and ids compiled locally."),
        '// TableSeedRows exports are discovered by shape and merged by the persistence registry.',
        '',
        exports.SEED_PLAN_START,
        JSON.stringify(planEnvelope, null, 2),
        exports.SEED_PLAN_END,
        '',
        seedAssetUrlsBlock({}, []),
        '',
        'function seedAssetUrl(assetId: string): string | null { return seedAssetUrls[assetId] ?? null; }',
        '',
        "import type { TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';",
        ''
    ], blocks.flatMap(function (block) { return [
        "export const ".concat(block.exportName, ": TableSeedRows = ").concat(seedSourceLiteral({ seedFor: block.seedFor, rows: block.rows }), ";"),
        '',
    ]; }), true);
    return { errors: [], content: lines.join('\n'), summary: summary };
}
function seedPlanPromptContext(input, repairFindings, options) {
    var _a, _b, _c, _d, _e;
    if (repairFindings === void 0) { repairFindings = []; }
    if (options === void 0) { options = {}; }
    var entities = input.entities.map(function (entity) { return ({
        entityId: entity.entityId,
        title: entity.title,
        kind: entity.kind,
        fields: entity.fields.map(function (field) { return ({ fieldId: field.fieldId, type: field.type, required: field.required, enum: field.enumValues }); }),
    }); });
    var tables = input.tablePlans.map(function (table) { return ({
        tableId: table.tableId,
        seedFor: table.seedFor,
        primaryKey: table.primaryKey,
        columns: table.columns,
    }); });
    // Carry each endpoint's kind so the planner can tell MDM<->MDM links (which become MDM row
    // relationships) apart from links that touch a non-MDM entity (which are seeded as a symbolic FK
    // on the non-MDM side). Display-only enrichment; the compiler/validator are unaffected.
    var kindOf = new Map(input.entities.map(function (entity) { return [entity.entityId, entity.kind]; }));
    var relationships = ((_a = input.relationships) !== null && _a !== void 0 ? _a : []).map(function (rel) {
        var _a, _b;
        return ({
            fromEntity: rel.fromEntity, fromKind: (_a = kindOf.get(rel.fromEntity)) !== null && _a !== void 0 ? _a : 'unknown',
            toEntity: rel.toEntity, toKind: (_b = kindOf.get(rel.toEntity)) !== null && _b !== void 0 ? _b : 'unknown',
            type: rel.type,
        });
    });
    var rules = (input.rules && input.rules.length)
        ? input.rules.map(function (rule) { return ({ ruleId: rule.ruleId, title: rule.title, description: rule.description, appliesTo: rule.appliesTo }); })
        : input.ruleIds.map(function (ruleId) { return ({ ruleId: ruleId }); });
    var timeWindow = (_b = input.timeWindow) !== null && _b !== void 0 ? _b : { start: exports.SEED_WINDOW_START, end: exports.SEED_WINDOW_END };
    // Pre-synthesized platform-user identities the planner can reference. These stand in for the
    // authenticated people (assignees, the actorSession worker on an event) — there is NO entity or
    // table to seed for them, so a worker/assignee FK must point at one of these refs.
    var actorIdentityRefs = actorIdentities(input).map(function (identity) { return ({ ref: identity.ref, name: identity.name, actorId: identity.actorId }); });
    var catalog = (_c = options.catalog) !== null && _c !== void 0 ? _c : [];
    var wave = (_d = options.wave) !== null && _d !== void 0 ? _d : { index: 1, tableIds: input.tablePlans.map(function (table) { return table.tableId; }), mdmEntityIds: input.entities.filter(function (entity) { return entity.kind === 'mdm'; }).map(function (entity) { return entity.entityId; }) };
    return __spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "## Module and language\n".concat(JSON.stringify({ moduleName: input.moduleName, language: input.language, timeWindow: timeWindow })),
        "## Planning wave\n".concat(JSON.stringify({ index: wave.index, tableIds: wave.tableIds, mdmEntityIds: wave.mdmEntityIds, estimatedOutputTokens: (_e = options.estimatedOutputTokens) !== null && _e !== void 0 ? _e : undefined }, null, 2)),
        "## Entities from L4\n".concat(JSON.stringify(entities, null, 2)),
        "## Local persistence tables\n".concat(JSON.stringify(tables, null, 2)),
        "## Relationships from L4\n".concat(JSON.stringify(relationships, null, 2))
    ], (options.priorSummary ? ["## Scenario summary from earlier waves\n".concat(options.priorSummary)] : []), true), (catalog.length ? ["## Valid references from earlier waves\nUse these refs when needed; do not recreate their rows.\n".concat(JSON.stringify(catalog, null, 2))] : []), true), [
        "## Platform users (actor identities)\nThese identities already exist; reference them for any field that points to a platform user (an assignee, or a field resolved from the actor session such as a worker/owner id). Do NOT create a table or MDM entity for them.\n".concat(JSON.stringify(actorIdentityRefs, null, 2)),
        "## L4 rules the scenario must satisfy (full text)\n".concat(JSON.stringify(rules, null, 2)),
        '## Symbolic references\nUse only { "ref": "local:TableId.rowKey" }, { "ref": "mdm:EntityId.rowKey" } or { "ref": "actor:ActorId.key" } for foreign keys. Never emit UUIDs.',
        [
            '## Required result',
            'Plan ONLY the local tables and MDM entities listed in "Planning wave". Do not create rows for any other table/entity; reference earlier waves only through the supplied catalog.',
            'Keep this wave COMPACT but representative and below its output budget. Use these approximate caps (never just one row where several make the feature usable, never a huge dataset):',
            '- MDM/catalog entities: ~3-5 rows each.',
            '- Core/operational entities: ~2-4 rows each, covering the MAIN lifecycle states and including at least one open/in-progress instance. You do NOT need every state × every filter combination.',
            '- Supporting/child entities: 1-2 children per parent.',
            '- Event entities: one row per operational row that would have produced it.',
            'Every timestamp must be an ISO 8601 UTC value strictly within the supplied timeWindow and chronologically coherent (a row is created before it is updated or transitions state).',
            'Relationships: model a relationship as an MDM row relationship ONLY when BOTH fromKind and toKind are "mdm", attaching any quantitative fields (quantities, ratios, per-unit amounts) as relationship metadata.',
            'Any relationship whose fromKind or toKind is NOT "mdm" (core/event/supporting) is seeded as a symbolic { "ref": "..." } foreign key on the NON-MDM side (the local table column or entity field that holds the id), following the relationship direction — never as an MDM row relationship. Example: Project(core) -manyToOne-> Client(mdm) becomes each Project row carrying its clientId as { "ref": "mdm:Client.<key>" }, not a relationship on the Client row.',
            'A foreign key that identifies a PLATFORM USER (an assignee such as an assigned worker, or an id resolved from the actor session like a worker/owner id) references a platform-user identity, NOT a module entity. Point it at one of the "Platform users (actor identities)" refs above ({ "ref": "actor:ActorId.key" }). Never invent a local table or MDM entity for people/workers/assignees.',
            'Satisfy every rule listed above, following its description.',
        ].join('\n')
    ], false), (repairFindings.length ? ["## Repair findings from the prior plan\n".concat(repairFindings.join('\n'))] : []), true).join('\n\n');
}
