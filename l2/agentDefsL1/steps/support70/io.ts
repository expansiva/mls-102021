/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { draftFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, logicalDefPath, type D1UnitPart } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { futureOutputPath, qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { entityPath, inputPaths, journeyPath } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source, readD1Input, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { D1_CONTROLLER_VERSION } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { D1_DOMAIN_VERSION } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import { D1_PERSISTENCE_VERSION } from '/_102021_/l2/agentDefsL1/steps/persistence40/contracts.js';
import {
  D1_SUPPORT_VERSION,
  type D1EffectEvent,
  type D1EffectOperation,
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
import type { D1ControllerGrant, D1ControllerRelationship, D1ScopeGrantPlan } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

const SUPPORT_TYPES = new Set(['accessScope', 'authorityMap', 'repositoryRegistration', 'persistenceSeeds', 'integrationOutbound']);

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
  const grants = grantsOf(access);
  const models = modelsOf(domain, index);
  const usecaseIds = [...new Set(snapshot.selection.usecases.flatMap(item => [item.usecaseId, item.identity]))].filter(Boolean).sort();
  const linked = await effectsOf(project, moduleName, usecaseIds);
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
    operations: linked.operations,
  };
  return { build: buildD1Support(request), files };
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
  emit: readonly { definition: Parameters<typeof renderDefinition>[0]; pipeline: Parameters<typeof renderDefinition>[1] }[],
  files: readonly D1SupportFile[],
): { parts: D1UnitPart[]; issues: string[] } {
  const parts: D1UnitPart[] = [];
  const issues: string[] = [];
  for (const part of emit) {
    const rendered = renderDefinition(part.definition, part.pipeline);
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
      currentHash: text == null ? '' : await sha256Text(text),
    });
  }
  return files;
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

function grantsOf(access: unknown): D1ControllerGrant[] {
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

async function effectsOf(
  project: number,
  moduleName: string,
  usecaseIds: readonly string[],
): Promise<{ outbound: D1EffectEvent[]; operations: D1EffectOperation[] }> {
  const paths = inputPaths(moduleName);
  const integrationText = await readLogical(project, paths.integration);
  const workflowText = await readLogical(project, paths.workflows);
  const integration = integrationText ? parseD1Source(integrationText, 'defs') : null;
  const workflows = workflowText ? parseD1Source(workflowText, 'defs') : null;
  const known = new Set(usecaseIds);
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
      if (!isRecord(row) || typeof row.id !== 'string' || !row.id) continue;
      const transitionRef = typeof row.transitionRef === 'string' ? row.transitionRef : '';
      operations.push({
        id: row.id,
        kind: 'inbound',
        operations: transitionRef ? [transitionRef] : [],
        mechanism: typeof row.mechanism === 'string' ? row.mechanism : '',
        consumer: known.has(transitionRef) ? transitionRef : row.id,
        scheduled: false,
      });
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
  }
  if (isRecord(workflows)) {
    for (const row of arrayOf(workflows.processes)) {
      if (!isRecord(row) || typeof row.processId !== 'string' || !row.processId) continue;
      const planned: string[] = [];
      for (const task of arrayOf(row.tasks)) {
        if (!isRecord(task)) continue;
        if (typeof task.journeyRef === 'string' && task.journeyRef && !planned.includes(task.journeyRef)) planned.push(task.journeyRef);
        if (typeof task.transitionRef === 'string' && task.transitionRef && !planned.includes(task.transitionRef)) planned.push(task.transitionRef);
      }
      const trigger = isRecord(row.trigger) ? row.trigger : {};
      const consumer = planned.find(item => known.has(item)) || row.processId;
      operations.push({
        id: row.processId,
        kind: 'process',
        operations: planned,
        mechanism: '',
        consumer,
        scheduled: trigger.kind === 'scheduled',
      });
    }
  }
  return { outbound, operations };
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
