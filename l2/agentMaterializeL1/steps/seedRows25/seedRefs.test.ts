/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/seedRefs.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { draftScenarioRow, seedRowProblems, type SeedColumn, type SeedTableUnit } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';
import { pickRefValues } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.js';

const uuidColumn = (name: string): SeedColumn => ({ name, title: '', type: 'uuid', required: true, indexed: false, enumValues: [], pattern: '', maxLength: null, fields: [] });

function unit(constraints: string[], parentIds?: Record<string, string[]>): SeedTableUnit {
  return {
    scenarioId: 's1', scenarioIndex: 1, tableId: 'child', moduleName: 'demo', entityId: 'Child', description: '', createText: '', fieldsText: '',
    columns: [uuidColumn('parentId'), uuidColumn('otherId')], tableColumns: null, uniqueKeys: [], states: [], stateField: '', initialData: '',
    loadedBySeed: false, constraints, ...(parentIds ? { parentIds } : {}),
  };
}

void test('d1_312: parent with 2 rows, child with 3 scenarios — every ref is a parent id', () => {
  const parents = [{ id: 'p1', links: {} }, { id: 'p2', links: {} }];
  const rowsOf = (entity: string) => (entity === 'Parent' ? parents : []);
  const values = [1, 2, 3].map(index => pickRefValues([{ field: 'parentId', entity: 'Parent' }], index, rowsOf).parentId);
  assert.deepEqual(values, ['p1', 'p2', 'p1']);
});

void test('d1_312: audit → conversation → bot stay on one chain', () => {
  const bots = [{ id: 'b1', links: {} }, { id: 'b2', links: {} }];
  const conversations = [{ id: 'c1', links: { Bot: 'b2' } }, { id: 'c2', links: { Bot: 'b1' } }];
  const rowsOf = (entity: string) => (entity === 'Bot' ? bots : entity === 'Conversation' ? conversations : []);
  const pairs = [{ field: 'botId', entity: 'Bot' }, { field: 'conversationId', entity: 'Conversation' }];
  for (const index of [1, 2, 3]) {
    const values = pickRefValues(pairs, index, rowsOf);
    const conversation = conversations.find(item => item.id === values.conversationId);
    assert.ok(conversation);
    assert.equal(values.botId, conversation.links.Bot, `scenario ${index}`);
  }
});

void test('d1_312: no parent row — no value, never an invented uuid; the gate names it', async () => {
  assert.deepEqual(pickRefValues([{ field: 'parentId', entity: 'Parent' }], 1, () => []), {});
  const loose = unit(['ref:parentId:Parent'], { Parent: [] });
  const drafted = await draftScenarioRow(loose, {});
  assert.ok('problems' in drafted);
  assert.ok(drafted.problems.some(problem => problem.includes('misses constraint ref:parentId:Parent')));
});

void test('d1_312: the gate refuses a ref that is not the id of a parent row; platform parents keep the old rule', async () => {
  const withParents = unit(['ref:parentId:Parent'], { Parent: ['p1'] });
  const ok = await draftScenarioRow(withParents, { parentId: 'p1' });
  assert.ok('row' in ok);
  const refused = seedRowProblems(withParents, [{ ...ok.row, parentId: 'someone-else' }]);
  assert.ok(refused.some(problem => problem.includes('is not the id of a Parent row of this seed')));
  const platform = unit(['ref:parentId:Person'], { Parent: ['p1'] });
  const drafted = await draftScenarioRow(platform, {});
  assert.ok('row' in drafted, 'problems' in drafted ? drafted.problems.join('; ') : '');
});
