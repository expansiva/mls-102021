/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/removals.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { applyStructuralRemoval, citesRemoval, structuralRemoval } from '/_102021_/l2/agentNewReleaseL1/helpers/removals.js';
import type { L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

function definition(data: Record<string, unknown>): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'domainEntity',
    artifactId: 'sample',
    moduleName: 'sample',
    status: 'pending',
    dependencies: [],
    data,
  };
}

test('structuralRemoval reads the id from before and ignores other ops', () => {
  const field: L4DiffItem = { changeId: 'field:a.b', kind: 'field', op: 'removed', entity: '', source: '', before: { fieldId: 'a.b' } };
  assert.deepEqual(structuralRemoval(field), { kind: 'field', fieldId: 'a.b' });
  assert.equal(structuralRemoval({ ...field, op: 'changed' }), null);
  const step: L4DiffItem = { changeId: 'step:j/s', kind: 'step', op: 'removed', entity: '', source: '', before: { journeyId: 'j', stepId: 's' } };
  assert.deepEqual(structuralRemoval(step), { kind: 'step', journeyId: 'j', stepId: 's' });
});

test('a field row is removed and a leftover column still cites the field', () => {
  const removal = { kind: 'field' as const, fieldId: 'details.etiquetas' };
  const entity = definition({
    fields: [
      { name: 'details.descricao', type: 'text' },
      { name: 'details.etiquetas', type: 'string' },
    ],
  });
  const before = JSON.stringify(entity.data);
  assert.equal(applyStructuralRemoval(entity, 'entity', removal), true);
  assert.equal(citesRemoval(entity, removal), false);
  const kept = JSON.parse(before) as { fields: Array<Record<string, unknown>> };
  kept.fields = kept.fields.filter(row => row.name !== 'details.etiquetas');
  assert.equal(JSON.stringify(entity.data), JSON.stringify(kept));

  const repository = definition({
    columns: [{ field: 'details.etiquetas', column: 'json:details.etiquetas' }, { field: 'titulo', column: 'titulo' }],
  });
  assert.equal(applyStructuralRemoval(repository, 'repository', removal), true);
  assert.equal(citesRemoval(repository, removal), false);
  assert.deepEqual(repository.data.columns, [{ field: 'titulo', column: 'titulo' }]);
  const leftover = definition({ columns: [{ column: 'etiquetas' }] });
  assert.equal(applyStructuralRemoval(leftover, 'repository', removal), true);
  assert.equal(citesRemoval(leftover, removal), true);
  assert.equal(applyStructuralRemoval(repository, 'usecase', removal), false);
});

test('a journey clears its scenario and a step clears only its fixture string', () => {
  const seeds = definition({
    scenarios: [
      { scenarioId: 'keep', source: 'journey:keep' },
      { scenarioId: 'gone', source: 'journey:gone' },
    ],
    datasets: [{ owners: ['keep', 'gone'] }],
    fixture: { sourceRefs: ['journey:gone/one', 'journey:gone/two', 'journey:keep/one'] },
  });
  const journey = { kind: 'journey' as const, journeyId: 'gone' };
  assert.equal(applyStructuralRemoval(seeds, 'seeds', journey), true);
  assert.deepEqual(seeds.data.scenarios, [{ scenarioId: 'keep', source: 'journey:keep' }]);
  assert.deepEqual((seeds.data.datasets as Array<{ owners: string[] }>)[0]!.owners, ['keep']);
  assert.deepEqual((seeds.data.fixture as { sourceRefs: string[] }).sourceRefs, ['journey:keep/one']);
  assert.equal(citesRemoval(seeds, journey), false);

  const stepped = definition({
    scenarios: [{ scenarioId: 'gone', source: 'journey:gone' }],
    datasets: [{ owners: ['gone'] }],
    fixture: { sourceRefs: ['journey:gone/one', 'journey:gone/two'] },
  });
  const step = { kind: 'step' as const, journeyId: 'gone', stepId: 'one' };
  assert.equal(applyStructuralRemoval(stepped, 'seeds', step), true);
  assert.equal((stepped.data.scenarios as unknown[]).length, 1);
  assert.deepEqual((stepped.data.datasets as Array<{ owners: string[] }>)[0]!.owners, ['gone']);
  assert.deepEqual((stepped.data.fixture as { sourceRefs: string[] }).sourceRefs, ['journey:gone/two']);
  assert.equal(citesRemoval(stepped, step), false);
});
