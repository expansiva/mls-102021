/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Approval.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readPoolTraceAt, tracePoolAt } from '/_102035_/l2/solution/pool.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { pipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import {
  approvalFile,
  consumeApproval,
  loadApproval,
  readApprovalRecord,
  writeApproval,
} from '/_102021_/l2/agentDefsL1/helpers/d1ApprovalIo.js';
import { fileKey, installStudio, seed, seedAcceptedPlan, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { checkM1Approval } from '/_102021_/l2/agentMaterializeL1/run/approval.js';

// Renamed ids: nothing here comes from a bench module.
const PROJECT = 104001;
const MODULE = 'oficinaBicicletas';

function snapshot(host: TestHost): string {
  return JSON.stringify(Object.values(host.files).map(file => [fileKey(file), file.status, file.content, file.updatedAt]).sort());
}

function seedImplement(host: TestHost, short: string, body: Record<string, unknown>, box = 'l1'): void {
  seed(host, { project: PROJECT, level: 4, folder: `${MODULE}/pool/${box}`, shortName: short, extension: '.json' }, `${JSON.stringify({
    from: 'l4', to: box, round: 1, mode: 'implement', subject: 'effort accepted', artifacts: [], body: '', ...body,
  })}\n`);
}

function ioOf(host: TestHost): { read(ref: string): Promise<string | null> } {
  return {
    async read(ref: string) {
      const file = Object.values(host.files).find(item => `l${item.level}/${item.folder}/${item.shortName}${item.extension}` === ref && item.status !== 'deleted');
      return file ? file.content : null;
    },
  };
}

function seedCompleteDefs(host: TestHost): void {
  seed(host, pipelineFile(PROJECT, MODULE), `${JSON.stringify({
    schemaVersion: '2026-09-21-d1-pipeline-v1',
    flowId: 'agentDefsL1',
    flowVersion: '2026-09-21-d1-flow-v1',
    project: PROJECT,
    moduleName: MODULE,
    status: 'complete',
    command: 'run',
    steps: {
      entry10: { status: 'approved', updatedAt: 'seed', artifactPaths: [`_${PROJECT}_/l1/${MODULE}/pipeline/agentDefsL1/pipeline.json`] },
      finalize80: { status: 'approved', updatedAt: 'seed', artifactPaths: [`_${PROJECT}_/l1/${MODULE}/pipeline/agentDefsL1/report.json`] },
    },
    updatedAt: 'seed',
  }, null, 2)}\n`);
}

/** Entry accepted and D1 finished: approval recorded, implement traced and deleted. */
async function consumed(host: TestHost): Promise<ReturnType<typeof seedAcceptedPlan>> {
  const plan = seedAcceptedPlan(host, PROJECT, MODULE);
  const decision = await loadApproval(PROJECT, MODULE, 'run');
  assert.equal(decision.kind, 'record');
  if (decision.kind === 'record') await writeApproval(decision.record);
  assert.equal(await consumeApproval(PROJECT, MODULE, new Date('2026-09-27T12:00:00Z')), plan.messageFile);
  seedCompleteDefs(host);
  return plan;
}

function meta(): IAgentMeta {
  return { agentName: 'agentDefsL1', agentProject: 102021, agentFolder: 'agentDefsL1', agentDescription: 'test', visibility: 'public' };
}

void test('without an implement the agent refuses and the tree is unchanged', async () => {
  const host = installStudio(PROJECT);
  seedAcceptedPlan(host, PROJECT, MODULE, { withMessage: false });
  const before = snapshot(host);
  const prompt = `@@agentDefsL1 ${MODULE} /run`;
  const intents = await createAgent().beforePromptImplicit!(meta(), {
    message: { orderAt: 'm', threadId: 't', content: prompt, senderId: 'u' },
    task: { PK: 'k', iaCompressed: { nextSteps: [], longMemory: {} } },
  } as unknown as mls.msg.ExecutionContext, prompt);
  const text = String((intents[0] as mls.msg.AgentIntentAddMessageAI).request.inputAI[1]?.content);
  assert.match(text, /no implement message/);
  assert.equal(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'entry10'), false);
  assert.equal(host.writes.length, 0);
  assert.equal(snapshot(host), before);
});

void test('an estimate, two implements, a historical implement or a replaced plan are refused without writing', async () => {
  const cases: Array<[string, (host: TestHost) => void, RegExp]> = [
    ['estimate in pool/l1', host => {
      seedAcceptedPlan(host, PROJECT, MODULE);
      seedImplement(host, `20260927110000_${MODULE}-20260927100000_2`, { from: 'l2', thread: `${MODULE}-20260927100000`, round: 2, mode: 'estimate' });
    }, /estimate message/],
    ['two implements', host => {
      const plan = seedAcceptedPlan(host, PROJECT, MODULE);
      seedImplement(host, `20260927110000_${plan.thread}_1`, { thread: plan.thread });
    }, /2 implement messages/],
    ['historical implement (planned before the estimate loop)', host => {
      seedAcceptedPlan(host, PROJECT, MODULE, { plannerMode: 'implement' });
    }, /no estimate planning trace/],
    ['plan replaced by a new L4 round', host => {
      seedAcceptedPlan(host, PROJECT, MODULE, { withMessage: false });
      seedImplement(host, `20260926100000_${MODULE}-20260926090000_1`, {
        thread: `${MODULE}-20260926090000`,
        artifacts: ['pool/l2/web/menu.json', 'pool/l1/web/needs.json', 'pool/l2/web/backend.json', 'pool/l2/web/effort.json'],
      });
    }, /plan was replaced/],
    ['implement without the accepted backend', host => {
      const plan = seedAcceptedPlan(host, PROJECT, MODULE, { withMessage: false });
      seedImplement(host, `20260927110000_${plan.thread}_1`, { thread: plan.thread, artifacts: ['pool/l1/web/needs.json'] });
    }, /does not name the accepted/],
    ['unreadable message', host => {
      const plan = seedAcceptedPlan(host, PROJECT, MODULE, { withMessage: false });
      seed(host, { project: PROJECT, level: 4, folder: `${MODULE}/pool/l1`, shortName: `20260927110000_${plan.thread}_1`, extension: '.json' }, '{"from":"l4"}');
    }, /not readable/],
    ['agentDefsL2 has not consumed its implement', host => {
      const plan = seedAcceptedPlan(host, PROJECT, MODULE);
      seedImplement(host, `20260927100059_${plan.thread}_1`, { thread: plan.thread }, 'l2');
    }, /agentDefsL2 has not consumed/],
  ];
  for (const [name, arrange, expected] of cases) {
    const host = installStudio(PROJECT);
    arrange(host);
    const before = snapshot(host);
    const decision = await loadApproval(PROJECT, MODULE, 'run');
    assert.equal(decision.kind, 'refusal', name);
    if (decision.kind === 'refusal') {
      assert.match(decision.refusal, expected, name);
      assert.match(decision.refusal, /Nothing was written/, name);
    }
    assert.equal(snapshot(host), before, name);
  }
});

void test('accepted implement: approval recorded, then traced, then deleted; resume keeps it', async () => {
  const host = installStudio(PROJECT);
  const plan = seedAcceptedPlan(host, PROJECT, MODULE);
  const decision = await loadApproval(PROJECT, MODULE, 'run');
  assert.equal(decision.kind, 'record');
  if (decision.kind !== 'record') return;
  assert.equal(decision.record.message.file, plan.messageFile);
  assert.equal(decision.record.message.thread, plan.thread);
  assert.deepEqual(decision.record.inputs.map(input => input.path), [
    `l4/${MODULE}/pool/l1/web/needs.json`,
    `l4/${MODULE}/pool/l2/web/backend.json`,
    `l4/${MODULE}/pool/l2/web/effort.json`,
    `l4/${MODULE}/pool/l2/web/menu.json`,
  ]);
  await writeApproval(decision.record);

  // Resume before the delete: same approval, nothing new to write.
  const again = await loadApproval(PROJECT, MODULE, 'resume');
  assert.equal(again.kind, 'keep');

  const deleted = await consumeApproval(PROJECT, MODULE, new Date('2026-09-27T12:00:00Z'));
  assert.equal(deleted, plan.messageFile);
  assert.equal(plan.message.status, 'deleted');
  const record = await readApprovalRecord(PROJECT, MODULE);
  assert.deepEqual(record?.pool.map(line => [line.file, line.mode, line.outcome]), [[plan.messageFile, 'implement', 'processed']]);
  // The line D1 writes is a valid pool trace line for the pool lib.
  assert.deepEqual((await readPoolTraceAt(approvalFile(PROJECT, MODULE))).map(line => line.file), [plan.messageFile]);
  assert.equal(plan.planner.updatedAt, `planner-${PROJECT}`);

  // Resume after the delete reads the recorded approval; a new /run needs a new acceptance.
  assert.equal((await loadApproval(PROJECT, MODULE, 'resume')).kind, 'keep');
  const rerun = await loadApproval(PROJECT, MODULE, 'run');
  assert.equal(rerun.kind, 'refusal');
  assert.equal(await consumeApproval(PROJECT, MODULE, new Date()), '');
});

void test('a crash between trace and delete is finished by the next pass without a second trace', async () => {
  const host = installStudio(PROJECT);
  const plan = seedAcceptedPlan(host, PROJECT, MODULE);
  const decision = await loadApproval(PROJECT, MODULE, 'run');
  if (decision.kind !== 'record') throw new Error(decision.kind);
  await writeApproval(decision.record);
  await tracePoolAt(approvalFile(PROJECT, MODULE), {
    at: '2026-09-27T12:00:00Z', file: plan.messageFile, from: 'l4', to: 'l1', thread: plan.thread, round: 1, mode: 'implement', outcome: 'processed',
  });
  assert.equal(plan.message.status, 'changed');
  assert.equal((await loadApproval(PROJECT, MODULE, 'resume')).kind, 'keep');
  assert.equal(await consumeApproval(PROJECT, MODULE, new Date()), plan.messageFile);
  assert.equal(plan.message.status, 'deleted');
  assert.equal((await readApprovalRecord(PROJECT, MODULE))?.pool.length, 1);
});

void test('an implement withdrawn before being consumed does not authorize a resume', async () => {
  const host = installStudio(PROJECT);
  const plan = seedAcceptedPlan(host, PROJECT, MODULE);
  const decision = await loadApproval(PROJECT, MODULE, 'run');
  if (decision.kind !== 'record') throw new Error(decision.kind);
  await writeApproval(decision.record);
  plan.message.status = 'deleted';
  const resume = await loadApproval(PROJECT, MODULE, 'resume');
  assert.equal(resume.kind, 'refusal');
  if (resume.kind === 'refusal') assert.match(resume.refusal, /withdrawn/);
});

void test('changed accepted inputs refuse the resume and the materialization', async () => {
  const host = installStudio(PROJECT);
  await consumed(host);
  assert.deepEqual(await checkM1Approval(ioOf(host), PROJECT, MODULE), { ok: true, thread: `${MODULE}-20260927100000` });

  const backend = host.files[fileKey({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l2/web`, shortName: 'backend', extension: '.json' })];
  backend.content = '{"changed":true}\n';
  const resume = await loadApproval(PROJECT, MODULE, 'resume');
  assert.equal(resume.kind, 'refusal');
  if (resume.kind === 'refusal') assert.match(resume.refusal, /backend\.json changed since the approval/);
  const m1 = await checkM1Approval(ioOf(host), PROJECT, MODULE);
  assert.equal(m1.ok, false);
  if (!m1.ok) assert.match(m1.refusal, /backend\.json changed since the approval/);
});

void test('materialization refuses before consumption, without defs, and after a new plan', async () => {
  const noRecord = installStudio(PROJECT);
  seedAcceptedPlan(noRecord, PROJECT, MODULE);
  seedCompleteDefs(noRecord);
  const refused = await checkM1Approval(ioOf(noRecord), PROJECT, MODULE);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.refusal, /No recorded approval/);

  const pending = installStudio(PROJECT);
  seedAcceptedPlan(pending, PROJECT, MODULE);
  const decision = await loadApproval(PROJECT, MODULE, 'run');
  if (decision.kind !== 'record') throw new Error(decision.kind);
  await writeApproval(decision.record);
  seedCompleteDefs(pending);
  const notConsumed = await checkM1Approval(ioOf(pending), PROJECT, MODULE);
  assert.equal(notConsumed.ok, false);
  if (!notConsumed.ok) assert.match(notConsumed.refusal, /was not consumed/);

  const noDefs = installStudio(PROJECT);
  await consumed(noDefs);
  noDefs.files[fileKey(pipelineFile(PROJECT, MODULE))].status = 'deleted';
  const incomplete = await checkM1Approval(ioOf(noDefs), PROJECT, MODULE);
  assert.equal(incomplete.ok, false);
  if (!incomplete.ok) assert.match(incomplete.refusal, /has not completed/);

  const replaced = installStudio(PROJECT);
  await consumed(replaced);
  seedAcceptedPlan(replaced, PROJECT, MODULE, { stamp: '20260928090000', withMessage: false });
  const newPlan = await checkM1Approval(ioOf(replaced), PROJECT, MODULE);
  assert.equal(newPlan.ok, false);
  if (!newPlan.ok) assert.match(newPlan.refusal, /new plan needs a new acceptance/);
  const resume = await loadApproval(PROJECT, MODULE, 'resume');
  assert.equal(resume.kind, 'refusal');
});

void test('a new accepted plan replaces the approval and keeps the earlier trace', async () => {
  const host = installStudio(PROJECT);
  const first = await consumed(host);
  const second = seedAcceptedPlan(host, PROJECT, MODULE, { stamp: '20260928090000', plan: { 'pool/l2/web/backend.json': '{"v":2}\n' } });
  const decision = await loadApproval(PROJECT, MODULE, 'run');
  assert.equal(decision.kind, 'record');
  if (decision.kind !== 'record') return;
  assert.equal(decision.record.message.file, second.messageFile);
  assert.deepEqual(decision.record.pool.map(line => line.file), [first.messageFile]);
});

void test('defs built from other bytes than the approval do not consume the implement', async () => {
  const host = installStudio(PROJECT);
  const plan = seedAcceptedPlan(host, PROJECT, MODULE);
  const decision = await loadApproval(PROJECT, MODULE, 'run');
  if (decision.kind !== 'record') throw new Error(decision.kind);
  await writeApproval(decision.record);
  const backendPath = `l4/${MODULE}/pool/l2/web/backend.json`;
  const input = { project: PROJECT, level: 1, folder: `${MODULE}/pipeline/agentDefsL1`, shortName: 'input', extension: '.json' };
  seed(host, input, `${JSON.stringify({ sources: [{ path: backendPath, sha256: 'sha256:earlier-plan' }] })}\n`);
  seedCompleteDefs(host);

  assert.equal(await consumeApproval(PROJECT, MODULE, new Date()), '');
  assert.equal(plan.message.status, 'changed');
  assert.deepEqual((await readApprovalRecord(PROJECT, MODULE))?.pool, []);
  const m1 = await checkM1Approval(ioOf(host), PROJECT, MODULE);
  assert.equal(m1.ok, false);
  if (!m1.ok) assert.match(m1.refusal, /was not consumed/);

  const recorded = decision.record.inputs.find(item => item.path === backendPath)!;
  seed(host, input, `${JSON.stringify({ sources: [{ path: backendPath, sha256: recorded.sha256 }] })}\n`);
  assert.equal(await consumeApproval(PROJECT, MODULE, new Date()), plan.messageFile);
  assert.equal(plan.message.status, 'deleted');
  assert.equal((await checkM1Approval(ioOf(host), PROJECT, MODULE)).ok, true);
});
