/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/agentD1Usecases.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  displayPath,
  draftFile,
  dynamicPlanId,
  parseD1StepPrompt,
  pipelineFile,
  taskModule,
  taskProject,
  MSG_PROJECT_MISMATCH,
  type D1FileInfo,
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  D1_STEP_HOOKS,
  drainWaitingSiblings,
  planIdOf,
  updateStatus,
} from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import { parsePipelineDocument } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import {
  decideRepairs,
  fanoutExecution,
  fanoutStep,
  firstWorkerArg,
  parseWorkerArg,
  repairStep,
  type D1AttemptTrace,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import {
  buildFromWork,
  commitD1Usecases,
  loadD1UsecaseWork,
  readAttempts,
  readD1UsecaseWork,
  writeAttempt,
  writeD1UsecaseWork,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { parseWorkerReply, usecaseHumanPrompt, usecaseTool } from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';

export async function beforeD1UsecasesPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step) || planIdFromText(args || step.prompt || '');
  if (planId === 'usecases50-fanout') {
    return [updateStatus(context, parentStep, step, hookSequential, 'in_progress', 'usecases50 fan-out is waiting for workers.')];
  }
  if (planId.startsWith('usecases50-worker-') || planId.startsWith('usecases50-repair-')) {
    return prepareWorker(context, parentStep, step, hookSequential, args || step.prompt || '');
  }
  const parsed = parseD1StepPrompt(args || step.prompt || '');
  if (parsed.kind === 'refusal') return refuse(context, parentStep, step, hookSequential, parsed.refusal);
  if (parsed.prompt.planId !== 'usecases50') {
    return refuse(context, parentStep, step, hookSequential, 'Step prompt planId must be usecases50.');
  }
  const memoryProject = taskProject(context);
  const memoryModule = taskModule(context);
  if (memoryProject === null || memoryProject !== parsed.prompt.project || memoryModule !== parsed.prompt.moduleName) {
    return refuse(context, parentStep, step, hookSequential, MSG_PROJECT_MISMATCH);
  }
  const checkpointFile = pipelineFile(parsed.prompt.project, parsed.prompt.moduleName);
  const raw = await readText(checkpointFile);
  const pipeline = raw ? parsePipelineDocument(raw) : null;
  if (!pipeline || pipeline.project !== parsed.prompt.project || pipeline.moduleName !== parsed.prompt.moduleName || pipeline.steps.persistence40?.status !== 'approved') {
    return refuse(context, parentStep, step, hookSequential, 'Checkpoint is not intact. usecases50 wrote nothing.');
  }
  const loaded = await loadD1UsecaseWork(parsed.prompt.project, parsed.prompt.moduleName);
  if ('refusal' in loaded) return refuse(context, parentStep, step, hookSequential, loaded.refusal);
  await writeD1UsecaseWork(parsed.prompt.project, loaded.work);
  const ids = loaded.work.request.usecases.map(usecase => usecase.usecaseId);
  const workerArgs = ids.map(usecaseId => firstWorkerArg(parsed.prompt.project, parsed.prompt.moduleName, usecaseId));
  const fanout = fanoutStep(parsed.prompt.project, parsed.prompt.moduleName, workerArgs);
  return [
    {
      type: 'add-step',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: parentStep.stepId,
      step: fanout,
      executionMode: fanoutExecution(workerArgs),
    },
    updateStatus(context, parentStep, step, hookSequential, 'in_progress', `usecases50 dispatched ${ids.length} workers, at most 5 at once.`),
  ];
}

export async function afterD1UsecasesPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step) || planIdFromText(args || step.prompt || '');
  if (planId === 'usecases50-fanout') return barrier(context, parentStep, step, hookSequential);
  if (planId.startsWith('usecases50-worker-') || planId.startsWith('usecases50-repair-')) {
    return finishWorker(context, parentStep, step, hookSequential, args || step.prompt || '');
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'usecases50 already recorded.')];
}

async function prepareWorker(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  prompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const arg = parseWorkerArg(prompt);
  if (!arg) return refuse(context, parentStep, step, hookSequential, 'Worker args are not a usecase id.');
  if (taskProject(context) !== arg.project || taskModule(context) !== arg.moduleName) {
    return refuse(context, parentStep, step, hookSequential, MSG_PROJECT_MISMATCH);
  }
  const work = await readD1UsecaseWork(arg.project, arg.moduleName);
  const usecase = work?.request.usecases.find(item => item.usecaseId === arg.usecaseId);
  if (!work || !usecase) return refuse(context, parentStep, step, hookSequential, `Usecase ${arg.usecaseId} is not selected.`);
  const entity = work.request.entities.find(item => item.entityId === usecase.entity);
  const port = work.request.ports.find(item => item.entityId === usecase.entity);
  const [skill, instructions] = await Promise.all([
    readText(agentFile('skills', 'usecase')),
    readText(agentFile('steps/usecases50', 'prompt')),
  ]);
  if (!instructions) return refuse(context, parentStep, step, hookSequential, 'usecases50 prompt is missing.');
  const humanPrompt = usecaseHumanPrompt({
    usecase,
    entityId: usecase.entity,
    storageTarget: entity?.storageTarget || '',
    namespace: entity?.namespace || '',
    portId: port?.portId || '',
    methods: port?.methods || [],
    rules: entity?.transitions.find(item => item.transitionId === usecase.usecaseId)?.ruleRefs || [],
    effects: work.request.outbound.filter(event => event.on === `${usecase.entity}.${usecase.usecaseId}`).map(event => event.eventId),
    routes: usecase.routes,
    feedback: arg.feedback,
  });
  return [{
    type: 'prompt_ready',
    args: prompt,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: [stripComment(skill || ''), stripComment(instructions)].filter(Boolean).join('\n\n'),
    humanPrompt,
    tools: [usecaseTool()],
    toolChoice: { type: 'function', function: { name: 'planUsecaseSteps' } },
  }];
}

async function finishWorker(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  prompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const arg = parseWorkerArg(prompt);
  if (!arg) return completeOnly(context, parentStep, step, hookSequential, 'Worker args are not a usecase id.');
  const payload = unwrapPayload(step);
  const parsed = !payload.present
    ? { steps: null, problems: [{ code: 'OPERATIONAL', message: 'The model reply did not arrive.' }] }
    : payload.value === undefined
      ? { steps: null, problems: [{ code: 'INVENTED_OPERATION', message: 'The model reply is not steps.' }] }
      : parseWorkerReply(payload.value);
  const operational = parsed.problems.some(problem => problem.code === 'OPERATIONAL');
  const trace = parsed.problems.map(problem => problem.message).join(' ') || `usecases50 recorded steps for ${arg.usecaseId}.`;
  const attempt: D1AttemptTrace = {
    usecaseId: arg.usecaseId,
    status: operational ? 'operational' : parsed.steps ? 'parsed' : 'repairable',
    trace,
    unitAttempts: arg.unitAttempts,
    reply: parsed.steps,
  };
  await writeAttempt(arg.project, arg.moduleName, attempt);
  return [completeOnly(context, parentStep, step, hookSequential, trace)[0]];
}

async function barrier(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const prompt = parseFanout(step.prompt || '');
  if (!prompt) return completeOnly(context, parentStep, step, hookSequential, 'Fan-out prompt is not a usecase dispatch.');
  const work = await readD1UsecaseWork(prompt.project, prompt.moduleName);
  if (!work) return completeOnly(context, parentStep, step, hookSequential, 'usecases50 work file is missing.');
  const ids = work.request.usecases.map(usecase => usecase.usecaseId);
  const attempts = await readAttempts(prompt.project, prompt.moduleName, ids);
  const probed = buildFromWork(work, attempts, attempts.filter(item => item.status === 'parsed').length);
  const classified = ids.map(usecaseId => classify(usecaseId, attempts, probed));
  const decision = decideRepairs({
    expected: ids,
    attempts: classified,
    globalAttempts: work.repairs,
    feedbackFor: usecaseId => classified.find(item => item.usecaseId === usecaseId)?.trace || '',
  });
  if (decision.repairs.length) {
    work.repairs = decision.repairs[decision.repairs.length - 1].globalAttempts;
    await writeD1UsecaseWork(prompt.project, work);
    const named = decision.repairs.map(item => `${item.usecaseId}: ${item.feedback || item.planId}`).join('; ');
    return [
      ...decision.repairs.map(order => addStep(context, parentStep, repairStep(prompt.project, prompt.moduleName, order))),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `barrier scheduled one repair. ${named}`),
    ];
  }
  if (decision.identified.length || decision.pause) {
    const named = decision.identified.map(item => `${item.usecaseId} ${item.code}: ${item.trace}`).join('; ');
    const intents: mls.msg.AgentIntent[] = [];
    if (decision.pause) {
      intents.push({
        type: 'pause-or-continue',
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        reason: `operational failure: ${named}`,
      });
    }
    intents.push(updateStatus(context, parentStep, step, hookSequential, 'completed', `barrier identified ${named}`));
    return intents;
  }
  const build = buildFromWork(work, classified, classified.length);
  const committed = await commitD1Usecases(prompt.project, build);
  if (!build.ok || committed.issues.length) {
    const message = committed.issues[0] || build.problems.find(problem => problem.severity === 'error')?.message || 'usecases50 refused the plan.';
    return completeOnly(context, parentStep, step, hookSequential, message);
  }
  const checkpointFile = pipelineFile(prompt.project, prompt.moduleName);
  const raw = await readText(checkpointFile);
  const pipeline = raw ? parsePipelineDocument(raw) : null;
  const artifact = displayPath(draftFile(prompt.project, prompt.moduleName, 'usecases50'));
  if (pipeline && pipeline.project === prompt.project && pipeline.moduleName === prompt.moduleName) {
    const approved = withUsecasesApproved(pipeline, artifact, new Date().toISOString());
    if (JSON.stringify(approved) !== JSON.stringify(pipeline)) await writeJson(checkpointFile, approved);
  }
  const mutationParent = findOpenParent(context, parentStep);
  const anchor = anchorPresent(context) ? [] : [doneAnchor(context, mutationParent, prompt.project, prompt.moduleName, artifact, build.llmCalls)];
  return [
    ...anchor,
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `usecases50 wrote ${committed.written.length} usecase defs.`),
  ];
}

function classify(usecaseId: string, attempts: readonly D1AttemptTrace[], build: ReturnType<typeof buildFromWork>): D1AttemptTrace {
  const attempt = attempts.find(item => item.usecaseId === usecaseId);
  if (!attempt || attempt.status === 'operational') {
    return {
      usecaseId,
      status: 'operational',
      trace: attempt?.trace || 'missing trace',
      unitAttempts: attempt?.unitAttempts || 0,
      reply: null,
    };
  }
  if (attempt.status === 'repairable') return attempt;
  const errors = build.problems.filter(problem => problem.severity === 'error' && problem.path === usecaseId);
  if (!errors.length) return attempt;
  return { ...attempt, status: 'repairable', trace: errors.map(problem => problem.message).join(' ') };
}

function unwrapPayload(step: mls.msg.AIAgentStep): { present: boolean; value: unknown } {
  const first = step.interaction?.payload?.[0];
  if (first === undefined || first === null) return { present: false, value: undefined };
  return { present: true, value: unwrapValue(first) };
}

function unwrapValue(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return unwrapValue(JSON.parse(value) as unknown);
    } catch {
      return undefined;
    }
  }
  if (!isRecord(value)) return undefined;
  if ('steps' in value) return value;
  if (typeof value.args === 'string') return unwrapValue(value.args);
  if (value.arguments !== undefined) return unwrapValue(value.arguments);
  if (isRecord(value.function) && value.function.arguments !== undefined) return unwrapValue(value.function.arguments);
  if (value.result !== undefined) return unwrapValue(value.result);
  return undefined;
}

function parseFanout(prompt: string): { project: number; moduleName: string } | null {
  try {
    const parsed = JSON.parse(prompt) as unknown;
    if (!isRecord(parsed) || parsed.planId !== 'usecases50-fanout') return null;
    if (typeof parsed.project !== 'number' || typeof parsed.moduleName !== 'string') return null;
    return { project: parsed.project, moduleName: parsed.moduleName };
  } catch {
    return null;
  }
}

function planIdFromText(prompt: string): string {
  try {
    const parsed = JSON.parse(prompt) as unknown;
    if (!isRecord(parsed) || typeof parsed.planId !== 'string') return '';
    return parsed.planId;
  } catch {
    return '';
  }
}

function agentFile(folder: string, shortName: string): D1FileInfo {
  return { project: 102021, level: 2, folder: `agentDefsL1/${folder}`, shortName, extension: '.md' };
}

function stripComment(value: string): string {
  return value.replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '').trim();
}

function withUsecasesApproved(pipeline: D1PipelineState, artifact: string, now: string): D1PipelineState {
  if (pipeline.steps.usecases50?.status === 'approved' && (pipeline.steps.usecases50.artifactPaths || []).includes(artifact)) {
    return pipeline;
  }
  const next: D1PipelineState = {
    ...pipeline,
    status: 'inProgress',
    steps: {
      ...pipeline.steps,
      usecases50: { status: 'approved', updatedAt: now, artifactPaths: [artifact] },
    },
    updatedAt: now,
  };
  if (pipeline.awaitingStep && pipeline.awaitingStep !== 'usecases50') next.awaitingStep = pipeline.awaitingStep;
  else delete next.awaitingStep;
  return next;
}

function completeOnly(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  message: string,
): mls.msg.AgentIntent[] {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', message)];
}

function refuse(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  message: string,
): mls.msg.AgentIntent[] {
  return [
    ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
    updateStatus(context, parentStep, step, hookSequential, 'completed', message),
  ];
}

function addStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  project: number,
  moduleName: string,
  artifact: string,
  llmCalls: number,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    nextSteps: [],
    stepTitle: 'Usecases done',
    status: 'completed',
    result: JSON.stringify({
      project,
      moduleName,
      completedStep: 'usecases50',
      nextStep: 'controllers60',
      artifact,
      llmCalls,
    }),
    planning: { planId: 'usecases50-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function findOpenParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const current = allSteps(context).find(item => item.stepId === parentStep.stepId);
  if (current?.type === 'agent' && current.status !== 'completed' && current.status !== 'failed') return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function anchorPresent(context: mls.msg.ExecutionContext): boolean {
  return allSteps(context).some(item => planIdOf(item as mls.msg.AIAgentStep) === 'usecases50-done');
}

function allSteps(context: mls.msg.ExecutionContext): mls.msg.AIPayload[] {
  const root = context.task?.iaCompressed?.nextSteps || [];
  const out: mls.msg.AIPayload[] = [];
  const walk = (steps: mls.msg.AIPayload[]) => {
    for (const step of steps) {
      out.push(step);
      if (step.nextSteps?.length) walk(step.nextSteps);
    }
  };
  walk(root);
  return out;
}

D1_STEP_HOOKS.usecases50 = {
  beforePromptStep: beforeD1UsecasesPromptStep,
  afterPromptStep: afterD1UsecasesPromptStep,
};
