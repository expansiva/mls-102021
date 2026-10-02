/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/obligations.test.ts" enhancement="_blank"/>

/**
 * m1_40 r1: route obligations of a v2 controller come from the page request (requestService) and
 * the L2 contract v2. The fixture is built here with arbitrary ids; renaming them keeps the result.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { deriveCatalog, type DerivedCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { literalMembers } from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';

interface Ids { project: number; mod: string; page: string; e1: string; e2: string; uc1: string; uc2: string; uc3: string; grant: string; actor: string }

const BASE: Ids = { project: 102099, mod: 'mxq', page: 'pgA', e1: 'Ent1', e2: 'Ent2', uc1: 'ucOne', uc2: 'ucTwo', uc3: 'ucThree', grant: 'gA', actor: 'acA' };
const RENAMED: Ids = { project: 102098, mod: 'zzk', page: 'pgB', e1: 'Wq', e2: 'Yv', uc1: 'kx1', uc2: 'kx2', uc3: 'kx3', grant: 'gZ', actor: 'acZ' };
const SCHEMA = '2026-09-24-d1-definition-v2';

function pascal(value: string): string { return value[0].toUpperCase() + value.slice(1); }

function def(ids: Ids, artifactType: string, artifactId: string, data: Record<string, unknown>): M1Definition {
  return { schemaVersion: SCHEMA, artifactType, artifactId, moduleName: ids.mod, status: 'generated', dependencies: [], data } as unknown as M1Definition;
}

function fixture(ids: Ids, options: { dropRoute?: string; noService?: boolean; noContract?: boolean } = {}): { units: PlanUnitInput[]; texts: Record<string, string> } {
  const r = (name: string): string => `${ids.mod}.${ids.page}.${name}`;
  const contractPath = `l2/${ids.mod}/web/contracts/${ids.page}.defs.ts`;
  const contractInterface = `${pascal(ids.page)}Contracts`;
  const access = { actors: [ids.actor], grants: [ids.grant], scope: 'organization' };
  const routes: D2ContractV2Route[] = [
    {
      route: r('r1'), kind: 'qry', input: '{ f1?: string; page?: number; pageSize?: number }',
      output: `{ a1: ${ids.e1}Load[]; a2: ${ids.e2}Load[]; pg: number; ps: number; hm: boolean }`,
      meta: { output: { a1: { entity: ids.e1, many: true }, a2: { entity: ids.e2, many: true } }, lists: { l1: { key: 'a1', page: 'pg', pageSize: 'ps', hasMore: 'hm' } }, params: {} },
      rules: [], access,
    },
    {
      route: r('r2'), kind: 'cmd', writes: `${ids.e1}.create`, input: '{ f2: string; f3?: number; nest: { n1: string; n2?: number } }',
      output: `{ b1: ${ids.e1}Load }`, meta: { output: { b1: { entity: ids.e1, many: false } }, lists: {}, params: {} }, rules: [], access,
    },
    {
      route: r('r3'), kind: 'cmd', input: '{ f4: string }',
      output: `{ c1: ${ids.e2}Load }`, meta: { output: { c1: { entity: ids.e2, many: false } }, lists: {}, params: {} }, rules: [], access,
    },
  ];
  const contract = renderD2ContractV2({ project: ids.project, module: ids.mod, pageId: ids.page }, {
    module: ids.mod, pageId: ids.page,
    projections: [
      { name: `${ids.e1}Load`, entityId: ids.e1, requestIds: [], body: '  id: string;\n  x1: string;' },
      { name: `${ids.e2}Load`, entityId: ids.e2, requestIds: [], body: '  id: string;\n  y1: number;' },
    ],
    routes: routes.filter(item => item.route !== options.dropRoute),
  });
  const handler = (name: string, kind: string): Record<string, unknown> => ({
    route: r(name), kind, grantIds: [ids.grant], serviceFunction: r(name), contractPath, contractInterface,
  });
  const prefix = `_${ids.project}_/l1/${ids.mod}`;
  const units: PlanUnitInput[] = [
    { defPath: `${prefix}/layer_1_external/adapters/http/controllers/${ids.page}.defs.ts`, definition: def(ids, 'httpController', ids.page, {
      pageId: ids.page, handlers: [handler('r1', 'query'), handler('r2', 'command'), handler('r3', 'command')],
    }) },
    { defPath: `${prefix}/layer_2_application/scope/accessScope.defs.ts`, definition: def(ids, 'accessScope', 'accessScope', {
      scopeId: 'accessScope',
      grants: [{ grantId: ids.grant, actorRef: ids.actor, entityRefs: [ids.e1, ids.e2], disclosure: 'fullRecord', scopeMode: 'organization', session: 'verified', path: [], pending: '' }],
    }) },
    { defPath: `${prefix}/layer_1_external/auth/authorityMap.defs.ts`, definition: def(ids, 'authorityMap', 'authorityMap', {
      mapId: 'authorityMap', entries: [{ grantId: ids.grant, actorRef: ids.actor }],
    }) },
  ];
  if (!options.noService) {
    units.push({ defPath: `${prefix}/layer_2_application/requests/${ids.page}.defs.ts`, definition: def(ids, 'requestService', ids.page, {
      pageId: ids.page,
      requests: [
        { route: r('r1'), kind: 'qry', uses: [ids.uc1, ids.uc2], transaction: 'none', params: [],
          outputs: [{ key: 'a1', entity: ids.e1, fields: ['id', 'x1'] }, { key: 'a2', entity: ids.e2, fields: ['id', 'y1'] }] },
        { route: r('r2'), kind: 'cmd', uses: [ids.uc1, ids.uc3], transaction: 'single', params: [],
          outputs: [{ key: 'b1', entity: ids.e1, fields: ['id', 'x1'] }] },
        { route: r('r3'), kind: 'cmd', uses: [ids.uc2], transaction: 'single', params: [],
          outputs: [{ key: 'c1', entity: ids.e2, fields: ['id'] }] },
      ],
    }) });
  }
  const texts: Record<string, string> = options.noContract ? {} : { [`_${ids.project}_/${contractPath}`]: contract };
  return { units, texts };
}

function derive(ids: Ids, options?: Parameters<typeof fixture>[1]): DerivedCatalog {
  const fx = fixture(ids, options);
  return deriveCatalog(ids.mod, fx.units, fx.texts);
}

/** Obligations with the ids replaced by placeholders, so two fixtures compare. */
function shape(derived: DerivedCatalog, ids: Ids): string[] {
  const swap = (text: string): string => [ids.page, ids.mod, ids.e1, ids.e2, ids.uc1, ids.uc2, ids.uc3, ids.grant, ids.actor, String(ids.project)]
    .reduce((acc, id, index) => acc.split(id).join(`<${index}>`), text);
  return [
    ...derived.obligations.map(item => swap(JSON.stringify({ ...item, sources: [] }))),
    ...derived.gaps.filter(gap => !gap.reason.includes('declared, not executed')).map(gap => swap(gap.reason)),
  ].sort();
}

void test('m1_40: v2 controller cases come from the request and the contract v2', () => {
  const derived = derive(BASE);
  const byKind = (kind: string): string[] => derived.obligations.filter(item => item.kind === kind).map(item => item.caseId).sort();
  assert.deepEqual(byKind('shape'), ['pgA.shape.r1']);
  assert.deepEqual(byKind('success'), ['pgA.success.r2', 'pgA.success.r3']);
  assert.deepEqual(byKind('rollback'), ['pgA.rollback.r2.ucThree']);
  assert.deepEqual(byKind('contract'), ['pgA.contract.r2.f2', 'pgA.contract.r3.f4']);
  assert.deepEqual(byKind('minimalInput'), ['pgA.minimal.r1', 'pgA.minimal.r2']);
  assert.equal(derived.gaps.some(gap => gap.reason.includes('contract required field was not read')), false);

  const shapeCase = derived.obligations.find(item => item.kind === 'shape');
  assert.ok(shapeCase);
  assert.deepEqual(shapeCase.expect.allowedPaths, ['a1', 'a1.id', 'a1.x1', 'a2', 'a2.id', 'a2.y1', 'hm', 'pg', 'ps']);
  assert.equal(shapeCase.expect.ok, true);
  assert.equal(shapeCase.expect.status, 200);
  assert.equal(shapeCase.mutating, false);
  assert.deepEqual(shapeCase.caller, { source: 'http', authorities: ['mxq:acA'] });

  const success = derived.obligations.find(item => item.caseId === 'pgA.success.r2');
  assert.ok(success);
  assert.equal(success.mutating, true);
  assert.deepEqual(success.input.required, ['f2', 'nest', 'nest.n1']);
  assert.deepEqual(success.input.optional, ['f3', 'nest.n2']);
  assert.deepEqual(success.expect.allowedPaths, ['b1', 'b1.id', 'b1.x1']);
  assert.equal(success.blocker, 'RUNTIME_IDENTITY_PENDING');

  const rollback = derived.obligations.find(item => item.kind === 'rollback');
  assert.ok(rollback);
  assert.equal(rollback.expect.ok, false);
  assert.equal(rollback.mutating, true);
  assert.equal(rollback.blocker, 'POSTGRES_ONLY');
  assert.equal(rollback.owner, 'runtime 102034 (DATABASE_URL_TEST)');
  assert.equal(derived.gaps.some(gap => gap.reason.includes(`${rollback.caseId} is declared, not executed`) && gap.reason.includes('runtime proof POSTGRES_ONLY')), true);
  assert.equal(rollback.sources.includes('_102099_/l2/mxq/web/contracts/pgA.defs.ts'), true);

  // The command with one usecase has no rollback case and says so.
  const single = derived.gaps.filter(gap => gap.reason.startsWith('ROLLBACK_SINGLE_USE'));
  assert.deepEqual(single.map(gap => gap.reason), ['ROLLBACK_SINGLE_USE: mxq.pgA.r3 uses one usecase']);
  // Only the unauthenticated refusal is a catalog case; the monitor format does not change.
  const cases = derived.catalog.scenarios.flatMap(item => item.cases).filter(item => item.runner === 'route');
  assert.equal(cases.length, 3);
  assert.equal(cases.every(item => item.gate === 'auth'), true);
});

void test('m1_40: renaming every id keeps the same cases', () => {
  assert.deepEqual(shape(derive(RENAMED), RENAMED), shape(derive(BASE), BASE));
  assert.equal(derive(RENAMED).obligations.length, derive(BASE).obligations.length);
});

void test('m1_40: an unread source is a visible gap, never an invented case', () => {
  const missing = derive(BASE, { dropRoute: 'mxq.pgA.r2' });
  assert.equal(missing.gaps.some(gap => gap.reason.startsWith('CONTRACT_ROUTE_MISSING: mxq.pgA.r2')), true);
  assert.equal(missing.obligations.some(item => item.routine === 'mxq.pgA.r2'), false);
  assert.equal(missing.obligations.some(item => item.routine === 'mxq.pgA.r1'), true);

  // Fail-open closed: a v2 controller whose handlers read no source has 0 obligations and one reason per route.
  for (const [options, code] of [[{ noService: true }, 'REQUEST_UNREAD'], [{ noContract: true }, 'CONTRACT_UNREAD']] as const) {
    const derived = derive(BASE, options);
    assert.equal(derived.obligations.length, 0, code);
    const reasons = derived.gaps.filter(gap => gap.artifactType === 'httpController').map(gap => gap.reason);
    assert.equal(reasons.length, 3, code);
    assert.equal(reasons.every(reason => reason.startsWith(`${code}:`)), true, code);
  }
});

void test('m1_40: inline contract input members', () => {
  assert.deepEqual(literalMembers('{ a?: string; b: { c: number; d?: \'x\' | \'y\' }; e: Array<{ f: string }> }'), {
    required: ['b', 'b.c', 'e'], allowedPaths: ['a', 'b', 'b.c', 'b.d', 'e'],
  });
  assert.deepEqual(literalMembers('{}'), { required: [], allowedPaths: [] });
  assert.equal(literalMembers('Foo'), null);
  assert.equal(literalMembers('{ a: string'), null);
});
