/// <mls fileReference="_102021_/l1/agentMaterializeL1/proofC3.ts" enhancement="_blank"/>

/**
 * One command for the structural slice. Mounts a sandbox from v2 defs plus a
 * read-only archive of the client, runs simulate then structure, typechecks
 * create/list Consulta, and writes the checkpoint. Usecase observations call
 * the emitted function. Route observations call the real execBff, which turns
 * a thrown AppError into statusCode. The client repository is not written.
 * --inject edits those files and must come back failed, not expected-red.
 *
 *   tsx --import ./test/register-hooks.mjs mls-102021/l1/agentMaterializeL1/proofC3.ts --evidence <dir> --defs <dir> --repo <dir> [--inject broken-import|unexpected-500]
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isRecord, parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
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
const INJECT = ['broken-import', 'unexpected-500'] as const;
type InjectMode = '' | typeof INJECT[number];

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const CATALOG_FIXTURE = join(HERE, '../../l2/agentMaterializeL1/testing/catalogFixture.json');
const CREATE = `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/createConsulta.defs.ts`;
const LIST = `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/listConsulta.defs.ts`;
const PAGE_DEF = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${FLOW}.defs.ts`;
const SCOPE = `_${PROJECT}_/l1/${MODULE}/layer_2_application/scope/accessScope.defs.ts`;
const SCORED = [CREATE, LIST, PAGE_DEF];
const STUB_THROW = /throw new AppError\('USECASE_NOT_IMPLEMENTED', '[^']* is not implemented\.', 501\);/;
const SLICE = [
  `l1/${MODULE}/layer_1_external/adapters/http/controllers/${FLOW}.ts`,
  `l1/${MODULE}/layer_3_domain/entities/consulta.ts`,
  `l1/${MODULE}/layer_2_application/ports/consultaRepository.ts`,
  `l1/${MODULE}/layer_2_application/usecases/createConsulta.ts`,
  `l1/${MODULE}/layer_2_application/usecases/listConsulta.ts`,
];
const PROMOTED = [
  `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/consulta.defs.ts`,
  `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/consultaRepository.defs.ts`,
  CREATE,
  LIST,
  PAGE_DEF,
];

interface ProofArgs {
  evidence: string;
  defs: string;
  repo: string;
  inject: InjectMode;
}

interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
  argv: string[];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const problems: string[] = [];
  const evidence = resolve(args.evidence);
  const defs = resolve(args.defs);
  const repo = resolve(args.repo);
  if (isInside(evidence, repo) || evidence === repo) {
    throw new Error('Evidence directory must not be inside the client repository.');
  }
  const before = porcelain(repo);
  const sandboxParent = args.inject
    ? join(evidence, 'inject', args.inject, 'sandbox')
    : join(evidence, 'sandbox');
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
  const appEnvBefore = projectJson.appEnv;
  projectJson.appEnv = 'development';
  await writeFile(projectJsonPath, `${JSON.stringify(projectJson, null, 2)}\n`);
  const catalogRef = scenarioCatalogRef(PROJECT, MODULE);
  await writeCatalog(sandboxProject, catalogRef);
  await writeBffHome(join(evidence, 'bff-home'));

  const host = createDiskHost(sandboxParent, sandboxParent, PROJECT, REPO_ROOT);
  host.catalogRef = catalogRef;
  const beforeTree = await treeHash(sandboxProject);
  const simulate = materialize('simulate', '', sandboxParent);
  const afterTree = await treeHash(sandboxProject);
  if (simulate.code !== 0) problems.push(`simulate exit ${simulate.code}`);
  if (!simulate.stdout.includes('ended: SIMULATED')) problems.push('simulate did not end SIMULATED');
  if (!simulate.stdout.includes('llmCalls: 0')) problems.push('simulate called a model');
  if (!simulate.stdout.includes('wrote: no')) problems.push('simulate wrote');
  if (beforeTree !== afterTree) problems.push('simulate changed the sandbox');

  const structure = materialize('structure', FLOW, sandboxParent);
  const structureText = structure.stdout;
  if (structure.code !== 0) problems.push(`structure exit ${structure.code}`);
  for (const defPath of PROMOTED) {
    if (!structureText.includes(`PROMOTED ${defPath}`)) problems.push(`not promoted: ${defPath}`);
  }

  if (args.inject === 'broken-import') patchBrokenImport(sandboxProject);
  const patchProblems = args.inject === 'unexpected-500' ? patchStubThrow(sandboxProject) : [];
  const compileLog = compileSlice(sandboxProject);
  if (args.inject !== 'broken-import' && compileLog) problems.push('slice did not compile');

  const scored = await score(host, catalogRef, sandboxProject);
  problems.push(...scored.problems, ...patchProblems);
  if (args.inject) problems.push(...injectionProblems(args.inject, scored.checkpoints, compileLog));
  else problems.push(...cleanProblems(scored.checkpoints));

  const after = porcelain(repo);
  if (after !== before) problems.push('client repository status changed');

  const repoHead = spawn('git', ['-C', repo, 'rev-parse', 'HEAD']).stdout.trim();
  const baseHead = spawn('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD']).stdout.trim();
  const sliceHashes: Record<string, string> = {};
  for (const rel of SLICE) {
    const full = join(sandboxProject, rel);
    if (existsSync(full)) sliceHashes[rel] = sha256(await readFile(full));
  }
  const checkpoint = {
    schemaVersion: 'm1_05-proof',
    inject: args.inject || null,
    proofOk: problems.length === 0,
    problems,
    compile: compileLog ? 'failed' : 'clean',
    repoHead,
    baseHead,
    appEnvBefore,
    appEnv: 'development',
    repoStatusUnchanged: after === before,
    simulateWrote: beforeTree !== afterTree,
    checkpoints: scored.checkpoints,
    grantGap: scored.grantGap,
    sliceHashes,
  };
  const commands = [
    process.argv.join(' '),
    ...[simulate, structure].map(item => item.argv.join(' ')),
  ];
  await writeFile(join(outDir, 'commands.txt'), `${commands.join('\n')}\n`);
  await writeFile(join(outDir, 'simulate.log'), `${simulate.stdout}\n${simulate.stderr}`);
  await writeFile(join(outDir, 'structure.log'), `${structure.stdout}\n${structure.stderr}`);
  await writeFile(join(outDir, 'compile.log'), compileLog || 'clean\n');
  await writeFile(join(outDir, 'hashes.json'), `${JSON.stringify({ repoHead, baseHead, appEnvBefore, tree: afterTree, sliceHashes }, null, 2)}\n`);
  await writeFile(join(outDir, 'head.txt'), `${repoHead}\n`);
  await writeFile(join(outDir, 'checkpoint.json'), `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(join(outDir, 'repo-status.txt'), after);
  console.log(`proof: ${problems.length === 0 ? 'ok' : 'failed'}`);
  console.log(`inject: ${args.inject || 'none'}`);
  console.log(`compile: ${compileLog ? 'failed' : 'clean'}`);
  console.log(`checkpoint: ${join(outDir, 'checkpoint.json')}`);
  for (const problem of problems) console.log(`problem: ${problem}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

function parseArgs(argv: readonly string[]): ProofArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token.startsWith('--') || !value || value.startsWith('--')) {
      throw new Error(`Missing value for ${token}.`);
    }
    values.set(token, value);
    index += 1;
  }
  const evidence = values.get('--evidence') ?? '';
  const defs = values.get('--defs') ?? '';
  const repo = values.get('--repo') ?? '';
  const inject = values.get('--inject') ?? '';
  if (!evidence || !defs || !repo) throw new Error('Pass --evidence, --defs and --repo.');
  if (inject && !INJECT.includes(inject as typeof INJECT[number])) {
    throw new Error('Inject must be broken-import or unexpected-500.');
  }
  return { evidence, defs, repo, inject: inject as InjectMode };
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

async function score(
  host: ReturnType<typeof createDiskHost>,
  catalogRef: string,
  sandboxProject: string,
): Promise<{ problems: string[]; checkpoints: M1Checkpoint[]; grantGap: Record<string, unknown> }> {
  installRuntime(sandboxProject);
  const problems: string[] = [];
  const catalogText = await host.io.read(catalogRef);
  const parsed = parseCatalog(catalogText ?? '');
  if (!parsed.catalog) throw new Error(parsed.issues.join('; ') || 'catalog unreadable');
  const checkpoints: M1Checkpoint[] = [];
  for (const defPath of SCORED) {
    const definition = await loadDefinition(host, defPath);
    const scenario = parsed.catalog.scenarios.find(item => item.artifactId === definition.artifactId);
    if (!scenario) {
      problems.push(`${definition.artifactId} has no scenario`);
      continue;
    }
    const observations = await executeScenario(sandboxProject, definition, scenario.cases);
    checkpoints.push(await report(host, catalogRef, defPath, definition, observations));
  }
  const grantGap = await readGrantGap(sandboxProject);
  if (grantGap.code !== 'ACCESS_ANCHOR' || grantGap.grant) {
    problems.push(`grant gap was ${grantGap.code || 'a resolved grant'}, not ACCESS_ANCHOR`);
  }
  return { problems, checkpoints, grantGap: grantGap.record };
}

function cleanProblems(checkpoints: readonly M1Checkpoint[]): string[] {
  const create = checkpoints.find(item => item.evidence.some(row => row.caseId.startsWith('createConsulta.')));
  const list = checkpoints.find(item => item.evidence.some(row => row.caseId.startsWith('listConsulta.')));
  const page = checkpoints.find(item => item.evidence.some(row => row.caseId.startsWith(`${FLOW}.`)));
  return [
    ...(create ? expectStructure(create, 'createConsulta', true) : ['createConsulta checkpoint missing']),
    ...(list ? expectStructure(list, 'listConsulta', true) : ['listConsulta checkpoint missing']),
    ...(page ? expectStructure(page, FLOW, false) : [`${FLOW} checkpoint missing`]),
  ];
}

function injectionProblems(mode: InjectMode, checkpoints: readonly M1Checkpoint[], compileLog: string): string[] {
  const rows = checkpoints.flatMap(item => item.evidence);
  if (mode === 'broken-import') {
    const problems: string[] = [];
    if (!compileLog && rows.every(item => item.verdict !== 'failed')) problems.push('broken import was not detected');
    if (rows.length === 0 || rows.some(item => item.verdict !== 'failed')) problems.push('broken import verdict was not failed');
    if (checkpoints.some(item => item.counts.expectedRed !== 0)) problems.push('broken import was expected red');
    if (checkpoints.some(item => item.accepted)) problems.push('broken import was accepted');
    return problems;
  }
  const problems: string[] = [];
  const created = rows.find(item => item.caseId === 'createConsulta.creates');
  if (!created || created.verdict !== 'failed' || created.status !== 500) {
    problems.push(`unexpected 500 verdict was ${created?.verdict ?? 'missing'} status ${created?.status ?? 'missing'}`);
  }
  if (created?.verdict === 'expectedRed') problems.push('unexpected 500 was expected red');
  const business = rows.filter(item => !item.caseId.endsWith('.compile') && !item.caseId.startsWith(`${FLOW}.`));
  if (business.some(item => item.verdict !== 'failed' || item.status !== 500)) problems.push('a stub case did not return 500');
  const kept = rows.filter(item => item.caseId.endsWith('.compile') || item.caseId.startsWith(`${FLOW}.`));
  if (kept.length === 0 || kept.some(item => item.verdict !== 'passed')) problems.push('compile or controller case did not pass after the stub throw');
  if (checkpoints.filter(item => item.evidence.some(row => row.caseId.startsWith('createConsulta.') || row.caseId.startsWith('listConsulta.'))).some(item => item.accepted)) {
    problems.push('unexpected 500 was accepted');
  }
  return problems;
}

function expectStructure(report: M1Checkpoint, artifactId: string, businessRed: boolean): string[] {
  const problems: string[] = [];
  if (!report.accepted) problems.push(`${artifactId} checkpoint was not accepted: ${report.nextAction}`);
  if (report.counts.failed !== 0) problems.push(`${artifactId} has failed cases`);
  if (!businessRed) {
    if (report.evidence.some(item => item.verdict !== 'passed')) problems.push(`${artifactId} route or auth case did not pass`);
    return problems;
  }
  const compile = report.evidence.filter(item => item.caseId.endsWith('.compile'));
  const business = report.evidence.filter(item => !item.caseId.endsWith('.compile'));
  if (compile.length === 0 || compile.some(item => item.verdict !== 'passed')) problems.push(`${artifactId} compile gate did not pass`);
  if (business.length === 0 || business.some(item => item.verdict !== 'expectedRed')) problems.push(`${artifactId} business case was not expected red`);
  return problems;
}

function patchBrokenImport(sandboxProject: string): void {
  const line = `import { missing } from '/_${PROJECT}_/l1/${MODULE}/missing.js';\nvoid missing;`;
  for (const ref of SCORED) {
    const full = diskOf(sandboxProject, outputOf(ref));
    const source = readFileSync(full, 'utf8');
    if (!source.includes("from '/_" + PROJECT + `_/l1/${MODULE}/missing.js'`)) writeFileSync(full, `${source}\n${line}\n`);
  }
}

function patchStubThrow(sandboxProject: string): string[] {
  const problems: string[] = [];
  for (const ref of [CREATE, LIST]) {
    const full = diskOf(sandboxProject, outputOf(ref));
    const source = readFileSync(full, 'utf8');
    if (!STUB_THROW.test(source)) {
      problems.push(`${ref} stub throw was not replaced`);
      continue;
    }
    writeFileSync(full, source.replace(STUB_THROW, "throw new Error('x');"));
  }
  return problems;
}

interface SandboxModule {
  routes?: ExecutedRoute[];
  resolveGrant?: (grantId: string) => unknown;
  [key: string]: unknown;
}

interface ExecutedRoute {
  key: string;
  handler: BffHandler;
}

interface ThrownAppError extends Error {
  code: string;
  statusCode: number;
}

async function executeScenario(
  sandboxProject: string,
  definition: M1Definition,
  cases: readonly M1ScenarioCase[],
): Promise<M1Observation[]> {
  const loaded = await importSandbox(sandboxProject, outputOf(definitionPath(definition)));
  if ('error' in loaded) {
    return cases.map(item => observation(item.caseId, { broken: 'import', reason: loaded.error }));
  }
  const observations: M1Observation[] = [];
  for (const item of cases) {
    if (item.gate === 'compile') {
      observations.push(observation(item.caseId, { ok: true, status: 0, errorCode: null, reason: 'imported' }));
      continue;
    }
    const started = Date.now();
    try {
      observations.push(item.gate === 'business'
        ? await callUsecase(loaded.module, definition.artifactId, item, started)
        : await callRoute(loaded.module, definition, item, sandboxProject, started));
    } catch (error) {
      observations.push(observation(item.caseId, { ...unstructured(error), durationMs: Date.now() - started }));
    }
  }
  return observations;
}

async function callUsecase(module: SandboxModule, name: string, item: M1ScenarioCase, started: number): Promise<M1Observation> {
  const fn = module[name];
  if (typeof fn !== 'function') return observation(item.caseId, { reason: `${name} is not exported` });
  try {
    await (fn as (...args: unknown[]) => Promise<unknown>)({}, {}, {});
    return observation(item.caseId, { ok: true, status: 200, errorCode: null, durationMs: Date.now() - started, reason: 'returned' });
  } catch (error) {
    return observation(item.caseId, { ...await thrownOutcome(error), durationMs: Date.now() - started });
  }
}

async function callRoute(
  module: SandboxModule,
  definition: M1Definition,
  item: M1ScenarioCase,
  sandboxProject: string,
  started: number,
): Promise<M1Observation> {
  const route = module.routes?.find(entry => entry.key === item.routine);
  if (!route) return observation(item.caseId, { reason: `route ${item.routine} is not exported` });
  const scope = await importSandbox(sandboxProject, outputOf(SCOPE));
  const authorities = 'error' in scope || !scope.module.resolveGrant
    ? []
    : authoritiesFor(item, definition, scope.module.resolveGrant);
  proofRoutes.set(route.key, route.handler);
  await publishProofRoutes();
  try {
    const executed = await execBff({
      routine: item.routine,
      params: paramsFor(item),
      meta: { source: 'http', verifiedAuthorities: authorities },
    }, createRequestContext(undefined, { sandbox: true }));
    const durationMs = Date.now() - started;
    const response = executed.response;
    if (response.ok) {
      return observation(item.caseId, { ok: true, status: executed.statusCode, errorCode: null, durationMs, fields: fieldNames(response.data), reason: 'returned' });
    }
    return observation(item.caseId, {
      ok: false,
      status: executed.statusCode,
      errorCode: response.error?.code ?? null,
      durationMs,
      reason: response.error?.message ?? '',
    });
  } catch (error) {
    return observation(item.caseId, { ...await thrownOutcome(error), durationMs: Date.now() - started });
  }
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

/** The workspace config does not satisfy execBff, and this module declares no controller folder there. The proof reads a config from the evidence dir and preloads the router cache with the sandbox handlers. */
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

function authoritiesFor(item: M1ScenarioCase, definition: M1Definition, resolveGrant: (grantId: string) => unknown): string[] {
  if (item.actorId === '' || item.preconditions.some(entry => entry.includes('verifiedAuthorities is empty'))) return [];
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers : [];
  const handler = handlers.find(entry => isRecord(entry) && entry.route === item.routine);
  const grantIds = isRecord(handler) && Array.isArray(handler.grantIds)
    ? handler.grantIds.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const authorities: string[] = [];
  for (const grantId of grantIds) {
    const resolved = resolveGrant(grantId);
    if (!isRecord(resolved) || typeof resolved.grantId !== 'string' || typeof resolved.actorRef !== 'string' || !resolved.actorRef) continue;
    authorities.push(`${definition.moduleName}:${resolved.actorRef}`);
  }
  return authorities;
}

function paramsFor(item: M1ScenarioCase): Record<string, string> {
  const params: Record<string, string> = {};
  for (const entry of item.preconditions) {
    const match = /^([A-Za-z][A-Za-z0-9]*) omitted$/.exec(entry);
    if (match) delete params[match[1]];
  }
  return params;
}

async function readGrantGap(sandboxProject: string): Promise<{ code: string; grant: boolean; record: Record<string, unknown> }> {
  const loaded = await importSandbox(sandboxProject, outputOf(SCOPE));
  const resolved = 'error' in loaded ? null : loaded.module.resolveGrant?.('profissionalAgendaDiaria');
  const grant = isRecord(resolved) && typeof resolved.grantId === 'string';
  const code = isRecord(resolved) && typeof resolved.code === 'string' ? resolved.code : '';
  return {
    code,
    grant,
    record: { grantId: 'profissionalAgendaDiaria', pending: code, errorCode: code, reachedUsecase: false, positiveProof: false },
  };
}

async function thrownOutcome(error: unknown): Promise<Partial<M1Observation>> {
  const AppError = await appErrorType();
  if (error instanceof AppError) {
    return { ok: false, status: error.statusCode, errorCode: error.code, reason: error.message };
  }
  return unstructured(error);
}

function unstructured(error: unknown): Partial<M1Observation> {
  return {
    ok: false,
    status: 500,
    errorCode: 'INTERNAL_ERROR',
    reason: error instanceof Error ? error.message : String(error),
  };
}

let AppErrorRef: (new (...args: never[]) => ThrownAppError) | null = null;

async function appErrorType(): Promise<new (...args: never[]) => ThrownAppError> {
  if (!AppErrorRef) {
    const imported = await import('/_102034_/l1/server/layer_2_controllers/contracts.js') as { AppError: new (...args: never[]) => ThrownAppError };
    AppErrorRef = imported.AppError;
  }
  return AppErrorRef;
}

async function importSandbox(sandboxProject: string, ref: string): Promise<{ module: SandboxModule } | { error: string }> {
  try {
    const imported = await import(pathToFileURL(diskOf(sandboxProject, ref)).href) as SandboxModule;
    return { module: imported };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function observation(caseId: string, patch: Partial<M1Observation>): M1Observation {
  return {
    caseId,
    durationMs: patch.durationMs ?? 0,
    broken: patch.broken ?? 'none',
    thrown: patch.thrown ?? false,
    skipped: false,
    inconclusive: false,
    blocked: false,
    blockOwner: '',
    ok: patch.ok ?? false,
    status: patch.status ?? 0,
    errorCode: patch.errorCode ?? null,
    ruleId: patch.ruleId ?? null,
    fields: patch.fields ?? [],
    rowActorIds: patch.rowActorIds ?? [],
    reason: patch.reason ?? '',
  };
}

function fieldNames(data: unknown): string[] {
  if (Array.isArray(data)) return [...new Set(data.flatMap(item => fieldNames(item)))];
  if (!isRecord(data)) return [];
  return Object.keys(data);
}

let runtimeReady = false;

function installRuntime(sandboxProject: string): void {
  if (runtimeReady) return;
  runtimeReady = true;
  const runtime = Module as unknown as {
    _resolveFilename: (this: unknown, request: string, parent: unknown, isMain: boolean, options?: unknown) => string;
  };
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

function outputOf(ref: string): string {
  return ref.replace(/\.defs\.ts$/, '.ts');
}

function definitionPath(definition: M1Definition): string {
  const match = SCORED.find(ref => ref.endsWith(`/${definition.artifactId}.defs.ts`));
  if (!match) throw new Error(definition.artifactId);
  return match;
}

async function report(
  host: ReturnType<typeof createDiskHost>,
  catalogRef: string,
  defPath: string,
  definition: M1Definition,
  observations: readonly M1Observation[],
): Promise<M1Checkpoint> {
  const handler = handlerFor(definition.artifactType, 'structure');
  if (!handler) throw new Error(definition.artifactType);
  const now = new Date().toISOString();
  return verifyBatch({
    handler,
    io: host.io,
    catalogRef,
    artifactId: definition.artifactId,
    observations,
    runId: 'm1-05',
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

function compileSlice(sandboxProject: string): string {
  const config = join(REPO_ROOT, `.tsconfig.m1-05-${process.pid}.json`);
  try {
    const files = SLICE.map(rel => `./${relative(REPO_ROOT, join(sandboxProject, rel)).split(sep).join('/')}`);
    const base = readFileSync(join(REPO_ROOT, 'tsconfig.base.json'), 'utf8');
    const paths: Record<string, string[]> = {};
    for (const id of new Set([...base.matchAll(/\/_(\d+)_\//g)].map(match => match[1]))) {
      paths[`/_${id}_/*`] = [`./mls-${id}/*`];
    }
    const sandboxRel = relative(REPO_ROOT, sandboxProject).split(sep).join('/');
    paths[`/_${PROJECT}_/*`] = [`./${sandboxRel}/*`];
    writeFileSync(config, `${JSON.stringify({
      extends: './tsconfig.base.json',
      compilerOptions: { noEmit: true, paths },
      files: files.map(file => file),
    }, null, 2)}\n`);
    const tsc = join(REPO_ROOT, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '-p', config, '--pretty', 'false'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
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

function diskOf(sandboxProject: string, ref: string): string {
  const match = /^_\d+_\/(.+)$/.exec(ref);
  if (!match) throw new Error(ref);
  return join(sandboxProject, match[1]);
}

function spawn(command: string, args: readonly string[], input?: Buffer): SpawnResult & { stdoutRaw: Buffer } {
  const result = spawnSync(command, args, {
    input,
    cwd: REPO_ROOT,
    maxBuffer: 256 * 1024 * 1024,
  });
  const stdoutRaw = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? '');
  const stderrRaw = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr ?? '');
  return {
    code: result.status ?? 1,
    stdout: stdoutRaw.toString('utf8'),
    stderr: stderrRaw.toString('utf8'),
    argv: [command, ...args],
    stdoutRaw,
  };
}

function porcelain(repo: string): string {
  return spawn('git', ['-C', repo, 'status', '--porcelain']).stdout;
}

async function treeHash(dir: string): Promise<string> {
  const files: string[] = [];
  await walk(dir, file => { files.push(file); });
  files.sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(relative(dir, file).split(sep).join('/'));
    hash.update('\0');
    hash.update(await readFile(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function walk(dir: string, visit: (file: string) => void): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, visit);
    else visit(path);
  }
}

function sha256(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex');
}

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
