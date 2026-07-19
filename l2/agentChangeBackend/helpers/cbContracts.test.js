"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>
Object.defineProperty(exports, "__esModule", { value: true });
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var cbContracts_js_1 = require("./cbContracts.js");
var cbWorkspace_js_1 = require("./cbWorkspace.js");
(0, node_test_1.default)('rewriteContractHeaderToL1 repoints fileReference to l1 and stamps the copied note', function () {
    var l4 = [
        '/// <mls fileReference="_102049_/l4/petShop/contracts/catalog.catalogList.ts" enhancement="_blank"/>',
        '',
        'export interface CatalogListInput { page?: number; }',
        '',
    ].join('\n');
    var l1 = (0, cbContracts_js_1.rewriteContractHeaderToL1)(l4, 102049, 'petShop', 'catalog.catalogList', '.ts');
    strict_1.default.match(l1, /fileReference="_102049_\/l1\/petShop\/contracts\/catalog\.catalogList\.ts"/);
    strict_1.default.doesNotMatch(l1, /l4\/petShop\/contracts\/catalog\.catalogList\.ts"/); // the reference itself moved to l1
    strict_1.default.match(l1, /COPIED FROM l4 — do not edit\. Source of truth: _102049_\/l4\/petShop\/contracts\/catalog\.catalogList\.ts\./);
    strict_1.default.match(l1, /export interface CatalogListInput/); // body preserved
});
(0, node_test_1.default)('parseFromPath splits top-level and $items paths', function () {
    strict_1.default.deepEqual((0, cbContracts_js_1.parseFromPath)('browseCatalog.total'), { operationId: 'browseCatalog', fromItems: false, path: ['total'] });
    strict_1.default.deepEqual((0, cbContracts_js_1.parseFromPath)('browseCatalog.$items.productId'), { operationId: 'browseCatalog', fromItems: true, path: ['productId'] });
    strict_1.default.equal((0, cbContracts_js_1.parseFromPath)(''), null);
    strict_1.default.equal((0, cbContracts_js_1.parseFromPath)('nofield'), null);
});
(0, node_test_1.default)('resolveItemsArrayField finds the array field of a paginated operation outputShape', function () {
    var shape = { kind: 'paginated', fields: [{ name: 'products', type: 'array', item: { fields: [] } }, { name: 'total', type: 'number' }] };
    strict_1.default.equal((0, cbContracts_js_1.resolveItemsArrayField)(shape), 'products');
    strict_1.default.equal((0, cbContracts_js_1.resolveItemsArrayField)({ kind: 'object', fields: [{ name: 'x', type: 'string' }] }), null);
    strict_1.default.equal((0, cbContracts_js_1.resolveItemsArrayField)(null), null);
});
// filaReservas-style paginated projection (the acceptance's fixture): item columns come from $items,
// the projection must resolve exactly the declared columns and classify them as item fields.
(0, node_test_1.default)('resolveBffProjection classifies a paginated bffCall into item columns', function () {
    var ws = (0, cbWorkspace_js_1.parseWorkspaceDefs)({
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
    }, 'petShop');
    var bff = ws.bffCalls[0];
    strict_1.default.equal((0, cbContracts_js_1.envelopeKindOf)(bff), 'paginated');
    var proj = (0, cbContracts_js_1.resolveBffProjection)(bff);
    strict_1.default.equal(proj.topFields.length, 0);
    strict_1.default.deepEqual(proj.itemFields.map(function (f) { return [f.name, f.operationId, f.path.join('.'), f.fromItems]; }), [
        ['reservationCode', 'browseReservations', 'reservationCode', true],
        ['status', 'browseReservations', 'status', true],
        ['clienteNome', 'browseReservations', 'customerName', true], // rename customerName -> clienteNome
    ]);
});
(0, node_test_1.default)('resolveBffProjection classifies an object bffCall into top-level fields', function () {
    var ws = (0, cbWorkspace_js_1.parseWorkspaceDefs)({
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
    }, 'petShop');
    var bff = ws.bffCalls[0];
    strict_1.default.equal((0, cbContracts_js_1.envelopeKindOf)(bff), 'object');
    var proj = (0, cbContracts_js_1.resolveBffProjection)(bff);
    strict_1.default.equal(proj.itemFields.length, 0);
    strict_1.default.deepEqual(proj.topFields.map(function (f) { return f.name; }), ['productId', 'categoryName']);
});
