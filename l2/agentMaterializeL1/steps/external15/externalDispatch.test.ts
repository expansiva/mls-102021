/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/externalDispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M12_EXTERNAL_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { modelDispatcherAgent } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { M1_DEFINITION_SCHEMA, renderDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { EXTERNAL_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/external15/agentM12ExternalUnit.js';
import { ADAPTER_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/agentM12AdapterUnit.js';
import { M12_ADAPTER_AGENT_NAME } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

const PROJECT = 102099;
const MODULE = 'codeReview';
const FOLDER = `${MODULE}/layer_1_external/connections`;

interface FakeFile extends M12FileInfo { status: string; content: string; getContent(): Promise<string>; getValueInfo(): Promise<{ content: string }> }
const keyOf = (info: M12FileInfo) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

function install(files: Record<string, FakeFile>): void {
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => {
        const key = keyOf(info);
        if (!files[key]) {
          const file: FakeFile = { ...info, status: 'new', content: '', getContent: async () => file.content, getValueInfo: async () => ({ content: file.content }) };
          files[key] = file;
        }
        return files[key];
      },
      localStor: { setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; } },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
}

function put(files: Record<string, FakeFile>, project: number, folder: string, shortName: string, extension: string, content: string): void {
  const info = { project, level: 1, folder, shortName, extension };
  const file: FakeFile = { ...info, status: 'changed', content, getContent: async () => file.content, getValueInfo: async () => ({ content: file.content }) };
  files[keyOf(info)] = file;
}

function def(secret: boolean): string {
  const definition: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'externalConnection', artifactId: 'repoHost', moduleName: MODULE, status: 'pending', dependencies: [],
    data: {
      systemId: 'repoHost', title: 'Repository host', description: 'Where the code lives.',
      settings: [{ id: 'accessKey', title: 'Access key', description: 'Reads it.', secret }],
      operations: [{ operationId: 'changePushed', direction: 'serve', description: 'A change was pushed.' }],
    },
  };
  const rendered = renderDefinition(definition, `_${PROJECT}_/l1/${FOLDER}/repoHost.defs.ts`);
  assert.ok('source' in rendered);
  return rendered.source;
}

async function dispatch(secret: boolean): Promise<{ intents: Array<Record<string, unknown>>; files: Record<string, FakeFile> }> {
  const files: Record<string, FakeFile> = {};
  install(files);
  put(files, PROJECT, FOLDER, 'repoHost', '.defs.ts', def(secret));
  const agent = modelDispatcherAgent(M12_EXTERNAL_AGENT_NAME, 'test', EXTERNAL_SPEC);
  const intents = await agent.beforePromptStep!(
    { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta,
    { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext,
    { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }),
  ) as Array<Record<string, unknown>>;
  return { intents, files };
}

void test('d1_213: a system with a serve and no secret setting is not sent to the model: the unit stops blocked with its own code', async () => {
  const { intents, files } = await dispatch(false);
  assert.equal(intents.some(item => item.type === 'add-step'), false, 'no worker, so no repair');
  const receipt = Object.values(files).find(item => item.extension === '.json' && item.shortName === 'repoHost');
  const status = JSON.parse(receipt?.content ?? '{}') as { status?: string; code?: string; diagnostic?: string };
  assert.deepEqual([status.status, status.code], ['blocked', 'EXTERNAL_SERVE_WITHOUT_SECRET']);
  assert.match(status.diagnostic ?? '', /System repoHost: operation changePushed is a serve/u);
});

void test('d1_213: the same system with a secret setting is dispatched to the model', async () => {
  const { intents } = await dispatch(true);
  const workers = intents.filter(item => item.type === 'add-step');
  assert.equal(workers.length, 1);
  assert.equal((workers[0].step as { agentName?: string }).agentName, 'agentM12ExternalUnit');
});

async function dispatchAdapter(withDeclaration: boolean): Promise<{ intents: Array<Record<string, unknown>>; files: Record<string, FakeFile> }> {
  const files: Record<string, FakeFile> = {};
  install(files);
  put(files, PROJECT, FOLDER, 'repoHost', '.defs.ts', def(true));
  if (withDeclaration) put(files, PROJECT, FOLDER, 'repoHost', '.ts', 'export default {};');
  const agent = modelDispatcherAgent(M12_ADAPTER_AGENT_NAME, 'test', ADAPTER_SPEC);
  const intents = await agent.beforePromptStep!(
    { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta,
    { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext,
    { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }),
  ) as Array<Record<string, unknown>>;
  return { intents, files };
}

void test('d1_209: the adapter phase dispatches the adapter unit of a system once its declaration exists, and blocks it before', async () => {
  const ready = await dispatchAdapter(true);
  const workers = ready.intents.filter(item => item.type === 'add-step');
  assert.equal(workers.length, 1, 'the adapter unit is a unit of the adapter layer');
  assert.equal((workers[0].step as { agentName?: string }).agentName, 'agentM12AdapterUnit');
  assert.equal((workers[0].step as { planning?: { planId?: string } }).planning?.planId, `adapter17-${MODULE}-repoHostAdapter-1`);
  const early = await dispatchAdapter(false);
  assert.equal(early.intents.some(item => item.type === 'add-step'), false);
  const receipt = Object.values(early.files).find(item => item.extension === '.json' && item.shortName === 'repoHostAdapter');
  assert.equal(JSON.parse(receipt?.content ?? '{}').status, 'blocked');
});
