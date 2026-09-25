/// <mls fileReference="_102021_/l2/agentMaterializeL1/simulate/simulate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CONTRACTS_102034,
  expandContextRef,
  layerRank,
  orderItems,
} from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import {
  M1_ARTIFACT_TYPES,
  M1_DEFINITION_SCHEMA,
  outputPathFromDefPath,
  parseDefinitionSource,
  semanticHash,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import {
  compiledSignature,
  platformFilesFor,
  PLATFORM_FILES,
  usesMdm,
} from '/_102021_/l2/agentMaterializeL1/context/context.js';
import { contentHash, type MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { handlerFor, registeredHandlerIds } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { planMaterialization, PLAN_REASON } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { simulate } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import {
  accessScope,
  authorityMap,
  CONSULTA,
  consultasController,
  fixtureIndex,
  indexedUnits,
  LIST,
  listConsultaPending,
  listConsultaReceipt,
  OUTBOUND,
  PAGE,
  SCOPE,
  TABLE,
  withStatus,
} from '/_102021_/l2/agentMaterializeL1/fixtures/cases.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PRODUCT = resolve(HERE, '..');
const PLATFORM = Object.values(PLATFORM_FILES);

void test('closed registry names every contract type and no implement fallback', () => {
  assert.deepEqual(M1_ARTIFACT_TYPES.filter(type => handlerFor(type, 'structure')), [...M1_ARTIFACT_TYPES]);
  assert.deepEqual(M1_ARTIFACT_TYPES.filter(type => handlerFor(type, 'implement')), [
    'domainEntity', 'repositoryPort', 'usecase', 'accessScope', 'authorityMap',
  ]);
  assert.equal(handlerFor('table', 'implement'), null);
  assert.equal(handlerFor('widget'), null);
  assert.equal(registeredHandlerIds('structure').length, M1_ARTIFACT_TYPES.length);
  for (const type of ['domainEntity', 'repositoryPort', 'usecase', 'accessScope', 'authorityMap'] as const) {
    assert.equal(handlerFor(type, 'implement')?.needsLlm, false, type);
  }
  for (const type of M1_ARTIFACT_TYPES) {
    const named = handlerFor(type, 'structure');
    assert.equal(named?.needsLlm, false, type);
    assert.equal(named?.id.includes('.'), true, type);
  }
});

void test('platform files match the legacy expander only for equivalent type names', () => {
  const pairs = [
    ['domainEntity', 'domainEntity'],
    ['valueObject', 'valueObject'],
    ['repositoryPort', 'repositoryPort'],
    ['table', 'persistenceTable'],
    ['repositoryAdapter', 'repositoryAdapter'],
    ['usecase', 'applicationUsecase'],
    ['httpController', 'httpController'],
    ['persistenceSeeds', 'persistenceSeeds'],
  ] as const;
  for (const [next, previous] of pairs) {
    assert.deepEqual(platformFilesFor(next), expandContextRef('_102034_.d.ts', previous, false), next);
  }
  assert.deepEqual(
    platformFilesFor('usecase', { mdm: { entityId: 'Paciente' } }),
    expandContextRef('_102034_.d.ts', 'applicationUsecase', true),
  );
  assert.deepEqual(platformFilesFor('domainEntity', { mdm: { entityId: 'Paciente' } }), []);
  assert.deepEqual(platformFilesFor('accessScope'), [PLATFORM_FILES.requestContext]);
  assert.deepEqual(platformFilesFor('authorityMap'), [PLATFORM_FILES.requestContext]);
  assert.deepEqual(platformFilesFor('repositoryRegistration'), [PLATFORM_FILES.requestContext, PLATFORM_FILES.repositoryRegistry]);
  assert.deepEqual(platformFilesFor('integrationOutbound'), []);
  assert.equal(platformFilesFor('repositoryAdapter').includes(PLATFORM_FILES.mdmFacade), false);
  assert.deepEqual(expandContextRef('_102034_.d.ts', 'widget'), [...CONTRACTS_102034]);
  assert.equal(usesMdm({}), false);
  assert.equal(usesMdm({ mdm: {} }), false);
  assert.equal(usesMdm({ mdm: { entityId: 'Paciente' } }), true);
  assert.equal(usesMdm({ sequence: [{ kind: 'mdm', call: 'get' }] }), true);
});

void test('a definition source is not a compiled signature', () => {
  const def = 'export const definition = { "artifactType": "usecase" } as const;\n';
  assert.equal(compiledSignature(def), null);
  const ts = [
    'export interface ListConsultaInput { id: string }',
    'export function listConsulta(input: ListConsultaInput): Promise<void> { return Promise.resolve(); }',
  ].join('\n');
  const signature = compiledSignature(ts);
  assert.match(signature ?? '', /export function listConsulta/);
  assert.match(signature ?? '', /export interface ListConsultaInput/);
  assert.equal(compiledSignature('const hidden = 1;\n'), null);
});

void test('order follows references, not folder rank or the legacy layer rank', async () => {
  const cb = orderItems([
    { id: 'listConsulta', type: 'applicationUsecase', outputPath: 'usecase.ts' },
    { id: 'accessScope', type: 'accessScope', outputPath: 'scope.ts' },
    { id: 'consultas', type: 'httpController', outputPath: 'controller.ts' },
  ]);
  assert.ok(layerRank('applicationUsecase') < layerRank('accessScope'));
  assert.ok(layerRank('httpController') < layerRank('accessScope'));
  assert.ok(cb.findIndex(item => item.id === 'listConsulta') < cb.findIndex(item => item.id === 'accessScope'));
  assert.ok(cb.findIndex(item => item.id === 'consultas') < cb.findIndex(item => item.id === 'accessScope'));

  const registrar = '_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts';
  const usecase = {
    ...listConsultaPending,
    dependencies: [...listConsultaPending.dependencies, SCOPE].sort(),
  };
  const second = {
    ...listConsultaPending,
    artifactId: 'registrarAtendimento',
    dependencies: [...listConsultaPending.dependencies].sort(),
    data: { ...listConsultaPending.data, usecaseId: 'registrarAtendimento' },
  };
  const controller = {
    ...consultasController,
    dependencies: [LIST, registrar, SCOPE].sort(),
    data: {
      pageId: 'consultas_profissional',
      handlers: [
        { route: 'agendaClinica.consultas_profissional.qryListConsulta', kind: 'query', usecaseId: 'listConsulta', grantIds: ['profissionalAgendaDiaria'] },
        { route: 'agendaClinica.consultas_profissional.cmdRegistrarAtendimento', kind: 'command', usecaseId: 'registrarAtendimento', grantIds: ['profissionalAgendaDiaria'] },
      ],
    },
  };
  const units = indexedUnits.map(unit => {
    if (unit.defPath === LIST) return { defPath: unit.defPath, definition: usecase };
    if (unit.defPath === PAGE) return { defPath: unit.defPath, definition: controller };
    return unit;
  });
  units.push({ defPath: registrar, definition: second });
  const readable = [...fixtureIndex.files, ...PLATFORM, registrar];
  const first = await planMaterialization({ units, readable, extraArtifacts: fixtureIndex.artifacts });
  const reversed = await planMaterialization({
    units: [...units].reverse(),
    readable,
    extraArtifacts: fixtureIndex.artifacts,
  });
  assert.deepEqual(first.order, reversed.order);
  assert.deepEqual(first.units.map(unit => [unit.defPath, unit.action, unit.reason]), reversed.units.map(unit => [unit.defPath, unit.action, unit.reason]));
  const at = (path: string) => first.order.indexOf(path);
  assert.ok(at(SCOPE) < at(LIST), 'scope is a dependency of the usecase, so it runs first');
  assert.ok(at(LIST) < at(PAGE));
  assert.ok(at(registrar) < at(PAGE));
  assert.equal(first.units.find(unit => unit.defPath === LIST)?.needsLlm, false);
  assert.equal(first.units.find(unit => unit.artifactType === 'persistenceSeeds')?.needsLlm, false);
  assert.equal(first.units.find(unit => unit.artifactType === 'domainEntity' && unit.artifactId === 'Consulta')?.needsLlm, false);
  assert.equal(first.units.find(unit => unit.defPath === OUTBOUND)?.reason.startsWith(PLAN_REASON.mechanismUnbound), true);
  assert.equal(first.units.find(unit => unit.artifactType === 'authorityMap')?.reason.startsWith(PLAN_REASON.noConsumer), true);
  const domain = first.units.find(unit => unit.defPath === CONSULTA);
  assert.equal(domain?.contextRefs.includes(PLATFORM_FILES.mdmFacade), false);
});

void test('a cycle blocks its participants and their dependents only', async () => {
  const A = '_102047_/l1/agendaClinica/layer_3_domain/entities/a.defs.ts';
  const B = '_102047_/l1/agendaClinica/layer_3_domain/entities/b.defs.ts';
  const C = '_102047_/l1/agendaClinica/layer_3_domain/entities/c.defs.ts';
  const D = '_102047_/l1/agendaClinica/layer_3_domain/entities/d.defs.ts';
  const plan = await planMaterialization({
    units: [
      { defPath: C, definition: entity('C', [A]) },
      { defPath: A, definition: entity('A', [B]) },
      { defPath: D, definition: entity('D', []) },
      { defPath: B, definition: entity('B', [A]) },
    ],
    readable: [],
  });
  const reason = (id: string) => plan.units.find(unit => unit.artifactId === id)?.reason ?? '';
  assert.match(reason('A'), /^CYCLE:/);
  assert.match(reason('B'), /^CYCLE:/);
  assert.match(reason('C'), /^BLOCKED_BY:/);
  assert.match(reason('C'), new RegExp(A.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(reason('D'), /^GENERATE:/);
  assert.equal(plan.units.find(unit => unit.artifactId === 'D')?.needsLlm, false);
  assert.equal(plan.cycles.length, 1);
  assert.ok(plan.cycles[0].includes(A) && plan.cycles[0].includes(B));
});

void test('missing ref, unknown type and a relative path without a project stay visible', async () => {
  const missing = '_102047_/l1/agendaClinica/layer_3_domain/entities/missing.defs.ts';
  const relative = 'l2/agendaClinica/web/contracts/x.defs.ts';
  const host = spyHost({
    [CONSULTA]: 'export interface Consulta { id: string }\n',
  });
  const snapshot = await simulate({
    moduleName: 'agendaClinica',
    io: host.io,
    state: host.state,
    units: [
      { defPath: CONSULTA, definition: entity('Consulta', [missing]) },
      {
        defPath: LIST,
        definition: { ...listConsultaPending, artifactType: 'widget' },
      },
      { defPath: PAGE, definition: { ...accessScope, dependencies: [relative] } },
    ],
  });
  assert.equal(snapshot.wrote, false);
  assert.equal(host.mutations.length, 0);
  const byPath = new Map(snapshot.units.map(unit => [unit.defPath, unit]));
  const missed = byPath.get(CONSULTA)!;
  assert.match(missed.reason, /^MISSING_REF:/);
  assert.ok(missed.unresolved.includes(missing));
  assert.match(missed.prompt, /missing\.defs\.ts/);
  assert.match(missed.prompt, /\(inaccessible\)/);
  const widget = byPath.get(LIST)!;
  assert.match(widget.reason, /^NO_NAMED_HANDLER:/);
  assert.equal(widget.action, 'blocked');
  assert.equal(widget.handlerId, null);
  assert.ok(widget.unresolved.includes('artifactType:widget'));
  assert.equal(widget.contextRefs.some(ref => (CONTRACTS_102034 as readonly string[]).includes(ref)), false);
  const bare = byPath.get(PAGE)!;
  assert.match(bare.reason, /^RELATIVE_WITHOUT_PROJECT:/);
  assert.ok(bare.unresolved.includes(relative));
  assert.match(bare.prompt, /l2\/agendaClinica\/web\/contracts\/x\.defs\.ts/);
  assert.equal(bare.prompt.includes('_102047_/l2/agendaClinica/web/contracts/x.defs.ts'), false);
  assert.deepEqual(snapshot, await simulate({
    moduleName: 'agendaClinica',
    io: host.io,
    state: host.state,
    units: [
      { defPath: CONSULTA, definition: entity('Consulta', [missing]) },
      { defPath: LIST, definition: { ...listConsultaPending, artifactType: 'widget' } },
      { defPath: PAGE, definition: { ...accessScope, dependencies: [relative] } },
    ],
  }));
});

void test('unreadable platform context blocks that unit and stays in the prompt', async () => {
  const usecase = {
    ...listConsultaPending,
    dependencies: [CONSULTA].sort(),
    data: {
      ...listConsultaPending.data,
      ports: [],
      rules: [],
      routeProjections: [],
      effects: [],
    },
  };
  const host = spyHost({
    [PLATFORM_FILES.repositoryRegistry]: 'export function resolveRepository(): void {}\n',
    [PLATFORM_FILES.tableDefinition]: 'export interface TableDefinition { name: string }\n',
    [CONSULTA]: 'export interface Consulta { id: string }\n',
  });
  const snapshot = await simulate({
    moduleName: 'agendaClinica',
    io: host.io,
    state: host.state,
    extraArtifacts: [{ artifactType: 'domainEntity', artifactId: 'Consulta', defPath: CONSULTA }],
    units: [
      { defPath: CONSULTA, definition: entity('Consulta', []) },
      { defPath: LIST, definition: usecase },
      { defPath: TABLE, definition: indexedUnits.find(unit => unit.defPath === TABLE)!.definition },
    ],
  });
  assert.equal(host.mutations.length, 0);
  const domain = snapshot.units.find(unit => unit.defPath === CONSULTA)!;
  const planned = snapshot.units.find(unit => unit.defPath === LIST)!;
  const persistence = snapshot.units.find(unit => unit.defPath === TABLE)!;
  assert.match(domain.reason, /^GENERATE:/);
  assert.equal(domain.contextRefs.includes(PLATFORM_FILES.mdmFacade), false);
  assert.equal(domain.prompt.includes('mdmFacade.ts'), false);
  assert.match(planned.reason, /^CONTEXT_UNREAD:/);
  assert.match(planned.prompt, /contracts\.ts/);
  assert.match(planned.prompt, /\(inaccessible\)/);
  assert.match(persistence.reason, /^GENERATE:/);
  assert.equal(persistence.needsLlm, false);
});

void test('compiled signature and definition context stay distinct', async () => {
  const output = outputPathFromDefPath(CONSULTA);
  const host = spyHost({
    [output]: 'export interface Consulta { id: string }\nexport function isConsulta(value: unknown): boolean\n',
  });
  const seen = await simulate({
    moduleName: 'agendaClinica',
    io: host.io,
    state: host.state,
    units: [{ defPath: SCOPE, definition: { ...accessScope, dependencies: [CONSULTA] } }],
  });
  const scope = seen.units[0];
  assert.match(scope.prompt, /### def .*consulta\.defs\.ts/);
  assert.match(scope.prompt, /### compiled .*consulta\.ts/);
  assert.match(scope.prompt, /export interface Consulta/);
  assert.equal(scope.prompt.includes('export const definition'), false);

  const posedAsTs = spyHost({ [output]: 'export const definition = { "artifactType": "domainEntity" } as const;\n' });
  const rejected = await simulate({
    moduleName: 'agendaClinica',
    io: posedAsTs.io,
    state: posedAsTs.state,
    units: [{ defPath: SCOPE, definition: { ...accessScope, dependencies: [CONSULTA] } }],
  });
  assert.match(rejected.units[0].prompt, /\(not a compiled signature\)/);
  assert.equal(host.mutations.length, 0);
  assert.equal(posedAsTs.mutations.length, 0);
});

void test('reuse and verify need an intact receipt; failed does not start over', async () => {
  const definition = withStatus(listConsultaPending, 'generated');
  const hash = await semanticHash(definition);
  const output = outputPathFromDefPath(LIST);
  const bodies = new Map<string, string>();
  for (const dep of definition.dependencies) bodies.set(dep, `export const dep = ${JSON.stringify(dep)};\n`);
  for (const file of platformFilesFor('usecase')) bodies.set(file, `export const platform = ${JSON.stringify(file)};\n`);
  bodies.set(output, 'export function listConsulta(): Promise<void>\n');
  const dependencyHashes: Record<string, string> = {};
  for (const [path, body] of bodies) dependencyHashes[path] = await contentHash(body);
  const receipt = {
    ...listConsultaReceipt(hash),
    dependencyHashes: Object.fromEntries(definition.dependencies.map(path => [path, dependencyHashes[path]])),
    outputHashes: { [output]: dependencyHashes[output] },
  };
  const files = Object.fromEntries(bodies);
  const reuseHost = spyHost(files);
  const reused = await simulate({
    moduleName: 'agendaClinica',
    io: reuseHost.io,
    state: { async readReceipt() { return receipt; } },
    extraArtifacts: fixtureIndex.artifacts,
    units: [{ defPath: LIST, definition }],
  });
  assert.match(reused.units[0].reason, /^REUSE:/);
  assert.equal(reused.units[0].needsLlm, false);
  assert.equal(reuseHost.mutations.length, 0);

  const editedBody = `${bodies.get(output)}// local edit\n`;
  const child = '_102047_/l1/agendaClinica/layer_3_domain/entities/child.defs.ts';
  const other = '_102047_/l1/agendaClinica/layer_3_domain/entities/other.defs.ts';
  const editedHost = spyHost({ ...files, [output]: editedBody });
  const drifted = await simulate({
    moduleName: 'agendaClinica',
    io: editedHost.io,
    state: { async readReceipt() { return receipt; } },
    extraArtifacts: fixtureIndex.artifacts,
    units: [
      { defPath: LIST, definition },
      { defPath: child, definition: entity('Child', [LIST]) },
      { defPath: other, definition: entity('Other', []) },
    ],
  });
  const driftedList = drifted.units.find(unit => unit.defPath === LIST)!;
  assert.equal(driftedList.action, 'blocked');
  assert.match(driftedList.reason, /^OUTPUT_DRIFT:/);
  assert.equal(driftedList.needsLlm, false);
  assert.equal(editedHost.mutations.length, 0);
  assert.equal(drifted.wrote, false);
  const blockedChild = drifted.units.find(unit => unit.defPath === child)!;
  assert.equal(blockedChild.action, 'blocked');
  assert.match(blockedChild.reason, /^BLOCKED_BY:/);
  assert.match(blockedChild.reason, /listConsulta\.defs\.ts/);
  const untouched = drifted.units.find(unit => unit.defPath === other)!;
  assert.equal(untouched.action, 'generate');
  assert.match(untouched.reason, /^GENERATE:/);

  const verifyDriftHost = spyHost({ ...files, [output]: editedBody });
  const verifyDrift = await simulate({
    moduleName: 'agendaClinica',
    io: verifyDriftHost.io,
    state: { async readReceipt() { return receipt; } },
    extraArtifacts: fixtureIndex.artifacts,
    verifyOnly: [LIST],
    units: [{ defPath: LIST, definition }],
  });
  assert.match(verifyDrift.units[0].reason, /^OUTPUT_DRIFT:/);
  assert.equal(verifyDriftHost.mutations.length, 0);

  const omittedHost = spyHost(files);
  const omitted = await simulate({
    moduleName: 'agendaClinica',
    io: omittedHost.io,
    state: {
      async readReceipt() {
        return { ...receipt, outputHashes: { [`${output}.other`]: dependencyHashes[output] } };
      },
    },
    extraArtifacts: fixtureIndex.artifacts,
    units: [{ defPath: LIST, definition }],
  });
  assert.equal(omitted.units[0].action, 'generate');
  assert.match(omitted.units[0].reason, /^GENERATE:/);
  assert.equal(omittedHost.mutations.length, 0);

  const verified = await simulate({
    moduleName: 'agendaClinica',
    io: spyHost(files).io,
    state: { async readReceipt() { return receipt; } },
    extraArtifacts: fixtureIndex.artifacts,
    verifyOnly: [LIST],
    units: [{ defPath: LIST, definition }],
  });
  assert.match(verified.units[0].reason, /^VERIFY:/);
  assert.equal(verified.units[0].needsLlm, false);

  const failed = withStatus(listConsultaPending, 'failed');
  const held = await simulate({
    moduleName: 'agendaClinica',
    io: spyHost(files).io,
    state: { async readReceipt() { return { ...receipt, failures: [{ code: 'COMPILE', detail: 'still broken' }] }; } },
    extraArtifacts: fixtureIndex.artifacts,
    units: [{ defPath: LIST, definition: failed }],
  });
  assert.match(held.units[0].reason, /^STATUS_FAILED:/);
  assert.match(held.units[0].reason, /COMPILE/);

  const removed = await simulate({
    moduleName: 'agendaClinica',
    io: spyHost({}).io,
    removals: [SCOPE],
    units: [],
  });
  assert.equal(removed.units[0].action, 'remove');
  assert.match(removed.units[0].reason, /^REMOVE:/);
});

void test('implement stage does not fall back to a structure handler', async () => {
  const named = await simulate({
    moduleName: 'agendaClinica',
    stage: 'implement',
    io: spyHost({}).io,
    units: [{ defPath: CONSULTA, definition: entity('Consulta', []) }],
  });
  assert.equal(named.units[0].action, 'generate');
  assert.equal(named.units[0].handlerId, 'implement.domainEntity');
  assert.equal(named.units[0].handlerId?.startsWith('structure.'), false);
  const table = await simulate({
    moduleName: 'agendaClinica',
    stage: 'implement',
    io: spyHost({}).io,
    units: [{
      defPath: '_102047_/l1/agendaClinica/layer_1_external/persistence/tables/consulta.defs.ts',
      definition: {
        schemaVersion: '2026-09-24-d1-definition-v2',
        artifactType: 'table',
        artifactId: 'consulta',
        moduleName: 'agendaClinica',
        status: 'pending',
        dependencies: [],
        data: { tableId: 'consulta' },
      },
    }],
  });
  assert.match(table.units[0].reason, /^NO_NAMED_HANDLER:/);
  assert.match(table.units[0].reason, /implement/);
  assert.equal(table.units[0].action, 'blocked');
});

void test('product core does not import node, the legacy rank, or a model client', () => {
  const files = readdirSync(PRODUCT, { recursive: true })
    .map(entry => String(entry))
    .filter(entry => entry.endsWith('.ts') && !entry.endsWith('.test.ts'));
  assert.ok(files.length >= 6);
  for (const file of files) {
    const source = readFileSync(join(PRODUCT, file), 'utf8');
    assert.doesNotMatch(source, /from ['"]node:/, file);
    assert.doesNotMatch(source, /\bfetch\s*\(/, file);
    assert.doesNotMatch(source, /layerRank|orderItems|applicationUsecase|persistenceTable/, file);
  }
});

void test('d1_32 replay simulates without writing and keeps scope ahead of controllers', async () => {
  const loaded = loadReplay();
  assert.equal(loaded.units.length, 32);
  const host = diskHost(loaded.sources);
  const input = {
    moduleName: 'agendaClinica',
    io: host.io,
    state: host.state,
    units: loaded.units,
  };
  const first = await simulate(input);
  const before = stamp(host.paths);
  const second = await simulate(input);
  assert.deepEqual(stamp(host.paths), before);
  assert.equal(host.mutations.length, 0);
  assert.equal(first.wrote, false);
  assert.deepEqual(first, second);
  assert.equal(first.units.length, 32);
  for (const unit of first.units) {
    assert.equal(unit.needsLlm, false, unit.defPath);
    assert.ok(['generate', 'reuse', 'verify', 'blocked', 'remove'].includes(unit.action), unit.defPath);
    if (unit.action === 'generate') assert.ok(unit.handlerId, unit.defPath);
  }
  const at = (artifactId: string) => first.order.indexOf(first.units.find(unit => unit.artifactId === artifactId)!.defPath);
  const scope = first.units.find(unit => unit.artifactType === 'accessScope')!;
  const controller = first.units.find(unit => unit.artifactId === 'consultas_profissional')!;
  assert.ok(scope.defPath > controller.defPath, 'path sort would put the layer_1 controller first');
  assert.ok(first.order.indexOf(scope.defPath) < first.order.indexOf(controller.defPath));
  assert.ok(at('listConsulta') < at('consultas_profissional'));
  assert.ok(at('registrarAtendimento') < at('consultas_profissional'));
  assert.ok(at('Consulta') < at('consulta'));
  const outbound = first.units.find(unit => unit.artifactType === 'integrationOutbound')!;
  assert.match(outbound.reason, /^MECHANISM_UNBOUND:/);
  assert.equal(outbound.action, 'blocked');
  const confirmar = first.units.find(unit => unit.artifactId === 'confirmarConsulta')!;
  assert.equal(confirmar.blockedBy.some(path => path.includes('outbound')), false);
  assert.equal(confirmar.reason.includes('outbound.defs.ts'), false);
  const domain = first.units.find(unit => unit.artifactId === 'Consulta' && unit.artifactType === 'domainEntity')!;
  assert.equal(domain.contextRefs.includes(PLATFORM_FILES.mdmFacade), false);
  const created = first.units.find(unit => unit.artifactId === 'createPaciente')!;
  assert.ok(created.contextRefs.includes(PLATFORM_FILES.mdmFacade));
  assert.ok(created.contextRefs.some(ref => ref.endsWith('/l4/ontology/mdm.defs.ts')));
  assert.notEqual(PLATFORM_FILES.mdmFacade, created.contextRefs.find(ref => ref.endsWith('/l4/ontology/mdm.defs.ts')));
  const seeds = first.units.find(unit => unit.artifactType === 'persistenceSeeds')!;
  assert.equal(seeds.needsLlm, false);
  assert.match(seeds.reason, /^(GENERATE|BLOCKED_BY|MISSING_REF|CONTEXT_UNREAD):/);
  const authority = first.units.find(unit => unit.artifactType === 'authorityMap')!;
  assert.match(authority.reason, /^NO_CONSUMER:/);
});

function entity(artifactId: string, dependencies: string[]): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'domainEntity',
    artifactId,
    moduleName: 'agendaClinica',
    status: 'pending',
    dependencies: [...dependencies].sort(),
    data: {
      entityId: artifactId,
      storageTarget: 'moduleDatabase',
      fields: [{ name: 'id', type: 'uuid' }],
      lifecycle: { states: [], transitions: [] },
      invariants: [],
      imports: [],
    },
  };
}

function spyHost(files: Record<string, string>): { io: MaterializeReadIo; state: MaterializeStateStore; mutations: string[] } {
  const mutations: string[] = [];
  const io: MaterializeReadIo = {
    async read(ref) {
      return Object.prototype.hasOwnProperty.call(files, ref) ? files[ref] : null;
    },
  };
  const state: MaterializeStateStore = {
    async readReceipt() { return null; },
    async writeReceipt() { mutations.push('writeReceipt'); },
    async readOwned() { mutations.push('readOwned'); return null; },
    async writeOwned() { mutations.push('writeOwned'); },
    async removeOwned() { mutations.push('removeOwned'); return { removed: [], kept: [] }; },
    async readRevision() { mutations.push('readRevision'); return null; },
  };
  return { io, state, mutations };
}

function diskHost(replay: ReadonlyMap<string, string>): { io: MaterializeReadIo; state: MaterializeStateStore; mutations: string[]; paths: string[] } {
  const mutations: string[] = [];
  const mls = resolve(HERE, '../../../..');
  const paths: string[] = [];
  const io: MaterializeReadIo = {
    async read(ref) {
      if (replay.has(ref)) return replay.get(ref) ?? null;
      const match = /^_(\d+)_\/(.+)$/.exec(ref);
      if (!match) return null;
      const disk = join(mls, `mls-${match[1]}`, match[2]);
      if (!existsSync(disk) || !statSync(disk).isFile()) return null;
      paths.push(disk);
      return readFileSync(disk, 'utf8');
    },
  };
  const state: MaterializeStateStore = {
    async readReceipt() { return null; },
    async writeReceipt() { mutations.push('writeReceipt'); },
    async readOwned() { mutations.push('readOwned'); return null; },
    async writeOwned() { mutations.push('writeOwned'); },
    async removeOwned() { mutations.push('removeOwned'); return { removed: [], kept: [] }; },
    async readRevision() { mutations.push('readRevision'); return null; },
  };
  return { io, state, mutations, paths };
}

function stamp(paths: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const path of [...new Set(paths)].sort()) out[path] = statSync(path).mtimeMs;
  return out;
}

function loadReplay(): { units: { defPath: string; definition: unknown }[]; sources: Map<string, string> } {
  const root = resolve(HERE, '../../../../../todo/gerarApp/l1/certificacao/runs/d1_32/defs');
  const sources = new Map<string, string>();
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith('.defs.ts')) {
        const source = readFileSync(full, 'utf8');
        const ref = /fileReference="([^"]+)"/.exec(source)?.[1];
        if (!ref) throw new Error(`replay file has no fileReference: ${full}`);
        sources.set(ref, source);
      }
    }
  };
  visit(root);
  const units = [...sources.entries()].map(([defPath, source]) => {
    const parsed = parseDefinitionSource(source);
    if (!('definition' in parsed)) throw new Error(`${defPath}: ${parsed.issues.join(' ')}`);
    return { defPath, definition: parsed.definition };
  });
  return { units, sources };
}
