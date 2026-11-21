/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Adopt.ts" enhancement="_blank"/>

// d1_270: `@@agentDefsL1 <module> /adopt`. A module whose L1 defs come from before the receipts (or whose receipts name bytes that are no longer on the disk)
// cannot be redone without a hand: the D1 treats a def it has no receipt for as "I do not know whether it is mine". The command is the manager saying
// "these bytes are the generator's": it records, for every product def of the module on the disk, a receipt with the hash of the disk, and only when the
// product files of the module are the ones the git HEAD has (stor status `nochange`: what is committed is what the manager accepted). A dirty file refuses
// the whole command and is listed. A def whose receipt already is the disk is left as it is. Nothing is adopted in silence: only this command does it.

import { logicalDefPath, readAdoptedReceipts, saveAdoptedReceipts } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { hashesAgree, sourceIdentityHash } from '/_102021_/l2/helpers/l1Defs/identity.js';

type StorLeaf = {
  project?: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
  content?: unknown;
  status?: string;
};

export interface D1AdoptResult {
  /** Logical def paths that got a receipt now (none existed, or the one there named other bytes). */
  adopted: string[];
  /** Logical def paths the D1 already honours for the bytes on the disk (the inventory holds their hash, or an earlier adoption). */
  unchanged: string[];
  /** The product files of the module that are not the git HEAD: when there are some, nothing was adopted. */
  dirty: string[];
}

/** The product files of the module: everything under `l1/<module>/` but the D1's own record of its runs. */
function productFiles(project: number, moduleName: string): StorLeaf[] {
  const files = (mls.stor.files || {}) as Record<string, StorLeaf>;
  return Object.values(files).filter(file => {
    if (file.project !== project || file.level !== 1) return false;
    const folder = file.folder ?? '';
    if (folder !== moduleName && !folder.startsWith(`${moduleName}/`)) return false;
    return folder !== `${moduleName}/pipeline` && !folder.startsWith(`${moduleName}/pipeline/`);
  });
}

function pathOf(file: StorLeaf): string {
  return `l1/${file.folder}/${file.shortName}${file.extension}`;
}

export async function adoptDefs(project: number, moduleName: string): Promise<D1AdoptResult> {
  const files = productFiles(project, moduleName);
  const dirty = files.filter(file => file.status !== 'nochange').map(pathOf).sort();
  if (dirty.length > 0) return { adopted: [], unchanged: [], dirty };
  const defs = files.filter(file => file.extension === '.defs.ts' && (file.folder ?? '').startsWith(`${moduleName}/layer_`) && typeof file.content === 'string');
  // What the D1 honours when it rewrites a def (`commitD1Unit`): the hash the inventory (`input.json`) holds for it, or an adopted receipt. A writer receipt
  // alone is not enough there when the progress predates the source key, so a def whose receipt is only that is adopted too.
  const adopted = await readAdoptedReceipts(project, moduleName);
  const inventory = await readD1Input(project, moduleName);
  const inventoried = new Map<string, string>();
  for (const item of [...(inventory?.files ?? []), ...(inventory?.removed ?? [])]) {
    if (item.defPath && item.contentHash) inventoried.set(item.defPath, item.contentHash);
  }
  const result: D1AdoptResult = { adopted: [], unchanged: [], dirty: [] };
  const next = new Map(adopted);
  for (const file of defs) {
    const logical = logicalDefPath(pathOf(file));
    const content = file.content as string;
    const known = [inventoried.get(logical), adopted.get(logical)].filter((hash): hash is string => !!hash);
    let agrees = false;
    for (const hash of known) if (await hashesAgree(content, hash)) agrees = true;
    if (agrees) {
      result.unchanged.push(logical);
      continue;
    }
    next.set(logical, await sourceIdentityHash(content));
    result.adopted.push(logical);
  }
  if (result.adopted.length > 0) await saveAdoptedReceipts(project, moduleName, next);
  result.adopted.sort();
  result.unchanged.sort();
  return result;
}

/** What `/adopt` tells the manager. */
export function adoptReport(moduleName: string, result: D1AdoptResult): string {
  if (result.dirty.length > 0) {
    return [
      `adopt ${moduleName}: refused. These files of l1/${moduleName} are not the git HEAD, and nothing was adopted: ${result.dirty.slice(0, 20).join(', ')}${result.dirty.length > 20 ? ` and ${result.dirty.length - 20} more` : ''}.`,
      'Commit or discard them, then run /adopt again.',
    ].join('\n');
  }
  return [
    `adopt ${moduleName}: ${result.adopted.length} def(s) got a receipt with the hash of the disk, ${result.unchanged.length} already had one that is the disk.`,
    ...(result.adopted.length ? [`Adopted: ${result.adopted.join(', ')}.`] : []),
    'The next /rederive or /run writes these defs when their plan changes, and still refuses a def edited after this adoption.',
  ].join('\n');
}
