/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbAccess.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  accessScanWarnings, authorityRefsForOperation, CB_PERSON_LOGIN_FIELD, CB_SCAN_AUTHORITY_REQUIRED,
  emitProfileAuthoritiesTs, emitSessionScopeTs, helperNameForOperation, mergeModuleAccess,
  pinUsecaseScope, planAnchorWalk, readAccessBindings, readAccessMatrixV4, resolveOwnerAccess,
  type CbEntityAccessCatalog, type CbModuleAccess,
} from './cbAccess.js';

function matrixV4(operationRef: string, authorityRefs: string[], extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: '2026-08-13-ns4-access-matrix-v4',
    moduleName: 'fixture',
    profiles: [{ profileId: 'profissional', actorRefs: ['profissional'], kind: 'internal' }],
    grants: [{ profileRef: 'profissional', authorityRef: authorityRefs[0], dataScope: { mode: 'assigned' } }],
    realization: {
      status: 'navigationCompiled',
      operationAuthorityRefs: [{
        operationRef, route: `fixture.ws.${operationRef}`, workspaceId: 'ws', functionId: operationRef, authorityRefs,
      }],
    },
    ...extra,
  };
}

const ce01Bindings = {
  schemaVersion: '2026-09-08-ns4-access-bindings-v1',
  bindings: [{
    profileRef: 'profissional',
    authorityRef: 'clinic:assigned-appointments',
    entityRef: 'Appointment',
    dataScope: { mode: 'assigned', description: 'appointments assigned to the signed-in professional' },
    anchor: {
      hops: [{ entityRef: 'Appointment', fieldId: 'professionalId', targetEntityRef: 'Professional', direction: 'forward' }],
      terminus: { entityRef: 'Professional', fieldId: CB_PERSON_LOGIN_FIELD },
    },
  }],
  synthesizedAuthorities: [],
};

const ce01Entities: CbEntityAccessCatalog[] = [
  { entityId: 'Appointment', kind: 'core', storageTarget: 'moduleDatabase', mdmType: '', role: '', idField: 'appointmentId' },
  { entityId: 'Professional', kind: 'mdm', storageTarget: 'mdm', mdmType: 'agendaClinicaLike.Professional', role: 'agendaClinicaLike.Professional', idField: 'professionalId' },
];

const ce09Bindings = {
  bindings: [{
    profileRef: 'motorista',
    authorityRef: 'fleet:assigned-vehicle',
    entityRef: 'Vehicle',
    dataScope: { mode: 'assigned', description: 'vehicles with an active assignment' },
    anchor: {
      hops: [
        { entityRef: 'VehicleAssignment', fieldId: 'vehicleId', targetEntityRef: 'Vehicle', direction: 'incoming' },
        { entityRef: 'VehicleAssignment', fieldId: 'driverId', targetEntityRef: 'Driver', direction: 'forward' },
      ],
      terminus: { entityRef: 'Driver', fieldId: CB_PERSON_LOGIN_FIELD },
    },
  }],
  synthesizedAuthorities: [],
};

const ce09Entities: CbEntityAccessCatalog[] = [
  { entityId: 'Vehicle', kind: 'mdm', storageTarget: 'mdm', mdmType: 'fleetLike.Vehicle', role: 'fleetLike.Vehicle', idField: 'vehicleId' },
  { entityId: 'Driver', kind: 'mdm', storageTarget: 'mdm', mdmType: 'fleetLike.Driver', role: 'fleetLike.Driver', idField: 'driverId' },
  { entityId: 'VehicleAssignment', kind: 'core', storageTarget: 'moduleDatabase', mdmType: '', role: '', idField: 'vehicleAssignmentId' },
];

const ce05Bindings = {
  bindings: [{
    profileRef: 'cliente',
    authorityRef: 'svc:own-orders',
    entityRef: 'OrdenServicio',
    dataScope: { mode: 'own', description: 'only the signed-in customer orders' },
    projectionRef: 'OrdenServicioClienteView',
    anchor: {
      hops: [{ entityRef: 'OrdenServicio', fieldId: 'clienteId', targetEntityRef: 'Cliente', direction: 'forward' }],
      terminus: { entityRef: 'Cliente', fieldId: CB_PERSON_LOGIN_FIELD },
    },
  }],
  synthesizedAuthorities: [],
};

const ce05Entities: CbEntityAccessCatalog[] = [
  { entityId: 'OrdenServicio', kind: 'core', storageTarget: 'moduleDatabase', mdmType: '', role: '', idField: 'ordenServicioId' },
  { entityId: 'Cliente', kind: 'mdm', storageTarget: 'mdm', mdmType: 'ordenServicioLike.Cliente', role: 'ordenServicioLike.Cliente', idField: 'clienteId' },
];

const ce03Bindings = {
  bindings: [{
    profileRef: 'financeiro',
    authorityRef: 'exp:org-approved',
    entityRef: 'Expense',
    dataScope: { mode: 'custom', description: 'approved expenses of the whole organization' },
    anchor: null,
  }],
  synthesizedAuthorities: [],
};

function accessOf(matrix: Record<string, unknown>, bindings: Record<string, unknown>): CbModuleAccess {
  return mergeModuleAccess(readAccessMatrixV4(matrix), readAccessBindings(bindings))!;
}

test('V4 reader transcribes operationAuthorityRefs; empty is a named scan error', () => {
  const v4 = readAccessMatrixV4(matrixV4('listAppointment', ['clinic:assigned-appointments']));
  assert.equal(v4.hasV4, true);
  assert.deepEqual(authorityRefsForOperation(accessOf(matrixV4('listAppointment', ['clinic:assigned-appointments']), ce01Bindings), 'listAppointment'), ['clinic:assigned-appointments']);
  const warnings = accessScanWarnings(accessOf(matrixV4('listAppointment', ['clinic:assigned-appointments']), ce01Bindings), ['listAppointment', 'deleteExpense']);
  assert.ok(warnings.some(row => row.includes(CB_SCAN_AUTHORITY_REQUIRED) && row.includes('deleteExpense')));
  assert.equal(warnings.some(row => row.includes('listAppointment') && row.includes(CB_SCAN_AUTHORITY_REQUIRED)), false);
});

test('pre-n07 matrix without V4 is not a scan error', () => {
  const v3 = readAccessMatrixV4({
    schemaVersion: '2026-08-10-ns4-access-matrix-v3',
    realization: { status: 'useCasesCompiled', operationAuthorityRefs: [] },
  });
  assert.equal(v3.hasV4, false);
  const access = mergeModuleAccess(v3, readAccessBindings(ce01Bindings));
  const warnings = accessScanWarnings(access, ['listAppointment']);
  assert.equal(warnings.some(row => row.includes(CB_SCAN_AUTHORITY_REQUIRED)), false);
});

test('ce01-like assigned-direct walk filters Appointment.professionalId via Person.platformUserId', () => {
  const access = accessOf(matrixV4('listAppointment', ['clinic:assigned-appointments']), ce01Bindings);
  const resolved = resolveOwnerAccess(access, { id: 'listAppointment', entity: 'Appointment' })!;
  assert.equal(resolved.scope.mode, 'assigned');
  assert.equal(resolved.publicRoute, false);
  const plan = planAnchorWalk('Appointment', resolved.scope.anchor!, ce01Entities)!;
  assert.equal(plan.filterFieldId, 'professionalId');
  assert.equal(plan.steps[0].kind, 'sessionPersons');
  assert.equal(plan.steps[0].matchField, CB_PERSON_LOGIN_FIELD);
  assert.equal(plan.steps[0].mdmType, 'agendaClinicaLike.Professional');
  const ts = emitSessionScopeTs('agendaClinicaLike', 102021, access, [{ id: 'listAppointment', entity: 'Appointment' }], ce01Entities);
  assert.match(ts, /scopeFilterForListAppointment/);
  assert.match(ts, /professionalId/);
  assert.match(ts, /platformUserId/);
  assert.match(ts, /ctx\.mdm\.collection\.listByType/);
  assert.match(ts, /sessionContext\?\.actorId/);
  assert.doesNotMatch(ts, /endsWith\(/);
  assert.doesNotMatch(ts, /\/Id\$/);
});

test('ce09-like assigned-via-intermediate walk joins VehicleAssignment then projects vehicleId', () => {
  const matrix = matrixV4('listVehicle', ['fleet:assigned-vehicle'], {
    profiles: [{ profileId: 'motorista', actorRefs: ['motorista'], kind: 'internal' }],
    grants: [{ profileRef: 'motorista', authorityRef: 'fleet:assigned-vehicle', dataScope: { mode: 'assigned' } }],
  });
  const access = accessOf(matrix, ce09Bindings);
  const resolved = resolveOwnerAccess(access, { id: 'listVehicle', entity: 'Vehicle' })!;
  const plan = planAnchorWalk('Vehicle', resolved.scope.anchor!, ce09Entities)!;
  assert.equal(plan.filterFieldId, 'vehicleId');
  assert.equal(plan.steps.some(step => step.entityRef === 'VehicleAssignment' && step.matchField === 'driverId'), true);
  assert.equal(plan.steps.some(step => step.kind === 'project' && step.collectField === 'vehicleId'), true);
  const ts = emitSessionScopeTs('fleetLike', 102021, access, [{ id: 'listVehicle', entity: 'Vehicle' }], ce09Entities);
  assert.match(ts, /VehicleAssignment/);
  assert.match(ts, /driverId/);
  assert.match(ts, /vehicleId/);
  assert.doesNotMatch(ts, /endsWith\(/);
});

test('ce05-like own walk filters clienteId and carries projectionRef', () => {
  const matrix = matrixV4('inspectOrden', ['svc:own-orders'], {
    profiles: [{ profileId: 'cliente', actorRefs: ['cliente'], kind: 'external' }],
    grants: [{ profileRef: 'cliente', authorityRef: 'svc:own-orders', dataScope: { mode: 'own' } }],
  });
  const access = accessOf(matrix, ce05Bindings);
  const resolved = resolveOwnerAccess(access, { id: 'inspectOrden', entity: 'OrdenServicio' })!;
  assert.equal(resolved.scope.mode, 'own');
  assert.equal(resolved.scope.projectionRef, 'OrdenServicioClienteView');
  const plan = planAnchorWalk('OrdenServicio', resolved.scope.anchor!, ce05Entities)!;
  assert.equal(plan.filterFieldId, 'clienteId');
  const ts = emitSessionScopeTs('ordenServicioLike', 102021, access, [{ id: 'inspectOrden', entity: 'OrdenServicio' }], ce05Entities);
  assert.match(ts, /scopeFilterForInspectOrden/);
  assert.match(ts, /clienteId/);
});

test('ce03-like custom is prose: no helper, pin carries the description', () => {
  const matrix = matrixV4('deleteExpense', ['exp:org-approved'], {
    profiles: [{ profileId: 'financeiro', actorRefs: ['financeiro'], kind: 'internal' }],
    grants: [{ profileRef: 'financeiro', authorityRef: 'exp:org-approved', dataScope: { mode: 'custom' } }],
  });
  const access = accessOf(matrix, ce03Bindings);
  const resolved = resolveOwnerAccess(access, { id: 'deleteExpense', entity: 'Expense' })!;
  assert.equal(resolved.scope.mode, 'custom');
  assert.equal(resolved.scope.helperName, '');
  assert.match(resolved.scope.description, /approved expenses/);
  const ts = emitSessionScopeTs('reembolsoLike', 102021, access, [{ id: 'deleteExpense', entity: 'Expense' }], []);
  assert.doesNotMatch(ts, /scopeFilterForDeleteExpense/);
  const result: Record<string, unknown> = {};
  pinUsecaseScope(result, resolved.scope);
  assert.equal((result.scopeFilter as { mode: string }).mode, 'custom');
  assert.match(String((result.scopeFilter as { description: string }).description), /approved expenses/);
});

test('public grant marks the route public and emits no person filter', () => {
  const matrix = matrixV4('inspectEvent', ['evt:public'], {
    profiles: [{ profileId: 'publico', actorRefs: ['publico'], kind: 'external' }],
    grants: [{ profileRef: 'publico', authorityRef: 'evt:public', dataScope: { mode: 'public' } }],
  });
  const bindings = {
    bindings: [{
      profileRef: 'publico', authorityRef: 'evt:public', entityRef: 'Event',
      dataScope: { mode: 'public', description: 'anonymous' }, anchor: null,
    }],
    synthesizedAuthorities: [],
  };
  const access = accessOf(matrix, bindings);
  const resolved = resolveOwnerAccess(access, { id: 'inspectEvent', entity: 'Event' })!;
  assert.equal(resolved.publicRoute, true);
  assert.equal(resolved.scope.helperName, '');
});

test('profile table maps module:actor claims onto authorityRefs', () => {
  const access = accessOf(matrixV4('listAppointment', ['clinic:assigned-appointments']), ce01Bindings);
  const ts = emitProfileAuthoritiesTs('agendaClinicaLike', access, [{ id: 'listAppointment', entity: 'Appointment' }]);
  assert.match(ts, /agendaClinicaLike:profissional/);
  assert.match(ts, /clinic:assigned-appointments/);
  assert.match(ts, /authorityRefsForSession/);
  assert.match(ts, /OPERATION_AUTHORITIES/);
});

test('helper name is the operation id, not inferred from a field suffix', () => {
  assert.equal(helperNameForOperation('listAppointment'), 'scopeFilterForListAppointment');
});

test('compile fixtures for ce01/ce05/ce09 exist as TypeScript', () => {
  for (const name of ['ce01SessionScope.ts', 'ce05SessionScope.ts', 'ce09SessionScope.ts']) {
    const source = readFileSync(fileURLToPath(new URL(`./fixtures/n09/${name}`, import.meta.url)), 'utf8');
    assert.match(source, /export async function scopeFilterFor/);
    assert.match(source, /platformUserId/);
    assert.doesNotMatch(source, /[\u00c0-\u00ff]/);
  }
});
