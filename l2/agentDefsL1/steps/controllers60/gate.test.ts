/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { coreControllerRequest, frozenControllerCounts } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { buildD1Controllers, grantUnionIssues } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import type { D1ControllerBuild, D1ControllerRequest, D1HandlerBinding } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

void test('the frozen head is 5 controllers and 22 routes, one def per page', () => {
  const measured = frozenControllerCounts();
  assert.equal(measured.pages, 5);
  assert.equal(measured.routes, 22);
  const request = coreControllerRequest();
  const build = buildD1Controllers(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.measuredPages, 5);
  assert.equal(build.measuredRoutes, 22);
  assert.equal(build.llmCalls, 0);
  assert.equal(build.controllers.length, 5);
  assert.equal(build.emit.length, 5);
  const counts = Object.fromEntries(build.controllers.map(item => [item.pageId, item.handlers.length]));
  assert.deepEqual(counts, {
    agenda: 2,
    cadastro_profissional: 3,
    cadastro_recepcionista: 6,
    consultas: 6,
    pacientes: 5,
  });
  const handlers = build.controllers.flatMap(item => item.handlers);
  assert.deepEqual(handlers.map(item => item.route).sort(), request.routes.map(item => item.route).sort());
  const emitted = build.emit.flatMap(item => item.pipeline[0]?.routes || []).sort();
  assert.deepEqual(emitted, request.routes.map(item => item.route).sort());
  for (const handler of handlers) {
    const usecase = request.usecases.find(item => item.usecaseId === handler.usecaseId);
    assert.equal(handler.functionName, usecase?.functionName);
    assert.equal(handler.session, 'verified');
    assert.deepEqual(handler.steps, ['transport', 'session', 'authorize', 'call', 'project', 'bff']);
    assert.equal(handler.projection.envelope, 'passthrough');
    assert.equal(Object.hasOwn(handler.projection, 'items'), false);
  }
  assert.equal(build.emit.every(item => {
    const files = item.pipeline[0]?.dependsFiles || [];
    return files.some(file => file.includes('/usecases/'))
      && files.filter(file => file.includes('/scope/accessScope.defs.ts')).length === 1
      && files.every(file => !file.includes('/l2/') && (file.includes('/usecases/') || file.includes('/scope/accessScope.defs.ts')));
  }), true);
  assert.equal(build.emit.every(item => (item.pipeline[0]?.dependsOn || []).some(dep => dep.endsWith('/accessScope/accessScope'))), true);
  assert.equal(build.emit.every(item => !(item.pipeline[0]?.dependsOn || []).some(dep => dep.includes('repositoryAdapter'))), true);
  assert.equal(JSON.stringify(build.emit).includes('ctx.mdm'), false);
  assert.equal(build.enumerations.every(item => item.consumed === false && item.source === 'domain30.enumerations'), true);
  assert.equal(build.normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED'), true);
});

void test('listConsulta keeps two projections and does not union grants', () => {
  const request = coreControllerRequest();
  const build = buildD1Controllers(request);
  const agenda = handler(build.controllers.flatMap(item => item.handlers), 'agendaClinica.agenda.qryListConsulta');
  const consultas = handler(build.controllers.flatMap(item => item.handlers), 'agendaClinica.consultas.qryListConsulta');
  const pacientes = handler(build.controllers.flatMap(item => item.handlers), 'agendaClinica.pacientes.qryListConsulta');
  assert.deepEqual(agenda.projection, {
    shape: 'array',
    fields: ['id', 'status', 'attendanceNote'],
    envelope: 'passthrough',
  });
  assert.equal(agenda.outputSymbol.length > 0, true);
  assert.notEqual(agenda.outputSymbol, 'ListConsultaOutput');
  assert.deepEqual(consultas.projection.fields, ['id', 'status']);
  assert.equal(consultas.projection.shape, 'array');
  assert.deepEqual(pacientes.projection.fields, ['id', 'status']);
  assert.deepEqual(agenda.grantIds, ['profissionalAgendaDiaria']);
  assert.deepEqual(consultas.grantIds, ['recepcionistaAgendaConsultas']);
  assert.deepEqual(pacientes.grantIds, ['recepcionistaAgendaConsultas']);
  const emittedAgenda = handlersOf(build, 'agendaClinica.agenda.qryListConsulta');
  const emittedConsultas = handlersOf(build, 'agendaClinica.consultas.qryListConsulta');
  assert.deepEqual(emittedAgenda, ['profissionalAgendaDiaria']);
  assert.deepEqual(emittedConsultas, ['recepcionistaAgendaConsultas']);
  assert.equal(agenda.grantIds.includes('recepcionistaAgendaConsultas'), false);
  assert.equal(consultas.grantIds.includes('profissionalAgendaDiaria'), false);
  const scope = agenda.scopePlan[0];
  assert.equal(scope?.anchorEntity, 'Paciente');
  assert.equal(scope?.pending, 'ACCESS_ANCHOR');
  assert.equal(scope?.emittedBy, 'support70');
  assert.deepEqual(scope?.relationships.map(item => item.field).sort(), ['Consulta.patientId', 'Consulta.professionalId']);
  assert.equal(scope?.relationships.some(item => item.relationshipId === 'patientContacts'), false);
  assert.equal(build.problems.some(item => item.code === 'ACCESS_ANCHOR' && item.severity === 'review'), true);
  assert.equal(build.ok, true);
  const profissional = handler(build.controllers.flatMap(item => item.handlers), 'agendaClinica.cadastro_profissional.cmdCreateProfissional');
  const recepcionista = handler(build.controllers.flatMap(item => item.handlers), 'agendaClinica.cadastro_recepcionista.cmdCreateProfissional');
  assert.deepEqual(profissional.grantIds, ['profissionalProprioCadastro']);
  assert.deepEqual(recepcionista.grantIds, ['recepcionistaLocalizarProfissionais']);
  assert.deepEqual(
    grantUnionIssues(['recepcionista'], ['recepcionistaAgendaConsultas', 'profissionalAgendaDiaria'], request.grants),
    ['profissionalAgendaDiaria'],
  );
});

void test('a disclosed field the page grant does not allow is not fixed by another page', () => {
  const request = coreControllerRequest();
  const consultas = request.contracts.find(item => item.pageId === 'consultas');
  assert.ok(consultas);
  const index = request.routes.filter(item => item.page === 'consultas').findIndex(item => item.usecaseRef === 'listConsulta');
  consultas.source = consultas.source.replace(
    `export type Out${index} = { id: string; status: string }[];`,
    `export type Out${index} = { id: string; status: string; attendanceNote: string }[];`,
  );
  const build = buildD1Controllers(request);
  const row = handler(build.controllers.flatMap(item => item.handlers), 'agendaClinica.consultas.qryListConsulta');
  assert.deepEqual(row.projection.fields, ['id', 'status', 'attendanceNote']);
  assert.deepEqual(row.grantIds, ['recepcionistaAgendaConsultas']);
  assert.equal(build.problems.some(item => item.code === 'DISCLOSURE' && item.path.endsWith('consultas.qryListConsulta')), true);
  assert.equal(build.ok, false);
  assert.equal(build.emit.length, 0);
});

void test('a missing usecase or contract keeps the route', () => {
  const request = coreControllerRequest();
  request.usecases = request.usecases.filter(item => item.usecaseId !== 'listConsulta');
  const agenda = request.contracts.find(item => item.pageId === 'agenda');
  assert.ok(agenda);
  agenda.source = '';
  const build = buildD1Controllers(request);
  const routes = build.controllers.flatMap(item => item.handlers).map(item => item.route);
  assert.equal(routes.includes('agendaClinica.agenda.qryListConsulta'), true);
  assert.equal(routes.includes('agendaClinica.consultas.qryListConsulta'), true);
  assert.equal(build.problems.some(item => item.code === 'INVALID_REF' && item.path.endsWith('qryListConsulta')), true);
  assert.equal(build.problems.some(item => item.code === 'CONTRACT_UNBOUND' && item.path.startsWith('agendaClinica.agenda.')), true);
  assert.equal(build.ok, false);
});

void test('negatives: assertion, form identity, duplicate route, invalid symbol, stale file, no authority', () => {
  const assertion = coreControllerRequest();
  const consultas = assertion.contracts.find(item => item.pageId === 'consultas');
  assert.ok(consultas);
  consultas.source = `
    export interface Wide { id: string; attendanceNote: string; }
    export const routes = { "agendaClinica.consultas.qryListConsulta": value as Wide } as const;
  `;
  const asserted = buildD1Controllers(assertion);
  const assertedRow = handler(asserted.controllers.flatMap(item => item.handlers), 'agendaClinica.consultas.qryListConsulta');
  assert.equal(asserted.problems.some(item => item.code === 'TYPE_ASSERTION'), true);
  assert.deepEqual(assertedRow.projection.fields, []);
  assert.equal(assertedRow.outputSymbol, '');

  const form = coreControllerRequest();
  const one = form.contracts.find(item => item.pageId === 'agenda');
  assert.ok(one);
  one.source = `
    export interface In { actorId: string; }
    export interface Out { id: string; }
    export const routes = { "agendaClinica.agenda.qryListConsulta": { input: "In", output: "Out" } } as const;
  `;
  const formed = buildD1Controllers(form);
  const formedRow = handler(formed.controllers.flatMap(item => item.handlers), 'agendaClinica.agenda.qryListConsulta');
  assert.equal(formed.problems.some(item => item.code === 'FORM_IDENTITY' && item.message.includes('actorId')), true);
  assert.equal(formedRow.session, 'verified');

  const duplicate = coreControllerRequest();
  duplicate.routes.push({ ...duplicate.routes[0] });
  const duplicated = buildD1Controllers(duplicate);
  assert.equal(duplicated.problems.some(item => item.code === 'DUPLICATE_ROUTE'), true);
  assert.equal(duplicated.controllers.flatMap(item => item.handlers).filter(item => item.route === duplicate.routes[0].route).length, 2);

  const missing = coreControllerRequest();
  const contract = missing.contracts.find(item => item.pageId === 'consultas');
  assert.ok(contract);
  const index = missing.routes.filter(item => item.page === 'consultas').findIndex(item => item.usecaseRef === 'listConsulta');
  contract.source = contract.source.replace(`output: "Out${index}"`, 'output: "MissingOut"');
  const unresolved = buildD1Controllers(missing);
  assert.equal(unresolved.problems.some(item => item.code === 'INVALID_REF' && item.message.includes('MissingOut')), true);
  assert.equal(unresolved.controllers.flatMap(item => item.handlers).some(item => item.route.endsWith('consultas.qryListConsulta')), true);

  const stale = coreControllerRequest();
  stale.existing = [{
    pageId: 'agenda',
    routes: ['agendaClinica.agenda.qryGhost'],
    handlers: [],
    unreadable: false,
  }];
  const staled = buildD1Controllers(stale);
  assert.equal(staled.problems.some(item => item.code === 'STALE_ARTIFACT' && item.message.includes('qryGhost')), true);
  assert.deepEqual(staled.controllers.find(item => item.pageId === 'agenda')?.staleRoutes, ['agendaClinica.agenda.qryGhost']);
  assert.equal(staled.emit.length, 0);

  const open = coreControllerRequest();
  const agenda = open.pages.find(item => item.pageId === 'agenda');
  assert.ok(agenda);
  agenda.actors = [];
  const unauthorised = buildD1Controllers(open);
  assert.equal(unauthorised.problems.some(item => item.code === 'AUTHORITY_REQUIRED' && item.message.includes('No permissive fallback')), true);
  assert.deepEqual(handler(unauthorised.controllers.flatMap(item => item.handlers), 'agendaClinica.agenda.qryListConsulta').grantIds, []);
  assert.equal(unauthorised.ok, false);
});

void test('an update keeps the done handlers of the same page', () => {
  const request: D1ControllerRequest = coreControllerRequest();
  const daily = request.grants.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.ok(daily);
  request.grants.push({ ...daily, grantId: 'profissionalAgendaExtra' });
  const done = request.routes.find(item => item.route === 'agendaClinica.agenda.qryListConsulta');
  assert.ok(done);
  done.status = 'done';
  request.existing = [{
    pageId: 'agenda',
    routes: [done.route],
    handlers: [{ route: done.route, kind: 'query', usecaseId: 'listConsulta', grantIds: ['profissionalAgendaDiaria'] }],
    unreadable: false,
  }];
  const build = buildD1Controllers(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const kept = handler(build.controllers.flatMap(item => item.handlers), done.route);
  const fresh = handler(build.controllers.flatMap(item => item.handlers), 'agendaClinica.agenda.cmdRegistrarAtendimento');
  assert.equal(kept.preserved, true);
  assert.deepEqual(kept.grantIds, ['profissionalAgendaDiaria']);
  assert.equal(fresh.preserved, false);
  assert.deepEqual(fresh.grantIds, ['profissionalAgendaDiaria', 'profissionalAgendaExtra']);
  const agenda = build.emit.find(item => item.definition.artifactId === 'agenda');
  const data = agenda?.definition.data as { handlers: Array<{ route: string; grantIds: string[] }> };
  assert.equal(data.handlers.length, 2);
  assert.deepEqual(data.handlers.find(item => item.route === done.route)?.grantIds, ['profissionalAgendaDiaria']);
});

void test('removing one route keeps the other routes and does not drop the controller', () => {
  const request: D1ControllerRequest = coreControllerRequest();
  const agenda = request.routes.filter(route => route.page === 'agenda');
  assert.ok(agenda.length >= 2);
  const dropped = agenda[0];
  request.routes = request.routes.filter(route => route.route !== dropped.route);
  request.removedRoutes = [{
    route: dropped.route,
    pageId: 'agenda',
    defPath: `l1/${request.moduleName}/layer_1_external/adapters/http/controllers/agenda.defs.ts`,
    contentHash: `sha256:${'ab'.repeat(32)}`,
  }];
  const build = buildD1Controllers(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const handlers = build.controllers.find(item => item.pageId === 'agenda')?.handlers || [];
  assert.equal(handlers.some(handler => handler.route === dropped.route), false);
  assert.ok(handlers.length >= 1);
  assert.equal(build.removals.length, 0);
  assert.equal(build.emit.some(item => item.definition.artifactId === 'agenda'), true);

  const gone = coreControllerRequest();
  const removed = gone.routes.filter(route => route.page === 'agenda');
  gone.routes = gone.routes.filter(route => route.page !== 'agenda');
  gone.removedRoutes = removed.map(route => ({
    route: route.route,
    pageId: 'agenda',
    defPath: `l1/${gone.moduleName}/layer_1_external/adapters/http/controllers/agenda.defs.ts`,
    contentHash: `sha256:${'cd'.repeat(32)}`,
  }));
  const empty = buildD1Controllers(gone);
  assert.equal(empty.ok, true, empty.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(empty.emit.some(item => item.definition.artifactId === 'agenda'), false);
  assert.equal(empty.removals.length, 1);
  assert.match(empty.removals[0].outputTs[0] || '', /agenda\.ts$/);
  assert.ok(empty.emit.some(item => item.definition.artifactId !== 'agenda'));
});

void test('fieldsOnly narrows a container to the disclosed sub-path', () => {
  const patient = `{
    id: string;
    version: number;
    details: {
      identification: { name: string; docType: "SSN" | "Other" };
      base: { notes: string; aliases: Array<string> };
    };
  }`;
  const allowed = coreControllerRequest();
  rewriteOutput(allowed, 'agendaClinica.pacientes.qryListPaciente', patient);
  const listed = buildD1Controllers(allowed);
  assert.equal(listed.ok, true, listed.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(listed.problems.some(item => item.code === 'DISCLOSURE'), false);
  assert.equal(listed.problems.some(item => item.code === 'ACCESS_ANCHOR' && item.severity === 'review'), true);
  const row = handler(listed.controllers.flatMap(item => item.handlers), 'agendaClinica.pacientes.qryListPaciente');
  assert.deepEqual(row.grantIds, ['recepcionistaCadastroPacientes']);
  assert.deepEqual(row.projection.fields, ['id', 'version', 'details.identification', 'details.base']);

  const branch = coreControllerRequest();
  rewriteOutput(branch, 'agendaClinica.consultas.qryListProfissional', `{
    id: string;
    version: number;
    details: {
      identification: { name: string };
      person: { occupation: string; privacyConsent: object };
    };
  }`);
  const branched = buildD1Controllers(branch);
  assert.equal(branched.ok, true, branched.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const professional = handler(branched.controllers.flatMap(item => item.handlers), 'agendaClinica.consultas.qryListProfissional');
  assert.deepEqual(professional.grantIds, ['recepcionistaLocalizarProfissionais']);
  assert.deepEqual(professional.projection.fields, ['id', 'version', 'details.identification', 'details.person']);
  assert.equal(professional.projection.fields.includes('details.person.privacyConsent'), false);

  const leaked = coreControllerRequest();
  rewriteOutput(leaked, 'agendaClinica.pacientes.qryListPaciente', `{
    id: string;
    version: number;
    details: {
      identification: { name: string };
      base: { notes: string };
      person: { privacyConsent: object };
    };
  }`);
  const blocked = buildD1Controllers(leaked);
  const blockedRow = handler(blocked.controllers.flatMap(item => item.handlers), 'agendaClinica.pacientes.qryListPaciente');
  assert.equal(blocked.ok, false);
  assert.equal(blockedRow.projection.fields.includes('details'), false);
  assert.equal(blockedRow.projection.fields.includes('details.person.privacyConsent'), true);
  assert.equal(blocked.problems.some(item => item.code === 'DISCLOSURE' && item.message.includes('details.person.privacyConsent')), true);
  assert.equal(blocked.emit.length, 0);

  const whole = coreControllerRequest();
  rewriteOutput(whole, 'agendaClinica.cadastro_profissional.cmdCreateProfissional', `{
    id: string;
    version: number;
    details: { person: { privacyConsent: object } };
  }`);
  const released = buildD1Controllers(whole);
  assert.equal(released.ok, true, released.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const own = handler(released.controllers.flatMap(item => item.handlers), 'agendaClinica.cadastro_profissional.cmdCreateProfissional');
  assert.deepEqual(own.grantIds, ['profissionalProprioCadastro']);
  assert.deepEqual(own.projection.fields, ['id', 'version', 'details']);
  assert.equal(released.problems.some(item => item.code === 'DISCLOSURE'), false);

  const homonym = coreControllerRequest();
  rewriteOutput(homonym, 'agendaClinica.pacientes.qryListPaciente', '{ identification: string }');
  const loose = buildD1Controllers(homonym);
  const looseRow = handler(loose.controllers.flatMap(item => item.handlers), 'agendaClinica.pacientes.qryListPaciente');
  assert.deepEqual(looseRow.projection.fields, ['identification']);
  assert.equal(loose.problems.some(item => item.code === 'DISCLOSURE' && item.path.endsWith('pacientes.qryListPaciente') && item.message.includes('identification')), true);
  assert.equal(loose.ok, false);
});

void test('an unclosed exported interface is CONTRACT_UNPARSED', () => {
  const request = coreControllerRequest();
  const agenda = request.contracts.find(item => item.pageId === 'agenda');
  assert.ok(agenda);
  agenda.source = 'export interface Broken { id: string';
  const build = buildD1Controllers(request);
  const problem = build.problems.find(item => item.code === 'CONTRACT_UNPARSED');
  assert.equal(problem?.path, agenda.path);
  assert.match(problem?.message || '', /Broken/);
  assert.equal(build.ok, false);
  assert.equal(build.emit.length, 0);
});

function rewriteOutput(request: D1ControllerRequest, routeId: string, body: string): void {
  const route = request.routes.find(item => item.route === routeId);
  assert.ok(route, routeId);
  const contract = request.contracts.find(item => item.pageId === route.page);
  assert.ok(contract);
  const index = request.routes.filter(item => item.page === route.page).findIndex(item => item.route === routeId);
  const name = `Out${index}`;
  const list = route.kind === 'qry' || route.kind === 'query';
  const current = list ? `export type ${name} = { id: string }[];` : `export interface ${name} { id: string }`;
  assert.equal(contract.source.includes(current), true, current);
  const next = list ? `export type ${name} = ${body}[];` : `export interface ${name} ${body}`;
  contract.source = contract.source.replace(current, next);
}

function handler(handlers: D1HandlerBinding[], route: string): D1HandlerBinding {
  const found = handlers.find(item => item.route === route);
  assert.ok(found, route);
  return found;
}

function handlersOf(build: D1ControllerBuild, route: string): string[] {
  for (const item of build.emit) {
    const data = item.definition.data as { handlers?: Array<{ route?: string; grantIds?: string[] }> };
    const found = data.handlers?.find(handler => handler.route === route);
    if (found) return [...(found.grantIds || [])];
  }
  assert.fail(route);
}
