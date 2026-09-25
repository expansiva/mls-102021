/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/behavior.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/context/context.js';
import { planMaterialization } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { decideProfile } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import type { HandlerCall } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { shouldCallModel } from '/_102021_/l2/agentMaterializeL1/run/model.js';
import type { SimulatedUnit } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import { verifyBatch } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import { behaviorNeedsLlm, caseBlock, emitBehavior, withoutCreateChecks, withoutPayloadChecks, withoutStorageChecks, withoutVersionChecks } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { createMemoryDataRuntime } from '/_102034_/l1/mdm/layer_1_external/data/memory/MdmDataRuntimeMemory.js';
import { runBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { AGENDA_CLINICA_F35E28A } from '/_102021_/l2/agentDefsL1/fixtures/agendaClinica-f35e28a/root.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const CATALOG_REF = 'catalog.json';
const CATALOG = readFileSync(join(HERE, '../../testing/catalogFixture.json'), 'utf8');
const FIXTURES = loadFixtures(join(HERE, '../structure/fixtures'));

void test('lote 1 usecases derive the storage constraint and leave pending rules out', async () => {
  const usecase = handlerFor('usecase', 'implement');
  assert.equal(usecase?.needsLlm, false);
  assert.equal(shouldCallModel('implement', usecase), false);
  assert.equal(handlerFor('table', 'implement'), null);
  assert.equal(behaviorNeedsLlm(definitionFor('createConsulta')), false);
  assert.equal(behaviorNeedsLlm(definitionFor('listConsulta')), false);
  assert.equal(behaviorNeedsLlm(definitionFor('registrarAtendimento')), false);
  assert.equal(behaviorNeedsLlm(definitionFor('confirmarConsulta')), false);
  assert.equal(behaviorNeedsLlm(definitionFor('registrarFalta')), false);
  assert.equal(behaviorNeedsLlm(definitionFor('listPaciente')), false);
  assert.equal(behaviorNeedsLlm(definitionFor('createPaciente')), false);
  assert.equal(behaviorNeedsLlm(definitionFor('updateProfissional')), false);
  const archived = definitionFor('listPaciente');
  const odd: M1Definition = { ...archived, data: { ...archived.data, operation: 'archive', ports: ['Missing'], mdm: {} } };
  assert.equal(behaviorNeedsLlm(odd), true);

  const create = await runBehavior(callFor('createConsulta'));
  const list = await runBehavior(callFor('listConsulta'));
  const port = await runBehavior(callFor('ConsultaRepository'));
  assert.equal(create.failure, null, create.failure?.detail);
  assert.equal(list.failure, null, list.failure?.detail);
  assert.equal(port.failure, null, port.failure?.detail);
  const createSource = sourceOf(create);
  const listSource = sourceOf(list);
  const portSource = sourceOf(port);
  assert.match(createSource, /export async function createConsulta\(/);
  assert.match(createSource, /enforce:storage/);
  assert.match(createSource, /ruleId: "uniqueProfessionalSchedule"/);
  assert.match(createSource, /ports\.consultaRepository\.create\(record\)/);
  assert.equal(createSource.includes('USECASE_NOT_IMPLEMENTED'), false);
  assert.equal(listSource.includes('professionalOwnAppointment'), false);
  assert.match(listSource, /return found;/);
  assert.match(portSource, /createMemoryTableRepository/);
  assert.match(portSource, /export function resetMemory/);
  assert.equal(portSource.includes("from 'pg'"), false);
  assert.equal(port.runsStub, false);
  assert.equal(create.runsStub, false);

  const outsideCall = callFor('listPaciente');
  outsideCall.definition = odd;
  const outside = await runBehavior(outsideCall);
  assert.equal(outside.failure?.code, 'NEEDS_LLM');
  assert.deepEqual(outside.files, {});
  const fakedCall = callFor('listPaciente', 'export const modelBody = 1;\n');
  fakedCall.definition = odd;
  const faked = await runBehavior(fakedCall);
  assert.equal(faked.failure, null, faked.failure?.detail);
  assert.match(sourceOf(faked), /modelBody/);

  const problems = compile([
    ['consulta.ts', sourceOf(await runBehavior(callFor('Consulta')))],
    ['consultaRepository.ts', portSource],
    ['createConsulta.ts', createSource],
    ['listConsulta.ts', listSource],
  ]);
  assert.equal(problems, '', problems);
});

void test('implement checkpoint keeps the business assertion and blocks the open gaps', async () => {
  const handler = handlerFor('usecase', 'implement');
  assert.ok(handler);
  const create = await runBehavior(callFor('createConsulta'));
  const list = await runBehavior(callFor('listConsulta'));
  const created = await verifyBatch({
    handler,
    io: { async read(ref) { return ref === CATALOG_REF ? CATALOG : null; } },
    catalogRef: CATALOG_REF,
    artifactId: 'createConsulta',
    observations: create.observations,
    runId: 'm1-06',
    commit: 'proof',
    startedAt: '2026-09-25T12:00:00.000Z',
    finishedAt: '2026-09-25T12:00:01.000Z',
    monitorError: null,
  });
  assert.equal(created.accepted, true, created.nextAction);
  assert.equal(created.counts.passed, 3);
  assert.equal(created.counts.expectedRed, 0);
  assert.equal(created.ready, true);

  const listed = await verifyBatch({
    handler,
    io: { async read(ref) { return ref === CATALOG_REF ? CATALOG : null; } },
    catalogRef: CATALOG_REF,
    artifactId: 'listConsulta',
    observations: list.observations,
    runId: 'm1-06',
    commit: 'proof',
    startedAt: '2026-09-25T12:00:00.000Z',
    finishedAt: '2026-09-25T12:00:01.000Z',
    monitorError: null,
  });
  const byId = new Map(listed.evidence.map(item => [item.caseId, item.verdict]));
  assert.equal(byId.get('listConsulta.compile'), 'passed');
  assert.equal(byId.get('listConsulta.lists'), 'blocked');
  assert.equal(byId.get('listConsulta.ownAppointments'), 'blocked');
  assert.equal(byId.get('listConsulta.receptionistProjection'), 'passed');
  assert.equal(listed.accepted, false);
  assert.equal(listed.ready, false);
  assert.match(listed.evidence.find(item => item.caseId === 'listConsulta.lists')?.detail ?? '', /x1_04/);
  assert.match(listed.evidence.find(item => item.caseId === 'listConsulta.ownAppointments')?.detail ?? '', /toPlanner/);
});

void test('behavior sources do not name the clinic fixture', () => {
  const banned = /agendaClinica|Consulta|professional|scheduledAt|uniqueProfessionalSchedule/;
  for (const name of ['emitBehavior.ts', 'runners.ts']) {
    const source = readFileSync(join(HERE, name), 'utf8');
    assert.equal(banned.test(source), false, name);
  }
});

void test('renamed fixture ids still enforce the storage constraint', async () => {
  const rewritten = rewriteFixture();
  const create = definitionAt(rewritten, 'createVisita');
  const port = definitionAt(rewritten, 'VisitaRepository');
  const list = definitionAt(rewritten, 'listVisita');
  assert.ok(create && port && list);
  const read = async (ref: string) => rewritten.get(ref) ?? null;
  const emitted = await emitBehavior('implement.usecase', create.definition, 'l1/visitaBook/createVisita.ts', read);
  const emittedPort = await emitBehavior('implement.repositoryPort', port.definition, 'l1/visitaBook/visitaRepository.ts', read);
  assert.equal('code' in emitted, false, 'code' in emitted ? emitted.detail : '');
  assert.equal('code' in emittedPort, false, 'code' in emittedPort ? emittedPort.detail : '');
  if ('code' in emitted || 'code' in emittedPort) return;
  assert.match(emitted.source, /agentId/);
  assert.match(emitted.source, /ruleId: "r1"/);
  assert.match(emitted.source, /visitaRepository/);
  assert.equal(/agendaClinica|Consulta|professionalId|uniqueProfessionalSchedule/.test(emitted.source), false);
  const blockedList = await caseBlock(list.definition, list.defPath, {
    routine: 'visitaBook.consultas_profissional.qryListVisita',
    expect: { ruleId: null },
  }, read);
  const blockedOwn = await caseBlock(list.definition, list.defPath, {
    routine: 'visitaBook.consultas_profissional.qryListVisita',
    expect: { ruleId: 'professionalOwnAppointment' },
  }, read);
  assert.equal(blockedList?.gap, 'ACCESS_ANCHOR');
  assert.equal(blockedOwn?.gap, 'APPLICABILITY_UNDECLARED');

  const dir = join(ROOT, `.m1-06-rename-${process.pid}`);
  const usecaseFile = join(dir, 'createVisita.ts');
  const portFile = join(dir, 'visitaRepository.ts');
  mkdirSync(dir, { recursive: true });
  writeFileSync(usecaseFile, emitted.source);
  writeFileSync(portFile, emittedPort.source);
  const loaded = await import(pathToFileURL(usecaseFile).href) as { createVisita: (input: Record<string, string>, ctx: unknown, ports: Record<string, unknown>) => Promise<Record<string, string>> };
  const memory = await import(pathToFileURL(portFile).href) as { resetMemory: (seed?: Record<string, unknown>[]) => void; pendingVisitaRepository: unknown };
  const input = { patientId: 'p1', agentId: 'agent-1', scheduledAt: '2026-09-25T13:00:00.000Z', status: 'scheduled' };
  const ctx = { idGenerator: { newId: () => 'row-1' }, sessionContext: { actorId: 'actor-1' } };
  const ports = { visitaRepository: memory.pendingVisitaRepository };
  memory.resetMemory([]);
  const saved = await loaded.createVisita(input, ctx, ports);
  assert.equal(saved.agentId, 'agent-1');
  memory.resetMemory([saved]);
  await assert.rejects(
    () => loaded.createVisita(input, { idGenerator: { newId: () => 'row-2' }, sessionContext: { actorId: 'actor-1' } }, ports),
    (error: { code?: string; details?: { ruleId?: string } }) => error.code === 'CONFLICT' && error.details?.ruleId === 'r1',
  );
  const disabled = withoutStorageChecks(emitted.source);
  assert.equal(disabled.removed, 1);
  const openFile = join(dir, 'createVisitaOpen.ts');
  writeFileSync(openFile, disabled.source);
  const opened = await import(pathToFileURL(openFile).href) as typeof loaded;
  memory.resetMemory([saved]);
  const second = await opened.createVisita(input, { idGenerator: { newId: () => 'row-3' }, sessionContext: { actorId: 'actor-1' } }, ports);
  assert.equal(second.agentId, 'agent-1');
  rmSync(dir, { recursive: true, force: true });

  const units = [...FIXTURES.values()].map(item => ({ defPath: item.defPath, definition: item.definition }));
  const planned = await planMaterialization({
    stage: 'implement',
    units,
    readable: [...units.flatMap(item => [item.defPath, ...item.definition.dependencies]), ...Object.values(PLATFORM_FILES)],
    extraArtifacts: units.map(item => ({
      artifactType: item.definition.artifactType,
      artifactId: item.definition.artifactId,
      defPath: item.defPath,
    })),
  });
  const created = planned.units.find(unit => unit.artifactId === 'createConsulta');
  const transition = planned.units.find(unit => unit.artifactId === 'registrarAtendimento');
  assert.equal(created?.action, 'generate', created?.reason);
  assert.equal(created?.needsLlm, false, created?.reason);
  assert.equal(transition?.action, 'generate', transition?.reason);
  assert.equal(transition?.needsLlm, false, transition?.reason);
});

void test('a transition enforces lifecycle and a required payload, and leaves the anchor rule out', async () => {
  const attend = await runBehavior(callFor('registrarAtendimento'));
  const confirm = await runBehavior(callFor('confirmarConsulta'));
  const missed = await runBehavior(callFor('registrarFalta'));
  const port = await runBehavior(callFor('ConsultaRepository'));
  assert.equal(attend.failure, null, attend.failure?.detail);
  assert.equal(confirm.failure, null, confirm.failure?.detail);
  assert.equal(missed.failure, null, missed.failure?.detail);
  const attendSource = sourceOf(attend);
  const confirmSource = sourceOf(confirm);
  assert.match(attendSource, /enforce:lifecycle/);
  assert.match(attendSource, /enforce:payload/);
  assert.match(attendSource, /ruleId: "attendanceNoteRequired"/);
  assert.match(attendSource, /ruleId: "consultationTransitionFlow"/);
  assert.equal(attendSource.includes('professionalOwnAppointment'), false);
  assert.match(attendSource, /undelivered/);
  assert.equal(attendSource.includes('publish'), false);
  assert.match(confirmSource, /enforce:lifecycle/);
  assert.equal(confirmSource.includes('enforce:payload'), false);
  const anchor = await caseBlock(definitionFor('registrarAtendimento'), callFor('registrarAtendimento').unit.defPath, {
    routine: 'agendaClinica.consultas_profissional.cmdRegistrarAtendimento',
    expect: { ruleId: 'professionalOwnAppointment' },
  }, read);
  const note = await caseBlock(definitionFor('registrarAtendimento'), callFor('registrarAtendimento').unit.defPath, {
    routine: 'agendaClinica.consultas_profissional.cmdRegistrarAtendimento',
    expect: { ruleId: 'attendanceNoteRequired' },
  }, read);
  const version = await caseBlock(definitionFor('registrarAtendimento'), callFor('registrarAtendimento').unit.defPath, {
    routine: 'agendaClinica.consultas_profissional.cmdRegistrarAtendimento',
    expect: { ruleId: 'expectedVersion' },
  }, read);
  assert.equal(anchor?.gap, 'ACCESS_ANCHOR');
  assert.equal(note, null);
  assert.equal(version?.gap, 'PRECONDITION_UNDECLARED');
  assert.equal(version?.owner, 'x1_05');
  const handler = handlerFor('usecase', 'implement');
  assert.ok(handler);
  const reported = await verifyBatch({
    handler,
    io: { async read(ref) { return ref === CATALOG_REF ? CATALOG : null; } },
    catalogRef: CATALOG_REF,
    artifactId: 'registrarAtendimento',
    observations: attend.observations,
    runId: 'm1-06',
    commit: 'proof',
    startedAt: '2026-09-25T12:00:00.000Z',
    finishedAt: '2026-09-25T12:00:01.000Z',
    monitorError: null,
  });
  const verdicts = new Map(reported.evidence.map(item => [item.caseId, item.verdict]));
  assert.equal(verdicts.get('registrarAtendimento.compile'), 'passed');
  assert.equal(verdicts.get('registrarAtendimento.noteRequired'), 'passed');
  assert.equal(verdicts.get('registrarAtendimento.invalidTransition'), 'passed');
  assert.equal(verdicts.get('registrarAtendimento.staleVersion'), 'blocked');
  assert.equal(reported.counts.failed, 0);

  const dir = join(ROOT, `.m1-06-transition-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const portFile = join(dir, 'consultaRepository.ts');
  const attendFile = join(dir, 'registrarAtendimento.ts');
  const confirmFile = join(dir, 'confirmarConsulta.ts');
  writeFileSync(portFile, sourceOf(port));
  writeFileSync(attendFile, attendSource);
  writeFileSync(confirmFile, confirmSource);
  const problems = compile([
    ['consulta.ts', sourceOf(await runBehavior(callFor('Consulta')))],
    ['consultaRepository.ts', sourceOf(port)],
    ['registrarAtendimento.ts', attendSource],
    ['confirmarConsulta.ts', confirmSource],
    ['registrarFalta.ts', sourceOf(missed)],
  ]);
  assert.equal(problems, '', problems);
  const memory = await import(pathToFileURL(portFile).href) as {
    resetMemory: (seed?: Record<string, unknown>[]) => void;
    pendingConsultaRepository: unknown;
  };
  const attended = await import(pathToFileURL(attendFile).href) as {
    registrarAtendimento: (input: Record<string, unknown>, ctx: unknown, ports: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  const confirmed = await import(pathToFileURL(confirmFile).href) as {
    confirmarConsulta: (input: Record<string, unknown>, ctx: unknown, ports: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  const ports = { consultaRepository: memory.pendingConsultaRepository };
  const ctx = {};
  const row = {
    id: 'consulta-1',
    version: 2,
    patientId: 'patient-1',
    professionalId: 'professional-1',
    scheduledAt: '2026-09-25T13:00:00.000Z',
    status: 'scheduled',
    details: { attendanceNote: '' },
  };
  memory.resetMemory([row]);
  await assert.rejects(
    () => attended.registrarAtendimento({ id: 'consulta-1', details: { attendanceNote: '' } }, ctx, ports),
    (error: { code?: string; details?: { ruleId?: string } }) => error.code === 'VALIDATION_ERROR' && error.details?.ruleId === 'attendanceNoteRequired',
  );
  memory.resetMemory([{ ...row, status: 'noShow', details: { attendanceNote: 'seen' } }]);
  await assert.rejects(
    () => attended.registrarAtendimento({ id: 'consulta-1', details: { attendanceNote: 'seen' } }, ctx, ports),
    (error: { code?: string; details?: { ruleId?: string } }) => error.code === 'VALIDATION_ERROR' && error.details?.ruleId === 'consultationTransitionFlow',
  );
  memory.resetMemory([row]);
  const saved = await attended.registrarAtendimento({ id: 'consulta-1', details: { attendanceNote: 'seen' } }, ctx, ports);
  assert.equal(saved.status, 'attended');
  assert.equal((saved.details as { attendanceNote?: string }).attendanceNote, 'seen');
  const opened = withoutPayloadChecks(attendSource);
  assert.equal(opened.removed, 1);
  const openFile = join(dir, 'registrarAtendimentoOpen.ts');
  writeFileSync(openFile, opened.source);
  const openAttend = await import(pathToFileURL(openFile).href) as typeof attended;
  memory.resetMemory([row]);
  const withoutNote = await openAttend.registrarAtendimento({ id: 'consulta-1', details: {} }, ctx, ports);
  assert.equal(withoutNote.status, 'attended');
  memory.resetMemory([row]);
  const confirmedRow = await confirmed.confirmarConsulta({ id: 'consulta-1' }, ctx, ports);
  assert.equal(confirmedRow.status, 'confirmed');
  memory.resetMemory([{ ...row, status: 'attended' }]);
  await assert.rejects(
    () => confirmed.confirmarConsulta({ id: 'consulta-1' }, ctx, ports),
    (error: { code?: string; details?: { ruleId?: string } }) => error.code === 'VALIDATION_ERROR' && error.details?.ruleId === 'consultationTransitionFlow',
  );
  rmSync(dir, { recursive: true, force: true });
});

void test('mdm create attaches an existing record and update rejects a stale version', async () => {
  const created = await runBehavior(callFor('createPaciente'));
  const updated = await runBehavior(callFor('updateProfissional'));
  const listed = await runBehavior(callFor('listPaciente'));
  assert.equal(created.failure, null, created.failure?.detail);
  assert.equal(updated.failure, null, updated.failure?.detail);
  assert.equal(listed.failure, null, listed.failure?.detail);
  const createSource = sourceOf(created);
  const updateSource = sourceOf(updated);
  assert.match(createSource, /enforce:create/);
  assert.match(createSource, /findByDocument/);
  assert.match(createSource, /attachRole/);
  assert.match(updateSource, /enforce:version/);
  assert.match(updateSource, /readPath\(body, "version"\)/);
  assert.match(sourceOf(listed), /listByType/);
  const openCreate = withoutCreateChecks(createSource);
  const openUpdate = withoutVersionChecks(updateSource);
  assert.equal(openCreate.removed, 1);
  assert.equal(openUpdate.removed, 1);

  const dir = join(ROOT, `.m1-06-mdm-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const createFile = join(dir, 'createPaciente.ts');
  const updateFile = join(dir, 'updateProfissional.ts');
  const openCreateFile = join(dir, 'createPacienteOpen.ts');
  const openUpdateFile = join(dir, 'updateProfissionalOpen.ts');
  writeFileSync(createFile, createSource);
  writeFileSync(updateFile, updateSource);
  writeFileSync(openCreateFile, openCreate.source);
  writeFileSync(openUpdateFile, openUpdate.source);
  const createModule = await import(pathToFileURL(createFile).href) as {
    createPaciente: (input: Record<string, unknown>, ctx: unknown) => Promise<{ id: string }>;
  };
  const updateModule = await import(pathToFileURL(updateFile).href) as {
    updateProfissional: (input: Record<string, unknown>, ctx: unknown) => Promise<{ id: string; version: number }>;
  };
  const openCreateModule = await import(pathToFileURL(openCreateFile).href) as typeof createModule;
  const openUpdateModule = await import(pathToFileURL(openUpdateFile).href) as typeof updateModule;
  const runtime = createMemoryDataRuntime();
  const ctx = createRequestContext(runtime, { sandbox: true, moduleId: 'agendaClinica' });
  const seen: string[] = [];
  const entity = ctx.mdm.entity as unknown as Record<string, (...args: never[]) => Promise<unknown>>;
  for (const name of ['findByDocument', 'create', 'attachRole']) {
    const original = entity[name];
    entity[name] = (async (...args: never[]) => {
      seen.push(name);
      return original.apply(ctx.mdm.entity, args);
    }) as typeof original;
  }
  const input = {
    details: {
      identification: { name: 'Ada', docType: 'Passport', docId: 'DOC1', countryCode: 'US' },
      base: { aliases: ['Ada'] },
    },
  };
  const first = await createModule.createPaciente(input, ctx);
  assert.equal(seen.includes('findByDocument') && seen.includes('create') && seen.includes('attachRole'), true);
  const before = seen.filter(name => name === 'create').length;
  const second = await createModule.createPaciente(input, ctx);
  assert.equal(second.id, first.id);
  assert.equal(seen.filter(name => name === 'create').length, before);
  const openRuntime = createMemoryDataRuntime();
  const openCtx = createRequestContext(openRuntime, { sandbox: true, moduleId: 'agendaClinica' });
  const openSeen: string[] = [];
  const openEntity = openCtx.mdm.entity as unknown as Record<string, (...args: never[]) => Promise<unknown>>;
  const openCreateFn = openEntity.create;
  openEntity.create = (async (...args: never[]) => {
    openSeen.push('create');
    return openCreateFn.apply(openCtx.mdm.entity, args);
  }) as typeof openCreateFn;
  await openCreateModule.createPaciente(input, openCtx);
  await openCreateModule.createPaciente(input, openCtx);
  assert.equal(openSeen.length, 2);

  const seeded = await ctx.mdm.entity.create({
    details: { subtype: 'Person', name: 'Ada', countryCode: 'US', docType: 'Passport', docId: 'DOCprof' },
  });
  const patch = {
    id: seeded.mdmId,
    version: seeded.version,
    details: { identification: { name: 'Ada Updated', docType: 'Passport', docId: 'DOCprof', countryCode: 'US' }, person: { occupation: 'guide' } },
  };
  const saved = await updateModule.updateProfissional(patch, ctx);
  assert.equal(saved.id, seeded.mdmId);
  await assert.rejects(
    () => updateModule.updateProfissional(patch, ctx),
    (error: { code?: string }) => error.code === 'CONCURRENCY_CONFLICT',
  );
  const stale = await openUpdateModule.updateProfissional({ ...patch, id: saved.id, version: seeded.version }, ctx);
  assert.equal(stale.id, seeded.mdmId);
  rmSync(dir, { recursive: true, force: true });

  const hidden = await emitBehavior('implement.usecase', definitionFor('updateProfissional'), 'l1/agendaClinica/updateProfissional.ts', async ref => {
    const text = await read(ref);
    if (text === null) return null;
    if (ref.includes('/ontology/') || ref.endsWith('/mdm.defs.ts')) return text.replaceAll('"writePrecondition": true', '"writePrecondition": false');
    return text;
  });
  assert.equal('code' in hidden, false);
  if (!('code' in hidden)) {
    assert.match(hidden.source, /PRECONDITION_UNDECLARED/);
    assert.equal(hidden.source.includes('enforce:version'), false);
  }
});

function definitionFor(artifactId: string): M1Definition {
  return callFor(artifactId).definition as M1Definition;
}

function rewriteFixture(): Map<string, string> {
  const map = new Map<string, string>();
  const extras = [
    '_102047_/l4/agendaClinica/ontology/Consulta.defs.ts',
    '_102047_/l4/agendaClinica/rules.defs.ts',
    '_102047_/l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts',
    '_102047_/l2/agendaClinica/web/contracts/consultas_profissional.defs.ts',
    '_102047_/l2/agendaClinica/web/contracts/pacientes.defs.ts',
    '_102047_/l2/agendaClinica/web/contracts/profissionais.defs.ts',
  ];
  const sources = [...FIXTURES.values()].map(item => ({ key: '', text: item.text }));
  for (const ref of extras) {
    const match = /^_(\d+)_\/(.+)$/.exec(ref);
    if (!match) continue;
    const disk = match[1] === '102047' ? join(AGENDA_CLINICA_F35E28A, match[2]) : join(ROOT, `mls-${match[1]}`, match[2]);
    sources.push({ key: ref, text: readFileSync(disk, 'utf8') });
  }
  for (const source of sources) {
    const rewritten = source.text
      .replaceAll('uniqueProfessionalSchedule', 'r1')
      .replaceAll('professionalId', 'agentId')
      .replaceAll('Consulta', 'Visita')
      .replaceAll('agendaClinica', 'visitaBook');
    const marked = /fileReference="([^"]+)"/.exec(rewritten);
    const key = marked?.[1] || source.key
      .replaceAll('uniqueProfessionalSchedule', 'r1')
      .replaceAll('professionalId', 'agentId')
      .replaceAll('Consulta', 'Visita')
      .replaceAll('agendaClinica', 'visitaBook');
    if (key) map.set(key, rewritten);
  }
  return map;
}

function definitionAt(map: Map<string, string>, artifactId: string): { defPath: string; definition: M1Definition } | null {
  for (const [defPath, text] of map) {
    if (!text.includes('export const definition')) continue;
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const definition = readDefinition(parsed.definition);
    if ('issues' in definition || definition.artifactId !== artifactId) continue;
    return { defPath, definition };
  }
  return null;
}

function callFor(artifactId: string, modelText: string | null = null): HandlerCall {
  const found = [...FIXTURES.values()].find(item => item.definition.artifactId === artifactId);
  if (!found) throw new Error(artifactId);
  const handler = handlerFor(found.definition.artifactType, 'implement');
  if (!handler) throw new Error(found.definition.artifactType);
  const unit: SimulatedUnit = {
    defPath: found.defPath,
    artifactType: found.definition.artifactType,
    artifactId: found.definition.artifactId,
    action: 'generate',
    reason: '',
    handlerId: handler.id,
    needsLlm: false,
    unresolved: [],
    contextRefs: [],
    blockedBy: [],
    prompt: '',
  };
  return {
    handler,
    unit,
    definition: found.definition,
    read,
    catalogRef: CATALOG_REF,
    repair: false,
    signal: new AbortController().signal,
    eventId: found.defPath,
    profile: decideProfile('development', true),
    modelText,
  };
}

async function read(ref: string): Promise<string | null> {
  if (ref === CATALOG_REF) return CATALOG;
  const fixture = FIXTURES.get(ref);
  if (fixture) return fixture.text;
  const match = /^_(\d+)_\/(.+)$/.exec(ref);
  if (!match) return null;
  try {
    if (match[1] === '102047') return readFileSync(join(AGENDA_CLINICA_F35E28A, match[2]), 'utf8');
    return readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8');
  } catch {
    return null;
  }
}

function sourceOf(outcome: { files: Record<string, string> }): string {
  return Object.values(outcome.files)[0] ?? '';
}

function compile(rows: Array<[string, string]>): string {
  const dir = join(ROOT, `.m1-06-out-${process.pid}`);
  const config = join(ROOT, `.tsconfig.m1-06-${process.pid}.json`);
  try {
    const files: string[] = [];
    for (const [name, source] of rows) {
      const full = join(dir, name);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      files.push(relative(ROOT, full));
    }
    const base = readFileSync(join(ROOT, 'tsconfig.base.json'), 'utf8');
    const paths: Record<string, string[]> = {
      '/_102047_/l1/agendaClinica/layer_3_domain/entities/*': [`./${relative(ROOT, dir)}/*`],
      '/_102047_/l1/agendaClinica/layer_2_application/ports/*': [`./${relative(ROOT, dir)}/*`],
      '/_102047_/l1/agendaClinica/layer_2_application/usecases/*': [`./${relative(ROOT, dir)}/*`],
    };
    for (const id of new Set([...base.matchAll(/\/_(\d+)_\//g)].map(match => match[1]))) {
      const key = `/_${id}_/*`;
      if (!paths[key]) {
        paths[key] = id === '102047'
          ? [`./${relative(ROOT, AGENDA_CLINICA_F35E28A)}/*`]
          : [`./mls-${id}/*`];
      }
    }
    writeFileSync(config, `${JSON.stringify({
      extends: './tsconfig.base.json',
      compilerOptions: { noEmit: true, paths },
      files: files.map(file => `./${file}`),
    }, null, 2)}\n`);
    const tsc = join(ROOT, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '-p', config, '--pretty', 'false'], { cwd: ROOT, encoding: 'utf8' });
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').filter(line => line.includes('.m1-06-out')).join('\n').trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(config, { force: true });
  }
}

function loadFixtures(dir: string): Map<string, { defPath: string; text: string; definition: M1Definition }> {
  const map = new Map<string, { defPath: string; text: string; definition: M1Definition }>();
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.defs.ts')) {
        const text = readFileSync(path, 'utf8');
        const parsed = parseDefinitionSource(text);
        if (!('definition' in parsed)) throw new Error(parsed.issues.join('; '));
        const definition = readDefinition(parsed.definition);
        if ('issues' in definition) throw new Error(`${path} ${definition.issues.join('; ')}`);
        const marked = /fileReference="([^"]+)"/.exec(text);
        const defPath = marked?.[1] ?? '';
        if (!defPath) throw new Error(`no file reference in ${path}`);
        map.set(defPath, { defPath, text, definition });
      }
    }
  };
  walk(dir);
  return map;
}
