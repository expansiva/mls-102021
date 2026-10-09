/// <mls fileReference="_102021_/l2/agentMaterializeL1/agentMaterializeL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_AGENT_NAME, M12_BUILD, M12_HELP, buildM12PlannedSteps, isM12PhasePlanId, parseM12MessageInvocation, type M12Layer, type M12Request } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12Result, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { loadModuleUnits, registersModule, requestModules, selectUnits, selectedLayers, storEntries, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { unitNeedsLlm } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import '/_102021_/l2/agentMaterializeL1/steps/domain10/agentM12Domain.js';
import '/_102021_/l2/agentMaterializeL1/steps/persistence20/agentM12Persistence.js';
import '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12Usecases.js';
import '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';
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
      lines.push(`- ${layer}: ${units.map(unit => unit.unitId).join(', ')}${llm.length ? ` (LLM: ${llm.join(', ')})` : ''}`);
    }
    if (item.register) lines.push('- register: l5/project.json backend of the module');
    for (const problem of item.problems) lines.push(`- not planned: ${problem.defRef} ${problem.code} ${problem.detail}`);
  }
  return lines.join('\n');
}

async function planModules(project: number, request: M12Request): Promise<{ modules: M12ModulePlan[]; refusal: string }> {
  const entries = storEntries();
  const found = requestModules(project, request, entries);
  if (found.refusal) return { modules: [], refusal: found.refusal };
  const modules: M12ModulePlan[] = [];
  for (const moduleName of found.modules) {
    const loaded = await loadModuleUnits(project, moduleName, entries);
    const units = selectUnits(project, moduleName, loaded.units, request);
    if (!units.length) continue;
    modules.push({ module: moduleName, layers: selectedLayers(units), register: registersModule(request, moduleName), units, problems: loaded.problems });
  }
  if (!modules.length) return { modules: [], refusal: `Nothing selected: ${request.target || request.scope || 'the project'} matches no l1 def.` };
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
  const request: M12Request = { scope: invocation.scope, target: invocation.target, force: invocation.force };
  const plan = await planModules(invocation.project, request);
  if (plan.refusal) return statusOnly(plan.refusal);

  const report = planReport(request, plan.modules);
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
