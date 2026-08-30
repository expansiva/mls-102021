/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.ts" enhancement="_blank"/>

import { cbTraceFolder } from '/_102021_/l2/agentChangeBackend/helpers/cbTraceScope.js';
import { CB_FAST_HANDOFF_MARK_SHORT } from '/_102021_/l2/agentChangeBackend/helpers/cbFastHandoff.js';

export const CB_PIPELINE_AGENT_SLUG = 'changebackend';

export interface PipelineRunDegradation {
  at: string;
  kind: string;
  reason: string;
  path?: string;
}

export interface PipelineRunSummary {
  moduleName: string;
  agent: string;
  command: string;
  startedAt: string | null;
  finishedAt: string;
  verdict: 'completed' | 'failed' | 'degraded';
  reason: string;
  counts: Record<string, unknown>;
  degradations: PipelineRunDegradation[];
}

export function nextPipelineRunNn(existingShortNames: readonly string[], agentSlug: string): string {
  const re = new RegExp(`^run(\\d+)_${agentSlug}$`);
  let max = 0;
  for (const name of existingShortNames) {
    const match = re.exec(name);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return String(max + 1).padStart(2, '0');
}

export function describeCbCommand(longMemory: Record<string, unknown> | null | undefined): string {
  if (!longMemory) return '';
  const parts: string[] = [];
  if (longMemory.fastMode === 'true') parts.push('/fast');
  const cli = typeof longMemory.cliCommand === 'string' ? longMemory.cliCommand : '';
  if (cli === 'rebuild-all' || cli === 'rebuild') parts.push('/rebuild all');
  else if (cli) parts.push(cli);
  return parts.join(' ');
}

export function listCbPipelineShortNames(moduleName: string): string[] {
  const project = mls.actualProject || 0;
  const folder = `${moduleName}/pipeline`;
  const names: string[] = [];
  for (const file of Object.values(mls.stor.files) as { project?: number; level?: number; folder?: string; shortName?: string; extension?: string; status?: string }[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.json' || String(file.folder || '') !== folder) continue;
    if (file.shortName) names.push(String(file.shortName));
  }
  return names;
}

export function buildCbRunSummary(input: {
  moduleName: string;
  command: string;
  noWork: boolean;
  ownersDone: number;
  ownersFlipped: number;
  compilerLeft: boolean;
  health: Record<string, unknown> | null;
  summary: string;
  extraDegradations?: PipelineRunDegradation[];
}): PipelineRunSummary {
  const health = input.health;
  const degraded = Array.isArray(health?.degraded) ? health!.degraded.map(String) : [];
  const findings = Array.isArray(health?.findings) ? health!.findings.length : 0;
  const degradations: PipelineRunDegradation[] = degraded.map(reason => ({
    at: new Date().toISOString(),
    kind: 'health-degraded',
    reason,
  }));
  if (health?.seeds === 'degraded') {
    degradations.push({ at: new Date().toISOString(), kind: 'seeds-degraded', reason: String(health.seedSkipped ?? 'seeds degraded') });
  }
  if (input.extraDegradations?.length) degradations.push(...input.extraDegradations);
  const verdict: PipelineRunSummary['verdict'] = input.compilerLeft || input.noWork
    ? (input.compilerLeft ? 'failed' : 'completed')
    : (degradations.length ? 'degraded' : 'completed');
  return {
    moduleName: input.moduleName,
    agent: 'agentChangeBackend',
    command: input.command,
    startedAt: null,
    finishedAt: new Date().toISOString(),
    verdict,
    reason: input.summary,
    counts: {
      ownersDone: input.ownersDone,
      ownersFlipped: input.ownersFlipped,
      findings,
      degraded: degraded.length,
      repairs: Array.isArray(health?.repairHistory) ? health!.repairHistory.length : 0,
      noWork: input.noWork,
    },
    degradations,
  };
}

export async function saveCbRunSummary(summary: PipelineRunSummary): Promise<string | null> {
  try {
    const project = mls.actualProject || 0;
    if (!project || !summary.moduleName) return null;
    const nn = nextPipelineRunNn(listCbPipelineShortNames(summary.moduleName), CB_PIPELINE_AGENT_SLUG);
    const info = {
      project,
      level: 4,
      folder: `${summary.moduleName}/pipeline`,
      shortName: `run${nn}_${CB_PIPELINE_AGENT_SLUG}`,
      extension: '.json',
    };
    const source = `${JSON.stringify({ savedAt: new Date().toISOString(), ...summary }, null, 2)}\n`;
    const { createStorFile } = await import('/_102027_/l2/libStor.js');
    const key = mls.stor.getKeyToFile(info);
    let file = mls.stor.files[key];
    if (!file) file = await createStorFile({ ...info, source }, false, false, false);
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
    return `l4/${info.folder}/${info.shortName}.json`;
  } catch {
    return null;
  }
}

export function cbFastHandoffMarkInfo(moduleName: string, project = mls.actualProject || 0): {
  project: number; level: number; folder: string; shortName: string; extension: string;
} {
  return { project, level: 4, folder: `${moduleName}/pipeline`, shortName: CB_FAST_HANDOFF_MARK_SHORT, extension: '.json' };
}

export async function readCbFastHandoffMark(moduleName: string): Promise<{ to: string; message: string; at: string } | null> {
  try {
    const project = mls.actualProject || 0;
    if (!project || !moduleName) return null;
    const key = mls.stor.getKeyToFile(cbFastHandoffMarkInfo(moduleName, project));
    const file = mls.stor.files[key] as { status?: string; getContent?: () => Promise<string> } | undefined;
    if (!file || file.status === 'deleted' || !file.getContent) return null;
    const parsed = JSON.parse(String(await file.getContent() ?? ''));
    if (!parsed || typeof parsed !== 'object' || typeof parsed.message !== 'string') return null;
    return { to: String(parsed.to || 'agentChangeFrontend'), message: parsed.message, at: String(parsed.at || '') };
  } catch {
    return null;
  }
}

export async function writeCbFastHandoffMark(moduleName: string, message: string): Promise<void> {
  const project = mls.actualProject || 0;
  if (!project || !moduleName) return;
  const info = cbFastHandoffMarkInfo(moduleName, project);
  const source = `${JSON.stringify({ to: 'agentChangeFrontend', message, at: new Date().toISOString() }, null, 2)}\n`;
  const { createStorFile } = await import('/_102027_/l2/libStor.js');
  const key = mls.stor.getKeyToFile(info);
  let file = mls.stor.files[key];
  if (!file) file = await createStorFile({ ...info, source }, false, false, false);
  await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
}

/** Keep a reference so the write-folder chokepoint stays in this module's tests. */
export function cbRunTraceFolder(): string {
  return cbTraceFolder();
}
