/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkspaceDefs } from './cbWorkspace.js';

// Mirrors the real l4 v2 shape of mls-102049/l4/petShop/workspaces/catalog.defs.ts (2 bffCalls: a
// paginated query with a filterControl and an object detail query). Keeps the B1 reader honest.
function catalogWorkspace(): Record<string, unknown> {
  return {
    workspaceId: 'catalog',
    title: 'Catálogo de produtos',
    actors: ['cliente'],
    kind: 'operation',
    entity: 'Product',
    bffCalls: [
      {
        bffId: 'catalogList',
        kind: 'query',
        uses: [{ operationId: 'browseCatalog' }],
        input: [
          { name: 'searchTerm', from: 'browseCatalog.searchTerm' },
          { name: 'page', from: 'browseCatalog.page' },
        ],
        output: {
          kind: 'paginated',
          fields: [
            { name: 'productId', from: 'browseCatalog.$items.productId' },
            { name: 'name', from: 'browseCatalog.$items.name' },
          ],
        },
        route: 'petShop.catalog.catalogList',
      },
      {
        bffId: 'productDetail',
        kind: 'query',
        uses: [{ operationId: 'viewProductDetail' }],
        input: [{ name: 'productId', from: 'viewProductDetail.productId' }],
        output: { kind: 'object', fields: [{ name: 'productId', from: 'viewProductDetail.productId' }] },
        route: 'petShop.catalog.productDetail',
      },
    ],
    operationIds: ['browseCatalog', 'viewProductDetail'],
    purpose: 'Navegar e filtrar o catálogo',
  };
}

test('parseWorkspaceDefs reads bffCalls, projection and plural actors from a v2 workspace', () => {
  const ws = parseWorkspaceDefs(catalogWorkspace(), 'petShop');
  assert.ok(ws, 'workspace parsed');
  assert.equal(ws!.workspaceId, 'catalog');
  assert.equal(ws!.moduleName, 'petShop');
  assert.deepEqual(ws!.actors, ['cliente']);
  assert.equal(ws!.bffCalls.length, 2);
  const list = ws!.bffCalls[0];
  assert.equal(list.bffId, 'catalogList');
  assert.equal(list.kind, 'query');
  assert.deepEqual(list.uses, [{ operationId: 'browseCatalog' }]);
  assert.equal(list.route, 'petShop.catalog.catalogList');
  assert.equal(list.output?.kind, 'paginated');
  assert.equal(list.output?.fields[0].from, 'browseCatalog.$items.productId');
  // operationIds are the union of uses (deprecated inline field only fills gaps).
  assert.deepEqual(ws!.operationIds, ['browseCatalog', 'viewProductDetail']);
});

test('parseWorkspaceDefs folds the singular v1 `actor` and derives a missing route', () => {
  const raw = {
    workspaceId: 'reservationPanel',
    actor: 'lojista', // v1 singular
    kind: 'workflow',
    bffCalls: [{ bffId: 'reservationList', kind: 'query', uses: [{ operationId: 'browseReservations' }] }],
  };
  const ws = parseWorkspaceDefs(raw, 'petShop');
  assert.ok(ws);
  assert.deepEqual(ws!.actors, ['lojista']);
  // route omitted in the defs -> derived deterministically as <module>.<workspaceId>.<bffId>.
  assert.equal(ws!.bffCalls[0].route, 'petShop.reservationPanel.reservationList');
});

test('parseWorkspaceDefs parses a command passthrough (no output) and optional composed uses', () => {
  const raw = {
    workspaceId: 'reservationPanel',
    actors: ['lojista'],
    kind: 'workflow',
    bffCalls: [
      { bffId: 'confirmReserva', kind: 'command', uses: [{ operationId: 'confirmReservation' }] },
      {
        bffId: 'pageLoad',
        kind: 'query',
        uses: [{ operationId: 'getSummary' }, { operationId: 'getFinance', optional: true }],
        output: {
          kind: 'object',
          fields: [
            { name: 'summary', from: 'getSummary.summary', item: { fields: [{ name: 'x', from: 'getSummary.$items.x' }] } },
            { name: 'finance', from: 'getFinance.total' },
          ],
        },
      },
    ],
  };
  const ws = parseWorkspaceDefs(raw, 'petShop');
  assert.ok(ws);
  const [cmd, page] = ws!.bffCalls;
  assert.equal(cmd.kind, 'command');
  assert.equal(cmd.output, undefined); // passthrough: no projection
  assert.deepEqual(page.uses, [{ operationId: 'getSummary' }, { operationId: 'getFinance', optional: true }]);
  assert.equal(page.output?.fields[0].item?.fields[0].from, 'getSummary.$items.x');
});

test('parseWorkspaceDefs rejects a workspace without an id', () => {
  assert.equal(parseWorkspaceDefs({ bffCalls: [] }, 'petShop'), null);
});
