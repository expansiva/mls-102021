/// <mls fileReference="_102021_/l2/helpers/l1Defs/operations.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const L2 = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const ALLOWED = 'helpers/l1Defs/operations.ts';
const AGENTS = ['agentPlannerL1', 'agentDefsL1', 'agentMaterializeL1'] as const;

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
    out.push(full);
  }
}

function stringArrays(source: string): string[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return [...stripped.matchAll(/\[\s*(?:['"][^'"]*['"]\s*,\s*)*['"][^'"]*['"]\s*(?:,\s*)?\]/g)].map(item => item[0]);
}

function hasCreateAndList(literal: string): boolean {
  const quoted = [...literal.matchAll(/['"]([^'"]*)['"]/g)].map(item => item[1]);
  return quoted.includes('create') && quoted.includes('list');
}

test('no agent source lists create and list except l1Defs/operations.ts', () => {
  const violations: string[] = [];
  for (const agent of AGENTS) {
    const files: string[] = [];
    walk(join(L2, agent), files);
    for (const file of files) {
      const rel = relative(L2, file).replace(/\\/g, '/');
      if (rel === ALLOWED) continue;
      const source = readFileSync(file, 'utf8');
      if (stringArrays(source).some(hasCreateAndList)) violations.push(rel);
    }
  }
  assert.deepEqual(violations, []);
});

/** Equality of a usecase name with a transition, either side. Co-occurrence in a message is not a comparison. */
const COMPARE = String.raw`(?:===|!==|==|!=)`;
const NAME = String.raw`(?:usecaseId|identity)`;
const TRANSITION = String.raw`(?:transitionId|transitionRef)`;
const LEFT = new RegExp(String.raw`\b${NAME}\b[^;\n]{0,80}${COMPARE}[^;\n]{0,80}\b${TRANSITION}\b`);
const RIGHT = new RegExp(String.raw`\b${TRANSITION}\b[^;\n]{0,80}${COMPARE}[^;\n]{0,80}\b${NAME}\b`);

test('no agent source compares a usecase id with a transition id', () => {
  const violations: string[] = [];
  for (const agent of AGENTS) {
    const files: string[] = [];
    walk(join(L2, agent), files);
    for (const file of files) {
      const rel = relative(L2, file).replace(/\\/g, '/');
      const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      if (LEFT.test(source) || RIGHT.test(source)) violations.push(rel);
    }
  }
  assert.deepEqual(violations, []);
});
