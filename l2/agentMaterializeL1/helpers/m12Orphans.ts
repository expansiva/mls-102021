/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Orphans.ts" enhancement="_blank"/>

// d1_252: a def the D1 removed does not take its code along: the unit leaves the plan and the `.ts` stays in the module. `target` naming that def
// (its `.defs.ts` or its `.ts`) removes the output the materializer wrote, and only that: the bytes must be the ones its status file recorded.
// A file edited by hand stays, with a warning. A def still in the stor is never an orphan (it is a unit, and `target` regenerates it).

import { M12_LAYERS, type M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { deleteStorFile, readOptional, readUnitStatus, sha256Text, storExists, type M12UnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { defOfRef, fileRef, infoOfRef, unitStatusFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

export interface M12Orphan {
  project: number;
  module: string;
  layer: M12Layer;
  unitId: string;
  defRef: string;
  status: M12UnitStatus;
}

/** The unit this materializer wrote for `target` whose def is gone, or null (the def exists, or no status file names it). */
export async function orphanOfTarget(project: number, moduleName: string, target: string, units: readonly M12Unit[]): Promise<M12Orphan | null> {
  const def = defOfRef(target, project);
  if (!def || def.project !== project || def.folder.split('/')[0] !== moduleName) return null;
  const defRef = fileRef(def);
  if (storExists(def) || units.some(unit => unit.defRef === defRef)) return null;
  for (const layer of M12_LAYERS) {
    const status = await readUnitStatus(project, moduleName, layer, def.shortName);
    if (status && status.defRef === defRef) return { project, module: moduleName, layer, unitId: def.shortName, defRef, status };
  }
  return null;
}

/** Removes each recorded output whose bytes are the recorded ones, then the status file when none stayed. One line per file. */
export async function removeOrphan(orphan: M12Orphan): Promise<string[]> {
  const lines: string[] = [];
  let kept = 0;
  for (const [ref, written] of Object.entries(orphan.status.outputs)) {
    const info = infoOfRef(ref, orphan.project);
    // Only a `.ts` of this module's l1 code: never a def, a pipeline file or another module.
    if (!info || info.level !== 1 || info.extension !== '.ts' || !info.folder.startsWith(`${orphan.module}/`) || info.folder.includes('/pipeline')) {
      kept += 1;
      lines.push(`${ref}: kept, not an output this agent removes`);
      continue;
    }
    if (!storExists(info)) { lines.push(`${ref}: already gone`); continue; }
    const text = await readOptional(info);
    if (text !== null && await sha256Text(text) === written) {
      await deleteStorFile(info);
      lines.push(`${ref}: removed (def ${orphan.defRef} no longer exists)`);
    } else {
      kept += 1;
      lines.push(`${ref}: kept, edited by hand since the materializer wrote it (ORPHAN_EDITED); remove it by hand if it is not needed`);
    }
  }
  if (!kept) {
    await deleteStorFile(unitStatusFile(orphan.project, orphan.module, orphan.layer, orphan.unitId));
    lines.push(`status ${orphan.layer}/${orphan.unitId}: removed`);
  }
  return lines;
}
