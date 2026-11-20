/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveConsume.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D1InputProblem, D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { consumeLinesOf, deriveConsumeRequests, type D1ConsumeLine } from '/_102021_/l2/agentDefsL1/steps/input20/deriveConsume.js';
import { serveGrants, technicalCaller } from '/_102021_/l2/agentDefsL1/steps/controllers60/serveGrants.js';
import { serveRowsFor } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import { requestServiceIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';

const MODULE = 'stock';

const INBOUND = {
  inbound: [
    { id: 'goodsReceived', kind: 'event', from: 'purchasing', event: 'goodsReceived', writes: ['StockMove'], effect: 'create', description: 'Goods arrived.' },
    { id: 'orderClosed', kind: 'event', from: 'sales', writes: ['Reservation'], effect: 'transition', transitionRef: 'release' },
    { id: 'platformEvent', kind: 'event', from: 'organization', event: 'personAdded', writes: ['Person'], effect: 'create' },
    { id: 'fromSystem', kind: 'external', from: 'purchasing', writes: ['StockMove'], effect: 'create' },
  ],
};

function run(lines: D1ConsumeLine[], usecases: D1SelectedUsecase[] = [], takenPages: string[] = []): { requests: ReturnType<typeof deriveConsumeRequests>; problems: D1InputProblem[]; usecases: D1SelectedUsecase[] } {
  const problems: D1InputProblem[] = [];
  const requests = deriveConsumeRequests({
    moduleName: MODULE,
    lines,
    usecases,
    problems,
    entities: { StockMove: {}, Reservation: {} },
    plannedIds: new Map(usecases.map(item => [item.usecaseId, `${item.entity}.${item.operation}`])),
    removedIds: new Set(),
    takenPages: new Set(takenPages),
  });
  return { requests, problems, usecases };
}

void test('d1_217: an inbound event line is a request; the platform event and the external line are not', () => {
  const lines = consumeLinesOf(INBOUND);
  assert.deepEqual(lines.map(line => [line.from, line.eventId, line.effect]), [['purchasing', 'goodsReceived', 'create'], ['sales', 'orderClosed', 'transition']]);
  assert.deepEqual(consumeLinesOf({}), []);
});

void test('d1_217: a create line uses the usecase of the create and a transition line the usecase of the transition, on a page named by the publisher', () => {
  const { requests, problems, usecases } = run(consumeLinesOf(INBOUND));
  const real = problems.filter(item => item.severity === 'error');
  // Neither usecase is planned yet: the transition one is an error (it comes from the plan), the create one is made from the line with a review.
  assert.deepEqual(real.map(item => item.code), ['REQUEST_USECASE_UNPLANNED']);
  const create = requests.find(item => item.consumes === 'purchasing.goodsReceived');
  assert.ok(create);
  assert.deepEqual([create.route, create.pageId, create.kind, create.writes, create.params, create.serves], [`${MODULE}.purchasing.goodsReceived`, 'purchasing', 'cmd', 'StockMove.create', [], undefined]);
  assert.deepEqual(create.uses, ['createStockMove']);
  assert.equal(usecases.some(item => item.usecaseId === 'createStockMove'), true);
});

void test('d1_217: the usecase already in the plan is the one used, for a create and for a transition', () => {
  const planned: D1SelectedUsecase[] = [
    { usecaseId: 'createStockMove', entity: 'StockMove', operation: 'create', status: 'toCreate', existing: '', identity: 'createStockMove', routes: [] },
    { usecaseId: 'Reservation.release', entity: 'Reservation', operation: 'transition', transitionRef: 'release', status: 'toCreate', existing: '', identity: 'Reservation.release', routes: [] },
  ];
  const { requests, problems } = run(consumeLinesOf(INBOUND), planned);
  assert.deepEqual(problems.filter(item => item.severity === 'error'), []);
  assert.deepEqual(requests.map(item => [item.consumes, item.uses]), [['purchasing.goodsReceived', ['createStockMove']], ['sales.orderClosed', ['Reservation.release']]]);
});

void test('d1_217: two lines for one event, a publisher that shares a page id and an effect no usecase can answer are errors with a name', () => {
  const line: D1ConsumeLine = { from: 'purchasing', eventId: 'goodsReceived', writes: ['StockMove'], effect: 'create', transitionRef: '' };
  assert.deepEqual(run([line, line]).problems.filter(item => item.severity === 'error').map(item => item.code), ['CONSUMES_DUPLICATE']);
  const taken = run([line], [], ['purchasing']);
  assert.deepEqual(taken.problems.map(item => item.code), ['CONSUMES_PAGE_COLLISION']);
  assert.deepEqual(taken.requests, []);
  const odd = run([{ ...line, effect: 'remove' }]);
  assert.deepEqual(odd.problems.map(item => item.code), ['CONSUMES_EFFECT_UNKNOWN']);
});

void test('d1_217: the technical caller of a consumes route is the publisher module, and of a serve route the connection', () => {
  assert.deepEqual(technicalCaller({ consumes: 'purchasing.goodsReceived' }), { id: 'purchasing', kind: 'module', actorRef: 'module:purchasing', grantId: 'module_purchasing' });
  assert.deepEqual(technicalCaller({ serves: 'repoHost.changePushed' }), { id: 'repoHost', kind: 'connection', actorRef: 'connection:repoHost', grantId: 'connection_repoHost' });
  assert.equal(technicalCaller({}), null);
  const grants = serveGrants([{ consumes: 'purchasing.a' }, { consumes: 'purchasing.b' }, { serves: 'repoHost.x' }, {}]);
  assert.deepEqual(grants.map(grant => [grant.grantId, grant.actorRef, grant.session, grant.scopeMode]), [
    ['connection_repoHost', 'connection:repoHost', 'verified', 'organization'],
    ['module_purchasing', 'module:purchasing', 'verified', 'organization'],
  ]);
});

void test('d1_217: the request service row of a consumes route carries the mark and passes the def check; a row cannot serve and consume', () => {
  const { requests } = run(consumeLinesOf(INBOUND), [], []);
  const source = requests.filter(item => item.pageId === 'purchasing').map(item => ({ route: item.route, pageId: item.pageId, kind: item.kind, uses: item.uses, outputs: item.outputs, params: item.params, ...(item.consumes ? { consumes: item.consumes } : {}) }));
  const rows = serveRowsFor('purchasing', source);
  assert.deepEqual(rows.map(row => [row.route, row.consumes, row.serves, row.transaction]), [[`${MODULE}.purchasing.goodsReceived`, 'purchasing.goodsReceived', undefined, 'single']]);
  assert.deepEqual(requestServiceIssues({ pageId: 'purchasing', requests: rows }), []);
  const both = { ...rows[0], serves: 'repoHost.x' };
  assert.equal(requestServiceIssues({ pageId: 'purchasing', requests: [both] }).some(issue => issue.includes('not both')), true);
  assert.equal(requestServiceIssues({ pageId: 'purchasing', requests: [{ ...rows[0], consumes: 'bad mark' }] }).some(issue => issue.includes('consumes')), true);
});
