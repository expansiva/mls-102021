/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12Workflows.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_WORKFLOWS_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelDispatcherAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { WORKFLOW_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12WorkflowUnit.js';

/** The Task adapter of the module first, then one model worker per process (materializadorL1.md §11). */
export function createAgent(): IAgentAsync {
  return modelDispatcherAgent(M12_WORKFLOWS_AGENT_NAME, 'Dispatch one model worker per workflow process', WORKFLOW_SPEC);
}
