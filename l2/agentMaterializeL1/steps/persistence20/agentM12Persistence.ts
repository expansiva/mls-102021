/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/persistence20/agentM12Persistence.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_PERSISTENCE_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { deterministicPhaseAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';

export function createAgent(): IAgentAsync {
  return deterministicPhaseAgent(M12_PERSISTENCE_AGENT_NAME, 'steps/persistence20', 'Materialize tables, repository adapters, registration, seeds and outbound events, without an LLM', 'persistence');
}
