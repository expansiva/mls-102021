/// <mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/agentD1Resolve.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  displayPath,
  inputFile,
  parseD1StepPrompt,
  pipelineFile,
  resolveFile,
  taskModule,
  taskProject,
  MSG_PROJECT_MISMATCH,
  type D1FileInfo,
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { D1_STEP_HOOKS, planIdOf, stopStep, updateStatus } from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import {
  addStepIntent,
  barrierStepFor,
  decideFanoutRepairs,
  fanoutExecution,
  fanoutRepairOpen,
  fanoutStepFor,
  findOpenParent,
  findPlanStep,
  firstFanoutWorkerArg,
  isFanoutBarrier,
  parseFanoutBarrier,
  parseFanoutWorkerArg,
  planIdFromText,
  planPresent,
  repairStepFor,
  unwrapToolPayload,
  type D1FanoutConfig,
} from '/_102021_/l2/agentDefsL1/helpers/d1Fanout.js';
import { parsePipelineDocument, pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { assembleD1Input, d1SourceKey, persistD1Input, readD1Derivation, readD1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { readContractV2 } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { D1_RESOLVE_VERSION, type D1ResolveAttempt, type D1ResolveReceipt, type D1ResolveUnit, type D1ResolveWork } from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';
import { answersByRoute, buildResolveReceipt, checkResolveReply, keptRoutes, resolveUnits, sourcesDrift } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import {
  readResolveAttempt,
  readResolveReceipt,
  readResolveWork,
  writeResolveAttempt,
  writeResolveReceipt,
  writeResolveWork,
} from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';
import { RESOLVE_TOOL_NAME, resolveHumanPrompt, resolveTool } from '/_102021_/l2/agentDefsL1/steps/resolve25/worker.js';

/**
 * resolve25 (d1_62): between input20 and domain30. No gap, no model call. One worker per route with a gap, on the
 * shared fan-out, barrier and repair (`helpers/d1Fanout.ts`). The receipt `resolve25.json` is keyed by the source
 * key of the input20 derivation. With the answers, resolve25 builds and writes the final `input.json` through the
 * same `buildD1InputSnapshot`, with the `input.json` of the run before as previous.
 */
export const RESOLVE_FANOUT: D1FanoutConfig = {
  stepId: 'resolve25',
  unitKey: 'unitId',
  after: 'input20-done',
  noun: 'route workers',
  barrierTitle: 'Resolve barrier',
};

export async function beforeD1ResolvePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step) || planIdFromText(args || step.prompt || '');
  if (planId === 'resolve25-fanout') {
    return [updateStatus(context, parentStep, step, hookSequential, 'in_progress', 'resolve25 fan-out is waiting for workers.')];
  }
  if (isFanoutBarrier(RESOLVE_FANOUT, planId)) return barrier(context, parentStep, step, hookSequential);
  if (planId.startsWith('resolve25-worker-') || planId.startsWith('resolve25-repair-')) {
    return prepareWorker(context, parentStep, step, hookSequential, args || step.prompt || '');
  }
  const parsed = parseD1StepPrompt(args || step.prompt || '');
  if (parsed.kind === 'refusal') return stopStep(context, parentStep, step, hookSequential, parsed.refusal);
  if (parsed.prompt.planId !== 'resolve25') return stopStep(context, parentStep, step, hookSequential, 'Step prompt planId must be resolve25.');
  const { project, moduleName } = parsed.prompt;
  if (taskProject(context) !== project || taskModule(context) !== moduleName) {
    return stopStep(context, parentStep, step, hookSequential, MSG_PROJECT_MISMATCH);
  }
  const pipeline = await readPipeline(project, moduleName);
  if (!pipeline || pipeline.steps.input20?.status !== 'approved') {
    return stopStep(context, parentStep, step, hookSequential, 'Checkpoint is not intact. resolve25 wrote nothing.');
  }
  const derivation = await readD1Derivation(project, moduleName);
  if (!derivation?.sourceKey) return stopStep(context, parentStep, step, hookSequential, 'input20.json is missing. resolve25 wrote nothing.');
  const artifacts = await readD1InputArtifacts(project, moduleName);
  const sourceKey = await d1SourceKey({ project, moduleName }, artifacts);
  if (sourceKey !== derivation.sourceKey) {
    const drift = sourcesDrift(derivation.sources, artifacts.sources);
    return stopStep(context, parentStep, step, hookSequential, `Sources changed after input20 sealed the snapshot${drift.length ? `: ${drift.join(', ')}` : ''}. resolve25 wrote nothing. Run /run again.`);
  }
  const kept = await readResolveReceipt(project, moduleName);
  const units = resolveUnits(artifacts);
  // Same sources: the receipt is kept only when it answers every gap the derivation opens now.
  if (kept && kept.sourceKey === sourceKey && receiptAnswersUnits(kept, units)) {
    return finish(context, parentStep, step, hookSequential, pipeline, kept, `resolve25 kept the answers for ${moduleName}. No model was called.`, 0);
  }
  const work: D1ResolveWork = { schemaVersion: D1_RESOLVE_VERSION, project, moduleName, sourceKey, units, repairs: 0 };
  if (!units.length) {
    const receipt = buildResolveReceipt(work, []);
    await writeResolveReceipt(receipt);
    return finish(context, parentStep, step, hookSequential, pipeline, receipt, `resolve25 found no open part in the contract routes of ${moduleName}. No model was called.`, 0);
  }
  // A different source key keeps a route only when every gap still matches the receipt (gapKey). The rest is asked.
  const reused = kept && kept.sourceKey !== sourceKey ? keptRoutes(kept, units) : new Map<string, Record<string, string>>();
  await writeResolveWork(work);
  const keptAttempts: D1ResolveAttempt[] = [];
  for (const unit of units) {
    const answers = reused.get(unit.unitId);
    if (answers) {
      const row = kept?.routes.find(item => item.route === unit.route);
      const planId = row?.answers.find(item => item.call)?.call || '';
      const attempt: D1ResolveAttempt = {
        unitId: unit.unitId,
        status: 'parsed',
        trace: 'Kept from the previous resolve25 receipt. No model was called.',
        unitAttempts: 0,
        planId,
        calls: 0,
        answers,
      };
      keptAttempts.push(attempt);
      await writeResolveAttempt(project, moduleName, attempt);
      continue;
    }
    // Each dispatch starts its units from zero: an attempt of an earlier run is neither an answer nor a call of this one.
    await writeResolveAttempt(project, moduleName, {
      unitId: unit.unitId,
      status: 'operational',
      trace: 'The worker was not dispatched yet.',
      unitAttempts: 0,
      planId: '',
      calls: 0,
      answers: {},
    });
  }
  const pending = units.filter(unit => !reused.has(unit.unitId));
  if (!pending.length) {
    const receipt = buildResolveReceipt(work, keptAttempts);
    await writeResolveReceipt(receipt);
    return finish(context, parentStep, step, hookSequential, pipeline, receipt, `resolve25 kept the answered routes for ${moduleName} from the previous receipt. No model was called.`, 0);
  }
  const workerArgs = pending.map(unit => firstFanoutWorkerArg(RESOLVE_FANOUT, project, moduleName, unit.unitId));
  const fanout = fanoutStepFor(RESOLVE_FANOUT, project, moduleName, workerArgs);
  const gaps = pending.reduce((sum, unit) => sum + unit.gaps.length, 0);
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
    addStepIntent(context, parentStep, barrierStepFor(RESOLVE_FANOUT, project, moduleName, [fanout.planning?.planId || 'resolve25-fanout'], '')),
    updateStatus(context, parentStep, step, hookSequential, 'in_progress', `resolve25 dispatched ${pending.length} route workers for ${gaps} open parts, at most 5 at once.`),
  ];
}

export async function afterD1ResolvePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step) || planIdFromText(args || step.prompt || '');
  if (planId === 'resolve25-fanout') {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'resolve25 fan-out closed. The barrier step decides repair.')];
  }
  if (isFanoutBarrier(RESOLVE_FANOUT, planId)) {
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'resolve25 barrier already decided.')];
  }
  if (planId.startsWith('resolve25-worker-') || planId.startsWith('resolve25-repair-')) {
    return finishWorker(context, parentStep, step, hookSequential, args || step.prompt || '');
  }
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'resolve25 already recorded.')];
}

async function prepareWorker(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  prompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const arg = parseFanoutWorkerArg(RESOLVE_FANOUT, prompt);
  if (!arg) return stopStep(context, parentStep, step, hookSequential, 'Worker args are not a resolve25 unit.');
  if (taskProject(context) !== arg.project || taskModule(context) !== arg.moduleName) {
    return stopStep(context, parentStep, step, hookSequential, MSG_PROJECT_MISMATCH);
  }
  const work = await readResolveWork(arg.project, arg.moduleName);
  const unit = work?.units.find(item => item.unitId === arg.unitId);
  if (!work || !unit) return stopStep(context, parentStep, step, hookSequential, `Unit ${arg.unitId} is not in the resolve25 work.`);
  const instructions = await readText(agentFile('steps/resolve25', 'prompt'));
  if (!instructions) return stopStep(context, parentStep, step, hookSequential, 'resolve25 prompt is missing.');
  const artifacts = await readD1InputArtifacts(arg.project, arg.moduleName);
  const definition = readContractV2(artifacts.contractTexts).get(unit.pageId);
  const route = definition?.routes.find(item => item.route === unit.route);
  const prior = await readResolveAttempt(arg.project, arg.moduleName, arg.unitId);
  const calls = (prior?.calls || 0) + 1;
  if (!definition || !route) {
    const trace = `Route ${unit.route} is not in contract ${unit.pageId} any more. It was not sent to the model.`;
    await writeResolveAttempt(arg.project, arg.moduleName, { unitId: unit.unitId, status: 'operational', trace, unitAttempts: arg.unitAttempts, planId: arg.planId, calls: prior?.calls || 0, answers: {} });
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', trace)];
  }
  // Until a reply lands, the attempt is operational: a missing reply is not a parsed one.
  await writeResolveAttempt(arg.project, arg.moduleName, {
    unitId: unit.unitId,
    status: 'operational',
    trace: 'The model reply did not arrive.',
    unitAttempts: arg.unitAttempts,
    planId: arg.planId,
    calls,
    answers: {},
  });
  return [{
    type: 'prompt_ready',
    args: prompt,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: instructions.trim(),
    humanPrompt: resolveHumanPrompt({ unit, route, definition, feedback: arg.feedback }),
    tools: [resolveTool(unit)],
    toolChoice: { type: 'function', function: { name: RESOLVE_TOOL_NAME } },
  }];
}

async function finishWorker(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  prompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const arg = parseFanoutWorkerArg(RESOLVE_FANOUT, prompt);
  if (!arg) return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Worker args are not a resolve25 unit.')];
  const work = await readResolveWork(arg.project, arg.moduleName);
  const unit = work?.units.find(item => item.unitId === arg.unitId);
  const prior = await readResolveAttempt(arg.project, arg.moduleName, arg.unitId);
  if (!unit) return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Unit ${arg.unitId} is not in the resolve25 work.`)];
  const payload = unwrapToolPayload(step, 'answers');
  if (!payload.present) {
    // A route closed before the model (prepareWorker) keeps its own trace.
    const trace = prior?.trace || 'The model reply did not arrive.';
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', trace)];
  }
  const checked = checkResolveReply(unit, payload.value);
  const outcome = checked.problems.length ? checked.problems.join(' ') : `resolve25 recorded ${unit.gaps.length} answers for ${unit.route}.`;
  const attempt: D1ResolveAttempt = {
    unitId: unit.unitId,
    status: checked.problems.length ? 'repairable' : 'parsed',
    trace: arg.feedback ? `Repair request: ${arg.feedback} ${outcome}` : outcome,
    unitAttempts: arg.unitAttempts,
    planId: arg.planId,
    calls: prior?.calls || 1,
    answers: checked.answers,
  };
  await writeResolveAttempt(arg.project, arg.moduleName, attempt);
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', attempt.trace)];
}

async function barrier(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const prompt = parseFanoutBarrier(RESOLVE_FANOUT, step.prompt || '');
  if (!prompt) return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Barrier prompt is not a resolve25 dispatch.')];
  const work = await readResolveWork(prompt.project, prompt.moduleName);
  if (!work) return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'resolve25 work file is missing.')];
  const attempts = (await Promise.all(work.units.map(unit => readResolveAttempt(prompt.project, prompt.moduleName, unit.unitId))))
    .filter((item): item is D1ResolveAttempt => item !== null);
  const decision = decideFanoutRepairs(RESOLVE_FANOUT, {
    expected: work.units.map(unit => unit.unitId),
    attempts,
    globalAttempts: work.repairs,
    feedbackFor: unitId => attempts.find(item => item.unitId === unitId)?.trace || '',
  });
  if (decision.repairs.length) {
    const fresh = decision.repairs.filter(order => !fanoutRepairOpen(RESOLVE_FANOUT, context, order.unitId));
    if (!fresh.length) return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'barrier left repairs already open.')];
    work.repairs = fresh[fresh.length - 1].globalAttempts;
    await writeResolveWork(work);
    const named = fresh.map(item => `${item.unitId}: ${item.feedback || item.planId}`).join('; ');
    return [
      ...fresh.map(order => addStepIntent(context, parentStep, repairStepFor(RESOLVE_FANOUT, prompt.project, prompt.moduleName, order))),
      addStepIntent(context, parentStep, barrierStepFor(RESOLVE_FANOUT, prompt.project, prompt.moduleName, fresh.map(item => item.planId), String(work.repairs))),
      updateStatus(context, parentStep, step, hookSequential, 'completed', `barrier scheduled ${fresh.length} repair${fresh.length === 1 ? '' : 's'}. ${named}`),
    ];
  }
  if (decision.pause) {
    const named = decision.identified.map(item => `${item.unitId} ${item.code}: ${item.trace}`).join('; ');
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
  // After the one repair, a gap without an accepted choice is none. It stays a gap downstream (review), not a stop.
  const receipt = buildResolveReceipt(work, attempts);
  await writeResolveReceipt(receipt);
  const open = receipt.routes.reduce((sum, row) => sum + row.answers.filter(item => !item.call).length, 0);
  const exhausted = decision.identified.map(item => `${item.unitId} ${item.code}: ${item.trace}`).join('; ');
  const message = `resolve25 recorded ${receipt.routes.length} routes with ${receipt.llmCalls} model calls; ${open} open parts stay none.${exhausted ? ` ${exhausted}` : ''}`;
  const pipeline = await readPipeline(prompt.project, prompt.moduleName);
  if (!pipeline) return [updateStatus(context, parentStep, step, hookSequential, 'completed', `${message} The checkpoint is missing.`)];
  const intents = await finish(context, parentStep, step, hookSequential, pipeline, receipt, message, receipt.llmCalls);
  const main = findPlanStep(context, 'resolve25');
  if (main && main.stepId !== step.stepId && main.status !== 'completed' && main.status !== 'failed') {
    const held = intents.some(intent => intent.type === 'update-status' && intent.status === 'failed');
    intents.push(updateStatus(context, findOpenParent(context, parentStep), main, hookSequential, held ? 'failed' : 'completed', message));
  }
  return intents;
}

/**
 * Builds the final inventory with the answers and writes `input.json`. When it does not release the consumer phases
 * the step is held with the reason, as input20 holds. Otherwise approves the step and mints `resolve25-done` once.
 */
async function finish(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  pipeline: D1PipelineState,
  receipt: D1ResolveReceipt,
  message: string,
  llmCalls: number,
): Promise<mls.msg.AgentIntent[]> {
  const final = await assembleD1Input(pipeline.project, pipeline.moduleName, answersByRoute(receipt));
  await persistD1Input(pipeline.project, pipeline.moduleName, final);
  const artifact = displayPath(resolveFile(pipeline.project, pipeline.moduleName));
  if (!final.consumersReleased) {
    const reason = blockingReason(final);
    const held = withResolveHeld(pipeline, artifact, reason, new Date().toISOString());
    if (JSON.stringify(held) !== JSON.stringify(pipeline)) {
      const issues = pipelineIssues(held);
      if (issues.length > 0) throw new Error(`Checkpoint schema refused: ${issues[0]}`);
      await writeJson(pipelineFile(pipeline.project, pipeline.moduleName), held);
    }
    const trace = `${message} The final ${displayPath(inputFile(pipeline.project, pipeline.moduleName))} does not release the consumer phases.${reason ? ` ${reason}` : ''}`;
    return stopStep(context, findOpenParent(context, parentStep), step, hookSequential, trace, {
      drainTrace: `stopped: consumer phases are not released.${reason ? ` ${reason}` : ''}`,
    });
  }
  const approved = withResolveApproved(pipeline, artifact, new Date().toISOString());
  if (JSON.stringify(approved) !== JSON.stringify(pipeline)) await writeJson(pipelineFile(pipeline.project, pipeline.moduleName), approved);
  const parent = findOpenParent(context, parentStep);
  const intents: mls.msg.AgentIntent[] = [];
  if (!planPresent(context, 'resolve25-done')) {
    intents.push(addStepIntent(context, parent, {
      type: 'result',
      stepId: 0,
      interaction: null,
      nextSteps: [],
      stepTitle: 'Resolve done',
      status: 'completed',
      result: JSON.stringify({ project: pipeline.project, moduleName: pipeline.moduleName, completedStep: 'resolve25', nextStep: 'domain30', artifact, llmCalls }),
      planning: { planId: 'resolve25-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep));
  }
  intents.push(updateStatus(context, parent, step, hookSequential, 'completed', message));
  return intents;
}

/** Error-severity codes and counts, the shape input20 holds with. The paths stay in input.json. */
function blockingReason(snapshot: { problems: ReadonlyArray<{ severity: string; code: string }> }): string {
  const counts = new Map<string, number>();
  for (const problem of snapshot.problems) {
    if (problem.severity !== 'error' || !problem.code) continue;
    counts.set(problem.code, (counts.get(problem.code) || 0) + 1);
  }
  return [...counts.keys()].sort().map(code => `${code}:${counts.get(code)}`).join(',');
}

function withResolveHeld(pipeline: D1PipelineState, artifact: string, reason: string, now: string): D1PipelineState {
  const current = pipeline.steps.resolve25;
  if (pipeline.status === 'awaitingStep' && pipeline.awaitingStep === 'resolve25' && current?.status === 'failed' && (current.error || '') === reason) return pipeline;
  return {
    ...pipeline,
    status: 'awaitingStep',
    awaitingStep: 'resolve25',
    steps: { ...pipeline.steps, resolve25: { status: 'failed', updatedAt: now, artifactPaths: [artifact], ...(reason ? { error: reason } : {}) } },
    updatedAt: now,
  };
}

function withResolveApproved(pipeline: D1PipelineState, artifact: string, now: string): D1PipelineState {
  if (pipeline.steps.resolve25?.status === 'approved' && (pipeline.steps.resolve25.artifactPaths || []).includes(artifact)) return pipeline;
  const next: D1PipelineState = {
    ...pipeline,
    status: 'inProgress',
    steps: { ...pipeline.steps, resolve25: { status: 'approved', updatedAt: now, artifactPaths: [artifact] } },
    updatedAt: now,
  };
  if (pipeline.awaitingStep && pipeline.awaitingStep !== 'resolve25') next.awaitingStep = pipeline.awaitingStep;
  else delete next.awaitingStep;
  return next;
}

async function readPipeline(project: number, moduleName: string): Promise<D1PipelineState | null> {
  const raw = await readText(pipelineFile(project, moduleName));
  const pipeline = raw ? parsePipelineDocument(raw) : null;
  return pipeline && pipeline.project === project && pipeline.moduleName === moduleName ? pipeline : null;
}

function agentFile(folder: string, shortName: string): D1FileInfo {
  return { project: 102021, level: 2, folder: `agentDefsL1/${folder}`, shortName, extension: '.md' };
}

D1_STEP_HOOKS.resolve25 = {
  beforePromptStep: beforeD1ResolvePromptStep,
  afterPromptStep: afterD1ResolvePromptStep,
};

/** True when the receipt has, per route, exactly the gap paths of the units. */
function receiptAnswersUnits(receipt: D1ResolveReceipt, units: readonly D1ResolveUnit[]): boolean {
  const asked = (paths: readonly string[]): string => [...paths].sort().join('\n');
  const kept = new Map(receipt.routes.filter(row => row.answers.length).map(row => [row.route, asked(row.answers.map(item => item.path))]));
  if (kept.size !== units.length) return false;
  return units.every(unit => kept.get(unit.route) === asked(unit.gaps.map(gap => gap.path)));
}
