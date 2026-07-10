/// <mls fileReference="_102021_/l2/agentChangeBackend/cbSeedsCore.test.ts" enhancement="_102027_/l2/enhancementAgent"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSeedSource, extractSeedPlanFromSource, validateSeedPlan,
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

test('buildSeedSource compiles a valid semantic plan into local and MDM relationship seeds', () => {
  const result = buildSeedSource(validInput());

  assert.deepEqual(result.errors, []);
  assert.match(result.content ?? '', /"seedFor": "mdmRelationship"/);
  assert.match(result.content ?? '', /requires-ingredient/);
  assert.match(result.content ?? '', /"shift_id": "[0-9a-f-]+"/);
  assert.equal(extractSeedPlanFromSource(result.content ?? '')?.summary, validInput().plan.summary);
});

test('validateSeedPlan blocks invalid enums and seed lifecycle invariants', () => {
  const input = validInput();
  input.plan.localTables[0].rows.push({
    key: 'afternoon',
    columns: [{ name: 'status', value: 'open' }, { name: 'created_at', value: SEED_T1 }],
    details: [{ name: 'openedAt', value: SEED_T1 }, { name: 'openedBy', value: 'manager-2' }, { name: 'updatedAt', value: SEED_T1 }],
    children: [],
  });
  input.plan.localTables[1].rows[0].columns.find(field => field.name === 'order_type')!.value = 'dineIn';

  const errors = validateSeedPlan(input);

  assert.ok(errors.some(error => error.includes('expected one of table, takeout')));
  assert.ok(errors.some(error => error.includes('singleOpenShift')));
});
