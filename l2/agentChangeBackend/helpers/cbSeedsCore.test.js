"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var cbSeedsCore_js_1 = require("./cbSeedsCore.js");
function field(fieldId, required, enumValues) {
    if (required === void 0) { required = true; }
    if (enumValues === void 0) { enumValues = []; }
    return { fieldId: fieldId, type: 'string', required: required, enumValues: enumValues };
}
function validInput() {
    return {
        project: 102051,
        moduleName: 'cafeFlow',
        language: 'en',
        ruleIds: ['singleOpenShift', 'orderStatusFlow', 'menuItemRequiresIngredient'],
        entities: [
            { entityId: 'Shift', title: 'Shift', kind: 'core', fields: [field('shiftId'), field('status', true, ['open', 'closed']), field('openedAt'), field('openedBy'), field('closedAt', false), field('closedBy', false), field('totalApurado', false), field('createdAt'), field('updatedAt')] },
            { entityId: 'Order', title: 'Order', kind: 'core', fields: [field('orderId'), field('shiftId'), field('status', true, ['registered', 'received', 'inPreparation', 'ready', 'delivered']), field('orderType', true, ['table', 'takeout']), field('createdAt'), field('updatedAt'), field('receivedAt', false), field('inPreparationAt', false), field('readyAt', false), field('deliveredAt', false)] },
            { entityId: 'MenuCategory', title: 'Menu Category', kind: 'mdm', fields: [field('menuCategoryId'), field('name'), field('displayOrder'), field('active'), field('createdAt'), field('updatedAt')] },
            { entityId: 'StockItem', title: 'Stock Item', kind: 'mdm', fields: [field('stockItemId'), field('name'), field('unit', true, ['kg', 'liter', 'portion', 'unit']), field('minimumLevel'), field('createdAt'), field('updatedAt')] },
            { entityId: 'MenuItem', title: 'Menu Item', kind: 'mdm', fields: [field('menuItemId'), field('name'), field('menuCategoryId'), field('price'), field('itemType', true, ['simple', 'variant']), field('status', true, ['draft', 'active', 'inactive']), field('activatedAt', false), field('createdAt'), field('updatedAt')] },
        ],
        tablePlans: [
            { tableId: 'Shift', tableName: 'shift', seedFor: 'cafeFlowShift', primaryKey: ['shift_id'], columns: [{ name: 'shift_id', type: 'UUID', nullable: false }, { name: 'status', type: 'VARCHAR', nullable: false }, { name: 'created_at', type: 'TIMESTAMP', nullable: false }, { name: 'details', type: 'JSONB', nullable: true }] },
            { tableId: 'Order', tableName: 'order', seedFor: 'cafeFlowOrder', primaryKey: ['order_id'], columns: [{ name: 'order_id', type: 'UUID', nullable: false }, { name: 'shift_id', type: 'UUID', nullable: false }, { name: 'status', type: 'VARCHAR', nullable: false }, { name: 'order_type', type: 'VARCHAR', nullable: false }, { name: 'created_at', type: 'TIMESTAMP', nullable: false }, { name: 'details', type: 'JSONB', nullable: true }] },
        ],
        relationships: [
            { fromEntity: 'MenuItem', toEntity: 'MenuCategory', type: 'manyToOne' },
            { fromEntity: 'MenuItem', toEntity: 'StockItem', type: 'manyToMany' },
            { fromEntity: 'Order', toEntity: 'Shift', type: 'manyToOne' },
        ],
        plan: {
            summary: 'Open shift, a POS order, and an active menu item with stock.',
            localTables: [
                { tableId: 'Shift', rows: [{ key: 'morning', columns: [{ name: 'status', value: 'open' }, { name: 'created_at', value: cbSeedsCore_js_1.SEED_T0 }], details: [{ name: 'openedAt', value: cbSeedsCore_js_1.SEED_T0 }, { name: 'openedBy', value: 'manager-1' }, { name: 'updatedAt', value: cbSeedsCore_js_1.SEED_T0 }], children: [] }] },
                { tableId: 'Order', rows: [{ key: 'registered', columns: [{ name: 'shift_id', value: { ref: 'local:Shift.morning' } }, { name: 'status', value: 'registered' }, { name: 'order_type', value: 'table' }, { name: 'created_at', value: cbSeedsCore_js_1.SEED_T1 }], details: [{ name: 'updatedAt', value: cbSeedsCore_js_1.SEED_T1 }], children: [] }] },
            ],
            mdmEntities: [
                { entityId: 'MenuCategory', rows: [{ key: 'coffee', fields: [{ name: 'name', value: 'Coffee' }, { name: 'displayOrder', value: 1 }, { name: 'active', value: true }, { name: 'createdAt', value: cbSeedsCore_js_1.SEED_T0 }, { name: 'updatedAt', value: cbSeedsCore_js_1.SEED_T0 }], relationships: [] }] },
                { entityId: 'StockItem', rows: [{ key: 'beans', fields: [{ name: 'name', value: 'Coffee beans' }, { name: 'unit', value: 'kg' }, { name: 'minimumLevel', value: 2 }, { name: 'createdAt', value: cbSeedsCore_js_1.SEED_T0 }, { name: 'updatedAt', value: cbSeedsCore_js_1.SEED_T0 }], relationships: [] }] },
                { entityId: 'MenuItem', rows: [{ key: 'espresso', fields: [{ name: 'name', value: 'Espresso' }, { name: 'menuCategoryId', value: { ref: 'mdm:MenuCategory.coffee' } }, { name: 'price', value: 4.5 }, { name: 'itemType', value: 'simple' }, { name: 'status', value: 'active' }, { name: 'activatedAt', value: cbSeedsCore_js_1.SEED_T1 }, { name: 'createdAt', value: cbSeedsCore_js_1.SEED_T0 }, { name: 'updatedAt', value: cbSeedsCore_js_1.SEED_T1 }], relationships: [{ targetRef: 'mdm:StockItem.beans', type: 'requires-ingredient', metadata: [{ name: 'quantityPerServing', value: 0.018 }], isBidirectional: false }] }] },
            ],
        },
    };
}
(0, node_test_1.default)('deriveSeedPlanningWaves orders the cafeFlow graph deterministically', function () {
    strict_1.default.deepEqual((0, cbSeedsCore_js_1.deriveSeedPlanningWaves)(validInput()), [
        { index: 1, tableIds: [], mdmEntityIds: ['MenuCategory', 'StockItem'] },
        { index: 2, tableIds: ['Shift'], mdmEntityIds: ['MenuItem'] },
        { index: 3, tableIds: ['Order'], mdmEntityIds: [] },
    ]);
});
(0, node_test_1.default)('deriveSeedPlanningWaves keeps foreign-key cycles together and uses table columns as dependencies', function () {
    var waves = (0, cbSeedsCore_js_1.deriveSeedPlanningWaves)({
        entities: [
            { entityId: 'Catalog', title: 'Catalog', kind: 'mdm', fields: [] },
            { entityId: 'Invoice', title: 'Invoice', kind: 'core', fields: [] },
            { entityId: 'Organization', title: 'Organization', kind: 'core', fields: [] },
            { entityId: 'BillingAccount', title: 'Billing account', kind: 'core', fields: [] },
            { entityId: 'AuditEvent', title: 'Audit event', kind: 'event', fields: [] },
        ],
        relationships: [{ fromEntity: 'Invoice', toEntity: 'Catalog', type: 'manyToOne' }],
        tablePlans: [
            { tableId: 'Invoice', tableName: 'invoice', seedFor: 'billingInvoice', primaryKey: ['invoice_id'], columns: [{ name: 'invoice_id', type: 'UUID', nullable: false }, { name: 'catalog_id', type: 'UUID', nullable: false }] },
            { tableId: 'Organization', tableName: 'organization', seedFor: 'billingOrganization', primaryKey: ['organization_id'], columns: [{ name: 'organization_id', type: 'UUID', nullable: false }, { name: 'billing_account_id', type: 'UUID', nullable: false }] },
            { tableId: 'BillingAccount', tableName: 'billing_account', seedFor: 'billingAccount', primaryKey: ['billing_account_id'], columns: [{ name: 'billing_account_id', type: 'UUID', nullable: false }, { name: 'organization_id', type: 'UUID', nullable: false }] },
            { tableId: 'AuditEvent', tableName: 'audit_event', seedFor: 'billingAuditEvent', primaryKey: ['audit_event_id'], columns: [{ name: 'audit_event_id', type: 'UUID', nullable: false }, { name: 'invoice_id', type: 'UUID', nullable: false }] },
        ],
    });
    strict_1.default.deepEqual(waves, [
        { index: 1, tableIds: [], mdmEntityIds: ['Catalog'] },
        { index: 2, tableIds: ['BillingAccount', 'Invoice', 'Organization'], mdmEntityIds: [] },
        { index: 3, tableIds: ['AuditEvent'], mdmEntityIds: [] },
    ]);
});
(0, node_test_1.default)('wave context excludes unrelated definitions and accepts only catalog references from earlier waves', function () {
    var input = validInput();
    var orderWave = { index: 3, tableIds: ['Order'], mdmEntityIds: [] };
    var scoped = (0, cbSeedsCore_js_1.seedPlanInputForWave)(input, orderWave);
    var prior = { summary: 'Shift opened.', localTables: [input.plan.localTables[0]], mdmEntities: [] };
    var orderPlan = { summary: 'Order registered after the shift opened.', localTables: [input.plan.localTables[1]], mdmEntities: [] };
    var context = (0, cbSeedsCore_js_1.seedPlanPromptContext)(scoped, [], { wave: orderWave, catalog: (0, cbSeedsCore_js_1.seedReferenceCatalog)(prior), priorSummary: prior.summary });
    strict_1.default.match(context, /"tableId": "Order"/);
    strict_1.default.doesNotMatch(context, /"entityId": "MenuItem"/);
    strict_1.default.match(context, /local:Shift\.morning/);
    strict_1.default.deepEqual((0, cbSeedsCore_js_1.validateSeedPlan)(__assign(__assign({}, scoped), { plan: orderPlan }), (0, cbSeedsCore_js_1.seedReferenceCatalog)(prior).map(function (item) { return item.ref; })), []);
    strict_1.default.ok((0, cbSeedsCore_js_1.validateSeedPlan)(__assign(__assign({}, scoped), { plan: orderPlan })).some(function (error) { return error.includes("unresolved reference 'local:Shift.morning'"); }));
});
(0, node_test_1.default)('partial seed source persists and resumes the accumulated plan without becoming a reusable final source', function () {
    var input = validInput();
    var partialPlan = { summary: 'Catalog and shift ready.', localTables: [input.plan.localTables[0]], mdmEntities: input.plan.mdmEntities.slice(0, 2) };
    var source = (0, cbSeedsCore_js_1.buildPartialSeedSource)(input, { plan: partialPlan, completedWaveIndexes: [1] });
    strict_1.default.equal((0, cbSeedsCore_js_1.extractSeedPlanFromSource)(source), null);
    strict_1.default.deepEqual((0, cbSeedsCore_js_1.extractSeedPlanProgressFromSource)(source), { plan: partialPlan, partial: true, completedWaveIndexes: [1] });
    strict_1.default.deepEqual((0, cbSeedsCore_js_1.mergeSeedPlans)(partialPlan, { summary: 'Order ready.', localTables: [input.plan.localTables[1]], mdmEntities: [input.plan.mdmEntities[2]] }), {
        summary: 'Order ready.',
        localTables: [input.plan.localTables[1], input.plan.localTables[0]],
        mdmEntities: [input.plan.mdmEntities[0], input.plan.mdmEntities[2], input.plan.mdmEntities[1]],
    });
});
(0, node_test_1.default)('splitSeedPlanningWave divides oversized independent table batches deterministically', function () {
    var input = validInput();
    input.relationships = [];
    input.tablePlans[1].columns = input.tablePlans[1].columns.filter(function (column) { return column.name !== 'shift_id'; });
    var batches = (0, cbSeedsCore_js_1.splitSeedPlanningWave)(input, { index: 2, tableIds: ['Order', 'Shift'], mdmEntityIds: [] }, 500);
    strict_1.default.deepEqual(batches, [
        { index: 2, tableIds: ['Order'], mdmEntityIds: [] },
        { index: 2, tableIds: ['Shift'], mdmEntityIds: [] },
    ]);
});
(0, node_test_1.default)('splitSeedPlanningWave keeps a same-wave reference component together', function () {
    var input = validInput();
    strict_1.default.deepEqual((0, cbSeedsCore_js_1.splitSeedPlanningWave)(input, { index: 3, tableIds: ['Order', 'Shift'], mdmEntityIds: [] }, 500), [
        { index: 3, tableIds: ['Order', 'Shift'], mdmEntityIds: [] },
    ]);
});
(0, node_test_1.default)('buildSeedSource compiles a valid semantic plan into local and MDM relationship seeds', function () {
    var _a, _b, _c, _d, _e;
    var result = (0, cbSeedsCore_js_1.buildSeedSource)(validInput());
    strict_1.default.deepEqual(result.errors, []);
    strict_1.default.match((_a = result.content) !== null && _a !== void 0 ? _a : '', /"seedFor": "mdmRelationship"/);
    strict_1.default.match((_b = result.content) !== null && _b !== void 0 ? _b : '', /requires-ingredient/);
    strict_1.default.match((_c = result.content) !== null && _c !== void 0 ? _c : '', /"shift_id": "[0-9a-f-]+"/);
    strict_1.default.equal((_e = (0, cbSeedsCore_js_1.extractSeedPlanFromSource)((_d = result.content) !== null && _d !== void 0 ? _d : '')) === null || _e === void 0 ? void 0 : _e.summary, validInput().plan.summary);
});
(0, node_test_1.default)('SeedAssetRef is accepted only for declared image/URL fields and resolves through the local asset map', function () {
    var _a, _b;
    var input = validInput();
    input.entities.find(function (entity) { return entity.entityId === 'Shift'; }).fields.push(field('photoUrl', false));
    input.plan.localTables[0].rows[0].details.push({ name: 'photoUrl', value: { asset: 'Shift/morning', kind: 'image' } });
    var built = (0, cbSeedsCore_js_1.buildSeedSource)(input);
    strict_1.default.deepEqual(built.errors, []);
    strict_1.default.match((_a = built.content) !== null && _a !== void 0 ? _a : '', /seedAssetUrl\("Shift\/morning"\)/);
    var withUrl = (0, cbSeedsCore_js_1.updateSeedAssetUrlsInSource)((_b = built.content) !== null && _b !== void 0 ? _b : '', { 'Shift/morning': '/cafeFlow/assets/seed/Shift/morning.webp' });
    strict_1.default.match(withUrl, /"Shift\/morning": "\/cafeFlow\/assets\/seed\/Shift\/morning\.webp"/);
    input.plan.localTables[0].rows[0].columns.find(function (field) { return field.name === 'status'; }).value = { asset: 'Shift/morning', kind: 'image' };
    strict_1.default.ok((0, cbSeedsCore_js_1.validateSeedPlan)(input).some(function (error) { return error.includes('declared image or URL fields'); }));
});
(0, node_test_1.default)('validateSeedPlan blocks invalid enum values but no longer enforces hardcoded domain invariants', function () {
    var input = validInput();
    // A second open shift + an invalid enum: the old generator tripped the hardcoded singleOpenShift
    // check here. That domain-specific invariant is gone (this generator is now domain-agnostic), so
    // only the generic enum violation is reported.
    input.plan.localTables[0].rows.push({
        key: 'afternoon',
        columns: [{ name: 'status', value: 'open' }, { name: 'created_at', value: cbSeedsCore_js_1.SEED_T1 }],
        details: [{ name: 'openedAt', value: cbSeedsCore_js_1.SEED_T1 }, { name: 'openedBy', value: 'manager-2' }, { name: 'updatedAt', value: cbSeedsCore_js_1.SEED_T1 }],
        children: [],
    });
    input.plan.localTables[1].rows[0].columns.find(function (field) { return field.name === 'order_type'; }).value = 'dineIn';
    var errors = (0, cbSeedsCore_js_1.validateSeedPlan)(input);
    strict_1.default.ok(errors.some(function (error) { return error.includes('expected one of table, takeout'); }));
    strict_1.default.ok(!errors.some(function (error) { return error.includes('singleOpenShift'); }));
});
(0, node_test_1.default)('validateSeedPlan accepts any ISO timestamp inside the window and rejects out-of-window', function () {
    var good = validInput();
    // A timestamp that is neither SEED_T0 nor SEED_T1 but still within the default window.
    good.plan.localTables[1].rows[0].columns.find(function (field) { return field.name === 'created_at'; }).value = '2026-07-03T14:30:00.000Z';
    good.plan.localTables[1].rows[0].details.find(function (field) { return field.name === 'updatedAt'; }).value = '2026-07-03T14:30:00.000Z';
    strict_1.default.deepEqual((0, cbSeedsCore_js_1.validateSeedPlan)(good), []);
    var bad = validInput();
    bad.plan.localTables[1].rows[0].columns.find(function (field) { return field.name === 'created_at'; }).value = '2020-01-01T00:00:00.000Z';
    strict_1.default.ok((0, cbSeedsCore_js_1.validateSeedPlan)(bad).some(function (error) { return error.includes('within'); }));
});
