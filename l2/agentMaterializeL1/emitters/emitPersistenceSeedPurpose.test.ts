/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitPersistenceSeedPurpose.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { emitPersistence, type ReferenceSeedDataset } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { SeedPurpose, TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

/** The emitted export is a `TableSeedRows` of the rt118 contract (`purpose` optional there, written here). */
function accepted(body: string): { seedFor: string; purpose: SeedPurpose } {
  const parsed: TableSeedRows = JSON.parse(body);
  assert.equal(parsed.purpose === 'initial' || parsed.purpose === 'test', true);
  assert.ok(Array.isArray(parsed.rows));
  return { seedFor: parsed.seedFor, purpose: parsed.purpose ?? 'test' };
}

test('seeds.ts marks initial rows from seedRows25 and test rows from the def, including a table with no scenario', async () => {
  const reference: ReferenceSeedDataset[] = [
    { seedFor: 'country', rows: [{ code: 'BR', name: 'Brazil' }] },
    { seedFor: 'privacyText', rows: [{ version: 1, title: 'Privacy' }] },
    { seedFor: 'zone', rows: [{ code: 'Z1' }] },
  ];
  const definition: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'persistenceSeeds',
    artifactId: 'seeds',
    moduleName: 'onboarding',
    status: 'pending',
    dependencies: [],
    data: {
      seedId: 'seeds',
      phase: 'plan',
      scenarios: [
        { scenarioId: 'maintainCountries', tableId: 'country', states: ['active'], entityId: 'Country' },
        { scenarioId: 'completeMyAccess', tableId: 'privacyText', states: [], entityId: 'PrivacyText' },
        { scenarioId: 'kept', tableId: 'noteKept', states: [] },
      ],
      datasets: [
        { datasetId: 'country', tableId: 'country', owners: ['maintainCountries'] },
        { datasetId: 'privacyText', tableId: 'privacyText', owners: ['completeMyAccess'] },
        { datasetId: 'fromDef', seedFor: 'noteKept', tableId: 'noteKept', rows: [{ id: 'kept' }] },
        { datasetId: 'orphan', seedFor: 'orphan', rows: [{ id: 'no-scenario' }] },
      ],
    },
  };
  const emitted = await emitPersistence(
    'persistence.persistenceSeeds',
    definition,
    '_102056_/l1/onboarding/layer_1_external/adapters/persistence/seeds.ts',
    async () => null,
    [],
    reference,
  );
  assert.ok(!('code' in emitted));
  if ('code' in emitted) return;
  const found = new Map<string, SeedPurpose>();
  for (const match of emitted.source.matchAll(/export const seedRows\d+ = (\{.*?\}) satisfies TableSeedRows;/g)) {
    const row = accepted(match[1]);
    found.set(row.seedFor, row.purpose);
  }
  assert.equal(found.get('country'), 'initial');
  assert.equal(found.get('privacyText'), 'initial');
  assert.equal(found.get('zone'), 'initial', 'initial rows ship without a seed scenario');
  assert.equal(found.get('noteKept'), 'test');
  assert.equal(found.has('orphan'), false, 'the scenario filter still drops def rows');
  const both = await emitPersistence(
    'persistence.persistenceSeeds',
    definition,
    '_102056_/l1/onboarding/layer_1_external/adapters/persistence/seeds.ts',
    async () => null,
    [],
    [...reference, { seedFor: 'noteKept', rows: [{ id: 'initialKept' }] }],
  );
  assert.ok(!('code' in both));
  if ('code' in both) return;
  const keptPurposes = [...both.source.matchAll(/export const seedRows\d+ = (\{.*?\}) satisfies TableSeedRows;/g)]
    .map(match => accepted(match[1]))
    .filter(row => row.seedFor === 'noteKept')
    .map(row => row.purpose)
    .sort();
  assert.deepEqual(keptPurposes, ['initial', 'test'], 'a table keeps both its initial rows and the test rows of the def');
  assert.match(emitted.source, /import type \{ TableSeedRows \} from '\/_102034_\/l1\/server\/layer_1_external\/persistence\/contracts\.js';/);
});
