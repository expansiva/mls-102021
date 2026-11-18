/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitOutbound.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const TSC = path.join(ROOT, 'node_modules', '.bin', 'tsc');
const CM_DEFS = '/_102034_/l1/server/layer_1_external/connections/catalogs/cm.ts';
const CM_SOURCE = readFileSync(path.join(ROOT, 'mls-102034/l1/server/layer_1_external/connections/catalogs/cm.ts'), 'utf8');
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
  assert.match(emitted.source, /import type \{ CmReadAgentInput, CmReadAgentOutput, CmSimulateAgentInput, CmSimulateAgentOutput \} from '\/_102034_\/l1\/server\/layer_1_external\/connections\/catalogs\/cm\.js'/);
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

test('updateAgent requires expectVersion and readAgent stays unchanged', async () => {
  const emitted = await emitPersistence('persistence.integrationOutbound', definition([
    { connectionId: 'cm', operationId: 'updateAgent', consumer: 'update' },
    { connectionId: 'cm', operationId: 'readAgent', consumer: 'read' },
  ]), '_102099_/l1/agents/layer_1_external/adapters/integration/outbound.ts', readCatalog);
  assert.equal('code' in emitted, false);
  if ('code' in emitted) return;
  const readBody = emitted.source.split('async readAgent')[1]?.split('async updateAgent')[0] ?? '';
  assert.equal(readBody.includes('expectVersion'), false);
  assert.match(readBody, /callConnection\("cm", "readAgent", input, \{ actorMdmId: ctx\.sessionContext\.person\?\.mdmId \}, opts\)/);
  assert.match(emitted.source, /if \(opts\?\.expectVersion === undefined\) throw new AppError\('invalid', "updateAgent requires expectVersion\.", 400\)/);
  const types = checkTypes(emitted.source);
  assert.equal(types.clean, '');
  assert.match(types.injected, /error TS/);
  const fake = createFakeCallConnection({
    'cm.updateAgent': { output: { version: '2', changeId: 'c' } },
    'cm.readAgent': { output: { agentId: 'a' } },
  });
  const loaded = await loadEmitted(emitted.source, fake);
  const ctx = { sessionContext: { person: { mdmId: 'person-1' } } } as RequestContext;
  await assert.rejects(loaded.createCmGateway(ctx).updateAgent({ agentId: 'a' }, ctx), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, 'invalid');
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /updateAgent/);
    return true;
  });
  assert.equal(fake.calls.length, 0);
  await loaded.createCmGateway(ctx).updateAgent({ agentId: 'a', name: 'nora' }, ctx, { expectVersion: 'v1' });
  assert.equal(fake.calls.length, 1);
  assert.equal((fake.calls[0]?.opts as { expectVersion?: string }).expectVersion, 'v1');
  assert.equal('expectVersion' in (fake.calls[0]?.input as object), false);
  await loaded.createCmGateway(ctx).readAgent({ agentId: 'a' }, ctx);
  assert.equal((fake.calls[1]?.opts as { expectVersion?: unknown } | undefined)?.expectVersion, undefined);
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

function checkTypes(source: string): { clean: string; injected: string } {
  const dir = mkdtempSync(path.join(ROOT, '.outbound-proof-'));
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    extends: '../tsconfig.base.json',
    compilerOptions: { noEmit: true, skipLibCheck: true },
    files: ['outbound.ts'],
  }));
  writeFileSync(path.join(dir, 'outbound.ts'), source);
  const clean = tsc(dir);
  writeFileSync(path.join(dir, 'outbound.ts'), `${source}\nconst _injected: CmUpdateAgentInput = { agentId: 1 };\n`);
  const injected = tsc(dir);
  rmSync(dir, { recursive: true, force: true });
  return { clean, injected };
}

function tsc(dir: string): string {
  try {
    execFileSync(TSC, ['--pretty', 'false', '-p', path.join(dir, 'tsconfig.json')], { cwd: ROOT, encoding: 'utf8' });
    return '';
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string };
    return `${failed.stdout ?? ''}${failed.stderr ?? ''}`;
  }
}

/** Loads the emitted file. This runner has no `mock.module`, so only the connector import is pointed at the fake. */
async function loadEmitted(source: string, fake: ReturnType<typeof createFakeCallConnection>): Promise<{ createCmGateway: (ctx: RequestContext) => { readAgent: Function; simulateAgent: Function; updateAgent: Function } }> {
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
