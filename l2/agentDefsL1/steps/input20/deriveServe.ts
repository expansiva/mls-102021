/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveServe.ts" enhancement="_blank"/>

import { interfaceFieldPaths } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import {
  contractPath,
  isSafeToken,
  type D1InputProblem,
  type D1RequestParam,
  type D1SelectedRequest,
  type D1SelectedUsecase,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';
import { SERVE_OPERATION_OF_EFFECT } from '/_102021_/l2/agentDefsL1/steps/input20/arrivalPairs.js';
import { isUpsert, upsertKeyOf, type ArrivalUpsert } from '/_102021_/l2/helpers/l1Defs/arrivalUpsert.js';
import { ns5ArrivalEffects, type Ns5ArrivalEffectsItem } from '/_102035_/l2/solution/arrivalEffects.js';
import { L1_OPERATIONS, transitionUsecaseId, type L1Operation } from '/_102021_/l2/helpers/l1Defs/operations.js';

/** One `integration.connections` line with `direction: 'serve'`. */
export interface D1ServeLine extends Ns5ArrivalEffectsItem {
  connectionId: string;
  operationId: string;
}

const CREATED = new Set<string>(L1_OPERATIONS.filter(operation => operation !== 'custom' && operation !== 'transition'));

export interface DeriveServeInput {
  moduleName: string;
  lines: readonly D1ServeLine[];
  catalogTexts: Readonly<Record<string, string>>;
  usecases: D1SelectedUsecase[];
  problems: D1InputProblem[];
  /** Ontology entities. A usecase is created only when its entity is here. */
  entities: Readonly<Record<string, unknown>>;
  /** usecaseId → `entity.operation` already in the plan, every status. */
  plannedIds: ReadonlyMap<string, string>;
  removedIds: ReadonlySet<string>;
  /**
   * `<connectionId>.<operationId>` of every serve an L4 process starts on (`trigger.kind: 'event'`, `trigger.event`).
   * That serve hands the message to the process; it takes no usecase from its `effect` (d1_206).
   */
  processTriggers?: ReadonlySet<string>;
  /**
   * The systems this module declares in its L4 (`externalSystems`), by id (d1_208). A system has no catalog file: its types are born
   * in the generated declaration, after this step. A serve of such a system carries no input fields here (`params: []`) and is a
   * command, because a message that arrives is something the module acts on; the materializer reads the types from the declaration.
   */
  declaredSystems?: Readonly<Record<string, ReadonlyArray<{ operationId: string; direction: string }>>>;
}

interface CatalogOperation {
  operationId: string;
  direction: string;
  kind: string;
  inputType: string;
}

/** The serves the processes of the L4 `workflows` start on: `trigger.event` of each `kind: 'event'` process. */
export function processTriggerServes(workflows: Readonly<Record<string, unknown>>): Set<string> {
  const events = new Set<string>();
  const processes: unknown = workflows.processes;
  if (!Array.isArray(processes)) return events;
  for (const process of processes) {
    const trigger = isRecord(process) ? process.trigger : undefined;
    if (isRecord(trigger) && trigger.kind === 'event' && typeof trigger.event === 'string' && trigger.event) events.add(trigger.event);
  }
  return events;
}

/**
 * Requests of `serve` lines. Does not read contract routes.
 * A line with an entity and an effect uses that usecase, or creates it the same way a contract request does.
 */
export function deriveServeRequests(input: DeriveServeInput): D1SelectedRequest[] {
  const requests: D1SelectedRequest[] = [];
  const lines = [...input.lines].sort((left, right) => serveKey(left).localeCompare(serveKey(right)));
  for (const line of lines) {
    const request = oneServe(input, line);
    if (request) requests.push(request);
  }
  return requests;
}

/**
 * The `take` of a contract request: use the planned usecase, or create `<operation><Entity>` with a review.
 * `refusalOf` is empty when the usecase may be created.
 */
export function takeUsecase(args: {
  problems: D1InputProblem[];
  path: string;
  routeName: string;
  entity: string;
  operation: string;
  transitionKey: string;
  usecases: D1SelectedUsecase[];
  uses: string[];
  colliding: ReadonlySet<string>;
  refusalOf: (usecaseId: string) => string;
  /** The calls the steps of the route's page cite for this entity and operation (d1_195). Chooses among usecases that name a call. */
  routeCalls?: readonly string[];
}): void {
  const candidates = args.transitionKey
    ? args.usecases.filter(item => item.entity === args.entity && item.operation === 'transition' && item.transitionRef === args.transitionKey)
    : args.usecases.filter(item => item.entity === args.entity && item.operation === args.operation);
  // Several external usecases (one per call) answer the same entity and operation: the route runs every one whose call the
  // steps of its page cite (the request service body chooses by the route input). None cited is an error, never the first.
  const named = candidates.filter(item => item.call);
  if (candidates.length > 1 && named.length === candidates.length) {
    const chosen = named.filter(item => (args.routeCalls || []).includes(item.call || ''));
    if (chosen.length === 0) {
      problem(
        args.problems,
        'error',
        'EXTERNAL_ROUTE_CALL_UNRESOLVED',
        args.path,
        `Route ${args.routeName} needs ${args.entity}.${args.operation}, which has one usecase per call (${named.map(item => `${item.usecaseId} → ${item.call}`).join(', ')}). The steps of its page cite none of them: the L4 must say which call the route runs.`,
        args.routeName,
      );
      return;
    }
    for (const item of chosen) if (!args.uses.includes(item.usecaseId)) args.uses.push(item.usecaseId);
    return;
  }
  const match = candidates[0];
  if (match) {
    if (!args.uses.includes(match.usecaseId)) args.uses.push(match.usecaseId);
    return;
  }
  const usecaseId = args.transitionKey
    ? transitionUsecaseId(args.entity, args.transitionKey, args.colliding)
    : `${args.operation}${args.entity.charAt(0).toUpperCase()}${args.entity.slice(1)}`;
  const refusal = args.refusalOf(usecaseId);
  if (refusal) {
    problem(args.problems, 'error', 'REQUEST_USECASE_UNPLANNED', args.path, `Route ${args.routeName} needs ${args.entity}.${args.operation}, which is not in the planned pool. ${refusal}`, args.routeName);
    return;
  }
  args.usecases.push({
    usecaseId,
    entity: args.entity,
    operation: args.operation,
    ...(args.operation === 'transition' ? { transitionRef: args.transitionKey } : {}),
    status: 'toCreate',
    existing: '',
    identity: usecaseId,
    routes: [],
  });
  problem(args.problems, 'review', 'USECASE_FROM_CONTRACT', args.path, `Route ${args.routeName} needs ${args.entity}.${args.operation}, which is not in the planned pool. Usecase ${usecaseId} was created from the contract.`, usecaseId);
  args.uses.push(usecaseId);
}

function oneServe(input: DeriveServeInput, line: D1ServeLine): D1SelectedRequest | null {
  const connectionId = line.connectionId;
  const operationId = line.operationId;
  const route = `${input.moduleName}.${connectionId}.${operationId}`;
  const path = contractPath(input.moduleName, connectionId);
  const serves = `${connectionId}.${operationId}`;
  const source = input.catalogTexts[connectionId];
  const declared = input.declaredSystems?.[connectionId];
  let kind: 'cmd' | 'qry' | '';
  let params: D1RequestParam[];
  if (!source && declared) {
    const declaredOperation = declared.find(item => item.operationId === operationId);
    if (!declaredOperation) {
      problem(input.problems, 'error', 'OPERATION_NOT_IN_CATALOG', path, `Operation ${serves} is not in the L4 systems of this module.`, route);
      return null;
    }
    if (declaredOperation.direction !== 'serve') {
      problem(input.problems, 'error', 'OPERATION_NOT_SERVE', path, `Operation ${serves} is not a serve operation.`, route);
      return null;
    }
    kind = 'cmd';
    params = [];
  } else {
    if (!source) {
      problem(input.problems, 'error', 'CONNECTION_CATALOG_MISSING', path, `Connection ${connectionId} has no catalog text.`, route);
      return null;
    }
    const operations = catalogOperations(source);
    const operation = operations?.find(item => item.operationId === operationId) ?? null;
    if (!operations || !operation) {
      problem(input.problems, 'error', 'OPERATION_NOT_IN_CATALOG', path, `Operation ${serves} is not in the connection catalog.`, route);
      return null;
    }
    if (operation.direction !== 'serve') {
      problem(input.problems, 'error', 'OPERATION_NOT_SERVE', path, `Operation ${serves} is not a serve operation.`, route);
      return null;
    }
    kind = operation.kind === 'command' ? 'cmd' : operation.kind === 'query' ? 'qry' : '';
    if (!kind) {
      problem(input.problems, 'error', 'OPERATION_NOT_IN_CATALOG', path, `Operation ${serves} has no query or command kind.`, route);
      return null;
    }
    params = topParams(source, operation.inputType);
  }
  // d1_232: what the line does to each entity comes from the one reader of the NS5 (the new `entityEffects`, or the old line translated).
  const entries = ns5ArrivalEffects(line, 'serve').filter(entry => entry.entityId);
  const first = entries[0];
  const entity = first?.entityId || '';
  const effect = first?.effects[0] || '';
  const writes = entity && effect ? `${entity}.${effect}` : '';
  const uses: string[] = [];
  const upserts: ArrivalUpsert[] = [];
  const owned = Boolean(input.processTriggers?.has(serves));
  for (const entry of entries) {
    const upsert = isUpsert(entry);
    // d1_206: a serve that starts a process takes no usecase from its effect, the process owns the write. A line that says create and update on
    // one entity (d1_232) is the exception: its port needs both, so the usecases are planned and the route still calls the process.
    if (owned && !upsert) continue;
    const kept = owned ? [] : uses;
    // d1_230/d1_232: one usecase per entity and effect the line names, in the order of the L4.
    for (const name of entry.effects) {
      const operationName = SERVE_OPERATION_OF_EFFECT[name];
      if (!operationName) continue;
      takeUsecase({
        problems: input.problems,
        path,
        routeName: route,
        entity: entry.entityId,
        operation: operationName,
        transitionKey: '',
        usecases: input.usecases,
        uses: kept,
        colliding: new Set(),
        refusalOf: usecaseId => usecaseRefusal(entry.entityId, operationName, usecaseId, input.entities, input.plannedIds, input.removedIds),
      });
    }
    if (!owned && entry.effects.includes('update')) linkArrivalTransitions(input.usecases, kept, entry.entityId, input.entities[entry.entityId]);
    if (upsert) {
      const key = upsertKeyOf(input.entities[entry.entityId]);
      if (key) upserts.push({ entityId: entry.entityId, ...key });
      else problem(input.problems, 'error', 'ARRIVAL_UPSERT_WITHOUT_KEY', path, `Route ${route} creates or updates ${entry.entityId}, which has no uniqueKeys and no id field to find the record by. The L4 must give the entity a key.`, route);
    }
  }
  return {
    route,
    pageId: connectionId,
    kind,
    writes,
    outputs: [],
    params,
    uses,
    serves,
    ...(upserts.length ? { upserts } : {}),
  };
}

/**
 * d1_259 s1c: the transitions of the entity that no person makes (`by: []`), by id. Empty when the entity has no lifecycle. These are the moves
 * an arrival from outside applies: the state is written by one of them, never set directly.
 */
export function processTransitionsOf(entity: unknown): string[] {
  if (!isRecord(entity) || !Array.isArray(entity.lifecycleStates) || entity.lifecycleStates.length === 0 || !Array.isArray(entity.transitions)) return [];
  return entity.transitions
    .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.transitionId === 'string' && Array.isArray(item.by) && item.by.length === 0)
    .map(item => String(item.transitionId))
    .sort();
}

/** The `update` usecase a serve calls on an entity with a lifecycle carries that entity's process transitions. */
function linkArrivalTransitions(usecases: D1SelectedUsecase[], uses: readonly string[], entityId: string, entity: unknown): void {
  const transitions = processTransitionsOf(entity);
  if (transitions.length === 0) return;
  for (const usecase of usecases) {
    if (usecase.entity !== entityId || usecase.operation !== 'update' || !uses.includes(usecase.usecaseId)) continue;
    usecase.arrivalTransitions = [...new Set([...(usecase.arrivalTransitions ?? []), ...transitions])].sort();
  }
}

export function usecaseRefusal(
  entity: string,
  operation: string,
  usecaseId: string,
  entities: Readonly<Record<string, unknown>>,
  plannedIds: ReadonlyMap<string, string>,
  removedIds: ReadonlySet<string>,
): string {
  if (!CREATED.has(operation)) return `Operation ${operation} is not created from the contract. It comes from the plan.`;
  if (!Object.prototype.hasOwnProperty.call(entities, entity)) return `Entity ${entity} is not in the module ontology.`;
  if (!isSafeToken(usecaseId)) return `Usecase id '${usecaseId}' is not an id.`;
  const prior = plannedIds.get(usecaseId);
  if (prior !== undefined) return `Usecase ${usecaseId} is already in the plan as ${prior}.`;
  if (removedIds.has(usecaseId)) return `Usecase ${usecaseId} is in removed.`;
  return '';
}

function catalogOperations(source: string): CatalogOperation[] | null {
  const parsed = parseD1Source(source.replace(/(export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*[A-Za-z_$][\w$.<>, ]*=/, '$1 ='), 'defs');
  if (!isRecord(parsed) || !Array.isArray(parsed.operations)) return null;
  const operations: CatalogOperation[] = [];
  for (const row of parsed.operations) {
    if (!isRecord(row) || typeof row.operationId !== 'string' || !row.operationId) continue;
    operations.push({
      operationId: row.operationId,
      direction: row.direction === 'call' || row.direction === 'serve' ? row.direction : '',
      kind: row.kind === 'query' || row.kind === 'command' ? row.kind : '',
      inputType: typeof row.inputType === 'string' ? row.inputType : '',
    });
  }
  return operations;
}

/** One param per top-level member of the catalog input interface. Nested members stay inside their parent. */
function topParams(source: string, inputType: string): D1RequestParam[] {
  const raw = interfaceBody(source, inputType);
  if (raw === null) return [];
  const body = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (!interfaceFieldPaths(body)) return [];
  const members = topMembers(body);
  if (!members) return [];
  return members.map(member => ({
    name: member.name,
    target: '',
    ...(member.optional ? { optional: true } : {}),
  }));
}

function interfaceBody(source: string, name: string): string | null {
  if (!name) return null;
  const at = source.indexOf(`interface ${name}`);
  if (at < 0) return null;
  const open = source.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

function topMembers(body: string): Array<{ name: string; optional: boolean }> | null {
  const members: Array<{ name: string; optional: boolean }> = [];
  let i = 0;
  while (i < body.length) {
    i = skipSpace(body, i);
    if (i >= body.length) return members;
    if (body.startsWith('readonly ', i)) i += 'readonly '.length;
    const name = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(body.slice(i));
    if (!name) return null;
    i = skipSpace(body, i + name[0].length);
    const optional = body[i] === '?';
    if (optional) i = skipSpace(body, i + 1);
    if (body[i] !== ':') return null;
    i = skipSpace(body, i + 1);
    if (body[i] === '{') {
      const end = closeBrace(body, i);
      if (end < 0) return null;
      i = skipSpace(body, end);
      if (body[i] === ';') i += 1;
    } else {
      let depth = 0;
      let quote = '';
      while (i < body.length) {
        const ch = body[i];
        if (quote) {
          if (ch === quote) quote = '';
          i += 1;
          continue;
        }
        if (ch === '\'' || ch === '"') {
          quote = ch;
          i += 1;
          continue;
        }
        if (ch === '{' || ch === '(' || ch === '[') {
          depth += 1;
          i += 1;
          continue;
        }
        if (ch === '}' || ch === ')' || ch === ']') {
          if (depth === 0) break;
          depth -= 1;
          i += 1;
          continue;
        }
        if (ch === ';' && depth === 0) {
          i += 1;
          break;
        }
        i += 1;
      }
    }
    members.push({ name: name[0], optional });
  }
  return members;
}

function closeBrace(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function skipSpace(source: string, index: number): number {
  let i = index;
  while (i < source.length && (source[i] === ' ' || source[i] === '\n' || source[i] === '\r' || source[i] === '\t')) i += 1;
  return i;
}

function serveKey(line: D1ServeLine): string {
  return `${line.connectionId}.${line.operationId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function problem(
  problems: D1InputProblem[],
  severity: D1InputProblem['severity'],
  code: string,
  path: string,
  message: string,
  ownerRef: string,
): void {
  if (problems.some(item => item.code === code && item.path === path && item.ownerRef === (ownerRef || undefined) && item.message === message)) return;
  const row: D1InputProblem = { severity, code, path, message };
  if (ownerRef) row.ownerRef = ownerRef;
  problems.push(row);
}
