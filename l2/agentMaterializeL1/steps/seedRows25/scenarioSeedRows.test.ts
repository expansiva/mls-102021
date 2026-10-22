/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/scenarioSeedRows.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { applySeedAnchors } from '/_102034_/l1/monitor/layer_3_usecases/testsUsecases.js';
import { draftScenarioRow, referenceSeedUnit, seedRowProblems, seedScenariosOf } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';
import { completeInitialRows } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.js';
import { takenSeedTables } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.js';

const TAREFAS = '/Volumes/WagnerSSD1/collab/mls-base/mls-102047';

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
