/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>

// Platform I/O glue for the in-studio materializer (agentCbMaterialize), vendored into agentChangeBackend
// so it does not depend on agentMaterializeSolution (being removed). Pure mls.stor / libStor access; the
// pure prompt/parse/order logic lives in cbMaterializeCore.ts (shared with the Node CLI).

import { isModelAlreadyExistsError, mlsImportPathParts, phantomModulePathOf } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
import { createStorFile } from '/_102027_/l2/libStor.js';
import type { PipelineItem } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import { syntaxDiagnostics } from '/_102021_/l2/agentChangeBackend/helpers/cbSyntaxValidation.js';

// L1 layer folders that may hold a .defs.ts with a pipeline (hexagonal: only layer_1_external in v1,
// but keep the full set so the scan is robust if defs land in other layers).
const L1_LAYERS = ['layer_1_external', 'layer_2_application', 'layer_3_domain', 'layer_4_entities', 'layer_3_usecases', 'layer_2_controllers'];

export interface ParsedMlsPath {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

/** Extract the `pipeline` array from a .defs.ts content string. */
export function parsePipelineFromContent(content: string): PipelineItem[] | null {
  try {
    const match = content.match(/export\s+const\s+pipeline\s*=\s*([\s\S]*?)\s+as\s+const\s*;/u);
    if (!match) return null;
    return JSON.parse(match[1]) as PipelineItem[];
  } catch {
    return null;
  }
}

/** Scan every l1 .defs.ts (with a pipeline) of a module. */
export async function scanL1DefsWithPipeline(
  project: number,
  moduleName: string,
): Promise<Array<{ folder: string; shortName: string; pipeline: PipelineItem[] }>> {
  const result: Array<{ folder: string; shortName: string; pipeline: PipelineItem[] }> = [];
  try {
    const prefix = `${moduleName}/`;
    for (const f of Object.values(mls.stor.files as Record<string, any>)) {
      if (f.project !== project) continue;
      if (f.level !== 1) continue;
      const folder = String(f.folder || '');
      if (!folder.startsWith(prefix)) continue;
      if (!L1_LAYERS.some((layer) => folder === `${moduleName}/${layer}` || folder.startsWith(`${moduleName}/${layer}/`))) continue;
      if (f.extension !== '.defs.ts') continue;
      if (f.status === 'deleted') continue;
      if (f.shortName === 'module' || f.shortName === 'index') continue;
      const content = String(await f.getContent());
      const pipeline = parsePipelineFromContent(content);
      if (!pipeline || pipeline.length === 0) continue;
      result.push({ folder, shortName: f.shortName as string, pipeline });
    }
  } catch (err) {
    console.warn('[cbMaterializeIo] scanL1DefsWithPipeline failed', err);
  }
  return result;
}

/**
 * Whether the file is in this session's index at all — which `getFileModified` cannot say, because it
 * answers `null` both for "absent" and for "present, no usable timestamp". Conflating the two made a
 * resumed session read every generated .ts as never-generated and re-materialize files that were
 * already current (run of 2026-08-17: 14 of 34 controllers rewritten for nothing).
 */
export function fileIsPresent(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): boolean {
  try {
    const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension });
    const file = (mls.stor.files as Record<string, mls.stor.IFileInfo>)[key];
    return !!file && file.status !== 'deleted';
  } catch {
    return false;
  }
}

/** updatedAt (ms) of a file, MAX_SAFE_INTEGER when new/changed without a timestamp, else null. */
export function getFileModified(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
): number | null {
  try {
    const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension });
    const file = (mls.stor.files as Record<string, mls.stor.IFileInfo>)[key];
    if (!file || file.status === 'deleted') return null;
    if (file.updatedAt) return Date.parse(file.updatedAt);
    const status = (file as any).status as string;
    return (status === 'new' || status === 'changed') ? Number.MAX_SAFE_INTEGER : null;
  } catch {
    return null;
  }
}

/** Read any file by its full MLS path string. */
export async function getContentByMlsPath(mlsPath: string): Promise<string | null> {
  try {
    const info = mls.stor.convertFileReferenceToFile(mlsPath);
    const key = mls.stor.getKeyToFile(info);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return null;
    return String(await file.getContent());
  } catch {
    return null;
  }
}

/** Parse a MLS path like `_102050_/l1/cafeFlow/layer_1_external/adapters/persistence/order.ts`. */
export function parseMlsPath(mlsPath: string): ParsedMlsPath | null {
  const match = mlsPath.match(/^_(\d+)_\/l(\d+)\/(.+)$/u);
  if (!match) return null;
  const project = parseInt(match[1], 10);
  const level = parseInt(match[2], 10);
  const rest = match[3];
  const lastSlash = rest.lastIndexOf('/');
  const folder = lastSlash >= 0 ? rest.slice(0, lastSlash) : '';
  const filename = lastSlash >= 0 ? rest.slice(lastSlash + 1) : rest;
  let shortName: string, extension: string;
  if (filename.endsWith('.defs.ts')) { shortName = filename.slice(0, -'.defs.ts'.length); extension = '.defs.ts'; }
  else if (filename.endsWith('.d.ts')) { shortName = filename.slice(0, -'.d.ts'.length); extension = '.d.ts'; }
  else { const dot = filename.lastIndexOf('.'); shortName = dot >= 0 ? filename.slice(0, dot) : filename; extension = dot >= 0 ? filename.slice(dot) : ''; }
  return { project, level, folder, shortName, extension };
}

/** Flatten a monaco diagnostic (messageText may be a chain) into a single line. */
function flattenDiagnostic(d: any): string {
  const flat = (m: any): string => {
    if (typeof m === 'string') return m;
    if (m && typeof m.messageText === 'string') {
      const next = Array.isArray(m.next) && m.next.length ? ` -> ${flat(m.next[0])}` : '';
      return `${m.messageText}${next}`;
    }
    return '';
  };
  const msg = flat(d?.messageText ?? d);
  const code = typeof d?.code === 'number' ? `TS${d.code}: ` : '';
  return msg ? `${code}${sanitizeModuleHint(msg)}` : '';
}

// The stock TS2792/TS2307 hint ("Did you mean to set the 'moduleResolution' option ... 'paths'?")
// teaches the repair model to abandon the '/_<project>_/...' alias for a relative path (observed in
// run task2/102049: six controllers rewritten to '../../../../...'). Replace it with the actual fix.
function sanitizeModuleHint(message: string): string {
  return message.replace(
    /Did you mean to set the 'moduleResolution' option to '[^']+', or to add aliases to the 'paths' option\?/g,
    "Keep the '/_<project>_/l1/...' alias import exactly as in the context files — NEVER rewrite it as a relative path; the alias resolves once the target module is materialized.",
  );
}

/** The Monaco TS worker resolves '/_<proj>_/l1/...' alias imports against LOADED MODELS (plus the
 * publish cache, which only covers files that already existed before the run). A .ts materialized
 * earlier in the SAME run has no publish cache yet — if its model is not loaded in the client doing
 * this compile, the importer fails with TS2792 even though the file exists in stor (run 102049-d:
 * the 6 controllers whose usecases were first created in that run, while the 10 pre-existing ones
 * resolved fine). Lazily load the models of same-project l1 imports before compiling. */
// Load the Monaco model of every l1 import the generated .ts references — INCLUDING cross-project ones
// (the platform, e.g. /_102034_/). The in-loop compile used to load only SAME-project models, so types
// that live in another project (the platform RequestContext/ctx.mdm facade, CompactRelationshipRefKey,
// a port's nullable return) resolved loosely and their misuse escaped the compile — surfacing only in
// the real project `tsc` (see todo/changeBackend erro4: updatedAt on an append-only event, entity.related
// with an invented key, a nullable findCurrent() assigned to a non-null). Loading each import under ITS
// OWN project closes that fidelity gap. Best-effort: an import whose source is not in stor is skipped, so
// this never regresses a workspace that lacks the platform source (types then come from the bundled d.ts).
interface BorrowedModel { project: number; shortName: string; folder: string; level: number; }

async function ensureImportModels(content: string): Promise<BorrowedModel[]> {
  // Models loaded HERE are BORROWED for one compile and released afterwards (see releaseImportModels).
  // A model already in the registry belongs to the Studio (it may be open in a tab) and is never ours
  // to release — the `continue` below is what makes the ownership unambiguous.
  const borrowed: BorrowedModel[] = [];
  for (const match of content.matchAll(/from\s+['"]\/_(\d+)_\/l1\/([^'"]+?)\.js['"]/gu)) {
    const importProject = Number(match[1]);
    if (!Number.isInteger(importProject) || importProject <= 0) continue;
    const path = match[2];
    const idx = path.lastIndexOf('/');
    if (idx <= 0) continue;
    const folder = path.slice(0, idx);
    const shortName = path.slice(idx + 1);
    if (mls.editor.models[mls.editor.getKeyModel(importProject, shortName, folder, 1)]) continue;
    const fileInfo = { project: importProject, level: 1, folder, shortName, extension: '.ts' };
    let fileKey = mls.stor.getKeyToFile(fileInfo);
    if (!(mls.stor.files as Record<string, unknown>)[fileKey]) {
      // The session may simply not have indexed the other project yet — the same thing libModel does
      // before creating a model for a cross-project file. It is a READ of the project index; nothing
      // is written anywhere. Without it the import is skipped in silence and the compile blames the
      // generated file for a module that was there all along.
      await loadProjectIndexOnce(importProject);
      fileKey = mls.stor.getKeyToFile(fileInfo);
      if (!(mls.stor.files as Record<string, unknown>)[fileKey]) {
        console.warn(`[cbMaterializeIo] import /_${importProject}_/l1/${folder}/${shortName}.ts is not in this session's storage; its types cannot be loaded`);
        continue;
      }
    }
    const model = await loadImportModel(importProject, folder, shortName, false);
    if (model) borrowed.push({ project: importProject, shortName, folder, level: 1 });
  }
  return borrowed;
}

/** Project indexes already asked for in this session: the load is idempotent but not free. */
const loadedProjectIndexes = new Set<number>();

/** Ask the server for another project's file index (read-only), once per session. */
async function loadProjectIndexOnce(project: number): Promise<void> {
  if (loadedProjectIndexes.has(project)) return;
  loadedProjectIndexes.add(project);
  try {
    await mls.stor.server.loadProjectInfoIfNeeded(project);
  } catch (error) {
    console.warn(`[cbMaterializeIo] could not load the file index of project ${project}`, error);
  }
}

/**
 * Load one import model, loudly. `addModels` used to be a bare best-effort call: a transient failure
 * left the compile without the model and produced a TS2792 that reads exactly like a broken import.
 * `force` drops whatever the registry holds first — a retry that respects the registry guard would be
 * a no-op precisely in the case worth retrying (an entry that exists but is unusable).
 */
async function loadImportModel(project: number, folder: string, shortName: string, force: boolean): Promise<boolean> {
  if (force) {
    try { mls.editor.deleteModels(project, shortName, folder, true, 1); } catch { /* nothing to drop */ }
  }
  try {
    await mls.editor.addModels(project, shortName, folder, 1);
    return true;
  } catch (error) {
    // "model already exists" is the platform's OLD behaviour: the model IS in Monaco under a key this
    // registry lost, so the create threw and the import stayed unborrowed. The editor now ADOPTS the
    // existing model instead of throwing (cfe-collab-front-end F1), so this branch should be dead — it
    // stays because the agent also runs on Studio builds that predate that fix, and there the goal (a
    // loaded model) is still met. The release is no longer a no-op either: a delete now reaches the
    // model by URI even when the two indexes diverge (F2).
    if (isModelAlreadyExistsError(error instanceof Error ? error.message : String(error))) {
      reportModelKeyMismatch(project, folder, shortName);
      return true;
    }
    console.warn(`[cbMaterializeIo] could not load import model /_${project}_/l1/${folder}/${shortName}.ts`, error);
    return false;
  }
}

/** Registry keys already reported: the mismatch is one fact per file, not one per compile. */
const reportedKeyMismatches = new Set<string>();

/**
 * Log the key this agent computes next to the keys Monaco actually holds for the same file, ONCE.
 * The mismatch is what makes the registry guard blind (the model exists, the guard says it does not);
 * fixing `getKeyModel`/`createModelTS` is a platform decision, so this only produces the evidence.
 */
function reportModelKeyMismatch(project: number, folder: string, shortName: string): void {
  const computed = mls.editor.getKeyModel(project, shortName, folder, 1);
  if (reportedKeyMismatches.has(computed)) return;
  reportedKeyMismatches.add(computed);
  const present = Object.keys(mls.editor.models || {}).filter(key => key.includes(shortName)).slice(0, 4);
  console.info(`[cbMaterializeIo] model registry key mismatch for /_${project}_/l1/${folder}/${shortName}.ts — computed "${computed}", present ${JSON.stringify(present)}`);
}

/**
 * Diagnostics that blame an import whose SOURCE IS ON DISK. The file exists, so the module is not
 * missing: the model behind it did not load. Treating these as plan errors is what burned the seed
 * repair budget and then failed a run whose plan was correct.
 */
function phantomModuleErrors(errors: string[]): Array<{ error: string; path: string }> {
  return errors.flatMap(error => {
    const path = phantomModulePathOf(error);
    if (!path) return [];
    const parts = mlsImportPathParts(path);
    if (!parts) return [];
    const key = mls.stor.getKeyToFile({ ...parts, extension: '.ts' });
    return (mls.stor.files as Record<string, unknown>)[key] ? [{ error, path }] : [];
  });
}

// Materialize workers run in a POOL (parallel_dynamic, 10 slots), so two compiles can overlap. Worker B
// skips borrowing a model that worker A already loaded (the registry guard above), so releasing A's
// borrows while B is mid-compile could pull a model out from under B and produce a FALSE TS2792 that
// burns repair budget. Releases are therefore deferred until no compile is in flight — the registry
// still gets emptied at every quiescent point, which is what keeps the listener count bounded.
let activeCompiles = 0;
const pendingRelease: BorrowedModel[] = [];

/** Queue models WE loaded/created for release, and release everything queued once the last in-flight
 * compile finishes. Without any release the registry only grows (the guards never re-add one) and Monaco
 * hits its "potential listener LEAK detected, having 200 listeners already" threshold — observed on a
 * 62-file module.
 *
 * Two sources are queued: the imports borrowed for a compile, and the model of the generated file itself
 * (created by saveGeneratedTs). Releasing the latter is safe because NOTHING in this agent depends on a
 * model outliving its compile: `mls.editor.models` is read in exactly two places, both of them the
 * "load it if absent" guards below (`:166` for imports, `:210` for the file being compiled). The
 * materialization step is an independent process — it can run in a later session or from the CLI — so it
 * can never assume a preloaded registry, and every compile reloads what it needs on demand.
 *
 * Only models WE put there are ever released: each site checks the registry first, so a file the user has
 * open in a Studio tab is never ours and is never disposed. */
function releaseBorrowedModels(borrowed: BorrowedModel[]): void {
  pendingRelease.push(...borrowed);
  if (activeCompiles > 0) return;
  const toRelease = pendingRelease.splice(0, pendingRelease.length);
  for (const model of toRelease) {
    // Signature is (project, shortName, folder, releaseMonacoModel, level) — the boolean comes BEFORE
    // the level. `true` disposes the underlying monaco model, which is what holds the listeners.
    try { mls.editor.deleteModels(model.project, model.shortName, model.folder, true, model.level); } catch { /* best effort */ }
  }
}

/**
 * Release everything the compiles queued, once no compile is in flight. `releaseBorrowedModels` only
 * drains at a quiescent point, and a long sweep (the whole-module compile borrows the imports of ~200
 * files) never reaches one on its own: the queue grows, the Monaco models pile up and the tab runs
 * out of memory. A caller that works in blocks calls this between them.
 */
export async function flushBorrowedModels(): Promise<{ released: number; pending: number }> {
  const queued = pendingRelease.length;
  // Nothing forces a wait here: the queue drains as soon as the count of in-flight compiles is zero,
  // and this agent's compiles are awaited one at a time.
  releaseBorrowedModels([]);
  return { released: queued - pendingRelease.length, pending: pendingRelease.length };
}

/**
 * How many models the registry holds and how many releases are still queued — the cheap way to see a
 * leak coming, and to prove it is gone. (Monaco's own store is not reachable from here; the registry
 * is the index this agent can account for, and since the platform fix a delete reaches the model even
 * when the two diverge.)
 */
export function modelCounts(): { registry: number; pendingRelease: number } {
  let registry = 0;
  try { registry = Object.keys(mls.editor.models || {}).length; } catch { /* registry unavailable */ }
  return { registry, pendingRelease: pendingRelease.length };
}

/** Compile the saved .ts and distinguish a clean compile from unavailable Monaco infrastructure. */
async function compileGeneratedTs(project: number, level: number, folder: string, shortName: string, content: string): Promise<{ errors: string[]; infraErrors: string[]; available: boolean }> {
  // Borrowed OUTSIDE the try so the finally can always release them, even on a compile exception.
  let borrowed: BorrowedModel[] = [];
  activeCompiles++;
  try {
    borrowed = await ensureImportModels(content);
    const editorKey = mls.editor.getKeyModel(project, shortName, folder, level);
    let modelBase = mls.editor.models[editorKey];
    if (!modelBase) modelBase = await mls.editor.addModels(project, shortName, folder, level) as mls.editor.IModels;
    const modelTs = modelBase?.ts as mls.editor.IModelTS;
    if (!modelTs) return { errors: [], infraErrors: [], available: false };
    if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
    await mls.l2.typescript.compileAndPostProcess(modelTs, true, true);
    mls.editor.forceModelUpdate(modelTs.model);
    // category 1 = Error in monaco/ts DiagnosticCategory; keep only real errors, capped.
    const readErrors = (): string[] => ((modelTs.compilerResults?.errors ?? []) as any[])
      .filter(d => d?.category === undefined || d.category === 1)
      .map(flattenDiagnostic)
      .filter(Boolean)
      .slice(0, 12);
    let errors = readErrors();
    // An import that exists on disk cannot be "not found": the model behind it failed to load. Force
    // it back and compile once more before believing the diagnostic.
    let phantom = phantomModuleErrors(errors);
    if (phantom.length) {
      for (const item of phantom) {
        const parts = mlsImportPathParts(item.path);
        if (parts) await loadImportModel(parts.project, parts.folder, parts.shortName, true);
      }
      if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
      await mls.l2.typescript.compileAndPostProcess(modelTs, true, true);
      mls.editor.forceModelUpdate(modelTs.model);
      errors = readErrors();
      phantom = phantomModuleErrors(errors);
    }
    return { errors, infraErrors: phantom.map(item => item.error), available: true };
  } catch (err) {
    console.warn('[cbMaterializeIo] compileGeneratedTs failed', err);
    return { errors: [], infraErrors: [], available: false };
  } finally {
    // NB: the model of the file BEING compiled (added above) is deliberately kept — it is a real project
    // artifact the editor/publish path and the repair loop reuse. Only the borrowed imports are released.
    activeCompiles--;
    releaseBorrowedModels(borrowed);
  }
}

/** Small deterministic fallback for syntax that TypeScript rejects before type checking. */
export interface SaveGeneratedTsResult {
  ok: boolean;
  /** TypeScript errors of the per-file compile (spec item 11: feed the compiler error back into the
   * repair prompt). Empty when clean or when the compile environment is unavailable. */
  compileErrors: string[];
  /** Deterministic INTRA-FILE syntax findings (subset of compileErrors). Never a false positive —
   * callers gate on these immediately even when the cross-file compile is deferred. */
  syntaxErrors: string[];
  /**
   * Errors blaming an import whose source IS on disk — the model did not load, the plan is fine.
   * They are also in `compileErrors`; a caller must never route these to an LLM repair.
   */
  infraErrors: string[];
  /** False means Monaco/project compilation was unavailable; syntax fallback still ran. */
  compilerAvailable: boolean;
}

/** Save (create or overwrite) a generated file with an ARBITRARY extension, WITHOUT compiling. Used for
 * byte-mirror artifacts (l1 contract copies `.ts`/`.d.ts` — B5) where the whole-project compile in
 * validate-all owns correctness; a per-file compile of a `.d.ts` twin would be meaningless. Mirrors the
 * write path of saveGeneratedTs (createStorFile with the Monaco model registered so later files import it). */
export async function saveGeneratedFile(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
  content: string,
): Promise<boolean> {
  try {
    const fileInfo = { project, level, folder, shortName, extension };
    const key = mls.stor.getKeyToFile(fileInfo);
    let file = (mls.stor.files as Record<string, any>)[key] as mls.stor.IFileInfo;
    if (!file) {
      file = await createStorFile({ ...fileInfo, source: content }, true, false, false);
    } else {
      const model = await file.getOrCreateModel();
      if (model) model.model.setValue(content);
    }
    file.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(file, { contentType: 'string', content });
    return true;
  } catch (err) {
    console.warn('[cbMaterializeIo] saveGeneratedFile failed', err);
    return false;
  }
}

/** Save (create or overwrite) a generated .ts file, force a recompile and report its errors. */
export async function saveGeneratedTs(
  project: number,
  level: number,
  folder: string,
  shortName: string,
  content: string,
): Promise<SaveGeneratedTsResult> {
  try {
    const fileInfo = { project, level, folder, shortName, extension: '.ts' };
    const key = mls.stor.getKeyToFile(fileInfo);
    // OWNERSHIP, decided BEFORE anything below can create a model: if the registry has no model for this
    // file yet, whatever the save creates (createStorFile with needCreateModel, or getOrCreateModel) is
    // OURS and is released after the compile. If a model already exists the file is open in the Studio —
    // not ours, never disposed.
    const ownsModel = !mls.editor.models[mls.editor.getKeyModel(project, shortName, folder, level)];
    let file = (mls.stor.files as Record<string, any>)[key] as mls.stor.IFileInfo;
    if (!file) {
      // needCreateModel=true (parity with cfeMaterializeStudio) so the compile below has a model to work
      // on. needCompile=false — the explicit compile owns that. NB: the model is NOT kept for later
      // importers; ensureImportModels reloads any import on demand, which is what makes releasing it
      // afterwards safe (materialization is an independent process and never assumes a warm registry).
      file = await createStorFile({ ...fileInfo, source: content }, true, false, false);
    } else {
      const model = await file.getOrCreateModel();
      if (model) model.model.setValue(content);
    }
    // Bump updatedAt so the freshly materialized .ts is newer than its .defs.ts (keeps isStale correct
    // across runs); libStor.createStorFile / setContent do not set it.
    file.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(file, { contentType: 'string', content });
    const compiled = shortName.endsWith('.defs') ? { errors: [], infraErrors: [], available: true } : await compileGeneratedTs(project, level, folder, shortName, content);
    // The content is already durable in stor; the monaco model was a working copy for the compile. Queue
    // it (released at the next quiescent point, so a peer compile in the pool can still import it).
    if (ownsModel) releaseBorrowedModels([{ project, shortName, folder, level }]);
    const syntaxErrors = syntaxDiagnostics(content).slice(0, 12);
    const compileErrors = [...syntaxErrors, ...compiled.errors].slice(0, 12);
    return { ok: true, compileErrors, syntaxErrors, infraErrors: compiled.infraErrors, compilerAvailable: compiled.available };
  } catch (err) {
    console.warn('[cbMaterializeIo] saveGeneratedTs failed', err);
    return { ok: false, compileErrors: [], syntaxErrors: [], infraErrors: [], compilerAvailable: false };
  }
}

/** Whole-project compile check (used by cb-validate-all): compile an already-saved generated .ts and
 * return its errors. At that point every generated file exists, so findings are REAL — unlike the
 * per-file compile during the layer sweep, which is deferred (see agentCbMaterialize). Returns []
 * when Monaco is unavailable — the deterministic checks remain the floor. */
export async function compileSavedTsAndGetErrors(project: number, folder: string, shortName: string): Promise<string[]> {
  try {
    const key = mls.stor.getKeyToFile({ project, level: 1, folder, shortName, extension: '.ts' });
    const file = (mls.stor.files as Record<string, any>)[key] as mls.stor.IFileInfo | undefined;
    if (!file || file.status === 'deleted') return [];
    const content = String(await file.getContent() ?? '');
    const compiled = await compileGeneratedTs(project, 1, folder, shortName, content);
    return compiled.available ? compiled.errors : [];
  } catch {
    return [];
  }
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Pull the arguments of a named tool call out of the model payload (several shapes supported). */
export function extractToolCallArgs<T>(raw: unknown, toolName: string): T | null {
  const v = parseMaybeJson(raw);
  if (!isRecord(v)) return null;
  if (v.toolName === toolName) {
    const args = parseMaybeJson(v.arguments);
    return isRecord(args) ? (args as unknown as T) : null;
  }
  if (v.type === 'flexible' && v.result !== undefined) {
    const result = parseMaybeJson(v.result);
    if (isRecord(result) && result.toolName === toolName) {
      const args = parseMaybeJson(result.arguments);
      return isRecord(args) ? (args as unknown as T) : null;
    }
  }
  if (Array.isArray(v.tool_calls)) {
    const call = (v.tool_calls as unknown[]).find(
      (item) => isRecord(item) && isRecord((item as any).function) && (item as any).function.name === toolName,
    );
    if (isRecord(call)) {
      const args = parseMaybeJson((call as any).function.arguments);
      return isRecord(args) ? (args as unknown as T) : null;
    }
  }
  return null;
}
