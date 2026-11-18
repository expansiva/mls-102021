/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/externalCalls.ts" enhancement="_blank"/>

import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

/** One `direction: 'call'` line that cites a step in `usedBy`. */
export interface D1ExternalCallRef {
  connectionId: string;
  operationId: string;
}

/** Steps that serve one external usecase, and the calls whose `usedBy` cites those steps. */
export interface D1ExternalCallMatch {
  usecaseId: string;
  steps: string[];
  calls: D1ExternalCallRef[];
}

export interface D1ExternalCallsInput {
  /** `artifacts.journeys`. Steps live on `business.steps`, or on `steps` when that is empty. */
  journeys: Record<string, unknown>;
  /** `integration.connections` rows. Only `direction: 'call'` is read. */
  connections: readonly unknown[];
  usecases: readonly D1SelectedUsecase[];
  entityKind: ReadonlyMap<string, string>;
}

/**
 * Which call serves an external usecase. The step is the bridge: same entity, and
 * `act`+`transition` by `transitionRef`, `act`+effect by operation (`read`↔`get`, `remove`↔`delete`),
 * `locate`→`list` and `inspect`→`get` (the other read is the reserve when the preferred operation is absent).
 * A call serves when `usedBy` contains `<journeyId>.<stepId>`. `effect` and `entityRefs` on the call are not read.
 */
export function externalCallsOf(args: D1ExternalCallsInput): D1ExternalCallMatch[] {
  const steps = journeySteps(args.journeys);
  const calls = args.connections.map(rec).filter(row => text(row.direction) === 'call');
  const reads = readTargets(args.usecases, args.entityKind);
  const out: D1ExternalCallMatch[] = [];
  for (const usecase of args.usecases) {
    if (args.entityKind.get(usecase.entity) !== 'external') continue;
    if (usecase.operation === 'custom') continue;
    const serving = steps.filter(step => stepServes(step, usecase, reads));
    const refs = serving.map(step => step.ref);
    const matched: D1ExternalCallRef[] = [];
    const seen = new Set<string>();
    for (const row of calls) {
      const cited = new Set(strings(row.usedBy));
      if (!refs.some(ref => cited.has(ref))) continue;
      const connectionId = text(row.connectionId);
      const operationId = text(row.operationId);
      const key = `${connectionId}\0${operationId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matched.push({ connectionId, operationId });
    }
    out.push({ usecaseId: usecase.usecaseId, steps: refs, calls: matched });
  }
  return out;
}

interface JourneyStep {
  ref: string;
  kind: string;
  entity: string;
  effect: string;
  transitionRef: string;
}

function journeySteps(journeys: Record<string, unknown>): JourneyStep[] {
  const steps: JourneyStep[] = [];
  for (const [key, value] of Object.entries(journeys)) {
    const journey = rec(value);
    const journeyId = text(journey.journeyId) || key;
    const business = rec(journey.business);
    const rowsOf = rows(business.steps).length ? rows(business.steps) : rows(journey.steps);
    for (const step of rowsOf) {
      const stepId = text(step.stepId);
      if (!journeyId || !stepId) continue;
      steps.push({
        ref: `${journeyId}.${stepId}`,
        kind: text(step.kind),
        entity: text(step.entity),
        effect: text(step.effect),
        transitionRef: text(step.transitionRef),
      });
    }
  }
  steps.sort((left, right) => left.ref.localeCompare(right.ref));
  return steps;
}

/** Preferred read for a locate/inspect step, or '' when the entity has neither list nor get. */
function readTargets(usecases: readonly D1SelectedUsecase[], entityKind: ReadonlyMap<string, string>): Map<string, 'list' | 'get'> {
  const ops = new Map<string, Set<string>>();
  for (const usecase of usecases) {
    if (entityKind.get(usecase.entity) !== 'external') continue;
    if (usecase.operation !== 'list' && usecase.operation !== 'get') continue;
    const set = ops.get(usecase.entity) || new Set<string>();
    set.add(usecase.operation);
    ops.set(usecase.entity, set);
  }
  const targets = new Map<string, 'list' | 'get'>();
  for (const [entity, set] of ops) {
    const locate = set.has('list') ? 'list' : 'get';
    const inspect = set.has('get') ? 'get' : 'list';
    targets.set(`${entity}\0locate`, locate);
    targets.set(`${entity}\0inspect`, inspect);
  }
  return targets;
}

function stepServes(step: JourneyStep, usecase: D1SelectedUsecase, reads: ReadonlyMap<string, 'list' | 'get'>): boolean {
  if (!step.entity || step.entity !== usecase.entity) return false;
  if (step.kind === 'act' && step.effect === 'transition') {
    return usecase.operation === 'transition' && step.transitionRef === (usecase.transitionRef || '');
  }
  if (step.kind === 'act') return operationMatchesEffect(usecase.operation, step.effect);
  if (step.kind !== 'locate' && step.kind !== 'inspect') return false;
  return reads.get(`${step.entity}\0${step.kind}`) === usecase.operation;
}

function operationMatchesEffect(operation: string, effect: string): boolean {
  return operation === effect
    || (operation === 'get' && effect === 'read')
    || (operation === 'delete' && effect === 'remove');
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(rec) : [];
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return text(value) ? [text(value)] : [];
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
