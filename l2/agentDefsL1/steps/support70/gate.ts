/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/gate.ts" enhancement="_blank"/>

import {
  D1_MEASURED_PUBLISH,
  definitionIssues,
  fictionalMechanism,
  integrationMechanismIssues,
  isRecord,
  pendingDefinition,
  type D1Definition,
  type M1Status,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  cycleIssues,
  futureOutputPath,
  pipelineId,
  qualifyDefPath,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { renderDefinition, stampDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import type { D1ControllerGrant, D1ControllerRelationship } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import {
  D1_SUPPORT_VERSION,
  ENUMERATION_SOURCE,
  type D1PublicationItem,
  type D1PublicationLater,
  type D1RegistryAdapter,
  type D1EntityScopePath,
  type D1ScopeResolution,
  type D1EffectReport,
  type D1SeedCitation,
  type D1SeedDataset,
  type D1SeedDependency,
  type D1SeedJourney,
  type D1SeedModel,
  type D1SeedRef,
  type D1SeedReport,
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
import { lifecyclePath, projectEnumerations } from '/_102021_/l2/agentDefsL1/steps/support70/enumerations.js';

const LIVE_ACTIONS = new Set(['create', 'update', 'recompose', 'preserve']);
const WRITE_ACTIONS = new Set(['create', 'update', 'recompose']);
const FORM_IDENTITY = new Set(['actorId', 'userId', 'sessionId', 'scope']);
const APPLICATION = new Set(['usecase', 'httpController', 'accessScope', 'authorityMap', 'repositoryPort']);

const SCOPE_PATH = (moduleName: string) => `l1/${moduleName}/layer_2_application/scope/accessScope.defs.ts`;
const AUTH_PATH = (moduleName: string) => `l1/${moduleName}/layer_1_external/auth/authorityMap.defs.ts`;
const REGISTRY_PATH = (moduleName: string) => `l1/${moduleName}/layer_1_external/adapters/persistence/registerRepositories.defs.ts`;
const SEEDS_PATH = (moduleName: string) => `l1/${moduleName}/layer_1_external/adapters/persistence/seeds.defs.ts`;
const OUTBOUND_PATH = (moduleName: string) => `l1/${moduleName}/layer_1_external/adapters/integration/outbound.defs.ts`;
const NOTE_RULE = 'attendanceNoteRequired';

/**
 * Registry, scope and the seed plan. No model call.
 * A grant keeps its declared mode, the verified session, the relationship path and any pending.
 * A missing grant or an anchor with no explicit path is a diagnosis.
 * It is not rewritten as organization or public.
 * Seeds describe scenarios. They do not write rows.
 * Effects name the consumer and keep an empty mechanism when none was declared.
 * Nothing is published.
 */
export function buildD1Support(request: D1SupportRequest): D1SupportBuild {
  const problems: D1SupportProblem[] = [];
  const normalizations: D1SupportNormalization[] = [];
  noteFormIdentity(request, problems);
  noteReceipts(request, problems);

  const scope = emitScope(request, problems);
  const registry = emitRegistry(request, problems, normalizations);
  const seeds = emitSeeds(request, problems, normalizations);
  const effects = emitEffects(request, problems);
  noteInverted(request, scope.emit, registry.emit, problems);
  noteDag(request, scope.emit, registry.emit, seeds.emit, effects.emit, registry.live, problems);

  const errored = problems.some(problem => problem.severity === 'error');
  const emit = errored ? [] : [...scope.emit, ...registry.emit, ...seeds.emit, ...effects.emit];
  for (const part of emit) {
    const item = part.pipeline[0];
    part.definition = stampDefinition(part.definition, item?.defPath || '', item?.dependsFiles || []);
    const rendered = renderDefinition(part.definition, item?.defPath || '');
    if ('issues' in rendered) {
      error(problems, 'DEFINITION', part.pipeline[0]?.defPath || '', rendered.issues[0] || 'Definition did not render.');
    } else if (/\bimport\b/.test(rendered.source)) {
      error(problems, 'RUNTIME_IMPORT', part.pipeline[0]?.defPath || '', 'Support source imports a module.');
    }
  }
  const stillOk = !problems.some(problem => problem.severity === 'error');
  const enumerations = classifyEnumerations(request, stillOk ? seeds.citations : []);
  return finish(
    request,
    stillOk,
    enumerations,
    scope.resolutions,
    scope.helpers,
    scope.removedHelpers,
    registry.adapters,
    problems,
    normalizations,
    stillOk ? emit : [],
    stillOk ? seeds.plan : absentPlan(),
    stillOk ? effects.report : absentEffects(),
  );
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

/**
 * One seed plan for the local tables. Journeys and models supply scenarios.
 * MDM roles are dependencies, not rows. A ref needs a column relationship.
 */
export function emitSeeds(
  request: D1SupportRequest,
  problems: D1SupportProblem[],
  normalizations: D1SupportNormalization[],
): { emit: D1SupportEmit[]; plan: D1SeedReport; citations: D1SeedCitation[] } {
  const empty = { emit: [] as D1SupportEmit[], plan: absentPlan(), citations: [] as D1SeedCitation[] };
  if (request.maintenance?.action === 'reseed') {
    error(problems, 'MAINTENANCE_RESEED', 'seeds', 'Maintenance does not reseed. No rows were written.');
    return empty;
  }
  if (request.maintenance?.action === 'reset') {
    error(problems, 'MAINTENANCE_RESET', 'seeds', 'Maintenance does not reset seed data. No rows were written.');
    return empty;
  }
  for (const journeyId of [...request.missingJourneys].sort()) {
    error(problems, 'SEED_SOURCE_ABSENT', journeyId, `Journey ${journeyId} is named and was not read. No scenario was invented for it.`);
  }
  if (request.missingJourneys.length) return empty;

  const scenarios: Array<Record<string, unknown>> = [];
  const datasets: D1SeedDataset[] = [];
  const citations: D1SeedCitation[] = [];
  const localEntities = new Set<string>();
  for (const table of [...request.tables].sort((left, right) => left.tableId.localeCompare(right.tableId))) {
    if (!LIVE_ACTIONS.has(table.action)) continue;
    const model = request.models.find(item => item.entityId === table.entityId);
    if (!table.tableId || !table.entityId || !table.defPath || !model) {
      error(problems, 'SEED_TABLE', table.tableId || table.entityId || 'seeds', `Table ${table.tableId || '(missing)'} has no model or path. It was not seeded.`);
      continue;
    }
    if (model.storageTarget === 'mdm' || model.kind === 'role') {
      error(problems, 'SEED_MDM', table.tableId, `Table ${table.tableId} belongs to MDM role ${model.entityId}. No local seed and no extra namespace were created.`);
      continue;
    }
    if (model.namespace && model.namespace !== request.moduleName) {
      error(problems, 'SEED_NAMESPACE', model.namespace, `Namespace ${model.namespace} is not the module. No seed namespace was created.`);
      continue;
    }
    const refs = columnRefs(request, model, problems);
    if (problems.some(problem => problem.severity === 'error' && (problem.code === 'SEED_REF_UNRELATED' || problem.code === 'SEED_ROLE_TAG'))) {
      return empty;
    }
    const planning = model.uniqueKeys.length ? model : { ...model, uniqueKeys: table.uniqueKeys };
    const stateField = lifecyclePath(model.entityId, planning.states, request.enumerations);
    const journeys = request.journeys
      .filter(item => item.entities.includes(model.entityId))
      .sort((left, right) => left.journeyId.localeCompare(right.journeyId));
    const built = journeys.length
      ? journeys.map(item => scenarioOf(table.tableId, planning, refs, item, stateField))
      : [modelScenario(table.tableId, planning, refs, stateField)];
    citations.push(...citationsOf(model.entityId, stateField, built));
    scenarios.push(...built);
    const owners = ownerIds(built.map(item => String(item.scenarioId)), request);
    if (!owners.length) continue;
    const previous = request.existingDatasets.find(item => item.tableId === table.tableId);
    if (previous && previous.owners.some(owner => !owners.includes(owner))) {
      normalizations.push({
        code: 'DATASET_KEPT',
        path: table.tableId,
        detail: `Dataset ${table.tableId} still has an owner. Removing one owner did not drop it.`,
      });
    }
    datasets.push({ datasetId: table.tableId, tableId: table.tableId, owners });
    localEntities.add(model.entityId);
  }
  if (problems.some(problem => problem.severity === 'error' && problem.code.startsWith('SEED_'))) return empty;
  if (!scenarios.length) return empty;

  const removed = request.files.find(file => file.artifactType === 'persistenceSeeds' && file.action === 'remove');
  if (removed) {
    normalizations.push({
      code: 'DATASET_KEPT',
      path: removed.defPath,
      detail: 'The seed dataset still has an owner. It was not removed.',
    });
  }
  if (!writable(request, 'persistenceSeeds', problems, true)) return { emit: [], plan: planOf(scenarios, datasets, request, localEntities), citations };

  const dependencies = dependenciesOf(request, localEntities);
  const data = {
    seedId: 'seeds',
    phase: 'plan',
    scenarios,
    dependencies,
    datasets,
  };
  const defPath = filePath(request, 'persistenceSeeds', SEEDS_PATH(request.moduleName));
  const definition = definitionFor(request, 'persistenceSeeds', 'seeds', data);
  const emit: D1SupportEmit[] = [];
  pushDefinition(emit, definition, seedsPipeline(request, defPath, datasets), defPath, problems);
  if (problems.some(problem => problem.severity === 'error')) return empty;
  return { emit, plan: { phase: 'plan', materialized: false, rowCount: 0, datasets, dependencies }, citations };
}

function columnRefs(request: D1SupportRequest, model: D1SeedModel, problems: D1SupportProblem[]): D1SeedRef[] {
  const refs: D1SeedRef[] = [];
  const relationships = request.relationships
    .filter(rel => rel.from === model.entityId && rel.field)
    .sort((left, right) => left.relationshipId.localeCompare(right.relationshipId));
  for (const rel of relationships) {
    const field = columnField(rel.field, model.entityId);
    if (!rel.relationshipId || structuredField(model, field)) {
      error(problems, 'SEED_REF_UNRELATED', field, `Ref on ${field} has no column relationship. It was not seeded.`);
      continue;
    }
    if (!entityIdOf(request, rel.to)) {
      error(problems, 'SEED_ROLE_TAG', rel.to || field, `Ref target ${rel.to || '(missing)'} is a role tag, not an MDM entity id. No seed namespace was created.`);
      continue;
    }
    refs.push({ field, relationshipId: rel.relationshipId, entityId: rel.to });
  }
  for (const proposed of [...request.seedRefs].sort((left, right) => left.field.localeCompare(right.field))) {
    const match = refs.some(ref => ref.field === proposed.field && ref.relationshipId === proposed.relationshipId && ref.entityId === proposed.entityId);
    if (match) continue;
    if (roleTag(request, proposed.entityId)) {
      error(problems, 'SEED_ROLE_TAG', proposed.entityId, `Ref target ${proposed.entityId} is a role tag, not an MDM entity id. No seed namespace was created.`);
    } else {
      error(problems, 'SEED_REF_UNRELATED', proposed.field, `Ref on ${proposed.field} has no column relationship. It was not seeded.`);
    }
  }
  refs.sort((left, right) => left.field.localeCompare(right.field));
  return refs;
}

function scenarioOf(
  tableId: string,
  model: D1SeedModel,
  refs: readonly D1SeedRef[],
  journey: D1SeedJourney,
  stateField: string,
): Record<string, unknown> {
  const effect = journey.effects.find(item => item.entityId === model.entityId);
  const transition = effect?.transitionRef
    ? model.transitions.find(item => item.transitionId === effect.transitionRef)
    : undefined;
  const states: string[] = [];
  if (transition?.to) states.push(transition.to);
  else if (effect?.effect === 'create' && model.initialState) states.push(model.initialState);
  const noteState = transition && model.noteField && transition.ruleRefs.includes(NOTE_RULE) ? transition.to : '';
  const requires = noteState ? [model.noteField] : [];
  return scenarioRecord(journey.journeyId, tableId, `journey:${journey.journeyId}`, model, refs, states, requires, noteState, stateField);
}

function modelScenario(
  tableId: string,
  model: D1SeedModel,
  refs: readonly D1SeedRef[],
  stateField: string,
): Record<string, unknown> {
  const states = [...model.states];
  const noteState = model.transitions.find(item => item.ruleRefs.includes(NOTE_RULE) && item.to)?.to || '';
  const requires = noteState && model.noteField ? [model.noteField] : [];
  return scenarioRecord(`model-${tableId}`, tableId, `model:${model.entityId}`, model, refs, states, requires, noteState, stateField);
}

function citationsOf(entityId: string, stateField: string, scenarios: readonly Record<string, unknown>[]): D1SeedCitation[] {
  if (!stateField) return [];
  const citations: D1SeedCitation[] = [];
  for (const scenario of scenarios) {
    const scenarioId = typeof scenario.scenarioId === 'string' ? scenario.scenarioId : '';
    const values = Array.isArray(scenario.states) ? scenario.states.filter((item): item is string => typeof item === 'string' && !!item) : [];
    if (!scenarioId || !values.length) continue;
    citations.push({ entityId, path: stateField, scenarioId, values });
  }
  return citations;
}

function scenarioRecord(
  scenarioId: string,
  tableId: string,
  source: string,
  model: D1SeedModel,
  refs: readonly D1SeedRef[],
  states: readonly string[],
  requires: readonly string[],
  noteState: string,
  stateField: string,
): Record<string, unknown> {
  const constraints = [
    ...uniqueConstraints(model),
    ...refs.map(ref => `ref:${ref.field}:${ref.entityId}`),
    ...states.map(state => `state:${state}`),
    ...requires.map(field => `noteRequired:${field}:${noteState}`),
  ].sort();
  const record: Record<string, unknown> = {
    scenarioId,
    tableId,
    source,
    constraints,
    refs: refs.map(ref => ({ ...ref })),
    states: [...states],
    entityId: model.entityId,
  };
  if (stateField) record.stateField = stateField;
  if (requires.length) record.requires = [...requires];
  return record;
}

function uniqueConstraints(model: D1SeedModel): string[] {
  return model.uniqueKeys
    .filter(key => key.length > 0)
    .map(key => `uniqueKeys:${key.join('+')}`);
}

function ownerIds(scenarioIds: readonly string[], request: D1SupportRequest): string[] {
  let owners = [...scenarioIds];
  if (request.maintenance?.action === 'removeOwner' && request.maintenance.ownerId) {
    owners = owners.filter(owner => owner !== request.maintenance?.ownerId);
  }
  return [...new Set(owners)].sort();
}

function planOf(
  scenarios: readonly Record<string, unknown>[],
  datasets: readonly D1SeedDataset[],
  request: D1SupportRequest,
  localEntities: ReadonlySet<string>,
): D1SeedReport {
  if (!scenarios.length) return absentPlan();
  return {
    phase: 'plan',
    materialized: false,
    rowCount: 0,
    datasets: datasets.map(item => ({ ...item, owners: [...item.owners] })),
    dependencies: dependenciesOf(request, localEntities),
  };
}

function dependenciesOf(request: D1SupportRequest, localEntities: ReadonlySet<string>): D1SeedDependency[] {
  const dependencies: D1SeedDependency[] = [];
  for (const model of [...request.models].sort((left, right) => left.entityId.localeCompare(right.entityId))) {
    const local = localEntities.has(model.entityId);
    if (!local && model.kind !== 'role' && model.storageTarget !== 'mdm') continue;
    dependencies.push({
      entityId: model.entityId,
      kind: local ? 'module' : 'mdm',
      seeded: false,
    });
  }
  return dependencies;
}

function entityIdOf(request: D1SupportRequest, value: string): boolean {
  if (!value || roleTag(request, value)) return false;
  return request.models.some(model => model.entityId === value);
}

function roleTag(request: D1SupportRequest, value: string): boolean {
  if (!value) return false;
  if (request.models.some(model => model.entityId === value)) return false;
  return request.roleTags.some(item => item.tag === value);
}

function columnField(raw: string, entityId: string): string {
  const prefix = `${entityId}.`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
}

function structuredField(model: D1SeedModel, field: string): boolean {
  if (field.includes('.')) return true;
  const found = model.fields.find(item => item.name === field);
  return found?.type === 'object';
}

function seedsPipeline(request: D1SupportRequest, defPath: string, datasets: readonly D1SeedDataset[]): D1PipelineItem {
  const qualified = qualifyDefPath(request.project, defPath);
  const tables = [...new Set(datasets.map(item => item.tableId))].sort();
  const dependsOn = tables.map(tableId => pipelineId(request.project, request.moduleName, 'table', tableId));
  const dependsFiles = tables.map(tableId => {
    const table = request.tables.find(item => item.tableId === tableId);
    return qualifyDefPath(request.project, table?.defPath || `l1/${request.moduleName}/layer_1_external/adapters/persistence/${tableId}.defs.ts`);
  }).sort();
  return {
    id: pipelineId(request.project, request.moduleName, 'persistenceSeeds', 'seeds'),
    type: 'persistenceSeeds',
    defPath: qualified,
    outputPath: futureOutputPath(qualified),
    outputAvailability: 'future',
    dependsFiles,
    dependsOn,
    skills: skillPaths('persistenceSeeds'),
  };
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
  const path = entityPaths(entityRefs, anchor, relationships);
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
  for (const entry of path) {
    if (!entry.pending) continue;
    review(
      problems,
      'ANCHOR_UNRESOLVED',
      grant.grantId,
      `Grant ${grant.grantId} has no relationship field from ${entry.entityId} to ${anchor}. The scope was not changed to organization or public.`,
    );
  }
  const joined = path.filter(entry => entry.steps.length);
  const helperId = joined.length === 1 ? `join:${joined[0].steps.map(step => step.relationshipId).join('>')}` : '';
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

/** Each entity of the grant. The anchor is an empty path. Any other entity uses the same chain, or stays pending alone. */
function entityPaths(
  entityRefs: readonly string[],
  anchor: string,
  relationships: readonly D1ControllerRelationship[],
): D1EntityScopePath[] {
  return entityRefs.map(entityId => {
    if (!anchor || entityId === anchor) return { entityId, steps: [], pending: '' };
    const steps = pathToAnchor([entityId], anchor, relationships);
    return { entityId, steps, pending: steps.length ? '' : 'ANCHOR_UNRESOLVED' };
  });
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
    for (const entry of resolution.path) {
      if (!entry.steps.length) continue;
      const helperId = `join:${entry.steps.map(step => step.relationshipId).join('>')}`;
      const existing = groups.get(helperId);
      if (existing) {
        if (!existing.consumers.includes(resolution.grantId)) existing.consumers.push(resolution.grantId);
        continue;
      }
      groups.set(helperId, {
        helperId,
        session: 'verified',
        steps: entry.steps.map(step => ({ ...step })),
        consumers: [resolution.grantId],
      });
    }
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
  data.scopeMode = resolution.scopeMode;
  data.session = resolution.session;
  data.path = resolution.path.map(entry => ({
    entityId: entry.entityId,
    steps: entry.steps.map(step => ({
      relationshipId: step.relationshipId,
      from: step.from,
      to: step.to,
      field: step.field,
    })),
    pending: entry.pending,
  }));
  data.pending = resolution.pending;
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
  seeds: readonly D1SupportEmit[],
  effects: readonly D1SupportEmit[],
  live: readonly D1SupportAdapter[],
  problems: D1SupportProblem[],
): void {
  const tableIds = new Set<string>();
  for (const part of seeds) {
    for (const dep of part.pipeline[0]?.dependsOn || []) {
      if (dep.includes('/table/')) tableIds.add(dep);
    }
  }
  const nodes = [
    ...scope.map(part => edgeOf(part.pipeline[0])),
    ...registry.map(part => edgeOf(part.pipeline[0])),
    ...seeds.map(part => edgeOf(part.pipeline[0])),
    ...effects.map(part => edgeOf(part.pipeline[0])),
    ...live.map(adapter => ({
      id: pipelineId(request.project, request.moduleName, 'repositoryAdapter', adapter.portId),
      type: 'repositoryAdapter',
      dependsOn: [] as string[],
    })),
    ...[...tableIds].sort().map(id => ({ id, type: 'table', dependsOn: [] as string[] })),
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
  status: M1Status = 'pending',
): D1Definition {
  return pendingDefinition(artifactType, artifactId, request.moduleName, data, [], status);
}

function pushDefinition(
  emit: D1SupportEmit[],
  definition: D1Definition,
  pipeline: D1PipelineItem,
  defPath: string,
  problems: D1SupportProblem[],
  blockReason = '',
): void {
  const issues = definitionIssues(definition);
  if (issues.length) {
    error(problems, 'DEFINITION', defPath, issues[0]);
    return;
  }
  emit.push({ definition, pipeline: [pipeline], ...(blockReason ? { blockReason } : {}) });
}

/** A concrete external gap. Shape errors stay schema issues and are not a status. */
function integrationGap(data: Record<string, unknown>): string {
  const issues = integrationMechanismIssues(data).filter(item => /^(INTEGRATION_UNBOUND|MECHANISM_INCOMPATIBLE|MECHANISM_REF|FICTIONAL_API):/.test(item));
  if (Array.isArray(data.events)) {
    for (const event of data.events) {
      if (!isRecord(event) || typeof event.mechanism !== 'string' || !event.mechanism.trim()) continue;
      if (event.mechanism === D1_MEASURED_PUBLISH.symbol) continue;
      const eventId = typeof event.eventId === 'string' ? event.eventId : 'event';
      issues.push(`MECHANISM_UNVERIFIED: ${eventId} is not an approved module integration.`);
    }
  }
  return issues[0] || '';
}

function edgeOf(item: D1PipelineItem | undefined): { id: string; type: string; dependsOn: string[] } {
  return {
    id: item?.id || '',
    type: item?.type || '',
    dependsOn: [...(item?.dependsOn || [])],
  };
}

function classifyEnumerations(request: D1SupportRequest, citations: readonly D1SeedCitation[]): D1SupportEnumeration[] {
  return projectEnumerations({
    enumerations: request.enumerations,
    snapshot: request.enumSnapshot,
    seedCitations: citations,
  });
}

/**
 * One outbound def. Events keep the transition as consumer.
 * An empty mechanism stays empty. publishEvent and emitEvent are refused.
 * IQueueRuntime.publish is evidence, not an approved binding.
 * Processes, inbound and plugins stay operations. A scheduled trigger writes no scheduler.
 */
export function emitEffects(
  request: D1SupportRequest,
  problems: D1SupportProblem[],
): { emit: D1SupportEmit[]; report: D1EffectReport } {
  const empty = { emit: [] as D1SupportEmit[], report: absentEffects() };
  const known = new Set(request.usecaseIds);
  for (const eventId of [...request.selectedEventIds].sort()) {
    if (request.outbound.some(event => event.eventId === eventId)) continue;
    error(problems, 'INTEGRATION_OMITTED', eventId, `Outbound ${eventId} was selected and is missing. It was not dropped.`);
  }
  if (problems.some(problem => problem.severity === 'error' && problem.code === 'INTEGRATION_OMITTED')) return empty;

  const events: Array<Record<string, unknown>> = [];
  for (const event of [...request.outbound].sort((left, right) => left.eventId.localeCompare(right.eventId))) {
    const parts = event.on.split('.');
    const entityId = parts[0] || '';
    const transition = parts[1] || '';
    if (!event.eventId || !entityId || !transition || parts.length !== 2 || !known.has(transition)) {
      error(problems, 'INTEGRATION_LINK', event.eventId || event.on, `Outbound ${event.eventId || event.on} does not name a selected usecase.`);
      continue;
    }
    const resolved = resolveMechanism(event.mechanism, event.eventId, problems);
    if (!resolved) continue;
    const rules = uniqueRules(request, entityId, transition);
    if (!event.payloadDeclared && rules.length) {
      review(
        problems,
        'PAYLOAD_UNDECLARED',
        transition,
        `Transition ${transition} cites ${rules.join(', ')} and declares no payload. No payload was invented.`,
      );
    }
    const row: Record<string, unknown> = {
      eventId: event.eventId,
      on: event.on,
      entityId,
      mechanism: resolved.mechanism,
      consumer: transition,
    };
    if (resolved.mechanismRef) row.mechanismRef = resolved.mechanismRef;
    events.push(row);
  }

  const processes: Array<Record<string, unknown>> = [];
  const inbound: Array<Record<string, unknown>> = [];
  const plugins: Array<Record<string, unknown>> = [];
  const gaps: Array<Record<string, unknown>> = [];
  for (const operation of [...request.operations].sort((left, right) => left.id.localeCompare(right.id))) {
    const resolved = resolveMechanism(operation.mechanism, operation.id, problems);
    if (!resolved) continue;
    const outside = operation.operations.filter(item => !inPool(item, known));
    if (!operation.operations.length || outside.length) {
      gaps.push({ itemId: operation.id, kind: operation.kind, code: 'POOL_ABSENT' });
      review(
        problems,
        'POOL_ABSENT',
        operation.id,
        `${operation.kind} ${operation.id} is not in the selected pool. It was kept and no endpoint was added.`,
      );
    }
    if (operation.scheduled) {
      review(problems, 'SCHEDULER_NOT_WRITTEN', operation.id, `${operation.kind} ${operation.id} declares a scheduled trigger. No runtime scheduler was written.`);
    }
    const row = {
      operations: [...operation.operations],
      mechanism: resolved.mechanism,
      consumer: operation.consumer || operation.id,
    };
    if (operation.kind === 'process') processes.push({ processId: operation.id, ...row });
    else if (operation.kind === 'inbound') inbound.push({ inboundId: operation.id, ...row });
    else plugins.push({ pluginId: operation.id, ...row });
  }

  if (problems.some(problem => problem.severity === 'error')) return empty;
  if (!events.length && !processes.length && !inbound.length && !plugins.length) return empty;

  const data: Record<string, unknown> = { integrationId: 'outbound', events };
  if (processes.length) data.processes = processes;
  if (inbound.length) data.inbound = inbound;
  if (plugins.length) data.plugins = plugins;
  if (gaps.length) data.gaps = gaps.sort((left, right) => String(left.itemId).localeCompare(String(right.itemId)));
  if (!writable(request, 'integrationOutbound', problems, true)) {
    return { emit: [], report: { phase: 'plan', executed: false, capability: capabilityOf(false) } };
  }
  const defPath = filePath(request, 'integrationOutbound', OUTBOUND_PATH(request.moduleName));
  const consumers = events.map(event => String(event.consumer));
  const gap = integrationGap(data);
  const definition = definitionFor(request, 'integrationOutbound', 'outbound', data, gap ? 'blocked' : 'pending');
  const emit: D1SupportEmit[] = [];
  pushDefinition(emit, definition, effectsPipeline(request, defPath, consumers, data), defPath, problems, gap);
  if (problems.some(problem => problem.severity === 'error')) return empty;
  return { emit, report: { phase: 'plan', executed: false, capability: capabilityOf(false) } };
}

function resolveMechanism(
  raw: string,
  label: string,
  problems: D1SupportProblem[],
): { mechanism: string; mechanismRef: string } | null {
  const mechanism = raw.trim();
  if (fictionalMechanism(mechanism)) {
    error(problems, 'FICTIONAL_API', label, `Mechanism ${mechanism} is not on RequestContext. publishEvent and emitEvent were not written.`);
    return null;
  }
  if (!mechanism) {
    review(problems, 'INTEGRATION_UNBOUND', label, `${label} is preserved. No runtime mechanism is named.`);
    return { mechanism: '', mechanismRef: '' };
  }
  if (mechanism === D1_MEASURED_PUBLISH.symbol) {
    review(
      problems,
      'MECHANISM_INCOMPATIBLE',
      label,
      `${label} names ${mechanism}. Postgres publish inserts into mdm_outbox. It is not a module bus.`,
    );
    return { mechanism, mechanismRef: D1_MEASURED_PUBLISH.path };
  }
  review(problems, 'MECHANISM_UNVERIFIED', label, `Mechanism ${mechanism} is not an approved module integration. It was kept and not executed.`);
  return { mechanism, mechanismRef: '' };
}

function uniqueRules(request: D1SupportRequest, entityId: string, transitionId: string): string[] {
  const model = request.models.find(item => item.entityId === entityId);
  if (!model) return [];
  const cited = new Map<string, number>();
  for (const transition of model.transitions) {
    for (const rule of transition.ruleRefs) cited.set(rule, (cited.get(rule) || 0) + 1);
  }
  const transition = model.transitions.find(item => item.transitionId === transitionId);
  if (!transition) return [];
  return transition.ruleRefs.filter(rule => cited.get(rule) === 1);
}

function inPool(operation: string, usecaseIds: ReadonlySet<string>): boolean {
  if (usecaseIds.has(operation)) return true;
  const head = operation.split('.')[0] || '';
  return head.length > 0 && usecaseIds.has(head);
}

function effectsPipeline(
  request: D1SupportRequest,
  defPath: string,
  consumers: readonly string[],
  data: Record<string, unknown>,
): D1PipelineItem {
  const qualified = qualifyDefPath(request.project, defPath);
  const usecases = [...new Set(consumers)].filter(Boolean).sort();
  const refs = Array.isArray(data.events)
    ? data.events.flatMap(event => isRecord(event) && typeof event.mechanismRef === 'string' ? [event.mechanismRef] : [])
    : [];
  return {
    id: pipelineId(request.project, request.moduleName, 'integrationOutbound', 'outbound'),
    type: 'integrationOutbound',
    defPath: qualified,
    outputPath: futureOutputPath(qualified),
    outputAvailability: 'future',
    dependsFiles: [
      ...usecases.map(id => qualifyDefPath(request.project, `l1/${request.moduleName}/layer_2_application/usecases/${id}.defs.ts`)),
      ...refs,
    ],
    dependsOn: usecases.map(id => pipelineId(request.project, request.moduleName, 'usecase', id)),
    skills: skillPaths('integrationOutbound'),
  };
}

function capabilityOf(bound: boolean): D1EffectReport['capability'] {
  return {
    symbol: D1_MEASURED_PUBLISH.symbol,
    path: D1_MEASURED_PUBLISH.path,
    owner: D1_MEASURED_PUBLISH.owner,
    payload: D1_MEASURED_PUBLISH.payload,
    delivery: D1_MEASURED_PUBLISH.delivery,
    transaction: D1_MEASURED_PUBLISH.transaction,
    requestContextPublish: false,
    bound,
  };
}

function absentEffects(): D1EffectReport {
  return { phase: 'absent', executed: false, capability: capabilityOf(false) };
}

function laterOf(moduleName: string, seedPlan: D1SeedReport, effectPlan: D1EffectReport): D1PublicationLater[] {
  const later: D1PublicationLater[] = [];
  if (seedPlan.phase !== 'plan') {
    later.push({
      artifactType: 'persistenceSeeds',
      defPath: SEEDS_PATH(moduleName),
      reason: 'No local table was planned. This step did not write a seed plan.',
    });
  }
  if (effectPlan.phase !== 'plan') {
    later.push({
      artifactType: 'integrationOutbound',
      defPath: OUTBOUND_PATH(moduleName),
      reason: 'No outbound event, process, inbound item or plugin was declared. This step did not write an integration def.',
    });
  }
  return later;
}

function registersOf(artifactType: string): string {
  if (artifactType === 'repositoryRegistration') return 'adapter factories';
  if (artifactType === 'authorityMap') return 'authority entries';
  if (artifactType === 'persistenceSeeds') return 'seed plan';
  if (artifactType === 'integrationOutbound') return 'outbound events';
  return 'scope grants';
}

function publicationOf(emit: readonly D1SupportEmit[]): D1PublicationItem[] {
  return emit.map(part => {
    const pipeline = part.pipeline[0];
    const artifactType = part.definition.artifactType;
    return {
      artifactType,
      defPath: pipeline?.defPath || '',
      outputPath: pipeline?.outputPath || '',
      registers: registersOf(artifactType),
    };
  }).sort((left, right) => left.defPath.localeCompare(right.defPath));
}

function absentPlan(): D1SeedReport {
  return { phase: 'absent', materialized: false, rowCount: 0, datasets: [], dependencies: [] };
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
  seedPlan: D1SeedReport,
  effectPlan: D1EffectReport,
): D1SupportBuild {
  const consumed = enumerations.filter(item => item.consumed);
  const unconsumed = enumerations.filter(item => !item.consumed);
  if (consumed.length && !normalizations.some(item => item.code === 'ENUMERATIONS_CONSUMED')) {
    normalizations.push({
      code: 'ENUMERATIONS_CONSUMED',
      path: ENUMERATION_SOURCE,
      detail: `${consumed.length} enum groups have a covered consumer. No rows were written.`,
    });
  }
  if ((unconsumed.length || enumerations.length === 0) && !normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED')) {
    normalizations.push({
      code: 'ENUMERATIONS_NOT_CONSUMED',
      path: ENUMERATION_SOURCE,
      detail: unconsumed.length
        ? `${unconsumed.length} enum values stay on the domain draft. support70 does not copy them.`
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
      later: laterOf(request.moduleName, ok ? seedPlan : absentPlan(), ok ? effectPlan : absentEffects()),
    },
    seedPlan: ok ? seedPlan : absentPlan(),
    effectPlan: ok ? effectPlan : absentEffects(),
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
