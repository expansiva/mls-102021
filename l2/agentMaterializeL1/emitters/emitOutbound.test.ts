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
import { recordedModuleEvents } from '/_102034_/testing/events/eventFixtures.js';
import { CONNECTION_CODES, createFakeCallConnection } from '/_102034_/testing/connections/connectionFixtures.js';
import { MODULE_EVENT_PUBLISH } from '/_102021_/l2/helpers/l1Defs/moduleEvent.js';


const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const TSC = path.join(ROOT, 'node_modules', '.bin', 'tsc');
const CM_DEFS = '/_102034_/l2/shared/contracts/connections/cm.ts';
const CM_SOURCE = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
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
  assert.match(emitted.source, /import type \{ CmReadAgentInput, CmReadAgentOutput, CmSimulateAgentInput, CmSimulateAgentOutput \} from '\/_102034_\/l2\/shared\/contracts\/connections\/cm\.js'/);
  assert.match(emitted.source, /export interface CmGateway \{/);
  assert.match(emitted.source, /readAgent\(input: CmReadAgentInput, ctx: RequestContext, opts\?: CallConnectionOptions, context\?: GatewayCallContext\): Promise<CmReadAgentOutput>/);
  assert.match(emitted.source, /simulateAgent\(input: CmSimulateAgentInput, ctx: RequestContext, opts\?: CallConnectionOptions, context\?: GatewayCallContext\): Promise<CmSimulateAgentOutput>/);
  assert.equal(emitted.evidences.some(item => !item.passed && item.detail.startsWith('MECHANISM_UNBOUND')), true);
  const fake = createFakeCallConnection({
    'cm.readAgent': { output: { agentId: 'a' } },
    'cm.simulateAgent': { code: 'conflict', message: 'stale' },
  });
  const loaded = await loadEmitted(emitted.source, fake);
  const ctx = { sessionContext: { person: { mdmId: 'person-1' } } } as RequestContext;
  const gateway = loaded.createCmGateway(ctx);
  await gateway.readAgent({ agentId: 'a' }, ctx, { idempotencyKey: 'same', expectVersion: 3 }, { agentId: 'ag-1' });
  assert.equal(fake.calls[0]?.opts && (fake.calls[0].opts as { idempotencyKey?: string }).idempotencyKey, 'same');
  assert.equal((fake.calls[0]?.context as { actorMdmId?: string }).actorMdmId, 'person-1');
  assert.equal((fake.calls[0]?.context as { agentId?: string }).agentId, 'ag-1');
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
  // d1_214: the options go merged with the id of the request; a read still has no expectVersion.
  assert.match(readBody, /callConnection\("cm", "readAgent", input, \{ \.\.\.context, actorMdmId: ctx\.sessionContext\.person\?\.mdmId \}, callOptions\)/);
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

const REPO_HOST_DECLARATION = readFileSync(path.join(ROOT, 'mls-102021/l2/agentMaterializeL1/steps/external15/fixtures/repoHostDeclaration.recorded.txt'), 'utf8');
const REPO_HOST_L4 = readFileSync(path.join(ROOT, 'mls-102021/l2/helpers/connections/fixtures/repoInsideModule.integration.recorded.txt'), 'utf8');
const REPO_HOST_FILES: Record<string, string> = {
  '_102047_/l4/repoHost/integration.defs.ts': REPO_HOST_L4,
  '_102047_/l1/repoHost/layer_1_external/connections/repoHost.ts': REPO_HOST_DECLARATION,
};

test('d1_241: repoHost outbound puts missing on AppError when the call is disabled', async () => {
  const output = '_102047_/l1/repoHost/layer_1_external/adapters/integration/outbound.ts';
  const emitted = await emitPersistence('persistence.integrationOutbound', {
    ...definition([{ connectionId: 'repoHost', operationId: 'listChanges', consumer: 'listChanges' }]),
    moduleName: 'repoHost',
  }, output, async ref => REPO_HOST_FILES[ref.replace(/^\//u, '')] ?? null);
  assert.equal('code' in emitted, false, JSON.stringify(emitted));
  if ('code' in emitted) return;
  assert.match(emitted.source, /result\.code === 'disabled' && result\.missing \? \{ missing: result\.missing \} : undefined/);
  const disabled = await loadGateway(emitted.source, "{ ok: false, code: 'disabled', message: 'repositorio is not configured', missing: ['repositorio'] }");
  const ctx = { sessionContext: { person: { mdmId: 'person-1' } } } as RequestContext;
  await assert.rejects(disabled.createRepoHostGateway(ctx).listChanges({}, ctx), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, 'disabled');
    assert.equal(error.statusCode, 409);
    assert.deepEqual(error.details, { missing: ['repositorio'] });
    return true;
  });
  const bare = await loadGateway(emitted.source, "{ ok: false, code: 'disabled', message: 'repositorio is not configured' }");
  await assert.rejects(bare.createRepoHostGateway(ctx).listChanges({}, ctx), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.details, undefined);
    return true;
  });
  // The proof that the emitted file compiles in the app tree wrote into the live bench; it was run once and not kept (d1_241 Andamento).
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

// d1_216 s2: an event the def binds to the platform publisher gets one publisher function, written by code.
const EVENT_OUTPUT = '_102099_/l1/repoHost/layer_1_external/adapters/integration/outbound.ts';
const REPO_EVENT = {
  eventId: 'repositorioAlterado',
  on: 'RepositoryChange.create',
  entityId: 'RepositoryChange',
  mechanism: MODULE_EVENT_PUBLISH.symbol,
  mechanismRef: MODULE_EVENT_PUBLISH.path,
  consumer: 'createRepositoryChange',
};

function eventDefinition(events: unknown[], connections: unknown[] = []): M1Definition {
  return { ...definition(connections, events), moduleName: 'repoHost' };
}

test('a bound event gets a publisher function that compiles against the platform publisher and hands over identity, payload and request id', async () => {
  const emitted = await emitPersistence('persistence.integrationOutbound', eventDefinition([REPO_EVENT]), EVENT_OUTPUT, readCatalog);
  assert.equal('code' in emitted, false);
  if ('code' in emitted) return;
  assert.equal(emitted.evidences.length, 0);
  assert.match(emitted.source, new RegExp(`import \\{ ${MODULE_EVENT_PUBLISH.symbol} \\} from '${MODULE_EVENT_PUBLISH.importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(emitted.source, /export async function publishRepositorioAlterado\(payload: unknown, ctx: RequestContext, opts\?: \{ requestId\?: string \}\)/);
  assert.match(emitted.source, /publishModuleEvent\(\{ module: "repoHost", eventId: "repositorioAlterado" \}, payload, ctx, opts\)/);
  assert.equal(emitted.source.includes('callConnection'), false);
  assert.equal(checkTypes(emitted.source).clean, '');
  const loaded = await loadPublishers(emitted.source);
  const ctx = { moduleId: 'repoHost' } as RequestContext;
  const published = await loaded.publishRepositorioAlterado({ id: 'r1' }, ctx, { requestId: 'req-1' });
  assert.deepEqual(published, { eventId: 'recorded' });
  const call = recordedModuleEvents().at(-1);
  assert.deepEqual(call?.ref, { module: 'repoHost', eventId: 'repositorioAlterado' });
  assert.deepEqual(call?.payload, { id: 'r1' });
  assert.equal(call?.context, ctx);
  assert.deepEqual(call?.opts, { requestId: 'req-1' });
});

test('a refusal of the platform publisher is thrown, so the transaction of the use case rolls back', async () => {
  const emitted = await emitPersistence('persistence.integrationOutbound', eventDefinition([REPO_EVENT]), EVENT_OUTPUT, readCatalog);
  assert.equal('code' in emitted, false);
  if ('code' in emitted) return;
  const loaded = await loadPublishers(emitted.source, `export async function publishModuleEvent() { return { ok: false, code: 'forbidden', message: 'the caller does not publish this event' }; }\n`);
  await assert.rejects(loaded.publishRepositorioAlterado({ id: 'r1' }, { moduleId: 'other' } as RequestContext), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, 'forbidden');
    assert.equal(error.statusCode, 403);
    return true;
  });
});

test('publishers and gateways share one file, and an event with another mechanism stays a gap beside them', async () => {
  const emitted = await emitPersistence('persistence.integrationOutbound', eventDefinition([
    REPO_EVENT,
    { eventId: 'outroEvento', on: 'X.create', entityId: 'X', mechanism: '', consumer: 'createX' },
  ], CONNECTIONS), EVENT_OUTPUT, readCatalog);
  assert.equal('code' in emitted, false);
  if ('code' in emitted) return;
  assert.match(emitted.source, /export interface CmGateway/);
  assert.match(emitted.source, /export async function publishRepositorioAlterado/);
  assert.equal(emitted.source.includes('publishOutroEvento'), false);
  assert.equal(emitted.evidences.some(item => !item.passed && item.detail.startsWith('MECHANISM_UNBOUND: outroEvento') && item.detail.endsWith('Connection gateways and event publishers were written.')), true);
  assert.equal(checkTypes(emitted.source).clean, '');

  const unbound = await emitPersistence('persistence.integrationOutbound', eventDefinition([{ ...REPO_EVENT, mechanismRef: 'mls-102034/l1/other.ts' }]), EVENT_OUTPUT, readCatalog);
  assert.equal('code' in unbound && unbound.code, 'MECHANISM_INCOMPATIBLE');
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

async function loadGateway(source: string, answer: string): Promise<{ createRepoHostGateway: (ctx: RequestContext) => { listChanges: (input: { limit?: number }, ctx: RequestContext) => Promise<{ changes: unknown[] }> } }> {
  const dir = mkdtempSync(path.join('/tmp', 'outbound-missing-'));
  const connector = '/_102034_/l1/server/layer_1_external/connections/callConnection.js';
  writeFileSync(path.join(dir, 'outboundFake.ts'), `export async function callConnection() { return ${answer}; }\n`);
  writeFileSync(path.join(dir, 'outbound.ts'), source.replace(`from '${connector}'`, `from './outboundFake.js'`));
  try {
    return await import(pathToFileURL(path.join(dir, 'outbound.ts')).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

/** Loads the emitted publishers. The platform publisher import is pointed at the fake of the platform, or at an inline stub. */
async function loadPublishers(source: string, stub?: string): Promise<{ publishRepositorioAlterado: (payload: unknown, ctx: RequestContext, opts?: { requestId?: string }) => Promise<{ eventId: string }> }> {
  const dir = mkdtempSync(path.join(ROOT, '.outbound-proof-'));
  const fixtures = '/_102034_/testing/events/eventFixtures.js';
  if (stub) writeFileSync(path.join(dir, 'publishStub.ts'), stub);
  writeFileSync(path.join(dir, 'outbound.ts'), source.replace(`from '${MODULE_EVENT_PUBLISH.importPath}'`, stub ? `from './publishStub.js'` : `from '${fixtures}'`));
  try {
    return await import(pathToFileURL(path.join(dir, 'outbound.ts')).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
