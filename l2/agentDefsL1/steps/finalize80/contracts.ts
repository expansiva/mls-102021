/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/contracts.ts" enhancement="_blank"/>

import type { D1PipelineState, D1StepId } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import type { D1CallAccount, D1CallLog } from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';
import type { D1EnumOrigin, D1EnumUse } from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';

/**
 * v2: `consumed` means a covered consumer was proved for this entity and path.
 * It no longer means "every literal appeared in the seed set".
 * `origin` separates catalog owner, writer and restriction. `uses` names the consumer.
 */
export const D1_REPORT_VERSION = '2026-09-24-d1-report-v3' as const;

/** Recognition by the inventory reader is not a runnable backend. */
export const INVENTORY_NOTE = 'Inventory recognition is not certification of an executable backend.' as const;

/** Product types and the step that writes them. Matching is by artifact type, not by file name. */
export const PHASE_OF_TYPE: Record<string, D1StepId> = {
  domainEntity: 'domain30',
  valueObject: 'domain30',
  repositoryPort: 'persistence40',
  table: 'persistence40',
  repositoryAdapter: 'persistence40',
  usecase: 'usecases50',
  httpController: 'controllers60',
  accessScope: 'support70',
  authorityMap: 'support70',
  repositoryRegistration: 'support70',
  persistenceSeeds: 'support70',
  integrationOutbound: 'support70',
};

export const CHAIN_STEP_IDS = ['entry10', 'input20', 'domain30', 'persistence40', 'usecases50', 'controllers60', 'support70'] as const;

export interface D1FinalizeChild {
  planId: string;
  status: string;
  artifactPath: string;
  present: boolean;
}

export interface D1FinalizeObserved {
  defPath: string;
  text: string | null;
  currentHash: string;
  /** Hash the write receipt expects now. Empty when this file has no such receipt. */
  receiptHash: string;
  action: string;
  ownerRefs: string[];
  unitDone: boolean;
}

export interface D1FinalizeContract {
  path: string;
  text: string | null;
  hash: string;
}

export interface D1FinalizeRequest {
  project: number;
  moduleName: string;
  pipeline: D1PipelineState;
  snapshot: D1InputSnapshot | null;
  sourceHashes: Record<string, string>;
  /** Texts opened for fidelity: snapshot sources and declared read dependencies. Not the usecase draft. */
  dependencyTexts: Record<string, string>;
  contracts: Record<string, D1FinalizeContract>;
  drafts: {
    domain30: unknown;
    persistence40: unknown;
    usecases50: unknown;
    controllers60: unknown;
    support70: unknown;
  };
  observed: D1FinalizeObserved[];
  /** Future output path → the `.ts` file is on disk. Absence is expected. */
  futurePresent: Record<string, boolean>;
  children: D1FinalizeChild[];
  /** Observations usecases50 recorded. Null when that folder was not written. */
  callLog: D1CallLog | null;
}

export interface D1FinalizePhase {
  stepId: D1StepId;
  executed: boolean;
  status: 'approved' | 'failed' | 'absent';
  error: string;
}

export interface D1FinalizeFinding {
  severity: 'error' | 'review';
  code: string;
  path: string;
  message: string;
  ownerRef: string;
}

export interface D1FinalizeFile {
  defPath: string;
  action: 'generated' | 'preserved' | 'removed' | 'notGenerated';
  ownerRefs: string[];
  sourceHash: string;
  phase: string;
}

export interface D1FinalizeEnum {
  entityId: string;
  path: string;
  /** Effective values declared by the module. Not the catalog. */
  values: string[];
  /** True when `uses` is non-empty. Not runtime enforcement. */
  consumed: boolean;
  origin: D1EnumOrigin;
  uses: D1EnumUse[];
  limits: string;
}

export interface D1FinalizePending {
  defPath: string;
  outputPath: string;
  present: boolean;
}

export interface D1FinalizeInventory {
  usecaseIds: string[];
  routes: string[];
  portIds: string[];
  tableIds: string[];
}

export interface D1FinalizeReport {
  schemaVersion: typeof D1_REPORT_VERSION;
  project: number;
  moduleName: string;
  /**
   * Receipts from the call log. Not a billing total and not a unit count.
   * `finalizeCalledModel` / `finalizeOpenedRepair` describe this step only.
   */
  calls: D1CallAccount;
  executableBackend: false;
  inventoryNote: typeof INVENTORY_NOTE;
  defsStatus: 'complete' | 'incomplete' | 'notRun';
  materialization: 'pending' | 'none';
  outcome: 'complete' | 'held';
  blocking: string;
  phases: D1FinalizePhase[];
  findings: D1FinalizeFinding[];
  /** Steps that declared enum values stay on the domain draft. */
  declaredNotConsumedBy: string[];
  enumerations: { consumed: D1FinalizeEnum[]; notConsumed: D1FinalizeEnum[] };
  files: D1FinalizeFile[];
  sources: Array<{ path: string; sha256: string; state: string }>;
  materializationPending: D1FinalizePending[];
  coverage: { checked: boolean; gaps: string[] };
  inventory: D1FinalizeInventory;
  snapshotHash: string;
}

export function parseFinalizeReport(text: string): D1FinalizeReport | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const report = parsed as D1FinalizeReport;
  if (report.schemaVersion !== D1_REPORT_VERSION) return null;
  if ('llmCalls' in report || 'repairOpened' in report) return null;
  if (report.executableBackend !== false) return null;
  if (!isCallAccount(report.calls)) return null;
  if (report.inventoryNote !== INVENTORY_NOTE) return null;
  if (!Array.isArray(report.phases) || !Array.isArray(report.findings) || !Array.isArray(report.files)) return null;
  if (!isEnumBlock(report.enumerations)) return null;
  if (report.outcome !== 'complete' && report.outcome !== 'held') return null;
  if (report.defsStatus !== 'complete' && report.defsStatus !== 'incomplete' && report.defsStatus !== 'notRun') return null;
  return report;
}

function isCallAccount(value: unknown): value is D1CallAccount {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const calls = value as D1CallAccount;
  if (calls.finalizeCalledModel !== false || calls.finalizeOpenedRepair !== false) return false;
  if (!measuredPair(calls.repliesDelivered, calls.repliesUnknown)) return false;
  if (!measuredPair(calls.invocationReplies, calls.invocationUnknown)) return false;
  const generationKnown = calls.repliesDelivered !== null;
  if (generationKnown) {
    if (!nonNegative(calls.promptsAssembled) || !nonNegative(calls.repairsScheduled)) return false;
  } else if (calls.promptsAssembled !== null || calls.repairsScheduled !== null) {
    return false;
  }
  if (calls.repliesDelivered !== null && calls.invocationReplies !== null && calls.invocationReplies > calls.repliesDelivered) {
    return false;
  }
  return true;
}

function measuredPair(count: number | null, reason: string): boolean {
  if (count === null) return typeof reason === 'string' && reason.length > 0;
  return nonNegative(count) && reason === '';
}

function nonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

const RESTRICTIONS = new Set(['inherited', 'subset', 'own', 'invalid', 'unresolved']);

function isEnumBlock(value: D1FinalizeReport['enumerations'] | undefined): value is D1FinalizeReport['enumerations'] {
  if (!value || !Array.isArray(value.consumed) || !Array.isArray(value.notConsumed)) return false;
  return [...value.consumed, ...value.notConsumed].every(item => isEnumRow(item));
}

function isEnumRow(value: unknown): value is D1FinalizeEnum {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as D1FinalizeEnum;
  return typeof row.entityId === 'string' && typeof row.path === 'string' && Array.isArray(row.values)
    && Array.isArray(row.uses) && typeof row.limits === 'string'
    && !!row.origin && RESTRICTIONS.has(row.origin.restriction);
}
