/// <mls fileReference="_102021_/l2/agentDefsL1/agentDefsL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  D1_AGENT_NAME,
  D1_FLOW_ID,
  buildD1PlannedSteps,
  helpText,
  isD1StepId,
  isDoneAnchor,
  notImplementedTrace,
  parseD1Invocation,
  parseD1StepPrompt,
  planIdFromPrompt,
  pipelineFile,
  requireProject,
  stoppedTrace,
  taskModule,
  taskProject,
  unknownPlanId,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  d1StatusMessage,
  stopStep,
  hooksFor,
  markAwaitingStep,
  planIdOf,
  updateStatus,
} from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import { parsePipelineDocument, pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { decideEntry } from '/_102021_/l2/agentDefsL1/steps/entry10/gate.js';
import { D1_MODEL_STEPS, D1_REDERIVE_SCHEMA, D1_REDERIVE_STEPS, defHashes, isRederiveStep, stepsFrom, writeRederive } from '/_102021_/l2/agentDefsL1/helpers/d1Rederive.js';
import { writeExternalConnections } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';
import '/_102021_/l2/agentDefsL1/steps/entry10/agentD1Entry.js';
import '/_102021_/l2/agentDefsL1/steps/input20/agentD1Input.js';
import '/_102021_/l2/agentDefsL1/steps/resolve25/agentD1Resolve.js';
import '/_102021_/l2/agentDefsL1/steps/domain30/agentD1Domain.js';
import '/_102021_/l2/agentDefsL1/steps/persistence40/agentD1Persistence.js';
import '/_102021_/l2/agentDefsL1/steps/usecases50/agentD1Usecases.js';
import '/_102021_/l2/agentDefsL1/steps/controllers60/agentD1Controllers.js';
import '/_102021_/l2/agentDefsL1/steps/support70/agentD1Support.js';
import '/_102021_/l2/agentDefsL1/steps/finalize80/agentD1Finalize.js';


export function createAgent(): IAgentAsync {
  return {
    agentName: D1_AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentDefsL1',
    agentDescription: 'L1 defs agent — checkpoint, input inventory, the open parts of the contract routes, domain defs, persistence defs, usecase plans, page controllers, access scope, repository registry and the finalize report. resolve25 calls a model only for the open parts of a contract route, among closed candidates. usecases50 calls a model for operation steps only. finalize80 does not.',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseD1Invocation(userPrompt || context.message.content || '');
  if (invocation.refused) return statusTask(agent, context, invocation.refused, {});

  const project = requireProject(mls.actualProject);
  if (typeof project !== 'number') return statusTask(agent, context, project.refusal, { moduleName: invocation.module });

  if (invocation.command === 'help') {
    return statusTask(agent, context, helpText(invocation.module, project), {
      moduleName: invocation.module,
      project: String(project),
      command: 'help',
    });
  }

  if (invocation.command === 'declarations') {
    const done = await writeExternalConnections(project, invocation.module);
    return statusTask(agent, context, declarationsReport(project, invocation.module, done), {
      moduleName: invocation.module,
      project: String(project),
      command: 'declarations',
    });
  }

  if (invocation.command === 'rederive') {
    const started = await startRederive(project, invocation.module, invocation.step ?? '');
    if ('refusal' in started) {
      return statusTask(agent, context, started.refusal, { moduleName: invocation.module, project: String(project), command: 'rederive' });
    }
    return planRun(agent, context, invocation.module, project, 'resume', started.note);
  }

  const command = invocation.command === 'resume' ? 'resume' : 'run';
  const raw = await readText(pipelineFile(project, invocation.module));
  const decision = decideEntry(command, project, invocation.module, raw, new Date());
  if (decision.kind === 'refusal') {
    return statusTask(agent, context, decision.refusal, {
      moduleName: invocation.module,
      project: String(project),
      command,
    });
  }
  return planRun(agent, context, invocation.module, project, command, '');
}

/** The task and its planned steps: the same for `/run`, `/resume` and `/rederive`. */
function planRun(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  moduleName: string,
  project: number,
  command: 'run' | 'resume',
  note: string,
): mls.msg.AgentIntent[] {
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `agentDefsL1 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.${note ? `\n${note}` : ''}` },
        { type: 'human', content: moduleName },
      ],
      taskTitle: `defs ${moduleName}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'agentDefsL1',
        flowName: D1_FLOW_ID,
        moduleName,
        project: String(project),
        command,
      },
    },
  };
  const steps = buildD1PlannedSteps(moduleName, project, command).map(step => addStepIntent(context, step));
  return [addMessage, ...steps];
}

/**
 * d1_228: marks the rederive and clears what the chosen step and the later ones approved. The checkpoint must be intact and the module must
 * have an inventory (it was run once). The answer says which of the planned steps may call a model.
 */
async function startRederive(project: number, moduleName: string, stepText: string): Promise<{ refusal: string } | { note: string }> {
  if (!isRederiveStep(stepText)) return { refusal: `/rederive needs a step: ${D1_REDERIVE_STEPS.join(', ')}. Nothing was changed.` };
  const raw = await readText(pipelineFile(project, moduleName));
  const decision = decideEntry('resume', project, moduleName, raw, new Date());
  if (decision.kind === 'refusal') return { refusal: decision.refusal };
  const pipeline = raw ? parsePipelineDocument(raw) : null;
  const snapshot = await readD1Input(project, moduleName);
  if (!pipeline || !snapshot) return { refusal: `/rederive needs a module that was run: ${moduleName} has no inventory in project ${project}. Run /run first. Nothing was changed.` };
  const kept = Object.fromEntries(Object.entries(pipeline.steps).filter(([id]) => !stepsFrom(stepText).includes(id as D1StepId)));
  const next = { ...pipeline, status: 'inProgress' as const, steps: kept, updatedAt: new Date().toISOString() };
  delete (next as { awaitingStep?: unknown }).awaitingStep;
  const issues = pipelineIssues(next);
  if (issues.length) return { refusal: `Checkpoint schema refused: ${issues[0]} Nothing was changed.` };
  await writeRederive(project, moduleName, { schemaVersion: D1_REDERIVE_SCHEMA, from: stepText, before: await defHashes(project, snapshot.files.map(file => file.defPath)) });
  await writeJson(pipelineFile(project, moduleName), next);
  const models = Object.entries(D1_MODEL_STEPS).map(([id, why]) => `${id} (${why})`).join('; ');
  return { note: `rederive ${moduleName} from ${stepText}: the defs of ${stepText} and of the later steps are redone. Steps that may call a model: ${models}. The @@agentMaterializeL1 target of each def that changed is printed when finalize80 ends.` };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step) || planIdFromPrompt(args || step.prompt || '');
  const hooks = hooksFor(planId);
  if (hooks?.beforePromptStep) return hooks.beforePromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isD1StepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  if (isDoneAnchor(planId)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Done anchor ${planId} is not a step.`)];
  }
  if (planId && planId !== 'root' && planId !== 'status') {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', unknownPlanId(planId))];
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step) || planIdFromPrompt(args || step.prompt || '');
  const hooks = hooksFor(planId);
  if (hooks?.afterPromptStep) return hooks.afterPromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isD1StepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  if (isDoneAnchor(planId)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Done anchor ${planId} is not a step.`)];
  }
  if (planId && planId !== 'root' && planId !== 'status') {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', unknownPlanId(planId))];
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function notImplemented(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  stepId: D1StepId,
): Promise<mls.msg.AgentIntent[]> {
  const fromPrompt = parseD1StepPrompt(step.prompt || '');
  const moduleName = fromPrompt.kind === 'step' ? fromPrompt.prompt.moduleName : taskModule(context);
  const project = fromPrompt.kind === 'step' ? fromPrompt.prompt.project : taskProject(context);
  if (moduleName && project && taskProject(context) === project && taskModule(context) === moduleName) {
    const raw = await readText(pipelineFile(project, moduleName));
    const pipeline = raw ? parsePipelineDocument(raw) : null;
    if (pipeline && pipeline.project === project && pipeline.moduleName === moduleName) {
      await markAwaitingStep(pipeline, stepId);
    }
  }
  return stopStep(context, parentStep, step, hookSequential, notImplementedTrace(stepId), {
    drainTrace: stoppedTrace(stepId),
    onlyUnimplemented: true,
  });
}

function addStepIntent(context: mls.msg.ExecutionContext, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step,
  };
}

/** What `/declarations` tells: the systems, the defs written, the refusals, and the command that generates each declaration. */
function declarationsReport(project: number, moduleName: string, done: { systems: string[]; written: string[]; issues: string[] }): string {
  if (done.issues.length) return `declarations ${moduleName}: nothing was written for the refused defs. ${done.issues.join(' ')}`;
  if (!done.systems.length) return `declarations ${moduleName}: the L4 of the module declares no external system. Nothing was written.`;
  return [
    `declarations ${moduleName}: ${done.systems.length} system(s), ${done.written.length} def(s) written (the others were already up to date).`,
    ...done.systems.map(id => `Generate the declaration: @@agentMaterializeL1 {"target":"_${project}_/l1/${moduleName}/layer_1_external/connections/${id}.defs.ts"}`),
  ].join('\n');
}

function statusTask(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
  memory: Record<string, string>,
): mls.msg.AgentIntent[] {
  const addMessage = d1StatusMessage(agent, context, message, memory);
  const result: mls.msg.AIPayload = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: 'Status',
    result: message,
    planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  return [addMessage, addStepIntent(context, result)];
}
