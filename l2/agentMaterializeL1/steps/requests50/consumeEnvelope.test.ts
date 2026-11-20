/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/consumeEnvelope.test.ts" enhancement="_blank"/>

// d1_225: the route that receives an event is called by the runtime with the ENVELOPE (`ModuleEventEnvelope`: eventId, ref, publishedAt,
// payload, actor?, requestId?), not with the record. Its message type is that envelope, the controller accepts a key the type does not list
// only under `payload`, and an event line that writes nothing is a request service written by code that only confirms the receipt.
// The envelope below has the keys and the types of the runtime's own (`events/types.ts`); the controllers are the ones the generator emits, run.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { emitController } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { consumeMessageTypeName } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { confirmOnlySource } from '/_102021_/l2/agentMaterializeL1/steps/requests50/confirmOnly.js';
import { consumeMessageProblems, requestGate, requestsTypeOfConsume } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';
import type { ModuleEventEnvelope } from '/_102034_/l1/server/layer_1_external/events/types.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../../../..');
const TSC = path.join(ROOT, 'node_modules', '.bin', 'tsc');
const RECORDED = readFileSync(path.join(HERE, 'fixtures/purchasingConsumeRoute.recorded.txt'), 'utf8');
const CONTEUDO_L4 = readFileSync(path.join(HERE, 'fixtures/conteudoIntegration5a595492.recorded.txt'), 'utf8');

/** What the runtime passes, in its own type: a stored record under `payload`, with fields this consumer does not use. */
const ENVELOPE: ModuleEventEnvelope = {
  eventId: '5d1c7a3e-0b4f-4f6a-9d2e-3a8f1c2b7e90',
  ref: { module: 'purchasing', eventId: 'goodsReceived' },
  publishedAt: '2026-11-20T04:10:00.000Z',
  payload: { id: 'r-1', version: 1, receiptId: 'r-1', lines: [{ productId: 'p-1', quantity: 3, unit: 'box' }], note: null, extra: 'kept by the publisher' },
  actor: { kind: 'person', id: 'u-1' },
  requestId: 'req-1',
};

interface Loaded { routes: Array<{ key: string; handler: (input: { request: unknown; ctx: unknown }) => Promise<{ ok: boolean; data: unknown }> }> }

/** The controller as emitted, run against a request service and stubs for the scope and the usecase. */
async function load(controller: string, requestsSource: string, calls: unknown[]): Promise<Loaded> {
  const dir = mkdtempSync(path.join(ROOT, '.envelope-proof-'));
  try {
    const flat = (source: string): string => source
      .replace(/\/_102099_\/l1\/stock\/layer_2_application\/access\/accessScope\.js/gu, './scope.js')
      .replace(/\/_102099_\/l1\/stock\/layer_2_application\/access\/authorityMap\.js/gu, './authority.js')
      .replace(/\/_102099_\/l1\/stock\/layer_2_application\/requests\/purchasing\.js/gu, './requests.js')
      .replace(/\/_102099_\/l1\/stock\/layer_2_application\/usecases\/createStockMove\.js/gu, './createStockMove.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_2_application\/access\/accessScope\.js/gu, './scope.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_2_application\/access\/authorityMap\.js/gu, './authority.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_2_application\/requests\/repoHost\.js/gu, './requests.js');
    writeFileSync(path.join(dir, 'scope.ts'), "export function resolveGrant(grantId: string) { return { grantId, scopeMode: 'all', entityRefs: [] as string[], recordFields: {} as Record<string, string> }; }\n");
    writeFileSync(path.join(dir, 'authority.ts'), "export function actorRefFor(grantId: string): string | null { return grantId ? 'technical' : null; }\n");
    writeFileSync(path.join(dir, 'createStockMove.ts'), "export async function createStockMove(input: unknown): Promise<void> { (globalThis as { __calls?: unknown[] }).__calls?.push(input); }\n");
    writeFileSync(path.join(dir, 'requests.ts'), flat(requestsSource));
    writeFileSync(path.join(dir, 'controller.ts'), flat(controller));
    (globalThis as { __calls?: unknown[] }).__calls = calls;
    return await import(pathToFileURL(path.join(dir, 'controller.ts')).href) as Loaded;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const call = (params: unknown) => ({ request: { params, meta: { source: 'message', verifiedAuthorities: ['stock:technical'] } }, ctx: { data: { moduleData: { runInTransaction: async (run: (tx: unknown) => Promise<void>) => run({}) } } } });

function controllerDefinition(module: string, page: string, route: string, grant: string, folder: string): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'httpController', artifactId: page, moduleName: module, status: 'pending',
    dependencies: [`${folder}/access/accessScope.defs.ts`, `${folder}/access/authorityMap.defs.ts`, `${folder}/requests/${page}.defs.ts`],
    data: { pageId: page, handlers: [{ route, serviceFunction: route, grantIds: [grant] }] },
  };
}

async function emit(definition: M1Definition, page: string, requestsSource: string, serviceRow: Record<string, unknown>, folder: string): Promise<string> {
  const scope = 'export const definition = {"dependencies":[],"data":{}} as const;\n';
  const service = `export const definition = ${JSON.stringify({ schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'requestService', artifactId: page, moduleName: definition.moduleName, status: 'pending', dependencies: [], data: { pageId: page, requests: [serviceRow] } })} as const;\n`;
  const emitted = await emitController(definition, `${page}.ts`, async ref => {
    const key = ref.replace(/^\//u, '');
    if (key === `${folder}/requests/${page}.defs.ts`) return service;
    if (key === `${folder}/requests/${page}.ts`) return requestsSource;
    if (key.endsWith('/accessScope.defs.ts') || key.endsWith('/authorityMap.defs.ts')) return scope;
    return null;
  });
  assert.equal('code' in emitted, false, JSON.stringify(emitted));
  if ('code' in emitted) throw new Error(emitted.code);
  return emitted.source;
}

const STOCK = '_102099_/l1/stock/layer_2_application';
const STOCK_ROW = { route: 'stock.purchasing.goodsReceived', kind: 'cmd', uses: ['createStockMove'], consumes: 'purchasing.goodsReceived' };

void test('d1_225: the controller of a route that receives an event takes the real envelope, hands the record under payload to the usecase, and refuses a key outside the envelope', async () => {
  const controller = await emit(controllerDefinition('stock', 'purchasing', 'stock.purchasing.goodsReceived', 'module_purchasing', STOCK.replace('/layer_2_application', '/layer_2_application')), 'purchasing', RECORDED, STOCK_ROW, STOCK);
  const calls: unknown[] = [];
  const loaded = await load(controller, RECORDED, calls);
  const route = loaded.routes.find(item => item.key === 'stock.purchasing.goodsReceived');
  assert.ok(route);
  const answer = await route.handler(call(ENVELOPE));
  assert.deepEqual([answer.ok, answer.data], [true, { received: true }]);
  assert.deepEqual(calls, [{ productId: 'p-1', quantity: 3 }], 'the usecase gets the fields of payload');
  // The record carries fields the consumer does not use (id, version, extra, unit): accepted, inside the payload only.
  await assert.rejects(route.handler(call({ ...ENVELOPE, stray: 1 })), (error: unknown) => (error as { statusCode?: number; message?: string }).statusCode === 400 && /stray is not permitted/u.test(String((error as Error).message)));
  await assert.rejects(route.handler(call({ ...ENVELOPE, ref: { ...ENVELOPE.ref, extra: 1 } })), (error: unknown) => /ref\.extra is not permitted/u.test(String((error as Error).message)));
  await assert.rejects(route.handler(call({ ...ENVELOPE, payload: { ...(ENVELOPE.payload as object), lines: undefined } })), (error: unknown) => /payload\.lines is required/u.test(String((error as Error).message)));
  await assert.rejects(route.handler(call({ ...ENVELOPE, eventId: undefined })), (error: unknown) => /eventId is required/u.test(String((error as Error).message)));
});

void test('d1_225: the message the d1_217 asked for (the fields of the entity, no envelope) gets no controller: it is not what the runtime passes', async () => {
  const flat = RECORDED
    .replace(/export interface PurchasingGoodsReceivedMessage \{[\s\S]*?\n\}/u, 'export interface PurchasingGoodsReceivedMessage {\n  receiptId: string;\n  lines: { productId: string; quantity: number }[];\n  note?: string | null;\n}')
    .replace('input.payload.lines', 'input.lines');
  const controller = await emit(controllerDefinition('stock', 'purchasing', 'stock.purchasing.goodsReceived', 'module_purchasing', STOCK), 'purchasing', flat, STOCK_ROW, STOCK).catch(error => String(error));
  // The controller does not emit: the message is not the envelope the runtime passes (it would be refused at its first key, `eventId`).
  assert.match(String(controller), /CONSUMES_MESSAGE_NOT_ENVELOPE/u);
  assert.deepEqual(consumeMessageProblems(flat, ['PurchasingGoodsReceivedMessage'], true).map(item => item.split(':')[0]), ['MESSAGE_NOT_ENVELOPE', 'MESSAGE_PAYLOAD_UNREAD']);
  assert.deepEqual(consumeMessageProblems(RECORDED, ['PurchasingGoodsReceivedMessage'], true), []);
});

const CONTEUDO_LINE = (JSON.parse(/=\s*(\{[\s\S]*\})\s*as const/u.exec(CONTEUDO_L4)![1]) as { inbound: Array<Record<string, unknown>> }).inbound[0];
const CONTEUDO_ROW = { route: 'conteudo.repoHost.repositorioAlterado', kind: 'cmd', uses: [], consumes: `${CONTEUDO_LINE.from}.${CONTEUDO_LINE.event}` };
const CONTEUDO_DATA = { pageId: 'repoHost', requests: [CONTEUDO_ROW] };
const CONTEUDO_REF = '_102099_/l1/conteudo/layer_2_application/requests/repoHost.ts';
const CONTEUDO = '_102099_/l1/conteudo/layer_2_application';
const CONTEUDO_ENVELOPE: ModuleEventEnvelope = {
  eventId: 'a3b2c1d0-1111-4222-8333-944455556666',
  ref: { module: 'repoHost', eventId: 'repositorioAlterado' },
  publishedAt: '2026-11-20T04:20:00.000Z',
  payload: { id: 'c-1', version: 1, details: { commitMessage: 'Edit post', files: [{ path: 'blog/a.md', change: 'modified' }] } },
  requestId: 'req-2',
};

void test('d1_225: an event line that writes nothing is a request service written by code: it passes the gate, compiles, and the route confirms the real envelope', async () => {
  assert.deepEqual([CONTEUDO_LINE.writes, CONTEUDO_LINE.effect], [[], 'update'], 'the real line of the L4 of conteudo (5a595492)');
  const source = confirmOnlySource(CONTEUDO_DATA, CONTEUDO_REF);
  assert.ok(source);
  assert.equal(/usecases\//u.test(source), false, 'no usecase is imported');
  const name = consumeMessageTypeName(CONTEUDO_ROW.consumes);
  assert.equal(name, 'RepoHostRepositorioAlteradoMessage');
  const gate = requestGate(source, {
    header: source.split('\n')[0], contractsInterface: requestsTypeOfConsume([{ route: CONTEUDO_ROW.route, messageType: name }]),
    routes: [{ route: CONTEUDO_ROW.route, kind: 'cmd', inputFields: [], actors: [], rules: [] }], project: 102099, moduleName: 'conteudo', pageId: 'repoHost', waived: new Set<string>(), serveUses: [], consumeMessages: [name],
  } as never);
  assert.deepEqual(gate, []);
  // It compiles against the platform contracts, and the real envelope of the runtime is a value of its message type.
  const dir = mkdtempSync(path.join(ROOT, '.envelope-proof-'));
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'requests.ts'), source);
    writeFileSync(path.join(dir, 'check.ts'), [
      "import type { ModuleEventEnvelope } from '/_102034_/l1/server/layer_1_external/events/types.js';",
      `import { requests, type ${name} } from './requests.js';`,
      `export const message = (envelope: ModuleEventEnvelope): ${name} => envelope as unknown as ${name};`,
      "export const run = (envelope: ModuleEventEnvelope, ctx: Parameters<typeof requests['" + CONTEUDO_ROW.route + "']>[1]) => requests['" + CONTEUDO_ROW.route + "'](message(envelope), ctx);",
      '',
    ].join('\n'));
    writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ extends: '../tsconfig.base.json', compilerOptions: { noEmit: true, skipLibCheck: true }, files: ['check.ts'] }));
    let diagnostics = '';
    try { execFileSync(TSC, ['--pretty', 'false', '-p', path.join(dir, 'tsconfig.json')], { cwd: ROOT, encoding: 'utf8' }); } catch (error) {
      const failed = error as { stdout?: string; stderr?: string };
      diagnostics = `${failed.stdout ?? ''}${failed.stderr ?? ''}`;
    }
    assert.equal(diagnostics, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const controller = await emit(controllerDefinition('conteudo', 'repoHost', CONTEUDO_ROW.route, 'module_repoHost', CONTEUDO), 'repoHost', source, CONTEUDO_ROW, CONTEUDO);
  const loaded = await load(controller, source, []);
  const route = loaded.routes.find(item => item.key === CONTEUDO_ROW.route);
  assert.ok(route);
  const answer = await route.handler(call(CONTEUDO_ENVELOPE));
  assert.deepEqual([answer.ok, answer.data], [true, { received: true }]);
  // The record the publisher wrote is not declared anywhere and is accepted whole; the envelope is checked.
  await assert.rejects(route.handler(call({ ...CONTEUDO_ENVELOPE, stray: 1 })), (error: unknown) => /stray is not permitted/u.test(String((error as Error).message)));
  await assert.rejects(route.handler(call({ ...CONTEUDO_ENVELOPE, payload: undefined })), (error: unknown) => /payload is required/u.test(String((error as Error).message)));
  await assert.rejects(route.handler(call({ ...CONTEUDO_ENVELOPE, ref: { module: 'repoHost', eventId: 'other' } })), (error: unknown) => (error as { statusCode?: number }).statusCode === 400 && /receives repoHost\.repositorioAlterado/u.test(String((error as Error).message)));
});

void test('d1_225: only a page whose every route is a confirmation is written by code; a route with a usecase, or a page that is not an event page, goes to the model', () => {
  assert.equal(confirmOnlySource({ pageId: 'p', requests: [{ ...CONTEUDO_ROW, uses: ['doIt'] }] }, CONTEUDO_REF), null);
  assert.equal(confirmOnlySource({ pageId: 'p', requests: [CONTEUDO_ROW, { route: 'm.p.other', kind: 'qry', uses: [] }] }, CONTEUDO_REF), null);
  assert.equal(confirmOnlySource({ pageId: 'p', requests: [CONTEUDO_ROW, { ...CONTEUDO_ROW, route: 'm.p.second', consumes: 'repoHost.second', uses: ['x'] }] }, CONTEUDO_REF), null);
  assert.equal(confirmOnlySource({ pageId: 'p', requests: [] }, CONTEUDO_REF), null);
  const two = confirmOnlySource({ pageId: 'p', requests: [CONTEUDO_ROW, { ...CONTEUDO_ROW, route: 'conteudo.repoHost.second', consumes: 'repoHost.second' }] }, CONTEUDO_REF);
  assert.ok(two);
  assert.match(two, /export interface RepoHostSecondMessage/u);
  assert.match(two, /'conteudo\.repoHost\.second': async function \(input\) \{ return confirmReceipt\(input, 'repoHost', 'second'\); \}/u);
});
