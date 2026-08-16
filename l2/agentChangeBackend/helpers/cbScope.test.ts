/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbScope.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeBackendScan, backfillEntityFieldsFromOwners, type CbScopeInput } from './cbScope.js';

// Minimal fixtures — scopeBackendScan only reads moduleName / entityId / fromEntity / toEntity.
const owner = (id: string, moduleName: string) => ({ kind: 'operation', id, moduleName }) as unknown as CbScopeInput['owners'][number];
const entity = (entityId: string, moduleName: string) => ({ entityId, moduleName }) as unknown as CbScopeInput['entities'][number];
const rel = (fromEntity: string, toEntity: string) => ({ fromEntity, toEntity, type: 'manyToOne' }) as unknown as CbScopeInput['relationships'][number];
const ws = (workspaceId: string, moduleName: string) => ({ workspaceId, moduleName }) as unknown as CbScopeInput['workspaces'][number];
const actor = (actorId: string, moduleName: string) => ({ actorId, moduleName }) as unknown as CbScopeInput['actors'][number];

function base(requestedModule: string): CbScopeInput {
  return {
    owners: [owner('createOrder', 'cafeFlow'), owner('bookRoom', 'petShop')],
    entities: [entity('Order', 'cafeFlow'), entity('MenuItem', 'cafeFlow'), entity('Reservation', 'petShop')],
    relationships: [rel('Order', 'MenuItem'), rel('Reservation', 'Order')], // 2nd crosses modules
    workspaces: [ws('pos', 'cafeFlow'), ws('front', 'petShop')],
    actors: [actor('waiter', 'cafeFlow'), actor('groomer', 'petShop')],
    allModuleNames: ['cafeFlow', 'petShop'],
    requestedModule,
  };
}

test('scopeBackendScan: explicit requested module wins over the first-sorted module', () => {
  const r = scopeBackendScan(base('petShop'));
  assert.equal(r.moduleName, 'petShop');
  assert.deepEqual(r.owners.map(o => (o as { id: string }).id), ['bookRoom']);
  assert.deepEqual(r.entities.map(e => (e as { entityId: string }).entityId), ['Reservation']);
  assert.deepEqual(r.workspaces.map(w => (w as { workspaceId: string }).workspaceId), ['front']);
  assert.deepEqual(r.actors.map(a => (a as { actorId: string }).actorId), ['groomer']);
  assert.equal(r.warning, null);
});

test('scopeBackendScan: no requested module -> first (sorted) module with owners', () => {
  const r = scopeBackendScan(base(''));
  assert.equal(r.moduleName, 'cafeFlow'); // sorts before petShop and has owners
  assert.deepEqual(r.owners.map(o => (o as { id: string }).id), ['createOrder']);
  assert.deepEqual(r.entities.map(e => (e as { entityId: string }).entityId), ['Order', 'MenuItem']);
});

test('scopeBackendScan: relationships kept only when BOTH endpoints are in scope', () => {
  const r = scopeBackendScan(base('cafeFlow'));
  // Order->MenuItem stays (both cafeFlow); Reservation->Order dropped (Reservation is petShop).
  assert.deepEqual(r.relationships.map(x => `${(x as { fromEntity: string }).fromEntity}->${(x as { toEntity: string }).toEntity}`), ['Order->MenuItem']);
});

test('scopeBackendScan: requested module absent -> empty owners + warning (no work, no cross-module)', () => {
  const r = scopeBackendScan(base('ghostModule'));
  assert.equal(r.moduleName, 'ghostModule');
  assert.deepEqual(r.owners, []);
  assert.deepEqual(r.entities, []);
  assert.match(r.warning || '', /requested module 'ghostModule' not found/);
});

test('scopeBackendScan: empty project (no owners, no modules) returns unscoped and no warning', () => {
  const r = scopeBackendScan({ owners: [], entities: [], relationships: [], workspaces: [], actors: [], allModuleNames: [], requestedModule: '' });
  assert.equal(r.moduleName, '');
  assert.equal(r.warning, null);
});

// ── backfillEntityFieldsFromOwners: the cafeFlow "kind: metric" gap ─────────────
// e3 leaves a metric entity with NO fields, yet deriveAggregates promotes it to a real aggregate, so
// domain entity + table + seeds were all built from an empty field list. Result in 102051:
// getShiftClosingReport returned two ids and getAiSalesSummary crashed on todaySalesTotal.toFixed(2).
// The L4 owner shapes DO declare the fields via fieldRef, so recover them deterministically.
const metricEntity = (entityId: string) =>
  ({ entityId, title: entityId, kind: 'metric', ownership: 'moduleOwned', moduleName: 'cafeFlow' }) as any;

test('backfill recovers fields from an owner outputShape fieldRef (bug-shift-closing-report-payload)', () => {
  const owners = [{
    id: 'viewShiftClosingReport', kind: 'operation', moduleName: 'cafeFlow',
    outputShape: {
      kind: 'object',
      fields: [
        { name: 'shiftClosingReportId', type: 'string', required: true, fieldRef: 'ShiftClosingReport.shiftClosingReportId' },
        { name: 'totalSalesAmount', type: 'number', required: true, fieldRef: 'ShiftClosingReport.totalSalesAmount' },
        { name: 'closingNotes', type: 'string', required: false, fieldRef: 'ShiftClosingReport.closingNotes' },
        { name: 'unrelated', type: 'string', required: true },                    // no fieldRef -> ignored
      ],
    },
  }] as any[];
  const [entity] = backfillEntityFieldsFromOwners([metricEntity('ShiftClosingReport')], owners);
  assert.deepEqual(entity.fields, [
    { fieldId: 'shiftClosingReportId', type: 'string', required: true },
    { fieldId: 'totalSalesAmount', type: 'number', required: true },
    { fieldId: 'closingNotes', type: 'string', required: false },
  ]);
});

test('backfill NEVER overrides ontology-declared fields', () => {
  const declared = { entityId: 'MenuItem', title: 'm', kind: 'core', ownership: 'moduleOwned', moduleName: 'cafeFlow', fields: [{ fieldId: 'name', type: 'string', required: true }] } as any;
  const owners = [{ id: 'x', kind: 'operation', outputShape: { kind: 'object', fields: [{ name: 'price', type: 'number', required: true, fieldRef: 'MenuItem.price' }] } }] as any[];
  const [entity] = backfillEntityFieldsFromOwners([declared], owners);
  assert.deepEqual(entity.fields, [{ fieldId: 'name', type: 'string', required: true }], 'the ontology is authoritative when it declares fields');
});

test('backfill reads list/paginated item shapes and operation inputs too', () => {
  const owners = [
    { id: 'browse', kind: 'operation', outputShape: { kind: 'list', fields: [{ name: 'items', type: 'array', required: true, item: { fields: [{ name: 'todaySalesTotal', type: 'number', required: true, fieldRef: 'OperationalDashboard.todaySalesTotal' }] } }] } },
    { id: 'view', kind: 'operation', inputs: [{ inputId: 'i1', fieldRef: 'OperationalDashboard.dailyShiftId', type: 'string', required: true, source: 'route', description: '' }] },
  ] as any[];
  const [entity] = backfillEntityFieldsFromOwners([metricEntity('OperationalDashboard')], owners);
  assert.deepEqual(entity.fields?.map((f: any) => f.fieldId).sort(), ['dailyShiftId', 'todaySalesTotal']);
});

test('backfill upgrades a field to required when ANY contract declares it mandatory', () => {
  // The seed gate only enforces REQUIRED fields, so an optional-then-required sighting must end required.
  const owners = [
    { id: 'a', kind: 'operation', outputShape: { kind: 'object', fields: [{ name: 'x', type: 'number', required: false, fieldRef: 'M.x' }] } },
    { id: 'b', kind: 'operation', outputShape: { kind: 'object', fields: [{ name: 'x', type: 'number', required: true, fieldRef: 'M.x' }] } },
  ] as any[];
  const [entity] = backfillEntityFieldsFromOwners([metricEntity('M')], owners);
  assert.deepEqual(entity.fields, [{ fieldId: 'x', type: 'number', required: true }]);
});

test('backfill ignores malformed fieldRefs and leaves an entity with no declarations alone', () => {
  const owners = [{ id: 'a', kind: 'operation', outputShape: { kind: 'object', fields: [
    { name: 'bad', type: 'string', required: true, fieldRef: 'NoDotHere' },
    { name: 'deep', type: 'string', required: true, fieldRef: 'A.b.c' },
  ] } }] as any[];
  const [entity] = backfillEntityFieldsFromOwners([metricEntity('Untouched')], owners);
  assert.equal(entity.fields, undefined);
  assert.deepEqual(backfillEntityFieldsFromOwners([metricEntity('NoDotHere')], owners)[0].fields, undefined);
});

test('scopeBackendScan: a module typed with the wrong case resolves to the canonical name', () => {
  // 'buildFlowFSM47' typed by hand against a module called 'buildFlowFsm47' used to filter every
  // collection to empty and report "no work" for a module that had 119 pending owners.
  const r = scopeBackendScan(base('PETshop'));
  assert.equal(r.moduleName, 'petShop');
  assert.deepEqual(r.owners.map(o => (o as { id: string }).id), ['bookRoom']);
  assert.equal(r.warning, null);
});

test('scopeBackendScan: a module that exists nowhere still warns', () => {
  const r = scopeBackendScan(base('cafeFlowX'));
  assert.equal(r.moduleName, 'cafeFlowX');
  assert.deepEqual(r.owners, []);
  assert.match(String(r.warning), /not found in project modules/);
});
