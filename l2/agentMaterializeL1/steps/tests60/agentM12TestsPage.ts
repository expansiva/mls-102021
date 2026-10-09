/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/agentM12TestsPage.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_PROMPT_LIMIT, M12_TESTS_PAGE_AGENT_NAME, clip, errorText } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { m12PromptReady, m12ToolPayload, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { readDraft, readOptional, readUnitStatus, writeDraft, writeText, writeUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { testsGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { fileRef, pageTestsFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { parseM12WorkerArgs, recordM12ArgsRefusal, repairOrGiveUp, type M12WorkerArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Worker.js';
import { M12_TESTS_SCHEMA, M12_TESTS_TOOL, loadTestsContext } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';
import { normalizeTestCases, renderPageTests } from '/_102021_/l2/agentMaterializeL1/steps/tests60/render.js';
import { testsInputHash } from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.js';

export function createAgent(): IAgentAsync {
  return { agentName: M12_TESTS_PAGE_AGENT_NAME, agentProject: 102021, agentFolder: 'agentMaterializeL1/steps/tests60', agentDescription: 'Propose the monitor cases of one page backend', visibility: 'private', beforePromptStep, afterPromptStep };
}

const DRAFT = 'cases';
const PROMPT_FILE = { project: 102021, level: 2, folder: 'agentMaterializeL1/steps/tests60', shortName: 'prompt', extension: '.md' };

async function pageOf(args: M12WorkerArgs) {
  const { ctx } = await loadRun({ project: args.project, module: args.module, scope: '', target: '', force: args.force });
  const controller = ctx.units.find(unit => unit.layer === 'controllers' && String(unit.definition.data.pageId ?? unit.unitId) === args.unitId);
  if (!controller) throw new Error(`M12_UNIT_UNKNOWN: page ${args.unitId} has no controller def in ${args.module}.`);
  return { ctx, controller };
}

async function repairInput(args: M12WorkerArgs): Promise<{ problems: string[]; previous: string | null } | undefined> {
  if (args.attempt < 2) return undefined;
  const status = await readUnitStatus(args.project, args.module, 'tests', args.unitId);
  const problems = (status?.diagnostic || 'The previous attempt failed.').split('\n').filter(Boolean);
  return { problems, previous: await readDraft(args.project, args.module, 'tests', args.unitId, DRAFT) };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let args: M12WorkerArgs;
  try { args = parseM12WorkerArgs(step.prompt || '', Number(mls.actualProject || 0)); }
  catch (error) { await recordM12ArgsRefusal(step.prompt || '', 'tests', errorText(error)); return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${errorText(error)}`)]; }
  try {
    const { ctx, controller } = await pageOf(args);
    // Through the reader: it loads the stor index of project 102021 when the open project is another one.
    const system = await ctx.read(fileRef(PROMPT_FILE));
    if (!system) throw new Error('M12_PROMPT_MISSING: _102021_/l2/agentMaterializeL1/steps/tests60/prompt.md');
    const data = await loadTestsContext(ctx, controller, await repairInput(args));
    if (system.length + data.human.length > M12_PROMPT_LIMIT) throw new Error(`M12_PROMPT_LIMIT: ${system.length + data.human.length}`);
    return [m12PromptReady(context, parentStep, step, hookSequential, {
      system, human: data.human, toolName: M12_TESTS_TOOL,
      toolDescription: 'Return the monitor cases of this page', parameters: M12_TESTS_SCHEMA,
    })];
  } catch (error) {
    const diagnostic = clip(errorText(error));
    await writeUnitStatus(args.project, args.module, { layer: 'tests', unitId: args.unitId, defRef: '', status: 'failed', code: 'PROMPT_FAILED', attempt: args.attempt, diagnostic, inputHash: '', outputs: {} });
    return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${diagnostic}`)];
  }
}

async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let args: M12WorkerArgs;
  try { args = parseM12WorkerArgs(step.prompt || '', Number(mls.actualProject || 0)); }
  catch (error) { await recordM12ArgsRefusal(step.prompt || '', 'tests', errorText(error)); return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${errorText(error)}`, 'input')]; }
  let inputHash = '';
  const fail = async (problems: string[]): Promise<mls.msg.AgentIntent[]> => {
    const diagnostic = problems.map(problem => clip(problem, 600)).slice(0, 20).join('\n');
    await writeUnitStatus(args.project, args.module, { layer: 'tests', unitId: args.unitId, defRef: '', status: 'failed', code: 'GATE_FAILED', attempt: args.attempt, diagnostic, inputHash, outputs: {} });
    return repairOrGiveUp(context, parentStep, step, hookSequential, M12_TESTS_PAGE_AGENT_NAME, 'tests', args, diagnostic.replace(/\n/gu, ' | '));
  };
  try {
    const { ctx, controller } = await pageOf(args);
    const data = await loadTestsContext(ctx, controller);
    const controllerStatus = await readUnitStatus(args.project, args.module, 'controllers', controller.unitId);
    inputHash = await testsInputHash(data.inputs, controllerStatus?.outputs ?? {});
    const payload = (m12ToolPayload(step, M12_TESTS_TOOL) ?? {}) as { cases?: unknown };
    await writeDraft(args.project, args.module, 'tests', args.unitId, DRAFT, JSON.stringify(payload.cases ?? null, null, 2));
    let cases;
    try { cases = normalizeTestCases(payload.cases); } catch (error) { return fail([`Cases: ${errorText(error)}`]); }
    const problems = testsGate(cases, { routes: data.routes, entities: data.entities });
    if (problems.length) return fail(problems);
    const file = pageTestsFile(args.project, args.module, data.pageId);
    const hash = await writeText(file, renderPageTests({ file, moduleName: args.module, pageId: data.pageId, actor: data.actor, cases }));
    await writeUnitStatus(args.project, args.module, { layer: 'tests', unitId: args.unitId, defRef: '', status: 'done', code: '', attempt: args.attempt, diagnostic: '', inputHash, outputs: { [fileRef(file)]: hash } });
    return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `Monitor tests ${data.pageId}: ${fileRef(file)} (${cases.length} cases)`, true)];
  } catch (error) {
    return fail([errorText(error)]);
  }
}
