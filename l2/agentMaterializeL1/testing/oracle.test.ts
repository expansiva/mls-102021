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

import { outputPathFromDefPath } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitRequestService } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { deriveCatalog, type DerivedCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import {
  obligationMiss,
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
  // Only the rollback case waits for Postgres; every other one for the runtime identity.
  assert.equal(DERIVED.obligations.every(item => item.expect.ruleId === null && (item.kind === 'rollback'
    ? item.blocker === 'POSTGRES_ONLY' && item.owner === 'runtime 102034 (DATABASE_URL_TEST)'
    : item.blocker === 'RUNTIME_IDENTITY_PENDING' && item.owner === 'runtime 102034')), true);
  assert.equal(DERIVED.obligations.every(item => item.caller.authorities.length > 0), true);
  assert.equal(DERIVED.obligations.every(item => DERIVED.gaps.some(gap => gap.reason.includes(`${item.caseId} is declared, not executed`))), true);
  const kinds = new Map<string, number>();
  for (const item of DERIVED.obligations) kinds.set(item.kind, (kinds.get(item.kind) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries(kinds), { contract: 4, disclosure: 6, minimalInput: 5, noIdentity: 2, own: 1, rollback: 1, shape: 2, success: 4 });

  const n = FX.n;
  const rows = `${n.entity}Rows`;
  const deckDisclosure = byId(`${n.pageB}.disclosure.${n.reqRoster}`);
  // m1_41 P4: the deck request projects inside the owner grant (the structure refuses wider), so no path is
  // forbidden by name. The runtime check stays: tideCheck and the related record are not allowed, and returning one is a miss.
  assert.deepEqual(deckDisclosure.expect.forbiddenPaths, []);
  assert.equal(deckDisclosure.expect.allowedPaths.includes(`${rows}.details.${n.note}`), true);
  assert.equal(deckDisclosure.expect.allowedPaths.some(path => path.includes('tideCheck') || path.includes(n.related)), false);
  const leaked = (extra: Record<string, unknown>) => obligationMiss(deckDisclosure, {
    ok: true, status: 200, errorCode: null, actorId: 'p-1', data: { [rows]: [{ id: 'b-1', details: { [n.note]: 'x' }, ...extra }] },
  });
  assert.equal(leaked({}), '');
  assert.equal(leaked({ [n.related]: { id: 's-1' } }), `undisclosed path returned: ${rows}.${n.related}.id`);
  assert.equal(deckDisclosure.identity, 'owner');
  assert.deepEqual(deckDisclosure.caller.authorities, [`${n.mod}:${n.owner}`]);
  assert.equal(deckDisclosure.sources.includes(FX.refs.contractB), true);
  assert.equal(deckDisclosure.sources.includes(FX.refs.request(n.pageB)), true);
  assert.equal(deckDisclosure.sources.includes(FX.refs.scope), true);
  assert.equal(byId(`${n.pageB}.own.${n.reqRoster}`).expect.isolatedActorField, n.ownerField);
  assert.equal(byId(`${n.pageA}.minimal.${n.reqList}`).identity, 'member');
  assert.equal(DERIVED.obligations.some(item => item.caseId.startsWith(`${n.pageA}.`) && item.kind === 'own'), false);

  // qry: the exact output shape (keys, projected fields, paging keys of the list).
  const shape = byId(`${n.pageA}.shape.${n.reqList}`);
  assert.equal(shape.expect.ok && shape.expect.status === 200 && !shape.mutating, true);
  assert.equal(shape.expect.allowedPaths.includes(rows) && shape.expect.allowedPaths.includes(`${rows}.dockAt`), true);
  assert.deepEqual(['hasMoreRows', 'pageRows', 'pageSizeRows'].filter(key => shape.expect.allowedPaths.includes(key)), ['hasMoreRows', 'pageRows', 'pageSizeRows']);
  // cmd: success writes; the second usecase failing proves all or nothing, in Postgres only.
  const success = byId(`${n.pageA}.success.${n.reqDock}`);
  assert.equal(success.mutating && success.expect.ok && success.expect.allowedPaths.includes(`${n.entity}.id`), true);
  assert.deepEqual(success.input.required.includes(n.parentField), true);
  const rollback = byId(`${n.pageA}.rollback.${n.reqDock}.create${n.Entity}`);
  assert.equal(rollback.mutating && !rollback.expect.ok, true);
  assert.equal(DERIVED.obligations.filter(item => item.kind === 'rollback').length, 1);
  assert.deepEqual(DERIVED.gaps.filter(gap => gap.reason.startsWith('ROLLBACK_SINGLE_USE')).map(gap => gap.reason).sort(), [
    `ROLLBACK_SINGLE_USE: ${FX.routes.amend} uses one usecase`, `ROLLBACK_SINGLE_USE: ${FX.routes.sail} uses one usecase`,
    `ROLLBACK_SINGLE_USE: ${FX.routes.berth} uses one usecase`,
  ].sort());
  assert.equal(DERIVED.gaps.some(gap => /^(REQUEST_UNREAD|CONTRACT_UNREAD|CONTRACT_ROUTE_MISSING)/.test(gap.reason)), false);

  // A pending grant refuses; it never becomes a passing case.
  const pendingScope = structuredClone(FX.defs.find(([, ref]) => ref === FX.refs.scope)?.[2]);
  assert.ok(pendingScope);
  (pendingScope.data.grants as Array<Record<string, unknown>>)[1].pending = 'ANCHOR_PENDING';
  const units: PlanUnitInput[] = [
    ...FX.defs.map(([, defPath, definition]) => ({ defPath, definition: defPath === FX.refs.scope ? pendingScope : definition })),
    ...FX.controllers.map(([defPath, definition]) => ({ defPath, definition })),
  ];
  const pending = deriveCatalog(n.mod, units, FX.texts);
  assert.equal(pending.obligations.some(item => item.caseId.startsWith(`${n.pageB}.`)), false);
  assert.equal(pending.gaps.some(gap => gap.origin.endsWith(`#${FX.routes.sail}`) && gap.reason.startsWith('grant is not resolved')), true);

  // An unmapped grant refuses as well (d1_36).
  const map = structuredClone(FX.defs.find(([, ref]) => ref === FX.refs.authority)?.[2]);
  assert.ok(map);
  map.data.entries = (map.data.entries as Array<{ grantId: string }>).filter(entry => entry.grantId !== `${n.owner}Deck`);
  const unmapped = deriveCatalog(n.mod, units.map(unit => unit.defPath === FX.refs.authority ? { ...unit, definition: map } : unit.defPath === FX.refs.scope ? { ...unit, definition: FX.defs.find(([, ref]) => ref === FX.refs.scope)![2] } : unit), FX.texts);
  assert.equal(unmapped.obligations.some(item => item.caseId.startsWith(`${n.pageB}.`)), false);
  assert.equal(unmapped.gaps.some(gap => gap.reason.startsWith('AUTHORITY_UNMAPPED')), true);
});

void test('renamed fixture derives the same cases and no id reaches the derivation code', () => {
  const renamed = derive(fixture(RENAMED));
  const shape = (derived: DerivedCatalog) => derived.obligations.map(item => `${item.kind}:${item.identity}:${item.expect.status}:${item.expect.forbiddenPaths.length}:${item.expect.allowedPaths.length}`).sort();
  assert.deepEqual(shape(renamed), shape(DERIVED));
  const body = JSON.stringify(renamed.obligations) + JSON.stringify(renamed.catalog);
  for (const id of Object.values(BASE)) assert.equal(body.includes(id), false, id);
  for (const file of ['obligations.ts', 'derive.ts', 'fixture.ts', '../../helpers/l1Defs/fixture.ts']) {
    const source = readFileSync(join(HERE, file), 'utf8');
    for (const id of [...Object.values(BASE), ...Object.values(RENAMED).slice(1), 'agendaClinica', 'Consulta', 'profissional', 'paciente']) {
      assert.equal(source.includes(id), false, `${file} names ${id}`);
    }
  }
});

void test('a changed contract invalidates only the cases that read it', async () => {
  const before = await obligationSourceHashes(DERIVED.obligations, FX.texts);
  assert.equal(Object.values(before).includes('absent'), false);
  const texts = { ...FX.texts, [FX.refs.contractA]: `${FX.texts[FX.refs.contractA]}\n// edited\n` };
  const after = await obligationSourceHashes(DERIVED.obligations, texts);
  const stale = staleObligations(DERIVED.obligations, before, after);
  const expected = DERIVED.obligations.filter(item => item.sources.includes(FX.refs.contractA)).map(item => item.caseId);
  assert.deepEqual(stale, expected);
  assert.equal(stale.length > 0 && stale.length < DERIVED.obligations.length, true);
  assert.equal(stale.some(item => item.startsWith(`${FX.n.pageB}.`)), false);
  const missing = { ...FX.texts };
  delete missing[FX.refs.scope];
  assert.equal(staleObligations(DERIVED.obligations, before, await obligationSourceHashes(DERIVED.obligations, missing)).length, DERIVED.obligations.length);
});

void test('the oracle page requests materialize at structure inside their route grants (m1_41 P4)', async () => {
  for (const names of [BASE, RENAMED]) {
    const fx = fixture(names);
    // The oracle has no registration def (the derivation does not read one); the request service needs its
    // ports registered, so the test adds one for the oracle's own ports. Nothing else is added.
    const ports = fx.defs.map(([, , definition]) => definition).filter(definition => definition.artifactType === 'repositoryPort');
    const registration = { ...ports[0], artifactType: 'repositoryRegistration', artifactId: 'registerRepositories', dependencies: [],
      data: { registrationId: 'registerRepositories', adapters: ports.map(port => ({ portId: port.artifactId, adapterArtifactId: port.artifactId })) } };
    const modules = [...fx.defs.map(([, , definition]) => definition), ...fx.controllers.map(([, definition]) => definition), registration];
    const read = async (ref: string): Promise<string | null> => fx.texts[ref] ?? null;
    const services = fx.defs.filter(([id]) => id === 'implement.requestService');
    assert.equal(services.length, 2);
    for (const [, ref, definition] of services) {
      const emitted = await emitRequestService(definition, outputPathFromDefPath(ref), read, modules, 'structure');
      assert.equal('code' in emitted ? `${emitted.code}: ${emitted.detail}` : '', '', ref);
    }
    // The check bites: the related record on the deck list is outside the owner grant.
    const [, deckRef, deck] = services[1];
    const requests = (deck.data.requests as Array<Record<string, unknown>>).map(row => row.route !== fx.routes.roster ? row
      : { ...row, outputs: (row.outputs as Array<Record<string, unknown>>).map(out => ({ ...out, fields: [...(out.fields as string[]), `${names.related}.id`] })) });
    const wider = { ...deck, data: { ...deck.data, requests } };
    const refused = await emitRequestService(wider, outputPathFromDefPath(deckRef), read, modules.map(item => item === deck ? wider : item), 'structure');
    assert.equal('code' in refused && refused.detail, `DISCLOSURE_EXCEEDS_GRANT: ${fx.routes.roster} ${names.related}.id`);
  }
});
