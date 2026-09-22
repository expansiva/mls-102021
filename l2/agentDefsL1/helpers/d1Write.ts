/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Write.ts" enhancement="_blank"/>

import { type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  definitionIssues,
  type D1Definition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  pipelineItemIssues,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { writeText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

const DEFINITION_MARKER = 'export const definition = ';
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

/** JSON slice between a marker and ` as const`. This does not evaluate the source. */
export function parseRendered(source: string): { definition: unknown; pipeline: unknown } | null {
  const definition = sliceJson(source, DEFINITION_MARKER);
  const pipeline = sliceJson(source, PIPELINE_MARKER);
  if (definition === null || pipeline === null) return null;
  return { definition, pipeline };
}

function sliceJson(source: string, marker: string): unknown | null {
  const at = source.indexOf(marker);
  if (at < 0) return null;
  const start = at + marker.length;
  const end = source.indexOf(' as const', start);
  if (end < 0) return null;
  try {
    return JSON.parse(source.slice(start, end));
  } catch {
    return null;
  }
}

export function renderIssues(definition: unknown, pipeline: unknown, project: number): string[] {
  const issues = [
    ...definitionIssues(definition),
    ...(Array.isArray(pipeline) ? pipeline.flatMap(item => pipelineItemIssues(item, project, moduleOf(definition))) : ['pipeline must be a list.']),
  ];
  if (Array.isArray(pipeline) && pipeline.length === 0) issues.push('pipeline must name one item.');
  return issues;
}

function moduleOf(definition: unknown): string {
  return definition && typeof definition === 'object' && !Array.isArray(definition)
    && typeof (definition as { moduleName?: unknown }).moduleName === 'string'
    ? (definition as { moduleName: string }).moduleName
    : '';
}

/**
 * Renders one defs file. Issues are returned with the value intact: nothing is stripped.
 * Persistence is separate and refuses the same issues.
 */
export function renderDefinition(definition: D1Definition, pipeline: D1PipelineItem[]): { source: string } | { issues: string[] } {
  const issues = renderIssues(definition, pipeline, projectOf(pipeline[0]?.defPath));
  if (issues.length > 0) return { issues };
  const defPath = pipeline[0].defPath;
  const body = [
    `/// <mls fileReference="${defPath}" enhancement="_blank"/>`,
    '',
    `export const definition = ${JSON.stringify(definition, null, 2)} as const;`,
    '',
    'export default definition;',
    '',
    `export const pipeline = ${JSON.stringify(pipeline, null, 2)} as const;`,
    '',
  ].join('\n');
  return { source: body };
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
  parts: readonly { definition: D1Definition; pipeline: D1PipelineItem[] }[],
): Promise<{ written: D1FileInfo[]; issues: string[] }> {
  const issues: string[] = [];
  const rendered: { source: string; file: D1FileInfo; defPath: string }[] = [];
  for (const part of parts) {
    const result = renderDefinition(part.definition, part.pipeline);
    if ('issues' in result) {
      issues.push(...result.issues);
      continue;
    }
    const parsed = parseRendered(result.source);
    if (!parsed) {
      issues.push('Rendered source did not parse.');
      continue;
    }
    const defPath = part.pipeline[0]?.defPath || '';
    const file = artifactFile(project, defPath);
    if (!file) {
      issues.push(`defPath is not a file this agent can write: ${defPath}.`);
      continue;
    }
    rendered.push({ source: result.source, file, defPath });
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
