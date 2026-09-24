/// <mls fileReference="_102021_/l2/agentChangeBackend/agentSpecBackend.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  createAddStepIntent, createAgentStepPayload, createParallelStepIntent, createUpdateStatusIntent, CB_MAX_PARALLEL,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { fileIsPresent, getFileModified, parseMlsPath } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { isDeterministicMaterializeType, parseDefs, type PipelineItem } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import { getComponentRepair } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { setCbTraceModule } from '/_102021_/l2/agentChangeBackend/helpers/cbTraceScope.js';

/**
 * Batch materialization of the level-1 `.defs.ts` of the CURRENT project — the backend mirror of
 * agentSpecFrontend (_102020_/l2/agentChangeFrontend/agentSpecFrontend.ts).
 *
 * It does NOT read todoBackend, does not reset owners and does not chain seeds/validate-all: the
 * selection is the stor itself, and the only thing dispatched is the `agentCbMaterialize` WORKER (a
 * parallel child whose hook args are the bare defRef — the same slot the CB dispatcher fans out).
 *
 * Layers come from the pipeline `dependsOn` (an item runs after every queued item it depends on), not
 * from a type table: the l1 written by agentDefsL1 uses types (`usecase`, `table`, `accessScope`…)
 * that cbMaterializeCore.LAYER_RANK does not know, and would all rank 99 together.
 *
 * The barrier is the CB one (agentCbMaterialize.dispatch): a `parallel_dynamic` step starts the moment
 * it gets its args, so a `dependsOn` between two parallel steps is ignored. Each layer is therefore
 * opened by a SEQUENTIAL step of this agent that waits on the previous layer's planId; after the last
 * layer a final step checks every queued `.ts` and reports what was not generated and why.
 */

export const SKIP_UP_TO_DATE = 'up to date';
export const SKIP_MAX_VS_MAX = 'MAX vs MAX (ambos com edicao nao salva)';
export const SKIP_NO_PIPELINE = 'sem pipeline';
export const SKIP_DETERMINISTIC = 'seeds: compilado pelo agentCbSeeds, nao pelo LLM';

export type SpecCommand =
  | { kind: 'scan'; scope: string }
  | { kind: 'target'; target: string }
  | { kind: 'error'; reason: string };

export interface SpecQueued { defRef: string; outputPath: string; folder: string; id: string; type: string; dependsOn: string[]; }
export interface SpecSkipped { defRef: string; reason: string; }
export interface SpecModulePlan { module: string; layers: SpecQueued[][]; skipped: SpecSkipped[]; }

export interface SpecPlanResult {
  /** A command error: reported, and NOTHING is executed. */
  error?: string;
  modules: SpecModulePlan[];
  report: string;
}

/** One layer of one module, in execution order — what the sequential steps walk through. */
interface SpecLayerRun { module: string; refs: string[]; label: string; index: number; total: number; }

interface SpecStepPrompt {
  mode: 'next' | 'final';
  cursor: number;
  runs: SpecLayerRun[];
  entries: Array<{ defRef: string; outputPath: string; module: string }>;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentSpecBackend',
    agentProject: 102021,
    agentFolder: 'agentChangeBackend',
    agentDescription: 'Materializa em lote os .defs.ts de level 1 do projeto atual, em camadas pela dependencia do pipeline. Seeds sao ignorados.',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

/** The current project, resolved ONCE and never defaulted (a `0` would scan nothing and "succeed"). */
export function resolveProject(): number {
  const project = mls.actualProject;
  if (!project) throw new Error('agentSpecBackend: sem projeto atual');
  return project;
}

/** `{"scope":"..."}` / `{"target":"..."}` after the @@ prefix; anything else is a full scan. */
export function parseSpecCommand(prompt: string): SpecCommand {
  const stripped = String(prompt || '')
    .trim()
    .replace(/^@@(?:agentSpecBackend|specBackend)(?:\s+|$)/iu, '')
    .trim();

  if (!stripped.startsWith('{')) return { kind: 'scan', scope: '' };

  let parsed: { scope?: unknown; target?: unknown };
  try {
    parsed = JSON.parse(stripped) as { scope?: unknown; target?: unknown };
  } catch {
    return { kind: 'error', reason: 'agentSpecBackend: JSON invalido.' };
  }

  const scope = typeof parsed?.scope === 'string' ? parsed.scope.trim() : '';
  const target = typeof parsed?.target === 'string' ? parsed.target.trim() : '';

  if (scope && target) {
    return { kind: 'error', reason: 'agentSpecBackend: "scope" e "target" nao podem vir juntos. Nada foi executado.' };
  }
  if (target) return { kind: 'target', target };
  return { kind: 'scan', scope };
}

/** Segment match, never raw text: `controleChamados` must not match `controleChamadosNovo`. */
export function matchesScope(folder: string, scope: string): boolean {
  if (!scope) return true;
  return folder === scope || folder.startsWith(`${scope}/`);
}

/** First segment of the l1 folder — the module every CB trace/repair file is scoped by. */
export function moduleOf(folder: string): string {
  return String(folder || '').split('/').filter(Boolean)[0] ?? '';
}

export function defRefOf(project: number, folder: string, shortName: string): string {
  return `_${project}_/l1/${folder ? `${folder}/` : ''}${shortName}.defs.ts`;
}

interface SpecCandidate { defRef: string; folder: string; item: PipelineItem | null; }

/** Every level-1 `.defs.ts` OF THIS PROJECT (the stor carries the whole closure) inside the scope. */
export async function selectL1Defs(project: number, scope = ''): Promise<SpecCandidate[]> {
  const selected: SpecCandidate[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file) continue;
    if (file.project !== project) continue;
    if (file.level !== 1) continue;
    if (file.extension !== '.defs.ts') continue;
    if (file.status === 'deleted') continue;
    const folder = String(file.folder || '');
    if (!matchesScope(folder, scope)) continue;
    const defRef = defRefOf(project, folder, String(file.shortName || ''));
    // The layer comes from the pipeline, so — unlike the frontend — the file has to be opened.
    let item: PipelineItem | null = null;
    try { item = parseDefs(String(await file.getContent())).item; } catch { item = null; }
    selected.push({ defRef, folder, item });
  }
  return selected.sort((a, b) => a.defRef.localeCompare(b.defRef));
}

/**
 * The time rule, per file (same as agentSpecFrontend): generate when the `.ts` is absent or older than
 * its `.defs.ts`. cbMaterializeCore.isStale only looks at absence; this agent is the "re-materialize
 * what changed" path, so the time decides here. `ignoreFreshness` is what `{"target":...}` buys.
 */
function freshness(defRef: string, outputPath: string): 'stale' | typeof SKIP_UP_TO_DATE | typeof SKIP_MAX_VS_MAX {
  const d = parseMlsPath(defRef);
  const o = parseMlsPath(outputPath);
  if (!d || !o) return 'stale';
  if (!fileIsPresent(o.project, o.level, o.folder, o.shortName, '.ts')) return 'stale';
  const defsMs = getFileModified(d.project, d.level, d.folder, d.shortName, '.defs.ts');
  const tsMs = getFileModified(o.project, o.level, o.folder, o.shortName, '.ts');
  if (tsMs == null) return 'stale';
  if (defsMs != null && defsMs > tsMs) return 'stale';
  return defsMs === Number.MAX_SAFE_INTEGER && tsMs === Number.MAX_SAFE_INTEGER ? SKIP_MAX_VS_MAX : SKIP_UP_TO_DATE;
}

/**
 * Layer = depth in the `dependsOn` graph restricted to the QUEUED items of the module: an item whose
 * dependencies are all already materialized (or outside the plan) is layer 0. A cycle does not hang
 * the plan — the item that closes it is placed at the depth reached so far.
 */
export function layerize(queued: SpecQueued[]): SpecQueued[][] {
  const byId = new Map(queued.map(item => [item.id, item]));
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (item: SpecQueued): number => {
    const known = depth.get(item.id);
    if (known !== undefined) return known;
    if (visiting.has(item.id)) return 0;
    visiting.add(item.id);
    let d = 0;
    for (const dep of item.dependsOn) {
      const target = byId.get(dep);
      if (target && target !== item) d = Math.max(d, depthOf(target) + 1);
    }
    visiting.delete(item.id);
    depth.set(item.id, d);
    return d;
  };
  const layers: SpecQueued[][] = [];
  for (const item of queued) {
    const d = depthOf(item);
    (layers[d] ??= []).push(item);
  }
  return layers.filter(layer => layer && layer.length > 0);
}

function planModules(candidates: SpecCandidate[], ignoreFreshness: boolean): SpecModulePlan[] {
  const byModule = new Map<string, { queued: SpecQueued[]; skipped: SpecSkipped[] }>();
  const bucket = (module: string) => {
    let entry = byModule.get(module);
    if (!entry) { entry = { queued: [], skipped: [] }; byModule.set(module, entry); }
    return entry;
  };

  for (const candidate of candidates) {
    const plan = bucket(moduleOf(candidate.folder));
    const item = candidate.item;
    if (!item || !item.outputPath) { plan.skipped.push({ defRef: candidate.defRef, reason: SKIP_NO_PIPELINE }); continue; }
    // Seeds are compiled deterministically by agentCbSeeds; the worker would only skip them.
    if (isDeterministicMaterializeType(item.type)) { plan.skipped.push({ defRef: candidate.defRef, reason: SKIP_DETERMINISTIC }); continue; }
    const verdict = ignoreFreshness ? 'stale' : freshness(candidate.defRef, item.outputPath);
    if (verdict !== 'stale') { plan.skipped.push({ defRef: candidate.defRef, reason: verdict }); continue; }
    plan.queued.push({
      defRef: candidate.defRef,
      outputPath: item.outputPath,
      folder: candidate.folder,
      id: item.id,
      type: item.type,
      dependsOn: Array.isArray(item.dependsOn) ? item.dependsOn : [],
    });
  }

  return [...byModule.keys()].sort().map(module => {
    const entry = byModule.get(module)!;
    return { module, layers: layerize(entry.queued), skipped: entry.skipped };
  });
}

function layerLabel(layer: SpecQueued[]): string {
  return [...new Set(layer.map(item => item.type))].join(' + ') || 'artefatos';
}

export function buildReport(modules: SpecModulePlan[]): string {
  const lines: string[] = ['agentSpecBackend'];
  const totalQueued = modules.reduce((sum, plan) => sum + plan.layers.reduce((n, layer) => n + layer.length, 0), 0);
  const totalSkipped = modules.reduce((sum, plan) => sum + plan.skipped.length, 0);
  lines.push(`enfileirados: ${totalQueued} | pulados: ${totalSkipped}`);

  for (const plan of modules) {
    const queued = plan.layers.reduce((n, layer) => n + layer.length, 0);
    if (queued === 0 && plan.skipped.length === 0) continue;
    lines.push('', `## ${plan.module} (${queued} enfileirado(s) em ${plan.layers.length} camada(s), ${plan.skipped.length} pulado(s))`);
    plan.layers.forEach((layer, index) => {
      lines.push(`### camada ${index + 1}: ${layerLabel(layer)}`);
      for (const item of layer) lines.push(`- enfileirado: ${item.defRef}`);
    });
    for (const item of plan.skipped) lines.push(`- pulado (${item.reason}): ${item.defRef}`);
  }

  if (modules.some(plan => plan.skipped.some(item => item.reason === SKIP_MAX_VS_MAX))) {
    lines.push('', 'Um arquivo em MAX vs MAX tem o .defs.ts e o .ts editados e nao salvos — a data nao arbitra.');
    lines.push('Para materializar assim mesmo: @@specBackend {"target":"<caminho do .defs.ts>"}');
  }
  if (totalQueued === 0) lines.push('', 'Nada a materializar.');
  return lines.join('\n');
}

/** Selection + time rule + layers + report. Throws only when there is no current project. */
export async function planSpecBackend(prompt: string): Promise<SpecPlanResult> {
  const project = resolveProject();
  const command = parseSpecCommand(prompt);

  if (command.kind === 'error') return { error: command.reason, modules: [], report: command.reason };

  if (command.kind === 'target') {
    const info = parseMlsPath(command.target);
    if (!info || !info.shortName) {
      const reason = `agentSpecBackend: target invalido: ${command.target}`;
      return { error: reason, modules: [], report: reason };
    }
    if (info.project !== project) {
      const reason = `agentSpecBackend: o target pertence ao projeto ${info.project}, nao ao projeto atual ${project}. Nada foi executado.`;
      return { error: reason, modules: [], report: reason };
    }
    if (info.level !== 1 || info.extension !== '.defs.ts') {
      const reason = `agentSpecBackend: o target precisa ser um .defs.ts de level 1: ${command.target}. Nada foi executado.`;
      return { error: reason, modules: [], report: reason };
    }
    const candidates = (await selectL1Defs(project, info.folder)).filter(c => c.defRef === defRefOf(project, info.folder, info.shortName));
    if (candidates.length === 0) {
      const reason = `agentSpecBackend: target nao encontrado no projeto: ${command.target}. Nada foi executado.`;
      return { error: reason, modules: [], report: reason };
    }
    const modules = planModules(candidates, true);
    return { modules, report: buildReport(modules) };
  }

  const modules = planModules(await selectL1Defs(project, command.scope), false);
  return { modules, report: buildReport(modules) };
}

/** Module A layer 1 -> module A layer 2 -> … -> module B layer 1 -> … */
function flattenRuns(modules: SpecModulePlan[]): SpecLayerRun[] {
  const runs: SpecLayerRun[] = [];
  for (const plan of modules) {
    plan.layers.forEach((layer, index) => {
      runs.push({ module: plan.module, refs: layer.map(item => item.defRef), label: layerLabel(layer), index: index + 1, total: plan.layers.length });
    });
  }
  return runs;
}

function stepPlanId(prompt: SpecStepPrompt): string {
  return prompt.mode === 'final' ? 'spec-cb-final' : `spec-cb-next-${prompt.cursor}`;
}

function layerPlanId(cursor: number): string {
  return `spec-cb-layer-${cursor}`;
}

function createSpecStep(prompt: SpecStepPrompt, dependsOn: string[]): mls.msg.AIAgentStep {
  const title = prompt.mode === 'final'
    ? 'Conferir .ts gerados'
    : `Abrir camada ${prompt.runs[prompt.cursor].index}/${prompt.runs[prompt.cursor].total} (${prompt.runs[prompt.cursor].module})`;
  return createAgentStepPayload(stepPlanId(prompt), 'agentSpecBackend', title, prompt, dependsOn, 'sequential', dependsOn.length ? 'waiting_dependency' : 'waiting_human_input');
}

function createResultStep(planId: string, title: string, result: string): mls.msg.AIAgentStep {
  return {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: title,
    result,
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as any;
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const raw = userPrompt || context.message.content || '';
  const result = await planSpecBackend(raw);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    // The selection is deterministic — there is no LLM at the root.
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentSpecBackend deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
        { type: 'human', content: raw || 'agentSpecBackend' },
      ],
      taskTitle: 'agentSpecBackend',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'agentSpecBackend', flowName: 'agentSpecBackend', version: 'spec-v1' },
    },
  };

  const intents: mls.msg.AgentIntent[] = [addMessageAI, bootstrapAddStep(context, createResultStep('spec-cb-report', 'agentSpecBackend', result.report))];
  if (result.error) return intents;

  const runs = flattenRuns(result.modules);
  if (runs.length === 0) return intents;
  const entries = result.modules.flatMap(plan => plan.layers.flat().map(item => ({ defRef: item.defRef, outputPath: item.outputPath, module: plan.module })));
  // The first layer is opened by a step of this agent too, so every parallel layer is created from a
  // real parent step (the CB dispatcher pattern) and never from the bootstrap.
  intents.push(bootstrapAddStep(context, createSpecStep({ mode: 'next', cursor: 0, runs, entries }, [])));
  return intents;
}

/** Add a step under the root (stepId 1), created by the skipRootLLM bootstrap above. */
function bootstrapAddStep(context: mls.msg.ExecutionContext, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1, step };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const prompt = JSON.parse(String(step.prompt || '{}')) as SpecStepPrompt;
    if (prompt.mode === 'final') return await finalReport(context, parentStep, step, hookSequential, prompt);

    const run = prompt.runs[prompt.cursor];
    if (!run) throw new Error(`cursor ${prompt.cursor} fora do plano (${prompt.runs.length} camada(s))`);
    // The worker records its findings in the CB repair state, which is scoped by a PROCESS-wide
    // module (normally set by readBackendScan, which this agent never calls). Set it before the layer.
    setCbTraceModule(run.module);
    const planId = layerPlanId(prompt.cursor);
    const next: SpecStepPrompt = prompt.cursor + 1 < prompt.runs.length
      ? { ...prompt, cursor: prompt.cursor + 1 }
      : { ...prompt, mode: 'final' };
    return [
      createParallelStepIntent(context, parentStep, planId, 'agentCbMaterialize', `Materializar ${run.module} ${run.index}/${run.total}: ${run.label} {{completed}}/{{total}}`, run.refs, [], CB_MAX_PARALLEL),
      // Real barrier: a SEQUENTIAL step honours dependsOn; it opens the next layer (or the final check).
      createAddStepIntent(context, parentStep, createSpecStep(next, [planId])),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `queued ${run.refs.length} item(s) — ${run.module} camada ${run.index}/${run.total}: ${run.label}`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

/**
 * Workers always COMPLETE (a failed child would stall the barrier), so a missing `.ts` is invisible
 * until someone looks. This step looks: every queued output is checked on the stor, and the CB repair
 * findings of the ones that are missing go into the result.
 */
async function finalReport(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, prompt: SpecStepPrompt): Promise<mls.msg.AgentIntent[]> {
  const generated: string[] = [];
  const missing: string[] = [];
  for (const entry of prompt.entries) {
    setCbTraceModule(entry.module);
    const o = parseMlsPath(entry.outputPath);
    const present = !!o && fileIsPresent(o.project, o.level, o.folder, o.shortName, '.ts');
    const repair = await getComponentRepair(entry.defRef);
    if (present && !repair) { generated.push(`- gerado: ${entry.outputPath}`); continue; }
    const why = repair?.findings?.length ? repair.findings.slice(0, 3).join(' | ') : present ? 'gerado com pendencia de reparo' : 'o .ts nao foi salvo (veja o trace do worker)';
    missing.push(`- ${present ? 'com falha' : 'NAO gerado'}: ${entry.outputPath} — ${why}`);
  }
  const summary = `agentSpecBackend: ${generated.length} gerado(s), ${missing.length} com problema, de ${prompt.entries.length}`;
  const result = [summary, ...(missing.length ? ['', '## com problema', ...missing] : []), ...(generated.length ? ['', '## gerados', ...generated] : [])].join('\n');
  return [
    createAddStepIntent(context, parentStep, createResultStep('spec-cb-result', 'Resultado agentSpecBackend', result)),
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary),
  ];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${agent.agentName}] task invalid`);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed without using the model payload.')];
}
