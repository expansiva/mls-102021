/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12Usecases.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_USECASES_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelDispatcherAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { USECASE_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';

/** Every usecase goes to one model worker (a type the recipe derives only sometimes always goes to the model). */
export function createAgent(): IAgentAsync {
  return modelDispatcherAgent(M12_USECASES_AGENT_NAME, 'Dispatch one model worker per usecase', USECASE_SPEC);
}
