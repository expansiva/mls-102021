/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/report.ts" enhancement="_blank"/>

import type { ChangeEffortFile } from '/_102035_/l2/solution/poolPlan.js';

export const NEW_RELEASE_USAGE = 'Usage: @@agentNewReleaseL1 <module>';

export type NewReleaseInvocation =
  | { ok: true; module: string }
  | { ok: false; help: string };

export interface NewReleaseEditNote {
  path: string;
  op: 'added' | 'removed';
  ruleId: string;
}

/** One module token after the optional agent mention. Anything else is the usage line. */
export function parseNewReleaseInvocation(userPrompt: string): NewReleaseInvocation {
  const text = userPrompt.trim().replace(/^@@agentNewReleaseL1\b/u, '').trim();
  if (!text || /\s/u.test(text) || !/^[A-Za-z][A-Za-z0-9]*$/u.test(text)) {
    return { ok: false, help: NEW_RELEASE_USAGE };
  }
  return { ok: true, module: text };
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

/** Completed-task text. Empty plan says nothing to apply and lists no command. */
export function reportNewRelease(notes: NewReleaseEditNote[], targets: string[]): string {
  if (notes.length === 0 && targets.length === 0) return 'nothing to apply';
  const lines = notes.map(note => `${note.path}: ${note.op} ${note.ruleId}`);
  for (const target of targets) lines.push(`@@agentMaterializeL1 ${JSON.stringify({ target })}`);
  return lines.join('\n');
}
