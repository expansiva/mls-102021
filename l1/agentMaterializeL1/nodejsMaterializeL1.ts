/// <mls fileReference="_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.ts" enhancement="_blank"/>

/**
 * Node entry. The run itself is the l2 module shared with Studio.
 * Tests pass a fake host. This file does not read a database URL.
 *
 *   tsx mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts --help
 *   tsx mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts --project <id> --module <lowerCamel> [--stage simulate|structure|implement|verify] [--flow <id>] [--resume] [--output <dir>] [--source-root <dir>]
 */

import { readFile, readdir, writeFile, mkdir, rm, rename } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, receiptFolder } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { createLocalBindings } from '/_102021_/l1/agentMaterializeL1/localState.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { helpText, parseCliArgs } from '/_102021_/l2/agentMaterializeL1/run/command.js';
import { behaviorRunners } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { persistenceRunners } from '/_102021_/l2/agentMaterializeL1/handlers/persistence/runners.js';
import { structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import { projectLockRef } from '/_102021_/l2/agentMaterializeL1/register/reconcileL5.js';
import { runMaterialize, type MaterializeRunHost, type MaterializeRunResult } from '/_102021_/l2/agentMaterializeL1/run/execute.js';

export interface CliHooks {
  host: MaterializeRunHost;
  readProfile: (project: number) => Promise<{ mode: unknown; declared: boolean }>;
  loadUnits: (project: number, moduleName: string) => Promise<PlanUnitInput[]>;
}

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  result: MaterializeRunResult | null;
}

export async function executeCli(argv: readonly string[], hooks: CliHooks): Promise<CliResult> {
  const command = parseCliArgs(argv);
  if (command.refusal) return { exitCode: 2, stdout: '', stderr: command.refusal, result: null };
  if (command.help) return { exitCode: 0, stdout: helpText(command.project), stderr: '', result: null };
  const [profile, units] = await Promise.all([
    hooks.readProfile(command.project),
    hooks.loadUnits(command.project, command.moduleName),
  ]);
  const result = await runMaterialize({
    project: command.project,
    moduleName: command.moduleName,
    stage: command.stage,
    flow: command.flow,
    resume: command.resume,
    units,
    profileMode: profile.mode,
    profileDeclared: profile.declared,
    budget: command.budget,
  }, hooks.host);
  return { exitCode: 0, stdout: renderResult(result), stderr: '', result };
}

export function renderResult(result: MaterializeRunResult): string {
  const lines = [
    `ended: ${result.ended}`,
    `stage: ${result.stage}`,
    `llmCalls: ${result.llmCalls}`,
    `wrote: ${result.wrote ? 'yes' : 'no'}`,
    `profile: ${result.profile.mode}`,
    `databaseEnv: ${result.profile.databaseEnv}`,
    `workers: ${result.budget.maxWorkers}`,
    `timeoutMs: ${result.budget.timeoutMs}`,
    `callsPerRun: ${result.budget.callsPerRun}`,
    `repairsPerRun: ${result.budget.repairsPerRun}`,
  ];
  for (const unit of result.units) lines.push(unit.detail ? `${unit.code} ${unit.defPath} ${unit.detail}` : `${unit.code} ${unit.defPath}`);
  if (result.catalog) {
    lines.push(`catalog: ${result.catalog.action} ${result.catalog.ref}`);
    lines.push(`catalogHash: ${result.catalog.inputHash}`);
    lines.push(`catalogRecipe: ${result.catalog.recipeVersion}`);
    lines.push(`catalogDetail: ${result.catalog.detail}`);
    for (const gap of result.catalog.gaps) lines.push(`gap: ${gap.artifactId} ${gap.origin} ${gap.reason}`);
  }
  if (result.registration) {
    lines.push(`registration: ${result.registration.action}`);
    if (result.registration.detail) lines.push(result.registration.detail);
    for (const item of result.registration.pendings) lines.push(`registrationPending: ${item.reason} ${item.origin}`);
  }
  return lines.join('\n');
}

/** Platform projects stay on the repository root when a sandbox is the read root. */
export const PLATFORM_PROJECTS = new Set(['102034', '102027']);

/** Qualified `_NNNNN_/lN/...` or a receipt `l1/<module>/...` under one project. `..` is refused. */
export function mapOwnedPath(root: string, project: number, ref: string, also: ReadonlySet<string> | null = null): string | null {
  if (!ref || ref.includes('..') || ref.includes('\\') || ref.startsWith('/') || ref.includes('DATABASE_URL')) return null;
  if (/^(postgres|postgresql|mysql|mongodb):\/\//i.test(ref)) return null;
  const qualified = /^_(\d+)_\/(l[1-7]\/.+)$/.exec(ref);
  const local = /^(l[1-7]\/.+)$/.exec(ref);
  const projectId = qualified ? qualified[1] : String(project);
  const rest = qualified ? qualified[2] : local ? local[1] : '';
  if (!rest || (projectId !== String(project) && !also?.has(projectId))) return null;
  const parts = rest.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) return null;
  const full = resolve(root, `mls-${projectId}`, ...parts);
  const base = resolve(root, `mls-${projectId}`);
  const rel = relative(base, full);
  if (!rel || rel.startsWith('..') || rel.split(sep).includes('..')) return null;
  return full;
}

export function createDiskHost(
  readRoot: string,
  writeRoot: string,
  project: number,
  platformRoot: string | null = null,
): MaterializeRunHost {
  const io: MaterializeReadIo = {
    async read(ref: string): Promise<string | null> {
      if (platformRoot && isPlatformRef(ref)) {
        const platform = mapOwnedPath(platformRoot, project, ref, PLATFORM_PROJECTS);
        return platform ? readText(platform) : null;
      }
      const written = mapOwnedPath(writeRoot, project, ref);
      const source = mapOwnedPath(readRoot, project, ref);
      for (const path of [written, source]) {
        if (!path) continue;
        const text = await readText(path);
        if (text !== null) return text;
      }
      return null;
    },
  };
  const files = {
    read: (ref: string) => io.read(ref),
    write: (ref: string, body: string) => writeText(writeRoot, project, ref, body),
    remove: (ref: string) => removeOwnedFile(writeRoot, project, ref),
    createExclusive: (ref: string, body: string) => createExclusive(writeRoot, project, ref, body),
  };
  const local = createLocalBindings(io, files);
  return {
    io,
    state: local.state,
    runners: { ...structureRunners, ...behaviorRunners, ...persistenceRunners },
    writer: local.writer,
    onBoundary: local.onBoundary,
    l5: {
      claim: (projectId, holder) => files.createExclusive(projectLockRef(projectId), `${JSON.stringify({ holder })}\n`),
      release: async (projectId, holder) => {
        const text = await files.read(projectLockRef(projectId));
        let record: { holder?: unknown } | null = null;
        try {
          record = text ? JSON.parse(text) as { holder?: unknown } : null;
        } catch {
          record = null;
        }
        if (!record || record.holder !== holder) return;
        await files.remove(projectLockRef(projectId));
      },
      read: ref => files.read(ref),
      compareAndSwap: (ref, expected, next) => compareAndSwap(writeRoot, project, ref, expected, next, files.read),
    },
  };
}

export async function readProjectProfile(readRoot: string, project: number): Promise<{ mode: unknown; declared: boolean }> {
  const path = join(readRoot, `mls-${project}`, 'l5', 'project.json');
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as { appEnv?: unknown };
    if (typeof parsed.appEnv === 'string' && parsed.appEnv) return { mode: parsed.appEnv, declared: true };
    return { mode: undefined, declared: false };
  } catch {
    return { mode: undefined, declared: false };
  }
}

export async function loadDefUnits(readRoot: string, project: number, moduleName: string): Promise<PlanUnitInput[]> {
  const dir = join(readRoot, `mls-${project}`, 'l1', moduleName);
  const found: PlanUnitInput[] = [];
  await walk(dir, async file => {
    if (!file.endsWith('.defs.ts')) return;
    const text = await readFile(file, 'utf8');
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) return;
    const rel = relative(join(readRoot, `mls-${project}`), file).split(sep).join('/');
    found.push({ defPath: `_${project}_/${rel}`, definition: parsed.definition });
  });
  found.sort((left, right) => left.defPath < right.defPath ? -1 : left.defPath > right.defPath ? 1 : 0);
  return found;
}

export function scenarioCatalogRef(project: number, moduleName: string): string {
  return `_${project}_/${receiptFolder(moduleName)}/scenarioCatalog.ts`;
}

/** `--output` relocates writes. `--source-root` relocates reads of this project. Platform stays on `repoRoot`. */
export function resolveRunRoots(repoRoot: string, outputDir: string, sourceRoot: string): {
  readRoot: string;
  writeRoot: string;
  platformRoot: string | null;
} {
  return {
    readRoot: sourceRoot ? resolve(sourceRoot) : repoRoot,
    writeRoot: outputDir ? resolve(outputDir) : repoRoot,
    platformRoot: repoRoot,
  };
}

function isPlatformRef(ref: string): boolean {
  const match = /^_(\d+)_\/l[1-7]\//.exec(ref);
  return !!match && PLATFORM_PROJECTS.has(match[1]);
}

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'EISDIR' || code === 'ENOTDIR') return null;
    throw error;
  }
}

async function compareAndSwap(
  root: string,
  project: number,
  ref: string,
  expected: string | null,
  next: string,
  read: (ref: string) => Promise<string | null>,
): Promise<'ok' | 'conflict'> {
  if (await read(ref) !== expected) return 'conflict';
  const full = mapOwnedPath(root, project, ref);
  if (!full) return 'conflict';
  await mkdir(dirname(full), { recursive: true });
  const temporary = `${full}.${process.pid}.tmp`;
  await writeFile(temporary, next, 'utf8');
  await rename(temporary, full);
  return 'ok';
}

async function writeText(root: string, project: number, ref: string, body: string): Promise<void> {
  const full = mapOwnedPath(root, project, ref);
  if (!full) throw new Error(`Refused a write outside the module tree: ${ref}`);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, body, 'utf8');
}

async function removeOwnedFile(root: string, project: number, ref: string): Promise<boolean> {
  const full = mapOwnedPath(root, project, ref);
  if (!full) return false;
  try {
    await rm(full, { force: true });
    return true;
  } catch {
    return false;
  }
}

async function createExclusive(root: string, project: number, ref: string, body: string): Promise<boolean> {
  const full = mapOwnedPath(root, project, ref);
  if (!full) return false;
  await mkdir(dirname(full), { recursive: true });
  try {
    await writeFile(full, body, { encoding: 'utf8', flag: 'wx' });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}

async function walk(dir: string, visit: (file: string) => Promise<void>): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, visit);
    else await visit(path);
  }
}

async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const parsed = parseCliArgs(process.argv.slice(2));
  const project = parsed.project;
  const roots = resolveRunRoots(root, parsed.outputDir, parsed.sourceRoot);
  const disk = createDiskHost(roots.readRoot, roots.writeRoot, project, roots.platformRoot);
  if (parsed.moduleName) disk.catalogRef = scenarioCatalogRef(project, parsed.moduleName);
  const outcome = await executeCli(process.argv.slice(2), {
    host: disk,
    readProfile: readProjectProfile.bind(null, roots.readRoot),
    loadUnits: (id, moduleName) => loadDefUnits(roots.readRoot, id, moduleName),
  });
  if (outcome.stdout) console.log(outcome.stdout);
  if (outcome.stderr) console.error(outcome.stderr);
  process.exit(outcome.exitCode);
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
if (invoked && invoked === fileURLToPath(import.meta.url)) void main();
