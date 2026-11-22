/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveProcess.ts" enhancement="_blank"/>

// d1_235: the process an arrival starts writes through the port, so its usecases are in the plan: the pairs its tasks name (`mechanical` or `llm`
// task with an entity and create, update or a transition) and the entities its arrival creates and updates (planned by deriveServe/deriveConsume).
// Nobody called them (the route calls the process), so the prune of an unrequested usecase would drop them: the route of the arrival is their route.

import { taskEffects } from '/_102021_/l2/helpers/l1Defs/taskEffects.js';
import { takeUsecase, usecaseRefusal } from '/_102021_/l2/agentDefsL1/steps/input20/deriveServe.js';
import type { D1InputProblem, D1SelectedRequest, D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export interface DeriveProcessInput {
  moduleName: string;
  workflows: Readonly<Record<string, unknown>>;
  requests: readonly D1SelectedRequest[];
  usecases: D1SelectedUsecase[];
  problems: D1InputProblem[];
  entities: Readonly<Record<string, unknown>>;
  plannedIds: ReadonlyMap<string, string>;
  removedIds: ReadonlySet<string>;
}

/**
 * For each arrival request (`serves` or `consumes`) that starts an L4 process: take the usecase of each pair the tasks of the process name, and
 * return, by route, the usecase ids the process keeps (those, and the ones of the upserts of the arrival).
 */
export function deriveProcessUsecases(input: DeriveProcessInput): Map<string, Set<string>> {
  const kept = new Map<string, Set<string>>();
  const processes = Array.isArray(input.workflows.processes) ? input.workflows.processes.filter(isRecord) : [];
  for (const request of input.requests) {
    const arrival = request.serves || request.consumes || '';
    if (!arrival) continue;
    for (const process of processes) {
      const trigger = isRecord(process.trigger) ? process.trigger : {};
      if (trigger.kind !== 'event' || trigger.event !== arrival) continue;
      const ids = kept.get(request.route) ?? new Set<string>();
      const path = `l4/${input.moduleName}/workflows.defs.ts`;
      for (const task of Array.isArray(process.tasks) ? process.tasks.filter(isRecord) : []) {
        const kind = text(task.kind);
        const transitionRef = text(task.transitionRef);
        if (kind !== 'mechanical' && kind !== 'llm') continue;
        // d1_279: each effect the task says on each entity (`entityEffects`, or the older `entityRef` + `effect`) takes its usecase.
        for (const { entityId: entity, effects } of taskEffects(task)) {
          for (const effect of effects) {
            const transition = effect === 'transition' && transitionRef !== '';
            const operation = transition ? 'transition' : effect === 'create' || effect === 'update' ? effect : '';
            if (!operation) continue;
            const uses: string[] = [];
            takeUsecase({
              problems: input.problems,
              path,
              routeName: request.route,
              entity,
              operation,
              transitionKey: transition ? transitionRef : '',
              usecases: input.usecases,
              uses,
              colliding: new Set(),
              refusalOf: usecaseId => usecaseRefusal(entity, operation, usecaseId, input.entities, input.plannedIds, input.removedIds),
            });
            for (const id of uses) ids.add(id);
          }
        }
      }
      // The entities the arrival creates and updates: deriveServe/deriveConsume planned both usecases for the port of the process.
      for (const upsert of request.upserts ?? []) {
        for (const usecase of input.usecases) {
          if (usecase.entity === upsert.entityId && (usecase.operation === 'create' || usecase.operation === 'update')) ids.add(usecase.usecaseId);
        }
      }
      if (ids.size > 0) kept.set(request.route, ids);
    }
  }
  return kept;
}
