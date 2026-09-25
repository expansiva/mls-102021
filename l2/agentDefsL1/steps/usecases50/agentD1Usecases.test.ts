/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/agentD1Usecases.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  displayPath,
  draftFile,
  inputFile,
  pipelineFile,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { artifactFile } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { D1_REPAIR_PER_UNIT } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { parseWorkerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { coreUsecaseRequest, fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { accountCalls, openCallDispatch, readCallLog, recordCallEvent } from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';
import { attemptFile, readD1UsecaseWork, writeAttempt, writeD1UsecaseWork } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { parseWorkerReply } from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, '../input20/fixtures/head');
const MODULE = 'agendaClinica';
const PROJECT = 102047;
const PAGES = ['agenda', 'cadastro_profissional', 'cadastro_recepcionista', 'consultas', 'pacientes'];

function walk(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

function context(): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'defs',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '', senderId: 'u' },
    task: {
      PK: 'task-1',
      iaCompressed: {
        nextSteps: [root],
        longMemory: { project: String(PROJECT), moduleName: MODULE },
      },
    },
  } as unknown as mls.msg.ExecutionContext;
}

function meta(): IAgentMeta {
  return { agentName: 'agentDefsL1', agentProject: 102021, agentFolder: 'agentDefsL1', agentDescription: 'test', visibility: 'public' };
}

async function readyHost() {
  const host = installStudio(PROJECT);
  for (const rel of walk(FIXTURE, '')) {
    const file = rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
    const info = fileInfoFromDisplay(PROJECT, file);
    assert.ok(info, rel);
    let text = readFileSync(path.join(FIXTURE, rel), 'utf8');
    if (/ontology\/(Profissional|Recepcionista|Paciente)\.defs\.txt$/.test(rel)) {
      text = text.replace(/"version": \{\n(\s*)"type": "integer"/, '"version": {\n$1"writePrecondition": true,\n$1"type": "integer"');
    }
    seed(host, info, text, 'frozen');
  }
  const contracts = coreUsecaseRequest().contracts;
  for (const pageId of PAGES) {
    const prepared = contracts.find(item => item.pageId === pageId);
    const body = prepared?.source || `export const ${pageId}Contract = { "moduleName": "${MODULE}", "pageId": "${pageId}" } as const;\n`;
    seed(host, fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${pageId}.defs.ts`)!, body, 'contract');
  }
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/steps/usecases50', shortName: 'prompt', extension: '.md' }, readFileSync(path.join(HERE, 'prompt.md'), 'utf8'), 'prompt');
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/skills', shortName: 'usecase', extension: '.md' }, readFileSync(path.join(HERE, '../../skills/usecase.md'), 'utf8'), 'skill');
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-21T12:00:00.000Z')));
  return host;
}

void test('usecases50 dispatches one worker per selected usecase and a worker does not add a step', async () => {
  const host = await readyHost();
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  parent.nextSteps = [];
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  const domain = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  domain.stepId = 30;
  await agent.beforePromptStep!(meta(), ctx, parent, domain, 2);
  const persistence = createD1AgentStep('persistence40', MODULE, PROJECT, 'run');
  persistence.stepId = 40;
  await agent.beforePromptStep!(meta(), ctx, parent, persistence, 3);

  const step = createD1AgentStep('usecases50', MODULE, PROJECT, 'run');
  step.stepId = 50;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 4);
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(fanout?.executionMode?.type, 'parallel');
  assert.equal(fanout?.executionMode?.maxParallel, 5);
  assert.equal(fanout?.executionMode?.args.length, 13);
  assert.equal(fanout?.step.planning?.executionMode, 'parallel_dynamic');
  assert.equal(fanout?.step.planning?.planId, 'usecases50-fanout');
  assertFanoutParent(fanout?.step, 13);
  assert.equal(intents.some(intent => intent.type === 'prompt_ready'), false);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /dispatched 13 workers/);

  const workerPrompt = fanout?.executionMode?.args[0] || '';
  const arg = parseWorkerArg(workerPrompt);
  assert.ok(arg);
  const worker: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 51,
    interaction: null,
    stepTitle: arg.usecaseId,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt: workerPrompt,
    rags: [],
    planning: { planId: '', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const prepared = await agent.beforePromptStep!(meta(), ctx, parent, worker, 5);
  const ready = prepared.find((intent): intent is mls.msg.AgentIntentPromptReady => intent.type === 'prompt_ready');
  assert.ok(ready);
  assert.equal(ready.humanPrompt.includes('Do not write TypeScript') || ready.systemPrompt?.includes('Do not write TypeScript'), true);
  assert.match(ready.systemPrompt || '', /<!-- modelType: reasoning -->/);
  const shape = stepShape(ready.humanPrompt);
  assert.equal(ready.systemPrompt?.includes(shape), true);
  assert.equal(readFileSync(path.join(HERE, 'prompt.md'), 'utf8').includes('- port: kind, call, port'), false);
  assert.equal(ready.humanPrompt.includes(arg.usecaseId), true);
  const finished = await agent.afterPromptStep!(meta(), ctx, parent, worker, 6);
  assert.equal(finished.some(intent => intent.type === 'add-step'), false);
  const workerTrace = finished.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.equal(workerTrace?.status, 'completed');
  assert.match(workerTrace?.traceMsg || '', /did not arrive/);
  const attempt = host.files[fileKey(attemptFile(PROJECT, MODULE, arg.usecaseId))];
  assert.match(attempt?.content || '', /operational/);
  assert.match(attempt?.content || '', /did not arrive/);

  const fanoutAfter = await agent.afterPromptStep!(meta(), ctx, parent, fanout!.step as mls.msg.AIAgentStep, 7);
  assert.equal(fanoutAfter.some(intent => intent.type === 'add-step'), false);
  const barrierStep = addedStep(intents, 'usecases50-barrier');
  assert.equal(barrierStep.status, 'waiting_dependency');
  assert.deepEqual(barrierStep.planning?.dependsOn, ['usecases50-fanout']);
  assert.equal(barrierStep.interaction, null);
  const barrier = await agent.beforePromptStep!(meta(), ctx, parent, barrierStep, 8);
  assert.equal(barrier.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'usecases50-done'), false);
  assert.equal(barrier.some(intent => intent.type === 'add-step' && String((intent as mls.msg.AgentIntentAddStep).step.planning?.planId || '').startsWith('usecases50-repair-')), false);
  const barrierTrace = barrier.filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status').map(intent => intent.traceMsg).join(' ');
  assert.match(barrierTrace, new RegExp(arg.usecaseId));
  assert.match(barrierTrace, /missing trace|OPERATIONAL|operational/);
  assert.equal(host.files[fileKey(draftFile(PROJECT, MODULE, 'usecases50'))], undefined);
});

void test('resume after persistence40 dispatches the same fan-out and does not rewrite the checkpoint', async () => {
  const host = await readyHost();
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  parent.nextSteps = [];
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  const domain = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  domain.stepId = 30;
  await agent.beforePromptStep!(meta(), ctx, parent, domain, 2);
  const persistence = createD1AgentStep('persistence40', MODULE, PROJECT, 'run');
  persistence.stepId = 40;
  await agent.beforePromptStep!(meta(), ctx, parent, persistence, 3);
  const kept = keptFiles(host);

  const step = createD1AgentStep('usecases50', MODULE, PROJECT, 'resume');
  step.stepId = 50;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 4);
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(fanout?.executionMode?.type, 'parallel');
  assert.equal(fanout?.executionMode?.args.length, 13);
  assertFanoutParent(fanout?.step, 13);
  assert.equal(intents.some(intent => intent.type === 'update-status' && /dispatched 13 workers/.test((intent as mls.msg.AgentIntentUpdateStatus).traceMsg || '')), true);
  const pipeline = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as { steps?: { persistence40?: { status?: string } } };
  assert.equal(pipeline.steps?.persistence40?.status, 'approved');
  assert.deepEqual(keptFiles(host), kept);
});

void test('the same snapshot does not call the model again', async () => {
  const host = installStudio(PROJECT);
  const snapshot = 'sha256:same';
  await writeJson(inputFile(PROJECT, MODULE), {
    schemaVersion: '2026-09-21-d1-input-v1',
    project: PROJECT,
    moduleName: MODULE,
    snapshotHash: snapshot,
  });
  const pipeline = createEntryPipeline(PROJECT, MODULE, new Date('2026-09-22T00:00:00.000Z'));
  const artifact = displayPath(draftFile(PROJECT, MODULE, 'usecases50'));
  pipeline.steps.input20 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(inputFile(PROJECT, MODULE))] };
  pipeline.steps.domain30 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(draftFile(PROJECT, MODULE, 'domain30'))] };
  pipeline.steps.persistence40 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(draftFile(PROJECT, MODULE, 'persistence40'))] };
  pipeline.steps.usecases50 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [artifact] };
  await writeJson(pipelineFile(PROJECT, MODULE), pipeline);
  const defPath = `l1/${MODULE}/layer_2_application/usecases/listConsulta.defs.ts`;
  await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'usecases50',
    unitId: 'usecases50',
    draftText: '{"llmCalls":0}',
    snapshotHash: snapshot,
    runId: snapshot,
    parts: [{ defPath, source: 'export const definition = { "artifactId": "listConsulta" } as const;\n' }],
  });
  const stored = host.files[fileKey(fileInfo(defPath))]!;
  const mtime = stored.updatedAt;
  const bytes = stored.content;
  host.writes.length = 0;
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const step = createD1AgentStep('usecases50', MODULE, PROJECT, 'run');
  step.stepId = 50;
  const first = await agent.beforePromptStep!(meta(), ctx, parent, step, 1);
  assert.equal(first.some(intent => intent.type === 'prompt_ready'), false);
  assert.equal(first.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'usecases50-fanout'), false);
  const trace = first.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /No model was called/);
  const anchor = first.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(anchor?.step.planning?.planId, 'usecases50-done');
  const handoff = JSON.parse(String((anchor?.step as mls.msg.AIResultStep).result)) as {
    llmCalls?: number;
    repliesDelivered: number | null;
    invocationReplies: number | null;
    repliesUnknown: string;
  };
  assert.equal(handoff.llmCalls, undefined);
  assert.equal(handoff.invocationReplies, 0);
  assert.equal(handoff.repliesDelivered, null);
  assert.match(handoff.repliesUnknown, /absent/);
  assert.equal(stored.content, bytes);
  assert.equal(stored.updatedAt, mtime);
  host.writes.length = 0;
  if (anchor) {
    anchor.step.stepId = 80;
    parent.nextSteps = [...(parent.nextSteps || []), anchor.step];
  }
  await agent.beforePromptStep!(meta(), ctx, parent, step, 2);
  assert.deepEqual(host.writes, []);
  assert.equal(stored.updatedAt, mtime);
});

function keptFiles(host: { files: Record<string, { content?: string }> }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, file] of Object.entries(host.files)) {
    if (key.includes('usecases50-work') || key.includes('/calls/')) continue;
    out[key] = file.content || '';
  }
  return out;
}

function stepShape(prompt: string): string {
  const marker = 'Each step is one kind.';
  const at = prompt.indexOf(marker);
  assert.ok(at >= 0);
  const rest = prompt.slice(at);
  const feedback = rest.indexOf('\n\nThe previous reply was refused:');
  return feedback === -1 ? rest : rest.slice(0, feedback);
}

function addedStep(intents: mls.msg.AgentIntent[], planId: string): mls.msg.AIAgentStep {
  const found = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === planId);
  assert.ok(found, planId);
  return found.step as mls.msg.AIAgentStep;
}

function replied(prompt: string, body: unknown, stepId: number): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId,
    interaction: { input: [], cost: 0, trace: [], payload: [body] as unknown as mls.msg.AIPayload[] },
    stepTitle: 'worker',
    status: 'waiting_after_prompt',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt,
    rags: [],
    planning: { planId: '', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

async function openUsecases(): Promise<{
  host: ReturnType<typeof installStudio>;
  agent: ReturnType<typeof createAgent>;
  ctx: mls.msg.ExecutionContext;
  parent: mls.msg.AIAgentStep;
  intents: mls.msg.AgentIntent[];
}> {
  const host = await readyHost();
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const usecases = createD1AgentStep('usecases50', MODULE, PROJECT, 'run');
  usecases.stepId = 50;
  parent.nextSteps = [usecases];
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  const domain = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  domain.stepId = 30;
  await agent.beforePromptStep!(meta(), ctx, parent, domain, 2);
  const persistence = createD1AgentStep('persistence40', MODULE, PROJECT, 'run');
  persistence.stepId = 40;
  await agent.beforePromptStep!(meta(), ctx, parent, persistence, 3);
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, usecases, 4);
  return { host, agent, ctx, parent, intents };
}

void test('a key outside the kind is INVENTED_FIELD and the barrier fires one repair', async () => {
  const target = 'listConsulta';
  const { host, agent, ctx, parent, intents } = await openUsecases();
  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  for (const usecase of work.request.usecases) {
    if (usecase.usecaseId === target) continue;
    await writeAttempt(PROJECT, MODULE, {
      usecaseId: usecase.usecaseId,
      status: 'parsed',
      trace: `usecases50 recorded steps for ${usecase.usecaseId}.`,
      unitAttempts: 0,
      reply: fixturePlan(work.request, usecase).steps,
    });
  }
  const workerPrompt = firstPrompt(intents, target);
  const bad = { steps: [{ kind: 'rule', ruleId: 'keep', port: 'nope' }] };
  const refused = parseWorkerReply(bad);
  assert.equal(refused.problems[0]?.code, 'INVENTED_FIELD');
  await agent.afterPromptStep!(meta(), ctx, parent, replied(workerPrompt, bad, 51), 5);
  const attempt = JSON.parse(host.files[fileKey(attemptFile(PROJECT, MODULE, target))]?.content || '{}') as { status?: string; unitAttempts?: number; trace?: string };
  assert.equal(attempt.status, 'repairable');
  assert.equal(attempt.unitAttempts, 0);
  assert.match(attempt.trace || '', /names port/);

  const barrier = addedStep(intents, 'usecases50-barrier');
  const decided = await agent.beforePromptStep!(meta(), ctx, parent, barrier, 6);
  const repair = decided.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && String(intent.step.planning?.planId || '').startsWith('usecases50-repair-'));
  assert.ok(repair);
  const repairArg = parseWorkerArg(repair.step.type === 'agent' ? repair.step.prompt || '' : '');
  assert.equal(repairArg?.usecaseId, target);
  assert.equal(repairArg?.unitAttempts, 1);
  assert.match(repairArg?.feedback || '', /names port/);
  const follow = decided.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && String(intent.step.planning?.planId || '').startsWith('usecases50-barrier-'));
  assert.equal(follow?.step.status, 'waiting_dependency');
  assert.deepEqual(follow?.step.planning?.dependsOn, [repair.step.planning?.planId]);
  const prepared = await agent.beforePromptStep!(meta(), ctx, parent, repair.step as mls.msg.AIAgentStep, 7);
  const ready = prepared.find((intent): intent is mls.msg.AgentIntentPromptReady => intent.type === 'prompt_ready');
  assert.match(ready?.humanPrompt || '', /names port/);
  const repairShape = stepShape(ready?.humanPrompt || '');
  assert.equal(ready?.systemPrompt?.includes(repairShape), true);
  assert.equal(repairShape.includes('The previous reply was refused:'), false);

  const corrected = fixturePlan(work.request, work.request.usecases.find(item => item.usecaseId === target)!).steps;
  await agent.afterPromptStep!(meta(), ctx, parent, replied(repair.step.type === 'agent' ? repair.step.prompt || '' : '', { steps: corrected }, 52), 8);
  const repaired = JSON.parse(host.files[fileKey(attemptFile(PROJECT, MODULE, target))]?.content || '{}') as { status?: string; unitAttempts?: number; trace?: string };
  assert.equal(repaired.status, 'parsed');
  assert.equal(repaired.unitAttempts, 1);
  assert.match(repaired.trace || '', /Repair request:/);
  assert.match(repaired.trace || '', /names port/);

  const closed = await agent.beforePromptStep!(meta(), ctx, parent, follow!.step as mls.msg.AIAgentStep, 9);
  assert.equal(closed.some(intent => intent.type === 'add-step' && String((intent as mls.msg.AgentIntentAddStep).step.planning?.planId || '').startsWith('usecases50-repair-')), false);
  const done = closed.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-done');
  assert.ok(done, closed.filter(intent => intent.type === 'update-status').map(intent => (intent as mls.msg.AgentIntentUpdateStatus).traceMsg).join(' | '));
  const closedUsecase = closed.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.stepId === 50);
  assert.equal(closedUsecase?.status, 'completed');
});

void test('a repair that still names a foreign key stays repairable at the ceiling', async () => {
  const target = 'createPaciente';
  const { host, agent, ctx, parent, intents } = await openUsecases();
  const workerPrompt = firstPrompt(intents, target);
  const bad = { steps: [{ kind: 'transition', transitionId: target, payload: ['id'], call: 'create' }] };
  assert.equal(parseWorkerReply(bad).problems[0]?.code, 'INVENTED_FIELD');
  await agent.afterPromptStep!(meta(), ctx, parent, replied(workerPrompt, bad, 51), 5);
  const barrier = addedStep(intents, 'usecases50-barrier');
  const decided = await agent.beforePromptStep!(meta(), ctx, parent, barrier, 6);
  const repair = decided.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && (intent.step.type === 'agent') && (intent.step.prompt || '').includes(target) && String(intent.step.planning?.planId || '').startsWith('usecases50-repair-'));
  assert.ok(repair);
  await agent.afterPromptStep!(meta(), ctx, parent, replied(repair.step.type === 'agent' ? repair.step.prompt || '' : '', bad, 52), 7);
  const saved = JSON.parse(host.files[fileKey(attemptFile(PROJECT, MODULE, target))]?.content || '{}') as { status?: string; unitAttempts?: number; trace?: string };
  assert.equal(saved.status, 'repairable');
  assert.equal(saved.unitAttempts, D1_REPAIR_PER_UNIT);
  assert.notEqual(saved.unitAttempts, 0);
  assert.match(saved.trace || '', /Repair request:/);
  assert.match(saved.trace || '', /names call/);
  const follow = decided.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && String(intent.step.planning?.planId || '').startsWith('usecases50-barrier-'));
  assert.ok(follow);
  const again = await agent.beforePromptStep!(meta(), ctx, parent, follow.step as mls.msg.AIAgentStep, 8);
  assert.equal(again.some(intent => intent.type === 'add-step' && String((intent as mls.msg.AgentIntentAddStep).step.planning?.planId || '').startsWith('usecases50-repair-')), false);
  const trace = again.filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status').map(intent => intent.traceMsg).join(' ');
  assert.match(trace, new RegExp(`${target} REPAIR_EXHAUSTED`));
  assert.match(trace, /Repair request:/);
});

void test('one unresolved unit closes the step, counts the error, and keeps the other defs', async () => {
  const target = 'listPaciente';
  const { host, agent, ctx, parent, intents } = await openUsecases();
  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  const usecases = parent.nextSteps?.find(item => item.type === 'agent' && item.planning?.planId === 'usecases50');
  assert.equal(usecases?.type, 'agent');
  if (usecases?.type === 'agent') usecases.status = 'in_progress';
  const controllers = createD1AgentStep('controllers60', MODULE, PROJECT, 'run');
  controllers.stepId = 60;
  const finalize = createD1AgentStep('finalize80', MODULE, PROJECT, 'run');
  finalize.stepId = 80;
  parent.nextSteps = [...(parent.nextSteps || []), controllers, finalize];

  for (const usecase of work.request.usecases) {
    const unresolved = usecase.usecaseId === target;
    await writeAttempt(PROJECT, MODULE, {
      usecaseId: usecase.usecaseId,
      status: unresolved ? 'repairable' : 'parsed',
      trace: unresolved ? 'Step 0 MDM call list is not a catalog call.' : `usecases50 recorded steps for ${usecase.usecaseId}.`,
      unitAttempts: unresolved ? 1 : 0,
      reply: unresolved ? null : fixturePlan(work.request, usecase).steps,
    });
  }

  const barrier = addedStep(intents, 'usecases50-barrier');
  const closed = await agent.beforePromptStep!(meta(), ctx, parent, barrier, 5);
  assert.equal(closed.some(intent => intent.type === 'pause-or-continue'), false);
  assert.equal(closed.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'usecases50-done'), false);
  assert.equal(closed.some(intent => intent.type === 'add-step' && String((intent as mls.msg.AgentIntentAddStep).step.planning?.planId || '').startsWith('usecases50-repair-')), false);

  const updates = closed.filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  const stepUpdate = updates.filter(intent => intent.stepId === 50);
  assert.ok(stepUpdate.some(intent => intent.status === 'completed' && /not released/.test(intent.traceMsg || '')));
  assert.equal(stepUpdate.some(intent => intent.status === 'failed'), false);
  assert.equal(updates.filter(intent => intent.stepId === 60 || intent.stepId === 80).every(intent => intent.status === 'completed' && /stopped: usecases50 is held/.test(intent.traceMsg || '')), true);

  const pipeline = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as {
    status?: string;
    awaitingStep?: string;
    steps?: { usecases50?: { status?: string; error?: string; artifactPaths?: string[] } };
  };
  assert.equal(pipeline.status, 'awaitingStep');
  assert.equal(pipeline.awaitingStep, 'usecases50');
  assert.equal(pipeline.steps?.usecases50?.status, 'failed');
  assert.notEqual(pipeline.steps?.usecases50?.status, 'approved');
  assert.equal(pipeline.steps?.usecases50?.error, 'REPAIR_EXHAUSTED:1');
  assert.equal(pipeline.steps?.usecases50?.artifactPaths?.[0]?.endsWith('/usecases50.json'), true);

  const draft = JSON.parse(host.files[fileKey(draftFile(PROJECT, MODULE, 'usecases50'))]?.content || '{}') as {
    ok?: boolean;
    emit?: Array<{ definition?: { artifactId?: string } }>;
    problems?: Array<{ severity?: string; code?: string; path?: string; message?: string }>;
    usecases?: Array<{ usecaseId?: string; definition?: unknown }>;
  };
  assert.equal(draft.ok, false);
  const problem = draft.problems?.find(item => item.path === target);
  assert.equal(problem?.severity, 'error');
  assert.equal(problem?.code, 'REPAIR_EXHAUSTED');
  assert.match(problem?.message || '', new RegExp(target));
  assert.match(problem?.message || '', /unresolved/);
  assert.equal(draft.usecases?.find(item => item.usecaseId === target)?.definition, null);
  assert.equal(draft.emit?.some(item => item.definition?.artifactId === target), false);
  assert.equal(draft.emit?.length, work.request.usecases.length - 1);

  for (const usecase of work.request.usecases) {
    const info = artifactFile(PROJECT, usecase.defPath);
    assert.ok(info, usecase.usecaseId);
    const written = Boolean(host.files[fileKey(info)]?.content);
    assert.equal(written, usecase.usecaseId !== target, usecase.usecaseId);
  }
});

void test('a delivered reply counts once, a redelivery does not, and cost is not the count', async () => {
  const target = 'listConsulta';
  const { agent, ctx, parent, intents } = await openUsecases();
  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  const usecase = work.request.usecases.find(item => item.usecaseId === target);
  assert.ok(usecase);
  const workerPrompt = firstPrompt(intents, target);
  const prepared = await agent.beforePromptStep!(meta(), ctx, parent, workerStep(workerPrompt, 51), 5);
  assert.equal(prepared.some(intent => intent.type === 'prompt_ready'), true);
  const handed = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(handed.promptsAssembled, 1);
  assert.equal(handed.repliesDelivered, 0);

  const answered = replied(workerPrompt, { steps: fixturePlan(work.request, usecase).steps }, 51);
  if (answered.interaction) answered.interaction.cost = 99;
  await agent.afterPromptStep!(meta(), ctx, parent, answered, 6);
  await agent.afterPromptStep!(meta(), ctx, parent, answered, 7);
  const account = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(account.repliesDelivered, 1);
  assert.notEqual(account.repliesDelivered, 99);
  assert.notEqual(account.repliesDelivered, work.request.usecases.length);
  assert.equal(account.promptsAssembled, 1);
  assert.equal(account.repairsScheduled, 0);
  assert.equal(account.invocationReplies, 1);
});

void test('an invalid payload is one delivered reply and not yet a repair', async () => {
  const target = 'listConsulta';
  const { host, agent, ctx, parent, intents } = await openUsecases();
  const workerPrompt = firstPrompt(intents, target);
  const bad = { steps: [{ kind: 'rule', ruleId: 'keep', port: 'nope' }] };
  await agent.afterPromptStep!(meta(), ctx, parent, replied(workerPrompt, bad, 51), 5);
  const account = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(account.repliesDelivered, 1);
  assert.equal(account.repairsScheduled, 0);
  assert.equal(account.promptsAssembled, 0);
  const saved = JSON.parse(host.files[fileKey(attemptFile(PROJECT, MODULE, target))]?.content || '{}') as { status?: string };
  assert.equal(saved.status, 'repairable');
});

void test('a prompt with no payload is not a delivered reply', async () => {
  const target = 'listConsulta';
  const { agent, ctx, parent, intents } = await openUsecases();
  const workerPrompt = firstPrompt(intents, target);
  const prepared = await agent.beforePromptStep!(meta(), ctx, parent, workerStep(workerPrompt, 51), 5);
  assert.equal(prepared.some(intent => intent.type === 'prompt_ready'), true);
  await agent.afterPromptStep!(meta(), ctx, parent, workerStep(workerPrompt, 51), 6);
  const log = await readCallLog(PROJECT, MODULE);
  const account = accountCalls(log);
  assert.equal(account.promptsAssembled, 1);
  assert.equal(account.repliesDelivered, 0);
  assert.equal(log?.events.some(event => event.kind === 'reply_absent'), true);
  assert.equal(log?.events.some(event => event.kind === 'reply_delivered'), false);
});

void test('a source block is not dispatched and is not a reply', async () => {
  const target = 'listConsulta';
  const { agent, ctx, parent, intents } = await openUsecases();
  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  const packet = work.request.contexts?.find(item => item.usecaseId === target);
  assert.ok(packet);
  packet.findings.push({
    code: 'SOURCE_ABSENT',
    path: 'l4/agendaClinica/rules.defs.ts',
    message: 'Source l4/agendaClinica/rules.defs.ts is absent. The usecase was not sent to the model.',
  });
  await writeD1UsecaseWork(PROJECT, work);
  const workerPrompt = firstPrompt(intents, target);
  const prepared = await agent.beforePromptStep!(meta(), ctx, parent, workerStep(workerPrompt, 51), 5);
  assert.equal(prepared.some(intent => intent.type === 'prompt_ready'), false);
  const log = await readCallLog(PROJECT, MODULE);
  const account = accountCalls(log);
  assert.equal(account.promptsAssembled, 0);
  assert.equal(account.repliesDelivered, 0);
  assert.equal(log?.events.some(event => event.kind === 'not_dispatched' && event.usecaseId === target), true);
});

void test('one repair is a second reply, and the attempt index is not the total', async () => {
  const target = 'listConsulta';
  const { agent, ctx, parent, intents } = await openUsecases();
  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  const usecase = work.request.usecases.find(item => item.usecaseId === target);
  assert.ok(usecase);
  for (const other of work.request.usecases) {
    if (other.usecaseId === target) continue;
    await writeAttempt(PROJECT, MODULE, {
      usecaseId: other.usecaseId,
      status: 'parsed',
      trace: `usecases50 recorded steps for ${other.usecaseId}.`,
      unitAttempts: 0,
      reply: fixturePlan(work.request, other).steps,
    });
  }
  const workerPrompt = firstPrompt(intents, target);
  await agent.beforePromptStep!(meta(), ctx, parent, workerStep(workerPrompt, 51), 5);
  const bad = { steps: [{ kind: 'rule', ruleId: 'keep', port: 'nope' }] };
  await agent.afterPromptStep!(meta(), ctx, parent, replied(workerPrompt, bad, 51), 6);
  const barrier = addedStep(intents, 'usecases50-barrier');
  const decided = await agent.beforePromptStep!(meta(), ctx, parent, barrier, 7);
  const repair = decided.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && String(intent.step.planning?.planId || '').startsWith('usecases50-repair-'));
  assert.ok(repair);
  const repairPrompt = repair.step.type === 'agent' ? repair.step.prompt || '' : '';
  await agent.beforePromptStep!(meta(), ctx, parent, repair.step as mls.msg.AIAgentStep, 8);
  const corrected = fixturePlan(work.request, usecase).steps;
  await agent.afterPromptStep!(meta(), ctx, parent, replied(repairPrompt, { steps: corrected }, 52), 9);
  const log = await readCallLog(PROJECT, MODULE);
  const account = accountCalls(log);
  const replies = log?.events.filter(event => event.kind === 'reply_delivered') || [];
  const attemptSum = replies.reduce((sum, event) => sum + event.unitAttempts, 0);
  assert.equal(replies.length, 2);
  assert.equal(account.repliesDelivered, 2);
  assert.equal(account.promptsAssembled, 2);
  assert.equal(account.repairsScheduled, 1);
  assert.equal(attemptSum, 1);
  assert.notEqual(account.repliesDelivered, attemptSum);
  assert.notEqual(account.repliesDelivered, work.request.usecases.length);
  assert.equal(account.finalizeOpenedRepair, false);
});

void test('resume without a call keeps a proved reply', async () => {
  const host = installStudio(PROJECT);
  const snapshot = 'sha256:kept';
  await writeJson(inputFile(PROJECT, MODULE), {
    schemaVersion: '2026-09-21-d1-input-v1',
    project: PROJECT,
    moduleName: MODULE,
    snapshotHash: snapshot,
  });
  const pipeline = createEntryPipeline(PROJECT, MODULE, new Date('2026-09-22T00:00:00.000Z'));
  const artifact = displayPath(draftFile(PROJECT, MODULE, 'usecases50'));
  pipeline.steps.input20 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(inputFile(PROJECT, MODULE))] };
  pipeline.steps.domain30 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(draftFile(PROJECT, MODULE, 'domain30'))] };
  pipeline.steps.persistence40 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [displayPath(draftFile(PROJECT, MODULE, 'persistence40'))] };
  pipeline.steps.usecases50 = { status: 'approved', updatedAt: pipeline.updatedAt, artifactPaths: [artifact] };
  await writeJson(pipelineFile(PROJECT, MODULE), pipeline);
  const defPath = `l1/${MODULE}/layer_2_application/usecases/listConsulta.defs.ts`;
  await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'usecases50',
    unitId: 'usecases50',
    draftText: '{"llmCalls":13}',
    snapshotHash: snapshot,
    runId: snapshot,
    parts: [{ defPath, source: 'export const definition = { "artifactId": "listConsulta" } as const;\n' }],
  });
  await openCallDispatch(PROJECT, MODULE);
  await recordCallEvent(PROJECT, MODULE, {
    kind: 'reply_delivered',
    usecaseId: 'listConsulta',
    planId: 'usecases50-worker-listConsulta',
    unitAttempts: 0,
  });
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const step = createD1AgentStep('usecases50', MODULE, PROJECT, 'run');
  step.stepId = 50;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 1);
  assert.equal(intents.some(intent => intent.type === 'prompt_ready'), false);
  const anchor = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  const handoff = JSON.parse(String((anchor?.step as mls.msg.AIResultStep).result)) as {
    repliesDelivered: number | null;
    invocationReplies: number | null;
  };
  assert.equal(handoff.repliesDelivered, 1);
  assert.equal(handoff.invocationReplies, 0);
  const account = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(account.repliesDelivered, 1);
  assert.equal(account.invocationReplies, 0);
  assert.equal(host.files[fileKey(fileInfo(defPath))]?.content.includes('listConsulta'), true);
});

function workerStep(prompt: string, stepId: number): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId,
    interaction: null,
    stepTitle: 'worker',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt,
    rags: [],
    planning: { planId: '', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

function firstPrompt(intents: mls.msg.AgentIntent[], usecaseId: string): string {
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.executionMode?.type === 'parallel');
  const prompt = fanout?.executionMode?.args.find(arg => arg.includes(`"usecaseId":"${usecaseId}"`));
  assert.ok(prompt, usecaseId);
  return prompt;
}

function assertFanoutParent(step: mls.msg.AIPayload | undefined, workers: number): void {
  assert.equal(step?.type, 'agent');
  if (step?.type !== 'agent') return;
  assert.equal(step.status, 'in_progress');
  assert.equal(step.interaction?.cost, 0);
  assert.equal(step.interaction?.payload, null);
  assert.deepEqual(step.interaction?.input, [{ type: 'system', content: '<!-- modelType: reasoning -->' }]);
  assert.deepEqual(step.interaction?.trace, [`queued ${workers} usecases50 workers with maxParallel=5`]);
}

function fileInfo(path: string) {
  const file = {
    project: PROJECT,
    level: 1,
    folder: `${MODULE}/layer_2_application/usecases`,
    shortName: 'listConsulta',
    extension: '.defs.ts',
  };
  assert.equal(`l1/${file.folder}/${file.shortName}${file.extension}`, path);
  return file;
}
