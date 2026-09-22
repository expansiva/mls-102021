/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { cycleIssues, pipelineId } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { adapterPipelineId, coreSupportRequest } from '/_102021_/l2/agentDefsL1/steps/support70/fixtures/cases.js';
import { buildD1Support, emitRegistry, emitScope } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import type { D1SupportProblem } from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';

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
  const grants = (scope?.definition.data as { grants: Array<{ grantId: string; anchorEntity?: string }> }).grants;
  const daily = grants.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.equal(daily?.anchorEntity, 'Paciente');
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
  assert.deepEqual(resolved?.path.map(step => step.relationshipId), ['appointmentPatient']);
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
  assert.deepEqual(orphan?.path, []);
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
});
