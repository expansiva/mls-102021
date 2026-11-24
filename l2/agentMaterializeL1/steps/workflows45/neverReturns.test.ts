/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/neverReturns.test.ts" enhancement="_blank"/>

// d1_288 s3: the gate of the shape of a process function (a result with fields and a body with no `return` of a value). The refused file is the `toolCatalogRefresh.ts` recorded in
// `mls-102047@be5e6203`; the approved ones are every process file of the generated trees at fixed commits (`mls-102047@be5e6203`, `mls-102056@4c0b77f`), read with `git show`
// (never the working tree of the bench). Nothing is written in those repos.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { neverReturnsProblems, WORKFLOW_FUNCTION_NEVER_RETURNS } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/neverReturns.js';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const TREES = [{ repo: 'mls-102047', commit: 'be5e6203' }, { repo: 'mls-102056', commit: '4c0b77f' }];
const REFUSED = { repo: 'mls-102047', commit: 'be5e6203', file: 'l1/agents/layer_2_application/workflows/toolCatalogRefresh.ts' };
const PROCESS_FILE = /^l1\/[^/]+\/layer_2_application\/workflows\/[^/]+\.ts$/u;

function git(repo: string, ...args: string[]): string {
  const run = spawnSync('git', ['-C', path.join(BASE, repo), ...args], { maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(run.stderr?.toString() || `git ${args.join(' ')}`);
  return run.stdout.toString();
}

function processFiles(repo: string, commit: string): string[] {
  return git(repo, 'ls-tree', '-r', '--name-only', commit).split('\n')
    .filter(file => PROCESS_FILE.test(file) && !/\.(?:test|defs)\.ts$/u.test(file) && !file.endsWith('/engine.ts'));
}

const fn = (name: string, type: string, body: string) => `export async function ${name}(input: ${type}Input, ctx: RequestContext): Promise<${type}Output> {\n${body}\n}\n`;
const types = 'export interface AOutput { count: number; }\nexport interface EmptyOutput {}\n';

void test('d1_288 s3: the toolCatalogRefresh recorded in be5e6203 (a function that only throws) is refused, named, with the way out', () => {
  const problems = neverReturnsProblems(git(REFUSED.repo, 'show', `${REFUSED.commit}:${REFUSED.file}`));
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.ok(problems[0].startsWith(`${WORKFLOW_FUNCTION_NEVER_RETURNS}: \`applyReleaseCatalog\``), problems[0]);
  assert.match(problems[0], /ApplyReleaseCatalogOutput/u);
  assert.match(problems[0], /sourceGaps/u);
});

void test('d1_288 s3: every approved process of the generated trees passes (replay)', () => {
  const seen: string[] = [];
  for (const tree of TREES) {
    for (const file of processFiles(tree.repo, tree.commit)) {
      if (tree.repo === REFUSED.repo && file === REFUSED.file) continue;
      seen.push(`${tree.repo}/${file}`);
      assert.deepEqual(neverReturnsProblems(git(tree.repo, 'show', `${tree.commit}:${file}`)), [], `${tree.repo}/${file}`);
    }
  }
  assert.equal(seen.length, 9, `the replay read ${seen.length} files: ${seen.join(', ')}`);
});

void test('d1_288 s3: the shapes: a return of a value anywhere in the body passes; a body of callbacks only does not; void and empty results are not checked', () => {
  const header = '/// <mls fileReference="x" enhancement="_blank"/>\nimport type { RequestContext } from \'/_102034_/l1/server/layer_2_controllers/contracts.js\';\n';
  const run = (...functions: string[]) => neverReturnsProblems([header, types, ...functions].join('\n')).map(item => item.slice(0, item.indexOf(':')) + item.match(/`(\w+)`/u)?.[0]);
  assert.deepEqual(run(fn('a', 'A', '  throw new AppError("X", "y", 409);')), [`${WORKFLOW_FUNCTION_NEVER_RETURNS}\`a\``]);
  assert.deepEqual(run(fn('a', 'A', '  if (input) { return { count: 1 }; }\n  throw new AppError("X", "y", 409);')), [], 'one path returns');
  assert.deepEqual(run(fn('a', 'A', '  try { return { count: 1 }; } catch (error) { throw error; }')), []);
  assert.deepEqual(run(fn('a', 'A', '  return ctx.data.moduleData.runInTransaction(async (tx) => { return { count: 1 }; });')), [], 'the outer return counts');
  assert.deepEqual(run(fn('a', 'A', '  await ctx.data.moduleData.runInTransaction(async (tx) => {\n    return { count: 1 };\n  });')), [`${WORKFLOW_FUNCTION_NEVER_RETURNS}\`a\``], 'a return in a callback is not the function’s');
  assert.deepEqual(run(fn('a', 'A', '  const rows = [1].map(function (n) { return n; });\n  throw new AppError("X", "y", 409);')), [`${WORKFLOW_FUNCTION_NEVER_RETURNS}\`a\``], 'a nested function');
  assert.deepEqual(run(fn('a', 'A', '  // return { count: 1 };\n  const text = "return { count: 1 };";\n  throw new AppError("X", "y", 409);')), [`${WORKFLOW_FUNCTION_NEVER_RETURNS}\`a\``], 'a comment and a string are not a return');
  assert.deepEqual(run(fn('a', 'A', '  return;')), [`${WORKFLOW_FUNCTION_NEVER_RETURNS}\`a\``], 'a bare return is no value');
  assert.deepEqual(run('export async function onTick(ctx: RequestContext, now: Date): Promise<void> {\n  throw new AppError("X", "y", 409);\n}\n'), [], 'a void result');
  assert.deepEqual(run(fn('e', 'Empty', '  throw new AppError("X", "y", 409);')), [], 'a result with no field');
  assert.deepEqual(run(fn('a', 'A', "  throw new AppError('NOT_IMPLEMENTED', 'a');")), [], 'a stub is reported by the gate of the empty body, not here');
});
