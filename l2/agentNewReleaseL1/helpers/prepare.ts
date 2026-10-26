/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/prepare.ts" enhancement="_blank"/>

import {
  displayPath,
  fileExists,
  moduleFile,
  readSourceText,
  writeSourceText,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import { removeIndexed, type PreparedRecord } from '/_102021_/l2/agentNewReleaseL1/helpers/undo.js';

const CREATION_BUCKETS = ['usecases', 'endpoints', 'ports', 'tables', 'testSupport', 'screens'] as const;
const EFFORT_TOTAL_BUCKETS = ['screens', 'endpoints', 'usecases', 'tables'] as const;
const COUNTED_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'done'] as const;

export type PrepareOutcome =
  | { ok: true; text: string }
  | { ok: false; kind: 'refused' | 'failed'; text: string };

/** `@@agentNewReleaseL1 <module>`: move `l1/<module>` aside and write a creation copy of the plan. */
export async function prepareModule(moduleName: string): Promise<PrepareOutcome> {
  const project = mls.actualProject || 0;
  const oldRoot = `${moduleName}_old`;
  if (listModuleFiles(project, oldRoot).length > 0) {
    return { ok: false, kind: 'refused', text: `l1/${oldRoot} already exists` };
  }
  const effort = changeEffortOf(moduleName);
  if (!fileExists(effort)) {
    return { ok: false, kind: 'refused', text: `changeEffort.json not found: ${displayPath(effort)}` };
  }
  const sources = listModuleFiles(project, moduleName);
  if (sources.length === 0) {
    return { ok: false, kind: 'refused', text: `l1/${moduleName} has no files` };
  }

  const moved: Array<{ info: Ns5FileInfo; path: string; text: string }> = [];
  for (const file of sources) {
    const info = asFileInfo(file);
    const path = displayPath(info);
    moved.push({ info, path, text: await readSourceText(info) });
  }

  const writtenCopies: Ns5FileInfo[] = [];
  const deleted: Array<{ info: Ns5FileInfo; text: string }> = [];
  const savedWrites: Ns5FileInfo[] = [];
  const l4Before = await readL4Snapshot(moduleName);
  try {
    for (const file of moved) {
      const copy = shifted(file.info, moduleName, oldRoot);
      writtenCopies.push(copy);
      await writeSourceText(copy, file.text);
    }
    for (const file of moved) {
      await removeIndexed(file.info);
      deleted.push({ info: file.info, text: file.text });
    }

    const backendInfo = l4File(moduleName, 'pool/l2/web', 'backend');
    const effortInfo = l4File(moduleName, 'pool/l2/web', 'effort');
    if (!l4Before.backend || !l4Before.effort) {
      throw new Error(`creation plan is missing ${displayPath(l4Before.backend ? effortInfo : backendInfo)}`);
    }
    const savedBackend = savedFile(moduleName, 'pool/l2/web', 'backend');
    const savedEffort = savedFile(moduleName, 'pool/l2/web', 'effort');
    await writeSourceText(savedBackend, l4Before.backend);
    savedWrites.push(savedBackend);
    await writeSourceText(savedEffort, l4Before.effort);
    savedWrites.push(savedEffort);
    await writeSourceText(backendInfo, creationText(l4Before.backend, false));
    await writeSourceText(effortInfo, creationText(l4Before.effort, true));

    const plannerInfo = plannerFile(moduleName, false);
    const tobeInfo = plannerFile(moduleName, true);
    const savedPlanner = savedFile(moduleName, 'pool/l1', 'pipeline');
    const absentInfo = absenceMarker(moduleName);
    let plannerAbsent = false;
    if (l4Before.planner != null) {
      await writeSourceText(savedPlanner, l4Before.planner);
      savedWrites.push(savedPlanner);
      await writeSourceText(plannerInfo, rewrittenPlanner(l4Before.planner, moduleName));
    } else {
      plannerAbsent = true;
      const source = l4Before.tobePlanner;
      await writeSourceText(absentInfo, `${JSON.stringify({ path: displayPath(plannerInfo) })}\n`);
      savedWrites.push(absentInfo);
      const body = source == null
        ? minimalPlanner(moduleName)
        : rewrittenPlanner(source, moduleName);
      await writeSourceText(plannerInfo, body);
    }

    const record: PreparedRecord = {
      at: new Date().toISOString(),
      moved: moved.map(file => file.path),
      saved: savedWrites.map(displayPath),
      plannerAbsent,
    };
    const preparedInfo = preparedFile(moduleName);
    await writeSourceText(preparedInfo, `${JSON.stringify(record, null, 2)}\n`);
    return {
      ok: true,
      text: `prepared\n@@agentDefsL1 ${moduleName} /run\n@@agentNewReleaseL1 ${moduleName} /compare`,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    try {
      for (const file of deleted) await writeSourceText(file.info, file.text);
      for (const copy of [...writtenCopies, ...savedWrites, preparedFile(moduleName)]) await removeIndexed(copy);
      if (l4Before.backend != null) await writeSourceText(l4File(moduleName, 'pool/l2/web', 'backend'), l4Before.backend);
      if (l4Before.effort != null) await writeSourceText(l4File(moduleName, 'pool/l2/web', 'effort'), l4Before.effort);
      if (l4Before.planner != null) await writeSourceText(plannerFile(moduleName, false), l4Before.planner);
      else await removeIndexed(plannerFile(moduleName, false));
    } catch (rollbackError) {
      const detail = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      return { ok: false, kind: 'failed', text: `${reason}\nrollback failed: ${detail}` };
    }
    return { ok: false, kind: 'failed', text: reason };
  }
}

function creationText(source: string, withTotals: boolean): string {
  const doc = JSON.parse(source) as Record<string, unknown>;
  for (const bucket of CREATION_BUCKETS) {
    const rows = doc[bucket];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const record = row as Record<string, unknown>;
      if (record.status !== 'done' && record.status !== 'toUpdate') continue;
      record.status = 'toCreate';
      record.existing = '';
    }
  }
  if (withTotals) syncEffortTotals(doc);
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function rewrittenPlanner(source: string, moduleName: string): string {
  const folder = moduleFile(moduleName).folder;
  const fromPrefix = `l4/${folder}/tobe/plan/`;
  const toPrefix = `l4/${folder}/`;
  const doc = rewriteStrings(JSON.parse(source) as unknown, fromPrefix, toPrefix);
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('planner record is not an object');
  ensurePlanner(doc as Record<string, unknown>, `${toPrefix}pool/l2/web/backend.json`);
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function syncEffortTotals(doc: Record<string, unknown>): void {
  const totals = rec(doc.totals);
  doc.totals = totals;
  for (const bucket of EFFORT_TOTAL_BUCKETS) {
    const counts: Record<(typeof COUNTED_STATUSES)[number], number> = { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 };
    const rows = Array.isArray(doc[bucket]) ? doc[bucket] as unknown[] : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const status = (row as Record<string, unknown>).status;
      if (status === 'toCreate' || status === 'toUpdate' || status === 'toRemove' || status === 'done') counts[status] += 1;
    }
    totals[bucket] = { ...rec(totals[bucket]), ...counts };
  }
}

function ensurePlanner(doc: Record<string, unknown>, backendArtifact: string): void {
  if (!doc.flowId) doc.flowId = 'agentPlannerL1';
  if (!doc.thread) doc.thread = 'prepared';
  if (!doc.schemaVersion) doc.schemaVersion = '2026-09-20-p1-pipeline-v1';
  const steps = rec(doc.steps);
  doc.steps = steps;
  const plan20 = rec(steps.plan20);
  steps.plan20 = plan20;
  if (!plan20.status) plan20.status = 'approved';
  const paths = Array.isArray(plan20.artifactPaths) ? plan20.artifactPaths.map(item => String(item)) : [];
  if (!paths.includes(backendArtifact)) paths.push(backendArtifact);
  plan20.artifactPaths = paths;
}

function minimalPlanner(moduleName: string): string {
  const folder = moduleFile(moduleName).folder;
  const doc: Record<string, unknown> = {};
  ensurePlanner(doc, `l4/${folder}/pool/l2/web/backend.json`);
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function rewriteStrings(value: unknown, fromPrefix: string, toPrefix: string): unknown {
  if (typeof value === 'string') return value.split(fromPrefix).join(toPrefix);
  if (Array.isArray(value)) return value.map(item => rewriteStrings(item, fromPrefix, toPrefix));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = rewriteStrings(item, fromPrefix, toPrefix);
    return out;
  }
  return value;
}

async function readL4Snapshot(moduleName: string): Promise<{
  backend: string | null;
  effort: string | null;
  planner: string | null;
  tobePlanner: string | null;
}> {
  return {
    backend: await readOptional(l4File(moduleName, 'pool/l2/web', 'backend')),
    effort: await readOptional(l4File(moduleName, 'pool/l2/web', 'effort')),
    planner: await readOptional(plannerFile(moduleName, false)),
    tobePlanner: await readOptional(plannerFile(moduleName, true)),
  };
}

async function readOptional(info: Ns5FileInfo): Promise<string | null> {
  if (!fileExists(info)) return null;
  return readSourceText(info);
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

/** `l4/<module>/pool/l4/changeEffort.json`, same folder rule as `moduleFile`. */
function changeEffortOf(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return { project: base.project, level: base.level, folder: `${base.folder}/pool/l4`, shortName: 'changeEffort', extension: '.json' };
}

function l4File(moduleName: string, tail: string, shortName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return { project: base.project, level: 4, folder: `${base.folder}/${tail}`, shortName, extension: '.json' };
}

function plannerFile(moduleName: string, tobe: boolean): Ns5FileInfo {
  const tail = tobe ? 'tobe/plan/pool/l1' : 'pool/l1';
  return l4File(moduleName, tail, 'pipeline');
}

function savedFile(moduleName: string, tail: string, shortName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 1,
    folder: `${moduleName}_old/pipeline/agentNewReleaseL1/saved/l4/${base.folder}/${tail}`,
    shortName,
    extension: '.json',
  };
}

function absenceMarker(moduleName: string): Ns5FileInfo {
  return {
    project: moduleFile(moduleName).project,
    level: 1,
    folder: `${moduleName}_old/pipeline/agentNewReleaseL1/saved`,
    shortName: 'plannerAbsent',
    extension: '.json',
  };
}

function preparedFile(moduleName: string): Ns5FileInfo {
  return {
    project: moduleFile(moduleName).project,
    level: 1,
    folder: `${moduleName}_old/pipeline/agentNewReleaseL1`,
    shortName: 'prepared',
    extension: '.json',
  };
}

function shifted(info: Ns5FileInfo, from: string, to: string): Ns5FileInfo {
  const folder = info.folder === from ? to : `${to}${info.folder.slice(from.length)}`;
  return { project: info.project, level: 1, folder, shortName: info.shortName, extension: info.extension };
}

function asFileInfo(file: mls.stor.IFileInfo): Ns5FileInfo {
  return {
    project: Number(file.project),
    level: 1,
    folder: String(file.folder || ''),
    shortName: String(file.shortName),
    extension: String(file.extension),
  };
}

function listModuleFiles(project: number, rootFolder: string): mls.stor.IFileInfo[] {
  const files: mls.stor.IFileInfo[] = [];
  for (const file of Object.values(mls.stor.files || {})) {
    if (!file || file.status === 'deleted') continue;
    if (Number(file.project) !== project || Number(file.level) !== 1) continue;
    const folder = String(file.folder || '');
    if (folder !== rootFolder && !folder.startsWith(`${rootFolder}/`)) continue;
    if (!file.shortName || !file.extension) continue;
    files.push(file);
  }
  files.sort((left, right) => displayPath(asFileInfo(left)).localeCompare(displayPath(asFileInfo(right))));
  return files;
}
