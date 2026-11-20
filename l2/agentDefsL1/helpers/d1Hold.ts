/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Hold.ts" enhancement="_blank"/>

// d1_248: a step that refuses leaves the checkpoint saying so. Without it the refusal lives only in the task and `pipeline.json` keeps the answer of
// an earlier round (`complete`, every step approved): the 138 `/run` failed in controllers60 and the files said it had passed.

import type { D1PipelineState, D1StepId } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { pipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';

/** The checkpoint with `step` failed and the run waiting on it. The same state twice is the same object. */
export function pipelineHeld(pipeline: D1PipelineState, step: D1StepId, artifact: string, reason: string, now: string): D1PipelineState {
  const current = pipeline.steps[step];
  if (
    pipeline.status === 'awaitingStep'
    && pipeline.awaitingStep === step
    && current?.status === 'failed'
    && (current.error || '') === reason
    && (current.artifactPaths || []).length === 1
    && current.artifactPaths?.[0] === artifact
  ) return pipeline;
  return {
    ...pipeline,
    status: 'awaitingStep',
    awaitingStep: step,
    steps: { ...pipeline.steps, [step]: { status: 'failed', updatedAt: now, artifactPaths: [artifact], ...(reason ? { error: reason.slice(0, 600) } : {}) } },
    updatedAt: now,
  };
}

/** Writes the held checkpoint when it changes. A state the schema refuses is not written: the refusal still stops the step. */
export async function holdPipeline(pipeline: D1PipelineState, step: D1StepId, artifact: string, reason: string): Promise<void> {
  const held = pipelineHeld(pipeline, step, artifact, reason, new Date().toISOString());
  if (JSON.stringify(held) === JSON.stringify(pipeline)) return;
  if (pipelineIssues(held).length > 0) return;
  await writeJson(pipelineFile(pipeline.project, pipeline.moduleName), held);
}
