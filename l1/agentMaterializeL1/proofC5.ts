/// <mls fileReference="_102021_/l1/agentMaterializeL1/proofC5.ts" enhancement="_blank"/>

/**
 * Lote 1 of the behavior stage. The flow selects the defs. Every case of
 * that cut is executed. A block comes from the def, not from the case id.
 * --inject disable-rules removes the generated storage check; that case
 * must come back failed.
 *
 *   tsx --import ./test/register-hooks.mjs mls-102021/l1/agentMaterializeL1/proofC5.ts --evidence <dir> --defs <dir> --repo <dir> [--inject disable-rules]
 */

import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isRecord, parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { behaviorNeedsLlm, caseBlock, withoutStorageChecks } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { requiredMembers } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { parseCatalog, renderMonitorCatalog, type M1ScenarioCase } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { verifyBatch, type M1Checkpoint, type M1Observation } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import { createDiskHost, scenarioCatalogRef } from '/_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.js';
import type { BffHandler, ModuleBffRegistration } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createRequestContext, execBff } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { readProjectsConfig } from '/_102034_/l1/server/layer_1_external/config/projectConfig.js';
import { loadModuleRouter, resetModuleRouterCache } from '/_102034_/l1/server/layer_2_controllers/moduleRegistry.js';

const PROJECT = 102047;
const MODULE = 'agendaClinica';
const FLOW = 'consultas_recepcionista';
const INJECT = ['disable-rules'] as const;
type InjectMode = '' | typeof INJECT[number];

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const CATALOG_FIXTURE = join(HERE, '../../l2/agentMaterializeL1/testing/catalogFixture.json');
const PAGE_DEF = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${FLOW}.defs.ts`;

interface ProofArgs { evidence: string; defs: string; repo: string; inject: InjectMode }
interface SpawnResult { code: number; stdout: string; stderr: string; argv: string[] }
interface SandboxModule { routes?: Array<{ key: string; handler: BffHandler }>; resetMemory?: (seed?: Record<string, unknown>[]) => void; [key: string]: unknown }
interface FlowUnit { defPath: string; definition: M1Definition; code: 'PROMOTED' | 'BLOCKED' }

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const problems: string[] = [];
  const evidence = resolve(args.evidence);
  const defs = resolve(args.defs);
  const repo = resolve(args.repo);
  if (isInside(evidence, repo) || evidence === repo) throw new Error('Evidence directory must not be inside the client repository.');
  const before = porcelain(repo);
  const sandboxParent = args.inject ? join(evidence, 'inject', args.inject, 'sandbox') : join(evidence, 'sandbox');
  const outDir = args.inject ? join(evidence, 'inject', args.inject) : evidence;
  const sandboxProject = join(sandboxParent, `mls-${PROJECT}`);
  await rm(sandboxParent, { recursive: true, force: true });
  await mkdir(sandboxProject, { recursive: true });
  await mkdir(outDir, { recursive: true });

  const archived = spawn('git', ['-C', repo, 'archive', 'HEAD', 'l2', 'l4', 'l5']);
  if (archived.code !== 0) throw new Error(archived.stderr || 'git archive failed');
  const extracted = spawn('tar', ['-x', '-C', sandboxProject], archived.stdoutRaw);
  if (extracted.code !== 0) throw new Error(extracted.stderr || 'tar failed');
  await cp(join(defs, 'l1'), join(sandboxProject, 'l1'), { recursive: true });
  const projectJsonPath = join(sandboxProject, 'l5', 'project.json');
  const projectJson = JSON.parse(await readFile(projectJsonPath, 'utf8')) as { appEnv?: unknown };
  projectJson.appEnv = 'development';
  await writeFile(projectJsonPath, `${JSON.stringify(projectJson, null, 2)}\n`);
  const catalogRef = scenarioCatalogRef(PROJECT, MODULE);
  await writeCatalog(sandboxProject, catalogRef);
  await writeBffHome(join(evidence, 'bff-home'));

  const host = createDiskHost(sandboxParent, sandboxParent, PROJECT, REPO_ROOT);
  host.catalogRef = catalogRef;
  const selected = await flowUnits(sandboxProject);
  const simulate = materialize('simulate', '', sandboxParent);
  const structure = materialize('structure', FLOW, sandboxParent);
  const implement = materialize('implement', FLOW, sandboxParent);
  if (simulate.code !== 0) problems.push(`simulate exit ${simulate.code}`);
  if (!simulate.stdout.includes('llmCalls: 0')) problems.push('simulate called a model');
  if (!implement.stdout.includes('llmCalls: 0')) problems.push('implement called a model');
  if (selected.units.length === 0) problems.push('the flow selected no derivable usecase');
  for (const unit of selected.units) {
    if (!implement.stdout.includes(`${unit.code} ${unit.defPath}`)) problems.push(`${unit.definition.artifactId} was not ${unit.code}`);
  }
  for (const port of selected.ports) {
    if (!implement.stdout.includes(`PROMOTED ${port}`)) problems.push(`${port} was not promoted`);
  }

  const patchProblems = args.inject === 'disable-rules' ? disableRules(sandboxProject, selected.units) : [];
  const compileLog = compileSlice(sandboxProject, selected.files);
  if (compileLog) problems.push('slice did not compile');
  const scored = await score(host, catalogRef, sandboxProject, selected.units);
  problems.push(...scored.problems, ...patchProblems);
  problems.push(...verdictProblems(scored.checkpoints, scored.blocked, scored.storage, args.inject));

  const after = porcelain(repo);
  if (after !== before) problems.push('client repository status changed');
  const repoHead = spawn('git', ['-C', repo, 'rev-parse', 'HEAD']).stdout.trim();
  const baseHead = spawn('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD']).stdout.trim();
  const checkpoint = {
    schemaVersion: 'm1_06-proof',
    inject: args.inject || null,
    proofOk: problems.length === 0,
    problems,
    compile: compileLog ? 'failed' : 'clean',
    repoHead,
    baseHead,
    repoStatusUnchanged: after === before,
    checkpoints: scored.checkpoints,
    notes: scored.notes,
  };
  const commands = [process.argv.join(' '), ...[simulate, structure, implement].map(item => item.argv.join(' '))];
  await writeFile(join(outDir, 'commands.txt'), `${commands.join('\n')}\n`);
  await writeFile(join(outDir, 'implement.log'), `${implement.stdout}\n${implement.stderr}`);
  await writeFile(join(outDir, 'compile.log'), compileLog || 'clean\n');
  await writeFile(join(outDir, 'head.txt'), `${repoHead}\n${baseHead}\n`);
  await writeFile(join(outDir, 'checkpoint.json'), `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(join(outDir, 'repo-status.txt'), after);
  console.log(`proof: ${problems.length === 0 ? 'ok' : 'failed'}`);
  console.log(`inject: ${args.inject || 'none'}`);
  console.log(`compile: ${compileLog ? 'failed' : 'clean'}`);
  console.log(`checkpoint: ${join(outDir, 'checkpoint.json')}`);
  for (const problem of problems) console.log(`problem: ${problem}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

function verdictProblems(
  checkpoints: readonly M1Checkpoint[],
  blocked: ReadonlySet<string>,
  storage: ReadonlySet<string>,
  inject: InjectMode,
): string[] {
  const problems: string[] = [];
  const rows = checkpoints.flatMap(item => item.evidence);
  if (rows.length === 0) problems.push('the cut has no cases');
  for (const row of rows) {
    if (inject === 'disable-rules' && storage.has(row.caseId)) {
      if (row.verdict !== 'failed') problems.push(`uniqueness control was ${row.verdict}`);
      continue;
    }
    const wanted = blocked.has(row.caseId) ? 'blocked' : 'passed';
    if (row.verdict !== wanted) problems.push(`${row.caseId} was ${row.verdict}`);
  }
  if (rows.some(item => item.verdict === 'expectedRed')) problems.push('a case was expected red');
  if (checkpoints.some(item => item.ready && item.evidence.some(row => row.verdict === 'blocked'))) {
    problems.push('a gap was accepted as ready');
  }
  if (inject === 'disable-rules' && checkpoints.some(item => item.ready)) problems.push('disabled rules were accepted as ready');
  return problems;
}

function disableRules(sandboxProject: string, units: readonly FlowUnit[]): string[] {
  let removed = 0;
  for (const unit of units) {
    const full = diskOf(sandboxProject, outputOf(unit.defPath));
    const source = readFileSync(full, 'utf8');
    const next = withoutStorageChecks(source);
    removed += next.removed;
    if (next.removed > 0) writeFileSync(full, next.source);
  }
  return removed > 0 ? [] : ['uniqueness rule was not in the generated usecase'];
}

async function score(
  host: ReturnType<typeof createDiskHost>,
  catalogRef: string,
  sandboxProject: string,
  units: readonly FlowUnit[],
): Promise<{ problems: string[]; checkpoints: M1Checkpoint[]; notes: string[]; blocked: Set<string>; storage: Set<string> }> {
  installRuntime(sandboxProject);
  const catalogText = await host.io.read(catalogRef);
  const parsed = parseCatalog(catalogText ?? '');
  if (!parsed.catalog) throw new Error(parsed.issues.join('; ') || 'catalog unreadable');
  const checkpoints: M1Checkpoint[] = [];
  const notes: string[] = [];
  const problems: string[] = [];
  const blocked = new Set<string>();
  const storage = new Set<string>();
  const cases = units.flatMap(unit => parsed.catalog?.scenarios.find(item => item.artifactId === unit.definition.artifactId)?.cases ?? []);
  await registerRoutes(sandboxProject, cases.map(item => item.routine.split('.')[1] ?? '').filter(Boolean));
  for (const unit of units) {
    const scenario = parsed.catalog.scenarios.find(item => item.artifactId === unit.definition.artifactId);
    if (!scenario) {
      problems.push(`${unit.definition.artifactId} has no scenario`);
      continue;
    }
    for (const item of scenario.cases) {
      if (item.gate === 'compile') continue;
      const block = await caseBlock(unit.definition, unit.defPath, item, ref => readSandbox(sandboxProject, ref));
      if (block && !block.unread) blocked.add(item.caseId);
      else if (!item.expect.ok && item.expect.errorCode === 'CONFLICT' && item.expect.ruleId) storage.add(item.caseId);
    }
    const executed = await executeScenario(sandboxProject, unit, scenario.cases);
    notes.push(...executed.notes);
    checkpoints.push(await report(host, catalogRef, unit.definition, executed.observations));
  }
  return { problems, checkpoints, notes, blocked, storage };
}

async function executeScenario(
  sandboxProject: string,
  unit: FlowUnit,
  cases: readonly M1ScenarioCase[],
): Promise<{ observations: M1Observation[]; notes: string[] }> {
  const observations: M1Observation[] = [];
  const notes: string[] = [];
  const loaded = await importSandbox(sandboxProject, outputOf(unit.defPath));
  if ('error' in loaded) {
    return { observations: cases.map(item => observation(item.caseId, { broken: 'import', reason: loaded.error })), notes };
  }
  for (const item of cases) {
    if (item.gate === 'compile') {
      observations.push(observation(item.caseId, { ok: true, status: 0, errorCode: null, reason: 'imported' }));
      continue;
    }
    const started = Date.now();
    const block = await caseBlock(unit.definition, unit.defPath, item, ref => readSandbox(sandboxProject, ref));
    if (block?.unread) {
      observations.push(observation(item.caseId, { ok: false, status: 0, errorCode: 'GRANT_UNREAD', durationMs: Date.now() - started, reason: `${item.routine} grant was not read` }));
      continue;
    }
    if (block) {
      observations.push(observation(item.caseId, {
        blocked: true,
        blockOwner: block.owner,
        errorCode: block.gap,
        ruleId: block.ruleId || null,
        durationMs: Date.now() - started,
        reason: block.ruleId ? `${block.ruleId} is ${block.gap}` : `${item.routine} is ${block.gap}`,
      }));
      continue;
    }
    const routed = await callRoute(sandboxProject, unit.definition, item, started);
    if (item.mutating && item.expect.ok && !routed.reason.startsWith('saved ')) notes.push(`${item.caseId} did not return a saved id`);
    observations.push(routed);
  }
  return { observations, notes };
}

async function callRoute(
  sandboxProject: string,
  definition: M1Definition,
  item: M1ScenarioCase,
  started: number,
): Promise<M1Observation> {
  const page = item.routine.split('.')[1] ?? '';
  const pageRef = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${page}.defs.ts`;
  const pageModule = await importSandbox(sandboxProject, outputOf(pageRef));
  if ('error' in pageModule) return observation(item.caseId, { broken: 'import', reason: pageModule.error });
  const route = pageModule.module.routes?.find(entry => entry.key === item.routine);
  if (!route) return observation(item.caseId, { reason: `route ${item.routine} is not exported` });
  await resetStore(sandboxProject, definition, await seedRows(sandboxProject, definition, item));
  const scopeDep = (await readDefinitionFile(sandboxProject, pageRef))?.dependencies.find(path => path.endsWith('/accessScope.defs.ts')) ?? '';
  const scope = scopeDep ? await importSandbox(sandboxProject, outputOf(scopeDep)) : { error: 'missing' };
  const pageDefinition = await readDefinitionFile(sandboxProject, pageRef);
  const authorities = 'error' in scope || typeof scope.module.resolveGrant !== 'function' || !pageDefinition
    ? []
    : authoritiesFor(item, pageDefinition, scope.module.resolveGrant as (grantId: string) => unknown);
  proofRoutes.set(route.key, route.handler);
  await publishProofRoutes();
  const executed = await execBff({
    routine: item.routine,
    params: await paramsFor(sandboxProject, definition, item),
    meta: { source: 'http', verifiedAuthorities: authorities },
  }, createRequestContext(undefined, { sandbox: true }));
  const durationMs = Date.now() - started;
  const response = executed.response;
  const rows = Array.isArray(response.data) ? response.data : [];
  const actorField = item.expect.isolatedActorField;
  if (response.ok) {
    const id = isRecord(response.data) && typeof response.data.id === 'string' ? response.data.id : '';
    return observation(item.caseId, {
      ok: true,
      status: executed.statusCode,
      errorCode: null,
      durationMs,
      fields: fieldNames(response.data),
      rowActorIds: actorField ? rows.map(row => isRecord(row) && typeof row[actorField] === 'string' ? row[actorField] : '') : [],
      reason: id ? `saved ${id}` : 'returned',
    });
  }
  const details = response.error && typeof response.error === 'object' ? (response.error as { details?: { ruleId?: string } }).details : undefined;
  return observation(item.caseId, {
    ok: false,
    status: executed.statusCode,
    errorCode: response.error?.code ?? null,
    ruleId: typeof details?.ruleId === 'string' ? details.ruleId : null,
    durationMs,
    fields: fieldNames(response.data),
    reason: response.error?.message ?? '',
  });
}

async function seedRows(sandboxProject: string, definition: M1Definition, item: M1ScenarioCase): Promise<Record<string, unknown>[]> {
  const dep = definition.dependencies.find(path => path.includes('/entities/'));
  const entity = dep ? await readDefinitionFile(sandboxProject, dep) : null;
  const fields = entity && Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  return item.synthetic.map(row => {
    const flat = { ...row } as Record<string, unknown>;
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

async function paramsFor(sandboxProject: string, definition: M1Definition, item: M1ScenarioCase): Promise<Record<string, string>> {
  const contract = contractOf(definition, item.routine);
  const contractText = contract ? await readSandbox(sandboxProject, contract.path) : null;
  const required = contract && contractText ? (requiredMembers(contractText, contract.inputType) ?? []) : [];
  const types = inputTypes(definition);
  const names = required.length > 0 ? required : [...types.keys()];
  const row = item.synthetic[0] ? { ...item.synthetic[0] } as Record<string, unknown> : {};
  const params: Record<string, string> = {};
  for (const field of names) {
    const fromRow = typeof row[field] === 'string' ? row[field] : '';
    const literal = /"([^"]+)"/.exec(types.get(field) ?? '')?.[1] ?? '';
    params[field] = fromRow || literal || 'sample';
  }
  return params;
}

async function resetStore(sandboxProject: string, definition: M1Definition, seed: Record<string, unknown>[]): Promise<void> {
  const dep = definition.dependencies.find(path => path.includes('/ports/'));
  if (!dep) return;
  const loaded = await importSandbox(sandboxProject, outputOf(dep));
  if ('error' in loaded || typeof loaded.module.resetMemory !== 'function') return;
  loaded.module.resetMemory(seed);
}

async function registerRoutes(sandboxProject: string, pages: readonly string[]): Promise<void> {
  for (const page of new Set(pages)) {
    const ref = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${page}.defs.ts`;
    const loaded = await importSandbox(sandboxProject, outputOf(ref));
    if ('error' in loaded) continue;
    for (const route of loaded.module.routes ?? []) proofRoutes.set(route.key, route.handler);
  }
  if (proofRoutes.size > 0) await publishProofRoutes();
}

async function flowUnits(sandboxProject: string): Promise<{ units: FlowUnit[]; ports: string[]; files: string[] }> {
  const controller = await readDefinitionFile(sandboxProject, PAGE_DEF);
  if (!controller) return { units: [], ports: [], files: [] };
  const handlers = Array.isArray(controller.data.handlers) ? controller.data.handlers.filter(isRecord) : [];
  const units: FlowUnit[] = [];
  const ports = new Set<string>();
  const files = new Set<string>([relOf(PAGE_DEF)]);
  const scope = controller.dependencies.find(path => path.endsWith('/accessScope.defs.ts'));
  if (scope) files.add(relOf(scope));
  for (const handler of handlers) {
    const usecaseId = typeof handler.usecaseId === 'string' ? handler.usecaseId : '';
    const defPath = controller.dependencies.find(path => path.endsWith(`/${usecaseId}.defs.ts`)) ?? '';
    if (!defPath) continue;
    const definition = await readDefinitionFile(sandboxProject, defPath);
    if (!definition || behaviorNeedsLlm(definition)) continue;
    const catalog = parseCatalog(await readFile(CATALOG_FIXTURE, 'utf8'));
    const cases = catalog.catalog?.scenarios.find(item => item.artifactId === definition.artifactId)?.cases ?? [];
    let blocked = false;
    for (const item of cases) {
      if (item.gate === 'compile') continue;
      const block = await caseBlock(definition, defPath, item, ref => readSandbox(sandboxProject, ref));
      if (block && !block.unread) blocked = true;
    }
    units.push({ defPath, definition, code: blocked ? 'BLOCKED' : 'PROMOTED' });
    for (const dep of definition.dependencies) {
      if (dep.includes('/ports/')) ports.add(dep);
      if (dep.includes('/entities/') || dep.includes('/ports/')) files.add(relOf(dep));
    }
    files.add(relOf(defPath));
  }
  return { units, ports: [...ports], files: [...files] };
}

function authoritiesFor(item: M1ScenarioCase, definition: M1Definition, resolveGrant: (grantId: string) => unknown): string[] {
  if (!item.actorId) return [];
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers : [];
  const handler = handlers.find(entry => isRecord(entry) && entry.route === item.routine);
  const grantIds = isRecord(handler) && Array.isArray(handler.grantIds) ? handler.grantIds.filter((entry): entry is string => typeof entry === 'string') : [];
  const authorities: string[] = [];
  for (const grantId of grantIds) {
    const resolved = resolveGrant(grantId);
    if (!isRecord(resolved) || typeof resolved.actorRef !== 'string' || !resolved.actorRef) continue;
    authorities.push(`${definition.moduleName}:${resolved.actorRef}`);
  }
  return authorities;
}

const proofRoutes = new Map<string, BffHandler>();
let proofRouterReady = false;
let bffHome = '';

async function writeBffHome(dir: string): Promise<void> {
  bffHome = dir;
  await mkdir(dir, { recursive: true });
  const controllers = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers`;
  const config = {
    defaultProjectId: String(PROJECT),
    projects: {
      '102034': { root: '../mls-102034', type: 'master backend' },
      '102020': { root: '../mls-102020', type: 'master frontend' },
      [String(PROJECT)]: {
        root: `../mls-${PROJECT}`,
        type: 'client',
        modules: [{ moduleId: MODULE, basePath: `/${MODULE}`, backendControllers: controllers }],
      },
    },
  };
  await writeFile(join(dir, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
}

async function publishProofRoutes(): Promise<void> {
  if (!bffHome) throw new Error('The execBff config was not written.');
  if (proofRouterReady) return;
  const previous = process.cwd();
  process.chdir(bffHome);
  try {
    const project = readProjectsConfig().projects[String(PROJECT)];
    const moduleConfig = project?.modules?.find(item => item.moduleId === MODULE);
    if (!moduleConfig?.backendControllers) throw new Error(`${MODULE} is not registered for execBff.`);
    resetModuleRouterCache();
    const registration: ModuleBffRegistration = {
      projectId: String(PROJECT),
      moduleId: MODULE,
      frontendBasePath: moduleConfig.basePath,
      frontendEntrypoint: '',
      loadRouter: async () => proofRoutes,
    };
    await loadModuleRouter(registration);
    proofRouterReady = true;
  } finally {
    process.chdir(previous);
  }
}

async function report(
  host: ReturnType<typeof createDiskHost>,
  catalogRef: string,
  definition: M1Definition,
  observations: readonly M1Observation[],
): Promise<M1Checkpoint> {
  const handler = handlerFor(definition.artifactType, 'implement');
  if (!handler) throw new Error(definition.artifactType);
  const now = new Date().toISOString();
  return verifyBatch({
    handler,
    io: host.io,
    catalogRef,
    artifactId: definition.artifactId,
    observations,
    runId: 'm1-06',
    commit: 'proof',
    startedAt: now,
    finishedAt: now,
    monitorError: null,
  });
}

async function loadDefinition(host: ReturnType<typeof createDiskHost>, defPath: string): Promise<M1Definition> {
  const text = await host.io.read(defPath);
  if (!text) throw new Error(`Unreadable ${defPath}`);
  const parsed = parseDefinitionSource(text);
  if (!('definition' in parsed)) throw new Error(parsed.issues.join('; '));
  const definition = readDefinition(parsed.definition);
  if ('issues' in definition) throw new Error(`${defPath} ${definition.issues.join('; ')}`);
  return definition;
}

async function writeCatalog(sandboxProject: string, catalogRef: string): Promise<void> {
  const parsed = parseCatalog(await readFile(CATALOG_FIXTURE, 'utf8'));
  if (!parsed.catalog) throw new Error(parsed.issues.join('; '));
  const match = /^_\d+_\/(.+)$/.exec(catalogRef);
  if (!match) throw new Error(catalogRef);
  const full = join(sandboxProject, match[1]);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, renderMonitorCatalog(parsed.catalog, catalogRef));
}

function compileSlice(sandboxProject: string, slice: readonly string[]): string {
  const config = join(REPO_ROOT, `.tsconfig.m1-06-${process.pid}.json`);
  try {
    const files = slice.map(rel => `./${relative(REPO_ROOT, join(sandboxProject, rel)).split(sep).join('/')}`);
    const base = readFileSync(join(REPO_ROOT, 'tsconfig.base.json'), 'utf8');
    const paths: Record<string, string[]> = {};
    for (const id of new Set([...base.matchAll(/\/_(\d+)_\//g)].map(match => match[1]))) paths[`/_${id}_/*`] = [`./mls-${id}/*`];
    paths[`/_${PROJECT}_/*`] = [`./${relative(REPO_ROOT, sandboxProject).split(sep).join('/')}/*`];
    writeFileSync(config, `${JSON.stringify({ extends: './tsconfig.base.json', compilerOptions: { noEmit: true, paths }, files }, null, 2)}\n`);
    const tsc = join(REPO_ROOT, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '-p', config, '--pretty', 'false'], { cwd: REPO_ROOT, encoding: 'utf8' });
    if ((result.status ?? 1) === 0) return '';
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  } finally {
    rmSync(config, { force: true });
  }
}

function materialize(stage: string, flow: string, sandboxParent: string): SpawnResult {
  const tsx = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
  const hook = join(REPO_ROOT, 'test/register-hooks.mjs');
  const cli = join(HERE, 'nodejsMaterializeL1.ts');
  const argv = [tsx, '--import', hook, cli, '--project', String(PROJECT), '--module', MODULE, '--stage', stage, '--source-root', sandboxParent, '--output', sandboxParent];
  if (flow) argv.push('--flow', flow);
  const result = spawnSync(argv[0], argv.slice(1), { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return { code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', argv };
}

function parseArgs(argv: readonly string[]): ProofArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token.startsWith('--') || !value || value.startsWith('--')) throw new Error(`Missing value for ${token}.`);
    values.set(token, value);
    index += 1;
  }
  const evidence = values.get('--evidence') ?? '';
  const defs = values.get('--defs') ?? '';
  const repo = values.get('--repo') ?? '';
  const inject = values.get('--inject') ?? '';
  if (!evidence || !defs || !repo) throw new Error('Pass --evidence, --defs and --repo.');
  if (inject && !INJECT.includes(inject as typeof INJECT[number])) throw new Error('Inject must be disable-rules.');
  return { evidence, defs, repo, inject: inject as InjectMode };
}

async function importSandbox(sandboxProject: string, ref: string): Promise<{ module: SandboxModule } | { error: string }> {
  try {
    return { module: await import(pathToFileURL(diskOf(sandboxProject, ref)).href) as SandboxModule };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

let runtimeReady = false;
function installRuntime(sandboxProject: string): void {
  if (runtimeReady) return;
  runtimeReady = true;
  const runtime = Module as unknown as { _resolveFilename: (this: unknown, request: string, parent: unknown, isMain: boolean, options?: unknown) => string };
  const original = runtime._resolveFilename;
  const prefix = `/_${PROJECT}_/l1/${MODULE}/`;
  runtime._resolveFilename = function (this: unknown, request: string, parent: unknown, isMain: boolean, options?: unknown) {
    if (request.startsWith(prefix)) {
      const rel = request.slice(`/_${PROJECT}_/`.length).replace(/\.js$/, '.ts');
      const candidate = join(sandboxProject, rel);
      if (existsSync(candidate)) return candidate;
    }
    return original.call(this, request, parent, isMain, options);
  };
}

function observation(caseId: string, patch: Partial<M1Observation>): M1Observation {
  return {
    caseId,
    durationMs: patch.durationMs ?? 0,
    broken: patch.broken ?? 'none',
    thrown: patch.thrown ?? false,
    skipped: false,
    inconclusive: false,
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
  const imported = await import('/_102034_/l1/server/layer_2_controllers/contracts.js') as { AppError: new (...args: never[]) => Error & { code: string; statusCode: number } };
  if (error instanceof imported.AppError) return { ok: false, status: error.statusCode, errorCode: error.code, reason: error.message };
  return { thrown: true, ok: false, status: 500, errorCode: 'INTERNAL_ERROR', reason: error instanceof Error ? error.message : String(error) };
}

function fieldNames(data: unknown): string[] {
  if (Array.isArray(data)) return [...new Set(data.flatMap(item => fieldNames(item)))];
  if (!isRecord(data)) return [];
  const names = Object.keys(data);
  if (isRecord(data.details)) names.push(...Object.keys(data.details));
  return names;
}

function outputOf(ref: string): string { return ref.replace(/\.defs\.ts$/, '.ts'); }
function relOf(ref: string): string {
  const match = /^_\d+_\/(.+)$/.exec(outputOf(ref));
  if (!match) throw new Error(ref);
  return match[1];
}
async function readSandbox(sandboxProject: string, ref: string): Promise<string | null> {
  try {
    return await readFile(diskOf(sandboxProject, ref), 'utf8');
  } catch {
    return null;
  }
}
async function readDefinitionFile(sandboxProject: string, ref: string): Promise<M1Definition | null> {
  const text = await readSandbox(sandboxProject, ref);
  if (!text) return null;
  const parsed = parseDefinitionSource(text);
  if (!('definition' in parsed)) return null;
  const definition = readDefinition(parsed.definition);
  return 'issues' in definition ? null : definition;
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
function diskOf(sandboxProject: string, ref: string): string {
  const match = /^_\d+_\/(.+)$/.exec(ref);
  if (!match) throw new Error(ref);
  return join(sandboxProject, match[1]);
}
function spawn(command: string, args: readonly string[], input?: Buffer): SpawnResult & { stdoutRaw: Buffer } {
  const result = spawnSync(command, args, { input, cwd: REPO_ROOT, maxBuffer: 256 * 1024 * 1024 });
  const stdoutRaw = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? '');
  const stderrRaw = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr ?? '');
  return { code: result.status ?? 1, stdout: stdoutRaw.toString('utf8'), stderr: stderrRaw.toString('utf8'), argv: [command, ...args], stdoutRaw };
}
function porcelain(repo: string): string { return spawn('git', ['-C', repo, 'status', '--porcelain']).stdout; }
function isInside(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  if (rel === '') return true;
  if (isAbsolute(rel)) return false;
  return rel !== '..' && !rel.startsWith(`..${sep}`);
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
