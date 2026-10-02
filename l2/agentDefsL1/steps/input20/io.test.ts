/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/io.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { inputFile, plannerPipelineFile, type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { progressFile } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { assembleD1Input, fileInfoFromDisplay, persistD1Input, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { readContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'head');
const CONTRACTS = path.join(HERE, 'fixtures', 'contracts');
const MODULE = 'agendaClinica';
const PROJECT = 102047;
const PAGES = ['agenda', 'cadastro_profissional', 'cadastro_recepcionista', 'consultas', 'pacientes'];

/**
 * The frozen head carries backend v1.1 and effort v1.1. D1 reads only the v1.2 plans the producers
 * write (d1_37 effort, d1_39 backend), so both are refused by path and nothing else is reported on them.
 */
function assertEffortRefused(snapshot: { consumersReleased: boolean; problems: Array<{ severity: string; code: string; path: string; message: string }> }): void {
  const errors = snapshot.problems.filter(problem => problem.severity === 'error');
  assert.deepEqual(errors.map(problem => `${problem.code} ${problem.path}`), [
    `SCHEMA_DIVERGENT l4/${MODULE}/pool/l2/web/backend.json`,
    `SCHEMA_DIVERGENT l4/${MODULE}/pool/l2/web/effort.json`,
  ]);
  assert.match(errors[0].message, /'2026-09-21-p1-backend-v1\.1', expected 2026-09-21-p1-backend-v1\.2\. Regenerate/);
  assert.match(errors[1].message, /'2026-09-21-p2-effort-v1\.1', expected 2026-09-21-p2-effort-v1\.2\. Regenerate/);
  assert.equal(snapshot.consumersReleased, false);
}

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

function seedFixture(host: TestHost): void {
  for (const rel of walk(FIXTURE, '')) {
    const file = rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
    const info = fileInfoFromDisplay(PROJECT, file);
    assert.ok(info, rel);
    seed(host, info, readFileSync(path.join(FIXTURE, rel), 'utf8'), `frozen-${file}`);
  }
}

void test('input.json reopens the same snapshot and writes nothing outside the receipt', { skip: 'agendaClinica fixtures kept by Wagner (01/10); not a v2 source' }, async () => {
  const host = installStudio(PROJECT);
  seedFixture(host);
  const neighbors: D1FileInfo[] = [
    plannerPipelineFile(PROJECT, MODULE),
    { project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: '20260921173358_agendaClinica-20260921172812_1', extension: '.json' },
    { project: PROJECT, level: 5, folder: MODULE, shortName: 'marker', extension: '.json' },
    { project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: 'pacientes', extension: '.defs.ts' },
    { project: PROJECT, level: 4, folder: `${MODULE}/ontology`, shortName: 'Consulta', extension: '.defs.ts' },
  ];
  seed(host, neighbors[1], '{"from":"l1","to":"l2"}\n', 'pool-message');
  seed(host, neighbors[2], '{"l5":true}\n', 'l5-neighbor');
  seed(host, neighbors[3], 'export const pacientesContract = { "moduleName": "agendaClinica", "pageId": "pacientes" } as const;\n', 'l2-neighbor');
  const before = new Map(neighbors.map(info => [fileKey(info), host.files[fileKey(info)]?.content]));
  const mtimes = new Map(neighbors.map(info => [fileKey(info), host.files[fileKey(info)]?.updatedAt]));

  const first = await assembleD1Input(PROJECT, MODULE);
  assert.equal(first.selection.usecases.length, 13);
  assert.equal(first.selection.outbound.length, 3);
  const saved = await persistD1Input(PROJECT, MODULE, first);
  assert.equal(saved.reused, false);
  assert.deepEqual(host.writes, [fileKey(inputFile(PROJECT, MODULE))]);

  first.selection.pages = [];
  const again = await assembleD1Input(PROJECT, MODULE);
  const stored = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '{}') as { snapshotHash: string };
  assert.equal(again.snapshotHash, first.snapshotHash);
  assert.equal(again.snapshotHash, stored.snapshotHash);
  assert.equal(again.selection.pages.length, 5);
  const twice = await persistD1Input(PROJECT, MODULE, again);
  assert.equal(twice.reused, true);
  assert.deepEqual(host.writes, [fileKey(inputFile(PROJECT, MODULE))]);

  for (const info of neighbors) {
    const key = fileKey(info);
    assert.equal(host.files[key]?.content, before.get(key), key);
    assert.equal(host.files[key]?.updatedAt, mtimes.get(key), key);
  }
  assert.equal(host.files[fileKey(neighbors[1])]?.content.includes('from'), true);
  assert.equal(Object.keys(host.files).some(key => key.includes('/layer_')), false);
});

function realContractFiles(): string[] {
  return readdirSync(CONTRACTS).filter(name => name.endsWith('.defs.txt')).sort();
}

void test('with the six agendaClinica L2 contracts parsed, a v1.1 effort alone holds consumers', { skip: 'agendaClinica fixtures kept by Wagner (01/10); not a v2 source' }, async () => {
  const names = realContractFiles();
  assert.equal(names.length, 6);
  const host = installStudio(PROJECT);
  seedFixture(host);
  for (const [index, name] of names.entries()) {
    const source = readFileSync(path.join(CONTRACTS, name), 'utf8');
    const ast = readContractAst(source, name.replace(/\.txt$/, '.ts'));
    assert.deepEqual(ast.unparsed, [], name);
    if (index >= PAGES.length) continue;
    const pageId = PAGES[index];
    seed(host, fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${pageId}.defs.ts`)!, source, `contract-${pageId}`);
  }
  const snapshot = await assembleD1Input(PROJECT, MODULE);
  assertEffortRefused(snapshot);
  const pacientes = snapshot.sources.find(source => source.path === `l2/${MODULE}/web/contracts/pacientes.defs.ts`);
  assert.equal(pacientes?.state, 'present');
});

void test('a missing L2 contract is CONTRACT_ABSENT', async () => {
  const host = installStudio(PROJECT);
  seedFixture(host);
  const snapshot = await assembleD1Input(PROJECT, MODULE);
  const absent = snapshot.problems.filter(problem => problem.code === 'CONTRACT_ABSENT');
  assert.ok(absent.length >= 1);
  assert.ok(absent.every(problem => problem.path.startsWith(`l2/${MODULE}/web/contracts/`) && problem.path.endsWith('.defs.ts')));
  assert.equal(snapshot.problems.some(problem => problem.code === 'CONTRACT_UNPARSED'), false);
  assert.equal(snapshot.consumersReleased, false);
});

void test('an existing unreadable contract is CONTRACT_UNPARSED, never ABSENT', async () => {
  const host = installStudio(PROJECT);
  seedFixture(host);
  const names = realContractFiles();
  for (const [index, name] of names.entries()) {
    if (index >= PAGES.length) break;
    const pageId = PAGES[index];
    const source = pageId === 'pacientes'
      ? 'export interface Broken { id: string'
      : readFileSync(path.join(CONTRACTS, name), 'utf8');
    seed(host, fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${pageId}.defs.ts`)!, source, `contract-${pageId}`);
  }
  const snapshot = await assembleD1Input(PROJECT, MODULE);
  const contract = `l2/${MODULE}/web/contracts/pacientes.defs.ts`;
  const unparsed = snapshot.problems.filter(problem => problem.code === 'CONTRACT_UNPARSED' && problem.path === contract);
  assert.ok(unparsed.length >= 1);
  assert.match(unparsed[0].message, /Broken/);
  assert.equal(snapshot.problems.some(problem => problem.code === 'CONTRACT_ABSENT' && problem.path === contract), false);
  assert.equal(snapshot.sources.find(source => source.path === contract)?.state, 'invalid');
  assert.equal(snapshot.consumersReleased, false);
});

function seedContracts(host: TestHost): void {
  const names = realContractFiles();
  for (const [index, name] of names.entries()) {
    if (index >= PAGES.length) break;
    const pageId = PAGES[index];
    seed(host, fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${pageId}.defs.ts`)!, readFileSync(path.join(CONTRACTS, name), 'utf8'), `contract-${pageId}`);
  }
}

async function writeUsecaseReceipt(defPath: string, desiredHash: string, snapshotHash: string, finalized = true): Promise<void> {
  await writeJson(progressFile(PROJECT, MODULE, 'usecases50', 'usecases50'), {
    schemaVersion: '2026-09-22-d1-progress-v1',
    project: PROJECT,
    moduleName: MODULE,
    step: 'usecases50',
    unitId: 'usecases50',
    runId: snapshotHash,
    snapshotHash,
    draftHash: 'sha256:aa',
    transaction: false,
    finalized,
    invalidated: false,
    reported: [],
    files: [{ defPath, action: 'write', previousHash: '', desiredHash, status: 'done', outputTs: [] }],
    issues: [],
  });
}

void test('resume reads the writer receipt, keeps the snapshot, and still refuses a changed or unreceipted def', { skip: 'agendaClinica fixtures kept by Wagner (01/10); not a v2 source' }, async () => {
  const host = installStudio(PROJECT);
  seedFixture(host);
  seedContracts(host);
  const first = await assembleD1Input(PROJECT, MODULE);
  assertEffortRefused(first);
  await persistD1Input(PROJECT, MODULE, first);
  const target = first.files.find(file => file.artifactType === 'usecase');
  assert.ok(target);
  const body = 'export const definition = { resume: true } as const;\n';
  const info = fileInfoFromDisplay(PROJECT, target.defPath);
  assert.ok(info);
  seed(host, info, body, 'written-def');
  const desiredHash = await sha256Text(body);
  await writeUsecaseReceipt(target.defPath, desiredHash, first.snapshotHash);

  const resume = await assembleD1Input(PROJECT, MODULE);
  assert.equal(resume.problems.some(problem => problem.code === 'EXISTS_WITHOUT_RECEIPT'), false);
  assertEffortRefused(resume);
  assert.equal(resume.files.find(file => file.defPath === target.defPath)?.action, 'create');
  assert.equal(resume.snapshotHash, first.snapshotHash);
  const again = await persistD1Input(PROJECT, MODULE, resume);
  assert.equal(again.reused, true);

  seed(host, info, `${body} `, 'tampered');
  const tampered = await assembleD1Input(PROJECT, MODULE);
  const problem = tampered.problems.find(item => item.code === 'EXISTS_WITHOUT_RECEIPT' && item.path === target.defPath);
  assert.ok(problem);
  assert.match(problem.message, new RegExp(desiredHash));
  assert.equal(tampered.consumersReleased, false);

  delete host.files[fileKey(info)];
  const missing = await assembleD1Input(PROJECT, MODULE);
  assert.equal(missing.problems.some(item => item.code === 'EXISTS_WITHOUT_RECEIPT'), false);
  assert.equal(missing.files.find(file => file.defPath === target.defPath)?.action, 'create');
  assertEffortRefused(missing);
  assert.equal(missing.snapshotHash, first.snapshotHash);
});

void test('a worker trace is not a file receipt', async () => {
  const host = installStudio(PROJECT);
  seedFixture(host);
  seedContracts(host);
  const first = await assembleD1Input(PROJECT, MODULE);
  await persistD1Input(PROJECT, MODULE, first);
  const target = first.files.find(file => file.artifactType === 'usecase');
  assert.ok(target);
  const info = fileInfoFromDisplay(PROJECT, target.defPath);
  assert.ok(info);
  seed(host, info, 'export const definition = { traced: true } as const;\n', 'traced-def');
  await writeJson({
    project: PROJECT,
    level: 1,
    folder: `${MODULE}/pipeline/agentDefsL1/traces`,
    shortName: 'usecases50-createPaciente',
    extension: '.json',
  }, {
    usecaseId: 'createPaciente',
    status: 'parsed',
    trace: 'usecases50 recorded steps for createPaciente.',
    reply: [],
  });
  const resume = await assembleD1Input(PROJECT, MODULE);
  assert.equal(resume.problems.some(problem => problem.code === 'EXISTS_WITHOUT_RECEIPT' && problem.path === target.defPath), true);
  assert.equal(resume.consumersReleased, false);
});

void test('an unfinished writer receipt does not authorize a present def', async () => {
  const host = installStudio(PROJECT);
  seedFixture(host);
  seedContracts(host);
  const first = await assembleD1Input(PROJECT, MODULE);
  await persistD1Input(PROJECT, MODULE, first);
  const target = first.files.find(file => file.artifactType === 'usecase');
  assert.ok(target);
  const body = 'export const definition = { pending: true } as const;\n';
  const info = fileInfoFromDisplay(PROJECT, target.defPath);
  assert.ok(info);
  seed(host, info, body, 'pending-def');
  await writeUsecaseReceipt(target.defPath, await sha256Text(body), first.snapshotHash, false);
  const resume = await assembleD1Input(PROJECT, MODULE);
  assert.equal(resume.problems.some(problem => problem.code === 'EXISTS_WITHOUT_RECEIPT' && problem.path === target.defPath), true);
  assert.equal(resume.consumersReleased, false);
});

// d1_39: the current seed. Inputs copied from mls-102047; needs, backend, effort and the planner
// pipeline are the producers' bytes (regenHead.test proves it). This is the real reader over them.
const CURRENT = path.join(HERE, 'fixtures', 'current');
const BACKEND = `l4/${MODULE}/pool/l2/web/backend.json`;
const EFFORT = `l4/${MODULE}/pool/l2/web/effort.json`;

type Json = Record<string, unknown> & { testSupport: Array<Record<string, unknown>> };

async function readCurrent(edit?: (plans: { backend: Json; effort: Json }) => void, rename: Array<[string, string]> = []) {
  const host = installStudio(PROJECT);
  const texts = new Map<string, string>();
  const renamed = (value: string) => rename.reduce((out, [from, to]) => out.split(from).join(to), value);
  for (const rel of walk(CURRENT, '')) {
    const file = rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
    texts.set(renamed(file), renamed(readFileSync(path.join(CURRENT, rel), 'utf8')));
  }
  if (edit) {
    const plans = { backend: JSON.parse(texts.get(BACKEND)!) as Json, effort: JSON.parse(texts.get(EFFORT)!) as Json };
    edit(plans);
    texts.set(BACKEND, `${JSON.stringify(plans.backend, null, 2)}\n`);
    texts.set(EFFORT, `${JSON.stringify(plans.effort, null, 2)}\n`);
  }
  for (const [file, text] of texts) seed(host, fileInfoFromDisplay(PROJECT, file)!, text, 'current');
  return assembleD1Input(PROJECT, MODULE);
}

function errorsOf(snapshot: { problems: Array<{ severity: string; code: string; path: string; message: string }> }): string[] {
  return snapshot.problems.filter(problem => problem.severity === 'error').map(problem => `${problem.code} ${problem.path}`);
}

// d1_53 r1c: testSupport, schema and hash do not depend on a transition. The stock seed has none.
const STOCK = 'controleEstoque';
const STOCK_BACKEND = `l4/${STOCK}/pool/l2/web/backend.json`;
const STOCK_EFFORT = `l4/${STOCK}/pool/l2/web/effort.json`;

async function readStock(edit?: (plans: { backend: Json; effort: Json }) => void) {
  const host = installStudio(PROJECT);
  const texts = new Map(Object.entries(loadD1Fixture('controleEstoque-39a5166')));
  if (edit) {
    const plans = { backend: JSON.parse(texts.get(STOCK_BACKEND)!) as Json, effort: JSON.parse(texts.get(STOCK_EFFORT)!) as Json };
    edit(plans);
    texts.set(STOCK_BACKEND, `${JSON.stringify(plans.backend, null, 2)}\n`);
    texts.set(STOCK_EFFORT, `${JSON.stringify(plans.effort, null, 2)}\n`);
  }
  for (const [file, text] of texts) {
    const platform = /^_(\d+)_\/(.+)$/.exec(file);
    const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, file);
    assert.ok(info, file);
    seed(host, info, text, 'stock');
  }
  return assembleD1Input(PROJECT, STOCK);
}

void test('the current producer outputs are read as they are and release the consumers', { skip: 'agendaClinica fixtures kept by Wagner (01/10); not a v2 source' }, async () => {
  const snapshot = await readCurrent();
  assert.deepEqual(errorsOf(snapshot), []);
  assert.equal(snapshot.consumersReleased, true);
  const backend = JSON.parse(readFileSync(path.join(CURRENT, BACKEND), 'utf8')) as { schemaVersion: string; endpoints: Array<{ route: string }>; testSupport: unknown[] };
  assert.equal(snapshot.sources.find(source => source.path === BACKEND)?.schemaVersion, '2026-09-21-p1-backend-v1.2');
  assert.equal(snapshot.sources.find(source => source.path === EFFORT)?.schemaVersion, '2026-09-21-p2-effort-v1.2');
  assert.deepEqual(snapshot.selection.routes.map(route => route.route), backend.endpoints.map(endpoint => endpoint.route).sort());
  assert.ok(backend.testSupport.length > 0);
  assert.equal(snapshot.problems.some(problem => problem.code.startsWith('TEST_SUPPORT')), false);
});

void test('an empty testSupport is valid; an absent one is refused on the backend', async () => {
  const empty = await readStock(plans => {
    plans.backend.testSupport = [];
    plans.effort.testSupport = [];
  });
  assert.deepEqual(errorsOf(empty), []);
  const absent = await readStock(plans => {
    delete (plans.backend as Partial<Json>).testSupport;
  });
  assert.deepEqual(errorsOf(absent), [`TEST_SUPPORT_INVALID ${STOCK_BACKEND}`]);
  assert.match(absent.problems.find(problem => problem.code === 'TEST_SUPPORT_INVALID')!.message, /required \(an empty array is valid\)/);
  assert.equal(absent.consumersReleased, false);
});

void test('an invalid testSupport item is refused by field; D1 does not fill it', async () => {
  const snapshot = await readCurrent(plans => {
    const [first, second] = plans.backend.testSupport;
    Object.assign(first, { owner: 'D1', status: 'ready', actorRefs: ['ghost'], entityRefs: ['Ghost'], gap: '' });
    delete second.sourceRefs;
    second.id = first.id;
    plans.effort.testSupport = plans.backend.testSupport.map(item => ({ ...item }));
  });
  const invalid = snapshot.problems.filter(problem => problem.code === 'TEST_SUPPORT_INVALID').map(problem => problem.message.replace(/^testSupport\[\d+\] \([^)]*\): /, ''));
  for (const expected of [
    'status must be toCreate|toUpdate|toRemove|done.',
    'owner must be L1|runtime.',
    'actorRef ghost is not a needs actor.',
    'entityRef Ghost is not an ontology entity.',
    'no executorRef or cleanupRef and no gap.',
    'duplicate id.',
    'sourceRefs must be an array of refs.',
  ]) assert.ok(invalid.includes(expected), expected);
  assert.equal(snapshot.consumersReleased, false);
  const input = JSON.parse(readFileSync(path.join(CURRENT, BACKEND), 'utf8')) as Json;
  assert.equal(input.testSupport.every(item => item.executorRef === '' && item.cleanupRef === '' && String(item.gap) !== ''), true);
});

void test('a done testSupport item needs both refs', async () => {
  const snapshot = await readCurrent(plans => {
    plans.backend.testSupport[0].status = 'done';
    plans.effort.testSupport[0].status = 'done';
  });
  assert.ok(snapshot.problems.some(problem => problem.code === 'TEST_SUPPORT_INVALID' && /done without executorRef and cleanupRef/.test(problem.message)));
});

void test('effort must mirror the backend testSupport and version', async () => {
  const snapshot = await readStock(plans => {
    plans.effort.testSupport = plans.effort.testSupport.slice(1);
    (plans.effort.meta as Record<string, unknown>).sourceVersion = '2026-09-21-p1-backend-v1.1';
  });
  assert.deepEqual(errorsOf(snapshot), [`DIVERGENT_SOURCE ${STOCK_EFFORT}`, `DIVERGENT_SOURCE ${STOCK_EFFORT}`]);
  assert.deepEqual(snapshot.problems.filter(problem => problem.path === STOCK_EFFORT).map(problem => problem.message).sort(), [
    "meta.sourceVersion is '2026-09-21-p1-backend-v1.1', expected 2026-09-21-p1-backend-v1.2.",
    'testSupport[] is not the copy of the backend plan. Regenerate effort from this backend.',
  ]);
});

void test('an old backend plan is refused for regeneration and not converted', async () => {
  const snapshot = await readStock(plans => {
    plans.backend.schemaVersion = '2026-09-21-p1-backend-v1.1';
    delete (plans.backend as Partial<Json>).testSupport;
  });
  assert.deepEqual(errorsOf(snapshot), [`SCHEMA_DIVERGENT ${STOCK_BACKEND}`]);
  assert.match(snapshot.problems.find(problem => problem.code === 'SCHEMA_DIVERGENT')!.message, /expected 2026-09-21-p1-backend-v1\.2\. Regenerate l4\/controleEstoque\/pool\/l2\/web\/backend\.json with its producer; other versions are not converted\./);
  assert.equal(snapshot.consumersReleased, false);
});

void test('divergent refs and totals between the two plans are refused', { skip: 'agendaClinica fixtures kept by Wagner (01/10); not a v2 source' }, async () => {
  const snapshot = await readCurrent(plans => {
    const endpoints = plans.effort.endpoints as Array<Record<string, unknown>>;
    endpoints[0].usecaseRef = 'otherUsecase';
    ((plans.effort.totals as Record<string, Record<string, number>>).tables).toCreate += 1;
  });
  const codes = errorsOf(snapshot);
  assert.ok(codes.includes(`DIVERGENT_SOURCE ${BACKEND}`), codes.join());
  assert.ok(codes.includes(`TOTALS_DIVERGENT ${EFFORT}`), codes.join());
  assert.equal(snapshot.consumersReleased, false);
});

void test('the current seed with an entity renamed everywhere reads the same way', { skip: 'agendaClinica fixtures kept by Wagner (01/10); not a v2 source' }, async () => {
  const before = await readCurrent();
  const after = await readCurrent(undefined, [['ContatoPaciente', 'VinculoX'], ['contatoPaciente', 'vinculoX']]);
  assert.deepEqual(errorsOf(after), []);
  assert.equal(after.consumersReleased, true);
  assert.equal(after.selection.routes.length, before.selection.routes.length);
  assert.equal(after.selection.usecases.length, before.selection.usecases.length);
  assert.ok(after.selection.entities.includes('VinculoX'));
  assert.equal(JSON.stringify(after.selection).includes('ContatoPaciente'), false);
});

void test('a testSupport-only change moves the hash and leaves the functional plan alone', async () => {
  const before = await readStock();
  assert.equal((await readStock(() => {})).snapshotHash, before.snapshotHash);
  const after = await readStock(plans => {
    plans.backend.testSupport[0].gap = `${String(plans.backend.testSupport[0].gap)} (edited)`;
    plans.effort.testSupport[0].gap = plans.backend.testSupport[0].gap;
  });
  assert.deepEqual(errorsOf(after), []);
  assert.notEqual(after.snapshotHash, before.snapshotHash);
  assert.notEqual(after.sources.find(source => source.path === STOCK_BACKEND)?.sha256, before.sources.find(source => source.path === STOCK_BACKEND)?.sha256);
  assert.deepEqual(after.selection, before.selection);
  assert.deepEqual(after.files, before.files);
});
