/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { buildD1Controllers, grantUnionIssues } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import { outputViews } from '/_102021_/l2/helpers/l1Defs/requestTree.js';
import type { D1ControllerBuild, D1ControllerGrant, D1ControllerRequest, D1HandlerBinding } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

/** The frozen v2 seed and its renamed copy. Ids are read from the request, never named here. */
const SEEDS = [['controleEstoque-39a5166', 'controleEstoque'], ['ledgerBin-39a5166', 'ledgerBin']] as const;

function seed(): D1ControllerRequest {
  return seedControllerRequest(SEEDS[0][0], SEEDS[0][1]);
}

function errors(build: D1ControllerBuild): string {
  return build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; ');
}

/** A page with one query and one command, and the entity the query projects. */
function pageWithQueryAndCommand(request: D1ControllerRequest): { pageId: string; query: string; command: string; entity: string } {
  for (const page of request.pages) {
    const rows = (request.serviceRequests || []).filter(item => item.pageId === page.pageId);
    const query = rows.find(item => item.kind === 'qry' && item.outputs.length === 1);
    const command = rows.find(item => item.kind === 'cmd');
    if (query && command) return { pageId: page.pageId, query: query.route, command: command.route, entity: query.outputs[0].entity };
  }
  assert.fail('the seed has no page with one single-entity query and one command');
}

void test('each contract route is one handler of its page controller, an adapter with a verified session', () => {
  for (const [id, moduleName] of SEEDS) {
    const request = seedControllerRequest(id, moduleName);
    const build = buildD1Controllers(request);
    assert.equal(build.ok, true, `${id} ${errors(build)}`);
    assert.equal(build.llmCalls, 0);
    const selected = request.serviceRequests || [];
    assert.equal(build.measuredRoutes, selected.length);
    assert.equal(build.measuredPages, request.pages.length);
    assert.deepEqual(build.controllers.map(item => item.pageId), request.pages.map(item => item.pageId).sort());
    assert.equal(build.emit.filter(item => item.definition.artifactType === 'httpController').length, request.pages.length);
    const handlers = build.controllers.flatMap(item => item.handlers);
    assert.deepEqual(handlers.map(item => item.route).sort(), selected.map(item => item.route).sort());
    for (const handler of handlers) {
      assert.equal(handler.serviceFunction, handler.route);
      assert.equal(handler.usecaseId, '');
      assert.equal(handler.session, 'verified');
      assert.deepEqual(handler.steps, ['transport', 'session', 'authorize', 'call', 'project', 'bff']);
      assert.equal(handler.projection.envelope, 'passthrough');
      assert.equal(handler.grantIds.length > 0, true, handler.route);
    }
    const controllers = build.emit.filter(item => item.definition.artifactType === 'httpController');
    for (const item of controllers) {
      const files = item.pipeline[0]?.dependsFiles || [];
      assert.equal(files.filter(file => file.includes('/requests/')).length, 1, files.join(','));
      assert.equal(files.some(file => file.includes('/usecases/') || file.includes('/l2/')), false, files.join(','));
      assert.equal((item.pipeline[0]?.dependsOn || []).some(dep => dep.includes('repositoryAdapter')), false);
    }
    assert.equal(JSON.stringify(build.emit).includes('ctx.mdm'), false);
    assert.deepEqual(build.enumerations, []);
  }
});

void test('a disclosed field the page grant does not allow is not fixed by a grant of another actor', () => {
  const request = seed();
  const { pageId, query, entity } = pageWithQueryAndCommand(request);
  const row = (request.serviceRequests || []).find(item => item.route === query);
  const fields = outputViews(buildD1Controllers(seed()).services.find(item => item.pageId === pageId)?.requests.find(item => item.route === query)?.output ?? [])[0]?.fields || [];
  assert.ok(row && fields.length >= 2, query);
  const hidden = fields[fields.length - 1];
  const page = request.pages.find(item => item.pageId === pageId);
  assert.ok(page);
  const actor = page.actors[0];
  request.grants = [
    grant(`${actor}Narrow`, actor, [entity], 'fieldsOnly', fields.slice(0, -1).map(field => `${entity}.${field}`)),
    grant('otherActorFull', 'otherActor', [entity], 'fullRecord', []),
    ...request.grants.filter(item => !item.entityRefs.includes(entity)).map(item => ({ ...item })),
  ];
  const build = buildD1Controllers(request);
  const bound = handler(build.controllers.flatMap(item => item.handlers), query);
  assert.deepEqual(bound.grantIds, [`${actor}Narrow`]);
  assert.deepEqual(grantUnionIssues(page.actors, ['otherActorFull'], request.grants), ['otherActorFull']);
  assert.equal(build.problems.some(item => item.code === 'DISCLOSURE' && item.path === query && item.message.includes(hidden)), true, errors(build));
  assert.equal(build.ok, false);
  assert.equal(build.emit.length, 0);
});

void test('fieldsOnly covers a branch and its descendants, not its parent or a sibling', () => {
  const base = seed();
  const { query, entity } = pageWithQueryAndCommand(base);
  const pageId = (base.serviceRequests || []).find(item => item.route === query)?.pageId || '';
  const fields = outputViews(buildD1Controllers(seed()).services.find(item => item.pageId === pageId)?.requests.find(item => item.route === query)?.output ?? [])[0]?.fields || [];
  const nested = fields.filter(field => field.split('.').length >= 3);
  assert.ok(nested.length >= 2, fields.join(','));
  const branch = nested[0].split('.').slice(0, 2).join('.');
  const actor = base.pages.find(item => item.pageId === pageId)?.actors[0] || '';
  const narrow = (allowed: string[]): D1ControllerRequest => {
    const request = seed();
    request.grants = [
      grant('narrow', actor, [entity], 'fieldsOnly', allowed.map(field => `${entity}.${field}`)),
      ...request.grants.filter(item => !item.entityRefs.includes(entity)).map(item => ({ ...item })),
    ];
    return request;
  };

  const whole = buildD1Controllers(narrow(fields.map(field => field.split('.').slice(0, 2).join('.'))));
  const kept = handler(whole.controllers.flatMap(item => item.handlers), query);
  assert.equal(whole.problems.some(item => item.code === 'DISCLOSURE' && item.path === query), false, errors(whole));
  assert.deepEqual(kept.projection.fields, fields);

  const outside = fields.filter(field => !field.startsWith(`${branch}.`));
  const leaf = nested.filter(field => field.startsWith(`${branch}.`));
  const partial = buildD1Controllers(narrow([...outside, leaf[0]]));
  const cut = partial.problems.filter(item => item.code === 'DISCLOSURE' && item.path === query);
  if (leaf.length > 1) {
    assert.equal(cut.some(item => item.message.includes(leaf[1])), true, errors(partial));
    assert.equal(partial.ok, false);
  }
  assert.equal(cut.some(item => item.message.includes(leaf[0])), false);

  const parent = buildD1Controllers(narrow([...outside, branch.split('.')[0]]));
  assert.equal(parent.problems.some(item => item.code === 'DISCLOSURE' && item.path === query), false, errors(parent));
  const sibling = buildD1Controllers(narrow([...outside, `${branch}X`]));
  assert.equal(sibling.problems.some(item => item.code === 'DISCLOSURE' && item.path === query && item.message.includes(leaf[0])), true);
});

void test('fieldsOnly that omits the declared concurrency field still discloses it; a business field stays refused', () => {
  const request = withVersion(seed());
  const { pageId, query, entity } = pageWithQueryAndCommand(request);
  const fields = outputViews(buildD1Controllers(request).services.find(item => item.pageId === pageId)?.requests.find(item => item.route === query)?.output ?? [])[0]?.fields || [];
  assert.ok(fields.includes('version'), fields.join(','));
  const business = fields.find(field => field !== 'id' && field !== 'version');
  assert.ok(business, fields.join(','));
  const page = request.pages.find(item => item.pageId === pageId);
  assert.ok(page);
  const allowed = fields.filter(field => field !== 'version' && field !== business);
  request.grants = [
    grant(`${page.actors[0]}Narrow`, page.actors[0], [entity], 'fieldsOnly', allowed.map(field => `${entity}.${field}`)),
    ...request.grants.filter(item => !item.entityRefs.includes(entity)).map(item => ({ ...item })),
  ];
  const build = buildD1Controllers(request);
  const disclosed = build.problems.filter(item => item.code === 'DISCLOSURE' && item.path === query);
  assert.equal(disclosed.some(item => item.message.includes('version')), false, errors(build));
  assert.equal(disclosed.some(item => item.message.includes(business)), true, errors(build));
});

void test('version is refused when the entity does not declare it as a concurrency field', () => {
  const request = withVersion(seed());
  const { pageId, query, entity } = pageWithQueryAndCommand(request);
  const body = request.ontology?.[entity];
  const record = body && typeof body === 'object' && body !== null && 'record' in body ? (body as { record?: { fields?: Record<string, { derived?: boolean }> } }).record : undefined;
  assert.ok(record?.fields?.version);
  record.fields.version.derived = false;
  const fields = outputViews(buildD1Controllers(request).services.find(item => item.pageId === pageId)?.requests.find(item => item.route === query)?.output ?? [])[0]?.fields || [];
  const page = request.pages.find(item => item.pageId === pageId);
  assert.ok(page);
  request.grants = [
    grant(`${page.actors[0]}Narrow`, page.actors[0], [entity], 'fieldsOnly', fields.filter(field => field !== 'version').map(field => `${entity}.${field}`)),
    ...request.grants.filter(item => !item.entityRefs.includes(entity)).map(item => ({ ...item })),
  ];
  const build = buildD1Controllers(request);
  assert.equal(build.problems.some(item => item.code === 'DISCLOSURE' && item.path === query && item.message.includes('version')), true, errors(build));
});

void test('an empty contract is CONTRACT_UNPARSED and plans no handler', () => {
  const request = seed();
  const contract = request.contracts[0];
  contract.source = '';
  const build = buildD1Controllers(request);
  const problem = build.problems.find(item => item.code === 'CONTRACT_UNPARSED' && item.path === contract.path);
  assert.ok(problem, errors(build));
  assert.equal(build.controllers.some(item => item.pageId === contract.pageId), false);
  assert.equal(build.ok, false);
  assert.equal(build.emit.length, 0);
});

void test('an unclosed contract is CONTRACT_UNPARSED and plans no handler', () => {
  const request = seed();
  const contract = request.contracts[0];
  contract.source = contract.source.slice(0, Math.floor(contract.source.length / 2));
  const build = buildD1Controllers(request);
  const problem = build.problems.find(item => item.code === 'CONTRACT_UNPARSED' && item.path === contract.path);
  assert.ok(problem, errors(build));
  assert.equal(build.controllers.some(item => item.pageId === contract.pageId), false);
  assert.equal(build.ok, false);
  assert.equal(build.emit.length, 0);
});

void test('a foreign contract is CONTRACT_UNPARSED and plans no handler', () => {
  const moved = seed();
  const [first, second] = moved.contracts;
  assert.ok(first && second);
  first.source = second.source;
  const foreign = buildD1Controllers(moved);
  assert.equal(foreign.problems.some(item => item.code === 'CONTRACT_UNPARSED' && item.path === first.path && item.message.includes(second.pageId)), true, JSON.stringify(foreign.problems));
  assert.equal(foreign.controllers.some(item => item.pageId === first.pageId), false);
  assert.equal(foreign.ok, false);
  assert.equal(foreign.emit.length, 0);
});

void test('negatives: stale file, unreadable file, no authority', () => {
  const request = seed();
  const pageId = request.pages[0].pageId;
  const ghost = `${request.moduleName}.${pageId}.ghost`;
  request.existing = [{ pageId, routes: [ghost], handlers: [], unreadable: false }];
  const staled = buildD1Controllers(request);
  assert.equal(staled.problems.some(item => item.code === 'STALE_ARTIFACT' && item.message.includes(ghost)), true);
  assert.deepEqual(staled.controllers.find(item => item.pageId === pageId)?.staleRoutes, [ghost]);
  assert.equal(staled.emit.length, 0);

  const unreadable = seed();
  unreadable.existing = [{ pageId, routes: [], handlers: [], unreadable: true }];
  const broken = buildD1Controllers(unreadable);
  assert.equal(broken.problems.some(item => item.code === 'STALE_ARTIFACT' && item.message.includes('did not parse')), true);
  assert.equal(broken.ok, false);

  const open = seed();
  open.pages[0].actors = [];
  const unauthorised = buildD1Controllers(open);
  const routes = (open.serviceRequests || []).filter(item => item.pageId === pageId).map(item => item.route);
  assert.equal(unauthorised.problems.some(item => item.code === 'AUTHORITY_REQUIRED' && item.message.includes('No permissive fallback')), true);
  for (const route of routes) assert.deepEqual(handler(unauthorised.controllers.flatMap(item => item.handlers), route).grantIds, []);
  assert.equal(unauthorised.ok, false);

  const noGrant = seed();
  noGrant.grants = [];
  const ungranted = buildD1Controllers(noGrant).problems.filter(item => item.code === 'AUTHORITY_REQUIRED');
  for (const item of noGrant.serviceRequests || []) assert.equal(ungranted.some(problem => problem.path === item.route), true, item.route);
});

void test('an update keeps the done handlers of the same page and plans the others fresh', () => {
  const request = seed();
  const { pageId, query, command } = pageWithQueryAndCommand(request);
  const row = (request.serviceRequests || []).find(item => item.route === query);
  assert.ok(row);
  for (const usecase of request.usecases) if (row.uses.includes(usecase.usecaseId)) usecase.status = 'done';
  const original = request.grants.map(item => item.grantId);
  const extra = { ...request.grants[0], grantId: `${request.grants[0].grantId}Extra`, entityRefs: [...request.grants[0].entityRefs], allowedFields: [] };
  request.grants.push(extra);
  request.existing = [{
    pageId,
    routes: [query],
    handlers: [{ route: query, kind: 'query', usecaseId: '', serviceFunction: query, grantIds: [...original] }],
    unreadable: false,
  }];
  const build = buildD1Controllers(request);
  assert.equal(build.ok, true, errors(build));
  const kept = handler(build.controllers.flatMap(item => item.handlers), query);
  const fresh = handler(build.controllers.flatMap(item => item.handlers), command);
  assert.equal(kept.status, 'done');
  assert.equal(kept.preserved, true);
  assert.deepEqual(kept.grantIds, original);
  assert.equal(fresh.preserved, false);
  assert.deepEqual(fresh.grantIds, [...original, extra.grantId]);
  const emitted = build.emit.find(item => item.definition.artifactType === 'httpController' && item.definition.artifactId === pageId);
  const data = emitted?.definition.data as { handlers: Array<{ route: string; grantIds: string[] }> };
  assert.deepEqual(data.handlers.find(item => item.route === query)?.grantIds, original);

  const missing = seed();
  for (const usecase of missing.usecases) if (row.uses.includes(usecase.usecaseId)) usecase.status = 'done';
  assert.equal(buildD1Controllers(missing).problems.some(item => item.code === 'HANDLER_MISSING' && item.path === query), true);

  const changed = seed();
  for (const usecase of changed.usecases) if (row.uses.includes(usecase.usecaseId)) usecase.status = 'done';
  changed.existing = [{
    pageId,
    routes: [query],
    handlers: [{ route: query, kind: 'query', usecaseId: '', serviceFunction: `${query}Other`, grantIds: [...original] }],
    unreadable: false,
  }];
  assert.equal(buildD1Controllers(changed).problems.some(item => item.code === 'STALE_ARTIFACT' && item.path === query), true);
});

void test('removing one route keeps the page controller; removing the page reports its def', () => {
  const request = seed();
  const { pageId, command } = pageWithQueryAndCommand(request);
  const contract = request.contracts.find(item => item.pageId === pageId);
  assert.ok(contract);
  contract.source = withoutRoute(contract.source, command);
  request.serviceRequests = (request.serviceRequests || []).filter(item => item.route !== command);
  const defPath = `l1/${request.moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`;
  request.existing = [{ pageId, routes: (request.serviceRequests || []).filter(item => item.pageId === pageId).map(item => item.route).concat(command), handlers: [], unreadable: false }];
  request.removedRoutes = [{ route: command, pageId, defPath, contentHash: `sha256:${'ab'.repeat(32)}` }];
  const build = buildD1Controllers(request);
  assert.equal(build.ok, true, errors(build));
  const handlers = build.controllers.find(item => item.pageId === pageId)?.handlers || [];
  assert.equal(handlers.some(item => item.route === command), false);
  assert.ok(handlers.length >= 1);
  assert.equal(build.removals.length, 0);
  assert.equal(build.emit.some(item => item.definition.artifactType === 'httpController' && item.definition.artifactId === pageId), true);

  const gone = seed();
  const routes = (gone.serviceRequests || []).filter(item => item.pageId === pageId);
  gone.contracts = gone.contracts.filter(item => item.pageId !== pageId);
  gone.pages = gone.pages.filter(item => item.pageId !== pageId);
  gone.serviceRequests = (gone.serviceRequests || []).filter(item => item.pageId !== pageId);
  gone.removedRoutes = routes.map(item => ({ route: item.route, pageId, defPath, contentHash: `sha256:${'cd'.repeat(32)}` }));
  const empty = buildD1Controllers(gone);
  assert.equal(empty.ok, true, errors(empty));
  assert.equal(empty.emit.some(item => item.definition.artifactId === pageId), false);
  assert.equal(empty.removals.length, 1);
  assert.match(empty.removals[0].outputTs[0] || '', new RegExp(`${pageId}\\.ts$`));
  assert.ok(empty.emit.length > 0);
});

/** Drops one route block from a v2 contract text. */
function withoutRoute(source: string, route: string): string {
  const start = source.indexOf(`  '${route}': {`);
  assert.ok(start >= 0, route);
  const end = source.indexOf('\n  };\n', start);
  assert.ok(end > start, route);
  return source.slice(0, start) + source.slice(end + '\n  };\n'.length);
}

/** Puts `version` on every output interface that already projects `id`. */
function withVersion(request: D1ControllerRequest): D1ControllerRequest {
  for (const contract of request.contracts) {
    contract.source = contract.source.replaceAll('id: string;', 'id: string;\n  version: number;');
  }
  return request;
}

function grant(
  grantId: string,
  actorRef: string,
  entityRefs: string[],
  disclosure: 'fieldsOnly' | 'fullRecord',
  allowedFields: string[],
): D1ControllerGrant {
  return { grantId, actorRef, entityRefs, disclosure, allowedFields, anchorEntity: '', scopeMode: 'organization' };
}

function handler(handlers: D1HandlerBinding[], route: string): D1HandlerBinding {
  const found = handlers.find(item => item.route === route);
  assert.ok(found, route);
  return found;
}

void test('d1_63: a calculated value leaves only under fullRecord; otherwise COMPUTED_NOT_DISCLOSED names route and path', () => {
  const base = seed();
  const { pageId, query, entity } = pageWithQueryAndCommand(base);
  const fields = outputViews(buildD1Controllers(seed()).services.find(item => item.pageId === pageId)?.requests.find(item => item.route === query)?.output ?? [])[0]?.fields || [];
  const actor = base.pages.find(item => item.pageId === pageId)?.actors[0] || '';
  const calculated = fields[fields.length - 1];
  const withComputed = (mode: 'fieldsOnly' | 'fullRecord'): D1ControllerRequest => {
    const request = seed();
    const row = (request.serviceRequests || []).find(item => item.route === query);
    assert.ok(row, query);
    row.outputs[0].computed = [calculated];
    request.grants = [
      grant('only', actor, [entity], mode, mode === 'fieldsOnly' ? [entity] : []),
      ...request.grants.filter(item => !item.entityRefs.includes(entity)).map(item => ({ ...item })),
    ];
    return request;
  };
  const closed = buildD1Controllers(withComputed('fieldsOnly'));
  assert.equal(closed.problems.some(item => item.code === 'COMPUTED_NOT_DISCLOSED' && item.path === query && item.message === `COMPUTED_NOT_DISCLOSED: ${query} ${calculated}`), true, errors(closed));
  assert.equal(closed.problems.some(item => item.code === 'DISCLOSURE' && item.path === query), false, errors(closed));
  assert.equal(closed.ok, false);
  const open = buildD1Controllers(withComputed('fullRecord'));
  assert.equal(open.problems.some(item => item.path === query && (item.code === 'COMPUTED_NOT_DISCLOSED' || item.code === 'DISCLOSURE')), false, errors(open));
});
