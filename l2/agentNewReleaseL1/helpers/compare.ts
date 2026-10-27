/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/compare.ts" enhancement="_blank"/>

import {
  displayPath,
  fileExists,
  moduleFile,
  readSourceText,
  writeSourceText,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import { keptLines } from '/_102021_/l2/agentNewReleaseL1/helpers/keptUsecases.js';
import { removeIndexed, undoPrepared, type PreparedRecord } from '/_102021_/l2/agentNewReleaseL1/helpers/undo.js';

export type CompareOutcome =
  | { ok: true; text: string }
  | { ok: false; kind: 'refused' | 'failed'; text: string };

type Verdict = 'igual' | 'mudou' | 'nova' | 'removida';

interface ListedFile {
  info: Ns5FileInfo;
  rel: string;
}

interface UnitRow {
  kind: string;
  id: string;
  verdict: Verdict;
  path: string;
  rel: string;
  /** Restore the old def and drop sibling sources. Set when old code cites a removed or reshaped field. */
  citeField?: { field: string; op: 'removed' | 'changed' };
}

const SHAPE_KEYS = ['type', 'values', 'required', 'collection', 'to'] as const;

/** `@@agentNewReleaseL1 <module> /compare`. Restores the plan on every path and drops `_old` last. */
export async function compareModule(moduleName: string): Promise<CompareOutcome> {
  const project = mls.actualProject || 0;
  const oldRoot = `${moduleName}_old`;
  if (listUnder(project, oldRoot).length === 0) {
    return { ok: false, kind: 'refused', text: 'no prepared run' };
  }
  const gate = await generatorGate(moduleName);
  if (!gate.complete) {
    const undone = await undoPrepared(moduleName);
    if (!undone.ok) {
      const at = pathOfError(undone.text);
      return { ok: false, kind: 'failed', text: `${gate.reason}\nkept ${moduleName}_old: restore failed at ${at}` };
    }
    return { ok: false, kind: 'failed', text: gate.reason };
  }

  let lines: string[];
  try {
    const freshFiles = listUnder(project, moduleName).map(file => listedOf(file, moduleName)).filter((file): file is ListedFile => !!file);
    const oldFiles = listUnder(project, oldRoot).map(file => listedOf(file, oldRoot)).filter((file): file is ListedFile => !!file);
    const freshDefs = new Map(freshFiles.filter(file => isDef(file.rel)).map(file => [file.rel, file]));
    const oldDefs = new Map(oldFiles.filter(file => isDef(file.rel)).map(file => [file.rel, file]));
    const texts = new Map<string, string>();
    for (const file of [...freshDefs.values(), ...oldDefs.values()]) texts.set(storeKey(file.info), await readSourceText(file.info));
    const rows = rowsOf(moduleName, freshDefs, oldDefs, texts);
    await markCitedFields(moduleName, rows, oldFiles);
    const allEqual = rows.every(row => row.verdict === 'igual');
    const engineBack = workflowEngineBack(rows);
    const copies = await stageCopies(moduleName, rows, oldFiles, allEqual, engineBack);
    for (const copy of copies) await writeSourceText(copy.info, copy.text);
    for (const drop of dropsOf(rows, freshFiles, oldFiles, engineBack)) await removeIndexed(drop);
    const kept = await readKept(moduleName);
    await restorePlan(moduleName);
    lines = rows.map(row => lineOf(row));
    lines.push(...await effortLines(moduleName, rows));
    lines.push(...costLines(gate.report));
    lines.push(...keptLines(kept));
    lines.push('creation plan: written and undone', 'planner run: written and undone', `@@agentMaterializeL1 {"scope":"${moduleName}"}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // `_old` is the only good copy until the module is whole again. Put `l1/<mod>` and the plan back first, and drop `_old` only after that.
    const undone = await undoPrepared(moduleName);
    if (!undone.ok) {
      return { ok: false, kind: 'failed', text: `${reason}\nkept ${moduleName}_old: restore failed at ${pathOfError(undone.text)}` };
    }
    return { ok: false, kind: 'failed', text: `restored after ${reason}; creation plan: undone` };
  }

  // The module is final here. A failure while dropping `_old` leaves it, and the closure says so.
  try {
    for (const file of listUnder(project, oldRoot)) await removeIndexed(asInfo(file));
  } catch (error) {
    return { ok: false, kind: 'failed', text: `kept ${moduleName}_old: delete failed at ${pathOfError(error)}` };
  }
  return { ok: true, text: lines.join('\n') };
}

function lineOf(row: UnitRow): string {
  if (!row.citeField) return `${row.kind} ${row.id}: ${row.verdict} ${row.path}`;
  const label = row.citeField.op === 'changed' ? 'changed field' : 'removed field';
  return `${row.kind} ${row.id}: ${row.verdict} (code cites ${label} ${row.citeField.field}) ${row.path}`;
}

function pathOfError(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  const at = /(?: at |: )(l\d\/\S+)/u.exec(detail);
  return at?.[1] || detail;
}

/** Parsed definition without model prose (`doc` at any depth) and without the envelope `status`. Keys are sorted. */
export function structureOf(source: string): unknown {
  return canonicalize(stripEnvelope(parseDefinition(source)));
}

function parseDefinition(source: string): Record<string, unknown> {
  const matched = source.match(/export const definition = (\{[\s\S]*\}) as const;/u);
  if (!matched) throw new Error('definition export is missing');
  const parsed = JSON.parse(matched[1]) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('definition is not an object');
  return parsed as Record<string, unknown>;
}

function stripEnvelope(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => stripDoc(item));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'status') continue;
    out[key] = stripDoc(item);
  }
  return out;
}

function stripDoc(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => stripDoc(item));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'doc') continue;
    out[key] = stripDoc(item);
  }
  return out;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => canonicalize(item));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    out[key] = canonicalize((value as Record<string, unknown>)[key]);
  }
  return out;
}

async function generatorGate(moduleName: string): Promise<{ complete: boolean; reason: string; report: Record<string, unknown> | null }> {
  const reportInfo = defsFile(moduleName, 'report');
  const pipelineInfo = defsFile(moduleName, 'pipeline');
  const pipeline = fileExists(pipelineInfo) ? parseObject(await readSourceText(pipelineInfo)) : null;
  if (!fileExists(reportInfo)) return { complete: false, reason: pipelineReason(pipeline) || 'no generator report', report: null };
  const report = parseObject(await readSourceText(reportInfo));
  if (!report) return { complete: false, reason: pipelineReason(pipeline) || 'no generator report', report: null };
  if (report.outcome === 'complete' && report.defsStatus === 'complete') return { complete: true, reason: '', report };
  const blocking = typeof report.blocking === 'string' ? report.blocking.trim() : '';
  return { complete: false, reason: blocking || pipelineReason(pipeline) || 'no generator report', report };
}

function pipelineReason(pipeline: Record<string, unknown> | null): string {
  if (!pipeline) return '';
  const waiting = typeof pipeline.awaitingStep === 'string' ? pipeline.awaitingStep : '';
  const error = typeof pipeline.error === 'string' ? pipeline.error : '';
  return [waiting ? `awaitingStep ${waiting}` : '', error].filter(Boolean).join('; ');
}

function parseObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`agentNewReleaseL1 could not parse a generator file: ${reason}`);
    return null;
  }
}

function rowsOf(
  moduleName: string,
  fresh: Map<string, ListedFile>,
  previous: Map<string, ListedFile>,
  texts: Map<string, string>,
): UnitRow[] {
  const rels = [...new Set([...fresh.keys(), ...previous.keys()])].sort();
  return rels.map(rel => {
    const next = fresh.get(rel);
    const prior = previous.get(rel);
    const verdict: Verdict = !prior ? 'nova' : !next ? 'removida' : sameText(texts, next, prior) ? 'igual' : 'mudou';
    const sample = (next || prior) as ListedFile;
    const parsed = definitionOrNull(texts.get(storeKey(sample.info)) || '');
    const kind = typeof parsed?.artifactType === 'string' ? parsed.artifactType : 'def';
    const id = typeof parsed?.artifactId === 'string' ? parsed.artifactId : rel.split('/').pop()?.replace(/\.defs\.ts$/u, '') || 'unknown';
    const path = `l1/${moduleName}/${rel}`;
    return { kind, id, verdict, path, rel };
  });
}

function sameText(texts: Map<string, string>, next: ListedFile, prior: ListedFile): boolean {
  try {
    const left = structureOf(texts.get(storeKey(next.info)) || '');
    const right = structureOf(texts.get(storeKey(prior.info)) || '');
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`agentNewReleaseL1 could not compare ${next.rel}: ${reason}`);
    return false;
  }
}

function definitionOrNull(source: string): Record<string, unknown> | null {
  try {
    return parseDefinition(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`agentNewReleaseL1 could not read a definition: ${reason}`);
    return null;
  }
}

function isDef(rel: string): boolean {
  return rel.endsWith('.defs.ts') && !rel.startsWith('pipeline/') && !rel.startsWith('materialization/');
}

const MASTER_PROJECT = '102021';
const ENGINE_REL = 'layer_1_external/adapters/workflow/engine.ts';
const TICK_REL = 'layer_1_external/adapters/persistence/moduleTick.ts';
const RUN_COST_ABSENT = 'run cost: not recorded by the defs generator; read it from the /run task';

/** Warning only. A missing or unreadable effort never changes what was restored. */
async function effortLines(moduleName: string, rows: readonly UnitRow[]): Promise<string[]> {
  const info = changeEffortOf(moduleName);
  if (!fileExists(info)) return [`effort check: not available (${displayPath(info)} not found)`];
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readSourceText(info));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`agentNewReleaseL1 could not read changeEffort.json: ${reason}`);
    return [`effort check: not available (${reason})`];
  }
  const perItem = perItemOf(parsed);
  if (!perItem) return ['effort check: not available (perItem is missing)'];
  const listed = masterUnits(perItem);
  if (!listed.sawMaster) return [`effort check: not available (no answer from master ${MASTER_PROJECT})`];
  const byPath = new Map(rows.map(row => [row.path, row]));
  const effortPaths = new Set(listed.units.map(unit => unit.path));
  for (const unit of listed.units) {
    if (unit.kind !== 'request') continue;
    for (const row of rows) {
      if (row.kind === 'controller' && row.id === unit.id) effortPaths.add(row.path);
    }
  }
  const lines: string[] = [];
  for (const row of rows) {
    if (row.verdict === 'igual') continue;
    if (effortPaths.has(row.path)) continue;
    lines.push(`effort missing: ${row.kind} ${row.id} ${row.path}: changed and not in the effort (defect)`);
  }
  const warned = new Set<string>();
  for (const unit of listed.units) {
    if (warned.has(unit.path)) continue;
    const row = byPath.get(unit.path);
    if (!row || row.verdict !== 'igual') continue;
    warned.add(unit.path);
    lines.push(`effort extra: ${unit.kind} ${unit.id} ${unit.path}: in the effort and unchanged (inefficiency)`);
  }
  if (lines.length === 0) return ['effort check: matches'];
  return lines;
}

function perItemOf(value: unknown): unknown[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const perItem = (value as { perItem?: unknown }).perItem;
  return Array.isArray(perItem) ? perItem : null;
}

function masterUnits(perItem: readonly unknown[]): { sawMaster: boolean; units: Array<{ kind: string; id: string; path: string }> } {
  const units: Array<{ kind: string; id: string; path: string }> = [];
  let sawMaster = false;
  for (const row of perItem) {
    if (!row || typeof row !== 'object') continue;
    const answers = (row as { answers?: unknown }).answers;
    if (!Array.isArray(answers)) continue;
    for (const answer of answers) {
      if (!answer || typeof answer !== 'object') continue;
      const master = (answer as { master?: { project?: unknown } }).master;
      if (!master || String(master.project) !== MASTER_PROJECT) continue;
      sawMaster = true;
      for (const bucket of ['create', 'regenerateDefs', 'remove'] as const) {
        const list = (answer as Record<string, unknown>)[bucket];
        if (!Array.isArray(list)) continue;
        for (const unit of list) {
          if (!unit || typeof unit !== 'object') continue;
          const record = unit as { kind?: unknown; id?: unknown; path?: unknown };
          if (typeof record.path !== 'string' || !record.path) continue;
          units.push({
            kind: typeof record.kind === 'string' ? record.kind : 'def',
            id: typeof record.id === 'string' ? record.id : 'unknown',
            path: record.path,
          });
        }
      }
    }
  }
  return { sawMaster, units };
}

function costLines(report: Record<string, unknown> | null): string[] {
  const cost = report?.cost;
  if (!cost || typeof cost !== 'object' || Array.isArray(cost)) return [RUN_COST_ABSENT];
  const record = cost as { total?: unknown; byPhase?: unknown };
  if (record.total === undefined || !record.byPhase || typeof record.byPhase !== 'object' || Array.isArray(record.byPhase)) {
    return [RUN_COST_ABSENT];
  }
  const phases = Object.keys(record.byPhase).sort();
  const calls = phases.map(phase => {
    const row = (record.byPhase as Record<string, unknown>)[phase];
    const callsOf = row && typeof row === 'object' ? (row as { calls?: unknown; n?: unknown; cost?: unknown }) : {};
    const count = typeof callsOf.calls === 'number' ? callsOf.calls : typeof callsOf.n === 'number' ? callsOf.n : 0;
    const amount = typeof callsOf.cost === 'number' ? callsOf.cost : 0;
    return `${phase} ${count} $${amount}`;
  });
  return [`run cost: ${String(record.total)}`, `model calls: ${calls.join('; ')}`];
}

/** The workflow engine comes back only when every workflow def of the module is unchanged. */
function workflowEngineBack(rows: readonly UnitRow[]): boolean {
  const flows = rows.filter(row => row.kind === 'workflowProcess');
  return flows.length > 0 && flows.every(row => row.verdict === 'igual');
}

async function stageCopies(
  moduleName: string,
  rows: readonly UnitRow[],
  oldFiles: readonly ListedFile[],
  allEqual: boolean,
  engineBack: boolean,
): Promise<Array<{ info: Ns5FileInfo; text: string }>> {
  const wanted = new Set<string>();
  for (const row of rows) {
    if (row.citeField) {
      wanted.add(row.rel);
      continue;
    }
    if (row.verdict !== 'igual') continue;
    wanted.add(row.rel);
    const source = row.rel.replace(/\.defs\.ts$/u, '.ts');
    wanted.add(source);
    if (row.rel.includes('/controllers/')) wanted.add(source.replace(/\.ts$/u, '.test.ts'));
    const name = row.rel.split('/').pop()?.replace(/\.defs\.ts$/u, '') || '';
    for (const file of oldFiles) {
      if (!file.rel.startsWith('pipeline/agentMaterializeL1/')) continue;
      if (isSharedMaterialize(file.rel)) continue;
      if (namesUnit(file.rel, name)) wanted.add(file.rel);
    }
  }
  if (allEqual) {
    for (const file of oldFiles) {
      if (isSharedRestore(file.rel)) wanted.add(file.rel);
    }
  }
  if (engineBack) {
    wanted.add(ENGINE_REL);
    wanted.add(TICK_REL);
  }
  const copies: Array<{ info: Ns5FileInfo; text: string }> = [];
  for (const file of oldFiles) {
    if (!wanted.has(file.rel)) continue;
    copies.push({ info: onModule(file.info, `${moduleName}_old`, moduleName), text: await readSourceText(file.info) });
  }
  return copies;
}

function dropsOf(
  rows: readonly UnitRow[],
  freshFiles: readonly ListedFile[],
  oldFiles: readonly ListedFile[],
  engineBack: boolean,
): Ns5FileInfo[] {
  const drops: Ns5FileInfo[] = [];
  for (const row of rows) {
    if (row.verdict !== 'mudou' && row.verdict !== 'nova') continue;
    const base = row.rel.replace(/\.defs\.ts$/u, '');
    for (const file of freshFiles) {
      if (file.rel === `${base}.ts` || file.rel === `${base}.test.ts`) drops.push(file.info);
    }
  }
  const oldRels = new Set(oldFiles.map(file => file.rel));
  for (const file of freshFiles) {
    if (file.rel !== ENGINE_REL && file.rel !== TICK_REL) continue;
    if (!engineBack || !oldRels.has(file.rel)) drops.push(file.info);
  }
  return drops;
}

function namesUnit(rel: string, unit: string): boolean {
  const file = rel.split('/').pop() || '';
  const stem = file.replace(/\.[^.]+$/u, '');
  return stem === unit || stem === `${unit}_code` || stem === `${unit}_cases`;
}

function isSharedMaterialize(rel: string): boolean {
  return rel === 'pipeline/agentMaterializeL1/registration.json'
    || rel === 'pipeline/agentMaterializeL1/report.json'
    || rel.startsWith('pipeline/agentMaterializeL1/seedRows/');
}

function isSharedRestore(rel: string): boolean {
  return isSharedMaterialize(rel) || rel.startsWith('materialization/') || rel.includes('/seedRows/');
}

async function readKept(moduleName: string): Promise<NonNullable<PreparedRecord['kept']>> {
  const prepared = preparedFile(moduleName);
  if (!fileExists(prepared)) return [];
  const record = JSON.parse(await readSourceText(prepared)) as PreparedRecord;
  return Array.isArray(record.kept) ? record.kept : [];
}

async function restorePlan(moduleName: string): Promise<void> {
  const prepared = preparedFile(moduleName);
  if (!fileExists(prepared)) throw new Error(`missing ${displayPath(prepared)}`);
  const record = JSON.parse(await readAt(prepared)) as PreparedRecord;
  await writeAt(l4File(moduleName, 'pool/l2/web', 'backend'), await readAt(savedFile(moduleName, 'pool/l2/web', 'backend')));
  await writeAt(l4File(moduleName, 'pool/l2/web', 'effort'), await readAt(savedFile(moduleName, 'pool/l2/web', 'effort')));
  const planner = l4File(moduleName, 'pool/l1', 'pipeline');
  if (record.plannerAbsent) {
    await removeIndexed(planner);
    return;
  }
  await writeAt(planner, await readAt(savedFile(moduleName, 'pool/l1', 'pipeline')));
}

async function readAt(info: Ns5FileInfo): Promise<string> {
  try {
    return await readSourceText(info);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${reason} at ${displayPath(info)}`);
  }
}

async function writeAt(info: Ns5FileInfo, text: string): Promise<void> {
  try {
    await writeSourceText(info, text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${reason} at ${displayPath(info)}`);
  }
}

async function markCitedFields(moduleName: string, rows: UnitRow[], oldFiles: readonly ListedFile[]): Promise<void> {
  const hits = await fieldHits(moduleName);
  if (hits.length === 0) return;
  const byRel = new Map(oldFiles.map(file => [file.rel, file]));
  for (const row of rows) {
    if (row.verdict !== 'igual') continue;
    const sourceRel = row.rel.replace(/\.defs\.ts$/u, '.ts');
    const testRel = row.rel.includes('/controllers/') ? sourceRel.replace(/\.ts$/u, '.test.ts') : '';
    const source = await textOf(byRel.get(sourceRel));
    const test = testRel ? await textOf(byRel.get(testRel)) : '';
    const cited = hits.find(hit => citesWholeWord(source, hit.segment) || citesWholeWord(test, hit.segment));
    if (!cited) continue;
    row.verdict = 'mudou';
    row.citeField = { field: cited.segment, op: cited.op };
  }
}

async function textOf(file: ListedFile | undefined): Promise<string> {
  if (!file) return '';
  return readSourceText(file.info);
}

interface FieldHit { segment: string; op: 'removed' | 'changed' }

async function fieldHits(moduleName: string): Promise<FieldHit[]> {
  const info = changeEffortOf(moduleName);
  if (!fileExists(info)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readSourceText(info));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`agentNewReleaseL1 could not read changeEffort.json for field cites: ${reason}`);
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  const items = (parsed as { request?: { items?: unknown } }).request?.items;
  if (!Array.isArray(items)) return [];
  const hits: FieldHit[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as { kind?: unknown; op?: unknown; before?: unknown; after?: unknown; changeId?: unknown };
    if (rec.kind !== 'field') continue;
    const fieldId = fieldIdOf(rec);
    const segment = lastSegment(fieldId);
    if (!segment) continue;
    if (rec.op === 'removed') {
      hits.push({ segment, op: 'removed' });
      continue;
    }
    if (rec.op === 'changed' && shapeChanged(rec.before, rec.after)) hits.push({ segment, op: 'changed' });
  }
  return hits;
}

function fieldIdOf(rec: { before?: unknown; changeId?: unknown }): string {
  const before = rec.before && typeof rec.before === 'object' && !Array.isArray(rec.before)
    ? (rec.before as { fieldId?: unknown }).fieldId
    : undefined;
  if (typeof before === 'string' && before) return before;
  const changeId = typeof rec.changeId === 'string' ? rec.changeId : '';
  return changeId.startsWith('field:') ? changeId.slice('field:'.length) : changeId;
}

function lastSegment(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot < 0 ? path : path.slice(dot + 1);
}

function citesWholeWord(text: string, segment: string): boolean {
  if (!segment || !text) return false;
  const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_$])${escaped}([^A-Za-z0-9_$]|$)`).test(text);
}

function shapeChanged(before: unknown, after: unknown): boolean {
  const left = before && typeof before === 'object' && !Array.isArray(before) ? before as Record<string, unknown> : {};
  const right = after && typeof after === 'object' && !Array.isArray(after) ? after as Record<string, unknown> : {};
  return SHAPE_KEYS.some(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
}

function onModule(info: Ns5FileInfo, from: string, to: string): Ns5FileInfo {
  const folder = info.folder === from ? to : `${to}${info.folder.slice(from.length)}`;
  return { project: info.project, level: 1, folder, shortName: info.shortName, extension: info.extension };
}

function listedOf(file: mls.stor.IFileInfo, root: string): ListedFile | null {
  const info = asInfo(file);
  const folder = info.folder;
  if (folder !== root && !folder.startsWith(`${root}/`)) return null;
  const tail = folder === root ? '' : folder.slice(root.length + 1);
  const rel = tail ? `${tail}/${info.shortName}${info.extension}` : `${info.shortName}${info.extension}`;
  return { info, rel };
}

function storeKey(info: Ns5FileInfo): string {
  return `${info.project}|${info.level}|${info.folder}|${info.shortName}|${info.extension}`;
}

function defsFile(moduleName: string, shortName: string): Ns5FileInfo {
  return {
    project: moduleFile(moduleName).project,
    level: 1,
    folder: `${moduleName}/pipeline/agentDefsL1`,
    shortName,
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

function l4File(moduleName: string, tail: string, shortName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return { project: base.project, level: 4, folder: `${base.folder}/${tail}`, shortName, extension: '.json' };
}

function changeEffortOf(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return { project: base.project, level: base.level, folder: `${base.folder}/pool/l4`, shortName: 'changeEffort', extension: '.json' };
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

function listUnder(project: number, rootFolder: string): mls.stor.IFileInfo[] {
  const files: mls.stor.IFileInfo[] = [];
  for (const file of Object.values(mls.stor.files || {})) {
    if (!file || file.status === 'deleted') continue;
    if (Number(file.project) !== project || Number(file.level) !== 1) continue;
    const folder = String(file.folder || '');
    if (folder !== rootFolder && !folder.startsWith(`${rootFolder}/`)) continue;
    if (!file.shortName || !file.extension) continue;
    files.push(file);
  }
  return files;
}

function asInfo(file: mls.stor.IFileInfo): Ns5FileInfo {
  return {
    project: Number(file.project),
    level: Number(file.level) as 1,
    folder: String(file.folder || ''),
    shortName: String(file.shortName),
    extension: String(file.extension),
  };
}
