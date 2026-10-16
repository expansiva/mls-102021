/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/agentD1Usecases.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  displayPath,
  draftFile,
  parseD1StepPrompt,
  pipelineFile,
  taskModule,
  taskProject,
  MSG_PROJECT_MISMATCH,
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  D1_STEP_HOOKS,
  stopStep,
  updateStatus,
} from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import { parsePipelineDocument, pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { unitIsIntact } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { blockingDrift, blockingFinding } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import type { D1UsecaseWork } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import {
  accountCalls,
  openCallResume,
  readCallLog,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';
import {
  buildFromWork,
  commitD1Usecases,
  loadD1UsecaseWork,
  writeD1UsecaseWork,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import {
  addStepIntent as addStep,
  findOpenParent,
  findPlanStep,
  planPresent,
} from '/_102021_/l2/agentDefsL1/helpers/d1Fanout.js';

export async function beforeD1UsecasesPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
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
    if (planPresent(context, 'usecases50-done')) {
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
  return settle(context, parentStep, step, hookSequential, { project: parsed.prompt.project, moduleName: parsed.prompt.moduleName }, loaded.work);
}

export async function afterD1UsecasesPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'usecases50 already recorded.')];
}

async function settle(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  prompt: { project: number; moduleName: string },
  work: D1UsecaseWork,
): Promise<mls.msg.AgentIntent[]> {
  const snapshot = await readD1Input(prompt.project, prompt.moduleName);
  const blocked: string[] = [];
  for (const usecase of work.request.usecases) {
    const packet = work.request.contexts?.find(item => item.usecaseId === usecase.usecaseId);
    const stop = packet
      ? await blockingDrift(prompt.project, packet, snapshot?.sources || []) || blockingFinding(packet.findings)
      : null;
    if (stop) blocked.push(`${usecase.usecaseId}: ${stop.message}`);
  }
  if (blocked.length) {
    return stopStep(context, parentStep, step, hookSequential, `usecases50 wrote nothing. ${blocked.join('; ')}`);
  }
  const build = buildFromWork(work, [], 0);
  const committed = await commitD1Usecases(prompt.project, build);
  if (!build.ok || committed.issues.length) {
    const message = committed.issues[0] || build.problems.find(problem => problem.severity === 'error')?.message || 'usecases50 refused the plan.';
    const checkpointFile = pipelineFile(prompt.project, prompt.moduleName);
    const raw = await readText(checkpointFile);
    const pipeline = raw ? parsePipelineDocument(raw) : null;
    const artifact = displayPath(draftFile(prompt.project, prompt.moduleName, 'usecases50'));
    const reason = blockingReason(build.problems);
    if (pipeline && pipeline.project === prompt.project && pipeline.moduleName === prompt.moduleName) {
      const held = withUsecasesHeld(pipeline, artifact, reason, new Date().toISOString());
      if (JSON.stringify(held) !== JSON.stringify(pipeline)) {
        const issues = pipelineIssues(held);
        if (issues.length > 0) throw new Error(`Checkpoint schema refused: ${issues[0]}`);
        await writeJson(checkpointFile, held);
      }
    }
    return stopStep(context, parentStep, step, hookSequential, message);
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
  const anchor = planPresent(context, 'usecases50-done') ? [] : [doneAnchor(context, mutationParent, prompt.project, prompt.moduleName, artifact, calls)];
  const message = `usecases50 wrote ${committed.written.length} usecase defs. No model was called.`;
  const usecases = findPlanStep(context, 'usecases50');
  return [
    ...anchor,
    updateStatus(context, mutationParent, step, hookSequential, 'completed', message),
    ...(usecases && usecases.stepId !== step.stepId && usecases.status !== 'completed' && usecases.status !== 'failed'
      ? [updateStatus(context, mutationParent, usecases, hookSequential, 'completed', message)]
      : []),
  ];
}

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

function refuse(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  message: string,
): mls.msg.AgentIntent[] {
  return stopStep(context, parentStep, step, hookSequential, message);
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

D1_STEP_HOOKS.usecases50 = {
  beforePromptStep: beforeD1UsecasesPromptStep,
  afterPromptStep: afterD1UsecasesPromptStep,
};
