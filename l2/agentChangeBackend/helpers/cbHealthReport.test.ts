/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbHealthReport.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectMissingContractRouteFindings, compareOperationsCoverage, expectedRoutesByOperation,
} from './cbHealthReport.js';
import { findingSeverity } from './cbFindingSeverity.js';

// Reduced fixture in the SHAPE of the 2026-08-28 run (module `todo`, 3 workspaces, 10 declared routes),
// hand-written here on purpose: a permanent test must not depend on a disposable generated project.
const WORKSPACES = [
  {
    workspaceId: 'monitorAndUpdateTaskStatus',
    bffCalls: [
      { route: 'todo.monitorAndUpdateTaskStatus.qryInspectTaskSummary', uses: [{ operationId: 'inspectTaskSummary' }] },
      { route: 'todo.monitorAndUpdateTaskStatus.qryLocateTask', uses: [{ operationId: 'locateTask' }] },
      { route: 'todo.monitorAndUpdateTaskStatus.qryInspectTask', uses: [{ operationId: 'inspectTask' }] },
      { route: 'todo.monitorAndUpdateTaskStatus.cmdDecideTaskStatus', uses: [{ operationId: 'decideTaskStatus' }] },
    ],
  },
  {
    workspaceId: 'taskCatalogue',
    bffCalls: [
      { route: 'todo.taskCatalogue.qryListTask', uses: [{ operationId: 'listTask' }] },
      { route: 'todo.taskCatalogue.cmdCreateTask', uses: [{ operationId: 'createTask' }] },
      { route: 'todo.taskCatalogue.cmdUpdateTask', uses: [{ operationId: 'updateTask' }] },
      { route: 'todo.taskCatalogue.cmdDeleteTask', uses: [{ operationId: 'deleteTask' }] },
      { route: 'todo.taskCatalogue.qryGetTask', uses: [{ operationId: 'getTask' }] },
    ],
  },
  {
    // One single call, and it shares its operation with taskCatalogue — the case operation-level
    // coverage cannot see.
    workspaceId: 'taskHub',
    bffCalls: [{ route: 'todo.taskHub.qryListTask', uses: [{ operationId: 'listTask' }] }],
  },
];

// The 4 routes the run actually registered.
const REGISTERED_4 = [
  'todo.monitorAndUpdateTaskStatus.qryLocateTask',
  'todo.monitorAndUpdateTaskStatus.qryInspectTask',
  'todo.taskCatalogue.cmdDeleteTask',
  'todo.taskCatalogue.qryGetTask',
];

const ALL_ROUTES = WORKSPACES.flatMap(w => w.bffCalls.map(c => c.route));

void test('a fully registered contract produces no finding', () => {
  assert.deepEqual(collectMissingContractRouteFindings(WORKSPACES, ALL_ROUTES), []);
});

void test('every contract routine without a controller becomes one finding', () => {
  const findings = collectMissingContractRouteFindings(WORKSPACES, REGISTERED_4);
  assert.equal(findings.length, 6);
  for (const route of [
    'todo.monitorAndUpdateTaskStatus.qryInspectTaskSummary',
    'todo.monitorAndUpdateTaskStatus.cmdDecideTaskStatus',
    'todo.taskCatalogue.qryListTask',
    'todo.taskCatalogue.cmdCreateTask',
    'todo.taskCatalogue.cmdUpdateTask',
    'todo.taskHub.qryListTask',
  ]) {
    assert.ok(findings.some(f => f.includes(route)), `no finding named ${route}: ${findings.join(' | ')}`);
  }
  assert.ok(findings.every(f => f.startsWith('contract route without controller ->')));
  // The finding names the workspace that lost the route, not just the key.
  assert.ok(findings.some(f => f.includes('workspace taskHub')));
});

// The regression this guard exists for: `listTask` is used by taskCatalogue AND taskHub. With
// taskCatalogue's route present, operation-level coverage calls listTask covered and the whole
// taskHub workspace disappears without a word.
void test('a lost workspace is invisible to operation coverage and visible to the route check', () => {
  const routesMinusTaskHub = ALL_ROUTES.filter(route => route !== 'todo.taskHub.qryListTask');
  const verdict = compareOperationsCoverage({
    declared: ['listTask', 'createTask', 'updateTask', 'deleteTask', 'getTask', 'inspectTask', 'inspectTaskSummary', 'locateTask', 'decideTaskStatus'],
    usecaseNames: ['listTask', 'createTask', 'updateTask', 'deleteTask', 'getTask', 'inspectTask', 'inspectTaskSummary', 'locateTask', 'decideTaskStatus'],
    routeKeys: routesMinusTaskHub,
    expectedRoutesByOperation: expectedRoutesByOperation(WORKSPACES),
  });
  assert.equal(verdict.operations, 'ok');

  const findings = collectMissingContractRouteFindings(WORKSPACES, routesMinusTaskHub);
  assert.equal(findings.length, 1);
  assert.ok(findings[0].includes('todo.taskHub.qryListTask'));
});

// Couples the PRODUCER to the severity classifier. cbFindingSeverity matches the finding by its text,
// so rewording the message silently flips the family back to BLOCKING (runs start failing) with every
// hardcoded-string test still green. This one starts from a real produced finding.
void test('a finding this module actually produces is classified degradable', () => {
  const findings = collectMissingContractRouteFindings(WORKSPACES, REGISTERED_4);
  assert.ok(findings.length > 0);
  for (const finding of findings) assert.equal(findingSeverity(finding), 'degradable', finding);
});

void test('the same route declared twice is reported once', () => {
  const twice = [
    { workspaceId: 'a', bffCalls: [{ route: 'todo.a.qryX' }] },
    { workspaceId: 'a', bffCalls: [{ route: 'todo.a.qryX' }] },
  ];
  assert.equal(collectMissingContractRouteFindings(twice, []).length, 1);
});
