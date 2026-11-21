/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1RederiveReaders.test.ts" enhancement="_blank"/>

// d1_264: the end of a `/rederive` lists the target of a def that came out the same but reads (through `dependencies`, transitively) a def that changed.
// The materializer reuses a unit whose output exists (d1_122), so nothing else regenerates it. A def that reads nothing that changed is not listed.

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { D1_REDERIVE_SCHEMA, defHashes, finishRederive, writeRederive } from '/_102021_/l2/agentDefsL1/helpers/d1Rederive.js';
import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';

const PROJECT = 102047;
const UPDATE_TOOL = 'l1/agents/layer_2_application/usecases/updateAgentTool.defs.ts';
const WORKFLOW = 'l1/agents/layer_2_application/workflows/virtualEmployeeCreation.defs.ts';
const UNRELATED = 'l1/agents/layer_2_application/usecases/listTool.defs.ts';

function targetOf(path: string): string {
  return `@@agentMaterializeL1 {"target":"_${PROJECT}_/${path}"}`;
}

async function stateWith(changed: string[]): Promise<{ inventory: string[]; targets: string[] | null }> {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'agents-30f16c8e', PROJECT);
  const inventory = Object.values(host.files)
    .filter(file => file.level === 1 && file.extension === '.defs.ts' && file.folder.startsWith('agents/') && !file.folder.includes('/pipeline'))
    .map(file => `l1/${file.folder}/${file.shortName}.defs.ts`)
    .sort();
  const before = await defHashes(PROJECT, inventory);
  for (const path of changed) before[path] = 'sha256:before';
  await writeRederive(PROJECT, 'agents', { schemaVersion: D1_REDERIVE_SCHEMA, from: 'usecases50', before });
  return { inventory, targets: await finishRederive(PROJECT, 'agents', inventory) };
}

void test('d1_264: a def that came out the same but reads a def that changed is listed, a def that reads nothing that changed is not', async () => {
  const { targets } = await stateWith([UPDATE_TOOL]);
  assert.ok(targets);
  assert.ok(targets.includes(targetOf(UPDATE_TOOL)), 'the changed def');
  assert.ok(targets.includes(targetOf(WORKFLOW)), 'the workflow that reads updateAgentTool');
  assert.equal(targets.includes(targetOf(UNRELATED)), false, 'listTool reads nothing that changed');
  assert.deepEqual([...targets].sort(), targets, 'path order');
});

void test('d1_264: nothing changed, nothing is listed', async () => {
  const { targets } = await stateWith([]);
  assert.deepEqual(targets, []);
});
