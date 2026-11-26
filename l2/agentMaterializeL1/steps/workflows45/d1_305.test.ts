/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/d1_305.test.ts" enhancement="_blank"/>

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
const COMMIT = '294d7a31';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const SECTION = 'The transaction of the route';
const OUTSIDE = 'A call to a system outside the module is not undone by the transaction.';
const PER_ARRIVAL = 'The occurrence is one per arrival:';
const ON_CREATION = 'On creation, `recordId = occurrenceRecordId';
const CREATION_IN_ARRIVAL = 'On creation in an arrival, `recordId = occurrenceRecordId(ctx, ';
const SEED_ORDER = '`seed` is, in order: the key of the message the L4 names; otherwise `ctx.requestMeta?.connection?.idempotencyKey`; otherwise `ctx.requestMeta?.requestId`.';
const SEED_PRESENT = 'On an arrival served by a connection, `requestId` is always present:';
const SEED_GUARD = 'When none of the three is present, the function throws `AppError` with its own code.';

function extract(root: string, paths: string[]): void {
  if (existsSync(path.join(root, paths[0]))) return;
  mkdirSync(root, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, ...paths.slice(1)], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT}`);
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

async function loaded(moduleName: string, root: string, marker: string, archive: string[]) {
  extract(root, [marker, ...archive]);
  const host = installStudio(PROJECT);
  for (const abs of walk(root)) put(host, fixtureLogicalRel(path.relative(root, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), COMMIT);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const { units } = await loadModuleUnits(PROJECT, moduleName, storEntries());
  const base = createContext({ project: PROJECT, module: moduleName } as never, units, 'dev');
  const files: Record<string, string> = { 'connections/cm.ts': readFileSync(path.join(HERE, '../../../agentDefsL1/steps/input20/fixtures/d1_298/cmConnection.recorded.txt'), 'utf8'), 'connections/platform.ts': catalog('platform') };
  const read = async (ref: string) => {
    const hit = Object.entries(files).find(([end]) => ref.endsWith(end));
    return hit ? hit[1] : base.read(ref);
  };
  const ctx = { ...base, read } as typeof base;
  const human = async (processId: string, focus?: string) => (await loadWorkflowContext(ctx, units.find(item => item.unitId === processId) as never, undefined, focus)).human;
  return { human, units };
}

function occurrence(text: string): string {
  const start = text.indexOf('## Occurrence record id');
  if (start < 0) return '';
  const rest = text.slice(start);
  const next = rest.indexOf('\n## ', 3);
  return next < 0 ? rest : rest.slice(0, next);
}

const PROCESSES = ['applyCmDisable', 'applyCmIdentity', 'deliverIncomingMessage', 'sendCmMessage'];

void test('d1_305 s1: the four telegram processes name the resolved output and the arrival seed', async () => {
  const { human } = await loaded('telegram', '/tmp/d1_305_real_294', 'l4/telegram/workflows.defs.ts', ['l1/telegram', 'l2/telegram', 'l4/telegram', 'l4/organization', 'l5']);
  const texts = new Map<string, string>();
  for (const id of PROCESSES) texts.set(id, await human(id));
  const send = texts.get('sendCmMessage') ?? '';
  assert.match(send, /TelegramBotRepository/u);
  assert.match(send, /CmSendChannelMessageOutput/u);
  assert.match(send, /channelMessageId/u);
  assert.equal(send.includes('The function returns `{}`'), false);
  assert.ok(send.includes(CREATION_IN_ARRIVAL), 'sendCmMessage creates the occurrence entity');
  assert.match(send, /occurrenceRecordId\(ctx, 'sendCmMessage', seed\)/u);
  assert.match(send, /createOccurrenceContext\(ctx, recordId\)/u);
  assert.ok(!send.includes(ON_CREATION) && !send.includes(PER_ARRIVAL));
  const deliver = texts.get('deliverIncomingMessage') ?? '';
  assert.match(deliver, /MessageArrivedOutput/u);
  assert.match(deliver, /Its definition: `Record<string, never>`/u);
  assert.match(deliver, /The function returns `\{\}`/u);
  assert.ok(deliver.includes(PER_ARRIVAL), 'deliverIncomingMessage upserts the occurrence entity');
  assert.match(deliver, /occurrenceRecordId\(ctx, 'deliverIncomingMessage', seed\)/u);
  assert.ok(!deliver.includes(ON_CREATION) && !deliver.includes(CREATION_IN_ARRIVAL));
  for (const id of ['applyCmDisable', 'applyCmIdentity'] as const) {
    const text = texts.get(id) ?? '';
    assert.ok(text.includes(PER_ARRIVAL), id);
    assert.match(text, /occurrenceRecordId\(ctx, '[^']+', seed\)/u, id);
    assert.match(text, /Its definition: `\{\}`/u, id);
    assert.match(text, /The function returns `\{\}`/u, id);
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
    assert.ok(text.includes(SEED_ORDER), id);
    assert.ok(text.includes(SEED_PRESENT), id);
    assert.ok(text.includes(SEED_GUARD), id);
  }
  assert.ok(PROCESSES.some(id => (texts.get(id) ?? '').includes(OUTSIDE)), 'at least one telegram process calls a system outside');

  const agents = await loaded('agents', '/tmp/d1_305_agents_294', 'l4/agents/workflows.defs.ts', ['l1/agents', 'l2/agents', 'l4/agents', 'l4/organization', 'l5']);
  for (const id of ['virtualEmployeeCreation', 'executionRecording']) {
    const section = occurrence(await agents.human(id));
    const personCreation = section.includes(ON_CREATION) && !section.includes(', seed)');
    if (personCreation) {
      assert.equal(section.includes('idempotencyKey'), false, id);
      assert.equal(section.includes('AppError'), false, id);
    }
  }
});
