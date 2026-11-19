/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/agentM12Adapter.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_ADAPTER_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelDispatcherAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { ADAPTER_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/agentM12AdapterUnit.js';

/** One model worker per system the module declares: the adapter the platform runs (d1_209). */
export function createAgent(): IAgentAsync {
  return modelDispatcherAgent(M12_ADAPTER_AGENT_NAME, 'Dispatch one model worker per declared system adapter', ADAPTER_SPEC);
}
