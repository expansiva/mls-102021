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
import { loadP1PlanSources } from '/_102021_/l2/agentPlannerL1/steps/plan20/agentP1Plan.js';
import { planP1Backend } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import { readL1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import { holdPipeline } from '/_102021_/l2/agentDefsL1/helpers/d1Hold.js';
import { parsePipelineDocument } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
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

async function rederiveRun(host: TestHost, from: 'controllers60' | null, upTo: D1StepId = 'finalize80'): Promise<Array<{ stepId: string; status: string; trace: string }>> {
  const agent = createAgent();
  const ctx = contextFor(MODULE);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  if (from) await agent.beforePromptImplicit!(meta(), ctx, COMMAND(from));
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
      if (intent.type === 'add-step' && intent.step.type === 'result') out.push({ stepId: `result:${intent.step.planning?.planId}`, status: 'result', trace: String((intent.step as mls.msg.AIResultStep).result) });
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

void test('d1_250: agents@1be807ab: /rederive controllers60 ends complete; listPersonalConduct, a def the D1 wrote that no plan carries any more, is inventoried as unplanned, kept, and is not an extra file', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE, PROJECT);
  const ran = await rederiveRun(host, 'controllers60');
  assert.deepEqual(ran.filter(item => item.status === 'failed'), []);
  assert.deepEqual(errorsOf(host), []);
  assert.equal(parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '')?.outcome, 'complete');
  assert.equal(JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content).status, 'complete');
  const snapshot = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))].content) as D1InputSnapshot;
  assert.equal(snapshot.removed.some(item => item.kind === 'usecase' && item.id === 'listPersonalConduct' && item.inventoried && item.unplanned === true), true);
  assert.equal(snapshot.files.some(file => file.identity === 'listPersonalConduct'), false, 'it is not planned');
  const end = ran.find(item => item.stepId === 'finalize80' && item.status === 'completed')!.trace;
  assert.match(end, /\nrun summary:\n/u);
  // d1_250 (reviewed): the def is KEPT with its code: the plan may be behind the contract and a live route may read through it.
  const left = Object.values(host.files).filter(file => file.extension === '.defs.ts' && file.folder.endsWith('layer_2_application/usecases') && file.status !== 'deleted').map(file => file.shortName);
  assert.equal(left.includes('listPersonalConduct'), true, 'listPersonalConduct is not deleted');
  assert.equal(left.length, 27);
  assert.doesNotMatch(ran.find(item => item.stepId === 'usecases50')!.trace, /removed/u);
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '');
  assert.equal(report?.findings.some(item => item.code === 'UNPLANNED_DEF' && item.severity === 'review'), true, 'it is said, as a review finding');
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


// d1_253: the whole sequence on the state of `agents` at mls-102047@f45e1e26 (git show): the /rederive that the L4 ran, the state that stays, the same
// command again, a /run, and a def edited by hand between the two commands.

const F45 = 'agents-f45e1e26';

function failedOf(ran: Array<{ stepId: string; status: string; trace: string }>): string[] {
  return ran.filter(item => item.status === 'failed').map(item => `${item.stepId}: ${item.trace.slice(0, 200)}`);
}

void test('d1_253: agents@f45e1e26: /rederive controllers60, the state stays, /rederive again, /run; a def edited by hand in between is refused', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, F45, PROJECT);

  const usecaseDefs = (): string[] => Object.values(host.files).filter(file => file.extension === '.defs.ts' && file.folder.endsWith('layer_2_application/usecases') && file.status !== 'deleted').map(file => file.shortName).sort();
  const usecasesBefore = usecaseDefs();
  // The state the L4 left: the first /rederive wrote 5 defs, their receipts have the new bytes, and the inventory of the last input20 has the old ones.
  const first = await rederiveRun(host, 'controllers60');
  assert.deepEqual(failedOf(first), [], '1: /rederive controllers60 ends complete');
  assert.deepEqual(errorsOf(host), []);
  assert.equal(JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content).status, 'complete');

  // 2: the state stays: nothing is edited. 3: the same command again.
  const before = Object.fromEntries(Object.values(host.files).filter(file => file.level === 1 && file.extension === '.defs.ts').map(file => [`${file.folder}/${file.shortName}`, file.content]));
  const second = await rederiveRun(host, 'controllers60');
  assert.deepEqual(failedOf(second), [], '3: the second /rederive ends complete');
  assert.equal(second.some(item => /EXISTS_WITHOUT_RECEIPT|EXTRA_FILE/u.test(item.trace)), false);
  assert.deepEqual(errorsOf(host), []);
  for (const file of Object.values(host.files).filter(item => item.level === 1 && item.extension === '.defs.ts')) {
    assert.equal(file.content, before[`${file.folder}/${file.shortName}`], `the second command rewrote nothing: ${file.shortName}`);
  }

  // 4: a /run after it ends complete and writes nothing.
  const run = await rederiveRun(host, null);
  assert.deepEqual(failedOf(run), [], '4: /run ends complete');
  for (const stepId of ['domain30', 'persistence40', 'controllers60', 'support70']) {
    assert.match(run.find(item => item.stepId === stepId)!.trace, new RegExp(`^${stepId}: wrote 0, `, 'u'), `/run wrote nothing in ${stepId}`);
  }
  assert.equal(JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content).status, 'complete');

  assert.deepEqual(usecaseDefs(), usecasesBefore, 'no usecase def disappeared in the whole sequence (listAgent, listAgentBehavior, listAgentDraft, listOrganizationUser stay)');

  // 5: a def edited by hand between the first run and the second command is refused, and the edit stays.
  const other = installStudio(PROJECT);
  seedD1Fixture(other, F45, PROJECT);
  assert.deepEqual(failedOf(await rederiveRun(other, 'controllers60')), []);
  const request = Object.values(other.files).find(file => file.shortName === 'my_conduct' && file.folder.endsWith('layer_2_application/requests') && file.extension === '.defs.ts')!;
  request.content = request.content.replace('Purpose', 'EDITADO-A-MAO Purpose');
  assert.equal(request.content.includes('EDITADO-A-MAO'), true);
  const refused = await rederiveRun(other, 'controllers60');
  assert.equal(failedOf(refused).length > 0, true, '5: the hand edit is refused');
  assert.equal(request.content.includes('EDITADO-A-MAO'), true, 'and the edit stays');
});

void test('d1_255: agents@f45e1e26: the result the manager reads at the end of the /rederive (finalize80-done) carries the materialize targets and the run summary', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, F45, PROJECT);
  const ran = await rederiveRun(host, 'controllers60');
  assert.deepEqual(failedOf(ran), []);
  const text = ran.find(item => item.stepId === 'result:finalize80-done')?.trace;
  assert.ok(text, 'the finalize80-done result exists');
  const result = JSON.parse(text) as { materializeTargets?: string[]; runSummary?: string[]; rederiveChanged?: number };
  // The five defs the earlier /rederive wrote (controllers, requests and the outbound) are still "changed since the first command".
  assert.equal(result.rederiveChanged, 5);
  assert.deepEqual(result.materializeTargets, [
    '@@agentMaterializeL1 {"target":"_102047_/l1/agents/layer_1_external/adapters/http/controllers/agents.defs.ts"}',
    '@@agentMaterializeL1 {"target":"_102047_/l1/agents/layer_1_external/adapters/http/controllers/my_conduct.defs.ts"}',
    '@@agentMaterializeL1 {"target":"_102047_/l1/agents/layer_1_external/adapters/integration/outbound.defs.ts"}',
    '@@agentMaterializeL1 {"target":"_102047_/l1/agents/layer_2_application/requests/agents.defs.ts"}',
    '@@agentMaterializeL1 {"target":"_102047_/l1/agents/layer_2_application/requests/my_conduct.defs.ts"}',
  ]);
  assert.match((result.runSummary ?? []).join('\n'), /^domain30: wrote 0, kept 10/mu);
  assert.match((result.runSummary ?? []).join('\n'), /^support70: /mu);
});

// d1_260: `agents` at mls-102047@30f16c8e (git show) with the 18 answers the s3b of the l4_p4_140 recorded (resolve25.json, byte for byte), no model.
const A30 = 'agents-30f16c8e';

/** The pool the planner writes with the d1_259 plan20 over this state: `removed` keeps what nobody reads (getAgentDraft, getOrganizationUser). */
async function replanPool(host: TestHost): Promise<void> {
  const sources = await loadP1PlanSources(MODULE);
  const inventory = await readL1Inventory(PROJECT, MODULE);
  const planned = planP1Backend({ needs: sources.needs, inventory, ontology: sources.ontology, now: new Date(0), l4diff: sources.l4diff, actors: sources.actors, integration: sources.integration });
  const keyOf = (end: string) => Object.keys(host.files).find(key => key.endsWith(end))!;
  const backend = JSON.parse(host.files[keyOf('pool/l2/web/backend.json')].content);
  backend.removed = planned.file.removed;
  host.files[keyOf('pool/l2/web/backend.json')].content = JSON.stringify(backend, null, 2);
  const effort = JSON.parse(host.files[keyOf('pool/l2/web/effort.json')].content);
  effort.removed = planned.file.removed.filter(item => item.kind !== 'port').map(item => ({ kind: item.kind, id: item.id, status: item.status }));
  host.files[keyOf('pool/l2/web/effort.json')].content = JSON.stringify(effort, null, 2);
}

function seedEvidenceAnswers(host: TestHost): void {
  const key = Object.keys(host.files).find(item => item.endsWith('pipeline/agentDefsL1/resolve25.json'))!;
  host.files[key].content = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/resolve25Evidence30f16c8e.recorded.txt'), 'utf8');
}

void test('d1_260: agents@30f16c8e with the recorded answers: the resolve25 reuses them with no model and releases the consumer phases', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, A30, PROJECT);
  await replanPool(host);
  seedEvidenceAnswers(host);
  const ran = await rederiveRun(host, 'controllers60', 'resolve25');
  assert.deepEqual(failedOf(ran), []);
  assert.match(ran.find(item => item.stepId === 'resolve25')!.trace, /kept the answered routes for agents from the previous receipt\. No model was called\./u);
  const snapshot = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))].content) as D1InputSnapshot;
  assert.equal(snapshot.consumersReleased, true);
  assert.deepEqual(snapshot.problems.filter(problem => problem.severity === 'error'), []);
  // The six routes that need OrganizationUser.get read the usecase the plan had removed: it stays, and the review says who reads it.
  const review = snapshot.problems.find(problem => problem.code === 'REMOVED_USECASE_READ_BY_ROUTE' && problem.ownerRef === 'getOrganizationUser');
  assert.ok(review);
  for (const route of ['agents.agent_configuration.getAgentConfiguration', 'agents.agent_configuration.saveAgentConfiguration', 'agents.agent_simulation.getSimulationPage', 'agents.agent_simulation.simulateWhatItCan', 'agents.person_restrictions.getPersonRestrictions', 'agents.person_restrictions.saveRestrictions']) {
    assert.match(review.message, new RegExp(route.replace(/\./gu, '\\.'), 'u'));
  }
  assert.equal(snapshot.removed.some(item => item.id === 'getOrganizationUser'), false);
  assert.equal(snapshot.removed.some(item => item.id === 'getAgentDraft'), true, 'what no route reads stays removed');
  // The controller and the request service of my_conduct: the receipt names the def on disk and the inventory is older: recomposed, not unresolved.
  for (const type of ['httpController', 'requestService']) {
    const file = snapshot.files.find(item => item.artifactType === type && item.identity === 'my_conduct');
    assert.equal(file?.action, 'recompose', type);
  }
});

void test('d1_260: a run that holds at resolve25 says why in the step and in the report, and the report is not complete', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, A30, PROJECT);
  await replanPool(host);
  seedEvidenceAnswers(host);
  await rederiveRun(host, 'controllers60', 'input20');
  // Someone edits the def of the my_conduct controller after input20: the disk is neither the inventory nor the receipt, so it is not recomposed.
  const controller = Object.values(host.files).find(file => file.shortName === 'my_conduct' && file.folder.endsWith('adapters/http/controllers') && file.extension === '.defs.ts')!;
  controller.content = controller.content.replace('"pageId"', '"note": "EDITADO-A-MAO", "pageId"');
  assert.equal(controller.content.includes('EDITADO-A-MAO'), true);
  const agent = createAgent();
  const ctx = contextFor(MODULE);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const held = await runStep(agent, ctx, parent, MODULE, 'resolve25', 2);
  assert.match(held.trace, /does not release the consumer phases\. EXISTING_UNRESOLVED:1 \(controller:my_conduct\)/u);
  const report = JSON.parse(host.files[fileKey(reportFile(PROJECT, MODULE))].content) as { outcome: string; blocking: string; findings: Array<{ code: string; severity: string; ownerRef: string }> };
  assert.notEqual(report.outcome, 'complete');
  assert.equal(report.outcome, 'held');
  assert.match(report.blocking, /EXISTING_UNRESOLVED/u);
  assert.equal(report.findings.some(finding => finding.code === 'EXISTING_UNRESOLVED' && finding.severity === 'error' && finding.ownerRef === 'controller:my_conduct'), true);
  const pipeline = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content) as { steps: { resolve25?: { status: string; error?: string } } };
  assert.equal(pipeline.steps.resolve25?.status, 'failed');
  assert.match(pipeline.steps.resolve25?.error ?? '', /EXISTING_UNRESOLVED:1 \(controller:my_conduct\)/u);
});

// d1_261: a step that holds the run writes the report with it (finalize80 does not run after a hold, so `report.json` stayed the last complete one).
type HeldReport = { outcome: string; blocking: string; findings: Array<{ code: string; severity: string; ownerRef: string }> };

void test('d1_261: the input20 that holds says the codes in the step and in the report, which is not complete', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, A30, PROJECT);
  await replanPool(host);
  const before = JSON.parse(host.files[fileKey(reportFile(PROJECT, MODULE))].content) as HeldReport;
  assert.equal(before.outcome, 'complete', 'the report on disk is the one of the last complete run');
  // The plan contradicts itself: a usecase it plans is also removed.
  const effortKey = Object.keys(host.files).find(key => key.endsWith('pool/l2/web/effort.json'))!;
  const effort = JSON.parse(host.files[effortKey].content);
  effort.removed.push({ kind: 'usecase', id: 'updatePersonalConduct', status: 'toRemove' });
  host.files[effortKey].content = JSON.stringify(effort, null, 2);
  const ran = await rederiveRun(host, 'controllers60', 'input20');
  const held = ran.find(item => item.stepId === 'input20')!;
  assert.equal(held.status, 'failed');
  assert.match(held.trace, /Consumer phases are not released\. .*REMOVE_STILL_REFERENCED:\d+ \(updatePersonalConduct\)/u);
  const report = JSON.parse(host.files[fileKey(reportFile(PROJECT, MODULE))].content) as HeldReport;
  assert.equal(report.outcome, 'held');
  assert.match(report.blocking, /REMOVE_STILL_REFERENCED/u);
  assert.equal(report.findings.some(finding => finding.code === 'REMOVE_STILL_REFERENCED' && finding.severity === 'error' && finding.ownerRef === 'updatePersonalConduct'), true);
  // The checkpoint keeps an already approved input20 approved when a later run holds (`withConsumersHeld`): the reason lives in the report and the step.
});

void test('d1_261: holdPipeline, the one hold of domain30, persistence40 and controllers60, writes the report with the reason', async () => {
  for (const step of ['domain30', 'persistence40', 'controllers60'] as const) {
    const host = installStudio(PROJECT);
    seedD1Fixture(host, A30, PROJECT);
    const pipeline = parsePipelineDocument(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content)!;
    assert.ok(pipeline);
    const reason = `${step} refused: Entity AgentDraft has 3 states that no transition reaches.`;
    await holdPipeline(pipeline, step, `_102047_/l1/agents/pipeline/agentDefsL1/drafts/${step}.json`, reason);
    const report = JSON.parse(host.files[fileKey(reportFile(PROJECT, MODULE))].content) as HeldReport;
    assert.equal(report.outcome, 'held', step);
    assert.match(report.blocking, new RegExp(`${step} refused: Entity AgentDraft`, 'u'), step);
    const held = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))].content) as { awaitingStep?: string; steps: Record<string, { status: string; error?: string }> };
    assert.equal(held.awaitingStep, step);
    assert.equal(held.steps[step]?.error, reason);
  }
});
