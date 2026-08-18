/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-domain/agentCbDomainEntity.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { createPlannerToolSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { domainEntityResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitDomainEntities';
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentCbDomainEntity declares the LLM step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbDomainEntity.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbDomainEntity/);
  assert.match(src, /createPromptReadyIntent/);
  assert.match(src, /afterPromptStep/);
  assert.match(flow, /"agentName": "agentCbDomainEntity"/);
});

void test('agentCbDomainEntity fans out one worker per domain and cb-gen-port joins', () => {
  const src = readFileSync(path.join(HERE, 'agentCbDomainEntity.ts'), 'utf8');
  const flow = JSON.parse(readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8'));
  // Source: the dispatcher fans out via createParallelStepIntent; the slot count is ONE decision for
  // the whole agent (CB_MAX_PARALLEL), so no call site repeats a number.
  assert.match(src, /createParallelStepIntent\([^)]*CB_MAX_PARALLEL\)/s, 'must fan out with the shared slot count');
  assert.match(src, /cb-domain-fanout/);
  // Flow contract: the fan-out step exists as parallel_dynamic and cb-gen-port joins ON it.
  const steps = flow.steps as Array<{ planId: string; executionMode?: string; dependsOn?: string[] }>;
  const fanout = steps.find((s) => s.planId === 'cb-domain-fanout');
  assert.ok(fanout && fanout.executionMode === 'parallel_dynamic', 'cb-domain-fanout must be parallel_dynamic');
  const port = steps.find((s) => s.planId === 'cb-gen-port');
  assert.ok(port?.dependsOn?.includes('cb-domain-fanout'), 'cb-gen-port must join on cb-domain-fanout');
});

void test('agentCbDomainEntity tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(tool().function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

void test('domain item schema requires only entityId (fields are attached deterministically, not by the model)', () => {
  // Regression for erro3: the model used to omit the root `fields` (nesting them under valueObjects) and
  // fail TOOL_ARGS_SCHEMA. `fields`/`valueObjects`/`statusEnum` are now derived from the ontology by the
  // agent, so the model returns only { entityId, invariants } — `fields` must NOT be required anymore.
  const itemSchema = domainEntityResultSchema as unknown as { required: readonly string[]; properties: { valueObjects: { items: { required: readonly string[] } } } };
  assert.deepEqual([...itemSchema.required], ['entityId'], 'item must require only entityId');
  assert.ok(!itemSchema.properties.valueObjects.items.required.includes('fields'), 'valueObject fields must be optional');
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCbDomainEntity live @ ${modelType}: schema accepted for invariants-only item`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), { modelType, system: system(modelType), human: human({ items: [{ entityId: 'Order', invariants: ['totalAmount must equal the sum of item subtotals'] }] }), tool: tool() });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && Array.isArray(r.args.items), `${modelType}: result.items missing`);
  });
}

function tool(): any {
  return createPlannerToolSchema(TOOL_NAME, 'Submit the pure domain entities (one per aggregate root).', batchSchema(domainEntityResultSchema as Record<string, unknown>));
}

function batchSchema(itemSchema: Record<string, unknown>): Record<string, unknown> {
  return { type: 'object', additionalProperties: false, required: ['items'], properties: { items: { type: 'array', items: itemSchema } } };
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
