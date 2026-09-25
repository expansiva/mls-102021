/// <mls fileReference="_102021_/l2/agentDefsL1/fixtures/noLiveBench.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '../../..');
const LIVE = /(?:\.\.\/)+mls-102047\b|join\(\s*(?:MONOREPO|ROOT)\s*,\s*['"`]mls-102047/;

function walk(dir: string, acc: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'agendaClinica-f35e28a') continue;
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, acc);
    else if (name.endsWith('.test.ts')) acc.push(abs);
  }
}

void test('no 102021 *.test.ts reads the live mls-102047 bench', () => {
  const files: string[] = [];
  walk(path.join(PROJECT, 'l1'), files);
  walk(path.join(PROJECT, 'l2'), files);
  const hits = files.filter(file => LIVE.test(readFileSync(file, 'utf8'))).map(file => path.relative(PROJECT, file));
  assert.deepEqual(hits, []);
});
