/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.ts" enhancement="_blank"/>

import type {
  D1UsecasePlanInput,
  D1UsecaseRequest,
  D1UsecaseSelection,
  D1WorkerStep,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { mdmInputFields, preconditionsFor } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { mdmForOperation } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

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
      mdm('Paciente', [{ path: 'details.identification.subtype', values: ['Person'] }], PACIENTE_CAPABILITIES, PACIENTE_PLATFORM),
      mdm('Profissional', [], PROFISSIONAL_CAPABILITIES, PROFISSIONAL_PLATFORM),
      mdm('Recepcionista', [], RECEPCIONISTA_CAPABILITIES, RECEPCIONISTA_PLATFORM),
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
    contracts: mdmFixtureContracts(),
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
    const routes = usecase.routes.flatMap(routeId => {
      const route = request.routes.find(item => item.route === routeId);
      return route ? [route] : [];
    });
    const read = mdmInputFields(
      request.contracts,
      routes,
      preconditionsFor(request.files, request.moduleName, entity.entityId, entity.fields),
    );
    const bound = mdmForOperation({
      entityId: entity.entityId,
      namespace: entity.namespace,
      capabilities: entity.capabilities || [],
      selected: [],
      platformFields: entity.platformFields || [],
      inputFields: read.fields,
      contractUnread: read.unread.join('; '),
      operation: usecase.operation,
    });
    for (const call of bound.calls) {
      for (const capability of call.capabilities) {
        steps.push({
          kind: 'mdm',
          namespace: entity.namespace,
          call: call.method,
          entity: entity.entityId,
          capability,
        });
      }
    }
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

const IDENTIFICATION = [
  'details.identification.name',
  'details.identification.docType',
  'details.identification.docId',
  'details.identification.countryCode',
];

const PROFISSIONAL_CAPABILITIES = [
  'read.byId', 'locate.byName', 'locate.byDocument', 'locate.byTag',
  'register.createOrAttach', 'edit.platformFields', 'inactivate', 'invite.login',
  'statusHistory.read', 'audit',
];

const PROFISSIONAL_PLATFORM = [
  ...IDENTIFICATION,
  'details.person.occupation',
  'details.person.privacyConsent',
];

const RECEPCIONISTA_CAPABILITIES = [
  'read.byId', 'locate.byName', 'locate.byDocument', 'register.createOrAttach',
  'edit.platformFields', 'edit.moduleNamespace', 'inactivate', 'audit', 'invite.login',
];

const RECEPCIONISTA_PLATFORM = [...IDENTIFICATION];

const PACIENTE_CAPABILITIES = [
  'read.byId', 'locate.byName', 'locate.byDocument', 'locate.byContact',
  'register.createOrAttach', 'edit.platformFields', 'inactivate', 'link.contact', 'listLinks', 'audit',
];

const PACIENTE_PLATFORM = [
  ...IDENTIFICATION,
  'details.base.aliases',
  'details.base.notes',
  'details.person.privacyConsent',
];

/** Contract text for the structural fixture. An absent list is not a stand-in for these fields. */
function mdmFixtureContracts(): D1UsecaseRequest['contracts'] {
  const byPage = new Map<string, Array<{ route: string; usecaseId: string }>>();
  for (const [route, page, , usecaseId] of ROWS) {
    if (!fixtureFields(usecaseId)) continue;
    const list = byPage.get(page) || [];
    list.push({ route, usecaseId });
    byPage.set(page, list);
  }
  const contracts: D1UsecaseRequest['contracts'] = [];
  for (const [pageId, routes] of byPage) {
    const blocks: string[] = [];
    const entries: string[] = [];
    for (const item of routes) {
      const tail = item.route.split('.').pop() || item.usecaseId;
      const raw = tail.startsWith('cmd') || tail.startsWith('qry') ? tail.slice(3) : tail;
      const stem = `${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
      blocks.push(`export interface ${stem}Input ${fixtureType(fixtureFields(item.usecaseId))}`);
      blocks.push(`export interface ${stem}Output { id: string }`);
      entries.push(`"${item.route}": { input: "${stem}Input", output: "${stem}Output" }`);
    }
    contracts.push({
      pageId,
      path: `l2/agendaClinica/web/contracts/${pageId}.defs.ts`,
      source: `${blocks.join('\n')}\nexport const routes = { ${entries.join(', ')} } as const;\n`,
    });
  }
  return contracts;
}

function fixtureFields(usecaseId: string): string[] {
  if (usecaseId === 'updateProfissional') return ['id', 'version', ...PROFISSIONAL_PLATFORM];
  if (usecaseId === 'updateRecepcionista') return ['id', 'version', ...RECEPCIONISTA_PLATFORM, 'details.agendaClinica'];
  if (usecaseId === 'createProfissional') return [...PROFISSIONAL_PLATFORM];
  if (usecaseId === 'createRecepcionista') return [...RECEPCIONISTA_PLATFORM];
  if (usecaseId === 'createPaciente') return [...PACIENTE_PLATFORM];
  if (usecaseId === 'listProfissional' || usecaseId === 'listRecepcionista' || usecaseId === 'listPaciente') {
    return ['id', 'details.identification.name', 'details.identification.docType', 'details.identification.docId'];
  }
  return [];
}

function fixtureType(paths: readonly string[]): string {
  const root = new Map<string, FixtureNode>();
  for (const path of paths) {
    const parts = path.split('.');
    let level = root;
    parts.forEach((part, index) => {
      const node = level.get(part) || { children: new Map<string, FixtureNode>() };
      level.set(part, node);
      if (index === parts.length - 1) node.leaf = part === 'version' ? 'number' : 'string';
      level = node.children;
    });
  }
  return printFixture(root);
}

interface FixtureNode {
  leaf?: string;
  children: Map<string, FixtureNode>;
}

function printFixture(level: Map<string, FixtureNode>): string {
  const members = [...level.entries()].map(([name, node]) => {
    const type = node.children.size ? printFixture(node.children) : node.leaf || 'string';
    return `${name}: ${type}`;
  });
  return `{ ${members.join('; ')} }`;
}

function mdm(
  entityId: string,
  enumerations: Array<{ path: string; values: string[] }>,
  capabilities: string[],
  platformFields: string[],
): D1UsecaseRequest['entities'][number] {
  return {
    entityId,
    storageTarget: 'mdm',
    defPath: `l1/agendaClinica/layer_3_domain/entities/${entityId.charAt(0).toLowerCase()}${entityId.slice(1)}.defs.ts`,
    namespace: 'agendaClinica',
    fields: [
      { name: 'id', type: 'uuid', derived: true },
      { name: 'version', type: 'integer', derived: true, writePrecondition: true },
    ],
    transitions: [],
    rules: [],
    enumerations,
    capabilities,
    platformFields,
  };
}
