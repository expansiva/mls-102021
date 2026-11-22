/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/receivedInput.test.ts" enhancement="_blank"/>

// d1_282: a process creates through the usecase of the def as well as through the port (the gate of the upsert accepts both), and the function that receives an
// arrival is told what it is called with. The def is the one of `toolCatalogRefresh` in the live tree of the 102047 at 22/11 (`06e846f7` plus the uncommitted
// `receives` and `AgentTool.create`); the catalog is the one recorded in `agents-2e3e5a1b` (the platform and the cm). Nothing is written in the 102047.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { isCatalogImport } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';
import { arrivalUpsertProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadWorkflowContext, moduleUsecaseCalls, receivedInputSection } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const PROJECT = 102047;
const here = new URL('.', import.meta.url);
const fixture = (name: string) => readFileSync(new URL(`fixtures/toolCatalogRefresh06e846f7/${name}`, here), 'utf8');
const catalogs = (name: string) => readFileSync(new URL(`../../../agentDefsL1/fixtures/agents-2e3e5a1b/_102034_/l2/shared/contracts/connections/${name}.txt`, here), 'utf8');

const UPSERT = [{ entityId: 'Tool', key: ['toolKey'], keyKind: 'unique' }];
const CALLS = [
  { entityId: 'Tool', operation: 'create', names: ['createTool', 'createTool'] },
  { entityId: 'Tool', operation: 'update', names: ['updateTool'] },
  { entityId: 'Tool', operation: 'list', names: ['listTool'] },
];
const gate = (code: string, mode: 'route' | 'process' = 'process') => arrivalUpsertProblems(code, UPSERT, mode, 'the process p', CALLS).map(item => item.split(':')[0]);

void test('d1_282 s1 A: a process that looks the tool up with listTool and creates it with createTool passes', () => {
  assert.deepEqual(gate('const found = await listTool({ toolKey }, ctx);\nif (!found.length) { await createTool(input, ctx); } else { await updateTool(input, ctx); }'), []);
});

void test('d1_282 s1 B: a process that only updates (by the port or by the usecase) is refused', () => {
  assert.deepEqual(gate('const repository = resolveRepository<ToolRepository>(ctx, "ToolRepository");\nconst rows = await repository.list({ toolKey });\nawait repository.update(rows[0]);'), ['ARRIVAL_UPSERT_NEVER_CREATES']);
  assert.deepEqual(gate('const found = await listTool({ toolKey }, ctx);\nawait updateTool(input, ctx);'), ['ARRIVAL_UPSERT_NEVER_CREATES']);
  assert.deepEqual(gate('await createTool(input, ctx);'), ['ARRIVAL_UPSERT_WITHOUT_LOOKUP'], 'a create with no lookup is still refused');
  assert.deepEqual(gate('// await createTool(input, ctx); await listTool(x, ctx);\nawait updateTool(input, ctx);'), ['ARRIVAL_UPSERT_WITHOUT_LOOKUP', 'ARRIVAL_UPSERT_NEVER_CREATES'], 'a comment is not a call');
  assert.deepEqual(gate('import { createTool } from "/x.js";\nconst found = await listTool({}, ctx);'), ['ARRIVAL_UPSERT_NEVER_CREATES'], 'an import is not a call');
});

void test('d1_282 s1 C: the port path passes as before, and a route is not widened', () => {
  const port = 'const tools = resolveRepository<ToolRepository>(ctx, "ToolRepository");\nconst rows = await tools.list({ toolKey });\nawait tools.create(record);';
  assert.deepEqual(gate(port), []);
  assert.deepEqual(gate('await listTool({}, ctx);', 'route'), ['ARRIVAL_UPSERT_WITHOUT_LOOKUP'], 'a route looks up through the port');
  assert.match(arrivalUpsertProblems('await listTool({}, ctx); await updateTool(i, ctx);', UPSERT, 'process', 'the process p', CALLS)[0], /usecase `createTool` that the def lists/u);
});

async function recorded() {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'agents-2e3e5a1b', PROJECT);
  const { units } = await loadModuleUnits(PROJECT, 'agents', storEntries());
  const base = createContext({ project: PROJECT, module: 'agents' } as never, units, 'dev');
  const files: Record<string, string> = { 'connections/cm.ts': catalogs('cm'), 'connections/platform.ts': catalogs('platform') };
  const read = async (ref: string) => {
    const hit = Object.entries(files).find(([end]) => ref.endsWith(end));
    return hit ? hit[1] : base.read(ref);
  };
  return { ctx: { ...base, read } as typeof base, units };
}

void test('d1_282 s1: the usecases the gate is given come from the def of the module', async () => {
  const { units } = await recorded();
  const calls = moduleUsecaseCalls(units);
  assert.ok(calls.some(item => item.entityId === 'Tool' && item.operation === 'create' && item.names.includes('createTool')));
  assert.ok(calls.some(item => item.entityId === 'Tool' && item.operation === 'list'));
});

void test('d1_282 s2: the function that receives the arrival is told its input type and the fields of the items; a function that receives nothing gets nothing', async () => {
  const { ctx } = await recorded();
  const data = JSON.parse(fixture('toolCatalogRefresh.defs.ts.txt').replace(/^[\s\S]*?export const definition = /u, '').replace(/ as const;[\s\S]*$/u, '')).data as Record<string, unknown>;
  assert.deepEqual(data.receives, [{ function: 'applyReleaseCatalog', arrival: 'platform.releaseCatalogChanged' }]);
  const section = await receivedInputSection(ctx, data, 'applyReleaseCatalog');
  assert.match(section, /`applyReleaseCatalog` is called with the message of the arrival `platform.releaseCatalogChanged`/u);
  assert.match(section, /import type \{ PlatformReleaseCatalogChangedInput \} from '\/_102034_\/l2\/shared\/contracts\/connections\/platform\.js'/u);
  assert.match(section, /`PlatformCatalogAction` is `\{[^`]*route: string/u);
  assert.equal(isCatalogImport('/_102034_/l2/shared/contracts/connections/platform.js'), true, 'the import the section names is one the gate of the file accepts');
  assert.equal(await receivedInputSection(ctx, data, 'chooseToolsForAgents'), '', 'a function with no receives gets nothing');
  assert.equal(await receivedInputSection(ctx, { ...data, receives: undefined }, 'applyReleaseCatalog'), '');
  const all = await receivedInputSection(ctx, data);
  assert.equal(all, section, 'no focus: every function that receives');
});

void test('d1_282 s2: the context of the function in focus carries the section', async () => {
  const { ctx, units } = await recorded();
  const unit = units.find(item => item.unitId === 'toolCatalogRefresh')!;
  // The recorded state predates `receives`: the unit carries it as the live def does.
  const withReceives = { ...unit, definition: { ...unit.definition, data: { ...unit.definition.data, receives: [{ function: 'applyReleaseCatalog', arrival: 'platform.releaseCatalogChanged' }] } } };
  const focused = await loadWorkflowContext(ctx, withReceives as never, undefined, 'applyReleaseCatalog');
  assert.match(focused.human, /What the functions that receive an arrival are called with/u);
  assert.match(focused.human, /PlatformReleaseCatalogChangedInput/u);
  const other = await loadWorkflowContext(ctx, withReceives as never, undefined, 'chooseToolsForAgents');
  assert.equal(other.human.includes('What the functions that receive an arrival are called with'), false);
});
