/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/workflowReach.ts" enhancement="_blank"/>

// d1_272: which routes reach a workflow process. One rule for the two readers that need it: the request context (the handler of such a route calls the
// function of the process) and the D1 re-derivation (a request that calls a process whose def changed is listed again). It reads def data only.

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * d1_273: the journeys a page serves, from its shared def (`l2/<module>/web/shared/<page>.defs.ts`, `journeys[].step` = `<journeyId>/<stepId>`). null when the
 * def is not there or does not parse: the page is then unknown, and no route is taken out of a process for it.
 */
export function pageJourneyIds(source: string | null): ReadonlySet<string> | null {
  const text = source ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(source)?.[1] : undefined;
  if (!text) return null;
  try {
    const journeys = (JSON.parse(text) as Record<string, unknown>).journeys;
    if (!Array.isArray(journeys)) return null;
    return new Set(journeys.filter(isRecord).map(item => String(item.step ?? '').split('/')[0]).filter(Boolean));
  } catch {
    return null;
  }
}

/**
 * The `Entity.operation` rows of a process (`data.operations`) that a route of a page reaches. d1_264: a process the system starts (an event, a schedule)
 * reaches an operation only by its own `task:` steps; a route of a page does not start it. Only a step of a journey (`journey:...`), or a trigger a person
 * starts, puts the route in the process. d1_273: and when the page is known (`pageJourneys`), only a row with a step of a journey that page serves: the same
 * operation on a page of another journey (`AgentTool.update` of `adjustAgentTools`, while the process lists it for `reviewAndActivateDraft` and by a task)
 * is not the process's. A row that lists no step is kept: nothing says it is not.
 */
export function routeReachableOperations(processData: Record<string, unknown>, pageJourneys: ReadonlySet<string> | null = null): string[] {
  const system = isRecord(processData.trigger) && processData.trigger.kind !== 'manual';
  return Array.isArray(processData.operations)
    ? processData.operations.filter(isRecord)
      .filter(row => !system || !Array.isArray(row.steps) || row.steps.length === 0 || row.steps.some(step => !String(step).startsWith('task:')))
      .filter(row => {
        if (!pageJourneys || !Array.isArray(row.steps) || row.steps.length === 0) return true;
        return row.steps.some(step => {
          const journey = /^journey:([^/]+)\//u.exec(String(step))?.[1];
          return journey !== undefined && pageJourneys.has(journey);
        });
      })
      .map(row => String(row.operation ?? ''))
    : [];
}

/** `<connectionId>.<operationId>` of the message that starts a process (`trigger: { kind: 'event', event }`), or ''. */
export function processStartEvent(processData: Record<string, unknown>): string {
  const trigger = processData.trigger;
  return isRecord(trigger) && trigger.kind === 'event' && typeof trigger.event === 'string' ? trigger.event : '';
}

/**
 * d1_275: the arrival each function of the process receives (`data.receives`, read by the D1 from the L4 `functions[].receives`, never from prose):
 * `<connectionId>.<operationId>` → function. The route that serves that arrival hands the message to the function.
 */
export function processReceives(processData: Record<string, unknown>): Map<string, string> {
  const out = new Map<string, string>();
  if (!Array.isArray(processData.receives)) return out;
  for (const row of processData.receives) {
    if (isRecord(row) && typeof row.arrival === 'string' && row.arrival && typeof row.function === 'string' && row.function) out.set(row.arrival, row.function);
  }
  return out;
}

/** The `Entity.operation` names of a usecase def: its operation, and its transition when it is one. */
export function usecaseOperationNames(usecaseData: Record<string, unknown>): string[] {
  const entityId = String(usecaseData.entityId ?? '');
  return [String(usecaseData.operation ?? ''), String(usecaseData.transitionRef ?? '')].filter(Boolean).map(op => `${entityId}.${op}`);
}
