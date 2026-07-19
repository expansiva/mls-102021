/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/register/agentCbRegister.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic registration after materialization. Routes and table definitions are discovered at
// RUNTIME by the 102034 host: config `backendControllers` -> each controller's exported `routes`,
// and `persistenceModules[].tableDefsDir` -> the exported TableDefinition adapters. So NO router or
// persistence index file is generated here. This step (a) generates the module's composition root
// (adapters/persistence/registerRepositories.ts — one registerRepository() per adapter; the 102034
// moduleRegistry imports it through the persistenceModules[].tableDefsDir config link before loading
// the controllers), (b) writes the module's backend registration into the CLIENT-owned
// l5/project.json (backendControllers dir + tableDefsDir + routeKeys) so the final backend step can
// merge l5/config.json WITHOUT the masters (102033/102034) importing the client — dependency
// inversion, spec item 13 — and (c) gates to validateAll. NEVER registers MDM tables (those belong
// to 102034).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readBackendScan, enqueueNext, createUpdateStatusIntent, isRecord, logPrefix } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { saveGeneratedTs } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbRegister', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/register', agentDescription: 'Deterministic backend registration (l5 config + composition root; routes/tables discovered at runtime)', visibility: 'private', beforePromptStep };
}

/** First `export const … = {…} as const;` block — the artifact data of an l1 defs file. */
function parseArtifactData(content: string): Record<string, unknown> | undefined {
  const s = content.indexOf('= ');
  const e = content.indexOf(' as const;');
  if (s === -1 || e <= s) return undefined;
  try { const o = JSON.parse(content.slice(s + 2, e)); if (!isRecord(o)) return undefined; return isRecord(o.data) ? o.data : o; } catch { return undefined; }
}

/** Composition root: bind every repositoryAdapter defs of the module to its port name (entityId). */
async function writeRegisterRepositories(project: number, moduleName: string): Promise<string> {
  const persistenceFolder = `${moduleName}/layer_1_external/adapters/persistence`;
  const adapters: Array<{ portName: string; factoryName: string; importPath: string }> = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.folder || '') !== persistenceFolder) continue;
    const data = parseArtifactData(String(await file.getContent()));
    const className = data && typeof (data as any).className === 'string' ? String((data as any).className) : '';
    const entityId = data && typeof (data as any).entityId === 'string' ? String((data as any).entityId) : '';
    if (!className.endsWith('RepositoryAdapter') || !entityId) continue;
    adapters.push({
      portName: entityId,
      factoryName: `create${className}`,
      importPath: `/_${project}_/l1/${persistenceFolder}/${file.shortName}.js`,
    });
  }
  if (adapters.length === 0) return 'composition root skipped (no repository adapters)';
  adapters.sort((a, b) => a.portName.localeCompare(b.portName));
  const content = [
    `/// <mls fileReference="_${project}_/l1/${persistenceFolder}/registerRepositories.ts" enhancement="_blank"/>`,
    '',
    '// Composition root — generated deterministically by agentCbRegister; do not edit by hand.',
    '// The 102034 moduleRegistry imports this file through the persistenceModules[].tableDefsDir',
    '// config link before loading the module controllers, so usecases can resolveRepository().',
    "import { registerRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';",
    ...adapters.map((a) => `import { ${a.factoryName} } from '${a.importPath}';`),
    '',
    ...adapters.map((a) => `registerRepository('${a.portName}', ${a.factoryName});`),
    '',
  ].join('\n');
  const saved = await saveGeneratedTs(project, 1, persistenceFolder, 'registerRepositories', content);
  if (!saved.ok) return 'composition root write failed';
  if (saved.compileErrors.length > 0) return `composition root written with compile errors: ${saved.compileErrors[0]}`;
  return `composition root written (${adapters.length} repository port(s))`;
}

/** Collect the route keys the generated controllers expose (their exported `routes[].key`). */
async function collectRouteKeys(project: number): Promise<string[]> {
  const keys = new Set<string>();
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/adapters/http/controllers')) continue;
    const data = parseArtifactData(String(await file.getContent()));
    const routes = data && Array.isArray((data as any).routes) ? (data as any).routes : [];
    for (const r of routes) { const k = String(r?.key || ''); if (k) keys.add(k); }
  }
  return [...keys].sort();
}

/** Write the module's backend block into the client-owned l5/project.json (guarded; never blocks). */
async function updateL5BackendConfig(project: number, moduleName: string, routeKeys: string[]): Promise<string> {
  const fileInfo = { project, level: 5, folder: '', shortName: 'project', extension: '.json' };
  const key = mls.stor.getKeyToFile(fileInfo as unknown as mls.stor.IFileInfo);
  const file = (mls.stor.files as Record<string, any>)[key];
  if (!file || file.status === 'deleted') return 'l5/project.json not found; backend config skipped';
  const cfg = JSON.parse(String(await file.getContent()));
  // Master signature: records who generated the backend and which production master runtime uses.
  if (!isRecord(cfg.masters)) cfg.masters = {};
  cfg.masters.backend = { masterProject: 102021, agentFolder: 'agentChangeBackend', runtimeProject: 102034 };
  const controllersDir = `./_${project}_/l1/${moduleName}/layer_1_external/adapters/http/controllers`;
  const tableDefsDir = `./_${project}_/l1/${moduleName}/layer_1_external/adapters/persistence`;
  const modules = Array.isArray(cfg.modules) ? cfg.modules : (cfg.modules = []);
  let mod = modules.find((m: any) => m && m.moduleName === moduleName);
  if (!mod) { mod = { moduleName }; modules.push(mod); }
  mod.backend = { backendControllers: controllersDir, persistence: { tableDefsDir }, routeKeys };
  const content = JSON.stringify(cfg, null, 2);
  file.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(file, { contentType: 'string', content });
  return `l5/project.json backend block updated for '${moduleName}' (${routeKeys.length} route(s))`;
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const project = mls.actualProject || 0;
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const moduleName = scan.moduleNames[0] || 'unknown';
    const moduleTables = scan.aggregates.map(a => a.rootEntity);
    let compositionMsg = 'composition root skipped';
    try {
      compositionMsg = await writeRegisterRepositories(project, moduleName);
    } catch (rootError) {
      // Non-blocking: validateAll still runs and surfaces the missing registrations.
      compositionMsg = `composition root failed: ${rootError instanceof Error ? rootError.message : String(rootError)}`;
      console.warn(`${logPrefix(agent)} ${compositionMsg}`);
    }
    let configMsg = 'l5 config skipped';
    try {
      // Route keys: v1 controllers expose them in their .defs.ts (collectRouteKeys); v2 controllers are
      // deterministic .ts with no defs, so their routes come straight from the workspace bffCalls
      // (route = <module>.<workspaceId>.<bffId>). backendControllers stays the CONTROLLERS DIR — the
      // 102034 host discovers every workspace controller by directory, so 1-file-per-workspace needs no
      // change there; only the informational routeKeys list must include the v2 routes.
      const v1RouteKeys = await collectRouteKeys(project);
      const v2RouteKeys = scan.workspaces
        .filter(w => w.moduleName === moduleName)
        .flatMap(w => w.bffCalls.map(b => b.route))
        .filter(Boolean);
      const routeKeys = [...new Set([...v1RouteKeys, ...v2RouteKeys])].sort();
      configMsg = await updateL5BackendConfig(project, moduleName, routeKeys);
    } catch (cfgError) {
      // Non-blocking: a config write failure must not abort the run.
      configMsg = `l5 config update failed: ${cfgError instanceof Error ? cfgError.message : String(cfgError)}`;
      console.warn(`${logPrefix(agent)} ${configMsg}`);
    }
    return [
      enqueueNext(context, parentStep, step, 'cb-validate-all', 'agentCbValidateAll', 'Validar artefatos l1', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Registered ${moduleTables.length} module table(s). ${compositionMsg}. ${configMsg}`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
