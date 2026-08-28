/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-usecase/agentCbUsecase.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { createPlannerToolSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { usecaseResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitUsecase';
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentCbUsecase declares the LLM fan-out step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbUsecase/);
  assert.match(src, /createPromptReadyIntent/);
  assert.match(src, /afterPromptStep/);
  assert.match(flow, /"agentName": "agentCbUsecase"/);
});

void test('gen-usecase owner item carries the declared lifecycle when the module has one', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  assert.match(src, /lifecycleForEntity\(lifecycles, o\.entity\)/);
  assert.match(src, /\.\.\.\(lifecycle \? \{ lifecycle \} : \{\}\)/);
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /When the item includes `lifecycle`/);
  assert.match(prompt, /Do NOT add a guard that rejects/);
});

void test('usecase defs pin and validate io shape symmetry after outputShape is applied', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  assert.match(src, /collectIoShapeSymmetryIssues/);
  assert.match(src, /pinUsecaseL4Mdm\(result, owner\?\.mdm\)/);
  assert.match(src, /alignOutputShapeToOntology/);
  assert.match(src, /systemDecisions/);
});

void test('agentCbUsecase tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(tool().function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCbUsecase live @ ${modelType}: schema accepted + result has functions`, { skip: !liveTestsEnabled() }, async () => {
    const result = {
      usecaseId: 'createOrder',
      ports: ['IOrderRepository'],
      functions: [{
        functionName: 'createOrder',
        inputTypeName: 'CreateOrderInput',
        outputTypeName: 'CreateOrderOutput',
        input: [],
        output: [],
      }],
    };
    const r = await callToolProvider(config(), { modelType, system: system(modelType), human: human(result), tool: tool() });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && Array.isArray(r.args.functions), `${modelType}: result.functions missing`);
  });
}

function tool(): any {
  return createPlannerToolSchema(TOOL_NAME, 'Submit the usecase.', usecaseResultSchema as Record<string, unknown>);
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

// ── nenhum usecase stub sobrevive à geração ───────────────────────────────────
// Run 8: 4 usecases saíram com `functions: []` (irmãos do MESMO tipo saíram completos), o juiz não
// olhava isso e os controllers que os referenciam derrubaram o gate final com "export not found" —
// achado defs-level, que nenhuma rematerialização conserta.
void test('a usecase without a function for its own operationId is rejected', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  // O gate é no validador do plano, antes de qualquer persistência, e roteia pelo repair existente.
  assert.match(src, /const functionNames = \(Array\.isArray\(result\?\.functions\) \? result\.functions : \[\]\)/);
  assert.match(src, /if \(!functionNames\.includes\(ownerId\)\)/);
  assert.match(src, /functions\[\] is empty — a stub usecase is forbidden/);
  // A mensagem do caso "tem funções, mas nenhuma com o nome da operação" diz quais existem.
  assert.match(src, /no function named '\$\{ownerId\}' \(declared: \$\{functionNames\.join\(', '\)\}\)/);
});

// ── o juiz (e tudo depois dele) espera o FAN-OUT, não o dispatcher ────────────
// 28/ago (102047/todo): cb-judge dependia de cb-gen-usecase, que completa no instante em que despacha.
// O juiz leu 0/9 defs de usecase e o cb-gen-http, logo atrás, leu 4/9 — 5 bffCalls e o controller
// inteiro do taskHub sumiram em silêncio (11 testes em ROUTINE_NOT_FOUND no app publicado).
void test('the judge joins on the usecase fan-out, never on the dispatcher', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  const shared = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cbShared.ts'), 'utf8');
  // A barreira é passada explicitamente ao enqueue; sem o último argumento volta a ser o dispatcher.
  assert.match(src, /enqueueNextInPhase\(context, step, 'judge', 'cb-judge', 'agentCbJudge', [^\n]*, 'continue', FANOUT_PLAN_ID\)/);
  assert.match(src, /const FANOUT_PLAN_ID = 'cb-usecase-fanout';/);
  // E o helper precisa honrar o override em vez de sempre usar o planId do passo corrente.
  assert.match(shared, /dependsOnPlanId\?: string,/);
  assert.match(shared, /const dep = dependsOnPlanId \|\| planIdOf\(currentStep\);/);
});
