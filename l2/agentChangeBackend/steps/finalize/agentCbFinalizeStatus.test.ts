/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/finalize/agentCbFinalizeStatus.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCbFinalizeStatus declares the finalize-status step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbFinalizeStatus.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbFinalizeStatus/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCbFinalizeStatus"/);
});

// ── nenhum owner pode ficar para trás em silêncio ─────────────────────────────
// Run 9 (verde de ponta a ponta): approveChangeOrderDecision ficou `toCreate` no todoBackend com os
// artefatos dele prontos e validados. Um hoje são trinta num módulo maior amanhã.
void test('finalize recovers an owner whose artifacts exist and names the ones it cannot', () => {
  const src = readFileSync(path.join(HERE, 'agentCbFinalizeStatus.ts'), 'utf8');
  // Recuperação por EVIDÊNCIA (defs + .ts no disco), nunca por suposição.
  assert.match(src, /for \(const owner of scan\.owners\.filter\(o => o\.todoStatus === 'toCreate'\)\)/);
  assert.match(src, /await ownerArtifactsExist\(owner, moduleName\)/);
  assert.match(src, /fileIsPresent\([\s\S]{0,140}'\.defs\.ts'\)[\s\S]{0,120}'\.ts'\)/);
  // O que não pôde ser recuperado aparece como warning nomeado no trace.
  assert.match(src, /⚠ \$\{notFlipped\.length\} owner\(s\) still pending/);
  // E a varredura de modelos com as contagens antes/depois.
  assert.match(src, /sweepModuleModels\(scan\.project, moduleName, new Set\(\)\)/);
  assert.match(src, /models: registry \$\{before\.registry\}->\$\{after\.registry\}/);
});
