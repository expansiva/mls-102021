/// <mls fileReference="_102021_/l2/agentDefsL1/steps/entry10/dispatch.ts" enhancement="_blank"/>

/**
 * Optional pool transport (d1_38, chain rule of 28/09: dispatching a run authorizes it).
 * The command authorizes the run. An `implement` in `l4/<module>/pool/l1` may be the dispatch that
 * carried it, never a proof: entry10 only lists the ones present when it ran, and finalize80,
 * once the defs are complete, traces each of those in its report and then deletes it.
 * Estimate messages belong to agentPlannerL1 and are never listed. A later arrival is another
 * execution's and stays. Pool shape follows `solution/pool.ts`; only its types come from 102035.
 */

import type { PoolBox, PoolTraceLine } from '/_102035_/l2/solution/pool.js';
import type { D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { readText, removePoolMessage } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';

const POOL_BOXES: readonly PoolBox[] = ['l1', 'l2', 'l4'];

/** Same name rule as `isPoolMessageShortName`: `<stamp>_<thread>_<round>`. */
function isPoolMessageShortName(shortName: string): boolean {
  return /^\d{14}_.+_\d+$/u.test(shortName);
}

function displayOf(file: D1FileInfo): string {
  return `l${file.level}/${file.folder}/${file.shortName}${file.extension}`;
}

/** Messages in `l4/<module>/pool/l1` of this project, oldest first. */
function l1BoxFiles(project: number, moduleName: string): D1FileInfo[] {
  const folder = `${moduleName}/pool/l1`;
  return Object.values(mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>)
    .filter((file): file is mls.stor.IFileInfo => !!file
      && file.project === project
      && Number(file.level) === 4
      && file.status !== 'deleted'
      && String(file.folder || '') === folder
      && file.extension === '.json'
      && isPoolMessageShortName(String(file.shortName || '')))
    .map(file => ({ project, level: 4, folder, shortName: String(file.shortName), extension: '.json' }))
    .sort((left, right) => left.shortName.localeCompare(right.shortName));
}

type DispatchLine = Omit<PoolTraceLine, 'at' | 'outcome'>;

/** An `implement` addressed to l1, or null. Anything else is not this agent's dispatch. */
async function dispatchLine(file: D1FileInfo): Promise<DispatchLine | null> {
  const text = await readText(file);
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const message = raw as Record<string, unknown>;
  if (message.mode !== 'implement' || message.to !== 'l1') return null;
  if (typeof message.from !== 'string' || !(POOL_BOXES as readonly string[]).includes(message.from) || message.from === 'l1') return null;
  const thread = typeof message.thread === 'string' ? message.thread.trim() : '';
  if (!thread || typeof message.round !== 'number' || !Number.isInteger(message.round) || message.round < 1) return null;
  return { file: displayOf(file), from: message.from as PoolBox, to: 'l1', thread, round: message.round, mode: 'implement' };
}

/** Display paths of the l1 dispatches present now. Read-only; the entry never depends on it. */
export async function listDispatchMessages(project: number, moduleName: string): Promise<string[]> {
  const out: string[] = [];
  for (const file of l1BoxFiles(project, moduleName)) {
    const line = await dispatchLine(file);
    if (line) out.push(line.file);
  }
  return out;
}

export interface DispatchConsumption {
  /** Trace lines to append to the report, before any delete. */
  lines: PoolTraceLine[];
  /** Store files to delete once the lines are on disk. */
  files: D1FileInfo[];
}

/**
 * The dispatches entry10 listed that are still in pool/l1. Lines already traced are not
 * repeated (a crash after the trace only deletes on the next pass). Nothing else is touched.
 */
export async function dispatchConsumption(
  project: number,
  moduleName: string,
  listed: readonly string[],
  traced: readonly PoolTraceLine[],
  now: Date,
): Promise<DispatchConsumption> {
  const wanted = new Set(listed);
  const lines: PoolTraceLine[] = [];
  const files: D1FileInfo[] = [];
  for (const file of l1BoxFiles(project, moduleName)) {
    if (!wanted.has(displayOf(file))) continue;
    const line = await dispatchLine(file);
    if (!line) continue;
    files.push(file);
    if (traced.some(item => item.file === line.file && item.outcome === 'processed')) continue;
    lines.push({ at: now.toISOString(), ...line, outcome: 'processed' });
  }
  return { lines, files };
}

/**
 * Deletes each file only if `traced` (the report as read back from disk) holds its `processed`
 * line. Otherwise throws before deleting it: trace first, then delete (`deletePoolMessageAt`).
 */
export async function deleteTraced(files: readonly D1FileInfo[], traced: readonly PoolTraceLine[]): Promise<void> {
  for (const file of files) {
    const path = displayOf(file);
    if (!traced.some(line => line.file === path && line.outcome === 'processed')) {
      throw new Error(`refusing to delete ${path}: no processed trace in the finalize80 report`);
    }
    await removePoolMessage(file);
  }
}
