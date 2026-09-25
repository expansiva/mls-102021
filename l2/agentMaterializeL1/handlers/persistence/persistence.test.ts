/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/persistence/persistence.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  parseDefinitionSource,
  readDefinition,
  receiptPathFor,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeOwnedRemoval, MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { decideProfile } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import { runMaterialize, type HandlerCall, type MaterializeRunHost } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import type { SimulatedUnit } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import { runStructure, structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import {
  additivePlan,
  applyPlan,
  assertPhysicalSchema,
  buildLocalTable,
  withoutUniqueChecks,
} from '/_102021_/l2/agentMaterializeL1/handlers/persistence/emitPersistence.js';
import { persistenceHandlerIds, persistenceRunners, runPersistence } from '/_102021_/l2/agentMaterializeL1/handlers/persistence/runners.js';

const EXTRA = new Map<string, string>();
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const CATALOG = readFileSync(join(HERE, '../../testing/catalogFixture.json'), 'utf8');
const FIXTURES = loadFixtures(join(HERE, '../structure/fixtures'));

void test('persistence runners cover the registry and do not name the clinic fixture', () => {
  assert.deepEqual(persistenceHandlerIds(), [
    'persistence.integrationOutbound',
    'persistence.persistenceSeeds',
    'persistence.repositoryAdapter',
    'persistence.repositoryRegistration',
    'persistence.table',
  ]);
  for (const id of persistenceHandlerIds()) assert.equal(typeof persistenceRunners[id], 'function');
  const banned = /agendaClinica|Consulta|professionalId|patientId|scheduledAt|attendanceNote|uniqueProfessionalSchedule|Paciente/;
  for (const name of ['emitPersistence.ts', 'runners.ts']) {
    assert.equal(banned.test(readFileSync(join(HERE, name), 'utf8')), false, name);
  }
  const studio = readFileSync(join(HERE, '../../studioHost.ts'), 'utf8');
  const cli = readFileSync(join(ROOT, 'mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts'), 'utf8');
  assert.equal(studio.includes('persistenceRunners'), true);
  assert.equal(cli.includes('persistenceRunners'), true);
  assert.equal(readFileSync(join(HERE, 'runners.ts'), 'utf8').includes('node:'), false);
});

void test('a local table keeps keys and puts derived version in details', async () => {
  const emitted = await runPersistence(callFor(tableDef()));
  assert.equal(emitted.failure, null, emitted.failure?.detail);
  const source = sourceOf(emitted);
  const marker = 'export const tableDefinition = ';
  const table = JSON.parse(source.slice(source.indexOf(marker) + marker.length, source.indexOf(' satisfies TableDefinition'))) as {
    columns: Array<{ name: string }>;
    primaryKey: string[];
    indexes: Array<{ name: string; unique?: boolean; columns: string[] }>;
  };
  assert.deepEqual(table.primaryKey, ['id']);
  assert.deepEqual(table.columns.map(column => column.name), ['id', 'patientId', 'professionalId', 'scheduledAt', 'status', 'details']);
  assert.equal(table.columns.some(column => column.name === 'version'), false);
  assert.equal(source.includes('attendanceNote'), false);
  assert.equal(table.indexes.some(index => index.unique && index.columns.join('+') === 'professionalId+scheduledAt'), true);
  assert.match(source, /"applied": false/);
  assert.equal(source.includes('DROP'), false);
  assert.equal(emitted.evidences?.find(item => item.id === 'tableFile')?.passed, true);
  assert.equal(emitted.evidences?.find(item => item.id === 'migration')?.passed, false);
  assert.equal(emitted.seeds, false);
  assert.equal(emitted.runsStub, false);
});

void test('the same plan applied twice changes nothing, and a destructive step is blocked', () => {
  const built = buildLocalTable(tableDef(), definitionFor('Consulta'));
  assert.equal('code' in built, false);
  if ('code' in built) return;
  const once = additivePlan([built.planned], null);
  assert.equal(once.blocked.length, 0);
  assert.equal(once.applied, false);
  assert.equal(once.steps.some(step => step.op === 'createTable'), true);
  assert.equal(JSON.stringify(once.steps).includes('DROP'), false);
  const applied = applyPlan(null, once, [built.planned]);
  assert.equal(applied.ok, true);
  const twice = additivePlan([built.planned], applied.tables);
  assert.deepEqual(twice.steps, []);
  assert.deepEqual(twice.blocked, []);
  const again = applyPlan(applied.tables, twice, [built.planned]);
  assert.equal(JSON.stringify(again.tables), JSON.stringify(applied.tables));

  const wider = {
    ...built.planned,
    columns: [...built.planned.columns, { name: 'gone', postgresType: 'TEXT', nullable: true, defaultSql: null }],
  };
  const destructive = additivePlan([built.planned], [wider]);
  assert.equal(destructive.blocked.some(step => step.op === 'removeColumn' && step.name === 'gone' && step.reason === 'DESTRUCTIVE_OUT_OF_SCOPE'), true);
  assert.equal(JSON.stringify(destructive.steps).includes('DROP'), false);
  const kept = applyPlan([wider], destructive, [built.planned]);
  assert.equal(kept.ok, false);
  assert.equal(kept.tables[0].columns.some(column => column.name === 'gone'), true);

  const absent = assertPhysicalSchema(built.planned, null);
  assert.equal(absent.ok, false);
  assert.equal(absent.isolated, true);
  assert.equal(absent.code, 'PHYSICAL_SCHEMA_ABSENT');
  const present = assertPhysicalSchema(built.planned, built.planned);
  assert.equal(present.ok, true);
  assert.equal(present.isolated, false);
});

void test('mdm, derived storage, platform fields and pending do not become a local table', async () => {
  const paciente = definitionFor('Paciente');
  const mdm = buildLocalTable(tableDef({ entity: paciente, tableId: 'paciente', physical: 'paciente' }), paciente);
  assert.equal('code' in mdm && mdm.code, 'MDM_LOCAL_TABLE');

  const derivedEntity = structuredClone(definitionFor('Consulta'));
  derivedEntity.data = { ...derivedEntity.data, storageTarget: 'derived' };
  const derived = buildLocalTable(tableDef(), derivedEntity);
  assert.equal('code' in derived && derived.code, 'DERIVED_LOCAL_TABLE');

  const platformEntity = structuredClone(definitionFor('Consulta'));
  const fields = Array.isArray(platformEntity.data.fields) ? platformEntity.data.fields : [];
  platformEntity.data = { ...platformEntity.data, fields: [...fields, { name: 'audit', type: 'text', platform: true }] };
  const platform = buildLocalTable(tableDef(), platformEntity);
  assert.equal('code' in platform, false);
  if ('code' in platform) return;
  assert.equal(platform.definition.columns.some(column => column.name === 'audit'), false);
  assert.equal(platform.bindings.some(binding => binding.field === 'audit'), false);

  const pending = tableDef();
  const indexes = Array.isArray(pending.data.indexes) ? pending.data.indexes : [];
  pending.data = { ...pending.data, indexes: indexes.map((item, index) => index === 0 && item && typeof item === 'object' ? { ...item, pending: 'OWNER_REVIEW' } : item) };
  const blocked = await runPersistence(callFor(pending));
  assert.equal(blocked.failure?.code, 'OWNER_REVIEW');
  assert.deepEqual(blocked.files, {});
});

void test('adapter, registration and seeds follow the def, and outbound does not publish', async () => {
  const tableDefinition = tableDef();
  const known = new Map<string, string>([[defPathOf('consulta'), defSource(defPathOf('consulta'), tableDefinition)]]);
  const table = await runPersistence(callFor(tableDefinition, known));
  known.set(outputOf(table), sourceOf(table));
  const adapter = await runPersistence(callFor(adapterDef(), known));
  assert.equal(adapter.failure, null, adapter.failure?.detail);
  const source = sourceOf(adapter);
  assert.match(source, /enforce:unique/);
  assert.match(source, /CONCURRENCY_CONFLICT/);
  assert.match(source, /export function bind/);
  assert.match(source, /export function createConsultaRepository/);
  assert.equal(source.includes('REPOSITORY_NOT_IMPLEMENTED'), false);
  assert.equal(adapter.runsStub, false);
  const stripped = withoutUniqueChecks(source);
  assert.equal(stripped.includes("throw new AppError('CONFLICT'"), false);
  assert.match(stripped, /enforce:unique disabled/);

  const registration = await runPersistence(callFor(registrationDef(), filesOf(adapter)));
  assert.equal(registration.failure, null, registration.failure?.detail);
  assert.match(sourceOf(registration), /registerRepository\("ConsultaRepository"/);
  assert.match(sourceOf(registration), /registerRepositories\(\)/);
  assert.equal(registration.runsStub, false);

  const stubCall = callFor(registrationDef(), new Map([['_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.ts', "throw new AppError('REPOSITORY_NOT_IMPLEMENTED', 'x', 501);"]]));
  const stubbed = await runPersistence(stubCall);
  assert.equal(stubbed.runsStub, true);

  const seeds = await runPersistence(callFor(seedsDef(false)));
  assert.equal(seeds.failure, null, seeds.failure?.detail);
  assert.equal(seeds.seeds, false);
  assert.match(sourceOf(seeds), /applicableSeeds/);
  assert.equal(sourceOf(seeds).includes('seedRows0'), false);
  const synthetic = await runPersistence(callFor(seedsDef(true)));
  assert.equal(synthetic.seeds, true);
  assert.match(sourceOf(synthetic), /"seedFor":"consulta"/);

  const outbound = await runPersistence(callFor(outboundDef()));
  assert.equal(outbound.failure?.code, 'MECHANISM_UNBOUND');
  assert.deepEqual(outbound.files, {});
});

void test('renamed ids still map columns, and production refuses synthetic seeds', async () => {
  const rewritten = rewrite();
  const read = async (ref: string) => rewritten.get(ref) ?? readFile(ref);
  const table = await runPersistence(callFor(must(rewritten, 'visita'), new Map(), read));
  assert.equal(table.failure, null, table.failure?.detail);
  const source = sourceOf(table);
  assert.match(source, /agentId/);
  assert.equal(/agendaClinica|Consulta|professionalId|patientId|attendanceNote/.test(source), false, source);
  const adapter = await runPersistence(callFor(must(rewritten, 'VisitaRepository', 'repositoryAdapter'), filesOf(table), read));
  assert.equal(adapter.failure, null, adapter.failure?.detail);
  assert.match(sourceOf(adapter), /createVisitaRepository/);
  assert.equal(/Consulta|professionalId/.test(sourceOf(adapter)), false);

  const note = noteEntity();
  const noteTable = noteTableDef(note);
  const noteSeeds = seedsDef(true);
  noteSeeds.moduleName = 'sample';
  noteSeeds.dependencies = [pathFor(noteTable)];
  noteSeeds.data = { ...noteSeeds.data, scenarios: [{ scenarioId: 'book', tableId: 'note', source: 'journey:book' }], datasets: [{ seedFor: 'note', rows: [{ id: 'row-1' }] }] };
  EXTRA.set(pathFor(note), defSource(pathFor(note), note));
  const store = world();
  const result = await runMaterialize({
    project: 102047,
    moduleName: 'sample',
    stage: 'structure',
    flow: '',
    resume: false,
    units: [unit(note), unit(noteTable), unit(noteSeeds)],
    profileMode: 'production',
    profileDeclared: true,
    budget: { timeoutMs: 5000 },
  }, host(store));
  const tableCode = result.units.find(item => item.defPath === pathFor(noteTable))?.code;
  const seedCode = result.units.find(item => item.defPath === pathFor(noteSeeds))?.code;
  assert.equal(tableCode, 'PROMOTED', result.units.map(item => `${item.defPath} ${item.code} ${item.detail}`).join('\n'));
  assert.equal(seedCode, 'PROFILE_REFUSED');
  const tableReceipt = store.map.get(receiptPathFor(pathFor(noteTable)));
  assert.ok(tableReceipt);
  const parsed = JSON.parse(tableReceipt) as { verifications: Array<{ id: string; passed: boolean }> };
  assert.equal(parsed.verifications.some(item => item.id === 'tableFile' && item.passed), true);
  assert.equal(parsed.verifications.some(item => item.id === 'migration' && item.passed === false), true);
  assert.equal([...store.map.keys()].some(path => path.endsWith('/seeds.ts')), false);
});

void test('emitted persistence files compile', async () => {
  const table = await runPersistence(callFor(tableDef()));
  const port = await runStructure(callFor(definitionFor('ConsultaRepository')));
  const entity = await runStructure(callFor(definitionFor('Consulta')));
  const known = new Map<string, string>([[defPathOf('consulta'), defSource(defPathOf('consulta'), tableDef())]]);
  const adapter = await runPersistence(callFor(adapterDef(), known));
  const registration = await runPersistence(callFor(registrationDef(), filesOf(adapter)));
  const seeds = await runPersistence(callFor(seedsDef(false)));
  const rows = [entity, port, table, adapter, registration, seeds];
  assert.deepEqual(rows.filter(item => item.failure).map(item => item.failure?.detail), []);
  const problems = compile(rows.map(item => [outputOf(item), sourceOf(item)] as const).filter(([, source]) => source));
  assert.equal(problems, '', problems);
});

function defSource(path: string, definition: M1Definition): string {
  return `/// <mls fileReference="${path}" enhancement="_blank"/>\n\nexport const definition = ${JSON.stringify(definition, null, 2)} as const;\n`;
}

function outputOf(row: { files: Record<string, string> } | M1Definition): string {
  if ('files' in row) return Object.keys(row.files)[0] ?? '';
  return '';
}

function sourceOf(row: { files: Record<string, string> }): string {
  return Object.values(row.files)[0] ?? '';
}

function filesOf(row: { files: Record<string, string> }): Map<string, string> {
  return new Map(Object.entries(row.files));
}

function definitionFor(artifactId: string): M1Definition {
  const found = [...FIXTURES.values()].find(item => item.definition.artifactId === artifactId);
  if (!found) throw new Error(artifactId);
  return found.definition;
}

function defPathOf(artifactId: string): string {
  const found = [...FIXTURES.values()].find(item => item.definition.artifactId === artifactId);
  if (artifactId === 'consulta') return '_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts';
  if (artifactId === 'seeds') return '_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/seeds.defs.ts';
  if (!found) throw new Error(artifactId);
  return found.defPath;
}

function tableDef(input?: { entity?: M1Definition; tableId?: string; physical?: string }): M1Definition {
  const entity = input?.entity ?? definitionFor('Consulta');
  const entityPath = [...FIXTURES.values()].find(item => item.definition.artifactId === entity.artifactId)?.defPath
    ?? '_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts';
  const tableId = input?.tableId ?? 'consulta';
  const physical = input?.physical ?? 'agendaClinica_consulta';
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'table',
    artifactId: tableId,
    moduleName: entity.moduleName,
    status: 'pending',
    dependencies: [entityPath],
    data: {
      tableId,
      entityId: entity.data.entityId,
      physicalName: physical,
      primaryKey: ['id'],
      uniqueKeys: [['professionalId', 'scheduledAt']],
      indexes: [
        { name: `${physical}_professionalId_scheduledAt`, columns: ['professionalId', 'scheduledAt'], unique: true },
        { name: `${physical}_patientId`, columns: ['patientId'], unique: false },
        { name: `${physical}_status`, columns: ['status'], unique: false },
      ],
    },
  };
}

function adapterDef(): M1Definition {
  const built = buildLocalTable(tableDef(), definitionFor('Consulta'));
  if ('code' in built) throw new Error(built.detail);
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'repositoryAdapter',
    artifactId: 'ConsultaRepository',
    moduleName: 'agendaClinica',
    status: 'pending',
    dependencies: [
      defPathOf('consulta'),
      defPathOf('ConsultaRepository'),
    ],
    data: {
      entityId: 'Consulta',
      portId: 'ConsultaRepository',
      tableId: 'consulta',
      columns: built.bindings.map(binding => ({ field: binding.field, column: binding.column })),
    },
  };
}

function registrationDef(): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'repositoryRegistration',
    artifactId: 'registerRepositories',
    moduleName: 'agendaClinica',
    status: 'pending',
    dependencies: ['_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.defs.ts'],
    data: {
      registrationId: 'registerRepositories',
      adapters: [{ portId: 'ConsultaRepository', adapterArtifactId: 'ConsultaRepository' }],
    },
  };
}

function seedsDef(withRows: boolean): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'persistenceSeeds',
    artifactId: 'seeds',
    moduleName: 'agendaClinica',
    status: 'pending',
    dependencies: [defPathOf('consulta')],
    data: {
      seedId: 'seeds',
      phase: 'plan',
      scenarios: [{ scenarioId: 'book', tableId: 'consulta', source: 'journey:book' }],
      ...(withRows ? { datasets: [{ seedFor: 'consulta', rows: [{ id: 'row-1' }] }] } : {}),
    },
  };
}

function outboundDef(): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'integrationOutbound',
    artifactId: 'outbound',
    moduleName: 'agendaClinica',
    status: 'blocked',
    dependencies: [],
    data: {
      integrationId: 'outbound',
      events: [{ eventId: 'noted', on: 'Entity.note', entityId: 'Entity', mechanism: '', consumer: 'note' }],
    },
  };
}

function pathFor(definition: M1Definition): string {
  const root = `_102047_/l1/${definition.moduleName}/layer_1_external/adapters/persistence`;
  if (definition.artifactType === 'table') return `${root}/${definition.artifactId}.defs.ts`;
  if (definition.artifactType === 'repositoryAdapter') {
    const tableId = typeof definition.data.tableId === 'string' ? definition.data.tableId : definition.artifactId;
    return `${root}/${tableId}RepositoryAdapter.defs.ts`;
  }
  if (definition.artifactType === 'repositoryRegistration') return `${root}/registerRepositories.defs.ts`;
  if (definition.artifactType === 'persistenceSeeds') return `${root}/seeds.defs.ts`;
  if (definition.artifactType === 'integrationOutbound') {
    return `_102047_/l1/${definition.moduleName}/layer_1_external/adapters/integration/outbound.defs.ts`;
  }
  if (definition.artifactType === 'domainEntity') {
    const known = [...FIXTURES.values()].find(item => item.definition.artifactId === definition.artifactId);
    if (known) return known.defPath;
    const file = `${definition.artifactId.charAt(0).toLowerCase()}${definition.artifactId.slice(1)}`;
    return `_102047_/l1/${definition.moduleName}/layer_3_domain/entities/${file}.defs.ts`;
  }
  return defPathOf(definition.artifactId);
}

function callFor(
  definition: M1Definition,
  extra: Map<string, string> = new Map(),
  readImpl?: (ref: string) => Promise<string | null>,
): HandlerCall {
  const handler = handlerFor(definition.artifactType, 'structure');
  if (!handler) throw new Error(definition.artifactType);
  const defPath = pathFor(definition);
  const unit: SimulatedUnit = {
    defPath,
    artifactType: definition.artifactType,
    artifactId: definition.artifactId,
    action: 'generate',
    reason: '',
    handlerId: handler.id,
    needsLlm: false,
    unresolved: [],
    contextRefs: [],
    blockedBy: [],
    prompt: '',
  };
  return {
    handler,
    unit,
    definition,
    read: readImpl ?? (async ref => extra.get(ref) ?? readFile(ref)),
    catalogRef: 'catalog.json',
    repair: false,
    signal: new AbortController().signal,
    eventId: defPath,
    profile: decideProfile('development', true),
    modelText: null,
  };
}

function unit(definition: M1Definition): PlanUnitInput {
  return { defPath: callFor(definition).unit.defPath, definition };
}

function rewrite(): Map<string, string> {
  const map = new Map<string, string>();
  const swap = (value: string) => value
    .replaceAll('agendaClinica', 'oficina')
    .replaceAll('Consulta', 'Visita')
    .replaceAll('consulta', 'visita')
    .replaceAll('professionalId', 'agentId')
    .replaceAll('patientId', 'guestId')
    .replaceAll('scheduledAt', 'when')
    .replaceAll('attendanceNote', 'memo')
    .replaceAll('uniqueProfessionalSchedule', 'r1');
  for (const [path, fixture] of FIXTURES) {
    if (fixture.definition.artifactId !== 'Consulta' && fixture.definition.artifactId !== 'ConsultaRepository') continue;
    const nextPath = swap(path);
    map.set(nextPath, swap(fixture.text));
  }
  const entity = readDefinition(parseDefinitionSource(map.get(swap(defPathOf('Consulta'))) ?? '').definition);
  if ('issues' in entity) throw new Error(entity.issues.join(' '));
  const table = tableDef({ entity, tableId: 'visita', physical: 'oficina_visita' });
  table.moduleName = 'oficina';
  table.dependencies = [swap(defPathOf('Consulta'))];
  table.data = {
    ...table.data,
    entityId: 'Visita',
    uniqueKeys: [['agentId', 'when']],
    indexes: [
      { name: 'oficina_visita_agentId_when', columns: ['agentId', 'when'], unique: true },
      { name: 'oficina_visita_guestId', columns: ['guestId'], unique: false },
      { name: 'oficina_visita_status', columns: ['status'], unique: false },
    ],
  };
  const tablePath = swap(defPathOf('consulta'));
  map.set(tablePath, `export const definition = ${JSON.stringify(table)} as const;\n`);
  const built = buildLocalTable(table, entity);
  if ('code' in built) throw new Error(built.detail);
  const adapter: M1Definition = {
    ...adapterDef(),
    artifactId: 'VisitaRepository',
    moduleName: 'oficina',
    dependencies: [tablePath, swap(defPathOf('ConsultaRepository'))],
    data: {
      entityId: 'Visita',
      portId: 'VisitaRepository',
      tableId: 'visita',
      columns: built.bindings.map(binding => ({ field: binding.field, column: binding.column })),
    },
  };
  map.set(swap('_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.defs.ts'), `export const definition = ${JSON.stringify(adapter)} as const;\n`);
  return map;
}

function must(map: Map<string, string>, artifactId: string, artifactType = ''): M1Definition {
  for (const text of map.values()) {
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const definition = readDefinition(parsed.definition);
    if ('issues' in definition || definition.artifactId !== artifactId) continue;
    if (artifactType && definition.artifactType !== artifactType) continue;
    return definition;
  }
  throw new Error(artifactId);
}

function noteEntity(): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'domainEntity',
    artifactId: 'Note',
    moduleName: 'sample',
    status: 'pending',
    dependencies: [],
    data: {
      entityId: 'Note',
      storageTarget: 'moduleDatabase',
      fields: [
        { name: 'id', type: 'uuid', derived: true },
        { name: 'version', type: 'integer', derived: true },
        { name: 'label', type: 'text' },
      ],
      lifecycle: { states: [], transitions: [] },
      invariants: [],
      imports: [],
    },
  };
}

function noteTableDef(entity: M1Definition): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'table',
    artifactId: 'note',
    moduleName: 'sample',
    status: 'pending',
    dependencies: [pathFor(entity)],
    data: {
      tableId: 'note',
      entityId: 'Note',
      physicalName: 'sample_note',
      primaryKey: ['id'],
      uniqueKeys: [],
      indexes: [],
    },
  };
}

function readFile(ref: string): string | null {
  if (ref === 'catalog.json') return CATALOG;
  const extra = EXTRA.get(ref);
  if (extra !== undefined) return extra;
  const fixture = FIXTURES.get(ref);
  if (fixture) return fixture.text;
  const match = /^_(\d+)_\/(.+)$/.exec(ref);
  if (!match) return null;
  try {
    return readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8');
  } catch {
    return null;
  }
}

function compile(rows: readonly (readonly [string, string])[]): string {
  const dir = join(ROOT, `.m1-07-out-${process.pid}`);
  const config = join(ROOT, `.tsconfig.m1-07-${process.pid}.json`);
  try {
    const files: string[] = [];
    for (const [output, source] of rows) {
      const relativePath = output.replace(/^_102047_\//, '');
      const full = join(dir, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      files.push(relative(ROOT, full));
    }
    const base = readFileSync(join(ROOT, 'tsconfig.base.json'), 'utf8');
    const paths: Record<string, string[]> = { '/_102047_/*': [`./${relative(ROOT, dir)}/*`] };
    for (const id of new Set([...base.matchAll(/\/_(\d+)_\//g)].map(match => match[1]))) {
      const key = `/_${id}_/*`;
      if (!paths[key]) paths[key] = [`./mls-${id}/*`];
    }
    writeFileSync(config, `${JSON.stringify({
      extends: './tsconfig.base.json',
      compilerOptions: { noEmit: true, paths },
      files: files.map(file => `./${file}`),
    }, null, 2)}\n`);
    const tsc = join(ROOT, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '-p', config, '--pretty', 'false'], { cwd: ROOT, encoding: 'utf8' });
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').filter(line => line.includes('.m1-07-out')).join('\n').trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(config, { force: true });
  }
}

function host(store: ReturnType<typeof world>): MaterializeRunHost {
  return {
    io: { read: async ref => readFile(ref) },
    state: store.state,
    runners: { ...structureRunners, ...persistenceRunners },
    now: () => '2026-09-25T12:00:00.000Z',
    catalogRef: 'catalog.json',
    commit: 'm1-07',
    monitorError: null,
  };
}

function world() {
  const map = new Map<string, string>();
  const state: MaterializeStateStore = {
    async readReceipt() { return null; },
    async writeReceipt(receipt) {
      const path = receiptPathFor(receipt.defPath);
      map.set(path, JSON.stringify(receipt));
    },
    async readOwned(path) {
      const text = map.get(path);
      return text === undefined ? null : new TextEncoder().encode(text);
    },
    async writeOwned(path, body) { map.set(path, new TextDecoder().decode(body)); },
    async removeOwned(owned, requested): Promise<MaterializeOwnedRemoval> {
      return { removed: [], kept: [...requested.filter(path => !owned.includes(path))] };
    },
    async readRevision() { return null; },
  };
  return { map, state };
}

function loadFixtures(dir: string): Map<string, { defPath: string; text: string; definition: M1Definition }> {
  const map = new Map<string, { defPath: string; text: string; definition: M1Definition }>();
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.defs.ts')) {
        const text = readFileSync(path, 'utf8');
        const parsed = parseDefinitionSource(text);
        if (!('definition' in parsed)) throw new Error(parsed.issues.join('; '));
        const definition = readDefinition(parsed.definition);
        if ('issues' in definition) throw new Error(definition.issues.join('; '));
        const marked = /fileReference="([^"]+)"/.exec(text);
        if (!marked) throw new Error(path);
        map.set(marked[1], { defPath: marked[1], text, definition });
      }
    }
  };
  walk(dir);
  return map;
}
