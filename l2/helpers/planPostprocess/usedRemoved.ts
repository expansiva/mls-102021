/// <mls fileReference="_102021_/l2/helpers/planPostprocess/usedRemoved.ts" enhancement="_blank"/>

// Reads route→usecase the same way input20 does. A contract-only walk misses nested outputs
// (output.tarefa.responsavel reads Participante). buildD1InputSnapshot is the oracle; agentDefsL1 stays unchanged.
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import type { D1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

/** A `toRemove` usecase a contract route still calls, with the entity and operation from the snapshot. */
export interface UsedRemovedUsecase {
  id: string;
  routes: string[];
  entity: string;
  operation: string;
  /**
   * d1_234: a usecase of an external entity (it names its call, d1_195) that the plan has no row of: the defs generator makes it from the L4
   * calls, as it does for a clean plan, so it only leaves `removed`. A row put back as well was the same usecase twice (the split made it
   * again) and left the planned id of the call without a step.
   */
  derived?: boolean;
}

/**
 * Drop usecase rows from `removed`, then a removed id that shows up in `selection.requests[].uses`
 * is still required. `entity` and `operation` come from `selection.usecases`.
 */
export function usedRemovedUsecases(
  identity: { project: number; moduleName: string },
  artifacts: D1InputArtifacts,
): UsedRemovedUsecase[] {
  const removedIds = usecaseRemovedIds(artifacts);
  const planned = plannedUsecaseIds(artifacts);
  const snapshot = buildD1InputSnapshot(identity, withoutUsecaseRemoved(artifacts), null);
  const byId = new Map<string, UsedRemovedUsecase>();
  for (const request of snapshot.selection.requests) {
    for (const id of request.uses) {
      if (!removedIds.has(id)) continue;
      const current = byId.get(id);
      if (current) {
        if (!current.routes.includes(request.route)) current.routes.push(request.route);
        continue;
      }
      const selected = snapshot.selection.usecases.find(item => item.usecaseId === id);
      byId.set(id, {
        id,
        routes: [request.route],
        entity: selected?.entity ?? '',
        operation: selected?.operation ?? '',
        ...(selected && selected.status === 'toCreate' && selected.call && !planned.has(id) ? { derived: true } : {}),
      });
    }
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

/** The ids of the usecase rows the plan (backend or effort) lists. */
function plannedUsecaseIds(artifacts: D1InputArtifacts): Set<string> {
  const ids = new Set<string>();
  for (const doc of [artifacts.backend, artifacts.effort]) {
    if (!isRecord(doc) || !Array.isArray(doc.usecases)) continue;
    for (const row of doc.usecases) if (isRecord(row) && typeof row.usecaseId === 'string' && row.usecaseId) ids.add(row.usecaseId);
  }
  return ids;
}

function usecaseRemovedIds(artifacts: D1InputArtifacts): Set<string> {
  const ids = new Set<string>();
  for (const doc of [artifacts.backend, artifacts.effort]) {
    if (!isRecord(doc) || !Array.isArray(doc.removed)) continue;
    for (const row of doc.removed) {
      if (!isRecord(row) || row.kind !== 'usecase') continue;
      if (typeof row.id === 'string' && row.id) ids.add(row.id);
    }
  }
  return ids;
}

function withoutUsecaseRemoved(artifacts: D1InputArtifacts): D1InputArtifacts {
  return {
    ...artifacts,
    backend: stripUsecaseRemoved(artifacts.backend),
    effort: stripUsecaseRemoved(artifacts.effort),
  };
}

function stripUsecaseRemoved(doc: unknown): unknown {
  if (!isRecord(doc) || !Array.isArray(doc.removed)) return doc;
  return {
    ...doc,
    removed: doc.removed.filter(row => !isRecord(row) || row.kind !== 'usecase'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
