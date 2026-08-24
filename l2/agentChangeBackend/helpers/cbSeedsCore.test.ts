/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPartialSeedSource, buildSeedSource, deriveSeedPlanningWaves, extractSeedPlanFromSource,
  extractSeedPlanProgressFromSource, mergeSeedPlans, seedPlanInputForWave, seedPlanPromptContext,
  seedReferenceCatalog, splitSeedPlanningWave, updateSeedAssetUrlsInSource, validateSeedPlan,
  SEED_T0, SEED_T1, extractSeedSkippedFromSource, detailsColumnOf,
  isDateOnlyField, idFieldHasResolvableTarget, normalizeSeedPlan, parseSeedPlan, stripModuleEntityPrefix,
  collectRequiredMdmTags, repairSeedPlanDeterministically, coverMissingOperatedStates, fieldAllowsSeedRef,
  skippedMdmEntityIds, mdmIndexName,
  type SeedBuildInput, type SeedTableDefinition,
} from './cbSeedsCore.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Item 5 of the MDM write path: a local FK that points AT master data resolves against the MDM rows of
// the plan (the 102034 registry), never against a local table — with the write path on, the target
// entity has no local table at all, so validating against one would reject every correct plan.
test('validateSeedPlan resolves a local FK to an MDM row, and rejects a literal id there', () => {
  const input = validInput();
  const order = input.plan.localTables.find(table => table.tableId === 'Order')!;
  input.entities.find(entity => entity.entityId === 'Order')!.fields.push(field('menuItemId'));
  input.tablePlans.find(table => table.tableId === 'Order')!.columns.push({ name: 'menu_item_id', type: 'UUID', nullable: false });
  order.rows[0].columns.push({ name: 'menu_item_id', value: { ref: 'mdm:MenuItem.espresso' } });
  assert.deepEqual(validateSeedPlan(input), []);

  const literal = validInput();
  const literalOrder = literal.plan.localTables.find(table => table.tableId === 'Order')!;
  literal.entities.find(entity => entity.entityId === 'Order')!.fields.push(field('menuItemId'));
  literal.tablePlans.find(table => table.tableId === 'Order')!.columns.push({ name: 'menu_item_id', type: 'UUID', nullable: false });
  literalOrder.rows[0].columns.push({ name: 'menu_item_id', value: '3f0e6b1e-0000-4000-8000-000000000000' });
  // The entity-level check is the one that fires here: the column-level FK rule matches by
  // `<entity>Id`, and the snake_case column name (`menu_item_id`) does not reach it. Either way the row
  // is rejected, which is what matters — a literal MDM id in a seed silently points at nothing.
  assert.ok(validateSeedPlan(literal).some(error => /menuItemId: entity references must use a symbolic \{ ref \}/.test(error)), validateSeedPlan(literal).join('\n'));
});

// F3 (bugTests.md): the three change-order journeys of the buildFlowFsm production run all reported
// `expected >= 1 item(s), got 0` — the screens filter by `submitted`/`pendingClientApproval` and the
// seeds created no ChangeOrder in either state. The rule follows the WORKFLOW (states some transition
// reads), not the enum: requiring every declared state would demand rows for terminal states nobody
// queries.
test('validateSeedPlan requires a seeded row for every OPERATED lifecycle state', () => {
  const input = validInput();
  const order = input.entities.find(entity => entity.entityId === 'Order')!;
  // Order's workflow transitions read `registered` and `ready`; the plan seeds only `registered`.
  order.operatedStates = ['registered', 'ready'];
  const errors = validateSeedPlan(input);
  assert.equal(errors.length, 1, errors.join('\n'));
  assert.match(errors[0], /Order: no seeded row in lifecycle state\(s\) ready/u);
  assert.match(errors[0], /one row per operated state/u);

  // Seeding the missing state clears it.
  const covered = validInput();
  covered.entities.find(entity => entity.entityId === 'Order')!.operatedStates = ['registered', 'ready'];
  const table = covered.plan.localTables.find(plan => plan.tableId === 'Order')!;
  table.rows.push({
    ...structuredClone(table.rows[0]),
    key: 'ready',
    columns: table.rows[0].columns.map(column => (column.name === 'status' ? { name: 'status', value: 'ready' } : structuredClone(column))),
  });
  assert.deepEqual(validateSeedPlan(covered), []);

  // No workflow -> nothing is "operated", and the rule stays silent (the baseline fixture).
  assert.deepEqual(validateSeedPlan(validInput()), []);
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

// ── seed coverage: "empty BY DESIGN" is published, not implied ──────────────────
// The give-up narrows tablePlans/entities so a non-converging wave cannot fail the whole backend. That
// left tables with zero rows and nothing on disk saying so, and a test generator asserting "at least
// one row" against them produced impossible cases (bug_trace_changeBackend.md D3, last row).
test('buildSeedSource publishes skipped targets and extractSeedSkippedFromSource reads them back', () => {
  const full = validInput();
  // Wave carrying the Order table gave up: it is dropped from the plan AND from tablePlans.
  const partialPlan = { ...full.plan, localTables: full.plan.localTables.filter(t => t.tableId !== 'Order') };
  const built = buildSeedSource({
    ...full,
    plan: partialPlan,
    tablePlans: full.tablePlans.filter(t => t.tableId !== 'Order'),
    skipped: { tables: ['Order'], mdmEntities: [], reason: 'wave 2 did not converge' },
  });
  assert.deepEqual(built.errors, [], built.errors.join('\n'));
  const readBack = extractSeedSkippedFromSource(built.content ?? '');
  assert.deepEqual(readBack, { tables: ['Order'], mdmEntities: [], reason: 'wave 2 did not converge' });
});

test('extractSeedSkippedFromSource returns null when coverage is complete (nothing skipped)', () => {
  const built = buildSeedSource(validInput());          // no `skipped` -> key omitted from the envelope
  assert.deepEqual(built.errors, [], built.errors.join('\n'));
  assert.equal(extractSeedSkippedFromSource(built.content ?? ''), null);
  // An empty skip list must also read as "complete", never as a bogus gap.
  const empty = buildSeedSource({ ...validInput(), skipped: { tables: [], mdmEntities: [], reason: 'x' } });
  assert.equal(extractSeedSkippedFromSource(empty.content ?? ''), null);
  // Non-seed source / malformed envelope -> null, never a throw.
  assert.equal(extractSeedSkippedFromSource('export const x = 1;'), null);
});

// ── the details envelope must actually reach the emitted row ────────────────────
// ROOT CAUSE of bug_trace_changeBackend.md D2: the TableDefinition declares the JSONB envelope in a
// SEPARATE `detailsColumn` property, not inside `columns`. readTablePlans read only `columns`, so the
// compiler never knew the table had a details column and buildLocalRows — which writes a property only
// for a DECLARED column — silently DROPPED the whole planned payload. In 102051 the persisted plan held
// 10-12 details fields per row while every emitted row carried just its indexed ids.
test('detailsColumnOf prefers the declared name and falls back to a conventional details column', () => {
  assert.equal(detailsColumnOf({ columns: [{ name: 'payload', type: 'JSONB', nullable: true }], detailsColumnName: 'payload' }), 'payload');
  assert.equal(detailsColumnOf({ columns: [{ name: 'details', type: 'JSONB', nullable: true }] }), 'details');
  assert.equal(detailsColumnOf({ columns: [{ name: 'id', type: 'UUID', nullable: false }] }), '');
});

test('buildSeedSource emits the planned details into the declared envelope column', () => {
  const input = validInput();
  const built = buildSeedSource(input);
  assert.deepEqual(built.errors, [], built.errors.join('\n'));
  // Shift declares a `details` column and its row plans openedAt/openedBy/updatedAt -> they must ship.
  const shiftBlock = (built.content ?? '').split('export const shiftSeeds')[1] ?? '';
  assert.match(shiftBlock, /"details":/u, 'the details envelope must be present in the emitted row');
  assert.match(shiftBlock, /"openedBy": "manager-1"/u, 'planned details fields must survive compilation');
});

test('buildSeedSource honours a NON-conventional envelope column name (no hardcoded "details")', () => {
  const input = validInput();
  // Same table, but the TableDefinition calls its envelope `payload` instead of `details`.
  input.tablePlans = input.tablePlans.map(table => table.tableId !== 'Shift' ? table : {
    ...table,
    columns: table.columns.map(column => column.name === 'details' ? { ...column, name: 'payload' } : column),
    detailsColumnName: 'payload',
  });
  const built = buildSeedSource(input);
  assert.deepEqual(built.errors, [], built.errors.join('\n'));
  const shiftBlock = (built.content ?? '').split('export const shiftSeeds')[1] ?? '';
  assert.match(shiftBlock, /"payload":/u, 'the envelope must be written under its declared name');
  assert.match(shiftBlock, /"openedBy": "manager-1"/u);
  assert.doesNotMatch(shiftBlock.split('export const')[0], /"details":/u, 'never emit a hardcoded details key');
});

test('a table WITHOUT any envelope column drops nothing silently: non-indexed required fields are rejected', () => {
  const input = validInput();
  // Remove the envelope entirely from Shift: its required non-indexed fields now have nowhere to live.
  input.tablePlans = input.tablePlans.map(table => table.tableId !== 'Shift' ? table : {
    ...table, columns: table.columns.filter(column => column.name !== 'details'), detailsColumnName: '',
  });
  const errors = validateSeedPlan(input);
  assert.ok(errors.some(e => /has no details envelope \(detailsColumn is null\)/u.test(e)), errors.join('\n'));
});

test('validateSeedPlan rejects a child collection the entity does not declare (dead details key)', () => {
  const input = validInput();
  // Shift declares ONE collection field, `visits`; the plan seeds children under the child ENTITY id.
  input.tablePlans = input.tablePlans.map(t => t.tableId !== 'Shift' ? t : { ...t, childCollections: ['visits'] });
  input.plan.localTables[0].rows[0].children = [
    { name: 'ShiftVisit', rows: [{ key: 'v1', fields: [{ name: 'openedBy', value: 'x' }] }] },
  ];
  const errors = validateSeedPlan(input);
  assert.ok(errors.some(e => /unknown child collection; use one of: visits/u.test(e)), errors.join('\n'));

  // Using the declared FIELD name is accepted.
  input.plan.localTables[0].rows[0].children = [
    { name: 'visits', rows: [{ key: 'v1', fields: [{ name: 'openedBy', value: 'x' }] }] },
  ];
  assert.deepEqual(validateSeedPlan(input).filter(e => /child collection/u.test(e)), []);
});

// ── run05 (102045/buildFlowFsm): three validator defects that made a CORRECT plan look wrong ──────
// The planner returned a valid scenario and was rejected 19 times, burning both repair attempts and
// forcing a give-up that then crashed the run. All three defects are in the validator, not the plan.

test('A: a "…Date" field accepts a calendar date; a "…At" field still requires an instant', () => {
  assert.equal(isDateOnlyField('workDate'), true);
  assert.equal(isDateOnlyField('plannedStartDate'), true);
  assert.equal(isDateOnlyField('shiftDate'), true);
  assert.equal(isDateOnlyField('usedAt'), false);      // an instant: stays strict
  assert.equal(isDateOnlyField('createdAt'), false);
  assert.equal(isDateOnlyField('updatedAt'), false);

  const input = validInput();
  const shiftRow = input.plan.localTables[0].rows[0];
  // Generated usecases compare these as plain 'YYYY-MM-DD' strings, so a date-only value is CORRECT.
  input.entities[0].fields.push({ fieldId: 'businessDate', type: 'string', required: true, enumValues: [] });
  shiftRow.details.push({ name: 'businessDate', value: '2026-07-03' });
  assert.deepEqual(validateSeedPlan(input), [], 'a calendar date must be accepted for a …Date field');

  // Out of window is still rejected, compared BY DATE (not by luck of parsing to midnight).
  shiftRow.details.find(f => f.name === 'businessDate')!.value = '2026-09-01';
  assert.ok(validateSeedPlan(input).some(e => /businessDate: date must fall within/u.test(e)));

  // An …At field must NOT accept a bare date.
  const atInput = validInput();
  atInput.plan.localTables[0].rows[0].details.find(f => f.name === 'openedAt')!.value = '2026-07-03';
  assert.ok(validateSeedPlan(atInput).some(e => /openedAt: timestamp must be an ISO 8601 UTC string/u.test(e)));
});

test('B: only an "…Id" with a resolvable target must be a symbolic { ref }', () => {
  const entities = ['Client', 'Project', 'MenuItem', 'Order'];
  // taxId points at nothing seedable -> a literal is legitimate (run05 demanded a ref three times).
  assert.equal(idFieldHasResolvableTarget('taxId', entities), false);
  assert.equal(idFieldHasResolvableTarget('licenseId', entities), false);
  // A decorated id still resolves by SUFFIX -> stays strict (no dangling reference reintroduced).
  assert.equal(idFieldHasResolvableTarget('topMenuItemId', entities), true);
  assert.equal(idFieldHasResolvableTarget('clientId', entities), true);
  assert.equal(idFieldHasResolvableTarget('client_id', entities), true);
  // Platform-user ids resolve to an actor identity, so they stay strict even with no such entity.
  assert.equal(idFieldHasResolvableTarget('closedByUserId', entities), true);
  assert.equal(idFieldHasResolvableTarget('assigneeId', entities), true);
  assert.equal(idFieldHasResolvableTarget('openedByWorkerId', entities), true);
});

test('B: a non-reference id passes validation while a real reference still must be symbolic', () => {
  const input = validInput();
  const menuItem = input.plan.mdmEntities.find(e => e.entityId === 'MenuItem')!;
  input.entities.find(e => e.entityId === 'MenuItem')!.fields.push({ fieldId: 'taxId', type: 'string', required: false, enumValues: [] });
  menuItem.rows[0].fields.push({ name: 'taxId', value: '12.345.678/0001-99' });
  assert.deepEqual(validateSeedPlan(input).filter(e => /taxId/u.test(e)), [], 'a tax number is not an entity reference');

  // menuCategoryId DOES resolve to the MenuCategory entity -> a literal is still rejected.
  menuItem.rows[0].fields.find(f => f.name === 'menuCategoryId')!.value = 'not-a-ref';
  assert.ok(validateSeedPlan(input).some(e => /menuCategoryId: MDM references must use a symbolic/u.test(e)));
});

test('C: an all-skipped module still compiles to a VALID artifact (no crash, no orphan import)', () => {
  const built = buildSeedSource({
    project: 102045, moduleName: 'anyModule', language: 'en',
    entities: [], tablePlans: [], ruleIds: [], actors: [],
    skipped: { tables: ['A', 'B'], mdmEntities: ['C'], reason: 'wave 1 did not converge' },
    plan: { summary: 'No seed data: wave 1 did not converge; every target seeded empty by design.', localTables: [], mdmEntities: [] },
  });
  assert.deepEqual(built.errors, [], built.errors.join('\n'));
  const src = built.content ?? '';
  assert.doesNotMatch(src, /import type \{ TableSeedRows \}/u, 'no unused import when nothing is seeded');
  assert.match(src, /export \{\};/u, 'the file must still be a module');
  assert.deepEqual(extractSeedSkippedFromSource(src), { tables: ['A', 'B'], mdmEntities: ['C'], reason: 'wave 1 did not converge' });
});

// petShop first /monitor/tests run: wave 3 produced Pet/ScheduleBlock/InstitutionalPresentation then
// the repair put PK + `details: null` into `columns`, validateSeedPlan said "unknown persistence
// column", and the give-up skipped those tables (30 fails "got 0"). Fixture = the real 208/209 payloads.
const WAVE_FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function collectOutboundRefs(plan: SeedBuildInput['plan']): string[] {
  const refs: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.ref === 'string') refs.push(record.ref);
    Object.values(record).forEach(walk);
  };
  walk(plan);
  return [...new Set(refs)].filter(ref => !/^local:(Pet|ScheduleBlock|InstitutionalPresentation)\./u.test(ref));
}

function petShopWave3Input(plan: SeedBuildInput['plan']): SeedBuildInput {
  const col = (name: string, nullable = false): SeedTableDefinition['columns'][number] => (
    { name, type: name.endsWith('_id') ? 'UUID' : name === 'details' ? 'JSONB' : 'TEXT', nullable }
  );
  const tables: SeedTableDefinition[] = [
    { tableId: 'Pet', tableName: 'pet', seedFor: 'petShopPet', primaryKey: ['pet_id'], detailsColumnName: 'details', columns: [col('pet_id'), col('details', true)] },
    { tableId: 'InstitutionalPresentation', tableName: 'institutional_presentation', seedFor: 'petShopInstitutionalPresentation', primaryKey: ['institutional_presentation_id'], detailsColumnName: 'details', columns: [col('institutional_presentation_id'), col('details', true)] },
    { tableId: 'ScheduleBlock', tableName: 'schedule_block', seedFor: 'petShopScheduleBlock', primaryKey: ['schedule_block_id'], detailsColumnName: 'details', columns: [col('schedule_block_id'), col('status'), col('business_hours_id'), col('block_type'), col('details', true)] },
  ];
  return {
    project: 102047,
    moduleName: 'petShop',
    language: 'pt-BR',
    ruleIds: [],
    entities: [
      { entityId: 'Pet', title: 'Pet', kind: 'core', fields: [field('petId'), field('name')] },
      { entityId: 'InstitutionalPresentation', title: 'Institutional presentation', kind: 'core', fields: [field('institutionalPresentationId'), field('businessName'), field('headline', false), field('presentationText')] },
      { entityId: 'ScheduleBlock', title: 'Schedule block', kind: 'core', fields: [field('scheduleBlockId'), field('status', true, ['active', 'expired', 'cancelled']), field('businessHoursId'), field('blockType', true, ['hour', 'fullDay']), field('startsAt'), field('endsAt'), field('purpose')] },
      { entityId: 'BusinessHours', title: 'Business hours', kind: 'core', fields: [field('businessHoursId')] },
      { entityId: 'Customer', title: 'Customer', kind: 'core', fields: [field('customerId')] },
    ],
    tablePlans: tables,
    plan,
  };
}

test('petShop wave 209: details/PK echoed in columns fail today; normalizeSeedPlan lets the wave merge', () => {
  const raw = JSON.parse(readFileSync(path.join(WAVE_FIXTURE_DIR, 'petShop-seed-wave209.json'), 'utf8')) as unknown;
  const plan = parseSeedPlan(raw);
  const input = petShopWave3Input(plan);
  const priorRefs = collectOutboundRefs(plan);
  const before = validateSeedPlan(input, priorRefs);
  assert.ok(before.some(e => /columns\.details: unknown persistence column/u.test(e)), before.join('\n'));

  const normalized = normalizeSeedPlan(plan, input.tablePlans);
  const after = validateSeedPlan({ ...input, plan: normalized }, priorRefs);
  assert.deepEqual(after, [], after.join('\n'));
  assert.deepEqual(normalized.localTables.map(t => t.tableId).sort(), ['InstitutionalPresentation', 'Pet', 'ScheduleBlock']);
  assert.ok(normalized.localTables.every(t => t.rows.every(r => !r.columns.some(c => c.name === 'details' || c.name.endsWith('_id') && ['pet_id', 'institutional_presentation_id', 'schedule_block_id'].includes(c.name)))));

  const wave1: SeedBuildInput['plan'] = {
    summary: 'wave 1',
    localTables: [
      { tableId: 'BusinessHours', rows: [{ key: 'weekday-standard', columns: [], details: [], children: [] }] },
      { tableId: 'Customer', rows: [{ key: 'customer-primary', columns: [], details: [], children: [] }] },
      { tableId: 'Service', rows: [{ key: 'banho', columns: [], details: [], children: [] }] },
    ],
    mdmEntities: [],
  };
  const merged = mergeSeedPlans(wave1, normalized);
  assert.deepEqual(merged.localTables.map(t => t.tableId).sort(), [
    'BusinessHours', 'Customer', 'InstitutionalPresentation', 'Pet', 'ScheduleBlock', 'Service',
  ]);
});

test('petShop wave 208 (attempt 1) still names unknown details fields — the gate is not loosened', () => {
  const raw = JSON.parse(readFileSync(path.join(WAVE_FIXTURE_DIR, 'petShop-seed-wave208.json'), 'utf8')) as unknown;
  const plan = normalizeSeedPlan(parseSeedPlan(raw), petShopWave3Input(parseSeedPlan(raw)).tablePlans);
  const errors = validateSeedPlan(petShopWave3Input(plan), collectOutboundRefs(plan));
  assert.ok(errors.some(e => /unknown entity field/u.test(e)), errors.join('\n'));
});

// BE5-1: listService.defs.ts (real pin) + the Service local rows from be5 seeds.ts. Usecases read
// ctx.mdm.collection.listByType({ type: 'petShop.Service' }); the plan only seeded Person actors.
test('be5: plan without MDM rows for a ctx.mdm tag is rejected; mirrored plan emits the tag with the same ids', () => {
  const listServiceDefs = {
    mdm: { activeFilterInput: 'includeInactive', situationOutput: 'active' },
  };
  const listServiceTs = "const records = await ctx.mdm.collection.listByType({ type: 'petShop.Service' });\n";
  const tags = collectRequiredMdmTags({
    moduleName: 'petShop',
    mdmOwners: [{ entity: 'Service', mdm: listServiceDefs.mdm }],
    usecaseSources: [listServiceTs],
  });
  assert.deepEqual(tags, ['petShop.Service']);

  const serviceRows = [
    { key: 'service-bath', columns: [], details: [{ name: 'name', value: 'Banho e secagem' }, { name: 'description', value: 'Higienização, secagem e escovação básica.' }], children: [] },
    { key: 'service-grooming', columns: [], details: [{ name: 'name', value: 'Tosa higiênica' }, { name: 'description', value: 'Tosa higiênica com acabamento.' }], children: [] },
    { key: 'service-veterinary-check', columns: [], details: [{ name: 'name', value: 'Avaliação veterinária' }, { name: 'description', value: 'Consulta breve.' }], children: [] },
  ];
  const input: SeedBuildInput = {
    project: 102047,
    moduleName: 'petShop',
    language: 'en',
    ruleIds: [],
    mdmRequiredTags: tags,
    entities: [
      { entityId: 'Service', title: 'Service', kind: 'core', fields: [field('serviceId'), field('name'), field('description', false), field('createdAt', false), field('updatedAt', false)] },
    ],
    tablePlans: [
      { tableId: 'Service', tableName: 'service', seedFor: 'petShopService', primaryKey: ['service_id'], detailsColumnName: 'details', columns: [{ name: 'service_id', type: 'UUID', nullable: false }, { name: 'details', type: 'JSONB', nullable: true }] },
    ],
    plan: {
      summary: 'Three catalog services (be5 local-only).',
      localTables: [{ tableId: 'Service', rows: serviceRows }],
      mdmEntities: [],
    },
  };
  const rejected = validateSeedPlan(input);
  assert.ok(rejected.some(e => /petShop\.Service/.test(e) && /no MDM row/.test(e)), rejected.join('\n'));

  const mirrored = repairSeedPlanDeterministically(input.plan, input);
  const accepted = validateSeedPlan({ ...input, plan: mirrored });
  assert.deepEqual(accepted, [], accepted.join('\n'));
  const built = buildSeedSource({ ...input, plan: mirrored });
  assert.deepEqual(built.errors, [], built.errors.join('\n'));
  assert.match(built.content ?? '', /"petShop\.Service"/);
  assert.match(built.content ?? '', /mdmEntityIndexSeeds/);
  // Same key as the local row → same uuid on the index (adapters and ctx.mdm share the id).
  const localId = (built.content ?? '').match(/serviceSeeds[\s\S]*?"service_id": "([0-9a-f-]+)"/)?.[1];
  const mdmId = (built.content ?? '').match(/mdmEntityIndexSeeds[\s\S]*?"mdmId": "([0-9a-f-]+)"/)?.[1];
  assert.ok(localId && mdmId && localId === mdmId, `local ${localId} vs mdm ${mdmId}`);
  assert.match(built.content ?? '', /export const serviceSeeds/);
});

test('R5-2: prefixed mdm entityId (trace 150) strips to the bare name and validates', () => {
  const raw = {
    summary: 'MDM hours',
    localTables: [],
    mdmEntities: [{
      entityId: 'petShop.BusinessHours',
      rows: [{
        key: 'bh-mon',
        fields: [
          { name: 'dayOfWeek', value: 'monday' },
          { name: 'startTime', value: '08:00' },
          { name: 'name', value: 'Weekday morning' },
          { name: 'createdAt', value: SEED_T0 },
          { name: 'updatedAt', value: SEED_T0 },
        ],
        relationships: [],
      }],
    }],
  };
  assert.equal(stripModuleEntityPrefix('petShop.BusinessHours', 'petShop'), 'BusinessHours');
  const rejected = validateSeedPlan({
    project: 1, moduleName: 'petShop', language: 'en', ruleIds: [],
    mdmRequiredTags: ['petShop.BusinessHours'],
    entities: [{
      entityId: 'BusinessHours', title: 'Business hours', kind: 'core',
      fields: [field('businessHoursId'), field('dayOfWeek'), field('startTime'), field('name'), field('createdAt', false), field('updatedAt', false)],
    }],
    tablePlans: [],
    plan: parseSeedPlan(raw),
    timeWindow: { start: SEED_T0, end: SEED_T1 },
  });
  assert.ok(rejected.some(e => /unknown or non-MDM entity/.test(e)), rejected.join('\n'));

  const plan = normalizeSeedPlan(parseSeedPlan(raw), [], 'petShop');
  assert.equal(plan.mdmEntities[0].entityId, 'BusinessHours');
  const accepted = validateSeedPlan({
    project: 1, moduleName: 'petShop', language: 'en', ruleIds: [],
    mdmRequiredTags: ['petShop.BusinessHours'],
    entities: [{
      entityId: 'BusinessHours', title: 'Business hours', kind: 'core',
      fields: [field('businessHoursId'), field('dayOfWeek'), field('startTime'), field('name'), field('createdAt', false), field('updatedAt', false)],
    }],
    tablePlans: [],
    plan,
    timeWindow: { start: SEED_T0, end: SEED_T1 },
  });
  assert.deepEqual(accepted, [], accepted.join('\n'));
});

test('a published skipped MDM tag is coverage, not a missing-row finding', () => {
  const errors = validateSeedPlan({
    project: 1, moduleName: 'petShop', language: 'en', ruleIds: [],
    mdmRequiredTags: ['petShop.BusinessHours'],
    entities: [{ entityId: 'BusinessHours', title: 'h', kind: 'core', fields: [field('businessHoursId')] }],
    tablePlans: [],
    skipped: { tables: [], mdmEntities: ['BusinessHours'], reason: 'wave did not converge' },
    plan: { summary: 'give-up', localTables: [], mdmEntities: [] },
    timeWindow: { start: SEED_T0, end: SEED_T1 },
  });
  assert.equal(errors.filter(e => /no MDM row/.test(e)).length, 0, errors.join('\n'));
});

test('R5-2: unseeded ctx.mdm tags are published in skipped, not dropped in silence', () => {
  assert.deepEqual(skippedMdmEntityIds({
    moduleName: 'petShop',
    entities: [{ entityId: 'BusinessHours', title: 'h', kind: 'core', fields: [] }],
    mdmRequiredTags: ['petShop.BusinessHours', 'petShop.Customer'],
  }, new Set()), ['BusinessHours', 'Customer']);
  assert.deepEqual(skippedMdmEntityIds({
    moduleName: 'petShop',
    entities: [{ entityId: 'Catalog', title: 'c', kind: 'mdm', fields: [] }],
    mdmRequiredTags: ['petShop.BusinessHours'],
  }, new Set(['BusinessHours'])), ['Catalog']);
});

test('R3-2: owners already done still produce MDM tags — pending-only scan is the empty set', () => {
  const doneOwners = [
    { entity: 'BusinessHours', mdm: { lifecycle: 'inactivate' } },
    { entity: 'Customer', mdm: { lifecycle: 'inactivate' } },
    { entity: 'Pet', mdm: { lifecycle: 'inactivate' } },
    { entity: 'ServiceOffering', mdm: { lifecycle: 'inactivate' } },
  ];
  assert.deepEqual(collectRequiredMdmTags({ moduleName: 'petShop', mdmOwners: [] }), []);
  assert.deepEqual(collectRequiredMdmTags({ moduleName: 'petShop', mdmOwners: doneOwners }), [
    'petShop.BusinessHours', 'petShop.Customer', 'petShop.Pet', 'petShop.ServiceOffering',
  ]);
});

test('collectRequiredMdmTags does not invent a tag from an entity name without a pinned mdm block', () => {
  assert.deepEqual(collectRequiredMdmTags({
    moduleName: 'petShop',
    mdmOwners: [{ entity: 'Service' }, { entity: 'Customer', mdm: { lifecycle: 'inactivate' } }],
  }), ['petShop.Customer']);
});

function run06Wave2Input(plan: SeedBuildInput['plan']): SeedBuildInput {
  const hoursFields = [field('businessHoursId'), field('dayOfWeek'), field('startTime'), field('name'), field('createdAt', false), field('updatedAt', false)];
  const customerFields = [field('customerId'), field('authenticatedAccountId', false), field('fullName'), field('status'), field('createdAt', false), field('updatedAt', false)];
  const offeringFields = [field('serviceOfferingId'), field('title'), field('name', false), field('createdAt', false), field('updatedAt', false)];
  return {
    project: 102047,
    moduleName: 'petShop',
    language: 'pt',
    ruleIds: [],
    mdmRequiredTags: ['petShop.BusinessHours', 'petShop.Customer', 'petShop.Pet', 'petShop.ServiceOffering'],
    entities: [
      { entityId: 'BusinessHours', title: 'Hours', kind: 'core', fields: hoursFields },
      { entityId: 'Customer', title: 'Customer', kind: 'core', fields: customerFields },
      { entityId: 'ServiceOffering', title: 'Offering', kind: 'core', fields: offeringFields },
      { entityId: 'Pet', title: 'Pet', kind: 'core', fields: [field('petId'), field('name'), field('createdAt', false), field('updatedAt', false)] },
    ],
    tablePlans: [
      { tableId: 'BusinessHours', tableName: 'business_hours', seedFor: 'petShopBusinessHours', primaryKey: ['business_hours_id'], detailsColumnName: 'details', columns: [{ name: 'business_hours_id', type: 'UUID', nullable: false }, { name: 'details', type: 'JSONB', nullable: true }] },
      { tableId: 'Customer', tableName: 'customer', seedFor: 'petShopCustomer', primaryKey: ['customer_id'], detailsColumnName: 'details', columns: [{ name: 'customer_id', type: 'UUID', nullable: false }, { name: 'details', type: 'JSONB', nullable: true }] },
      { tableId: 'ServiceOffering', tableName: 'service_offering', seedFor: 'petShopServiceOffering', primaryKey: ['service_offering_id'], detailsColumnName: 'details', columns: [{ name: 'service_offering_id', type: 'UUID', nullable: false }, { name: 'details', type: 'JSONB', nullable: true }] },
    ],
    plan,
    timeWindow: { start: SEED_T0, end: SEED_T1 },
  };
}

test('R6-1: wave 2 coverage asks only for tags in the wave; Pet is demanded on the merge, not the wave', () => {
  const wave = { index: 2, tableIds: ['BusinessHours', 'Customer', 'ServiceOffering'], mdmEntityIds: ['BusinessHours', 'Customer', 'ServiceOffering'] };
  const plan: SeedBuildInput['plan'] = {
    summary: 'Hours, customers and offerings (run06 wave 2).',
    localTables: [
      { tableId: 'BusinessHours', rows: [{ key: 'bh-mon', columns: [], details: [{ name: 'dayOfWeek', value: 'monday' }, { name: 'startTime', value: '08:00' }, { name: 'name', value: 'Manhã' }], children: [] }] },
      { tableId: 'Customer', rows: [{ key: 'customer-bruno', columns: [], details: [{ name: 'fullName', value: 'Bruno' }, { name: 'status', value: 'Active' }], children: [] }] },
      { tableId: 'ServiceOffering', rows: [{ key: 'offering-bath', columns: [], details: [{ name: 'title', value: 'Banho' }, { name: 'name', value: 'Banho' }], children: [] }] },
    ],
    mdmEntities: [
      { entityId: 'BusinessHours', rows: [{ key: 'bh-mon', fields: [{ name: 'dayOfWeek', value: 'monday' }, { name: 'startTime', value: '08:00' }, { name: 'name', value: 'Manhã' }, { name: 'createdAt', value: SEED_T0 }, { name: 'updatedAt', value: SEED_T0 }], relationships: [] }] },
      { entityId: 'Customer', rows: [{ key: 'customer-bruno', fields: [{ name: 'fullName', value: 'Bruno' }, { name: 'status', value: 'Active' }, { name: 'createdAt', value: SEED_T0 }, { name: 'updatedAt', value: SEED_T0 }], relationships: [] }] },
      { entityId: 'ServiceOffering', rows: [{ key: 'offering-bath', fields: [{ name: 'title', value: 'Banho' }, { name: 'name', value: 'Banho' }, { name: 'createdAt', value: SEED_T0 }, { name: 'updatedAt', value: SEED_T0 }], relationships: [] }] },
    ],
  };
  const full = run06Wave2Input(plan);
  const scoped = seedPlanInputForWave(full, wave);
  assert.deepEqual(scoped.mdmRequiredTags, ['petShop.BusinessHours', 'petShop.Customer', 'petShop.ServiceOffering']);
  assert.equal(scoped.entities.some(entity => entity.entityId === 'Pet'), false);
  const waveErrors = validateSeedPlan({ ...scoped, plan });
  assert.equal(waveErrors.filter(e => /petShop\.Pet/.test(e)).length, 0, waveErrors.join('\n'));
  assert.deepEqual(waveErrors, [], waveErrors.join('\n'));

  const mergedErrors = validateSeedPlan(full);
  assert.ok(mergedErrors.some(e => /petShop\.Pet/.test(e) && /no MDM row/.test(e)), mergedErrors.join('\n'));

  const withPet = { ...plan, mdmEntities: [...plan.mdmEntities, { entityId: 'Pet', rows: [{ key: 'pet-rex', fields: [{ name: 'name', value: 'Rex' }, { name: 'createdAt', value: SEED_T0 }, { name: 'updatedAt', value: SEED_T0 }], relationships: [] }] }] };
  const waveWithPet = validateSeedPlan({ ...scoped, plan: withPet });
  assert.ok(waveWithPet.some(e => /mdmEntities\.Pet/.test(e) && /unknown or non-MDM entity/.test(e)), waveWithPet.join('\n'));
});

test('R6-2: synthetic MDM index name is allowed; customer-bruno derives from fullName', () => {
  assert.equal(mdmIndexName([{ name: 'fullName', value: 'Bruno' }], 'customer-bruno'), 'Bruno');
  assert.equal(mdmIndexName([{ name: 'name', value: 'Bruno Costa' }, { name: 'fullName', value: 'Bruno' }], 'customer-bruno'), 'Bruno Costa');
  assert.equal(mdmIndexName([], 'customer-bruno'), 'customer-bruno');

  const plan: SeedBuildInput['plan'] = {
    summary: 'Bruno as MDM Customer.',
    localTables: [],
    mdmEntities: [{
      entityId: 'Customer',
      rows: [{
        key: 'customer-bruno',
        fields: [
          { name: 'name', value: 'Bruno' },
          { name: 'fullName', value: 'Bruno' },
          { name: 'status', value: 'Active' },
          { name: 'createdAt', value: SEED_T0 },
          { name: 'updatedAt', value: SEED_T0 },
        ],
        relationships: [],
      }],
    }],
  };
  const input = run06Wave2Input(plan);
  input.entities = input.entities.filter(entity => entity.entityId === 'Customer');
  input.tablePlans = [];
  input.mdmRequiredTags = ['petShop.Customer'];
  const errors = validateSeedPlan(input);
  assert.deepEqual(errors, [], errors.join('\n'));
  const built = buildSeedSource(input);
  assert.deepEqual(built.errors, [], built.errors.join('\n'));
  assert.match(built.content ?? '', /"name": "Bruno"/);
});

// BE5-3: real wave 6 attempt 2 (216-agent-cb-seeds.json). Validator already demanded `arrived`;
// the planner seeded inProgress+completed and the wave gave up. Deterministic cover fills it.
test('be5 wave 216: ServiceExecution missing arrived fails; coverMissingOperatedStates converges', () => {
  const raw = JSON.parse(readFileSync(path.join(WAVE_FIXTURE_DIR, 'petShop-seed-wave216.json'), 'utf8')) as unknown;
  const plan = normalizeSeedPlan(parseSeedPlan(raw), [{
    tableId: 'ServiceExecution', tableName: 'service_execution', seedFor: 'petShopServiceExecution',
    primaryKey: ['service_execution_id'], detailsColumnName: 'details',
    columns: [
      { name: 'service_execution_id', type: 'UUID', nullable: false },
      { name: 'status', type: 'VARCHAR', nullable: false },
      { name: 'service_appointment_id', type: 'UUID', nullable: false },
      { name: 'details', type: 'JSONB', nullable: true },
    ],
  }]);
  const input: SeedBuildInput = {
    project: 102047,
    moduleName: 'petShop',
    language: 'en',
    ruleIds: [],
    entities: [{
      entityId: 'ServiceExecution',
      title: 'Service execution',
      kind: 'event',
      operatedStates: ['arrived', 'inProgress', 'completed'],
      fields: [
        field('serviceExecutionId'),
        field('serviceAppointmentId'),
        field('status', true, ['arrived', 'inProgress', 'completed', 'pickedUp']),
        field('arrivedAt', false),
        field('serviceStartedAt', false),
        field('completedAt', false),
        field('pickedUpAt', false),
      ],
    }],
    tablePlans: [{
      tableId: 'ServiceExecution', tableName: 'service_execution', seedFor: 'petShopServiceExecution',
      primaryKey: ['service_execution_id'], detailsColumnName: 'details',
      columns: [
        { name: 'service_execution_id', type: 'UUID', nullable: false },
        { name: 'status', type: 'VARCHAR', nullable: false },
        { name: 'service_appointment_id', type: 'UUID', nullable: false },
        { name: 'details', type: 'JSONB', nullable: true },
      ],
    }],
    plan,
  };
  const prior = [
    'local:ServiceAppointment.appointment-mel-grooming-confirmed',
    'local:ServiceAppointment.appointment-luna-bath-pending',
  ];
  const before = validateSeedPlan(input, prior);
  assert.ok(before.some(e => /ServiceExecution: no seeded row in lifecycle state\(s\) arrived/.test(e)), before.join('\n'));

  const covered = coverMissingOperatedStates(plan, input);
  const after = validateSeedPlan({ ...input, plan: covered }, prior);
  assert.deepEqual(after, [], after.join('\n'));
  const statuses = covered.localTables[0].rows.map(row => row.columns.find(c => c.name === 'status')?.value);
  assert.ok(statuses.includes('arrived') && statuses.includes('inProgress') && statuses.includes('completed'), String(statuses));

  // seedPlanPromptContext ignores the plan by signature (Omit<SeedBuildInput,'plan'>).
  const prompt = seedPlanPromptContext(input, [], {
    wave: { index: 6, tableIds: ['ServiceExecution'], mdmEntityIds: [] },
  });
  assert.match(prompt, /"operatedStates": \[\s*"arrived"/);
  assert.match(prompt, /ONE row per listed state/);
});

test('W1: {ref} on a non-FK field and a self-ref are rejected; legitimate *Id refs stay quiet', () => {
  assert.equal(fieldAllowsSeedRef('weeklySchedule', ['BusinessHours', 'Customer']), false);
  assert.equal(fieldAllowsSeedRef('customerId', ['Customer']), true);

  const input: SeedBuildInput = {
    project: 102047,
    moduleName: 'petShop',
    language: 'en',
    ruleIds: [],
    entities: [
      { entityId: 'BusinessHours', title: 'Business hours', kind: 'core', fields: [field('businessHoursId'), field('weeklySchedule')] },
      { entityId: 'Customer', title: 'Customer', kind: 'core', fields: [field('customerId'), field('name')] },
    ],
    tablePlans: [
      { tableId: 'BusinessHours', tableName: 'business_hours', seedFor: 'petShopBusinessHours', primaryKey: ['business_hours_id'], detailsColumnName: 'details', columns: [{ name: 'business_hours_id', type: 'UUID', nullable: false }, { name: 'details', type: 'JSONB', nullable: true }] },
      { tableId: 'Customer', tableName: 'customer', seedFor: 'petShopCustomer', primaryKey: ['customer_id'], detailsColumnName: 'details', columns: [{ name: 'customer_id', type: 'UUID', nullable: false }, { name: 'details', type: 'JSONB', nullable: true }] },
    ],
    plan: {
      summary: 'be5 weekday-standard auto-ref on weeklySchedule.',
      localTables: [
        {
          tableId: 'BusinessHours',
          rows: [{
            key: 'weekday-standard',
            columns: [],
            details: [{ name: 'weeklySchedule', value: { ref: 'local:BusinessHours.weekday-standard' } }],
            children: [],
          }],
        },
        {
          tableId: 'Customer',
          rows: [{
            key: 'customer-primary',
            columns: [],
            details: [{ name: 'name', value: 'Ana' }],
            children: [],
          }],
        },
      ],
      mdmEntities: [],
    },
  };
  const errors = validateSeedPlan(input);
  assert.ok(errors.some(e => /self-reference/.test(e)), errors.join('\n'));
  assert.ok(errors.some(e => /weeklySchedule/.test(e) && /foreign-key/.test(e)), errors.join('\n'));
  assert.equal(errors.some(e => /Customer/.test(e)), false, errors.join('\n'));
});

test('C: an EMPTY summary is what crashed run05 — a blank plan is still rejected', () => {
  const built = buildSeedSource({
    project: 1, moduleName: 'm', language: 'en', entities: [], tablePlans: [], ruleIds: [],
    plan: { summary: '   ', localTables: [], mdmEntities: [] },
  });
  assert.ok(built.errors.includes('plan.summary is required'), built.errors.join('\n'));
});
