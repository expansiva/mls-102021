/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/usecaseRoutes.test.ts" enhancement="_blank"/>

/**
 * m1_41 a/c-1: the implement usecase observes the catalog cases whose route is a route of the usecase.
 * v1: its contract refs. v2: the page requests that name it in `uses` (same source as the own scope).
 * A route of another usecase stays skipped; a v2 usecase read without the module defs is refused
 * with `MODULE_DEFS_UNREAD`, not skipped. Fixture: the neutral oracle module.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { M1_IMPLEMENT_HANDLERS } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { HandlerCall } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { runBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { usecaseRoutes } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import type { M1ScenarioCase } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { BASE, derive, fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';

const FX = fixture(BASE);
const CATALOG_REF = `${FX.n.project}/l1/${FX.n.mod}/materialization/agentMaterializeL1/scenarioCatalog.ts`;
const [, LIST_REF, ORACLE_LIST] = FX.defs.find(([, , definition]) => definition.artifactId === `list${FX.n.Entity}`)!;
// The oracle usecase has an empty signature (its derivation does not read it); the emitter needs one.
const LIST = { ...ORACLE_LIST, data: { ...ORACLE_LIST.data, functions: [{
  functionName: ORACLE_LIST.artifactId,
  input: [{ name: 'id', type: 'uuid', fieldRef: `${FX.n.Entity}.id` }],
  output: [{ name: 'items', type: FX.n.Entity }, { name: 'hasMore', type: 'boolean' }],
}] } };
const MODULES = [...FX.defs.map(([, , definition]) => definition), ...FX.controllers.map(([, definition]) => definition)];

function catalogWithRoutedCases(): string {
  const catalog = structuredClone(derive(FX).catalog);
  const scenario = catalog.scenarios.find(item => item.artifactId === LIST.artifactId)!;
  const business = scenario.cases.find(item => item.gate === 'business')!;
  const routed = (caseId: string, routine: string): M1ScenarioCase => {
    const copy = structuredClone(business);
    return { ...copy, caseId, routine, expectedFailure: copy.expectedFailure ? { ...copy.expectedFailure, caseId } : null };
  };
  // The deck roster request uses the list usecase; the sail request does not.
  scenario.cases.push(routed(`${LIST.artifactId}.routed.own`, FX.routes.roster), routed(`${LIST.artifactId}.routed.other`, FX.routes.sail));
  return JSON.stringify(catalog);
}

function callFor(moduleDefinitions: readonly unknown[] | undefined): HandlerCall {
  const texts: Record<string, string> = { ...FX.texts, [CATALOG_REF]: catalogWithRoutedCases() };
  return {
    handler: M1_IMPLEMENT_HANDLERS.usecase!,
    unit: { defPath: LIST_REF } as HandlerCall['unit'],
    definition: LIST,
    read: async ref => texts[ref] ?? null,
    catalogRef: CATALOG_REF,
    repair: false,
    signal: new AbortController().signal,
    eventId: 'm1_41-ac1',
    profile: {} as HandlerCall['profile'],
    modelText: null,
    moduleDefinitions,
  };
}

void test('a v2 usecase observes the cases on its request routes and skips a route of another usecase', async () => {
  assert.deepEqual(usecaseRoutes(LIST, MODULES), [FX.routes.list, FX.routes.roster]);
  const outcome = await runBehavior(callFor(MODULES));
  assert.equal(outcome.failure, null, JSON.stringify(outcome.failure));
  const ids = outcome.observations.map(item => item.caseId);
  assert.equal(ids.includes(`${LIST.artifactId}.routed.own`), true, ids.join(', '));
  assert.equal(ids.includes(`${LIST.artifactId}.routed.other`), false);
});

void test('a v2 usecase without the module defs is refused with MODULE_DEFS_UNREAD, not skipped', async () => {
  assert.equal((usecaseRoutes(LIST, []) as { code: string }).code, 'MODULE_DEFS_UNREAD');
  const outcome = await runBehavior(callFor(undefined));
  assert.equal(outcome.failure?.code, 'MODULE_DEFS_UNREAD');
});
