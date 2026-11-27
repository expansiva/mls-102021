/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smoke.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { entityOfIdParam, planSmoke } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokePlan.js';
import { extractModule, smokeModule } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokeCli.js';

function fixtureTree(): string {
  const tree = mkdtempSync(path.join(os.tmpdir(), 'smoke-plan-'));
  const write = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true }); writeFileSync(path.join(tree, rel), text); };
  write('l2/demo/web/contracts/items.defs.ts', `
export interface Item { id: string; name: string; status: 'open' | 'closed'; note?: string }
export interface ItemsContracts {
  'demo.items.getItem': { kind: 'qry'; input: { id: string }; output: { item: Item }; access: { actors: ['clerk']; grants: ['read']; scope: 'organization' } };
  'demo.items.createItem': { kind: 'cmd'; input: { name: string; tags?: string[] }; output: { item: Item }; access: { actors: ['clerk']; grants: ['write']; scope: 'organization' } };
}
`);
  write('l1/demo/layer_2_application/requests/items.defs.ts', `export const definition = ${JSON.stringify({ data: { pageId: 'items', requests: [{ route: 'demo.items.getItem', params: [], output: [{ kind: 'entity', entity: 'Item' }] }] } })} as const;`);
  write('l1/demo/layer_1_external/adapters/integration/outbound.ts', `
import type { PingOutput } from '/_102099_/l1/demo/layer_1_external/connections/ping.js';
export interface PingGateway {
  ping(input: unknown, ctx: unknown): Promise<PingOutput>;
}
`);
  write('l1/demo/layer_1_external/connections/ping.ts', `export type PingOutput = { ok: true; at: string } | { ok: false; reason: string };`);
  return tree;
}

void test('d1_321 B: the plan has one case per route with the smallest input, the id bound to the output entity, the actor of the contract, and the gateway answers from the catalog type', () => {
  const plan = planSmoke(fixtureTree(), 102099, 'demo', '/nowhere');
  assert.deepEqual(plan.routes.map(item => [item.route, item.kind, item.actor, item.input]), [
    ['demo.items.getItem', 'qry', 'clerk', { id: '<seed:Item.id>' }],
    ['demo.items.createItem', 'cmd', 'clerk', { name: 'sample' }],
  ]);
  assert.deepEqual(plan.gateways.map(gateway => [gateway.name, gateway.methods.map(method => [method.name, method.success, method.failure])]), [
    ['PingGateway', [['ping', { ok: true, at: 'sample' }, { ok: false, reason: 'sample' }]]],
  ]);
});

void test('d1_321 B: an id param points at an entity of the output by the name, never by a fixed word', () => {
  assert.equal(entityOfIdParam('id', ['Bot', 'Agent']), 'Bot');
  assert.equal(entityOfIdParam('conversationId', ['TelegramBot', 'TelegramConversation']), 'TelegramConversation');
  assert.equal(entityOfIdParam('page', ['Bot']), '');
  assert.equal(entityOfIdParam('orderId', []), '');
});

import { compareReports } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokeCompare.js';
import type { SmokeCaseResult, SmokeReport } from '/_102021_/l2/agentMaterializeL1/testing/smoke/runSmoke.js';
import { sampleOf, typeNodeOf, typeTableOf } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

function arrivalTree(): string {
  const tree = mkdtempSync(path.join(os.tmpdir(), 'smoke-arrival-'));
  const write = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true }); writeFileSync(path.join(tree, rel), text); };
  write('l1/demo/layer_3_domain/entities/ticket.ts', 'export interface Ticket { id: string }\n');
  write('l1/demo/layer_3_domain/entities/ticketBot.ts', 'export interface TicketBot { id: string }\n');
  write('l1/demo/layer_2_application/requests/hub.defs.ts', `export const definition = ${JSON.stringify({ data: { pageId: 'hub', requests: [{ route: 'demo.hub.close', kind: 'cmd', serves: 'hub.close' }, { route: 'demo.hub.noSuchOperation', kind: 'cmd', serves: 'hub.nothing' }] } })} as const;\n`);
  write('l1/demo/layer_1_external/connections/hub.ts', `
export type CloseInput = { target: { ticketRef: string } | { botRef: string }; reason: string };
export type CloseOutput = Record<string, never>;
export const hub = {
  "operations": [
    {
      "operationId": "close",
      "direction": "serve",
      "inputType": "CloseInput",
      "outputType": "CloseOutput"
    }
  ]
};
`);
  return tree;
}

void test('d1_330 s1: an operation the module serves is planned from the catalog type, one case per way a union input is called, refs bound to the stored record by the name', () => {
  const plan = planSmoke(arrivalTree(), 102099, 'demo', '/nowhere');
  const arrivals = plan.routes.filter(item => item.arrival);
  assert.deepEqual(arrivals.map(item => [item.route, item.kind, item.variant, item.input]), [
    ['demo.hub.close', 'arrival', 'reason+target.ticketRef', { target: { ticketRef: '<seed:Ticket.id>' }, reason: 'sample' }],
    ['demo.hub.close', 'arrival', 'reason+target.botRef', { target: { botRef: '<seed:TicketBot.id>' }, reason: 'sample' }],
  ]);
  assert.equal(arrivals[0].outputType, 'CloseOutput');
  assert.ok(plan.typeSources['arrival:hub']);
  assert.equal(plan.routes.some(item => item.route === 'demo.hub.noSuchOperation'), false, 'an operation the catalog does not name is not planned');
});

void test('d1_330 s1: sampleOf takes the nth member of a union', () => {
  const table = typeTableOf([]);
  const node = typeNodeOf('{ a: string } | { b: number }');
  assert.deepEqual([0, 1, 5].map(variant => sampleOf(node, table, { variant })), [{ a: 'sample' }, { b: 1 }, { b: 1 }]);
});

function report(results: Array<Partial<SmokeCaseResult> & { route: string; verdict: SmokeCaseResult['verdict'] }>): SmokeReport {
  const full = results.map(item => ({ pass: 'happy' as const, kind: 'cmd', status: null, code: null, message: null, conforms: [], output: null, ...item }));
  return { module: 'demo', routes: full.length, executed: full.length, results: full, raw: '', seconds: 0 };
}

void test('d1_330 s2: the comparison lists a verdict that changed, a code that changed, a type that stopped fitting, a case that appeared or went; the same smoke twice has none', () => {
  const before = report([
    { route: 'a', verdict: 'ok' },
    { route: 'b', verdict: 'refused', status: 400, code: 'OLD_CODE' },
    { route: 'c', verdict: 'ok' },
    { route: 'gone', verdict: 'ok' },
    { route: 'same', verdict: 'refused', status: 404, code: 'NOT_FOUND' },
    { route: 'arrive', verdict: 'ok', variant: 'target.botRef' },
  ]);
  const after = report([
    { route: 'a', verdict: 'refused', status: 403, code: 'FORBIDDEN' },
    { route: 'b', verdict: 'refused', status: 400, code: 'NEW_CODE' },
    { route: 'c', verdict: 'ok', conforms: ['$.x: missing'] },
    { route: 'new', verdict: 'ok' },
    { route: 'same', verdict: 'refused', status: 404, code: 'NOT_FOUND' },
    { route: 'arrive', verdict: 'refused', status: 403, code: 'FORBIDDEN', variant: 'target.botRef' },
  ]);
  assert.deepEqual(compareReports(before, after).map(item => [item.kind, item.key]), [
    ['verdict', 'happy a'],
    ['code', 'happy b'],
    ['typed', 'happy c'],
    ['disappeared', 'happy gone'],
    ['verdict', 'happy arrive [target.botRef]'],
    ['appeared', 'happy new'],
  ]);
  assert.deepEqual(compareReports(before, before), []);
});

import { hasUnresolved } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

void test('d1_333 s1a: a type the catalog files do not declare is unresolved, a declared one, a builtin and a union of declared ones are not; a gateway of such a type is marked, never sampled as {}', () => {
  const table = typeTableOf(['export type A = { x: string };\nexport type U = A | { y: number };']);
  assert.equal(hasUnresolved(typeNodeOf('A'), table), false);
  assert.equal(hasUnresolved(typeNodeOf('U'), table), false);
  assert.equal(hasUnresolved(typeNodeOf('Array<A>'), table), false);
  assert.equal(hasUnresolved(typeNodeOf('{ list: Nothing[] }'), table), true);
  assert.equal(hasUnresolved(typeNodeOf('Nothing'), table), true);
  assert.equal(hasUnresolved(typeNodeOf('A | Nothing'), table), true);
  const tree = mkdtempSync(path.join(os.tmpdir(), 'smoke-unres-'));
  const write = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true }); writeFileSync(path.join(tree, rel), text); };
  write('l1/demo/layer_1_external/adapters/integration/outbound.ts', "import type { Known } from '/_102099_/l1/demo/layer_1_external/connections/ping.js';\nexport interface PingGateway { ok(input: unknown, ctx: unknown): Promise<Known>; lost(input: unknown, ctx: unknown): Promise<Missing>; }\n");
  write('l1/demo/layer_1_external/connections/ping.ts', 'export type Known = { a: string };\n');
  const plan = planSmoke(tree, 102099, 'demo', '/nowhere');
  assert.deepEqual(plan.gateways[0].methods.map(method => [method.name, method.unresolved === true]), [['ok', false], ['lost', true]]);
});

import { readFileSync } from 'node:fs';
import { installMemoryPort } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokePort.js';

void test('d1_336 s1: the engine of the COPY gets the occurrence port in memory; a tree without that engine is left alone', () => {
  const tree = mkdtempSync(path.join(os.tmpdir(), 'smoke-port-'));
  const write = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true }); writeFileSync(path.join(tree, rel), text); };
  assert.equal(installMemoryPort(tree, 102099, 'demo'), false, 'no engine');
  const head = "import { createRuntimeMessagesTaskPort } from '/_102034_/l1/workflow/index.js';\nexport const plans = {};\n";
  write('l1/demo/layer_1_external/adapters/workflow/engine.ts', `${head}/** Production engine. */\nexport const workflowEngine = createModuleWorkflowEngine(createRuntimeMessagesTaskPort({\n  projectId: "102099",\n  moduleId: "demo",\n}));\n`);
  assert.equal(installMemoryPort(tree, 102099, 'demo'), true);
  const engine = readFileSync(path.join(tree, 'l1/demo/layer_1_external/adapters/workflow/engine.ts'), 'utf8');
  assert.ok(engine.startsWith(head), 'what is above the engine is kept');
  assert.match(engine, /export const workflowEngine = createModuleWorkflowEngine\(smokeTaskPort\);/u);
  assert.doesNotMatch(engine, /createRuntimeMessagesTaskPort\(\{/u);
  assert.match(readFileSync(path.join(tree, 'l1/demo/layer_1_external/adapters/workflow/smokeMemoryPort.ts'), 'utf8'), /kind: 'task'/u);
  write('l1/other/layer_1_external/adapters/workflow/engine.ts', 'export const workflowEngine = somethingElse();\n');
  assert.equal(installMemoryPort(tree, 102099, 'other'), false, 'an engine written another way is not touched');
});

void test('d1_336 s1: a text the catalog says is ISO 8601 is sampled as a date; optional members are sampled on request; the delivery address names the entity of the module', () => {
  const table = typeTableOf(['export interface In {\n  /** When it was written, ISO 8601. */\n  writtenAt: string;\n  label: string;\n  note?: string;\n  identity?: { email: string } | { mdmId: string };\n}']);
  const node = typeNodeOf('In');
  assert.deepEqual(sampleOf(node, table), { writtenAt: '2026-01-01T00:00:00.000Z', label: 'sample' });
  assert.deepEqual(sampleOf(node, table, { optional: true, variant: 1 }), { writtenAt: '2026-01-01T00:00:00.000Z', label: 'sample', note: 'sample', identity: { mdmId: 'sample' } });
  const tree = mkdtempSync(path.join(os.tmpdir(), 'smoke-hook-'));
  const write = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true }); writeFileSync(path.join(tree, rel), text); };
  write('l1/demo/layer_3_domain/entities/ticketBot.ts', 'export interface TicketBot { id: string }\n');
  write('l1/demo/layer_3_domain/entities/ticket.ts', 'export interface Ticket { id: string }\n');
  write('l1/demo/layer_2_application/requests/hub.defs.ts', `export const definition = ${JSON.stringify({ data: { pageId: 'hub', requests: [{ route: 'demo.hub.arrived', kind: 'cmd', serves: 'hub.arrived' }] } })} as const;\n`);
  write('l1/demo/layer_1_external/connections/hub.ts', 'export type ArrivedInput = { n: number };\nexport const hub = { "operations": [ { "operationId": "arrived", "direction": "serve", "description": "The hub delivers a message to the bot, on the delivery address of that bot.", "inputType": "ArrivedInput", "outputType": "ArrivedInput" } ] };\n');
  const plan = planSmoke(tree, 102099, 'demo', '/nowhere');
  assert.equal(plan.routes.find(item => item.route === 'demo.hub.arrived')?.hookSeed, 'TicketBot.id');
});

void test('d1_339 s0: a column that is not nullable and has no default refuses a row with no value for it (the database does; the smoke now does too)', async () => {
  const source = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'runSmoke.ts'), 'utf8');
  assert.match(source, /function withNotNull\(runtime\)/u);
  assert.match(source, /violates not-null constraint/u);
  assert.match(source, /code: '23502'/u);
  assert.match(source, /\[0-9\]\[0-9A-Z\]\{4\}/u, 'a SQLSTATE is an exception with a stack, not a decision of the route');
});

void test('d1_340 s0: the smoke checks the value written against the type of the column (a time, a number, a boolean, a uuid), as the database does', () => {
  const source = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'runSmoke.ts'), 'utf8');
  assert.match(source, /const badType = \(column, value\)/u);
  assert.match(source, /invalid input syntax for type /u);
  assert.match(source, /code: wrong === 'timestamp with time zone' \? '22007' : '22P02'/u);
});

// d1_347 s2: the cm of the script (installCmBench) and `bench.serve`: the arrival of the cm goes through the real `connectionServe`, the calls to the cm go through the script.
const BASE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
const HAS_BENCH = existsSync(path.join(BASE, 'mls-102034/l1/server/layer_1_external/connections/cm/cmBench.ts'))
  && spawnSync('git', ['-C', path.join(BASE, 'mls-102047'), 'cat-file', '-e', '25b9ae8d:l1/telegram']).status === 0;

void test('d1_347 s2: telegram at 25b9ae8d with the cm of the script: the arrivals of the cm run through connectionServe, a refusal is audited and a repeat does not duplicate', { skip: !HAS_BENCH && 'needs mls-102034 with cmBench and mls-102047@25b9ae8d' }, () => {
  const report = smokeModule('telegram', '25b9ae8d', mkdtempSync(path.join(os.tmpdir(), 'smoke-cmedge-')));
  assert.equal(report.results.filter(item => item.verdict === 'error' || item.verdict === 'failed').length, 0, 'no exception and no 5xx');
  const send = report.results.filter(item => item.kind === 'arrival' && item.route === 'telegram.cm.sendChannelMessage');
  assert.ok(send.length > 0);
  // The cm sees the code of the border (`refused`) and the message of the module; the module's own code is inside the module.
  const blocked = send.find(item => item.message === 'The conversation is blocked.');
  assert.ok(blocked, 'a blocked conversation is refused through the border');
  assert.equal(blocked.code, 'refused');
  assert.deepEqual(blocked.rows?.MessageAuditRepository?.slice(1), [6, 6], 'the refusal is audited once, and the repeat adds nothing');
  const sent = send.find(item => item.verdict === 'ok' && item.pass === 'happy');
  assert.ok(sent, 'a scenario row sends');
  assert.deepEqual(sent.calls?.['TelegramGateway.sendText'], [1, 1], 'the repeat does not send twice');
  const disable = report.results.filter(item => item.kind === 'arrival' && item.route === 'telegram.cm.disableChannel');
  assert.ok(disable.length > 0, 'disableChannel is executed through the border (pauseByCm)');
});

void test('d1_347 s2b: by the border of the cm a route that throws is an error with its stack, one that answers a 5xx is failed with its code, and a type the catalog does not declare is skipped', { skip: !HAS_BENCH && 'needs mls-102034 with cmBench and mls-102047@25b9ae8d' }, () => {
  const tree = mkdtempSync(path.join(os.tmpdir(), 'smoke-cmedge-bad-'));
  extractModule(path.join(BASE, 'mls-102047'), '25b9ae8d', 'telegram', tree);
  const file = path.join(tree, 'l1/telegram/layer_2_application/requests/cm.ts');
  const text = readFileSync(file, 'utf8')
    .replace("  'telegram.cm.disableChannel': async function (input, ctx) {\n", "  'telegram.cm.disableChannel': async function (input, ctx) {\n    throw new Error('boom: the route threw');\n")
    .replace("  'telegram.cm.setChannelConversationIdentity': async function (input, ctx) {\n", "  'telegram.cm.setChannelConversationIdentity': async function (input, ctx) {\n    throw new AppError('UPSTREAM_DOWN', 'the upstream is down', 503);\n");
  assert.ok(text.includes('boom') && text.includes('UPSTREAM_DOWN'), 'the fixture was patched');
  writeFileSync(file, text);
  const report = smokeModule('telegram', tree, mkdtempSync(path.join(os.tmpdir(), 'smoke-cmedge-bad-out-')));
  const of = (operation: string) => report.results.filter(item => item.kind === 'arrival' && item.route === `telegram.cm.${operation}`);
  const thrown = of('disableChannel');
  assert.ok(thrown.length > 0 && thrown.every(item => item.verdict === 'error'), 'an exception is an error');
  assert.ok(thrown.every(item => /boom: the route threw/u.test(item.stack ?? '')), 'with its stack');
  const answered = of('setChannelConversationIdentity');
  assert.ok(answered.length > 0 && answered.every(item => item.verdict === 'failed' && item.status === 503 && item.code === 'UPSTREAM_DOWN'), 'a 5xx is failed, with its code');
  assert.ok(of('sendChannelMessage').some(item => item.verdict === 'refused'), 'a refusal stays a refusal');
  // A call whose output type the catalog files do not declare (the agents' releaseCatalogChanged calls listCmTools) is skipped by the script, as the stub did.
  const agentsTree = mkdtempSync(path.join(os.tmpdir(), 'smoke-cmedge-agents-'));
  extractModule(path.join(BASE, 'mls-102047'), '25b9ae8d', 'agents', agentsTree);
  const agents = smokeModule('agents', agentsTree, mkdtempSync(path.join(os.tmpdir(), 'smoke-cmedge-agents-out-')));
  const unresolved = agents.results.filter(item => item.route === 'agents.platform.releaseCatalogChanged');
  assert.ok(unresolved.length > 0 && unresolved.every(item => item.verdict === 'skipped'), 'a type the catalog does not declare is skipped');
});
