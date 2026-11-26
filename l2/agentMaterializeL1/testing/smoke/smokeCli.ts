/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smokeCli.ts" enhancement="_blank"/>

// d1_321 (parte B, tempo 1): `tsx smokeCli.ts <module> <commit> [outDir]` runs the smoke of one module of `mls-102047` at a commit (a `git archive`, the repository is only read) and writes
// `<outDir>/<module>@<commit>.json` and `.md` (default `/tmp/l1sup/fumaca`). Report only: it enters no `complete` and no check.

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { runSmoke, type SmokeReport } from '/_102021_/l2/agentMaterializeL1/testing/smoke/runSmoke.js';

const BASE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');

export function extractModule(repo: string, commit: string, module: string, target: string): void {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  const archived = spawnSync('git', ['-C', repo, 'archive', commit, `l1/${module}`, `l2/${module}`, `l4/${module}`, 'l4/organization', 'l5'], { maxBuffer: 512 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${commit} ${module}`);
  const extracted = spawnSync('tar', ['-x', '-C', target], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

/** The report as a table: one line per route and pass, with what the check against the contract type found. */
export function reportText(report: SmokeReport, label: string): string {
  const count = (verdict: string) => report.results.filter(item => item.verdict === verdict).length;
  const withProblems = report.results.filter(item => item.conforms.length > 0);
  return [
    `# Smoke (tempo 1, só relatório): ${report.module} @ ${label}`,
    '',
    `Rotas do contrato: ${report.routes}. Execuções (feliz + falha da conexão): ${report.executed}. ok ${count('ok')}, recusa 4xx ${count('refused')}, falha 5xx/501 ${count('failed')}, exceção ${count('error')}. Saída fora do tipo do contrato: ${withProblems.length}. Tempo: ${report.seconds}s.`,
    '',
    '| passo | rota | veredito | status | código | fora do tipo do contrato |',
    '|---|---|---|---|---|---|',
    ...report.results.map(item => `| ${item.pass} | ${item.route} | ${item.verdict} | ${item.status ?? ''} | ${item.code ?? ''} | ${item.conforms.slice(0, 3).join('; ')} |`),
    '',
  ].join('\n');
}

export function smokeModule(module: string, commit: string, outDir = '/tmp/l1sup/fumaca'): SmokeReport {
  const repo = path.join(BASE, 'mls-102047');
  const tree = path.join(outDir, `tree_${module}`);
  extractModule(repo, commit, module, tree);
  const report = runSmoke({ tree, project: 102047, module, base: BASE, workDir: path.join(outDir, `work_${module}`) });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `${module}@${commit}.json`), JSON.stringify({ ...report, raw: report.raw.slice(0, 4000) }, null, 2));
  writeFileSync(path.join(outDir, `${module}@${commit}.md`), reportText(report, commit));
  return report;
}

if (process.argv[1] && process.argv[1].endsWith('smokeCli.ts')) {
  const [module, commit, outDir] = process.argv.slice(2);
  if (!module || !commit) throw new Error('usage: smokeCli.ts <module> <commit> [outDir]');
  const report = smokeModule(module, commit, outDir);
  console.log(`${module}@${commit}: ${report.routes} routes, ${report.executed} runs, ${report.seconds}s`);
}
