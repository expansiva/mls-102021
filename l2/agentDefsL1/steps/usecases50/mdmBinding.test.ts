/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { mdmInputFields, writePreconditionPaths } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { coreUsecaseRequest, fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { bindMdm, isForeignMdmPatchKey, mdmFacadeGaps, mdmFlowGaps } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';
import type { D1MdmArgument, D1MdmPlannedCall, D1UsecaseMdm, D1UsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { AGENDA_CLINICA_F35E28A } from '/_102021_/l2/agentDefsL1/fixtures/agendaClinica-f35e28a/root.js';

const BENCH = AGENDA_CLINICA_F35E28A;

const PROFESSIONAL_FIELDS = {
  id: 'person-1',
  version: 4,
  'details.identification.name': 'Ada',
  'details.identification.docType': 'NationalId',
  'details.identification.docId': '100',
  'details.identification.countryCode': 'US',
  'details.person.occupation': 'physician',
  'details.person.privacyConsent': { granted: true },
};

void test('update of a professional is entity.update with platform fields and expectedVersion, not attachRole', () => {
  const build = buildD1Usecases(one('updateProfissional'));
  assert.equal(build.ok, true, build.problems.map(item => item.message).join('; '));
  const item = build.usecases[0];
  const mdm = item?.mdm;
  assert.ok(mdm);
  assert.equal(mdm.atomic, true);
  assert.deepEqual(mdm.calls.map(call => call.method), ['update']);
  assert.deepEqual(mdm.calls[0]?.capabilities, ['edit.platformFields']);
  assert.equal(mdm.calls.some(call => call.method === 'attachRole'), false);
  const patch = patchKeys(mdm.calls[0]);
  assert.deepEqual(patch, ['countryCode', 'docId', 'docType', 'name', 'occupation', 'privacyConsent']);
  assert.equal(patch.includes('tags'), false);
  assert.equal(named(mdm.calls[0], 'expectedVersion')?.path, 'version');
  assert.equal(named(mdm.calls[0], 'mdmId')?.role, 'selector');
  assert.deepEqual(mdm.calls[0]?.result, ['mdmId', 'version', 'details']);
  const data = item?.definition?.data as { ports: string[]; transactional: boolean };
  assert.deepEqual(data.ports, []);
  assert.equal(data.transactional, false);

  const seen: Array<{ mdmId: string; expectedVersion: number; patch: Record<string, unknown> }> = [];
  const result = applyUpdate(mdm, PROFESSIONAL_FIELDS, seen);
  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.mdmId, 'person-1');
  assert.equal(seen[0]?.expectedVersion, 4);
  assert.equal(seen[0]?.patch.name, 'Ada');
  assert.equal(seen[0]?.patch.occupation, 'physician');
  assert.equal(result.version, 5);
  assert.equal('tags' in (seen[0]?.patch || {}), false);
});

void test('update of a receptionist writes platform fields and the caller namespace in one versioned update', () => {
  const build = buildD1Usecases(one('updateRecepcionista'));
  assert.equal(build.ok, true, build.problems.map(item => item.message).join('; '));
  const mdm = build.usecases[0]?.mdm;
  assert.ok(mdm);
  assert.equal(mdm.atomic, true);
  assert.deepEqual(mdm.calls.map(call => call.method), ['update']);
  assert.deepEqual(mdm.calls[0]?.capabilities, ['edit.platformFields', 'edit.moduleNamespace']);
  const patch = patchKeys(mdm.calls[0]);
  assert.deepEqual(patch, ['agendaClinica', 'countryCode', 'docId', 'docType', 'name']);
  assert.equal(named(mdm.calls[0], 'agendaClinica')?.capability, 'edit.moduleNamespace');
  assert.equal(named(mdm.calls[0], 'name')?.capability, 'edit.platformFields');
  assert.equal(isForeignMdmPatchKey('agendaClinica', 'agendaClinica'), false);
  assert.equal(isForeignMdmPatchKey('agendaClinica', 'otherModule'), true);

  const seen: Array<{ mdmId: string; expectedVersion: number; patch: Record<string, unknown> }> = [];
  const values = {
    ...PROFESSIONAL_FIELDS,
    'details.agendaClinica': { desk: 'front' },
  };
  const result = applyUpdate(mdm, values, seen);
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0]?.patch.agendaClinica, { desk: 'front' });
  assert.equal(result.version, 5);
});

void test('create or attach keeps the new-person path and the existing-person path, without a module repository', async () => {
  const build = buildD1Usecases(one('createProfissional'));
  assert.equal(build.ok, true, build.problems.map(item => item.message).join('; '));
  const mdm = build.usecases[0]?.mdm;
  assert.ok(mdm);
  assert.equal(mdm.atomic, false);
  assert.deepEqual(mdm.calls.map(call => call.method), ['findByDocument', 'create', 'attachRole']);
  assert.equal(mdm.calls.every(call => call.target === 'entity'), true);
  assert.equal(mdm.calls.find(call => call.method === 'create')?.result.includes('alreadyExists'), true);
  assert.equal(mdm.calls.find(call => call.method === 'attachRole')?.arguments.find(arg => arg.name === 'role')?.value, 'agendaClinica.Profissional');
  const data = build.usecases[0]?.definition?.data as { ports: string[]; transactional: boolean };
  assert.deepEqual(data.ports, []);
  assert.equal(data.transactional, false);

  const store = new FakeEntity();
  const existing = await runCreateOrAttach(mdm, store, { ...PROFESSIONAL_FIELDS, id: '' });
  assert.deepEqual(existing.trace, ['findByDocument', 'create', 'attachRole']);
  assert.equal(existing.created?.alreadyExists, false);
  assert.deepEqual(existing.created?.details.tags, undefined);
  assert.deepEqual(store.tags.get(existing.mdmId), ['agendaClinica.Profissional']);

  const again = await runCreateOrAttach(mdm, store, { ...PROFESSIONAL_FIELDS, id: '' });
  assert.deepEqual(again.trace, ['findByDocument', 'attachRole']);
  assert.equal(again.created, null);
  assert.equal(again.mdmId, existing.mdmId);

  const patient = buildD1Usecases(one('createPaciente')).usecases[0]?.mdm;
  assert.deepEqual(patient?.calls.map(call => call.method), ['findByDocument', 'create', 'attachRole']);
  assert.equal(patient?.calls.some(call => call.method === 'findByContact'), false);
});

void test('list uses the real read: point lookup is not the collection read', () => {
  const build = buildD1Usecases(one('listProfissional'));
  assert.equal(build.ok, true, build.problems.map(item => item.message).join('; '));
  const mdm = build.usecases[0]?.mdm;
  assert.ok(mdm);
  assert.equal(mdm.atomic, false);
  const methods: string[] = mdm.calls.map(call => call.method);
  assert.equal(methods.includes('read'), false);
  assert.equal(methods.includes('attach'), false);
  const byId = mdm.calls.find(call => call.capabilities.includes('read.byId'));
  const byName = mdm.calls.find(call => call.capabilities.includes('locate.byName'));
  const byTag = mdm.calls.find(call => call.capabilities.includes('locate.byTag'));
  const byDocument = mdm.calls.find(call => call.capabilities.includes('locate.byDocument'));
  assert.equal(byId?.method, 'get');
  assert.equal(byId?.shape, 'point');
  assert.equal(byId?.target, 'entity');
  assert.equal(byDocument?.method, 'findByDocument');
  assert.equal(byDocument?.shape, 'point');
  assert.equal(byName?.method, 'listByType');
  assert.equal(byName?.shape, 'collection');
  assert.equal(byName?.target, 'collection');
  assert.equal(byName?.arguments.find(arg => arg.name === 'type')?.value, 'agendaClinica.Profissional');
  assert.equal(byTag?.method, 'listByType');
  assert.equal(byTag?.arguments.some(arg => arg.name === 'name'), false);
  assert.deepEqual(byName?.result, ['items', 'page', 'pageSize', 'total']);

  const page = applyList(byName, { 'details.identification.name': 'Ada' });
  assert.equal(page.total, 1);
  assert.equal(page.items[0]?.name, 'Ada');
  const oneRecord = applyGet(byId, { id: 'person-1' });
  assert.equal(oneRecord.mdmId, 'person-1');
  assert.equal(oneRecord.version, 1);
});

void test('a foreign namespace, a missing facade call, an incompatible call, a missing write and a crud transition are refused', () => {
  const foreign = one('updateProfissional');
  foreign.plans[0].steps = foreign.plans[0].steps.map(step => (
    step.kind === 'mdm' ? { ...step, namespace: 'otherModule' } : step
  ));
  const foreignBuild = buildD1Usecases(foreign);
  assert.equal(foreignBuild.ok, false);
  assert.equal(foreignBuild.problems.some(item => item.code === 'MDM_NAMESPACE' && item.message.includes('otherModule')), true);
  assert.equal(foreignBuild.emit.length, 0);

  const absent = one('updateProfissional');
  absent.plans[0].steps = [
    { kind: 'context', source: 'ctx' },
    { kind: 'mdm', namespace: 'agendaClinica', call: 'attach', entity: 'Profissional', capability: 'edit.platformFields' },
  ];
  const absentBuild = buildD1Usecases(absent);
  assert.equal(absentBuild.problems.some(item => item.code === 'MDM_CALL_ABSENT' && item.message.includes('attach')), true);
  assert.equal(absentBuild.problems.some(item => item.code === 'MDM_WRITE_MISSING' && item.message.includes('update')), true);
  assert.equal(absentBuild.emit.length, 0);

  const incompatible = one('listProfissional');
  incompatible.plans[0].steps = [
    { kind: 'context', source: 'ctx' },
    { kind: 'mdm', namespace: 'agendaClinica', call: 'update', entity: 'Profissional', capability: 'edit.platformFields' },
  ];
  const incompatibleBuild = buildD1Usecases(incompatible);
  assert.equal(incompatibleBuild.problems.some(item => item.code === 'MDM_CALL_INCOMPATIBLE'), true);
  assert.equal(incompatibleBuild.emit.length, 0);

  const missing = one('updateRecepcionista');
  missing.plans[0].steps = missing.plans[0].steps.filter(step => !(step.kind === 'mdm' && step.capability === 'edit.moduleNamespace'));
  const missingBuild = buildD1Usecases(missing);
  assert.equal(missingBuild.problems.some(item => item.code === 'MDM_WRITE_MISSING' && item.message.includes('edit.moduleNamespace')), true);
  assert.equal(missingBuild.emit.length, 0);

  const transition = one('updateProfissional');
  transition.plans[0].steps = [
    ...transition.plans[0].steps,
    { kind: 'transition', transitionId: 'agendaClinica.dados_profissional.cmdUpdateProfissional', payload: [] },
  ];
  const transitionBuild = buildD1Usecases(transition);
  assert.equal(transitionBuild.problems.some(item => item.code === 'INVALID_TRANSITION'), true);
  assert.equal(transitionBuild.emit.length, 0);

  const single = one('updateProfissional');
  single.plans[0].steps = [...single.plans[0].steps, { kind: 'transaction', boundary: 'local' }];
  const singleBuild = buildD1Usecases(single);
  assert.equal(singleBuild.usecases[0]?.mdm?.atomic, true);
  assert.equal(singleBuild.problems.some(item => item.code === 'MDM_NOT_ATOMIC' && item.message.includes('facade method is the boundary')), true);
  assert.equal(singleBuild.emit.length, 0);

  const wrapped = one('createProfissional');
  wrapped.plans[0].steps = [...wrapped.plans[0].steps, { kind: 'transaction', boundary: 'local' }];
  const wrappedBuild = buildD1Usecases(wrapped);
  assert.equal(wrappedBuild.usecases[0]?.mdm?.atomic, false);
  assert.equal(wrappedBuild.problems.some(item => item.code === 'MDM_NOT_ATOMIC' && item.message.includes('does not wrap')), true);
  assert.equal(wrappedBuild.emit.length, 0);

  const port = one('createProfissional');
  port.plans[0].steps = [...port.plans[0].steps, { kind: 'port', call: 'create', port: 'ProfissionalRepository' }];
  const portBuild = buildD1Usecases(port);
  assert.equal(portBuild.problems.some(item => item.code === 'MDM_LOCAL_PORT'), true);
  assert.equal(portBuild.emit.length, 0);
});

void test('audit and status history stay unbound, and inactivate is the facade pair rather than a transition', () => {
  const gaps = mdmFacadeGaps();
  assert.equal(gaps.some(gap => gap.capability === 'audit' && gap.code === 'MDM_UNBOUND' && gap.evidence.includes('audit.auditLog.load')), true);
  assert.equal(gaps.some(gap => gap.capability === 'statusHistory.read' && gap.evidence.includes('mdm.statusHistory.findByEntity')), true);

  const role = coreUsecaseRequest().entities.find(item => item.entityId === 'Profissional');
  assert.ok(role);
  const audit = bindMdm({
    entityId: role.entityId,
    namespace: role.namespace,
    capabilities: role.capabilities || [],
    selected: ['audit'],
    platformFields: role.platformFields || [],
  });
  assert.deepEqual(audit.calls, []);
  assert.equal(audit.gaps[0]?.code, 'MDM_UNBOUND');
  assert.equal(audit.atomic, false);

  const history = bindMdm({
    entityId: role.entityId,
    namespace: role.namespace,
    capabilities: role.capabilities || [],
    selected: ['statusHistory.read'],
    platformFields: [],
  });
  assert.deepEqual(history.calls, []);
  assert.equal(history.gaps[0]?.capability, 'statusHistory.read');

  const cycle = bindMdm({
    entityId: role.entityId,
    namespace: role.namespace,
    capabilities: role.capabilities || [],
    selected: ['inactivate'],
    platformFields: [],
    inputFields: [
      { path: 'id', optional: false, writePrecondition: false },
      { path: 'version', optional: false, writePrecondition: true },
    ],
  });
  assert.deepEqual(cycle.calls.map(call => call.method), ['inactivate', 'reactivate']);
  assert.equal(cycle.calls.every(call => call.alternative && call.arguments.some(arg => arg.name === 'expectedVersion')), true);
  assert.equal(cycle.atomic, false);

  const invite = bindMdm({
    entityId: role.entityId,
    namespace: role.namespace,
    capabilities: role.capabilities || [],
    selected: ['invite.login'],
    platformFields: [],
    inputFields: [
      { path: 'id', optional: false, writePrecondition: false },
      { path: 'email', optional: false, writePrecondition: false },
    ],
  });
  assert.equal(invite.calls[0]?.method, 'invite');
  assert.equal(invite.calls[0]?.target, 'identity');
  assert.equal(invite.calls[0]?.arguments.find(arg => arg.name === 'actorId')?.value, 'ctx');
  assert.equal(invite.calls[0]?.arguments.find(arg => arg.name === 'moduleId')?.value, 'ctx');

  const listed = buildD1Usecases(one('listProfissional'));
  assert.equal(listed.ok, true, listed.problems.map(item => item.message).join('; '));
  assert.equal(listed.usecases[0]?.mdm?.calls.some(call => call.capabilities.includes('audit') || call.capabilities.includes('statusHistory.read')), false);
});

void test('real update inputs bind expectedVersion from writePrecondition and do not refresh it', async () => {
  const professional = replay('updateProfissional', 'Profissional', 'update', ['dados_profissional', 'dados_recepcionista']);
  const receptionist = replay('updateRecepcionista', 'Recepcionista', 'update', ['dados_recepcionista']);
  for (const request of [professional, receptionist]) {
    const build = buildD1Usecases(request);
    assert.equal(build.ok, true, build.problems.map(item => `${item.code}: ${item.message}`).join('; '));
    const mdm = build.usecases[0]?.mdm;
    assert.ok(mdm);
    assert.deepEqual(mdm.calls.map(call => call.method), ['update']);
    assert.equal(mdm.calls.some(call => call.method === 'attachRole' || call.method === 'get'), false);
    const version = named(mdm.calls[0], 'expectedVersion');
    assert.equal(version?.origin.kind, 'contract');
    assert.equal(version?.origin.path, 'version');
    assert.equal(version?.origin.evidence, 'writePrecondition');
    assert.equal(version?.role, 'parameter');
    assert.equal(mdm.calls[0]?.arguments.some(arg => arg.role === 'patch' && arg.name === 'version'), false);
  }

  const marked = buildD1Usecases(professional).usecases[0]?.mdm;
  assert.ok(marked);
  const store = { version: 4, trace: [] as string[] };
  const values = { id: 'person-1', version: 4, 'details.identification.name': 'Ada' };
  const first = await runPlan(marked, values, store);
  const second = await runPlan(marked, values, store);
  assert.deepEqual(first.trace, ['update']);
  assert.equal(first.conflict, false);
  assert.deepEqual(second.trace, ['update']);
  assert.equal(second.conflict, true);
  assert.deepEqual(store.trace, ['update', 'update']);
});

void test('a version field without writePrecondition is not expectedVersion', () => {
  const request = one('updateProfissional');
  request.routes = [{
    route: 'agendaClinica.dados_profissional.cmdUpdateProfissional',
    page: 'dados_profissional',
    kind: 'cmd',
    usecaseRef: 'updateProfissional',
  }];
  request.usecases[0].routes = [request.routes[0].route];
  request.contracts = [{
    pageId: 'dados_profissional',
    path: 'l2/agendaClinica/web/contracts/dados_profissional.defs.ts',
    source: `
      export interface UpdateProfissionalInput { id: string; version: number; details: { identification?: { name: string } } }
      export interface UpdateProfissionalOutput { id: string }
      export const updateProfissionalRoute = "agendaClinica.dados_profissional.cmdUpdateProfissional" as const;
    `,
  }];
  request.files = [{
    path: 'l4/agendaClinica/ontology/Profissional.defs.ts',
    text: 'export const profissional = { entityId: "Profissional", kind: "role", roleTag: "agendaClinica.Profissional", record: { fields: { id: { type: "uuid", derived: true }, version: { type: "integer", derived: true } } } } as const;\n',
  }];
  request.plans = request.usecases.map(usecase => fixturePlan(request, usecase));
  const build = buildD1Usecases(request);
  assert.equal(build.ok, false);
  assert.equal(build.emit.length, 0);
  assert.equal(build.problems.some(item => item.code === 'MDM_ARGUMENT_UNBOUND' && item.message.includes('expectedVersion')), true);
  assert.equal(build.usecases[0]?.mdm?.calls[0]?.arguments.some(arg => arg.name === 'expectedVersion'), false);
});

void test('createPaciente does not call findByContact, and an optional document is a condition', async () => {
  const request = replay('createPaciente', 'Paciente', 'create', ['pacientes']);
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.map(item => `${item.code}: ${item.message}`).join('; '));
  const mdm = build.usecases[0]?.mdm;
  assert.ok(mdm);
  assert.equal(mdm.atomic, false);
  assert.deepEqual(mdm.calls.map(call => call.method), ['findByDocument', 'create', 'attachRole']);
  assert.equal(mdm.calls.some(call => call.method === 'findByContact'), false);
  const find = mdm.calls.find(call => call.id === 'findDocument');
  assert.deepEqual(find?.when.map(clause => clause.path), ['details.identification.docType', 'details.identification.docId']);
  const create = mdm.calls.find(call => call.id === 'createPerson');
  assert.equal(create?.when.some(clause => clause.kind === 'prior' && clause.call === 'findDocument' && clause.present === false), true);
  const attach = mdm.calls.find(call => call.id === 'attachRole');
  assert.deepEqual(attach?.arguments.find(arg => arg.name === 'mdmId')?.origin.calls, ['findDocument', 'createPerson']);
  assert.equal(attach?.arguments.find(arg => arg.name === 'role')?.value, 'agendaClinica.Paciente');
  assert.equal(mdm.calls.some(call => call.method === 'create' && call.arguments.some(arg => arg.name === 'expectedVersion')), false);

  const store = new FakeEntity();
  const absent = await runPlan(mdm, { 'details.identification.name': 'Ada', 'details.identification.countryCode': 'US' }, store);
  assert.deepEqual(absent.trace, ['create', 'attachRole']);
  const fresh = await runPlan(mdm, {
    'details.identification.name': 'Bea',
    'details.identification.docType': 'NationalId',
    'details.identification.docId': '200',
    'details.identification.countryCode': 'US',
  }, store);
  assert.deepEqual(fresh.trace, ['findByDocument', 'create', 'attachRole']);
  const again = await runPlan(mdm, {
    'details.identification.name': 'Bea',
    'details.identification.docType': 'NationalId',
    'details.identification.docId': '200',
    'details.identification.countryCode': 'US',
  }, store);
  assert.deepEqual(again.trace, ['findByDocument', 'attachRole']);
  assert.equal(again.mdmId, fresh.mdmId);
});

void test('dropping a producer or the create condition is refused before the def is complete', () => {
  const request = replay('createPaciente', 'Paciente', 'create', ['pacientes']);
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.map(item => item.message).join('; '));
  const mdm = build.usecases[0]?.mdm;
  assert.ok(mdm);
  const entity = request.entities.find(item => item.entityId === 'Paciente');
  assert.ok(entity);
  const read = mdmInputFields(request.contracts, request.routes, []);
  const input = {
    entityId: 'Paciente',
    namespace: 'agendaClinica',
    capabilities: entity.capabilities || [],
    selected: ['register.createOrAttach'],
    platformFields: entity.platformFields || [],
    inputFields: read.fields,
  };
  const dropped = mdm.calls.map(call => call.id === 'attachRole'
    ? {
      ...call,
      arguments: call.arguments.map(arg => arg.name === 'mdmId'
        ? { ...arg, origin: { kind: 'prior' as const, path: 'mdmId', calls: ['findDocument'] } }
        : arg),
    }
    : call);
  assert.equal(mdmFlowGaps(dropped, input).some(gap => gap.evidence.includes('no create result')), true);

  const repeated = mdm.calls.map(call => call.id === 'createPerson' ? { ...call, when: [] } : call);
  assert.equal(mdmFlowGaps(repeated, input).some(gap => gap.evidence.includes('does not skip')), true);

  const later = mdm.calls.map(call => call.id === 'attachRole'
    ? {
      ...call,
      arguments: call.arguments.map(arg => arg.name === 'mdmId'
        ? { ...arg, origin: { kind: 'prior' as const, path: 'mdmId', calls: ['createPerson', 'after'] } }
        : arg),
    }
    : call);
  assert.equal(mdmFlowGaps(later, input).some(gap => gap.evidence.includes('not an earlier call')), true);
});

void test('an update without a route contract does not invent expectedVersion', () => {
  const role = coreUsecaseRequest().entities.find(item => item.entityId === 'Profissional');
  assert.ok(role);
  const bound = bindMdm({
    entityId: role.entityId,
    namespace: role.namespace,
    capabilities: role.capabilities || [],
    selected: ['edit.platformFields'],
    platformFields: role.platformFields || [],
    inputFields: null,
    contractUnread: 'Route agendaClinica.cadastro_profissional.cmdUpdateProfissional: contract absent',
  });
  assert.equal(bound.calls.some(call => call.method === 'update'), false);
  assert.equal(bound.calls.some(call => call.arguments.some(arg => arg.name === 'expectedVersion')), false);
  assert.equal(bound.gaps.some(gap => gap.code === 'MDM_CONTRACT_UNREAD' && gap.evidence.includes('contract absent')), true);

  const request = one('updateProfissional');
  request.contracts = [];
  request.plans = [{ usecaseId: 'updateProfissional', steps: [{ kind: 'context', source: 'ctx' }] }];
  const build = buildD1Usecases(request);
  assert.equal(build.ok, false);
  assert.equal(build.problems.some(item => item.code === 'MDM_CONTRACT_UNREAD' && item.message.includes('contract absent')), true);
  assert.equal(build.usecases[0]?.mdm?.calls.some(call => call.arguments.some(arg => arg.name === 'expectedVersion')), false);
});

void test('a create without a route contract does not invent findByDocument', () => {
  const role = coreUsecaseRequest().entities.find(item => item.entityId === 'Paciente');
  assert.ok(role);
  const bound = bindMdm({
    entityId: role.entityId,
    namespace: role.namespace,
    capabilities: role.capabilities || [],
    selected: ['register.createOrAttach'],
    platformFields: role.platformFields || [],
    inputFields: null,
  });
  assert.equal(bound.calls.some(call => call.id === 'findDocument' || call.method === 'findByDocument'), false);
  assert.equal(bound.gaps.some(gap => gap.code === 'MDM_CONTRACT_UNREAD'), true);

  const request = one('createPaciente');
  request.contracts = [];
  request.plans = [{ usecaseId: 'createPaciente', steps: [{ kind: 'context', source: 'ctx' }] }];
  const build = buildD1Usecases(request);
  assert.equal(build.problems.some(item => item.code === 'MDM_CONTRACT_UNREAD' && item.message.includes('contract absent')), true);
  assert.equal(build.usecases[0]?.mdm?.calls.some(call => call.id === 'findDocument' || call.method === 'findByDocument'), false);
});

void test('an unread route contract names the missing contract, binding, or symbol', () => {
  const absent = mdmInputFields([], [{ route: 'agendaClinica.pacientes.cmdCreatePaciente', page: 'pacientes' }], []);
  assert.equal(absent.fields, null);
  assert.match(absent.unread.join('; '), /contract absent/);

  const unbound = mdmInputFields(
    [{ pageId: 'pacientes', path: 'pacientes.defs.ts', source: 'export interface Out { id: string }\nexport const routes = {} as const;\n' }],
    [{ route: 'agendaClinica.pacientes.cmdCreatePaciente', page: 'pacientes' }],
    [],
  );
  assert.equal(unbound.fields, null);
  assert.match(unbound.unread.join('; '), /binding not unique/);

  const missing = mdmInputFields(
    [{
      pageId: 'pacientes',
      path: 'pacientes.defs.ts',
      source: `
        export interface Out { id: string }
        export const routes = { "agendaClinica.pacientes.cmdCreatePaciente": { input: "Missing", output: "Out" } } as const;
      `,
    }],
    [{ route: 'agendaClinica.pacientes.cmdCreatePaciente', page: 'pacientes' }],
    [],
  );
  assert.equal(missing.fields, null);
  assert.match(missing.unread.join('; '), /symbol absent/);
});

function one(usecaseId: string): D1UsecaseRequest {
  const request = coreUsecaseRequest();
  request.usecases = request.usecases.filter(item => item.usecaseId === usecaseId);
  request.routes = request.routes.filter(item => item.usecaseRef === usecaseId);
  request.plans = request.plans.filter(item => item.usecaseId === usecaseId);
  return request;
}

function named(call: D1MdmPlannedCall | undefined, name: string): D1MdmArgument | undefined {
  return call?.arguments.find(arg => arg.name === name);
}

function patchKeys(call: D1MdmPlannedCall | undefined): string[] {
  return (call?.arguments || []).filter(arg => arg.role === 'patch').map(arg => arg.name).sort();
}

function valueOf(arg: D1MdmArgument, values: Record<string, unknown>): unknown {
  if (arg.path) return values[arg.path];
  return arg.value;
}

function applyUpdate(
  mdm: D1UsecaseMdm,
  values: Record<string, unknown>,
  seen: Array<{ mdmId: string; expectedVersion: number; patch: Record<string, unknown> }>,
): { mdmId: string; version: number } {
  const call = mdm.calls[0];
  assert.equal(call?.method, 'update');
  const patch: Record<string, unknown> = {};
  for (const arg of call?.arguments || []) {
    if (arg.role === 'patch') patch[arg.name] = valueOf(arg, values);
  }
  const input = {
    mdmId: String(valueOf(named(call, 'mdmId')!, values)),
    expectedVersion: Number(valueOf(named(call, 'expectedVersion')!, values)),
    patch,
  };
  seen.push(input);
  return { mdmId: input.mdmId, version: input.expectedVersion + 1 };
}

function applyList(
  call: D1MdmPlannedCall | undefined,
  values: Record<string, unknown>,
): { items: Array<{ name: string }>; page: number; pageSize: number; total: number } {
  assert.equal(call?.method, 'listByType');
  const type = String(call?.arguments.find(arg => arg.name === 'type')?.value);
  const name = String(valueOf(call!.arguments.find(arg => arg.name === 'name')!, values));
  assert.equal(type, 'agendaClinica.Profissional');
  const items = [{ name }].filter(item => item.name.toLowerCase().includes(name.toLowerCase()));
  return { items, page: 1, pageSize: items.length || 1, total: items.length };
}

function applyGet(call: D1MdmPlannedCall | undefined, values: Record<string, unknown>): { mdmId: string; version: number; details: Record<string, unknown> } {
  assert.equal(call?.method, 'get');
  assert.equal(call?.shape, 'point');
  return { mdmId: String(valueOf(named(call, 'mdmId')!, values)), version: 1, details: {} };
}

class FakeEntity {
  private readonly byDocument = new Map<string, { mdmId: string; version: number }>();
  readonly tags = new Map<string, string[]>();
  private next = 1;

  async findByDocument(docType: string, docId: string): Promise<{ mdmId: string; version: number } | null> {
    return this.byDocument.get(`${docType}\u0000${docId}`) || null;
  }

  async create(details: Record<string, unknown>): Promise<{ mdmId: string; version: number; alreadyExists: boolean; details: Record<string, unknown> }> {
    const key = `${String(details.docType)}\u0000${String(details.docId)}`;
    const found = this.byDocument.get(key);
    if (found) return { mdmId: found.mdmId, version: found.version, alreadyExists: true, details };
    const mdmId = `new-${this.next}`;
    this.next += 1;
    this.byDocument.set(key, { mdmId, version: 1 });
    return { mdmId, version: 1, alreadyExists: false, details };
  }

  async attachRole(mdmId: string, role: string): Promise<{ mdmId: string; version: number }> {
    const tags = this.tags.get(mdmId) || [];
    if (!tags.includes(role)) tags.push(role);
    this.tags.set(mdmId, tags);
    return { mdmId, version: 2 };
  }
}

function replay(usecaseId: string, entityId: string, operation: string, pages: readonly string[]): D1UsecaseRequest {
  const request = coreUsecaseRequest();
  request.contracts = pages.map(pageId => ({
    pageId,
    path: `l2/agendaClinica/web/contracts/${pageId}.defs.ts`,
    source: readFileSync(path.join(BENCH, `l2/agendaClinica/web/contracts/${pageId}.defs.ts`), 'utf8'),
  }));
  const ontology = parseD1Source(
    readFileSync(path.join(BENCH, `l4/agendaClinica/ontology/${entityId}.defs.ts`), 'utf8'),
    'defs',
  );
  assert.ok(ontology, entityId);
  const entity = request.entities.find(item => item.entityId === entityId);
  assert.ok(entity, entityId);
  for (const marked of writePreconditionPaths(ontology)) {
    const field = entity.fields.find(item => item.name === marked);
    if (field) field.writePrecondition = true;
    else entity.fields.push({ name: marked, type: 'integer', derived: true, writePrecondition: true });
  }
  const routes: D1UsecaseRequest['routes'] = [];
  for (const contract of request.contracts) {
    const matcher = /export const (\w+Route) = ["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(contract.source))) {
      const route = match[2];
      const tail = route.split('.').pop() || '';
      const raw = tail.slice(3);
      const id = `${raw.charAt(0).toLowerCase()}${raw.slice(1)}`;
      if (id !== usecaseId) continue;
      routes.push({ route, page: contract.pageId, kind: tail.startsWith('cmd') ? 'cmd' : 'qry', usecaseRef: usecaseId });
    }
  }
  request.routes = routes;
  request.usecases = [{
    usecaseId,
    entity: entityId,
    operation,
    routes: routes.map(item => item.route),
    defPath: `l1/agendaClinica/layer_2_application/usecases/${usecaseId}.defs.ts`,
  }];
  request.plans = request.usecases.map(usecase => fixturePlan(request, usecase));
  return request;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function resolveArg(
  arg: D1MdmArgument,
  values: Record<string, unknown>,
  results: Map<string, Record<string, unknown>>,
): unknown {
  if (arg.origin.kind === 'literal' || arg.origin.kind === 'context') return arg.value;
  if (arg.origin.kind === 'contract') return values[arg.origin.path || ''];
  for (const id of arg.origin.calls || []) {
    const value = results.get(id)?.[arg.origin.path || ''];
    if (hasValue(value)) return value;
  }
  return undefined;
}

function callRuns(
  call: D1MdmPlannedCall,
  values: Record<string, unknown>,
  results: Map<string, Record<string, unknown>>,
): boolean {
  return call.when.every(clause => {
    const value = clause.kind === 'contract'
      ? values[clause.path]
      : results.get(clause.call || '')?.[clause.path];
    return hasValue(value) === clause.present;
  });
}

async function runPlan(
  mdm: D1UsecaseMdm,
  values: Record<string, unknown>,
  store: FakeEntity | { version: number; trace: string[] },
): Promise<{ trace: string[]; mdmId: string; created: { alreadyExists: boolean; details: Record<string, unknown> } | null; conflict: boolean }> {
  const trace: string[] = [];
  const results = new Map<string, Record<string, unknown>>();
  let mdmId = '';
  let created: { alreadyExists: boolean; details: Record<string, unknown> } | null = null;
  let conflict = false;
  for (const call of mdm.calls) {
    if (!callRuns(call, values, results)) continue;
    const args: Record<string, unknown> = {};
    for (const arg of call.arguments) args[arg.name] = resolveArg(arg, values, results);
    trace.push(call.method);
    if (call.method === 'findByDocument' && store instanceof FakeEntity) {
      const found = await store.findByDocument(String(args.docType), String(args.docId));
      results.set(call.id, found ? { mdmId: found.mdmId, version: found.version } : {});
    } else if (call.method === 'create' && store instanceof FakeEntity) {
      const details: Record<string, unknown> = {};
      for (const arg of call.arguments) {
        if (arg.role !== 'patch') continue;
        const value = args[arg.name];
        if (value !== undefined) details[arg.name] = value;
      }
      const row = await store.create(details);
      created = { alreadyExists: row.alreadyExists, details: row.details };
      results.set(call.id, { mdmId: row.mdmId, version: row.version, alreadyExists: row.alreadyExists });
    } else if (call.method === 'attachRole' && store instanceof FakeEntity) {
      mdmId = String(args.mdmId);
      await store.attachRole(mdmId, String(args.role));
      results.set(call.id, { mdmId, version: 2 });
    } else if (call.method === 'update' && !(store instanceof FakeEntity)) {
      store.trace.push('update');
      const expected = Number(args.expectedVersion);
      if (expected !== store.version) conflict = true;
      else store.version += 1;
      results.set(call.id, { mdmId: String(args.mdmId), version: store.version });
    }
  }
  return { trace, mdmId, created, conflict };
}

async function runCreateOrAttach(
  mdm: D1UsecaseMdm,
  store: FakeEntity,
  values: Record<string, unknown>,
): Promise<{ trace: string[]; mdmId: string; created: { alreadyExists: boolean; details: Record<string, unknown> } | null }> {
  return runPlan(mdm, values, store);
}
