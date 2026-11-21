/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1RederiveRemoved.test.ts" enhancement="_blank"/>

// d1_252: the end of a `/rederive` lists the `@@agentMaterializeL1` target of a def that was there before and is gone from the disk now, next to the
// defs that changed: the materializer removes the output it wrote for it. A def only left out of the inventory but still on the disk is not listed
// (its target would regenerate it).

import assert from 'node:assert/strict';
import test from 'node:test';

import { D1_REDERIVE_SCHEMA, finishRederive, readRederive, writeRederive } from '/_102021_/l2/agentDefsL1/helpers/d1Rederive.js';
import { artifactFile } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { removeDefFile } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { sourceIdentityHash } from '/_102021_/l2/helpers/l1Defs/identity.js';

const PROJECT = 102099;
const GONE = 'l1/agents/layer_2_application/usecases/listPersonalConduct.defs.ts';
const KEPT = 'l1/agents/layer_2_application/usecases/getAgent.defs.ts';
const OUT = 'l1/agents/layer_2_application/usecases/listAgent.defs.ts';
const TEXT = (name: string): string => `/// <mls fileReference="_${PROJECT}_/${name}" enhancement="_blank"/>\nexport const x = { name: '${name}' } as const;\n`;

void test('d1_252: a def gone from the disk since the marker gets its target; a def out of the inventory but on the disk does not', async () => {
  const host = installStudio(PROJECT);
  for (const path of [GONE, KEPT, OUT]) seed(host, artifactFile(PROJECT, path)!, TEXT(path), 'm');
  const before: Record<string, string> = {};
  for (const path of [GONE, KEPT, OUT]) before[path] = await sourceIdentityHash(TEXT(path));
  await writeRederive(PROJECT, 'agents', { schemaVersion: D1_REDERIVE_SCHEMA, from: 'usecases50', before });
  assert.ok(await readRederive(PROJECT, 'agents'));

  await removeDefFile(artifactFile(PROJECT, GONE)!);
  // The inventory now lists only KEPT: OUT is on the disk and unchanged, GONE is not on the disk.
  const targets = await finishRederive(PROJECT, 'agents', [KEPT]);
  assert.deepEqual(targets, [`@@agentMaterializeL1 {"target":"_${PROJECT}_/${GONE}"}`]);
  assert.equal(await readRederive(PROJECT, 'agents'), null, 'the marker is removed');
  assert.ok(host.files[fileKey(artifactFile(PROJECT, OUT)!)], 'the def on the disk is untouched');
});

void test('d1_252: a changed def and a gone def are both listed, changed first', async () => {
  const host = installStudio(PROJECT);
  for (const path of [GONE, KEPT]) seed(host, artifactFile(PROJECT, path)!, TEXT(path), 'm');
  const before: Record<string, string> = { [GONE]: await sourceIdentityHash(TEXT(GONE)), [KEPT]: await sourceIdentityHash('old') };
  await writeRederive(PROJECT, 'agents', { schemaVersion: D1_REDERIVE_SCHEMA, from: 'usecases50', before });
  await removeDefFile(artifactFile(PROJECT, GONE)!);
  const targets = await finishRederive(PROJECT, 'agents', [KEPT]);
  assert.deepEqual(targets, [`@@agentMaterializeL1 {"target":"_${PROJECT}_/${KEPT}"}`, `@@agentMaterializeL1 {"target":"_${PROJECT}_/${GONE}"}`]);
});
