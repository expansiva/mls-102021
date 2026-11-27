/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_TESTS_AGENT_NAME, M12_TESTS_PAGE_AGENT_NAME, clip, errorText, parseM12StepInvocation } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { hashParts, readOptional, readUnitStatus, reuseDecision, sha256Text, storExists, writeDraft, writeUnitStatus, type M12UnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { M12_RECIPE_VERSION, layerUnits } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { fileRef, pageTestsFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { testsGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { stage2 } from '/_102021_/l2/agentMaterializeL1/helpers/m12Stage2.js';
import { readPageTestCases } from '/_102021_/l2/agentMaterializeL1/steps/tests60/render.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { workerStep } from '/_102021_/l2/agentMaterializeL1/helpers/m12Worker.js';
import { SERVE_ROUTE_NO_PAGE_TEST, loadTestsContext } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';

export function createAgent(): IAgentAsync {
  return { agentName: M12_TESTS_AGENT_NAME, agentProject: 102021, agentFolder: 'agentMaterializeL1/steps/tests60', agentDescription: 'Dispatch one monitor-cases worker per page whose controller is ready', visibility: 'private', beforePromptStep };
}

/** The input hash of a page's cases: the recipe, everything the prompt reads, and the controller output. */
export async function testsInputHash(inputs: readonly string[], controllerOutputs: Record<string, string>): Promise<string> {
  return hashParts([M12_RECIPE_VERSION, ...inputs, JSON.stringify(controllerOutputs)]);
}

/**
 * d1_347 s6 (the essential of d1_334): the two halves of the input hash of a page's cases. `own` is the recipe and everything the prompt reads; `deps` is the outputs of the controller. `hash` is the same
 * `inputHash` as before. A receipt with both halves tells a controller that only moved (its dependency) from a page whose prompt changed.
 */
export async function testsInputParts(inputs: readonly string[], controllerOutputs: Record<string, string>): Promise<{ hash: string; own: string; deps: string }> {
  return {
    hash: await testsInputHash(inputs, controllerOutputs),
    own: await hashParts([M12_RECIPE_VERSION, ...inputs]),
    deps: await hashParts([JSON.stringify(controllerOutputs)]),
  };
}

/**
 * What a run does with a page whose test file exists and whose run is `force` without `scratch` (a `target`): with the key of stage 2 on, a receipt that has both halves, whose `own` is still the one of now and
 * whose file is the one the receipt wrote (not edited) keeps the cases ('keep': the gate runs on them with the routes and entities of now; no problem = kept, a problem = repair with these cases). Anything else, or
 * the key off, is the run as before: from scratch.
 */
export async function testsKeepPlan(input: { on: boolean; scratch: boolean; prior: M12UnitStatus | null; own: string; file: string; fileText: string | null }): Promise<'keep' | 'scratch'> {
  if (!input.on || input.scratch || !input.prior || input.fileText === null) return 'scratch';
  if (input.prior.status !== 'done' && input.prior.status !== 'reused') return 'scratch';
  if (!input.prior.inputParts || input.prior.inputParts.own !== input.own) return 'scratch';
  return input.prior.outputs?.[input.file] === await sha256Text(input.fileText) ? 'keep' : 'scratch';
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
      // The cases call the routes: the controller and the request service of the page both have a .ts. A receipt does not decide.
      const service = ctx.units.find(unit => unit.layer === 'requests' && String(unit.definition.data.pageId ?? unit.unitId) === pageId);
      const controllerReady = storExists(controller.output);
      const serviceReady = !!service && storExists(service.output);
      if (!controllerReady || !serviceReady) {
        const which = !controllerReady ? `controller ${controller.defRef} .ts is missing` : `request service ${service?.defRef ?? `of ${pageId}`} .ts is missing`;
        const diagnostic = `BLOCKED_BY: ${which}.`;
        await writeUnitStatus(run.project, run.module, { ...base, status: 'blocked', code: 'BLOCKED_BY', diagnostic, inputHash: '', outputs: {} });
        lines.push(`${pageId}: blocked, ${which}`);
        continue;
      }
      try {
        const data = await loadTestsContext(ctx, controller);
        const ready = await readUnitStatus(run.project, run.module, 'controllers', controller.unitId);
        const parts = await testsInputParts(data.inputs, ready?.outputs ?? {});
        const inputHash = parts.hash;
        const prior = await readUnitStatus(run.project, run.module, 'tests', pageId);
        const decision = await reuseDecision([pageTestsFile(run.project, run.module, pageId)], run.force);
        if (stage2.on && run.force && decision.kind !== 'reuse') {
          const file = pageTestsFile(run.project, run.module, pageId);
          const fileText = await readOptional(file);
          if (await testsKeepPlan({ on: true, scratch: run.scratch === true, prior, own: parts.own, file: fileRef(file), fileText }) === 'keep') {
            const kept = fileText === null ? null : readPageTestCases(fileText);
            if (kept) {
              const problems = testsGate(kept, { routes: data.routes, entities: data.entities });
              if (!problems.length) {
                // Only the dependency moved and the cases still fit the routes of now: they stay as they are.
                await writeUnitStatus(run.project, run.module, { ...base, status: 'reused', code: '', diagnostic: '', inputHash, inputParts: { own: parts.own, deps: parts.deps }, outputs: prior?.outputs ?? {} });
                lines.push(`${pageId}: kept`);
                continue;
              }
              // The cases are the ones of the file; the repair gets them and the problems of now, through the path the repair already has (attempt 2 reads the draft and the diagnostic).
              const diagnostic = problems.map(problem => clip(problem, 600)).slice(0, 20).join('\n');
              await writeDraft(run.project, run.module, 'tests', pageId, 'cases', JSON.stringify(kept, null, 2));
              await writeUnitStatus(run.project, run.module, { ...base, status: 'failed', code: 'GATE_FAILED', attempt: 1, diagnostic, inputHash, outputs: {} });
              workers.push(addM12Step(context, step.stepId, workerStep(M12_TESTS_PAGE_AGENT_NAME, 'tests', { project: run.project, module: run.module, unitId: pageId, attempt: 2, force: run.force })));
              lines.push(`${pageId}: repair, ${problems.length} problem(s) of the kept cases`);
              continue;
            }
          }
        }
        if (decision.kind === 'reuse') {
          await writeUnitStatus(run.project, run.module, { ...base, status: 'reused', code: '', diagnostic: '', inputHash, outputs: prior?.outputs ?? {} });
          lines.push(`${pageId}: reused`);
          continue;
        }
        workers.push(addM12Step(context, step.stepId, workerStep(M12_TESTS_PAGE_AGENT_NAME, 'tests', { project: run.project, module: run.module, unitId: pageId, attempt: 1, force: run.force })));
        lines.push(`${pageId}: dispatched`);
      } catch (error) {
        const diagnostic = clip(errorText(error));
        const serveSkip = diagnostic.startsWith(SERVE_ROUTE_NO_PAGE_TEST);
        await writeUnitStatus(run.project, run.module, {
          ...base,
          status: serveSkip ? 'skipped' : 'failed',
          code: serveSkip ? SERVE_ROUTE_NO_PAGE_TEST : 'CONTEXT_FAILED',
          diagnostic,
          inputHash: '',
          outputs: {},
        });
        lines.push(`${pageId}: ${serveSkip ? 'skipped' : 'failed'}, ${diagnostic}`);
      }
    }
    const trace = clip(lines.join('\n') || 'No controller selected.', 3000);
    if (!workers.length) return [updateM12Status(context, parentStep, step, hookSequential, 'completed', trace)];
    return [...workers, updateM12Status(context, parentStep, step, hookSequential, 'in_progress', trace)];
  } catch (error) {
    return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
  }
}
