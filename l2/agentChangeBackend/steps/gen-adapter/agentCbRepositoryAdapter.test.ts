/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-adapter/agentCbRepositoryAdapter.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { createPlannerToolSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { repositoryAdapterResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import {
  ADAPTER_MODULE_DATA_NOTE, rewriteAdapterDefsNotes, sanitizeAdapterNotes,
} from '/_102021_/l2/agentChangeBackend/helpers/cbAdapterNotes.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitRepositoryAdapters';
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentCbRepositoryAdapter declares the LLM step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbRepositoryAdapter.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbRepositoryAdapter/);
  assert.match(src, /createPromptReadyIntent/);
  assert.match(src, /afterPromptStep/);
  assert.match(src, /fieldId verbatim/);
  assert.match(src, /ilike/);
  assert.match(src, /this is REQUIRED and it is the only persistence API/);
  assert.match(src, /scoped to local module tables \(never MDM\)/);
  assert.doesNotMatch(src, /is allowed only for local module tables/);
  assert.match(src, /sanitizeAdapterNotes/);
  assert.match(src, /rewriteAdapterDefsNotes/);
  assert.match(src, /sanitizeReusedAdapterDefs/);
  assert.match(src, /portMethods/);
  assert.match(src, /portMethodsForEntity/);
  assert.match(src, /Implement EVERY name in portMethods/);
  assert.match(flow, /"agentName": "agentCbRepositoryAdapter"/);
  const skill = readFileSync(path.join(HERE, '..', '..', 'skills', 'repositoryAdapter.md'), 'utf8');
  assert.match(skill, /ilike/);
  assert.match(skill, /sortBy/);
  assert.match(skill, /resolveListPage/);
  assert.match(skill, /offset/);
});

void test('agentCbRepositoryAdapter tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(tool().function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCbRepositoryAdapter live @ ${modelType}: schema accepted + result has items`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), { modelType, system: system(modelType), human: human({ items: [{ entityId: 'Order', className: 'OrderRepositoryAdapter', portRef: 'orderRepository.d.ts', tableRef: 'orderTable.d.ts' }] }), tool: tool() });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && Array.isArray(r.args.items), `${modelType}: result.items missing`);
  });
}

function tool(): any {
  return createPlannerToolSchema(TOOL_NAME, 'Submit the repository adapters.', batchSchema(repositoryAdapterResultSchema as Record<string, unknown>));
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

const TRACE_NOTE = 'No ctx.mdm calls are required. Do not access ctx.data.moduleData or any raw MDM runtime primitive.';
const MDM_OK = 'resolve mdmRefs via ctx.mdm.entity.get; never call ctx.mdm.entity.get inside a loop';

void test('sanitizeAdapterNotes drops a moduleData prohibition, keeps an MDM never-note, appends the obligation once', () => {
  const once = sanitizeAdapterNotes([TRACE_NOTE, MDM_OK]);
  assert.equal(once.includes(TRACE_NOTE), false);
  assert.equal(once.includes(MDM_OK), true);
  assert.equal(once.filter((n) => n.includes('moduleData.getTable')).length, 1);
  assert.equal(once.includes(ADAPTER_MODULE_DATA_NOTE), true);
  const twice = sanitizeAdapterNotes(once);
  assert.deepEqual(twice, once);
});

void test('sanitizeAdapterNotes treats a Portuguese moduleData ban the same as the English trace note', () => {
  const notes = sanitizeAdapterNotes(['Não acesse ctx.data.moduleData nem primitivas MDM']);
  assert.equal(notes.some((n) => /não acesse/i.test(n)), false);
  assert.equal(notes[notes.length - 1], ADAPTER_MODULE_DATA_NOTE);
});

void test('rewriteAdapterDefsNotes rewrites only when notes change and is a no-op on a second pass', () => {
  const defs = [
    'export const taskRepositoryAdapter = {',
    '  "schemaVersion": "2026-06-26",',
    '  "artifactType": "repositoryAdapter",',
    '  "data": {',
    '    "entityId": "Task",',
    `    "notes": ${JSON.stringify([TRACE_NOTE, MDM_OK])}`,
    '  }',
    '} as const;',
    '',
    'export default taskRepositoryAdapter;',
  ].join('\n');
  const rewritten = rewriteAdapterDefsNotes(defs);
  assert.ok(rewritten);
  assert.equal(rewritten!.includes(TRACE_NOTE), false);
  assert.equal(rewritten!.includes(MDM_OK), true);
  assert.equal(rewritten!.includes(ADAPTER_MODULE_DATA_NOTE), true);
  assert.equal(rewriteAdapterDefsNotes(rewritten!), null);
});
