/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/connectionProof.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { emitAccess, emitAuthority, emitController, type StructureRead } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { AppError, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createFakeCallConnection } from '/_102034_/testing/connections/connectionFixtures.js';


const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const TSC = path.join(ROOT, 'node_modules', '.bin', 'tsc');
const CM_DEFS = '/_102034_/l2/shared/contracts/connections/cm.ts';
const CM_SOURCE = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
const OUTBOUND_DEF = '_102099_/l1/agents/layer_1_external/adapters/integration/outbound.defs.ts';
const SCOPE_DEF = '_102099_/l1/agents/layer_2_application/access/accessScope.defs.ts';
const AUTHORITY_DEF = '_102099_/l1/agents/layer_2_application/access/authorityMap.defs.ts';
const SERVICE_DEF = '_102099_/l1/agents/layer_2_application/requests/cm.defs.ts';

const CONNECTIONS = [
  { connectionId: 'cm', operationId: 'listAgents', consumer: 'listAgents', entityRefs: ['Agent'], effect: 'list' },
  { connectionId: 'cm', operationId: 'readAgent', consumer: 'readAgent', entityRefs: ['Agent'], effect: 'read' },
  { connectionId: 'cm', operationId: 'updateAgent', consumer: 'updateAgent', entityRefs: ['Agent'], effect: 'update' },
  { connectionId: 'cm', operationId: 'simulateAgent', consumer: 'simulateAgent' },
  { connectionId: 'cm', operationId: 'createAgent', consumer: 'createAgent' },
];

const SERVE_REQUESTS = [
  { route: 'agents.cm.record', serves: 'cm.record', serviceFunction: 'recordExecution', uses: ['AgentExecution'] },
  { route: 'agents.cm.describe', serves: 'cm.describe', serviceFunction: 'describeAgent' },
  { route: 'agents.cm.agentDraftReady', serves: 'cm.agentDraftReady', serviceFunction: 'draftReady' },
];

const GRANT = {
  grantId: 'connection_cm',
  actorRef: 'connection:cm',
  entityRefs: [],
  disclosure: 'fullRecord',
  scopeMode: 'organization',
  session: 'verified',
  path: [],
  pending: '',
};

const RECORD = {
  executionId: 'e1',
  agentId: 'a1',
  mode: 'real',
  startedAt: '2026-01-01T00:00:00Z',
  durationMs: 1,
  costUsd: 0,
  actions: [{ actionId: 'act-1', outcome: 'done' }],
  usedMainModel: false,
  handedOff: false,
  refs: { conversationId: 'conv-1' },
};

function envelope(definition: Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, moduleName: 'agents', status: 'pending', ...definition };
}

function serviceText(): string {
  return `export const definition = ${JSON.stringify(envelope({
    artifactType: 'requestService',
    artifactId: 'cm',
    dependencies: [],
    data: { pageId: 'cm', requests: SERVE_REQUESTS },
  }))} as const;\n`;
}

const REQUESTS_TS = [
  "import type { CmAgentDraftReadyInput, CmAgentDraftReadyOutput, CmDescribeInput, CmDescribeOutput, CmRecordInput, CmRecordOutput } from '/_102034_/l2/shared/contracts/connections/cm.js';",
  '',
  'export const requests = {',
  '  recordExecution: async (_input: CmRecordInput, _ctx: unknown): Promise<CmRecordOutput> => ({ status: \'recorded\' }),',
  '  describeAgent: async (_input: CmDescribeInput, _ctx: unknown): Promise<CmDescribeOutput> => ({ version: \'1\', allowed: [] }),',
  '  draftReady: async (_input: CmAgentDraftReadyInput, _ctx: unknown): Promise<CmAgentDraftReadyOutput> => ({}),',
  '};',
  '',
].join('\n');

test('emitted outbound, registration, scope and the cm controller compile against the real catalog', async () => {
  const outbound = await emitPersistence('persistence.integrationOutbound', envelope({
    artifactType: 'integrationOutbound',
    artifactId: 'outbound',
    dependencies: [],
    data: { integrationId: 'outbound', events: [], connections: CONNECTIONS },
  }), OUTBOUND_DEF.replace(/\.defs\.ts$/, '.ts'), async ref => ref === CM_DEFS ? CM_SOURCE : null);
  assert.equal('code' in outbound, false);
  if ('code' in outbound) return;
  assert.match(outbound.source, /export interface CmGateway/);
  assert.match(outbound.source, /listAgents\(input: CmListAgentsInput/);
  assert.match(outbound.source, /createAgent\(input: CmCreateAgentInput/);
  assert.match(outbound.source, /updateAgent requires expectVersion/);

  const scope = emitAccess(envelope({
    artifactType: 'accessScope',
    artifactId: 'accessScope',
    dependencies: [],
    data: { grants: [GRANT] },
  }), SCOPE_DEF.replace(/\.defs\.ts$/, '.ts'));
  const authority = emitAuthority(envelope({
    artifactType: 'authorityMap',
    artifactId: 'authorityMap',
    dependencies: [],
    data: { entries: [{ grantId: 'connection_cm', actorRef: 'connection:cm' }] },
  }), AUTHORITY_DEF.replace(/\.defs\.ts$/, '.ts'));
  assert.match(scope.source, /connection:cm/);
  assert.match(authority.source, /connection:cm/);

  const registration = await emitPersistence('persistence.repositoryRegistration', envelope({
    artifactType: 'repositoryRegistration',
    artifactId: 'registerRepositories',
    dependencies: [OUTBOUND_DEF],
    data: { adapters: [{ portId: 'CmGateway', adapterArtifactId: 'outbound' }] },
  }), '_102099_/l1/agents/layer_1_external/registerRepositories.ts', async ref => ref.endsWith('/outbound.ts') ? outbound.source : null);
  assert.equal('code' in registration, false);
  if ('code' in registration) return;
  assert.match(registration.source, /registerRepository\("CmGateway", ctx => createCmGateway\(ctx\), \{ module: "agents" \}\);/);

  const controller = await emitController(envelope({
    artifactType: 'httpController',
    artifactId: 'cm',
    dependencies: [SCOPE_DEF, AUTHORITY_DEF, SERVICE_DEF],
    data: {
      pageId: 'cm',
      handlers: SERVE_REQUESTS.map(row => ({ route: row.route, serviceFunction: row.serviceFunction, grantIds: ['connection_cm'] })),
    },
  }), 'cm.ts', async (ref): Promise<string | null> => {
    if (ref === CM_DEFS) return CM_SOURCE;
    if (ref === SERVICE_DEF) return serviceText();
    if (ref === SCOPE_DEF) return 'export const definition = {"dependencies":[],"data":{}} as const;\n';
    if (ref === AUTHORITY_DEF) return 'export const definition = {"dependencies":[],"data":{}} as const;\n';
    return null;
  });
  assert.equal('code' in controller, false);
  if ('code' in controller) return;
  assert.match(controller.source, /CmRecordInput/);
  assert.match(controller.source, /connection_cm/);

  const typecheck = checkTypes({
    outbound: outbound.source,
    registration: registration.source,
    scope: scope.source,
    authority: authority.source,
    controller: controller.source,
  });
  assert.equal(typecheck.clean, '', typecheck.clean);
  assert.match(typecheck.injected, /error TS/);

  const fake = createFakeCallConnection({ 'cm.listAgents': { output: { agents: [] } } });
  const loaded = await loadOutbound(outbound.source, fake);
  const ctx = { sessionContext: { person: { mdmId: 'person-1' } } } as RequestContext;
  await loaded.createCmGateway(ctx).listAgents({}, ctx);
  assert.equal(fake.calls[0]?.operationId, 'listAgents');
});

test('the emitted serve route accepts connection:cm, refuses another actor, and passes when the runtime omits authorities', async () => {
  const scope = emitAccess(envelope({
    artifactType: 'accessScope',
    artifactId: 'accessScope',
    dependencies: [],
    data: { grants: [GRANT] },
  }), 'accessScope.ts');
  const authority = emitAuthority(envelope({
    artifactType: 'authorityMap',
    artifactId: 'authorityMap',
    dependencies: [],
    data: { entries: [{ grantId: 'connection_cm', actorRef: 'connection:cm' }] },
  }), 'authorityMap.ts');
  const controller = await emitController(envelope({
    artifactType: 'httpController',
    artifactId: 'cm',
    dependencies: [SCOPE_DEF, AUTHORITY_DEF, SERVICE_DEF],
    data: {
      pageId: 'cm',
      handlers: SERVE_REQUESTS.map(row => ({ route: row.route, serviceFunction: row.serviceFunction, grantIds: ['connection_cm'] })),
    },
  }), 'cm.ts', async (ref): Promise<string | null> => {
    if (ref === CM_DEFS) return CM_SOURCE;
    if (ref === SERVICE_DEF) return serviceText();
    if (ref === SCOPE_DEF) return scope.source;
    if (ref === AUTHORITY_DEF) return authority.source;
    return null;
  });
  assert.equal('code' in controller, false);
  if ('code' in controller) return;
  const loaded = await loadController(controller.source, scope.source, authority.source);
  const route = loaded.routes.find(item => item.key === 'agents.cm.record');
  assert.ok(route);

  const accepted = await route.handler(message(RECORD, ['agents:connection:cm']));
  assert.equal(accepted.ok, true);

  await assert.rejects(route.handler(message(RECORD, ['agents:owner'])), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, 'FORBIDDEN_ACTOR');
    assert.equal(error.statusCode, 403);
    return true;
  });

  // authorize lets a non-http call through when verifiedAuthorities is absent. The runtime has sent the actor since rt238.
  const omitted = await route.handler({ request: { params: RECORD, meta: { source: 'message' } }, ctx: {} });
  assert.equal(omitted.ok, true);
});

function message(params: unknown, verifiedAuthorities: string[]) {
  return { request: { params, meta: { source: 'message', verifiedAuthorities } }, ctx: {} };
}

function place(files: { outbound: string; registration: string; scope: string; authority: string; controller: string }): Record<string, string> {
  return {
    'outbound.ts': files.outbound,
    'registerRepositories.ts': files.registration.replace(
      /from '\/_102099_\/l1\/agents\/layer_1_external\/adapters\/integration\/outbound\.js'/,
      "from './outbound.js'",
    ),
    'accessScope.ts': files.scope,
    'authorityMap.ts': files.authority,
    'requests.ts': REQUESTS_TS,
    'controller.ts': files.controller
      .replace(/from '\/_102099_\/l1\/agents\/layer_2_application\/access\/accessScope\.js'/, "from './accessScope.js'")
      .replace(/from '\/_102099_\/l1\/agents\/layer_2_application\/access\/authorityMap\.js'/, "from './authorityMap.js'")
      .replace(/from '\/_102099_\/l1\/agents\/layer_2_application\/requests\/cm\.js'/, "from './requests.js'"),
  };
}

function checkTypes(files: { outbound: string; registration: string; scope: string; authority: string; controller: string }): { clean: string; injected: string } {
  const dir = mkdtempSync(path.join(ROOT, '.connection-proof-'));
  const written = place(files);
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    extends: '../tsconfig.base.json',
    compilerOptions: { noEmit: true, skipLibCheck: true },
    files: Object.keys(written),
  }));
  for (const [name, source] of Object.entries(written)) writeFileSync(path.join(dir, name), source);
  const clean = tsc(dir);
  writeFileSync(path.join(dir, 'controller.ts'), `${written['controller.ts']}\nconst _injected: CmRecordInput = { executionId: 1 };\n`);
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

async function loadOutbound(source: string, fake: ReturnType<typeof createFakeCallConnection>): Promise<{ createCmGateway: (ctx: RequestContext) => { listAgents: (input: unknown, ctx: RequestContext) => Promise<unknown> } }> {
  const dir = mkdtempSync(path.join(ROOT, '.connection-proof-'));
  const connector = '/_102034_/l1/server/layer_1_external/connections/callConnection.js';
  writeFileSync(path.join(dir, 'outboundFake.ts'), 'export async function callConnection(...args: unknown[]) { return (globalThis as { __connectionProof?: (...value: unknown[]) => unknown }).__connectionProof?.(...args); }\n');
  writeFileSync(path.join(dir, 'outbound.ts'), source.replace(`from '${connector}'`, "from './outboundFake.js'"));
  (globalThis as { __connectionProof?: typeof fake }).__connectionProof = fake;
  try {
    return await import(pathToFileURL(path.join(dir, 'outbound.ts')).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function loadController(controller: string, scope: string, authority: string): Promise<{ routes: Array<{ key: string; handler: (input: { request: unknown; ctx: unknown }) => Promise<{ ok: boolean }> }> }> {
  const dir = mkdtempSync(path.join(ROOT, '.connection-proof-'));
  const written = place({ outbound: '', registration: '', scope, authority, controller });
  writeFileSync(path.join(dir, 'accessScope.ts'), written['accessScope.ts']);
  writeFileSync(path.join(dir, 'authorityMap.ts'), written['authorityMap.ts']);
  writeFileSync(path.join(dir, 'requests.ts'), written['requests.ts']);
  writeFileSync(path.join(dir, 'controller.ts'), written['controller.ts']);
  try {
    return await import(pathToFileURL(path.join(dir, 'controller.ts')).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('one operation cited by two consumers emits one gateway method', async () => {
  const outbound = await emitPersistence('persistence.integrationOutbound', envelope({
    artifactType: 'integrationOutbound',
    artifactId: 'outbound',
    dependencies: [],
    data: {
      integrationId: 'outbound',
      events: [],
      connections: [
        { connectionId: 'cm', operationId: 'updateAgent', consumer: 'updateNote', entityRefs: ['Agent'], effect: 'update' },
        { connectionId: 'cm', operationId: 'updateAgent', consumer: 'updateTask', entityRefs: ['Agent'], effect: 'update' },
      ],
    },
  }), OUTBOUND_DEF.replace(/\.defs\.ts$/, '.ts'), async ref => ref === CM_DEFS ? CM_SOURCE : null);
  assert.equal('code' in outbound, false);
  if ('code' in outbound) return;
  assert.equal(outbound.source.split('  updateAgent(input: CmUpdateAgentInput, ctx: RequestContext').length - 1, 1);
});

test('d1_214: the emitted gateway ties the call to the request being served, and keeps what the caller passed', async () => {
  const outbound = await emitPersistence('persistence.integrationOutbound', envelope({
    artifactType: 'integrationOutbound',
    artifactId: 'outbound',
    dependencies: [],
    data: { integrationId: 'outbound', events: [], connections: CONNECTIONS },
  }), OUTBOUND_DEF.replace(/\.defs\.ts$/, '.ts'), async ref => ref === CM_DEFS ? CM_SOURCE : null);
  assert.equal('code' in outbound, false);
  if ('code' in outbound) return;
  // The text: one rule for every method of every connection.
  const methods = outbound.source.split('\n').filter(line => line.includes('await callConnection('));
  assert.equal(methods.length > 1, true);
  assert.equal(methods.every(line => line.endsWith(', callOptions);')), true, 'every call goes with the merged options');
  assert.equal(outbound.source.split("const requestId = opts?.requestId ?? ctx.requestMeta?.requestId;").length - 1, methods.length);

  const fake = createFakeCallConnection({
    'cm.listAgents': { output: { agents: [] } },
    'cm.updateAgent': { output: {} },
  });
  const loaded = await loadOutbound(outbound.source, fake);
  const withMeta = { sessionContext: { person: { mdmId: 'person-1' } }, requestMeta: { requestId: 'req-1' } } as unknown as RequestContext;
  const withoutMeta = { sessionContext: { person: { mdmId: 'person-1' } } } as RequestContext;
  const gateway = (ctx: RequestContext) => loaded.createCmGateway(ctx) as unknown as Record<string, (input: unknown, ctx: RequestContext, opts?: Record<string, unknown>) => Promise<unknown>>;

  await gateway(withMeta).listAgents({}, withMeta);
  assert.deepEqual(fake.calls[0]?.opts, { requestId: 'req-1' }, 'the id of the request goes in opts');
  assert.deepEqual(fake.calls[0]?.context, { actorMdmId: 'person-1' }, 'and never in the context that goes to the cm');

  await gateway(withMeta).updateAgent({}, withMeta, { expectVersion: 3, idempotencyKey: 'k1' });
  assert.deepEqual(fake.calls[1]?.opts, { expectVersion: 3, idempotencyKey: 'k1', requestId: 'req-1' }, 'what the caller passed stays');

  await gateway(withMeta).listAgents({}, withMeta, { requestId: 'explicit' });
  assert.equal((fake.calls[2]?.opts as { requestId?: string }).requestId, 'explicit', 'an id the caller passed wins');

  await gateway(withoutMeta).listAgents({}, withoutMeta);
  assert.equal('requestId' in (fake.calls[3]?.opts ?? {}), false, 'a routine or a tick has no request: the id is absent, no error');
  await gateway(withoutMeta).updateAgent({}, withoutMeta, { expectVersion: 4 });
  assert.deepEqual(fake.calls[4]?.opts, { expectVersion: 4 });
});
