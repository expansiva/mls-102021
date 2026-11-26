/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smoke.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { entityOfIdParam, planSmoke } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokePlan.js';

function fixtureTree(): string {
  const tree = mkdtempSync(path.join(os.tmpdir(), 'smoke-plan-'));
  const write = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true }); writeFileSync(path.join(tree, rel), text); };
  write('l2/demo/web/contracts/items.defs.ts', `
export interface Item { id: string; name: string; status: 'open' | 'closed'; note?: string }
export interface ItemsContracts {
  'demo.items.getItem': { kind: 'qry'; input: { id: string }; output: { item: Item }; access: { actors: ['clerk']; grants: ['read']; scope: 'organization' } };
  'demo.items.createItem': { kind: 'cmd'; input: { name: string; tags?: string[] }; output: { item: Item }; access: { actors: ['clerk']; grants: ['write']; scope: 'organization' } };
}
`);
  write('l1/demo/layer_2_application/requests/items.defs.ts', `export const definition = ${JSON.stringify({ data: { pageId: 'items', requests: [{ route: 'demo.items.getItem', params: [], output: [{ kind: 'entity', entity: 'Item' }] }] } })} as const;`);
  write('l1/demo/layer_1_external/adapters/integration/outbound.ts', `
import type { PingOutput } from '/_102099_/l1/demo/layer_1_external/connections/ping.js';
export interface PingGateway {
  ping(input: unknown, ctx: unknown): Promise<PingOutput>;
}
`);
  write('l1/demo/layer_1_external/connections/ping.ts', `export type PingOutput = { ok: true; at: string } | { ok: false; reason: string };`);
  return tree;
}

void test('d1_321 B: the plan has one case per route with the smallest input, the id bound to the output entity, the actor of the contract, and the gateway answers from the catalog type', () => {
  const plan = planSmoke(fixtureTree(), 102099, 'demo', '/nowhere');
  assert.deepEqual(plan.routes.map(item => [item.route, item.kind, item.actor, item.input]), [
    ['demo.items.getItem', 'qry', 'clerk', { id: '<seed:Item.id>' }],
    ['demo.items.createItem', 'cmd', 'clerk', { name: 'sample' }],
  ]);
  assert.deepEqual(plan.gateways.map(gateway => [gateway.name, gateway.methods.map(method => [method.name, method.success, method.failure])]), [
    ['PingGateway', [['ping', { ok: true, at: 'sample' }, { ok: false, reason: 'sample' }]]],
  ]);
});

void test('d1_321 B: an id param points at an entity of the output by the name, never by a fixed word', () => {
  assert.equal(entityOfIdParam('id', ['Bot', 'Agent']), 'Bot');
  assert.equal(entityOfIdParam('conversationId', ['TelegramBot', 'TelegramConversation']), 'TelegramConversation');
  assert.equal(entityOfIdParam('page', ['Bot']), '');
  assert.equal(entityOfIdParam('orderId', []), '');
});

import { compareReports } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokeCompare.js';
import type { SmokeCaseResult, SmokeReport } from '/_102021_/l2/agentMaterializeL1/testing/smoke/runSmoke.js';
import { sampleOf, typeNodeOf, typeTableOf } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

function arrivalTree(): string {
  const tree = mkdtempSync(path.join(os.tmpdir(), 'smoke-arrival-'));
  const write = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true }); writeFileSync(path.join(tree, rel), text); };
  write('l1/demo/layer_3_domain/entities/ticket.ts', 'export interface Ticket { id: string }\n');
  write('l1/demo/layer_3_domain/entities/ticketBot.ts', 'export interface TicketBot { id: string }\n');
  write('l1/demo/layer_2_application/requests/hub.defs.ts', `export const definition = ${JSON.stringify({ data: { pageId: 'hub', requests: [{ route: 'demo.hub.close', kind: 'cmd', serves: 'hub.close' }, { route: 'demo.hub.noSuchOperation', kind: 'cmd', serves: 'hub.nothing' }] } })} as const;\n`);
  write('l1/demo/layer_1_external/connections/hub.ts', `
export type CloseInput = { target: { ticketRef: string } | { botRef: string }; reason: string };
export type CloseOutput = Record<string, never>;
export const hub = {
  "operations": [
    {
      "operationId": "close",
      "direction": "serve",
      "inputType": "CloseInput",
      "outputType": "CloseOutput"
    }
  ]
};
`);
  return tree;
}

void test('d1_330 s1: an operation the module serves is planned from the catalog type, one case per way a union input is called, refs bound to the stored record by the name', () => {
  const plan = planSmoke(arrivalTree(), 102099, 'demo', '/nowhere');
  const arrivals = plan.routes.filter(item => item.arrival);
  assert.deepEqual(arrivals.map(item => [item.route, item.kind, item.variant, item.input]), [
    ['demo.hub.close', 'arrival', 'reason+target.ticketRef', { target: { ticketRef: '<seed:Ticket.id>' }, reason: 'sample' }],
    ['demo.hub.close', 'arrival', 'reason+target.botRef', { target: { botRef: '<seed:TicketBot.id>' }, reason: 'sample' }],
  ]);
  assert.equal(arrivals[0].outputType, 'CloseOutput');
  assert.ok(plan.typeSources['arrival:hub']);
  assert.equal(plan.routes.some(item => item.route === 'demo.hub.noSuchOperation'), false, 'an operation the catalog does not name is not planned');
});

void test('d1_330 s1: sampleOf takes the nth member of a union', () => {
  const table = typeTableOf([]);
  const node = typeNodeOf('{ a: string } | { b: number }');
  assert.deepEqual([0, 1, 5].map(variant => sampleOf(node, table, { variant })), [{ a: 'sample' }, { b: 1 }, { b: 1 }]);
});

function report(results: Array<Partial<SmokeCaseResult> & { route: string; verdict: SmokeCaseResult['verdict'] }>): SmokeReport {
  const full = results.map(item => ({ pass: 'happy' as const, kind: 'cmd', status: null, code: null, message: null, conforms: [], output: null, ...item }));
  return { module: 'demo', routes: full.length, executed: full.length, results: full, raw: '', seconds: 0 };
}

void test('d1_330 s2: the comparison lists a verdict that changed, a code that changed, a type that stopped fitting, a case that appeared or went; the same smoke twice has none', () => {
  const before = report([
    { route: 'a', verdict: 'ok' },
    { route: 'b', verdict: 'refused', status: 400, code: 'OLD_CODE' },
    { route: 'c', verdict: 'ok' },
    { route: 'gone', verdict: 'ok' },
    { route: 'same', verdict: 'refused', status: 404, code: 'NOT_FOUND' },
    { route: 'arrive', verdict: 'ok', variant: 'target.botRef' },
  ]);
  const after = report([
    { route: 'a', verdict: 'refused', status: 403, code: 'FORBIDDEN' },
    { route: 'b', verdict: 'refused', status: 400, code: 'NEW_CODE' },
    { route: 'c', verdict: 'ok', conforms: ['$.x: missing'] },
    { route: 'new', verdict: 'ok' },
    { route: 'same', verdict: 'refused', status: 404, code: 'NOT_FOUND' },
    { route: 'arrive', verdict: 'refused', status: 403, code: 'FORBIDDEN', variant: 'target.botRef' },
  ]);
  assert.deepEqual(compareReports(before, after).map(item => [item.kind, item.key]), [
    ['verdict', 'happy a'],
    ['code', 'happy b'],
    ['typed', 'happy c'],
    ['disappeared', 'happy gone'],
    ['verdict', 'happy arrive [target.botRef]'],
    ['appeared', 'happy new'],
  ]);
  assert.deepEqual(compareReports(before, before), []);
});
