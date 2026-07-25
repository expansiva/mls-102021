/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>

// Platform I/O glue for the in-studio materializer (agentCbMaterialize), vendored into agentChangeBackend
// so it does not depend on agentMaterializeSolution (being removed). Pure mls.stor / libStor access; the
// pure prompt/parse/order logic lives in cbMaterializeCore.ts (shared with the Node CLI).

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
async function ensureImportModels(content: string): Promise<void> {
  for (const match of content.matchAll(/from\s+['"]\/_(\d+)_\/l1\/([^'"]+?)\.js['"]/gu)) {
    const importProject = Number(match[1]);
    if (!Number.isInteger(importProject) || importProject <= 0) continue;
    const path = match[2];
    const idx = path.lastIndexOf('/');
    if (idx <= 0) continue;
    const folder = path.slice(0, idx);
    const shortName = path.slice(idx + 1);
    if (mls.editor.models[mls.editor.getKeyModel(importProject, shortName, folder, 1)]) continue;
    const fileKey = mls.stor.getKeyToFile({ project: importProject, level: 1, folder, shortName, extension: '.ts' });
    if (!(mls.stor.files as Record<string, unknown>)[fileKey]) continue;
    try { await mls.editor.addModels(importProject, shortName, folder, 1); } catch { /* best effort: the compile error stays precise */ }
  }
}

/** Compile the saved .ts and distinguish a clean compile from unavailable Monaco infrastructure. */
async function compileGeneratedTs(project: number, level: number, folder: string, shortName: string, content: string): Promise<{ errors: string[]; available: boolean }> {
  try {
    await ensureImportModels(content);
    const editorKey = mls.editor.getKeyModel(project, shortName, folder, level);
    let modelBase = mls.editor.models[editorKey];
    if (!modelBase) modelBase = await mls.editor.addModels(project, shortName, folder, level) as mls.editor.IModels;
    const modelTs = modelBase?.ts as mls.editor.IModelTS;
    if (!modelTs) return { errors: [], available: false };
    if (modelTs.compilerResults) modelTs.compilerResults.modelNeedCompile = true;
    await mls.l2.typescript.compileAndPostProcess(modelTs, true, true);
    mls.editor.forceModelUpdate(modelTs.model);
    // category 1 = Error in monaco/ts DiagnosticCategory; keep only real errors, capped.
    const diags = (modelTs.compilerResults?.errors ?? []) as any[];
    return { errors: diags
      .filter(d => d?.category === undefined || d.category === 1)
      .map(flattenDiagnostic)
      .filter(Boolean)
      .slice(0, 12), available: true };
  } catch (err) {
    console.warn('[cbMaterializeIo] compileGeneratedTs failed', err);
    return { errors: [], available: false };
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
    let file = (mls.stor.files as Record<string, any>)[key] as mls.stor.IFileInfo;
    if (!file) {
      // needCreateModel=true (parity with cfeMaterializeStudio): register the Monaco model at
      // creation so files materialized later in the run can import this one (see
      // ensureSameProjectImportModels). needCompile=false — the explicit compile below owns that.
      file = await createStorFile({ ...fileInfo, source: content }, true, false, false);
    } else {
      const model = await file.getOrCreateModel();
      if (model) model.model.setValue(content);
    }
    // Bump updatedAt so the freshly materialized .ts is newer than its .defs.ts (keeps isStale correct
    // across runs); libStor.createStorFile / setContent do not set it.
    file.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(file, { contentType: 'string', content });
    const compiled = shortName.endsWith('.defs') ? { errors: [], available: true } : await compileGeneratedTs(project, level, folder, shortName, content);
    const syntaxErrors = syntaxDiagnostics(content).slice(0, 12);
    const compileErrors = [...syntaxErrors, ...compiled.errors].slice(0, 12);
    return { ok: true, compileErrors, syntaxErrors, compilerAvailable: compiled.available };
  } catch (err) {
    console.warn('[cbMaterializeIo] saveGeneratedTs failed', err);
    return { ok: false, compileErrors: [], syntaxErrors: [], compilerAvailable: false };
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
