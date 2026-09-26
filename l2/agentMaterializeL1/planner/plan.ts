/// <mls fileReference="_102021_/l2/agentMaterializeL1/planner/plan.ts" enhancement="_blank"/>

/**
 * Plan by declared file references, not by directory order and not by a fixed layer rank.
 * A type with no named handler is blocked, except implement: a type that already
 * has a structure or persistence output is reused. Reuse and verify read bytes and do not write.
 */

import {
  isM1ArtifactType,
  isRecord,
  outputPathFromDefPath,
  readDefinition,
  referenceIssues,
  semanticHash,
  type KnownArtifact,
  type M1Definition,
  type MaterializationReceipt,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { platformFilesForDefinition } from '/_102021_/l2/agentMaterializeL1/context/context.js';
import { contentHash, type MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { handlerFor, type M1HandlerStage } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { behaviorNeedsLlm } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { decideMaintenance } from '/_102021_/l2/agentMaterializeL1/state/maintain.js';
import { testFileFor } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';

export const M1_PLAN_ACTIONS = ['generate', 'reuse', 'verify', 'blocked', 'remove', 'conflict'] as const;
export type M1PlanAction = typeof M1_PLAN_ACTIONS[number];

export const PLAN_REASON = {
  noNamedHandler: 'NO_NAMED_HANDLER',
  cycle: 'CYCLE',
  missingRef: 'MISSING_REF',
  ambiguousRef: 'AMBIGUOUS_REF',
  relativeWithoutProject: 'RELATIVE_WITHOUT_PROJECT',
  noConsumer: 'NO_CONSUMER',
  mechanismUnbound: 'MECHANISM_UNBOUND',
  contextUnread: 'CONTEXT_UNREAD',
  blockedBy: 'BLOCKED_BY',
  definition: 'DEFINITION',
  generate: 'GENERATE',
  reuse: 'REUSE',
  verify: 'VERIFY',
  remove: 'REMOVE',
} as const;

const AUXILIARY = new Set(['accessScope', 'authorityMap', 'integrationOutbound']);

export interface PlanUnitInput {
  defPath: string;
  definition: unknown;
}

export interface PlanInput {
  stage?: M1HandlerStage;
  units: readonly PlanUnitInput[];
  /** Qualified refs the host could read. Unit def paths count as present. */
  readable: readonly string[];
  /** Artifacts that are not units (external entities the refs must still resolve). */
  extraArtifacts?: readonly KnownArtifact[];
  receipts?: ReadonlyMap<string, MaterializationReceipt | null>;
  outputsPresent?: readonly string[];
  verifyOnly?: readonly string[];
  /** Def paths that left the set. A path that is still a unit is not removed. */
  removals?: readonly string[];
  dependencyHashes?: Readonly<Record<string, string>>;
  /** Read port. Reuse and verify compare output bytes through it; there is no write. */
  io?: MaterializeReadIo;
  /** When set, a receipt recipe that differs invalidates the unit. */
  recipeVersion?: string | null;
  testHashes?: Readonly<Record<string, string>>;
}

export interface PlannedUnit {
  defPath: string;
  artifactType: string;
  artifactId: string;
  action: M1PlanAction;
  reason: string;
  handlerId: string | null;
  needsLlm: boolean;
  unresolved: string[];
  contextRefs: string[];
  blockedBy: string[];
}

export interface MaterializationPlan {
  stage: M1HandlerStage;
  order: string[];
  cycles: string[][];
  units: PlannedUnit[];
}

export async function planMaterialization(input: PlanInput): Promise<MaterializationPlan> {
  const stage = input.stage ?? 'structure';
  const nodes = input.units.map(unit => inspect(unit));
  const graph = buildGraph(nodes);
  for (const node of nodes) node.consumerCount = graph.outgoing.get(node.defPath)?.size ?? 0;
  applyReferences(nodes, input.readable, input.extraArtifacts ?? []);

  const cycles = cycleGroups(graph);
  const cycleOf = new Map<string, string[]>();
  for (const cycle of cycles) {
    for (const path of new Set(cycle)) cycleOf.set(path, cycle);
  }

  const outputs = new Set(input.outputsPresent ?? []);
  const verifyOnly = new Set(input.verifyOnly ?? []);
  const hashes = input.dependencyHashes ?? {};
  const receipts = input.receipts ?? new Map<string, MaterializationReceipt | null>();
  const planned = new Map<string, PlannedUnit>();
  for (const node of nodes) {
    planned.set(node.defPath, await decide(
      node,
      stage,
      cycleOf.get(node.defPath),
      outputs,
      verifyOnly,
      hashes,
      receipts.get(node.defPath) ?? null,
      input.io ?? null,
      input.recipeVersion ?? null,
      input.testHashes ?? {},
    ));
  }
  propagate(planned, graph.incoming);

  const present = new Set(nodes.map(node => node.defPath));
  const removals = (input.removals ?? []).filter(path => !present.has(path)).sort();
  for (const defPath of removals) {
    planned.set(defPath, {
      defPath,
      artifactType: '',
      artifactId: '',
      action: 'remove',
      reason: `${PLAN_REASON.remove}: owned output is not in the current def set.`,
      handlerId: null,
      needsLlm: false,
      unresolved: [],
      contextRefs: [],
      blockedBy: [],
    });
  }

  const order = [...graph.order, ...graph.unplaced];
  for (const defPath of removals) order.push(defPath);
  return { stage, order, cycles, units: order.map(path => planned.get(path)!) };
}

interface NodeFacts {
  defPath: string;
  rawType: string;
  rawId: string;
  dependencies: string[];
  definition: M1Definition | null;
  issues: string[];
  relative: string[];
  refIssues: string[];
  unresolved: string[];
  contextRefs: string[];
  consumerCount: number;
}

function inspect(unit: PlanUnitInput): NodeFacts {
  const raw = isRecord(unit.definition) ? unit.definition : {};
  const parsed = readDefinition(unit.definition);
  return {
    defPath: unit.defPath,
    rawType: typeof raw.artifactType === 'string' ? raw.artifactType : '',
    rawId: typeof raw.artifactId === 'string' ? raw.artifactId : '',
    dependencies: Array.isArray(raw.dependencies)
      ? raw.dependencies.filter((item): item is string => typeof item === 'string')
      : [],
    definition: 'issues' in parsed ? null : parsed,
    issues: 'issues' in parsed ? parsed.issues : [],
    relative: [],
    refIssues: [],
    unresolved: [],
    contextRefs: [],
    consumerCount: 0,
  };
}

function applyReferences(nodes: NodeFacts[], readable: readonly string[], extra: readonly KnownArtifact[]): void {
  const files = new Set<string>(readable);
  for (const node of nodes) files.add(node.defPath);
  const artifacts: KnownArtifact[] = [];
  for (const node of nodes) {
    if (!node.definition) continue;
    artifacts.push({
      artifactType: node.definition.artifactType,
      artifactId: node.definition.artifactId,
      defPath: node.defPath,
    });
  }
  const unitPaths = new Set(nodes.map(node => node.defPath));
  for (const artifact of extra) {
    if (!unitPaths.has(artifact.defPath)) artifacts.push(artifact);
  }
  for (const node of nodes) {
    node.relative = node.dependencies.filter(isRelativeWithoutProject);
    const platform = node.definition ? platformFilesForDefinition(node.definition) : [];
    node.contextRefs = unique([...platform, ...node.dependencies]);
    node.refIssues = node.definition && node.relative.length === 0
      ? referenceIssues(node.definition, { files: [...files], artifacts })
      : [];
    const unreadDeps = node.dependencies.filter(path => !files.has(path));
    const unreadPlatform = platform.filter(path => !files.has(path));
    node.unresolved = unique([...node.relative, ...unreadDeps, ...unreadPlatform, ...node.refIssues]);
  }
}

async function decide(
  node: NodeFacts,
  stage: M1HandlerStage,
  cycle: string[] | undefined,
  outputs: ReadonlySet<string>,
  verifyOnly: ReadonlySet<string>,
  hashes: Readonly<Record<string, string>>,
  receipt: MaterializationReceipt | null,
  io: MaterializeReadIo | null,
  recipeVersion: string | null,
  testHashes: Readonly<Record<string, string>>,
): Promise<PlannedUnit> {
  const named = handlerFor(node.rawType, stage);
  const base: PlannedUnit = {
    defPath: node.defPath,
    artifactType: node.rawType,
    artifactId: node.rawId,
    action: 'blocked',
    reason: '',
    handlerId: named?.id ?? null,
    needsLlm: stage === 'implement' && !!node.definition && behaviorNeedsLlm(node.definition),
    unresolved: node.rawType && !named && !implementKeepsPrior(stage, node.rawType)
      ? unique([`artifactType:${node.rawType}`, ...node.unresolved])
      : node.unresolved,
    contextRefs: node.contextRefs,
    blockedBy: [],
  };
  if (!named && !implementKeepsPrior(stage, node.rawType)) {
    const label = node.rawType || '(empty)';
    if (!node.rawType) base.unresolved = unique(['artifactType:(empty)', ...node.unresolved]);
    return block(base, `${PLAN_REASON.noNamedHandler}: artifact type ${label} has no named ${stage} handler.`);
  }
  if (node.relative.length > 0) {
    return block(base, `${PLAN_REASON.relativeWithoutProject}: ${node.relative.join(', ')}.`);
  }
  if (!node.definition) {
    return block(base, `${PLAN_REASON.definition}: ${node.issues.join(' ')}`);
  }
  if (cycle) return block(base, `${PLAN_REASON.cycle}: ${cycle.join(' -> ')}.`);
  const missing = node.refIssues.filter(issue => issue.includes('Missing'));
  const ambiguous = node.refIssues.filter(issue => issue.includes('Ambiguous'));
  if (missing.length > 0) return block(base, `${PLAN_REASON.missingRef}: ${missing.join(' ')}`);
  if (ambiguous.length > 0) return block(base, `${PLAN_REASON.ambiguousRef}: ${ambiguous.join(' ')}`);
  const unbound = unboundMechanisms(node.definition);
  if (unbound.length > 0) return block(base, `${PLAN_REASON.mechanismUnbound}: ${unbound.join(', ')}.`);
  if (AUXILIARY.has(node.definition.artifactType) && node.consumerCount === 0) {
    return block(base, `${PLAN_REASON.noConsumer}: ${node.definition.artifactType} ${node.definition.artifactId} has no dependent artifact.`);
  }
  const unreadPlatform = node.contextRefs.filter(path => !node.dependencies.includes(path) && node.unresolved.includes(path));
  if (unreadPlatform.length > 0) return block(base, `${PLAN_REASON.contextUnread}: ${unreadPlatform.join(', ')}.`);

  const output = outputPathFromDefPath(node.defPath);
  const present = output !== '' && outputs.has(output);
  const bytes = present && io ? await io.read(output) : null;
  const outputHash = bytes === null ? null : await contentHash(bytes);
  const testPath = output ? testFileFor(output) : '';
  const decision = await decideMaintenance({
    definition: node.definition,
    semantic: await semanticHash(node.definition),
    receipt,
    dependencyHashes: hashes,
    outputPath: output,
    outputPresent: present && bytes !== null,
    outputHash,
    recipeVersion,
    stage,
    hasImplementHandler: handlerFor(node.definition.artifactType, 'implement') !== null,
    unresolved: node.unresolved,
    testPath,
    testHash: testPath ? testHashes[testPath] ?? null : null,
    verifyOnly: verifyOnly.has(node.defPath),
  });
  if (decision.action === 'generate') {
    if (decision.reason.startsWith('RECIPE_CHANGED')) return { ...base, action: 'generate', reason: decision.reason };
    return generate(base);
  }
  if (decision.action === 'blocked') return block(base, decision.reason);
  return { ...base, action: decision.action, reason: decision.reason, needsLlm: decision.action === 'conflict' ? false : base.needsLlm };
}

/** Implement does not invent a handler. A known type keeps the previous output or goes pending. */
function implementKeepsPrior(stage: M1HandlerStage, rawType: string): boolean {
  return stage === 'implement' && isM1ArtifactType(rawType) && handlerFor(rawType, 'implement') === null;
}

function generate(base: PlannedUnit): PlannedUnit {
  return {
    ...base,
    action: 'generate',
    reason: `${PLAN_REASON.generate}: output is not an accepted implementation; handler ${base.handlerId}.`,
  };
}

function block(base: PlannedUnit, reason: string): PlannedUnit {
  return { ...base, action: 'blocked', reason, needsLlm: false };
}

function unboundMechanisms(definition: M1Definition): string[] {
  if (definition.artifactType !== 'integrationOutbound' || !Array.isArray(definition.data.events)) return [];
  const ids: string[] = [];
  for (const event of definition.data.events) {
    if (!isRecord(event)) continue;
    const mechanism = typeof event.mechanism === 'string' ? event.mechanism.trim() : '';
    if (!mechanism) ids.push(typeof event.eventId === 'string' && event.eventId ? event.eventId : '(unnamed)');
  }
  return ids;
}

function propagate(planned: Map<string, PlannedUnit>, incoming: Map<string, Set<string>>): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const unit of planned.values()) {
      if (unit.action !== 'generate' && unit.action !== 'reuse' && unit.action !== 'verify') continue;
      const blockedBy = [...(incoming.get(unit.defPath) ?? [])]
        .filter(path => planned.get(path)?.action === 'blocked')
        .sort();
      if (blockedBy.length === 0) continue;
      unit.action = 'blocked';
      unit.needsLlm = false;
      unit.blockedBy = blockedBy;
      unit.reason = `${PLAN_REASON.blockedBy}: ${blockedBy.join(', ')}.`;
      changed = true;
    }
  }
}

interface Graph {
  incoming: Map<string, Set<string>>;
  outgoing: Map<string, Set<string>>;
  order: string[];
  unplaced: string[];
}

function buildGraph(nodes: readonly NodeFacts[]): Graph {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  for (const node of nodes) {
    incoming.set(node.defPath, new Set());
    outgoing.set(node.defPath, new Set());
  }
  const known = new Set(nodes.map(node => node.defPath));
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (!known.has(dep)) continue;
      incoming.get(node.defPath)!.add(dep);
      if (dep !== node.defPath) outgoing.get(dep)!.add(node.defPath);
    }
  }
  const pending = new Map<string, Set<string>>();
  for (const [path, deps] of incoming) pending.set(path, new Set(deps));
  const ready: string[] = [];
  for (const node of nodes) {
    if (pending.get(node.defPath)!.size === 0) insertSorted(ready, node.defPath);
  }
  const order: string[] = [];
  const placed = new Set<string>();
  while (ready.length > 0) {
    const next = ready.shift()!;
    order.push(next);
    placed.add(next);
    for (const child of [...outgoing.get(next)!].sort()) {
      const deps = pending.get(child)!;
      deps.delete(next);
      if (deps.size === 0) insertSorted(ready, child);
    }
  }
  const unplaced = nodes.map(node => node.defPath).filter(path => !placed.has(path)).sort();
  return { incoming, outgoing, order, unplaced };
}

function cycleGroups(graph: Graph): string[][] {
  const limit = new Set(graph.unplaced);
  const participants = graph.unplaced.filter(path => reaches(path, path, graph.incoming, limit));
  const member = new Set(participants);
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const start of [...participants].sort()) {
    if (seen.has(start)) continue;
    const stack = [start];
    const group: string[] = [];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (seen.has(node)) continue;
      seen.add(node);
      group.push(node);
      for (const dep of graph.incoming.get(node) ?? []) if (member.has(dep)) stack.push(dep);
      for (const child of graph.outgoing.get(node) ?? []) if (member.has(child)) stack.push(child);
    }
    group.sort();
    groups.push(closeCycle(group, graph.incoming));
  }
  groups.sort((a, b) => a.join('|').localeCompare(b.join('|')));
  return groups;
}

function closeCycle(members: string[], incoming: Map<string, Set<string>>): string[] {
  const start = members[0];
  const path = [start];
  const seen = new Set([start]);
  let cursor = start;
  while (path.length <= members.length + 1) {
    const next = [...(incoming.get(cursor) ?? [])].filter(dep => members.includes(dep)).sort()[0];
    if (!next || next === start) return [...path, start];
    if (seen.has(next)) return [...path, next];
    seen.add(next);
    path.push(next);
    cursor = next;
  }
  return [...path, start];
}

function reaches(start: string, target: string, incoming: Map<string, Set<string>>, limit: ReadonlySet<string>): boolean {
  const stack = [...(incoming.get(start) ?? [])].filter(dep => limit.has(dep));
  const seen = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === target) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const dep of incoming.get(node) ?? []) if (limit.has(dep)) stack.push(dep);
  }
  return false;
}

function isRelativeWithoutProject(path: string): boolean {
  if (/^_\d+_\/l[1-7]\//.test(path)) return false;
  return path.startsWith('l');
}

function insertSorted(queue: string[], id: string): void {
  let lo = 0;
  let hi = queue.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (queue[mid] < id) lo = mid + 1;
    else hi = mid;
  }
  queue.splice(lo, 0, id);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
