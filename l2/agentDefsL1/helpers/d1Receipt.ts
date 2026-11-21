/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Receipt.ts" enhancement="_blank"/>

import {
  generatedAllowsSkip,
  M1_RECEIPT_SCHEMA,
  parseDefinitionSource,
  readDefinition,
  receiptPathFor,
  semanticHash,
  type M1Definition,
  type MaterializationReceipt,
} from '/_102021_/l2/helpers/l1Defs/definition.js';
import { displayPath, type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { hashesAgree, sourceIdentityHash } from '/_102021_/l2/helpers/l1Defs/identity.js';
import { futureOutputPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { readText, removeDefFile, writeJson, writeText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { fileInfoFromDisplay, readD1Derivation, readD1Input, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

export const D1_PROGRESS_SCHEMA = '2026-09-22-d1-progress-v1' as const;

/** Steps that commit defs. The unit id is the step id. A worker trace is not one of these files. */
const WRITER_STEPS = ['domain30', 'persistence40', 'usecases50', 'controllers60', 'support70'] as const;

/**
 * d1_222: the `externalConnection` defs the command `/declarations` writes before the L2 have a trace of their own, under the step
 * `support70`, so the receipts of the rest of support70 are not replaced. It is a writer like the others.
 */
export const D1_EXTERNAL_TRACE = { step: 'support70', unitId: 'external' } as const;

/** d1_270: the receipts `/adopt` records (the bytes a manager accepted on a clean tree). Not a writer step: `readWriterReceipts` reads it last and it wins for its paths. */
export const D1_ADOPT_TRACE = { step: 'adopt', unitId: 'adopt' } as const;

export interface D1WriterReceipt {
  defPath: string;
  desiredHash: string;
}

export interface D1UnitPart {
  defPath: string;
  source: string;
  action?: 'write' | 'remove';
  /** Inventoried hash. Empty when this file has no receipt. */
  receiptHash?: string;
  outputTs?: readonly string[];
  /** Present when the def status is blocked. Written beside the def, not inside it. */
  blockReason?: string;
}

export interface D1FileProgress {
  defPath: string;
  action: 'write' | 'remove';
  previousHash: string;
  desiredHash: string;
  /** d1_249: the hash this unit last wrote (or found equal) at this path. Carried over when a later run is refused, so the receipt is not lost with it. */
  written?: string;
  /** d1_270: this row is the manager's `/adopt` of the bytes that were on a clean tree, not a write of this unit. */
  adopted?: boolean;
  status: 'pending' | 'done' | 'conflict';
  outputTs: string[];
}

/**
 * Recovery record for one unit. `transaction` is false because stor has no
 * multi-file transaction and no compare-and-swap. mtime is not a version.
 */
export interface D1UnitProgress {
  schemaVersion: typeof D1_PROGRESS_SCHEMA;
  project: number;
  moduleName: string;
  step: string;
  unitId: string;
  runId: string;
  snapshotHash: string;
  /** d1_248: the key of the L4 and L2 sources the unit was written from. Absent in a progress written before. */
  sourceKey?: string;
  draftHash: string;
  transaction: false;
  finalized: boolean;
  invalidated: boolean;
  reported: string[];
  files: D1FileProgress[];
  issues: string[];
}

export interface D1CommitUnitInput {
  project: number;
  moduleName: string;
  step: string;
  unitId: string;
  draftText: string;
  parts: readonly D1UnitPart[];
  runId?: string;
  snapshotHash?: string;
  /** Test seam. Throws after this many product mutations. */
  failAfterMutations?: number;
  /** Test seam. Runs immediately before the hash is read again. */
  beforeMutate?: (index: number) => Promise<void>;
}

export interface D1CommitUnitResult {
  written: string[];
  removed: string[];
  reported: string[];
  issues: string[];
  finalized: boolean;
  invalidated: boolean;
}

export interface D1FingerprintEntry {
  key: string;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
  hidden: boolean;
  sha256: string;
  mtime: string;
  status: string;
}

type StorLeaf = {
  project?: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
  content?: unknown;
  updatedAt?: string;
  status?: string;
};

interface PlannedFile {
  defPath: string;
  logical: string;
  file: D1FileInfo;
  action: 'write' | 'remove';
  source: string;
  receiptHash: string;
  outputTs: string[];
  previousHash: string;
  desiredHash: string;
  blockReason: string;
}

export function progressFile(project: number, moduleName: string, step: string, unitId: string): D1FileInfo {
  return {
    project,
    level: 1,
    folder: `${moduleName}/pipeline/agentDefsL1/traces`,
    shortName: `${token(step)}${token(unitId)}`,
    extension: '.json',
  };
}

export function logicalDefPath(defPath: string): string {
  return defPath.replace(/^_\d+_\/l1\//, 'l1/');
}

/**
 * True only when every product file of this unit still matches the progress
 * hashes. A checkpoint status of completed is not read and is not proof.
 */
export async function unitIsIntact(
  project: number,
  moduleName: string,
  step: string,
  unitId: string,
  snapshotHash: string,
): Promise<boolean> {
  const progress = await readProgress(project, moduleName, step, unitId);
  if (!progress || !progress.finalized || progress.invalidated) return false;
  if (!snapshotHash || progress.snapshotHash !== snapshotHash) return false;
  const live = await readD1Input(project, moduleName);
  if (live?.snapshotHash && live.snapshotHash !== snapshotHash) return false;
  if (progress.files.length === 0) return false;
  for (const file of progress.files) {
    const info = artifactFile(project, file.defPath);
    const current = info ? await readText(info) : null;
    if (file.action === 'remove') {
      if (current != null) return false;
      continue;
    }
    // v2 identity is the semantic hash. A status edit is the same source.
    if (!await hashesAgree(current || '', file.desiredHash)) return false;
  }
  return true;
}

export async function commitD1Unit(input: D1CommitUnitInput): Promise<D1CommitUnitResult> {
  const empty: D1CommitUnitResult = { written: [], removed: [], reported: [], issues: [], finalized: false, invalidated: false };
  if (input.parts.length === 0) return { ...empty, finalized: true };
  const live = await readD1Input(input.project, input.moduleName);
  const snapshotHash = input.snapshotHash ?? live?.snapshotHash ?? '';
  const draftHash = await sha256Text(input.draftText);
  const runId = input.runId || snapshotHash || draftHash;
  const issues: string[] = [];
  const planned: PlannedFile[] = [];
  // d1_248: a def the snapshot carries no hash for (the L4 plan marks it done) is the D1's own when its writer receipt is the hash on disk, and the
  // L4 or L2 sources changed since this unit wrote it (another source key): it is rebuilt from the changed contract. With the same sources the new
  // bytes come from a changed generator, and that is `/rederive` (d1_228): the def stays refused. A def edited by hand has no matching receipt and
  // stays refused too.
  const sourceKey = (await readD1Derivation(input.project, input.moduleName))?.sourceKey ?? '';
  const writerHash = new Map<string, string | null>();
  const adoptedHash = await readAdoptedReceipts(input.project, input.moduleName);
  const earlier = await readProgress(input.project, input.moduleName, input.step, input.unitId);
  if (earlier?.sourceKey && sourceKey && earlier.sourceKey !== sourceKey) {
    for (const receipt of await readWriterReceipts(input.project, input.moduleName)) {
      writerHash.set(receipt.defPath, writerHash.has(receipt.defPath) && writerHash.get(receipt.defPath) !== receipt.desiredHash ? null : receipt.desiredHash);
    }
  }
  for (const part of input.parts) {
    const action = part.action === 'remove' ? 'remove' : 'write';
    const file = artifactFile(input.project, part.defPath);
    if (!file || !ownsProductDef(input.project, input.moduleName, file)) {
      issues.push(`defPath is not a def this agent can ${action}: ${part.defPath}.`);
      continue;
    }
    const logical = logicalDefPath(part.defPath);
    const outputTs = [...new Set([
      ...(part.outputTs || []),
      futureOutputPath(part.defPath),
      futureOutputPath(logical),
    ].filter(path => path.endsWith('.ts') && !path.endsWith('.defs.ts')))];
    planned.push({
      defPath: part.defPath,
      logical,
      file,
      action,
      source: part.source,
      receiptHash: adoptedHash.get(logical) ?? part.receiptHash ?? (receiptHashOf(live, logical) || writerHash.get(logical) || ''),
      outputTs,
      previousHash: '',
      desiredHash: action === 'remove' ? '' : await sourceIdentityHash(part.source),
      blockReason: part.blockReason || '',
    });
  }
  if (issues.length > 0 || planned.length !== input.parts.length) {
    return { ...empty, issues };
  }

  if (snapshotHash && live?.snapshotHash && live.snapshotHash !== snapshotHash) {
    await invalidate(input, runId, snapshotHash, draftHash, planned, live.snapshotHash);
    return {
      ...empty,
      reported: reportedOf(planned),
      issues: [driftMessage(snapshotHash, live.snapshotHash)],
      invalidated: true,
    };
  }

  for (const part of planned) {
    const current = await readText(part.file);
    part.previousHash = current == null ? '' : await sourceIdentityHash(current);
  }
  const reported = reportedOf(planned);
  const existing = await readProgress(input.project, input.moduleName, input.step, input.unitId);
  // A finished unit from another snapshot is not this run's owner. A live snapshot
  // invalidates that run on its next mutation, so this commit may replace it.
  const superseded = !!existing && existing.snapshotHash !== snapshotHash;
  if (existing && existing.runId !== runId && !existing.invalidated && !superseded) {
    if (await sameQuietResult(existing, planned, snapshotHash)) {
      return { ...empty, reported: existing.reported, finalized: true };
    }
    return {
      ...empty,
      reported,
      issues: [ownedByOther(existing.runId, input.step, input.unitId, runId)],
    };
  }
  if (
    existing
    && existing.finalized
    && !existing.invalidated
    && existing.runId === runId
    && existing.snapshotHash === snapshotHash
    && existing.draftHash === draftHash
    && quiet(planned)
    && await statusesStillValid(input.project, planned)
  ) {
    return { ...empty, reported: existing.reported, finalized: true };
  }

  const progress = blankProgress(input, runId, snapshotHash, draftHash, planned, reported, earlier);
  if (sourceKey) progress.sourceKey = sourceKey;
  await saveProgress(input, progress);
  const written: string[] = [];
  const removed: string[] = [];
  let mutations = 0;
  for (let index = 0; index < planned.length; index += 1) {
    const part = planned[index];
    if (input.beforeMutate) await input.beforeMutate(index);
    const again = await readD1Input(input.project, input.moduleName);
    if (snapshotHash && again?.snapshotHash && again.snapshotHash !== snapshotHash) {
      progress.invalidated = true;
      progress.finalized = false;
      progress.issues = [driftMessage(snapshotHash, again.snapshotHash)];
      await saveProgress(input, progress);
      return {
        written, removed, reported, issues: progress.issues, finalized: false, invalidated: true,
      };
    }
    const owner = await readProgress(input.project, input.moduleName, input.step, input.unitId);
    if (owner && owner.runId !== runId) {
      const message = ownedByOther(owner.runId, input.step, input.unitId, runId);
      progress.issues = [message];
      progress.finalized = false;
      markConflict(progress, part.logical);
      await saveProgress(input, progress);
      return { written, removed, reported, issues: [message], finalized: false, invalidated: false };
    }
    const current = await readText(part.file);
    const hash = current == null ? '' : await sourceIdentityHash(current);
    if (hash !== part.previousHash) {
      const message = hashChanged(part.logical, part.previousHash, hash, runId);
      progress.issues = [message];
      progress.finalized = false;
      markConflict(progress, part.logical);
      await saveProgress(input, progress);
      return { written, removed, reported, issues: [message], finalized: false, invalidated: false };
    }
    if (part.action === 'write' && current != null && hash === part.desiredHash) {
      if (await keepExistingStatus(input.project, current, part.defPath)) {
        markDone(progress, part.logical);
        continue;
      }
    }
    if (part.action === 'remove' && current == null) {
      markDone(progress, part.logical);
      continue;
    }
    const owned = current != null && part.receiptHash ? await hashesAgree(current, part.receiptHash) : false;
    if (current != null && !owned) {
      const message = part.receiptHash
        ? `Receipt hash for ${part.logical} does not match the bytes on disk. The file was not overwritten.`
        : `File ${part.logical} exists without a receipt. The file was not overwritten.`;
      progress.issues = [...progress.issues, message];
      progress.finalized = false;
      markConflict(progress, part.logical);
      await saveProgress(input, progress);
      return { written, removed, reported, issues: progress.issues, finalized: false, invalidated: false };
    }
    if (part.action === 'remove') {
      await removeDefFile(part.file);
      removed.push(displayPath(part.file));
    } else {
      await writeText(part.file, part.source);
      if (part.blockReason) await writeBlockReceipt(input.project, part);
      written.push(displayPath(part.file));
    }
    markDone(progress, part.logical);
    mutations += 1;
    await saveProgress(input, progress);
    if (input.failAfterMutations && mutations >= input.failAfterMutations) {
      throw new Error('INJECTED_STOP');
    }
  }
  progress.finalized = progress.issues.length === 0 && progress.files.every(file => file.status === 'done');
  progress.invalidated = false;
  await saveProgress(input, progress);
  if (written.length || removed.length) await dropAdoptedReceipts(input.project, input.moduleName, [...written, ...removed]);
  return {
    written,
    removed,
    reported,
    issues: progress.issues,
    finalized: progress.finalized,
    invalidated: false,
  };
}

/** Every file in this project, including hidden names. mtime is recorded, not trusted. */
export async function fingerprintProject(project: number): Promise<D1FingerprintEntry[]> {
  const files = (mls.stor.files || {}) as Record<string, StorLeaf>;
  const entries: D1FingerprintEntry[] = [];
  for (const [key, file] of Object.entries(files)) {
    if (file.project !== project) continue;
    const folder = file.folder || '';
    const shortName = file.shortName || '';
    const content = typeof file.content === 'string' ? file.content : '';
    entries.push({
      key,
      level: file.level || 0,
      folder,
      shortName,
      extension: file.extension || '',
      hidden: hiddenPath(folder, shortName),
      sha256: await sha256Text(content),
      mtime: file.updatedAt || '',
      status: file.status || '',
    });
  }
  entries.sort((left, right) => left.key.localeCompare(right.key));
  return entries;
}

/**
 * Paths whose bytes, mtime or status changed outside `l1/<module>` product
 * defs and `l1/<module>/pipeline/agentDefsL1`. The planner pipeline is outside.
 */
export function outsideOwnedWrites(
  before: readonly D1FingerprintEntry[],
  after: readonly D1FingerprintEntry[],
  moduleName: string,
): string[] {
  const prior = new Map(before.map(entry => [entry.key, entry]));
  const next = new Map(after.map(entry => [entry.key, entry]));
  const changed: string[] = [];
  for (const key of new Set([...prior.keys(), ...next.keys()])) {
    const left = prior.get(key);
    const right = next.get(key);
    if (
      left
      && right
      && left.sha256 === right.sha256
      && left.mtime === right.mtime
      && left.status === right.status
    ) continue;
    const sample = right || left;
    if (!sample || allowedWrite(sample, moduleName)) continue;
    changed.push(key);
  }
  return changed.sort();
}

function allowedWrite(entry: D1FingerprintEntry, moduleName: string): boolean {
  if (entry.level !== 1) return false;
  const own = `${moduleName}/pipeline/agentDefsL1`;
  if (entry.folder === own || entry.folder.startsWith(`${own}/`)) return true;
  if (entry.folder === `${moduleName}/pipeline` || entry.folder.startsWith(`${moduleName}/pipeline/`)) return false;
  return entry.folder === moduleName || entry.folder.startsWith(`${moduleName}/`);
}

function hiddenPath(folder: string, shortName: string): boolean {
  return `${folder}/${shortName}`.split('/').some(segment => segment.startsWith('.'));
}

function ownsProductDef(project: number, moduleName: string, file: D1FileInfo): boolean {
  if (file.project !== project || file.level !== 1 || file.extension !== '.defs.ts') return false;
  if (!file.shortName || file.shortName.includes('.') || file.shortName.includes('/')) return false;
  if (file.folder === `${moduleName}/pipeline` || file.folder.startsWith(`${moduleName}/pipeline/`)) return false;
  return file.folder === moduleName || file.folder.startsWith(`${moduleName}/`);
}

function receiptHashOf(
  snapshot: { files?: ReadonlyArray<{ defPath?: string; contentHash?: string }>; removed?: ReadonlyArray<{ defPath?: string | null; contentHash?: string }> } | null,
  logical: string,
): string {
  if (!snapshot) return '';
  const file = snapshot.files?.find(item => item.defPath === logical);
  if (file?.contentHash) return file.contentHash;
  const removed = snapshot.removed?.find(item => item.defPath === logical);
  return removed?.contentHash || '';
}

function quiet(planned: readonly PlannedFile[]): boolean {
  return planned.every(part =>
    (part.action === 'write' && part.previousHash === part.desiredHash && part.previousHash !== '')
    || (part.action === 'remove' && part.previousHash === ''));
}

async function sameQuietResult(existing: D1UnitProgress, planned: readonly PlannedFile[], snapshotHash: string): Promise<boolean> {
  if (!existing.finalized || existing.invalidated || existing.snapshotHash !== snapshotHash) return false;
  if (existing.files.length !== planned.length) return false;
  for (const part of planned) {
    const row = existing.files.find(file => logicalDefPath(file.defPath) === part.logical && file.action === part.action);
    if (!row || row.desiredHash !== part.desiredHash || row.status !== 'done') return false;
    if (part.previousHash !== part.desiredHash && !(part.action === 'remove' && part.previousHash === '')) return false;
  }
  return true;
}

function blankProgress(
  input: D1CommitUnitInput,
  runId: string,
  snapshotHash: string,
  draftHash: string,
  planned: readonly PlannedFile[],
  reported: string[],
  earlier?: D1UnitProgress | null,
): D1UnitProgress {
  return {
    schemaVersion: D1_PROGRESS_SCHEMA,
    project: input.project,
    moduleName: input.moduleName,
    step: input.step,
    unitId: input.unitId,
    runId,
    snapshotHash,
    draftHash,
    transaction: false,
    finalized: false,
    invalidated: false,
    reported,
    files: planned.map(part => {
      const known = earlier?.files.find(file => logicalDefPath(file.defPath) === part.logical && file.action === 'write');
      const written = known?.written ?? (known?.status === 'done' ? known.desiredHash : '');
      return {
        defPath: part.logical,
        action: part.action,
        previousHash: part.previousHash,
        desiredHash: part.desiredHash,
        ...(written ? { written } : {}),
        status: 'pending' as const,
        outputTs: part.outputTs,
      };
    }),
    issues: [],
  };
}

async function invalidate(
  input: D1CommitUnitInput,
  runId: string,
  snapshotHash: string,
  draftHash: string,
  planned: readonly PlannedFile[],
  found: string,
): Promise<void> {
  const progress = blankProgress(input, runId, snapshotHash, draftHash, planned, reportedOf(planned));
  progress.invalidated = true;
  progress.finalized = false;
  progress.issues = [driftMessage(snapshotHash, found)];
  await saveProgress(input, progress);
}

function reportedOf(planned: readonly PlannedFile[]): string[] {
  const paths = new Set<string>();
  for (const part of planned) {
    for (const output of part.outputTs) paths.add(output);
  }
  return [...paths].sort();
}

function markDone(progress: D1UnitProgress, logical: string): void {
  const row = progress.files.find(file => file.defPath === logical);
  if (!row) return;
  row.status = 'done';
  if (row.action === 'write' && row.desiredHash) row.written = row.desiredHash;
}

function markConflict(progress: D1UnitProgress, logical: string): void {
  const row = progress.files.find(file => file.defPath === logical);
  if (row && row.status !== 'done') row.status = 'conflict';
}

/** Done write rows. A trace that is not this progress schema is not opened. */
async function statusesStillValid(project: number, planned: readonly PlannedFile[]): Promise<boolean> {
  for (const part of planned) {
    if (part.action !== 'write') continue;
    const current = await readText(part.file);
    if (!current) continue;
    if (!await keepExistingStatus(project, current, part.defPath)) return false;
  }
  return true;
}

async function keepExistingStatus(project: number, source: string, defPath: string): Promise<boolean> {
  const parsed = parseDefinitionSource(source);
  if (!('definition' in parsed)) return true;
  const read = readDefinition(parsed.definition);
  if ('issues' in read) return true;
  if (read.status === 'pending') return true;
  const receipt = await readMaterializationReceipt(project, defPath);
  if (read.status === 'generated') return generatedAllowsSkip(read, receipt, await dependencyHashes(read));
  if (read.status !== 'blocked' && read.status !== 'failed') return false;
  if (!await receiptOwnsDef(read, receipt, defPath)) return false;
  if (read.status === 'blocked') return !!receipt?.reason;
  return !!receipt && receipt.failures.length > 0;
}

function sameDefPath(left: string, right: string): boolean {
  const bare = (value: string) => value.replace(/^_\d+_\//, '');
  return left !== '' && right !== '' && bare(left) === bare(right);
}

async function receiptOwnsDef(
  definition: M1Definition,
  receipt: MaterializationReceipt | null,
  defPath: string,
): Promise<boolean> {
  if (!receipt) return false;
  if (!sameDefPath(receipt.defPath, defPath)) return false;
  if (receipt.artifactType !== definition.artifactType) return false;
  if (receipt.artifactId !== definition.artifactId) return false;
  return receipt.semanticHash === await semanticHash(definition);
}

async function readMaterializationReceipt(project: number, defPath: string): Promise<MaterializationReceipt | null> {
  const display = receiptPathFor(defPath);
  if (!display) return null;
  const info = fileInfoFromDisplay(project, display);
  if (!info) return null;
  const text = await readText(info);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as MaterializationReceipt;
    return parsed && parsed.schemaVersion === M1_RECEIPT_SCHEMA ? parsed : null;
  } catch {
    return null;
  }
}

async function dependencyHashes(definition: M1Definition): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const path of definition.dependencies) {
    const match = /^_(\d+)_\/(l\d+\/.+)$/.exec(path);
    const info = match ? fileInfoFromDisplay(Number(match[1]), match[2]) : null;
    if (!info) continue;
    const text = await readText(info);
    if (text == null) continue;
    hashes[path] = await sha256Text(text);
  }
  return hashes;
}

async function writeBlockReceipt(project: number, part: PlannedFile): Promise<void> {
  const parsed = parseDefinitionSource(part.source);
  if (!('definition' in parsed)) return;
  const read = readDefinition(parsed.definition);
  if ('issues' in read) return;
  const receipt: MaterializationReceipt = {
    schemaVersion: M1_RECEIPT_SCHEMA,
    runId: 'd1',
    candidateId: '',
    defPath: part.defPath,
    artifactType: read.artifactType,
    artifactId: read.artifactId,
    recipeVersion: 'd1',
    semanticHash: await semanticHash(read),
    dependencyHashes: {},
    sourceHashes: {},
    outputHashes: {},
    stage: 'plan',
    verifications: [],
    failures: [],
    attempts: 0,
    reason: part.blockReason,
  };
  const info = fileInfoFromDisplay(project, receiptPathFor(part.defPath));
  if (!info) return;
  await writeJson(info, receipt);
}

export async function readWriterReceipts(project: number, moduleName: string): Promise<D1WriterReceipt[]> {
  const out: D1WriterReceipt[] = [];
  const adopted = await readAdoptedReceipts(project, moduleName);
  const traces = [...WRITER_STEPS.map(step => ({ step: step as string, unitId: step as string })), D1_EXTERNAL_TRACE];
  for (const { step, unitId } of traces) {
    const progress = await readProgress(project, moduleName, step, unitId);
    if (!progress) continue;
    const whole = progress.finalized && !progress.invalidated;
    for (const file of progress.files) {
      if (file.action !== 'write') continue;
      // d1_270: a path the manager adopted has the adopted hash as its receipt: the receipt it replaces named bytes that are no longer on the disk, or none.
      if (adopted.has(logicalDefPath(file.defPath))) continue;
      // A row's `written` is a fact about the bytes this unit put at the path: it stays when the unit is later refused. A done row of a finished unit is the same fact.
      const hash = file.written || (whole && file.status === 'done' ? file.desiredHash : '');
      if (hash) out.push({ defPath: logicalDefPath(file.defPath), desiredHash: hash });
    }
  }
  for (const [defPath, desiredHash] of adopted) out.push({ defPath, desiredHash });
  return out;
}

/** The hash `/adopt` recorded for each logical def path (d1_270). Empty when nothing was adopted. */
export async function readAdoptedReceipts(project: number, moduleName: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const progress = await readProgress(project, moduleName, D1_ADOPT_TRACE.step, D1_ADOPT_TRACE.unitId);
  for (const file of progress?.files ?? []) {
    if (file.adopted && file.written) out.set(logicalDefPath(file.defPath), file.written);
  }
  return out;
}

/** Replaces the adopted receipts of the module with `rows` (logical def path → disk hash). */
export async function saveAdoptedReceipts(project: number, moduleName: string, rows: ReadonlyMap<string, string>): Promise<void> {
  const files: D1FileProgress[] = [...rows].sort(([left], [right]) => left.localeCompare(right)).map(([defPath, hash]) => ({
    defPath, action: 'write', previousHash: '', desiredHash: hash, written: hash, adopted: true, status: 'done', outputTs: [],
  }));
  const progress: D1UnitProgress = {
    schemaVersion: D1_PROGRESS_SCHEMA, project, moduleName, step: D1_ADOPT_TRACE.step, unitId: D1_ADOPT_TRACE.unitId, runId: 'adopt', snapshotHash: '', draftHash: '',
    transaction: false, finalized: true, invalidated: false, reported: files.map(file => file.defPath), files, issues: [],
  };
  await writeJson(progressFile(project, moduleName, D1_ADOPT_TRACE.step, D1_ADOPT_TRACE.unitId), progress);
}

/** A def a unit wrote after it was adopted has a receipt of its own: the adopted one is dropped (d1_270). */
async function dropAdoptedReceipts(project: number, moduleName: string, displayPaths: readonly string[]): Promise<void> {
  const adopted = await readAdoptedReceipts(project, moduleName);
  if (adopted.size === 0) return;
  let changed = false;
  for (const path of displayPaths) changed = adopted.delete(logicalDefPath(path)) || changed;
  if (changed) await saveAdoptedReceipts(project, moduleName, adopted);
}

async function readProgress(project: number, moduleName: string, step: string, unitId: string): Promise<D1UnitProgress | null> {
  const raw = await readText(progressFile(project, moduleName, step, unitId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as D1UnitProgress;
    if (parsed.schemaVersion !== D1_PROGRESS_SCHEMA) return null;
    if (parsed.project !== project || parsed.moduleName !== moduleName) return null;
    if (parsed.step !== step || parsed.unitId !== unitId) return null;
    if (!Array.isArray(parsed.files)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveProgress(input: D1CommitUnitInput, progress: D1UnitProgress): Promise<void> {
  await writeJson(progressFile(input.project, input.moduleName, input.step, input.unitId), progress);
}

function token(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '');
  return cleaned || 'unit';
}

function driftMessage(expected: string, found: string): string {
  return `Input snapshot changed from ${expected} to ${found}. Finalization is not valid. Nothing further was written.`;
}

function ownedByOther(owner: string, step: string, unitId: string, runId: string): string {
  return `Concurrent run ${owner} owns ${step}/${unitId}. This run ${runId} wrote nothing.`;
}

function hashChanged(path: string, expected: string, found: string, runId: string): string {
  return `Hash of ${path} changed before the write (expected ${expected || 'absent'}, found ${found || 'absent'}). Origin is run ${runId}. The file was not overwritten.`;
}
