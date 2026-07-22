/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbScope.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeBackendScan, type CbScopeInput } from './cbScope.js';

// Minimal fixtures — scopeBackendScan only reads moduleName / entityId / fromEntity / toEntity.
const owner = (id: string, moduleName: string) => ({ kind: 'operation', id, moduleName }) as unknown as CbScopeInput['owners'][number];
const entity = (entityId: string, moduleName: string) => ({ entityId, moduleName }) as unknown as CbScopeInput['entities'][number];
const rel = (fromEntity: string, toEntity: string) => ({ fromEntity, toEntity, type: 'manyToOne' }) as unknown as CbScopeInput['relationships'][number];
const ws = (workspaceId: string, moduleName: string) => ({ workspaceId, moduleName }) as unknown as CbScopeInput['workspaces'][number];
const actor = (actorId: string, moduleName: string) => ({ actorId, moduleName }) as unknown as CbScopeInput['actors'][number];

function base(requestedModule: string): CbScopeInput {
  return {
    owners: [owner('createOrder', 'cafeFlow'), owner('bookRoom', 'petShop')],
    entities: [entity('Order', 'cafeFlow'), entity('MenuItem', 'cafeFlow'), entity('Reservation', 'petShop')],
    relationships: [rel('Order', 'MenuItem'), rel('Reservation', 'Order')], // 2nd crosses modules
    workspaces: [ws('pos', 'cafeFlow'), ws('front', 'petShop')],
    actors: [actor('waiter', 'cafeFlow'), actor('groomer', 'petShop')],
    allModuleNames: ['cafeFlow', 'petShop'],
    requestedModule,
  };
}

test('scopeBackendScan: explicit requested module wins over the first-sorted module', () => {
  const r = scopeBackendScan(base('petShop'));
  assert.equal(r.moduleName, 'petShop');
  assert.deepEqual(r.owners.map(o => (o as { id: string }).id), ['bookRoom']);
  assert.deepEqual(r.entities.map(e => (e as { entityId: string }).entityId), ['Reservation']);
  assert.deepEqual(r.workspaces.map(w => (w as { workspaceId: string }).workspaceId), ['front']);
  assert.deepEqual(r.actors.map(a => (a as { actorId: string }).actorId), ['groomer']);
  assert.equal(r.warning, null);
});

test('scopeBackendScan: no requested module -> first (sorted) module with owners', () => {
  const r = scopeBackendScan(base(''));
  assert.equal(r.moduleName, 'cafeFlow'); // sorts before petShop and has owners
  assert.deepEqual(r.owners.map(o => (o as { id: string }).id), ['createOrder']);
  assert.deepEqual(r.entities.map(e => (e as { entityId: string }).entityId), ['Order', 'MenuItem']);
});

test('scopeBackendScan: relationships kept only when BOTH endpoints are in scope', () => {
  const r = scopeBackendScan(base('cafeFlow'));
  // Order->MenuItem stays (both cafeFlow); Reservation->Order dropped (Reservation is petShop).
  assert.deepEqual(r.relationships.map(x => `${(x as { fromEntity: string }).fromEntity}->${(x as { toEntity: string }).toEntity}`), ['Order->MenuItem']);
});

test('scopeBackendScan: requested module absent -> empty owners + warning (no work, no cross-module)', () => {
  const r = scopeBackendScan(base('ghostModule'));
  assert.equal(r.moduleName, 'ghostModule');
  assert.deepEqual(r.owners, []);
  assert.deepEqual(r.entities, []);
  assert.match(r.warning || '', /requested module 'ghostModule' not found/);
});

test('scopeBackendScan: empty project (no owners, no modules) returns unscoped and no warning', () => {
  const r = scopeBackendScan({ owners: [], entities: [], relationships: [], workspaces: [], actors: [], allModuleNames: [], requestedModule: '' });
  assert.equal(r.moduleName, '');
  assert.equal(r.warning, null);
});
