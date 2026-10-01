/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/requestService.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedControllerRequest, seedSnapshot } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import type { D1ServiceRow } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import { fieldsByEntity, requestServiceProblems } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';

void test('a contract v2 page controller is an adapter over one request service function', () => {
  for (const [id, moduleName] of [['controleEstoque-39a5166', 'controleEstoque'], ['ledgerBin-39a5166', 'ledgerBin']] as const) {
    const { snapshot } = seedSnapshot(id, moduleName);
    const request = seedControllerRequest(id, moduleName);
    const build = buildD1Controllers(request);
    const pages = [...new Set(snapshot.selection.requests.map(item => item.pageId))].sort();
    const errors = build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; ');
    assert.equal(build.ok, true, `${id} ${errors}`);
    assert.deepEqual(build.services.map(item => item.pageId), pages, id);
    assert.equal(build.services.every(item => item.definition?.artifactType === 'requestService'), true, id);
    for (const service of build.services) {
      const selected = snapshot.selection.requests.filter(item => item.pageId === service.pageId);
      assert.deepEqual([...service.requests.map(item => item.route)].sort(), selected.map(item => item.route).sort(), id);
      for (const row of service.requests) {
        const source = selected.find(item => item.route === row.route);
        assert.deepEqual(row.uses, source?.uses, `${id} ${row.route}`);
        assert.equal(row.transaction, row.kind === 'cmd' ? 'single' : 'none');
        assert.equal(row.outputs.every(output => output.fields.length > 0), true, row.route);
      }
      const dependencies = service.definition?.dependencies || [];
      assert.equal(dependencies.every(path => path.includes('/usecases/')), true, dependencies.join(','));
      assert.equal(dependencies.some(path => path.includes('/scope/') || path.includes('/l2/')), false);
      assert.deepEqual(dependencies, [...dependencies].sort());
      const controller = build.controllers.find(item => item.pageId === service.pageId);
      const data = controller?.definition?.data as { handlers?: Array<Record<string, unknown>> } | undefined;
      const handlers = data?.handlers || [];
      assert.deepEqual(handlers.map(item => item.route).sort(), service.requests.map(item => item.route).sort(), id);
      const contract = request.contracts.find(item => item.pageId === service.pageId);
      for (const handler of handlers) {
        assert.deepEqual(Object.keys(handler).sort(), ['contractInterface', 'contractPath', 'grantIds', 'kind', 'route', 'serviceFunction']);
        assert.equal(handler.serviceFunction, handler.route, `${id} ${handler.route}`);
        assert.equal(handler.contractPath, contract?.path);
        assert.equal(typeof handler.contractInterface, 'string');
        assert.match(String(handler.contractInterface), /Contracts$/);
        assert.equal(contract?.source.includes(`export interface ${handler.contractInterface}`), true);
        assert.equal(/Input$|Output$/.test(String(handler.contractInterface)), false);
        assert.equal(JSON.stringify(handler).includes('usecaseId'), false);
      }
      const deps = controller?.definition?.dependencies || [];
      assert.equal(deps.some(path => path.includes(`/requests/${service.pageId}.defs.ts`)), true, deps.join(','));
      assert.equal(deps.some(path => path.includes('/scope/accessScope.defs.ts')), true, deps.join(','));
      assert.equal(deps.some(path => path.includes('/auth/authorityMap.defs.ts')), true, deps.join(','));
      assert.equal(deps.some(path => path.includes('/usecases/') || path.includes('/l2/')), false, deps.join(','));
    }
    assert.equal(build.problems.some(item => item.code === 'CONTRACT_UNBOUND'), false, id);
  }
});

void test('projection outside the ontology, a missing usecase, and two handlers fail the gate', () => {
  const request = seedControllerRequest('controleEstoque-39a5166', 'controleEstoque');
  const load = request.contracts.find(item => item.pageId === 'movimentacoes');
  assert.ok(load);
  load.source = load.source.replace('id: string;', 'id: string;\n  ghost: string;');
  const projected = buildD1Controllers(request);
  const unknown = projected.problems.filter(item => item.code === 'PROJECTION_FIELD_UNKNOWN');
  assert.equal(unknown.some(item => item.message.includes('ghost')), true, unknown.map(item => item.message).join('; '));
  assert.equal(projected.services.find(item => item.pageId === 'movimentacoes')?.definition, null);
  assert.equal(projected.services.find(item => item.pageId === 'produtos')?.definition?.artifactType, 'requestService');

  const missing = seedControllerRequest('controleEstoque-39a5166', 'controleEstoque');
  const row = missing.serviceRequests?.find(item => item.uses.length > 0);
  assert.ok(row);
  row.uses = ['missingUsecase'];
  const unbound = buildD1Controllers(missing);
  assert.equal(unbound.problems.some(item => item.code === 'INVALID_REF' && item.message.includes('missingUsecase')), true);
  assert.equal(unbound.services.find(item => item.pageId === row.pageId)?.definition, null);

  const duplicated = seedControllerRequest('controleEstoque-39a5166', 'controleEstoque');
  const first = duplicated.serviceRequests?.[0];
  assert.ok(first && duplicated.serviceRequests);
  duplicated.serviceRequests = [...duplicated.serviceRequests, { ...first, uses: [...first.uses] }];
  const twice = buildD1Controllers(duplicated);
  assert.equal(twice.problems.some(item => item.code === 'REQUEST_HANDLER' && item.message.includes('has 2 request handlers')), true);
});

void test('a command whose transaction is not single fails the gate', () => {
  const row: D1ServiceRow = {
    route: 'desk.cards.save',
    kind: 'cmd',
    uses: ['writeItem'],
    transaction: 'none',
    outputs: [{ key: 'card', entity: 'ItemCard', fields: ['id'] }],
    params: [],
  };
  const problems = requestServiceProblems({
    pageId: 'cards',
    contractRoutes: [row.route],
    requests: [row],
    usecaseIds: new Set(['writeItem']),
    fieldsByEntity: fieldsByEntity({ ItemCard: { record: { fields: { id: { type: 'uuid' } } } } }),
  });
  assert.equal(problems.some(item => item.code === 'TRANSACTION_REQUIRED' && item.message.includes('single')), true, problems.map(item => item.message).join('; '));
  const kept = requestServiceProblems({
    pageId: 'cards',
    contractRoutes: [row.route],
    requests: [{ ...row, transaction: 'single' }],
    usecaseIds: new Set(['writeItem']),
    fieldsByEntity: fieldsByEntity({ ItemCard: { record: { fields: { id: { type: 'uuid' } } } } }),
  });
  assert.equal(kept.some(item => item.severity === 'error'), false, kept.map(item => item.message).join('; '));
});
