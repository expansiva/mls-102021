/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitServeController.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { emitController, membersOfType, type StructureRead } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { catalogOperations } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const CM_DEFS = '/_102034_/l1/server/layer_1_external/connections/catalogs/cm.ts';
const CM_SOURCE = readFileSync(path.join(ROOT, 'mls-102034/l1/server/layer_1_external/connections/catalogs/cm.ts'), 'utf8');
const SCOPE = '_102099_/l1/agents/layer_2_application/access/accessScope.defs.ts';
const SERVICE = '_102099_/l1/agents/layer_2_application/requests/cm.defs.ts';
const TSC = path.join(ROOT, 'node_modules', '.bin', 'tsc');

function definition(handlers: unknown[]): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'httpController',
    artifactId: 'cm',
    moduleName: 'agents',
    status: 'pending',
    dependencies: [SCOPE, SERVICE],
    data: { pageId: 'cm', handlers },
  };
}

function service(requests: unknown[]): string {
  return `export const definition = ${JSON.stringify({
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'requestService',
    artifactId: 'cm',
    moduleName: 'agents',
    status: 'pending',
    dependencies: [],
    data: { pageId: 'cm', requests },
  })} as const;\n`;
}

const SERVE_REQUESTS = [
  { route: 'agents.cm.record', serves: 'cm.record', serviceFunction: 'recordExecution' },
  { route: 'agents.cm.describe', serves: 'cm.describe', serviceFunction: 'describeAgent' },
  { route: 'agents.cm.agentDraftReady', serves: 'cm.agentDraftReady', serviceFunction: 'draftReady' },
];

const SERVE_HANDLERS = SERVE_REQUESTS.map(row => ({ route: row.route, serviceFunction: row.serviceFunction, grantIds: [] }));

function readOf(serviceText: string): StructureRead {
  return async ref => {
    if (ref === CM_DEFS) return CM_SOURCE;
    if (ref === SERVICE) return serviceText;
    if (ref === SCOPE) return 'export const definition = {"dependencies":[],"data":{}} as const;\n';
    return null;
  };
}

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

test('catalogOperations keeps direction and kind from the real cm catalog', () => {
  const operations = catalogOperations(CM_SOURCE);
  assert.ok(operations);
  const record = operations?.find(item => item.operationId === 'record');
  assert.equal(record?.direction, 'serve');
  assert.equal(record?.kind, 'command');
  assert.equal(record?.inputType, 'CmRecordInput');
  const call = operations?.find(item => item.operationId === 'listAgents');
  assert.equal(call?.direction, 'call');
});

test('CmRecordInput opens an inline object and Array<{…}> on one line', () => {
  const members = membersOfType(CM_SOURCE, 'CmRecordInput');
  assert.ok(members);
  assert.ok(members?.allowedPaths.includes('refs.conversationId'));
  assert.ok(members?.allowedPaths.includes('actions.actionId'));
  assert.equal(members?.requiredFields.includes('refs.conversationId'), false);
  assert.ok(members?.requiredFields.includes('actions.actionId'));
  assert.ok(members?.requiredFields.includes('executionId'));
  const mode = members?.unions.find(item => item.path === 'mode');
  assert.deepEqual(mode?.values, ['real', 'rehearsal']);
});

test('record, describe and agentDraftReady compile against cm.defs and validate the catalog input', async () => {
  const emitted = await emitController(definition(SERVE_HANDLERS), 'cm.ts', readOf(service(SERVE_REQUESTS)));
  assert.equal('code' in emitted ? (emitted as { code: string }).code : '', '');
  if ('code' in emitted) return;
  assert.match(emitted.source, /import type \{ CmAgentDraftReadyInput, CmAgentDraftReadyOutput, CmDescribeInput, CmDescribeOutput, CmRecordInput, CmRecordOutput \} from '\/_102034_\/l1\/server\/layer_1_external\/connections\/catalogs\/cm\.js'/);
  assert.match(emitted.source, /const params = scoped as unknown as CmRecordInput;/);
  assert.match(emitted.source, /data: data as CmRecordOutput/);
  assert.doesNotMatch(emitted.source, /Contracts\['agents\.cm\.record'\]/);
  assert.deepEqual(emitted.imports.filter(item => item.includes('/connections/')), ['/_102034_/l1/server/layer_1_external/connections/catalogs/cm.js']);
  const typecheck = checkTypes(emitted.source);
  assert.equal(typecheck.clean, '', typecheck.clean);
  assert.match(typecheck.injected, /error TS/);
  const seen: unknown[] = [];
  const loaded = await loadEmitted(emitted.source, async input => { seen.push(input); return { status: 'recorded' }; });
  const route = loaded.routes.find(item => item.key === 'agents.cm.record');
  assert.ok(route);
  const ok = await route.handler(envelope(RECORD));
  assert.equal(ok.ok, true);
  assert.equal((seen[0] as { refs: { conversationId: string } }).refs.conversationId, 'conv-1');
  assert.equal((seen[0] as { actions: Array<{ actionId: string }> }).actions[0].actionId, 'act-1');
  await assert.rejects(route.handler(envelope({ ...RECORD, executionId: undefined })), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /executionId is required/);
    return true;
  });
  await assert.rejects(route.handler(envelope({ ...RECORD, extra: true })), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /extra is not permitted/);
    return true;
  });
  await assert.rejects(route.handler(envelope({ ...RECORD, mode: 'later' })), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /mode is not a permitted value/);
    return true;
  });
  const describe = loaded.routes.find(item => item.key === 'agents.cm.describe');
  const ready = loaded.routes.find(item => item.key === 'agents.cm.agentDraftReady');
  assert.equal(typeof describe?.handler, 'function');
  assert.equal(typeof ready?.handler, 'function');
});

test('a serve mark that the catalog does not list, or that is not serve, is refused', async () => {
  const missing = await emitController(definition([
    { route: 'agents.cm.missing', serviceFunction: 'missing', grantIds: [] },
  ]), 'cm.ts', readOf(service([{ route: 'agents.cm.missing', serves: 'cm.missing', serviceFunction: 'missing' }])));
  assert.equal('code' in missing && missing.code, 'CONNECTION_OPERATION_UNLISTED');
  const call = await emitController(definition([
    { route: 'agents.cm.listAgents', serviceFunction: 'list', grantIds: [] },
  ]), 'cm.ts', readOf(service([{ route: 'agents.cm.listAgents', serves: 'cm.listAgents', serviceFunction: 'list' }])));
  assert.equal('code' in call && call.code, 'CONNECTION_NOT_SERVE');
});

test('a page controller without serves still indexes the page contract', async () => {
  const contract = [
    'export interface PageContracts {',
    "  'agents.page.list': {",
    '    input: { name: string };',
    '    output: { name: string };',
    '  };',
    "  'agents.page.extra': {",
    '    input: { name: string };',
    '    output: { name: string };',
    "    access: { grants: ['see'] };",
    '  };',
    '}',
    '',
  ].join('\n');
  const contractPath = '_102099_/l2/agents/web/contracts/page.defs.ts';
  const pageService = '_102099_/l1/agents/layer_2_application/requests/page.defs.ts';
  const page: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'httpController',
    artifactId: 'page',
    moduleName: 'agents',
    status: 'pending',
    dependencies: [SCOPE, pageService, contractPath],
    data: {
      pageId: 'page',
      handlers: [{ route: 'agents.page.list', serviceFunction: 'list', contractPath, contractInterface: 'PageContracts', grantIds: ['see'] }],
    },
  };
  const serviceText = `export const definition = ${JSON.stringify({
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'requestService',
    artifactId: 'page',
    moduleName: 'agents',
    status: 'pending',
    dependencies: [],
    data: { pageId: 'page', requests: [{ route: 'agents.page.list' }] },
  })} as const;\n`;
  const read: StructureRead = async ref => {
    if (ref === pageService) return serviceText;
    if (ref === SCOPE) return 'export const definition = {"dependencies":[],"data":{}} as const;\n';
    if (ref === contractPath) return contract;
    if (ref.endsWith('/authorityMap.defs.ts')) return 'export const definition = {"dependencies":[],"data":{}} as const;\n';
    return null;
  };
  page.dependencies.push('_102099_/l1/agents/layer_2_application/access/authorityMap.defs.ts');
  const emitted = await emitController(page, 'page.ts', read);
  assert.equal('code' in emitted ? (emitted as { code: string }).code : '', '');
  if ('code' in emitted) return;
  assert.match(emitted.source, /PageContracts\['agents\.page\.list'\]\['input'\]/);
  assert.match(emitted.source, /key: 'agents\.page\.extra'/);
  assert.doesNotMatch(emitted.source, /connections\/cm\.defs/);
});

function envelope(params: unknown) {
  return { request: { params, meta: { source: 'http', verifiedAuthorities: ['agents:connection:cm'] } }, ctx: {} };
}

function checkTypes(source: string): { clean: string; injected: string } {
  const dir = mkdtempSync(path.join(ROOT, '.serve-proof-'));
  const config = {
    extends: '../tsconfig.base.json',
    compilerOptions: { noEmit: true, skipLibCheck: true },
    files: ['controller.ts'],
  };
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(config));
  const rewritten = source
    .replace(/from '\/_102099_\/l1\/agents\/layer_2_application\/access\/accessScope\.js';/, "from './scope.js';")
    .replace(/from '\/_102099_\/l1\/agents\/layer_2_application\/requests\/cm\.js';/, "from './requests.js';");
  writeFileSync(path.join(dir, 'scope.ts'), 'export function resolveGrant(grantId: string): { code: string; detail: string } | { grantId: string; scopeMode: string; entityRefs: string[]; recordFields: Record<string, string> } { return { code: grantId, detail: grantId }; }\n');
  writeFileSync(path.join(dir, 'requests.ts'), 'export const requests = { recordExecution: async (input: unknown, _ctx: unknown) => input, describeAgent: async (input: unknown, _ctx: unknown) => input, draftReady: async (input: unknown, _ctx: unknown) => input };\n');
  writeFileSync(path.join(dir, 'controller.ts'), rewritten);
  const clean = tsc(dir);
  writeFileSync(path.join(dir, 'controller.ts'), `${rewritten}\nconst _injected: CmRecordInput = { executionId: 1 };\n`);
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

async function loadEmitted(source: string, recordExecution: (input: unknown) => Promise<unknown>): Promise<{ routes: Array<{ key: string; handler: (input: { request: unknown; ctx: unknown }) => Promise<{ ok: boolean }> }> }> {
  const dir = mkdtempSync(path.join(ROOT, '.serve-proof-'));
  const rewritten = source
    .replace(/from '\/_102099_\/l1\/agents\/layer_2_application\/access\/accessScope\.js';/, "from './scope.js';")
    .replace(/from '\/_102099_\/l1\/agents\/layer_2_application\/requests\/cm\.js';/, "from './requests.js';");
  writeFileSync(path.join(dir, 'scope.ts'), 'export function resolveGrant(grantId: string) { return { code: grantId, detail: grantId }; }\n');
  writeFileSync(path.join(dir, 'requests.ts'), `export const requests = { recordExecution: async (input: unknown) => globalThis.__serveProof(input), describeAgent: async (input: unknown) => input, draftReady: async (input: unknown) => input };\n`);
  writeFileSync(path.join(dir, 'controller.ts'), rewritten);
  (globalThis as { __serveProof?: typeof recordExecution }).__serveProof = recordExecution;
  try {
    return await import(pathToFileURL(path.join(dir, 'controller.ts')).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
