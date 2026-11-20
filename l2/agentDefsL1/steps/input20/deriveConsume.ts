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
import { L1_OPERATIONS } from '/_102021_/l2/helpers/l1Defs/operations.js';
import { INBOUND_OPERATION_OF_EFFECT } from '/_102021_/l2/agentDefsL1/steps/input20/arrivalPairs.js';
import { isUpsert, upsertKeyOf, type ArrivalUpsert } from '/_102021_/l2/helpers/l1Defs/arrivalUpsert.js';
import { ns5ArrivalEffects, type Ns5ArrivalEntityEffects } from '/_102035_/l2/solution/arrivalEffects.js';

/** One `inbound` line with `kind: 'event'`. The platform's own events (`from: organization`) have no module publisher: no route. */
export interface D1ConsumeLine {
  from: string;
  eventId: string;
  /** What the line does to each entity, from the one reader of the NS5 (d1_232). */
  entries: readonly Ns5ArrivalEntityEffects[];
  transitionRef: string;
}
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
      entries: ns5ArrivalEffects(row, 'inbound').filter(entry => entry.entityId),
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
    const upserts: ArrivalUpsert[] = [];
    const { entries } = line;
    // d1_225: a line that writes nothing is a route that only confirms the receipt: no usecase, so no effect to name (and none is asked for).
    // d1_232: an effect that is not create, update or a transition with a transitionRef names no usecase: the line is refused, whole.
    const unusable = entries.flatMap(entry => entry.effects.length === 0
      ? ['none']
      : entry.effects.filter(effect => !INBOUND_OPERATION_OF_EFFECT[effect] && !(effect === 'transition' && line.transitionRef !== '')));
    if (unusable.length > 0) {
      input.problems.push({ severity: 'error', code: 'CONSUMES_EFFECT_UNKNOWN', path, message: `Event ${consumes} has an effect (${[...new Set(unusable)].join(', ')}) that is not create, update or a transition with a transitionRef: no usecase can be named.`, ownerRef: route } as D1InputProblem);
      continue;
    }
    for (const entry of entries) {
      for (const effect of entry.effects) {
        const transition = effect === 'transition';
        const operation = transition ? 'transition' : INBOUND_OPERATION_OF_EFFECT[effect] ?? '';
        takeUsecase({
          problems: input.problems,
          path,
          routeName: route,
          entity: entry.entityId,
          operation,
          transitionKey: transition ? line.transitionRef : '',
          usecases: input.usecases,
          uses,
          colliding: new Set(),
          refusalOf: usecaseId => usecaseRefusal(entry.entityId, operation, usecaseId, input.entities, input.plannedIds, input.removedIds),
        });
      }
      if (isUpsert(entry)) {
        const key = upsertKeyOf(input.entities[entry.entityId]);
        if (key) upserts.push({ entityId: entry.entityId, ...key });
        else input.problems.push({ severity: 'error', code: 'ARRIVAL_UPSERT_WITHOUT_KEY', path, message: `Route ${route} creates or updates ${entry.entityId}, which has no uniqueKeys and no id field to find the record by. The L4 must give the entity a key.`, ownerRef: route } as D1InputProblem);
      }
    }
    const single = entries.length === 1 && entries[0].effects.length === 1 ? `${entries[0].entityId}.${entries[0].effects[0]}` : '';
    requests.push({
      route,
      pageId: line.from,
      kind: 'cmd',
      writes: single,
      outputs: [],
      params: [],
      uses,
      consumes,
      ...(upserts.length ? { upserts } : {}),
    });
  }
  return requests;
}
