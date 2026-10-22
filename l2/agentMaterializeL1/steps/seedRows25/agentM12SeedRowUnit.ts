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
import { emitSeedsWhenReady, parseSeedWorkerArgs, referenceSeedTables, seedWorkerStep, writeSeedTableDraft } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.js';

export interface SeedRowsResult {
  tableId: string;
  rows: Record<string, unknown>[];
  /** Model calls. Zero when the l4 does not say the module seed loads the entity. */
  calls: number;
  /** Set when the repair was also refused. The table then has no rows. */
  reason: string | null;
}

export type SeedRowsModel = (human: string, repair?: SeedRepair) => string | Promise<string>;

/** RFC 4122 DNS namespace. Same name always yields the same id. */
const SEED_ID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

/** RFC 4122 UUID version 5 (SHA-1). Web Crypto only: this agent runs in the browser. */
export async function uuidV5(name: string): Promise<string> {
  const namespace = hexToBytes(SEED_ID_NAMESPACE.replaceAll('-', ''));
  const encoded = new TextEncoder().encode(name);
  const data = new Uint8Array(namespace.length + encoded.length);
  data.set(namespace, 0);
  data.set(encoded, namespace.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', data));
  const bytes = digest.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** `version` is a column only when persistence would promote it (unique key or index). Otherwise it lives in `details`. */
function versionIsColumn(unit: SeedTableUnit): boolean {
  if (!unit.columns.some(column => column.name === 'version')) return false;
  if (unit.uniqueKeys.some(key => key.includes('version'))) return true;
  return unit.columns.some(column => column.name === 'version' && column.indexed);
}

function withControlVersion(unit: SeedTableUnit, row: Record<string, unknown>): void {
  if (!unit.columns.some(column => column.name === 'version')) return;
  if (versionIsColumn(unit)) {
    if (row.version === undefined || row.version === null || row.version === '') row.version = 1;
    return;
  }
  const details = isRecord(row.details) ? { ...row.details } : {};
  if (details.version === undefined || details.version === null || details.version === '') details.version = 1;
  row.details = details;
}

/**
 * Fills the primary key and the initial control version in code.
 * A row whose unique key is missing is refused: no id is invented.
 */
export async function completeInitialRows(
  unit: SeedTableUnit,
  rows: readonly Record<string, unknown>[],
): Promise<{ rows: Record<string, unknown>[] } | { problems: string[] }> {
  const idColumn = unit.columns.find(column => column.name === 'id' && column.type === 'uuid');
  const key = unit.uniqueKeys[0];
  const problems: string[] = [];
  const completed: Record<string, unknown>[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!idColumn || !key) {
      problems.push(`row ${index} has no primary key.`);
      continue;
    }
    const values = key.map(field => row[field]);
    if (values.some(value => value === undefined || value === null || value === '')) {
      problems.push(`row ${index} has no primary key.`);
      continue;
    }
    const next: Record<string, unknown> = { ...row };
    const token = values.map(value => String(value)).join(':');
    next.id = await uuidV5(`${unit.moduleName}.${unit.tableId}:${token}`);
    withControlVersion(unit, next);
    completed.push(next);
  }
  return problems.length > 0 ? { problems } : { rows: completed };
}

async function gatedRows(unit: SeedTableUnit, parsed: { rows: Record<string, unknown>[] } | { problems: string[] }): Promise<{ rows: Record<string, unknown>[] } | { problems: string[] }> {
  if ('problems' in parsed) return parsed;
  const shape = seedRowProblems(unit, parsed.rows);
  if (shape.length > 0) return { problems: shape };
  return completeInitialRows(unit, parsed.rows);
}

/** Gate plus one repair. Does not call the model when `loadedBySeed` is false. */
export async function settleReferenceSeed(unit: SeedTableUnit, model: SeedRowsModel): Promise<SeedRowsResult> {
  if (!unit.loadedBySeed) return { tableId: unit.tableId, rows: [], calls: 0, reason: null };
  const first = await model(seedRowsHuman(unit));
  const firstRows = await gatedRows(unit, parseSeedRowsCode(first));
  if ('rows' in firstRows) {
    return { tableId: unit.tableId, rows: firstRows.rows, calls: 1, reason: null };
  }
  const repair: SeedRepair = { problems: firstRows.problems, previous: first };
  const second = await model(seedRowsHuman(unit, repair), repair);
  const secondRows = await gatedRows(unit, parseSeedRowsCode(second));
  if ('rows' in secondRows) {
    return { tableId: unit.tableId, rows: secondRows.rows, calls: 2, reason: null };
  }
  return {
    tableId: unit.tableId,
    rows: [],
    calls: 2,
    reason: secondRows.problems.join(' '),
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
      const decided = await gatedRows(unit, parseSeedRowsCode(code));
      if ('rows' in decided) {
        await writeSeedTableDraft(args.project, args.module, unit.tableId, decided.rows, null);
        const emitted = await emitSeedsWhenReady(ctx);
        return finish(`${unit.tableId}: rows accepted${emitted ? '; seeds.ts emitted' : ''}`);
      }
      const problems = decided.problems;
      if (args.attempt === 1) {
        const next = seedWorkerStep({ ...args, attempt: 2, problems, previous: code });
        return [
          addM12Step(context, parentStep.stepId, next),
          updateM12Status(context, parentStep, step, hookSequential, 'completed', clip(`Repair scheduled: ${problems.join(' | ')}`), 'input'),
        ];
      }
      await writeSeedTableDraft(args.project, args.module, unit.tableId, [], problems.join(' '));
      const emitted = await emitSeedsWhenReady(ctx);
      return finish(`M12_FAILED: ${unit.tableId} left empty: ${problems.join(' | ')}${emitted ? '; seeds.ts emitted' : ''}`);
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
