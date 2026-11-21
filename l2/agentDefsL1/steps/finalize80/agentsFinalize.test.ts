/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/agentsFinalize.test.ts" enhancement="_blank"/>

// d1_250: the state of `agents` (mls-102047@1be807ab, by git show) when the finalize80 of the /rederive refused with EXTRA_FILE for listPersonalConduct.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import {
  createD1AgentStep,
  inputFile,
  pipelineFile,
  reportFile,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { D1_GAP_NONE } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { parseFinalizeReport } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { runResolve25, type D1TestResolver } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { parseWorkerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { readD1UsecaseWork, writeAttempt } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';

const PROJECT = 102047;
const MODULE = 'agents';
const FIXTURE = 'agents-1be807ab';
const COMMAND = (step: string): string => `@@agentDefsL1 ${MODULE} /rederive ${step}`;

async function approveUsecases(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  moduleName: string,
  order: number,
): Promise<{ trace: string; dispatched: string[]; intents: mls.msg.AgentIntent[] }> {
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, createD1AgentStep('usecases50', moduleName, PROJECT, 'run'), order);
  const dispatched = dispatchedIds(intents);
  if (dispatched.length === 0) {
    return {
      dispatched,
      intents,
      trace: intents
        .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
        .map(intent => intent.traceMsg || '')
        .join('\n'),
    };
  }
  assert.ok(barrier, 'usecases50 did not open a barrier');
  const work = await readD1UsecaseWork(PROJECT, moduleName);
  assert.ok(work);
  for (const usecaseId of dispatched) {
    const usecase = work.request.usecases.find(item => item.usecaseId === usecaseId);
    assert.ok(usecase, usecaseId);
    const plan = fixturePlan(work.request, usecase);
    await writeAttempt(PROJECT, moduleName, {
      usecaseId,
      status: 'parsed',
      trace: 'deterministic plan',
      unitAttempts: 1,
      reply: plan.steps,
    });
  }
  const done = await agent.beforePromptStep!(meta(), ctx, parent, barrier.step as mls.msg.AIAgentStep, order);
  return {
    dispatched,
    intents: done,
    trace: done
      .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
      .map(intent => intent.traceMsg || '')
      .join('\n'),
  };
}

function dispatchedIds(intents: mls.msg.AgentIntent[]): string[] {
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-fanout');
  if (!fanout) return [];
  return (fanout.executionMode?.args || []).flatMap(arg => {
    const parsed = parseWorkerArg(arg);
    return parsed ? [parsed.usecaseId] : [];
  });
}

function contextFor(moduleName: string): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    nextSteps: [],
    stepTitle: 'defs',
    status: 'waiting_human_input',
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
        longMemory: { project: String(PROJECT), moduleName },
      },
    },
  } as unknown as mls.msg.ExecutionContext;
}

function meta(): IAgentMeta {
  return { agentName: 'agentDefsL1', agentProject: 102021, agentFolder: 'agentDefsL1', agentDescription: 'test', visibility: 'public' };
}

async function runStep(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  moduleName: string,
  stepId: D1StepId,
  order: number,
  resolver?: D1TestResolver,
): Promise<{ trace: string; intents: mls.msg.AgentIntent[] }> {
  const step = createD1AgentStep(stepId, moduleName, PROJECT, 'run');
  step.stepId = order;
  const intents = stepId === 'resolve25'
    ? await runResolve25(agent, meta(), ctx, parent, PROJECT, moduleName, order, 'run', resolver)
    : await agent.beforePromptStep!(meta(), ctx, parent, step, order);
  return {
    intents,
    trace: intents
      .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
      .map(intent => intent.traceMsg || '')
      .join('\n'),
  };
}

async function rederiveRun(host: TestHost, from: 'controllers60', upTo: D1StepId = 'finalize80'): Promise<Array<{ stepId: string; status: string; trace: string }>> {
  const agent = createAgent();
  const ctx = contextFor(MODULE);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  await agent.beforePromptImplicit!(meta(), ctx, COMMAND(from));
  const out: Array<{ stepId: string; status: string; trace: string }> = [];
  let order = 1;
  const flow = ['input20', 'resolve25', 'domain30', 'persistence40', 'usecases50', 'controllers60', 'support70', 'finalize80'] as D1StepId[];
  for (const stepId of flow.slice(0, flow.indexOf(upTo) + 1)) {
    const intents = stepId === 'usecases50'
      ? (await approveUsecases(agent, ctx, parent, MODULE, order)).intents
      : (await runStep(agent, ctx, parent, MODULE, stepId, order, () => D1_GAP_NONE)).intents;
    for (const intent of intents) {
      if (intent.type === 'update-status') out.push({ stepId, status: intent.status, trace: intent.traceMsg || '' });
      if (intent.type === 'add-step') (parent.nextSteps ??= []).push(intent.step as mls.msg.AIPayload);
    }
    order += 1;
  }
  return out;
}

const STRAY = 'l1/agents/layer_2_application/usecases/strayCase.defs.ts';

function strayDef(host: TestHost): string {
  const source = Object.values(host.files).find(file => file.shortName === 'listPersonalConduct' && file.extension === '.defs.ts');
  assert.ok(source);
  return source.content.replaceAll('listPersonalConduct', 'strayCase');
}

function errorsOf(host: TestHost): string[] {
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '');
  return (report?.findings || []).filter(item => item.severity === 'error').map(item => `${item.code} ${item.path}`);
}

void test('d1_250: agents@1be807ab: /rederive controllers60 ends complete; listPersonalConduct, a def the D1 wrote that no plan carries any more, is inventoried as removed and is not an extra file', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE, PROJECT);
  const ran = await rederiveRun(host, 'controllers60');
  assert.deepEqual(ran.filter(item => item.status === 'failed'), []);
  assert.deepEqual(errorsOf(host), []);
  assert.equal(parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '')?.outcome, 'complete');
  assert.equal(JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content).status, 'complete');
  const snapshot = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))].content) as D1InputSnapshot;
  assert.equal(snapshot.removed.some(item => item.kind === 'usecase' && item.id === 'listPersonalConduct' && item.inventoried), true);
  assert.equal(snapshot.files.some(file => file.identity === 'listPersonalConduct'), false, 'it is not planned');
  const end = ran.find(item => item.stepId === 'finalize80' && item.status === 'completed')!.trace;
  assert.match(end, /\nrun summary:\n/u);
  // d1_251: the def of the orphan leaves the module with the plan; the usecases the plan carries stay.
  const left = Object.values(host.files).filter(file => file.extension === '.defs.ts' && file.folder.endsWith('layer_2_application/usecases') && file.status !== 'deleted').map(file => file.shortName);
  assert.equal(left.includes('listPersonalConduct'), false, 'listPersonalConduct is removed');
  assert.equal(left.includes('updatePersonalConduct'), true);
  assert.equal(left.length, 26);
  assert.match(ran.find(item => item.stepId === 'usecases50')!.trace, /removed 1 \(listPersonalConduct\)/u);
});

void test('d1_250: a usecase def nobody wrote (no receipt) is still an extra file', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE, PROJECT);
  seed(host, fileInfoFromDisplay(PROJECT, STRAY)!, strayDef(host), 'stray');
  await rederiveRun(host, 'controllers60');
  assert.deepEqual(errorsOf(host), [`EXTRA_FILE ${STRAY}`]);
});

void test('d1_250: a def the D1 wrote and someone edited since is still an extra file', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE, PROJECT);
  const edited = Object.values(host.files).find(file => file.shortName === 'listPersonalConduct' && file.extension === '.defs.ts')!;
  edited.content = edited.content.replace('"operation": "list"', '"operation": "list", "note": "EDITADO-A-MAO"');
  assert.equal(edited.content.includes('EDITADO-A-MAO'), true);
  await rederiveRun(host, 'controllers60');
  assert.equal(errorsOf(host).includes('EXTRA_FILE l1/agents/layer_2_application/usecases/listPersonalConduct.defs.ts'), true, errorsOf(host).join(' | '));
});

