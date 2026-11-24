/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/transaction.test.ts" enhancement="_blank"/>

// d1_288 s1: the context of a process function says what the route that calls it already does (it runs the function inside the transaction of the module and hands it the bound
// context), and gives the function that receives an arrival the words the L4 uses for that arrival. On the real tree of `mls-102047@be5e6203` (git archive of that commit, a copy in
// /tmp); no model. The platform files come from a stored fixture, the module from the commit. Nothing is written in the 102047.

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
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadWorkflowContext } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const PROJECT = 102047;
const COMMIT = 'be5e6203';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_288_real';
const SECTION = 'The transaction of the route';
const ARRIVAL = 'The L4 says what this arrival does';

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
  const human = async (processId: string, focus?: string) => (await loadWorkflowContext(ctx, units.find(item => item.unitId === processId) as never, undefined, focus)).human;
  return { human };
}

void test('d1_288 s1: the function that receives the arrival is told the transaction and the words of the arrival', async () => {
  const { human } = await loaded();
  const text = await human('toolCatalogRefresh', 'applyReleaseCatalog');
  assert.ok(text.includes(SECTION), 'the section of the transaction');
  assert.match(text, /already runs it inside `ctx\.data\.moduleData\.runInTransaction`/u);
  assert.match(text, /open no transaction of your own/u);
  assert.ok(text.includes(ARRIVAL), 'the description of the arrival');
  assert.match(text, /Only the actions the platform marks as usable by the assistant become tools/u);
});

void test('d1_288 s1: a function no route calls gets neither (the scheduled tick, a function of the process nothing calls)', async () => {
  const { human } = await loaded();
  assert.equal((await human('toolCatalogRefresh', 'onTick')).includes(SECTION), false, 'onTick');
  assert.equal((await human('virtualEmployeeCreation', 'onTick')).includes(SECTION), false, 'onTick of another process');
  assert.equal((await human('virtualEmployeeCreation', 'resolveDraftReviewer')).includes(SECTION), false, 'no route calls it');
  assert.equal((await human('toolCatalogRefresh', 'onTick')).includes(ARRIVAL), false);
});

void test('d1_288 s1: the functions a route calls inside its transaction are named, one section for the whole file', async () => {
  const { human } = await loaded();
  const whole = await human('virtualEmployeeCreation');
  assert.equal(whole.split(SECTION).length - 1, 1, 'one section');
  for (const name of ['startVirtualEmployeeRequest', 'receiveDraftOutcome', 'completeDraftReview']) assert.ok(whole.includes(`\`${name}\``), name);
  assert.equal((await human('virtualEmployeeCreation', 'startVirtualEmployeeRequest')).includes(SECTION), true);
});
