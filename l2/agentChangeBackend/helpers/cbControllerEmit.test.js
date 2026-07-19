"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>
Object.defineProperty(exports, "__esModule", { value: true });
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var cbControllerEmit_js_1 = require("./cbControllerEmit.js");
var cbWorkspace_js_1 = require("./cbWorkspace.js");
// The real petShop `catalog` workspace: paginated list (catalogList <- browseCatalog) + object detail
// (productDetail <- viewProductDetail). browseCatalog's outputShape array field is `products`.
function catalogInput() {
    var workspace = (0, cbWorkspace_js_1.parseWorkspaceDefs)({
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
    }, 'petShop');
    var opShapes = new Map([
        // browseCatalog's real paginated outputShape: array `products` + total/page/pageSize meta.
        ['browseCatalog', { kind: 'paginated', fields: [{ name: 'products', type: 'array', item: {} }, { name: 'total', type: 'number' }, { name: 'page', type: 'number' }, { name: 'pageSize', type: 'number' }] }],
        ['viewProductDetail', { kind: 'object', fields: [{ name: 'productId', type: 'string' }] }],
    ]);
    var usecaseFns = new Map([
        ['browseCatalog', { functionName: 'browseCatalog', inputTypeName: 'BrowseCatalogInput' }],
        ['viewProductDetail', { functionName: 'viewProductDetail', inputTypeName: 'ViewProductDetailInput' }],
    ]);
    var actorRoleScopes = new Map([['cliente', 'petShop:cliente']]);
    return { project: 102049, moduleName: 'petShop', workspace: workspace, opShapes: opShapes, usecaseFns: usecaseFns, actorRoleScopes: actorRoleScopes };
}
(0, node_test_1.default)('renderWorkspaceController emits one controller with a handler per bffCall and routes from consts', function () {
    var _a = (0, cbControllerEmit_js_1.renderWorkspaceController)(catalogInput()), source = _a.source, usecaseOperationIds = _a.usecaseOperationIds, routeKeys = _a.routeKeys;
    // imports: runtime contracts, both usecases, both l1 contract mirrors
    strict_1.default.match(source, /from '\/_102034_\/l1\/server\/layer_2_controllers\/contracts\.js'/);
    strict_1.default.match(source, /import \{ browseCatalog, type BrowseCatalogInput \} from '\/_102049_\/l1\/petShop\/layer_2_application\/usecases\/browseCatalog\.js'/);
    strict_1.default.match(source, /import \{ type CatalogListInput, type CatalogListOutput, catalogListRoute \} from '\/_102049_\/l1\/petShop\/contracts\/catalog\.catalogList\.js'/);
    // paginated handler: items mapped from the op's `products` array to the projected columns
    strict_1.default.match(source, /export const catalogCatalogListHandler: BffHandler = async \(\{ request, ctx \}\) =>/);
    strict_1.default.match(source, /const items: CatalogListOutput\[\] = \(browseCatalogResult\.products \?\? \[\]\)\.map/);
    strict_1.default.match(source, /productId: row\.productId,/);
    strict_1.default.match(source, /return ok\(\{ items, total: browseCatalogResult\.total, page: browseCatalogResult\.page, pageSize: browseCatalogResult\.pageSize \}\)/);
    // object handler: projected top-level fields, no items envelope
    strict_1.default.match(source, /export const catalogProductDetailHandler: BffHandler/);
    strict_1.default.match(source, /categoryName: viewProductDetailResult\.categoryName,/);
    // input mapping: wire name -> usecase field
    strict_1.default.match(source, /const browseCatalogInput: BrowseCatalogInput = \{/);
    strict_1.default.match(source, /searchTerm: input\.searchTerm,/);
    // actor enforcement + allowed scopes const (one place to adjust for D6.5)
    strict_1.default.match(source, /const catalogAllowedScopes: readonly string\[\] = \["petShop:cliente"\]/);
    strict_1.default.match(source, /const denial = enforceActors\(ctx, catalogAllowedScopes, catalogListRoute\)/);
    strict_1.default.match(source, /function enforceActors\(ctx: RequestContext/);
    // routes registered by the contract route CONST (never a hand-typed string)
    strict_1.default.match(source, /\{ key: catalogListRoute, handler: catalogCatalogListHandler \}/);
    strict_1.default.match(source, /\{ key: productDetailRoute, handler: catalogProductDetailHandler \}/);
    strict_1.default.doesNotMatch(source, /key: 'petShop\.catalog/); // no literal route strings
    strict_1.default.deepEqual(usecaseOperationIds.sort(), ['browseCatalog', 'viewProductDetail']);
    strict_1.default.deepEqual(routeKeys, ['catalogListRoute', 'productDetailRoute']);
});
(0, node_test_1.default)('renderWorkspaceController emits a command passthrough when the bffCall declares no output', function () {
    var inp = catalogInput();
    inp.workspace = (0, cbWorkspace_js_1.parseWorkspaceDefs)({
        workspaceId: 'reservationPanel', actors: ['lojista'], kind: 'workflow',
        bffCalls: [{ bffId: 'confirmReserva', kind: 'command', uses: [{ operationId: 'confirmReservation' }],
                input: [{ name: 'reservationId', from: 'confirmReservation.reservationId' }] }],
    }, 'petShop');
    inp.usecaseFns = new Map([['confirmReservation', { functionName: 'confirmReservation', inputTypeName: 'ConfirmReservationInput' }]]);
    inp.actorRoleScopes = new Map([['lojista', 'petShop:lojista']]);
    var source = (0, cbControllerEmit_js_1.renderWorkspaceController)(inp).source;
    strict_1.default.match(source, /return ok\(confirmReservationResult\);/); // passthrough, no projection
    strict_1.default.doesNotMatch(source, /type ConfirmReservaOutput/); // no Output import when no output declared
});
