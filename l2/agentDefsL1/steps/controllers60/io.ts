/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { draftFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, type D1UnitPart } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile, parseRendered, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { contractPath, inputPaths, isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source, readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import {
  type D1ControllerBuild,
  type D1ControllerGrant,
  type D1ControllerRelationship,
  type D1ControllerRequest,
  type D1ExistingController,
  type D1ExistingHandler,
  type D1RemovedRoute,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { D1_USECASE_VERSION } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

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
  const request = await controllerRequest(project, moduleName, snapshot, parsed);
  return { build: buildD1Controllers(request) };
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
  emit: readonly { definition: Parameters<typeof renderDefinition>[0]; pipeline: Parameters<typeof renderDefinition>[1] }[],
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
      routes: Array<{ route: string; page: string; kind: string; usecaseRef: string; status: string }>;
      usecases: Array<{ usecaseId: string; entity: string; operation: string; identity: string }>;
    };
    files: Array<{ artifactType: string; identity: string; defPath: string }>;
    removed: Array<{ kind: string; id: string; defPath: string | null; contentHash?: string }>;
  },
  usecases: Record<string, unknown>,
): Promise<D1ControllerRequest> {
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
  const functions = functionsOf(usecases);
  const pageIds = [...new Set(snapshot.selection.routes.map(route => route.page))].sort();
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
  return {
    project,
    moduleName,
    pages: pageIds.map(pageId => ({
      pageId,
      actors: actors.get(pageId) || [],
      defPath: controllerPath.get(pageId) || `l1/${moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`,
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
      functionName: functions.get(usecase.usecaseId) || '',
      defPath: usecasePath.get(usecase.identity) || usecasePath.get(usecase.usecaseId) || `l1/${moduleName}/layer_2_application/usecases/${usecase.usecaseId}.defs.ts`,
    })),
    grants: grantsOf(access),
    relationships: relationshipsOf(index),
    contracts,
    existing,
    enumerations: enumerationsOf(usecases),
    accessRead: isRecord(access),
    actorsRead: isRecord(needs),
    removedRoutes: removedRoutesOf(snapshot.removed),
  };
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

function functionsOf(draft: Record<string, unknown>): Map<string, string> {
  const out = new Map<string, string>();
  if (!Array.isArray(draft.usecases)) return out;
  for (const item of draft.usecases) {
    if (!isRecord(item) || typeof item.usecaseId !== 'string') continue;
    const data = isRecord(item.definition) && isRecord(item.definition.data) ? item.definition.data : null;
    const fn = data && Array.isArray(data.functions) ? data.functions.find(isRecord) : null;
    const name = fn && typeof fn.functionName === 'string' ? fn.functionName : '';
    out.set(item.usecaseId, name);
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

function existingController(pageId: string, source: string): D1ExistingController {
  const parsed = parseRendered(source);
  const data = parsed && isRecord(parsed.definition) && isRecord(parsed.definition.data) ? parsed.definition.data : null;
  if (!data || !Array.isArray(data.handlers)) return { pageId, routes: [], handlers: [], unreadable: true };
  const handlers: D1ExistingHandler[] = [];
  const routes: string[] = [];
  for (const handler of data.handlers) {
    if (!isRecord(handler) || typeof handler.route !== 'string') continue;
    const kind = handler.kind === 'command' || handler.kind === 'query' ? handler.kind : '';
    if (!kind || typeof handler.usecaseId !== 'string') continue;
    if (!routes.includes(handler.route)) routes.push(handler.route);
    handlers.push({ route: handler.route, kind, usecaseId: handler.usecaseId, grantIds: stringList(handler.grantIds) });
  }
  if (parsed && Array.isArray(parsed.pipeline)) {
    for (const item of parsed.pipeline) {
      if (!isRecord(item) || !Array.isArray(item.routes)) continue;
      for (const route of item.routes) {
        if (typeof route === 'string' && route && !routes.includes(route)) routes.push(route);
      }
    }
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
