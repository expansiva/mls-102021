/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/agentM12AdapterUnit.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_ADAPTER_UNIT_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelWorkerAgent, type M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { M12_ADAPTER_TOOL, M12_ADAPTER_TOOL_DESCRIPTION, adapterAnswerProblems, loadAdapterContext } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/context.js';

export const ADAPTER_SPEC: M12ModelLayerSpec = {
  layer: 'adapter',
  workerAgentName: M12_ADAPTER_UNIT_AGENT_NAME,
  folder: 'steps/adapter17',
  toolName: M12_ADAPTER_TOOL,
  toolDescription: M12_ADAPTER_TOOL_DESCRIPTION,
  context: loadAdapterContext,
  gate: adapterAnswerProblems,
};

export function createAgent(): IAgentAsync {
  return modelWorkerAgent('Write the adapter of one system outside the app from its declaration', ADAPTER_SPEC);
}
