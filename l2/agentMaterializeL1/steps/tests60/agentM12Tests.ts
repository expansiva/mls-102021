/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_TESTS_AGENT_NAME, M12_TESTS_PAGE_AGENT_NAME, clip, errorText, parseM12StepInvocation } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { hashParts, readUnitStatus, reuseDecision, usable, writeUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { M12_RECIPE_VERSION, layerUnits } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { pageTestsFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { workerStep } from '/_102021_/l2/agentMaterializeL1/helpers/m12Worker.js';
import { loadTestsContext } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';

export function createAgent(): IAgentAsync {
  return { agentName: M12_TESTS_AGENT_NAME, agentProject: 102021, agentFolder: 'agentMaterializeL1/steps/tests60', agentDescription: 'Dispatch one monitor-cases worker per page whose controller is ready', visibility: 'private', beforePromptStep };
}

/** The input hash of a page's cases: the recipe, everything the prompt reads, and the controller output. */
export async function testsInputHash(inputs: readonly string[], controllerOutputs: Record<string, string>): Promise<string> {
  return hashParts([M12_RECIPE_VERSION, ...inputs, JSON.stringify(controllerOutputs)]);
}

/**
 * Switch of the phase. Off (false), it dispatches no agentM12TestsPage worker and makes no model request; the unit
 * statuses and the case files of earlier runs stay as they are. Turned off on 09/10 for a measurement, back on.
 */
export const M12_TESTS_ENABLED = true;

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!M12_TESTS_ENABLED) return [updateM12Status(context, parentStep, step, hookSequential, 'completed', 'tests60 disabled (M12_TESTS_ENABLED = false): no monitor cases were requested.')];
  const run = parseM12StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (run.kind === 'refusal') return [updateM12Status(context, parentStep, step, hookSequential, 'failed', run.diagnostic)];
  try {
    const { ctx, selected } = await loadRun(run);
    const lines: string[] = [];
    const workers: mls.msg.AgentIntent[] = [];
    for (const controller of layerUnits(selected, 'controllers')) {
      const pageId = String(controller.definition.data.pageId ?? controller.unitId);
      const base = { layer: 'tests' as const, unitId: pageId, defRef: '', attempt: 0 };
      const ready = await readUnitStatus(run.project, run.module, 'controllers', controller.unitId);
      // The cases call the routes: the controller and the request service of the page are both in place.
      const service = ctx.units.find(unit => unit.layer === 'requests' && String(unit.definition.data.pageId ?? unit.unitId) === pageId);
      const serviceStatus = service ? await readUnitStatus(run.project, run.module, 'requests', service.unitId) : null;
      if (!usable(ready) || !usable(serviceStatus)) {
        const which = !usable(ready) ? `controller ${controller.defRef} is ${ready?.status ?? 'not materialized'}${ready?.code ? ` (${ready.code})` : ''}` : `request service ${service?.defRef ?? `of ${pageId}`} is ${serviceStatus?.status ?? 'not materialized'}${serviceStatus?.code ? ` (${serviceStatus.code})` : ''}`;
        const diagnostic = `BLOCKED_BY: ${which}.`;
        await writeUnitStatus(run.project, run.module, { ...base, status: 'blocked', code: 'BLOCKED_BY', diagnostic, inputHash: '', outputs: {} });
        lines.push(`${pageId}: blocked, ${which}`);
        continue;
      }
      try {
        const data = await loadTestsContext(ctx, controller);
        const inputHash = await testsInputHash(data.inputs, ready!.outputs);
        const prior = await readUnitStatus(run.project, run.module, 'tests', pageId);
        const decision = await reuseDecision(prior, inputHash, [pageTestsFile(run.project, run.module, pageId)], run.force);
        if (decision.kind === 'reuse') {
          await writeUnitStatus(run.project, run.module, { ...base, status: 'reused', code: '', diagnostic: '', inputHash, outputs: prior!.outputs });
          lines.push(`${pageId}: reused`);
          continue;
        }
        if (decision.kind === 'protect') {
          const diagnostic = `EDITED_LOCALLY: ${decision.path} was not written by this agent (use "force": true).`;
          await writeUnitStatus(run.project, run.module, { ...base, status: 'skipped', code: 'EDITED_LOCALLY', diagnostic, inputHash, outputs: prior?.outputs ?? {} });
          lines.push(`${pageId}: skipped, ${diagnostic}`);
          continue;
        }
        workers.push(addM12Step(context, step.stepId, workerStep(M12_TESTS_PAGE_AGENT_NAME, 'tests', { project: run.project, module: run.module, unitId: pageId, attempt: 1, force: run.force })));
        lines.push(`${pageId}: dispatched`);
      } catch (error) {
        const diagnostic = clip(errorText(error));
        await writeUnitStatus(run.project, run.module, { ...base, status: 'failed', code: 'CONTEXT_FAILED', diagnostic, inputHash: '', outputs: {} });
        lines.push(`${pageId}: failed, ${diagnostic}`);
      }
    }
    const trace = clip(lines.join('\n') || 'No controller selected.', 3000);
    if (!workers.length) return [updateM12Status(context, parentStep, step, hookSequential, 'completed', trace)];
    return [...workers, updateM12Status(context, parentStep, step, hookSequential, 'in_progress', trace)];
  } catch (error) {
    return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
  }
}
