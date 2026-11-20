/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/externalCommand.test.ts" enhancement="_blank"/>

// d1_222: the def `externalConnection` of the systems a module declares is written from the L4 alone, before the L2, by the function of
// support70 that a full round uses; the command leaves a writer receipt, so the full round that follows accepts the file as its own.

import assert from 'node:assert/strict';
import test from 'node:test';

import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { commitD1Unit } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { assembleD1Input, fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { emitExternalConnections } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import { writeExternalConnections } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';

const PROJECT = 102047;
const MODULE = 'controleEstoque';
const DEF = `l1/${MODULE}/layer_1_external/connections/zipLookup.defs.ts`;

function put(host: TestHost, logical: string, text: string): void {
  const info = fileInfoFromDisplay(PROJECT, logical);
  assert.ok(info, logical);
  seed(host, info, text, 'case');
}

function read(host: TestHost, logical: string): string | null {
  const info = fileInfoFromDisplay(PROJECT, logical)!;
  return host.files[fileKey(info)]?.content ?? null;
}

/** The module of the fixture, with its L4 integration declaring one system (v4). `title` is the part a test changes. */
function declaring(host: TestHost, title: string): void {
  const file = `l4/${MODULE}/integration.defs.ts`;
  const original = host.files[fileKey(fileInfoFromDisplay(PROJECT, file)!)].content;
  const found = /(export const \w+ = )(\{[\s\S]*\})( as const[^;]*;)/u.exec(original);
  assert.ok(found);
  const root = JSON.parse(found[2]) as Record<string, unknown>;
  root.schemaVersion = '2026-11-19-ns5-integration-v4';
  root.externalSystems = [{
    id: 'zipLookup',
    title,
    description: 'Finds an address by zip code.',
    settings: [{ id: 'accessKey', title: 'Access key', description: 'Reads the service.', secret: true }],
    operations: [{ operationId: 'findAddress', direction: 'call', description: 'The address of one zip code.' }],
  }];
  put(host, file, `${original.slice(0, found.index)}${found[1]}${JSON.stringify(root, null, 2)}${found[3]}${original.slice(found.index + found[0].length)}`);
}

function module(title = 'Zip lookup'): TestHost {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'controleEstoque-39a5166', PROJECT);
  declaring(host, title);
  return host;
}

void test('d1_222: the command writes the def of each declared system, with the bytes a full round would write', async () => {
  const host = module();
  const done = await writeExternalConnections(PROJECT, MODULE);
  assert.deepEqual(done.issues, []);
  assert.deepEqual(done.systems, ['zipLookup']);
  assert.equal(done.written.length, 1);
  const written = read(host, DEF);
  assert.ok(written);
  // The same function a full round uses, not a copy: its bytes are the ones on disk.
  const request = { project: PROJECT, moduleName: MODULE, files: [], externalSystems: [{
    id: 'zipLookup', title: 'Zip lookup', description: 'Finds an address by zip code.',
    settings: [{ id: 'accessKey', title: 'Access key', description: 'Reads the service.', secret: true }],
    operations: [{ operationId: 'findAddress', direction: 'call' as const, description: 'The address of one zip code.' }],
  }] };
  const emitted = emitExternalConnections(request, []).emit;
  assert.equal(emitted.length, 1);
  const rendered = renderDefinition(emitted[0].definition, emitted[0].pipeline[0].defPath);
  assert.ok(!('issues' in rendered));
  assert.equal(written, rendered.source);
  assert.deepEqual(JSON.parse(/definition = (\{[\s\S]*\}) as const;/u.exec(written)![1]).dependencies, [`_${PROJECT}_/l4/${MODULE}/integration.defs.ts`]);
});

void test('d1_222: a second run writes nothing, and a changed L4 rewrites the def the command itself wrote', async () => {
  const host = module();
  await writeExternalConnections(PROJECT, MODULE);
  const first = read(host, DEF);
  const again = await writeExternalConnections(PROJECT, MODULE);
  assert.deepEqual([again.written, again.issues], [[], []]);
  assert.equal(read(host, DEF), first);
  declaring(host, 'Zip lookup service');
  const changed = await writeExternalConnections(PROJECT, MODULE);
  assert.deepEqual(changed.issues, []);
  assert.equal(changed.written.length, 1);
  assert.match(read(host, DEF) ?? '', /Zip lookup service/);
});

void test('d1_222: the input20 round after the command takes the def as its own: no EXISTS_WITHOUT_RECEIPT, action recompose', async () => {
  const host = module();
  const before = await assembleD1Input(PROJECT, MODULE);
  assert.equal(before.files.find(file => file.defPath === DEF)?.action, 'create');
  await writeExternalConnections(PROJECT, MODULE);
  const after = await assembleD1Input(PROJECT, MODULE);
  assert.equal(after.problems.some(problem => problem.code === 'EXISTS_WITHOUT_RECEIPT' && problem.path === DEF), false);
  assert.equal(after.files.find(file => file.defPath === DEF)?.action, 'recompose');
  assert.ok(read(host, DEF));
});

void test('d1_222: a def somebody edited, or one the command did not write, is not overwritten', async () => {
  const host = module();
  put(host, DEF, 'export const definition = {} as const;\n');
  const foreign = await writeExternalConnections(PROJECT, MODULE);
  assert.equal(foreign.written.length, 0);
  assert.match(foreign.issues.join(' '), /without a receipt/);
  assert.equal(read(host, DEF), 'export const definition = {} as const;\n');
  const clean = module();
  await writeExternalConnections(PROJECT, MODULE);
  const edited = (read(clean, DEF) ?? '').replace('"title": "Zip lookup"', '"title": "Edited by hand"');
  assert.notEqual(edited, read(clean, DEF));
  put(clean, DEF, edited);
  declaring(clean, 'Another title');
  const refused = await writeExternalConnections(PROJECT, MODULE);
  assert.equal(refused.written.length, 0);
  assert.equal(refused.issues.length > 0, true);
  assert.equal(read(clean, DEF), edited);
});

void test('d1_222: a module that declares no system gets no def and no refusal', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'controleEstoque-39a5166', PROJECT);
  const done = await writeExternalConnections(PROJECT, MODULE);
  assert.deepEqual(done, { systems: [], written: [], issues: [] });
});

void test('d1_222: the support70 round that follows writes the same bytes, so the file is untouched and the unit hash of the materializer is the same', async () => {
  const host = module();
  await writeExternalConnections(PROJECT, MODULE);
  const onDisk = read(host, DEF);
  assert.ok(onDisk);
  const systems = [{
    id: 'zipLookup', title: 'Zip lookup', description: 'Finds an address by zip code.',
    settings: [{ id: 'accessKey', title: 'Access key', description: 'Reads the service.', secret: true }],
    operations: [{ operationId: 'findAddress', direction: 'call' as const, description: 'The address of one zip code.' }],
  }];
  const emitted = emitExternalConnections({ project: PROJECT, moduleName: MODULE, files: [], externalSystems: systems }, []).emit[0];
  const rendered = renderDefinition(emitted.definition, emitted.pipeline[0].defPath);
  assert.ok(!('issues' in rendered));
  const round = await commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'support70',
    unitId: 'support70',
    draftText: '{"round":"full"}\n',
    parts: [{ defPath: emitted.pipeline[0].defPath, source: rendered.source }],
  });
  assert.deepEqual([round.written, round.issues], [[], []]);
  assert.equal(read(host, DEF), onDisk);
});
