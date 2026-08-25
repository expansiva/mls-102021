/// <mls fileReference="_102021_/l2/agentChangeBackend/nodejsSaveConfigJson.ts" enhancement="_blank"/>

// Publish-time composer (backend side). Runs on the dev machine via tsx, BEFORE rsync:
//   tsx mls-102021/l2/agentChangeBackend/nodejsSaveConfigJson.ts <clientId>
// Reads the client-owned mls-<clientId>/l5/project.json (written by agentChangeBackend)
// and reconciles the backend part of the workspace ProjectsConfig into mls-<clientId>/config.json:
// projects (client + master backend + 102029 lib), modules[].backendControllers and
// persistenceModules[].tableDefsDir. Leftover modules whose dirs are gone are dropped (named in the
// log) — append would leave a dead tableDefsDir that crashes publish migration with ENOENT.
// Routes/tables themselves are discovered at RUNTIME by the production master from those folders.

import fs from 'node:fs';
import path from 'node:path';
import type { L5ProjectJson, MasterRuntimeManifest, ProjectsConfig } from '/_102029_/l2/runtimeConfigTypes.js';
// Relative import: this file runs via tsx at publish; path-mapped /_102021_/… is type-only there.
import {
  formatDiscardedOrphans,
  liveBackendModulesFromL5,
  reconcileClientBackendRegistration,
} from './helpers/cbReconcileBackendConfig.js';

const HERE = path.dirname(process.argv[1] ? path.resolve(process.argv[1]) : process.cwd());
const ROOT = process.env.SAVE_CONFIG_ROOT ? path.resolve(process.env.SAVE_CONFIG_ROOT) : path.resolve(HERE, '../../../');

function fail(msg: string): never { console.error(`[nodejsSaveConfigJson:backend] ${msg}`); process.exit(1); }

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
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

function main(): void {
  const clientId = (process.argv[2] || '').replace(/^mls-/, '');
  if (!/^\d+$/.test(clientId)) fail('usage: tsx nodejsSaveConfigJson.ts <clientId>');

  const clientRoot = path.join(ROOT, `mls-${clientId}`);
  const runtimeL5Path = path.join(clientRoot, 'l5', 'runtime.project.json');
  const l5Path = fs.existsSync(runtimeL5Path) ? runtimeL5Path : path.join(clientRoot, 'l5', 'project.json');
  const l5 = readJson<L5ProjectJson>(l5Path);
  if (!l5) fail(`cannot read ${l5Path}`);

  const signature = l5.masters?.backend;
  if (!signature) fail(`l5/project.json has no masters.backend signature (run agentChangeBackend or add it)`);
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
  const manifest = readJson<MasterRuntimeManifest>(path.join(ROOT, `mls-${runtimeId}`, 'masterModules.json'));
  if (manifest?.modules?.length) config.projects[runtimeId].modules = manifest.modules;
  if (manifest?.persistenceModules?.length) config.projects[runtimeId].persistenceModules = manifest.persistenceModules;

  const client = config.projects[clientId];
  const live = liveBackendModulesFromL5(l5.modules);
  for (const item of live) {
    const controllersDir = path.join(ROOT, item.backendControllers.replace(/^\.\//, '').replace(/^_(\d+)_\//, 'mls-$1/'));
    const tableDefsDir = path.join(ROOT, item.tableDefsDir.replace(/^\.\//, '').replace(/^_(\d+)_\//, 'mls-$1/'));
    if (!fs.existsSync(controllersDir)) fail(`backendControllers dir not found on disk: ${controllersDir}`);
    if (!fs.existsSync(tableDefsDir)) fail(`persistence tableDefsDir not found on disk: ${tableDefsDir}`);
  }
  if (live.length === 0) fail('l5/project.json declares no modules with a backend block; nothing to compose');

  const reconciled = reconcileClientBackendRegistration(
    client.modules as Record<string, unknown>[] | undefined,
    client.persistenceModules as Record<string, unknown>[] | undefined,
    live,
  );
  client.modules = reconciled.modules as unknown as typeof client.modules;
  client.persistenceModules = reconciled.persistenceModules as unknown as typeof client.persistenceModules;
  const orphanNote = formatDiscardedOrphans(reconciled.discarded);
  if (reconciled.discarded.length) {
    console.warn(`[nodejsSaveConfigJson:backend] discarded orphan module(s): ${reconciled.discarded.join(', ')}`);
  }

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`[nodejsSaveRuntimeConfig:backend] composed ${live.length} module(s)${orphanNote} → ${configPath}`);
}

main();
