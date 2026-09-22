/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { displayPath, draftFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { readText, writeJson, writeText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { inputPaths } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source, readD1Input, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { D1_CONTROLLER_VERSION } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { D1_PERSISTENCE_VERSION } from '/_102021_/l2/agentDefsL1/steps/persistence40/contracts.js';
import {
  D1_SUPPORT_VERSION,
  type D1SupportBuild,
  type D1SupportFile,
  type D1SupportHelper,
  type D1SupportRequest,
} from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';
import { buildD1Support } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import type { D1ControllerGrant, D1ControllerRelationship, D1ScopeGrantPlan } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

const SUPPORT_TYPES = new Set(['accessScope', 'authorityMap', 'repositoryRegistration']);

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

  const paths = inputPaths(moduleName);
  const accessText = await readLogical(project, paths.access);
  const indexText = await readLogical(project, paths.ontologyIndex);
  const access = accessText ? parseD1Source(accessText, 'defs') : null;
  const index = indexText ? parseD1Source(indexText, 'defs') : null;
  const usecasesText = await readText(draftFile(project, moduleName, 'usecases50'));
  const usecases = usecasesText ? parseObject(usecasesText) : null;
  const previousText = await readText(draftFile(project, moduleName, 'support70'));
  const previous = previousText ? parseObject(previousText) : null;
  const files = await receiptFiles(project, snapshot.files);
  const request: D1SupportRequest = {
    project,
    moduleName,
    grants: grantsOf(access),
    relationships: relationshipsOf(index),
    scopePlans: plansOf(controllers),
    citedGrantIds: citedOf(controllers),
    adapters: adaptersOf(persistence),
    files,
    existingHelpers: helpersOf(previous),
    applicationEdges: [...edgesOf(usecases), ...edgesOf(controllers)],
    formFields: formFieldsOf(controllers),
    enumerations: enumerationsOf(controllers),
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

  const issues: string[] = [];
  const written: string[] = [];
  for (const part of build.emit) {
    const rendered = renderDefinition(part.definition, part.pipeline);
    if ('issues' in rendered) {
      issues.push(...rendered.issues);
      continue;
    }
    const defPath = part.pipeline[0]?.defPath || '';
    const file = artifactFile(project, defPath);
    if (!file) {
      issues.push(`defPath is not a file this agent can write: ${defPath}.`);
      continue;
    }
    const current = await readText(file);
    if (current === rendered.source) continue;
    const logical = defPath.replace(/^_\d+_\/l1\//, 'l1/');
    const receipt = files.find(item => item.defPath === logical || qualifyDefPath(project, item.defPath) === defPath);
    if (current && receipt?.contentHash) {
      const hash = await sha256Text(current);
      if (hash !== receipt.contentHash) {
        issues.push(`Receipt hash for ${logical} does not match the bytes on disk. The file was not overwritten.`);
        continue;
      }
    } else if (current && (!receipt || !receipt.contentHash)) {
      issues.push(`File ${logical} exists without a receipt. The file was not overwritten.`);
      continue;
    }
    await writeText(file, rendered.source);
    written.push(displayPath(file));
  }
  return { written, issues };
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
