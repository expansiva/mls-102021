/// <mls fileReference="_102021_/l2/agentDefsL1/steps/persistence40/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { draftFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, type D1UnitPart } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { artifactFile, parseRendered, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { D1_DOMAIN_VERSION, type D1DomainBuild } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import { catalogInfo } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import { entityPath, isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source, readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import type { D1PersistenceBuild, D1PersistenceRequest } from '/_102021_/l2/agentDefsL1/steps/persistence40/contracts.js';
import { buildD1Persistence } from '/_102021_/l2/agentDefsL1/steps/persistence40/gate.js';

export async function assembleD1Persistence(
  project: number,
  moduleName: string,
): Promise<{ refusal: string } | { build: D1PersistenceBuild }> {
  const snapshot = await readD1Input(project, moduleName);
  if (!snapshot) return { refusal: 'input.json is missing or does not belong to this project. persistence40 wrote nothing.' };
  if (!snapshot.consumersReleased) return { refusal: 'Consumer phases are not released. persistence40 wrote nothing.' };
  const draftText = await readText(draftFile(project, moduleName, 'domain30'));
  if (!draftText) return { refusal: 'domain30 draft is missing. persistence40 wrote nothing.' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(draftText) as unknown;
  } catch {
    return { refusal: 'domain30 draft did not parse. persistence40 wrote nothing.' };
  }
  if (!isDomainBuild(parsed) || parsed.project !== project || parsed.moduleName !== moduleName) {
    return { refusal: 'domain30 draft does not belong to this project. persistence40 wrote nothing.' };
  }
  const request = await persistenceRequest(project, moduleName, snapshot, parsed);
  return { build: buildD1Persistence(request) };
}

export async function commitD1Persistence(
  project: number,
  build: D1PersistenceBuild,
): Promise<{ written: string[]; issues: string[] }> {
  const draftInfo = draftFile(project, build.moduleName, 'persistence40');
  const draftText = `${JSON.stringify(build, null, 2)}\n`;
  const currentDraft = await readText(draftInfo);
  if (currentDraft !== draftText) await writeJson(draftInfo, build);
  if (!build.ok) return { written: [], issues: build.problems.filter(problem => problem.severity === 'error').map(problem => problem.message) };
  const rendered = renderParts(project, build.emit);
  if (rendered.issues.length > 0) return { written: [], issues: rendered.issues };
  const committed = await commitD1Unit({
    project,
    moduleName: build.moduleName,
    step: 'persistence40',
    unitId: 'persistence40',
    draftText,
    parts: rendered.parts,
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

async function persistenceRequest(
  project: number,
  moduleName: string,
  snapshot: {
    selection: {
      ports: Array<{ portId: string; entity: string; status: string }>;
      tables: Array<{ tableId: string; entity: string; status: string }>;
      usecases: Array<{ usecaseId: string; entity: string; operation: string; status: string }>;
      entities: string[];
    };
    files: Array<{ artifactType: string; identity: string; defPath: string; action: string }>;
  },
  domain: D1DomainBuild,
): Promise<D1PersistenceRequest> {
  const entities: Record<string, unknown> = {};
  const ids = new Set<string>([
    ...snapshot.selection.entities,
    ...domain.entities.map(entity => entity.entityId),
  ]);
  for (const entityId of ids) {
    if (!isSafeToken(entityId)) continue;
    const text = await readLogical(project, entityPath(moduleName, entityId));
    if (!text) continue;
    const parsed = parseD1Source(text, 'defs');
    if (isRecord(parsed) && parsed.entityId === entityId) entities[entityId] = parsed;
  }
  const preservedPorts: Record<string, unknown> = {};
  for (const file of snapshot.files) {
    if (file.artifactType !== 'repositoryPort' || file.action !== 'preserve') continue;
    const info = artifactFile(project, qualifyDefPath(project, file.defPath));
    const text = info ? await readText(info) : null;
    if (!text) continue;
    const rendered = parseRendered(text);
    preservedPorts[file.defPath] = rendered?.definition ?? { unreadable: true };
  }
  const catalogsRead: string[] = [];
  for (const plan of domain.entities) {
    if (plan.storageTarget !== 'external') continue;
    const body = entities[plan.entityId];
    const source = isRecord(body) && typeof body.source === 'string' ? body.source.trim() : '';
    if (!source) continue;
    const info = catalogInfo(source);
    if (!info) continue;
    const text = await readText(info);
    if (text) catalogsRead.push(source);
  }
  return {
    project,
    moduleName,
    selection: {
      ports: snapshot.selection.ports.map(port => ({ portId: port.portId, entity: port.entity, status: port.status })),
      tables: snapshot.selection.tables.map(table => ({ tableId: table.tableId, entity: table.entity, status: table.status })),
      usecases: snapshot.selection.usecases.map(usecase => ({
        usecaseId: usecase.usecaseId,
        entity: usecase.entity,
        operation: usecase.operation,
        status: usecase.status,
      })),
      files: snapshot.files.map(file => ({
        artifactType: file.artifactType,
        identity: file.identity,
        defPath: file.defPath,
        action: file.action,
      })),
    },
    domain,
    entities,
    preservedPorts,
    physicalCitations: {},
    catalogsRead,
  };
}

async function readLogical(project: number, logical: string): Promise<string | null> {
  const file = artifactFile(project, qualifyDefPath(project, logical));
  if (!file) return null;
  return readText(file);
}

function isDomainBuild(value: unknown): value is D1DomainBuild {
  if (!isRecord(value)) return false;
  return value.schemaVersion === D1_DOMAIN_VERSION
    && typeof value.project === 'number'
    && typeof value.moduleName === 'string'
    && typeof value.ok === 'boolean'
    && Array.isArray(value.entities);
}
