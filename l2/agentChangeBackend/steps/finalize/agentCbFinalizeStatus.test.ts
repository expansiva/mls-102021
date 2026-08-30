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

// ── o run nunca mais termina verde sobre um todoBackend podre ─────────────────
// petShop, 21/08/2026: o run reportou 65 owners `done`, o arquivo persistido ficou com o estado
// PRÉ-run (64 toCreate + 1 inProgress) e nada acusou. Este step passou a reler e a falhar.
void test('finalize re-reads todoBackend on both surfaces, retries once and then fails', () => {
  const src = readFileSync(path.join(HERE, 'agentCbFinalizeStatus.ts'), 'utf8');
  // A expectativa é construída A PARTIR DAS ESCRITAS, não do que se queria escrever: um
  // setTodoBackendStatus que devolve false não escreveu nada e não muda a expectativa.
  assert.match(src, /if \(await setTodoBackendStatus\(owner, 'done'\)\) \{ flipped\+\+; expected\.set\(todoOwnerKey\(owner\.kind, owner\.id\), 'done'\); \}/);
  assert.match(src, /const firstReadBack = await readBackTodoBackend\(expected, moduleName\);/);
  // Retry ÚNICO, e só dos owners divergentes.
  assert.match(src, /for \(const divergence of todoReadBackDivergences\(readBack\)\)/);
  assert.match(src, /readBack = await readBackTodoBackend\(expected, moduleName\);\s*\n\s*\}/);
  assert.match(src, /read-back FAILED: no todoBackend file for module/);
  // Persistindo a divergência, o step FALHA — inclusive quando nada pôde ser reescrito.
  assert.match(src, /if \(todoReadBackIsFatal\(readBack\)\) \{/);
  assert.match(src, /throw new Error\(`todoBackend read-back FAILED after 1 retry/);
  // O relatório carrega a PRIMEIRA leitura: o retry é justamente o que apagaria a evidência.
  assert.match(src, /divergences: todoReadBackDivergences\(firstReadBack\)\.slice\(0, 8\)/);
  assert.match(src, /stor: surfaceState\(firstReadBack, 'stor'\)/);
  assert.match(src, /afterRetry: retried \?/);
  const summary = readFileSync(path.join(HERE, 'agentCbFinalSummary.ts'), 'utf8');
  assert.match(summary, /todoReadBack: isRecord\(args\.todoReadBack\) \? args\.todoReadBack : null,/);
});
