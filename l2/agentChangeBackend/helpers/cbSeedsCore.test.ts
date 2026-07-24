/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPartialSeedSource, buildSeedSource, deriveSeedPlanningWaves, extractSeedPlanFromSource,
  extractSeedPlanProgressFromSource, mergeSeedPlans, seedPlanInputForWave, seedPlanPromptContext,
  seedReferenceCatalog, splitSeedPlanningWave, updateSeedAssetUrlsInSource, validateSeedPlan,
  SEED_T0, SEED_T1, type SeedBuildInput,
} from './cbSeedsCore.js';

function field(fieldId: string, required = true, enumValues: string[] = []) {
  return { fieldId, type: 'string', required, enumValues };
}

function validInput(): SeedBuildInput {
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
        { tableId: 'Shift', rows: [{ key: 'morning', columns: [{ name: 'status', value: 'open' }, { name: 'created_at', value: SEED_T0 }], details: [{ name: 'openedAt', value: SEED_T0 }, { name: 'openedBy', value: 'manager-1' }, { name: 'updatedAt', value: SEED_T0 }], children: [] }] },
        { tableId: 'Order', rows: [{ key: 'registered', columns: [{ name: 'shift_id', value: { ref: 'local:Shift.morning' } }, { name: 'status', value: 'registered' }, { name: 'order_type', value: 'table' }, { name: 'created_at', value: SEED_T1 }], details: [{ name: 'updatedAt', value: SEED_T1 }], children: [] }] },
      ],
      mdmEntities: [
        { entityId: 'MenuCategory', rows: [{ key: 'coffee', fields: [{ name: 'name', value: 'Coffee' }, { name: 'displayOrder', value: 1 }, { name: 'active', value: true }, { name: 'createdAt', value: SEED_T0 }, { name: 'updatedAt', value: SEED_T0 }], relationships: [] }] },
        { entityId: 'StockItem', rows: [{ key: 'beans', fields: [{ name: 'name', value: 'Coffee beans' }, { name: 'unit', value: 'kg' }, { name: 'minimumLevel', value: 2 }, { name: 'createdAt', value: SEED_T0 }, { name: 'updatedAt', value: SEED_T0 }], relationships: [] }] },
        { entityId: 'MenuItem', rows: [{ key: 'espresso', fields: [{ name: 'name', value: 'Espresso' }, { name: 'menuCategoryId', value: { ref: 'mdm:MenuCategory.coffee' } }, { name: 'price', value: 4.5 }, { name: 'itemType', value: 'simple' }, { name: 'status', value: 'active' }, { name: 'activatedAt', value: SEED_T1 }, { name: 'createdAt', value: SEED_T0 }, { name: 'updatedAt', value: SEED_T1 }], relationships: [{ targetRef: 'mdm:StockItem.beans', type: 'requires-ingredient', metadata: [{ name: 'quantityPerServing', value: 0.018 }], isBidirectional: false }] }] },
      ],
    },
  };
}

test('buildSeedSource: narrowing tablePlans to the seeded tables lets a partial plan finalize (seed give-up path)', () => {
  const full = validInput();
  // Simulate a wave giving up on the Order table (repair budget exhausted): the partial plan has only
  // the tables that DID validate (Shift + MDM), no Order.
  const partialPlan = { ...full.plan, localTables: full.plan.localTables.filter(t => t.tableId !== 'Order') };
  // Without narrowing, coverage requires a plan for EVERY input.tablePlans entry -> Order is flagged.
  const withFull = buildSeedSource({ ...full, plan: partialPlan });
  assert.ok(withFull.errors.some(e => /missing plan for persistence table 'Order'/.test(e)), withFull.errors.join('\n'));
  // Narrowing tablePlans to the seeded tables (what agentCbSeeds does on give-up) -> the partial
  // validates cleanly; the skipped table is simply seeded empty at runtime.
  const seeded = new Set(partialPlan.localTables.map(t => t.tableId));
  const narrowed = buildSeedSource({ ...full, plan: partialPlan, tablePlans: full.tablePlans.filter(t => seeded.has(t.tableId)) });
  assert.deepEqual(narrowed.errors, [], narrowed.errors.join('\n'));
});

test('buildSeedSource: narrowing entities to the seeded MDM entities lets a partial plan finalize (seed give-up path)', () => {
  const full = validInput();
  // Simulate a wave giving up on an MDM entity (MenuItem) — this is the run13 failure: the batch that
  // failed carried MenuItem, so it never merged and the partial plan omits it (no local table backs an
  // MDM entity, so narrowing tablePlans alone cannot help here).
  const partialPlan = { ...full.plan, mdmEntities: full.plan.mdmEntities.filter(e => e.entityId !== 'MenuItem') };
  // Without narrowing entities, coverage requires a plan for EVERY MDM entity -> MenuItem is flagged
  // and finalizeSeedPlan throws "final seed plan validation failed: mdmEntities: missing plan for 'MenuItem'".
  const withFull = buildSeedSource({ ...full, plan: partialPlan });
  assert.ok(withFull.errors.some(e => /mdmEntities: missing plan for 'MenuItem'/.test(e)), withFull.errors.join('\n'));
  // Narrowing entities to the seeded MDM entities (what agentCbSeeds does on give-up) -> the partial
  // validates cleanly; MenuItem is simply seeded empty at runtime, self-consistent (no seeded row
  // references it, because its wave never merged).
  const seededMdm = new Set(partialPlan.mdmEntities.map(e => e.entityId));
  const narrowed = buildSeedSource({ ...full, plan: partialPlan, entities: full.entities.filter(e => e.kind !== 'mdm' || seededMdm.has(e.entityId)) });
  assert.deepEqual(narrowed.errors, [], narrowed.errors.join('\n'));
  // The give-up must not emit rows for the skipped entity.
  assert.ok(narrowed.content && !narrowed.content.includes('mdm:MenuItem'), 'skipped MDM entity must not be seeded');
});

test('deriveSeedPlanningWaves orders the cafeFlow graph deterministically', () => {
  assert.deepEqual(deriveSeedPlanningWaves(validInput()), [
    { index: 1, tableIds: [], mdmEntityIds: ['MenuCategory', 'StockItem'] },
    { index: 2, tableIds: ['Shift'], mdmEntityIds: ['MenuItem'] },
    { index: 3, tableIds: ['Order'], mdmEntityIds: [] },
  ]);
});

test('deriveSeedPlanningWaves keeps foreign-key cycles together and uses table columns as dependencies', () => {
  const waves = deriveSeedPlanningWaves({
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

  assert.deepEqual(waves, [
    { index: 1, tableIds: [], mdmEntityIds: ['Catalog'] },
    { index: 2, tableIds: ['BillingAccount', 'Invoice', 'Organization'], mdmEntityIds: [] },
    { index: 3, tableIds: ['AuditEvent'], mdmEntityIds: [] },
  ]);
});

test('wave context excludes unrelated definitions and accepts only catalog references from earlier waves', () => {
  const input = validInput();
  const orderWave = { index: 3, tableIds: ['Order'], mdmEntityIds: [] };
  const scoped = seedPlanInputForWave(input, orderWave);
  const prior = { summary: 'Shift opened.', localTables: [input.plan.localTables[0]], mdmEntities: [] };
  const orderPlan = { summary: 'Order registered after the shift opened.', localTables: [input.plan.localTables[1]], mdmEntities: [] };

  const context = seedPlanPromptContext(scoped, [], { wave: orderWave, catalog: seedReferenceCatalog(prior), priorSummary: prior.summary });
  assert.match(context, /"tableId": "Order"/);
  assert.doesNotMatch(context, /"entityId": "MenuItem"/);
  assert.match(context, /local:Shift\.morning/);
  assert.deepEqual(validateSeedPlan({ ...scoped, plan: orderPlan }, seedReferenceCatalog(prior).map(item => item.ref)), []);
  assert.ok(validateSeedPlan({ ...scoped, plan: orderPlan }).some(error => error.includes("unresolved reference 'local:Shift.morning'")));
});

test('partial seed source persists and resumes the accumulated plan without becoming a reusable final source', () => {
  const input = validInput();
  const partialPlan = { summary: 'Catalog and shift ready.', localTables: [input.plan.localTables[0]], mdmEntities: input.plan.mdmEntities.slice(0, 2) };
  const source = buildPartialSeedSource(input, { plan: partialPlan, completedWaveIndexes: [1] });

  assert.equal(extractSeedPlanFromSource(source), null);
  assert.deepEqual(extractSeedPlanProgressFromSource(source), { plan: partialPlan, partial: true, completedWaveIndexes: [1] });
  assert.deepEqual(mergeSeedPlans(partialPlan, { summary: 'Order ready.', localTables: [input.plan.localTables[1]], mdmEntities: [input.plan.mdmEntities[2]] }), {
    summary: 'Order ready.',
    localTables: [input.plan.localTables[1], input.plan.localTables[0]],
    mdmEntities: [input.plan.mdmEntities[0], input.plan.mdmEntities[2], input.plan.mdmEntities[1]],
  });
});

test('splitSeedPlanningWave divides oversized independent table batches deterministically', () => {
  const input = validInput();
  input.relationships = [];
  input.tablePlans[1].columns = input.tablePlans[1].columns.filter(column => column.name !== 'shift_id');
  const batches = splitSeedPlanningWave(input, { index: 2, tableIds: ['Order', 'Shift'], mdmEntityIds: [] }, 500);
  assert.deepEqual(batches, [
    { index: 2, tableIds: ['Order'], mdmEntityIds: [] },
    { index: 2, tableIds: ['Shift'], mdmEntityIds: [] },
  ]);
});

test('splitSeedPlanningWave keeps a same-wave reference component together', () => {
  const input = validInput();
  assert.deepEqual(splitSeedPlanningWave(input, { index: 3, tableIds: ['Order', 'Shift'], mdmEntityIds: [] }, 500), [
    { index: 3, tableIds: ['Order', 'Shift'], mdmEntityIds: [] },
  ]);
});

test('buildSeedSource compiles a valid semantic plan into local and MDM relationship seeds', () => {
  const result = buildSeedSource(validInput());

  assert.deepEqual(result.errors, []);
  assert.match(result.content ?? '', /"seedFor": "mdmRelationship"/);
  assert.match(result.content ?? '', /requires-ingredient/);
  assert.match(result.content ?? '', /"shift_id": "[0-9a-f-]+"/);
  assert.equal(extractSeedPlanFromSource(result.content ?? '')?.summary, validInput().plan.summary);
});

test('SeedAssetRef is accepted only for declared image/URL fields and resolves through the local asset map', () => {
  const input = validInput();
  input.entities.find(entity => entity.entityId === 'Shift')!.fields.push(field('photoUrl', false));
  input.plan.localTables[0].rows[0].details.push({ name: 'photoUrl', value: { asset: 'Shift/morning', kind: 'image' } });

  const built = buildSeedSource(input);
  assert.deepEqual(built.errors, []);
  assert.match(built.content ?? '', /seedAssetUrl\("Shift\/morning"\)/);
  const withUrl = updateSeedAssetUrlsInSource(built.content ?? '', { 'Shift/morning': '/cafeFlow/assets/seed/Shift/morning.webp' });
  assert.match(withUrl, /"Shift\/morning": "\/cafeFlow\/assets\/seed\/Shift\/morning\.webp"/);

  input.plan.localTables[0].rows[0].columns.find(field => field.name === 'status')!.value = { asset: 'Shift/morning', kind: 'image' };
  assert.ok(validateSeedPlan(input).some(error => error.includes('declared image or URL fields')));
});

test('validateSeedPlan blocks invalid enum values but no longer enforces hardcoded domain invariants', () => {
  const input = validInput();
  // A second open shift + an invalid enum: the old generator tripped the hardcoded singleOpenShift
  // check here. That domain-specific invariant is gone (this generator is now domain-agnostic), so
  // only the generic enum violation is reported.
  input.plan.localTables[0].rows.push({
    key: 'afternoon',
    columns: [{ name: 'status', value: 'open' }, { name: 'created_at', value: SEED_T1 }],
    details: [{ name: 'openedAt', value: SEED_T1 }, { name: 'openedBy', value: 'manager-2' }, { name: 'updatedAt', value: SEED_T1 }],
    children: [],
  });
  input.plan.localTables[1].rows[0].columns.find(field => field.name === 'order_type')!.value = 'dineIn';

  const errors = validateSeedPlan(input);

  assert.ok(errors.some(error => error.includes('expected one of table, takeout')));
  assert.ok(!errors.some(error => error.includes('singleOpenShift')));
});

test('validateSeedPlan accepts null on nullable FK columns / optional references (in-progress lifecycle row)', () => {
  // Regression for the seed give-up cascade seen on cafeFlow 102051: an open DailyShift legitimately
  // has closed_by_user_id = null (it has no closer yet). A nullable FK column, an optional entity
  // field ending in Id, and an optional MDM field ending in Id must all accept null — otherwise the
  // whole wave fails validation, exhausts its repair budget, is skipped, and every table it (and every
  // downstream wave) covers is seeded EMPTY.
  const input = validInput();
  // Nullable FK column + optional entity reference field on the operational Order.
  const order = input.tablePlans.find(t => t.tableId === 'Order')!;
  order.columns.push({ name: 'delivered_by_id', type: 'UUID', nullable: true });
  input.entities.find(e => e.entityId === 'Order')!.fields.push(field('deliveredById', false));
  input.plan.localTables.find(t => t.tableId === 'Order')!.rows[0].columns.push({ name: 'delivered_by_id', value: null });
  // Optional MDM reference field left null.
  input.entities.find(e => e.entityId === 'MenuItem')!.fields.push(field('supplierId', false));
  input.plan.mdmEntities.find(e => e.entityId === 'MenuItem')!.rows[0].fields.push({ name: 'supplierId', value: null });

  assert.deepEqual(validateSeedPlan(input), []);

  // But null on a NOT NULL FK column is still a missing-value error (not a "must use ref" false positive).
  const bad = validInput();
  bad.plan.localTables.find(t => t.tableId === 'Order')!.rows[0].columns.find(c => c.name === 'shift_id')!.value = null;
  const errors = validateSeedPlan(bad);
  assert.ok(errors.some(e => /columns\.shift_id: required column missing/.test(e)), errors.join('\n'));
  assert.ok(!errors.some(e => /shift_id.*must use a symbolic/.test(e)), errors.join('\n'));
});

test('validateSeedPlan accepts any ISO timestamp inside the window and rejects out-of-window', () => {
  const good = validInput();
  // A timestamp that is neither SEED_T0 nor SEED_T1 but still within the default window.
  good.plan.localTables[1].rows[0].columns.find(field => field.name === 'created_at')!.value = '2026-07-03T14:30:00.000Z';
  good.plan.localTables[1].rows[0].details.find(field => field.name === 'updatedAt')!.value = '2026-07-03T14:30:00.000Z';
  assert.deepEqual(validateSeedPlan(good), []);

  const bad = validInput();
  bad.plan.localTables[1].rows[0].columns.find(field => field.name === 'created_at')!.value = '2020-01-01T00:00:00.000Z';
  assert.ok(validateSeedPlan(bad).some(error => error.includes('within')));
});
