/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/catalogImport.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogImportPath } from '/_102020_/l2/helpers/connections/catalogPath.js';
import { isCatalogImport } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';

void test('d1_223: the import of the types of a platform catalog is the single path of the helper, whatever the id', () => {
  assert.equal(isCatalogImport(catalogImportPath('cm')), true);
  assert.equal(isCatalogImport(catalogImportPath('anotherSystem')), true);
});

void test('d1_223: no other file of the runtime passes as a catalog import', () => {
  for (const refused of [
    '/_102034_/l2/shared/contracts/connections/Cm.js',
    '/_102034_/l2/shared/contracts/other/cm.js',
    '/_102034_/l2/shared/contracts/connections/nested/cm.js',
    '/_102034_/l2/shared/contracts/connections/../cm.js',
    `/_102034_/l1/server/layer_1_external/connections/${'catalogs'}/cm.js`, // the path before the move: no longer a catalog import
    '/_102047_/l2/shared/contracts/connections/cm.js',
    '/_102034_/l2/shared/contracts/connections/cm.ts',
    '',
  ]) assert.equal(isCatalogImport(refused), false, refused);
});
