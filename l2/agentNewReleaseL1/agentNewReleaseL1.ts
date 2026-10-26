/// <mls fileReference="_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  checkAfterDefs,
  generatorGateReasons,
  parsePortrait,
  PORTRAIT_LEGACY,
  snapshotOf,
  type ReleasePortraitFile,
} from '/_102021_/l2/agentNewReleaseL1/helpers/guard.js';
import { planNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/helpers/plan.js';
import {
  checkUnitLines,
  editNotes,
  formatModelCalls,
  mechanicalUnitLines,
  parseNewReleaseInvocation,
  reportCheck,
  reportCheckWithoutGenerator,
  reportDeleteFailed,
  reportGeneratorStart,
  reportMissingSnapshot,
  reportNewRelease,
  reportOutside,
  recordPhase,
  releaseStatusText,
  releaseStepTitle,
  sourcePathOfDef,
  type ReleaseRunPhase,
  type ReleaseStatusKind,
} from '/_102021_/l2/agentNewReleaseL1/helpers/report.js';
import {
  displayPath,
  fileExists,
  moduleFile,
  readJson,
  readSourceText,
  setModuleRoot,
  writeJson,
  writeSourceText,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import type { ChangeEffortFile } from '/_102035_/l2/solution/poolPlan.js';

const AGENT_NAME = 'agentNewReleaseL1';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentNewReleaseL1',
    agentDescription: 'Applies a backend change effort onto L1 defs, or asks the defs generator to add a route and a usecase and then checks the portrait.',
    visibility: 'public',
    beforePromptImplicit,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  let phase: ReleaseRunPhase = 'effort';
  try {
    const invocation = parseNewReleaseInvocation(userPrompt || context.message.content || '');
    if (!invocation.ok) return finish(agent, context, 'refused', invocation.help);

    moduleName = invocation.module;
    setModuleRoot(moduleName, null);
    phase = 'effort';
    const effortFile = changeEffortOf(moduleName);
    const effortPath = displayPath(effortFile);
    if (!fileExists(effortFile)) {
      return await close(agent, context, moduleName, phase, 'refused', `changeEffort.json not found: ${effortPath}`);
    }

    let effort: ChangeEffortFile;
    try {
      effort = JSON.parse(await readSourceText(effortFile)) as ChangeEffortFile;
    } catch (error) {
      return await close(agent, context, moduleName, phase, 'failed', `${effortPath}: ${messageOf(error)}`);
    }
    await recordPhase(moduleName, phase, 'ok', 'read');

    const project = mls.actualProject || 0;
    phase = 'plan';
    const defs = await loadModuleDefs(project, moduleName);
    const masterProject = String(agent.agentProject);
    const plan = planNewReleaseL1(effort, masterProject, defs);
    if (invocation.check) {
      phase = 'guard';
      return await checkAfterGenerator(agent, context, moduleName, defs, plan, effort, masterProject);
    }

    if (!plan.ok) return await close(agent, context, moduleName, phase, 'refused', plan.reason);
    await recordPhase(moduleName, phase, 'ok', plan.path);

    phase = 'sources';
    const generator = plan.units.length > 0;
    // With `/units`, only the removed workflow def goes now. Its `.ts` and the module engine wait for `/check`.
    const removedWorkflows = generator
      ? await deleteDefOnly(project, plan.removes)
      : await deleteWorkflowRemovals(project, plan.removes);
    if (!removedWorkflows.ok) return await close(agent, context, moduleName, phase, 'failed', removedWorkflows.message);
    const removedRuntime = !generator && plan.removes.length > 0
      ? await deleteExactTs(project, flowRuntimePaths(moduleName), removedWorkflows.deleted)
      : { ok: true as const, deleted: [] as string[] };
    if (!removedRuntime.ok) return await close(agent, context, moduleName, phase, 'failed', removedRuntime.message);
    const removedFirst = [...removedWorkflows.deleted, ...removedRuntime.deleted];
    for (const defPath of plan.removes) delete defs[defPath];

    if (generator) {
      phase = 'defs';
      const written = await writeEdits(project, plan.edits);
      if (!written.ok) return await close(agent, context, moduleName, phase, 'failed', written.message);
      await recordPhase(moduleName, phase, 'ok', String(written.paths.length));
      for (const edit of plan.edits) defs[edit.path] = edit.source;

      if (removedFirst.length > 0) await recordPhase(moduleName, 'sources', 'ok', removedFirst.join('\n'));

      phase = 'portrait';
      const portrait = snapshotFile(moduleName);
      await writeJson(portrait, await portraitFile(moduleName, defs, plan.allowed));
      await recordPhase(moduleName, phase, 'ok', 'written');
      const touched = mechanicalUnitLines(effort, masterProject, plan.edits.map(edit => edit.path));
      const started = reportGeneratorStart(moduleName, plan.units, removedFirst);
      const message = touched.length > 0 ? `${touched.join('\n')}\n${started}` : started;
      return finish(agent, context, 'done', message);
    }

    const notes = editNotes(effort, masterProject, plan.edits.map(edit => edit.path));
    if (plan.edits.length === 0 && plan.targets.length === 0 && plan.removes.length === 0) {
      return finish(agent, context, 'done', 'nothing to apply');
    }

    phase = 'defs';
    const written: string[] = [];
    for (const edit of plan.edits) {
      try {
        await writeSourceText(fileInfoFromPath(project, edit.path), edit.source);
        written.push(edit.path);
      } catch (error) {
        const listed = written.length > 0 ? `\nAlready written:\n${written.join('\n')}` : '';
        return await close(agent, context, moduleName, phase, 'failed', `failed to write ${edit.path}: ${messageOf(error)}${listed}`);
      }
    }
    await recordPhase(moduleName, phase, 'ok', String(written.length));

    phase = 'sources';
    const removed = await deleteGeneratedSources(project, plan.targets);
    if (!removed.ok) return await close(agent, context, moduleName, phase, 'failed', removed.message);
    const removedFlow = plan.flow && plan.removes.length === 0
      ? await deleteExactTs(project, flowRuntimePaths(moduleName), [...removedFirst, ...removed.deleted])
      : { ok: true as const, deleted: [] as string[] };
    if (!removedFlow.ok) return await close(agent, context, moduleName, phase, 'failed', removedFlow.message);
    const deletedSources = [...removedFirst, ...removed.deleted, ...removedFlow.deleted];
    await recordPhase(moduleName, phase, 'ok', deletedSources.join('\n'));
    const touched = mechanicalUnitLines(effort, masterProject, plan.edits.map(edit => edit.path));
    return finish(agent, context, 'done', `${reportNewRelease(notes, moduleName, deletedSources)}\n${touched.join('\n')}${touched.length > 0 ? '\n' : ''}outside effort: 0`);
  } catch (error) {
    const message = messageOf(error);
    let note = message;
    if (moduleName) {
      try {
        await recordPhase(moduleName, phase, 'failed', message);
      } catch (writeError) {
        note = `${message}; run log: ${messageOf(writeError)}`;
      }
    }
    return finish(agent, context, 'failed', note);
  }
}

async function checkAfterGenerator(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  moduleName: string,
  defs: Record<string, string>,
  plan: ReturnType<typeof planNewReleaseL1>,
  effort: ChangeEffortFile,
  masterProject: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!plan.ok) return await close(agent, context, moduleName, 'plan', 'refused', plan.reason);
  await recordPhase(moduleName, 'plan', 'ok', plan.path);
  const portrait = snapshotFile(moduleName);
  const portraitPath = displayPath(portrait);
  // The units the generator rebuilt no longer need the generator, so a pending run is the portrait, not the plan.
  if (plan.path !== 'generator' && !fileExists(portrait)) return await close(agent, context, moduleName, 'guard', 'refused', reportCheckWithoutGenerator());
  if (!fileExists(portrait)) return await close(agent, context, moduleName, 'guard', 'refused', reportMissingSnapshot(portraitPath));

  const read = await readPortrait(portrait, portraitPath);
  if (!read.ok) return await close(agent, context, moduleName, 'guard', 'refused', PORTRAIT_LEGACY);
  const gate = generatorGateReasons({
    pipeline: await readOptionalJson(defsStateFile(moduleName, 'pipeline')),
    input20: await readOptionalJson(defsStateFile(moduleName, 'input20')),
    pipelineUpdatedAt: read.portrait.generator.pipelineUpdatedAt,
  });
  if (gate.length > 0) return await close(agent, context, moduleName, 'guard', 'refused', gate.join('\n'));

  const before = read.portrait.defs;
  const after = await snapshotOf(defs);
  const guard = checkAfterDefs(before, after, read.portrait.generator.allowed);
  if (guard.outside.length > 0) return await close(agent, context, moduleName, 'guard', 'failed', reportOutside(guard.outside));

  const changedByGenerator = guard.changed.filter(path => Object.prototype.hasOwnProperty.call(after, path));
  // The union: what the generator changed or created, and the effort units to regenerate or materialize
  // (a def the generator leaves as it was still needs its .ts redone).
  const createdOrChanged = [...new Set([...changedByGenerator, ...plan.targets])];
  const project = mls.actualProject || 0;
  // Edited units, materialize targets, and a removed workflow: their `.ts` is deleted only after the guard accepts.
  const removed = await deleteGeneratedSources(project, [...new Set([...createdOrChanged, ...plan.removes])]);
  if (!removed.ok) return await close(agent, context, moduleName, 'sources', 'failed', removed.message);
  const removedFlow = plan.flow
    ? await deleteExactTs(project, flowRuntimePaths(moduleName), removed.deleted)
    : { ok: true as const, deleted: [] as string[] };
  if (!removedFlow.ok) return await close(agent, context, moduleName, 'sources', 'failed', removedFlow.message);
  const deletedSources = [...removed.deleted, ...removedFlow.deleted];
  await recordPhase(moduleName, 'sources', 'ok', deletedSources.join('\n'));
  await deletePortrait(portrait);
  await recordPhase(moduleName, 'guard', 'ok', 'checked');
  const units = checkUnitLines(effort, masterProject, createdOrChanged, changedByGenerator, defs);
  const modelCalls = formatModelCalls(await readOptionalJson(defsStateFile(moduleName, 'report')));
  return finish(agent, context, 'done', reportCheck(moduleName, createdOrChanged, deletedSources, { units, modelCalls }));
}

async function writeEdits(
  project: number,
  edits: readonly { path: string; source: string }[],
): Promise<{ ok: true; paths: string[] } | { ok: false; message: string }> {
  const paths: string[] = [];
  for (const edit of edits) {
    try {
      await writeSourceText(fileInfoFromPath(project, edit.path), edit.source);
      paths.push(edit.path);
    } catch (error) {
      const listed = paths.length > 0 ? `\nAlready written:\n${paths.join('\n')}` : '';
      return { ok: false, message: `failed to write ${edit.path}: ${messageOf(error)}${listed}` };
    }
  }
  return { ok: true, paths };
}

/** Module engine and clock. Deleted whenever this release touches a workflow. */
function flowRuntimePaths(moduleName: string): string[] {
  return [
    `l1/${moduleName}/layer_1_external/adapters/workflow/engine.ts`,
    `l1/${moduleName}/layer_1_external/adapters/persistence/moduleTick.ts`,
  ];
}

/** Deletes a removed workflow's `.defs.ts` and leaves the sibling `.ts` for `/check`. A missing file is skipped. */
async function deleteDefOnly(
  project: number,
  defPaths: readonly string[],
): Promise<{ ok: true; deleted: string[] } | { ok: false; message: string }> {
  return deleteIndexed(project, defPaths.map(path => ({ path, extension: '.defs.ts' as const })), []);
}

/**
 * Deletes one removed workflow: its `.defs.ts` and the `.ts` of the same name.
 * The module engine and clock are deleted by the caller. A missing file is skipped.
 */
async function deleteWorkflowRemovals(
  project: number,
  defPaths: readonly string[],
): Promise<{ ok: true; deleted: string[] } | { ok: false; message: string }> {
  const paths: Array<{ path: string; extension: '.ts' | '.defs.ts' }> = [];
  for (const defPath of defPaths) {
    paths.push({ path: defPath, extension: '.defs.ts' });
    const sourcePath = sourcePathOfDef(defPath);
    if (sourcePath) paths.push({ path: sourcePath, extension: '.ts' });
  }
  return deleteIndexed(project, paths, []);
}

/** Deletes the `.ts` next to each `.defs.ts` when that file is in the index. A missing `.ts` is skipped. A `.defs.ts` is never deleted. */
async function deleteGeneratedSources(
  project: number,
  defPaths: readonly string[],
): Promise<{ ok: true; deleted: string[] } | { ok: false; message: string }> {
  const paths: Array<{ path: string; extension: '.ts' }> = [];
  for (const defPath of defPaths) {
    const sourcePath = sourcePathOfDef(defPath);
    if (sourcePath) paths.push({ path: sourcePath, extension: '.ts' });
  }
  return deleteIndexed(project, paths, []);
}

/** Deletes the named `.ts` files that exist. A missing file is skipped. */
async function deleteExactTs(
  project: number,
  paths: readonly string[],
  already: readonly string[],
): Promise<{ ok: true; deleted: string[] } | { ok: false; message: string }> {
  return deleteIndexed(project, paths.map(path => ({ path, extension: '.ts' as const })), already);
}

async function deleteIndexed(
  project: number,
  steps: readonly { path: string; extension: '.ts' | '.defs.ts' }[],
  already: readonly string[],
): Promise<{ ok: true; deleted: string[] } | { ok: false; message: string }> {
  const deleted: string[] = [];
  for (const step of steps) {
    if (!step.path || deleted.includes(step.path) || already.includes(step.path)) continue;
    const info = fileInfoFromProductPath(project, step.path, step.extension);
    if (!info) continue;
    const indexed = (mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>)[mls.stor.getKeyToFile(info)];
    if (!indexed || indexed.status === 'deleted' || indexed.extension !== step.extension) continue;
    try {
      const { deleteFile } = await import('/_102027_/l2/libStor.js');
      await deleteFile(indexed);
      deleted.push(step.path);
    } catch (error) {
      return { ok: false, message: reportDeleteFailed(step.path, messageOf(error), [...already, ...deleted]) };
    }
  }
  return { ok: true, deleted };
}

/** `l1/<module>/pipeline/agentDefsL1/<shortName>.json`. */
function defsStateFile(moduleName: string, shortName: 'pipeline' | 'input20' | 'report'): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 1,
    folder: `${moduleName}/pipeline/agentDefsL1`,
    shortName,
    extension: '.json',
  };
}

async function readOptionalJson(file: Ns5FileInfo): Promise<unknown> {
  if (!fileExists(file)) return null;
  return readJson<unknown>(file);
}

async function portraitFile(moduleName: string, defs: Record<string, string>, allowed: readonly string[]): Promise<ReleasePortraitFile> {
  const pipeline = await readOptionalJson(defsStateFile(moduleName, 'pipeline'));
  const updatedAt = pipeline && typeof pipeline === 'object' && !Array.isArray(pipeline)
    ? (pipeline as { updatedAt?: unknown }).updatedAt
    : '';
  return {
    defs: await snapshotOf(defs),
    generator: { pipelineUpdatedAt: typeof updatedAt === 'string' ? updatedAt : '', allowed: [...allowed] },
  };
}

/** `l1/<module>/pipeline/agentNewReleaseL1/snapshot.json`. */
function snapshotFile(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 1,
    folder: `${moduleName}/pipeline/agentNewReleaseL1`,
    shortName: 'snapshot',
    extension: '.json',
  };
}

async function readPortrait(file: Ns5FileInfo, path: string): Promise<ReturnType<typeof parsePortrait>> {
  try {
    return parsePortrait(await readJson<unknown>(file));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${detail}: ${path}`);
  }
}

async function deletePortrait(file: Ns5FileInfo): Promise<void> {
  const indexed = (mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>)[mls.stor.getKeyToFile(file)];
  if (!indexed || indexed.status === 'deleted') return;
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  await deleteFile(indexed);
}

/** `l4/<module>/pool/l4/changeEffort.json`, same folder rule as `moduleFile`. */
function changeEffortOf(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: base.level,
    folder: `${base.folder}/pool/l4`,
    shortName: 'changeEffort',
    extension: '.json',
  };
}

type StorFile = {
  project?: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent?: () => Promise<unknown>;
};

async function loadModuleDefs(project: number, moduleName: string): Promise<Record<string, string>> {
  const defs: Record<string, string> = {};
  const files = (mls.stor?.files ?? {}) as Record<string, StorFile | undefined>;
  for (const file of Object.values(files)) {
    if (!file) continue;
    const defPath = productPath(file, project, moduleName);
    if (!defPath) continue;
    defs[defPath] = await readDef(file, defPath);
  }
  return defs;
}

function productPath(file: StorFile, project: number, moduleName: string): string | null {
  if (Number(file.project) !== project || Number(file.level) !== 1) return null;
  if (file.status === 'deleted' || file.extension !== '.defs.ts' || !file.shortName) return null;
  const folder = String(file.folder || '');
  const prefix = `${moduleName}/`;
  if (folder !== moduleName && !folder.startsWith(prefix)) return null;
  if (folder.split('/').some(part => part === 'pipeline' || part === 'materialization')) return null;
  return `l1/${folder}/${file.shortName}.defs.ts`;
}

async function readDef(file: StorFile, defPath: string): Promise<string> {
  if (file.getValueInfo) {
    try {
      const local = await file.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch (error) {
      if (!file.getContent) throw new Error(`${defPath}: ${messageOf(error)}`);
    }
  }
  if (!file.getContent) throw new Error(`${defPath}: content unavailable`);
  const content = await file.getContent();
  if (typeof content !== 'string') throw new Error(`${defPath}: content is not text`);
  return content;
}

function fileInfoFromPath(project: number, defPath: string): Ns5FileInfo {
  const info = fileInfoFromProductPath(project, defPath, '.defs.ts');
  if (!info) throw new Error(`cannot write ${defPath}: path is not an l1 def`);
  return info;
}

function fileInfoFromProductPath(project: number, productPath: string, extension: '.ts' | '.defs.ts'): Ns5FileInfo | null {
  if (!productPath.endsWith(extension)) return null;
  const stem = productPath.slice('l1/'.length, -extension.length);
  const slash = stem.lastIndexOf('/');
  if (!productPath.startsWith('l1/') || slash <= 0) return null;
  return { project, level: 1, folder: stem.slice(0, slash), shortName: stem.slice(slash + 1), extension };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function close(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  moduleName: string,
  phase: ReleaseRunPhase,
  kind: 'refused' | 'failed',
  message: string,
): Promise<mls.msg.AgentIntent[]> {
  let text = message;
  try {
    await recordPhase(moduleName, phase, kind, message);
  } catch (error) {
    // The run log is a record: its failure is named next to the reason, never in place of it.
    text = `${message}; run log: ${messageOf(error)}`;
  }
  return finish(agent, context, kind, text);
}

function finish(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  kind: ReleaseStatusKind,
  message: string,
): mls.msg.AgentIntent[] {
  const text = releaseStatusText(message, kind);
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `agentNewReleaseL1 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.\n${text}` },
        { type: 'human', content: text },
      ],
      taskTitle: 'new release L1',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'newReleaseL1', flowName: AGENT_NAME, statusOnly: 'true' },
    },
  };
  const result: mls.msg.AIPayload = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: releaseStepTitle(text),
    result: text,
    planning: { planId: 'status', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  const step: mls.msg.AgentIntentAddStep = {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step: result,
  };
  return [addMessage, step];
}
