/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/gate.ts" enhancement="_blank"/>

import {
  D1_DEFINITION_SCHEMA,
  definitionIssues,
  type D1Definition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  cycleIssues,
  futureOutputPath,
  pipelineId,
  qualifyDefPath,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import type { D1ControllerGrant, D1ControllerRelationship } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import {
  D1_SUPPORT_VERSION,
  ENUMERATION_REASON,
  ENUMERATION_SOURCE,
  type D1PublicationItem,
  type D1PublicationLater,
  type D1RegistryAdapter,
  type D1ScopeResolution,
  type D1SupportAdapter,
  type D1SupportBuild,
  type D1SupportEmit,
  type D1SupportEnumeration,
  type D1SupportHelper,
  type D1SupportJoinStep,
  type D1SupportNormalization,
  type D1SupportProblem,
  type D1SupportRequest,
} from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';

const LIVE_ACTIONS = new Set(['create', 'update', 'recompose', 'preserve']);
const WRITE_ACTIONS = new Set(['create', 'update', 'recompose']);
const FORM_IDENTITY = new Set(['actorId', 'userId', 'sessionId', 'scope']);
const APPLICATION = new Set(['usecase', 'httpController', 'accessScope', 'authorityMap', 'repositoryPort']);

const SCOPE_PATH = (moduleName: string) => `l1/${moduleName}/layer_2_application/scope/accessScope.defs.ts`;
const AUTH_PATH = (moduleName: string) => `l1/${moduleName}/layer_1_external/auth/authorityMap.defs.ts`;
const REGISTRY_PATH = (moduleName: string) => `l1/${moduleName}/layer_1_external/adapters/persistence/registerRepositories.defs.ts`;

/**
 * Registry and scope, in two emitters. No model. Grants and anchors are copied.
 * A missing grant or an anchor with no explicit path is a diagnosis.
 * It is not rewritten as organization or public.
 */
export function buildD1Support(request: D1SupportRequest): D1SupportBuild {
  const problems: D1SupportProblem[] = [];
  const normalizations: D1SupportNormalization[] = [];
  const enumerations = unconsumedEnumerations(request);
  noteFormIdentity(request, problems);
  noteReceipts(request, problems);

  const scope = emitScope(request, problems);
  const registry = emitRegistry(request, problems, normalizations);
  noteInverted(request, scope.emit, registry.emit, problems);
  noteDag(request, scope.emit, registry.emit, registry.live, problems);

  const errored = problems.some(problem => problem.severity === 'error');
  const emit = errored ? [] : [...scope.emit, ...registry.emit];
  for (const part of emit) {
    const rendered = renderDefinition(part.definition, part.pipeline);
    if ('issues' in rendered) {
      error(problems, 'DEFINITION', part.pipeline[0]?.defPath || '', rendered.issues[0] || 'Definition did not render.');
    } else if (/\bimport\b/.test(rendered.source)) {
      error(problems, 'RUNTIME_IMPORT', part.pipeline[0]?.defPath || '', 'Support source imports a module.');
    }
  }
  const stillOk = !problems.some(problem => problem.severity === 'error');
  return finish(request, stillOk, enumerations, scope.resolutions, scope.helpers, scope.removedHelpers, registry.adapters, problems, normalizations, stillOk ? emit : []);
}

/** Access scope and the authority map. The map adds no grant. */
export function emitScope(
  request: D1SupportRequest,
  problems: D1SupportProblem[],
): { resolutions: D1ScopeResolution[]; helpers: D1SupportHelper[]; removedHelpers: string[]; emit: D1SupportEmit[] } {
  const known = new Set(request.grants.map(grant => grant.grantId));
  for (const grantId of [...request.citedGrantIds].sort()) {
    if (!grantId || known.has(grantId)) continue;
    review(
      problems,
      'GRANT_ABSENT',
      grantId,
      `Grant ${grantId} is not in the access artifact. No organization or public scope was created.`,
    );
  }

  const resolutions = request.grants.map(grant => resolveGrant(request, grant, problems));
  resolutions.sort((left, right) => left.grantId.localeCompare(right.grantId));
  const helpers = shareHelpers(resolutions);
  const liveIds = new Set(helpers.map(helper => helper.helperId));
  const removedHelpers = request.existingHelpers
    .map(helper => helper.helperId)
    .filter(helperId => helperId && !liveIds.has(helperId))
    .sort();

  const scopeGrants = resolutions.map(resolution => grantData(resolution));
  const scopeDefinition = definitionFor(request, 'accessScope', 'accessScope', {
    scopeId: 'accessScope',
    grants: scopeGrants,
  });
  const authDefinition = definitionFor(request, 'authorityMap', 'authorityMap', {
    mapId: 'authorityMap',
    entries: resolutions.map(resolution => ({ grantId: resolution.grantId, actorRef: resolution.actorRef })),
  });
  const scopePath = filePath(request, 'accessScope', SCOPE_PATH(request.moduleName));
  const authPath = filePath(request, 'authorityMap', AUTH_PATH(request.moduleName));
  const emit: D1SupportEmit[] = [];
  if (scopeGrants.length && writable(request, 'accessScope', problems, true)) {
    pushDefinition(emit, scopeDefinition, scopePipeline(request, scopePath), scopePath, problems);
  }
  if (resolutions.length && writable(request, 'authorityMap', problems, true)) {
    pushDefinition(emit, authDefinition, authPipeline(request, authPath, scopePath), authPath, problems);
  }
  return { resolutions, helpers, removedHelpers, emit };
}

/** Live adapters only. The registry depends on them. They do not depend on it. */
export function emitRegistry(
  request: D1SupportRequest,
  problems: D1SupportProblem[],
  normalizations: D1SupportNormalization[],
): { adapters: D1RegistryAdapter[]; live: D1SupportAdapter[]; emit: D1SupportEmit[] } {
  const live: D1SupportAdapter[] = [];
  for (const adapter of request.adapters) {
    if (!LIVE_ACTIONS.has(adapter.action)) continue;
    if (!adapter.portId || !adapter.defPath) {
      error(problems, 'ADAPTER_UNRESOLVED', adapter.portId || adapter.defPath || 'registry', `Adapter ${adapter.portId || '(missing)'} has no port or path. It was not registered.`);
      continue;
    }
    live.push(adapter);
  }
  live.sort((left, right) => left.portId.localeCompare(right.portId));
  const adapters: D1RegistryAdapter[] = live.map(adapter => ({
    portId: adapter.portId,
    adapterArtifactId: adapter.artifactId || adapter.portId,
    factory: adapter.artifactId || adapter.portId,
    defPath: adapter.defPath,
    dependsOn: [pipelineId(request.project, request.moduleName, 'repositoryAdapter', adapter.portId)],
  }));
  const registryFile = request.files.find(file => file.artifactType === 'repositoryRegistration');
  if (registryFile?.action === 'remove' && adapters.length > 0) {
    normalizations.push({
      code: 'REGISTRY_KEPT',
      path: registryFile.defPath,
      detail: 'The registry still has a live adapter. It was not removed.',
    });
  }
  const emit: D1SupportEmit[] = [];
  if (!adapters.length) return { adapters, live, emit };
  if (!writable(request, 'repositoryRegistration', problems, true)) return { adapters, live, emit };
  const defPath = filePath(request, 'repositoryRegistration', REGISTRY_PATH(request.moduleName));
  const definition = definitionFor(request, 'repositoryRegistration', 'registerRepositories', {
    registrationId: 'registerRepositories',
    adapters: adapters.map(adapter => ({ portId: adapter.portId, adapterArtifactId: adapter.adapterArtifactId })),
  });
  pushDefinition(emit, definition, registryPipeline(request, defPath, adapters), defPath, problems);
  return { adapters, live, emit };
}

function resolveGrant(
  request: D1SupportRequest,
  grant: D1ControllerGrant,
  problems: D1SupportProblem[],
): D1ScopeResolution {
  const plan = request.scopePlans.find(item => item.grantId === grant.grantId);
  const relationships = relationshipsFor(request, grant);
  const anchor = plan?.anchorEntity ?? grant.anchorEntity;
  const entityRefs = [...(plan?.entityRefs || grant.entityRefs)];
  const path = pathToAnchor(entityRefs, anchor, relationships);
  let pending = plan?.pending || '';
  if (!pending && anchor && !entityRefs.includes(anchor)) {
    const others = request.relationships.filter(rel => rel.required && entityRefs.includes(rel.from) && rel.to && rel.to !== anchor);
    if (others.length) pending = 'ACCESS_ANCHOR';
  }
  if (pending === 'ACCESS_ANCHOR') {
    review(
      problems,
      'ACCESS_ANCHOR',
      grant.grantId,
      `Grant ${grant.grantId} anchors on ${anchor}. The contradictory relationship stays pending for the owner. The anchor was not rewritten.`,
    );
  }
  if (anchor && !entityRefs.includes(anchor) && !path.length) {
    review(
      problems,
      'ANCHOR_UNRESOLVED',
      grant.grantId,
      `Grant ${grant.grantId} anchors on ${anchor}, which has no explicit relationship path. The scope was not changed to organization or public.`,
    );
  }
  const helperId = path.length ? `join:${path.map(step => step.relationshipId).join('>')}` : '';
  return {
    grantId: grant.grantId,
    actorRef: grant.actorRef,
    entityRefs,
    disclosure: grant.disclosure,
    allowedFields: grant.disclosure === 'fieldsOnly' ? [...grant.allowedFields] : [],
    anchorEntity: anchor,
    scopeMode: grant.scopeMode,
    session: 'verified',
    path,
    pending,
    helperId,
  };
}

function relationshipsFor(request: D1SupportRequest, grant: D1ControllerGrant): D1ControllerRelationship[] {
  const plan = request.scopePlans.find(item => item.grantId === grant.grantId);
  if (plan) {
    return plan.relationships.map(rel => ({
      relationshipId: rel.relationshipId,
      from: rel.from,
      to: rel.to,
      field: rel.field,
      required: request.relationships.find(item => item.relationshipId === rel.relationshipId)?.required === true,
    }));
  }
  return request.relationships.filter(rel => grant.entityRefs.includes(rel.from));
}

/** Shortest chain of relationships that declare a field. An Id suffix is not a field. */
function pathToAnchor(
  entityRefs: readonly string[],
  anchor: string,
  relationships: readonly D1ControllerRelationship[],
): D1SupportJoinStep[] {
  if (!anchor || entityRefs.includes(anchor)) return [];
  const edges = relationships
    .filter(rel => rel.field && rel.from && rel.to)
    .slice()
    .sort((left, right) => left.relationshipId.localeCompare(right.relationshipId));
  const queue: Array<{ at: string; steps: D1SupportJoinStep[] }> = [...entityRefs]
    .sort()
    .map(at => ({ at, steps: [] }));
  const seen = new Set(entityRefs);
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of edges) {
      if (edge.from !== current.at) continue;
      const steps = [...current.steps, {
        relationshipId: edge.relationshipId,
        from: edge.from,
        to: edge.to,
        field: edge.field,
      }];
      if (edge.to === anchor) return steps;
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      queue.push({ at: edge.to, steps });
    }
  }
  return [];
}

function shareHelpers(resolutions: readonly D1ScopeResolution[]): D1SupportHelper[] {
  const groups = new Map<string, D1SupportHelper>();
  for (const resolution of resolutions) {
    if (!resolution.helperId) continue;
    const existing = groups.get(resolution.helperId);
    if (existing) {
      if (!existing.consumers.includes(resolution.grantId)) existing.consumers.push(resolution.grantId);
      continue;
    }
    groups.set(resolution.helperId, {
      helperId: resolution.helperId,
      session: 'verified',
      steps: resolution.path.map(step => ({ ...step })),
      consumers: [resolution.grantId],
    });
  }
  const helpers = [...groups.values()];
  for (const helper of helpers) helper.consumers.sort();
  helpers.sort((left, right) => left.helperId.localeCompare(right.helperId));
  return helpers;
}

function grantData(resolution: D1ScopeResolution): Record<string, unknown> {
  const data: Record<string, unknown> = {
    grantId: resolution.grantId,
    actorRef: resolution.actorRef,
  };
  if (resolution.anchorEntity) data.anchorEntity = resolution.anchorEntity;
  data.entityRefs = resolution.entityRefs;
  data.disclosure = resolution.disclosure;
  if (resolution.disclosure === 'fieldsOnly') data.allowedFields = resolution.allowedFields;
  return data;
}

function noteFormIdentity(request: D1SupportRequest, problems: D1SupportProblem[]): void {
  const names = request.formFields.filter(name => FORM_IDENTITY.has(name)).sort();
  for (const name of names) {
    error(problems, 'FORM_IDENTITY', name, `Form field ${name} is not authentication. The session stays verified. No identity field was added.`);
  }
}

function noteReceipts(request: D1SupportRequest, problems: D1SupportProblem[]): void {
  for (const file of request.files) {
    if (file.action === 'conflict') {
      error(problems, 'RECEIPT_MISMATCH', file.defPath, `File ${file.defPath} has no usable receipt. It was not overwritten.`);
      continue;
    }
    if (!file.contentHash || !file.currentHash) continue;
    if (file.contentHash === file.currentHash) continue;
    error(problems, 'RECEIPT_MISMATCH', file.defPath, `Receipt hash for ${file.defPath} does not match the bytes on disk. The file was not overwritten.`);
  }
}

function noteInverted(
  request: D1SupportRequest,
  scope: readonly D1SupportEmit[],
  registry: readonly D1SupportEmit[],
  problems: D1SupportProblem[],
): void {
  const edges = [
    ...request.applicationEdges,
    ...scope.map(part => edgeOf(part.pipeline[0])),
    ...registry.map(part => edgeOf(part.pipeline[0])),
  ];
  for (const edge of edges) {
    if (!APPLICATION.has(edge.type)) continue;
    for (const dep of edge.dependsOn) {
      if (dep.includes('/repositoryAdapter/') || dep.includes('/repositoryRegistration/')) {
        error(problems, 'INVERTED_IMPORT', edge.id, `Application ${edge.id} depends on ${dep}.`);
      }
    }
  }
}

function noteDag(
  request: D1SupportRequest,
  scope: readonly D1SupportEmit[],
  registry: readonly D1SupportEmit[],
  live: readonly D1SupportAdapter[],
  problems: D1SupportProblem[],
): void {
  const nodes = [
    ...scope.map(part => edgeOf(part.pipeline[0])),
    ...registry.map(part => edgeOf(part.pipeline[0])),
    ...live.map(adapter => ({
      id: pipelineId(request.project, request.moduleName, 'repositoryAdapter', adapter.portId),
      type: 'repositoryAdapter',
      dependsOn: [] as string[],
    })),
  ];
  for (const issue of cycleIssues(nodes)) {
    error(problems, 'CYCLE', 'pipeline', issue);
  }
}

function writable(
  request: D1SupportRequest,
  artifactType: string,
  problems: D1SupportProblem[],
  sharedLive: boolean,
): boolean {
  const file = request.files.find(item => item.artifactType === artifactType);
  if (!file) return true;
  if (problems.some(problem => problem.severity === 'error' && problem.code === 'RECEIPT_MISMATCH' && problem.path === file.defPath)) {
    return false;
  }
  if (file.action === 'preserve' || file.action === 'conflict') return false;
  if (file.action === 'remove') return sharedLive;
  return WRITE_ACTIONS.has(file.action);
}

function filePath(request: D1SupportRequest, artifactType: string, fallback: string): string {
  return request.files.find(file => file.artifactType === artifactType)?.defPath || fallback;
}

function scopePipeline(request: D1SupportRequest, defPath: string): D1PipelineItem {
  const qualified = qualifyDefPath(request.project, defPath);
  return {
    id: pipelineId(request.project, request.moduleName, 'accessScope', 'accessScope'),
    type: 'accessScope',
    defPath: qualified,
    outputPath: futureOutputPath(qualified),
    outputAvailability: 'future',
    dependsFiles: [],
    dependsOn: [],
    skills: skillPaths('accessScope'),
  };
}

function authPipeline(request: D1SupportRequest, defPath: string, scopePath: string): D1PipelineItem {
  const qualified = qualifyDefPath(request.project, defPath);
  const scopeQualified = qualifyDefPath(request.project, scopePath);
  return {
    id: pipelineId(request.project, request.moduleName, 'authorityMap', 'authorityMap'),
    type: 'authorityMap',
    defPath: qualified,
    outputPath: futureOutputPath(qualified),
    outputAvailability: 'future',
    dependsFiles: [scopeQualified],
    dependsOn: [pipelineId(request.project, request.moduleName, 'accessScope', 'accessScope')],
    skills: skillPaths('authorityMap'),
  };
}

function registryPipeline(
  request: D1SupportRequest,
  defPath: string,
  adapters: readonly D1RegistryAdapter[],
): D1PipelineItem {
  const qualified = qualifyDefPath(request.project, defPath);
  const dependsOn = adapters.flatMap(adapter => adapter.dependsOn).sort();
  const dependsFiles = adapters.map(adapter => qualifyDefPath(request.project, adapter.defPath)).sort();
  return {
    id: pipelineId(request.project, request.moduleName, 'repositoryRegistration', 'registerRepositories'),
    type: 'repositoryRegistration',
    defPath: qualified,
    outputPath: futureOutputPath(qualified),
    outputAvailability: 'future',
    dependsFiles,
    dependsOn,
    skills: skillPaths('repositoryRegistration'),
  };
}

function definitionFor(
  request: D1SupportRequest,
  artifactType: D1Definition['artifactType'],
  artifactId: string,
  data: Record<string, unknown>,
): D1Definition {
  return {
    schemaVersion: D1_DEFINITION_SCHEMA,
    artifactType,
    artifactId,
    moduleName: request.moduleName,
    data,
  };
}

function pushDefinition(
  emit: D1SupportEmit[],
  definition: D1Definition,
  pipeline: D1PipelineItem,
  defPath: string,
  problems: D1SupportProblem[],
): void {
  const issues = definitionIssues(definition);
  if (issues.length) {
    error(problems, 'DEFINITION', defPath, issues[0]);
    return;
  }
  emit.push({ definition, pipeline: [pipeline] });
}

function edgeOf(item: D1PipelineItem | undefined): { id: string; type: string; dependsOn: string[] } {
  return {
    id: item?.id || '',
    type: item?.type || '',
    dependsOn: [...(item?.dependsOn || [])],
  };
}

function unconsumedEnumerations(request: D1SupportRequest): D1SupportEnumeration[] {
  return request.enumerations.map(item => ({
    entityId: item.entityId,
    path: item.path,
    values: [...item.values],
    consumed: false as const,
    source: ENUMERATION_SOURCE,
    reason: ENUMERATION_REASON,
  }));
}

function laterOf(moduleName: string): D1PublicationLater[] {
  return [
    {
      artifactType: 'persistenceSeeds',
      defPath: `l1/${moduleName}/layer_1_external/adapters/persistence/seeds.defs.ts`,
      reason: 'Seeds are a later emitter. This step did not write them.',
    },
    {
      artifactType: 'integrationOutbound',
      defPath: `l1/${moduleName}/layer_1_external/adapters/integration/outbound.defs.ts`,
      reason: 'Effects are a later emitter. This step did not write them.',
    },
  ];
}

function publicationOf(emit: readonly D1SupportEmit[]): D1PublicationItem[] {
  return emit.map(part => {
    const pipeline = part.pipeline[0];
    const artifactType = part.definition.artifactType;
    const registers = artifactType === 'repositoryRegistration'
      ? 'adapter factories'
      : artifactType === 'authorityMap'
        ? 'authority entries'
        : 'scope grants';
    return {
      artifactType,
      defPath: pipeline?.defPath || '',
      outputPath: pipeline?.outputPath || '',
      registers,
    };
  }).sort((left, right) => left.defPath.localeCompare(right.defPath));
}

function finish(
  request: D1SupportRequest,
  ok: boolean,
  enumerations: D1SupportEnumeration[],
  resolutions: D1ScopeResolution[],
  helpers: D1SupportHelper[],
  removedHelpers: string[],
  registry: D1RegistryAdapter[],
  problems: D1SupportProblem[],
  normalizations: D1SupportNormalization[],
  emit: D1SupportEmit[],
): D1SupportBuild {
  if (!normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED')) {
    normalizations.push({
      code: 'ENUMERATIONS_NOT_CONSUMED',
      path: ENUMERATION_SOURCE,
      detail: enumerations.length
        ? `${enumerations.length} enum values stay on the domain draft. support70 does not copy them.`
        : 'The domain draft has no enumerations. support70 did not invent any.',
    });
  }
  sortInPlace(enumerations, item => `${item.entityId}\u0000${item.path}`);
  sortInPlace(problems, item => `${item.path}\u0000${item.code}\u0000${item.message}`);
  sortInPlace(normalizations, item => `${item.path}\u0000${item.code}\u0000${item.detail}`);
  emit.sort((left, right) => (left.pipeline[0]?.defPath || '').localeCompare(right.pipeline[0]?.defPath || ''));
  return {
    schemaVersion: D1_SUPPORT_VERSION,
    project: request.project,
    moduleName: request.moduleName,
    llmCalls: 0,
    ok,
    enumerations,
    resolutions,
    helpers,
    removedHelpers,
    registry,
    publication: {
      stillToRegister: ok ? publicationOf(emit) : [],
      later: laterOf(request.moduleName),
    },
    problems,
    normalizations,
    emit: ok ? emit : [],
  };
}

function error(problems: D1SupportProblem[], code: string, path: string, message: string): void {
  if (problems.some(problem => problem.severity === 'error' && problem.code === code && problem.path === path && problem.message === message)) return;
  problems.push({ severity: 'error', code, path, message });
}

function review(problems: D1SupportProblem[], code: string, path: string, message: string): void {
  if (problems.some(problem => problem.code === code && problem.path === path)) return;
  problems.push({ severity: 'review', code, path, message });
}

function sortInPlace<T>(items: T[], key: (item: T) => string): void {
  items.sort((left, right) => key(left).localeCompare(key(right)));
}
