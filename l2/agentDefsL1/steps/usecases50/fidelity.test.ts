/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/fidelity.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { parseRendered, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { fileKey, installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { readL1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import type { D1UsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { coreUsecaseRequest, fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { readUsecaseFidelity, type FidelityFile, type UsecaseBehavior } from '/_102021_/l2/agentDefsL1/steps/usecases50/fidelity.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';

const NOTE = 'Completing attendance requires a note.';
const RULES = 'l4/agendaClinica/rules.defs.ts';
const INTEGRATION = 'l4/agendaClinica/integration.defs.ts';

function defs(name: string, body: string): string {
  return `export const ${name} = ${body} as const;\n`;
}

function focused(): { request: D1UsecaseRequest; files: FidelityFile[] } {
  const request = coreUsecaseRequest();
  const keep: Array<[string, string]> = [
    ['registrarAtendimento', 'agendaClinica.agenda.cmdRegistrarAtendimento'],
    ['listConsulta', 'agendaClinica.consultas.qryListConsulta'],
    ['updateProfissional', 'agendaClinica.cadastro_profissional.cmdUpdateProfissional'],
  ];
  request.usecases = keep.map(([usecaseId, route]) => {
    const usecase = request.usecases.find(item => item.usecaseId === usecaseId);
    if (!usecase) throw new Error(usecaseId);
    usecase.routes = [route];
    return usecase;
  });
  request.routes = request.routes.filter(route => keep.some(([, id]) => id === route.route));
  const consulta = request.entities.find(item => item.entityId === 'Consulta');
  const transition = consulta?.transitions.find(item => item.transitionId === 'registrarAtendimento');
  if (!transition) throw new Error('registrarAtendimento');
  transition.payload = ['details.attendanceNote'];
  const profissional = request.entities.find(item => item.entityId === 'Profissional');
  if (!profissional) throw new Error('Profissional');
  profissional.capabilities = ['edit.platformFields'];
  profissional.platformFields = ['details.identification.name'];
  profissional.fields = [
    { name: 'id', type: 'uuid', derived: true },
    { name: 'version', type: 'integer', derived: true },
  ];
  request.contracts = [
    {
      pageId: 'agenda',
      path: 'l2/agendaClinica/web/contracts/agenda.defs.ts',
      source: `
        export interface In { id: string }
        export interface Out { id: string }
        export const routes = { "agendaClinica.agenda.cmdRegistrarAtendimento": { input: "In", output: "Out" } } as const;
      `,
    },
    {
      pageId: 'consultas',
      path: 'l2/agendaClinica/web/contracts/consultas.defs.ts',
      source: `
        export interface ListConsultaInput { id: string }
        export interface ListConsultaOutput { id: string; status: string }
        export const routes = { "agendaClinica.consultas.qryListConsulta": { input: "ListConsultaInput", output: "ListConsultaOutput" } } as const;
      `,
    },
    {
      pageId: 'cadastro_profissional',
      path: 'l2/agendaClinica/web/contracts/cadastro_profissional.defs.ts',
      source: `
        export interface UpdateProfissionalInput { id: string; version: number; name: string }
        export interface UpdateProfissionalOutput { id: string; version: number }
        export const routes = { "agendaClinica.cadastro_profissional.cmdUpdateProfissional": { input: "UpdateProfissionalInput", output: "UpdateProfissionalOutput" } } as const;
      `,
    },
  ];
  request.plans = request.usecases.map(usecase => fixturePlan(request, usecase));
  const files: FidelityFile[] = [
    {
      path: 'l4/agendaClinica/ontology/Consulta.defs.ts',
      text: defs('consulta', JSON.stringify({
        entityId: 'Consulta',
        kind: 'entity',
        storage: { target: 'moduleDatabase' },
        record: { fields: { id: { type: 'uuid', derived: true } } },
        transitions: [{
          transitionId: 'registrarAtendimento',
          payload: ['details.attendanceNote'],
          ruleRefs: ['consultationTransitionFlow', 'attendanceNoteRequired', 'professionalOwnAppointment'],
        }],
      })),
    },
    {
      path: 'l4/agendaClinica/ontology/Profissional.defs.ts',
      text: defs('profissional', JSON.stringify({
        entityId: 'Profissional',
        kind: 'role',
        roleTag: 'agendaClinica.Profissional',
        capabilities: { 'edit.platformFields': 'Edits the platform name.' },
        record: {
          fields: {
            id: { type: 'uuid', derived: true },
            version: { type: 'integer', derived: true },
            details: {
              type: 'object',
              fields: {
                identification: {
                  type: 'object',
                  owner: 'platform',
                  fields: { name: { type: 'string' } },
                },
              },
            },
          },
        },
      })),
    },
    {
      path: RULES,
      text: defs('rules', JSON.stringify({
        rules: {
          consultationTransitionFlow: 'A scheduled consultation can move.',
          attendanceNoteRequired: NOTE,
          professionalOwnAppointment: 'A professional completes only their own consultation.',
        },
      })),
    },
    {
      path: INTEGRATION,
      text: defs('integration', JSON.stringify({
        outbound: [{ id: 'atendimentoRegistrado', event: 'atendimentoRegistrado', on: 'Consulta.registrarAtendimento' }],
      })),
    },
    ...request.contracts.map(contract => ({ path: contract.path, text: contract.source })),
  ];
  request.files = files;
  return { request, files };
}

function renderedOf(request: D1UsecaseRequest, usecaseId: string): string {
  const part = buildD1Usecases(request).emit.find(item => item.definition.artifactId === usecaseId);
  if (!part) throw new Error(usecaseId);
  const rendered = renderDefinition(part.definition, part.pipeline);
  if ('issues' in rendered) throw new Error(rendered.issues.join('\n'));
  return rendered.source;
}

function behaviorOf(source: string, files: readonly FidelityFile[]): UsecaseBehavior {
  const fidelity = readUsecaseFidelity(source, files);
  assert.equal(fidelity.problems.length, 0, fidelity.problems.map(item => `${item.code}: ${item.message}`).join('\n'));
  assert.ok(fidelity.behavior);
  return fidelity.behavior;
}

function edited(
  source: string,
  edit: (definition: { data: Record<string, unknown> }, pipeline: D1PipelineItem[]) => void,
): string {
  const parsed = parseRendered(source);
  assert.ok(parsed);
  const definition = parsed.definition as D1Definition & { data: Record<string, unknown> };
  const pipeline = parsed.pipeline as D1PipelineItem[];
  edit(definition, pipeline);
  const rendered = renderDefinition(definition, pipeline);
  assert.equal('issues' in rendered, false, 'issues' in rendered ? rendered.issues.join('\n') : '');
  if (!('source' in rendered)) throw new Error('render');
  return rendered.source;
}

void test('serialized defs recover behavior without the draft', () => {
  const { request, files } = focused();
  const planned = fixturePlan(request, request.usecases.find(item => item.usecaseId === 'registrarAtendimento')!);
  const plannedPayload = planned.steps.find(step => step.kind === 'transition');
  assert.equal(plannedPayload && plannedPayload.kind === 'transition' ? plannedPayload.payload.length : 1, 0);

  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.map(item => `${item.code}: ${item.message}`).join('\n'));
  const again = buildD1Usecases(structuredClone(request));
  assert.equal(
    again.emit.map(item => renderDefinition(item.definition, item.pipeline)).map(item => 'source' in item ? item.source : '').join('\n'),
    build.emit.map(item => renderDefinition(item.definition, item.pipeline)).map(item => 'source' in item ? item.source : '').join('\n'),
  );

  const registrar = renderedOf(request, 'registrarAtendimento');
  const list = renderedOf(request, 'listConsulta');
  const update = renderedOf(request, 'updateProfissional');
  assert.equal(registrar.includes(NOTE), false);
  assert.equal(registrar.includes('eval('), false);

  const attendance = behaviorOf(registrar, files);
  assert.equal(attendance.lifecycle?.payload.includes('details.attendanceNote'), true);
  assert.equal(attendance.sequence.some(step => step.kind === 'transition' && step.payload.includes('details.attendanceNote')), true);
  assert.equal(attendance.uses.some(use => use.path === 'id' && use.role === 'selector' && use.source === 'input'), true);
  assert.equal(attendance.uses.some(use => use.path === 'details.attendanceNote' && use.role === 'write' && use.source === 'payload'), true);
  assert.equal(attendance.rules.some(rule => rule.ruleId === 'attendanceNoteRequired' && rule.path === RULES && rule.symbol === 'attendanceNoteRequired'), true);
  assert.equal(attendance.effects.some(effect => effect.eventId === 'atendimentoRegistrado' && effect.path === INTEGRATION && effect.symbol === 'atendimentoRegistrado'), true);
  assert.equal(attendance.transaction, 'none');
  assert.equal(attendance.routes.some(route => route.route.endsWith('cmdRegistrarAtendimento') && route.outputFields.includes('id')), true);
  const parsed = parseRendered(registrar);
  const depends = (parsed?.pipeline as D1PipelineItem[] | undefined)?.[0]?.dependsFiles || [];
  assert.equal(depends.includes('l4/agendaClinica/ontology/Consulta.defs.ts'), true);
  assert.equal(depends.includes(RULES), true);
  assert.equal(depends.includes(INTEGRATION), true);
  assert.equal(depends.includes('l2/agendaClinica/web/contracts/agenda.defs.ts'), true);

  const listed = behaviorOf(list, files);
  assert.equal(listed.uses.some(use => use.path === 'id' && use.role === 'filter'), true);
  assert.deepEqual(listed.routes[0]?.outputFields, ['id', 'status']);
  assert.equal(listed.mdm, null);

  const editedProfessional = behaviorOf(update, files);
  assert.equal(editedProfessional.uses.some(use => use.path === 'id' && use.role === 'selector'), true);
  assert.equal(editedProfessional.uses.some(use => use.path === 'version' && use.role === 'concurrency'), true);
  assert.equal(editedProfessional.mdm?.calls.some(call => call.method === 'update' && call.shape === 'write'), true);
  assert.equal(editedProfessional.mdm?.calls.some(call => call.method === 'attachRole'), false);
});

void test('removing payload, a rule, an MDM call, a projection or a contract dependency fails specifically', () => {
  const { request, files } = focused();
  const registrar = renderedOf(request, 'registrarAtendimento');
  const list = renderedOf(request, 'listConsulta');
  const update = renderedOf(request, 'updateProfissional');

  const withoutPayload = edited(registrar, definition => {
    const data = definition.data as {
      lifecycle: { payload: string[] };
      sequence: Array<{ kind: string; payload?: string[] }>;
    };
    data.lifecycle.payload = [];
    const step = data.sequence.find(item => item.kind === 'transition');
    if (step) step.payload = [];
  });
  const payload = readUsecaseFidelity(withoutPayload, files);
  assert.equal(payload.behavior, null);
  assert.equal(payload.problems.some(item => item.code === 'PAYLOAD_MISSING'), true);

  const withoutRef = edited(registrar, definition => {
    definition.data.rules = [];
  });
  const ref = readUsecaseFidelity(withoutRef, files);
  assert.equal(ref.behavior, null);
  assert.equal(ref.problems.some(item => item.code === 'RULE_REF_MISSING' && item.message.includes('attendanceNoteRequired')), true);

  const withoutText = files.map(file => file.path === RULES
    ? { ...file, text: defs('rules', JSON.stringify({ rules: { consultationTransitionFlow: 'moves', professionalOwnAppointment: 'own' } })) }
    : file);
  const text = readUsecaseFidelity(registrar, withoutText);
  assert.equal(text.behavior, null);
  assert.equal(text.problems.some(item => item.code === 'RULE_TEXT_ABSENT' && item.message.includes('attendanceNoteRequired')), true);

  const withoutCall = edited(update, definition => {
    const mdm = definition.data.mdm as { calls: unknown[] };
    mdm.calls = [];
  });
  const call = readUsecaseFidelity(withoutCall, files);
  assert.equal(call.behavior, null);
  assert.equal(call.problems.some(item => item.code === 'MDM_CALL_MISSING'), true);

  const withoutProjection = edited(list, definition => {
    const data = definition.data as { routeProjections: unknown[] };
    data.routeProjections = [];
  });
  const projection = readUsecaseFidelity(withoutProjection, files);
  assert.equal(projection.behavior, null);
  assert.equal(projection.problems.some(item => item.code === 'PROJECTION_MISSING'), true);

  const withoutDependency = edited(list, (_definition, pipeline) => {
    pipeline[0].dependsFiles = pipeline[0].dependsFiles.filter(path => !path.includes('/web/contracts/'));
  });
  const dependency = readUsecaseFidelity(withoutDependency, files);
  assert.equal(dependency.behavior, null);
  assert.equal(dependency.problems.some(item => item.code === 'DEPENDENCY_MISSING' && item.message.includes('contracts')), true);
});

void test('the inventory still reads the serialized usecase and the test does not write a module', async () => {
  const { request } = focused();
  const source = renderedOf(request, 'registrarAtendimento');
  const host = installStudio(102047);
  const file = {
    project: 102047,
    level: 1,
    folder: 'agendaClinica/layer_2_application/usecases',
    shortName: 'registrarAtendimento',
    extension: '.defs.ts',
    status: 'changed',
    versionRef: '1',
    content: source,
    updatedAt: 'seed',
    getValueInfo: async () => ({ content: source }),
    getContent: async () => source,
  };
  host.files[fileKey(file)] = file;
  const project = {
    project: 102047,
    level: 5,
    folder: '',
    shortName: 'project',
    extension: '.json',
    status: 'changed',
    versionRef: '1',
    content: `${JSON.stringify({ modules: [{ moduleName: 'agendaClinica', backend: {} }] })}\n`,
    updatedAt: 'seed',
    getValueInfo: async () => ({ content: project.content }),
    getContent: async () => project.content,
  };
  host.files[fileKey(project)] = project;
  const inventory = await readL1Inventory(102047, 'agendaClinica');
  const usecase = inventory.usecases.find(item => item.usecaseId === 'registrarAtendimento');
  assert.equal(inventory.present, true);
  assert.equal(usecase?.functions[0]?.name, 'registrarAtendimento');
  assert.equal(usecase?.rulesApplied.includes('attendanceNoteRequired'), true);
  assert.equal(host.writes.length, 0);
});
