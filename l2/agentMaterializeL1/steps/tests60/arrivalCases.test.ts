/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/arrivalCases.test.ts" enhancement="_blank"/>

// d1_289 s1: the page of an arrival that moves a process is no longer skipped: its context carries the route, the whole input type of the catalog, what the L4 says the arrival does,
// what the function of the process does, and the error codes the route and the process throw. On the real tree of `mls-102047@be5e6203` (git archive, a copy in /tmp); no model.
// An arrival no process receives, and an event the module consumes, are still skipped.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';
import { testsGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { SERVE_ROUTE_NO_PAGE_TEST, loadTestsContext, processArrivals, thrownCodes } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';

const PROJECT = 102047;
const COMMIT = 'be5e6203';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_288_real';

function extract(): void {
  if (existsSync(path.join(ROOT, 'l4/agents/workflows.defs.ts'))) return;
  mkdirSync(ROOT, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/agents', 'l2/agents', 'l4/agents', 'l4/organization', 'l5'], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT}`);
  const extracted = spawnSync('tar', ['-x', '-C', ROOT], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const abs = path.join(dir, name);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
}

function put(host: TestHost, rel: string, text: string, tag: string): void {
  const platform = /^_(\d+)_\/(.+)$/.exec(rel);
  const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, rel);
  if (info) seed(host, info, text, tag);
}

const catalog = (name: string) => readFileSync(path.join(BASE, `mls-102021/l2/agentDefsL1/fixtures/agents-2e3e5a1b/_102034_/l2/shared/contracts/connections/${name}.txt`), 'utf8');

async function loaded() {
  extract();
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) put(host, fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), COMMIT);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const { units } = await loadModuleUnits(PROJECT, 'agents', storEntries());
  const base = createContext({ project: PROJECT, module: 'agents' } as never, units, 'dev');
  const files: Record<string, string> = { 'connections/cm.ts': catalog('cm'), 'connections/platform.ts': catalog('platform') };
  const read = async (ref: string) => {
    const hit = Object.entries(files).find(([end]) => ref.endsWith(end));
    return hit ? hit[1] : base.read(ref);
  };
  const ctx = { ...base, read } as typeof base;
  const controller = (pageId: string) => units.find(unit => unit.layer === 'controllers' && String(unit.definition.data.pageId ?? unit.unitId) === pageId) as M12Unit;
  return { ctx, units, controller };
}

void test('d1_289 s1: the page of the release arrival gets a context with the five parts, no contract and no actor', async () => {
  const { ctx, controller } = await loaded();
  const data = await loadTestsContext(ctx, controller('platform'));
  assert.equal(data.contract, null);
  assert.equal(data.actor, '');
  assert.deepEqual(data.routes, [{ route: 'agents.platform.releaseCatalogChanged', kind: 'cmd', inputFields: ['releaseId', 'hash', 'catalogs'], actors: [], rules: [] }]);
  // (1) the route
  assert.match(data.human, /agents\.platform\.releaseCatalogChanged \(cmd\): serves platform\.releaseCatalogChanged; the function `applyReleaseCatalog` of the process `toolCatalogRefresh`/u);
  // (2) the whole input type of the catalog, with the types it names
  assert.match(data.human, /`PlatformReleaseCatalogChangedInput` is `\{ releaseId: string; hash: string; catalogs: PlatformModuleCatalog\[\]; \}`/u);
  assert.match(data.human, /`PlatformModuleCatalog` is `\{ schemaVersion: 'assistant-catalog-v1'/u);
  assert.match(data.human, /`PlatformCatalogAction` is `\{ route: string/u);
  // (3) what the L4 says the arrival does
  assert.match(data.human, /What the L4 says the arrival platform\.releaseCatalogChanged does[\s\S]*Only the actions the platform marks as usable by the assistant/u);
  // (4) what the function of the process does, the repetition included
  assert.match(data.human, /What the function applyReleaseCatalog does \(l4 process toolCatalogRefresh\)[\s\S]*the same release delivered again changes nothing/u);
  // (5) the error codes the route and the process throw (the refusal of be5e6203 included)
  assert.match(data.human, /Error codes the route and the process throw[\s\S]*- CATALOG_REBUILD_UNSUPPORTED/u);
  assert.match(data.human, /- INVALID_CM_CATALOG/u);
  // the two cases the Task asks for, and no seed marker
  assert.match(data.human, /`<route name>\.accepts`[\s\S]*`<route name>\.again`/u);
  assert.match(data.human, /no seed markers/u);
  assert.equal(data.human.includes('## Contract'), false);
});

void test('d1_289 s1: only the arrival a process receives is covered; the other routes of the cm page are not', async () => {
  const { ctx, controller } = await loaded();
  const data = await loadTestsContext(ctx, controller('cm'));
  assert.deepEqual(data.routes.map(route => route.route), ['agents.cm.agentDraftReady']);
  assert.equal(data.human.includes('agents.cm.describe'), false, 'a route no process receives is not asked for a case');
});

void test('d1_289 s1: an arrival no process receives, and an event the module consumes, are still skipped', async () => {
  const { ctx, units, controller } = await loaded();
  const without = units.map(unit => unit.definition.artifactType === 'workflowProcess'
    ? { ...unit, definition: { ...unit.definition, data: { ...unit.definition.data, receives: undefined } } }
    : unit) as M12Unit[];
  await assert.rejects(loadTestsContext({ ...ctx, units: without } as typeof ctx, controller('platform')), (error: Error) => error.message.startsWith(SERVE_ROUTE_NO_PAGE_TEST));
  const service = units.find(unit => unit.layer === 'requests' && unit.unitId === 'platform')!;
  assert.deepEqual(processArrivals(units, { requests: [{ route: 'agents.other.arrived', kind: 'cmd', consumes: 'other.arrived' }] }), []);
  assert.deepEqual(processArrivals(without, service.definition.data), []);
  assert.deepEqual(processArrivals(units, service.definition.data).map(item => [item.route, item.fn]), [['agents.platform.releaseCatalogChanged', 'applyReleaseCatalog']]);
});

void test('d1_289 s1: the cases of the context pass the gate of the monitor cases, and one case alone for a route still does', async () => {
  const { ctx, controller } = await loaded();
  const data = await loadTestsContext(ctx, controller('platform'));
  const params = { releaseId: 'r1', hash: 'h1', catalogs: [] };
  const cases = ['accepts', 'again'].map(name => ({ id: `releaseCatalogChanged.${name}`, routine: 'agents.platform.releaseCatalogChanged', params, expect: { ok: true }, mutating: true }));
  assert.deepEqual(testsGate(cases, { routes: data.routes, entities: data.entities }), []);
  assert.match(testsGate([{ ...cases[0], mutating: false }], { routes: data.routes, entities: data.entities }).join(' '), /mutating must be true/u);
});

void test('d1_289 s1: thrownCodes reads the codes a file throws, once, not the ones in a comment', () => {
  assert.deepEqual(thrownCodes("// throw new AppError('X', 'no');\nthrow new AppError('A', 'm', 409);\nthrow new AppError(\"B\", 'm');\nthrow new AppError('A', 'again');"), ['A', 'B']);
});
