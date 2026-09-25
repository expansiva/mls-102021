/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/execute.ts" enhancement="_blank"/>

/**
 * Shared run for the CLI and the Studio entry.
 * simulate only reads. structure calls structure handlers. implement calls
 * only handlers registered for implement. A missing body is a named block,
 * not a generic file. A failed checkpoint is not promoted and does not start
 * the next stage. A source that changes during the call is not overwritten.
 */

import {
  isRecord,
  outputPathFromDefPath,
  parseDefinitionSource,
  readDefinition,
  receiptPathFor,
  semanticHash,
  type M1Status,
  type M1Verification,
  type MaterializationReceipt,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { contentHash, type MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { handlerFor, type MaterializeHandler } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { simulate, type SimulationSnapshot, type SimulatedUnit } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import {
  canonicalJson,
  parseCatalog,
  renderMonitorCatalog,
  renderNodeTest,
  testFileFor,
} from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { emittedValueExports } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { catalogBytes, catalogWithheld, deriveCatalog, type CatalogGap } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { verifyBatch, type M1Checkpoint, type M1Observation } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import {
  decideProfile,
  emptyLedger,
  encodeLedger,
  ledgerPath,
  noteModelCall,
  noteRepair,
  parseLedger,
  tightenBudget,
  type BudgetRequest,
  type EffectiveBudget,
  type LedgerUnit,
  type MaterializeLedger,
  type ProfileDecision,
  MaterializeCallError,
} from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import { unitsForFlow, type M1EntryStage } from '/_102021_/l2/agentMaterializeL1/run/command.js';
import { invokeModel, shouldCallModel, type ModelPort } from '/_102021_/l2/agentMaterializeL1/run/model.js';
import {
  hashEvidence,
  M1_OWNED_SCHEMA,
  M1_RECIPE_VERSION,
  ownedManifestRef,
  parseOwnedManifest,
  renderOwnedManifest,
  replaceStatus,
  stagingRef,
  statusForPromotion,
  type WriteBoundary,
} from '/_102021_/l2/agentMaterializeL1/state/maintain.js';

export const M1_RUN_SCHEMA = '2026-09-25-m1-run-v1' as const;
export { M1_RECIPE_VERSION };

export interface HandlerOutcome {
  files: Record<string, string>;
  observations: M1Observation[];
  failure: { code: string; detail: string } | null;
  seeds: boolean;
  resets: boolean;
  runsStub: boolean;
  /** Extra receipt rows. A compiled table and an unapplied migration are two rows. */
  evidences?: M1Verification[];
}

export interface HandlerCall {
  handler: MaterializeHandler;
  unit: SimulatedUnit;
  /** The def the planner already accepted. The runner does not receive a write port. */
  definition: unknown;
  read: (ref: string) => Promise<string | null>;
  catalogRef: string;
  repair: boolean;
  signal: AbortSignal;
  eventId: string;
  profile: ProfileDecision;
  modelText: string | null;
}

export type MaterializeHandlerRunner = (call: HandlerCall) => Promise<HandlerOutcome>;

export interface MaterializeWriter {
  claim(moduleName: string, holder: string): Promise<boolean>;
  release(moduleName: string, holder: string): Promise<void>;
}

export interface MaterializeRunHost {
  io: MaterializeReadIo;
  state: MaterializeStateStore;
  runners: Readonly<Record<string, MaterializeHandlerRunner>>;
  llm?: ModelPort;
  now?: () => string;
  catalogRef?: string;
  commit?: string;
  monitorError?: string | null;
  /** One writer per module. Absent in unit tests that do not share a store. */
  writer?: MaterializeWriter;
  onBoundary?: (boundary: WriteBoundary) => Promise<void> | void;
}

export interface MaterializeRunRequest {
  project: number;
  moduleName: string;
  stage: M1EntryStage | null;
  flow: string;
  resume: boolean;
  units: readonly PlanUnitInput[];
  profileMode: unknown;
  profileDeclared: boolean;
  budget?: BudgetRequest | null;
  eventId?: string;
  signal?: AbortSignal;
}

export interface UnitOutcome {
  defPath: string;
  code: string;
  detail: string;
  promoted: boolean;
  modelCalls: number;
}

export interface MaterializeRunResult {
  schemaVersion: typeof M1_RUN_SCHEMA;
  project: number;
  moduleName: string;
  stage: M1EntryStage;
  flow: string;
  profile: ProfileDecision;
  budget: EffectiveBudget;
  snapshot: SimulationSnapshot | null;
  ledger: MaterializeLedger;
  units: UnitOutcome[];
  checkpoints: M1Checkpoint[];
  llmCalls: number;
  wrote: boolean;
  ended: string;
  catalog?: CatalogPrep;
}

export interface CatalogPrep {
  ref: string;
  action: 'simulated' | 'written' | 'unchanged' | 'conflict' | 'invalid';
  inputHash: string;
  recipeVersion: string;
  gaps: CatalogGap[];
  detail: string;
}

export async function runMaterialize(request: MaterializeRunRequest, host: MaterializeRunHost): Promise<MaterializeRunResult> {
  const profile = decideProfile(request.profileMode, request.profileDeclared);
  const selected = unitsForFlow(request.units, request.flow);
  const book = ledgerPath(request.moduleName);
  const stored = await readLedger(host, book, request.project, request.moduleName);
  if (request.resume && stored === 'missing') {
    const budget = tightenBudget(request.budget ?? null, null);
    return finish(request, profile, budget, null, emptyLedger(request.project, request.moduleName, budget), [], [], 0, false, 'NOTHING_TO_RESUME', request.stage ?? 'simulate');
  }
  if (stored === 'corrupt') {
    const budget = tightenBudget(request.budget ?? null, null);
    return finish(request, profile, budget, null, emptyLedger(request.project, request.moduleName, budget), [], [], 0, false, 'LEDGER_UNREADABLE', request.stage ?? 'simulate');
  }
  const budget = tightenBudget(request.budget ?? null, stored && stored !== 'missing' ? stored.budget : null);
  const ledger = stored && stored !== 'missing'
    ? stored
    : emptyLedger(request.project, request.moduleName, budget, request.stage ?? 'simulate');
  ledger.budget = budget;
  const stage: M1EntryStage = request.stage ?? (request.resume ? ledger.stage : 'simulate');
  if (request.eventId) {
    const previous = ledger.events.find(event => event.id === request.eventId);
    if (previous) {
      return finish(request, profile, budget, null, ledger, previous.units.map(unit => ({
        defPath: unit.defPath,
        code: 'DUPLICATE_EVENT',
        detail: previous.ended,
        promoted: false,
        modelCalls: 0,
      })), [], ledger.calls, false, 'DUPLICATE_EVENT', stage);
    }
  }
  if (request.flow && selected.length === 0) {
    return finish(request, profile, budget, null, ledger, [], [], ledger.calls, false, 'FLOW_NOT_FOUND', stage);
  }
  if (selected.length === 0) {
    return finish(request, profile, budget, null, ledger, [], [], ledger.calls, false, 'NO_UNITS', stage);
  }

  const planStage = stage === 'implement' ? 'implement' : 'structure';
  const merged = await preferDiskDefinitions(host, selected);
  const removals = request.flow ? [] : await ownedRemovals(host, request.moduleName, request.units);
  const snapshot = await simulate({
    moduleName: request.moduleName,
    units: merged,
    stage: planStage,
    io: host.io,
    state: host.state,
    verifyOnly: stage === 'verify' ? merged.map(unit => unit.defPath) : [],
    recipeVersion: M1_RECIPE_VERSION,
    removals,
  });
  const catalogPrep = host.catalogRef ? await prepareCatalog(request, host, snapshot, merged, stage !== 'simulate') : null;
  if (catalogPrep?.action === 'invalid') {
    return finish(request, profile, budget, snapshot, ledger, [], [], 0, false, 'CATALOG_INVALID', stage, catalogPrep);
  }
  if (catalogPrep && ledger.catalogInputHash && ledger.catalogInputHash !== catalogPrep.inputHash) {
    for (const unit of Object.values(ledger.units)) {
      if (unit.signature === 'CATALOG_UNREAD' || unit.signature === 'CATALOG_INVALID' || unit.signature === 'CHECKPOINT_FAILED') {
        unit.signature = '';
      }
    }
  }
  if (catalogPrep) ledger.catalogInputHash = catalogPrep.inputHash;
  if (stage === 'simulate') {
    return finish(request, profile, budget, snapshot, ledger, snapshot.units.map(unit => ({
      defPath: unit.defPath,
      code: unit.action.toUpperCase(),
      detail: unit.reason,
      promoted: false,
      modelCalls: 0,
    })), [], 0, false, 'SIMULATED', stage, catalogPrep);
  }

  const holder = `${request.project}:${request.moduleName}:${Math.random().toString(16).slice(2)}`;
  if (host.writer && !await host.writer.claim(request.moduleName, holder)) {
    return finish(request, profile, budget, snapshot, ledger, [], [], 0, false, 'WRITER_BUSY', stage, catalogPrep);
  }
  try {
    const openedAs = ledger.stage;
    ledger.stage = stage;
    let wrote = catalogPrep?.action === 'written';
    const outcomes: UnitOutcome[] = [];
    const checkpoints: M1Checkpoint[] = [];
    const modelCalls = { count: ledger.calls };
    const pending = snapshot.units.map(unit => unit.defPath);
    const done = new Set<string>();
    const definitions = new Map(merged.map(unit => [unit.defPath, unit.definition]));
    const depsOf = dependencyMap(merged);

    while (pending.length > 0) {
      if (request.signal?.aborted) {
        ledger.stage = stage;
        await persist(host, book, ledger);
        return finish(request, profile, budget, snapshot, ledger, outcomes, checkpoints, modelCalls.count - (stored && stored !== 'missing' ? stored.calls : 0), wrote, 'INTERRUPTED', stage, catalogPrep);
      }
      const ready = pending.filter(path => (depsOf.get(path) ?? []).every(dep => done.has(dep) || !depsOf.has(dep)));
      if (ready.length === 0) break;
      const wave = ready.slice(0, budget.maxWorkers);
      for (const path of wave) pending.splice(pending.indexOf(path), 1);
      await Promise.all(wave.map(async path => {
        const unit = snapshot.units.find(item => item.defPath === path);
        if (!unit) return;
        const outcome = await runUnit(
          request, host, stage, profile, budget, ledger, unit, definitions.get(path), depsOf.get(path) ?? [], checkpoints, modelCalls, openedAs,
        );
        outcomes.push(outcome);
        if (outcome.promoted) wrote = true;
        done.add(path);
      }));
      ledger.stage = stage;
      await persist(host, book, ledger);
    }

    const endedName = ledger.callsExhausted && outcomes.some(item => item.code === 'BUDGET_CALLS')
      ? 'BUDGET_CALLS'
      : 'COMPLETED';
    if (request.eventId) {
      ledger.events.push({
        id: request.eventId,
        ended: endedName,
        units: outcomes.map(unit => ({ defPath: unit.defPath, code: unit.code, promoted: unit.promoted })),
      });
      ledger.stage = stage;
      await persist(host, book, ledger);
    }
    await persistOwned(host, request.moduleName, request.units.map(unit => unit.defPath));
    return finish(
      request,
      profile,
      budget,
      snapshot,
      ledger,
      orderOutcomes(snapshot, outcomes),
      checkpoints,
      modelCalls.count - (stored && stored !== 'missing' ? stored.calls : 0),
      wrote,
      endedName,
      stage,
      catalogPrep,
    );
  } finally {
    if (host.writer) await host.writer.release(request.moduleName, holder);
  }
}

async function runUnit(
  request: MaterializeRunRequest,
  host: MaterializeRunHost,
  stage: M1EntryStage,
  profile: ProfileDecision,
  budget: EffectiveBudget,
  ledger: MaterializeLedger,
  unit: SimulatedUnit,
  definition: unknown,
  deps: readonly string[],
  checkpoints: M1Checkpoint[],
  modelCalls: { count: number },
  openedAs: MaterializeLedger['stage'],
): Promise<UnitOutcome> {
  const prior = ledger.units[unit.defPath];
  const finishedAs = prior?.stage ?? openedAs;
  if (prior?.ended && prior.ended !== 'INTERRUPTED' && finishedAs === stage) {
    const success = prior.ended === 'PROMOTED' || prior.ended === 'REUSE' || prior.ended === 'VERIFIED';
    if (success && (unit.action === 'reuse' || unit.action === 'verify')) {
      const code = unit.action === 'verify' ? 'VERIFIED' : 'REUSE';
      return outcome(unit.defPath, code, unit.reason, false, 0);
    }
    if (!success && await sameSemantic(host, unit.defPath, definition) && !releasedBlock(definition, unit.action)) {
      return outcome(unit.defPath, prior.ended, 'Resume kept the failed attempt. The budget was not reset.', false, 0);
    }
  }
  if (unit.action === 'conflict') {
    await writeConflictReceipt(request, host, unit, definition, codeOf(unit.reason, 'LOCAL_EDIT'), unit.reason);
    return remember(ledger, unit.defPath, outcome(unit.defPath, codeOf(unit.reason, 'LOCAL_EDIT'), unit.reason, false, 0));
  }
  if (unit.action === 'blocked') {
    if (!unit.reason.startsWith('BLOCKED_BY:') && !unit.reason.startsWith('STATUS_')) {
      await writeBlockedReceipt(request, host, unit, definition, codeOf(unit.reason, 'BLOCKED'), unit.reason);
      await writeDefStatus(host, unit.defPath, 'blocked');
    }
    return remember(ledger, unit.defPath, outcome(unit.defPath, codeOf(unit.reason, 'BLOCKED'), unit.reason, false, 0));
  }
  if (unit.action === 'reuse') {
    return remember(ledger, unit.defPath, outcome(unit.defPath, 'REUSE', unit.reason, false, 0));
  }
  if (unit.action === 'remove') {
    const output = outputPathFromDefPath(unit.defPath);
    const previous = await host.state.readReceipt(unit.defPath);
    const owned = [...new Set([
      ...(output ? [output] : []),
      ...Object.keys(previous?.outputHashes ?? {}),
    ])];
    await host.state.removeOwned(owned, owned);
    return remember(ledger, unit.defPath, outcome(unit.defPath, 'REMOVE', unit.reason, false, 0));
  }
  if (unit.action === 'verify' || stage === 'verify') {
    if (unit.action === 'generate') {
      return remember(ledger, unit.defPath, outcome(unit.defPath, 'NOT_READY', 'Verify does not generate. The output is not an accepted implementation.', false, 0));
    }
    const checkpoint = await checkUnit(request, host, unit, []);
    checkpoints.push(checkpoint);
    const failed = !checkpoint.accepted;
    return remember(ledger, unit.defPath, outcome(
      unit.defPath,
      failed ? 'CHECKPOINT_FAILED' : 'VERIFIED',
      checkpoint.nextAction,
      false,
      0,
    ));
  }
  if (stage === 'implement' && unit.action !== 'generate') {
    return remember(ledger, unit.defPath, outcome(unit.defPath, codeOf(unit.reason, 'BLOCKED'), unit.reason, false, 0));
  }
  if (deps.some(path => !dependencyOk(ledger.units[path]?.ended || ''))) {
    return remember(ledger, unit.defPath, outcome(unit.defPath, 'BLOCKED_BY', `A dependency failed. ${unit.defPath} was not started.`, false, 0));
  }

  const handler = handlerFor(unit.artifactType, stage === 'implement' ? 'implement' : 'structure');
  if (!handler || handler.id !== unit.handlerId || handler.stage !== (stage === 'implement' ? 'implement' : 'structure')) {
    return remember(ledger, unit.defPath, outcome(
      unit.defPath,
      'NO_NAMED_HANDLER',
      unit.reason || `No ${stage} handler is registered for ${unit.artifactType || 'this type'}. No file was written.`,
      false,
      0,
    ));
  }
  const runner = host.runners[handler.id];
  if (!runner) {
    await writeBlockedReceipt(request, host, unit, definition, 'HANDLER_UNBOUND', `${handler.id} has no executor. No generic file was written.`);
    return remember(ledger, unit.defPath, outcome(unit.defPath, 'HANDLER_UNBOUND', `${handler.id} has no executor. No generic file was written.`, false, 0));
  }

  const before = await fingerprint(host.io, unit);
  const revisionBefore = await host.state.readRevision(unit.defPath);
  const first = await attempt(request, host, stage, profile, budget, ledger, unit, definition, handler, runner, false, modelCalls);
  if (first.kind === 'promoted' || first.kind === 'held') {
    const promoted = await promote(
      request, host, unit, definition, before, revisionBefore, first.files, first.checkpoint, first.runsStub,
      first.kind === 'held' ? 'BLOCKED' : 'PROMOTED',
      first.evidences,
    );
    if (promoted.checkpoint) checkpoints.push(promoted.checkpoint);
    return remember(ledger, unit.defPath, promoted.outcome);
  }
  if (first.checkpoint) checkpoints.push(first.checkpoint);
  if (!repairable(first.code) || sameSignature(ledger, unit.defPath, first.code)) {
    const code = sameSignature(ledger, unit.defPath, first.code) ? 'REPEATED_FAILURE' : first.code;
    await writeBlockedReceipt(request, host, unit, definition, code, first.detail);
    return remember(ledger, unit.defPath, outcome(unit.defPath, code, first.detail, false, first.modelCalls), first.code);
  }
  if (!noteRepair(ledger, budget, unit.defPath)) {
    await writeBlockedReceipt(request, host, unit, definition, 'REPAIR_BUDGET', first.detail);
    return remember(ledger, unit.defPath, outcome(unit.defPath, 'REPAIR_BUDGET', first.detail, false, first.modelCalls), first.code);
  }
  const second = await attempt(request, host, stage, profile, budget, ledger, unit, definition, handler, runner, true, modelCalls);
  if (second.kind === 'promoted') {
    const promoted = await promote(
      request, host, unit, definition, before, revisionBefore, second.files, second.checkpoint, second.runsStub,
      'PROMOTED', second.evidences,
    );
    if (promoted.checkpoint) checkpoints.push(promoted.checkpoint);
    return remember(ledger, unit.defPath, {
      ...promoted.outcome,
      modelCalls: first.modelCalls + promoted.outcome.modelCalls,
    });
  }
  if (second.checkpoint) checkpoints.push(second.checkpoint);
  const repeated = second.code === first.code;
  const code = repeated ? 'REPEATED_FAILURE' : second.code;
  await writeBlockedReceipt(request, host, unit, definition, code, second.detail);
  return remember(
    ledger,
    unit.defPath,
    outcome(unit.defPath, code, second.detail, false, first.modelCalls + second.modelCalls),
    second.code,
  );
}

interface Attempt {
  kind: 'promoted' | 'held' | 'failed';
  code: string;
  detail: string;
  files: Record<string, string>;
  checkpoint: M1Checkpoint | null;
  modelCalls: number;
  runsStub: boolean;
  evidences?: M1Verification[];
}

async function attempt(
  request: MaterializeRunRequest,
  host: MaterializeRunHost,
  stage: M1EntryStage,
  profile: ProfileDecision,
  budget: EffectiveBudget,
  ledger: MaterializeLedger,
  unit: SimulatedUnit,
  definition: unknown,
  handler: MaterializeHandler,
  runner: MaterializeHandlerRunner,
  repair: boolean,
  modelCalls: { count: number },
): Promise<Attempt> {
  let modelText: string | null = null;
  let usedModel = 0;
  if (unit.needsLlm || shouldCallModel(stage, handler)) {
    if (!host.llm) {
      return { kind: 'failed', code: 'LLM_UNAVAILABLE', detail: `${unit.defPath} needs a model and none is configured.`, files: {}, checkpoint: null, modelCalls: 0, runsStub: false };
    }
    if (!noteModelCall(ledger, budget)) {
      return { kind: 'failed', code: 'BUDGET_CALLS', detail: `Model call ceiling ${budget.callsPerRun} is already used.`, files: {}, checkpoint: null, modelCalls: 0, runsStub: false };
    }
    modelCalls.count = ledger.calls;
    usedModel = 1;
    try {
      modelText = await invokeModel(host.llm, {
        prompt: unit.prompt,
        signal: request.signal ?? new AbortController().signal,
        eventId: `${request.eventId || request.moduleName}:${unit.defPath}:${repair ? 'repair' : 'call'}`,
      }, budget.timeoutMs);
    } catch (error) {
      const mapped = asCallError(error);
      return { kind: 'failed', code: mapped.code, detail: mapped.message, files: {}, checkpoint: null, modelCalls: usedModel, runsStub: false };
    }
  }
  const unitState = touch(ledger, unit.defPath);
  unitState.calls += 1;
  let produced: HandlerOutcome;
  try {
    produced = await withTimeout(signal => runner({
      handler,
      unit,
      definition,
      read: ref => host.io.read(ref),
      catalogRef: host.catalogRef || '',
      repair,
      signal,
      eventId: `${unit.defPath}:${unitState.calls}`,
      profile,
      modelText,
    }), budget.timeoutMs);
  } catch (error) {
    const mapped = asCallError(error);
    return { kind: 'failed', code: mapped.code, detail: mapped.message, files: {}, checkpoint: null, modelCalls: usedModel, runsStub: false };
  }
  if (produced.failure) {
    return { kind: 'failed', code: produced.failure.code, detail: produced.failure.detail, files: {}, checkpoint: null, modelCalls: usedModel, runsStub: produced.runsStub };
  }
  if ((produced.seeds && !profile.allowsSeeds) || (produced.resets && !profile.allowsReset) || (produced.runsStub && !profile.allowsStubRun)) {
    return {
      kind: 'failed',
      code: 'PROFILE_REFUSED',
      detail: `appEnv='${profile.mode}' refuses seeds, reset or running a stub.`,
      files: {},
      checkpoint: null,
      modelCalls: usedModel,
      runsStub: produced.runsStub,
    };
  }
  const output = outputPathFromDefPath(unit.defPath);
  const foreign = Object.keys(produced.files).filter(path => path !== output);
  if (foreign.length > 0 || !output) {
    return {
      kind: 'failed',
      code: 'WRITE_OUTSIDE_TARGET',
      detail: `Refused ${foreign.join(', ') || 'an empty output path'}. Nothing was written.`,
      files: {},
      checkpoint: null,
      modelCalls: usedModel,
      runsStub: produced.runsStub,
    };
  }
  const checkpoint = await checkUnit(request, host, unit, produced.observations);
  if (!checkpoint.accepted && heldBlock(checkpoint)) {
    const blocked = checkpoint.evidence.filter(item => item.verdict === 'blocked').map(item => item.caseId);
    return {
      kind: 'held',
      code: 'BLOCKED',
      detail: `External gap on ${blocked.join(', ')}. The file is written and the unit is not generated.`,
      files: produced.files,
      checkpoint,
      modelCalls: usedModel,
      runsStub: produced.runsStub,
      evidences: produced.evidences,
    };
  }
  if (!checkpoint.accepted) {
    return { kind: 'failed', code: 'CHECKPOINT_FAILED', detail: checkpoint.nextAction, files: {}, checkpoint, modelCalls: usedModel, runsStub: produced.runsStub };
  }
  return {
    kind: 'promoted', code: 'PROMOTED', detail: checkpoint.nextAction, files: produced.files, checkpoint,
    modelCalls: usedModel, runsStub: produced.runsStub, evidences: produced.evidences,
  };
}

/** Passed cases plus an external block. The output is kept; the unit is not an accepted implementation. */
function heldBlock(checkpoint: M1Checkpoint): boolean {
  return checkpoint.counts.blocked > 0
    && checkpoint.counts.failed === 0
    && checkpoint.counts.skipped === 0
    && checkpoint.counts.inconclusive === 0
    && checkpoint.evidence.every(item => item.verdict === 'passed' || item.verdict === 'blocked');
}

async function promote(
  request: MaterializeRunRequest,
  host: MaterializeRunHost,
  unit: SimulatedUnit,
  definition: unknown,
  before: string,
  revisionBefore: string | null,
  files: Record<string, string>,
  checkpoint: M1Checkpoint | null,
  scaffold: boolean,
  receiptCode = 'PROMOTED',
  evidences?: M1Verification[],
): Promise<{ outcome: UnitOutcome; checkpoint: M1Checkpoint | null }> {
  const output = outputPathFromDefPath(unit.defPath);
  const body = files[output];
  if (typeof body !== 'string') {
    return { outcome: outcome(unit.defPath, 'INVALID_RESPONSE', 'The handler returned no output file.', false, 0), checkpoint };
  }
  await boundary(host, 'before-promote');
  const after = await fingerprint(host.io, unit);
  const revisionNow = await host.state.readRevision(unit.defPath);
  if (before !== after || revisionBefore !== revisionNow) {
    await writeBlockedReceipt(request, host, unit, definition, 'SNAPSHOT_CHANGED', 'The source changed during the call. The previous output was kept.');
    return {
      outcome: outcome(unit.defPath, 'SNAPSHOT_CHANGED', 'The source changed during the call. The previous output was kept.', false, 0),
      checkpoint,
    };
  }
  const current = await host.io.read(output);
  const previous = await host.state.readReceipt(unit.defPath);
  const recorded = previous?.outputHashes[output];
  if (current !== null && typeof recorded === 'string' && recorded.length > 0 && await contentHash(current) !== recorded) {
    await writeConflictReceipt(request, host, unit, definition, 'LOCAL_EDIT', 'The output was edited. It was not overwritten.');
    return {
      outcome: outcome(unit.defPath, 'LOCAL_EDIT', 'The output was edited. It was not overwritten.', false, 0),
      checkpoint,
    };
  }
  const staged = stagingRef(request.moduleName, output);
  await host.state.writeOwned(staged, new TextEncoder().encode(body));
  await boundary(host, 'staging');
  const revisionAfterStage = await host.state.readRevision(unit.defPath);
  const afterStage = await fingerprint(host.io, unit);
  if (revisionAfterStage !== revisionNow || afterStage !== after) {
    await host.state.removeOwned([staged], [staged]);
    await writeBlockedReceipt(request, host, unit, definition, 'SNAPSHOT_CHANGED', 'The source changed during the call. The previous output was kept.');
    return {
      outcome: outcome(unit.defPath, 'SNAPSHOT_CHANGED', 'The source changed during the call. The previous output was kept.', false, 0),
      checkpoint,
    };
  }
  await host.state.writeOwned(output, new TextEncoder().encode(body));
  await boundary(host, 'output');
  const accepted = receiptCode === 'PROMOTED';
  await writeReceipt(
    request, host, unit, definition, output, body, checkpoint, receiptCode,
    accepted ? '' : (checkpoint?.nextAction || receiptCode),
    scaffold,
    evidences,
  );
  await boundary(host, 'receipt');
  const nextStatus = accepted ? statusForPromotion(true, scaffold) : 'blocked';
  if (nextStatus) await writeDefStatus(host, unit.defPath, nextStatus);
  await boundary(host, 'status');
  await host.state.removeOwned([staged], [staged]);
  return {
    outcome: outcome(unit.defPath, receiptCode, checkpoint?.nextAction || (accepted ? 'Promoted.' : receiptCode), accepted, 0),
    checkpoint,
  };
}

async function checkUnit(
  request: MaterializeRunRequest,
  host: MaterializeRunHost,
  unit: SimulatedUnit,
  observations: readonly M1Observation[],
): Promise<M1Checkpoint> {
  const stage = request.stage === 'implement' ? 'implement' : 'structure';
  const handler = handlerFor(unit.artifactType, stage) ?? {
    id: unit.handlerId || 'missing',
    artifactType: 'usecase',
    stage,
    needsLlm: false,
    capabilities: [],
  } as MaterializeHandler;
  const now = host.now ? host.now() : new Date().toISOString();
  return verifyBatch({
    handler,
    io: host.io,
    catalogRef: host.catalogRef || '',
    artifactId: unit.artifactId,
    observations,
    runId: `${request.project}:${request.moduleName}`,
    commit: host.commit || '',
    startedAt: now,
    finishedAt: now,
    monitorError: host.monitorError ?? null,
  });
}

async function writeBlockedReceipt(
  request: MaterializeRunRequest,
  host: MaterializeRunHost,
  unit: SimulatedUnit,
  definition: unknown,
  code: string,
  detail: string,
): Promise<void> {
  await writeReceipt(request, host, unit, definition, '', '', null, code, detail, false);
}

async function writeReceipt(
  request: MaterializeRunRequest,
  host: MaterializeRunHost,
  unit: SimulatedUnit,
  definition: unknown,
  output: string,
  body: string,
  checkpoint: M1Checkpoint | null,
  code: string,
  detail: string,
  scaffold: boolean,
  evidences?: M1Verification[],
): Promise<void> {
  const parsed = readDefinition(definition);
  if ('issues' in parsed) return;
  const path = receiptPathFor(unit.defPath);
  if (!path) return;
  const hash = await semanticHash(parsed);
  const outputHashes = output && body ? { [output]: await contentHash(body) } : {};
  const failed = code !== 'PROMOTED';
  const dependencyHashes: Record<string, string> = {};
  for (const dep of parsed.dependencies) {
    const text = await host.io.read(dep);
    if (text !== null) dependencyHashes[dep] = await hashEvidence(text);
  }
  const sourceHashes: Record<string, string> = { [unit.defPath]: hash };
  const testPath = output ? testFileFor(output) : '';
  if (testPath) {
    const testText = await host.io.read(testPath);
    if (testText !== null) sourceHashes[testPath] = await contentHash(testText);
  }
  const checkpointRow: M1Verification[] = checkpoint ? [{
    id: checkpoint.handlerId,
    kind: 'test',
    passed: checkpoint.accepted,
    detail: checkpoint.nextAction,
  }] : [];
  const receipt: MaterializationReceipt = {
    schemaVersion: '2026-09-24-m1-receipt-v1',
    runId: `${request.project}:${request.moduleName}`,
    candidateId: '',
    defPath: unit.defPath,
    artifactType: parsed.artifactType,
    artifactId: parsed.artifactId,
    recipeVersion: M1_RECIPE_VERSION,
    semanticHash: hash,
    dependencyHashes,
    sourceHashes,
    outputHashes,
    stage: failed ? 'plan' : scaffold ? 'compile' : request.stage === 'implement' ? 'verify' : 'generate',
    verifications: [...checkpointRow, ...(evidences ?? [])],
    failures: failed ? [{ code, detail: detail || code }] : [],
    attempts: 1,
    reason: failed ? `${code}: ${detail}` : scaffold ? 'scaffold' : '',
  };
  await host.state.writeReceipt(receipt);
  if (FAILED_STATUS.has(code)) await writeDefStatus(host, unit.defPath, 'failed');
}

const FAILED_STATUS = new Set([
  'REPEATED_FAILURE', 'REPAIR_BUDGET', 'BUDGET_CALLS', 'NETWORK_UNAVAILABLE',
  'TIMEOUT', 'INVALID_RESPONSE', 'CALL_FAILED', 'CHECKPOINT_FAILED',
]);

async function writeConflictReceipt(
  request: MaterializeRunRequest,
  host: MaterializeRunHost,
  unit: SimulatedUnit,
  definition: unknown,
  code: string,
  detail: string,
): Promise<void> {
  const parsed = readDefinition(definition);
  if ('issues' in parsed) return;
  const path = receiptPathFor(unit.defPath);
  if (!path) return;
  const previous = await host.state.readReceipt(unit.defPath);
  const hash = await semanticHash(parsed);
  const receipt: MaterializationReceipt = {
    schemaVersion: '2026-09-24-m1-receipt-v1',
    runId: `${request.project}:${request.moduleName}`,
    candidateId: previous?.candidateId ?? '',
    defPath: unit.defPath,
    artifactType: parsed.artifactType,
    artifactId: parsed.artifactId,
    recipeVersion: previous?.recipeVersion || M1_RECIPE_VERSION,
    semanticHash: hash,
    dependencyHashes: previous?.dependencyHashes ?? {},
    sourceHashes: previous?.sourceHashes ?? { [unit.defPath]: hash },
    outputHashes: previous?.outputHashes ?? {},
    stage: 'plan',
    verifications: previous?.verifications ?? [],
    failures: [{ code, detail: detail || code }],
    attempts: previous?.attempts ?? 1,
    reason: `${code}: ${detail}`,
  };
  await host.state.writeReceipt(receipt);
}

async function writeDefStatus(host: MaterializeRunHost, defPath: string, status: M1Status): Promise<void> {
  const text = await host.io.read(defPath);
  if (!text) return;
  const next = replaceStatus(text, status);
  if (!next || next === text) return;
  await host.state.writeOwned(defPath, new TextEncoder().encode(next));
}

async function boundary(host: MaterializeRunHost, name: WriteBoundary): Promise<void> {
  if (host.onBoundary) await host.onBoundary(name);
}

async function preferDiskDefinitions(host: MaterializeRunHost, units: readonly PlanUnitInput[]): Promise<PlanUnitInput[]> {
  const merged: PlanUnitInput[] = [];
  for (const unit of units) {
    const text = await host.io.read(unit.defPath);
    if (!text) {
      merged.push(unit);
      continue;
    }
    const parsed = parseDefinitionSource(text);
    merged.push('definition' in parsed ? { defPath: unit.defPath, definition: parsed.definition } : unit);
  }
  return merged;
}

function releasedBlock(definition: unknown, action: string): boolean {
  if (action !== 'generate') return false;
  const parsed = readDefinition(definition);
  return !('issues' in parsed) && parsed.status === 'blocked';
}

async function sameSemantic(host: MaterializeRunHost, defPath: string, definition: unknown): Promise<boolean> {
  const parsed = readDefinition(definition);
  if ('issues' in parsed) return false;
  const receipt = await host.state.readReceipt(defPath);
  if (!receipt) return false;
  return receipt.semanticHash === await semanticHash(parsed);
}

async function ownedRemovals(host: MaterializeRunHost, moduleName: string, units: readonly PlanUnitInput[]): Promise<string[]> {
  const bytes = await host.state.readOwned(ownedManifestRef(moduleName));
  if (!bytes || bytes.byteLength === 0) return [];
  const manifest = parseOwnedManifest(new TextDecoder().decode(bytes), moduleName);
  if (!manifest) return [];
  const present = new Set(units.map(unit => unit.defPath));
  return manifest.units.map(unit => unit.defPath).filter(path => !present.has(path));
}

async function persistOwned(host: MaterializeRunHost, moduleName: string, defPaths: readonly string[]): Promise<void> {
  const units = defPaths.map(defPath => {
    const output = outputPathFromDefPath(defPath);
    return { defPath, outputs: output ? [output] : [] };
  });
  await host.state.writeOwned(ownedManifestRef(moduleName), new TextEncoder().encode(renderOwnedManifest({
    schemaVersion: M1_OWNED_SCHEMA,
    moduleName,
    units,
  })));
}

function dependencyOk(ended: string): boolean {
  return ended === 'PROMOTED' || ended === 'REUSE' || ended === 'VERIFIED';
}

function repairable(code: string): boolean {
  return code === 'TIMEOUT' || code === 'TRANSIENT' || code === 'INVALID_RESPONSE' || code === 'CHECKPOINT_FAILED' || code === 'CALL_FAILED';
}

function sameSignature(ledger: MaterializeLedger, defPath: string, code: string): boolean {
  return ledger.units[defPath]?.signature === code && code !== '';
}

function remember(ledger: MaterializeLedger, defPath: string, value: UnitOutcome, signature = ''): UnitOutcome {
  const unit = touch(ledger, defPath);
  unit.ended = value.code;
  unit.stage = ledger.stage;
  if (signature) unit.signature = signature;
  else if (!unit.signature && value.code !== 'PROMOTED') unit.signature = value.code;
  return value;
}

function touch(ledger: MaterializeLedger, defPath: string): LedgerUnit {
  const current = ledger.units[defPath];
  if (current) return current;
  const created: LedgerUnit = { repairs: 0, calls: 0, signature: '', ended: '' };
  ledger.units[defPath] = created;
  return created;
}

function outcome(defPath: string, code: string, detail: string, promoted: boolean, modelCalls: number): UnitOutcome {
  return { defPath, code, detail, promoted, modelCalls };
}

function codeOf(reason: string, fallback: string): string {
  const name = reason.split(':')[0];
  return name || fallback;
}

async function fingerprint(io: MaterializeReadIo, unit: SimulatedUnit): Promise<string> {
  const output = outputPathFromDefPath(unit.defPath);
  const refs = [unit.defPath, ...unit.contextRefs];
  if (output) refs.push(output);
  const parts: string[] = [];
  for (const ref of refs) {
    const text = await io.read(ref);
    parts.push(text === null ? `${ref}=missing` : `${ref}=${await contentHash(text)}`);
  }
  return parts.join('\n');
}

async function readLedger(
  host: MaterializeRunHost,
  path: string,
  project: number,
  moduleName: string,
): Promise<MaterializeLedger | null | 'missing' | 'corrupt'> {
  const bytes = await host.state.readOwned(path);
  if (!bytes || bytes.byteLength === 0) return 'missing';
  const text = new TextDecoder().decode(bytes);
  const parsed = parseLedger(text, project, moduleName);
  return parsed ?? 'corrupt';
}

async function persist(host: MaterializeRunHost, path: string, ledger: MaterializeLedger): Promise<void> {
  await host.state.writeOwned(path, new TextEncoder().encode(encodeLedger(ledger)));
}

async function withTimeout(work: (signal: AbortSignal) => Promise<HandlerOutcome>, timeoutMs: number): Promise<HandlerOutcome> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new MaterializeCallError('TIMEOUT', `Call exceeded ${timeoutMs}ms.`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([work(controller.signal), timeout]);
  } catch (error) {
    if (error instanceof MaterializeCallError) throw error;
    const wrapped = new Error(error instanceof Error ? error.message : String(error));
    (wrapped as Error & { code: string }).code = 'CALL_FAILED';
    throw wrapped;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function asCallError(error: unknown): { code: string; message: string } {
  if (error instanceof MaterializeCallError) return { code: error.code, message: error.message };
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code) {
      return { code, message: error instanceof Error ? error.message : String(error) };
    }
  }
  return { code: 'CALL_FAILED', message: error instanceof Error ? error.message : String(error) };
}

function dependencyMap(units: readonly PlanUnitInput[]): Map<string, string[]> {
  const known = new Set(units.map(unit => unit.defPath));
  const map = new Map<string, string[]>();
  for (const unit of units) {
    const raw = isRecord(unit.definition) ? unit.definition : {};
    const dependencies = Array.isArray(raw.dependencies)
      ? raw.dependencies.filter((item): item is string => typeof item === 'string' && known.has(item))
      : [];
    map.set(unit.defPath, dependencies);
  }
  return map;
}

function orderOutcomes(snapshot: SimulationSnapshot, outcomes: readonly UnitOutcome[]): UnitOutcome[] {
  const byPath = new Map(outcomes.map(item => [item.defPath, item]));
  return snapshot.order.map(path => byPath.get(path)).filter((item): item is UnitOutcome => !!item);
}

function finish(
  request: MaterializeRunRequest,
  profile: ProfileDecision,
  budget: EffectiveBudget,
  snapshot: SimulationSnapshot | null,
  ledger: MaterializeLedger,
  units: UnitOutcome[],
  checkpoints: M1Checkpoint[],
  llmCalls: number,
  wrote: boolean,
  ended: string,
  stage: M1EntryStage,
  catalog?: CatalogPrep | null,
): MaterializeRunResult {
  return {
    schemaVersion: M1_RUN_SCHEMA,
    project: request.project,
    moduleName: request.moduleName,
    stage,
    flow: request.flow,
    profile,
    budget,
    snapshot,
    ledger,
    units,
    checkpoints,
    llmCalls,
    wrote,
    ended,
    catalog: catalog ?? undefined,
  };
}

async function prepareCatalog(
  request: MaterializeRunRequest,
  host: MaterializeRunHost,
  snapshot: SimulationSnapshot,
  units: readonly PlanUnitInput[],
  write: boolean,
): Promise<CatalogPrep> {
  const ref = host.catalogRef || '';
  const texts: Record<string, string> = {};
  for (const unit of units) {
    const own = await host.io.read(unit.defPath);
    if (own) texts[unit.defPath] = own;
    const raw = isRecord(unit.definition) ? unit.definition : {};
    const dependencies = Array.isArray(raw.dependencies) ? raw.dependencies.filter((item): item is string => typeof item === 'string') : [];
    for (const dependency of dependencies) {
      if (texts[dependency]) continue;
      const text = await host.io.read(dependency);
      if (text) texts[dependency] = text;
    }
  }
  const withheld = snapshot.stage === 'structure'
    ? catalogWithheld(snapshot.units, new Set(Object.keys(host.runners)))
    : new Map<string, string>();
  const derived = deriveCatalog(request.moduleName, units, texts, withheld);
  const valueExports = valueExportsByDef(units);
  const inputHash = await contentHash(catalogBytes(derived.catalog));
  const existing = await host.io.read(ref);
  if (existing === null) {
    if (write) await writeDerived(host, ref, derived.catalog, valueExports);
    return {
      ref,
      action: write ? 'written' : 'simulated',
      inputHash,
      recipeVersion: derived.recipeVersion,
      gaps: derived.gaps,
      detail: write ? 'catalog written from defs' : 'catalog planned; nothing written',
    };
  }
  const parsed = parseCatalog(existing);
  if (!parsed.catalog) {
    return {
      ref,
      action: 'invalid',
      inputHash,
      recipeVersion: derived.recipeVersion,
      gaps: derived.gaps,
      detail: parsed.issues.join('; ') || 'catalog unreadable',
    };
  }
  if (canonicalJson(parsed.catalog) !== catalogBytes(derived.catalog)) {
    return {
      ref,
      action: 'conflict',
      inputHash,
      recipeVersion: derived.recipeVersion,
      gaps: derived.gaps,
      detail: 'existing catalog differs from the derived catalog; it was not overwritten',
    };
  }
  return {
    ref,
    action: 'unchanged',
    inputHash,
    recipeVersion: derived.recipeVersion,
    gaps: derived.gaps,
    detail: 'catalog already matches the defs',
  };
}

function valueExportsByDef(units: readonly PlanUnitInput[]): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  for (const unit of units) {
    const parsed = readDefinition(unit.definition);
    if ('issues' in parsed) continue;
    map.set(unit.defPath, emittedValueExports(parsed));
  }
  return map;
}

async function writeDerived(
  host: MaterializeRunHost,
  ref: string,
  catalog: ReturnType<typeof deriveCatalog>['catalog'],
  valueExports: ReadonlyMap<string, readonly string[]>,
): Promise<void> {
  await host.state.writeOwned(ref, new TextEncoder().encode(renderMonitorCatalog(catalog, ref)));
  for (const scenario of catalog.scenarios) {
    if (!scenario.testFile || scenario.cases.length === 0) continue;
    const current = await host.io.read(scenario.testFile);
    const next = renderNodeTest(scenario, ref.replace(/\.ts$/, '.js'), valueExports.get(scenario.source) ?? []);
    if (current !== null && current !== next) continue;
    await host.state.writeOwned(scenario.testFile, new TextEncoder().encode(next));
  }
}
