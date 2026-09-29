/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Stor.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { pipelineFile, plannerPipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { readText, removeOwned, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';

void test('studio stor reads and writes', async () => {
  const host = installStudio(102047);
  const file = pipelineFile(102047, 'agendaClinica');
  const bytes = await writeJson(file, { project: 102047, moduleName: 'agendaClinica' });
  assert.equal(await readText(file), bytes);
  assert.equal(host.writes.length, 1);
  assert.equal(host.files[fileKey(file)]?.folder, 'agendaClinica/pipeline/agentDefsL1');
});

void test('remove and write use the same file identity and the planner file is refused', async () => {
  const host = installStudio(102047);
  const ours = pipelineFile(102047, 'agendaClinica');
  const planner = plannerPipelineFile(102047, 'agendaClinica');
  const plannerBytes = '{"planner":true}\n';
  seed(host, planner, plannerBytes, 'planner-mtime');
  await writeJson(ours, { owned: true });
  const key = fileKey(ours);
  assert.equal(host.writes[0], key);
  await removeOwned(ours);
  assert.equal(await readText(ours), null);
  await assert.rejects(() => removeOwned(planner), /refuses to remove/);
  assert.equal(host.files[fileKey(planner)]?.content, plannerBytes);
  assert.equal(host.files[fileKey(planner)]?.updatedAt, 'planner-mtime');
});
