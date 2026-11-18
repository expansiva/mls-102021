/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/stepCalls.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { stepCallProblems, stepCallsOf } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/stepCalls.js';

const INTEGRATION = `export const mod = ${JSON.stringify({
  inbound: [],
  connections: [
    { connectionId: 'cm', operationId: 'listCmTools', direction: 'call', usedBy: ['refresh.rebuild', 'other.x'] },
    { connectionId: 'cm', operationId: 'runAiPrompt', direction: 'call', usedBy: ['refresh.choose'] },
    { connectionId: 'cm', operationId: 'record', direction: 'serve', usedBy: ['refresh.rebuild'] },
    { connectionId: 'cm', operationId: 'readAgent', direction: 'call', usedBy: ['journey.step'] },
  ],
})} as const;\n`;

void test('d1_201: the calls of the steps of a process are read from the L4 usedBy, calls only and that process only', () => {
  assert.deepEqual(stepCallsOf(INTEGRATION, 'refresh'), [
    { stepId: 'rebuild', connectionId: 'cm', operationId: 'listCmTools' },
    { stepId: 'choose', connectionId: 'cm', operationId: 'runAiPrompt' },
  ]);
  // The real L4 file ends `} as const satisfies Ns5Readonly<…>;` and exports a type after it.
  const typed = INTEGRATION.replace(' as const;', ' as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;\n\nexport type T = typeof mod;\nexport default mod;');
  assert.equal(stepCallsOf(typed, 'refresh').length, 2);
  assert.deepEqual(stepCallsOf(INTEGRATION, 'none'), []);
  assert.deepEqual(stepCallsOf(null, 'refresh'), []);
  assert.deepEqual(stepCallsOf('not an l4 file', 'refresh'), []);
});

void test('d1_201: the gate refuses a step whose call is never made; an import or a comment does not count', () => {
  const calls = stepCallsOf(INTEGRATION, 'refresh');
  const good = "import type { CmGateway } from 'x';\nasync function a(ctx) { const g = resolveRepository<CmGateway>(ctx, 'CmGateway'); await g.listCmTools({}, ctx); const r = await gateway.runAiPrompt(input, ctx); return r; }\n";
  assert.deepEqual(stepCallProblems(good, calls), []);
  const onlyImport = "import type { CmGateway } from 'x';\nasync function a(ctx) { const g = resolveRepository<CmGateway>(ctx, 'CmGateway'); await g.listCmTools({}, ctx); }\n";
  const problems = stepCallProblems(onlyImport, calls);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^WORKFLOW_STEP_WITHOUT_CALL: step choose runs the call cm\.runAiPrompt/u);
  const commented = good.replace('await gateway.runAiPrompt(input, ctx)', '/* gateway.runAiPrompt(input, ctx) */ null');
  assert.equal(stepCallProblems(commented, calls).length, 1);
  assert.deepEqual(stepCallProblems('anything', []), []);
});
