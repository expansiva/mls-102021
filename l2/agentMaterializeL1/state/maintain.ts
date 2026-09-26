/// <mls fileReference="_102021_/l2/agentMaterializeL1/state/maintain.ts" enhancement="_blank"/>

/**
 * Maintenance decisions. The store port in core/state.ts stays frozen.
 * `running` is a receipt stage, never a fifth definition status.
 *
 * Who writes status:
 * - pending: D1, when it creates or changes semantics. M1, when the output is
 *   missing or stale and the old status is not evidence. A stub stays pending.
 * - generated: M1, only after the output file, the receipt and the passing
 *   verifications are already durable.
 * - blocked: M1, when a concrete source or external decision is missing.
 *   The reason is on the receipt. Only dependents of that unit are held.
 * - failed: M1, when the repair budget ends without a passing result.
 *   Resume does not zero that budget and does not repeat the exhausted cycle
 *   until the semantic input changes.
 *
 * Local rename of one file is atomic on one filesystem. The output, the receipt
 * and the definition status are three files, so a crash between them is visible.
 * Studio stor has no compare-and-swap and no multi-file transaction. This module
 * does not claim a remote CAS.
 */

import {
  generatedAllowsSkip,
  isRecord,
  parseDefinitionSource,
  readDefinition,
  receiptFolder,
  semanticHash,
  type M1Definition,
  type M1Status,
  type MaterializationReceipt,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { IMPLEMENT_HANDLER_RECIPE } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { STRUCTURE_HANDLER_RECIPE } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

export const M1_RECIPE_VERSION = '2026-09-25-m1-recipe-v1' as const;

/** Receipts store the recipe of the handler stage that wrote them. */
export function recipeForStage(stage: 'structure' | 'implement'): string {
  return stage === 'implement' ? IMPLEMENT_HANDLER_RECIPE : STRUCTURE_HANDLER_RECIPE;
}
export const M1_OWNED_SCHEMA = '2026-09-25-m1-owned-v1' as const;
export const M1_WRITER_SCHEMA = '2026-09-25-m1-writer-v1' as const;

export const WRITE_BOUNDARIES = ['before-promote', 'staging', 'output', 'receipt', 'status'] as const;
export type WriteBoundary = typeof WRITE_BOUNDARIES[number];

const FILE_GAP = new Set(['MISSING_REF', 'CONTEXT_UNREAD', 'MECHANISM_UNBOUND', 'NO_NAMED_HANDLER', 'BLOCKED_BY']);

export interface OwnedEntry {
  defPath: string;
  outputs: string[];
}

export interface OwnedManifest {
  schemaVersion: typeof M1_OWNED_SCHEMA;
  moduleName: string;
  units: OwnedEntry[];
}

export interface WriterRecord {
  schemaVersion: typeof M1_WRITER_SCHEMA;
  moduleName: string;
  holder: string;
}

export interface MaintenanceInput {
  definition: M1Definition;
  /** Semantic hash of the def, status excluded. */
  semantic: string;
  receipt: MaterializationReceipt | null;
  dependencyHashes: Readonly<Record<string, string>>;
  outputPath: string;
  outputPresent: boolean;
  outputHash: string | null;
  /** Null skips the recipe comparison. A value that differs from the receipt invalidates. */
  recipeVersion: string | null;
  /** Structure evidence is not an implement skip. Implement reuses only a verify receipt. */
  stage: 'structure' | 'implement';
  hasImplementHandler: boolean;
  unresolved: readonly string[];
  testPath: string;
  testHash: string | null;
  verifyOnly: boolean;
}

export interface MaintenanceDecision {
  action: 'generate' | 'reuse' | 'verify' | 'blocked' | 'conflict';
  reason: string;
}

export function stagingRef(moduleName: string, outputRef: string): string {
  const marker = `/l1/${moduleName}/`;
  const at = outputRef.indexOf(marker);
  const rest = at >= 0 ? outputRef.slice(at + marker.length) : outputRef.split('/').pop() || 'output.ts';
  return `${receiptFolder(moduleName)}/staging/${rest}`;
}

export function ownedManifestRef(moduleName: string): string {
  return `${receiptFolder(moduleName)}/owned.json`;
}

export function writerRef(moduleName: string): string {
  return `${receiptFolder(moduleName)}/writer.json`;
}

/** Hash a dependency or source. A v2 def hashes the canonical body, so status alone does not cascade. */
export async function hashEvidence(text: string): Promise<string> {
  const parsed = parseDefinitionSource(text);
  if ('definition' in parsed) {
    const read = readDefinition(parsed.definition);
    if (!('issues' in read)) return semanticHash(read);
  }
  return contentHash(text);
}

/**
 * Replace the single envelope status and leave every other byte alone.
 * Returns null when the source is not a def or the status field is not unique.
 */
export function replaceStatus(source: string, status: M1Status): string | null {
  const parsed = parseDefinitionSource(source);
  if (!('definition' in parsed)) return null;
  const read = readDefinition(parsed.definition);
  if ('issues' in read) return null;
  if (read.status === status) return source;
  const pattern = /("status"\s*:\s*")(pending|generated|blocked|failed)(")/g;
  const hits = source.match(pattern);
  if (!hits || hits.length !== 1) return null;
  return source.replace(pattern, `$1${status}$3`);
}

export function statusForPromotion(accepted: boolean, scaffold: boolean): M1Status | null {
  if (!accepted || scaffold) return null;
  return 'generated';
}

/**
 * Generated without an intact output is not a skip. Pending forces work.
 * A hand-edited output is a local conflict: dependents are not invalidated by it.
 * A test-only change asks verify. A recipe change asks generate, unless the
 * output was hand-edited, which still wins.
 */
export async function decideMaintenance(input: MaintenanceInput): Promise<MaintenanceDecision> {
  const receipt = input.receipt;
  const status = input.definition.status;
  const recorded = receipt && input.outputPath ? receipt.outputHashes[input.outputPath] : undefined;
  const hasRecord = typeof recorded === 'string' && recorded.length > 0;
  const outputDrift = input.outputPresent && hasRecord && input.outputHash !== recorded;
  if (status === 'failed' && receipt && !releasedFailure(input, receipt)) {
    const detail = receipt.failures.map(item => item.code).join(', ') || 'definition status is failed.';
    return { action: 'blocked', reason: `STATUS_FAILED: ${detail}` };
  }
  if (status === 'blocked' && receipt?.reason && !releasedBlock(input, receipt)) {
    return { action: 'blocked', reason: `STATUS_BLOCKED: ${receipt.reason}` };
  }
  if (input.stage === 'implement' && !input.hasImplementHandler) {
    return keptStructureOutput(input);
  }
  const recipeDrift = input.recipeVersion !== null && !!receipt && receipt.recipeVersion !== input.recipeVersion;
  const implementGap = input.stage === 'implement'
    && input.hasImplementHandler
    && receipt?.stage !== 'verify';
  const skip = input.outputPresent
    && hasRecord
    && !outputDrift
    && !recipeDrift
    && !implementGap
    && await generatedAllowsSkip(input.definition, receipt, input.dependencyHashes);
  if (skip && (input.verifyOnly || testChanged(input))) {
    return { action: 'verify', reason: 'VERIFY: test change only; implementation receipt is intact.' };
  }
  if (skip) {
    return { action: 'reuse', reason: 'REUSE: receipt matches the semantic hash, dependencies and outputs.' };
  }
  if (outputDrift) {
    const code = recipeDrift || semanticChanged(input) ? 'LOCAL_EDIT' : 'OUTPUT_DRIFT';
    return {
      action: 'conflict',
      reason: `${code}: ${input.outputPath} does not match the receipt; the local file is not overwritten.`,
    };
  }
  if (recipeDrift) {
    return { action: 'generate', reason: `RECIPE_CHANGED: recipe ${input.recipeVersion} does not match the receipt.` };
  }
  if (scaffoldReceiptMatches(input)) {
    return { action: 'reuse', reason: 'REUSE: scaffold compile receipt matches the semantic hash, dependencies and outputs.' };
  }
  const handler = input.hasImplementHandler ? 'implement' : 'structure';
  return {
    action: 'generate',
    reason: `GENERATE: output is not an accepted implementation; handler ${handler}.`,
  };
}

/**
 * A type with no implement handler keeps the structure or persistence output
 * when the receipt still matches. A missing or drifted output stays pending.
 */
function keptStructureOutput(input: MaintenanceInput): MaintenanceDecision {
  if (outputDriftOf(input)) {
    const code = semanticChanged(input) ? 'LOCAL_EDIT' : 'OUTPUT_DRIFT';
    return {
      action: 'conflict',
      reason: `${code}: ${input.outputPath} does not match the receipt; the local file is not overwritten.`,
    };
  }
  if (priorOutputIntact(input)) {
    return { action: 'reuse', reason: 'REUSE: no implement handler; the previous output and its receipt still match.' };
  }
  return { action: 'blocked', reason: 'PENDING: the previous output is missing or invalid.' };
}

function outputDriftOf(input: MaintenanceInput): boolean {
  const recorded = input.receipt && input.outputPath ? input.receipt.outputHashes[input.outputPath] : undefined;
  const hasRecord = typeof recorded === 'string' && recorded.length > 0;
  return input.outputPresent && hasRecord && input.outputHash !== recorded;
}

function priorOutputIntact(input: MaintenanceInput): boolean {
  const receipt = input.receipt;
  if (!receipt || receipt.failures.length > 0) return false;
  if (receipt.stage !== 'compile' && receipt.stage !== 'generate' && receipt.stage !== 'verify') return false;
  if (receipt.semanticHash !== input.semantic) return false;
  if (!input.outputPresent || !input.outputHash) return false;
  if (receipt.outputHashes[input.outputPath] !== input.outputHash) return false;
  for (const path of input.definition.dependencies) {
    if (input.dependencyHashes[path] !== receipt.dependencyHashes[path]) return false;
  }
  return true;
}

/** A structure scaffold stays pending. Its compile receipt is still a reuse when the bytes match. Implement does not skip on it. */
function scaffoldReceiptMatches(input: MaintenanceInput): boolean {
  const receipt = input.receipt;
  if (!receipt || input.stage !== 'structure') return false;
  if (receipt.stage !== 'compile' || receipt.reason !== 'scaffold' || receipt.failures.length > 0) return false;
  if (receipt.semanticHash !== input.semantic) return false;
  if (!input.outputPresent || !input.outputHash) return false;
  if (receipt.outputHashes[input.outputPath] !== input.outputHash) return false;
  for (const path of input.definition.dependencies) {
    if (input.dependencyHashes[path] !== receipt.dependencyHashes[path]) return false;
  }
  return true;
}

function semanticChanged(input: MaintenanceInput): boolean {
  return !!input.receipt && input.receipt.semanticHash !== input.semantic;
}

function testChanged(input: MaintenanceInput): boolean {
  if (!input.testPath || !input.testHash || !input.receipt) return false;
  const recorded = input.receipt.sourceHashes[input.testPath];
  return typeof recorded === 'string' && recorded.length > 0 && recorded !== input.testHash;
}

function releasedFailure(input: MaintenanceInput, receipt: MaterializationReceipt): boolean {
  if (receipt.semanticHash !== input.semantic) return true;
  if (dependencyDrift(input, receipt)) return true;
  return staleFailureRecipe(input, receipt);
}

/** A failed or model-unavailable receipt of an older handler recipe is pending again. The same recipe stays failed. */
function staleFailureRecipe(input: MaintenanceInput, receipt: MaterializationReceipt): boolean {
  if (input.recipeVersion === null || receipt.recipeVersion === input.recipeVersion) return false;
  return receipt.failures.some(item => item.code === 'LLM_UNAVAILABLE' || item.code.length > 0);
}

function releasedBlock(input: MaintenanceInput, receipt: MaterializationReceipt): boolean {
  if (receipt.semanticHash !== input.semantic) return true;
  if (dependencyDrift(input, receipt)) return true;
  const code = receipt.reason.split(':')[0] || '';
  return FILE_GAP.has(code) && input.unresolved.length === 0;
}

function dependencyDrift(input: MaintenanceInput, receipt: MaterializationReceipt): boolean {
  const recorded = isRecord(receipt.dependencyHashes) ? receipt.dependencyHashes : {};
  return input.definition.dependencies.some(path => recorded[path] !== input.dependencyHashes[path]);
}

export function selectRemoval(owned: readonly string[], requested: readonly string[]): { remove: string[]; keep: string[] } {
  const allowed = new Set(owned);
  const remove: string[] = [];
  const keep: string[] = [];
  for (const path of requested) {
    if (!path || path.endsWith('/') || !allowed.has(path)) keep.push(path);
    else remove.push(path);
  }
  return { remove, keep };
}

export function parseOwnedManifest(text: string, moduleName: string): OwnedManifest | null {
  try {
    const parsed = JSON.parse(text) as OwnedManifest;
    if (parsed.schemaVersion !== M1_OWNED_SCHEMA || parsed.moduleName !== moduleName || !Array.isArray(parsed.units)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function renderOwnedManifest(manifest: OwnedManifest): string {
  return `${JSON.stringify(manifest)}\n`;
}

export function parseWriterRecord(text: string): WriterRecord | null {
  try {
    const parsed = JSON.parse(text) as WriterRecord;
    if (parsed.schemaVersion !== M1_WRITER_SCHEMA || !parsed.holder || !parsed.moduleName) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Reverse closure: units that depend on `changed`, directly or further down. */
export function reverseClosure(changed: readonly string[], dependents: ReadonlyMap<string, readonly string[]>): string[] {
  const seen = new Set<string>();
  const stack = [...changed];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const next of dependents.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }
  return [...seen].sort();
}
