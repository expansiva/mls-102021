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
