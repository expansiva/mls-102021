/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/cmClient.test.ts" enhancement="_blank"/>

// d1_347 s3: the module no longer carries a bridge to the cm: the outbound unit does not write `CmGateway`, and the registration does not register it. The gateway of a system outside the platform stays.

import assert from 'node:assert/strict';
import test from 'node:test';

import { PLATFORM_CLIENT_CONNECTIONS, emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

const def = (artifactType: string, artifactId: string, data: Record<string, unknown>, dependencies: string[] = []): M1Definition => ({
  schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: 'demo', status: 'pending', data, dependencies,
}) as never;

void test('d1_347 s3: the platform client list holds the cm', () => {
  assert.deepEqual(PLATFORM_CLIENT_CONNECTIONS, ['cm']);
});

void test('d1_347 s3: an outbound whose connections are only the cm has nothing to write: a declared gap, not a failure', async () => {
  const outbound = def('integrationOutbound', 'outbound', { connections: [{ connectionId: 'cm', operationId: 'readAgent', consumer: 'readItem' }, { connectionId: 'cm', operationId: 'updateAgent', consumer: 'updateItem' }] });
  const emitted = await emitPersistence('persistence.integrationOutbound', outbound, '_102099_/l1/demo/layer_1_external/adapters/integration/outbound.ts', async () => null);
  assert.ok('code' in emitted);
  assert.equal(emitted.code, 'CM_FROM_PLATFORM');
  assert.match(emitted.detail, /cm\.readAgent, cm\.updateAgent is called through the platform client/u);
});

void test('d1_347 s3: the registration leaves the CmGateway port out and keeps the others', async () => {
  const registration = def('repositoryRegistration', 'registerRepositories', {
    adapters: [{ portId: 'CmGateway', adapterArtifactId: 'outbound' }, { portId: 'ItemRepository', adapterArtifactId: 'itemRepositoryAdapter' }],
  }, ['_102099_/l1/demo/layer_1_external/adapters/integration/outbound.defs.ts', '_102099_/l1/demo/layer_1_external/adapters/persistence/itemRepositoryAdapter.defs.ts']);
  const emitted = await emitPersistence('persistence.repositoryRegistration', registration, '_102099_/l1/demo/layer_1_external/adapters/persistence/registerRepositories.ts', async () => '');
  assert.ok('source' in emitted, JSON.stringify(emitted));
  assert.equal(emitted.source.includes('CmGateway'), false);
  assert.match(emitted.source, /registerRepository\("ItemRepository", ctx => createItemRepository\(ctx\), \{ module: "demo" \}\);/u);
});
