/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/defV1Gate.test.ts" enhancement="_blank"/>

/**
 * m1_41 a: the v1 path is gone from the M1. A def that still arrives in v1 (handler `usecaseId`,
 * `contractRefs`, `routeProjections`) fails closed with DEF_V1_UNSUPPORTED and writes nothing, at
 * every entry: structure runner, implement runner, controller emitter and route obligations.
 * m1_41 c1: `routeProjections` left the l1Defs schema, so a def with it is refused one step earlier,
 * at the definition stage (DEFINITION, naming DEF_V1_UNSUPPORTED), before the M1 gate.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { decideProfile } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import type { HandlerCall } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { runBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { emitController } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { DEF_V1_UNSUPPORTED, isDefV1 } from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';
import { runStructure } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import { routeObligations } from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';
import { defPathOf, deskController, listBuoyPending, M1_FIXTURE_ROUTE } from '/_102021_/l2/agentMaterializeL1/fixtures/cases.js';

const v1Usecase: M1Definition = {
  ...listBuoyPending,
  data: {
    ...listBuoyPending.data,
    functions: [{ ...(listBuoyPending.data.functions as Record<string, unknown>[])[0], contractRefs: [{ route: M1_FIXTURE_ROUTE, symbol: 'BuoyRowsOutput' }] }],
  },
};
const projectedUsecase: M1Definition = { ...listBuoyPending, data: { ...listBuoyPending.data, routeProjections: [] } };
const v1Handler = { route: M1_FIXTURE_ROUTE, kind: 'query', grantIds: ['g'], usecaseId: 'listBuoy' };
const v1Controller: M1Definition = { ...deskController, data: { ...deskController.data, handlers: [v1Handler] } };

function call(definition: M1Definition, stage: 'structure' | 'implement'): HandlerCall {
  const handler = handlerFor(definition.artifactType, stage);
  assert.ok(handler);
  const defPath = defPathOf(definition.artifactType, definition.artifactId);
  return {
    handler,
    unit: {
      defPath, artifactType: definition.artifactType, artifactId: definition.artifactId, action: 'generate', reason: '',
      handlerId: handler.id, needsLlm: false, unresolved: [], contextRefs: [], blockedBy: [], prompt: '',
    },
    definition,
    // Nothing is read: the def is refused before any source.
    read: async ref => { throw new Error(`read ${ref}`); },
    catalogRef: 'catalog.json',
    repair: false,
    signal: new AbortController().signal,
    eventId: defPath,
    profile: decideProfile('development', true),
    // A model text would be written by the NEEDS_LLM branch; the gate runs before it.
    modelText: 'export const x = 1;',
    moduleDefinitions: [],
  };
}

void test('the v1 markers are the handler usecaseId and contractRefs; a v2 usecaseId is not one', () => {
  assert.equal(isDefV1(listBuoyPending.data), false);
  assert.equal(typeof listBuoyPending.data.usecaseId, 'string');
  assert.equal(isDefV1(deskController.data), false);
  assert.equal(isDefV1(v1Usecase.data), true);
  // routeProjections is refused by the l1Defs schema before the gate (m1_41 c1), so it is not a gate marker.
  assert.equal(isDefV1(projectedUsecase.data), false);
  assert.equal(isDefV1(v1Controller.data), true);
});

void test('a v1 def fails closed with DEF_V1_UNSUPPORTED and writes nothing, in structure and implement', async () => {
  for (const [definition, stage] of [
    [v1Usecase, 'structure'], [v1Usecase, 'implement'], [v1Controller, 'structure'],
  ] as const) {
    const outcome = stage === 'structure' ? await runStructure(call(definition, stage)) : await runBehavior(call(definition, stage));
    assert.equal(outcome.failure?.code, DEF_V1_UNSUPPORTED, `${definition.artifactId} ${stage}`);
    assert.match(outcome.failure?.detail ?? '', new RegExp(`^${DEF_V1_UNSUPPORTED}: ${definition.artifactId} `));
    assert.deepEqual(outcome.files, {});
  }
  // A usecase with routeProjections is refused at the definition stage, naming the removal.
  const projected = await runBehavior(call(projectedUsecase, 'implement'));
  assert.equal(projected.failure?.code, 'DEFINITION');
  assert.match(projected.failure?.detail ?? '', /data\.routeProjections is the removed v1 shape \(DEF_V1_UNSUPPORTED\)/);
  assert.deepEqual(projected.files, {});
});

void test('a controller with one handler that has no service function is refused, not emitted as an adapter', async () => {
  const mixed: M1Definition = { ...deskController, data: { ...deskController.data, handlers: [...(deskController.data.handlers as unknown[]), v1Handler] } };
  const result = await emitController(mixed, 'out.ts', async () => 'export const definition = {} as const;');
  assert.equal('code' in result && result.code, DEF_V1_UNSUPPORTED);
});

void test('a route with no contract interface is a visible DEF_V1_UNSUPPORTED gap, not a derived case', () => {
  const derived = routeObligations({
    controller: v1Controller, defPath: defPathOf('httpController', v1Controller.artifactId), route: M1_FIXTURE_ROUTE,
    kind: 'query', grantIds: ['g'], contractPath: '', contractInterface: '',
  }, new Map(), {});
  assert.ok('gap' in derived);
  assert.match(derived.gap, new RegExp(`^${DEF_V1_UNSUPPORTED}: `));
});
