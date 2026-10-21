/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.ts" enhancement="_blank"/>

// One model call per reference-seed table, then one repair. A second refusal leaves the table empty.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_PROMPT_LIMIT, M12_SEED_ROW_UNIT_AGENT_NAME, clip, errorText } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12PromptReady, m12ToolPayload, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { M12_CODE_SCHEMA } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { fileRef } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import {
  SEED_ROWS_TOOL,
  SEED_ROWS_TOOL_DESCRIPTION,
  parseSeedRowsCode,
  seedRowProblems,
  seedRowsHuman,
  type SeedRepair,
  type SeedTableUnit,
} from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';
import { parseSeedWorkerArgs, referenceSeedTables, seedWorkerStep } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.js';

export interface SeedRowsResult {
  tableId: string;
  rows: Record<string, unknown>[];
  /** Model calls. Zero when the l4 does not say the module seed loads the entity. */
  calls: number;
  /** Set when the repair was also refused. The table then has no rows. */
  reason: string | null;
}

export type SeedRowsModel = (human: string, repair?: SeedRepair) => string | Promise<string>;

/** Gate plus one repair. Does not call the model when `loadedBySeed` is false. */
export async function settleReferenceSeed(unit: SeedTableUnit, model: SeedRowsModel): Promise<SeedRowsResult> {
  if (!unit.loadedBySeed) return { tableId: unit.tableId, rows: [], calls: 0, reason: null };
  const first = await model(seedRowsHuman(unit));
  const firstRows = parseSeedRowsCode(first);
  const firstProblems = 'problems' in firstRows ? firstRows.problems : seedRowProblems(unit, firstRows.rows);
  if (firstProblems.length === 0 && 'rows' in firstRows) {
    return { tableId: unit.tableId, rows: firstRows.rows, calls: 1, reason: null };
  }
  const repair: SeedRepair = { problems: firstProblems, previous: first };
  const second = await model(seedRowsHuman(unit, repair), repair);
  const secondRows = parseSeedRowsCode(second);
  const secondProblems = 'problems' in secondRows ? secondRows.problems : seedRowProblems(unit, secondRows.rows);
  if (secondProblems.length === 0 && 'rows' in secondRows) {
    return { tableId: unit.tableId, rows: secondRows.rows, calls: 2, reason: null };
  }
  return {
    tableId: unit.tableId,
    rows: [],
    calls: 2,
    reason: secondProblems.join(' '),
  };
}

const PROMPT_FILE = { project: 102021, level: 2, folder: 'agentMaterializeL1/steps/seedRows25', shortName: 'prompt', extension: '.md' };

/** The host worker: one prompt, the gate, and a single repair. A second refusal leaves the table empty. */
export function createAgent(): IAgentAsync {
  async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
    let args;
    try { args = parseSeedWorkerArgs(step.prompt || '', Number(mls.actualProject || 0)); }
    catch (error) { return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${errorText(error)}`)]; }
    try {
      const { ctx } = await loadRun({ project: args.project, module: args.module, scope: '', target: '', force: args.force });
      const unit = (await referenceSeedTables(ctx)).find(item => item.tableId === args.unitId);
      if (!unit) throw new Error(`M12_UNIT_UNKNOWN: seedRows ${args.unitId} is not a reference-seed table of ${args.module}.`);
      const system = await ctx.read(fileRef(PROMPT_FILE));
      if (!system) throw new Error('M12_PROMPT_MISSING: _102021_/l2/agentMaterializeL1/steps/seedRows25/prompt.md');
      const repair: SeedRepair | undefined = args.attempt >= 2 ? { problems: args.problems ?? [], previous: args.previous ?? null } : undefined;
      const human = seedRowsHuman(unit, repair);
      if (system.length + human.length > M12_PROMPT_LIMIT) throw new Error(`M12_PROMPT_LIMIT: ${system.length + human.length}`);
      return [m12PromptReady(context, parentStep, step, hookSequential, {
        system, human, toolName: SEED_ROWS_TOOL, toolDescription: SEED_ROWS_TOOL_DESCRIPTION, parameters: M12_CODE_SCHEMA,
      })];
    } catch (error) {
      return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${clip(errorText(error))}`)];
    }
  }

  async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
    let args;
    try { args = parseSeedWorkerArgs(step.prompt || '', Number(mls.actualProject || 0)); }
    catch (error) { return [updateM12Status(context, parentStep, step, hookSequential, 'completed', `M12_FAILED: ${errorText(error)}`, 'input')]; }
    const finish = (text: string) => [updateM12Status(context, parentStep, step, hookSequential, 'completed', clip(text), 'input')];
    try {
      const { ctx } = await loadRun({ project: args.project, module: args.module, scope: '', target: '', force: args.force });
      const unit = (await referenceSeedTables(ctx)).find(item => item.tableId === args.unitId);
      if (!unit) return finish(`M12_FAILED: M12_UNIT_UNKNOWN: seedRows ${args.unitId}`);
      const payload = (m12ToolPayload(step, SEED_ROWS_TOOL) ?? {}) as { code?: unknown };
      const code = typeof payload.code === 'string' ? payload.code : '';
      const parsed = parseSeedRowsCode(code);
      const problems = 'problems' in parsed ? parsed.problems : seedRowProblems(unit, parsed.rows);
      if (problems.length === 0) return finish(`${unit.tableId}: rows accepted`);
      if (args.attempt === 1) {
        const next = seedWorkerStep({ ...args, attempt: 2, problems, previous: code });
        return [
          addM12Step(context, parentStep.stepId, next),
          updateM12Status(context, parentStep, step, hookSequential, 'completed', clip(`Repair scheduled: ${problems.join(' | ')}`), 'input'),
        ];
      }
      return finish(`M12_FAILED: ${unit.tableId} left empty: ${problems.join(' | ')}`);
    } catch (error) {
      return finish(`M12_FAILED: ${errorText(error)}`);
    }
  }

  return {
    agentName: M12_SEED_ROW_UNIT_AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentMaterializeL1/steps/seedRows25',
    agentDescription: 'Write the reference rows of one seed table',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}
