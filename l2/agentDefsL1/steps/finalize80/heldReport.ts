/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/heldReport.ts" enhancement="_blank"/>

// d1_260: when a step before finalize80 holds the run (resolve25 with the final input not releasing the consumer phases), finalize80 never runs: the
// waiting siblings are closed. The report on disk would then stay the one of the last complete run and say `complete`. The step that holds writes the
// report the same way finalize80 does for an earlier hold: the findings of `input.json`, `outcome: held`, and the reason as `blocking`.

import type { D1PipelineState } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { buildD1Finalize } from '/_102021_/l2/agentDefsL1/steps/finalize80/gate.js';
import { assembleD1Finalize, writeD1Report } from '/_102021_/l2/agentDefsL1/steps/finalize80/io.js';
import { loadFacadePlatformKeys } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

/** Writes `report.json` for the run held at `pipeline.awaitingStep`. Returns the `blocking` text, or '' when the report could not be assembled. */
export async function recordHeldReport(project: number, moduleName: string, pipeline: D1PipelineState): Promise<string> {
  await loadFacadePlatformKeys();
  const assembled = await assembleD1Finalize(project, moduleName);
  if ('refusal' in assembled) return '';
  const report = buildD1Finalize({ ...assembled.request, pipeline });
  await writeD1Report(project, moduleName, report);
  return report.blocking;
}
