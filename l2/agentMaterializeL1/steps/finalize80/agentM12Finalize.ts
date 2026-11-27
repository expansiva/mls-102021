/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.ts" enhancement="_blank"/>

import { SERVE_ROUTE_NO_PAGE_TEST } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';
import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_FINALIZE_AGENT_NAME, M12_LAYERS, clip, errorText, parseM12StepInvocation, type M12Layer, type M12RunArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { addM12Step, m12Result, updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { readJsonOptional, readOptional, readUnitStatus, writeJson, type M12UnitState, type M12UnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { orphanOfTarget, removeOrphan } from '/_102021_/l2/agentMaterializeL1/helpers/m12Orphans.js';
import { registrationFile, reportFile, smokeFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { registersModule, requestModules, storEntries, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { smokeInputsHash, smokeState, type M12SmokeState, type SmokeFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Smoke.js';

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
  /** Units skipped by SERVE_ROUTE_NO_PAGE_TEST (`layer/unitId`): a connection serve route has no page test and nothing tests it. Not open, and not hidden (d1_201). */
  serveNotTested: string[];
  /** Selected units with no status file (the phase did not reach them). */
  missing: string[];
  defProblems: Array<{ defRef: string; code: string; detail: string }>;
  registration: { action: string; detail: string } | null;
  /** d1_333: what the smoke says of the module (absent: this report did not look). `complete` needs it ok. */
  smoke?: M12SmokeState;
  createdAt: string;
}

function isServeSkip(item: { status: string; code: string }): boolean {
  return item.status === 'skipped' && item.code === SERVE_ROUTE_NO_PAGE_TEST;
}

export function buildM12Report(project: number, moduleName: string, units: readonly M12UnitStatus[], missing: readonly string[], defProblems: M12Report['defProblems'], registration: M12Report['registration'], smoke?: M12SmokeState): M12Report {
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
  // A connection serve route has no page test: that declared skip is not an open item, same as a platform gap.
  const clean = open.every(item => item.status === 'gap' || isServeSkip(item)) && missing.length === 0 && defProblems.length === 0 && (smoke === undefined || smoke.ok);
  const notCompiled = units.filter(unit => (unit.status === 'done' || unit.status === 'reused') && unit.code === 'COMPILE_UNAVAILABLE_L1').map(unit => `${unit.layer}/${unit.unitId}`);
  const serveNotTested = open.filter(isServeSkip).map(item => `${item.layer}/${item.unitId}`);
  return { schemaVersion: M12_REPORT_VERSION, project, moduleName, status: clean ? 'complete' : 'partial', counts, byLayer, open, notCompiled, serveNotTested, missing: [...missing], defProblems, registration, ...(smoke ? { smoke } : {}), createdAt: new Date().toISOString() };
}

export function summarizeM12Report(report: M12Report): string {
  const lines = [
    `agentMaterializeL1 ${report.moduleName} (project ${report.project}): ${report.status}${report.serveNotTested.length ? `, ${report.serveNotTested.length} serve unit(s) with no test` : ''}.`,
    `done ${report.counts.done}, reused ${report.counts.reused}, blocked ${report.counts.blocked}, gap ${report.counts.gap}, failed ${report.counts.failed}, skipped ${report.counts.skipped}.`,
  ];
  for (const layer of M12_LAYERS) {
    const row = report.byLayer[layer];
    if (row) lines.push(`- ${layer}: ${Object.entries(row).map(([state, count]) => `${state} ${count}`).join(', ')}`);
  }
  const notGenerated = report.open.filter(item => !isServeSkip(item));
  if (notGenerated.length) {
    lines.push('', 'Not generated:');
    for (const item of notGenerated) lines.push(`- ${item.layer}/${item.unitId}: ${item.status} ${item.code} — ${clip(item.diagnostic, 240)}`);
  }
  if (report.serveNotTested.length) lines.push('', `Serve units with no test (SERVE_ROUTE_NO_PAGE_TEST): ${report.serveNotTested.join(', ')}. The monitor tests pages; nothing runs these routes.`);
  if (report.notCompiled.length) lines.push('', `Generated, not proven by a compiler (COMPILE_UNAVAILABLE_L1): ${report.notCompiled.length} unit(s).`);
  if (report.missing.length) lines.push('', `No status for: ${report.missing.join(', ')}`);
  if (report.defProblems.length) lines.push('', 'Defs not planned:', ...report.defProblems.map(item => `- ${item.defRef}: ${item.code} ${clip(item.detail, 200)}`));
  if (report.registration) lines.push('', `l5 registration: ${clip(report.registration.detail, 600)}`);
  if (report.smoke) lines.push('', report.smoke.ok ? `Smoke: ${report.smoke.detail}.` : `Smoke ${report.smoke.code}: ${clip(report.smoke.detail, 600)}`);
  return lines.join('\n');
}

/**
 * d1_333: `smoke.json` of the module and the hash of what it ran on, now. The smoke cannot run here (child process, `tsx`, `git`): `smokeCli --write` runs it and writes the file; the
 * `complete` asks that the file exists, that the receipts and contracts of the module are the ones it ran on, and that nothing blocks.
 */
export async function readSmokeState(project: number, moduleName: string): Promise<M12SmokeState> {
  const entries = storEntries().filter(item => item.project === project && item.status !== 'deleted');
  const receipts: Array<{ key: string; outputs: Record<string, string> }> = [];
  for (const layer of M12_LAYERS) {
    const folder = `${moduleName}/pipeline/agentMaterializeL1/${layer}`;
    for (const entry of entries.filter(item => item.level === 1 && item.folder === folder && item.extension === '.json' && !!item.shortName)) {
      const status = await readUnitStatus(project, moduleName, layer, entry.shortName);
      if (status) receipts.push({ key: `${layer}/${entry.shortName}`, outputs: status.outputs ?? {} });
    }
  }
  const contracts: Array<{ name: string; text: string }> = [];
  for (const entry of entries.filter(item => item.level === 2 && item.folder === `${moduleName}/web/contracts` && item.extension === '.defs.ts' && !!item.shortName)) {
    const text = await readOptional({ project, level: 2, folder: entry.folder, shortName: entry.shortName, extension: '.defs.ts' });
    if (text !== null) contracts.push({ name: `${entry.shortName}.defs.ts`, text });
  }
  const file = await readJsonOptional<SmokeFile>(smokeFile(project, moduleName));
  return smokeState(file, await smokeInputsHash(receipts, contracts));
}

/** The report of one module from the receipts that exist (`finalize80` and `{"report":true}`): reads, never generates. */
export async function writeModuleReport(run: M12RunArgs, selected: readonly M12Unit[], problems: ReadonlyArray<{ defRef: string; code: string; detail: string }>): Promise<{ report: M12Report }> {
  const { project, module: moduleName } = run;
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
  // The module workflow engine is proved by the workflows phase (prepareWorkflows, d1_196): its outcome is a unit of the report.
  if (selected.some(item => item.layer === 'workflows')) {
    const engine = await readUnitStatus(project, moduleName, 'workflows', 'engine');
    if (engine) units.push(engine);
  }
  const registration = registersModule(run, moduleName)
    ? await readJsonOptional<{ action: string; detail: string }>(registrationFile(project, moduleName))
    : null;
  const report = buildM12Report(project, moduleName, units, missing, problems, registration ? { action: registration.action, detail: registration.detail } : null, await readSmokeState(project, moduleName));
  await writeJson(reportFile(project, moduleName), { ...report, scope: run.scope, target: run.target, force: run.force });
  return { report };
}

/** d1_343: `{"report":true,"scope":"<module>"}`: step 3 of the smoke procedure. No unit is generated, with or without a model. */
export async function reportScope(project: number, scope: string): Promise<string> {
  const found = requestModules(project, { scope, target: '', force: false }, storEntries());
  if (found.refusal) return found.refusal;
  const lines = [`report — ${scope || 'whole project'} (nothing generated)`];
  for (const moduleName of found.modules) {
    const run: M12RunArgs = { project, module: moduleName, scope, target: '', force: false };
    const { selected, problems } = await loadRun(run);
    const { report } = await writeModuleReport(run, selected, problems);
    lines.push('', `## ${moduleName}: ${report.status}`, summarizeM12Report(report));
  }
  return lines.join('\n');
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const run = parseM12StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (run.kind === 'refusal') return [updateM12Status(context, parentStep, step, hookSequential, 'failed', run.diagnostic)];
  try {
    const { project, module: moduleName } = run;
    const { ctx, selected, problems } = await loadRun(run);
    // d1_252: `target` of a def that no longer exists: remove the output this agent wrote for it (unedited only) and the status file.
    const orphan = !selected.length && run.target ? await orphanOfTarget(project, moduleName, run.target, ctx.units) : null;
    if (orphan) {
      const lines = await removeOrphan(orphan);
      return [
        addM12Step(context, parentStep.stepId, m12Result('Orphan removal', clip(lines.join('\n'), 3000), 'finalize80-orphan')),
        updateM12Status(context, parentStep, step, hookSequential, 'completed', `Orphan ${orphan.layer}/${orphan.unitId}: ${lines.length} line(s)`),
      ];
    }
    const { report } = await writeModuleReport(run, selected, problems);
    const summary = clip(summarizeM12Report(report), 6000);
    return [
      addM12Step(context, parentStep.stepId, m12Result('Materialization report', summary, 'finalize80-report')),
      updateM12Status(context, parentStep, step, hookSequential, 'completed', `Report: ${report.status}`),
    ];
  } catch (error) {
    return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
  }
}
