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

export interface ReconcileL5Input {
  project: number;
  moduleName: string;
  /** development and presentation may register a structure stub. Production must not. */
  allowStructureStub: boolean;
  phase: 'structure' | 'verified';
  projectJson: string | null;
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
  backend: Record<string, unknown> | null;
  pendings: L5Pending[];
  detail: string;
}

const OWNED_BACKEND = ['backendControllers', 'routeKeys', 'scenarioCatalog', 'materialization'] as const;

export function reconcileL5Backend(input: ReconcileL5Input): L5ReconcileResult {
  if (input.projectJson === null) {
    return pendingResult('l5/project.json is absent. Registration was not created.', [
      { origin: 'l5/project.json', reason: 'PROJECT_JSON_ABSENT' },
    ]);
  }
  let cfg: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(input.projectJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return invalidResult('l5/project.json is not an object. Bytes were kept.');
    }
    cfg = parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return invalidResult(`l5/project.json could not be parsed (${message}). Bytes were kept.`);
  }
  if (cfg.modules !== undefined && !Array.isArray(cfg.modules)) {
    return pendingKeep(input.projectJson, 'modules is not a list. Bytes were kept.', [
      { origin: 'l5/project.json', reason: 'MODULES_NOT_A_LIST' },
    ]);
  }

  const built = buildBackend(input);
  if (!built.backend) {
    return pendingKeep(input.projectJson, built.detail, built.pendings);
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

  const next = stringifyLike(cfg, input.projectJson);
  if (next === input.projectJson) {
    return {
      action: 'unchanged',
      nextText: input.projectJson,
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
    backend: isRecord(mod.backend) ? mod.backend : built.backend,
    pendings: built.pendings,
    detail: built.pendings.length > 0
      ? built.detail
      : `backend registration patched for ${input.moduleName}.`,
  };
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

function pendingResult(detail: string, pendings: L5Pending[]): L5ReconcileResult {
  return { action: 'pending', nextText: null, backend: null, pendings, detail };
}

function pendingKeep(original: string, detail: string, pendings: L5Pending[]): L5ReconcileResult {
  return { action: 'pending', nextText: original, backend: null, pendings, detail };
}

function invalidResult(detail: string): L5ReconcileResult {
  return { action: 'invalid', nextText: null, backend: null, pendings: [{ origin: 'l5/project.json', reason: 'PROJECT_JSON_INVALID' }], detail };
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
