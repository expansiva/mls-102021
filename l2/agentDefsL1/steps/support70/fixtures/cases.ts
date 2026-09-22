/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/fixtures/cases.ts" enhancement="_blank"/>

import { pipelineId } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import { coreControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { lowerFirst } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import type {
  D1SeedJourney,
  D1SeedModel,
  D1SupportAdapter,
  D1SupportRequest,
} from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';

/**
 * Measured from the frozen agendaClinica controller fixture: 7 grants, 1 live adapter.
 * The scope plans are the ones controllers60 already resolved. The anchor is not corrected.
 */
export function coreSupportRequest(): D1SupportRequest {
  const controllers = coreControllerRequest();
  const built = buildD1Controllers(controllers);
  const plans = new Map<string, D1SupportRequest['scopePlans'][number]>();
  const cited: string[] = [];
  for (const controller of built.controllers) {
    for (const handler of controller.handlers) {
      for (const grantId of handler.grantIds) {
        if (!cited.includes(grantId)) cited.push(grantId);
      }
      for (const plan of handler.scopePlan) {
        if (!plans.has(plan.grantId)) plans.set(plan.grantId, plan);
      }
    }
  }
  return {
    project: controllers.project,
    moduleName: controllers.moduleName,
    grants: controllers.grants.map(grant => ({
      ...grant,
      entityRefs: [...grant.entityRefs],
      allowedFields: [...grant.allowedFields],
    })),
    relationships: controllers.relationships.map(rel => ({ ...rel })),
    scopePlans: [...plans.values()],
    citedGrantIds: cited,
    adapters: [consultaAdapter(controllers.moduleName)],
    files: [],
    existingHelpers: [],
    applicationEdges: [],
    formFields: [],
    enumerations: built.enumerations.map(item => ({
      entityId: item.entityId,
      path: item.path,
      values: [...item.values],
    })),
    tables: [],
    models: [],
    journeys: [],
    missingJourneys: [],
    roleTags: [],
    seedRefs: [],
    existingDatasets: [],
    maintenance: null,
  };
}

const NOTE_RULE = 'attendanceNoteRequired';

function roleModel(entityId: string): D1SeedModel {
  return {
    entityId,
    storageTarget: 'mdm',
    kind: 'role',
    namespace: '',
    fields: [{ name: 'id', type: 'uuid' }],
    states: [],
    initialState: '',
    uniqueKeys: [],
    transitions: [],
    noteField: '',
  };
}

function journey(journeyId: string, entities: string[], effect = '', transitionRef = '', entityId = 'Consulta'): D1SeedJourney {
  return {
    journeyId,
    entities,
    effects: effect ? [{ entityId, effect, transitionRef }] : [],
  };
}

/**
 * Measured from the frozen agendaClinica journeys and Consulta model.
 * Four roles stay MDM. Only Consulta is a local table. No row values are present in the sources.
 */
export function agendaSeedRequest(): D1SupportRequest {
  const request = coreSupportRequest();
  request.tables = [{
    tableId: 'consulta',
    entityId: 'Consulta',
    action: 'create',
    defPath: `l1/${request.moduleName}/layer_1_external/adapters/persistence/consulta.defs.ts`,
    uniqueKeys: [['professionalId', 'scheduledAt']],
  }];
  request.models = [
    {
      entityId: 'Consulta',
      storageTarget: 'moduleDatabase',
      kind: 'entity',
      namespace: '',
      fields: [
        { name: 'id', type: 'uuid' },
        { name: 'patientId', type: 'record' },
        { name: 'professionalId', type: 'record' },
        { name: 'scheduledAt', type: 'timestamp' },
        { name: 'status', type: 'enum' },
        { name: 'details', type: 'object' },
        { name: 'details.attendanceNote', type: 'text' },
      ],
      states: ['scheduled', 'confirmed', 'noShow', 'attended'],
      initialState: 'scheduled',
      uniqueKeys: [['professionalId', 'scheduledAt']],
      transitions: [
        { transitionId: 'confirmarConsulta', to: 'confirmed', ruleRefs: ['consultationTransitionFlow'] },
        { transitionId: 'registrarFalta', to: 'noShow', ruleRefs: ['consultationTransitionFlow'] },
        { transitionId: 'registrarAtendimento', to: 'attended', ruleRefs: ['consultationTransitionFlow', NOTE_RULE, 'professionalOwnAppointment'] },
      ],
      noteField: 'details.attendanceNote',
    },
    roleModel('Paciente'),
    roleModel('Profissional'),
    roleModel('Recepcionista'),
    roleModel('ContatoPaciente'),
  ];
  request.journeys = [
    journey('cadastrarPaciente', ['Paciente'], 'create', '', 'Paciente'),
    journey('agendarConsulta', ['Paciente', 'Profissional', 'Consulta'], 'create'),
    journey('confirmarConsulta', ['Consulta'], 'transition', 'confirmarConsulta'),
    journey('registrarFalta', ['Consulta'], 'transition', 'registrarFalta'),
    journey('consultarAgendaDiaria', ['Consulta']),
    journey('registrarAtendimento', ['Consulta'], 'transition', 'registrarAtendimento'),
  ];
  request.roleTags = [
    { tag: 'paciente', entityId: 'Paciente' },
    { tag: 'profissional', entityId: 'Profissional' },
    { tag: 'recepcionista', entityId: 'Recepcionista' },
    { tag: 'HasContact', entityId: 'ContatoPaciente' },
  ];
  return request;
}

export function consultaAdapter(moduleName: string): D1SupportAdapter {
  return {
    portId: 'ConsultaRepository',
    entityId: 'Consulta',
    tableId: 'consulta',
    artifactId: 'ConsultaRepository',
    action: 'create',
    defPath: `l1/${moduleName}/layer_1_external/adapters/persistence/${lowerFirst('Consulta')}RepositoryAdapter.defs.ts`,
  };
}

export function adapterPipelineId(project: number, moduleName: string, portId: string): string {
  return pipelineId(project, moduleName, 'repositoryAdapter', portId);
}
