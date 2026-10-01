/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/requestService.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1InputArtifacts, D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { coreControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import type { D1ControllerRequest, D1ServiceRequestSource, D1ServiceRow } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { D1_CONTROLLER_VERSION } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import { fieldsByEntity, requestServiceProblems } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';

function artifactsOf(id: string, moduleName: string): D1InputArtifacts {
  const files = loadD1Fixture(id);
  const parsed = new Map<string, unknown>();
  const contractTexts: Record<string, string> = {};
  for (const [file, text] of Object.entries(files)) {
    const kind = file.endsWith('.defs.ts') ? 'defs' : 'json';
    parsed.set(file, parseD1Source(text, kind));
    const contract = new RegExp(`^l2/${moduleName}/web/contracts/([A-Za-z0-9_]+)\\.defs\\.ts$`).exec(file);
    if (contract) contractTexts[contract[1]] = text;
  }
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const [file, value] of parsed) {
    if (file.includes('/journeys/') && !file.endsWith('/index.defs.ts')) journeys[file.split('/').pop()?.replace(/\.defs\.ts$/, '') || ''] = value;
    if (file.includes('/ontology/') && !file.endsWith('/index.defs.ts') && !file.includes('/_102034_/')) {
      entities[file.split('/').pop()?.replace(/\.defs\.ts$/, '') || ''] = value;
    }
  }
  const root = `l4/${moduleName}`;
  return {
    sources: [...parsed.keys()].sort().map(path => ({
      path, sha256: 'fixture', bytes: 1, schemaVersion: '', state: 'present' as const,
    })),
    module: parsed.get(`${root}/module.defs.ts`) ?? null,
    journeyIndex: parsed.get(`${root}/journeys/index.defs.ts`) ?? null,
    journeys,
    ontologyIndex: parsed.get(`${root}/ontology/index.defs.ts`) ?? null,
    entities,
    rules: parsed.get(`${root}/rules.defs.ts`) ?? null,
    workflows: parsed.get(`${root}/workflows.defs.ts`) ?? null,
    access: parsed.get(`${root}/access.defs.ts`) ?? null,
    integration: parsed.get(`${root}/integration.defs.ts`) ?? null,
    menu: parsed.get(`${root}/pool/l2/web/menu.json`) ?? null,
    needs: parsed.get(`${root}/pool/l1/web/needs.json`) ?? null,
    backend: parsed.get(`${root}/pool/l2/web/backend.json`) ?? null,
    effort: parsed.get(`${root}/pool/l2/web/effort.json`) ?? null,
    planner: parsed.get(`${root}/pool/l1/pipeline.json`) ?? null,
    contracts: {},
    contractTexts,
    presentDefs: [],
  };
}

function snapshotOf(id: string, moduleName: string): { snapshot: D1InputSnapshot; artifacts: D1InputArtifacts } {
  const artifacts = artifactsOf(id, moduleName);
  return { snapshot: buildD1InputSnapshot({ project: 102047, moduleName }, artifacts, null), artifacts };
}

function serviceRequest(snapshot: D1InputSnapshot, artifacts: D1InputArtifacts, moduleName: string): D1ControllerRequest {
  const usecasePath = new Map(snapshot.files.filter(file => file.artifactType === 'usecase').map(file => [file.identity, file.defPath]));
  const serviceRequests: D1ServiceRequestSource[] = snapshot.selection.requests.map(item => ({
    route: item.route,
    pageId: item.pageId,
    kind: item.kind,
    uses: [...item.uses],
    outputs: item.outputs.map(output => ({ key: output.key, entity: output.entity })),
    params: item.params.map(param => ({
      name: param.name,
      target: param.target,
      ...(param.field ? { field: param.field } : {}),
      ...(param.pages ? { pages: param.pages } : {}),
    })),
  }));
  return {
    project: 102047,
    moduleName,
    pages: [],
    routes: snapshot.selection.routes.map(route => ({
      route: route.route,
      page: route.page,
      kind: route.kind,
      usecaseRef: route.usecaseRef,
      status: route.status,
    })),
    usecases: snapshot.selection.usecases.map(usecase => ({
      usecaseId: usecase.usecaseId,
      entity: usecase.entity,
      operation: usecase.operation,
      functionName: '',
      defPath: usecasePath.get(usecase.identity) || `l1/${moduleName}/layer_2_application/usecases/${usecase.usecaseId}.defs.ts`,
    })),
    grants: [],
    relationships: [],
    contracts: Object.entries(artifacts.contractTexts).map(([pageId, source]) => ({
      pageId,
      path: `l2/${moduleName}/web/contracts/${pageId}.defs.ts`,
      source,
    })),
    existing: [],
    enumerations: [],
    accessRead: true,
    actorsRead: true,
    serviceRequests,
    ontology: artifacts.entities,
  };
}

void test('v1 controllers stay one usecase binding and gain no request service', () => {
  const build = buildD1Controllers(coreControllerRequest());
  assert.equal(build.schemaVersion, D1_CONTROLLER_VERSION);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.services.length, 0);
  assert.equal(build.emit.length, 5);
  const handler = build.controllers.flatMap(item => item.handlers)[0];
  assert.equal(typeof handler?.usecaseId, 'string');
  assert.equal(handler?.usecaseId.length > 0, true);
});

void test('a contract v2 page gets one request service and the controller stays a v1 adapter', () => {
  for (const [id, moduleName] of [['controleEstoque-39a5166', 'controleEstoque'], ['ledgerBin-39a5166', 'ledgerBin']] as const) {
    const { snapshot, artifacts } = snapshotOf(id, moduleName);
    const build = buildD1Controllers(serviceRequest(snapshot, artifacts, moduleName));
    const pages = [...new Set(snapshot.selection.requests.map(item => item.pageId))].sort();
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
    }
    const handler = build.controllers.flatMap(item => item.handlers)[0];
    assert.equal(Object.hasOwn(handler || {}, 'usecaseId'), true, id);
    assert.equal(build.problems.some(item => item.code === 'CONTRACT_UNBOUND'), true, id);
    assert.equal(build.ok, false, id);
  }
});

void test('projection outside the ontology, a missing usecase, and two handlers fail the gate', () => {
  const { snapshot, artifacts } = snapshotOf('controleEstoque-39a5166', 'controleEstoque');
  const request = serviceRequest(snapshot, artifacts, 'controleEstoque');
  const load = request.contracts.find(item => item.pageId === 'movimentacoes');
  assert.ok(load);
  load.source = load.source.replace('id: string;', 'id: string;\n  ghost: string;');
  const projected = buildD1Controllers(request);
  const unknown = projected.problems.filter(item => item.code === 'PROJECTION_FIELD_UNKNOWN');
  assert.equal(unknown.some(item => item.message.includes('ghost')), true, unknown.map(item => item.message).join('; '));
  assert.equal(projected.services.find(item => item.pageId === 'movimentacoes')?.definition, null);
  assert.equal(projected.services.find(item => item.pageId === 'produtos')?.definition?.artifactType, 'requestService');

  const missing = serviceRequest(snapshot, artifacts, 'controleEstoque');
  const row = missing.serviceRequests?.find(item => item.uses.length > 0);
  assert.ok(row);
  row.uses = ['missingUsecase'];
  const unbound = buildD1Controllers(missing);
  assert.equal(unbound.problems.some(item => item.code === 'INVALID_REF' && item.message.includes('missingUsecase')), true);
  assert.equal(unbound.services.find(item => item.pageId === row.pageId)?.definition, null);

  const duplicated = serviceRequest(snapshot, artifacts, 'controleEstoque');
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
