/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/serveRequest.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { unitInputHash } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadRequestContext, normalizeRequestsTyping, requestGate } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
const CATALOG = readFileSync(path.join(ROOT, 'mls-102034/l1/server/layer_1_external/connections/catalogs/cm.ts'), 'utf8');
const CATALOG_REF = '/_102034_/l1/server/layer_1_external/connections/catalogs/cm.ts';
const PROJECT = 102099;
const MODULE = 'agents';

function unit(artifactType: string, artifactId: string, data: Record<string, unknown>, outputRef: string): M12Unit {
  const definition = { artifactType, artifactId, moduleName: MODULE, data, dependencies: [] as string[], text: '' };
  return {
    definition,
    declared: definition,
    outputRef,
    defRef: outputRef.replace(/\.ts$/u, '.defs.ts'),
    output: { project: PROJECT, level: 1, folder: '', shortName: artifactId, extension: '.ts' },
    unitId: artifactId,
    text: JSON.stringify(data),
  } as unknown as M12Unit;
}

const record = unit('requestService', 'cm', {
  pageId: 'cm',
  requests: [{ route: `${MODULE}.cm.record`, serves: 'cm.record', entityRefs: ['AgentExecution'], effect: 'create', writes: 'AgentExecution.create' }],
}, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.ts`);

const entity = unit('domainEntity', 'agentExecution', { entityId: 'AgentExecution', storage: { idField: 'executionId' } }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/agentExecution.ts`);
const port = unit('repositoryPort', 'agentExecutionRepository', {
  entityId: 'AgentExecution',
  interfaceName: 'AgentExecutionRepository',
  methods: [{ name: 'get', params: ['id'], returns: 'AgentExecution' }, { name: 'create', params: ['AgentExecution'], returns: 'AgentExecution' }],
}, `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/agentExecutionRepository.ts`);

test('a serve request context quotes the connection catalog and the repeat rule, and no page contract', async () => {
  const read = async (ref: string) => ref === CATALOG_REF || ref === `/${CATALOG_REF}` ? CATALOG : null;
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [record, entity, port], read } as never, record);
  assert.match(loaded.human, /## Connection catalog/);
  assert.match(loaded.human, /export interface CmRecordInput/);
  assert.match(loaded.human, /export interface CmRecordOutput/);
  assert.match(loaded.human, /status: 'recorded' \| 'existing'/);
  assert.match(loaded.human, /input\.executionId/);
  assert.match(loaded.human, /AgentExecutionRepository/);
  assert.doesNotMatch(loaded.human, /## Contract /);
  assert.equal(loaded.contractsInterface.includes('CmRecordInput'), true);
  assert.equal(loaded.contractsInterface.includes('CmRecordOutput'), true);
  assert.equal(loaded.contractSpecifier, '/_102034_/l1/server/layer_1_external/connections/catalogs/cm.js');
});

test('the serve gate accepts a catalog-typed requests and refuses fetch and callConnection', async () => {
  const read = async (ref: string) => ref === CATALOG_REF ? CATALOG : null;
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [record, entity, port], read } as never, record);
  const header = loaded.header;
  const specifier = loaded.catalogSpecifiers?.[0] ?? '';
  const good = [
    header,
    `import type { CmRecordInput, CmRecordOutput } from '${specifier}';`,
    `export const requests: ${loaded.contractsInterface} = {`,
    `  "${MODULE}.cm.record": async (input, ctx) => { void input; void ctx; return await ctx.data.moduleData.runInTransaction(async () => ({ status: 'recorded' as const })); },`,
    '};',
    '',
  ].join('\n');
  const gate = { header, contractsInterface: loaded.contractsInterface, routes: loaded.routes, project: PROJECT, moduleName: MODULE, pageId: 'cm', waived: new Set<string>(), catalogSpecifiers: loaded.catalogSpecifiers };
  assert.deepEqual(requestGate(good, gate), []);
  assert.ok(requestGate(`${good}\nconst gone = await fetch('https://example.test');\n`, gate).some(item => item.includes('fetch')));
  assert.ok(requestGate(`${good}\nawait callConnection('cm', 'record', {}, {});\n`, gate).some(item => item.includes('GATEWAY_BYPASS')));
  const pageGate = { ...gate, contractsInterface: 'PageContracts', catalogSpecifiers: undefined, routes: [] };
  assert.ok(requestGate(`import type { CmRecordInput } from '${specifier}';\n${header}\n`, pageGate).some(item => item.includes(specifier)));
  const typed = normalizeRequestsTyping(`${header}\nexport const requests = {\n};\n`, loaded.contractsInterface, specifier);
  assert.match(typed, /import type \{ CmRecordInput, CmRecordOutput \}/);
  assert.match(typed, /CmRecordInput/);
});

test('a page request keeps its contract hash and a serve request hashes the catalog', async () => {
  const page = unit('requestService', 'minhas', { pageId: 'minhas', requests: [{ route: `${MODULE}.minhas.list` }] }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/minhas.ts`);
  const files = new Map<string, string>([
    [`_${PROJECT}_/l2/${MODULE}/web/contracts/minhas.defs.ts`, 'export interface MinhasContracts {}'],
    [CATALOG_REF, CATALOG],
  ]);
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [], appEnv: 'test', read: async (ref: string) => files.get(ref) ?? null };
  const pageHash = await unitInputHash(ctx as never, page);
  files.set(CATALOG_REF, `${CATALOG}\n`);
  assert.equal(await unitInputHash(ctx as never, page), pageHash);
  const serveHash = await unitInputHash(ctx as never, record);
  files.set(CATALOG_REF, CATALOG.replace('recorded', 'stored'));
  assert.notEqual(await unitInputHash(ctx as never, record), serveHash);
});
