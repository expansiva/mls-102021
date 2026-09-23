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
import { assembleD1Input, fileInfoFromDisplay, persistD1Input, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { readContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'head');
const CONTRACTS = path.join(HERE, 'fixtures', 'contracts');
const MODULE = 'agendaClinica';
const PROJECT = 102047;
const PAGES = ['agenda', 'cadastro_profissional', 'cadastro_recepcionista', 'consultas', 'pacientes'];

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

void test('input.json reopens the same snapshot and writes nothing outside the receipt', async () => {
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

void test('the six agendaClinica L2 contracts parse and release consumers', async () => {
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
  assert.equal(snapshot.consumersReleased, true);
  assert.equal(snapshot.problems.some(problem => problem.code === 'CONTRACT_ABSENT' || problem.code === 'CONTRACT_UNPARSED'), false);
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

void test('resume reads the writer receipt, keeps the snapshot, and still refuses a changed or unreceipted def', async () => {
  const host = installStudio(PROJECT);
  seedFixture(host);
  seedContracts(host);
  const first = await assembleD1Input(PROJECT, MODULE);
  assert.equal(first.consumersReleased, true);
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
  assert.equal(resume.consumersReleased, true);
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
  assert.equal(missing.consumersReleased, true);
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
