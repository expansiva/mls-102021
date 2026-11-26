/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/runSmoke.ts" enhancement="_blank"/>

// d1_321 (parte B, tempo 1): runs the plan of the smoke in a child process, on a copy of the module (a `git archive` of it), with the memory runtime of the platform,
// the real controllers, requests, usecases and adapters, and every connection gateway answered by a stub made from the catalog types. Then checks each answer against the
// type of the contract. REPORT ONLY: nothing here enters `complete` or the checks of the materialization, and nothing is written outside `workDir`.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { planSmoke, type SmokePlan } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokePlan.js';
import { conformsTo, typeNodeOf, typeTableOf } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

export interface SmokeCaseResult {
  route: string;
  pass: 'happy' | 'failure';
  kind: string;
  /** d1_330: which way an arrival with a union input was called ('' or absent when one). */
  variant?: string;
  /** `ok`: the route answered; `refused`: a 4xx the route chose; `error`: an exception that is not an AppError; `failed`: a 5xx or a 501. */
  verdict: 'ok' | 'refused' | 'error' | 'failed';
  status: number | null;
  code: string | null;
  message: string | null;
  /** Problems of the output against the contract type (empty for a refusal). */
  conforms: string[];
  output: unknown;
}

export interface SmokeReport {
  module: string;
  routes: number;
  executed: number;
  results: SmokeCaseResult[];
  raw: string;
  seconds: number;
}

const REGISTER = `import { readdirSync, statSync, existsSync } from 'node:fs';
import Module, { register } from 'node:module';
import path from 'node:path';
const root = process.env.SMOKE_BASE;
const prefixes = {};
for (const entry of readdirSync(root)) {
  if (!entry.startsWith('mls-') || !statSync(path.join(root, entry)).isDirectory()) continue;
  prefixes['/_' + entry.slice(4) + '_'] = path.join(root, entry);
}
prefixes['/_' + process.env.SMOKE_PROJECT + '_'] = process.env.SMOKE_TREE;
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
const root = process.env.SMOKE_BASE;
const prefixes = {};
for (const entry of readdirSync(root)) {
  if (!entry.startsWith('mls-') || !statSync(path.join(root, entry)).isDirectory()) continue;
  prefixes['/_' + entry.slice(4) + '_'] = path.join(root, entry);
}
prefixes['/_' + process.env.SMOKE_PROJECT + '_'] = process.env.SMOKE_TREE;
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

function runnerSource(project: number, module: string, controllers: readonly string[], parts: { register: boolean; seeds: boolean }): string {
  const imports = controllers.map((name, index) => `import { routes as routes${index} } from '/_${project}_/l1/${module}/layer_1_external/adapters/http/controllers/${name}.js';`).join('\n');
  return `import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { createMemoryDataRuntime } from '/_102034_/l1/mdm/layer_1_external/data/memory/MdmDataRuntimeMemory.js';
import { registerRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
${parts.register ? `import '/_${project}_/l1/${module}/layer_1_external/adapters/persistence/registerRepositories.js';` : ''}
${imports}
${parts.seeds ? `import * as seeds from '/_${project}_/l1/${module}/layer_1_external/adapters/persistence/seeds.js';` : 'const seeds = {};'}
import { readFileSync } from 'node:fs';

const ROUTES = [${controllers.map((_, index) => `...routes${index}`).join(', ')}];

function seedRows() {
  const datasets = [];
  for (const value of Object.values(seeds)) if (value && typeof value === 'object' && typeof value.seedFor === 'string' && Array.isArray(value.rows)) datasets.push(value);
  return datasets;
}

function resolveSeed(spec, datasets) {
  const [entity, field] = spec.split('.');
  const wanted = entity.charAt(0).toLowerCase() + entity.slice(1);
  const set = datasets.find(item => item.seedFor === wanted) ?? datasets.find(item => item.seedFor.toLowerCase() === entity.toLowerCase());
  const row = set?.rows?.[0];
  return row && row[field] !== undefined ? row[field] : 'sample';
}

function bind(value, datasets) {
  if (typeof value === 'string') { const m = /^<seed:(.+)>$/.exec(value); return m ? resolveSeed(m[1], datasets) : value; }
  if (Array.isArray(value)) return value.map(item => bind(item, datasets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, bind(item, datasets)]));
  return value;
}

function stubFor(gateway, pass) {
  const stub = {};
  for (const method of gateway.methods) {
    stub[method.name] = async () => {
      if (pass === 'failure') {
        if (method.failure === null) throw new AppError('unavailable', 'smoke: the outside system is unavailable', 503);
        return JSON.parse(JSON.stringify(method.failure));
      }
      return JSON.parse(JSON.stringify(method.success));
    };
  }
  return stub;
}

let counter = 0;
async function main() {
  const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const datasets = seedRows();
  for (const pass of ['happy', 'failure']) {
    for (const item of plan.routes) {
      const route = ROUTES.find(candidate => candidate.key === item.route);
      let line;
      if (!route) { process.stdout.write('RESULT ' + JSON.stringify({ route: item.route, pass, kind: item.kind, variant: item.variant ?? null, verdict: 'error', status: null, code: 'NO_HANDLER', message: 'no controller route', output: null }) + '\\n'); continue; }
      for (const gateway of plan.gateways) registerRepository(gateway.name, () => stubFor(gateway, pass));
      const scope = item.actor ? [plan.module + ':' + item.actor] : [];
      const person = { mdmId: '00000000-0000-4000-8000-000000000001', name: 'Smoke Person' };
      const session = { actorId: item.actor || undefined, actorScope: scope, actorSession: { actorId: item.actor || undefined, scope }, person, organizationId: '00000000-0000-4000-8000-0000000000aa' };
      const ctx = createRequestContext(createMemoryDataRuntime({ sandbox: true }), { sandbox: true, sessionContext: session });
      // An arrival comes through the message path: the process reads the identity of the arrival from the meta of the request.
      if (item.arrival) { counter += 1; ctx.requestMeta = { requestId: 'smoke-' + counter, source: 'message', connection: { idempotencyKey: 'smoke-' + counter } }; }
      try {
        const response = await route.handler({ request: { routine: item.route, params: bind(item.input, datasets), meta: { source: 'test', session } }, ctx });
        line = { route: item.route, pass, kind: item.kind, variant: item.variant ?? null, verdict: response && response.ok === false ? 'refused' : 'ok', status: response?.status ?? 200, code: null, message: null, output: response && response.ok === false ? null : (response?.data ?? response) };
      } catch (error) {
        const status = typeof error?.status === 'number' ? error.status : null;
        const isApp = error instanceof AppError || typeof error?.code === 'string';
        line = { route: item.route, pass, kind: item.kind, variant: item.variant ?? null, verdict: isApp ? (status !== null && status >= 500 ? 'failed' : 'refused') : 'error', status, code: error?.code ?? 'ERROR', message: String(error?.message ?? error).slice(0, 300), output: null };
      }
      process.stdout.write('RESULT ' + JSON.stringify(line) + '\\n');
    }
  }
}
main().then(() => process.exit(0)).catch(error => { process.stdout.write('MAINFAIL ' + String(error?.stack ?? error) + '\\n'); process.exit(1); });
`;
}

/** The projects directory the runtime reads: the config of the tree with the module's persistence registered, `mls-<id>` linked to the base, the module's project the tree. */
function projectsDir(workDir: string, tree: string, base: string, project: number, module: string): string {
  const dir = path.join(workDir, 'projects');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const configFile = path.join(tree, 'l5', 'config.json');
  if (existsSync(configFile)) {
    const config = JSON.parse(readFileSync(configFile, 'utf8')) as { projects: Record<string, { persistenceModules?: Array<{ moduleId: string; tableDefsDir?: string }> }> };
    const entry = config.projects[String(project)];
    if (entry) {
      // Only this module's tables and the platform's: the tree holds one module, and a table dir of another one would not be there.
      const modules = (entry.persistenceModules ?? []).filter(item => !item.tableDefsDir || item.moduleId === module || existsSync(path.join(tree, item.tableDefsDir.replace(/^\.\/_\d+_\//u, ''))));
      if (!modules.some(item => item.moduleId === module)) modules.push({ moduleId: module, tableDefsDir: `./_${project}_/l1/${module}/layer_1_external/adapters/persistence` });
      entry.persistenceModules = modules;
    }
    writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config));
  }
  for (const name of readdirSync(base)) {
    if (!name.startsWith('mls-') || name === `mls-${project}` || !statSync(path.join(base, name)).isDirectory()) continue;
    symlinkSync(path.join(base, name), path.join(dir, name));
  }
  symlinkSync(tree, path.join(dir, `mls-${project}`));
  return dir;
}

/** Runs the smoke of `module` on `tree`. `base` is the mls-base root (the platform and the libraries). */
export function runSmoke(input: { tree: string; project: number; module: string; base: string; workDir: string; timeoutMs?: number }): SmokeReport {
  const started = Date.now();
  const plan: SmokePlan = planSmoke(input.tree, input.project, input.module, input.base);
  mkdirSync(input.workDir, { recursive: true });
  const controllersDir = path.join(input.tree, 'l1', input.module, 'layer_1_external', 'adapters', 'http', 'controllers');
  const controllers = existsSync(controllersDir) ? readdirSync(controllersDir).filter(name => name.endsWith('.ts') && !name.endsWith('.defs.ts') && !name.endsWith('.test.ts')).map(name => name.replace(/\.ts$/u, '')).sort() : [];
  writeFileSync(path.join(input.workDir, 'register.mjs'), REGISTER);
  writeFileSync(path.join(input.workDir, 'hooks.mjs'), HOOKS);
  const persistence = path.join(input.tree, 'l1', input.module, 'layer_1_external', 'adapters', 'persistence');
  writeFileSync(path.join(input.workDir, 'run.ts'), runnerSource(input.project, input.module, controllers, { register: existsSync(path.join(persistence, 'registerRepositories.ts')), seeds: existsSync(path.join(persistence, 'seeds.ts')) }));
  writeFileSync(path.join(input.workDir, 'plan.json'), JSON.stringify({ module: plan.module, routes: plan.routes, gateways: plan.gateways }));
  if (controllers.length === 0 || plan.routes.length === 0) return { module: input.module, routes: plan.routes.length, executed: 0, results: [], raw: controllers.length === 0 ? 'no controllers in the module' : 'no routes in the contracts', seconds: Math.round((Date.now() - started) / 100) / 10 };
  const run = spawnSync(path.join(input.base, 'node_modules/.bin/tsx'), ['--import', path.join(input.workDir, 'register.mjs'), '--import', path.join(input.base, 'test/setup-l2.ts'), path.join(input.workDir, 'run.ts'), path.join(input.workDir, 'plan.json')], {
    cwd: projectsDir(input.workDir, input.tree, input.base, input.project, input.module),
    env: { ...process.env, SMOKE_BASE: input.base, SMOKE_TREE: input.tree, SMOKE_PROJECT: String(input.project) },
    encoding: 'utf8',
    timeout: input.timeoutMs ?? 300000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const raw = `${run.stdout}\n${run.stderr}`;
  const lines = `${run.stdout}`.split('\n').filter(line => line.startsWith('RESULT ')).map(line => JSON.parse(line.slice('RESULT '.length)) as Omit<SmokeCaseResult, 'conforms'>);
  const results = lines.map(line => {
    const route = plan.routes.find(item => item.route === line.route && (item.variant ?? null) === (line.variant ?? null));
    let conforms: string[] = [];
    if (route && line.verdict === 'ok') {
      const table = typeTableOf([plan.typeSources[route.page] ?? '']);
      conforms = conformsTo(line.output, typeNodeOf(route.outputType), table).slice(0, 8);
    }
    const failed = line.verdict === 'failed' || line.status === 501 || line.code === 'NOT_IMPLEMENTED';
    return { ...line, verdict: failed ? 'failed' as const : line.verdict, conforms };
  });
  return { module: input.module, routes: plan.routes.length, executed: results.length, results, raw: raw.slice(0, 20000), seconds: Math.round((Date.now() - started) / 100) / 10 };
}
