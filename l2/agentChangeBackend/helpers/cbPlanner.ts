/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPlanner.ts" enhancement="_blank"/>

export type PlannerStatus = 'ok' | 'needs_input' | 'failed';

export interface PlannerOutput<T> {
  status: PlannerStatus;
  result: T;
  questions: string[];
  trace: string[];
}

export interface PlannerExtractConfig<T> {
  toolName: string;
  preNormalizeResult?: (value: unknown) => unknown;
  normalizeResult: (value: unknown) => T;
}

const plannerResultSchemasByToolName: Record<string, Record<string, unknown>> = {};

export function createPlannerToolSchema(toolName: string, description: string, resultSchema: Record<string, unknown>): mls.msg.LLMTool {
  plannerResultSchemasByToolName[toolName] = resultSchema; // internal AJV keeps the ORIGINAL (with $defs)
  // Strict providers (Grok/xAI, Moonshot/Kimi) validate the WHOLE tool schema from the wrapper root:
  // hoist result's top-level `$defs` here so `#/$defs/...` refs resolve, and drop the nested `$id` the
  // provider does not need. Every enum/const must also declare `type`. (agentsBestPractices.md §9)
  const resultBody: Record<string, unknown> = { ...resultSchema };
  const hoistedDefs = resultBody.$defs;
  delete resultBody.$defs;
  delete resultBody.$id;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['status', 'result', 'questions', 'trace'],
    properties: {
      status: { type: 'string', enum: ['ok', 'needs_input', 'failed'] },
      result: resultBody,
      questions: { type: 'array', items: { type: 'string' } },
      trace: { type: 'array', items: { type: 'string' } },
    },
  };
  if (hoistedDefs && typeof hoistedDefs === 'object') parameters.$defs = hoistedDefs;
  return {
    type: 'function',
    function: { name: toolName, description, parameters },
  } as unknown as mls.msg.LLMTool;
}

export function extractPlannerOutput<T>(payload: unknown, config: PlannerExtractConfig<T>): PlannerOutput<T> {
  const value = parseMaybeJson(payload);
  if (!isRecord(value)) throw new Error('tool payload must be an object');
  if (value.type === 'result') throw new Error(String(value.result || 'agent returned a result error'));
  const direct = tryNormalizeEnvelope(value, config);
  if (direct) return direct;
  if (value.type === 'flexible') {
    const flexibleResult = parseMaybeJson(value.result);
    const fromFlexible = tryNormalizeEnvelope(flexibleResult, config);
    if (fromFlexible) return fromFlexible;
    const fromFlexibleTool = tryExtractToolArguments(flexibleResult, config);
    if (fromFlexibleTool) return fromFlexibleTool;
  }
  const fromTool = tryExtractToolArguments(value, config);
  if (fromTool) return fromTool;
  const fromOpenAI = tryExtractOpenAIToolCall(value, config);
  if (fromOpenAI) return fromOpenAI;
  throw new Error(`payload does not contain a recognized ${config.toolName} tool output`);
}

function tryExtractOpenAIToolCall<T>(value: Record<string, unknown>, config: PlannerExtractConfig<T>): PlannerOutput<T> | null {
  const toolCalls = value.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;
  const call = toolCalls.find(item => {
    const record = isRecord(item) ? item : null;
    const fn = record && isRecord(record.function) ? record.function : null;
    return fn?.name === config.toolName;
  });
  if (!isRecord(call) || !isRecord(call.function)) return null;
  return normalizeToolArguments(call.function.arguments, config);
}

function tryExtractToolArguments<T>(value: unknown, config: PlannerExtractConfig<T>): PlannerOutput<T> | null {
  const record = parseMaybeJson(value);
  if (!isRecord(record) || record.toolName !== config.toolName) return null;
  return normalizeToolArguments(record.arguments, config);
}

function normalizeToolArguments<T>(value: unknown, config: PlannerExtractConfig<T>, depth = 0): PlannerOutput<T> {
  const args = parseMaybeJson(value);
  if (!isRecord(args)) throw new Error('tool arguments must be an object');
  if (args.result !== undefined && !isToolWrapper(args.result, config.toolName)) return normalizeEnvelope(args, config);
  const direct = tryNormalizeEnvelope(args, config);
  if (direct) return direct;
  const nested = tryNormalizeEnvelope(parseMaybeJson(args.result), config);
  if (nested) return nested;
  if (args.arguments !== undefined && depth < 3) {
    try {
      return normalizeToolArguments(args.arguments, config, depth + 1);
    } catch {
      // fall through
    }
  }
  throw new Error(`tool arguments do not contain ${config.toolName} output`);
}

function tryNormalizeEnvelope<T>(value: unknown, config: PlannerExtractConfig<T>): PlannerOutput<T> | null {
  const output = parseMaybeJson(value);
  if (!isRecord(output) || output.result === undefined || isToolWrapper(output.result, config.toolName)) return null;
  try {
    return normalizeEnvelope(output, config);
  } catch {
    return null;
  }
}

function normalizeEnvelope<T>(output: Record<string, unknown>, config: PlannerExtractConfig<T>): PlannerOutput<T> {
  const pre = config.preNormalizeResult ? config.preNormalizeResult(output.result) : output.result;
  validatePlannerResultSchema(pre, config);
  return {
    status: output.status === undefined ? 'ok' : assertPlannerStatus(output.status, 'status'),
    result: config.normalizeResult(pre),
    questions: normalizeStringList(output.questions, 'questions'),
    trace: normalizeStringList(output.trace, 'trace'),
  };
}

function isToolWrapper(value: unknown, toolName: string): boolean {
  const record = parseMaybeJson(value);
  return isRecord(record) && record.toolName === toolName && record.arguments !== undefined;
}

function validatePlannerResultSchema<T>(value: unknown, config: PlannerExtractConfig<T>): void {
  const schema = plannerResultSchemasByToolName[config.toolName];
  if (schema) validateJsonSchema(value, schema, 'result');
}

export function validateJsonSchema(value: unknown, schema: unknown, path: string): void {
  if (!isRecord(schema)) return;
  const anyOf = schema.anyOf;
  if (Array.isArray(anyOf)) {
    const errors: string[] = [];
    for (const option of anyOf) {
      try {
        validateJsonSchema(value, option, path);
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new Error(`${path} must match one allowed schema: ${errors.join('; ')}`);
  }
  if (schema.const !== undefined && value !== schema.const) throw new Error(`${path} must be ${JSON.stringify(schema.const)}`);
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) throw new Error(`${path} must be one of ${schema.enum.map(item => JSON.stringify(item)).join(', ')}`);
  if (schema.type !== undefined) validateJsonSchemaType(value, schema.type, path);
  if (schema.type === 'object' || schema.properties !== undefined || schema.required !== undefined) {
    if (!isRecord(value)) throw new Error(`${path} must be an object`);
    const required = schema.required;
    if (Array.isArray(required)) {
      for (const key of required) if (typeof key === 'string' && value[key] === undefined) throw new Error(`${path}.${key} is required`);
    }
    const properties = isRecord(schema.properties) ? schema.properties : {};
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (value[key] !== undefined) validateJsonSchema(value[key], propertySchema, `${path}.${key}`);
    }
    const additionalProperties = schema.additionalProperties;
    if (additionalProperties === false) {
      for (const key of Object.keys(value)) if (properties[key] === undefined) throw new Error(`${path}.${key} is not allowed`);
    } else if (isRecord(additionalProperties)) {
      for (const key of Object.keys(value)) {
        if (properties[key] === undefined) validateJsonSchema(value[key], additionalProperties, `${path}.${key}`);
      }
    }
  }
  if (schema.type === 'array' || schema.items !== undefined) {
    if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) throw new Error(`${path} must have at least ${schema.minItems} item(s)`);
    if (schema.items !== undefined) value.forEach((item, index) => validateJsonSchema(item, schema.items, `${path}[${index}]`));
  }
}

function validateJsonSchemaType(value: unknown, type: unknown, path: string): void {
  const types = Array.isArray(type) ? type : [type];
  const ok = types.some(item => {
    if (item === 'array') return Array.isArray(value);
    if (item === 'object') return isRecord(value);
    if (item === 'integer') return Number.isInteger(value);
    if (item === 'number') return typeof value === 'number';
    if (item === 'string') return typeof value === 'string';
    if (item === 'boolean') return typeof value === 'boolean';
    if (item === 'null') return value === null;
    return true;
  });
  if (!ok) throw new Error(`${path} must be ${types.join(' or ')}`);
}

export function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path} must be an object`);
  return value;
}

export function assertArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value;
}

export function assertString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${path} must be a non-empty string`);
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim());
}

export function normalizeStringList(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((item, index) => normalizeStringListItem(item, `${path}[${index}]`));
  if (isRecord(value)) return Object.entries(value).map(([key, item]) => normalizeStringListItem(item, `${path}.${key}`) || key);
  return [assertString(value, path)];
}

function normalizeStringListItem(value: unknown, path: string): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isRecord(value)) {
    const parts = [value.title, value.question, value.description, value.reason, value.message]
      .map(part => optionalString(part))
      .filter((part): part is string => !!part);
    return parts.length > 0 ? parts.join(' - ') : JSON.stringify(value);
  }
  throw new Error(`${path} must be a string-compatible value`);
}

function assertPlannerStatus(value: unknown, path: string): PlannerStatus {
  if (value === 'ok' || value === 'needs_input' || value === 'failed') return value;
  throw new Error(`${path} must be ok, needs_input, or failed`);
}
