/// <mls fileReference="_102021_/l2/helpers/planPostprocess/postprocess.ts" enhancement="_blank"/>

import {
  displayPath,
  fileExists,
  moduleFile,
  readSourceText,
  writeSourceText,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import { readD1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { correctPlan, type PlanCorrection } from '/_102021_/l2/helpers/planPostprocess/correctPlan.js';
import { usedRemovedUsecases } from '/_102021_/l2/helpers/planPostprocess/usedRemoved.js';

export type PostprocessOutcome =
  | { ok: true; corrections: PlanCorrection[]; text: string }
  | { ok: false; reason: string };

/** Before prepare: fix pool plans and always leave `postprocess.json`, including an empty correction list. */
export async function postprocessPlan(moduleName: string): Promise<PostprocessOutcome> {
  const backendFile = poolFile(moduleName, 'l2', 'backend');
  const effortFile = poolFile(moduleName, 'l2', 'effort');
  const loaded = await loadPair(backendFile, effortFile);
  if (!loaded.ok) return loaded;
  const project = mls.actualProject || 0;
  const artifacts = await readD1InputArtifacts(project, moduleName);
  const corrected = correctPlan({
    moduleName,
    backend: loaded.backend,
    effort: loaded.effort,
    used: usedRemovedUsecases({ project, moduleName }, artifacts),
  });
  if (corrected.corrections.length > 0) {
    await writeSourceText(backendFile, jsonText(corrected.backend));
    await writeSourceText(effortFile, jsonText(corrected.effort));
  }
  const record = {
    schemaVersion: 1,
    moduleName,
    at: new Date().toISOString(),
    corrections: corrected.corrections,
  };
  await writeSourceText(poolFile(moduleName, 'l1', 'postprocess'), jsonText(record));
  return { ok: true, corrections: corrected.corrections, text: correctionText(corrected.corrections) };
}

function correctionText(corrections: readonly PlanCorrection[]): string {
  if (corrections.length === 0) return 'postprocess: no correction';
  return corrections.map(item => {
    const first = item.routes[0] ?? '';
    const listed = item.routes.length > 1 ? `${first}…` : first;
    return `postprocess: usecase ${item.usecase} from toRemove to done (reason: exists in l1; used by ${item.routes.length} routes: ${listed})`;
  }).join('\n');
}

async function loadPair(
  backendFile: Ns5FileInfo,
  effortFile: Ns5FileInfo,
): Promise<{ ok: true; backend: Record<string, unknown>; effort: Record<string, unknown> } | { ok: false; reason: string }> {
  if (!fileExists(backendFile) || !fileExists(effortFile)) {
    const missing = !fileExists(backendFile) ? backendFile : effortFile;
    return { ok: false, reason: `plan missing: ${displayPath(missing)}` };
  }
  const backend = parsePlan(await readSourceText(backendFile), displayPath(backendFile));
  if (!backend.ok) return backend;
  const effort = parsePlan(await readSourceText(effortFile), displayPath(effortFile));
  if (!effort.ok) return effort;
  return { ok: true, backend: backend.doc, effort: effort.doc };
}

function parsePlan(text: string, path: string): { ok: true; doc: Record<string, unknown> } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `plan unreadable: ${path}: ${message}` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: `plan unreadable: ${path}: not an object` };
  }
  return { ok: true, doc: parsed as Record<string, unknown> };
}

function poolFile(moduleName: string, layer: 'l1' | 'l2', shortName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/${layer}/web`,
    shortName,
    extension: '.json',
  };
}

function jsonText(doc: unknown): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}
