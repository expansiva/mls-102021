/// <mls fileReference="_102021_/l2/agentDefsL1/steps/entry10/declarationsCommand.test.ts" enhancement="_blank"/>

// d1_222: `@@agentDefsL1 <module> /declarations` through the entry of the agent: the def of the declared system is written, no checkpoint and no
// step is created, and the answer names the command that generates the declaration.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { pipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

const PROJECT = 102047;
const MODULE = 'controleEstoque';

const meta: IAgentMeta = { agentName: 'agentDefsL1', agentProject: 102021, agentFolder: 'agentDefsL1', agentDescription: 'test', visibility: 'public' };

function context(content: string): mls.msg.ExecutionContext {
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content, senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [], longMemory: {} } },
  } as unknown as mls.msg.ExecutionContext;
}

function declaring(host: ReturnType<typeof installStudio>): void {
  const info = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/integration.defs.ts`)!;
  const original = host.files[fileKey(info)].content;
  const found = /(export const \w+ = )(\{[\s\S]*\})( as const[^;]*;)/u.exec(original);
  assert.ok(found);
  const root = JSON.parse(found[2]) as Record<string, unknown>;
  root.schemaVersion = '2026-11-19-ns5-integration-v4';
  root.externalSystems = [{ id: 'zipLookup', title: 'Zip lookup', description: 'Finds an address.', settings: [], operations: [{ operationId: 'findAddress', direction: 'call', description: 'One address.' }] }];
  seed(host, info, `${original.slice(0, found.index)}${found[1]}${JSON.stringify(root, null, 2)}${found[3]}${original.slice(found.index + found[0].length)}`, 'case');
}

function messageOf(intents: mls.msg.AgentIntent[]): string {
  const added = intents[0] as mls.msg.AgentIntentAddMessageAI;
  return String(added.request.inputAI[1]?.content);
}

void test('d1_222: /declarations writes the def, makes no checkpoint and no step, and names the command that generates the declaration', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'controleEstoque-39a5166', PROJECT);
  declaring(host);
  const prompt = `@@agentDefsL1 ${MODULE} /declarations`;
  const intents = await createAgent().beforePromptImplicit!(meta, context(prompt), prompt);
  assert.match(messageOf(intents), /1 system\(s\), 1 def\(s\) written/);
  assert.match(messageOf(intents), new RegExp(`@@agentMaterializeL1 \\{"target":"_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/zipLookup\\.defs\\.ts"\\}`));
  assert.equal(intents.filter(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId !== 'status').length, 0);
  assert.equal(host.files[fileKey(pipelineFile(PROJECT, MODULE))], undefined, 'no checkpoint');
  assert.ok(host.files[fileKey(fileInfoFromDisplay(PROJECT, `l1/${MODULE}/layer_1_external/connections/zipLookup.defs.ts`)!)]);
  const second = await createAgent().beforePromptImplicit!(meta, context(prompt), prompt);
  assert.match(messageOf(second), /0 def\(s\) written/);
});

void test('d1_222: /declarations of a module with no declared system says so and writes nothing', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'controleEstoque-39a5166', PROJECT);
  const before = host.writes.length;
  const prompt = `@@agentDefsL1 ${MODULE} /declarations`;
  const intents = await createAgent().beforePromptImplicit!(meta, context(prompt), prompt);
  assert.match(messageOf(intents), /declares no external system/);
  assert.equal(host.writes.length, before);
});
