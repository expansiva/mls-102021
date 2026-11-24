/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/arrivalCasesRun.test.ts" enhancement="_blank"/>

// d1_289 s2: the cases of an arrival page, rendered and run. (A) with cases from a fixture, the page worker writes `platform.test.ts` with the accepted case and the same case again,
// and registers nothing else. (B) the two cases run in a child process against the REAL code of `mls-102047@be5e6203` (git archive of the commit in /tmp, never the bench): the controller of
// `platform`, its request service and the `toolCatalogRefresh` process, on the memory runtime of the monitor (`createMemoryDataRuntime({ sandbox: true })`), with the call to the cm answered by a
// fixture (in the real monitor it goes through the transport to the cm). On that code both cases FAIL with the refusal code of the process; on a process that does its work they pass, twice.
// No model.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
import { pageTestsFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent as createPageAgent } from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12TestsPage.js';
import { readUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { loadTestsContext } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';
import { normalizeTestCases, renderPageTests } from '/_102021_/l2/agentMaterializeL1/steps/tests60/render.js';

const PROJECT = 102047;
const COMMIT = 'be5e6203';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const TREE = '/tmp/d1_288_real';
const COPY = '/tmp/d1_289_real/mls-102047';
const CONTROL = '/tmp/d1_289_real_control/mls-102047';
const BENCH = '/tmp/d1_289_bench';
const PROCESS = 'l1/agents/layer_2_application/workflows/toolCatalogRefresh.ts';
const ROUTE = 'agents.platform.releaseCatalogChanged';

/** The smallest message valid for `PlatformReleaseCatalogChangedInput`: a release with one catalog of one command. */
const PARAMS = {
  releaseId: 'release-2026-11',
  hash: 'hash-1',
  catalogs: [{
    schemaVersion: 'assistant-catalog-v1',
    module: 'sales',
    commands: [{
      route: 'sales.quote.create', routes: ['sales.quote.create'], module: 'sales', kind: 'cmd', actionId: 'create', title: 'Create quote', subject: 'quote',
      actors: ['seller'], assistant: 'included', risk: 'low', inputs: [],
    }],
    queries: [],
    issues: [],
  }],
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const abs = path.join(dir, name);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
}

function extractTree(): void {
  if (existsSync(path.join(TREE, 'l4/agents/workflows.defs.ts'))) return;
  mkdirSync(TREE, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/agents', 'l2/agents', 'l4/agents', 'l4/organization', 'l5'], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT}`);
  const extracted = spawnSync('tar', ['-x', '-C', TREE], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

function extractCopy(): void {
  if (!existsSync(path.join(COPY, PROCESS))) {
    mkdirSync(COPY, { recursive: true });
    const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1'], { maxBuffer: 256 * 1024 * 1024 });
    if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT} l1`);
    const extracted = spawnSync('tar', ['-x', '-C', COPY], { input: archived.stdout });
    if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
  }
  if (!existsSync(path.join(CONTROL, PROCESS))) {
    mkdirSync(path.dirname(CONTROL), { recursive: true });
    cpSync(COPY, CONTROL, { recursive: true });
    // A process that does its work (and the same release again changes nothing), in place of the one that refuses.
    writeFileSync(path.join(CONTROL, PROCESS), "export async function applyReleaseCatalog(): Promise<{ created: number; updated: number; removed: number }> {\n  return { created: 0, updated: 0, removed: 0 };\n}\n");
  }
}

function put(host: TestHost, rel: string, text: string, tag: string): void {
  const platform = /^_(\d+)_\/(.+)$/.exec(rel);
  const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, rel);
  if (info) seed(host, info, text, tag);
}

const catalog = (name: string) => readFileSync(path.join(BASE, `mls-102021/l2/agentDefsL1/fixtures/agents-2e3e5a1b/_102034_/l2/shared/contracts/connections/${name}.txt`), 'utf8');

async function loaded() {
  extractTree();
  const host = installStudio(PROJECT);
  for (const abs of walk(TREE)) put(host, fixtureLogicalRel(path.relative(TREE, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), COMMIT);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const { units } = await loadModuleUnits(PROJECT, 'agents', storEntries());
  const base = createContext({ project: PROJECT, module: 'agents' } as never, units, 'dev');
  const files: Record<string, string> = { 'connections/cm.ts': catalog('cm'), 'connections/platform.ts': catalog('platform') };
  const read = async (ref: string) => {
    const hit = Object.entries(files).find(([end]) => ref.endsWith(end));
    return hit ? hit[1] : base.read(ref);
  };
  const ctx = { ...base, read } as typeof base;
  const controller = units.find(unit => unit.layer === 'controllers' && unit.unitId === 'platform') as M12Unit;
  return { ctx, controller };
}

void test('d1_289 s2: the page worker, given the two cases, writes platform.test.ts and records the page done', async () => {
  await loaded();
  const agent = createPageAgent();
  const step = {
    stepId: 2,
    prompt: JSON.stringify({ project: PROJECT, module: 'agents', unitId: 'platform', attempt: 1, force: true }),
    interaction: { payload: [{ type: 'flexible', result: { toolName: 'proposeMonitorCases', arguments: { cases: CASES } } }] },
  } as unknown as mls.msg.AIAgentStep;
  const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
  const exec = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext;
  await agent.afterPromptStep!(meta, exec, { stepId: 1 } as mls.msg.AIAgentStep, step, 0);
  const status = await readUnitStatus(PROJECT, 'agents', 'tests', 'platform');
  assert.equal(status?.status, 'done', JSON.stringify(status));
  assert.deepEqual(Object.keys(status?.outputs ?? {}), ['_102047_/l1/agents/layer_1_external/adapters/http/controllers/platform.test.ts']);
});

const CASES = ['accepts', 'again'].map(name => ({ id: `releaseCatalogChanged.${name}`, routine: ROUTE, params: PARAMS, expect: { ok: true }, mutating: true }));

void test('d1_289 s2: the cases of the context pass the gate and render a file with the accepted case and the same case again', async () => {
  const { ctx, controller } = await loaded();
  const data = await loadTestsContext(ctx, controller);
  const cases = normalizeTestCases(CASES);
  assert.deepEqual(testsGate(cases, { routes: data.routes, entities: data.entities }), []);
  const file = pageTestsFile(PROJECT, 'agents', 'platform');
  const text = renderPageTests({ file, moduleName: 'agents', pageId: data.pageId, actor: data.actor, cases });
  const rendered = JSON.parse(text.slice(text.indexOf('{', text.indexOf('export const pageTests')), text.lastIndexOf(' as const;'))) as { page: string; actor?: string; cases: Array<{ id: string; routine: string; params: unknown; expect: { ok: boolean }; mutating: boolean }> };
  assert.equal(rendered.page, 'platform');
  assert.equal(rendered.actor, undefined, 'a page of arrivals runs with no actor');
  assert.deepEqual(rendered.cases.map(item => [item.id, item.routine, item.expect.ok, item.mutating]), [
    ['releaseCatalogChanged.accepts', ROUTE, true, true],
    ['releaseCatalogChanged.again', ROUTE, true, true],
  ]);
  assert.deepEqual(rendered.cases[0].params, rendered.cases[1].params, 'the same message twice');
  assert.equal(file.folder, 'agents/layer_1_external/adapters/http/controllers');
  assert.equal(file.shortName, 'platform');
});

const RUNNER = `import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { createMemoryDataRuntime } from '/_102034_/l1/mdm/layer_1_external/data/memory/MdmDataRuntimeMemory.js';
import { registerRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import '/_102047_/l1/agents/layer_1_external/adapters/persistence/registerRepositories.js';
import { routes } from '/_102047_/l1/agents/layer_1_external/adapters/http/controllers/platform.js';
import { readFileSync } from 'node:fs';

async function main() {
  // The call to the cm answered by a fixture: in the monitor it goes through the transport of the connection.
  registerRepository('CmGateway', () => ({ listCmTools: async () => ({ tools: [] }) }) as never);
  const cases = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Array<{ id: string; routine: string; params: unknown }>;
  const ctx = createRequestContext(createMemoryDataRuntime({ sandbox: true }), { sandbox: true, sessionContext: {} });
  const out: Array<{ id: string; ok: boolean; code: string | null }> = [];
  for (const item of cases) {
    const route = routes.find(candidate => candidate.key === item.routine);
    try {
      const response = await route!.handler({ request: { routine: item.routine, params: item.params, meta: { source: 'test' } }, ctx } as never);
      out.push({ id: item.id, ok: response.ok === true, code: null });
    } catch (error) {
      out.push({ id: item.id, ok: false, code: (error as { code?: string }).code ?? 'ERROR' });
    }
  }
  process.stdout.write('RESULT ' + JSON.stringify(out) + '\\n');
}
main().catch(error => { process.stdout.write('MAINFAIL ' + String(error?.stack ?? error) + '\\n'); process.exit(1); });
`;

const REGISTER = `import { readdirSync, statSync, existsSync } from 'node:fs';
import Module, { register } from 'node:module';
import path from 'node:path';
const root = process.env.D1_BENCH_BASE;
const prefixes = {};
for (const entry of readdirSync(root)) {
  if (!entry.startsWith('mls-') || !statSync(path.join(root, entry)).isDirectory()) continue;
  prefixes['/_' + entry.slice(4) + '_'] = path.join(root, entry);
}
prefixes['/_102047_'] = process.env.D1_BENCH_102047;
function candidates(base, rel) {
  const full = path.join(base, rel);
  const out = new Set([full]);
  if (rel.endsWith('.js')) out.add(path.join(base, rel.replace(/\\.js$/, '.ts')));
  if (!path.extname(rel)) { out.add(full + '.ts'); out.add(full + '.js'); out.add(path.join(full, 'index.ts')); }
  return [...out];
}
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (!request.startsWith(prefix + '/')) continue;
    for (const candidate of candidates(base, request.slice(prefix.length + 1))) if (existsSync(candidate)) return candidate;
  }
  return original.call(this, request, parent, isMain, options);
};
register(new URL('./hooks.mjs', import.meta.url), import.meta.url);
`;

const HOOKS = `import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.env.D1_BENCH_BASE;
const prefixes = {};
for (const entry of readdirSync(root)) {
  if (!entry.startsWith('mls-') || !statSync(path.join(root, entry)).isDirectory()) continue;
  prefixes['/_' + entry.slice(4) + '_'] = path.join(root, entry);
}
prefixes['/_102047_'] = process.env.D1_BENCH_102047;
function candidates(base, rel) {
  const full = path.join(base, rel);
  const out = new Set([full]);
  if (rel.endsWith('.js')) out.add(path.join(base, rel.replace(/\\.js$/, '.ts')));
  if (!path.extname(rel)) { out.add(full + '.ts'); out.add(full + '.js'); out.add(path.join(full, 'index.ts')); }
  return [...out];
}
export async function resolve(specifier, context, nextResolve) {
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (!specifier.startsWith(prefix + '/')) continue;
    for (const candidate of candidates(base, specifier.slice(prefix.length + 1))) if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
  }
  return nextResolve(specifier, context);
}
`;

function runCases(tree: string, cases: unknown): Array<{ id: string; ok: boolean; code: string | null }> {
  mkdirSync(BENCH, { recursive: true });
  writeFileSync(path.join(BENCH, 'register.mjs'), REGISTER);
  writeFileSync(path.join(BENCH, 'hooks.mjs'), HOOKS);
  writeFileSync(path.join(BENCH, 'run.ts'), RUNNER);
  writeFileSync(path.join(BENCH, 'cases.json'), JSON.stringify(cases));
  const run = spawnSync(path.join(BASE, 'node_modules/.bin/tsx'), ['--import', path.join(BENCH, 'register.mjs'), '--import', path.join(BASE, 'test/setup-l2.ts'), path.join(BENCH, 'run.ts'), path.join(BENCH, 'cases.json')], {
    cwd: BASE,
    env: { ...process.env, D1_BENCH_BASE: BASE, D1_BENCH_102047: tree },
    encoding: 'utf8',
    timeout: 120000,
  });
  const line = `${run.stdout}`.split('\n').find(item => item.startsWith('RESULT '));
  assert.ok(line, `no result: ${run.stdout}\n${run.stderr}`.slice(0, 2000));
  return JSON.parse(line.slice('RESULT '.length)) as Array<{ id: string; ok: boolean; code: string | null }>;
}

void test('d1_289 s2: against the code of be5e6203 both cases fail with the refusal of the process; on a process that works they pass, twice', () => {
  extractCopy();
  const refused = runCases(COPY, CASES);
  assert.deepEqual(refused, [
    { id: 'releaseCatalogChanged.accepts', ok: false, code: 'CATALOG_REBUILD_UNSUPPORTED' },
    { id: 'releaseCatalogChanged.again', ok: false, code: 'CATALOG_REBUILD_UNSUPPORTED' },
  ]);
  const works = runCases(CONTROL, CASES);
  assert.deepEqual(works, [
    { id: 'releaseCatalogChanged.accepts', ok: true, code: null },
    { id: 'releaseCatalogChanged.again', ok: true, code: null },
  ], 'the same cases pass on a process that returns, so the refusal above is the code, not the case');
});
