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
