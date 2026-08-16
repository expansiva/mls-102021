/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbNs4Dialect.test.ts" enhancement="_blank"/>

// The l4/l5 this agent reads is now written by agentNewSolution4, which emits a different dialect:
// `as const satisfies <Artifact>`, `ownerType: 'useCase'` with `statusBackend`, entity lifecycles
// under workflows/, the relationship graph in ontology/index, profiles instead of actors.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDefsSource, replaceDefsValue, handlerKindOf, entityKindOf, isEntityLifecycle,
} from './cbDefsSource.js';
import { readAccessMatrixActors } from './cbWorkspace.js';

const ns4Defs = (value: unknown) => [
  '/// <mls fileReference="_102046_/l5/buildFlowFsm47/todoBackend.defs.ts" enhancement="_blank"/>',
  '',
  "import type { Ns4L5TodoBackendArtifact } from '/_102020_/l2/agentNewSolution4/types.js';",
  '',
  `export const buildFlowFsm47TodoBackend = ${JSON.stringify(value, null, 2)} as const satisfies Ns4L5TodoBackendArtifact;`,
  '',
  'export type BuildFlowFsm47TodoBackendType = typeof buildFlowFsm47TodoBackend;',
  '',
  'export default buildFlowFsm47TodoBackend;',
  '',
].join('\n');

const todo = {
  schemaVersion: '2026-08-13-ns4-todo-backend-v1', layer: 'backend', moduleName: 'buildFlowFsm47',
  owners: [{ ownerType: 'useCase', ownerId: 'alignProjectBudget', statusBackend: 'toCreate' }],
};

test('a defs file typed with `satisfies` parses like any other', () => {
  assert.deepEqual(parseDefsSource(ns4Defs(todo)), todo);
  // The older dialect keeps working, and a file with a second export still parses its first value.
  assert.deepEqual(parseDefsSource('export const x = {"a":1} as const;\n\nexport default x;\n'), { a: 1 });
  assert.deepEqual(parseDefsSource('export const x = {"a":1} as const;\nexport const pipeline = [2] as const;\n'), { a: 1 });
  assert.equal(parseDefsSource('export const x = nothing;\n'), null);
});

test('a status write-back keeps the file the generator wrote', () => {
  const source = ns4Defs(todo);
  const next = structuredClone(todo);
  next.owners[0].statusBackend = 'done';
  const written = replaceDefsValue(source, next);
  assert.ok(written);
  // The header, the import type, the `satisfies` and the trailing exports all survive: re-serializing
  // would strip them and leave the generated project without its type check.
  assert.match(written!, /import type \{ Ns4L5TodoBackendArtifact \}/);
  assert.match(written!, /as const satisfies Ns4L5TodoBackendArtifact;/);
  assert.match(written!, /export default buildFlowFsm47TodoBackend;/);
  assert.deepEqual(parseDefsSource(written!), next);
});

test('an entity lifecycle is not a unit of backend work', () => {
  assert.equal(isEntityLifecycle({ workflowId: 'changeOrderLifecycle', entityRef: 'ChangeOrder', states: ['proposed'], transitions: [] }), true);
  // ns3 workflows were owners and still are: they name entities, not a lifecycle.
  assert.equal(isEntityLifecycle({ workflowId: 'orderFlow', entities: ['Order'], operationIds: ['createOrder'] }), false);
});

test('a projection owns no table: it maps to the kind that already meant read-model', () => {
  assert.equal(entityKindOf('projection'), 'metric');
  assert.equal(entityKindOf('core'), 'core');
  assert.equal(entityKindOf('mdm'), 'mdm');
  assert.equal(entityKindOf('somethingNew'), 'core');
});

test('the handler vocabulary is query or command, whatever dialect the operation kind speaks', () => {
  assert.equal(handlerKindOf('list'), 'query');
  assert.equal(handlerKindOf('getById'), 'query');
  assert.equal(handlerKindOf('query'), 'query');
  assert.equal(handlerKindOf('commandInput'), 'command');
  assert.equal(handlerKindOf('transition'), 'command');
  assert.equal(handlerKindOf(''), 'command');
});

test('the module audience comes from the access matrix profiles', () => {
  const actors = readAccessMatrixActors({
    profiles: [
      { profileId: 'companyAdministrator', title: 'Company administrator', kind: 'internal', actorRefs: ['companyAdministrator'] },
      { profileId: 'fieldWorker', kind: 'internal' },
      { title: 'no id' },
    ],
  }, 'buildFlowFsm47');
  assert.deepEqual(actors, [
    { actorId: 'companyAdministrator', title: 'Company administrator', roleScope: 'internal', moduleName: 'buildFlowFsm47' },
    { actorId: 'fieldWorker', title: 'fieldWorker', roleScope: 'internal', moduleName: 'buildFlowFsm47' },
  ]);
});
