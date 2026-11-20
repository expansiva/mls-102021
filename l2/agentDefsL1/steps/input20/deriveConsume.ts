/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveConsume.ts" enhancement="_blank"/>

// d1_217: the route that receives a module event. The L4 says it in `integration.defs.ts`, on an `inbound` line of `kind: 'event'`
// (`from`, `writes`, `effect`). The line becomes one request of a pseudo-page named by the publisher module, with the mark
// `consumes: '<publisher>.<eventId>'` the platform delivers to, and it uses the usecase that does the effect on `writes`
// (the `consumer` of `inboundOperation`, support70). It is the same mould as the serve route: no contract, no output tree.

import { takeUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/deriveServe.js';
import {
  isSafeToken,
  type D1InputProblem,
  type D1SelectedRequest,
  type D1SelectedUsecase,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { L1_OPERATIONS, type L1Operation } from '/_102021_/l2/helpers/l1Defs/operations.js';

/** One `inbound` line with `kind: 'event'`. The platform's own events (`from: organization`) have no module publisher: no route. */
export interface D1ConsumeLine {
  from: string;
  eventId: string;
  writes: readonly string[];
  effect: string;
  transitionRef: string;
}

const OPERATION_OF_EFFECT: Record<string, L1Operation> = { create: 'create', update: 'update' };
const CREATED = new Set<string>(L1_OPERATIONS.filter(operation => operation !== 'custom' && operation !== 'transition'));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** The event lines of the L4 `inbound`, in the L4 order. A line without a publisher module or with an unsafe id is left out. */
export function consumeLinesOf(integration: Readonly<Record<string, unknown>>): D1ConsumeLine[] {
  const lines: D1ConsumeLine[] = [];
  for (const row of Array.isArray(integration.inbound) ? integration.inbound : []) {
    if (!isRecord(row) || row.kind !== 'event') continue;
    const from = text(row.from);
    const eventId = text(row.event) || text(row.id);
    if (!from || from === 'organization' || !isSafeToken(from) || !isSafeToken(eventId)) continue;
    lines.push({
      from,
      eventId,
      writes: (Array.isArray(row.writes) ? row.writes : []).filter((item): item is string => typeof item === 'string' && item !== ''),
      effect: text(row.effect),
      transitionRef: text(row.transitionRef),
    });
  }
  return lines;
}

export interface DeriveConsumeInput {
  moduleName: string;
  lines: readonly D1ConsumeLine[];
  usecases: D1SelectedUsecase[];
  problems: D1InputProblem[];
  entities: Readonly<Record<string, unknown>>;
  plannedIds: ReadonlyMap<string, string>;
  removedIds: ReadonlySet<string>;
  /** Page ids already taken (contract pages and connection pages): a publisher module with the same name would share their file. */
  takenPages: ReadonlySet<string>;
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

/** One request per event line. The page is the publisher module; the route is `<module>.<publisher>.<eventId>`. */
export function deriveConsumeRequests(input: DeriveConsumeInput): D1SelectedRequest[] {
  const requests: D1SelectedRequest[] = [];
  const seen = new Set<string>();
  const lines = [...input.lines].sort((left, right) => `${left.from}.${left.eventId}`.localeCompare(`${right.from}.${right.eventId}`));
  for (const line of lines) {
    const consumes = `${line.from}.${line.eventId}`;
    const route = `${input.moduleName}.${line.from}.${line.eventId}`;
    const path = `l4/${input.moduleName}/integration.defs.ts`;
    if (seen.has(consumes)) {
      input.problems.push({ severity: 'error', code: 'CONSUMES_DUPLICATE', path, message: `Event ${consumes} is received by more than one inbound line: the platform delivers it to one route of the module.`, ownerRef: route } as D1InputProblem);
      continue;
    }
    seen.add(consumes);
    if (input.takenPages.has(line.from)) {
      input.problems.push({ severity: 'error', code: 'CONSUMES_PAGE_COLLISION', path, message: `The publisher module ${line.from} uses the same id as a page or a connection of this module: their request service would share one file.`, ownerRef: route } as D1InputProblem);
      continue;
    }
    const uses: string[] = [];
    const entities = line.writes;
    const operation = OPERATION_OF_EFFECT[line.effect] ?? '';
    const transition = line.effect === 'transition' && line.transitionRef !== '';
    // d1_225: a line that writes nothing is a route that only confirms the receipt: no usecase, so no effect to name (and none is asked for).
    if (!operation && !transition && entities.length > 0) {
      input.problems.push({ severity: 'error', code: 'CONSUMES_EFFECT_UNKNOWN', path, message: `Event ${consumes} has an effect (${line.effect || 'none'}) that is not create, update or a transition with a transitionRef: no usecase can be named.`, ownerRef: route } as D1InputProblem);
      continue;
    }
    for (const entity of entities) {
      takeUsecase({
        problems: input.problems,
        path,
        routeName: route,
        entity,
        operation: transition ? 'transition' : operation,
        transitionKey: transition ? line.transitionRef : '',
        usecases: input.usecases,
        uses,
        colliding: new Set(),
        refusalOf: usecaseId => usecaseRefusal(entity, transition ? 'transition' : operation, usecaseId, input.entities, input.plannedIds, input.removedIds),
      });
    }
    requests.push({
      route,
      pageId: line.from,
      kind: 'cmd',
      writes: entities.length === 1 ? `${entities[0]}.${line.effect}` : '',
      outputs: [],
      params: [],
      uses,
      consumes,
    });
  }
  return requests;
}
