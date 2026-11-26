/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/d1_307.test.ts" enhancement="_blank"/>

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
const ADDRESS = 'Object.values(ctx.requestMeta?.connection?.context?.hookParams ?? {})[0]';
const KEPT = 'after that call returns it throws `new AppError(code, message, 422)`';

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

void test('d1_307 s1: the two outside arrivals read the address from ctx and keep a refusal; a platform arrival does not', async () => {
  const { human } = await loaded('telegram', '/tmp/d1_307_real_3f4', '3f481f59', 'l4/telegram/workflows.defs.ts', ['l1/telegram', 'l2/telegram', 'l4/telegram', 'l4/organization', 'l5']);
  const deliver = await human('deliverIncomingMessage');
  assert.ok(deliver.includes(ADDRESS), 'deliverIncomingMessage');
  assert.ok(deliver.includes(KEPT), 'deliverIncomingMessage');
  assert.equal(/robo|bot/iu.test(deliver.split('hookParams')[1]?.split('\n')[0] ?? ''), false, 'deliverIncomingMessage');
  for (const id of ['sendCmMessage', 'applyCmDisable', 'applyCmIdentity']) {
    const text = await human(id);
    assert.equal(text.includes('hookParams'), false, id);
    assert.equal(text.includes(KEPT), false, id);
  }
  const agents = await loaded('agents', '/tmp/d1_307_agents_be5', 'be5e6203', 'l4/agents/workflows.defs.ts', ['l1/agents', 'l2/agents', 'l4/agents', 'l4/organization', 'l5']);
  for (const id of ['virtualEmployeeCreation', 'executionRecording', 'toolCatalogRefresh']) {
    const text = await agents.human(id);
    assert.equal(text.includes('hookParams'), false, id);
    assert.equal(text.includes(KEPT), false, id);
  }
});
