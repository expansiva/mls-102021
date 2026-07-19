/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveItemsArrayField, parseFromPath, resolveBffProjection, envelopeKindOf } from './cbContracts.js';
import { parseWorkspaceDefs } from './cbWorkspace.js';

test('parseFromPath splits top-level and $items paths', () => {
  assert.deepEqual(parseFromPath('browseCatalog.total'), { operationId: 'browseCatalog', fromItems: false, path: ['total'] });
  assert.deepEqual(parseFromPath('browseCatalog.$items.productId'), { operationId: 'browseCatalog', fromItems: true, path: ['productId'] });
  assert.equal(parseFromPath('browseReservations.$items'), null); // bare $items -> handled by the array field, not a column
  assert.equal(parseFromPath(''), null);
  assert.equal(parseFromPath('nofield'), null);
});

test('resolveItemsArrayField finds the array field of a paginated operation outputShape', () => {
  const shape = { kind: 'paginated', fields: [{ name: 'reservations', type: 'array', item: { fields: [] } }, { name: 'total', type: 'number' }] };
  assert.equal(resolveItemsArrayField(shape), 'reservations');
  assert.equal(resolveItemsArrayField({ kind: 'list', fields: [{ name: 'productId', type: 'string' }] }), null); // list = flat, no array field
  assert.equal(resolveItemsArrayField(null), null);
});

// Canonical NESTED paginated (newSolution_10 §A2): one array field with nested item.fields + meta.
test('resolveBffProjection: nested paginated -> item cols + declared array name + meta topFields', () => {
  const ws = parseWorkspaceDefs({
    workspaceId: 'acompanharReservas', actors: ['equipeLoja'], kind: 'workflow',
    bffCalls: [{
      bffId: 'listReservations', kind: 'query', uses: [{ operationId: 'browseReservations' }],
      input: [{ name: 'statusFilter', from: 'browseReservations.statusFilter' }],
      output: { kind: 'paginated', fields: [
        { name: 'reservations', from: 'browseReservations.$items', item: { fields: [
          { name: 'reservationId', from: 'browseReservations.$items.reservationId' },
          { name: 'customerName', from: 'browseReservations.$items.customerName' },
        ] } },
        { name: 'total', from: 'browseReservations.total' },
        { name: 'page', from: 'browseReservations.page' },
        { name: 'pageSize', from: 'browseReservations.pageSize' },
      ] },
    }],
  }, 'petShop')!;
  const bff = ws.bffCalls[0];
  assert.equal(envelopeKindOf(bff), 'paginated');
  const p = resolveBffProjection(bff);
  assert.equal(p.kind, 'paginated');
  assert.equal(p.arrayFieldName, 'reservations');       // DECLARED wire array name (not "items")
  assert.equal(p.arrayOperationId, 'browseReservations');
  assert.deepEqual(p.itemFields.map(f => [f.name, f.path.join('.')]), [['reservationId', 'reservationId'], ['customerName', 'customerName']]);
  assert.deepEqual(p.topFields.map(f => f.name), ['total', 'page', 'pageSize']);
});

test('resolveBffProjection: list -> flat item cols, bare array (no declared array name)', () => {
  const ws = parseWorkspaceDefs({
    workspaceId: 'catalogo', actors: ['cliente'], kind: 'operation',
    bffCalls: [{ bffId: 'browseCatalog', kind: 'query', uses: [{ operationId: 'browseProducts' }],
      input: [{ name: 'searchName', from: 'browseProducts.searchName' }],
      output: { kind: 'list', fields: [
        { name: 'productId', from: 'browseProducts.$items.productId' },
        { name: 'name', from: 'browseProducts.$items.name' },
      ] } }],
  }, 'petShop')!;
  const p = resolveBffProjection(ws.bffCalls[0]);
  assert.equal(p.kind, 'list');
  assert.equal(p.arrayFieldName, null);                 // bare array wire
  assert.equal(p.arrayOperationId, 'browseProducts');
  assert.deepEqual(p.itemFields.map(f => f.name), ['productId', 'name']);
  assert.equal(p.topFields.length, 0);
});

test('resolveBffProjection: object -> top-level fields only', () => {
  const ws = parseWorkspaceDefs({
    workspaceId: 'catalogo', actors: ['cliente'], kind: 'operation',
    bffCalls: [{ bffId: 'productDetail', kind: 'query', uses: [{ operationId: 'viewProductDetail' }],
      input: [{ name: 'productId', from: 'viewProductDetail.productId' }],
      output: { kind: 'object', fields: [
        { name: 'productId', from: 'viewProductDetail.productId' },
        { name: 'categoryName', from: 'viewProductDetail.categoryName' },
      ] } }],
  }, 'petShop')!;
  const p = resolveBffProjection(ws.bffCalls[0]);
  assert.equal(p.kind, 'object');
  assert.equal(p.itemFields.length, 0);
  assert.deepEqual(p.topFields.map(f => f.name), ['productId', 'categoryName']);
});
