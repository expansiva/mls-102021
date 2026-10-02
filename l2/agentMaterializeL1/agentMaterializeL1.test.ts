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
import { createAgent, runEndedWell } from '/_102021_/l2/agentMaterializeL1/agentMaterializeL1.js';
import { installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** m1_41 b2: the v2 controleEstoque seed (read only). */
const SOURCE_ROOT = path.join(HERE, 'fixtures/v2ControleEstoque');
const SOURCE_MODULE = 'controleEstoque';
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
  const rel = 'layer_1_external/adapters/persistence/movimentacaoEstoque.defs.txt';
  seed(lone, { project: PROJECT, level: 1, folder: `${MODULE}/layer_1_external/adapters/persistence`, shortName: 'movimentacaoEstoque', extension: '.defs.ts' },
    readFileSync(path.join(SOURCE_ROOT, rel), 'utf8').split(SOURCE_MODULE).join(MODULE));
  const missing = await studio(`@@agentMaterializeL1 ${MODULE} /simulate`);
  assert.match(missing, /BLOCKED .*movimentacaoEstoque\.defs\.ts/);
  assert.match(missing, /MISSING_REF: Missing dependency .*layer_3_domain/);

  const host = installStudio(PROJECT);
  seedDefs(host, PROJECT);
  assert.match(await studio(`@@agentMaterializeL1 ${MODULE} /resume`), /NOTHING_TO_RESUME/);
  assert.equal(host.writes.length, 0);
});

async function intentsOf(prompt: string): Promise<mls.msg.AgentIntent[]> {
  return createAgent().beforePromptImplicit!(meta(), context(prompt), prompt);
}

function assertClosesTask(intents: mls.msg.AgentIntent[], label: string, expected: mls.msg.AIStepStatus = 'completed'): void {
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus | undefined;
  assert.ok(status, `${label}: statusTask must emit update-status so the task leaves in progress`);
  assert.equal(status.status, expected, label);
  assert.equal(status.stepId, 1, label);
  assert.equal(status.parentStepId, 1, label);
  const message = intents[0] as mls.msg.AgentIntentAddMessageAI;
  assert.equal(status.traceMsg, String(message.request.inputAI[1]?.content), label);
}

void test('m1_31: every status answer (run, refused, stopped) closes the root step; m1_45: refused and stopped close it failed', async () => {
  const host = installStudio(PROJECT);
  seedDefs(host, PROJECT);
  assertClosesTask(await intentsOf(`@@agentMaterializeL1 ${MODULE} /simulate`), 'run');
  assertClosesTask(await intentsOf('@@agentMaterializeL1 /help'), 'help');

  installStudio(PROJECT);
  const refused = await intentsOf(`@@agentMaterializeL1 ${MODULE} /naoexiste`);
  assert.equal((refused[0] as mls.msg.AgentIntentAddMessageAI).request.longTermMemory?.command, 'refused');
  assertClosesTask(refused, 'refused', 'failed');

  installStudio(PROJECT);
  Object.defineProperty(mls.stor, 'files', { get() { throw new Error('stor offline'); } });
  const stopped = await intentsOf(`@@agentMaterializeL1 ${MODULE} /simulate`);
  assert.match(String((stopped[0] as mls.msg.AgentIntentAddMessageAI).request.inputAI[1]?.content), /agentMaterializeL1 stopped: stor offline/);
  assertClosesTask(stopped, 'stopped', 'failed');
});


/** m1_45: seeds only the domain entities, the units that structure promotes with no outside context. */
function seedDomain(host: TestHost): void {
  for (const rel of walk(SOURCE_ROOT).filter(item => item.startsWith('layer_3_domain/'))) {
    const parts = rel.split('/');
    const name = parts.pop()!.replace(/\.defs\.txt$/, '');
    seed(host, { project: PROJECT, level: 1, folder: [MODULE, ...parts].join('/'), shortName: name, extension: '.defs.ts' },
      readFileSync(path.join(SOURCE_ROOT, rel), 'utf8').split(SOURCE_MODULE).join(MODULE));
  }
}

function rootStatus(intents: mls.msg.AgentIntent[]): mls.msg.AgentIntentUpdateStatus {
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus | undefined;
  assert.ok(status);
  assert.equal(status.stepId, 1);
  return status;
}

void test('m1_45: a structure run with a refused unit closes the root step failed, the unit code in the trace', async () => {
  const host = installStudio(PROJECT);
  seedDefs(host, PROJECT);
  const status = rootStatus(await intentsOf(`@@agentMaterializeL1 ${MODULE} /structure`));
  assert.match(status.traceMsg, /Stage structure\. COMPLETED\./);
  assert.equal(status.status, 'failed');
  assert.match(status.traceMsg, /^MISSING_REF _102047_\/l1\/salaEnsaio\/layer_2_application\/usecases\/createProduto\.defs\.ts$/m);
});

void test('m1_45: a run every unit promoted or reused still fails while registration refuses (pending)', async () => {
  const host = installStudio(PROJECT);
  seedDomain(host);
  seed(host, { project: PROJECT, level: 5, folder: '', shortName: 'project', extension: '.json' }, '{"modules":[]}\n');
  for (const code of ['PROMOTED', 'REUSE']) {
    const status = rootStatus(await intentsOf(`@@agentMaterializeL1 ${MODULE} /structure`));
    assert.match(status.traceMsg, new RegExp(`^${code} .*produto\\.defs\\.ts$`, 'm'));
    assert.match(status.traceMsg, /^registration: pending$/m);
    assert.equal(status.status, 'failed', code);
  }
});

void test('m1_45: an exception in the run closes the root step failed with stopped:', async () => {
  installStudio(PROJECT);
  Object.defineProperty(mls.stor, 'files', { get() { throw new Error('stor offline'); } });
  const status = rootStatus(await intentsOf(`@@agentMaterializeL1 ${MODULE} /structure`));
  assert.equal(status.status, 'failed');
  assert.match(status.traceMsg, /^agentMaterializeL1 stopped: stor offline$/);
});

type EndedInput = Parameters<typeof runEndedWell>[0];

function ended(patch: Partial<EndedInput>): EndedInput {
  return {
    stage: 'structure',
    ended: 'COMPLETED',
    units: [{ defPath: 'a.defs.ts', code: 'PROMOTED', detail: '', promoted: true, modelCalls: 0 }, { defPath: 'b.defs.ts', code: 'REUSE', detail: '', promoted: false, modelCalls: 0 }],
    catalog: { ref: 'c', action: 'written', inputHash: 'h', recipeVersion: 'r', gaps: [], detail: '', oracleSources: {} },
    registration: { action: 'patch', nextText: '{}', effectiveSource: 'l5/project.json', backend: {}, pendings: [], detail: '' },
    ...patch,
  };
}

void test('m1_45: runEndedWell is true only for COMPLETED, units in place and catalog and registration without refusal', () => {
  assert.equal(runEndedWell(ended({})), true, 'all PROMOTED/REUSE');
  assert.equal(runEndedWell(ended({ stage: 'verify', units: [{ defPath: 'a', code: 'VERIFIED', detail: '', promoted: false, modelCalls: 0 }] })), true, 'VERIFIED');
  assert.equal(runEndedWell(ended({ registration: { ...ended({}).registration!, action: 'unchanged' }, catalog: { ...ended({}).catalog!, action: 'unchanged' } })), true, 'unchanged');
  assert.equal(runEndedWell(ended({ ended: 'BUDGET_CALLS', units: [{ defPath: 'a', code: 'BUDGET_CALLS', detail: '', promoted: false, modelCalls: 0 }] })), false, 'BUDGET_CALLS');
  assert.equal(runEndedWell(ended({ ended: 'INTERRUPTED' })), false, 'INTERRUPTED');
  assert.equal(runEndedWell(ended({ units: [...ended({}).units, { defPath: 'x', code: 'BLOCKED', detail: '', promoted: false, modelCalls: 0 }] })), false, 'refused unit');
  for (const action of ['conflict', 'invalid'] as const) {
    assert.equal(runEndedWell(ended({ catalog: { ...ended({}).catalog!, action } })), false, `catalog ${action}`);
  }
  for (const action of ['pending', 'invalid'] as const) {
    assert.equal(runEndedWell(ended({ registration: { ...ended({}).registration!, action } })), false, `registration ${action}`);
  }
  assert.equal(runEndedWell(ended({ registration: { ...ended({}).registration!, pendings: [{ origin: 'o', reason: 'STUB_REFUSED' }] } })), false, 'patch with pendings');
  assert.equal(runEndedWell(ended({ stage: 'simulate', ended: 'SIMULATED' })), true, 'simulate');
  assert.equal(runEndedWell(ended({ stage: 'simulate', ended: 'NO_UNITS' })), false, 'simulate NO_UNITS');
});

function promotedAnd(code: string): EndedInput['units'] {
  return [
    { defPath: 'a.defs.ts', code: 'PROMOTED', detail: '', promoted: true, modelCalls: 0 },
    { defPath: 'b.defs.ts', code: 'PROMOTED', detail: '', promoted: true, modelCalls: 0 },
    { defPath: 'outbound.defs.ts', code, detail: 'recebimentoRegistrado', promoted: false, modelCalls: 0 },
  ];
}

void test('m1_47: MECHANISM_UNBOUND is a declared gap: the run completes and the trace line is gap:', async () => {
  const units = promotedAnd('MECHANISM_UNBOUND');
  assert.equal(runEndedWell(ended({ units })), true);
  const host = installStudio(PROJECT);
  seedDomain(host);
  const rel = 'layer_1_external/adapters/integration/outbound.defs.txt';
  seed(host, { project: PROJECT, level: 1, folder: `${MODULE}/layer_1_external/adapters/integration`, shortName: 'outbound', extension: '.defs.ts' },
    readFileSync(path.join(SOURCE_ROOT, rel), 'utf8').split(SOURCE_MODULE).join(MODULE));
  const status = rootStatus(await intentsOf(`@@agentMaterializeL1 ${MODULE} /structure`));
  assert.match(status.traceMsg, /^gap: MECHANISM_UNBOUND _102047_\/l1\/salaEnsaio\/layer_1_external\/adapters\/integration\/outbound\.defs\.ts$/m);
  assert.doesNotMatch(status.traceMsg, /^MECHANISM_UNBOUND /m);
});

void test('m1_47: NO_CONSUMER is the same declared gap', () => {
  assert.equal(runEndedWell(ended({ units: promotedAnd('NO_CONSUMER') })), true);
});

void test('m1_47: BLOCKED_BY still fails the run', () => {
  assert.equal(runEndedWell(ended({ units: promotedAnd('BLOCKED_BY') })), false);
});
