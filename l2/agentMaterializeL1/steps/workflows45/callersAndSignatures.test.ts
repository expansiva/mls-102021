/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/callersAndSignatures.test.ts" enhancement="_blank"/>

// d1_283 (1)/(2): what the context of a process function lacked, measured on the context built with no model from `102047@4894055e` (the recorded defs of
// `agents-2e3e5a1b` for the process, which are the same bytes for these two processes, and the generated files of `4894055e` by git show):
//  - the usecase a step calls (`listAgent`, `getAgent`) is no dependency of the process def, so its signature (the output it returns) was not in the context;
//  - the call sites of the functions in the other files of the module (`completeDraftReview({ id, draftId, version, outcome })`) were not in the context, so a regeneration
//    lost the `draftId` and the callers stopped compiling.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { callersSection, loadWorkflowContext, workflowFacts } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const PROJECT = 102047;
const out = (name: string) => readFileSync(new URL(`fixtures/agents4894055e/${name}.ts.txt`, import.meta.url), 'utf8');
const catalog = (name: string) => readFileSync(new URL(`../../../agentDefsL1/fixtures/agents-2e3e5a1b/_102034_/l2/shared/contracts/connections/${name}.txt`, import.meta.url), 'utf8');

async function recorded() {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'agents-2e3e5a1b', PROJECT);
  const put = (display: string, text: string) => seed(host, fileInfoFromDisplay(PROJECT, display)!, text);
  put('l1/agents/layer_2_application/usecases/listAgent.ts', out('listAgent'));
  put('l1/agents/layer_2_application/usecases/getAgent.ts', out('getAgent'));
  put('l1/agents/layer_2_application/requests/draft_review.ts', out('draft_review'));
  put('l1/agents/layer_2_application/requests/cm.ts', out('cm'));
  const { units } = await loadModuleUnits(PROJECT, 'agents', storEntries());
  const base = createContext({ project: PROJECT, module: 'agents' } as never, units, 'dev');
  const files: Record<string, string> = { 'connections/cm.ts': catalog('cm'), 'connections/platform.ts': catalog('platform') };
  const read = async (ref: string) => {
    const hit = Object.entries(files).find(([end]) => ref.endsWith(end));
    return hit ? hit[1] : base.read(ref);
  };
  return { ctx: { ...base, read } as typeof base, unit: (id: string) => units.find(item => item.unitId === id)! };
}

void test('d1_283: the usecase a step calls but the def does not list gets its signature in the context', async () => {
  const { ctx, unit } = await recorded();
  const built = await loadWorkflowContext(ctx, unit('toolCatalogRefresh'), undefined, 'chooseToolsForAgents');
  assert.match(built.human, /## Usecase listAgent\n/u);
  assert.match(built.human, /export async function listAgent\(/u);
  assert.equal((built.human.match(/## Usecase listAgent\n/gu) ?? []).length, 1, 'once');
  assert.equal(built.human.includes('## Usecase getAgent\n'), false, 'getAgent is no step call of this recorded L4 (it is of bc0fbedf on)');
});

void test('d1_283: the call sites of the functions of a process are in the context, with the input they pass', async () => {
  const { ctx, unit } = await recorded();
  const process = unit('virtualEmployeeCreation');
  const complete = await loadWorkflowContext(ctx, process, undefined, 'completeDraftReview');
  assert.match(complete.human, /## How the module calls the functions of this process today/u);
  assert.match(complete.human, /`completeDraftReview` is called today as:\n\s+- draft_review: `completeDraftReview\(\{ id: draft\.id, draftId: cmDraft\.agentId, version: input\.version, outcome: 'activate' \}, bound\)`/u);
  const receive = await loadWorkflowContext(ctx, process, undefined, 'receiveDraftOutcome');
  assert.match(receive.human, /- cm: `receiveDraftOutcome\(\{ id: input\.draftId, draftId: input\.draftId, status: input\.status/u);
  assert.equal(receive.human.includes('`completeDraftReview` is called today'), false, 'only the function in focus');
});

void test('d1_283: a function nobody calls, and a module with no generated callers, add nothing', async () => {
  const { ctx, unit } = await recorded();
  const process = unit('virtualEmployeeCreation');
  assert.equal(await callersSection(ctx, process, workflowFacts(process), 'startVirtualEmployeeRequest'), '', 'no caller in the files given');
  const bare = { ...ctx, units: ctx.units.filter(item => !item.defRef.includes('/requests/')) } as typeof ctx;
  assert.equal(await callersSection(bare, process, workflowFacts(process), 'completeDraftReview'), '');
});
