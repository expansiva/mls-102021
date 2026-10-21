/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.ts" enhancement="_blank"/>

// One model call per reference-seed table, then one repair. A second refusal leaves the table empty.

import {
  parseSeedRowsCode,
  seedRowProblems,
  seedRowsHuman,
  type SeedRepair,
  type SeedTableUnit,
} from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';

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
