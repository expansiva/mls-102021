/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/serveRequest.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { keptRefusalText } from '/_102021_/l2/agentMaterializeL1/helpers/keptRefusal.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { unitInputHash } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { maskCode, requestsObjectBodies } from '/_102021_/l2/agentMaterializeL1/helpers/codeScan.js';
import { eventWorkflowRoutes, loadRequestContext, normalizeRequestsTyping, requestGate, serveUsecaseProblems, workflowRouteProblems } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
const CATALOG = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
const CATALOG_REF = '/_102034_/l2/shared/contracts/connections/cm.ts';
const TYPES = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/types.ts'), 'utf8');
const TYPES_REF = '/_102034_/l2/shared/contracts/connections/types.ts';
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
  assert.equal(loaded.contractSpecifier, '/_102034_/l2/shared/contracts/connections/cm.js');
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

test('d1_201: a serve route that names usecases gets them in the prompt and the repair, resolved, and must call each of them', async () => {
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
  const good = `import { createExecutionSummary } from 'x';\nexport const requests = {\n  "${route}": ${call},\n  "${other}": async (input, ctx) => [await listTool(input, ctx), await listAgentTool(input, ctx)],\n};\n`;
  assert.deepEqual(serveUsecaseProblems(good, uses), []);
  // d1_230: calling one of two usecases of a route is refused, and the message names the one it skips.
  const one = good.replace('[await listTool(input, ctx), await listAgentTool(input, ctx)]', 'listAgentTool(input, ctx)');
  const oneProblems = serveUsecaseProblems(one, uses);
  assert.equal(oneProblems.length, 1);
  assert.match(oneProblems[0], /route .*describe must call each of its usecases \(listTool, listAgentTool\).*does not call listTool\./u);
  const empty = `import { createExecutionSummary } from 'x';\nexport const requests = {\n  "${route}": async () => ({}),\n  "${other}": async (input, ctx) => [await listTool(input, ctx), await listAgentTool(input, ctx)],\n};\n`;
  const emptyProblems = serveUsecaseProblems(empty, uses);
  assert.equal(emptyProblems.length, 1);
  assert.match(emptyProblems[0], new RegExp(`^SERVE_ROUTE_WITHOUT_USECASE_CALL: route ${route.replace(/\./gu, '\\.')} must call each of its usecases \\(createExecutionSummary\\)`, 'u'));
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

const PLATFORM_CATALOG_REF = '/_102034_/l2/shared/contracts/connections/platform.ts';
const PLATFORM_CATALOG = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/platform.ts'), 'utf8');

void test('d1_206: the serve a process starts on carries the workflow service of the process, and the gate wants its import', async () => {
  const previous = globalThis.mls;
  const platform = unit('requestService', 'platform', {
    pageId: 'platform',
    requests: [{ route: `${MODULE}.platform.releaseCatalogChanged`, serves: 'platform.releaseCatalogChanged', uses: [] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/platform.ts`);
  const process = unit('workflowProcess', 'toolCatalogRefresh', {
    processId: 'toolCatalogRefresh',
    trigger: { kind: 'event', event: 'platform.releaseCatalogChanged' },
    functions: ['applyReleaseCatalog'],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/workflows/toolCatalogRefresh.ts`);
  const manual = unit('workflowProcess', 'creation', { processId: 'creation', trigger: { kind: 'manual', actorRef: 'companyAdmin' }, functions: ['open'] }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/workflows/creation.ts`);
  const service = [
    'export interface CreateExecutionSummaryInput { cost: number; tookOver: boolean; conversationLink: string }',
    'export interface ApplyReleaseCatalogInput extends CreateExecutionSummaryInput { releaseLabel?: string; catalog: unknown[] }',
    'export async function applyReleaseCatalog(input: ApplyReleaseCatalogInput, ctx: RequestContext): Promise<{ added: number }> { return { added: input.catalog.length }; }',
  ].join('\n');
  const serviceInfo = { project: PROJECT, level: 1, folder: `${MODULE}/layer_2_application/workflows`, shortName: 'toolCatalogRefresh', extension: '.ts' };
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files: { [keyOf(serviceInfo)]: { ...serviceInfo, status: 'changed', getContent: async () => service, getValueInfo: async () => ({ content: service }) } },
      getKeyToFile: keyOf,
    },
  };
  const read = async (ref: string) => (ref.replace(/^\//u, '') === PLATFORM_CATALOG_REF.replace(/^\//u, '') ? PLATFORM_CATALOG : null);
  try {
    const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [platform, process, manual], read } as never, platform);
    const specifier = `/_${PROJECT}_/l1/${MODULE}/layer_2_application/workflows/toolCatalogRefresh.js`;
    assert.deepEqual(loaded.workflowRoutes.map(item => [item.route, item.processId, item.specifier]), [[`${MODULE}.platform.releaseCatalogChanged`, 'toolCatalogRefresh', specifier]]);
    assert.match(loaded.human, /## Workflow service of process toolCatalogRefresh \(the message of these routes starts it\)/u);
    assert.match(loaded.human, /export async function applyReleaseCatalog\(input: ApplyReleaseCatalogInput/u);
    const recording = loaded.human.slice(loaded.human.indexOf('## Workflow service of process toolCatalogRefresh'));
    assert.match(recording, /cost: number;/u);
    assert.match(recording, /tookOver: boolean;/u);
    assert.match(recording, /conversationLink: string;/u);
    assert.match(loaded.human, /builds the input of the entry function of the process/u);
    assert.equal(loaded.human.includes('Workflow service of process creation'), false, 'a manual process is not the trigger of the serve');
    assert.equal(loaded.human.includes('## Usecases of the routes'), false);
    // The recorded file of the agents module (copy in fixtures/, 102047 f1c77478) calls the usecase and never the process: refused. A file that imports the service passes.
    const recorded = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/agentsPlatformRequest.recorded.txt'), 'utf8');
    const refused = workflowRouteProblems(recorded, loaded.workflowRoutes);
    assert.equal(refused.length, 1);
    assert.match(refused[0], /reach the process toolCatalogRefresh: call its function from/u);
    const draft = `import { applyReleaseCatalog } from '${specifier}';\nexport const requests = { '${MODULE}.platform.releaseCatalogChanged': async (input, ctx) => applyReleaseCatalog({ releaseLabel: input.releaseId, catalog: input.catalogs.flatMap(item => item.actions) }, ctx) };\n`;
    assert.deepEqual(workflowRouteProblems(draft, loaded.workflowRoutes), []);
    // A serve no process starts on: no workflow section and no route to the gate.
    const plain = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [platform, manual], read } as never, platform);
    assert.deepEqual(plain.workflowRoutes, []);
    assert.equal(plain.human.includes('Workflow service of process'), false);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

const L4_REF = `_${PROJECT}_/l4/${MODULE}/integration.defs.ts`;
const L4_RECORDED = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/agentsIntegrationL4.recorded.txt'), 'utf8');

void test('d1_207: the prompt of a serve route shows the l4 line of the route as source, and nothing when the l4 has no text for it', async () => {
  const platform = unit('requestService', 'platform', {
    pageId: 'platform',
    requests: [{ route: `${MODULE}.platform.releaseCatalogChanged`, serves: 'platform.releaseCatalogChanged', uses: ['updateTool'] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/platform.ts`);
  const norm = (ref: string) => ref.replace(/^\//u, '');
  const readWith = (l4: string | null) => async (ref: string) => (norm(ref) === norm(PLATFORM_CATALOG_REF) ? PLATFORM_CATALOG : norm(ref) === norm(L4_REF) ? l4 : null);
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [platform], read: readWith(L4_RECORDED) } as never, platform);
  assert.match(loaded.human, /## What the module does with the message of these routes \(l4 _102099_\/l4\/agents\/integration\.defs\.ts, source\)/u);
  assert.match(loaded.human, /- usedBy: Rebuilds the tool catalog when a module is created or a new release arrives/u);
  assert.match(loaded.human, /- description: The release routine delivers the actions of every module[\s\S]*?A tool without its own description uses its title\./u);
  // The section is the source and a generic title: the prompt text does not name the rule, the connection or the module.
  const sectionText = /## What the module does with the message[\s\S]*?(?=\n## )/u.exec(loaded.human)?.[0] ?? '';
  assert.equal(/assistant|included|filter/iu.test(sectionText.split('Route ')[0]), false);
  // No l4 file, or a serve line without usedBy and description: no section and no error.
  const none = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [platform], read: readWith(null) } as never, platform);
  assert.equal(none.human.includes('What the module does with the message'), false);
  const bare = L4_RECORDED.replace(/"usedBy": \[\s*"Rebuilds[^\]]*\]/u, '"usedBy": []').replace(/"description": "The release routine[^"]*"/u, '"description": ""');
  assert.notEqual(bare, L4_RECORDED);
  const empty = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [platform], read: readWith(bare) } as never, platform);
  assert.equal(empty.human.includes('What the module does with the message'), false);
});

const TOOL_ONTOLOGY = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../seedRows25/fixtures/agentsTool.defs.recorded.txt'), 'utf8');

void test('d1_243 s2: the prompt of a serve route shows the l4 description of each field of the entity the route writes', async () => {
  const platform = unit('requestService', 'platform', {
    pageId: 'platform',
    requests: [{ route: `${MODULE}.platform.releaseCatalogChanged`, serves: 'platform.releaseCatalogChanged', uses: [] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/platform.ts`);
  const ontologyRef = `_${PROJECT}_/l4/${MODULE}/ontology/Tool.defs.ts`;
  const norm = (ref: string) => ref.replace(/^\//u, '');
  const read = async (ref: string) => {
    const key = norm(ref);
    if (key === norm(PLATFORM_CATALOG_REF)) return PLATFORM_CATALOG;
    if (key === norm(L4_REF)) return L4_RECORDED;
    if (key === norm(ontologyRef)) return TOOL_ONTOLOGY;
    return null;
  };
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [platform], read } as never, platform);
  assert.match(loaded.human, /## l4 ontology _102099_\/l4\/agents\/ontology\/Tool\.defs\.ts \(source\)/u);
  assert.match(loaded.human, /Stable code of the action in the release, used to match the tool when the catalog is rebuilt/u);
  // A line that writes nothing has no ontology section.
  const listed = L4_RECORDED.replace('"entityRefs": [\n        "Tool"\n      ],\n      "effect": "update"', '"entityRefs": [\n        "Tool"\n      ],\n      "effect": "list"');
  assert.notEqual(listed, L4_RECORDED);
  const readOnly = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [platform], read: async (ref: string) => norm(ref) === norm(L4_REF) ? listed : read(ref) } as never, platform);
  assert.equal(readOnly.human.includes('ontology/Tool.defs.ts'), false);
});

void test('d1_207: the recorded route that applies the l4 rule (filters the assistant actions, describes by the title) passes the gate of the route', async () => {
  const P47 = 102047;
  const dir = path.dirname(new URL(import.meta.url).pathname);
  const recorded = readFileSync(path.join(dir, 'fixtures/agentsPlatformRequestRule.recorded.txt'), 'utf8');
  const platform = unit('requestService', 'platform', { pageId: 'platform', requests: [{ route: `${MODULE}.platform.releaseCatalogChanged`, serves: 'platform.releaseCatalogChanged', uses: [] }] }, `_${P47}_/l1/${MODULE}/layer_2_application/requests/platform.ts`);
  const process = unit('workflowProcess', 'toolCatalogRefresh', { processId: 'toolCatalogRefresh', trigger: { kind: 'event', event: 'platform.releaseCatalogChanged' }, functions: ['applyReleaseCatalog'] }, `_${P47}_/l1/${MODULE}/layer_2_application/workflows/toolCatalogRefresh.ts`);
  const read = async (ref: string) => (ref.replace(/^\//u, '') === PLATFORM_CATALOG_REF.replace(/^\//u, '') ? PLATFORM_CATALOG : null);
  const loaded = await loadRequestContext({ run: { project: P47, module: MODULE }, units: [platform, process], read } as never, platform);
  const header = recorded.split('\n')[0];
  const gate = { header, contractsInterface: loaded.contractsInterface, routes: loaded.routes, project: P47, moduleName: MODULE, pageId: 'platform', waived: new Set<string>(), catalogSpecifiers: loaded.catalogSpecifiers };
  assert.deepEqual(requestGate(recorded, gate), []);
  assert.match(recorded, /action\.assistant !== 'included'/u);
});

void test('d1_208 s3: a serve of a system this module declares is typed by the generated declaration, and a missing declaration is a distinct refusal', async () => {
  const fixtures = path.join(path.dirname(new URL(import.meta.url).pathname), '../../../helpers/connections/fixtures');
  const l4 = readFileSync(path.join(fixtures, 'repoInsideModule.integration.recorded.txt'), 'utf8');
  const declaration = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../external15/fixtures/repoHostDeclaration.recorded.txt'), 'utf8');
  const service = unit('requestService', 'repoHost', {
    pageId: 'repoHost',
    requests: [{ route: `${MODULE}.repoHost.changePushed`, serves: 'repoHost.changePushed', uses: [] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/repoHost.ts`);
  const declarationRef = `_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/repoHost.ts`;
  const readWith = (withDeclaration: boolean) => async (ref: string) => {
    const key = ref.replace(/^\//u, '');
    if (key === `_${PROJECT}_/l4/${MODULE}/integration.defs.ts`) return l4;
    if (withDeclaration && key === declarationRef) return declaration;
    return null;
  };
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [service], read: readWith(true) } as never, service);
  const specifier = `/_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/repoHost.js`;
  assert.equal(loaded.contractSpecifier, specifier);
  assert.equal(loaded.contractsInterface.includes('RepoHostChangePushedInput'), true);
  assert.equal(loaded.contractsInterface.includes('RepoHostChangePushedOutput'), true);
  assert.match(loaded.human, /export interface RepoHostChangePushedInput/u);
  assert.match(loaded.human, /import type \{ RepoHostChangePushedInput, RepoHostChangePushedOutput \} from '\/_102099_\/l1\/agents\/layer_1_external\/connections\/repoHost\.js'/u);
  await assert.rejects(
    () => loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [service], read: readWith(false) } as never, service),
    /DECLARATION_NOT_GENERATED/u,
  );
});

void test('d1_211 s2: the recorded route of a serve of an outside system takes the message as the declaration types it, passes the gate and never checks the notice', async () => {
  const dir = path.dirname(new URL(import.meta.url).pathname);
  const l4 = readFileSync(path.join(dir, '../../../helpers/connections/fixtures/repoInsideModule.integration.recorded.txt'), 'utf8');
  const declaration = readFileSync(path.join(dir, '../external15/fixtures/repoHostDeclaration.recorded.txt'), 'utf8');
  const route = readFileSync(path.join(dir, 'fixtures/repoHostServeRoute.recorded.txt'), 'utf8');
  const service = unit('requestService', 'repoHost', {
    pageId: 'repoHost',
    requests: [{ route: `${MODULE}.repoHost.changePushed`, serves: 'repoHost.changePushed', uses: [] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/repoHost.ts`);
  const read = async (ref: string) => {
    const key = ref.replace(/^\//u, '');
    if (key === `_${PROJECT}_/l4/${MODULE}/integration.defs.ts`) return l4;
    if (key === `_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/repoHost.ts`) return declaration;
    return null;
  };
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [service], read } as never, service);
  assert.equal(loaded.contractsInterface.includes('RepoHostChangePushedInput'), true, 'the input is the inputType of the declaration');
  const gate = { header: route.split('\n')[0], contractsInterface: loaded.contractsInterface, routes: loaded.routes, project: PROJECT, moduleName: MODULE, pageId: 'repoHost', waived: new Set<string>(), catalogSpecifiers: loaded.catalogSpecifiers };
  assert.deepEqual(requestGate(route, gate), []);
  // The notice is checked by the platform hook before the route: no primitive, no secret, no header read here.
  assert.equal(/verifyExternalNotice|\.secret|secret|signature|headers/iu.test(route.replace(/^\/\/.*$/gmu, '')), false);
});

void test('d1_218 s2: the route of a system outside the app is told the input is the body the system sends and that it translates it; a platform connection is not told so', async () => {
  const dir = path.dirname(new URL(import.meta.url).pathname);
  const declaration = readFileSync(path.join(dir, '../../emitters/fixtures/githubDeclaration.recorded.txt'), 'utf8');
  const route = readFileSync(path.join(dir, 'fixtures/githubServeRoute.recorded.txt'), 'utf8');
  const l4 = `export const x = ${JSON.stringify({
    externalSystems: [{ id: 'github', title: 't', description: 'd', settings: [], operations: [] }],
    connections: [{ connectionId: 'github', operationId: 'repositoryChanged', direction: 'serve', usedBy: ['Records that the repository changed.'], description: 'The repository host tells the module a branch changed.' }],
  })} as const;`;
  const service = unit('requestService', 'github', {
    pageId: 'github',
    requests: [{ route: `${MODULE}.github.repositoryChanged`, serves: 'github.repositoryChanged', uses: ['recordRepositoryChange'] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/github.ts`);
  const read = async (ref: string) => {
    const key = ref.replace(/^\//u, '');
    if (key === `_${PROJECT}_/l4/${MODULE}/integration.defs.ts`) return l4;
    if (key === `_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/github.ts`) return declaration;
    return null;
  };
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [service], read } as never, service);
  assert.match(loaded.human, /the input is the body the outside system sends, with its names and its shape \(its declaration types it\), handed over as it came/u);
  assert.match(loaded.human, /The route translates it into the input of the usecase or of the process it calls, which is in the vocabulary of the module, reading what the L4 says of the line/u);
  assert.match(loaded.human, /## What the module does with the message of these routes/u, 'the L4 text of the line is the source (d1_207)');
  assert.match(loaded.human, /`context\.hookParams` \(optional, `Record<string, string>`, at most one key/u, 'd1_297: the parameter of the address');
  assert.match(loaded.human, /the route passes the whole message to the function of the process, and the value of the address stays in `ctx` \(`Object\.values\(ctx\.requestMeta\?\.connection\?\.context\?\.hookParams \?\? \{\}\)\[0\]`, whatever the name of the key\)/u, 'd1_307: the address stays in ctx');
  const arrived = unit('workflowProcess', 'repositoryChange', {
    processId: 'repositoryChange',
    trigger: { kind: 'event', event: 'github.repositoryChanged' },
    functions: ['receiveRepositoryChange'],
    receives: [{ function: 'receiveRepositoryChange', arrival: 'github.repositoryChanged' }],
    operations: [],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/workflows/repositoryChange.ts`);
  const withProcess = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [service, arrived], read } as never, service);
  const block = withProcess.human.slice(withProcess.human.indexOf('## Workflow service of process'));
  assert.ok(block.includes(keptRefusalText()), 'd1_308: the route says the same form of the refusal as the process');
  assert.equal(/robo|bot|telegram/iu.test(loaded.human.split('hookParams')[1]?.split('\n')[0] ?? ''), false, 'd1_297: generic text');
  // The recorded route takes the body as the declaration types it and hands the usecase the vocabulary of the module.
  const gate = { header: route.split('\n')[0], contractsInterface: loaded.contractsInterface, routes: loaded.routes, project: PROJECT, moduleName: MODULE, pageId: 'github', waived: new Set<string>() };
  assert.equal(loaded.contractsInterface.includes('RepositoryChangedInput'), true);
  assert.match(route, /input\.repository\.fullName/u);
  assert.match(route, /repositoryName:/u);
  assert.deepEqual(requestGate(route, { ...gate, serveUses: loaded.serveUses }), []);
  // A platform connection (the catalog is written by hand, in the vocabulary the platform fixed): the sentence is not there.
  const platformService = unit('requestService', 'cm', {
    pageId: 'cm',
    requests: [{ route: `${MODULE}.cm.record`, serves: 'cm.record', uses: [] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.ts`);
  const platformRead = async (ref: string) => (ref.replace(/^\//u, '') === CATALOG_REF.replace(/^\//u, '') ? CATALOG : null);
  const platform = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [platformService], read: platformRead } as never, platformService);
  assert.equal(platform.human.includes('the body the outside system sends'), false);
  assert.equal(platform.human.includes('hookParams'), false, 'd1_297: not on a platform connection');
});

void test('d1_239 s3: the serve context of requests/cm carries RequestContext and ctx.requestMeta?.connection, and the recorded cm.ts of 102047 passes the gate', async () => {
  const P47 = 102047;
  // Recorded copy of mls-102047 l1/agents/layer_2_application/requests/cm.ts at HEAD (20/11/2026); a test never reads the live bench.
  const cm = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/agentsCmHead.recorded.txt'), 'utf8');
  const contracts = readFileSync(path.join(ROOT, 'mls-102034/l1/server/layer_2_controllers/contracts.ts'), 'utf8');
  const service = unit('requestService', 'cm', {
    pageId: 'cm',
    requests: [
      { route: `${MODULE}.cm.agentDraftReady`, serves: 'cm.agentDraftReady' },
      { route: `${MODULE}.cm.describe`, serves: 'cm.describe' },
      { route: `${MODULE}.cm.record`, serves: 'cm.record' },
    ],
  }, `_${P47}_/l1/${MODULE}/layer_2_application/requests/cm.ts`);
  const read = async (ref: string) => {
    const key = ref.replace(/^\//u, '');
    if (key === CATALOG_REF.replace(/^\//u, '')) return CATALOG;
    if (key === '_102034_/l1/server/layer_2_controllers/contracts.ts') return contracts;
    return null;
  };
  const loaded = await loadRequestContext({ run: { project: P47, module: MODULE }, units: [service], read } as never, service);
  assert.match(loaded.human, /`ctx\.requestMeta\?\.connection` describes the call/u);
  assert.equal(loaded.human.includes('`ctx.requestMeta.connection`'), false);
  assert.match(loaded.human, /export interface RequestContext \{/u);
  assert.match(loaded.human, /connection\?: BffConnectionMeta;/u);
  const gate = { header: cm.split('\n')[0], contractsInterface: loaded.contractsInterface, routes: loaded.routes, project: P47, moduleName: MODULE, pageId: 'cm', waived: new Set<string>(), catalogSpecifiers: loaded.catalogSpecifiers };
  assert.deepEqual(requestGate(cm, gate), []);
});

void test('d1_230: the describe route derived from the L4 line lists both usecases; the cm.ts of today (one call) is refused and a route that calls both passes', async () => {
  const { deriveServeRequests } = await import('/_102021_/l2/agentDefsL1/steps/input20/deriveServe.js');
  const derived = deriveServeRequests({
    moduleName: MODULE,
    lines: [{ connectionId: 'cm', operationId: 'describe', entityRefs: ['AgentTool', 'PersonToolRestriction'], effect: 'list' }],
    catalogTexts: { cm: CATALOG },
    usecases: [],
    problems: [],
    entities: { AgentTool: {}, PersonToolRestriction: {} },
    plannedIds: new Map(),
    removedIds: new Set(),
  });
  assert.deepEqual(derived[0]?.uses, ['listAgentTool', 'listPersonToolRestriction']);
  const route = `${MODULE}.cm.describe`;
  const uses = [{ route, uses: derived[0]!.uses }];
  const today = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/agentsCmToday.recorded.txt'), 'utf8');
  const refused = serveUsecaseProblems(today, uses);
  assert.equal(refused.length, 1);
  assert.match(refused[0], /^SERVE_ROUTE_WITHOUT_USECASE_CALL: route agents\.cm\.describe must call each of its usecases \(listAgentTool, listPersonToolRestriction\).*does not call listPersonToolRestriction\./u);
  // The same file whose describe also reads the restrictions of the person: both calls are in the body of the route.
  const both = today.replace(
    "    const active = enabledTools.filter((t) => !t.toolRemoved);",
    "    const restrictions = await listPersonToolRestriction({ personId: String(ctx.requestMeta?.connection?.context?.actorMdmId ?? ''), page: 1, pageSize: MAX_PAGE_SIZE }, ctx);\n    const restricted = new Set(restrictions.items.map((item) => item.toolId));\n    const active = enabledTools.filter((t) => !t.toolRemoved && !restricted.has(t.toolId));",
  );
  assert.notEqual(both, today);
  assert.deepEqual(serveUsecaseProblems(both, uses), []);
  // A call of the other usecase in another route of the same file does not count for this route.
  const elsewhere = today.replace("return { version, toolsMode: 'all', allowed };", "return { version, toolsMode: 'all', allowed };").replace("const out: CmRecordOutput = { status: 'recorded' };", "await listPersonToolRestriction({}, ctx);\n      const out: CmRecordOutput = { status: 'recorded' };");
  assert.equal(serveUsecaseProblems(elsewhere, uses).length, 1);
});

// d1_272: the types a catalog type cites come from the file it imports them from too. `CmTool.entry` is an `AssistantCatalogItem` of `types.ts`, whose index
// signature makes `entry.purpose` an `unknown`: without that declaration the model reads a field that is not there and the compiler refuses it.
void test('d1_272: the connection catalog section quotes a cited type that the catalog imports from another file', async () => {
  const describe = unit('requestService', 'cm', {
    pageId: 'cm',
    requests: [{ route: `${MODULE}.cm.describe`, serves: 'cm.describe', entityRefs: [], effect: 'read', writes: '' }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.ts`);
  const files = new Map<string, string>([[CATALOG_REF, CATALOG], [TYPES_REF, TYPES]]);
  const read = async (ref: string) => files.get(ref.startsWith('/') ? ref : `/${ref}`) ?? null;
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [describe], read } as never, describe);
  assert.match(loaded.human, /export interface CmTool \{/u);
  assert.match(loaded.human, /export interface AssistantCatalogItem \{/u);
  assert.match(loaded.human, /\[field: string\]: unknown;/u);
  const without = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [describe], read: async (ref: string) => (ref.replace(/^\//u, '') === CATALOG_REF.slice(1) ? CATALOG : null) } as never, describe);
  assert.doesNotMatch(without.human, /export interface AssistantCatalogItem/u);
});

// d1_275: the arrival a function of a process receives (the L4 `receives`, in the process def) is handed to that function: the context names it, and the gate asks
// for the call, not only the import.
void test('d1_305 s1: a command route that reaches a process is told to open the transaction and call the function inside it; a route with no process has no process block', async () => {
  const TX = 'The command route opens `ctx.data.moduleData.runInTransaction`, builds the `ctx` bound to that transaction, and calls the function of the process inside it, passing that `ctx`.';
  const arrived = unit('requestService', 'cm', {
    pageId: 'cm',
    requests: [{ route: `${MODULE}.cm.agentDraftReady`, serves: 'cm.agentDraftReady', uses: [] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.ts`);
  const process = unit('workflowProcess', 'virtualEmployeeCreation', {
    processId: 'virtualEmployeeCreation',
    trigger: { kind: 'manual', actorRef: 'companyAdmin' },
    functions: ['receiveDraftOutcome'],
    receives: [{ function: 'receiveDraftOutcome', arrival: 'cm.agentDraftReady' }],
    operations: [],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/workflows/virtualEmployeeCreation.ts`);
  const read = async (ref: string) => (ref.replace(/^\//u, '') === CATALOG_REF.replace(/^\//u, '') ? CATALOG : null);
  const withProcess = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [arrived, process], read } as never, arrived);
  const block = withProcess.human.slice(withProcess.human.indexOf('## Workflow service of process'));
  assert.ok(block.startsWith('## Workflow service of process'), 'the process block is present');
  assert.ok(block.includes(TX), 'the process block tells the route to open the transaction');
  assert.equal(block.includes('hookParams'), false, 'd1_307: a platform arrival does not carry the address');
  assert.equal(block.includes(keptRefusalText()), true, 'd1_307: the kept refusal is for every served route that calls a process (the cm too)');
  const alone = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [arrived], read } as never, arrived);
  assert.equal(alone.human.includes('## Workflow service of process'), false);
  const started = unit('workflowProcess', 'openOnly', {
    processId: 'openOnly',
    trigger: { kind: 'event', event: 'cm.agentDraftReady' },
    functions: ['openOccurrence'],
    operations: [],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/workflows/openOnly.ts`);
  const withoutFunction = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [arrived, started], read } as never, arrived);
  assert.ok(withoutFunction.human.includes(TX), 'a route that starts a process and names no function still opens the transaction');
});

void test('d1_275: the route of the arrival a process receives gets the function in the context, and the gate refuses a request that does not call it', async () => {
  const draftReady = unit('requestService', 'cm', {
    pageId: 'cm',
    requests: [{ route: `${MODULE}.cm.agentDraftReady`, serves: 'cm.agentDraftReady', uses: [], entityRefs: ['AgentDraft'], effect: 'update' }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.ts`);
  const process = unit('workflowProcess', 'virtualEmployeeCreation', {
    processId: 'virtualEmployeeCreation',
    trigger: { kind: 'manual', actorRef: 'companyAdmin' },
    functions: ['startVirtualEmployeeRequest', 'receiveDraftOutcome'],
    receives: [{ function: 'receiveDraftOutcome', arrival: 'cm.agentDraftReady' }],
    operations: [],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/workflows/virtualEmployeeCreation.ts`);
  const flows = eventWorkflowRoutes([process], [{ route: `${MODULE}.cm.agentDraftReady`, serves: 'cm.agentDraftReady' }, { route: `${MODULE}.cm.describe`, serves: 'cm.describe' }], PROJECT, MODULE);
  assert.deepEqual(flows.map(item => [item.route, item.fn]), [[`${MODULE}.cm.agentDraftReady`, 'receiveDraftOutcome']]);
  const files = new Map<string, string>([[CATALOG_REF, CATALOG], [TYPES_REF, TYPES]]);
  const read = async (ref: string) => files.get(ref.startsWith('/') ? ref : `/${ref}`) ?? null;
  const loaded = await loadRequestContext({ run: { project: PROJECT, module: MODULE }, units: [draftReady, process], read } as never, draftReady);
  assert.match(loaded.human, /receiveDraftOutcome/u);
  assert.match(loaded.human, /is received by a function of it/u);
  assert.deepEqual(loaded.workflowRoutes.map(item => item.fn), ['receiveDraftOutcome']);
  const specifier = flows[0].specifier;
  const imported = `import { receiveDraftOutcome } from '${specifier}';\nexport const requests = {};\n`;
  assert.equal(workflowRouteProblems(imported, flows).length, 1, 'imported and not called');
  assert.match(workflowRouteProblems(imported, flows)[0], /call `receiveDraftOutcome`/u);
  assert.deepEqual(workflowRouteProblems(`${imported}const done = await receiveDraftOutcome({ id: input.draftId }, ctx);\n`, flows), []);
  assert.equal(workflowRouteProblems("// receiveDraftOutcome(x)\nconst y = 1;\n", flows).length, 1, 'no import: the old problem is the one reported');
  assert.equal(workflowRouteProblems(`${imported}// await receiveDraftOutcome(x)\n`, flows).length, 1, 'a comment is not a call');
});

void test('d1_309: the `export const requests` check does not depend on the length of the declared type (a module with several routes)', () => {
  const route = (name: string) => `  '${MODULE}.cm.${name}': (input: Cm${name}Input, ctx: RequestContext) => Promise<Cm${name}Output>;`;
  const names = ['disableChannel', 'sendChannelMessage', 'setChannelConversationIdentity', 'anotherLongRouteName'];
  const header = `/// <mls fileReference="_${PROJECT}_/l1/${MODULE}/layer_2_application/requests/cm.ts" enhancement="_blank"/>`;
  const code = `${header}\nexport const requests: {\n${names.map(route).join('\n')}\n} = {\n};\n`;
  assert.ok(/export\s+const\s+requests\b[\s\S]{0,400}?=\s*\{/u.test(code) === false, 'the old window of 400 characters refused it');
  const problems = requestGate(code, { header, contractsInterface: undefined, routes: [], project: PROJECT, moduleName: MODULE, pageId: 'cm', waived: new Set<string>() } as never);
  assert.equal(problems.some(item => item.includes('The file must export `const requests')), false);
});
