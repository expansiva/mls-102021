/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/finalize/agentCbFinalSummary.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal step: concise run summary and task completion. Deterministic (no LLM) — handles both the
// no-work path (scan found nothing) and the normal path (owners marked done).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, isRecord, parseMaybeJson, saveBackendWorkspaceConfig } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbFinalSummary', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/finalize', agentDescription: 'Terminal run summary + task completion', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const args = isRecord(parseMaybeJson(step.prompt)) ? (parseMaybeJson(step.prompt) as Record<string, unknown>) : {};
  let configMsg = '';
  try {
    configMsg = await saveBackendWorkspaceConfig();
  } catch (error) {
    configMsg = `l5/config.json backend update failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  const summary = args.noWork
    ? `agentChangeBackend: nothing to create (no todoBackend status = toCreate). ${configMsg}`
    : `agentChangeBackend: run complete. owners done = ${args.ownersDone ?? 0}. ${configMsg}`;
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary)];
}
