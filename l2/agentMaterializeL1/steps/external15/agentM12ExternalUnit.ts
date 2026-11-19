/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/agentM12ExternalUnit.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_EXTERNAL_UNIT_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelWorkerAgent, type M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { withFixedSettings, externalFacts } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';
import { M12_EXTERNAL_TOOL, M12_EXTERNAL_TOOL_DESCRIPTION, externalAnswerProblems, loadExternalContext } from '/_102021_/l2/agentMaterializeL1/steps/external15/context.js';

export const EXTERNAL_SPEC: M12ModelLayerSpec = {
  layer: 'external',
  workerAgentName: M12_EXTERNAL_UNIT_AGENT_NAME,
  folder: 'steps/external15',
  toolName: M12_EXTERNAL_TOOL,
  toolDescription: M12_EXTERNAL_TOOL_DESCRIPTION,
  context: loadExternalContext,
  // What the L4 says of each setting is copied by code, not retyped by the model (d1_211).
  normalize: async (_ctx, unit, code) => withFixedSettings(code, externalFacts(unit.definition.data)),
  gate: externalAnswerProblems,
};

export function createAgent(): IAgentAsync {
  return modelWorkerAgent('Write the declaration of one system outside the app from the L4 text of the system', EXTERNAL_SPEC);
}
