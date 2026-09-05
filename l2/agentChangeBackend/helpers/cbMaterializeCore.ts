/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>

// Pure materialization core for L1 (.defs.ts -> .ts). NO mls.*, NO fs, NO dom: only ES2022 + the
// MaterializeEnv port. It is shared logic between the Node runner (nodejsMaterializeL1.ts, fs + LLM
// HTTP) and the future studio agent (l2, mls.* + steps). Keeping it pure is what lets the same plan,
// ordering, staleness rule and prompt assembly run in both environments.

// ─── Types ──────────────────────────────────────────────────────────────────

// One pipeline entry carried inside each .defs.ts (see agentChangeBackend cbShared.buildPipelineItem).
export interface PipelineItem {
  id: string;
  type: string;                 // domainEntity | repositoryPort | persistenceTable | repositoryAdapter | applicationUsecase | httpController
  outputPath: string;           // _NNNNN_/l1/.../x.ts
  defPath?: string;             // _NNNNN_/l1/.../x.defs.ts
  dependsFiles?: string[];      // .d.ts of inner callee layers (context for the prompt)
  dependsOn?: string[];         // explicit cross-item ids (usually empty; layer rank drives order)
  skills?: string[];            // .md skill(s) + _102034_.d.ts (prompt context)
  rulesApplied?: string[];
  agent?: string;
}

// Parsed .defs.ts: the artifact data block (export const xDefs = {... data:{...}}) plus its pipeline item.
export interface ParsedDefs {
  dataExportName: string | null;
  artifact: Record<string, unknown> | null;   // the full export const object
  data: unknown;                               // artifact.data ?? artifact (what the prompt receives)
  item: PipelineItem | null;
}

// A planned unit of work: the item + whether it must be (re)generated and its layer rank.
export interface PlannedItem {
  item: PipelineItem;
  rank: number;
  stale: boolean;
  reason: string;               // why it is/ isn't stale (for logs)
}

// The injected environment (the port). Both the Node fs adapter and the studio mls.* adapter implement it.
export interface MaterializeEnv {
  readRef(ref: string): Promise<string | null>;     // read a _NNNNN_/... reference (any extension)
  modifiedMs(ref: string): Promise<number | null>;   // mtime in ms, or null when absent
}

// What the LLM must return (the submitGeneratedTs tool). Same shape the studio gen agent uses.
export interface GenResult { code: string; }

// ─── Layer order (hexagonal) ─────────────────────────────────────────────────

// Topological rank by layer. Lower runs first. Respects every dependsFiles edge AND the requested
// grouping "persistence -> usecases -> controllers": domain feeds everything; ports feed adapters and
// usecases; the table is part of persistence; the adapter closes persistence; usecases then controllers.
//   domain(0) -> port(1) -> table(2) -> adapter(3) -> usecase(4) -> controller(5)
const LAYER_RANK: Record<string, number> = {
  domainEntity: 0,
  repositoryPort: 1,
  persistenceTable: 2,
  repositoryAdapter: 3,
  applicationUsecase: 4,
  httpController: 5,
  // Compiled by agentCbSeeds from seeds.defs.ts — never by the LLM materializer.
  persistenceSeeds: 6,
};

export function layerRank(type: string): number {
  // Unknown types run last so a new layer never silently jumps ahead of its dependencies.
  return type in LAYER_RANK ? LAYER_RANK[type] : 99;
}

/** Seeds are planned as JSON and compiled locally. An LLM rewrite would break determinism. */
export function isDeterministicMaterializeType(type: string): boolean {
  return type === 'persistenceSeeds';
}

// Stable order: by layer rank, then by id (deterministic across runs).
export function orderItems(items: PipelineItem[]): PipelineItem[] {
  return [...items].sort((a, b) => layerRank(a.type) - layerRank(b.type) || a.id.localeCompare(b.id));
}

// ─── Staleness ───────────────────────────────────────────────────────────────

// Generate when the output .ts is absent. Timestamps do not decide: they are logged by the caller
// as diagnostics. To regenerate (repair, defs change, `/rebuild`), delete the .ts.
export function isStale(tsExists: boolean): boolean {
  return !tsExists;
}

// ─── .defs.ts parsing (no eval; balanced-bracket slice + JSON.parse) ──────────

// Extract `export const <name> = <value>` where value starts with '{' or '['. Returns the parsed JSON
// value (the artifact data and the pipeline are plain JSON literals by construction).
function extractConstObject(src: string, name: string): unknown {
  const marker = `export const ${name}`;
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const eq = src.indexOf('=', at);
  if (eq < 0) return null;
  let open = eq + 1;
  while (open < src.length && /\s/.test(src[open])) open++;
  const openCh = src[open];
  const closeCh = openCh === '[' ? ']' : openCh === '{' ? '}' : '';
  if (!closeCh) return null;
  let depth = 0, i = open, inStr = false, strCh = '';
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === strCh) inStr = false; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; continue; }
    if (c === openCh) depth++;
    else if (c === closeCh) { depth--; if (depth === 0) { i++; break; } }
  }
  // Strip a trailing `as const` the source may carry after the literal.
  const body = src.slice(open, i);
  try { return JSON.parse(body); } catch { return null; }
}

function firstExportName(src: string): string | null {
  // Skip the `pipeline` export; the artifact data export is the other top-level const.
  const re = /export const\s+([A-Za-z0-9_$]+)\s*=/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) { if (m[1] !== 'pipeline') return m[1]; }
  return null;
}

export function parseDefs(src: string): ParsedDefs {
  const dataExportName = firstExportName(src);
  const artifact = (dataExportName ? extractConstObject(src, dataExportName) : null) as Record<string, unknown> | null;
  const pipelineArr = extractConstObject(src, 'pipeline');
  const item = Array.isArray(pipelineArr) && pipelineArr.length ? (pipelineArr[0] as PipelineItem) : null;
  const data = artifact && typeof artifact === 'object' && 'data' in artifact ? (artifact as any).data : artifact;
  return { dataExportName, artifact, data, item };
}

// ─── Prompt assembly (mirrors the studio gen agent) ──────────────────────────

export const GEN_TOOL_NAME = 'submitGeneratedTs';

// Plain OpenAI tool (NOT the planner envelope): the gen agent returns the file content directly.
export const GEN_TOOL = {
  type: 'function',
  function: {
    name: GEN_TOOL_NAME,
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
} as const;

export const DEFAULT_MODEL_TYPE = 'code';

// Read `<!-- modelType: X -->` from a system prompt (the collab-llm model preference the studio sends).
export function parseModelType(systemPrompt: string): string | null {
  const m = systemPrompt.match(/<!--\s*modelType:\s*([A-Za-z0-9_-]+)\s*-->/);
  return m ? m[1] : null;
}

export function buildSystemPrompt(skillSections: string[], outputPath: string, modelType: string): string {
  const skills = skillSections.length ? skillSections.join('\n\n---\n\n') : '<!-- no skill loaded -->';
  return `<!-- modelType: ${modelType} -->
<!-- x-tool-strict: true -->

You generate a TypeScript file based on a definition and context files.

Target file: ${outputPath}

The file must start with:
/// <mls fileReference="${outputPath}" enhancement="_blank"/>

Follow the instructions in the skill(s) below exactly.
Use the context files (dependsFiles) as reference for types, imports and logic.
Return ONLY the file via the ${GEN_TOOL_NAME} tool.

---

${skills}`;
}

export function buildHumanPrompt(data: unknown, contextSections: string[], outputPath: string): string {
  const lines = ['## Definition', '', '```json', JSON.stringify(data, null, 2), '```', ''];
  if (contextSections.length) {
    lines.push('## Context files (dependsFiles)', '');
    for (const c of contextSections) lines.push(c, '');
  }
  lines.push('## Output', '', `Generate ONLY the TypeScript for: ${outputPath}`, `Call ${GEN_TOOL_NAME} with the complete code.`);
  return lines.join('\n');
}

// Ensure the generated file carries the mls header (the studio gen prepends it when missing).
/**
 * The platform header is DERIVED from the file being written, never taken from the model's output.
 *
 * It used to be kept whenever the output already began with `///`, on the assumption that a model
 * echoing the header echoes it right. Two files of the buildFlowFsm run came back with
 * `enhancement="blank"` instead of `_blank` (`usecases/updateChangeOrder.ts` and
 * `adapters/persistence/changeOrderRepositoryAdapter.ts`) — written during a repair round, where the
 * model rewrites the whole file and retypes the first line. Nothing downstream reads the header, so it
 * failed silently. The path is just as forgeable as the enhancement, so both are rebuilt here: this
 * agent knows exactly which file it is saving, and the model's opinion about it is not needed.
 */
export function applyHeader(outputPath: string, code: string): string {
  const header = `/// <mls fileReference="${outputPath}" enhancement="_blank"/>`;
  const trimmed = code.trimStart();
  const existingHeader = /^\/\/\/\s*<mls\b[^>]*\/>\s*/u;
  if (existingHeader.test(trimmed)) return trimmed.replace(existingHeader, `${header}\n\n`);
  return `${header}\n\n${trimmed}`;
}

const KNOWN_IMPORT_EXT = /\.(?:d\.ts|defs\.ts|ts|js|mjs|cjs|json|css|less|html)$/u;

/**
 * Hygiene of the same seam as `applyHeader`: derive `.js` on path specifiers instead of trusting
 * the LLM. The Node ESM contract is guaranteed at rewrite time in `scripts/build.mjs` (complete
 * `.js` when the target exists in dist). This pass keeps generated source consistent with the skill;
 * it is not the defense that keeps the BFF alive.
 */
export function ensureJsImportExtensions(code: string): string {
  return code.replace(
    /((?:from|import)\s*\(\s*|\bfrom\s+|import\s+)(['"])(\/|\.)([^'"]*)\2/g,
    (full, prefix: string, quote: string, start: string, rest: string) => {
      const spec = `${start}${rest}`;
      if (KNOWN_IMPORT_EXT.test(spec)) return full;
      return `${prefix}${quote}${spec}.js${quote}`;
    },
  );
}

/** True when a repair finding is a pure COMPILER error (from the per-file compile `compiler: ...` or the
 *  whole-project compile `compiler -> ...`). Micro-repair only applies when ALL findings are compiler. */
export function isCompilerFinding(finding: string): boolean {
  return /^\s*compiler\b/u.test(finding);
}

/** T6: should ONE targeted rescue round fire (outside the global budget)? Only for a SMALL, compiler-only
 *  residual after the global budget is exactly spent — a larger or non-compiler residual is a genuine
 *  failure, not a last-mile fix. The caller bumps globalAttempts past the budget so this is a one-shot
 *  (`globalAttempts === budget` becomes false on the re-check). Pure/testable. */
export function shouldTargetedRescue(input: {
  globalAttempts: number;
  budget: number;
  targetCount: number;
  maxTargets: number;
  findings: string[];
}): boolean {
  return input.globalAttempts === input.budget
    && input.targetCount > 0
    && input.targetCount <= input.maxTargets
    && input.findings.length > 0
    && input.findings.every(isCompilerFinding);
}

/** After the repair budget (and the one-shot rescue) are spent, leftover compiler findings
 * degrade — they must not stall the run. Structural blocking findings still fail. */
export function compilerFindingsDegradeAfterBudget(input: {
  blocking: string[];
  globalAttempts: number;
  budget: number;
}): boolean {
  if (input.globalAttempts < input.budget) return false;
  if (!input.blocking.length) return false;
  return input.blocking.every(isCompilerFinding);
}

// T4: SURGICAL prompt for a repair whose findings are ALL compiler errors on an already-generated .ts.
// The full re-materialization prompt is ~15-25k tokens (architecture.md + layer skill + the platform
// contracts bundle + defs + dependsFiles) and re-generates the whole file — expensive and prone to
// whack-a-mole regressions. For a compiler error the model only needs: the current code, the exact
// errors, the types it depends on, and the pitfalls. Same tool (submitGeneratedTs) and the SAME
// post-gen gates (validateGeneratedComponent + compile) — only the INPUT shrinks. Pure/testable.
export function buildMicroRepairPrompt(input: {
  outputPath: string;
  code: string;                 // the current (failing) .ts to fix
  findings: string[];           // the compiler errors (each MUST be resolved)
  contextSections: string[];    // dependsFiles type context (entity/port .d.ts) — reference only
  pitfalls: string | null;      // typePitfalls.md content
}): { system: string; human: string } {
  const system = [
    '<!-- modelType: code -->',
    '<!-- x-tool-strict: true -->',
    '',
    'You are FIXING COMPILER ERRORS in an already-generated TypeScript file — not writing a new one.',
    'Make the SMALLEST change that resolves EVERY listed error. Do NOT restructure, rename, reorder',
    'imports, or touch anything unrelated to the errors. Keep the existing behavior and every declaration',
    'the remaining code still uses.',
    `The file must keep its header: /// <mls fileReference="${input.outputPath}" enhancement="_blank"/>`,
    `Return the COMPLETE corrected file via the ${GEN_TOOL_NAME} tool.`,
    ...(input.pitfalls ? ['', '---', '', input.pitfalls] : []),
  ].join('\n');
  const human = [
    `## File to fix\n${input.outputPath}`,
    `## Compiler errors — fix ALL, change as little as possible\n${input.findings.map(f => `- ${f}`).join('\n')}`,
    ...(input.contextSections.length ? [`## Types it depends on (reference only — do not edit)\n${input.contextSections.join('\n\n')}`] : []),
    `## Current file (edit THIS — return the whole corrected file)\n\`\`\`ts\n${input.code}\n\`\`\``,
  ].join('\n\n');
  return { system, human };
}

// ─── dependsFiles/skill ref expansion (shared by the Node CLI and the in-studio agent) ─────────────

// `_102034_.d.ts` (the shared runtime contracts) has no aggregated d.ts; the alias expands to the real
// 102034 source files that carry RequestContext, IDataRuntime/getTable, TableDefinition, AppError/ok and
// the repository registry — the types adapters/usecases/controllers compile against.
const C_CONTRACTS = '_102034_/l1/server/layer_2_controllers/contracts.ts';           // RequestContext, AppError, ok, BffHandler
const C_MDM_FACADE = '_102034_/l1/mdm/layer_3_usecases/mdmFacade.ts';                 // ctx.mdm (master data) — 21KB
const C_RUNTIME = '_102034_/l1/server/layer_1_external/data/runtime.ts';             // IDataRuntime / ctx.data.getTable CRUD
const C_PERSISTENCE = '_102034_/l1/server/layer_1_external/persistence/contracts.ts'; // TableDefinition
const C_REGISTRY = '_102034_/l1/server/layer_2_application/repositoryRegistry.ts';    // register/resolveRepository

export const CONTRACTS_102034: readonly string[] = [C_CONTRACTS, C_MDM_FACADE, C_RUNTIME, C_PERSISTENCE, C_REGISTRY];

// T5: the fixed 37.6KB bundle (mdmFacade.ts alone is 21KB) went into EVERY materialize prompt — a port
// (pure interface) got 12k input tokens for a 240-token output. Give each artifact type only the
// contracts it compiles against: a domain entity / repository port use ZERO platform types (their sole
// dependency, the entity .d.ts, arrives via dependsFiles), and mdmFacade is carried ONLY by a usecase
// that references MDM. Guard: the compile gate (cross-project fidelity, 24/07) is the detector — if a
// layer starts erroring for a missing contract, add that file back to its case here (evidence, not guess).
// (Adapters keep contracts.ts because the generated adapters import AppError/RequestContext from it.)
function contracts102034ForType(artifactType: string | undefined, hasMdmRefs: boolean): string[] {
  switch (artifactType) {
    case 'domainEntity':
    case 'valueObject':
    case 'domainService':
    case 'domainRule':
    case 'domainEvent':
    case 'repositoryPort':
      return [];
    case 'persistenceTable':
    case 'persistenceMetricTable':
    case 'persistenceSeeds':
      return [C_PERSISTENCE];
    case 'repositoryAdapter':
      return [C_CONTRACTS, C_RUNTIME, C_PERSISTENCE, C_REGISTRY];
    case 'applicationUsecase':
    case 'applicationService':
      return hasMdmRefs ? [C_CONTRACTS, C_REGISTRY, C_MDM_FACADE] : [C_CONTRACTS, C_REGISTRY];
    case 'httpController':
    case 'httpRoute':
      return [C_CONTRACTS];
    default:
      return [...CONTRACTS_102034]; // unknown type -> full bundle (never starve an unmapped artifact)
  }
}

// Map a single context ref to the real file ref(s) to read. Pure (ref -> refs); the caller does the I/O.
// artifactType/hasMdmRefs scope the `_102034_.d.ts` alias to the per-layer subset (T5); other refs pass through.
export function expandContextRef(ref: string, artifactType?: string, hasMdmRefs = false): string[] {
  return ref === '_102034_.d.ts' ? contracts102034ForType(artifactType, hasMdmRefs) : [ref];
}
