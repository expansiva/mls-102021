"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalSummaryResultSchema = exports.judgeResultSchema = exports.seedPlanResultSchema = exports.httpControllerResultSchema = exports.usecaseResultSchema = exports.repositoryAdapterResultSchema = exports.persistenceTableResultSchema = exports.repositoryPortResultSchema = exports.domainEntityResultSchema = void 0;
// Strict JSON schemas for every agentChangeBackend tool call (the `result` shape inside the planner
// envelope status/result/questions/trace). collab-llm forces the model to satisfy these and the
// agents re-validate locally. Each schema is the contract that makes the produced .defs.ts
// self-sufficient for the .ts materialization. See spec.md (auto-suficiência) and flow.json.
var str = { type: 'string' };
var bool = { type: 'boolean' };
var num = { type: 'number' };
var strArray = { type: 'array', items: str };
function objArray(required, properties) {
    return { type: 'array', items: { type: 'object', additionalProperties: false, required: required, properties: properties } };
}
// ── generation / defs ───────────────────────────────────────────────────────────
// NOTE (2026-07-11): the planning/index schemas (aggregate/persistence/usecase/bff Index) were
// removed together with their LLM steps — the output was discarded and the generators re-derive
// aggregates/columns/usecases deterministically. See todo/modernizeChangeBackend.md.
var fieldSchema = { type: 'object', additionalProperties: false, required: ['fieldId', 'type', 'required'], properties: { fieldId: str, type: str, required: bool, description: str, enum: strArray } };
exports.domainEntityResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['entityId', 'fields'],
    properties: {
        entityId: str,
        title: str,
        fields: { type: 'array', items: fieldSchema },
        valueObjects: objArray(['name', 'fields'], { name: str, fields: { type: 'array', items: fieldSchema }, collection: bool }),
        invariants: strArray,
        statusEnum: strArray,
    },
};
exports.repositoryPortResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['entityId', 'interfaceName', 'methods'],
    properties: {
        entityId: str,
        interfaceName: str, // I{Entity}Repository
        methods: objArray(['name', 'returns'], { name: str, params: strArray, returns: str, description: str }),
    },
};
exports.persistenceTableResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['tableId', 'tableName', 'columns', 'primaryKey'],
    properties: {
        tableId: str,
        tableName: str, // snake_case
        columns: objArray(['name', 'type', 'nullable'], { name: str, type: str, nullable: bool, description: str }),
        primaryKey: strArray,
        indexes: objArray(['indexName', 'columns'], { indexName: str, columns: strArray, unique: bool }),
        detailsColumn: { type: 'object', additionalProperties: false, required: ['enabled'], properties: { enabled: bool, columnName: str, childCollections: strArray } },
        // Append-only event tables: appendOnly=true, purpose 'controle' (telemetry/audit), retentionDays
        // carried to the TableDefinition (omitted = permanent). Absent for normal aggregate tables.
        appendOnly: bool,
        purpose: str,
        retentionDays: num,
    },
};
exports.repositoryAdapterResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['entityId', 'className', 'portRef', 'tableRef'],
    properties: {
        entityId: str,
        className: str,
        portRef: str, // .d.ts of the port it implements
        tableRef: str, // .d.ts of the table it maps to
        mdmReads: strArray,
        notes: strArray,
    },
};
// A usecase file may export SEVERAL functions, each with its OWN explicit Input/Output FIELDS (not
// just type names) so the .ts and the BFF that imports it are deterministic.
// `fieldRef`/`item` mirror the l4 outputShape entry vocabulary: the prompt shows the canonical
// outputShape and models copy its entries verbatim into output[] — rejecting those keys made the
// x-tool-strict ajv gate 502 the whole call (primary AND fallback) on run 102049. They are tolerated,
// not consumed: the pin (cbOutputShapeToDefsFields) flattens the defs output regardless.
var ioFieldSchema = { type: 'object', additionalProperties: false, required: ['name', 'type'], properties: { name: str, type: str, required: bool, description: str, ofEntity: str, fieldRef: str, item: { type: 'object' } } };
var usecaseFunctionSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['functionName', 'inputTypeName', 'outputTypeName', 'input', 'output'],
    properties: {
        functionName: str,
        inputTypeName: str,
        outputTypeName: str,
        input: { type: 'array', items: ioFieldSchema }, // explicit input fields (camelCase)
        output: { type: 'array', items: ioFieldSchema }, // explicit output fields (camelCase)
        ports: strArray, // ports this function uses
        rulesApplied: strArray,
        transactional: bool,
        steps: strArray,
    },
};
exports.usecaseResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['usecaseId', 'ports', 'functions'],
    properties: {
        usecaseId: str,
        ports: strArray, // all repository ports the usecase file imports (union of functions)
        rulesApplied: strArray,
        functions: { type: 'array', items: usecaseFunctionSchema }, // 1..N exported functions
    },
};
exports.httpControllerResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['pageId', 'controllerName', 'handlers', 'routes'],
    properties: {
        pageId: str,
        controllerName: str,
        handlers: objArray(['handlerName', 'command', 'usecaseRef'], { handlerName: str, command: str, usecaseRef: str, kind: str }),
        routes: objArray(['key', 'handlerName'], { key: str, handlerName: str }), // key = {module}.{page}.{command}
    },
};
// ── seed scenario planning (agentCbSeeds) ─────────────────────────────────────
// The planner returns semantic data only. It cannot emit TypeScript or raw IDs: the deterministic
// cbSeedsCore compiler resolves the symbolic refs and validates the result before saving seeds.ts.
var seedReferenceSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['ref'],
    properties: { ref: str },
};
var seedAssetReferenceSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['asset', 'kind'],
    properties: {
        asset: str,
        kind: { const: 'image' },
    },
};
var seedValueSchema = {
    anyOf: [str, num, bool, { type: 'null' }, seedReferenceSchema, seedAssetReferenceSchema],
};
var seedFieldSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'value'],
    properties: { name: str, value: seedValueSchema },
};
var seedChildRowSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['key', 'fields'],
    properties: { key: str, fields: { type: 'array', items: seedFieldSchema } },
};
var seedChildCollectionSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'rows'],
    properties: { name: str, rows: { type: 'array', items: seedChildRowSchema } },
};
var seedLocalRowSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['key', 'columns', 'details', 'children'],
    properties: {
        key: str,
        columns: { type: 'array', items: seedFieldSchema },
        details: { type: 'array', items: seedFieldSchema },
        children: { type: 'array', items: seedChildCollectionSchema },
    },
};
var seedRelationshipSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['targetRef', 'type', 'metadata', 'isBidirectional'],
    properties: {
        targetRef: str,
        type: str,
        metadata: { type: 'array', items: seedFieldSchema },
        isBidirectional: bool,
    },
};
var seedMdmRowSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['key', 'fields', 'relationships'],
    properties: {
        key: str,
        fields: { type: 'array', items: seedFieldSchema },
        relationships: { type: 'array', items: seedRelationshipSchema },
    },
};
exports.seedPlanResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'localTables', 'mdmEntities'],
    properties: {
        summary: str,
        localTables: objArray(['tableId', 'rows'], {
            tableId: str,
            rows: { type: 'array', items: seedLocalRowSchema },
        }),
        mdmEntities: objArray(['entityId', 'rows'], {
            entityId: str,
            rows: { type: 'array', items: seedMdmRowSchema },
        }),
    },
};
// ── judge (adversarial critic, cb-judge) ────────────────────────────────────────
// Findings typed by the repair-routing taxonomy (improveAddNewSolution2_1.md §2):
// estrutural (artifact/link missing) | decisao (business default missing) | fora_de_escopo (other layer).
exports.judgeResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['findings'],
    properties: {
        findings: objArray(['ownerId', 'type', 'severity', 'message'], {
            ownerId: str, // operationId of the usecase judged
            type: { enum: ['estrutural', 'decisao', 'fora_de_escopo'] },
            severity: { enum: ['error', 'warning'] },
            message: str,
            suggestion: str,
        }),
    },
};
exports.finalSummaryResultSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['summary'],
    properties: { summary: str, ownersDone: strArray, warnings: strArray },
};
