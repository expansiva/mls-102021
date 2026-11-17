/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12GatesGateway.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { gatewayBypassProblems, repositoryProblems, usecaseGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';

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
