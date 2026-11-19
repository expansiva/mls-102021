/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/agentM12External.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_EXTERNAL_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelDispatcherAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { EXTERNAL_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/external15/agentM12ExternalUnit.js';

/** One model worker per system the module declares: the declaration the platform reads (d1_208). */
export function createAgent(): IAgentAsync {
  return modelDispatcherAgent(M12_EXTERNAL_AGENT_NAME, 'Dispatch one model worker per declared system', EXTERNAL_SPEC);
}
