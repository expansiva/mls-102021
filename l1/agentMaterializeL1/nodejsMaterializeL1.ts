/// <mls fileReference="_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.ts" enhancement="_blank"/>

/**
 * Node entry. The run itself is the l2 module shared with Studio.
 * Tests pass a fake host. This file does not read a database URL.
 *
 *   tsx mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts --help
 *   tsx mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts --project <id> --module <lowerCamel> [--stage simulate|structure|implement|verify] [--flow <id>] [--resume] [--output <dir>] [--source-root <dir>]
 */

import { readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, receiptFolder, receiptPathFor, type MaterializationReceipt } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { MaterializeOwnedRemoval, MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { helpText, parseCliArgs } from '/_102021_/l2/agentMaterializeL1/run/command.js';
import { behaviorRunners } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { persistenceRunners } from '/_102021_/l2/agentMaterializeL1/handlers/persistence/runners.js';
import { structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
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
  const state: MaterializeStateStore = {
    async readReceipt(defPath: string): Promise<MaterializationReceipt | null> {
      const path = receiptPathFor(defPath);
      if (!path) return null;
      const text = await io.read(path);
      if (!text) return null;
      try {
        return JSON.parse(text) as MaterializationReceipt;
      } catch {
        return null;
      }
    },
    async writeReceipt(receipt: MaterializationReceipt): Promise<void> {
      const path = receiptPathFor(receipt.defPath);
      if (!path) throw new Error('Receipt path is empty.');
      await writeText(writeRoot, project, path, `${JSON.stringify(receipt)}\n`);
    },
    async readOwned(outputPath: string): Promise<Uint8Array | null> {
      const text = await io.read(outputPath);
      return text === null ? null : new TextEncoder().encode(text);
    },
    async writeOwned(outputPath: string, body: Uint8Array): Promise<void> {
      await writeText(writeRoot, project, outputPath, new TextDecoder().decode(body));
    },
    async removeOwned(owned: readonly string[], requested: readonly string[]): Promise<MaterializeOwnedRemoval> {
      const removed: string[] = [];
      const kept: string[] = [];
      for (const path of requested) {
        if (!owned.includes(path) || path.endsWith('/')) {
          kept.push(path);
          continue;
        }
        const full = mapOwnedPath(writeRoot, project, path);
        if (!full) {
          kept.push(path);
          continue;
        }
        try {
          await rm(full, { force: true });
          removed.push(path);
        } catch {
          kept.push(path);
        }
      }
      return { removed, kept };
    },
    async readRevision(defPath: string): Promise<string | null> {
      const receipt = await this.readReceipt(defPath);
      return receipt?.semanticHash ?? null;
    },
  };
  return { io, state, runners: { ...structureRunners, ...behaviorRunners, ...persistenceRunners } };
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
    platformRoot: sourceRoot ? repoRoot : null,
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

async function writeText(root: string, project: number, ref: string, body: string): Promise<void> {
  const full = mapOwnedPath(root, project, ref);
  if (!full) throw new Error(`Refused a write outside the module tree: ${ref}`);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, body, 'utf8');
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
  if (roots.platformRoot && parsed.moduleName) disk.catalogRef = scenarioCatalogRef(project, parsed.moduleName);
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
