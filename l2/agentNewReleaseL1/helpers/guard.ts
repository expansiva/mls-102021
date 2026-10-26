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

/** Path to sha256, product defs only. The agent wraps this map in the portrait file. */
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

/**
 * Portrait file written on the first call. `pipelineUpdatedAt` is empty when `pipeline.json` is absent.
 * `allowed` is what the first call let the generator touch: the plan at `/check` time can no longer tell,
 * because the generator already rewrote the units.
 */
export interface ReleasePortraitFile {
  defs: Record<string, string>;
  generator: { pipelineUpdatedAt: string; allowed: string[] };
}

export type ParsedPortrait =
  | { ok: true; portrait: ReleasePortraitFile }
  | { ok: false; legacy: true };

/**
 * New portrait, or the flat path map from before the generator stamp.
 * Anything else is not a portrait.
 */
export function parsePortrait(parsed: unknown): ParsedPortrait {
  if (!isRecord(parsed)) throw new Error('snapshot is not a path map');
  if (isRecord(parsed.defs) && isRecord(parsed.generator) && typeof parsed.generator.pipelineUpdatedAt === 'string') {
    return {
      ok: true,
      portrait: {
        defs: stringMap(parsed.defs),
        generator: {
          pipelineUpdatedAt: parsed.generator.pipelineUpdatedAt,
          allowed: Array.isArray(parsed.generator.allowed) && parsed.generator.allowed.every(item => typeof item === 'string')
            ? parsed.generator.allowed as string[]
            : [],
        },
      },
    };
  }
  if (Object.values(parsed).every(value => typeof value === 'string')) return { ok: false, legacy: true };
  throw new Error('snapshot is not a path map');
}

export const PORTRAIT_LEGACY = 'the portrait is from an older version; run the first call again';

export interface GeneratorGateInput {
  pipeline: unknown;
  input20: unknown;
  pipelineUpdatedAt: string;
}

/**
 * Why `/check` refuses before the def lock.
 * `pipeline` and `input20` are the parsed files, or null when absent.
 */
export function generatorGateReasons(input: GeneratorGateInput): string[] {
  const reasons: string[] = [];
  const input20 = isRecord(input.input20) ? input.input20 : null;
  if (!input20 || input20.consumersReleased !== true) {
    const codes = input20 ? blockingCodes(input20.problems) : '';
    reasons.push(codes.length > 0
      ? `the defs generator did not release the consumer phases (${codes})`
      : 'the defs generator did not release the consumer phases');
  }
  const pipeline = isRecord(input.pipeline) ? input.pipeline : null;
  const status = pipeline && typeof pipeline.status === 'string' && pipeline.status.length > 0
    ? pipeline.status
    : 'missing';
  if (!pipeline || pipeline.status !== 'complete') reasons.push(`the generator pipeline is ${status}`);
  const steps = pipeline && isRecord(pipeline.steps) ? pipeline.steps : null;
  const finalize = steps && isRecord(steps.finalize80) ? steps.finalize80 : null;
  const updatedAt = finalize && typeof finalize.updatedAt === 'string' ? finalize.updatedAt : '';
  if (!finalize || finalize.status !== 'approved' || !(updatedAt > input.pipelineUpdatedAt)) {
    reasons.push('the generator did not finish after the portrait');
  }
  return reasons;
}

/** Error-severity codes and counts, same shape as the defs generator's blocking reason. */
function blockingCodes(problems: unknown): string {
  if (!Array.isArray(problems)) return '';
  const counts = new Map<string, number>();
  const owners = new Map<string, string[]>();
  for (const problem of problems) {
    if (!isRecord(problem) || problem.severity !== 'error' || typeof problem.code !== 'string' || problem.code.length === 0) continue;
    counts.set(problem.code, (counts.get(problem.code) || 0) + 1);
    const refs = owners.get(problem.code) || [];
    const ownerRef = typeof problem.ownerRef === 'string' ? problem.ownerRef : '';
    if (ownerRef && refs.length < 3 && !refs.includes(ownerRef)) refs.push(ownerRef);
    owners.set(problem.code, refs);
  }
  return [...counts.keys()].sort().map(code => {
    const refs = owners.get(code) || [];
    const head = `${code}:${counts.get(code)}`;
    return refs.length > 0 ? `${head} (${refs.join(', ')})` : head;
  }).join(',');
}

function stringMap(value: Record<string, unknown>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') throw new Error('snapshot is not a path map');
    map[key] = item;
  }
  return map;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
