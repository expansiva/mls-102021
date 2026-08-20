/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbMdmPolicy.test.ts" enhancement="_blank"/>

// The MDM write path is OFF until the general rebuild, so these tests do two jobs: they exercise the
// new branch with the flag forced ON (the flag is a parameter of the pure classifier precisely so the
// suite covers what runtime does not), and they PROVE the flag-off branch still answers what run 9 of
// buildFlowFsm was generated with — that is the regression evidence for "o 102046 permanece intocado".

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyEntityKind, readEntityStorage, entityKindOf, contradictoryStorageDeclaration,
  MDM_WRITE_PATH_ENABLED,
} from './cbDefsSource.js';
import { collectPersistencePolicyIssues } from './cbMdmPolicy.js';

// Verbatim from mls-102046/l4/buildFlowFsm/ontology/*.defs.ts (run 9, ontology v6).
const client = { kind: 'mdm', ownership: 'moduleOwned', storage: { target: 'mdm', scope: 'organization', idField: 'clientId', mdmType: 'buildFlowFsm.Client' } };
const fieldWorker = { kind: 'core', ownership: 'external', storage: { target: 'external', scope: 'platform' } };
const changeOrder = { kind: 'core', ownership: 'moduleOwned', storage: { target: 'moduleDatabase', scope: 'module', idField: 'changeOrderId' } };

test('the write path ships OFF: nothing about the current module changes', () => {
  assert.equal(MDM_WRITE_PATH_ENABLED, false);
  // Client keeps the band-aid classification (local aggregate) that run 9 was generated with…
  assert.equal(classifyEntityKind(client, false), 'core');
  assert.equal(classifyEntityKind(client, false), entityKindOf('mdm', 'moduleOwned'));
  // …and so does FieldWorker, whose `ownership: external` the old reader never looked at.
  assert.equal(classifyEntityKind(fieldWorker, false), 'core');
  assert.equal(classifyEntityKind(changeOrder, false), 'core');
});

test('with the write path ON, storage.target decides where the entity lives', () => {
  assert.equal(classifyEntityKind(client, true), 'mdm');
  assert.equal(classifyEntityKind(fieldWorker, true), 'external');
  assert.equal(classifyEntityKind(changeOrder, true), 'core');
  // A projection is still a projection: the mapping of the other foreign word is untouched.
  assert.equal(classifyEntityKind({ kind: 'projection', storage: { target: 'moduleDatabase', scope: 'module', mdmType: '', idField: '' } }, true), 'metric');
  // An l4 that predates the `storage` block answers exactly like the old reader.
  assert.equal(classifyEntityKind({ kind: 'supporting' }, true), 'supporting');
});

test('readEntityStorage reads the block the l4 writes, and tolerates its absence', () => {
  assert.deepEqual(readEntityStorage(client as unknown as Record<string, unknown>), {
    target: 'mdm', scope: 'organization', mdmType: 'buildFlowFsm.Client', idField: 'clientId',
  });
  assert.deepEqual(readEntityStorage({ entityId: 'Legacy' }), { target: '', scope: '', mdmType: '', idField: '' });
});

// `derived` is the third member of the mdm/external family: the l4 says the record is computed, so it
// owns no table and no seeds. It used to fall through to `projection -> metric`, which DOES get both —
// and the run then had a table nobody should have emitted, rescued by hand with an invented primary key.
test('a derived entity owns no local persistence', () => {
  const dashboard = { kind: 'projection', ownership: 'derived', storage: { target: 'derived', scope: 'none', mdmType: '', idField: '' } };
  assert.equal(classifyEntityKind(dashboard, true), 'derived');
  // Flag off: unchanged from what the current module was generated with.
  assert.equal(classifyEntityKind(dashboard, false), 'metric');
  const issues = collectPersistencePolicyIssues(
    [{ entityId: 'ProjectDashboard', kind: 'derived', storageTarget: 'derived' }],
    { persistence: ['projectdashboard'], domainEntities: ['projectdashboard'] },
  );
  assert.equal(issues.length, 2, issues.join(' | '));
  assert.ok(issues.every(issue => /declares storage\.target 'derived'/.test(issue)), issues.join(' | '));
  assert.ok(issues.some(issue => /the read query materializes it/.test(issue)));
});

test('a contradictory declaration is announced, not resolved in silence', () => {
  // `core + external` was already an undefined combination nobody noticed (it is what FieldWorker used).
  // A freshly changed ns4 vocabulary can just as easily emit `mdm + external`; the scan must say so.
  assert.match(contradictoryStorageDeclaration({ kind: 'mdm', ownership: 'external', storage: { target: 'mdm', scope: 'organization', mdmType: 'm.E', idField: 'eId' } }),
    /storage\.target 'mdm' with ownership 'external'/);
  assert.match(contradictoryStorageDeclaration({ kind: 'mdm', ownership: 'moduleOwned', storage: { target: 'external', scope: 'platform', mdmType: '', idField: '' } }),
    /kind 'mdm' with storage\.target 'external'/);
  // The coherent declarations of run 9 say nothing.
  assert.equal(contradictoryStorageDeclaration(client), '');
  assert.equal(contradictoryStorageDeclaration(fieldWorker), '');
  assert.equal(contradictoryStorageDeclaration(changeOrder), '');
});

test('the policy gate names the entity and the declaration the artifact contradicts', () => {
  const entities = [
    { entityId: 'Client', kind: 'mdm', storageTarget: 'mdm' },
    { entityId: 'FieldWorker', kind: 'external', storageTarget: 'external' },
    { entityId: 'ChangeOrder', kind: 'core', storageTarget: 'moduleDatabase' },
  ];
  const issues = collectPersistencePolicyIssues(entities, {
    domainEntities: ['client', 'changeorder'],
    ports: ['clientrepository', 'changeorderrepository'],
    // Real generated names: `client.defs.ts` is the table def and `clientRepositoryAdapter.defs.ts` the
    // adapter — and `clientbillingsummary` must NOT be claimed by the `Client` prefix.
    persistence: ['client', 'clientrepositoryadapter', 'clientbillingsummary', 'changeorder'],
    seededLocalEntities: ['FieldWorker'],
  });
  // Client: domain entity + port + persistence artifact = three findings, each naming the target.
  // domain entity + port + table def + adapter def = four findings, each naming the target.
  assert.equal(issues.filter(issue => issue.includes("'Client'")).length, 4);
  assert.ok(issues.some(issue => /local persistence artifact clientrepositoryadapter\.defs\.ts/.test(issue)), issues.join('\n'));
  assert.ok(!issues.some(issue => issue.includes('clientbillingsummary')), issues.join('\n'));
  assert.ok(issues.some(issue => /entity 'Client' declares storage\.target 'mdm' -> local domain entity Client\.defs\.ts forbidden/.test(issue)), issues.join('\n'));
  assert.ok(issues.some(issue => /entity 'Client'.*port ClientRepository\.defs\.ts/.test(issue)), issues.join('\n'));
  // FieldWorker has no artifact, but being seeded locally is the very defect of run 9 (duplicated people).
  assert.ok(issues.some(issue => /entity 'FieldWorker' declares storage\.target 'external' -> local seed rows forbidden/.test(issue)), issues.join('\n'));
  // A module-database entity with the whole local stack is the normal case and must stay silent.
  assert.ok(!issues.some(issue => issue.includes("'ChangeOrder'")), issues.join('\n'));
});

test('an entity classified mdm/external without a declared target is still covered', () => {
  // ns/ns3 l4 has no `storage` block; the derived kind alone must be enough to gate.
  const issues = collectPersistencePolicyIssues([{ entityId: 'MenuItem', kind: 'mdm', storageTarget: '' }], {
    persistence: ['menuitem'],
  });
  assert.equal(issues.length, 1);
  assert.ok(issues[0].includes("declares storage.target 'mdm'"), issues[0]);
});
