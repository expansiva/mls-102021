/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/serveRequest.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { unitInputHash } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { maskCode, requestsObjectBodies } from '/_102021_/l2/agentMaterializeL1/helpers/codeScan.js';
import { loadRequestContext, normalizeRequestsTyping, requestGate, serveUsecaseProblems, workflowRouteProblems } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
const CATALOG = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
const CATALOG_REF = '/_102034_/l2/shared/contracts/connections/cm.ts';
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
    'export interface ApplyReleaseCatalogInput { releaseLabel?: string; catalog: unknown[] }',
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
});
