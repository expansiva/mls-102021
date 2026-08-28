/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbLifecycle.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEntityLifecycle,
  compactLifecycleForPrompt,
  collectLifecycleContradictionFindings,
  extractStatusTransitionMap,
} from './cbLifecycle.js';

// Permissive entity lifecycle — every state may go to every other state. Copied as a fixture
// (same shape ns4 writes under l4/<module>/workflows/*.defs.ts); not a generated app path.
const PERMISSIVE_TASK = {
  workflowId: 'taskLifecycle',
  entityRef: 'Task',
  initialState: 'pending',
  terminalStates: ['completed', 'cancelled'],
  states: ['pending', 'inProgress', 'completed', 'cancelled'],
  transitions: [
    { transitionId: 'setTaskPending', fromStates: ['inProgress', 'completed', 'cancelled'], toState: 'pending' },
    { transitionId: 'setTaskInProgress', fromStates: ['pending', 'completed', 'cancelled'], toState: 'inProgress' },
    { transitionId: 'setTaskCompleted', fromStates: ['pending', 'inProgress', 'cancelled'], toState: 'completed' },
    { transitionId: 'setTaskCancelled', fromStates: ['pending', 'inProgress', 'completed'], toState: 'cancelled' },
  ],
};

const lifecycle = parseEntityLifecycle(PERMISSIVE_TASK)!;

test('parseEntityLifecycle + compactLifecycleForPrompt expose the declared matrix', () => {
  assert.ok(lifecycle);
  const prompt = compactLifecycleForPrompt(lifecycle);
  assert.equal(prompt.entityRef, 'Task');
  assert.equal(prompt.initialState, 'pending');
  assert.deepEqual(prompt.allowed.pending.sort(), ['cancelled', 'completed', 'inProgress']);
  assert.ok(prompt.allowed.pending.includes('completed'), 'pending→completed is declared');
  // l4 labelled completed/cancelled as terminal, but the matrix has outgoing edges — computed
  // terminals follow the matrix, otherwise the prompt would recreate the invented machine.
  assert.deepEqual(prompt.terminalStates, []);
});

test('a generated map that denies a declared pair is a finding; a map that respects it is silent', () => {
  const invented = `
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['inProgress', 'cancelled'],
  inProgress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
`;
  const issues = collectLifecycleContradictionFindings({ lifecycle, source: invented, label: 'task.ts' });
  assert.ok(issues.some(i => /pending→completed/.test(i)), issues.join('\n'));
  assert.match(issues[0], /lifecycle contradiction ->/);

  const respectful = `
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['cancelled', 'completed', 'inProgress'],
  inProgress: ['cancelled', 'completed', 'pending'],
  completed: ['cancelled', 'inProgress', 'pending'],
  cancelled: ['completed', 'inProgress', 'pending'],
};
`;
  assert.deepEqual(collectLifecycleContradictionFindings({ lifecycle, source: respectful, label: 'task.ts' }), []);
});

test('invariants that invent terminals / deny a declared pair are findings; integrity prose is silent', () => {
  const invented = [
    'taskId must be unique across all tasks.',
    'A task may transition from pending to inProgress or cancelled; from inProgress to completed or cancelled; completed and cancelled are terminal states.',
    'A completed or cancelled task must not transition back to pending or inProgress.',
    'dueDate, when provided, must not precede createdAt.',
  ];
  const issues = collectLifecycleContradictionFindings({ lifecycle, invariants: invented });
  assert.ok(issues.some(i => /pending→completed/.test(i)), issues.join('\n'));
  assert.ok(issues.some(i => /completed→pending/.test(i)), issues.join('\n'));

  const respectful = [
    'taskId must be unique across all tasks.',
    'dueDate, when provided, must not precede createdAt.',
    'updatedAt must be greater than or equal to createdAt.',
  ];
  assert.deepEqual(collectLifecycleContradictionFindings({ lifecycle, invariants: respectful }), []);

  const restates = [
    'A task may transition from pending to inProgress or completed or cancelled; from inProgress to pending or completed or cancelled; from completed to pending or inProgress or cancelled; from cancelled to pending or inProgress or completed.',
  ];
  assert.deepEqual(collectLifecycleContradictionFindings({ lifecycle, invariants: restates }), []);
});

test('entity without a workflow yields no finding, even with terminal prose or a map', () => {
  assert.deepEqual(collectLifecycleContradictionFindings({
    lifecycle: undefined,
    invariants: ['completed and cancelled are terminal states.'],
    source: `export const TASK_STATUS_TRANSITIONS = { pending: ['inProgress'], completed: [] };`,
  }), []);
});

test('extractStatusTransitionMap reads the domain-skill shape', () => {
  const map = extractStatusTransitionMap(`
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['inProgress', 'cancelled'],
  completed: [],
};
`);
  assert.deepEqual(map?.pending, ['inProgress', 'cancelled']);
  assert.deepEqual(map?.completed, []);
});
