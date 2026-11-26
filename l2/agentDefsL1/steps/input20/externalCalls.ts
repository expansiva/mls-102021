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
    // d1_264: a call that names the entities it reads (`entityRefs`) does not serve the read (`list`/`get`) of another entity: the read of an entity
    // the module stores itself stays on its repository, even when a step of that entity cites the call (the cm list of agents shows the drafts' situation only).
    // A usecase that names its call (a split, below) serves only that call.
    const accepts = (row: Record<string, unknown>): boolean => {
      if ((usecase.operation === 'list' || usecase.operation === 'get') && storedByModule(args.entityKind, usecase.entity)) {
        const refs = strings(row.entityRefs);
        if (refs.length > 0 && !refs.includes(usecase.entity)) return false;
      }
      return !usecase.call || usecase.call === `${text(row.connectionId)}.${text(row.operationId)}`;
    };
    let serving = steps.filter(step => stepServes(step, usecase, reads));
    // d1_285: steps of one entity and effect that cite different calls are not one group. On an entity the module stores, the steps that cite no call keep
    // the usecase the plan named, and the calls of the other steps are not its: the usecase stays local (no `call`, never the consumer of those calls).
    // The routes of the other steps use the usecase of the call's own entity (`externalUsecaseForCall`). Steps that all cite a call stay one group (d1_269).
    if (!usecase.call && isLocalEntity(args.entityKind, usecase.entity)) {
      // d1_313: a call that is another entity's read (`readOfOther`) is never this usecase's, so a step that cites only that call is still a step without one.
      const bare = serving.filter(step => !calls.some(row => accepts(row) && !readOfOther(row, usecase.entity) && strings(row.usedBy).includes(step.ref)));
      if (bare.length > 0 && bare.length < serving.length) serving = bare;
    }
    // A read (`list`/`read`/`get`) belongs to the entity its `entityRefs` names first. A step of an entity the module stores that cites that read
    // serves the named entity's read; the stored entity does not keep the call.
    if (usecase.operation === 'list' || usecase.operation === 'get') {
      const cited = steps.filter(step => step.entity !== usecase.entity && isLocalEntity(args.entityKind, step.entity) && calls.some(row =>
        accepts(row) && readOfOther(row, step.entity) && strings(row.entityRefs)[0] === usecase.entity && readOperation(text(row.effect)) === usecase.operation && strings(row.usedBy).includes(step.ref)));
      if (cited.length > 0) {
        const have = new Set(serving.map(step => step.ref));
        serving = [...serving, ...cited.filter(step => !have.has(step.ref))].sort((left, right) => left.ref.localeCompare(right.ref));
      }
    }
    // d1_313: a write usecase of an entity the module stores that names its call serves only the steps that cite that call.
    if (usecase.call && isLocalEntity(args.entityKind, usecase.entity) && usecase.operation !== 'list' && usecase.operation !== 'get') {
      const own = serving.filter(step => calls.some(row => accepts(row) && strings(row.usedBy).includes(step.ref)));
      if (own.length > 0) serving = own;
    }
    const refs = serving.map(step => step.ref);
    const matched: D1ExternalCallRef[] = [];
    const seen = new Set<string>();
    for (const row of calls) {
      const cited = new Set(strings(row.usedBy));
      const citing = serving.filter(step => cited.has(step.ref));
      if (citing.length === 0) continue;
      if (!accepts(row)) continue;
      // The read of another entity does not enter the group of an entity the module stores: it serves that entity's own read.
      if (isLocalEntity(args.entityKind, usecase.entity) && readOfOther(row, usecase.entity)) continue;
      // A step of another entity was added only for the read it cites. It does not bring the other calls of that step.
      const ownedRead = strings(row.entityRefs)[0] === usecase.entity && readOperation(text(row.effect)) === usecase.operation;
      if (!citing.some(step => step.entity === usecase.entity) && !ownedRead) continue;
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

/** An entity the L4 declares and that is not `external`: the module stores it, so its reads stay on its repository (d1_264). */
function storedByModule(kinds: ReadonlyMap<string, string> | undefined, entity: string): boolean {
  const kind = kinds?.get(entity);
  return kind !== undefined && kind !== '' && kind !== 'external';
}

/** An entity the module keeps and decides for itself (not `external`, not an MDM role): its usecase is never born per call by the groups of d1_285. */
function isLocalEntity(kinds: ReadonlyMap<string, string> | undefined, entity: string): boolean {
  return storedByModule(kinds, entity) && kinds?.get(entity) !== 'role';
}

/** `list` stays `list`; `read` and `get` are the catalog's get. Anything else is not a read. */
function readOperation(effect: string): 'list' | 'get' | '' {
  if (effect === 'list') return 'list';
  if (effect === 'read' || effect === 'get') return 'get';
  return '';
}

/** A read whose first `entityRefs` is some entity other than `entity`. The call belongs to that first entity. */
function readOfOther(row: Record<string, unknown>, entity: string): boolean {
  if (!readOperation(text(row.effect))) return false;
  const owner = strings(row.entityRefs)[0] ?? '';
  return owner !== '' && owner !== entity;
}

/** True when the call line names `entity` first in `entityRefs` (the call belongs to that entity, not to an external one). */
export function callNamesEntity(call: string, entity: string, connections: readonly unknown[]): boolean {
  const line = connections.map(rec).find(row => text(row.direction) === 'call' && `${text(row.connectionId)}.${text(row.operationId)}` === call);
  return strings(line?.entityRefs)[0] === entity;
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

/**
 * The operation of one call of a usecase served by several (d1_195, d1_280): a call whose catalog-side `effect` is a read (`list`, `read`) is a read whatever the
 * usecase was planned as; `changeMyConduct.changeConduct` writes PersonalConduct and also reads the agent (`cm.readAgent`), and that read must not be born as an
 * `update` (it got the repository and the rules of the write, and recorded a change with no input). A write call keeps the planned operation. A usecase with one call
 * keeps its operation: its only call serves it as planned.
 */
function operationOfCall(usecase: D1SelectedUsecase, effect: string, several: boolean): string {
  if (!several && usecase.operation !== 'list' && usecase.operation !== 'get') return usecase.operation;
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
  /** The ids the division itself created (not the ones the plan named). */
  const born = new Set<string>();
  for (const usecase of args.usecases) {
    const match = matches.get(usecase.usecaseId);
    const own = args.splitStored === true && !usecase.call ? ownWriteCallUsecases(args, usecase, used) : [];
    if (own.length > 0) {
      usecases.push(usecase);
      for (const item of own) {
        usecases.push(item.usecase);
        born.add(item.usecase.usecaseId);
      }
      splits.push({ from: usecase.usecaseId, into: own.map(item => ({ usecaseId: item.usecase.usecaseId, operation: item.usecase.operation, call: item.usecase.call ?? '' })) });
      continue;
    }
    // d1_269: an entity the module stores is split too when more than one call serves its usecase (RepositoryEntry: `listarConteudo` lists, `lerArquivo` reads, and
    // the one `list` usecase was the consumer of both). With one call, or none, a stored entity's usecase is left as it is: no `call` is put on it.
    const kind = args.entityKind.get(usecase.entity);
    const storedSplit = args.splitStored === true && !!kind && kind !== 'external' && kind !== 'role' && (match?.calls.length ?? 0) > 1;
    if (!match || match.calls.length === 0 || usecase.call || (kind !== 'external' && !storedSplit)) {
      usecases.push(usecase);
      continue;
    }
    const parts = match.calls.map(call => ({ call: keyOf(call), operationId: call.operationId, operation: operationOfCall(usecase, effects.get(keyOf(call)) || '', match.calls.length > 1) }));
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
      if (usecaseId !== usecase.usecaseId) born.add(usecaseId);
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
  return dropSplitDuplicates(usecases, splits, born);
}

/**
 * d1_313: a call that writes the very entity the module stores (`effect` `update` or `remove`, `entityRefs` first = the usecase's entity) and that only some of the steps of the
 * usecase cite is not for the usecase every write step of the entity uses (`updateX` also serves the step that changes another field). The steps that cite it get a
 * usecase of their own: it names the call, it is born `toCreate`, and its id comes from the step (`checkBot`), or the step and the entity when that id is taken.
 * When every step of the usecase cites the call, nothing is born: the usecase is that one already.
 */
function ownWriteCallUsecases(
  args: D1ExternalCallsInput,
  usecase: D1SelectedUsecase,
  used: Set<string>,
): Array<{ usecase: D1SelectedUsecase }> {
  const kind = args.entityKind.get(usecase.entity);
  if (!kind || kind === 'external' || kind === 'role' || usecase.operation === 'custom' || usecase.operation === 'list' || usecase.operation === 'get') return [];
  const calls = args.connections.map(rec).filter(row => text(row.direction) === 'call');
  const reads = readTargets(args.usecases, args.entityKind, true);
  const serving = journeySteps(args.journeys).filter(step => stepServes(step, usecase, reads));
  const out: Array<{ usecase: D1SelectedUsecase }> = [];
  const entity = `${usecase.entity.charAt(0).toUpperCase()}${usecase.entity.slice(1)}`;
  for (const row of calls) {
    const effect = text(row.effect);
    // A `create` call stays out (d1_285: the cm `runAiPrompt` of the agents is run by the route, the tools are created by the plain `create`).
    if (!(effect === 'update' || effect === 'remove') || !operationMatchesEffect(usecase.operation, effect)) continue;
    if (strings(row.entityRefs)[0] !== usecase.entity) continue;
    const citing = serving.filter(step => strings(row.usedBy).includes(step.ref));
    if (citing.length === 0 || citing.length === serving.length) continue;
    const stepId = citing[0].ref.slice(citing[0].ref.indexOf('.') + 1);
    const usecaseId = used.has(stepId) ? `${stepId}${entity}` : stepId;
    used.add(usecaseId);
    out.push({
      usecase: { ...usecase, usecaseId, identity: usecaseId, routes: [], call: `${text(row.connectionId)}.${text(row.operationId)}`, status: 'toCreate', existing: '' },
    });
  }
  return out;
}

/**
 * d1_286: the division gives a call a usecase of its own, and the entity may already have one for that (entity, operation, transition, call): `updateAgent` served by
 * `cm.readAgent` too is split, its read part is born as `readAgent`, and the planned `getAgent` already reads the agent by that call. Two usecases of one pair are the same
 * usecase, and a route that needs it can take neither (`EXTERNAL_ROUTE_CALL_UNRESOLVED`). Only a usecase the division itself created is dropped: a planned one stays, and when
 * every one of the pair was born here the first by `usecaseId` stays. `into` points to the one that stayed.
 */
function dropSplitDuplicates(usecases: D1SelectedUsecase[], splits: D1ExternalSplit[], born: ReadonlySet<string>): { usecases: D1SelectedUsecase[]; splits: D1ExternalSplit[] } {
  const groups = new Map<string, D1SelectedUsecase[]>();
  for (const item of usecases) {
    if (!item.call) continue;
    const key = [item.entity, item.operation, item.transitionRef ?? '', item.call].join('\0');
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const dropped = new Map<string, string>();
  const byId = (left: D1SelectedUsecase, right: D1SelectedUsecase): number => left.usecaseId.localeCompare(right.usecaseId);
  for (const group of groups.values()) {
    if (group.length < 2 || !group.some(item => born.has(item.usecaseId))) continue;
    const keeper = [...group].sort(byId).find(item => !born.has(item.usecaseId)) ?? [...group].sort(byId)[0];
    for (const item of group) if (item !== keeper && born.has(item.usecaseId)) dropped.set(item.usecaseId, keeper.usecaseId);
  }
  if (dropped.size === 0) return { usecases, splits };
  return {
    usecases: usecases.filter(item => !dropped.has(item.usecaseId)),
    splits: splits.map(split => {
      const seen = new Set<string>();
      const into = split.into
        .map(part => ({ ...part, usecaseId: dropped.get(part.usecaseId) ?? part.usecaseId }))
        .filter(part => !seen.has(part.usecaseId) && !!seen.add(part.usecaseId));
      return { from: split.from, into };
    }),
  };
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

/** One `operationId` of a route's write suffix that no single `call` line names (d1_285). `candidates` are the `<connectionId>.<operationId>` lines that could be meant. */
export interface D1RouteCallUnresolved {
  operationId: string;
  candidates: string[];
}

/**
 * The calls a contract route runs (d1_285), from the suffix of its `writes` (`Entity.operation+operationId+operationId`, read by the one reader of the L2):
 * - a suffix names exactly those calls; each `operationId` is the one `call` line of the L4 that has it, and none or more than one connection is `unresolved`;
 * - no suffix, on a page where another route writes the same `Entity.operation` with a suffix: the route runs no call;
 * - no suffix and no such sibling: `pageCalls`, what the steps of the page cite (`routeCallsOf`), as before.
 */
export function routeWriteCalls(args: {
  suffix: readonly string[];
  siblingSuffixed: boolean;
  connections: readonly unknown[];
  pageCalls: readonly string[];
}): { calls: string[]; unresolved: D1RouteCallUnresolved[] } {
  if (args.suffix.length === 0) return { calls: args.siblingSuffixed ? [] : [...args.pageCalls], unresolved: [] };
  const lines = args.connections.map(rec).filter(row => text(row.direction) === 'call');
  const keys = [...new Set(lines.map(row => `${text(row.connectionId)}.${text(row.operationId)}`))].sort();
  const calls = new Set<string>();
  const unresolved: D1RouteCallUnresolved[] = [];
  for (const operationId of [...new Set(args.suffix)].sort()) {
    const found = keys.filter(key => key.slice(key.indexOf('.') + 1) === operationId);
    if (found.length === 1) calls.add(found[0]);
    else unresolved.push({ operationId, candidates: found.length ? found : keys });
  }
  return { calls: [...calls].sort(), unresolved };
}

/**
 * The usecase a route of a module entity uses for one call of its write suffix (d1_285): a usecase of an `external` entity that has that `call`. Several:
 * the entity that comes first in the `entityRefs` of the call line, then the first `usecaseId`; one whose entity the line does not name comes after those that it does.
 * None: null (the call is cited only by steps of entities the module keeps).
 */
export function externalUsecaseForCall(args: {
  call: string;
  usecases: readonly D1SelectedUsecase[];
  entityKind: ReadonlyMap<string, string>;
  connections: readonly unknown[];
}): D1SelectedUsecase | null {
  const line = args.connections.map(rec).find(row => text(row.direction) === 'call' && `${text(row.connectionId)}.${text(row.operationId)}` === args.call);
  const refs = strings(line?.entityRefs);
  const rank = (entity: string): number => {
    const index = refs.indexOf(entity);
    return index < 0 ? refs.length : index;
  };
  const found = args.usecases
    .filter(item => item.call === args.call && args.entityKind.get(item.entity) === 'external')
    .sort((left, right) => rank(left.entity) - rank(right.entity) || left.usecaseId.localeCompare(right.usecaseId));
  return found[0] ?? null;
}
