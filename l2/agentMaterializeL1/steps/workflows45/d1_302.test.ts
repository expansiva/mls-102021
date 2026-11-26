/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/d1_302.test.ts" enhancement="_blank"/>

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
const COMMIT = 'ae5ea0ba';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_302_real_ae5';
const SECTION = 'The transaction of the route';
const OUTSIDE = 'A call to a system outside the module is not undone by the transaction.';
const PER_ARRIVAL = 'The occurrence is one per arrival:';
const ON_CREATION = 'On creation, `recordId = occurrenceRecordId';
const CREATION_IN_ARRIVAL = 'On creation in an arrival, `recordId = occurrenceRecordId(ctx, ';

function extract(): void {
  if (existsSync(path.join(ROOT, 'l4/telegram/workflows.defs.ts'))) return;
  mkdirSync(ROOT, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/telegram', 'l2/telegram', 'l4/telegram', 'l4/organization', 'l5'], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT}`);
  const extracted = spawnSync('tar', ['-x', '-C', ROOT], { input: archived.stdout });
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

async function loaded() {
  extract();
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) put(host, fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), COMMIT);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const { units } = await loadModuleUnits(PROJECT, 'telegram', storEntries());
  const base = createContext({ project: PROJECT, module: 'telegram' } as never, units, 'dev');
  const files: Record<string, string> = { 'connections/cm.ts': readFileSync(path.join(HERE, '../../../agentDefsL1/steps/input20/fixtures/d1_298/cmConnection.recorded.txt'), 'utf8'), 'connections/platform.ts': catalog('platform') };
  const read = async (ref: string) => {
    const hit = Object.entries(files).find(([end]) => ref.endsWith(end));
    return hit ? hit[1] : base.read(ref);
  };
  const ctx = { ...base, read } as typeof base;
  const human = async (processId: string, focus?: string) => (await loadWorkflowContext(ctx, units.find(item => item.unitId === processId) as never, undefined, focus)).human;
  return { human, units };
}

const PROCESSES = ['applyCmDisable', 'applyCmIdentity', 'deliverIncomingMessage', 'sendCmMessage'];

void test('d1_302 s1: arrival context names the reference port, the per-arrival occurrence, the outside call and the catalog output', async () => {
  const { human } = await loaded();
  const texts = new Map<string, string>();
  for (const id of PROCESSES) texts.set(id, await human(id));
  const send = texts.get('sendCmMessage') ?? '';
  assert.match(send, /TelegramBotRepository/u);
  assert.match(send, /CmSendChannelMessageOutput/u);
  // d1_304: the arrival that creates the occurrence entity still takes a seed (no person on an arrival from a system outside).
  assert.ok(send.includes(CREATION_IN_ARRIVAL), 'sendCmMessage creates the occurrence entity');
  assert.match(send, /occurrenceRecordId\(ctx, 'sendCmMessage', seed\)/u);
  assert.match(send, /createOccurrenceContext\(ctx, recordId\)/u);
  assert.ok(!send.includes(ON_CREATION) && !send.includes(PER_ARRIVAL));
  const deliver = texts.get('deliverIncomingMessage') ?? '';
  assert.match(deliver, /MessageArrivedOutput/u);
  // d1_304: an upsert of the occurrence entity is not a creation: the second message of a conversation must not open `existing`.
  assert.ok(deliver.includes(PER_ARRIVAL), 'deliverIncomingMessage upserts the occurrence entity');
  assert.match(deliver, /occurrenceRecordId\(ctx, 'deliverIncomingMessage', seed\)/u);
  assert.ok(!deliver.includes(ON_CREATION) && !deliver.includes(CREATION_IN_ARRIVAL));
  for (const id of ['applyCmDisable', 'applyCmIdentity'] as const) {
    const text = texts.get(id) ?? '';
    assert.ok(text.includes(PER_ARRIVAL), id);
    assert.match(text, /occurrenceRecordId\(ctx, '[^']+', seed\)/u, id);
    assert.match(text, /ctx\.requestMeta\?\.requestId/u, id);
    assert.match(text, /executionRecording/u, id);
    assert.match(text, /toolCatalogRefresh/u, id);
    assert.ok(!text.includes(ON_CREATION), id);
  }
  assert.match(texts.get('applyCmIdentity') ?? '', /CmSetChannelConversationIdentityOutput/u);
  assert.match(texts.get('applyCmDisable') ?? '', /CmDisableChannelOutput/u);
  for (const id of PROCESSES) {
    const text = texts.get(id) ?? '';
    assert.ok(text.includes(SECTION), id);
    assert.equal(text.includes(OUTSIDE), text.includes('## Connection gateways'), `${id}: the outside-call sentence is there when the process calls a system outside`);
    assert.match(text, /the route returns what the function returns/u, id);
  }
  assert.ok(PROCESSES.some(id => (texts.get(id) ?? '').includes(OUTSIDE)), 'at least one telegram process calls a system outside');
});
