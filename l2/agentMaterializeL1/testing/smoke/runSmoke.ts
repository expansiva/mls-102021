/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/runSmoke.ts" enhancement="_blank"/>

// d1_321 (parte B, tempo 1): runs the plan of the smoke in a child process, on a copy of the module (a `git archive` of it), with the memory runtime of the platform,
// the real controllers, requests, usecases and adapters, and every connection gateway answered by a stub made from the catalog types. Then checks each answer against the
// type of the contract. REPORT ONLY: nothing here enters `complete` or the checks of the materialization, and nothing is written outside `workDir`.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { installConnectionShim, installMemoryPort } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokePort.js';
import { planSmoke, type SmokePlan } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokePlan.js';
import { conformsTo, typeNodeOf, typeTableOf } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

export interface SmokeCaseResult {
  route: string;
  pass: 'happy' | 'failure';
  kind: string;
  /** d1_330: which way an arrival with a union input was called ('' or absent when one). */
  variant?: string;
  /** `ok`: the route answered; `refused`: a 4xx the route chose; `error`: an exception that is not an AppError; `failed`: a 5xx or a 501; `skipped`: the case could not be built (a gateway answer of an unresolved type). */
  verdict: 'ok' | 'refused' | 'error' | 'failed' | 'skipped';
  status: number | null;
  code: string | null;
  message: string | null;
  /** Problems of the output against the contract type (empty for a refusal). */
  conforms: string[];
  output: unknown;
  /** d1_336: the stack of an exception or of a 5xx. */
  stack?: string | null;
  /** d1_336, arrivals: the same message delivered a second time on the same store (a retry of the sender). */
  second?: { verdict: string; status: number | null; code: string | null; message: string | null; stack?: string | null } | null;
  /** d1_336, arrivals: calls made to each gateway method, after the first and after the second delivery. */
  calls?: Record<string, number[]>;
  /** d1_336, arrivals: what the occurrence port was asked, and the rows of each repository of the module before, after the first and after the second delivery. */
  port?: string[];
  rows?: Record<string, number[]>;
  /** d1_336: the last row written to each repository that changed (what the process left). */
  written?: Record<string, unknown[]>;
  /** d1_336, scenarios: the steps that left the store in the state, and what each answered. */
  setup?: Array<{ route: string; verdict: string; status: number | null; code: string | null; message: string }>;
  /** d1_336: what the adapter or the engine threw below the gateway (the platform caller turns it into `unavailable`), with the stack. */
  thrown?: Array<{ connection: string; operation: string; stack: string }>;
}

export interface SmokeReport {
  module: string;
  routes: number;
  executed: number;
  results: SmokeCaseResult[];
  raw: string;
  seconds: number;
  /** d1_336: the processes of the module ran on the occurrence port in memory (the engine of the copy was replaced). */
  memoryPort?: boolean;
  /** d1_336: the gateways of the systems the module declares ran through its real adapter (failure pass). */
  connectionShim?: boolean;
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

function runnerSource(project: number, module: string, controllers: readonly string[], parts: { register: boolean; seeds: boolean; outbound: boolean }): string {
  const imports = controllers.map((name, index) => `import { routes as routes${index} } from '/_${project}_/l1/${module}/layer_1_external/adapters/http/controllers/${name}.js';`).join('\n');
  return `import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
${parts.outbound ? `import * as outbound from '/_${project}_/l1/${module}/layer_1_external/adapters/integration/outbound.js';` : 'const outbound = {};'}
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { createMemoryDataRuntime } from '/_102034_/l1/mdm/layer_1_external/data/memory/MdmDataRuntimeMemory.js';
import { registerRepository, resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
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

function setOf(spec, datasets) {
  const [entity] = spec.split('.');
  const wanted = entity.charAt(0).toLowerCase() + entity.slice(1);
  return datasets.find(item => item.seedFor === wanted) ?? datasets.find(item => item.seedFor.toLowerCase() === entity.toLowerCase());
}

function resolveSeed(spec, datasets, at = 0) {
  const field = spec.split('.')[1];
  const rows = setOf(spec, datasets)?.rows ?? [];
  const row = rows[Math.min(at, rows.length - 1)];
  return row && row[field] !== undefined ? row[field] : 'sample';
}

function bind(value, datasets, at = 0) {
  if (typeof value === 'string') { const m = /^<seed:(.+)>$/.exec(value); return m ? resolveSeed(m[1], datasets, at) : value; }
  if (Array.isArray(value)) return value.map(item => bind(item, datasets, at));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, bind(item, datasets, at)]));
  return value;
}

const calls = {};
function stubFor(gateway, pass) {
  const stub = {};
  for (const method of gateway.methods) {
    stub[method.name] = async () => {
      calls[gateway.name + '.' + method.name] = (calls[gateway.name + '.' + method.name] ?? 0) + 1;
      if (method.unresolved) { const skip = new Error('smoke: the output type of ' + method.name + ' is not declared in the catalog files'); skip.name = 'SmokeUnresolved'; throw skip; }
      if (pass === 'failure') {
        if (method.failure === null) throw new AppError('unavailable', 'smoke: the outside system is unavailable', 503);
        return JSON.parse(JSON.stringify(method.failure));
      }
      return JSON.parse(JSON.stringify(method.success));
    };
  }
  return stub;
}

// A gateway of a system the module declares runs for real (its gateway, the connection shim and its adapter, on an HTTP 401 with a body) in the failure pass; every other is a stub.
function useGateways(plan, pass) {
  for (const gateway of plan.gateways) {
    const factory = gateway.real && pass === 'failure' ? outbound['create' + gateway.name] : undefined;
    registerRepository(gateway.name, factory ? ctx => factory(ctx) : () => stubFor(gateway, pass));
  }
}

// The memory store does not check what the database checks. A column of the table that is not nullable and has no default refuses a row that has no value for it (an absent key or a null):
// the check is made here, on every insert, upsert and update, with the definition of the table of the module (listTables). The platform does not change.
function withNotNull(runtime) {
  const moduleData = runtime.moduleData;
  const original = moduleData.getTable.bind(moduleData);
  let tables;
  moduleData.getTable = async name => {
    const repository = await original(name);
    tables = tables ?? await moduleData.listTables();
    const definition = tables.find(item => item.repositoryName === name || item.tableName === name);
    if (!definition) return repository;
    const refuse = (record, mode) => {
      for (const column of definition.columns) {
        if (column.nullable || column.defaultSql !== undefined) continue;
        if (mode === 'patch' && !(column.name in record)) continue;
        if (record[column.name] === undefined || record[column.name] === null) throw Object.assign(new Error('null value in column "' + column.name + '" of relation "' + definition.tableName + '" violates not-null constraint'), { code: '23502' });
      }
    };
    return new Proxy(repository, {
      get(target, property) {
        const value = target[property];
        if (typeof value !== 'function') return value;
        if (property === 'insert' || property === 'upsert') return async input => { refuse(input.record, 'row'); return value.call(target, input); };
        if (property === 'update') return async input => { refuse(input.patch ?? {}, 'patch'); return value.call(target, input); };
        return value.bind(target);
      },
    });
  };
  return runtime;
}

function resetShim() {
  for (const key of Object.keys(globalThis.__smokeHttp ?? {})) delete globalThis.__smokeHttp[key];
  if (globalThis.__smokeThrown) globalThis.__smokeThrown.length = 0;
}

let counter = 0;

function describe(error) {
  const status = typeof error?.status === 'number' ? error.status : null;
  const skippedCase = error?.name === 'SmokeUnresolved' || String(error?.cause?.name ?? '') === 'SmokeUnresolved';
  // A database error (SQLSTATE, five digits) is not a decision of the route: it is an exception, with its stack.
  const isApp = error instanceof AppError || (typeof error?.code === 'string' && !/^\\d{5}$/.test(error.code));
  const verdict = skippedCase ? 'skipped' : isApp ? (status !== null && status >= 500 ? 'failed' : 'refused') : 'error';
  return { verdict, status, code: error?.code ?? 'ERROR', message: String(error?.message ?? error).slice(0, 300), stack: verdict === 'refused' || verdict === 'skipped' ? null : String(error?.stack ?? error).slice(0, 4000) };
}

async function call(route, item, ctx, datasets, session, at) {
  try {
    const response = await route.handler({ request: { routine: item.route, params: bind(item.input, datasets, at), meta: { source: 'test', session } }, ctx });
    return { verdict: response && response.ok === false ? 'refused' : 'ok', status: response?.status ?? 200, code: null, message: null, stack: null, output: response && response.ok === false ? null : response?.data ?? null };
  } catch (error) {
    return { ...describe(error), output: null };
  }
}

let lastRows = {};
async function rowCounts(plan, ctx) {
  const out = {};
  lastRows = {};
  for (const name of plan.repositories ?? []) {
    try { const repository = resolveRepository(ctx, name); const rows = await repository.list({}); out[name] = Array.isArray(rows) ? rows.length : -1; if (Array.isArray(rows)) lastRows[name] = rows.slice(-2); } catch { out[name] = -1; }
  }
  return out;
}

async function main() {
  const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const datasets = seedRows();
  // An arrival is run once per stored row of the entity it points at (an open conversation and a blocked one answer differently); the other cases on the first row.
  const rowsOf = item => {
    if (!item.arrival) return 1;
    const specs = [...JSON.stringify(item.input).matchAll(/<seed:([^>]+)>/g)].map(match => match[1]).concat(item.hookSeed ? [item.hookSeed] : []);
    return Math.min(4, Math.max(1, ...specs.map(spec => setOf(spec, datasets)?.rows?.length ?? 1)));
  };
  for (const pass of ['happy', 'failure']) {
    for (const base of plan.routes) {
      const route = ROUTES.find(candidate => candidate.key === base.route);
      if (!route) { process.stdout.write('RESULT ' + JSON.stringify({ route: base.route, pass, kind: base.kind, variant: base.variant ?? null, verdict: 'error', status: null, code: 'NO_HANDLER', message: 'no controller route', output: null }) + '\\n'); continue; }
      const rows = rowsOf(base);
      for (let at = 0; at < rows; at += 1) {
        const item = rows > 1 ? { ...base, variant: (base.variant ? base.variant + ' ' : '') + '@row' + at } : base;
        useGateways(plan, pass);
        for (const key of Object.keys(calls)) delete calls[key];
        resetShim();
        globalThis.__smokePort?.reset();
        const scope = item.actor ? [plan.module + ':' + item.actor] : [];
        const person = { mdmId: '00000000-0000-4000-8000-000000000001', name: 'Smoke Person' };
        const session = { actorId: item.actor || undefined, actorScope: scope, actorSession: { actorId: item.actor || undefined, scope }, person, organizationId: '00000000-0000-4000-8000-0000000000aa' };
        const ctx = createRequestContext(withNotNull(createMemoryDataRuntime({ sandbox: true })), { sandbox: true, sessionContext: session, moduleId: plan.module });
        // An arrival comes through the message path: the process reads the identity of the arrival, and the parameter of the delivery address, from the meta of the request.
        if (item.arrival) {
          counter += 1;
          const context = item.hookSeed ? { hookParams: { smoke: bind('<seed:' + item.hookSeed + '>', datasets, at) } } : {};
          ctx.requestMeta = { requestId: 'smoke-' + counter, source: 'message', connection: { idempotencyKey: 'smoke-' + counter, context } };
        }
        const before = item.arrival ? await rowCounts(plan, ctx) : null;
        const first = await call(route, item, ctx, datasets, session, at);
        let line = { route: item.route, pass, kind: item.kind, variant: item.variant ?? null, ...first };
        if (item.arrival) {
          const afterFirst = { ...calls, ...Object.fromEntries(Object.entries(globalThis.__smokeHttp ?? {}).map(([name, count]) => ['http.' + name, count])) };
          const rowsFirst = await rowCounts(plan, ctx);
          // The sender retries the same message (same idempotency key) on the same store: what the process does the second time.
          const second = await call(route, item, ctx, datasets, session, at);
          const rowsSecond = await rowCounts(plan, ctx);
          const callsNow = { ...calls, ...Object.fromEntries(Object.entries(globalThis.__smokeHttp ?? {}).map(([name, count]) => ['http.' + name, count])) };
          const names = [...new Set([...Object.keys(afterFirst), ...Object.keys(callsNow)])];
          line = { ...line, second: { verdict: second.verdict, status: second.status, code: second.code, message: second.message, stack: second.stack }, calls: Object.fromEntries(names.map(name => [name, [afterFirst[name] ?? 0, callsNow[name] ?? 0]])), thrown: [...(globalThis.__smokeThrown ?? [])], port: globalThis.__smokePort?.log() ?? [], rows: Object.fromEntries(Object.keys(rowsSecond).map(name => [name, [before?.[name] ?? 0, rowsFirst[name], rowsSecond[name]]])), written: Object.fromEntries(Object.entries(lastRows).filter(([name]) => rowsSecond[name] !== (before?.[name] ?? 0)).map(([name, rows]) => [name, JSON.parse(JSON.stringify(rows)).slice(-1)])) };
        }
        process.stdout.write('RESULT ' + JSON.stringify(line) + '\\n');
      }
    }
  }
  // Scenarios (d1_336): steps by the routes of the module that leave the store in a state, then the arrival, twice, as above.
  for (const pass of ['happy', 'failure']) {
    for (const scenario of plan.scenarios ?? []) {
      const base = plan.routes.find(item => item.arrival && item.route === scenario.arrival.route && (!scenario.arrival.variant || (item.variant ?? '') === scenario.arrival.variant) && (!scenario.arrival.variantIncludes || (item.variant ?? '').includes(scenario.arrival.variantIncludes)));
      const route = base && ROUTES.find(candidate => candidate.key === base.route);
      const label = (base?.variant ? base.variant + ' ' : '') + '[scenario:' + scenario.id + ']';
      if (!base || !route) { process.stdout.write('RESULT ' + JSON.stringify({ route: scenario.arrival.route, pass, kind: 'arrival', variant: label, verdict: 'error', status: null, code: 'SCENARIO_NOT_PLANNED', message: 'the arrival of the scenario is not in the plan', output: null }) + '\\n'); continue; }
      const at = scenario.row ?? 0;
      useGateways(plan, pass);
      for (const key of Object.keys(calls)) delete calls[key];
      resetShim();
      globalThis.__smokePort?.reset();
      const person = { mdmId: '00000000-0000-4000-8000-000000000001', name: 'Smoke Person' };
      const sessionOf = actor => { const scope = actor ? [plan.module + ':' + actor] : []; return { actorId: actor || undefined, actorScope: scope, actorSession: { actorId: actor || undefined, scope }, person, organizationId: '00000000-0000-4000-8000-0000000000aa' }; };
      const runtime = withNotNull(createMemoryDataRuntime({ sandbox: true }));
      const ctx = createRequestContext(runtime, { sandbox: true, sessionContext: sessionOf(''), moduleId: plan.module });
      const setup = [];
      for (const step of scenario.steps ?? []) {
        const stepRoute = ROUTES.find(candidate => candidate.key === step.route);
        const planned = plan.routes.find(item => item.route === step.route);
        const stepCtx = createRequestContext(runtime, { sandbox: true, sessionContext: sessionOf(planned?.actor ?? ''), moduleId: plan.module });
        const outcome = stepRoute ? await call(stepRoute, { route: step.route, input: step.input }, stepCtx, datasets, sessionOf(planned?.actor ?? ''), at) : { verdict: 'error', code: 'NO_HANDLER', message: 'no controller route', stack: null };
        setup.push({ route: step.route, verdict: outcome.verdict, status: outcome.status ?? null, code: outcome.code ?? null, message: (outcome.message ?? '').slice(0, 160) });
      }
      counter += 1;
      const context = base.hookSeed ? { hookParams: { smoke: bind('<seed:' + base.hookSeed + '>', datasets, at) } } : {};
      ctx.requestMeta = { requestId: 'smoke-' + counter, source: 'message', connection: { idempotencyKey: 'smoke-' + counter, context } };
      const session = sessionOf('');
      const before = await rowCounts(plan, ctx);
      const first = await call(route, base, ctx, datasets, session, at);
      const afterFirst = { ...calls, ...Object.fromEntries(Object.entries(globalThis.__smokeHttp ?? {}).map(([name, count]) => ['http.' + name, count])) };
      const rowsFirst = await rowCounts(plan, ctx);
      const second = await call(route, base, ctx, datasets, session, at);
      const rowsSecond = await rowCounts(plan, ctx);
      const callsNow = { ...calls, ...Object.fromEntries(Object.entries(globalThis.__smokeHttp ?? {}).map(([name, count]) => ['http.' + name, count])) };
      const names = [...new Set([...Object.keys(afterFirst), ...Object.keys(callsNow)])];
      process.stdout.write('RESULT ' + JSON.stringify({ route: base.route, pass, kind: 'arrival', variant: label, ...first, setup, second: { verdict: second.verdict, status: second.status, code: second.code, message: second.message, stack: second.stack }, calls: Object.fromEntries(names.map(name => [name, [afterFirst[name] ?? 0, callsNow[name] ?? 0]])), thrown: [...(globalThis.__smokeThrown ?? [])], port: globalThis.__smokePort?.log() ?? [], rows: Object.fromEntries(Object.keys(rowsSecond).map(name => [name, [before[name] ?? 0, rowsFirst[name], rowsSecond[name]]])), written: Object.fromEntries(Object.entries(lastRows).filter(([name]) => rowsSecond[name] !== (before[name] ?? 0)).map(([name, rows]) => [name, JSON.parse(JSON.stringify(rows)).slice(-1)])) }) + '\\n');
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

/** The scenarios declared for a module (`testing/smoke/scenarios/<module>.json`), or none. */
function scenariosOf(module: string): unknown[] {
  const file = path.join(path.dirname(new URL(import.meta.url).pathname), 'scenarios', `${module}.json`);
  try { return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { scenarios?: unknown[] }).scenarios ?? [] : []; } catch { return []; }
}

/** Runs the smoke of `module` on `tree`. `base` is the mls-base root (the platform and the libraries). */
export function runSmoke(input: { tree: string; project: number; module: string; base: string; workDir: string; timeoutMs?: number }): SmokeReport {
  const started = Date.now();
  const plan: SmokePlan = planSmoke(input.tree, input.project, input.module, input.base);
  mkdirSync(input.workDir, { recursive: true });
  // The copy of the tree gets the occurrence port in memory in the place of the production one (d1_336); the repository is not touched.
  const memoryPort = installMemoryPort(input.tree, input.project, input.module);
  const connectionShim = installConnectionShim(input.tree, input.project, input.module);
  const controllersDir = path.join(input.tree, 'l1', input.module, 'layer_1_external', 'adapters', 'http', 'controllers');
  const controllers = existsSync(controllersDir) ? readdirSync(controllersDir).filter(name => name.endsWith('.ts') && !name.endsWith('.defs.ts') && !name.endsWith('.test.ts')).map(name => name.replace(/\.ts$/u, '')).sort() : [];
  writeFileSync(path.join(input.workDir, 'register.mjs'), REGISTER);
  writeFileSync(path.join(input.workDir, 'hooks.mjs'), HOOKS);
  const persistence = path.join(input.tree, 'l1', input.module, 'layer_1_external', 'adapters', 'persistence');
  writeFileSync(path.join(input.workDir, 'run.ts'), runnerSource(input.project, input.module, controllers, { outbound: existsSync(path.join(input.tree, 'l1', input.module, 'layer_1_external', 'adapters', 'integration', 'outbound.ts')), register: existsSync(path.join(persistence, 'registerRepositories.ts')), seeds: existsSync(path.join(persistence, 'seeds.ts')) }));
  writeFileSync(path.join(input.workDir, 'plan.json'), JSON.stringify({ module: plan.module, routes: plan.routes, gateways: plan.gateways, repositories: plan.repositories, scenarios: scenariosOf(input.module) }));
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
    const route = plan.routes.find(item => item.route === line.route && (item.variant ?? null) === (String(line.variant ?? '').replace(/ ?(@row\d+|\[scenario:[^\]]+\])$/u, '').trim() || null));
    let conforms: string[] = [];
    if (route && line.verdict === 'ok') {
      const table = typeTableOf([plan.typeSources[route.page] ?? '']);
      conforms = conformsTo(line.output, typeNodeOf(route.outputType), table).slice(0, 8);
    }
    const failed = line.verdict === 'failed' || line.status === 501 || line.code === 'NOT_IMPLEMENTED';
    return { ...line, verdict: failed ? 'failed' as const : line.verdict, conforms };
  });
  return { module: input.module, routes: plan.routes.length, executed: results.length, results, raw: raw.slice(0, 20000), seconds: Math.round((Date.now() - started) / 100) / 10, memoryPort, connectionShim };
}
