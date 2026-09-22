/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.ts" enhancement="_blank"/>

import { coreUsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import type {
  D1ContractSource,
  D1ControllerGrant,
  D1ControllerPage,
  D1ControllerRelationship,
  D1ControllerRequest,
  D1ControllerRoute,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

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

/** One contract file per page. listConsulta is two shapes. A wide unused interface is not a binding. */
export function contractSources(moduleName: string, routes: readonly D1ControllerRoute[]): D1ContractSource[] {
  const byPage = new Map<string, D1ControllerRoute[]>();
  for (const route of routes) {
    const list = byPage.get(route.page) || [];
    list.push(route);
    byPage.set(route.page, list);
  }
  return [...byPage.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([pageId, pageRoutes]) => {
    const types: string[] = [
      'export interface ListConsultaOutput { id: string; status: string; attendanceNote: string; }',
    ];
    const entries: string[] = [];
    pageRoutes.forEach((route, index) => {
      const name = `Out${index}`;
      const body = outputBody(route);
      const list = route.kind === 'qry' || route.kind === 'query';
      types.push(list ? `export type ${name} = ${body}[];` : `export interface ${name} ${body}`);
      entries.push(`"${route.route}": { output: "${name}" }`);
    });
    const source = `${types.join('\n')}\nexport const routes = { ${entries.join(', ')} } as const;\n`;
    return {
      pageId,
      path: `l2/${moduleName}/web/contracts/${pageId}.defs.ts`,
      source,
    };
  });
}

function outputBody(route: D1ControllerRoute): string {
  if (route.usecaseRef === 'listConsulta' && route.page === 'agenda') {
    return '{ id: string; status: string; attendanceNote: string }';
  }
  if (route.usecaseRef === 'listConsulta') return '{ id: string; status: string }';
  return '{ id: string }';
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
