/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.ts" enhancement="_blank"/>

import { coreUsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import type {
  D1ControllerGrant,
  D1ControllerPage,
  D1ControllerRelationship,
  D1ControllerRequest,
  D1ControllerRoute,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { contractSources } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/v1Contracts.js';

export { contractSources };

/**
 * Measured from the frozen agendaClinica backend (22 routes, 5 pages).
 * The spec text said 5 controllers and 19 routes. The fixture follows the measurement.
 * Actors are the needs.json actors of those pages, not inferred from a route name.
 */
const PAGE_ACTORS: Record<string, string[]> = {
  agenda: ['profissional'],
  cadastro_profissional: ['profissional'],
  cadastro_recepcionista: ['recepcionista'],
  consultas: ['recepcionista'],
  pacientes: ['recepcionista'],
};

const GRANTS: D1ControllerGrant[] = [
  grant('recepcionistaCadastroPacientes', 'recepcionista', ['Paciente', 'ContatoPaciente'], 'fieldsOnly', [
    'Paciente.id', 'Paciente.version', 'Paciente.details.identification', 'Paciente.details.base',
    'ContatoPaciente.id', 'ContatoPaciente.version', 'ContatoPaciente.details.identification', 'ContatoPaciente.details.contactChannel',
  ], '', 'organization'),
  grant('recepcionistaAgendaConsultas', 'recepcionista', ['Consulta'], 'fieldsOnly', [
    'Consulta.id', 'Consulta.version', 'Consulta.patientId', 'Consulta.professionalId', 'Consulta.scheduledAt', 'Consulta.status',
  ], '', 'organization'),
  grant('recepcionistaLocalizarProfissionais', 'recepcionista', ['Profissional'], 'fieldsOnly', [
    'Profissional.id', 'Profissional.version', 'Profissional.details.identification', 'Profissional.details.person',
  ], '', 'organization'),
  grant('recepcionistaProprioCadastro', 'recepcionista', ['Recepcionista'], 'fullRecord', [], 'Recepcionista', 'own'),
  grant('profissionalProprioCadastro', 'profissional', ['Profissional'], 'fullRecord', [], 'Profissional', 'own'),
  grant('profissionalAgendaDiaria', 'profissional', ['Consulta'], 'fullRecord', [], 'Paciente', 'own'),
  grant('profissionalPacientesDaAgenda', 'profissional', ['Paciente'], 'fieldsOnly', [
    'Paciente.id', 'Paciente.details.identification',
  ], 'Paciente', 'own'),
];

const RELATIONSHIPS: D1ControllerRelationship[] = [
  { relationshipId: 'patientContacts', from: 'Paciente', to: 'ContatoPaciente', field: '', required: true },
  { relationshipId: 'appointmentPatient', from: 'Consulta', to: 'Paciente', field: 'Consulta.patientId', required: true },
  { relationshipId: 'appointmentProfessional', from: 'Consulta', to: 'Profissional', field: 'Consulta.professionalId', required: true },
];

export function frozenControllerCounts(): { routes: number; pages: number } {
  const request = coreControllerRequest();
  return {
    routes: request.routes.length,
    pages: new Set(request.routes.map(route => route.page)).size,
  };
}

export function coreControllerRequest(): D1ControllerRequest {
  const source = coreUsecaseRequest();
  const routes: D1ControllerRoute[] = source.routes.map(route => ({ ...route, status: 'toCreate' }));
  const pageIds = [...new Set(routes.map(route => route.page))].sort();
  const pages: D1ControllerPage[] = pageIds.map(pageId => ({
    pageId,
    actors: [...(PAGE_ACTORS[pageId] || [])],
    defPath: `l1/${source.moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`,
  }));
  return {
    project: source.project,
    moduleName: source.moduleName,
    pages,
    routes,
    usecases: source.usecases.map(usecase => ({
      usecaseId: usecase.usecaseId,
      entity: usecase.entity,
      operation: usecase.operation,
      functionName: usecase.usecaseId,
      defPath: usecase.defPath,
    })),
    grants: GRANTS.map(item => ({ ...item, entityRefs: [...item.entityRefs], allowedFields: [...item.allowedFields] })),
    relationships: RELATIONSHIPS.map(item => ({ ...item })),
    contracts: contractSources(source.moduleName, routes),
    existing: [],
    enumerations: source.entities.flatMap(entity => entity.enumerations.map(item => ({
      entityId: entity.entityId,
      path: item.path,
      values: [...item.values],
    }))),
    accessRead: true,
    actorsRead: true,
  };
}

function grant(
  grantId: string,
  actorRef: string,
  entityRefs: string[],
  disclosure: 'fieldsOnly' | 'fullRecord',
  allowedFields: string[],
  anchorEntity: string,
  scopeMode: string,
): D1ControllerGrant {
  return { grantId, actorRef, entityRefs, disclosure, allowedFields, anchorEntity, scopeMode };
}
