/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/report.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgent } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import { parseNewReleaseInvocation, reportDeleteFailed, sourcePathOfDef } from '/_102021_/l2/agentNewReleaseL1/helpers/report.js';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';

test('invocation accepts one module or /check and refuses an unknown flag', () => {
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas'), { ok: true, module: 'tarefas', check: false });
  assert.deepEqual(parseNewReleaseInvocation('tarefas'), { ok: true, module: 'tarefas', check: false });
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas /check'), { ok: true, module: 'tarefas', check: true });
  assert.deepEqual(parseNewReleaseInvocation('tarefas /check'), { ok: true, module: 'tarefas', check: true });
  const help = 'Usage: @@agentNewReleaseL1 <module> [/check]';
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1'), { ok: false, help });
  assert.deepEqual(parseNewReleaseInvocation(''), { ok: false, help });
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas extra'), { ok: false, help });
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas /run'), { ok: false, help });
});

test('sourcePathOfDef maps a def to its sibling and reportDeleteFailed names the path', () => {
  assert.equal(sourcePathOfDef('l1/tarefas/usecases/criar.defs.ts'), 'l1/tarefas/usecases/criar.ts');
  assert.equal(sourcePathOfDef('l1/tarefas/usecases/criar.ts'), null);
  assert.equal(
    reportDeleteFailed('l1/tarefas/usecases/criar.ts', 'disk full', ['l1/tarefas/a.ts']),
    'failed to delete l1/tarefas/usecases/criar.ts: disk full\nAlready deleted:\nl1/tarefas/a.ts',
  );
});

test('a parsed call refuses with not implemented and writes nothing', async () => {
  let writes = 0;
  let deletes = 0;
  (globalThis as { mls: unknown }).mls = {
    actualProject: 102047,
    events: { fireFileAction() {} },
    stor: {
      files: {},
      getKeyToFile: () => '',
      localStor: {
        setContent: async () => {
          writes += 1;
          return true;
        },
        deleteFile: async () => {
          deletes += 1;
        },
      },
    },
  };
  const agent = createAgent();
  const meta: IAgentMeta = {
    agentName: 'agentNewReleaseL1',
    agentProject: 102021,
    agentFolder: 'agentNewReleaseL1',
    agentDescription: 'test',
    visibility: 'public',
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '@@agentNewReleaseL1 tarefas', senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [], longMemory: {} } },
  } as mls.msg.ExecutionContext;
  const intents = await agent.beforePromptImplicit!(meta, context, '@@agentNewReleaseL1 tarefas');
  const step = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.ok(step);
  assert.equal(step.step.status, 'completed');
  assert.equal(step.step.result, 'refused: not implemented');
  assert.equal(writes, 0);
  assert.equal(deletes, 0);

  const help = await agent.beforePromptImplicit!(meta, context, '@@agentNewReleaseL1 tarefas /run');
  const helpStep = help.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(helpStep?.step.result, 'refused: Usage: @@agentNewReleaseL1 <module> [/check]');
  assert.equal(writes, 0);
  assert.equal(deletes, 0);
});
