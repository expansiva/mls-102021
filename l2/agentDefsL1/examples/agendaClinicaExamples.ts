/// <mls fileReference="_102021_/l2/agentDefsL1/examples/agendaClinicaExamples.ts" enhancement="_blank"/>

import { pendingDefinition, type D1Definition, type M1Status } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { consumedDependencies } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
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

function envelope(
  artifactType: D1Definition['artifactType'],
  artifactId: string,
  data: D1Definition['data'],
  status: M1Status = 'pending',
): D1Definition {
  return pendingDefinition(artifactType, artifactId, MODULE, data, [], status);
}

function handlerKind(kind: string): 'query' | 'command' {
  if (kind === 'qry') return 'query';
  if (kind === 'cmd') return 'command';
  throw new Error(`Route kind is not cmd or qry: ${kind}.`);
}

function scopeGrant(
  grantId: string,
  actorRef: string,
  entityRefs: string[],
  disclosure: 'fieldsOnly' | 'fullRecord',
  scopeMode: 'own' | 'organization',
  extra: {
    allowedFields?: string[];
    anchorEntity?: string;
    path?: Array<{ relationshipId: string; from: string; to: string; field: string }>;
    pending?: string;
  } = {},
): Record<string, unknown> {
  const grant: Record<string, unknown> = {
    grantId,
    actorRef,
    entityRefs,
    disclosure,
    scopeMode,
    session: 'verified',
    path: entityRefs.map(entityId => ({
      entityId,
      steps: entityId === extra.anchorEntity ? [] : (extra.path || []),
      pending: '',
    })),
    pending: extra.pending || '',
  };
  if (extra.anchorEntity) grant.anchorEntity = extra.anchorEntity;
  if (disclosure === 'fieldsOnly') grant.allowedFields = extra.allowedFields || [];
  return grant;
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

  const table = envelope('table', 'consulta', {
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
    rulesApplied: [],
    rulePlan: ['attendanceNoteRequired', 'consultationTransitionFlow', 'professionalOwnAppointment'].map(ruleId => ({
      ruleId,
      origin: `l4/${MODULE}/ontology/Consulta.defs.ts#rules`,
      consumer: 'operation:list',
      enforcement: 'pending' as const,
      gap: 'APPLICABILITY_UNDECLARED',
    })),
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
    sequence: [
      { kind: 'context', source: 'ctx' },
      { kind: 'port', call: 'list', port: 'ConsultaRepository' },
    ],
    uses: [],
    rules: [],
    transaction: { boundary: 'none' },
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
      scopeGrant('recepcionistaCadastroPacientes', 'recepcionista', ['Paciente', 'ContatoPaciente'], 'fieldsOnly', 'organization', {
        allowedFields: ['Paciente.id', 'Paciente.details.identification', 'ContatoPaciente.id'],
      }),
      scopeGrant('recepcionistaAgendaConsultas', 'recepcionista', ['Consulta'], 'fieldsOnly', 'organization', {
        allowedFields: ['Consulta.id', 'Consulta.patientId', 'Consulta.professionalId', 'Consulta.scheduledAt', 'Consulta.status'],
      }),
      scopeGrant('recepcionistaLocalizarProfissionais', 'recepcionista', ['Profissional'], 'fieldsOnly', 'organization', {
        allowedFields: ['Profissional.id', 'Profissional.details.identification'],
      }),
      scopeGrant('recepcionistaProprioCadastro', 'recepcionista', ['Recepcionista'], 'fullRecord', 'own', {
        anchorEntity: 'Recepcionista',
      }),
      scopeGrant('profissionalProprioCadastro', 'profissional', ['Profissional'], 'fullRecord', 'own', {
        anchorEntity: 'Profissional',
      }),
      scopeGrant('profissionalAgendaDiaria', 'profissional', ['Consulta'], 'fullRecord', 'own', {
        anchorEntity: 'Paciente',
        pending: 'ACCESS_ANCHOR',
        path: [{ relationshipId: 'appointmentPatient', from: 'Consulta', to: 'Paciente', field: 'Consulta.patientId' }],
      }),
      scopeGrant('profissionalPacientesDaAgenda', 'profissional', ['Paciente'], 'fieldsOnly', 'own', {
        anchorEntity: 'Paciente',
        allowedFields: ['Paciente.id', 'Paciente.details.identification'],
      }),
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
      { eventId: 'consultaConfirmada', on: 'Consulta.confirmarConsulta', entityId: 'Consulta', mechanism: '', consumer: 'confirmarConsulta' },
      { eventId: 'faltaPacienteRegistrada', on: 'Consulta.registrarFalta', entityId: 'Consulta', mechanism: '', consumer: 'registrarFalta' },
      { eventId: 'atendimentoRegistrado', on: 'Consulta.registrarAtendimento', entityId: 'Consulta', mechanism: '', consumer: 'registrarAtendimento' },
    ],
  }, 'blocked');

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
  return pairs.map(([definition, type, owner]) => {
    const pipeline = [item(catalog, type, owner)];
    return {
      definition: {
        ...definition,
        dependencies: consumedDependencies(catalog.project, pipeline[0].dependsFiles),
      },
      pipeline,
    };
  });
}

/** The listConsulta example also points at L2 contracts. Those paths are not outputs of this catalog. */
export function listConsultaWithContracts(example: D1Example): D1Example {
  const data = example.definition.data as { routeProjections: Array<{ contractPath: string }> };
  const extra = data.routeProjections.map(projection => projection.contractPath);
  const pipeline = example.pipeline.map(entry => ({
    ...entry,
    dependsFiles: [...entry.dependsFiles, ...extra],
  }));
  return {
    definition: {
      ...example.definition,
      dependencies: consumedDependencies(example.pipeline[0] ? projectOf(example.pipeline[0].defPath) : 0, [
        ...example.definition.dependencies,
        ...extra,
      ]),
    },
    pipeline,
  };
}

function projectOf(defPath: string): number {
  const match = /^_(\d+)_/.exec(defPath);
  return match ? Number(match[1]) : 0;
}
