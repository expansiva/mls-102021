/// <mls fileReference="_102021_/l2/helpers/connections/catalogResolve.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  declarationDefPath,
  declarationFilePath,
  declarationImportPath,
  declarationRef,
  declaredSystemsOf,
  resolveConnection,
  siblingDeclarationMissing,
  siblingModuleNames,
  type ConnectionScope,
} from '/_102021_/l2/helpers/connections/catalogResolve.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';

const DIR = path.dirname(new URL(import.meta.url).pathname);
// Copies of the l4_p4_117 s5 rehearsal (mls-102035@7c91b5e): the three cases of an outside system.
const load = (name: string): unknown => parseD1Source(readFileSync(path.join(DIR, `fixtures/${name}.integration.recorded.txt`), 'utf8'), 'defs');

void test('d1_208: the systems a module declares are read from its L4, with only what the L4 says', () => {
  const systems = declaredSystemsOf(load('repoInsideModule'));
  assert.equal(systems.length, 1);
  assert.equal(systems[0].id, 'repoHost');
  assert.deepEqual(systems[0].settings.map(item => [item.id, item.secret]), [['repositoryAddress', false], ['accessKey', true]]);
  assert.deepEqual(systems[0].operations.map(item => [item.operationId, item.direction]), [['listChanges', 'call'], ['changePushed', 'serve']]);
  assert.deepEqual(declaredSystemsOf(load('usesSiblingSystem')), [], 'a v3 artifact has no externalSystems');
  assert.deepEqual(declaredSystemsOf(null), []);
});

void test('d1_208: a connection resolves on the platform, then in this module, then in a sibling; nothing else is known', () => {
  const own = declaredSystemsOf(load('repoInsideModule'));
  const sibling = declaredSystemsOf(load('integrationModule'));
  const scope: ConnectionScope = { moduleName: 'codeReview', own, siblings: [{ moduleName: 'integrations', systems: sibling }] };
  assert.equal(resolveConnection('cm', scope, true).origin, 'platform');
  assert.equal(resolveConnection('repoHost', scope, false).origin, 'own');
  const found = resolveConnection('zipLookup', scope, false);
  assert.equal(found.origin, 'sibling');
  assert.equal(found.origin === 'sibling' ? found.moduleName : '', 'integrations');
  assert.equal(resolveConnection('nowhere', scope, false).origin, 'unknown');
  // The platform file wins: a declared system never shadows it.
  const shadow: ConnectionScope = { moduleName: 'codeReview', own: [{ ...own[0], id: 'cm' }], siblings: [] };
  assert.equal(resolveConnection('cm', shadow, true).origin, 'platform');
});

void test('d1_208: the declaration of a system is at the path the platform reads by the systemId, and a sibling without one is named', () => {
  assert.equal(declarationDefPath('codeReview', 'repoHost'), 'l1/codeReview/layer_1_external/connections/repoHost.defs.ts');
  assert.equal(declarationFilePath('codeReview', 'repoHost'), 'l1/codeReview/layer_1_external/connections/repoHost.ts');
  assert.equal(declarationRef(102047, 'codeReview', 'repoHost'), '_102047_/l1/codeReview/layer_1_external/connections/repoHost.ts');
  assert.equal(declarationImportPath(102047, 'integrations', 'zipLookup'), '/_102047_/l1/integrations/layer_1_external/connections/zipLookup.js');
  const message = siblingDeclarationMissing('zipLookup', 'integrations');
  assert.match(message, /Generate module integrations first/u);
  assert.equal(message.includes('catalog'), false, 'never the generic missing catalog');
});

void test('d1_208: the siblings are the modules of the project registry, minus this one', () => {
  const registry = { modules: [{ moduleName: 'customers' }, { moduleName: 'integrations' }, { moduleName: 'codeReview' }, { moduleName: 'customers' }] };
  assert.deepEqual(siblingModuleNames(registry, 'customers'), ['codeReview', 'integrations']);
  assert.deepEqual(siblingModuleNames(null, 'customers'), []);
  assert.deepEqual(siblingModuleNames({}, 'customers'), []);
});
