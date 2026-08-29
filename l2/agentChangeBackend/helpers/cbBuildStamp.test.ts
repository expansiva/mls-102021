/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbBuildStamp.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CB_AGENT_PROJECT, CB_AGENT_SOURCE_PREFIX, CB_BUILD_ANCHORS,
  buildProvenance, describeProvenance, digestBuildFiles,
} from './cbBuildStamp.js';

// Entradas REAIS do fileinfos.json que veio dentro do obj/compiled.zip do 102021 (build e7ce612,
// lastModified 2026-08-22T01:07:11.331Z) — o mesmo build que rodou o incidente. Cada versionRef abaixo
// foi conferido com `git rev-parse 308ab97:<path>`; o do cbShared também com `git hash-object` do
// working tree, que dava OUTRO valor (5691b296…) porque a correção nunca foi commitada.
const BUILD_FILES = [
  { shortPath: 'l0/README.md', versionRef: 'ed74099fcd216f97bf6b21acea93ee21b229595d' },
  { shortPath: 'l2/agentChangeBackend/agentChangeBackend.ts', versionRef: 'd00825c6da79d79f612a5ee4194e723468adf46f' },
  { shortPath: 'l2/agentChangeBackend/flow.json', versionRef: 'e4073aebf1d434fbf8dfe575a8ebda90c5da7d5c' },
  { shortPath: 'l2/agentChangeBackend/helpers/cbShared.ts', versionRef: '1ef6d9033e10a611d0b290eb3de16536dd18bbbb' },
  { shortPath: 'l2/agentChangeBackend/helpers/cbDefsSource.ts', versionRef: 'd1ccc258d4f42e57f35c1878dcebb6e18ff95ba9' },
];

test('a proveniência cobre SÓ os fontes do próprio agente', () => {
  const provenance = buildProvenance(CB_AGENT_PROJECT, BUILD_FILES, {
    prefix: CB_AGENT_SOURCE_PREFIX, anchors: CB_BUILD_ANCHORS, lastPushAt: '2026-08-22T01:07:11.331Z',
  });
  // O l0/README.md do projeto não diz nada sobre qual agente rodou.
  assert.equal(provenance.files, 4);
  assert.equal(provenance.project, 102021);
  assert.equal(provenance.anchors['l2/agentChangeBackend/helpers/cbShared.ts'], '1ef6d9033e10a611d0b290eb3de16536dd18bbbb');
  assert.equal(provenance.lastPushAt, '2026-08-22T01:07:11.331Z');
  assert.equal(provenance.error, undefined);
});

test('âncora que o build não tem sai como `absent`, não quebra o digest', () => {
  // Caso real: um helper novo que ainda não foi commitado não existe no fileinfos.json.
  const provenance = buildProvenance(CB_AGENT_PROJECT, BUILD_FILES, {
    prefix: CB_AGENT_SOURCE_PREFIX,
    anchors: [...CB_BUILD_ANCHORS, 'l2/agentChangeBackend/helpers/cbBuildStamp.ts'],
  });
  assert.equal(provenance.anchors['l2/agentChangeBackend/helpers/cbBuildStamp.ts'], 'absent');
  assert.notEqual(provenance.buildRef, '');
});

test('o digest é estável, independe da ordem e MUDA quando um versionRef muda', () => {
  const digest = digestBuildFiles(BUILD_FILES);
  assert.equal(digest, digestBuildFiles([...BUILD_FILES].reverse()));
  assert.match(digest, /^[0-9a-f]{8}$/);
  // O working tree do incidente: cbShared.ts hasheava 5691b296… em vez de 1ef6d903…
  const withLocalFix = BUILD_FILES.map(file => file.shortPath.endsWith('cbShared.ts')
    ? { ...file, versionRef: '5691b29698962f5ab5c7e1f25360af7c2834ce1d' }
    : file);
  assert.notEqual(digestBuildFiles(withLocalFix), digest);
  // Mesmos pares ⇒ mesmo digest: dois runs com o mesmo buildRef rodaram o MESMO código.
  assert.equal(digestBuildFiles([...BUILD_FILES]), digest);
});

test('sem fileInfo[] o buildRef é vazio e o erro aparece — nunca um digest inventado', () => {
  const provenance = buildProvenance(CB_AGENT_PROJECT, [], {
    prefix: CB_AGENT_SOURCE_PREFIX, anchors: CB_BUILD_ANCHORS, error: 'project info carries no fileInfo[]',
  });
  assert.equal(provenance.buildRef, '');
  assert.equal(provenance.files, 0);
  assert.equal(provenance.error, 'project info carries no fileInfo[]');
  assert.match(describeProvenance(provenance), /Agent build: unknown \(project info carries no fileInfo\[\]\)/);
});

test('a linha do trace identifica o código, e edição local é NOTA, não alarme', () => {
  const clean = describeProvenance(buildProvenance(CB_AGENT_PROJECT, BUILD_FILES, {
    prefix: CB_AGENT_SOURCE_PREFIX, anchors: CB_BUILD_ANCHORS, lastPushAt: '2026-08-22T01:07:11.331Z',
  }));
  assert.match(clean, /Agent build: 102021@[0-9a-f]{8} \(4 source\(s\)/);
  assert.match(clean, /last push 2026-08-22T01:07:11\.331Z/);
  assert.ok(!clean.includes('edited locally'));
  const editing = describeProvenance(buildProvenance(CB_AGENT_PROJECT, BUILD_FILES, {
    prefix: CB_AGENT_SOURCE_PREFIX, anchors: CB_BUILD_ANCHORS, localEdits: 3,
  }));
  assert.match(editing, /3 source\(s\) edited locally/);
  // Editar é o estado NORMAL de quem edita: nada de ⚠, nada da palavra "stale".
  assert.ok(!/⚠|stale|STALE/u.test(editing));
  assert.equal(describeProvenance(null), '');
});

// ── o que o stamp NÃO faz, afirmado no código ────────────────────────────────
test('o helper não tem mecanismo de timestamp nem promete detectar código velho', () => {
  const src = readFileSync(new URL('cbBuildStamp.ts', import.meta.url), 'utf8');
  // Nenhuma comparação de tempo sobrou (era a premissa errada: repository_lastModified é PUSH, não build).
  assert.doesNotMatch(src, /compareAgentBuild|CLOCK_TOLERANCE|staleSources|STALE AGENT/u);
  assert.doesNotMatch(src, /new Date\(/u);
  // O limite está escrito no código, não só na spec.
  assert.match(src, /cannot see work that was never committed and pushed/);
  assert.match(src, /NOT a gate: it never blocks, never fails a run, and emits no warning/);
  // lastPushAt nomeado pelo que é.
  assert.match(src, /Last push registered on the project\. NOT the build time/);
  // A fonte é o manifest do build (não perturbado por edição local), não mls.stor.files[].versionRef.
  assert.match(src, /prj\?\.fileInfo \?\? \[\]/);
  assert.match(src, /`mls\.stor\.files\[\]\.versionRef` is not usable here/);
});

test('os 5 pontos de instrumentação seguem ligados, agora com proveniência', () => {
  const scan = readFileSync(new URL('../steps/scan/agentCbScanCreateOwners.ts', import.meta.url), 'utf8');
  assert.match(scan, /const provenance = await readAgentProvenance\(\);/);
  // be5 (BE5-4): o stamp NÃO vai mais para o console — o dossiê (`agentBuild`) e o summary do
  // finalize já o carregam; o trace do step continua recebendo (`buildTrace` entra no status).
  assert.doesNotMatch(scan, /console\.info\(`\$\{logPrefix\(agent\)\}\$\{described\}`\)/);
  assert.match(scan, /\$\{buildTrace\}`/);
  assert.doesNotMatch(scan, /console\.warn|staleAgentWarning/u);
  const summary = readFileSync(new URL('../steps/finalize/agentCbFinalSummary.ts', import.meta.url), 'utf8');
  assert.match(summary, /const agentBuild = await readAgentProvenance\(\);/);
  assert.match(summary, /\+ cost \+ residual \+ stamp \+ handoff\.note;/);
  assert.match(summary, /^\s*agentBuild,$/m);
});
