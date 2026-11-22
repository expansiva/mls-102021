/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/processPortUpdate.test.ts" enhancement="_blank"/>

// d1_283 (3): the port `agentDraftRepository` the D1 derives has no `update` (no usecase of AgentDraft updates: the arrival `cm.agentDraftReady` is the process's, d1_275),
// and the process `virtualEmployeeCreation` lists `AgentDraft.update` (d1_281). The materializer gives the port the methods of the process (`withProcessMethods`, called by
// `loadModuleUnits`): the code of the port has `update`. The defs are the ones of `102047@4894055e` (git show), byte for byte; the D1 output is those with the
// `update` method and the `updateAgentDraft` usecase def taken away.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

const PROJECT = 102047;
const read = (name: string) => readFileSync(new URL(`fixtures/agents4894055e/${name}.defs.ts.txt`, import.meta.url), 'utf8');
const UPDATE_METHOD = /,\s*\{\s*"name": "update",\s*"params": \[\s*"AgentDraft"\s*\],\s*"returns": "AgentDraft"\s*\}/u;

async function methodsOf(port: string, withUpdateUsecase: boolean): Promise<string[]> {
  const host = installStudio(PROJECT);
  const put = (display: string, text: string) => seed(host, fileInfoFromDisplay(PROJECT, display)!, text);
  put('l1/agents/layer_2_application/ports/agentDraftRepository.defs.ts', port);
  put('l1/agents/layer_2_application/workflows/virtualEmployeeCreation.defs.ts', read('virtualEmployeeCreation'));
  if (withUpdateUsecase) put('l1/agents/layer_2_application/usecases/updateAgentDraft.defs.ts', read('updateAgentDraft'));
  const { units } = await loadModuleUnits(PROJECT, 'agents', storEntries());
  const unit = units.find(item => item.unitId === 'agentDraftRepository')!;
  return (unit.definition.data.methods as Array<{ name: string }>).map(item => item.name);
}

void test('d1_283 (3): the port the D1 derives without update gets it from the process that lists AgentDraft.update', async () => {
  const committed = read('agentDraftRepository');
  assert.ok(UPDATE_METHOD.test(committed), 'the committed port of 4894055e has update');
  const derived = committed.replace(UPDATE_METHOD, '');
  assert.equal(derived.includes('"update"'), false);
  assert.deepEqual(await methodsOf(derived, false), ['create', 'list', 'transition', 'update']);
});

void test('d1_283 (3): a usecase of AgentDraft that updates covers it (the port is as the D1 wrote it), and a port that has it is not touched', async () => {
  const committed = read('agentDraftRepository');
  const derived = committed.replace(UPDATE_METHOD, '');
  assert.deepEqual(await methodsOf(derived, true), ['create', 'list', 'transition']);
  assert.deepEqual(await methodsOf(committed, false), ['create', 'list', 'update', 'transition']);
});
