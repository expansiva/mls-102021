/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/affectedWrites.ts" enhancement="_blank"/>

// d1_291: the entity a step lists in `affects` is written by the command of that step, through its port (no usecase writes it: a usecase serves every step of its entity and operation). The def of the
// request service gives the port as a dependency; which command writes it, and what the L4 says about that write, is read here from the L4 and the shared page of the L2, never from the def.
// A command is tied to its step by the `trigger` of the shared page (it is the id of the step); when the trigger is not a step of the page, by what the command writes (entity and effect) when the
// page has exactly one step of that kind.

import { isRecord } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { isL1Operation } from '/_102021_/l2/helpers/l1Defs/operations.js';
import { parseD2WriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';

export interface AffectedWrite {
  route: string;
  journeyId: string;
  stepId: string;
  title: string;
  description: string;
  entityId: string;
}

interface L4Step {
  stepId: string;
  kind: string;
  entity: string;
  effect: string;
  affects: string[];
  title: string;
  description: string;
}

/** The record of an L4 file (`export const x = { … } as const;`); null when it is not there or does not parse. */
export function l4RecordOf(source: string | null): Record<string, unknown> | null {
  const text = source ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(source)?.[1] : undefined;
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/** The act steps of a journey file of the L4, by step id. */
export function journeySteps(source: string | null): Map<string, L4Step> {
  const out = new Map<string, L4Step>();
  const business = l4RecordOf(source)?.business;
  const steps = isRecord(business) && Array.isArray(business.steps) ? business.steps : [];
  for (const step of steps) {
    if (!isRecord(step) || typeof step.stepId !== 'string') continue;
    out.set(step.stepId, {
      stepId: step.stepId,
      kind: typeof step.kind === 'string' ? step.kind : '',
      entity: typeof step.entity === 'string' ? step.entity : '',
      effect: typeof step.effect === 'string' ? step.effect : '',
      affects: Array.isArray(step.affects) ? step.affects.filter((item): item is string => typeof item === 'string') : [],
      title: typeof step.title === 'string' ? step.title : '',
      description: typeof step.description === 'string' ? step.description : '',
    });
  }
  return out;
}

/** A step of effect `effect` is what a write of `operation` does; a `transition` step is any operation that is not one of the module operations (the key carries the transition id). */
function servesEffect(effect: string, operation: string): boolean {
  return effect === 'transition' ? !isL1Operation(operation) : effect === operation;
}

/**
 * The commands of a page that write an entity listed in `affects` by the step they serve, among `portEntities` (the ports the def of the request service depends on).
 * `shared` is the text of `l2/<module>/web/shared/<page>.defs.ts`; `readJourney` gives the text of an L4 journey by id.
 */
export async function affectedWritesOf(input: {
  routes: ReadonlyArray<{ route: string; kind: string }>;
  shared: string | null;
  portEntities: ReadonlySet<string>;
  readJourney: (journeyId: string) => Promise<string | null>;
}): Promise<AffectedWrite[]> {
  const shared = l4RecordOf(input.shared);
  if (!shared || !input.portEntities.size) return [];
  const requests = isRecord(shared.requests) ? shared.requests : {};
  const pageSteps: Array<{ journeyId: string; step: L4Step }> = [];
  const journeyCache = new Map<string, Map<string, L4Step>>();
  for (const item of Array.isArray(shared.journeys) ? shared.journeys : []) {
    const [journeyId, stepId] = isRecord(item) && typeof item.step === 'string' ? item.step.split('/') : ['', ''];
    if (!journeyId || !stepId) continue;
    if (!journeyCache.has(journeyId)) journeyCache.set(journeyId, journeySteps(await input.readJourney(journeyId)));
    const step = journeyCache.get(journeyId)?.get(stepId);
    if (step) pageSteps.push({ journeyId, step });
  }
  const out: AffectedWrite[] = [];
  for (const row of input.routes) {
    if (row.kind !== 'cmd') continue;
    const request = requests[row.route.split('.').pop() ?? ''];
    if (!isRecord(request)) continue;
    const trigger = typeof request.trigger === 'string' ? request.trigger : '';
    let hit = pageSteps.find(item => item.step.stepId === trigger);
    if (!hit && typeof request.writes === 'string') {
      try {
        const write = parseD2WriteKey(request.writes);
        const same = pageSteps.filter(item => item.step.kind === 'act' && item.step.entity === write.entity && servesEffect(item.step.effect, write.operation));
        if (same.length === 1) hit = same[0];
      } catch { /* a key that does not parse ties the command to no step */ }
    }
    if (!hit || hit.step.kind !== 'act') continue;
    for (const entityId of hit.step.affects) {
      if (!input.portEntities.has(entityId)) continue;
      out.push({ route: row.route, journeyId: hit.journeyId, stepId: hit.step.stepId, title: hit.step.title, description: hit.step.description, entityId });
    }
  }
  return out;
}
