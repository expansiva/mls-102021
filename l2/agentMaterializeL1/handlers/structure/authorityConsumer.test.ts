/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/authorityConsumer.test.ts" enhancement="_blank"/>

/**
 * d1_36: the controller resolves the actor of each grant through the authority
 * map it depends on. The emitted files run from a scratch folder; the only
 * rewrite is where the fixture project's modules live.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { M1_DEFINITION_SCHEMA, outputPathFromDefPath, semanticHash, type MaterializationReceipt, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/context/context.js';
import { planMaterialization, PLAN_REASON } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { M1_STUB_ERROR } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import {
  emitAccess,
  emitAuthority,
  emitController,
  emitUsecase,
  type EmitFailure,
  type EmitResult,
} from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const P = '_102099_';
const MOD = 'sampleDesk';
const SCOPE = `${P}/l1/${MOD}/layer_2_application/scope/accessScope.defs.ts`;
const AUTHORITY = `${P}/l1/${MOD}/layer_1_external/auth/authorityMap.defs.ts`;
const CLOSE = `${P}/l1/${MOD}/layer_2_application/usecases/closeTicket.defs.ts`;
const LIST = `${P}/l1/${MOD}/layer_2_application/usecases/listTicket.defs.ts`;
const CONTROLLER = `${P}/l1/${MOD}/layer_1_external/adapters/http/controllers/tickets.defs.ts`;
const CONTRACT = `${P}/l2/${MOD}/web/contracts/tickets.defs.ts`;
const ROUTE_CLOSE = `${MOD}.tickets.cmdCloseTicket`;
const ROUTE_LIST = `${MOD}.tickets.qryListTicket`;

function def(artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MOD, status: 'pending', dependencies, data } as M1Definition;
}

function grant(grantId: string, actorRef: string): Record<string, unknown> {
  return {
    grantId, actorRef, entityRefs: ['Ticket'], disclosure: 'fullRecord', allowedFields: [],
    scopeMode: 'organization', session: 'verified', path: [{ entityId: 'Ticket', steps: [], pending: '' }], pending: '',
  };
}

function usecase(id: string, route: string, symbol: string): M1Definition {
  return def('usecase', id, [CONTRACT], {
    functions: [{ functionName: id, contractRefs: [{ route, symbol }] }],
    routeProjections: [{ route, contractPath: CONTRACT, outputFields: ['id'] }],
  });
}

const scope = def('accessScope', 'accessScope', [], { scopeId: 'accessScope', grants: [grant('agentCloses', 'agent'), grant('auditorReads', 'auditor')] });
const authority = (entries: Array<{ grantId: string; actorRef: string }>) => def('authorityMap', 'authorityMap', [SCOPE], { mapId: 'authorityMap', entries });
const fullMap = authority([{ grantId: 'agentCloses', actorRef: 'agent' }, { grantId: 'auditorReads', actorRef: 'auditor' }]);
const close = usecase('closeTicket', ROUTE_CLOSE, 'CloseTicketOutput');
const list = usecase('listTicket', ROUTE_LIST, 'ListTicketOutput');
const controller = (dependencies: string[]) => def('httpController', 'tickets', dependencies, {
  pageId: 'tickets',
  handlers: [
    { route: ROUTE_CLOSE, kind: 'command', usecaseId: 'closeTicket', grantIds: ['agentCloses'] },
    { route: ROUTE_LIST, kind: 'query', usecaseId: 'listTicket', grantIds: ['auditorReads'] },
  ],
});
const consumer = controller([AUTHORITY, SCOPE, CLOSE, LIST]);

const CONTRACT_SOURCE = [
  'export interface CloseTicketInput {\n  id: string;\n}',
  'export interface CloseTicketOutput {\n  id: string;\n}',
  'export interface ListTicketInput {\n  status?: string;\n}',
  'export interface ListTicketOutput {\n  id: string;\n}',
].join('\n');

const asSource = (definition: M1Definition) => `export const definition = ${JSON.stringify(definition)} as const;\n`;

function reader(map: M1Definition): (ref: string) => Promise<string | null> {
  const files = new Map<string, string>([
    [SCOPE, asSource(scope)], [AUTHORITY, asSource(map)], [CLOSE, asSource(close)], [LIST, asSource(list)], [CONTRACT, CONTRACT_SOURCE],
  ]);
  return async ref => files.get(ref) ?? null;
}

function ok(result: EmitResult | EmitFailure): EmitResult {
  assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : '');
  return result as EmitResult;
}

type Handler = (input: unknown) => Promise<unknown>;

/** Writes the emitted outputs and loads the controller routes. `mapSource` edits the map copy. */
async function load(map: M1Definition, mapSource: (source: string) => string = source => source): Promise<{ routes: Map<string, Handler>; dispose: () => void }> {
  const read = reader(map);
  const outputs: Array<[string, string]> = [
    [SCOPE, ok(emitAccess(scope, outputPathFromDefPath(SCOPE))).source],
    [AUTHORITY, mapSource(ok(emitAuthority(map, outputPathFromDefPath(AUTHORITY))).source)],
    [CLOSE, ok(await emitUsecase(close, outputPathFromDefPath(CLOSE), read)).source],
    [LIST, ok(await emitUsecase(list, outputPathFromDefPath(LIST), read)).source],
    [CONTROLLER, ok(await emitController(consumer, outputPathFromDefPath(CONTROLLER), read)).source],
  ];
  const dir = mkdtempSync(join(tmpdir(), 'd1-36-'));
  const fileOf = (qualified: string) => join(dir, qualified.replace(`${P}/`, ''));
  for (const [defPath, source] of outputs) {
    const target = fileOf(outputPathFromDefPath(defPath));
    mkdirSync(dirname(target), { recursive: true });
    const relocated = source.replace(new RegExp(`from '/${P}/([^']+)\\.js'`, 'g'), (_all, rest: string) => `from '${pathToFileURL(fileOf(`${P}/${rest}.ts`)).href}'`);
    writeFileSync(target, relocated);
  }
  const module = await import(pathToFileURL(fileOf(outputPathFromDefPath(CONTROLLER))).href) as { routes: Array<{ key: string; handler: Handler }> };
  return { routes: new Map(module.routes.map(item => [item.key, item.handler])), dispose: () => rmSync(dir, { recursive: true, force: true }) };
}

async function call(routes: Map<string, Handler>, route: string, authorities: string[] | undefined, params: Record<string, unknown>): Promise<string> {
  const handler = routes.get(route);
  assert.ok(handler, route);
  const meta = authorities ? { source: 'http', verifiedAuthorities: authorities } : { source: 'http' };
  try {
    await handler({ request: { routine: route, params, meta }, ctx: { sessionContext: {} } });
    return 'ok';
  } catch (error) {
    return String((error as { code?: string }).code ?? error);
  }
}

const closeParams = { id: 'ticket-1' };

void test('the controller calls the authority map: each actor reaches its own route only', async () => {
  const loaded = await load(fullMap);
  try {
    assert.equal(await call(loaded.routes, ROUTE_CLOSE, [`${MOD}:agent`], closeParams), M1_STUB_ERROR);
    assert.equal(await call(loaded.routes, ROUTE_LIST, [`${MOD}:agent`], {}), 'FORBIDDEN_ACTOR');
    assert.equal(await call(loaded.routes, ROUTE_LIST, [`${MOD}:auditor`], {}), M1_STUB_ERROR);
    assert.equal(await call(loaded.routes, ROUTE_CLOSE, [`${MOD}:auditor`], closeParams), 'FORBIDDEN_ACTOR');
    // No verified identity is closed, and the body does not supply one.
    assert.equal(await call(loaded.routes, ROUTE_CLOSE, undefined, { ...closeParams }), 'FORBIDDEN_ACTOR');
    assert.equal(await call(loaded.routes, ROUTE_CLOSE, [], closeParams), 'FORBIDDEN_ACTOR');
  } finally {
    loaded.dispose();
  }
});

void test('swapping the actors in the emitted map copy flips the decision', async () => {
  const loaded = await load(fullMap, source => source.replace('"actorRef": "agent"', '"actorRef": "__a"').replace('"actorRef": "auditor"', '"actorRef": "agent"').replace('"actorRef": "__a"', '"actorRef": "auditor"'));
  try {
    assert.equal(await call(loaded.routes, ROUTE_CLOSE, [`${MOD}:agent`], closeParams), 'FORBIDDEN_ACTOR');
    assert.equal(await call(loaded.routes, ROUTE_CLOSE, [`${MOD}:auditor`], closeParams), M1_STUB_ERROR);
    assert.equal(await call(loaded.routes, ROUTE_LIST, [`${MOD}:agent`], {}), M1_STUB_ERROR);
  } finally {
    loaded.dispose();
  }
});

void test('a grant the map does not name is refused, and a controller without the map is not emitted', async () => {
  const loaded = await load(authority([{ grantId: 'agentCloses', actorRef: 'agent' }]));
  try {
    assert.equal(await call(loaded.routes, ROUTE_LIST, [`${MOD}:auditor`], {}), 'AUTHORITY_UNMAPPED');
    assert.equal(await call(loaded.routes, ROUTE_CLOSE, [`${MOD}:agent`], closeParams), M1_STUB_ERROR);
  } finally {
    loaded.dispose();
  }
  const missing = await emitController(controller([SCOPE, CLOSE, LIST]), outputPathFromDefPath(CONTROLLER), reader(fullMap));
  assert.equal('code' in missing && missing.code, 'AUTHORITY_UNREAD');
  const unread = await emitController(consumer, outputPathFromDefPath(CONTROLLER), async ref => ref === AUTHORITY ? null : reader(fullMap)(ref));
  assert.equal('code' in unread && unread.code, 'AUTHORITY_UNREAD');
});

void test('a consumed map is not NO_CONSUMER; an orphan map still is', async () => {
  const readable = [SCOPE, AUTHORITY, CLOSE, LIST, CONTROLLER, CONTRACT, ...Object.values(PLATFORM_FILES)];
  const base = [
    { defPath: SCOPE, definition: scope },
    { defPath: AUTHORITY, definition: fullMap },
    { defPath: CLOSE, definition: close },
    { defPath: LIST, definition: list },
  ];
  const consumed = await planMaterialization({ units: [...base, { defPath: CONTROLLER, definition: consumer }], readable });
  const map = consumed.units.find(unit => unit.defPath === AUTHORITY);
  assert.ok(map);
  assert.equal(map.reason.startsWith(PLAN_REASON.noConsumer), false, map.reason);
  const orphan = await planMaterialization({ units: [...base, { defPath: CONTROLLER, definition: controller([SCOPE, CLOSE, LIST]) }], readable });
  assert.equal(orphan.units.find(unit => unit.defPath === AUTHORITY)?.reason.startsWith(PLAN_REASON.noConsumer), true);
});

void test('a map blocked by an earlier NO_CONSUMER receipt is released once a controller consumes it', async () => {
  const readable = [SCOPE, AUTHORITY, CLOSE, LIST, CONTROLLER, CONTRACT, ...Object.values(PLATFORM_FILES)];
  const blocked = { ...fullMap, status: 'blocked' } as M1Definition;
  const receipt = {
    schemaVersion: '2026-09-24-m1-receipt-v1', runId: `102099:${MOD}`, candidateId: '', defPath: AUTHORITY,
    artifactType: 'authorityMap', artifactId: 'authorityMap', recipeVersion: 'older', semanticHash: await semanticHash(blocked),
    dependencyHashes: {}, sourceHashes: {}, outputHashes: {}, stage: 'plan', verifications: [],
    failures: [{ code: 'NO_CONSUMER', detail: 'NO_CONSUMER: authorityMap authorityMap has no dependent artifact.' }],
    attempts: 1, reason: 'NO_CONSUMER: NO_CONSUMER: authorityMap authorityMap has no dependent artifact.',
  } as unknown as MaterializationReceipt;
  const units = [
    { defPath: SCOPE, definition: scope },
    { defPath: AUTHORITY, definition: blocked },
    { defPath: CLOSE, definition: close },
    { defPath: LIST, definition: list },
    { defPath: CONTROLLER, definition: consumer },
  ];
  const plan = await planMaterialization({ units, readable, receipts: new Map([[AUTHORITY, receipt]]) });
  const map = plan.units.find(unit => unit.defPath === AUTHORITY);
  assert.ok(map);
  assert.notEqual(map.action, 'blocked', map.reason);
  const orphan = await planMaterialization({
    units: units.map(unit => unit.defPath === CONTROLLER ? { defPath: CONTROLLER, definition: controller([SCOPE, CLOSE, LIST]) } : unit),
    readable,
    receipts: new Map([[AUTHORITY, receipt]]),
  });
  assert.equal(orphan.units.find(unit => unit.defPath === AUTHORITY)?.reason.startsWith(PLAN_REASON.noConsumer), true);
});
