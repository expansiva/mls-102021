/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.ts" enhancement="_blank"/>

import { loadD1Artifacts } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1InputArtifacts, D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import type {
  D1ControllerGrant,
  D1ControllerRelationship,
  D1ControllerRequest,
  D1ServiceRequestSource,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

export { contractSources } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/v1Contracts.js';

/** input20 over a stored v2 seed. */
export function seedSnapshot(id: string, moduleName: string): { snapshot: D1InputSnapshot; artifacts: D1InputArtifacts } {
  const artifacts = loadD1Artifacts(id, moduleName);
  return { snapshot: buildD1InputSnapshot({ project: 102047, moduleName }, artifacts, null), artifacts };
}

/**
 * The controllers60 request io.ts would assemble from that snapshot: page actors from needs,
 * grants from access, relationships from the ontology index, and the v2 contracts as stored.
 */
export function seedControllerRequest(id: string, moduleName: string): D1ControllerRequest {
  const { snapshot, artifacts } = seedSnapshot(id, moduleName);
  const usecasePath = new Map(snapshot.files.filter(file => file.artifactType === 'usecase').map(file => [file.identity, file.defPath]));
  const serviceRequests: D1ServiceRequestSource[] = snapshot.selection.requests.map(item => ({
    route: item.route,
    pageId: item.pageId,
    kind: item.kind,
    uses: [...item.uses],
    outputs: item.outputs.map(output => ({ key: output.key, entity: output.entity })),
    params: item.params.map(param => ({
      name: param.name,
      target: param.target,
      ...(param.field ? { field: param.field } : {}),
      ...(param.pages ? { pages: param.pages } : {}),
    })),
  }));
  const actors = pageActors(artifacts.needs);
  const pageIds = [...new Set(snapshot.selection.requests.map(request => request.pageId))].sort();
  return {
    project: 102047,
    moduleName,
    pages: pageIds.map(pageId => ({
      pageId,
      actors: actors.get(pageId) || [],
      defPath: `l1/${moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`,
    })),
    usecases: snapshot.selection.usecases.map(usecase => ({
      usecaseId: usecase.usecaseId,
      entity: usecase.entity,
      operation: usecase.operation,
      status: usecase.status,
      functionName: '',
      defPath: usecasePath.get(usecase.identity) || `l1/${moduleName}/layer_2_application/usecases/${usecase.usecaseId}.defs.ts`,
    })),
    grants: grantsFrom(artifacts.access),
    relationships: relationshipsFrom(artifacts.ontologyIndex),
    contracts: Object.entries(artifacts.contractTexts || {}).map(([pageId, source]) => ({
      pageId,
      path: `l2/${moduleName}/web/contracts/${pageId}.defs.ts`,
      source,
    })),
    existing: [],
    enumerations: [],
    accessRead: true,
    actorsRead: true,
    serviceRequests,
    ontology: artifacts.entities,
  };
}

function pageActors(needs: unknown): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!isRecord(needs) || !Array.isArray(needs.pages)) return out;
  for (const page of needs.pages) {
    if (!isRecord(page) || typeof page.pageId !== 'string' || !Array.isArray(page.actors)) continue;
    out.set(page.pageId, page.actors.filter((item): item is string => typeof item === 'string' && item.length > 0));
  }
  return out;
}

function grantsFrom(access: unknown): D1ControllerGrant[] {
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

function relationshipsFrom(index: unknown): D1ControllerRelationship[] {
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

/**
 * Agenda v1 entry still imported by skipped tests. Not a v2 source; never called by a live test.
 */
export function coreControllerRequest(): D1ControllerRequest {
  throw new Error('agendaClinica fixtures kept by Wagner (01/10); not a v2 source');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}
