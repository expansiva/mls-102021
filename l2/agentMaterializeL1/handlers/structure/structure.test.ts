/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/structure.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, readDefinition, receiptPathFor, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeOwnedRemoval, MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { decideProfile } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import { runMaterialize, type HandlerCall, type MaterializeRunHost } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import type { SimulatedUnit } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import { M1_STUB_ERROR, M1_STUB_STATUS, parseCatalog } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { classifyCase, verifyBatch, type M1Observation } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import { grantsOf } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { decideRoute } from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';
import { runStructure, structureHandlerIds, structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const CATALOG_REF = 'catalog.json';
const CATALOG = readFileSync(join(HERE, '../../testing/catalogFixture.json'), 'utf8');
const FIXTURES = loadFixtures(join(HERE, 'fixtures'));

void test('structure runners cover the registry ids and stay free of node', () => {
  const ids = structureHandlerIds();
  assert.deepEqual(ids, [
    'structure.accessScope',
    'structure.authorityMap',
    'structure.domainEntity',
    'structure.httpController',
    'structure.repositoryPort',
    'structure.usecase',
    'structure.valueObject',
  ]);
  for (const id of ids) assert.equal(typeof structureRunners[id], 'function');
  assert.equal('persistence.table' in structureRunners, false);
  const runner = readFileSync(join(HERE, 'runners.ts'), 'utf8');
  const studio = readFileSync(join(HERE, '../../studioHost.ts'), 'utf8');
  const cli = readFileSync(join(ROOT, 'mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts'), 'utf8');
  assert.equal(runner.includes('node:'), false);
  assert.equal(runner.includes('typescript'), false);
  assert.equal(runner.includes("from 'fs'"), false);
  assert.equal(studio.includes('node:'), false);
  assert.equal(studio.includes('structureRunners'), true);
  assert.equal(cli.includes('structureRunners'), true);
  assert.equal(readFileSync(join(HERE, '../../core/registry.ts'), 'utf8').includes('structure.usecase'), true);
});

void test('create and list Consulta compile, and the usecase does not pretend to succeed', async () => {
  const ids = ['Consulta', 'ConsultaRepository', 'createConsulta', 'listConsulta'];
  const emitted = await emitAll(ids);
  for (const outcome of emitted) assert.equal(outcome.failure, null, outcome.failure?.detail);
  const create = sourceOf(emitted, 'createConsulta');
  const list = sourceOf(emitted, 'listConsulta');
  assert.match(create, /throw new AppError\('USECASE_NOT_IMPLEMENTED'/);
  assert.match(list, /throw new AppError\('USECASE_NOT_IMPLEMENTED'/);
  assert.equal(create.includes('ok: true'), false);
  assert.equal(list.includes('ok: true'), false);
  assert.match(create, /from '\/_102034_\/l1\/server\/layer_2_controllers\/contracts\.js'/);
  assert.match(create, /CreateConsultaInput as CreateConsultaInput_0/);
  assert.equal(create.includes("from '/_102047_/l4/"), false);
  const problems = compile(emitted);
  assert.equal(problems, '', problems);
});

void test('the remaining structure files compile after the first pair', async () => {
  const emitted = await emitAll([...FIXTURES.keys()].map(path => FIXTURES.get(path)!.definition.artifactId));
  const failed = emitted.filter(item => item.failure);
  assert.deepEqual(failed.map(item => `${item.artifactId}: ${item.failure?.code} ${item.failure?.detail}`), []);
  const problems = compile(emitted);
  assert.equal(problems, '', problems);
  const controller = sourceOf(emitted, 'consultas_recepcionista');
  const start = controller.indexOf('async function handleCmdCreateConsulta');
  const handler = controller.slice(start, controller.indexOf('async function handle', start + 20));
  assert.ok(handler.indexOf('authorize(') < handler.indexOf('validateInput('));
  assert.ok(handler.indexOf('validateInput(') < handler.indexOf('await createConsulta('));
  const access = sourceOf(emitted, 'accessScope');
  assert.match(access, /profissionalAgendaDiaria/);
  assert.match(access, /ACCESS_ANCHOR/);
});

void test('verifyBatch accepts the structure checkpoint and rejects a different failure', async () => {
  const wanted = ['createConsulta', 'listConsulta', 'registrarAtendimento', 'consultas_recepcionista', 'consultas_profissional'];
  const emitted = await emitAll(wanted);
  for (const item of emitted) assert.equal(item.failure, null, `${item.artifactId} ${item.failure?.detail}`);
  const usecase = handlerFor('usecase', 'structure');
  const controller = handlerFor('httpController', 'structure');
  assert.ok(usecase && controller);
  const usecaseReport = await verifyBatch({
    handler: usecase,
    io: { read },
    catalogRef: CATALOG_REF,
    observations: emitted.filter(item => item.definition.artifactType === 'usecase').flatMap(item => item.observations),
    runId: 'm1-03',
    commit: 'structure',
    startedAt: '2026-09-25T12:00:00.000Z',
    finishedAt: '2026-09-25T12:00:01.000Z',
    monitorError: null,
  });
  assert.equal(usecaseReport.accepted, true, usecaseReport.nextAction);
  assert.deepEqual(usecaseReport.counts, { passed: 3, expectedRed: 8, failed: 0, blocked: 0, skipped: 0, inconclusive: 0 });
  assert.equal(usecaseReport.ready, false);

  const controllerReport = await verifyBatch({
    handler: controller,
    io: { read },
    catalogRef: CATALOG_REF,
    observations: emitted.filter(item => item.definition.artifactType === 'httpController').flatMap(item => item.observations),
    runId: 'm1-03',
    commit: 'structure',
    startedAt: '2026-09-25T12:00:00.000Z',
    finishedAt: '2026-09-25T12:00:01.000Z',
    monitorError: null,
  });
  assert.equal(controllerReport.accepted, true, controllerReport.nextAction);
  assert.deepEqual(controllerReport.counts, { passed: 3, expectedRed: 0, failed: 0, blocked: 0, skipped: 0, inconclusive: 0 });

  const catalog = parseCatalog(CATALOG).catalog;
  assert.ok(catalog);
  const business = catalog.scenarios.flatMap(item => item.cases).find(item => item.caseId === 'createConsulta.creates');
  assert.ok(business);
  const wrong = classifyCase('structure', business, observation(business.caseId, { ok: false, status: 500, errorCode: 'INTERNAL_ERROR' }));
  assert.equal(wrong.verdict, 'failed');
  const broken = classifyCase('structure', business, observation(business.caseId, { broken: 'import', errorCode: M1_STUB_ERROR, status: M1_STUB_STATUS }));
  assert.equal(broken.verdict, 'failed');
  const masked = await verifyBatch({
    handler: controller,
    io: { read },
    catalogRef: CATALOG_REF,
    observations: catalog.scenarios.filter(item => item.handlerId === 'structure.httpController').flatMap(item => item.cases).map(item => (
      observation(item.caseId, { ok: false, status: M1_STUB_STATUS, errorCode: M1_STUB_ERROR })
    )),
    runId: 'm1-03',
    commit: 'structure',
    startedAt: '2026-09-25T12:00:00.000Z',
    finishedAt: '2026-09-25T12:00:01.000Z',
    monitorError: null,
  });
  assert.equal(masked.accepted, false);
  assert.equal(masked.counts.expectedRed, 0);
});

void test('a pending grant stays closed and is not replaced by the stub', () => {
  const access = FIXTURES.get(defPath('accessScope'))!;
  const grants = grantsOf(access.definition.data);
  const pending = grants.find(item => item.grantId === 'profissionalAgendaDiaria');
  assert.equal(pending?.pending, 'ACCESS_ANCHOR');
  const decision = decideRoute({
    source: 'http',
    authorities: ['agendaClinica:profissional'],
    grantIds: ['profissionalAgendaDiaria'],
    grants,
    params: { id: 'consulta-1' },
    requiredFields: ['id'],
  });
  assert.equal(decision.reachedUsecase, false);
  assert.equal(decision.errorCode, 'ACCESS_ANCHOR');
  assert.notEqual(decision.errorCode, M1_STUB_ERROR);
  const empty = decideRoute({
    source: 'http',
    authorities: [],
    grantIds: ['profissionalAgendaDiaria'],
    grants,
    params: {},
    requiredFields: ['id'],
  });
  assert.equal(empty.errorCode, 'FORBIDDEN_ACTOR');
});

void test('production does not write the stub and a development receipt stays scaffold', async () => {
  const ids = ['Paciente', 'Profissional', 'Consulta', 'ConsultaRepository', 'createConsulta', 'listConsulta'];
  const units = ids.map(id => {
    const found = [...FIXTURES.values()].find(item => item.definition.artifactId === id);
    if (!found) throw new Error(id);
    return { defPath: found.defPath, definition: found.definition };
  });
  const refused = world();
  const production = await runMaterialize(request(units, 'production'), host(refused));
  const usecase = production.units.find(item => item.defPath.endsWith('/createConsulta.defs.ts'));
  const port = production.units.find(item => item.defPath.endsWith('/consultaRepository.defs.ts'));
  assert.equal(port?.code, 'PROFILE_REFUSED');
  assert.equal(usecase?.code, 'BLOCKED_BY');
  assert.equal(refused.map.has(usecase?.defPath.replace(/\.defs\.ts$/, '.ts') ?? ''), false);
  assert.equal([...refused.map.keys()].some(path => path.endsWith('/createConsulta.ts')), false);
  assert.equal([...refused.map.keys()].some(path => path.endsWith('/consultaRepository.ts')), false);

  const store = world();
  const development = await runMaterialize(request(units, 'development'), host(store));
  const created = development.units.find(item => item.defPath.endsWith('/createConsulta.defs.ts'));
  assert.equal(created?.code, 'PROMOTED', created?.detail);
  const receiptPath = receiptPathFor(created?.defPath ?? '');
  const receipt = JSON.parse(store.map.get(receiptPath) ?? '{}') as { stage?: string; reason?: string };
  assert.equal(receipt.stage, 'compile');
  assert.equal(receipt.reason, 'scaffold');
  assert.notEqual(receipt.stage, 'generate');
  const output = store.map.get(created?.defPath.replace(/\.defs\.ts$/, '.ts') ?? '');
  assert.match(output ?? '', /USECASE_NOT_IMPLEMENTED/);
  assert.equal((output ?? '').includes("status: 'generated'"), false);
  assert.equal(store.map.has(created?.defPath ?? ''), false);
});

interface Emitted {
  artifactId: string;
  definition: M1Definition;
  output: string;
  source: string;
  observations: M1Observation[];
  failure: { code: string; detail: string } | null;
}

async function emitAll(artifactIds: readonly string[]): Promise<Emitted[]> {
  const wanted = new Set(artifactIds);
  const rows: Emitted[] = [];
  for (const entry of FIXTURES.values()) {
    if (!wanted.has(entry.definition.artifactId)) continue;
    const outcome = await runStructure(callFor(entry.defPath, entry.definition));
    const output = entry.defPath.replace(/\.defs\.ts$/, '.ts');
    rows.push({
      artifactId: entry.definition.artifactId,
      definition: entry.definition,
      output,
      source: outcome.files[output] ?? '',
      observations: outcome.observations,
      failure: outcome.failure,
    });
  }
  return rows;
}

function sourceOf(rows: readonly Emitted[], artifactId: string): string {
  const found = rows.find(item => item.artifactId === artifactId);
  assert.ok(found, artifactId);
  return found.source;
}

function compile(rows: readonly Emitted[]): string {
  const dir = join(ROOT, `.m1-03-out-${process.pid}`);
  const config = join(ROOT, `.tsconfig.m1-03-${process.pid}.json`);
  try {
    const files: string[] = [];
    for (const row of rows) {
      if (!row.source) continue;
      const relativePath = row.output.replace(/^_102047_\/l1\/agendaClinica\//, '');
      const full = join(dir, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, row.source);
      files.push(relative(ROOT, full));
    }
    const overlay = `./${relative(ROOT, dir)}/*`;
    const base = readFileSync(join(ROOT, 'tsconfig.base.json'), 'utf8');
    const paths: Record<string, string[]> = { '/_102047_/l1/agendaClinica/*': [overlay] };
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
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    const own = output.split('\n').filter(line => line.includes('.m1-03-out')).join('\n').trim();
    return own;
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(config, { force: true });
  }
}

function callFor(defPath: string, definition: M1Definition): HandlerCall {
  const handler = handlerFor(definition.artifactType, 'structure');
  if (!handler) throw new Error(definition.artifactType);
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
    read,
    catalogRef: CATALOG_REF,
    repair: false,
    signal: new AbortController().signal,
    eventId: defPath,
    profile: decideProfile('development', true),
    modelText: null,
  };
}

function request(units: readonly PlanUnitInput[], mode: string) {
  return {
    project: 102047,
    moduleName: 'agendaClinica',
    stage: 'structure' as const,
    flow: '',
    resume: false,
    units,
    profileMode: mode,
    profileDeclared: true,
    budget: { timeoutMs: 5000 },
  };
}

function host(store: ReturnType<typeof world>): MaterializeRunHost {
  return {
    io: { read },
    state: store.state,
    runners: structureRunners,
    now: () => '2026-09-25T12:00:00.000Z',
    catalogRef: CATALOG_REF,
    commit: 'm1-03',
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
    async writeOwned(path, body) {
      map.set(path, new TextDecoder().decode(body));
    },
    async removeOwned(owned, requested): Promise<MaterializeOwnedRemoval> {
      return { removed: [], kept: [...requested.filter(path => !owned.includes(path))] };
    },
    async readRevision() { return null; },
  };
  return { map, state };
}

async function read(ref: string): Promise<string | null> {
  if (ref === CATALOG_REF) return CATALOG;
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
        if ('issues' in definition) throw new Error(`${path} ${definition.issues.join('; ')}`);
        const marked = /fileReference="([^"]+)"/.exec(text);
        const defPath = marked?.[1] ?? '';
        if (!defPath) throw new Error(`no file reference in ${path}`);
        map.set(defPath, { defPath, text, definition });
      }
    }
  };
  walk(dir);
  return map;
}

function defPath(artifactId: string): string {
  const found = [...FIXTURES.values()].find(item => item.definition.artifactId === artifactId);
  if (!found) throw new Error(artifactId);
  return found.defPath;
}

function observation(caseId: string, patch: Partial<M1Observation>): M1Observation {
  return {
    caseId,
    durationMs: 1,
    broken: patch.broken ?? 'none',
    thrown: patch.thrown ?? false,
    skipped: false,
    inconclusive: false,
    blocked: false,
    blockOwner: '',
    ok: patch.ok ?? false,
    status: patch.status ?? 0,
    errorCode: patch.errorCode ?? null,
    ruleId: null,
    fields: [],
    rowActorIds: [],
    reason: '',
  };
}
