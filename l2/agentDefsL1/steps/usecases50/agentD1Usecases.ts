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
import { parsePipelineDocument, pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { unitIsIntact } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { readD1Input, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { blockingDrift, blockingFinding } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import type { D1PromptEvidence, D1UsecaseContext } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import {
  accountCalls,
  openCallDispatch,
  openCallResume,
  readCallLog,
  recordCallEvent,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';
import {
  barrierStep,
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
  holdUnresolvedBuild,
  loadD1UsecaseWork,
  readAttempts,
  readD1UsecaseWork,
  readPromptEvidence,
  sourceBlockTrace,
  writeAttempt,
  writeD1UsecaseWork,
  writePromptEvidence,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { closedFromRequest, parseWorkerReply, usecaseHumanPrompt, usecaseTool, workerStepShape } from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';

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
  if (isBarrierPlan(planId)) return barrier(context, parentStep, step, hookSequential);
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
  const snapshot = await readD1Input(parsed.prompt.project, parsed.prompt.moduleName);
  if (
    snapshot?.snapshotHash
    && await unitIsIntact(parsed.prompt.project, parsed.prompt.moduleName, 'usecases50', 'usecases50', snapshot.snapshotHash)
  ) {
    const artifact = displayPath(draftFile(parsed.prompt.project, parsed.prompt.moduleName, 'usecases50'));
    const approved = withUsecasesApproved(pipeline, artifact, new Date().toISOString());
    if (JSON.stringify(approved) !== JSON.stringify(pipeline)) await writeJson(checkpointFile, approved);
    const mutationParent = findOpenParent(context, parentStep);
    const kept = `usecases50 kept the defs for ${parsed.prompt.moduleName}. No model was called.`;
    if (anchorPresent(context)) {
      return [updateStatus(context, mutationParent, step, hookSequential, 'completed', kept)];
    }
    await openCallResume(parsed.prompt.project, parsed.prompt.moduleName);
    const calls = accountCalls(await readCallLog(parsed.prompt.project, parsed.prompt.moduleName));
    return [
      doneAnchor(context, mutationParent, parsed.prompt.project, parsed.prompt.moduleName, artifact, calls),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', kept),
    ];
  }
  const loaded = await loadD1UsecaseWork(parsed.prompt.project, parsed.prompt.moduleName);
  if ('refusal' in loaded) return refuse(context, parentStep, step, hookSequential, loaded.refusal);
  await writeD1UsecaseWork(parsed.prompt.project, loaded.work);
  const ids = loaded.work.request.usecases.map(usecase => usecase.usecaseId);
  const workerArgs = ids.map(usecaseId => firstWorkerArg(parsed.prompt.project, parsed.prompt.moduleName, usecaseId));
  const fanout = fanoutStep(parsed.prompt.project, parsed.prompt.moduleName, workerArgs);
  // The host completes a parallel parent without calling its afterPrompt.
  // The barrier depends on the fan-out, so the host unlocks it afterwards.
  const barrierDepends = [fanout.planning?.planId || 'usecases50-fanout'];
  await openCallDispatch(parsed.prompt.project, parsed.prompt.moduleName);
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
    addStep(context, parentStep, barrierStep(parsed.prompt.project, parsed.prompt.moduleName, barrierDepends, '')),
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
  if (planId === 'usecases50-fanout') {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'usecases50 fan-out closed. The barrier step decides repair.')];
  }
  if (isBarrierPlan(planId)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'usecases50 barrier already decided.')];
  }
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
  const packet = work.request.contexts?.find(item => item.usecaseId === usecase.usecaseId);
  const [skill, instructions] = await Promise.all([
    readText(agentFile('skills', 'usecase')),
    readText(agentFile('steps/usecases50', 'prompt')),
  ]);
  if (!instructions) return refuse(context, parentStep, step, hookSequential, 'usecases50 prompt is missing.');
  const snapshot = await readD1Input(arg.project, arg.moduleName);
  const blocked = packet
    ? await blockingDrift(arg.project, packet, snapshot?.sources || []) || blockingFinding(packet.findings)
    : null;
  if (blocked) {
    const evidence = await evidenceFor(usecase.usecaseId, blocked.message, packet, snapshot?.snapshotHash || '');
    await writeAttempt(arg.project, arg.moduleName, {
      usecaseId: usecase.usecaseId,
      status: 'operational',
      trace: blocked.message,
      unitAttempts: arg.unitAttempts,
      reply: null,
      request: evidence,
    });
    await recordCallEvent(arg.project, arg.moduleName, {
      kind: 'not_dispatched',
      usecaseId: arg.usecaseId,
      planId: arg.planId,
      unitAttempts: arg.unitAttempts,
    });
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', blocked.message)];
  }
  // Same catalogs for the tool and both prompts. An empty catalog omits that branch.
  const closed = closedFromRequest(work.request, usecase, packet);
  const humanPrompt = usecaseHumanPrompt({
    usecase,
    entityId: usecase.entity,
    storageTarget: entity?.storageTarget || '',
    namespace: entity?.namespace || '',
    portId: closed.portIds?.[0] || '',
    methods: [...(closed.portCalls || [])],
    rules: [...(closed.ruleIds || [])],
    effects: [...(closed.eventIds || [])],
    routes: usecase.routes,
    context: packet,
    closed,
    feedback: arg.feedback,
  });
  const evidence = await evidenceFor(usecase.usecaseId, humanPrompt, packet, snapshot?.snapshotHash || '');
  await writePromptEvidence(arg.project, arg.moduleName, evidence);
  await recordCallEvent(arg.project, arg.moduleName, {
    kind: 'prompt_assembled',
    usecaseId: arg.usecaseId,
    planId: arg.planId,
    unitAttempts: arg.unitAttempts,
  });
  const shape = workerStepShape(closed);
  return [{
    type: 'prompt_ready',
    args: prompt,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    // Skill comment is removed. The step prompt is not: its modelType is what the host routes on.
    systemPrompt: [stripComment(skill || ''), instructions.trim(), shape].filter(Boolean).join('\n\n'),
    humanPrompt,
    tools: [usecaseTool(closed)],
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
  const prior = await readPromptEvidence(arg.project, arg.moduleName, arg.usecaseId);
  const blockedTrace = !payload.present ? await sourceBlockTrace(arg.project, arg.moduleName, arg.usecaseId) : null;
  if (blockedTrace) return [completeOnly(context, parentStep, step, hookSequential, blockedTrace)[0]];
  const operational = parsed.problems.some(problem => problem.code === 'OPERATIONAL');
  const outcome = parsed.problems.map(problem => problem.message).join(' ') || `usecases50 recorded steps for ${arg.usecaseId}.`;
  const trace = arg.feedback ? `Repair request: ${arg.feedback} ${outcome}` : outcome;
  const attempt: D1AttemptTrace = {
    usecaseId: arg.usecaseId,
    status: operational ? 'operational' : parsed.steps ? 'parsed' : 'repairable',
    trace,
    unitAttempts: arg.unitAttempts,
    reply: parsed.steps,
    request: prior || undefined,
  };
  await writeAttempt(arg.project, arg.moduleName, attempt);
  await recordCallEvent(arg.project, arg.moduleName, {
    kind: payload.present ? 'reply_delivered' : 'reply_absent',
    usecaseId: arg.usecaseId,
    planId: arg.planId,
    unitAttempts: arg.unitAttempts,
  });
  return [completeOnly(context, parentStep, step, hookSequential, trace)[0]];
}

async function barrier(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const prompt = parseBarrier(step.prompt || '');
  if (!prompt) return completeOnly(context, parentStep, step, hookSequential, 'Barrier prompt is not a usecase dispatch.');
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
  const fresh = decision.repairs.filter(order => !repairOpen(context, order.usecaseId));
  if (decision.repairs.length) {
    if (!fresh.length) {
      return completeOnly(context, parentStep, step, hookSequential, 'barrier left repairs already open.');
    }
    work.repairs = fresh[fresh.length - 1].globalAttempts;
    await writeD1UsecaseWork(prompt.project, work);
    for (const order of fresh) {
      await recordCallEvent(prompt.project, prompt.moduleName, {
        kind: 'repair_scheduled',
        usecaseId: order.usecaseId,
        planId: order.planId,
        unitAttempts: order.unitAttempts,
      });
    }
    const named = fresh.map(item => `${item.usecaseId}: ${item.feedback || item.planId}`).join('; ');
    const follow = barrierStep(prompt.project, prompt.moduleName, fresh.map(item => item.planId), String(work.repairs));
    return [
      ...fresh.map(order => addStep(context, parentStep, repairStep(prompt.project, prompt.moduleName, order))),
      addStep(context, parentStep, follow),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `barrier scheduled ${fresh.length} repair${fresh.length === 1 ? '' : 's'}. ${named}`),
    ];
  }
  if (decision.identified.length || decision.pause) {
    const named = decision.identified.map(item => `${item.usecaseId} ${item.code}: ${item.trace}`).join('; ');
    if (!decision.pause) {
      return closeUnresolved(context, parentStep, step, hookSequential, prompt, work, classified, decision.identified);
    }
    return [
      {
        type: 'pause-or-continue',
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        reason: `operational failure: ${named}`,
      },
      updateStatus(context, parentStep, step, hookSequential, 'completed', `barrier identified ${named}`),
    ];
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
  const calls = accountCalls(await readCallLog(prompt.project, prompt.moduleName));
  const anchor = anchorPresent(context) ? [] : [doneAnchor(context, mutationParent, prompt.project, prompt.moduleName, artifact, calls)];
  const message = `usecases50 wrote ${committed.written.length} usecase defs.`;
  const usecases = usecasesStep(context);
  return [
    ...anchor,
    updateStatus(context, mutationParent, step, hookSequential, 'completed', message),
    ...(usecases && usecases.stepId !== step.stepId && usecases.status !== 'completed' && usecases.status !== 'failed'
      ? [updateStatus(context, mutationParent, usecases, hookSequential, 'completed', message)]
      : []),
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

function parseBarrier(prompt: string): { project: number; moduleName: string } | null {
  try {
    const parsed = JSON.parse(prompt) as unknown;
    if (!isRecord(parsed) || typeof parsed.planId !== 'string' || !isBarrierPlan(parsed.planId)) return null;
    if (typeof parsed.project !== 'number' || typeof parsed.moduleName !== 'string') return null;
    return { project: parsed.project, moduleName: parsed.moduleName };
  } catch {
    return null;
  }
}

function isBarrierPlan(planId: string): boolean {
  return planId === 'usecases50-barrier' || /^usecases50-barrier-\d+$/.test(planId);
}

function repairOpen(context: mls.msg.ExecutionContext, usecaseId: string): boolean {
  return allSteps(context).some(item => {
    if (item.type !== 'agent') return false;
    if (item.status === 'completed' || item.status === 'failed') return false;
    const arg = parseWorkerArg(item.prompt || '');
    return arg?.usecaseId === usecaseId && arg.planId.startsWith('usecases50-repair-');
  });
}

function usecasesStep(context: mls.msg.ExecutionContext): mls.msg.AIAgentStep | null {
  const found = allSteps(context).find(item => item.type === 'agent' && item.planning?.planId === 'usecases50');
  return found?.type === 'agent' ? found : null;
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

async function closeUnresolved(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  prompt: { project: number; moduleName: string },
  work: NonNullable<Awaited<ReturnType<typeof readD1UsecaseWork>>>,
  classified: readonly D1AttemptTrace[],
  identified: readonly { usecaseId: string; code: string; trace: string }[],
): Promise<mls.msg.AgentIntent[]> {
  const build = holdUnresolvedBuild(work, classified, identified, classified.length);
  const committed = await commitD1Usecases(prompt.project, build);
  const reason = blockingReason(build.problems);
  const artifact = displayPath(draftFile(prompt.project, prompt.moduleName, 'usecases50'));
  const checkpointFile = pipelineFile(prompt.project, prompt.moduleName);
  const raw = await readText(checkpointFile);
  const pipeline = raw ? parsePipelineDocument(raw) : null;
  if (pipeline && pipeline.project === prompt.project && pipeline.moduleName === prompt.moduleName) {
    const held = withUsecasesHeld(pipeline, artifact, reason, new Date().toISOString());
    if (JSON.stringify(held) !== JSON.stringify(pipeline)) {
      const issues = pipelineIssues(held);
      if (issues.length > 0) throw new Error(`Checkpoint schema refused: ${issues[0]}`);
      await writeJson(checkpointFile, held);
    }
  }
  const named = identified.map(item => `${item.usecaseId} ${item.code}: ${item.trace}`).join('; ');
  const writeNote = committed.issues[0]
    ? `Defs were not all written: ${committed.issues[0]}`
    : `Wrote ${committed.written.length} usecase defs.`;
  const trace = `usecases50 closed. ${writeNote} Unresolved: ${named}. ${reason}. The next phase is not released.`;
  const stopped = `stopped: usecases50 is held.${reason ? ` ${reason}` : ''}`;
  const usecases = usecasesStep(context);
  const intents: mls.msg.AgentIntent[] = [
    ...drainWaitingSiblings(context, step, hookSequential, stopped),
    updateStatus(context, parentStep, step, hookSequential, 'completed', trace),
  ];
  if (usecases && usecases.stepId !== step.stepId && usecases.status !== 'completed' && usecases.status !== 'failed') {
    intents.push(updateStatus(context, findOpenParent(context, parentStep), usecases, hookSequential, 'completed', trace));
  }
  return intents;
}

/** Error-severity codes and counts, the same shape input20 writes. */
function blockingReason(problems: readonly { severity: string; code: string }[]): string {
  const counts = new Map<string, number>();
  for (const problem of problems) {
    if (problem.severity !== 'error' || problem.code.length === 0) continue;
    counts.set(problem.code, (counts.get(problem.code) || 0) + 1);
  }
  return [...counts.keys()].sort().map(code => `${code}:${counts.get(code)}`).join(',');
}

function withUsecasesHeld(pipeline: D1PipelineState, artifact: string, reason: string, now: string): D1PipelineState {
  const current = pipeline.steps.usecases50;
  if (current?.status === 'approved') return pipeline;
  const paths = current?.artifactPaths || [];
  if (
    pipeline.status === 'awaitingStep'
    && pipeline.awaitingStep === 'usecases50'
    && current?.status === 'failed'
    && (current.error || '') === reason
    && paths.length === 1
    && paths[0] === artifact
  ) {
    return pipeline;
  }
  return {
    ...pipeline,
    status: 'awaitingStep',
    awaitingStep: 'usecases50',
    steps: {
      ...pipeline.steps,
      usecases50: {
        status: 'failed',
        updatedAt: now,
        artifactPaths: [artifact],
        ...(reason ? { error: reason } : {}),
      },
    },
    updatedAt: now,
  };
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

async function evidenceFor(
  usecaseId: string,
  text: string,
  packet: D1UsecaseContext | undefined,
  snapshotHash: string,
): Promise<D1PromptEvidence> {
  return {
    usecaseId,
    bytes: new TextEncoder().encode(text).length,
    sha256: await sha256Text(text),
    snapshotHash,
    sourceHashes: packet?.sources || [],
    text,
  };
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
  calls: { repliesDelivered: number | null; repliesUnknown: string; invocationReplies: number | null },
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
      repliesDelivered: calls.repliesDelivered,
      repliesUnknown: calls.repliesUnknown,
      invocationReplies: calls.invocationReplies,
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
