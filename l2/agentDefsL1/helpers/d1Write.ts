/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Write.ts" enhancement="_blank"/>

import {
  parseDefinitionSource,
  renderDefinition as renderV2,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  definitionIssues,
  type D1Definition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { writeText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

const PIPELINE_MARKER = 'export const pipeline = ';

export interface D1Rendered {
  source: string;
  file: D1FileInfo;
}

/**
 * The file identity of a def. Qualified `_project_/l1/...` and logical `l1/...`
 * both go through fileInfoFromDisplay, which is the same parser input20 uses.
 */
export function artifactFile(project: number, defPath: string): D1FileInfo | null {
  if (!Number.isInteger(project) || project < 1 || defPath.includes('..')) return null;
  const qualified = /^_(\d+)_\/(l\d+\/.+)$/.exec(defPath);
  let logical = '';
  if (qualified) {
    if (Number(qualified[1]) !== project) return null;
    logical = qualified[2];
  } else if (/^l\d+\//.test(defPath)) logical = defPath;
  else return null;
  return fileInfoFromDisplay(project, logical);
}

/**
 * Reads the v2 definition. A pipeline or agent export is refused: null, not a
 * silent drop of the second value.
 */
export function parseRendered(source: string): { definition: unknown } | null {
  if (source.includes(PIPELINE_MARKER)) return null;
  const parsed = parseDefinitionSource(source);
  if ('issues' in parsed) return null;
  return { definition: parsed.definition };
}

/**
 * Definition object even when a legacy pipeline export follows it.
 * The pipeline export stays illegal. Callers that need v2 use parseRendered.
 */
export function readDefinitionExport(source: string): { definition: unknown; pipelineExport: boolean } | null {
  const pipelineExport = source.includes(PIPELINE_MARKER);
  const clipped = pipelineExport ? source.slice(0, source.indexOf(PIPELINE_MARKER)) : source;
  const parsed = parseDefinitionSource(clipped);
  if (!('definition' in parsed) || !parsed.definition || typeof parsed.definition !== 'object') return null;
  return { definition: parsed.definition, pipelineExport };
}

/** Paths a file declares. v2 uses definition.dependencies. A legacy export's dependsFiles is only a fallback. */
export function declaredDependencyPaths(source: string): string[] {
  const read = readDefinitionExport(source);
  if (read && isDependencyList(read.definition)) {
    const deps = (read.definition as { dependencies: unknown[] }).dependencies.filter((item): item is string => typeof item === 'string' && !!item);
    if (deps.length > 0 || !read.pipelineExport) return deps;
  }
  if (!source.includes(PIPELINE_MARKER)) return [];
  const start = source.indexOf(PIPELINE_MARKER) + PIPELINE_MARKER.length;
  const end = source.indexOf(' as const', start);
  if (end < 0) return [];
  try {
    const pipeline = JSON.parse(source.slice(start, end)) as unknown;
    if (!Array.isArray(pipeline)) return [];
    const paths: string[] = [];
    for (const item of pipeline) {
      if (!item || typeof item !== 'object' || !Array.isArray((item as { dependsFiles?: unknown }).dependsFiles)) continue;
      for (const dep of (item as { dependsFiles: unknown[] }).dependsFiles) {
        if (typeof dep === 'string' && dep) paths.push(dep);
      }
    }
    return paths;
  } catch {
    return [];
  }
}

function isDependencyList(value: unknown): boolean {
  return !!value && typeof value === 'object' && Array.isArray((value as { dependencies?: unknown }).dependencies);
}

/**
 * Files the def actually consumes. Qualified `_NNNNN_/lN/...`, sorted, unique.
 * A logical `lN/...` path is qualified with this project. `mls-NNNNN/...` keeps
 * the project named in the path. A fragment after `#` is not a file.
 */
export function consumedDependencies(project: number, paths: readonly string[]): string[] {
  const out = new Set<string>();
  for (const path of paths) {
    const qualified = qualifyConsumed(project, path);
    if (qualified) out.add(qualified);
  }
  return [...out].sort();
}

export function qualifyConsumed(project: number, path: string): string {
  const slash = path.trim().replace(/\\/g, '/').split('#')[0].replace(/^\/+/, '');
  const mls = /^mls-(\d+)\/(l\d+\/.+)$/.exec(slash);
  if (mls) return `_${mls[1]}_/${mls[2]}`;
  if (/^_\d+_\/l\d+\//.test(slash)) return slash;
  if (/^l\d+\//.test(slash) && Number.isInteger(project) && project > 0) return `_${project}_/${slash}`;
  return '';
}

/** Copies consumed files onto the definition. Skills and output paths stay out of the file. */
export function stampDefinition(
  definition: D1Definition,
  defPath: string,
  paths: readonly string[],
): D1Definition {
  return {
    ...definition,
    dependencies: consumedDependencies(projectOf(defPath), [...definition.dependencies, ...paths]),
  };
}

/**
 * Renders one v2 defs file. No pipeline export. Issues keep the value intact.
 */
export function renderDefinition(definition: D1Definition, defPath: string): { source: string } | { issues: string[] } {
  const issues = definitionIssues(definition);
  if (issues.length > 0) return { issues };
  const rendered = renderV2(definition, defPath);
  if ('issues' in rendered) return rendered;
  if (rendered.source.includes(PIPELINE_MARKER)) return { issues: ['v2 definition must not export pipeline.'] };
  return rendered;
}

function projectOf(defPath: string | undefined): number {
  const match = /^_(\d+)_\//.exec(defPath || '');
  return match ? Number(match[1]) : 0;
}

export function collisionIssues(defPaths: readonly string[]): string[] {
  const seen = new Map<string, number>();
  for (const path of defPaths) seen.set(path, (seen.get(path) || 0) + 1);
  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([path]) => `Duplicate defPath ${path}.`)
    .sort();
}

/**
 * Gate then write. A collision or a definition issue writes nothing.
 * The file passed to writeText is artifactFile, the same identity a later remove must use.
 */
export async function persistDefinitions(
  project: number,
  parts: readonly { definition: D1Definition; defPath: string }[],
): Promise<{ written: D1FileInfo[]; issues: string[] }> {
  const issues: string[] = [];
  const rendered: { source: string; file: D1FileInfo; defPath: string }[] = [];
  for (const part of parts) {
    const result = renderDefinition(part.definition, part.defPath);
    if ('issues' in result) {
      issues.push(...result.issues);
      continue;
    }
    const parsed = parseRendered(result.source);
    if (!parsed) {
      issues.push('Rendered source did not parse.');
      continue;
    }
    const file = artifactFile(project, part.defPath);
    if (!file) {
      issues.push(`defPath is not a file this agent can write: ${part.defPath}.`);
      continue;
    }
    rendered.push({ source: result.source, file, defPath: part.defPath });
  }
  issues.push(...collisionIssues(rendered.map(item => item.defPath)));
  if (issues.length > 0) return { written: [], issues };
  const written: D1FileInfo[] = [];
  for (const item of rendered) {
    await writeText(item.file, item.source);
    written.push(item.file);
  }
  return { written, issues: [] };
}
