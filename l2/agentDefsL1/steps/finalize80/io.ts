/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  draftFile,
  pipelineFile,
  reportFile,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fingerprintProject, logicalDefPath, type D1UnitProgress } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { futureOutputPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { parsePipelineDocument } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';
import { readText, writeText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile, parseRendered } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { contractPath } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay, readD1Input, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { catalogInfo } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import { readCallLog } from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';
import {
  type D1FinalizeObserved,
  type D1FinalizeReport,
  type D1FinalizeRequest,
} from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';

/**
 * Reads the checkpoint, the snapshot, the drafts and the defs on disk.
 * It does not run an earlier phase and it does not call a model.
 */
export async function assembleD1Finalize(project: number, moduleName: string): Promise<{ refusal: string } | { request: D1FinalizeRequest }> {
  const snapshot = await readD1Input(project, moduleName);
  const drafts = {
    domain30: await readDraft(project, moduleName, 'domain30'),
    persistence40: await readDraft(project, moduleName, 'persistence40'),
    usecases50: await readDraft(project, moduleName, 'usecases50'),
    controllers60: await readDraft(project, moduleName, 'controllers60'),
    support70: await readDraft(project, moduleName, 'support70'),
  };
  const progress = await readProgress(project, moduleName);
  const observed = await readObserved(project, moduleName, snapshot?.files || [], progress);
  const sourceHashes: Record<string, string> = {};
  const dependencyTexts: Record<string, string> = {};
  for (const source of snapshot?.sources || []) {
    const text = await readLogical(project, source.path);
    sourceHashes[source.path] = text == null ? '' : await sha256Text(text);
    if (text != null) dependencyTexts[source.path] = text;
  }
  await readDeclaredDependencies(project, observed, dependencyTexts);
  const contracts: D1FinalizeRequest['contracts'] = {};
  const pages = new Set((snapshot?.selection.routes || []).map(route => route.page).filter(Boolean));
  for (const pageId of pages) {
    const path = contractPath(moduleName, pageId);
    const text = await readLogical(project, path);
    contracts[pageId] = { path, text, hash: text == null ? '' : await sha256Text(text) };
  }
  const futurePresent = await futureOf(project, observed);
  const pipeline = await readPipeline(project, moduleName);
  if (!pipeline) return { refusal: 'Checkpoint is missing. finalize80 wrote nothing.' };
  return {
    request: {
      project,
      moduleName,
      pipeline,
      snapshot,
      sourceHashes,
      dependencyTexts,
      contracts,
      drafts,
      observed,
      futurePresent,
      children: [],
      callLog: await readCallLog(project, moduleName),
    },
  };
}

export async function writeD1Report(project: number, moduleName: string, report: D1FinalizeReport): Promise<boolean> {
  const file = reportFile(project, moduleName);
  const next = `${JSON.stringify(report, null, 2)}\n`;
  const current = await readText(file);
  if (current === next) return false;
  await writeText(file, next);
  return true;
}

async function readDraft(project: number, moduleName: string, step: D1StepId): Promise<unknown> {
  const text = await readText(draftFile(project, moduleName, step));
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function readPipeline(project: number, moduleName: string): Promise<D1FinalizeRequest['pipeline'] | null> {
  const raw = await readText(pipelineFile(project, moduleName));
  if (!raw) return null;
  const pipeline = parsePipelineDocument(raw);
  if (!pipeline || pipeline.project !== project || pipeline.moduleName !== moduleName) return null;
  return pipeline;
}

async function readProgress(project: number, moduleName: string): Promise<D1UnitProgress[]> {
  const fingerprint = await fingerprintProject(project);
  const folder = `${moduleName}/pipeline/agentDefsL1/traces`;
  const found: D1UnitProgress[] = [];
  for (const entry of fingerprint) {
    if (entry.level !== 1 || entry.folder !== folder || entry.extension !== '.json') continue;
    const text = await readText({ project, level: 1, folder, shortName: entry.shortName, extension: entry.extension });
    if (!text) continue;
    try {
      const parsed = JSON.parse(text) as D1UnitProgress;
      if (parsed && parsed.moduleName === moduleName && Array.isArray(parsed.files)) found.push(parsed);
    } catch {
      continue;
    }
  }
  return found;
}

async function readObserved(
  project: number,
  moduleName: string,
  planned: ReadonlyArray<{ defPath: string; action: string; contentHash?: string; ownerRefs: string[] }>,
  progress: readonly D1UnitProgress[],
): Promise<D1FinalizeObserved[]> {
  const receipt = new Map<string, string>();
  const done = new Set<string>();
  for (const unit of progress) {
    for (const file of unit.files) {
      const logical = logicalDefPath(file.defPath);
      if (file.desiredHash) receipt.set(logical, file.desiredHash);
      if (file.status === 'done' && file.action === 'write') done.add(logical);
    }
  }
  for (const file of planned) {
    const logical = logicalDefPath(file.defPath);
    if (!receipt.has(logical) && file.action === 'preserve' && file.contentHash) receipt.set(logical, file.contentHash);
  }
  const fingerprint = await fingerprintProject(project);
  const byLogical = new Map<string, D1FinalizeObserved>();
  for (const entry of fingerprint) {
    if (!productDef(entry, moduleName)) continue;
    const logical = `l1/${entry.folder}/${entry.shortName}${entry.extension}`;
    const text = await readText({ project, level: 1, folder: entry.folder, shortName: entry.shortName, extension: entry.extension });
    byLogical.set(logical, {
      defPath: logical,
      text,
      currentHash: text == null ? '' : await sha256Text(text),
      receiptHash: receipt.get(logical) || '',
      action: planned.find(item => logicalDefPath(item.defPath) === logical)?.action || '',
      ownerRefs: planned.find(item => logicalDefPath(item.defPath) === logical)?.ownerRefs || [],
      unitDone: done.has(logical),
    });
  }
  for (const logical of done) {
    if (byLogical.has(logical)) continue;
    byLogical.set(logical, {
      defPath: logical,
      text: null,
      currentHash: '',
      receiptHash: receipt.get(logical) || '',
      action: 'write',
      ownerRefs: [],
      unitDone: true,
    });
  }
  return [...byLogical.values()];
}

async function futureOf(project: number, observed: readonly D1FinalizeObserved[]): Promise<Record<string, boolean>> {
  const present: Record<string, boolean> = {};
  for (const item of observed) {
    if (!item.text) continue;
    const rendered = parseRendered(item.text);
    if (!rendered || !Array.isArray(rendered.pipeline)) continue;
    for (const pipelineItem of rendered.pipeline) {
      if (!isRecord(pipelineItem) || typeof pipelineItem.outputPath !== 'string') continue;
      const outputPath = pipelineItem.outputPath;
      const info = artifactFile(project, outputPath);
      present[outputPath] = info ? (await readText(info)) != null : false;
      const logicalFuture = futureOutputPath(logicalDefPath(typeof pipelineItem.defPath === 'string' ? pipelineItem.defPath : ''));
      if (logicalFuture && present[logicalFuture] === undefined) present[logicalFuture] = present[outputPath];
    }
  }
  return present;
}

function productDef(entry: { level: number; folder: string; extension: string }, moduleName: string): boolean {
  if (entry.level !== 1 || entry.extension !== '.defs.ts') return false;
  const pipeline = `${moduleName}/pipeline`;
  if (entry.folder === pipeline || entry.folder.startsWith(`${pipeline}/`)) return false;
  return entry.folder === moduleName || entry.folder.startsWith(`${moduleName}/`);
}

async function readLogical(project: number, path: string): Promise<string | null> {
  const info = fileInfoFromDisplay(project, path);
  if (!info) return null;
  return readText(info);
}

/**
 * Opens every path a def declares in dependsFiles. A path this project does not
 * own is read from the project named in the path. Null means the file is not there.
 */
async function readDeclaredDependencies(
  project: number,
  observed: readonly D1FinalizeObserved[],
  dependencyTexts: Record<string, string>,
): Promise<void> {
  for (const dep of declaredPaths(observed)) {
    if (typeof dependencyTexts[dep] === 'string') continue;
    const text = await readDeclared(project, dep);
    if (text != null) dependencyTexts[dep] = text;
  }
}

function declaredPaths(observed: readonly D1FinalizeObserved[]): string[] {
  const paths = new Set<string>();
  for (const item of observed) {
    if (!item.text) continue;
    const rendered = parseRendered(item.text);
    if (!rendered || !Array.isArray(rendered.pipeline)) continue;
    for (const pipelineItem of rendered.pipeline) {
      if (!isRecord(pipelineItem) || !Array.isArray(pipelineItem.dependsFiles)) continue;
      for (const dep of pipelineItem.dependsFiles) {
        if (typeof dep === 'string' && dep) paths.add(dep);
      }
    }
  }
  return [...paths];
}

async function readDeclared(project: number, dep: string): Promise<string | null> {
  const own = artifactFile(project, dep) || fileInfoFromDisplay(project, dep);
  if (own) return readText(own);
  const catalog = catalogInfo(dep);
  if (!catalog) return null;
  return readText(catalog);
}
