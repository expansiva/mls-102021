/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/serveRequest.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { unitInputHash } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { maskCode, requestsObjectBodies } from '/_102021_/l2/agentMaterializeL1/helpers/codeScan.js';
import { loadRequestContext, normalizeRequestsTyping, requestGate, serveUsecaseProblems } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

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

function keyOf(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

test('d1_201: a serve route that names usecases gets them in the prompt and the repair, resolved, and must call one of them', async () => {
  const previous = globalThis.mls;
  const withUses = unit('requestService', 'cm', {
    pageId: 'cm',
    requests: [{ route: `${MODULE}.cm.record`, serves: 'cm.record', uses: ['createExecutionSummary'], entityRefs: ['AgentExecution'], effect: 'create', writes: 'AgentExecution.create' }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.ts`);
  const usecase = unit('usecase', 'createExecutionSummary', { usecaseId: 'createExecutionSummary', entityId: 'AgentExecution' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/createExecutionSummary.ts`);
  const other = unit('usecase', 'listOther', { usecaseId: 'listOther', entityId: 'Other' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/listOther.ts`);
  const generated = [
    "export type Status = 'recorded' | 'existing';",
    'export interface CreateExecutionSummaryInput { executionId: string; status?: Status }',
    'export async function createExecutionSummary(input: CreateExecutionSummaryInput): Promise<{ executionId: string }> { return input; }',
  ].join('\n');
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files: {
        [keyOf(usecase.output)]: { ...usecase.output, status: 'changed', getContent: async () => generated, getValueInfo: async () => ({ content: generated }) },
        [keyOf(other.output)]: { ...other.output, status: 'changed', getContent: async () => 'export async function listOther(): Promise<void> {}\n', getValueInfo: async () => ({ content: 'export async function listOther(): Promise<void> {}\n' }) },
      },
      getKeyToFile: keyOf,
    },
  };
  const read = async (ref: string) => (ref.replace(/^\//u, '') === CATALOG_REF.replace(/^\//u, '') ? CATALOG : null);
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [withUses, usecase, other, entity, port], read };
  try {
    for (const repair of [undefined, { problems: ['SERVE_ROUTE_WITHOUT_USECASE_CALL: route x'], previous: 'export const requests = {};\n' }]) {
      const loaded = await loadRequestContext(ctx as never, withUses, repair);
      assert.match(loaded.human, /## Usecases of the routes/u);
      assert.match(loaded.human, new RegExp(`- ${MODULE}\\.cm\\.record → createExecutionSummary`, 'u'));
      assert.match(loaded.human, /Usecase createExecutionSummary \(named in the def\)/u);
      assert.match(loaded.human, /status\?: 'recorded' \| 'existing';/u);
      assert.equal(loaded.human.includes('Usecase listOther'), false, 'only the usecases the routes name');
      assert.deepEqual(loaded.serveUses, [{ route: `${MODULE}.cm.record`, uses: ['createExecutionSummary'] }]);
    }
    const plain = await loadRequestContext({ ...ctx, units: [record, entity, port] } as never, record);
    assert.equal(plain.human.includes('Usecases of the routes'), false, 'no uses: nothing changes');
    assert.deepEqual(plain.serveUses, []);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

test('d1_201: the serve gate refuses a route that returns {}, throws missingUsecase or only imports the usecase, and accepts a call', () => {
  const route = `${MODULE}.cm.record`;
  const other = `${MODULE}.cm.describe`;
  const uses = [{ route, uses: ['createExecutionSummary'] }, { route: other, uses: ['listTool', 'listAgentTool'] }];
  const call = "async (input, ctx) => { const row = await createExecutionSummary(input, ctx); return row; }";
  const good = `import { createExecutionSummary } from 'x';\nexport const requests = {\n  "${route}": ${call},\n  "${other}": async (input, ctx) => listAgentTool(input, ctx),\n};\n`;
  assert.deepEqual(serveUsecaseProblems(good, uses), []);
  const empty = `import { createExecutionSummary } from 'x';\nexport const requests = {\n  "${route}": async () => ({}),\n  "${other}": async (input, ctx) => listTool(input, ctx),\n};\n`;
  const emptyProblems = serveUsecaseProblems(empty, uses);
  assert.equal(emptyProblems.length, 1);
  assert.match(emptyProblems[0], new RegExp(`^SERVE_ROUTE_WITHOUT_USECASE_CALL: route ${route.replace(/\./gu, '\\.')} must call one of its usecases \\(createExecutionSummary\\)`, 'u'));
  const thrown = good.replace(call, "async () => { throw new AppError('missingUsecase', 'createExecutionSummary is not wired', 500); }");
  assert.equal(serveUsecaseProblems(thrown, uses).length, 1);
  const commented = good.replace(call, "async () => { /* createExecutionSummary(input, ctx) */ return {}; }");
  assert.equal(serveUsecaseProblems(commented, uses).length, 1);
  assert.equal(serveUsecaseProblems('export const requests = {};\n', uses).length, 2, 'a route absent from the file is refused too');
  assert.deepEqual(serveUsecaseProblems('export const requests = {};\n', []), []);
});

const SHAPE = (bodies: { ready: string; describe: string; record: string }): string => [
  "import type { CmAgentDraftReadyInput } from 'x';",
  "import { createAgentTool } from 'a';",
  "import { listAgentTool } from 'b';",
  "import { createExecutionSummary } from 'c';",
  'export const requests: {',
  "'agents.cm.agentDraftReady': (input: CmAgentDraftReadyInput, ctx: RequestContext) => Promise<Out>;",
  "'agents.cm.describe': (input: CmDescribeInput, ctx: RequestContext) => Promise<Out>;",
  "'agents.cm.record': (input: CmRecordInput, ctx: RequestContext) => Promise<Out>;",
  '} = {',
  `'agents.cm.agentDraftReady': async function (input, ctx) {\n${bodies.ready}\n},`,
  '',
  `'agents.cm.describe': async function (input, ctx) {\n${bodies.describe}\n},`,
  `'agents.cm.record': async function (input, ctx) {\n${bodies.record}\n},`,
  '};',
  '',
].join('\n');

const CM_ROUTES = [
  { route: 'agents.cm.agentDraftReady', uses: ['createAgentTool'] },
  { route: 'agents.cm.describe', uses: ['listAgentTool'] },
  { route: 'agents.cm.record', uses: ['createExecutionSummary'] },
];

void test('d1_202: the body of a route is the property of the requests object, not the first text of its key (the type annotation repeats the keys)', () => {
  const ready = "return ctx.data.moduleData.runInTransaction(async (tx) => { await createAgentTool({ agentId: input.draftId }, { ...ctx, tx }); return {}; });";
  const describe = "const res = await listAgentTool({ agentId: input.agentId, page: 1 }, ctx);\n// 'agents.cm.record': not here\nreturn { items: res.items };";
  const record = "const msg = 'listAgentTool(createAgentTool(';\nawait createExecutionSummary(input, ctx);\nreturn { status: 'recorded' };";
  assert.deepEqual(serveUsecaseProblems(SHAPE({ ready, describe, record }), CM_ROUTES), []);
  // Only the route without a call is refused, and a name in a string or a comment of another route does not save it.
  const bad = serveUsecaseProblems(SHAPE({ ready, describe: "return { items: [] }; // listAgentTool(input)", record: "const note = 'createExecutionSummary(x)'; return {};" }), CM_ROUTES);
  assert.deepEqual(bad.map(item => /route (\S+) must/u.exec(item)?.[1]), ['agents.cm.describe', 'agents.cm.record']);
  // A route that throws missingUsecase in its own body is refused even when another route calls its usecase.
  const thrown = serveUsecaseProblems(SHAPE({ ready, describe, record: "throw new AppError('missingUsecase', 'x', 500);" }), CM_ROUTES);
  assert.equal(thrown.length, 1);
  assert.match(thrown[0], /route agents\.cm\.record/u);
  // Method shorthand, unquoted key and a satisfies wrapper are read the same way.
  const shorthand = "export const requests = {\n  'a.b': async (input, ctx) => doIt(input, ctx),\n  other(input) { return other2(input); },\n} satisfies Reqs;\n";
  assert.deepEqual(serveUsecaseProblems(shorthand, [{ route: 'a.b', uses: ['doIt'] }, { route: 'other', uses: ['other2'] }]), []);
  assert.equal(serveUsecaseProblems('const requests = {};', [{ route: 'a.b', uses: ['doIt'] }]).length, 1);
});

void test('d1_202: the scanner masks comments and strings and finds the requests value past an annotation with => and generics', () => {
  const code = "// export const requests = { fake: 1 };\nexport const requests: { [K in keyof C]: (i: C[K]['input']) => Promise<Record<string, unknown>> } = {\n  'k': async () => { return `}${'{'}`; },\n};\n";
  assert.deepEqual([...requestsObjectBodies(code).keys()], ['k']);
  assert.equal(maskCode('a // b\n"c\\"d" /* e */ f').includes('b'), false);
  assert.equal(maskCode('a "xyz"').length, 'a "xyz"'.length);
});
