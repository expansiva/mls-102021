/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbAgentTrace.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { agentTraceFileInfo } from '/_102021_/l2/agentChangeBackend/helpers/cbTraceScope.js';

const HERE = dirname(fileURLToPath(import.meta.url));

void test('agentTraceFileInfo keeps the declared .json extension (not .defs.ts)', () => {
  // Real incident dump: l4/petShop/trace/193-agent-cb-seeds was JSON with a .defs.ts name
  // because defsRef crushed the extension. The write identity must stay .json.
  const info = agentTraceFileInfo('petShop', 'agentCbSeeds', 193, 102047);
  assert.equal(info.extension, '.json');
  assert.equal(info.level, 4);
  assert.equal(info.folder, 'petShop/trace');
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
