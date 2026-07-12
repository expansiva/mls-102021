/// <mls fileReference="_102021_/l2/agentChangeBackend/nodejsSaveConfigJson.ts" enhancement="_blank"/>

// Publish-time composer (backend side). Runs on the dev machine via tsx, BEFORE rsync:
//   tsx mls-102021/l2/agentChangeBackend/nodejsSaveConfigJson.ts <clientId>
// Reads the client-owned mls-<clientId>/l5/project.json (written by agentChangeBackend)
// and merges the backend part of the workspace ProjectsConfig into mls-<clientId>/config.json:
// projects (client + master backend + 102029 lib), modules[].backendControllers and
// persistenceModules[].tableDefsDir. Routes/tables themselves are discovered at RUNTIME by
// the production master from those folders — this file only wires the dependency inversion.

import fs from 'node:fs';
import path from 'node:path';
import type { L5ProjectJson, MasterRuntimeManifest, ProjectsConfig, ProjectModuleConfig } from '/_102029_/l2/runtimeConfigTypes.js';
// Relative path (not /_102029_/...) because this file runs standalone via tsx at publish:
// tsx resolves relative .ts, but does not swap .js→.ts for path-mapped (/_XXX_/) runtime imports.
import { serializeRuntimeConfig } from '../../../mls-102029/l2/runtimeConfigEmit.js';

const HERE = path.dirname(process.argv[1] ? path.resolve(process.argv[1]) : process.cwd());
const ROOT = process.env.SAVE_CONFIG_ROOT ? path.resolve(process.env.SAVE_CONFIG_ROOT) : path.resolve(HERE, '../../../');

function fail(msg: string): never { console.error(`[nodejsSaveConfigJson:backend] ${msg}`); process.exit(1); }

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
}

function generatedConfigPath(clientId: string): string {
  const dir = path.join(ROOT, '.generated', 'configs');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `mls-${clientId}.config.json`);
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

  // The JSON config is a generated build/runtime artifact. Keep it outside the
  // client repo to avoid duplicating l5/project.json and l5/runtimeConfig.ts.
  const configPath = generatedConfigPath(clientId);
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

  // For each system module that ships a module.ts (frontend definition), reference its navigation
  // from that module.ts (self-contained) instead of inlining — the client never duplicates it.
  // Modules without a module.ts (e.g. mdm) get no navigation and won't show in the Apps menu.
  const runtimeRoot = path.join(ROOT, `mls-${runtimeId}`);
  for (const m of config.projects[runtimeId].modules || []) {
    if (fs.existsSync(path.join(runtimeRoot, 'l2', m.moduleId, 'module.ts'))) {
      m.navigationFromModule = `/_${runtimeId}_/l2/${m.moduleId}/module.js`;
    }
  }

  const client = config.projects[clientId];
  client.modules = client.modules || [];
  client.persistenceModules = client.persistenceModules || [];

  let backendModules = 0;
  for (const l5mod of l5.modules || []) {
    if (!l5mod?.moduleName || !l5mod.backend) continue;
    const controllersDir = path.join(ROOT, l5mod.backend.backendControllers.replace(/^\.\//, '').replace(/^_(\d+)_\//, 'mls-$1/'));
    const tableDefsDir = path.join(ROOT, l5mod.backend.persistence.tableDefsDir.replace(/^\.\//, '').replace(/^_(\d+)_\//, 'mls-$1/'));
    if (!fs.existsSync(controllersDir)) fail(`backendControllers dir not found on disk: ${controllersDir}`);
    if (!fs.existsSync(tableDefsDir)) fail(`persistence tableDefsDir not found on disk: ${tableDefsDir}`);

    let mod = client.modules.find(m => m.moduleId === l5mod.moduleName);
    if (!mod) { mod = { moduleId: l5mod.moduleName, basePath: `/${l5mod.moduleName}`, shellMode: 'spa' } as ProjectModuleConfig; client.modules.push(mod); }
    mod.backendControllers = l5mod.backend.backendControllers;
    delete mod.backendRouter; // hexagonal model only; the legacy router must not survive composition

    let pm = client.persistenceModules.find(m => m.moduleId === l5mod.moduleName);
    if (!pm) { pm = { moduleId: l5mod.moduleName }; client.persistenceModules.push(pm); }
    pm.tableDefsDir = l5mod.backend.persistence.tableDefsDir;
    delete pm.persistenceEntrypoint;
    backendModules += 1;
  }
  if (backendModules === 0) fail('l5/project.json declares no modules with a backend block; nothing to compose');

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const tsPath = path.join(clientRoot, 'l5', 'runtimeConfig.ts');
  fs.writeFileSync(tsPath, serializeRuntimeConfig(config, clientId));
  console.log(`[nodejsSaveRuntimeConfig:backend] composed ${backendModules} module(s) → ${configPath} + ${tsPath}`);
}

main();
