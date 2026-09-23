/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/contracts.ts" enhancement="_blank"/>

import type { D1PipelineState, D1StepId } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

export const D1_REPORT_VERSION = '2026-09-22-d1-report-v1' as const;

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
  /** Texts of the snapshot sources the fidelity reader opens. Not the usecase draft. */
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
  values: string[];
  consumed: boolean;
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
  llmCalls: 0;
  repairOpened: false;
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
  if (report.llmCalls !== 0 || report.repairOpened !== false || report.executableBackend !== false) return null;
  if (report.inventoryNote !== INVENTORY_NOTE) return null;
  if (!Array.isArray(report.phases) || !Array.isArray(report.findings) || !Array.isArray(report.files)) return null;
  if (report.outcome !== 'complete' && report.outcome !== 'held') return null;
  if (report.defsStatus !== 'complete' && report.defsStatus !== 'incomplete' && report.defsStatus !== 'notRun') return null;
  return report;
}
