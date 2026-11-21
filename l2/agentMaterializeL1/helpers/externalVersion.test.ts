/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/externalVersion.test.ts" enhancement="_blank"/>

// d1_276: the version of an entity kept outside is the string the catalog types it as; a conversion to a number is refused. Only where the def says so.

import assert from 'node:assert/strict';
import test from 'node:test';

import { externalVersionConversionProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { externalVersionOf, usecaseStringVersion } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

void test('d1_276: Number/parseInt/parseFloat over expectVersion or a version is refused, passing it as it is is not', () => {
  const refused = (code: string) => externalVersionConversionProblems(code).some(item => item.startsWith('VERSION_CONVERTED'));
  assert.equal(refused('const version = Number(input.expectVersion);'), true);
  assert.equal(refused('await updateAgent(request, ctx, { expectVersion: Number(input.expectVersion) });'), true);
  assert.equal(refused('const v = parseInt(input.version, 10);'), true);
  assert.equal(refused('const v = Number(current.version);'), true);
  // d1_277: the `Number.isInteger` family and a `typeof … number` check over `expectVersion` (the activate); over `version` they are the module's own number.
  assert.equal(refused("if (!Number.isInteger(input.expectVersion) || input.expectVersion < 0) throw new Error('x');"), true);
  assert.equal(refused("if (typeof input.expectVersion !== 'number') throw new Error('x');"), true);
  assert.equal(refused("if (!Number.isInteger(input.version) || input.version < 1) throw new Error('x');"), false);
  assert.equal(refused("if (typeof input.expectVersion !== 'string' || !input.expectVersion) throw new Error('x');"), false);
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

// d1_277: the version of a connection is one. `activate` is a usecase of the module's draft that also calls activateAgent, whose answer carries no version.
void test('d1_277: a usecase of the module that consumes a call whose catalog types the version as a string takes a string version', async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
  const cm = readFileSync(path.join(root, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
  const outbound = { definition: { artifactType: 'integrationOutbound', artifactId: 'outbound', moduleName: 'agents', dependencies: [], data: { connections: [
    { connectionId: 'cm', operationId: 'activateAgent', consumer: 'activate' },
    { connectionId: 'cm', operationId: 'listCmTools', consumer: 'rebuild' },
  ] } }, unitId: 'outbound' };
  const unit = (id: string) => ({ definition: { artifactType: 'usecase', artifactId: id, moduleName: 'agents', dependencies: [], data: { usecaseId: id, entityId: 'AgentDraft', operation: 'transition' } }, unitId: id }) as never;
  const ctx = { run: { project: 102099, module: 'agents' }, units: [outbound], read: async (ref: string) => (ref.replace(/^\//u, '') === '_102034_/l2/shared/contracts/connections/cm.ts' ? cm : null) } as never;
  assert.equal(await usecaseStringVersion(ctx, unit('activate')), true, 'activateAgent expects a version and the catalog types the versions as string');
  assert.equal(await usecaseStringVersion(ctx, unit('rebuild')), false, 'listCmTools expects no version');
  assert.equal(await usecaseStringVersion(ctx, unit('other')), false, 'a usecase with no call');
});

