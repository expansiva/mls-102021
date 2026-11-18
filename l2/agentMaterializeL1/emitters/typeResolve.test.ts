/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/typeResolve.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveInputType } from '/_102021_/l2/agentMaterializeL1/emitters/typeResolve.js';

const files: Record<string, string> = {
  '/_1_/base.js': [
    "export type Level = 'low' | 'high';",
    'export interface Base {',
    '  /** The id. */',
    '  id: string;',
    '  level: Level;',
    '}',
    'export interface Tree { name: string; child?: Tree }',
    'export type Box<T> = { value: T; list: T[] };',
    'export type Deep1 = { a: Deep2 };',
    'export type Deep2 = { b: Deep3 };',
    'export type Deep3 = { c: Deep4 };',
    'export type Deep4 = { d: Deep5 };',
    'export type Deep5 = { e: string };',
  ].join('\n'),
};
const readImport = async (specifier: string): Promise<string | null> => files[specifier] ?? null;
const resolve = (entry: string, typeName: string, depth?: number) => resolveInputType({ entry, typeName, readImport, depth });

void test('d1_200: an extended type, its alias union and its optional members are expanded; the index signature stays', async () => {
  const entry = "import type { Base } from '/_1_/base.js';\nexport interface In extends Base, Record<string, unknown> { extra?: string[] }";
  const r = await resolve(entry, 'In');
  assert.match(r.text, /id: string;/u);
  assert.match(r.text, /level: 'low' \| 'high';/u);
  assert.match(r.text, /extra\?: string\[\];/u);
  assert.match(r.text, /\[key: string\]: unknown;/u);
  assert.match(r.text, /\/\/ The id\./u);
  assert.equal(r.text.includes('Level'), false);
  assert.deepEqual([r.unresolved, r.truncated], [[], []]);
  assert.equal(r.expanded >= 2, true);
});

void test('d1_200: an alias of an object inside an array and a nested optional object are expanded', async () => {
  const entry = [
    "import type { Level } from '/_1_/base.js';",
    'export type Item = { level?: Level; tags: Array<string> };',
    'export interface In { items: Item[]; one?: { inner: Item } }',
  ].join('\n');
  const r = await resolve(entry, 'In');
  assert.match(r.text, /items: \{\n\s+level\?: 'low' \| 'high';\n\s+tags: Array<string>;\n\s+\}\[\];/u);
  assert.match(r.text, /one\?: \{\n\s+inner: \{/u);
  assert.equal(r.text.includes('Item'), false);
});

void test('d1_200: a generic alias gets its argument', async () => {
  const entry = "import type { Box } from '/_1_/base.js';\nexport interface In { b: Box<number> }";
  const r = await resolve(entry, 'In');
  assert.match(r.text, /value: number;/u);
  assert.match(r.text, /list: number\[\];/u);
});

void test('d1_200: the depth limit leaves the name with (truncated); a recursive type is cut where it repeats', async () => {
  const entry = "import type { Deep1, Tree } from '/_1_/base.js';\nexport interface In { d: Deep1; t: Tree }";
  const r = await resolve(entry, 'In', 4);
  assert.match(r.text, /Deep4 \/\* \(truncated\) \*\//u);
  assert.match(r.text, /child\?: Tree \/\* recursive \*\//u);
  assert.deepEqual(r.truncated, ['Deep4', 'Tree']);
});

void test('d1_200: a name that is not found stays, marked, and is listed; nothing disappears', async () => {
  const entry = "import type { Gone } from '/_9_/missing.js';\nexport interface In { a: Gone; b: Unknown; c: Date }";
  const r = await resolve(entry, 'In');
  assert.match(r.text, /a: Gone \/\* not resolved \*\//u);
  assert.match(r.text, /b: Unknown \/\* not resolved \*\//u);
  assert.match(r.text, /c: Date;/u);
  assert.deepEqual(r.unresolved, ['Gone', 'Unknown']);
});

void test('d1_200: a type with everything in place expands nothing; an unknown type name gives an empty text', async () => {
  const flat = await resolve('export interface In { a: string; b?: number; c: "x" | "y" }', 'In');
  assert.equal(flat.expanded, 0);
  assert.match(flat.text, /c: "x" \| "y";/u);
  assert.equal((await resolve('export interface In { a: string }', 'Other')).text, '');
});

void test('d1_200: a type the reader cannot parse is kept as written', async () => {
  const r = await resolve('export interface In { run: (x: number) => void; ok: string }', 'In');
  assert.match(r.text, /run: \(x: number\) => void;/u);
  assert.match(r.text, /ok: string;/u);
});
