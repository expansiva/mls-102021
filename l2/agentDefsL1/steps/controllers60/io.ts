/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { draftFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, type D1UnitPart } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile, parseRendered, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { contractPath, entityPath, inputPaths, isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import type { D1ActiveStatus, D1SelectedRequest } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source, readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import {
  type D1ControllerBuild,
  type D1ControllerGrant,
  type D1ControllerProblem,
  type D1ControllerRelationship,
  type D1ControllerRequest,
  type D1ExistingController,
  type D1ExistingHandler,
  type D1RemovedRoute,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { serviceSourceOf } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import { D1_USECASE_VERSION } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { resolveAllowedFields } from '/_102021_/l2/helpers/l1Defs/disclosure.js';

export async function assembleD1Controllers(
  project: number,
  moduleName: string,
): Promise<{ refusal: string } | { build: D1ControllerBuild }> {
  const snapshot = await readD1Input(project, moduleName);
  if (!snapshot) return { refusal: 'input.json is missing or does not belong to this project. controllers60 wrote nothing.' };
  if (!snapshot.consumersReleased) return { refusal: 'Consumer phases are not released. controllers60 wrote nothing.' };
  const draftText = await readText(draftFile(project, moduleName, 'usecases50'));
  if (!draftText) return { refusal: 'usecases50 draft is missing. controllers60 wrote nothing.' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(draftText) as unknown;
  } catch {
    return { refusal: 'usecases50 draft did not parse. controllers60 wrote nothing.' };
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== D1_USECASE_VERSION || parsed.project !== project || parsed.moduleName !== moduleName) {
    return { refusal: 'usecases50 draft does not belong to this project. controllers60 wrote nothing.' };
  }
  const loaded = await controllerRequest(project, moduleName, snapshot, parsed);
  return { build: withDisclosureProblems(buildD1Controllers(loaded.request), loaded.disclosureProblems) };
}

export async function commitD1Controllers(
  project: number,
  build: D1ControllerBuild,
): Promise<{ written: string[]; issues: string[] }> {
  const draftInfo = draftFile(project, build.moduleName, 'controllers60');
  const draftText = `${JSON.stringify(build, null, 2)}\n`;
  const currentDraft = await readText(draftInfo);
  if (currentDraft !== draftText) await writeJson(draftInfo, build);
  if (!build.ok) return { written: [], issues: build.problems.filter(problem => problem.severity === 'error').map(problem => problem.message) };
  const rendered = renderParts(project, build.emit);
  if (rendered.issues.length > 0) return { written: [], issues: rendered.issues };
  const removals: D1UnitPart[] = build.removals.map(item => ({
    defPath: item.defPath,
    source: '',
    action: 'remove',
    receiptHash: item.contentHash,
    outputTs: item.outputTs,
  }));
  const committed = await commitD1Unit({
    project,
    moduleName: build.moduleName,
    step: 'controllers60',
    unitId: 'controllers60',
    draftText,
    parts: [...rendered.parts, ...removals],
  });
  return { written: committed.written, issues: committed.issues };
}

function renderParts(
  project: number,
  emit: readonly { definition: Parameters<typeof renderDefinition>[0]; pipeline: { defPath: string; outputPath: string }[] }[],
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
    parts.push({ defPath, source: rendered.source, outputTs: [part.pipeline[0]?.outputPath || ''].filter(Boolean) });
  }
  return { parts, issues };
}

async function controllerRequest(
  project: number,
  moduleName: string,
  snapshot: {
    selection: {
      pages: Array<{ pageId: string; routes: string[] }>;
      requests?: readonly D1SelectedRequest[];
      usecases: Array<{ usecaseId: string; entity: string; operation: string; status: D1ActiveStatus; identity: string }>;
    };
    files: Array<{ artifactType: string; identity: string; defPath: string }>;
    removed: Array<{ kind: string; id: string; defPath: string | null; contentHash?: string }>;
  },
  usecases: Record<string, unknown>,
): Promise<{ request: D1ControllerRequest; disclosureProblems: D1ControllerProblem[] }> {
  const paths = inputPaths(moduleName);
  const accessText = await readLogical(project, paths.access);
  const needsText = await readLogical(project, paths.needs);
  const indexText = await readLogical(project, paths.ontologyIndex);
  const access = accessText ? parseD1Source(accessText, 'defs') : null;
  const needs = needsText ? parseD1Source(needsText, 'json') : null;
  const index = indexText ? parseD1Source(indexText, 'defs') : null;
  const actors = actorsOf(needs);
  const controllerPath = new Map(snapshot.files.filter(file => file.artifactType === 'httpController').map(file => [file.identity, file.defPath]));
  const usecasePath = new Map(snapshot.files.filter(file => file.artifactType === 'usecase').map(file => [file.identity, file.defPath]));
  const pageIds = [...new Set([
    ...snapshot.selection.pages.map(page => page.pageId),
    ...(snapshot.selection.requests || []).map(request => request.pageId),
  ])].filter(Boolean).sort();
  const contracts = [];
  for (const pageId of pageIds) {
    if (!isSafeToken(pageId)) continue;
    const path = contractPath(moduleName, pageId);
    const source = await readLogical(project, path);
    contracts.push({ pageId, path, source: source || '' });
  }
  const existing: D1ExistingController[] = [];
  for (const pageId of pageIds) {
    const defPath = controllerPath.get(pageId) || `l1/${moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`;
    const text = await readLogical(project, defPath);
    const parsed = text == null ? null : existingController(pageId, text);
    if (parsed) existing.push(parsed);
  }
  const ontology = await ontologyOf(project, moduleName, index);
  const accessGrants = accessGrantsOf(access, ontology);
  return {
    disclosureProblems: accessGrants.problems,
    request: {
      project,
      moduleName,
      pages: pageIds.map(pageId => ({
        pageId,
        actors: actors.get(pageId) || [],
        defPath: controllerPath.get(pageId) || `l1/${moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`,
      })),
      usecases: snapshot.selection.usecases.map(usecase => ({
        usecaseId: usecase.usecaseId,
        entity: usecase.entity,
        operation: usecase.operation,
        status: usecase.status,
        functionName: usecase.usecaseId,
        defPath: usecasePath.get(usecase.identity) || usecasePath.get(usecase.usecaseId) || `l1/${moduleName}/layer_2_application/usecases/${usecase.usecaseId}.defs.ts`,
      })),
      grants: accessGrants.grants,
      relationships: relationshipsOf(index),
      contracts,
      existing,
      enumerations: enumerationsOf(usecases),
      accessRead: isRecord(access),
      actorsRead: isRecord(needs),
      removedRoutes: removedRoutesOf(snapshot.removed),
      serviceRequests: (snapshot.selection.requests || []).map(serviceSourceOf),
      ontology,
    },
  };
}

async function ontologyOf(project: number, moduleName: string, index: unknown): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  if (!isRecord(index) || !Array.isArray(index.entities)) return out;
  for (const row of index.entities) {
    if (!isRecord(row) || typeof row.entityId !== 'string' || !isSafeToken(row.entityId)) continue;
    const text = await readLogical(project, entityPath(moduleName, row.entityId));
    const parsed = text ? parseD1Source(text, 'defs') : null;
    if (isRecord(parsed)) out[row.entityId] = parsed;
  }
  return out;
}

function removedRoutesOf(
  removed: readonly { kind: string; id: string; defPath: string | null; contentHash?: string }[],
): D1RemovedRoute[] {
  const out: D1RemovedRoute[] = [];
  for (const item of removed) {
    if (item.kind !== 'endpoint' || !item.id) continue;
    const match = item.defPath ? /\/controllers\/([^/]+)\.defs\.ts$/.exec(item.defPath) : null;
    out.push({
      route: item.id,
      pageId: match ? match[1] : '',
      defPath: item.defPath || '',
      contentHash: item.contentHash || '',
    });
  }
  return out;
}

function enumerationsOf(draft: Record<string, unknown>): D1ControllerRequest['enumerations'] {
  if (!Array.isArray(draft.enumerations)) return [];
  const out: D1ControllerRequest['enumerations'] = [];
  for (const item of draft.enumerations) {
    if (!isRecord(item) || typeof item.entityId !== 'string' || typeof item.path !== 'string') continue;
    out.push({ entityId: item.entityId, path: item.path, values: stringList(item.values) });
  }
  return out;
}

function actorsOf(needs: unknown): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!isRecord(needs) || !Array.isArray(needs.pages)) return out;
  for (const page of needs.pages) {
    if (!isRecord(page) || typeof page.pageId !== 'string') continue;
    out.set(page.pageId, stringList(page.actors));
  }
  return out;
}

/** `summaryOnly` is the L4 name of `fieldsOnly`. Any other mode is an error on the grant. */
export function accessGrantsOf(
  access: unknown,
  ontology: Record<string, unknown>,
): { grants: D1ControllerGrant[]; problems: D1ControllerProblem[] } {
  if (!isRecord(access) || !Array.isArray(access.grants)) return { grants: [], problems: [] };
  const grants: D1ControllerGrant[] = [];
  const problems: D1ControllerProblem[] = [];
  for (const grant of access.grants) {
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
        }, ontology)
        : allowedFields,
      anchorEntity: typeof scope.anchorEntity === 'string' ? scope.anchorEntity : '',
      scopeMode: typeof scope.mode === 'string' ? scope.mode : '',
    });
  }
  return { grants, problems };
}

function withDisclosureProblems(build: D1ControllerBuild, problems: readonly D1ControllerProblem[]): D1ControllerBuild {
  if (problems.length === 0) return build;
  return { ...build, ok: false, problems: [...build.problems, ...problems], emit: [] };
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

function existingController(pageId: string, source: string): D1ExistingController {
  const parsed = parseRendered(source);
  const data = parsed && isRecord(parsed.definition) && isRecord(parsed.definition.data) ? parsed.definition.data : null;
  if (!data || !Array.isArray(data.handlers)) return { pageId, routes: [], handlers: [], unreadable: true };
  const handlers: D1ExistingHandler[] = [];
  const routes: string[] = [];
  for (const handler of data.handlers) {
    if (!isRecord(handler) || typeof handler.route !== 'string') continue;
    const kind = handler.kind === 'command' || handler.kind === 'query' ? handler.kind : '';
    const usecaseId = typeof handler.usecaseId === 'string' ? handler.usecaseId : '';
    const serviceFunction = typeof handler.serviceFunction === 'string' ? handler.serviceFunction : '';
    if (!kind || (!usecaseId && !serviceFunction)) continue;
    if (!routes.includes(handler.route)) routes.push(handler.route);
    handlers.push({ route: handler.route, kind, usecaseId, serviceFunction, grantIds: stringList(handler.grantIds) });
  }
  return { pageId, routes, handlers, unreadable: false };
}

async function readLogical(project: number, logicalPath: string): Promise<string | null> {
  const info = artifactFile(project, qualifyDefPath(project, logicalPath));
  if (!info) return null;
  return readText(info);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}
