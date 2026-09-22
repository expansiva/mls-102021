/// <mls fileReference="_102021_/l2/agentDefsL1/steps/entry10/gate.ts" enhancement="_blank"/>

import {
  checkpointConflict,
  checkpointNotIntact,
  createEntryPipeline,
  isIntactCheckpoint,
  resumeMissing,
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { parsePipelineDocument, pipelineIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';

export type EntryDecision =
  | { kind: 'record'; state: D1PipelineState }
  | { kind: 'keep' }
  | { kind: 'refusal'; refusal: string };

/**
 * Pure entry decision. `keep` writes nothing. A draft on disk is not an input
 * and cannot turn a later step into an approved one.
 */
export function decideEntry(
  command: 'run' | 'resume',
  project: number,
  moduleName: string,
  raw: string | null,
  now: Date,
): EntryDecision {
  const text = raw && raw.trim() ? raw : null;
  if (!text) {
    if (command === 'resume') return { kind: 'refusal', refusal: resumeMissing(moduleName, project) };
    const state = createEntryPipeline(project, moduleName, now);
    const issues = pipelineIssues(state);
    if (issues.length > 0) return { kind: 'refusal', refusal: `Checkpoint schema refused: ${issues[0]} Nothing was written.` };
    return { kind: 'record', state };
  }
  const parsed = parsePipelineDocument(text);
  if (parsed && isIntactCheckpoint(parsed, project, moduleName)) return { kind: 'keep' };
  if (command === 'resume') return { kind: 'refusal', refusal: checkpointNotIntact(moduleName, project) };
  return { kind: 'refusal', refusal: checkpointConflict(moduleName, project) };
}
