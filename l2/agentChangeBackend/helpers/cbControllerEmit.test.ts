/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkspaceController, type RenderControllerInput } from './cbControllerEmit.js';
import { parseWorkspaceDefs } from './cbWorkspace.js';
import type { CbOpOutputShapeView } from './cbContracts.js';

// A workspace with the three canonical output kinds: list (bare array), paginated (nested wrapper),
// object. Grounded in the real petShop v2 shapes.
function inp(): RenderControllerInput {
  const workspace = parseWorkspaceDefs({
    workspaceId: 'catalogo', title: 'Catálogo', actors: ['cliente'], kind: 'operation',
    bffCalls: [
      { bffId: 'browseCatalog', kind: 'query', uses: [{ operationId: 'browseProducts' }],
        input: [{ name: 'searchName', from: 'browseProducts.searchName' }],
        output: { kind: 'list', fields: [
          { name: 'productId', from: 'browseProducts.$items.productId' },
          { name: 'name', from: 'browseProducts.$items.name' },
        ] } },
      { bffId: 'productDetail', kind: 'query', uses: [{ operationId: 'viewProductDetail' }],
        input: [{ name: 'productId', from: 'viewProductDetail.productId' }],
        output: { kind: 'object', fields: [
          { name: 'productId', from: 'viewProductDetail.productId' },
          { name: 'categoryName', from: 'viewProductDetail.categoryName' },
        ] } },
    ],
  }, 'petShop')!;
  const opShapes = new Map<string, CbOpOutputShapeView | null>([
    ['browseProducts', { kind: 'list', fields: [{ name: 'productId', type: 'string' }, { name: 'name', type: 'string' }] }],
    ['viewProductDetail', { kind: 'object', fields: [] }],
  ]);
  const usecaseFns = new Map([
    ['browseProducts', { functionName: 'browseProducts', inputTypeName: 'BrowseProductsInput' }],
    ['viewProductDetail', { functionName: 'viewProductDetail', inputTypeName: 'ViewProductDetailInput' }],
  ]);
  return { project: 102049, moduleName: 'petShop', workspace, opShapes, usecaseFns, actorRoleScopes: new Map([['cliente', 'petShop:cliente']]) };
}

test('renderWorkspaceController: list handler returns a BARE array (ok(items), not { items })', () => {
  const { source } = renderWorkspaceController(inp());
  assert.match(source, /const items: BrowseCatalogOutput = \(browseProductsResult\.items \?\? \[\]\)\.map\(\(row\) => \(\{/);
  assert.match(source, /productId: row\.productId,/);
  assert.match(source, /return ok\(items\);/);           // BARE array
  assert.doesNotMatch(source, /return ok\(\{ items/);     // NOT wrapped
});

test('renderWorkspaceController: object handler is typed to Output', () => {
  const { source } = renderWorkspaceController(inp());
  assert.match(source, /const out: ProductDetailOutput = \{/);
  assert.match(source, /categoryName: viewProductDetailResult\.categoryName,/);
  assert.match(source, /return ok\(out\);/);
});

test('renderWorkspaceController: paginated handler wraps with the DECLARED array name + meta', () => {
  const i = inp();
  i.workspace = parseWorkspaceDefs({
    workspaceId: 'acompanharReservas', actors: ['equipeLoja'], kind: 'workflow',
    bffCalls: [{ bffId: 'listReservations', kind: 'query', uses: [{ operationId: 'browseReservations' }],
      input: [{ name: 'statusFilter', from: 'browseReservations.statusFilter' }],
      output: { kind: 'paginated', fields: [
        { name: 'reservations', from: 'browseReservations.$items', item: { fields: [
          { name: 'reservationId', from: 'browseReservations.$items.reservationId' },
        ] } },
        { name: 'total', from: 'browseReservations.total' },
        { name: 'page', from: 'browseReservations.page' },
        { name: 'pageSize', from: 'browseReservations.pageSize' },
      ] } }],
  }, 'petShop')!;
  i.opShapes = new Map([['browseReservations', { kind: 'paginated', fields: [
    { name: 'reservations', type: 'array', item: { fields: [{ name: 'reservationId', type: 'string' }] } },
    { name: 'total', type: 'number' }, { name: 'page', type: 'number' }, { name: 'pageSize', type: 'number' },
  ] }]]);
  i.usecaseFns = new Map([['browseReservations', { functionName: 'browseReservations', inputTypeName: 'BrowseReservationsInput' }]]);
  i.actorRoleScopes = new Map([['equipeLoja', 'petShop:equipeLoja']]);
  const { source } = renderWorkspaceController(i);
  // reads the op's declared array (reservations) and wraps under the declared wire name (reservations)
  assert.match(source, /const reservations: ListReservationsOutput\['reservations'\] = \(browseReservationsResult\.reservations \?\? \[\]\)\.map/);
  assert.match(source, /reservationId: row\.reservationId,/);
  assert.match(source, /return ok\(\{ reservations, total: browseReservationsResult\.total, page: browseReservationsResult\.page, pageSize: browseReservationsResult\.pageSize \}\);/);
  assert.doesNotMatch(source, /ok\(\{ items/); // never "items" for paginated
});

test('renderWorkspaceController: routes use the contract route const; actor enforcement present', () => {
  const { source, routeKeys } = renderWorkspaceController(inp());
  assert.match(source, /\{ key: browseCatalogRoute, handler: catalogoBrowseCatalogHandler \}/);
  assert.match(source, /const catalogoAllowedScopes: readonly string\[\] = \["petShop:cliente"\]/);
  assert.match(source, /function enforceActors\(ctx: RequestContext/);
  assert.doesNotMatch(source, /key: 'petShop\.catalogo/); // no literal route strings
  assert.deepEqual(routeKeys, ['browseCatalogRoute', 'productDetailRoute']);
});
