/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/judge/agentCbJudge.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { createPlannerToolSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { judgeResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import {
  JUDGE_BATCH_MAX_BYTES, JUDGE_BATCH_MAX_PAIRS, MAX_PROMPT_BYTES, planJudgeBatch, promptSizeError,
} from '/_102021_/l2/agentChangeBackend/helpers/cbPromptBudget.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitJudgeFindings';
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentCbJudge declares the LLM judge step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbJudge.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbJudge/);
  assert.match(src, /createPromptReadyIntent/);
  assert.match(src, /afterPromptStep/);
  assert.match(flow, /"agentName": "agentCbJudge"/);
});

void test('agentCbJudge tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(tool().function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCbJudge live @ ${modelType}: schema accepted + result has findings`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), { modelType, system: system(modelType), human: human({ findings: [] }), tool: tool() });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && Array.isArray(r.args.findings), `${modelType}: result.findings missing`);
  });
}

function tool(): any {
  return createPlannerToolSchema(TOOL_NAME, 'Submit the judge findings.', judgeResultSchema as Record<string, unknown>);
}

function system(modelType: string): string {
  return ['<!-- modelType: code -->', '<!-- x-tool-strict: true -->', `Return only one valid ${TOOL_NAME} tool call for model ${modelType}.`].join('\n');
}

function human(result: unknown): string {
  return `Call ${TOOL_NAME} with exactly this arguments JSON:\n${JSON.stringify({ status: 'ok', result, questions: [], trace: ['schema-test'] }, null, 2)}`;
}

function config() {
  return parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));
}

function assertLiveResponse(r: { modelType: string; status: number; text: string; args: unknown; schemaReject: boolean }) {
  const sample = r.text.replace(/\s+/g, ' ').slice(0, 200);
  assert.ok(!r.schemaReject, `${r.modelType}: schema rejected (${r.status}): ${sample}`);
  assert.equal(r.status, 200, `${r.modelType}: expected 200, got ${r.status}: ${sample}`);
  assert.ok(r.args, `${r.modelType}: no tool_call result`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ── batching (413 Payload Too Large) ────────────────────────────────────────
// 119 pairs of (L4 contract + generated usecase defs) pretty-printed is megabytes: the intents POST
// answered 413, the client swallowed it, and the step hung forever in waiting_human_input.

void test('the batch packer respects the byte budget, the pair cap and the queue order', () => {
  const queue = Array.from({ length: 119 }, (_value, index) => ({
    ownerId: `op${index}`,
    // Sizes vary a lot between usecases; a few are huge on their own.
    bytes: index % 17 === 0 ? 90_000 : 4_000 + (index % 5) * 3_000,
  }));

  const batches: string[][] = [];
  let pending = queue.map(entry => entry.ownerId);
  while (pending.length) {
    const slice = queue.filter(entry => pending.includes(entry.ownerId));
    const plan = planJudgeBatch(slice);
    assert.ok(plan.batch.length >= 1, 'a batch always drains at least one owner');
    assert.ok(plan.batch.length <= JUDGE_BATCH_MAX_PAIRS);
    const bytes = plan.batch.reduce((sum, id) => sum + (queue.find(entry => entry.ownerId === id)?.bytes || 0), 0);
    // Over budget is only allowed when a SINGLE pair is already over it.
    assert.ok(bytes <= JUDGE_BATCH_MAX_BYTES || plan.batch.length === 1, `batch of ${bytes} bytes`);
    batches.push(plan.batch);
    pending = plan.pending;
  }
  // Order preserved and nothing lost or judged twice.
  const flat = batches.flat();
  assert.deepEqual(flat, queue.map(entry => entry.ownerId));
  assert.equal(new Set(flat).size, queue.length);
  assert.ok(batches.length >= 8 && batches.length <= 20, `expected a handful of batches, got ${batches.length}`);
});

void test('a pair bigger than the whole budget still drains, alone', () => {
  const plan = planJudgeBatch([{ ownerId: 'huge', bytes: JUDGE_BATCH_MAX_BYTES * 3 }, { ownerId: 'next', bytes: 10 }]);
  assert.deepEqual(plan.batch, ['huge']);
  assert.deepEqual(plan.pending, ['next']);
});

void test('the judge chains its batches and only routes when the queue is empty', () => {
  const src = readFileSync(path.join(HERE, 'agentCbJudge.ts'), 'utf8');
  // Both hooks plan the same slice from the same step args — the after-hook must judge exactly the
  // owners the model saw, never the whole scope.
  assert.equal((src.match(/planJudgeSlice\(step, operations/g) || []).length, 2);
  assert.match(src, /if \(slice\.pending\.length\) \{[\s\S]{0,900}createAddStepIntent\(context, parentStep, nextStep\)/);
  // Findings of earlier batches survive in the repair state and join the final decision.
  assert.match(src, /judgePendingOwners/);
  assert.match(src, /const routedOwners = new Set<string>\(\[[\s\S]{0,200}judgePendingOwners[\s\S]{0,120}errorsByOwner\.keys\(\)/);
  // The first batch of a run never inherits an accumulator a soft-failed previous run left behind.
  assert.match(src, /slice\.batchIndex > 1 \? state\.judgePendingOwners \|\| \[\] : \[\]/);
  assert.match(src, /if \(routedByOwner\.size > 0 && judgeRun < JUDGE_MAX_RUNS\)/);
  // The deterministic findings are computed over the batch, not over the whole scope.
  assert.match(src, /missingDefsFindings\(await readUsecaseDefsByOwner\(scan, batchOwners\), scan, batchOwners\)/);
});

void test('a prompt over the transport limit fails the step instead of hanging it', () => {
  assert.equal(promptSizeError('cb-judge', 'x'.repeat(1000)), null);
  const message = promptSizeError('cb-judge', 'x'.repeat(MAX_PROMPT_BYTES + 1));
  assert.match(String(message), /cb-judge: prompt of \d+KB exceeds the \d+KB transport limit/);
  assert.match(String(message), /must batch or fan out/);
  // System and human count together — the transport sees one body.
  assert.ok(promptSizeError('cb-judge', 'x'.repeat(MAX_PROMPT_BYTES - 10), 'y'.repeat(100)));
  // And the shared intent factory is the one place that enforces it.
  const shared = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cbShared.ts'), 'utf8');
  assert.match(shared, /const oversize = promptSizeError\([\s\S]{0,120}\n\s*if \(oversize\) throw new Error\(oversize\);/);
});
