/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/budget.ts" enhancement="_blank"/>

/**
 * Ceilings from the approved plan. A requested or already stored budget that
 * is tighter wins. Nothing in this module raises a ceiling.
 * Profile names match the server's project mode: a test mode never selects
 * DATABASE_URL, and a missing mode is presentation, not production.
 * This module does not read an environment variable and does not open a database.
 */

import { receiptFolder } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';

export const M1_CEILING = {
  maxWorkers: 2,
  timeoutMs: 120_000,
  repairsPerArtifact: 1,
  repairsPerRun: 4,
  callsPerRun: 24,
} as const;

export const M1_LEDGER_SCHEMA = '2026-09-25-m1-ledger-v1' as const;

export const M1_PROFILE_MODES = ['production', 'homologation', 'development', 'presentation'] as const;
export type M1ProfileMode = typeof M1_PROFILE_MODES[number];

export interface BudgetRequest {
  maxWorkers?: number;
  timeoutMs?: number;
  repairsPerArtifact?: number;
  repairsPerRun?: number;
  callsPerRun?: number;
}

export interface EffectiveBudget {
  maxWorkers: number;
  timeoutMs: number;
  repairsPerArtifact: number;
  repairsPerRun: number;
  callsPerRun: number;
}

export interface ProfileDecision {
  mode: M1ProfileMode;
  declared: boolean;
  databaseEnv: 'DATABASE_URL' | 'DATABASE_URL_TEST';
  allowsSeeds: boolean;
  allowsReset: boolean;
  allowsStubRun: boolean;
}

export interface LedgerUnit {
  repairs: number;
  calls: number;
  signature: string;
  ended: string;
}

export interface LedgerEvent {
  id: string;
  ended: string;
  units: Array<{ defPath: string; code: string; promoted: boolean }>;
}

export interface MaterializeLedger {
  schemaVersion: typeof M1_LEDGER_SCHEMA;
  project: number;
  moduleName: string;
  /** Stage that last wrote this ledger. Resume without a stage continues it. */
  stage: 'simulate' | 'structure' | 'implement' | 'verify';
  calls: number;
  repairs: number;
  callsExhausted: boolean;
  repairsExhausted: boolean;
  budget: EffectiveBudget;
  units: Record<string, LedgerUnit>;
  events: LedgerEvent[];
}

export type CallErrorCode = 'TIMEOUT' | 'NETWORK_UNAVAILABLE' | 'TRANSIENT' | 'INVALID_RESPONSE';

export class MaterializeCallError extends Error {
  readonly code: CallErrorCode;

  constructor(code: CallErrorCode, message: string) {
    super(message);
    this.name = 'MaterializeCallError';
    this.code = code;
  }
}

export function ledgerPath(moduleName: string): string {
  return `${receiptFolder(moduleName)}/run.json`;
}

export function emptyLedger(
  project: number,
  moduleName: string,
  budget: EffectiveBudget,
  stage: MaterializeLedger['stage'] = 'simulate',
): MaterializeLedger {
  return {
    schemaVersion: M1_LEDGER_SCHEMA,
    project,
    moduleName,
    stage,
    calls: 0,
    repairs: 0,
    callsExhausted: false,
    repairsExhausted: false,
    budget,
    units: {},
    events: [],
  };
}

/** Each dimension is min(ceiling, requested, persisted). Non-positive numbers are ignored. */
export function tightenBudget(requested: BudgetRequest | null, persisted: BudgetRequest | null): EffectiveBudget {
  return {
    maxWorkers: tighten(M1_CEILING.maxWorkers, requested?.maxWorkers, persisted?.maxWorkers),
    timeoutMs: tighten(M1_CEILING.timeoutMs, requested?.timeoutMs, persisted?.timeoutMs),
    repairsPerArtifact: tighten(M1_CEILING.repairsPerArtifact, requested?.repairsPerArtifact, persisted?.repairsPerArtifact),
    repairsPerRun: tighten(M1_CEILING.repairsPerRun, requested?.repairsPerRun, persisted?.repairsPerRun),
    callsPerRun: tighten(M1_CEILING.callsPerRun, requested?.callsPerRun, persisted?.callsPerRun),
  };
}

export function decideProfile(mode: unknown, declared: boolean): ProfileDecision {
  const known = isMode(mode) ? mode : 'presentation';
  const testMode = known === 'development' || known === 'presentation';
  return {
    mode: known,
    declared: declared && isMode(mode),
    databaseEnv: testMode ? 'DATABASE_URL_TEST' : 'DATABASE_URL',
    allowsSeeds: testMode,
    allowsReset: testMode,
    allowsStubRun: testMode,
  };
}

/** Counts one model request. Returns false when the run is already at its ceiling. */
export function noteModelCall(ledger: MaterializeLedger, budget: EffectiveBudget): boolean {
  if (ledger.callsExhausted || ledger.calls >= budget.callsPerRun) {
    ledger.callsExhausted = true;
    return false;
  }
  ledger.calls += 1;
  if (ledger.calls >= budget.callsPerRun) ledger.callsExhausted = true;
  return true;
}

export function noteRepair(ledger: MaterializeLedger, budget: EffectiveBudget, defPath: string): boolean {
  const unit = ledger.units[defPath];
  const used = unit?.repairs ?? 0;
  if (ledger.repairsExhausted || ledger.repairs >= budget.repairsPerRun || used >= budget.repairsPerArtifact) {
    ledger.repairsExhausted = ledger.repairs >= budget.repairsPerRun;
    return false;
  }
  ledger.repairs += 1;
  if (unit) unit.repairs += 1;
  if (ledger.repairs >= budget.repairsPerRun) ledger.repairsExhausted = true;
  return true;
}

export function encodeLedger(ledger: MaterializeLedger): string {
  return `${JSON.stringify(ledger)}\n`;
}

export function parseLedger(text: string, project: number, moduleName: string): MaterializeLedger | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== M1_LEDGER_SCHEMA) return null;
  if (raw.stage !== 'simulate' && raw.stage !== 'structure' && raw.stage !== 'implement' && raw.stage !== 'verify') return null;
  if (raw.project !== project || raw.moduleName !== moduleName) return null;
  if (!isBudget(raw.budget)) return null;
  if (!isCount(raw.calls) || !isCount(raw.repairs)) return null;
  if (typeof raw.callsExhausted !== 'boolean' || typeof raw.repairsExhausted !== 'boolean') return null;
  if (!raw.units || typeof raw.units !== 'object' || Array.isArray(raw.units)) return null;
  if (!Array.isArray(raw.events)) return null;
  const units: Record<string, LedgerUnit> = {};
  for (const [path, item] of Object.entries(raw.units as Record<string, unknown>)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const unit = item as Record<string, unknown>;
    if (!isCount(unit.repairs) || !isCount(unit.calls)) return null;
    if (typeof unit.signature !== 'string' || typeof unit.ended !== 'string') return null;
    units[path] = { repairs: unit.repairs, calls: unit.calls, signature: unit.signature, ended: unit.ended };
  }
  const events: LedgerEvent[] = [];
  for (const item of raw.events) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const event = item as Record<string, unknown>;
    if (typeof event.id !== 'string' || !event.id || typeof event.ended !== 'string' || !Array.isArray(event.units)) return null;
    const slim: LedgerEvent['units'] = [];
    for (const row of event.units) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
      const unit = row as Record<string, unknown>;
      if (typeof unit.defPath !== 'string' || typeof unit.code !== 'string' || typeof unit.promoted !== 'boolean') return null;
      slim.push({ defPath: unit.defPath, code: unit.code, promoted: unit.promoted });
    }
    events.push({ id: event.id, ended: event.ended, units: slim });
  }
  return {
    schemaVersion: M1_LEDGER_SCHEMA,
    project,
    moduleName,
    stage: raw.stage,
    calls: raw.calls,
    repairs: raw.repairs,
    callsExhausted: raw.callsExhausted,
    repairsExhausted: raw.repairsExhausted,
    budget: raw.budget,
    units,
    events,
  };
}

function tighten(ceiling: number, requested: number | undefined, persisted: number | undefined): number {
  let value = ceiling;
  if (isTight(requested)) value = Math.min(value, requested);
  if (isTight(persisted)) value = Math.min(value, persisted);
  return value;
}

function isTight(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isMode(value: unknown): value is M1ProfileMode {
  return typeof value === 'string' && (M1_PROFILE_MODES as readonly string[]).includes(value);
}

function isBudget(value: unknown): value is EffectiveBudget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return isTight(raw.maxWorkers as number) && isTight(raw.timeoutMs as number)
    && isTight(raw.repairsPerArtifact as number) && isTight(raw.repairsPerRun as number)
    && isTight(raw.callsPerRun as number);
}
