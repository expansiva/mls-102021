/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/externalVersion.test.ts" enhancement="_blank"/>

// d1_276: the version of an entity kept outside is the string the catalog types it as; a conversion to a number is refused. Only where the def says so.

import assert from 'node:assert/strict';
import test from 'node:test';

import { externalVersionConversionProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { externalVersionOf } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

void test('d1_276: Number/parseInt/parseFloat over expectVersion or a version is refused, passing it as it is is not', () => {
  const refused = (code: string) => externalVersionConversionProblems(code).some(item => item.startsWith('VERSION_CONVERTED'));
  assert.equal(refused('const version = Number(input.expectVersion);'), true);
  assert.equal(refused('await updateAgent(request, ctx, { expectVersion: Number(input.expectVersion) });'), true);
  assert.equal(refused('const v = parseInt(input.version, 10);'), true);
  assert.equal(refused('const v = Number(current.version);'), true);
  assert.equal(refused('await updateAgent(request, ctx, { expectVersion: input.expectVersion });'), false);
  assert.equal(refused('const page = Number(input.page); const size = Number(input.pageSize);'), false);
  assert.equal(refused('// Number(input.expectVersion)\nconst a = 1;'), false);
});

void test('d1_276: the unit reads the version type the def gives its outside call', () => {
  const unit = (data: Record<string, unknown>) => ({ definition: { artifactType: 'usecase', artifactId: 'u', data } }) as never;
  assert.equal(externalVersionOf(unit({ externalCall: { expectsVersion: true, versionType: 'string' } })), 'string');
  assert.equal(externalVersionOf(unit({ externalCall: { expectsVersion: true, versionType: 'number' } })), 'number');
  assert.equal(externalVersionOf(unit({ externalCall: { expectsVersion: false } })), '');
  assert.equal(externalVersionOf(unit({})), '');
});
