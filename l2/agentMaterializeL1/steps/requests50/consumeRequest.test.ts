/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/consumeRequest.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { emitController } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { consumeMessageTypeName } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { loadRequestContext, normalizeRequestsTyping, requestGate } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { requestServiceServes } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PROJECT = 102099;
const MODULE = 'stock';
const ROUTE = `${MODULE}.purchasing.goodsReceived`;
const RECORDED = readFileSync(path.join(HERE, 'fixtures/purchasingConsumeRoute.recorded.txt'), 'utf8');
const norm = (ref: string) => ref.replace(/^\//u, '');

// The receiver: it writes a stock move when the goods arrive. The publisher: it declares the event on the receipt it confirms.
const RECEIVER_L4 = `export const stockIntegration = ${JSON.stringify({
  inbound: [{ id: 'goodsReceived', kind: 'event', from: 'purchasing', event: 'goodsReceived', writes: ['StockMove'], effect: 'create', description: 'Goods arrived: stock moves in.' }],
})} as const;`;
const PUBLISHER_L4 = `export const purchasingIntegration = ${JSON.stringify({
  outbound: [{ id: 'goodsReceived', kind: 'event', on: 'Receipt.confirm', to: 'any', description: 'The receipt of goods was confirmed.' }],
})} as const;`;
const RECEIPT = `export const receipt = ${JSON.stringify({ entityId: 'Receipt', fields: [{ id: 'receiptId', type: 'string' }, { id: 'lines', type: 'list' }] })} as const;`;

function envelope(artifactType: string, artifactId: string, data: Record<string, unknown>): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, artifactType: artifactType as M1Definition['artifactType'], artifactId, moduleName: MODULE, status: 'pending', dependencies: [], data };
}

function unit(): M12Unit {
  const definition = envelope('requestService', 'purchasing', {
    pageId: 'purchasing',
    requests: [{ route: ROUTE, kind: 'cmd', uses: ['createStockMove'], transaction: 'single', output: [], params: [], rules: [], consumes: 'purchasing.goodsReceived' }],
  });
  return { definition, declared: definition, outputRef: `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/purchasing.ts`, defRef: `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/purchasing.defs.ts`, unitId: 'purchasing', layer: 'requests', text: '' } as unknown as M12Unit;
}

function files(overrides: Record<string, string | null> = {}): (ref: string) => Promise<string | null> {
  const base: Record<string, string> = {
    [`_${PROJECT}_/l4/${MODULE}/integration.defs.ts`]: RECEIVER_L4,
    [`_${PROJECT}_/l4/purchasing/integration.defs.ts`]: PUBLISHER_L4,
    [`_${PROJECT}_/l4/purchasing/ontology/Receipt.defs.ts`]: RECEIPT,
  };
  return async ref => {
    const key = norm(ref);
    return key in overrides ? overrides[key] : base[key] ?? null;
  };
}

const ctxOf = (read: (ref: string) => Promise<string | null>) => ({ run: { project: PROJECT, module: MODULE }, units: [unit()], read }) as never;

void test('d1_217 s2: the prompt of a route that receives an event shows the inbound line, the publisher line and the entity it writes', async () => {
  const loaded = await loadRequestContext(ctxOf(files()), unit());
  assert.equal(consumeMessageTypeName('purchasing.goodsReceived'), 'PurchasingGoodsReceivedMessage');
  assert.equal(loaded.contractsInterface, `{ '${ROUTE}': (input: PurchasingGoodsReceivedMessage, ctx: RequestContext) => Promise<{ received: true }> }`);
  assert.match(loaded.human, /## Event purchasing\.goodsReceived \(l4, source\)/u);
  assert.match(loaded.human, /Goods arrived: stock moves in\./u);
  assert.match(loaded.human, /The receipt of goods was confirmed\./u);
  assert.match(loaded.human, /The entity Receipt the publisher writes/u);
  assert.match(loaded.human, /"receiptId"|receiptId/u);
  assert.match(loaded.human, /checks every field of the message it uses \(present and of the right type\) and throws a distinct error naming the field when one is missing or wrong, never filling a default value/u);
  assert.match(loaded.human, /stock\.purchasing\.goodsReceived → createStockMove/u);
  assert.deepEqual(loaded.serveUses, [{ route: ROUTE, uses: ['createStockMove'] }]);
  assert.deepEqual(loaded.routes.map(route => [route.route, route.kind]), [[ROUTE, 'cmd']]);
  assert.equal(loaded.contractSpecifier, '', 'the message types are declared in the file: nothing to import');
});

void test('d1_217 s2: a publisher with no L4, an event it does not declare and an entity it does not have are distinct errors naming the module', async () => {
  const rejects = (overrides: Record<string, string | null>, pattern: RegExp) => assert.rejects(() => loadRequestContext(ctxOf(files(overrides)), unit()), pattern);
  await rejects({ [`_${PROJECT}_/l4/purchasing/integration.defs.ts`]: null }, /PUBLISHER_NOT_DECLARED: module purchasing has no readable/u);
  await rejects({ [`_${PROJECT}_/l4/purchasing/integration.defs.ts`]: 'export const x = {"outbound":[]} as const;' }, /PUBLISHER_EVENT_NOT_DECLARED: module purchasing does not declare the event goodsReceived/u);
  await rejects({ [`_${PROJECT}_/l4/purchasing/ontology/Receipt.defs.ts`]: null }, /PUBLISHER_ENTITY_UNREAD: .*Receipt\.defs\.ts/u);
});

void test('d1_217 s2: the recorded route passes the gate and calls the usecase in the transaction; one that does not is refused', async () => {
  const loaded = await loadRequestContext(ctxOf(files()), unit());
  const gate = { header: RECORDED.split('\n')[0], contractsInterface: loaded.contractsInterface, routes: loaded.routes, project: PROJECT, moduleName: MODULE, pageId: 'purchasing', waived: new Set<string>(), serveUses: loaded.serveUses };
  assert.deepEqual(requestGate(RECORDED, gate), []);
  const idle = RECORDED.replace('await createStockMove({ productId: line.productId, quantity: line.quantity }, ctx);', 'void line;');
  assert.ok(requestGate(idle, gate).some(item => item.includes('createStockMove')), 'the route must call its usecase');
  const noTransaction = RECORDED.replace('ctx.data.moduleData.runInTransaction(async () => {', '(async () => {').replace('    });\n    return', '    })();\n    return');
  assert.ok(requestGate(noTransaction, gate).some(item => item.includes('runInTransaction')));
  assert.ok(requestGate(RECORDED.replace('Promise<{ received: true }>', 'Promise<void>'), gate).some(item => item.includes('must be typed')));
  assert.ok(requestGate(`${RECORDED}\nconst gone = await fetch('https://example.test');\n`, gate).some(item => item.includes('fetch')));
});

void test('d1_217 s2: the typing of the answer is set by code and imports nothing for a type the file declares', async () => {
  const loaded = await loadRequestContext(ctxOf(files()), unit());
  const loose = RECORDED.replace(/export const requests: [\s\S]*? = \{/u, 'export const requests = {').replace("import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';\n", '');
  const typed = normalizeRequestsTyping(loose, loaded.contractsInterface, loaded.contractSpecifier);
  assert.match(typed, /export const requests: \{ 'stock\.purchasing\.goodsReceived': \(input: PurchasingGoodsReceivedMessage, ctx: RequestContext\) => Promise<\{ received: true \}> \} = \{/u);
  assert.match(typed, /import type \{ RequestContext \} from '\/_102034_\/l1\/server\/layer_2_controllers\/contracts\.js';/u);
  assert.equal(/import type \{ PurchasingGoodsReceivedMessage \}/u.test(typed), false, 'no import of a type the file declares');
  assert.equal(/from ''/u.test(typed), false);
});

void test('d1_217 s2: the controller of the route reads the message type the request service exports and validates its fields', async () => {
  const folder = `_${PROJECT}_/l1/${MODULE}/layer_2_application`;
  const service = `export const definition = ${JSON.stringify(unit().definition)} as const;\n`;
  const scope = 'export const definition = {"dependencies":[],"data":{}} as const;\n';
  const read = async (ref: string): Promise<string | null> => {
    const key = norm(ref);
    if (key === `${folder}/requests/purchasing.defs.ts`) return service;
    if (key === `${folder}/requests/purchasing.ts`) return RECORDED;
    if (key.endsWith('/accessScope.defs.ts') || key.endsWith('/authorityMap.defs.ts')) return scope;
    return null;
  };
  // The controller needs the dependencies of the def: scope, authority and the request service.
  const withDeps = async (requestsSource: string | null) => {
    const definition = envelope('httpController', 'purchasing', { pageId: 'purchasing', handlers: [{ route: ROUTE, serviceFunction: ROUTE, grantIds: ['module_purchasing'] }] });
    definition.dependencies = [`${folder}/access/accessScope.defs.ts`, `${folder}/access/authorityMap.defs.ts`, `${folder}/requests/purchasing.defs.ts`];
    return emitController(definition, 'purchasing.ts', async ref => (norm(ref) === `${folder}/requests/purchasing.ts` ? requestsSource : read(ref)));
  };
  const emitted = await withDeps(RECORDED);
  assert.equal('code' in emitted, false, JSON.stringify(emitted));
  if ('code' in emitted) return;
  assert.match(emitted.source, /import type \{ PurchasingGoodsReceivedMessage \} from '\/_102099_\/l1\/stock\/layer_2_application\/requests\/purchasing\.js';/u);
  assert.match(emitted.source, /Promise<BffResponse<\{ received: true \}>>/u);
  assert.match(emitted.source, /\['receiptId', 'lines', 'lines\.productId', 'lines\.quantity'\]|\['receiptId'/u, 'the required fields come from the message type');
  assert.match(emitted.source, /module_purchasing/u);
  // A request service that does not export its message type is a distinct problem, and so is an alias that is not an object.
  const missing = await withDeps(RECORDED.replace('export interface PurchasingGoodsReceivedMessage', 'interface Other'));
  assert.equal('code' in missing ? missing.code : '', 'CONSUMES_MESSAGE_UNREAD');
  const union = await withDeps(RECORDED.replace(/export interface PurchasingGoodsReceivedMessage \{[\s\S]*?\n\}/u, 'export type PurchasingGoodsReceivedMessage = { a: string } | { b: string };'));
  assert.equal('code' in union ? union.code : '', 'CATALOG_INPUT_NOT_OBJECT');
  const unread = await withDeps(null);
  assert.equal('code' in unread ? unread.code : '', 'CONSUMES_REQUESTS_UNREAD');
});

void test('d1_217: a page that receives events has no page test, as a connection page has none', () => {
  assert.equal(requestServiceServes(unit().definition.data), true);
  assert.equal(requestServiceServes({ requests: [{ route: 'x', kind: 'qry' }] }), false);
});
