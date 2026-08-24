/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbFindingSeverity.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findingSeverity, isOmittablePolicyFinding, isSeedFinding, partitionFindings,
} from './cbFindingSeverity.js';

// Byte-for-byte the 6 findings of run06's terminal validate-all (cb-health-report.json
// savedAt 2026-08-24T01:56:08.777Z, outcome failed). Structural: orphan controller/usecase pair + compilers.
const RUN06_FINDINGS = [
  "controller serviceexecutioncatalogue -> usecase export 'updateServiceExecution' not found (has: createPet, deleteAppointment, createServiceOffering, createCustomer, handoffToAppointment, inspectAppointments, inactivateCustomer, deleteAvailabilityBlock, deleteServiceExecution, createAvailabilityBlock, createBusinessHours, inactivateBusinessHours, decideAppointment, inactivatePet, inspectInstitutionalHome, inactivateServiceOffering, inspectPendingItems, inspectServiceExecutions, listAppointment, createAppointment)",
  "import unresolved -> petShop/layer_1_external/adapters/http/controllers/serviceExecutionCatalogue.ts imports '_102047_/l1/petShop/layer_2_application/usecases/updateServiceExecution' which was not generated",
  "compiler -> petShop/layer_2_application/usecases/updatePet.ts: TS2339: Property 'petId' does not exist on type 'never'.",
  "compiler -> petShop/layer_2_application/usecases/updatePet.ts: TS2339: Property 'name' does not exist on type 'never'.",
  "compiler -> petShop/layer_2_application/usecases/updatePet.ts: TS2339: Property 'status' does not exist on type 'never'.",
  "compiler -> petShop/layer_1_external/adapters/http/controllers/serviceExecutionCatalogue.ts: TS2792: Cannot find module '/_102047_/l1/petShop/layer_2_application/usecases/updateServiceExecution.js'. Keep the '/_<project>_/l1/...' alias import exactly as in the context files — NEVER rewrite it as a relative path; the alias resolves once the target module is materialized.",
];

// Seed give-up / empty-by-design family (run05/06 cascade). These used to be able to hold the whole run.
const SEED_GIVEUP_FINDINGS = [
  'compiler -> petShop/layer_1_external/adapters/persistence/seeds.ts: TS2322: Type \'{ id: string; }\' is not assignable to type \'TableSeedRows\'.',
  "persistence policy: entity 'Pet' declares storage.target 'mdm' -> local seed rows (master data belongs to mdmEntities) forbidden; master data is owned by 102034 and written through ctx.mdm (no local entity/port/adapter/table)",
  'SEED WAVE 6 SKIPPED (validation failed after 2/2; seeded EMPTY by design: tables [inStorePayment, petServiceOverview], MDM [Pet, BusinessHours]): usecases call ctx.mdm for petShop.Pet but the plan has no MDM row with that tag',
  'SEEDS-ENVIRONMENT-FAILURE: seeds.ts is written whole by this agent (the model only plans data rows), so the module(s) below failing to resolve is an environment fault — no seed replan can fix it, and the partial seeds.ts on disk is preserved. It already failed a compile retry; check that project\'s files are available to this Studio session.',
];

test('run06 controller/usecase pair + compilers stay BLOCKING', () => {
  for (const finding of RUN06_FINDINGS) {
    assert.equal(findingSeverity(finding), 'blocking', finding);
  }
  const { blocking, degradable } = partitionFindings(RUN06_FINDINGS);
  assert.equal(blocking.length, 6);
  assert.equal(degradable.length, 0);
});

test('run05/06 seed give-up family DEGRADES (health passed-degraded)', () => {
  for (const finding of SEED_GIVEUP_FINDINGS) {
    assert.equal(findingSeverity(finding), 'degradable', finding);
    assert.equal(isSeedFinding(finding), true, finding);
  }
  const { blocking, degradable } = partitionFindings(SEED_GIVEUP_FINDINGS);
  assert.equal(blocking.length, 0);
  assert.equal(degradable.length, SEED_GIVEUP_FINDINGS.length);
});

test('empty findings pass; mix with run06 still fails', () => {
  assert.deepEqual(partitionFindings([]), { blocking: [], degradable: [] });
  const mixed = partitionFindings([...SEED_GIVEUP_FINDINGS, RUN06_FINDINGS[0]]);
  assert.equal(mixed.blocking.length, 1);
  assert.equal(mixed.degradable.length, SEED_GIVEUP_FINDINGS.length);
});

test('omittable policy is adapter/port/domain/seed rows; a leaked TABLE stays blocking', () => {
  const table = "persistence policy: entity 'InstitutionalHome' declares storage.target 'derived' -> local persistence artifact institutionalhome.defs.ts forbidden; the l4 declares it COMPUTED, with no persistence of its own — the read query materializes it (no table, no seeds)";
  const adapter = "persistence policy: entity 'PendingItem' declares storage.target 'derived' -> local persistence artifact pendingitemrepositoryadapter.defs.ts forbidden; the l4 declares it COMPUTED, with no persistence of its own — the read query materializes it (no table, no seeds)";
  const port = "persistence policy: entity 'PendingItem' declares storage.target 'derived' -> local port PendingItemRepository.defs.ts forbidden; the l4 declares it COMPUTED, with no persistence of its own — the read query materializes it (no table, no seeds)";
  assert.equal(isOmittablePolicyFinding(table), false);
  assert.equal(findingSeverity(table), 'blocking');
  assert.equal(isOmittablePolicyFinding(adapter), true);
  assert.equal(isOmittablePolicyFinding(port), true);
  assert.equal(findingSeverity('table without primary key -> petShop/.../institutionalHome.defs.ts declares primaryKey: [] and cannot be published; derive it from the l4 storage.idField (or, for an entity that should not have a table at all, remove the table)'), 'blocking');
  assert.equal(findingSeverity('composition root missing -> registerRepositories.ts absent though 7 repository adapter(s) exist (102034 resolveRepository will 500)'), 'blocking');
});
