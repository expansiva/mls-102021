/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/register70/agentM12Register.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_REGISTER_AGENT_NAME, clip, errorText, parseM12StepInvocation, type M12RunArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { readOptional, readUnitStatus, removeStorFile, stateReady, unproven, usable, writeJson, writeText } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { fileRef, infoOfRef, pageTestsFile, projectJsonFile, registrationFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import { loadRegistrationFiles, projectLockRef, reconcileL5Backend, runtimeProjectJsonRef, type L5ReconcileResult } from '/_102021_/l2/agentMaterializeL1/emitters/reconcileL5.js';

export function createAgent(): IAgentAsync {
  return { agentName: M12_REGISTER_AGENT_NAME, agentProject: 102021, agentFolder: 'agentMaterializeL1/steps/register70', agentDescription: 'Register the materialized backend of the module in l5/project.json', visibility: 'private', beforePromptStep };
}

/** The page test files of the module this run left ready, as l5 refs. */
async function readyPageTests(run: M12RunArgs, pageIds: readonly string[]): Promise<string[]> {
  const out: string[] = [];
  for (const pageId of pageIds) {
    if (stateReady(await readUnitStatus(run.project, run.module, 'tests', pageId))) out.push(fileRef(pageTestsFile(run.project, run.module, pageId)));
  }
  return out.sort();
}

/**
 * `backend.pageTests` is this agent's key: the monitor cases of each page backend. The publish composer does
 * not carry it into the runtime config yet (named in the report); the other backend keys are reconcileL5's.
 */
function withPageTests(text: string, moduleName: string, pageTests: readonly string[]): string {
  const config = JSON.parse(text) as Record<string, unknown>;
  const modules = Array.isArray(config.modules) ? config.modules as Array<Record<string, unknown>> : [];
  const mod = modules.find(item => item && item.moduleName === moduleName);
  if (!mod || !mod.backend || typeof mod.backend !== 'object') return text;
  const backend = mod.backend as Record<string, unknown>;
  if (pageTests.length) backend.pageTests = [...pageTests];
  else delete backend.pageTests;
  const body = JSON.stringify(config, null, 2);
  return text.endsWith('\n') ? `${body}\n` : body;
}

async function register(run: M12RunArgs): Promise<string> {
  const { ctx } = await loadRun(run);
  const { project, module: moduleName } = run;
  // Only units in place are registered; a unit that is not ready is a pending in the reconcile result.
  // `verified` needs every unit generated AND proven by a compiler; an uncompiled one keeps `structure`.
  const ready: Array<{ defPath: string; artifactType: string }> = [];
  let allReady = true;
  for (const unit of ctx.units) {
    const status = await readUnitStatus(project, moduleName, unit.layer, unit.unitId);
    if (usable(status)) ready.push({ defPath: unit.defRef, artifactType: unit.definition.artifactType });
    if (!stateReady(status) || unproven(status)) allReady = false;
  }
  // The whole module or nothing: a registration without some controller would publish pages with no route.
  const missingControllers = [];
  for (const unit of ctx.units.filter(item => item.layer === 'controllers')) {
    if (!usable(await readUnitStatus(project, moduleName, 'controllers', unit.unitId))) missingControllers.push(unit.unitId);
  }
  if (missingControllers.length) return `pending: controller(s) not generated: ${missingControllers.join(', ')}; the module was not registered.`;
  const files = await loadRegistrationFiles(project, moduleName, ready, ctx.read);
  const lock = infoOfRef(projectLockRef(project), project)!;
  if (await readOptional(lock) !== null) return `pending: ${projectLockRef(project)} is held (${clip((await readOptional(lock)) ?? '', 200)}). If no run is active, remove it and run again.`;
  await writeText(lock, `${JSON.stringify({ holder: `agentMaterializeL1:${moduleName}`, at: new Date().toISOString() })}\n`);
  try {
    const projectInfo = projectJsonFile(project);
    const projectJson = await readOptional(projectInfo);
    const runtimeInfo = infoOfRef(runtimeProjectJsonRef(project), project);
    const runtimeProjectJson = runtimeInfo ? await readOptional(runtimeInfo) : null;
    const result: L5ReconcileResult = reconcileL5Backend({
      project,
      moduleName,
      allowStructureStub: ctx.appEnv !== 'production',
      phase: allReady ? 'verified' : 'structure',
      projectJson,
      runtimeProjectJson,
      backendSignature: null,
      files,
      catalogRef: null,
    });
    const pendings = result.pendings.map(item => `${item.reason} ${item.origin}`);
    // The runtime loads the whole controllers folder: one controller importing a file that does not exist breaks
    // the boot of the backend. The copied reconcile only skips its routes; here it withholds the registration.
    const absent = result.pendings.filter(item => item.reason === 'ROUTE_DEPENDENCY_ABSENT');
    if (absent.length) {
      return `pending: a controller imports a file that was not generated (${[...new Set(absent.map(item => item.origin))].join(', ')}); the module was not registered.\n${pendings.join('\n')}`;
    }
    if (result.action === 'invalid' || result.action === 'pending' || result.nextText === null) {
      return `${result.action}: ${result.detail}${pendings.length ? `\n${pendings.join('\n')}` : ''}`;
    }
    const pageIds = ctx.units.filter(unit => unit.layer === 'controllers').map(unit => String(unit.definition.data.pageId ?? unit.unitId));
    const next = withPageTests(result.nextText, moduleName, await readyPageTests(run, pageIds));
    const target = result.effectiveSource === 'l5/runtime.project.json' && runtimeInfo ? runtimeInfo : projectInfo;
    const current = await readOptional(target);
    const expected = result.effectiveSource === 'l5/runtime.project.json' ? runtimeProjectJson : projectJson;
    if (current !== expected) return 'pending: l5 changed during the registration. The concurrent bytes were kept.';
    if (next !== current) await writeText(target, next);
    return `${next === current ? 'unchanged' : 'patch'}: ${result.detail}${pendings.length ? `\n${pendings.join('\n')}` : ''}`;
  } finally {
    await removeStorFile(lock);
  }
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const run = parseM12StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (run.kind === 'refusal') return [updateM12Status(context, parentStep, step, hookSequential, 'failed', run.diagnostic)];
  try {
    const trace = await register(run);
    const action = trace.split(':')[0];
    await writeJson(registrationFile(run.project, run.module), { action, detail: trace, updatedAt: new Date().toISOString() });
    // A pending registration is reported, not a failed step: finalize80 still writes the report.
    return [updateM12Status(context, parentStep, step, hookSequential, 'completed', clip(`registration ${trace}`, 3000))];
  } catch (error) {
    return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
  }
}
