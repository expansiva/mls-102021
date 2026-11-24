/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/routeWriteCalls.test.ts" enhancement="_blank"/>

// d1_285 s1: the contract writes `Entity.operation+operationId+operationId` for a command whose line the L2 split by its calls. input20 reads the key with the one reader
// of the L2, and a route runs exactly the calls its key names (a route without a suffix beside a sibling with one runs none).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

import { loadD1Artifacts } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { resolverAnswers } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { externalUsecaseForCall, routeWriteCalls } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';

const connections = [
  { connectionId: 'cm', operationId: 'readAgent', direction: 'call', entityRefs: ['Agent', 'AgentBehavior'], usedBy: ['j.one'] },
  { connectionId: 'cm', operationId: 'runAiPrompt', direction: 'call', entityRefs: ['Tool'], usedBy: ['j.one'] },
  { connectionId: 'cm', operationId: 'updateAgent', direction: 'call', usedBy: ['j.two'] },
  { connectionId: 'hub', operationId: 'updateAgent', direction: 'call', usedBy: ['j.three'] },
  { connectionId: 'hub', operationId: 'serveThing', direction: 'serve', usedBy: [] },
];

void test('a route runs the calls its suffix names; bare beside a suffixed sibling runs none; bare alone keeps what the page cites', () => {
  const pageCalls = ['cm.readAgent'];
  assert.deepEqual(routeWriteCalls({ suffix: ['runAiPrompt', 'readAgent'], siblingSuffixed: false, connections, pageCalls }), { calls: ['cm.readAgent', 'cm.runAiPrompt'], unresolved: [] }, 'suffix: exactly those');
  assert.deepEqual(routeWriteCalls({ suffix: [], siblingSuffixed: true, connections, pageCalls }), { calls: [], unresolved: [] }, 'bare with a suffixed sibling: no call');
  assert.deepEqual(routeWriteCalls({ suffix: [], siblingSuffixed: false, connections, pageCalls }), { calls: ['cm.readAgent'], unresolved: [] }, 'bare without a sibling: as before');
});

void test('a suffix with an operationId that is not exactly one call line of the L4 is unresolved, with the candidates', () => {
  const missing = routeWriteCalls({ suffix: ['readAgent', 'noSuchCall'], siblingSuffixed: false, connections, pageCalls: [] });
  assert.deepEqual(missing.calls, ['cm.readAgent']);
  assert.deepEqual(missing.unresolved, [{ operationId: 'noSuchCall', candidates: ['cm.readAgent', 'cm.runAiPrompt', 'cm.updateAgent', 'hub.updateAgent'] }], 'a serve line is not a call');
  const ambiguous = routeWriteCalls({ suffix: ['updateAgent'], siblingSuffixed: false, connections, pageCalls: [] });
  assert.deepEqual(ambiguous, { calls: [], unresolved: [{ operationId: 'updateAgent', candidates: ['cm.updateAgent', 'hub.updateAgent'] }] });
});

function usecase(usecaseId: string, entity: string, call: string): D1SelectedUsecase {
  return { usecaseId, entity, operation: 'get', status: 'toCreate', existing: '', identity: usecaseId, routes: [], call };
}

void test('the usecase of a call is the one of an external entity; the entity the call names first wins, then the usecaseId', () => {
  const kinds = new Map([['Agent', 'external'], ['AgentBehavior', 'external'], ['AgentTool', 'entity'], ['Tool', 'external']]);
  const usecases = [
    usecase('getAgentBehavior', 'AgentBehavior', 'cm.readAgent'),
    usecase('readAgent', 'Agent', 'cm.readAgent'),
    usecase('getAgent', 'Agent', 'cm.readAgent'),
    usecase('getAgentTool', 'AgentTool', 'cm.readAgent'),
    usecase('runAiPromptAgent', 'Agent', 'cm.runAiPrompt'),
    usecase('promptTool', 'Tool', 'cm.runAiPrompt'),
  ];
  const pick = (call: string, rows = usecases) => externalUsecaseForCall({ call, usecases: rows, entityKind: kinds, connections })?.usecaseId ?? null;
  assert.equal(pick('cm.readAgent'), 'getAgent', 'Agent comes first in entityRefs; between its two usecases the first usecaseId; a usecase of a module entity never');
  assert.equal(pick('cm.runAiPrompt'), 'promptTool', 'the line names Tool: its usecase before one whose entity it does not name');
  assert.equal(pick('cm.runAiPrompt', usecases.filter(item => item.usecaseId !== 'promptTool')), 'runAiPromptAgent', 'no entity named: the first usecaseId');
  assert.equal(pick('cm.updateAgent'), null, 'no usecase has that call');
  assert.equal(pick('cm.readAgent', [usecase('getAgentTool', 'AgentTool', 'cm.readAgent')]), null, 'only a module entity cites it: none');
});

void test('the suffix of a write is not a transition: the route keeps its usecase and the key; a call no external usecase has is EXTERNAL_ROUTE_CALL_UNRESOLVED', () => {
  const artifacts = loadD1Artifacts('synthetic-v2', 'ledgerDesk');
  const pool = [
    { usecaseId: 'readItem', entity: 'ItemCard', operation: 'get', status: 'toCreate', existing: '' },
    { usecaseId: 'writeItem', entity: 'ItemCard', operation: 'update', status: 'toCreate', existing: '' },
    { usecaseId: 'readNote', entity: 'DeskNote', operation: 'get', status: 'toCreate', existing: '' },
  ];
  (artifacts.backend as Record<string, unknown>).usecases = pool;
  (artifacts.effort as Record<string, unknown>).usecases = pool.map(item => ({ ...item }));
  const bare = buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, artifacts, null, resolverAnswers(artifacts));
  assert.equal(bare.problems.some(item => item.code === 'EXTERNAL_ROUTE_CALL_UNRESOLVED'), false);

  const suffixed = loadD1Artifacts('synthetic-v2', 'ledgerDesk');
  (suffixed.backend as Record<string, unknown>).usecases = pool;
  (suffixed.effort as Record<string, unknown>).usecases = pool.map(item => ({ ...item }));
  suffixed.contractTexts = { ...(suffixed.contractTexts || {}), cards: (suffixed.contractTexts || {}).cards.replace("writes: 'ItemCard.update';", "writes: 'ItemCard.update+syncItem';") };
  suffixed.integration = { connections: [{ connectionId: 'hub', operationId: 'syncItem', direction: 'call', usedBy: ['nobody.step'] }] };
  const snapshot = buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, suffixed, null, resolverAnswers(suffixed));
  const save = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.cards.save');
  assert.equal(save?.writes, 'ItemCard.update+syncItem', 'the request keeps the key as the contract says it');
  assert.ok(save?.uses.includes('writeItem'), `uses: ${save?.uses.join()}`);
  assert.equal(snapshot.problems.some(item => item.code === 'REQUEST_USECASE_UNPLANNED' && item.ownerRef === 'ledgerDesk.cards.save'), false, 'the suffix was not read as a transition');
  const unresolved = snapshot.problems.filter(item => item.code === 'EXTERNAL_ROUTE_CALL_UNRESOLVED' && item.ownerRef === 'ledgerDesk.cards.save');
  assert.equal(unresolved.length, 1, JSON.stringify(snapshot.problems.map(item => [item.code, item.ownerRef])));
  assert.match(unresolved[0].message, /hub\.syncItem/);
});
