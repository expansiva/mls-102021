/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/cmClient.test.ts" enhancement="_blank"/>

// d1_347 s3/s3b: in stage 2 the module no longer carries a bridge to the cm: the outbound unit does not write `CmGateway`, and the registration does not register it. The gateway of a system outside the
// platform stays. With the key of stage 2 OFF (the committed generator) the emission is the one before, byte for byte: the same outbound and the same registration.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { platformClientConnections, stage2 } from '/_102021_/l2/agentMaterializeL1/helpers/m12Stage2.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

const def = (artifactType: string, artifactId: string, data: Record<string, unknown>, dependencies: string[] = []): M1Definition => ({
  schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: 'demo', status: 'pending', data, dependencies,
}) as never;

const CATALOG = readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
const read = async (ref: string): Promise<string | null> => (ref.endsWith('/connections/cm.ts') ? CATALOG : null);

const OUTBOUND = '_102099_/l1/demo/layer_1_external/adapters/integration/outbound.ts';
const REGISTER = '_102099_/l1/demo/layer_1_external/adapters/persistence/registerRepositories.ts';
const outboundDef = () => def('integrationOutbound', 'outbound', { connections: [{ connectionId: 'cm', operationId: 'readAgent', consumer: 'readItem' }, { connectionId: 'cm', operationId: 'updateAgent', consumer: 'updateItem' }] });
const registrationDef = () => def('repositoryRegistration', 'registerRepositories', {
  adapters: [{ portId: 'CmGateway', adapterArtifactId: 'outbound' }, { portId: 'ItemRepository', adapterArtifactId: 'itemRepositoryAdapter' }],
}, ['_102099_/l1/demo/layer_1_external/adapters/integration/outbound.defs.ts', '_102099_/l1/demo/layer_1_external/adapters/persistence/itemRepositoryAdapter.defs.ts']);

async function inStage2<T>(on: boolean, run: () => Promise<T>): Promise<T> {
  const before = stage2.on;
  stage2.on = on;
  try { return await run(); } finally { stage2.on = before; }
}

void test('d1_347 s3b: the key of stage 2 is OFF in the generator as committed, and the platform client list is empty then', () => {
  assert.equal(stage2.on, false);
  assert.deepEqual(platformClientConnections(), []);
});

void test('d1_347 s3b: with the key off the outbound still writes the bridge of the cm and the registration still registers it (the emission before stage 2)', async () => {
  const outbound = await emitPersistence('persistence.integrationOutbound', outboundDef(), OUTBOUND, read);
  assert.ok('source' in outbound, JSON.stringify(outbound));
  assert.match(outbound.source, /export function createCmGateway\(/u);
  assert.match(outbound.source, /readAgent/u);
  const registration = await emitPersistence('persistence.repositoryRegistration', registrationDef(), REGISTER, async () => '');
  assert.ok('source' in registration, JSON.stringify(registration));
  assert.match(registration.source, /registerRepository\("CmGateway", ctx => createCmGateway\(ctx\), \{ module: "demo" \}\);/u);
  assert.match(registration.source, /registerRepository\("ItemRepository", ctx => createItemRepository\(ctx\), \{ module: "demo" \}\);/u);
});

void test('d1_347 s3: with the key on, an outbound whose connections are only the cm has nothing to write: a declared gap, not a failure', async () => {
  await inStage2(true, async () => {
    assert.deepEqual(platformClientConnections(), ['cm']);
    const emitted = await emitPersistence('persistence.integrationOutbound', outboundDef(), OUTBOUND, read);
    assert.ok('code' in emitted);
    assert.equal(emitted.code, 'CM_FROM_PLATFORM');
    assert.match(emitted.detail, /cm\.readAgent, cm\.updateAgent is called through the platform client/u);
  });
});

void test('d1_347 s3: with the key on, the registration leaves the CmGateway port out and keeps the others', async () => {
  await inStage2(true, async () => {
    const emitted = await emitPersistence('persistence.repositoryRegistration', registrationDef(), REGISTER, async () => '');
    assert.ok('source' in emitted, JSON.stringify(emitted));
    assert.equal(emitted.source.includes('CmGateway'), false);
    assert.match(emitted.source, /registerRepository\("ItemRepository", ctx => createItemRepository\(ctx\), \{ module: "demo" \}\);/u);
  });
});

// d1_347 s8: with the key on, the bridge and its registration stay while a unit of the module still names CmGateway; the receipt (the evidence of the unit) says so. They go when no unit names it.
interface FakeStor { files: Record<string, unknown>; getKeyToFile?: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => string }

function putUnit(folder: string, shortName: string, content: string): string {
  const stor = (globalThis as unknown as { mls: { stor: FakeStor } }).mls.stor;
  if (!stor.getKeyToFile) stor.getKeyToFile = info => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
  const key = `102099_1_${folder}/${shortName}.ts`;
  const file = { project: 102099, level: 1, folder, shortName, extension: '.ts', status: 'changed', content, getContent: async () => file.content, getValueInfo: async () => ({ content: file.content }) };
  stor.files[key] = file;
  return key;
}

void test('d1_347 s8: key on, a unit of the module still resolves CmGateway: the bridge and its registration are kept and say why; without it they go', async () => {
  await inStage2(true, async () => {
    const key = putUnit('demo/layer_2_application/usecases', 'listCmAgent', "import type { CmGateway } from '/_102099_/l1/demo/layer_1_external/adapters/integration/outbound.js';\nconst gateway = resolveRepository<CmGateway>(ctx, 'CmGateway');\n");
    const stor = (globalThis as unknown as { mls: { stor: FakeStor } }).mls.stor;
    try {
      const outbound = await emitPersistence('persistence.integrationOutbound', outboundDef(), OUTBOUND, read);
      assert.ok('source' in outbound, JSON.stringify(outbound));
      assert.match(outbound.source, /export function createCmGateway\(/u);
      assert.ok(outbound.evidences.some(item => item.id === 'cmBridgeKept' && /^CM_BRIDGE_KEPT: .*1 unit\(s\).*demo\/layer_2_application\/usecases\/listCmAgent/u.test(item.detail)), JSON.stringify(outbound.evidences));
      const registration = await emitPersistence('persistence.repositoryRegistration', registrationDef(), REGISTER, async () => '');
      assert.ok('source' in registration, JSON.stringify(registration));
      assert.match(registration.source, /registerRepository\("CmGateway", ctx => createCmGateway\(ctx\), \{ module: "demo" \}\);/u);
      assert.ok(registration.evidences.some(item => item.id === 'cmBridgeKept'));
    } finally {
      delete stor.files[key];
    }
    const gone = await emitPersistence('persistence.integrationOutbound', outboundDef(), OUTBOUND, read);
    assert.ok('code' in gone && gone.code === 'CM_FROM_PLATFORM', 'no unit names it any more: the bridge goes out');
    const registration = await emitPersistence('persistence.repositoryRegistration', registrationDef(), REGISTER, async () => '');
    assert.ok('source' in registration);
    assert.equal(registration.source.includes('CmGateway'), false);
  });
});

void test('d1_347 s8: the key off, nothing is read: the bridge stays as before and says nothing', async () => {
  const outbound = await emitPersistence('persistence.integrationOutbound', outboundDef(), OUTBOUND, read);
  assert.ok('source' in outbound && !outbound.evidences.some(item => item.id === 'cmBridgeKept'));
});
