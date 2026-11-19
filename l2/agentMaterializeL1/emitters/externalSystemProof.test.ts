/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/externalSystemProof.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { emitController } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { catalogOperations } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { connectionCatalogSource } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../../..');
const PROJECT = 102099;
// Copies of the l4_p4_117 s5 rehearsal (mls-102035@7c91b5e): the module that declares a system, and the module that uses a sibling's.
const FIXTURES = path.join(HERE, '../../helpers/connections/fixtures');
const OWN_L4 = readFileSync(path.join(FIXTURES, 'repoInsideModule.integration.recorded.txt'), 'utf8');
const SIBLING_L4 = readFileSync(path.join(FIXTURES, 'integrationModule.integration.recorded.txt'), 'utf8');
// A declaration written by hand from the L4 (the phase answer the d1_208 s2 gate accepts).
const OWN_DECLARATION = readFileSync(path.join(HERE, '../steps/external15/fixtures/repoHostDeclaration.recorded.txt'), 'utf8');
const CM_SOURCE = readFileSync(path.join(ROOT, 'mls-102034/l1/server/layer_1_external/connections/catalogs/cm.ts'), 'utf8');
const SIBLING_DECLARATION = [
  '/// <mls fileReference="_102099_/l1/integrations/layer_1_external/connections/zipLookup.ts" enhancement="_blank"/>',
  "import type { ExternalSystemDeclaration } from '/_102034_/l1/server/layer_1_external/connections/external/types.js';",
  'export interface ZipFindAddressInput { zipCode: string }',
  'export interface ZipFindAddressOutput { street: string; city: string }',
  'export interface ZipAddressFoundInput { zipCode: string; street: string }',
  'export interface ZipAddressFoundOutput { accepted: boolean }',
  'const declaration: ExternalSystemDeclaration =',
  JSON.stringify({
    schemaVersion: 'external-system-v1', systemId: 'zipLookup', title: 'Zip lookup', description: 'A public service.',
    hosts: [{ host: 'lookup.example.test' }], settings: [],
    operations: [
      { operationId: 'findAddress', direction: 'call', kind: 'query', description: 'The address of one zip code.', inputType: 'ZipFindAddressInput', outputType: 'ZipFindAddressOutput', methods: ['GET'], uses: { settings: [], secrets: [] }, reply: 'now' },
      { operationId: 'addressFound', direction: 'serve', kind: 'command', description: 'The service sends an address it found.', inputType: 'ZipAddressFoundInput', outputType: 'ZipAddressFoundOutput' },
    ],
  }, null, 2) + ';',
  'export default declaration;',
  '',
].join('\n');

const OWN_MODULE = 'codeReview';
const SIBLING_MODULE = 'integrations';
const USER_MODULE = 'customers';
const REGISTRY = `export const solutionRegistry = ${JSON.stringify({ modules: [{ moduleName: OWN_MODULE }, { moduleName: SIBLING_MODULE }, { moduleName: USER_MODULE }] })} as const;\n`;
const norm = (ref: string) => ref.replace(/^\//u, '');

function filesOf(extra: Record<string, string> = {}): (ref: string) => Promise<string | null> {
  const files: Record<string, string> = {
    '_102034_/l1/server/layer_1_external/connections/catalogs/cm.ts': CM_SOURCE,
    [`_${PROJECT}_/l4/organization/registry.defs.ts`]: REGISTRY,
    [`_${PROJECT}_/l4/${OWN_MODULE}/integration.defs.ts`]: OWN_L4,
    [`_${PROJECT}_/l4/${SIBLING_MODULE}/integration.defs.ts`]: SIBLING_L4,
    [`_${PROJECT}_/l1/${OWN_MODULE}/layer_1_external/connections/repoHost.ts`]: OWN_DECLARATION,
    ...extra,
  };
  return async ref => files[norm(ref)] ?? null;
}

function envelope(moduleName: string, definition: Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, moduleName, status: 'pending', ...definition };
}

function outboundOf(moduleName: string, connections: Array<Record<string, unknown>>): M1Definition {
  return envelope(moduleName, { artifactType: 'integrationOutbound', artifactId: 'outbound', dependencies: [], data: { integrationId: 'outbound', events: [], connections } });
}

const outputOf = (moduleName: string) => `_${PROJECT}_/l1/${moduleName}/layer_1_external/adapters/integration/outbound.ts`;

void test('d1_208 s3: the catalog source of a connection is the platform file, then the declaration of this module, then a sibling declaration', async () => {
  const read = filesOf({ [`_${PROJECT}_/l1/${SIBLING_MODULE}/layer_1_external/connections/zipLookup.ts`]: SIBLING_DECLARATION });
  const platform = await connectionCatalogSource(read, PROJECT, OWN_MODULE, 'cm');
  assert.deepEqual([platform.origin, platform.importPath, platform.problem], ['platform', '/_102034_/l1/server/layer_1_external/connections/catalogs/cm.js', undefined]);
  assert.equal(platform.source, CM_SOURCE);
  const own = await connectionCatalogSource(read, PROJECT, OWN_MODULE, 'repoHost');
  assert.deepEqual([own.origin, own.importPath, own.problem], ['own', `/_${PROJECT}_/l1/${OWN_MODULE}/layer_1_external/connections/repoHost.js`, undefined]);
  assert.equal(own.source, OWN_DECLARATION);
  const sibling = await connectionCatalogSource(read, PROJECT, USER_MODULE, 'zipLookup');
  assert.deepEqual([sibling.origin, sibling.importPath, sibling.problem], ['sibling', `/_${PROJECT}_/l1/${SIBLING_MODULE}/layer_1_external/connections/zipLookup.js`, undefined]);
  const unknown = await connectionCatalogSource(read, PROJECT, USER_MODULE, 'nowhere');
  assert.deepEqual([unknown.origin, unknown.source, unknown.problem], ['platform', null, undefined], 'an id nobody owns keeps the refusal it always had');
});

void test('d1_208 s3: a declaration that is not generated is a distinct refusal that names the module to generate first', async () => {
  const sibling = await connectionCatalogSource(filesOf(), PROJECT, USER_MODULE, 'zipLookup');
  assert.equal(sibling.source, null);
  assert.equal(sibling.problem?.code, 'SIBLING_DECLARATION_MISSING');
  assert.match(sibling.problem?.detail ?? '', /Generate module integrations first/u);
  const own = await connectionCatalogSource(filesOf({ [`_${PROJECT}_/l1/${OWN_MODULE}/layer_1_external/connections/repoHost.ts`]: '' }), PROJECT, OWN_MODULE, 'repoHost');
  assert.equal(own.source, '');
  const absent = filesOf();
  const lost = await connectionCatalogSource(async ref => (norm(ref).endsWith('/repoHost.ts') ? null : absent(ref)), PROJECT, OWN_MODULE, 'repoHost');
  assert.equal(lost.problem?.code, 'DECLARATION_NOT_GENERATED');
});

void test('d1_208 s3: the catalog readers read a declaration: operations with kind and types, a call answers now', () => {
  const operations = catalogOperations(OWN_DECLARATION);
  assert.ok(operations);
  assert.deepEqual(operations.map(item => [item.operationId, item.direction, item.kind, item.inputType, item.outputType, item.reply]), [
    ['listChanges', 'call', 'query', 'RepoHostListChangesInput', 'RepoHostListChangesOutput', 'now'],
    ['changePushed', 'serve', 'command', 'RepoHostChangePushedInput', 'RepoHostChangePushedOutput', ''],
  ]);
});

void test('d1_208 s3: the gateway of a call to a system of this module imports its types from the generated declaration', async () => {
  const outbound = await emitPersistence('persistence.integrationOutbound', outboundOf(OWN_MODULE, [
    { connectionId: 'repoHost', operationId: 'listChanges', consumer: 'listChanges', entityRefs: ['Change'], effect: 'list' },
  ]), outputOf(OWN_MODULE), filesOf());
  assert.equal('code' in outbound, false, JSON.stringify(outbound));
  if ('code' in outbound) return;
  assert.match(outbound.source, new RegExp(`import type \\{ RepoHostListChangesInput, RepoHostListChangesOutput \\} from '/_${PROJECT}_/l1/${OWN_MODULE}/layer_1_external/connections/repoHost\\.js';`, 'u'));
  assert.match(outbound.source, /export interface RepoHostGateway/u);
  assert.match(outbound.source, /listChanges\(input: RepoHostListChangesInput, ctx: RequestContext/u);
  assert.match(outbound.source, /callConnection\("repoHost", "listChanges"/u);
  assert.equal(outbound.source.includes('/_102034_/l1/server/layer_1_external/connections/catalogs/repoHost'), false, 'not a platform catalog');
});

void test('d1_208 s3: the same call to the system a sibling declares takes the types of the sibling declaration', async () => {
  const read = filesOf({ [`_${PROJECT}_/l1/${SIBLING_MODULE}/layer_1_external/connections/zipLookup.ts`]: SIBLING_DECLARATION });
  const outbound = await emitPersistence('persistence.integrationOutbound', outboundOf(USER_MODULE, [
    { connectionId: 'zipLookup', operationId: 'findAddress', consumer: 'findAddress' },
  ]), outputOf(USER_MODULE), read);
  assert.equal('code' in outbound, false, JSON.stringify(outbound));
  if ('code' in outbound) return;
  assert.match(outbound.source, new RegExp(`import type \\{ ZipFindAddressInput, ZipFindAddressOutput \\} from '/_${PROJECT}_/l1/${SIBLING_MODULE}/layer_1_external/connections/zipLookup\\.js';`, 'u'));
  assert.match(outbound.source, /export interface ZipLookupGateway/u);
  assert.match(outbound.source, /callConnection\("zipLookup", "findAddress"/u);
  // Without the sibling declaration the gateway is not written, and the refusal names the module.
  const refused = await emitPersistence('persistence.integrationOutbound', outboundOf(USER_MODULE, [
    { connectionId: 'zipLookup', operationId: 'findAddress', consumer: 'findAddress' },
  ]), outputOf(USER_MODULE), filesOf());
  assert.equal('code' in refused ? refused.code : '', 'SIBLING_DECLARATION_MISSING');
  assert.match('detail' in refused ? refused.detail : '', /integrations/u);
});

void test('d1_208 s3: the controller of a serve of a system of this module takes the types of the declaration', async () => {
  const serviceRef = `_${PROJECT}_/l1/${OWN_MODULE}/layer_2_application/requests/repoHost.defs.ts`;
  const scopeRef = `_${PROJECT}_/l1/${OWN_MODULE}/layer_2_application/access/accessScope.defs.ts`;
  const authorityRef = `_${PROJECT}_/l1/${OWN_MODULE}/layer_2_application/access/authorityMap.defs.ts`;
  const service = `export const definition = ${JSON.stringify(envelope(OWN_MODULE, {
    artifactType: 'requestService', artifactId: 'repoHost', dependencies: [],
    data: { pageId: 'repoHost', requests: [{ route: `${OWN_MODULE}.repoHost.changePushed`, serves: 'repoHost.changePushed', serviceFunction: 'changePushed', uses: [] }] },
  }))} as const;\n`;
  const base = filesOf({
    [serviceRef]: service,
    [scopeRef]: 'export const definition = {"dependencies":[],"data":{}} as const;\n',
    [authorityRef]: 'export const definition = {"dependencies":[],"data":{}} as const;\n',
  });
  const controller = await emitController(envelope(OWN_MODULE, {
    artifactType: 'httpController', artifactId: 'repoHost', dependencies: [scopeRef, authorityRef, serviceRef],
    data: { pageId: 'repoHost', handlers: [{ route: `${OWN_MODULE}.repoHost.changePushed`, serviceFunction: 'changePushed', grantIds: ['connection_repoHost'] }] },
  }), 'repoHost.ts', base);
  assert.equal('code' in controller, false, JSON.stringify(controller));
  if ('code' in controller) return;
  assert.match(controller.source, /RepoHostChangePushedInput/u);
  assert.match(controller.source, new RegExp(`/_${PROJECT}_/l1/${OWN_MODULE}/layer_1_external/connections/repoHost\\.js`, 'u'));
});
