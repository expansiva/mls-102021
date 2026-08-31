/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/materialize/agentCbMaterialize.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { GEN_TOOL, buildSystemPrompt } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentCbMaterialize declares the LLM materialization step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbMaterialize/);
  assert.match(src, /GEN_TOOL/);
  assert.match(src, /afterPromptStep/);
  assert.match(flow, /"agentName": "agentCbMaterialize"/);
});

void test('materialize flushes borrowed Monaco models between workers and layers', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /await flushBorrowedModels\(\);/);
  assert.ok((src.match(/flushBorrowedModels/g) || []).length >= 2, 'worker + dispatcher');
});

void test('the materialize dispatcher does not LLM-generate persistenceSeeds', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /isDeterministicMaterializeType\(e\.item\.type\)/);
  assert.match(src, /isDeterministicMaterializeType\(parsed\.item\.type\)/);
  assert.match(src, /compiled by agentCbSeeds/);
});

void test('the materialize dispatcher paints an ephemeral title during the stale-file scan', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /startLocalStepTick\(context, step,/);
  assert.match(src, /step\.stepTitle \|\| 'Materialize'/);
  assert.match(src, /scanning \(\$\{sec\}s\)/);
  assert.doesNotMatch(src, /step\.stepTitle\s*=/);
});

void test('agentCbMaterialize tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(GEN_TOOL.function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCbMaterialize live @ ${modelType}: schema accepted + returns code`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), {
      modelType,
      system: buildSystemPrompt([], '/_102021_/l1/mock/layer_3_domain/entities/mock.ts', modelType),
      human: [
        '## Definition',
        '```json',
        JSON.stringify({ entityId: 'Mock', fields: [] }, null, 2),
        '```',
        '',
        'Generate a minimal TypeScript file with the required fileReference header and export class Mock.',
      ].join('\n'),
      tool: GEN_TOOL,
    });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && typeof r.args.code === 'string' && r.args.code.includes('Mock'), `${modelType}: code missing`);
  });
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
