/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbScope.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeBackendScan, backfillEntityFieldsFromOwners, reconcileBackendTodo, resolveModuleName, upsertEntity, type CbScopeInput } from './cbScope.js';

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

// ── reconciliation scope (T9) ────────────────────────────────────────────────
// A project keeps every module the generator left behind: ns4 wrote buildFlowFsm39…47 side by side
// and only the last one has a todo. Reconciling project-wide killed a run whose module was intact.

const l4 = (key: string, moduleName: string) => ({ key, moduleName });

test('reconcileBackendTodo: a previous generation with no todo never fails the target module', () => {
  const result = reconcileBackendTodo({
    l4Owners: [l4('operation:listProject', 'buildFlowFsm47'), l4('operation:assignWorkTask', 'buildFlowFsm46'), l4('operation:createDailyLog', 'buildFlowFsm46')],
    todoOwners: [l4('operation:listProject', 'buildFlowFsm47')],
    todoErrors: [],
    targetModule: 'buildFlowFsm47',
  });
  assert.deepEqual(result.errors, []);
  // One line per module, never one per orphan owner (there were 108 of them).
  assert.deepEqual(result.warnings, ['module buildFlowFsm46: 2 l4 owner(s) with no todoBackend — module outside this run, ignored']);
});

test('reconcileBackendTodo: a real divergence in the target module still fails', () => {
  const result = reconcileBackendTodo({
    l4Owners: [l4('operation:listProject', 'buildFlowFsm47'), l4('operation:createProject', 'buildFlowFsm47')],
    todoOwners: [l4('operation:listProject', 'buildFlowFsm47'), l4('operation:goneFromL4', 'buildFlowFsm47')],
    todoErrors: [{ moduleName: 'buildFlowFsm47', message: 'invalid todoBackend defs at l5/buildFlowFsm47/todoBackend.defs.ts' }],
    targetModule: 'buildFlowFsm47',
  });
  assert.match(result.errors.join('; '), /invalid todoBackend defs/);
  assert.match(result.errors.join('; '), /missing l4 owner\(s\): operation:createProject/);
  assert.match(result.errors.join('; '), /absent from l4: operation:goneFromL4/);
});

test('reconcileBackendTodo: without a target, every module that HAS a todo is reconciled', () => {
  const result = reconcileBackendTodo({
    l4Owners: [l4('operation:listProject', 'buildFlowFsm47'), l4('operation:assignWorkTask', 'buildFlowFsm46')],
    todoOwners: [l4('operation:listProject', 'buildFlowFsm47')],
    todoErrors: [{ moduleName: 'buildFlowFsm46', message: 'invalid todoBackend defs at l5/buildFlowFsm46/todoBackend.defs.ts' }],
    targetModule: '',
  });
  // fsm46 has a (broken) todo file, so it IS a target of auto-discovery and its gap is an error.
  assert.match(result.errors.join('; '), /invalid todoBackend defs at l5\/buildFlowFsm46/);
  assert.match(result.errors.join('; '), /missing l4 owner\(s\): operation:assignWorkTask/);

  // With no todo at all, the orphan module is invisible to auto-discovery.
  const orphan = reconcileBackendTodo({
    l4Owners: [l4('operation:listProject', 'buildFlowFsm47'), l4('operation:assignWorkTask', 'buildFlowFsm46')],
    todoOwners: [l4('operation:listProject', 'buildFlowFsm47')],
    todoErrors: [],
    targetModule: '',
  });
  assert.deepEqual(orphan.errors, []);
  assert.deepEqual(orphan.warnings, ['module buildFlowFsm46: 1 l4 owner(s) with no todoBackend — module outside this run, ignored']);
});

test('resolveModuleName: what the user typed resolves to the module that exists', () => {
  assert.equal(resolveModuleName('buildFlowFSM47', ['buildFlowFsm46', 'buildFlowFsm47']), 'buildFlowFsm47');
  assert.equal(resolveModuleName('  buildflowfsm47 ', ['buildFlowFsm47']), 'buildFlowFsm47');
  // Unknown stays as typed: scopeBackendScan is the one that reports it as not found.
  assert.equal(resolveModuleName('nowhere', ['buildFlowFsm47']), 'nowhere');
  assert.equal(resolveModuleName('', ['buildFlowFsm47']), '');
});

test('scopeBackendScan: an owner of another module never joins the run, even with the same id', () => {
  // ns4 generations repeat operation ids: buildFlowFsm46 also has `listProject`. It matches the
  // target's todo entry by key, so only the module of its own folder keeps it out of the run.
  const input = base('buildFlowFsm47');
  input.owners = [owner('listProject', 'buildFlowFsm47'), owner('listProject', 'buildFlowFsm46')];
  input.allModuleNames = ['buildFlowFsm46', 'buildFlowFsm47'];
  const scoped = scopeBackendScan(input);
  assert.equal(scoped.owners.length, 1);
  assert.equal((scoped.owners[0] as unknown as { moduleName: string }).moduleName, 'buildFlowFsm47');
});

test('upsertEntity: the same entity id in two modules is two entities, not one', () => {
  // buildFlowFsm46 and 47 share 34 entity ids. Keyed by id alone, whichever file the store yielded
  // last decided the module — and the module scope then dropped an entity fsm47 itself declares.
  const entities: any[] = [];
  upsertEntity(entities, { entityId: 'Project', moduleName: 'buildFlowFsm47', fields: [{ fieldId: 'projectId' }] } as any);
  upsertEntity(entities, { entityId: 'Project', moduleName: 'buildFlowFsm46', fields: [] } as any);
  assert.equal(entities.length, 2);
  assert.deepEqual(entities.find(e => e.moduleName === 'buildFlowFsm47').fields, [{ fieldId: 'projectId' }]);
  // Re-reading the same module's file still merges in place.
  upsertEntity(entities, { entityId: 'Project', moduleName: 'buildFlowFsm47', fields: [{ fieldId: 'name' }] } as any);
  assert.equal(entities.length, 2);
  assert.deepEqual(entities.find(e => e.moduleName === 'buildFlowFsm47').fields, [{ fieldId: 'name' }]);
});
