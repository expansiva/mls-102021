/// <mls fileReference="_102021_/l2/agentDefsL1/steps/domain30/io.ts" enhancement="_blank"/>

import { stepRunOf, type D1StepRun } from '/_102021_/l2/agentDefsL1/helpers/d1RunSummary.js';
import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { draftFile, type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, type D1UnitPart } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { artifactFile, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { entityCatalogSource, entityPath, inputPaths, isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source, readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { type D1DomainBuild } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import { buildD1Domain, type D1DomainRequest } from '/_102021_/l2/agentDefsL1/steps/domain30/gate.js';
import { resolveEntityCatalogs, parseCatalogSource } from '/_102021_/l2/agentDefsL1/steps/input20/entityCatalog.js';
import { catalogFilePath } from '/_102020_/l2/helpers/connections/catalogPath.js';
import { declarationRef } from '/_102021_/l2/helpers/connections/catalogResolve.js';

export async function assembleD1Domain(project: number, moduleName: string): Promise<{ refusal: string } | { build: D1DomainBuild }> {
  const snapshot = await readD1Input(project, moduleName);
  if (!snapshot) return { refusal: 'input.json is missing or does not belong to this project. domain30 wrote nothing.' };
  if (!snapshot.consumersReleased) return { refusal: 'Consumer phases are not released. domain30 wrote nothing.' };
  const request = await domainRequest(project, moduleName, snapshot);
  return { build: buildD1Domain(request) };
}

export async function commitD1Domain(project: number, build: D1DomainBuild): Promise<{ written: string[]; run?: D1StepRun; issues: string[] }> {
  const draftInfo = draftFile(project, build.moduleName, 'domain30');
  const draftText = `${JSON.stringify(build, null, 2)}\n`;
  const currentDraft = await readText(draftInfo);
  if (currentDraft !== draftText) await writeJson(draftInfo, build);
  if (!build.ok) return { written: [], issues: build.problems.filter(problem => problem.severity === 'error').map(problem => problem.message) };
  const rendered = renderParts(project, build.emit);
  if (rendered.issues.length > 0) return { written: [], issues: rendered.issues };
  const committed = await commitD1Unit({
    project,
    moduleName: build.moduleName,
    step: 'domain30',
    unitId: 'domain30',
    draftText,
    parts: rendered.parts,
  });
  return { written: committed.written, run: stepRunOf(committed), issues: committed.issues };
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

async function domainRequest(
  project: number,
  moduleName: string,
  snapshot: { selection: { entities: string[]; tables: Array<{ tableId: string; entity: string }> }; files: Array<{ artifactType: string; identity: string; defPath: string; action: string }> },
): Promise<D1DomainRequest> {
  const indexText = await readLogical(project, inputPaths(moduleName).ontologyIndex);
  const rulesText = await readLogical(project, inputPaths(moduleName).rules);
  const ontologyIndex = indexText ? parseD1Source(indexText, 'defs') : null;
  const rules = rulesText ? parseD1Source(rulesText, 'defs') : null;
  const entities: Record<string, unknown> = {};
  const indexIds = isRecord(ontologyIndex) && Array.isArray(ontologyIndex.entities)
    ? ontologyIndex.entities.flatMap(row => isRecord(row) && typeof row.entityId === 'string' ? [row.entityId] : [])
    : [];
  for (const entityId of new Set([...snapshot.selection.entities, ...indexIds])) {
    if (!isSafeToken(entityId)) continue;
    const text = await readLogical(project, entityPath(moduleName, entityId));
    if (!text) continue;
    const parsed = parseD1Source(text, 'defs');
    if (isRecord(parsed) && parsed.entityId === entityId) entities[entityId] = parsed;
  }
  const catalogs: Record<string, unknown> = {};
  const sources = new Set<string>();
  const resolved = await resolveEntityCatalogs(project, moduleName, Object.values(entities), readCatalogRef);
  for (const body of Object.values(entities)) {
    const source = entityCatalogSource(body, resolved.refs);
    if (source) sources.add(source);
  }
  for (const source of sources) {
    const text = await readCatalogRef(source);
    if (!text) continue;
    const parsed = parseCatalogSource(text);
    if (parsed) catalogs[source] = parsed;
  }
  return {
    project,
    moduleName,
    selection: {
      entities: [...snapshot.selection.entities],
      tables: snapshot.selection.tables.map(table => ({ tableId: table.tableId, entity: table.entity })),
      files: snapshot.files.map(file => ({
        artifactType: file.artifactType,
        identity: file.identity,
        defPath: file.defPath,
        action: file.action,
      })),
    },
    entities,
    ontologyIndex,
    rules,
    catalogs,
    catalogRefs: resolved.refs,
    catalogProblems: resolved.problems,
  };
}

async function readLogical(project: number, logical: string): Promise<string | null> {
  const file = artifactFile(project, qualifyDefPath(project, logical));
  if (!file) return null;
  return readText(file);
}

/** The text of a source a step opens: a qualified ref (`/_<project>_/l…`) through `catalogInfo`. Null when `catalogInfo` refuses the path or the file is absent. */
export async function readCatalogRef(ref: string): Promise<string | null> {
  const info = catalogInfo(ref);
  return info ? readText(info) : null;
}

/**
 * A catalog may live in another project. `..` and a short name with a dot are refused. An MDM catalog is `.defs.ts`; a connection catalog is
 * a plain `.ts`, and only two paths count: the one of `catalogFilePath` (the platform) and the declaration a module generated
 * (`l1/<module>/layer_1_external/connections/<id>.ts`, d1_220).
 */
export function catalogInfo(source: string): D1FileInfo | null {
  if (!source || source.includes('..')) return null;
  const match = /^\/?_(\d+)_\/l(\d+)\/(.+)\/([^/]+)$/.exec(source);
  if (!match) return null;
  const fileName = match[4];
  let extension = fileName.endsWith('.defs.ts') ? '.defs.ts' : '';
  if (!extension && fileName.endsWith('.ts') && (isPlatformCatalog(fileName, source) || isDeclaration(match[1], match[2], match[3], fileName))) extension = '.ts';
  if (!extension) return null;
  const shortName = fileName.slice(0, fileName.length - extension.length);
  if (!isSafeToken(shortName) || shortName.includes('.')) return null;
  const project = Number(match[1]);
  const level = Number(match[2]);
  if (!Number.isInteger(project) || project < 1 || !Number.isInteger(level) || level < 1) return null;
  return { project, level, folder: match[3], shortName, extension };
}

/** A connection catalog of the platform is a plain `.ts` of the platform L1, and only the single path of the helper counts. */
function isPlatformCatalog(fileName: string, source: string): boolean {
  return catalogFilePath(fileName.slice(0, -3)) === `/${source.replace(/^\//, '')}`;
}

/** The declaration of a system: `_<project>_/l1/<module>/layer_1_external/connections/<id>.ts`, the path of `declarationRef`. */
function isDeclaration(project: string, level: string, folder: string, fileName: string): boolean {
  const module = /^([A-Za-z][A-Za-z0-9]*)\/layer_1_external\/connections$/.exec(folder)?.[1];
  const systemId = fileName.slice(0, -3);
  return level === '1' && Boolean(module) && catalogFilePath(systemId) !== '' && declarationRef(Number(project), module as string, systemId) === `_${project}_/l1/${folder}/${fileName}`;
}
