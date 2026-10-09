/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/agentM12RequestService.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_REQUEST_SERVICE_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelWorkerAgent, type M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { M12_REQUEST_TOOL, M12_REQUEST_TOOL_DESCRIPTION, loadRequestContext, normalizeRequestsTyping, requestAnswerProblems } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

export const REQUEST_SPEC: M12ModelLayerSpec = {
  layer: 'requests',
  workerAgentName: M12_REQUEST_SERVICE_AGENT_NAME,
  folder: 'steps/requests50',
  toolName: M12_REQUEST_TOOL,
  toolDescription: M12_REQUEST_TOOL_DESCRIPTION,
  context: async (ctx, unit, repair) => (await loadRequestContext(ctx, unit, repair)).human,
  gate: requestAnswerProblems,
  normalize: async (ctx, unit, code) => {
    const data = await loadRequestContext(ctx, unit);
    return normalizeRequestsTyping(code, data.contractsInterface, data.contractSpecifier);
  },
};

export function createAgent(): IAgentAsync {
  return modelWorkerAgent('Write the request service of one page from its contract JSDoc and the module usecases', REQUEST_SPEC);
}
