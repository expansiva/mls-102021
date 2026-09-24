/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { D1_DEFINITION_SCHEMA, D1_MEASURED_PUBLISH, type D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { D1_FINALIZE_REPAIR, createEntryPipeline, pipelineFile, type D1PipelineState, type D1StepId } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { futureOutputPath, pipelineId, qualifyDefPath, skillPaths, type D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { catalogInfo } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import { D1_INPUT_VERSION, contractPath, type D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { parseFinalizeReport, type D1FinalizeObserved, type D1FinalizeRequest } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { buildD1Finalize } from '/_102021_/l2/agentDefsL1/steps/finalize80/gate.js';
import { assembleD1Finalize } from '/_102021_/l2/agentDefsL1/steps/finalize80/io.js';
import { fieldUses } from '/_102021_/l2/agentDefsL1/steps/usecases50/fidelity.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLINIC_ROOT = path.resolve(HERE, '../../../../../mls-102047');
const CATALOG_DISK = path.resolve(HERE, '../../../../../mls-102034/l4/ontology/mdm.defs.ts');
const CATALOG = '/_102034_/l4/ontology/mdm.defs.ts';
const PLATFORM_USECASES = [
  'createPaciente',
  'createProfissional',
  'createRecepcionista',
  'listRecepcionista',
  'updateProfissional',
  'updateRecepcionista',
];

const PROJECT = 102047;
const MODULE = 'agendaClinica';
const ROUTE = 'agendaClinica.consultas.cmdRegistrarAtendimento';
const CONTRACT = contractPath(MODULE, 'consultas');
const RULES = `l4/${MODULE}/rules.defs.ts`;
const ONTOLOGY = `l4/${MODULE}/ontology/Consulta.defs.ts`;
const INTEGRATION = `l4/${MODULE}/integration.defs.ts`;
const HASH = 'sha256:contract';
const CONTRACT_TEXT = `export interface Out0 { id: string }\nexport const routes = { "${ROUTE}": { "output": "Out0" } } as const;\n`;
const RULES_TEXT = 'export const agendaClinicaRules = { "rules": { "noteRequired": "A note is required." } } as const;\n';
const ONTOLOGY_TEXT = `export const agendaClinicaEntityConsulta = { "entityId": "Consulta", "storage": { "target": "moduleDatabase" }, "record": { "fields": { "id": { "type": "uuid", "derived": true } } }, "transitions": [{ "transitionId": "registrarAtendimento", "payload": ["attendanceNote"], "ruleRefs": ["noteRequired"] }] } as const;\n`;
const INTEGRATION_TEXT = 'export const agendaClinicaIntegration = { "outbound": [{ "id": "atendimentoRegistrado", "event": "atendimentoRegistrado", "on": "Consulta.registrarAtendimento" }] } as const;\n';

const PATHS = {
  consulta: `l1/${MODULE}/layer_3_domain/entities/consulta.defs.ts`,
  paciente: `l1/${MODULE}/layer_3_domain/entities/paciente.defs.ts`,
  port: `l1/${MODULE}/layer_2_application/ports/consultaRepository.defs.ts`,
  table: `l1/${MODULE}/layer_1_external/adapters/persistence/consulta.defs.ts`,
  adapter: `l1/${MODULE}/layer_1_external/adapters/persistence/consultaRepositoryAdapter.defs.ts`,
  usecase: `l1/${MODULE}/layer_2_application/usecases/registrarAtendimento.defs.ts`,
  scope: `l1/${MODULE}/layer_2_application/scope/accessScope.defs.ts`,
  controller: `l1/${MODULE}/layer_1_external/adapters/http/controllers/consultas.defs.ts`,
  authority: `l1/${MODULE}/layer_1_external/auth/authorityMap.defs.ts`,
  registry: `l1/${MODULE}/layer_1_external/adapters/persistence/registerRepositories.defs.ts`,
  integration: `l1/${MODULE}/layer_1_external/adapters/integration/outbound.defs.ts`,
} as const;

function id(type: string, owner: string): string {
  return pipelineId(PROJECT, MODULE, type, owner);
}

function pipe(type: D1PipelineItem['type'], owner: string, logical: string, dependsOn: string[]): D1PipelineItem {
  const defPath = qualifyDefPath(PROJECT, logical);
  const dependsFiles = dependsOn.map(dep => {
    const ownerName = dep.split('/').pop() || '';
    const match = Object.values(PATHS).find(path => path.endsWith(`/${ownerName.charAt(0).toLowerCase()}${ownerName.slice(1)}.defs.ts`) || path.includes(ownerName));
    return match ? qualifyDefPath(PROJECT, match) : dep;
  });
  return {
    id: id(type, owner),
    type,
    defPath,
    outputPath: futureOutputPath(defPath),
    outputAvailability: 'future',
    dependsFiles: dependsOn.length ? dependsFiles : [],
    dependsOn,
    skills: [...skillPaths(type)],
    ...(type === 'httpController' ? { routes: [ROUTE] } : {}),
  };
}

function definition(artifactType: D1Definition['artifactType'], artifactId: string, data: Record<string, unknown>): D1Definition {
  return { schemaVersion: D1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MODULE, data };
}

function sourceOf(definitionValue: D1Definition, item: D1PipelineItem): string {
  const rendered = renderDefinition(definitionValue, [item]);
  if ('issues' in rendered) throw new Error(rendered.issues.join('\n'));
  return rendered.source;
}

function lifecycle(state: string): Record<string, unknown> {
  return { states: [{ state, reachedBy: 'actor' }], transitions: [] };
}

function consultaData(): Record<string, unknown> {
  return {
    entityId: 'Consulta',
    storageTarget: 'moduleDatabase',
    fields: [{ name: 'id', type: 'string', derived: true }, { name: 'status', type: 'string' }],
    lifecycle: {
      states: [
        { state: 'scheduled', reachedBy: 'actor' },
        { state: 'attended', reachedBy: 'command' },
      ],
      transitions: [{
        transitionId: 'registrarAtendimento',
        from: ['scheduled'],
        to: 'attended',
        by: ['command'],
        ruleRefs: ['noteRequired'],
      }],
    },
    invariants: ['noteRequired'],
    imports: [],
  };
}

function pacienteData(): Record<string, unknown> {
  return {
    entityId: 'Paciente',
    storageTarget: 'mdm',
    fields: [{ name: 'id', type: 'string' }],
    lifecycle: lifecycle('active'),
    invariants: [],
    imports: [],
  };
}

function parts(): Array<{ logical: string; definition: D1Definition; item: D1PipelineItem }> {
  const consulta = id('domainEntity', 'Consulta');
  const port = id('repositoryPort', 'ConsultaRepository');
  const table = id('table', 'Consulta');
  const adapter = id('repositoryAdapter', 'ConsultaRepositoryAdapter');
  const usecase = id('usecase', 'registrarAtendimento');
  const scope = id('accessScope', 'accessScope');
  const rows = [
    { logical: PATHS.consulta, definition: definition('domainEntity', 'Consulta', consultaData()), item: pipe('domainEntity', 'Consulta', PATHS.consulta, []) },
    { logical: PATHS.paciente, definition: definition('domainEntity', 'Paciente', pacienteData()), item: pipe('domainEntity', 'Paciente', PATHS.paciente, []) },
    {
      logical: PATHS.port,
      definition: definition('repositoryPort', 'ConsultaRepository', {
        entityId: 'Consulta',
        interfaceName: 'ConsultaRepository',
        methods: [{ name: 'save', params: ['record'], returns: 'void' }],
      }),
      item: pipe('repositoryPort', 'ConsultaRepository', PATHS.port, [consulta]),
    },
    {
      logical: PATHS.table,
      definition: definition('table', 'Consulta', {
        tableId: 'consulta',
        entityId: 'Consulta',
        physicalName: 'consulta',
        primaryKey: ['id'],
        uniqueKeys: [['id']],
        indexes: [],
      }),
      item: pipe('table', 'Consulta', PATHS.table, [consulta]),
    },
    {
      logical: PATHS.adapter,
      definition: definition('repositoryAdapter', 'ConsultaRepositoryAdapter', {
        entityId: 'Consulta',
        portId: 'ConsultaRepository',
        tableId: 'consulta',
        columns: [{ field: 'id', column: 'id' }],
      }),
      item: pipe('repositoryAdapter', 'ConsultaRepositoryAdapter', PATHS.adapter, [port, table]),
    },
    {
      logical: PATHS.usecase,
      definition: definition('usecase', 'registrarAtendimento', {
        usecaseId: 'registrarAtendimento',
        entityId: 'Consulta',
        operation: 'transition',
        ports: ['ConsultaRepository'],
        rulesApplied: ['noteRequired'],
        functions: [{
          functionName: 'registrarAtendimento',
          input: [{ name: 'id', type: 'string' }],
          output: [{ name: 'id', type: 'string' }],
          contractRefs: [{ route: ROUTE, symbol: 'Out0' }],
        }],
        routeProjections: [{ route: ROUTE, contractPath: CONTRACT, projection: 'declared', outputFields: ['id'] }],
        portCalls: ['save'],
        transactional: true,
        effects: [{ eventId: 'atendimentoRegistrado', path: INTEGRATION, symbol: 'atendimentoRegistrado' }],
        sequence: [
          { kind: 'context', source: 'ctx' },
          { kind: 'port', call: 'save', port: 'ConsultaRepository' },
          { kind: 'rule', ruleId: 'noteRequired' },
          { kind: 'transition', transitionId: 'registrarAtendimento', payload: ['attendanceNote'] },
          { kind: 'effect', eventId: 'atendimentoRegistrado' },
          { kind: 'transaction', boundary: 'local' },
        ],
        uses: fieldUses({
          operation: 'transition',
          fields: [{ name: 'id', derived: true }],
          inputPaths: ['id'],
          payloadPaths: ['attendanceNote'],
        }),
        rules: [{ ruleId: 'noteRequired', path: RULES, symbol: 'noteRequired' }],
        transaction: { boundary: 'local' },
        lifecycle: {
          transitionId: 'registrarAtendimento',
          payload: ['attendanceNote'],
          sourcePath: ONTOLOGY,
          symbol: 'registrarAtendimento',
        },
      }),
      item: pipe('usecase', 'registrarAtendimento', PATHS.usecase, [consulta, port, scope]),
    },
    {
      logical: PATHS.scope,
      definition: definition('accessScope', 'accessScope', {
        scopeId: 'accessScope',
        grants: [{
          grantId: 'desk',
          actorRef: 'recepcionista',
          entityRefs: ['Consulta'],
          disclosure: 'fullRecord',
          scopeMode: 'organization',
          session: 'verified',
          path: [],
          pending: '',
        }],
      }),
      item: pipe('accessScope', 'accessScope', PATHS.scope, []),
    },
    {
      logical: PATHS.controller,
      definition: definition('httpController', 'consultas', {
        pageId: 'consultas',
        handlers: [{ route: ROUTE, kind: 'command', usecaseId: 'registrarAtendimento', grantIds: ['desk'] }],
      }),
      item: pipe('httpController', 'consultas', PATHS.controller, [usecase, scope]),
    },
    {
      logical: PATHS.authority,
      definition: definition('authorityMap', 'authorityMap', {
        mapId: 'authorityMap',
        entries: [{ grantId: 'desk', actorRef: 'recepcionista' }],
      }),
      item: pipe('authorityMap', 'authorityMap', PATHS.authority, [scope]),
    },
    {
      logical: PATHS.registry,
      definition: definition('repositoryRegistration', 'registerRepositories', {
        registrationId: 'registerRepositories',
        adapters: [{ portId: 'ConsultaRepository', adapterArtifactId: 'ConsultaRepositoryAdapter' }],
      }),
      item: pipe('repositoryRegistration', 'registerRepositories', PATHS.registry, [adapter]),
    },
    {
      logical: PATHS.integration,
      definition: definition('integrationOutbound', 'outbound', {
        integrationId: 'outbound',
        events: [{
          eventId: 'atendimentoRegistrado',
          on: 'Consulta.registrarAtendimento',
          entityId: 'Consulta',
          mechanism: '',
          consumer: 'registrarAtendimento',
        }],
      }),
      item: pipe('integrationOutbound', 'outbound', PATHS.integration, [usecase]),
    },
  ];
  const usecaseRow = rows.find(row => row.logical === PATHS.usecase);
  if (usecaseRow) usecaseRow.item.dependsFiles = [...usecaseRow.item.dependsFiles, CONTRACT, RULES, ONTOLOGY, INTEGRATION];
  return rows;
}

function observedOf(rows: ReturnType<typeof parts>): D1FinalizeObserved[] {
  return rows.map(row => ({
    defPath: row.logical,
    text: sourceOf(row.definition, row.item),
    currentHash: 'sha256:same',
    receiptHash: 'sha256:same',
    action: 'create',
    ownerRefs: [],
    unitDone: false,
  }));
}

function normalization(code: string): { code: string; path: string; detail: string } {
  return { code, path: 'domain30.enumerations', detail: code };
}

function pipeline(): D1PipelineState {
  const state = createEntryPipeline(PROJECT, MODULE, new Date('2026-09-22T12:00:00.000Z'));
  for (const stepId of ['input20', 'domain30', 'persistence40', 'usecases50', 'controllers60', 'support70'] as const) {
    state.steps[stepId] = { status: 'approved', updatedAt: state.updatedAt, artifactPaths: [] };
  }
  return state;
}

function snapshot(files: D1FinalizeObserved[]): D1InputSnapshot {
  return {
    schemaVersion: D1_INPUT_VERSION,
    project: PROJECT,
    moduleName: MODULE,
    device: 'web',
    plannerRun: null,
    sources: [CONTRACT, RULES, ONTOLOGY, INTEGRATION].map(path => ({
      path, sha256: HASH, bytes: 10, schemaVersion: '', state: 'present' as const,
    })),
    selection: {
      pages: [{ pageId: 'consultas', routes: [ROUTE] }],
      routes: [{ route: ROUTE, page: 'consultas', kind: 'command', usecaseRef: 'registrarAtendimento', status: 'toCreate' }],
      usecases: [{
        usecaseId: 'registrarAtendimento',
        entity: 'Consulta',
        operation: 'transition',
        status: 'toCreate',
        existing: '',
        identity: 'registrarAtendimento',
        routes: [ROUTE],
      }],
      ports: [{ portId: 'ConsultaRepository', entity: 'Consulta', status: 'toCreate' }],
      tables: [{ tableId: 'consulta', entity: 'Consulta', status: 'toCreate' }],
      entities: ['Consulta', 'Paciente'],
      outbound: ['atendimentoRegistrado'],
    },
    files: files.map(file => ({
      id: file.defPath,
      artifactType: artifactTypeOf(file.defPath),
      defPath: file.defPath,
      action: 'create' as const,
      identity: file.defPath,
      ownerRefs: [`path:${file.defPath}`],
      dependsOn: [],
    })),
    removed: [],
    problems: [],
    consumersReleased: true,
    snapshotHash: 'sha256:snap',
  };
}

function artifactTypeOf(logical: string): string {
  if (logical === PATHS.consulta || logical === PATHS.paciente) return 'domainEntity';
  if (logical === PATHS.port) return 'repositoryPort';
  if (logical === PATHS.table) return 'table';
  if (logical === PATHS.adapter) return 'repositoryAdapter';
  if (logical === PATHS.usecase) return 'usecase';
  if (logical === PATHS.controller) return 'httpController';
  if (logical === PATHS.scope) return 'accessScope';
  if (logical === PATHS.authority) return 'authorityMap';
  if (logical === PATHS.registry) return 'repositoryRegistration';
  return 'integrationOutbound';
}

function request(): D1FinalizeRequest {
  const rows = parts();
  const observed = observedOf(rows);
  const consulta = consultaData();
  return {
    project: PROJECT,
    moduleName: MODULE,
    pipeline: pipeline(),
    snapshot: snapshot(observed),
    sourceHashes: { [CONTRACT]: HASH, [RULES]: HASH, [ONTOLOGY]: HASH, [INTEGRATION]: HASH },
    dependencyTexts: {
      [CONTRACT]: CONTRACT_TEXT,
      [RULES]: RULES_TEXT,
      [ONTOLOGY]: ONTOLOGY_TEXT,
      [INTEGRATION]: INTEGRATION_TEXT,
    },
    contracts: { consultas: { path: CONTRACT, text: CONTRACT_TEXT, hash: HASH } },
    drafts: {
      domain30: {
        entities: [
          { entityId: 'Consulta', definition: { data: consulta }, rules: [{ ruleId: 'noteRequired' }] },
          { entityId: 'Paciente', definition: { data: pacienteData() }, rules: [] },
        ],
      },
      persistence40: { normalizations: [normalization('ENUMERATIONS_NOT_CONSUMED')] },
      usecases50: { normalizations: [normalization('ENUMERATIONS_NOT_CONSUMED')] },
      controllers60: { normalizations: [normalization('ENUMERATIONS_NOT_CONSUMED')] },
      support70: {
        normalizations: [normalization('ENUMERATIONS_CONSUMED'), normalization('ENUMERATIONS_NOT_CONSUMED')],
        enumerations: [
          { entityId: 'Consulta', path: 'status', values: ['scheduled', 'attended'], consumed: true },
          { entityId: 'Paciente', path: 'details.identification.subtype', values: ['Person'], consumed: false },
        ],
        problems: [
          { severity: 'review', code: 'INTEGRATION_UNBOUND', path: 'atendimentoRegistrado', message: 'atendimentoRegistrado is preserved. No runtime mechanism is named.' },
          { severity: 'review', code: 'PAYLOAD_UNDECLARED', path: 'registrarAtendimento', message: 'Transition registrarAtendimento cites noteRequired and declares no payload. No payload was invented.' },
        ],
      },
    },
    observed,
    futurePresent: {},
    children: [],
  };
}

function codes(report: { findings: Array<{ code: string; severity: string }> }, code: string): number {
  return report.findings.filter(item => item.code === code).length;
}

void test('a complete defs run still refuses an executable backend and names the open gaps', () => {
  const report = buildD1Finalize(request());
  assert.equal(report.outcome, 'complete');
  assert.equal(report.defsStatus, 'complete');
  assert.equal(report.blocking, '');
  assert.equal(report.executableBackend, false);
  assert.equal(report.repairOpened, false);
  assert.equal(report.llmCalls, 0);
  assert.equal(D1_FINALIZE_REPAIR, false);
  assert.equal(report.materialization, 'pending');
  assert.equal(report.materializationPending.every(item => item.present === false), true);
  assert.equal(codes(report, 'ARTIFACT_ABSENT'), 0);
  assert.equal(report.enumerations.consumed.length, 0);
  const status = report.enumerations.notConsumed.find(item => item.entityId === 'Consulta' && item.path === 'status');
  assert.equal(status?.consumed, false);
  assert.equal(status?.origin.owner, 'unresolved');
  const subtype = report.enumerations.notConsumed.find(item => item.path === 'details.identification.subtype');
  assert.equal(subtype?.entityId, 'Paciente');
  assert.equal(subtype?.consumed, false);
  assert.notEqual(subtype?.origin.owner, 'platform');
  assert.equal(codes(report, 'ENUMERATIONS_NOT_CONSUMED'), 2);
  assert.equal(codes(report, 'INTEGRATION_UNBOUND'), 1);
  assert.equal(report.findings.find(item => item.code === 'PAYLOAD_UNDECLARED')?.ownerRef, 'registrarAtendimento');
  assert.deepEqual(report.declaredNotConsumedBy, ['persistence40', 'usecases50', 'controllers60', 'support70']);
  assert.deepEqual(report.inventory.usecaseIds, ['registrarAtendimento']);
  assert.deepEqual(report.inventory.routes, [ROUTE]);
  assert.deepEqual(report.inventory.portIds, ['ConsultaRepository']);
  assert.deepEqual(report.inventory.tableIds, ['consulta']);
  assert.equal(report.files.every(file => file.action === 'generated'), true);
  const parsed = parseFinalizeReport(`${JSON.stringify(report)}\n`);
  assert.equal(parsed?.outcome, 'complete');
});

void test('a completed child with a missing artifact does not complete', () => {
  const input = request();
  input.children = [{ planId: 'usecases50-worker-registrarAtendimento', status: 'completed', artifactPath: PATHS.usecase, present: false }];
  const report = buildD1Finalize(input);
  assert.equal(report.outcome, 'held');
  assert.equal(codes(report, 'ARTIFACT_ABSENT'), 1);
  assert.match(report.blocking, /ARTIFACT_ABSENT:1/);
});

void test('dropping the scope link or the grant policy does not complete', () => {
  const rows = parts();
  const controller = rows.find(row => row.logical === PATHS.controller);
  const usecase = rows.find(row => row.logical === PATHS.usecase);
  assert.ok(controller && usecase);
  controller.item = {
    ...controller.item,
    dependsOn: controller.item.dependsOn.filter(dep => !dep.endsWith('/accessScope/accessScope')),
    dependsFiles: controller.item.dependsFiles.filter(file => !file.includes('/scope/accessScope.defs.ts')),
  };
  const transitive = request();
  transitive.observed = observedOf(rows);
  const throughUsecase = buildD1Finalize(transitive);
  assert.equal(codes(throughUsecase, 'POLICY_UNBOUND'), 0, throughUsecase.blocking);
  assert.equal(throughUsecase.outcome, 'complete', throughUsecase.blocking);

  usecase.item = {
    ...usecase.item,
    dependsOn: usecase.item.dependsOn.filter(dep => !dep.endsWith('/accessScope/accessScope')),
    dependsFiles: usecase.item.dependsFiles.filter(file => !file.includes('/scope/accessScope.defs.ts')),
  };
  const unbound = request();
  unbound.observed = observedOf(rows);
  const unboundReport = buildD1Finalize(unbound);
  assert.equal(unboundReport.outcome, 'held');
  assert.equal(unboundReport.findings.some(item => item.code === 'POLICY_UNBOUND' && item.ownerRef === 'desk'), true);

  const stripped = request();
  const scope = stripped.observed.find(item => item.defPath === PATHS.scope);
  assert.ok(scope?.text);
  scope.text = scope.text.replace('"scopeMode": "organization",\n', '');
  const strippedReport = buildD1Finalize(stripped);
  assert.equal(strippedReport.outcome, 'held');
  assert.equal(strippedReport.findings.some(item => item.code === 'POLICY_UNBOUND' && item.message.includes('scope mode')), true);
  assert.equal(strippedReport.findings.some(item => item.code === 'SCHEMA_INVALID' && item.message.includes('scopeMode')), true);
});

void test('an orphan dependency does not complete', () => {
  const rows = parts();
  const adapter = rows.find(row => row.logical === PATHS.adapter);
  assert.ok(adapter);
  adapter.item = { ...adapter.item, dependsOn: [...adapter.item.dependsOn, id('domainEntity', 'Missing')] };
  const input = request();
  input.observed = observedOf(rows);
  const report = buildD1Finalize(input);
  assert.equal(report.outcome, 'held');
  assert.ok(codes(report, 'REF_INVALID') >= 1);
});

void test('a definition that is not in the inventory does not complete', () => {
  const input = request();
  const extra = definition('domainEntity', 'Ghost', {
    entityId: 'Ghost',
    storageTarget: 'moduleDatabase',
    fields: [{ name: 'id', type: 'string' }],
    lifecycle: lifecycle('active'),
    invariants: [],
    imports: [],
  });
  const logical = `l1/${MODULE}/layer_3_domain/entities/ghost.defs.ts`;
  const item = pipe('domainEntity', 'Ghost', logical, []);
  input.observed = [...input.observed, {
    defPath: logical,
    text: sourceOf(extra, item),
    currentHash: 'sha256:same',
    receiptHash: '',
    action: '',
    ownerRefs: [],
    unitDone: false,
  }];
  const report = buildD1Finalize(input);
  assert.equal(report.outcome, 'held');
  assert.equal(report.findings.some(finding => finding.code === 'EXTRA_FILE' && finding.ownerRef === 'Ghost'), true);
});

void test('an MDM table does not complete', () => {
  const rows = parts();
  const consulta = rows.find(row => row.logical === PATHS.consulta);
  assert.ok(consulta);
  consulta.definition = definition('domainEntity', 'Consulta', { ...consultaData(), storageTarget: 'mdm' });
  const input = request();
  input.observed = observedOf(rows);
  const report = buildD1Finalize(input);
  assert.equal(report.outcome, 'held');
  assert.equal(codes(report, 'TABLE_MDM'), 1);
});

void test('a persisted outbound that names the MDM queue is not a binding', () => {
  const rows = parts();
  const integration = rows.find(row => row.logical === PATHS.integration);
  assert.ok(integration);
  const data = integration.definition.data as {
    events: Array<{ eventId: string; mechanism: string; mechanismRef?: string }>;
  };
  data.events[0].mechanism = D1_MEASURED_PUBLISH.symbol;
  data.events[0].mechanismRef = D1_MEASURED_PUBLISH.path;
  const input = request();
  const file = input.observed.find(item => item.defPath === PATHS.integration);
  assert.ok(file);
  file.text = sourceOf(integration.definition, integration.item);
  const report = buildD1Finalize(input);
  assert.equal(report.findings.some(item => item.code === 'MECHANISM_INCOMPATIBLE' && item.ownerRef === 'atendimentoRegistrado'), true);
  assert.equal(report.findings.some(item => item.code === 'FICTIONAL_API'), false);
  assert.equal(report.executableBackend, false);

  data.events[0].mechanismRef = 'mls-102034/l1/other.ts';
  file.text = sourceOf(integration.definition, integration.item);
  const wrong = buildD1Finalize(input);
  assert.equal(wrong.findings.some(item => item.code === 'MECHANISM_REF' && item.ownerRef === 'atendimentoRegistrado'), true);
  assert.equal(wrong.findings.some(item => item.code === 'MECHANISM_INCOMPATIBLE'), true);
  assert.equal(wrong.outcome, 'held');

  data.events[0].mechanism = 'ctx.publishEvent';
  delete data.events[0].mechanismRef;
  file.text = sourceOf(integration.definition, integration.item);
  const fictional = buildD1Finalize(input);
  assert.equal(fictional.findings.some(item => item.code === 'FICTIONAL_API'), true);
  assert.equal(fictional.findings.some(item => item.code === 'MECHANISM_INCOMPATIBLE'), false);
  assert.equal(fictional.outcome, 'held');
});

void test('a lost event or rule does not complete', () => {
  const rows = parts();
  const integration = rows.find(row => row.logical === PATHS.integration);
  const consulta = rows.find(row => row.logical === PATHS.consulta);
  assert.ok(integration && consulta);
  integration.definition = definition('integrationOutbound', 'outbound', { integrationId: 'outbound', events: [] });
  consulta.definition = definition('domainEntity', 'Consulta', { ...consultaData(), invariants: [], lifecycle: { ...(consultaData().lifecycle as object), transitions: [] } });
  const input = request();
  input.observed = observedOf(rows);
  const report = buildD1Finalize(input);
  assert.equal(report.outcome, 'held');
  assert.equal(codes(report, 'EVENT_LOST'), 1);
  assert.equal(codes(report, 'RULE_LOST'), 1);
});

void test('a changed rule source is the existing stale check', () => {
  const input = request();
  input.sourceHashes[RULES] = 'sha256:changed';
  const report = buildD1Finalize(input);
  assert.equal(report.outcome, 'held');
  assert.equal(report.findings.some(item => item.code === 'STALE' && item.path === RULES), true);
});

void test('a receipt mismatch and a divergent L2 contract do not complete', () => {
  const stale = request();
  const file = stale.observed.find(item => item.defPath === PATHS.consulta);
  assert.ok(file);
  file.currentHash = 'sha256:now';
  const staleReport = buildD1Finalize(stale);
  assert.equal(staleReport.outcome, 'held');
  assert.equal(codes(staleReport, 'STALE'), 1);

  const divergent = request();
  divergent.contracts.consultas = { ...divergent.contracts.consultas, hash: 'sha256:other' };
  const divergentReport = buildD1Finalize(divergent);
  assert.equal(divergentReport.outcome, 'held');
  assert.ok(codes(divergentReport, 'CONTRACT_DIVERGENT') >= 1);
});

void test('an absent L2 contract is a real pending and a missing future output is not', () => {
  const absent = request();
  absent.contracts.consultas = { path: CONTRACT, text: null, hash: '' };
  const absentReport = buildD1Finalize(absent);
  assert.equal(absentReport.outcome, 'held');
  assert.equal(codes(absentReport, 'CONTRACT_ABSENT'), 1);
  assert.equal(absentReport.executableBackend, false);

  const pending = request();
  const pendingReport = buildD1Finalize(pending);
  assert.equal(pendingReport.outcome, 'complete');
  assert.equal(pendingReport.materializationPending.length > 0, true);
  assert.equal(pendingReport.materializationPending.some(item => item.present), false);
});

void test('a run held at input20 does not claim the later phases ran', () => {
  const state = createEntryPipeline(PROJECT, MODULE, new Date('2026-09-22T04:41:26.070Z'));
  state.status = 'awaitingStep';
  state.awaitingStep = 'input20';
  state.steps.input20 = {
    status: 'failed',
    updatedAt: state.updatedAt,
    artifactPaths: [`_${PROJECT}_/l1/${MODULE}/pipeline/agentDefsL1/input.json`],
    error: 'CONTRACT_ABSENT:6',
  };
  const problems: D1InputSnapshot['problems'] = Array.from({ length: 6 }, (_, index) => ({
    severity: 'error' as const,
    code: 'CONTRACT_ABSENT',
    path: contractPath(MODULE, `page${index}`),
    message: `L2 contract for page${index} is absent.`,
    ownerRef: `page${index}`,
  }));
  problems.push(
    { severity: 'review', code: 'INTEGRATION_UNBOUND', path: 'integration.defs.ts', message: 'Outbound consultaConfirmada is preserved.', ownerRef: 'consultaConfirmada' },
    { severity: 'review', code: 'INTEGRATION_UNBOUND', path: 'integration.defs.ts', message: 'Outbound faltaPacienteRegistrada is preserved.', ownerRef: 'faltaPacienteRegistrada' },
    { severity: 'review', code: 'INTEGRATION_UNBOUND', path: 'integration.defs.ts', message: 'Outbound atendimentoRegistrado is preserved.', ownerRef: 'atendimentoRegistrado' },
    { severity: 'review', code: 'PAYLOAD_UNDECLARED', path: `l4/${MODULE}/ontology/Consulta.defs.ts`, message: 'Transition registrarAtendimento declares no payload.', ownerRef: 'registrarAtendimento' },
  );
  const input = request();
  input.pipeline = state;
  input.observed = [];
  input.snapshot = {
    ...snapshot([]),
    files: [{
      id: 'usecase:registrarAtendimento',
      artifactType: 'usecase',
      defPath: PATHS.usecase,
      action: 'create',
      identity: 'registrarAtendimento',
      ownerRefs: ['usecase:registrarAtendimento'],
      dependsOn: [],
    }],
    problems,
    consumersReleased: false,
    selection: { ...snapshot([]).selection, outbound: ['consultaConfirmada', 'faltaPacienteRegistrada', 'atendimentoRegistrado'] },
  };
  const report = buildD1Finalize(input);
  assert.equal(report.outcome, 'held');
  assert.equal(report.defsStatus, 'notRun');
  assert.equal(report.blocking, 'CONTRACT_ABSENT:6');
  assert.equal(report.phases.find(phase => phase.stepId === 'domain30')?.executed, false);
  assert.equal(report.phases.find(phase => phase.stepId === 'support70')?.executed, false);
  assert.equal(report.phases.find(phase => phase.stepId === 'finalize80')?.executed, false);
  assert.equal(report.files.some(file => file.action === 'generated'), false);
  assert.equal(report.files[0]?.action, 'notGenerated');
  assert.equal(report.enumerations.consumed.length, 0);
  assert.equal(codes(report, 'ENUMERATIONS_CONSUMED'), 0);
  assert.equal(codes(report, 'INTEGRATION_UNBOUND'), 3);
  assert.equal(report.findings.find(item => item.code === 'PAYLOAD_UNDECLARED')?.ownerRef, 'registrarAtendimento');
  assert.equal(report.executableBackend, false);
  assert.equal(report.repairOpened, false);
  for (const stepId of ['domain30', 'persistence40', 'usecases50', 'controllers60', 'support70'] as D1StepId[]) {
    assert.equal(report.phases.find(phase => phase.stepId === stepId)?.status, 'absent', stepId);
  }
});

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs).map(rel => path.join(name, rel)));
    else out.push(name);
  }
  return out;
}

function seedDisplay(host: TestHost, project: number, display: string, abs: string): boolean {
  const info = fileInfoFromDisplay(project, display);
  if (!info) return false;
  seed(host, info, readFileSync(abs, 'utf8'));
  return true;
}

function seedClinic(): TestHost {
  const host = installStudio(PROJECT);
  const l1 = path.join(CLINIC_ROOT, 'l1/agendaClinica');
  for (const rel of walkFiles(l1)) {
    const display = `l1/agendaClinica/${rel.split(path.sep).join('/')}`;
    seedDisplay(host, PROJECT, display, path.join(l1, rel));
  }
  const input = JSON.parse(readFileSync(path.join(l1, 'pipeline/agentDefsL1/input.json'), 'utf8')) as { sources: Array<{ path: string }> };
  for (const source of input.sources) {
    const abs = path.join(CLINIC_ROOT, source.path);
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    seedDisplay(host, PROJECT, source.path, abs);
  }
  const catalog = catalogInfo(CATALOG);
  assert.ok(catalog);
  seed(host, catalog, readFileSync(CATALOG_DISK, 'utf8'));
  return host;
}

void test('the six real usecases approve when the platform catalog is on disk', async () => {
  seedClinic();
  const assembled = await assembleD1Finalize(PROJECT, MODULE);
  assert.ok(!('refusal' in assembled), 'refusal' in assembled ? assembled.refusal : '');
  const opened = assembled.request.dependencyTexts[CATALOG];
  assert.equal(typeof opened, 'string');
  assert.match(opened, /rule-foreign-namespace-refused/);
  const report = buildD1Finalize(assembled.request);
  assert.equal(report.outcome, 'complete', report.blocking);
  assert.equal(report.defsStatus, 'complete');
  assert.equal(report.phases.find(phase => phase.stepId === 'finalize80')?.status, 'approved');
  assert.equal(codes(report, 'REF_INVALID'), 0);
  assert.equal(codes(report, 'SOURCE_ABSENT'), 0);
  for (const usecaseId of PLATFORM_USECASES) assert.ok(report.inventory.usecaseIds.includes(usecaseId), usecaseId);
  assert.equal(report.inventory.usecaseIds.some(id => id.toLowerCase().includes('contato')), false);
  const status = report.enumerations.consumed.find(item => item.entityId === 'Consulta' && item.path === 'status');
  assert.equal(status?.uses.some(use => use.purpose === 'seedScenario'), true);
  const docType = report.enumerations.consumed.find(item => item.entityId === 'Recepcionista' && item.path === 'details.identification.docType');
  assert.equal(docType?.origin.catalogValues.length, 9);
  assert.deepEqual(docType?.values, ['CPF', 'Passport', 'NationalId', 'Other']);
  assert.equal(docType?.origin.restriction, 'subset');
  assert.equal(docType?.uses.some(use => use.purpose === 'usecaseDef' || use.purpose === 'routeContract'), true);
  const phone = report.enumerations.notConsumed.find(item => item.entityId === 'ContatoPaciente' && item.path === 'details.contactChannel.contactType');
  assert.equal(phone?.origin.restriction, 'subset');
  assert.equal(phone?.consumed, false);
  assert.equal(report.findings.some(item => item.code === 'ENUMERATION_RESTRICTION' && item.ownerRef === 'ContatoPaciente details.contactChannel.contactType'), true);
  const subtype = [...report.enumerations.consumed, ...report.enumerations.notConsumed]
    .find(item => item.entityId === 'Recepcionista' && item.path === 'details.identification.subtype');
  assert.equal(subtype?.origin.roleBinding, true);
  assert.equal(subtype?.uses.every(use => use.editable === false), true);
  const derived = [...report.enumerations.consumed, ...report.enumerations.notConsumed]
    .find(item => item.entityId === 'Recepcionista' && item.path === 'details.identification.status');
  assert.equal(derived?.origin.derived, true);
  assert.equal(derived?.uses.every(use => use.editable === false), true);
  assert.equal(JSON.stringify(report), JSON.stringify(buildD1Finalize(assembled.request)));
  assert.equal(report.materializationPending.some(item => item.outputPath.includes('102034')), false);
  assert.equal(report.executableBackend, false);
});

void test('a missing read source and a missing symbol stay refused', async () => {
  seedClinic();
  const assembled = await assembleD1Finalize(PROJECT, MODULE);
  assert.ok(!('refusal' in assembled));
  const missing = '/_102034_/l4/ontology/missing.defs.ts';
  const otherProject = '/_999999_/l4/ontology/mdm.defs.ts';
  const absentPath = rewriteCatalog(assembled.request, missing);
  const absent = buildD1Finalize(absentPath);
  assert.equal(absent.outcome, 'held');
  assert.ok(codes(absent, 'REF_INVALID') >= 1);
  assert.ok(codes(absent, 'SOURCE_ABSENT') >= 1);
  assert.equal(absent.findings.some(item => item.code === 'REF_INVALID' && item.path === missing), true);
  assert.equal(absent.findings.some(item => item.message.includes(missing)), true);

  const foreign = buildD1Finalize(rewriteCatalog(assembled.request, otherProject));
  assert.equal(foreign.outcome, 'held');
  assert.equal(foreign.findings.some(item => item.code === 'REF_INVALID' && item.path === otherProject), true);
  assert.equal(foreign.findings.some(item => item.code === 'SOURCE_ABSENT' && item.message.includes(otherProject)), true);
  assert.equal(foreign.findings.some(item => item.path === CATALOG && item.severity === 'error'), false);

  const symbol = rewriteSymbol(assembled.request);
  const unread = buildD1Finalize(symbol);
  assert.equal(unread.outcome, 'held');
  assert.ok(codes(unread, 'RULE_TEXT_ABSENT') >= 1);
  assert.equal(codes(unread, 'SOURCE_ABSENT'), 0);
  assert.equal(codes(unread, 'REF_INVALID'), 0);
});

void test('a read source is opened from the project the path names', async () => {
  const host = installStudio(PROJECT);
  const state = createEntryPipeline(PROJECT, MODULE, new Date('2026-09-23T12:00:00.000Z'));
  await writeJson(pipelineFile(PROJECT, MODULE), state);
  const present = '/_102099_/l4/ontology/mdm.defs.ts';
  const absent = '/_102099_/l4/ontology/absent.defs.ts';
  const rows = parts();
  const usecase = rows.find(row => row.logical === PATHS.usecase);
  assert.ok(usecase);
  usecase.item.dependsFiles = [...usecase.item.dependsFiles, present, absent];
  const info = fileInfoFromDisplay(PROJECT, PATHS.usecase);
  assert.ok(info);
  seed(host, info, sourceOf(usecase.definition, usecase.item));
  const catalog = catalogInfo(present);
  assert.ok(catalog);
  assert.equal(catalog.project, 102099);
  seed(host, catalog, 'export const foreignCatalog = { "rules": { "kept": "A declared rule." } } as const;\n');
  const assembled = await assembleD1Finalize(PROJECT, MODULE);
  assert.ok(!('refusal' in assembled), 'refusal' in assembled ? assembled.refusal : '');
  assert.match(assembled.request.dependencyTexts[present] || '', /A declared rule/);
  assert.equal(assembled.request.dependencyTexts[absent], undefined);
  assert.equal(fileKey(catalog).startsWith('102099_'), true);
});

function rewriteCatalog(request: D1FinalizeRequest, next: string): D1FinalizeRequest {
  const copy = structuredClone(request);
  delete copy.dependencyTexts[next];
  for (const item of copy.observed) {
    if (!item.text?.includes(CATALOG)) continue;
    item.text = item.text.replaceAll(CATALOG, next);
  }
  return copy;
}

function rewriteSymbol(request: D1FinalizeRequest): D1FinalizeRequest {
  const copy = structuredClone(request);
  let changed = false;
  for (const item of copy.observed) {
    if (!item.text?.includes('"symbol": "rule-foreign-namespace-refused"')) continue;
    item.text = item.text.replace('"symbol": "rule-foreign-namespace-refused"', '"symbol": "rule-not-in-catalog"');
    changed = true;
    break;
  }
  assert.equal(changed, true);
  return copy;
}
