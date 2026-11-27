/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/openArrival.test.ts" enhancement="_blank"/>

// d1_348: the arrival of a system outside the platform that the module declares (the telegram) is called with a body that system grows: the controller opens the input at every level (a key the type does not
// list is ignored, a known field is still checked). The routes served to the cm and the routes of a page stay closed, byte for byte.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { emitController, validateSource } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { parseDefinitionExport } from '/_102021_/l2/agentMaterializeL1/emitters/usecaseIntent.js';

const MONO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const TREE = '/tmp/d1_348_telegram_25b9ae8d';
const HAS = spawnSync('git', ['-C', path.join(MONO, 'mls-102047'), 'cat-file', '-e', '25b9ae8d:l1/telegram']).status === 0;

// A real update of the Telegram: `from.is_bot`, `from.language_code`, `/start` with its `entities`, and a key at the top the module does not know.
const REAL_UPDATE = {
  update_id: 1001,
  message: {
    message_id: 7, date: 1764230000,
    chat: { id: 555, type: 'private', first_name: 'Ana', username: 'ana', language_code: 'pt' },
    from: { id: 555, is_bot: false, first_name: 'Ana', username: 'ana', language_code: 'pt-BR' },
    text: '/start',
    entities: [{ offset: 0, length: 6, type: 'bot_command' }],
  },
  edited_message_hint: { anything: true },
};

function tree(): void {
  if (existsSync(path.join(TREE, 'l1/telegram'))) return;
  mkdirSync(TREE, { recursive: true });
  const archived = spawnSync('git', ['-C', path.join(MONO, 'mls-102047'), 'archive', '25b9ae8d', 'l1/telegram', 'l2/telegram', 'l4/telegram'], { maxBuffer: 128 * 1024 * 1024 });
  assert.equal(archived.status, 0);
  assert.equal(spawnSync('tar', ['-x', '-C', TREE], { input: archived.stdout }).status, 0);
}

const read = async (ref: string): Promise<string | null> => {
  const own = /^\/?_102047_\/(.+)$/u.exec(ref);
  if (own) { const file = path.join(TREE, own[1]); return existsSync(file) ? readFileSync(file, 'utf8') : null; }
  const platform = /^\/?_102034_\/(.+)$/u.exec(ref);
  if (platform) { const file = path.join(MONO, 'mls-102034', platform[1]); return existsSync(file) ? readFileSync(file, 'utf8') : null; }
  return null;
};

async function emitted(controller: string): Promise<string> {
  tree();
  const defs = readFileSync(path.join(TREE, `l1/telegram/layer_1_external/adapters/http/controllers/${controller}.defs.ts`), 'utf8');
  const parsed = parseDefinitionExport(defs);
  assert.ok(parsed, controller);
  const out = await emitController(parsed as never, `_102047_/l1/telegram/layer_1_external/adapters/http/controllers/${controller}.ts`, read);
  assert.ok('source' in out, JSON.stringify(out));
  return out.source;
}

async function load(source: string): Promise<{ routes: Array<{ key: string; handler: (input: { request: unknown; ctx: unknown }) => Promise<{ ok: boolean }> }> }> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'open-arrival-'));
  const rewritten = source
    .replace(/from '\/_102047_\/l1\/telegram\/layer_2_application\/scope\/accessScope\.js';/u, "from './scope.js';")
    .replace(/from '\/_102047_\/l1\/telegram\/layer_1_external\/auth\/authorityMap\.js';/u, "from './authority.js';")
    .replace(/from '\/_102047_\/l1\/telegram\/layer_2_application\/requests\/[a-z]+\.js';/u, "from './requests.js';")
    .replace(/import type \{[^}]*\} from '\/_102047_[^']*';\n/gu, '')
    .replace(/from '\/_102034_\/l1\/server\/layer_2_controllers\/contracts\.js';/u, `from '${pathToFileURL(path.join(MONO, 'mls-102034/l1/server/layer_2_controllers/contracts.ts')).href}';`);
  writeFileSync(path.join(dir, 'scope.ts'), 'export function resolveGrant(grantId: string) { return { grantId, scopeMode: "organization", entityRefs: [], recordFields: {} }; }\n');
  writeFileSync(path.join(dir, 'authority.ts'), 'export function actorRefFor(grantId: string) { return grantId.replace("connection_", "connection:"); }\n');
  writeFileSync(path.join(dir, 'requests.ts'), 'export const requests = new Proxy({}, { get: () => async (input: unknown) => ({ received: true, input }) });\n');
  writeFileSync(path.join(dir, 'controller.ts'), rewritten);
  try { return await import(pathToFileURL(path.join(dir, 'controller.ts')).href); } finally { rmSync(dir, { recursive: true, force: true }); }
}

const envelope = (params: unknown) => ({ request: { params, meta: { source: 'http', verifiedAuthorities: ['telegram:connection:telegram'] } }, ctx: {} });

void test('d1_348: the helper of a closed controller is the one before, byte for byte; only an open controller carries the wildcard', () => {
  const closed = validateSource();
  assert.equal(closed.includes("open.includes('*')"), false);
  assert.equal(validateSource(false), closed);
  const open = validateSource(true);
  assert.match(open, /open\.includes\('\*'\) \|\| open\.some\(/u);
  assert.equal(open.replace("open.includes('*') || ", ''), closed, 'the only difference is the wildcard');
});

void test('d1_348: the telegram arrival opens the input at every level; a known field is still checked; the cm and page routes stay closed', { skip: !HAS && 'needs mls-102047@25b9ae8d' }, async () => {
  const source = await emitted('telegram');
  assert.match(source, /validateInput\(scoped, \[[^\]]*\], \[[^\]]*\], \[[^\]]*\], \{[^}]*\}, \['\*'\]\);/u, 'the call passes the open input');
  assert.match(source, /open\.includes\('\*'\)/u);
  const route = (await load(source)).routes.find(item => item.key === 'telegram.telegram.messageArrived');
  assert.ok(route);
  const ok = await route.handler(envelope(REAL_UPDATE));
  assert.equal(ok.ok, true, 'the real update is accepted');
  // the minimum of before is one more case
  await route.handler(envelope({ update_id: 1, message: { message_id: 1, date: 1, chat: { id: 1, type: 'private' }, from: { id: 1 } } }));
  // a known field is still checked
  await assert.rejects(route.handler(envelope({ ...REAL_UPDATE, update_id: undefined })), /update_id is required/u);
  await assert.rejects(route.handler(envelope({ ...REAL_UPDATE, message: { ...REAL_UPDATE.message, date: null } })), /message\.date must not be null/u);
  await assert.rejects(route.handler(envelope({ ...REAL_UPDATE, message: { ...REAL_UPDATE.message, chat: undefined } })), /message\.chat is required/u);
  // the proof of the defect: the controller of 25b9ae8d (the closed list) refuses the same real update
  const old = (await load(readFileSync(path.join(TREE, 'l1/telegram/layer_1_external/adapters/http/controllers/telegram.ts'), 'utf8'))).routes.find(item => item.key === 'telegram.telegram.messageArrived');
  assert.ok(old);
  await assert.rejects(old.handler(envelope(REAL_UPDATE)), /message\.[a-z_.]+ is not permitted/u);
  // the closed controller: the same unknown keys are refused (the defect of the VM), and its helper has no wildcard
  const closed = await emitted('cm');
  assert.equal(closed.includes("open.includes('*')"), false, 'the cm controller keeps the closed helper');
  assert.equal(/\['\*'\]\);/u.test(closed), false);
});
