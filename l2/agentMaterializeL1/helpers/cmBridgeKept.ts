/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/cmBridgeKept.ts" enhancement="_blank"/>

// d1_347 s8: with the stage 2 key on, a module that still has a unit importing or resolving `CmGateway` keeps the bridge (outbound.ts) and its registration. A pass of only outbound / registerRepositories on a module that
// is not migrated would take the bridge out and the units that still resolve it would break at run time (the danger of s3b). The check reads the files of the module in the stor, not a list: the bridge goes out when no
// unit of the module names it any more (after the units were regenerated on `cm(ctx)`).

import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

export const CM_BRIDGE_KEPT = 'CM_BRIDGE_KEPT';

/** The project of an output ref (`_102047_/l1/<module>/…`); 0 when it has none. */
export function projectOfRef(ref: string): number {
  const match = /^\/?_(\d+)_\//u.exec(ref);
  return match ? Number(match[1]) : 0;
}

/** The files of the module (the bridge and its registration aside) that still name `CmGateway`: `folder/shortName`. */
export async function unitsStillOnCmBridge(project: number, moduleName: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of storEntries()) {
    if (entry.project !== project || entry.level !== 1 || entry.extension !== '.ts' || entry.status === 'deleted') continue;
    if (entry.folder !== moduleName && !entry.folder.startsWith(`${moduleName}/`)) continue;
    if (entry.folder.split('/').includes('pipeline') || entry.shortName.endsWith('.test')) continue;
    if ((entry.shortName === 'outbound' && entry.folder.endsWith('adapters/integration')) || (entry.shortName === 'registerRepositories' && entry.folder.endsWith('adapters/persistence'))) continue;
    const text = await readOptional({ project, level: 1, folder: entry.folder, shortName: entry.shortName, extension: '.ts' });
    if (text !== null && /\bCmGateway\b/u.test(text)) found.push(`${entry.folder}/${entry.shortName}`);
  }
  return found.sort();
}

export function bridgeKeptNote(files: readonly string[]): string {
  return `${CM_BRIDGE_KEPT}: the bridge (outbound.ts) and its registration stay: ${files.length} unit(s) of the module still import or resolve CmGateway (${files.slice(0, 6).join(', ')}${files.length > 6 ? ', …' : ''}). Regenerate them on cm(ctx), then this pass takes the bridge out.`;
}
