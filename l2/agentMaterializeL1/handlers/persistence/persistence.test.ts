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
} from '/_102021_/l2/helpers/l1Defs/definition.js';
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
import { planFixture } from '/_102021_/l2/helpers/l1Defs/fixture.js';

const EXTRA = new Map<string, string>();
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
sweepRepoRootScratch();
const CATALOG = readFileSync(join(HERE, '../../testing/catalogFixture.json'), 'utf8');

/**
 * m1_41 b1-P2: the module is built here, with arbitrary ids (no clinic fixture, no client project on
 * disk). `Guest` is an MDM entity; `Agent` a local one the main entity references. RENAMED derives
 * the same and proves no id reaches the emitter.
 */
interface Names { mod: string; Entity: string; entity: string; Guest: string; guestField: string; Agent: string; agentField: string; when: string; note: string }
const BASE: Names = { mod: 'visitDesk', Entity: 'Visit', entity: 'visit', Guest: 'Guest', guestField: 'guestId', Agent: 'Agent', agentField: 'agentId', when: 'slotAt', note: 'visitNote' };
const RENAMED: Names = { mod: 'quayLine', Entity: 'Slip', entity: 'slip', Guest: 'Hull', guestField: 'hullRef', Agent: 'Skipper', agentField: 'skipperId', when: 'tieAt', note: 'memo' };
const N = BASE;
const lower = (value: string) => `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
const entityPathOf = (n: Names, entityId: string) => `_102047_/l1/${n.mod}/layer_3_domain/entities/${lower(entityId)}.defs.ts`;
const portPathOf = (n: Names) => `_102047_/l1/${n.mod}/layer_2_application/ports/${n.entity}Repository.defs.ts`;
const persistenceRoot = (n: Names) => `_102047_/l1/${n.mod}/layer_1_external/adapters/persistence`;
const DEF_SCHEMA = '2026-09-24-d1-definition-v2';

function moduleDefs(n: Names): M1Definition[] {
  const entity = (entityId: string, storageTarget: string, dependencies: string[], fields: Record<string, unknown>[], extra: Record<string, unknown> = {}): M1Definition => ({
    schemaVersion: DEF_SCHEMA, artifactType: 'domainEntity', artifactId: entityId, moduleName: n.mod, status: 'pending', dependencies,
    data: { entityId, storageTarget, fields, lifecycle: { states: [], transitions: [] }, invariants: [], imports: [], ...extra },
  } as M1Definition);
  const keys = [{ name: 'id', type: 'uuid', derived: true }, { name: 'version', type: 'integer', derived: true }];
  return [
    entity(n.Entity, 'moduleDatabase', [entityPathOf(n, n.Guest), entityPathOf(n, n.Agent)].sort(), [
      ...keys,
      { name: n.guestField, type: 'record', ref: n.Guest },
      { name: n.agentField, type: 'record', ref: n.Agent },
      { name: n.when, type: 'timestamp' },
      { name: 'status', type: 'enum' },
      { name: 'details', type: 'object' },
      { name: `details.${n.note}`, type: 'text' },
    ], {
      lifecycle: {
        states: [{ state: 'open', reachedBy: 'actor' }, { state: 'done', reachedBy: 'actor' }],
        transitions: [{ transitionId: 'close', from: ['open'], to: 'done', by: ['agent'], ruleRefs: ['flow'] }],
      },
      invariants: ['uniqueSlot', 'flow'],
    }),
    entity(n.Guest, 'mdm', [], [...keys, { name: 'details', type: 'object' }, { name: 'details.name', type: 'string' }]),
    entity(n.Agent, 'moduleDatabase', [], [...keys, { name: 'label', type: 'text' }]),
    {
      schemaVersion: DEF_SCHEMA, artifactType: 'repositoryPort', artifactId: `${n.Entity}Repository`, moduleName: n.mod, status: 'pending',
      dependencies: [entityPathOf(n, n.Entity)],
      data: {
        entityId: n.Entity,
        interfaceName: `${n.Entity}Repository`,
        methods: [
          { name: 'create', params: [n.Entity], returns: n.Entity },
          { name: 'list', params: [`${n.Entity}Filter`], returns: `${n.Entity}[]` },
          { name: 'transition', params: [n.Entity, 'transitionId'], returns: n.Entity },
        ],
      },
    } as M1Definition,
  ];
}

const pathOfModuleDef = (n: Names, definition: M1Definition) => definition.artifactType === 'repositoryPort' ? portPathOf(n) : entityPathOf(n, definition.artifactId);
const FIXTURES = new Map(moduleDefs(N).map(definition => {
  const defPath = pathOfModuleDef(N, definition);
  return [defPath, { defPath, text: defSource(defPath, definition), definition }] as const;
}));
/** Refs a handler asked for that are neither in the module built here nor a file of the repo (outputs not yet written, receipts, l5). */
const MISSED = new Set<string>();

void test('persistence runners cover the registry and do not name the clinic fixture', () => {
  assert.deepEqual(persistenceHandlerIds(), [
    'persistence.integrationOutbound',
    'persistence.persistenceSeeds',
    'persistence.repositoryAdapter',
    'persistence.repositoryRegistration',
    'persistence.table',
  ]);
  for (const id of persistenceHandlerIds()) assert.equal(typeof persistenceRunners[id], 'function');
  const banned = /agendaClinica|Consulta|professionalId|patientId|scheduledAt|attendanceNote|uniqueProfessionalSchedule|Paciente|visitDesk|guestId|visitNote|uniqueSlot/;
  for (const name of ['emitPersistence.ts', 'runners.ts']) {
    assert.equal(banned.test(readFileSync(join(HERE, name), 'utf8')), false, name);
  }
  const studio = readFileSync(join(HERE, '../../studioHost.ts'), 'utf8');
  assert.equal(studio.includes('persistenceRunners'), true);
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
  assert.deepEqual(table.columns.map(column => column.name), ['id', N.guestField, N.agentField, N.when, 'status', 'details']);
  assert.equal(table.columns.some(column => column.name === 'version'), false);
  assert.equal(source.includes(N.note), false);
  assert.equal(table.indexes.some(index => index.unique && index.columns.join('+') === `${N.agentField}+${N.when}`), true);
  assert.match(source, /"applied": false/);
  assert.equal(source.includes('DROP'), false);
  assert.equal(emitted.evidences?.find(item => item.id === 'tableFile')?.passed, true);
  assert.equal(emitted.evidences?.find(item => item.id === 'migration')?.passed, false);
  assert.equal(emitted.seeds, false);
  assert.equal(emitted.runsStub, false);
});

void test('the same plan applied twice changes nothing, and a destructive step is blocked', () => {
  const built = buildLocalTable(tableDef(), definitionFor(N.Entity));
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
  const guest = definitionFor(N.Guest);
  const mdm = buildLocalTable(tableDef({ entity: guest, tableId: lower(N.Guest), physical: lower(N.Guest) }), guest);
  assert.equal('code' in mdm && mdm.code, 'MDM_LOCAL_TABLE');

  const derivedEntity = structuredClone(definitionFor(N.Entity));
  derivedEntity.data = { ...derivedEntity.data, storageTarget: 'derived' };
  const derived = buildLocalTable(tableDef(), derivedEntity);
  assert.equal('code' in derived && derived.code, 'DERIVED_LOCAL_TABLE');

  const platformEntity = structuredClone(definitionFor(N.Entity));
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
  const known = new Map<string, string>([[defPathOf('table'), defSource(defPathOf('table'), tableDefinition)]]);
  const table = await runPersistence(callFor(tableDefinition, known));
  known.set(outputOf(table), sourceOf(table));
  const adapter = await runPersistence(callFor(adapterDef(), known));
  assert.equal(adapter.failure, null, adapter.failure?.detail);
  const source = sourceOf(adapter);
  assert.match(source, /enforce:unique/);
  assert.match(source, /CONCURRENCY_CONFLICT/);
  assert.match(source, /export function bind/);
  assert.match(source, new RegExp(`export function create${N.Entity}Repository`));
  assert.equal(source.includes('REPOSITORY_NOT_IMPLEMENTED'), false);
  assert.equal(adapter.runsStub, false);
  const stripped = withoutUniqueChecks(source);
  assert.equal(stripped.includes("throw new AppError('CONFLICT'"), false);
  assert.match(stripped, /enforce:unique disabled/);

  const registration = await runPersistence(callFor(registrationDef(), filesOf(adapter)));
  assert.equal(registration.failure, null, registration.failure?.detail);
  assert.match(sourceOf(registration), new RegExp(`registerRepository\\("${N.Entity}Repository"`));
  assert.match(sourceOf(registration), /registerRepositories\(\)/);
  assert.equal(registration.runsStub, false);

  const stubCall = callFor(registrationDef(), new Map([[`${persistenceRoot(N)}/${N.entity}RepositoryAdapter.ts`, "throw new AppError('REPOSITORY_NOT_IMPLEMENTED', 'x', 501);"]]));
  const stubbed = await runPersistence(stubCall);
  assert.equal(stubbed.runsStub, true);

  const seeds = await runPersistence(callFor(seedsDef(false)));
  assert.equal(seeds.failure, null, seeds.failure?.detail);
  assert.equal(seeds.seeds, false);
  assert.match(sourceOf(seeds), /applicableSeeds/);
  assert.equal(sourceOf(seeds).includes('seedRows0'), false);
  const synthetic = await runPersistence(callFor(seedsDef(true)));
  assert.equal(synthetic.seeds, true);
  assert.match(sourceOf(synthetic), new RegExp(`"seedFor":"${N.entity}"`));

  // m1_28: the D1 shape (datasets without rows) plus the certification fixture.
  const planned = seedsDef(false);
  const fixture = planFixture([
    { id: `data:${N.Entity}`, owner: 'L1', entityRefs: [N.Entity], actorRefs: [], sourceRefs: [], gap: 'FIXTURE_EXECUTOR_UNREFERENCED: x' },
    { id: `mdm:${N.Guest}`, owner: 'runtime', entityRefs: [N.Guest], actorRefs: [], sourceRefs: [], gap: 'RUNTIME_MDM_FIXTURE_UNREFERENCED: x' },
  ], [{ tableId: N.entity, entityId: N.Entity }]);
  planned.data = { ...planned.data, datasets: [{ datasetId: N.entity, tableId: N.entity, owners: ['book'] }], fixture };
  const withFixture = await runPersistence(callFor(planned));
  assert.equal(withFixture.failure, null, withFixture.failure?.detail);
  assert.equal(withFixture.seeds, false);
  const plannedSource = sourceOf(withFixture);
  assert.match(plannedSource, /export const certificationFixture = /);
  // The fixture never reaches the seed bootstrap.
  assert.match(plannedSource, /return \[\];\n\}/);
  assert.equal(plannedSource.includes('seedRows0'), false);
  const evidences = Object.fromEntries((withFixture.evidences ?? []).map(item => [item.id, item]));
  assert.deepEqual(Object.keys(evidences).sort(), ['certificationFixturePlanned', 'seedPlanned']);
  assert.equal(evidences.seedPlanned?.detail ?? '', `Planned only (${N.entity}). No row was materialized or applied.`);
  assert.match(evidences.certificationFixturePlanned?.detail ?? '', /1 dataset\(s\), 1 runtime need\(s\)\. Not applied or tested/);
  assert.equal((withFixture.evidences ?? []).some(item => /applied|tested/.test(item.id)), false);
  const broken = seedsDef(false);
  broken.data = { ...broken.data, fixture: { schemaVersion: 'other' } };
  assert.equal((await runPersistence(callFor(broken))).failure?.code, 'FIXTURE_INVALID');

  const outbound = await runPersistence(callFor(outboundDef()));
  assert.equal(outbound.failure?.code, 'MECHANISM_UNBOUND');
  assert.deepEqual(outbound.files, {});
});

void test('renamed ids still map columns, and production refuses synthetic seeds', async () => {
  const rewritten = rewrite();
  const read = async (ref: string) => rewritten.get(ref) ?? readFile(ref);
  const table = await runPersistence(callFor(must(rewritten, RENAMED.entity), new Map(), read));
  assert.equal(table.failure, null, table.failure?.detail);
  const source = sourceOf(table);
  assert.match(source, new RegExp(RENAMED.agentField));
  const baseIds = new RegExp([BASE.mod, BASE.Entity, BASE.guestField, BASE.agentField, BASE.when, BASE.note].join('|'));
  assert.equal(baseIds.test(source), false, source);
  const adapter = await runPersistence(callFor(must(rewritten, `${RENAMED.Entity}Repository`, 'repositoryAdapter'), filesOf(table), read));
  assert.equal(adapter.failure, null, adapter.failure?.detail);
  assert.match(sourceOf(adapter), new RegExp(`create${RENAMED.Entity}Repository`));
  assert.equal(baseIds.test(sourceOf(adapter)), false);

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

void test('m1_28: a seeds def with the certification fixture is promoted like one without it', async () => {
  const note = noteEntity();
  const noteTable = noteTableDef(note);
  EXTRA.set(pathFor(note), defSource(pathFor(note), note));
  const seedsFor = (withFixture: boolean): M1Definition => {
    const def = seedsDef(false);
    def.moduleName = 'sample';
    def.dependencies = [pathFor(noteTable)];
    const fixture = planFixture([{ id: 'data:Note', owner: 'L1', entityRefs: ['Note'], actorRefs: [], sourceRefs: [], gap: 'FIXTURE_EXECUTOR_UNREFERENCED: x' }], [{ tableId: 'note', entityId: 'Note' }]);
    def.data = {
      ...def.data,
      scenarios: [{ scenarioId: 'book', tableId: 'note', source: 'journey:book' }],
      datasets: [{ datasetId: 'note', tableId: 'note', owners: ['book'] }],
      ...(withFixture ? { fixture } : {}),
    };
    return def;
  };
  const outcome = async (withFixture: boolean) => {
    const seeds = seedsFor(withFixture);
    const store = world();
    const result = await runMaterialize({
      project: 102047, moduleName: 'sample', stage: 'structure', flow: '', resume: false,
      units: [unit(note), unit(noteTable), unit(seeds)], profileMode: 'development', profileDeclared: true, budget: { timeoutMs: 5000 },
    }, host(store));
    const row = result.units.find(item => item.defPath === pathFor(seeds));
    const receipt = JSON.parse(store.map.get(receiptPathFor(pathFor(seeds))) ?? '{}') as { verifications?: Array<{ id: string; passed: boolean }> };
    const output = [...store.map.entries()].find(([path]) => path.endsWith('/seeds.ts'))?.[1] ?? '';
    return { code: row?.code, detail: row?.detail, ids: (receipt.verifications ?? []).map(item => `${item.id}:${item.passed}`), output };
  };
  const plain = await outcome(false);
  const withFixture = await outcome(true);
  assert.equal(plain.code, 'PROMOTED', plain.detail);
  assert.equal(withFixture.code, 'PROMOTED', withFixture.detail);
  assert.equal(withFixture.ids.every(item => item.endsWith(':true')), true, withFixture.ids.join());
  assert.equal(withFixture.ids.includes('certificationFixturePlanned:true') && withFixture.ids.includes('seedPlanned:true'), true);
  assert.equal(plain.ids.includes('certificationFixturePlanned:true'), false);
  assert.match(withFixture.output, /export const certificationFixture = /);
  assert.equal(plain.output.includes('certificationFixture'), false);
});

void test('emitted persistence files compile', async () => {
  const table = await runPersistence(callFor(tableDef()));
  const port = await runStructure(callFor(definitionFor(`${N.Entity}Repository`)));
  const entity = await runStructure(callFor(definitionFor(N.Entity)));
  const known = new Map<string, string>([[defPathOf('table'), defSource(defPathOf('table'), tableDef())]]);
  const adapter = await runPersistence(callFor(adapterDef(), known));
  const registration = await runPersistence(callFor(registrationDef(), filesOf(adapter)));
  const seeds = await runPersistence(callFor(seedsDef(false)));
  const rows = [entity, port, table, adapter, registration, seeds];
  assert.deepEqual(rows.filter(item => item.failure).map(item => item.failure?.detail), []);
  const problems = compile(rows.map(item => [outputOf(item), sourceOf(item)] as const).filter(([, source]) => source));
  assert.equal(problems, '', problems);
});

void test('emitted persistence file with no unique keys compiles', async () => {
  const noUniqueTable = tableDef({ uniqueKeys: [] });
  const port = await runStructure(callFor(definitionFor(`${N.Entity}Repository`)));
  const entity = await runStructure(callFor(definitionFor(N.Entity)));
  const table = await runPersistence(callFor(noUniqueTable));
  const known = new Map<string, string>([[defPathOf('table'), defSource(defPathOf('table'), noUniqueTable)]]);
  const adapter = await runPersistence(callFor(adapterDef(noUniqueTable), known));
  const rows = [entity, port, table, adapter];
  assert.deepEqual(rows.filter(item => item.failure).map(item => item.failure?.detail), []);
  const adapterSource = sourceOf(adapter);
  assert.match(adapterSource, /const UNIQUE_KEYS: readonly \(readonly string\[\]\)\[\] = \[\];/);
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

function defPathOf(artifactId: string, n: Names = N): string {
  if (artifactId === 'table') return `${persistenceRoot(n)}/${n.entity}.defs.ts`;
  if (artifactId === 'seeds') return `${persistenceRoot(n)}/seeds.defs.ts`;
  if (artifactId === 'adapter') return `${persistenceRoot(n)}/${n.entity}RepositoryAdapter.defs.ts`;
  if (artifactId === `${n.Entity}Repository`) return portPathOf(n);
  return entityPathOf(n, artifactId);
}

function tableDef(input?: { entity?: M1Definition; tableId?: string; physical?: string; uniqueKeys?: string[][] }): M1Definition {
  const entity = input?.entity ?? definitionFor(N.Entity);
  const entityPath = entityPathOf(N, entity.artifactId);
  const tableId = input?.tableId ?? N.entity;
  const physical = input?.physical ?? `${N.mod}_${N.entity}`;
  const uniqueKeys = input?.uniqueKeys ?? [[N.agentField, N.when]];
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
      uniqueKeys,
      indexes: uniqueKeys.length
        ? [
          { name: `${physical}_${N.agentField}_${N.when}`, columns: [N.agentField, N.when], unique: true },
          { name: `${physical}_${N.guestField}`, columns: [N.guestField], unique: false },
          { name: `${physical}_status`, columns: ['status'], unique: false },
        ]
        : [
          { name: `${physical}_${N.guestField}`, columns: [N.guestField], unique: false },
          { name: `${physical}_status`, columns: ['status'], unique: false },
        ],
    },
  };
}

function adapterDef(table?: M1Definition): M1Definition {
  const built = buildLocalTable(table ?? tableDef(), definitionFor(N.Entity));
  if ('code' in built) throw new Error(built.detail);
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'repositoryAdapter',
    artifactId: `${N.Entity}Repository`,
    moduleName: N.mod,
    status: 'pending',
    dependencies: [
      defPathOf('table'),
      defPathOf(`${N.Entity}Repository`),
    ],
    data: {
      entityId: N.Entity,
      portId: `${N.Entity}Repository`,
      tableId: N.entity,
      columns: built.bindings.map(binding => ({ field: binding.field, column: binding.column })),
    },
  };
}

function registrationDef(): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'repositoryRegistration',
    artifactId: 'registerRepositories',
    moduleName: N.mod,
    status: 'pending',
    dependencies: [defPathOf('adapter')],
    data: {
      registrationId: 'registerRepositories',
      adapters: [{ portId: `${N.Entity}Repository`, adapterArtifactId: `${N.Entity}Repository` }],
    },
  };
}

function seedsDef(withRows: boolean): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'persistenceSeeds',
    artifactId: 'seeds',
    moduleName: N.mod,
    status: 'pending',
    dependencies: [defPathOf('table')],
    data: {
      seedId: 'seeds',
      phase: 'plan',
      scenarios: [{ scenarioId: 'book', tableId: N.entity, source: 'journey:book' }],
      ...(withRows ? { datasets: [{ seedFor: N.entity, rows: [{ id: 'row-1' }] }] } : {}),
    },
  };
}

function outboundDef(): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'integrationOutbound',
    artifactId: 'outbound',
    moduleName: N.mod,
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
  if (definition.artifactType === 'repositoryPort') return portPathOf(N);
  throw new Error(definition.artifactType);
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

/** The same module under RENAMED ids: entity, port, table and adapter defs, as sources. */
function rewrite(): Map<string, string> {
  const n = RENAMED;
  const map = new Map<string, string>();
  for (const definition of moduleDefs(n)) map.set(pathOfModuleDef(n, definition), defSource(pathOfModuleDef(n, definition), definition));
  const entity = moduleDefs(n)[0];
  const table: M1Definition = {
    ...tableDef(),
    artifactId: n.entity,
    moduleName: n.mod,
    dependencies: [entityPathOf(n, n.Entity)],
  };
  table.data = {
    tableId: n.entity,
    entityId: n.Entity,
    physicalName: `${n.mod}_${n.entity}`,
    primaryKey: ['id'],
    uniqueKeys: [[n.agentField, n.when]],
    indexes: [
      { name: `${n.mod}_${n.entity}_${n.agentField}_${n.when}`, columns: [n.agentField, n.when], unique: true },
      { name: `${n.mod}_${n.entity}_${n.guestField}`, columns: [n.guestField], unique: false },
      { name: `${n.mod}_${n.entity}_status`, columns: ['status'], unique: false },
    ],
  };
  const tablePath = defPathOf('table', n);
  map.set(tablePath, defSource(tablePath, table));
  const built = buildLocalTable(table, entity);
  if ('code' in built) throw new Error(built.detail);
  const adapter: M1Definition = {
    ...adapterDef(),
    artifactId: `${n.Entity}Repository`,
    moduleName: n.mod,
    dependencies: [tablePath, portPathOf(n)],
    data: {
      entityId: n.Entity,
      portId: `${n.Entity}Repository`,
      tableId: n.entity,
      columns: built.bindings.map(binding => ({ field: binding.field, column: binding.column })),
    },
  };
  map.set(defPathOf('adapter', n), defSource(defPathOf('adapter', n), adapter));
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
  // The module lives here; a module ref that is not here is recorded, never read from the client on disk.
  if (match[1] === '102047') {
    MISSED.add(ref);
    return null;
  }
  try {
    return readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8');
  } catch {
    MISSED.add(ref);
    return null;
  }
}

function compile(rows: readonly (readonly [string, string])[]): string {
  sweepRepoRootScratch();
  const dir = join(ROOT, '.generated', `.m1-07-out-${process.pid}`);
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
    sweepRepoRootScratch();
  }
}

function sweepRepoRootScratch(): void {
  for (const name of readdirSync(ROOT)) {
    if (name.startsWith('.m1-')) rmSync(join(ROOT, name), { recursive: true, force: true });
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

void test('the module is built here: every def a handler read was in it, and the client project was not read (m1_41 b1-P2)', () => {
  const defs = [...MISSED].filter(ref => ref.endsWith('.defs.ts') && [BASE.mod, RENAMED.mod].some(mod => ref.startsWith(`_102047_/l1/${mod}/`)));
  assert.deepEqual(defs, []);
});
