/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/guard.ts" enhancement="_blank"/>

import { parseDefinitionSource } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { sha256Text } from '/_102021_/l2/helpers/l1Defs/identity.js';
import type { EffortAnswer } from '/_102035_/l2/solution/poolPlan.js';

export interface AfterDefsCheck {
  changed: string[];
  outside: string[];
}

const PRODUCT_SKIP = new Set(['pipeline', 'materialization']);

/** Product defs under `l1/<module>/`. Pipeline and materialization are not part of the portrait. */
export function isProductDefPath(path: string): boolean {
  if (!path.startsWith('l1/') || !path.endsWith('.defs.ts')) return false;
  const parts = path.split('/');
  return parts.length > 3 && !parts.some(part => PRODUCT_SKIP.has(part));
}

/** Path to sha256, product defs only. */
export async function snapshotOf(files: Record<string, string>): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  for (const path of Object.keys(files).sort()) {
    if (!isProductDefPath(path)) continue;
    snapshot[path] = await sha256Text(files[path] ?? '');
  }
  return snapshot;
}

/**
 * Units this master creates or regenerates, plus the page controller for each request.
 * The controller is the def the generator writes beside that page's request.
 */
export function allowedPaths(answers: EffortAnswer[], defs: Record<string, string>): string[] {
  const seen = new Set<string>();
  const allowed: string[] = [];
  const add = (path: string) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    allowed.push(path);
  };
  for (const answer of answers) {
    for (const unit of [...answer.create, ...answer.regenerateDefs]) {
      add(unit.path);
      if (unit.kind !== 'request') continue;
      const controller = controllerPath(unit.path, pageIdOf(defs[unit.path], unit.id));
      if (controller) add(controller);
    }
  }
  return allowed;
}

/** Created, changed or deleted paths. Any of those missing from `allowed` is `outside`. */
export function checkAfterDefs(
  before: Record<string, string>,
  after: Record<string, string>,
  allowed: readonly string[],
): AfterDefsCheck {
  const permit = new Set(allowed);
  const changed: string[] = [];
  const outside: string[] = [];
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const path of [...paths].sort()) {
    if (before[path] === after[path]) continue;
    changed.push(path);
    if (!permit.has(path)) outside.push(path);
  }
  return { changed, outside };
}

function pageIdOf(source: string | undefined, fallback: string): string {
  if (!source) return fallback;
  const parsed = parseDefinitionSource(source);
  if (!('definition' in parsed) || !isRecord(parsed.definition)) return fallback;
  const data = isRecord(parsed.definition.data) ? parsed.definition.data : undefined;
  const pageId = data && typeof data.pageId === 'string' ? data.pageId : '';
  return pageId || fallback;
}

function controllerPath(requestPath: string, pageId: string): string {
  const match = /^l1\/([^/]+)\//.exec(requestPath);
  if (!match || !pageId) return '';
  return `l1/${match[1]}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
