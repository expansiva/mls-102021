/// <mls fileReference="_102021_/l1/agentMaterializeL1/proofC7prep.ts" enhancement="_blank"/>

/**
 * Maintenance proof. Not C7 acceptance. Each --inject mode changes the sandbox
 * and runs the materializer again. An intact second run makes no model call
 * and rewrites no output bytes.
 *
 *   tsx --import ./test/register-hooks.mjs mls-102021/l1/agentMaterializeL1/proofC7prep.ts --evidence <dir> --repo <dir> [--inject <mode>]
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  M1_DEFINITION_SCHEMA,
  outputPathFromDefPath,
  parseDefinitionSource,
  readDefinition,
  receiptPathFor,
  renderDefinition,
  semanticHash,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { hashesAgree, sourceIdentityHash } from '/_102021_/l2/agentDefsL1/helpers/d1Identity.js';
import { scenarioCatalogRef } from '/_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.js';
import { ledgerPath } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import { M1_WRITER_SCHEMA, replaceStatus, writerRef } from '/_102021_/l2/agentMaterializeL1/state/maintain.js';

const PROJECT = 102047;
const MODULE = 'maintainProbe';
const INJECT = [
  'missing-ts',
  'external-edit',
  'contract',
  'recipe',
  'crash-staging',
  'crash-output',
  'crash-receipt',
  'crash-status',
  'source-during-call',
  'adulterated',
  'remove',
  'rename',
  'writer',
  'failed-resume',
  'blocked-release',
  'status-only',
  'test-only',
] as const;
type InjectMode = '' | typeof INJECT[number];

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const IDS = ['alpha', 'beta', 'gamma'] as const;

interface ProofArgs { evidence: string; repo: string; inject: InjectMode }
interface SpawnResult { code: number; stdout: string; stderr: string; argv: string[] }

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const problems: string[] = [];
  const evidence = resolve(args.evidence);
  const repo = resolve(args.repo);
  const before = porcelain(repo);
  const sandboxParent = args.inject ? join(evidence, 'inject', args.inject, 'sandbox') : join(evidence, 'sandbox');
  const outDir = args.inject ? join(evidence, 'inject', args.inject) : evidence;
  const sandboxProject = join(sandboxParent, `mls-${PROJECT}`);
  await rm(sandboxParent, { recursive: true, force: true });
  await mkdir(sandboxProject, { recursive: true });
  await mkdir(outDir, { recursive: true });
  await writeSandbox(sandboxProject);

  const crash = args.inject.startsWith('crash-');
  const logs: string[] = [];
  let first: SpawnResult | null = null;
  if (!crash) {
    first = materialize(sandboxParent, {});
    logs.push(first.stdout, first.stderr);
    if (first.code !== 0) problems.push(`first exit ${first.code}`);
    if (!first.stdout.includes('llmCalls: 0')) problems.push('first run called a model');
    for (const id of IDS) {
      if (!first.stdout.includes(`PROMOTED ${defRef(id)}`)) problems.push(`${id} was not promoted`);
      if (!existsSync(abs(sandboxProject, outputRef(id)))) problems.push(`${id} output is missing`);
    }
    const seam = await d1Seam(sandboxProject);
    if (!seam) problems.push('status update looked like a new D1 snapshot, or generated was restored');
  }

  const beforeHashes = await hashOutputs(sandboxProject);
  const manual = `l1/${MODULE}/manualNote.ts`;
  if (args.inject === 'remove' || args.inject === 'rename') {
    await writeFile(abs(sandboxProject, manual), 'manual\n');
  }
  const touched = await applyInject(args.inject, sandboxProject, sandboxParent);
  const secondEnv = envFor(args.inject);
  const second = materialize(sandboxParent, secondEnv);
  logs.push(second.stdout, second.stderr);
  const afterHashes = await hashOutputs(sandboxProject);

  if (crash) {
    problems.push(...crashProblems(args.inject, second, sandboxProject));
  } else if (args.inject === '') {
    problems.push(...intactProblems(second, beforeHashes, afterHashes));
  } else {
    problems.push(...injectProblems(args.inject, second, sandboxProject, beforeHashes, afterHashes, touched));
  }

  const after = porcelain(repo);
  if (after !== before) problems.push('client repository status changed');
  const checkpoint = {
    schemaVersion: 'm1_08-proof',
    inject: args.inject || null,
    negative: args.inject === 'adulterated',
    proofOk: problems.length === 0,
    problems,
    exitCode: second.code,
    llmCalls: readField(second.stdout, 'llmCalls'),
    wrote: readField(second.stdout, 'wrote'),
    repoStatusUnchanged: after === before,
  };
  const commands = [first?.argv.join(' '), second.argv.join(' ')].filter(Boolean).join('\n');
  await writeFile(join(outDir, 'commands.txt'), `${process.argv.join(' ')}\n${commands}\n`);
  await writeFile(join(outDir, 'run.log'), logs.join('\n'));
  await writeFile(join(outDir, 'checkpoint.json'), `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(join(outDir, 'repo-status.txt'), after);
  console.log(`proof: ${problems.length === 0 ? 'ok' : 'failed'}`);
  console.log(`inject: ${args.inject || 'none'}`);
  console.log(`exit: ${second.code}`);
  console.log(`llmCalls: ${checkpoint.llmCalls}`);
  console.log(`wrote: ${checkpoint.wrote}`);
  for (const problem of problems) console.log(`problem: ${problem}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

function intactProblems(second: SpawnResult, before: Record<string, string>, after: Record<string, string>): string[] {
  const problems: string[] = [];
  if (second.code !== 0) problems.push(`replay exit ${second.code}`);
  if (!second.stdout.includes('llmCalls: 0')) problems.push('replay called a model');
  if (!second.stdout.includes('wrote: no')) problems.push('replay rewrote');
  for (const id of IDS) {
    if (!second.stdout.includes(`REUSE ${defRef(id)}`)) problems.push(`${id} was not reused`);
    if (before[id] !== after[id]) problems.push(`${id} bytes changed`);
  }
  return problems;
}

function crashProblems(mode: InjectMode, result: SpawnResult, project: string): string[] {
  const problems: string[] = [];
  if (result.code === 0) problems.push('crash run exited 0');
  if (!result.stderr.includes('M1_CRASH_AFTER') && !result.stdout.includes('M1_CRASH_AFTER')) {
    problems.push('crash seam did not fire');
  }
  const output = abs(project, outputRef('alpha'));
  const def = abs(project, relativeDef('alpha'));
  const receipt = abs(project, receiptPathFor(defRef('alpha')));
  const outputExists = existsSync(output);
  const generated = existsSync(def) && readStatus(def) === 'generated';
  if (generated && !outputExists) problems.push('generated without an output');
  if (mode === 'crash-staging' && outputExists) problems.push('staging crash wrote the output');
  if (mode === 'crash-staging' && generated) problems.push('staging crash wrote generated');
  if (mode === 'crash-output' && !outputExists) problems.push('output crash lost the file');
  if (mode === 'crash-output' && generated) problems.push('output crash wrote generated');
  if (mode === 'crash-receipt' && !existsSync(receipt)) problems.push('receipt crash lost the receipt');
  if (mode === 'crash-receipt' && generated) problems.push('receipt crash wrote generated');
  if (mode === 'crash-status' && !generated) problems.push('status boundary did not write generated');
  if (mode === 'crash-status' && !outputExists) problems.push('status boundary has no output');
  return problems;
}

function injectProblems(
  mode: InjectMode,
  second: SpawnResult,
  project: string,
  before: Record<string, string>,
  after: Record<string, string>,
  touched: string,
): string[] {
  const problems: string[] = [];
  if (!second.stdout.includes('llmCalls: 0')) problems.push('inject run called a model');
  const line = (id: string) => second.stdout.split('\n').find(item => item.includes(defRef(id))) ?? '';
  if (mode === 'missing-ts') {
    if (!existsSync(abs(project, outputRef('gamma')))) problems.push('missing output was not restored');
    if (line('gamma').startsWith('REUSE')) problems.push('missing output was skipped');
    if (before.alpha !== after.alpha || before.beta !== after.beta) problems.push('unrelated output changed');
  }
  if (mode === 'external-edit') {
    const text = existsSync(abs(project, outputRef('gamma'))) ? readSync(abs(project, outputRef('gamma'))) : '';
    if (!text.includes('/* hand */')) problems.push('hand edit was overwritten');
    if (!line('gamma').includes('OUTPUT_DRIFT') && !line('gamma').includes('LOCAL_EDIT')) problems.push(`gamma ${line('gamma')}`);
    if (before.alpha !== after.alpha || before.beta !== after.beta) problems.push('unrelated output changed');
  }
  if (mode === 'contract' || mode === 'source-during-call') {
    if (mode === 'contract') {
      if (line('alpha').startsWith('REUSE')) problems.push('changed def was reused');
      if (line('beta').startsWith('REUSE')) problems.push('dependent was reused');
    }
    if (mode === 'source-during-call') {
      if (!line('alpha').includes('SNAPSHOT_CHANGED')) problems.push(`alpha ${line('alpha')}`);
      if (before.alpha !== after.alpha) problems.push('output was overwritten while the source changed');
    }
    if (before.gamma !== after.gamma) problems.push('unrelated output changed');
  }
  if (mode === 'recipe') {
    if (line('gamma').startsWith('REUSE')) problems.push('stale recipe was reused');
    if (before.alpha !== after.alpha || before.beta !== after.beta) problems.push('unrelated output changed');
  }
  if (mode === 'adulterated') {
    if (line('gamma').startsWith('REUSE')) problems.push('adulterated generated was skipped');
  }
  if (mode === 'status-only') {
    if (line('alpha').startsWith('REUSE')) problems.push('pending did not force work');
    if (!line('beta').startsWith('REUSE') || !line('gamma').startsWith('REUSE')) problems.push('status change cascaded');
    if (before.beta !== after.beta || before.gamma !== after.gamma) problems.push('unrelated output changed');
  }
  if (mode === 'test-only') {
    if (!line('gamma').includes('VERIFIED')) problems.push(`gamma ${line('gamma')}`);
    if (before.gamma !== after.gamma) problems.push('test change rewrote the output');
    if (before.alpha !== after.alpha) problems.push('unrelated output changed');
  }
  if (mode === 'writer') {
    if (!second.stdout.includes('WRITER_BUSY')) problems.push('second writer was not refused');
    if (!second.stdout.includes('wrote: no')) problems.push('busy writer wrote');
    for (const id of IDS) if (before[id] !== after[id]) problems.push(`${id} changed while busy`);
  }
  if (mode === 'failed-resume') {
    if (!line('gamma').includes('STATUS_FAILED') && !second.stdout.includes('budget was not reset')) {
      problems.push(`gamma ${line('gamma')}`);
    }
    if (before.gamma !== after.gamma) problems.push('failed resume rewrote the output');
    const ledger = readJson(abs(project, ledgerPath(MODULE))) as { repairs?: number; calls?: number } | null;
    if (!ledger || ledger.repairs !== 2 || ledger.calls !== 3) problems.push(`budget became ${ledger?.repairs}/${ledger?.calls}`);
  }
  if (mode === 'blocked-release') {
    if (!touched.includes('released')) problems.push('blocked unit was not released');
    if (line('alpha').includes('MISSING_REF') || line('alpha').includes('STATUS_BLOCKED')) {
      problems.push(`alpha stayed blocked: ${line('alpha')}`);
    }
    if (before.gamma !== after.gamma) problems.push('unrelated output changed');
  }
  if (mode === 'remove' || mode === 'rename') {
    const manualPath = abs(project, `l1/${MODULE}/manualNote.ts`);
    if (readSync(manualPath) !== 'manual\n') problems.push('manual file was removed');
    if (existsSync(abs(project, outputRef('alpha')))) problems.push('owned output of the removed def is still there');
    if (before.gamma !== after.gamma) problems.push('unrelated output changed');
    if (!existsSync(dirname(abs(project, outputRef('beta'))))) problems.push('directory was removed');
    if (mode === 'rename' && !existsSync(abs(project, outputRef('renamed')))) problems.push('renamed def produced no output');
  }
  return problems;
}

async function applyInject(mode: InjectMode, project: string, sandboxParent: string): Promise<string> {
  if (mode === 'missing-ts') await rm(abs(project, outputRef('gamma')), { force: true });
  if (mode === 'external-edit') await append(abs(project, outputRef('gamma')), '/* hand */\n');
  if (mode === 'contract' || mode === 'source-during-call') await patchData(project, 'alpha', 'alpha2');
  if (mode === 'recipe') await patchReceipt(project, 'gamma', receipt => { receipt.recipeVersion = 'stale-recipe'; });
  if (mode === 'adulterated') await rm(abs(project, receiptPathFor(defRef('gamma'))), { force: true });
  if (mode === 'status-only') await patchStatus(project, 'alpha', 'pending');
  if (mode === 'test-only') await append(abs(project, testRef('gamma')), '/* case */\n');
  if (mode === 'writer') {
    const ref = writerRef(MODULE);
    await mkdir(dirname(abs(project, ref)), { recursive: true });
    await writeFile(abs(project, ref), `${JSON.stringify({ schemaVersion: M1_WRITER_SCHEMA, moduleName: MODULE, holder: 'other' })}\n`);
  }
  if (mode === 'failed-resume') {
    await patchStatus(project, 'gamma', 'failed');
    await patchReceipt(project, 'gamma', receipt => {
      receipt.failures = [{ code: 'COMPILE', detail: 'still broken' }];
      receipt.reason = 'COMPILE: still broken';
    });
    const ledgerFile = abs(project, ledgerPath(MODULE));
    const ledger = readJson(ledgerFile) as { repairs: number; calls: number };
    ledger.repairs = 2;
    ledger.calls = 3;
    await writeFile(ledgerFile, `${JSON.stringify(ledger)}\n`);
  }
  if (mode === 'remove') await rm(abs(project, relativeDef('alpha')), { force: true });
  if (mode === 'rename') await renameDef(project);
  if (mode === 'blocked-release') return blockedRelease(project, sandboxParent);
  return '';
}

async function blockedRelease(project: string, sandboxParent: string): Promise<string> {
  const missing = `_102047_/l2/${MODULE}/source.ts`;
  const defFile = abs(project, relativeDef('alpha'));
  const parsed = parseDefinitionSource(await readFile(defFile, 'utf8'));
  if (!('definition' in parsed)) return 'unreadable';
  const definition = readDefinition(parsed.definition);
  if ('issues' in definition) return 'invalid';
  definition.dependencies = [...definition.dependencies, missing].sort();
  definition.status = 'blocked';
  const rendered = renderDefinition(definition, defRef('alpha'));
  if (!('source' in rendered)) return 'render';
  await writeFile(defFile, rendered.source);
  const hash = await semanticHash(definition);
  await patchReceipt(project, 'alpha', receipt => {
    receipt.semanticHash = hash;
    receipt.reason = `MISSING_REF: ${missing}`;
    receipt.failures = [];
    receipt.stage = 'plan';
  });
  const held = materialize(sandboxParent, {});
  if (!held.stdout.includes('MISSING_REF') && !held.stdout.includes('STATUS_BLOCKED')) return `held ${held.stdout}`;
  await mkdir(dirname(abs(project, `l2/${MODULE}/source.ts`)), { recursive: true });
  await writeFile(abs(project, `l2/${MODULE}/source.ts`), 'export const source = 1;\n');
  return 'released';
}

async function renameDef(project: string): Promise<void> {
  const definition = noteDef('renamed', []);
  const rendered = renderDefinition(definition, defRef('renamed'));
  if (!('source' in rendered)) throw new Error('rename render failed');
  await mkdir(dirname(abs(project, relativeDef('renamed'))), { recursive: true });
  await writeFile(abs(project, relativeDef('renamed')), rendered.source);
  await rm(abs(project, relativeDef('alpha')), { force: true });
}

function envFor(mode: InjectMode): NodeJS.ProcessEnv {
  if (mode === 'crash-staging') return { M1_CRASH_AFTER: 'staging' };
  if (mode === 'crash-output') return { M1_CRASH_AFTER: 'output' };
  if (mode === 'crash-receipt') return { M1_CRASH_AFTER: 'receipt' };
  if (mode === 'crash-status') return { M1_CRASH_AFTER: 'status' };
  if (mode === 'source-during-call') return { M1_TOUCH_REF: defRef('alpha') };
  return {};
}

async function d1Seam(project: string): Promise<boolean> {
  const disk = await readFile(abs(project, relativeDef('alpha')), 'utf8');
  if (!disk.includes('"status": "generated"')) return false;
  const pending = replaceStatus(disk, 'pending');
  if (!pending) return false;
  const agree = await hashesAgree(disk, await sourceIdentityHash(pending));
  const still = await readFile(abs(project, relativeDef('alpha')), 'utf8');
  return agree && still === disk;
}

async function writeSandbox(project: string): Promise<void> {
  await mkdir(join(project, 'l5'), { recursive: true });
  await writeFile(join(project, 'l5', 'project.json'), `${JSON.stringify({ appEnv: 'development' }, null, 2)}\n`);
  for (const id of IDS) {
    const deps = id === 'beta' ? [defRef('alpha')] : [];
    const rendered = renderDefinition(noteDef(id, deps), defRef(id));
    if (!('source' in rendered)) throw new Error(`could not render ${id}`);
    const file = abs(project, relativeDef(id));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, rendered.source);
  }
  const gammaTest = abs(project, testRef('gamma'));
  await writeFile(gammaTest, 'export const cases = 1;\n');
  const catalog = scenarioCatalogRef(PROJECT, MODULE);
  const catalogFile = abs(project, catalog.replace(`_${PROJECT}_/`, ''));
  await mkdir(dirname(catalogFile), { recursive: true });
  await writeFile(catalogFile, `${JSON.stringify({
    schemaVersion: '2026-09-25-m1-scenario-catalog-v1',
    moduleName: MODULE,
    store: 'memory',
    scenarios: [],
  })}\n`);
}

function noteDef(id: string, dependencies: string[]): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'persistenceSeeds',
    artifactId: id,
    moduleName: MODULE,
    status: 'pending',
    dependencies: [...dependencies].sort(),
    data: { seedId: id, scenarios: [{ scenarioId: 'base', tableId: id }] },
  };
}

async function patchData(project: string, id: string, tableId: string): Promise<void> {
  const file = abs(project, relativeDef(id));
  const parsed = parseDefinitionSource(await readFile(file, 'utf8'));
  if (!('definition' in parsed)) throw new Error(`unreadable ${id}`);
  const definition = readDefinition(parsed.definition);
  if ('issues' in definition) throw new Error(definition.issues.join(' '));
  const scenarios = Array.isArray(definition.data.scenarios) ? definition.data.scenarios : [];
  definition.data = { ...definition.data, scenarios: scenarios.map(item => ({ ...(item as object), tableId })) };
  const rendered = renderDefinition(definition, defRef(id));
  if (!('source' in rendered)) throw new Error('patch failed');
  await writeFile(file, rendered.source);
}

async function patchStatus(project: string, id: string, status: 'pending' | 'failed'): Promise<void> {
  const file = abs(project, relativeDef(id));
  const next = replaceStatus(await readFile(file, 'utf8'), status);
  if (!next) throw new Error(`status patch failed for ${id}`);
  await writeFile(file, next);
}

async function patchReceipt(project: string, id: string, edit: (receipt: Record<string, unknown>) => void): Promise<void> {
  const file = abs(project, receiptPathFor(defRef(id)));
  const receipt = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
  edit(receipt);
  await writeFile(file, `${JSON.stringify(receipt)}\n`);
}

async function hashOutputs(project: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const id of [...IDS, 'renamed'] as const) {
    const file = abs(project, outputRef(id));
    hashes[id] = existsSync(file) ? sha(await readFile(file)) : '';
  }
  return hashes;
}

function materialize(sandboxParent: string, extra: NodeJS.ProcessEnv): SpawnResult {
  const tsx = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
  const hook = join(REPO_ROOT, 'test/register-hooks.mjs');
  const cli = join(HERE, 'nodejsMaterializeL1.ts');
  const argv = [
    tsx, '--import', hook, cli,
    '--project', String(PROJECT), '--module', MODULE, '--stage', 'structure',
    '--source-root', sandboxParent, '--output', sandboxParent,
  ];
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, ...extra },
  });
  return { code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', argv };
}

function defRef(id: string): string {
  return `_${PROJECT}_/${relativeDef(id)}`;
}

function relativeDef(id: string): string {
  return `l1/${MODULE}/layer_1_external/adapters/persistence/${id}.defs.ts`;
}

function outputRef(id: string): string {
  const output = outputPathFromDefPath(defRef(id));
  return output.replace(`_${PROJECT}_/`, '');
}

function testRef(id: string): string {
  return outputRef(id).replace(/\.ts$/, '.test.ts');
}

function abs(project: string, ref: string): string {
  return join(project, ref);
}

function sha(body: Buffer | string): string {
  return createHash('sha256').update(body).digest('hex');
}

function readSync(file: string): string {
  try {
    return existsSync(file) ? readFileSync(file, 'utf8') : '';
  } catch {
    return '';
  }
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readStatus(file: string): string {
  const match = /"status":\s*"(pending|generated|blocked|failed)"/.exec(readSync(file));
  return match?.[1] ?? '';
}

async function append(file: string, text: string): Promise<void> {
  const current = await readFile(file, 'utf8');
  await writeFile(file, `${current}${text}`);
}

function readField(stdout: string, name: string): string {
  const line = stdout.split('\n').find(item => item.startsWith(`${name}:`));
  return line?.slice(name.length + 1).trim() ?? '';
}

function porcelain(repo: string): string {
  const result = spawnSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' });
  return result.stdout ?? '';
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
  const repo = values.get('--repo') ?? '';
  const inject = values.get('--inject') ?? '';
  if (!evidence || !repo) throw new Error('Pass --evidence and --repo.');
  if (inject && !INJECT.includes(inject as typeof INJECT[number])) throw new Error(`Unknown inject ${inject}.`);
  return { evidence, repo, inject: inject as InjectMode };
}

void main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
