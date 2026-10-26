/// <mls fileReference="_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { checkAfterDefs, snapshotOf } from '/_102021_/l2/agentNewReleaseL1/helpers/guard.js';
import { planNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/helpers/plan.js';
import {
  editNotes,
  generatorUnits,
  parseNewReleaseInvocation,
  reportCheckWithoutGenerator,
  reportDeleteFailed,
  reportGeneratorStart,
  reportMaterialize,
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
      return await checkAfterGenerator(agent, context, moduleName, defs, plan);
    }

    if (!plan.ok) return await close(agent, context, moduleName, phase, 'refused', plan.reason);
    await recordPhase(moduleName, phase, 'ok', plan.path);

    phase = 'sources';
    const removedWorkflows = await deleteWorkflowRemovals(project, plan.removes, workflowIds(effort, masterProject));
    if (!removedWorkflows.ok) return await close(agent, context, moduleName, phase, 'failed', removedWorkflows.message);
    for (const defPath of plan.removes) delete defs[defPath];

    if (plan.path === 'generator') {
      phase = 'portrait';
      const portrait = snapshotFile(moduleName);
      await writeJson(portrait, await snapshotOf(defs));
      await recordPhase(moduleName, phase, 'ok', 'written');
      return finish(agent, context, 'done', reportGeneratorStart(moduleName, generatorUnits(effort, masterProject), removedWorkflows.deleted));
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
    await recordPhase(moduleName, phase, 'ok', String(removed.deleted.length));
    return finish(agent, context, 'done', reportNewRelease(notes, moduleName, [...removedWorkflows.deleted, ...removed.deleted]));
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
): Promise<mls.msg.AgentIntent[]> {
  if (!plan.ok) return await close(agent, context, moduleName, 'plan', 'refused', plan.reason);
  await recordPhase(moduleName, 'plan', 'ok', plan.path);
  if (plan.path !== 'generator') return await close(agent, context, moduleName, 'guard', 'refused', reportCheckWithoutGenerator());
  const portrait = snapshotFile(moduleName);
  const portraitPath = displayPath(portrait);
  if (!fileExists(portrait)) return await close(agent, context, moduleName, 'guard', 'refused', reportMissingSnapshot(portraitPath));

  const before = await readPortrait(portrait, portraitPath);
  const after = await snapshotOf(defs);
  const guard = checkAfterDefs(before, after, plan.allowed);
  if (guard.outside.length > 0) return await close(agent, context, moduleName, 'guard', 'failed', reportOutside(guard.outside));

  const createdOrChanged = guard.changed.filter(path => Object.prototype.hasOwnProperty.call(after, path));
  const removed = await deleteGeneratedSources(mls.actualProject || 0, createdOrChanged);
  if (!removed.ok) return await close(agent, context, moduleName, 'sources', 'failed', removed.message);
  await recordPhase(moduleName, 'sources', 'ok', String(removed.deleted.length));
  await deletePortrait(portrait);
  await recordPhase(moduleName, 'guard', 'ok', 'checked');
  return finish(agent, context, 'done', reportMaterialize(moduleName, createdOrChanged, removed.deleted));
}

/** `processId` of each workflow def this master removes. */
function workflowIds(effort: ChangeEffortFile, masterProject: string): Map<string, string> {
  const ids = new Map<string, string>();
  for (const row of effort.perItem) {
    for (const answer of row.answers) {
      if (answer.master.project !== masterProject) continue;
      for (const unit of answer.remove) {
        if (unit.kind === 'workflow') ids.set(unit.path, unit.id);
      }
    }
  }
  return ids;
}

/**
 * Deletes one removed workflow: its `.defs.ts`, the `.ts` of the same name, and the two generated
 * module files when their text contains the process id. A missing file is skipped.
 */
async function deleteWorkflowRemovals(
  project: number,
  defPaths: readonly string[],
  processIds: ReadonlyMap<string, string>,
): Promise<{ ok: true; deleted: string[] } | { ok: false; message: string }> {
  const deleted: string[] = [];
  for (const defPath of defPaths) {
    const moduleName = moduleOfL1(defPath);
    const cited = moduleName
      ? [
        `l1/${moduleName}/layer_1_external/adapters/workflow/engine.ts`,
        `l1/${moduleName}/layer_1_external/adapters/persistence/moduleTick.ts`,
      ]
      : [];
    const processId = processIds.get(defPath) ?? '';
    const steps: Array<{ path: string; extension: '.ts' | '.defs.ts'; cited: boolean }> = [
      { path: defPath, extension: '.defs.ts', cited: false },
      { path: sourcePathOfDef(defPath) ?? '', extension: '.ts', cited: false },
      ...cited.map(path => ({ path, extension: '.ts' as const, cited: true })),
    ];
    for (const step of steps) {
      if (!step.path || deleted.includes(step.path)) continue;
      const info = fileInfoFromProductPath(project, step.path, step.extension);
      if (!info) continue;
      const indexed = (mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>)[mls.stor.getKeyToFile(info)];
      if (!indexed || indexed.status === 'deleted' || indexed.extension !== step.extension) continue;
      if (step.cited && (!processId || !(await readSourceText(info)).includes(processId))) continue;
      try {
        const { deleteFile } = await import('/_102027_/l2/libStor.js');
        await deleteFile(indexed);
        deleted.push(step.path);
      } catch (error) {
        return { ok: false, message: reportDeleteFailed(step.path, messageOf(error), deleted) };
      }
    }
  }
  return { ok: true, deleted };
}

function moduleOfL1(productPath: string): string {
  const parts = productPath.split('/');
  return parts[0] === 'l1' && parts[1] ? parts[1] : '';
}

/** Deletes the `.ts` next to each `.defs.ts` when that file is in the index. A missing `.ts` is skipped. A `.defs.ts` is never deleted. */
async function deleteGeneratedSources(
  project: number,
  defPaths: readonly string[],
): Promise<{ ok: true; deleted: string[] } | { ok: false; message: string }> {
  const deleted: string[] = [];
  for (const defPath of defPaths) {
    const sourcePath = sourcePathOfDef(defPath);
    if (!sourcePath) continue;
    const info = fileInfoFromProductPath(project, sourcePath, '.ts');
    if (!info) continue;
    const indexed = (mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>)[mls.stor.getKeyToFile(info)];
    if (!indexed || indexed.status === 'deleted' || indexed.extension === '.defs.ts') continue;
    try {
      const { deleteFile } = await import('/_102027_/l2/libStor.js');
      await deleteFile(indexed);
      deleted.push(sourcePath);
    } catch (error) {
      return { ok: false, message: reportDeleteFailed(sourcePath, messageOf(error), deleted) };
    }
  }
  return { ok: true, deleted };
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

async function readPortrait(file: Ns5FileInfo, path: string): Promise<Record<string, string>> {
  const parsed = await readJson<unknown>(file);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`snapshot is not a path map: ${path}`);
  const portrait: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') throw new Error(`snapshot is not a path map: ${path}`);
    portrait[key] = value;
  }
  return portrait;
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
