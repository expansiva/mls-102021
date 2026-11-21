/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/heldReport.ts" enhancement="_blank"/>

// d1_260: when a step before finalize80 holds the run (resolve25 with the final input not releasing the consumer phases), finalize80 never runs: the
// waiting siblings are closed. The report on disk would then stay the one of the last complete run and say `complete`. The step that holds writes the
// report the same way finalize80 does for an earlier hold: the findings of `input.json`, `outcome: held`, and the reason as `blocking`.

import type { D1PipelineState } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import type { D1FinalizeRequest } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { buildD1Finalize } from '/_102021_/l2/agentDefsL1/steps/finalize80/gate.js';
import { assembleD1Finalize, writeD1Report } from '/_102021_/l2/agentDefsL1/steps/finalize80/io.js';
import { loadFacadePlatformKeys } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

/**
 * Writes `report.json` for the run held at `pipeline.awaitingStep`. `reason` is the step's own text (codes and routes) for a hold the checkpoint does not
 * carry (an `input20` already approved stays approved when a later run holds): it becomes `blocking` when the checkpoint has none. `snapshot` is the
 * input the holding step derived when `input.json` is not it yet.
 * Returns the `blocking` text, or '' when the report could not be assembled.
 */
export async function recordHeldReport(
  project: number,
  moduleName: string,
  pipeline: D1PipelineState,
  reason = '',
  snapshot?: D1FinalizeRequest['snapshot'],
): Promise<string> {
  // The platform keys matter only when a def with an MDM binding is read. A host that does not have them still builds the report of a hold, and a
  // build that needs them fails by itself with its own message: the hold is never lost to the keys.
  await loadFacadePlatformKeys().catch((error: unknown) => (/platform keys file was not read/u.test(String((error as Error)?.message ?? error)) ? undefined : Promise.reject(error)));
  const assembled = await assembleD1Finalize(project, moduleName);
  if ('refusal' in assembled) return '';
  // An input20 that holds has not written `input.json` (resolve25 does): its findings are the ones of the snapshot it just derived.
  const built = buildD1Finalize({ ...assembled.request, pipeline, ...(snapshot ? { snapshot } : {}) });
  const report = reason && !built.blocking ? { ...built, blocking: reason } : built;
  await writeD1Report(project, moduleName, report);
  return report.blocking;
}
