/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rewriteContractHeaderToL1, resolveItemsArrayField, parseFromPath, resolveBffProjection, envelopeKindOf,
} from './cbContracts.js';
import { parseWorkspaceDefs } from './cbWorkspace.js';

test('rewriteContractHeaderToL1 repoints fileReference to l1 and stamps the copied note', () => {
  const l4 = [
    '/// <mls fileReference="_102049_/l4/petShop/contracts/catalog.catalogList.ts" enhancement="_blank"/>',
    '',
    'export interface CatalogListInput { page?: number; }',
    '',
  ].join('\n');
  const l1 = rewriteContractHeaderToL1(l4, 102049, 'petShop', 'catalog.catalogList', '.ts');
  assert.match(l1, /fileReference="_102049_\/l1\/petShop\/contracts\/catalog\.catalogList\.ts"/);
  assert.doesNotMatch(l1, /l4\/petShop\/contracts\/catalog\.catalogList\.ts"/); // the reference itself moved to l1
  assert.match(l1, /COPIED FROM l4 — do not edit\. Source of truth: _102049_\/l4\/petShop\/contracts\/catalog\.catalogList\.ts\./);
  assert.match(l1, /export interface CatalogListInput/); // body preserved
});

test('parseFromPath splits top-level and $items paths', () => {
  assert.deepEqual(parseFromPath('browseCatalog.total'), { operationId: 'browseCatalog', fromItems: false, path: ['total'] });
  assert.deepEqual(parseFromPath('browseCatalog.$items.productId'), { operationId: 'browseCatalog', fromItems: true, path: ['productId'] });
  assert.equal(parseFromPath(''), null);
  assert.equal(parseFromPath('nofield'), null);
});

test('resolveItemsArrayField finds the array field of a paginated operation outputShape', () => {
  const shape = { kind: 'paginated', fields: [{ name: 'products', type: 'array', item: { fields: [] } }, { name: 'total', type: 'number' }] };
  assert.equal(resolveItemsArrayField(shape), 'products');
  assert.equal(resolveItemsArrayField({ kind: 'object', fields: [{ name: 'x', type: 'string' }] }), null);
  assert.equal(resolveItemsArrayField(null), null);
});

// filaReservas-style paginated projection (the acceptance's fixture): item columns come from $items,
// the projection must resolve exactly the declared columns and classify them as item fields.
test('resolveBffProjection classifies a paginated bffCall into item columns', () => {
  const ws = parseWorkspaceDefs({
    workspaceId: 'reservasLoja',
    actors: ['atendente'],
    kind: 'workflow',
    bffCalls: [{
      bffId: 'filaReservas',
      kind: 'query',
      uses: [{ operationId: 'browseReservations' }],
      input: [{ name: 'status', from: 'browseReservations.statusFilter' }],
      output: {
        kind: 'paginated',
        fields: [
          { name: 'reservationCode', from: 'browseReservations.$items.reservationCode' },
          { name: 'status', from: 'browseReservations.$items.status' },
          { name: 'clienteNome', from: 'browseReservations.$items.customerName' },
        ],
      },
    }],
  }, 'petShop')!;
  const bff = ws.bffCalls[0];
  assert.equal(envelopeKindOf(bff), 'paginated');
  const proj = resolveBffProjection(bff);
  assert.equal(proj.topFields.length, 0);
  assert.deepEqual(proj.itemFields.map(f => [f.name, f.operationId, f.path.join('.'), f.fromItems]), [
    ['reservationCode', 'browseReservations', 'reservationCode', true],
    ['status', 'browseReservations', 'status', true],
    ['clienteNome', 'browseReservations', 'customerName', true], // rename customerName -> clienteNome
  ]);
});

test('resolveBffProjection classifies an object bffCall into top-level fields', () => {
  const ws = parseWorkspaceDefs({
    workspaceId: 'catalog',
    actors: ['cliente'],
    kind: 'operation',
    bffCalls: [{
      bffId: 'productDetail',
      kind: 'query',
      uses: [{ operationId: 'viewProductDetail' }],
      input: [{ name: 'productId', from: 'viewProductDetail.productId' }],
      output: { kind: 'object', fields: [
        { name: 'productId', from: 'viewProductDetail.productId' },
        { name: 'categoryName', from: 'viewProductDetail.categoryName' },
      ] },
    }],
  }, 'petShop')!;
  const bff = ws.bffCalls[0];
  assert.equal(envelopeKindOf(bff), 'object');
  const proj = resolveBffProjection(bff);
  assert.equal(proj.itemFields.length, 0);
  assert.deepEqual(proj.topFields.map(f => f.name), ['productId', 'categoryName']);
});
