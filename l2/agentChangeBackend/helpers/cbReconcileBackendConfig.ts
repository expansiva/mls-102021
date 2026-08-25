/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbReconcileBackendConfig.ts" enhancement="_blank"/>

// Client backend registration in l5/config.json is RECONCILIATION, not append. A leftover
// persistenceModules entry whose tableDefsDir no longer exists makes publish migration throw
// ENOENT in discoverTableDefinitions and abort the release. Live modules come from
// l5/project.json (the scan/register write); discarded orphans are named in the returned list.

export interface LiveBackendModule {
  moduleId: string;
  backendControllers: string;
  tableDefsDir: string;
}

export interface ReconcileBackendConfigResult<M extends Record<string, unknown>, P extends Record<string, unknown>> {
  modules: M[];
  persistenceModules: P[];
  discarded: string[];
}

export function formatDiscardedOrphans(discarded: readonly string[]): string {
  return discarded.length === 0 ? '' : `; discarded orphan module(s): ${discarded.join(', ')}`;
}

export function liveBackendModulesFromL5(l5Modules: unknown): LiveBackendModule[] {
  const live: LiveBackendModule[] = [];
  if (!Array.isArray(l5Modules)) return live;
  for (const l5mod of l5Modules) {
    if (!isRecord(l5mod)) continue;
    const moduleId = readString(l5mod.moduleName);
    const backend = isRecord(l5mod.backend) ? l5mod.backend : null;
    if (!moduleId || !backend) continue;
    const persistence = isRecord(backend.persistence) ? backend.persistence : {};
    const backendControllers = readString(backend.backendControllers);
    const tableDefsDir = readString(persistence.tableDefsDir);
    if (!backendControllers || !tableDefsDir) continue;
    live.push({ moduleId, backendControllers, tableDefsDir });
  }
  return live;
}

/** Drop l5/project.json backend blocks whose persistence dir is gone, except the module this run owns. */
export function pruneOrphanL5BackendModules<M extends Record<string, unknown>>(
  modules: readonly M[] | undefined,
  currentModuleName: string,
  tableDefsExists: (moduleName: string) => boolean,
): { modules: M[]; discarded: string[] } {
  const discarded: string[] = [];
  const kept: M[] = [];
  for (const mod of Array.isArray(modules) ? modules : []) {
    if (!isRecord(mod)) continue;
    const name = readString(mod.moduleName);
    const backend = isRecord(mod.backend) ? mod.backend : null;
    if (!name || !backend || name === currentModuleName || tableDefsExists(name)) {
      kept.push({ ...mod } as M);
      continue;
    }
    discarded.push(name);
    const rest = { ...mod } as M;
    delete (rest as Record<string, unknown>).backend;
    const extraKeys = Object.keys(rest).filter(key => key !== 'moduleName');
    if (extraKeys.length > 0) kept.push(rest);
  }
  discarded.sort();
  return { modules: kept, discarded };
}

export function reconcileClientBackendRegistration<
  M extends Record<string, unknown>,
  P extends Record<string, unknown>,
>(
  existingModules: readonly M[] | undefined,
  existingPersistence: readonly P[] | undefined,
  live: readonly LiveBackendModule[],
): ReconcileBackendConfigResult<M, P> {
  const liveIds = new Set(live.map(item => item.moduleId));
  const modules = (existingModules ?? []).filter(isRecord).map(mod => ({ ...mod })) as M[];
  const persistenceById = new Map<string, P>();
  for (const pm of existingPersistence ?? []) {
    if (!isRecord(pm)) continue;
    const id = readString(pm.moduleId);
    if (id) persistenceById.set(id, { ...pm } as P);
  }

  const discarded = new Set<string>();
  for (const id of persistenceById.keys()) {
    if (!liveIds.has(id)) discarded.add(id);
  }
  for (const mod of modules) {
    const id = readString(mod.moduleId);
    if (id && !liveIds.has(id) && (mod.backendControllers || mod.backendRouter)) discarded.add(id);
  }

  for (const item of live) {
    let mod = modules.find(candidate => readString(candidate.moduleId) === item.moduleId);
    if (!mod) {
      mod = { moduleId: item.moduleId, basePath: `/${item.moduleId}`, shellMode: 'spa' } as unknown as M;
      modules.push(mod);
    }
    const rec = mod as Record<string, unknown>;
    rec.basePath = readString(rec.basePath) || `/${item.moduleId}`;
    rec.shellMode = readString(rec.shellMode) || 'spa';
    rec.backendControllers = item.backendControllers;
    delete rec.backendRouter;

    const pm = { ...(persistenceById.get(item.moduleId) || { moduleId: item.moduleId }) } as P;
    const pmRec = pm as Record<string, unknown>;
    pmRec.moduleId = item.moduleId;
    pmRec.tableDefsDir = item.tableDefsDir;
    delete pmRec.persistenceEntrypoint;
    persistenceById.set(item.moduleId, pm);
  }

  for (const mod of modules) {
    const id = readString(mod.moduleId);
    if (!id || liveIds.has(id)) continue;
    delete (mod as Record<string, unknown>).backendControllers;
    delete (mod as Record<string, unknown>).backendRouter;
  }

  const persistenceModules = live.map(item => persistenceById.get(item.moduleId)!);
  const keptModules = modules.filter(mod => {
    const id = readString(mod.moduleId);
    if (liveIds.has(id)) return true;
    const frontend = isRecord(mod.frontend) ? mod.frontend : null;
    const pages = frontend && Array.isArray(frontend.pages) ? frontend.pages : [];
    if (pages.length > 0) return true;
    if (id) discarded.add(id);
    return false;
  });

  return {
    modules: keptModules,
    persistenceModules,
    discarded: [...discarded].sort(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
