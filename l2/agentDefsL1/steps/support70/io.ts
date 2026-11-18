/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { draftFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, logicalDefPath, type D1UnitPart } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { futureOutputPath, qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { entityPath, inputPaths, journeyPath, type D1InputSnapshot, type D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { resolveAllowedFields } from '/_102021_/l2/helpers/l1Defs/disclosure.js';
import { sourceIdentityHash } from '/_102021_/l2/helpers/l1Defs/identity.js';
import { externalCallsOf, processConsumersOf, type D1ExternalCallMatch } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';
import { parseD1Source, readD1Input, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { catalogInfo } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import { D1_CONTROLLER_VERSION } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { serveControllerGrants } from '/_102021_/l2/agentDefsL1/steps/controllers60/serveGrants.js';
import { D1_DOMAIN_VERSION } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import { D1_PERSISTENCE_VERSION } from '/_102021_/l2/agentDefsL1/steps/persistence40/contracts.js';
import {
  D1_SUPPORT_VERSION,
  transitionUsecaseFor,
  operationUsecasesOf,
  transitionUsecasesOf,
  type D1CatalogOperation,
  type D1EffectEvent,
  type D1EffectOperation,
  type D1ProcessPlan,
  type D1SeedDataset,
  type D1SeedJourney,
  type D1SeedModel,
  type D1SeedRoleTag,
  type D1SupportBuild,
  type D1SupportFile,
  type D1SupportHelper,
  type D1SupportRequest,
} from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';
import { buildD1Support } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import type { D1ControllerGrant, D1ControllerProblem, D1ControllerRelationship, D1ScopeGrantPlan } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

const SUPPORT_TYPES = new Set(['accessScope', 'authorityMap', 'repositoryRegistration', 'persistenceSeeds', 'integrationOutbound', 'workflowProcess']);

export async function assembleD1Support(
  project: number,
  moduleName: string,
): Promise<{ refusal: string } | { build: D1SupportBuild; files: D1SupportFile[] }> {
  const snapshot = await readD1Input(project, moduleName);
  if (!snapshot) return { refusal: 'input.json is missing or does not belong to this project. support70 wrote nothing.' };
  if (!snapshot.consumersReleased) return { refusal: 'Consumer phases are not released. support70 wrote nothing.' };
  const controllersText = await readText(draftFile(project, moduleName, 'controllers60'));
  if (!controllersText) return { refusal: 'controllers60 draft is missing. support70 wrote nothing.' };
  const persistenceText = await readText(draftFile(project, moduleName, 'persistence40'));
  if (!persistenceText) return { refusal: 'persistence40 draft is missing. support70 wrote nothing.' };
  const controllers = parseDraft(controllersText, D1_CONTROLLER_VERSION, project, moduleName);
  if (!controllers) return { refusal: 'controllers60 draft does not belong to this project. support70 wrote nothing.' };
  const persistence = parseDraft(persistenceText, D1_PERSISTENCE_VERSION, project, moduleName);
  if (!persistence) return { refusal: 'persistence40 draft does not belong to this project. support70 wrote nothing.' };
  const domainText = await readText(draftFile(project, moduleName, 'domain30'));
  if (!domainText) return { refusal: 'domain30 draft is missing. support70 wrote nothing.' };
  const domain = parseDraft(domainText, D1_DOMAIN_VERSION, project, moduleName);
  if (!domain) return { refusal: 'domain30 draft does not belong to this project. support70 wrote nothing.' };

  const paths = inputPaths(moduleName);
  const accessText = await readLogical(project, paths.access);
  const indexText = await readLogical(project, paths.ontologyIndex);
  const access = accessText ? parseD1Source(accessText, 'defs') : null;
  const index = indexText ? parseD1Source(indexText, 'defs') : null;
  const journeys = await journeysOf(project, moduleName);
  const roleTags = await roleTagsOf(project, moduleName, index);
  const usecasesText = await readText(draftFile(project, moduleName, 'usecases50'));
  const usecases = usecasesText ? parseObject(usecasesText) : null;
  const previousText = await readText(draftFile(project, moduleName, 'support70'));
  const previous = previousText ? parseObject(previousText) : null;
  const files = await receiptFiles(project, snapshot.files);
  const entities = await entitiesOf(project, moduleName, index);
  const accessGrants = accessGrantsOf(access, entities, snapshot.selection.requests || []);
  const grants = accessGrants.grants;
  const models = modelsOf(domain, index);
  const selected = snapshot.selection.usecases;
  const usecaseIds = [...new Set(selected.flatMap(item => [item.usecaseId, item.identity]))].filter(Boolean).sort();
  const transitionUsecases = transitionUsecasesOf(selected);
  const operationUsecases = operationUsecasesOf(selected);
  const linked = await effectsOf(project, moduleName, selected);
  const serves = new Set((snapshot.selection.requests || []).flatMap(request => request.serves ? [request.serves] : []));
  const processes = await processesOf(project, moduleName, selected, serves);
  const request: D1SupportRequest = {
    project,
    moduleName,
    grants,
    relationships: relationshipsOf(index),
    scopePlans: plansOf(controllers),
    citedGrantIds: citedOf(controllers),
    adapters: adaptersOf(persistence),
    files,
    existingHelpers: helpersOf(previous),
    applicationEdges: [...edgesOf(usecases), ...edgesOf(controllers)],
    formFields: formFieldsOf(controllers),
    enumerations: enumerationsOf(controllers),
    tables: tablesOf(persistence),
    models,
    journeys: journeys.journeys,
    missingJourneys: journeys.missing,
    roleTags: [...roleTags, ...actorTags(grants, models)],
    seedRefs: [],
    existingDatasets: datasetsOf(previous),
    maintenance: null,
    outbound: linked.outbound,
    selectedEventIds: [...snapshot.selection.outbound].sort(),
    usecaseIds,
    transitionUsecases,
    operationUsecases,
    operations: linked.operations,
    processes,
    enumSnapshot: await enumSnapshotOf(project, moduleName, snapshot),
  };
  const testSupport = await testSupportOf(project, snapshot, paths.backend);
  if ('items' in testSupport) {
    if (testSupport.items) request.testSupport = testSupport.items;
  } else {
    request.testSupportUnread = testSupport.unread;
  }
  return { build: withDisclosureProblems(buildD1Support(request), accessGrants.problems), files };
}

export async function commitD1Support(
  project: number,
  build: D1SupportBuild,
  files: readonly D1SupportFile[],
): Promise<{ written: string[]; issues: string[] }> {
  const draftInfo = draftFile(project, build.moduleName, 'support70');
  const draftText = `${JSON.stringify(build, null, 2)}\n`;
  const currentDraft = await readText(draftInfo);
  if (currentDraft !== draftText) await writeJson(draftInfo, build);
  if (!build.ok) return { written: [], issues: build.problems.filter(problem => problem.severity === 'error').map(problem => problem.message) };
  const rendered = renderParts(project, build.emit, files);
  if (rendered.issues.length > 0) return { written: [], issues: rendered.issues };
  const committed = await commitD1Unit({
    project,
    moduleName: build.moduleName,
    step: 'support70',
    unitId: 'support70',
    draftText,
    parts: [...rendered.parts, ...removalParts(project, build, files)],
  });
  return { written: committed.written, issues: committed.issues };
}

/** A support def is removed only when this build did not keep it for a live consumer. */
export function supportFilesToRemove(build: D1SupportBuild, files: readonly D1SupportFile[]): D1SupportFile[] {
  const emitted = new Set(build.emit.map(part => logicalDefPath(part.pipeline[0]?.defPath || '')));
  return files.filter(file => {
    if (file.action !== 'remove') return false;
    const path = logicalDefPath(file.defPath);
    if (emitted.has(path)) return false;
    const kept = build.normalizations.some(item =>
      (item.code === 'REGISTRY_KEPT' || item.code === 'DATASET_KEPT')
      && logicalDefPath(item.path) === path);
    return !kept;
  });
}

function removalParts(project: number, build: D1SupportBuild, files: readonly D1SupportFile[]): D1UnitPart[] {
  return supportFilesToRemove(build, files).map(file => ({
    defPath: qualifyDefPath(project, logicalDefPath(file.defPath)),
    source: '',
    action: 'remove' as const,
    receiptHash: file.contentHash,
    outputTs: [futureOutputPath(logicalDefPath(file.defPath))].filter(Boolean),
  }));
}

function renderParts(
  project: number,
  emit: readonly { definition: Parameters<typeof renderDefinition>[0]; pipeline: { defPath: string; outputPath: string }[]; blockReason?: string }[],
  files: readonly D1SupportFile[],
): { parts: D1UnitPart[]; issues: string[] } {
  const parts: D1UnitPart[] = [];
  const issues: string[] = [];
  for (const part of emit) {
    const rendered = renderDefinition(part.definition, part.pipeline[0]?.defPath || '');
    if ('issues' in rendered) {
      issues.push(...rendered.issues);
      continue;
    }
    const defPath = part.pipeline[0]?.defPath || '';
    if (!artifactFile(project, defPath)) {
      issues.push(`defPath is not a file this agent can write: ${defPath}.`);
      continue;
    }
    const logical = logicalDefPath(defPath);
    const receipt = files.find(item => item.defPath === logical || qualifyDefPath(project, item.defPath) === defPath);
    parts.push({
      defPath,
      source: rendered.source,
      receiptHash: receipt?.contentHash || '',
      outputTs: [part.pipeline[0]?.outputPath || ''].filter(Boolean),
      ...(part.blockReason ? { blockReason: part.blockReason } : {}),
    });
  }
  return { parts, issues };
}

async function receiptFiles(
  project: number,
  planned: readonly { artifactType: string; defPath: string; action: string; contentHash?: string }[],
): Promise<D1SupportFile[]> {
  const files: D1SupportFile[] = [];
  for (const file of planned) {
    if (!SUPPORT_TYPES.has(file.artifactType)) continue;
    const text = await readLogical(project, file.defPath);
    files.push({
      artifactType: file.artifactType,
      defPath: file.defPath,
      action: file.action,
      contentHash: file.contentHash || '',
      currentHash: text == null ? '' : await sourceIdentityHash(text),
    });
  }
  return files;
}

const ENUM_DEF_TYPES = new Set(['usecase', 'domainEntity', 'persistenceSeeds']);

/** Ontology and catalog texts whose snapshot digest matches, plus defs this run already wrote. */
async function enumSnapshotOf(
  project: number,
  moduleName: string,
  snapshot: D1InputSnapshot,
): Promise<D1SupportRequest['enumSnapshot']> {
  const sources: Record<string, string> = {};
  for (const source of snapshot.sources) {
    if (source.state !== 'present') continue;
    const text = await readLogical(project, source.path);
    if (text == null || await sha256Text(text) !== source.sha256) continue;
    sources[source.path] = text;
  }
  const catalogs = new Set<string>();
  for (const text of Object.values(sources)) {
    const parsed = parseD1Source(text, 'defs');
    if (isRecord(parsed) && typeof parsed.source === 'string' && parsed.source) catalogs.add(parsed.source);
  }
  for (const source of catalogs) {
    if (sources[source]) continue;
    const info = catalogInfo(source);
    if (!info) continue;
    const text = await readText(info);
    if (text == null) continue;
    const listed = snapshot.sources.find(item => item.path === source);
    if (listed && listed.sha256 !== await sha256Text(text)) continue;
    sources[source] = text;
  }
  const definitions: string[] = [];
  for (const file of snapshot.files) {
    if (!ENUM_DEF_TYPES.has(file.artifactType)) continue;
    const text = await readLogical(project, logicalDefPath(file.defPath));
    if (text) definitions.push(text);
  }
  return {
    sources,
    definitions,
    tables: snapshot.selection.tables.map(table => ({ tableId: table.tableId, entityId: table.entity })),
  };
}

/**
 * `testSupport[]` of the backend plan input20 accepted. Read only when the bytes still match
 * the digest of the snapshot; input20 refuses a plan without the array (d1_39). Changed bytes are named.
 */
async function testSupportOf(project: number, snapshot: D1InputSnapshot, backendPath: string): Promise<{ items: unknown[] | undefined } | { unread: string }> {
  const listed = snapshot.sources.find(source => source.path === backendPath);
  if (!listed || listed.state !== 'present') return { items: undefined };
  const text = await readLogical(project, backendPath);
  if (text == null || await sha256Text(text) !== listed.sha256) {
    return { unread: `${backendPath} changed after input20 (digest differs); its testSupport was not read and the seeds def carries no certification fixture. Run input20 again.` };
  }
  const parsed = parseD1Source(text, 'json');
  return { items: isRecord(parsed) && Array.isArray(parsed.testSupport) ? parsed.testSupport : undefined };
}

async function readLogical(project: number, logical: string): Promise<string | null> {
  const file = artifactFile(project, qualifyDefPath(project, logical));
  if (!file) return null;
  return readText(file);
}

function parseDraft(text: string, schemaVersion: string, project: number, moduleName: string): Record<string, unknown> | null {
  const parsed = parseObject(text);
  if (!parsed || parsed.schemaVersion !== schemaVersion || parsed.project !== project || parsed.moduleName !== moduleName) return null;
  return parsed;
}

function parseObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** `summaryOnly` is the L4 name of `fieldsOnly`. Any other mode is an error on the grant. Serve requests add one technical grant per connection. */
export function accessGrantsOf(
  access: unknown,
  entities: Record<string, unknown>,
  requests: readonly { serves?: string }[] = [],
): { grants: D1ControllerGrant[]; problems: D1ControllerProblem[] } {
  const grants: D1ControllerGrant[] = [];
  const problems: D1ControllerProblem[] = [];
  if (isRecord(access) && Array.isArray(access.grants)) for (const grant of access.grants) {
    if (!isRecord(grant) || typeof grant.grantId !== 'string' || typeof grant.actorRef !== 'string') continue;
    const disclosure = isRecord(grant.disclosure) ? grant.disclosure : {};
    const scope = isRecord(grant.dataScope) ? grant.dataScope : {};
    const declared = disclosure.mode;
    const known = declared === 'fullRecord' || declared === 'fieldsOnly' || declared === 'summaryOnly';
    if (!known) {
      problems.push({
        severity: 'error',
        code: 'DISCLOSURE_MODE',
        path: grant.grantId,
        message: `Grant ${grant.grantId} disclosure mode ${JSON.stringify(declared ?? null)} is not fullRecord, fieldsOnly, or summaryOnly.`,
      });
      continue;
    }
    const mode = declared === 'summaryOnly' ? 'fieldsOnly' : declared;
    const entityRefs = stringList(grant.entityRefs);
    const allowedFields = stringList(disclosure.allowedFields);
    grants.push({
      grantId: grant.grantId,
      actorRef: grant.actorRef,
      entityRefs,
      disclosure: mode,
      allowedFields: mode === 'fieldsOnly'
        ? resolveAllowedFields({
          grantId: grant.grantId,
          entityRefs,
          allowedFields: Array.isArray(disclosure.allowedFields) ? allowedFields : undefined,
          deniedFields: stringList(disclosure.deniedFields),
        }, entities)
        : allowedFields,
      anchorEntity: typeof scope.anchorEntity === 'string' ? scope.anchorEntity : '',
      scopeMode: typeof scope.mode === 'string' ? scope.mode : '',
    });
  }
  const seen = new Set(grants.map(grant => grant.grantId));
  for (const grant of serveControllerGrants(requests)) {
    if (seen.has(grant.grantId)) continue;
    seen.add(grant.grantId);
    grants.push(grant);
  }
  return { grants, problems };
}

function withDisclosureProblems<T extends { ok: boolean; problems: D1ControllerProblem[]; emit: unknown[] }>(
  build: T,
  problems: readonly D1ControllerProblem[],
): T {
  if (problems.length === 0) return build;
  return { ...build, ok: false, problems: [...build.problems, ...problems], emit: [] };
}

async function entitiesOf(project: number, moduleName: string, index: unknown): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  if (!isRecord(index) || !Array.isArray(index.entities)) return out;
  for (const entity of index.entities) {
    if (!isRecord(entity) || typeof entity.entityId !== 'string') continue;
    const text = await readLogical(project, entityPath(moduleName, entity.entityId));
    const parsed = text ? parseD1Source(text, 'defs') : null;
    if (isRecord(parsed)) out[entity.entityId] = parsed;
  }
  return out;
}

function relationshipsOf(index: unknown): D1ControllerRelationship[] {
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

function plansOf(draft: Record<string, unknown>): D1ScopeGrantPlan[] {
  const out: D1ScopeGrantPlan[] = [];
  const seen = new Set<string>();
  for (const controller of arrayOf(draft.controllers)) {
    for (const handler of arrayOf(isRecord(controller) ? controller.handlers : [])) {
      for (const plan of arrayOf(isRecord(handler) ? handler.scopePlan : [])) {
        if (!isRecord(plan) || typeof plan.grantId !== 'string' || seen.has(plan.grantId)) continue;
        seen.add(plan.grantId);
        const disclosure = plan.disclosure === 'fullRecord' || plan.disclosure === 'fieldsOnly' ? plan.disclosure : '';
        if (!disclosure) continue;
        out.push({
          grantId: plan.grantId,
          actorRef: typeof plan.actorRef === 'string' ? plan.actorRef : '',
          entityRefs: stringList(plan.entityRefs),
          disclosure,
          allowedFields: stringList(plan.allowedFields),
          anchorEntity: typeof plan.anchorEntity === 'string' ? plan.anchorEntity : '',
          relationships: arrayOf(plan.relationships).flatMap(rel => {
            if (!isRecord(rel) || typeof rel.relationshipId !== 'string') return [];
            return [{
              relationshipId: rel.relationshipId,
              from: typeof rel.from === 'string' ? rel.from : '',
              to: typeof rel.to === 'string' ? rel.to : '',
              field: typeof rel.field === 'string' ? rel.field : '',
            }];
          }),
          pending: typeof plan.pending === 'string' ? plan.pending : '',
          emittedBy: 'support70',
        });
      }
    }
  }
  return out;
}

function citedOf(draft: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (const controller of arrayOf(draft.controllers)) {
    for (const handler of arrayOf(isRecord(controller) ? controller.handlers : [])) {
      if (!isRecord(handler)) continue;
      for (const grantId of stringList(handler.grantIds)) {
        if (!ids.includes(grantId)) ids.push(grantId);
      }
    }
  }
  return ids;
}

function adaptersOf(draft: Record<string, unknown>): D1SupportRequest['adapters'] {
  const out: D1SupportRequest['adapters'] = [];
  for (const adapter of arrayOf(draft.adapters)) {
    if (!isRecord(adapter) || typeof adapter.portId !== 'string') continue;
    const definition = isRecord(adapter.definition) ? adapter.definition : null;
    out.push({
      portId: adapter.portId,
      entityId: typeof adapter.entityId === 'string' ? adapter.entityId : '',
      tableId: typeof adapter.tableId === 'string' ? adapter.tableId : '',
      artifactId: definition && typeof definition.artifactId === 'string' ? definition.artifactId : adapter.portId,
      action: typeof adapter.action === 'string' ? adapter.action : '',
      defPath: typeof adapter.defPath === 'string' ? adapter.defPath : '',
    });
  }
  return out;
}

function helpersOf(draft: Record<string, unknown> | null): D1SupportHelper[] {
  if (!draft || draft.schemaVersion !== D1_SUPPORT_VERSION || !Array.isArray(draft.helpers)) return [];
  const out: D1SupportHelper[] = [];
  for (const helper of draft.helpers) {
    if (!isRecord(helper) || typeof helper.helperId !== 'string') continue;
    out.push({
      helperId: helper.helperId,
      session: 'verified',
      steps: arrayOf(helper.steps).flatMap(step => {
        if (!isRecord(step) || typeof step.relationshipId !== 'string') return [];
        return [{
          relationshipId: step.relationshipId,
          from: typeof step.from === 'string' ? step.from : '',
          to: typeof step.to === 'string' ? step.to : '',
          field: typeof step.field === 'string' ? step.field : '',
        }];
      }),
      consumers: stringList(helper.consumers),
    });
  }
  return out;
}

function edgesOf(draft: Record<string, unknown> | null): D1SupportRequest['applicationEdges'] {
  if (!draft || !Array.isArray(draft.emit)) return [];
  const out: D1SupportRequest['applicationEdges'] = [];
  for (const part of draft.emit) {
    const pipeline = isRecord(part) && Array.isArray(part.pipeline) ? part.pipeline[0] : null;
    if (!isRecord(pipeline)) continue;
    out.push({
      id: typeof pipeline.id === 'string' ? pipeline.id : '',
      type: typeof pipeline.type === 'string' ? pipeline.type : '',
      dependsOn: stringList(pipeline.dependsOn),
    });
  }
  return out;
}

function formFieldsOf(draft: Record<string, unknown>): string[] {
  const names: string[] = [];
  for (const problem of arrayOf(draft.problems)) {
    if (!isRecord(problem) || problem.code !== 'FORM_IDENTITY' || typeof problem.message !== 'string') continue;
    const match = /Form field (\w+)/.exec(problem.message);
    if (match && !names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

function enumerationsOf(draft: Record<string, unknown>): D1SupportRequest['enumerations'] {
  const out: D1SupportRequest['enumerations'] = [];
  for (const item of arrayOf(draft.enumerations)) {
    if (!isRecord(item) || typeof item.entityId !== 'string' || typeof item.path !== 'string') continue;
    out.push({ entityId: item.entityId, path: item.path, values: stringList(item.values) });
  }
  return out;
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function tablesOf(draft: Record<string, unknown>): D1SupportRequest['tables'] {
  const out: D1SupportRequest['tables'] = [];
  for (const table of arrayOf(draft.tables)) {
    if (!isRecord(table) || typeof table.tableId !== 'string' || typeof table.entityId !== 'string') continue;
    const definition = isRecord(table.definition) ? table.definition : null;
    const data = definition && isRecord(definition.data) ? definition.data : null;
    out.push({
      tableId: table.tableId,
      entityId: table.entityId,
      action: typeof table.action === 'string' ? table.action : '',
      defPath: typeof table.defPath === 'string' ? table.defPath : '',
      uniqueKeys: pairsOf(data?.uniqueKeys),
    });
  }
  return out;
}

function modelsOf(draft: Record<string, unknown>, index: unknown): D1SeedModel[] {
  const kinds = new Map<string, string>();
  if (isRecord(index)) {
    for (const entity of arrayOf(index.entities)) {
      if (!isRecord(entity) || typeof entity.entityId !== 'string') continue;
      kinds.set(entity.entityId, typeof entity.kind === 'string' ? entity.kind : '');
    }
  }
  const out: D1SeedModel[] = [];
  for (const entity of arrayOf(draft.entities)) {
    if (!isRecord(entity) || typeof entity.entityId !== 'string') continue;
    const definition = isRecord(entity.definition) ? entity.definition : null;
    const data = definition && isRecord(definition.data) ? definition.data : {};
    const fields = arrayOf(data.fields).flatMap(field => {
      if (!isRecord(field) || typeof field.name !== 'string') return [];
      return [{ name: field.name, type: typeof field.type === 'string' ? field.type : '' }];
    });
    const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : {};
    const storageTarget = typeof entity.storageTarget === 'string' ? entity.storageTarget : '';
    const kind = kinds.get(entity.entityId) === 'role' || storageTarget === 'mdm' ? 'role' : 'entity';
    out.push({
      entityId: entity.entityId,
      storageTarget,
      kind,
      namespace: '',
      fields,
      states: arrayOf(lifecycle.states).flatMap(state => {
        if (!isRecord(state) || typeof state.state !== 'string' || !state.state) return [];
        return [state.state];
      }),
      initialState: typeof entity.derivedInitial === 'string' ? entity.derivedInitial : '',
      uniqueKeys: pairsOf(entity.uniqueKeys),
      transitions: arrayOf(lifecycle.transitions).flatMap(transition => {
        if (!isRecord(transition) || typeof transition.transitionId !== 'string') return [];
        return [{
          transitionId: transition.transitionId,
          to: typeof transition.to === 'string' ? transition.to : '',
          ruleRefs: stringList(transition.ruleRefs),
        }];
      }),
      noteField: fields.find(field => field.name === 'attendanceNote' || field.name.endsWith('.attendanceNote'))?.name || '',
    });
  }
  return out;
}

async function journeysOf(
  project: number,
  moduleName: string,
): Promise<{ journeys: D1SeedJourney[]; missing: string[] }> {
  const journeyIndexText = await readLogical(project, inputPaths(moduleName).journeyIndex);
  const journeyIndex = journeyIndexText ? parseD1Source(journeyIndexText, 'defs') : null;
  if (!isRecord(journeyIndex) || !Array.isArray(journeyIndex.journeys)) return { journeys: [], missing: [] };
  const journeys: D1SeedJourney[] = [];
  const missing: string[] = [];
  for (const item of journeyIndex.journeys) {
    if (!isRecord(item) || typeof item.journeyId !== 'string' || !item.journeyId) continue;
    const text = await readLogical(project, journeyPath(moduleName, item.journeyId));
    const parsed = text ? parseD1Source(text, 'defs') : null;
    if (!isRecord(parsed)) {
      missing.push(item.journeyId);
      continue;
    }
    journeys.push(journeyOf(item.journeyId, parsed));
  }
  return { journeys, missing };
}

function journeyOf(journeyId: string, parsed: Record<string, unknown>): D1SeedJourney {
  const business = isRecord(parsed.business) ? parsed.business : parsed;
  const entities: string[] = [];
  const effects: D1SeedJourney['effects'] = [];
  for (const step of arrayOf(business.steps)) {
    if (!isRecord(step) || typeof step.entity !== 'string' || !step.entity) continue;
    if (!entities.includes(step.entity)) entities.push(step.entity);
    const effect = typeof step.effect === 'string' ? step.effect : '';
    if (!effect) continue;
    effects.push({
      entityId: step.entity,
      effect,
      transitionRef: typeof step.transitionRef === 'string' ? step.transitionRef : '',
    });
  }
  return { journeyId, entities, effects };
}

async function roleTagsOf(project: number, moduleName: string, index: unknown): Promise<D1SeedRoleTag[]> {
  if (!isRecord(index) || !Array.isArray(index.entities)) return [];
  const tags: D1SeedRoleTag[] = [];
  for (const entity of index.entities) {
    if (!isRecord(entity) || typeof entity.entityId !== 'string') continue;
    const text = await readLogical(project, entityPath(moduleName, entity.entityId));
    const parsed = text ? parseD1Source(text, 'defs') : null;
    if (!isRecord(parsed) || !isRecord(parsed.relationships)) continue;
    for (const rel of Object.values(parsed.relationships)) {
      if (!isRecord(rel) || typeof rel.role !== 'string' || !rel.role) continue;
      const entityId = typeof rel.to === 'string' ? rel.to : '';
      if (!entityId || rel.role === entityId) continue;
      if (tags.some(tag => tag.tag === rel.role && tag.entityId === entityId)) continue;
      tags.push({ tag: rel.role, entityId });
    }
  }
  return tags;
}

function actorTags(grants: D1SupportRequest['grants'], models: readonly D1SeedModel[]): D1SeedRoleTag[] {
  const ids = new Set(models.map(model => model.entityId));
  const tags: D1SeedRoleTag[] = [];
  for (const grant of grants) {
    const tag = grant.actorRef;
    if (!tag || ids.has(tag) || tags.some(item => item.tag === tag)) continue;
    const entityId = [...ids].find(id => id.toLowerCase() === tag.toLowerCase()) || '';
    tags.push({ tag, entityId });
  }
  return tags;
}

function datasetsOf(draft: Record<string, unknown> | null): D1SeedDataset[] {
  if (!draft || draft.schemaVersion !== D1_SUPPORT_VERSION || !isRecord(draft.seedPlan)) return [];
  const out: D1SeedDataset[] = [];
  for (const item of arrayOf(draft.seedPlan.datasets)) {
    if (!isRecord(item) || typeof item.datasetId !== 'string' || typeof item.tableId !== 'string') continue;
    out.push({ datasetId: item.datasetId, tableId: item.tableId, owners: stringList(item.owners) });
  }
  return out;
}

/** Inbound operations come from the L4 effect, never from a name built out of the entity. */
export function inboundOperation(
  row: Record<string, unknown>,
  selected: readonly D1SelectedUsecase[],
): D1EffectOperation | null {
  if (typeof row.id !== 'string' || !row.id) return null;
  const effect = typeof row.effect === 'string' ? row.effect : '';
  const operations: string[] = [];
  if (effect === 'transition') {
    const transitionRef = typeof row.transitionRef === 'string' ? row.transitionRef : '';
    const transitions = transitionUsecasesOf(selected);
    for (const entity of transitionRef ? stringList(row.writes) : []) {
      // Unselected: the entity transition stays named, and the pool check reports it.
      const operation = transitionUsecaseFor(transitions, entity, transitionRef) || `${entity}.${transitionRef}`;
      if (!operations.includes(operation)) operations.push(operation);
    }
  } else if (effect === 'create' || effect === 'update') {
    for (const entity of stringList(row.writes)) {
      const match = selected.find(item => item.entity === entity && item.operation === effect);
      if (match?.usecaseId && !operations.includes(match.usecaseId)) operations.push(match.usecaseId);
    }
  }
  const known = new Set(selected.flatMap(item => [item.usecaseId, item.identity]).filter(Boolean));
  const consumer = operations.find(item => known.has(item)) || row.id;
  return { id: row.id, kind: 'inbound', operations, mechanism: '', consumer, scheduled: false };
}

async function effectsOf(
  project: number,
  moduleName: string,
  selected: readonly D1SelectedUsecase[],
): Promise<{ outbound: D1EffectEvent[]; operations: D1EffectOperation[] }> {
  const paths = inputPaths(moduleName);
  const integrationText = await readLogical(project, paths.integration);
  const integration = integrationText ? parseD1Source(integrationText, 'defs') : null;
  const known = new Set(selected.flatMap(item => [item.usecaseId, item.identity]).filter(Boolean));
  const payloadCache = new Map<string, unknown>();
  const outbound: D1EffectEvent[] = [];
  if (isRecord(integration)) {
    for (const row of arrayOf(integration.outbound)) {
      if (!isRecord(row) || typeof row.id !== 'string' || !row.id) continue;
      const on = typeof row.on === 'string' ? row.on : '';
      outbound.push({
        eventId: row.id,
        on,
        mechanism: typeof row.mechanism === 'string' ? row.mechanism : '',
        payloadDeclared: await payloadOf(project, moduleName, on, payloadCache),
      });
    }
  }
  const operations: D1EffectOperation[] = [];
  if (isRecord(integration)) {
    for (const row of arrayOf(integration.inbound)) {
      if (!isRecord(row)) continue;
      const inbound = inboundOperation(row, selected);
      if (inbound) operations.push(inbound);
    }
    for (const row of arrayOf(integration.plugins)) {
      if (!isRecord(row) || typeof row.pluginId !== 'string' || !row.pluginId) continue;
      const usedBy = stringList(row.usedBy);
      const consumer = usedBy.find(item => inSelected(item, known)) || row.pluginId;
      operations.push({
        id: row.pluginId,
        kind: 'plugin',
        operations: usedBy,
        mechanism: typeof row.mechanism === 'string' ? row.mechanism : '',
        consumer,
        scheduled: false,
      });
    }
    const callRows = arrayOf(integration.connections);
    const catalogs = await connectionCatalogs(callRows);
    const journeys = await connectionJourneys(project, moduleName, callRows);
    const workflowsText = await readLogical(project, inputPaths(moduleName).workflows);
    const workflows = workflowsText ? parseD1Source(workflowsText, 'defs') : null;
    const processes = isRecord(workflows) ? arrayOf(workflows.processes) : [];
    operations.push(...connectionOperations(callRows, selected, catalogs, journeys, processes));
  }
  return { outbound, operations };
}

function connectionEffect(value: string): D1EffectOperation['effect'] | undefined {
  if (value === 'list' || value === 'read' || value === 'create' || value === 'update' || value === 'remove') return value;
  return undefined;
}

/**
 * Operations of one catalog file. `null` when the exported object is not a catalog.
 * The catalog is `export const <id>: ConnectionCatalog = { ... }` with JSON keys; `parseD1Source` skips the annotation,
 * without a static import outside this agent.
 */
export function catalogOperationsOf(source: string): D1CatalogOperation[] | null {
  const parsed = parseD1Source(source, 'defs');
  if (!isRecord(parsed) || !Array.isArray(parsed.operations)) return null;
  const operations: D1CatalogOperation[] = [];
  for (const row of parsed.operations) {
    if (!isRecord(row) || typeof row.operationId !== 'string' || !row.operationId) continue;
    const direction = row.direction === 'call' || row.direction === 'serve' ? row.direction : '';
    operations.push({ operationId: row.operationId, direction });
  }
  return operations;
}

/**
 * One operation per `call` line. A `serve` line is ignored.
 * `catalogs[connectionId]` is `null` when the catalog file was not read.
 * The consumer of a step in `usedBy` comes from `externalCallsOf` (locate and inspect included).
 */
export function connectionOperations(
  rows: readonly unknown[],
  selected: readonly D1SelectedUsecase[],
  catalogs: Readonly<Record<string, readonly D1CatalogOperation[] | null>>,
  journeys: Record<string, unknown> = {},
  processes: readonly unknown[] = [],
): D1EffectOperation[] {
  const matches = externalCallsOf({ journeys, connections: rows, usecases: selected, entityKind: new Map(), allEntities: true });
  const out: D1EffectOperation[] = [];
  for (const row of rows) {
    if (!isRecord(row) || row.direction !== 'call') continue;
    const connectionId = typeof row.connectionId === 'string' ? row.connectionId : '';
    const operationId = typeof row.operationId === 'string' ? row.operationId : '';
    if (!connectionId || !operationId) continue;
    const effect = typeof row.effect === 'string' ? connectionEffect(row.effect) : undefined;
    const entityRefs = stringList(row.entityRefs);
    // One call can serve the steps of several usecases (the same `updateAgent` for three entities): one line per consumer.
    const consumers = callConsumers(connectionId, operationId, stringList(row.usedBy), selected, matches, journeys, processes);
    for (const consumer of consumers) {
      out.push({
        id: `${connectionId}.${operationId}`,
        kind: 'connection',
        operations: [],
        mechanism: '',
        consumer,
        scheduled: false,
        connectionId,
        operationId,
        ...(entityRefs.length ? { entityRefs } : {}),
        ...(effect ? { effect } : {}),
        catalogOps: Object.hasOwn(catalogs, connectionId) ? catalogs[connectionId] : null,
      });
    }
  }
  return out;
}

/** Every usecase whose steps the call serves (`externalCallsOf`), the processes whose tasks it serves, then the one `connectionConsumer` names; `['']` when none. */
function callConsumers(
  connectionId: string,
  operationId: string,
  usedBy: readonly string[],
  selected: readonly D1SelectedUsecase[],
  matches: readonly D1ExternalCallMatch[],
  journeys: Record<string, unknown>,
  processes: readonly unknown[],
): string[] {
  const own = matches
    .filter(match => match.calls.some(call => call.connectionId === connectionId && call.operationId === operationId))
    .map(match => {
      const usecase = selected.find(item => item.usecaseId === match.usecaseId);
      return usecase ? usecase.identity || usecase.usecaseId : '';
    });
  const consumers = [...new Set([...own, ...processConsumersOf(usedBy, processes), connectionConsumer(usedBy, selected, matches, journeys, `${connectionId}.${operationId}`)].filter(Boolean))].sort();
  return consumers.length ? consumers : [''];
}

function connectionConsumer(
  usedBy: readonly string[],
  selected: readonly D1SelectedUsecase[],
  matches: readonly D1ExternalCallMatch[],
  journeys: Record<string, unknown>,
  callKey: string,
): string {
  const known = new Set(selected.flatMap(item => [item.usecaseId, item.identity]).filter(Boolean));
  for (const ref of usedBy) {
    if (known.has(ref)) return ref;
    // A usecase that serves this call (a split names one call, d1_195): another usecase of the same step is not its consumer.
    const served = matches.find(item => item.steps.includes(ref) && item.calls.some(call => `${call.connectionId}.${call.operationId}` === callKey));
    if (served) {
      const usecase = selected.find(item => item.usecaseId === served.usecaseId);
      if (usecase) return usecase.identity || usecase.usecaseId;
    }
    if (journeyListsStep(journeys, ref)) continue;
    const head = ref.split('.')[0] || '';
    if (head && known.has(head)) return head;
  }
  return '';
}

/** The ref is `journeyId.stepId` and that step is on the journey. The first segment is not a usecase id then. */
function journeyListsStep(journeys: Record<string, unknown>, ref: string): boolean {
  const dot = ref.indexOf('.');
  if (dot <= 0) return false;
  const journey = journeys[ref.slice(0, dot)];
  if (!isRecord(journey)) return false;
  const stepId = ref.slice(dot + 1);
  const business = isRecord(journey.business) ? journey.business : {};
  const rows = arrayOf(business.steps).length ? arrayOf(business.steps) : arrayOf(journey.steps);
  return rows.some(step => isRecord(step) && step.stepId === stepId);
}

async function connectionCatalogs(rows: readonly unknown[]): Promise<Record<string, readonly D1CatalogOperation[] | null>> {
  const catalogs: Record<string, readonly D1CatalogOperation[] | null> = {};
  for (const row of rows) {
    if (!isRecord(row) || row.direction !== 'call' || typeof row.connectionId !== 'string' || !row.connectionId) continue;
    if (Object.hasOwn(catalogs, row.connectionId)) continue;
    const info = catalogInfo(`/_102034_/l4/ontology/connections/${row.connectionId}.defs.ts`);
    if (!info) {
      catalogs[row.connectionId] = null;
      continue;
    }
    const text = await readText(info);
    catalogs[row.connectionId] = text ? await catalogOperationsOf(text) : null;
  }
  return catalogs;
}

/** Journeys cited by a call `usedBy`, with every step (`act`, `locate`, `inspect`). */
async function connectionJourneys(
  project: number,
  moduleName: string,
  rows: readonly unknown[],
): Promise<Record<string, unknown>> {
  const journeys: Record<string, unknown> = {};
  const journeyIds = new Set<string>();
  for (const row of rows) {
    if (!isRecord(row) || row.direction !== 'call') continue;
    for (const ref of stringList(row.usedBy)) {
      const dot = ref.indexOf('.');
      if (dot > 0) journeyIds.add(ref.slice(0, dot));
    }
  }
  for (const journeyId of journeyIds) {
    const text = await readLogical(project, journeyPath(moduleName, journeyId));
    const parsed = text ? parseD1Source(text, 'defs') : null;
    if (isRecord(parsed)) journeys[journeyId] = parsed;
  }
  return journeys;
}

interface D1ProcessAct {
  stepId: string;
  entity: string;
  effect: string;
  transitionRef: string;
}

/** L4 processes as plans. Occurrence and operations follow the workflowProcess rule. No def is written. */
export async function processesOf(
  project: number,
  moduleName: string,
  selected: readonly D1SelectedUsecase[],
  serves: ReadonlySet<string> = new Set(),
): Promise<D1ProcessPlan[]> {
  const text = await readLogical(project, inputPaths(moduleName).workflows);
  const workflows = text ? parseD1Source(text, 'defs') : null;
  if (!isRecord(workflows)) return [];
  const transitions = transitionUsecasesOf(selected);
  const operationUsecases = operationUsecasesOf(selected);
  const decisions = arrayOf(workflows.journeyDecisions).flatMap(row => {
    if (!isRecord(row) || row.inProcess !== true || typeof row.journeyId !== 'string' || !row.journeyId) return [];
    if (typeof row.processId !== 'string' || !row.processId) return [];
    return [{ journeyId: row.journeyId, processId: row.processId }];
  });
  const acts = new Map<string, D1ProcessAct[]>();
  for (const journeyId of [...new Set(decisions.map(item => item.journeyId))]) {
    acts.set(journeyId, await journeyActs(project, moduleName, journeyId));
  }
  const plans: D1ProcessPlan[] = [];
  for (const row of arrayOf(workflows.processes)) {
    if (!isRecord(row) || typeof row.processId !== 'string' || !row.processId) continue;
    const tasks = arrayOf(row.tasks).filter(isRecord);
    const first = tasks[0];
    if (first && first.kind === 'human' && typeof first.journeyRef === 'string' && first.journeyRef && !acts.has(first.journeyRef)) {
      acts.set(first.journeyRef, await journeyActs(project, moduleName, first.journeyRef));
    }
    const humanJourneys = decisions.filter(item => item.processId === row.processId).map(item => item.journeyId);
    const lines = new Map<string, { operation: string; steps: string[]; selected: boolean }>();
    const add = (entity: string, effect: string, transitionRef: string, step: string) => {
      const name = effect === 'transition' ? transitionRef : effect;
      if (!entity || !name || (effect !== 'create' && effect !== 'update' && effect !== 'transition')) return;
      const operation = `${entity}.${name}`;
      const picked = effect === 'transition'
        ? transitionUsecaseFor(transitions, entity, transitionRef) !== ''
        : operationUsecases.some(item => item.entity === entity && item.operation === effect);
      const line = lines.get(operation) || { operation, steps: [], selected: picked };
      if (!line.steps.includes(step)) line.steps.push(step);
      lines.set(operation, line);
    };
    for (const journeyId of humanJourneys) {
      for (const act of acts.get(journeyId) || []) {
        add(act.entity, act.effect, act.transitionRef, `journey:${journeyId}/${act.stepId}`);
      }
    }
    for (const task of tasks) {
      if (task.kind !== 'mechanical' && task.kind !== 'llm') continue;
      const taskId = typeof task.taskId === 'string' ? task.taskId : '';
      if (!taskId) continue;
      add(
        typeof task.entityRef === 'string' ? task.entityRef : '',
        typeof task.effect === 'string' ? task.effect : '',
        typeof task.transitionRef === 'string' ? task.transitionRef : '',
        `task:${taskId}`,
      );
    }
    const functions = arrayOf(row.functions).flatMap(item => (
      isRecord(item) && typeof item.functionId === 'string' && item.functionId ? [item.functionId] : []
    ));
    plans.push({
      processId: row.processId,
      trigger: triggerOf(isRecord(row.trigger) ? row.trigger : {}),
      occurrence: occurrenceOf(isRecord(row.trigger) ? row.trigger : {}, tasks, acts, serves),
      functions: [...new Set(functions)],
      operations: [...lines.values()].sort((left, right) => left.operation.localeCompare(right.operation)),
      humanJourneys: [...new Set(humanJourneys)],
    });
  }
  return plans;
}

function triggerOf(row: Record<string, unknown>): D1ProcessPlan['trigger'] {
  const kind = row.kind === 'event' || row.kind === 'scheduled' ? row.kind : 'manual';
  if (kind === 'event') return typeof row.event === 'string' && row.event ? { kind, event: row.event } : { kind };
  if (kind === 'scheduled') return typeof row.schedule === 'string' && row.schedule ? { kind, schedule: row.schedule } : { kind };
  return typeof row.actorRef === 'string' && row.actorRef ? { kind, actorRef: row.actorRef } : { kind };
}

function occurrenceOf(
  trigger: Record<string, unknown>,
  tasks: Record<string, unknown>[],
  acts: ReadonlyMap<string, D1ProcessAct[]>,
  serves: ReadonlySet<string>,
): string {
  // An event that a connection serves (`<connectionId>.<operationId>`) names no entity: the record is the first task's.
  if (trigger.kind === 'event' && typeof trigger.event === 'string' && trigger.event.includes('.') && !serves.has(trigger.event)) {
    return trigger.event.split('.')[0] || '';
  }
  const task = tasks[0];
  if (!task) return '';
  if ((task.kind === 'mechanical' || task.kind === 'llm') && typeof task.entityRef === 'string') return task.entityRef;
  if (task.kind !== 'human' || typeof task.journeyRef !== 'string') return '';
  const steps = acts.get(task.journeyRef) || [];
  const created = steps.find(step => step.effect === 'create');
  return (created || steps[0])?.entity || '';
}

async function journeyActs(project: number, moduleName: string, journeyId: string): Promise<D1ProcessAct[]> {
  const text = await readLogical(project, journeyPath(moduleName, journeyId));
  const parsed = text ? parseD1Source(text, 'defs') : null;
  if (!isRecord(parsed)) return [];
  const business = isRecord(parsed.business) ? parsed.business : parsed;
  const acts: D1ProcessAct[] = [];
  for (const step of arrayOf(business.steps)) {
    if (!isRecord(step) || step.kind !== 'act' || typeof step.stepId !== 'string' || !step.stepId) continue;
    if (typeof step.entity !== 'string' || !step.entity) continue;
    acts.push({
      stepId: step.stepId,
      entity: step.entity,
      effect: typeof step.effect === 'string' ? step.effect : '',
      transitionRef: typeof step.transitionRef === 'string' ? step.transitionRef : '',
    });
  }
  return acts;
}

async function payloadOf(
  project: number,
  moduleName: string,
  on: string,
  cache: Map<string, unknown>,
): Promise<boolean> {
  const [entityId, transitionId] = on.split('.');
  if (!entityId || !transitionId || on.split('.').length !== 2) return false;
  if (!cache.has(entityId)) {
    const text = await readLogical(project, entityPath(moduleName, entityId));
    cache.set(entityId, text ? parseD1Source(text, 'defs') : null);
  }
  const doc = cache.get(entityId);
  if (!isRecord(doc)) return false;
  const transition = arrayOf(doc.transitions).find(item => isRecord(item) && item.transitionId === transitionId);
  return isRecord(transition) && Object.hasOwn(transition, 'payload');
}

function inSelected(operation: string, usecaseIds: ReadonlySet<string>): boolean {
  if (usecaseIds.has(operation)) return true;
  const head = operation.split('.')[0] || '';
  return head.length > 0 && usecaseIds.has(head);
}

function pairsOf(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!Array.isArray(item)) return [];
    const row = item.filter((part): part is string => typeof part === 'string' && part.length > 0);
    return row.length ? [row] : [];
  });
}
