/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/entityCatalogCase.test.ts" enhancement="_blank"/>

// d1_220: the D1 reads the catalog of an `external` entity whose connection is a system a sibling declares, from the generated declaration.
// The case: a module with an entity `ContentFile` on `github`, the project registry, the L4 of the sibling `repoHost`, and the bytes of the
// `github.ts` that module generated. The control is the same entity on the platform connection `cm` (the real catalog of the platform).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { assembleD1Domain, commitD1Domain } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import { assembleD1Input, fileInfoFromDisplay, persistD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { assembleD1Persistence, commitD1Persistence } from '/_102021_/l2/agentDefsL1/steps/persistence40/io.js';
import { loadVerifiedSources } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GITHUB = readFileSync(path.join(HERE, '../../../agentMaterializeL1/steps/usecases40/fixtures/githubDeclaration.recorded.txt'), 'utf8');
const CM = readFileSync(path.join(HERE, '../../../../../mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
const PROJECT = 102047;
const MODULE = 'controleEstoque';
const DECLARATION = `/_${PROJECT}_/l1/repoHost/layer_1_external/connections/github.ts`;

function put(host: TestHost, project: number, logical: string, text: string): void {
  const info = fileInfoFromDisplay(project, logical);
  assert.ok(info, logical);
  seed(host, info, text, 'case');
}

function defs(value: unknown): string {
  return `export const x = ${JSON.stringify(value, null, 2)} as const;\n`;
}

function integration(id: string): string {
  return defs({ externalSystems: [{ id, title: '', description: '', settings: [], operations: [{ operationId: 'gravarArquivo', direction: 'call', description: '' }] }] });
}

/** The module of the fixture plus an `external` entity on `connectionId`; `declared` says who declares the system. */
function caseHost(connectionId: string, declared: 'sibling' | 'siblingNotGenerated' | 'own' | 'ownGenerated' | 'platform'): TestHost {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'controleEstoque-39a5166', PROJECT);
  const index = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/ontology/index.defs.ts`)!;
  const text = host.files[fileKey(index)].content;
  const match = /(export const \w+ = )(\{[\s\S]*\})( as const[^;]*;)/u.exec(text);
  assert.ok(match);
  const body = JSON.parse(match[2]) as { entities: unknown[] };
  body.entities.push({ entityId: 'ContentFile', kind: 'external' });
  put(host, PROJECT, `l4/${MODULE}/ontology/index.defs.ts`, `${text.slice(0, match.index)}${match[1]}${JSON.stringify(body, null, 2)}${match[3]}${text.slice(match.index + match[0].length)}`);
  put(host, PROJECT, `l4/${MODULE}/ontology/ContentFile.defs.ts`, defs({
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: MODULE, entityId: 'ContentFile', title: 'Content file', description: 'A file of the repository.',
    kind: 'external', connectionId, record: { fields: { path: { type: 'string' } } },
  }));
  put(host, PROJECT, 'l4/organization/registry.defs.ts', defs({ modules: [{ moduleName: MODULE }, { moduleName: 'repoHost' }] }));
  if (declared === 'own' || declared === 'ownGenerated') {
    // The integration of the module itself declares the system (v4 L4): its own file, with the system added.
    const file = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/integration.defs.ts`)!;
    const original = host.files[fileKey(file)].content;
    const found = /(export const \w+ = )(\{[\s\S]*\})( as const[^;]*;)/u.exec(original);
    assert.ok(found);
    const root = JSON.parse(found[2]) as Record<string, unknown>;
    root.schemaVersion = '2026-11-19-ns5-integration-v4';
    root.externalSystems = (JSON.parse(integration(connectionId).replace(/^export const x = /, '').replace(/ as const;\n$/, '')) as { externalSystems: unknown[] }).externalSystems;
    put(host, PROJECT, `l4/${MODULE}/integration.defs.ts`, `${original.slice(0, found.index)}${found[1]}${JSON.stringify(root, null, 2)}${found[3]}${original.slice(found.index + found[0].length)}`);
  }
  if (declared === 'sibling' || declared === 'siblingNotGenerated') put(host, PROJECT, 'l4/repoHost/integration.defs.ts', integration(connectionId));
  if (declared === 'sibling') put(host, PROJECT, 'l1/repoHost/layer_1_external/connections/github.ts', GITHUB);
  if (declared === 'ownGenerated') put(host, PROJECT, `l1/${MODULE}/layer_1_external/connections/github.ts`, GITHUB);
  if (declared === 'platform') put(host, 102034, 'l2/shared/contracts/connections/cm.ts', CM);
  return host;
}

/** The inventory of input20 selects an entity by the L2 plan; the case selects the external one by hand, which is all the later steps read. */
async function selected(): Promise<Awaited<ReturnType<typeof assembleD1Input>>> {
  const snapshot = await assembleD1Input(PROJECT, MODULE);
  snapshot.selection.entities = [...new Set([...snapshot.selection.entities, 'ContentFile'])];
  const sample = snapshot.files.find(file => file.artifactType === 'domainEntity');
  assert.ok(sample);
  snapshot.files.push({ ...sample, identity: 'ContentFile', defPath: sample.defPath.replace(/[^/]+$/, 'contentFile.defs.ts'), action: 'create' });
  return snapshot;
}

/** input20 → domain30 → persistence40 → the sources of usecases50, in memory, nothing sent to a model. */
async function run(): Promise<{
  sources: string[];
  domain: Awaited<ReturnType<typeof assembleD1Domain>>;
  persistence: Awaited<ReturnType<typeof assembleD1Persistence>> | null;
  bundle: Awaited<ReturnType<typeof loadVerifiedSources>> | null;
}> {
  const snapshot = await selected();
  assert.equal(snapshot.consumersReleased, true, JSON.stringify(snapshot.problems.filter(item => item.severity === 'error')));
  await persistD1Input(PROJECT, MODULE, snapshot);
  const domain = await assembleD1Domain(PROJECT, MODULE);
  if ('refusal' in domain) assert.fail(domain.refusal);
  await commitD1Domain(PROJECT, domain.build);
  const persistence = await assembleD1Persistence(PROJECT, MODULE);
  if ('refusal' in persistence) assert.fail(persistence.refusal);
  await commitD1Persistence(PROJECT, persistence.build);
  const bundle = await loadVerifiedSources(PROJECT, MODULE, snapshot, ['ContentFile']);
  return { sources: snapshot.sources.map(item => item.path), domain, persistence, bundle };
}

const codes = (problems: ReadonlyArray<{ code: string }>): string[] => problems.map(problem => problem.code);

void test('d1_220: a system a sibling declares is read from its declaration, sealed, and no step refuses the catalog', async () => {
  caseHost('github', 'sibling');
  const out = await run();
  assert.equal(out.sources.includes(DECLARATION), true, 'the declaration is sealed');
  assert.equal(out.sources.includes('l4/repoHost/integration.defs.ts'), true);
  if ('refusal' in out.domain) assert.fail(out.domain.refusal);
  assert.equal(out.domain.build.ok, true, JSON.stringify(out.domain.build.problems));
  assert.equal(codes(out.domain.build.problems).includes('CATALOG_UNREAD'), false);
  const persistence = out.persistence;
  assert.ok(persistence && 'build' in persistence);
  assert.equal(persistence.build.ok, true, JSON.stringify(persistence.build.problems));
  assert.equal(persistence.build.normalizations.some(item => item.code === 'CATALOG_READ_ONLY' && item.path === DECLARATION), true);
  assert.ok(out.bundle);
  assert.deepEqual(out.bundle.findings.filter(item => item.path === DECLARATION || item.path.includes('catalogs/github')), []);
  assert.equal(out.bundle.hashes.some(item => item.path === DECLARATION), true, 'the declaration is read and hashed');
});

void test('d1_220: a change in the sibling declaration moves the snapshot', async () => {
  const host = caseHost('github', 'sibling');
  const before = await assembleD1Input(PROJECT, MODULE);
  put(host, PROJECT, 'l1/repoHost/layer_1_external/connections/github.ts', `${GITHUB}\n// changed\n`);
  const after = await assembleD1Input(PROJECT, MODULE);
  assert.notEqual(after.snapshotHash, before.snapshotHash);
});

void test('d1_220: the platform connection (cm) stays as it was: same refusals, no sibling file sealed, no unparsed-rules finding', async () => {
  caseHost('cm', 'platform');
  const out = await run();
  assert.equal(out.sources.some(path => path.includes('/l1/repoHost/') || path === 'l4/repoHost/integration.defs.ts'), false);
  if ('refusal' in out.domain) assert.fail(out.domain.refusal);
  assert.equal(out.domain.build.ok, true, JSON.stringify(out.domain.build.problems));
  assert.equal(codes(out.domain.build.problems).includes('CATALOG_UNREAD'), false);
  assert.ok(out.persistence && 'build' in out.persistence);
  assert.equal(out.persistence.build.ok, true, JSON.stringify(out.persistence.build.problems));
  assert.ok(out.bundle);
  assert.deepEqual(out.bundle.findings.filter(item => item.path.includes('catalogs')), []);
});

void test('d1_222: a system of this module is read from its own declaration like a sibling\'s: sealed, persistence40 ok, no refusal', async () => {
  caseHost('github', 'ownGenerated');
  const out = await run();
  const own = `/_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/github.ts`;
  assert.equal(out.sources.includes(own), true, 'the own declaration is sealed');
  if ('refusal' in out.domain) assert.fail(out.domain.refusal);
  assert.equal(out.domain.build.ok, true, JSON.stringify(out.domain.build.problems));
  assert.deepEqual(codes(out.domain.build.problems).filter(code => /CATALOG_UNREAD|OWN_DECLARATION|SIBLING_DECLARATION/.test(code)), []);
  assert.ok(out.persistence && 'build' in out.persistence);
  assert.equal(out.persistence.build.ok, true, JSON.stringify(out.persistence.build.problems));
  assert.equal(out.persistence.build.normalizations.some(item => item.code === 'CATALOG_READ_ONLY' && item.path === own), true);
  assert.ok(out.bundle);
  assert.deepEqual(out.bundle.findings.filter(item => item.path === own || item.path.includes('catalogs')), []);
});

void test('d1_222: without the declaration of its own system the refusal is distinct and names the commands, not the design', async () => {
  caseHost('github', 'own');
  const snapshot = await selected();
  await persistD1Input(PROJECT, MODULE, snapshot);
  const domain = await assembleD1Domain(PROJECT, MODULE);
  if ('refusal' in domain) assert.fail(domain.refusal);
  const refusal = domain.build.problems.find(problem => problem.code === 'OWN_DECLARATION_NOT_GENERATED');
  assert.ok(refusal);
  assert.equal(refusal.severity, 'error');
  assert.match(refusal.message, /@@agentDefsL1 controleEstoque \/declarations/);
  assert.match(refusal.message, /@@agentMaterializeL1/);
  assert.equal(codes(domain.build.problems).includes('CATALOG_UNREAD'), false);
  assert.equal(domain.build.ok, false);
});

void test('d1_220: a sibling system whose declaration is not generated is SIBLING_DECLARATION_MISSING, naming the module', async () => {
  caseHost('github', 'siblingNotGenerated');
  const snapshot = await selected();
  assert.equal(snapshot.sources.includes(undefined as never), false);
  assert.equal(snapshot.sources.some(item => item.path === DECLARATION), false, 'nothing to seal');
  await persistD1Input(PROJECT, MODULE, snapshot);
  const domain = await assembleD1Domain(PROJECT, MODULE);
  if ('refusal' in domain) assert.fail(domain.refusal);
  const refusal = domain.build.problems.find(problem => problem.code === 'SIBLING_DECLARATION_MISSING');
  assert.ok(refusal);
  assert.match(refusal.message, /module repoHost/);
  assert.equal(domain.build.ok, false);
});
