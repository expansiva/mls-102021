/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Rederive.ts" enhancement="_blank"/>

// d1_228: `@@agentDefsL1 <module> /rederive <step>` redoes the defs from a step of the D1 when the generator (or the answer of a platform rule) changed and
// the L4 and the L2 did not. The source key of the D1 is the L4 and the L2, so a second `/run` is a no-op; and a def the D1 itself wrote is only
// overwritten when input20 plans it as `recompose` (its writer receipt matches the bytes). The command leaves a marker with the hashes of the defs
// as they are; while it stands, input20 plans the defs of the chosen step and of the later ones as `recompose`; finalize80 compares and prints the
// `@@agentMaterializeL1` target of each def that changed (and of each def that is gone from the disk: d1_252, the materializer removes its output), then removes the marker.

import { D1_FLOW_STEP_IDS, type D1FileInfo, type D1StepId } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { readText, removeOwned, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { pageJourneyIds, processReceives, processStartEvent, routeReachableOperations, usecaseOperationNames } from '/_102021_/l2/agentMaterializeL1/helpers/workflowReach.js';
import { parseDefinitionSource, readDefinition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { sourceIdentityHash } from '/_102021_/l2/helpers/l1Defs/identity.js';

export const D1_REDERIVE_SCHEMA = '2026-11-20-d1-rederive-v1' as const;

/** The steps a rederive can start from: the ones that write defs. */
export const D1_REDERIVE_STEPS = ['domain30', 'persistence40', 'usecases50', 'controllers60', 'support70', 'finalize80'] as const;
export type D1RederiveStep = typeof D1_REDERIVE_STEPS[number];

/** The kinds of def each step writes. finalize80 writes none. */
export const D1_STEP_DEF_TYPES: Readonly<Record<string, readonly string[]>> = {
  domain30: ['domainEntity'],
  persistence40: ['repositoryPort', 'table', 'repositoryAdapter'],
  usecases50: ['usecase'],
  controllers60: ['httpController', 'requestService'],
  support70: ['accessScope', 'authorityMap', 'repositoryRegistration', 'persistenceSeeds', 'integrationOutbound', 'workflowProcess', 'externalConnection'],
};

/** The steps that may call a model. Said before the run. */
export const D1_MODEL_STEPS: Readonly<Record<string, string>> = {
  resolve25: 'only for a route with an open part that has no recorded answer, among closed candidates',
  usecases50: 'only for operation steps',
};

export interface D1RederiveMarker {
  schemaVersion: typeof D1_REDERIVE_SCHEMA;
  from: D1RederiveStep;
  /** Display path of each def (`l1/<module>/…defs.ts`) → its semantic hash before the run. */
  before: Record<string, string>;
}

export function isRederiveStep(value: string): value is D1RederiveStep {
  return (D1_REDERIVE_STEPS as readonly string[]).includes(value);
}

export function rederiveFile(project: number, moduleName: string): D1FileInfo {
  return { project, level: 1, folder: `${moduleName}/pipeline/agentDefsL1`, shortName: 'rederive', extension: '.json' };
}

/** The def kinds of `from` and of every later step. */
export function rederiveTypesFrom(from: D1RederiveStep): string[] {
  const at = D1_FLOW_STEP_IDS.indexOf(from as D1StepId);
  return D1_FLOW_STEP_IDS.slice(at).flatMap(step => D1_STEP_DEF_TYPES[step] ?? []);
}

/** The steps from `from` on, as the checkpoint keeps them. */
export function stepsFrom(from: D1RederiveStep): D1StepId[] {
  return D1_FLOW_STEP_IDS.slice(D1_FLOW_STEP_IDS.indexOf(from as D1StepId)) as D1StepId[];
}

export async function readRederive(project: number, moduleName: string): Promise<D1RederiveMarker | null> {
  const raw = await readText(rederiveFile(project, moduleName));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as D1RederiveMarker;
    return parsed.schemaVersion === D1_REDERIVE_SCHEMA && isRederiveStep(parsed.from) && parsed.before && typeof parsed.before === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** The semantic hash of each def, by display path. A def that is not there is left out. */
export async function defHashes(project: number, defPaths: readonly string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const defPath of defPaths) {
    const info = artifactFile(project, qualifyDefPath(project, defPath));
    const text = info ? await readText(info) : null;
    if (text != null) out[defPath] = await sourceIdentityHash(text);
  }
  return out;
}

export async function writeRederive(project: number, moduleName: string, marker: D1RederiveMarker): Promise<void> {
  await writeJson(rederiveFile(project, moduleName), marker);
}

/**
 * The `@@agentMaterializeL1` line of each def that changed or was born since the marker, in dependency order (d1_316), and the marker is removed. A def that came
 * out the same and reads no def that changed is not listed. d1_264: the materializer reuses a unit whose output exists (d1_122), by existence and not by
 * hash, so a def that came out the same but reads (`dependencies`, transitively) a def that changed is listed too: nothing else regenerates its unit.
 */
export async function finishRederive(project: number, moduleName: string, currentDefPaths: readonly string[]): Promise<string[] | null> {
  const marker = await readRederive(project, moduleName);
  if (!marker) return null;
  const now = await defHashes(project, currentDefPaths);
  const changedNow = Object.keys(now).filter(path => marker.before[path] !== now[path]);
  const closure = await readersOfChanged(project, currentDefPaths, changedNow);
  const changed = orderByDependency([...new Set([...changedNow, ...closure.added])].sort(), closure.reads);
  // d1_252: a def that was there before and is gone from the disk now: its target removes the output the materializer wrote for it.
  const gone = Object.keys(marker.before).filter(path => !(path in now) && !currentDefPaths.includes(path));
  const removed: string[] = [];
  for (const path of gone.sort()) if (!Object.keys(await defHashes(project, [path])).length) removed.push(path);
  await removeOwned(rederiveFile(project, moduleName));
  return [...changed, ...removed].map(path => `@@agentMaterializeL1 {"target":"${qualifyDefPath(project, path)}"}`);
}

/**
 * d1_264: the defs of `candidates` that read, through `dependencies`, a def of `changed` or a def that reads one (the closure). The dependency refs are
 * qualified (`_<project>_/l1/...`); a ref that is not a def of the candidates (the L4, another module) never joins the closure.
 */
/** `agents` of `l1/agents/layer_2_application/requests/x.defs.ts`. */
function moduleOf(defPath: string): string {
  return defPath.split('/')[1] ?? '';
}

async function readersOfChanged(project: number, candidates: readonly string[], changed: readonly string[]): Promise<{ added: string[]; reads: ReadonlyMap<string, readonly string[]> }> {
  if (!changed.length) return { added: [], reads: new Map() };
  const prefix = `_${project}_/`;
  const reads = new Map<string, string[]>();
  const parsedDefs = new Map<string, { artifactType: string; artifactId: string; data: Record<string, unknown> }>();
  for (const defPath of candidates) {
    const info = artifactFile(project, qualifyDefPath(project, defPath));
    const text = info ? await readText(info) : null;
    if (text == null) continue;
    const parsed = parseDefinitionSource(text);
    const definition = 'definition' in parsed ? readDefinition(parsed.definition) : null;
    if (!definition || 'issues' in definition) continue;
    reads.set(defPath, definition.dependencies.filter(ref => ref.startsWith(prefix)).map(ref => ref.slice(prefix.length)));
    parsedDefs.set(defPath, { artifactType: definition.artifactType, artifactId: definition.artifactId, data: definition.data });
  }
  // d1_272: a request calls the function of a process without citing it in `dependencies` (the plan of the processes is born after the requests): the
  // process is read through the route, by the one rule the materializer uses to make the handler call it (usecase `Entity.operation` in the process
  // operations, or the message a route serves is the event that starts it).
  const processes = [...parsedDefs].filter(([, def]) => def.artifactType === 'workflowProcess');
  for (const [defPath, def] of parsedDefs) {
    if (def.artifactType !== 'requestService' || !processes.length) continue;
    const rows = Array.isArray(def.data.requests) ? def.data.requests.filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object') : [];
    const operations = new Set<string>();
    for (const row of rows) {
      for (const usecaseId of Array.isArray(row.uses) ? row.uses.map(String) : []) {
        const usecase = [...parsedDefs.values()].find(item => item.artifactType === 'usecase' && item.artifactId === usecaseId);
        if (usecase) for (const name of usecaseOperationNames(usecase.data)) operations.add(name);
      }
    }
    const serves = new Set(rows.map(row => String(row.serves ?? '')).filter(Boolean));
    const shared = artifactFile(project, `_${project}_/l2/${moduleOf(defPath)}/web/shared/${String(def.data.pageId ?? def.artifactId)}.defs.ts`);
    const journeys = pageJourneyIds(shared ? await readText(shared) : null);
    for (const [processPath, process] of processes) {
      const reached = routeReachableOperations(process.data, journeys).some(name => operations.has(name)) || serves.has(processStartEvent(process.data)) || [...processReceives(process.data).keys()].some(arrival => serves.has(arrival));
      if (reached && !reads.get(defPath)?.includes(processPath)) reads.get(defPath)?.push(processPath);
    }
  }
  const inClosure = new Set(changed);
  const added: string[] = [];
  for (let grew = true; grew;) {
    grew = false;
    for (const [defPath, deps] of reads) {
      if (inClosure.has(defPath) || !deps.some(dep => inClosure.has(dep))) continue;
      inClosure.add(defPath);
      added.push(defPath);
      grew = true;
    }
  }
  return { added, reads };
}

/**
 * d1_316: the targets in dependency order: a def never comes before a def of the list that it reads through `dependencies` (a route after the usecase it uses). Defs with
 * nothing between them keep the path order of `paths`; a cycle is left in path order after the defs that can be placed.
 */
export function orderByDependency(paths: readonly string[], reads: ReadonlyMap<string, readonly string[]>): string[] {
  const inList = new Set(paths);
  const waiting = new Map(paths.map(path => [path, new Set((reads.get(path) ?? []).filter(dep => dep !== path && inList.has(dep)))]));
  const out: string[] = [];
  while (waiting.size > 0) {
    const next = [...waiting.keys()].find(path => (waiting.get(path) as Set<string>).size === 0) ?? [...waiting.keys()][0];
    waiting.delete(next);
    out.push(next);
    for (const deps of waiting.values()) deps.delete(next);
  }
  return out;
}
