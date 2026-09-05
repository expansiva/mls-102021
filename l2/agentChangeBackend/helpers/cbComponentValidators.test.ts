/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectL1Imports, collectExtensionlessImportIssues, escapeRegExp, fieldNameFromRef, requiredBoundaryFields, collectRequiredChecksByHandler,
  collectExportedHandlers, collectRouteHandlers, collectUsecaseRules, normalizeRuleId, collectV2ControllerCoherenceIssues,
  eventPortBelongsToOwner, missingPrincipalPortIssues, portsMissingFromDependsFiles, collectRepositoryCastIssues,
  ownershipCheckIsInconclusive, ownershipInconclusiveWarning,
  collectOrphanDefsFindings, collectMissingCanonicalRouteIssues,
  extractInterfaceMethods, collectRepositoryMethodMisuse, collectInventedRelationshipKeyIssues,
  collectDeleteOperationPortGaps, extractAdapterFactoryMethods, collectAdapterMissingPortMethods,
  extractRepositoryInterfaceName,
  stableCompilerErrors, selectCompilerRepairRoots,
  compilerErrorFamily, compilerErrorsAfterRepair, compilerFindingsBlockingPassed, annotateCompilerError,
  collectNonEnglishAppErrorMessages,
  collectL4ContractDependsRefs, collectUnreadL4ContractFindings, collectDottedShortNameFindings, collectIoShapeSymmetryIssues,
  collectDetailsDefaultingIssues, extractFunctionBlocks, extractCollectionFieldNames,
  jsonbColumnsFromTableSource, collectJsonbRowParseFindings, collectDetailsKeyIssues, fieldIdsFromL4Fields,
  alignOutputShapeToOntology, bffCallsWithMaterializedUsecase,
  applyInventedImportFixes, collectCallbackNullAssignmentIssues, closestExportedName,
  collectExportedNames, collectNamedL1Imports, significantCamelWords,
} from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';
import {
  TASK_FIELD_IDS, TASK_L4_FIELDS, TASK_SEED_ROW, toDomain, toRow,
} from '/_102021_/l2/agentChangeBackend/steps/gen-adapter/fixtures/taskDetailsRoundTrip.js';

test('W2: weeklySchedule json input vs string output is a defs-level finding; empty item.fields too', () => {
  const fn = {
    functionName: 'createBusinessHours',
    input: [{
      name: 'weeklySchedule', type: 'json', ofEntity: 'BusinessHours',
      fieldRef: 'BusinessHours.weeklySchedule', item: { fields: [] },
    }],
    output: [{ name: 'weeklySchedule', type: 'string', ofEntity: 'BusinessHours' }],
  };
  const issues = collectIoShapeSymmetryIssues(fn);
  assert.ok(issues.some(i => /io shape mismatch/.test(i) && /json/.test(i) && /string/.test(i)), issues.join('\n'));
  assert.ok(issues.some(i => /item\.fields/.test(i)), issues.join('\n'));
  assert.deepEqual(collectIoShapeSymmetryIssues({
    functionName: 'createCustomer',
    input: [{ name: 'name', type: 'string', ofEntity: 'Customer' }],
    output: [{ name: 'name', type: 'string', ofEntity: 'Customer' }],
  }), []);
});

test('R6-3: inherited l4 string output for ontology json aligns; W2 then passes', () => {
  const l4Shape = {
    kind: 'object',
    fields: [
      { name: 'beforeImages', type: 'string', required: false, fieldRef: 'ServiceExecution.beforeImages' },
      { name: 'afterImages', type: 'string', required: false, fieldRef: 'ServiceExecution.afterImages' },
    ],
  };
  const entities = [{
    entityId: 'ServiceExecution',
    fields: [
      { fieldId: 'beforeImages', type: 'json' },
      { fieldId: 'afterImages', type: 'json' },
    ],
  }];
  const { shape, aligned } = alignOutputShapeToOntology(l4Shape, entities);
  assert.equal(shape.fields.find(f => f.name === 'beforeImages')?.type, 'json');
  assert.equal(shape.fields.find(f => f.name === 'afterImages')?.type, 'json');
  assert.equal(aligned.length, 2);
  const issues = collectIoShapeSymmetryIssues({
    functionName: 'updateServiceExecution',
    input: [
      { name: 'beforeImages', type: 'json', ofEntity: 'ServiceExecution', fieldRef: 'ServiceExecution.beforeImages', item: { fields: [{ name: 'url', type: 'string' }] } },
      { name: 'afterImages', type: 'json', ofEntity: 'ServiceExecution', fieldRef: 'ServiceExecution.afterImages', item: { fields: [{ name: 'url', type: 'string' }] } },
    ],
    output: shape.fields.map(field => ({ name: field.name, type: field.type, ofEntity: 'ServiceExecution' })),
  });
  assert.deepEqual(issues, [], issues.join('\n'));
});

test('R6-3: gen-http skips a bffCall whose usecase was never written', () => {
  const { kept, skipped } = bffCallsWithMaterializedUsecase([
    { uses: [{ operationId: 'listService' }] },
    { uses: [{ operationId: 'updateServiceExecution' }] },
    { uses: [{ operationId: 'listService' }, { operationId: 'updateServiceExecution', optional: true }] },
  ], new Set(['listService']));
  assert.deepEqual(skipped, ['updateServiceExecution']);
  assert.equal(kept.length, 2);
  assert.equal(kept[0].uses[0].operationId, 'listService');
});

test('dotted shortName on l1/l4 defs is a filename-out-of-standard finding', () => {
  assert.deepEqual(collectDottedShortNameFindings([
    { shortName: 'createService' },
    { shortName: 'serviceCatalogue--cmdCreateService' },
  ]), []);
  assert.deepEqual(collectDottedShortNameFindings([
    { shortName: 'serviceCatalogue.cmdCreateService' },
  ]), ["filename out of standard: 'serviceCatalogue.cmdCreateService' — shortName must not contain dots"]);
});

test('unread l4 contract dependsFiles are findings, not a silent omit', () => {
  const defs = `dependsFiles: ["_102047_/l4/petShop/contracts/serviceCatalogue--cmdCreateService.defs.ts", "_102047_/l1/petShop/layer_2_application/usecases/createService.d.ts"]`;
  assert.deepEqual(collectL4ContractDependsRefs(defs), [
    '_102047_/l4/petShop/contracts/serviceCatalogue--cmdCreateService.defs.ts',
  ]);
  const unread = collectUnreadL4ContractFindings(defs, () => false);
  assert.equal(unread.length, 1);
  assert.match(unread[0], /l4 contract unreadable/);
  assert.deepEqual(collectUnreadL4ContractFindings(defs, () => true), []);
});

test('stableCompilerErrors (T2): keeps only findings that reproduce on the double-check (flaky dropped)', () => {
  const first = ['compiler: TS2792 cannot find module', 'compiler: TS2322 real type error'];
  const second = ['compiler: TS2322 real type error']; // TS2792 was a transient (models not settled)
  assert.deepEqual(stableCompilerErrors(first, second), ['compiler: TS2322 real type error']);
  // A finding present in BOTH passes is a real error and stays.
  assert.deepEqual(stableCompilerErrors(['x'], ['x']), ['x']);
  // Nothing reproduces -> everything suppressed as flaky.
  assert.deepEqual(stableCompilerErrors(['a', 'b'], ['c']), []);
});

test('selectCompilerRepairRoots (T2): an importer of a flagged file is a cascade; only the root is repaired', () => {
  // B is broken; A imports B; C is independently broken and imports nobody flagged.
  const flagged = ['mod/adapters::orderrepositoryadapter', 'mod/entities::order', 'mod/entities::daily'];
  const importsOf = (key: string): string[] =>
    key === 'mod/adapters::orderrepositoryadapter' ? ['mod/entities::order'] // A imports flagged B
      : []; // order (B) and daily (C) import nothing flagged
  const { roots, cascades } = selectCompilerRepairRoots(flagged, importsOf);
  assert.deepEqual(cascades, ['mod/adapters::orderrepositoryadapter'], 'importer of a flagged file is deferred');
  assert.deepEqual(roots.sort(), ['mod/entities::daily', 'mod/entities::order'], 'only roots are repaired this round');
});

test('selectCompilerRepairRoots (T2): a file importing a NON-flagged file is a root (not a cascade)', () => {
  const { roots, cascades } = selectCompilerRepairRoots(['a'], () => ['some/other::cleanfile']);
  assert.deepEqual(roots, ['a']);
  assert.deepEqual(cascades, []);
});

test('be5-2: two compiler families in the same file stay a root even if it imports a flagged file', () => {
  const flagged = ['mod/usecases::createserviceappointment', 'mod/usecases::listservice'];
  const importsOf = (key: string) => key === 'mod/usecases::createserviceappointment' ? ['mod/usecases::listservice'] : [];
  const families = (key: string) => key === 'mod/usecases::createserviceappointment'
    ? ['TS18047:pet', 'TS18047:service']
    : ['TS2322:MdmListByTypeResult'];
  const { roots, cascades } = selectCompilerRepairRoots(flagged, importsOf, families);
  assert.ok(roots.includes('mod/usecases::createserviceappointment'), 'own families must not be deferred as cascade');
  assert.deepEqual(cascades, []);
});

test("T2: TS2339 on type 'never' is annotated with the callback-assignment cause", () => {
  const original = "TS2339: Property 'x' does not exist on type 'never'.";
  const annotated = annotateCompilerError(original);
  assert.match(annotated, /possible cause: a value assigned only inside a callback \(e\.g\. `ctx\.data\.runInTransaction`\)/);
  const finding = compilerFindingsBlockingPassed({
    currentByFile: new Map([['registerSignature.ts', [original]]]),
  })[0];
  assert.match(finding, /possible cause:/);
});

test("T2: a common TS2339 is not annotated", () => {
  const original = "TS2339: Property 'y' does not exist on type 'Signature'";
  assert.equal(annotateCompilerError(original), original);
  assert.equal(
    compilerFindingsBlockingPassed({ currentByFile: new Map([['registerSignature.ts', [original]]]) })[0],
    `compiler -> registerSignature.ts: ${original}`,
  );
});

test("T2: the original compiler error remains intact inside the annotated finding", () => {
  const original = "TS2339: Property 'x' does not exist on type 'never'.";
  const annotated = annotateCompilerError(original);
  assert.ok(annotated.startsWith(original), annotated);
  const finding = compilerFindingsBlockingPassed({
    currentByFile: new Map([['registerSignature.ts', [original]]]),
  })[0];
  assert.ok(finding.includes(original), finding);
  assert.match(finding, /^compiler -> registerSignature\.ts: TS2339: Property 'x' does not exist on type 'never'\./);
});

test('be5-2: g1 finds two families, repair fixes one — health cannot close passed', () => {
  const g1 = ["'pet' is possibly 'null'.", "'service' is possibly 'null'."];
  assert.deepEqual(g1.map(compilerErrorFamily).sort(), ['TS:pet', 'TS:service']);
  const afterRepair = ["'service' is possibly 'null'."];
  const remaining = compilerErrorsAfterRepair(g1, afterRepair);
  assert.ok(remaining.some(e => /service/.test(e)));
  const blocking = compilerFindingsBlockingPassed({
    currentByFile: new Map([['createServiceAppointment.ts', remaining]]),
  });
  assert.ok(blocking.length > 0);
  assert.equal(compilerFindingsBlockingPassed({ currentByFile: new Map() }).length, 0);
  assert.match(
    compilerFindingsBlockingPassed({
      currentByFile: new Map(),
      previousFamiliesByFile: new Map([['createServiceAppointment.ts', ['TS18047:service']]]),
    })[0],
    /did not re-check/,
  );
});

test('BE5-5: Portuguese AppError messages are flagged; English is silent', () => {
  const pt = `throw new AppError('NOT_FOUND', 'Nenhum usuário autenticado foi identificado para o cliente responsável.', 404);`;
  assert.match(collectNonEnglishAppErrorMessages(pt)[0] || '', /not English/);
  const en = `throw new AppError('NOT_FOUND', 'No authenticated user was identified for the responsible customer.', 404);`;
  assert.deepEqual(collectNonEnglishAppErrorMessages(en), []);
});

// An append-only ledger port (StockAdjustment): NO save/create — only append + queries.
const STOCK_ADJ_PORT = `
import type { StockAdjustment } from '/_102051_/l1/cafeFlow/layer_3_domain/entities/stockAdjustment.js';
export interface IStockAdjustmentRepository {
  append(record: StockAdjustment): Promise<void>;
  listByPeriod(period: DateRange): Promise<StockAdjustment[]>;
  listByProductId(productId: ProductId): Promise<StockAdjustment[]>;
}
`;

test('collectInventedRelationshipKeyIssues flags a literal-cast related() key (erro4) but not a typed key', () => {
  // The exact erro4 shape: entity.related(key as 'o') — an invented CompactRelationshipRefKey forced past the type.
  const bad = `for (const key of ['o','op'] as const) { const ids = entity.related(key as 'o'); pushAll(ids); }
    const more = entity.relatedIds(rel as "OffersProduct");`;
  const issues = collectInventedRelationshipKeyIssues(bad);
  assert.equal(issues.length, 2, issues.join(' | '));
  assert.ok(issues.some(i => i.includes("as 'o'")));
  assert.ok(issues.some(i => i.includes("as 'OffersProduct'")));
  // A properly typed key (no literal cast) must NOT be flagged.
  const good = `const rel: CompactRelationshipRefKey = resolveKey(); const ids = entity.related(rel);`;
  assert.deepEqual(collectInventedRelationshipKeyIssues(good), []);
});

test('extractInterfaceMethods reads only the named interface method signatures', () => {
  const methods = extractInterfaceMethods(STOCK_ADJ_PORT, 'IStockAdjustmentRepository');
  assert.deepEqual([...methods].sort(), ['append', 'listByPeriod', 'listByProductId']);
  // Unknown interface -> empty (never a false source of methods).
  assert.equal(extractInterfaceMethods(STOCK_ADJ_PORT, 'IOrderRepository').size, 0);
});

test('collectRepositoryMethodMisuse flags a call to a method the port does not declare (run14: save on append-only)', () => {
  const methods = new Map([['IStockAdjustmentRepository', extractInterfaceMethods(STOCK_ADJ_PORT, 'IStockAdjustmentRepository')]]);
  const code = `
    const stockAdjustments = resolveRepository<IStockAdjustmentRepository>(ctx, 'StockAdjustment');
    await stockAdjustments.save(record);
    const past = await stockAdjustments.listByPeriod(period);
  `;
  const issues = collectRepositoryMethodMisuse(code, methods);
  assert.equal(issues.length, 1, issues.join('\n'));
  assert.match(issues[0], /stockAdjustments\.save\(\) is not declared on IStockAdjustmentRepository/);
  assert.match(issues[0], /use one of: append, listByPeriod, listByProductId/);
});

test('collectDeleteOperationPortGaps fires on petShop deleteScheduleBlock whose port has no delete', () => {
  const port = `
export interface IScheduleBlockRepository {
  getById(id: string): Promise<ScheduleBlock | null>;
  list(filter: ScheduleBlockFilter): Promise<ScheduleBlock[]>;
  save(aggregate: ScheduleBlock): Promise<ScheduleBlock>;
}
`;
  const methods = new Map([['IScheduleBlockRepository', extractInterfaceMethods(port, 'IScheduleBlockRepository')]]);
  const issues = collectDeleteOperationPortGaps('deleteScheduleBlock', methods);
  assert.equal(issues.length, 1, issues.join('\n'));
  assert.match(issues[0], /deleteScheduleBlock' requires IScheduleBlockRepository\.delete/);
  assert.match(issues[0], /getById, list, save/);
  const withDelete = new Map([['IScheduleBlockRepository', new Set(['getById', 'list', 'save', 'delete'])]]);
  assert.deepEqual(collectDeleteOperationPortGaps('deleteScheduleBlock', withDelete), []);
  assert.deepEqual(collectDeleteOperationPortGaps('updateScheduleBlock', methods), []);
  assert.deepEqual(collectDeleteOperationPortGaps('deleteScheduleBlock', new Map()), []);
  // inactivate* is getById→save (status update), not a port method — matching it is a false positive.
  assert.deepEqual(collectDeleteOperationPortGaps('inactivatePet', methods), []);
});

test('collectRepositoryMethodMisuse accepts only-declared calls and skips unresolved interfaces', () => {
  const methods = new Map([['IStockAdjustmentRepository', extractInterfaceMethods(STOCK_ADJ_PORT, 'IStockAdjustmentRepository')]]);
  // All calls valid.
  assert.deepEqual(collectRepositoryMethodMisuse(`
    const a = resolveRepository<IStockAdjustmentRepository>(ctx, 'StockAdjustment');
    await a.append(r); await a.listByProductId(id);
  `, methods), []);
  // Port not in the map (source unresolved) -> skipped, no false positive even for a bogus method.
  assert.deepEqual(collectRepositoryMethodMisuse(`
    const o = resolveRepository<IOrderRepository>(ctx, 'Order');
    await o.whatever(x);
  `, methods), []);
});

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

// ── T12: the createStockAdjustment bug (erro4 + erro5) ──────────────────────────
// Real cafeFlow shape: StockAdjustment is kind:"event" (append-only), its ONLY relationship is to
// StockItem (kind:"mdm"), so deriveEventTargets finds no related CORE entity -> ownerEntity === ''.
// The owner L4 declares entity:"StockAdjustment". Before the fix the event matched none of the three
// derivation paths, so the port never reached dependsFiles and the model had to guess the interface.
test('T12: an event the operation CREATES is owned by it even with an empty ownerEntity', () => {
  const stockAdjustment = { entityId: 'StockAdjustment', ownerEntity: '' };
  const ownerRefs = ['StockAdjustment', 'StockItem'];           // l4 entity + reads
  const mutated = new Set(ownerRefs);
  assert.equal(eventPortBelongsToOwner(stockAdjustment, ownerRefs, mutated), true);
});

test('T12: an event whose ownerEntity is MDM but referenced by the owner is included', () => {
  const event = { entityId: 'StockAdjustment', ownerEntity: 'StockItem' }; // StockItem is mdm
  assert.equal(eventPortBelongsToOwner(event, ['StockAdjustment'], new Set(['StockAdjustment'])), true);
});

test('T12: the legacy ownerEntity path still matches, and an UNRELATED event is NOT pulled in', () => {
  // legacy: the event belongs to a core entity the owner mutates.
  assert.equal(eventPortBelongsToOwner({ entityId: 'ShiftClosed', ownerEntity: 'DailyShift' }, ['DailyShift'], new Set(['DailyShift'])), true);
  // unrelated event -> excluded (T5 context savings must hold: no blanket inclusion).
  assert.equal(eventPortBelongsToOwner({ entityId: 'OrderPlaced', ownerEntity: 'Order' }, ['DailyShift'], new Set(['DailyShift'])), false);
  // an EMPTY ownerEntity must never match an empty ownerRefs entry (would pull in every event).
  assert.equal(eventPortBelongsToOwner({ entityId: 'OrderPlaced', ownerEntity: '' }, ['', 'DailyShift'], new Set(['DailyShift'])), false);
});

test('T12 item 4: judge flags a defs whose principal aggregate has a port but is not declared', () => {
  const localPorts = new Set(['StockAdjustment', 'DailyShift']);
  const mdm = new Set(['StockItem']);
  // the erro5 defs: ports = ["DailyShift"], principal aggregate StockAdjustment missing.
  const issues = missingPrincipalPortIssues({ id: 'createStockAdjustment', entity: 'StockAdjustment' }, ['DailyShift'], localPorts, mdm);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /principal aggregate 'StockAdjustment'/u);
  assert.match(issues[0], /IStockAdjustmentRepository/u);
  // declared -> no finding.
  assert.deepEqual(missingPrincipalPortIssues({ id: 'createStockAdjustment', entity: 'StockAdjustment' }, ['DailyShift', 'StockAdjustment'], localPorts, mdm), []);
  // REGRESSION: an MDM-only usecase (browseMenuItems) must NOT be told to invent a local port.
  assert.deepEqual(missingPrincipalPortIssues({ id: 'browseMenuItems', entity: 'StockItem' }, [], localPorts, mdm), []);
  // an entity with no local port at all -> nothing to declare.
  assert.deepEqual(missingPrincipalPortIssues({ id: 'doThing', entity: 'Whatever' }, [], localPorts, mdm), []);
});

test('T12 item 3: the worker belt spots ports referenced by the defs but absent from dependsFiles', () => {
  const dependsFiles = [
    '_102051_/l1/cafeFlow/layer_2_application/ports/dailyShiftRepository.d.ts',
    '_102051_/l1/cafeFlow/layer_3_domain/entities/dailyShift.d.ts',
  ];
  // ports/functions[].ports name StockAdjustment, but only the DailyShift pair is in dependsFiles.
  const data = { ports: ['DailyShift', 'StockAdjustment'], functions: [{ ports: ['StockAdjustment'] }] };
  assert.deepEqual(portsMissingFromDependsFiles(data, dependsFiles), ['StockAdjustment']);
  // fully declared -> nothing extra loaded (no context bloat).
  assert.deepEqual(portsMissingFromDependsFiles({ ports: ['DailyShift'] }, dependsFiles), []);
  assert.deepEqual(portsMissingFromDependsFiles(undefined, dependsFiles), []);
});

// ── T10: ownership-check sanity guard ──────────────────────────────────────────
test('T10: an empty ownership set with generated defs present is INCONCLUSIVE, not 20 orphans', () => {
  // erro5: the gen-http `done` flip emptied the scan -> 0 expected ids, 20 usecase defs on disk.
  assert.equal(ownershipCheckIsInconclusive(0, 20), true);
  assert.match(ownershipInconclusiveWarning(20), /inconclusive/u);
  assert.match(ownershipInconclusiveWarning(20), /20 generated defs/u);
  // a healthy scan -> the check runs normally (a GENUINE orphan must still be caught).
  assert.equal(ownershipCheckIsInconclusive(20, 20), false);
  // no defs at all -> nothing to be inconclusive about.
  assert.equal(ownershipCheckIsInconclusive(0, 0), false);
});

test('T10: the guard is gated PER CHECK — a v2 module must not defeat the usecase guard', () => {
  // erro5 state on cafeFlow (v2): owners all flipped to `done` so the status-filtered scan yields 0
  // operations, but scan.workspaces is NOT status-filtered -> 3 workspaces are still present.
  const expectedOperations = 0;
  const expectedWorkspaces = 3;
  const usecaseDefs = 20;
  const controllerDefs = 3;
  // USECASE ownership comes ONLY from operations -> inconclusive (this is what erro5 got wrong).
  assert.equal(ownershipCheckIsInconclusive(expectedOperations, usecaseDefs), true);
  // Summing the two sets (0 + 3) would have left the usecase guard DEAD — regression pin.
  assert.equal(ownershipCheckIsInconclusive(expectedOperations + expectedWorkspaces, usecaseDefs), false,
    'summing operations+workspaces must NOT be used for the usecase check');
  // CONTROLLER ownership accepts workspaces too, so with workspaces present it stays conclusive.
  assert.equal(ownershipCheckIsInconclusive(expectedOperations + expectedWorkspaces, controllerDefs), false);
  // A v1 module (no workspaces) with 0 operations -> both checks are inconclusive.
  assert.equal(ownershipCheckIsInconclusive(0 + 0, controllerDefs), true);
});

// ── T10 / Opção A: the required regression suite ────────────────────────────────
// Fixture = the erro5 post-gen-http state: 20 usecase defs + 3 v2 controller defs, generated by THIS
// run, with every owner already flipped to `done` by gen-http.
const OP_IDS = ['browsemenuforpos', 'createstockadjustment', 'openshift', 'closeshift', 'voidadjustment'];
const usecaseDefsFixture = OP_IDS.map(id => ({ folder: 'cafeFlow/layer_2_application/usecases', shortName: id, real: id }));
const controllerDefsFixture = ['posworkspace', 'stockworkspace'].map(id => ({ folder: 'cafeFlow/l1/adapters/http/controllers', shortName: id, real: id }));

test('T10 regression: with the ALL_STATUSES scan (A1) the run-generated defs produce ZERO orphans', () => {
  // A1: the scan now returns the `done` owners too, so expectedOperationIds is populated.
  const expectedOperations = new Set(OP_IDS);
  const expectedWorkspaces = new Set(['posworkspace', 'stockworkspace']);
  const { findings, warnings } = collectOrphanDefsFindings(
    [...usecaseDefsFixture, ...controllerDefsFixture], expectedOperations, expectedWorkspaces);
  assert.deepEqual(findings, [], 'no defs generated by this run may be reported as an orphan');
  assert.deepEqual(warnings, [], 'ownership was conclusive -> no degradation warning');
});

test('T10 guard: the PRE-A1 state degrades to warnings instead of 20 blocking findings', () => {
  // Pending-filtered scan after the gen-http flip: 0 operations, but workspaces are NOT status-filtered.
  const { findings, warnings } = collectOrphanDefsFindings(
    [...usecaseDefsFixture, ...controllerDefsFixture], new Set(), new Set(['posworkspace', 'stockworkspace']));
  // The usecase check is inconclusive -> ONE warning, NOT 5 blocking findings.
  assert.equal(warnings.length, 1, warnings.join(' | '));
  assert.match(warnings[0], /inconclusive/u);
  // Crucially: nothing blocking for the usecases (this is what starved the repair round in erro5).
  assert.equal(findings.filter(f => f.includes('layer_2_application/usecases')).length, 0);
  // The controller check still had workspaces, so it stayed conclusive and passed.
  assert.equal(findings.length, 0);
});

test('T10: a TRUE orphan is still blocking (an id owned by no owner, any status)', () => {
  const expectedOperations = new Set(OP_IDS);                 // 'legacyremovedusecase' is NOT here
  const withOrphan = [...usecaseDefsFixture, { folder: 'cafeFlow/layer_2_application/usecases', shortName: 'legacyremovedusecase', real: 'legacyRemovedUsecase' }];
  const { findings, warnings } = collectOrphanDefsFindings(withOrphan, expectedOperations, new Set());
  assert.equal(findings.length, 1, findings.join(' | '));
  assert.match(findings[0], /legacyRemovedUsecase\.defs\.ts is not owned by a current operation/u);
  assert.match(findings[0], /manual reconciliation required/u);
  assert.deepEqual(warnings, []);
  // A controller owned by NEITHER an operation nor a workspace is blocking too.
  const orphanController = collectOrphanDefsFindings(
    [{ folder: 'm/adapters/http/controllers', shortName: 'ghostworkspace', real: 'ghostWorkspace' }],
    expectedOperations, new Set(['posworkspace']));
  assert.equal(orphanController.findings.length, 1);
  assert.match(orphanController.findings[0], /not owned by a current operation\/workspace/u);
});

test('T10 / A1: the V1 canonical-route check still fires for owners already flipped to done', () => {
  const lowerFirstFn = (v: string) => v.charAt(0).toLowerCase() + v.slice(1);
  // Owners come from the ALL_STATUSES scan -> present even though todoStatus is 'done'.
  const owners = [
    { kind: 'operation', id: 'CreateStockAdjustment', bffName: 'cafeFlow.stock.createAdjustment' },
    { kind: 'operation', id: 'OpenShift' },                    // no bffName -> canonical fallback
    { kind: 'workflow', id: 'NightlyClose' },                   // not an operation -> ignored
  ];
  const controllers = [
    { id: 'createstockadjustment', routes: [{ key: 'cafeFlow.stock.createAdjustment' }] },  // ok
    { id: 'openshift', routes: [{ key: 'cafeFlow.wrong.route' }] },                          // missing
  ];
  const issues = collectMissingCanonicalRouteIssues(owners, controllers, 'cafeFlow', lowerFirstFn);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /controller openshift -> missing canonical bffName route cafeFlow\.OpenShift\.OpenShift/u);
  // An operation with NO controller is not flagged here (completeness checks own that case).
  assert.deepEqual(collectMissingCanonicalRouteIssues(owners, [], 'cafeFlow', lowerFirstFn), []);
});

// ── collectDetailsDefaultingIssues: the 102051 "details JSONB null" 500 ─────────
// The generated adapter defaulted only inside `catch`, but JSON.parse('{}') never throws, so a row with
// details=NULL yielded an entity whose required numbers were undefined -> `.toFixed(2)` threw a 500
// (bug_trace_changeBackend.md D1). Entity-agnostic: the fixtures below use an arbitrary entity name.
const BAD_ADAPTER = `
function parseDetails(row: WidgetRow): WidgetDetails {
  try { return JSON.parse(row.details ?? '{}') as WidgetDetails; }
  catch { return { totalAmount: 0, items: [], updatedAt: row.created_at }; }
}
function toDomain(row: WidgetRow): Widget {
  const d = parseDetails(row);
  return { widgetId: row.widget_id, totalAmount: d.totalAmount, items: d.items ?? [] };
}
`;
const GOOD_ADAPTER = `
function detailsDefaults(row: WidgetRow): WidgetDetails {
  return { totalAmount: 0, items: [], updatedAt: row.created_at };
}
function parseDetails(row: WidgetRow): WidgetDetails {
  let parsed: Partial<WidgetDetails> = {};
  try { parsed = (JSON.parse(row.details ?? '{}') ?? {}) as Partial<WidgetDetails>; }
  catch { parsed = {}; }
  return { ...detailsDefaults(row), ...parsed };
}
`;

test('collectDetailsDefaultingIssues flags parse-without-merge AND the lying cast', () => {
  const issues = collectDetailsDefaultingIssues(BAD_ADAPTER);
  assert.equal(issues.length, 2, issues.join(' | '));
  assert.ok(issues.some(i => /details defaulting -> parseDetails\(\)/.test(i)), issues.join(' | '));
  assert.ok(issues.some(i => /details cast .*'WidgetDetails'.*Partial<WidgetDetails>/.test(i)), issues.join(' | '));
});

test('collectDetailsDefaultingIssues accepts the merge-over-defaults shape', () => {
  assert.deepEqual(collectDetailsDefaultingIssues(GOOD_ADAPTER), []);
});

test('collectDetailsDefaultingIssues ignores code that never parses a details envelope', () => {
  // MDM reads inspect `entity.details.<module>` but never JSON.parse it -> not a candidate.
  const mdmRead = `
    async function loadMenu(ctx: RequestContext) {
      const rows = await ctx.mdm.collection.listByType({ type: canonicalType });
      return rows.map(entity => ({ name: entity.name, extra: entity.details.someModule }));
    }
  `;
  assert.deepEqual(collectDetailsDefaultingIssues(mdmRead), []);
  // A plain adapter with no details column at all.
  assert.deepEqual(collectDetailsDefaultingIssues(`
    function toDomain(row: EventRow): Event { return { eventId: row.event_id, at: row.created_at }; }
  `), []);
});

const JSONB_FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../steps/gen-adapter/fixtures');

test('collectJsonbRowParseFindings flags the real pet adapter and stays quiet on the dual-shape parse', () => {
  const adapter = readFileSync(path.join(JSONB_FIXTURE_DIR, 'petRepositoryAdapter.ts'), 'utf8');
  const table = readFileSync(path.join(JSONB_FIXTURE_DIR, 'pet.ts'), 'utf8');
  const declared = jsonbColumnsFromTableSource(table);
  assert.equal(declared?.tableName, 'pet');
  assert.deepEqual(declared?.columns, ['details']);
  const issues = collectJsonbRowParseFindings(adapter, new Set(declared!.columns), 'petRepositoryAdapter.ts');
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /JSON\.parse\(row\.details\)/);
  const fixed = `
    function parseDetails(row: PetRow): PetDetails {
      let parsed: Partial<PetDetails> = {};
      try {
        const raw = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details ?? {});
        parsed = (raw ?? {}) as Partial<PetDetails>;
      } catch (error) {
        console.warn('[parseDetails] pet ' + row.pet_id + ': details is not JSON', error);
        parsed = {};
      }
      return { ...detailsDefaults(), ...parsed };
    }
  `;
  assert.deepEqual(collectJsonbRowParseFindings(fixed, new Set(['details']), 'petRepositoryAdapter.ts'), []);
});

const TASK_FIELD_ID_SET = fieldIdsFromL4Fields(TASK_L4_FIELDS);

const SNAKE_DETAILS_ADAPTER = `
interface TaskDetails {
  title: string;
  due_date: string | null;
}
function detailsDefaults(): TaskDetails {
  return { title: '', due_date: null };
}
function parseDetails(row: TaskRow): TaskDetails {
  let parsed: Partial<TaskDetails> = {};
  try {
    const raw = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details ?? {});
    parsed = (raw ?? {}) as Partial<TaskDetails>;
  } catch { parsed = {}; }
  return { ...detailsDefaults(), ...parsed };
}
function toDomain(row: TaskRow): Task {
  const details = parseDetails(row);
  return { taskId: row.task_id, title: details.title, dueDate: details.due_date };
}
function toRow(task: Task): TaskRow {
  const details: TaskDetails = { title: task.title, due_date: task.dueDate };
  return { task_id: task.taskId, details: JSON.stringify(details) };
}
`;

test('collectDetailsKeyIssues flags a snake_case JSONB key and stays quiet on fieldId keys', () => {
  const issues = collectDetailsKeyIssues(SNAKE_DETAILS_ADAPTER, TASK_FIELD_ID_SET, 'taskRepositoryAdapter.ts');
  assert.ok(issues.some(i => /JSONB key 'due_date'/.test(i)), issues.join(' | '));
  assert.equal(issues.length, 1, issues.join(' | '));
  const good = readFileSync(path.join(JSONB_FIXTURE_DIR, 'taskDetailsRoundTrip.ts'), 'utf8');
  assert.deepEqual(collectDetailsKeyIssues(good, TASK_FIELD_ID_SET, 'taskDetailsRoundTrip.ts'), []);
});

test('collectDetailsKeyIssues skips when the l4 vocabulary is empty', () => {
  assert.deepEqual(collectDetailsKeyIssues(SNAKE_DETAILS_ADAPTER, new Set(), 'taskRepositoryAdapter.ts'), []);
});

test('seed-row round-trip through toDomain keeps every l4 field, including dueDate', () => {
  const task = toDomain(TASK_SEED_ROW);
  for (const fieldId of TASK_FIELD_IDS) {
    assert.notEqual((task as unknown as Record<string, unknown>)[fieldId], undefined, fieldId);
  }
  assert.equal(task.dueDate, '2026-07-02T12:00:00.000Z');
  const again = toDomain(toRow(task));
  assert.equal(again.dueDate, task.dueDate);
  assert.equal(again.title, task.title);
});

test('extractFunctionBlocks brace-matches nested bodies for both function and arrow forms', () => {
  const blocks = extractFunctionBlocks(`
    function outer(a: number) { if (a) { return { x: 1 }; } return null; }
    const arrow = (b: string) => { const o = { y: { z: b } }; return o; };
  `);
  assert.deepEqual(blocks.map(b => b.name), ['outer', 'arrow']);
  assert.match(blocks[0].body, /return null;/);
  assert.match(blocks[1].body, /return o;/);
});

// ── extractCollectionFieldNames: the details key must match what the adapter reads ──
// The TableDefinition declares children by ENTITY ID (childCollections: ['OrderItem']) but the generated
// entity names the field (`items: OrderItem[]`) and the adapter reads `d.items`. Seeding under the entity
// id would write details.OrderItem while the reader looks at details.items — collection arrives empty.
test('extractCollectionFieldNames maps a value-object type to the field name that holds it', () => {
  const entity = `
    export interface Order {
      orderId: string;
      status: OrderStatus;
      items: OrderItem[];
      payments?: OrderPayment[];
      readonly tags: string[];
    }
  `;
  const map = extractCollectionFieldNames(entity);
  assert.equal(map.get('OrderItem'), 'items');
  assert.equal(map.get('OrderPayment'), 'payments');
  assert.equal(map.get('string'), 'tags');
  assert.equal(map.get('Missing'), undefined);
});

test('extractCollectionFieldNames keeps the FIRST declaration and ignores non-array fields', () => {
  const map = extractCollectionFieldNames(`
    export interface A { primary: Thing[]; }
    export interface B { secondary: Thing[]; }
    export interface C { single: Thing; }
  `);
  assert.equal(map.get('Thing'), 'primary');
  assert.equal(map.size, 1, 'a non-array field must not register');
});

// F1.2 (bugTests.md): 7 of the 22 production failures were `INTERNAL_ERROR: Unexpected error` — every
// generated delete usecase cast its repository to invent a `delete` the port never declared, so the call
// was `undefined` at runtime. The cast is exactly what hides it from collectRepositoryMethodMisuse.
test('a repository cast that invents a method is rejected, with the readable alternative named', () => {
  const code = [
    "const clients = resolveRepository<IClientRepository>(ctx, 'Client');",
    'const deletedClient = clients as unknown as { delete(id: string): Promise<void> };',
    'await deletedClient.delete(client.clientId);',
  ].join('\n');
  const issues = collectRepositoryCastIssues(code);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /invents clients\.delete\(\.\.\.\) by cast/u);

  // `as any` is the same escape by another spelling.
  assert.equal(collectRepositoryCastIssues([
    "const invoices = resolveRepository<IInvoiceRepository>(ctx, 'Invoice');",
    'const anyInvoices = invoices as any;',
  ].join('\n')).length, 1);

  // What the honest file does — no cast at all — says nothing.
  assert.deepEqual(collectRepositoryCastIssues([
    "const assignments = resolveRepository<IProjectCoordinationAssignmentRepository>(ctx, 'ProjectCoordinationAssignment');",
    "throw new AppError('CONFLICT', 'ProjectCoordinationAssignment repository does not support deletion.', 409, {});",
  ].join('\n')), []);

  // A cast of something that is NOT a resolved repository is none of this gate's business.
  assert.deepEqual(collectRepositoryCastIssues('const row = payload as unknown as { delete(): void };'), []);
});

test('T3 positive: 102046 deleteClient inline object cast is a finding (copied, not read from the app)', () => {
  // Byte-for-byte the production shape (multiline object type). Fixture inline — never read mls-102046.
  const code = [
    "const clients = resolveRepository<IClientRepository>(ctx, 'Client');",
    'const deletedClient = clients as unknown as {',
    '  delete(id: string): Promise<void>;',
    '};',
    'await deletedClient.delete(client.clientId);',
  ].join('\n');
  const issues = collectRepositoryCastIssues(code);
  assert.equal(issues.length, 1, issues.join(' | '));
  assert.match(issues[0], /invents clients\.delete\(\.\.\.\) by cast/u);
  assert.match(issues[0], /Declare it on the port or do not emit the operation/u);
});

test('T3 negative: named-type as unknown as is not a finding', () => {
  const named = [
    "const clients = resolveRepository<IClientRepository>(ctx, 'Client');",
    "const details = clients as unknown as Parameters<typeof ctx.mdm.entity.create>[0]['details'];",
  ].join('\n');
  assert.deepEqual(collectRepositoryCastIssues(named), []);

  const alias = [
    "const invoices = resolveRepository<IInvoiceRepository>(ctx, 'Invoice');",
    'const deletable = invoices as unknown as DeletableInvoiceRepository;',
  ].join('\n');
  assert.deepEqual(collectRepositoryCastIssues(alias), []);
});

test('adapter missing a port method is a finding; implementing all is silence', () => {
  const port = `
export interface ITicketRepository {
  getById(id: string): Promise<Ticket | null>;
  list(filter: TicketFilter): Promise<Ticket[]>;
  save(aggregate: Ticket): Promise<void>;
  delete(id: string): Promise<void>;
}
`;
  assert.equal(extractRepositoryInterfaceName(port), 'ITicketRepository');
  const methods = extractInterfaceMethods(port, 'ITicketRepository');
  const missingDelete = `
export function createTicketRepositoryAdapter(ctx: RequestContext): ITicketRepository {
  const getTable = () => ctx.data.moduleData.getTable<TicketRow>('ticket');
  return {
    async getById(id) { return null; },
    async list(filter) { return []; },
    async save(aggregate) { return; },
  };
}
`;
  const issues = collectAdapterMissingPortMethods(missingDelete, methods, 'ticketRepositoryAdapter.ts', 'ITicketRepository');
  assert.equal(issues.length, 1, issues.join('\n'));
  assert.match(issues[0], /missing ITicketRepository\.delete/);
  assert.match(issues[0], /the port declares delete, getById, list, save/);

  const complete = `
export function createTicketRepositoryAdapter(ctx: RequestContext): ITicketRepository {
  const getTable = () => ctx.data.moduleData.getTable<TicketRow>('ticket');
  return {
    async getById(id) { return null; },
    async list(filter) { return []; },
    async save(aggregate) { return; },
    async delete(id) { await (await getTable()).delete({ where: { ticket_id: id } }); },
  };
}
`;
  assert.deepEqual(collectAdapterMissingPortMethods(complete, methods, 'ticketRepositoryAdapter.ts', 'ITicketRepository'), []);
  const extracted = extractAdapterFactoryMethods(complete);
  assert.ok(extracted.has('delete') && extracted.has('save') && extracted.has('getById'));
});

const TICKET_COMMENT_EXPORTS = `
export interface TicketComment { ticketCommentId: string; ticketId: string; commentText: string; }
export function hasValidTicketCommentText(text: string): boolean { return text.trim().length > 0; }
export function canAddTicketComment(ticket: { status: string }): boolean { return ticket.status === 'open'; }
`;

test('extensionless /_<id>_/ path is a finding; .js and bare packages are not', () => {
  const issues = collectExtensionlessImportIssues([
    "import { listAtendente } from '/_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente';",
    "import { ok } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
    "import { readFile } from 'node:fs';",
  ].join('\n'));
  assert.equal(issues.length, 1, issues.join('\n'));
  assert.match(issues[0], /extensionless import -> '\/_102039_\/l1\/controleChamados\/layer_2_application\/usecases\/listAtendente'/);
});

test('closestExportedName matches the same camelCase words in another order (canAddCommentToTicket)', () => {
  assert.equal(significantCamelWords('canAddCommentToTicket'), significantCamelWords('canAddTicketComment'));
  assert.equal(
    closestExportedName('canAddCommentToTicket', ['TicketComment', 'hasValidTicketCommentText', 'canAddTicketComment']),
    'canAddTicketComment',
  );
});

test('invented import with a close export is renamed and records the pair; existing names stay', () => {
  const code = `import { canAddCommentToTicket, hasValidTicketCommentText } from '/_102047_/l1/controleChamados/layer_3_domain/entities/ticketComment.js';
if (!canAddCommentToTicket(ticket)) throw new Error('closed');
if (!hasValidTicketCommentText(input.commentText)) throw new Error('empty');
`;
  const targets = new Map([['controleChamados/layer_3_domain/entities::ticketComment', TICKET_COMMENT_EXPORTS]]);
  const fix = applyInventedImportFixes(code, 102047, targets, 'controleChamados');
  assert.equal(fix.findings.length, 0, fix.findings.join('\n'));
  assert.equal(fix.renamed.length, 1);
  assert.equal(fix.renamed[0].imported, 'canAddCommentToTicket');
  assert.equal(fix.renamed[0].exported, 'canAddTicketComment');
  assert.match(fix.code, /canAddTicketComment/);
  assert.doesNotMatch(fix.code, /canAddCommentToTicket/);
  assert.match(fix.code, /hasValidTicketCommentText/);
});

test('invented import with no close export is a finding; a name that exists is left alone', () => {
  const code = `import { totallyInventedPredicate, canAddTicketComment } from '/_102047_/l1/controleChamados/layer_3_domain/entities/ticketComment.js';
`;
  const targets = new Map([['controleChamados/layer_3_domain/entities::ticketComment', TICKET_COMMENT_EXPORTS]]);
  const fix = applyInventedImportFixes(code, 102047, targets, 'controleChamados');
  assert.equal(fix.renamed.length, 0);
  assert.equal(fix.findings.length, 1, fix.findings.join('\n'));
  assert.match(fix.findings[0], /totallyInventedPredicate/);
  assert.match(fix.code, /canAddTicketComment/);
});

test('invented import of /_102034_/ runtime is ignored even when the name does not exist', () => {
  const code = `import { notARealRuntimeExport } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
`;
  const targets = new Map([['server/layer_2_controllers::contracts', 'export function AppError() {}']]);
  const fix = applyInventedImportFixes(code, 102047, targets, 'controleChamados');
  assert.deepEqual(collectNamedL1Imports(code, 102047, 'controleChamados'), []);
  assert.deepEqual(fix.findings, []);
  assert.deepEqual(fix.renamed, []);
  assert.equal(fix.code, code);
});

test('collectExportedNames reads function/interface/type and export lists', () => {
  const names = collectExportedNames(TICKET_COMMENT_EXPORTS);
  assert.ok(names.has('TicketComment'));
  assert.ok(names.has('hasValidTicketCommentText'));
  assert.ok(names.has('canAddTicketComment'));
});

test('let x: T | null = null assigned only inside a callback then if (!x) is a finding', () => {
  const bad = `
let updatedComment: TicketComment | null = null;
await ctx.data.runInTransaction(async () => {
  updatedComment = { ...comment, commentText: input.commentText };
});
if (!updatedComment) throw new AppError('CONFLICT', 'Ticket comment was not updated.', 409);
return { ticketCommentId: updatedComment.ticketCommentId };
`;
  const issues = collectCallbackNullAssignmentIssues(bad);
  assert.equal(issues.length, 1, issues.join('\n'));
  assert.match(issues[0], /updatedComment/);
  assert.match(issues[0], /callback-assigned null/);
});

test('the same let-null pattern with an assignment outside a callback is not a finding', () => {
  const good = `
let updatedComment: TicketComment | null = null;
updatedComment = { ...comment, commentText: input.commentText };
await ctx.data.runInTransaction(async () => {
  await comments.save(updatedComment);
});
if (!updatedComment) throw new AppError('CONFLICT', 'Ticket comment was not updated.', 409);
return { ticketCommentId: updatedComment.ticketCommentId };
`;
  assert.deepEqual(collectCallbackNullAssignmentIssues(good), []);
});

