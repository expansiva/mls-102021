/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/answerShape.test.ts" enhancement="_blank"/>

// d1_278 s2: the context shows the fields of the answer of a call, one level down, so a field the contract does not have is not guessed. Built with no model
// from the recorded state `102047@2e3e5a1b` (the defs of getAgent, updatePersonalConduct and toolCatalogRefresh are the same bytes at `dc67062d`).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { answerTypeNames, loadUsecaseContext } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { loadWorkflowContext } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const PROJECT = 102047;

async function recorded() {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'agents-2e3e5a1b', PROJECT);
  const { units } = await loadModuleUnits(PROJECT, 'agents', storEntries());
  const cm = readFileSync(new URL('../../../agentDefsL1/fixtures/agents-2e3e5a1b/_102034_/l2/shared/contracts/connections/cm.txt', import.meta.url), 'utf8');
  const base = createContext({ project: PROJECT, module: 'agents' } as never, units, 'dev');
  const ctx = { ...base, read: async (ref: string) => (/connections\/cm\.ts$/u.test(ref) ? cm : base.read(ref)) };
  return { ctx, unit: (id: string) => units.find(item => item.unitId === id)!, cm };
}

void test('d1_278 s2: the card of a list answer is shown with its fields (and without `definition`), in the workflow that lists the agents', async () => {
  const { ctx, unit } = await recorded();
  const built = await loadWorkflowContext(ctx, unit('toolCatalogRefresh'), undefined, 'chooseToolsForAgents');
  assert.match(built.human, /`CmListAgentsOutput` is `\{ agents: CmAgentCard\[\]; \}`/u);
  const card = /`CmAgentCard` is `(\{[^`]*\})`/u.exec(built.human)?.[1] ?? '';
  assert.match(card, /agentId: string/u);
  assert.match(card, /enabled: boolean/u);
  assert.equal(card.includes('definition'), false, 'the card has no definition: it comes only from readAgent');
  assert.match(built.human, /`CmRunAiPromptOutput` is `\{ result: unknown; \}`/u);
});

void test('d1_278 s2: the read answer shows `definition` and `personal`', async () => {
  const { ctx, unit } = await recorded();
  const built = await loadUsecaseContext(ctx, unit('getAgent'));
  const read = /`CmReadAgentOutput` is `(\{[^`]*\})`/u.exec(built.human)?.[1] ?? '';
  assert.match(read, /definition: string/u);
  assert.match(read, /personal\?: \{ role: string; state: string \}/u);
});

void test('d1_278 s2: the catalog types a body names, once, only the ones the catalog declares', async () => {
  const { cm } = await recorded();
  assert.deepEqual(answerTypeNames(cm, 'CmListAgentsOutput'), ['CmAgentCard']);
  assert.deepEqual(answerTypeNames(cm, 'CmRunAiPromptOutput'), []);
  assert.deepEqual(answerTypeNames(null, 'CmListAgentsOutput'), []);
});
