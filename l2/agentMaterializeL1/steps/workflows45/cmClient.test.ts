/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/cmClient.test.ts" enhancement="_blank"/>

// d1_347 s4: what the contexts of the models say about the cm. With the key of stage 2 OFF (the generator as committed) nothing of the platform client is said (the contexts are the ones before: the bench proof compares
// every context of four modules byte for byte); ON, the usecase that calls the cm, the process a route served to the cm calls and the request service of that route say it, with the three adjustments of the planner.

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

import { installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';
import { CM_BEFORE_ONCE, CM_CALL_RULES, CM_CONFLICT, CM_ONCE, CM_ONCE_IMPORT, CM_ORDER, CM_REFUSAL, CM_REQUEST_ORDER, CM_SERVE_RULES } from '/_102021_/l2/agentMaterializeL1/helpers/cmClientText.js';
import { stage2 } from '/_102021_/l2/agentMaterializeL1/helpers/m12Stage2.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadUsecaseContext } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { loadWorkflowContext } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';
import { loadRequestContext } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const PROJECT = 102047;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_347_telegram_25b9ae8d';
const HAS = existsSync(path.join(BASE, 'mls-102034/l1/server/layer_1_external/connections/cm/index.ts')) && spawnSync('git', ['-C', REPO, 'cat-file', '-e', '25b9ae8d:l1/telegram']).status === 0;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => { const abs = path.join(dir, name); return statSync(abs).isDirectory() ? walk(abs) : [abs]; });
}

async function contexts() {
  if (!existsSync(path.join(ROOT, 'l1/telegram'))) {
    mkdirSync(ROOT, { recursive: true });
    const archived = spawnSync('git', ['-C', REPO, 'archive', '25b9ae8d', 'l1/telegram', 'l2/telegram', 'l4/telegram', 'l4/organization', 'l5'], { maxBuffer: 128 * 1024 * 1024 });
    assert.equal(archived.status, 0);
    assert.equal(spawnSync('tar', ['-x', '-C', ROOT], { input: archived.stdout }).status, 0);
  }
  const host: TestHost = installStudio(PROJECT);
  const put = (rel: string, text: string, tag: string) => { const m = /^_(\d+)_\/(.+)$/.exec(rel); const info = m ? fileInfoFromDisplay(Number(m[1]), m[2]) : fileInfoFromDisplay(PROJECT, rel); if (info) seed(host, info, text, tag); };
  for (const abs of walk(ROOT)) put(fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), '25b9ae8d');
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(rel, text, 'platform');
  const { units } = await loadModuleUnits(PROJECT, 'telegram', storEntries());
  const base = createContext({ project: PROJECT, module: 'telegram' } as never, units, 'dev');
  const catalog = readFileSync(path.join(BASE, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
  const read = async (ref: string) => (/\/connections\/cm\.ts$/u.test(ref) ? catalog : base.read(ref));
  const ctx = { ...base, read } as typeof base;
  const unit = (layer: string, id: string) => units.find(item => item.layer === layer && item.unitId === id) as never;
  return {
    usecase: async () => (await loadUsecaseContext(ctx, unit('usecases', 'listCmAgent'))).human,
    process: async () => (await loadWorkflowContext(ctx, unit('workflows', 'sendCmMessage'))).human,
    requests: async () => (await loadRequestContext(ctx, unit('requests', 'cm'))).human,
  };
}

async function inStage2<T>(on: boolean, run: () => Promise<T>): Promise<T> {
  const before = stage2.on;
  stage2.on = on;
  try { return await run(); } finally { stage2.on = before; }
}

void test('d1_347 s4: the phrases carry the three adjustments of the planner', () => {
  assert.ok(CM_CALL_RULES.some(rule => /A code the l4 does not handle, and `unavailable`, is not a refusal of yours: throw an `AppError` with the code and the message of the cm\. Never return a default value and never drop the answer\./u.test(rule)));
  assert.match(CM_CONFLICT, /A version conflict is answered as `\{ ok: false, code: 'conflict', message \}`; a repeat is not a conflict: `once` handles it\./u);
  assert.match(CM_ONCE, /the reference the cm sends when the l4 names one; otherwise `ctx\.requestMeta\.connection\.idempotencyKey`\./u);
  assert.match(CM_REFUSAL, /Never throw an `AppError` for a refusal that the rule decides\./u);
  assert.equal(CM_SERVE_RULES.length, 8);
  assert.ok(CM_SERVE_RULES.includes(CM_BEFORE_ONCE));
  assert.match(CM_BEFORE_ONCE, /^Before `once`, read only what that refusal needs \(for example, that the record it names exists\)\. A repeat of a request already answered is handled by `once` and by the process, not by you: do not read records to find it\.$/u);
  assert.match(CM_ONCE_IMPORT, /import \{ once \} from '\/_102034_\/l1\/server\/layer_1_external\/connections\/cm\/index\.js'/u);
  assert.match(CM_ONCE_IMPORT, /once<T>\(ctx: RequestContext, where: \{ scope: string; key: string \}, work: \(\) => Promise<T>\): Promise<T>/u);
  assert.match(CM_REQUEST_ORDER, /read it with the read functions of the module/u);
  // d1_347 s7: the request service is told that the controller calls `serveCm`; the process keeps the order of the layers.
  assert.ok(CM_SERVE_RULES.includes(CM_REQUEST_ORDER) && !CM_SERVE_RULES.includes(CM_ORDER));
  assert.match(CM_REQUEST_ORDER, /^`serveCm` is called by the controller of the route, never by your function/u);
  assert.match(CM_REQUEST_ORDER, /Never call `serveCm`, never open `runInTransaction`, never build a bound context\.$/u);
});

void test('d1_347 s4: off, the contexts say nothing of the platform client; on, each says its part', { skip: !HAS && 'needs mls-102034 with the cm client and mls-102047@25b9ae8d' }, async () => {
  const get = await contexts();
  const off = { usecase: await get.usecase(), process: await get.process(), requests: await get.requests() };
  for (const [name, text] of Object.entries(off)) {
    assert.equal(/cm\(ctx\)|serveCm|CmServeAnswer|\bonce\(/u.test(text), false, `${name}: off says nothing of stage 2`);
  }
  assert.match(off.usecase, /resolveRepository<<Connection>Gateway>/u);
  assert.match(off.process, /already runs it inside `ctx\.data\.moduleData\.runInTransaction`/u);
  await inStage2(true, async () => {
    const usecase = await get.usecase();
    assert.match(usecase, /const answer = await cm\(ctx\)\.<operation>\(input\);/u);
    assert.equal(usecase.includes('resolveRepository<<Connection>Gateway>'), false, 'the cm is not a gateway: no gateway rule when it is the only connection');
    assert.match(usecase, /`cm\(ctx\)\.listAgents\(input: CmListAgentsInput/u);
    const process = await get.process();
    assert.match(process, /is called by a route served to the cm, which runs inside the transaction that `serveCm` opens/u);
    assert.equal(process.includes('already runs it inside `ctx.data.moduleData.runInTransaction`'), false);
    assert.equal(process.includes('A `CONFLICT` (a unique key) or a version conflict is the repeat only when'), false);
    assert.match(process, /BEFORE the `once`/u);
    const requests = await get.requests();
    assert.match(requests, /Promise<CmServeAnswer<CmSendChannelMessageOutput>>/u);
    assert.match(requests, /import type \{ CmServeAnswer \} from '\/_102034_\/l1\/server\/layer_1_external\/connections\/cm\/index\.js'/u);
    assert.match(requests, /`serveCm` is called by the controller of the route, never by your function/u);
    assert.doesNotMatch(requests, /the order is: `serveCm`/u);
    assert.match(requests, /`once` is a value of the cm client: `import \{ once \} from '/u);
    assert.match(requests, /Read functions of the module \(the state a refusal before `once` depends on\)/u);
    assert.match(requests, /Usecase listTelegramConversation/u);
  });
  assert.equal(stage2.on, false, 'the key is put back');
});
