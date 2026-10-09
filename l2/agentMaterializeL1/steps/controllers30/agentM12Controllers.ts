/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/controllers30/agentM12Controllers.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_CONTROLLERS_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { deterministicPhaseAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';

export function createAgent(): IAgentAsync {
  return deterministicPhaseAgent(M12_CONTROLLERS_AGENT_NAME, 'steps/controllers30', 'Materialize the HTTP controller of every page, without an LLM', 'controllers');
}
