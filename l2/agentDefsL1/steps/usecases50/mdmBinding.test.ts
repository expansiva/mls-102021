/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { coreUsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { bindMdm, isForeignMdmPatchKey, mdmFacadeGaps } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';
import type { D1MdmArgument, D1MdmPlannedCall, D1UsecaseMdm, D1UsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

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
  assert.deepEqual(patient?.calls.map(call => call.method), ['findByDocument', 'findByContact', 'create', 'attachRole']);
  assert.equal(patient?.calls.find(call => call.method === 'findByContact')?.shape, 'point');
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
  });
  assert.equal(invite.calls[0]?.method, 'invite');
  assert.equal(invite.calls[0]?.target, 'identity');
  assert.equal(invite.calls[0]?.arguments.find(arg => arg.name === 'actorId')?.value, 'ctx');
  assert.equal(invite.calls[0]?.arguments.find(arg => arg.name === 'moduleId')?.value, 'ctx');

  const listed = buildD1Usecases(one('listProfissional'));
  assert.equal(listed.ok, true, listed.problems.map(item => item.message).join('; '));
  assert.equal(listed.usecases[0]?.mdm?.calls.some(call => call.capabilities.includes('audit') || call.capabilities.includes('statusHistory.read')), false);
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

async function runCreateOrAttach(
  mdm: D1UsecaseMdm,
  store: FakeEntity,
  values: Record<string, unknown>,
): Promise<{ trace: string[]; mdmId: string; created: { alreadyExists: boolean; details: Record<string, unknown> } | null }> {
  const trace: string[] = [];
  const find = mdm.calls.find(call => call.method === 'findByDocument');
  const create = mdm.calls.find(call => call.method === 'create');
  const attach = mdm.calls.find(call => call.method === 'attachRole');
  assert.ok(find && create && attach);
  const docType = String(valueOf(named(find, 'docType')!, values));
  const docId = String(valueOf(named(find, 'docId')!, values));
  trace.push('findByDocument');
  const found = await store.findByDocument(docType, docId);
  let mdmId = found?.mdmId || '';
  let created: { alreadyExists: boolean; details: Record<string, unknown> } | null = null;
  if (!found) {
    const details: Record<string, unknown> = {};
    for (const arg of create.arguments) {
      if (arg.role === 'patch') details[arg.name] = valueOf(arg, values);
    }
    trace.push('create');
    const row = await store.create(details);
    created = { alreadyExists: row.alreadyExists, details: row.details };
    mdmId = row.mdmId;
  }
  const role = String(named(attach, 'role')?.value);
  trace.push('attachRole');
  await store.attachRole(mdmId, role);
  return { trace, mdmId, created };
}
