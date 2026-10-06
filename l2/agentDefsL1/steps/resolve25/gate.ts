/// <mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/gate.ts" enhancement="_blank"/>

import { D1_GAP_NONE, type D1InputArtifacts, type D1RequestGapAnswer, type D1SourceDigest } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { deriveRequest } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';
import { readContractV2 } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import {
  D1_RESOLVE_VERSION,
  type D1ResolveAnswer,
  type D1ResolveAttempt,
  type D1ResolveGap,
  type D1ResolveReceipt,
  type D1ResolveUnit,
  type D1ResolveWork,
} from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';

/**
 * resolve25 (d1_62). The gaps are the ones the input20 derivation leaves (`deriveRequest`), from the same sources
 * input20 sealed. One unit per route with a gap. The model answers each gap with one of its candidates; the gate
 * accepts only a candidate, and the receipt keeps route, path, choice and call.
 */

/** Paths whose digest differs between the snapshot and what is read now. Empty means the same sources. */
export function sourcesDrift(sealed: readonly D1SourceDigest[], now: readonly D1SourceDigest[]): string[] {
  const before = new Map(sealed.map(item => [item.path, item.sha256]));
  const after = new Map(now.map(item => [item.path, item.sha256]));
  const drift: string[] = [];
  for (const path of new Set([...before.keys(), ...after.keys()])) {
    if (before.get(path) !== after.get(path)) drift.push(path);
  }
  return drift.sort();
}

/** One unit per contract route the derivation leaves with a gap, in route order. */
export function resolveUnits(artifacts: Pick<D1InputArtifacts, 'contractTexts' | 'entities'>): D1ResolveUnit[] {
  const routes: Array<Omit<D1ResolveUnit, 'unitId'>> = [];
  for (const [pageId, definition] of readContractV2(artifacts.contractTexts)) {
    for (const route of definition.routes) {
      const derived = deriveRequest(route, definition, artifacts.entities);
      if (!derived.unresolved.length) continue;
      routes.push({
        route: route.route,
        pageId,
        gaps: derived.unresolved.map((gap, index) => ({
          gapId: `g${index}`,
          path: gap.path,
          kind: gap.kind,
          reason: gap.reason,
          candidates: [...gap.candidates],
        })),
      });
    }
  }
  routes.sort((left, right) => left.route.localeCompare(right.route));
  return routes.map((item, index) => ({ unitId: `r${index}`, ...item }));
}

export interface D1ResolveCheck {
  /** Accepted choices by gap id. */
  answers: Record<string, string>;
  /** One line per gap without an accepted choice. Empty is a pass. */
  problems: string[];
}

/** The reply `{ answers: { g0: '...', ... } }`. Every gap needs one of its candidates; `none` is a candidate. */
export function checkResolveReply(unit: D1ResolveUnit, reply: unknown): D1ResolveCheck {
  const answers: Record<string, string> = {};
  const problems: string[] = [];
  const given = isRecord(reply) && isRecord(reply.answers) ? reply.answers : null;
  if (!given) return { answers, problems: [`The reply has no answers object for route ${unit.route}.`] };
  for (const key of Object.keys(given)) {
    if (!unit.gaps.some(gap => gap.gapId === key)) problems.push(`${key} is not a gap of route ${unit.route}.`);
  }
  for (const gap of unit.gaps) {
    const choice = given[gap.gapId];
    if (typeof choice !== 'string') {
      problems.push(`${gap.gapId} (${gap.path}) has no answer. Choose one of: ${gap.candidates.join(', ')}.`);
      continue;
    }
    if (!gap.candidates.includes(choice)) {
      problems.push(`${gap.gapId} (${gap.path}) answered '${choice}', which is not a candidate. Choose one of: ${gap.candidates.join(', ')}.`);
      continue;
    }
    answers[gap.gapId] = choice;
  }
  return { answers, problems };
}

/**
 * The receipt from the last attempt of each unit. An accepted choice keeps the plan id of its call. A gap with no
 * accepted choice after the repair, or of a unit that failed operationally, is `none` with an empty call.
 */
export function buildResolveReceipt(work: D1ResolveWork, attempts: readonly D1ResolveAttempt[]): D1ResolveReceipt {
  let llmCalls = 0;
  const routes = work.units.map(unit => {
    const attempt = attempts.find(item => item.unitId === unit.unitId);
    llmCalls += attempt?.calls || 0;
    const answers: D1ResolveAnswer[] = unit.gaps.map(gap => {
      const choice = attempt?.answers?.[gap.gapId];
      const accepted = typeof choice === 'string' && gap.candidates.includes(choice);
      return {
        path: gap.path,
        kind: gap.kind,
        choice: accepted ? choice : D1_GAP_NONE,
        call: accepted && attempt ? attempt.planId : '',
        gapKey: resolveGapKey(unit.route, gap),
      };
    });
    return { route: unit.route, pageId: unit.pageId, answers };
  });
  return {
    schemaVersion: D1_RESOLVE_VERSION,
    project: work.project,
    moduleName: work.moduleName,
    sourceKey: work.sourceKey,
    llmCalls,
    routes,
  };
}

/**
 * Routes whose every gap still has an answer on the receipt with the same route and the same `gapKey`.
 * The value is the previous choices by gap id. A route with any new or changed gap is left out.
 */
export function keptRoutes(receipt: D1ResolveReceipt, units: readonly D1ResolveUnit[]): Map<string, Record<string, string>> {
  const kept = new Map<string, Record<string, string>>();
  for (const unit of units) {
    const row = receipt.routes.find(item => item.route === unit.route);
    if (!row) continue;
    const answers: Record<string, string> = {};
    let all = true;
    for (const gap of unit.gaps) {
      const match = row.answers.find(answer => answer.gapKey === resolveGapKey(unit.route, gap));
      if (!match) {
        all = false;
        break;
      }
      answers[gap.gapId] = match.choice;
    }
    if (all) kept.set(unit.unitId, answers);
  }
  return kept;
}

/** Identity of one gap. Synchronous, not a hash. */
function resolveGapKey(route: string, gap: Pick<D1ResolveGap, 'path' | 'kind' | 'reason' | 'candidates'>): string {
  return JSON.stringify([route, gap.path, gap.kind, gap.reason, [...gap.candidates].sort()]);
}

/** The answers of one route, as `applyResolutions` takes them. No receipt or no route gives none. */
export function resolveAnswers(receipt: D1ResolveReceipt | null, route: string): D1RequestGapAnswer[] {
  const row = receipt?.routes.find(item => item.route === route);
  return row ? row.answers.map(item => ({ path: item.path, choice: item.choice })) : [];
}

/** Every route's answers, as `buildD1InputSnapshot` takes them. No receipt gives no answer. */
export function answersByRoute(receipt: D1ResolveReceipt | null): Map<string, D1RequestGapAnswer[]> {
  return new Map((receipt?.routes || []).map(row => [row.route, resolveAnswers(receipt, row.route)]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
