/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Stamp.ts" enhancement="_blank"/>

// d1_329: the stamp. A receipt written before `inputParts` existed cannot tell "only a dependency moved" from "the def moved",
// so a target would regenerate the unit from scratch. The stamp writes the halves, and only the halves, of a unit whose receipt
// still matches its inputs (the hash of now equals the hash of the receipt). It uses no model and touches no output. `dry` only counts.

import type { M12Request } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { readUnitStatus, reuseDecision, writeUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { unitInputParts } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { requestModules, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

/** The layers whose units the model writes through `modelDispatcherAgent`: the ones the rule of d1_329 applies to. */
const STAMPED_LAYERS = ['external', 'adapter', 'usecases', 'workflows', 'requests'] as const;

export interface M12StampCount { stamped: number; already: number; noReceipt: number; mismatch: string[] }

export async function stampModule(project: number, moduleName: string, scope: string, dry: boolean): Promise<M12StampCount> {
  const { ctx, selected } = await loadRun({ project, module: moduleName, scope, target: '', force: false });
  const count: M12StampCount = { stamped: 0, already: 0, noReceipt: 0, mismatch: [] };
  for (const unit of selected.filter(item => (STAMPED_LAYERS as readonly string[]).includes(item.layer))) {
    const prior = await readUnitStatus(project, moduleName, unit.layer, unit.unitId);
    const onDisk = (await reuseDecision([unit.output], false)).kind === 'reuse';
    if (!prior || !onDisk || (prior.status !== 'done' && prior.status !== 'reused')) { count.noReceipt += 1; continue; }
    if (prior.inputParts) { count.already += 1; continue; }
    const parts = await unitInputParts(ctx, unit);
    if (parts.hash !== prior.inputHash) { count.mismatch.push(`${unit.layer}/${unit.unitId}`); continue; }
    if (!dry) {
      const { schemaVersion: _version, updatedAt: _at, ...status } = prior;
      await writeUnitStatus(project, moduleName, { ...status, inputParts: { own: parts.own, deps: parts.deps } });
    }
    count.stamped += 1;
  }
  return count;
}

/** One line per module, then the units whose receipt does not match (they stay without halves and generate as before). */
export async function stampScope(project: number, scope: string, dry: boolean): Promise<string> {
  const request: M12Request = { scope, target: '', force: false };
  const found = requestModules(project, request, storEntries());
  if (found.refusal) return found.refusal;
  const lines = [`stamp${dry ? ' (dry: nothing written)' : ''} — ${scope || 'whole project'}`];
  for (const moduleName of found.modules) {
    const count = await stampModule(project, moduleName, scope, dry);
    lines.push(`${moduleName}: ${dry ? 'stampable' : 'stamped'} ${count.stamped}, already ${count.already}, mismatch ${count.mismatch.length}, no receipt ${count.noReceipt}`);
    for (const unit of count.mismatch) lines.push(`  - ${unit}: the receipt hash is not the hash of the inputs now; no stamp (it generates as before)`);
  }
  return lines.join('\n');
}
