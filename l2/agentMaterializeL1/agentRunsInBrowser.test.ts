/// <mls fileReference="_102021_/l2/agentMaterializeL1/agentRunsInBrowser.test.ts" enhancement="_blank"/>

/**
 * m1_33: the agent runs only in the Studio browser. No file reachable from the agent entry imports
 * `node:*`, a node builtin, a `/_NNNN_/l1/` module or a server library. Only a top-level `import type`
 * is exempt (erased). Specifiers inside strings (emitted code) are not imports and are not read.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const ENTRY = join(HERE, 'agentMaterializeL1.ts');

const SERVER_LIBS = ['pg', 'jose', 'redis'];
const BUILTINS = new Set(builtinModules);

function forbidden(specifier: string): string | null {
  if (specifier.startsWith('node:')) return 'node builtin';
  if (BUILTINS.has(specifier.split('/')[0])) return 'node builtin';
  if (/^\/?_\d+_\/l1\//.test(specifier)) return 'l1 module';
  if (specifier.startsWith('@aws-sdk/')) return 'server library';
  if (SERVER_LIBS.some(lib => specifier === lib || specifier.startsWith(`${lib}/`))) return 'server library';
  return null;
}

/** Runtime specifiers of one source: static import/export-from and literal import(). `import type` is skipped. */
function runtimeSpecifiers(fileName: string, text: string): string[] {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!node.importClause?.isTypeOnly) found.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!node.isTypeOnly) found.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) found.push(arg.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function resolveLocal(from: string, specifier: string): string | null {
  const alias = /^\/?_(\d+)_\/(.+)\.js$/.exec(specifier);
  let target: string | null = null;
  if (alias) target = join(ROOT, `mls-${alias[1]}`, `${alias[2]}.ts`);
  else if (specifier.startsWith('.')) target = resolve(dirname(from), specifier.replace(/\.js$/, '.ts'));
  return target && existsSync(target) ? target : null;
}

interface Violation { file: string; specifier: string; kind: string }

function scan(entry: string, readSource: (file: string) => string): { reached: Set<string>; violations: Violation[] } {
  const reached = new Set<string>();
  const violations: Violation[] = [];
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (reached.has(file)) continue;
    reached.add(file);
    for (const specifier of runtimeSpecifiers(file, readSource(file))) {
      const kind = forbidden(specifier);
      if (kind) {
        violations.push({ file: file.slice(ROOT.length + 1), specifier, kind });
        continue;
      }
      const next = resolveLocal(file, specifier);
      if (next) queue.push(next);
    }
  }
  return { reached, violations };
}

const disk = (file: string): string => readFileSync(file, 'utf8');

void test('m1_33: nothing reachable from the agent entry imports node, l1 or a server library', () => {
  const { reached, violations } = scan(ENTRY, disk);
  // Positive coverage: the walk really crosses the run path and the Studio host.
  for (const file of ['run/execute.ts', 'studioHost.ts', 'handlers/behavior/runners.ts', 'testing/verify.ts']) {
    assert.equal(reached.has(join(HERE, file)), true, `not reached: ${file}`);
  }
  assert.deepEqual(violations, []);
});

void test('m1_33: control: a value import of node or l1 turns the guard red; import type and strings do not', () => {
  const execute = join(HERE, 'run/execute.ts');
  const injected = (line: string) => (file: string): string => file === execute ? `${disk(file)}\n${line}\n` : disk(file);
  const cases: Array<[string, string]> = [
    ["import { readFileSync } from 'node:fs';", 'node builtin'],
    ["const m = await import('/_102021_/l1/agentMaterializeL1/caseRun.js');", 'l1 module'],
    ["import { execBff } from '/_102034_/l1/server/layer_2_controllers/execBff.js';", 'l1 module'],
    ["import { type X } from '/_102034_/l1/server/layer_2_controllers/contracts.js';", 'l1 module'],
    ["import pg from 'pg';", 'server library'],
    ["import { SignJWT } from 'jose';", 'server library'],
    ["import { S3Client } from '@aws-sdk/client-s3';", 'server library'],
    ["import { spawnSync } from 'child_process';", 'node builtin'],
  ];
  for (const [line, kind] of cases) {
    const { violations } = scan(ENTRY, injected(line));
    assert.deepEqual(violations.map(item => item.kind), [kind], line);
  }
  const clean = [
    "import type { X } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
    "const emitted = \"import { execBff } from '/_102034_/l1/server/layer_2_controllers/execBff.js';\";",
  ];
  for (const line of clean) assert.deepEqual(scan(ENTRY, injected(line)).violations, [], line);
});
