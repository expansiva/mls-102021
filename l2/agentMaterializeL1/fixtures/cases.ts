/// <mls fileReference="_102021_/l2/agentMaterializeL1/fixtures/cases.ts" enhancement="_blank"/>

import {
  M1_DEFINITION_SCHEMA,
  M1_RECEIPT_SCHEMA,
  type M1ArtifactType,
  type M1Definition,
  type M1Status,
  type MaterializationReceipt,
  type ReferenceIndex,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';

export const M1_FIXTURE_PROJECT = 102047;
export const M1_FIXTURE_MODULE = 'agendaClinica';

const MODULE = M1_FIXTURE_MODULE;
const P = `_102047_`;

export function defPathOf(type: M1ArtifactType, artifactId: string): string {
  switch (type) {
    case 'domainEntity': return `${P}/l1/${MODULE}/layer_3_domain/entities/${artifactId.toLowerCase()}.defs.ts`;
    case 'valueObject': return `${P}/l1/${MODULE}/layer_3_domain/values/${artifactId}.defs.ts`;
    case 'repositoryPort': return `${P}/l1/${MODULE}/layer_2_application/ports/${uncap(artifactId)}.defs.ts`;
    case 'table': return `${P}/l1/${MODULE}/layer_1_external/adapters/persistence/${artifactId}.defs.ts`;
    case 'repositoryAdapter': return `${P}/l1/${MODULE}/layer_1_external/adapters/persistence/${uncap(artifactId)}Adapter.defs.ts`;
    case 'usecase': return `${P}/l1/${MODULE}/layer_2_application/usecases/${artifactId}.defs.ts`;
    case 'httpController': return `${P}/l1/${MODULE}/layer_1_external/adapters/http/controllers/${artifactId}.defs.ts`;
    case 'accessScope': return `${P}/l1/${MODULE}/layer_1_external/access/${artifactId}.defs.ts`;
    case 'authorityMap': return `${P}/l1/${MODULE}/layer_1_external/access/${artifactId}.defs.ts`;
    case 'repositoryRegistration': return `${P}/l1/${MODULE}/layer_1_external/adapters/persistence/${artifactId}.defs.ts`;
    case 'persistenceSeeds': return `${P}/l1/${MODULE}/layer_1_external/adapters/persistence/${artifactId}.defs.ts`;
    case 'integrationOutbound': return `${P}/l1/${MODULE}/layer_1_external/integration/${artifactId}.defs.ts`;
  }
}

export const M1_PLATFORM_RULES = `${P}/l4/${MODULE}/rules.defs.ts`;
export const M1_CONTRACT_PROFESSIONAL = `${P}/l2/${MODULE}/web/contracts/consultas_profissional.defs.ts`;
export const M1_CONTRACT_RECEPTION = `${P}/l2/${MODULE}/web/contracts/consultas_recepcionista.defs.ts`;

const CONSULTA = defPathOf('domainEntity', 'Consulta');
const PROFISSIONAL = `${P}/l1/${MODULE}/layer_3_domain/entities/profissional.defs.ts`;
const PACIENTE = `${P}/l1/${MODULE}/layer_3_domain/entities/paciente.defs.ts`;
const PORT = defPathOf('repositoryPort', 'ConsultaRepository');
const TABLE = defPathOf('table', 'consulta');
const ADAPTER = defPathOf('repositoryAdapter', 'ConsultaRepository');
const LIST = defPathOf('usecase', 'listConsulta');
const PAGE = defPathOf('httpController', 'consultas_profissional');
const SCOPE = defPathOf('accessScope', 'accessScope');
const AUTHORITY = defPathOf('authorityMap', 'authorityMap');
const REGISTER = defPathOf('repositoryRegistration', 'registerRepositories');
const SEEDS = defPathOf('persistenceSeeds', 'seeds');
const OUTBOUND = defPathOf('integrationOutbound', 'outbound');
const SLOT = defPathOf('valueObject', 'ScheduleSlot');

function uncap(value: string): string {
  return value.slice(0, 1).toLowerCase() + value.slice(1);
}

function envelope(
  artifactType: M1ArtifactType,
  artifactId: string,
  status: M1Status,
  dependencies: string[],
  data: Record<string, unknown>,
): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType,
    artifactId,
    moduleName: MODULE,
    status,
    dependencies: [...dependencies].sort(),
    data,
  };
}

export const consultaEntity = envelope('domainEntity', 'Consulta', 'pending', [PACIENTE, PROFISSIONAL], {
  entityId: 'Consulta',
  storageTarget: 'moduleDatabase',
  fields: [
    { name: 'id', type: 'uuid', derived: true },
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
    ],
  },
  invariants: ['uniqueProfessionalSchedule'],
  imports: [],
});

export const scheduleSlot = envelope('valueObject', 'ScheduleSlot', 'pending', [CONSULTA, PROFISSIONAL], {
  valueObjectId: 'ScheduleSlot',
  fields: [
    { name: 'professionalId', type: 'record', ref: 'Profissional' },
    { name: 'scheduledAt', type: 'timestamp' },
  ],
  referencedBy: ['Consulta'],
});

export const consultaPort = envelope('repositoryPort', 'ConsultaRepository', 'pending', [CONSULTA], {
  entityId: 'Consulta',
  interfaceName: 'ConsultaRepository',
  methods: [
    { name: 'list', params: ['ConsultaFilter'], returns: 'Consulta[]' },
  ],
});

export const consultaTable = envelope('table', 'consulta', 'pending', [CONSULTA], {
  tableId: 'consulta',
  entityId: 'Consulta',
  physicalName: 'agendaClinica_consulta',
  primaryKey: ['id'],
  uniqueKeys: [['professionalId', 'scheduledAt']],
  indexes: [
    { name: 'agendaClinica_consulta_professional_scheduled', columns: ['professionalId', 'scheduledAt'], unique: true },
  ],
});

export const consultaAdapter = envelope('repositoryAdapter', 'ConsultaRepository', 'pending', [PORT, TABLE], {
  entityId: 'Consulta',
  portId: 'ConsultaRepository',
  tableId: 'consulta',
  columns: [
    { field: 'id', column: 'id' },
    { field: 'patientId', column: 'patientId' },
    { field: 'professionalId', column: 'professionalId' },
    { field: 'scheduledAt', column: 'scheduledAt' },
  ],
});

export const listConsultaPending = envelope('usecase', 'listConsulta', 'pending', [
  CONSULTA,
  M1_CONTRACT_PROFESSIONAL,
  M1_CONTRACT_RECEPTION,
  PORT,
  M1_PLATFORM_RULES,
], {
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
    output: [
      { name: 'id', type: 'uuid', fieldRef: 'Consulta.id' },
      { name: 'status', type: 'enum', fieldRef: 'Consulta.status' },
    ],
    contractRefs: [
      { route: 'agendaClinica.consultas_profissional.qryListConsulta', symbol: 'ListConsultaOutput' },
    ],
  }],
  routeProjections: [
    {
      route: 'agendaClinica.consultas_profissional.qryListConsulta',
      contractPath: `l2/${MODULE}/web/contracts/consultas_profissional.defs.ts`,
      projection: 'declared',
      outputFields: ['id', 'status'],
    },
    {
      route: 'agendaClinica.consultas_recepcionista.qryListConsulta',
      contractPath: `l2/${MODULE}/web/contracts/consultas_recepcionista.defs.ts`,
      projection: 'declared',
      outputFields: ['id', 'status'],
    },
  ],
  portCalls: ['list'],
  transactional: false,
  effects: [],
  sequence: [
    { kind: 'context', source: 'ctx' },
    { kind: 'port', call: 'list', port: 'ConsultaRepository' },
  ],
  uses: [],
  rules: [{
    ruleId: 'professionalOwnAppointment',
    path: `l4/${MODULE}/rules.defs.ts`,
    symbol: 'professionalOwnAppointment',
  }],
  transaction: { boundary: 'none' },
});

export const consultasController = envelope('httpController', 'consultas_profissional', 'pending', [LIST, SCOPE], {
  pageId: 'consultas_profissional',
  handlers: [{
    route: 'agendaClinica.consultas_profissional.qryListConsulta',
    kind: 'query',
    usecaseId: 'listConsulta',
    grantIds: ['profissionalAgendaDiaria'],
  }],
});

export const accessScope = envelope('accessScope', 'accessScope', 'pending', [CONSULTA], {
  scopeId: 'accessScope',
  grants: [{
    grantId: 'profissionalAgendaDiaria',
    actorRef: 'profissional',
    anchorEntity: 'Consulta',
    entityRefs: ['Consulta'],
    disclosure: 'fullRecord',
  }],
});

export const authorityMap = envelope('authorityMap', 'authorityMap', 'pending', [SCOPE], {
  mapId: 'authorityMap',
  entries: [{ grantId: 'profissionalAgendaDiaria', actorRef: 'profissional' }],
});

export const registration = envelope('repositoryRegistration', 'registerRepositories', 'pending', [ADAPTER], {
  registrationId: 'registerRepositories',
  adapters: [{ portId: 'ConsultaRepository', adapterArtifactId: 'ConsultaRepository' }],
});

export const seeds = envelope('persistenceSeeds', 'seeds', 'pending', [TABLE], {
  seedId: 'seeds',
  scenarios: [{
    scenarioId: 'consulta-unique-slot',
    tableId: 'consulta',
    constraints: ['uniqueKeys:professionalId+scheduledAt'],
  }],
});

export const outbound = envelope('integrationOutbound', 'outbound', 'pending', [CONSULTA], {
  integrationId: 'outbound',
  events: [{
    eventId: 'consultaConfirmada',
    on: 'Consulta.confirmarConsulta',
    entityId: 'Consulta',
    mechanism: '',
    consumer: 'confirmarConsulta',
  }],
});

export const definitionsByType: Record<M1ArtifactType, M1Definition> = {
  domainEntity: consultaEntity,
  valueObject: scheduleSlot,
  repositoryPort: consultaPort,
  table: consultaTable,
  repositoryAdapter: consultaAdapter,
  usecase: listConsultaPending,
  httpController: consultasController,
  accessScope,
  authorityMap,
  repositoryRegistration: registration,
  persistenceSeeds: seeds,
  integrationOutbound: outbound,
};

export const indexedUnits = [
  { defPath: CONSULTA, definition: consultaEntity },
  { defPath: SLOT, definition: scheduleSlot },
  { defPath: PORT, definition: consultaPort },
  { defPath: TABLE, definition: consultaTable },
  { defPath: ADAPTER, definition: consultaAdapter },
  { defPath: LIST, definition: listConsultaPending },
  { defPath: PAGE, definition: consultasController },
  { defPath: SCOPE, definition: accessScope },
  { defPath: AUTHORITY, definition: authorityMap },
  { defPath: REGISTER, definition: registration },
  { defPath: SEEDS, definition: seeds },
  { defPath: OUTBOUND, definition: outbound },
];

export const fixtureIndex: ReferenceIndex = {
  files: [
    ...indexedUnits.map(unit => unit.defPath),
    PACIENTE,
    PROFISSIONAL,
    M1_PLATFORM_RULES,
    M1_CONTRACT_PROFESSIONAL,
    M1_CONTRACT_RECEPTION,
  ].sort(),
  artifacts: [
    { artifactType: 'domainEntity', artifactId: 'Consulta', defPath: CONSULTA },
    { artifactType: 'domainEntity', artifactId: 'Paciente', defPath: PACIENTE },
    { artifactType: 'domainEntity', artifactId: 'Profissional', defPath: PROFISSIONAL },
    { artifactType: 'valueObject', artifactId: 'ScheduleSlot', defPath: SLOT },
    { artifactType: 'repositoryPort', artifactId: 'ConsultaRepository', defPath: PORT },
    { artifactType: 'table', artifactId: 'consulta', defPath: TABLE },
    { artifactType: 'repositoryAdapter', artifactId: 'ConsultaRepository', defPath: ADAPTER },
    { artifactType: 'usecase', artifactId: 'listConsulta', defPath: LIST },
    { artifactType: 'httpController', artifactId: 'consultas_profissional', defPath: PAGE },
    { artifactType: 'accessScope', artifactId: 'accessScope', defPath: SCOPE },
    { artifactType: 'authorityMap', artifactId: 'authorityMap', defPath: AUTHORITY },
    { artifactType: 'repositoryRegistration', artifactId: 'registerRepositories', defPath: REGISTER },
    { artifactType: 'persistenceSeeds', artifactId: 'seeds', defPath: SEEDS },
    { artifactType: 'integrationOutbound', artifactId: 'outbound', defPath: OUTBOUND },
  ],
};

export function withStatus(definition: M1Definition, status: M1Status): M1Definition {
  return { ...definition, status };
}

export function listConsultaReceipt(semanticHash: string): MaterializationReceipt {
  const output = outputOf(LIST);
  return {
    schemaVersion: M1_RECEIPT_SCHEMA,
    runId: 'run-listConsulta-1',
    candidateId: '',
    defPath: LIST,
    artifactType: 'usecase',
    artifactId: 'listConsulta',
    recipeVersion: '2026-09-24-m1-recipe-v1',
    semanticHash,
    dependencyHashes: Object.fromEntries(listConsultaPending.dependencies.map(path => [path, `sha256:${path}`])),
    sourceHashes: { [LIST]: semanticHash },
    outputHashes: { [output]: 'sha256:listConsulta.ts' },
    stage: 'verify',
    verifications: [
      { id: 'compile', kind: 'compile', passed: true, detail: 'usecase compiled' },
      { id: 'hash', kind: 'hash', passed: true, detail: 'outputs match recipe' },
    ],
    failures: [],
    attempts: 1,
    reason: '',
  };
}

export function blockedReceipt(): MaterializationReceipt {
  return {
    ...listConsultaReceipt('sha256:pending'),
    stage: 'plan',
    outputHashes: {},
    verifications: [],
    reason: 'L4 professional access rule is unresolved.',
  };
}

export function failedReceipt(): MaterializationReceipt {
  return {
    ...listConsultaReceipt('sha256:pending'),
    stage: 'generate',
    outputHashes: {},
    verifications: [{ id: 'compile', kind: 'compile', passed: false, detail: 'stub does not typecheck' }],
    failures: [{ code: 'COMPILE', detail: 'Expected 1 argument, got 0.' }],
    attempts: 2,
    reason: 'Repair budget exhausted.',
  };
}

export const LIST_CONSULTA_EXAMPLE = `{
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listConsulta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/consultas_profissional.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
    "_102047_/l4/agendaClinica/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "listConsulta",
    "entityId": "Consulta",
    "operation": "list",
    "ports": ["ConsultaRepository"]
  }
}`;

function outputOf(defPath: string): string {
  return defPath.replace(/\.defs\.ts$/, '.ts');
}

export { CONSULTA, LIST, PORT, TABLE, ADAPTER, PAGE, SCOPE, AUTHORITY, REGISTER, SEEDS, OUTBOUND, SLOT, PACIENTE, PROFISSIONAL };
