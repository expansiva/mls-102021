/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/affectedPorts.ts" enhancement="_blank"/>

// d1_291: the entity a step lists in `affects` is written by the route of that step, through its port. The request def of a page lists, as a dependency, the port of every such entity that a
// command of the page writes for: the def changes (so the unit is derived again) and the generated file may import the port. Which command writes it is the materializer's to read (the L4 steps and
// the `trigger` of the shared page of the L2); here the page is enough: a step of the page (the `journey:` lines of its needs) that a command of the page serves by (entity, effect).

import type { D1AffectedPort } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import type { D1ChildWriter, D1WriterJourney } from '/_102021_/l2/agentDefsL1/steps/usecases50/childWriters.js';
import { isL1Operation } from '/_102021_/l2/helpers/l1Defs/operations.js';
import { parseD2WriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** `<journeyId>/<stepId>` of every journey step a page of the needs reads or writes for. */
function pageSteps(needs: unknown): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const pages = isRecord(needs) && Array.isArray(needs.pages) ? needs.pages : [];
  for (const page of pages) {
    if (!isRecord(page) || typeof page.pageId !== 'string') continue;
    const steps = new Set<string>();
    for (const rows of [page.reads, page.writes]) {
      for (const row of Array.isArray(rows) ? rows : []) {
        for (const from of isRecord(row) && Array.isArray(row.from) ? row.from : []) {
          if (typeof from === 'string' && from.startsWith('journey:')) steps.add(from.slice('journey:'.length));
        }
      }
    }
    out.set(page.pageId, steps);
  }
  return out;
}

/** A step of effect `effect` is what a write of operation `operation` does: a `transition` step is any operation that is not one of the module operations (the key carries the transition id). */
function servesEffect(effect: string, operation: string): boolean {
  return effect === 'transition' ? !isL1Operation(operation) : effect === operation;
}

/**
 * `pageId` → the ports of the entities written by a step (the `childWriters` with no relationship) that a command of the page serves. Only entities with a port. Sorted by entity.
 */
export function affectedPortsByPage(input: {
  needs: unknown;
  journeys: readonly D1WriterJourney[];
  childWriters: readonly D1ChildWriter[];
  requests: ReadonlyArray<{ route: string; pageId: string; kind: string; writes: string }>;
  ports: ReadonlyArray<{ entityId: string; portId: string; defPath: string }>;
}): Record<string, D1AffectedPort[]> {
  const affected = new Set(input.childWriters.filter(child => child.relationshipId === '').map(child => child.childId));
  const out: Record<string, D1AffectedPort[]> = {};
  if (!affected.size) return out;
  const steps = new Map<string, D1WriterJourney['steps'][number]>(input.journeys.flatMap(journey => journey.steps.map(step => [`${journey.journeyId}/${step.stepId}`, step] as [string, D1WriterJourney['steps'][number]])));
  const byPage = pageSteps(input.needs);
  for (const request of input.requests) {
    if (request.kind !== 'cmd' || !request.writes) continue;
    let write: { entity: string; operation: string };
    try { write = parseD2WriteKey(request.writes); } catch { continue; }
    for (const key of byPage.get(request.pageId) ?? []) {
      const step = steps.get(key);
      if (!step || step.kind !== 'act' || step.entity !== write.entity || !servesEffect(step.effect, write.operation)) continue;
      for (const entityId of step.affects) {
        const port = input.ports.find(item => item.entityId === entityId);
        if (!affected.has(entityId) || !port) continue;
        const listed = out[request.pageId] ?? (out[request.pageId] = []);
        if (!listed.some(item => item.entityId === entityId)) listed.push({ entityId, portId: port.portId, defPath: port.defPath });
      }
    }
  }
  for (const listed of Object.values(out)) listed.sort((left, right) => left.entityId.localeCompare(right.entityId));
  return out;
}
