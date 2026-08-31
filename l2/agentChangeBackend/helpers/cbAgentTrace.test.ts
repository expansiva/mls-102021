/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbAgentTrace.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  agentTraceFileInfo,
  cbLayerTraceFolder,
  cbTraceFolder,
  cbTraceReadFolders,
  listCbLayerTraceKeys,
  setCbTraceModule,
} from '/_102021_/l2/agentChangeBackend/helpers/cbTraceScope.js';

const HERE = dirname(fileURLToPath(import.meta.url));

void test('agentTraceFileInfo keeps the declared .json extension (not .defs.ts)', () => {
  // Real incident dump: l4/petShop/trace/193-agent-cb-seeds was JSON with a .defs.ts name
  // because defsRef crushed the extension. The write identity must stay .json.
  const info = agentTraceFileInfo('petShop', 'agentCbSeeds', 193, 102047);
  assert.equal(info.extension, '.json');
  assert.equal(info.level, 4);
  assert.equal(info.folder, 'petShop/pipeline/trace/l1');
  assert.equal(info.shortName, '193-agent-cb-seeds');
  assert.equal(info.project, 102047);
});

void test('saveAgentTrace writes fileInfo directly and does not round-trip through defsRef', () => {
  const src = readFileSync(join(HERE, 'cbShared.ts'), 'utf8');
  const start = src.indexOf('export async function saveAgentTrace');
  assert.ok(start >= 0, 'saveAgentTrace missing');
  const rest = src.slice(start);
  const next = rest.indexOf('\nexport ', 1);
  const body = next === -1 ? rest : rest.slice(0, next);
  assert.doesNotMatch(body, /\bdefsRef\(/);
  assert.doesNotMatch(body, /convertFileReferenceToFile/);
  assert.match(body, /agentTraceFileInfo\(/);
  assert.match(body, /saveJsonStor\(/);
});

function assertTraceLayer(path: string, layer: 'l1' | 'l2'): void {
  const match = /\/pipeline\/trace(?:\/([^/]*))?/.exec(path);
  assert.ok(match, `expected /pipeline/trace in ${path}`);
  assert.equal(match[1], layer, `builder returned unlayered trace path: ${path}`);
}

void test('T5.1 CB builder path contains /pipeline/trace/l1/', () => {
  setCbTraceModule('petShop');
  try {
    assert.match(cbTraceFolder(), /\/pipeline\/trace\/l1$/);
    assert.match(cbLayerTraceFolder('petShop'), /\/pipeline\/trace\/l1/);
    assert.match(agentTraceFileInfo('petShop', 'agentCbSeeds', 193).folder, /\/pipeline\/trace\/l1/);
  } finally {
    setCbTraceModule('');
  }
});

void test('T5.4 no CB trace builder returns /pipeline/trace/<algo> without the layer segment', () => {
  setCbTraceModule('petShop');
  try {
    assertTraceLayer(cbTraceFolder(), 'l1');
    assertTraceLayer(cbLayerTraceFolder('petShop'), 'l1');
    assertTraceLayer(agentTraceFileInfo('petShop', 'agentCbSeeds', 1).folder, 'l1');
    assert.deepEqual(cbTraceReadFolders(), ['petShop/pipeline/trace/l1']);
  } finally {
    setCbTraceModule('');
  }
  assert.equal(cbTraceFolder(), '');
  assert.deepEqual(cbTraceReadFolders(), []);
});

void test('T5.3 /rebuild all of CB lists only this module trace/l1', () => {
  const files = {
    l1: { project: 1, level: 4, status: 'active', folder: 'petShop/pipeline/trace/l1', shortName: 'cb-health-report' },
    l1nested: { project: 1, level: 4, status: 'active', folder: 'petShop/pipeline/trace/l1', shortName: '001-agent-cb-seeds' },
    l2: { project: 1, level: 4, status: 'active', folder: 'petShop/pipeline/trace/l2', shortName: 'cf-run' },
    neighbor: { project: 1, level: 4, status: 'active', folder: 'todo/pipeline/trace/l1', shortName: 'cb-cost' },
    gone: { project: 1, level: 4, status: 'deleted', folder: 'petShop/pipeline/trace/l1', shortName: 'old' },
  };
  assert.deepEqual(listCbLayerTraceKeys(files, 1, 'petShop').sort(), ['l1', 'l1nested']);
});
