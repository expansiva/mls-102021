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
import { checkKept } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { workflowEngineFile } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';
import { freshEngineSource } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';
import { WORKFLOW_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12WorkflowUnit.js';
import { USECASE_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';
import { REQUEST_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/requests50/agentM12RequestService.js';
import { ADAPTER_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/agentM12AdapterUnit.js';
import { EXTERNAL_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/external15/agentM12ExternalUnit.js';
import type { M12ModelLayerSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { storExists, writeText } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';

const SPEC_OF_LAYER: Record<string, M12ModelLayerSpec> = { external: EXTERNAL_SPEC, adapter: ADAPTER_SPEC, usecases: USECASE_SPEC, workflows: WORKFLOW_SPEC, requests: REQUEST_SPEC };

/** The layers whose units the model writes (the others are recipes). */
const MODEL_LAYERS = ['external', 'adapter', 'usecases', 'workflows', 'requests'] as const;

export interface M12PendingWork {
  module: string;
  /** From scratch: no file, or `force`. A call to the model each. */
  generate: string[];
  /** `target` on a unit that has its file: kept when it compiles against what moved, repaired (a call) when it does not. */
  keepOrRepair: string[];
  /** d1_349 s2, d1_347 s7: units kept as they are (compile and pass the gate against what the run moves): no call. */
  kept: string[];
  /** Pages that serve a connection and have no page test: skipped, nothing generated. */
  skipped: string[];
}

/**
 * d1_349 s2: a scope run that selects every process of the module, without `force`, rewrites an engine that is not what the generator writes now and compiles each process file against it. Said here without
 * running it: the engine is put in place, each file is checked (no model, same check as the run) and the previous engine is written back. The unit id and `kept` or the first problems that send it to the repair; an empty map when the engine stays.
 */
async function engineRewriteVerdicts(ctx: Awaited<ReturnType<typeof loadRun>>['ctx'], selected: readonly { layer: string; unitId: string }[]): Promise<Map<string, 'kept' | string> | null> {
  const all = ctx.units.filter(unit => unit.layer === 'workflows');
  const chosen = selected.filter(unit => unit.layer === 'workflows');
  if (!all.length || !all.every(unit => chosen.some(item => item.unitId === unit.unitId))) return null;
  const info = workflowEngineFile(ctx.run.project, ctx.run.module);
  if (!storExists(info)) return null;
  const previous = await readOptional(info);
  const fresh = (await freshEngineSource(ctx)).source;
  if (previous === null || previous === fresh) return null;
  const verdicts = new Map<string, string>();
  try {
    await writeText(info, fresh);
    for (const unit of all) {
      if ((await reuseDecision([unit.output], false)).kind !== 'reuse') continue;
      const prior = await readUnitStatus(ctx.run.project, ctx.run.module, 'workflows', unit.unitId);
      const checked = await checkKept(ctx, unit, WORKFLOW_SPEC, prior);
      verdicts.set(unit.unitId, checked.problems.length ? `${checked.problems.length} problem(s): ${checked.problems.slice(0, 3).map(problem => problem.replace(/\s+/gu, ' ').slice(0, 220)).join(' | ')}` : 'kept');
    }
  } finally {
    await writeText(info, previous);
  }
  return verdicts;
}

export async function pendingModelWork(project: number, moduleName: string, request: M12Request): Promise<M12PendingWork> {
  const { ctx, selected } = await loadRun({ project, module: moduleName, scope: request.scope, target: request.target, force: request.force, ...(request.scratch === undefined ? {} : { scratch: request.scratch }) });
  const work: M12PendingWork = { module: moduleName, generate: [], keepOrRepair: [], kept: [], skipped: [] };
  const scratch = request.scratch === true;
  const engineVerdicts = scratch || request.target ? null : await engineRewriteVerdicts(ctx, selected);
  for (const unit of selected) {
    if (engineVerdicts && unit.layer === 'workflows' && engineVerdicts.has(unit.unitId)) {
      // d1_349 s2: the scope run rewrites the engine; this process is compiled against it (kept or repaired), never written from scratch while its file exists.
      if (engineVerdicts.get(unit.unitId) === 'kept') work.kept.push(`${unit.layer}/${unit.unitId}`);
      else work.keepOrRepair.push(`${unit.layer}/${unit.unitId} (repair, a call; ${engineVerdicts.get(unit.unitId)})`);
      continue;
    }
    const name = `${unit.layer}/${unit.unitId}`;
    if ((MODEL_LAYERS as readonly string[]).includes(unit.layer)) {
      const onDisk = (await reuseDecision([unit.output], false)).kind === 'reuse';
      if (scratch || !onDisk) work.generate.push(name);
      else if (request.target) {
        // d1_347 s7: the file on disk against the dependencies of now (the gate and the compiler of the run, no model, nothing kept written): which of them the run would keep and which it would repair.
        const prior = await readUnitStatus(project, moduleName, unit.layer as never, unit.unitId);
        const checked = await checkKept(ctx, unit, SPEC_OF_LAYER[unit.layer], prior);
        if (checked.problems.length) work.keepOrRepair.push(`${name} (repair, a call; ${checked.problems.length} problem(s): ${checked.problems.slice(0, 2).map(problem => problem.replace(/\s+/gu, ' ').slice(0, 200)).join(' | ')})`);
        else work.kept.push(name);
      }
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
    lines.push(`- ${work.module}: model units this run will generate ${work.generate.length}${work.generate.length ? ` (${work.generate.join(', ')})` : ''}; keep-or-repair ${work.keepOrRepair.length}${work.keepOrRepair.length ? ` (${work.keepOrRepair.join(', ')})` : ''}${work.kept.length ? `; kept (compiles and passes the gate as it is) ${work.kept.length} (${work.kept.join(', ')})` : ''}; serve pages without a test, skipped ${work.skipped.length}`);
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
