/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/verify.ts" enhancement="_blank"/>

/**
 * Classifies one batch against the catalog. Stage comes from the handler
 * registered by m1_01. An unstructured exception or a broken compile is
 * never expected-red.
 */

import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { MaterializeHandler, M1HandlerStage } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import {
  canonicalJson,
  catalogForStage,
  parseCatalog,
  type M1CaseExpect,
  type M1ScenarioCase,
  type M1ScenarioCatalog,
} from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';

export const M1_CHECKPOINT_SCHEMA = '2026-09-25-m1-checkpoint-v1' as const;
export const M1_CHECKPOINT_BUDGET_MS = 20 * 60 * 1000;

export const M1_VERDICTS = ['passed', 'expectedRed', 'failed', 'blocked', 'skipped', 'inconclusive'] as const;
export type M1Verdict = typeof M1_VERDICTS[number];

export const M1_BROKEN = ['none', 'compile', 'import', 'transport'] as const;
export type M1Broken = typeof M1_BROKEN[number];

/** What one case did. The caller fills this. This module does not call a database. */
export interface M1Observation {
  caseId: string;
  durationMs: number;
  broken: M1Broken;
  thrown: boolean;
  skipped: boolean;
  inconclusive: boolean;
  blocked: boolean;
  blockOwner: string;
  ok: boolean;
  status: number;
  errorCode: string | null;
  ruleId: string | null;
  fields: string[];
  rowActorIds: string[];
  reason: string;
}

export interface M1Evidence {
  caseId: string;
  verdict: M1Verdict;
  errorCode: string | null;
  status: number | null;
  durationMs: number;
  detail: string;
}

export interface M1CheckpointCounts {
  passed: number;
  expectedRed: number;
  failed: number;
  blocked: number;
  skipped: number;
  inconclusive: number;
}

export interface M1Checkpoint {
  schemaVersion: typeof M1_CHECKPOINT_SCHEMA;
  runId: string;
  inputHash: string;
  commit: string;
  stage: M1HandlerStage;
  handlerId: string;
  startedAt: string;
  finishedAt: string;
  budgetMs: typeof M1_CHECKPOINT_BUDGET_MS;
  counts: M1CheckpointCounts;
  durationsMs: { total: number };
  ready: boolean;
  accepted: boolean;
  evidence: M1Evidence[];
  nextAction: string;
  monitor: { delivered: boolean; error: string | null };
}

/** Verification request. The handler and the read port belong to m1_01. */
export interface MaterializeVerificationRequest {
  handler: MaterializeHandler;
  io: MaterializeReadIo;
  catalogRef: string;
  /** When set, only this artifact's scenarios are scored. An empty match is not a failed batch. */
  artifactId?: string;
  observations: readonly M1Observation[];
  runId: string;
  commit: string;
  startedAt: string;
  finishedAt: string;
  monitorError: string | null;
}

export function checkpointDue(elapsedMs: number, batchClosed: boolean): boolean {
  return batchClosed || elapsedMs >= M1_CHECKPOINT_BUDGET_MS;
}

export function classifyCase(
  stage: M1HandlerStage,
  item: M1ScenarioCase,
  observation: M1Observation | undefined,
): M1Evidence {
  if (!observation) {
    return evidence(item.caseId, 'inconclusive', null, null, 0, 'case did not run');
  }
  const base = { errorCode: observation.errorCode, status: observation.status, durationMs: observation.durationMs };
  if (observation.thrown) {
    return evidence(item.caseId, 'failed', base.errorCode, base.status, base.durationMs, 'unstructured exception is not an expected failure');
  }
  if (observation.broken !== 'none') {
    return evidence(item.caseId, 'failed', base.errorCode, base.status, base.durationMs, `${observation.broken} broken is not an expected failure`);
  }
  if (observation.blocked) {
    const owner = observation.blockOwner || 'unassigned';
    return evidence(item.caseId, 'blocked', base.errorCode, base.status, base.durationMs, `blocked: ${owner}`);
  }
  if (observation.skipped) {
    return evidence(item.caseId, 'skipped', base.errorCode, base.status, base.durationMs, observation.reason || 'skipped');
  }
  if (observation.inconclusive) {
    return evidence(item.caseId, 'inconclusive', base.errorCode, base.status, base.durationMs, observation.reason || 'inconclusive');
  }
  if (stage === 'implement' && item.expectedFailure) {
    return evidence(item.caseId, 'failed', base.errorCode, base.status, base.durationMs, 'expected mark expired');
  }
  if (stage === 'structure' && matchesFailure(item, observation)) {
    return evidence(
      item.caseId,
      'expectedRed',
      base.errorCode,
      base.status,
      base.durationMs,
      `expected red at structure: ${observation.errorCode} status ${observation.status}`,
    );
  }
  const filter = filterMiss(item, observation);
  if (sameOutcome(item.expect, observation) && !filter) {
    if (item.expectedFailure) {
      return evidence(item.caseId, 'failed', base.errorCode, base.status, base.durationMs, 'expected mark expired');
    }
    return evidence(item.caseId, 'passed', base.errorCode, base.status, base.durationMs, 'passed');
  }
  if (filter && sameOutcome(item.expect, observation)) {
    return evidence(item.caseId, 'failed', base.errorCode, base.status, base.durationMs, filter);
  }
  return evidence(item.caseId, 'failed', base.errorCode, base.status, base.durationMs, differentDetail(item, observation));
}

export async function verifyBatch(request: MaterializeVerificationRequest): Promise<M1Checkpoint> {
  const stage = request.handler.stage;
  const registered = handlerFor(request.handler.artifactType, stage);
  if (!registered || registered.id !== request.handler.id) {
    return checkpoint(request, '', [row('handler', 'failed', null, null, 0, 'handler is not the registered one')]);
  }
  let text: string | null;
  try {
    text = await request.io.read(request.catalogRef);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return checkpoint(request, '', [row('catalog', 'failed', null, null, 0, `catalog read failed: ${message}`)]);
  }
  if (text === null) {
    return checkpoint(request, '', [row('catalog', 'failed', null, null, 0, 'catalog unreadable')]);
  }
  const parsed = parseCatalog(text);
  if (!parsed.catalog) {
    return checkpoint(request, '', [row('catalog', 'failed', null, null, 0, parsed.issues.join('; '))]);
  }
  const inputHash = await contentHash(canonicalJson(parsed.catalog));
  const staged = catalogForStage(parsed.catalog, stage);
  const cases = casesFor(staged, request.handler.id, request.artifactId);
  if (cases.length === 0) {
    if (request.artifactId) {
      return checkpoint(request, inputHash, [row(request.artifactId, 'passed', null, 0, 0, 'no catalog case for this artifact')]);
    }
    return checkpoint(request, inputHash, [row('batch', 'failed', null, null, 0, `no scenario for handler ${request.handler.id}`)]);
  }
  const byId = new Map(request.observations.map(item => [item.caseId, item]));
  const evidenceRows = cases.map(item => classifyCase(stage, item, byId.get(item.caseId)));
  return checkpoint(request, inputHash, evidenceRows);
}

export function noteMonitorFailure(report: M1Checkpoint, error: string): M1Checkpoint {
  return {
    ...report,
    counts: { ...report.counts },
    evidence: report.evidence.map(item => ({ ...item })),
    monitor: { delivered: false, error },
    nextAction: `Monitor did not keep this result (${error}). The local checkpoint stands. ${report.nextAction}`,
  };
}

function casesFor(catalog: M1ScenarioCatalog, handlerId: string, artifactId?: string): M1ScenarioCase[] {
  const match = (id: string) => catalog.scenarios
    .filter(scenario => scenario.handlerId === id && (!artifactId || scenario.artifactId === artifactId))
    .flatMap(scenario => scenario.cases);
  const exact = match(handlerId);
  if (exact.length > 0 || !handlerId.startsWith('implement.')) return exact;
  return match(handlerId.replace('implement.', 'structure.'));
}

function matchesFailure(item: M1ScenarioCase, observation: M1Observation): boolean {
  const mark = item.expectedFailure;
  if (!mark || mark.caseId !== item.caseId || mark.stage !== 'structure') return false;
  return observation.errorCode === mark.errorCode && observation.status === mark.status;
}

function sameOutcome(expect: M1CaseExpect, observation: M1Observation): boolean {
  if (observation.ok !== expect.ok) return false;
  if (observation.status !== expect.status) return false;
  if (observation.errorCode !== expect.errorCode) return false;
  if (expect.ruleId !== null && observation.ruleId !== expect.ruleId) return false;
  return true;
}

function filterMiss(item: M1ScenarioCase, observation: M1Observation): string {
  const leaked = item.expect.forbiddenFields.find(field => observation.fields.includes(field));
  if (leaked) return `forbidden field present: ${leaked}`;
  const actorField = item.expect.isolatedActorField;
  if (!actorField) return '';
  if (observation.rowActorIds.length === 0) return 'actor filter had no rows';
  if (observation.rowActorIds.some(actorId => actorId !== item.actorId)) return 'actor filter missed';
  return '';
}

function differentDetail(item: M1ScenarioCase, observation: M1Observation): string {
  const wanted = describeExpect(item.expect);
  return `different failure: expected ${wanted}, got ${observation.errorCode ?? 'none'} status ${observation.status}`;
}

function describeExpect(expect: M1CaseExpect): string {
  if (expect.ok) return `ok status ${expect.status}`;
  return `${expect.errorCode ?? 'error'} status ${expect.status}`;
}

function evidence(
  caseId: string,
  verdict: M1Verdict,
  errorCode: string | null,
  status: number | null,
  durationMs: number,
  detail: string,
): M1Evidence {
  return { caseId, verdict, errorCode, status, durationMs, detail };
}

function row(
  caseId: string,
  verdict: M1Verdict,
  errorCode: string | null,
  status: number | null,
  durationMs: number,
  detail: string,
): M1Evidence {
  return evidence(caseId, verdict, errorCode, status, durationMs, detail);
}

function checkpoint(request: MaterializeVerificationRequest, inputHash: string, evidenceRows: M1Evidence[]): M1Checkpoint {
  const counts = count(evidenceRows);
  const accepted = evidenceRows.length > 0 && evidenceRows.every(item => item.verdict === 'passed' || (item.verdict === 'expectedRed' && request.handler.stage === 'structure'));
  const ready = request.handler.stage === 'implement' && accepted && counts.expectedRed === 0;
  return {
    schemaVersion: M1_CHECKPOINT_SCHEMA,
    runId: request.runId,
    inputHash,
    commit: request.commit,
    stage: request.handler.stage,
    handlerId: request.handler.id,
    startedAt: request.startedAt,
    finishedAt: request.finishedAt,
    budgetMs: M1_CHECKPOINT_BUDGET_MS,
    counts,
    durationsMs: { total: evidenceRows.reduce((sum, item) => sum + item.durationMs, 0) },
    ready,
    accepted,
    evidence: evidenceRows,
    nextAction: nextAction(request.handler.stage, accepted, evidenceRows),
    monitor: { delivered: request.monitorError === null, error: request.monitorError },
  };
}

function count(rows: readonly M1Evidence[]): M1CheckpointCounts {
  const counts: M1CheckpointCounts = {
    passed: 0, expectedRed: 0, failed: 0, blocked: 0, skipped: 0, inconclusive: 0,
  };
  for (const item of rows) counts[item.verdict] += 1;
  return counts;
}

function nextAction(stage: M1HandlerStage, accepted: boolean, rows: readonly M1Evidence[]): string {
  if (!accepted) {
    const bad = rows.find(item => item.verdict !== 'passed' && !(item.verdict === 'expectedRed' && stage === 'structure'));
    const name = bad ? `${bad.caseId}: ${bad.detail}` : 'empty batch';
    return `Fix ${name}. Do not weaken the assertion.`;
  }
  if (stage === 'structure') {
    return 'Structural checkpoint only. Implement the usecases and remove the expected-red marks. The backend is not ready.';
  }
  return 'Implement checkpoint accepted.';
}
