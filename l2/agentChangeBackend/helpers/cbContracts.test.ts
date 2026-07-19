/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveItemsArrayField, parseFromPath, resolveBffProjection, envelopeKindOf, renderBffContract,
  type CbContractTypes,
} from './cbContracts.js';
import { parseWorkspaceDefs } from './cbWorkspace.js';

// Type resolver stub: everything resolves to the token we hand it (keyed loosely for the tests).
function types(map: Record<string, string> = {}): CbContractTypes {
  return {
    inputType: (op, f) => map[`i:${op}.${f}`] || 'string',
    outputType: (op, c, fromItems) => map[`o:${op}.${c}:${fromItems ? 'item' : 'top'}`] || 'string',
  };
}

test('parseFromPath splits top-level and $items paths', () => {
  assert.deepEqual(parseFromPath('browseCatalog.total'), { operationId: 'browseCatalog', fromItems: false, path: ['total'] });
  assert.deepEqual(parseFromPath('browseCatalog.$items.productId'), { operationId: 'browseCatalog', fromItems: true, path: ['productId'] });
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
function paginatedWs() {
  return parseWorkspaceDefs({
    workspaceId: 'acompanharReservas', actors: ['equipeLoja'], kind: 'workflow',
    bffCalls: [{
      bffId: 'listReservations', kind: 'query', uses: [{ operationId: 'browseReservations' }],
      input: [{ name: 'statusFilter', from: 'browseReservations.statusFilter' }, { name: 'page', from: 'browseReservations.page' }],
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
}

test('resolveBffProjection: nested paginated -> item cols + declared array name + meta topFields', () => {
  const bff = paginatedWs().bffCalls[0];
  assert.equal(envelopeKindOf(bff), 'paginated');
  const p = resolveBffProjection(bff);
  assert.equal(p.kind, 'paginated');
  assert.equal(p.arrayFieldName, 'reservations');       // DECLARED wire array name (not "items")
  assert.equal(p.arrayOperationId, 'browseReservations');
  assert.deepEqual(p.itemFields.map(f => [f.name, f.path.join('.')]), [['reservationId', 'reservationId'], ['customerName', 'customerName']]);
  assert.deepEqual(p.topFields.map(f => f.name), ['total', 'page', 'pageSize']);
});

// Canonical LIST: flat item columns at top level; the wire is a BARE array.
function listWs() {
  return parseWorkspaceDefs({
    workspaceId: 'catalogo', actors: ['cliente'], kind: 'operation',
    bffCalls: [{
      bffId: 'browseCatalog', kind: 'query', uses: [{ operationId: 'browseProducts' }],
      input: [{ name: 'searchName', from: 'browseProducts.searchName' }],
      output: { kind: 'list', fields: [
        { name: 'productId', from: 'browseProducts.$items.productId' },
        { name: 'name', from: 'browseProducts.$items.name' },
        { name: 'price', from: 'browseProducts.$items.price' },
      ] },
    }],
  }, 'petShop')!;
}

test('resolveBffProjection: list -> flat item cols, bare array (no declared array name)', () => {
  const bff = listWs().bffCalls[0];
  assert.equal(envelopeKindOf(bff), 'list');
  const p = resolveBffProjection(bff);
  assert.equal(p.kind, 'list');
  assert.equal(p.arrayFieldName, null);                 // bare array wire
  assert.equal(p.arrayOperationId, 'browseProducts');
  assert.deepEqual(p.itemFields.map(f => f.name), ['productId', 'name', 'price']);
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

// ── renderBffContract: the l1 contract is GENERATED from the bffCall (never read from an l4 .ts) ──

test('renderBffContract: list -> bare-array Output + Item interface + route const', () => {
  const bff = listWs().bffCalls[0];
  const src = renderBffContract(102049, 'petShop', 'catalogo', bff, types({ 'o:browseProducts.price:item': 'number' }));
  assert.match(src, /fileReference="_102049_\/l1\/petShop\/contracts\/catalogo\.browseCatalog\.ts"/);
  assert.doesNotMatch(src, /l4\/petShop\/contracts/); // never references an l4 .ts
  assert.match(src, /export interface BrowseCatalogInput \{/);
  assert.match(src, /export interface BrowseCatalogItem \{/);
  assert.match(src, /price: number;/);
  assert.match(src, /export type BrowseCatalogOutput = BrowseCatalogItem\[\];/); // BARE array
  assert.match(src, /export const browseCatalogRoute = 'petShop\.catalogo\.browseCatalog' as const;/);
});

test('renderBffContract: paginated -> wrapper with declared array name + nested item + meta', () => {
  const bff = paginatedWs().bffCalls[0];
  const src = renderBffContract(102049, 'petShop', 'acompanharReservas', bff, types({ 'o:browseReservations.total:top': 'number' }));
  assert.match(src, /export interface ListReservationsReservationsItem \{/);
  assert.match(src, /reservationId: string;/);
  assert.match(src, /export interface ListReservationsOutput \{/);
  assert.match(src, /reservations: ListReservationsReservationsItem\[\];/); // DECLARED name, not "items"
  assert.match(src, /total: number;/);
  assert.match(src, /export const listReservationsRoute = 'petShop\.acompanharReservas\.listReservations' as const;/);
});

test('renderBffContract: command passthrough (no output) emits Input + route but no Output', () => {
  const ws = parseWorkspaceDefs({
    workspaceId: 'carrinhoReserva', actors: ['cliente'], kind: 'workflow',
    bffCalls: [{ bffId: 'submitReservation', kind: 'command', uses: [{ operationId: 'createReservation' }],
      input: [{ name: 'items', from: 'createReservation.items' }] }],
  }, 'petShop')!;
  const src = renderBffContract(102049, 'petShop', 'carrinhoReserva', ws.bffCalls[0], types());
  assert.match(src, /export interface SubmitReservationInput \{/);
  assert.doesNotMatch(src, /export (interface|type) SubmitReservationOutput/); // no Output for passthrough
  assert.match(src, /export const submitReservationRoute = /);
});
