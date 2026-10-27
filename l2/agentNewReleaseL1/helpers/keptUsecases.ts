/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/keptUsecases.ts" enhancement="_blank"/>

import type { D1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { usedRemovedUsecases } from '/_102021_/l2/helpers/planPostprocess/usedRemoved.js';

export { usedRemovedUsecases };

/** A `toRemove` usecase a contract route still calls. `routes` are the request routes. */
export interface KeptUsecase {
  id: string;
  routes: string[];
}

/** Defect notice: the postprocess left a `toRemove` usecase that a route still calls. */
export function keptLines(kept: readonly KeptUsecase[]): string[] {
  return kept.map(item => {
    const first = item.routes[0] ?? '';
    const listed = item.routes.length > 1 ? `${first}…` : first;
    return `postprocess missed: usecase ${item.id} (toRemove, used by ${item.routes.length} routes: ${listed})`;
  });
}

/** `backend` and `effort` parsed as objects. Anything else cannot host the oracle. */
export function plansAreReadable(artifacts: D1InputArtifacts): boolean {
  return isRecord(artifacts.backend) && isRecord(artifacts.effort);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
