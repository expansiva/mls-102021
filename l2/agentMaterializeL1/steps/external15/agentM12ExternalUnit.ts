/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/agentM12ExternalUnit.ts" enhancement="_blank"/>

import type { IAgentAsync } from '/_102027_/l2/aiAgentBase.js';
import { M12_EXTERNAL_UNIT_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelWorkerAgent, type M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { withFixedSettings, externalFacts, serveWithoutSecret } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';
import { fixedTypesOf, withFixedTypes } from '/_102021_/l2/agentMaterializeL1/steps/external15/fixedTypes.js';
import { removedTypesLines } from '/_102021_/l2/agentMaterializeL1/steps/external15/removedTypes.js';
import { M12_EXTERNAL_TOOL, M12_EXTERNAL_TOOL_DESCRIPTION, externalAnswerProblems, loadExternalContext } from '/_102021_/l2/agentMaterializeL1/steps/external15/context.js';

export const EXTERNAL_SPEC: M12ModelLayerSpec = {
  layer: 'external',
  workerAgentName: M12_EXTERNAL_UNIT_AGENT_NAME,
  folder: 'steps/external15',
  toolName: M12_EXTERNAL_TOOL,
  toolDescription: M12_EXTERNAL_TOOL_DESCRIPTION,
  context: loadExternalContext,
  // A serve with no secret in the L4 is the L4's to fix: no repair of the model can (d1_213).
  preflight: async (_ctx, unit) => {
    const detail = serveWithoutSecret(externalFacts(unit.definition.data));
    return detail ? { code: 'EXTERNAL_SERVE_WITHOUT_SECRET', detail } : null;
  },
  // What the L4 says of each setting is copied by code, not retyped by the model (d1_211).
  // The types the file already has are copied by code too (d1_257), so a file that imports them keeps compiling.
  normalize: async (ctx, unit, code) => {
    const facts = externalFacts(unit.definition.data);
    return withFixedTypes(withFixedSettings(code, facts), fixedTypesOf(await ctx.read(unit.outputRef), facts));
  },
  // A type of an operation that left the L4 is not kept: the trace says who in the module imports it (d1_257).
  prepare: removedTypesLines,
  gate: externalAnswerProblems,
};

export function createAgent(): IAgentAsync {
  return modelWorkerAgent('Write the declaration of one system outside the app from the L4 text of the system', EXTERNAL_SPEC);
}
