/// <mls fileReference="_102021_/l1/agentMaterializeL1/proofC6prep.ts" enhancement="_blank"/>

/**
 * Prepares persistence. This is not C6 acceptance and it does not migrate a database.
 * The generated adapter runs on the in-memory table repository 102034 already exports.
 * A missing physical schema is one isolated case. A destructive plan step is a block.
 * --inject disable-unique removes the generated uniqueness check; the duplicate must
 * come back failed. --inject destructive asks the plan to remove a column.
 *
 *   tsx --import ./test/register-hooks.mjs mls-102021/l1/agentMaterializeL1/proofC6prep.ts --evidence <dir> --defs <dir> --repo <dir> [--inject disable-unique|destructive]
 */

import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { additivePlan, applyPlan, assertPhysicalSchema, withoutUniqueChecks, type PlannedTable } from '/_102021_/l2/agentMaterializeL1/handlers/persistence/emitPersistence.js';
import { parseCatalog, renderMonitorCatalog } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { scenarioCatalogRef } from '/_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.js';
import {
  createMemoryModuleDataRuntime,
  createMemoryTableRepository,
  type IModuleDataRuntime,
  type ITableRepository,
} from '/_102034_/l1/server/layer_1_external/data/moduleDataRuntime.js';
import { readAppEnv } from '/_102034_/l1/server/layer_1_external/config/env.js';
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { clearRepositories, hasRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';

const PROJECT = 102047;
const MODULE = 'agendaClinica';
const INJECT = ['disable-unique', 'destructive'] as const;
type InjectMode = '' | typeof INJECT[number];
type Row = Record<string, unknown>;

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const CATALOG_FIXTURE = join(HERE, '../../l2/agentMaterializeL1/testing/catalogFixture.json');
const ADAPTER = `l1/${MODULE}/layer_1_external/adapters/persistence/consultaRepositoryAdapter.ts`;
const TABLE = `l1/${MODULE}/layer_1_external/adapters/persistence/consulta.ts`;
const REGISTRATION = `l1/${MODULE}/layer_1_external/adapters/persistence/registerRepositories.ts`;
const RECEIPT = `l1/${MODULE}/materialization/agentMaterializeL1/layer_1_external/adapters/persistence/consulta.json`;

interface ProofArgs { evidence: string; defs: string; repo: string; inject: InjectMode }
interface SpawnResult { code: number; stdout: string; stderr: string; argv: string[] }
interface PortModule {
  bind: (runtime: IModuleDataRuntime) => {
    create(record: Row): Promise<Row>;
    list(filter: Row): Promise<Row[]>;
    transition(record: Row, transitionId: string): Promise<Row>;
  };
}
interface TableModule {
  tableDefinition: {
    tableName: string;
    primaryKey: string[];
    columns: Array<{ name: string; postgresType: string; nullable?: boolean; defaultSql?: string }>;
    indexes?: Array<{ name: string; columns: string[]; unique?: boolean }>;
  };
  migrationPlan: { applied: boolean; steps: Array<{ op: string }>; blocked: unknown[] };
}

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
  await writeCatalog(sandboxProject, scenarioCatalogRef(PROJECT, MODULE));

  const simulate = materialize('simulate', '', sandboxParent);
  const registration = materialize('structure', 'registerRepositories', sandboxParent);
  const seeds = materialize('structure', 'seeds', sandboxParent);
  if (simulate.code !== 0) problems.push(`simulate exit ${simulate.code}`);
  if (registration.code !== 0) problems.push(`structure registerRepositories exit ${registration.code}`);
  if (seeds.code !== 0) problems.push(`structure seeds exit ${seeds.code}`);
  if (!simulate.stdout.includes('llmCalls: 0')) problems.push('simulate called a model');
  if (!simulate.stdout.includes('MECHANISM_UNBOUND')) problems.push('outbound was not blocked');
  if (!registration.stdout.includes('PROMOTED') || !registration.stdout.includes('consultaRepositoryAdapter')) {
    problems.push('adapter was not promoted');
  }

  const adapterPath = join(sandboxProject, ADAPTER);
  if (args.inject === 'disable-unique') {
    const source = await readFile(adapterPath, 'utf8');
    const stripped = withoutUniqueChecks(source);
    if (stripped === source) problems.push('uniqueness check was not found to disable');
    await writeFile(adapterPath, stripped);
  }
  const slice = [
    `l1/${MODULE}/layer_3_domain/entities/consulta.ts`,
    `l1/${MODULE}/layer_2_application/ports/consultaRepository.ts`,
    TABLE,
    ADAPTER,
    REGISTRATION,
    `l1/${MODULE}/layer_1_external/adapters/persistence/seeds.ts`,
  ];
  const compileLog = compileSlice(sandboxProject, slice);
  if (compileLog) problems.push('slice did not compile');

  installRuntime(sandboxProject);
  const tableMod = await import(pathToFileURL(join(sandboxProject, TABLE)).href) as TableModule;
  const portMod = await import(pathToFileURL(join(sandboxProject, ADAPTER)).href) as PortModule;
  clearRepositories();
  await import(pathToFileURL(join(sandboxProject, REGISTRATION)).href);
  if (!hasRepository('ConsultaRepository')) problems.push('registration did not bind the port');

  const contract = await runContract(portMod);
  if (args.inject === 'disable-unique') {
    if (contract.duplicate !== 'failed') problems.push(`duplicate stayed ${contract.duplicate}; disabling uniqueness should fail the case`);
  } else if (contract.duplicate !== 'passed') problems.push(`duplicate ${contract.duplicate}`);
  if (contract.create !== 'passed') problems.push(`create ${contract.create}`);
  if (contract.details !== 'passed') problems.push(`details ${contract.details}`);
  if (contract.list !== 'passed') problems.push(`list ${contract.list}`);
  if (contract.update !== 'passed') problems.push(`update ${contract.update}`);
  if (contract.stale !== 'passed') problems.push(`stale version ${contract.stale}`);

  const planned = plannedFrom(tableMod.tableDefinition);
  const destructive = destructivePlan(planned);
  if (!destructive.blocked || destructive.dropped || !destructive.kept) problems.push('destructive step was not blocked');
  if (tableMod.migrationPlan.applied !== false) problems.push('emitted plan says the migration was applied');
  if (JSON.stringify(tableMod.migrationPlan.steps).includes('DROP')) problems.push('emitted plan contains DROP');
  const absent = assertPhysicalSchema(planned, null);
  if (absent.ok || !absent.isolated || absent.code !== 'PHYSICAL_SCHEMA_ABSENT') problems.push('absent schema was treated as success');

  const registry = await registryProbe();
  const receiptText = await readFile(join(sandboxProject, RECEIPT), 'utf8').catch(() => '');
  const receipt = receiptText ? JSON.parse(receiptText) as { verifications?: Array<{ id: string; kind: string; passed: boolean }> } : {};
  const fileRow = receipt.verifications?.find(item => item.id === 'tableFile');
  const migrationRow = receipt.verifications?.find(item => item.id === 'migration' && item.kind === 'schema');
  if (!fileRow?.passed) problems.push('receipt has no compiled-file row');
  if (!migrationRow || migrationRow.passed !== false) problems.push('receipt does not keep migration unapplied');

  const after = porcelain(repo);
  if (after !== before) problems.push('client repository status changed');
  const checkpoint = {
    schemaVersion: 'm1_07-proof',
    inject: args.inject || null,
    proofOk: problems.length === 0,
    problems,
    compile: compileLog ? 'failed' : 'clean',
    contract,
    destructive,
    physicalSchema: { isolated: true, passed: false, code: absent.code },
    registry,
    migrationApplied: false,
    repoStatusUnchanged: after === before,
  };
  await writeFile(join(outDir, 'commands.txt'), `${[process.argv.join(' '), simulate.argv.join(' '), registration.argv.join(' '), seeds.argv.join(' ')].join('\n')}\n`);
  await writeFile(join(outDir, 'structure.log'), `${registration.stdout}\n${registration.stderr}\n${seeds.stdout}\n${seeds.stderr}`);
  await writeFile(join(outDir, 'compile.log'), compileLog || 'clean\n');
  await writeFile(join(outDir, 'checkpoint.json'), `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(join(outDir, 'repo-status.txt'), after);
  console.log(`proof: ${problems.length === 0 ? 'ok' : 'failed'}`);
  console.log(`inject: ${args.inject || 'none'}`);
  console.log(`compile: ${compileLog ? 'failed' : 'clean'}`);
  console.log(`contract: create ${contract.create}; duplicate ${contract.duplicate}; details ${contract.details}; list ${contract.list}; update ${contract.update}; stale ${contract.stale}`);
  console.log(`destructive: ${destructive.blocked ? 'blocked' : 'not blocked'}`);
  console.log(`physicalSchema: isolated ${absent.code}`);
  console.log(`registry: ${registry.isolated ? `isolated ${registry.code}` : 'resolved'}`);
  for (const problem of problems) console.log(`problem: ${problem}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

async function runContract(portMod: PortModule): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const runtime = memoryRuntime(createMemoryTableRepository<Row>([]));
  const port = portMod.bind(runtime);
  const record: Row = {
    id: 'c1',
    patientId: 'p1',
    professionalId: 'd1',
    scheduledAt: '2026-09-25T12:00:00.000Z',
    status: 'scheduled',
    details: { attendanceNote: 'note' },
  };
  try {
    const created = await port.create(record);
    const details = created.details as Row | undefined;
    result.create = created.id === 'c1' && created.version === 1 ? 'passed' : 'failed';
    result.details = details?.attendanceNote === 'note' ? 'passed' : 'failed';
    const listed = await port.list({ professionalId: 'd1' });
    result.list = listed.length === 1 ? 'passed' : 'failed';
    try {
      await port.create({ ...record, id: 'c2' });
      result.duplicate = 'failed';
    } catch (error) {
      result.duplicate = error instanceof AppError && error.code === 'CONFLICT' && error.statusCode === 409 ? 'passed' : 'failed';
    }
    try {
      const updated = await port.transition({ ...created, status: 'confirmed' }, 'confirmarConsulta');
      result.update = updated.version === 2 && updated.status === 'confirmed' ? 'passed' : 'failed';
      try {
        await port.transition({ ...created, status: 'attended' }, 'registrarAtendimento');
        result.stale = 'failed';
      } catch (error) {
        result.stale = error instanceof AppError && error.code === 'CONCURRENCY_CONFLICT' && error.statusCode === 409 ? 'passed' : 'failed';
      }
    } catch (error) {
      result.update = error instanceof Error ? error.message : 'failed';
      result.stale = 'failed';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed';
    result.create = result.create ?? message;
    result.details = result.details ?? 'failed';
    result.list = result.list ?? 'failed';
    result.duplicate = result.duplicate ?? 'failed';
    result.update = result.update ?? 'failed';
    result.stale = result.stale ?? 'failed';
  }
  return result;
}

function memoryRuntime(store: ReturnType<typeof createMemoryTableRepository<Row>>): IModuleDataRuntime {
  const runtime: IModuleDataRuntime = {
    async getTable<TRecord extends object>(_repositoryName: string): Promise<ITableRepository<TRecord>> {
      return store as unknown as ITableRepository<TRecord>;
    },
    async listTables() { return []; },
    runInTransaction(callback) { return callback(runtime); },
  };
  return runtime;
}

function plannedFrom(definition: TableModule['tableDefinition']): PlannedTable {
  return {
    tableName: definition.tableName,
    primaryKey: [...definition.primaryKey],
    columns: definition.columns.map(column => ({
      name: column.name,
      postgresType: column.postgresType,
      nullable: column.nullable === true,
      defaultSql: column.defaultSql ?? null,
    })),
    indexes: (definition.indexes ?? []).map(index => ({
      name: index.name,
      columns: [...index.columns],
      unique: index.unique === true,
    })),
  };
}

function destructivePlan(planned: PlannedTable): { blocked: boolean; dropped: boolean; kept: boolean } {
  const wider: PlannedTable = {
    ...planned,
    columns: [...planned.columns, { name: 'gone', postgresType: 'TEXT', nullable: true, defaultSql: null }],
  };
  const plan = additivePlan([planned], [wider]);
  const applied = applyPlan([wider], plan, [planned]);
  return {
    blocked: plan.blocked.some(step => step.op === 'removeColumn' && step.reason === 'DESTRUCTIVE_OUT_OF_SCOPE'),
    dropped: JSON.stringify(plan.steps).includes('DROP'),
    kept: applied.ok === false && applied.tables[0]?.columns.some(column => column.name === 'gone') === true,
  };
}

async function registryProbe(): Promise<{ isolated: boolean; code: string; detail: string }> {
  try {
    const runtime = createMemoryModuleDataRuntime(readAppEnv());
    await runtime.getTable('consulta');
    return { isolated: false, code: '', detail: '' };
  } catch (error) {
    const code = error instanceof AppError ? error.code : 'LOCAL_REGISTRY_ABSENT';
    return { isolated: true, code, detail: error instanceof Error ? error.message : String(error) };
  }
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
  const config = join(REPO_ROOT, `.tsconfig.m1-07-${process.pid}.json`);
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
  if (inject && !INJECT.includes(inject as typeof INJECT[number])) throw new Error('Inject must be disable-unique or destructive.');
  return { evidence, defs, repo, inject: inject as InjectMode };
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
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
