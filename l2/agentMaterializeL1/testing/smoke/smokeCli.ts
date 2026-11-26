/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smokeCli.ts" enhancement="_blank"/>

// d1_321 (parte B, tempo 1): `tsx smokeCli.ts <module> <commit> [outDir]` runs the smoke of one module of `mls-102047` at a commit (a `git archive`, the repository is only read) and writes
// `<outDir>/<module>@<commit>.json` and `.md` (default `/tmp/l1sup/fumaca`). Report only: it enters no `complete` and no check.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { compareReports, differencesText, type SmokeDifference } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokeCompare.js';
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
    ...report.results.map(item => `| ${item.pass} | ${item.route}${item.variant ? ` [${item.variant}]` : ''} | ${item.verdict} | ${item.status ?? ''} | ${item.code ?? ''} | ${item.conforms.slice(0, 3).join('; ')} |`),
    '',
  ].join('\n');
}

/** A tree to run: a commit of `mls-102047` (a `git archive`), or a directory that has `l1`, `l2`, `l4`, `l5` (a clone, a bench): only the module and what it reads are copied. */
export function smokeSubject(module: string, subject: string, outDir: string, label: string): { tree: string; label: string } {
  const tree = path.join(outDir, `tree_${module}_${label}`);
  if (existsSync(path.join(subject, 'l1'))) {
    rmSync(tree, { recursive: true, force: true });
    mkdirSync(tree, { recursive: true });
    for (const rel of [`l1/${module}`, `l2/${module}`, `l4/${module}`, 'l4/organization', 'l5']) if (existsSync(path.join(subject, rel))) cpSync(path.join(subject, rel), path.join(tree, rel), { recursive: true });
  } else extractModule(path.join(BASE, 'mls-102047'), subject, module, tree);
  return { tree, label };
}

export function smokeModule(module: string, commit: string, outDir = '/tmp/l1sup/fumaca'): SmokeReport {
  const { tree } = smokeSubject(module, commit, outDir, safeLabel(commit));
  const report = runSmoke({ tree, project: 102047, module, base: BASE, workDir: path.join(outDir, `work_${module}`) });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `${module}@${safeLabel(commit)}.json`), JSON.stringify({ ...report, raw: report.raw.slice(0, 4000) }, null, 2));
  writeFileSync(path.join(outDir, `${module}@${safeLabel(commit)}.md`), reportText(report, commit));
  return report;
}

function safeLabel(subject: string): string {
  return subject.replace(/^\/+/u, '').replace(/[^A-Za-z0-9._-]+/gu, '_');
}

/** The smoke at two subjects and the differences between them (d1_330). */
export function smokeAgainst(module: string, after: string, before: string, outDir = '/tmp/l1sup/fumaca'): { differences: SmokeDifference[]; text: string } {
  const was = smokeModule(module, before, outDir);
  const now = smokeModule(module, after, outDir);
  const differences = compareReports(was, now);
  const text = differencesText(module, before, after, differences, { before: was, after: now });
  writeFileSync(path.join(outDir, `${module}@${safeLabel(before)}__${safeLabel(after)}.diff.md`), text);
  return { differences, text };
}

if (process.argv[1] && process.argv[1].endsWith('smokeCli.ts')) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--against');
  const against = at >= 0 ? args.splice(at, 2)[1] : '';
  const [module, commit, outDir] = args;
  if (!module || !commit) throw new Error('usage: smokeCli.ts <module> <commit|dir> [outDir] [--against <commit|dir>]');
  if (against) {
    const { differences, text } = smokeAgainst(module, commit, against, outDir);
    console.log(`${module}: ${against} -> ${commit}: ${differences.length} difference(s)\n${text}`);
  } else {
    const report = smokeModule(module, commit, outDir);
    console.log(`${module}@${commit}: ${report.routes} routes, ${report.executed} runs, ${report.seconds}s`);
  }
}
