/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectL1Imports, escapeRegExp, fieldNameFromRef, requiredBoundaryFields, collectRequiredChecksByHandler,
  collectExportedHandlers, collectRouteHandlers, collectUsecaseRules, normalizeRuleId, collectV2ControllerCoherenceIssues,
} from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';

// A well-formed v2 controller for the "catalog" workspace (one handler per bffCall, routes by const).
const CATALOG_CONTROLLER = `
export const catalogCatalogListHandler: BffHandler = async ({ request, ctx }) => { return ok({}); };
export const catalogProductDetailHandler: BffHandler = async ({ request, ctx }) => { return ok({}); };
export const routes: ControllerRoute[] = [
  { key: catalogListRoute, handler: catalogCatalogListHandler },
  { key: productDetailRoute, handler: catalogProductDetailHandler },
];
`;
const catalogWs = { workspaceId: 'catalog', bffCalls: [{ bffId: 'catalogList' }, { bffId: 'productDetail' }] };

test('collectV2ControllerCoherenceIssues passes a well-formed workspace controller', () => {
  const issues = collectV2ControllerCoherenceIssues([catalogWs], new Map([['catalog', CATALOG_CONTROLLER]]));
  assert.deepEqual(issues, []);
});

test('collectV2ControllerCoherenceIssues flags a bffCall with no handler', () => {
  const src = CATALOG_CONTROLLER.replace(/export const catalogProductDetailHandler[\s\S]*?};\n/, '');
  const issues = collectV2ControllerCoherenceIssues([catalogWs], new Map([['catalog', src]]));
  assert.ok(issues.some(i => /bffCall productDetail has no handler catalogProductDetailHandler/.test(i)), issues.join('\n'));
});

test('collectV2ControllerCoherenceIssues flags an orphan route (missing route const)', () => {
  // handler exists and is registered, but the route const is never referenced.
  const src = CATALOG_CONTROLLER.replace(/productDetailRoute/g, 'wrongRoute');
  const issues = collectV2ControllerCoherenceIssues([catalogWs], new Map([['catalog', src]]));
  assert.ok(issues.some(i => /route const productDetailRoute missing \(rota órfã\)/.test(i)), issues.join('\n'));
});

test('collectV2ControllerCoherenceIssues flags a workspace whose controller was not generated', () => {
  const issues = collectV2ControllerCoherenceIssues([catalogWs], new Map());
  assert.ok(issues.some(i => /\.ts not generated for the workspace/.test(i)), issues.join('\n'));
});

test('collectL1Imports keeps same-project l1 imports and drops others', () => {
  const code = `
    import { a } from '/_102048_/l1/cafeFlow/layer_3_domain/entities/order.js';
    import { b } from '/_102034_/l1/platform/thing.js';
    import { c } from '/_102048_/l2/somewhere/else.js';
  `;
  assert.deepEqual(collectL1Imports(code, 102048), [
    { key: 'cafeFlow/layer_3_domain/entities::order', target: '_102048_/l1/cafeFlow/layer_3_domain/entities/order' },
  ]);
});

test('escapeRegExp escapes regex metacharacters', () => {
  assert.equal(escapeRegExp('a.b*c'), 'a\\.b\\*c');
});

test('fieldNameFromRef returns the last dotted segment', () => {
  assert.equal(fieldNameFromRef('movement.movementType'), 'movementType');
  assert.equal(fieldNameFromRef('plain'), 'plain');
  assert.equal(fieldNameFromRef(undefined), '');
});

test('requiredBoundaryFields ignores context-resolved sources', () => {
  const contract = [
    { inputId: 'name', required: true, source: 'userInput' },
    { inputId: 'companyId', required: true, source: 'businessContext' },
    { fieldRef: 'order.total', required: true, source: 'routeParam' },
    { inputId: 'optional', required: false, source: 'userInput' },
  ];
  assert.deepEqual([...requiredBoundaryFields(contract)].sort(), ['name', 'total']);
});

test('collectRequiredChecksByHandler extracts required-field guards by handler', () => {
  const code = `
export const createOrder: BffHandler = async (req) => {
  if (!req.name) throw new AppError({ code: 'x', message: 'required', field: 'name' });
  if (!req.m) throw new AppError({ code: 'y', message: 'required', field: 'movement.movementType' });
};
`;
  const checks = collectRequiredChecksByHandler(code);
  assert.deepEqual([...(checks.get('createOrder') ?? [])].sort(), ['movementType', 'name']);
});

test('collectExportedHandlers and collectRouteHandlers pair up', () => {
  const code = `
export const createOrder: BffHandler = async () => {};
export const listOrders: BffHandler = async () => {};
const routes = [
  { key: 'order.create', handler: createOrder },
  { key: 'order.list', handler: listOrders },
];
`;
  assert.deepEqual([...collectExportedHandlers(code)].sort(), ['createOrder', 'listOrders']);
  const routes = collectRouteHandlers(code);
  assert.equal(routes.get('order.create'), 'createOrder');
  assert.equal(routes.get('order.list'), 'listOrders');
});

test('normalizeRuleId strips the description after the colon', () => {
  assert.equal(normalizeRuleId('R1: no negative stock'), 'R1');
  assert.equal(normalizeRuleId('  R2  '), 'R2');
});

test('collectUsecaseRules unions top-level and per-function rules, normalized', () => {
  const data = {
    rulesApplied: ['R1: top', 'R2'],
    functions: [
      { rulesApplied: ['R2: dup', 'R3'] },
      { rulesApplied: ['R4'] },
      'not-a-record',
    ],
  };
  assert.deepEqual(collectUsecaseRules(data).sort(), ['R1', 'R2', 'R3', 'R4']);
  assert.deepEqual(collectUsecaseRules(undefined), []);
  assert.deepEqual(collectUsecaseRules('nope'), []);
});
