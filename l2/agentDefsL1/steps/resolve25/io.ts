/// <mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { resolveFile, type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import {
  D1_RESOLVE_VERSION,
  type D1ResolveAttempt,
  type D1ResolveReceipt,
  type D1ResolveWork,
} from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';

export function resolveWorkFile(project: number, moduleName: string): D1FileInfo {
  return { project, level: 1, folder: `${moduleName}/pipeline/agentDefsL1/drafts`, shortName: 'resolve25-work', extension: '.json' };
}

export function resolveAttemptFile(project: number, moduleName: string, unitId: string): D1FileInfo {
  return { project, level: 1, folder: `${moduleName}/pipeline/agentDefsL1/traces`, shortName: `resolve25-${unitId}`, extension: '.json' };
}

export async function writeResolveWork(work: D1ResolveWork): Promise<void> {
  await writeJson(resolveWorkFile(work.project, work.moduleName), work);
}

export async function readResolveWork(project: number, moduleName: string): Promise<D1ResolveWork | null> {
  const parsed = await readParsed(resolveWorkFile(project, moduleName));
  if (!isRecord(parsed) || parsed.schemaVersion !== D1_RESOLVE_VERSION) return null;
  if (parsed.project !== project || parsed.moduleName !== moduleName || !Array.isArray(parsed.units)) return null;
  return parsed as unknown as D1ResolveWork;
}

export async function writeResolveAttempt(project: number, moduleName: string, attempt: D1ResolveAttempt): Promise<void> {
  await writeJson(resolveAttemptFile(project, moduleName, attempt.unitId), attempt);
}

export async function readResolveAttempt(project: number, moduleName: string, unitId: string): Promise<D1ResolveAttempt | null> {
  const parsed = await readParsed(resolveAttemptFile(project, moduleName, unitId));
  if (!isRecord(parsed) || parsed.unitId !== unitId || typeof parsed.status !== 'string' || !isRecord(parsed.answers)) return null;
  return parsed as unknown as D1ResolveAttempt;
}

export async function writeResolveReceipt(receipt: D1ResolveReceipt): Promise<void> {
  await writeJson(resolveFile(receipt.project, receipt.moduleName), receipt);
}

/** The receipt of this project and module, or null when absent or not this shape. */
export async function readResolveReceipt(project: number, moduleName: string): Promise<D1ResolveReceipt | null> {
  const parsed = await readParsed(resolveFile(project, moduleName));
  if (!isRecord(parsed) || parsed.schemaVersion !== D1_RESOLVE_VERSION) return null;
  if (parsed.project !== project || parsed.moduleName !== moduleName) return null;
  if (typeof parsed.snapshotHash !== 'string' || typeof parsed.llmCalls !== 'number' || !Array.isArray(parsed.routes)) return null;
  return parsed as unknown as D1ResolveReceipt;
}

async function readParsed(file: D1FileInfo): Promise<unknown> {
  const text = await readText(file);
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
