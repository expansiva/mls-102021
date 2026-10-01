/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/requestService.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1InputArtifacts, D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { coreControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import type {
  D1ControllerGrant,
  D1ControllerRelationship,
  D1ControllerRequest,
  D1ServiceRequestSource,
  D1ServiceRow,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
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
  const actors = pageActors(artifacts.needs);
  const pageIds = [...new Set(snapshot.selection.routes.map(route => route.page))].sort();
  return {
    project: 102047,
    moduleName,
    pages: pageIds.map(pageId => ({
      pageId,
      actors: actors.get(pageId) || [],
      defPath: `l1/${moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`,
    })),
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
    grants: grantsFrom(artifacts.access),
    relationships: relationshipsFrom(artifacts.ontologyIndex),
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

function pageActors(needs: unknown): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!isRecord(needs) || !Array.isArray(needs.pages)) return out;
  for (const page of needs.pages) {
    if (!isRecord(page) || typeof page.pageId !== 'string' || !Array.isArray(page.actors)) continue;
    out.set(page.pageId, page.actors.filter((item): item is string => typeof item === 'string' && item.length > 0));
  }
  return out;
}

function grantsFrom(access: unknown): D1ControllerGrant[] {
  if (!isRecord(access) || !Array.isArray(access.grants)) return [];
  const out: D1ControllerGrant[] = [];
  for (const grant of access.grants) {
    if (!isRecord(grant) || typeof grant.grantId !== 'string' || typeof grant.actorRef !== 'string') continue;
    const disclosure = isRecord(grant.disclosure) ? grant.disclosure : {};
    const scope = isRecord(grant.dataScope) ? grant.dataScope : {};
    const mode = disclosure.mode === 'fullRecord' || disclosure.mode === 'fieldsOnly' ? disclosure.mode : '';
    if (!mode) continue;
    out.push({
      grantId: grant.grantId,
      actorRef: grant.actorRef,
      entityRefs: stringList(grant.entityRefs),
      disclosure: mode,
      allowedFields: stringList(disclosure.allowedFields),
      anchorEntity: typeof scope.anchorEntity === 'string' ? scope.anchorEntity : '',
      scopeMode: typeof scope.mode === 'string' ? scope.mode : '',
    });
  }
  return out;
}

function relationshipsFrom(index: unknown): D1ControllerRelationship[] {
  if (!isRecord(index) || !Array.isArray(index.relationships)) return [];
  const out: D1ControllerRelationship[] = [];
  for (const rel of index.relationships) {
    if (!isRecord(rel) || typeof rel.relationshipId !== 'string') continue;
    out.push({
      relationshipId: rel.relationshipId,
      from: typeof rel.from === 'string' ? rel.from : '',
      to: typeof rel.to === 'string' ? rel.to : '',
      field: typeof rel.field === 'string' ? rel.field : '',
      required: rel.required === true,
    });
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

void test('v1 controllers stay one usecase binding and gain no request service', () => {
  const build = buildD1Controllers(coreControllerRequest());
  assert.equal(build.schemaVersion, D1_CONTROLLER_VERSION);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.services.length, 0);
  assert.equal(build.emit.length, 5);
  const handler = build.controllers.flatMap(item => item.handlers)[0];
  assert.equal(handler?.usecaseId.length > 0, true);
  assert.equal(handler?.serviceFunction, '');
  assert.equal(handler?.contractInterface, '');
});

void test('a contract v2 page controller is an adapter over one request service function', () => {
  for (const [id, moduleName] of [['controleEstoque-39a5166', 'controleEstoque'], ['ledgerBin-39a5166', 'ledgerBin']] as const) {
    const { snapshot, artifacts } = snapshotOf(id, moduleName);
    const request = serviceRequest(snapshot, artifacts, moduleName);
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
