/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/materialize/agentCbMaterialize.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Materialize the generated .defs.ts -> .ts INSIDE the flow (after cb-gen-http), sharing the SAME pure
// core (cbMaterializeCore.ts) used by the Node CLI (l1/cbMaterializeCli/nodejsMaterializeL1.ts) — only
// the transport (prompt_ready vs HTTP) and storage (saveGeneratedTs vs fs) differ. Runs PARALLEL PER LAYER:
// the DISPATCHER groups the stale items by core.layerRank and emits ONE parallel_dynamic step per layer
// (domain -> port/table -> adapter/usecase -> controller), each depending on the previous layer's
// planId so an outer layer never materializes before the inner .ts it imports exists; cb-gen-seeds joins
// on the last layer. Each WORKER (same agent, reached with its defRef in hook.args) does one LLM call
// and saves one .ts. The CLI remains usable offline; this is the in-studio equivalent.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  scanL1DefsWithPipeline, getContentByMlsPath, getFileModified, saveGeneratedTs, parseMlsPath,
  extractToolCallArgs,
} from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import {
  readBackendScan, createPromptReadyIntent, createUpdateStatusIntent, createAgentStepPayload,
  createAddStepIntent, createParallelStepIntent, isRecord, readStringArray, logPrefix,
  repositoryPortFileInfo, domainEntityFileInfo, dtsRef,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import {
  parseDefs, layerRank, isStale, buildSystemPrompt, buildHumanPrompt, applyHeader,
  expandContextRef, buildMicroRepairPrompt, isCompilerFinding, GEN_TOOL, GEN_TOOL_NAME, DEFAULT_MODEL_TYPE, type PipelineItem,
} from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import {
  readRepairState, getComponentRepair, recordComponentFailure, clearComponentRepair,
  buildRepairPromptSection, forceDefsStale, saveHealthReport, recordLlmCost, COMPONENT_REPAIR_BUDGET, type CbRepairState,
} from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { collectRawMdmAccessIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbMdmGuards.js';
import {
  collectL1Imports, collectRelativeImportIssues, escapeRegExp, fieldNameFromRef, requiredBoundaryFields, collectRequiredChecksByHandler,
  collectExportedHandlers, collectRouteHandlers, collectUsecaseRules, normalizeRuleId,
  extractInterfaceMethods, collectRepositoryMethodMisuse, collectInventedRelationshipKeyIssues,
  portsMissingFromDependsFiles, collectDetailsDefaultingIssues,
} from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';

const AGENT_NAME = 'agentCbMaterialize';

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/materialize', agentDescription: 'Materialize .defs.ts -> .ts (parallel per layer; shares the CLI core)', visibility: 'private', beforePromptStep, afterPromptStep };
}

// A WORKER invocation carries its defRef in hook.args (or step.prompt on later hooks) — a bare mls path,
// never starting with '{'. The DISPATCHER step carries a JSON prompt ({planId:...}). Resolve args first.
function workerDefRef(args: string | undefined, step: mls.msg.AIAgentStep): string {
  const a = (args ?? '').trim();
  if (a && !a.startsWith('{')) return a;
  const p = String((step as { prompt?: string })?.prompt ?? '').trim();
  return p && !p.startsWith('{') ? p : '';
}

interface DefsEntry { defRef: string; item: PipelineItem; }

// Scan every l1 .defs.ts of the (single) module and pair it with its pipeline item + defs mls path.
async function scanEntries(context: mls.msg.ExecutionContext): Promise<DefsEntry[]> {
  const project = mls.actualProject || 0;
  const scan = await readBackendScan(['toCreate', 'inProgress'], context);
  const moduleName = scan.moduleNames[0] || 'unknown';
  const files = await scanL1DefsWithPipeline(project, moduleName);
  const entries: DefsEntry[] = [];
  for (const f of files) {
    const item = f.pipeline[0];
    if (item && item.outputPath) entries.push({ defRef: `_${project}_/l1/${f.folder}/${f.shortName}.defs.ts`, item });
  }
  return entries;
}

// Output is stale when missing, older than its defs, OR older than any generated internal dependency.
// This makes staleness transitive: a regenerated entity invalidates importing usecases/controllers.
function entryIsStale(project: number, defRef: string, item: PipelineItem): boolean {
  const d = parseMlsPath(defRef);
  const o = parseMlsPath(item.outputPath);
  const defsMs = d ? getFileModified(d.project, d.level, d.folder, d.shortName, '.defs.ts') : null;
  const tsMs = o ? getFileModified(o.project, o.level, o.folder, o.shortName, '.ts') : null;
  const dependencyTimes = (item.dependsFiles ?? []).map(ref => parseMlsPath(ref.replace(/\.d\.ts$/u, '.ts')))
    .map(path => path ? getFileModified(path.project, path.level, path.folder, path.shortName, '.ts') : null)
    .filter((value): value is number => value !== null);
  const inputMs = Math.max(defsMs ?? -1, ...dependencyTimes);
  return isStale(inputMs < 0 ? null : inputMs, tsMs);
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const defRef = workerDefRef(args, step);
  return defRef
    ? worker(agent, context, parentStep, step, hookSequential, defRef)
    : dispatch(agent, context, parentStep, step, hookSequential);
}

// DISPATCHER (deterministic, no LLM): one parallel_dynamic step per layer, chained by dependsOn so the
// runtime materializes inner layers before outer ones; cb-gen-seeds joins the last layer.
async function dispatch(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const project = mls.actualProject || 0;
    const entries = await scanEntries(context);
    const allStale = entries.filter(e => entryIsStale(project, e.defRef, e.item));
    // Materialize ONE layer per dispatch. The runtime's addParallelArgs forces a parallel parent to
    // in_progress and enqueues its children the moment the add-step is applied, so a `dependsOn`
    // between two parallel steps created together is NOT a real barrier — every layer would start at
    // once (the observed cb-mat-controllers running while cb-mat-usecases was still 13/18). Instead we
    // spawn ONLY the innermost stale layer now, then a SEQUENTIAL continue-dispatcher that waits
    // (waiting_dependency) on that layer's planId and re-runs this dispatch after the layer TRULY
    // finishes — the same proven barrier as cb-usecase-fanout -> cb-gen-http. dispatch is idempotent:
    // the just-materialized .ts stop being stale, so the next call spawns the next layer, and finally
    // cb-gen-seeds when nothing is stale.
    // minRank: the continue-dispatcher advances STRICTLY forward (rank+1). REPAIR EXCEPTION: a stale
    // entry BELOW minRank whose worker failed with repair budget left (cbRepair state) IS re-included —
    // it gets a fresh parallel layer under a UNIQUE planId (attempt suffix), with the findings fed back
    // into the worker prompt. Budget exhausted -> skipped as before (cb-validate-all catches it and can
    // trigger ONE global repair round). This is the in-flow repair loop; the engine is untouched.
    let minRank = 0;
    let repairMode = false;
    let preSeeds = false;
    try {
      const p = JSON.parse(String(step.prompt || '{}'));
      if (p && typeof p.minRank === 'number') minRank = p.minRank;
      if (p && p.repair === true) repairMode = true;
      if (p && p.preSeeds === true) preSeeds = true;
    } catch { /* defaults */ }
    const repairState: CbRepairState = await readRepairState();
    await saveHealthReport({
      outcome: 'materialize-dispatch',
      stale: allStale.map(entry => entry.defRef),
      pendingRepairs: Object.values(repairState.componentRepairs).map(entry => ({ target: entry.target, attempts: entry.attempts, findings: entry.findings.slice(0, 3) })),
      minRank,
      repairMode,
    });
    const repairable = (defRef: string): boolean => {
      const entry = repairState.componentRepairs[defRef];
      return !!entry && entry.attempts > 0 && entry.attempts <= COMPONENT_REPAIR_BUDGET;
    };
    const byRank = new Map<number, DefsEntry[]>();
    for (const e of allStale) {
      const r = layerRank(e.item.type);
      if (r < minRank && !repairable(e.defRef)) {
        const entry = await recordComponentFailure(e.defRef, ['output .ts absent or stale after its layer already advanced'], undefined, 'component-validate');
        repairState.componentRepairs[e.defRef] = entry;
      }
      if (r < minRank && !repairable(e.defRef)) continue;
      let bucket = byRank.get(r);
      if (!bucket) { bucket = []; byRank.set(r, bucket); }
      bucket.push(e);
    }
    // Unique planId suffixes across repair rounds/attempts (a planId must never repeat in the task).
    const gSuffix = repairState.globalAttempts > 0 ? `-g${repairState.globalAttempts}` : '';
    const roundArgs = repairMode ? { repair: true, ...(preSeeds ? { preSeeds: true } : {}) } : {};
    const endStep = (dependsOn: string[]): mls.msg.AgentIntentAddStep => repairMode
      // Repair round: defs did not change, so seeds/register are still valid — go straight back to the
      // integrity barrier (unique planId per round).
      ? createAddStepIntent(context, parentStep, createAgentStepPayload(`cb-validate-all${gSuffix}`, 'agentCbValidateAll', 'Validar artefatos l1 (repair)', { planId: `cb-validate-all${gSuffix}`, ...(preSeeds ? { preSeeds: true } : {}) }, dependsOn, 'sequential', 'waiting_dependency'))
      : createAddStepIntent(context, parentStep, createAgentStepPayload('cb-validate-before-seeds', 'agentCbValidateAll', 'Validar integridade l1 antes dos seeds', { planId: 'cb-validate-before-seeds', preSeeds: true }, dependsOn, 'sequential', 'waiting_dependency'));
    if (byRank.size === 0) {
      // No more layers to materialize from minRank up -> seeds (or the repair-round barrier).
      return [
        endStep([]),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `nothing stale to materialize (from L${minRank})`),
      ];
    }
    const ranksSorted = [...byRank.keys()].sort((a, b) => a - b);
    const remainingLayers = ranksSorted.length;
    const rank = ranksSorted[0];
    const bucket = byRank.get(rank)!;
    const maxAttempt = Math.max(0, ...bucket.map(e => repairState.componentRepairs[e.defRef]?.attempts ?? 0));
    const rSuffix = maxAttempt > 0 ? `-r${maxAttempt}` : '';
    const planId = `cb-mat-L${rank}${gSuffix}${rSuffix}`;
    const refs = bucket.map(e => e.defRef);
    const pendingRepairCount = Object.values(repairState.componentRepairs).filter(entry => entry.attempts > 0).length;
    // Content-based progress label (clearer than "Materializar L0/L1"): name the artifacts in this layer.
    const label = layerLabel([...new Set(bucket.map(e => e.item.type))]);
    const intents: mls.msg.AgentIntent[] = [
      // Current layer starts now (its inner layers are already materialized -> no dependsOn needed).
      createParallelStepIntent(context, parentStep, planId, AGENT_NAME, `Materializar ${label} {{completed}}/{{total}} (repairs no trace)`, refs, [], 10),
    ];
    if (remainingLayers > 1) {
      // More layers to go: a continue-dispatcher runs ONLY after this layer completes (real barrier),
      // then re-dispatches (minRank = rank+1) to spawn the next outer stale layer. Title names the NEXT
      // layer's content (not a generic "próxima camada") so the step list stays readable.
      const nextRank = ranksSorted[1];
      const nextLabel = layerLabel([...new Set(byRank.get(nextRank)!.map(e => e.item.type))]);
      // args carry the attempt/round so the runtime's hook dispatch key (unique args) never repeats
      // across repair re-dispatches of the same rank.
      intents.push(createAddStepIntent(context, parentStep, createAgentStepPayload(`cb-mat-after-L${rank}${gSuffix}${rSuffix}`, AGENT_NAME, `Materializar ${nextLabel}`, { planId: 'cb-materialize', minRank: rank + 1, att: maxAttempt, g: repairState.globalAttempts, ...roundArgs }, [planId], 'sequential', 'waiting_dependency')));
    } else {
      // Last stale layer: seeds (or the repair-round barrier) runs after it materializes. A same-layer
      // repair of THIS layer, if needed, reaches a later dispatch through the validate-all repair round.
      intents.push(endStep([planId]));
    }
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `materializing ${label} (${refs.length} file(s)); ${pendingRepairCount} repair(s) pending before this layer; ${remainingLayers - 1} layer(s) after`));
    return intents;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${msg}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', msg)];
  }
}

// Human, content-based name for a materialization layer's progress title (replaces "L0/L1/…").
const ARTIFACT_LABEL: Record<string, string> = {
  domainEntity: 'entidades de domínio',
  repositoryPort: 'ports',
  persistenceTable: 'tabelas',
  repositoryAdapter: 'adapters',
  applicationUsecase: 'usecases',
  httpController: 'controllers',
};
function layerLabel(types: string[]): string {
  const names = types.map(t => ARTIFACT_LABEL[t] || t);
  return names.length ? names.join(' + ') : 'artefatos';
}

// Read a context/skill ref, falling back from .d.ts to its generated .ts sibling (mirrors the CLI).
async function readContextRef(ref: string): Promise<string | null> {
  const direct = await getContentByMlsPath(ref);
  if (direct != null) return direct;
  if (ref.endsWith('.d.ts')) {
    const fallback = await getContentByMlsPath(ref.replace(/\.d\.ts$/u, '.ts'));
    if (fallback != null) return fallback;
  }
  // A dependsFiles entry that cannot be read is SILENTLY dropped from the prompt by the caller, so the
  // model generates against an incomplete contract with nothing on the record. Observed in 102045/run06:
  // all 22 `l4/<module>/contracts/*.defs.ts` refs failed (the stor entry exists with versionRef "0" — never
  // pushed — so getContent falls through to the GitHub blob API and 422s), and every workspace controller
  // was materialized WITHOUT its wire contract. Log it; do not fail the worker (a missing context is
  // degraded input, not a broken artifact).
  console.warn(`[agentCbMaterialize] context ref unreadable, prompt will omit it: ${ref}`);
  return null;
}

/** Deterministic repository-method gate for a usecase .ts: for every `resolveRepository<IXRepository>`
 * in the code, load the port source (already materialized — usecases depend on their ports) and flag
 * any call to a method the port does not declare. Ports that cannot be resolved are skipped (no false
 * positive). Precise findings (the port's real methods) let the repair loop fix append-only vs CRUD
 * mismatches deterministically instead of re-guessing (run14: createStockAdjustment save/create). */
async function repositoryMethodIssues(code: string, module: string): Promise<string[]> {
  const interfaces = new Set<string>();
  const ifaceRe = /resolveRepository\s*<\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*>/g;
  let m: RegExpExecArray | null;
  while ((m = ifaceRe.exec(code)) !== null) interfaces.add(m[1]);
  if (!interfaces.size) return [];
  const methodsByInterface = new Map<string, Set<string>>();
  for (const iface of interfaces) {
    const entity = iface.replace(/^I/u, '').replace(/Repository$/u, '');
    if (!entity) continue;
    const src = await readContextRef(dtsRef(repositoryPortFileInfo(module, entity)));
    if (src == null) continue; // port source not resolvable -> skip (no false positive)
    const methods = extractInterfaceMethods(src, iface);
    if (methods.size) methodsByInterface.set(iface, methods);
  }
  return collectRepositoryMethodMisuse(code, methodsByInterface);
}

/** A parallel child must complete for the layer barrier, but every pre-prompt failure still needs a
 * repair record. A storage failure is made explicit in the child trace instead of being silent. */
async function completeWorkerFailure(
  context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep,
  hookSequential: number, defRef: string, message: string,
): Promise<mls.msg.AgentIntent[]> {
  let trace = `[repair] ${message}`;
  try {
    const entry = await recordComponentFailure(defRef, [message]);
    trace += ` (attempt ${entry.attempts}/${COMPONENT_REPAIR_BUDGET + 1})`;
  } catch (error) {
    const persistence = error instanceof Error ? error.message : String(error);
    trace += `; REPAIR STATE ERROR: ${persistence}`;
    await saveHealthReport({ outcome: 'repair-state-error', defRef, message, persistence });
  }
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
}

// WORKER: assemble the prompt for ONE defs file with the shared core and ask the model for the .ts.
async function worker(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, defRef: string): Promise<mls.msg.AgentIntent[]> {
  // NB: worker children never return 'failed' (a failed step does not satisfy dependsOn and would
  // stall the layer barrier); the missing .ts is reported by cb-validate-all.
  let content: string | null;
  try {
    content = await getContentByMlsPath(defRef);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return completeWorkerFailure(context, parentStep, step, hookSequential, defRef, `could not read defs: ${message}`);
  }
  if (!content) return completeWorkerFailure(context, parentStep, step, hookSequential, defRef, 'defs not found');
  try {
    const parsed = parseDefs(content);
    if (!parsed.item || !parsed.item.outputPath) return completeWorkerFailure(context, parentStep, step, hookSequential, defRef, 'no pipeline item in defs');

    // T5: scope the platform-contracts bundle to what THIS artifact type compiles against (a domain
    // entity / port carry none; mdmFacade only for a usecase that references MDM). Big input-token cut.
    const artifactType = parsed.item.type;
    const hasMdmRefs = Array.isArray((parsed.data as { mdmRefs?: unknown })?.mdmRefs)
      && ((parsed.data as { mdmRefs: unknown[] }).mdmRefs).length > 0;
    const skillSections: string[] = [];
    for (const s of parsed.item.skills ?? []) {
      for (const real of expandContextRef(s, artifactType, hasMdmRefs)) {
        const c = await getContentByMlsPath(real);
        if (c != null) skillSections.push(`<!-- skill: ${real} -->\n${c}`);
      }
    }
    const contextSections: string[] = [];
    for (const d of parsed.item.dependsFiles ?? []) {
      for (const real of expandContextRef(d, artifactType, hasMdmRefs)) {
        const c = await readContextRef(real);
        if (c != null) contextSections.push(`### ${real}\n\`\`\`ts\n${c}\n\`\`\``);
      }
    }
    // T12 SAFETY BELT: a usecase resolves every port its defs `data` names, but only `dependsFiles`
    // reaches the prompt. If the two disagree (derivation gap — erro4/erro5 createStockAdjustment), the
    // model has to GUESS the port interface and the entity shape: it invented `updatedAt`, called a
    // non-existent save(), then omitted required fields across three attempts. Load the missing
    // port+entity pair here so the prompt is complete regardless of how the defs were derived. Only ids
    // the defs itself names (never the whole module) — T5's context savings hold; a pair is ~1-3KB.
    const moduleName = parseMlsPath(parsed.item.outputPath)?.folder.split('/')[0] || '';
    if (moduleName) {
      for (const entityId of portsMissingFromDependsFiles(parsed.data, parsed.item.dependsFiles ?? [])) {
        for (const ref of [dtsRef(repositoryPortFileInfo(moduleName, entityId)), dtsRef(domainEntityFileInfo(moduleName, entityId))]) {
          const c = await readContextRef(ref);  // null when the pair does not exist -> silently skipped
          if (c != null) contextSections.push(`### ${ref}\n\`\`\`ts\n${c}\n\`\`\``);
        }
      }
    }
    // REPAIR: when a previous attempt was rejected (component validation / validate-all round), feed the
    // exact findings + the rejected code back so the model fixes them instead of re-rolling the dice.
    const repair = await getComponentRepair(defRef);
    // T4 MICRO-REPAIR: if EVERY finding is a compiler error on an already-generated .ts, use a surgical
    // prompt (current code + errors + dependsFiles types + type-pitfalls skill) instead of the full
    // ~15-25k re-materialization. Same tool + same post-gen gates — only the INPUT shrinks (~5k). A
    // structural finding (hallucinated import, missing route, rulesApplied gone) keeps the full path,
    // where the complete skills/contracts context matters.
    if (repair && repair.findings.length && repair.findings.every(isCompilerFinding)) {
      const currentCode = await getContentByMlsPath(parsed.item.outputPath);
      if (currentCode) {
        const pitfalls = await getContentByMlsPath('_102021_/l2/agentChangeBackend/skills/typePitfalls.md');
        const micro = buildMicroRepairPrompt({ outputPath: parsed.item.outputPath, code: currentCode, findings: repair.findings, contextSections, pitfalls });
        return [createPromptReadyIntent(context, parentStep, hookSequential, defRef, micro.system, micro.human, GEN_TOOL as unknown as mls.msg.LLMTool, GEN_TOOL_NAME)];
      }
    }
    const system = buildSystemPrompt(skillSections, parsed.item.outputPath, DEFAULT_MODEL_TYPE);
    let human = buildHumanPrompt(parsed.data, contextSections, parsed.item.outputPath);
    if (repair && repair.findings.length) human += `\n\n${buildRepairPromptSection(repair)}`;
    // prompt_ready args MUST equal the parallel child's queued hook args (the defRef) so the runtime
    // (continueBeforePrompt -> findBeforePromptStep by parentStepId+args) matches it.
    return [createPromptReadyIntent(context, parentStep, hookSequential, defRef, system, human, GEN_TOOL as unknown as mls.msg.LLMTool, GEN_TOOL_NAME)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return completeWorkerFailure(context, parentStep, step, hookSequential, defRef, `could not prepare materialization prompt: ${message}`);
  }
}

function existingTsKeys(project: number, currentKey: string): Set<string> {
  const keys = new Set<string>([currentKey]);
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    const shortName = String(file.shortName || '');
    if (file.extension === '.ts' && !shortName.endsWith('.defs') && !shortName.endsWith('.d')) {
      keys.add(`${String(file.folder || '')}::${shortName.toLowerCase()}`);
    }
  }
  return keys;
}

function lowerFirstLocal(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function validateUsecaseComponent(project: number, data: unknown, code: string, tsKeys: Set<string>): string[] {
  const issues: string[] = [];
  const mdmRefs = new Set(isRecord(data) ? readStringArray(data.mdmRefs).map(ref => ref.toLowerCase()) : []);
  for (const req of collectL1Imports(code, project)) {
    if (!tsKeys.has(req.key)) issues.push(`import unresolved -> imports '${req.target}' which was not generated`);
    for (const mdmRef of mdmRefs) {
      const entityPath = `/entities/${lowerFirstLocal(mdmRef)}`;
      const portPath = `/ports/${lowerFirstLocal(mdmRef)}Repository`;
      const lowerTarget = req.target.toLowerCase();
      if (lowerTarget.includes(entityPath.toLowerCase()) || lowerTarget.includes(portPath.toLowerCase())) {
        issues.push(`mdm local import forbidden -> ${req.target}`);
      }
    }
  }
  if (/\/_\d+_\/l1\/[^'"]*\/layer_3_domain\/rules\//.test(code)) {
    issues.push('rulesApplied must be applied inline; layer_3_domain/rules/* is not generated');
  }
  const compact = code.replace(/\s+/g, ' ');
  if (/mdmEntityIndex\.findMany\(\s*\{[^}]*where\s*:\s*\{[^}]*\b(entityType|entityId|productId|warehouseId)\s*:/.test(compact)) {
    issues.push('mdmEntityIndex uses invented fields; use MdmEntityIndexRecord fields and load module data from mdmDocument.details');
  }
  if (/mdmRelationship/.test(code) && /\b(source_entity_|target_entity_)/.test(code)) {
    issues.push('mdmRelationship uses invented source_entity/target_entity fields; use MdmRelationshipRecord fromId/toId/type');
  }
  issues.push(...collectInventedRelationshipKeyIssues(code));
  for (const rule of collectUsecaseRules(data)) {
    if (!new RegExp(`\\b${escapeRegExp(rule)}\\b`).test(code)) {
      issues.push(`rulesApplied '${rule}' not present in generated .ts`);
    }
  }
  return issues;
}

function validateControllerComponent(data: unknown, code: string): string[] {
  const issues: string[] = [];
  if (!isRecord(data)) return issues;
  const handlers = Array.isArray((data as any).handlers) ? (data as any).handlers.filter(isRecord) : [];
  const routes = Array.isArray((data as any).routes) ? (data as any).routes.filter(isRecord) : [];
  const handlerNames = new Set(handlers.map((h: any) => String(h.handlerName || '')).filter(Boolean));
  const exportedHandlers = collectExportedHandlers(code);
  const emittedRoutes = collectRouteHandlers(code);
  const requiredChecks = collectRequiredChecksByHandler(code);

  for (const handler of handlers) {
    const handlerName = String((handler as any).handlerName || '');
    if (!handlerName) continue;
    if (!exportedHandlers.has(handlerName)) issues.push(`handler ${handlerName} not exported in .ts`);
    const allowedRequired = requiredBoundaryFields((handler as any).inputContract);
    for (const checked of requiredChecks.get(handlerName) ?? []) {
      if (!allowedRequired.has(checked)) issues.push(`handler ${handlerName} requires '${checked}' outside l4 inputContract`);
    }
  }
  for (const route of routes) {
    const key = String((route as any).key || '');
    const handlerName = String((route as any).handlerName || '');
    if (!key || !handlerName) continue;
    if (!handlerNames.has(handlerName)) issues.push(`route ${key} points to missing handler ${handlerName}`);
    if (emittedRoutes.get(key) !== handlerName) issues.push(`route ${key} not exported with handler ${handlerName}`);
  }
  return issues;
}

function validateGeneratedComponent(project: number, item: PipelineItem, data: unknown, code: string, currentKey: string): string[] {
  const tsKeys = existingTsKeys(project, currentKey);
  const issues = collectRawMdmAccessIssues(code);
  // Every component type: alias imports only. Rejecting here (repair finding) stops the model from
  // "fixing" an unresolved alias import by switching to a relative path (run task2/102049).
  issues.push(...collectRelativeImportIssues(code));
  if (item.type === 'applicationUsecase') issues.push(...validateUsecaseComponent(project, data, code, tsKeys));
  if (item.type === 'httpController') issues.push(...validateControllerComponent(data, code));
  // Adapters own the `details` JSONB envelope: reject parse-without-merge (the 500-on-read class).
  if (item.type === 'repositoryAdapter') issues.push(...collectDetailsDefaultingIssues(code));
  return issues;
}

// afterPromptStep (worker only): take the generated code from the tool call and save the .ts.
// ENGINE SEMANTICS (observed 2026-07-04, run task1): a FAILED step does NOT satisfy dependsOn — when
// cb-mat-L4 failed (3 workers), cb-mat-after-L4 stayed waiting_dependency forever and the task died
// without repair or report. So a worker failure NEVER fails the child step: it is recorded in
// cb-repair-state (LLM-fixable classes) + surfaced as a "[repair]" trace, the step COMPLETES so the
// layer barrier advances, the dispatcher re-spawns the repairable components, and cb-validate-all
// remains the blocking gate for whatever did not converge.
async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  await recordLlmCost('materialize', step.interaction); // T7: per-phase cost telemetry (best-effort)
  let trace: string | undefined;
  try {
    const defRef = workerDefRef(args, step);
    if (!defRef) throw new Error('worker afterPrompt without defRef');
    const content = await getContentByMlsPath(defRef);
    const parsed = content ? parseDefs(content) : null;
    const item = parsed?.item ?? null;
    if (!item || !item.outputPath) throw new Error(`no pipeline item in ${defRef}`);

    const payload = step.interaction?.payload?.[0];
    const out = extractToolCallArgs<{ code?: string }>(payload, GEN_TOOL_NAME);
    if (!out?.code) {
      // Distinguish LLM INFRA failures (proxy/credit/rate errors — the call never produced a payload)
      // from a model that answered without the tool call. Both burn a repair attempt (an out-of-credit
      // retry fails identically — the budget is the anti-loop), but the finding must tell the truth:
      // run f burned its whole budget on "model returned no code" when the real cause was
      // 402 insufficient credit.
      const infra = (step.interaction?.trace ?? []).map(String)
        .filter(t => t.includes('Error invoking Collab LLM proxy') || t.includes('Error executing AI task')).slice(-1)[0];
      const message = infra
        ? `LLM infra failure (no payload): ${infra.slice(0, 300)}`
        : 'model returned no code (missing/invalid tool call)';
      const entry = await recordComponentFailure(defRef, [message]);
      throw new Error(`${infra ? 'LLM infra failure' : 'missing generated code'} (attempt ${entry.attempts}/${COMPONENT_REPAIR_BUDGET + 1})`);
    }

    const code = applyHeader(item.outputPath, out.code);
    const p = parseMlsPath(item.outputPath);
    if (!p) throw new Error(`invalid outputPath: ${item.outputPath}`);
    const componentIssues = validateGeneratedComponent(p.project, item, parsed?.data, code, `${p.folder}::${p.shortName.toLowerCase()}`);
    if (item.type === 'applicationUsecase') {
      // Deterministic port-method gate (append-only vs CRUD). Async (loads the port source), so it runs
      // here rather than inside the sync validateGeneratedComponent.
      componentIssues.push(...await repositoryMethodIssues(code, p.folder.split('/')[0]));
    }
    if (componentIssues.length) {
      // REPAIR LOOP: keep the findings + the rejected code; the dispatcher re-spawns this worker with
      // them in context while the budget lasts (cbRepair). Budget exhausted -> stays failed and the
      // validate-all barrier reports it precisely (clean failure).
      const entry = await recordComponentFailure(defRef, componentIssues, code);
      throw new Error(`component integrity failed (attempt ${entry.attempts}/${COMPONENT_REPAIR_BUDGET + 1}): ${componentIssues.slice(0, 8).join('; ')}`);
    }
    const saved = await saveGeneratedTs(p.project, p.level, p.folder, p.shortName, code);
    if (!saved.ok) {
      const entry = await recordComponentFailure(defRef, ['saveGeneratedTs failed before output could be persisted'], code);
      throw new Error(`saveGeneratedTs failed (attempt ${entry.attempts}/${COMPONENT_REPAIR_BUDGET + 1})`);
    }
    if (saved.compileErrors.length) {
      const repairEntry = await getComponentRepair(defRef);
      // Syntax findings are intra-file and deterministic — never false, so they gate IMMEDIATELY
      // even on the first pass (run 102049-g: a deferred TS5076 '||'/'??' mix survived to the end).
      if (repairEntry || saved.syntaxErrors.length) {
        // REPAIR RETRY (compiler in the loop, spec item 11): on a retry every dependency is already
        // materialized, so compiler findings are real. Record errors + code and force the pair stale
        // so the dispatcher re-spawns this worker with the errors in the prompt; budget exhausted ->
        // the pair STAYS stale and cb-validate-all's staleness finding blocks the run.
        const entry = await recordComponentFailure(defRef, saved.compileErrors.map(e => `compiler: ${e}`), code);
        forceDefsStale(defRef);
        throw new Error(`compile failed (attempt ${entry.attempts}/${COMPONENT_REPAIR_BUDGET + 1}): ${saved.compileErrors.slice(0, 4).join('; ')}`);
      }
      // FIRST PASS (layer sweep) — user decision 2026-07-17 (run 102049-e): compile findings here can
      // be FALSE (siblings/other layers still materializing), so the compile gate is DEFERRED: the .ts
      // stays saved and cb-validate-all's whole-project compile re-checks with every file present,
      // routing REAL errors to the global repair rounds. Content checks above remain immediate gates.
      trace = `[compile-deferred] ${saved.compileErrors.length} error(s) — re-checked by validate-all: ${saved.compileErrors.slice(0, 3).join('; ')}`;
    }
    if (!saved.compilerAvailable) {
      trace = `[infra] Monaco compiler unavailable for ${defRef}; deterministic syntax checks passed, project gate remains required`;
      await saveHealthReport({ outcome: 'materialize-infra-warning', defRef, compilerAvailable: false, message: trace });
    }
    await clearComponentRepair(defRef); // converged: drop the repair record
  } catch (error) {
    // No console output: repair is an expected, handled path. The trace below lands on the step, the
    // findings live in cb-repair-state, and cb-validate-all is where a real failure surfaces.
    trace = `[repair] ${error instanceof Error ? error.message : String(error)}`;
  }
  // No enqueueNext: cb-gen-seeds was queued by the dispatcher with a join dependsOn on the last layer.
  // Always 'completed' (see engine-semantics note above): the trace carries the failure, the repair
  // state carries the routing, and cb-validate-all carries the enforcement.
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
}
