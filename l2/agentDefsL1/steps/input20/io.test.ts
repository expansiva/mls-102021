/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/io.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { inputFile, plannerPipelineFile, type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { assembleD1Input, fileInfoFromDisplay, persistD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'head');
const MODULE = 'agendaClinica';
const PROJECT = 102047;

function walk(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

function seedFixture(host: TestHost): void {
  for (const rel of walk(FIXTURE, '')) {
    const file = rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
    const info = fileInfoFromDisplay(PROJECT, file);
    assert.ok(info, rel);
    seed(host, info, readFileSync(path.join(FIXTURE, rel), 'utf8'), `frozen-${file}`);
  }
}

void test('input.json reopens the same snapshot and writes nothing outside the receipt', async () => {
  const host = installStudio(PROJECT);
  seedFixture(host);
  const neighbors: D1FileInfo[] = [
    plannerPipelineFile(PROJECT, MODULE),
    { project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: '20260921173358_agendaClinica-20260921172812_1', extension: '.json' },
    { project: PROJECT, level: 5, folder: MODULE, shortName: 'marker', extension: '.json' },
    { project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: 'pacientes', extension: '.defs.ts' },
    { project: PROJECT, level: 4, folder: `${MODULE}/ontology`, shortName: 'Consulta', extension: '.defs.ts' },
  ];
  seed(host, neighbors[1], '{"from":"l1","to":"l2"}\n', 'pool-message');
  seed(host, neighbors[2], '{"l5":true}\n', 'l5-neighbor');
  seed(host, neighbors[3], 'export const pacientesContract = { "moduleName": "agendaClinica", "pageId": "pacientes" } as const;\n', 'l2-neighbor');
  const before = new Map(neighbors.map(info => [fileKey(info), host.files[fileKey(info)]?.content]));
  const mtimes = new Map(neighbors.map(info => [fileKey(info), host.files[fileKey(info)]?.updatedAt]));

  const first = await assembleD1Input(PROJECT, MODULE);
  assert.equal(first.selection.usecases.length, 13);
  assert.equal(first.selection.outbound.length, 3);
  const saved = await persistD1Input(PROJECT, MODULE, first);
  assert.equal(saved.reused, false);
  assert.deepEqual(host.writes, [fileKey(inputFile(PROJECT, MODULE))]);

  first.selection.pages = [];
  const again = await assembleD1Input(PROJECT, MODULE);
  const stored = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '{}') as { snapshotHash: string };
  assert.equal(again.snapshotHash, first.snapshotHash);
  assert.equal(again.snapshotHash, stored.snapshotHash);
  assert.equal(again.selection.pages.length, 5);
  const twice = await persistD1Input(PROJECT, MODULE, again);
  assert.equal(twice.reused, true);
  assert.deepEqual(host.writes, [fileKey(inputFile(PROJECT, MODULE))]);

  for (const info of neighbors) {
    const key = fileKey(info);
    assert.equal(host.files[key]?.content, before.get(key), key);
    assert.equal(host.files[key]?.updatedAt, mtimes.get(key), key);
  }
  assert.equal(host.files[fileKey(neighbors[1])]?.content.includes('from'), true);
  assert.equal(Object.keys(host.files).some(key => key.includes('/layer_')), false);
});
