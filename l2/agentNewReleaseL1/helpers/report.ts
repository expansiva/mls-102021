/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/report.ts" enhancement="_blank"/>

import { moduleFile, readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

export const NEW_RELEASE_USAGE = 'Usage: @@agentNewReleaseL1 <module> [/check]';

export type NewReleaseInvocation =
  | { ok: true; module: string; check: boolean }
  | { ok: false; help: string };

const MODULE_NAME = /^[A-Za-z][A-Za-z0-9]*$/u;

/** `<module>` or `<module> /check`. Any other flag is the usage line. The agent still refuses both. */
export function parseNewReleaseInvocation(userPrompt: string): NewReleaseInvocation {
  const text = userPrompt.trim().replace(/^@@agentNewReleaseL1\b/u, '').trim();
  const parts = text ? text.split(/\s+/u) : [];
  const moduleName = parts[0] ?? '';
  if (!MODULE_NAME.test(moduleName)) return { ok: false, help: NEW_RELEASE_USAGE };
  if (parts.length === 1) return { ok: true, module: moduleName, check: false };
  if (parts.length === 2 && parts[1] === '/check') return { ok: true, module: moduleName, check: true };
  return { ok: false, help: NEW_RELEASE_USAGE };
}

/** `<unit>.defs.ts` → `<unit>.ts`. Any other path is not a generated source. */
export function sourcePathOfDef(defPath: string): string | null {
  const suffix = '.defs.ts';
  if (!defPath.endsWith(suffix)) return null;
  return `${defPath.slice(0, -suffix.length)}.ts`;
}

/** `deleteFile` failed. Names the path and lists the files already deleted. */
export function reportDeleteFailed(path: string, error: string, deleted: readonly string[]): string {
  const listed = deleted.length > 0 ? `\nAlready deleted:\n${deleted.join('\n')}` : '';
  return `failed to delete ${path}: ${error}${listed}`;
}

/** The step status is always `completed`. The prefix is what the reader sees. */
export type ReleaseStatusKind = 'done' | 'refused' | 'failed';

export function releaseStatusText(message: string, kind: ReleaseStatusKind): string {
  const prefix = `${kind}: `;
  return message.startsWith(prefix) ? message : `${prefix}${message}`;
}

/** Short motive for the step title. The full text stays in the step result. */
export function releaseStepTitle(text: string): string {
  const compact = text.replace(/\s+/gu, ' ').trim();
  return compact.length <= 72 ? compact : `${compact.slice(0, 69)}...`;
}

export type ReleaseRunPhase = 'effort' | 'plan' | 'portrait' | 'defs' | 'sources' | 'guard';

export interface ReleaseRunPhaseLine {
  phase: ReleaseRunPhase;
  status: 'ok' | 'refused' | 'failed';
  note: string;
}

/** `l1/<module>/pipeline/agentNewReleaseL1/run.json`. The effort phase replaces the previous run. */
export function runFile(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 1,
    folder: `${moduleName}/pipeline/agentNewReleaseL1`,
    shortName: 'run',
    extension: '.json',
  };
}

export async function recordPhase(
  moduleName: string,
  phase: ReleaseRunPhase,
  status: ReleaseRunPhaseLine['status'],
  note: string,
): Promise<void> {
  const info = runFile(moduleName);
  const line: ReleaseRunPhaseLine = { phase, status, note };
  if (phase === 'effort') {
    await writeJson(info, { phases: [line] });
    return;
  }
  const current = await readJson<{ phases?: ReleaseRunPhaseLine[] }>(info);
  const phases = Array.isArray(current?.phases) ? [...current.phases] : [];
  phases.push(line);
  await writeJson(info, { phases });
}
