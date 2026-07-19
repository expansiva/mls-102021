"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>
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
exports.CONTRACTS_102034 = exports.DEFAULT_MODEL_TYPE = exports.GEN_TOOL = exports.GEN_TOOL_NAME = void 0;
exports.layerRank = layerRank;
exports.orderItems = orderItems;
exports.isStale = isStale;
exports.parseDefs = parseDefs;
exports.parseModelType = parseModelType;
exports.buildSystemPrompt = buildSystemPrompt;
exports.buildHumanPrompt = buildHumanPrompt;
exports.applyHeader = applyHeader;
exports.expandContextRef = expandContextRef;
// ─── Layer order (hexagonal) ─────────────────────────────────────────────────
// Topological rank by layer. Lower runs first. Respects every dependsFiles edge AND the requested
// grouping "persistence -> usecases -> controllers": domain feeds everything; ports feed adapters and
// usecases; the table is part of persistence; the adapter closes persistence; usecases then controllers.
//   domain(0) -> port(1) -> table(2) -> adapter(3) -> usecase(4) -> controller(5)
var LAYER_RANK = {
    domainEntity: 0,
    repositoryPort: 1,
    persistenceTable: 2,
    repositoryAdapter: 3,
    applicationUsecase: 4,
    httpController: 5,
};
function layerRank(type) {
    // Unknown types run last so a new layer never silently jumps ahead of its dependencies.
    return type in LAYER_RANK ? LAYER_RANK[type] : 99;
}
// Stable order: by layer rank, then by id (deterministic across runs).
function orderItems(items) {
    return __spreadArray([], items, true).sort(function (a, b) { return layerRank(a.type) - layerRank(b.type) || a.id.localeCompare(b.id); });
}
// ─── Staleness ───────────────────────────────────────────────────────────────
// Regenerate when the output is missing, or the .defs.ts is newer than the generated .ts. Pure: the
// caller supplies the timestamps (fs mtime in Node, file.updatedAt in the studio).
function isStale(defsMs, tsMs) {
    if (tsMs == null)
        return true; // output not generated yet
    if (defsMs == null)
        return false; // no defs timestamp -> assume up to date
    return defsMs > tsMs; // defs changed after the last generation
}
// ─── .defs.ts parsing (no eval; balanced-bracket slice + JSON.parse) ──────────
// Extract `export const <name> = <value>` where value starts with '{' or '['. Returns the parsed JSON
// value (the artifact data and the pipeline are plain JSON literals by construction).
function extractConstObject(src, name) {
    var marker = "export const ".concat(name);
    var at = src.indexOf(marker);
    if (at < 0)
        return null;
    var eq = src.indexOf('=', at);
    if (eq < 0)
        return null;
    var open = eq + 1;
    while (open < src.length && /\s/.test(src[open]))
        open++;
    var openCh = src[open];
    var closeCh = openCh === '[' ? ']' : openCh === '{' ? '}' : '';
    if (!closeCh)
        return null;
    var depth = 0, i = open, inStr = false, strCh = '';
    for (; i < src.length; i++) {
        var c = src[i];
        if (inStr) {
            if (c === '\\') {
                i++;
                continue;
            }
            if (c === strCh)
                inStr = false;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') {
            inStr = true;
            strCh = c;
            continue;
        }
        if (c === openCh)
            depth++;
        else if (c === closeCh) {
            depth--;
            if (depth === 0) {
                i++;
                break;
            }
        }
    }
    // Strip a trailing `as const` the source may carry after the literal.
    var body = src.slice(open, i);
    try {
        return JSON.parse(body);
    }
    catch (_a) {
        return null;
    }
}
function firstExportName(src) {
    // Skip the `pipeline` export; the artifact data export is the other top-level const.
    var re = /export const\s+([A-Za-z0-9_$]+)\s*=/g;
    var m;
    while ((m = re.exec(src))) {
        if (m[1] !== 'pipeline')
            return m[1];
    }
    return null;
}
function parseDefs(src) {
    var dataExportName = firstExportName(src);
    var artifact = (dataExportName ? extractConstObject(src, dataExportName) : null);
    var pipelineArr = extractConstObject(src, 'pipeline');
    var item = Array.isArray(pipelineArr) && pipelineArr.length ? pipelineArr[0] : null;
    var data = artifact && typeof artifact === 'object' && 'data' in artifact ? artifact.data : artifact;
    return { dataExportName: dataExportName, artifact: artifact, data: data, item: item };
}
// ─── Prompt assembly (mirrors the studio gen agent) ──────────────────────────
exports.GEN_TOOL_NAME = 'submitGeneratedTs';
// Plain OpenAI tool (NOT the planner envelope): the gen agent returns the file content directly.
exports.GEN_TOOL = {
    type: 'function',
    function: {
        name: exports.GEN_TOOL_NAME,
        description: 'Submit the complete generated TypeScript file content.',
        parameters: {
            type: 'object',
            additionalProperties: false,
            required: ['code'],
            properties: {
                code: { type: 'string', description: 'Complete TypeScript file content. Must start with the /// <mls fileReference="..."> header.' },
            },
        },
    },
};
exports.DEFAULT_MODEL_TYPE = 'codehigh';
// Read `<!-- modelType: X -->` from a system prompt (the collab-llm `model` alias the studio sends).
function parseModelType(systemPrompt) {
    var m = systemPrompt.match(/<!--\s*modelType:\s*([A-Za-z0-9_-]+)\s*-->/);
    return m ? m[1] : null;
}
function buildSystemPrompt(skillSections, outputPath, modelType) {
    var skills = skillSections.length ? skillSections.join('\n\n---\n\n') : '<!-- no skill loaded -->';
    return "<!-- modelType: ".concat(modelType, " -->\n<!-- x-tool-strict: true -->\n\nYou generate a TypeScript file based on a definition and context files.\n\nTarget file: ").concat(outputPath, "\n\nThe file must start with:\n/// <mls fileReference=\"").concat(outputPath, "\" enhancement=\"_blank\"/>\n\nFollow the instructions in the skill(s) below exactly.\nUse the context files (dependsFiles) as reference for types, imports and logic.\nReturn ONLY the file via the ").concat(exports.GEN_TOOL_NAME, " tool.\n\n---\n\n").concat(skills);
}
function buildHumanPrompt(data, contextSections, outputPath) {
    var lines = ['## Definition', '', '```json', JSON.stringify(data, null, 2), '```', ''];
    if (contextSections.length) {
        lines.push('## Context files (dependsFiles)', '');
        for (var _i = 0, contextSections_1 = contextSections; _i < contextSections_1.length; _i++) {
            var c = contextSections_1[_i];
            lines.push(c, '');
        }
    }
    lines.push('## Output', '', "Generate ONLY the TypeScript for: ".concat(outputPath), "Call ".concat(exports.GEN_TOOL_NAME, " with the complete code."));
    return lines.join('\n');
}
// Ensure the generated file carries the mls header (the studio gen prepends it when missing).
function applyHeader(outputPath, code) {
    var header = "/// <mls fileReference=\"".concat(outputPath, "\" enhancement=\"_blank\"/>");
    var trimmed = code.trimStart();
    return trimmed.startsWith('///') ? code : "".concat(header, "\n\n").concat(code);
}
// ─── dependsFiles/skill ref expansion (shared by the Node CLI and the in-studio agent) ─────────────
// `_102034_.d.ts` (the shared runtime contracts) has no aggregated d.ts; expand the alias to the real
// 102034 source files so every prompt carries RequestContext, IDataRuntime/getTable, TableDefinition,
// AppError/ok and the repository registry — the types adapters/usecases/controllers compile against.
exports.CONTRACTS_102034 = [
    '_102034_/l1/server/layer_2_controllers/contracts.ts',
    '_102034_/l1/mdm/layer_3_usecases/mdmFacade.ts',
    '_102034_/l1/server/layer_1_external/data/runtime.ts',
    '_102034_/l1/server/layer_1_external/persistence/contracts.ts',
    '_102034_/l1/server/layer_2_application/repositoryRegistry.ts',
];
// Map a single context ref to the real file ref(s) to read. Pure (ref -> refs); the caller does the I/O.
function expandContextRef(ref) {
    return ref === '_102034_.d.ts' ? __spreadArray([], exports.CONTRACTS_102034, true) : [ref];
}
