/// <mls fileReference="_102021_/l2/agentDefsL1/steps/persistence40/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  D1_DEFINITION_SCHEMA,
  type D1PortMethod,
  type D1TableData,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { D1_DOMAIN_VERSION, type D1DomainBuild } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import { buildD1Domain, type D1DomainRequest } from '/_102021_/l2/agentDefsL1/steps/domain30/gate.js';
import {
  bindingRoundTripIssues,
  fieldFromColumn,
  uncoveredMethods,
  type D1PersistenceRequest,
} from '/_102021_/l2/agentDefsL1/steps/persistence40/contracts.js';
import { applicationAdapterIssues, buildD1Persistence } from '/_102021_/l2/agentDefsL1/steps/persistence40/gate.js';
import { commitD1Persistence } from '/_102021_/l2/agentDefsL1/steps/persistence40/io.js';
import {
  MEASURED_TABLE_NAME,
  MEASURED_TABLE_REF,
  changeOrderEntity,
  noteEntity,
  roleEntity,
} from '/_102021_/l2/agentDefsL1/steps/persistence40/fixtures/cases.js';
import { lowerFirst, type D1InputArtifacts, type D1InputSnapshot, type D1SourceDigest } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { fileInfoFromDisplay, parseD1Source, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, '../input20/fixtures/head');
const MEASURED_DIR = path.join(HERE, '../../../../../mls-102046/l1/buildFlowFsm/layer_1_external/adapters/persistence');
const MODULE = 'agendaClinica';
const PROJECT = 102047;

function walk(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

function logical(rel: string): string {
  return rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
}

async function loadHead(): Promise<D1InputArtifacts> {
  const sources: D1SourceDigest[] = [];
  const parsed = new Map<string, unknown>();
  for (const rel of walk(FIXTURE, '')) {
    const file = logical(rel);
    const text = readFileSync(path.join(FIXTURE, rel), 'utf8');
    const kind = file.endsWith('.defs.ts') ? 'defs' : 'json';
    const value = parseD1Source(text, kind);
    sources.push({
      path: file,
      sha256: await sha256Text(text),
      bytes: new TextEncoder().encode(text).length,
      schemaVersion: value && typeof value === 'object' && !Array.isArray(value) ? String((value as { schemaVersion?: string }).schemaVersion || '') : '',
      state: value ? 'present' : 'invalid',
    });
    parsed.set(file, value);
  }
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const [file, value] of parsed) {
    if (file.includes('/journeys/') && !file.endsWith('/index.defs.ts')) journeys[path.basename(file, '.defs.ts')] = value;
    if (file.includes('/ontology/') && !file.endsWith('/index.defs.ts')) entities[path.basename(file, '.defs.ts')] = value;
  }
  const root = `l4/${MODULE}`;
  return {
    sources,
    module: parsed.get(`${root}/module.defs.ts`) ?? null,
    journeyIndex: parsed.get(`${root}/journeys/index.defs.ts`) ?? null,
    journeys,
    ontologyIndex: parsed.get(`${root}/ontology/index.defs.ts`) ?? null,
    entities,
    rules: parsed.get(`${root}/rules.defs.ts`) ?? null,
    workflows: parsed.get(`${root}/workflows.defs.ts`) ?? null,
    access: parsed.get(`${root}/access.defs.ts`) ?? null,
    integration: parsed.get(`${root}/integration.defs.ts`) ?? null,
    menu: parsed.get(`${root}/pool/l2/web/menu.json`) ?? null,
    needs: parsed.get(`${root}/pool/l1/web/needs.json`) ?? null,
    backend: parsed.get(`${root}/pool/l2/web/backend.json`) ?? null,
    effort: parsed.get(`${root}/pool/l2/web/effort.json`) ?? null,
    planner: parsed.get(`l1/${MODULE}/pipeline/pipeline.json`) ?? null,
    contracts: {},
    presentDefs: [],
  };
}

function agendaDomain(artifacts: D1InputArtifacts, snapshot: D1InputSnapshot): D1DomainBuild {
  const request: D1DomainRequest = {
    project: PROJECT,
    moduleName: MODULE,
    selection: {
      entities: snapshot.selection.entities,
      tables: snapshot.selection.tables.map(table => ({ tableId: table.tableId, entity: table.entity })),
      files: snapshot.files.map(file => ({
        artifactType: file.artifactType,
        identity: file.identity,
        defPath: file.defPath,
        action: file.action,
      })),
    },
    entities: artifacts.entities,
    ontologyIndex: artifacts.ontologyIndex,
    rules: artifacts.rules,
    catalogs: {},
  };
  return buildD1Domain(request);
}

function agendaRequest(artifacts: D1InputArtifacts, snapshot: D1InputSnapshot, domain: D1DomainBuild): D1PersistenceRequest {
  return {
    project: PROJECT,
    moduleName: MODULE,
    selection: {
      ports: snapshot.selection.ports.map(port => ({ portId: port.portId, entity: port.entity, status: port.status })),
      tables: snapshot.selection.tables.map(table => ({ tableId: table.tableId, entity: table.entity, status: table.status })),
      usecases: snapshot.selection.usecases.map(usecase => ({
        usecaseId: usecase.usecaseId,
        entity: usecase.entity,
        operation: usecase.operation,
        status: usecase.status,
      })),
      files: snapshot.files.map(file => ({
        artifactType: file.artifactType,
        identity: file.identity,
        defPath: file.defPath,
        action: file.action,
      })),
    },
    domain,
    entities: artifacts.entities,
    preservedPorts: {},
    physicalCitations: {},
    catalogsRead: [],
  };
}

function codes(build: { problems: Array<{ severity: string; code: string }> }, severity: 'error' | 'review'): string[] {
  return build.problems.filter(problem => problem.severity === severity).map(problem => problem.code);
}

interface Planned {
  moduleName: string;
  entityId: string;
  tableId: string;
  portId: string;
  entities: Record<string, unknown>;
  storageTarget?: string;
  uniqueKeys?: string[][];
  operations?: string[];
  portAction?: string;
  citations?: string[];
  preserved?: unknown;
  catalogsRead?: string[];
}

function planned(input: Planned): D1PersistenceRequest {
  const moduleName = input.moduleName;
  const token = lowerFirst(input.entityId);
  const domainPath = `l1/${moduleName}/layer_3_domain/entities/${token}.defs.ts`;
  const portPath = `l1/${moduleName}/layer_2_application/ports/${token}Repository.defs.ts`;
  const tablePath = `l1/${moduleName}/layer_1_external/adapters/persistence/${input.tableId}.defs.ts`;
  const adapterPath = `l1/${moduleName}/layer_1_external/adapters/persistence/${token}RepositoryAdapter.defs.ts`;
  const operations = input.operations || ['create'];
  const domain: D1DomainBuild = {
    schemaVersion: D1_DOMAIN_VERSION,
    project: PROJECT,
    moduleName,
    llmCalls: 0,
    ok: true,
    entities: [{
      entityId: input.entityId,
      action: 'create',
      defPath: domainPath,
      storageTarget: input.storageTarget || 'moduleDatabase',
      emitsLocalPersistence: false,
      derivedInitial: null,
      uniqueKeys: input.uniqueKeys || [],
      enumerations: [],
      rules: [],
      definition: null,
    }],
    valueObjects: [],
    problems: [],
    normalizations: [],
    preserved: [],
    removed: [],
    emit: [],
  };
  return {
    project: PROJECT,
    moduleName,
    selection: {
      ports: [{ portId: input.portId, entity: input.entityId, status: 'toCreate' }],
      tables: [{ tableId: input.tableId, entity: input.entityId, status: 'toCreate' }],
      usecases: operations.map(operation => ({
        usecaseId: `${operation}${input.entityId}`,
        entity: input.entityId,
        operation,
        status: 'toCreate',
      })),
      files: [
        { artifactType: 'domainEntity', identity: input.entityId, defPath: domainPath, action: 'create' },
        { artifactType: 'repositoryPort', identity: input.portId, defPath: portPath, action: input.portAction || 'create' },
        { artifactType: 'table', identity: input.tableId, defPath: tablePath, action: 'create' },
        { artifactType: 'repositoryAdapter', identity: input.portId, defPath: adapterPath, action: 'create' },
      ],
    },
    domain,
    entities: input.entities,
    preservedPorts: input.preserved ? { [portPath]: input.preserved } : {},
    physicalCitations: input.citations ? { [input.entityId]: input.citations } : {},
    catalogsRead: input.catalogsRead || [],
  };
}

function portBytes(entityId: string, portId: string, methods: D1PortMethod[]): unknown {
  return {
    schemaVersion: D1_DEFINITION_SCHEMA,
    artifactType: 'repositoryPort',
    artifactId: portId,
    moduleName: 'sampleModule',
    data: { entityId, interfaceName: portId, methods },
  };
}

void test('Consulta emits one port, one table and one adapter', async () => {
  const artifacts = await loadHead();
  const snapshot = buildD1InputSnapshot({ project: PROJECT, moduleName: MODULE }, artifacts, null);
  const domain = agendaDomain(artifacts, snapshot);
  assert.equal(domain.ok, true, JSON.stringify(domain.problems.filter(problem => problem.severity === 'error')));
  const request = agendaRequest(artifacts, snapshot, domain);
  const first = buildD1Persistence(request);
  const second = buildD1Persistence(request);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.llmCalls, 0);
  assert.equal(first.ok, true, JSON.stringify(first.problems.filter(problem => problem.severity === 'error')));
  assert.equal(first.ports.length, 1);
  assert.equal(first.tables.length, 1);
  assert.equal(first.adapters.length, 1);
  assert.equal(first.emit.length, 3);
  assert.deepEqual(first.emit.map(part => part.definition.artifactType).sort(), ['repositoryAdapter', 'repositoryPort', 'table']);
  assert.equal(first.emit.some(part => part.definition.artifactType === 'persistenceSeeds' || part.definition.artifactType === 'repositoryRegistration'), false);
  assert.equal(first.normalizations.some(item => item.code === 'OUT_OF_STEP'), true);

  const table = first.tables[0].definition!.data as unknown as D1TableData;
  assert.equal(table.tableId, 'consulta');
  assert.equal(table.entityId, 'Consulta');
  assert.equal(table.physicalName, 'agendaClinica_consulta');
  assert.deepEqual(table.primaryKey, ['id']);
  assert.deepEqual(table.uniqueKeys, [['professionalId', 'scheduledAt']]);
  assert.deepEqual(table.indexes.filter(index => index.unique).map(index => index.columns), [['professionalId', 'scheduledAt']]);
  assert.equal(table.physicalName.includes('consultas'), false);
  assert.equal(JSON.stringify(table).includes('professional_id'), false);

  const port = first.ports[0];
  const adapter = first.adapters[0];
  assert.deepEqual(port.methods.map(method => method.name), ['create', 'list', 'transition']);
  assert.deepEqual(adapter.methods.map(method => method.name), port.methods.map(method => method.name));
  assert.deepEqual(uncoveredMethods(port.methods.map(method => method.name), adapter.methods.map(method => method.name)), []);
  assert.equal(adapter.tableId, 'consulta');
  assert.notEqual(adapter.tableId, table.physicalName);
  assert.deepEqual(bindingRoundTripIssues(adapter.bindings), []);

  const version = adapter.bindings.find(binding => binding.field === 'version');
  const note = adapter.bindings.find(binding => binding.field === 'details.attendanceNote');
  const id = adapter.bindings.find(binding => binding.field === 'id');
  assert.equal(version?.column, 'json:version');
  assert.equal(version?.nullable, false);
  assert.equal(fieldFromColumn(version?.column || ''), 'version');
  assert.equal(note?.column, 'json:details.attendanceNote');
  assert.equal(note?.nullable, true);
  assert.equal(fieldFromColumn(note?.column || ''), 'details.attendanceNote');
  assert.equal(id?.column, 'id');
  assert.equal(id?.nullable, false);
  assert.equal(id?.placement, 'column');

  const statusEnum = first.enumerations.find(item => item.entityId === 'Consulta' && item.path === 'status');
  const subtype = first.enumerations.find(item => item.entityId === 'Paciente' && item.path === 'details.identification.subtype');
  assert.equal(first.enumerations.every(item => item.consumed === false), true);
  assert.ok(statusEnum);
  assert.equal(statusEnum?.source, 'domain30.enumerations');
  assert.deepEqual(subtype?.values, ['Person']);
  assert.equal(first.uniqueKeys.find(item => item.entityId === 'Consulta')?.consumed, true);
  assert.equal(first.uniqueKeys.find(item => item.entityId === 'Consulta')?.placedOn, 'table.data.uniqueKeys');
  assert.equal(first.ports.some(item => item.entityId !== 'Consulta'), false);
  assert.equal(first.tables.some(item => item.entityId !== 'Consulta'), false);

  const portEmit = first.emit.find(part => part.definition.artifactType === 'repositoryPort');
  assert.ok(portEmit);
  assert.deepEqual(applicationAdapterIssues(portEmit.pipeline[0]), []);
  const rendered = renderDefinition(portEmit.definition, portEmit.pipeline[0]?.defPath || '');
  assert.equal('issues' in rendered, false);
  if (!('issues' in rendered)) {
    assert.equal(rendered.source.includes('import '), false);
    assert.equal(rendered.source.includes('RepositoryAdapter'), false);
    assert.equal(rendered.source.includes('agentChangeBackend'), false);
  }
});

void test('a missing adapter method is visible to the coverage check', () => {
  assert.deepEqual(uncoveredMethods(['create', 'list'], ['create']), ['list']);
});

void test('change_order does not bind to change_orders', () => {
  const tableText = readFileSync(path.join(MEASURED_DIR, 'changeOrder.defs.ts'), 'utf8');
  const adapterText = readFileSync(path.join(MEASURED_DIR, 'changeOrderRepositoryAdapter.defs.ts'), 'utf8');
  assert.equal(tableText.includes(`"tableName": "${MEASURED_TABLE_NAME}"`), true);
  assert.equal(adapterText.includes(`"tableRef": "${MEASURED_TABLE_REF}"`), true);
  assert.notEqual(MEASURED_TABLE_NAME, MEASURED_TABLE_REF);

  const refused = buildD1Persistence(planned({
    moduleName: 'sampleModule',
    entityId: 'ChangeOrder',
    tableId: 'changeOrder',
    portId: 'ChangeOrderRepository',
    entities: changeOrderEntity,
    citations: [MEASURED_TABLE_REF],
  }));
  assert.equal(refused.ok, false);
  assert.equal(refused.emit.length, 0);
  assert.equal(codes(refused, 'error').includes('DIVERGENT_BINDING'), true);
  for (const problem of refused.problems) {
    assert.equal(problem.message.includes('agentChangeBackend'), false);
    assert.equal(problem.message.includes('agentCb'), false);
  }

  const kept = buildD1Persistence(planned({
    moduleName: 'sampleModule',
    entityId: 'ChangeOrder',
    tableId: 'changeOrder',
    portId: 'ChangeOrderRepository',
    entities: changeOrderEntity,
  }));
  assert.equal(kept.ok, true, JSON.stringify(kept.problems));
  const table = kept.tables[0].definition!.data as unknown as D1TableData;
  assert.equal(table.physicalName, MEASURED_TABLE_NAME);
  assert.equal(kept.adapters[0].tableId, 'changeOrder');
  assert.equal(JSON.stringify(kept.emit).includes(MEASURED_TABLE_REF), false);
});

void test('a preserved port stays put and an incompatible one is diagnosed', async () => {
  const create: D1PortMethod = { name: 'create', params: ['Note'], returns: 'Note' };
  const list: D1PortMethod = { name: 'list', params: ['NoteFilter'], returns: 'Note[]' };
  const portPath = 'l1/sampleModule/layer_2_application/ports/noteRepository.defs.ts';
  const broken = buildD1Persistence(planned({
    moduleName: 'sampleModule',
    entityId: 'Note',
    tableId: 'note',
    portId: 'NoteRepository',
    entities: noteEntity,
    operations: ['create', 'list'],
    portAction: 'preserve',
    preserved: portBytes('Note', 'NoteRepository', [create]),
  }));
  assert.equal(broken.ok, false);
  assert.equal(broken.emit.length, 0);
  assert.equal(codes(broken, 'error').includes('PORT_INCOMPATIBLE'), true);
  assert.match(broken.problems.find(problem => problem.code === 'PORT_INCOMPATIBLE')?.message || '', /does not implement list/);

  const host = installStudio(PROJECT);
  const info = fileInfoFromDisplay(PROJECT, portPath);
  assert.ok(info);
  seed(host, info, 'KEEP', 'frozen');
  const kept = buildD1Persistence(planned({
    moduleName: 'sampleModule',
    entityId: 'Note',
    tableId: 'note',
    portId: 'NoteRepository',
    entities: noteEntity,
    operations: ['create', 'list'],
    portAction: 'preserve',
    preserved: portBytes('Note', 'NoteRepository', [create, list]),
  }));
  assert.equal(kept.ok, true, JSON.stringify(kept.problems));
  assert.equal(kept.emit.some(part => part.definition.artifactType === 'repositoryPort'), false);
  assert.deepEqual(kept.preserved, [portPath]);
  const version = kept.adapters[0].bindings.find(binding => binding.field === 'version');
  const note = kept.adapters[0].bindings.find(binding => binding.field === 'details.note');
  assert.equal(version?.column, 'json:version');
  assert.equal(fieldFromColumn(version?.column || ''), 'version');
  assert.equal(note?.nullable, true);
  assert.equal(fieldFromColumn(note?.column || ''), 'details.note');
  host.writes.length = 0;
  const committed = await commitD1Persistence(PROJECT, kept);
  assert.deepEqual(committed.issues, []);
  assert.equal(host.files[fileKey(info)]?.content, 'KEEP');
  assert.equal(host.files[fileKey(info)]?.updatedAt, 'frozen');
  assert.equal(committed.written.some(file => file.includes('noteRepository.defs')), false);
  assert.equal(committed.written.some(file => file.includes('/seeds.defs')), false);
  assert.equal(committed.written.some(file => file.includes('registerRepositories')), false);
});

void test('MDM, derived storage and an NS4 field list do not gain a local table', () => {
  const mdm = buildD1Persistence(planned({
    moduleName: 'sampleModule',
    entityId: 'PersonRole',
    tableId: 'personRole',
    portId: 'PersonRoleRepository',
    entities: roleEntity,
    storageTarget: 'mdm',
  }));
  assert.equal(mdm.ok, false);
  assert.equal(mdm.emit.length, 0);
  assert.equal(codes(mdm, 'error').includes('MDM_LOCAL_TABLE'), true);
  assert.equal(codes(mdm, 'error').includes('MDM_LOCAL_PORT'), true);

  const derived = buildD1Persistence(planned({
    moduleName: 'sampleModule',
    entityId: 'Rollup',
    tableId: 'rollup',
    portId: 'RollupRepository',
    entities: {
      Rollup: {
        entityId: 'Rollup',
        kind: 'entity',
        storage: { target: 'derived' },
        record: { fields: { id: { type: 'uuid', derived: true } } },
      },
    },
    storageTarget: 'derived',
  }));
  assert.equal(codes(derived, 'error').includes('DERIVED_LOCAL_TABLE'), true);
  assert.equal(derived.emit.length, 0);

  const list = buildD1Persistence(planned({
    moduleName: 'sampleModule',
    entityId: 'Holder',
    tableId: 'holder',
    portId: 'HolderRepository',
    entities: {
      Holder: {
        entityId: 'Holder',
        kind: 'entity',
        storage: { target: 'moduleDatabase', table: 'sample_holder' },
        record: { fields: [{ fieldId: 'id', type: 'uuid' }] },
      },
    },
  }));
  assert.equal(codes(list, 'error').includes('RECORD_SHAPE'), true);
  assert.equal(list.emit.length, 0);
  assert.equal(JSON.stringify(list.emit).includes('fieldId'), false);
});

void test('an external catalog is read and not copied into a table', () => {
  const source = '/_102034_/l4/ontology/mdm.defs.ts';
  const body = {
    Doc: {
      entityId: 'Doc',
      kind: 'entity',
      source,
      storage: { target: 'external' },
      record: { fields: { id: { type: 'uuid' } } },
    },
  };
  const unread = buildD1Persistence(planned({
    moduleName: 'sampleModule',
    entityId: 'Doc',
    tableId: 'doc',
    portId: 'DocRepository',
    entities: body,
    storageTarget: 'external',
  }));
  assert.equal(codes(unread, 'error').includes('CATALOG_UNREAD'), true);
  assert.equal(codes(unread, 'error').includes('EXTERNAL_LOCAL_TABLE'), true);
  assert.equal(unread.emit.length, 0);

  const opened = buildD1Persistence({
    ...planned({
      moduleName: 'sampleModule',
      entityId: 'Doc',
      tableId: 'doc',
      portId: 'DocRepository',
      entities: body,
      storageTarget: 'external',
      catalogsRead: [source],
    }),
    selection: { ports: [], tables: [], usecases: [], files: [] },
  });
  assert.equal(opened.ok, true, JSON.stringify(opened.problems));
  assert.equal(opened.emit.length, 0);
  assert.equal(opened.normalizations.some(item => item.code === 'CATALOG_READ_ONLY' && item.path === source), true);
});
