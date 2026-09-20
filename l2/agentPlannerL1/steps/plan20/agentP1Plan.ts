/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/agentP1Plan.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  displayPath,
  ontologyEntityFile,
  ontologyIndexFile,
  readDefsJson,
  readJson,
  writeJson,
} from '/_102035_/l2/solution/fs.js';
import {
  listPoolBox,
  readPoolMessage,
  tracePoolAt,
  writePoolMessage,
  type PoolMessage,
} from '/_102035_/l2/solution/pool.js';
import {
  P1_DEVICE,
  P1_FLOW_STEP_IDS,
  createP1RetryStep,
  markP1Complete,
  markP1Step,
  p1BackendFile,
  p1DraftFile,
  p1NeedsFile,
  p1PipelineFile,
  readP1AgentText,
  readP1Pipeline,
  type P1PipelineState,
} from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';
import {
  P1_STEP_HOOKS,
  drainWaitingSiblings,
  updateStatus,
} from '/_102021_/l2/agentPlannerL1/helpers/p1Dispatch.js';
import type { L1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import {
  buildP1BackendMessage,
  buildP1BackendTool,
  buildP1ResolutionSchema,
  normalizeP1Backend,
  parseP1Entity,
  parseP1Needs,
  parseP1OntologyIndex,
  parseP1Resolution,
  planP1Backend,
  unwrapP1ArtifactPayload,
  type P1BackendFile,
  type P1BackendResolution,
  type P1EntityView,
  type P1NeedsFile,
  type P1PlanBackendResult,
} from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import {
  formatP1BackendGate,
  repairP1Backend,
  validateP1Backend,
} from '/_102021_/l2/agentPlannerL1/steps/plan20/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;

interface PlanArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export interface P1PlanSources {
  needs: P1NeedsFile;
  inventory: L1Inventory;
  ontology: P1EntityView[];
  pipeline: P1PipelineState;
}

export interface P1DeliverPlanResult {
  backend: P1BackendFile;
  backendPath: string;
  message: PoolMessage;
  messagePath: string;
  llmCalled: boolean;
}

export function composeP1SystemPrompt(skillText: string, stepPrompt: string): string {
  const skill = skillText.replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '').trim();
  return [skill, stepPrompt].filter(Boolean).join('\n\n');
}

export function buildP1PlanHumanPrompt(input: {
  sources: P1PlanSources;
  planned: P1PlanBackendResult;
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const { needs, inventory, ontology } = input.sources;
  const entityLines = ontology.map(entity => {
    const flags = [entity.family, entity.storageKind, entity.storageTarget].filter(Boolean);
    return `- ${entity.entityId} (${flags.join(', ')})`;
  });
  const inventoryLines = inventory.usecases.map(item => {
    const fn = item.functions.map(fn => fn.name).join(',') || '(none)';
    return `- ${item.usecaseId} file=${item.file} fn=${fn} ports=${item.ports.join(',') || '(none)'}`;
  });
  return [
    `## Module`,
    needs.moduleName,
    '',
    '## Locked draft (deterministic; keep done/toUpdate)',
    JSON.stringify(input.planned.file, null, 2),
    '',
    '## Unresolved candidates (the only thing you decide)',
    JSON.stringify(input.planned.unresolved, null, 2),
    '',
    '## l1 inventory',
    inventory.present ? inventoryLines.join('\n') || '(empty lists)' : '(none — every candidate is toCreate)',
    '',
    '## Entities',
    entityLines.length ? entityLines.join('\n') : '(none)',
    input.gateFeedback ? `\n## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `\n## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(item => item !== '').join('\n');
}

export async function loadP1Ontology(moduleName: string): Promise<P1EntityView[]> {
  const index = await readDefsJson<unknown>(ontologyIndexFile(moduleName));
  if (!index) return [];
  const ids = parseP1OntologyIndex(index);
  const indexRows = Array.isArray((index as { entities?: unknown }).entities)
    ? (index as { entities: unknown[] }).entities
    : [];
  const byId = new Map<string, unknown>();
  for (const row of indexRows) {
    if (row && typeof row === 'object' && 'entityId' in row && typeof (row as { entityId: unknown }).entityId === 'string') {
      byId.set((row as { entityId: string }).entityId, row);
    }
  }
  const out: P1EntityView[] = [];
  for (const entityId of ids) {
    const file = await readDefsJson<unknown>(ontologyEntityFile(moduleName, entityId));
    const parsed = parseP1Entity(file || byId.get(entityId), byId.get(entityId));
    if (parsed) out.push(parsed);
  }
  return out;
}

export async function loadP1PlanSources(moduleName: string): Promise<P1PlanSources> {
  const pipeline = await requirePipeline(moduleName);
  const rawNeeds = await readJson<unknown>(p1NeedsFile(moduleName, pipelineDevice(pipeline)));
  if (rawNeeds === null) throw new Error('needs.json is missing; entry10 must run first.');
  const needs = parseP1Needs(rawNeeds);
  const ontology = await loadP1Ontology(moduleName);
  return {
    needs,
    inventory: pipeline.inventory,
    ontology,
    pipeline,
  };
}

export async function executeP1Plan(
  moduleName: string,
  now: Date,
  resolution?: P1BackendResolution | null,
): Promise<P1DeliverPlanResult> {
  const sources = await loadP1PlanSources(moduleName);
  const planned = planP1Backend({
    needs: sources.needs,
    inventory: sources.inventory,
    ontology: sources.ontology,
    now,
    resolution,
  });
  const repaired = repairP1Backend(planned.file, sources.needs, sources.ontology);
  const gate = validateP1Backend(repaired, sources.needs, sources.ontology);
  if (!gate.ok) throw new Error(formatP1BackendGate(gate.issues));
  return commitP1Plan(sources, repaired, now);
}

export async function beforeP1PlanPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentPlannerL1:plan20] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const sources = await loadP1PlanSources(moduleName);
    const planned = planP1Backend({
      needs: sources.needs,
      inventory: sources.inventory,
      ontology: sources.ontology,
      now: new Date(),
    });
    if (!planned.unresolved.length && !parsed.gateFeedback) {
      const mutationParent = findMutableParent(context, parentStep);
      const delivered = await commitP1Plan(sources, planned.file, new Date());
      return [
        doneAnchor(context, mutationParent, moduleName, delivered),
        updateStatus(
          context,
          mutationParent,
          step,
          hookSequential,
          'completed',
          `plan20 wrote ${delivered.backendPath}`,
        ),
      ];
    }

    const [skill, prompt, previous] = await Promise.all([
      readP1AgentText('skills', 'architecture', '.md'),
      readP1AgentText('steps/plan20', 'prompt', '.md'),
      moduleName ? readJson(p1DraftFile(moduleName, 'plan20')) : Promise.resolve(null),
    ]);
    const schema = buildP1ResolutionSchema();
    const tool = buildP1BackendTool(schema);
    await writeJson(p1DraftFile(moduleName, 'plan20'), planned.file);
    const humanPrompt = buildP1PlanHumanPrompt({
      sources,
      planned,
      gateFeedback: parsed.gateFeedback,
      previousDraft: previous,
    });
    return [promptReady(
      context,
      parentStep,
      hookSequential,
      args || String(step.prompt || ''),
      composeP1SystemPrompt(skill, prompt),
      humanPrompt,
      tool,
    )];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

export async function afterP1PlanPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, step.prompt);
    moduleName = parsed.moduleName;
    const mutationParent = findMutableParent(context, parentStep);
    const payload = unwrapP1ArtifactPayload(step.interaction?.payload?.[0]);
    if (!isRecord(payload)) {
      const failure = readPromptFailure(step, 'plan20 returned no usable backend resolution.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createP1RetryStep('plan20', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `plan20 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const sources = await loadP1PlanSources(moduleName);
    const now = new Date();
    const resolution = parseP1Resolution(payload);
    const planned = planP1Backend({
      needs: sources.needs,
      inventory: sources.inventory,
      ontology: sources.ontology,
      now,
      resolution,
    });
    let draft = normalizeP1Backend(payload, {
      needs: sources.needs,
      inventory: sources.inventory,
      ontology: sources.ontology,
      now,
      resolution,
    });
    if (!draft.endpoints.length) draft = planned.file;
    draft = repairP1Backend(draft, sources.needs, sources.ontology);
    let pipeline = await requirePipeline(moduleName);
    pipeline = await writeStepState(pipeline, {
      status: 'running',
      updatedAt: now.toISOString(),
    });
    const draftPath = await writeJson(p1DraftFile(moduleName, 'plan20'), draft);
    const gate = validateP1Backend(draft, sources.needs, sources.ontology);
    if (!gate.ok) {
      const feedback = formatP1BackendGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createP1RetryStep('plan20', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `plan20 gate scheduled repair ${parsed.repairAttempt + 1}.`),
        ];
      }
      await writeStepState(pipeline, {
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: feedback,
        artifactPaths: [draftPath],
      });
      throw new Error(feedback);
    }

    const delivered = await commitP1Plan(sources, draft, now);
    return [
      doneAnchor(context, mutationParent, moduleName, delivered),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `plan20 wrote ${delivered.backendPath}`),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

async function commitP1Plan(
  sources: P1PlanSources,
  backend: P1BackendFile,
  now: Date,
): Promise<P1DeliverPlanResult> {
  const received = await readReceived(sources.pipeline);
  const message = buildP1BackendMessage({ file: backend, received });
  const backendInfo = p1BackendFile(sources.needs.moduleName, backend.device);
  const backendPath = await writeJson(backendInfo, backend);
  const messageInfo = await writePoolMessage(sources.needs.moduleName, message, now);
  const messagePath = displayPath(messageInfo);
  const pipelineInfo = p1PipelineFile(sources.needs.moduleName);
  await tracePoolAt(pipelineInfo, {
    at: now.toISOString(),
    file: messagePath,
    from: message.from,
    to: message.to,
    thread: message.thread,
    round: message.round,
    mode: message.mode,
    outcome: 'delivered',
  });
  const pipeline = await requirePipeline(sources.needs.moduleName);
  const updated = markP1Step(pipeline, 'plan20', {
    status: 'approved',
    updatedAt: now.toISOString(),
    artifactPaths: [backendPath, messagePath],
  });
  await writeJson(pipelineInfo, markP1Complete(updated, now.toISOString()));
  return {
    backend,
    backendPath,
    message,
    messagePath,
    llmCalled: backend.meta.llmCalled,
  };
}

async function readReceived(pipeline: P1PipelineState): Promise<Pick<PoolMessage, 'thread' | 'round' | 'mode'>> {
  const found = listPoolBox(pipeline.moduleName, 'l1').find(file => displayPath(file) === pipeline.messageFile);
  if (found) {
    try {
      const message = await readPoolMessage(found);
      return { thread: message.thread, round: message.round, mode: message.mode };
    } catch { /* fall through */ }
  }
  return { thread: pipeline.thread, round: pipeline.round, mode: 'implement' };
}

async function requirePipeline(moduleName: string): Promise<P1PipelineState> {
  const pipeline = await readP1Pipeline(moduleName);
  if (!pipeline) throw new Error(`l1 pipeline.json is missing for ${moduleName}; entry10 must run first.`);
  return pipeline;
}

function pipelineDevice(pipeline: P1PipelineState): typeof P1_DEVICE {
  return P1_DEVICE;
}

async function writeStepState(
  pipeline: P1PipelineState,
  next: { status: 'running' | 'approved' | 'failed'; updatedAt: string; error?: string; artifactPaths?: string[] },
): Promise<P1PipelineState> {
  const updated = markP1Step(pipeline, 'plan20', next);
  await writeJson(p1PipelineFile(pipeline.moduleName), updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readP1Pipeline(moduleName);
    if (!pipeline) return;
    await writeJson(p1PipelineFile(moduleName), markP1Step(pipeline, 'plan20', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
    }));
  } catch { /* task trace remains the fallback */ }
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): PlanArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'plan20',
    moduleName,
    repairAttempt: integer(root.repairAttempt),
    transportAttempt: integer(root.transportAttempt),
    gateFeedback: text(root.gateFeedback),
  };
}

function promptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  tool: mls.msg.LLMTool,
): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [tool],
    toolChoice: { type: 'function', function: { name: tool.function.name } },
  };
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  delivered: P1DeliverPlanResult,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Plan done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName,
      artifactPaths: [delivered.backendPath, delivered.messagePath],
      llmCalled: delivered.llmCalled,
      completedStep: 'plan20',
      nextStep: P1_FLOW_STEP_IDS[1] === 'plan20' ? undefined : P1_FLOW_STEP_IDS[1],
    }),
    planning: { planId: 'plan20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
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

function findMutableParent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  const current = allSteps(context).find(item => item.stepId === parentStep.stepId);
  if (isOpenAgent(current)) return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function isOpenAgent(step: mls.msg.AIPayload | undefined): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
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

function readPromptFailure(step: mls.msg.AIAgentStep, fallback: string): string {
  const payload = step.interaction?.payload?.[0];
  const recordValue = isRecord(payload) ? payload : parseRecord(payload);
  if (typeof recordValue.result === 'string' && recordValue.result.trim()) return recordValue.result.trim();
  return fallback;
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

P1_STEP_HOOKS.plan20 = {
  beforePromptStep: beforeP1PlanPromptStep,
  afterPromptStep: afterP1PlanPromptStep,
};
