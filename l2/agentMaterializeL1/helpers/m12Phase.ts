/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Phase.ts" enhancement="_blank"/>

// The deterministic phases (domain10, persistence20, requests50, controllers30) are the same loop over a
// different layer: load the module, take the selected units of the layer, dependencies first, one at a time.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_BUILD, clip, errorText, parseM12StepInvocation, type M12Layer, type M12RunArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { readAppEnv } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { releaseCompileModels } from '/_102021_/l2/agentMaterializeL1/helpers/m12Compile.js';
import { createContext, layerUnits, materializeUnit, type M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, orderWithinLayer, selectUnits, storEntries, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

export interface M12Loaded {
  ctx: M12Context;
  selected: M12Unit[];
  problems: Array<{ defRef: string; code: string; detail: string }>;
}

/** The module as this run sees it: every unit (dependencies) and the selected ones. */
export async function loadRun(run: M12RunArgs): Promise<M12Loaded> {
  const loaded = await loadModuleUnits(run.project, run.module, storEntries());
  const appEnv = await readAppEnv(run.project);
  const ctx = createContext(run, loaded.units, appEnv);
  return { ctx, selected: selectUnits(run.project, run.module, loaded.units, run), problems: loaded.problems };
}

/** Every selected unit of `layer`, sequentially (one Studio compile at a time). Lines for the trace. */
export async function runDeterministicLayer(run: M12RunArgs, layer: M12Layer): Promise<string[]> {
  const { ctx, selected } = await loadRun(run);
  const units = orderWithinLayer(layerUnits(selected, layer));
  const lines: string[] = [];
  try {
    for (const unit of units) lines.push((await materializeUnit(ctx, unit)).line);
  } finally {
    releaseCompileModels();
  }
  return lines.length ? lines : [`No ${layer} unit selected.`];
}

/** A phase agent whose whole job is `runDeterministicLayer`: no LLM, completes when the layer is done. */
export function deterministicPhaseAgent(agentName: string, folder: string, description: string, layer: M12Layer): IAgentAsync {
  async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
    const parsed = parseM12StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
    if (parsed.kind === 'refusal') return [updateM12Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
    try {
      const lines = await runDeterministicLayer(parsed, layer);
      return [updateM12Status(context, parentStep, step, hookSequential, 'completed', clip([`build ${M12_BUILD}`, ...lines].join('\n'), 3000))];
    } catch (error) {
      return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
    }
  }
  return { agentName, agentProject: 102021, agentFolder: `agentMaterializeL1/${folder}`, agentDescription: description, visibility: 'private', beforePromptStep };
}
