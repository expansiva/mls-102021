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
import { L1_OPERATIONS, transitionUsecaseId, type L1Operation } from '/_102021_/l2/helpers/l1Defs/operations.js';

/** One `integration.connections` line with `direction: 'serve'`. */
export interface D1ServeLine {
  connectionId: string;
  operationId: string;
  entityRefs?: readonly string[];
  effect?: string;
}

/** Connection effect to the usecase operation. Serve lines have no step; the call side is `externalCallsOf`. */
const OPERATION_OF_EFFECT: Record<string, L1Operation> = {
  list: 'list',
  read: 'get',
  create: 'create',
  update: 'update',
  remove: 'delete',
};

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
}

interface CatalogOperation {
  operationId: string;
  direction: string;
  kind: string;
  inputType: string;
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
}): void {
  const match = args.transitionKey
    ? args.usecases.find(item => item.entity === args.entity && item.operation === 'transition' && item.transitionRef === args.transitionKey)
    : args.usecases.find(item => item.entity === args.entity && item.operation === args.operation);
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
  const kind = operation.kind === 'command' ? 'cmd' : operation.kind === 'query' ? 'qry' : '';
  if (!kind) {
    problem(input.problems, 'error', 'OPERATION_NOT_IN_CATALOG', path, `Operation ${serves} has no query or command kind.`, route);
    return null;
  }
  const entity = line.entityRefs?.[0] || '';
  const effect = line.effect || '';
  const writes = entity && effect ? `${entity}.${effect}` : '';
  const uses: string[] = [];
  const operationName = entity && effect ? OPERATION_OF_EFFECT[effect] : '';
  if (entity && effect && operationName) {
    takeUsecase({
      problems: input.problems,
      path,
      routeName: route,
      entity,
      operation: operationName,
      transitionKey: '',
      usecases: input.usecases,
      uses,
      colliding: new Set(),
      refusalOf: usecaseId => usecaseRefusal(entity, operationName, usecaseId, input.entities, input.plannedIds, input.removedIds),
    });
  }
  return {
    route,
    pageId: connectionId,
    kind,
    writes,
    outputs: [],
    params: topParams(source, operation.inputType),
    uses,
    serves,
  };
}

function usecaseRefusal(
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
