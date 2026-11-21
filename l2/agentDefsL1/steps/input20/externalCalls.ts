/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/externalCalls.ts" enhancement="_blank"/>

import { operationMatchesEffect, operationsOfEffect } from '/_102021_/l2/helpers/connections/integrationImplied.js';
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
  /** Resolve usecases of every entity, not only `external` ones (a call may serve a step on a table entity). */
  allEntities?: boolean;
}

/**
 * Which call serves an external usecase. The step is the bridge: same entity, and
 * `act`+`transition` by `transitionRef`, `act`+effect by operation (`read`↔`get`, `remove`↔`delete`),
 * `locate`→`list` and `inspect`→`get` (the other read is the reserve when the preferred operation is absent).
 * A call serves when `usedBy` contains `<journeyId>.<stepId>`. `effect` is not read. `entityRefs` is read only for a read (`list`/`get`): a call that
 * names entities, and not this one, does not serve it (d1_264). A write keeps serving by the step: the cm `Agent` includes its drafts.
 */
export function externalCallsOf(args: D1ExternalCallsInput): D1ExternalCallMatch[] {
  const steps = journeySteps(args.journeys);
  const calls = args.connections.map(rec).filter(row => text(row.direction) === 'call');
  const reads = readTargets(args.usecases, args.entityKind, args.allEntities === true);
  const out: D1ExternalCallMatch[] = [];
  for (const usecase of args.usecases) {
    if (!args.allEntities && args.entityKind.get(usecase.entity) !== 'external') continue;
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
      // d1_264: a call that names the entities it reads (`entityRefs`) does not serve the read (`list`/`get`) of another entity: the read of an entity
      // the module stores itself stays on its repository, even when a step of that entity cites the call (the cm list of agents shows the drafts' situation only).
      if ((usecase.operation === 'list' || usecase.operation === 'get') && storedByModule(args.entityKind, usecase.entity)) {
        const refs = strings(row.entityRefs);
        if (refs.length > 0 && !refs.includes(usecase.entity)) continue;
      }
      // A usecase that names its call (a split, below) serves only that call.
      if (usecase.call && usecase.call !== `${connectionId}.${operationId}`) continue;
      const key = `${connectionId}\0${operationId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matched.push({ connectionId, operationId });
    }
    out.push({ usecaseId: usecase.usecaseId, steps: refs, calls: matched });
  }
  return out;
}

/** An entity the L4 declares and that is not `external`: the module stores it, so its reads stay on its repository (d1_264). */
function storedByModule(kinds: ReadonlyMap<string, string> | undefined, entity: string): boolean {
  const kind = kinds?.get(entity);
  return kind !== undefined && kind !== '' && kind !== 'external';
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
function readTargets(usecases: readonly D1SelectedUsecase[], entityKind: ReadonlyMap<string, string>, allEntities: boolean): Map<string, 'list' | 'get'> {
  const ops = new Map<string, Set<string>>();
  for (const usecase of usecases) {
    if (!allEntities && entityKind.get(usecase.entity) !== 'external') continue;
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
  // A usecase that names its call serves every read step of the entity that cites it; the call, not the step kind, chose it.
  if (usecase.call) return usecase.operation === 'list' || usecase.operation === 'get';
  return reads.get(`${step.entity}\0${step.kind}`) === usecase.operation;
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

/**
 * The process tasks a call serves (d1_195). A `usedBy` of the form `<processId>.<taskId>` that names a `mechanical` or
 * `llm` task of an L4 process makes that process the consumer of the call: its code, not a usecase of the entity,
 * runs the call. `processes` is `workflows.processes` of the L4; the result is the process ids, sorted.
 */
export function processConsumersOf(usedBy: readonly string[], processes: readonly unknown[]): string[] {
  const tasks = new Map<string, Set<string>>();
  for (const row of processes) {
    const process = rec(row);
    const processId = text(process.processId);
    if (!processId) continue;
    const set = new Set<string>();
    for (const task of rows(process.tasks)) {
      const kind = text(task.kind);
      if ((kind === 'mechanical' || kind === 'llm') && text(task.taskId)) set.add(text(task.taskId));
    }
    tasks.set(processId, set);
  }
  const out = new Set<string>();
  for (const ref of usedBy) {
    const dot = ref.indexOf('.');
    if (dot <= 0) continue;
    const processId = ref.slice(0, dot);
    if (tasks.get(processId)?.has(ref.slice(dot + 1))) out.add(processId);
  }
  return [...out].sort();
}

/** `<connectionId>.<operationId>` of a call reference. */
function keyOf(call: D1ExternalCallRef): string {
  return `${call.connectionId}.${call.operationId}`;
}

/** The read operation a call's catalog-side `effect` names (`list`, `read`): it only names the action, it never pairs a step. */
function operationOfCall(usecase: D1SelectedUsecase, effect: string): string {
  if (usecase.operation !== 'list' && usecase.operation !== 'get') return usecase.operation;
  return effect === 'list' || effect === 'read' ? operationsOfEffect(effect)[0] : usecase.operation;
}

export interface D1ExternalSplit {
  from: string;
  into: Array<{ usecaseId: string; operation: string; call: string }>;
}

/**
 * One usecase per call for an external entity (d1_195). A usecase that no call serves is kept (input20 reports it). A
 * usecase with one call keeps its id and names that call. A usecase with several is replaced by one per call: a read
 * takes the operation its call's `effect` names (`list`, `read`→`get`), the first of an operation keeps the planned id,
 * the others are named by the `operationId` (and by the entity when that id is taken). The planned ids stay as they are.
 */
export function splitExternalUsecases(args: D1ExternalCallsInput & { taken: ReadonlySet<string>; splitStored?: boolean }): { usecases: D1SelectedUsecase[]; splits: D1ExternalSplit[] } {
  const matches = new Map(externalCallsOf({ ...args, allEntities: args.allEntities || args.splitStored === true }).map(match => [match.usecaseId, match]));
  const effects = new Map<string, string>();
  for (const row of args.connections.map(rec).filter(item => text(item.direction) === 'call')) {
    effects.set(`${text(row.connectionId)}.${text(row.operationId)}`, text(row.effect));
  }
  const used = new Set([...args.taken, ...args.usecases.map(item => item.usecaseId)]);
  const usecases: D1SelectedUsecase[] = [];
  const splits: D1ExternalSplit[] = [];
  for (const usecase of args.usecases) {
    const match = matches.get(usecase.usecaseId);
    // d1_269: an entity the module stores is split too when more than one call serves its usecase (RepositoryEntry: `listarConteudo` lists, `lerArquivo` reads, and
    // the one `list` usecase was the consumer of both). With one call, or none, a stored entity's usecase is left as it is: no `call` is put on it.
    const kind = args.entityKind.get(usecase.entity);
    const storedSplit = args.splitStored === true && !!kind && kind !== 'external' && kind !== 'role' && (match?.calls.length ?? 0) > 1;
    if (!match || match.calls.length === 0 || usecase.call || (kind !== 'external' && !storedSplit)) {
      usecases.push(usecase);
      continue;
    }
    const parts = match.calls.map(call => ({ call: keyOf(call), operationId: call.operationId, operation: operationOfCall(usecase, effects.get(keyOf(call)) || '') }));
    if (parts.length === 1 && parts[0].operation === usecase.operation) {
      usecases.push({ ...usecase, call: parts[0].call });
      continue;
    }
    const entity = `${usecase.entity.charAt(0).toUpperCase()}${usecase.entity.slice(1)}`;
    const into: D1ExternalSplit['into'] = [];
    for (const part of parts) {
      const sameOperation = parts.filter(item => item.operation === part.operation).length === 1;
      let usecaseId = '';
      if (sameOperation && part.operation === usecase.operation) usecaseId = usecase.usecaseId;
      else if (sameOperation && !used.has(`${part.operation}${entity}`)) usecaseId = `${part.operation}${entity}`;
      else usecaseId = used.has(part.operationId) ? `${part.operationId}${entity}` : part.operationId;
      used.add(usecaseId);
      into.push({ usecaseId, operation: part.operation, call: part.call });
      usecases.push({
        ...usecase,
        usecaseId,
        identity: usecaseId,
        operation: part.operation,
        routes: [],
        call: part.call,
        ...(usecaseId === usecase.usecaseId ? {} : { status: 'toCreate' as const, existing: '' }),
      });
    }
    splits.push({ from: usecase.usecaseId, into });
  }
  return { usecases, splits };
}

/**
 * The calls the steps of a page cite for one entity and operation: the page's `needs` entry (reads for `list`/`get`,
 * writes otherwise) names the journey steps in `from`; only the steps of that entity count. Sorted, unique.
 */
export function routeCallsOf(args: {
  needs: unknown;
  journeys: Record<string, unknown>;
  connections: readonly unknown[];
  /** Kind of each entity of the L4 ontology; an entity not in it is not known to be stored by the module. */
  entityKind?: ReadonlyMap<string, string>;
  pageId: string;
  entity: string;
  operation: string;
  transitionRef: string;
}): string[] {
  const page = rows(rec(args.needs).pages).find(item => text(item.pageId) === args.pageId);
  if (!page) return [];
  const read = args.operation === 'list' || args.operation === 'get';
  const entries = rows(read ? page.reads : page.writes).filter(item => text(item.entity) === args.entity
    && (read || (text(item.operation) === args.operation && (args.operation !== 'transition' || text(item.transitionRef) === args.transitionRef))));
  const refs = new Set(entries.flatMap(item => strings(item.from)).flatMap(ref => {
    const match = /^journey:([^/]+)\/(.+)$/u.exec(ref);
    return match ? [`${match[1]}.${match[2]}`] : [];
  }));
  const steps = journeySteps(args.journeys).filter(step => refs.has(step.ref) && step.entity === args.entity
    && (read ? step.kind === 'locate' || step.kind === 'inspect' : step.kind === 'act'));
  const cited = new Set(steps.map(step => step.ref));
  const out = new Set<string>();
  for (const row of args.connections.map(rec).filter(item => text(item.direction) === 'call')) {
    // d1_264: the same rule as `externalCallsOf`: a call that names other entities does not serve the read of this one.
    const named = strings(row.entityRefs);
    if (read && storedByModule(args.entityKind, args.entity) && named.length > 0 && !named.includes(args.entity)) continue;
    if (strings(row.usedBy).some(ref => cited.has(ref))) out.add(`${text(row.connectionId)}.${text(row.operationId)}`);
  }
  return [...out].sort();
}
