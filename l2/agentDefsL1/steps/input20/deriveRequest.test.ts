/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveRequest.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import { loadD1Artifacts } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { D1_GAP_NONE, type D1RequestGapAnswer, type D1RequestUnresolved } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { applyResolutions, deriveRequest, type D1DerivedRequest } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';

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

  const empty: D1DerivedRequest = { outputs: [], params: [], unresolved: [], computedBy: [] };
  assert.notDeepEqual(oracleViolations(whole.route, empty), []);
});

/**
 * d1_62 oracle. A test resolver answers each gap from `meta` (only this test reads it). The answers of the first
 * derivation are applied once, through `applyResolutions`, and the outputs and page inputs must come out as the
 * input20 selects them from `meta` today. Filter inputs are not compared: the derivation leaves them as inputs (d1_60 item 2).
 */
function metaAnswer(route: D2ContractV2Route, gap: D1RequestUnresolved): string {
  if (gap.kind === 'entity' && gap.path.startsWith('output.')) return route.meta.output[gap.path.slice('output.'.length)]?.entity ?? D1_GAP_NONE;
  if (gap.kind === 'flatPaging') {
    const names = gap.path.slice('output.'.length).split(', ');
    return Object.values(route.meta.lists).find(list => names.includes(list.page))?.key ?? D1_GAP_NONE;
  }
  if (gap.kind === 'pageParam') {
    const param = route.meta.params[gap.path.slice('input.'.length)];
    return param && 'pages' in param ? route.meta.lists[param.pages]?.key ?? D1_GAP_NONE : D1_GAP_NONE;
  }
  return D1_GAP_NONE;
}

function answersFor(gaps: readonly D1RequestUnresolved[], pick: (gap: D1RequestUnresolved) => string): D1RequestGapAnswer[] {
  return gaps.map(gap => ({ path: gap.path, choice: pick(gap) }));
}

/** Differences between the derived selection and the one the input20 builds from `meta` today. Empty is a pass. */
function selectionDiff(route: D2ContractV2Route, derived: D1DerivedRequest): string[] {
  const lists = Object.values(route.meta.lists);
  const expectedOutputs = Object.entries(route.meta.output).map(([key, row]) => {
    const list = lists.find(item => item.key === key);
    return { key, entity: row.entity, many: row.many, page: list?.page, pageSize: list?.pageSize, hasMore: list?.hasMore };
  }).sort((left, right) => left.key.localeCompare(right.key));
  const derivedOutputs = derived.outputs.map(output => ({
    key: output.key, entity: output.entity, many: output.many, page: output.page, pageSize: output.pageSize, hasMore: output.hasMore,
  })).sort((left, right) => left.key.localeCompare(right.key));
  const expectedParams = Object.entries(route.meta.params)
    .flatMap(([name, row]) => 'pages' in row ? [{ name, target: route.meta.lists[row.pages]?.key ?? '', pages: row.pages }] : [])
    .sort((left, right) => left.name.localeCompare(right.name));
  const derivedParams = derived.params.map(param => ({ name: param.name, target: param.target, pages: param.pages }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const diff: string[] = [];
  if (JSON.stringify(derivedOutputs) !== JSON.stringify(expectedOutputs)) diff.push(`${route.route}: outputs ${JSON.stringify(derivedOutputs)} != ${JSON.stringify(expectedOutputs)}`);
  if (JSON.stringify(derivedParams) !== JSON.stringify(expectedParams)) diff.push(`${route.route}: page inputs ${JSON.stringify(derivedParams)} != ${JSON.stringify(expectedParams)}`);
  if (derived.unresolved.length) diff.push(`${route.route}: still unresolved ${derived.unresolved.map(gap => gap.path).join('; ')}`);
  return diff;
}

const ALL_ROUTES = (): OracleRoute[] => ORACLE_FIXTURES.flatMap(([id, moduleName]) => oracleRoutes(id, moduleName));

for (const [id, moduleName] of ORACLE_FIXTURES) {
  void test(`resolution oracle ${id}: meta answers to the first gaps, applied once, give today's selection`, () => {
    for (const item of oracleRoutes(id, moduleName)) {
      const first = deriveRequest(item.route, item.definition, item.entities);
      for (const gap of first.unresolved) {
        assert.equal(gap.candidates[gap.candidates.length - 1], D1_GAP_NONE, `${item.route.route} ${gap.path}: none is last`);
        assert.ok(gap.candidates.includes(metaAnswer(item.route, gap)), `${item.route.route} ${gap.path}: the meta answer is a candidate`);
      }
      const resolved = applyResolutions(item, answersFor(first.unresolved, gap => metaAnswer(item.route, gap)));
      assert.deepEqual(selectionDiff(item.route, resolved), [], item.route.route);
    }
  });
}

void test('resolution: none to every gap leaves the derivation and its gaps as they are', () => {
  let gaps = 0;
  for (const item of ALL_ROUTES()) {
    const first = deriveRequest(item.route, item.definition, item.entities);
    gaps += first.unresolved.length;
    assert.deepEqual(applyResolutions(item, answersFor(first.unresolved, () => D1_GAP_NONE)), first, item.route.route);
  }
  assert.ok(gaps > 0, 'the fixtures have gaps');
});

void test('resolution: an answer outside the gap candidates is ignored and the gap stays', () => {
  const routes = ALL_ROUTES();
  let checked = 0;
  for (const item of routes) {
    const first = deriveRequest(item.route, item.definition, item.entities);
    if (!first.unresolved.length) continue;
    const outside = answersFor(first.unresolved, gap => `${gap.candidates[0]}Outside`);
    assert.deepEqual(applyResolutions(item, outside), first, item.route.route);
    // An answer to a path that is not a gap changes nothing either.
    assert.deepEqual(applyResolutions(item, [{ path: 'output.notAGap', choice: first.unresolved[0].candidates[0] }]), first, item.route.route);
    checked += 1;
  }
  assert.ok(checked > 0);
});

void test('resolution control: a selection that ignores the answers turns the oracle red', () => {
  let red = 0;
  for (const item of ALL_ROUTES()) {
    const first = deriveRequest(item.route, item.definition, item.entities);
    if (!first.unresolved.length) continue;
    const ignoring = (source: typeof item, _answers: readonly D1RequestGapAnswer[]): D1DerivedRequest => deriveRequest(source.route, source.definition, source.entities);
    if (selectionDiff(item.route, ignoring(item, answersFor(first.unresolved, gap => metaAnswer(item.route, gap)))).length) red += 1;
  }
  assert.ok(red > 0, 'ignoring the answers leaves the oracle red');
});

/** The shapes of a contract without meta: flattened ontology paths, a page with an unknown key, a cursor, a readonly aggregate. */
void test('resolution: closed candidates for the shapes without meta, and their answers', () => {
  const entities = {
    Thing: { record: { fields: { id: { type: 'string' }, name: { type: 'string' }, details: { type: 'object', fields: { price: { type: 'number' } } } } } },
  };
  const definition: D2ContractV2Definition = {
    module: 'm',
    pageId: 'p',
    projections: [
      { name: 'Row', entityId: '', requestIds: [], body: '{ id: string; name: string; price: number }' },
      { name: 'RowPage', entityId: '', requestIds: [], body: '{ items: Row[]; page: number; pageSize: number; readonly totalItems: number }' },
      { name: 'Cursor', entityId: '', requestIds: [], body: '{ rows: Row[]; readonly hasMore: boolean }' },
      { name: 'Summary', entityId: '', requestIds: [], body: '{ readonly count: number }' },
    ],
    routes: [],
  };
  const route: D2ContractV2Route = {
    route: 'm.p.load',
    kind: 'qry',
    input: '{ page?: number; rowsPage?: number }',
    output: '{ list: RowPage; cursor: Cursor; summary: Summary }',
    meta: { output: {}, lists: {}, params: {} },
    rules: ['countRule'],
    access: { actors: [], grants: [], scope: '' },
  };
  const source = { route, definition, entities };
  const first = deriveRequest(route, definition, entities);
  const byPath = new Map(first.unresolved.map(gap => [gap.path, gap]));
  assert.deepEqual(byPath.get('output.list.totalItems')?.candidates, ['hasMore', 'page', 'pageSize', 'total', D1_GAP_NONE]);
  assert.deepEqual(byPath.get('output.list.price')?.candidates, ['details.price', D1_GAP_NONE]);
  assert.deepEqual(byPath.get('output.cursor.hasMore')?.candidates, ['hasMore', 'page', 'pageSize', 'total', D1_GAP_NONE]);
  assert.deepEqual(byPath.get('output.summary')?.candidates, ['countRule', D1_GAP_NONE]);
  assert.deepEqual(byPath.get('input.page')?.candidates, ['cursor', 'list', D1_GAP_NONE]);
  assert.deepEqual(byPath.get('input.rowsPage')?.candidates, ['cursor', 'list', D1_GAP_NONE]);
  assert.equal(first.outputs.length, 0);

  const chosen: Record<string, string> = {
    'output.list.totalItems': 'total',
    'output.list.price': 'details.price',
    'output.cursor.price': 'details.price',
    'output.cursor.hasMore': 'hasMore',
    'output.summary': 'countRule',
    'input.page': 'list',
    'input.rowsPage': 'cursor',
  };
  const resolved = applyResolutions(source, answersFor(first.unresolved, gap => chosen[gap.path] ?? D1_GAP_NONE));
  assert.deepEqual(resolved.unresolved, []);
  assert.deepEqual(resolved.outputs.map(output => [output.key, output.entity, output.many, output.total, output.hasMore, output.mapped]), [
    ['list', 'Thing', true, 'totalItems', undefined, [{ field: 'price', path: 'details.price' }]],
    ['cursor', 'Thing', true, undefined, 'hasMore', [{ field: 'price', path: 'details.price' }]],
  ]);
  assert.deepEqual(resolved.computedBy, [{ path: 'summary', rule: 'countRule' }]);
  assert.deepEqual(resolved.params, [{ name: 'page', target: 'list', pages: 'list' }, { name: 'rowsPage', target: 'cursor', pages: 'cursor' }]);
});
