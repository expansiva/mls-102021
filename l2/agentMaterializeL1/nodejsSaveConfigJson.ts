/// <mls fileReference="_102021_/l2/agentMaterializeL1/nodejsSaveConfigJson.ts" enhancement="_blank"/>

// Publish-time composer (backend side). Runs on the dev machine via tsx, BEFORE rsync:
//   tsx mls-102021/l2/agentMaterializeL1/nodejsSaveConfigJson.ts <clientId>
// Reads the client-owned mls-<clientId>/l5/project.json (written by agentMaterializeL1)
// and reconciles the backend part of the workspace ProjectsConfig into mls-<clientId>/config.json:
// projects (client + master backend + 102029 lib), modules[].backendControllers,
// modules[].backend.pageTests (from l5/project.json, checked as .ts, written as .js; omitted when none) and
// persistenceModules[].tableDefsDir. Leftover modules whose dirs are gone are dropped (named in the
// log) — append would leave a dead tableDefsDir that crashes publish migration with ENOENT.
// Routes/tables themselves are discovered at RUNTIME by the production master from those folders.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { L5ProjectJson, MasterRuntimeManifest, ProjectsConfig } from '/_102029_/l2/runtimeConfigTypes.js';
// Relative import: this file runs via tsx at publish; path-mapped /_102021_/… is type-only there.
import {
  formatDiscardedOrphans,
  liveBackendModulesFromL5,
  reconcileClientBackendRegistration,
} from './register/cbReconcileBackendConfig.js';
import { emitMlsDepJson } from '../../../mls-102029/l2/mlsDepManifest.js';

const HERE = path.dirname(process.argv[1] ? path.resolve(process.argv[1]) : process.cwd());
const ROOT = process.env.SAVE_CONFIG_ROOT ? path.resolve(process.env.SAVE_CONFIG_ROOT) : path.resolve(HERE, '../../../');

function fail(msg: string): never { console.error(`[nodejsSaveConfigJson:backend] ${msg}`); process.exit(1); }

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
}

function resolveListedPath(root: string, listed: string): string {
  return path.join(root, listed.replace(/^\.\//, '').replace(/^_(\d+)_\//, 'mls-$1/'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function pageTestsByModuleFromL5(l5Modules: unknown): Map<string, string[]> {
  const byModule = new Map<string, string[]>();
  if (!Array.isArray(l5Modules)) return byModule;
  for (const l5mod of l5Modules) {
    if (!isRecord(l5mod)) continue;
    const moduleId = typeof l5mod.moduleName === 'string' ? l5mod.moduleName.trim() : '';
    const backend = isRecord(l5mod.backend) ? l5mod.backend : null;
    if (!moduleId || !backend || !Array.isArray(backend.pageTests)) continue;
    const listed = backend.pageTests.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
    if (listed.length) byModule.set(moduleId, listed);
  }
  return byModule;
}

function applyPageTests(
  modules: Array<Record<string, unknown>> | undefined,
  pageTestsByModule: Map<string, string[]>,
): void {
  if (!modules) return;
  for (const mod of modules) {
    const moduleId = typeof mod.moduleId === 'string' ? mod.moduleId : '';
    const listed = moduleId ? pageTestsByModule.get(moduleId) : undefined;
    if (listed?.length) {
      const backend = isRecord(mod.backend) ? { ...mod.backend } : {};
      backend.pageTests = listed.map(item => item.replace(/\.ts$/, '.js'));
      mod.backend = backend;
      continue;
    }
    if (!isRecord(mod.backend)) continue;
    const backend = { ...mod.backend };
    delete backend.pageTests;
    if (Object.keys(backend).length) mod.backend = backend;
    else delete mod.backend;
  }
}

function projectRuntimeMetadata(l5: L5ProjectJson, clientId: string) {
  return {
    projectId: l5.projectId || clientId,
    domain: l5.domain,
    port: l5.port,
    databaseName: l5.databaseName,
    environment: l5.environment,
    studioEnabled: l5.studioEnabled,
  };
}

export function composeBackendRuntimeConfig(root: string, clientId: string): { configPath: string; moduleCount: number } {
  if (!/^\d+$/.test(clientId)) throw new Error('usage: tsx nodejsSaveConfigJson.ts <clientId>');

  const clientRoot = path.join(root, `mls-${clientId}`);
  const runtimeL5Path = path.join(clientRoot, 'l5', 'runtime.project.json');
  const l5Path = fs.existsSync(runtimeL5Path) ? runtimeL5Path : path.join(clientRoot, 'l5', 'project.json');
  const l5 = readJson<L5ProjectJson>(l5Path);
  if (!l5) throw new Error(`cannot read ${l5Path}`);

  const signature = l5.masters?.backend;
  if (!signature) throw new Error('l5/project.json has no masters.backend signature (run agentMaterializeL1 or add it)');
  const runtimeId = String(signature.runtimeProject);

  // Single source of truth: l5/config.json (read by the Studio apps, the publish and the runtime).
  const configPath = path.join(clientRoot, 'l5', 'config.json');
  const config = (readJson<ProjectsConfig>(configPath) || {}) as ProjectsConfig;

  // Skeleton (idempotent): each composer only ensures what it owns/needs.
  config.defaultProjectId = config.defaultProjectId || clientId;
  config.projects = config.projects || {};
  config.projects[clientId] = { ...(config.projects[clientId] || {}), root: '.', type: 'client', runtime: projectRuntimeMetadata(l5, clientId) };
  config.projects[runtimeId] = { root: `../mls-${runtimeId}`, type: 'master backend' };
  // The backend runtime imports shared code from 102029.
  config.projects['102029'] = config.projects['102029'] || { root: '../mls-102029', type: 'lib' };

  // System modules the master ships with (mdm, monitor, audit, ...): the master is
  // self-describing via its own masterModules.json — routes and menu for these modules
  // disappear from the runtime if this merge is skipped.
  const manifest = readJson<MasterRuntimeManifest>(path.join(root, `mls-${runtimeId}`, 'masterModules.json'));
  if (manifest?.modules?.length) config.projects[runtimeId].modules = manifest.modules;
  if (manifest?.persistenceModules?.length) config.projects[runtimeId].persistenceModules = manifest.persistenceModules;

  const client = config.projects[clientId];
  const live = liveBackendModulesFromL5(l5.modules);
  const pageTestsByModule = pageTestsByModuleFromL5(l5.modules);
  for (const item of live) {
    const controllersDir = resolveListedPath(root, item.backendControllers);
    if (!fs.existsSync(controllersDir)) throw new Error(`backendControllers dir not found on disk: ${controllersDir}`);
    if (!item.tableDefsDir) continue;
    const tableDefsDir = resolveListedPath(root, item.tableDefsDir);
    if (!fs.existsSync(tableDefsDir)) throw new Error(`persistence tableDefsDir not found on disk: ${tableDefsDir}`);
  }
  for (const listed of [...pageTestsByModule.values()].flat()) {
    const pageTestsFile = resolveListedPath(root, listed);
    if (!fs.existsSync(pageTestsFile)) throw new Error(`pageTests file not found on disk: ${listed}`);
  }
  if (live.length === 0) throw new Error('l5/project.json declares no modules with a backend block; nothing to compose');

  const reconciled = reconcileClientBackendRegistration(
    client.modules as Record<string, unknown>[] | undefined,
    client.persistenceModules as Record<string, unknown>[] | undefined,
    live,
  );
  client.modules = reconciled.modules as unknown as typeof client.modules;
  applyPageTests(client.modules as unknown as Array<Record<string, unknown>>, pageTestsByModule);
  client.persistenceModules = reconciled.persistenceModules as unknown as typeof client.persistenceModules;
  const orphanNote = formatDiscardedOrphans(reconciled.discarded);
  if (reconciled.discarded.length) {
    console.warn(`[nodejsSaveConfigJson:backend] discarded orphan module(s): ${reconciled.discarded.join(', ')}`);
  }

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  emitMlsDepJson(path.join(clientRoot, 'mlsDep.json'), config, l5, {
    read: (file) => fs.readFileSync(file, 'utf8'),
    write: (file, source) => fs.writeFileSync(file, source),
  });
  console.log(`[nodejsSaveRuntimeConfig:backend] composed ${live.length} module(s)${orphanNote} → ${configPath}`);
  return { configPath, moduleCount: live.length };
}

function main(): void {
  const clientId = (process.argv[2] || '').replace(/^mls-/, '');
  try {
    composeBackendRuntimeConfig(ROOT, clientId);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entry && entry === path.resolve(fileURLToPath(import.meta.url))) main();
