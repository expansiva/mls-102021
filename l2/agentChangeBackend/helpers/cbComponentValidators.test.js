"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var cbComponentValidators_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js");
// A well-formed v2 controller for the "catalog" workspace (one handler per bffCall, routes by const).
var CATALOG_CONTROLLER = "\nexport const catalogCatalogListHandler: BffHandler = async ({ request, ctx }) => { return ok({}); };\nexport const catalogProductDetailHandler: BffHandler = async ({ request, ctx }) => { return ok({}); };\nexport const routes: ControllerRoute[] = [\n  { key: catalogListRoute, handler: catalogCatalogListHandler },\n  { key: productDetailRoute, handler: catalogProductDetailHandler },\n];\n";
var catalogWs = { workspaceId: 'catalog', bffCalls: [{ bffId: 'catalogList' }, { bffId: 'productDetail' }] };
(0, node_test_1.default)('collectV2ControllerCoherenceIssues passes a well-formed workspace controller', function () {
    var issues = (0, cbComponentValidators_js_1.collectV2ControllerCoherenceIssues)([catalogWs], new Map([['catalog', CATALOG_CONTROLLER]]));
    strict_1.default.deepEqual(issues, []);
});
(0, node_test_1.default)('collectV2ControllerCoherenceIssues flags a bffCall with no handler', function () {
    var src = CATALOG_CONTROLLER.replace(/export const catalogProductDetailHandler[\s\S]*?};\n/, '');
    var issues = (0, cbComponentValidators_js_1.collectV2ControllerCoherenceIssues)([catalogWs], new Map([['catalog', src]]));
    strict_1.default.ok(issues.some(function (i) { return /bffCall productDetail has no handler catalogProductDetailHandler/.test(i); }), issues.join('\n'));
});
(0, node_test_1.default)('collectV2ControllerCoherenceIssues flags an orphan route (missing route const)', function () {
    // handler exists and is registered, but the route const is never referenced.
    var src = CATALOG_CONTROLLER.replace(/productDetailRoute/g, 'wrongRoute');
    var issues = (0, cbComponentValidators_js_1.collectV2ControllerCoherenceIssues)([catalogWs], new Map([['catalog', src]]));
    strict_1.default.ok(issues.some(function (i) { return /route const productDetailRoute missing \(rota órfã\)/.test(i); }), issues.join('\n'));
});
(0, node_test_1.default)('collectV2ControllerCoherenceIssues flags a workspace whose controller was not generated', function () {
    var issues = (0, cbComponentValidators_js_1.collectV2ControllerCoherenceIssues)([catalogWs], new Map());
    strict_1.default.ok(issues.some(function (i) { return /\.ts not generated for the workspace/.test(i); }), issues.join('\n'));
});
(0, node_test_1.default)('collectL1Imports keeps same-project l1 imports and drops others', function () {
    var code = "\n    import { a } from '/_102048_/l1/cafeFlow/layer_3_domain/entities/order.js';\n    import { b } from '/_102034_/l1/platform/thing.js';\n    import { c } from '/_102048_/l2/somewhere/else.js';\n  ";
    strict_1.default.deepEqual((0, cbComponentValidators_js_1.collectL1Imports)(code, 102048), [
        { key: 'cafeFlow/layer_3_domain/entities::order', target: '_102048_/l1/cafeFlow/layer_3_domain/entities/order' },
    ]);
});
(0, node_test_1.default)('escapeRegExp escapes regex metacharacters', function () {
    strict_1.default.equal((0, cbComponentValidators_js_1.escapeRegExp)('a.b*c'), 'a\\.b\\*c');
});
(0, node_test_1.default)('fieldNameFromRef returns the last dotted segment', function () {
    strict_1.default.equal((0, cbComponentValidators_js_1.fieldNameFromRef)('movement.movementType'), 'movementType');
    strict_1.default.equal((0, cbComponentValidators_js_1.fieldNameFromRef)('plain'), 'plain');
    strict_1.default.equal((0, cbComponentValidators_js_1.fieldNameFromRef)(undefined), '');
});
(0, node_test_1.default)('requiredBoundaryFields ignores context-resolved sources', function () {
    var contract = [
        { inputId: 'name', required: true, source: 'userInput' },
        { inputId: 'companyId', required: true, source: 'businessContext' },
        { fieldRef: 'order.total', required: true, source: 'routeParam' },
        { inputId: 'optional', required: false, source: 'userInput' },
    ];
    strict_1.default.deepEqual(__spreadArray([], (0, cbComponentValidators_js_1.requiredBoundaryFields)(contract), true).sort(), ['name', 'total']);
});
(0, node_test_1.default)('collectRequiredChecksByHandler extracts required-field guards by handler', function () {
    var _a;
    var code = "\nexport const createOrder: BffHandler = async (req) => {\n  if (!req.name) throw new AppError({ code: 'x', message: 'required', field: 'name' });\n  if (!req.m) throw new AppError({ code: 'y', message: 'required', field: 'movement.movementType' });\n};\n";
    var checks = (0, cbComponentValidators_js_1.collectRequiredChecksByHandler)(code);
    strict_1.default.deepEqual(__spreadArray([], ((_a = checks.get('createOrder')) !== null && _a !== void 0 ? _a : []), true).sort(), ['movementType', 'name']);
});
(0, node_test_1.default)('collectExportedHandlers and collectRouteHandlers pair up', function () {
    var code = "\nexport const createOrder: BffHandler = async () => {};\nexport const listOrders: BffHandler = async () => {};\nconst routes = [\n  { key: 'order.create', handler: createOrder },\n  { key: 'order.list', handler: listOrders },\n];\n";
    strict_1.default.deepEqual(__spreadArray([], (0, cbComponentValidators_js_1.collectExportedHandlers)(code), true).sort(), ['createOrder', 'listOrders']);
    var routes = (0, cbComponentValidators_js_1.collectRouteHandlers)(code);
    strict_1.default.equal(routes.get('order.create'), 'createOrder');
    strict_1.default.equal(routes.get('order.list'), 'listOrders');
});
(0, node_test_1.default)('normalizeRuleId strips the description after the colon', function () {
    strict_1.default.equal((0, cbComponentValidators_js_1.normalizeRuleId)('R1: no negative stock'), 'R1');
    strict_1.default.equal((0, cbComponentValidators_js_1.normalizeRuleId)('  R2  '), 'R2');
});
(0, node_test_1.default)('collectUsecaseRules unions top-level and per-function rules, normalized', function () {
    var data = {
        rulesApplied: ['R1: top', 'R2'],
        functions: [
            { rulesApplied: ['R2: dup', 'R3'] },
            { rulesApplied: ['R4'] },
            'not-a-record',
        ],
    };
    strict_1.default.deepEqual((0, cbComponentValidators_js_1.collectUsecaseRules)(data).sort(), ['R1', 'R2', 'R3', 'R4']);
    strict_1.default.deepEqual((0, cbComponentValidators_js_1.collectUsecaseRules)(undefined), []);
    strict_1.default.deepEqual((0, cbComponentValidators_js_1.collectUsecaseRules)('nope'), []);
});
