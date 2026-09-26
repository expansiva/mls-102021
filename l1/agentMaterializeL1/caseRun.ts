/// <mls fileReference="_102021_/l1/agentMaterializeL1/caseRun.ts" enhancement="_blank"/>

/**
 * Runs an implement case against the emitted file. proofC5 and the CLI
 * both call this module. Compile uses the repo tsconfig.base.json.
 * A route goes through execBff. A case that cannot run is inconclusive.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { dirname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { isRecord, parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { caseBlock, ruleRunsOnUsecase } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { requiredMembers } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { catalogForStage, parseCatalog, type M1ScenarioCase } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import type { M1Observation } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import type { BffHandler, ModuleBffRegistration } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createRequestContext, execBff } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { createMemoryDataRuntime } from '/_102034_/l1/mdm/layer_1_external/data/memory/MdmDataRuntimeMemory.js';
import { readProjectsConfig } from '/_102034_/l1/server/layer_1_external/config/projectConfig.js';
import { loadModuleRouter, resetModuleRouterCache } from '/_102034_/l1/server/layer_2_controllers/moduleRegistry.js';

interface SandboxModule { routes?: Array<{ key: string; handler: BffHandler }>; resetMemory?: (seed?: Record<string, unknown>[]) => void; [key: string]: unknown }

const routes = new Map<string, BffHandler>();
let routerReady = false;
let bffHome = '';

export function compileFiles(repoRoot: string, projectDir: string, projectId: string, slice: readonly string[]): string {
  const config = join(repoRoot, `.tsconfig.m1-case-${process.pid}-${Math.random().toString(16).slice(2)}.json`);
  try {
    const files = slice.map(rel => `./${relative(repoRoot, join(projectDir, rel)).split(sep).join('/')}`);
    const base = readFileSync(join(repoRoot, 'tsconfig.base.json'), 'utf8');
    const paths: Record<string, string[]> = {};
    for (const id of new Set([...base.matchAll(/\/_(\d+)_\//g)].map(match => match[1]))) paths[`/_${id}_/*`] = [`./mls-${id}/*`];
    paths[`/_${projectId}_/*`] = [`./${relative(repoRoot, projectDir).split(sep).join('/')}/*`];
    writeFileSync(config, `${JSON.stringify({ extends: './tsconfig.base.json', compilerOptions: { noEmit: true, paths }, files }, null, 2)}\n`);
    const tsc = join(repoRoot, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '-p', config, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
    if ((result.status ?? 1) === 0) return '';
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  } finally {
    rmSync(config, { force: true });
  }
}

export function installRuntime(projectDir: string, projectId: string, moduleName: string): void {
  const runtime = Module as unknown as { _resolveFilename: (this: unknown, request: string, parent: unknown, isMain: boolean, options?: unknown) => string; __m1Case?: boolean };
  if (runtime.__m1Case) return;
  runtime.__m1Case = true;
  const original = runtime._resolveFilename;
  const prefix = `/_${projectId}_/l1/${moduleName}/`;
  runtime._resolveFilename = function (this: unknown, request: string, parent: unknown, isMain: boolean, options?: unknown) {
    if (request.startsWith(prefix)) {
      const rel = request.slice(`/_${projectId}_/`.length).replace(/\.js$/, '.ts');
      const candidate = join(projectDir, rel);
      if (existsSync(candidate)) return candidate;
    }
    return original.call(this, request, parent, isMain, options);
  };
}

export async function writeBffHome(dir: string, projectId: string, moduleName: string): Promise<void> {
  bffHome = dir;
  mkdirSync(dir, { recursive: true });
  const controllers = `_${projectId}_/l1/${moduleName}/layer_1_external/adapters/http/controllers`;
  const config = {
    defaultProjectId: projectId,
    projects: {
      '102034': { root: '../mls-102034', type: 'master backend' },
      '102020': { root: '../mls-102020', type: 'master frontend' },
      [projectId]: {
        root: `../mls-${projectId}`,
        type: 'client',
        modules: [{ moduleId: moduleName, basePath: `/${moduleName}`, backendControllers: controllers }],
      },
    },
  };
  writeFileSync(join(dir, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
}

export async function publishRoutes(projectId: string, moduleName: string): Promise<void> {
  if (!bffHome) throw new Error('The execBff config was not written.');
  if (routerReady) return;
  const previous = process.cwd();
  process.chdir(bffHome);
  try {
    const project = readProjectsConfig().projects[projectId];
    const moduleConfig = project?.modules?.find(item => item.moduleId === moduleName);
    if (!moduleConfig?.backendControllers) throw new Error(`${moduleName} is not registered for execBff.`);
    resetModuleRouterCache();
    const registration: ModuleBffRegistration = {
      projectId,
      moduleId: moduleName,
      frontendBasePath: moduleConfig.basePath,
      frontendEntrypoint: '',
      loadRouter: async () => routes,
    };
    await loadModuleRouter(registration);
    routerReady = true;
  } finally {
    process.chdir(previous);
  }
}

export function rememberRoute(key: string, handler: BffHandler): void {
  routes.set(key, handler);
}

export function routeCount(): number {
  return routes.size;
}

export async function runRoute(
  projectDir: string,
  projectId: string,
  moduleName: string,
  definition: M1Definition,
  item: M1ScenarioCase,
  started: number,
): Promise<M1Observation> {
  const page = item.routine.split('.')[1] ?? '';
  const pageRef = `_${projectId}_/l1/${moduleName}/layer_1_external/adapters/http/controllers/${page}.defs.ts`;
  const pageModule = await importFile(projectDir, outputOf(pageRef));
  if ('error' in pageModule) return row(item.caseId, { broken: 'import', reason: pageModule.error });
  const route = pageModule.module.routes?.find(entry => entry.key === item.routine);
  if (!route) return row(item.caseId, { inconclusive: true, reason: `route ${item.routine} is not exported` });
  await resetStore(projectDir, definition, await seedRows(projectDir, definition, item));
  const scopeDep = (await readDefinitionFile(projectDir, pageRef))?.dependencies.find(path => path.endsWith('/accessScope.defs.ts')) ?? '';
  const scope = scopeDep ? await importFile(projectDir, outputOf(scopeDep)) : { error: 'missing' };
  const pageDefinition = await readDefinitionFile(projectDir, pageRef);
  const authorities = 'error' in scope || !pageDefinition
    ? []
    : authoritiesFor(item, pageDefinition, scope.module.grants);
  rememberRoute(route.key, route.handler);
  try {
    await publishRoutes(projectId, moduleName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return row(item.caseId, { inconclusive: true, reason: message });
  }
  const executed = await execBff({
    routine: item.routine,
    params: await paramsFor(projectDir, definition, item),
    meta: { source: 'http', verifiedAuthorities: authorities },
  }, createRequestContext(undefined, { sandbox: true, sessionContext: { actorId: item.actorId } }));
  const durationMs = Date.now() - started;
  const response = executed.response;
  const rows = Array.isArray(response.data) ? response.data : [];
  const actorField = item.expect.isolatedActorField;
  if (response.ok) {
    const id = isRecord(response.data) && typeof response.data.id === 'string' ? response.data.id : '';
    return row(item.caseId, {
      ok: true,
      status: executed.statusCode,
      errorCode: null,
      durationMs,
      fields: fieldNames(response.data),
      rowActorIds: actorField ? rows.map(entry => isRecord(entry) && typeof entry[actorField] === 'string' ? entry[actorField] : '') : [],
      reason: id ? `saved ${id}` : 'returned',
    });
  }
  const details = response.error && typeof response.error === 'object' ? (response.error as { details?: { ruleId?: string } }).details : undefined;
  return row(item.caseId, {
    ok: false,
    status: executed.statusCode,
    errorCode: response.error?.code ?? null,
    ruleId: typeof details?.ruleId === 'string' ? details.ruleId : null,
    durationMs,
    fields: fieldNames(response.data),
    reason: response.error?.message ?? '',
  });
}

export async function observeImplement(input: {
  repoRoot: string;
  projectDir: string;
  projectId: string;
  catalogText: string;
  definition: M1Definition;
  defPath: string;
  files: Record<string, string>;
}): Promise<M1Observation[]> {
  const backups = new Map<string, string | null>();
  for (const [ref, body] of Object.entries(input.files)) backups.set(ref, swapProjectFile(input.projectDir, ref, body));
  try {
    const parsed = parseCatalog(input.catalogText);
    if (!parsed.catalog) return [];
    const cases = catalogForStage(parsed.catalog, 'implement').scenarios
      .filter(item => item.artifactId === input.definition.artifactId)
      .flatMap(item => item.cases);
    if (cases.length === 0) return [];
    installRuntime(input.projectDir, input.projectId, input.definition.moduleName);
    const observations: M1Observation[] = [];
    for (const item of cases) {
      if (item.routine && input.definition.artifactType === 'usecase') {
        const declared = declaredRoutes(input.definition);
        if (declared.length > 0 && !declared.includes(item.routine)) continue;
      }
      observations.push(await oneCase(input, item));
    }
    return observations;
  } finally {
    restoreProjectFiles(input.projectDir, backups);
  }
}

async function oneCase(input: {
  repoRoot: string;
  projectDir: string;
  projectId: string;
  definition: M1Definition;
  defPath: string;
  files: Record<string, string>;
}, item: M1ScenarioCase): Promise<M1Observation> {
  if (item.gate === 'compile') {
    const output = Object.keys(input.files)[0] ?? '';
    const rel = output.replace(/^_\d+_\/?/, '');
    if (!rel) return row(item.caseId, { inconclusive: true, reason: 'compile has no output file' });
    try {
      const log = compileFiles(input.repoRoot, input.projectDir, input.projectId, [rel]);
      if (!log) return row(item.caseId, { ok: true, status: 0, errorCode: null, reason: 'official tsconfig' });
      if (!log.includes(rel.split('/').pop() ?? rel)) {
        return row(item.caseId, { inconclusive: true, reason: 'official typecheck reported another file' });
      }
      return row(item.caseId, { broken: 'compile', reason: log.split('\n')[0] ?? 'compile failed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return row(item.caseId, { inconclusive: true, reason: message });
    }
  }
  const block = await caseBlock(input.definition, input.defPath, item, ref => readText(input.projectDir, ref));
  if (block?.unread) return row(item.caseId, { ok: false, status: 0, errorCode: 'GRANT_UNREAD', reason: `${item.routine} grant was not read` });
  if (block) {
    return row(item.caseId, {
      blocked: true,
      blockOwner: block.owner,
      errorCode: block.gap,
      ruleId: block.ruleId || null,
      reason: block.ruleId ? `${block.ruleId} is ${block.gap}` : `${item.routine} is ${block.gap}`,
    });
  }
  const started = Date.now();
  try {
    const onUsecase = await ruleRunsOnUsecase(input.definition, item.expect.ruleId ?? '', ref => readText(input.projectDir, ref));
    if (onUsecase || !item.routine) {
      return invokeExported(input.projectDir, input.defPath, input.definition, item, started);
    }
    return runRoute(input.projectDir, input.projectId, input.definition.moduleName, input.definition, item, started);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return row(item.caseId, { inconclusive: true, reason: message });
  }
}

async function invokeExported(
  projectDir: string,
  defPath: string,
  definition: M1Definition,
  item: M1ScenarioCase,
  started: number,
): Promise<M1Observation> {
  const loaded = await importFile(projectDir, outputOf(defPath));
  if ('error' in loaded) return row(item.caseId, { inconclusive: true, reason: loaded.error });
  const fn = loaded.module[definition.artifactId];
  if (typeof fn !== 'function') return row(item.caseId, { inconclusive: true, reason: `${definition.artifactId} is not exported` });
  const ports = await portsFor(projectDir, definition);
  if (!ports) return row(item.caseId, { inconclusive: true, reason: `${definition.artifactId} port was not loaded` });
  const params = fillCall(definition, await paramsFor(projectDir, definition, item));
  const ctx = createRequestContext(createMemoryDataRuntime(), { sandbox: true, moduleId: definition.moduleName });
  await resetStore(projectDir, definition, await seedForCall(projectDir, definition, item, params));
  try {
    const data = await (fn as (...args: unknown[]) => Promise<unknown>)(params, ctx, ports);
    const id = isRecord(data) && typeof data.id === 'string' ? data.id : '';
    return row(item.caseId, { ok: true, status: 200, errorCode: null, durationMs: Date.now() - started, reason: id ? `saved ${id}` : 'returned' });
  } catch (error) {
    const outcome = await thrownOutcome(error);
    if (outcome.thrown) return row(item.caseId, { inconclusive: true, durationMs: Date.now() - started, reason: outcome.reason || 'case did not run' });
    return row(item.caseId, { ...outcome, durationMs: Date.now() - started });
  }
}

async function portsFor(projectDir: string, definition: M1Definition): Promise<Record<string, unknown> | null> {
  const names = Array.isArray(definition.data.ports)
    ? definition.data.ports.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const dep = definition.dependencies.find(path => path.includes('/ports/'));
  if (!dep || names.length === 0) return {};
  const loaded = await importFile(projectDir, outputOf(dep));
  if ('error' in loaded) return null;
  const ports: Record<string, unknown> = {};
  for (const name of names) {
    const pending = loaded.module[`pending${name}`];
    if (pending === undefined) return null;
    ports[name.charAt(0).toLowerCase() + name.slice(1)] = pending;
  }
  return ports;
}

function fillCall(definition: M1Definition, params: Record<string, unknown>): Record<string, unknown> {
  const mdm = definition.data.mdm;
  if (!isRecord(mdm) || !Array.isArray(mdm.calls)) return params;
  const next = { ...params };
  for (const call of mdm.calls) {
    if (!isRecord(call) || !Array.isArray(call.arguments)) continue;
    for (const arg of call.arguments) {
      if (!isRecord(arg) || !isRecord(arg.origin) || arg.origin.kind !== 'contract') continue;
      const path = typeof arg.origin.path === 'string' ? arg.origin.path : '';
      if (!path || path === 'id' || path === 'version' || valueAt(next, path) !== undefined) continue;
      assignPath(next, path, sampleLeaf(path));
    }
  }
  return next;
}

function sampleLeaf(path: string): unknown {
  const leaf = path.split('.').pop() ?? '';
  if (leaf === 'name') return 'Ada';
  if (leaf === 'docType') return 'Passport';
  if (leaf === 'docId') return 'DOC1';
  if (leaf === 'countryCode') return 'US';
  if (leaf === 'notes' || leaf === 'occupation') return 'sample';
  if (leaf === 'aliases') return ['Ada'];
  if (leaf === 'page') return 1;
  return 'sample';
}

function valueAt(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const part of path.split('.')) {
    if (!isRecord(node) || !(part in node)) return undefined;
    node = node[part];
  }
  return node;
}

async function seedForCall(
  projectDir: string,
  definition: M1Definition,
  item: M1ScenarioCase,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const seeded = await seedRows(projectDir, definition, item);
  if (seeded.length > 0 || definition.data.operation !== 'transition') return seeded;
  const lifecycle = isRecord(definition.data.lifecycle) ? definition.data.lifecycle : null;
  const transitionId = lifecycle && typeof lifecycle.transitionId === 'string' ? lifecycle.transitionId : '';
  const dep = definition.dependencies.find(path => path.includes('/entities/'));
  const entity = dep ? await readDefinitionFile(projectDir, dep) : null;
  const spec = entity ? transitionFrom(entity, transitionId) : null;
  const statusField = entity ? soleEnumField(entity) : '';
  if (!spec || !statusField) return seeded;
  const selector = selectorOf(definition);
  if (selector && (params[selector] === undefined || params[selector] === '')) params[selector] = 'sample';
  const payload = lifecycle && Array.isArray(lifecycle.payload) ? lifecycle.payload : [];
  for (const path of payload) {
    if (typeof path === 'string' && (valueAt(params, path) === undefined || valueAt(params, path) === '')) assignPath(params, path, 'sample');
  }
  return [{ ...params, [statusField]: spec }];
}

function selectorOf(definition: M1Definition): string {
  if (!Array.isArray(definition.data.uses)) return '';
  const found = definition.data.uses.find(item => isRecord(item) && item.role === 'selector' && item.source === 'input');
  return isRecord(found) && typeof found.path === 'string' ? found.path : '';
}

function transitionFrom(entity: M1Definition, transitionId: string): string {
  const lifecycle = entity.data.lifecycle;
  if (!isRecord(lifecycle) || !Array.isArray(lifecycle.transitions)) return '';
  const found = lifecycle.transitions.find(item => isRecord(item) && item.transitionId === transitionId);
  if (!isRecord(found) || !Array.isArray(found.from)) return '';
  return typeof found.from[0] === 'string' ? found.from[0] : '';
}

function soleEnumField(entity: M1Definition): string {
  const fields = Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  const enums = fields.filter(field => field.type === 'enum' && typeof field.name === 'string' && !field.name.includes('.'));
  return enums.length === 1 && typeof enums[0].name === 'string' ? enums[0].name : '';
}

export async function seedRows(projectDir: string, definition: M1Definition, item: M1ScenarioCase): Promise<Record<string, unknown>[]> {
  const dep = definition.dependencies.find(path => path.includes('/entities/'));
  const entity = dep ? await readDefinitionFile(projectDir, dep) : null;
  const fields = entity && Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  return item.synthetic.map(entry => {
    const flat = { ...entry } as Record<string, unknown>;
    const record: Record<string, unknown> = {};
    for (const field of fields) {
      const path = typeof field.name === 'string' ? field.name : '';
      if (!path) continue;
      if (!path.includes('.')) {
        if (flat[path] !== undefined) record[path] = flat[path];
      } else if (flat[path.split('.').pop() ?? ''] !== undefined) {
        assignPath(record, path, flat[path.split('.').pop() ?? '']);
      }
    }
    return record;
  });
}

export async function paramsFor(projectDir: string, definition: M1Definition, item: M1ScenarioCase): Promise<Record<string, unknown>> {
  const contract = contractOf(definition, item.routine);
  const contractText = contract ? await readText(projectDir, contract.path) : null;
  const required = contract && contractText ? (requiredMembers(contractText, contract.inputType) ?? []) : [];
  const types = inputTypes(definition);
  const names = required.length > 0 ? required : [...types.keys()];
  if (!item.synthetic[0]) return {};
  const entry = { ...item.synthetic[0] } as Record<string, unknown>;
  const params: Record<string, unknown> = {};
  for (const field of names) {
    if (typeof entry[field] === 'string' && entry[field] !== '') {
      params[field] = entry[field];
      continue;
    }
    const nested = contractText && contract ? nestedMembers(contractText, contract.inputType, field) : null;
    if (nested) {
      const value: Record<string, string> = {};
      for (const key of nested) {
        if (typeof entry[key] === 'string') value[key] = entry[key];
      }
      params[field] = value;
      continue;
    }
    const literal = /"([^"]+)"/.exec(types.get(field) ?? '')?.[1] ?? '';
    params[field] = literal || 'sample';
  }
  return params;
}

export async function resetStore(projectDir: string, definition: M1Definition, seed: Record<string, unknown>[]): Promise<void> {
  const dep = definition.dependencies.find(path => path.includes('/ports/'));
  if (!dep) return;
  const loaded = await importFile(projectDir, outputOf(dep));
  if ('error' in loaded || typeof loaded.module.resetMemory !== 'function') return;
  loaded.module.resetMemory(seed);
}

function authoritiesFor(item: M1ScenarioCase, definition: M1Definition, grants: unknown): string[] {
  if (!item.actorId) return [];
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers : [];
  const handler = handlers.find(entry => isRecord(entry) && entry.route === item.routine);
  const grantIds = isRecord(handler) && Array.isArray(handler.grantIds) ? handler.grantIds.filter((entry): entry is string => typeof entry === 'string') : [];
  const rows = Array.isArray(grants) ? grants.filter(isRecord) : [];
  const authorities: string[] = [];
  for (const grantId of grantIds) {
    const grant = rows.find(entry => entry.grantId === grantId);
    if (!grant || typeof grant.actorRef !== 'string' || !grant.actorRef) continue;
    authorities.push(`${definition.moduleName}:${grant.actorRef}`);
  }
  return authorities;
}

function nestedMembers(source: string, typeName: string, field: string): string[] | null {
  const tokenText = `export interface ${typeName} `;
  const at = source.indexOf(tokenText);
  if (at < 0) return null;
  const open = source.indexOf('{', at);
  if (open < 0) return null;
  const lines = source.slice(open).split('\n');
  let depth = 0;
  let inside = false;
  const names: string[] = [];
  for (const line of lines) {
    if (!inside && depth === 1) {
      const match = /^\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\??\s*:\s*\{/.exec(line);
      if (match && match[1] === field) inside = true;
    } else if (inside && depth === 2) {
      const match = /^\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\??\s*:/.exec(line);
      if (match) names.push(match[1]);
    }
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (inside && depth < 2) break;
  }
  return inside ? names : null;
}

function declaredRoutes(definition: M1Definition): string[] {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : null;
  const refs = fn && Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord) : [];
  return refs.map(item => typeof item.route === 'string' ? item.route : '').filter(Boolean);
}

function contractOf(definition: M1Definition, routine: string): { path: string; inputType: string } | null {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : null;
  const refs = fn && Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord) : [];
  const match = refs.find(item => item.route === routine && String(item.symbol ?? '').endsWith('Output'))
    ?? refs.find(item => String(item.symbol ?? '').endsWith('Output'));
  if (!match) return null;
  const symbol = String(match.symbol ?? '');
  const route = String(match.route ?? '');
  const projections = Array.isArray(definition.data.routeProjections) ? definition.data.routeProjections.filter(isRecord) : [];
  const projection = projections.find(item => item.route === route);
  const contractPath = projection && typeof projection.contractPath === 'string' ? projection.contractPath : '';
  const path = definition.dependencies.find(item => contractPath && (item === contractPath || item.endsWith(`/${contractPath}`)))
    ?? definition.dependencies.find(item => route.split('.')[1] && item.endsWith(`/${route.split('.')[1]}.defs.ts`))
    ?? '';
  return path ? { path, inputType: symbol.replace(/Output$/, 'Input') } : null;
}

function inputTypes(definition: M1Definition): Map<string, string> {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : null;
  const inputs = fn && Array.isArray(fn.input) ? fn.input.filter(isRecord) : [];
  return new Map(inputs.map(field => [String(field.name ?? ''), String(field.type ?? '')]));
}

function assignPath(record: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.').filter(Boolean);
  let node = record;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      node[part] = value;
      return;
    }
    const next = isRecord(node[part]) ? node[part] : {};
    node[part] = next;
    node = next;
  });
}

function outputOf(ref: string): string { return ref.replace(/\.defs\.ts$/, '.ts'); }

async function readText(projectDir: string, ref: string): Promise<string | null> {
  try {
    return readFileSync(diskOf(projectDir, ref), 'utf8');
  } catch {
    return null;
  }
}

async function readDefinitionFile(projectDir: string, ref: string): Promise<M1Definition | null> {
  const text = await readText(projectDir, ref);
  if (!text) return null;
  const parsed = parseDefinitionSource(text);
  if (!('definition' in parsed)) return null;
  const definition = readDefinition(parsed.definition);
  return 'issues' in definition ? null : definition;
}

async function importFile(projectDir: string, ref: string): Promise<{ module: SandboxModule } | { error: string }> {
  try {
    const href = `${pathToFileURL(diskOf(projectDir, ref)).href}?m1=${Date.now()}`;
    return { module: await import(href) as SandboxModule };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function diskOf(projectDir: string, ref: string): string {
  const match = /^_\d+_\/(.+)$/.exec(ref);
  if (!match) throw new Error(ref);
  return join(projectDir, match[1]);
}

function swapProjectFile(projectDir: string, ref: string, body: string): string | null {
  const match = /^_\d+_\/(.+)$/.exec(ref);
  if (!match) return null;
  const full = join(projectDir, match[1]);
  const previous = existsSync(full) ? readFileSync(full, 'utf8') : null;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body);
  return previous;
}

function restoreProjectFiles(projectDir: string, backups: ReadonlyMap<string, string | null>): void {
  for (const [ref, previous] of backups) {
    const match = /^_\d+_\/(.+)$/.exec(ref);
    if (!match) continue;
    const full = join(projectDir, match[1]);
    if (previous === null) unlinkSync(full);
    else writeFileSync(full, previous);
  }
}

function row(caseId: string, patch: Partial<M1Observation>): M1Observation {
  return {
    caseId,
    durationMs: patch.durationMs ?? 1,
    broken: patch.broken ?? 'none',
    thrown: patch.thrown ?? false,
    skipped: false,
    inconclusive: patch.inconclusive ?? false,
    blocked: patch.blocked ?? false,
    blockOwner: patch.blockOwner ?? '',
    ok: patch.ok ?? false,
    status: patch.status ?? 0,
    errorCode: patch.errorCode ?? null,
    ruleId: patch.ruleId ?? null,
    fields: patch.fields ?? [],
    rowActorIds: patch.rowActorIds ?? [],
    reason: patch.reason ?? '',
  };
}

async function thrownOutcome(error: unknown): Promise<Partial<M1Observation>> {
  const imported = await import('/_102034_/l1/server/layer_2_controllers/contracts.js') as {
    AppError: new (...args: never[]) => Error & { code: string; statusCode: number; details?: unknown };
  };
  if (error instanceof imported.AppError) {
    const details = error.details;
    const ruleId = isRecord(details) && typeof details.ruleId === 'string' ? details.ruleId : null;
    return { ok: false, status: error.statusCode, errorCode: error.code, ruleId, reason: error.message };
  }
  return { thrown: true, ok: false, status: 500, errorCode: 'INTERNAL_ERROR', reason: error instanceof Error ? error.message : String(error) };
}

function fieldNames(data: unknown): string[] {
  if (Array.isArray(data)) return [...new Set(data.flatMap(item => fieldNames(item)))];
  if (!isRecord(data)) return [];
  return Object.keys(data);
}
