/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/register70/agentM12Register.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { createAgent } from '/_102021_/l2/agentMaterializeL1/steps/register70/agentM12Register.js';

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

const controllerFolder = `${MODULE}/layer_1_external/adapters/http/controllers`;

function seed(withTs: boolean): void {
  const files: Array<{ info: M12FileInfo; content: string }> = [
    {
      info: { project: PROJECT, level: 1, folder: controllerFolder, shortName: PAGE, extension: '.defs.ts' },
      content: defSource({
        schemaVersion: '2026-09-24-d1-definition-v2',
        artifactType: 'httpController',
        artifactId: PAGE,
        moduleName: MODULE,
        status: 'generated',
        dependencies: [],
        data: { pageId: PAGE, handlers: [{ contractPath: '', usecaseId: 'openItem' }] },
      }),
    },
    {
      info: { project: PROJECT, level: 5, folder: '', shortName: 'project', extension: '.json' },
      content: '{"modules":[]}\n',
    },
  ];
  if (withTs) {
    files.push({
      info: { project: PROJECT, level: 1, folder: controllerFolder, shortName: PAGE, extension: '.ts' },
      content: "export const routes = [{ key: 'modx.home.load' }];\n",
    });
  }
  install(files);
}

async function trace(): Promise<string> {
  const agent = createAgent();
  const intents = await agent.beforePromptStep!(
    { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta,
    { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext,
    { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }),
  ) as Array<{ traceMsg?: string }>;
  return String(intents[0]?.traceMsg ?? '');
}

void test('a controller .ts with no receipt is registered', async () => {
  seed(true);
  const text = await trace();
  assert.match(text, /^registration patch:/, text);
  assert.equal(text.includes('controller(s) not generated'), false);
});

void test('a controller that has only its .defs.ts is not registered', async () => {
  seed(false);
  const text = await trace();
  assert.match(text, /controller\(s\) not generated: home/, text);
});
