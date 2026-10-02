/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/catalogContract.test.ts" enhancement="_blank"/>

/**
 * m1_40 r1b: the catalog loader reads the L2 contract a v2 handler names relatively, outside the
 * def dependencies, under the project-qualified ref. Fixture built here with arbitrary ids.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { runMaterialize, type MaterializeRunHost } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';

const PROJECT = 102097;
const MOD = 'qwv';
const PAGE = 'pgC';
const ROUTE = `${MOD}.${PAGE}.r1`;
const CONTRACT_PATH = `l2/${MOD}/web/contracts/${PAGE}.defs.ts`;
const CONTRACT_REF = `_${PROJECT}_/${CONTRACT_PATH}`;
const L1 = `_${PROJECT}_/l1/${MOD}`;

function def(artifactType: string, artifactId: string, data: Record<string, unknown>, dependencies: string[] = []): M1Definition {
  return { schemaVersion: '2026-09-24-d1-definition-v2', artifactType, artifactId, moduleName: MOD, status: 'generated', dependencies, data } as unknown as M1Definition;
}

const UNITS: PlanUnitInput[] = [
  { defPath: `${L1}/layer_1_external/adapters/http/controllers/${PAGE}.defs.ts`, definition: def('httpController', PAGE, {
    pageId: PAGE,
    handlers: [{ route: ROUTE, kind: 'query', grantIds: ['gQ'], serviceFunction: ROUTE, contractPath: CONTRACT_PATH, contractInterface: 'PgCContracts' }],
  }, [`${L1}/layer_1_external/auth/authorityMap.defs.ts`, `${L1}/layer_2_application/requests/${PAGE}.defs.ts`, `${L1}/layer_2_application/scope/accessScope.defs.ts`]) },
  { defPath: `${L1}/layer_2_application/requests/${PAGE}.defs.ts`, definition: def('requestService', PAGE, {
    pageId: PAGE,
    requests: [{ route: ROUTE, kind: 'qry', uses: ['ucQ'], transaction: 'none', params: [], outputs: [{ key: 'k1', entity: 'Ex', fields: ['id'] }] }],
  }) },
  { defPath: `${L1}/layer_2_application/scope/accessScope.defs.ts`, definition: def('accessScope', 'accessScope', {
    scopeId: 'accessScope',
    grants: [{ grantId: 'gQ', actorRef: 'aQ', entityRefs: ['Ex'], disclosure: 'fullRecord', scopeMode: 'organization', session: 'verified', path: [], pending: '' }],
  }) },
  { defPath: `${L1}/layer_1_external/auth/authorityMap.defs.ts`, definition: def('authorityMap', 'authorityMap', { mapId: 'authorityMap', entries: [{ grantId: 'gQ', actorRef: 'aQ' }] }) },
];

const CONTRACT = renderD2ContractV2({ project: PROJECT, module: MOD, pageId: PAGE }, {
  module: MOD, pageId: PAGE,
  projections: [{ name: 'ExLoad', entityId: 'Ex', requestIds: [], body: '  id: string;' }],
  routes: [{
    route: ROUTE, kind: 'qry', input: '{ q?: string }', output: '{ k1: ExLoad[] }',
    meta: { output: { k1: { entity: 'Ex', many: true } }, lists: {}, params: {} }, rules: [],
    access: { actors: ['aQ'], grants: ['gQ'], scope: 'organization' },
  }],
});

/** Platform files the controller structure reads, from the repo (read only). */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
function platform(ref: string): string | null {
  const match = /^_(\d+)_\/(.+)$/.exec(ref);
  if (!match || match[1] === String(PROJECT)) return null;
  try {
    return readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8');
  } catch {
    return null;
  }
}

function host(files: Record<string, string>): MaterializeRunHost {
  const map = new Map(Object.entries(files));
  const state: MaterializeStateStore = {
    async readReceipt() { return null; },
    async writeReceipt() { throw new Error('simulate must not write'); },
    async readOwned() { return null; },
    async writeOwned() { throw new Error('simulate must not write'); },
    async removeOwned() { throw new Error('simulate must not write'); },
    async readRevision() { return null; },
  };
  return {
    io: { async read(ref: string) { return map.get(ref) ?? platform(ref); } },
    state,
    // Bound only so the controller is not withheld; simulate never calls it.
    runners: { 'structure.httpController': async () => { throw new Error('simulate must not run a handler'); } },
    now: () => '2026-10-01T12:00:00.000Z',
    catalogRef: 'catalog.json',
    commit: 'c0ffee1',
    monitorError: null,
  };
}

async function catalogGaps(files: Record<string, string>): Promise<string[]> {
  const result = await runMaterialize({
    project: PROJECT, moduleName: MOD, stage: 'simulate', flow: '', resume: false, units: UNITS,
    profileMode: 'development', profileDeclared: true, budget: { timeoutMs: 2000 },
  }, host(files));
  assert.ok(result.catalog, 'catalog prepared');
  return result.catalog.gaps.filter(gap => gap.artifactType === 'httpController').map(gap => gap.reason);
}

void test('m1_40 r1b: the catalog reads the relative contract of a v2 handler', async () => {
  const reasons = await catalogGaps({ [CONTRACT_REF]: CONTRACT });
  assert.equal(reasons.some(reason => reason.startsWith('CONTRACT_UNREAD')), false, reasons.join('\n'));
  assert.equal(reasons.some(reason => reason.includes(`${PAGE}.shape.r1 is declared, not executed`)), false, reasons.join('\n'));
  assert.equal(reasons.some(reason => reason.includes(`${PAGE}.disclosure.r1 is declared, not executed`)), true, reasons.join('\n'));
});

void test('m1_40 r1b: an unreadable contract is a visible CONTRACT_UNREAD', async () => {
  const reasons = await catalogGaps({});
  assert.deepEqual(reasons, [`CONTRACT_UNREAD: ${CONTRACT_PATH} was not loaded for ${ROUTE}`]);
});
