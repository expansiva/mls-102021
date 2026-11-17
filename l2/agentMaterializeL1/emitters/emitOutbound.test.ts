/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitOutbound.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import type { StructureRead } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { outbound } from '/_102021_/l2/agentMaterializeL1/fixtures/cases.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/emitters/registry.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { CONNECTION_CODES, createFakeCallConnection } from '/_102034_/testing/connections/connectionFixtures.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const CM_DEFS = '/_102034_/l4/ontology/connections/cm.defs.ts';
const CM_SOURCE = readFileSync(path.join(ROOT, 'mls-102034/l4/ontology/connections/cm.defs.ts'), 'utf8');
const STATUS: Record<string, number> = {
  not_found: 404, disabled: 409, unavailable: 503, conflict: 409, refused: 422, forbidden: 403, invalid: 400,
};

const readCatalog: StructureRead = async ref => ref === CM_DEFS ? CM_SOURCE : null;

function definition(connections: unknown[], events: unknown[] = []): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'integrationOutbound',
    artifactId: 'outbound',
    moduleName: 'agents',
    status: 'pending',
    dependencies: [],
    data: { integrationId: 'outbound', events, connections },
  };
}

const CONNECTIONS = [
  { connectionId: 'cm', operationId: 'simulateAgent', consumer: 'simulate' },
  { connectionId: 'cm', operationId: 'readAgent', consumer: 'read' },
];

test('implement handler of integrationOutbound asks for the request context', () => {
  const handler = handlerFor('integrationOutbound', 'implement');
  assert.equal(handler?.id, 'implement.integrationOutbound');
  assert.deepEqual(handler?.capabilities, ['requestContext']);
});

test('a def with only unbound events keeps the gap and writes nothing', async () => {
  const emitted = await emitPersistence('persistence.integrationOutbound', outbound, 'outbound.ts', readCatalog);
  assert.equal('code' in emitted && emitted.code, 'MECHANISM_UNBOUND');
});

test('cm.readAgent and cm.simulateAgent become one gateway whose file compiles against the catalog', async () => {
  const emitted = await emitPersistence('persistence.integrationOutbound', definition(CONNECTIONS, [
    { eventId: 'buoyChecked', mechanism: '' },
  ]), '_102099_/l1/agents/layer_1_external/adapters/integration/outbound.ts', readCatalog);
  assert.equal('code' in emitted, false);
  if ('code' in emitted) return;
  assert.match(emitted.source, /import type \{ CmReadAgentInput, CmReadAgentOutput, CmSimulateAgentInput, CmSimulateAgentOutput \} from '\/_102034_\/l4\/ontology\/connections\/cm\.defs\.js'/);
  assert.match(emitted.source, /export interface CmGateway \{/);
  assert.match(emitted.source, /readAgent\(input: CmReadAgentInput, ctx: RequestContext, opts\?: CallConnectionOptions\): Promise<CmReadAgentOutput>/);
  assert.match(emitted.source, /simulateAgent\(input: CmSimulateAgentInput, ctx: RequestContext, opts\?: CallConnectionOptions\): Promise<CmSimulateAgentOutput>/);
  assert.equal(emitted.evidences.some(item => !item.passed && item.detail.startsWith('MECHANISM_UNBOUND')), true);
  const fake = createFakeCallConnection({
    'cm.readAgent': { output: { agentId: 'a' } },
    'cm.simulateAgent': { code: 'conflict', message: 'stale' },
  });
  const loaded = await loadEmitted(emitted.source, fake);
  const ctx = { sessionContext: { person: { mdmId: 'person-1' } } } as RequestContext;
  const gateway = loaded.createCmGateway(ctx);
  await gateway.readAgent({ agentId: 'a' }, ctx, { idempotencyKey: 'same', expectVersion: 3 });
  assert.equal(fake.calls[0]?.opts && (fake.calls[0].opts as { idempotencyKey?: string }).idempotencyKey, 'same');
  assert.equal((fake.calls[0]?.context as { actorMdmId?: string }).actorMdmId, 'person-1');
  assert.equal((fake.calls[0]?.context as { organizationId?: string }).organizationId, undefined);
  await assert.rejects(gateway.simulateAgent({ agentId: 'a', level: 'canDo' }, ctx), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, 'conflict');
    assert.equal(error.statusCode, 409);
    assert.equal(error.message, 'stale');
    return true;
  });
});

test('each connector code keeps the status of the table', async () => {
  const emitted = await emitPersistence('persistence.integrationOutbound', definition([
    { connectionId: 'cm', operationId: 'readAgent', consumer: 'read' },
  ]), 'outbound.ts', readCatalog);
  assert.equal('code' in emitted, false);
  if ('code' in emitted) return;
  const ctx = { sessionContext: { person: { mdmId: 'person-1' } } } as RequestContext;
  for (const code of CONNECTION_CODES) {
    const fake = createFakeCallConnection({ 'cm.readAgent': { code, message: code } });
    const loaded = await loadEmitted(emitted.source, fake);
    await assert.rejects(loaded.createCmGateway(ctx).readAgent({ agentId: 'a' }, ctx), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, code);
      assert.equal(error.statusCode, STATUS[code]);
      return true;
    });
  }
});

/** Loads the emitted file. This runner has no `mock.module`, so only the connector import is pointed at the fake. */
async function loadEmitted(source: string, fake: ReturnType<typeof createFakeCallConnection>): Promise<{ createCmGateway: (ctx: RequestContext) => { readAgent: Function; simulateAgent: Function } }> {
  const dir = mkdtempSync(path.join(ROOT, '.outbound-proof-'));
  const connector = '/_102034_/l1/server/layer_1_external/connections/callConnection.js';
  writeFileSync(path.join(dir, 'outboundFake.ts'), `export async function callConnection(...args) { return globalThis.__outboundProof(...args); }\n`);
  writeFileSync(path.join(dir, 'outbound.ts'), source.replace(`from '${connector}'`, `from './outboundFake.js'`));
  (globalThis as { __outboundProof?: typeof fake }).__outboundProof = fake;
  try {
    return await import(pathToFileURL(path.join(dir, 'outbound.ts')).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
