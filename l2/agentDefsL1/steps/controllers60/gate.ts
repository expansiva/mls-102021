/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/gate.ts" enhancement="_blank"/>

import {
  definitionIssues,
  pendingDefinition,
  type D1Definition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  futureOutputPath,
  pipelineId,
  qualifyDefPath,
  requestServiceDefPath,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { renderDefinition, stampDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import {
  contractInterfaceName,
  fieldsByEntity,
  readContractV2,
  requestServiceProblems,
  serviceRowsFor,
  usecaseIdsWithDef,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import { nodeDisclosure } from '/_102021_/l2/helpers/l1Defs/disclosure.js';
import { outputViews, type RequestOutputView } from '/_102021_/l2/helpers/l1Defs/requestTree.js';
import type { D1ActiveStatus } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { worstOfList } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import {
  D1_CONTROLLER_VERSION,
  ENUMERATION_REASON,
  ENUMERATION_SOURCE,
  HANDLER_STEPS,
  type D1ControllerBuild,
  type D1ControllerEnumeration,
  type D1ControllerGrant,
  type D1ControllerItem,
  type D1ControllerNormalization,
  type D1ControllerPage,
  type D1ControllerProblem,
  type D1ControllerRelationship,
  type D1ControllerRemoval,
  type D1ControllerRequest,
  type D1ControllerRoute,
  type D1ExistingHandler,
  type D1RequestServiceItem,
  type D1HandlerBinding,
  type D1ScopeGrantPlan,
  type D1ServiceRow,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

/**
 * One controller per page. Ids, route strings and contract symbols are copied.
 * An operation with no grant is an error. There is no public fallback.
 */
export function buildD1Controllers(request: D1ControllerRequest): D1ControllerBuild {
  const problems: D1ControllerProblem[] = [];
  const normalizations: D1ControllerNormalization[] = [];
  const enumerations = unconsumedEnumerations(request);
  if (!request.accessRead) {
    error(problems, 'ACCESS_UNREADABLE', 'access', 'Access artifact did not parse. No grant was assumed.');
  }
  if (!request.actorsRead) {
    error(problems, 'ACTORS_UNREADABLE', 'needs', 'Page actors did not parse. No actor was assumed.');
  }
  const services = requestServices(request, problems);
  const byPage = new Map<string, D1HandlerBinding[]>();
  for (const service of services) {
    for (const row of service.requests) {
      const route: D1ControllerRoute = {
        route: row.route,
        page: service.pageId,
        kind: row.kind,
        usecaseRef: '',
        status: routeStatus(request, row.uses),
      };
      const binding = bindAdapter(request, route, row, problems);
      const list = byPage.get(service.pageId) || [];
      list.push(binding);
      byPage.set(service.pageId, list);
    }
  }

  const controllers: D1ControllerItem[] = [];
  for (const [pageId, handlers] of byPage) {
    const page = pageFor(request, pageId);
    handlers.sort((left, right) => left.route.localeCompare(right.route));
    const staleRoutes = staleOf(request, pageId, liveRoutes(pageId, services), problems);
    const item: D1ControllerItem = { pageId, defPath: page.defPath, handlers, staleRoutes, definition: null };
    if (!isSafeToken(pageId)) {
      error(problems, 'PAGE_ID', pageId, `Page ${pageId} is not a safe token. No controller file was named.`);
    }
    controllers.push(item);
  }

  const ok = !problems.some(problem => problem.severity === 'error');
  const before = problems.length;
  if (ok) {
    for (const item of controllers) fillDefinition(request, item, problems);
  }
  const stillOk = ok && problems.length === before;
  const emit = stillOk ? emitItems(request, controllers, problems) : [];
  if (stillOk) emit.push(...emitServices(request, services, problems));
  const emitted = stillOk && !problems.some(problem => problem.severity === 'error') ? emit : [];
  return finish(request, emitted.length > 0 && !problems.some(problem => problem.severity === 'error'), enumerations, controllers, services, problems, normalizations, emitted);
}

/** A grant whose actor is not on this page is a union. The caller does not add it. */
export function grantUnionIssues(
  pageActors: readonly string[],
  grantIds: readonly string[],
  grants: readonly D1ControllerGrant[],
): string[] {
  const actors = new Set(pageActors);
  const issues: string[] = [];
  for (const grantId of grantIds) {
    const grant = grants.find(item => item.grantId === grantId);
    if (grant && !actors.has(grant.actorRef)) issues.push(grantId);
  }
  return issues;
}

/** v2 page: the handler calls one request-service function. It does not name a usecase. */
function bindAdapter(
  request: D1ControllerRequest,
  route: D1ControllerRoute,
  row: D1ServiceRow,
  problems: D1ControllerProblem[],
): D1HandlerBinding {
  const path = route.route;
  const page = pageFor(request, route.page);
  const kind = mapKind(route.kind);
  const contract = request.contracts.find(item => item.pageId === route.page);
  const contractPath = contract?.path || `l2/${request.moduleName}/web/contracts/${route.page}.defs.ts`;
  const contractInterface = contract ? contractInterfaceName(contract.source) : '';
  const serviceFunction = row.route;
  if (!kind) error(problems, 'KIND', path, `Route ${path} kind ${route.kind} is not query or command.`);
  if (!contractInterface) {
    error(problems, 'INVALID_REF', path, `Route ${path} has no contract interface.`);
  }
  const entities: string[] = [];
  for (const usecaseId of row.uses) {
    const usecase = request.usecases.find(item => item.usecaseId === usecaseId);
    if (usecase && !entities.includes(usecase.entity)) entities.push(usecase.entity);
  }
  // d1_65: an aggregate no entity owns (a `computed` node without `entity`) takes its authority from the route's own
  // grants that exist in the L4 access artifact. With no entity output those are the authority of the route.
  const ownerless = row.output.flatMap(node => node.kind === 'computed' && !node.entity ? [node.path] : []);
  const routeGrants = ownerless.length ? routeGrantIds(request, contract?.source || '', path, page, problems) : [];
  const matched: string[] = entities.length === 0 ? [...routeGrants] : [];
  for (const entity of entities) {
    for (const grant of matchingGrants(page.actors, entity, request.grants)) {
      if (!matched.includes(grant.grantId)) matched.push(grant.grantId);
    }
  }
  const kept = finishGrants(
    request,
    route,
    kind,
    matched,
    existing => existing.serviceFunction === serviceFunction,
    problems,
  );
  // A route that also has entity outputs keeps the entity authority; the aggregate needs one of those grants to be a
  // valid route grant too.
  if (ownerless.length && !kept.grantIds.some(grantId => routeGrants.includes(grantId))) {
    error(problems, 'NO_AUTHORITY', path, `NO_AUTHORITY: ${path} ${ownerless.join(', ')} has no entity, and no route grant valid in the L4 access artifact covers it. No permissive fallback was applied.`);
  }
  const ownerlessOnly = ownerless.length > 0 && entities.length === 0;
  if (ownerlessOnly) {
    // No entity to cover: the authority is the route grants checked above.
  } else if (!kept.preserved) {
    const uncovered = entities.filter(entity => matchingGrants(page.actors, entity, request.grants).length === 0);
    const missing = entities.length === 0 ? [path] : uncovered;
    for (const entity of missing) {
      error(problems, 'AUTHORITY_REQUIRED', path, `Operation ${entity} on ${path} has no authority. No permissive fallback was applied.`);
    }
  } else if (kept.grantIds.length === 0) {
    error(problems, 'AUTHORITY_REQUIRED', path, `Operation ${path} has no authority. No permissive fallback was applied.`);
  }
  const attached = grantsOnPage(page, kept.grantIds, request);
  const projected: string[] = [];
  for (const view of outputViews(row.output)) {
    const disclosed = discloseProjection(view, attached, entity => request.ontology?.[entity]);
    projected.push(...view.fields);
    if (disclosed.blocked.length || disclosed.opaque.length) {
      error(problems, 'DISCLOSURE', path, disclosureMessage(path, disclosed.blocked, disclosed.opaque));
    }
    for (const field of disclosed.computed) error(problems, 'COMPUTED_NOT_DISCLOSED', path, `COMPUTED_NOT_DISCLOSED: ${path} ${field}`);
  }
  return {
    route: route.route,
    pageId: route.page,
    kind: kind || 'query',
    usecaseId: '',
    functionName: '',
    serviceFunction,
    contractPath,
    contractInterface,
    inputSymbol: '',
    outputSymbol: '',
    status: route.status,
    preserved: kept.preserved,
    grantIds: kept.grantIds,
    projection: { shape: projected.length ? 'object' : 'unresolved', fields: projected, envelope: 'passthrough' },
    session: 'verified',
    steps: HANDLER_STEPS,
    scopePlan: scopePlans(attached, request.relationships, problems, path),
  };
}

/**
 * The grants a route declares (`access.grants`) that the L4 access artifact has, for an actor of this page and of the
 * route. L4 stays the source: a route grant it does not have, or of an actor that does not match, is an error here
 * (`CONTRACT_ACCESS_DIVERGENT`). The actor list is compared only when the parser split it into ids (as input20 does);
 * a grant id that is not an id is refused.
 */
function routeGrantIds(
  request: D1ControllerRequest,
  source: string,
  path: string,
  page: D1ControllerPage,
  problems: D1ControllerProblem[],
): string[] {
  const access = readContractV2(source)?.routes.find(item => item.route === path)?.access;
  if (!access) return [];
  const actorsSplit = access.actors.every(actor => isSafeToken(actor));
  const valid: string[] = [];
  for (const grantId of access.grants) {
    const grant = isSafeToken(grantId) ? request.grants.find(item => item.grantId === grantId) : undefined;
    if (!grant) {
      error(problems, 'CONTRACT_ACCESS_DIVERGENT', path, `CONTRACT_ACCESS_DIVERGENT: ${path} grant ${grantId} is not in the L4 access artifact. L4 stays the source.`);
      continue;
    }
    if (!page.actors.includes(grant.actorRef) || (actorsSplit && !access.actors.includes(grant.actorRef))) {
      error(problems, 'CONTRACT_ACCESS_DIVERGENT', path, `CONTRACT_ACCESS_DIVERGENT: ${path} grant ${grantId} is for actor ${grant.actorRef}, who is not an actor of this route and page. L4 stays the source.`);
      continue;
    }
    if (!valid.includes(grantId)) valid.push(grantId);
  }
  return valid;
}

function grantsOnPage(
  page: D1ControllerPage,
  grantIds: readonly string[],
  request: D1ControllerRequest,
): D1ControllerGrant[] {
  return grantIds.flatMap(grantId => {
    const grant = request.grants.find(item => item.grantId === grantId);
    return grant && page.actors.includes(grant.actorRef) ? [grant] : [];
  });
}

function finishGrants(
  request: D1ControllerRequest,
  route: D1ControllerRoute,
  kind: 'query' | 'command' | '',
  matched: readonly string[],
  sameHandler: (existing: D1ExistingHandler) => boolean,
  problems: D1ControllerProblem[],
): { grantIds: string[]; preserved: boolean } {
  const path = route.route;
  const page = pageFor(request, route.page);
  let grantIds = [...matched];
  let preserved = false;
  if (route.status === 'done') {
    const existing = existingHandler(request, route);
    if (!existing) {
      error(problems, 'HANDLER_MISSING', path, `Done route ${path} has no handler to keep.`);
    } else if (!sameHandler(existing) || existing.kind !== (kind || 'query')) {
      error(problems, 'STALE_ARTIFACT', path, `Done route ${path} does not match the handler on disk.`);
    } else {
      preserved = true;
      grantIds = [...existing.grantIds];
      const union = grantUnionIssues(page.actors, grantIds, request.grants);
      if (union.length) {
        error(problems, 'GRANT_UNION', path, `Done route ${path} keeps a grant of another page: ${union.join(', ')}.`);
      }
      for (const grantId of grantIds) {
        if (!request.grants.some(item => item.grantId === grantId)) {
          error(problems, 'INVALID_REF', path, `Grant ${grantId} on ${path} is not in the access artifact.`);
        }
      }
    }
  } else {
    const union = grantUnionIssues(page.actors, grantIds, request.grants);
    if (union.length) {
      error(problems, 'GRANT_UNION', path, `Route ${path} would take a grant of another page: ${union.join(', ')}.`);
    }
  }
  return { grantIds, preserved };
}

/**
 * A handler is done only when every usecase it calls is done (the rule input20 uses for the
 * controller file). A request that calls no selected usecase is new.
 */
function routeStatus(request: D1ControllerRequest, uses: readonly string[]): D1ActiveStatus {
  const statuses = uses.flatMap(usecaseId => {
    const usecase = request.usecases.find(item => item.usecaseId === usecaseId);
    return usecase ? [usecase.status] : [];
  });
  return statuses.length === uses.length && uses.length > 0 ? worstOfList(statuses) : 'toCreate';
}

function liveRoutes(pageId: string, services: readonly D1RequestServiceItem[]): Set<string> {
  const rows = services.find(item => item.pageId === pageId)?.requests || [];
  return new Set(rows.map(row => row.route));
}

function matchingGrants(actors: readonly string[], entity: string, grants: readonly D1ControllerGrant[]): D1ControllerGrant[] {
  const allowed = new Set(actors);
  return grants.filter(grant => allowed.has(grant.actorRef) && grant.entityRefs.includes(entity));
}

/**
 * Each projected path goes through the shared rule (`helpers/l1Defs/disclosure.ts`), the same one
 * the M1 request service applies, on the node the derived route classified (d1_63): an entity path by its ontology
 * path and the grants about that entity, a calculated value only under `fullRecord`, a paging key always.
 * `Entity.details.identification` covers that branch and its descendants, not the parent `details` nor a sibling.
 * The projection keeps every declared path; a refused one is reported.
 */
function discloseProjection(
  output: RequestOutputView,
  grants: readonly D1ControllerGrant[],
  entityDefinition: (entity: string) => unknown,
): { blocked: string[]; opaque: string[]; computed: string[] } {
  const blocked: string[] = [];
  const opaque: string[] = [];
  const computed: string[] = [];
  for (const node of output.disclosure) {
    const verdict = nodeDisclosure(grants, node, entityDefinition);
    if (verdict === 'blocked') blocked.push(node.field);
    else if (verdict === 'carrier') opaque.push(node.field);
    else if (verdict === 'computed') computed.push(node.field);
  }
  return { blocked, opaque, computed };
}

function disclosureMessage(route: string, blocked: readonly string[], opaque: readonly string[]): string {
  const parts: string[] = [];
  if (blocked.length) {
    parts.push(`Route ${route} projects ${blocked.join(', ')}, which this page's grants do not disclose.`);
  }
  if (opaque.length) {
    parts.push(`Route ${route} projects ${opaque.join(', ')}. A grant names a sub-path, but the nested shape could not be read, so the container was not released.`);
  }
  return parts.join(' ');
}

function scopePlans(
  grants: readonly D1ControllerGrant[],
  relationships: readonly D1ControllerRelationship[],
  problems: D1ControllerProblem[],
  path: string,
): D1ScopeGrantPlan[] {
  return grants.map(grant => {
    const rels = relationships
      .filter(rel => grant.entityRefs.includes(rel.from))
      .map(rel => ({ relationshipId: rel.relationshipId, from: rel.from, to: rel.to, field: rel.field }));
    let pending = '';
    if (grant.anchorEntity && !grant.entityRefs.includes(grant.anchorEntity)) {
      const others = relationships.filter(rel => rel.required && grant.entityRefs.includes(rel.from) && rel.to && rel.to !== grant.anchorEntity);
      if (others.length) {
        pending = 'ACCESS_ANCHOR';
        review(
          problems,
          'ACCESS_ANCHOR',
          path,
          `Grant ${grant.grantId} anchors on ${grant.anchorEntity}. Relationship ${others.map(rel => rel.relationshipId).join(', ')} binds another required target.`,
        );
      }
    }
    return {
      grantId: grant.grantId,
      actorRef: grant.actorRef,
      entityRefs: [...grant.entityRefs],
      disclosure: grant.disclosure,
      allowedFields: [...grant.allowedFields],
      anchorEntity: grant.anchorEntity,
      relationships: rels,
      pending,
      emittedBy: 'support70' as const,
    };
  });
}

function existingHandler(request: D1ControllerRequest, route: D1ControllerRoute): D1ExistingHandler | null {
  const page = request.existing.find(item => item.pageId === route.page);
  if (!page || page.unreadable) return null;
  return page.handlers.find(item => item.route === route.route) || null;
}

function staleOf(
  request: D1ControllerRequest,
  pageId: string,
  selected: ReadonlySet<string>,
  problems: D1ControllerProblem[],
): string[] {
  const existing = request.existing.find(item => item.pageId === pageId);
  if (!existing) return [];
  if (existing.unreadable) {
    error(problems, 'STALE_ARTIFACT', pageId, `Controller ${pageId} did not parse. Nothing was overwritten.`);
    return [];
  }
  const removed = new Set((request.removedRoutes || []).map(route => route.route));
  const extra = existing.routes.filter(route => !selected.has(route) && !removed.has(route));
  for (const route of extra) {
    error(problems, 'STALE_ARTIFACT', pageId, `Controller ${pageId} still has route ${route}, which is not selected.`);
  }
  return extra;
}

function requestServices(request: D1ControllerRequest, problems: D1ControllerProblem[]): D1RequestServiceItem[] {
  const selected = request.serviceRequests || [];
  const knownFields = fieldsByEntity(request.ontology || {});
  const usecaseIds = usecaseIdsWithDef(request);
  const services: D1RequestServiceItem[] = [];
  for (const contract of request.contracts) {
    const parsed = readContractV2(contract.source);
    if (!parsed || parsed.pageId !== contract.pageId) {
      error(problems, 'CONTRACT_UNPARSED', contract.path, parsed
        ? `L2 contract ${contract.path} names page ${parsed.pageId}, not ${contract.pageId}. No handler was planned.`
        : `L2 contract ${contract.path} is not a readable v2 contract. No handler was planned.`);
      continue;
    }
    const pageSelected = selected.filter(item => item.pageId === contract.pageId);
    const selectedCounts = new Map<string, number>();
    for (const item of pageSelected) selectedCounts.set(item.route, (selectedCounts.get(item.route) || 0) + 1);
    const built = serviceRowsFor(contract.pageId, parsed, pageSelected);
    problems.push(...built.problems);
    const pageProblems = requestServiceProblems({
      pageId: contract.pageId,
      contractRoutes: built.routes,
      requests: built.rows,
      usecaseIds,
      fieldsByEntity: knownFields,
      selectedCounts,
    });
    problems.push(...pageProblems);
    const defPath = requestServiceDefPath(request.moduleName, contract.pageId);
    const item: D1RequestServiceItem = { pageId: contract.pageId, defPath, requests: built.rows, definition: null };
    if (!isSafeToken(contract.pageId)) {
      error(problems, 'PAGE_ID', contract.pageId, `Page ${contract.pageId} is not a safe token. No request service file was named.`);
    }
    const blocked = [...built.problems, ...pageProblems].some(problem => problem.severity === 'error') || !isSafeToken(contract.pageId);
    if (!blocked) fillService(request, item, problems);
    services.push(item);
  }
  return services;
}

function fillService(request: D1ControllerRequest, item: D1RequestServiceItem, problems: D1ControllerProblem[]): void {
  const usecaseIds = [...new Set(item.requests.flatMap(row => row.uses))].sort();
  const dependencies: string[] = [];
  for (const usecaseId of usecaseIds) {
    const usecase = request.usecases.find(entry => entry.usecaseId === usecaseId);
    if (!usecase?.defPath) continue;
    dependencies.push(qualifyDefPath(request.project, usecase.defPath));
  }
  dependencies.sort();
  const definition = pendingDefinition('requestService', item.pageId, request.moduleName, {
    pageId: item.pageId,
    requests: item.requests,
  }, dependencies);
  const issues = definitionIssues(definition);
  if (issues.length) {
    error(problems, 'DEFINITION', item.pageId, issues[0]);
    return;
  }
  item.definition = definition;
}

function emitServices(
  request: D1ControllerRequest,
  services: readonly D1RequestServiceItem[],
  problems: D1ControllerProblem[],
): D1ControllerBuild['emit'] {
  const out: D1ControllerBuild['emit'] = [];
  for (const item of services) {
    if (!item.definition) continue;
    const usecaseIds = [...new Set(item.requests.flatMap(row => row.uses))].sort();
    const dependsOn: string[] = [];
    const dependsFiles: string[] = [];
    for (const usecaseId of usecaseIds) {
      const usecase = request.usecases.find(entry => entry.usecaseId === usecaseId);
      if (!usecase?.defPath) continue;
      dependsOn.push(pipelineId(request.project, request.moduleName, 'usecase', usecaseId));
      dependsFiles.push(qualifyDefPath(request.project, usecase.defPath));
    }
    const qualified = qualifyDefPath(request.project, item.defPath);
    const pipeline: D1PipelineItem = {
      id: pipelineId(request.project, request.moduleName, 'requestService', item.pageId),
      type: 'requestService',
      defPath: qualified,
      outputPath: futureOutputPath(qualified),
      outputAvailability: 'future',
      dependsFiles,
      dependsOn,
      skills: skillPaths('requestService'),
      routes: item.requests.map(row => row.route),
    };
    item.definition = stampDefinition(item.definition, pipeline.defPath, pipeline.dependsFiles);
    const rendered = renderDefinition(item.definition, pipeline.defPath);
    if ('issues' in rendered) {
      error(problems, 'DEFINITION', item.defPath, rendered.issues[0] || 'Definition did not render.');
      item.definition = null;
      continue;
    }
    out.push({ definition: item.definition, pipeline: [pipeline] });
  }
  return out;
}

function fillDefinition(request: D1ControllerRequest, item: D1ControllerItem, problems: D1ControllerProblem[]): void {
  if (item.handlers.some(handler => handler.grantIds.length === 0)) return;
  const data = {
    pageId: item.pageId,
    handlers: item.handlers.map(handler => ({
      route: handler.route,
      kind: handler.kind,
      grantIds: handler.grantIds,
      serviceFunction: handler.serviceFunction,
      contractPath: handler.contractPath,
      contractInterface: handler.contractInterface,
    })),
  };
  const definition = pendingDefinition('httpController', item.pageId, request.moduleName, data);
  const issues = definitionIssues(definition);
  if (issues.length) {
    error(problems, 'DEFINITION', item.pageId, issues[0]);
    return;
  }
  item.definition = definition;
}

function emitItems(
  request: D1ControllerRequest,
  items: readonly D1ControllerItem[],
  problems: D1ControllerProblem[],
): D1ControllerBuild['emit'] {
  const out: D1ControllerBuild['emit'] = [];
  for (const item of items) {
    if (!item.definition) continue;
    const pipeline = pipelineFor(request, item);
    const leaked = pipeline.dependsFiles.filter(file => file.includes('/l2/') || file.includes('/adapters/persistence/') || file.includes('/layer_3_'));
    if (leaked.length) {
      error(problems, 'RUNTIME_IMPORT', item.pageId, `Controller depends on ${leaked[0]}.`);
      continue;
    }
    item.definition = stampDefinition(item.definition, pipeline.defPath, pipeline.dependsFiles);
    const rendered = renderDefinition(item.definition, pipeline.defPath);
    if ('issues' in rendered) {
      error(problems, 'DEFINITION', item.defPath, rendered.issues[0] || 'Definition did not render.');
      continue;
    }
    if (/\bimport\b/.test(rendered.source)) {
      error(problems, 'RUNTIME_IMPORT', item.pageId, 'Controller source imports a module.');
      continue;
    }
    out.push({ definition: item.definition, pipeline: [pipeline] });
  }
  return out;
}

function pipelineFor(request: D1ControllerRequest, item: D1ControllerItem): D1PipelineItem {
  const qualified = qualifyDefPath(request.project, item.defPath);
  const dependsOn: string[] = [];
  const dependsFiles: string[] = [];
  const serviceLogical = requestServiceDefPath(request.moduleName, item.pageId);
  dependsOn.push(pipelineId(request.project, request.moduleName, 'requestService', item.pageId));
  dependsFiles.push(qualifyDefPath(request.project, serviceLogical));
  const scopeLogical = `l1/${request.moduleName}/layer_2_application/scope/accessScope.defs.ts`;
  dependsOn.push(pipelineId(request.project, request.moduleName, 'accessScope', 'accessScope'));
  dependsFiles.push(qualifyDefPath(request.project, scopeLogical));
  // A route with grants resolves its actor through the authority map (support70 writes it).
  if (item.handlers.some(handler => handler.grantIds.length > 0)) {
    const authorityLogical = `l1/${request.moduleName}/layer_1_external/auth/authorityMap.defs.ts`;
    dependsOn.push(pipelineId(request.project, request.moduleName, 'authorityMap', 'authorityMap'));
    dependsFiles.push(qualifyDefPath(request.project, authorityLogical));
  }
  return {
    id: pipelineId(request.project, request.moduleName, 'httpController', item.pageId),
    type: 'httpController',
    defPath: qualified,
    outputPath: futureOutputPath(qualified),
    outputAvailability: 'future',
    dependsFiles,
    dependsOn,
    skills: skillPaths('httpController'),
    routes: item.handlers.map(handler => handler.route),
  };
}

function pageFor(request: D1ControllerRequest, pageId: string): D1ControllerPage {
  return request.pages.find(item => item.pageId === pageId) || {
    pageId,
    actors: [],
    defPath: `l1/${request.moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`,
  };
}

function mapKind(kind: string): 'query' | 'command' | '' {
  if (kind === 'qry' || kind === 'query') return 'query';
  if (kind === 'cmd' || kind === 'command') return 'command';
  return '';
}

function unconsumedEnumerations(request: D1ControllerRequest): D1ControllerEnumeration[] {
  return request.enumerations.map(item => ({
    entityId: item.entityId,
    path: item.path,
    values: [...item.values],
    consumed: false as const,
    source: ENUMERATION_SOURCE,
    reason: ENUMERATION_REASON,
  }));
}

function finish(
  request: D1ControllerRequest,
  ok: boolean,
  enumerations: D1ControllerEnumeration[],
  controllers: D1ControllerItem[],
  services: D1RequestServiceItem[],
  problems: D1ControllerProblem[],
  normalizations: D1ControllerNormalization[],
  emit: D1ControllerBuild['emit'],
): D1ControllerBuild {
  if (!normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED')) {
    normalizations.push({
      code: 'ENUMERATIONS_NOT_CONSUMED',
      path: ENUMERATION_SOURCE,
      detail: enumerations.length
        ? `${enumerations.length} enum values stay on the domain draft. controllers60 does not copy them.`
        : 'The domain draft has no enumerations. controllers60 did not invent any.',
    });
  }
  sortInPlace(enumerations, item => `${item.entityId}\u0000${item.path}`);
  sortInPlace(problems, item => `${item.path}\u0000${item.code}\u0000${item.message}`);
  sortInPlace(normalizations, item => `${item.path}\u0000${item.code}`);
  controllers.sort((left, right) => left.pageId.localeCompare(right.pageId));
  services.sort((left, right) => left.pageId.localeCompare(right.pageId));
  emit.sort((left, right) => (left.pipeline[0]?.defPath || '').localeCompare(right.pipeline[0]?.defPath || ''));
  const removals = controllerRemovals(request, controllers);
  return {
    schemaVersion: D1_CONTROLLER_VERSION,
    project: request.project,
    moduleName: request.moduleName,
    llmCalls: 0,
    ok,
    measuredRoutes: (request.serviceRequests || []).length,
    measuredPages: new Set((request.serviceRequests || []).map(item => item.pageId)).size,
    enumerations,
    controllers,
    services,
    problems,
    normalizations,
    emit,
    removals,
  };
}

function controllerRemovals(request: D1ControllerRequest, controllers: readonly D1ControllerItem[]): D1ControllerRemoval[] {
  const live = new Set(controllers.filter(item => item.handlers.length > 0).map(item => logicalController(item.defPath)));
  const out: D1ControllerRemoval[] = [];
  for (const route of request.removedRoutes || []) {
    if (!route.defPath) continue;
    const logical = logicalController(route.defPath);
    if (live.has(logical) || out.some(item => logicalController(item.defPath) === logical)) continue;
    const qualified = route.defPath.startsWith('_') ? route.defPath : qualifyDefPath(request.project, route.defPath);
    out.push({
      defPath: route.defPath,
      contentHash: route.contentHash,
      outputTs: [futureOutputPath(qualified)].filter(path => path.endsWith('.ts')),
    });
  }
  return out;
}

function logicalController(defPath: string): string {
  return defPath.replace(/^_\d+_\/l1\//, 'l1/');
}

function error(problems: D1ControllerProblem[], code: string, path: string, message: string): void {
  problems.push({ severity: 'error', code, path, message });
}

function review(problems: D1ControllerProblem[], code: string, path: string, message: string): void {
  problems.push({ severity: 'review', code, path, message });
}

function sortInPlace<T>(items: T[], key: (item: T) => string): void {
  items.sort((left, right) => key(left).localeCompare(key(right)));
}
