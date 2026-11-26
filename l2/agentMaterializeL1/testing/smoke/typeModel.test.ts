/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { conformsTo, sampleOf, typeNodeOf, typeTableOf } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

const TABLE = typeTableOf([`
export interface Item { id: string; qty: number; tags: string[]; note?: string; kind: 'a' | 'b'; when: string | null; sub: { ok: boolean } }
export type Outcome =
  | { success: true; name: string }
  | { success: false; reason: string };
export interface Page { items: Item[]; hasMore: boolean }
`]);

void test('d1_321 B: the smallest valid value of an interface, a union (success or failure member) and a page', () => {
  assert.deepEqual(sampleOf(typeNodeOf('Item'), TABLE), { id: 'sample', qty: 1, tags: [], kind: 'a', when: 'sample', sub: { ok: true } });
  assert.deepEqual(sampleOf(typeNodeOf('Outcome'), TABLE, { prefer: 'success' }), { success: true, name: 'sample' });
  assert.deepEqual(sampleOf(typeNodeOf('Outcome'), TABLE, { prefer: 'failure' }), { success: false, reason: 'sample' });
  assert.deepEqual(sampleOf(typeNodeOf('Page'), TABLE), { items: [], hasMore: true });
});

void test('d1_321 B: a sample fits its own type; a missing field, a null the type lacks and a wrong member are named', () => {
  const item = typeNodeOf('Item');
  assert.deepEqual(conformsTo(sampleOf(item, TABLE), item, TABLE), []);
  assert.deepEqual(conformsTo({ id: 'x', qty: 1, tags: [], kind: 'a', when: null, sub: { ok: true } }, item, TABLE), []);
  assert.deepEqual(conformsTo({ id: 'x', tags: [], kind: 'a', when: null, sub: { ok: true } }, item, TABLE), ['$.qty: missing']);
  assert.deepEqual(conformsTo({ id: null, qty: 1, tags: [], kind: 'a', when: null, sub: { ok: true } }, item, TABLE), ['$.id: null where the type has no null']);
  assert.deepEqual(conformsTo({ id: 'x', qty: 1, tags: [], kind: 'c', when: null, sub: { ok: true } }, item, TABLE).length, 1);
  const outcome = typeNodeOf('Outcome');
  assert.deepEqual(conformsTo({ success: false, reason: 'r' }, outcome, TABLE), []);
  assert.equal(conformsTo({ success: false, result: 'r' }, outcome, TABLE).length > 0, true);
});
