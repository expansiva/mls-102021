/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/childWriters.ts" enhancement="_blank"/>

// d1_221: the entity the L4 says is written by its parent. The rule is the one of the NS5 (`ns5ResolveEntityWriter`, a pure file of the
// platform), not a copy: this file only hands it the L4 of the module and reads its answer. An entity whose writer resolves as `parent`
// is recorded inside the usecase that writes the parent (for an `external` parent: after the call to the connection).
//
// Only an entity of `class: event` is read that way. The NS5 resolves `parent` for any entity nobody writes by a step of its own, and measured
// on the 16 modules of the platform that is also an order or a supporting record that a workflow or another
// step writes, so recording it with its parent would be wrong. An `event` is a record of what the parent step did (who, when, which): it has
// no other writer, and that is what the L4 says of it.

import { inputPaths, isSafeToken, journeyPath } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';
import { ns5ResolveEntityWriter, ns5WriterPlanOfOntology, ns5WriterViewOfEntity } from '/_102035_/l2/solution/entityWriter.js';
import { ns5OntologyEntityViews, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';

/** `childId` is recorded by the usecases that write `parentId`, through `relationshipId`. */
export interface D1ChildWriter {
  childId: string;
  parentId: string;
  relationshipId: string;
}

/** The journey as the NS5 reads it: the act steps and what they write. */
export interface D1WriterJourney {
  journeyId: string;
  steps: ReadonlyArray<{ stepId: string; kind: string; entity: string; effect: string; affects: readonly string[] }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Every entity of `entities` whose writer is `parent`, with its parent. `entities` are the L4 bodies by entity id and `index` the L4
 * ontology index; an entity that is not among them is not resolved (its parent could not name it). Sorted by child, then parent.
 */
export function childWritersOf(
  index: unknown,
  entities: Readonly<Record<string, unknown>>,
  journeys: readonly D1WriterJourney[],
): D1ChildWriter[] {
  if (!isRecord(index)) return [];
  const bodies = Object.values(entities).filter(isRecord) as unknown as Ns5OntologyAnyEntity[];
  if (!bodies.length) return [];
  const views = ns5OntologyEntityViews(bodies);
  const plan = ns5WriterPlanOfOntology(views, index as unknown as Ns5OntologyAnyIndex);
  const read = journeys.map(journey => ({
    journeyId: journey.journeyId,
    business: { steps: journey.steps.map(step => ({ stepId: step.stepId, kind: step.kind, entity: step.entity, affects: [...step.affects], effect: step.effect })) },
  }));
  const out: D1ChildWriter[] = [];
  for (const view of views) {
    const resolved = ns5ResolveEntityWriter(ns5WriterViewOfEntity(view), plan, read);
    if (resolved.kind !== 'parent' || !resolved.via) continue;
    if ((entities[view.entityId] as { class?: unknown } | undefined)?.class !== 'event') continue;
    out.push({ childId: view.entityId, parentId: resolved.via.entityId, relationshipId: resolved.via.relationshipId });
  }
  return out.sort((left, right) => `${left.childId}\u0000${left.parentId}`.localeCompare(`${right.childId}\u0000${right.parentId}`));
}

/** The journeys of the module as the resolver reads them: the index lists the ids, each file has the steps. A file that is not there is not a journey. */
export async function loadWriterJourneys(moduleName: string, read: (logicalPath: string) => Promise<string | null>): Promise<{ index: unknown; journeys: D1WriterJourney[] }> {
  const paths = inputPaths(moduleName);
  const indexText = await read(paths.ontologyIndex);
  const journeyIndexText = await read(paths.journeyIndex);
  const journeyIndex = journeyIndexText ? parseD1Source(journeyIndexText, 'defs') : null;
  const ids = isRecord(journeyIndex) && Array.isArray(journeyIndex.journeys)
    ? journeyIndex.journeys.flatMap(row => isRecord(row) && typeof row.journeyId === 'string' && isSafeToken(row.journeyId) ? [row.journeyId] : [])
    : [];
  const journeys: D1WriterJourney[] = [];
  for (const journeyId of ids) {
    const text = await read(journeyPath(moduleName, journeyId));
    const body = text ? parseD1Source(text, 'defs') : null;
    const business = isRecord(body) && isRecord(body.business) ? body.business : null;
    if (!business || !Array.isArray(business.steps)) continue;
    const steps = business.steps.filter(isRecord).filter(step => typeof step.stepId === 'string').map(step => ({
      stepId: String(step.stepId),
      kind: typeof step.kind === 'string' ? step.kind : '',
      entity: typeof step.entity === 'string' ? step.entity : '',
      effect: typeof step.effect === 'string' ? step.effect : '',
      affects: Array.isArray(step.affects) ? step.affects.filter((item): item is string => typeof item === 'string') : [],
    }));
    journeys.push({ journeyId, steps });
  }
  return { index: indexText ? parseD1Source(indexText, 'defs') : null, journeys };
}
