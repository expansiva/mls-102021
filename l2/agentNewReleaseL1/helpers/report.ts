/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/report.ts" enhancement="_blank"/>

import type { ChangeEffortFile, EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

export const NEW_RELEASE_USAGE = 'Usage: @@agentNewReleaseL1 <module> [/check]';

export type NewReleaseInvocation =
  | { ok: true; module: string; check: boolean }
  | { ok: false; help: string };

export interface NewReleaseEditNote {
  path: string;
  op: 'added' | 'removed';
  ruleId: string;
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

/** First generator call: the effort units, then the defs run and the check. */
export function reportGeneratorStart(moduleName: string, units: readonly EffortUnitRef[]): string {
  const lines = ['The generator will change:'];
  for (const unit of units) lines.push(`${unit.kind} ${unit.id} ${unit.path}`);
  lines.push(`@@agentDefsL1 ${moduleName} /run`);
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
  return ['changed outside the plan:', ...outside].join('\n');
}

/** One materialize command per created or changed path. */
export function reportMaterialize(paths: readonly string[]): string {
  if (paths.length === 0) return 'nothing to materialize';
  return paths.map(target => `@@agentMaterializeL1 ${JSON.stringify({ target })}`).join('\n');
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
      if (!item || item.kind !== 'rule' || (item.op !== 'added' && item.op !== 'removed')) continue;
      const side = item.op === 'added' ? item.after : item.before;
      const ruleId = side && typeof side === 'object' && !Array.isArray(side) && typeof (side as { ruleId?: unknown }).ruleId === 'string'
        ? (side as { ruleId: string }).ruleId
        : '';
      notes.push({ path, op: item.op, ruleId });
    }
  }
  return notes;
}

/** Completed-task text for a def edit. Empty plan says nothing to apply and lists no command. */
export function reportNewRelease(notes: NewReleaseEditNote[], targets: string[]): string {
  if (notes.length === 0 && targets.length === 0) return 'nothing to apply';
  const lines = notes.map(note => `${note.path}: ${note.op} ${note.ruleId}`);
  for (const target of targets) lines.push(`@@agentMaterializeL1 ${JSON.stringify({ target })}`);
  return lines.join('\n');
}
