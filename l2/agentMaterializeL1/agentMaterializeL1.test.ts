/// <mls fileReference="_102021_/l2/agentMaterializeL1/agentMaterializeL1.test.ts" enhancement="_blank"/>

/**
 * d1_38: the Studio entry runs on the command. No approval.json, implement or thread is read;
 * the technical checks (units, ledger, plan) still answer with their own cause.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentMaterializeL1/agentMaterializeL1.js';
import { installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT = path.join(HERE, 'register/fixtures/agendaClinica-8d8729d/l1/agendaClinica');
const SOURCE_MODULE = 'agendaClinica';
/** Renamed fixture: the bench module id never reaches the entry. */
const MODULE = 'salaEnsaio';
const PROJECT = 102047;

function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else if (name.endsWith('.defs.txt')) out.push(rel);
  }
  return out;
}

function seedDefs(host: TestHost, project: number): number {
  const files = walk(SOURCE_ROOT);
  for (const rel of files) {
    const text = readFileSync(path.join(SOURCE_ROOT, rel), 'utf8').split(SOURCE_MODULE).join(MODULE);
    const parts = rel.split('/');
    const name = parts.pop()!.replace(/\.defs\.txt$/, '');
    seed(host, { project, level: 1, folder: [MODULE, ...parts].join('/'), shortName: name, extension: '.defs.ts' }, text);
  }
  return files.length;
}

function meta(): IAgentMeta {
  return { agentName: 'agentMaterializeL1', agentProject: 102021, agentFolder: 'agentMaterializeL1', agentDescription: 'test', visibility: 'public' };
}

function context(content: string): mls.msg.ExecutionContext {
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content, senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [], longMemory: {} } },
  } as unknown as mls.msg.ExecutionContext;
}

async function studio(prompt: string): Promise<string> {
  const intents = await createAgent().beforePromptImplicit!(meta(), context(prompt), prompt);
  const message = intents[0] as mls.msg.AgentIntentAddMessageAI;
  assert.equal(message.skipRootLLM, true);
  return String(message.request.inputAI[1]?.content);
}

void test('simulate runs on the command with no approval, implement or defs checkpoint', async () => {
  const host = installStudio(PROJECT);
  assert.ok(seedDefs(host, PROJECT) > 0);
  const summary = await studio(`@@agentMaterializeL1 ${MODULE} /simulate`);
  assert.match(summary, new RegExp(`agentMaterializeL1 ${MODULE} in project ${PROJECT}\\.`));
  assert.match(summary, /Stage simulate\./);
  assert.match(summary, /Model calls: 0\. Writes: no\./);
  assert.doesNotMatch(summary, /approval|accept|implement .*consumed|NO_UNITS|refus/i);
  assert.equal(host.writes.length, 0);
});

void test('a historical approval.json or a pending implement does not change the decision', async () => {
  const clean = installStudio(PROJECT);
  seedDefs(clean, PROJECT);
  const expected = await studio(`@@agentMaterializeL1 ${MODULE} /simulate`);

  const host = installStudio(PROJECT);
  seedDefs(host, PROJECT);
  seed(host, { project: PROJECT, level: 1, folder: `${MODULE}/pipeline/agentDefsL1`, shortName: 'approval', extension: '.json' }, '{"schemaVersion":"2026-09-27-d1-approval-v1"}\n');
  const thread = `${MODULE}-20260928100000`;
  seed(host, { project: PROJECT, level: 4, folder: `${MODULE}/pool/l1`, shortName: `20260928100001_${thread}_1`, extension: '.json' },
    `${JSON.stringify({ from: 'l4', to: 'l1', thread, round: 1, mode: 'implement', subject: 's', artifacts: [], body: '' })}\n`);
  assert.equal(await studio(`@@agentMaterializeL1 ${MODULE} /simulate`), expected);
  assert.equal(host.writes.length, 0);
});

void test('technical causes still answer: no defs, defs of another project, a missing dependency, nothing to resume', async () => {
  installStudio(PROJECT);
  assert.match(await studio(`@@agentMaterializeL1 ${MODULE} /simulate`), /NO_UNITS/);

  const other = installStudio(PROJECT);
  seedDefs(other, 102046);
  assert.match(await studio(`@@agentMaterializeL1 ${MODULE} /simulate`), /NO_UNITS/);

  const lone = installStudio(PROJECT);
  const rel = 'layer_1_external/adapters/persistence/consulta.defs.txt';
  seed(lone, { project: PROJECT, level: 1, folder: `${MODULE}/layer_1_external/adapters/persistence`, shortName: 'consulta', extension: '.defs.ts' },
    readFileSync(path.join(SOURCE_ROOT, rel), 'utf8').split(SOURCE_MODULE).join(MODULE));
  const missing = await studio(`@@agentMaterializeL1 ${MODULE} /simulate`);
  assert.match(missing, /BLOCKED .*consulta\.defs\.ts/);
  assert.match(missing, /MISSING_REF: Missing dependency .*layer_3_domain/);

  const host = installStudio(PROJECT);
  seedDefs(host, PROJECT);
  assert.match(await studio(`@@agentMaterializeL1 ${MODULE} /resume`), /NOTHING_TO_RESUME/);
  assert.equal(host.writes.length, 0);
});

async function intentsOf(prompt: string): Promise<mls.msg.AgentIntent[]> {
  return createAgent().beforePromptImplicit!(meta(), context(prompt), prompt);
}

function assertClosesTask(intents: mls.msg.AgentIntent[], label: string): void {
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus | undefined;
  assert.ok(status, `${label}: statusTask must emit update-status so the task leaves in progress`);
  assert.equal(status.status, 'completed', label);
  assert.equal(status.stepId, 1, label);
  assert.equal(status.parentStepId, 1, label);
  const message = intents[0] as mls.msg.AgentIntentAddMessageAI;
  assert.equal(status.traceMsg, String(message.request.inputAI[1]?.content), label);
}

void test('m1_31: every status answer (run, refused, stopped) closes the root step with update-status completed', async () => {
  const host = installStudio(PROJECT);
  seedDefs(host, PROJECT);
  assertClosesTask(await intentsOf(`@@agentMaterializeL1 ${MODULE} /simulate`), 'run');
  assertClosesTask(await intentsOf('@@agentMaterializeL1 /help'), 'help');

  installStudio(PROJECT);
  const refused = await intentsOf(`@@agentMaterializeL1 ${MODULE} /naoexiste`);
  assert.equal((refused[0] as mls.msg.AgentIntentAddMessageAI).request.longTermMemory?.command, 'refused');
  assertClosesTask(refused, 'refused');

  installStudio(PROJECT);
  Object.defineProperty(mls.stor, 'files', { get() { throw new Error('stor offline'); } });
  const stopped = await intentsOf(`@@agentMaterializeL1 ${MODULE} /simulate`);
  assert.match(String((stopped[0] as mls.msg.AgentIntentAddMessageAI).request.inputAI[1]?.content), /agentMaterializeL1 stopped: stor offline/);
  assertClosesTask(stopped, 'stopped');
});
