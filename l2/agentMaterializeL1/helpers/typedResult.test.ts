/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/typedResult.test.ts" enhancement="_blank"/>

// d1_278: the result of a call keeps the type the call returns. The two files are the ones of 102047@dc67062d, byte by byte.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { typedResultDiscardedProblems, usecaseGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { functionTextProblems, workflowGate } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const here = new URL('.', import.meta.url).pathname;
const real = (name: string) => readFileSync(`${here}fixtures/typedResult/${name}`, 'utf8');
const refused = (code: string) => typedResultDiscardedProblems(code).some(item => item.startsWith('TYPED_RESULT_DISCARDED'));

void test('d1_278: the real files of 102047@dc67062d are refused', () => {
  assert.equal(refused(real('toolCatalogRefresh_dc67062d.ts.txt')), true);
  assert.equal(refused(real('updatePersonalConduct_dc67062d.ts.txt')), true);
});

void test('d1_278: the typed result, the destructured runAiPrompt result and a typed catch are not', () => {
  assert.equal(refused('const { result } = await gateway.runAiPrompt({ prompt, outputFormat }, ctx);'), false);
  assert.equal(refused('const agent = await getAgent({ agentId }, ctx);'), false);
  assert.equal(refused('try { x(); } catch (error: unknown) { throw error; }'), false);
  assert.equal(refused('function isText(value: unknown): value is string { return typeof value === "string"; }'), false);
  assert.equal(refused('const mod: unknown = await import(moduleUrl);'), false);
  assert.equal(refused('const commandId: unknown = event.commandId;'), false);
  assert.equal(refused('// const x: unknown = await gateway.readAgent(a, ctx);\nconst y = 1;'), false);
});

void test('d1_278: the other forms of the same loss are refused', () => {
  assert.equal(refused('const answer: unknown = await gateway.runAiPrompt({ prompt }, ctx);'), true);
  assert.equal(refused('const listing: unknown = await listAgent({ includeDrafts: false }, ctx);'), true);
  assert.equal(refused('let reading: unknown;\nreading = await gateway.readAgent({ agentId }, ctx);'), true);
  assert.equal(refused('const reading = (await gateway.readAgent({ agentId }, ctx)) as unknown;'), true);
  assert.equal(refused('let firstError: unknown;\ntry { x(); } catch (error) { firstError = error; }'), false);
});

// The three collectors that read generated code: the usecase file, the workflow file and one function of it.
void test('d1_278: the usecase gate, the workflow gate and the function gate refuse the real files', () => {
  const has = (list: string[]) => list.some(item => item.startsWith('TYPED_RESULT_DISCARDED'));
  const usecase = real('updatePersonalConduct_dc67062d.ts.txt');
  const workflow = real('toolCatalogRefresh_dc67062d.ts.txt');
  assert.equal(has(usecaseGate(usecase, { header: usecase.split('\n')[0], functionName: 'updatePersonalConduct', project: 102047, moduleName: 'agents', ruleIds: [] })), true);
  const facts = { processId: 'toolCatalogRefresh', trigger: { kind: '', actorRef: '', event: '', schedule: '' }, occurrence: '', functions: [], operations: [] };
  assert.equal(has(workflowGate(workflow, { header: workflow.split('\n')[0], facts, project: 102047, moduleName: 'agents', ports: [] })), true);
  assert.equal(has(functionTextProblems(workflow, 102047, 'agents', new Map())), true);
  const clean = 'const { result } = await gateway.runAiPrompt({ prompt }, ctx);\nconst agent = await getAgent({ agentId }, ctx);';
  assert.equal(has(functionTextProblems(clean, 102047, 'agents', new Map())), false);
});
