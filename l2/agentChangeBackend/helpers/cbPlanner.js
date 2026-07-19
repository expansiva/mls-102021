"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPlanner.ts" enhancement="_blank"/>
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlannerToolSchema = createPlannerToolSchema;
exports.extractPlannerOutput = extractPlannerOutput;
exports.validateJsonSchema = validateJsonSchema;
exports.parseMaybeJson = parseMaybeJson;
exports.isRecord = isRecord;
exports.assertRecord = assertRecord;
exports.assertArray = assertArray;
exports.assertString = assertString;
exports.optionalString = optionalString;
exports.optionalStringArray = optionalStringArray;
exports.normalizeStringList = normalizeStringList;
var plannerResultSchemasByToolName = {};
function createPlannerToolSchema(toolName, description, resultSchema) {
    plannerResultSchemasByToolName[toolName] = resultSchema;
    return {
        type: 'function',
        function: {
            name: toolName,
            description: description,
            parameters: {
                type: 'object',
                additionalProperties: false,
                required: ['status', 'result', 'questions', 'trace'],
                properties: {
                    status: { enum: ['ok', 'needs_input', 'failed'] },
                    result: resultSchema,
                    questions: { type: 'array', items: { type: 'string' } },
                    trace: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    };
}
function extractPlannerOutput(payload, config) {
    var value = parseMaybeJson(payload);
    if (!isRecord(value))
        throw new Error('tool payload must be an object');
    if (value.type === 'result')
        throw new Error(String(value.result || 'agent returned a result error'));
    var direct = tryNormalizeEnvelope(value, config);
    if (direct)
        return direct;
    if (value.type === 'flexible') {
        var flexibleResult = parseMaybeJson(value.result);
        var fromFlexible = tryNormalizeEnvelope(flexibleResult, config);
        if (fromFlexible)
            return fromFlexible;
        var fromFlexibleTool = tryExtractToolArguments(flexibleResult, config);
        if (fromFlexibleTool)
            return fromFlexibleTool;
    }
    var fromTool = tryExtractToolArguments(value, config);
    if (fromTool)
        return fromTool;
    var fromOpenAI = tryExtractOpenAIToolCall(value, config);
    if (fromOpenAI)
        return fromOpenAI;
    throw new Error("payload does not contain a recognized ".concat(config.toolName, " tool output"));
}
function tryExtractOpenAIToolCall(value, config) {
    var toolCalls = value.tool_calls;
    if (!Array.isArray(toolCalls) || toolCalls.length === 0)
        return null;
    var call = toolCalls.find(function (item) {
        var record = isRecord(item) ? item : null;
        var fn = record && isRecord(record.function) ? record.function : null;
        return (fn === null || fn === void 0 ? void 0 : fn.name) === config.toolName;
    });
    if (!isRecord(call) || !isRecord(call.function))
        return null;
    return normalizeToolArguments(call.function.arguments, config);
}
function tryExtractToolArguments(value, config) {
    var record = parseMaybeJson(value);
    if (!isRecord(record) || record.toolName !== config.toolName)
        return null;
    return normalizeToolArguments(record.arguments, config);
}
function normalizeToolArguments(value, config, depth) {
    if (depth === void 0) { depth = 0; }
    var args = parseMaybeJson(value);
    if (!isRecord(args))
        throw new Error('tool arguments must be an object');
    if (args.result !== undefined && !isToolWrapper(args.result, config.toolName))
        return normalizeEnvelope(args, config);
    var direct = tryNormalizeEnvelope(args, config);
    if (direct)
        return direct;
    var nested = tryNormalizeEnvelope(parseMaybeJson(args.result), config);
    if (nested)
        return nested;
    if (args.arguments !== undefined && depth < 3) {
        try {
            return normalizeToolArguments(args.arguments, config, depth + 1);
        }
        catch (_a) {
            // fall through
        }
    }
    throw new Error("tool arguments do not contain ".concat(config.toolName, " output"));
}
function tryNormalizeEnvelope(value, config) {
    var output = parseMaybeJson(value);
    if (!isRecord(output) || output.result === undefined || isToolWrapper(output.result, config.toolName))
        return null;
    try {
        return normalizeEnvelope(output, config);
    }
    catch (_a) {
        return null;
    }
}
function normalizeEnvelope(output, config) {
    var pre = config.preNormalizeResult ? config.preNormalizeResult(output.result) : output.result;
    validatePlannerResultSchema(pre, config);
    return {
        status: output.status === undefined ? 'ok' : assertPlannerStatus(output.status, 'status'),
        result: config.normalizeResult(pre),
        questions: normalizeStringList(output.questions, 'questions'),
        trace: normalizeStringList(output.trace, 'trace'),
    };
}
function isToolWrapper(value, toolName) {
    var record = parseMaybeJson(value);
    return isRecord(record) && record.toolName === toolName && record.arguments !== undefined;
}
function validatePlannerResultSchema(value, config) {
    var schema = plannerResultSchemasByToolName[config.toolName];
    if (schema)
        validateJsonSchema(value, schema, 'result');
}
function validateJsonSchema(value, schema, path) {
    if (!isRecord(schema))
        return;
    var anyOf = schema.anyOf;
    if (Array.isArray(anyOf)) {
        var errors = [];
        for (var _i = 0, anyOf_1 = anyOf; _i < anyOf_1.length; _i++) {
            var option = anyOf_1[_i];
            try {
                validateJsonSchema(value, option, path);
                return;
            }
            catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
            }
        }
        throw new Error("".concat(path, " must match one allowed schema: ").concat(errors.join('; ')));
    }
    if (schema.const !== undefined && value !== schema.const)
        throw new Error("".concat(path, " must be ").concat(JSON.stringify(schema.const)));
    if (Array.isArray(schema.enum) && !schema.enum.includes(value))
        throw new Error("".concat(path, " must be one of ").concat(schema.enum.map(function (item) { return JSON.stringify(item); }).join(', ')));
    if (schema.type !== undefined)
        validateJsonSchemaType(value, schema.type, path);
    if (schema.type === 'object' || schema.properties !== undefined || schema.required !== undefined) {
        if (!isRecord(value))
            throw new Error("".concat(path, " must be an object"));
        var required = schema.required;
        if (Array.isArray(required)) {
            for (var _a = 0, required_1 = required; _a < required_1.length; _a++) {
                var key = required_1[_a];
                if (typeof key === 'string' && value[key] === undefined)
                    throw new Error("".concat(path, ".").concat(key, " is required"));
            }
        }
        var properties = isRecord(schema.properties) ? schema.properties : {};
        for (var _b = 0, _c = Object.entries(properties); _b < _c.length; _b++) {
            var _d = _c[_b], key = _d[0], propertySchema = _d[1];
            if (value[key] !== undefined)
                validateJsonSchema(value[key], propertySchema, "".concat(path, ".").concat(key));
        }
        var additionalProperties = schema.additionalProperties;
        if (additionalProperties === false) {
            for (var _e = 0, _f = Object.keys(value); _e < _f.length; _e++) {
                var key = _f[_e];
                if (properties[key] === undefined)
                    throw new Error("".concat(path, ".").concat(key, " is not allowed"));
            }
        }
        else if (isRecord(additionalProperties)) {
            for (var _g = 0, _h = Object.keys(value); _g < _h.length; _g++) {
                var key = _h[_g];
                if (properties[key] === undefined)
                    validateJsonSchema(value[key], additionalProperties, "".concat(path, ".").concat(key));
            }
        }
    }
    if (schema.type === 'array' || schema.items !== undefined) {
        if (!Array.isArray(value))
            throw new Error("".concat(path, " must be an array"));
        if (typeof schema.minItems === 'number' && value.length < schema.minItems)
            throw new Error("".concat(path, " must have at least ").concat(schema.minItems, " item(s)"));
        if (schema.items !== undefined)
            value.forEach(function (item, index) { return validateJsonSchema(item, schema.items, "".concat(path, "[").concat(index, "]")); });
    }
}
function validateJsonSchemaType(value, type, path) {
    var types = Array.isArray(type) ? type : [type];
    var ok = types.some(function (item) {
        if (item === 'array')
            return Array.isArray(value);
        if (item === 'object')
            return isRecord(value);
        if (item === 'integer')
            return Number.isInteger(value);
        if (item === 'number')
            return typeof value === 'number';
        if (item === 'string')
            return typeof value === 'string';
        if (item === 'boolean')
            return typeof value === 'boolean';
        if (item === 'null')
            return value === null;
        return true;
    });
    if (!ok)
        throw new Error("".concat(path, " must be ").concat(types.join(' or ')));
}
function parseMaybeJson(value) {
    if (typeof value !== 'string')
        return value;
    var trimmed = value.trim();
    if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('[')))
        return value;
    try {
        return JSON.parse(trimmed);
    }
    catch (_a) {
        return value;
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function assertRecord(value, path) {
    if (!isRecord(value))
        throw new Error("".concat(path, " must be an object"));
    return value;
}
function assertArray(value, path) {
    if (!Array.isArray(value))
        throw new Error("".concat(path, " must be an array"));
    return value;
}
function assertString(value, path) {
    if (typeof value !== 'string' || value.trim().length === 0)
        throw new Error("".concat(path, " must be a non-empty string"));
    return value.trim();
}
function optionalString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function optionalStringArray(value) {
    if (!Array.isArray(value))
        return undefined;
    return value.filter(function (item) { return typeof item === 'string' && item.trim().length > 0; }).map(function (item) { return item.trim(); });
}
function normalizeStringList(value, path) {
    if (value === undefined || value === null)
        return [];
    if (Array.isArray(value))
        return value.map(function (item, index) { return normalizeStringListItem(item, "".concat(path, "[").concat(index, "]")); });
    if (isRecord(value))
        return Object.entries(value).map(function (_a) {
            var key = _a[0], item = _a[1];
            return normalizeStringListItem(item, "".concat(path, ".").concat(key)) || key;
        });
    return [assertString(value, path)];
}
function normalizeStringListItem(value, path) {
    if (typeof value === 'string')
        return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    if (isRecord(value)) {
        var parts = [value.title, value.question, value.description, value.reason, value.message]
            .map(function (part) { return optionalString(part); })
            .filter(function (part) { return !!part; });
        return parts.length > 0 ? parts.join(' - ') : JSON.stringify(value);
    }
    throw new Error("".concat(path, " must be a string-compatible value"));
}
function assertPlannerStatus(value, path) {
    if (value === 'ok' || value === 'needs_input' || value === 'failed')
        return value;
    throw new Error("".concat(path, " must be ok, needs_input, or failed"));
}
