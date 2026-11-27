/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/scenarioSeedRows.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { tarefasTree } from '/_102021_/l2/agentMaterializeL1/testing/tarefasFixture.js';
import { applySeedAnchors } from '/_102034_/l1/monitor/layer_3_usecases/testsUsecases.js';
import { draftScenarioRow, referenceSeedUnit, seedRowProblems, seedScenariosOf } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';
import { completeInitialRows } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.js';
import { takenSeedTables } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.js';

const TAREFAS = tarefasTree();

test('a tarefas read-by-id scenario row is the id the generated case cites', async () => {
  const plan = readFileSync(path.join(TAREFAS, 'l1/tarefas/layer_1_external/adapters/persistence/seeds.ts'), 'utf8');
  const start = plan.indexOf('export const seedPlan = ');
  const end = plan.indexOf('} as const;', start);
  assert.ok(start >= 0 && end > start);
  const scenarios = seedScenariosOf(JSON.parse(plan.slice(start + 'export const seedPlan = '.length, end + 1)));
  const scenario = scenarios.find(item => item.entityId === 'AvisoVencimento' && item.tableId === 'avisoVencimento');
  assert.ok(scenario);
  const ontology = readFileSync(path.join(TAREFAS, 'l4/tarefas/ontology/AvisoVencimento.defs.ts'), 'utf8');
  const draft = referenceSeedUnit({
    scenarioId: scenario.scenarioId,
    tableId: scenario.tableId,
    ontologySource: ontology,
    states: scenario.states,
    stateField: scenario.stateField,
    requireInitial: false,
    constraints: scenario.constraints,
  });
  assert.ok(draft);
  assert.equal(draft.loadedBySeed, false);
  const drafted = await draftScenarioRow(draft);
  assert.ok('row' in drafted, 'problems' in drafted ? drafted.problems.join('; ') : '');
  const completed = await completeInitialRows(draft, [drafted.row]);
  assert.ok('rows' in completed);
  const row = completed.rows[0];
  assert.equal('purpose' in row, false);
  assert.match(String(row.id), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  const pageTest = readFileSync(path.join(TAREFAS, 'l1/tarefas/layer_1_external/adapters/http/controllers/meus_avisos.test.ts'), 'utf8');
  const cited = /"id": "qryAvisoPorId\.existente"[\s\S]*?"params": \{[\s\S]*?"id": "(<seedRef>)"[\s\S]*?"paramFieldRefs": \{[\s\S]*?"id": "(AvisoVencimento\.id)"/u.exec(pageTest);
  assert.ok(cited);
  assert.equal(cited[1], '<seedRef>');
  assert.equal(cited[2], `${draft.entityId}.id`);
  assert.equal(row.id, completed.rows[0].id);

  const outside = { ...drafted.row, status: 'outside' };
  const refused = seedRowProblems(draft, [outside]);
  assert.ok(refused.some(problem => problem.includes('not in this scenario')));
  const missingRef = { ...drafted.row, responsavelId: '' };
  const missing = seedRowProblems(draft, [missingRef]);
  assert.ok(missing.some(problem => problem.includes('misses constraint ref:responsavelId:MembroEquipe')));
});

test('a scenario for a table with an initial row does not add a test row; <seedRef> is that initial primary key', () => {
  const initial = { versionCode: '1.0', purpose: 'initial' };
  const scenario = { versionCode: 'onboarding.privacyText.completeMyAccess.', purpose: 'test' };
  const prior: unknown[] = [];
  const reference = [{ seedFor: 'privacyText', rows: [initial] }];
  const scenarioDatasets = [
    { seedFor: 'privacyText', rows: [scenario] },
    { seedFor: 'noteKept', rows: [{ id: 'kept' }] },
  ];
  const taken = takenSeedTables(prior, reference);
  assert.equal(taken.has('privacyText'), true);
  assert.equal(taken.has('noteKept'), false);
  const appended = scenarioDatasets.filter(item => !taken.has(item.seedFor));
  assert.deepEqual(appended.map(item => item.seedFor), ['noteKept']);
  const shipped = [
    { seedFor: 'privacyText', purpose: 'initial' as const, rows: [initial] },
    ...appended,
  ];
  assert.equal(shipped.some(item => item.seedFor === 'privacyText' && item.purpose === 'test'), false);
  const privacy = shipped.find(item => item.seedFor === 'privacyText');
  assert.ok(privacy);
  const pool: Record<string, unknown> = {};
  applySeedAnchors(pool, {
    entity: 'PrivacyText',
    fieldId: 'versionCode',
    seedRowIds: privacy.rows.map(row => row.versionCode),
    seedRows: privacy.rows,
    pkColumn: 'versionCode',
  });
  assert.equal(pool['PrivacyText.versionCode'], '1.0');
});

test('an external entity has no seed rows: no unit, with or without initialData', () => {
  const source = (kind: string): string => `export const catalogo = { "entityId": "Catalogo", "kind": "${kind}", "description": "Data outside the module.", "initialData": "rows to help fill the DB", "record": { "fields": { "code": { "type": "string", "required": true } } } } as const;\n`;
  const base = { scenarioId: 'initial', tableId: 'catalogo', states: [], stateField: '' };
  assert.equal(referenceSeedUnit({ ...base, ontologySource: source('external') }), null);
  assert.equal(referenceSeedUnit({ ...base, ontologySource: source('external'), requireInitial: false }), null);
  assert.equal(referenceSeedUnit({ ...base, ontologySource: source('entity') })?.entityId, 'Catalogo');
});

// d1_342: repoHost, `repositoryEntry.parentEntryId` points at the entity itself (a folder inside a folder).
const ENTRY_ONTOLOGY = readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../agentDefsL1/fixtures/repoHost-74f17ca3/l4/repoHost/ontology/RepositoryEntry.defs.txt'), 'utf8');

function entryUnit(source: string, parentIds: string[]) {
  const unit = referenceSeedUnit({ scenarioId: 'folder', tableId: 'repositoryEntry', ontologySource: source, states: [], stateField: '', requireInitial: false, constraints: ['ref:parentEntryId:RepositoryEntry'] });
  assert.ok(unit);
  return { ...unit, parentIds: { RepositoryEntry: parentIds } };
}

test('d1_342: the first row of a self-referencing table is the root; the next ones point at it', async () => {
  const first = await draftScenarioRow(entryUnit(ENTRY_ONTOLOGY, []));
  assert.ok('row' in first, 'problems' in first ? first.problems.join('; ') : '');
  assert.equal(first.row.parentEntryId, undefined, 'the root has no parent: the l4 says empty for the root');
  const second = await draftScenarioRow(entryUnit(ENTRY_ONTOLOGY, ['11111111-1111-4111-8111-111111111111']), { parentEntryId: '11111111-1111-4111-8111-111111111111' });
  assert.ok('row' in second, 'problems' in second ? second.problems.join('; ') : '');
  assert.equal(second.row.parentEntryId, '11111111-1111-4111-8111-111111111111');
});

test('d1_342: a required self reference with no root is a named problem, and a made-up id is still refused', async () => {
  const required = ENTRY_ONTOLOGY.replace(/("parentEntryId": \{\s*"type": "record",)/u, '$1\n        "required": true,');
  assert.notEqual(required, ENTRY_ONTOLOGY);
  const drafted = await draftScenarioRow(entryUnit(required, []));
  assert.ok('problems' in drafted);
  assert.match(drafted.problems.join(' '), /points at itself, so the first row has no root/u);
  const invented = seedRowProblems(entryUnit(ENTRY_ONTOLOGY, ['11111111-1111-4111-8111-111111111111']), [{ parentEntryId: '22222222-2222-4222-8222-222222222222' }]);
  assert.match(invented.join(' '), /is not the id of a RepositoryEntry row of this seed/u);
});
