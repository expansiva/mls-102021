/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/domain10/agentM12Domain.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_DOMAIN_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { deterministicPhaseAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';

export function createAgent(): IAgentAsync {
  return deterministicPhaseAgent(M12_DOMAIN_AGENT_NAME, 'steps/domain10', 'Materialize entities, value objects, ports, access scope and authority map, without an LLM', 'domain');
}
