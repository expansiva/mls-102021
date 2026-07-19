"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>
Object.defineProperty(exports, "__esModule", { value: true });
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var cbWorkspace_js_1 = require("./cbWorkspace.js");
// Mirrors the real l4 v2 shape of mls-102049/l4/petShop/workspaces/catalog.defs.ts (2 bffCalls: a
// paginated query with a filterControl and an object detail query). Keeps the B1 reader honest.
function catalogWorkspace() {
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
(0, node_test_1.default)('parseWorkspaceDefs reads bffCalls, projection and plural actors from a v2 workspace', function () {
    var _a, _b;
    var ws = (0, cbWorkspace_js_1.parseWorkspaceDefs)(catalogWorkspace(), 'petShop');
    strict_1.default.ok(ws, 'workspace parsed');
    strict_1.default.equal(ws.workspaceId, 'catalog');
    strict_1.default.equal(ws.moduleName, 'petShop');
    strict_1.default.deepEqual(ws.actors, ['cliente']);
    strict_1.default.equal(ws.bffCalls.length, 2);
    var list = ws.bffCalls[0];
    strict_1.default.equal(list.bffId, 'catalogList');
    strict_1.default.equal(list.kind, 'query');
    strict_1.default.deepEqual(list.uses, [{ operationId: 'browseCatalog' }]);
    strict_1.default.equal(list.route, 'petShop.catalog.catalogList');
    strict_1.default.equal((_a = list.output) === null || _a === void 0 ? void 0 : _a.kind, 'paginated');
    strict_1.default.equal((_b = list.output) === null || _b === void 0 ? void 0 : _b.fields[0].from, 'browseCatalog.$items.productId');
    // operationIds are the union of uses (deprecated inline field only fills gaps).
    strict_1.default.deepEqual(ws.operationIds, ['browseCatalog', 'viewProductDetail']);
});
(0, node_test_1.default)('parseWorkspaceDefs folds the singular v1 `actor` and derives a missing route', function () {
    var raw = {
        workspaceId: 'reservationPanel',
        actor: 'lojista', // v1 singular
        kind: 'workflow',
        bffCalls: [{ bffId: 'reservationList', kind: 'query', uses: [{ operationId: 'browseReservations' }] }],
    };
    var ws = (0, cbWorkspace_js_1.parseWorkspaceDefs)(raw, 'petShop');
    strict_1.default.ok(ws);
    strict_1.default.deepEqual(ws.actors, ['lojista']);
    // route omitted in the defs -> derived deterministically as <module>.<workspaceId>.<bffId>.
    strict_1.default.equal(ws.bffCalls[0].route, 'petShop.reservationPanel.reservationList');
});
(0, node_test_1.default)('parseWorkspaceDefs parses a command passthrough (no output) and optional composed uses', function () {
    var _a, _b;
    var raw = {
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
    var ws = (0, cbWorkspace_js_1.parseWorkspaceDefs)(raw, 'petShop');
    strict_1.default.ok(ws);
    var _c = ws.bffCalls, cmd = _c[0], page = _c[1];
    strict_1.default.equal(cmd.kind, 'command');
    strict_1.default.equal(cmd.output, undefined); // passthrough: no projection
    strict_1.default.deepEqual(page.uses, [{ operationId: 'getSummary' }, { operationId: 'getFinance', optional: true }]);
    strict_1.default.equal((_b = (_a = page.output) === null || _a === void 0 ? void 0 : _a.fields[0].item) === null || _b === void 0 ? void 0 : _b.fields[0].from, 'getSummary.$items.x');
});
(0, node_test_1.default)('parseWorkspaceDefs rejects a workspace without an id', function () {
    strict_1.default.equal((0, cbWorkspace_js_1.parseWorkspaceDefs)({ bffCalls: [] }, 'petShop'), null);
});
