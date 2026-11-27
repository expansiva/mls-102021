/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12GatesGateway.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { consumerCallProblems, gatewayBypassProblems, gatewayInputCastProblems, gatewayOutputFieldProblems, repositoryProblems, undeclaredInputProblems, usecaseGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';

const HEADER = '/// <mls fileReference="_102099_/l1/fila/layer_2_application/usecases/readItem.ts" enhancement="_blank"/>';
const GATE = { header: HEADER, functionName: 'readItem', project: 102099, moduleName: 'fila', ruleIds: [] as string[], ports: ['ItemRepository', 'CmGateway'], gateways: ['CmGateway'] };

function file(body: string): string {
  return `${HEADER}\n${body}\n`;
}

test('a gateway imported from outbound.js is a known port', () => {
  const code = file([
    "import type { CmGateway } from '/_102099_/l1/fila/layer_1_external/adapters/integration/outbound.js';",
    'export async function readItem(input: { id: string }, ctx: RequestContext) {',
    "  const gateway = resolveRepository<CmGateway>(ctx, 'CmGateway');",
    '  return gateway.readAgent(input, ctx);',
    '}',
  ].join('\n'));
  assert.deepEqual(usecaseGate(code, GATE), []);
});

test('callConnection, fetch and XMLHttpRequest are GATEWAY_BYPASS', () => {
  const call = file("import { callConnection } from '/_102034_/l1/server/layer_1_external/connections/callConnection.js';\nexport async function readItem(input: { id: string }, ctx: RequestContext) { return callConnection('cm', 'readAgent', input, {}); }");
  const fetched = file("export async function readItem(input: { id: string }, ctx: RequestContext) { return fetch('/x'); }");
  const xhr = file("import { XMLHttpRequest } from '/_102099_/l1/fila/layer_1_external/xhr.js';\nexport async function readItem(input: { id: string }, ctx: RequestContext) { return new XMLHttpRequest(); }");
  for (const code of [call, fetched, xhr]) {
    assert.ok(gatewayBypassProblems(code).some(problem => problem.startsWith('GATEWAY_BYPASS')), code);
  }
});

test('a gateway outside the module list is refused', () => {
  const code = file([
    "import type { OtherGateway } from '/_102099_/l1/fila/layer_1_external/adapters/integration/outbound.js';",
    'export async function readItem(input: { id: string }, ctx: RequestContext) {',
    "  return resolveRepository<OtherGateway>(ctx, 'OtherGateway');",
    '}',
  ].join('\n'));
  const problems = repositoryProblems(code, ['CmGateway'], ['CmGateway']);
  assert.ok(problems.some(problem => problem.includes('OtherGateway')), problems.join('\n'));
});

test('without gateways the repository check is unchanged', () => {
  const code = "import type { ItemRepository } from '/_102099_/l1/fila/layer_2_application/ports/itemRepository.js';\nconst repo = resolveRepository<ItemRepository>(ctx, 'ItemRepository');";
  assert.deepEqual(repositoryProblems(code, ['ItemRepository']), repositoryProblems(code, ['ItemRepository'], []));
  assert.deepEqual(gatewayBypassProblems(code), []);
});

test('a write on an external entity does not need a ruleId in the code: the external system meets the rule', () => {
  const code = file([
    'export async function readItem(input: { id: string }, ctx: RequestContext) {',
    '  return { id: input.id };',
    '}',
  ].join('\n'));
  const gate = { ...GATE, ruleIds: ['r1'] };
  const local = usecaseGate(code, gate);
  assert.ok(local.some(problem => problem.includes('Rule r1 is not enforced')), local.join('\n'));
  assert.ok(usecaseGate(code, { ...gate, externalEntity: false }).some(problem => problem.includes('Rule r1 is not enforced')));
  const external = usecaseGate(code, { ...gate, externalEntity: true });
  assert.equal(external.some(problem => problem.includes('is not enforced')), false, external.join('\n'));
});

test('a comment that ends with `input.` before a code line is not a read of an undeclared member', () => {
  const head = 'export interface FooInput { a: string }';
  const commented = `${head}\n// never in the catalog input.\nconst x = 1;\n/* also in a block input.\n*/\nconst y = input.a;`;
  assert.deepEqual(undeclaredInputProblems(commented), []);
  const real = `${head}\nconst x = input.zzz;`;
  const problems = undeclaredInputProblems(real);
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.ok(problems[0].includes('`input.zzz`'), problems[0]);
});

// d1_347 s1: the platform client `cm(ctx)` is read by the gates that read `gateway.<op>(`.
const CM_USECASE = file([
  "import { cm } from '/_102034_/l1/server/layer_1_external/connections/cm/index.js';",
  'export async function readItem(input: { id: string }, ctx: RequestContext) {',
  '  const answer = await cm(ctx).readAgent({ agentId: input.id });',
  '  if (!answer.ok) throw new Error(answer.message);',
  '  return answer.output.name;',
  '}',
].join('\n'));

void test('d1_347: the call of `cm(ctx).<op>(` is the call the def asks for, held in a variable or not', () => {
  const calls = [{ connectionId: 'cm', operationId: 'readAgent' }];
  assert.deepEqual(consumerCallProblems(CM_USECASE, calls), []);
  const held = CM_USECASE.replace('await cm(ctx).readAgent(', 'await client.readAgent(').replace('  const answer', '  const client = cm(ctx);\n  const answer');
  assert.deepEqual(consumerCallProblems(held, calls), []);
  assert.equal(consumerCallProblems(file('export async function readItem() { return 1; }'), calls).length, 1);
});

void test('d1_347: the answer of `cm(ctx).<op>` is a ConnectionResult: the output is under `.output`, and a field of the output that the type does not have is named', () => {
  const outputs = [{ operationId: 'readAgent', fields: ['agentId', 'name'] }];
  assert.deepEqual(gatewayOutputFieldProblems(CM_USECASE, outputs as never), []);
  const wrong = CM_USECASE.replace('answer.output.name', 'answer.output.title');
  assert.match(gatewayOutputFieldProblems(wrong, outputs as never).join(' '), /GATEWAY_OUTPUT_FIELD: `answer\.output` is the answer of `cm\(ctx\)\.readAgent`.*reads `title`/u);
  const flat = CM_USECASE.replace('answer.output.name', 'answer.name');
  assert.match(gatewayOutputFieldProblems(flat, outputs as never).join(' '), /GATEWAY_RESULT_FIELD: `answer` is the `ConnectionResult`.*reads `answer\.name`/u);
});

void test('d1_347: a cast of the argument of `cm(ctx).<op>(` is refused like the one of a gateway', () => {
  const cast = CM_USECASE.replace('{ agentId: input.id }', '{ agentId: input.id } as ReadInput');
  assert.ok(gatewayInputCastProblems(cast, ['readAgent']).length > 0);
  assert.deepEqual(gatewayInputCastProblems(CM_USECASE, ['readAgent']), []);
});
