/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_USECASE_UNIT_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelWorkerAgent, type M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { M12_USECASE_TOOL, M12_USECASE_TOOL_DESCRIPTION, loadUsecaseContext, usecaseAnswerProblems } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

export const USECASE_SPEC: M12ModelLayerSpec = {
  layer: 'usecases',
  workerAgentName: M12_USECASE_UNIT_AGENT_NAME,
  folder: 'steps/usecases40',
  toolName: M12_USECASE_TOOL,
  toolDescription: M12_USECASE_TOOL_DESCRIPTION,
  context: async (ctx, unit, repair) => (await loadUsecaseContext(ctx, unit, repair)).human,
  gate: usecaseAnswerProblems,
};

export function createAgent(): IAgentAsync {
  return modelWorkerAgent('Write one usecase from its def, rule texts and the recipe draft', USECASE_SPEC);
}
