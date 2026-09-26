/// <mls fileReference="_102021_/l2/agentMaterializeL1/register/reconcileL5.ts" enhancement="_blank"/>

/**
 * Pure L5 backend registration for one module. The caller passes the project
 * JSON bytes and the files it already read. This module does not glob, does
 * not invent a folder, and does not write.
 */

import { outputPathFromDefPath } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { M1_STUB_ERROR, parseCatalog } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';

/** Role comes from the promoted def's artifactType. Paths are not a classification. */
export type L5PromotedRole = 'httpController' | 'table' | 'repositoryRegistration' | 'output';

export interface L5FileFact {
  ref: string;
  source: string | null;
  role: L5PromotedRole;
}

const PROMOTION_ROLES = new Set<L5PromotedRole>(['httpController', 'table', 'repositoryRegistration']);

export function roleFromArtifactType(artifactType: string): L5PromotedRole {
  return PROMOTION_ROLES.has(artifactType as L5PromotedRole) ? artifactType as L5PromotedRole : 'output';
}

/**
 * Files the reconciler may see: promoted outputs (def path → output path) plus the
 * same-module imports those controllers name. No directory convention and no glob.
 */
export async function loadRegistrationFiles(
  project: number,
  moduleName: string,
  units: readonly { defPath: string; artifactType: string }[],
  read: (ref: string) => Promise<string | null>,
): Promise<L5FileFact[]> {
  const files: L5FileFact[] = [];
  const seen = new Set<string>();
  for (const unit of units) {
    const output = outputPathFromDefPath(unit.defPath);
    if (!output || seen.has(output)) continue;
    seen.add(output);
    files.push({ ref: output, source: await read(output), role: roleFromArtifactType(unit.artifactType) });
  }
  const controllers = files.filter(file => file.role === 'httpController' && file.source !== null);
  for (const controller of controllers) {
    for (const ref of sameModuleImports(controller.source!, project, moduleName)) {
      if (seen.has(ref)) continue;
      seen.add(ref);
      files.push({ ref, source: await read(ref), role: 'output' });
    }
  }
  return files;
}

/** Fields both L5 readers use. `agentFolder` is required only when this publication fills a missing signature. */
export interface L5BackendSignature {
  masterProject: number;
  runtimeProject: number;
  agentFolder?: string;
}

export interface ReconcileL5Input {
  project: number;
  moduleName: string;
  /** development and presentation may register a structure stub. Production must not. */
  allowStructureStub: boolean;
  phase: 'structure' | 'verified';
  projectJson: string | null;
  /**
   * Absent or omitted: the composer falls back to project.json. A string is an existing file.
   * This function never creates that second file.
   */
  runtimeProjectJson?: string | null;
  /**
   * Copied only when masters.backend is absent and the value already satisfies both readers.
   * This module does not invent agentChangeBackend.
   */
  backendSignature?: L5BackendSignature | null;
  files: readonly L5FileFact[];
  catalogRef: string | null;
}

export interface L5Pending {
  origin: string;
  reason: string;
}

export interface L5ReconcileResult {
  action: 'patch' | 'unchanged' | 'pending' | 'invalid';
  /** Null when the caller must keep the previous bytes (absent or unreadable). */
  nextText: string | null;
  /** File the composer reads. A patch applies only to this file. */
  effectiveSource: 'l5/project.json' | 'l5/runtime.project.json';
  backend: Record<string, unknown> | null;
  pendings: L5Pending[];
  detail: string;
}

/** Marker on a runtime.project.json snapshot this publication already owns. Not written onto a new file. */
export const L5_PUBLICATION_OWNER = 'agentMaterializeL1';

export interface L5CommitIo {
  claim(project: number, holder: string): Promise<boolean>;
  release(project: number, holder: string): Promise<void>;
  read(ref: string): Promise<string | null>;
  /** Writes only when the current bytes still equal `expected`. `expected` null means the file is absent. */
  compareAndSwap(ref: string, expected: string | null, next: string): Promise<'ok' | 'conflict'>;
}

const OWNED_BACKEND = ['backendControllers', 'routeKeys', 'scenarioCatalog', 'materialization'] as const;

export function projectJsonRef(project: number): string {
  return `_${project}_/l5/project.json`;
}

export function runtimeProjectJsonRef(project: number): string {
  return `_${project}_/l5/runtime.project.json`;
}

export function projectLockRef(project: number): string {
  return `_${project}_/l5/m1-project-lock.json`;
}

/**
 * Lock the project, reread both L5 documents, merge, and compare-and-swap the file the composer
 * reads. A second conflict leaves the bytes another writer stored. Does not regenerate sources.
 */
export async function commitL5Registration(
  input: Omit<ReconcileL5Input, 'projectJson' | 'runtimeProjectJson'>,
  io: L5CommitIo,
  holder: string,
): Promise<L5ReconcileResult> {
  if (!await io.claim(input.project, holder)) {
    return pendingResult('l5 project lock is held. Registration was not written.', [
      { origin: projectLockRef(input.project), reason: 'PROJECT_LOCK_BUSY' },
    ]);
  }
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const projectJson = await io.read(projectJsonRef(input.project));
      const runtimeProjectJson = await io.read(runtimeProjectJsonRef(input.project));
      const result = reconcileL5Backend({ ...input, projectJson, runtimeProjectJson });
      if (result.action !== 'patch' || result.nextText === null) return result;
      const target = result.effectiveSource === 'l5/runtime.project.json'
        ? runtimeProjectJsonRef(input.project)
        : projectJsonRef(input.project);
      const expected = result.effectiveSource === 'l5/runtime.project.json' ? runtimeProjectJson : projectJson;
      if (await io.compareAndSwap(target, expected, result.nextText) === 'ok') return result;
    }
    return pendingResult('l5 changed again before the write. The concurrent bytes were kept.', [
      { origin: projectJsonRef(input.project), reason: 'CONCURRENT_EDIT' },
    ]);
  } finally {
    await io.release(input.project, holder);
  }
}

export function reconcileL5Backend(input: ReconcileL5Input): L5ReconcileResult {
  const selected = selectDocument(input);
  if (selected.stop) return selected.stop;
  const sourceName = selected.source === 'l5/runtime.project.json' ? 'l5/runtime.project.json' : 'l5/project.json';
  if (selected.text === null) {
    return pendingResult(`${sourceName} is absent. Registration was not created.`, [
      { origin: sourceName, reason: 'PROJECT_JSON_ABSENT' },
    ]);
  }
  let cfg: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(selected.text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return invalidResult(`${sourceName} is not an object. Bytes were kept.`, selected.source);
    }
    cfg = parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return invalidResult(`${sourceName} could not be parsed (${message}). Bytes were kept.`, selected.source);
  }
  const signature = applySignature(cfg, input.backendSignature);
  if (signature) {
    return pendingKeep(selected.text, `${signature.reason} ${signature.origin}. Bytes were kept.`, [signature], selected.source);
  }
  if (cfg.modules !== undefined && !Array.isArray(cfg.modules)) {
    return pendingKeep(selected.text, 'modules is not a list. Bytes were kept.', [
      { origin: sourceName, reason: 'MODULES_NOT_A_LIST' },
    ], selected.source);
  }

  const built = buildBackend(input);
  if (!built.backend) {
    return pendingKeep(selected.text, built.detail, built.pendings, selected.source);
  }

  const modules = Array.isArray(cfg.modules) ? cfg.modules.map(cloneRecord) : [];
  let mod = modules.find(item => readString(item.moduleName) === input.moduleName);
  if (!mod) {
    mod = { moduleName: input.moduleName };
    modules.push(mod);
  }
  const previous = isRecord(mod.backend) ? mod.backend : {};
  mod.backend = mergeBackend(previous, built.backend);
  cfg.modules = modules;

  const next = stringifyLike(cfg, selected.text);
  if (next === selected.text) {
    return {
      action: 'unchanged',
      nextText: selected.text,
      effectiveSource: selected.source,
      backend: built.backend,
      pendings: built.pendings,
      detail: built.pendings.length > 0
        ? built.detail
        : `backend registration for ${input.moduleName} already matches the materialized files.`,
    };
  }
  return {
    action: 'patch',
    nextText: next,
    effectiveSource: selected.source,
    backend: isRecord(mod.backend) ? mod.backend : built.backend,
    pendings: built.pendings,
    detail: built.pendings.length > 0
      ? built.detail
      : `backend registration patched for ${input.moduleName}.`,
  };
}

function selectDocument(input: ReconcileL5Input): { text: string | null; source: L5ReconcileResult['effectiveSource']; stop: L5ReconcileResult | null } {
  if (input.runtimeProjectJson == null) {
    return { text: input.projectJson, source: 'l5/project.json', stop: null };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.runtimeProjectJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      text: null,
      source: 'l5/runtime.project.json',
      stop: invalidResult(`l5/runtime.project.json could not be parsed (${message}). Bytes were kept.`, 'l5/runtime.project.json', 'RUNTIME_JSON_INVALID'),
    };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      text: null,
      source: 'l5/runtime.project.json',
      stop: invalidResult('l5/runtime.project.json is not an object. Bytes were kept.', 'l5/runtime.project.json', 'RUNTIME_JSON_INVALID'),
    };
  }
  const owner = (parsed as Record<string, unknown>).publicationOwner;
  if (owner !== L5_PUBLICATION_OWNER) {
    const who = typeof owner === 'string' && owner ? owner : 'unspecified';
    return {
      text: null,
      source: 'l5/runtime.project.json',
      stop: pendingResult(
        `composer reads l5/runtime.project.json (owner: ${who}). project.json was not modified.`,
        [{ origin: 'l5/runtime.project.json', reason: 'RUNTIME_OVERRIDE_DIVERGENT' }],
        'l5/runtime.project.json',
      ),
    };
  }
  return { text: input.runtimeProjectJson, source: 'l5/runtime.project.json', stop: null };
}

/** A stored signature the nodejs composer and the publish script can both keep. Absent agentFolder stays absent. */
function signatureIsCompatible(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isProjectId(value.masterProject) || !isProjectId(value.runtimeProject)) return false;
  if (value.agentFolder === undefined) return true;
  return typeof value.agentFolder === 'string' && value.agentFolder.length > 0;
}

/** Filling a hole needs the folder the publish script uses to find the composer. */
function readersAcceptFill(value: L5BackendSignature | null | undefined): value is L5BackendSignature {
  if (!value) return false;
  return signatureIsCompatible(value) && typeof value.agentFolder === 'string' && value.agentFolder.length > 0;
}

function applySignature(cfg: Record<string, unknown>, candidate: L5BackendSignature | null | undefined): L5Pending | null {
  const masters = isRecord(cfg.masters) ? cfg.masters : {};
  if (!('backend' in masters)) {
    if (candidate == null) return null;
    if (!readersAcceptFill(candidate)) {
      return { origin: 'masters.backend', reason: 'SIGNATURE_INCOMPATIBLE' };
    }
    cfg.masters = { ...masters, backend: { masterProject: candidate.masterProject, runtimeProject: candidate.runtimeProject, agentFolder: candidate.agentFolder } };
    return null;
  }
  if (!signatureIsCompatible(masters.backend)) {
    return { origin: 'masters.backend', reason: 'SIGNATURE_INCOMPATIBLE' };
  }
  return null;
}

const BLOCKING = new Set([
  'CONTROLLERS_ABSENT',
  'STUB_REFUSED',
  'CONTROLLER_DIRS_DIVERGE',
  'LOCAL_TABLE_ABSENT',
  'COMPOSITION_ROOT_ABSENT',
  'CATALOG_ABSENT',
  'CATALOG_UNREADABLE',
  'CATALOG_EMPTY',
  'NO_ROUTES',
]);

function buildBackend(input: ReconcileL5Input): { backend: Record<string, unknown> | null; pendings: L5Pending[]; detail: string } {
  const pendings: L5Pending[] = [];
  const declared = input.files.filter(file => file.role === 'httpController');
  const controllers = declared.filter(file => file.source !== null);
  for (const file of declared) {
    if (file.source === null) {
      pendings.push({ origin: file.ref, reason: 'CONTROLLER_FILE_ABSENT' });
    }
  }
  if (controllers.length === 0) pendings.push({ origin: 'httpController', reason: 'CONTROLLERS_ABSENT' });
  const routeKeys: string[] = [];
  const controllerDirs = new Set<string>();
  for (const file of controllers) {
    const source = file.source!;
    if (!input.allowStructureStub && source.includes(M1_STUB_ERROR)) {
      pendings.push({ origin: file.ref, reason: 'STUB_REFUSED' });
      continue;
    }
    const missing = sameModuleImports(source, input.project, input.moduleName).filter(ref => {
      const fact = input.files.find(item => item.ref === ref);
      return !fact || fact.source === null;
    });
    if (missing.length > 0) {
      for (const origin of missing) pendings.push({ origin, reason: 'ROUTE_DEPENDENCY_ABSENT' });
      continue;
    }
    const extracted = routeKeysOf(source);
    if (extracted.length === 0) {
      pendings.push({ origin: file.ref, reason: 'ROUTES_ABSENT' });
      continue;
    }
    controllerDirs.add(directoryOf(file.ref));
    routeKeys.push(...extracted);
  }
  if (controllerDirs.size > 1) {
    pendings.push({ origin: [...controllerDirs].sort().join(', '), reason: 'CONTROLLER_DIRS_DIVERGE' });
  }
  const persistenceDir = persistenceDirectory(input);
  if (!persistenceDir) pendings.push({ origin: input.moduleName, reason: 'LOCAL_TABLE_ABSENT' });
  const registration = persistenceDir
    ? input.files.find(file => file.role === 'repositoryRegistration' && file.source !== null && directoryOf(file.ref) === persistenceDir)
    : undefined;
  if (!registration) pendings.push({ origin: 'repositoryRegistration', reason: 'COMPOSITION_ROOT_ABSENT' });
  const catalog = catalogList(input, pendings);
  const cleanRoutes = unique(routeKeys).sort();
  if (controllers.length > 0 && cleanRoutes.length === 0 && !pendings.some(item => item.reason === 'STUB_REFUSED')) {
    pendings.push({ origin: 'httpController', reason: 'NO_ROUTES' });
  }
  const blocking = pendings.filter(item => BLOCKING.has(item.reason));
  if (blocking.length > 0 || !persistenceDir || controllerDirs.size !== 1) {
    return {
      backend: null,
      pendings,
      detail: pendings.map(item => `${item.reason} ${item.origin}`).join('; ') || 'registration withheld',
    };
  }
  const backend: Record<string, unknown> = {
    backendControllers: `./${[...controllerDirs][0]}`,
    persistence: { tableDefsDir: `./${persistenceDir}` },
    routeKeys: cleanRoutes,
    materialization: {
      phase: input.phase,
      behaviorVerified: input.phase === 'verified',
    },
  };
  if (catalog) backend.scenarioCatalog = catalog;
  return {
    backend,
    pendings,
    detail: pendings.map(item => `${item.reason} ${item.origin}`).join('; '),
  };
}

function catalogList(input: ReconcileL5Input, pendings: L5Pending[]): string[] | null {
  if (!input.catalogRef) return null;
  const fact = input.files.find(file => file.ref === input.catalogRef);
  if (!fact || fact.source === null) {
    pendings.push({ origin: input.catalogRef, reason: 'CATALOG_ABSENT' });
    return null;
  }
  const parsed = parseCatalog(fact.source);
  if (!parsed.catalog) {
    pendings.push({ origin: input.catalogRef, reason: 'CATALOG_UNREADABLE' });
    return null;
  }
  if (parsed.catalog.scenarios.length === 0) {
    pendings.push({ origin: input.catalogRef, reason: 'CATALOG_EMPTY' });
    return null;
  }
  return [input.catalogRef];
}

function sameModuleImports(source: string, project: number, moduleName: string): string[] {
  const refs: string[] = [];
  const pattern = /from '(\/_\d+_\/[^']+)'/g;
  let match = pattern.exec(source);
  while (match) {
    const ref = match[1].replace(/^\//, '').replace(/\.js$/, '.ts');
    if (ref.startsWith(`_${project}_/l1/${moduleName}/`)) refs.push(ref);
    match = pattern.exec(source);
  }
  return refs;
}

function routeKeysOf(source: string): string[] {
  if (!/export const routes\b/.test(source) && !/export const \w+: ControllerRoute\[\]/.test(source)) return [];
  const keys: string[] = [];
  const pattern = /key:\s*'([^']+)'/g;
  let match = pattern.exec(source);
  while (match) {
    keys.push(match[1]);
    match = pattern.exec(source);
  }
  return keys;
}

function persistenceDirectory(input: ReconcileL5Input): string {
  const tables = input.files.filter(file => file.role === 'table' && file.source !== null);
  if (tables.length === 0) return '';
  const dirs = new Set(tables.map(file => directoryOf(file.ref)));
  if (dirs.size !== 1) return '';
  return [...dirs][0];
}

function directoryOf(ref: string): string {
  const parts = ref.split('/');
  parts.pop();
  return parts.join('/');
}

function mergeBackend(previous: Record<string, unknown>, built: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...previous };
  for (const key of OWNED_BACKEND) {
    if (key in built) next[key] = built[key];
  }
  const prevPersistence = isRecord(previous.persistence) ? previous.persistence : {};
  const builtPersistence = isRecord(built.persistence) ? built.persistence : {};
  next.persistence = { ...prevPersistence, tableDefsDir: builtPersistence.tableDefsDir };
  return next;
}

function stringifyLike(value: unknown, original: string): string {
  const body = JSON.stringify(value, null, 2);
  return original.endsWith('\n') ? `${body}\n` : body;
}

function pendingResult(detail: string, pendings: L5Pending[], effectiveSource: L5ReconcileResult['effectiveSource'] = 'l5/project.json'): L5ReconcileResult {
  return { action: 'pending', nextText: null, effectiveSource, backend: null, pendings, detail };
}

function pendingKeep(original: string, detail: string, pendings: L5Pending[], effectiveSource: L5ReconcileResult['effectiveSource'] = 'l5/project.json'): L5ReconcileResult {
  return { action: 'pending', nextText: original, effectiveSource, backend: null, pendings, detail };
}

function invalidResult(detail: string, effectiveSource: L5ReconcileResult['effectiveSource'] = 'l5/project.json', reason = 'PROJECT_JSON_INVALID'): L5ReconcileResult {
  const origin = effectiveSource;
  return { action: 'invalid', nextText: null, effectiveSource, backend: null, pendings: [{ origin, reason }], detail };
}

function isProjectId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function cloneRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  return { ...value };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
