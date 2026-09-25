/// <mls fileReference="_102021_/l2/agentMaterializeL1/simulate/simulate.ts" enhancement="_blank"/>

/**
 * C2 simulate: read IO only. Returns generate / reuse / verify / blocked / remove.
 * Does not call a model, write a file, open a database or plan a migration.
 */

import {
  isM1ArtifactType,
  isRecord,
  outputPathFromDefPath,
  type KnownArtifact,
  type M1ArtifactType,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { contentHash, type MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { hashEvidence } from '/_102021_/l2/agentMaterializeL1/state/maintain.js';
import { testFileFor } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import type { MaterializeStateReader } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { handlerFor, type M1HandlerStage } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import {
  compiledSignature,
  platformFilesFor,
  renderPrompt,
  type ContextEntry,
} from '/_102021_/l2/agentMaterializeL1/context/context.js';
import {
  planMaterialization,
  type MaterializationPlan,
  type PlanUnitInput,
  type PlannedUnit,
} from '/_102021_/l2/agentMaterializeL1/planner/plan.js';

export const M1_SIMULATION_SCHEMA = '2026-09-25-m1-simulation-v1' as const;

export interface SimulateInput {
  moduleName: string;
  units: readonly PlanUnitInput[];
  stage?: M1HandlerStage;
  io: MaterializeReadIo;
  state?: MaterializeStateReader;
  extraArtifacts?: readonly KnownArtifact[];
  verifyOnly?: readonly string[];
  removals?: readonly string[];
  /** When set, a receipt written for another recipe does not skip. */
  recipeVersion?: string | null;
}

export interface SimulatedUnit extends PlannedUnit {
  prompt: string;
}

export interface SimulationSnapshot {
  schemaVersion: typeof M1_SIMULATION_SCHEMA;
  moduleName: string;
  stage: M1HandlerStage;
  order: string[];
  cycles: string[][];
  units: SimulatedUnit[];
  /** Simulate never writes. Present so a caller cannot mistake a plan for an emitted file. */
  wrote: false;
}

export async function simulate(input: SimulateInput): Promise<SimulationSnapshot> {
  const stage = input.stage ?? 'structure';
  const cache = new Map<string, string | null>();
  const read = async (ref: string): Promise<string | null> => {
    if (cache.has(ref)) return cache.get(ref) ?? null;
    const text = await input.io.read(ref);
    cache.set(ref, text);
    return text;
  };

  const refs = new Set<string>();
  for (const unit of input.units) {
    const raw = isRecord(unit.definition) ? unit.definition : {};
    const type = typeof raw.artifactType === 'string' ? raw.artifactType : '';
    const data = isRecord(raw.data) ? raw.data : {};
    if (isM1ArtifactType(type) && handlerFor(type, 'structure')) {
      for (const ref of platformFilesFor(type as M1ArtifactType, data)) refs.add(ref);
    }
    const dependencies = Array.isArray(raw.dependencies)
      ? raw.dependencies.filter((item): item is string => typeof item === 'string')
      : [];
    for (const dep of dependencies) {
      refs.add(dep);
      const compiled = outputPathFromDefPath(dep);
      if (compiled) refs.add(compiled);
    }
    const output = outputPathFromDefPath(unit.defPath);
    if (output) refs.add(output);
  }

  const readable: string[] = [];
  const dependencyHashes: Record<string, string> = {};
  for (const ref of [...refs].sort()) {
    const text = await read(ref);
    if (text === null) continue;
    readable.push(ref);
    dependencyHashes[ref] = await hashEvidence(text);
  }

  const testHashes: Record<string, string> = {};
  for (const unit of input.units) {
    const output = outputPathFromDefPath(unit.defPath);
    const testPath = output ? testFileFor(output) : '';
    if (!testPath) continue;
    const text = await read(testPath);
    if (text !== null) testHashes[testPath] = await contentHash(text);
  }

  const receipts = new Map<string, Awaited<ReturnType<MaterializeStateReader['readReceipt']>>>();
  if (input.state) {
    for (const unit of input.units) receipts.set(unit.defPath, await input.state.readReceipt(unit.defPath));
  }

  const outputsPresent = input.units
    .map(unit => outputPathFromDefPath(unit.defPath))
    .filter(path => path && readable.includes(path));

  const plan: MaterializationPlan = await planMaterialization({
    stage,
    units: input.units,
    readable,
    extraArtifacts: input.extraArtifacts,
    receipts,
    outputsPresent,
    verifyOnly: input.verifyOnly,
    removals: input.removals,
    dependencyHashes,
    io: { read },
    recipeVersion: input.recipeVersion ?? null,
    testHashes,
  });

  const units: SimulatedUnit[] = [];
  for (const unit of plan.units) {
    units.push({ ...unit, prompt: await promptFor(unit, cache, read) });
  }
  return {
    schemaVersion: M1_SIMULATION_SCHEMA,
    moduleName: input.moduleName,
    stage: plan.stage,
    order: plan.order,
    cycles: plan.cycles,
    units,
    wrote: false,
  };
}

async function promptFor(
  unit: PlannedUnit,
  cache: Map<string, string | null>,
  read: (ref: string) => Promise<string | null>,
): Promise<string> {
  const entries: ContextEntry[] = [];
  for (const ref of unit.contextRefs) {
    const text = cache.has(ref) ? cache.get(ref) ?? null : await read(ref);
    const role = ref.startsWith('_102034_/l1/') ? 'platform' : 'def';
    if (text === null) {
      entries.push({ ref, role, state: 'inaccessible', sha256: null, signature: null });
    } else {
      entries.push({ ref, role, state: 'read', sha256: await contentHash(text), signature: null });
    }
    const compiledRef = outputPathFromDefPath(ref);
    if (!compiledRef) continue;
    const compiled = cache.has(compiledRef) ? cache.get(compiledRef) ?? null : await read(compiledRef);
    if (compiled === null) continue;
    const signature = compiledSignature(compiled);
    entries.push({
      ref: compiledRef,
      role: 'compiled',
      state: signature ? 'read' : 'inaccessible',
      sha256: signature ? await contentHash(compiled) : null,
      signature,
    });
  }
  return renderPrompt(entries, unit.unresolved);
}
