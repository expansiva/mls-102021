/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/report.ts" enhancement="_blank"/>

import { parseDefinitionSource } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { effortWithoutRemovedUnits } from '/_102021_/l2/agentNewReleaseL1/helpers/plan.js';
import { citedToken, structuralRemoval } from '/_102021_/l2/agentNewReleaseL1/helpers/removals.js';
import { moduleFile, readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { ChangeEffortFile, EffortAnswer, EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

export const NEW_RELEASE_USAGE = 'Usage: @@agentNewReleaseL1 <module> [/check]';

export type NewReleaseInvocation =
  | { ok: true; module: string; check: boolean }
  | { ok: false; help: string };

export interface NewReleaseEditNote {
  path: string;
  op: 'added' | 'removed';
  ruleId: string;
  /** Set for a field, journey, or step. The closure line is `<path>: <line>`. */
  line?: string;
}

const MODULE_NAME = /^[A-Za-z][A-Za-z0-9]*$/u;

/** `<module>` starts a run. `<module> /check` reads the portrait. Any other flag is the usage line. */
export function parseNewReleaseInvocation(userPrompt: string): NewReleaseInvocation {
  const text = userPrompt.trim().replace(/^@@agentNewReleaseL1\b/u, '').trim();
  const parts = text ? text.split(/\s+/u) : [];
  const moduleName = parts[0] ?? '';
  if (!MODULE_NAME.test(moduleName)) return { ok: false, help: NEW_RELEASE_USAGE };
  if (parts.length === 1) return { ok: true, module: moduleName, check: false };
  if (parts.length === 2 && parts[1] === '/check') return { ok: true, module: moduleName, check: true };
  return { ok: false, help: NEW_RELEASE_USAGE };
}

/** Create and regenerateDefs units of this master, in answer order. */
export function generatorUnits(effort: ChangeEffortFile, masterProject: string): EffortUnitRef[] {
  const seen = new Set<string>();
  const units: EffortUnitRef[] = [];
  for (const row of effort.perItem) {
    for (const answer of row.answers) {
      if (answer.master.project !== masterProject) continue;
      for (const unit of [...answer.create, ...answer.regenerateDefs]) {
        const key = `${unit.kind}\0${unit.path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        units.push(unit);
      }
    }
  }
  return units;
}

/** First generator call: the effort units, then `/units` for those units and the check. Never `/run`. */
export function reportGeneratorStart(
  moduleName: string,
  units: readonly EffortUnitRef[],
  deleted: readonly string[] = [],
): string {
  const lines = [...deleted, 'The generator will change:'];
  for (const unit of units) lines.push(`${unit.kind} ${unit.id}: units ${unit.path}`);
  const scope = units.map(unit => `${unit.kind}:${unit.id}`).join(' ');
  lines.push(`@@agentDefsL1 ${moduleName} /units${scope ? ` ${scope}` : ''}`);
  lines.push(`@@agentNewReleaseL1 ${moduleName} /check`);
  return lines.join('\n');
}

export function reportMissingSnapshot(path: string): string {
  return `snapshot not found: ${path}`;
}

export function reportCheckWithoutGenerator(): string {
  return 'no generator run is pending';
}

/** Guard failure. Names the paths and lists no materialize command. */
export function reportOutside(outside: readonly string[]): string {
  return [
    'changed outside the plan:',
    ...outside,
    outsideEffort(outside),
  ].join('\n');
}

/** `outside effort: 0`, or one line per path the guard refused. */
export function outsideEffort(outside: readonly string[]): string {
  if (outside.length === 0) return 'outside effort: 0';
  return [`outside effort: ${outside.length}`, ...outside.map(path => `${path}: not in the effort plan`)].join('\n');
}

/** `<unit>.defs.ts` → `<unit>.ts`. Any other path is not a generated source. */
export function sourcePathOfDef(defPath: string): string | null {
  const suffix = '.defs.ts';
  if (!defPath.endsWith(suffix)) return null;
  return `${defPath.slice(0, -suffix.length)}.ts`;
}

function scopeCommand(moduleName: string): string {
  return `@@agentMaterializeL1 ${JSON.stringify({ scope: moduleName })}`;
}

/** Deleted `.ts` paths, then one materialize command for the module. No created or changed path says nothing to materialize. */
export function reportMaterialize(moduleName: string, changed: readonly string[], deleted: readonly string[]): string {
  if (changed.length === 0) return deleted.length > 0 ? deleted.join('\n') : 'nothing to materialize';
  return [...deleted, scopeCommand(moduleName)].join('\n');
}

/** `deleteFile` failed. Names the path and lists the `.ts` files already deleted. */
export function reportDeleteFailed(path: string, error: string, deleted: readonly string[]): string {
  const listed = deleted.length > 0 ? `\nAlready deleted:\n${deleted.join('\n')}` : '';
  return `failed to delete ${path}: ${error}${listed}`;
}

/** Which rule each edited def gained or lost, in edit order, for this master only. */
export function editNotes(effort: ChangeEffortFile, masterProject: string, paths: string[]): NewReleaseEditNote[] {
  const items = new Map(effort.request.items.map(item => [item.changeId, item]));
  const notes: NewReleaseEditNote[] = [];
  for (const path of paths) {
    for (const row of effort.perItem) {
      const answer = row.answers.find(candidate =>
        candidate.master.project === masterProject && candidate.regenerateDefs.some(unit => unit.path === path));
      if (!answer) continue;
      const item = items.get(answer.item);
      if (!item) continue;
      const removal = structuralRemoval(item);
      if (removal) {
        const token = citedToken(removal);
        if (!token) continue;
        const line = removal.kind === 'field'
          ? `removed field ${token}`
          : removal.kind === 'journey'
            ? `removed journey ${token}`
            : `removed step ${token}`;
        notes.push({ path, op: 'removed', ruleId: '', line });
        continue;
      }
      if (item.kind !== 'rule' || (item.op !== 'added' && item.op !== 'removed')) continue;
      const side = item.op === 'added' ? item.after : item.before;
      const ruleId = side && typeof side === 'object' && !Array.isArray(side) && typeof (side as { ruleId?: unknown }).ruleId === 'string'
        ? (side as { ruleId: string }).ruleId
        : '';
      notes.push({ path, op: item.op, ruleId });
    }
  }
  return notes;
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

/** Completed-task text after a def edit that has something to apply. The caller keeps an empty plan on `nothing to apply`. */
export function reportNewRelease(notes: NewReleaseEditNote[], moduleName: string, deleted: readonly string[]): string {
  const lines = notes.map(note => note.line ? `${note.path}: ${note.line}` : `${note.path}: ${note.op} ${note.ruleId}`);
  lines.push(...deleted, scopeCommand(moduleName));
  return lines.join('\n');
}

/**
 * One line per mechanical edit and per materialize unit of this master.
 * A rule is `edit`. A field, journey, or step removal keeps that verb.
 */
export function mechanicalUnitLines(effort: ChangeEffortFile, masterProject: string, editedPaths: readonly string[]): string[] {
  const filtered = effortWithoutRemovedUnits(effort, masterProject);
  const items = new Map(filtered.request.items.map(item => [item.changeId, item]));
  const lines: string[] = [];
  for (const path of editedPaths) {
    for (const row of filtered.perItem) {
      const answer = row.answers.find(candidate =>
        candidate.master.project === masterProject && candidate.regenerateDefs.some(unit => unit.path === path));
      if (!answer) continue;
      const item = items.get(answer.item);
      if (!item) continue;
      const named = unitName(answer.regenerateDefs.find(unit => unit.path === path), path);
      const removal = structuralRemoval(item);
      if (removal) {
        const token = citedToken(removal);
        if (!token) continue;
        const verb = removal.kind === 'field'
          ? 'removed field'
          : removal.kind === 'journey'
            ? 'removed journey'
            : 'removed step';
        lines.push(`${named.kind} ${named.id}: ${verb} ${path}`);
        continue;
      }
      if (item.kind === 'rule' && (item.op === 'added' || item.op === 'removed')) {
        lines.push(`${named.kind} ${named.id}: edit ${path}`);
      }
    }
  }
  const seen = new Set<string>();
  for (const answer of masterAnswers(filtered, masterProject)) {
    for (const unit of answer.materialize) {
      const key = `${unit.kind}\0${unit.id}\0${unit.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`${unit.kind} ${unit.id}: materialize ${unit.path}`);
    }
  }
  return lines;
}

/**
 * One line per path `/check` will rebuild.
 * `units` when the generator changed the def; `materialize` when only the sibling `.ts` is redone.
 */
export function checkUnitLines(
  effort: ChangeEffortFile,
  masterProject: string,
  createdOrChanged: readonly string[],
  fromGenerator: readonly string[],
  defs: Record<string, string>,
): string[] {
  const filtered = effortWithoutRemovedUnits(effort, masterProject);
  const pool: EffortUnitRef[] = [];
  for (const answer of masterAnswers(filtered, masterProject)) {
    pool.push(...answer.create, ...answer.regenerateDefs, ...answer.materialize, ...answer.remove);
  }
  const generated = new Set(fromGenerator);
  const lines: string[] = [];
  for (const path of createdOrChanged) {
    const verb = generated.has(path) ? 'units' : 'materialize';
    const matches = pool.filter(unit => unit.path === path);
    if (matches.length === 0) {
      const named = nameFromDef(path, defs[path]);
      lines.push(`${named.kind} ${named.id}: ${verb} ${path}`);
      continue;
    }
    const seen = new Set<string>();
    for (const unit of matches) {
      const key = `${unit.kind}\0${unit.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`${unit.kind} ${unit.id}: ${verb} ${path}`);
    }
  }
  return lines;
}

/** `model calls: <phase> <n> $<cost>; … ; total $<total>`, or `model calls: none`. Phases are alphabetical. */
export function formatModelCalls(report: unknown): string {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return 'model calls: none';
  const cost = (report as { cost?: unknown }).cost;
  if (!cost || typeof cost !== 'object' || Array.isArray(cost)) return 'model calls: none';
  const total = (cost as { total?: unknown }).total;
  const byPhase = (cost as { byPhase?: unknown }).byPhase;
  if (typeof total !== 'number' || !Number.isFinite(total) || total === 0) return 'model calls: none';
  if (!byPhase || typeof byPhase !== 'object' || Array.isArray(byPhase)) return 'model calls: none';
  const phases = Object.keys(byPhase).sort();
  if (phases.length === 0) return 'model calls: none';
  const parts = phases.map(phase => {
    const row = (byPhase as Record<string, { calls?: unknown; cost?: unknown }>)[phase];
    const calls = row && typeof row.calls === 'number' && Number.isFinite(row.calls) ? row.calls : 0;
    const phaseCost = row && typeof row.cost === 'number' && Number.isFinite(row.cost) ? row.cost : 0;
    return `${phase} ${calls} $${phaseCost.toFixed(4)}`;
  });
  return `model calls: ${parts.join('; ')}; total $${total.toFixed(4)}`;
}

/** Closure of `/check` after the guard accepts the defs: deleted sources, unit lines, model calls, outside effort. */
export function reportCheck(
  moduleName: string,
  changed: readonly string[],
  deleted: readonly string[],
  detail: { units: readonly string[]; modelCalls: string },
): string {
  return [reportMaterialize(moduleName, changed, deleted), ...detail.units, detail.modelCalls, outsideEffort([])].join('\n');
}

function masterAnswers(effort: ChangeEffortFile, masterProject: string): EffortAnswer[] {
  return effort.perItem.flatMap(row => row.answers.filter(answer => answer.master.project === masterProject));
}

function unitName(unit: EffortUnitRef | undefined, path: string): { kind: string; id: string } {
  if (unit) return { kind: unit.kind, id: unit.id };
  return nameFromDef(path);
}

function nameFromDef(path: string, source?: string): { kind: string; id: string } {
  const file = path.split('/').pop() || path;
  const id = file.endsWith('.defs.ts') ? file.slice(0, -'.defs.ts'.length) : file.replace(/\.ts$/u, '');
  let kind = 'def';
  if (source) {
    const parsed = parseDefinitionSource(source);
    if ('definition' in parsed && parsed.definition && typeof parsed.definition === 'object' && !Array.isArray(parsed.definition)) {
      const artifactType = (parsed.definition as { artifactType?: unknown }).artifactType;
      if (typeof artifactType === 'string' && artifactType.length > 0) kind = artifactType;
    }
  }
  return { kind, id };
}
