/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkspaceController, type RenderControllerInput } from './cbControllerEmit.js';
import { parseWorkspaceDefs } from './cbWorkspace.js';
import type { CbOpOutputShapeView } from './cbContracts.js';

// The real petShop `catalog` workspace: paginated list (catalogList <- browseCatalog) + object detail
// (productDetail <- viewProductDetail). browseCatalog's outputShape array field is `products`.
function catalogInput(): RenderControllerInput {
  const workspace = parseWorkspaceDefs({
    workspaceId: 'catalog',
    title: 'Catálogo',
    actors: ['cliente'],
    kind: 'operation',
    bffCalls: [
      {
        bffId: 'catalogList', kind: 'query', uses: [{ operationId: 'browseCatalog' }],
        input: [
          { name: 'searchTerm', from: 'browseCatalog.searchTerm' },
          { name: 'page', from: 'browseCatalog.page' },
        ],
        output: { kind: 'paginated', fields: [
          { name: 'productId', from: 'browseCatalog.$items.productId' },
          { name: 'name', from: 'browseCatalog.$items.name' },
        ] },
      },
      {
        bffId: 'productDetail', kind: 'query', uses: [{ operationId: 'viewProductDetail' }],
        input: [{ name: 'productId', from: 'viewProductDetail.productId' }],
        output: { kind: 'object', fields: [
          { name: 'productId', from: 'viewProductDetail.productId' },
          { name: 'categoryName', from: 'viewProductDetail.categoryName' },
        ] },
      },
    ],
  }, 'petShop')!;
  const opShapes = new Map<string, CbOpOutputShapeView | null>([
    // browseCatalog's real paginated outputShape: array `products` + total/page/pageSize meta.
    ['browseCatalog', { kind: 'paginated', fields: [{ name: 'products', type: 'array', item: {} }, { name: 'total', type: 'number' }, { name: 'page', type: 'number' }, { name: 'pageSize', type: 'number' }] }],
    ['viewProductDetail', { kind: 'object', fields: [{ name: 'productId', type: 'string' }] }],
  ]);
  const usecaseFns = new Map([
    ['browseCatalog', { functionName: 'browseCatalog', inputTypeName: 'BrowseCatalogInput' }],
    ['viewProductDetail', { functionName: 'viewProductDetail', inputTypeName: 'ViewProductDetailInput' }],
  ]);
  const actorRoleScopes = new Map([['cliente', 'petShop:cliente']]);
  return { project: 102049, moduleName: 'petShop', workspace, opShapes, usecaseFns, actorRoleScopes };
}

test('renderWorkspaceController emits one controller with a handler per bffCall and routes from consts', () => {
  const { source, usecaseOperationIds, routeKeys } = renderWorkspaceController(catalogInput());

  // imports: runtime contracts, both usecases, both l1 contract mirrors
  assert.match(source, /from '\/_102034_\/l1\/server\/layer_2_controllers\/contracts\.js'/);
  assert.match(source, /import \{ browseCatalog, type BrowseCatalogInput \} from '\/_102049_\/l1\/petShop\/layer_2_application\/usecases\/browseCatalog\.js'/);
  assert.match(source, /import \{ type CatalogListInput, type CatalogListOutput, catalogListRoute \} from '\/_102049_\/l1\/petShop\/contracts\/catalog\.catalogList\.js'/);

  // paginated handler: items mapped from the op's `products` array to the projected columns
  assert.match(source, /export const catalogCatalogListHandler: BffHandler = async \(\{ request, ctx \}\) =>/);
  assert.match(source, /const items: CatalogListOutput\[\] = \(browseCatalogResult\.products \?\? \[\]\)\.map/);
  assert.match(source, /productId: row\.productId,/);
  assert.match(source, /return ok\(\{ items, total: browseCatalogResult\.total, page: browseCatalogResult\.page, pageSize: browseCatalogResult\.pageSize \}\)/);

  // object handler: projected top-level fields, no items envelope
  assert.match(source, /export const catalogProductDetailHandler: BffHandler/);
  assert.match(source, /categoryName: viewProductDetailResult\.categoryName,/);

  // input mapping: wire name -> usecase field
  assert.match(source, /const browseCatalogInput: BrowseCatalogInput = \{/);
  assert.match(source, /searchTerm: input\.searchTerm,/);

  // actor enforcement + allowed scopes const (one place to adjust for D6.5)
  assert.match(source, /const catalogAllowedScopes: readonly string\[\] = \["petShop:cliente"\]/);
  assert.match(source, /const denial = enforceActors\(ctx, catalogAllowedScopes, catalogListRoute\)/);
  assert.match(source, /function enforceActors\(ctx: RequestContext/);

  // routes registered by the contract route CONST (never a hand-typed string)
  assert.match(source, /\{ key: catalogListRoute, handler: catalogCatalogListHandler \}/);
  assert.match(source, /\{ key: productDetailRoute, handler: catalogProductDetailHandler \}/);
  assert.doesNotMatch(source, /key: 'petShop\.catalog/); // no literal route strings

  assert.deepEqual(usecaseOperationIds.sort(), ['browseCatalog', 'viewProductDetail']);
  assert.deepEqual(routeKeys, ['catalogListRoute', 'productDetailRoute']);
});

test('renderWorkspaceController emits a command passthrough when the bffCall declares no output', () => {
  const inp = catalogInput();
  inp.workspace = parseWorkspaceDefs({
    workspaceId: 'reservationPanel', actors: ['lojista'], kind: 'workflow',
    bffCalls: [{ bffId: 'confirmReserva', kind: 'command', uses: [{ operationId: 'confirmReservation' }],
      input: [{ name: 'reservationId', from: 'confirmReservation.reservationId' }] }],
  }, 'petShop')!;
  inp.usecaseFns = new Map([['confirmReservation', { functionName: 'confirmReservation', inputTypeName: 'ConfirmReservationInput' }]]);
  inp.actorRoleScopes = new Map([['lojista', 'petShop:lojista']]);
  const { source } = renderWorkspaceController(inp);
  assert.match(source, /return ok\(confirmReservationResult\);/); // passthrough, no projection
  assert.doesNotMatch(source, /type ConfirmReservaOutput/); // no Output import when no output declared
});
