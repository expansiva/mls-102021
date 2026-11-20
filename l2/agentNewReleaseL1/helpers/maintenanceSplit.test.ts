/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/maintenanceSplit.test.ts" enhancement="_blank"/>

// d1_234: the maintenance flow (the plan made with the L1 in disk → prepare → input20) gives the usecases per call of a clean plan. The plan is the
// one the planner wrote for the module `agents` (fixture agents-d9a7a597, evidence l4_p4_133_s5c); the list below is what the clean plan gives for the
// same L4 (the L1 empty, the plan of 18/11 that a planner with no L1 writes), with the usecases of the processes the arrivals start (d1_235).

import assert from 'node:assert/strict';
import test from 'node:test';

import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { assembleD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { createAgent } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';

const PROJECT = 102047;
const MODULE = 'agents';

const CLEAN_PLAN_USECASES = [
  'activate|AgentDraft|transition|toCreate|cm.activateAgent',
  'createAgentDraft|AgentDraft|create|toCreate|cm.createAgent',
  'createAgentTool|AgentTool|create|toCreate|',
  'createExecutionSummary|ExecutionSummary|create|toCreate|',
  'createTool|Tool|create|toCreate|',
  'discard|AgentDraft|transition|toCreate|cm.discardAgentDraft',
  'getAgent|Agent|get|toCreate|cm.readAgent',
  'getAgentBehavior|AgentBehavior|get|toCreate|cm.readAgent',
  'getAgentDraft|AgentDraft|get|toCreate|cm.readAgent',
  'getOrganizationUser|OrganizationUser|get|toCreate|',
  'listAgentSimulation|AgentSimulation|list|toCreate|cm.simulateAgent',
  'listAgentTool|AgentTool|list|toCreate|',
  'listExecutionSummary|ExecutionSummary|list|toCreate|',
  'listOrganizationUser|OrganizationUser|list|toCreate|',
  'listPersonToolRestriction|PersonToolRestriction|list|toCreate|',
  'listTool|Tool|list|toCreate|',
  'undoAgentChange|AgentBehavior|update|toCreate|cm.undoAgentChange',
  'updateAgent|Agent|update|toCreate|cm.updateAgent',
  'updateAgentAgentBehavior|AgentBehavior|update|toCreate|cm.updateAgent',
  'updateAgentTool|AgentTool|update|toCreate|',
  'updateTool|Tool|update|toCreate|',
  'updatePersonToolRestriction|PersonToolRestriction|update|toCreate|',
  'updatePersonalConduct|PersonalConduct|update|toCreate|cm.updateAgent',
].sort();

const meta: IAgentMeta = { agentName: 'agentNewReleaseL1', agentProject: 102021, agentFolder: 'agentNewReleaseL1', agentDescription: 'test', visibility: 'public' };
const context = { message: { orderAt: 'm', threadId: 't', content: `@@agentNewReleaseL1 ${MODULE}`, senderId: 'u' }, task: { PK: 'k', iaCompressed: { nextSteps: [], longMemory: {} } } } as mls.msg.ExecutionContext;

async function prepared(): Promise<string> {
  const host = installStudio(PROJECT);
  (globalThis as { mls: { events: Record<string, unknown> } }).mls.events.fireFileAction = () => {};
  seedD1Fixture(host, 'agents-d9a7a597', PROJECT);
  const intents = await createAgent().beforePromptImplicit!(meta, context, `@@agentNewReleaseL1 ${MODULE}`);
  return String((intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step'))?.step.result ?? '');
}

void test('d1_234: the plan the planner wrote with the L1 in disk, through the prepare, gives input20 no error and the usecases per call of the clean plan', async () => {
  const close = await prepared();
  assert.match(close, /^done: postprocess: /);
  assert.match(close, /warning: changeEffort\.json not found/, 'the fixture has no changeEffort.json: the prepare goes on and says so (d1_233)');
  const input = await assembleD1Input(PROJECT, MODULE);
  assert.deepEqual(input.problems.filter(problem => problem.severity === 'error').map(problem => `${problem.code} ${problem.ownerRef ?? ''}`), []);
  assert.equal(input.consumersReleased, true);
  const selected = input.selection.usecases.map(item => `${item.usecaseId}|${item.entity}|${item.operation}|${item.status}|${item.call ?? ''}`);
  assert.equal(new Set(selected).size, selected.length, 'no usecase twice');
  assert.deepEqual([...selected].sort(), CLEAN_PLAN_USECASES);
});

void test('d1_234: a usecase a call serves that a route still calls leaves removed and is not put back (the split makes it); one no call serves is put back as done', async () => {
  const close = await prepared();
  for (const id of ['getAgent', 'getAgentBehavior', 'getAgentDraft', 'undoAgentChange', 'updateAgentAgentBehavior']) {
    assert.match(close, new RegExp(`postprocess: usecase ${id} left removed \\(reason: used by`));
  }
  for (const id of ['getOrganizationUser', 'createAgentTool']) {
    assert.match(close, new RegExp(`postprocess: usecase ${id} from toRemove to done`), 'no call of its own (the platform entity, the write no call serves): its row is put back as before');
  }
});
