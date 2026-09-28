/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1ApprovalIo.ts" enhancement="_blank"/>

/**
 * Store side of the approval: reads the pool boxes, the planner trace and the accepted artifacts,
 * writes `approval.json` and consumes the implement (trace first, then delete).
 * The agent graph stays inside agentDefsL1 (d1CreateAgentGraph guard): I/O goes through `d1Stor`
 * on `mls.stor`, and only the pool *types* come from 102035. Message shape, name rule and trace line
 * follow `solution/pool.ts` (`normalizePoolMessage`, `isPoolMessageShortName`, `tracePoolAt`,
 * `deletePoolMessageAt`); `d1Approval.test.ts` reads the trace back with the pool lib.
 */

import type { PoolBox, PoolMessage } from '/_102035_/l2/solution/pool.js';
import {
  inputFile,
  plannerPipelineFile,
  ownedFolder,
  type D1FileInfo,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  approvalConsumed,
  changedInputs,
  decideApproval,
  hashPaths,
  parseApprovalRecord,
  type D1ApprovalDecision,
  type D1ApprovalRecord,
  type D1BoxEntry,
} from '/_102021_/l2/agentDefsL1/helpers/d1Approval.js';
import { readJson, readText, removePoolMessage, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

/** `l1/<module>/pipeline/agentDefsL1/approval.json` — the provenance of the accepted plan. */
export function approvalFile(project: number, moduleName: string): D1FileInfo {
  return { project, level: 1, folder: ownedFolder(moduleName), shortName: 'approval', extension: '.json' };
}

const POOL_BOXES: readonly PoolBox[] = ['l1', 'l2', 'l4'];
const POOL_MAX_ROUND = 3;

/** Same rule as `isPoolMessageShortName`: `<stamp>_<thread>_<round>`. */
function isPoolMessageShortName(shortName: string): boolean {
  return /^\d{14}_.+_\d+$/u.test(shortName);
}

/** Pool display path (`l4/<folder>/<name>.json`), the trace id of the pool lib. */
function poolDisplayPath(file: D1FileInfo): string {
  return `l${file.level}/${file.folder ? `${file.folder}/` : ''}${file.shortName}${file.extension}`;
}

/** Same checks as `normalizePoolMessage`; throws with the named cause. */
function toPoolMessage(value: unknown): PoolMessage {
  const fail = (reason: string): never => { throw new Error(`[pool] ${reason}`); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('message must be a JSON object');
  const raw = value as Record<string, unknown>;
  for (const field of ['from', 'to', 'thread', 'round', 'mode', 'subject', 'artifacts', 'body']) {
    if (raw[field] === undefined || raw[field] === null) fail(`message.${field} is missing`);
  }
  const box = (field: 'from' | 'to'): PoolBox => {
    const item = raw[field];
    if (typeof item !== 'string' || !(POOL_BOXES as readonly string[]).includes(item)) fail(`message.${field} must be one of ${POOL_BOXES.join('|')}`);
    return item as PoolBox;
  };
  const from = box('from');
  const to = box('to');
  if (from === to) fail(`message.from and message.to are both '${from}'`);
  const thread = typeof raw.thread === 'string' ? raw.thread.trim() : '';
  if (!/^[A-Za-z0-9]+-\d{14}$/.test(thread)) fail(`message.thread must be '<module>-<yyyymmddhhmmss>'`);
  const round = raw.round;
  if (typeof round !== 'number' || !Number.isInteger(round) || round < 1 || round > POOL_MAX_ROUND) fail(`message.round must be an integer in 1..${POOL_MAX_ROUND}`);
  if (raw.mode !== 'implement' && raw.mode !== 'estimate') fail('message.mode must be one of implement|estimate');
  const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
  if (!subject || subject.includes('\n')) fail('message.subject must be a non-empty single line');
  if (!Array.isArray(raw.artifacts)) fail('message.artifacts must be an array (it may be empty)');
  const artifacts = (raw.artifacts as unknown[]).map((entry, index) => {
    const item = typeof entry === 'string' ? entry.trim() : '';
    if (!item || item.startsWith('/') || item.includes('..')) fail(`message.artifacts[${index}] must be a path relative to the module`);
    return item;
  });
  if (typeof raw.body !== 'string') fail('message.body must be a string');
  return { from, to, thread, round: round as number, mode: raw.mode as PoolMessage['mode'], subject, artifacts, body: raw.body as string };
}

/**
 * Messages of one box, oldest first. The folder is `l4/<module>/pool/<box>` of this project, never
 * a candidate root: this agent reads the accepted plan only. Same name rule as the pool lib.
 */
function boxFiles(project: number, moduleName: string, box: PoolBox): D1FileInfo[] {
  const folder = `${moduleName}/pool/${box}`;
  const found = Object.values(mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>)
    .filter((file): file is mls.stor.IFileInfo => !!file
      && file.project === project
      && Number(file.level) === 4
      && file.status !== 'deleted'
      && String(file.folder || '') === folder
      && file.extension === '.json'
      && !!file.shortName
      && isPoolMessageShortName(String(file.shortName)))
    .map(file => ({ project, level: 4, folder, shortName: String(file.shortName), extension: '.json' }));
  return found.sort((left, right) => left.shortName.localeCompare(right.shortName));
}

async function readBox(project: number, moduleName: string, box: PoolBox): Promise<D1BoxEntry[]> {
  const out: D1BoxEntry[] = [];
  for (const info of boxFiles(project, moduleName, box)) {
    const file = poolDisplayPath(info);
    const raw = await readText(info);
    try {
      out.push({ file, message: toPoolMessage(raw === null ? null : JSON.parse(raw)), error: '' });
    } catch (error) {
      out.push({ file, message: null, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return out;
}

export async function readApprovalRecord(project: number, moduleName: string): Promise<D1ApprovalRecord | null> {
  return parseApprovalRecord(await readJson<unknown>(approvalFile(project, moduleName)), project, moduleName);
}

async function hashesFor(project: number, paths: readonly string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  for (const path of paths) {
    const info = fileInfoFromDisplay(project, path);
    const content = info ? await readText(info) : null;
    out[path] = content === null ? null : await sha256Text(content);
  }
  return out;
}

/** Read-only. The caller writes only on `record`, through `writeApproval`. */
export async function loadApproval(project: number, moduleName: string, command: 'run' | 'resume'): Promise<D1ApprovalDecision> {
  const [l1Box, l2Box, planner, record] = await Promise.all([
    readBox(project, moduleName, 'l1'),
    readBox(project, moduleName, 'l2'),
    readJson<unknown>(plannerPipelineFile(project, moduleName)),
    readApprovalRecord(project, moduleName),
  ]);
  const hashes = await hashesFor(project, hashPaths(moduleName, l1Box, record));
  return decideApproval({ project, moduleName, command, l1Box, l2Box, planner, record, hashes });
}

export async function writeApproval(record: D1ApprovalRecord): Promise<void> {
  await writeJson(approvalFile(record.project, record.moduleName), record);
}

/**
 * The defs are the accepted plan only if input20 read the same bytes the approval recorded and
 * those bytes are still the current ones. Otherwise the implement stays (not consumed).
 */
async function builtFromApproval(record: D1ApprovalRecord): Promise<boolean> {
  const snapshot = await readJson<{ sources?: Array<{ path?: unknown; sha256?: unknown }> }>(inputFile(record.project, record.moduleName));
  const read = new Map((snapshot?.sources || []).map(source => [String(source.path || ''), String(source.sha256 || '')]));
  if (record.inputs.some(input => read.has(input.path) && read.get(input.path) !== input.sha256)) return false;
  const current = await hashesFor(record.project, record.inputs.map(input => input.path));
  return changedInputs(record, current).length === 0;
}

/**
 * After finalize80 approved the defs: trace `processed` on approval.json, then delete the implement.
 * A crash between the two leaves the trace; the next pass only deletes. Without a record this is a
 * no-op (the entry refused already). Returns the display path deleted, or ''.
 */
export async function consumeApproval(project: number, moduleName: string, now: Date): Promise<string> {
  const record = await readApprovalRecord(project, moduleName);
  if (!record) return '';
  const message = boxFiles(project, moduleName, 'l1').find(info => poolDisplayPath(info) === record.message.file) || null;
  if (!approvalConsumed(record)) {
    if (!message) return '';
    if (!(await builtFromApproval(record))) return '';
    record.pool = [...record.pool, {
      at: now.toISOString(),
      file: record.message.file,
      from: record.message.from,
      to: record.message.to,
      thread: record.message.thread,
      round: record.message.round,
      mode: 'implement',
      outcome: 'processed',
    }];
    await writeApproval(record);
  }
  if (!message) return '';
  // Delete only after the trace line is on disk (same rule as `deletePoolMessageAt`).
  const traced = await readApprovalRecord(project, moduleName);
  if (!traced || !approvalConsumed(traced)) throw new Error(`refusing to delete ${record.message.file}: no processed trace in approval.json`);
  await removePoolMessage(message);
  return record.message.file;
}
