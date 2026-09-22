/// <mls fileReference="_102021_/l2/agentDefsL1/steps/entry10/agentD1Entry.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import {
  D1_FLOW_STEP_IDS,
  MSG_CANDIDATE,
  MSG_CANDIDATE_DOTDOT,
  MSG_PATH,
  MSG_PROJECT,
  MSG_REBUILD,
  pipelineFile,
  plannerPipelineFile,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { readText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileKey, installStudio, seed, type StoredFile, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE = 'agendaClinica';
const PROJECT = 102047;
const OTHER = 102046;
const PLANNER = '{"planner":true}\n';
const DRAFT = '{"draft":true}\n';

function meta(): IAgentMeta {
  return {
    agentName: 'agentDefsL1',
    agentProject: 102021,
    agentFolder: 'agentDefsL1',
    agentDescription: 'test',
    visibility: 'public',
  };
}

function contextWith(content: string): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: `defs ${MODULE}`,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content, senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: {} } },
  } as mls.msg.ExecutionContext;
}

function mount(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): mls.msg.AIAgentStep[] {
  const added = intents.find((intent): intent is mls.msg.AgentIntentAddMessageAI => intent.type === 'add-message-ai');
  assert.ok(added);
  context.task!.iaCompressed!.longMemory = added.request.longTermMemory || {};
  const steps = intents
    .filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step')
    .map(intent => intent.step)
    .filter(step => step.planning?.planId !== 'status');
  steps.forEach((step, index) => { step.stepId = 10 + index; });
  context.task!.iaCompressed!.nextSteps![0].nextSteps = steps;
  return steps as mls.msg.AIAgentStep[];
}

function plannerOf(host: TestHost, project: number): StoredFile {
  return seed(host, plannerPipelineFile(project, MODULE), PLANNER, `planner-${project}`);
}

void test('entry10 has no prompt.md', () => {
  assert.equal(existsSync(path.join(HERE, 'prompt.md')), false);
});

void test('help writes nothing and does not call a model', async () => {
  const host = installStudio(PROJECT);
  const planner = plannerOf(host, PROJECT);
  const agent = createAgent();
  const ctx = contextWith(`@@agentDefsL1 ${MODULE} /help`);
  const intents = await agent.beforePromptImplicit!(meta(), ctx, `@@agentDefsL1 ${MODULE} /help`);
  const message = intents[0] as mls.msg.AgentIntentAddMessageAI;
  assert.equal(message.skipRootLLM, true);
  assert.match(String(message.request.inputAI[0]?.content), /skipRootLLM/);
  assert.match(String(message.request.inputAI[1]?.content), new RegExp(`project ${PROJECT}`));
  assert.equal(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'entry10'), false);
  assert.equal(host.writes.length, 0);
  assert.equal(planner.content, PLANNER);
  assert.equal(planner.updatedAt, `planner-${PROJECT}`);
  assert.equal(host.files[fileKey(pipelineFile(PROJECT, MODULE))], undefined);
});

void test('run bootstraps without a model, records identity, and tells the truth about the missing step', async () => {
  const host = installStudio(PROJECT);
  plannerOf(host, PROJECT);
  plannerOf(host, OTHER);
  setModuleRoot(MODULE, `${MODULE}/tobe/plan`);
  const draft = seed(host, {
    project: PROJECT, level: 1, folder: `${MODULE}/pipeline/agentDefsL1/drafts`, shortName: 'input20', extension: '.json',
  }, DRAFT, 'draft-mtime');

  const agent = createAgent();
  const ctx = contextWith(`@@agentDefsL1 ${MODULE} /run`);
  const intents = await agent.beforePromptImplicit!(meta(), ctx, `@@agentDefsL1 ${MODULE} /run`);
  const message = intents[0] as mls.msg.AgentIntentAddMessageAI;
  assert.equal(message.skipRootLLM, true);
  assert.equal(message.request.longTermMemory?.project, String(PROJECT));
  const steps = mount(ctx, intents);
  assert.deepEqual(steps.map(step => step.planning?.planId), [...D1_FLOW_STEP_IDS]);
  assert.deepEqual(steps[1]?.planning?.dependsOn, ['entry10-done']);

  const entryIntents = await agent.beforePromptStep!(meta(), ctx, ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep, steps[0], 1);
  assert.equal(entryIntents.some(intent => intent.type === 'add-message-ai'), false);
  const anchor = entryIntents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(anchor?.step.planning?.planId, 'entry10-done');
  const handoff = JSON.parse(String((anchor?.step as mls.msg.AIResultStep).result)) as { project: number; nextStep: string; artifact: string };
  assert.equal(handoff.project, PROJECT);
  assert.equal(handoff.nextStep, 'input20');
  assert.equal(handoff.artifact.includes('draft'), false);
  assert.equal(handoff.artifact.includes(String(PROJECT)), true);

  const stored = host.files[fileKey(pipelineFile(PROJECT, MODULE))];
  assert.ok(stored);
  assert.equal(stored.folder, `${MODULE}/pipeline/agentDefsL1`);
  const pipeline = JSON.parse(stored.content) as { project: number; moduleName: string; steps: { entry10?: { status: string }; input20?: unknown } };
  assert.equal(pipeline.project, PROJECT);
  assert.equal(pipeline.moduleName, MODULE);
  assert.equal(pipeline.steps.entry10?.status, 'approved');
  assert.equal(pipeline.steps.input20, undefined);
  assert.equal(host.files[fileKey(pipelineFile(OTHER, MODULE))], undefined);
  assert.equal(host.files[fileKey(plannerPipelineFile(PROJECT, MODULE))]?.content, PLANNER);
  assert.equal(host.files[fileKey(plannerPipelineFile(OTHER, MODULE))]?.content, PLANNER);
  assert.equal(Object.values(host.files).some(file => file.extension === '.defs.ts' || file.extension === '.ts'), false);

  const inputIntents = await agent.beforePromptStep!(meta(), ctx, ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep, steps[1], 2);
  const inputTrace = inputIntents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.stepId === steps[1].stepId);
  assert.match(inputTrace?.traceMsg || '', /recorded the inventory/);
  assert.match(inputTrace?.traceMsg || '', /Consumer phases are not released/);
  assert.equal(inputTrace?.status, 'completed');
  assert.doesNotMatch(inputTrace?.traceMsg || '', /not implemented|success|generated/i);
  const drained = inputIntents.filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.stepId !== steps[1].stepId);
  assert.equal(drained.length, 0);
  const after = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as {
    status: string; awaitingStep?: string; steps: { input20?: { status: string }; domain30?: unknown };
  };
  assert.equal(after.status, 'inProgress');
  assert.equal(after.awaitingStep, undefined);
  assert.equal(after.steps.input20, undefined);
  assert.equal(after.steps.domain30, undefined);
  const inventory = host.files[fileKey({ project: PROJECT, level: 1, folder: `${MODULE}/pipeline/agentDefsL1`, shortName: 'input', extension: '.json' })];
  assert.ok(inventory);
  assert.match(inventory.content, /SOURCE_MISSING/);
  assert.equal(draft.content, DRAFT);
  assert.equal(draft.updatedAt, 'draft-mtime');
  assert.equal(Object.values(host.files).some(file => file.extension === '.defs.ts' || file.extension === '.ts'), false);
});

void test('resume of an intact checkpoint and a duplicate or late hook do not rewrite it', async () => {
  const host = installStudio(PROJECT);
  plannerOf(host, PROJECT);
  const agent = createAgent();
  const runCtx = contextWith(`@@agentDefsL1 ${MODULE} /run`);
  const run = await agent.beforePromptImplicit!(meta(), runCtx, `@@agentDefsL1 ${MODULE} /run`);
  const steps = mount(runCtx, run);
  await agent.beforePromptStep!(meta(), runCtx, runCtx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep, steps[0], 1);
  await agent.beforePromptStep!(meta(), runCtx, runCtx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep, steps[1], 2);
  const file = host.files[fileKey(pipelineFile(PROJECT, MODULE))];
  const bytes = file.content;
  const mtime = file.updatedAt;
  const plannerMtime = host.files[fileKey(plannerPipelineFile(PROJECT, MODULE))]?.updatedAt;

  const resumeCtx = contextWith(`@@agentDefsL1 ${MODULE} /resume`);
  const resume = await agent.beforePromptImplicit!(meta(), resumeCtx, `@@agentDefsL1 ${MODULE} /resume`);
  assert.equal((resume[0] as mls.msg.AgentIntentAddMessageAI).skipRootLLM, true);
  const resumeSteps = mount(resumeCtx, resume);
  const again = await agent.beforePromptStep!(meta(), resumeCtx, resumeCtx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep, resumeSteps[0], 3);
  assert.equal(again.some(intent => intent.type === 'add-message-ai'), false);
  assert.match(String((again.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus).traceMsg), /already recorded/);
  await agent.beforePromptStep!(meta(), resumeCtx, resumeCtx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep, resumeSteps[1], 4);
  await agent.afterPromptStep!(meta(), resumeCtx, resumeCtx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep, resumeSteps[0], 5);

  assert.equal(file.content, bytes);
  assert.equal(file.updatedAt, mtime);
  assert.equal(host.files[fileKey(plannerPipelineFile(PROJECT, MODULE))]?.content, PLANNER);
  assert.equal(host.files[fileKey(plannerPipelineFile(PROJECT, MODULE))]?.updatedAt, plannerMtime);

  host.setProject(OTHER);
  const other = contextWith(`@@agentDefsL1 ${MODULE} /resume`);
  const refused = await agent.beforePromptImplicit!(meta(), other, `@@agentDefsL1 ${MODULE} /resume`);
  const text = String((refused[0] as mls.msg.AgentIntentAddMessageAI).request.inputAI[1]?.content);
  assert.match(text, new RegExp(`project ${OTHER}`));
  assert.match(text, /No checkpoint/);
  assert.equal(await readText(pipelineFile(PROJECT, MODULE)), bytes);
  assert.equal(host.files[fileKey(pipelineFile(OTHER, MODULE))], undefined);
});

void test('a duplicate entry hook does not write a second checkpoint', async () => {
  const host = installStudio(PROJECT);
  const agent = createAgent();
  const ctx = contextWith(`@@agentDefsL1 ${MODULE} /run`);
  const intents = await agent.beforePromptImplicit!(meta(), ctx, `@@agentDefsL1 ${MODULE} /run`);
  const steps = mount(ctx, intents);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const first = await agent.beforePromptStep!(meta(), ctx, parent, steps[0], 1);
  const anchor = first.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.ok(anchor);
  anchor.step.stepId = 80;
  parent.nextSteps!.push(anchor.step);
  const bytes = host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content;
  const mtime = host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.updatedAt;
  const second = await agent.beforePromptStep!(meta(), ctx, parent, steps[0], 2);
  assert.equal(second.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'entry10-done'), false);
  assert.equal(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content, bytes);
  assert.equal(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.updatedAt, mtime);
});

void test('unknown flags, candidate, rebuild, an insecure path and a missing project write nothing', async () => {
  const host = installStudio(PROJECT);
  const planner = plannerOf(host, PROJECT);
  const agent = createAgent();
  const cases = [
    [`@@agentDefsL1 ${MODULE} /fast`, /Unknown flag: \/fast/],
    [`@@agentDefsL1 ${MODULE} /candidate tobe/plan`, new RegExp(MSG_CANDIDATE.replace(/[.]/g, '\\.'))],
    [`@@agentDefsL1 ${MODULE} /candidate ../secret`, new RegExp(MSG_CANDIDATE_DOTDOT.replace(/[.]/g, '\\.'))],
    [`@@agentDefsL1 ${MODULE} /rebuild all`, new RegExp(MSG_REBUILD)],
    ['@@agentDefsL1 ../secret /run', new RegExp(MSG_PATH.replace(/[.]/g, '\\.'))],
    ['@@agentDefsL1 /run', /Pass @@agentDefsL1/],
  ] as const;
  for (const [prompt, expected] of cases) {
    const intents = await agent.beforePromptImplicit!(meta(), contextWith(prompt), prompt);
    const message = intents[0] as mls.msg.AgentIntentAddMessageAI;
    assert.equal(message.skipRootLLM, true);
    assert.match(String(message.request.inputAI[1]?.content), expected);
    assert.equal(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'entry10'), false);
  }
  host.setProject(0);
  const missing = await agent.beforePromptImplicit!(meta(), contextWith(`@@agentDefsL1 ${MODULE} /run`), `@@agentDefsL1 ${MODULE} /run`);
  assert.match(String((missing[0] as mls.msg.AgentIntentAddMessageAI).request.inputAI[1]?.content), new RegExp(MSG_PROJECT));
  assert.equal(host.writes.length, 0);
  assert.equal(planner.content, PLANNER);
  assert.equal(planner.updatedAt, `planner-${PROJECT}`);
});
