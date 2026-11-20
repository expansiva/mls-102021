/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/entityCatalog.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { catalogInfo } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import { entityCatalogSource } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { externalConnectionIds, resolveEntityCatalogs } from '/_102021_/l2/agentDefsL1/steps/input20/entityCatalog.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The bytes of the `github.ts` the `repoHost` module generated (102047), recorded.
const GITHUB = readFileSync(path.join(HERE, '../../../agentMaterializeL1/steps/usecases40/fixtures/githubDeclaration.recorded.txt'), 'utf8');
const PROJECT = 102047;
const PLATFORM = '/_102034_/l1/server/layer_1_external/connections/catalogs';
const DECLARATION = '/_102047_/l1/repoHost/layer_1_external/connections/github.ts';

const entities = { ContentFile: { kind: 'external', connectionId: 'github' }, Publication: { kind: 'entity' } };

function registry(modules: string[]): string {
  return `export const registry = ${JSON.stringify({ modules: modules.map(moduleName => ({ moduleName })) })} as const;`;
}

function integration(id: string): string {
  return `export const integration = ${JSON.stringify({ externalSystems: [{ id, title: '', description: '', settings: [], operations: [{ operationId: 'gravarArquivo', direction: 'call', description: '' }] }] })} as const;`;
}

/** The files of the case, by the ref the resolver asks for; every ask is kept. */
function host(files: Record<string, string>): { read: (ref: string) => Promise<string | null>; asked: string[] } {
  const asked: string[] = [];
  return { asked, read: async ref => { asked.push(ref); return files[ref.replace(/^\//, '')] ?? null; } };
}

const SIBLING_FILES = {
  [`_${PROJECT}_/l4/organization/registry.defs.ts`]: registry(['conteudo', 'repoHost']),
  [`_${PROJECT}_/l4/repoHost/integration.defs.ts`]: integration('github'),
};

void test('a system a sibling declares is read from its generated declaration, at the path the reader opens', async () => {
  const { read, asked } = host({ ...SIBLING_FILES, [DECLARATION.slice(1)]: GITHUB });
  const found = await resolveEntityCatalogs(PROJECT, 'conteudo', Object.values(entities), read);
  assert.deepEqual(found, { refs: { github: DECLARATION }, problems: {} });
  assert.equal(entityCatalogSource({ kind: 'external', connectionId: 'github' }, found.refs), DECLARATION);
  assert.equal(await read(found.refs.github), GITHUB);
  assert.ok(asked.length > 0);
  assert.deepEqual(catalogInfo(DECLARATION), { project: PROJECT, level: 1, folder: 'repoHost/layer_1_external/connections', shortName: 'github', extension: '.ts' });
});

void test('a platform connection is answered by the platform alone: no sibling file is opened', async () => {
  const { read, asked } = host({ ...SIBLING_FILES, [`${PLATFORM.slice(1)}/github.ts`]: 'export const github = {};' });
  const found = await resolveEntityCatalogs(PROJECT, 'conteudo', Object.values(entities), read);
  assert.deepEqual(found, { refs: { github: `${PLATFORM}/github.ts` }, problems: {} });
  assert.deepEqual(asked, [`${PLATFORM}/github.ts`]);
});

void test('a system of this module is a distinct refusal and the ref is not the platform path', async () => {
  const { read } = host({
    [`_${PROJECT}_/l4/organization/registry.defs.ts`]: registry(['conteudo']),
    [`_${PROJECT}_/l4/conteudo/integration.defs.ts`]: integration('github'),
  });
  const found = await resolveEntityCatalogs(PROJECT, 'conteudo', Object.values(entities), read);
  assert.deepEqual(found.problems, { github: { code: 'EXTERNAL_OWN_SYSTEM' } });
  assert.equal(found.refs.github, '/_102047_/l1/conteudo/layer_1_external/connections/github.ts');
});

void test('a sibling system whose declaration is not generated is SIBLING_DECLARATION_MISSING, naming the module', async () => {
  const { read } = host(SIBLING_FILES);
  const found = await resolveEntityCatalogs(PROJECT, 'conteudo', Object.values(entities), read);
  assert.equal(found.problems.github?.code, 'SIBLING_DECLARATION_MISSING');
  assert.match((found.problems.github as { detail: string }).detail, /module repoHost/);
  assert.equal(found.refs.github, DECLARATION);
});

void test('a connection nobody declares keeps the platform path, as before', async () => {
  const { read } = host(SIBLING_FILES);
  const found = await resolveEntityCatalogs(PROJECT, 'conteudo', [{ kind: 'external', connectionId: 'unknownSystem' }], read);
  assert.deepEqual(found, { refs: { unknownSystem: `${PLATFORM}/unknownSystem.ts` }, problems: {} });
});

void test('entities that are not external ask for nothing, and entityCatalogSource without refs is the platform path', async () => {
  const { read, asked } = host({});
  assert.deepEqual(await resolveEntityCatalogs(PROJECT, 'conteudo', [{ kind: 'entity' }, null, { kind: 'external' }], read), { refs: {}, problems: {} });
  assert.deepEqual(asked, []);
  assert.deepEqual(externalConnectionIds(Object.values(entities)), ['github']);
  assert.equal(entityCatalogSource({ kind: 'external', connectionId: 'github' }), `${PLATFORM}/github.ts`);
  assert.equal(entityCatalogSource({ kind: 'entity', source: ' /_102034_/l4/ontology/mdm.defs.ts ' }), '/_102034_/l4/ontology/mdm.defs.ts');
});

void test('catalogInfo opens the declaration path and no other plain .ts', () => {
  assert.equal(catalogInfo('_102047_/l1/repoHost/layer_1_external/connections/github.ts')?.shortName, 'github');
  for (const refused of [
    '/_102047_/l1/repoHost/layer_1_external/connections/Github.ts',
    '/_102047_/l1/repoHost/layer_1_external/other/github.ts',
    '/_102047_/l2/repoHost/layer_1_external/connections/github.ts',
    '/_102047_/l1/repoHost/layer_2_application/connections/github.ts',
    '/_102047_/l1/repo-host/layer_1_external/connections/github.ts',
    '/_102047_/l1/a/b/layer_1_external/connections/github.ts',
    '/_102047_/l1/repoHost/layer_1_external/connections/../github.ts',
  ]) assert.equal(catalogInfo(refused), null, refused);
});
