/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Worker.ts" enhancement="_blank"/>

// What the LLM workers have in common: their compact args, the repair budget and the rule that a worker never
// returns `failed` (the unit status file records the failure; the run goes on).

import { M12_REPAIR_BUDGET, clip, tokenOk, unitIdOk, type M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12WorkerStep, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { writeUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';

export interface M12WorkerArgs {
  project: number;
  module: string;
  /** Usecase workers: the def shortName. Test workers: the page id. */
  unitId: string;
  attempt: number;
  force: boolean;
}

export function parseM12WorkerArgs(raw: string, currentProject: number): M12WorkerArgs {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('M12_WORKER_ARGS_JSON'); }
  const args = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Partial<M12WorkerArgs>;
  if (args.project !== currentProject || !tokenOk(String(args.module ?? '')) || !unitIdOk(String(args.unitId ?? ''))) throw new Error('M12_WORKER_ARGS_IDENTITY');
  if (!Number.isSafeInteger(args.attempt) || (args.attempt as number) < 1 || (args.attempt as number) > 1 + M12_REPAIR_BUDGET) throw new Error('M12_WORKER_ARGS_ATTEMPT');
  return { project: args.project as number, module: String(args.module), unitId: String(args.unitId), attempt: args.attempt as number, force: args.force === true };
}

/** A worker that refuses its own args still leaves a trace in the unit status when the unit can be told. */
export async function recordM12ArgsRefusal(raw: string, layer: M12Layer, diagnostic: string): Promise<void> {
  try {
    const args = JSON.parse(raw) as Partial<M12WorkerArgs>;
    if (typeof args.project !== 'number' || typeof args.module !== 'string' || typeof args.unitId !== 'string' || !unitIdOk(args.unitId)) return;
    await writeUnitStatus(args.project, args.module, {
      layer, unitId: args.unitId, defRef: '', status: 'failed', code: 'ARGS_REFUSED', attempt: Number(args.attempt) || 1,
      diagnostic: clip(`M12_ARGS_REFUSED: ${diagnostic}`), inputHash: '', outputs: {},
    });
  } catch { /* nothing identifiable to record */ }
}

export function workerPlanId(layer: M12Layer, args: M12WorkerArgs): string {
  const phase = layer === 'usecases' ? 'usecases40' : layer === 'requests' ? 'requests50' : 'tests60';
  return `${phase}-${args.module}-${args.unitId}-${args.attempt}`;
}

export function workerTitle(layer: M12Layer, args: M12WorkerArgs): string {
  const what = layer === 'usecases' ? `Usecase ${args.unitId}` : layer === 'requests' ? `Request service ${args.unitId}` : `Monitor tests ${args.unitId}`;
  return args.attempt > 1 ? `${what} (repair ${args.attempt - 1})` : what;
}

export function workerStep(agentName: string, layer: M12Layer, args: M12WorkerArgs): mls.msg.AIAgentStep {
  return m12WorkerStep(agentName, workerTitle(layer, args), workerPlanId(layer, args), args);
}

export function canRepair(args: M12WorkerArgs): boolean {
  return args.attempt <= M12_REPAIR_BUDGET;
}

/**
 * Either the next attempt (added under the phase step BEFORE this worker completes, so the phase stays open)
 * or the final completion with an M12_FAILED trace.
 */
export function repairOrGiveUp(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  agentName: string,
  layer: M12Layer,
  args: M12WorkerArgs,
  diagnostic: string,
): mls.msg.AgentIntent[] {
  if (canRepair(args)) {
    const next = workerStep(agentName, layer, { ...args, attempt: args.attempt + 1 });
    return [
      addM12Step(context, parentStep.stepId, next),
      updateM12Status(context, parentStep, step, hookSequential, 'completed', clip(`Repair scheduled: ${diagnostic}`), 'input'),
    ];
  }
  return [updateM12Status(context, parentStep, step, hookSequential, 'completed', clip(`M12_FAILED: ${diagnostic}`), 'input')];
}
