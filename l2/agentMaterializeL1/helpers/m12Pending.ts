/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Pending.ts" enhancement="_blank"/>

// d1_343: what a scope or target run would send to the model, said BEFORE it runs (and alone, with `dry`). A scope run reuses what has its file, but a unit with no file
// is generated, with the model, even when nobody asked for that unit (a tests page that was skipped by a rule that no longer holds, a unit never written).
// Seed rows (`seedRows25`) are not counted: their tables are decided when the step runs.

import { SERVE_ROUTE_NO_PAGE_TEST, loadTestsContext } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';
import type { M12Request } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { readOptional, readUnitStatus, reuseDecision } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { stage2 } from '/_102021_/l2/agentMaterializeL1/helpers/m12Stage2.js';
import { testsInputParts, testsKeepPlan } from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.js';
import { fileRef, pageTestsFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { requestModules, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

/** The layers whose units the model writes (the others are recipes). */
const MODEL_LAYERS = ['external', 'adapter', 'usecases', 'workflows', 'requests'] as const;

export interface M12PendingWork {
  module: string;
  /** From scratch: no file, or `force`. A call to the model each. */
  generate: string[];
  /** `target` on a unit that has its file: kept when it compiles against what moved, repaired (a call) when it does not. */
  keepOrRepair: string[];
  /** Pages that serve a connection and have no page test: skipped, nothing generated. */
  skipped: string[];
}

export async function pendingModelWork(project: number, moduleName: string, request: M12Request): Promise<M12PendingWork> {
  const { ctx, selected } = await loadRun({ project, module: moduleName, scope: request.scope, target: request.target, force: request.force, ...(request.scratch === undefined ? {} : { scratch: request.scratch }) });
  const work: M12PendingWork = { module: moduleName, generate: [], keepOrRepair: [], skipped: [] };
  const scratch = request.scratch === true;
  for (const unit of selected) {
    const name = `${unit.layer}/${unit.unitId}`;
    if ((MODEL_LAYERS as readonly string[]).includes(unit.layer)) {
      const onDisk = (await reuseDecision([unit.output], false)).kind === 'reuse';
      if (scratch || !onDisk) work.generate.push(name);
      else if (request.target) work.keepOrRepair.push(name);
    }
    if (unit.layer === 'controllers') {
      const pageId = String(unit.definition.data.pageId ?? unit.unitId);
      try {
        const data = await loadTestsContext(ctx, unit);
        const onDisk = (await reuseDecision([pageTestsFile(project, moduleName, pageId)], false)).kind === 'reuse';
        // A tests page is written again from scratch (no keep): a `target` or `force` on it, or no file.
        if (stage2.on && onDisk && request.target && !scratch) {
          // d1_347 s6: in stage 2 a target keeps the cases of a page whose receipt has both halves and whose prompt did not move (the gate decides: kept, or repaired with a call).
          const prior = await readUnitStatus(project, moduleName, 'tests', pageId);
          const ready = await readUnitStatus(project, moduleName, 'controllers', unit.unitId);
          const parts = await testsInputParts(data.inputs, ready?.outputs ?? {});
          const file = pageTestsFile(project, moduleName, pageId);
          if (await testsKeepPlan({ on: true, scratch: false, prior, own: parts.own, file: fileRef(file), fileText: await readOptional(file) }) === 'keep') { work.keepOrRepair.push(`tests/${pageId}`); continue; }
        }
        if (scratch || request.target || !onDisk) work.generate.push(`tests/${pageId}`);
      } catch (error) {
        if (String((error as Error).message).startsWith(SERVE_ROUTE_NO_PAGE_TEST)) work.skipped.push(`tests/${pageId}`);
        else work.generate.push(`tests/${pageId} (the context is not readable: it will fail, not generate)`);
      }
    }
  }
  return work;
}

export function pendingText(works: readonly M12PendingWork[]): string[] {
  const lines: string[] = [];
  for (const work of works) {
    lines.push(`- ${work.module}: model units this run will generate ${work.generate.length}${work.generate.length ? ` (${work.generate.join(', ')})` : ''}; keep-or-repair ${work.keepOrRepair.length}${work.keepOrRepair.length ? ` (${work.keepOrRepair.join(', ')})` : ''}; serve pages without a test, skipped ${work.skipped.length}`);
  }
  const total = works.reduce((sum, work) => sum + work.generate.length, 0);
  const repair = works.reduce((sum, work) => sum + work.keepOrRepair.length, 0);
  lines.push(`Model calls: ${total} unit(s) from scratch${repair ? `, up to ${repair} more if the kept ones do not compile` : ''}.${total === 0 && repair === 0 ? ' This run calls no model.' : ''}`);
  return lines;
}

export async function pendingScope(project: number, request: M12Request): Promise<string> {
  const found = requestModules(project, request, storEntries());
  if (found.refusal) return found.refusal;
  const works: M12PendingWork[] = [];
  for (const moduleName of found.modules) works.push(await pendingModelWork(project, moduleName, request));
  return [`dry — ${request.target || request.scope || 'whole project'}: nothing is generated`, ...pendingText(works)].join('\n');
}
