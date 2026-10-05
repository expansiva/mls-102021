/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveRequest.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import { loadD1Artifacts } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { deriveRequest, type D1DerivedRequest } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';

/**
 * d1_60 oracle. The three fixtures whose contracts still carry `meta`: the derivation never reads it, and this test
 * does, only to compare. What it proves: where the derivation resolves, it agrees with meta; where it does not,
 * the gap is declared in `unresolved` on that path. Filter params are not compared: spec item 2 leaves non-page
 * inputs as inputs, with no deduced link.
 * Same writes and the same outputs give the same usecase uses (`oneRequest` takes them from those two).
 */
const ORACLE_FIXTURES: ReadonlyArray<[string, string]> = [
  ['controleEstoque-39a5166', 'controleEstoque'],
  ['agendaClinica-53f1f35', 'agendaClinica'],
  ['reembolsoDespesas-71cca1d', 'reembolsoDespesas'],
];

interface OracleRoute {
  route: D2ContractV2Route;
  definition: D2ContractV2Definition;
  entities: Readonly<Record<string, unknown>>;
}

function oracleRoutes(id: string, moduleName: string): OracleRoute[] {
  const artifacts = loadD1Artifacts(id, moduleName);
  const out: OracleRoute[] = [];
  for (const source of Object.values(artifacts.contractTexts || {})) {
    let definition: D2ContractV2Definition;
    try {
      definition = parseD2ContractV2(source);
    } catch {
      continue;
    }
    for (const route of definition.routes) out.push({ route, definition, entities: artifacts.entities });
  }
  return out;
}

/** Violations of "agree where resolved, declare where not". Empty is a pass. */
function oracleViolations(route: D2ContractV2Route, derived: D1DerivedRequest): string[] {
  const violations: string[] = [];
  const declared = (needle: string): boolean => derived.unresolved.some(item => item.path === needle || item.path.split(/[ ,]+/u).includes(needle));
  const lists = Object.entries(route.meta.lists);
  for (const output of derived.outputs) {
    const row = route.meta.output[output.key];
    if (!row) {
      violations.push(`${route.route}: output ${output.key} is not in meta.`);
      continue;
    }
    if (row.entity !== output.entity || row.many !== output.many) {
      violations.push(`${route.route}: output ${output.key} is ${output.entity}/${output.many}, meta says ${row.entity}/${row.many}.`);
    }
    const list = lists.find(([, item]) => item.key === output.key)?.[1];
    if (output.page !== undefined || output.pageSize !== undefined || output.hasMore !== undefined) {
      if (!list || list.page !== output.page || list.pageSize !== output.pageSize || list.hasMore !== output.hasMore) {
        violations.push(`${route.route}: output ${output.key} paging differs from meta.`);
      }
    }
  }
  for (const [key] of Object.entries(route.meta.output)) {
    if (derived.outputs.some(output => output.key === key)) continue;
    if (!declared(`output.${key}`)) violations.push(`${route.route}: meta output ${key} is neither derived nor unresolved.`);
  }
  for (const [, list] of lists) {
    const output = derived.outputs.find(item => item.key === list.key);
    if (output?.page === list.page) continue;
    if (!derived.unresolved.some(item => item.path.includes(list.page))) {
      violations.push(`${route.route}: meta list ${list.key} paging is neither derived nor unresolved.`);
    }
  }
  for (const [name, param] of Object.entries(route.meta.params)) {
    if (!('pages' in param)) continue;
    const found = derived.params.find(item => item.name === name);
    if (!found) {
      if (!declared(`input.${name}`)) violations.push(`${route.route}: page input ${name} is neither derived nor unresolved.`);
      continue;
    }
    if (found.pages !== param.pages || found.target !== route.meta.lists[param.pages]?.key) {
      violations.push(`${route.route}: page input ${name} differs from meta.`);
    }
  }
  return violations;
}

function reproduced(route: D2ContractV2Route, derived: D1DerivedRequest): boolean {
  return derived.unresolved.length === 0
    && derived.outputs.length === Object.keys(route.meta.output).length
    && oracleViolations(route, derived).length === 0;
}

for (const [id, moduleName] of ORACLE_FIXTURES) {
  void test(`oracle ${id}: the derivation agrees with meta where it resolves and declares every gap`, () => {
    const routes = oracleRoutes(id, moduleName);
    assert.ok(routes.length > 0, `${id} has contract routes`);
    let exact = 0;
    for (const item of routes) {
      const derived = deriveRequest(item.route, item.definition, item.entities);
      assert.deepEqual(oracleViolations(item.route, derived), [], item.route.route);
      if (reproduced(item.route, derived)) exact += 1;
    }
    assert.ok(exact > 0, `${id}: at least one route is reproduced whole`);
  });
}

void test('oracle control: a wrong entity or a dropped unresolved entry is caught', () => {
  const routes = ORACLE_FIXTURES.flatMap(([id, moduleName]) => oracleRoutes(id, moduleName));
  const whole = routes.find(item => reproduced(item.route, deriveRequest(item.route, item.definition, item.entities)));
  assert.ok(whole);
  const swapped = deriveRequest(whole.route, whole.definition, whole.entities);
  swapped.outputs[0] = { ...swapped.outputs[0], entity: `${swapped.outputs[0].entity}X` };
  assert.notDeepEqual(oracleViolations(whole.route, swapped), []);

  const gapped = routes.find(item => deriveRequest(item.route, item.definition, item.entities).unresolved.length > 0);
  assert.ok(gapped);
  const dropped = deriveRequest(gapped.route, gapped.definition, gapped.entities);
  dropped.unresolved = [];
  assert.notDeepEqual(oracleViolations(gapped.route, dropped), []);

  const empty: D1DerivedRequest = { outputs: [], params: [], unresolved: [] };
  assert.notDeepEqual(oracleViolations(whole.route, empty), []);
});
