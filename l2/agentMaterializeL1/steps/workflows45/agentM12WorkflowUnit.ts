/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12WorkflowUnit.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_WORKFLOW_UNIT_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelWorkerAgent, type M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { M12_WORKFLOW_TOOL, M12_WORKFLOW_TOOL_DESCRIPTION, loadWorkflowContext, prepareWorkflows, workflowAnswerProblems } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

export const WORKFLOW_SPEC: M12ModelLayerSpec = {
  layer: 'workflows',
  workerAgentName: M12_WORKFLOW_UNIT_AGENT_NAME,
  folder: 'steps/workflows45',
  toolName: M12_WORKFLOW_TOOL,
  toolDescription: M12_WORKFLOW_TOOL_DESCRIPTION,
  prepare: ctx => prepareWorkflows(ctx),
  context: async (ctx, unit, repair) => (await loadWorkflowContext(ctx, unit, repair)).human,
  gate: workflowAnswerProblems,
};

export function createAgent(): IAgentAsync {
  return modelWorkerAgent('Write the workflow service of one process from the l4 prose of its functions', WORKFLOW_SPEC);
}
