/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/keptUsecases.ts" enhancement="_blank"/>

import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import type { D1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

/** A `toRemove` usecase a contract route still calls. `routes` are the request routes. */
export interface KeptUsecase {
  id: string;
  routes: string[];
}

/**
 * Same link `input20` uses: drop usecase rows from `removed`, then a removed id that shows up in
 * `selection.requests[].uses` is still required by the contract.
 */
export function usedRemovedUsecases(
  identity: { project: number; moduleName: string },
  artifacts: D1InputArtifacts,
): KeptUsecase[] {
  const removedIds = usecaseRemovedIds(artifacts);
  const snapshot = buildD1InputSnapshot(identity, withoutUsecaseRemoved(artifacts), null);
  const routesById = new Map<string, string[]>();
  for (const request of snapshot.selection.requests) {
    for (const id of request.uses) {
      if (!removedIds.has(id)) continue;
      const routes = routesById.get(id) ?? [];
      if (!routes.includes(request.route)) routes.push(request.route);
      routesById.set(id, routes);
    }
  }
  return [...routesById.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([id, routes]) => ({ id, routes }));
}

export function keptLines(kept: readonly KeptUsecase[]): string[] {
  return kept.map(item => `kept for creation: usecase ${item.id} (toRemove, used by ${item.routes.length} routes: ${item.routes.join(', ')})`);
}

/** `backend` and `effort` parsed as objects. Anything else cannot host the oracle. */
export function plansAreReadable(artifacts: D1InputArtifacts): boolean {
  return isRecord(artifacts.backend) && isRecord(artifacts.effort);
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
