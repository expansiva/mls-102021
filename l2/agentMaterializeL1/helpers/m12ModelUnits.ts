/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.ts" enhancement="_blank"/>

// The layers the model writes (usecases40, requests50): one dispatcher that sends every selected unit of the
// layer to a worker, and one worker shape. A layer brings only its prompt context and its gate.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_BUILD, M12_PROMPT_LIMIT, clip, errorText, parseM12StepInvocation, type M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12PromptReady, m12ToolPayload, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { readDraft, readOptional, readUnitStatus, reuseDecision, writeDraft, writeUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { releaseCompileModels } from '/_102021_/l2/agentMaterializeL1/helpers/m12Compile.js';
import { importSpecifiers } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { fileRef, infoOfRef } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { blockingDependencies, layerUnits, unitInputHash, writeAndProve, type M12Context, type M12RuleNotApplicable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { orderWithinLayer, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { canRepair, parseM12WorkerArgs, recordM12ArgsRefusal, repairOrGiveUp, workerStep, type M12WorkerArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Worker.js';

/** The tool every model unit answers with: the whole file, and the rules it declares not applicable. */
export const M12_CODE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'notApplicable'],
  properties: {
    code: { type: 'string', description: 'The whole TypeScript file, header line first.' },
    notApplicable: {
      type: 'array',
      description: 'Rules listed for this unit that do not apply to it (empty when every rule applies), each with why.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ruleId', 'reason'],
        properties: { ruleId: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
};

export interface M12Repair {
  problems: string[];
  previous: string | null;
}

export interface M12ModelLayerSpec {
  /** A mechanical fix of the answer before the gate (type annotations and type imports only, never logic). */
  normalize?(ctx: M12Context, unit: M12Unit, code: string): Promise<string>;
  layer: Extract<M12Layer, 'usecases' | 'requests'>;
  workerAgentName: string;
  folder: string;
  toolName: string;
  toolDescription: string;
  /** The human prompt of one unit (the system prompt is the step's prompt.md). */
  context(ctx: M12Context, unit: M12Unit, repair?: M12Repair): Promise<string>;
  /** Problems of the answer, before anything is written. */
  gate(ctx: M12Context, unit: M12Unit, code: string, notApplicable: readonly M12RuleNotApplicable[]): Promise<string[]>;
}

/**
 * Imports of this project must name a file that exists (the l1 compile is not available to catch it): the
 * outputs this run generated and the page contracts. A platform import (102034) is not looked up: the Studio
 * often has no l1 index of a dependency project loaded, and requiring it refused every model answer
 * ("names a file that does not exist") until the repairs ran out, 05/10/2026. The gates already keep platform
 * imports under /_102034_/l1/.
 */
export async function missingImports(ctx: M12Context, code: string): Promise<string[]> {
  const out: string[] = [];
  for (const specifier of importSpecifiers(code)) {
    if (!specifier.startsWith('/_')) continue;
    const info = infoOfRef(specifier, ctx.run.project);
    if (!info) { out.push(`Import "${specifier}" is not a file reference.`); continue; }
    if (info.project !== ctx.run.project) continue;
    if ((await ctx.read(specifier)) === null) out.push(`Import "${specifier}" names a file of this project that does not exist (generate order: domain, persistence, controllers, usecases, requests).`);
  }
  return out;
}

/**
 * The answer's not-applicable list. A rule of this unit needs a reason to be waived. A rule the unit does not list
 * (the prompt shows every rule of the module, and the model says which do not concern it) is not a waiver of
 * anything: it is dropped from the list, not refused. Refusing it rejected a correct fecharComanda until the
 * repairs ran out (05/10/2026).
 */
export function readNotApplicable(value: unknown, ruleIds: readonly string[]): { items: M12RuleNotApplicable[]; problems: string[] } {
  const items: M12RuleNotApplicable[] = [];
  const problems: string[] = [];
  for (const raw of Array.isArray(value) ? value : []) {
    const ruleId = typeof raw?.ruleId === 'string' ? raw.ruleId : '';
    const reason = typeof raw?.reason === 'string' ? raw.reason.trim() : '';
    if (!ruleIds.includes(ruleId)) continue;
    if (reason.length < 10) { problems.push(`notApplicable ${ruleId} needs a reason.`); continue; }
    items.push({ ruleId, reason });
  }
  return { items, problems };
}

/** The phase step of a model layer: every selected unit of the layer goes to one worker. */
export function modelDispatcherAgent(agentName: string, description: string, spec: M12ModelLayerSpec): IAgentAsync {
  async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
    const run = parseM12StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
    if (run.kind === 'refusal') return [updateM12Status(context, parentStep, step, hookSequential, 'failed', run.diagnostic)];
    try {
      const { ctx, selected } = await loadRun(run);
      const lines: string[] = [];
      const workers: mls.msg.AgentIntent[] = [];
      for (const unit of orderWithinLayer(layerUnits(selected, spec.layer))) {
        const base = { layer: spec.layer, unitId: unit.unitId, defRef: unit.defRef, attempt: 0 };
        const waiting = await blockingDependencies(ctx, unit);
        if (waiting.length) {
          const diagnostic = `BLOCKED_BY: ${waiting.join(', ')}`;
          await writeUnitStatus(run.project, run.module, { ...base, status: 'blocked', code: 'BLOCKED_BY', diagnostic, inputHash: '', outputs: {} });
          lines.push(`${unit.unitId}: blocked, ${clip(diagnostic, 300)}`);
          continue;
        }
        const inputHash = await unitInputHash(ctx, unit);
        const prior = await readUnitStatus(run.project, run.module, spec.layer, unit.unitId);
        const decision = await reuseDecision(prior, inputHash, [unit.output], run.force);
        if (decision.kind === 'reuse') {
          await writeUnitStatus(run.project, run.module, { ...base, status: 'reused', code: prior!.code, diagnostic: prior!.diagnostic, inputHash, outputs: prior!.outputs });
          lines.push(`${unit.unitId}: reused`);
          continue;
        }
        if (decision.kind === 'protect') {
          const diagnostic = `EDITED_LOCALLY: ${decision.path} was not written by this agent (use "force": true).`;
          await writeUnitStatus(run.project, run.module, { ...base, status: 'skipped', code: 'EDITED_LOCALLY', diagnostic, inputHash, outputs: prior?.outputs ?? {} });
          lines.push(`${unit.unitId}: skipped, ${diagnostic}`);
          continue;
        }
        workers.push(addM12Step(context, step.stepId, workerStep(spec.workerAgentName, spec.layer, { project: run.project, module: run.module, unitId: unit.unitId, attempt: 1, force: run.force })));
        lines.push(`${unit.unitId}: dispatched to the model`);
      }
      const trace = clip([`build ${M12_BUILD}`, `${workers.length} unit(s) dispatched to the model`, ...lines].join('\n') || `No ${spec.layer} unit selected.`, 3000);
      if (!workers.length) return [updateM12Status(context, parentStep, step, hookSequential, 'completed', trace)];
      // Workers first, then this step stays in_progress: it auto-completes when its last worker does.
      return [...workers, updateM12Status(context, parentStep, step, hookSequential, 'in_progress', trace)];
    } catch (error) {
      return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
    }
  }
  return { agentName, agentProject: 102021, agentFolder: `agentMaterializeL1/${spec.folder}`, agentDescription: description, visibility: 'private', beforePromptStep };
}

/** The worker of a model layer: prompt, gate, write, prove, repair (never fails the task). */
export function modelWorkerAgent(description: string, spec: M12ModelLayerSpec): IAgentAsync {
  const DRAFT = 'code';
  const promptFile = { project: 102021, level: 2, folder: `agentMaterializeL1/${spec.folder}`, shortName: 'prompt', extension: '.md' };

  async function unitOf(args: M12WorkerArgs): Promise<{ ctx: M12Context; unit: M12Unit }> {
    const { ctx } = await loadRun({ project: args.project, module: args.module, scope: '', target: '', force: args.force });
    const unit = ctx.units.find(item => item.layer === spec.layer && item.unitId === args.unitId);
    if (!unit) throw new Error(`M12_UNIT_UNKNOWN: ${spec.layer} ${args.unitId} is not a def of ${args.module}.`);
    return { ctx, unit };
  }

  async function repairInput(args: M12WorkerArgs): Promise<M12Repair | undefined> {
    if (args.attempt < 2) return undefined;
    const status = await readUnitStatus(args.project, args.module, spec.layer, args.unitId);
    return {
      problems: (status?.diagnostic || 'The previous attempt failed.').split('\n').filter(Boolean),
      previous: await readDraft(args.project, args.module, spec.layer, args.unitId, DRAFT),
    };
  }

  async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
    let args: M12WorkerArgs;
    try { args = parseM12WorkerArgs(step.prompt || '', Number(mls.actualProject || 0)); }
    catch (error) { await recordM12ArgsRefusal(step.prompt || '', spec.layer, errorText(error)); return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${errorText(error)}`)]; }
    try {
      const { ctx, unit } = await unitOf(args);
      // Through the reader: it loads the stor index of project 102021 when the open project is another one.
      const system = await ctx.read(fileRef(promptFile));
      if (!system) throw new Error(`M12_PROMPT_MISSING: _102021_/l2/agentMaterializeL1/${spec.folder}/prompt.md`);
      const human = await spec.context(ctx, unit, await repairInput(args));
      if (system.length + human.length > M12_PROMPT_LIMIT) throw new Error(`M12_PROMPT_LIMIT: ${system.length + human.length}`);
      return [m12PromptReady(context, parentStep, step, hookSequential, { system, human, toolName: spec.toolName, toolDescription: spec.toolDescription, parameters: M12_CODE_SCHEMA })];
    } catch (error) {
      const diagnostic = clip(errorText(error));
      await writeUnitStatus(args.project, args.module, { layer: spec.layer, unitId: args.unitId, defRef: '', status: 'failed', code: 'PROMPT_FAILED', attempt: args.attempt, diagnostic, inputHash: '', outputs: {} });
      return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${diagnostic}`)];
    }
  }

  async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
    let args: M12WorkerArgs;
    try { args = parseM12WorkerArgs(step.prompt || '', Number(mls.actualProject || 0)); }
    catch (error) { await recordM12ArgsRefusal(step.prompt || '', spec.layer, errorText(error)); return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${errorText(error)}`, 'input')]; }
    let defRef = '';
    let inputHash = '';
    const fail = async (problems: string[]): Promise<mls.msg.AgentIntent[]> => {
      const diagnostic = problems.map(problem => clip(problem, 600)).slice(0, 20).join('\n');
      await writeUnitStatus(args.project, args.module, { layer: spec.layer, unitId: args.unitId, defRef, status: 'failed', code: canRepair(args) ? 'MODEL_REPAIR' : 'MODEL_REFUSED', attempt: args.attempt, diagnostic, inputHash, outputs: {} });
      return repairOrGiveUp(context, parentStep, step, hookSequential, spec.workerAgentName, spec.layer, args, diagnostic.replace(/\n/gu, ' | '));
    };
    try {
      const { ctx, unit } = await unitOf(args);
      defRef = unit.defRef;
      inputHash = await unitInputHash(ctx, unit);
      const payload = (m12ToolPayload(step, spec.toolName) ?? {}) as { code?: unknown; notApplicable?: unknown };
      const code = typeof payload.code === 'string' ? payload.code : '';
      // Always overwrite: the repair must never read the draft of an older run.
      await writeDraft(args.project, args.module, spec.layer, args.unitId, DRAFT, code);
      if (!code.trim()) return fail(['The answer has no code.']);
      const raw = code.endsWith('\n') ? code : `${code}\n`;
      const source = spec.normalize ? await spec.normalize(ctx, unit, raw) : raw;
      const waived = Array.isArray(payload.notApplicable) ? payload.notApplicable as Array<{ ruleId?: unknown; reason?: unknown }> : [];
      const notApplicable = waived.filter(item => typeof item?.ruleId === 'string' && typeof item?.reason === 'string').map(item => ({ ruleId: String(item.ruleId), reason: String(item.reason).trim() }));
      const problems = [...await spec.gate(ctx, unit, source, notApplicable), ...await missingImports(ctx, source)];
      if (problems.length) return fail(problems);
      const proved = await writeAndProve(ctx, unit, source, inputHash, args.attempt, notApplicable);
      releaseCompileModels();
      if (proved.status === 'failed') return fail(proved.errors.map(error => `Compile: ${error}`));
      if (proved.status !== 'done') return fail([proved.line]);
      return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `${spec.layer} ${args.unitId}: ${proved.line}`, true)];
    } catch (error) {
      return fail([errorText(error)]);
    }
  }

  return { agentName: spec.workerAgentName, agentProject: 102021, agentFolder: `agentMaterializeL1/${spec.folder}`, agentDescription: description, visibility: 'private', beforePromptStep, afterPromptStep };
}
