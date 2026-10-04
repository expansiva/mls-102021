/// <mls fileReference="_102021_/l2/helpers/l1Defs/disclosure.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { coveringGrants, pathDisclosure, systemFieldPaths, type DisclosureGrant } from '/_102021_/l2/helpers/l1Defs/disclosure.js';

const grant = (disclosure: string, entityRefs: string[], allowedFields: string[] = []): DisclosureGrant => ({ disclosure, entityRefs, allowedFields });

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

void test('every grant about the entity must disclose the path (two actors, one response)', () => {
  const wide = grant('fullRecord', ['Client']);
  const narrow = grant('summaryOnly', ['Client'], ['Client.id']);
  assert.equal(pathDisclosure([wide, narrow], 'Client', 'id'), 'disclosed');
  assert.equal(pathDisclosure([wide, narrow], 'Client', 'details'), 'blocked');
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
