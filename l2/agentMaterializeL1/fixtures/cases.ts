/// <mls fileReference="_102021_/l2/agentMaterializeL1/fixtures/cases.ts" enhancement="_blank"/>

import {
  M1_DEFINITION_SCHEMA,
  M1_RECEIPT_SCHEMA,
  type M1ArtifactType,
  type M1Definition,
  type M1Status,
  type MaterializationReceipt,
  type ReferenceIndex,
} from '/_102021_/l2/helpers/l1Defs/definition.js';

export const M1_FIXTURE_PROJECT = 102095;
export const M1_FIXTURE_MODULE = 'reefLog';

const MODULE = M1_FIXTURE_MODULE;
const P = `_${M1_FIXTURE_PROJECT}_`;

export function defPathOf(type: M1ArtifactType, artifactId: string): string {
  switch (type) {
    case 'domainEntity': return `${P}/l1/${MODULE}/layer_3_domain/entities/${artifactId.toLowerCase()}.defs.ts`;
    case 'valueObject': return `${P}/l1/${MODULE}/layer_3_domain/values/${artifactId}.defs.ts`;
    case 'repositoryPort': return `${P}/l1/${MODULE}/layer_2_application/ports/${uncap(artifactId)}.defs.ts`;
    case 'table': return `${P}/l1/${MODULE}/layer_1_external/adapters/persistence/${artifactId}.defs.ts`;
    case 'repositoryAdapter': return `${P}/l1/${MODULE}/layer_1_external/adapters/persistence/${uncap(artifactId)}Adapter.defs.ts`;
    case 'usecase': return `${P}/l1/${MODULE}/layer_2_application/usecases/${artifactId}.defs.ts`;
    case 'httpController': return `${P}/l1/${MODULE}/layer_1_external/adapters/http/controllers/${artifactId}.defs.ts`;
    case 'requestService': return `${P}/l1/${MODULE}/layer_2_application/requests/${artifactId}.defs.ts`;
    case 'accessScope': return `${P}/l1/${MODULE}/layer_1_external/access/${artifactId}.defs.ts`;
    case 'authorityMap': return `${P}/l1/${MODULE}/layer_1_external/access/${artifactId}.defs.ts`;
    case 'repositoryRegistration': return `${P}/l1/${MODULE}/layer_1_external/adapters/persistence/${artifactId}.defs.ts`;
    case 'persistenceSeeds': return `${P}/l1/${MODULE}/layer_1_external/adapters/persistence/${artifactId}.defs.ts`;
    case 'integrationOutbound': return `${P}/l1/${MODULE}/layer_1_external/integration/${artifactId}.defs.ts`;
  }
}

/**
 * Arbitrary ids (m1_40 r3a): one page, one list request, v2 shape as in `testing/oracleModule.ts`.
 * The contract text is not rendered here: fixtures do not import another project
 * (`foreignFixtureImport.test.ts`), and no consumer of this file reads the contract body.
 */
const PAGE_ID = 'keeperDesk';
const GRANT = 'keeperDaily';
export const M1_FIXTURE_ROUTE = `${MODULE}.${PAGE_ID}.buoyRows`;
const CONTRACT_REL = `l2/${MODULE}/web/contracts/${PAGE_ID}.defs.ts`;

export const M1_PLATFORM_RULES = `${P}/l4/${MODULE}/rules.defs.ts`;
export const M1_CONTRACT = `${P}/${CONTRACT_REL}`;

const BUOY = defPathOf('domainEntity', 'Buoy');
const KEEPER = defPathOf('domainEntity', 'Keeper');
const DIVER = defPathOf('domainEntity', 'Diver');
const PORT = defPathOf('repositoryPort', 'BuoyRepository');
const TABLE = defPathOf('table', 'buoy');
const ADAPTER = defPathOf('repositoryAdapter', 'BuoyRepository');
const LIST = defPathOf('usecase', 'listBuoy');
const REQUEST = defPathOf('requestService', PAGE_ID);
const PAGE = defPathOf('httpController', PAGE_ID);
const SCOPE = defPathOf('accessScope', 'accessScope');
const AUTHORITY = defPathOf('authorityMap', 'authorityMap');
const REGISTER = defPathOf('repositoryRegistration', 'registerRepositories');
const SEEDS = defPathOf('persistenceSeeds', 'seeds');
const OUTBOUND = defPathOf('integrationOutbound', 'outbound');
const SLOT = defPathOf('valueObject', 'MooringSlot');

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

export const buoyEntity = envelope('domainEntity', 'Buoy', 'pending', [DIVER, KEEPER], {
  entityId: 'Buoy',
  storageTarget: 'moduleDatabase',
  fields: [
    { name: 'id', type: 'uuid', derived: true },
    { name: 'diverId', type: 'record', ref: 'Diver' },
    { name: 'keeperId', type: 'record', ref: 'Keeper' },
    { name: 'dueAt', type: 'timestamp' },
    { name: 'stage', type: 'enum' },
    { name: 'visitNote', type: 'text' },
  ],
  lifecycle: {
    states: [
      { state: 'moored', reachedBy: 'actor' },
      { state: 'checked', reachedBy: 'actor' },
      { state: 'adrift', reachedBy: 'actor' },
      { state: 'visited', reachedBy: 'actor' },
    ],
    transitions: [
      { transitionId: 'markChecked', from: ['moored'], to: 'checked', by: ['warden'], ruleRefs: ['buoyTransitionFlow'] },
    ],
  },
  invariants: ['uniqueKeeperSlot'],
  imports: [],
});

export const mooringSlot = envelope('valueObject', 'MooringSlot', 'pending', [BUOY, KEEPER], {
  valueObjectId: 'MooringSlot',
  fields: [
    { name: 'keeperId', type: 'record', ref: 'Keeper' },
    { name: 'dueAt', type: 'timestamp' },
  ],
  referencedBy: ['Buoy'],
});

export const buoyPort = envelope('repositoryPort', 'BuoyRepository', 'pending', [BUOY], {
  entityId: 'Buoy',
  interfaceName: 'BuoyRepository',
  methods: [
    { name: 'list', params: ['BuoyFilter'], returns: 'Buoy[]' },
  ],
});

export const buoyTable = envelope('table', 'buoy', 'pending', [BUOY], {
  tableId: 'buoy',
  entityId: 'Buoy',
  physicalName: `${MODULE}_buoy`,
  primaryKey: ['id'],
  uniqueKeys: [['keeperId', 'dueAt']],
  indexes: [
    { name: `${MODULE}_buoy_keeper_due`, columns: ['keeperId', 'dueAt'], unique: true },
  ],
});

export const buoyAdapter = envelope('repositoryAdapter', 'BuoyRepository', 'pending', [PORT, TABLE], {
  entityId: 'Buoy',
  portId: 'BuoyRepository',
  tableId: 'buoy',
  columns: [
    { field: 'id', column: 'id' },
    { field: 'diverId', column: 'diverId' },
    { field: 'keeperId', column: 'keeperId' },
    { field: 'dueAt', column: 'dueAt' },
  ],
});

// v2 usecase: no contractRefs and no routeProjections; the page request names it in `uses`.
export const listBuoyPending = envelope('usecase', 'listBuoy', 'pending', [
  BUOY,
  PORT,
  M1_PLATFORM_RULES,
], {
  usecaseId: 'listBuoy',
  entityId: 'Buoy',
  operation: 'list',
  ports: ['BuoyRepository'],
  rulesApplied: ['keeperOwnBuoy'],
  functions: [{
    functionName: 'listBuoy',
    input: [
      { name: 'keeperId', type: 'record', fieldRef: 'Buoy.keeperId' },
      { name: 'dueAt', type: 'timestamp', fieldRef: 'Buoy.dueAt' },
    ],
    output: [
      { name: 'id', type: 'uuid', fieldRef: 'Buoy.id' },
      { name: 'stage', type: 'enum', fieldRef: 'Buoy.stage' },
    ],
  }],
  portCalls: ['list'],
  transactional: false,
  effects: [],
  sequence: [
    { kind: 'context', source: 'ctx' },
    { kind: 'port', call: 'list', port: 'BuoyRepository' },
  ],
  uses: [],
  rules: [{
    ruleId: 'keeperOwnBuoy',
    path: `l4/${MODULE}/rules.defs.ts`,
    symbol: 'keeperOwnBuoy',
  }],
  transaction: { boundary: 'none' },
});

export const deskService = envelope('requestService', PAGE_ID, 'pending', [LIST], {
  pageId: PAGE_ID,
  requests: [{
    route: M1_FIXTURE_ROUTE,
    kind: 'qry',
    uses: ['listBuoy'],
    transaction: 'none',
    outputs: [{ key: 'buoys', entity: 'Buoy', fields: ['id', 'stage'] }],
    params: [],
  }],
});

// v2 controller: the handler names the service function and the L2 contract, not a usecase.
export const deskController = envelope('httpController', PAGE_ID, 'pending', [AUTHORITY, REQUEST, SCOPE], {
  pageId: PAGE_ID,
  handlers: [{
    route: M1_FIXTURE_ROUTE,
    kind: 'query',
    grantIds: [GRANT],
    serviceFunction: M1_FIXTURE_ROUTE,
    contractPath: CONTRACT_REL,
    contractInterface: 'KeeperDeskContracts',
  }],
});

export const accessScope = envelope('accessScope', 'accessScope', 'pending', [BUOY], {
  scopeId: 'accessScope',
  grants: [{
    grantId: GRANT,
    actorRef: 'keeper',
    anchorEntity: 'Buoy',
    entityRefs: ['Buoy'],
    disclosure: 'fullRecord',
  }],
});

export const authorityMap = envelope('authorityMap', 'authorityMap', 'pending', [SCOPE], {
  mapId: 'authorityMap',
  entries: [{ grantId: GRANT, actorRef: 'keeper' }],
});

export const registration = envelope('repositoryRegistration', 'registerRepositories', 'pending', [ADAPTER], {
  registrationId: 'registerRepositories',
  adapters: [{ portId: 'BuoyRepository', adapterArtifactId: 'BuoyRepository' }],
});

export const seeds = envelope('persistenceSeeds', 'seeds', 'pending', [TABLE], {
  seedId: 'seeds',
  scenarios: [{
    scenarioId: 'buoy-unique-slot',
    tableId: 'buoy',
    constraints: ['uniqueKeys:keeperId+dueAt'],
  }],
});

export const outbound = envelope('integrationOutbound', 'outbound', 'pending', [BUOY], {
  integrationId: 'outbound',
  events: [{
    eventId: 'buoyChecked',
    on: 'Buoy.markChecked',
    entityId: 'Buoy',
    mechanism: '',
    consumer: 'markChecked',
  }],
});

export const definitionsByType: Record<M1ArtifactType, M1Definition> = {
  domainEntity: buoyEntity,
  valueObject: mooringSlot,
  repositoryPort: buoyPort,
  table: buoyTable,
  repositoryAdapter: buoyAdapter,
  usecase: listBuoyPending,
  httpController: deskController,
  requestService: deskService,
  accessScope,
  authorityMap,
  repositoryRegistration: registration,
  persistenceSeeds: seeds,
  integrationOutbound: outbound,
};

export const indexedUnits = [
  { defPath: BUOY, definition: buoyEntity },
  { defPath: SLOT, definition: mooringSlot },
  { defPath: PORT, definition: buoyPort },
  { defPath: TABLE, definition: buoyTable },
  { defPath: ADAPTER, definition: buoyAdapter },
  { defPath: LIST, definition: listBuoyPending },
  { defPath: REQUEST, definition: deskService },
  { defPath: PAGE, definition: deskController },
  { defPath: SCOPE, definition: accessScope },
  { defPath: AUTHORITY, definition: authorityMap },
  { defPath: REGISTER, definition: registration },
  { defPath: SEEDS, definition: seeds },
  { defPath: OUTBOUND, definition: outbound },
];

export const fixtureIndex: ReferenceIndex = {
  files: [
    ...indexedUnits.map(unit => unit.defPath),
    DIVER,
    KEEPER,
    M1_PLATFORM_RULES,
    M1_CONTRACT,
  ].sort(),
  artifacts: [
    { artifactType: 'domainEntity', artifactId: 'Buoy', defPath: BUOY },
    { artifactType: 'domainEntity', artifactId: 'Diver', defPath: DIVER },
    { artifactType: 'domainEntity', artifactId: 'Keeper', defPath: KEEPER },
    { artifactType: 'valueObject', artifactId: 'MooringSlot', defPath: SLOT },
    { artifactType: 'repositoryPort', artifactId: 'BuoyRepository', defPath: PORT },
    { artifactType: 'table', artifactId: 'buoy', defPath: TABLE },
    { artifactType: 'repositoryAdapter', artifactId: 'BuoyRepository', defPath: ADAPTER },
    { artifactType: 'usecase', artifactId: 'listBuoy', defPath: LIST },
    { artifactType: 'requestService', artifactId: PAGE_ID, defPath: REQUEST },
    { artifactType: 'httpController', artifactId: PAGE_ID, defPath: PAGE },
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

export function listBuoyReceipt(semanticHash: string): MaterializationReceipt {
  const output = outputOf(LIST);
  return {
    schemaVersion: M1_RECEIPT_SCHEMA,
    runId: 'run-listBuoy-1',
    candidateId: '',
    defPath: LIST,
    artifactType: 'usecase',
    artifactId: 'listBuoy',
    recipeVersion: '2026-09-24-m1-recipe-v1',
    semanticHash,
    dependencyHashes: Object.fromEntries(listBuoyPending.dependencies.map(path => [path, `sha256:${path}`])),
    sourceHashes: { [LIST]: semanticHash },
    outputHashes: { [output]: 'sha256:listBuoy.ts' },
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
    ...listBuoyReceipt('sha256:pending'),
    stage: 'plan',
    outputHashes: {},
    verifications: [],
    reason: 'L4 professional access rule is unresolved.',
  };
}

export function failedReceipt(): MaterializationReceipt {
  return {
    ...listBuoyReceipt('sha256:pending'),
    stage: 'generate',
    outputHashes: {},
    verifications: [{ id: 'compile', kind: 'compile', passed: false, detail: 'stub does not typecheck' }],
    failures: [{ code: 'COMPILE', detail: 'Expected 1 argument, got 0.' }],
    attempts: 2,
    reason: 'Repair budget exhausted.',
  };
}

export const LIST_BUOY_EXAMPLE = `{
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listBuoy",
  "moduleName": "reefLog",
  "status": "pending",
  "dependencies": [
    "_102095_/l1/reefLog/layer_2_application/ports/buoyRepository.defs.ts",
    "_102095_/l1/reefLog/layer_3_domain/entities/buoy.defs.ts",
    "_102095_/l4/reefLog/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "listBuoy",
    "entityId": "Buoy",
    "operation": "list",
    "ports": ["BuoyRepository"]
  }
}`;

function outputOf(defPath: string): string {
  return defPath.replace(/\.defs\.ts$/, '.ts');
}

export { BUOY, LIST, PORT, TABLE, ADAPTER, REQUEST, PAGE, SCOPE, AUTHORITY, REGISTER, SEEDS, OUTBOUND, SLOT, DIVER, KEEPER };
