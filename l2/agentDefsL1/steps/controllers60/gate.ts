/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/gate.ts" enhancement="_blank"/>

import {
  D1_DEFINITION_SCHEMA,
  definitionIssues,
  type D1Definition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  futureOutputPath,
  pipelineId,
  qualifyDefPath,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import {
  readContractAst,
  type D1ContractAst,
  type D1ContractField,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
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
  type D1ControllerRequest,
  type D1ControllerRoute,
  type D1ExistingHandler,
  type D1HandlerBinding,
  type D1ScopeGrantPlan,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

const FORM_IDENTITY = new Set(['actorId', 'userId', 'sessionId', 'scope']);

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
  noteDuplicateRoutes(request, problems);

  const astByPage = new Map<string, D1ContractAst>();
  const byPage = new Map<string, D1HandlerBinding[]>();
  for (const route of request.routes) {
    const binding = bindRoute(request, route, astFor(request, astByPage, route.page), problems);
    const list = byPage.get(route.page) || [];
    list.push(binding);
    byPage.set(route.page, list);
  }

  const controllers: D1ControllerItem[] = [];
  for (const [pageId, handlers] of byPage) {
    const page = pageFor(request, pageId);
    handlers.sort((left, right) => left.route.localeCompare(right.route));
    const staleRoutes = staleOf(request, pageId, problems);
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
  const emitted = stillOk && !problems.some(problem => problem.severity === 'error') ? emit : [];
  return finish(request, emitted.length > 0 && !problems.some(problem => problem.severity === 'error'), enumerations, controllers, problems, normalizations, emitted);
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

function bindRoute(
  request: D1ControllerRequest,
  route: D1ControllerRoute,
  ast: D1ContractAst,
  problems: D1ControllerProblem[],
): D1HandlerBinding {
  const path = route.route;
  const page = pageFor(request, route.page);
  const usecase = request.usecases.find(item => item.usecaseId === route.usecaseRef);
  const kind = mapKind(route.kind);
  const contract = request.contracts.find(item => item.pageId === route.page);
  const contractPath = contract?.path || `l2/${request.moduleName}/web/contracts/${route.page}.defs.ts`;
  let inputSymbol = '';
  let outputSymbol = '';
  let shape: D1HandlerBinding['projection']['shape'] = 'unresolved';
  let fields: string[] = [];

  if (!kind) {
    error(problems, 'KIND', path, `Route ${path} kind ${route.kind} is not query or command.`);
  }
  if (!usecase || !usecase.functionName) {
    error(problems, 'INVALID_REF', path, `Route ${path} references ${route.usecaseRef || '(missing usecase)'}, which has no function.`);
  }

  if (ast.assertions.includes(route.route)) {
    error(problems, 'TYPE_ASSERTION', path, `Route ${path} is bound by a type assertion. The projection lists the output fields.`);
  } else {
    const found = ast.bindings.filter(item => item.route === route.route);
    if (found.length !== 1) {
      error(problems, 'CONTRACT_UNBOUND', path, `Route ${path} has no contract binding. The route was kept.`);
    } else {
      inputSymbol = found[0].input;
      outputSymbol = found[0].output;
      const resolved = resolveSymbol(ast, outputSymbol);
      if (!resolved) {
        error(problems, 'INVALID_REF', path, `Route ${path} output symbol ${outputSymbol} does not resolve to one type.`);
      } else {
        shape = resolved.shape;
        fields = resolved.fields.map(field => field.name);
      }
      if (inputSymbol) {
        const input = resolveSymbol(ast, inputSymbol);
        if (!input) {
          error(problems, 'INVALID_REF', path, `Route ${path} input symbol ${inputSymbol} does not resolve to one type.`);
        } else {
          const identity = input.fields.find(field => FORM_IDENTITY.has(field.name));
          if (identity) {
            error(problems, 'FORM_IDENTITY', path, `Form field ${identity.name} is not authentication. The session stays verified.`);
          }
        }
      }
    }
  }

  const matched = usecase ? matchingGrants(page.actors, usecase.entity, request.grants) : [];
  let grantIds = matched.map(item => item.grantId);
  let preserved = false;
  if (route.status === 'done') {
    const existing = existingHandler(request, route);
    if (!existing) {
      error(problems, 'HANDLER_MISSING', path, `Done route ${path} has no handler to keep.`);
    } else if (existing.usecaseId !== route.usecaseRef || existing.kind !== (kind || 'query')) {
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

  if (usecase && grantIds.length === 0) {
    error(problems, 'AUTHORITY_REQUIRED', path, `Operation ${route.usecaseRef} on ${path} has no authority. No permissive fallback was applied.`);
  }

  const attached = grantIds.flatMap(grantId => {
    const grant = request.grants.find(item => item.grantId === grantId);
    return grant && page.actors.includes(grant.actorRef) ? [grant] : [];
  });
  const blocked = fields.filter(field => !fieldAllowed(usecase?.entity || '', field, attached));
  if (usecase && fields.length && blocked.length) {
    error(problems, 'DISCLOSURE', path, `Route ${path} projects ${blocked.join(', ')}, which this page's grants do not disclose.`);
  }

  return {
    route: route.route,
    pageId: route.page,
    kind: kind || 'query',
    usecaseId: route.usecaseRef,
    functionName: usecase?.functionName || '',
    contractPath,
    inputSymbol,
    outputSymbol,
    status: route.status,
    preserved,
    grantIds,
    projection: { shape, fields, envelope: 'passthrough' },
    session: 'verified',
    steps: HANDLER_STEPS,
    scopePlan: scopePlans(attached, request.relationships, problems, path),
  };
}

function matchingGrants(actors: readonly string[], entity: string, grants: readonly D1ControllerGrant[]): D1ControllerGrant[] {
  const allowed = new Set(actors);
  return grants.filter(grant => allowed.has(grant.actorRef) && grant.entityRefs.includes(entity));
}

function fieldAllowed(entity: string, field: string, grants: readonly D1ControllerGrant[]): boolean {
  return grants.some(grant => {
    if (grant.disclosure === 'fullRecord') return true;
    return grant.allowedFields.some(item => item === field || item === `${entity}.${field}` || (item.startsWith(`${entity}.`) && lastSegment(item) === field));
  });
}

function lastSegment(path: string): string {
  const at = path.lastIndexOf('.');
  return at < 0 ? path : path.slice(at + 1);
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

function resolveSymbol(ast: D1ContractAst, name: string, depth = 0): { shape: 'array' | 'object'; fields: D1ContractField[] } | null {
  if (!name || depth > 4) return null;
  const found = ast.symbols.filter(item => item.name === name);
  if (found.length !== 1) return null;
  const symbol = found[0];
  if (symbol.shape === 'array' && symbol.fields.length === 0 && symbol.element) {
    const inner = resolveSymbol(ast, symbol.element, depth + 1);
    if (!inner) return null;
    return { shape: 'array', fields: inner.fields };
  }
  if (symbol.shape === 'array' && symbol.fields.length === 0) return null;
  return { shape: symbol.shape, fields: symbol.fields };
}

function existingHandler(request: D1ControllerRequest, route: D1ControllerRoute): D1ExistingHandler | null {
  const page = request.existing.find(item => item.pageId === route.page);
  if (!page || page.unreadable) return null;
  return page.handlers.find(item => item.route === route.route) || null;
}

function staleOf(request: D1ControllerRequest, pageId: string, problems: D1ControllerProblem[]): string[] {
  const existing = request.existing.find(item => item.pageId === pageId);
  if (!existing) return [];
  if (existing.unreadable) {
    error(problems, 'STALE_ARTIFACT', pageId, `Controller ${pageId} did not parse. Nothing was overwritten.`);
    return [];
  }
  const selected = new Set(request.routes.filter(route => route.page === pageId).map(route => route.route));
  const extra = existing.routes.filter(route => !selected.has(route));
  for (const route of extra) {
    error(problems, 'STALE_ARTIFACT', pageId, `Controller ${pageId} still has route ${route}, which is not selected.`);
  }
  return extra;
}

function noteDuplicateRoutes(request: D1ControllerRequest, problems: D1ControllerProblem[]): void {
  const seen = new Map<string, number>();
  for (const route of request.routes) seen.set(route.route, (seen.get(route.route) || 0) + 1);
  for (const [route, count] of [...seen.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (count > 1) error(problems, 'DUPLICATE_ROUTE', route, `Route ${route} is selected ${count} times.`);
  }
}

function fillDefinition(request: D1ControllerRequest, item: D1ControllerItem, problems: D1ControllerProblem[]): void {
  if (item.handlers.some(handler => handler.grantIds.length === 0)) return;
  const data = {
    pageId: item.pageId,
    handlers: item.handlers.map(handler => ({
      route: handler.route,
      kind: handler.kind,
      usecaseId: handler.usecaseId,
      grantIds: handler.grantIds,
    })),
  };
  const definition: D1Definition = {
    schemaVersion: D1_DEFINITION_SCHEMA,
    artifactType: 'httpController',
    artifactId: item.pageId,
    moduleName: request.moduleName,
    data,
  };
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
    const rendered = renderDefinition(item.definition, [pipeline]);
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
  const usecaseIds = [...new Set(item.handlers.map(handler => handler.usecaseId).filter(Boolean))].sort();
  const dependsOn: string[] = [];
  const dependsFiles: string[] = [];
  for (const usecaseId of usecaseIds) {
    const usecase = request.usecases.find(entry => entry.usecaseId === usecaseId);
    if (!usecase?.defPath) continue;
    dependsOn.push(pipelineId(request.project, request.moduleName, 'usecase', usecaseId));
    dependsFiles.push(qualifyDefPath(request.project, usecase.defPath));
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

function astFor(request: D1ControllerRequest, cache: Map<string, D1ContractAst>, pageId: string): D1ContractAst {
  const cached = cache.get(pageId);
  if (cached) return cached;
  const contract = request.contracts.find(item => item.pageId === pageId);
  const ast = readContractAst(contract?.source || '', contract?.path || `${pageId}.defs.ts`);
  cache.set(pageId, ast);
  return ast;
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
  emit.sort((left, right) => (left.pipeline[0]?.defPath || '').localeCompare(right.pipeline[0]?.defPath || ''));
  return {
    schemaVersion: D1_CONTROLLER_VERSION,
    project: request.project,
    moduleName: request.moduleName,
    llmCalls: 0,
    ok,
    measuredRoutes: request.routes.length,
    measuredPages: new Set(request.routes.map(route => route.page)).size,
    enumerations,
    controllers,
    problems,
    normalizations,
    emit,
  };
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
