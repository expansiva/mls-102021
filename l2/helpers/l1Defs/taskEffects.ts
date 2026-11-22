/// <mls fileReference="_102021_/l2/helpers/l1Defs/taskEffects.ts" enhancement="_blank"/>

// d1_279: what a task of a workflow process does to each entity, read by one function. A `mechanical` or `llm` task says it in `entityEffects` (the NS5 list an
// arrival uses, read by the same `ns5ArrivalEffects`), or, in the older form, with one `entityRef` and one `effect`. The plan of the process, the input gate,
// the route derivation and the workflow emitter all read the task through here.

import { ns5ArrivalEffects } from '/_102035_/l2/solution/arrivalEffects.js';

export interface TaskEntityEffects {
  entityId: string;
  effects: string[];
}

/** The entities a task touches with their effects, in order; the first is the entity of the record. Nothing when the task names no entity. */
export function taskEffects(task: Record<string, unknown>): TaskEntityEffects[] {
  if (Array.isArray(task.entityEffects)) {
    return ns5ArrivalEffects({ entityEffects: task.entityEffects }, 'serve').filter(entry => entry.entityId !== '');
  }
  const entityId = typeof task.entityRef === 'string' ? task.entityRef : '';
  if (!entityId) return [];
  return [{ entityId, effects: typeof task.effect === 'string' && task.effect ? [task.effect] : [] }];
}
