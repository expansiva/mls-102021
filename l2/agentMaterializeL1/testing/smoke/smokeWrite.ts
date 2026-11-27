/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smokeWrite.ts" enhancement="_blank"/>

// d1_333: `smokeCli <module> <repository> --write`: the smoke of the WORKING TREE of a module, compared with the commit of the last smoke without a block, and its result written
// to `l1/<module>/pipeline/agentMaterializeL1/smoke.json` (what `buildM12Report` reads to give `complete`). The differences the operator accepts go to `smokeAccepted.json`
// by `--accept <case>` or `--accept-all`, with `--reason` and `--by`, one entry per exact difference. Node only.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { M12_LAYERS } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { M12_SMOKE_VERSION, acceptedEntryProblems, evaluateSmoke, smokeInputsHash, type SmokeAcceptedEntry, type SmokeAcceptedFile, type SmokeFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Smoke.js';
import { compareReports, type SmokeDifference } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokeCompare.js';
import { smokeModule } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokeCli.js';

export interface SmokeWriteOptions {
  outDir?: string;
  /** Case keys to accept (`happy telegram.cm.x [variant]`), or 'all' for every difference of this run. */
  accept?: string[] | 'all';
  reason?: string;
  by?: string;
  /** Only compute and print: nothing is written. */
  dry?: boolean;
}

const runFolder = (repo: string, module: string): string => path.join(repo, 'l1', module, 'pipeline', 'agentMaterializeL1');

function readJson<T>(file: string): T | null {
  try { return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as T : null; } catch { return null; }
}

/** The inputs hash of the module on disk: the receipts of every layer and the contracts, as finalize80 reads them from the stor. */
export async function inputsHashOnDisk(repo: string, module: string): Promise<string> {
  const receipts: Array<{ key: string; outputs: Record<string, string> }> = [];
  for (const layer of M12_LAYERS) {
    const dir = path.join(runFolder(repo, module), layer);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter(item => item.endsWith('.json'))) {
      const status = readJson<{ outputs?: Record<string, string> }>(path.join(dir, name));
      if (status) receipts.push({ key: `${layer}/${name.replace(/\.json$/u, '')}`, outputs: status.outputs ?? {} });
    }
  }
  const contractsDir = path.join(repo, 'l2', module, 'web', 'contracts');
  const contracts = existsSync(contractsDir) ? readdirSync(contractsDir).filter(item => item.endsWith('.defs.ts')).map(name => ({ name, text: readFileSync(path.join(contractsDir, name), 'utf8') })) : [];
  return smokeInputsHash(receipts, contracts);
}

/** The commit that last delivered a `smoke.json` without a block, or null (not a repository, no earlier smoke, or the last one blocked). */
export function lastCleanSmokeCommit(repo: string, module: string): string | null {
  const rel = `l1/${module}/pipeline/agentMaterializeL1/smoke.json`;
  const log = spawnSync('git', ['-C', repo, 'log', '-1', '--format=%H', '--', rel], { encoding: 'utf8' });
  const commit = log.status === 0 ? log.stdout.trim() : '';
  if (!commit) return null;
  const shown = spawnSync('git', ['-C', repo, 'show', `${commit}:${rel}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (shown.status !== 0) return null;
  try {
    const file = JSON.parse(shown.stdout) as SmokeFile;
    return file.schemaVersion === M12_SMOKE_VERSION && file.blocks.length === 0 ? commit : null;
  } catch { return null; }
}

export async function smokeWrite(module: string, repo: string, options: SmokeWriteOptions = {}): Promise<{ file: SmokeFile; text: string; problems: string[] }> {
  const outDir = options.outDir ?? '/tmp/l1sup/fumaca';
  const problems: string[] = [];
  const now = smokeModule(module, repo, outDir);
  const against = lastCleanSmokeCommit(repo, module);
  const differences: SmokeDifference[] = against ? compareReports(smokeModule(module, against, outDir, repo), now) : [];
  const acceptedPath = path.join(runFolder(repo, module), 'smokeAccepted.json');
  const known = readJson<SmokeAcceptedFile>(acceptedPath)?.entries ?? [];
  const entries: SmokeAcceptedEntry[] = [...known];
  if (options.accept) {
    const wanted = options.accept === 'all' ? differences.filter(item => !item.arrival) : differences.filter(item => !item.arrival && (options.accept as string[]).includes(item.key));
    for (const key of options.accept === 'all' ? [] : options.accept) if (!wanted.some(item => item.key === key)) problems.push(`No difference named "${key}" in this run.`);
    if (!against && wanted.length === 0) problems.push('There is nothing to accept: no earlier smoke to compare against.');
    const stamp = { reason: options.reason ?? '', by: options.by ?? '' };
    problems.push(...(wanted.length ? acceptedEntryProblems(stamp) : []));
    if (problems.length === 0) {
      for (const item of wanted) {
        if (entries.some(entry => entry.case === item.key && entry.before === item.before && entry.after === item.after && entry.against === against)) continue;
        entries.push({ case: item.key, before: item.before, after: item.after, against: against as string, reason: stamp.reason.trim(), by: stamp.by.trim(), at: new Date().toISOString() });
      }
    }
  }
  const verdict = evaluateSmoke({ results: now.results, differences, accepted: entries, against });
  const file: SmokeFile = {
    schemaVersion: M12_SMOKE_VERSION,
    module,
    createdAt: new Date().toISOString(),
    against,
    inputsHash: await inputsHashOnDisk(repo, module),
    counts: verdict.counts,
    blocks: verdict.blocks,
    skipped: verdict.skipped,
    arrivals: verdict.arrivals,
    differences,
    accepted: verdict.used,
    stale: verdict.stale,
  };
  const lines = [
    `smoke ${module}: ${file.blocks.length ? `BLOCKED (${file.blocks.length})` : 'no block'}; against ${against ?? 'nothing (criteria 1 to 3 only)'}.`,
    `cases ${file.counts.executed} (ok ${file.counts.ok}, refused ${file.counts.refused}, 5xx ${file.counts.failed}, exception ${file.counts.error}, skipped ${file.counts.skipped}, outside the type ${file.counts.outsideType}); arrivals ${file.arrivals.cases} (report only).`,
    ...file.blocks.map(item => `  BLOCK ${item.kind}: ${item.key} — ${item.detail}`),
    ...file.accepted.map(item => `  accepted: ${item.case} (${item.reason}; ${item.by})`),
    ...file.stale.map(item => `  stale accepted entry: ${item.case} ${item.before} → ${item.after} against ${item.against}`),
    ...file.skipped.map(item => `  skipped (type not resolved): ${item}`),
    ...problems.map(item => `  PROBLEM: ${item}`),
  ];
  if (!options.dry && problems.length === 0) {
    mkdirSync(runFolder(repo, module), { recursive: true });
    writeFileSync(path.join(runFolder(repo, module), 'smoke.json'), `${JSON.stringify(file, null, 2)}\n`);
    if (entries.length !== known.length) writeFileSync(acceptedPath, `${JSON.stringify({ schemaVersion: M12_SMOKE_VERSION, module, entries } satisfies SmokeAcceptedFile, null, 2)}\n`);
  }
  return { file, text: lines.join('\n'), problems };
}
