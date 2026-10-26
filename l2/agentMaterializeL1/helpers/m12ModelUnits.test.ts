/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_USECASES_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelDispatcherAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { USECASE_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';

const PROJECT = 7;
const MODULE = 'modx';

interface FakeFile extends M12FileInfo {
  status: string;
  content: string;
  getContent(): Promise<string>;
  getValueInfo(): Promise<{ content: string }>;
}

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function install(present: Array<{ info: M12FileInfo; content: string }>): void {
  const files: Record<string, FakeFile> = {};
  const put = (info: M12FileInfo, content: string, status = 'changed'): FakeFile => {
    const file: FakeFile = {
      ...info, status, content,
      getContent: async () => file.content,
      getValueInfo: async () => ({ content: file.content }),
    };
    files[keyOf(info)] = file;
    return file;
  };
  for (const item of present) put(item.info, item.content);
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => {
        const key = keyOf(info);
        if (!files[key]) put(info, '', 'new');
        return files[key];
      },
      localStor: {
        setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; },
      },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
}

function defSource(body: unknown): string {
  return `export const definition = ${JSON.stringify(body)} as const;\n`;
}

const usecaseDef: M12FileInfo = {
  project: PROJECT, level: 1, folder: `${MODULE}/layer_2_application/usecases`, shortName: 'openItem', extension: '.defs.ts',
};
const usecaseTs: M12FileInfo = { ...usecaseDef, extension: '.ts' };

function seedDefs(): void {
  install([{
    info: usecaseDef,
    content: defSource({
      schemaVersion: '2026-09-24-d1-definition-v2',
      artifactType: 'usecase',
      artifactId: 'openItem',
      moduleName: MODULE,
      status: 'generated',
      dependencies: [],
      data: { usecaseId: 'openItem', entityId: 'Item', operation: 'get', rulesApplied: [], effects: [] },
    }),
  }]);
}

async function dispatch(): Promise<Array<Record<string, unknown>>> {
  const agent = modelDispatcherAgent(M12_USECASES_AGENT_NAME, 'test', USECASE_SPEC);
  const hook = agent.beforePromptStep!;
  const step = { stepId: 2, prompt: '' } as mls.msg.AIAgentStep;
  return hook(
    { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta,
    { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext,
    { stepId: 1 } as mls.msg.AIAgentStep,
    step,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }),
  ) as Promise<Array<Record<string, unknown>>>;
}

void test('a model unit whose .ts exists is not sent to the model', async () => {
  seedDefs();
  const files = (mls.stor.files as Record<string, FakeFile>);
  files[keyOf(usecaseTs)] = {
    ...usecaseTs, status: 'changed', content: 'export const openItem = 1;\n',
    getContent: async () => 'export const openItem = 1;\n',
    getValueInfo: async () => ({ content: 'export const openItem = 1;\n' }),
  };
  const intents = await dispatch();
  assert.equal(intents.some(item => item.type === 'add-step'), false);
  const receipt = Object.values(mls.stor.files as Record<string, FakeFile>).find(item => item.extension === '.json' && item.shortName === 'openItem');
  assert.equal(JSON.parse(receipt?.content ?? '{}').status, 'reused');
});

void test('a model unit whose .ts is absent is dispatched to a worker', async () => {
  seedDefs();
  const intents = await dispatch();
  const workers = intents.filter(item => item.type === 'add-step');
  assert.equal(workers.length, 1);
  assert.equal((workers[0].step as { agentName?: string }).agentName, 'agentM12UsecaseUnit');
});
