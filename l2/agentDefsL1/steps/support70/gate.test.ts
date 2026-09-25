/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { D1_MEASURED_PUBLISH, reconstructAccessPolicy, type D1PolicyUnit } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { cycleIssues, pipelineId } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import { coreControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { adapterPipelineId, agendaSeedRequest, coreSupportRequest } from '/_102021_/l2/agentDefsL1/steps/support70/fixtures/cases.js';
import { assembleD1Support } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';
import { buildD1Support, emitRegistry, emitScope } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import { supportFilesToRemove } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';
import type { D1SupportEmit, D1SupportProblem } from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';

interface SerializedGrant {
  grantId: string;
  actorRef: string;
  anchorEntity?: string;
  entityRefs: string[];
  disclosure: string;
  scopeMode: string;
  session: string;
  path: Array<{
    entityId: string;
    steps: Array<{ relationshipId: string; from: string; to: string; field: string }>;
    pending: string;
  }>;
  pending: string;
}

function hopIds(path: SerializedGrant['path'] | undefined): string[] {
  return (path || []).flatMap(entry => entry.steps.map(step => step.relationshipId));
}

void test('the frozen fixture emits scope, authority and the live registry', () => {
  const request = coreSupportRequest();
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.llmCalls, 0);
  assert.equal(build.resolutions.length, 7);
  assert.equal(build.emit.length, 3);
  const types = build.emit.map(item => item.definition.artifactType).sort();
  assert.deepEqual(types, ['accessScope', 'authorityMap', 'repositoryRegistration']);
  assert.equal(build.emit.every(item => !(item.pipeline[0]?.dependsOn || []).some(dep => dep.includes('/usecase/'))), true);

  const scope = build.emit.find(item => item.definition.artifactType === 'accessScope');
  const grants = (scope?.definition.data as { grants: SerializedGrant[] }).grants;
  const daily = grants.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.equal(daily?.anchorEntity, 'Paciente');
  assert.equal(daily?.scopeMode, 'own');
  assert.equal(daily?.session, 'verified');
  assert.equal(daily?.pending, 'ACCESS_ANCHOR');
  assert.deepEqual(hopIds(daily?.path), ['appointmentPatient']);
  assert.notEqual(daily?.scopeMode, 'organization');
  assert.notEqual(daily?.scopeMode, 'public');
  const authority = build.emit.find(item => item.definition.artifactType === 'authorityMap');
  const entries = (authority?.definition.data as { entries: Array<{ grantId: string }> }).entries;
  assert.deepEqual(entries.map(item => item.grantId).sort(), grants.map(item => item.grantId).sort());

  const registration = build.emit.find(item => item.definition.artifactType === 'repositoryRegistration');
  const adapters = (registration?.definition.data as { adapters: Array<{ portId: string; adapterArtifactId: string }> }).adapters;
  assert.deepEqual(adapters, [{ portId: 'ConsultaRepository', adapterArtifactId: 'ConsultaRepository' }]);
  const depends = registration?.pipeline[0]?.dependsOn || [];
  assert.deepEqual(depends, [adapterPipelineId(request.project, request.moduleName, 'ConsultaRepository')]);
  assert.equal(JSON.stringify(registration).includes('GhostRepository'), false);

  const nodes = build.emit.map(item => ({ id: item.pipeline[0]?.id || '', dependsOn: [...(item.pipeline[0]?.dependsOn || [])] }));
  nodes.push({ id: adapterPipelineId(request.project, request.moduleName, 'ConsultaRepository'), dependsOn: [] });
  assert.deepEqual(cycleIssues(nodes), []);
  assert.equal(build.problems.some(item => item.code === 'CYCLE'), false);
  assert.equal(build.emit.filter(item => item.definition.artifactType !== 'repositoryRegistration')
    .every(item => !(item.pipeline[0]?.dependsOn || []).some(dep => dep.includes('/repositoryAdapter/') || dep.includes('/repositoryRegistration/'))), true);

  const resolved = build.resolutions.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.equal(resolved?.pending, 'ACCESS_ANCHOR');
  assert.equal(resolved?.anchorEntity, 'Paciente');
  assert.equal(resolved?.session, 'verified');
  assert.deepEqual(hopIds(resolved?.path), ['appointmentPatient']);
  assert.equal(build.problems.some(item => item.code === 'ACCESS_ANCHOR' && item.severity === 'review'), true);
  assert.equal(build.enumerations.every(item => item.consumed === false && item.source === 'domain30.enumerations'), true);
  assert.equal(build.normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED'), true);
  assert.equal(build.publication.stillToRegister.length, 3);
  assert.equal(build.publication.stillToRegister.every(item => item.outputPath.endsWith('.ts') && !item.outputPath.endsWith('.defs.ts')), true);
  assert.equal(JSON.stringify(build).includes('l5/'), false);
  assert.equal(build.publication.later.map(item => item.artifactType).sort().join(), 'integrationOutbound,persistenceSeeds');
  assert.equal(build.emit.some(item => item.definition.artifactType === 'persistenceSeeds'), false);
});

void test('registry and scope are separate emitters', () => {
  const request = coreSupportRequest();
  const problems: D1SupportProblem[] = [];
  const scope = emitScope(request, problems);
  const registry = emitRegistry(request, problems, []);
  assert.equal(scope.emit.every(item => item.definition.artifactType !== 'repositoryRegistration'), true);
  assert.equal(registry.emit.every(item => item.definition.artifactType === 'repositoryRegistration'), true);
  assert.equal(registry.adapters.length, 1);
  assert.equal(scope.resolutions.length, 7);
});

void test('a dead adapter is not registered and one removed consumer keeps the helper', () => {
  const request = coreSupportRequest();
  const daily = request.grants.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.ok(daily);
  request.grants.push({ ...daily, grantId: 'profissionalAgendaExtra', entityRefs: [...daily.entityRefs], allowedFields: [...daily.allowedFields] });
  request.adapters.push({
    portId: 'GhostRepository',
    entityId: 'Ghost',
    tableId: 'ghost',
    artifactId: 'GhostRepository',
    action: 'remove',
    defPath: `l1/${request.moduleName}/layer_1_external/adapters/persistence/ghostRepositoryAdapter.defs.ts`,
  });
  const shared = buildD1Support(request);
  assert.equal(shared.ok, true, shared.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.deepEqual(shared.registry.map(item => item.portId), ['ConsultaRepository']);
  const helper = shared.helpers.find(item => item.helperId === 'join:appointmentPatient');
  assert.ok(helper);
  assert.deepEqual(helper.consumers, ['profissionalAgendaDiaria', 'profissionalAgendaExtra']);

  const removed = buildD1Support({
    ...request,
    grants: request.grants.filter(item => item.grantId !== 'profissionalAgendaExtra'),
    existingHelpers: shared.helpers,
  });
  assert.equal(removed.ok, true, removed.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const kept = removed.helpers.find(item => item.helperId === 'join:appointmentPatient');
  assert.deepEqual(kept?.consumers, ['profissionalAgendaDiaria']);
  assert.equal(removed.removedHelpers.includes('join:appointmentPatient'), false);

  const gone = buildD1Support({
    ...request,
    grants: request.grants.filter(item => item.grantId !== 'profissionalAgendaDiaria' && item.grantId !== 'profissionalAgendaExtra'),
    scopePlans: request.scopePlans.filter(item => item.grantId !== 'profissionalAgendaDiaria'),
    existingHelpers: shared.helpers,
  });
  assert.equal(gone.helpers.some(item => item.helperId === 'join:appointmentPatient'), false);
  assert.equal(gone.removedHelpers.includes('join:appointmentPatient'), true);
});

void test('a missing grant and an anchor without a path stay diagnoses', () => {
  const request = coreSupportRequest();
  request.citedGrantIds.push('missingGrant');
  request.grants.push({
    grantId: 'orphanAnchor',
    actorRef: 'profissional',
    entityRefs: ['Consulta'],
    disclosure: 'fullRecord',
    allowedFields: [],
    anchorEntity: 'Unrelated',
    scopeMode: 'own',
  });
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.emit.length, 3);
  assert.equal(build.problems.some(item => item.code === 'GRANT_ABSENT' && item.path === 'missingGrant'), true);
  assert.equal(build.problems.some(item => item.code === 'ANCHOR_UNRESOLVED' && item.path === 'orphanAnchor'), true);
  const orphan = build.resolutions.find(item => item.grantId === 'orphanAnchor');
  assert.equal(orphan?.scopeMode, 'own');
  assert.equal(orphan?.anchorEntity, 'Unrelated');
  assert.deepEqual(orphan?.path, [{ entityId: 'Consulta', steps: [], pending: 'ANCHOR_UNRESOLVED' }]);
  assert.equal(orphan?.session, 'verified');
  const scope = build.emit.find(item => item.definition.artifactType === 'accessScope');
  const grants = (scope?.definition.data as { grants: Array<{ grantId: string; anchorEntity?: string }> }).grants;
  assert.equal(grants.some(item => item.grantId === 'missingGrant'), false);
  assert.equal(grants.find(item => item.grantId === 'orphanAnchor')?.anchorEntity, 'Unrelated');
  assert.equal(JSON.stringify(orphan).includes('"public"'), false);
  assert.equal(JSON.stringify(orphan).includes('"organization"'), false);
  const daily = build.resolutions.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.equal(daily?.anchorEntity, 'Paciente');
  assert.equal(daily?.pending, 'ACCESS_ANCHOR');
  const serialized = (scope?.definition.data as { grants: SerializedGrant[] }).grants.find(item => item.grantId === 'orphanAnchor');
  assert.equal(serialized?.scopeMode, 'own');
  assert.equal(serialized?.session, 'verified');
  assert.deepEqual(serialized?.path, [{ entityId: 'Consulta', steps: [], pending: 'ANCHOR_UNRESOLVED' }]);
  assert.equal(serialized?.pending, 'ACCESS_ANCHOR');
  assert.notEqual(serialized?.scopeMode, 'organization');
  assert.notEqual(serialized?.scopeMode, 'public');
});

void test('own and organization stay distinct and a multi-hop path is not just the anchor name', () => {
  const controllers = buildD1Controllers(coreControllerRequest());
  const request = coreSupportRequest();
  request.grants.push(
    {
      grantId: 'organizacaoConsulta',
      actorRef: 'recepcionista',
      entityRefs: ['Consulta'],
      disclosure: 'fullRecord',
      allowedFields: [],
      anchorEntity: 'Consulta',
      scopeMode: 'organization',
    },
    {
      grantId: 'propriaConsulta',
      actorRef: 'profissional',
      entityRefs: ['Consulta'],
      disclosure: 'fullRecord',
      allowedFields: [],
      anchorEntity: 'Consulta',
      scopeMode: 'own',
    },
  );
  const hops = [
    { relationshipId: 'appointmentRecord', from: 'Consulta', to: 'Atendimento', field: 'Consulta.recordId', required: true },
    { relationshipId: 'recordPatient', from: 'Atendimento', to: 'Paciente', field: 'Atendimento.patientId', required: true },
    { relationshipId: 'appointmentProfessional', from: 'Consulta', to: 'Profissional', field: 'Consulta.professionalId', required: true },
    { relationshipId: 'nameOnly', from: 'Consulta', to: 'Paciente', field: '', required: true },
  ];
  request.relationships = hops;
  const dailyPlan = request.scopePlans.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.ok(dailyPlan);
  dailyPlan.relationships = hops.map(item => ({
    relationshipId: item.relationshipId,
    from: item.from,
    to: item.to,
    field: item.field,
  }));
  dailyPlan.pending = 'ACCESS_ANCHOR';

  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const scope = build.emit.find(item => item.definition.artifactType === 'accessScope');
  assert.ok(scope);
  const grants = (scope.definition.data as { grants: SerializedGrant[] }).grants;
  const organization = grants.find(item => item.grantId === 'organizacaoConsulta');
  const own = grants.find(item => item.grantId === 'propriaConsulta');
  assert.ok(organization && own);
  assert.deepEqual(organization.entityRefs, own.entityRefs);
  assert.equal(organization.disclosure, own.disclosure);
  assert.equal(organization.scopeMode, 'organization');
  assert.equal(own.scopeMode, 'own');
  assert.equal(organization.session, 'verified');
  assert.equal(own.session, 'verified');
  assert.deepEqual(organization.path, [{ entityId: 'Consulta', steps: [], pending: '' }]);
  assert.equal(organization.scopeMode, 'organization');
  assert.equal(JSON.stringify(own).includes('actorId'), false);
  assert.notDeepEqual(
    { mode: organization.scopeMode, path: organization.path, pending: organization.pending },
    { mode: own.scopeMode, path: own.path, pending: own.pending },
  );

  const daily = grants.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.equal(daily?.anchorEntity, 'Paciente');
  assert.equal(daily?.scopeMode, 'own');
  assert.equal(daily?.pending, 'ACCESS_ANCHOR');
  assert.deepEqual(hopIds(daily?.path), ['appointmentRecord', 'recordPatient']);
  assert.equal(daily?.path.some(entry => entry.steps.some(step => step.relationshipId === 'nameOnly')), false);
  assert.equal(daily?.path.some(entry => entry.steps.some(step => step.field === 'actorId' || step.field === 'sessionId')), false);

  const units = [...build.emit.map(policyUnit), ...controllers.emit.map(policyUnit)];
  const reconstructed = reconstructAccessPolicy(units);
  assert.deepEqual(reconstructed.issues, []);
  const policy = reconstructed.policies.find(item => item.route === 'agendaClinica.agenda.qryListConsulta' && item.grantId === 'profissionalAgendaDiaria');
  assert.deepEqual(hopIds(policy?.path), ['appointmentRecord', 'recordPatient']);
  assert.equal(policy?.scopeMode, 'own');
  assert.equal(policy?.pending, 'ACCESS_ANCHOR');
  assert.equal(policy?.session, 'verified');
  const reception = reconstructed.policies.find(item => item.route === 'agendaClinica.consultas.qryListConsulta');
  assert.equal(reception?.grantId, 'recepcionistaAgendaConsultas');
  assert.equal(reception?.scopeMode, 'organization');
  assert.notDeepEqual(policy?.path, reception?.path);

  const scopeUnit = policyUnit(scope);
  const dropped = reconstructAccessPolicy([
    scopeUnit,
    {
      defPath: policyUnit(controllers.emit[0]).defPath,
      artifactType: 'httpController',
      data: policyUnit(controllers.emit[0]).data,
      dependencies: [],
    },
  ]);
  assert.equal(dropped.issues.some(item => item.code === 'POLICY_UNBOUND'), true);
  assert.equal(dropped.policies.length, 0);
});

void test('a receipt mismatch and a form identity do not emit', () => {
  const request = coreSupportRequest();
  const scopePath = `l1/${request.moduleName}/layer_2_application/scope/accessScope.defs.ts`;
  request.files = [{
    artifactType: 'accessScope',
    defPath: scopePath,
    action: 'update',
    contentHash: 'sha256:aaa',
    currentHash: 'sha256:bbb',
  }];
  const mismatched = buildD1Support(request);
  assert.equal(mismatched.ok, false);
  assert.equal(mismatched.emit.length, 0);
  assert.equal(mismatched.problems.some(item => item.code === 'RECEIPT_MISMATCH' && item.path === scopePath), true);

  const form = coreSupportRequest();
  form.formFields = ['actorId'];
  const formed = buildD1Support(form);
  assert.equal(formed.ok, false);
  assert.equal(formed.emit.length, 0);
  assert.equal(formed.problems.some(item => item.code === 'FORM_IDENTITY' && item.message.includes('actorId')), true);
  assert.equal(JSON.stringify(formed.emit).includes('actorId'), false);
});

void test('an inverted application edge is refused', () => {
  const request = coreSupportRequest();
  request.applicationEdges = [{
    id: pipelineId(request.project, request.moduleName, 'usecase', 'listConsulta'),
    type: 'usecase',
    dependsOn: [pipelineId(request.project, request.moduleName, 'repositoryRegistration', 'registerRepositories')],
  }];
  const build = buildD1Support(request);
  assert.equal(build.ok, false);
  assert.equal(build.emit.length, 0);
  assert.equal(build.problems.some(item => item.code === 'INVERTED_IMPORT'), true);
});

void test('removing one adapter keeps the shared registry', () => {
  const request = coreSupportRequest();
  request.adapters.push({
    portId: 'PacienteRepository',
    entityId: 'Paciente',
    tableId: 'paciente',
    artifactId: 'PacienteRepository',
    action: 'create',
    defPath: `l1/${request.moduleName}/layer_1_external/adapters/persistence/pacienteRepositoryAdapter.defs.ts`,
  });
  request.files = [{
    artifactType: 'repositoryRegistration',
    defPath: `l1/${request.moduleName}/layer_1_external/adapters/persistence/registerRepositories.defs.ts`,
    action: 'remove',
    contentHash: '',
    currentHash: '',
  }];
  const both = buildD1Support(request);
  assert.equal(both.ok, true, both.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.deepEqual(both.registry.map(item => item.portId), ['ConsultaRepository', 'PacienteRepository']);
  assert.equal(both.normalizations.some(item => item.code === 'REGISTRY_KEPT'), true);
  assert.equal(both.emit.some(item => item.definition.artifactType === 'repositoryRegistration'), true);

  request.adapters = request.adapters.map(adapter => adapter.portId === 'PacienteRepository' ? { ...adapter, action: 'remove' } : adapter);
  const one = buildD1Support(request);
  assert.deepEqual(one.registry.map(item => item.portId), ['ConsultaRepository']);
  assert.equal(one.emit.some(item => item.definition.artifactType === 'repositoryRegistration'), true);
  assert.deepEqual(supportFilesToRemove(one, request.files), []);

  request.adapters = [];
  const none = buildD1Support(request);
  assert.equal(none.emit.some(item => item.definition.artifactType === 'repositoryRegistration'), false);
  assert.deepEqual(supportFilesToRemove(none, request.files).map(file => file.artifactType), ['repositoryRegistration']);
});

void test('the frozen fixture plans consulta seeds and does not write rows', () => {
  const request = agendaSeedRequest();
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.llmCalls, 0);
  assert.equal(build.seedPlan.phase, 'plan');
  assert.equal(build.seedPlan.materialized, false);
  assert.equal(build.seedPlan.rowCount, 0);
  assert.equal(build.publication.later.map(item => item.artifactType).join(), '');
  const seeds = build.emit.find(item => item.definition.artifactType === 'persistenceSeeds');
  assert.ok(seeds);
  assert.equal(seeds.pipeline[0]?.defPath.endsWith('/seeds.defs.ts'), true);
  assert.equal(seeds.pipeline[0]?.outputPath.endsWith('/seeds.ts'), true);
  assert.equal((seeds.pipeline[0]?.dependsOn || []).some(dep => dep.includes('/usecase/') || dep.includes('/repositoryRegistration/')), false);
  assert.equal((seeds.pipeline[0]?.dependsOn || []).some(dep => dep.endsWith('/table/consulta')), true);
  const data = seeds.definition.data as {
    phase: string;
    scenarios: Array<{ scenarioId: string; tableId: string; constraints: string[]; refs: Array<{ field: string; entityId: string }>; states: string[]; requires?: string[] }>;
    dependencies: Array<{ entityId: string; kind: string; seeded: boolean }>;
    datasets: Array<{ datasetId: string; owners: string[] }>;
  };
  assert.equal(data.phase, 'plan');
  assert.equal(JSON.stringify(data).includes('"rows"'), false);
  assert.deepEqual(data.scenarios.map(item => item.scenarioId), [
    'agendarConsulta', 'confirmarConsulta', 'consultarAgendaDiaria', 'registrarAtendimento', 'registrarFalta',
  ]);
  assert.equal(data.scenarios.every(item => item.tableId === 'consulta'), true);
  const schedule = data.scenarios.find(item => item.scenarioId === 'agendarConsulta');
  assert.ok(schedule);
  assert.equal(schedule.constraints.includes('uniqueKeys:professionalId+scheduledAt'), true);
  assert.equal(schedule.constraints.includes('ref:patientId:Paciente'), true);
  assert.equal(schedule.constraints.includes('ref:professionalId:Profissional'), true);
  assert.deepEqual(schedule.states, ['scheduled']);
  assert.deepEqual(schedule.refs.map(ref => ref.entityId), ['Paciente', 'Profissional']);
  const attended = data.scenarios.find(item => item.scenarioId === 'registrarAtendimento');
  assert.deepEqual(attended?.states, ['attended']);
  assert.deepEqual(attended?.requires, ['details.attendanceNote']);
  assert.equal(attended?.constraints.includes('noteRequired:details.attendanceNote:attended'), true);
  assert.equal(data.scenarios.find(item => item.scenarioId === 'consultarAgendaDiaria')?.states.length, 0);
  assert.deepEqual(data.datasets[0]?.owners, [
    'agendarConsulta', 'confirmarConsulta', 'consultarAgendaDiaria', 'registrarAtendimento', 'registrarFalta',
  ]);
  const roles = data.dependencies.filter(item => item.kind === 'mdm');
  assert.deepEqual(roles.map(item => item.entityId), ['ContatoPaciente', 'Paciente', 'Profissional', 'Recepcionista']);
  assert.equal(roles.every(item => item.seeded === false), true);
  assert.equal(data.dependencies.some(item => item.entityId === 'paciente' || item.entityId === 'recepcionista'), false);
  const status = build.enumerations.find(item => item.entityId === 'Consulta' && item.path === 'status');
  assert.equal(status?.consumed, true);
  assert.equal(build.enumerations.find(item => item.path === 'details.identification.subtype')?.consumed, false);
  assert.equal(build.normalizations.some(item => item.code === 'ENUMERATIONS_CONSUMED'), true);
  assert.equal(build.normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED'), true);
  assert.equal(JSON.stringify(build).includes('l5/'), false);
});

void test('a ref on a structured field without a column relationship is refused', () => {
  const request = agendaSeedRequest();
  request.seedRefs = [{ field: 'details.attendanceNote', relationshipId: 'appointmentPatient', entityId: 'Paciente' }];
  const build = buildD1Support(request);
  assert.equal(build.ok, false);
  assert.equal(build.emit.length, 0);
  assert.equal(build.seedPlan.phase, 'absent');
  assert.equal(build.seedPlan.materialized, false);
  assert.equal(build.problems.some(item => item.code === 'SEED_REF_UNRELATED' && item.path === 'details.attendanceNote'), true);
  assert.equal(JSON.stringify(build.emit).includes('details.attendanceNote'), false);
});

void test('a role tag is not an MDM entity id and an MDM table is not seeded', () => {
  const request = agendaSeedRequest();
  request.seedRefs = [{ field: 'patientId', relationshipId: 'appointmentPatient', entityId: 'paciente' }];
  const tagged = buildD1Support(request);
  assert.equal(tagged.ok, false);
  assert.equal(tagged.problems.some(item => item.code === 'SEED_ROLE_TAG' && item.path === 'paciente'), true);
  assert.equal(JSON.stringify(tagged.seedPlan).includes('paciente'), false);

  const mdm = agendaSeedRequest();
  mdm.tables.push({
    tableId: 'paciente',
    entityId: 'Paciente',
    action: 'create',
    defPath: `l1/${mdm.moduleName}/layer_1_external/adapters/persistence/paciente.defs.ts`,
    uniqueKeys: [],
  });
  const seeded = buildD1Support(mdm);
  assert.equal(seeded.ok, false);
  assert.equal(seeded.problems.some(item => item.code === 'SEED_MDM' && item.path === 'paciente'), true);
  assert.equal(seeded.emit.some(item => JSON.stringify(item).includes('paciente')), false);

  const foreign = agendaSeedRequest();
  foreign.models = foreign.models.map(model => model.entityId === 'Consulta' ? { ...model, namespace: 'mdmSeed' } : model);
  const namespaced = buildD1Support(foreign);
  assert.equal(namespaced.ok, false);
  assert.equal(namespaced.problems.some(item => item.code === 'SEED_NAMESPACE' && item.path === 'mdmSeed'), true);
  assert.equal(JSON.stringify(namespaced.emit).includes('mdmSeed'), false);
  assert.equal(JSON.stringify(namespaced.seedPlan).includes('mdmSeed'), false);
});

void test('maintenance does not reseed and one removed owner keeps the shared dataset', () => {
  const reset = agendaSeedRequest();
  reset.maintenance = { action: 'reseed', ownerId: '' };
  const refused = buildD1Support(reset);
  assert.equal(refused.ok, false);
  assert.equal(refused.emit.length, 0);
  assert.equal(refused.seedPlan.rowCount, 0);
  assert.equal(refused.problems.some(item => item.code === 'MAINTENANCE_RESEED'), true);

  const shared = agendaSeedRequest();
  shared.existingDatasets = [{
    datasetId: 'consulta',
    tableId: 'consulta',
    owners: ['agendarConsulta', 'registrarAtendimento'],
  }];
  shared.maintenance = { action: 'removeOwner', ownerId: 'registrarAtendimento' };
  const kept = buildD1Support(shared);
  assert.equal(kept.ok, true, kept.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(kept.normalizations.some(item => item.code === 'DATASET_KEPT'), true);
  const dataset = kept.seedPlan.datasets.find(item => item.datasetId === 'consulta');
  assert.ok(dataset);
  assert.equal(dataset.owners.includes('agendarConsulta'), true);
  assert.equal(dataset.owners.includes('registrarAtendimento'), false);
  assert.equal(kept.emit.some(item => item.definition.artifactType === 'persistenceSeeds'), true);
});

void test('the three clinic events stay linked and unbound, and the note payload is not invented', () => {
  const request = agendaSeedRequest();
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.effectPlan.phase, 'plan');
  assert.equal(build.effectPlan.executed, false);
  assert.equal(build.effectPlan.capability.bound, false);
  assert.equal(build.effectPlan.capability.requestContextPublish, false);
  assert.equal(build.effectPlan.capability.symbol, D1_MEASURED_PUBLISH.symbol);
  assert.equal(build.effectPlan.capability.path, D1_MEASURED_PUBLISH.path);
  assert.equal(build.effectPlan.capability.owner, 'RequestContext.data.pgQueue');
  const outbound = build.emit.find(item => item.definition.artifactType === 'integrationOutbound');
  assert.ok(outbound);
  const data = outbound.definition.data as {
    events: Array<{ eventId: string; on: string; entityId: string; mechanism: string; consumer: string; payload?: string; mechanismRef?: string }>;
  };
  assert.deepEqual(data.events.map(item => item.eventId), ['atendimentoRegistrado', 'consultaConfirmada', 'faltaPacienteRegistrada']);
  assert.deepEqual(data.events.map(item => item.consumer), ['registrarAtendimento', 'confirmarConsulta', 'registrarFalta']);
  assert.deepEqual(data.events.map(item => item.on), ['Consulta.registrarAtendimento', 'Consulta.confirmarConsulta', 'Consulta.registrarFalta']);
  assert.equal(data.events.every(item => item.entityId === 'Consulta' && item.mechanism === '' && item.mechanismRef === undefined && item.payload === undefined), true);
  assert.equal(build.problems.filter(item => item.code === 'INTEGRATION_UNBOUND').length, 3);
  assert.equal(build.problems.some(item => item.code === 'PAYLOAD_UNDECLARED' && item.path === 'registrarAtendimento'), true);
  assert.equal(build.problems.some(item => item.code === 'PAYLOAD_UNDECLARED' && item.path !== 'registrarAtendimento'), false);
  assert.equal(JSON.stringify(outbound).includes('publishEvent'), false);
  assert.equal(JSON.stringify(outbound).includes('emitEvent'), false);
  assert.equal(JSON.stringify(outbound).includes('scheduler'), false);
  assert.equal(build.emit.some(item => item.definition.artifactType === 'httpController'), false);
  const depends = outbound.pipeline[0]?.dependsOn || [];
  assert.equal(depends.some(dep => dep.endsWith('/usecase/registrarAtendimento')), true);
  assert.equal(depends.some(dep => dep.includes('/repositoryRegistration/') || dep.includes('/httpController/')), false);
  assert.equal(existsSync(fileURLToPath(new URL('./prompt.md', import.meta.url))), false);
});

void test('an omitted event stops the step and a fictional publish name is refused', () => {
  const omitted = agendaSeedRequest();
  omitted.outbound = omitted.outbound.filter(event => event.eventId !== 'faltaPacienteRegistrada');
  const missing = buildD1Support(omitted);
  assert.equal(missing.ok, false);
  assert.equal(missing.emit.length, 0);
  assert.equal(missing.effectPlan.phase, 'absent');
  assert.equal(missing.problems.some(item => item.code === 'INTEGRATION_OMITTED' && item.path === 'faltaPacienteRegistrada'), true);

  const invented = agendaSeedRequest();
  invented.outbound = invented.outbound.map(event => event.eventId === 'consultaConfirmada' ? { ...event, mechanism: 'ctx.publishEvent' } : event);
  const refused = buildD1Support(invented);
  assert.equal(refused.ok, false);
  assert.equal(refused.emit.length, 0);
  assert.equal(refused.problems.some(item => item.code === 'FICTIONAL_API' && item.path === 'consultaConfirmada'), true);
  assert.equal(JSON.stringify(refused.emit).includes('publishEvent'), false);
});

void test('naming the measured MDM queue is not a module binding', () => {
  const request = agendaSeedRequest();
  request.outbound = request.outbound.map(event => event.eventId === 'consultaConfirmada'
    ? { ...event, mechanism: D1_MEASURED_PUBLISH.symbol }
    : event);
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.effectPlan.executed, false);
  assert.equal(build.effectPlan.capability.bound, false);
  assert.equal(build.problems.some(item => item.code === 'MECHANISM_INCOMPATIBLE' && item.path === 'consultaConfirmada'), true);
  assert.equal(build.problems.some(item => item.code === 'FICTIONAL_API'), false);
  assert.equal(build.problems.filter(item => item.code === 'INTEGRATION_UNBOUND').length, 2);
  const data = build.emit.find(item => item.definition.artifactType === 'integrationOutbound')?.definition.data as {
    events: Array<{ eventId: string; mechanism: string; mechanismRef?: string; consumer: string }>;
  };
  const confirmed = data.events.find(item => item.eventId === 'consultaConfirmada');
  assert.equal(confirmed?.mechanism, D1_MEASURED_PUBLISH.symbol);
  assert.equal(confirmed?.mechanismRef, D1_MEASURED_PUBLISH.path);
  assert.equal(confirmed?.consumer, 'confirmarConsulta');
  const others = data.events.filter(item => item.eventId !== 'consultaConfirmada');
  assert.equal(others.every(item => item.mechanism === '' && item.mechanismRef === undefined), true);
  assert.equal(build.emit.some(item => item.definition.artifactType === 'table'), false);
  assert.equal(JSON.stringify(build.emit).includes('publishEvent'), false);
});

void test('processes, inbound and plugins stay operations and a missing pool item stays a gap', () => {
  const request = agendaSeedRequest();
  request.operations = [
    { id: 'confirmacao', kind: 'process', operations: ['confirmarConsulta'], mechanism: '', consumer: 'confirmarConsulta', scheduled: false },
    { id: 'lembrete', kind: 'plugin', operations: ['confirmarConsulta.ligar'], mechanism: '', consumer: 'confirmarConsulta', scheduled: false },
    { id: 'retorno', kind: 'inbound', operations: ['registrarFalta'], mechanism: '', consumer: 'registrarFalta', scheduled: false },
    { id: 'cobranca', kind: 'process', operations: ['cobrar'], mechanism: '', consumer: 'cobranca', scheduled: true },
  ];
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const data = build.emit.find(item => item.definition.artifactType === 'integrationOutbound')?.definition.data as {
    processes: Array<{ processId: string; operations: string[] }>;
    plugins: Array<{ pluginId: string; operations: string[] }>;
    inbound: Array<{ inboundId: string; operations: string[] }>;
    gaps: Array<{ itemId: string; kind: string; code: string }>;
  };
  assert.deepEqual(data.processes.map(item => item.processId), ['cobranca', 'confirmacao']);
  assert.deepEqual(data.plugins.map(item => item.pluginId), ['lembrete']);
  assert.deepEqual(data.inbound.map(item => item.inboundId), ['retorno']);
  assert.deepEqual(data.gaps, [{ itemId: 'cobranca', kind: 'process', code: 'POOL_ABSENT' }]);
  assert.equal(build.problems.some(item => item.code === 'POOL_ABSENT' && item.path === 'cobranca'), true);
  assert.equal(build.problems.some(item => item.code === 'SCHEDULER_NOT_WRITTEN' && item.path === 'cobranca'), true);
  assert.equal(build.problems.some(item => item.code === 'POOL_ABSENT' && item.path === 'confirmacao'), false);
  assert.equal(build.emit.some(item => item.definition.artifactType === 'httpController'), false);
  assert.equal(JSON.stringify(build.emit).includes('scheduler'), false);
  assert.equal(build.effectPlan.executed, false);
});

const FIXTURE_3F4F677 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/agendaClinica-3f4f677');
const REL = /\n\s*\{\n\s*"relationshipId": "consultaProfissional",[\s\S]*?\n\s*\},/;

function dropProfissionalRelationship(rel: string, text: string): string {
  if (!rel.endsWith('/ontology/index.defs.ts') && !rel.endsWith('/drafts/controllers60.json')) return text;
  if (rel.endsWith('.json')) {
    const parsed = JSON.parse(text) as unknown;
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (let index = node.length - 1; index >= 0; index -= 1) {
          const item = node[index] as { relationshipId?: string };
          if (item && item.relationshipId === 'consultaProfissional') node.splice(index, 1);
          else walk(node[index]);
        }
        return;
      }
      if (node && typeof node === 'object') {
        for (const value of Object.values(node)) walk(value);
      }
    };
    walk(parsed);
    return JSON.stringify(parsed);
  }
  return text.replace(REL, '');
}

function walkFixture(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walkFixture(abs, rel));
    else out.push(rel);
  }
  return out;
}

function seedFixture(rewrite: (rel: string, text: string) => string): void {
  const host = installStudio(102047);
  for (const rel of walkFixture(FIXTURE_3F4F677, '')) {
    const info = fileInfoFromDisplay(102047, rel);
    if (!info) continue;
    seed(host, info, rewrite(rel, readFileSync(path.join(FIXTURE_3F4F677, rel), 'utf8')), 'frozen');
  }
  assert.ok(host.files[fileKey({ project: 102047, level: 1, folder: 'agendaClinica/pipeline/agentDefsL1', shortName: 'input', extension: '.json' })]);
}

function entryOf(grants: SerializedGrant[], grantId: string, entityId: string): SerializedGrant['path'][number] | undefined {
  return grants.find(item => item.grantId === grantId)?.path.find(item => item.entityId === entityId);
}

void test('3f4f677 keeps a path per entity and a removed relationship leaves only that entity pending', async () => {
  seedFixture((_rel, text) => text);
  const built = await assembleD1Support(102047, 'agendaClinica');
  assert.equal('build' in built, true, 'refusal' in built ? built.refusal : '');
  if (!('build' in built)) return;
  const scope = built.build.emit.find(item => item.definition.artifactType === 'accessScope');
  const grants = (scope?.definition.data as { grants: SerializedGrant[] }).grants;
  const consulta = entryOf(grants, 'profissionalAgendaPropria', 'Consulta');
  const profissional = entryOf(grants, 'profissionalAgendaPropria', 'Profissional');
  assert.deepEqual(consulta?.steps.map(step => step.field), ['Consulta.profissionalId']);
  assert.equal(consulta?.pending, '');
  assert.deepEqual(profissional?.steps, []);
  assert.equal(profissional?.pending, '');
  const organization = grants.find(item => item.grantId === 'recepcionistaGestaoAgenda');
  assert.equal(organization?.scopeMode, 'organization');
  assert.equal(organization?.pending, '');
  assert.equal(organization?.path.every(item => item.steps.length === 0 && item.pending === ''), true);

  seedFixture(dropProfissionalRelationship);
  const stripped = await assembleD1Support(102047, 'agendaClinica');
  assert.equal('build' in stripped, true, 'refusal' in stripped ? stripped.refusal : '');
  if (!('build' in stripped)) return;
  const again = (stripped.build.emit.find(item => item.definition.artifactType === 'accessScope')?.definition.data as { grants: SerializedGrant[] }).grants;
  const pending = entryOf(again, 'profissionalAgendaPropria', 'Consulta');
  const anchor = entryOf(again, 'profissionalAgendaPropria', 'Profissional');
  assert.deepEqual(pending?.steps, []);
  assert.equal(pending?.pending, 'ANCHOR_UNRESOLVED');
  assert.deepEqual(anchor?.steps, []);
  assert.equal(anchor?.pending, '');
  const still = again.find(item => item.grantId === 'recepcionistaGestaoAgenda');
  assert.equal(still?.scopeMode, 'organization');
  assert.equal(still?.pending, '');

  seedFixture((rel, text) => rel.endsWith('/ontology/index.defs.ts') || rel.endsWith('/access.defs.ts') || rel.endsWith('/drafts/controllers60.json')
    ? text.replaceAll('"Consulta"', '"Visita"').replaceAll('"Profissional"', '"Marcador"').replaceAll('Consulta.profissionalId', 'Visita.marcadorId')
    : text);
  const renamed = await assembleD1Support(102047, 'agendaClinica');
  assert.equal('build' in renamed, true, 'refusal' in renamed ? renamed.refusal : '');
  if (!('build' in renamed)) return;
  const moved = (renamed.build.emit.find(item => item.definition.artifactType === 'accessScope')?.definition.data as { grants: SerializedGrant[] }).grants;
  const visita = entryOf(moved, 'profissionalAgendaPropria', 'Visita');
  const marcador = entryOf(moved, 'profissionalAgendaPropria', 'Marcador');
  assert.deepEqual(visita?.steps.map(step => step.field), ['Visita.marcadorId']);
  assert.deepEqual(marcador?.steps, []);
  assert.equal(marcador?.pending, '');
});

function policyUnit(part: D1SupportEmit): D1PolicyUnit {
  return {
    defPath: part.pipeline[0]?.defPath || '',
    artifactType: part.definition.artifactType,
    data: part.definition.data,
    dependencies: part.pipeline[0]?.dependsFiles || [],
  };
}
