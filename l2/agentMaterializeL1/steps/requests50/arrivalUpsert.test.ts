/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/arrivalUpsert.test.ts" enhancement="_blank"/>

// d1_232 s2: the route of an arrival that creates and updates one entity looks the record up by its key; the prompt says so and the gate checks it.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { arrivalUpsertProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { routeUpsertsOf, upsertSection } from '/_102021_/l2/agentMaterializeL1/steps/requests50/arrivalUpsert.js';
import { loadRequestContext, requestGate } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
const CATALOG = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
const CATALOG_REF = '_102034_/l2/shared/contracts/connections/cm.ts';
const PROJECT = 102099;
const MODULE = 'agents';

function ontology(extra: Record<string, unknown>): string {
  return `export const entity = ${JSON.stringify({ entityId: 'Thing', record: { fields: { id: {}, name: {} } }, ...extra })} as const;\n`;
}

function integration(line: Record<string, unknown>): string {
  return `export const agentsIntegration = ${JSON.stringify({ connections: [{ connectionId: 'cm', operationId: 'record', direction: 'serve', usedBy: ['Records it.'], description: 'Records.', ...line }] })} as const;\n`;
}

void test('d1_232: the upserts of a line are the entities it creates and updates, with the key of the ontology', async () => {
  const read = async (entityId: string) => (entityId === 'Item' ? ontology({ uniqueKeys: [['itemKey']] }) : entityId === 'Plain' ? ontology({}) : null);
  const line = { entityEffects: [{ entityId: 'Item', effects: ['create', 'update'] }, { entityId: 'Plain', effects: ['create', 'update'] }, { entityId: 'Missing', effects: ['create', 'update'] }, { entityId: 'Solo', effects: ['create'] }] };
  assert.deepEqual(await routeUpsertsOf('r', line, 'serve', read), [
    { route: 'r', entityId: 'Item', key: ['itemKey'], keyKind: 'unique' },
    { route: 'r', entityId: 'Plain', key: ['id'], keyKind: 'id' },
  ]);
  assert.deepEqual(await routeUpsertsOf('r', null, 'serve', read), []);
  assert.deepEqual(await routeUpsertsOf('r', { entityEffects: [] }, 'inbound', read), []);
  assert.match(upsertSection(await routeUpsertsOf('r', line, 'serve', read)), /found by its unique key \(`itemKey`\)[\s\S]*found by its id \(`id`\)[\s\S]*Never create through the update usecase/);
});

void test('d1_232: a route that calls both usecases and never looks the record up is refused; one that looks it up passes', () => {
  const upserts = [{ entityId: 'Item', key: ['itemKey'], keyKind: 'unique' }];
  const blind = "async (input, ctx) => { await createItem(input, ctx); await updateItem(input, ctx); return {}; }";
  const refused = arrivalUpsertProblems(blind, upserts, 'route', 'route agents.cm.record');
  assert.equal(refused.length, 1);
  assert.match(refused[0], /^ARRIVAL_UPSERT_WITHOUT_LOOKUP: route agents\.cm\.record creates or updates Item found by its unique key \(itemKey\).*`list`/);
  const seeing = "async (input, ctx) => { const items = await repository.list({ itemKey: input.key }); return items.length ? updateItem({ ...input, id: items[0].id }, ctx) : createItem(input, ctx); }";
  assert.deepEqual(arrivalUpsertProblems(seeing, upserts, 'route', 'route r'), []);
  assert.equal(arrivalUpsertProblems("async () => { /* repository.list(x) */ const note = 'repository.get(x)'; return {}; }", upserts, 'route', 'route r').length, 1, 'a comment or a string is not a lookup');
  assert.match(arrivalUpsertProblems(blind, [{ entityId: 'Plain', key: ['id'], keyKind: 'id' }], 'route', 'r')[0], /found by its id \(id\).*`get`/);
  assert.deepEqual(arrivalUpsertProblems(blind, [], 'route', 'r'), []);
});

void test('d1_232: a process that finds the record and then only updates is refused: a record that is not there is created', () => {
  const upserts = [{ entityId: 'Item', key: ['itemKey'], keyKind: 'unique' }];
  const onlyUpdate = "const found = await repository.list({}); if (!found.length) { await repository.update(record); } else { await repository.update({ ...found[0], ...record }); }";
  const refused = arrivalUpsertProblems(onlyUpdate, upserts, 'process', 'the process');
  assert.deepEqual(refused.map(item => item.split(':')[0]), ['ARRIVAL_UPSERT_NEVER_CREATES']);
  const both = "const found = await repository.list({}); if (!found.length) { await repository.create(record); } else { await repository.update({ ...found[0], ...record }); }";
  assert.deepEqual(arrivalUpsertProblems(both, upserts, 'process', 'the process'), []);
  assert.deepEqual(arrivalUpsertProblems('await repository.create(record);', upserts, 'process', 'p').map(item => item.split(':')[0]), ['ARRIVAL_UPSERT_WITHOUT_LOOKUP']);
});

void test('d1_232: the request context of a serve route of an upsert says how to find the record and carries it to the gate', async () => {
  const definition = {
    artifactType: 'requestService', artifactId: 'cm', moduleName: MODULE, dependencies: [] as string[], text: '',
    data: { pageId: 'cm', requests: [{ route: `${MODULE}.cm.record`, serves: 'cm.record', uses: [] }] },
  };
  const unit = { definition, declared: definition, outputRef: `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.ts`, defRef: `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.defs.ts`, output: { project: PROJECT, level: 1, folder: '', shortName: 'cm', extension: '.ts' }, unitId: 'cm', text: '' } as unknown as M12Unit;
  const l4 = integration({ entityEffects: [{ entityId: 'Thing', effects: ['create', 'update'] }] });
  const read = async (ref: string) => {
    const key = ref.replace(/^\//u, '');
    if (key === CATALOG_REF) return CATALOG;
    if (key === `_${PROJECT}_/l4/${MODULE}/integration.defs.ts`) return l4;
    if (key === `_${PROJECT}_/l4/${MODULE}/ontology/Thing.defs.ts`) return ontology({ uniqueKeys: [['name']] });
    return null;
  };
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [unit], read } as never, unit);
  assert.deepEqual(loaded.arrivalUpserts, [{ route: `${MODULE}.cm.record`, entityId: 'Thing', key: ['name'], keyKind: 'unique' }]);
  assert.match(loaded.human, /## Upserts of the routes[\s\S]*agents\.cm\.record: Thing is created or updated, found by its unique key \(`name`\)/);
  const plain = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [unit], read: async (ref: string) => (ref.replace(/^\//u, '') === CATALOG_REF ? CATALOG : ref.includes('integration') ? integration({ entityEffects: [{ entityId: 'Thing', effects: ['create'] }] }) : null) } as never, unit);
  assert.deepEqual(plain.arrivalUpserts, []);
  assert.equal(plain.human.includes('Upserts of the routes'), false);
  const gate = { header: loaded.human.split('\n')[0], contractsInterface: loaded.contractsInterface, routes: loaded.routes, project: PROJECT, moduleName: MODULE, pageId: 'cm', waived: new Set<string>() };
  const body = (inner: string) => `export const requests = { '${MODULE}.cm.record': async (input, ctx) => { ${inner} } };\n`;
  const blind = requestGate(body('return { status: "recorded" };'), { ...gate, arrivalUpserts: loaded.arrivalUpserts }).filter(item => item.startsWith('ARRIVAL_'));
  assert.equal(blind.length, 1);
  const seeing = requestGate(body('const rows = await repo.list({ name: input.executionId }); return { status: rows.length ? "existing" : "recorded" };'), { ...gate, arrivalUpserts: loaded.arrivalUpserts }).filter(item => item.startsWith('ARRIVAL_'));
  assert.deepEqual(seeing, []);
});
