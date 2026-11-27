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
  // A module may have no `l4/<module>` (a module born from a def): only the paths the commit has.
  const has = (rel: string): boolean => spawnSync('git', ['-C', repo, 'cat-file', '-e', `${commit}:${rel}`]).status === 0;
  const paths = [`l1/${module}`, `l2/${module}`, `l4/${module}`, 'l4/organization', 'l5'].filter(has);
  const archived = spawnSync('git', ['-C', repo, 'archive', commit, ...paths], { maxBuffer: 512 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${commit} ${module}`);
  const extracted = spawnSync('tar', ['-x', '-C', target], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

/** d1_336: the arrivals, the processes behind them: how far each went, the second delivery, the calls to each gateway, what the occurrence port was asked, the rows written, and the stack of what threw. */
export function processesText(report: SmokeReport): string[] {
  const arrivals = report.results.filter(item => item.kind === 'arrival');
  if (arrivals.length === 0) return [];
  const rowsText = (rows: Record<string, number[]> | undefined): string => Object.entries(rows ?? {}).filter(([, counts]) => counts[0] !== counts[2]).map(([name, counts]) => `${name} ${counts.join('→')}`).join('; ') || 'nothing written';
  const lines = [
    `## Processes (${report.memoryPort ? 'occurrence port in memory' : 'production port: the engine was not replaced'}); arrivals are report only`,
    '',
    '| pass | arrival | setup | first | second delivery | gateway calls (after 1st, 2nd) | port | rows |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const item of arrivals) {
    const setup = (item.setup ?? []).map(step => `${step.route.split('.').pop()}: ${step.verdict}${step.code ? ` ${step.code}` : ''}`).join('; ') || '-';
    const calls = Object.entries(item.calls ?? {}).map(([name, counts]) => `${name} ${counts.join('/')}`).join('; ') || 'none';
    const steps = (item.port ?? []).filter(line => !line.startsWith('find')).length;
    lines.push(`| ${item.pass} | ${item.route}${item.variant ? ` [${item.variant}]` : ''} | ${setup} | ${item.verdict} ${item.code ?? ''} ${(item.message ?? '').slice(0, 60)} | ${item.second ? `${item.second.verdict} ${item.second.code ?? ''}` : '-'} | ${calls} | ${steps} step call(s) | ${rowsText(item.rows)} |`);
  }
  const thrown = report.results.filter(item => item.stack || (item.thrown ?? []).length > 0);
  if (thrown.length) {
    lines.push('', '### Stacks of what threw', '');
    for (const item of thrown) lines.push(`${item.pass} ${item.route}${item.variant ? ` [${item.variant}]` : ''}: ${item.code ?? ''}`, '```', [item.stack ?? '', ...(item.thrown ?? []).map(entry => `thrown below the gateway (${entry.connection}.${entry.operation}):\n${entry.stack}`)].filter(Boolean).join('\n').split('\n').slice(0, 24).join('\n'), '```');
  }
  return lines;
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
    ...processesText(report),
  ].join('\n');
}

/** A tree to run: a commit of `mls-102047` (a `git archive`), or a directory that has `l1`, `l2`, `l4`, `l5` (a clone, a bench): only the module and what it reads are copied. */
export function smokeSubject(module: string, subject: string, outDir: string, label: string, repo = path.join(BASE, 'mls-102047')): { tree: string; label: string } {
  const tree = path.join(outDir, `tree_${module}_${label}`);
  if (existsSync(path.join(subject, 'l1'))) {
    rmSync(tree, { recursive: true, force: true });
    mkdirSync(tree, { recursive: true });
    for (const rel of [`l1/${module}`, `l2/${module}`, `l4/${module}`, 'l4/organization', 'l5']) if (existsSync(path.join(subject, rel))) cpSync(path.join(subject, rel), path.join(tree, rel), { recursive: true });
  } else extractModule(repo, subject, module, tree);
  return { tree, label };
}

export function smokeModule(module: string, commit: string, outDir = '/tmp/l1sup/fumaca', repo?: string): SmokeReport {
  const { tree } = smokeSubject(module, commit, outDir, safeLabel(commit), repo);
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

export interface SmokeCliArgs {
  module: string;
  subject: string;
  outDir: string | undefined;
  against: string;
  write: boolean;
  dry: boolean;
  by: string;
  accept: Array<{ case: string; reason: string }>;
}

export const SMOKE_USAGE = 'usage: smokeCli.ts <module> <commit|dir> [outDir] [--against <commit|dir>]\n       smokeCli.ts <module> <repository> --write [--dry] [--accept "<case>" --reason "<why, 20 characters or more>"]... [--by <name>]';

/** The command line. An option it does not know is refused (there is no "accept all"); each `--accept` takes the `--reason` at the same place. */
export function parseSmokeArgs(argv: readonly string[]): SmokeCliArgs {
  const args = [...argv];
  const take = (flag: string): string => { const at = args.indexOf(flag); if (at < 0) return ''; const [, value] = args.splice(at, 2); if (value === undefined) throw new Error(`${flag} needs a value.\n${SMOKE_USAGE}`); return value; };
  const takeAll = (flag: string): string[] => { const out: string[] = []; for (let at = args.indexOf(flag); at >= 0; at = args.indexOf(flag)) { const [, value] = args.splice(at, 2); if (value === undefined) throw new Error(`${flag} needs a value.\n${SMOKE_USAGE}`); out.push(value); } return out; };
  const flag = (name: string): boolean => { const at = args.indexOf(name); if (at >= 0) args.splice(at, 1); return at >= 0; };
  const against = take('--against');
  const by = take('--by');
  const cases = takeAll('--accept');
  const reasons = takeAll('--reason');
  const write = flag('--write');
  const dry = flag('--dry');
  const unknown = args.find(item => item.startsWith('--'));
  if (unknown) throw new Error(`Unknown option ${unknown}. A difference is accepted one by one: --accept "<case>" --reason "<why>".\n${SMOKE_USAGE}`);
  if (cases.length !== reasons.length) throw new Error(`Each --accept needs its own --reason (${cases.length} --accept, ${reasons.length} --reason).\n${SMOKE_USAGE}`);
  const [module, subject, outDir] = args;
  if (!module || !subject) throw new Error(SMOKE_USAGE);
  return { module, subject, outDir, against, write, dry, by, accept: cases.map((item, index) => ({ case: item, reason: reasons[index] })) };
}

if (process.argv[1] && process.argv[1].endsWith('smokeCli.ts')) void (async () => {
  const args = parseSmokeArgs(process.argv.slice(2));
  if (args.write) {
    const { smokeWrite } = await import('/_102021_/l2/agentMaterializeL1/testing/smoke/smokeWrite.js');
    const result = await smokeWrite(args.module, args.subject, { outDir: args.outDir, dry: args.dry, by: args.by, ...(args.accept.length ? { accept: args.accept } : {}) });
    console.log(result.text);
    process.exit(result.problems.length || result.file.blocks.length ? 1 : 0);
  } else if (args.against) {
    const { differences, text } = smokeAgainst(args.module, args.subject, args.against, args.outDir);
    console.log(`${args.module}: ${args.against} -> ${args.subject}: ${differences.length} difference(s)\n${text}`);
  } else {
    const report = smokeModule(args.module, args.subject, args.outDir);
    console.log(`${args.module}@${args.subject}: ${report.routes} routes, ${report.executed} runs, ${report.seconds}s`);
  }
})();
