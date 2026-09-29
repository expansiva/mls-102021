/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/oracle.test.ts" enhancement="_blank"/>

/**
 * m1_27: the authenticated route cases are derived from the L2 contract, the grants and
 * the authority map; the derived obligations stay declared in the catalog output. Expectations
 * come from the derivation. m1_33: running them against the emitted code is not done here (the
 * agent and this suite do not execute generated code; the monitor does).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { deriveCatalog, type DerivedCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import {
  obligationSourceHashes,
  staleObligations,
  type M1Obligation,
} from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';
import { BASE, derive, fixture, RENAMED } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';

const HERE = dirname(fileURLToPath(import.meta.url));

const FX = fixture(BASE);
const DERIVED = derive(FX);
const byId = (caseId: string): M1Obligation => {
  const found = DERIVED.obligations.find(item => item.caseId === caseId);
  assert.ok(found, `missing obligation ${caseId}; have ${DERIVED.obligations.map(item => item.caseId).join(', ')}`);
  return found;
};

void test('the oracle comes from the contract, the grants and the authority map, and every authenticated case stays pending', () => {
  const cases = DERIVED.catalog.scenarios.flatMap(item => item.cases);
  assert.equal(cases.every(item => item.actorId === '' && (item.runner === 'module' || item.caller?.authorities.length === 0)), true);
  assert.equal(DERIVED.obligations.every(item => item.blocker === 'RUNTIME_IDENTITY_PENDING' && item.owner === 'runtime 102034' && item.expect.ruleId === null), true);
  assert.equal(DERIVED.obligations.every(item => item.caller.authorities.length > 0), true);
  assert.equal(DERIVED.obligations.every(item => DERIVED.gaps.some(gap => gap.reason.includes(`${item.caseId} is declared, not executed`))), true);
  const kinds = new Map<string, number>();
  for (const item of DERIVED.obligations) kinds.set(item.kind, (kinds.get(item.kind) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries(kinds), { contract: 3, disclosure: 5, minimalInput: 4, noIdentity: 2, other: 1, own: 1 });

  const n = FX.n;
  const deckDisclosure = byId(`deck.disclosure.qryList${n.Entity}`);
  // The deck contract declares tideCheck, the owner grant does not disclose it; the related record is not granted.
  assert.deepEqual(deckDisclosure.expect.forbiddenPaths, ['details.tideCheck.doneAt', `${n.related}.details.secret`, `${n.related}.id`].sort());
  assert.equal(deckDisclosure.expect.allowedPaths.includes(`details.${n.note}`), true);
  assert.equal(deckDisclosure.identity, 'owner');
  assert.deepEqual(deckDisclosure.caller.authorities, [`${n.mod}:${n.owner}`]);
  assert.equal(deckDisclosure.sources.includes(FX.refs.deck), true);
  assert.equal(deckDisclosure.sources.includes(FX.refs.scope), true);
  assert.equal(byId(`deck.own.qryList${n.Entity}`).expect.isolatedActorField, n.ownerField);
  assert.equal(byId('deck.other.cmdMarkSailed').identity, 'other');
  assert.equal(byId(`office.minimal.qryList${n.Entity}`).identity, 'member');
  assert.equal(DERIVED.obligations.some(item => item.caseId.startsWith('office.') && item.kind === 'own'), false);

  // A pending grant refuses; it never becomes a passing case.
  const pendingScope = structuredClone(FX.defs.find(([, ref]) => ref === FX.refs.scope)?.[2]);
  assert.ok(pendingScope);
  (pendingScope.data.grants as Array<Record<string, unknown>>)[1].pending = 'ANCHOR_PENDING';
  const units: PlanUnitInput[] = [
    ...FX.defs.map(([, defPath, definition]) => ({ defPath, definition: defPath === FX.refs.scope ? pendingScope : definition })),
    ...FX.controllers.map(([defPath, definition]) => ({ defPath, definition })),
  ];
  const pending = deriveCatalog(n.mod, units, FX.texts);
  assert.equal(pending.obligations.some(item => item.caseId.startsWith('deck.')), false);
  assert.equal(pending.gaps.some(gap => gap.origin.endsWith(`#${FX.routes.sail}`) && gap.reason.startsWith('grant is not resolved')), true);

  // An unmapped grant refuses as well (d1_36).
  const map = structuredClone(FX.defs.find(([, ref]) => ref === FX.refs.authority)?.[2]);
  assert.ok(map);
  map.data.entries = (map.data.entries as Array<{ grantId: string }>).filter(entry => entry.grantId !== `${n.owner}Deck`);
  const unmapped = deriveCatalog(n.mod, units.map(unit => unit.defPath === FX.refs.authority ? { ...unit, definition: map } : unit.defPath === FX.refs.scope ? { ...unit, definition: FX.defs.find(([, ref]) => ref === FX.refs.scope)![2] } : unit), FX.texts);
  assert.equal(unmapped.obligations.some(item => item.caseId.startsWith('deck.')), false);
  assert.equal(unmapped.gaps.some(gap => gap.reason.startsWith('AUTHORITY_UNMAPPED')), true);
});

void test('renamed fixture derives the same cases and no id reaches the derivation code', () => {
  const renamed = derive(fixture(RENAMED));
  const shape = (derived: DerivedCatalog) => derived.obligations.map(item => `${item.kind}:${item.identity}:${item.expect.status}:${item.expect.forbiddenPaths.length}:${item.expect.allowedPaths.length}`).sort();
  assert.deepEqual(shape(renamed), shape(DERIVED));
  const body = JSON.stringify(renamed.obligations) + JSON.stringify(renamed.catalog);
  for (const id of Object.values(BASE)) assert.equal(body.includes(id), false, id);
  for (const file of ['obligations.ts', 'derive.ts', 'fixture.ts', '../contracts/fixture.ts']) {
    const source = readFileSync(join(HERE, file), 'utf8');
    for (const id of [...Object.values(BASE), ...Object.values(RENAMED).slice(1), 'agendaClinica', 'Consulta', 'profissional', 'paciente']) {
      assert.equal(source.includes(id), false, `${file} names ${id}`);
    }
  }
});

void test('a changed contract invalidates only the cases that read it', async () => {
  const before = await obligationSourceHashes(DERIVED.obligations, FX.texts);
  assert.equal(Object.values(before).includes('absent'), false);
  const texts = { ...FX.texts, [FX.refs.office]: `${FX.texts[FX.refs.office]}\n// edited\n` };
  const after = await obligationSourceHashes(DERIVED.obligations, texts);
  const stale = staleObligations(DERIVED.obligations, before, after);
  const expected = DERIVED.obligations.filter(item => item.sources.includes(FX.refs.office)).map(item => item.caseId);
  assert.deepEqual(stale, expected);
  assert.equal(stale.length > 0 && stale.length < DERIVED.obligations.length, true);
  assert.equal(stale.some(item => item.startsWith('deck.')), false);
  const missing = { ...FX.texts };
  delete missing[FX.refs.scope];
  assert.equal(staleObligations(DERIVED.obligations, before, await obligationSourceHashes(DERIVED.obligations, missing)).length, DERIVED.obligations.length);
});
