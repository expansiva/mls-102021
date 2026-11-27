/// <mls fileReference="_102021_/l2/agentMaterializeL1/agentMaterializeL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_AGENT_NAME, M12_BUILD, M12_HELP, buildM12PlannedSteps, isM12PhasePlanId, parseM12MessageInvocation, type M12Layer, type M12Request } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12Result, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { EMITTER_TARGET_FORMS, emitterTargetLayer, loadModuleUnits, registersModule, requestModules, selectUnits, selectedLayers, storEntries, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { orphanOfTarget, type M12Orphan } from '/_102021_/l2/agentMaterializeL1/helpers/m12Orphans.js';
import { stampScope } from '/_102021_/l2/agentMaterializeL1/helpers/m12Stamp.js';
import { pendingModelWork, pendingScope, pendingText } from '/_102021_/l2/agentMaterializeL1/helpers/m12Pending.js';
import { reportScope } from '/_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.js';
import { unitNeedsLlm } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import '/_102021_/l2/agentMaterializeL1/steps/domain10/agentM12Domain.js';
import '/_102021_/l2/agentMaterializeL1/steps/external15/agentM12External.js';
import '/_102021_/l2/agentMaterializeL1/steps/external15/agentM12ExternalUnit.js';
import '/_102021_/l2/agentMaterializeL1/steps/adapter17/agentM12Adapter.js';
import '/_102021_/l2/agentMaterializeL1/steps/adapter17/agentM12AdapterUnit.js';
import '/_102021_/l2/agentMaterializeL1/steps/persistence20/agentM12Persistence.js';
import '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.js';
import '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.js';
import '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12Usecases.js';
import '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';
import '/_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12Workflows.js';
import '/_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12WorkflowUnit.js';
import '/_102021_/l2/agentMaterializeL1/steps/requests50/agentM12Requests.js';
import '/_102021_/l2/agentMaterializeL1/steps/requests50/agentM12RequestService.js';
import '/_102021_/l2/agentMaterializeL1/steps/controllers30/agentM12Controllers.js';
import '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.js';
import '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12TestsPage.js';
import '/_102021_/l2/agentMaterializeL1/steps/register70/agentM12Register.js';
import '/_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.js';

/**
 * Materializes the L1 backend of a module (recipes first: domain -> persistence -> controllers; then the model:
 * usecases -> request services -> monitor tests; then the l5 registration and a report) from the defs v2, following
 * mls-102047/materializadorL1.md. No JSON = every module of the current project, `{"scope":"<folder>"}`
 * or `{"target":"<path of a .defs.ts>"}`. The root is deterministic; see flow.json.
 */
export function createAgent(): IAgentAsync {
  return { agentName: M12_AGENT_NAME, agentProject: 102021, agentFolder: 'agentMaterializeL1', agentDescription: 'Materialize the L1 backend of a module from its defs v2, by scope or target', visibility: 'public', beforePromptImplicit, beforePromptStep };
}

export interface M12ModulePlan {
  module: string;
  layers: M12Layer[];
  register: boolean;
  units: M12Unit[];
  /** d1_246: units an emitter writes (no def), named by `target`; they are not in `units`. */
  emitted?: string[];
  /** d1_252: `target` names a def that no longer exists whose output this agent wrote; finalize80 removes it. */
  orphan?: M12Orphan;
  problems: Array<{ defRef: string; code: string; detail: string }>;
}

export function planReport(request: M12Request, modules: readonly M12ModulePlan[]): string {
  const lines = [`build ${M12_BUILD}`, `agentMaterializeL1 — ${request.target ? `target ${request.target}` : request.scope ? `scope ${request.scope}` : 'whole project'}${request.force ? ' (force)' : ''}`];
  for (const item of modules) {
    lines.push('', `## ${item.module}`);
    for (const layer of item.layers) {
      if (layer === 'tests') { lines.push('- tests: one LLM worker per page whose controller is ready'); continue; }
      const units = item.units.filter(unit => unit.layer === layer);
      const llm = units.filter(unitNeedsLlm).map(unit => unit.unitId);
      lines.push(`- ${layer}: ${[...units.map(unit => unit.unitId), ...(layer === 'workflows' ? item.emitted ?? [] : [])].join(', ')}${llm.length ? ` (LLM: ${llm.join(', ')})` : ''}`);
    }
    if (item.orphan) lines.push(`- orphan: ${item.orphan.layer}/${item.orphan.unitId} — the def is gone; finalize80 removes the output this agent wrote (unedited only)`);
    if (item.register) lines.push('- register: l5/project.json backend of the module');
    for (const problem of item.problems) lines.push(`- not planned: ${problem.defRef} ${problem.code} ${problem.detail}`);
  }
  return lines.join('\n');
}

export async function planModules(project: number, request: M12Request): Promise<{ modules: M12ModulePlan[]; refusal: string }> {
  const entries = storEntries();
  const found = requestModules(project, request, entries);
  if (found.refusal) return { modules: [], refusal: found.refusal };
  const modules: M12ModulePlan[] = [];
  for (const moduleName of found.modules) {
    const loaded = await loadModuleUnits(project, moduleName, entries);
    const units = selectUnits(project, moduleName, loaded.units, request);
    // d1_246: the module engine has no def; `target` names its file. Only a module with a workflow process has one.
    if (!units.length && emitterTargetLayer(project, moduleName, request.target) && loaded.units.some(unit => unit.definition.artifactType === 'workflowProcess')) {
      modules.push({ module: moduleName, layers: ['workflows'], register: false, units, emitted: ['engine'], problems: loaded.problems });
      continue;
    }
    // d1_252: the def is gone but its output stays; `target` removes it (finalize80), only when this agent wrote it.
    if (!units.length && request.target) {
      const orphan = await orphanOfTarget(project, moduleName, request.target, loaded.units);
      if (orphan) { modules.push({ module: moduleName, layers: [], register: false, units, orphan, problems: loaded.problems }); continue; }
    }
    if (!units.length) continue;
    modules.push({ module: moduleName, layers: selectedLayers(units), register: registersModule(request, moduleName), units, problems: loaded.problems });
  }
  if (!modules.length) return { modules: [], refusal: `Nothing selected: ${request.target || request.scope || 'the project'} matches no l1 def${request.target ? ` or emitted unit. Accepted: ${EMITTER_TARGET_FORMS}` : ''}.` };
  return { modules, refusal: '' };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const raw = userPrompt || context.message.content || '';
  const task = (human: string, title: string, memory: Record<string, string>): mls.msg.AgentIntentAddMessageAI => ({
    type: 'add-message-ai', skipRootLLM: true,
    request: {
      action: 'addMessageAI', agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'agentMaterializeL1 deterministic bootstrap. The root model is disabled.' }, { type: 'human', content: human }],
      taskTitle: title, threadId: context.message.threadId, userMessage: context.message.content,
      longTermMemory: { taskName: M12_AGENT_NAME, flowName: M12_AGENT_NAME, ...memory },
    },
  });
  const statusOnly = (text: string): mls.msg.AgentIntent[] => [task(text, M12_AGENT_NAME, { statusOnly: 'true' }), addM12Step(context, 1, m12Result(M12_AGENT_NAME, text, 'm12-status'), true)];

  const invocation = parseM12MessageInvocation(raw, Number(mls.actualProject || 0));
  if (invocation.kind === 'help') return statusOnly(M12_HELP);
  if (invocation.kind === 'refusal') return statusOnly(invocation.diagnostic);
  if (invocation.kind === 'stamp') return statusOnly(await stampScope(invocation.project, invocation.scope, invocation.dry));
  if (invocation.kind === 'report') return statusOnly(await reportScope(invocation.project, invocation.scope));
  if (invocation.kind === 'pending') return statusOnly(await pendingScope(invocation.project, invocation));
  const request: M12Request = { scope: invocation.scope, target: invocation.target, force: invocation.force, ...(invocation.scratch === undefined ? {} : { scratch: invocation.scratch }), ...(invocation.asserted ? { asserted: true } : {}) };
  const plan = await planModules(invocation.project, request);
  if (plan.refusal) return statusOnly(plan.refusal);

  // d1_343: the plan says, before anything runs, how many model units this pass will generate.
  const works = await Promise.all(plan.modules.filter(item => item.units.length > 0).map(item => pendingModelWork(invocation.project, item.module, request)));
  const report = [planReport(request, plan.modules), '', '## Model work of this run', ...pendingText(works)].join('\n');
  const steps = buildM12PlannedSteps(invocation.project, request, plan.modules.map(item => ({ module: item.module, layers: item.layers, register: item.register })));
  return [
    task(report, `materialize L1 ${plan.modules.map(item => item.module).join(', ')}`, { project: String(invocation.project), scope: request.scope, target: request.target }),
    // Open steps first: a completed result sent before them could auto-complete the root.
    ...steps.map(step => addM12Step(context, 1, step, true)),
    addM12Step(context, 1, m12Result('Plan', report, 'm12-plan'), true),
  ];
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  // The root step of the bootstrap: nothing to prompt, its children are the planned phases.
  if (step.stepId === 1 && context.task?.iaCompressed?.longMemory?.flowName === M12_AGENT_NAME) {
    return [updateM12Status(context, parentStep, step, hookSequential, 'completed', 'Deterministic bootstrap completed.')];
  }
  const planId = String(step.planning?.planId || '');
  const diagnostic = isM12PhasePlanId(planId) ? `${planId} must run through its registered step agent.` : 'agentMaterializeL1 has no step of its own.';
  return [updateM12Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
}
