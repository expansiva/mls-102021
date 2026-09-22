/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.ts" enhancement="_blank"/>

import type {
  D1UsecasePlanInput,
  D1UsecaseRequest,
  D1UsecaseSelection,
  D1WorkerStep,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

/**
 * Measured from the frozen agendaClinica backend (22 routes, 5 pages).
 * The spec text said 19 routes. The fixture follows the measurement.
 * Plans here are fixtures. They are not a resolved live payload.
 */
const ROWS: Array<[string, string, string, string, string]> = [
  ['agendaClinica.agenda.cmdRegistrarAtendimento', 'agenda', 'cmd', 'registrarAtendimento', 'Consulta'],
  ['agendaClinica.agenda.qryListConsulta', 'agenda', 'qry', 'listConsulta', 'Consulta'],
  ['agendaClinica.cadastro_profissional.cmdCreateProfissional', 'cadastro_profissional', 'cmd', 'createProfissional', 'Profissional'],
  ['agendaClinica.cadastro_profissional.cmdUpdateProfissional', 'cadastro_profissional', 'cmd', 'updateProfissional', 'Profissional'],
  ['agendaClinica.cadastro_profissional.qryListProfissional', 'cadastro_profissional', 'qry', 'listProfissional', 'Profissional'],
  ['agendaClinica.cadastro_recepcionista.cmdCreateProfissional', 'cadastro_recepcionista', 'cmd', 'createProfissional', 'Profissional'],
  ['agendaClinica.cadastro_recepcionista.cmdCreateRecepcionista', 'cadastro_recepcionista', 'cmd', 'createRecepcionista', 'Recepcionista'],
  ['agendaClinica.cadastro_recepcionista.cmdUpdateProfissional', 'cadastro_recepcionista', 'cmd', 'updateProfissional', 'Profissional'],
  ['agendaClinica.cadastro_recepcionista.cmdUpdateRecepcionista', 'cadastro_recepcionista', 'cmd', 'updateRecepcionista', 'Recepcionista'],
  ['agendaClinica.cadastro_recepcionista.qryListProfissional', 'cadastro_recepcionista', 'qry', 'listProfissional', 'Profissional'],
  ['agendaClinica.cadastro_recepcionista.qryListRecepcionista', 'cadastro_recepcionista', 'qry', 'listRecepcionista', 'Recepcionista'],
  ['agendaClinica.consultas.cmdConfirmarConsulta', 'consultas', 'cmd', 'confirmarConsulta', 'Consulta'],
  ['agendaClinica.consultas.cmdCreateConsulta', 'consultas', 'cmd', 'createConsulta', 'Consulta'],
  ['agendaClinica.consultas.cmdRegistrarFalta', 'consultas', 'cmd', 'registrarFalta', 'Consulta'],
  ['agendaClinica.consultas.qryListConsulta', 'consultas', 'qry', 'listConsulta', 'Consulta'],
  ['agendaClinica.consultas.qryListPaciente', 'consultas', 'qry', 'listPaciente', 'Paciente'],
  ['agendaClinica.consultas.qryListProfissional', 'consultas', 'qry', 'listProfissional', 'Profissional'],
  ['agendaClinica.pacientes.cmdCreateConsulta', 'pacientes', 'cmd', 'createConsulta', 'Consulta'],
  ['agendaClinica.pacientes.cmdCreatePaciente', 'pacientes', 'cmd', 'createPaciente', 'Paciente'],
  ['agendaClinica.pacientes.qryListConsulta', 'pacientes', 'qry', 'listConsulta', 'Consulta'],
  ['agendaClinica.pacientes.qryListPaciente', 'pacientes', 'qry', 'listPaciente', 'Paciente'],
  ['agendaClinica.pacientes.qryListProfissional', 'pacientes', 'qry', 'listProfissional', 'Profissional'],
];

const OPERATIONS: Record<string, string> = {
  confirmarConsulta: 'transition',
  createConsulta: 'create',
  createPaciente: 'create',
  createProfissional: 'create',
  createRecepcionista: 'create',
  listConsulta: 'list',
  listPaciente: 'list',
  listProfissional: 'list',
  listRecepcionista: 'list',
  registrarAtendimento: 'transition',
  registrarFalta: 'transition',
  updateProfissional: 'update',
  updateRecepcionista: 'update',
};

const TRANSITIONS = [
  { transitionId: 'confirmarConsulta', from: ['scheduled'], to: 'confirmed', by: ['recepcionista'], ruleRefs: ['consultationTransitionFlow'] },
  { transitionId: 'registrarFalta', from: ['scheduled', 'confirmed'], to: 'noShow', by: ['recepcionista'], ruleRefs: ['consultationTransitionFlow'] },
  {
    transitionId: 'registrarAtendimento',
    from: ['scheduled', 'confirmed'],
    to: 'attended',
    by: ['profissional'],
    ruleRefs: ['consultationTransitionFlow', 'attendanceNoteRequired', 'professionalOwnAppointment'],
  },
];

export function frozenRouteCount(): number {
  return ROWS.length;
}

export function coreUsecaseRequest(): D1UsecaseRequest {
  const routes = ROWS.map(([route, page, kind, usecaseRef]) => ({ route, page, kind, usecaseRef }));
  const byId = new Map<string, D1UsecaseSelection>();
  for (const [route, , , usecaseId, entity] of ROWS) {
    const current = byId.get(usecaseId) || {
      usecaseId,
      entity,
      operation: OPERATIONS[usecaseId],
      routes: [],
      defPath: `l1/agendaClinica/layer_2_application/usecases/${usecaseId}.defs.ts`,
    };
    current.routes.push(route);
    byId.set(usecaseId, current);
  }
  const usecases = [...byId.values()];
  const request: D1UsecaseRequest = {
    project: 102047,
    moduleName: 'agendaClinica',
    usecases,
    routes,
    ports: [{
      portId: 'ConsultaRepository',
      entityId: 'Consulta',
      defPath: 'l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts',
      methods: ['create', 'list', 'transition'],
    }],
    entities: [
      {
        entityId: 'Consulta',
        storageTarget: 'moduleDatabase',
        defPath: 'l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts',
        namespace: '',
        fields: [
          { name: 'id', type: 'uuid', derived: true },
          { name: 'status', type: 'enum', derived: false },
          { name: 'details.attendanceNote', type: 'text', derived: false },
        ],
        transitions: TRANSITIONS,
        rules: [],
        enumerations: [{ path: 'status', values: ['scheduled', 'confirmed', 'noShow', 'attended'] }],
      },
      mdm('Paciente', [{ path: 'details.identification.subtype', values: ['Person'] }]),
      mdm('Profissional', []),
      mdm('Recepcionista', []),
    ],
    moduleRules: [
      'consultationTransitionFlow',
      'attendanceNoteRequired',
      'professionalOwnAppointment',
      'uniqueProfessionalSchedule',
    ],
    outbound: [
      { eventId: 'consultaConfirmada', on: 'Consulta.confirmarConsulta' },
      { eventId: 'faltaPacienteRegistrada', on: 'Consulta.registrarFalta' },
      { eventId: 'atendimentoRegistrado', on: 'Consulta.registrarAtendimento' },
    ],
    contracts: [],
    plans: [],
    llmCalls: 0,
  };
  request.plans = usecases.map(usecase => fixturePlan(request, usecase));
  return request;
}

/** Fixture steps. registrarAtendimento does not invent an attendanceNote payload. */
export function fixturePlan(request: D1UsecaseRequest, usecase: D1UsecaseSelection): D1UsecasePlanInput {
  const entity = request.entities.find(item => item.entityId === usecase.entity);
  const steps: D1WorkerStep[] = [{ kind: 'context', source: 'ctx' }];
  if (entity?.storageTarget === 'mdm') {
    const call = usecase.operation === 'list' ? 'read' : usecase.operation === 'update' ? 'attach' : 'create';
    steps.push({ kind: 'mdm', namespace: entity.namespace, call, entity: entity.entityId });
  } else {
    const port = request.ports.find(item => item.entityId === usecase.entity);
    if (port) steps.push({ kind: 'port', call: usecase.operation, port: port.portId });
  }
  if (usecase.operation === 'transition') {
    const transition = entity?.transitions.find(item => item.transitionId === usecase.usecaseId);
    for (const ruleId of transition?.ruleRefs || []) steps.push({ kind: 'rule', ruleId });
    steps.push({ kind: 'transition', transitionId: usecase.usecaseId, payload: [] });
    for (const event of request.outbound) {
      if (event.on === `${usecase.entity}.${usecase.usecaseId}`) steps.push({ kind: 'effect', eventId: event.eventId });
    }
  }
  return { usecaseId: usecase.usecaseId, steps };
}

function mdm(entityId: string, enumerations: Array<{ path: string; values: string[] }>): D1UsecaseRequest['entities'][number] {
  return {
    entityId,
    storageTarget: 'mdm',
    defPath: `l1/agendaClinica/layer_3_domain/entities/${entityId.charAt(0).toLowerCase()}${entityId.slice(1)}.defs.ts`,
    namespace: 'agendaClinica',
    fields: [{ name: 'id', type: 'uuid', derived: true }],
    transitions: [],
    rules: [],
    enumerations,
  };
}
