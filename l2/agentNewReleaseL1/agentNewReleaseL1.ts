/// <mls fileReference="_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { planNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/helpers/plan.js';
import { editNotes, parseNewReleaseInvocation, reportNewRelease } from '/_102021_/l2/agentNewReleaseL1/helpers/report.js';
import {
  displayPath,
  fileExists,
  moduleFile,
  readSourceText,
  setModuleRoot,
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
    agentDescription: 'Applies a backend change-effort rule add or remove onto L1 defs and lists the materialize commands.',
    visibility: 'public',
    beforePromptImplicit,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseNewReleaseInvocation(userPrompt || context.message.content || '');
  if (!invocation.ok) return finish(agent, context, 'completed', invocation.help);

  setModuleRoot(invocation.module, null);
  const effortFile = changeEffortOf(invocation.module);
  const effortPath = displayPath(effortFile);
  if (!fileExists(effortFile)) return finish(agent, context, 'completed', `changeEffort.json not found: ${effortPath}`);

  let effort: ChangeEffortFile;
  try {
    effort = JSON.parse(await readSourceText(effortFile)) as ChangeEffortFile;
  } catch (error) {
    return finish(agent, context, 'completed', `${effortPath}: ${messageOf(error)}`);
  }

  const project = mls.actualProject || 0;
  let defs: Record<string, string>;
  try {
    defs = await loadModuleDefs(project, invocation.module);
  } catch (error) {
    return finish(agent, context, 'failed', messageOf(error));
  }

  const masterProject = String(agent.agentProject);
  const plan = planNewReleaseL1(effort, masterProject, defs);
  if (!plan.ok) return finish(agent, context, 'completed', plan.reason);

  const notes = editNotes(effort, masterProject, plan.edits.map(edit => edit.path));
  if (plan.edits.length === 0 && plan.targets.length === 0) {
    return finish(agent, context, 'completed', reportNewRelease(notes, plan.targets));
  }

  const written: string[] = [];
  for (const edit of plan.edits) {
    try {
      await writeSourceText(fileInfoFromPath(project, edit.path), edit.source);
      written.push(edit.path);
    } catch (error) {
      const listed = written.length > 0 ? `\nAlready written:\n${written.join('\n')}` : '';
      return finish(agent, context, 'failed', `failed to write ${edit.path}: ${messageOf(error)}${listed}`);
    }
  }
  return finish(agent, context, 'completed', reportNewRelease(notes, plan.targets));
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
  const match = /^l1\/(.+)\/([^/]+)\.defs\.ts$/u.exec(defPath);
  if (!match?.[1] || !match[2]) throw new Error(`cannot write ${defPath}: path is not an l1 def`);
  return { project, level: 1, folder: match[1], shortName: match[2], extension: '.defs.ts' };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function finish(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  status: 'completed' | 'failed',
  message: string,
): mls.msg.AgentIntent[] {
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `agentNewReleaseL1 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.\n${message}` },
        { type: 'human', content: message },
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
    status,
    interaction: null,
    nextSteps: [],
    stepTitle: 'Status',
    result: message,
    planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
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
