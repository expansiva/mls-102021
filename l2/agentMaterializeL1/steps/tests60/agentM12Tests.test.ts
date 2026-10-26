/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { createAgent } from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.js';

const PROJECT = 7;
const MODULE = 'modx';
const PAGE = 'home';

interface FakeFile extends M12FileInfo {
  status: string;
  content: string;
  getContent(): Promise<string>;
  getValueInfo(): Promise<{ content: string }>;
}

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function file(folder: string, shortName: string, extension: string, content: string): { info: M12FileInfo; content: string } {
  return { info: { project: PROJECT, level: extension === '.json' && folder === '' ? 5 : 1, folder, shortName, extension }, content };
}

function install(present: Array<{ info: M12FileInfo; content: string }>): void {
  const files: Record<string, FakeFile> = {};
  const put = (info: M12FileInfo, content: string): FakeFile => {
    const stored: FakeFile = {
      ...info, status: 'changed', content,
      getContent: async () => stored.content,
      getValueInfo: async () => ({ content: stored.content }),
    };
    files[keyOf(info)] = stored;
    return stored;
  };
  for (const item of present) put(item.info, item.content);
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => files[keyOf(info)] ?? put(info, ''),
      localStor: {
        setContent: async (stored: FakeFile, value: { content?: string | null }) => { stored.content = value.content ?? ''; return true; },
      },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
}

function defSource(body: unknown): string {
  return `export const definition = ${JSON.stringify(body)} as const;\n`;
}

const envelope = {
  schemaVersion: '2026-09-24-d1-definition-v2',
  moduleName: MODULE,
  status: 'generated',
  dependencies: [] as string[],
};

void test('page tests run when the controller and request .ts exist and there is no receipt', async () => {
  const controllerFolder = `${MODULE}/layer_1_external/adapters/http/controllers`;
  const requestFolder = `${MODULE}/layer_1_external/adapters/http/requests`;
  install([
    file(controllerFolder, PAGE, '.defs.ts', defSource({
      ...envelope, artifactType: 'httpController', artifactId: PAGE,
      data: { pageId: PAGE, handlers: [{ contractPath: '', usecaseId: 'openItem' }] },
    })),
    file(controllerFolder, PAGE, '.ts', 'export {}\n'),
    file(requestFolder, PAGE, '.defs.ts', defSource({
      ...envelope, artifactType: 'requestService', artifactId: PAGE,
      data: { pageId: PAGE, requests: [{ id: 'load' }] },
    })),
    file(requestFolder, PAGE, '.ts', 'export {}\n'),
    {
      info: { project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: PAGE, extension: '.defs.ts' },
      content: `export const routes = { '${MODULE}.${PAGE}.load': { kind: 'qry', input: { id: string; }, output: { ok: boolean; }, rules: [], access: { actors: ['user'] } } };\n`,
    },
  ]);
  const agent = createAgent();
  const intents = await agent.beforePromptStep!(
    { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta,
    { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext,
    { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }),
  ) as Array<Record<string, unknown>>;
  const workers = intents.filter(item => item.type === 'add-step');
  assert.equal(workers.length, 1, JSON.stringify(intents.find(item => item.type === 'update-status')?.traceMsg));
  assert.equal((workers[0].step as { agentName?: string }).agentName, 'agentM12TestsPage');
});
