/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/d1_309.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadWorkflowContext } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const PROJECT = 102047;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const FIRST_NEW_ID = '`createOccurrenceContext(ctx, recordId)` makes the first `newId` the id of the record. The generated usecase uses that first `newId` for the `id` (`ctx.idGenerator.newId()`).';
const CALL_OUTPUT = 'The output type of a `call` is resolved the same way as the input (`resolveInputType`, cited types three levels down).';
const GATEWAY_ERROR = "new AppError(result.code, result.message, STATUS[result.code], result.code === 'disabled' && result.missing ? { missing: result.missing } : undefined)";
const CONFLICT_ENDS = 'is the repeat only when it is thrown by the write of the record the repeat search of the L4 reads';
const NOT_A_GAP = 'Guarantees the L4 and the platform do not give are not a SOURCE_GAP.';

function extract(root: string, commit: string, paths: string[]): void {
  if (existsSync(path.join(root, paths[0]))) return;
  mkdirSync(root, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', commit, ...paths.slice(1)], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${commit}`);
  const extracted = spawnSync('tar', ['-x', '-C', root], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const abs = path.join(dir, name);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
}

function put(host: TestHost, rel: string, text: string, tag: string): void {
  const platform = /^_(\d+)_\/(.+)$/.exec(rel);
  const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, rel);
  if (info) seed(host, info, text, tag);
}

const catalog = (name: string) => readFileSync(path.join(BASE, `mls-102021/l2/agentDefsL1/fixtures/agents-2e3e5a1b/_102034_/l2/shared/contracts/connections/${name}.txt`), 'utf8');

async function loaded(moduleName: string, root: string, commit: string, marker: string, archive: string[]) {
  extract(root, commit, [marker, ...archive]);
  const host = installStudio(PROJECT);
  for (const abs of walk(root)) put(host, fixtureLogicalRel(path.relative(root, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), commit);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const { units } = await loadModuleUnits(PROJECT, moduleName, storEntries());
  const base = createContext({ project: PROJECT, module: moduleName } as never, units, 'dev');
  const files: Record<string, string> = { 'connections/cm.ts': readFileSync(path.join(HERE, '../../../agentDefsL1/steps/input20/fixtures/d1_298/cmConnection.recorded.txt'), 'utf8'), 'connections/platform.ts': catalog('platform') };
  const read = async (ref: string) => {
    const hit = Object.entries(files).find(([end]) => ref.endsWith(end));
    return hit ? hit[1] : base.read(ref);
  };
  const ctx = { ...base, read } as typeof base;
  const human = async (processId: string) => (await loadWorkflowContext(ctx, units.find(item => item.unitId === processId) as never)).human;
  return { human, units };
}

void test('d1_309 s1: arrival processes of telegram carry the four phrases (0790236f)', async () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.ok(prompt.includes(NOT_A_GAP), 'prompt');
  assert.match(prompt, /exclusion beyond unique keys and the transaction/u);
  assert.match(prompt, /exactly once with a system outside/u);
  assert.match(prompt, /still a gap/u);
  const { human, units } = await loaded('telegram', '/tmp/d1_309_real_079', '0790236f', 'l4/telegram/workflows.defs.ts', ['l1/telegram', 'l2/telegram', 'l4/telegram', 'l4/organization', 'l5']);
  const arrivals = units.filter(item => item.definition.artifactType === 'workflowProcess' && item.definition.data && typeof item.definition.data === 'object' && item.definition.data.receives);
  assert.ok(arrivals.length > 0, 'arrivals');
  for (const unit of arrivals) {
    const text = await human(unit.unitId);
    const creates = text.includes('the create usecase is called with `createOccurrenceContext(ctx, recordId)`');
    if (creates) assert.ok(text.includes(FIRST_NEW_ID), `${unit.unitId}: first newId`);
    const calls = text.includes('## Calls of the steps');
    if (calls) {
      assert.ok(text.includes(CALL_OUTPUT), `${unit.unitId}: call output`);
      assert.ok(text.includes(GATEWAY_ERROR), `${unit.unitId}: gateway error`);
      assert.match(text, /`code` is one of `not_found`, `disabled`, `unavailable`, `conflict`, `refused`, `forbidden`, `invalid`/u, unit.unitId);
    }
    if (text.includes('## The transaction of the route')) assert.ok(text.includes(CONFLICT_ENDS), `${unit.unitId}: conflict ends`);
  }
  const deliver = await human('deliverIncomingMessage');
  const send = await human('sendCmMessage');
  assert.ok(deliver.includes(FIRST_NEW_ID) || send.includes(FIRST_NEW_ID), 'a telegram arrival states the first newId');
  assert.ok(deliver.includes(CALL_OUTPUT) || send.includes(CALL_OUTPUT), 'a telegram arrival resolves the call output');
  assert.ok(deliver.includes(CONFLICT_ENDS) && send.includes(CONFLICT_ENDS), 'both arrivals end the function on CONFLICT');
});

void test('d1_309 s1: agents (be5e6203) — the phrase is present where the case exists', async () => {
  const agents = await loaded('agents', '/tmp/d1_309_agents_be5', 'be5e6203', 'l4/agents/workflows.defs.ts', ['l1/agents', 'l2/agents', 'l4/agents', 'l4/organization', 'l5']);
  const ids = ['virtualEmployeeCreation', 'executionRecording', 'toolCatalogRefresh'];
  const found = { create: [] as string[], call: [] as string[], conflict: [] as string[] };
  for (const id of ids) {
    const text = await agents.human(id);
    if (text.includes(FIRST_NEW_ID)) found.create.push(id);
    if (text.includes(CALL_OUTPUT)) found.call.push(id);
    if (text.includes(CONFLICT_ENDS)) found.conflict.push(id);
  }
  assert.ok(found.create.length + found.call.length + found.conflict.length > 0, JSON.stringify(found));
  console.log(`d1_309 agents ${JSON.stringify(found)}`);
});
