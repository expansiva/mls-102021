/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smokeCompare.ts" enhancement="_blank"/>

// d1_330: the smoke of one module at two commits (or trees), side by side. The same plan of cases runs on both; what is listed is the DIFFERENCE: a case that was ok and is refused (or the
// contrary), a refusal whose status or code changed, an output that stopped fitting the contract type, a case that appeared or disappeared. Report only: no gate, nothing in `complete`.

import type { SmokeCaseResult, SmokeReport } from '/_102021_/l2/agentMaterializeL1/testing/smoke/runSmoke.js';

export interface SmokeDifference {
  kind: 'verdict' | 'code' | 'typed' | 'appeared' | 'disappeared';
  key: string;
  before: string;
  after: string;
}

const keyOf = (item: SmokeCaseResult): string => `${item.pass} ${item.route}${item.variant ? ` [${item.variant}]` : ''}`;
const outcome = (item: SmokeCaseResult): string => `${item.verdict}${item.status === null || item.status === undefined ? '' : ` ${item.status}`}${item.code ? ` ${item.code}` : ''}`;

export function compareReports(before: SmokeReport, after: SmokeReport): SmokeDifference[] {
  const left = new Map(before.results.map(item => [keyOf(item), item]));
  const right = new Map(after.results.map(item => [keyOf(item), item]));
  const out: SmokeDifference[] = [];
  for (const [key, was] of left) {
    const now = right.get(key);
    if (!now) { out.push({ kind: 'disappeared', key, before: outcome(was), after: '' }); continue; }
    if (was.verdict !== now.verdict) out.push({ kind: 'verdict', key, before: outcome(was), after: outcome(now) });
    else if (was.verdict !== 'ok' && (was.status !== now.status || (was.code ?? '') !== (now.code ?? ''))) out.push({ kind: 'code', key, before: outcome(was), after: outcome(now) });
    else if (now.conforms.length > 0 && was.conforms.length === 0) out.push({ kind: 'typed', key, before: 'fits the type', after: now.conforms.slice(0, 2).join('; ') });
  }
  for (const [key, now] of right) if (!left.has(key)) out.push({ kind: 'appeared', key, before: '', after: outcome(now) });
  return out;
}

export function differencesText(module: string, before: string, after: string, differences: readonly SmokeDifference[], counts: { before: SmokeReport; after: SmokeReport }): string {
  return [
    `# Smoke: ${module} ${before} → ${after} (só relatório)`,
    '',
    `Casos: ${counts.before.executed} antes, ${counts.after.executed} depois. **Diferenças: ${differences.length}.**`,
    '',
    ...(differences.length === 0 ? ['Nenhuma diferença.'] : ['| tipo | caso | antes | depois |', '|---|---|---|---|', ...differences.map(item => `| ${item.kind} | ${item.key} | ${item.before} | ${item.after} |`)]),
    '',
  ].join('\n');
}
