/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Compile.ts" enhancement="_blank"/>

// Proof = the Studio compiler (briefing section 6). An unavailable compiler is a failure, never "clean".
//
// The model lookup and the import preload are this agent's own: the 102035 helper files every `.defs.ts`
// under the `ts` slot and preloads a `/x.defs.js` import as `x.defs.ts` (a file that does not exist).
// A controller imports its contract `.defs.js` type, so with that helper it would never compile.

import { enterStudioCompile, formatCompilerDiagnostic, leaveStudioCompile, releaseBorrowedModelScope, studioCompileAvailable } from '/_102035_/l2/solution/studioCompile.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { fileRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

export interface M12CompileResult {
  path: string;
  errors: string[];
}

interface M12Model {
  model?: { getValue(): string; setValue?(value: string): void };
  compilerResults?: { errors?: unknown[]; prodDTS?: unknown; modelNeedCompile?: boolean };
}

export interface M12Compiler {
  available(): boolean;
  enter(): void;
  leave(): void;
  read(info: M12FileInfo): Promise<string | null>;
  model(info: M12FileInfo): Promise<M12Model | null>;
  preload(info: M12FileInfo): Promise<string[]>;
  compile(info: M12FileInfo): Promise<{ errors: string[] } | null>;
}

/** Editor slot of a stor file: one per extension family, under one key per (project, folder, shortName). */
export function modelSlotOf(extension: string): 'ts' | 'defs' | 'test' | 'style' | 'html' {
  if (extension === '.defs.ts') return 'defs';
  if (extension === '.test.ts') return 'test';
  if (extension === '.less') return 'style';
  if (extension === '.html') return 'html';
  return 'ts';
}

const MLS_IMPORT = /\bfrom\s+['"]\/_(\d+)_\/l(\d+)\/([^'"]+)\.js['"]/gu;

/** Absolute `/…/x.js` and `/…/x.defs.js` specifiers of `source` as stor files. */
export function importedFiles(source: string): M12FileInfo[] {
  const out: M12FileInfo[] = [];
  for (const match of source.matchAll(MLS_IMPORT)) {
    const rest = match[3];
    const at = rest.lastIndexOf('/');
    const name = at < 0 ? rest : rest.slice(at + 1);
    const defs = name.endsWith('.defs');
    out.push({
      project: Number(match[1]),
      level: Number(match[2]),
      folder: at < 0 ? '' : rest.slice(0, at),
      shortName: defs ? name.slice(0, -'.defs'.length) : name,
      extension: defs ? '.defs.ts' : '.ts',
    });
  }
  return out;
}

function belongsTo(model: M12Model | undefined, info: M12FileInfo): boolean {
  const owner = (model as { storFile?: Partial<M12FileInfo> } | undefined)?.storFile;
  return !!model?.model && !!owner && owner.project === info.project && owner.level === info.level
    && (owner.folder ?? '') === info.folder && owner.shortName === info.shortName && owner.extension === info.extension;
}

/**
 * The editor model of exactly this stor file. One editor key covers `<x>.ts` and `<x>.defs.ts` of the same
 * folder, so a model is matched by its `storFile`, never by slot alone.
 */
async function studioModel(info: M12FileInfo): Promise<M12Model | null> {
  const file = (mls.stor.files as Record<string, any>)[mls.stor.getKeyToFile(info as mls.stor.IFileInfo)];
  if (!file || file.status === 'deleted') return null;
  const key = mls.editor.getKeyModel(info.project, info.shortName, info.folder, info.level);
  const find = (): M12Model | undefined => {
    const slots = (mls.editor.models as Record<string, any>)[key] as Record<string, M12Model> | undefined;
    if (!slots) return undefined;
    const preferred = slots[modelSlotOf(info.extension)];
    if (belongsTo(preferred, info)) return preferred;
    return Object.values(slots).find(model => belongsTo(model, info));
  };
  let model = find();
  if (!model) {
    // The Studio's own path for an l1 model (libModel, as readProjectTypescriptAndCompileL1 does), without the
    // compile it would start: this agent compiles it next, with a deadline.
    const { createModel } = await import('/_102027_/l2/libModel.js');
    const created = await createModel(file, false, false) as M12Model | undefined;
    model = find() ?? (belongsTo(created, info) ? created : undefined);
  }
  if (!model?.model) return null;
  // Monaco compiles memory, not stor: bring the model to the stor bytes.
  try {
    const content = await file.getContent?.();
    if (typeof content === 'string' && model.model.getValue() !== content) model.model.setValue?.(content);
  } catch { /* the byte check of compileM12Files catches a mismatch */ }
  return model;
}

/** How long one call to the Studio TypeScript worker may take before the unit fails instead of hanging. */
export const M12_COMPILE_TIMEOUT_MS = 60_000;

/**
 * A worker failure (e.g. `DataCloneError` inside `ts.worker.js`, measured 05/10/2026 on an l1 file) never settles
 * the main-thread promise: without a deadline the phase hangs forever. With it, the unit fails by name.
 */
export async function withCompileTimeout<T>(what: string, work: Promise<T>, timeoutMs = M12_COMPILE_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`M12_COMPILER_TIMEOUT: the Studio TypeScript worker did not answer for ${what} in ${timeoutMs / 1000}s (see the browser console for the worker error).`)), timeoutMs);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type StudioTypescript = {
  compileAndPostProcess?: (model: unknown, runAfterCompile: boolean, saveCache: boolean) => Promise<unknown>;
  compile: (model: unknown) => Promise<unknown>;
};

function studioTypescript(): StudioTypescript {
  return (mls as unknown as { l2: { typescript: StudioTypescript } }).l2.typescript;
}

/**
 * An l1 file is proven by its diagnostics only. `mls.l2.typescript.compile` also asks the TypeScript worker for
 * imports, the emit output, decorators and the JSON doc; on an l1 model one of those answers could not be
 * cloned back (DataCloneError in ts.worker.js, 05/10/2026, through compile and compileAndPostProcess alike), and
 * the server JavaScript of l1 is built at publish anyway. So an l1 file asks the worker for exactly what the
 * proof needs, through the Studio's public helpers: `getTypeScriptWorker(model)` and `getDiagnostics(fileName,
 * worker)` (syntactic, then semantic). Each call has its own deadline and the cause names the call that hung.
 */
async function l1Diagnostics(info: M12FileInfo, model: M12Model): Promise<{ errors: string[] }> {
  const typescript = studioTypescript() as StudioTypescript & {
    getTypeScriptWorker?: (model: unknown) => Promise<unknown>;
    getDiagnostics?: (fileName: string, worker: unknown) => Promise<unknown[]>;
  };
  if (typeof typescript.getTypeScriptWorker !== 'function' || typeof typescript.getDiagnostics !== 'function') {
    throw new Error('M12_COMPILER_TIMEOUT: mls.l2.typescript has no getTypeScriptWorker/getDiagnostics here');
  }
  const ref = fileRef(info);
  const textModel = model.model as unknown as { uri?: { toString(): string } };
  const fileName = textModel.uri?.toString() ?? '';
  if (!fileName) throw new Error(`model of ${ref} has no uri`);
  const worker = await withCompileTimeout(`${ref} (getTypeScriptWorker)`, typescript.getTypeScriptWorker(model.model));
  const diagnostics = await withCompileTimeout(`${ref} (getDiagnostics)`, typescript.getDiagnostics(fileName, worker));
  const text = typeof (model.model as { getValue?: unknown }).getValue === 'function' ? String((model.model as { getValue(): string }).getValue()) : '';
  return { errors: (Array.isArray(diagnostics) ? diagnostics : []).map(diagnostic => `${formatCompilerDiagnostic(diagnostic)}${diagnosticLocation(diagnostic, text)}`) };
}

/**
 * Where a worker diagnostic points, as " (line L, column C: `…the code there…`)". The worker sends `start` as an
 * offset and no source file, so the shared formatter prints no position; the repair prompt then only said
 * "TS1005 ',' expected" for a 77-line request and the model never found the missing brace (agendaClinica, 07/10).
 */
export function diagnosticLocation(diagnostic: unknown, text: string): string {
  const start = diagnostic && typeof diagnostic === 'object' ? (diagnostic as { start?: unknown }).start : undefined;
  if (typeof start !== 'number' || !text || start < 0 || start > text.length) return '';
  const before = text.slice(0, start);
  const line = before.split('\n').length;
  const lineStart = before.lastIndexOf('\n') + 1;
  const column = start - lineStart + 1;
  const lineEnd = text.indexOf('\n', start);
  const whole = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd);
  const from = Math.max(0, column - 1 - 160);
  const snippet = `${from > 0 ? '…' : ''}${whole.slice(from, column - 1)}⟨here⟩${whole.slice(column - 1, column - 1 + 80)}${column - 1 + 80 < whole.length ? '…' : ''}`;
  return ` (line ${line}, column ${column}: \`${snippet}\`)`;
}

/**
 * An l1 file: diagnostics only (see l1Diagnostics). Any other level: compile + enhancement post-process +
 * service-worker cache, as the l2 materializers do.
 */
async function studioCompile(info: M12FileInfo): Promise<{ errors: string[] } | null> {
  const model = await studioModel(info);
  if (!model?.model) return null;
  if (info.level === 1) return l1Diagnostics(info, model);
  if (model.compilerResults) model.compilerResults.modelNeedCompile = true;
  const typescript = studioTypescript();
  const ref = fileRef(info);
  if (typeof typescript.compileAndPostProcess !== 'function') {
    await withCompileTimeout(ref, typescript.compile(model));
  } else {
    const runtime = info.extension === '.ts';
    await withCompileTimeout(ref, typescript.compileAndPostProcess(model, runtime, runtime));
    if (!model.compilerResults?.prodDTS && model.compilerResults) {
      model.compilerResults.modelNeedCompile = true;
      await withCompileTimeout(ref, typescript.compile(model));
    }
  }
  return { errors: (model.compilerResults?.errors ?? []).map(formatCompilerDiagnostic) };
}

/** Loads (and compiles once, for its declaration) every transitive import before `root` is compiled. */
async function studioPreload(root: M12FileInfo): Promise<string[]> {
  const missing: string[] = [];
  const seen = new Set<string>([fileRef(root)]);
  const queue: M12FileInfo[] = [root];
  const typescript = studioTypescript();
  while (queue.length) {
    const current = queue.shift()!;
    const model = await studioModel(current);
    const source = model?.model?.getValue() ?? await readOptional(current);
    if (source === null) { missing.push(`${fileRef(current)} (source unreadable)`); continue; }
    for (const dep of importedFiles(source)) {
      const id = fileRef(dep);
      if (seen.has(id)) continue;
      seen.add(id);
      try {
        const depModel = await studioModel(dep);
        if (!depModel?.model) { missing.push(id); continue; }
        // An l1 dependency only needs its model in the editor: the worker type-checks against the models it has.
        // Compiling it here would send it through the full compile that broke the worker on l1.
        if (dep.level !== 1 && !depModel.compilerResults?.prodDTS) {
          if (depModel.compilerResults) depModel.compilerResults.modelNeedCompile = true;
          await withCompileTimeout(id, typescript.compile(depModel));
        }
      } catch (error) {
        missing.push(`${id} (${error instanceof Error ? error.message : String(error)})`);
        continue;
      }
      queue.push(dep);
    }
  }
  return missing;
}

const STUDIO: M12Compiler = {
  available: studioCompileAvailable,
  enter: enterStudioCompile,
  leave: leaveStudioCompile,
  read: readOptional,
  model: studioModel,
  preload: studioPreload,
  compile: studioCompile,
};

/**
 * Prefix of a compile that did not happen: no Studio compiler, or a TypeScript worker that stopped answering.
 * The unit keeps its file and ends `done COMPILE_UNAVAILABLE_L1` with the cause; it is never a clean compile.
 */
export const L1_UNAVAILABLE = 'M12_COMPILE_UNAVAILABLE_L1';

export function isUnavailable(error: string): boolean {
  return error.startsWith(L1_UNAVAILABLE);
}

/**
 * Breaker for the page: once the Studio TypeScript worker stops answering (DataCloneError inside ts.worker.js,
 * measured 05/10/2026), every later compile of the run is reported unavailable at once instead of waiting the
 * deadline again for each file. A page reload resets it.
 */
const breaker = globalThis as unknown as { __agentMaterializeL1WorkerDown?: string };

export function workerDown(): string {
  return breaker.__agentMaterializeL1WorkerDown || '';
}

export function markWorkerDown(cause: string): void {
  breaker.__agentMaterializeL1WorkerDown = cause;
}

/**
 * Compiles `files` in order (dependencies first) against the bytes this run wrote: a file whose stor or model
 * text differs from `expected` is a failure, not a compile of someone else's text.
 */
export async function compileM12Files(
  files: ReadonlyArray<{ info: M12FileInfo; expected: string }>,
  compiler: M12Compiler = STUDIO,
): Promise<M12CompileResult[]> {
  const fail = (message: string) => files.map(file => ({ path: fileRef(file.info), errors: [message] }));
  if (compiler === STUDIO && workerDown()) return fail(`${L1_UNAVAILABLE}: ${workerDown()}`);
  if (typeof mls === 'undefined' && compiler === STUDIO) return fail(`${L1_UNAVAILABLE}: no Studio`);
  let entered = false;
  try {
    if (!compiler.available()) return fail(`${L1_UNAVAILABLE}: the Studio TypeScript compiler is not available here`);
    compiler.enter(); entered = true;
    const results: M12CompileResult[] = [];
    for (const file of files) {
      const path = fileRef(file.info);
      try {
        if (await compiler.read(file.info) !== file.expected) throw new Error('stor bytes differ from the generated source');
        const before = await compiler.model(file.info);
        if (!before?.model || before.model.getValue() !== file.expected) throw new Error('Studio model is unavailable or differs from the generated source');
        const missing = await compiler.preload(file.info);
        if (!Array.isArray(missing)) throw new Error('import preload returned no result');
        if (missing.length) throw new Error(`imports unavailable: ${missing.join(', ')}`);
        const compiled = await compiler.compile(file.info);
        if (!compiled || !Array.isArray(compiled.errors)) throw new Error('compiler returned no diagnostics');
        if (await compiler.read(file.info) !== file.expected) throw new Error('stor bytes changed during compilation');
        results.push({ path, errors: compiled.errors });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith('M12_COMPILER_TIMEOUT')) {
          if (compiler === STUDIO) markWorkerDown(message);
          results.push({ path, errors: [`${L1_UNAVAILABLE}: ${message}`] });
          continue;
        }
        results.push({ path, errors: [message] });
      }
    }
    return results;
  } catch (error) {
    return fail(`${L1_UNAVAILABLE}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (entered) compiler.leave();
  }
}

/** Releases the editor models the compile path borrowed (call at the end of a phase). */
export function releaseCompileModels(): void {
  try { releaseBorrowedModelScope(); } catch { /* best effort: no Studio */ }
}

export function compileDiagnostics(results: readonly M12CompileResult[]): string[] {
  return results.flatMap(result => result.errors.map(error => `${result.path}: ${error}`));
}
