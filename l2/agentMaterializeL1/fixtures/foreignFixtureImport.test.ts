/// <mls fileReference="_102021_/l2/agentMaterializeL1/fixtures/foreignFixtureImport.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '../../..');
const OWN = '102021';
const SPECIFIERS = [
  /\bfrom\s*['"`]\/_(\d+)_\//g,
  /\bimport\s*\(\s*['"`]\/_(\d+)_\//g,
  /\bimport\s+['"`]\/_(\d+)_\//g,
  /\brequire\s*\(\s*['"`]\/_(\d+)_\//g,
];

function stripTemplates(source: string): string {
  let out = '';
  let inTemplate = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '\\') {
      if (!inTemplate) out += source.slice(i, i + 2);
      i += 1;
      continue;
    }
    if (char === '`') {
      inTemplate = !inTemplate;
      continue;
    }
    if (!inTemplate) out += char;
  }
  return out;
}

function walk(dir: string, acc: string[]): void {
  if (!existsSync(dir)) return; // mls-102021/l1 is absent since m1_33
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, acc);
    else if (name.endsWith('.ts') && abs.split(path.sep).includes('fixtures')) acc.push(abs);
  }
}

void test('no fixture .ts imports another project', () => {
  const files: string[] = [];
  walk(path.join(PROJECT, 'l1'), files);
  walk(path.join(PROJECT, 'l2'), files);
  const hits: string[] = [];
  for (const file of files) {
    const source = stripTemplates(readFileSync(file, 'utf8'));
    const ids = new Set<string>();
    for (const pattern of SPECIFIERS) {
      pattern.lastIndex = 0;
      let match = pattern.exec(source);
      while (match) {
        if (match[1] !== OWN) ids.add(match[1]);
        match = pattern.exec(source);
      }
    }
    if (ids.size > 0) hits.push(`${path.relative(PROJECT, file)} ${[...ids].sort().join(',')}`);
  }
  assert.deepEqual(hits, []);
});
