/// <mls fileReference="_102021_/l2/agentDefsL1/examples/agendaClinicaExamples.ts" enhancement="_blank"/>

import { D1_DEFINITION_SCHEMA, type D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  type D1Catalog,
  type D1MeasuredPlan,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';

const MODULE = 'agendaClinica';

const PROFESSIONAL_LIST = 'agendaClinica.consultas_profissional.qryListConsulta';
const RECEPTION_LIST = 'agendaClinica.consultas_recepcionista.qryListConsulta';

export interface D1Example {
  definition: D1Definition;
  pipeline: D1PipelineItem[];
}

function item(catalog: D1Catalog, type: string, owner: string): D1PipelineItem {
  const id = `${catalog.project}/${catalog.moduleName}/${type}/${owner}`;
  const found = catalog.items.find(entry => entry.id === id);
  if (!found) throw new Error(`Catalog has no ${id}.`);
  return found;
}

function envelope(artifactType: D1Definition['artifactType'], artifactId: string, data: D1Definition['data']): D1Definition {
  return { schemaVersion: D1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MODULE, data };
}

function handlerKind(kind: string): 'query' | 'command' {
  if (kind === 'qry') return 'query';
  if (kind === 'cmd') return 'command';
  throw new Error(`Route kind is not cmd or qry: ${kind}.`);
}

export function agendaExamples(catalog: D1Catalog, plan: D1MeasuredPlan): D1Example[] {
  const listRoutes = plan.selection.usecases.find(usecase => usecase.usecaseId === 'listConsulta')?.routes || [];
  for (const route of [PROFESSIONAL_LIST, RECEPTION_LIST]) {
    if (!listRoutes.includes(route)) throw new Error(`Plan has no listConsulta route ${route}.`);
  }
  const page = 'consultas_profissional';
  const pageRoutes = plan.selection.routes.filter(route => route.page === page);
  if (pageRoutes.length === 0) throw new Error(`Plan has no routes for ${page}.`);

  const consulta = envelope('domainEntity', 'Consulta', {
    entityId: 'Consulta',
    storageTarget: 'moduleDatabase',
    fields: [
      { name: 'id', type: 'uuid', derived: true },
      { name: 'version', type: 'integer', derived: true },
      { name: 'patientId', type: 'record', ref: 'Paciente' },
      { name: 'professionalId', type: 'record', ref: 'Profissional' },
      { name: 'scheduledAt', type: 'timestamp' },
      { name: 'status', type: 'enum' },
      { name: 'attendanceNote', type: 'text' },
    ],
    lifecycle: {
      states: [
        { state: 'scheduled', reachedBy: 'actor' },
        { state: 'confirmed', reachedBy: 'actor' },
        { state: 'noShow', reachedBy: 'actor' },
        { state: 'attended', reachedBy: 'actor' },
      ],
      transitions: [
        { transitionId: 'confirmarConsulta', from: ['scheduled'], to: 'confirmed', by: ['recepcionista'], ruleRefs: ['consultationTransitionFlow'] },
        { transitionId: 'registrarFalta', from: ['scheduled', 'confirmed'], to: 'noShow', by: ['recepcionista'], ruleRefs: ['consultationTransitionFlow'] },
        {
          transitionId: 'registrarAtendimento',
          from: ['scheduled', 'confirmed'],
          to: 'attended',
          by: ['profissional'],
          ruleRefs: ['consultationTransitionFlow', 'attendanceNoteRequired', 'professionalOwnAppointment'],
        },
      ],
    },
    invariants: ['uniqueProfessionalSchedule', 'consultationTransitionFlow', 'attendanceNoteRequired', 'professionalOwnAppointment'],
    imports: [],
  });

  const port = envelope('repositoryPort', 'ConsultaRepository', {
    entityId: 'Consulta',
    interfaceName: 'ConsultaRepository',
    methods: [
      { name: 'create', params: ['Consulta'], returns: 'Consulta' },
      { name: 'list', params: ['ConsultaFilter'], returns: 'Consulta[]' },
      { name: 'applyTransition', params: ['Consulta', 'transitionId'], returns: 'Consulta' },
    ],
  });

  const table = envelope('table', 'Consulta', {
    tableId: 'consulta',
    entityId: 'Consulta',
    physicalName: 'agendaClinica_consulta',
    primaryKey: ['id'],
    uniqueKeys: [['professionalId', 'scheduledAt']],
    indexes: [
      { name: 'agendaClinica_consulta_professional_scheduled', columns: ['professionalId', 'scheduledAt'], unique: true },
    ],
  });

  const adapter = envelope('repositoryAdapter', 'ConsultaRepository', {
    entityId: 'Consulta',
    portId: 'ConsultaRepository',
    tableId: 'consulta',
    columns: [
      { field: 'id', column: 'id' },
      { field: 'patientId', column: 'patientId' },
      { field: 'professionalId', column: 'professionalId' },
      { field: 'scheduledAt', column: 'scheduledAt' },
      { field: 'status', column: 'status' },
      { field: 'attendanceNote', column: 'attendanceNote' },
    ],
  });

  const output = [
    { name: 'id', type: 'uuid', fieldRef: 'Consulta.id' },
    { name: 'status', type: 'enum', fieldRef: 'Consulta.status' },
    { name: 'attendanceNote', type: 'text', fieldRef: 'Consulta.details.attendanceNote' },
  ];
  const usecase = envelope('usecase', 'listConsulta', {
    usecaseId: 'listConsulta',
    entityId: 'Consulta',
    operation: 'list',
    ports: ['ConsultaRepository'],
    rulesApplied: ['professionalOwnAppointment'],
    functions: [{
      functionName: 'listConsulta',
      input: [
        { name: 'professionalId', type: 'record', fieldRef: 'Consulta.professionalId' },
        { name: 'scheduledAt', type: 'timestamp', fieldRef: 'Consulta.scheduledAt' },
      ],
      output,
      contractRefs: listRoutes.map(route => ({ route, symbol: 'ListConsultaOutput' })),
    }],
    routeProjections: listRoutes.map(route => {
      const selected = plan.selection.routes.find(item => item.route === route);
      const declared = route === PROFESSIONAL_LIST
        ? ['id', 'status', 'attendanceNote']
        : route === RECEPTION_LIST
          ? ['id', 'status']
          : null;
      return {
        route,
        contractPath: `l2/${MODULE}/web/contracts/${selected?.page || 'missing'}.defs.ts`,
        projection: declared ? 'declared' as const : 'unresolved' as const,
        outputFields: declared || [],
      };
    }),
    portCalls: ['list'],
    transactional: false,
    effects: [],
  });

  const controller = envelope('httpController', page, {
    pageId: page,
    handlers: pageRoutes.map(route => ({
      route: route.route,
      kind: handlerKind(route.kind),
      usecaseId: route.usecaseRef,
      grantIds: ['profissionalAgendaDiaria'],
    })),
  });

  const scope = envelope('accessScope', 'accessScope', {
    scopeId: 'accessScope',
    grants: [
      {
        grantId: 'recepcionistaCadastroPacientes',
        actorRef: 'recepcionista',
        entityRefs: ['Paciente', 'ContatoPaciente'],
        disclosure: 'fieldsOnly',
        allowedFields: ['Paciente.id', 'Paciente.details.identification', 'ContatoPaciente.id'],
      },
      {
        grantId: 'recepcionistaAgendaConsultas',
        actorRef: 'recepcionista',
        entityRefs: ['Consulta'],
        disclosure: 'fieldsOnly',
        allowedFields: ['Consulta.id', 'Consulta.patientId', 'Consulta.professionalId', 'Consulta.scheduledAt', 'Consulta.status'],
      },
      {
        grantId: 'recepcionistaLocalizarProfissionais',
        actorRef: 'recepcionista',
        entityRefs: ['Profissional'],
        disclosure: 'fieldsOnly',
        allowedFields: ['Profissional.id', 'Profissional.details.identification'],
      },
      {
        grantId: 'recepcionistaProprioCadastro',
        actorRef: 'recepcionista',
        anchorEntity: 'Recepcionista',
        entityRefs: ['Recepcionista'],
        disclosure: 'fullRecord',
      },
      {
        grantId: 'profissionalProprioCadastro',
        actorRef: 'profissional',
        anchorEntity: 'Profissional',
        entityRefs: ['Profissional'],
        disclosure: 'fullRecord',
      },
      {
        grantId: 'profissionalAgendaDiaria',
        actorRef: 'profissional',
        anchorEntity: 'Paciente',
        entityRefs: ['Consulta'],
        disclosure: 'fullRecord',
      },
      {
        grantId: 'profissionalPacientesDaAgenda',
        actorRef: 'profissional',
        anchorEntity: 'Paciente',
        entityRefs: ['Paciente'],
        disclosure: 'fieldsOnly',
        allowedFields: ['Paciente.id', 'Paciente.details.identification'],
      },
    ],
  });

  const authority = envelope('authorityMap', 'authorityMap', {
    mapId: 'authorityMap',
    entries: [
      { grantId: 'recepcionistaCadastroPacientes', actorRef: 'recepcionista' },
      { grantId: 'recepcionistaAgendaConsultas', actorRef: 'recepcionista' },
      { grantId: 'recepcionistaLocalizarProfissionais', actorRef: 'recepcionista' },
      { grantId: 'recepcionistaProprioCadastro', actorRef: 'recepcionista' },
      { grantId: 'profissionalProprioCadastro', actorRef: 'profissional' },
      { grantId: 'profissionalAgendaDiaria', actorRef: 'profissional' },
      { grantId: 'profissionalPacientesDaAgenda', actorRef: 'profissional' },
    ],
  });

  const registration = envelope('repositoryRegistration', 'registerRepositories', {
    registrationId: 'registerRepositories',
    adapters: [{ portId: 'ConsultaRepository', adapterArtifactId: 'ConsultaRepository' }],
  });

  const seeds = envelope('persistenceSeeds', 'seeds', {
    seedId: 'seeds',
    scenarios: [{
      scenarioId: 'consulta-unique-slot',
      tableId: 'consulta',
      constraints: ['uniqueKeys:professionalId+scheduledAt'],
    }],
  });

  const integration = envelope('integrationOutbound', 'outbound', {
    integrationId: 'outbound',
    events: [
      { eventId: 'consultaConfirmada', on: 'Consulta.confirmarConsulta', entityId: 'Consulta', mechanism: '' },
      { eventId: 'faltaPacienteRegistrada', on: 'Consulta.registrarFalta', entityId: 'Consulta', mechanism: '' },
      { eventId: 'atendimentoRegistrado', on: 'Consulta.registrarAtendimento', entityId: 'Consulta', mechanism: '' },
    ],
  });

  const pairs: Array<[D1Definition, string, string]> = [
    [consulta, 'domainEntity', 'Consulta'],
    [port, 'repositoryPort', 'ConsultaRepository'],
    [table, 'table', 'consulta'],
    [adapter, 'repositoryAdapter', 'ConsultaRepository'],
    [usecase, 'usecase', 'listConsulta'],
    [controller, 'httpController', page],
    [scope, 'accessScope', 'accessScope'],
    [authority, 'authorityMap', 'authorityMap'],
    [registration, 'repositoryRegistration', 'registerRepositories'],
    [seeds, 'persistenceSeeds', 'seeds'],
    [integration, 'integrationOutbound', 'outbound'],
  ];
  return pairs.map(([definition, type, owner]) => ({ definition, pipeline: [item(catalog, type, owner)] }));
}

/** The listConsulta example also points at L2 contracts. Those paths are not outputs of this catalog. */
export function listConsultaWithContracts(example: D1Example): D1Example {
  const data = example.definition.data as { routeProjections: Array<{ contractPath: string }> };
  const extra = data.routeProjections.map(projection => projection.contractPath);
  const pipeline = example.pipeline.map(entry => ({
    ...entry,
    dependsFiles: [...entry.dependsFiles, ...extra],
  }));
  return { definition: example.definition, pipeline };
}
