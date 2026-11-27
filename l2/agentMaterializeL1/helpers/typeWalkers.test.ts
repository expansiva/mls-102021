/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/typeWalkers.test.ts" enhancement="_blank"/>

// d1_332 s3: the guard of the class "a point of the generator that walks a type must treat a union". The same fixture goes through EVERY walker of the generator that reads a
// TypeScript type, and each one must keep every alternative (or say, here, why it does not). A new walker is added to this list in the same change that creates it.

import assert from 'node:assert/strict';
import test from 'node:test';

import { membersOfType } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { resolveInputType } from '/_102021_/l2/agentMaterializeL1/emitters/typeResolve.js';
import { catalogTypeBody, exportSignatures } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { typeShape } from '/_102021_/l2/agentMaterializeL1/helpers/typeParse.js';
import { sampleOf, typeNodeOf, typeTableOf } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

const FIXTURE = `
export interface InlineIn {
  target: { conversationRef: string } | { botRef: string };
  reason: string;
}
export interface MultiIn {
  target:
    | { conversationRef: string }
    | { botRef: string };
  reason: string;
}
export type Alias = { a: string } | { b: string };
export interface AliasIn { x: Alias; y?: Alias }
export interface NamedA { a: string }
export interface NamedB { b: string }
export interface NamedUnionIn { u: NamedA | NamedB; l: 'p' | 'q'; arr: Array<{ k: string } | { m: string }> }
export interface OptionalUnionIn { identity?: { email: string } | { mdmId: string }; since?: string }
`;

/** Each case: the type, and the paths every alternative brings. */
const CASES: Array<{ type: string; paths: string[] }> = [
  { type: 'InlineIn', paths: ['target.conversationRef', 'target.botRef', 'reason'] },
  { type: 'MultiIn', paths: ['target.conversationRef', 'target.botRef', 'reason'] },
  { type: 'AliasIn', paths: ['x.a', 'x.b', 'y.a', 'y.b'] },
  { type: 'NamedUnionIn', paths: ['u.a', 'u.b', 'l', 'arr.k', 'arr.m'] },
  { type: 'OptionalUnionIn', paths: ['identity.email', 'identity.mdmId', 'since'] },
];

const INLINE = ['InlineIn', 'MultiIn', 'OptionalUnionIn'];

/** `only`: the types the walker shows by their text (an alias or a named type is shown by its name, its alternatives are in its own declaration, which is shown too). */
const WALKERS: Array<{ name: string; only?: string[]; read: (type: string) => Promise<string[]> | string[] }> = [
  { name: 'typeShape (the reader the controller emitter uses)', read: type => typeShape(FIXTURE, type)?.allowedPaths ?? [] },
  { name: 'membersOfType (emitters/emit.ts, the controller allowed list)', read: type => membersOfType(FIXTURE, type)?.allowedPaths ?? [] },
  {
    name: 'resolveInputType (the type the usecase prompt shows)',
    read: async type => {
      const text = (await resolveInputType({ entry: FIXTURE, typeName: type, readImport: async () => null })).text;
      return [...text.matchAll(/\b([a-z][A-Za-z]*)\??:/gu)].map(match => match[1]);
    },
  },
  { name: 'catalogTypeBody (the catalog type the model sees)', only: INLINE, read: type => [...catalogTypeBody(FIXTURE, type).matchAll(/\b([a-z][A-Za-z]*)\??:/gu)].map(match => match[1]) },
  { name: 'exportSignatures (the signatures the model sees)', read: () => [...exportSignatures(FIXTURE).matchAll(/\b([a-z][A-Za-z]*)\??:/gu)].map(match => match[1]) },
];

for (const walker of WALKERS) {
  void test(`d1_332 s3: ${walker.name} keeps every alternative of a union`, async () => {
    for (const item of CASES.filter(candidate => !walker.only || walker.only.includes(candidate.type))) {
      const found = await walker.read(item.type);
      // The text readers name members (leaf names); the path readers name paths. Either way each alternative's last name must be there.
      for (const path of item.paths) {
        const leaf = path.split('.').pop() as string;
        assert.ok(found.includes(path) || found.includes(leaf), `${walker.name}: ${item.type} lost ${path} (found ${JSON.stringify(found)})`);
      }
    }
  });
}

void test('d1_332 s3: the smoke type model gives one case per way a union input is called', () => {
  const table = typeTableOf([FIXTURE]);
  const samples = [0, 1].map(variant => JSON.stringify(sampleOf(typeNodeOf('InlineIn'), table, { variant })));
  assert.deepEqual(samples, ['{"target":{"conversationRef":"sample"},"reason":"sample"}', '{"target":{"botRef":"sample"},"reason":"sample"}']);
});

// Walkers that read less on purpose (not a union problem; recorded so the list is the whole list):
//  - catalogTypeFields (emitters/connectionCatalog.ts): the names of the first level of a catalog type, a union below is not read;
//  - flattenType (agentDefsL1/steps/usecases50/context.ts): a union is kept as the text of one opaque leaf, never opened (d1_332: it stays, it would change the defs);
//  - topLevelMembers (steps/tests60/context.ts): the names of the first level of an input body;
//  - failureMember `unionMembers` (steps/adapter17): reads `export type X = {…} | {…}` at the top, and only that.
