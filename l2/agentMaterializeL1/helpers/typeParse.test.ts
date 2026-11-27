/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/typeParse.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { typeShape } from '/_102021_/l2/agentMaterializeL1/helpers/typeParse.js';

void test('d1_332 s1: allowed = every alternative; required = what every alternative requires; nullable and closed literal sets are read', () => {
  const source = `
export interface Input {
  target: { conversationRef: string } | { botRef: string };
  reason: string;
  identity?: { email: string; kind: 'a' | 'b' } | { mdmId: string; kind: 'a' | 'b' };
  note: string | null;
  list: Array<{ id: string } | { code: string }>;
  mode: 'x' | 'y' | null;
}`;
  const shape = typeShape(source, 'Input');
  assert.deepEqual(shape?.allowedPaths, ['target', 'target.conversationRef', 'target.botRef', 'reason', 'identity', 'identity.email', 'identity.kind', 'identity.mdmId', 'note', 'list', 'list.id', 'list.code', 'mode']);
  assert.deepEqual(shape?.requiredFields, ['target', 'reason', 'identity.kind', 'note', 'list', 'mode']);
  assert.deepEqual(shape?.nullablePaths, ['note', 'mode']);
  assert.deepEqual(shape?.unions, [{ path: 'identity.kind', values: ['a', 'b'] }, { path: 'mode', values: ['x', 'y'] }]);
});

void test('d1_332 s1: a union written on several lines, in an alias or by named interfaces is read the same way', () => {
  const source = `
export interface Multi { target:
    | { conversationRef: string }
    | { botRef: string };
}
export type Alias = { a: string } | { b: string };
export interface ByAlias { x: Alias }
export interface A { a: string }
export interface B { b: string }
export interface ByNames { u: A | B }`;
  assert.deepEqual(typeShape(source, 'Multi')?.allowedPaths, ['target', 'target.conversationRef', 'target.botRef']);
  assert.deepEqual(typeShape(source, 'ByAlias')?.allowedPaths, ['x', 'x.a', 'x.b']);
  assert.deepEqual(typeShape(source, 'ByNames')?.allowedPaths, ['u', 'u.a', 'u.b']);
  assert.deepEqual(typeShape(source, 'ByNames')?.requiredFields, ['u']);
});

void test('d1_332 s1: a member typed by another interface is opened, an interface that extends brings the members of its parent, a cycle stops', () => {
  const source = `
export interface Parent { id: string }
export interface Child extends Parent { name: string; next?: Child }
export interface Input { child: Child }`;
  assert.deepEqual(typeShape(source, 'Input')?.allowedPaths, ['child', 'child.id', 'child.name', 'child.next']);
});

void test('d1_332 s1: only an object is an input: a union, an intersection or another name at the top, or an unknown name, is null (d1_215)', () => {
  const source = 'export type A = { x: string };\nexport type Mixed = A | { y: string };\nexport type Same = A;\nexport type Str = string;\n';
  for (const name of ['Mixed', 'Same', 'Str', 'Nothing']) assert.equal(typeShape(source, name), null, name);
  assert.deepEqual(typeShape(source, 'A')?.allowedPaths, ['x']);
  assert.deepEqual(typeShape(source, '{ q: string; r?: number }')?.requiredFields, ['q']);
});
