/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/externalEnums.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { catalogFieldUnion } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import {
  enumFieldValues,
  enumMapProblems,
  enumMapSection,
  externalEnumPairs,
  unpairedProblems,
  type ExternalEnumPair,
} from '/_102021_/l2/agentMaterializeL1/helpers/externalEnums.js';
import { requestGate } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const CM = readFileSync(fileURLToPath(new URL('../../../../mls-102034/l2/shared/contracts/connections/cm.ts', import.meta.url)), 'utf8');
const CATALOG_REF = '/_102034_/l2/shared/contracts/connections/cm.ts';

function ontology(values: string[]): string {
  const entity = { entityId: 'Sim', kind: 'external', connectionId: 'cm', record: { fields: {
    level: { type: 'enum', values: values.map(value => ({ value, title: value })) },
    name: { type: 'string' },
  } } };
  return `export const sim = ${JSON.stringify(entity)} as const;\n`;
}

function ctxWith(values: string[]): never {
  const units = [
    { unitId: 'sim', definition: { artifactType: 'domainEntity', artifactId: 'Sim', data: { entityId: 'Sim', storageTarget: 'external' } } },
    { unitId: 'listSim', definition: { artifactType: 'usecase', artifactId: 'listSim', data: { usecaseId: 'listSim', entityId: 'Sim', operation: 'list' } } },
    { unitId: 'outbound', definition: { artifactType: 'integrationOutbound', artifactId: 'outbound', data: { connections: [{ connectionId: 'cm', operationId: 'simulateAgent', consumer: 'listSim', entityRefs: ['Sim'] }] } } },
  ];
  const all: Record<string, string> = { [CATALOG_REF]: CM, '_7_/l4/agents/ontology/Sim.defs.ts': ontology(values) };
  return { run: { project: 7, module: 'agents' }, units, read: async (ref: string) => all[ref] ?? all[ref.replace(/^\//u, '')] ?? null } as never;
}

const sim = (ctx: never) => (ctx as { units: Array<{ unitId: string }> }).units.filter(unit => unit.unitId === 'listSim') as never;

void test('d1_198: the union of a catalog member is read, inline or through an alias', () => {
  assert.deepEqual(catalogFieldUnion(CM, 'CmSimulateAgentInput', 'level'), ['canDo', 'understands']);
  assert.deepEqual(catalogFieldUnion(CM, 'CmSimulateAgentOutput', 'level'), ['canDo', 'understands']);
  assert.deepEqual(catalogFieldUnion(CM, 'CmSimulateAgentInput', 'agentId'), []);
  assert.deepEqual(catalogFieldUnion("export interface T {\n  mode: 'a' | 'b' | 'c';\n}\n", 'T', 'mode'), ['a', 'b', 'c']);
  assert.deepEqual(catalogFieldUnion(CM, 'CmNoSuchType', 'level'), []);
});

void test('d1_198: the enum fields of an L4 entity are read with their values', () => {
  assert.deepEqual([...enumFieldValues(ontology(['x', 'y']))], [['level', ['x', 'y']]]);
  assert.deepEqual([...enumFieldValues(null)], []);
});

void test('d1_198: different unions of the same size are a pair on the input and on the output; the same union is none', async () => {
  const pairs = await externalEnumPairs(ctxWith(['whatItCan', 'whatItUnderstands']), sim(ctxWith([])));
  assert.deepEqual(pairs.map(pair => `${pair.side}:${pair.field}`).sort(), ['input:level', 'output:level']);
  assert.deepEqual(pairs[0].moduleValues, ['whatItCan', 'whatItUnderstands']);
  assert.deepEqual(pairs[0].catalogValues, ['canDo', 'understands']);
  assert.deepEqual(unpairedProblems(pairs), []);
  assert.match(enumMapSection(pairs), /Record<From, To>/);
  assert.match(enumMapSection(pairs), /'whatItCan' \| 'whatItUnderstands' → catalog values|module values 'whatItCan' \| 'whatItUnderstands' → catalog values 'canDo' \| 'understands'/);
  assert.deepEqual(await externalEnumPairs(ctxWith(['understands', 'canDo']), sim(ctxWith([]))), []);
});

void test('d1_198: a different count of values is EXTERNAL_ENUM_UNPAIRED with the values of each side', async () => {
  const pairs = await externalEnumPairs(ctxWith(['a', 'b', 'c']), sim(ctxWith([])));
  const problems = unpairedProblems(pairs);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /^EXTERNAL_ENUM_UNPAIRED: Sim\.level has 3 values in the module \('a' \| 'b' \| 'c'\) and 2 in cm\.simulateAgent CmSimulateAgentInput \('canDo' \| 'understands'\)/);
});

const INPUT_PAIR: ExternalEnumPair = { usecaseId: 'listSim', entityId: 'Sim', connectionId: 'cm', operationId: 'simulateAgent', field: 'level', side: 'input', catalogType: 'CmSimulateAgentInput', moduleValues: ['whatItCan', 'whatItUnderstands'], catalogValues: ['canDo', 'understands'] };
const OUTPUT_PAIR: ExternalEnumPair = { ...INPUT_PAIR, side: 'output', catalogType: 'CmSimulateAgentOutput' };

// d1_256: the code calls the usecase (the input side: the module value goes in) and reads the field of the answer (the output side).
const SENDS = 'const answer = await listSim({ level: input.level }, ctx);\n';
const READS = 'const shown = answer.level;\n';

void test('d1_198/d1_256: the gate accepts a typed one to one map and refuses a missing, partial or repeated one, for the direction the code uses', () => {
  const good = "const LEVEL: Record<'whatItCan' | 'whatItUnderstands', ListSimInput['level']> = { whatItCan: 'canDo', whatItUnderstands: 'understands' };\n";
  assert.deepEqual(enumMapProblems(`${good}${SENDS}`, [INPUT_PAIR]), []);
  assert.match(enumMapProblems(SENDS, [INPUT_PAIR])[0], /Write the typed map module → catalog/);
  assert.match(enumMapProblems(`const L = { whatItCan: 'canDo', whatItUnderstands: 'canDo' };\n${SENDS}`, [INPUT_PAIR])[0], /not one to one/);
  assert.match(enumMapProblems(`const L = { whatItCan: 'canDo', whatItUnderstands: 'other' };\n${SENDS}`, [INPUT_PAIR])[0], /'other', which is not one of/);
  assert.match(enumMapProblems(`const L = { whatItCan: 'canDo' };\n${SENDS}`, [INPUT_PAIR])[0], /Write the typed map/);
  const back = "const BACK = { canDo: 'whatItCan', understands: 'whatItUnderstands' };\n";
  assert.deepEqual(enumMapProblems(`${good}${back}${SENDS}${READS}`, [INPUT_PAIR, OUTPUT_PAIR]), []);
  assert.match(enumMapProblems(`${good}${SENDS}${READS}`, [INPUT_PAIR, OUTPUT_PAIR])[0], /catalog → module/);
});

void test('d1_256: a map is asked only for the usecase the code calls and the direction it uses', () => {
  const good = "const LEVEL = { whatItCan: 'canDo', whatItUnderstands: 'understands' };\n";
  const back = "const BACK = { canDo: 'whatItCan', understands: 'whatItUnderstands' };\n";
  // A request that does not call the usecase asks no map (a type import is not a call).
  assert.deepEqual(enumMapProblems("import type { ListSimInput } from './x.js';\nconst y = 1;\n", [INPUT_PAIR, OUTPUT_PAIR]), []);
  // Sends the level only: module → catalog, and nothing is asked of the answer.
  const sendsOnly = `${good}const answer = await listSim({ level: LEVEL[input.level] }, ctx);\nreturn { items: answer.items };\n`;
  assert.deepEqual(enumMapProblems(sendsOnly, [INPUT_PAIR, OUTPUT_PAIR]), []);
  assert.match(enumMapProblems('const answer = await listSim({ level: input.level }, ctx);\n', [INPUT_PAIR, OUTPUT_PAIR])[0], /module → catalog/);
  // Reads the level of the answer only: catalog → module.
  const readsOnly = `${back}const answer = await listSim({ id: input.id }, ctx);\nreturn { level: BACK[answer.level] };\n`;
  assert.deepEqual(enumMapProblems(readsOnly, [INPUT_PAIR, OUTPUT_PAIR]), []);
  const readsNoMap = 'const answer = await listSim({ id: input.id }, ctx);\nreturn { level: answer.level };\n';
  const missing = enumMapProblems(readsNoMap, [INPUT_PAIR, OUTPUT_PAIR]);
  assert.equal(missing.length, 1);
  assert.match(missing[0], /catalog → module/);
  // A call that forwards nothing of the field and a code that reads nothing of it need no map.
  assert.deepEqual(enumMapProblems('const answer = await listSim({ id: input.id }, ctx);\nreturn { total: answer.total };\n', [INPUT_PAIR, OUTPUT_PAIR]), []);
});

void test('d1_256: the recorded requests of agents: the refused s11 attempt passes (it does not call listAgentSimulation); agent_simulation keeps both maps', () => {
  const pairs: ExternalEnumPair[] = ['input', 'output'].map(side => ({ usecaseId: 'listAgentSimulation', entityId: 'AgentSimulation', connectionId: 'cm', operationId: 'simulateAgent', field: 'level', side: side as 'input' | 'output', catalogType: side === 'input' ? 'CmSimulateAgentInput' : 'CmSimulateAgentOutput', moduleValues: ['whatItCan', 'whatItUnderstands'], catalogValues: ['canDo', 'understands'] }));
  const fixtures = fileURLToPath(new URL('../steps/requests50/fixtures/', import.meta.url));
  const refused = readFileSync(`${fixtures}agentsRequestsS11Refused.recorded.txt`, 'utf8');
  assert.deepEqual(enumMapProblems(refused, pairs), []);
  const simulation = readFileSync(`${fixtures}agentSimulationRequestsF45e1e26.recorded.txt`, 'utf8');
  assert.deepEqual(enumMapProblems(simulation, pairs), []);
  // Without its maps the same request is refused in both directions.
  const stripped = simulation.replace(/\bwhatItCan: '[^']*'/gu, 'whatItCan: ""').replace(/\bwhatItUnderstands: '[^']*'/gu, 'whatItUnderstands: ""').replace(/\bcanDo: '[^']*'/gu, 'canDo: ""').replace(/\bunderstands: '[^']*'/gu, 'understands: ""');
  assert.equal(enumMapProblems(stripped, pairs).length >= 1, true);
});

void test('d1_198: the request gate runs the map check only when the unit has pairs', () => {
  const header = '/// <mls fileReference="x" enhancement="_blank"/>';
  const base = { header, routes: [], project: 7, moduleName: 'agents', pageId: 'p', waived: new Set<string>() };
  const code = `${header}\nexport const requests = {};\n`;
  assert.equal(requestGate(code, base).some(problem => /typed map/u.test(problem)), false);
  assert.equal(requestGate(`${code}${SENDS}`, { ...base, externalEnums: [INPUT_PAIR] }).some(problem => /typed map/u.test(problem)), true);
});
