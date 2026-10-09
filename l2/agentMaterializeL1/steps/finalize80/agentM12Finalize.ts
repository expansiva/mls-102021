/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_FINALIZE_AGENT_NAME, M12_LAYERS, clip, errorText, parseM12StepInvocation, type M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12Result, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { readJsonOptional, readUnitStatus, writeJson, type M12UnitState, type M12UnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { registrationFile, reportFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { registersModule } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

export function createAgent(): IAgentAsync {
  return { agentName: M12_FINALIZE_AGENT_NAME, agentProject: 102021, agentFolder: 'agentMaterializeL1/steps/finalize80', agentDescription: 'Report every unit of the run from its status file', visibility: 'private', beforePromptStep };
}

export const M12_REPORT_VERSION = '2026-10-05-m12-report-v1' as const;

export interface M12Report {
  schemaVersion: typeof M12_REPORT_VERSION;
  project: number;
  moduleName: string;
  /** complete: every selected unit done or reused (a declared platform gap allowed); partial otherwise. */
  status: 'complete' | 'partial';
  counts: Record<M12UnitState, number>;
  byLayer: Partial<Record<M12Layer, Record<string, number>>>;
  /** Every unit that is not done or reused, with its code: nothing is dropped. */
  open: Array<{ layer: M12Layer; unitId: string; status: M12UnitState; code: string; diagnostic: string }>;
  /** Units generated and through every gate that no compiler proved (COMPILE_UNAVAILABLE_L1). */
  notCompiled: string[];
  /** Selected units with no status file (the phase did not reach them). */
  missing: string[];
  defProblems: Array<{ defRef: string; code: string; detail: string }>;
  registration: { action: string; detail: string } | null;
  createdAt: string;
}

export function buildM12Report(project: number, moduleName: string, units: readonly M12UnitStatus[], missing: readonly string[], defProblems: M12Report['defProblems'], registration: M12Report['registration']): M12Report {
  const counts: Record<M12UnitState, number> = { done: 0, reused: 0, blocked: 0, gap: 0, failed: 0, skipped: 0 };
  const byLayer: M12Report['byLayer'] = {};
  for (const unit of units) {
    counts[unit.status] += 1;
    const layer = byLayer[unit.layer] ?? {};
    layer[unit.status] = (layer[unit.status] ?? 0) + 1;
    byLayer[unit.layer] = layer;
  }
  const open = units
    .filter(unit => unit.status !== 'done' && unit.status !== 'reused')
    .map(unit => ({ layer: unit.layer, unitId: unit.unitId, status: unit.status, code: unit.code, diagnostic: clip(unit.diagnostic, 600) }));
  const clean = open.every(item => item.status === 'gap') && missing.length === 0 && defProblems.length === 0;
  const notCompiled = units.filter(unit => (unit.status === 'done' || unit.status === 'reused') && unit.code === 'COMPILE_UNAVAILABLE_L1').map(unit => `${unit.layer}/${unit.unitId}`);
  return { schemaVersion: M12_REPORT_VERSION, project, moduleName, status: clean ? 'complete' : 'partial', counts, byLayer, open, notCompiled, missing: [...missing], defProblems, registration, createdAt: new Date().toISOString() };
}

export function summarizeM12Report(report: M12Report): string {
  const lines = [
    `agentMaterializeL1 ${report.moduleName} (project ${report.project}): ${report.status}.`,
    `done ${report.counts.done}, reused ${report.counts.reused}, blocked ${report.counts.blocked}, gap ${report.counts.gap}, failed ${report.counts.failed}, skipped ${report.counts.skipped}.`,
  ];
  for (const layer of M12_LAYERS) {
    const row = report.byLayer[layer];
    if (row) lines.push(`- ${layer}: ${Object.entries(row).map(([state, count]) => `${state} ${count}`).join(', ')}`);
  }
  if (report.open.length) {
    lines.push('', 'Not generated:');
    for (const item of report.open) lines.push(`- ${item.layer}/${item.unitId}: ${item.status} ${item.code} — ${clip(item.diagnostic, 240)}`);
  }
  if (report.notCompiled.length) lines.push('', `Generated, not proven by a compiler (COMPILE_UNAVAILABLE_L1): ${report.notCompiled.length} unit(s).`);
  if (report.missing.length) lines.push('', `No status for: ${report.missing.join(', ')}`);
  if (report.defProblems.length) lines.push('', 'Defs not planned:', ...report.defProblems.map(item => `- ${item.defRef}: ${item.code} ${clip(item.detail, 200)}`));
  if (report.registration) lines.push('', `l5 registration: ${clip(report.registration.detail, 600)}`);
  return lines.join('\n');
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const run = parseM12StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (run.kind === 'refusal') return [updateM12Status(context, parentStep, step, hookSequential, 'failed', run.diagnostic)];
  try {
    const { project, module: moduleName } = run;
    const { selected, problems } = await loadRun(run);
    const units: M12UnitStatus[] = [];
    const missing: string[] = [];
    const read = async (layer: M12Layer, unitId: string): Promise<void> => {
      const status = await readUnitStatus(project, moduleName, layer, unitId);
      if (status) units.push(status);
      else missing.push(`${layer}/${unitId}`);
    };
    // Only the units this run selected: a dependency from an earlier run is not reported again.
    for (const unit of selected) await read(unit.layer, unit.unitId);
    for (const unit of selected.filter(item => item.layer === 'controllers')) await read('tests', String(unit.definition.data.pageId ?? unit.unitId));
    const registration = registersModule(run, moduleName)
      ? await readJsonOptional<{ action: string; detail: string }>(registrationFile(project, moduleName))
      : null;
    const report = buildM12Report(project, moduleName, units, missing, problems, registration ? { action: registration.action, detail: registration.detail } : null);
    await writeJson(reportFile(project, moduleName), { ...report, scope: run.scope, target: run.target, force: run.force });
    const summary = clip(summarizeM12Report(report), 6000);
    return [
      addM12Step(context, parentStep.stepId, m12Result('Materialization report', summary, 'finalize80-report')),
      updateM12Status(context, parentStep, step, hookSequential, 'completed', `Report: ${report.status}`),
    ];
  } catch (error) {
    return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
  }
}
