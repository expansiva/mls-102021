/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/arrivalUpsert.test.ts" enhancement="_blank"/>

// d1_232 s2: a process started by an arrival that creates and updates an entity writes it by find, then update or create. The file of today
// (copy of the 102047 workflow, in fixtures/) creates a new record with `update`: refused.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { arrivalUpsertProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { processUpserts, workflowFacts } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

const PROJECT = 102099;
const MODULE = 'agents';
const TODAY = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/toolCatalogRefreshToday.recorded.txt'), 'utf8');

function processUnit(operations: Array<{ operation: string; steps: string[] }>): M12Unit {
  const data = { processId: 'catalogRefresh', trigger: { kind: 'event', event: 'platform.releaseCatalogChanged' }, functions: ['applyReleaseCatalog'], operations, occurrence: { entityId: 'Tool' } };
  const definition = { artifactType: 'workflowProcess', artifactId: 'catalogRefresh', moduleName: MODULE, data, dependencies: [] as string[], text: '' };
  return { definition, declared: definition, unitId: 'catalogRefresh', outputRef: '', defRef: '', text: '' } as unknown as M12Unit;
}

const ONTOLOGY = `export const entity = ${JSON.stringify({ entityId: 'Tool', uniqueKeys: [['toolKey']], record: { fields: { id: {}, toolKey: {} } } })} as const;\n`;
const ctx = { run: { project: PROJECT, module: MODULE }, units: [], read: async (ref: string) => (ref.replace(/^\//u, '') === `_${PROJECT}_/l4/${MODULE}/ontology/Tool.defs.ts` ? ONTOLOGY : null) } as never;

void test('d1_232: the process of an arrival that creates and updates Tool has the upsert with the key of the ontology; one that only has its tasks does not', async () => {
  const both = workflowFacts(processUnit([
    { operation: 'Tool.create', steps: ['arrival:platform.releaseCatalogChanged'] },
    { operation: 'Tool.update', steps: ['task:rebuild', 'arrival:platform.releaseCatalogChanged'] },
  ]));
  assert.deepEqual(await processUpserts(ctx, both), [{ entityId: 'Tool', key: ['toolKey'], keyKind: 'unique' }]);
  const tasksOnly = workflowFacts(processUnit([{ operation: 'Tool.create', steps: ['task:a'] }, { operation: 'Tool.update', steps: ['task:b'] }]));
  assert.deepEqual(await processUpserts(ctx, tasksOnly), [], 'create and update from tasks are not an arrival upsert');
  const oneSide = workflowFacts(processUnit([{ operation: 'Tool.update', steps: ['arrival:platform.releaseCatalogChanged'] }]));
  assert.deepEqual(await processUpserts(ctx, oneSide), []);
});

void test('d1_232: the workflow file of today writes a new tool with update and never creates: refused; the same file creating the new tool passes', async () => {
  const upserts = await processUpserts(ctx, workflowFacts(processUnit([
    { operation: 'Tool.create', steps: ['arrival:platform.releaseCatalogChanged'] },
    { operation: 'Tool.update', steps: ['arrival:platform.releaseCatalogChanged'] },
  ])));
  const refused = arrivalUpsertProblems(TODAY, upserts, 'process', 'the process catalogRefresh');
  assert.deepEqual(refused.map(item => item.split(':')[0]), ['ARRIVAL_UPSERT_NEVER_CREATES']);
  assert.equal(TODAY.includes('await toolRepository.update(created);'), true, 'the fixture is the file of today');
  const fixed = TODAY.replace('await toolRepository.update(created);', 'await toolRepository.create(created);');
  assert.deepEqual(arrivalUpsertProblems(fixed, upserts, 'process', 'the process catalogRefresh'), []);
});
