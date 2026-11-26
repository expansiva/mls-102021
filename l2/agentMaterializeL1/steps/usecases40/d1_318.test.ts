/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/d1_318.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { typeLeakProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { READ_NEVER_FAILS } from '/_102021_/l2/agentMaterializeL1/helpers/readNeverFails.js';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

void test('d1_318: null! and undefined! are refused; comparisons, strings and comments are not', () => {
  assert.equal(typeLeakProblems('return bot == null ? null! : projectBot(bot);').length, 1);
  assert.equal(typeLeakProblems('details: { lastCheck: undefined!, pause: undefined! },').length, 1);
  assert.match(typeLeakProblems('x = undefined!;')[0], /`undefined!`/u);
  assert.deepEqual(typeLeakProblems("if (a !== null && b != undefined) {}\nconst t = 'null!'; // undefined! in a comment\n/* null! */"), []);
});

void test('d1_318: the shape of the empty is the type\'s, and an object with no empty form is a gap', () => {
  assert.match(READ_NEVER_FAILS, /an optional field is left out, a required text is the empty text/u);
  assert.match(READ_NEVER_FAILS, /never `null` where the type has no `null`/u);
  assert.match(READ_NEVER_FAILS, /source gap/u);
});

/** s0: the files the model writes, in every generated module of the repository, have no `null!`/`undefined!` outside the telegram leaks the gate was made for. */
void test('d1_318 s0: no legitimate null!/undefined! in the model-written layers of the generated modules (the gate has no false positive)', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const abs = path.join(dir, name);
    if (name === 'pipeline' || name === 'node_modules' || name === '.git') return [];
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
  const hits: string[] = [];
  for (const project of readdirSync(BASE).filter(name => /^mls-1020\d\d$/u.test(name))) {
    const l1 = path.join(BASE, project, 'l1');
    let modules: string[] = [];
    try { modules = readdirSync(l1); } catch { continue; }
    for (const mod of modules) {
      for (const layer of ['layer_2_application/usecases', 'layer_2_application/requests', 'layer_2_application/workflows']) {
        const dir = path.join(l1, mod, layer);
        let files: string[] = [];
        try { files = walk(dir); } catch { continue; }
        for (const file of files.filter(item => item.endsWith('.ts') && !item.endsWith('.defs.ts') && !item.endsWith('.test.ts'))) {
          if (typeLeakProblems(readFileSync(file, 'utf8')).length) hits.push(`${project}/${mod}/${path.basename(file)}`);
        }
      }
    }
  }
  assert.ok(hits.every(item => item.includes('/telegram/')), `leaks outside the telegram: ${hits.join(', ')}`);
});
