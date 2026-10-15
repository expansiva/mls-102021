/// <mls fileReference="_102021_/l2/helpers/l1Defs/disclosure.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { coveringGrants, pathDisclosure, resolveAllowedFields, systemFieldPaths, type DisclosureGrant } from '/_102021_/l2/helpers/l1Defs/disclosure.js';

const grant = (disclosure: string, entityRefs: string[], allowedFields: string[] = [], actorRef?: string): DisclosureGrant => ({
  disclosure, entityRefs, allowedFields, ...(actorRef == null ? {} : { actorRef }),
});

void test('a multi-entity route: each output is bounded only by the grants about its entity', () => {
  const own = grant('fullRecord', ['Visit']);
  const related = grant('fieldsOnly', ['Client'], ['Client.id', 'Client.details.identification']);
  const grants = [own, related];
  assert.deepEqual(coveringGrants(grants, 'Visit'), [own]);
  assert.equal(pathDisclosure(grants, 'Visit', 'id'), 'disclosed');
  assert.equal(pathDisclosure(grants, 'Visit', 'details.note'), 'disclosed');
  assert.equal(pathDisclosure(grants, 'Client', 'details.identification.name'), 'disclosed');
  // The fullRecord about Visit does not release Client.
  assert.equal(pathDisclosure(grants, 'Client', 'details.person'), 'blocked');
});

void test('no grant about the entity is blocked; a grant without entityRefs speaks for every entity', () => {
  assert.equal(pathDisclosure([grant('fullRecord', ['Visit'])], 'Client', 'id'), 'blocked');
  assert.equal(pathDisclosure([], 'Client', 'id'), 'blocked');
  assert.equal(pathDisclosure([grant('fieldsOnly', [], ['Client.id'])], 'Client', 'id'), 'disclosed');
  assert.equal(pathDisclosure([grant('fieldsOnly', [], ['Client.id']), grant('fullRecord', ['Visit'])], 'Visit', 'name'), 'blocked');
  // An undeclared grant ({} on the access scope) has no mode and discloses nothing.
  assert.equal(pathDisclosure([grant('', [])], 'Client', 'id'), 'blocked');
});

void test('a path leaves when some actor discloses it; one actor still needs every grant of his', () => {
  // (a) A fullRecord and B fieldsOnly without x: x leaves because A discloses it.
  const wide = grant('fullRecord', ['Client'], [], 'A');
  const narrow = grant('fieldsOnly', ['Client'], ['Client.id'], 'B');
  assert.equal(pathDisclosure([wide, narrow], 'Client', 'x'), 'disclosed');
  assert.equal(pathDisclosure([wide, narrow], 'Client', 'id'), 'disclosed');
  // (b) Two grants of the same actor: one without x blocks x inside that actor.
  const sameWide = grant('fullRecord', ['Client'], [], 'A');
  const sameNarrow = grant('fieldsOnly', ['Client'], ['Client.id'], 'A');
  assert.equal(pathDisclosure([sameWide, sameNarrow], 'Client', 'x'), 'blocked');
  assert.equal(pathDisclosure([sameWide, sameNarrow], 'Client', 'id'), 'disclosed');
  // Absent actorRef is that one actor too.
  assert.equal(pathDisclosure([grant('fullRecord', ['Client']), grant('summaryOnly', ['Client'], ['Client.id'])], 'Client', 'details'), 'blocked');
  // (c) An actor with no grant on the entity does not block the other.
  const other = grant('fieldsOnly', ['Visit'], ['Visit.id'], 'C');
  assert.equal(pathDisclosure([wide, other], 'Client', 'x'), 'disclosed');
});

const marked = (fields: Record<string, { type: string; derived?: boolean }>) => ({ record: { fields } });

void test('the primary key and a declared concurrency field leave without being listed on the grant', () => {
  const entity = marked({
    code: { type: 'uuid', derived: true },
    stamp: { type: 'integer', derived: true },
    label: { type: 'string' },
  });
  assert.deepEqual(systemFieldPaths(entity), ['code', 'stamp']);
  const grants = [grant('fieldsOnly', ['Crate'], ['Crate.label'])];
  assert.equal(pathDisclosure(grants, 'Crate', 'code', entity), 'disclosed');
  assert.equal(pathDisclosure(grants, 'Crate', 'stamp', entity), 'disclosed');
  assert.equal(pathDisclosure(grants, 'Crate', 'label', entity), 'disclosed');
  assert.equal(pathDisclosure(grants, 'Crate', 'weight', entity), 'blocked');
  assert.equal(pathDisclosure([grant('fieldsOnly', ['Other'], ['Other.label'])], 'Crate', 'stamp', entity), 'blocked');
  assert.equal(pathDisclosure([], 'Crate', 'stamp', entity), 'blocked');
});

void test('a concurrency field that the entity does not declare is not released', () => {
  const entity = marked({ code: { type: 'uuid', derived: true }, label: { type: 'string' } });
  assert.deepEqual(systemFieldPaths(entity), ['code']);
  const domain = { data: { fields: [{ name: 'code', type: 'uuid', derived: true }, { name: 'stamp', type: 'integer' }] } };
  assert.deepEqual(systemFieldPaths(domain), ['code']);
  const grants = [grant('fieldsOnly', ['Crate'], ['Crate.label'])];
  assert.equal(pathDisclosure(grants, 'Crate', 'stamp', entity), 'blocked');
  assert.equal(pathDisclosure(grants, 'Crate', 'version', entity), 'blocked');
});

void test('fieldsOnly covers a branch and its descendants, not its parent or a sibling', () => {
  const grants = [grant('fieldsOnly', ['Client'], ['Client.details.identification'])];
  assert.equal(pathDisclosure(grants, 'Client', 'details.identification'), 'disclosed');
  assert.equal(pathDisclosure(grants, 'Client', 'details.identification.name'), 'disclosed');
  assert.equal(pathDisclosure(grants, 'Client', 'details'), 'carrier');
  assert.equal(pathDisclosure(grants, 'Client', 'details.identificationX'), 'blocked');
  assert.equal(pathDisclosure([grant('fieldsOnly', ['Client'], ['Client'])], 'Client', 'details'), 'disclosed');
});

const branch = (names: Record<string, Record<string, unknown>>) => ({ record: { fields: names } });
const leaf = { type: 'string' };
const treeA = branch({
  a: leaf,
  b: leaf,
  details: { type: 'object', fields: { x: leaf, y: leaf } },
});
const treeB = branch({ p: leaf, q: leaf });

void test('resolveAllowedFields turns a denial into an explicit allow-list', () => {
  const entities = { A: treeA, B: treeB };
  assert.deepEqual(
    resolveAllowedFields({ grantId: 'g', entityRefs: ['A'], deniedFields: ['A.details.y'] }, entities),
    ['A.a', 'A.b', 'A.details.x'],
  );
  assert.deepEqual(
    resolveAllowedFields({ grantId: 'g', entityRefs: ['A'], allowedFields: ['A'], deniedFields: ['A.b'] }, entities),
    ['A.a', 'A.details'],
  );
  assert.deepEqual(
    resolveAllowedFields({ grantId: 'g', entityRefs: ['A'], allowedFields: ['A.a', 'A.details'], deniedFields: ['A.details.x'] }, entities),
    ['A.a', 'A.details.y'],
  );
  assert.deepEqual(
    resolveAllowedFields({ grantId: 'g', entityRefs: ['A'], allowedFields: ['A', 'A.a'] }, entities),
    ['A', 'A.a'],
  );
  assert.throws(
    () => resolveAllowedFields({ grantId: 'g1', entityRefs: ['A'], deniedFields: ['A.a'] }, { A: { record: {} } }),
    (error: unknown) => error instanceof Error && error.message.startsWith('D1_GRANT_DENIED_UNRESOLVED: g1 A'),
  );
  assert.deepEqual(
    resolveAllowedFields({ grantId: 'g', entityRefs: ['A', 'B'], deniedFields: ['A.b'] }, entities),
    ['A.a', 'A.details', 'B.p', 'B.q'],
  );
  const allowed = resolveAllowedFields({ grantId: 'g', entityRefs: ['A'], deniedFields: ['A.details.y'] }, entities);
  const grants = [grant('fieldsOnly', ['A'], allowed)];
  assert.equal(pathDisclosure(grants, 'A', 'details.x'), 'disclosed');
  assert.equal(pathDisclosure(grants, 'A', 'details.y'), 'blocked');
});
