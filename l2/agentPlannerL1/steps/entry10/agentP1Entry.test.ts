/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/entry10/agentP1Entry.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentPlannerL1/agentPlannerL1.js';
import { P1_FLOW_STEP_IDS, p1PipelineFile } from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';
import { P1_STEP_HOOKS } from '/_102021_/l2/agentPlannerL1/helpers/p1Dispatch.js';
import { beforeP1EntryPromptStep } from '/_102021_/l2/agentPlannerL1/steps/entry10/agentP1Entry.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(path.join(HERE, 'fixtures/pool-l1-mensalidadesAcademia.json'), 'utf8')) as Record<string, unknown>;
const NEEDS = JSON.parse(readFileSync(path.join(HERE, 'fixtures/needs-mensalidadesAcademia.json'), 'utf8')) as Record<string, unknown>;

const PROJECT = 102047;
const MODULE = 'mensalidadesAcademia';
const AT = new Date(Date.UTC(2026, 8, 20, 10, 30, 0));
const SHORT = '20260920103000_mensalidadesAcademia-20260920103000_1';
const DISPLAY = `l4/${MODULE}/pool/l1/${SHORT}.json`;

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

type Host = { files: Record<string, Stored> };

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function seed(host: Host, folder: string, shortName: string, content = '', level = 4): Stored {
  const file: Stored = {
    project: PROJECT, level, folder, shortName, extension: '.json',
    status: 'changed', versionRef: '1', content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

function installHost(): Host {
  const host: Host = { files: {} };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
        deleteFile: (file: Stored) => {
          const stored = host.files[keyOf(file)];
          if (stored) stored.status = 'deleted';
        },
      },
    },
  };
  return host;
}

const L4_COMPLETE = JSON.stringify({
  schemaVersion: '2026-09-10-ns5-pipeline-v1',
  flowId: 'agentNewSolution5',
  moduleName: MODULE,
  status: 'complete',
  steps: {},
  sourcePrompt: '',
  invocation: { fast: false, module: MODULE, rebuildAll: false },
  updatedAt: AT.toISOString(),
});

function seedReady(host: Host): void {
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${MODULE}/pool/l1`, SHORT, `${JSON.stringify(FIXTURE, null, 2)}\n`);
  seed(host, `${MODULE}/pool/l1/web`, 'needs', `${JSON.stringify(NEEDS, null, 2)}\n`);
  seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 1);
}

function agentMeta(): IAgentMeta {
  return {
    agentName: 'agentPlannerL1',
    agentProject: 102021,
    agentFolder: 'agentPlannerL1',
    agentDescription: 'test',
    visibility: 'public',
  };
}

function contextWith(content: string, steps: mls.msg.AIPayload[] = []): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: `plan l1 ${MODULE}`,
    status: 'waiting_human_input',
    nextSteps: steps,
    agentName: 'agentPlannerL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content, senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: {} } },
  } as mls.msg.ExecutionContext;
}

void test('entry10 is deterministic and has no prompt.md', () => {
  assert.equal(existsSync(path.join(HERE, 'prompt.md')), false);
});

void test('createAgent registers entry10 on the dispatch table', () => {
  createAgent();
  assert.equal(P1_STEP_HOOKS.entry10?.beforePromptStep, beforeP1EntryPromptStep);
});

void test('hand invocation refuses nothing pending without opening the step tree', async () => {
  const host = installHost();
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  const agent = createAgent();
  const ctx = contextWith(`@@agentPlannerL1 ${MODULE}`);
  const intents = await agent.beforePromptImplicit!(agentMeta(), ctx, MODULE);
  assert.equal(intents[0]?.type, 'add-message-ai');
  const message = intents[0] as mls.msg.AgentIntentAddMessageAI;
  assert.equal(message.skipRootLLM, true);
  assert.match(String(message.request.inputAI[1]?.content), /nothing pending/);
  assert.equal(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'entry10'), false);
});

void test('hand invocation and pool step write the same pipeline.json with inventory.present false', async () => {
  const host = installHost();
  seedReady(host);
  const agent = createAgent();
  const handCtx = contextWith(`@@agentPlannerL1 ${MODULE}`);
  const hand = await agent.beforePromptImplicit!(agentMeta(), handCtx, MODULE);
  assert.equal(hand[0]?.type, 'add-message-ai');
  const added = hand.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.deepEqual(added.map(intent => intent.step.planning?.planId), [...P1_FLOW_STEP_IDS]);

  const entryStep = added[0].step as mls.msg.AIAgentStep;
  entryStep.stepId = 10;
  const afterHand = await beforeP1EntryPromptStep(agentMeta(), handCtx, handCtx.task!.iaCompressed!.nextSteps[0] as mls.msg.AIAgentStep, entryStep, 1);
  assert.ok(afterHand.some(intent => intent.type === 'update-status'));
  assert.equal(afterHand.some(intent => intent.type === 'add-message-ai'), false);
  const writtenHand = JSON.parse(host.files[keyOf(p1PipelineFile(MODULE))].content) as {
    thread: string; round: number; messageFile: string; status: string; inventory: { present: boolean };
  };

  delete host.files[keyOf(p1PipelineFile(MODULE))];
  seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 1);

  const poolStep: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 20,
    interaction: null,
    stepTitle: 'Entry',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL1',
    prompt: JSON.stringify({ moduleName: MODULE, thread: 'mensalidadesAcademia-20260920103000', file: DISPLAY }),
    rags: [],
    planning: { planId: '', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const poolCtx = contextWith('from pool', [poolStep]);
  const fromPool = await agent.beforePromptStep!(agentMeta(), poolCtx, poolCtx.task!.iaCompressed!.nextSteps[0] as mls.msg.AIAgentStep, poolStep, 1);
  assert.ok(fromPool.some(intent => intent.type === 'update-status'));
  assert.equal(fromPool.some(intent => intent.type === 'add-message-ai'), false);
  const writtenPool = JSON.parse(host.files[keyOf(p1PipelineFile(MODULE))].content) as {
    thread: string; round: number; messageFile: string; status: string; inventory: { present: boolean };
  };
  assert.equal(writtenPool.thread, writtenHand.thread);
  assert.equal(writtenPool.round, writtenHand.round);
  assert.equal(writtenPool.messageFile, writtenHand.messageFile);
  assert.equal(writtenPool.thread, 'mensalidadesAcademia-20260920103000');
  assert.equal(writtenHand.status, 'inProgress');
  assert.equal(writtenPool.status, 'inProgress');
  assert.equal(writtenHand.inventory.present, false);
  assert.equal(writtenPool.inventory.present, false);
});

void test('unimplemented plan20 marks the pipeline awaitingStep and does not fail', async () => {
  const host = installHost();
  seedReady(host);
  const agent = createAgent();
  const ctx = contextWith(`@@agentPlannerL1 ${MODULE}`);
  const hand = await agent.beforePromptImplicit!(agentMeta(), ctx, MODULE);
  const added = hand.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  const entryStep = added[0].step as mls.msg.AIAgentStep;
  entryStep.stepId = 10;
  const root = ctx.task!.iaCompressed!.nextSteps[0] as mls.msg.AIAgentStep;
  await beforeP1EntryPromptStep(agentMeta(), ctx, root, entryStep, 1);

  const planStep = added[1].step as mls.msg.AIAgentStep;
  planStep.stepId = 20;
  root.nextSteps = [entryStep, planStep];
  ctx.task!.iaCompressed!.longMemory = { moduleName: MODULE };
  const afterPlan = await agent.beforePromptStep!(agentMeta(), ctx, root, planStep, 2);
  const status = afterPlan.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus | undefined;
  assert.equal(status?.status, 'completed');
  assert.match(String(status?.traceMsg), /plan20 not implemented yet/);
  const pipeline = JSON.parse(host.files[keyOf(p1PipelineFile(MODULE))].content) as {
    status: string; awaitingStep?: string; steps: { entry10: { status: string } }; inventory: { present: boolean };
  };
  assert.equal(pipeline.status, 'awaitingStep');
  assert.equal(pipeline.awaitingStep, 'plan20');
  assert.equal(pipeline.steps.entry10.status, 'approved');
  assert.equal(pipeline.inventory.present, false);
});
