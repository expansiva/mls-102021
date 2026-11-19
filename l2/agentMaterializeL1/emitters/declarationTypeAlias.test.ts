/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/declarationTypeAlias.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { emitController, membersOfType } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { catalogFieldUnion, catalogTypeFields, isNonObjectAlias, typeObjectOpen } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PROJECT = 102047;
const MODULE = 'repoHost';
// Copy of the declaration the external15 phase wrote in the first real generation (mls-102047@edea8d1f): every type is `export type X = { … }`.
const GITHUB = readFileSync(path.join(HERE, 'fixtures/githubDeclaration.recorded.txt'), 'utf8');
/** The same file with every object alias written as an interface: what the reader always accepted. */
const AS_INTERFACES = GITHUB.replace(/export type (\w+) = \{/gu, 'export interface $1 {');

void test('d1_215: the members of an input type are the same whether the declaration writes it as a type alias or as an interface', () => {
  const alias = membersOfType(GITHUB, 'RepositoryChangedInput');
  const iface = membersOfType(AS_INTERFACES, 'RepositoryChangedInput');
  assert.ok(alias, 'the alias form was unread before (CATALOG_INPUT_UNREAD)');
  assert.deepEqual(alias, iface);
  assert.deepEqual(alias.requiredFields.slice(0, 4), ['repository', 'repository.fullName', 'ref', 'after']);
  assert.equal(alias.allowedPaths.includes('commits.author.name'), true, 'a nested object is opened');
  assert.equal(alias.requiredFields.includes('headCommit'), false, 'an optional member is not required');
  for (const type of ['ListContentsInput', 'ReadFileInput', 'WriteFileInput']) {
    assert.ok(membersOfType(GITHUB, type), type);
    assert.deepEqual(membersOfType(GITHUB, type), membersOfType(AS_INTERFACES, type), type);
  }
  assert.deepEqual(membersOfType(GITHUB, 'WriteFileInput')?.requiredFields, ['path', 'content', 'message']);
  // A member typed by another type of the same file is opened in both forms.
  const nested = (source: string) => membersOfType(source.replace('repository: { fullName: string };', 'repository: Repo;').concat('\nexport type Repo = { fullName: string };\n'), 'RepositoryChangedInput');
  const nestedInterface = (source: string) => membersOfType(source.replace('repository: { fullName: string };', 'repository: Repo;').concat('\nexport interface Repo { fullName: string }\n'), 'RepositoryChangedInput');
  assert.equal(nested(GITHUB)?.allowedPaths.includes('repository.fullName'), true);
  assert.deepEqual(nested(GITHUB), nestedInterface(AS_INTERFACES));
});

void test('d1_215: the other readers of a declaration read the alias too, and a union alias is a problem of its own', () => {
  assert.equal(typeObjectOpen(GITHUB, 'ReadFileInput') > 0, true);
  assert.equal(typeObjectOpen(GITHUB, 'Nothing'), -1);
  assert.deepEqual(catalogTypeFields(GITHUB, 'ReadFileInput')?.map(field => field.name), catalogTypeFields(AS_INTERFACES, 'ReadFileInput')?.map(field => field.name));
  assert.deepEqual(catalogTypeFields(GITHUB, 'ReadFileInput')?.map(field => field.name), ['path']);
  assert.deepEqual(catalogFieldUnion(GITHUB, 'ReadFileOutput', 'encoding'), catalogFieldUnion(AS_INTERFACES, 'ReadFileOutput', 'encoding'));
  const union = "export type A = { x: string };\nexport type Mixed = A | { y: string };\nexport type Other = A & { z: number };\nexport type Same = A;\n";
  for (const name of ['Mixed', 'Other', 'Same']) {
    assert.equal(isNonObjectAlias(union, name), true, name);
    assert.equal(membersOfType(union, name), null, name);
  }
  assert.equal(isNonObjectAlias(union, 'A'), false);
  assert.equal(isNonObjectAlias(union, 'Nope'), false);
});

const norm = (ref: string) => ref.replace(/^\//u, '');
const envelope = (definition: Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>): M1Definition => ({ schemaVersion: M1_DEFINITION_SCHEMA, moduleName: MODULE, status: 'pending', ...definition });

function filesFor(declaration: string): (ref: string) => Promise<string | null> {
  const service = `export const definition = ${JSON.stringify(envelope({
    artifactType: 'requestService', artifactId: 'github', dependencies: [],
    data: { pageId: 'github', requests: [{ route: `${MODULE}.github.repositoryChanged`, serves: 'github.repositoryChanged', serviceFunction: 'repositoryChanged', uses: [] }] },
  }))} as const;\n`;
  const files: Record<string, string> = {
    [`_${PROJECT}_/l4/${MODULE}/integration.defs.ts`]: `export const x = ${JSON.stringify({ externalSystems: [{ id: 'github', title: 't', description: 'd', settings: [], operations: [] }] })} as const;`,
    [`_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/github.ts`]: declaration,
    [`_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/github.defs.ts`]: service,
    [`_${PROJECT}_/l1/${MODULE}/layer_2_application/access/accessScope.defs.ts`]: 'export const definition = {"dependencies":[],"data":{}} as const;\n',
    [`_${PROJECT}_/l1/${MODULE}/layer_2_application/access/authorityMap.defs.ts`]: 'export const definition = {"dependencies":[],"data":{}} as const;\n',
  };
  return async ref => files[norm(ref)] ?? null;
}

async function controller(declaration: string) {
  const dependencies = ['accessScope', 'authorityMap'].map(name => `_${PROJECT}_/l1/${MODULE}/layer_2_application/access/${name}.defs.ts`)
    .concat(`_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/github.defs.ts`);
  return emitController(envelope({
    artifactType: 'httpController', artifactId: 'github', dependencies,
    data: { pageId: 'github', handlers: [{ route: `${MODULE}.github.repositoryChanged`, serviceFunction: 'repositoryChanged', grantIds: [] }] },
  }), 'github.ts', filesFor(declaration));
}

void test('d1_215: the controller of the arrival route is generated from the recorded declaration (it was blocked with CATALOG_INPUT_UNREAD)', async () => {
  const emitted = await controller(GITHUB);
  assert.equal('code' in emitted, false, JSON.stringify(emitted));
  if ('code' in emitted) return;
  assert.match(emitted.source, /RepositoryChangedInput/u);
  assert.match(emitted.source, new RegExp(`/_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/github\\.js`, 'u'));
  const viaInterface = await controller(AS_INTERFACES);
  assert.equal('code' in viaInterface, false);
  if (!('code' in viaInterface)) assert.equal(viaInterface.source, emitted.source, 'both forms give the same controller');
});

void test('d1_215: an input type written as a union alias is its own problem, not a silent unread', async () => {
  const mixed = GITHUB.replace(/export type RepositoryChangedInput = \{[\s\S]*?\n\};/u, 'export type RepositoryChangedInput = ReadFileInput | WriteFileInput;');
  assert.notEqual(mixed, GITHUB);
  const emitted = await controller(mixed);
  assert.equal('code' in emitted ? emitted.code : '', 'CATALOG_INPUT_NOT_OBJECT');
  assert.match('detail' in emitted ? emitted.detail : '', /RepositoryChangedInput is declared in .* as a type alias that is not an object literal/u);
});
