/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveServe.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { exampleCatalog } from '/_102034_/testing/connections/connectionFixtures.js';
import type { D1InputProblem, D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { deriveServeRequests, type D1ServeLine } from '/_102021_/l2/agentDefsL1/steps/input20/deriveServe.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(here, '../../../../../mls-102034/l4/ontology/connections/cm.defs.ts');
const catalogText = readFileSync(catalogPath, 'utf8');

const MODULE = 'desk';
const ENTITY = 'AgentExecution';

function run(lines: D1ServeLine[], usecases: D1SelectedUsecase[] = []): { requests: ReturnType<typeof deriveServeRequests>; problems: D1InputProblem[]; usecases: D1SelectedUsecase[] } {
  const problems: D1InputProblem[] = [];
  const requests = deriveServeRequests({
    moduleName: MODULE,
    lines,
    catalogTexts: { cm: catalogText },
    usecases,
    problems,
    entities: { [ENTITY]: { entityId: ENTITY } },
    plannedIds: new Map(usecases.map(item => [item.usecaseId, `${item.entity}.${item.operation}`])),
    removedIds: new Set(),
  });
  return { requests, problems, usecases };
}

void test('the example fixture catalog is a connection catalog and is not copied into this step', () => {
  assert.equal(exampleCatalog.connectionId, 'example');
  assert.equal(exampleCatalog.operations.some(item => item.direction === 'serve'), true);
});

void test('a serve that creates becomes a cmd request and creates the missing usecase', () => {
  const { requests, problems, usecases } = run([
    { connectionId: 'cm', operationId: 'record', entityRefs: [ENTITY], effect: 'create' },
  ]);
  assert.deepEqual(problems.map(item => item.code), ['USECASE_FROM_CONTRACT']);
  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request?.route, `${MODULE}.cm.record`);
  assert.equal(request?.pageId, 'cm');
  assert.equal(request?.kind, 'cmd');
  assert.equal(request?.serves, 'cm.record');
  assert.equal(request?.writes, `${ENTITY}.create`);
  assert.deepEqual(request?.outputs, []);
  assert.deepEqual(request?.uses, ['createAgentExecution']);
  assert.equal(usecases[0]?.operation, 'create');
  assert.equal(usecases[0]?.status, 'toCreate');
  assert.deepEqual(request?.params.map(item => item.name), [
    'executionId', 'agentId', 'mode', 'startedAt', 'durationMs', 'costUsd', 'actions', 'usedMainModel', 'handedOff', 'refs',
  ]);
  assert.equal(request?.params.every(item => item.target === ''), true);
  assert.equal(request?.params.some(item => item.optional), false);
});

void test('a serve that creates uses the planned create usecase', () => {
  const planned: D1SelectedUsecase = {
    usecaseId: 'recordExecution', entity: ENTITY, operation: 'create', status: 'done', existing: 'recordExecution', identity: 'recordExecution', routes: [],
  };
  const { requests, problems, usecases } = run([
    { connectionId: 'cm', operationId: 'record', entityRefs: [ENTITY], effect: 'create' },
  ], [planned]);
  assert.deepEqual(problems, []);
  assert.deepEqual(requests[0]?.uses, ['recordExecution']);
  assert.equal(usecases.length, 1);
});

void test('describe has no entity and is a query with no uses', () => {
  const { requests, problems, usecases } = run([{ connectionId: 'cm', operationId: 'describe' }]);
  assert.deepEqual(problems, []);
  assert.equal(usecases.length, 0);
  assert.equal(requests[0]?.kind, 'qry');
  assert.equal(requests[0]?.route, `${MODULE}.cm.describe`);
  assert.equal(requests[0]?.serves, 'cm.describe');
  assert.equal(requests[0]?.writes, '');
  assert.deepEqual(requests[0]?.uses, []);
  assert.deepEqual(requests[0]?.params.map(item => item.name), ['agentId', 'knownVersion', 'authorities', 'snapshotAt']);
  assert.equal(requests[0]?.params.find(item => item.name === 'knownVersion')?.optional, true);
});

void test('agentDraftReady is a command and its input members are the params', () => {
  const { requests, problems } = run([
    { connectionId: 'cm', operationId: 'agentDraftReady', entityRefs: [ENTITY], effect: 'update' },
  ]);
  assert.equal(problems.some(item => item.code === 'USECASE_FROM_CONTRACT'), true);
  assert.equal(requests[0]?.kind, 'cmd');
  assert.equal(requests[0]?.route, `${MODULE}.cm.agentDraftReady`);
  assert.equal(requests[0]?.serves, 'cm.agentDraftReady');
  assert.equal(requests[0]?.writes, `${ENTITY}.update`);
  assert.deepEqual(requests[0]?.uses, ['updateAgentExecution']);
  assert.deepEqual(requests[0]?.params.map(item => item.name), ['draftId', 'status', 'refusedReason', 'suggestedTools']);
  assert.equal(requests[0]?.params.find(item => item.name === 'refusedReason')?.optional, true);
});
