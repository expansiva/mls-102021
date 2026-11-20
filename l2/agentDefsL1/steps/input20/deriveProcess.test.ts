/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveProcess.test.ts" enhancement="_blank"/>

// d1_235: the usecases of the process an arrival starts are in the plan and kept by the route of the arrival.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D1InputProblem, D1SelectedRequest, D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { deriveProcessUsecases } from '/_102021_/l2/agentDefsL1/steps/input20/deriveProcess.js';

const workflows = {
  processes: [
    { processId: 'refresh', trigger: { kind: 'event', event: 'sys.arrived' }, tasks: [
      { taskId: 'rebuild', kind: 'mechanical', entityRef: 'Item', effect: 'update' },
      { taskId: 'choose', kind: 'llm', entityRef: 'Item', effect: 'update' },
      { taskId: 'ask', kind: 'human', entityRef: 'Other', effect: 'create' },
      { taskId: 'move', kind: 'mechanical', entityRef: 'Gate', effect: 'transition', transitionRef: 'open' },
    ] },
    { processId: 'recording', trigger: { kind: 'event', event: 'other.recorded' }, tasks: [{ taskId: 'store', kind: 'mechanical', entityRef: 'Log', effect: 'create' }] },
    { processId: 'manual', trigger: { kind: 'manual' }, tasks: [{ taskId: 'x', kind: 'mechanical', entityRef: 'Item', effect: 'create' }] },
  ],
};

function request(route: string, mark: { serves?: string; consumes?: string }, upserts?: D1SelectedRequest['upserts']): D1SelectedRequest {
  return { route, pageId: 'p', kind: 'cmd', writes: '', outputs: [], params: [], uses: [], ...mark, ...(upserts ? { upserts } : {}) };
}

function run(requests: D1SelectedRequest[], usecases: D1SelectedUsecase[] = [], entities: string[] = ['Item', 'Other', 'Gate', 'Log']): { kept: Map<string, Set<string>>; usecases: D1SelectedUsecase[]; problems: D1InputProblem[] } {
  const problems: D1InputProblem[] = [];
  const kept = deriveProcessUsecases({
    moduleName: 'sample', workflows, requests, usecases, problems,
    entities: Object.fromEntries(entities.map(name => [name, {}])),
    plannedIds: new Map(usecases.map(item => [item.usecaseId, `${item.entity}.${item.operation}`])),
    removedIds: new Set(),
  });
  return { kept, usecases, problems };
}

void test('d1_235: the usecases of the tasks of the process an arrival starts are planned and kept by the route of the arrival', () => {
  const { kept, usecases, problems } = run([request('sample.sys.arrived', { serves: 'sys.arrived' }), request('sample.other.recorded', { consumes: 'other.recorded' })]);
  assert.deepEqual([...kept.get('sample.sys.arrived') ?? []].sort(), ['updateItem'], 'one usecase for two tasks of one pair; a human task has none; the transition one is an error (it comes from the plan)');
  assert.deepEqual([...kept.get('sample.other.recorded') ?? []], ['createLog']);
  assert.deepEqual(usecases.map(item => `${item.entity}.${item.operation}`).sort(), ['Item.update', 'Log.create']);
  assert.equal(problems.some(item => item.code === 'REQUEST_USECASE_UNPLANNED' && /Gate\.transition/.test(item.message)), true);
});

void test('d1_235: a usecase already in the plan is the one kept; a route of no process and a manual process keep nothing', () => {
  const planned: D1SelectedUsecase[] = [{ usecaseId: 'changeItem', entity: 'Item', operation: 'update', status: 'toCreate', existing: '', identity: 'changeItem', routes: [] }];
  const { kept, usecases } = run([request('sample.sys.arrived', { serves: 'sys.arrived' }), request('sample.page.go', {})], planned);
  assert.deepEqual([...kept.get('sample.sys.arrived') ?? []], ['changeItem']);
  assert.equal(kept.has('sample.page.go'), false);
  assert.equal(usecases.filter(item => item.entity === 'Item').length, 1, 'not created again');
});

void test('d1_235: the usecases of the upserts of the arrival are kept with the pairs of the tasks', () => {
  const planned: D1SelectedUsecase[] = ['create', 'update'].map(operation => ({ usecaseId: `${operation}Item`, entity: 'Item', operation, status: 'toCreate' as const, existing: '', identity: `${operation}Item`, routes: [] }));
  const { kept } = run([request('sample.sys.arrived', { serves: 'sys.arrived' }, [{ entityId: 'Item', key: ['itemKey'], keyKind: 'unique' }])], planned);
  assert.deepEqual([...kept.get('sample.sys.arrived') ?? []].sort(), ['createItem', 'updateItem']);
});
