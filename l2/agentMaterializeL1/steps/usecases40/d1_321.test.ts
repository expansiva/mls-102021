/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/d1_321.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { exportSignatures } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

void test('d1_321 A: a type union on several lines keeps every member; one line and interfaces are as before', () => {
  const source = [
    'export type R =',
    '  | { ok: true; v: string }',
    '  | { ok: false; code: string };',
    'export type S = { a: string } | { b: number };',
    'export interface I {',
    '  a: string;',
    '}',
    'export type Plain =',
    '  Array<string>;',
    'export async function f(x: I): Promise<R> {',
    '  return null as never;',
    '}',
  ].join('\n');
  assert.equal(exportSignatures(source), [
    'export type R =',
    '  | { ok: true; v: string }',
    '  | { ok: false; code: string };',
    'export type S = { a: string } | { b: number };',
    'export interface I {',
    '  a: string;',
    '}',
    'export type Plain =',
    '  Array<string>;',
    'export async function f(x: I): Promise<R> { … }',
  ].join('\n'));
});

void test('d1_321 A: an alias with no `;` does not swallow what follows it', () => {
  const source = 'export type R =\n  | { a: 1 }\n  | { b: 2 }\n\nexport const k = 1;\nexport function g(): void {\n}';
  const out = exportSignatures(source);
  assert.ok(out.includes('| { b: 2 }') && out.includes('export const k = 1;') && out.includes('export function g(): void { … }'), out);
});
